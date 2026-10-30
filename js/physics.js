/* «Яма» с капсулами навыков на Matter.js.
   Тела живут в мире физики, DOM-капсулы только повторяют их положение.
   Перетаскивание своё, на pointer-событиях: MouseConstraint из Matter глушит колесо и скролл на тачскринах. */
window.ToolboxPhysics = (() => {
  'use strict';

  function create(pit, tools, opts = {}) {
    const items = tools.map((tool) => {
      const el = document.createElement('span');
      el.className = 'pill' + (tool.kind ? ' pill--' + tool.kind : '');
      el.textContent = tool.name;
      el.dataset.cursor = 'drag';
      pit.appendChild(el);
      return { el, body: null, w: 0, h: 0 };
    });

    // Без Matter или при reduced motion — статичное облако тегов
    if (!window.Matter || opts.reduced) {
      pit.classList.add('is-static');
      return { drop() {}, shake() {}, setActive() {}, resize() {} };
    }

    const { Engine, Bodies, Body, Composite, Constraint } = Matter;
    const engine = Engine.create({ gravity: { x: 0, y: 1, scale: 0.0011 }, enableSleeping: false });
    const world = engine.world;
    let W = 0, H = 0, walls = [], dropped = false, active = false, acc = 0, drag = null;
    const STEP = 1000 / 60;

    function measure() {
      W = pit.clientWidth; H = pit.clientHeight;
      items.forEach((it) => { it.w = it.el.offsetWidth; it.h = it.el.offsetHeight; });
    }

    function buildWalls() {
      if (walls.length) Composite.remove(world, walls);
      const t = 400, opt = { isStatic: true, friction: 0.3, restitution: 0.2 };
      walls = [
        Bodies.rectangle(W / 2, H + t / 2, W + t * 2, t, opt),          // пол
        Bodies.rectangle(-t / 2, H / 2 - H, t, H * 4, opt),             // стены выше ямы: брошенная капсула вернётся
        Bodies.rectangle(W + t / 2, H / 2 - H, t, H * 4, opt)
      ];
      Composite.add(world, walls);
    }

    function drop() {
      if (dropped) return;
      dropped = true;
      measure();
      buildWalls();
      // капсулы падают сверху «веером», по очереди
      items.forEach((it, i) => {
        const x = it.w / 2 + 10 + Math.random() * Math.max(1, W - it.w - 20);
        const y = -it.h - i * 55 - Math.random() * 40;
        it.body = Bodies.rectangle(x, y, it.w, it.h, {
          chamfer: { radius: it.h / 2 - 1 }, restitution: 0.45, friction: 0.06, frictionAir: 0.012, density: 0.0015
        });
        Body.setAngle(it.body, (Math.random() - 0.5) * 0.9);
        Body.setAngularVelocity(it.body, (Math.random() - 0.5) * 0.08);
        Composite.add(world, it.body);
        it.el.classList.add('is-in');
      });
      sync();
    }

    function sync() {
      for (const it of items) {
        if (!it.body) continue;
        const { x, y } = it.body.position;
        it.el.style.transform = `translate3d(${(x - it.w / 2).toFixed(1)}px, ${(y - it.h / 2).toFixed(1)}px, 0) rotate(${it.body.angle.toFixed(4)}rad)`;
      }
    }

    // Фиксированный шаг 1/60 с: Matter нестабилен при плавающем dt
    function tick(dtMs) {
      if (!active || !dropped) return;
      acc = Math.min(acc + dtMs, STEP * 4);
      while (acc >= STEP) { Engine.update(engine, STEP); acc -= STEP; }
      sync();
    }

    function shake() {
      if (!dropped) { drop(); return; }
      items.forEach((it) => {
        if (!it.body) return;
        Body.setVelocity(it.body, { x: (Math.random() - 0.5) * 16, y: -10 - Math.random() * 12 });
        Body.setAngularVelocity(it.body, (Math.random() - 0.5) * 0.35);
      });
    }

    // ---- Перетаскивание ----
    const local = (e) => {
      const r = pit.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    };
    pit.addEventListener('pointerdown', (e) => {
      const el = e.target.closest('.pill');
      const it = el && items.find((x) => x.el === el);
      if (!it || !it.body) return;
      const p = local(e);
      const c = Constraint.create({
        pointA: p, bodyB: it.body,
        pointB: { x: p.x - it.body.position.x, y: p.y - it.body.position.y },
        stiffness: 0.16, damping: 0.08, length: 0
      });
      Composite.add(world, c);
      drag = { it, c, id: e.pointerId };
      try { el.setPointerCapture(e.pointerId); } catch (err) {}
      el.classList.add('is-grab');
      e.preventDefault();
    });
    pit.addEventListener('pointermove', (e) => {
      if (drag && e.pointerId === drag.id) drag.c.pointA = local(e);
    });
    const release = (e) => {
      if (!drag || (e && e.pointerId !== drag.id)) return;
      Composite.remove(world, drag.c);
      drag.it.el.classList.remove('is-grab');
      drag = null;
    };
    pit.addEventListener('pointerup', release);
    pit.addEventListener('pointercancel', release);
    pit.addEventListener('lostpointercapture', release);

    function resize() {
      if (!dropped) return;
      const oldW = W;
      measure();
      buildWalls();
      // тела, оказавшиеся за новой стеной, возвращаем внутрь
      items.forEach((it) => {
        if (!it.body) return;
        const { x, y } = it.body.position;
        const nx = oldW ? Math.min(Math.max(x * W / oldW, it.w / 2), W - it.w / 2) : x;
        Body.setPosition(it.body, { x: nx, y: Math.min(y, H - it.h / 2) });
      });
      sync();
    }

    return {
      drop, shake, resize, tick,
      setActive(v) { active = v; if (v) acc = 0; }
    };
  }

  return { create };
})();
