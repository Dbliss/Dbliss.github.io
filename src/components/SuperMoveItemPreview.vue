<template>
  <div ref="wrap" class="ip" aria-hidden="true">
    <canvas ref="canvasEl" />
  </div>
</template>

<script setup>
// A single furniture model in its packer hitbox, turning slowly on a turntable. The parent decides
// which entry is showing; switching swaps the model with a small pop.
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import * as THREE from 'three'
import { buildHitboxItem, loadModel } from './superMoveHitbox.js'

const props = defineProps({
  entries: { type: Array, required: true },
  index: { type: Number, default: 0 }
})

const wrap = ref(null)
const canvasEl = ref(null)

let renderer, scene, camera, raf, resizeObs, visObs
let visible = false
let last = 0
let spin = 0.6
let pop = 1
const items = [] // { group, ext } per entry, null until loaded
const disposables = []
const track = (o) => { disposables.push(o); return o }

// Frame the current item: an orthographic view sized to its bounding sphere, so every item fills
// the stage the same way however it turns.
const frame = () => {
  const it = items[props.index]
  if (!camera || !it || !wrap.value) return
  const { w, d, h } = it.ext
  const r = Math.sqrt(w * w + d * d + h * h) / 2
  const aspect = wrap.value.clientWidth / Math.max(1, wrap.value.clientHeight)
  const half = r * 1.08
  camera.left = -half * aspect; camera.right = half * aspect
  camera.top = half; camera.bottom = -half
  camera.position.set(0, h / 2 + r * 1.1, r * 3.2)
  camera.lookAt(0, h / 2, 0)
  camera.updateProjectionMatrix()
}

let shadow = null
const show = () => {
  items.forEach((it, i) => { if (it) it.group.visible = i === props.index })
  const it = items[props.index]
  if (shadow && it) shadow.scale.setScalar(Math.max(it.ext.w, it.ext.d) * 1.5)
  pop = 0
  frame()
}

const resize = () => {
  if (!renderer) return
  renderer.setSize(wrap.value.clientWidth, wrap.value.clientHeight, false)
  frame()
}

const loop = (now) => {
  raf = requestAnimationFrame(loop)
  const dt = Math.min(0.05, (now - last) / 1000 || 0)
  last = now
  if (!visible) return
  spin += dt * 0.95
  pop = Math.min(1, pop + dt * 3.2)
  const it = items[props.index]
  if (it) {
    it.group.rotation.y = spin
    const s = 0.86 + 0.14 * (1 - (1 - pop) ** 3)
    it.group.scale.setScalar(s)
  }
  renderer.render(scene, camera)
}

watch(() => props.index, show)

onMounted(async () => {
  renderer = new THREE.WebGLRenderer({ canvas: canvasEl.value, antialias: true, alpha: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.outputColorSpace = THREE.SRGBColorSpace
  scene = new THREE.Scene()
  scene.add(new THREE.HemisphereLight(0xffffff, 0xa9b9b5, 2.6))
  const sun = new THREE.DirectionalLight(0xffffff, 1.8)
  sun.position.set(4, 8, 6)
  scene.add(sun)

  // soft contact shadow
  const c = document.createElement('canvas')
  c.width = c.height = 128
  const g = c.getContext('2d')
  const grad = g.createRadialGradient(64, 64, 4, 64, 64, 64)
  grad.addColorStop(0, 'rgba(20,24,52,0.22)')
  grad.addColorStop(1, 'rgba(20,24,52,0)')
  g.fillStyle = grad
  g.fillRect(0, 0, 128, 128)
  shadow = new THREE.Mesh(
    track(new THREE.PlaneGeometry(1, 1)),
    track(new THREE.MeshBasicMaterial({ map: track(new THREE.CanvasTexture(c)), transparent: true, depthWrite: false }))
  )
  shadow.rotation.x = -Math.PI / 2
  shadow.position.y = -0.002
  scene.add(shadow)

  camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 100)

  resize()
  resizeObs = new ResizeObserver(resize)
  resizeObs.observe(wrap.value)
  visObs = new IntersectionObserver(([e]) => { visible = e.isIntersecting })
  visObs.observe(wrap.value)
  raf = requestAnimationFrame(loop)

  const sources = await Promise.all(props.entries.map((e) => loadModel(e.model)))
  if (!renderer) return
  props.entries.forEach((e, i) => {
    const built = buildHitboxItem(e, sources[i], { track, fillOpacity: 0.07 })
    built.group.visible = false
    scene.add(built.group)
    items[i] = built
  })
  show()
})

onBeforeUnmount(() => {
  cancelAnimationFrame(raf)
  resizeObs?.disconnect()
  visObs?.disconnect()
  disposables.forEach((d) => d?.dispose?.())
  renderer?.dispose()
  renderer = null
})
</script>

<style scoped>
.ip { width: 100%; aspect-ratio: 1 / 1; }
.ip canvas { display: block; width: 100%; height: 100%; }
</style>
