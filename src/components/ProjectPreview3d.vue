<template>
  <div ref="host" class="pp3d" />
</template>

<script setup>
// Small three.js stage for project-card previews.
//  - kind="chess":     the case-study board replaying famous games
//  - kind="drone":     the drone under a single shaft of light
//  - kind="furniture": Kenney furniture gliding across, one after another
// Paints one resting frame, then only animates while `active` (the tile is hovered).
import { onBeforeUnmount, onMounted, ref } from 'vue'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { buildChess } from './previews/chessScene3d'
import { buildDrone } from './previews/droneScene3d'
import { useHoverClock } from './previews/useHoverClock'

const props = defineProps({
  kind: { type: String, required: true },
  active: { type: Boolean, default: false }
})

const modelUrls = import.meta.glob('../assets/super-move/models/*.glb', { query: '?url', import: 'default', eager: true })
const FURNITURE = ['loungeSofaLong', 'chair', 'bookcaseOpen', 'pottedPlant', 'tableCoffee', 'kitchenFridgeLarge', 'loungeChair', 'desk', 'bedSingle', 'televisionModern']

const loader = new GLTFLoader()
const load = (url) => new Promise((resolve, reject) => loader.load(url, (g) => resolve(g.scene), undefined, reject))

const host = ref(null)
let renderer, scene, camera, ro, disposed = false
let tick = null

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

async function buildFurniture () {
  scene.add(new THREE.HemisphereLight(0xffffff, 0xd9dcef, 1.6))
  const key = new THREE.DirectionalLight(0xffffff, 2.2)
  key.position.set(3, 5, 4)
  scene.add(key)
  const rim = new THREE.DirectionalLight(0xffffff, 0.8)
  rim.position.set(-4, 3, -3)
  scene.add(rim)

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
  return (t) => {
    for (const it of items) {
      const x = ((it.offset + t * speed) % track + track) % track - track / 2
      it.slot.position.x = x
    }
  }
}

const BUILDERS = {
  chess: () => buildChess({ scene, camera, renderer }),
  drone: () => buildDrone({ scene, camera, renderer }),
  furniture: buildFurniture
}

function renderOnce () {
  if (renderer) renderer.render(scene, camera)
}

useHoverClock(() => props.active, (t, dt) => {
  if (!tick) return
  tick(t, dt)
  renderOnce()
})

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

onMounted(async () => {
  const el = host.value
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
  renderer.outputColorSpace = THREE.SRGBColorSpace
  el.appendChild(renderer.domElement)

  scene = new THREE.Scene()
  camera = new THREE.PerspectiveCamera(30, 2, 0.1, 100)

  ro = new ResizeObserver(resize)
  ro.observe(el)
  resize()

  let built
  try {
    built = await BUILDERS[props.kind]()
  } catch (err) {
    console.warn('Project preview failed to load', err)
    return
  }
  if (disposed) return
  tick = built
  tick(0, 0)
  renderOnce()
})

onBeforeUnmount(() => {
  disposed = true
  ro?.disconnect()
  scene?.traverse((o) => {
    o.geometry?.dispose?.()
    const mats = Array.isArray(o.material) ? o.material : o.material ? [o.material] : []
    mats.forEach((m) => { m.map?.dispose?.(); m.dispose?.() })
  })
  if (scene?.environment) scene.environment.dispose()
  if (scene?.background?.isTexture) scene.background.dispose()
  renderer?.dispose()
  renderer?.forceContextLoss()
  renderer?.domElement.remove()
})
</script>

<style scoped>
.pp3d { position: absolute; inset: 0; }
.pp3d :deep(canvas) { width: 100% !important; height: 100% !important; display: block; }
</style>
