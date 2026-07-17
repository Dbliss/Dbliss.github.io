// vite.config.js
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  base: '/', // for dbliss.github.io root; default is already '/'
  assetsInclude: ['**/*.PNG'],
  optimizeDeps: {
    // pre-bundle every three example module used across pages, so lazy routes
    // (e.g. /city-editor) never trigger a mid-session re-optimization — with
    // several dev servers sharing node_modules/.vite that re-opt can hang
    include: [
      'three',
      'three/examples/jsm/controls/OrbitControls.js',
      'three/examples/jsm/loaders/GLTFLoader.js',
      'three/examples/jsm/loaders/RGBELoader.js',
      'three/examples/jsm/postprocessing/EffectComposer.js',
      'three/examples/jsm/postprocessing/UnrealBloomPass.js',
      'three/examples/jsm/postprocessing/OutputPass.js',
      'three/examples/jsm/utils/BufferGeometryUtils.js',
      'n8ao'
    ]
  }
})
