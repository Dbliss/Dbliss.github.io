<template>
  <article>
    <!-- Back link -->
    <RouterLink
      to="/projects"
      class="btn"
      style="margin-bottom:14px;display:inline-block"
    >
      ← Back to projects
    </RouterLink>

    <!-- Hero: intro + 3D viewer -->
    <section class="card hero">
      <div class="section-label">3D · WebGL · Interaction</div>
      <h1 class="hero-title">{{ project?.title ?? 'Classic 3D Chessboard' }}</h1>

      <div class="tags hero-tags" v-if="project?.tags?.length">
        <span class="tag" v-for="t in project.tags" :key="t">{{ t }}</span>
      </div>

      <div class="hero-meta mono">
        <strong>Stack:</strong>
        {{ project?.stack?.length ? project.stack.join(' · ') : 'Vue · Three.js · glTF/GLB' }}
      </div>

      <div class="hero-grid">
        <!-- Left: text -->
        <div class="hero-copy">
          <p class="hero-summary">
            This page renders a free Sketchfab chess set exported as a <strong>GLB</strong> and prepares the scene graph for
            interaction (selection, drag & drop, snap-to-square).
          </p>

          <p class="hero-summary">
            The model is loaded from <span class="mono">src/assets/chessboard/classic_chessboard.glb</span>.
            The viewer auto-centers and scales the asset, and supports click selection via raycasting.
          </p>

          <div class="hero-actions">
            <button class="btn" type="button" @click="resetCamera" :disabled="!ready">
              Reset camera
            </button>
            <button class="btn secondary" type="button" @click="toggleAutoRotate" :disabled="!ready">
              {{ autoRotate ? 'Stop rotate' : 'Auto rotate' }}
            </button>
          </div>

          <div class="info-block">
            <div class="info-line">
              <strong>Status:</strong>
              <span>{{ statusText }}</span>
            </div>
            <div class="info-line">
              <strong>Selected:</strong>
              <span class="mono">{{ selectedLabel }}</span>
            </div>
            <div class="info-line">
              <strong>Controls:</strong>
              <span>Drag = orbit · Wheel = zoom · Right drag = pan · Click = select</span>
            </div>
          </div>

          <div class="warn" v-if="warning">
            {{ warning }}
          </div>
        </div>

        <!-- Right: 3D viewer -->
        <div class="hero-viewer">
          <div class="viewer-frame" ref="containerRef">
            <canvas ref="canvasRef" class="viewer-canvas" />

            <!-- overlay -->
            <div class="viewer-overlay" v-if="loading || error">
              <div v-if="loading" class="overlay-card">
                <div class="overlay-title">Loading model…</div>
                <div class="overlay-bar">
                  <div class="overlay-bar-fill" :style="{ width: `${Math.round(progress * 100)}%` }"></div>
                </div>
                <div class="overlay-sub mono">{{ Math.round(progress * 100) }}%</div>
              </div>

              <div v-else class="overlay-card error">
                <div class="overlay-title">Failed to load GLB</div>
                <div class="overlay-sub mono">{{ error }}</div>
              </div>
            </div>
          </div>

          <div class="viewer-caption mono">
            Asset: <span class="mono">classic_chessboard.glb</span>
          </div>
        </div>
      </div>
    </section>

    <!-- Second row: implementation notes -->
    <section class="row grid cols-2">
      <section class="card">
        <div class="section-label">Implementation notes</div>
        <h2 class="section-title small">What this page gets right</h2>
        <ul class="bullets">
          <li>Auto-centers and scales the GLB so you don’t hand-tune camera positions per model.</li>
          <li>Disposes materials/geometries on unmount to avoid GPU memory leaks.</li>
          <li>Click selection uses raycasting and highlights a “selection root” for clean piece-level interaction.</li>
        </ul>

        <div class="callout">
          If selection feels “random”, it’s because Sketchfab exports often have deep nested meshes.
          You’ll want to tweak <span class="mono">getSelectionRoot()</span> to match your piece naming.
        </div>
      </section>

      <section class="card">
        <div class="section-label">Interaction roadmap</div>
        <h2 class="section-title small">Next steps (clean + robust)</h2>
        <ol class="pipeline-list">
          <li>Define square coordinates + invisible square colliders for reliable snapping.</li>
          <li>Assign each piece an ID in <span class="mono">userData</span> (e.g., <span class="mono">w_pawn_1</span>).</li>
          <li>On drag: move piece on a plane, then snap to nearest square.</li>
          <li>Validate moves with a chess rules engine (e.g., chess.js) before committing.</li>
        </ol>
      </section>
    </section>
  </article>
</template>

<script setup>
import { RouterLink } from 'vue-router'
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

// Three.js
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

// Vite: import as URL so loader can fetch it
import chessboardUrl from '../assets/chessboard/classic_chessboard.glb?url'

defineProps({
  project: {
    type: Object,
    required: false
  }
})

/**
 * UI state
 */
const canvasRef = ref(null)
const containerRef = ref(null)

const loading = ref(true)
const progress = ref(0)
const error = ref('')
const warning = ref('')

const ready = ref(false)
const autoRotate = ref(false)

const selectedObject = ref(null)
const selectedLabel = computed(() => selectedObject.value?.name || selectedObject.value?.uuid || '—')

const statusText = computed(() => {
  if (error.value) return 'error'
  if (loading.value) return 'loading'
  if (ready.value) return 'ready'
  return 'idle'
})

/**
 * Three.js internals
 */
let renderer = null
let scene = null
let camera = null
let controls = null
let loader = null

let root = null // gltf.scene
let raf = 0

const raycaster = new THREE.Raycaster()
const pointer = new THREE.Vector2()

// Track highlighted materials so we can revert cleanly.
const highlightState = new Map() // material.uuid -> { emissive: Color|null, color: Color|null }

/**
 * Init / teardown
 */
onMounted(() => {
  initThree()
  loadModel()
  startLoop()
  window.addEventListener('resize', onResize, { passive: true })
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', onResize)
  stopLoop()
  disposeScene()
})

function initThree() {
  const canvas = canvasRef.value
  const container = containerRef.value
  if (!canvas || !container) {
    error.value = 'Missing canvas/container refs.'
    return
  }

  // Renderer
  renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true
  })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
  renderer.setSize(container.clientWidth, container.clientHeight)
  renderer.outputColorSpace = THREE.SRGBColorSpace

  // Scene
  scene = new THREE.Scene()
  scene.background = new THREE.Color(0x0b1020)

  // Camera
  camera = new THREE.PerspectiveCamera(
    45,
    container.clientWidth / container.clientHeight,
    0.01,
    500
  )
  camera.position.set(0, 3.8, 6.2)

  // Controls
  controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.dampingFactor = 0.06
  controls.target.set(0, 1.0, 0)

  // Lights (simple but good defaults for PBR)
  const hemi = new THREE.HemisphereLight(0xffffff, 0x223355, 0.7)
  scene.add(hemi)

  const dir = new THREE.DirectionalLight(0xffffff, 1.05)
  dir.position.set(6, 10, 6)
  dir.castShadow = false
  scene.add(dir)

  // Pointer selection
  renderer.domElement.addEventListener('pointerdown', onPointerDown, { passive: true })

  // Loader
  loader = new GLTFLoader()
}

function loadModel() {
  loading.value = true
  error.value = ''
  progress.value = 0
  ready.value = false
  warning.value = ''

  loader.load(
    chessboardUrl,
    (gltf) => {
      // Remove previous model if any
      if (root) {
        scene.remove(root)
        disposeObject3D(root)
      }

      root = gltf.scene
      root.traverse((o) => {
        if (o.isMesh) {
          // Sketchfab exports sometimes come with huge drawcalls; keep it stable:
          o.frustumCulled = true
          // If you later drag pieces, turn this off on those specific meshes:
          // o.matrixAutoUpdate = true
        }
      })

      scene.add(root)

      // Fit & center
      fitCameraToObject(root)

      loading.value = false
      ready.value = true

      // Mild warning if model is heavy (heuristic)
      const meshCount = countMeshes(root)
      if (meshCount > 200) {
        warning.value = `Model is quite heavy (${meshCount} meshes). If interaction/drag feels laggy, consider reducing materials/meshes or using a 1k texture export.`
      }
    },
    (evt) => {
      if (!evt || !evt.total) return
      progress.value = Math.min(1, evt.loaded / evt.total)
    },
    (e) => {
      loading.value = false
      error.value = e?.message || String(e)
    }
  )
}

function startLoop() {
  const tick = () => {
    raf = requestAnimationFrame(tick)
    if (!renderer || !scene || !camera || !controls) return

    controls.autoRotate = autoRotate.value
    controls.autoRotateSpeed = 0.8
    controls.update()

    renderer.render(scene, camera)
  }
  tick()
}

function stopLoop() {
  if (raf) cancelAnimationFrame(raf)
  raf = 0
}

/**
 * Sizing
 */
function onResize() {
  if (!renderer || !camera || !containerRef.value) return
  const w = containerRef.value.clientWidth
  const h = containerRef.value.clientHeight
  renderer.setSize(w, h)
  camera.aspect = w / h
  camera.updateProjectionMatrix()
}

/**
 * Fit model to view
 */
function fitCameraToObject(obj) {
  const box = new THREE.Box3().setFromObject(obj)
  const size = box.getSize(new THREE.Vector3())
  const center = box.getCenter(new THREE.Vector3())

  // guard: empty box (bad export)
  if (!isFinite(size.x + size.y + size.z)) return

  // Frame the model
  const maxDim = Math.max(size.x, size.y, size.z)
  const fov = camera.fov * (Math.PI / 180)
  let distance = maxDim / (2 * Math.tan(fov / 2))
  distance *= 1.35 // margin

  // Position camera and controls target
  controls.target.copy(center)
  camera.position.set(center.x, center.y + maxDim * 0.35, center.z + distance)
  camera.near = Math.max(0.01, distance / 100)
  camera.far = Math.max(500, distance * 4)
  camera.updateProjectionMatrix()
  controls.update()
}

/**
 * Selection (raycast)
 */
function onPointerDown(ev) {
  if (!ready.value || !renderer || !camera || !root) return

  const rect = renderer.domElement.getBoundingClientRect()
  const x = (ev.clientX - rect.left) / rect.width
  const y = (ev.clientY - rect.top) / rect.height
  pointer.x = x * 2 - 1
  pointer.y = -(y * 2 - 1)

  raycaster.setFromCamera(pointer, camera)
  const hits = raycaster.intersectObject(root, true)
  if (!hits.length) {
    clearHighlight()
    selectedObject.value = null
    return
  }

  // Pick the closest mesh
  const mesh = hits[0].object
  const selectionRoot = getSelectionRoot(mesh)

  selectedObject.value = selectionRoot
  clearHighlight()
  applyHighlight(selectionRoot)
}

/**
 * This is the *one* function you’ll likely tweak.
 * Sketchfab GLBs often nest meshes deeply. Ideally each piece is grouped under a node.
 */
function getSelectionRoot(mesh) {
  let cur = mesh

  // Heuristic: climb until you hit a named group (not just "Object_12") or a direct child of root
  while (cur && cur.parent && cur.parent !== root) {
    const n = (cur.name || '').toLowerCase()
    const parentName = (cur.parent?.name || '').toLowerCase()

    // If your model has piece names like "white_king", "b_pawn", etc, this helps:
    const looksLikePiece =
      /(king|queen|rook|bishop|knight|pawn)/.test(n) ||
      /(king|queen|rook|bishop|knight|pawn)/.test(parentName)

    if (looksLikePiece) return cur.parent // usually parent node is the piece
    cur = cur.parent
  }

  return cur || mesh
}

function applyHighlight(obj) {
  obj.traverse((o) => {
    if (!o.isMesh || !o.material) return

    const mats = Array.isArray(o.material) ? o.material : [o.material]
    for (const m of mats) {
      if (!m || !m.isMaterial) continue

      // Save original state once
      if (!highlightState.has(m.uuid)) {
        highlightState.set(m.uuid, {
          emissive: m.emissive ? m.emissive.clone() : null,
          color: m.color ? m.color.clone() : null
        })
      }

      // Prefer emissive highlight (doesn't fight albedo textures too much)
      if (m.emissive) {
        m.emissive.setHex(0x2f6bff)
      } else if (m.color) {
        // fallback
        m.color.offsetHSL(0.0, 0.0, 0.12)
      }
      m.needsUpdate = true
    }
  })
}

function clearHighlight() {
  if (!root) return
  root.traverse((o) => {
    if (!o.isMesh || !o.material) return
    const mats = Array.isArray(o.material) ? o.material : [o.material]
    for (const m of mats) {
      const saved = highlightState.get(m.uuid)
      if (!saved) continue
      if (m.emissive && saved.emissive) m.emissive.copy(saved.emissive)
      if (m.color && saved.color) m.color.copy(saved.color)
      m.needsUpdate = true
    }
  })
  highlightState.clear()
}

/**
 * Buttons
 */
function resetCamera() {
  if (!root || !camera || !controls) return
  clearHighlight()
  selectedObject.value = null
  fitCameraToObject(root)
}

function toggleAutoRotate() {
  autoRotate.value = !autoRotate.value
}

/**
 * Disposal (important)
 */
function disposeScene() {
  if (renderer?.domElement) {
    renderer.domElement.removeEventListener('pointerdown', onPointerDown)
  }

  if (root) {
    scene?.remove(root)
    disposeObject3D(root)
    root = null
  }

  if (renderer) {
    renderer.dispose()
    renderer = null
  }

  scene = null
  camera = null
  controls?.dispose()
  controls = null
  loader = null
  highlightState.clear()
}

function disposeObject3D(obj) {
  obj.traverse((o) => {
    if (o.isMesh) {
      if (o.geometry) o.geometry.dispose()

      const mats = Array.isArray(o.material) ? o.material : [o.material]
      for (const m of mats) {
        if (!m) continue
        // dispose textures if present
        for (const k of Object.keys(m)) {
          const v = m[k]
          if (v && v.isTexture) v.dispose()
        }
        m.dispose?.()
      }
    }
  })
}

function countMeshes(obj) {
  let n = 0
  obj.traverse((o) => {
    if (o.isMesh) n++
  })
  return n
}
</script>

<style scoped>
.hero {
  margin-bottom: 16px;
}

.hero-grid {
  display: grid;
  grid-template-columns: minmax(0, 9fr) minmax(0, 7fr);
  gap: 20px;
  align-items: stretch;
}

.hero-copy {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.hero-title {
  margin: 4px 0 8px;
}

.hero-tags {
  margin: 10px 0 12px;
}

.hero-meta {
  font-size: 0.9rem;
  color: var(--muted);
}

.hero-summary {
  color: var(--muted);
}

.hero-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin-top: 8px;
}

.hero-actions .secondary {
  opacity: 0.9;
}

.info-block {
  margin-top: 10px;
  padding: 10px;
  border-radius: 10px;
  border: 1px solid var(--border-subtle, rgba(255,255,255,0.12));
  background: rgba(255,255,255,0.03);
  color: var(--muted);
}

.info-line {
  display: flex;
  gap: 10px;
  align-items: baseline;
  margin: 6px 0;
}

.warn {
  margin-top: 10px;
  padding: 10px;
  border-radius: 10px;
  border: 1px solid rgba(255, 180, 0, 0.25);
  background: rgba(255, 180, 0, 0.08);
  color: rgba(255, 220, 160, 0.95);
}

.hero-viewer {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.viewer-frame {
  position: relative;
  border-radius: 10px;
  overflow: hidden;
  border: 1px solid var(--border-subtle, #333);
  background: radial-gradient(circle at top left, rgba(255, 255, 255, 0.05), transparent);
  height: 420px;
  width: 100%;
}

.viewer-canvas {
  width: 100%;
  height: 100%;
  display: block;
}

.viewer-overlay {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  background: rgba(10, 16, 32, 0.55);
  backdrop-filter: blur(6px);
}

.overlay-card {
  width: min(320px, 88%);
  border-radius: 12px;
  border: 1px solid rgba(231, 238, 252, 0.18);
  background: rgba(10, 16, 32, 0.85);
  padding: 12px;
}

.overlay-card.error {
  border-color: rgba(255, 80, 80, 0.25);
}

.overlay-title {
  font-weight: 700;
  margin-bottom: 8px;
}

.overlay-sub {
  opacity: 0.9;
  font-size: 0.9rem;
}

.overlay-bar {
  height: 10px;
  border-radius: 999px;
  overflow: hidden;
  border: 1px solid rgba(231, 238, 252, 0.15);
  background: rgba(255,255,255,0.06);
  margin: 8px 0 6px;
}

.overlay-bar-fill {
  height: 100%;
  background: rgba(60, 120, 255, 0.85);
}

.viewer-caption {
  opacity: 0.85;
  color: var(--muted);
  font-size: 0.85rem;
}

.row {
  margin-top: 18px;
}

.section-title.small {
  font-size: 1.05rem;
  margin: 6px 0 10px;
}

.bullets {
  padding-left: 20px;
  color: var(--muted);
  line-height: 1.5;
  margin: 8px 0;
}

.callout {
  margin-top: 12px;
  padding: 10px;
  border-radius: 10px;
  border: 1px solid var(--border-subtle, rgba(255,255,255,0.12));
  background: rgba(255,255,255,0.03);
  color: var(--muted);
}

.pipeline-list {
  padding-left: 20px;
  color: var(--muted);
  line-height: 1.5;
  margin: 8px 0;
}

.mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
}

@media (max-width: 900px) {
  .hero-grid {
    grid-template-columns: 1fr;
  }

  .viewer-frame {
    height: 360px;
  }
}
</style>
