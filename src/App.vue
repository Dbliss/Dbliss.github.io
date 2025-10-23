<template>
  <div class="header">
    <div class="brand">Dillon — Frontend • 3D Chess</div>
    <div class="actions">
      <a href="https://github.com/your-username/vue-chess3d" target="_blank" rel="noreferrer">Repo</a>
      <a href="#" @click.prevent="toggleWire">Toggle Wireframe</a>
    </div>
  </div>
  <div class="canvas-wrap">
    <Chess3D ref="chess" />
    <div class="hint">🖱️ Drag to orbit • Scroll to zoom • Hover a piece to shake</div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import Chess3D from './components/Chess3D.vue'

const chess = ref(null)
const toggleWire = () => chess.value?.toggleWireframe()
</script>
