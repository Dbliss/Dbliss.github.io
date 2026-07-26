// vite.config.js
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  base: '/', // for dbliss.github.io root; default is already '/'
  assetsInclude: ['**/*.PNG'],
  server: {
    watch: {
      // cache/ holds hundreds of scraped .html files. Vite treats any .html under
      // the root as an entry, so touching one triggers a full page reload.
      ignored: ['**/cache/**']
    }
  }
})
