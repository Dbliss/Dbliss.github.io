<template>
  <div class="descent" ref="rootEl">
    <!-- Water: WebGL when possible, static gradient for reduced motion / no WebGL -->
    <canvas
      v-if="useWebGL"
      ref="canvasEl"
      class="descent-canvas"
      aria-hidden="true"
    />
    <div v-else class="descent-static" aria-hidden="true" />

    <!-- Depth meter -->
    <div class="depth-meter" aria-hidden="true">
      <span class="meter-value" ref="meterEl">−0 m</span>
      <span class="meter-zone" ref="zoneEl">SURFACE</span>
    </div>

    <!-- Slim persistent nav, appears after the hero -->
    <nav class="descent-nav" :class="{ shown: navShown }" aria-label="Primary">
      <button class="nav-brand" type="button" @click="scrollTop">Dillon Bliss</button>
      <div class="nav-links">
        <RouterLink to="/projects">Projects</RouterLink>
        <RouterLink to="/about">About</RouterLink>
        <RouterLink to="/contact">Contact</RouterLink>
      </div>
    </nav>

    <div class="descent-content">
      <!-- ─── Surface · 0 m ─────────────────────────────────────────── -->
      <section class="hero" data-zone="surface" data-depth="0">
        <p class="hero-kicker">Portfolio</p>
        <h1>Dillon Bliss</h1>
        <p class="hero-role">Software Engineer</p>
        <p class="hero-pitch">
          Building thoughtful software and digital systems
          that solve real problems and create value.
        </p>
        <button class="hero-cta" type="button" @click="beginDescent">
          Explore <span aria-hidden="true">↓</span>
        </button>
      </section>

      <!-- ─── Sunlit zone · −200 m · Chess Engine ───────────────────── -->
      <section class="zone zone-chess" data-zone="chess" data-depth="200" ref="chessSection">
        <div class="zone-inner" ref="chessPin">
          <div class="panel-wrap">
            <article class="panel">
              <p class="zone-kicker">Sunlit zone · −200 m</p>
              <h2>C++ Chess Engine</h2>
              <p class="outcome">
                A from-scratch engine rated over 2000, searching millions of
                positions per second.
              </p>
              <ul class="tags">
                <li>C++</li><li>Game-tree search</li><li>Hashing</li><li>Optimisation</li>
              </ul>
              <RouterLink class="view-link" to="/projects/chessEngine">View project →</RouterLink>
            </article>
          </div>
        </div>
      </section>

      <!-- ─── Twilight zone · −1,000 m · Wealth Pathways ────────────── -->
      <section class="zone" data-zone="wealth" data-depth="1000" ref="wealthSection">
        <div class="zone-inner">
          <div class="panel-wrap">
            <article class="panel">
              <p class="zone-kicker">Twilight zone · −1,000 m</p>
              <h2>Wealth Pathways Workbook</h2>
              <p class="outcome">
                A Monte Carlo calculator that compares rent-and-invest, home
                ownership, and rentvesting for Australians over 10–30 year horizons.
              </p>
              <ul class="tags">
                <li>Vue</li><li>Web Workers</li><li>Monte Carlo</li><li>Finance modelling</li>
              </ul>
              <RouterLink class="view-link" to="/projects/wealth-pathways-au">View project →</RouterLink>
            </article>
          </div>
        </div>
      </section>

      <!-- ─── Midnight zone · −2,500 m · LoL Match Predictor ────────── -->
      <section class="zone" data-zone="predictor" data-depth="2500">
        <div class="zone-inner">
          <div class="panel-wrap">
            <article class="panel">
              <p class="zone-kicker">Midnight zone · −2,500 m</p>
              <h2>LoL Match Predictor</h2>
              <p class="outcome">
                Bayesian player ratings and gradient-boosted models pricing pro
                esports matches — 68% held-out accuracy, calibrated against
                bookmaker odds.
              </p>
              <ul class="tags">
                <li>Python</li><li>scikit-learn</li><li>Bayesian inference</li><li>Calibration</li>
              </ul>
              <RouterLink class="view-link" to="/projects/lol-match-predictor">View project →</RouterLink>
            </article>
          </div>
        </div>
      </section>

      <!-- ─── Abyssal zone · −4,000 m · Sportslux + Booking ─────────── -->
      <section class="zone zone-wide" data-zone="abyssal" data-depth="4000">
        <div class="zone-inner">
          <div class="panel-wrap panel-pair">
            <article class="panel">
              <p class="zone-kicker">Abyssal zone · −4,000 m</p>
              <h2>Sportslux Lighting Optimiser</h2>
              <p class="outcome">
                Optimises pole layouts, fixture mixes, and aiming for compliant
                sports-field lighting, with heatmaps and PDF reports.
              </p>
              <ul class="tags">
                <li>Vue</li><li>Python</li><li>FastAPI</li><li>PostgreSQL</li>
              </ul>
              <RouterLink class="view-link" to="/projects/sportslux">View project →</RouterLink>
            </article>
            <article class="panel">
              <p class="zone-kicker">Abyssal zone · −4,000 m</p>
              <h2>FrontRunner Sports Booking</h2>
              <p class="outcome">
                Multi-tenant booking platform that validates reservations in
                real time and automates lighting schedules through EXEDRA.
              </p>
              <ul class="tags">
                <li>Vue 3</li><li>Node.js</li><li>PostgreSQL</li><li>RBAC</li>
              </ul>
              <RouterLink class="view-link" to="/projects/sports-booking">View project →</RouterLink>
            </article>
          </div>
        </div>
      </section>

      <!-- ─── Hadal zone · −6,000 m · Drone + Asset Integration ─────── -->
      <section class="zone zone-wide" data-zone="hadal" data-depth="6000" ref="hadalSection">
        <div class="zone-inner">
          <div class="panel-wrap panel-pair">
            <article class="panel hadal-card">
              <p class="zone-kicker">Hadal zone · −6,000 m</p>
              <h2>Autonomous Drone Prototype</h2>
              <p class="outcome">
                Custom-built drone with PID control loops and low-latency flight
                software running on a Raspberry Pi.
              </p>
              <ul class="tags">
                <li>Raspberry Pi</li><li>C++</li><li>PID control</li><li>Embedded</li>
              </ul>
              <RouterLink class="view-link" to="/projects/drone">View project →</RouterLink>
            </article>
            <article class="panel hadal-card">
              <p class="zone-kicker">Hadal zone · −6,000 m</p>
              <h2>Asset Data Integration</h2>
              <p class="outcome">
                ETL service that ingests CMS API data, filters and transforms it,
                then syncs an asset-management platform.
              </p>
              <ul class="tags">
                <li>Python</li><li>Node.js</li><li>ETL</li><li>REST APIs</li>
              </ul>
              <RouterLink class="view-link" to="/projects/asset-data-integration">View project →</RouterLink>
            </article>
          </div>
        </div>
      </section>

      <!-- ─── The floor · −10,000 m · Contact ───────────────────────── -->
      <section class="floor" data-zone="floor" data-depth="10000">
        <div class="floor-inner">
          <p class="zone-kicker">The floor · −10,000 m</p>
          <h2>You've reached the bottom.</h2>
          <p class="outcome">The next project could start here.</p>
          <div class="floor-links">
            <a class="floor-btn primary" :href="`mailto:${email}?subject=Project%20inquiry`">Email me</a>
            <a
              v-for="s in socials"
              :key="s.label"
              class="floor-btn"
              :href="s.href"
              target="_blank"
              rel="noreferrer noopener"
            >{{ s.label }} ↗</a>
            <a class="floor-btn" href="resume.pdf" download>Résumé ↓</a>
          </div>
          <RouterLink class="city-tile" to="/city">
            <span class="city-tile-label">Exhibit</span>
            <span class="city-tile-title">Explore the 3D city</span>
            <span class="city-tile-sub">My previous homepage, kept as an exhibit →</span>
          </RouterLink>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Lenis from 'lenis'
import { socials } from '../data/socials'
import { createDescentScene } from '../descent/descentScene'

const email = 'dillon.bliss@outlook.com'

const rootEl = ref(null)
const canvasEl = ref(null)
const meterEl = ref(null)
const zoneEl = ref(null)
const chessSection = ref(null)
const chessPin = ref(null)
const wealthSection = ref(null)
const hadalSection = ref(null)
const navShown = ref(false)

const prefersReduced =
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches
const isMobile =
  typeof window !== 'undefined' &&
  (window.matchMedia('(max-width: 720px)').matches ||
    window.matchMedia('(pointer: coarse)').matches)

const useWebGL = ref(!prefersReduced)

let scene = null
let lenis = null
let tickFn = null
let anchors = []

const ZONE_LABELS = [
  [100, 'SURFACE'],
  [600, 'SUNLIT ZONE'],
  [1800, 'TWILIGHT ZONE'],
  [3200, 'MIDNIGHT ZONE'],
  [5000, 'ABYSSAL ZONE'],
  [9200, 'HADAL ZONE'],
  [Infinity, 'THE FLOOR']
]

function updateMeter(d) {
  if (!meterEl.value) return
  meterEl.value.textContent = `−${Math.round(d).toLocaleString('en-US')} m`
  for (const [max, label] of ZONE_LABELS) {
    if (d < max) {
      if (zoneEl.value.textContent !== label) zoneEl.value.textContent = label
      break
    }
  }
}

function depthFromProgress(p) {
  if (!anchors.length) return p * 10000
  const list = [{ frac: 0, depth: 0 }, ...anchors, { frac: 1, depth: 10000 }]
  for (let i = 1; i < list.length; i++) {
    if (p <= list[i].frac || i === list.length - 1) {
      const a = list[i - 1]
      const b = list[i]
      const t = b.frac === a.frac ? 0 : (p - a.frac) / (b.frac - a.frac)
      return a.depth + (b.depth - a.depth) * Math.max(0, Math.min(1, t))
    }
  }
  return 0
}

function computeAnchors() {
  const vh = window.innerHeight
  const maxScroll = document.documentElement.scrollHeight - vh
  if (maxScroll <= 0) return
  anchors = []
  rootEl.value.querySelectorAll('[data-zone]').forEach((el) => {
    const name = el.dataset.zone
    if (name === 'surface') return
    const center = el.offsetTop + el.offsetHeight / 2 - vh / 2
    anchors.push({
      name,
      frac: Math.max(0, Math.min(1, center / maxScroll)),
      depth: Number(el.dataset.depth)
    })
  })
  anchors.sort((a, b) => a.frac - b.frac)
  if (scene) scene.setAnchors(anchors)
}

function beginDescent() {
  const target = chessSection.value
  if (lenis) lenis.scrollTo(target, { offset: -window.innerHeight * 0.1, duration: 2.2 })
  else target.scrollIntoView({ behavior: 'smooth' })
}

function scrollTop() {
  if (lenis) lenis.scrollTo(0, { duration: 1.6 })
  else window.scrollTo({ top: 0, behavior: 'smooth' })
}

// Reduced-motion / no-WebGL path: plain scroll listener drives meter + nav.
function onPlainScroll() {
  const maxScroll = document.documentElement.scrollHeight - window.innerHeight
  const p = maxScroll > 0 ? window.scrollY / maxScroll : 0
  updateMeter(depthFromProgress(p))
  navShown.value = window.scrollY > window.innerHeight * 0.6
}

onMounted(async () => {
  await nextTick()

  if (useWebGL.value) {
    try {
      scene = createDescentScene(canvasEl.value, {
        mobile: isMobile,
        onDepth: updateMeter
      })
    } catch (e) {
      console.warn('WebGL unavailable, falling back to static descent', e)
      useWebGL.value = false
      scene = null
    }
  }

  if (!scene) {
    // static gradient + native scrolling; content is fully accessible
    computeAnchors()
    window.addEventListener('scroll', onPlainScroll, { passive: true })
    window.addEventListener('resize', computeAnchors)
    onPlainScroll()
    return
  }

  scene.resize(window.innerWidth, window.innerHeight)
  scene.start()

  gsap.registerPlugin(ScrollTrigger)

  lenis = new Lenis({ duration: 1.15 })
  lenis.on('scroll', ScrollTrigger.update)
  tickFn = (time) => lenis.raf(time * 1000)
  gsap.ticker.add(tickFn)
  gsap.ticker.lagSmoothing(0)

  computeAnchors()
  ScrollTrigger.addEventListener('refresh', computeAnchors)

  // master: scroll → depth
  ScrollTrigger.create({
    start: 0,
    end: () => document.documentElement.scrollHeight - window.innerHeight,
    onUpdate: (self) => {
      scene.setProgress(self.progress)
      navShown.value = self.scroll() > window.innerHeight * 0.6
    }
  })

  // panels: reveal + gentle parallax (content drifts slightly faster than water)
  rootEl.value.querySelectorAll('.zone').forEach((sec) => {
    const wrap = sec.querySelector('.panel-wrap')
    const panels = sec.querySelectorAll('.panel')
    if (sec !== chessSection.value) {
      gsap.fromTo(
        wrap,
        { y: '7vh' },
        {
          y: '-7vh',
          ease: 'none',
          scrollTrigger: { trigger: sec, start: 'top bottom', end: 'bottom top', scrub: true }
        }
      )
    }
    // opacity (not autoAlpha): hidden panels must stay readable to screen readers
    gsap.fromTo(
      panels,
      { opacity: 0, y: 44 },
      {
        opacity: 1,
        y: 0,
        duration: 1.2,
        stagger: 0.15,
        ease: 'power2.out',
        scrollTrigger: { trigger: sec, start: 'top 62%', toggleActions: 'play none none reverse' }
      }
    )
  })

  // chess panel docks: brief pin while the knight turns
  ScrollTrigger.create({
    trigger: chessSection.value,
    start: 'center center',
    end: '+=32%',
    pin: chessPin.value,
    pinSpacing: false,
    anticipatePin: 1
  })

  // fish school forms the line chart while the wealth panel is centred
  ScrollTrigger.create({
    trigger: wealthSection.value,
    start: 'top 85%',
    end: 'bottom 15%',
    onUpdate: (self) => {
      const p = self.progress
      const ramp = (x, a, b) => Math.max(0, Math.min(1, (x - a) / (b - a)))
      scene.setFishForm(ramp(p, 0.12, 0.42) * (1 - ramp(p, 0.68, 0.95)))
    },
    onLeave: () => scene.setFishForm(0),
    onLeaveBack: () => scene.setFishForm(0)
  })

  // hadal cards get swept by the searchlight as they enter
  hadalSection.value.querySelectorAll('.hadal-card').forEach((card, i) => {
    ScrollTrigger.create({
      trigger: card,
      start: 'top 78%',
      onEnter: () => {
        card.classList.remove('lit')
        // restart the sweep animation
        void card.offsetWidth
        setTimeout(() => card.classList.add('lit'), i * 350)
      },
      onLeaveBack: () => card.classList.remove('lit')
    })
  })

  window.addEventListener('resize', onResize)
  updateMeter(0)
})

function onResize() {
  if (scene) scene.resize(window.innerWidth, window.innerHeight)
}

onBeforeUnmount(() => {
  window.removeEventListener('resize', onResize)
  window.removeEventListener('scroll', onPlainScroll)
  window.removeEventListener('resize', computeAnchors)
  if (scene) {
    ScrollTrigger.removeEventListener('refresh', computeAnchors)
    ScrollTrigger.getAll().forEach((t) => t.kill())
    if (tickFn) gsap.ticker.remove(tickFn)
    if (lenis) lenis.destroy()
    scene.dispose()
    scene = null
  }
})
</script>

<style scoped>
.descent {
  position: relative;
  color: #e8f4f8;
  font-family: 'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif;
}

/* ── water layers ─────────────────────────────────────────────────── */
.descent-canvas {
  position: fixed;
  inset: 0;
  width: 100%;
  height: 100%;
  z-index: 0;
  display: block;
}

.descent-static {
  position: fixed;
  inset: 0;
  z-index: 0;
  background:
    linear-gradient(to bottom, transparent 0 62%, rgba(2, 16, 31, 0.32) 100%),
    url('/images/descent/sequence-v2/0.png') center / cover no-repeat;
}

.descent-content {
  position: relative;
  z-index: 1;
}

/* ── depth meter ──────────────────────────────────────────────────── */
.depth-meter {
  position: fixed;
  right: clamp(14px, 3vw, 34px);
  bottom: clamp(14px, 3vh, 30px);
  z-index: 5;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 3px;
  font-family: ui-monospace, 'Cascadia Code', 'SF Mono', Menlo, Consolas, monospace;
  pointer-events: none;
  text-shadow: 0 1px 8px rgba(0, 0, 0, 0.8);
}

.meter-value {
  font-size: clamp(15px, 1.6vw, 19px);
  letter-spacing: 0.06em;
  color: #cfeef5;
  font-variant-numeric: tabular-nums;
}

.meter-zone {
  font-size: 10px;
  letter-spacing: 0.28em;
  color: rgba(160, 215, 230, 0.55);
}

/* ── nav ──────────────────────────────────────────────────────────── */
.descent-nav {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 6;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px clamp(18px, 4vw, 40px);
  background: rgba(2, 10, 20, 0.42);
  backdrop-filter: blur(12px) saturate(1.2);
  -webkit-backdrop-filter: blur(12px) saturate(1.2);
  border-bottom: 1px solid rgba(150, 215, 235, 0.1);
  transform: translateY(-110%);
  opacity: 0;
  transition: transform 0.45s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.45s ease;
}

.descent-nav.shown {
  transform: translateY(0);
  opacity: 1;
}

.nav-brand {
  background: none;
  border: 0;
  color: #dff3f8;
  font: inherit;
  font-size: 14px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  cursor: pointer;
  padding: 4px 0;
}

.nav-links {
  display: flex;
  gap: clamp(16px, 3vw, 34px);
}

.nav-links a {
  color: rgba(210, 236, 244, 0.78);
  text-decoration: none;
  font-size: 13px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  transition: color 0.25s ease;
}

.nav-links a:hover,
.nav-links a:focus-visible {
  color: #ffffff;
}

.nav-brand:focus-visible,
.nav-links a:focus-visible,
.view-link:focus-visible,
.floor-btn:focus-visible,
.city-tile:focus-visible,
.hero-cta:focus-visible {
  outline: 2px solid rgba(140, 220, 245, 0.85);
  outline-offset: 3px;
  border-radius: 4px;
}

/* ── hero ─────────────────────────────────────────────────────────── */
.hero {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  /* extra bottom padding keeps the CTA clear of the boat on the waterline */
  padding: 0 20px 17vh;
  color: #f8fbfc;
  text-shadow: 0 1px 18px rgba(24, 59, 75, 0.24);
}

.hero-kicker {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.44em;
  text-transform: uppercase;
  color: rgba(247, 251, 252, 0.92);
  margin: 0 0 24px;
}

.hero h1 {
  font-family: Georgia, 'Times New Roman', serif;
  font-size: clamp(46px, 5.2vw, 72px);
  font-weight: 400;
  line-height: 0.98;
  letter-spacing: -0.025em;
  margin: 0;
  color: #ffffff;
  text-shadow: 0 2px 28px rgba(32, 69, 84, 0.28);
}

.hero-role {
  font-size: clamp(12px, 1.25vw, 15px);
  font-weight: 400;
  letter-spacing: 0.34em;
  color: rgba(248, 252, 253, 0.94);
  margin: 25px 0 0;
}

.hero-pitch {
  max-width: 430px;
  margin: 29px 0 0;
  font-size: clamp(13px, 1.1vw, 15px);
  line-height: 1.72;
  color: rgba(247, 251, 252, 0.88);
}

.hero-cta {
  margin-top: 39px;
  min-width: 178px;
  padding: 14px 30px;
  font: inherit;
  font-size: 12px;
  letter-spacing: 0.2em;
  color: #ffffff;
  background: rgba(113, 150, 165, 0.12);
  border: 1px solid rgba(255, 255, 255, 0.58);
  border-radius: 999px;
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  cursor: pointer;
  transition: background 0.3s ease, border-color 0.3s ease, transform 0.3s ease;
}

.hero-cta:hover {
  background: rgba(10, 40, 60, 0.55);
  border-color: rgba(190, 240, 252, 0.6);
  transform: translateY(2px);
}

.hero-cta span {
  display: inline-block;
  margin-left: 6px;
  animation: bob 2.4s ease-in-out infinite;
}

@keyframes bob {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(4px); }
}

@media (prefers-reduced-motion: reduce) {
  .hero-cta span { animation: none; }
}

/* ── zones & panels ───────────────────────────────────────────────── */
.zone {
  min-height: 150vh;
  display: flex;
  align-items: center;
  padding: 25vh clamp(18px, 5vw, 72px);
  box-sizing: border-box;
}

.zone-inner {
  width: 100%;
  display: flex;
  justify-content: flex-end;
}

.zone-wide .zone-inner {
  justify-content: center;
}

.panel-wrap {
  width: min(460px, 100%);
}

.panel-pair {
  width: min(980px, 100%);
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: clamp(16px, 2.5vw, 30px);
}

.panel {
  position: relative;
  overflow: hidden;
  padding: clamp(22px, 3vw, 34px);
  border-radius: 18px;
  background: rgba(6, 18, 30, 0.38);
  border: 1px solid rgba(165, 225, 245, 0.16);
  box-shadow: 0 22px 60px rgba(0, 2, 6, 0.5);
  backdrop-filter: blur(16px) saturate(1.25);
  -webkit-backdrop-filter: blur(16px) saturate(1.25);
}

.zone-kicker {
  font-family: ui-monospace, Menlo, Consolas, monospace;
  font-size: 10.5px;
  letter-spacing: 0.3em;
  text-transform: uppercase;
  color: rgba(150, 216, 232, 0.62);
  margin: 0 0 14px;
}

.panel h2 {
  font-size: clamp(21px, 2.4vw, 27px);
  font-weight: 620;
  letter-spacing: -0.01em;
  margin: 0 0 12px;
  color: #f2fbfd;
}

.outcome {
  font-size: 14.5px;
  line-height: 1.65;
  color: rgba(210, 235, 242, 0.82);
  margin: 0 0 18px;
}

.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  list-style: none;
  padding: 0;
  margin: 0 0 20px;
}

.tags li {
  font-family: ui-monospace, Menlo, Consolas, monospace;
  font-size: 10.5px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: rgba(178, 228, 240, 0.75);
  padding: 5px 10px;
  border: 1px solid rgba(150, 215, 235, 0.18);
  border-radius: 999px;
  background: rgba(10, 30, 46, 0.3);
}

.view-link {
  display: inline-block;
  font-size: 13.5px;
  letter-spacing: 0.08em;
  color: #9fe3f2;
  text-decoration: none;
  border-bottom: 1px solid rgba(140, 215, 235, 0.35);
  padding-bottom: 2px;
  transition: color 0.25s ease, border-color 0.25s ease;
}

.view-link:hover {
  color: #ffffff;
  border-color: rgba(230, 250, 255, 0.7);
}

/* hadal cards: searchlight sweep when they enter view */
.hadal-card::after {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: linear-gradient(
    115deg,
    transparent 30%,
    rgba(190, 235, 252, 0.14) 46%,
    rgba(220, 245, 255, 0.22) 50%,
    rgba(190, 235, 252, 0.14) 54%,
    transparent 70%
  );
  transform: translateX(-130%);
  opacity: 0;
}

.hadal-card.lit::after {
  animation: sweep 1.8s cubic-bezier(0.4, 0, 0.2, 1) forwards;
}

@keyframes sweep {
  0% { transform: translateX(-130%); opacity: 1; }
  85% { opacity: 1; }
  100% { transform: translateX(130%); opacity: 0; }
}

@media (prefers-reduced-motion: reduce) {
  .hadal-card.lit::after { animation: none; }
}

/* ── the floor ────────────────────────────────────────────────────── */
.floor {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 12vh 20px;
  box-sizing: border-box;
}

.floor-inner {
  max-width: 560px;
}

.floor h2 {
  font-size: clamp(26px, 3.4vw, 38px);
  font-weight: 640;
  margin: 0 0 10px;
  color: #f4fcfe;
}

.floor .outcome {
  margin-bottom: 30px;
}

.floor-links {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  justify-content: center;
}

.floor-btn {
  padding: 11px 22px;
  font-size: 12.5px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: rgba(220, 244, 250, 0.88);
  text-decoration: none;
  border: 1px solid rgba(160, 222, 240, 0.28);
  border-radius: 999px;
  background: rgba(8, 24, 38, 0.35);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  transition: background 0.25s ease, border-color 0.25s ease;
}

.floor-btn:hover {
  background: rgba(14, 42, 62, 0.6);
  border-color: rgba(200, 240, 252, 0.55);
}

.floor-btn.primary {
  background: rgba(120, 210, 235, 0.16);
  border-color: rgba(170, 230, 248, 0.5);
  color: #ffffff;
}

.city-tile {
  display: block;
  margin: 46px auto 0;
  max-width: 380px;
  padding: 18px 22px;
  text-align: left;
  text-decoration: none;
  border-radius: 14px;
  border: 1px solid rgba(150, 215, 235, 0.16);
  background: rgba(6, 18, 30, 0.35);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  transition: border-color 0.25s ease, background 0.25s ease;
}

.city-tile:hover {
  border-color: rgba(190, 235, 250, 0.4);
  background: rgba(10, 30, 46, 0.5);
}

.city-tile-label {
  display: block;
  font-family: ui-monospace, Menlo, Consolas, monospace;
  font-size: 10px;
  letter-spacing: 0.3em;
  text-transform: uppercase;
  color: rgba(150, 216, 232, 0.55);
  margin-bottom: 6px;
}

.city-tile-title {
  display: block;
  font-size: 16.5px;
  font-weight: 600;
  color: #eaf8fc;
}

.city-tile-sub {
  display: block;
  margin-top: 4px;
  font-size: 13px;
  color: rgba(200, 230, 240, 0.6);
}

/* ── mobile ───────────────────────────────────────────────────────── */
@media (max-width: 720px) {
  .zone {
    padding-left: 16px;
    padding-right: 16px;
  }

  .zone-inner {
    justify-content: center;
  }

  .panel-wrap {
    width: 100%;
  }

  .panel-pair {
    grid-template-columns: 1fr;
    width: 100%;
  }

  .nav-links {
    gap: 18px;
  }

  .nav-links a {
    font-size: 12px;
  }
}
</style>
