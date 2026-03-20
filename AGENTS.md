# AGENTS.md

This repo is a Vue 3 + Vite portfolio site for Dillon Bliss. It is a multi-page
portfolio with a home/landing page, projects index, per-project case studies,
and about/contact pages.
Primary goals
- Present a strong, high-end portfolio with bold visuals and detailed case studies.
- Keep navigation simple: home, projects list, project detail, about, contact.
- Showcase standout work with richer, custom-designed project pages.
- Maintain fast, static-site style performance (Vite build, no server runtime).

Project layout
- `index.html`: Vite entry point, site metadata.
- `vite.config.js`: Vite config (base is `/` for root GH Pages).
- `src/main.js`: creates app, installs router, imports global styles.
- `src/App.vue`: global layout, nav + footer, and "immersive" nav reveal logic.
- `src/router/index.js`: route map, hash history for GitHub Pages, smooth scroll.
- `src/pages/*.vue`: high-level pages (Home, Projects, ProjectDetail, About, Contact).
- `src/project-pages/*.vue`: case study templates; each slug maps to a component.
- `src/components/*.vue`: site nav, footer, project card.
- `src/data/projects.js`: project metadata (slug, title, stack, tags, etc.).
- `src/data/socials.js`: social links.
- `src/chess/*`: helper logic for chess UI + Stockfish worker integration.
- `public/stockfish/*`: Stockfish worker JS/WASM binaries for the chess page.
- `src/assets/*`: images, charts, and 3D assets for project pages.

How the app is wired
- Entry: `src/main.js` mounts `App.vue` to `#app`.
- Routing: `src/router/index.js` uses `createWebHashHistory()` for GH Pages.
- `src/pages/ProjectDetail.vue` looks up a project by `slug` and selects a detail
  component from a map:
  - `lol-match-predictor` -> `LolMatchPredictorDetail.vue`
  - `sportslux` -> `SportsluxDetail.vue`
  - `chessEngine` -> `ChessEngineDetail.vue`
  - anything else -> `DefaultProjectDetail.vue`
- Navigation/footer visibility can be controlled per project via metadata in
  `src/data/projects.js`:
  - `hideNav`, `hideFooter` enable "immersive" pages.
  - `App.vue` uses those flags to swap into a nav hotzone + overlay.



When asked to build out a feature, do not test it. The user will test it. DO NOT try to build it, the user will build it. 

