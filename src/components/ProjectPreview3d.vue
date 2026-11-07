<template>
  <div ref="host" class="pp3d" />
</template>

<script setup>
// Small three.js stage for project-card previews.
//  - kind="knight":    a single chess knight slowly turning on the spot
//  - kind="furniture": Kenney furniture gliding across, one after another
// Renders only while on screen; a single still frame under prefers-reduced-motion.
import { onBeforeUnmount, onMounted, ref } from 'vue'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import chessModelUrl from '../assets/chess-engine/chess_set.glb?url'

const props = defineProps({
  kind: { type: String, required: true }
})

const modelUrls = import.meta.glob('../assets/super-move/models/*.glb', { query: '?url', import: 'default', eager: true })
const FURNITURE = ['loungeSofaLong', 'chair', 'bookcaseOpen', 'pottedPlant', 'tableCoffee', 'kitchenFridgeLarge', 'loungeChair', 'desk', 'bedSingle', 'televisionModern']

const loader = new GLTFLoader()
const load = (url) => new Promise((resolve, reject) => loader.load(url, (g) => resolve(g.scene), undefined, reject))

const host = ref(null)
let renderer, scene, camera, frame = 0, visible = false, io, ro, disposed = false
let tick = () => {}

const reduceMotion = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

function shadowTexture () {
  const c = document.createElement('canvas')
  c.width = c.height = 128
  const g = c.getContext('2d')
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64)
  grad.addColorStop(0, 'rgba(20,24,50,.32)')
  grad.addColorStop(1, 'rgba(20,24,50,0)')
  g.fillStyle = grad
  g.fillRect(0, 0, 128, 128)
  return new THREE.CanvasTexture(c)
}

function shadowDisc (tex, size) {
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(size, size),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false })
  )
  m.rotation.x = -Math.PI / 2
  m.position.y = 0.002
  return m
}

// Wrap an object so its footprint is centred on the origin and it sits on y = 0.
function grounded (obj, targetSize) {
  const box = new THREE.Box3().setFromObject(obj)
  const size = box.getSize(new THREE.Vector3())
  const s = targetSize / Math.max(size.x, size.y, size.z)
  obj.scale.multiplyScalar(s)
  obj.updateMatrixWorld(true)
  const b2 = new THREE.Box3().setFromObject(obj)
  const c = b2.getCenter(new THREE.Vector3())
  obj.position.x -= c.x
  obj.position.z -= c.z
  obj.position.y -= b2.min.y
  const wrap = new THREE.Group()
  wrap.add(obj)
  return { wrap, size: b2.getSize(new THREE.Vector3()) }
}

async function buildKnight (toneColor) {
  const root = await load(chessModelUrl)
  root.updateMatrixWorld(true)
  const knight = root.getObjectByName('Knight')
  if (!knight) throw new Error('chess_set.glb has no Knight node')

  // Bake the knight's world transform (Sketchfab root fix-ups) into a standalone copy.
  const piece = knight.clone(true)
  piece.matrixAutoUpdate = false
  piece.matrix.copy(knight.matrixWorld)
  const holder = new THREE.Group()
  holder.add(piece)
  holder.updateMatrixWorld(true)

  const mat = new THREE.MeshStandardMaterial({ color: toneColor, roughness: 0.38, metalness: 0.15 })
  piece.traverse((o) => { if (o.isMesh) o.material = mat })

  const { wrap, size } = grounded(holder, 1.6)
  const pivot = new THREE.Group()
  pivot.add(wrap)
  pivot.add(shadowDisc(shadowTexture(), Math.max(size.x, size.z) * 1.9))
  scene.add(pivot)

  camera.position.set(0, size.y * 0.75, 4.6)
  camera.lookAt(0, size.y * 0.48, 0)

  tick = (t) => { pivot.rotation.y = t * 0.35 }
}

async function buildFurniture () {
  const tex = shadowTexture()
  const spacing = 1.9
  const track = FURNITURE.length * spacing
  const items = []

  const scenes = await Promise.all(FURNITURE.map((name) => {
    const url = modelUrls[`../assets/super-move/models/${name}.glb`]
    return url ? load(url).catch(() => null) : null
  }))

  scenes.forEach((obj, i) => {
    if (!obj) return
    const { wrap, size } = grounded(obj, 1.15)
    wrap.rotation.y = -0.55
    const slot = new THREE.Group()
    slot.add(wrap)
    slot.add(shadowDisc(tex, Math.max(size.x, size.z) * 1.7))
    scene.add(slot)
    items.push({ slot, offset: i * spacing })
  })

  camera.position.set(0, 2.1, 6.2)
  camera.lookAt(0, 0.45, 0)

  const speed = 0.32
  tick = (t) => {
    for (const it of items) {
      const x = ((it.offset + t * speed) % track + track) % track - track / 2
      it.slot.position.x = x
    }
  }
}

function resize () {
  const el = host.value
  if (!el || !renderer) return
  const w = el.clientWidth || 1
  const h = el.clientHeight || 1
  renderer.setSize(w, h, false)
  camera.aspect = w / h
  camera.updateProjectionMatrix()
  renderOnce()
}

const clock = new THREE.Clock()
let elapsed = 0
function renderOnce () {
  if (renderer) renderer.render(scene, camera)
}
function loop () {
  frame = 0
  if (disposed || !visible) return
  elapsed += Math.min(clock.getDelta(), 0.1)
  tick(elapsed)
  renderOnce()
  frame = requestAnimationFrame(loop)
}
function start () {
  if (reduceMotion || frame) return
  clock.getDelta()
  frame = requestAnimationFrame(loop)
}

onMounted(async () => {
  const el = host.value
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
  renderer.outputColorSpace = THREE.SRGBColorSpace
  el.appendChild(renderer.domElement)

  scene = new THREE.Scene()
  camera = new THREE.PerspectiveCamera(30, 2, 0.1, 100)
  scene.add(new THREE.HemisphereLight(0xffffff, 0xd9dcef, 1.6))
  const key = new THREE.DirectionalLight(0xffffff, 2.2)
  key.position.set(3, 5, 4)
  scene.add(key)
  const rim = new THREE.DirectionalLight(0xffffff, 0.8)
  rim.position.set(-4, 3, -3)
  scene.add(rim)

  const rgb = getComputedStyle(el).getPropertyValue('--tone-rgb').split(',').map((v) => Number(v.trim()) / 255)
  const tone = rgb.length === 3 && rgb.every((v) => !Number.isNaN(v))
    ? new THREE.Color().setRGB(rgb[0], rgb[1], rgb[2], THREE.SRGBColorSpace)
    : new THREE.Color('#6858e8')

  ro = new ResizeObserver(resize)
  ro.observe(el)
  resize()

  try {
    if (props.kind === 'knight') await buildKnight(tone)
    else await buildFurniture()
  } catch (err) {
    console.warn('Project preview failed to load', err)
    return
  }
  if (disposed) return
  tick(reduceMotion ? 0.9 : 0)
  renderOnce()

  io = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting
    if (visible) start()
  })
  io.observe(el)
})

onBeforeUnmount(() => {
  disposed = true
  cancelAnimationFrame(frame)
  io?.disconnect()
  ro?.disconnect()
  scene?.traverse((o) => {
    o.geometry?.dispose?.()
    const mats = Array.isArray(o.material) ? o.material : o.material ? [o.material] : []
    mats.forEach((m) => { m.map?.dispose?.(); m.dispose?.() })
  })
  renderer?.dispose()
  renderer?.forceContextLoss()
  renderer?.domElement.remove()
})
</script>

<style scoped>
.pp3d { position: absolute; inset: 0; }
.pp3d :deep(canvas) { width: 100% !important; height: 100% !important; display: block; }
</style>
