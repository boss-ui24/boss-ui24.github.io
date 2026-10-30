/* Живые данные из GitHub API: профиль и репозитории.
   Без токена лимит — 60 запросов в час на IP, поэтому ответ кешируется на час в localStorage. */
window.GitHubLive = (() => {
  'use strict';

  const API = 'https://api.github.com';
  const TTL = 60 * 60 * 1000;

  // Цвета языков как на GitHub
  const COLORS = {
    JavaScript: '#f1e05a', TypeScript: '#3178c6', HTML: '#e34c26', CSS: '#663399', SCSS: '#c6538c',
    Python: '#3572A5', GLSL: '#5686a5', Vue: '#41b883', Svelte: '#ff3e00', PHP: '#4F5D95', Java: '#b07219',
    'C#': '#178600', 'C++': '#f34b7d', C: '#555555', Go: '#00ADD8', Rust: '#dea584', Shell: '#89e051',
    Swift: '#F05138', Kotlin: '#A97BFF', Dart: '#00B4AB', Ruby: '#701516', Astro: '#ff5a03'
  };
  const color = (lang) => COLORS[lang] || '#8d8c97';

  // В кеш кладём только нужные поля
  const slimProfile = (p) => ({
    login: p.login, name: p.name, bio: p.bio, avatar_url: p.avatar_url, html_url: p.html_url,
    public_repos: p.public_repos, followers: p.followers, following: p.following, created_at: p.created_at
  });
  const slimRepo = (r) => ({
    name: r.name, description: r.description, language: r.language, stargazers_count: r.stargazers_count,
    forks_count: r.forks_count, pushed_at: r.pushed_at, html_url: r.html_url, homepage: r.homepage, has_pages: r.has_pages
  });

  const readCache = (key) => {
    try { return JSON.parse(localStorage.getItem(key)); } catch (e) { return null; }
  };

  async function load(user, fallback) {
    const key = 'dbf-gh-' + user;
    // Репозиторий самого сайта (<логин>.github.io) — не проект, в списке его не показываем
    const site = (user + '.github.io').toLowerCase();
    const cached = readCache(key);
    if (cached && Date.now() - cached.t < TTL) return { ...cached.d, source: 'cache' };
    try {
      const opt = { headers: { Accept: 'application/vnd.github+json' } };
      const [u, r] = await Promise.all([
        fetch(`${API}/users/${user}`, opt),
        fetch(`${API}/users/${user}/repos?per_page=100&sort=pushed`, opt)
      ]);
      if (!u.ok || !r.ok) throw new Error(`GitHub API ${u.status}/${r.status}`);
      const d = {
        profile: slimProfile(await u.json()),
        repos: (await r.json()).filter((x) => !x.fork && x.name.toLowerCase() !== site).map(slimRepo)
      };
      try { localStorage.setItem(key, JSON.stringify({ t: Date.now(), d })); } catch (e) {}
      return { ...d, source: 'live' };
    } catch (e) {
      // старый кеш лучше, чем зашитый снимок
      if (cached) return { ...cached.d, source: 'stale' };
      return { ...fallback, source: 'offline' };
    }
  }

  return { load, color };
})();
