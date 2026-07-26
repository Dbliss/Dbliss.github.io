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
- `src/city/cityScene.js`: three.js night-city world for the landing page. Builds
  ground/roads/skyline/cars plus one clickable landmark per project; returns
  `{ landmarks, update }` consumed by `src/pages/Home.vue`.
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
  - `wealth-pathways-au` -> `WealthPathwaysWorkbookDetail.vue`
  - anything else -> `DefaultProjectDetail.vue`
- Important Wealth Pathways note:
  - The live `wealth-pathways-au` project page is currently wired to `src/project-pages/WealthPathwaysWorkbookDetail.vue`.
  - Edits to `src/project-pages/WealthPathwaysDetail.vue` or `src/project-pages/WealthPathwaysDetail.legacy.vue` will not affect the visible route unless `ProjectDetail.vue` is remapped.
- Navigation/footer visibility can be controlled per project via metadata in
  `src/data/projects.js`:
  - `hideNav`, `hideFooter` enable "immersive" pages.
  - `App.vue` uses those flags to swap into a nav hotzone + overlay.
- The home route (`/`) is a full-screen interactive 3D city (`Home.vue` +
  `src/city/cityScene.js`). Its route meta sets `hideNav`, `hideFooter`, and
  `fullBleed` (App.vue drops the `.container` class for full-bleed routes).
  Landmark → route mapping lives in the `defs` array in `cityScene.js`; add a
  new landmark there when a new project ships. The old landing hero/experience
  content now lives on `src/pages/About.vue`.



## Verification policy (read before running anything)

**When asked to build a feature, do not test it and do not build it. The user does
both.** Make the edit, explain what changed, stop. This is the default and it
overrides any general instinct to verify your own work.

The rules below apply only when the user *explicitly* asks you to verify, run
tests, or show a screenshot.

### Tests
- Run the **narrowest** scope that covers the change (`npx vitest run <file>`),
  **once**. Do not re-run the full suite to reconfirm a result you already have.
- These failures are **pre-existing on `main`** and are not yours. Do not
  investigate them, do not `git stash` to prove it, do not re-run to check:
  - `src/wealth/__tests__/finance.test.js` — 4 failures (transfer duty rounding,
    cash interest income, serviceability buffer, default rate fields)
  - `src/wealth/__tests__/dashboard.test.js` — 1 failure (metric series)
- Report the failure set from a single run and move on.

### Browser verification
The in-app Browser pane (`mcp__Claude_Browser__*`) **cannot drive this app**.
Do not spend calls rediscovering this:
- `element.click()` / `dispatchEvent` from `javascript_tool` does **not** reach
  Vue's listeners. The DOM will not update and `aria-pressed` will not change.
- `computer` clicks require a cached screenshot, and screenshots fail whenever
  the pane is not displayed — which it usually is not.
- `read_page` typically returns only the site nav, because project content sits
  far below the fold.
- The router is `createWebHashHistory()`, so URLs must be
  `http://localhost:<port>/#/projects/<slug>`. Passing the path without `#/`
  silently lands on `/`.

**If interaction is required, skip the pane entirely and use Playwright** (already
a devDependency). Write the script to the **repo root** — a scratchpad script
cannot resolve `playwright` — drive the page, screenshot the element, and delete
the script afterwards. One script, one run.

The pane is still fine for read-only checks on a static page. The moment a click
is needed, go straight to Playwright. Never probe the same dead end twice.

## Editing large files

Several components here are 1500+ lines (`WealthRegionScoutStep.vue`,
`WealthInputWorkbook.vue`). Prefer `Grep` to locate what you need and targeted
`Edit`s over reading them end-to-end or rewriting them with `Write`. Read the
whole file only when you are genuinely restructuring most of it; if you need one
prop default or one function, grep for it.

## Region scout invariant

The Wealth Pathways area search (`src/wealth/regionScout.js`) ranks **suburbs
only** — never regions. `normaliseRegionScoutConfig` hard-codes
`granularity: 'suburb'`; a `locationKey` narrows which suburbs are in scope
rather than changing the result level. Do not reintroduce region-level results or
a granularity toggle.

