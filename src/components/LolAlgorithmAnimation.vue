<template>
  <figure
    ref="root"
    class="lol-anim"
    tabindex="0"
    aria-label="Looping animation of the prediction pipeline. Each step repeats while you read. Use the left and right arrow keys to move between steps."
    @keydown.right.prevent="next"
    @keydown.left.prevent="back"
  >
    <nav class="chapters" role="tablist" aria-label="Algorithm stages">
      <button
        v-for="(s, i) in SCENES"
        :key="s.short"
        type="button"
        role="tab"
        class="chapter"
        :class="{ active: i === scene, done: i < scene }"
        :aria-selected="i === scene"
        @click="goTo(i)"
      >
        <span class="track"><span class="fill" :style="{ transform: `scaleX(${i === scene ? progress : i < scene ? 1 : 0})` }" /></span>
        <span class="num mono">{{ String(i + 1).padStart(2, '0') }}</span>
        <span class="label">{{ s.short }}</span>
      </button>
    </nav>

    <div ref="wrap" class="stage">
      <canvas ref="canvas" role="img" :aria-label="`${SCENES[scene].title}. ${beatText}`" />
    </div>

    <div class="reader">
      <button
        class="nav-btn back"
        type="button"
        :disabled="scene === 0 && beat === 0"
        aria-label="Previous step"
        @click="back"
      >
        <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M12.5 4.5 7 10l5.5 5.5" /></svg>
      </button>

      <div class="say-wrap" aria-live="polite">
        <div class="say-meta mono">
          <span>{{ String(scene + 1).padStart(2, '0') }} · {{ SCENES[scene].title }}</span>
          <span v-if="SCENES[scene].beats.length > 1" class="count">step {{ beat + 1 }} / {{ SCENES[scene].beats.length }}</span>
        </div>
        <Transition name="say" mode="out-in">
          <p :key="`${scene}-${beat}`" class="say">{{ beatText }}</p>
        </Transition>
      </div>

      <button
        class="nav-btn next"
        type="button"
        :aria-label="nextLabel"
        @click="next"
      >
        <span class="next-label">{{ nextLabel }}</span>
        <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M7.5 4.5 13 10l-5.5 5.5" /></svg>
      </button>
    </div>

    <div class="foot">
      <div v-if="SCENES[scene].beats.length > 1" class="beats" role="group" aria-label="Steps in this stage">
        <button
          v-for="(b, i) in SCENES[scene].beats"
          :key="i"
          type="button"
          class="beat-dot"
          :class="{ active: i === beat, done: i < beat }"
          :aria-label="`Go to step ${i + 1}`"
          @click="seekBeat(i)"
        />
      </div>
      <code class="cap-code">{{ SCENES[scene].code }}</code>
    </div>
  </figure>
</template>

<script setup>
// Step-through walk-through of the LoLPredictor pipeline (github.com/Dbliss/LoLPredictor), told
// through one example match, T1 vs Gen.G, following T1's mid laner first:
// Oracle's Elixir rows -> per-role LightGBM performance_score -> skill EMAs -> player UKF
// (Merwe sigma points, h = sigmoid((sA - sB) / 400), perf mover) -> lane edges -> LightGBM
// -> calibration -> de-vigged market + quarter Kelly. Two wider stages follow ratings.py: how one rating
// is carried over a career (idle variance by tier, transfers, region offsets) and how the same ratings
// price every team against every other (team_ratings, win_prob_matrix, bestof_prob).
// Numbers are illustrative; shapes follow the code.
// Each caption stays in place while its animation loops; Next advances immediately.
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

// ---------- palette (matches the site's light theme) ----------
const C = {
  ink: '#111632',
  muted: '#626980',
  dim: '#8a90ad',
  faint: '#c9cde0',
  t1: '#e4002b',
  gen: '#c08a12',
  accent: '#1aa3c2',
  hi: '#6858e8',
  green: '#0e9f6e',
  pink: '#d63d8f',
  surface: '#ffffff',
  track: 'rgba(17,22,50,0.07)'
}

// ---------- math ----------
const TAU = Math.PI * 2
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v))
const lerp = (a, b, t) => a + (b - a) * t
const seg = (p, a, b) => clamp((p - a) / (b - a))
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
const easeOut = (t) => 1 - Math.pow(1 - t, 3)
const backOut = (t) => { const c = 1.70158; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2) }
const sigmoid = (v) => 1 / (1 + Math.exp(-v))
const signed = (n, d = 0) => (n > 0 ? '+' : n < 0 ? '−' : '') + Math.abs(n).toFixed(d)
const pct = (v) => `${Math.round(v * 100)}%`

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

// ---------- example match: T1 vs Gen.G ----------
const ROLES = ['TOP', 'JNG', 'MID', 'BOT', 'SUP']
const ROLE_NAMES = ['Top', 'Jungle', 'Mid', 'Bottom', 'Support']
const roleLabel = (i) => (NARROW ? ROLES[i] : ROLE_NAMES[i])
const SPOT = { ti: 0, i: 2 } // T1 mid is the worked example
const STATS = [
  { short: 'money', tiny: 'MON', fmt: (v) => signed(Math.round((v - 0.5) * 1600)) },
  { short: 'experience', tiny: 'EXP', fmt: (v) => signed(Math.round((v - 0.5) * 1000)) },
  { short: 'farm', tiny: 'FARM', fmt: (v) => signed(Math.round((v - 0.5) * 40)) },
  { short: 'vision/min', tiny: 'VIS', fmt: (v) => (0.7 + v * 2.6).toFixed(2) }
]
// code name -> plain-English label shown on the canvas
const FEATS = [
  ['elo_edge', 'Team rating gap'],
  ['mid_perfL_edge', 'Mid long-term form'],
  ['jng_elo_diff', 'Jungle rating gap'],
  ['sup_elo_diff', 'Support rating gap'],
  ['bot_vision_edge', 'Bottom vision gap'],
  ['top_consistency_ctx', 'Top consistency gap'],
  ['var_edge', 'Rating certainty gap'],
  ['mid_perfS_edge', 'Mid recent form']
]
// performance_score, as in performance_gbm/*_lightgbm.py: each stage's prediction becomes a
// percentile against everyone else in that position, weighted 35/25/40 into a 0-100 score, then
// centred on the average of the two players in that position in the same game.
const STAGE_W = [0.35, 0.25, 0.4]
const SPOT_PCT = [84, 71, 78] // T1 mid's early / middle / late percentiles
const SPOT_COMP = STAGE_W.reduce((s, w, k) => s + w * SPOT_PCT[k], 0) // ≈ 78.4
const OPP_COMP = 41.6 // Gen.G mid's weighted score
const GAME_AVG = (SPOT_COMP + OPP_COMP) / 2 // the "expected" score for this position in this game
const PERF_SCALE = 30 // internal perf (−1..1) × 30 = displayed score points
function ordinal (n) {
  const t = n % 100
  if (t >= 11 && t <= 13) return `${n}th`
  return `${n}${({ 1: 'st', 2: 'nd', 3: 'rd' })[n % 10] || 'th'}`
}

function makeMatch () {
  const r = rng(20260611)
  const g = () => Math.sqrt(-2 * Math.log(r() + 1e-12)) * Math.cos(TAU * r())

  const players = [0, 1].map((ti) => {
    const sgn = ti === 0 ? 1 : -1
    return ROLES.map((role) => ({
      role,
      mu: 1500 + sgn * 25 + g() * 40,
      sig: 55 + r() * 45,
      perf: clamp(g() * 0.4 + sgn * 0.12, -0.9, 0.9),
      leaves: [r() * 8 | 0, r() * 8 | 0, r() * 8 | 0],
      stats: []
    }))
  })
  for (let i = 0; i < 5; i++) {
    for (let j = 0; j < 3; j++) {
      const v = clamp(0.56 + g() * 0.16, 0.08, 0.92)
      players[0][i].stats[j] = v
      players[1][i].stats[j] = 1 - v
    }
    players[0][i].stats[3] = 0.15 + r() * 0.8
    players[1][i].stats[3] = 0.15 + r() * 0.8
  }
  Object.assign(players[0][2], { stats: [0.7575, 0.76, 0.725, 0.277], perf: (SPOT_COMP - GAME_AVG) / PERF_SCALE, sig: 68, leaves: [5, 6, 4] })
  players[1][2].stats = [0.2425, 0.24, 0.275, 0.52]
  // scores are centred per position within a game, so opposite numbers always mirror each other
  for (let i = 0; i < 5; i++) players[1][i].perf = -players[0][i].perf

  const teamMean = (ti) => players[ti].reduce((s, p) => s + p.mu, 0) / 5
  const shift = (45 - (teamMean(0) - teamMean(1))) / 2
  players[0].forEach((p) => { p.mu += shift })
  players[1].forEach((p) => { p.mu -= shift })
  const D = teamMean(0) - teamMean(1)

  const hist = [0, 1].map(() => {
    const base = Array.from({ length: 5 }, () => 0.35 + r() * 0.5)
    return Array.from({ length: 16 }, () => base.map((v) => clamp(v + g() * 0.17, 0.1, 1)))
  })
  const ema = hist.map((h) => {
    const out = [h[0].slice()]
    for (let k = 1; k < h.length; k++) out.push(out[k - 1].map((e, a) => e + (2 / 6) * (h[k][a] - e)))
    return out
  })

  const sp = [{ ti: -1, i: -1, s: 0, d: D, w: 0.3 }]
  for (let ti = 0; ti < 2; ti++) {
    for (let i = 0; i < 5; i++) {
      for (const s of [-1, 1]) {
        sp.push({ ti, i, s, d: D + (ti ? -1 : 1) * s * players[ti][i].sig * 2.1, w: 0.7 / 20 })
      }
    }
  }
  const phat = sp.reduce((acc, q) => acc + q.w * sigmoid(q.d / 400), 0)
  const innov = 1 - phat
  for (let ti = 0; ti < 2; ti++) {
    for (const p of players[ti]) {
      p.mu1 = p.mu + (ti ? -1 : 1) * innov * p.sig * 0.9
      p.sig1 = p.sig * 0.76
      p.mu2 = p.mu1 + p.perf * 18
    }
  }

  const feats = FEATS.map(([code, name]) => ({ code, name, v: clamp(g() * 0.3 + 0.06, -0.85, 0.85) }))
  feats[0].v = clamp(D / 170, -1, 1)
  feats[1].v = 0.55
  feats[6].v = -0.18
  const pCal = 0.58
  const pRaw = 0.61
  const logit = Math.log(pRaw / (1 - pRaw))
  const wts = [1.6, ...Array.from({ length: 5 }, () => 0.4 + r() * 0.6)]
  const wsum = wts.reduce((a, b) => a + b, 0)
  const noise = wts.map((_, k) => (k === 0 ? 0.12 : (r() - 0.5) * 0.35))
  const nmean = noise.reduce((a, b) => a + b, 0) / 6
  const forest = wts.map((w, k) => ({
    leaf: r() * 8 | 0,
    val: (w / wsum) * logit + noise[k] - nmean,
    src: [r() * 8 | 0, r() * 8 | 0, r() * 8 | 0]
  }))
  forest[0].src = [0, 1, 6]
  forest[0].leaf = 6
  const questions = [
    { f: 0, thr: 0.12, yes: true },
    { f: 1, thr: 0.2, yes: true },
    { f: 6, thr: 0.1, yes: false }
  ]

  const ph = r() * TAU
  const bins = Array.from({ length: 12 }, (_, i) => {
    const c = (i + 0.5) / 12
    return 0.35 + 0.65 * Math.exp(-(((c - 0.5) / 0.24) ** 2)) + r() * 0.18
  })

  const posSkills = ROLES.map((_, i) => [0, 1].map((ti) => (i === 2 ? ema[ti][15].slice() : Array.from({ length: 5 }, () => 0.3 + r() * 0.6))))

  return {
    tag: ['T1', 'GEN'],
    name: ['T1', 'Gen.G'],
    color: [C.t1, C.gen],
    players, hist, ema, posSkills, sp, D, phat, blueWin: true, feats, forest, questions, logit, pRaw, pCal, pm: 0.53, ph, bins
  }
}

function kellyOf (M) {
  const edge = M.pCal - M.pm
  const side = edge >= 0 ? 0 : 1
  const pp = side ? 1 - M.pCal : M.pCal
  const pq = side ? 1 - M.pm : M.pm
  return { edge, side, bet: Math.abs(edge) > 0.015, stake: Math.max(0, (pp - pq) / (1 - pq)) / 4 }
}

const match = makeMatch()
const spot = match.players[SPOT.ti][SPOT.i]

// ---------- script ----------
const SCENES = [
  {
    short: 'The match',
    title: 'Two teams, five roles',
    code: 'TOP / JNG / MID / BOT / SUP',
    beats: [
      { at: 0, t: () => 'Five players face five opponents, then take their positions: Top, Jungle, Mid, and the Bot-Support duo. Each player then moves into their role row, ready for match data.' }
    ]
  },
  {
    short: 'Match data',
    title: 'Match data',
    code: 'golddiffat15 · xpdiffat15 · csdiffat15 · vspm',
    beats: [
      { at: 0.05, t: () => 'Start with one T1 player. Each metric flows into the player’s card and fills its corresponding bar.' },
      { at: 0.48, t: () => 'The other nine players follow. Metrics flow into every player card, producing ten clean stat lines, ready to score.' }
    ]
  },
  {
    short: 'Performance',
    title: 'Performance scores',
    code: 'performance_score = f_position(early, middle, late) − expected',
    beats: [
      { at: 0, t: () => 'Different roles have different jobs. For a fair comparison, players are scored within their role, separately for early, middle and late game.' },
      { at: 0.06, t: () => `The early-game model ranks them against every other mid player: ${ordinal(SPOT_PCT[0])} percentile.` },
      { at: 0.2, t: () => `The middle and late stages are ranked the same way: ${ordinal(SPOT_PCT[1])} and ${ordinal(SPOT_PCT[2])} percentile.` },
      { at: 0.42, t: () => `Weighted together that’s ${Math.round(SPOT_COMP)}, against ${Math.round(OPP_COMP)} for Gen.G’s mid. Expected is the average of the two (${Math.round(GAME_AVG)}), so T1’s mid scores ${signed(spot.perf * PERF_SCALE, 0)}.` },
      { at: 0.52, t: () => 'Every player is scored against their opposite number. Green is above expected and pink is below.' }
    ]
  },
  {
    short: 'Skills',
    title: 'Skill profiles',
    code: 'vision = z(wpm) + z(wcpm) + 0.5·z(vspm)   ·   EMA span 5',
    beats: [
      { at: 0, t: () => 'Each player also gets five skill scores.' },
      { at: 0.12, t: () => 'Each faint outline is one game, and single games are noisy.' },
      { at: 0.4, t: () => 'The bold shape is a running average, so it follows form rather than flukes.' },
      { at: 0.76, t: () => 'The same is done for every position, so all five match-ups can be compared.' }
    ]
  },
  {
    short: 'Ratings',
    title: 'Player ratings',
    code: 'h(x) = σ((s̄T1 − s̄GEN) / 400)   ·   Δμ += performance_score / 30',
    beats: [
      { at: 0, t: () => 'Each player’s skill is a range, not a single number, so the filter samples points across each range.' },
      { at: 0.28, t: () => 'Each point is run through a win curve.' },
      { at: 0.48, t: () => `Together they predict ${pct(match.phat)} for T1, close to a coin flip.` },
      { at: 0.56, t: () => 'T1 wins. The gap between the prediction and the result is the surprise.' },
      { at: 0.62, t: () => 'Ratings shift by the surprise and become more certain.' },
      { at: 0.84, t: () => 'Each player’s individual performance in the game then shifts their rating up or down.' }
    ]
  },
  {
    short: 'Over time',
    title: 'Ratings over time',
    code: 'σ² += q_day · idle days · tier (×1 · ×1.5 · ×2)',
    beats: [
      { at: 0, t: () => `Ratings are never rebuilt from scratch. A new player starts at their league’s average with a wide band (± ${Math.round(TL.sd0)}), and carries one rating forward from there.` },
      { at: 0.22, t: () => 'Each game updates the team’s rating. Over a season, confidence grows and the uncertainty band narrows.' },
      { at: 0.45, t: () => `Time off widens it again. Uncertainty grows every idle day, twice as fast in tier-2 leagues, so this break takes it back to ± ${Math.round(TL.sdIdle)}.` },
      { at: 0.66, t: () => 'League offsets are learned separately and only move in cross-region games like MSI and Worlds, when the leagues actually meet.' }
    ]
  },
  {
    short: 'Prediction',
    title: 'Prediction',
    code: 'elo_edge · mid_perfL_edge · sup_elo_diff · bot_vision_edge · …',
    beats: [
      { at: 0, t: () => 'Everything becomes head-to-head gaps between the teams.' },
      { at: 0.2, t: () => 'The team rating gap is the strongest signal.' },
      { at: 0.28, t: () => 'The model uses 400 trees. Each asks a few yes/no questions about the gaps between teams.' },
      { at: 0.46, t: () => `Tree 1 lands on ${signed(match.forest[0].val, 2)}. Each later tree corrects the ones before it.` },
      { at: 0.68, t: () => 'The trees’ outputs add up to one score.' },
      { at: 0.86, t: () => `That score gives a raw win chance of ${pct(match.pRaw)} for T1.` }
    ]
  },
  {
    short: 'Calibrate & bet',
    title: 'Calibrate & bet',
    code: 'p_cal = iso(p_raw)   ·   edge = p_cal − p_market   ·   stake = ¼ Kelly',
    beats: [
      { at: 0, t: () => 'This chart checks predicted chances against real results.' },
      { at: 0.12, t: () => 'Raw predictions are overconfident, so they’re adjusted onto the diagonal.' },
      { at: 0.46, t: () => `T1’s ${pct(match.pRaw)} is adjusted to ${pct(match.pCal)}.` },
      { at: 0.6, t: () => `Final prediction: T1 wins ${pct(match.pCal)} of the time.` },
      { at: 0.76, t: () => `The bookmakers have T1 at ${pct(match.pm)}.` },
      {
        at: 0.86,
        t: () => {
          const k = kellyOf(match)
          return k.bet
            ? `A ${(k.edge * 100).toFixed(0)}-point edge, so a small bet: ${(k.stake * 100).toFixed(1)}% of the bankroll.`
            : 'No real edge, so no bet.'
        }
      }
    ]
  },
  {
    short: 'Every team',
    title: 'Every team vs every team',
    code: 'P(i beats j) = σ(slope · (r̄ᵢ − r̄ⱼ) / 400)   ·   bestof_prob(p, n)',
    beats: [
      { at: 0, t: () => 'The same ratings price any pairing, not just this match, so every active team can be ranked on one scale.' },
      { at: 0.22, t: () => 'A team’s rating is the average of its five latest starters, league offset included, so a roster change shows up straight away.' },
      { at: 0.48, t: () => 'Every pair of ratings goes through the same calibrated win curve, filling in a full head-to-head table across leagues.' },
      { at: 0.74, t: () => `Single-game odds then turn into series odds: T1’s ${pct(LEAGUE.P[0][3])} per game becomes ${(LEAGUE.series[2].v * 100).toFixed(1)}% over a best-of-five.` }
    ]
  }
]

// total animation length of each stage if every step were played back to back
const DUR = [22000 / 1.3, 15000, 15000, 12500, 19000, 17000, 16500, 14500, 14000]
const FADE_MS = 600

// ---------- component state ----------
const root = ref(null)
const wrap = ref(null)
const canvas = ref(null)
const scene = ref(0)
const beat = ref(0)
const progress = ref(0)
const beatText = computed(() => SCENES[scene.value].beats[beat.value].t())
const nextLabel = computed(() => {
  const lastBeat = beat.value === SCENES[scene.value].beats.length - 1
  if (!lastBeat) return 'Next'
  return scene.value === SCENES.length - 1 ? 'Start over' : 'Next stage'
})
const reduceMotion = typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

let ctx = null
let W = 0
let H = 0
let NARROW = false
let DPR = 1
let GA = 1
let FONT = 'Inter, system-ui, sans-serif'
const MONO = "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace"
let bgCache = null
let prevScene = null
let elapsed = 0
let target = 0
let flowTime = 0
let loopAge = 0
let loopDuration = 0
let repeated = false
let last = 0
let clock = 0
let raf = 0
let visible = false
let io = null
let ro = null

// ---------- drawing primitives ----------
function A (a = 1) { ctx.globalAlpha = clamp(GA * a) }
function rgba (hex, a) {
  const n = parseInt(hex.slice(1), 16)
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`
}
function txt (s, x, y, o = {}) {
  const { size = 11, color = C.ink, align = 'left', weight = 500, mono = false, base = 'middle', alpha = 1 } = o
  A(alpha)
  ctx.font = `${weight} ${size}px ${mono ? MONO : FONT}`
  ctx.fillStyle = color
  ctx.textAlign = align
  ctx.textBaseline = base
  ctx.fillText(s, x, y)
}
function rr (x, y, w, h, r) {
  ctx.beginPath()
  if (ctx.roundRect) { ctx.roundRect(x, y, w, h, r); return }
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}
function line (x1, y1, x2, y2, color, w = 1, a = 1, dash = null) {
  A(a)
  ctx.strokeStyle = color
  ctx.lineWidth = w
  if (dash) ctx.setLineDash(dash)
  ctx.beginPath()
  ctx.moveTo(x1, y1)
  ctx.lineTo(x2, y2)
  ctx.stroke()
  if (dash) ctx.setLineDash([])
}
function dot (x, y, r, color, a = 1) {
  A(a)
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.arc(x, y, Math.max(0.1, r), 0, TAU)
  ctx.fill()
}
function glow (x, y, r, color, a = 1) {
  A(a)
  const g = ctx.createRadialGradient(x, y, 0, x, y, r * 4)
  g.addColorStop(0, rgba(color, 0.3))
  g.addColorStop(1, rgba(color, 0))
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.arc(x, y, r * 4, 0, TAU)
  ctx.fill()
  dot(x, y, r, color, a)
  dot(x, y, r * 0.42, '#ffffff', a)
}
function softShadow (on) {
  ctx.shadowColor = on ? 'rgba(27,31,69,0.08)' : 'transparent'
  ctx.shadowBlur = on ? 14 : 0
  ctx.shadowOffsetY = on ? 4 : 0
}
function qb (a, c, b, t) {
  const u = 1 - t
  return { x: u * u * a.x + 2 * u * t * c.x + t * t * b.x, y: u * u * a.y + 2 * u * t * c.y + t * t * b.y }
}
function flight (a, b, t, color, r = 2.4, lift = 40) {
  if (t <= 0 || t >= 1.25) return
  const c = { x: (a.x + b.x) / 2, y: Math.min(a.y, b.y) - lift }
  for (let k = 6; k >= 0; k--) {
    const tt = t - k * 0.04
    if (tt < 0 || tt > 1) continue
    const q = qb(a, c, b, ease(tt))
    if (k === 0) glow(q.x, q.y, r, color)
    else dot(q.x, q.y, r * (1 - k / 9), color, 0.45 * (1 - k / 7))
  }
}
function polyLen (pts) {
  const L = [0]
  for (let i = 1; i < pts.length; i++) L.push(L[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y))
  return L
}
function along (pts, L, t) {
  const d = clamp(t) * L[L.length - 1]
  let i = 1
  while (i < L.length - 1 && L[i] < d) i++
  const s = (d - L[i - 1]) / ((L[i] - L[i - 1]) || 1)
  return { x: lerp(pts[i - 1].x, pts[i].x, s), y: lerp(pts[i - 1].y, pts[i].y, s) }
}
function treeLayout (cx, top, w, h, depth = 3) {
  const lv = []
  for (let l = 0; l <= depth; l++) {
    const n = 1 << l
    lv.push(Array.from({ length: n }, (_, i) => ({ x: cx - w / 2 + (i + 0.5) * w / n, y: top + l * h / depth })))
  }
  return lv
}
const treePath = (lv, leaf) => lv.map((nodes, l) => nodes[leaf >> (lv.length - 1 - l)])
function drawTree (lv, a = 1) {
  for (let l = 0; l < lv.length - 1; l++) {
    lv[l].forEach((n, i) => {
      line(n.x, n.y, lv[l + 1][2 * i].x, lv[l + 1][2 * i].y, C.faint, 1, a)
      line(n.x, n.y, lv[l + 1][2 * i + 1].x, lv[l + 1][2 * i + 1].y, C.faint, 1, a)
    })
  }
  lv.forEach((nodes, l) => nodes.forEach((n) => dot(n.x, n.y, l === lv.length - 1 ? 2.4 : 2.1, C.faint, a)))
}
function panel (x, y, w, h, a = 1, border = C.hi) {
  A(a)
  softShadow(true)
  rr(x, y, w, h, 10)
  ctx.fillStyle = C.surface
  ctx.fill()
  softShadow(false)
  ctx.strokeStyle = rgba(border, 0.4)
  ctx.lineWidth = 1
  ctx.stroke()
}
const pulse = () => 0.65 + 0.35 * Math.sin(clock / 260)

function header (M) {
  if (NARROW) return
  txt('example match · ', W - 18 - 48, 18, { size: 10, color: C.dim, mono: true, align: 'right' })
  txt(M.tag[0], W - 18 - 34, 18, { size: 10, color: M.color[0], mono: true, weight: 700, align: 'right' })
  txt('vs', W - 18 - 23, 18, { size: 10, color: C.dim, mono: true, align: 'center' })
  txt(M.tag[1], W - 18, 18, { size: 10, color: M.color[1], mono: true, weight: 700, align: 'right' })
}

// ---------- shared player cards ----------
function cardRects () {
  const cw = NARROW ? W * 0.3 : W * 0.21
  const top = H * 0.12
  const bot = H * 0.97
  const rh = (bot - top) / 5
  const ch = rh * 0.8
  return [0, 1].map((ti) => ROLES.map((_, i) => ({
    x: ti ? W - W * 0.01 - cw : W * 0.01,
    y: top + i * rh + (rh - ch) / 2,
    w: cw,
    h: ch
  })))
}
function drawCard (c, M, ti, pl, a = 1) {
  const color = M.color[ti]
  A(a)
  softShadow(true)
  rr(c.x, c.y, c.w, c.h, 10)
  ctx.fillStyle = C.surface
  ctx.fill()
  softShadow(false)
  ctx.strokeStyle = rgba(color, 0.28)
  ctx.lineWidth = 1
  ctx.stroke()
  A(a)
  ctx.fillStyle = color
  rr(c.x, c.y + 7, 3, c.h - 14, 1.5)
  ctx.fill()
  const fs = NARROW ? 9 : 10
  const role = roleLabel(ROLES.indexOf(pl.role))
  txt(role, c.x + 11, c.y + c.h * 0.3, { size: fs + 1, color, weight: 700, alpha: a })
  ctx.font = `700 ${fs + 1}px ${FONT}`
  const rw = ctx.measureText(role).width
  txt(M.name[ti], c.x + 17 + rw, c.y + c.h * 0.3, { size: fs, color: C.muted, weight: 600, alpha: a })
}
function spotRing (c, a = 1) {
  if (a <= 0) return
  A(a * pulse())
  rr(c.x - 3, c.y - 3, c.w + 6, c.h + 6, 12)
  ctx.strokeStyle = C.hi
  ctx.lineWidth = 1.6
  ctx.stroke()
  txt('EXAMPLE', c.x + c.w, c.y - 9, { size: 8, color: C.hi, mono: true, weight: 700, align: 'right', alpha: a })
}

// ---------- opening: teams fan out into their map positions ----------
function sceneMatch (p, M) {
  const size = Math.min(H * 0.83, W * (NARROW ? 0.76 : 0.43))
  const x = (W - size) / 2
  const y = (H - size) / 2 + 8
  const point = (u, v) => ({ x: x + u * size, y: y + v * size })
  const reveal = easeOut(seg(p, 0.18, 0.38))
  const settle = ease(seg(p, 0.72, 0.94))
  const pair = easeOut(seg(p, 0.61, 0.7)) * (1 - settle)
  const mapAlpha = reveal * (1 - ease(seg(p, 0.73, 0.9)))
  const cards = cardRects()

  // A luminous arena with the familiar three lanes and diagonal river.
  A(mapAlpha)
  softShadow(true)
  rr(x, y, size, size, 22)
  const terrain = ctx.createLinearGradient(x, y + size, x + size, y)
  terrain.addColorStop(0, '#f4e9ee')
  terrain.addColorStop(0.5, '#edf5f3')
  terrain.addColorStop(1, '#f8f1dd')
  ctx.fillStyle = terrain
  ctx.fill()
  softShadow(false)
  ctx.strokeStyle = rgba(C.hi, 0.18)
  ctx.lineWidth = 1
  ctx.stroke()

  const path = (coords, color, width, alpha) => {
    A(alpha)
    ctx.beginPath()
    coords.forEach(([u, v], i) => {
      const q = point(u, v)
      if (i === 0) ctx.moveTo(q.x, q.y)
      else ctx.lineTo(q.x, q.y)
    })
    ctx.strokeStyle = color
    ctx.lineWidth = width
    ctx.lineJoin = 'round'
    ctx.lineCap = 'round'
    ctx.stroke()
    ctx.lineCap = 'butt'
  }
  path([[0.14, 0.16], [0.38, 0.38], [0.6, 0.62], [0.84, 0.86]], C.accent, size * 0.055, 0.15 * mapAlpha)
  const lanes = [
    [[0.12, 0.86], [0.12, 0.14], [0.86, 0.14]],
    [[0.12, 0.86], [0.86, 0.14]],
    [[0.12, 0.86], [0.86, 0.86], [0.86, 0.14]]
  ]
  lanes.forEach((lane) => {
    path(lane, '#ffffff', size * 0.042, mapAlpha)
    path(lane, C.faint, 1, mapAlpha * 0.65)
  })
  // Small jungle groves keep the spaces between lanes legible.
  for (const [u, v] of [[0.27, 0.4], [0.32, 0.48], [0.39, 0.28], [0.62, 0.72], [0.7, 0.57], [0.74, 0.65]]) {
    const q = point(u, v)
    dot(q.x, q.y, size * 0.055, '#91b6a3', mapAlpha * 0.18)
    dot(q.x - 3, q.y - 2, size * 0.025, '#699c83', mapAlpha * 0.24)
  }
  const bases = [point(0.12, 0.86), point(0.86, 0.14)]
  bases.forEach((q, ti) => {
    glow(q.x, q.y, size * 0.025, M.color[ti], mapAlpha)
    A(mapAlpha * 0.4)
    ctx.strokeStyle = M.color[ti]
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.arc(q.x, q.y, size * (0.046 + 0.006 * Math.sin(clock / 600)), 0, TAU)
    ctx.stroke()
  })

  // Five distinct people on each side, then those same people take their roles.
  M.name.forEach((name, ti) => {
    const cx = W * (ti ? 0.82 : 0.18)
    txt(name, cx, H * 0.12, { size: NARROW ? 18 : 24, weight: 800, color: M.color[ti], align: 'center', alpha: 1 - settle })
  })
  txt('VS', W / 2, H * 0.49, { size: NARROW ? 26 : 40, weight: 800, color: C.hi, align: 'center', alpha: 1 - reveal })

  const positions = [
    [[0.12, 0.36], [0.27, 0.43], [0.42, 0.57], [0.65, 0.86], [0.49, 0.86]],
    [[0.35, 0.14], [0.48, 0.25], [0.59, 0.4], [0.86, 0.63], [0.86, 0.46]]
  ]
  const destinations = positions.map((team) => team.map(([u, v]) => point(u, v)))
  // Draw the five comparisons beneath the player markers.
  destinations[0].forEach((q, i) => {
    const other = destinations[1][i]
    line(q.x, q.y, other.x, other.y, C.hi, 1.5, pair * 0.45, [3, 5])
    if (pair > 0) {
      const t = (clock / 2200 + i * 0.17) % 1
      dot(lerp(q.x, other.x, t), lerp(q.y, other.y, t), 2.5, C.hi, pair * 0.75)
    }
  })
  // Reveal the exact empty-row layout used by the following Match Data stage.
  const layoutAlpha = easeOut(seg(p, 0.76, 0.96))
  if (layoutAlpha > 0) {
    const parentAlpha = GA
    GA *= layoutAlpha
    scene0(0, M)
    GA = parentAlpha
  }
  destinations.forEach((team, ti) => team.forEach((dest, i) => {
    const travel = ease(seg(p, 0.3 + i * 0.02, 0.5 + i * 0.02))
    const base = bases[ti]
    const start = { x: W * (ti ? 0.82 : 0.18), y: H * (0.25 + i * 0.135) }
    const onMap = qb(start, { x: ti ? dest.x : start.x, y: ti ? start.y : dest.y }, dest, travel)
    const row = cards[ti][i]
    const arrive = ease(seg(p, 0.72 + i * 0.018, 0.86 + i * 0.018))
    const landing = { x: row.x + 24, y: row.y + row.h * 0.3 }
    const q = qb(onMap, { x: (onMap.x + landing.x) / 2, y: landing.y }, landing, arrive)
    const alpha = easeOut(seg(p, i * 0.012, 0.045 + i * 0.012)) * (1 - easeOut(seg(arrive, 0.8, 1)))
    // A short coloured trail follows each role into its own row.
    if (arrive > 0 && arrive < 1) {
      const tail = qb(onMap, { x: (onMap.x + landing.x) / 2, y: landing.y }, landing, Math.max(0, arrive - 0.12))
      line(tail.x, tail.y, q.x, q.y, M.color[ti], 2, alpha * 0.6)
    }
    line(base.x, base.y, q.x, q.y, M.color[ti], 1, alpha * travel * (1 - travel) * 0.5)
    const radius = NARROW ? 11 : 14
    glow(q.x, q.y, radius * 0.65, M.color[ti], alpha * 0.3)
    // The person silhouette morphs into a labelled map marker as it arrives.
    const marker = easeOut(seg(travel, 0.65, 1))
    const personAlpha = alpha * (1 - marker)
    dot(q.x, q.y - 8, NARROW ? 4 : 5, M.color[ti], personAlpha)
    A(personAlpha)
    rr(q.x - 8, q.y - 1, 16, 15, 6)
    ctx.fillStyle = M.color[ti]
    ctx.fill()
    line(q.x - 4, q.y + 10, q.x - 4, q.y + 19, M.color[ti], 3, personAlpha)
    line(q.x + 4, q.y + 10, q.x + 4, q.y + 19, M.color[ti], 3, personAlpha)
    dot(q.x, q.y, radius, C.surface, alpha * marker)
    A(alpha * marker)
    ctx.beginPath()
    ctx.arc(q.x, q.y, radius, 0, TAU)
    ctx.strokeStyle = M.color[ti]
    ctx.lineWidth = 1.5
    ctx.stroke()
    txt(ROLES[i], q.x, q.y, { size: NARROW ? 7 : 8, color: M.color[ti], weight: 800, align: 'center', alpha: alpha * marker })
  }))
  txt("SUMMONER'S RIFT", W / 2, y - 10, { size: 9, color: C.dim, mono: true, align: 'center', alpha: mapAlpha })
}

// ---------- scene 1: ingest ----------
const INGEST = (() => {
  const ev = []
  for (let j = 0; j < 4; j++) ev.push({ ti: SPOT.ti, i: SPOT.i, j, spot: true, t: 0.06 + j * 0.095, dur: 0.075 })
  let m = 0
  for (let j = 0; j < 4; j++) {
    for (let i = 0; i < 5; i++) {
      for (let ti = 0; ti < 2; ti++) {
        if (ti === SPOT.ti && i === SPOT.i) continue
        ev.push({ ti, i, j, spot: false, t: 0.5 + m * (0.33 / 36), dur: 0.05 })
        m++
      }
    }
  }
  return ev
})()

function scene0 (p, M) {
  const cards = cardRects()
  const logW = NARROW ? W * 0.34 : W * 0.36
  const lx = W / 2 - logW / 2
  const ly0 = H * 0.17
  const ly1 = H * 0.95
  A(1)
  softShadow(true)
  rr(lx, ly0, logW, ly1 - ly0, 12)
  ctx.fillStyle = C.surface
  ctx.fill()
  softShadow(false)
  ctx.strokeStyle = '#e2e4ee'
  ctx.stroke()
  txt(NARROW ? 'MATCH DATA' : 'MATCH DATA · LEAD OVER OPPONENT AT 15 MIN', lx + 2, ly0 - 12, { size: 9.5, color: C.dim, mono: true, weight: 600 })

  const lh = NARROW ? 15 : 19
  const fs = NARROW ? 8.5 : 10
  const slide = INGEST.map((e) => easeOut(clamp((p - e.t) / 0.025)))
  const spotFocus = 1 - seg(p, 0.46, 0.52)
  ctx.save()
  rr(lx, ly0, logW, ly1 - ly0, 12)
  ctx.clip()
  let offset = 0
  for (let k = INGEST.length - 1; k >= 0; k--) {
    const ev = INGEST[k]
    if (p >= ev.t) {
      const y = ly1 - 16 - offset * lh + (1 - slide[k]) * lh
      if (y > ly0 - lh) {
        const pl = M.players[ev.ti][ev.i]
        const col = M.color[ev.ti]
        const fade = clamp((y - ly0) / 50) * slide[k]
        const age = (p - ev.t) / 0.04
        const tint = ev.spot ? 0.1 * Math.max(spotFocus, clamp(1 - age / 1.5)) : 0.1 * clamp(1 - age / 1.5)
        if (tint > 0) {
          A(tint)
          ctx.fillStyle = ev.spot ? C.hi : col
          ctx.fillRect(lx, y - lh / 2, logW, lh)
        }
        txt(`${M.tag[ev.ti]} ${roleLabel(ev.i).toLowerCase()}`, lx + 10, y, { size: fs, color: col, mono: true, weight: 600, alpha: fade })
        txt(NARROW ? STATS[ev.j].tiny : STATS[ev.j].short, lx + logW * 0.5, y, { size: fs, color: C.dim, mono: true, alpha: fade, align: 'center' })
        txt(STATS[ev.j].fmt(pl.stats[ev.j]), lx + logW - 10, y, { size: fs, color: ev.spot ? C.hi : C.ink, mono: true, weight: ev.spot ? 700 : 500, alpha: fade, align: 'right' })
      }
    }
    offset += slide[k]
  }
  ctx.restore()

  for (let ti = 0; ti < 2; ti++) {
    M.players[ti].forEach((pl, i) => {
      const c = cards[ti][i]
      const isSpot = ti === SPOT.ti && i === SPOT.i
      const a = isSpot ? 1 : 1 - 0.55 * spotFocus * seg(p, 0.02, 0.06)
      drawCard(c, M, ti, pl, a)
      for (let j = 0; j < 4; j++) {
        const ev = INGEST.find((e) => e.ti === ti && e.i === i && e.j === j)
        const arrive = ev.t + ev.dur
        const f = easeOut(seg(p, arrive, arrive + (isSpot ? 0.04 : 0.03)))
        const bx = c.x + 11
        const bw = c.w - 22
        const by = c.y + c.h * 0.52 + j * c.h * 0.11
        const bh = Math.max(1.8, c.h * 0.05)
        A(a)
        ctx.fillStyle = C.track
        ctx.fillRect(bx, by, bw, bh)
        A(a)
        ctx.fillStyle = j === 3 ? C.accent : M.color[ti]
        ctx.fillRect(bx, by, bw * pl.stats[j] * f, bh)
      }
      if (isSpot) spotRing(c, seg(p, 0.03, 0.07) * (0.35 + 0.65 * spotFocus))
    })
  }

  INGEST.forEach((ev) => {
    const lt = (p - ev.t) / ev.dur
    if (lt <= 0 || lt >= 1.25) return
    const c = cards[ev.ti][ev.i]
    const from = { x: ev.ti ? lx + logW - 4 : lx + 4, y: ly1 - 16 }
    const to = { x: c.x + 11 + (c.w - 22) * M.players[ev.ti][ev.i].stats[ev.j], y: c.y + c.h * 0.52 + ev.j * c.h * 0.11 }
    flight(from, to, lt, ev.spot ? C.hi : ev.j === 3 ? C.accent : M.color[ev.ti], ev.spot ? 3 : 2.2, ev.spot ? 50 : 30)
  })
}

// A conveyor of illustrative metrics: rows leave the clipped viewport before recycling.
const PLAYER_METRICS = [
  ['Gold lead @15', '+412', 0.76], ['XP lead @15', '+260', 0.74],
  ['CS lead @15', '+9', 0.73], ['Gold lead @10', '+235', 0.67],
  ['XP lead @10', '+180', 0.66], ['CS lead @10', '+6', 0.65],
  ['Damage / min', '624', 0.78], ['Damage share', '28.4%', 0.71],
  ['Gold / min', '438', 0.75], ['CS / min', '9.2', 0.82],
  ['Kills', '5', 0.69], ['Assists', '8', 0.72],
  ['Kill participation', '72.2%', 0.79], ['Vision / min', '1.42', 0.61],
  ['Wards / min', '0.38', 0.64], ['Control wards', '4', 0.7],
  ['Wards cleared', '6', 0.73], ['CS lead @20', '+14', 0.8],
  ['Gold lead @20', '+680', 0.83], ['XP lead @20', '+390', 0.77]
]
const continuousScene = (i) => i === 1 || i === 2 || i === 3 || i === 6

function flowingPath (points, offset = 0, color = C.hi, alpha = 1) {
  const lengths = polyLen(points)
  const phase = reduceMotion ? 0.5 : (flowTime / 2800 + offset) % 1
  const fade = Math.sin(Math.PI * phase) * alpha
  for (let k = 4; k >= 0; k--) {
    const t = phase - k * 0.018
    if (t < 0) continue
    const q = along(points, lengths, t)
    dot(q.x, q.y, k ? 1.5 : 2.8, color, fade * (1 - k / 6))
  }
}

// Keep the conveyor, pending dots and received scores alive across the two captions.
let metricScroll = 0
let nextMetricOrdinal = 0
let metricRows = []
let metricBag = []
let metricRandom = rng(4217)
let metricBars = []

function resetMetricStream () {
  metricScroll = 0
  nextMetricOrdinal = 0
  metricRows = []
  metricBag = []
  metricRandom = rng(4217)
  metricBars = Array.from({ length: 2 }, () => Array.from({ length: 5 }, () =>
    Array.from({ length: 4 }, () => ({ from: 0, to: 0, at: 0 }))))
}

function metricBarValue (bar, time = flowTime) {
  return lerp(bar.from, bar.to, easeOut(seg(time, bar.at, bar.at + 800)))
}

function nextMetric (ordinal, allPlayers) {
  let ti = SPOT.ti
  let role = SPOT.i
  let slot = ordinal % 4
  let index = ordinal % PLAYER_METRICS.length
  if (allPlayers) {
    // Shuffle complete batches so every player's four bars receive data, in a new order.
    if (!metricBag.length) {
      metricBag = Array.from({ length: 40 }, (_, i) => i)
      for (let i = metricBag.length - 1; i > 0; i--) {
        const j = Math.floor(metricRandom() * (i + 1))
        ;[metricBag[i], metricBag[j]] = [metricBag[j], metricBag[i]]
      }
    }
    const id = metricBag.pop()
    ti = Math.floor(id / 20)
    role = Math.floor((id % 20) / 4)
    slot = id % 4
    index = Math.floor(metricRandom() * 5) * 4 + slot
  }
  return { ordinal, ti, role, slot, index, launchedAt: null, received: false }
}

function updateMetricStream (dt) {
  const previousScroll = metricScroll
  metricScroll += dt / (beat.value >= 1 ? 220 : 1100)
  while (nextMetricOrdinal <= Math.floor(metricScroll)) {
    metricRows.push(nextMetric(nextMetricOrdinal++, beat.value >= 1))
  }
  metricRows.forEach((row) => {
    if (row.launchedAt === null && metricScroll >= row.ordinal + 1.8) {
      const crossed = clamp((row.ordinal + 1.8 - previousScroll) / (metricScroll - previousScroll))
      row.launchedAt = flowTime - dt + crossed * dt
    }
    if (row.launchedAt !== null && !row.received && flowTime >= row.launchedAt + 950) {
      const bar = metricBars[row.ti][row.role][row.slot]
      const arrivalTime = row.launchedAt + 950
      bar.from = metricBarValue(bar, arrivalTime)
      bar.to = PLAYER_METRICS[row.index][2]
      bar.at = arrivalTime
      row.received = true
    }
  })
  // Retain enough off-screen rows for every in-flight dot to complete.
  metricRows = metricRows.filter((row) => metricScroll - row.ordinal < 32 || !row.received)
}

function sceneData (p, M) {
  const cards = cardRects()
  const allPlayers = beat.value >= 1
  const cx = W * 0.5
  const width = W * (NARROW ? 0.34 : 0.36)
  const left = cx - width / 2
  const top = H * 0.17
  const height = H * 0.78
  panel(left, top, width, height, 1, C.faint)
  txt(NARROW ? 'METRICS' : 'PLAYER METRICS / ILLUSTRATIVE', cx, top - 12, { size: NARROW ? 8 : 9, color: C.dim, mono: true, align: 'center' })
  const rowHeight = NARROW ? 39 : 34
  const staticCount = Math.ceil(height / rowHeight)
  const rows = reduceMotion
    ? Array.from({ length: staticCount }, (_, i) => ({ ordinal: i, ti: allPlayers ? i % 2 : SPOT.ti, role: allPlayers ? i % 5 : SPOT.i, slot: i % 4, index: i % PLAYER_METRICS.length }))
    : metricRows
  ctx.save()
  rr(left + 1, top + 1, width - 2, height - 2, 9)
  ctx.clip()
  rows.forEach((row) => {
    const metric = PLAYER_METRICS[row.index]
    const y = reduceMotion ? top + (row.ordinal + 0.5) * rowHeight : top + height - (metricScroll - row.ordinal - 1) * rowHeight
    if (y < top - rowHeight || y > top + height + rowHeight) return
    const fade = clamp((y - top) / 22) * clamp((top + height - y) / 22)
    txt(`${M.tag[row.ti]} ${ROLES[row.role]}`, left + 10, y - 7, { size: 8, color: M.color[row.ti], mono: true, weight: 700, alpha: fade })
    txt(metric[0], left + 10, y + 7, { size: NARROW ? 7 : 10, color: C.muted, alpha: fade })
    txt(metric[1], left + width - 9, y + (NARROW ? -7 : 3), { size: NARROW ? 8 : 11, color: C.hi, align: 'right', mono: true, weight: 700, alpha: fade })
  })
  ctx.restore()
  cards.forEach((team, ti) => team.forEach((c, i) => {
    const active = allPlayers || (ti === SPOT.ti && i === SPOT.i)
    const alpha = active ? 1 : 0.4
    drawCard(c, M, ti, M.players[ti][i], alpha)
    for (let j = 0; j < 4; j++) {
      const value = reduceMotion ? PLAYER_METRICS[j][2] : metricBarValue(metricBars[ti][i][j])
      const by = c.y + c.h * (0.52 + j * 0.11)
      A(alpha)
      ctx.fillStyle = C.track
      ctx.fillRect(c.x + 11, by, c.w - 22, Math.max(1.8, c.h * 0.05))
      if (active) {
        ctx.fillStyle = j === 3 ? C.accent : M.color[ti]
        ctx.fillRect(c.x + 11, by, (c.w - 22) * value, Math.max(1.8, c.h * 0.05))
      }
    }
    if (ti === SPOT.ti && i === SPOT.i && !allPlayers) spotRing(c, 0.7)
  }))
  if (!reduceMotion) metricRows.forEach((row) => {
    if (row.launchedAt === null) return
    const age = flowTime - row.launchedAt
    if (age < 0 || age > 1250) return
    const metric = PLAYER_METRICS[row.index]
    const card = cards[row.ti][row.role]
    const from = { x: row.ti ? left + width - 8 : left + 8, y: top + height - rowHeight * 0.8 }
    const to = { x: card.x + 11 + (card.w - 22) * metric[2], y: card.y + card.h * (0.52 + row.slot * 0.11) }
    flight(from, to, age / 950, M.color[row.ti], 3, 24)
    glow(from.x, from.y, 3, M.color[row.ti], 1 - clamp(age / 260))
    const arrival = clamp((age - 800) / 150) * (1 - clamp((age - 950) / 300))
    glow(to.x, to.y, 3.5, M.color[row.ti], arrival)
  })
}

// ---------- scene 2: per-role performance model ----------
const PERF_ORDER = (() => {
  const out = [{ ti: SPOT.ti, i: SPOT.i, st: 0.06, dur: 0.36, spot: true }]
  let m = 0
  for (let i = 0; i < 5; i++) {
    for (let ti = 0; ti < 2; ti++) {
      if (ti === SPOT.ti && i === SPOT.i) continue
      out.push({ ti, i, st: 0.52 + m * 0.035, dur: 0.16, spot: false })
      m++
    }
  }
  return out
})()

// The example's path is split to match the subtitles: step 2 (p 0.06–0.2) travels only as far as
// the early-game leaf and holds there; step 3 (p 0.2–0.42) covers the middle and late trees and
// returns to the card. L is the cumulative length of [card, 4 early nodes, 4 middle, 4 late, card].
function spotEt (p, L) {
  const total = L[L.length - 1]
  const earlyLeaf = L[4] / total
  if (p < 0.2) return earlyLeaf * easeOut(seg(p, 0.06, 0.2))
  return earlyLeaf + (1 - earlyLeaf) * seg(p, 0.2, 0.42)
}

function sceneRoleModels () {
  const time = reduceMotion ? 9000 : flowTime
  const group = ease(seg(time, 400, 2200))
  const split = easeOut(seg(time, 2800, 4600))
  const focus = ease(seg(time, 2400, 3400))
  const rowY = H * 0.35
  const cardW = W * 0.16
  const cardH = H * 0.27
  txt('Compare the same role', W / 2, H * 0.1, { size: NARROW ? 13 : 17, weight: 750, align: 'center' })

  // Ten players become five simple pairs. No model internals yet.
  ROLES.forEach((role, i) => {
    const cx = W * (0.1 + i * 0.2)
    const alpha = i === SPOT.i ? 1 : 1 - focus * 0.55
    panel(cx - cardW / 2, rowY - cardH / 2, cardW, cardH, group * alpha, i === SPOT.i ? C.hi : C.faint)
    txt(NARROW ? role : ROLE_NAMES[i], cx, rowY - cardH * 0.25, { size: NARROW ? 9 : 11, weight: 700, color: i === SPOT.i ? C.hi : C.muted, align: 'center', alpha: group * alpha })
    for (let ti = 0; ti < 2; ti++) {
      const px = lerp(cx, cx + (ti ? 1 : -1) * cardW * 0.2, group)
      const py = lerp(H * (ti ? 0.55 : 0.23), rowY + cardH * 0.14, group)
      // A head and shoulders keep the two teams recognisable as people.
      dot(px, py - 5, NARROW ? 4 : 5, match.color[ti], alpha)
      A(alpha)
      rr(px - 7, py + 2, 14, 11, 5)
      ctx.fillStyle = match.color[ti]
      ctx.fill()
    }
  })

  // Zoom into one pair's match, divided into three comparable time windows.
  const origin = { x: W / 2, y: rowY + cardH / 2 }
  const timelineY = H * 0.72
  const timelineX = W * 0.12
  const timelineW = W * 0.76
  const gap = 5
  const segmentW = (timelineW - gap * 2) / 3
  line(origin.x, origin.y, origin.x, timelineY - H * 0.06, C.hi, 1.5, split * 0.45)
  txt('Compare the same stage', W / 2, H * 0.59, { size: NARROW ? 12 : 15, weight: 750, align: 'center', alpha: split })
  ;['Early', 'Middle', 'Late'].forEach((label, j) => {
    const x = timelineX + j * (segmentW + gap)
    const appear = easeOut(seg(time, 3000 + j * 250, 3800 + j * 250))
    panel(x, timelineY - H * 0.045, segmentW, H * 0.16, appear, C.hi)
    txt(label, x + segmentW / 2, timelineY + H * 0.01, { size: NARROW ? 11 : 14, weight: 650, align: 'center', alpha: appear })
    // Both players pass through the same time window together.
    const phase = reduceMotion ? 0.5 : (flowTime / 3500 + j / 3) % 1
    for (let ti = 0; ti < 2; ti++) {
      const px = x + 10 + (segmentW - 20) * phase
      const py = timelineY + H * (ti ? 0.085 : 0.06)
      line(x + 10, py, x + segmentW - 10, py, match.color[ti], 1, appear * 0.15)
      dot(px, py, 2.5, match.color[ti], appear * Math.sin(Math.PI * phase))
    }
  })
}

function scene1 (p, M) {
  if (p < SCENES[2].beats[1].at) {
    sceneRoleModels()
    return
  }
  const cards = cardRects()
  const gap = NARROW ? W * 0.115 : W * 0.11
  const tw = NARROW ? W * 0.095 : W * 0.09
  const ttop = H * 0.32
  const th = H * 0.36
  const trees = [0, 1, 2].map((k) => treeLayout(W / 2 + (k - 1) * gap, ttop, tw, th))
  const stage = ['EARLY', 'MIDDLE', 'LATE']
  const win = ['10–15 min', '15–20 min', '20–25 min']
  const spotFocus = 1 - seg(p, 0.5, 0.56)

  txt(NARROW ? 'MID MODEL' : 'ONE MODEL PER POSITION · 3 GAME STAGES', W / 2, H * 0.14, { size: 9.5, color: C.dim, mono: true, weight: 600, align: 'center' })
  trees.forEach((lv, k) => {
    drawTree(lv)
    const activeTree = p >= 0.2 || k === 0
    if (scene.value === 2 && activeTree) {
      const path = treePath(lv, M.players[SPOT.ti][SPOT.i].leaves[k])
      flowingPath(path, k * 0.31, C.hi, easeOut(seg(p, 0.02, 0.06)))
    }
    txt(stage[k], lv[0][0].x, ttop - 30, { size: 9.5, color: C.muted, mono: true, weight: 700, align: 'center' })
    txt(win[k], lv[0][0].x, ttop - 16, { size: 8.5, color: C.dim, mono: true, align: 'center' })
  })
  for (let k = 0; k < 2; k++) {
    const x = (trees[k][0][0].x + trees[k + 1][0][0].x) / 2
    txt('›', x, ttop - 30, { size: 13, color: C.dim, align: 'center', weight: 700 })
  }

  const fillAt = (o) => easeOut(seg(p, o.st + o.dur, o.st + o.dur + (o.spot ? 0.05 : 0.06)))

  PERF_ORDER.forEach((o) => {
    const pl = M.players[o.ti][o.i]
    const c = cards[o.ti][o.i]
    const col = o.spot ? C.hi : M.color[o.ti]
    const lt = (p - o.st) / o.dur
    if (lt <= 0 || lt > 1.4) return
    const pts = [{ x: o.ti ? c.x : c.x + c.w, y: c.y + c.h / 2 }]
    trees.forEach((lv, s) => pts.push(...treePath(lv, pl.leaves[s])))
    pts.push({ x: o.ti ? c.x : c.x + c.w, y: c.y + c.h * 0.7 })
    const L = polyLen(pts)
    const total = L[L.length - 1]
    const et = o.spot ? spotEt(p, L) : ease(clamp(lt))
    const decay = o.spot ? 0.9 : 2.2
    for (let s = 1; s < pts.length; s++) {
      const a0 = L[s - 1] / total
      const a1 = L[s] / total
      if (et < a0) break
      const a = clamp(1 - (et - a1) * decay) * (lt > 1 ? clamp(1 - (lt - 1) * 2.5) : 1)
      const pe = et < a1 ? along(pts, L, et) : pts[s]
      line(pts[s - 1].x, pts[s - 1].y, pe.x, pe.y, col, o.spot ? 2 : 1.6, a * 0.85)
      if (et >= a1) dot(pts[s].x, pts[s].y, 2.6, col, a)
    }
    if (lt < 1) {
      const q = along(pts, L, et)
      glow(q.x, q.y, o.spot ? 3.4 : 2.8, col)
    }
  })

  // worked example: each stage's percentile and weight, then the comparison with "expected"
  {
    const ex = PERF_ORDER[0]
    const pl = M.players[ex.ti][ex.i]
    const c = cards[ex.ti][ex.i]
    const pts = [{ x: c.x + c.w, y: c.y + c.h / 2 }]
    trees.forEach((lv, s) => pts.push(...treePath(lv, pl.leaves[s])))
    const L = polyLen([...pts, { x: c.x + c.w, y: c.y + c.h * 0.7 }])
    const total = L[L.length - 1]
    const et = p <= ex.st ? 0 : spotEt(p, L)
    const fadeOut = 1 - seg(p, 0.56, 0.62)
    SPOT_PCT.forEach((pc, s) => {
      const idx = 1 + s * 4 + 3
      const at = L[idx] / total
      const a = seg(et, at - 0.005, at + 0.03) * fadeOut
      if (a <= 0) return
      const leaf = pts[idx]
      txt(`${ordinal(pc)} pct`, leaf.x, leaf.y + 14, { size: NARROW ? 9 : 10.5, color: C.hi, mono: true, weight: 700, align: 'center', alpha: a })
      if (!NARROW) txt(`× ${STAGE_W[s].toFixed(2)}`, leaf.x, leaf.y + 28, { size: 9, color: C.dim, mono: true, align: 'center', alpha: a })
    })
    // score vs expected, shown under the trees
    const sa = easeOut(seg(p, 0.42, 0.46)) * fadeOut
    if (sa > 0) {
      const y = trees[0][3][0].y + (NARROW ? 46 : 52)
      txt(`${Math.round(SPOT_COMP)} weighted  −  ${Math.round(GAME_AVG)} expected  =  ${signed(pl.perf * PERF_SCALE, 0)}`, W / 2, y, { size: NARROW ? 9 : 11, color: C.hi, mono: true, weight: 700, align: 'center', alpha: sa })
      if (!NARROW) txt(`expected = average of T1 mid (${Math.round(SPOT_COMP)}) and Gen.G mid (${Math.round(OPP_COMP)})`, W / 2, y + 17, { size: 9, color: C.dim, mono: true, align: 'center', alpha: sa })
    }
  }

  for (let ti = 0; ti < 2; ti++) {
    M.players[ti].forEach((pl, i) => {
      const c = cards[ti][i]
      const o = PERF_ORDER.find((q) => q.ti === ti && q.i === i)
      const a = o.spot ? 1 : 1 - 0.55 * spotFocus * seg(p, 0.02, 0.06)
      drawCard(c, M, ti, pl, a)
      const f = fillAt(o)
      const gx = c.x + 11
      const gw = c.w - 22
      const gy = c.y + c.h * 0.68
      const gh = Math.max(3, c.h * 0.1)
      const cx = gx + gw / 2
      A(a)
      ctx.fillStyle = C.track
      ctx.fillRect(gx, gy - gh / 2, gw, gh)
      line(cx, gy - gh, cx, gy + gh, C.dim, 1, a)
      const pc = pl.perf >= 0 ? C.green : C.pink
      A(a)
      ctx.fillStyle = pc
      const len = pl.perf * gw / 2 * f
      ctx.fillRect(Math.min(cx, cx + len), gy - gh / 2, Math.abs(len), gh)
      if (f > 0) {
        txt(signed(pl.perf * PERF_SCALE, 0), c.x + c.w - 9, c.y + c.h * 0.3, { size: NARROW ? 9 : 10, color: pc, mono: true, weight: 700, align: 'right', alpha: f * a })
      }
      if (o.spot) spotRing(c, seg(p, 0.02, 0.06) * (0.35 + 0.65 * spotFocus))
    })
  }
}

// ---------- scene 3: skill EMAs ----------
function skillGame (M, ti, game) {
  if (game < M.hist[ti].length) return M.hist[ti][game]
  const random = rng(7301 + ti * 100003 + game * 7919)
  const elapsedGames = game - 15
  return M.ema[ti][15].map((baseline, axis) => {
    // Form drifts over many games; individual performances remain much noisier.
    const phase = axis * 1.37 + ti * 2.1
    const drift = 0.14 * (Math.sin(elapsedGames / 22 + phase) - Math.sin(phase)) +
      0.06 * (Math.sin(elapsedGames / 47 + phase * 2) - Math.sin(phase * 2))
    return clamp(baseline + drift + (random() - 0.5) * 0.36, 0.12, 0.92)
  })
}

function skillAverage (M, ti, game) {
  if (game < M.ema[ti].length) return M.ema[ti][game]
  // Reconstruct the span-5 EMA with bounded work, however long the viewer stays.
  const start = Math.max(16, game - 47)
  let values = M.ema[ti][15].slice()
  for (let k = start; k <= game; k++) {
    const sample = skillGame(M, ti, k)
    values = values.map((value, axis) => lerp(value, sample[axis], 2 / 6))
  }
  return values
}

function scene2 (p, M) {
  const AX = NARROW ? ['VIS', 'CON', 'VER', 'AGG', 'SUR'] : ['vision', 'consistency', 'versatility', 'aggression', 'survivability']
  const R0 = NARROW ? W * 0.16 : Math.min(H * 0.29, W * 0.15)
  const cy0 = NARROW ? H * 0.46 : H * 0.52
  const centers0 = NARROW ? [W * 0.27, W * 0.73] : [W * 0.28, W * 0.72]

  // final step: the big mid pair shrinks into the "Mid" slot of a 5v5 row
  const q = ease(seg(p, 0.76, 0.86))
  const fadeBig = 1 - q
  const slots = ROLES.map((_, i) => NARROW
    ? { x: W * (i < 3 ? 0.18 + i * 0.32 : 0.34 + (i - 3) * 0.32), y: H * (i < 3 ? 0.3 : 0.68) }
    : { x: W * (0.1 + i * 0.2), y: H * 0.48 })
  const r = NARROW ? W * 0.12 : Math.min(W * 0.075, H * 0.24)

  const ang = (a) => -Math.PI / 2 + a * TAU / 5
  const ptAt = (cx, cy, R, v, a) => ({ x: cx + Math.cos(ang(a)) * R * v, y: cy + Math.sin(ang(a)) * R * v })
  const polyAt = (cx, cy, R, vals, scale = 1) => {
    ctx.beginPath()
    vals.forEach((v, a) => {
      const pt = ptAt(cx, cy, R, v * scale, a)
      if (a === 0) ctx.moveTo(pt.x, pt.y)
      else ctx.lineTo(pt.x, pt.y)
    })
    ctx.closePath()
  }
  const grid = (cx, cy, R, a, rings = 4) => {
    for (let ring = 1; ring <= rings; ring++) {
      A(a)
      polyAt(cx, cy, R, [1, 1, 1, 1, 1], ring / rings)
      ctx.strokeStyle = C.faint
      ctx.lineWidth = 1
      ctx.stroke()
    }
  }
  const appear = easeOut(seg(p, 0, 0.08))
  const visionFocus = 0
  const infiniteGames = scene.value === 3 && (beat.value === 1 || beat.value === 2) && !reduceMotion
  const hn = infiniteGames ? 1 + flowTime / 700 : seg(p, 0.12, 0.74) * 15
  const R = lerp(R0, r, q)
  const cy = lerp(cy0, slots[2].y, q)

  for (let ti = 0; ti < 2; ti++) {
    const cx = lerp(centers0[ti], slots[2].x, q)
    const col = M.color[ti]
    // once merged, only one grid is needed
    const gridA = appear * (ti === 1 ? fadeBig : 1)
    grid(cx, cy, R, gridA, q > 0.5 ? 3 : 4)
    for (let a = 0; a < 5; a++) {
      const e = ptAt(cx, cy, R, 1, a)
      const hiAx = a === 0 ? visionFocus : 0
      line(cx, cy, e.x, e.y, hiAx ? C.hi : C.faint, hiAx ? 2 : 1, gridA)
      const lq = ptAt(cx, cy, R, 1.2, a)
      txt(AX[a], lq.x, lq.y, { size: NARROW ? 8.5 : 9.5, color: hiAx > 0.5 ? C.hi : C.muted, mono: true, weight: hiAx > 0.5 ? 700 : 500, align: 'center', alpha: appear * fadeBig })
    }

    if (hn > 0 && fadeBig > 0) {
      for (let k = Math.max(0, Math.floor(hn) - 10); k <= Math.floor(hn); k++) {
        const grow = infiniteGames ? 1 : k === Math.floor(hn) ? backOut(hn - k) : 1
        const age = hn - k
        const trailFade = infiniteGames ? clamp((10 - age) / 3) : 1
        // Fade new observations in at their actual size; never regrow the graph from zero.
        const arrivalFade = infiniteGames ? easeOut(clamp(age / 0.45)) : 1
        A(clamp(0.1 + 0.6 * Math.exp(-age / 2.5)) * fadeBig * trailFade * arrivalFade)
        polyAt(cx, cy, R, skillGame(M, ti, k), grow)
        ctx.strokeStyle = col
        ctx.lineWidth = 1
        ctx.stroke()
      }
    }

    const k0 = Math.floor(hn)
    const k1 = infiniteGames ? k0 + 1 : Math.min(15, k0 + 1)
    const fr = hn - k0
    const nextAverage = skillAverage(M, ti, k1)
    const cur = skillAverage(M, ti, k0).map((v, a) => lerp(v, nextAverage[a], ease(fr)))
    const emaA = appear * (0.35 + 0.65 * seg(p, 0.36, 0.44))
    A(emaA)
    polyAt(cx, cy, R, cur)
    ctx.fillStyle = rgba(col, 0.14)
    ctx.fill()
    ctx.strokeStyle = col
    ctx.lineWidth = lerp(2.2, 1.6, q)
    ctx.stroke()
    cur.forEach((v, a) => {
      const pt = ptAt(cx, cy, R, v, a)
      glow(pt.x, pt.y, lerp(2.6, 1.5, q), col, emaA)
    })

    txt(`${M.name[ti]} mid`, cx, cy + R * 1.42, { size: 12, color: col, weight: 700, align: 'center', alpha: appear * fadeBig })
  }

  // the other four match-ups pop in
  const others = [0, 1, 3, 4]
  const popAt = (i) => 0.84 + others.indexOf(i) * 0.03
  others.forEach((i) => {
    const st = popAt(i)
    const a = easeOut(seg(p, st, st + 0.05))
    if (a <= 0) return
    const s = backOut(seg(p, st, st + 0.05))
    const { x, y } = slots[i]
    grid(x, y, r * s, a, 3)
    for (let ax = 0; ax < 5; ax++) {
      const e = ptAt(x, y, r * s, 1, ax)
      line(x, y, e.x, e.y, C.faint, 1, a)
    }
    for (let ti = 0; ti < 2; ti++) {
      const col = M.color[ti]
      const vals = M.posSkills[i][ti]
      A(a)
      polyAt(x, y, r, vals, s)
      ctx.fillStyle = rgba(col, 0.14)
      ctx.fill()
      ctx.strokeStyle = col
      ctx.lineWidth = 1.6
      ctx.stroke()
      vals.forEach((v, ax) => {
        const pt = ptAt(x, y, r, v * s, ax)
        dot(pt.x, pt.y, 1.8, col, a)
      })
    }
  })

  // position labels + who is ahead in each match-up
  ROLES.forEach((_, i) => {
    const a = i === 2 ? q : easeOut(seg(p, popAt(i) + 0.02, popAt(i) + 0.07))
    if (a <= 0) return
    const { x, y } = slots[i]
    const [t1, gen] = M.posSkills[i]
    const gap = t1.reduce((sum, v) => sum + v, 0) - gen.reduce((sum, v) => sum + v, 0)
    const lead = gap >= 0 ? 0 : 1
    txt(roleLabel(i), x, y + r * 1.3, { size: NARROW ? 10 : 12, color: i === SPOT.i ? C.hi : C.ink, weight: 700, align: 'center', alpha: a })
    txt(`${M.tag[lead]} ahead`, x, y + r * 1.3 + (NARROW ? 13 : 16), { size: NARROW ? 8.5 : 9.5, color: M.color[lead], mono: true, weight: 600, align: 'center', alpha: a })
  })

  // legends
  if (!NARROW) {
    const la = seg(p, 0.14, 0.2) * fadeBig
    line(W / 2 - 14, H * 0.16, W / 2 + 2, H * 0.16, C.muted, 1, la * 0.6)
    txt('one game', W / 2 + 8, H * 0.16, { size: 9, color: C.muted, mono: true, alpha: la })
    const lb = seg(p, 0.38, 0.44) * fadeBig
    line(W / 2 - 14, H * 0.16 + 16, W / 2 + 2, H * 0.16 + 16, C.ink, 2.2, lb)
    txt('EMA (span 5)', W / 2 + 8, H * 0.16 + 16, { size: 9, color: C.ink, mono: true, alpha: lb })
  }
  if (q > 0) {
    const ly = NARROW ? H * 0.08 : H * 0.12
    line(W / 2 - 70, ly, W / 2 - 54, ly, M.color[0], 2.2, q)
    txt(M.name[0], W / 2 - 48, ly, { size: 10, color: M.color[0], weight: 700, alpha: q })
    line(W / 2 + 10, ly, W / 2 + 26, ly, M.color[1], 2.2, q)
    txt(M.name[1], W / 2 + 32, ly, { size: 10, color: M.color[1], weight: 700, alpha: q })
  }

  const msg = NARROW ? '→ head-to-head gaps per position' : '→ head-to-head gaps per position: vision · consistency · survivability'
  const n = Math.floor(seg(p, 0.86, 0.98) * msg.length)
  if (n > 0) {
    txt(msg.slice(0, n) + (n < msg.length ? '▍' : ''), W / 2, H * 0.96, { size: NARROW ? 9 : 10.5, color: C.hi, mono: true, weight: 600, align: 'center' })
  }
}

// ---------- scene 4: player UKF ----------
function scene3 (p, M) {
  const dom0 = 1240
  const dom1 = 1760
  const L = { x0: W * 0.01, x1: NARROW ? W * 0.99 : W * 0.56, y0: H * 0.12, y1: NARROW ? H * 0.6 : H * 0.88 }
  const rowH = (L.y1 - L.y0) / 5
  const lab = NARROW ? 30 : 56
  const xOf = (r) => lerp(L.x0 + lab, L.x1, (r - dom0) / (dom1 - dom0))
  const u = ease(seg(p, 0.63, 0.8))
  const v = ease(seg(p, 0.85, 0.96))
  const appear = easeOut(seg(p, 0, 0.06))
  const sigFade = 1 - seg(p, 0.6, 0.66)

  const phase = p < 0.28 ? 'skill ranges → sample points' : p < 0.48 ? 'sample points → win curve' : p < 0.62 ? 'result comes in' : p < 0.84 ? 'update ratings' : 'performance shift'
  txt(phase, L.x1, H * 0.05, { size: 10, color: C.hi, mono: true, weight: 700, align: 'right', alpha: appear })

  {
    const base = L.y0 + (SPOT.i + 1) * rowH - 4
    A(0.06 * appear)
    ctx.fillStyle = C.hi
    rr(L.x0 - 4, base - rowH + 6, L.x1 - L.x0 + 8, rowH - 2, 8)
    ctx.fill()
  }

  const state = (pl) => ({ mu: lerp(pl.mu, pl.mu1, u) + v * (pl.mu2 - pl.mu1), sig: lerp(pl.sig, pl.sig1, u) })
  const peakOf = (sig) => Math.min(rowH * 0.86, rowH * 0.62 * Math.pow(70 / sig, 0.75))
  const gy = (mu, sig, base, r) => base - peakOf(sig) * Math.exp(-0.5 * ((r - mu) / sig) ** 2)
  const spPos = {}

  ctx.save()
  ctx.beginPath()
  ctx.rect(L.x0 + lab, L.y0 - rowH, L.x1 - L.x0 - lab, L.y1 - L.y0 + rowH + 4)
  ctx.clip()
  for (let i = 0; i < 5; i++) {
    const base = L.y0 + (i + 1) * rowH - 4
    line(xOf(dom0), base, L.x1, base, C.faint, 1, appear)
    for (let ti = 0; ti < 2; ti++) {
      const pl = M.players[ti][i]
      const col = M.color[ti]
      const s = state(pl)
      A(appear)
      ctx.beginPath()
      ctx.moveTo(xOf(s.mu - 4 * s.sig), base)
      for (let k = 0; k <= 64; k++) {
        const r = s.mu - 4 * s.sig + (8 * s.sig * k) / 64
        ctx.lineTo(xOf(r), gy(s.mu, s.sig, base, r))
      }
      ctx.lineTo(xOf(s.mu + 4 * s.sig), base)
      ctx.fillStyle = rgba(col, 0.12)
      ctx.fill()
      ctx.strokeStyle = col
      ctx.lineWidth = 1.6
      ctx.stroke()

      // sample points cascade in, one position at a time, right after the curves appear
      const pop = backOut(seg(p, 0.07 + i * 0.035, 0.14 + i * 0.035))
      for (const sgn of [-1, 0, 1]) {
        const r = pl.mu + sgn * pl.sig * 1.2
        const q = { x: xOf(r), y: gy(pl.mu, pl.sig, base, r) }
        if (sgn) spPos[`${ti}-${i}-${sgn}`] = q
        if (pop > 0 && sigFade > 0) {
          line(q.x, base, q.x, q.y, col, 1, 0.35 * sigFade * clamp(pop))
          glow(q.x, q.y, (sgn ? 2.2 : 3) * clamp(pop, 0, 1.3), col, sigFade)
        }
      }

      if (v > 0) {
        const y = base - peakOf(s.sig) - 7
        const xa = xOf(pl.mu1)
        const xb = xOf(lerp(pl.mu1, pl.mu2, v))
        const mc = pl.perf >= 0 ? C.green : C.pink
        line(xa, y, xb, y, mc, 1.8, 0.9)
        const dir = Math.sign(pl.mu2 - pl.mu1) || 1
        A(0.9)
        ctx.fillStyle = mc
        ctx.beginPath()
        ctx.moveTo(xb + dir * 4, y)
        ctx.lineTo(xb - dir * 1, y - 3)
        ctx.lineTo(xb - dir * 1, y + 3)
        ctx.fill()
      }
    }
  }
  ctx.restore()
  for (let i = 0; i < 5; i++) {
    const base = L.y0 + (i + 1) * rowH - 4
    txt(roleLabel(i), L.x0 + 2, base - rowH * 0.3, { size: NARROW ? 8.5 : 10, color: i === SPOT.i ? C.hi : C.muted, weight: 700, alpha: appear })
  }
  for (const t of NARROW ? [1400, 1500, 1600] : [1300, 1400, 1500, 1600, 1700]) {
    txt(String(t), xOf(t), L.y1 + 10, { size: 8.5, color: C.dim, mono: true, align: 'center', alpha: appear })
  }
  if (!NARROW) {
    txt('skill rating →', L.x1, L.y1 + 24, { size: 8.5, color: C.dim, mono: true, align: 'right', alpha: appear })
    txt('━ T1', L.x0 + lab, H * 0.05, { size: 9.5, color: M.color[0], mono: true, weight: 700, alpha: appear })
    txt('━ GEN', L.x0 + lab + 46, H * 0.05, { size: 9.5, color: M.color[1], mono: true, weight: 700, alpha: appear })
  }

  const R = NARROW
    ? { x0: W * 0.44, x1: W * 0.97, y0: H * 0.7, y1: H * 0.96 }
    : { x0: W * 0.67, x1: W * 0.97, y0: H * 0.2, y1: H * 0.76 }
  const dr = 820
  const cx = (d) => lerp(R.x0 + 6, R.x1, (d + dr) / (2 * dr))
  const cy = (pv) => lerp(R.y1, R.y0, pv)
  const ca = easeOut(seg(p, 0.03, 0.1))
  line(R.x0, R.y0 - 4, R.x0, R.y1, C.faint, 1, ca)
  line(R.x0, R.y1, R.x1, R.y1, C.faint, 1, ca)
  line(R.x0, cy(0.5), R.x1, cy(0.5), C.faint, 1, ca, [3, 4])
  line(cx(0), R.y0, cx(0), R.y1, C.faint, 1, ca, [3, 4])
  txt(NARROW ? 'win curve' : 'win curve  h(x) = σ((s̄T1 − s̄GEN)/400)', NARROW ? R.x1 : R.x0, R.y0 - (NARROW ? 10 : 18), { size: NARROW ? 8.5 : 10, color: C.accent, mono: true, weight: 700, alpha: ca, align: NARROW ? 'right' : 'left' })
  if (!NARROW) {
    txt('GEN stronger', R.x0 + 6, R.y1 + 12, { size: 8.5, color: M.color[1], mono: true, alpha: ca })
    txt('T1 stronger', R.x1, R.y1 + 12, { size: 8.5, color: M.color[0], mono: true, align: 'right', alpha: ca })
    txt('Merwe σ-points · α 0.1 · β 2 · κ 0', R.x0, R.y1 + 30, { size: 9, color: C.dim, mono: true, alpha: ca })
    txt('T1 win chance', R.x0 - 6, R.y0 - 4, { size: 8.5, color: C.dim, mono: true, align: 'right', alpha: ca })
  }
  txt('1', R.x0 - 6, cy(1) + (NARROW ? 0 : 8), { size: 8.5, color: C.dim, mono: true, align: 'right', alpha: ca })
  txt('0', R.x0 - 6, cy(0), { size: 8.5, color: C.dim, mono: true, align: 'right', alpha: ca })
  const reveal = seg(p, 0.04, 0.16)
  A(ca)
  ctx.beginPath()
  for (let k = 0; k <= 80 * reveal; k++) {
    const d = -dr + (2 * dr * k) / 80
    const x = cx(d)
    const y = cy(sigmoid(d / 400))
    if (k === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  }
  ctx.strokeStyle = C.accent
  ctx.lineWidth = 2.4
  ctx.stroke()

  M.sp.forEach((q, idx) => {
    const st = 0.28 + idx * 0.008
    const lt = (p - st) / 0.1
    if (lt <= 0) return
    const to = { x: cx(q.d), y: cy(sigmoid(q.d / 400)) }
    const col = q.ti < 0 ? C.hi : M.color[q.ti]
    const from = q.ti < 0 ? { x: (L.x0 + L.x1) / 2, y: L.y0 } : spPos[`${q.ti}-${q.i}-${q.s}`]
    if (lt < 1) {
      flight(from, to, lt, col, q.ti < 0 ? 3 : 2, NARROW ? 20 : 60)
    } else if (sigFade > 0) {
      const a = sigFade * clamp((lt - 1) * 4)
      line(to.x, to.y, R.x0, to.y, col, 1, a * 0.25)
      dot(R.x0, to.y, 1.6, col, a * 0.8)
      glow(to.x, to.y, q.ti < 0 ? 3 : 1.9, col, a)
    }
  })

  const pa = easeOut(seg(p, 0.48, 0.52))
  if (pa > 0) {
    const y = cy(M.phat)
    glow(R.x0, y, 4, C.hi, pa)
    txt(`predicted ${M.phat.toFixed(2)}`, R.x0 - 10, y, { size: NARROW ? 9 : 10.5, color: C.hi, mono: true, weight: 700, align: 'right', alpha: pa })
  }
  const ra = easeOut(seg(p, 0.56, 0.6))
  if (ra > 0) {
    const ti = M.blueWin ? 0 : 1
    const col = M.color[ti]
    const yo = cy(M.blueWin ? 1 : 0)
    const yp = cy(M.phat)
    line(R.x0 + 10, yp, R.x0 + 10, lerp(yp, yo, ra), C.hi, 1.5, 0.9, [3, 3])
    glow(R.x0, yo, 4, col, ra)
    const bx = R.x1
    const by = NARROW ? R.y0 + 12 : R.y0 + 6
    A(ra)
    ctx.font = `700 ${NARROW ? 9.5 : 11}px ${MONO}`
    const label = `RESULT · ${M.tag[ti]} WIN`
    const tw = ctx.measureText(label).width + 18
    rr(bx - tw, by - 10, tw, 20, 10)
    ctx.fillStyle = rgba(col, 0.1)
    ctx.fill()
    ctx.strokeStyle = rgba(col, 0.6)
    ctx.stroke()
    txt(label, bx - tw / 2, by, { size: NARROW ? 9.5 : 11, color: col, mono: true, weight: 700, align: 'center', alpha: ra })
    if (!NARROW) txt(`surprise ${signed(1 - M.phat, 2)}`, R.x0 + 16, (yp + yo) / 2, { size: 9, color: C.hi, mono: true, weight: 600, alpha: ra })
  }
  if (v > 0 && !NARROW) {
    txt('nudge = performance score / 30', R.x0, R.y1 + 46, { size: 10, color: C.green, mono: true, weight: 700, alpha: v })
  }
}

// ---------- scene 5: ratings carried over time ----------
// Illustrative career: outcomes and performance adjust the rating, observations contract
// uncertainty, and idle days widen it. The player stays in the same tier-2 league.
const TL = (() => {
  const r = rng(4242)
  const g = () => Math.sqrt(-2 * Math.log(r() + 1e-12)) * Math.cos(TAU * r())
  const HP = 1 / 2000 // d(logit)/d(player rating): one of five starters, scale 400
  const BETA = 1.144
  const MSIG = 3.438
  const QDAY = 197
  const V0 = 365576
  const GAME_VARIANCE_RETENTION = 0.92
  const MIN_VARIANCE = 55 ** 2
  const END = 520
  const GAP = [165, 300]
  const sched = []
  const add = (a, b, intl = false) => { for (let d = a; d < b; d += 2 + r() * 4) sched.push({ d: Math.round(d), intl }) }
  add(4, GAP[0]); add(GAP[1], 466); add(478, 506, true)
  let m = 1450 // new player = league average: 1500 + LCK CL offset (−50)
  let v = V0
  let last = 0
  const pts = [{ d: 0, m, sd: Math.sqrt(v) }]
  const games = []
  const idle = (to, tier) => {
    for (let d = last + 10; d < to; d += 10) pts.push({ d, m, sd: Math.sqrt(Math.min(v + QDAY * tier * (d - last), 2e6)) })
  }
  let sdSeason = null
  let sdIdle = 0
  for (const gm of sched) {
    const tier = 2
    idle(gm.d, tier)
    v = Math.min(v + QDAY * tier * (gm.d - last), 2e6)
    if (sdSeason === null && gm.d >= GAP[1]) { sdSeason = games[games.length - 1].sd; sdIdle = Math.sqrt(v) }
    const truth = 1500 + 250 * Math.min(1, gm.d / 420)
    const opp = (gm.intl ? 1600 : 1450) + g() * 40
    const y = r() < sigmoid((truth - opp) / 400) ? 1 : 0
    const p0 = sigmoid((m - opp) / 400)
    const w = p0 * (1 - p0)
    const den = 1 + w * 10 * HP * HP * v
    m += v * HP * (y - p0) / den
    v -= (v * HP) ** 2 * w / den
    const z = BETA * (truth - opp) / 400 + g() * MSIG
    const S = MSIG ** 2 + BETA ** 2 * 10 * HP * HP * v
    m += v * HP * BETA * (z - BETA * (m - opp) / 400) / S
    v -= (v * HP * BETA) ** 2 / S
    // Make accumulated evidence visibly narrow the illustrative uncertainty band.
    v = Math.max(MIN_VARIANCE, v * GAME_VARIANCE_RETENTION)
    pts.push({ d: gm.d, m, sd: Math.sqrt(v) })
    games.push({ d: gm.d, m, sd: Math.sqrt(v), intl: gm.intl })
    last = gm.d
  }
  idle(END + 1, 2)
  return { pts, games, END, GAP, sd0: Math.sqrt(V0), sdSeason, sdIdle }
})()

function tlAt (d) {
  const P = TL.pts
  if (d <= P[0].d) return P[0]
  for (let i = 1; i < P.length; i++) {
    if (P[i].d >= d) {
      const t = (d - P[i - 1].d) / ((P[i].d - P[i - 1].d) || 1)
      return { d, m: lerp(P[i - 1].m, P[i].m, t), sd: lerp(P[i - 1].sd, P[i].sd, t) }
    }
  }
  return P[P.length - 1]
}

// league offsets on the 1500 base (data.REGION_PRIOR − 1500), before and after an international event
const OFFSETS = [
  { name: 'LCK', a: 215, b: 223 },
  { name: 'LPL', a: 187, b: 182 },
  { name: 'LEC', a: 41, b: 35 },
  { name: 'LCS', a: -14, b: -20 },
  { name: 'LCK CL', a: -50, b: -50 }
]

function sceneTime (p) {
  const G = NARROW
    ? { x0: W * 0.12, x1: W * 0.97, y0: H * 0.12, y1: H * 0.52 }
    : { x0: W * 0.06, x1: W * 0.62, y0: H * 0.14, y1: H * 0.78 }
  const lo = 700
  const hi = 2300
  const xOf = (d) => lerp(G.x0, G.x1, d / TL.END)
  const yOf = (rt) => lerp(G.y1, G.y0, (rt - lo) / (hi - lo))
  const a0 = easeOut(seg(p, 0, 0.06))
  const day = p < 0.22
    ? lerp(0, 24, ease(seg(p, 0.03, 0.18)))
    : p < 0.45
      ? lerp(24, TL.GAP[0], ease(seg(p, 0.22, 0.41)))
      : p < 0.66
        ? lerp(TL.GAP[0], TL.GAP[1], ease(seg(p, 0.45, 0.62)))
        : lerp(TL.GAP[1], TL.END, ease(seg(p, 0.66, 0.95)))
  const fs = NARROW ? 8.5 : 9.5

  // axes
  for (const rt of [1000, 1500, 2000]) {
    line(G.x0, yOf(rt), G.x1, yOf(rt), C.faint, 1, a0 * (rt === 1500 ? 1 : 0.6), rt === 1500 ? null : [3, 4])
    txt(String(rt), G.x0 - 6, yOf(rt), { size: 8.5, color: C.dim, mono: true, align: 'right', alpha: a0 })
  }
  txt(NARROW ? 'ONE PLAYER · RATING ± 1 SD' : 'ONE PLAYER’S RATING, GAME BY GAME · BAND = ± 1 SD', G.x0, G.y0 - 14, { size: fs, color: C.dim, mono: true, weight: 600, alpha: a0 })

  // league strip under the chart
  const sy = G.y1 + (NARROW ? 12 : 16)
  const strip = [[0, TL.END, 'LCK CL · tier 2', C.dim]]
  strip.forEach(([d0, d1, label, col]) => {
    A(a0 * 0.18)
    ctx.fillStyle = col
    rr(xOf(d0) + 1, sy - 6, xOf(d1) - xOf(d0) - 2, 12, 6)
    ctx.fill()
    txt(label, (xOf(d0) + xOf(d1)) / 2, sy, { size: NARROW ? 8 : 9, color: col, mono: true, weight: 700, align: 'center', alpha: a0 })
  })
  if (!NARROW) txt('days →', G.x1, sy + 18, { size: 8.5, color: C.dim, mono: true, align: 'right', alpha: a0 })

  // off-season shading + international window
  const ga = easeOut(seg(p, 0.47, 0.52))
  if (ga > 0) {
    A(0.06 * ga)
    ctx.fillStyle = C.pink
    ctx.fillRect(xOf(TL.GAP[0]), G.y0, xOf(TL.GAP[1]) - xOf(TL.GAP[0]), G.y1 - G.y0)
    txt(`${TL.GAP[1] - TL.GAP[0]} days off`, (xOf(TL.GAP[0]) + xOf(TL.GAP[1])) / 2, G.y0 + 10, { size: fs, color: C.pink, mono: true, weight: 700, align: 'center', alpha: ga })
  }
  const ia = easeOut(seg(day, 470, 478))
  if (ia > 0) {
    A(0.08 * ia)
    ctx.fillStyle = C.accent
    ctx.fillRect(xOf(476), G.y0, xOf(508) - xOf(476), G.y1 - G.y0)
    txt(NARROW ? 'INTL' : 'international', (xOf(476) + xOf(508)) / 2, G.y0 + 10, { size: fs, color: C.accent, mono: true, weight: 700, align: 'center', alpha: ia })
  }

  // uncertainty band + rating line, revealed up to `day`
  const shown = TL.pts.filter((q) => q.d < day)
  shown.push(tlAt(day))
  ctx.save()
  ctx.beginPath()
  ctx.rect(G.x0, G.y0, G.x1 - G.x0, G.y1 - G.y0)
  ctx.clip()
  A(a0)
  ctx.beginPath()
  shown.forEach((q, k) => (k ? ctx.lineTo(xOf(q.d), yOf(q.m + q.sd)) : ctx.moveTo(xOf(q.d), yOf(q.m + q.sd))))
  for (let k = shown.length - 1; k >= 0; k--) ctx.lineTo(xOf(shown[k].d), yOf(shown[k].m - shown[k].sd))
  ctx.closePath()
  ctx.fillStyle = rgba(C.hi, 0.13)
  ctx.fill()
  // Outline both limits so the contraction remains clear at the compact chart size.
  for (const side of [-1, 1]) {
    A(a0 * 0.4)
    ctx.beginPath()
    shown.forEach((q, k) => (k ? ctx.lineTo(xOf(q.d), yOf(q.m + side * q.sd)) : ctx.moveTo(xOf(q.d), yOf(q.m + side * q.sd))))
    ctx.strokeStyle = C.hi
    ctx.lineWidth = 1
    ctx.stroke()
  }
  A(a0)
  ctx.beginPath()
  shown.forEach((q, k) => (k ? ctx.lineTo(xOf(q.d), yOf(q.m)) : ctx.moveTo(xOf(q.d), yOf(q.m))))
  ctx.strokeStyle = C.hi
  ctx.lineWidth = 2
  ctx.stroke()
  TL.games.forEach((gm) => {
    if (gm.d > day) return
    if (gm.intl) glow(xOf(gm.d), yOf(gm.m), 2.2, C.accent, a0)
    else dot(xOf(gm.d), yOf(gm.m), 1.5, C.hi, 0.55 * a0)
  })
  ctx.restore()
  const head = tlAt(day)
  glow(xOf(head.d), yOf(head.m), 3.2, C.hi, a0)

  // live readout
  const RD = NARROW ? { x: G.x1, y: G.y0 + 10, align: 'right' } : { x: W * 0.69, y: H * 0.18, align: 'left' }
  if (NARROW) {
    txt(`${Math.round(head.m)} ± ${Math.round(head.sd)}`, RD.x - 4, G.y1 - 12, { size: 10, color: C.hi, mono: true, weight: 700, align: 'right', alpha: a0 })
  } else {
    txt('RATING NOW', RD.x, RD.y, { size: 9, color: C.dim, mono: true, weight: 700, alpha: a0 })
    txt(String(Math.round(head.m)), RD.x, RD.y + 26, { size: 24, color: C.ink, weight: 750, alpha: a0 })
    ctx.font = `750 24px ${FONT}`
    const nw = ctx.measureText(String(Math.round(head.m))).width
    txt(`± ${Math.round(head.sd)}`, RD.x + nw + 10, RD.y + 28, { size: 13, color: C.hi, mono: true, weight: 700, alpha: a0 })
  }

  // context card: what this step is about
  const K = NARROW
    ? { x: W * 0.02, y: H * 0.66, w: W * 0.96, h: H * 0.32 }
    : { x: W * 0.68, y: H * 0.34, w: W * 0.3, h: H * 0.56 }
  const cards = [
    { a: easeOut(seg(p, 0.06, 0.12)) * (1 - seg(p, 0.45, 0.48)), draw: cardGames },
    { a: easeOut(seg(p, 0.48, 0.53)) * (1 - seg(p, 0.66, 0.69)), draw: cardIdle },
    { a: easeOut(seg(p, 0.69, 0.74)), draw: cardOffsets }
  ]
  cards.forEach((c) => { if (c.a > 0) { panel(K.x, K.y, K.w, K.h, c.a); c.draw(K, c.a, p) } })
}

function cardRows (K, a, title, rows) {
  const fs = NARROW ? 8.5 : 9.5
  txt(title, K.x + 12, K.y + 16, { size: NARROW ? 8 : 8.5, color: C.hi, mono: true, weight: 700, alpha: a })
  const rh = Math.min(22, (K.h - 32) / rows.length)
  rows.forEach((row, k) => {
    const y = K.y + 34 + k * rh
    txt(row[0], K.x + 12, y, { size: fs, color: row[2] || C.ink, mono: true, weight: row[3] ? 700 : 500, alpha: a })
    if (row[1]) txt(row[1], K.x + K.w - 12, y, { size: fs, color: row[2] || C.ink, mono: true, weight: 700, align: 'right', alpha: a })
  })
}

function cardGames (K, a) {
  cardRows(K, a, 'EVERY GAME TIGHTENS THE BAND', [
    ['first game: league average', '1450'],
    ['no history yet', `± ${Math.round(TL.sd0)}`, C.muted],
    ['after a season of games', `± ${Math.round(TL.sdSeason)}`, C.hi, true],
    [NARROW ? 'win/loss, then gold lead @15' : 'update: win/loss, then gold lead @15', '', C.dim]
  ])
}

function cardIdle (K, a) {
  const fs = NARROW ? 8.5 : 9.5
  txt('IDLE DAYS ADD UNCERTAINTY', K.x + 12, K.y + 16, { size: NARROW ? 8 : 8.5, color: C.hi, mono: true, weight: 700, alpha: a })
  const tiers = [['major', 1], ['minor', 1.5], ['tier 2', 2]]
  const rh = Math.min(24, (K.h - 56) / 3)
  const bx = K.x + K.w * 0.36
  const bw = K.w * 0.36
  tiers.forEach(([name, mult], k) => {
    const y = K.y + 36 + k * rh
    const on = mult === 2
    txt(name, K.x + 12, y, { size: fs, color: on ? C.pink : C.muted, mono: true, weight: on ? 700 : 500, alpha: a })
    A(a)
    ctx.fillStyle = C.track
    ctx.fillRect(bx, y - 3, bw, 6)
    A(a)
    ctx.fillStyle = on ? C.pink : C.dim
    ctx.fillRect(bx, y - 3, bw * mult / 2, 6)
    txt(`+${Math.round(197 * mult)}/day`, K.x + K.w - 12, y, { size: fs, color: on ? C.pink : C.muted, mono: true, weight: 700, align: 'right', alpha: a })
  })
  txt(`this break: ± ${Math.round(TL.sdSeason)} → ± ${Math.round(TL.sdIdle)}`, K.x + 12, K.y + K.h - 14, { size: fs, color: C.pink, mono: true, weight: 700, alpha: a })
}

function cardOffsets (K, a, p) {
  const fs = NARROW ? 8.5 : 9.5
  txt(NARROW ? 'LEAGUE OFFSETS · INTL GAMES ONLY' : 'LEAGUE OFFSETS · MOVED BY INTL GAMES ONLY', K.x + 12, K.y + 16, { size: NARROW ? 8 : 8.5, color: C.hi, mono: true, weight: 700, alpha: a })
  const t = ease(seg(p, 0.78, 0.98))
  const rh = Math.min(22, (K.h - 34) / OFFSETS.length)
  const ax = K.x + K.w * 0.52
  const half = K.w * 0.3
  line(ax, K.y + 26, ax, K.y + 30 + rh * OFFSETS.length, C.faint, 1, a)
  OFFSETS.forEach((o, k) => {
    const y = K.y + 36 + k * rh
    const val = lerp(o.a, o.b, t)
    const len = (val / 240) * half
    txt(o.name, K.x + 12, y, { size: fs, color: C.muted, mono: true, weight: 600, alpha: a })
    A(a)
    ctx.fillStyle = val >= 0 ? C.green : C.pink
    ctx.fillRect(Math.min(ax, ax + len), y - 3, Math.abs(len), 6)
    txt(signed(Math.round(val)), K.x + K.w - 12, y, { size: fs, color: o.a !== o.b && t > 0 ? C.accent : C.ink, mono: true, weight: 700, align: 'right', alpha: a })
  })
}

// ---------- scene 5: features -> LightGBM ----------
const PREDICTION_TREE_COUNT = 400

function forestField (box, time, alpha = 1, highlight = 0) {
  const cols = 20
  const rows = PREDICTION_TREE_COUNT / cols
  const cellW = box.w / cols
  const cellH = box.h / rows
  const sweep = reduceMotion ? 0.5 : (time / 5200) % 1
  for (let i = 0; i < PREDICTION_TREE_COUNT; i++) {
    const x = box.x + (i % cols + 0.5) * cellW
    const y = box.y + (Math.floor(i / cols) + 0.5) * cellH
    const reveal = reduceMotion ? 1 : easeOut(seg(time, i * 2.5, 450 + i * 2.5))
    const distance = Math.abs(i / PREDICTION_TREE_COUNT - sweep)
    const active = Math.max(0, 1 - distance / 0.06)
    const color = i === highlight ? C.hi : active > 0.1 ? C.accent : C.dim
    const a = alpha * reveal * (i === highlight ? 1 : 0.35 + active * 0.65)
    const dx = Math.min(5, cellW * 0.3)
    const dy = Math.min(4, cellH * 0.32)
    line(x, y - dy, x, y, color, 1, a)
    line(x, y, x - dx, y + dy, color, 1, a)
    line(x, y, x + dx, y + dy, color, 1, a)
    if (i === highlight) {
      A(alpha * reveal)
      rr(x - cellW * 0.46, y - cellH * 0.47, cellW * 0.92, cellH * 0.94, 2)
      ctx.strokeStyle = C.hi
      ctx.lineWidth = 1.5
      ctx.stroke()
    }
  }
}

// One continuous world: camera movement reveals scale without changing layouts.
const FOREST_GRAPHS = Array.from({ length: PREDICTION_TREE_COUNT }, (_, i) => {
  const random = rng(2909 + i * 97)
  const x = (i % 20) * 240
  const y = Math.floor(i / 20) * 180
  const levels = treeLayout(x, y - 46, 166, 98)
  const path = treePath(levels, Math.floor(random() * 8))
  return { x, y, levels, path, lengths: polyLen(path), color: i % 3 ? C.hi : C.accent }
})

function sceneForest () {
  const time = reduceMotion ? 10000 : flowTime
  const pan = ease(seg(time, 800, 3500))
  const zoom = ease(seg(time, 3500, 6800))
  const initialScale = Math.min(W * 0.7 / 166, H * 0.55 / 110, 2.2)
  const finalScale = Math.min(W * 0.94 / 4800, H * 0.77 / 3600)
  const scale = Math.exp(lerp(Math.log(initialScale), Math.log(finalScale), zoom))
  const cameraX = lerp(lerp(7 * 240, 11 * 240, pan), 9.5 * 240, zoom)
  const cameraY = lerp(9 * 180, 9.5 * 180, zoom)
  const centerY = H * 0.53
  ctx.save()
  ctx.beginPath()
  ctx.rect(0, H * 0.14, W, H * 0.8)
  ctx.clip()
  ctx.translate(W / 2, centerY)
  ctx.scale(scale, scale)
  ctx.translate(-cameraX, -cameraY)
  FOREST_GRAPHS.forEach((tree, i) => {
    if (Math.abs(tree.x - cameraX) > W / (2 * scale) + 110 ||
        Math.abs(tree.y - cameraY) > H * 0.42 / scale + 90) return
    const alpha = 0.55 + 0.45 * Math.exp(-Math.hypot(tree.x - cameraX, tree.y - cameraY) / 1200)
    drawTree(tree.levels, alpha * 0.65)
    for (let k = 1; k < tree.path.length; k++) {
      line(tree.path[k - 1].x, tree.path[k - 1].y, tree.path[k].x, tree.path[k].y, tree.color, 1.8, alpha * 0.75)
    }
    if (!reduceMotion) {
      const phase = (time / 2300 + i * 0.137) % 1
      const point = along(tree.path, tree.lengths, phase)
      dot(point.x, point.y, 3, tree.color, alpha * Math.sin(Math.PI * phase))
    }
    if (scale > 0.35) txt(`Tree ${i + 1}`, tree.x, tree.y - 68, { size: 11, color: tree.color, mono: true, weight: 700, align: 'center', alpha })
  })
  ctx.restore()
  const titleAlpha = 1 - ease(seg(time, 3500, 4400))
  txt('One tree is part of a much bigger model', W / 2, H * 0.08, { size: NARROW ? 12 : 18, weight: 700, align: 'center', alpha: titleAlpha })
  txt('400 trees. One prediction.', W / 2, H * 0.08, { size: NARROW ? 17 : 23, weight: 750, align: 'center', alpha: 1 - titleAlpha })
}

function sceneScoreSum (p, M) {
  const contributions = M.forest.map((tree) => Math.round(tree.val * 1000))
  const totals = [0]
  contributions.forEach((value) => totals.push(totals[totals.length - 1] + value))
  const number = (value) => (value / 1000).toFixed(3)
  const delta = (value) => `${value < 0 ? '−' : '+'}${number(Math.abs(value))}`
  const left = W * 0.05
  const right = W * 0.95
  const rowH = H * 0.095
  const top = H * 0.23
  const contributionX = W * 0.47
  const totalX = W * 0.84
  txt('400 contributions. One total.', W / 2, H * 0.08, { size: NARROW ? 15 : 20, weight: 750, align: 'center' })
  txt('TREE', left + 10, H * 0.175, { size: 9, color: C.dim, mono: true, weight: 700 })
  txt('ADD / SUBTRACT', contributionX, H * 0.175, { size: NARROW ? 7 : 9, color: C.dim, mono: true, weight: 700, align: 'center' })
  txt('RUNNING TOTAL', totalX, H * 0.175, { size: NARROW ? 7 : 9, color: C.hi, mono: true, weight: 700, align: 'center' })
  contributions.forEach((value, k) => {
    const start = 0.686 + k * 0.024
    const added = easeOut(seg(p, start, start + 0.019))
    const y = top + k * rowH
    const color = value >= 0 ? C.green : C.pink
    const alpha = 0.3 + added * 0.7
    A(added * 0.06)
    rr(left, y - rowH * 0.4, right - left, rowH * 0.88, 7)
    ctx.fillStyle = color
    ctx.fill()
    txt(k === 5 ? '395 more trees' : `Tree ${k + 1}`, left + 10, y, { size: NARROW ? 10 : 14, weight: 650, alpha })
    txt(delta(value), contributionX, y, { size: NARROW ? 13 : 17, color, mono: true, weight: 700, align: 'center', alpha })
    const from = { x: contributionX + W * 0.08, y }
    const to = { x: totalX - W * 0.09, y }
    line(from.x, y, to.x, y, color, 1.3, added * 0.35)
    if (added > 0 && added < 1) glow(lerp(from.x, to.x, added), y, 3, color)
    if (added > 0) {
      const running = Math.round(lerp(totals[k], totals[k + 1], added))
      txt(number(running), totalX, y, { size: NARROW ? 14 : 19, color: C.hi, mono: true, weight: 750, align: 'center' })
    } else txt('—', totalX, y, { size: 13, color: C.faint, align: 'center' })
    if (k < contributions.length - 1) line(totalX, y + rowH * 0.32, totalX, y + rowH * 0.65, C.hi, 1, added * 0.35)
  })
  const done = easeOut(seg(p, 0.827, 0.85))
  line(left, H * 0.82, right, H * 0.82, C.faint, 1)
  txt(`FINAL SCORE = ${number(totals[6])}`, W / 2, H * 0.89, { size: NARROW ? 17 : 24, color: C.hi, mono: true, weight: 750, align: 'center', alpha: done })
}

function scene4 (p, M) {
  if (p >= 0.28 && p < 0.46) {
    sceneForest(M)
    return
  }
  if (p >= 0.68 && p < 0.86) {
    sceneScoreSum(p, M)
    return
  }
  if (p >= 0.86) {
    forestField({ x: W * 0.08, y: H * 0.17, w: W * 0.84, h: H * 0.39 }, reduceMotion ? 9000 : flowTime + 2000, 0.7)
    txt('400 TREE OUTPUTS → ONE SCORE', W / 2, H * 0.1, { size: NARROW ? 11 : 15, color: C.hi, mono: true, weight: 700, align: 'center' })
    const displayedScore = M.forest.reduce((sum, tree) => sum + Math.round(tree.val * 1000), 0) / 1000
    txt(`score ${signed(displayedScore, 3)}`, W / 2, H * 0.67, { size: NARROW ? 17 : 23, color: C.hi, mono: true, weight: 700, align: 'center' })
    txt(`${pct(M.pRaw)} chance for T1`, W / 2, H * 0.82, { size: NARROW ? 24 : 36, color: C.ink, weight: 750, align: 'center' })
    return
  }
  if (p >= 0.46) txt('6 ENLARGED EXAMPLES / 400 TREES', W / 2, H * 0.065, { size: NARROW ? 8 : 10, color: C.hi, mono: true, weight: 700, align: 'center' })
  const F = NARROW
    ? { x0: W * 0.02, x1: W * 0.52, y0: H * 0.12, y1: H * 0.64 }
    : { x0: W * 0.01, x1: W * 0.35, y0: H * 0.12, y1: H * 0.95 }
  const rh = (F.y1 - F.y0) / M.feats.length
  const ax = F.x0 + (F.x1 - F.x0) * (NARROW ? 0.73 : 0.66)
  const half = F.x1 - ax - 4
  const fs = NARROW ? 8 : 10
  const barEnd = []
  const tree1 = seg(p, 0.28, 0.3) * (1 - seg(p, 0.5, 0.54))
  const featHi = (k) => (k === 0 || k === 1 ? seg(p, 0.2, 0.23) * (1 - seg(p, 0.27, 0.3)) : 0) +
    (M.forest[0].src.includes(k) ? tree1 : 0)
  line(ax, F.y0 + 4, ax, F.y1 - 4, C.faint, 1, 1)
  M.feats.forEach((f, k) => {
    const y = F.y0 + (k + 0.5) * rh
    const a = easeOut(seg(p, 0.02 + k * 0.02, 0.06 + k * 0.02))
    const fill = easeOut(seg(p, 0.05 + k * 0.02, 0.14 + k * 0.02))
    const col = f.v >= 0 ? M.color[0] : M.color[1]
    const h = clamp(featHi(k))
    if (h > 0) {
      A(0.08 * h)
      ctx.fillStyle = C.hi
      rr(F.x0 - 4, y - rh / 2 + 2, F.x1 - F.x0 + 8, rh - 4, 6)
      ctx.fill()
    }
    txt(f.name, F.x0, y, { size: fs, color: h > 0.5 ? C.hi : C.muted, mono: true, weight: h > 0.5 ? 700 : 500, alpha: a })
    A(a)
    ctx.fillStyle = C.track
    ctx.fillRect(ax - half, y - 3, half * 2, 6)
    A(a)
    ctx.fillStyle = col
    const len = f.v * half * fill
    ctx.fillRect(Math.min(ax, ax + len), y - 3, Math.abs(len), 6)
    if (!NARROW && fill > 0.9) txt(signed(f.v, 2), ax + (f.v >= 0 ? -6 : 6), y - 11, { size: 8, color: C.dim, mono: true, align: f.v >= 0 ? 'right' : 'left', alpha: a })
    barEnd.push({ x: ax + f.v * half, y })
  })
  const la = easeOut(seg(p, 0, 0.08))
  txt(`← ${M.tag[1]}`, ax - half, F.y0 - 6, { size: 9, color: M.color[1], mono: true, weight: 700, alpha: la })
  txt(`${M.tag[0]} →`, ax + half, F.y0 - 6, { size: 9, color: M.color[0], mono: true, weight: 700, align: 'right', alpha: la })

  const T = NARROW
    ? { x0: W * 0.56, x1: W * 0.99, y0: H * 0.12, y1: H * 0.66, cols: 2 }
    : { x0: W * 0.4, x1: W * 0.79, y0: H * 0.14, y1: H * 0.92, cols: 3 }
  const rows = 6 / T.cols
  const cw = (T.x1 - T.x0) / T.cols
  const chh = (T.y1 - T.y0) / rows
  const trees = M.forest.map((t, k) => {
    const c = k % T.cols
    const r = Math.floor(k / T.cols)
    const lv = treeLayout(T.x0 + (c + 0.5) * cw, T.y0 + r * chh + chh * 0.16, cw * 0.78, chh * 0.56)
    return { lv, path: treePath(lv, t.leaf), cx: T.x0 + (c + 0.5) * cw, top: T.y0 + r * chh }
  })
  const ta = easeOut(seg(p, 0.06, 0.14))
  trees.forEach((t, k) => {
    drawTree(t.lv, ta * (k === 0 ? 1 : 1 - 0.5 * tree1))
    if (p >= 0.28 && (k === 0 || p >= 0.54)) {
      flowingPath(t.path, k * 0.17, k === 0 ? C.hi : C.accent, ta)
    }
    txt(`tree ${k + 1}`, t.cx - cw * 0.39, t.top + chh * 0.04, { size: 8.5, color: k === 0 && tree1 > 0.5 ? C.hi : C.dim, mono: true, weight: k === 0 ? 700 : 500, alpha: ta })
  })

  const ACC = NARROW
    ? { ox: W * 0.5, oy: H * 0.8, ux: 1, uy: 0, len: W * 0.4 }
    : { ox: W * 0.89, oy: H * 0.55, ux: 0, uy: -1, len: H * 0.3 }
  const unit = ACC.len / 2.4
  const accPt = (val, off = 0) => ({ x: ACC.ox + ACC.ux * val * unit + (ACC.uy ? off : 0), y: ACC.oy + ACC.uy * val * unit + (ACC.ux ? off : 0) })

  const sparkT = (k, s) => (k === 0 ? { st: 0.28 + s * 0.015, dur: 0.06 } : { st: 0.5 + k * 0.012 + s * 0.008, dur: 0.06 })
  const walkT = (k) => (k === 0 ? { st: 0.33, dur: 0.12 } : { st: 0.54 + (k - 1) * 0.022, dur: 0.06 })

  trees.forEach((t, k) => {
    M.forest[k].src.forEach((fi, s) => {
      const { st, dur } = sparkT(k, s)
      flight(barEnd[fi], t.lv[0][0], (p - st) / dur, k === 0 ? C.hi : M.feats[fi].v >= 0 ? M.color[0] : M.color[1], k === 0 ? 2.4 : 1.8, 24)
    })
  })
  trees.forEach((t, k) => {
    const { st, dur } = walkT(k)
    const lt = seg(p, st, st + dur)
    if (lt <= 0) return
    const val = k === 5 ? M.forest[k].val / 395 : M.forest[k].val
    const col = val >= 0 ? M.color[0] : M.color[1]
    const L = polyLen(t.path)
    const et = k === 0 ? lt : ease(lt)
    for (let s = 1; s < t.path.length; s++) {
      const a0 = L[s - 1] / L[L.length - 1]
      if (et < a0) break
      const pe = et < L[s] / L[L.length - 1] ? along(t.path, L, et) : t.path[s]
      line(t.path[s - 1].x, t.path[s - 1].y, pe.x, pe.y, k === 0 ? C.hi : C.accent, 2.2, 0.9)
    }
    const head = along(t.path, L, et)
    glow(head.x, head.y, lt < 1 ? 2.6 : 3, lt < 1 ? (k === 0 ? C.hi : C.accent) : col)
    if (lt >= 1) {
      const leaf = t.path[t.path.length - 1]
      txt(signed(val, 2), leaf.x, leaf.y + 13, { size: NARROW ? 8.5 : 9.5, color: col, mono: true, weight: 700, align: 'center', alpha: seg(p, st + dur, st + dur + 0.03) })
    }
  })

  if (tree1 > 0) {
    const pw = NARROW ? T.x1 - T.x0 : cw * 2 - 8
    const px0 = NARROW ? T.x0 : T.x0 + cw + 4
    const py0 = NARROW ? T.y0 + chh + 4 : T.y0 + 4
    const ph = NARROW ? chh * 2 - 8 : chh - 8
    panel(px0, py0, pw, ph, tree1)
    txt('TREE 1 ASKS', px0 + 12, py0 + 15, { size: 8.5, color: C.hi, mono: true, weight: 700, alpha: tree1 })
    const { st, dur } = walkT(0)
    const qh = (ph - 28) / 4
    M.questions.forEach((q, l) => {
      const a = tree1 * seg(p, st + (l / 3) * dur, st + (l / 3) * dur + 0.02)
      if (a <= 0) return
      const f = M.feats[q.f]
      const y = py0 + 31 + l * qh
      txt(`${f.name} > ${q.thr.toFixed(2)}?`, px0 + 12, y, { size: NARROW ? 8 : 9.5, color: C.ink, mono: true, alpha: a })
      txt(`${signed(f.v, 2)} → ${q.yes ? 'yes, go right' : 'no, go left'}`, px0 + 12, y + (NARROW ? 11 : 13), { size: NARROW ? 7.5 : 9, color: q.yes ? C.green : C.pink, mono: true, weight: 600, alpha: a })
    })
    const la2 = tree1 * seg(p, st + dur, st + dur + 0.03)
    if (la2 > 0) {
      txt(`leaf value ${signed(M.forest[0].val, 2)}`, px0 + 12, py0 + 31 + 3 * qh, { size: NARROW ? 8.5 : 10, color: C.hi, mono: true, weight: 700, alpha: la2 })
    }
  }

  const aa = easeOut(seg(p, 0.66, 0.7))
  const zero = accPt(0)
  const pmax = accPt(2.4)
  const pmin = accPt(-2.4)
  line(pmin.x, pmin.y, pmax.x, pmax.y, C.faint, 1, aa)
  if (ACC.ux) line(zero.x, zero.y - 8, zero.x, zero.y + 8, C.muted, 1, aa)
  else line(zero.x - 10, zero.y, zero.x + 10, zero.y, C.muted, 1, aa)
  txt('SCORE', zero.x, NARROW ? zero.y - 18 : pmax.y - 14, { size: 9, color: C.dim, mono: true, weight: 700, align: 'center', alpha: aa })
  if (!NARROW) {
    txt(`${M.tag[0]} ↑`, zero.x + 16, pmax.y + 4, { size: 8.5, color: M.color[0], mono: true, weight: 600, alpha: aa })
    txt(`${M.tag[1]} ↓`, zero.x + 16, pmin.y - 4, { size: 8.5, color: M.color[1], mono: true, weight: 600, alpha: aa })
  }
  let cum = 0
  M.forest.forEach((t, k) => {
    const st = 0.7 + k * 0.025
    const lt = (p - st) / 0.06
    const leaf = trees[k].path[3]
    const col = t.val >= 0 ? M.color[0] : M.color[1]
    if (lt > 0 && lt < 1) flight(leaf, accPt(cum + t.val), lt, col, 2.4, 20)
    if (lt >= 1) {
      const off = (k % 2 ? 1 : -1) * 2
      const a = accPt(cum, off)
      const b = accPt(cum + t.val, off)
      A(0.9)
      ctx.strokeStyle = col
      ctx.lineWidth = 6
      ctx.lineCap = 'round'
      ctx.beginPath()
      ctx.moveTo(a.x, a.y)
      ctx.lineTo(b.x, b.y)
      ctx.stroke()
      ctx.lineCap = 'butt'
    }
    cum += t.val
  })
  const done = easeOut(seg(p, 0.86, 0.92))
  if (done > 0) {
    const tip = accPt(M.logit)
    glow(tip.x, tip.y, 4, C.hi, done)
    if (NARROW) {
      txt(`total ${signed(M.logit, 2)}  →  raw chance ${pct(M.pRaw)}`, W / 2, H * 0.92, { size: 10, color: C.hi, mono: true, weight: 700, align: 'center', alpha: done })
    } else {
      txt(`total ${signed(M.logit, 2)}`, zero.x, pmin.y + 18, { size: 10.5, color: C.hi, mono: true, weight: 700, align: 'center', alpha: done })
      txt(`→ ${pct(M.pRaw)} T1`, zero.x, pmin.y + 34, { size: 10.5, color: C.ink, mono: true, weight: 700, align: 'center', alpha: done })
    }
  }
}

// ---------- scene 6: calibration + market ----------
function scene5 (p, M) {
  const s = NARROW ? W * 0.44 : Math.min(W * 0.32, H * 0.68)
  const x0 = NARROW ? W * 0.08 : W * 0.06
  const y0 = NARROW ? H * 0.12 : H * 0.12
  const px = (v) => x0 + v * s
  const py = (v) => y0 + s - v * s
  const a0 = easeOut(seg(p, 0, 0.06))

  for (const g of [0, 0.25, 0.5, 0.75, 1]) {
    line(px(g), y0, px(g), y0 + s, C.faint, 1, a0 * (g % 1 === 0 ? 1 : 0.5))
    line(x0, py(g), x0 + s, py(g), C.faint, 1, a0 * (g % 1 === 0 ? 1 : 0.5))
  }
  line(px(0), py(0), px(1), py(1), C.dim, 1, a0, [4, 4])
  if (!NARROW) txt('perfect', px(0.78), py(0.86), { size: 8.5, color: C.dim, mono: true, align: 'right', alpha: a0 })
  txt('model said', x0 + s, y0 + s + 13, { size: 9, color: C.dim, mono: true, align: 'right', alpha: a0 })
  ctx.save()
  ctx.translate(x0 - 10, y0)
  ctx.rotate(-Math.PI / 2)
  txt('actually won', 0, 0, { size: 9, color: C.dim, mono: true, align: 'right', alpha: a0 })
  ctx.restore()

  const hb = s / M.bins.length
  M.bins.forEach((b, i) => {
    const h = b * s * 0.16 * easeOut(seg(p, 0.02 + i * 0.006, 0.08 + i * 0.006))
    A(0.22)
    ctx.fillStyle = C.hi
    ctx.fillRect(x0 + i * hb + 1, y0 + s - h, hb - 2, h)
  })

  const fraw = (x) => clamp(0.5 + (x - 0.5) * 0.68 + 0.035 * Math.sin(x * 8 + M.ph))
  const fcal = (x) => clamp(x + 0.05 * Math.sin(x * 11 + M.ph) * x * (1 - x))
  const m = ease(seg(p, 0.2, 0.42))
  const draw = (f, color, w, a, dash) => {
    A(a)
    ctx.beginPath()
    for (let k = 0; k <= 50; k++) {
      const x = k / 50
      if (k === 0) ctx.moveTo(px(x), py(f(x)))
      else ctx.lineTo(px(x), py(f(x)))
    }
    ctx.strokeStyle = color
    ctx.lineWidth = w
    if (dash) ctx.setLineDash(dash)
    ctx.stroke()
    ctx.setLineDash([])
  }
  const reveal = seg(p, 0.04, 0.12)
  if (m > 0) draw(fraw, C.pink, 1.3, 0.55 * m, [3, 3])
  ctx.save()
  ctx.beginPath()
  ctx.rect(x0 - 4, y0 - 4, (s + 8) * reveal, s + 8)
  ctx.clip()
  draw((x) => lerp(fraw(x), fcal(x), m), m > 0.5 ? C.green : C.accent, 2.6, a0)
  ctx.restore()
  txt(m < 0.5 ? 'raw model' : 'calibrated', px(0.96), py(lerp(fraw(0.96), fcal(0.96), m)) - 12, { size: 9.5, color: m < 0.5 ? C.accent : C.green, mono: true, weight: 700, align: 'right', alpha: a0 })

  const oc = seg(p, 0.13, 0.16) * (1 - seg(p, 0.22, 0.26))
  if (oc > 0) {
    line(px(0.8), py(0.8), px(0.8), py(fraw(0.8)), C.hi, 1.5, oc, [2, 3])
    glow(px(0.8), py(fraw(0.8)), 3, C.hi, oc)
    txt(`said 80% → won ${Math.round(fraw(0.8) * 100)}%`, px(0.8) - 8, py(fraw(0.8)) + 14, { size: NARROW ? 8.5 : 9.5, color: C.hi, mono: true, weight: 700, align: 'right', alpha: oc })
  }

  const ma = easeOut(seg(p, 0.46, 0.5))
  if (ma > 0) {
    const t = ease(seg(p, 0.5, 0.58))
    const xv = lerp(M.pRaw, M.pCal, t)
    line(px(xv), y0 + s, px(xv), py(xv), C.hi, 1, ma * 0.7, [2, 3])
    glow(px(xv), y0 + s, 3.4, C.hi, ma)
    glow(px(xv), py(xv), 2.6, C.hi, ma * t)
    txt(t < 0.5 ? `raw ${pct(M.pRaw)}` : `adjusted ${pct(M.pCal)}`, px(xv), y0 + s + 26, { size: 10, color: C.hi, mono: true, weight: 700, align: 'center', alpha: ma })
  }

  const R = NARROW ? W * 0.15 : Math.min(H * 0.26, W * 0.13)
  const dcx = NARROW ? W * 0.76 : W * 0.68
  const dcy = NARROW ? y0 + s / 2 : H * 0.45
  const thick = R * 0.14
  const fill = ease(seg(p, 0.6, 0.72))
  const start = -Math.PI / 2
  A(1)
  ctx.lineWidth = thick
  ctx.strokeStyle = C.track
  ctx.beginPath()
  ctx.arc(dcx, dcy, R, 0, TAU)
  ctx.stroke()
  if (fill > 0) {
    ctx.lineCap = 'round'
    ctx.strokeStyle = M.color[0]
    ctx.beginPath()
    ctx.arc(dcx, dcy, R, start, start + TAU * M.pCal * fill)
    ctx.stroke()
    ctx.strokeStyle = M.color[1]
    ctx.beginPath()
    ctx.arc(dcx, dcy, R, start + TAU, start + TAU - TAU * (1 - M.pCal) * fill, true)
    ctx.stroke()
    ctx.lineCap = 'butt'
  }
  txt(`${Math.round(M.pCal * 100 * fill)}%`, dcx, dcy - R * 0.06, { size: Math.round(R * 0.44), color: C.ink, weight: 750, align: 'center', alpha: clamp(fill * 2) })
  txt(`${M.tag[0]} win`, dcx, dcy + R * 0.32, { size: NARROW ? 9 : 10.5, color: M.color[0], mono: true, weight: 700, align: 'center', alpha: clamp(fill * 2) })
  if (!NARROW && fill > 0) {
    txt(`${M.tag[1]} ${Math.round((1 - M.pCal) * 100)}%`, dcx - R - thick - 10, dcy, { size: 9.5, color: M.color[1], mono: true, weight: 700, align: 'right', alpha: clamp(fill * 2) })
  }

  const mk = easeOut(seg(p, 0.76, 0.8))
  if (mk > 0) {
    const ang = start + TAU * M.pm
    const r0 = R - thick
    const r1 = R + thick * 1.8
    line(dcx + Math.cos(ang) * r0, dcy + Math.sin(ang) * r0, dcx + Math.cos(ang) * r1, dcy + Math.sin(ang) * r1, C.hi, 2.5, mk)
    const label = `bookmakers ${pct(M.pm)}`
    if (NARROW) {
      txt(label, dcx, dcy + R + thick + 14, { size: 9, color: C.hi, mono: true, weight: 700, align: 'center', alpha: mk })
    } else {
      const lr = R + thick * 2.8
      txt(label, dcx + Math.cos(ang) * lr, dcy + Math.sin(ang) * lr, { size: 10, color: C.hi, mono: true, weight: 700, align: Math.cos(ang) >= 0 ? 'left' : 'right', alpha: mk })
    }
  }

  const ea = easeOut(seg(p, 0.86, 0.9))
  if (ea > 0) {
    const k = kellyOf(M)
    const ex = NARROW ? W / 2 : dcx
    const ey = NARROW ? H * 0.86 : dcy + R + thick + 36
    txt(`edge ${signed(k.edge * 100, 0)} points`, ex, ey, { size: NARROW ? 12 : 14, color: k.bet ? C.green : C.muted, weight: 750, align: 'center', alpha: ea })
    txt(k.bet ? `bet ${(k.stake * 100).toFixed(1)}% of bankroll on ${M.tag[k.side]}` : 'inside the margin · no bet', ex, ey + 19, { size: NARROW ? 9 : 10.5, color: C.muted, mono: true, align: 'center', alpha: ea })
  }
}

// ---------- scene 8: every team vs every team ----------
// ratings.team_ratings + win_prob_matrix: team = mean of its latest five starters' global ratings
// (player + league offset); P(row beats col) = σ(slope · Δ / 400) on a neutral side; series odds
// via bestof_prob. T1 − Gen.G keeps the 45-point gap used in the earlier stages.
function bestOf (pv, n) {
  const need = Math.floor(n / 2) + 1
  let s = 0
  let c = 1
  for (let k = 0; k < need; k++) {
    if (k) c = c * (need - 1 + k) / k
    s += c * pv ** need * (1 - pv) ** k
  }
  return s
}

const LEAGUE = (() => {
  const teams = [
    ['T1', 'LCK', 1752], ['BLG', 'LPL', 1738], ['HLE', 'LCK', 1724], ['GEN', 'LCK', 1707],
    ['TES', 'LPL', 1690], ['G2', 'LEC', 1612], ['FNC', 'LEC', 1561], ['FLY', 'LCS', 1548]
  ].map(([tag, league, r]) => ({ tag, league, r }))
  const P = teams.map((a) => teams.map((b) => sigmoid((a.r - b.r) / 400)))
  const p1 = P[0][3]
  return { teams, P, ti: 0, tj: 3, series: [1, 3, 5].map((n) => ({ n, v: bestOf(p1, n) })) }
})()
const teamColor = (tag) => (tag === 'T1' ? C.t1 : tag === 'GEN' ? C.gen : C.ink)

function scene7 (p, M) {
  const T = LEAGUE.teams
  const n = T.length
  const fs = NARROW ? 8.5 : 9.5
  const listA = NARROW ? 1 - seg(p, 0.46, 0.5) : 1
  const matA = NARROW ? seg(p, 0.48, 0.52) : 1

  // ranked list
  const Lx = NARROW ? { x0: W * 0.03, x1: W * 0.97, y0: H * 0.12, y1: H * 0.6 } : { x0: W * 0.01, x1: W * 0.24, y0: H * 0.14, y1: H * 0.94 }
  const lh = (Lx.y1 - Lx.y0) / n
  const hiT1 = seg(p, 0.22, 0.26) * (1 - seg(p, 0.46, 0.5))
  if (listA > 0) {
    txt('POWER RANKING', Lx.x0, Lx.y0 - 12, { size: 9.5, color: C.dim, mono: true, weight: 600, alpha: listA })
    T.forEach((t, k) => {
      const y = Lx.y0 + (k + 0.5) * lh
      const a = easeOut(seg(p, 0.02 + k * 0.02, 0.07 + k * 0.02)) * listA
      if (a <= 0) return
      if (k === LEAGUE.ti && hiT1 > 0) {
        A(0.08 * hiT1 * listA)
        ctx.fillStyle = C.hi
        rr(Lx.x0 - 4, y - lh / 2 + 2, Lx.x1 - Lx.x0 + 8, lh - 4, 6)
        ctx.fill()
      }
      txt(String(k + 1), Lx.x0 + 6, y, { size: fs, color: C.dim, mono: true, align: 'center', alpha: a })
      txt(t.tag, Lx.x0 + 20, y, { size: fs + 1, color: teamColor(t.tag), weight: 700, alpha: a })
      txt(t.league, Lx.x0 + 58, y, { size: 8.5, color: C.dim, mono: true, alpha: a })
      const bx = Lx.x0 + (NARROW ? W * 0.3 : (Lx.x1 - Lx.x0) * 0.5)
      const bw = Lx.x1 - bx - 40
      const fill = easeOut(seg(p, 0.05 + k * 0.02, 0.14 + k * 0.02))
      A(a)
      ctx.fillStyle = C.track
      ctx.fillRect(bx, y - 3, bw, 6)
      A(a)
      ctx.fillStyle = k === LEAGUE.ti ? C.hi : C.accent
      ctx.fillRect(bx, y - 3, bw * ((t.r - 1450) / 320) * fill, 6)
      txt(String(t.r), Lx.x1, y, { size: fs, color: C.ink, mono: true, weight: 700, align: 'right', alpha: a })
    })
  }

  // matrix
  const head = NARROW ? 30 : 36
  const cell = NARROW
    ? Math.min((W * 0.94 - head) / n, (H * 0.56 - 18) / n)
    : Math.min((W * 0.4 - head) / n, (H * 0.8 - 18) / n)
  const mx = NARROW ? W * 0.03 + head : W * 0.3 + head
  const my = NARROW ? H * 0.1 + 18 : H * 0.14 + 18
  const fillAt = (i, j) => 0.5 + ((i + j) / (2 * n - 2)) * 0.16
  const hA = easeOut(seg(p, 0.48, 0.52)) * matA
  if (hA > 0) {
    txt(NARROW ? 'P(ROW BEATS COL)' : 'P(ROW BEATS COLUMN) · ONE GAME · NEUTRAL SIDE', mx - head, my - 26, { size: 9.5, color: C.dim, mono: true, weight: 600, alpha: hA })
    T.forEach((t, k) => {
      txt(t.tag, mx - 6, my + (k + 0.5) * cell, { size: NARROW ? 8 : 9, color: teamColor(t.tag), mono: true, weight: 700, align: 'right', alpha: hA })
      txt(t.tag, mx + (k + 0.5) * cell, my - 8, { size: NARROW ? 7.5 : 9, color: teamColor(t.tag), mono: true, weight: 700, align: 'center', alpha: hA })
    })
  }
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const st = fillAt(i, j)
      const a = easeOut(seg(p, st, st + 0.05)) * matA
      if (a <= 0) continue
      const x = mx + j * cell
      const y = my + i * cell
      if (i === j) {
        A(a)
        ctx.fillStyle = C.track
        ctx.fillRect(x + 1, y + 1, cell - 2, cell - 2)
        continue
      }
      const pv = LEAGUE.P[i][j]
      A(a * clamp(0.12 + Math.abs(pv - 0.5) / 0.14 * 0.6))
      ctx.fillStyle = pv >= 0.5 ? C.green : C.pink
      ctx.fillRect(x + 1, y + 1, cell - 2, cell - 2)
      if (cell >= 26) txt(String(Math.round(pv * 100)), x + cell / 2, y + cell / 2, { size: cell >= 36 ? 10 : 8.5, color: C.ink, mono: true, weight: 600, align: 'center', alpha: a })
    }
  }

  // highlighted pairing: the example match
  const pa = easeOut(seg(p, 0.75, 0.79))
  if (pa > 0) {
    const x = mx + LEAGUE.tj * cell
    const y = my + LEAGUE.ti * cell
    A(pa * pulse())
    ctx.strokeStyle = C.hi
    ctx.lineWidth = 2
    rr(x - 1, y - 1, cell + 2, cell + 2, 4)
    ctx.stroke()
  }

  // side card: team = mean of five starters, then series odds for the highlighted pairing
  const K = NARROW
    ? { x: W * 0.02, y: my + n * cell + 12, w: W * 0.96, h: H * 0.98 - (my + n * cell + 12) }
    : { x: mx + n * cell + W * 0.03, y: H * 0.2, w: W * 0.99 - (mx + n * cell + W * 0.03), h: H * 0.66 }
  const ca = easeOut(seg(p, 0.24, 0.29)) * (1 - seg(p, 0.46, 0.5))
  if (ca > 0 && K.h > 60) {
    panel(K.x, K.y, K.w, K.h, ca)
    const mean0 = M.players[0].reduce((s, q) => s + q.mu, 0) / 5
    const rows = M.players[0].map((q, i) => [roleLabel(i), String(Math.round(q.mu - mean0 + 1537))])
    const rh = Math.min(18, (K.h - 30) / 8)
    txt('T1 · LATEST FIVE STARTERS', K.x + 12, K.y + 16, { size: NARROW ? 8 : 8.5, color: C.hi, mono: true, weight: 700, alpha: ca })
    rows.forEach(([role, val], k) => {
      const y = K.y + 32 + k * rh
      txt(role, K.x + 12, y, { size: fs, color: C.muted, mono: true, alpha: ca })
      txt(val, K.x + K.w - 12, y, { size: fs, color: C.ink, mono: true, weight: 600, align: 'right', alpha: ca })
    })
    txt('average + LCK offset', K.x + 12, K.y + 32 + 5 * rh, { size: fs, color: C.muted, mono: true, alpha: ca })
    txt('+215', K.x + K.w - 12, K.y + 32 + 5 * rh, { size: fs, color: C.green, mono: true, weight: 700, align: 'right', alpha: ca })
    line(K.x + 12, K.y + 24 + 6 * rh, K.x + K.w - 12, K.y + 24 + 6 * rh, C.faint, 1, ca)
    txt('team rating', K.x + 12, K.y + 32 + 6 * rh, { size: fs, color: C.t1, mono: true, weight: 700, alpha: ca })
    txt(String(T[0].r), K.x + K.w - 12, K.y + 32 + 6 * rh, { size: fs + 1, color: C.t1, mono: true, weight: 700, align: 'right', alpha: ca })
  }
  const sa = easeOut(seg(p, 0.77, 0.82))
  if (sa > 0 && K.h > 60) {
    panel(K.x, K.y, K.w, K.h, sa)
    txt(NARROW ? 'T1 vs GEN · SERIES ODDS' : 'T1 vs GEN · SERIES ODDS (NEUTRAL)', K.x + 12, K.y + 16, { size: NARROW ? 8 : 8.5, color: C.hi, mono: true, weight: 700, alpha: sa })
    const rh = Math.min(28, (K.h - 50) / 3)
    const bx = K.x + 52
    const bw = K.w - 52 - 52
    LEAGUE.series.forEach((s, k) => {
      const y = K.y + 38 + k * rh
      const f = easeOut(seg(p, 0.8 + k * 0.03, 0.86 + k * 0.03))
      txt(`Bo${s.n}`, K.x + 12, y, { size: fs, color: C.muted, mono: true, weight: 700, alpha: sa })
      A(sa)
      ctx.fillStyle = rgba(C.gen, 0.35)
      ctx.fillRect(bx, y - 4, bw, 8)
      A(sa)
      ctx.fillStyle = C.t1
      ctx.fillRect(bx, y - 4, bw * s.v * f, 8)
      line(bx + bw / 2, y - 7, bx + bw / 2, y + 7, C.ink, 1, sa * 0.5)
      txt(`${(s.v * 100).toFixed(1)}%`, K.x + K.w - 12, y, { size: fs, color: C.t1, mono: true, weight: 700, align: 'right', alpha: sa * f })
    })
    if (K.h > 50 + 3 * 28) txt('longer series favour the stronger team', K.x + 12, K.y + K.h - 14, { size: NARROW ? 8 : 9, color: C.dim, mono: true, alpha: sa })
  }
}

const DRAW = [sceneMatch, sceneData, scene1, scene2, scene3, sceneTime, scene4, scene5, scene7]

// ---------- stepping ----------
const beatStart = (s, b) => SCENES[s].beats[b].at * DUR[s]
const beatEnd = (s, b) => (b + 1 < SCENES[s].beats.length ? SCENES[s].beats[b + 1].at : 1) * DUR[s]

function play (s, b, fromScene = null) {
  const continueMetrics = s === 1 && scene.value === 1 && b !== beat.value
  const continueSkills = s === 3 && scene.value === 3 &&
    (beat.value === 1 || beat.value === 2) && (b === 1 || b === 2) && b !== beat.value
  prevScene = fromScene
  scene.value = s
  beat.value = b
  elapsed = beatStart(s, b)
  target = beatEnd(s, b)
  if (!continueMetrics && !continueSkills) {
    flowTime = 0
    resetMetricStream()
  }
  loopAge = 0
  repeated = false
  loopDuration = Math.max(4500, target - elapsed)
  if (reduceMotion) elapsed = target
  kick()
}

// if the reader has scrolled so part of the widget is hidden, bring it back into view
function ensureVisible () {
  const el = root.value
  if (!el) return
  const r = el.getBoundingClientRect()
  const vh = window.innerHeight
  if (r.top >= 0 && r.bottom <= vh) return
  const fits = r.height <= vh
  el.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: fits ? 'center' : 'start' })
}

function next () {
  ensureVisible()
  const s = scene.value
  if (beat.value + 1 < SCENES[s].beats.length) play(s, beat.value + 1)
  else play((s + 1) % SCENES.length, 0, s)
}

function back () {
  ensureVisible()
  const s = scene.value
  if (beat.value > 0) play(s, beat.value - 1)
  else if (s > 0) play(s - 1, SCENES[s - 1].beats.length - 1)
  else play(0, 0)
}

function goTo (i) {
  play(i, 0, i === scene.value ? null : scene.value)
}

function seekBeat (b) {
  play(scene.value, b)
}

// ---------- loop ----------
function buildBg () {
  bgCache = document.createElement('canvas')
  bgCache.width = Math.round(W * DPR)
  bgCache.height = Math.round(H * DPR)
  const b = bgCache.getContext('2d')
  b.scale(DPR, DPR)
  // dot grid that fades out towards the edges, so the stage has no visible boundary
  const cx = W / 2
  const cy = H / 2
  const rx = W * 0.55
  const ry = H * 0.6
  for (let x = 12; x < W; x += 24) {
    for (let y = 12; y < H; y += 24) {
      const d = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2
      const a = 0.22 * clamp(1 - d)
      if (a <= 0.01) continue
      b.fillStyle = `rgba(104,88,232,${a.toFixed(3)})`
      b.fillRect(x, y, 1.4, 1.4)
    }
  }
}

function render () {
  if (!ctx || !W) return
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0)
  ctx.globalAlpha = 1
  ctx.clearRect(0, 0, W, H)
  if (bgCache) ctx.drawImage(bgCache, 0, 0, W, H)
  const i = scene.value
  const p = clamp(elapsed / DUR[i])
  const f = prevScene === null || reduceMotion ? 1 : clamp(elapsed / FADE_MS)
  if (prevScene !== null && f < 1) {
    GA = 1 - f
    DRAW[prevScene](1, match)
  }
  GA = 1
  header(match)
  // Blend the completed step into its replay instead of snapping back or freezing.
  const replayFade = repeated && !reduceMotion && !continuousScene(i) ? clamp(loopAge / 450) : 1
  if (replayFade < 1) {
    GA = f * (1 - replayFade)
    DRAW[i](clamp(target / DUR[i]), match)
  }
  GA = f * replayFade
  DRAW[i](p, match)
  GA = 1
  progress.value = (beat.value + 1) / SCENES[i].beats.length
}

function frame (now) {
  raf = 0
  clock = now
  const dt = last ? Math.min(64, now - last) : 16
  last = now
  if (visible && !reduceMotion) {
    flowTime += dt
    if (scene.value === 1) updateMetricStream(dt)
    loopAge += dt
    if (scene.value === 5) {
      // Ratings over time plays once, then holds until the reader advances.
      elapsed = lerp(beatStart(scene.value, beat.value), target, clamp(loopAge / loopDuration))
    } else if (continuousScene(scene.value)) {
      // Reveal each diagram once, then keep its data flowing without rewinding it.
      const end = target - DUR[scene.value] * 0.001
      elapsed = lerp(beatStart(scene.value, beat.value), end, clamp(loopAge / loopDuration))
    } else {
      if (loopAge >= loopDuration) {
        loopAge %= loopDuration
        repeated = true
        prevScene = null
      }
      elapsed = lerp(beatStart(scene.value, beat.value), target, loopAge / loopDuration)
    }
  }
  render()
  if (visible && !reduceMotion && !(scene.value === 5 && elapsed >= target)) raf = requestAnimationFrame(frame)
  else last = 0
}

function kick () {
  if (!raf) raf = requestAnimationFrame(frame)
}

function resize () {
  const el = wrap.value
  const cv = canvas.value
  if (!el || !cv) return
  W = el.clientWidth
  NARROW = W < 620
  // fit the whole widget (chapters + canvas + subtitles + controls) in one viewport
  const vh = window.innerHeight || 800
  const chrome = NARROW ? 360 : 300
  const ideal = Math.min(NARROW ? 350 : 380, W * (NARROW ? 0.85 : 0.36))
  H = Math.round(Math.min(ideal, Math.max(NARROW ? 260 : 250, vh - chrome)))
  DPR = Math.min(2, window.devicePixelRatio || 1)
  cv.width = Math.round(W * DPR)
  cv.height = Math.round(H * DPR)
  cv.style.height = `${H}px`
  buildBg()
  kick()
}

onMounted(() => {
  ctx = canvas.value.getContext('2d')
  FONT = getComputedStyle(canvas.value).fontFamily || FONT
  play(0, 0)
  resize()
  ro = new ResizeObserver(resize)
  ro.observe(wrap.value)
  window.addEventListener('resize', resize)
  io = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting
    if (visible) kick()
  }, { threshold: 0.2 })
  io.observe(wrap.value)
})

onBeforeUnmount(() => {
  if (raf) cancelAnimationFrame(raf)
  ro?.disconnect()
  io?.disconnect()
  window.removeEventListener('resize', resize)
})
</script>

<style scoped>
.lol-anim {
  margin: 0 auto;
  max-width: 1080px;
  outline: none;
}

.lol-anim:focus-visible {
  outline: 2px solid color-mix(in srgb, var(--accent) 40%, transparent);
  outline-offset: 10px;
  border-radius: 12px;
}

/* chapter timeline */
.chapters {
  display: grid;
  grid-template-columns: repeat(9, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 10px;
}

.chapter {
  display: grid;
  grid-template-columns: auto 1fr;
  align-items: baseline;
  column-gap: 8px;
  row-gap: 8px;
  padding: 0 0 4px;
  border: 0;
  background: none;
  font: inherit;
  text-align: left;
  color: var(--muted);
  cursor: pointer;
  transition: color 0.2s;
}

.chapter:hover {
  color: var(--ink);
}

.chapter .track {
  grid-column: 1 / -1;
  display: block;
  height: 3px;
  border-radius: 3px;
  background: var(--line);
  overflow: hidden;
}

.chapter .fill {
  display: block;
  height: 100%;
  background: var(--accent);
  transform-origin: left center;
  transition: transform 0.15s linear;
}

.chapter .num {
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--accent);
  opacity: 0.6;
}

.chapter .label {
  font-size: 0.86rem;
  font-weight: 600;
}

.chapter.active {
  color: var(--ink);
}

.chapter.active .num,
.chapter.done .num {
  opacity: 1;
}

/* canvas sits straight on the page */
.stage {
  position: relative;
}

canvas {
  display: block;
  width: 100%;
}

/* reader controls */
.reader {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 16px;
  margin-top: 4px;
  padding-top: 12px;
  border-top: 1px solid var(--line);
}

.say-wrap {
  min-height: 5.5em;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 6px;
}

.say-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 14px;
  font-size: 0.72rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--accent);
  font-weight: 700;
}

.say-meta .count {
  color: var(--muted);
  font-weight: 500;
}

.say {
  margin: 0;
  color: var(--ink);
  font-size: 0.95rem;
  line-height: 1.5;
  max-width: 78ch;
}

.nav-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  height: 40px;
  border-radius: 999px;
  font: inherit;
  cursor: pointer;
  transition: background 0.2s, color 0.2s, border-color 0.2s, transform 0.15s, opacity 0.2s;
}

.nav-btn svg {
  width: 18px;
  height: 18px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2.2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.nav-btn:active {
  transform: scale(0.96);
}

.nav-btn.back {
  width: 40px;
  border: 1px solid var(--line);
  background: var(--bg-elev);
  color: var(--ink);
}

.nav-btn.back:hover:not(:disabled) {
  border-color: var(--accent-2);
  color: var(--accent);
}

.nav-btn.back:disabled {
  opacity: 0.35;
  cursor: default;
}

.nav-btn.next {
  padding: 0 18px 0 22px;
  border: 1px solid var(--accent);
  background: var(--accent);
  color: #fff;
  font-weight: 650;
  font-size: 0.92rem;
  white-space: nowrap;
  box-shadow: 0 10px 24px color-mix(in srgb, var(--accent) 28%, transparent);
}

.nav-btn.next:hover {
  background: var(--accent-2);
}

.foot {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px 16px;
  margin-top: 8px;
  padding-left: 66px;
}

.beats {
  display: flex;
  gap: 6px;
}

.beat-dot {
  width: 22px;
  height: 4px;
  padding: 0;
  border-radius: 4px;
  border: 0;
  background: var(--line);
  cursor: pointer;
  transition: background 0.2s, width 0.2s;
}

.beat-dot.done {
  background: color-mix(in srgb, var(--accent) 45%, var(--line));
}

.beat-dot.active {
  width: 34px;
  background: var(--accent);
}

.beat-dot:hover {
  background: var(--accent-2);
}

.cap-code {
  font-size: 0.7rem;
  overflow-wrap: anywhere;
  padding: 4px 10px;
  border-radius: 8px;
  background: color-mix(in srgb, var(--accent) 7%, transparent);
  color: var(--accent);
}

.mono {
  font-family: 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
}

.say-enter-active,
.say-leave-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}

.say-enter-from {
  opacity: 0;
  transform: translateY(5px);
}

.say-leave-to {
  opacity: 0;
  transform: translateY(-5px);
}

@media (max-width: 720px) {
  .chapters {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    row-gap: 12px;
  }

  .reader {
    grid-template-columns: auto 1fr;
    gap: 14px;
  }

  .say-wrap {
    grid-column: 1 / -1;
    grid-row: 1;
    min-height: 7em;
  }

  .nav-btn.next {
    justify-self: end;
  }

  .say {
    font-size: 0.98rem;
  }

  .foot {
    padding-left: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .say-enter-active,
  .say-leave-active,
  .chapter .fill {
    transition: none;
  }

}
</style>
