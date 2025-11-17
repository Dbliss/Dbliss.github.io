# Dillon Portfolio (Vue 3 + Vite)

Multi-page portfolio optimized for hiring managers:
- Landing page with featured projects
- Projects index + per-project case study pages
- About, Contact
- Hash router so GitHub Pages reloads
- GitHub Action auto-deploys on push to `main`


Architecture:
/ (repo root)
├─ package.json
├─ vite.config.js
├─ index.html
├─ .gitignore
├─ README.md
├─ .github/
│  └─ workflows/
│     └─ deploy.yml
└─ src/
   ├─ main.js
   ├─ App.vue
   ├─ assets/
   │  └─ main.css
   ├─ router/
   │  └─ index.js
   ├─ data/
   │  ├─ projects.js
   │  └─ socials.js
   ├─ components/
   │  ├─ SiteNav.vue
   │  ├─ SiteFooter.vue
   │  └─ ProjectCard.vue
   └─ pages/
      ├─ Home.vue
      ├─ Projects.vue
      ├─ ProjectDetail.vue
      ├─ About.vue
      └─ Contact.vue
