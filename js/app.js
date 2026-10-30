/* devbyfarhad — портфолио.
   Порядок: тексты на нужном языке → прелоадер (шрифты, Three.js, обложки) → сборка анимаций → интро.
   Плагины: GSAP (ScrollTrigger, SplitText, ScrambleText, Flip, DrawSVG, MotionPath, CustomEase), Lenis, Matter.js, Three.js. */
(() => {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const C = window.PORTFOLIO, I = window.I18N;
  const html = document.documentElement;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const hasG = !!(window.gsap && window.ScrollTrigger && window.SplitText);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const pad = (n) => String(n).padStart(2, '0');
  const clamp = (v, a, b) => Math.min(Math.max(v, a), b);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
  const scrollY = () => (lenis ? lenis.scroll : window.scrollY);

  let lenis = null, scene = null, physics = null;
  let introDone = false, switching = false, menuOpen = false, caseOpen = false;
  let ghData = null, termTyped = false, sceneTriggers = [];
  let fxCtx = null, heroTween = null, heroChars = [];
  const splits = [];
  const vel = { raw: 0, v: 0, dir: 1 };

  if (hasG) {
    gsap.registerPlugin(...['ScrollTrigger', 'SplitText', 'ScrambleTextPlugin', 'Flip', 'DrawSVGPlugin', 'MotionPathPlugin', 'CustomEase']
      .map((k) => window[k]).filter(Boolean));
    if (window.CustomEase) {
      CustomEase.create('silk', '0.16,1,0.3,1');
      CustomEase.create('curtain', '0.77,0,0.18,1');
    }
    ScrollTrigger.config({ ignoreMobileResize: true });
  }
  const EASE = hasG && window.CustomEase ? { out: 'silk', io: 'curtain' } : { out: 'expo.out', io: 'expo.inOut' };

  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  window.scrollTo(0, 0);

  /* =================================================================
     Статичный контент из config.js
     ================================================================= */
  const ARROW_OUT = '<svg class="btn__arrow btn__arrow--out" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17 17 7M8 7h9v9"/></svg>';
  const ARROW = '<svg class="btn__arrow" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';

  function renderStatic() {
    const gh = 'https://github.com/' + C.github;
    $$('[data-gh-link]').forEach((a) => (a.href = gh));
    $$('[data-year]').forEach((el) => (el.textContent = new Date().getFullYear()));
    $('[data-roles]').textContent = I.t('hero.roles')[0];
    applyCity();
  }
  const applyCity = () => $$('[data-city]').forEach((el) => (el.textContent = I.pick(C.city)));

  function renderCards() {
    const track = $('[data-track]');
    C.projects.forEach((p, i) => {
      const card = document.createElement('article');
      card.className = 'card';
      card.dataset.id = p.id;
      card.dataset.cursor = 'view';
      card.tabIndex = 0;
      card.setAttribute('role', 'button');
      card.innerHTML = `
        <div class="card__media"><div class="card__par"><picture>
          ${p.coverMobile ? `<source media="(max-width: 960px)" srcset="${esc(p.coverMobile)}">` : ''}
          <img src="${esc(p.cover)}" alt="" decoding="async" ${i > 1 ? 'loading="lazy"' : ''}>
        </picture></div></div>
        <span class="card__open" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M7 17 17 7M8 7h9v9"/></svg></span>
        <div class="card__info">
          <span class="card__num mono">${pad(i + 1)} — ${p.year}</span>
          <div>
            <h3 class="card__title" data-p="${p.id}" data-f="title"></h3>
            <p class="card__kind" data-p="${p.id}" data-f="kind"></p>
          </div>
          <div class="card__side"><ul class="card__tags mono">${p.stack.slice(0, 4).map((s) => `<li>${esc(s)}</li>`).join('')}</ul></div>
        </div>`;
      track.appendChild(card);
    });
    const cta = document.createElement('div');
    cta.className = 'card card--cta';
    cta.innerHTML = `
      <i class="card__ring" aria-hidden="true"></i>
      <span class="card__num mono">${pad(C.projects.length + 1)} — ${new Date().getFullYear()}+</span>
      <div><h3 class="card__title" data-i18n="work.cta.title"></h3><p data-i18n="work.cta.text"></p></div>
      <a class="btn" href="#contact" data-magnetic><span class="btn__fill"></span><span class="roll"><span data-i18n="work.cta.btn" data-text=""></span></span>${ARROW}</a>`;
    track.appendChild(cta);
    $('[data-work-total]').textContent = pad(C.projects.length + 1);
    I.apply(cta);
    fillProjectTexts();
  }

  function fillProjectTexts() {
    $$('[data-p][data-f]').forEach((el) => {
      const p = C.projects.find((x) => x.id === el.dataset.p);
      if (p) el.textContent = I.pick(p[el.dataset.f]);
    });
    $$('.card[data-id]').forEach((card) => {
      const p = C.projects.find((x) => x.id === card.dataset.id);
      card.setAttribute('aria-label', `${I.pick(p.title)} — ${I.t('work.open')}`);
      card.querySelector('img').alt = I.pick(p.title);
    });
  }

  function renderMarquee() {
    $$('[data-marquee-inner]').forEach((inner, row) => {
      const words = row ? [...C.marquee].reverse() : C.marquee;
      const chunk = words.map((w) => `<span class="marquee__item">${esc(w)}<span class="marquee__star">✦</span></span>`).join('');
      inner.innerHTML = chunk + chunk; // две копии — бесшовная петля
    });
  }

  function contactList() {
    const list = [];
    if (C.email) list.push({ key: 'email', href: 'mailto:' + C.email, label: C.email });
    if (C.telegram) list.push({ key: 'telegram', href: 'https://t.me/' + C.telegram, label: '@' + C.telegram });
    list.push({ key: 'github', href: 'https://github.com/' + C.github, label: '@' + C.github });
    if (C.linkedin) list.push({ key: 'linkedin', href: C.linkedin, label: 'LinkedIn' });
    if (C.instagram) list.push({ key: 'instagram', href: 'https://instagram.com/' + C.instagram, label: '@' + C.instagram });
    return list;
  }

  function renderContacts() {
    const links = contactList();
    const ul = $('[data-contact-links]');
    ul.innerHTML = links.map((l) => `
      <li data-reveal><a href="${esc(l.href)}"${l.key === 'email' ? '' : ' target="_blank" rel="noopener"'} data-magnetic="0.2">
        <small data-i18n="contact.${l.key}"></small><span>${esc(l.label)}</span><span aria-hidden="true">↗</span>
      </a></li>`).join('');
    I.apply(ul);
    const main = $('[data-contact-main]');
    main.href = links[0].href;
    if (links[0].key !== 'email') { main.target = '_blank'; main.rel = 'noopener'; }
  }

  function renderFooter() {
    $('[data-footer-big]').innerHTML = [...C.handle].map((ch) => `<span class="fl" aria-hidden="true">${esc(ch)}</span>`).join('');
  }

  /* =================================================================
     Подгонка крупных заголовков под ширину
     ================================================================= */
  function fitHero() {
    const title = $('[data-hero-title]');
    const lines = $$('.hero__line', title);
    title.style.fontSize = '100px';
    const widest = Math.max(...lines.map((l) => l.offsetWidth + (parseFloat(getComputedStyle(l).marginLeft) || 0)));
    const byWidth = 100 * title.clientWidth / widest * 0.97;
    const byHeight = (window.innerHeight - (window.innerWidth < 960 ? 380 : 300)) / 2.75;
    title.style.fontSize = clamp(Math.min(byWidth, byHeight), 40, 230).toFixed(2) + 'px';
  }

  function fitFooter() {
    const big = $('[data-footer-big]');
    big.style.fontSize = '100px';
    const total = $$('.fl', big).reduce((s, el) => s + el.getBoundingClientRect().width, 0);
    const pads = parseFloat(getComputedStyle(big).paddingLeft) * 2;
    big.style.fontSize = clamp(100 * (big.clientWidth - pads) / total * 0.99, 40, 420).toFixed(2) + 'px';
  }

  /* =================================================================
     Плавный скролл
     ================================================================= */
  function initScroll() {
    if (!reduced && window.Lenis) {
      lenis = new Lenis({ lerp: 0.085, smoothWheel: true, wheelMultiplier: 0.95, touchMultiplier: 1.3 });
      lenis.on('scroll', (l) => {
        ScrollTrigger.update();
        vel.raw = l.velocity;
        if (l.direction) vel.dir = l.direction;
      });
      gsap.ticker.add((time) => lenis.raf(time * 1000));
      gsap.ticker.lagSmoothing(0);
      lenis.stop();
    } else {
      let last = window.scrollY;
      window.addEventListener('scroll', () => {
        const y = window.scrollY;
        vel.raw = y - last;
        if (y !== last) vel.dir = y > last ? 1 : -1;
        last = y;
      }, { passive: true });
    }
    // скорость плавно гаснет, когда скролл остановился
    gsap.ticker.add(() => { vel.v += (vel.raw - vel.v) * 0.2; vel.raw *= 0.85; });

    document.addEventListener('click', (e) => {
      const a = e.target.closest('a[href^="#"]');
      if (!a) return;
      const id = a.getAttribute('href');
      const target = id === '#' || id === '#top' ? 0 : $(id);
      if (target === null) return;
      e.preventDefault();
      if (menuOpen) toggleMenu(false);
      scrollToTarget(target);
    });
  }

  function scrollToTarget(target) {
    if (lenis) { lenis.scrollTo(target, { duration: 1.8, easing: (t) => 1 - Math.pow(1 - t, 4) }); return; }
    if (target === 0) window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
    else target.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
  }

  /* =================================================================
     Частицы
     ================================================================= */
  async function initScene() {
    if (!window.ParticleScene) return;
    try {
      scene = await ParticleScene.create($('#gl'), { reduced });
    } catch (e) {
      console.warn('[scene] WebGL недоступен:', e);
      scene = null;
      return;
    }
    gsap.ticker.add((time, dt) => {
      let p = 0;
      for (const t of sceneTriggers) p += t.progress;
      scene.setProgress(p);
      scene.setVelocity(vel.v);
      scene.render(time, dt / 1000);
    });
    window.addEventListener('pointermove', (e) => {
      scene.setPointer(e.clientX / window.innerWidth * 2 - 1, -(e.clientY / window.innerHeight * 2 - 1), gsap.ticker.time);
    }, { passive: true });
  }

  // Форма частиц = сумма прогрессов переходов между секциями (0…7)
  function bindSceneScroll() {
    if (!scene) return;
    sceneTriggers = $$('[data-shape]').slice(1).map((sec) => ScrollTrigger.create({ trigger: sec, start: 'top 85%', end: 'top 20%' }));
  }

  /* =================================================================
     Прелоадер: приветствия, счётчик, шторка с изогнутым краем
     ================================================================= */
  function preloader() {
    const root = $('[data-preloader]'), num = $('[data-count]'), bar = $('[data-pre-bar]'), greet = $('[data-greet]');
    const own = { en: 'Hello', ru: 'Привет', az: 'Salam' }[I.lang];
    const words = ['Hello', 'Hola', 'Bonjour', 'Ciao', 'Hallo', 'Merhaba', 'Привет', 'Salam'].filter((w) => w !== own).concat(own);
    greet.textContent = words[0];
    let p = 0, target = 6, finish = null, wi = 0, wt = 0;

    const tick = (time, dt) => {
      // счёт идёт по времени, а не по кадрам: в фоновой вкладке rAF редкий
      p += (target - p) * (1 - Math.exp(-Math.min(dt, 250) / 1000 * 3.4));
      num.textContent = Math.min(100, Math.round(p));
      bar.style.transform = `scaleX(${(p / 100).toFixed(4)})`;
      wt += dt;
      if (wi < words.length - 1 && wt > (wi === 0 ? 560 : 170)) { wt = 0; greet.textContent = words[++wi]; }
      if (finish && p > 99.4 && wi === words.length - 1) {
        gsap.ticker.remove(tick);
        num.textContent = '100';
        const done = finish;
        finish = null;
        if (reduced) {
          gsap.to(root, { opacity: 0, duration: 0.4, onComplete: () => root.classList.add('is-done') });
          done();
          return;
        }
        gsap.timeline({ onComplete: () => root.classList.add('is-done') })
          .to('.preloader__greet, .preloader__foot', { y: -50, opacity: 0, duration: 0.55, ease: 'power3.in', stagger: 0.06 })
          .to(root, { yPercent: -100, duration: 1.2, ease: EASE.io }, '-=0.1')
          .to('[data-curve]', { attr: { d: 'M0 0 L1000 0 Q500 0 0 0 Z' }, duration: 1.2, ease: EASE.io }, '<')
          .add(done, '-=0.8');
      }
    };
    gsap.ticker.add(tick);
    return {
      step(v) { target = Math.max(target, v); },
      done() { return new Promise((res) => { target = 100; finish = res; }); }
    };
  }

  const preload = (srcs) => Promise.all(srcs.map((src) => new Promise((res) => {
    const img = new Image();
    img.onload = img.onerror = () => res();
    img.src = src;
  })));

  /* =================================================================
     Тексты: SplitText (пересобираются при смене языка)
     ================================================================= */
  function initTextFx() {
    if (reduced) { html.classList.add('is-ready'); return; }
    fxCtx = gsap.context(() => {
      // Hero: буквы выезжают из-под маски строки
      $$('.hero__line').forEach((line) => splits.push(SplitText.create(line, { type: 'chars', charsClass: 'char' })));
      heroChars = $$('.hero__title .char');
      heroTween = gsap.from(heroChars, {
        yPercent: 118, rotate: 8, opacity: 0, duration: 1.3, ease: EASE.out, stagger: 0.026, paused: true,
        onComplete: measureProximity
      });
      html.classList.add('is-ready');

      // Заголовки секций: строки поднимаются из маски
      $$('[data-split]').forEach((el) => {
        splits.push(SplitText.create(el, {
          type: 'lines,words', linesClass: 'sl', mask: 'lines', autoSplit: true,
          onSplit(self) {
            return gsap.from(self.lines, {
              yPercent: 112, rotate: 2.5, duration: 1.3, ease: EASE.out, stagger: 0.1,
              scrollTrigger: { trigger: el, start: 'top 88%', once: true }
            });
          }
        }));
      });

      // About: слова «проявляются» вместе со скроллом
      const about = $('[data-words]');
      splits.push(SplitText.create(about, {
        type: 'words', wordsClass: 'w',
        onSplit(self) {
          return gsap.fromTo(self.words, { opacity: 0.13 }, {
            opacity: 1, ease: 'none', stagger: 0.08,
            scrollTrigger: { trigger: about, start: 'top 78%', end: 'bottom 45%', scrub: 0.6 }
          });
        }
      }));

      // Contact: буквы встают в 3D, при наведении подпрыгивают
      const ct = $('[data-chars]');
      splits.push(SplitText.create(ct, {
        type: 'words,chars', charsClass: 'char',
        onSplit(self) {
          self.chars.forEach((ch) => ch.addEventListener('pointerenter', () => {
            if (ch._busy) return;
            ch._busy = true;
            gsap.to(ch, { yPercent: -24, rotate: gsap.utils.random(-12, 12), duration: 0.22, ease: 'power2.out', yoyo: true, repeat: 1, onComplete: () => (ch._busy = false) });
          }));
          return gsap.from(self.chars, {
            yPercent: 100, rotationX: -90, opacity: 0, transformOrigin: '50% 100%', transformPerspective: 800,
            stagger: 0.018, duration: 1.1, ease: EASE.out,
            scrollTrigger: { trigger: ct, start: 'top 82%', once: true }
          });
        }
      }));
    });
  }

  function destroyTextFx() {
    if (fxCtx) { fxCtx.revert(); fxCtx = null; }
    splits.forEach((s) => s.revert());
    splits.length = 0;
    heroTween = null;
    heroChars = [];
  }

  /* Hero: буквы тяжелеют и сужаются рядом с курсором (вариативный шрифт) */
  let prox = [];
  function measureProximity() {
    if (!fine || reduced) return;
    const sy = scrollY();
    prox = heroChars.map((c) => {
      c.style.fontVariationSettings = '';
      const r = c.getBoundingClientRect();
      const serif = !!c.closest('em');
      return { c, x: r.left + r.width / 2, y: r.top + r.height / 2 + sy, v: 0, last: 0, serif };
    });
  }
  function initProximity() {
    if (!fine || reduced) return;
    let mx = -1e4, my = -1e4;
    window.addEventListener('pointermove', (e) => { mx = e.clientX; my = e.clientY; }, { passive: true });
    const R = 280;
    gsap.ticker.add(() => {
      if (!introDone || !prox.length) return;
      const sy = scrollY();
      if (sy > window.innerHeight) return;
      for (const o of prox) {
        const dx = mx - o.x, dy = my - (o.y - sy);
        const k = Math.max(0, 1 - Math.sqrt(dx * dx + dy * dy) / R);
        o.v += (k * k * (3 - 2 * k) - o.v) * 0.14;
        if (Math.abs(o.v - o.last) < 0.004) continue;
        o.last = o.v;
        if (o.v < 0.01) { o.c.style.fontVariationSettings = ''; continue; }
        o.c.style.fontVariationSettings = o.serif
          ? `"wght" ${Math.round(400 + 300 * o.v)}`
          : `"wght" ${Math.round(800 + 200 * o.v)}, "wdth" ${(112 - 24 * o.v).toFixed(1)}`;
      }
    });
  }

  /* Роли под логотипом меняются через ScrambleText */
  let rolesCall = null, roleIdx = 0;
  function startRoles() {
    const el = $('[data-roles]');
    if (rolesCall) rolesCall.kill();
    if (reduced) return;
    const loop = () => {
      const roles = I.t('hero.roles');
      roleIdx = (roleIdx + 1) % roles.length;
      gsap.to(el, { duration: 1.2, ease: 'none', overwrite: true, scrambleText: { text: roles[roleIdx], chars: '01<>/\\_—=+*#', speed: 0.5, revealDelay: 0.25 } });
      rolesCall = gsap.delayedCall(3.4, loop);
    };
    rolesCall = gsap.delayedCall(2.6, loop);
  }

  /* =================================================================
     Курсор, магнитные кнопки
     ================================================================= */
  function initCursor() {
    if (!fine || reduced) return;
    html.classList.add('has-cursor');
    const cur = $('.cursor'), ring = $('.cursor__ring'), dot = $('.cursor__dot'), label = $('[data-cursor-label]');
    const rx = gsap.quickTo(ring, 'x', { duration: 0.5, ease: 'power3' }), ry = gsap.quickTo(ring, 'y', { duration: 0.5, ease: 'power3' });
    const dx = gsap.quickTo(dot, 'x', { duration: 0.1, ease: 'power3' }), dy = gsap.quickTo(dot, 'y', { duration: 0.1, ease: 'power3' });
    cur.classList.add('is-hidden'); // до первого движения мыши курсор не показываем
    window.addEventListener('pointermove', (e) => {
      if (e.pointerType && e.pointerType !== 'mouse') return;
      rx(e.clientX); ry(e.clientY); dx(e.clientX); dy(e.clientY);
      cur.classList.remove('is-hidden');
    }, { passive: true });
    document.documentElement.addEventListener('mouseleave', () => cur.classList.add('is-hidden'));
    let state = '';
    const set = (s) => {
      if (s === state) return;
      cur.classList.remove('is-label', 'is-hover');
      if (s) cur.classList.add(s);
      state = s;
    };
    document.addEventListener('pointerover', (e) => {
      const lab = e.target.closest('[data-cursor]');
      if (lab && !caseOpen) { label.textContent = I.t('cursor.' + lab.dataset.cursor); set('is-label'); return; }
      set(e.target.closest('a, button, [data-magnetic], .repo') ? 'is-hover' : '');
    });
    window.addEventListener('pointerdown', () => gsap.to(ring, { scale: 0.8, duration: 0.2 }));
    window.addEventListener('pointerup', () => gsap.to(ring, { scale: 1, duration: 0.4, ease: 'back.out(3)' }));
  }

  const magnetized = new WeakSet();
  function magnetize(root = document) {
    if (!fine || reduced) return;
    $$('[data-magnetic]', root).forEach((el) => {
      if (magnetized.has(el)) return;
      magnetized.add(el);
      const k = parseFloat(el.dataset.magnetic) || 0.3;
      const xTo = gsap.quickTo(el, 'x', { duration: 0.9, ease: 'elastic.out(1, 0.45)' });
      const yTo = gsap.quickTo(el, 'y', { duration: 0.9, ease: 'elastic.out(1, 0.45)' });
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        xTo((e.clientX - r.left - r.width / 2) * k);
        yTo((e.clientY - r.top - r.height / 2) * k);
      });
      el.addEventListener('pointerleave', () => { xTo(0); yTo(0); });
    });
  }

  /* =================================================================
     Шапка, меню, индикатор секции
     ================================================================= */
  const ORDER = ['intro', 'about', 'services', 'work', 'toolbox', 'process', 'github', 'contact'];
  let activeKey = null;

  function setActive(key) {
    if (key === activeKey) return;
    activeKey = key;
    const navKey = key === 'services' ? 'about' : key === 'intro' ? null : key;
    $$('.nav a').forEach((a) => a.classList.toggle('is-active', a.dataset.nav === navKey));
    const link = navKey && $(`.nav a[data-nav="${navKey}"]`);
    const pill = $('.nav__pill');
    if (link) gsap.to(pill, { x: link.offsetLeft, width: link.offsetWidth, opacity: 1, duration: 0.65, ease: EASE.out });
    else gsap.to(pill, { opacity: 0, duration: 0.3 });
    const idx = ORDER.indexOf(key);
    $('[data-hud-num]').textContent = pad(idx);
    gsap.to('[data-hud-name]', { duration: 0.8, overwrite: true, scrambleText: { text: I.t('nav.' + key), chars: 'lowerCase', speed: 0.6 } });
    gsap.to('[data-hud-bar]', { scaleX: idx / (ORDER.length - 1), duration: 0.8, ease: EASE.out });
    gsap.to('.hud', { opacity: key === 'intro' ? 0 : 1, duration: 0.5 });
  }

  function initHeader() {
    const header = $('[data-header]'), hud = $('.hud'), footer = $('.footer');
    const sections = $$('[data-section]');
    let lastY = -1;
    gsap.ticker.add(() => {
      const y = scrollY();
      if (Math.abs(y - lastY) < 1) return;
      const down = y > lastY;
      lastY = y;
      header.classList.toggle('is-scrolled', y > 40);
      header.classList.toggle('is-hidden', down && y > 420 && !menuOpen);
      // активная секция — последняя, чей верх выше середины экрана
      const mid = window.innerHeight * 0.5;
      let key = 'intro';
      for (const s of sections) if (s.getBoundingClientRect().top < mid) key = s.dataset.section;
      setActive(key);
      // у футера своя нижняя строка — индикатор секции прячем
      hud.classList.toggle('is-off', footer.getBoundingClientRect().top < window.innerHeight - 70);
    });
    const logoText = $('[data-logo]');
    $('.logo').addEventListener('pointerenter', () => {
      gsap.to(logoText, { duration: 0.8, overwrite: true, scrambleText: { text: C.handle, chars: 'lowerCase', speed: 0.7 } });
    });
  }

  let menuTl = null;
  function initMenu() {
    const menu = $('[data-menu]');
    menuTl = gsap.timeline({ paused: true })
      .set(menu, { visibility: 'visible' })
      .fromTo(menu, { clipPath: 'circle(0% at calc(100% - 46px) 33px)' }, { clipPath: 'circle(150% at calc(100% - 46px) 33px)', duration: 0.9, ease: EASE.io })
      .from('.menu__nav a > span:last-child', { yPercent: 110, duration: 0.8, ease: EASE.out, stagger: 0.05 }, 0.35)
      .from('.menu__num', { opacity: 0, duration: 0.5, stagger: 0.05 }, 0.45)
      .from('.menu__foot', { opacity: 0, y: 20, duration: 0.6 }, 0.6);
    $('[data-burger]').addEventListener('click', () => toggleMenu(!menuOpen));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && menuOpen) toggleMenu(false); });
  }
  function toggleMenu(open) {
    menuOpen = open;
    html.classList.toggle('menu-open', open);
    $('[data-burger]').setAttribute('aria-expanded', String(open));
    $('[data-menu]').setAttribute('aria-hidden', String(!open));
    if (open) { menuTl.timeScale(1).play(); lenis && lenis.stop(); }
    else { menuTl.timeScale(1.7).reverse(); lenis && lenis.start(); }
  }

  /* =================================================================
     Смена языка: шторка → новые тексты → пересборка SplitText
     ================================================================= */
  function updateLangUI(animate = true) {
    $$('[data-lang]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.lang === I.lang)));
    const btn = $(`[data-lang="${I.lang}"]`);
    if (btn && hasG) gsap.to('.lang__pill', { x: btn.offsetLeft - 4, duration: animate ? 0.6 : 0, ease: EASE.out });
  }

  function initLang() {
    $$('[data-lang]').forEach((b) => b.addEventListener('click', () => setLang(b.dataset.lang)));
  }

  function setLang(next) {
    if (next === I.lang || switching) return;
    switching = true;
    const wipe = $('.wipe'), panel = $('.wipe__panel'), label = $('[data-wipe-label]');
    label.textContent = next.toUpperCase();
    updateLangPill(next);
    if (reduced) { swap(next); switching = false; return; }
    scene && scene.kick(0.6);
    gsap.timeline({ onComplete: () => { switching = false; gsap.set(wipe, { visibility: 'hidden' }); } })
      .set(wipe, { visibility: 'visible' })
      .fromTo(panel, { clipPath: 'inset(100% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.65, ease: EASE.io })
      .fromTo(label, { yPercent: 60, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.5, ease: EASE.out }, '-=0.25')
      .add(() => swap(next))
      .to(label, { yPercent: -60, opacity: 0, duration: 0.35, ease: 'power2.in' }, '+=0.2')
      .to(panel, { clipPath: 'inset(0% 0% 100% 0%)', duration: 0.75, ease: EASE.io }, '-=0.1');
  }
  function updateLangPill(next) {
    const btn = $(`[data-lang="${next}"]`);
    if (btn) gsap.to('.lang__pill', { x: btn.offsetLeft - 4, duration: 0.6, ease: EASE.out });
  }

  function swap(next) {
    destroyTextFx();
    I.set(next);
    updateLangUI(false);
    applyCity();
    fillProjectTexts();
    roleIdx = 0;
    $('[data-roles]').textContent = I.t('hero.roles')[0];
    if (introDone) startRoles();
    activeKey = null; // HUD перепишется на новом языке
    renderGitHub(false);
    fitHero();
    initTextFx();
    if (heroTween && introDone) gsap.delayedCall(0.35, () => heroTween && heroTween.timeScale(1.4).play());
    buildProcess();
    ScrollTrigger.refresh();
  }

  /* =================================================================
     Services: прожектор, наклон, рисование иконок
     ================================================================= */
  function initServices() {
    $$('.svc').forEach((card) => {
      gsap.set(card, { transformPerspective: 1000 });
      const rx = gsap.quickTo(card, 'rotationX', { duration: 0.6, ease: 'power3' });
      const ry = gsap.quickTo(card, 'rotationY', { duration: 0.6, ease: 'power3' });
      const paths = $$('.svc__icon > *', card);
      card.addEventListener('pointermove', (e) => {
        const r = card.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
        card.style.setProperty('--mx', x + 'px');
        card.style.setProperty('--my', y + 'px');
        if (fine && !reduced) { rx(-(y / r.height - 0.5) * 7); ry((x / r.width - 0.5) * 9); }
      });
      card.addEventListener('pointerleave', () => { rx(0); ry(0); });
      if (reduced) return;
      card.addEventListener('pointerenter', () => {
        gsap.fromTo(paths, { drawSVG: '0% 0%' }, { drawSVG: '0% 100%', duration: 1, stagger: 0.08, ease: 'power2.inOut', overwrite: true });
      });
      gsap.fromTo(paths, { drawSVG: '0%' }, {
        drawSVG: '100%', duration: 1.8, stagger: 0.12, ease: 'power2.inOut',
        scrollTrigger: { trigger: card, start: 'top 82%', once: true }
      });
    });
  }

  /* =================================================================
     Work: горизонтальная лента, параллакс, искажение, кейс через Flip
     ================================================================= */
  let workTween = null;
  function initWork() {
    const section = $('.work'), track = $('[data-track]'), bar = $('[data-work-bar]'), cur = $('[data-work-current]');
    const cards = $$('.card', track);
    const mm = gsap.matchMedia();

    mm.add('(min-width: 961px)', () => {
      const dist = () => Math.max(0, track.scrollWidth - window.innerWidth);
      workTween = gsap.to(track, {
        x: () => -dist(), ease: 'none',
        scrollTrigger: {
          trigger: section, start: 'top top', end: () => '+=' + dist(), pin: true, scrub: 0.9,
          invalidateOnRefresh: true, anticipatePin: 1,
          onUpdate: (self) => {
            bar.style.transform = `scaleX(${self.progress.toFixed(4)})`;
            const mid = window.innerWidth / 2;
            let best = 0, bestD = Infinity;
            cards.forEach((c, i) => {
              const r = c.getBoundingClientRect(), d = Math.abs(r.left + r.width / 2 - mid);
              if (d < bestD) { bestD = d; best = i; }
            });
            cur.textContent = pad(best + 1);
          }
        }
      });
      if (!reduced) {
        cards.forEach((card) => {
          const par = card.querySelector('.card__par');
          if (par) gsap.fromTo(par, { xPercent: -6 }, {
            xPercent: 6, ease: 'none',
            scrollTrigger: { trigger: card, containerAnimation: workTween, start: 'left right', end: 'right left', scrub: true }
          });
          gsap.from(card, {
            yPercent: 14, rotate: 3, opacity: 0.2, ease: 'none',
            scrollTrigger: { trigger: card, containerAnimation: workTween, start: 'left 100%', end: 'left 55%', scrub: true }
          });
        });
        // карточки наклоняются от скорости прокрутки
        const skews = cards.map((c) => gsap.quickTo(c, 'skewX', { duration: 0.6, ease: 'power3' }));
        const skewTick = () => { const s = clamp(-vel.v * 0.22, -7, 7); skews.forEach((fn) => fn(s)); };
        gsap.ticker.add(skewTick);
        return () => { gsap.ticker.remove(skewTick); gsap.set(cards, { skewX: 0 }); workTween = null; };
      }
      return () => { workTween = null; };
    });

    mm.add('(max-width: 960px)', () => {
      if (reduced) return;
      cards.forEach((card) => gsap.from(card, {
        y: 70, opacity: 0, duration: 1.1, ease: EASE.out,
        scrollTrigger: { trigger: card, start: 'top 92%', once: true }
      }));
    });

    // Волна по картинке при наведении (SVG feDisplacementMap)
    const disp = $('[data-warp]');
    let warpImg = null;
    if (fine && !reduced && disp) {
      cards.forEach((card) => {
        const img = card.querySelector('img');
        if (!img) return;
        card.addEventListener('pointerenter', () => {
          if (warpImg && warpImg !== img) warpImg.style.filter = '';
          warpImg = img;
          img.style.filter = 'url(#warp)';
          gsap.fromTo(disp, { attr: { scale: 0 } }, {
            attr: { scale: 64 }, duration: 0.5, ease: 'power2.out', yoyo: true, repeat: 1, overwrite: true,
            onComplete: () => { img.style.filter = ''; if (warpImg === img) warpImg = null; }
          });
        });
      });
    }

    cards.forEach((card) => {
      if (!card.dataset.id) return;
      card.addEventListener('click', () => openCase(card));
      card.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openCase(card); } });
    });
    $$('[data-case-close]').forEach((b) => b.addEventListener('click', closeCase));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && caseOpen) closeCase(); });
  }

  let caseCard = null, caseBusy = false;
  function fillCase(p) {
    const idx = C.projects.indexOf(p);
    $('[data-case-num]').textContent = pad(idx + 1);
    $('[data-case-kind]').textContent = I.pick(p.kind);
    $('[data-case-title]').textContent = I.pick(p.title);
    $('[data-case-desc]').textContent = I.pick(p.desc);
    $('[data-case-role]').textContent = I.pick(p.role);
    $('[data-case-year]').textContent = p.year;
    $('[data-case-stack]').textContent = p.stack.join(' · ');
    $('[data-case-features]').innerHTML = I.pick(p.features).map((f) => `<li>${esc(f)}</li>`).join('');
    const links = [];
    if (p.live) links.push(`<a class="btn btn--accent btn--sm" href="${esc(p.live)}" target="_blank" rel="noopener" data-magnetic><span class="btn__fill"></span><span class="roll"><span data-text="${esc(I.t('work.live'))}">${esc(I.t('work.live'))}</span></span>${ARROW_OUT}</a>`);
    if (p.code) links.push(`<a class="btn btn--ghost btn--sm" href="${esc(p.code)}" target="_blank" rel="noopener" data-magnetic><span class="btn__fill"></span><span class="roll"><span data-text="${esc(I.t('work.code'))}">${esc(I.t('work.code'))}</span></span>${ARROW_OUT}</a>`);
    $('[data-case-links]').innerHTML = links.join('');
    $('[data-case-gallery]').innerHTML = (p.gallery || []).map((src) =>
      `<figure class="${/-m\.\w+$/.test(src) ? 'is-phone' : ''}"><img src="${esc(src)}" alt="" loading="lazy" decoding="async"></figure>`).join('');
    // если картинки нет (например, ещё не сделан скриншот) — убираем пустую рамку
    $$('[data-case-gallery] img').forEach((img) => img.addEventListener('error', () => img.parentElement.remove()));
    magnetize($('[data-case-links]'));
  }

  function openCase(card) {
    if (caseOpen || caseBusy) return;
    const p = C.projects.find((x) => x.id === card.dataset.id);
    if (!p) return;
    caseOpen = caseBusy = true;
    caseCard = card;
    const box = $('[data-case]'), cm = $('.case__media'), img = $('[data-case-img]');
    fillCase(p);
    img.src = card.querySelector('img').currentSrc || p.cover;
    img.alt = I.pick(p.title);
    box.classList.add('is-open');
    box.setAttribute('aria-hidden', 'false');
    $('.case__panel').scrollTop = 0;
    lenis && lenis.stop();
    $('.cursor').classList.remove('is-label');
    const from = card.querySelector('.card__media');
    from.style.visibility = 'hidden';

    const tl = gsap.timeline({ onComplete: () => { caseBusy = false; $('.case__close').focus({ preventScroll: true }); } });
    tl.fromTo('.case__backdrop', { opacity: 0 }, { opacity: 1, duration: 0.6, ease: 'power2.out' }, 0);
    if (reduced || !window.Flip) {
      tl.from(cm, { opacity: 0, duration: 0.4 }, 0);
    } else {
      // FLIP: ставим картинку кейса на место карточки и ведём в её обычное положение
      gsap.set(cm, { clearProps: 'all' });
      Flip.fit(cm, from, { scale: false });
      const state = Flip.getState(cm);
      gsap.set(cm, { clearProps: 'all' });
      tl.add(Flip.from(state, { duration: 1.05, ease: EASE.io, scale: false }), 0);
    }
    tl.from('.case__body > *', { y: 46, opacity: 0, duration: 0.9, stagger: 0.05, ease: EASE.out }, reduced ? 0 : 0.55)
      .from('.case__close', { scale: 0, rotate: -90, duration: 0.7, ease: 'back.out(2)' }, 0.6);
  }

  function closeCase() {
    if (!caseOpen || caseBusy) return;
    caseBusy = true;
    const box = $('[data-case]'), cm = $('.case__media'), panel = $('.case__panel');
    const from = caseCard.querySelector('.card__media');
    const finish = () => {
      box.classList.remove('is-open');
      box.setAttribute('aria-hidden', 'true');
      gsap.set([cm, '.case__body > *', '.case__close', '.case__backdrop'], { clearProps: 'all' });
      from.style.visibility = '';
      caseOpen = caseBusy = false;
      lenis && lenis.start();
      caseCard.focus({ preventScroll: true });
    };
    if (reduced || !window.Flip) { gsap.to(box, { opacity: 0, duration: 0.3, onComplete: () => { gsap.set(box, { clearProps: 'opacity' }); finish(); } }); return; }
    const tl = gsap.timeline({ onComplete: finish });
    tl.to('.case__body > *', { y: 24, opacity: 0, duration: 0.35, stagger: 0.015, ease: 'power2.in' }, 0)
      .to('.case__close', { scale: 0, duration: 0.3, ease: 'power2.in' }, 0)
      .to(panel, { scrollTop: 0, duration: 0.45, ease: 'power2.inOut' }, 0)
      .add(() => { Flip.fit(cm, from, { scale: false, duration: 0.95, ease: EASE.io }); }, 0.42)
      .to('.case__backdrop', { opacity: 0, duration: 0.7, ease: 'power2.inOut' }, 0.6)
      .to({}, { duration: 0.95 }, 0.42);
  }

  /* =================================================================
     Toolbox: бегущая строка от скорости + физика
     ================================================================= */
  function initMarquee() {
    const rows = $$('[data-marquee]').map((row) => ({ inner: $('.marquee__inner', row), dir: +row.dataset.marquee, x: 0, w: 1 }));
    const measure = () => rows.forEach((r) => (r.w = r.inner.scrollWidth / 2 || 1));
    measure();
    window.addEventListener('resize', debounce(measure, 200));
    let visible = false;
    ScrollTrigger.create({ trigger: '.marquee', start: 'top bottom', end: 'bottom top', onToggle: (s) => (visible = s.isActive) });
    if (reduced) return;
    gsap.ticker.add((time, dt) => {
      if (!visible) return;
      const boost = 1 + Math.min(Math.abs(vel.v) * 0.14, 9);
      for (const r of rows) {
        r.x -= r.dir * vel.dir * boost * dt * 0.055;
        if (r.x <= -r.w) r.x += r.w;
        if (r.x > 0) r.x -= r.w;
        r.inner.style.transform = `translate3d(${r.x.toFixed(2)}px,0,0)`;
      }
    });
  }

  function initToolbox() {
    const pit = $('[data-pit]');
    physics = ToolboxPhysics.create(pit, C.tools, { reduced });
    ScrollTrigger.create({ trigger: pit, start: 'top 72%', once: true, onEnter: () => physics.drop() });
    ScrollTrigger.create({ trigger: pit, start: 'top bottom', end: 'bottom top', onToggle: (s) => physics.setActive(s.isActive) });
    if (physics.tick) gsap.ticker.add((time, dt) => physics.tick(dt));
    $('[data-shake]').addEventListener('click', () => { physics.shake(); scene && scene.kick(0.8); });
  }

  /* =================================================================
     Process: путь строится под реальную вёрстку, DrawSVG + MotionPath
     ================================================================= */
  let procTl = null;
  function buildProcess() {
    const wrap = $('[data-process]'), svg = $('.process__svg');
    const path = $('[data-proc-path]'), track = $('[data-proc-track]'), dot = $('[data-proc-dot]');
    if (procTl) { procTl.scrollTrigger && procTl.scrollTrigger.kill(); procTl.kill(); procTl = null; }
    const W = wrap.clientWidth, H = wrap.clientHeight;
    svg.setAttribute('width', W);
    svg.setAttribute('height', H);
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    const mobile = window.innerWidth <= 960;
    const cx = mobile ? 22 : W / 2, amp = mobile ? 16 : Math.min(150, W * 0.11);
    const top = wrap.getBoundingClientRect().top;
    const ys = $$('.step__num', wrap).map((n) => { const r = n.getBoundingClientRect(); return r.top - top + r.height / 2; });
    const pts = [[cx, 0], ...ys.map((y) => [cx, y]), [cx, H]];
    let d = `M ${cx} 0`;
    for (let i = 1; i < pts.length; i++) {
      const [x0, y0] = pts[i - 1], [x1, y1] = pts[i], s = (i % 2 ? 1 : -1) * amp, dy = y1 - y0;
      d += ` C ${(x0 + s).toFixed(1)} ${(y0 + dy * 0.35).toFixed(1)}, ${(x1 + s).toFixed(1)} ${(y1 - dy * 0.35).toFixed(1)}, ${x1.toFixed(1)} ${y1.toFixed(1)}`;
    }
    path.setAttribute('d', d);
    track.setAttribute('d', d);
    if (reduced) { gsap.set(dot, { display: 'none' }); return; }
    procTl = gsap.timeline({ scrollTrigger: { trigger: wrap, start: 'top 62%', end: 'bottom 62%', scrub: 0.6 } })
      .fromTo(path, { drawSVG: '0%' }, { drawSVG: '100%', ease: 'none', duration: 1 }, 0)
      .fromTo(dot, { scale: 0.4 }, { scale: 1, duration: 0.05 }, 0)
      .to(dot, { motionPath: { path, align: path, alignOrigin: [0.5, 0.5] }, ease: 'none', duration: 1 }, 0);
  }
  function initProcessSteps() {
    $$('.step').forEach((s) => ScrollTrigger.create({
      trigger: s, start: 'top 64%',
      onEnter: () => s.classList.add('is-on'),
      onLeaveBack: () => s.classList.remove('is-on')
    }));
  }

  /* =================================================================
     GitHub: профиль, репозитории, языки, «терминал»
     ================================================================= */
  // В сборках Chromium часто нет данных ICU для азербайджанского («-11 h», «2026 M07 29») — для AZ пишем сами
  const AZ_MONTHS = ['yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun', 'iyul', 'avqust', 'sentyabr', 'oktyabr', 'noyabr', 'dekabr'];
  const AZ_UNITS = { year: 'il', month: 'ay', week: 'həftə', day: 'gün', hour: 'saat', minute: 'dəqiqə', second: 'saniyə' };
  function ago(date) {
    const s = (new Date(date) - Date.now()) / 1000;
    const units = [['year', 31536000], ['month', 2592000], ['week', 604800], ['day', 86400], ['hour', 3600], ['minute', 60]];
    let unit = 'second', val = Math.round(s);
    for (const [u, sec] of units) if (Math.abs(s) >= sec) { unit = u; val = Math.round(s / sec); break; }
    if (I.lang === 'az') {
      if (unit === 'day' && val === -1) return 'dünən';
      if (unit === 'second') return 'indicə';
      return `${Math.abs(val)} ${AZ_UNITS[unit]} ${val < 0 ? 'əvvəl' : 'sonra'}`;
    }
    return new Intl.RelativeTimeFormat(I.lang, { numeric: 'auto' }).format(val, unit);
  }
  function longDate(date) {
    const d = new Date(date);
    if (I.lang === 'az') return `${d.getDate()} ${AZ_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
    return new Intl.DateTimeFormat(I.lang, { day: 'numeric', month: 'long', year: 'numeric' }).format(d);
  }


  function renderGitHub(first) {
    const d = ghData;
    if (!d) return;
    const p = d.profile;
    const avatar = $('[data-gh-avatar]');
    if (p.avatar_url) avatar.src = p.avatar_url + (p.avatar_url.includes('?') ? '&' : '?') + 's=160';
    avatar.alt = p.name || p.login;
    $('[data-gh-name]').textContent = p.name || p.login;
    const login = $('[data-gh-login]');
    login.textContent = '@' + p.login;
    login.href = p.html_url || 'https://github.com/' + p.login;
    $('[data-gh-bio]').textContent = p.bio || '';
    try { $('[data-gh-since]').textContent = longDate(p.created_at); } catch (e) {}

    // Счётчики профиля
    $$('[data-gh-stat]').forEach((el) => {
      const v = +p[el.dataset.ghStat] || 0;
      if (!first || reduced || !hasG) { el.textContent = v; return; }
      const o = { n: 0 };
      ScrollTrigger.create({ trigger: el, start: 'top 92%', once: true, onEnter: () => gsap.to(o, { n: v, duration: 1.6, ease: 'power3.out', onUpdate: () => (el.textContent = Math.round(o.n)) }) });
    });
    const aboutCount = $('[data-gh-repos]');
    aboutCount.dataset.countTo = p.public_repos;
    if (aboutCount.dataset.done) aboutCount.textContent = p.public_repos;

    // Репозитории
    const byRepo = Object.fromEntries(C.projects.filter((x) => x.repo).map((x) => [x.repo.toLowerCase(), x]));
    const list = $('[data-gh-repos-list]');
    list.innerHTML = d.repos.slice(0, 6).map((r) => {
      const proj = byRepo[r.name.toLowerCase()];
      const desc = r.description || (proj && I.pick(proj.kind)) || I.t('github.noDesc');
      const site = r.homepage || (r.has_pages ? (r.name.toLowerCase() === `${p.login}.github.io`.toLowerCase() ? `https://${p.login}.github.io/` : `https://${p.login}.github.io/${r.name}/`) : '');
      return `
        <article class="repo" style="--lang:${GitHubLive.color(r.language)}">
          <div class="repo__top">
            <a class="repo__name" href="${esc(r.html_url)}" target="_blank" rel="noopener">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 19.5V5a2 2 0 0 1 2-2h13v15H6a2 2 0 0 0-2 2Zm0 0A2 2 0 0 0 6 22h13v-4"/></svg>${esc(r.name)}
            </a>
            <span class="repo__badge mono">public</span>
          </div>
          <p class="repo__desc">${esc(desc)}</p>
          <div class="repo__meta">
            ${r.language ? `<span class="repo__lang"><i></i>${esc(r.language)}</span>` : ''}
            <span>★ ${r.stargazers_count}</span><span>⑂ ${r.forks_count}</span>
            <span>${esc(I.t('github.pushed'))} ${esc(ago(r.pushed_at))}</span>
          </div>
          <div class="repo__links">
            <a href="${esc(r.html_url)}" target="_blank" rel="noopener">${esc(I.t('github.repo'))} ↗</a>
            ${site ? `<a href="${esc(site)}" target="_blank" rel="noopener">${esc(I.t('github.pages'))} ↗</a>` : ''}
          </div>
        </article>`;
    }).join('');
    if (first && hasG && !reduced) {
      const repos = $$('.repo', list);
      gsap.set(repos, { y: 50, opacity: 0 });
      ScrollTrigger.batch(repos, { start: 'top 92%', once: true, onEnter: (els) => gsap.to(els, { y: 0, opacity: 1, duration: 1, ease: EASE.out, stagger: 0.1 }) });
    }

    // Языки: доли по числу репозиториев
    const counts = {};
    d.repos.forEach((r) => { if (r.language) counts[r.language] = (counts[r.language] || 0) + 1; });
    const total = Object.values(counts).reduce((a, b) => a + b, 0) || 1;
    const langs = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    const bar = $('[data-langbar]');
    bar.innerHTML = langs.map(([l, n]) => `<i style="--c:${GitHubLive.color(l)};width:${(n / total * 100).toFixed(1)}%"></i>`).join('');
    $('[data-langlist]').innerHTML = langs.map(([l, n]) => `<li><i style="--c:${GitHubLive.color(l)}"></i>${esc(l)} <b>${Math.round(n / total * 100)}%</b></li>`).join('');
    if (first && hasG && !reduced) {
      gsap.from($$('i', bar), { scaleX: 0, duration: 1.4, ease: EASE.out, stagger: 0.12, scrollTrigger: { trigger: bar, start: 'top 92%', once: true } });
    }

    const note = $('[data-gh-note]');
    note.hidden = !(d.source === 'offline' || d.source === 'stale');
    note.textContent = I.t('github.offline');

    renderTerm(first && !termTyped && hasG && !reduced);
  }

  function renderTerm(animate) {
    const body = $('[data-term]'), d = ghData;
    if (!d) return;
    const p = d.profile, repos = d.repos.slice(0, 5);
    const w = Math.max(6, ...repos.map((r) => r.name.length)) + 2;
    const src = { live: 'term.fresh', cache: 'term.cached' }[d.source] || 'term.offline';
    const ops = [
      ['cmd', `gh api users/${p.login} --jq '.name, .bio'`],
      ['out', `<span class="t-c">${esc(p.name || p.login)}</span>`],
      ['out', `<span class="t-m">"${esc(p.bio || '')}"</span>`],
      ['cmd', `gh repo list ${p.login} --limit 5`],
      ...repos.map((r) => ['out', `<span class="t-k">${esc(r.name.padEnd(w))}</span>${esc((r.language || '—').padEnd(12))}<span class="t-m">${esc(ago(r.pushed_at))}</span>`]),
      ['cmd', 'echo "$REPOS · $FOLLOWERS"'],
      ['out', `${p.public_repos} ${esc(I.plural('term.repos', p.public_repos))} · ${p.followers} ${esc(I.plural('term.followers', p.followers))}`],
      ['out', `<span class="t-m">${esc(I.t(src))}</span>`]
    ];
    const caret = '<span class="t-p">$</span> <span class="term__caret"></span>';
    const line = ([type, text]) => (type === 'cmd' ? `<span class="t-p">$</span> <span class="t-c">${esc(text)}</span>` : text);
    if (!animate) { body.innerHTML = ops.map(line).join('\n') + '\n' + caret; return; }
    body.innerHTML = caret;
    const run = () => {
      if (termTyped) return;
      termTyped = true;
      body.innerHTML = '';
      const tl = gsap.timeline();
      ops.forEach(([type, text]) => {
        if (type === 'cmd') {
          const row = document.createElement('span');
          row.innerHTML = '<span class="t-p">$</span> <span class="t-c"></span><span class="term__caret"></span>\n';
          const out = $('.t-c', row), car = $('.term__caret', row), o = { n: 0 };
          tl.add(() => body.appendChild(row), '+=0.3')
            .to(o, { n: text.length, duration: text.length * 0.026, ease: 'none', onUpdate: () => (out.textContent = text.slice(0, Math.round(o.n))) })
            .add(() => car.remove(), '+=0.15');
        } else {
          tl.add(() => { const row = document.createElement('span'); row.innerHTML = text + '\n'; body.appendChild(row); }, '+=0.07');
        }
      });
      tl.add(() => { const row = document.createElement('span'); row.innerHTML = caret; body.appendChild(row); });
    };
    ScrollTrigger.create({ trigger: '.term', start: 'top 80%', once: true, onEnter: run });
  }

  /* =================================================================
     Появление блоков, счётчики, footer, hero-параллакс
     ================================================================= */
  function initReveals() {
    if (reduced) return;
    const els = $$('[data-reveal]');
    gsap.set(els, { y: 50, opacity: 0 });
    ScrollTrigger.batch(els, {
      start: 'top 90%', once: true,
      onEnter: (batch) => gsap.to(batch, { y: 0, opacity: 1, duration: 1.15, ease: EASE.out, stagger: 0.09 })
    });
    $$('.sec-head__line').forEach((l) => gsap.from(l, {
      scaleX: 0, duration: 1.4, ease: EASE.io,
      scrollTrigger: { trigger: l, start: 'top 92%', once: true }
    }));
  }

  function initCounters() {
    $$('[data-count-to]').forEach((el) => {
      if (reduced) { el.textContent = el.dataset.countTo; return; }
      el.textContent = '0';
      const o = { n: 0 };
      ScrollTrigger.create({
        trigger: el, start: 'top 92%', once: true,
        onEnter: () => gsap.to(o, {
          n: () => +el.dataset.countTo, duration: 1.8, ease: 'power3.out',
          onUpdate: () => (el.textContent = Math.round(o.n)),
          onComplete: () => { el.dataset.done = '1'; el.textContent = el.dataset.countTo; }
        })
      });
    });
  }

  function initFooter() {
    const letters = $$('.footer__big .fl');
    if (!reduced) {
      gsap.from(letters, {
        yPercent: 100, rotate: 8, opacity: 0, stagger: 0.045, duration: 1.3, ease: EASE.out,
        scrollTrigger: { trigger: '.footer', start: 'top 95%', once: true }
      });
    }
    letters.forEach((l) => l.addEventListener('pointerenter', () => {
      l.classList.add('is-serif');
      if (!reduced) gsap.fromTo(l, { yPercent: 0 }, { yPercent: -12, duration: 0.25, yoyo: true, repeat: 1, ease: 'power2.out', overwrite: true });
      clearTimeout(l._t);
      l._t = setTimeout(() => l.classList.remove('is-serif'), 1100);
    }));
    $('[data-totop]').addEventListener('click', () => scrollToTarget(0));
  }

  function initScrollFx() {
    gsap.to('[data-progress]', { scaleX: 1, ease: 'none', scrollTrigger: { start: 0, end: 'max', scrub: 0.3 } });
    if (reduced) return;
    gsap.to('.hero__title', { yPercent: -16, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
    gsap.to('.hero__top, .hero__bottom', { y: -60, opacity: 0, ease: 'none', scrollTrigger: { trigger: '.hero', start: '25% top', end: '75% top', scrub: true } });
    gsap.fromTo('.marquee', { xPercent: 4 }, { xPercent: -4, ease: 'none', scrollTrigger: { trigger: '.marquee', start: 'top bottom', end: 'bottom top', scrub: true } });
  }

  function initClock() {
    const els = $$('[data-clock]');
    let fmt;
    try { fmt = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: C.timeZone }); }
    catch (e) { fmt = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit' }); }
    let last = '';
    const tick = () => {
      const s = fmt.format(new Date());
      if (s !== last) { last = s; els.forEach((el) => (el.textContent = s)); }
    };
    tick();
    setInterval(tick, 5000);
  }

  /* =================================================================
     Интро после прелоадера
     ================================================================= */
  function intro() {
    introDone = true;
    html.classList.remove('is-loading');
    lenis && lenis.start();
    const tl = gsap.timeline();
    if (scene) tl.to(scene.intro, { value: 1, duration: reduced ? 0.01 : 3, ease: 'power2.out' }, 0);
    if (reduced) { startRoles(); return; }
    tl.from('.logo, .nav, .header__end', { y: -40, opacity: 0, duration: 1.1, ease: EASE.out, stagger: 0.08 }, 0.25);
    if (heroTween) tl.add(heroTween.paused(false), 0.15);
    tl.from('.eyebrow', { y: 24, opacity: 0, duration: 1, ease: EASE.out }, 0.55)
      .from('.hero__time', { y: 24, opacity: 0, duration: 1, ease: EASE.out }, 0.6)
      .from('.hero__lead', { y: 34, opacity: 0, duration: 1.1, ease: EASE.out }, 0.85)
      .from('.hero__ctas .btn', { y: 34, opacity: 0, scale: 0.92, duration: 1.1, ease: EASE.out, stagger: 0.08 }, 0.95)
      .from('.hero__scroll', { opacity: 0, duration: 1 }, 1.3)
      .add(startRoles, 1.2);
  }

  /* =================================================================
     Запуск
     ================================================================= */
  async function boot() {
    I.apply();
    renderStatic();
    renderCards();
    renderMarquee();
    renderContacts();
    renderFooter();
    initClock();

    if (!hasG) {
      html.classList.remove('is-loading');
      html.classList.add('is-ready');
      $('[data-preloader]').remove();
      return;
    }

    initScroll();
    updateLangUI(false);
    const pre = preloader();
    const tasks = [
      (document.fonts ? document.fonts.ready : Promise.resolve()).then(() => pre.step(40)),
      preload(C.projects.slice(0, 2).map((p) => (window.innerWidth <= 960 && p.coverMobile) || p.cover)).then(() => pre.step(60)),
      initScene().then(() => pre.step(88)),
      wait(reduced ? 200 : 1900)
    ];
    $('[data-gh-repos-list]').innerHTML = '<div class="repo repo--skeleton"></div>'.repeat(2);
    const ghLoad = GitHubLive.load(C.github, C.githubFallback);
    await Promise.all(tasks.map((t) => t.catch(() => {})));

    // шрифты могли догрузиться позже (новые подмножества после смены текстов) — SplitText режет по готовым метрикам
    if (document.fonts && document.fonts.status !== 'loaded') await Promise.race([document.fonts.ready, wait(1500)]);

    // Сборка анимаций, пока прелоадер ещё закрывает страницу
    fitHero();
    fitFooter();
    initWork();          // pin создаётся первым: остальные триггеры считают позиции с его учётом
    initTextFx();
    initHeader();
    initMenu();
    initLang();
    initCursor();
    magnetize();
    initServices();
    initMarquee();
    initToolbox();
    buildProcess();
    initProcessSteps();
    initReveals();
    initCounters();
    initFooter();
    initScrollFx();
    initProximity();
    bindSceneScroll();
    ScrollTrigger.refresh();
    // GitHub рисуем после pin-а: иначе его триггеры посчитают позиции без учёта закрепления
    ghLoad.then((d) => { ghData = d; renderGitHub(true); ScrollTrigger.refresh(); });

    let lastW = window.innerWidth;
    window.addEventListener('resize', debounce(() => {
      scene && scene.resize();
      if (window.innerWidth === lastW) return; // на телефоне меняется только высота из-за адресной строки
      lastW = window.innerWidth;
      fitHero();
      fitFooter();
      physics && physics.resize();
      buildProcess();
      ScrollTrigger.refresh();
      measureProximity();
    }, 180));

    window.scrollTo(0, 0);
    if (lenis) lenis.scrollTo(0, { immediate: true, force: true });
    await pre.done();
    intro();

    console.log('%c devbyfarhad %c GSAP · Three.js · Lenis · Matter.js ',
      'background:#d4ff3a;color:#0c0f02;font-weight:700;padding:4px 8px;border-radius:4px 0 0 4px',
      'background:#16161d;color:#f2f0ea;padding:4px 8px;border-radius:0 4px 4px 0');
  }

  boot();
})();
