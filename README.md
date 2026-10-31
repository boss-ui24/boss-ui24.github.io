# Portfolio

Personal developer portfolio with rich animations, 3D and physics, built as a static site with no build step.

**Live site:** https://boss-ui24.github.io/

## Features

- Scroll-driven animations with GSAP and smooth scrolling with Lenis
- Interactive 3D graphics with Three.js
- Physics-based elements with Matter.js
- Three languages: English, Russian and Azerbaijani
- Live repository list loaded from the GitHub API
- Custom animated 404 page

## Projects

- [Tech Teardown](https://boss-ui24.github.io/IOS/): interactive exploded views of iPhone, MacBook Pro, Apple Watch and AirPods Pro
- [NAMI](https://boss-ui24.github.io/SUSHI/): demo sushi bar website with 3D sushi built in code

## Tech Stack

- HTML, CSS and vanilla JavaScript
- GSAP 3.13
- Lenis 1.3
- Three.js 0.170
- Matter.js 0.20
- GitHub Pages

## Run Locally

No install or build is needed. Clone the repository and start any static server:

```bash
git clone https://github.com/boss-ui24/boss-ui24.github.io.git
cd boss-ui24.github.io
python3 -m http.server 8000
```

Then open http://localhost:8000.

## Project Structure

```text
├── index.html      Main page
├── 404.html        Custom error page
├── assets/         Images and other static files
├── css/            Styles
└── js/             Scripts, site config and translations
```
