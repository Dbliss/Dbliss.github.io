<template>
  <svg ref="root" viewBox="0 0 340 130" class="ukf">
    <!-- win / loss rails -->
    <line x1="18" x2="322" :y1="RAIL_WIN" :y2="RAIL_WIN" class="ukf-rail" />
    <line x1="18" x2="322" :y1="RAIL_LOSS" :y2="RAIL_LOSS" class="ukf-rail" />

    <!-- posterior band (mean ± 2σ) -->
    <path :d="bandPath" class="ukf-band" />
    <!-- hidden true skill -->
    <path :d="truePath" class="ukf-true" />
    <!-- filtered mean -->
    <path :d="meanPath" class="ukf-mean" />

    <!-- observed results -->
    <circle
      v-for="o in observed"
      :key="o.t"
      :cx="o.x"
      :cy="o.win ? RAIL_WIN : RAIL_LOSS"
      r="2.6"
      :class="o.win ? 'ukf-win' : 'ukf-loss'"
    />

    <!-- sigma points for the next update -->
    <g v-if="sigma" class="ukf-sigma">
      <line :x1="sigma.x" :x2="sigma.x" :y1="sigma.ys[2]" :y2="sigma.ys[1]" class="ukf-sigma-span" />
      <circle v-for="(y, i) in sigma.ys" :key="i" :cx="sigma.x" :cy="y" :r="i === 0 ? 4 : 3" :class="i === 0 ? 'ukf-sigma-mean' : 'ukf-sigma-pt'" />
    </g>

    <g class="ukf-chip">
      <rect x="14" y="10" width="92" height="22" rx="11" />
      <text x="60" y="25" text-anchor="middle">P(win) {{ pWinLabel }}</text>
    </g>
    <text x="114" y="25" class="ukf-caption">Unscented Kalman filter · team rating</text>
  </svg>
</template>

<script setup>
// A real 1-D unscented Kalman filter: the hidden state is a team's skill (random walk),
// each match is a win/loss with P(win) = sigmoid(k · (skill − opponent)). The filter
// propagates three sigma points through that non-linear observation each step.
import { computed, onBeforeUnmount, onMounted, ref, shallowRef } from 'vue'

const STEPS = 30
const STEP_MS = 650
const HOLD_MS = 2200
const X0 = 22
const X1 = 318
const Y_TOP = 42
const Y_BOT = 100
const RAIL_WIN = 111
const RAIL_LOSS = 119

const root = ref(null)
const run = shallowRef(null)
const step = ref(0)

const sigmoid = (v) => 1 / (1 + Math.exp(-v))

function rng (seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function simulate (seed) {
  const rand = rng(seed)
  const gauss = () => Math.sqrt(-2 * Math.log(rand() + 1e-12)) * Math.cos(2 * Math.PI * rand())
  const K = 1.4 // observation steepness
  const Q = 0.025 // process noise
  // UKF weights for n = 1, alpha = 1, beta = 2, kappa = 2
  const n = 1
  const lambda = 2
  const wm = [lambda / (n + lambda), 1 / (2 * (n + lambda)), 1 / (2 * (n + lambda))]
  const wc = [wm[0] + 2, wm[1], wm[2]]

  let truth = 0.6 + gauss() * 0.3
  let m = 0
  let P = 1
  const out = []

  for (let t = 0; t < STEPS; t += 1) {
    truth += gauss() * Math.sqrt(Q) * 1.4 + (t === 14 ? 0.7 * (rand() < 0.5 ? -1 : 1) : 0) // a mid-season shift
    const opp = gauss() * 0.5

    // predict
    const mPred = m
    const pPred = P + Q
    const spread = Math.sqrt((n + lambda) * pPred)
    const X = [mPred, mPred + spread, mPred - spread]
    const Z = X.map((x) => sigmoid(K * (x - opp)))
    const zHat = Z.reduce((s, z, i) => s + wm[i] * z, 0)
    const R = zHat * (1 - zHat) + 0.02
    const S = Z.reduce((s, z, i) => s + wc[i] * (z - zHat) ** 2, 0) + R
    const C = X.reduce((s, x, i) => s + wc[i] * (x - mPred) * (Z[i] - zHat), 0)

    const win = rand() < sigmoid(K * (truth - opp)) ? 1 : 0
    const gain = C / S
    m = mPred + gain * (win - zHat)
    P = Math.max(pPred - gain * gain * S, 0.004)

    out.push({ t, truth, m, sd: Math.sqrt(P), win, sigma: X, pNext: sigmoid(K * m) })
  }

  const lo = Math.min(...out.map((o) => Math.min(o.truth, o.m - 2 * o.sd)))
  const hi = Math.max(...out.map((o) => Math.max(o.truth, o.m + 2 * o.sd)))
  return { out, lo, hi }
}

const xAt = (t) => X0 + (t / (STEPS - 1)) * (X1 - X0)
const yAt = (v) => {
  const { lo, hi } = run.value
  return Y_BOT - ((v - lo) / (hi - lo || 1)) * (Y_BOT - Y_TOP)
}

const shown = computed(() => (run.value ? run.value.out.slice(0, step.value) : []))

const line = (pts) => pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ')
const meanPath = computed(() => line(shown.value.map((o) => [xAt(o.t), yAt(o.m)])))
const truePath = computed(() => line(shown.value.map((o) => [xAt(o.t), yAt(o.truth)])))
const bandPath = computed(() => {
  const s = shown.value
  if (s.length < 2) return ''
  const up = s.map((o) => [xAt(o.t), yAt(o.m + 2 * o.sd)])
  const dn = s.map((o) => [xAt(o.t), yAt(o.m - 2 * o.sd)]).reverse()
  return `${line(up)} ${dn.map((p) => `L${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ')} Z`
})
const observed = computed(() => shown.value.map((o) => ({ t: o.t, x: xAt(o.t), win: o.win })))

const sigma = computed(() => {
  if (!run.value) return null
  const next = run.value.out[step.value]
  if (!next) return null
  return { x: xAt(next.t), ys: next.sigma.map(yAt) }
})

const pWinLabel = computed(() => {
  const last = shown.value[shown.value.length - 1]
  return `${Math.round((last ? last.pNext : 0.5) * 100)}%`
})

let timer = 0
let seed = 7
let visible = false
let io
const reduceMotion = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

function reset () {
  run.value = simulate(seed)
  seed += 1
  step.value = 1
}

function advance () {
  timer = 0
  if (!visible) return
  if (step.value >= STEPS) {
    timer = setTimeout(() => { reset(); advance() }, HOLD_MS)
    return
  }
  step.value += 1
  timer = setTimeout(advance, STEP_MS)
}

reset()

onMounted(() => {
  if (reduceMotion) {
    step.value = STEPS
    return
  }
  io = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting
    if (visible && !timer) advance()
  })
  io.observe(root.value)
})

onBeforeUnmount(() => {
  clearTimeout(timer)
  io?.disconnect()
})
</script>

<style scoped>
.ukf { width: 100%; height: 100%; display: block; }
.ukf-rail { stroke: rgba(255, 255, 255, .08); stroke-width: 1; }
.ukf-band { fill: rgba(var(--tone-rgb), .38); }
.ukf-true { fill: none; stroke: rgba(255, 255, 255, .35); stroke-width: 1.2; stroke-dasharray: 3 4; }
.ukf-mean { fill: none; stroke: #fff; stroke-width: 2.2; stroke-linejoin: round; stroke-linecap: round; filter: drop-shadow(0 0 4px rgba(var(--tone-rgb), .9)); }
.ukf-win { fill: #7ee2a8; }
.ukf-loss { fill: rgba(255, 255, 255, .35); }
.ukf-sigma circle, .ukf-sigma line { transition: cy .45s ease, y1 .45s ease, y2 .45s ease; }
.ukf-sigma-span { stroke: rgba(255, 255, 255, .4); stroke-width: 1; stroke-dasharray: 2 3; }
.ukf-sigma-pt { fill: none; stroke: #fff; stroke-width: 1.4; }
.ukf-sigma-mean { fill: #fff; filter: drop-shadow(0 0 5px rgba(255, 255, 255, .8)); }
.ukf-chip rect { fill: rgba(255, 255, 255, .1); stroke: rgba(255, 255, 255, .35); }
.ukf-chip text { font: 700 11px/1 system-ui, sans-serif; fill: #fff; }
.ukf-caption { font: 600 8.5px/1 system-ui, sans-serif; fill: rgba(255, 255, 255, .45); letter-spacing: .04em; }
</style>
