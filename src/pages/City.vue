<template>
  <div class="city-root" ref="rootEl">
    <!-- WebGL fallback -->
    <div v-if="webglFailed" class="city-fallback">
      <div class="section-label">Welcome</div>
      <h1>Dillon Bliss</h1>
      <p class="section-sub">
        Mechatronic Engineer working as a Full-Stack Developer in Sydney.
        The interactive city needs WebGL — here are the quick links instead.
      </p>
      <div class="fallback-links">
        <RouterLink class="btn primary" to="/projects">View projects</RouterLink>
        <RouterLink class="btn" to="/about">About me</RouterLink>
        <RouterLink class="btn" to="/contact">Contact</RouterLink>
      </div>
    </div>

    <template v-else>
      <canvas ref="canvasEl" class="city-canvas" />

      <!-- floating landmark chips -->
      <div class="chip-layer" :class="{ dimmed: focusedMeta }" aria-hidden="false">
        <button
          v-for="lm in landmarkMeta"
          :key="lm.key"
          class="chip"
          :class="{ active: hoveredKey === lm.key || navTargetKey === lm.key }"
          :ref="(el) => setChipRef(lm.key, el)"
          :style="{ '--chip-color': lm.cssColor }"
          @pointerenter="hoveredKey = lm.key"
          @pointerleave="hoveredKey === lm.key && (hoveredKey = null)"
          @click.stop="activateByKey(lm.key)"
        >
          <span class="chip-dot" />
          <span class="chip-text">
            <span class="chip-label">{{ lm.label }}</span>
            <span class="chip-sub">{{ lm.sub }}</span>
          </span>
        </button>
      </div>

      <!-- vehicle carousel -->
      <div class="vehicle-picker" aria-label="Select vehicle">
        <button
          v-for="option in vehicleOptions"
          :key="option.key"
          class="vehicle-choice"
          :class="{ selected: vehicleIndex === option.index }"
          :aria-label="`Select ${option.label}`"
          :aria-pressed="vehicleIndex === option.index"
          @click="selectVehicleIndex(option.index)"
        >
          <img v-if="option.image" :src="option.image" :alt="option.label" />
          <span v-else class="vehicle-image-loading" aria-hidden="true" />
        </button>
      </div>

      <div v-if="vehicleIndex === 1 && !gameOver" class="pursuit-hud">
        <span>WANTED</span>
        <strong>{{ policeCount }} cops</strong>
        <small>{{ Math.floor(pursuitTime) }}s survived</small>
      </div>
      <div v-if='vehicleIndex === 1 && !gameOver && policeThreats.length' class='cop-proximity' aria-hidden='true'>
        <span v-for='threat in policeThreats' :key='threat.id' class='cop-proximity-arc' :style='threat.style' />
      </div>

      <transition name="panel">
        <div v-if="gameOver" class="game-over">
          <div class="game-over-card">
            <span class="game-over-kicker">BUSTED</span>
            <h2>Game over</h2>
            <p>You survived {{ Math.floor(pursuitTime) }} seconds against {{ policeCount }} cops.</p>
            <button class="btn primary" @click="restartPursuit">Restart pursuit</button>
            <button class="btn" @click="selectVehicleIndex(0)">Return to free drive</button>
          </div>
        </div>
      </transition>

      <!-- landmark detail panel -->
      <transition name="panel">
        <aside v-if="focusedMeta" class="city-panel" :style="{ '--chip-color': focusedMeta.cssColor }">
          <div class="panel-kicker">
            <span class="chip-dot" />
            {{ focusedMeta.kicker }}
          </div>
          <h2 class="panel-title">{{ focusedMeta.title }}</h2>
          <p class="panel-tagline">{{ focusedMeta.tagline }}</p>
          <p v-if="focusedMeta.excerpt" class="panel-excerpt">{{ focusedMeta.excerpt }}</p>
          <div v-if="focusedMeta.stack.length" class="panel-stack">
            <span v-for="s in focusedMeta.stack" :key="s" class="stack-chip">{{ s }}</span>
          </div>
          <div class="panel-actions">
            <button class="btn primary" @click="openFocusedRoute">{{ focusedMeta.cta }} →</button>
            <button class="btn" @click="resumeDrive">Keep driving</button>
          </div>
        </aside>
      </transition>

      <!-- controls hint -->
      <div class="city-hint" :class="{ hidden: hintHidden || focusedMeta }">
        <template v-if="vehicleIndex === 2">
          <span class="hint-key">W A S D</span> to fly ·
          <span class="hint-key">SPACE / E</span> up ·
          <span class="hint-key">SHIFT / Q</span> down
        </template>
        <template v-else>
          <span class="hint-key">W A S D</span> to drive ·
          drive into a landmark to open it ·
          <span class="hint-key">M</span> for the map
        </template>
      </div>

      <!-- minimap -->
      <div class="minimap" :class="{ expanded: mapExpanded }">
        <div v-if="navTargetLabel" class="map-route" @click="clearDirections">
          → {{ navTargetLabel }} <span class="map-route-x">✕</span>
        </div>
        <div class="map-frame">
          <canvas ref="mapEl" />
          <button
            class="map-toggle"
            :title="mapExpanded ? 'Collapse map' : 'Expand map'"
            @click.stop="mapExpanded = !mapExpanded"
          >
            {{ mapExpanded ? '✕' : '⛶' }}
          </button>
          <div v-if="mapExpanded" class="map-hint">Click a landmark for directions</div>
        </div>
      </div>

      <!-- touch driving controls (coarse pointers only, via CSS) -->
      <div class="touch-controls" :class="{ drone: vehicleIndex === 2 }">
        <button
          v-for="btn in visibleTouchButtons"
          :key="btn.k"
          class="touch-btn"
          :class="btn.k"
          @pointerdown.prevent="setTouch(btn.k, true)"
          @pointerup="setTouch(btn.k, false)"
          @pointerleave="setTouch(btn.k, false)"
          @pointercancel="setTouch(btn.k, false)"
        >
          {{ btn.glyph }}
        </button>
      </div>

      <!-- transition veil for fly-in -->
      <div class="city-veil" :class="{ shown: veilShown }" />
    </template>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref, shallowRef } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import * as THREE from 'three'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js'
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js'
import { N8AOPass } from 'n8ao'
import { asset, buildCity, loadGLB } from '../city/cityScene'
import { createPlayerCar, createPoliceCar } from '../city/playerCar'
import { createNavigator } from '../city/navigation'
import { projects } from '../data/projects'

const router = useRouter()

const rootEl = ref(null)
const canvasEl = ref(null)
const mapEl = ref(null)
const webglFailed = ref(false)
const hoveredKey = ref(null)
const hintHidden = ref(false)
const veilShown = ref(false)
const focusedKey = ref(null)
const mapExpanded = ref(false)
const navTargetKey = ref(null)
const vehicleIndex = ref(0)
const gameOver = ref(false)
const pursuitTime = ref(0)
const policeCount = ref(0)
const policeThreats = ref([])

const vehicleOptions = reactive([
  { index: 0, key: 'basic', label: 'Street car', model: 'models/kenney/cars/sedan-sports.glb', image: '' },
  { index: 1, key: 'black', label: 'Blackout car', model: 'models/kenney/cars/sedan-sports.glb', dark: true, image: '' },
  { index: 2, key: 'drone', label: 'Drone', model: 'models/drone.glb', drone: true, image: '' }
])

async function renderVehicleImage(option) {
  const gltf = await loadGLB(asset(option.model))
  const model = gltf.scene.clone(true)
  model.traverse((object) => {
    if (!object.isMesh) return
    const materials = Array.isArray(object.material) ? object.material : [object.material]
    const cloned = materials.map((material) => {
      const next = material.clone()
      if (option.dark && next.color) next.color.multiplyScalar(0.06)
      if (option.dark && next.emissive) next.emissive.multiplyScalar(0.12)
      if ('metalness' in next) next.metalness = Math.max(next.metalness || 0, option.dark ? 0.72 : 0.35)
      if ('roughness' in next) next.roughness = option.dark ? 0.2 : 0.3
      return next
    })
    object.material = Array.isArray(object.material) ? cloned : cloned[0]
  })

  const previewScene = new THREE.Scene()
  const rig = new THREE.Group()
  rig.add(model)
  previewScene.add(rig)
  const box = new THREE.Box3().setFromObject(model)
  const center = box.getCenter(new THREE.Vector3())
  const size = box.getSize(new THREE.Vector3())
  model.position.sub(center)
  rig.scale.setScalar(4.8 / Math.max(size.x, size.y, size.z))
  rig.rotation.y = option.drone ? -0.55 : -0.72

  previewScene.add(new THREE.HemisphereLight(0xdde7ff, 0x101525, 2.8))
  const key = new THREE.DirectionalLight(0xffffff, 4.2)
  key.position.set(-4, 7, 6)
  previewScene.add(key)
  const rim = new THREE.DirectionalLight(option.dark ? 0x7b8cff : 0x86d8ff, 2.2)
  rim.position.set(6, 2, -5)
  previewScene.add(rim)

  const camera = new THREE.PerspectiveCamera(28, 1.8, 0.1, 50)
  camera.position.set(6.5, option.drone ? 4.5 : 3.6, 8)
  camera.lookAt(0, 0, 0)
  const preview = new THREE.WebGLRenderer({ alpha: true, antialias: true, preserveDrawingBuffer: true })
  preview.setPixelRatio(1)
  preview.setSize(180, 100, false)
  preview.outputColorSpace = THREE.SRGBColorSpace
  preview.toneMapping = THREE.ACESFilmicToneMapping
  preview.toneMappingExposure = 1.35
  preview.setClearColor(0x000000, 0)
  preview.render(previewScene, camera)
  const image = preview.domElement.toDataURL('image/png')
  preview.dispose()
  preview.forceContextLoss()
  return image
}

async function populateVehicleImages() {
  for (const option of vehicleOptions) {
    try {
      option.image = await renderVehicleImage(option)
    } catch (error) {
      console.error(`vehicle preview failed: ${option.key}`, error)
    }
  }
}

function selectVehicleIndex(index) {
  vehicleIndex.value = index
  three.value?.selectVehicle(index)
}

function restartPursuit() {
  three.value?.restartPursuit()
}

const touchButtons = [
  { k: 'forward', glyph: '▲' },
  { k: 'left', glyph: '◀' },
  { k: 'back', glyph: '▼' },
  { k: 'right', glyph: '▶' },
  { k: 'ascend', glyph: 'UP' },
  { k: 'descend', glyph: 'DN' }
]
const visibleTouchButtons = computed(() => vehicleIndex.value === 2 ? touchButtons : touchButtons.slice(0, 4))

const landmarkMeta = reactive([])
const chipEls = new Map()
function setChipRef(key, el) {
  if (el) chipEls.set(key, el)
  else chipEls.delete(key)
}

const prefersReducedMotion =
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

// ---- landmark detail content ------------------------------------------------
const projectBySlug = Object.fromEntries(projects.map((p) => [p.slug, p]))
const customDetails = {
  hq: {
    title: 'Dillon Bliss',
    tagline: 'Mechatronic engineer · Full-stack developer · Sydney',
    excerpt:
      'This city is my portfolio — every district is a real project. Start here to learn who I am, my experience, and what I have shipped.',
    stack: ['Vue', 'Node.js', 'Python', 'C++', 'PostgreSQL'],
    cta: 'About me'
  },
  contact: {
    title: 'Get in touch',
    tagline: 'Open to interesting problems and good coffee',
    excerpt:
      'Want to talk engineering, full-stack work, or one of the projects in this city? The comms tower is always listening.',
    stack: [],
    cta: 'Contact'
  }
}

function detailForKey(key) {
  const lm = landmarkMeta.find((m) => m.key === key)
  if (!lm) return null
  const slug = lm.route.startsWith('/projects/') ? lm.route.split('/')[2] : null
  const p = slug ? projectBySlug[slug] : null
  const custom = customDetails[key]
  return {
    kicker: lm.label,
    cssColor: lm.cssColor,
    title: p ? p.title : custom?.title ?? lm.label,
    tagline: p ? p.tagline : custom?.tagline ?? lm.sub,
    excerpt: p ? p.excerpt : custom?.excerpt ?? '',
    stack: (p ? p.stack : custom?.stack ?? []).slice(0, 6),
    cta: p ? 'Open project' : custom?.cta ?? 'Open',
    route: lm.route
  }
}

const focusedMeta = computed(() => (focusedKey.value ? detailForKey(focusedKey.value) : null))
const navTargetLabel = computed(
  () => landmarkMeta.find((m) => m.key === navTargetKey.value)?.label ?? null
)

// three.js state kept out of Vue reactivity
const three = shallowRef(null)
let rafId = 0
let disposed = false

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}

onMounted(() => {
  void populateVehicleImages()
  let renderer
  try {
    renderer = new THREE.WebGLRenderer({
      canvas: canvasEl.value,
      antialias: true,
      powerPreference: 'high-performance'
    })
  } catch (e) {
    webglFailed.value = true
    return
  }

  const width = rootEl.value.clientWidth
  const height = rootEl.value.clientHeight
  renderer.setSize(width, height)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75))
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.28
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap

  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(55, width / height, 0.5, 2000)
  camera.position.set(260, 190, 260)

  // night HDRI (Poly Haven, CC0) for image-based lighting + wet reflections
  let envTex = null
  new RGBELoader().load(`${import.meta.env.BASE_URL}textures/night_1k.hdr`, (tex) => {
    tex.mapping = THREE.EquirectangularReflectionMapping
    envTex = tex
    scene.environment = tex
    scene.environmentIntensity = 0.6
  })

  const { landmarks, update, layout, colliders, cars, isOnRoad, cityHalf } = buildCity(scene)
  for (const lm of landmarks) {
    landmarkMeta.push({
      key: lm.key,
      label: lm.label,
      sub: lm.sub,
      route: lm.route,
      cssColor: '#' + new THREE.Color(lm.color).getHexString()
    })
  }

  const player = createPlayerCar(scene, { colliders, cars, isOnRoad, cityHalf })
  const navigator = createNavigator(scene, layout)
  const policeCars = []
  let policeSpawnTimer = 0

  // post-processing: N8AO renders the scene with ambient occlusion baked in
  // (contact shadows ground the props), then bloom makes the night city glow
  const composer = new EffectComposer(renderer)
  const n8ao = new N8AOPass(scene, camera, width, height)
  n8ao.configuration.aoRadius = 2.6
  n8ao.configuration.distanceFalloff = 5.2
  n8ao.configuration.intensity = 3.2
  n8ao.configuration.gammaCorrection = false
  n8ao.setQualityMode('Medium')
  composer.addPass(n8ao)
  const bloom = new UnrealBloomPass(new THREE.Vector2(width, height), 0.3, 0.6, 0.66)
  composer.addPass(bloom)
  composer.addPass(new OutputPass())

  const raycaster = new THREE.Raycaster()
  const pointer = new THREE.Vector2(2, 2) // off-screen until first move
  let pointerInside = false
  let downPos = null

  const hitMeshes = landmarks.map((l) => l.hitMesh)
  const landmarkByKey = new Map(landmarks.map((l) => [l.key, l]))

  // ------- driving input -------
  const input = { forward: false, back: false, left: false, right: false, ascend: false, descend: false }
  const KEYMAP = {
    KeyW: 'forward',
    ArrowUp: 'forward',
    KeyS: 'back',
    ArrowDown: 'back',
    KeyA: 'left',
    ArrowLeft: 'left',
    KeyD: 'right',
    ArrowRight: 'right',
    Space: 'ascend',
    KeyE: 'ascend',
    ShiftLeft: 'descend',
    ShiftRight: 'descend',
    KeyQ: 'descend'
  }

  // ------- camera state machine -------
  // intro (fly down to the car) → drive (chase cam) ⇄ focus (panel open)
  let mode = 'intro'
  let navigating = false // route push in progress
  let tween = null
  let latchedKey = null // POI whose trigger circle we're still inside
  const camTarget = new THREE.Vector3(0, 10, 0)
  const focusOffset = new THREE.Vector3()
  const cameraColliders = colliders.filter((collider) => collider.camera)

  function cameraObstruction(start, end) {
    const dx = end.x - start.x
    const dz = end.z - start.z
    let first = 1
    for (const collider of cameraColliders) {
      if (collider.type === 'box') {
        const cos = Math.cos(collider.ry || 0)
        const sin = Math.sin(collider.ry || 0)
        const sx = cos * (start.x - collider.x) - sin * (start.z - collider.z)
        const sz = sin * (start.x - collider.x) + cos * (start.z - collider.z)
        const vx = cos * dx - sin * dz
        const vz = sin * dx + cos * dz
        const ex = collider.hx + 0.9
        const ez = collider.hz + 0.9
        let enter = 0
        let exit = 1
        for (const [origin, delta, extent] of [[sx, vx, ex], [sz, vz, ez]]) {
          if (Math.abs(delta) < 1e-6) {
            if (Math.abs(origin) > extent) enter = 2
            continue
          }
          let a = (-extent - origin) / delta
          let b = (extent - origin) / delta
          if (a > b) [a, b] = [b, a]
          enter = Math.max(enter, a)
          exit = Math.min(exit, b)
        }
        if (enter <= exit && enter > 0.04 && enter < first) first = enter
      } else {
        const radius = collider.r + 0.9
        const ox = start.x - collider.x
        const oz = start.z - collider.z
        const a = dx * dx + dz * dz
        const b = 2 * (ox * dx + oz * dz)
        const c = ox * ox + oz * oz - radius * radius
        const discriminant = b * b - 4 * a * c
        if (discriminant < 0 || a < 1e-6) continue
        const hit = (-b - Math.sqrt(discriminant)) / (2 * a)
        if (hit > 0.04 && hit < first) first = hit
      }
    }
    return first
  }

  function keepChaseCameraClear(position) {
    const start = player.group.position
    if (player.state.vehicle === 'drone') {
      position.y = Math.max(position.y, start.y + 7)
      return position
    }
    const hit = cameraObstruction(start, position)
    if (hit < 1) {
      const safeT = Math.max(0.18, hit - 0.08)
      position.x = THREE.MathUtils.lerp(start.x, position.x, safeT)
      position.z = THREE.MathUtils.lerp(start.z, position.z, safeT)
    }
    position.y = Math.max(position.y, start.y + 7.6)
    return position
  }

  function startTween(toPos, toTarget, duration, onDone) {
    const dist = camera.position.distanceTo(toPos)
    tween = {
      fromPos: camera.position.clone(),
      toPos: toPos.clone(),
      fromTarget: camTarget.clone(),
      toTarget: toTarget.clone(),
      t: 0,
      duration,
      arc: THREE.MathUtils.clamp(dist * 0.25, 2, 45),
      onDone
    }
  }

  /** Where the chase camera wants to sit right now. */
  function chasePose() {
    const p = player.group.position
    const dirX = Math.sin(player.state.heading)
    const dirZ = Math.cos(player.state.heading)
    const speed = Math.abs(player.state.speed)
    const flying = player.state.vehicle === 'drone'
    const back = (flying ? 11.5 : 10.8) + speed * 0.09
    return {
      pos: keepChaseCameraClear(
        new THREE.Vector3(
          p.x - dirX * back,
          (flying ? p.y + 7 : 7.6) + speed * 0.045,
          p.z - dirZ * back
        )
      ),
      target: new THREE.Vector3(p.x + dirX * 7, flying ? p.y : 2.45, p.z + dirZ * 7)
    }
  }

  function clearPolice() {
    for (const police of policeCars) scene.remove(police.group)
    policeCars.length = 0
    policeCount.value = 0
    policeThreats.value = []
  }

  function spawnPolice() {
    const angle = Math.random() * Math.PI * 2
    const distance = 46 + Math.random() * 18
    const desiredX = player.group.position.x + Math.cos(angle) * distance
    const desiredZ = player.group.position.z + Math.sin(angle) * distance
    const spawnNode = layout.nodes
      .map((node) => ({
        node,
        score: (node.x - desiredX) ** 2 + (node.z - desiredZ) ** 2 +
          policeCars.reduce((penalty, police) => {
            const d2 = (police.group.position.x - node.x) ** 2 + (police.group.position.z - node.z) ** 2
            return penalty + (d2 < 144 ? 500 : 0)
          }, 0)
      }))
      .sort((a, b) => a.score - b.score)[0]?.node
    if (!spawnNode) return
    const position = new THREE.Vector3(spawnNode.x, 0.06, spawnNode.z)
    policeCars.push(createPoliceCar(scene, position, {
      layout,
      colliders,
      cars,
      policeCars,
      isOnRoad
    }))
    policeCount.value = policeCars.length
  }

  function selectVehicle(index) {
    const option = vehicleOptions[index]
    if (!option) return
    vehicleIndex.value = index
    gameOver.value = false
    pursuitTime.value = 0
    policeSpawnTimer = 0
    clearPolice()
    clearDirections()
    focusedKey.value = null
    tween = null
    mode = 'drive'
    for (const key of Object.keys(input)) input[key] = false
    player.setVehicle(option.key)
    player.reset()
    if (option.key === 'black') {
      spawnPolice()
      spawnPolice()
    }
    const pose = chasePose()
    camera.position.copy(pose.pos)
    camTarget.copy(pose.target)
  }

  function restartPursuit() {
    selectVehicle(1)
  }

  /** Viewpoint for a landmark: outside it, looking back across it toward the city. */
  function viewFor(lm, close) {
    const dir = lm.front
      ? lm.front.clone()
      : new THREE.Vector3(lm.center.x, 0, lm.center.z)
    if (dir.lengthSq() < 1) dir.set(0.4, 0, 1)
    dir.normalize()
    const horiz = Math.max(
      lm.focusRadius * (close ? 2.3 : 2.7),
      lm.focusHeight * (close ? 1.05 : 1.2)
    )
    const pos = lm.center.clone().addScaledVector(dir, horiz)
    pos.y = lm.center.y + horiz * (close ? 0.5 : 0.6)
    return { pos, target: lm.center.clone() }
  }

  function focusLandmark(lm) {
    if (navigating || focusedKey.value === lm.key) return
    hintHidden.value = true
    mode = 'focus-fly'
    player.state.speed = 0
    if (!lm.dynamic) latchedKey = lm.key
    if (navigator.targetKey === lm.key) {
      navigator.clear()
      navTargetKey.value = null
    }
    const { pos, target } = viewFor(lm, true)
    startTween(pos, target, prefersReducedMotion ? 0.3 : 1.2, () => {
      mode = 'focus'
      focusOffset.copy(camera.position).sub(lm.center)
      focusedKey.value = lm.key
    })
  }

  function leaveFocus() {
    focusedKey.value = null
    if (mode === 'focus' || mode === 'focus-fly') {
      const { pos, target } = chasePose()
      startTween(pos, target, prefersReducedMotion ? 0.3 : 1.0, () => {
        mode = 'drive'
      })
    }
  }

  function setDirections(key) {
    const lm = landmarkByKey.get(key)
    if (!lm || navigating) return
    if (lm.dynamic) {
      // can't route to the drone — just fly the camera to it
      focusLandmark(lm)
      return
    }
    if (focusedKey.value) leaveFocus()
    if (navigator.setTarget(lm, player.group.position)) {
      navTargetKey.value = key
      hintHidden.value = true
    }
  }

  function clearDirections() {
    navigator.clear()
    navTargetKey.value = null
  }

  function goToRoute(route) {
    if (navigating) return
    navigating = true
    veilShown.value = true
    setTimeout(() => router.push(route), 420)
  }

  three.value = {
    setDirections,
    clearDirections,
    leaveFocus,
    goToRoute,
    selectVehicle,
    restartPursuit,
    input
  }

  if (import.meta.env.DEV) {
    window.__cityDebug = () => ({
      mode,
      tween: !!tween,
      car: player.group.position.toArray().map((n) => +n.toFixed(1)),
      speed: +player.state.speed.toFixed(1),
      onRoad: player.state.onRoad,
      navTarget: navigator.targetKey,
      cam: camera.position.toArray().map((n) => +n.toFixed(1))
    })
    window.__citySkip = () => {
      if (tween) tween.t = tween.duration + 1
    }
    window.__cityFocus = (key) => focusLandmark(landmarkByKey.get(key))
    window.__cityGo = (key) => setDirections(key)
    window.__cityScene = scene
    window.__cityDrive = (x, z, heading = player.state.heading) => {
      player.group.position.set(x, 0.06, z)
      player.state.heading = heading
      player.state.speed = 0
    }
    window.__cityInput = input
  }

  // ------- interaction -------
  function onKeyDown(e) {
    const k = KEYMAP[e.code]
    if (k) {
      input[k] = true
      hintHidden.value = true
      if (focusedKey.value) leaveFocus() // hit the gas to close the panel
      e.preventDefault()
    } else if (e.code === 'KeyM') {
      mapExpanded.value = !mapExpanded.value
    } else if (e.key === 'Escape') {
      if (focusedKey.value) leaveFocus()
      else if (mapExpanded.value) mapExpanded.value = false
    }
  }
  function onKeyUp(e) {
    const k = KEYMAP[e.code]
    if (k) input[k] = false
  }
  function onBlur() {
    for (const k of Object.keys(input)) input[k] = false
  }

  function onPointerMove(e) {
    const rect = canvasEl.value.getBoundingClientRect()
    pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
    pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1
    pointerInside = true
  }
  function onPointerLeave() {
    pointerInside = false
  }
  function onPointerDown(e) {
    downPos = { x: e.clientX, y: e.clientY }
  }
  function onClick(e) {
    if (!downPos) return
    const moved = Math.hypot(e.clientX - downPos.x, e.clientY - downPos.y)
    downPos = null
    if (moved > 7) return
    onPointerMove(e)
    raycaster.setFromCamera(pointer, camera)
    const hits = raycaster.intersectObjects(hitMeshes, false)
    if (hits.length) {
      setDirections(hits[0].object.userData.landmarkKey)
    } else if (mode === 'focus') {
      leaveFocus()
    }
  }

  canvasEl.value.addEventListener('pointermove', onPointerMove)
  canvasEl.value.addEventListener('pointerleave', onPointerLeave)
  canvasEl.value.addEventListener('pointerdown', onPointerDown)
  canvasEl.value.addEventListener('click', onClick)
  window.addEventListener('keydown', onKeyDown)
  window.addEventListener('keyup', onKeyUp)
  window.addEventListener('blur', onBlur)

  function onResize() {
    if (!rootEl.value) return
    const w = rootEl.value.clientWidth
    const h = rootEl.value.clientHeight
    camera.aspect = w / h
    camera.updateProjectionMatrix()
    renderer.setSize(w, h)
    composer.setSize(w, h)
  }
  window.addEventListener('resize', onResize)

  // ------- minimap -------
  const MAP_MARGIN = 74
  let mapStatic = null
  let mapStaticSize = 0

  function mapScale(size) {
    return size / (2 * (cityHalf + MAP_MARGIN))
  }

  function buildMapStatic(size) {
    const c = document.createElement('canvas')
    c.width = c.height = size
    const ctx = c.getContext('2d')
    const s = mapScale(size)
    const tm = (x, z) => [(x + cityHalf + MAP_MARGIN) * s, (z + cityHalf + MAP_MARGIN) * s]
    ctx.fillStyle = 'rgba(7, 9, 20, 0.9)'
    ctx.fillRect(0, 0, size, size)
    ctx.strokeStyle = 'rgba(125, 138, 176, 0.55)'
    ctx.lineWidth = Math.max(12 * s, 1.5)
    ctx.lineCap = 'round'
    for (const e of layout.edges) {
      const [x0, y0] = e.vertical ? tm(e.p, e.a) : tm(e.a, e.p)
      const [x1, y1] = e.vertical ? tm(e.p, e.b) : tm(e.b, e.p)
      ctx.beginPath()
      ctx.moveTo(x0, y0)
      ctx.lineTo(x1, y1)
      ctx.stroke()
    }
    return c
  }

  function drawMinimap() {
    const el = mapEl.value
    if (!el) return
    const cssSize = mapExpanded.value
      ? Math.min(window.innerWidth - 40, window.innerHeight - 120, 460)
      : 168
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const px = Math.round(cssSize * dpr)
    if (el.width !== px) {
      el.width = el.height = px
      el.style.width = cssSize + 'px'
      el.style.height = cssSize + 'px'
    }
    if (!mapStatic || mapStaticSize !== px) {
      mapStatic = buildMapStatic(px)
      mapStaticSize = px
    }

    const ctx = el.getContext('2d')
    const s = mapScale(px)
    const tm = (x, z) => [(x + cityHalf + MAP_MARGIN) * s, (z + cityHalf + MAP_MARGIN) * s]
    ctx.clearRect(0, 0, px, px)
    ctx.drawImage(mapStatic, 0, 0)

    // active route
    if (navigator.points.length >= 2) {
      ctx.strokeStyle = 'rgba(110, 231, 160, 0.95)'
      ctx.lineWidth = 2.2 * dpr
      ctx.lineJoin = 'round'
      ctx.beginPath()
      navigator.points.forEach((p, i) => {
        const [x, y] = tm(p.x, p.z)
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
      })
      ctx.stroke()
    }

    // landmarks (including the moving drone)
    const expanded = mapExpanded.value
    ctx.font = `600 ${11 * dpr}px system-ui, sans-serif`
    ctx.textAlign = 'center'
    for (const lm of landmarks) {
      const [x, y] = tm(lm.center.x, lm.center.z)
      const r = (expanded ? 5 : 3.5) * dpr
      ctx.fillStyle = '#' + new THREE.Color(lm.color).getHexString()
      ctx.beginPath()
      ctx.arc(x, y, r, 0, Math.PI * 2)
      ctx.fill()
      if (navTargetKey.value === lm.key) {
        ctx.strokeStyle = ctx.fillStyle
        ctx.lineWidth = 1.5 * dpr
        ctx.beginPath()
        ctx.arc(x, y, r + 3 * dpr, 0, Math.PI * 2)
        ctx.stroke()
      }
      if (expanded) {
        ctx.fillStyle = 'rgba(235, 240, 255, 0.92)'
        ctx.fillText(lm.label, x, y - 8 * dpr)
      }
    }

    // player arrow
    const p = player.group.position
    const [pxm, pym] = tm(p.x, p.z)
    const ang = Math.atan2(Math.cos(player.state.heading), Math.sin(player.state.heading))
    ctx.save()
    ctx.translate(pxm, pym)
    ctx.rotate(ang)
    const a = (expanded ? 7 : 5.5) * dpr
    ctx.fillStyle = '#ffd579'
    ctx.beginPath()
    ctx.moveTo(a, 0)
    ctx.lineTo(-a * 0.7, a * 0.6)
    ctx.lineTo(-a * 0.4, 0)
    ctx.lineTo(-a * 0.7, -a * 0.6)
    ctx.closePath()
    ctx.fill()
    ctx.restore()
  }

  function onMapClick(e) {
    const el = mapEl.value
    if (!el) return
    if (!mapExpanded.value) {
      mapExpanded.value = true
      return
    }
    const rect = el.getBoundingClientRect()
    const px = el.width
    const mx = ((e.clientX - rect.left) / rect.width) * px
    const my = ((e.clientY - rect.top) / rect.height) * px
    const s = mapScale(px)
    let bestKey = null
    let bestD = (16 * (px / rect.width)) ** 2
    for (const lm of landmarks) {
      const x = (lm.center.x + cityHalf + MAP_MARGIN) * s
      const y = (lm.center.z + cityHalf + MAP_MARGIN) * s
      const d = (x - mx) ** 2 + (y - my) ** 2
      if (d < bestD) {
        bestD = d
        bestKey = lm.key
      }
    }
    if (bestKey) {
      setDirections(bestKey)
      mapExpanded.value = false
    }
  }
  mapEl.value?.addEventListener('click', onMapClick)

  // intro sweep down to the car, then you're driving
  if (!prefersReducedMotion) {
    const pose = chasePose()
    startTween(pose.pos, pose.target, 3.0, () => {
      mode = 'drive'
    })
  } else {
    const pose = chasePose()
    camera.position.copy(pose.pos)
    camTarget.copy(pose.target)
    mode = 'drive'
  }

  // ------- render loop -------
  const clock = new THREE.Clock()
  const worldPos = new THREE.Vector3()

  // adaptive quality: if the first seconds run slow, drop bloom + pixel ratio
  let frames = 0
  let slowFrames = 0
  let useComposer = true

  function frame() {
    if (disposed) return
    rafId = requestAnimationFrame(frame)
    const dt = Math.min(clock.getDelta(), 0.05)
    const t = clock.elapsedTime

    update(dt, t, player.group.position)
    navigator.update(t)

    const flying = tween !== null

    if (tween) {
      tween.t += dt
      const k = easeInOutCubic(Math.min(tween.t / tween.duration, 1))
      camera.position.lerpVectors(tween.fromPos, tween.toPos, k)
      camera.position.y += Math.sin(Math.PI * Math.min(tween.t / tween.duration, 1)) * tween.arc
      camTarget.lerpVectors(tween.fromTarget, tween.toTarget, k)
      if (tween.t >= tween.duration) {
        const done = tween.onDone
        tween = null
        if (done) done()
      }
    } else if (mode === 'drive') {
      if (!gameOver.value) player.update(dt, input)
      const pose = chasePose()
      camera.position.lerp(pose.pos, 1 - Math.exp(-dt * 3.5))
      keepChaseCameraClear(camera.position)
      camTarget.lerp(pose.target, 1 - Math.exp(-dt * 5))

      // drive-in triggers + arrival
      const p = player.group.position
      if (player.state.vehicle === 'basic') {
        for (const lm of landmarks) {
          if (lm.dynamic) continue
          const dx = p.x - lm.center.x
          const dz = p.z - lm.center.z
          const d2 = dx * dx + dz * dz
          if (d2 < lm.enterR * lm.enterR) {
            if (latchedKey !== lm.key) {
              focusLandmark(lm)
              break
            }
          } else if (latchedKey === lm.key && d2 > (lm.enterR + 5) ** 2) {
            latchedKey = null
          }
        }
      }
      if (navigator.targetKey) {
        const lm = landmarkByKey.get(navigator.targetKey)
        if (lm && p.distanceToSquared(new THREE.Vector3(lm.center.x, p.y, lm.center.z)) < lm.enterR ** 2) {
          clearDirections()
        }
      }
    } else if (mode === 'focus') {
      // hold position; follow the landmark if it moves (drone)
      const lm = landmarkByKey.get(focusedKey.value)
      if (lm && lm.dynamic) {
        camTarget.lerp(lm.center, Math.min(dt * 3, 1))
        camera.position.copy(camTarget).add(focusOffset)
      }
    }

    if (mode === 'drive' && player.state.vehicle === 'black' && !gameOver.value) {
      pursuitTime.value += dt
      policeSpawnTimer += dt
      const spawnEvery = Math.max(5.5, 13 - pursuitTime.value * 0.08)
      if (policeSpawnTimer >= spawnEvery && policeCars.length < 12) {
        policeSpawnTimer = 0
        spawnPolice()
      }
      const difficulty = 1 + pursuitTime.value / 24
      for (const police of policeCars) {
        police.update(dt, player.group.position, difficulty)
        if (police.group.position.distanceToSquared(player.group.position) < 10.2) {
          gameOver.value = true
          player.state.velocity.set(0, 0)
          player.state.speed = 0
          for (const key of Object.keys(input)) input[key] = false
          break
        }
      }
      policeThreats.value = policeCars
        .map((police, id) => {
          const dx = police.group.position.x - player.group.position.x
          const dz = police.group.position.z - player.group.position.z
          const distance = Math.hypot(dx, dz)
          const bearing = Math.atan2(dx, dz)
          const relative = Math.atan2(
            Math.sin(bearing - player.state.heading),
            Math.cos(bearing - player.state.heading)
          )
          const proximity = THREE.MathUtils.clamp(1 - distance / 78, 0, 1)
          const size = 102 + id * 8
          return {
            id,
            distance,
            style: {
              width: size + 'px',
              height: size + 'px',
              opacity: 0.25 + proximity * 0.75,
              borderTopWidth: 2 + proximity * 7 + 'px',
              transform: 'translate(-50%, -50%) rotate(' +
                THREE.MathUtils.radToDeg(relative) + 'deg)'
            }
          }
        })
        .filter((threat) => threat.distance < 78)
        .sort((a, b) => a.distance - b.distance)
        .slice(0, 4)
    }

    camera.lookAt(camTarget)

    // hover raycast — authoritative while the pointer is over the canvas
    if (pointerInside && !navigating && !flying) {
      raycaster.setFromCamera(pointer, camera)
      const hits = raycaster.intersectObjects(hitMeshes, false)
      hoveredKey.value = hits.length ? hits[0].object.userData.landmarkKey : null
      canvasEl.value.style.cursor = hoveredKey.value ? 'pointer' : 'default'
    }

    // rings pulse on hover/nav target, chips track anchors
    const hideChips = navigating || flying || focusedKey.value
    for (const lm of landmarks) {
      const highlighted = hoveredKey.value === lm.key || navTargetKey.value === lm.key
      if (lm.ring) {
        const target = highlighted ? 0.45 : 0.12
        lm.ring.material.opacity += (target - lm.ring.material.opacity) * Math.min(dt * 8, 1)
        if (highlighted) {
          const s = 1 + Math.sin(t * 4) * 0.03
          lm.ring.scale.setScalar(s)
        }
      }

      const el = chipEls.get(lm.key)
      if (el) {
        worldPos.copy(lm.anchor).project(camera)
        const behind = worldPos.z > 1
        const dist = camera.position.distanceTo(lm.anchor)
        if (behind || dist > 340 || hideChips) {
          el.style.opacity = '0'
          el.style.pointerEvents = 'none'
        } else {
          const x = ((worldPos.x + 1) / 2) * rootEl.value.clientWidth
          const y = ((1 - worldPos.y) / 2) * rootEl.value.clientHeight
          const scale = THREE.MathUtils.clamp(180 / dist, 0.6, 1.15)
          el.style.opacity = String(THREE.MathUtils.clamp(2 - dist / 220, 0.35, 1))
          el.style.pointerEvents = 'auto'
          el.style.transform = `translate(-50%, -100%) translate(${x}px, ${y}px) scale(${scale})`
        }
      }
    }

    drawMinimap()

    // adaptive quality check over the first ~4 seconds
    if (frames < 240) {
      frames++
      if (dt > 0.045) slowFrames++
      if (frames === 240 && slowFrames > 90 && useComposer) {
        useComposer = false
        renderer.setPixelRatio(1)
        renderer.shadowMap.enabled = false
      }
    }

    if (useComposer) composer.render()
    else renderer.render(scene, camera)
  }
  frame()

  // ------- cleanup -------
  onBeforeUnmount(() => {
    disposed = true
    cancelAnimationFrame(rafId)
    window.removeEventListener('resize', onResize)
    window.removeEventListener('keydown', onKeyDown)
    window.removeEventListener('keyup', onKeyUp)
    window.removeEventListener('blur', onBlur)
    mapEl.value?.removeEventListener('click', onMapClick)
    composer.dispose()
    scene.traverse((obj) => {
      if (obj.geometry) obj.geometry.dispose()
      const mats = Array.isArray(obj.material) ? obj.material : obj.material ? [obj.material] : []
      for (const m of mats) {
        for (const key of ['map', 'emissiveMap', 'normalMap', 'roughnessMap']) if (m[key]) m[key].dispose()
        m.dispose()
      }
    })
    if (envTex) envTex.dispose()
    renderer.dispose()
  })
})

function activateByKey(key) {
  three.value?.setDirections(key)
}

function openFocusedRoute() {
  const api = three.value
  const meta = focusedMeta.value
  if (api && meta) api.goToRoute(meta.route)
}

function resumeDrive() {
  three.value?.leaveFocus()
}

function clearDirections() {
  three.value?.clearDirections()
}

function setTouch(k, v) {
  const api = three.value
  if (api?.input) api.input[k] = v
}
</script>

<style scoped>
.city-root {
  position: fixed;
  top: 67px;
  right: 0;
  bottom: 0;
  left: 0;
  overflow: hidden;
  background: #02030a;
}

.city-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  display: block;
  touch-action: none;
}

/* ---- chips ---- */
.chip-layer {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 3;
  transition: opacity 0.3s ease;
}
.chip-layer.dimmed {
  opacity: 0;
}
.chip {
  position: absolute;
  top: 0;
  left: 0;
  pointer-events: auto;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px 6px 8px;
  border-radius: 999px;
  border: 1px solid rgba(148, 163, 184, 0.25);
  background: rgba(8, 10, 22, 0.72);
  backdrop-filter: blur(6px);
  color: var(--ink);
  cursor: pointer;
  white-space: nowrap;
  transition: border-color 0.15s ease, background 0.15s ease, opacity 0.25s ease;
  will-change: transform;
}
.chip:hover,
.chip.active {
  border-color: var(--chip-color, var(--accent));
  background: rgba(12, 14, 30, 0.92);
  box-shadow: 0 0 18px color-mix(in srgb, var(--chip-color, #5b5bff) 45%, transparent);
}
.chip-dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  flex: none;
  background: var(--chip-color, var(--accent));
  box-shadow: 0 0 10px var(--chip-color, var(--accent));
}
.chip-text {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  line-height: 1.15;
}
.chip-label {
  font-weight: 700;
  font-size: 0.82rem;
}
.chip-sub {
  font-size: 0.68rem;
  color: var(--muted);
  display: none;
}
.chip:hover .chip-sub,
.chip.active .chip-sub {
  display: block;
}

/* ---- vehicle selection + pursuit ---- */
.vehicle-picker {
  position: absolute;
  top: 18px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 7;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 12px;
}
.vehicle-picker button {
  border: 0;
  background: transparent;
  cursor: pointer;
}
.vehicle-choice {
  width: 72px;
  height: 48px;
  padding: 0 !important;
  opacity: 0.54;
  transform: scale(0.82);
  transition: opacity 160ms ease, transform 180ms ease, filter 180ms ease;
}
.vehicle-choice:hover {
  opacity: 0.88;
  transform: scale(0.92);
}
.vehicle-choice.selected {
  width: 112px;
  height: 66px;
  opacity: 1;
  transform: scale(1);
  filter: drop-shadow(0 7px 10px rgba(0, 0, 0, 0.72)) drop-shadow(0 0 12px rgba(120, 156, 255, 0.42));
}
.vehicle-choice img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
  pointer-events: none;
}
.vehicle-image-loading {
  display: block;
  width: 70%;
  height: 38%;
  margin: auto;
  border-radius: 50%;
  background: rgba(134, 154, 203, 0.22);
  filter: blur(7px);
}
.pursuit-hud {
  position: absolute;
  top: 24px;
  right: 24px;
  z-index: 6;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  padding: 10px 14px;
  border: 1px solid rgba(255, 61, 82, 0.55);
  border-radius: 12px;
  background: rgba(20, 4, 8, 0.78);
}
.pursuit-hud span,
.game-over-kicker {
  color: #ff5368;
  font-size: 0.65rem;
  font-weight: 900;
  letter-spacing: 0.18em;
}
.pursuit-hud strong {
  font-size: 0.9rem;
}
.pursuit-hud small {
  color: var(--muted);
  font-size: 0.68rem;
}
.cop-proximity {
  position: absolute;
  left: 50%;
  top: 50%;
  z-index: 6;
  width: 1px;
  height: 1px;
  pointer-events: none;
}
.cop-proximity-arc {
  position: absolute;
  left: 0;
  top: 0;
  box-sizing: border-box;
  border: 2px solid transparent;
  border-top-style: solid;
  border-top-color: #ff243f;
  border-radius: 50%;
  filter: drop-shadow(0 0 3px rgba(255, 16, 49, 0.9));
  transition: width 100ms linear, height 100ms linear, border-width 100ms linear;
}
.cop-proximity-arc::after {
  content: '';
  position: absolute;
  left: 50%;
  top: -5px;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #ff4960;
  transform: translateX(-50%);
  box-shadow: 0 0 7px rgba(255, 24, 57, 0.9);
}
.game-over {
  position: absolute;
  inset: 0;
  z-index: 9;
  display: grid;
  place-items: center;
  background: rgba(2, 3, 10, 0.58);
  backdrop-filter: blur(5px);
}
.game-over-card {
  width: min(390px, calc(100vw - 32px));
  padding: 30px;
  text-align: center;
  border: 1px solid rgba(255, 61, 82, 0.5);
  border-radius: 20px;
  background: rgba(9, 7, 15, 0.94);
  box-shadow: 0 24px 90px rgba(0, 0, 0, 0.75), 0 0 50px rgba(255, 40, 70, 0.14);
}
.game-over-card h2 {
  margin: 8px 0;
  font-size: 2.2rem;
}
.game-over-card p {
  margin: 0 0 20px;
  color: var(--muted);
}
.game-over-card .btn + .btn {
  margin-left: 8px;
}

/* ---- detail panel ---- */
.city-panel {
  position: absolute;
  right: 26px;
  top: 50%;
  transform: translateY(-50%);
  z-index: 6;
  width: min(370px, calc(100vw - 48px));
  padding: 22px 24px;
  border-radius: 18px;
  border: 1px solid color-mix(in srgb, var(--chip-color, #5b5bff) 40%, rgba(148, 163, 184, 0.2));
  background: rgba(7, 9, 20, 0.88);
  backdrop-filter: blur(12px);
  box-shadow: 0 20px 70px rgba(0, 0, 0, 0.6),
    0 0 40px color-mix(in srgb, var(--chip-color, #5b5bff) 18%, transparent);
}
.panel-kicker {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--chip-color, var(--accent));
  margin-bottom: 8px;
}
.panel-title {
  margin: 0 0 4px;
  font-size: 1.35rem;
  font-weight: 800;
  line-height: 1.2;
}
.panel-tagline {
  margin: 0 0 10px;
  font-size: 0.88rem;
  color: var(--muted);
}
.panel-excerpt {
  margin: 0 0 14px;
  font-size: 0.85rem;
  line-height: 1.55;
  color: var(--ink);
}
.panel-stack {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 16px;
}
.stack-chip {
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 0.7rem;
  font-weight: 600;
  border: 1px solid rgba(148, 163, 184, 0.25);
  background: rgba(148, 163, 184, 0.08);
  color: var(--muted);
}
.panel-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.panel-enter-active,
.panel-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}
.panel-enter-from,
.panel-leave-to {
  opacity: 0;
  transform: translateY(-50%) translateX(24px);
}

/* ---- hint ---- */
.city-hint {
  position: absolute;
  bottom: 22px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 4;
  padding: 8px 16px;
  border-radius: 999px;
  border: 1px solid var(--line);
  background: rgba(8, 10, 22, 0.7);
  backdrop-filter: blur(6px);
  color: var(--muted);
  font-size: 0.82rem;
  white-space: nowrap;
  transition: opacity 0.6s ease;
  pointer-events: none;
}
.city-hint.hidden {
  opacity: 0;
}
.hint-key {
  color: var(--ink);
  font-weight: 700;
}

/* ---- minimap ---- */
.minimap {
  position: absolute;
  right: 22px;
  bottom: 22px;
  z-index: 5;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
}
.map-frame {
  position: relative;
  border-radius: 14px;
  overflow: hidden;
  border: 1px solid var(--line);
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
}
.minimap canvas {
  display: block;
  cursor: pointer;
}
.map-toggle {
  position: absolute;
  top: 6px;
  right: 6px;
  width: 26px;
  height: 26px;
  padding: 0;
  border-radius: 8px;
  border: 1px solid var(--line);
  background: rgba(8, 10, 22, 0.85);
  color: var(--ink);
  font-size: 0.8rem;
  line-height: 1;
  cursor: pointer;
}
.map-toggle:hover {
  border-color: var(--accent);
}
.map-hint {
  position: absolute;
  bottom: 6px;
  left: 0;
  right: 0;
  text-align: center;
  font-size: 0.7rem;
  color: var(--muted);
  pointer-events: none;
}
.map-route {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  border-radius: 999px;
  border: 1px solid rgba(110, 231, 160, 0.5);
  background: rgba(8, 10, 22, 0.85);
  color: #9be7c0;
  font-size: 0.78rem;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
}
.map-route-x {
  color: var(--muted);
}
.map-route:hover .map-route-x {
  color: var(--ink);
}

/* ---- touch driving controls ---- */
.touch-controls {
  display: none;
  position: absolute;
  left: 18px;
  bottom: 18px;
  z-index: 5;
  width: 132px;
  height: 132px;
}
.touch-controls.drone {
  width: 194px;
}
@media (pointer: coarse) {
  .touch-controls {
    display: block;
  }
}
.touch-btn {
  position: absolute;
  width: 44px;
  height: 44px;
  border-radius: 12px;
  border: 1px solid var(--line);
  background: rgba(8, 10, 22, 0.7);
  color: var(--ink);
  font-size: 1rem;
  touch-action: none;
  user-select: none;
  -webkit-user-select: none;
}
.touch-btn:active {
  background: rgba(91, 91, 255, 0.35);
}
.touch-btn.forward {
  top: 0;
  left: 44px;
}
.touch-btn.back {
  bottom: 0;
  left: 44px;
}
.touch-btn.left {
  bottom: 44px;
  left: 0;
}
.touch-btn.right {
  bottom: 44px;
  right: 0;
}
.touch-btn.ascend,
.touch-btn.descend {
  left: 150px;
  font-size: 0.66rem;
  font-weight: 800;
  letter-spacing: 0.04em;
}
.touch-btn.ascend {
  top: 18px;
}
.touch-btn.descend {
  bottom: 18px;
}

/* ---- veil ---- */
.city-veil {
  position: absolute;
  inset: 0;
  z-index: 10;
  background: #02030a;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.45s ease;
}
.city-veil.shown {
  opacity: 1;
  pointer-events: auto;
}

/* ---- fallback ---- */
.city-fallback {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: flex-start;
  padding: 8vw;
}
.fallback-links {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin-top: 8px;
}

@media (max-width: 640px) {
  .vehicle-picker {
    top: 10px;
    width: calc(100vw - 20px);
    gap: 4px;
  }
  .vehicle-choice {
    width: 56px;
    height: 40px;
  }
  .vehicle-choice.selected {
    width: 92px;
    height: 58px;
  }
  .pursuit-hud {
    top: 82px;
    right: 10px;
  }
  .city-hint {
    font-size: 0.72rem;
    bottom: 76px;
  }
  .minimap {
    right: 12px;
    bottom: 14px;
  }
  .chip-sub {
    display: none !important;
  }
  .city-panel {
    right: 12px;
    left: 12px;
    top: auto;
    bottom: 12px;
    transform: none;
    width: auto;
    max-height: 55vh;
    overflow-y: auto;
  }
  .panel-enter-from,
  .panel-leave-to {
    opacity: 0;
    transform: translateY(20px);
  }
}
</style>
