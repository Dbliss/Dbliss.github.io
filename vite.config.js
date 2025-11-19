import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

const repoName = process.env.GITHUB_REPOSITORY
  ? process.env.GITHUB_REPOSITORY.split('/')[1]
  : null
const isUserOrOrgSite = repoName ? repoName.endsWith('.github.io') : false

export default defineConfig({
  plugins: [vue()],
  base: repoName && !isUserOrOrgSite ? `/${repoName}/` : '/',
})
