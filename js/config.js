/* Личные данные портфолио. Тексты интерфейса — в i18n.js, здесь только то, что меняется чаще:
   контакты, проекты, навыки. Поля с переводами задаются объектом { en, ru, az }. */
window.PORTFOLIO = {
  name: { en: 'Farhad', ru: 'Фархад', az: 'Fərhad' },
  handle: 'devbyfarhad',
  github: 'boss-ui24',
  city: { en: 'Baku', ru: 'Баку', az: 'Bakı' },
  timeZone: 'Asia/Baku',

  // Контакты: пустые строки не выводятся. Главная кнопка «Say hello» ведёт на email,
  // если его нет — в Telegram, иначе на профиль GitHub.
  email: '',          // например 'hello@example.com'
  telegram: '',       // ник без @
  linkedin: '',       // полная ссылка
  instagram: '',      // ник без @

  projects: [
    {
      id: 'nami',
      title: { en: 'NAMI 波', ru: 'NAMI 波', az: 'NAMI 波' },
      kind: {
        en: 'Sushi bar website · 3D concept',
        ru: 'Сайт суши-бара · 3D-концепт',
        az: 'Suşi barı üçün sayt · 3D konsept'
      },
      desc: {
        en: 'Concept website for a sushi bar in Baku. Every dish on the page is a procedural 3D model built from Three.js primitives — not a single photo. One WebGL canvas renders all scenes with the scissor test, while GSAP drives the scroll story: a Philadelphia roll comes apart layer by layer as you scroll.',
        ru: 'Концепт сайта суши-бара в Баку. Каждое блюдо на странице — процедурная 3D-модель из примитивов Three.js, ни одной фотографии. Один WebGL-canvas рисует все сцены через scissor, а GSAP ведёт историю по скроллу: ролл «Филадельфия» разбирается на слои прямо на глазах.',
        az: 'Bakıdakı suşi barı üçün konsept sayt. Səhifədəki hər yemək Three.js primitivlərindən qurulmuş prosedur 3D modeldir — bir dənə də foto yoxdur. Bütün səhnələri tək WebGL canvas scissor üsulu ilə çəkir, GSAP isə skroll hekayəsini idarə edir: «Filadelfiya» rolu gözünüzün önündə qat-qat açılır.'
      },
      role: { en: 'Design & development', ru: 'Дизайн и разработка', az: 'Dizayn və proqramlaşdırma' },
      features: {
        en: ['3D sushi generated in code — zero photos', 'Scroll-driven exploded view of a roll', 'AZ · RU · EN with a curtain transition', 'Cart with confetti, Swiper menu, custom cursor'],
        ru: ['3D-суши, собранные кодом — ноль фотографий', 'Разбор ролла на слои по скроллу', 'AZ · RU · EN со шторкой при смене языка', 'Корзина с конфетти, меню на Swiper, свой курсор'],
        az: ['Kodla yaradılmış 3D suşi — sıfır foto', 'Skroll ilə rolun qatlara ayrılması', 'AZ · RU · EN, dil dəyişəndə pərdə effekti', 'Konfettili səbət, Swiper menyu, xüsusi kursor']
      },
      stack: ['Three.js', 'GSAP', 'ScrollTrigger', 'SplitText', 'Lenis', 'Swiper'],
      year: 2026,
      repo: 'SUSHI',
      live: 'https://boss-ui24.github.io/SUSHI/',
      code: 'https://github.com/boss-ui24/SUSHI',
      cover: 'assets/work/nami-1.jpg',
      coverMobile: 'assets/work/nami-m.jpg',   // вертикальная обложка для телефонов
      gallery: ['assets/work/nami-2.jpg', 'assets/work/nami-m.jpg', 'assets/work/nami-3.jpg']
    },
    {
      id: 'razbor',
      title: { en: 'Teardown', ru: 'Разбор техники', az: 'Texnika anatomiyası' },
      kind: {
        en: 'Interactive exploded views · CSS 3D',
        ru: 'Интерактивные разнесённые виды · CSS 3D',
        az: 'İnteraktiv sökülmə görünüşləri · CSS 3D'
      },
      desc: {
        en: 'Interactive anatomy of Apple devices: iPhone, MacBook Pro, Apple Watch and AirPods Pro. Click a device and it flies apart into layers — glass, display, logic board, battery. A custom CSS 3D engine places flat SVG layers along the Z axis and recalculates the camera, parts and callouts in a single rAF loop, with springs from Motion.',
        ru: 'Интерактивная анатомия техники Apple: iPhone, MacBook Pro, Apple Watch и AirPods Pro. Нажмите на устройство — и оно разлетится на слои: стекло, экран, плата, аккумулятор. Свой движок на CSS 3D расставляет плоские SVG-слои по оси Z и в одном цикле rAF пересчитывает камеру, детали и выноски, а пружины даёт Motion.',
        az: 'Apple cihazlarının interaktiv anatomiyası: iPhone, MacBook Pro, Apple Watch və AirPods Pro. Cihaza klikləyin — o, qatlara ayrılacaq: şüşə, ekran, plata, batareya. Öz CSS 3D mühərrikim düz SVG qatlarını Z oxu boyunca düzür, kameranı, detalları və izahları tək rAF dövründə hesablayır, yaylı animasiyanı isə Motion verir.'
      },
      role: { en: 'Design & development', ru: 'Дизайн и разработка', az: 'Dizayn və proqramlaşdırma' },
      features: {
        en: ['4 devices, 39 parts — every one drawn in SVG', 'Custom CSS 3D engine, no WebGL', 'Interactive map of the M4 chip', 'Timeline of forty years of engineering'],
        ru: ['4 устройства, 39 деталей — каждая нарисована в SVG', 'Свой движок на CSS 3D, без WebGL', 'Интерактивная схема чипа M4', 'Лента «Сорок лет инженерии»'],
        az: ['4 cihaz, 39 detal — hər biri SVG ilə çəkilib', 'WebGL-siz, öz CSS 3D mühərriki', 'M4 çipinin interaktiv sxemi', '«Qırx illik mühəndislik» xronologiyası']
      },
      stack: ['CSS 3D', 'SVG', 'Motion', 'Vanilla JS'],
      year: 2026,
      repo: 'IOS',
      live: 'https://boss-ui24.github.io/IOS/',
      code: 'https://github.com/boss-ui24/IOS',
      cover: 'assets/work/razbor-1.jpg',
      coverMobile: 'assets/work/razbor-m.jpg',
      gallery: ['assets/work/razbor-2.jpg', 'assets/work/razbor-m.jpg', 'assets/work/razbor-3.jpg']
    }
  ],

  // Капсулы в «яме» с физикой. kind: accent | light | violet | outline | base
  tools: [
    { name: 'JavaScript', kind: 'accent' },
    { name: 'Three.js', kind: 'light' },
    { name: 'GSAP', kind: 'accent' },
    { name: 'WebGL', kind: 'violet' },
    { name: 'GLSL', kind: 'outline' },
    { name: 'HTML' },
    { name: 'CSS' },
    { name: 'ScrollTrigger' },
    { name: 'SplitText' },
    { name: 'Lenis', kind: 'outline' },
    { name: 'Swiper' },
    { name: 'Motion', kind: 'violet' },
    { name: 'Matter.js' },
    { name: 'SVG', kind: 'light' },
    { name: 'CSS 3D' },
    { name: 'Canvas' },
    { name: 'Git' },
    { name: 'GitHub Pages', kind: 'outline' },
    { name: 'i18n' },
    { name: 'Responsive' }
  ],

  marquee: ['Three.js', 'GSAP', 'WebGL', 'JavaScript', 'Motion', 'CSS 3D', 'GLSL', 'Lenis'],

  // Запасные данные GitHub — если API недоступен (лимит 60 запросов в час на IP)
  githubFallback: {
    profile: {
      login: 'boss-ui24', name: 'devbyfarhad', bio: 'Turning ideas into reality through code.',
      avatar_url: 'https://avatars.githubusercontent.com/u/310690849?v=4', html_url: 'https://github.com/boss-ui24',
      public_repos: 2, followers: 3, following: 2, created_at: '2026-07-29T16:41:10Z'
    },
    repos: [
      { name: 'SUSHI', description: null, language: 'JavaScript', stargazers_count: 0, forks_count: 0, pushed_at: '2026-10-29T17:06:19Z', html_url: 'https://github.com/boss-ui24/SUSHI', homepage: null, has_pages: true },
      { name: 'IOS', description: null, language: 'HTML', stargazers_count: 0, forks_count: 0, pushed_at: '2026-10-28T20:43:56Z', html_url: 'https://github.com/boss-ui24/IOS', homepage: null, has_pages: true }
    ]
  }
};
