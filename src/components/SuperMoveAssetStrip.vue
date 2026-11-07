<template>
  <!-- Section divider: every furniture model in the demo load drifting past, each wrapped in the
       collision shape the packer actually uses for it. -->
  <div class="mstrip" aria-hidden="true">
    <div ref="wrap" class="mstrip-stage">
      <canvas ref="canvasEl" />
    </div>
    <p class="mstrip-cap">Every item in the load, with the hitbox the packer uses</p>
  </div>
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'
import * as THREE from 'three'
import demo from '../assets/super-move/packing-demo.json'
import { buildHitboxItem, loadModel } from './superMoveHitbox.js'

const GAP = 0.55 // metres between items on the conveyor
const SPEED = 0.38 // metres per second
const YAW = -0.6 // each item turned to show its depth
const HALF_H = 1.08 // half the visible height, in metres

const wrap = ref(null)
const canvasEl = ref(null)

let renderer, scene, camera, raf, resizeObs, visObs
let visible = false
let offset = 0
let last = 0
let loopLength = 0
let leftEdge = -10
const slots = [] // { group, start, width }
const disposables = []
const track = (o) => { disposables.push(o); return o }

const buildItem = (entry, source) => {
  const { group: pivot, ext } = buildHitboxItem(entry, source, { track })
  pivot.rotation.y = YAW // turn it so the depth reads
  // Width it occupies on screen once turned (its footprint's projection onto X).
  const width = Math.abs(ext.w * Math.cos(YAW)) + Math.abs(ext.d * Math.sin(YAW))
  return { group: pivot, width }
}

const layout = () => {
  // Conveyor position of each slot: item centre = leftEdge + ((start - offset) mod loop) + width / 2.
  for (const s of slots) {
    let p = (s.start - offset) % loopLength
    if (p < 0) p += loopLength
    s.group.position.x = leftEdge + p + s.width / 2
  }
}

const resize = () => {
  if (!renderer) return
  const { clientWidth: w, clientHeight: h } = wrap.value
  renderer.setSize(w, h, false)
  const halfW = HALF_H * (w / h)
  camera.left = -halfW; camera.right = halfW
  camera.top = HALF_H; camera.bottom = -HALF_H
  camera.updateProjectionMatrix()
  leftEdge = -halfW - 1.2
}

const loop = (now) => {
  raf = requestAnimationFrame(loop)
  const dt = Math.min(0.05, (now - last) / 1000 || 0)
  last = now
  if (!visible || !loopLength) return
  offset += dt * SPEED
  layout()
  renderer.render(scene, camera)
}

onMounted(async () => {
  renderer = new THREE.WebGLRenderer({ canvas: canvasEl.value, antialias: true, alpha: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.outputColorSpace = THREE.SRGBColorSpace
  scene = new THREE.Scene()
  scene.add(new THREE.HemisphereLight(0xffffff, 0xa9b9b5, 2.6))
  const sun = new THREE.DirectionalLight(0xffffff, 1.8)
  sun.position.set(4, 8, 6)
  scene.add(sun)

  // Looking slightly down on the conveyor; screen X == world X, so items slide straight across.
  camera = new THREE.OrthographicCamera(-10, 10, HALF_H, -HALF_H, 0.1, 100)
  camera.position.set(0, 3.4, 10)
  camera.lookAt(0, 0.62, 0)

  resize()
  resizeObs = new ResizeObserver(resize)
  resizeObs.observe(wrap.value)
  visObs = new IntersectionObserver(([e]) => { visible = e.isIntersecting }, { threshold: 0 })
  visObs.observe(wrap.value)

  const entries = demo.hitboxes || []
  const sources = await Promise.all(entries.map((e) => loadModel(e.model)))
  if (!renderer) return
  const built = entries.map((e, i) => buildItem(e, sources[i]))

  // Repeat the set until one loop is comfortably wider than the screen, so nothing pops in.
  const visibleWidth = camera.right - camera.left + 2.4
  let start = 0
  do {
    for (const b of built) {
      const group = slots.length < built.length ? b.group : b.group.clone(true)
      scene.add(group)
      slots.push({ group, start, width: b.width })
      start += b.width + GAP
    }
  } while (start < visibleWidth * 1.2)
  loopLength = start

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    layout()
    renderer.render(scene, camera)
    visible = false
  }
  raf = requestAnimationFrame(loop)
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
.mstrip {
  --bleed: calc(100vw - 32px);
  width: var(--bleed);
  margin: 56px 0 8px calc((100% - var(--bleed)) / 2);
}
.mstrip-stage {
  height: clamp(130px, 13vw, 180px);
  /* fade both ends so items drift in and out rather than being cut off */
  -webkit-mask-image: linear-gradient(90deg, transparent 0, #000 9%, #000 91%, transparent 100%);
  mask-image: linear-gradient(90deg, transparent 0, #000 9%, #000 91%, transparent 100%);
}
.mstrip-stage canvas { display: block; width: 100%; height: 100%; }
.mstrip-cap {
  margin: 6px 0 0;
  text-align: center;
  font-size: .74rem;
  font-weight: 650;
  letter-spacing: .1em;
  text-transform: uppercase;
  color: var(--muted);
}
</style>
