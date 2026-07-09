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
          :class="{ active: hoveredKey === lm.key }"
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

      <!-- identity overlay -->
      <div class="city-overlay-top">
        <h1 class="city-name">Dillon Bliss</h1>
        <p class="city-tag">Mechatronic engineer · Full-stack developer · Sydney</p>
        <div class="city-links">
          <RouterLink class="btn primary" to="/projects">All projects</RouterLink>
          <RouterLink class="btn" to="/about">About</RouterLink>
          <RouterLink class="btn" to="/contact">Contact</RouterLink>
        </div>
      </div>

      <!-- tour caption -->
      <transition name="caption">
        <div v-if="tourCaption && !focusedMeta" class="tour-caption" :style="{ '--chip-color': tourCaption.cssColor }">
          <span class="chip-dot" />
          <div class="caption-text">
            <span class="caption-label">{{ tourCaption.label }}</span>
            <span class="caption-sub">{{ tourCaption.sub }}</span>
          </div>
          <span class="caption-hint">Click to zoom in</span>
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
            <button class="btn" @click="resumeTour">Back to tour</button>
          </div>
        </aside>
      </transition>

      <!-- controls hint -->
      <div class="city-hint" :class="{ hidden: hintHidden || focusedMeta }">
        <span class="hint-key">Click</span> a landmark to zoom in ·
        <span class="hint-key">Drag</span> to explore ·
        <span class="hint-key">Scroll</span> to zoom
      </div>

      <!-- explore menu -->
      <div class="city-explore" :class="{ open: exploreOpen }">
        <button class="btn explore-toggle" @click="exploreOpen = !exploreOpen">
          {{ exploreOpen ? '✕ Close' : '🗺 Explore the city' }}
        </button>
        <div v-if="exploreOpen" class="explore-list">
          <button
            v-for="lm in landmarkMeta"
            :key="lm.key"
            class="explore-item"
            @click="activateByKey(lm.key)"
            @pointerenter="hoveredKey = lm.key"
            @pointerleave="hoveredKey === lm.key && (hoveredKey = null)"
          >
            <span class="chip-dot" :style="{ '--chip-color': lm.cssColor }" />
            <span>
              <span class="chip-label">{{ lm.label }}</span>
              <span class="chip-sub">{{ lm.sub }}</span>
            </span>
          </button>
        </div>
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
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js'
import { buildCity } from '../city/cityScene'
import { projects } from '../data/projects'

const router = useRouter()

const rootEl = ref(null)
const canvasEl = ref(null)
const webglFailed = ref(false)
const hoveredKey = ref(null)
const hintHidden = ref(false)
const exploreOpen = ref(false)
const veilShown = ref(false)
const focusedKey = ref(null)
const tourStopKey = ref(null)

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
const tourCaption = computed(() => {
  if (!tourStopKey.value) return null
  return landmarkMeta.find((m) => m.key === tourStopKey.value) ?? null
})

// three.js state kept out of Vue reactivity
const three = shallowRef(null)
let rafId = 0
let disposed = false

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}

// A repeatable ring around the map so the tour never criss-crosses.
const TOUR_ORDER = [
  'hq',
  'sports-booking',
  'wealth-pathways-au',
  'lol-match-predictor',
  'contact',
  'chessEngine',
  'asset-data-integration',
  'sportslux'
]
const TOUR_DWELL = 3.4
const IDLE_RESUME = 12

onMounted(() => {
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
  const camera = new THREE.PerspectiveCamera(50, width / height, 0.5, 2000)
  camera.position.set(260, 190, 260)

  const controls = new OrbitControls(camera, canvasEl.value)
  controls.enableDamping = true
  controls.dampingFactor = 0.06
  controls.minDistance = 22
  controls.maxDistance = 300
  controls.maxPolarAngle = 1.42
  controls.minPolarAngle = 0.12
  controls.target.set(0, 8, 0)

  const { landmarks, update } = buildCity(scene)
  for (const lm of landmarks) {
    landmarkMeta.push({
      key: lm.key,
      label: lm.label,
      sub: lm.sub,
      route: lm.route,
      cssColor: '#' + new THREE.Color(lm.color).getHexString()
    })
  }

  // post-processing (bloom is what makes the night city glow)
  const composer = new EffectComposer(renderer)
  composer.addPass(new RenderPass(scene, camera))
  const bloom = new UnrealBloomPass(new THREE.Vector2(width, height), 0.3, 0.6, 0.66)
  composer.addPass(bloom)
  composer.addPass(new OutputPass())

  const raycaster = new THREE.Raycaster()
  const pointer = new THREE.Vector2(2, 2) // off-screen until first move
  let pointerInside = false
  let downPos = null

  const hitMeshes = landmarks.map((l) => l.hitMesh)
  const landmarkByKey = new Map(landmarks.map((l) => [l.key, l]))

  // ------- camera state machine -------
  // intro → tour (fly/dwell loop) ⇄ free (user drag) ⇄ focus (panel open)
  let mode = 'intro'
  let tourIndex = 0
  let dwellT = 0
  let idleT = 0
  let navigating = false // route push in progress
  let tween = null
  const focusOffset = new THREE.Vector3() // camera offset while following a dynamic landmark

  function startTween(toPos, toTarget, duration, onDone) {
    const dist = camera.position.distanceTo(toPos)
    tween = {
      fromPos: camera.position.clone(),
      toPos: toPos.clone(),
      fromTarget: controls.target.clone(),
      toTarget: toTarget.clone(),
      t: 0,
      duration,
      arc: THREE.MathUtils.clamp(dist * 0.32, 4, 55),
      onDone
    }
  }

  /** Viewpoint for a landmark: outside it, looking back across it toward the city. */
  function viewFor(lm, close) {
    // stand on the landmark's front side (where its screens/boards face);
    // dynamic landmarks (drone) fall back to the outward direction
    const dir = lm.front
      ? lm.front.clone()
      : new THREE.Vector3(lm.center.x, 0, lm.center.z)
    if (dir.lengthSq() < 1) dir.set(0.4, 0, 1)
    dir.normalize()
    // horizontal distance scales with whichever is bigger: footprint or height,
    // so towers get a 3/4 view instead of a top-down one
    const horiz = Math.max(
      lm.focusRadius * (close ? 2.3 : 2.7),
      lm.focusHeight * (close ? 1.05 : 1.2)
    )
    const pos = lm.center.clone().addScaledVector(dir, horiz)
    pos.y = lm.center.y + horiz * (close ? 0.5 : 0.6)
    return { pos, target: lm.center.clone() }
  }

  function flightDuration(toPos) {
    if (prefersReducedMotion) return 0.35
    return THREE.MathUtils.clamp(camera.position.distanceTo(toPos) / 55, 1.2, 2.6)
  }

  function tourFlyTo(index) {
    mode = 'tour-fly'
    tourIndex = ((index % TOUR_ORDER.length) + TOUR_ORDER.length) % TOUR_ORDER.length
    const lm = landmarkByKey.get(TOUR_ORDER[tourIndex])
    const { pos, target } = viewFor(lm, false)
    tourStopKey.value = lm.key
    startTween(pos, target, flightDuration(pos), () => {
      mode = 'tour-dwell'
      dwellT = 0
    })
  }

  function nearestTourIndex() {
    let best = 0
    let bestD = Infinity
    for (let i = 0; i < TOUR_ORDER.length; i++) {
      const lm = landmarkByKey.get(TOUR_ORDER[i])
      const d = controls.target.distanceToSquared(lm.center)
      if (d < bestD) {
        bestD = d
        best = i
      }
    }
    return best
  }

  function focusLandmark(lm) {
    if (navigating) return
    exploreOpen.value = false
    hintHidden.value = true
    tourStopKey.value = null
    mode = 'focus-fly'
    const { pos, target } = viewFor(lm, true)
    startTween(pos, target, prefersReducedMotion ? 0.3 : 1.3, () => {
      mode = 'focus'
      focusOffset.copy(camera.position).sub(lm.center)
      focusedKey.value = lm.key
    })
  }

  function leaveFocus() {
    focusedKey.value = null
    if (mode === 'focus' || mode === 'focus-fly') {
      tourFlyTo(nearestTourIndex() + 1)
    }
  }

  function goToRoute(route) {
    if (navigating) return
    navigating = true
    veilShown.value = true
    setTimeout(() => router.push(route), 420)
  }

  three.value = { focusLandmark, landmarkByKey, leaveFocus, goToRoute }

  if (import.meta.env.DEV) {
    window.__cityDebug = () => ({
      mode,
      tourIndex,
      tween: !!tween,
      cam: camera.position.toArray().map((n) => +n.toFixed(1)),
      target: controls.target.toArray().map((n) => +n.toFixed(1))
    })
    // jump the current flight to its destination (preview tabs throttle rAF)
    window.__citySkip = () => {
      if (tween) tween.t = tween.duration + 1
      else if (mode === 'tour-dwell') dwellT = TOUR_DWELL + 1
    }
    window.__cityFocus = (key) => focusLandmark(landmarkByKey.get(key))
  }

  // ------- interaction -------
  function interrupt() {
    hintHidden.value = true
    idleT = 0
    // grabbing the world cancels tour/intro flights, never a focus flight
    if (mode === 'intro' || mode === 'tour-fly' || mode === 'tour-dwell' || mode === 'free') {
      tween = null
      mode = 'free'
      tourStopKey.value = null
    }
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
    interrupt()
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
      focusLandmark(landmarkByKey.get(hits[0].object.userData.landmarkKey))
    } else if (mode === 'focus') {
      leaveFocus()
    }
  }
  function onWheel() {
    interrupt()
  }
  function onKeyDown(e) {
    if (e.key === 'Escape' && focusedKey.value) leaveFocus()
  }

  canvasEl.value.addEventListener('pointermove', onPointerMove)
  canvasEl.value.addEventListener('pointerleave', onPointerLeave)
  canvasEl.value.addEventListener('pointerdown', onPointerDown)
  canvasEl.value.addEventListener('click', onClick)
  canvasEl.value.addEventListener('wheel', onWheel, { passive: true })
  window.addEventListener('keydown', onKeyDown)

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

  // intro sweep, then the tour takes over
  if (!prefersReducedMotion) {
    startTween(new THREE.Vector3(120, 80, 165), new THREE.Vector3(0, 14, 0), 3.0, () => {
      tourFlyTo(0)
    })
  } else {
    camera.position.set(120, 80, 165)
    controls.target.set(0, 14, 0)
    mode = 'free'
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

    update(dt, t)

    const flying = tween !== null
    controls.enabled = !flying && mode !== 'focus'

    // camera tween (with a gentle vertical arc so flights feel like a swoop)
    if (tween) {
      tween.t += dt
      const k = easeInOutCubic(Math.min(tween.t / tween.duration, 1))
      camera.position.lerpVectors(tween.fromPos, tween.toPos, k)
      camera.position.y += Math.sin(Math.PI * Math.min(tween.t / tween.duration, 1)) * tween.arc
      controls.target.lerpVectors(tween.fromTarget, tween.toTarget, k)
      if (tween.t >= tween.duration) {
        const done = tween.onDone
        tween = null
        if (done) done()
      }
    } else if (mode === 'tour-dwell') {
      dwellT += dt
      // drift slowly around the stop while dwelling
      const lm = landmarkByKey.get(TOUR_ORDER[tourIndex])
      if (lm && !prefersReducedMotion) {
        const angle = dt * 0.07
        const v = camera.position.clone().sub(controls.target)
        v.applyAxisAngle(new THREE.Vector3(0, 1, 0), angle)
        camera.position.copy(controls.target).add(v)
        if (lm.dynamic) controls.target.lerp(lm.center, Math.min(dt * 2, 1))
      }
      if (dwellT >= TOUR_DWELL && !prefersReducedMotion) tourFlyTo(tourIndex + 1)
    } else if (mode === 'free') {
      idleT += dt
      if (!prefersReducedMotion && idleT > IDLE_RESUME && !focusedKey.value) {
        tourFlyTo(nearestTourIndex() + 1)
      }
    } else if (mode === 'focus') {
      // hold position; follow the landmark if it moves (drone)
      const lm = landmarkByKey.get(focusedKey.value)
      if (lm && lm.dynamic) {
        controls.target.lerp(lm.center, Math.min(dt * 3, 1))
        camera.position.copy(controls.target).add(focusOffset)
      }
    }

    // keep orbit target inside the city
    controls.target.x = THREE.MathUtils.clamp(controls.target.x, -110, 110)
    controls.target.z = THREE.MathUtils.clamp(controls.target.z, -110, 110)
    controls.target.y = THREE.MathUtils.clamp(controls.target.y, 0, 60)
    controls.update()

    // hover raycast — authoritative while the pointer is over the canvas
    if (pointerInside && !navigating && !flying) {
      raycaster.setFromCamera(pointer, camera)
      const hits = raycaster.intersectObjects(hitMeshes, false)
      hoveredKey.value = hits.length ? hits[0].object.userData.landmarkKey : null
      canvasEl.value.style.cursor = hoveredKey.value ? 'pointer' : 'grab'
    }

    // rings pulse on hover/tour stop, chips track anchors
    const hideChips = navigating || flying || focusedKey.value
    for (const lm of landmarks) {
      const highlighted =
        hoveredKey.value === lm.key || (tourStopKey.value === lm.key && mode === 'tour-dwell')
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
    controls.dispose()
    composer.dispose()
    scene.traverse((obj) => {
      if (obj.geometry) obj.geometry.dispose()
      const mats = Array.isArray(obj.material) ? obj.material : obj.material ? [obj.material] : []
      for (const m of mats) {
        for (const key of ['map', 'emissiveMap', 'normalMap', 'roughnessMap']) if (m[key]) m[key].dispose()
        m.dispose()
      }
    })
    renderer.dispose()
  })
})

function activateByKey(key) {
  const api = three.value
  if (!api) return
  const lm = api.landmarkByKey.get(key)
  if (lm) api.focusLandmark(lm)
}

function openFocusedRoute() {
  const api = three.value
  const meta = focusedMeta.value
  if (api && meta) api.goToRoute(meta.route)
}

function resumeTour() {
  three.value?.leaveFocus()
}
</script>

<style scoped>
.city-root {
  position: fixed;
  inset: 0;
  overflow: hidden;
  background: #02030a;
}

.city-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  display: block;
  cursor: grab;
  touch-action: none;
}
.city-canvas:active {
  cursor: grabbing;
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

/* ---- identity overlay ---- */
.city-overlay-top {
  position: absolute;
  top: 26px;
  left: 28px;
  z-index: 4;
  pointer-events: none;
  max-width: min(420px, 80vw);
}
.city-overlay-top .btn {
  pointer-events: auto;
}
.city-name {
  margin: 0;
  font-size: clamp(1.7rem, 1.2rem + 2vw, 2.6rem);
  font-weight: 800;
  letter-spacing: 0.01em;
  text-shadow: 0 4px 30px rgba(0, 0, 0, 0.9);
}
.city-tag {
  margin: 4px 0 14px;
  color: var(--muted);
  font-size: clamp(0.85rem, 0.75rem + 0.4vw, 1rem);
  text-shadow: 0 2px 16px rgba(0, 0, 0, 0.9);
}
.city-links {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

/* ---- tour caption ---- */
.tour-caption {
  position: absolute;
  bottom: 74px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 4;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 18px;
  border-radius: 14px;
  border: 1px solid color-mix(in srgb, var(--chip-color, #5b5bff) 45%, transparent);
  background: rgba(6, 8, 18, 0.82);
  backdrop-filter: blur(8px);
  box-shadow: 0 8px 40px rgba(0, 0, 0, 0.5);
  pointer-events: none;
  white-space: nowrap;
}
.caption-text {
  display: flex;
  flex-direction: column;
  line-height: 1.2;
}
.caption-label {
  font-weight: 800;
  font-size: 0.95rem;
}
.caption-sub {
  font-size: 0.75rem;
  color: var(--muted);
}
.caption-hint {
  font-size: 0.7rem;
  color: var(--muted);
  border-left: 1px solid var(--line);
  padding-left: 12px;
}
.caption-enter-active,
.caption-leave-active {
  transition: opacity 0.35s ease, transform 0.35s ease;
}
.caption-enter-from,
.caption-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(8px);
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

/* ---- explore menu ---- */
.city-explore {
  position: absolute;
  right: 22px;
  bottom: 22px;
  z-index: 5;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 10px;
}
.explore-toggle {
  font-size: 0.88rem;
}
.explore-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 8px;
  border-radius: var(--radius-md);
  border: 1px solid var(--line);
  background: rgba(8, 10, 22, 0.88);
  backdrop-filter: blur(8px);
  max-height: min(52vh, 420px);
  overflow-y: auto;
}
.explore-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  border: none;
  border-radius: 10px;
  background: transparent;
  color: var(--ink);
  cursor: pointer;
  text-align: left;
}
.explore-item:hover {
  background: rgba(91, 91, 255, 0.14);
}
.explore-item .chip-sub {
  display: block;
}
.explore-item .chip-label {
  display: block;
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
  .city-overlay-top {
    top: 16px;
    left: 16px;
  }
  .city-hint {
    font-size: 0.72rem;
    bottom: 76px;
  }
  .city-explore {
    right: 12px;
    bottom: 14px;
  }
  .chip-sub {
    display: none !important;
  }
  .tour-caption {
    bottom: 120px;
    max-width: calc(100vw - 24px);
  }
  .caption-hint {
    display: none;
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
