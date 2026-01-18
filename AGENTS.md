# AGENTS.md

This repo is a Vue 3 + Vite portfolio site for Dillon Bliss. It is a multi-page
portfolio with a home/landing page, projects index, per-project case studies,
and about/contact pages. It is deployed on GitHub Pages under
https://dbliss.github.io.

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

Project data model (src/data/projects.js)
- `slug`: route key used by `/projects/:slug`.
- `title`, `tagline`, `excerpt`: list + detail copy.
- `description`: long-form case study text (Default detail uses it as-is).
- `stack`, `tags`: arrays for badges.
- `repoUrl`, `liveUrl`: optional external links.
- `featured`: shows on home page.
- `hideNav`, `hideFooter`: immersive page controls.

Styling system and preferences
- Global design tokens live in `src/assets/main.css` under `:root`, including
  color, radius, and shadow variables.
- Base look: dark, high-contrast, gradient background, rounded cards, soft glow.
- Global layout classes: `.container`, `.grid`, `.card`, `.btn`, `.tag`, `.mono`.
- Font stack defaults to system UI fonts. Keep additions minimal unless a new
  visual theme truly needs a custom font.
- Keep new styles ASCII-only (no Unicode) unless the file already uses it.
- Case study pages are allowed to override the global theme with scoped CSS.
- Prefer scoped styles in detail pages so they do not leak into the rest of the
  site.

Visual language by page
- Home (`src/pages/Home.vue`): hero card + profile image with featured projects.
- Projects (`src/pages/Projects.vue`): grid of `ProjectCard` components.
- ProjectDetail (`src/pages/ProjectDetail.vue`): wrapper, delegates to project
  detail components.
- DefaultProjectDetail (`src/project-pages/DefaultProjectDetail.vue`):
  minimal layout built off global `.card` and `.tag` classes.
- LolMatchPredictorDetail: analytics-heavy layout, charts, and highlight text.
- SportsluxDetail: full-bleed background, animated "light trails", reveal-on-
  scroll directive, detailed multi-section narrative.
- ChessEngineDetail: immersive 3D/Three.js experience, fixed canvas and
  scroll-driven cinematic transitions; hides nav/footer by default.

Chess page architecture (high-level)
- `src/project-pages/ChessEngineDetail.vue` is a large interactive 3D page:
  - Three.js scene with a GLB chess set (`src/assets/chessboard/chess_set.glb`).
  - Scroll-based camera choreography and staged UI content.
  - On-page UI is in the same component with a guided vs all-content view.
  - It uses helper modules:
    - `src/chess/chessGame.js` wraps `chess.js` with compatibility helpers and
      game outcome logic.
    - `src/chess/stockfishClient.js` manages a Stockfish web worker (UCI).
- Stockfish binaries live in `public/stockfish/` and are loaded by URL.
  If you relocate them, also update `DEFAULT_WORKER_URL` in
  `src/chess/stockfishClient.js`.

Sportslux page architecture (high-level)
- `src/project-pages/SportsluxDetail.vue` is a full case study with:
  - Scroll reveal directive (`v-reveal`) using `IntersectionObserver`.
  - Animated light trails behind sections.
  - Timed cycling of result images/metrics.
  - Rich sections with grids, tables, and image galleries.
- This page uses scoped CSS to enforce its own theme and full-bleed layout.

Code conventions and preferences
- Vue 3 SFCs with `<script setup>` and Composition API.
- Use `defineProps` for props; keep components small where possible.
- Use `computed` and `ref` for derived state and reactivity.
- Prefer clear, descriptive naming for project data and UI sections.
- Keep global styles centralized in `src/assets/main.css`.
- Avoid new dependencies unless there is a clear project need.
- Keep new text ASCII-only unless a file already uses non-ASCII.

Common tasks
1) Add a new project
   - Add a new entry in `src/data/projects.js` with a unique `slug`.
   - If it needs a custom layout, add a new file in `src/project-pages/`.
   - Wire the slug to the new component in `src/pages/ProjectDetail.vue`.
   - Add any images to `src/assets/` and import them in the new component.
2) Update global theme
   - Edit design tokens in `src/assets/main.css`.
   - Keep global class behavior consistent (cards, grids, buttons).
3) Update navigation
   - `src/components/SiteNav.vue` controls the header links and actions.
   - `src/components/SiteFooter.vue` mirrors the nav links.

Run locally
- `npm run dev` for local dev server.
- `npm run build` for production build.
- `npm run preview` for a local production preview.

Notes for future agents
- The site is intentionally more expressive on individual project pages; keep
  the base pages clean and consistent.
- The chess page is complex and performance sensitive; prefer small, targeted
  changes there.
- Hash-based routing is intentional for GitHub Pages; do not switch to history
  mode unless deployment strategy changes.
