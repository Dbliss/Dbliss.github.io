<template>
  <div ref="root" class="story">
    <nav class="rail" :class="{ shown: railShown }" aria-label="Model stages">
      <button
        v-for="(s, i) in SCENES"
        :key="s.short"
        type="button"
        class="rail-item"
        :class="{ on: i === activeChapter }"
        :aria-current="i === activeChapter ? 'step' : undefined"
        @click="jump(i)"
      >
        <span class="rail-label">{{ s.short }}</span>
        <span class="rail-mark" />
      </button>
    </nav>

    <section
      v-for="(s, i) in SCENES"
      :key="s.short"
      class="chapter"
      :class="{ flip: i % 2 === 1 }"
    >
      <div class="stage-col">
        <div class="stage">
          <div class="canvas-box">
            <canvas role="img" :aria-label="`Animation: ${s.title}. The steps are described in the text alongside.`" />
          </div>
          <div class="ticks" aria-hidden="true">
            <span
              v-for="(b, bi) in s.beats"
              :key="bi"
              class="tick"
              :class="{ on: bi <= activeBeats[i] }"
            />
          </div>
        </div>
      </div>

      <div class="copy" :class="{ done: finished[i] }">
        <header class="chapter-head">
          <span class="chapter-num mono">{{ String(i + 1).padStart(2, '0') }}</span>
          <h3 class="chapter-title">{{ s.title }}</h3>
          <code class="chapter-code">{{ s.code }}</code>
        </header>

        <ol class="steps">
          <li v-for="(b, bi) in s.beats" :key="bi">
            <button
              type="button"
              class="beat"
              :class="{ active: bi === activeBeats[i], past: bi < activeBeats[i] || finished[i] }"
              :aria-current="bi === activeBeats[i] ? 'step' : undefined"
              @click="seek(i, bi)"
            >
              <span class="beat-bar" aria-hidden="true"><span class="beat-fill" /></span>
              <span class="beat-text">{{ b.text }}</span>
            </button>
          </li>
        </ol>
      </div>
    </section>
  </div>
</template>

<script setup>
// Scroll-triggered walk-through of the model. Scrolling a chapter into view starts its animation, which
// then plays through all of its steps on a clock, at a pace set by how long each step takes to read.
// Selecting a step replays from there. A chapter that scrolls away pauses and picks up again on return.
//
// Between chapters, a scroll gesture becomes an eased glide to the next stop. Chapters too tall for the
// viewport scroll normally until their edge, and the page scrolls normally outside the story.
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { SCENES, drawScene, sceneAssetsReady } from './lolModelScenes'

const START_LINE = 0.45 // a chapter starts once its top rises above this share of the viewport
const MS_PER_WORD = 210
const BEAT_PADDING_MS = 1300
const MIN_BEAT_MS = 3600
const MAX_BEAT_MS = 8200
const DAMPING_MS = 140 // glides over jumps when a step is selected

const SNAP_EPSILON = 4 // px of tolerance when deciding whether the page is at a stop
const SNAP_PADDING = 24 // px kept clear around a chapter too tall to centre
const ENTRY_REACH = 0.6 // how close the story must be, in viewports, before a gesture enters it
const MIN_GLIDE_MS = 900
const MAX_GLIDE_MS = 1500
const GLIDE_MS_PER_PX = 0.6
const WHEEL_THRESHOLD = 24 // accumulated delta that counts as a deliberate gesture
const WHEEL_QUIET_MS = 110 // a gap this long ends a gesture and any trackpad inertia
const SWIPE_THRESHOLD = 36
const KEY_DIRECTION = { ArrowDown: 1, PageDown: 1, ArrowUp: -1, PageUp: -1 }

const glideEase = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)

const root = ref(null)
const activeBeats = ref(SCENES.map(() => 0))
const finished = ref(SCENES.map(() => false))
const activeChapter = ref(0)
const railShown = ref(false)

const reduceMotion = typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

let chapters = []
let raf = 0
let lastFrame = 0
let inView = false
let font = ''
let observer = null
let resizer = null
let glideRaf = 0
let settling = false // absorbing the tail of a gesture that already triggered a glide
let lastWheelAt = 0
let lastWheelSize = 0
let wheelTotal = 0
let touch = null

function beatDuration ({ text, ms }) {
  if (ms) return ms
  const words = text.trim().split(/\s+/).length
  return Math.min(MAX_BEAT_MS, Math.max(MIN_BEAT_MS, words * MS_PER_WORD + BEAT_PADDING_MS))
}

function sizeCanvas (ch) {
  const width = ch.box.clientWidth
  const height = ch.box.clientHeight
  if (!width || !height) return
  const dpr = Math.min(2, window.devicePixelRatio || 1)
  ch.size = { width, height, dpr, font }
  ch.canvas.width = Math.round(width * dpr)
  ch.canvas.height = Math.round(height * dpr)
  ch.dirty = true
}

function resizeStages () {
  chapters.forEach((ch) => { if (ch.near) sizeCanvas(ch) })
  start()
}

// The timeline position, in beats, for a chapter's elapsed time.
function progressAt (ch) {
  let b = ch.durations.length - 1
  while (b > 0 && ch.time < ch.starts[b]) b--
  return b + Math.min(1, (ch.time - ch.starts[b]) / ch.durations[b])
}

function frame (now) {
  raf = 0
  if (!inView) { lastFrame = 0; return }
  const dt = lastFrame ? Math.min(64, now - lastFrame) : 16
  lastFrame = now
  const vh = window.innerHeight
  const rate = reduceMotion ? 1 : 1 - Math.exp(-dt / DAMPING_MS)
  let current = activeChapter.value

  chapters.forEach((ch, i) => {
    const rect = ch.el.getBoundingClientRect()
    if (rect.top < vh * 0.5 && rect.bottom > vh * 0.5) current = i

    const near = rect.bottom > -vh * 0.3 && rect.top < vh * 1.3
    if (near !== ch.near) {
      ch.near = near
      if (near) {
        sizeCanvas(ch)
      } else {
        // Hand the backing store back while the chapter is far away.
        ch.canvas.width = 0
        ch.canvas.height = 0
        ch.size = null
      }
    }

    if (!ch.seen && rect.top < vh * 0.9) {
      ch.seen = true
      ch.el.classList.add('seen')
    }
    if (!ch.started && rect.top < vh * START_LINE && rect.bottom > vh * 0.2) ch.started = true

    // Only advance while the chapter can be seen, so nothing plays out unwatched.
    const visible = rect.top < vh * 0.8 && rect.bottom > vh * 0.2
    if (ch.started && visible && !reduceMotion && ch.time < ch.total) {
      ch.time = Math.min(ch.total, ch.time + dt)
    }

    const target = progressAt(ch)
    ch.shown += (target - ch.shown) * rate
    if (Math.abs(target - ch.shown) < 0.0004) ch.shown = target

    const beat = Math.min(ch.beatEls.length - 1, Math.floor(target))
    if (activeBeats.value[i] !== beat) activeBeats.value[i] = beat
    ch.beatEls[beat].style.setProperty('--fill', (target - beat).toFixed(3))
    const done = ch.time >= ch.total
    if (finished.value[i] !== done) finished.value[i] = done

    if (!near) return
    // On-screen stages redraw every frame so their loops keep running.
    const looping = !reduceMotion && rect.bottom > 0 && rect.top < vh
    if (ch.size && (looping || ch.dirty || Math.abs(ch.shown - ch.drawn) > 0.0002)) {
      drawScene(ch.ctx, i, ch.shown, ch.size, reduceMotion ? 0 : now)
      ch.drawn = ch.shown
      ch.dirty = false
    }
  })

  if (current !== activeChapter.value) activeChapter.value = current
  const first = chapters[0].el.getBoundingClientRect()
  const last = chapters[chapters.length - 1].el.getBoundingClientRect()
  const shown = first.top < vh * 0.5 && last.bottom > vh * 0.5
  if (shown !== railShown.value) railShown.value = shown

  raf = requestAnimationFrame(frame)
}

function start () {
  if (!raf && inView) raf = requestAnimationFrame(frame)
}

// Scroll positions for a chapter: `snap` aligns it in the viewport, and `end` is where a chapter taller
// than the viewport has been read to the bottom. They match for a chapter that fits.
function zoneOf (ch) {
  const vh = window.innerHeight
  const nav = parseFloat(getComputedStyle(root.value).getPropertyValue('--nav-h')) || 76
  const rect = ch.el.getBoundingClientRect()
  const top = rect.top + window.scrollY
  const room = vh - nav
  const maxScroll = document.documentElement.scrollHeight - vh
  const snap = Math.min(maxScroll, Math.max(0, top - nav - Math.max(SNAP_PADDING, (room - rect.height) / 2)))
  const end = Math.min(maxScroll, Math.max(snap, top + rect.height + SNAP_PADDING - vh))
  return { snap, end }
}

// Where a gesture in this direction should glide to, or null to leave it as a normal scroll.
function nextStop (direction) {
  const y = window.scrollY
  const reach = window.innerHeight * ENTRY_REACH
  const zones = chapters.map(zoneOf)
  if (direction > 0) {
    for (let i = 0; i < zones.length; i++) {
      if (y < zones[i].snap - SNAP_EPSILON) return i === 0 && zones[i].snap - y > reach ? null : zones[i].snap
      if (y < zones[i].end - SNAP_EPSILON) return null
    }
    return null
  }
  for (let i = zones.length - 1; i >= 0; i--) {
    if (y > zones[i].end + SNAP_EPSILON) return i === zones.length - 1 && y - zones[i].end > reach ? null : zones[i].end
    if (y > zones[i].snap + SNAP_EPSILON) return null
  }
  return null
}

function cancelGlide () {
  if (glideRaf) cancelAnimationFrame(glideRaf)
  glideRaf = 0
}

function glideTo (target) {
  cancelGlide()
  const from = window.scrollY
  const distance = Math.abs(target - from)
  if (distance < 2) return
  const duration = Math.min(MAX_GLIDE_MS, Math.max(MIN_GLIDE_MS, distance * GLIDE_MS_PER_PX + 500))
  const startedAt = performance.now()
  settling = true
  wheelTotal = 0
  const step = (now) => {
    const t = Math.min(1, Math.max(0, (now - startedAt) / duration))
    window.scrollTo({ top: from + (target - from) * glideEase(t), behavior: 'instant' })
    glideRaf = t < 1 ? requestAnimationFrame(step) : 0
  }
  glideRaf = requestAnimationFrame(step)
}

function onWheel (e) {
  if (e.ctrlKey || !e.deltaY || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return
  const delta = e.deltaMode === 1 ? e.deltaY * 32 : e.deltaMode === 2 ? e.deltaY * window.innerHeight : e.deltaY
  const size = Math.abs(delta)
  const now = performance.now()
  const gap = now - lastWheelAt
  // Trackpad inertia decays, so a clearly larger delta means a new, deliberate gesture.
  const rising = size > 30 && size > lastWheelSize * 1.6
  lastWheelAt = now
  lastWheelSize = size

  if (glideRaf) { e.preventDefault(); return }
  if (gap > WHEEL_QUIET_MS) {
    settling = false
    wheelTotal = 0
  }
  if (settling) {
    if (!rising) { e.preventDefault(); return }
    settling = false
    wheelTotal = 0
  }

  const direction = Math.sign(delta)
  const target = nextStop(direction)
  if (target === null) return
  e.preventDefault()
  if (Math.sign(wheelTotal) !== direction) wheelTotal = 0
  wheelTotal += delta
  if (Math.abs(wheelTotal) >= WHEEL_THRESHOLD) glideTo(target)
}

function onKeydown (e) {
  if (e.altKey || e.ctrlKey || e.metaKey) return
  if (e.target.closest?.('input, textarea, select, [contenteditable]')) return
  let direction = KEY_DIRECTION[e.key]
  if (e.key === ' ') {
    // Space belongs to a focused control, such as a step button.
    if (e.target.closest?.('button, a')) return
    direction = e.shiftKey ? -1 : 1
  }
  if (!direction) return
  if (glideRaf) { e.preventDefault(); return }
  const target = nextStop(direction)
  if (target === null) return
  e.preventDefault()
  glideTo(target)
}

function onTouchStart (e) {
  touch = e.touches.length === 1 ? { y: e.touches[0].clientY, target: undefined } : null
}

function onTouchMove (e) {
  if (glideRaf) {
    if (e.cancelable) e.preventDefault()
    return
  }
  if (!touch) return
  const dy = e.touches[0].clientY - touch.y
  if (touch.target === undefined) {
    if (Math.abs(dy) < 8) return
    touch.target = nextStop(dy < 0 ? 1 : -1)
  }
  if (touch.target === null || !e.cancelable) return
  e.preventDefault()
  if (Math.abs(dy) >= SWIPE_THRESHOLD) {
    glideTo(touch.target)
    touch = null
  }
}

// Let a scrollbar drag take over from a glide.
function onPointerDown (e) {
  if (e.target === document.documentElement) cancelGlide()
}

function jump (i) {
  const { snap } = zoneOf(chapters[i])
  if (reduceMotion) window.scrollTo({ top: snap, behavior: 'instant' })
  else glideTo(snap)
}

function seek (i, beat) {
  const ch = chapters[i]
  ch.started = true
  // Without motion there is nothing to play, so show the step's finished state instead.
  ch.time = reduceMotion ? ch.starts[beat] + ch.durations[beat] - 1 : ch.starts[beat]
}

onMounted(() => {
  font = getComputedStyle(root.value).fontFamily
  chapters = [...root.value.querySelectorAll('.chapter')].map((el, i) => {
    const canvas = el.querySelector('canvas')
    const durations = SCENES[i].beats.map(beatDuration)
    let elapsed = 0
    const starts = durations.map((d) => { const at = elapsed; elapsed += d; return at })
    return {
      el,
      canvas,
      ctx: canvas.getContext('2d'),
      box: el.querySelector('.canvas-box'),
      beatEls: [...el.querySelectorAll('.beat')],
      durations,
      starts,
      total: elapsed,
      time: reduceMotion ? elapsed : 0,
      near: false,
      seen: false,
      started: reduceMotion,
      dirty: true,
      size: null,
      shown: reduceMotion ? durations.length : 0,
      drawn: -1
    }
  })

  resizer = new ResizeObserver(resizeStages)
  resizer.observe(root.value)
  window.addEventListener('resize', resizeStages)

  if (!reduceMotion) {
    window.addEventListener('wheel', onWheel, { passive: false })
    window.addEventListener('keydown', onKeydown)
    window.addEventListener('touchstart', onTouchStart, { passive: true })
    window.addEventListener('touchmove', onTouchMove, { passive: false })
    window.addEventListener('pointerdown', onPointerDown)
  }

  // The canvases fall back to a system font until the web font is ready.
  document.fonts?.ready.then(() => chapters.forEach((ch) => { ch.dirty = true }))
  sceneAssetsReady.then(() => chapters.forEach((ch) => { ch.dirty = true }))

  observer = new IntersectionObserver(([entry]) => {
    inView = entry.isIntersecting
    if (inView) start()
  }, { rootMargin: '30% 0px' })
  observer.observe(root.value)
})

onBeforeUnmount(() => {
  if (raf) cancelAnimationFrame(raf)
  raf = 0
  inView = false
  observer?.disconnect()
  resizer?.disconnect()
  window.removeEventListener('resize', resizeStages)
  cancelGlide()
  window.removeEventListener('wheel', onWheel)
  window.removeEventListener('keydown', onKeydown)
  window.removeEventListener('touchstart', onTouchStart)
  window.removeEventListener('touchmove', onTouchMove)
  window.removeEventListener('pointerdown', onPointerDown)
})
</script>

<style scoped>
.story {
  --nav-h: 76px;
  --stage-h: min(calc(100vh - var(--nav-h) - 48px), 640px);
  margin-top: 44px;
}

/* chapter layout */
.chapter {
  display: grid;
  grid-template-columns: minmax(0, 1.42fr) minmax(0, 1fr);
  column-gap: clamp(36px, 6vw, 84px);
  scroll-margin-top: var(--nav-h);
}

.chapter + .chapter {
  margin-top: clamp(72px, 14vh, 150px);
}

.chapter.flip {
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.42fr);
}

.chapter.flip .stage-col {
  grid-column: 2;
  grid-row: 1;
}

.chapter.flip .copy {
  grid-column: 1;
  grid-row: 1;
}

/* animation */
.stage {
  position: sticky;
  top: calc(var(--nav-h) + (100vh - var(--nav-h) - var(--stage-h)) / 2);
  height: var(--stage-h);
  display: flex;
  flex-direction: column;
  border: 1px solid var(--line);
  border-radius: 24px;
  overflow: hidden;
  background:
    radial-gradient(rgba(104, 88, 232, 0.13) 1px, transparent 1.4px) 0 0 / 22px 22px,
    linear-gradient(160deg, #ffffff 0%, #fbfaff 100%);
  box-shadow: 0 28px 70px rgba(27, 31, 69, 0.1);
  opacity: 0;
  transform: translateY(26px) scale(0.985);
  transition: opacity 0.7s ease, transform 0.9s cubic-bezier(0.2, 0.7, 0.2, 1);
}

.chapter.seen .stage {
  opacity: 1;
  transform: none;
}

.canvas-box {
  position: relative;
  flex: 1 1 0;
  min-height: 0;
  margin: 10px 10px 0;
}

canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  display: block;
}

.ticks {
  flex: 0 0 auto;
  display: flex;
  justify-content: center;
  gap: 6px;
  padding: 10px 0 12px;
}

.tick {
  width: 22px;
  height: 3px;
  border-radius: 3px;
  background: var(--line);
  transition: background 0.35s ease;
}

.tick.on {
  background: var(--accent);
}

/* text */
.copy {
  align-self: center;
  min-width: 0;
}

.chapter-head {
  margin-bottom: 20px;
}

.chapter-num {
  display: block;
  margin-bottom: 8px;
  font-size: 0.86rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  color: var(--accent);
}

.chapter-title {
  margin: 0;
  font-size: clamp(1.9rem, 3vw, 2.7rem);
  font-weight: 750;
  line-height: 1.04;
  letter-spacing: -0.04em;
  color: var(--ink);
}

.chapter-code {
  display: inline-block;
  margin-top: 12px;
  padding: 4px 10px;
  border-radius: 8px;
  font-size: 0.72rem;
  overflow-wrap: anywhere;
  background: color-mix(in srgb, var(--accent) 7%, transparent);
  color: var(--accent);
}

.steps {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.beat {
  display: grid;
  grid-template-columns: 3px minmax(0, 1fr);
  column-gap: 14px;
  width: 100%;
  padding: 8px 8px 8px 0;
  border: 0;
  background: none;
  font: inherit;
  text-align: left;
  color: var(--ink);
  cursor: pointer;
  opacity: 0.42;
  transition: opacity 0.5s ease;
}

.beat:hover,
.beat.active,
.copy.done .beat {
  opacity: 1;
}

.beat:focus-visible {
  outline: 2px solid color-mix(in srgb, var(--accent) 45%, transparent);
  outline-offset: 2px;
  border-radius: 6px;
}

.beat-bar {
  display: block;
  border-radius: 3px;
  background: var(--line);
  overflow: hidden;
}

.beat-fill {
  display: block;
  height: 100%;
  background: var(--accent);
  transform-origin: top center;
  transform: scaleY(0);
}

.beat.active .beat-fill {
  transform: scaleY(var(--fill, 0));
}

.beat.past .beat-fill {
  transform: scaleY(1);
}

.beat-text {
  font-size: clamp(1.02rem, 1.25vw, 1.14rem);
  line-height: 1.45;
  letter-spacing: -0.01em;
}

.mono {
  font-family: 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
}

/* chapter rail, only where the page has spare margin */
.rail {
  position: fixed;
  right: 20px;
  top: 50%;
  z-index: 5;
  display: none;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
  transform: translateY(-50%);
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.3s ease;
}

.rail.shown {
  opacity: 1;
  pointer-events: auto;
}

.rail-item {
  display: flex;
  align-items: center;
  gap: 10px;
  height: 22px;
  padding: 0;
  border: 0;
  background: none;
  color: var(--muted);
  font-size: 0.78rem;
  cursor: pointer;
}

.rail-label {
  opacity: 0;
  transform: translateX(4px);
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.rail-mark {
  display: block;
  width: 14px;
  height: 3px;
  border-radius: 3px;
  background: var(--faint, #c9cde0);
  transition: width 0.25s ease, background 0.25s ease;
}

.rail-item:hover .rail-label,
.rail-item:focus-visible .rail-label,
.rail-item.on .rail-label {
  opacity: 1;
  transform: none;
}

.rail-item.on {
  color: var(--ink);
  font-weight: 650;
}

.rail-item.on .rail-mark {
  width: 28px;
  background: var(--accent);
}

@media (min-width: 1360px) {
  .rail {
    display: flex;
  }
}

/* Stacked layout: the stage pins under the nav and the text passes beneath it. */
@media (max-width: 900px) {
  .story {
    --nav-h: 68px;
    --stage-h: min(46svh, 400px);
  }

  .chapter,
  .chapter.flip {
    display: block;
  }

  .stage-col {
    display: contents;
  }

  .stage {
    top: calc(var(--nav-h) + 8px);
    z-index: 2;
    border-radius: 18px;
    background:
      radial-gradient(rgba(104, 88, 232, 0.13) 1px, transparent 1.4px) 0 0 / 22px 22px,
      #ffffff;
  }

  .canvas-box {
    margin: 6px 6px 0;
  }

  .ticks {
    padding: 6px 0 8px;
  }

  .copy {
    margin-top: 22px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .stage,
  .beat,
  .tick,
  .rail,
  .rail-label,
  .rail-mark {
    transition: none;
  }

  .stage {
    opacity: 1;
    transform: none;
  }
}
</style>
