/* Фон из частиц: одна система THREE.Points на всю страницу.
   Восемь форм считаются один раз на CPU. В шейдер уходят только две соседние (position → aTo)
   и доля смешивания, поэтому переход по скроллу работает в обе стороны без пересчёта.
   Three.js грузится динамическим import(), так что страница работает и без сборки. */
window.ParticleScene = (() => {
  'use strict';

  const THREE_URL = 'https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.min.js';
  const TAU = Math.PI * 2;
  const FOV = 38, CAM_Z = 7;

  // Детерминированный ГПСЧ: формы одинаковые при каждой загрузке
  function mulberry(seed) {
    return () => {
      seed = (seed + 0x6D2B79F5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const gauss = (r) => (r() + r() + r() + r() - 2) / 2;

  function rotate(arr, ax, ay, az) {
    const cx = Math.cos(ax), sx = Math.sin(ax), cy = Math.cos(ay), sy = Math.sin(ay), cz = Math.cos(az), sz = Math.sin(az);
    for (let i = 0; i < arr.length; i += 3) {
      let x = arr[i], y = arr[i + 1], z = arr[i + 2], t;
      t = y * cx - z * sx; z = y * sx + z * cx; y = t;
      t = x * cy + z * sy; z = -x * sy + z * cy; x = t;
      t = x * cz - y * sz; y = x * sz + y * cz; x = t;
      arr[i] = x; arr[i + 1] = y; arr[i + 2] = z;
    }
    return arr;
  }

  // ---------- Формы (радиус ~1.6 условной единицы) ----------
  const SHAPES = [
    // 0 · сфера — hero
    (n, r) => {
      const a = new Float32Array(n * 3), g = Math.PI * (3 - Math.sqrt(5));
      for (let i = 0; i < n; i++) {
        const y = 1 - (i / (n - 1)) * 2, rad = Math.sqrt(1 - y * y), th = g * i;
        const R = 1.6 + gauss(r) * 0.05 + (r() < 0.05 ? r() * 0.7 : 0);
        a[i * 3] = Math.cos(th) * rad * R; a[i * 3 + 1] = y * R; a[i * 3 + 2] = Math.sin(th) * rad * R;
      }
      return a;
    },
    // 1 · торический узел (2,3) — about
    (n, r) => {
      const a = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) {
        const t = r() * TAU, rr = 1.05 + 0.42 * Math.cos(3 * t), s = 0.15;
        a[i * 3] = rr * Math.cos(2 * t) + gauss(r) * s;
        a[i * 3 + 1] = rr * Math.sin(2 * t) + gauss(r) * s;
        a[i * 3 + 2] = 0.42 * Math.sin(3 * t) + gauss(r) * s;
      }
      return rotate(a, 0.5, 0.2, 0);
    },
    // 2 · куб из сетки линий — services
    (n, r) => {
      const a = new Float32Array(n * 3), s = 1.2, L = 6;
      for (let i = 0; i < n; i++) {
        const f = (r() * 3) | 0, w = (r() < 0.5 ? -1 : 1) * s;
        const k = -s + ((r() * (L + 1)) | 0) * (2 * s / L), along = (r() * 2 - 1) * s;
        const onU = r() < 0.5;
        const u = (onU ? k : along) + gauss(r) * 0.012, v = (onU ? along : k) + gauss(r) * 0.012;
        let x, y, z;
        if (f === 0) { x = w; y = u; z = v; } else if (f === 1) { y = w; x = u; z = v; } else { z = w; x = u; y = v; }
        a[i * 3] = x; a[i * 3 + 1] = y; a[i * 3 + 2] = z;
      }
      return rotate(a, 0.6, 0.75, 0);
    },
    // 3 · волнистая плоскость — work
    (n, r) => {
      const a = new Float32Array(n * 3), cols = Math.round(Math.sqrt(n * 2.4)), rows = Math.ceil(n / cols);
      for (let i = 0; i < n; i++) {
        const x = ((i % cols) / (cols - 1) - 0.5) * 9.5 + gauss(r) * 0.01;
        const z = (((i / cols) | 0) / Math.max(rows - 1, 1) - 0.5) * 4.6;
        a[i * 3] = x;
        a[i * 3 + 1] = 0.34 * Math.sin(x * 1.1 + z * 0.9) + 0.2 * Math.cos(z * 2.2 - x * 0.7);
        a[i * 3 + 2] = z;
      }
      return rotate(a, 0.42, 0, 0);
    },
    // 4 · галактика — toolbox
    (n, r) => {
      const a = new Float32Array(n * 3), arms = 3, R = 2.5;
      for (let i = 0; i < n; i++) {
        const rad = Math.pow(r(), 1.5) * R, br = (i % arms) / arms * TAU, spin = rad * 1.6;
        const spread = (1.15 - rad / R) * 0.3 + 0.04;
        a[i * 3] = Math.cos(br + spin) * rad + gauss(r) * spread;
        a[i * 3 + 1] = gauss(r) * spread * 0.45;
        a[i * 3 + 2] = Math.sin(br + spin) * rad + gauss(r) * spread;
      }
      return rotate(a, 1.0, 0, 0.25);
    },
    // 5 · двойная спираль — process
    (n, r) => {
      const a = new Float32Array(n * 3), H = 4.6, R = 0.8, turns = 2.2, rungs = 26;
      for (let i = 0; i < n; i++) {
        let x, y, z;
        if (r() < 0.8) {
          const t = r(), ang = t * turns * TAU + (r() < 0.5 ? 0 : Math.PI);
          x = Math.cos(ang) * R + gauss(r) * 0.06; y = (t - 0.5) * H + gauss(r) * 0.06; z = Math.sin(ang) * R + gauss(r) * 0.06;
        } else {
          const t = (((r() * rungs) | 0) + 0.5) / rungs, ang = t * turns * TAU, f = r() * 2 - 1;
          x = Math.cos(ang) * R * f + gauss(r) * 0.02; y = (t - 0.5) * H + gauss(r) * 0.02; z = Math.sin(ang) * R * f + gauss(r) * 0.02;
        }
        a[i * 3] = x; a[i * 3 + 1] = y; a[i * 3 + 2] = z;
      }
      return rotate(a, 0, 0, 0.55);
    },
    // 6 · икосаэдр из рёбер — github
    (n, r) => {
      const t = (1 + Math.sqrt(5)) / 2;
      const V = [[-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0], [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t], [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1]];
      const S = 1.75 / Math.hypot(1, t), E = [];
      for (let i = 0; i < 12; i++) for (let j = i + 1; j < 12; j++) {
        if (Math.abs(Math.hypot(V[i][0] - V[j][0], V[i][1] - V[j][1], V[i][2] - V[j][2]) - 2) < 0.01) E.push([V[i], V[j]]);
      }
      const a = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) {
        let x, y, z;
        const pick = r();
        if (pick < 0.8) {
          const [A, B] = E[(r() * E.length) | 0], k = r();
          x = (A[0] + (B[0] - A[0]) * k) * S + gauss(r) * 0.016;
          y = (A[1] + (B[1] - A[1]) * k) * S + gauss(r) * 0.016;
          z = (A[2] + (B[2] - A[2]) * k) * S + gauss(r) * 0.016;
        } else if (pick < 0.9) {
          const v = V[(r() * 12) | 0];
          x = v[0] * S + gauss(r) * 0.08; y = v[1] * S + gauss(r) * 0.08; z = v[2] * S + gauss(r) * 0.08;
        } else {
          const u = r() * 2 - 1, th = r() * TAU, rad = 0.5 * Math.cbrt(r()), s = Math.sqrt(1 - u * u);
          x = Math.cos(th) * s * rad; y = u * rad; z = Math.sin(th) * s * rad;
        }
        a[i * 3] = x; a[i * 3 + 1] = y; a[i * 3 + 2] = z;
      }
      return rotate(a, 0.3, 0.4, 0);
    },
    // 7 · портал-кольцо с вихрем — contact
    (n, r) => {
      const a = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) {
        let ang, rad, y;
        if (r() < 0.7) { ang = r() * TAU; rad = 2.05 + gauss(r) * 0.12; y = gauss(r) * 0.08; }
        else { rad = 0.7 + r() * 1.3; ang = (i % 5) / 5 * TAU + (2.05 - rad) * 1.6 + gauss(r) * 0.22; y = gauss(r) * 0.03; }
        a[i * 3] = Math.cos(ang) * rad; a[i * 3 + 1] = y; a[i * 3 + 2] = Math.sin(ang) * rad;
      }
      return rotate(a, Math.PI / 2 - 0.35, 0, 0);
    }
  ];
  // Цвета форм: [низ, верх]
  const PALETTE = [
    [0x8b5cf6, 0x2fd9ff], [0x2fd9ff, 0xd4ff3a], [0xd4ff3a, 0xf2f0ea], [0x8b5cf6, 0x2fd9ff],
    [0xff4fd8, 0x8b5cf6], [0x2fd9ff, 0x8b5cf6], [0x2fd9ff, 0xd4ff3a], [0xd4ff3a, 0x8b5cf6]
  ];
  // Скорость вращения форм: плоскость не крутим
  const SPIN = [1, 0.8, 0.6, 0, 0.5, 0.9, 0.7, 0.35];

  // Положение форм на экране зависит от пропорций окна
  function layouts(w, h) {
    const aspect = w / h, mobile = w < 760;
    const halfH = Math.tan(FOV / 2 * Math.PI / 180) * CAM_Z, halfW = halfH * aspect;
    const side = (k) => (mobile ? 0 : halfW * k);
    const fit = mobile ? Math.min(1, halfW / 2.1) : Math.min(1.15, halfW / 3.6);
    return {
      halfW, halfH,
      list: [
        { off: [side(0.44), mobile ? halfH * 0.2 : 0, 0], scale: fit * (mobile ? 0.95 : 1), alpha: mobile ? 0.7 : 1 },
        { off: [side(-0.5), 0, 0], scale: fit * 0.95, alpha: mobile ? 0.45 : 0.85 },
        { off: [side(0.52), 0.1, 0], scale: fit * 0.9, alpha: mobile ? 0.45 : 0.8 },
        { off: [0, -halfH * 0.58, 0], scale: mobile ? 0.7 : 1, alpha: 0.5 },
        { off: [side(-0.4), 0.2, 0], scale: fit * 1.05, alpha: mobile ? 0.45 : 0.8 },
        { off: [0, 0, -0.6], scale: fit, alpha: mobile ? 0.35 : 0.55 },
        { off: [side(0.58), -0.35, 0], scale: fit * 0.85, alpha: mobile ? 0.35 : 0.5 },
        { off: [side(0.12), 0.2, 0], scale: fit * (mobile ? 0.95 : 1.1), alpha: mobile ? 0.6 : 0.75 }
      ]
    };
  }

  const NOISE = /* glsl */`
    vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
    vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
    float snoise(vec3 v) {
      const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
      const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
      vec3 i = floor(v + dot(v, C.yyy));
      vec3 x0 = v - i + dot(i, C.xxx);
      vec3 g = step(x0.yzx, x0.xyz);
      vec3 l = 1.0 - g;
      vec3 i1 = min(g.xyz, l.zxy);
      vec3 i2 = max(g.xyz, l.zxy);
      vec3 x1 = x0 - i1 + C.xxx;
      vec3 x2 = x0 - i2 + C.yyy;
      vec3 x3 = x0 - D.yyy;
      i = mod289(i);
      vec4 p = permute(permute(permute(i.z + vec4(0.0, i1.z, i2.z, 1.0)) + i.y + vec4(0.0, i1.y, i2.y, 1.0)) + i.x + vec4(0.0, i1.x, i2.x, 1.0));
      float n_ = 0.142857142857;
      vec3 ns = n_ * D.wyz - D.xzx;
      vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
      vec4 x_ = floor(j * ns.z);
      vec4 y_ = floor(j - 7.0 * x_);
      vec4 x = x_ * ns.x + ns.yyyy;
      vec4 y = y_ * ns.x + ns.yyyy;
      vec4 h = 1.0 - abs(x) - abs(y);
      vec4 b0 = vec4(x.xy, y.xy);
      vec4 b1 = vec4(x.zw, y.zw);
      vec4 s0 = floor(b0) * 2.0 + 1.0;
      vec4 s1 = floor(b1) * 2.0 + 1.0;
      vec4 sh = -step(h, vec4(0.0));
      vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
      vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
      vec3 p0 = vec3(a0.xy, h.x);
      vec3 p1 = vec3(a0.zw, h.y);
      vec3 p2 = vec3(a1.xy, h.z);
      vec3 p3 = vec3(a1.zw, h.w);
      vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
      p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
      vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
      m = m * m;
      return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
    }
  `;

  const VERT = /* glsl */`
    uniform float uTime, uMix, uIntro, uSize, uPR, uNoise, uMorph, uVel, uKick;
    uniform mat3 uRotA, uRotB;
    uniform vec3 uOffA, uOffB, uC1A, uC2A, uC1B, uC2B;
    uniform float uScaleA, uScaleB, uAlphaA, uAlphaB;
    uniform vec2 uMouse;
    uniform float uMouseR, uMouseF;
    attribute vec3 aTo;
    attribute vec3 aScatter;
    attribute float aRand;
    varying vec3 vColor;
    varying float vAlpha;
    ${NOISE}
    void main() {
      // каждая частица стартует с небольшой задержкой — форма «перетекает», а не прыгает
      float m = clamp((uMix - aRand * 0.4) / 0.6, 0.0, 1.0);
      m = m * m * (3.0 - 2.0 * m);
      vec3 a = uRotA * (position * uScaleA) + uOffA;
      vec3 b = uRotB * (aTo * uScaleB) + uOffB;
      vec3 p = mix(a, b, m);

      float burst = sin(m * 3.14159265);
      float t = uTime * 0.16;
      vec3 q = p * 0.55 + vec3(aRand * 2.0);
      vec3 n = vec3(snoise(q + vec3(t, 0.0, 0.0)), snoise(q + vec3(0.0, t + 31.4, 0.0)), snoise(q + vec3(0.0, 0.0, t + 57.2)));
      p += n * (uNoise + burst * uMorph + uVel * 0.22 + uKick);

      // интро: частицы слетаются из облака
      float ii = clamp((uIntro - aRand * 0.45) / 0.55, 0.0, 1.0);
      ii = 1.0 - pow(1.0 - ii, 3.0);
      p = mix(aScatter, p, ii);

      vec4 mv = modelViewMatrix * vec4(p, 1.0);
      // курсор расталкивает частицы в плоскости экрана
      vec2 dm = mv.xy - uMouse;
      float dist = length(dm);
      mv.xy += dm / max(dist, 0.001) * (1.0 - smoothstep(0.0, uMouseR, dist)) * uMouseF;
      gl_Position = projectionMatrix * mv;

      float sparkle = step(0.965, aRand);
      gl_PointSize = uSize * (0.5 + aRand * 0.8 + sparkle * 1.6) * uPR / -mv.z;

      float h = clamp(p.y * 0.25 + 0.5 + (aRand - 0.5) * 0.4, 0.0, 1.0);
      vColor = mix(mix(mix(uC1A, uC2A, h), mix(uC1B, uC2B, h), m), vec3(1.0), sparkle * 0.5);
      vAlpha = mix(uAlphaA, uAlphaB, m) * (0.4 + 0.6 * ii) * (0.6 + 0.4 * fract(aRand * 7.31))
             * (1.0 - smoothstep(4.0, 16.0, -mv.z));
    }
  `;

  const FRAG = /* glsl */`
    varying vec3 vColor;
    varying float vAlpha;
    void main() {
      float d = length(gl_PointCoord - 0.5);
      if (d > 0.5) discard;
      float a = pow(1.0 - smoothstep(0.0, 0.5, d), 1.35);
      gl_FragColor = vec4(vColor * 1.2, a * vAlpha);
    }
  `;

  async function create(canvas, opts = {}) {
    const THREE = await import(THREE_URL);
    const reduced = !!opts.reduced;
    const mobile = window.innerWidth < 760;
    const N = opts.count || (mobile ? 6500 : 15000);

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: true, powerPreference: 'high-performance' });
    renderer.setClearColor(0x000000, 0);
    // цвета задаём как есть, без перевода в линейное пространство
    renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 60);
    camera.position.set(0, 0, CAM_Z);

    const shapes = SHAPES.map((fn, i) => fn(N, mulberry(101 + i * 17)));
    const r = mulberry(7);
    const rand = new Float32Array(N), scatter = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      rand[i] = r();
      const u = r() * 2 - 1, th = r() * TAU, rad = 5 + r() * 8, s = Math.sqrt(1 - u * u);
      scatter[i * 3] = Math.cos(th) * s * rad; scatter[i * 3 + 1] = u * rad; scatter[i * 3 + 2] = Math.sin(th) * s * rad - 3;
    }
    const geo = new THREE.BufferGeometry();
    const posAttr = new THREE.BufferAttribute(new Float32Array(shapes[0]), 3);
    const toAttr = new THREE.BufferAttribute(new Float32Array(shapes[1]), 3);
    posAttr.setUsage(THREE.DynamicDrawUsage);
    toAttr.setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute('position', posAttr);
    geo.setAttribute('aTo', toAttr);
    geo.setAttribute('aRand', new THREE.BufferAttribute(rand, 1));
    geo.setAttribute('aScatter', new THREE.BufferAttribute(scatter, 3));

    const col = (hex) => new THREE.Color().setHex(hex, THREE.LinearSRGBColorSpace);
    const uniforms = {
      uTime: { value: 0 }, uMix: { value: 0 }, uIntro: { value: reduced ? 1 : 0 },
      uSize: { value: mobile ? 28 : 30 }, uPR: { value: 1 },
      uNoise: { value: reduced ? 0 : 0.07 }, uMorph: { value: reduced ? 0 : 0.55 }, uVel: { value: 0 }, uKick: { value: 0 },
      uRotA: { value: new THREE.Matrix3() }, uRotB: { value: new THREE.Matrix3() },
      uOffA: { value: new THREE.Vector3() }, uOffB: { value: new THREE.Vector3() },
      uScaleA: { value: 1 }, uScaleB: { value: 1 }, uAlphaA: { value: 1 }, uAlphaB: { value: 1 },
      uC1A: { value: col(PALETTE[0][0]) }, uC2A: { value: col(PALETTE[0][1]) },
      uC1B: { value: col(PALETTE[1][0]) }, uC2B: { value: col(PALETTE[1][1]) },
      uMouse: { value: new THREE.Vector2(99, 99) }, uMouseR: { value: 1.15 }, uMouseF: { value: 0 }
    };
    const material = new THREE.ShaderMaterial({
      uniforms, vertexShader: VERT, fragmentShader: FRAG,
      transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending
    });
    const points = new THREE.Points(geo, material);
    points.frustumCulled = false;
    scene.add(points);

    let lay = layouts(window.innerWidth, window.innerHeight);
    let seg = 0;
    const last = SHAPES.length - 1;
    const state = { target: 0, p: 0, mx: 0, my: 0, tmx: 0, tmy: 0, vel: 0, tvel: 0, kick: 0, force: 0, moved: 0, active: false };
    const euler = new THREE.Euler(), m4 = new THREE.Matrix4();

    function setSegment(i) {
      if (i === seg) return;
      seg = i;
      posAttr.array.set(shapes[i]); posAttr.needsUpdate = true;
      toAttr.array.set(shapes[i + 1]); toAttr.needsUpdate = true;
      uniforms.uC1A.value.setHex(PALETTE[i][0], THREE.LinearSRGBColorSpace);
      uniforms.uC2A.value.setHex(PALETTE[i][1], THREE.LinearSRGBColorSpace);
      uniforms.uC1B.value.setHex(PALETTE[i + 1][0], THREE.LinearSRGBColorSpace);
      uniforms.uC2B.value.setHex(PALETTE[i + 1][1], THREE.LinearSRGBColorSpace);
    }

    function resize() {
      const w = window.innerWidth, h = window.innerHeight;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 1.75));
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      uniforms.uPR.value = renderer.getPixelRatio();
      lay = layouts(w, h);
    }
    resize();

    function render(time, dt) {
      dt = Math.min(dt, 0.1);
      state.p += (state.target - state.p) * (1 - Math.exp(-dt * 3.2));
      const p = Math.min(Math.max(state.p, 0), last);
      const i = Math.min(Math.floor(p), last - 1);
      setSegment(i);
      uniforms.uMix.value = p - i;

      const A = lay.list[i], B = lay.list[i + 1];
      uniforms.uOffA.value.fromArray(A.off); uniforms.uOffB.value.fromArray(B.off);
      uniforms.uScaleA.value = A.scale; uniforms.uScaleB.value = B.scale;
      uniforms.uAlphaA.value = A.alpha; uniforms.uAlphaB.value = B.alpha;

      const e = 1 - Math.exp(-dt * 4);
      state.mx += (state.tmx - state.mx) * e;
      state.my += (state.tmy - state.my) * e;
      state.vel += (state.tvel - state.vel) * (1 - Math.exp(-dt * 6));
      state.tvel *= Math.exp(-dt * 3);
      state.kick *= Math.exp(-dt * 2.2);
      // сила отталкивания гаснет, если мышь давно не двигалась
      const wantForce = state.active && time - state.moved < 2 ? 0.42 : 0;
      state.force += (wantForce - state.force) * (1 - Math.exp(-dt * 5));

      const spinT = reduced ? 0 : time * 0.09;
      euler.set(state.my * 0.25, spinT * SPIN[i] + state.mx * 0.4, 0);
      uniforms.uRotA.value.setFromMatrix4(m4.makeRotationFromEuler(euler));
      euler.set(state.my * 0.25, spinT * SPIN[i + 1] + state.mx * 0.4, 0);
      uniforms.uRotB.value.setFromMatrix4(m4.makeRotationFromEuler(euler));

      uniforms.uTime.value = time;
      uniforms.uVel.value = reduced ? 0 : state.vel;
      uniforms.uKick.value = state.kick;
      uniforms.uMouse.value.set(state.mx * lay.halfW, state.my * lay.halfH);
      uniforms.uMouseF.value = state.force;
      renderer.render(scene, camera);
    }

    return {
      count: N,
      intro: uniforms.uIntro,
      resize, render,
      setProgress(v) { state.target = v; },
      jump(v) { state.target = state.p = v; },
      setPointer(nx, ny, time) { state.tmx = nx; state.tmy = ny; state.moved = time; state.active = true; },
      setVelocity(v) { state.tvel = Math.max(state.tvel, Math.min(Math.abs(v) / 40, 1)); },
      kick(v = 0.5) { if (!reduced) state.kick = Math.max(state.kick, v); }
    };
  }

  return { create, SHAPES: SHAPES.length };
})();
