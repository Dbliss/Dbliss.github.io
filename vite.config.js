import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

const repoName = process.env.GITHUB_REPOSITORY
  ? process.env.GITHUB_REPOSITORY.split('/')[1]
  : null

export default defineConfig({
  plugins: [vue()],
  base: repoName ? `/${repoName}/` : '/',
})
