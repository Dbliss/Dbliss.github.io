// Animated walk-through of the LoLPredictor pipeline (github.com/Dbliss/LoLPredictor), told through
// one anonymous example match, Team 1 vs Team 2, following T1's mid laner first.
//
// Every scene is a pure function of `p`, measured in beats: p = 2.5 is halfway through the third step of
// text. LolModelStory.vue advances p on a clock once a chapter scrolls into view, and because scenes only
// read p, the text and the drawing cannot drift apart and any step can be replayed.
//
// Looping motion (data streams, ripples, sweeps) sits on top of that and is driven by
// the clock T, so it carries on after a chapter finishes. It only ever decorates the state that p has set
// up, and it is switched off entirely for prefers-reduced-motion (LIVE = false).
//
// Numbers are illustrative; shapes follow the code.

// ---------- palette (matches the site's light theme) ----------
const C = {
  ink: '#111632',
  muted: '#626980',
  dim: '#8a90ad',
  faint: '#c9cde0',
  t1: '#e4002b',
  t2: '#c08a12',
  accent: '#1aa3c2',
  hi: '#6858e8',
  green: '#0e9f6e',
  pink: '#d63d8f',
  surface: '#ffffff',
  track: 'rgba(17,22,50,0.07)'
}
const MONO = "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace"

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

// Convert beat units into a position along a timeline authored in 0..1.
function remap (p, stops) {
  const n = stops.length - 1
  const q = clamp(p, 0, n)
  const b = Math.min(n - 1, Math.floor(q))
  return lerp(stops[b], stops[b + 1], q - b)
}

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

// ---------- example match: Team 1 vs Team 2 ----------
const ROLES = ['TOP', 'JNG', 'MID', 'BOT', 'SUP']
const ROLE_NAMES = ['Top', 'Jungle', 'Mid', 'Bottom', 'Support']
const SPOT = { ti: 0, i: 2 } // T1 mid is the worked example
const STATS = [
  { short: 'gold lead', tiny: 'GOLD', fmt: (v) => signed(Math.round((v - 0.5) * 1600)) },
  { short: 'xp lead', tiny: 'XP', fmt: (v) => signed(Math.round((v - 0.5) * 1000)) },
  { short: 'cs lead', tiny: 'CS', fmt: (v) => signed(Math.round((v - 0.5) * 40)) },
  { short: 'vision/min', tiny: 'VIS', fmt: (v) => (0.7 + v * 2.6).toFixed(2) }
]
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
// performance_score, as in performance_gbm/*_lightgbm.py: each stage's prediction becomes a percentile
// against everyone else in that position, weighted 35/25/40 into a 0-100 score, then centred on the
// average of the two players in that position in the same game.
const STAGE_W = [0.35, 0.25, 0.4]
const SPOT_PCT = [84, 71, 78]
const SPOT_COMP = STAGE_W.reduce((s, w, k) => s + w * SPOT_PCT[k], 0)
const OPP_COMP = 41.6
const GAME_AVG = (SPOT_COMP + OPP_COMP) / 2
const PERF_SCALE = 30
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
      p.mu1 = p.mu + (ti ? -1 : 1) * innov * (p.sig * p.sig) / 75
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
    val: (w / wsum) * logit + noise[k] - nmean
  }))
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
    tag: ['T1', 'T2'],
    name: ['Team 1', 'Team 2'],
    color: [C.t1, C.t2],
    players, hist, ema, posSkills, sp, D, phat, feats, forest, questions, logit, pRaw, pCal, pm: 0.53, ph, bins
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

// ---------- drawing state + primitives ----------
let ctx = null
let W = 0
let H = 0
let NARROW = false
let U = 1 // scale factor from the design size to this stage
let GA = 1 // group alpha, so whole compositions can crossfade
let FONT = 'Inter, system-ui, sans-serif'
let T = 0 // ms clock for looping motion
let LIVE = false

const fz = (n) => Math.max(8.5, n * U)
const roleLabel = (i) => (NARROW ? ROLES[i] : ROLE_NAMES[i])

// Looping helpers: cycle runs 0..1 every `period` ms; the others draw nothing when LIVE is off.
const cycle = (period, offset = 0) => (T / period + offset) % 1
const pulse = (period = 1800, offset = 0) => (LIVE ? 0.5 + 0.5 * Math.sin(TAU * cycle(period, offset)) : 1)
const bob = (seed, amount = 2) => (LIVE ? Math.sin(T / 520 + seed) * amount : 0)
function breathe (values, seed) {
  return LIVE ? values.map((v, a) => v + 0.02 * Math.sin(T / 800 + a * 1.7 + seed)) : values
}
function runner (pts, offset = 0, color = C.hi, alpha = 1, period = 2600) {
  if (!LIVE || alpha <= 0 || pts.length < 2) return
  const L = polyLen(pts)
  const t = cycle(period, offset)
  const fade = Math.sin(Math.PI * t) * alpha
  for (let k = 4; k >= 0; k--) {
    const tail = t - k * 0.018
    if (tail < 0) continue
    const q = along(pts, L, tail)
    dot(q.x, q.y, k ? 1.5 : 2.8, color, fade * (1 - k / 6))
  }
}
function ripple (x, y, r0, r1, color, a = 1, period = 2000, offset = 0) {
  if (!LIVE || a <= 0) return
  const t = cycle(period, offset)
  A(a * (1 - t) * 0.55)
  ctx.beginPath()
  ctx.arc(x, y, lerp(r0, r1, t), 0, TAU)
  ctx.strokeStyle = color
  ctx.lineWidth = 1.4
  ctx.stroke()
}

function A (a = 1) { ctx.globalAlpha = clamp(GA * a) }
function group (a, fn) {
  if (a <= 0) return
  const parent = GA
  GA = parent * a
  fn()
  GA = parent
}
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
function measure (s, size, weight = 500, mono = false) {
  ctx.font = `${weight} ${size}px ${mono ? MONO : FONT}`
  return ctx.measureText(s).width
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
function drawTree (lv, a = 1, r = 2.2) {
  for (let l = 0; l < lv.length - 1; l++) {
    lv[l].forEach((n, i) => {
      line(n.x, n.y, lv[l + 1][2 * i].x, lv[l + 1][2 * i].y, C.faint, 1, a)
      line(n.x, n.y, lv[l + 1][2 * i + 1].x, lv[l + 1][2 * i + 1].y, C.faint, 1, a)
    })
  }
  lv.forEach((nodes) => nodes.forEach((n) => dot(n.x, n.y, r, C.faint, a)))
}
// Draw a path up to t (0..1) and return its leading point.
function tracePath (pts, t, color, width = 2.2, a = 1) {
  const L = polyLen(pts)
  const total = L[L.length - 1] || 1
  for (let s = 1; s < pts.length; s++) {
    if (t * total < L[s - 1]) break
    const end = t * total < L[s] ? along(pts, L, t) : pts[s]
    line(pts[s - 1].x, pts[s - 1].y, end.x, end.y, color, width, a)
  }
  return along(pts, L, t)
}
function panel (x, y, w, h, a = 1, border = C.hi) {
  A(a)
  softShadow(true)
  rr(x, y, w, h, 12)
  ctx.fillStyle = C.surface
  ctx.fill()
  softShadow(false)
  ctx.strokeStyle = rgba(border, 0.4)
  ctx.lineWidth = 1
  ctx.stroke()
}
function person (x, y, color, a = 1, r = 5) {
  dot(x, y - r * 1.6, r, color, a)
  A(a)
  rr(x - r * 1.5, y - r * 0.2, r * 3, r * 2.8, r * 1.1)
  ctx.fillStyle = color
  ctx.fill()
}

// ---------- shared player cards ----------
function cardRects () {
  const cw = W * 0.29
  const top = H * 0.07
  const bot = H * 0.97
  const rh = (bot - top) / 5
  const ch = rh * 0.82
  return [0, 1].map((ti) => ROLES.map((_, i) => ({
    x: ti ? W * 0.985 - cw : W * 0.015,
    y: top + i * rh + (rh - ch) / 2,
    w: cw,
    h: ch
  })))
}
function drawCard (c, ti, pl, a = 1) {
  const color = match.color[ti]
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
  const fs = fz(11)
  const role = roleLabel(ROLES.indexOf(pl.role))
  txt(role, c.x + 11, c.y + c.h * 0.26, { size: fs + 1, color, weight: 700, alpha: a })
  const rw = measure(role, fs + 1, 700)
  txt(match.tag[ti], c.x + 17 + rw, c.y + c.h * 0.26, { size: fs, color: C.muted, weight: 600, alpha: a })
}
function statBar (c, j) {
  return { x: c.x + 11, w: c.w - 22, y: c.y + c.h * 0.5 + j * c.h * 0.115, h: Math.max(2, c.h * 0.055) }
}
function spotRing (c, a = 1) {
  if (a <= 0) return
  A(a * (0.55 + 0.45 * pulse(1600)))
  rr(c.x - 3, c.y - 3, c.w + 6, c.h + 6, 12)
  ctx.strokeStyle = C.hi
  ctx.lineWidth = 1.6
  ctx.stroke()
}

// ---------- 01 · the match ----------
// The real map. Each team walks out of its base to its lane, then a thin line joins each pair of opposites.
// The image lives in public/ so a missing file degrades to a plain square instead of breaking the build.
const RIFT = new Image()
RIFT.src = `${import.meta.env.BASE_URL}lol/summoners-rift.png`
export const sceneAssetsReady = RIFT.decode().catch(() => {})

// Fractions of the map image, from its top-left corner. T1 starts bottom-left and T2 top-right.
// Every pair sits on the same up-right diagonal so the links run parallel and never cross.
const RIFT_BASES = [{ x: 0.12, y: 0.88 }, { x: 0.88, y: 0.12 }]
const RIFT_SPOTS = [
  [{ x: 0.08, y: 0.24 }, { x: 0.27, y: 0.43 }, { x: 0.44, y: 0.56 }, { x: 0.76, y: 0.92 }, { x: 0.7, y: 0.84 }],
  [{ x: 0.24, y: 0.08 }, { x: 0.43, y: 0.27 }, { x: 0.56, y: 0.44 }, { x: 0.92, y: 0.76 }, { x: 0.84, y: 0.7 }]
]
const TEAM_TEXT = ['#ffffff', C.ink]

function sceneMatch (p) {
  const S = Math.min(W, H) * 0.98
  const mx = (W - S) / 2
  const my = (H - S) / 2
  const at = (q) => ({ x: mx + q.x * S, y: my + q.y * S })
  const tokenR = Math.max(11, 16 * U)

  group(easeOut(seg(p, 0, 0.1)), () => {
    ctx.save()
    rr(mx, my, S, S, 14)
    ctx.clip()
    A()
    ctx.fillStyle = C.ink
    ctx.fillRect(mx, my, S, S)
    if (RIFT.complete && RIFT.naturalWidth) ctx.drawImage(RIFT, mx, my, S, S)
    // Dim the map slightly once the links need to stand out.
    A(0.38 * ease(seg(p, 1, 1.12)))
    ctx.fillStyle = C.ink
    ctx.fillRect(mx, my, S, S)
    ctx.restore()
  })

  ROLES.forEach((_, i) => {
    const t = ease(seg(p, 1.05 + i * 0.09, 1.21 + i * 0.09))
    if (t <= 0) return
    const a = at(RIFT_SPOTS[0][i])
    const b = at(RIFT_SPOTS[1][i])
    const midX = (a.x + b.x) / 2
    const midY = (a.y + b.y) / 2
    const width = Math.max(1.5, 2 * U)
    line(a.x, a.y, lerp(a.x, midX, t), lerp(a.y, midY, t), '#ffffff', width)
    line(b.x, b.y, lerp(b.x, midX, t), lerp(b.y, midY, t), '#ffffff', width)
  })

  RIFT_SPOTS.forEach((team, ti) => team.forEach((spot, i) => {
    const start = 0.1 + i * 0.035
    const alpha = easeOut(seg(p, start, start + 0.06))
    if (alpha <= 0) return
    const from = at(RIFT_BASES[ti])
    const to = at(spot)
    const move = ease(seg(p, start, start + 0.22))
    const x = lerp(from.x, to.x, move)
    const y = lerp(from.y, to.y, move)
    dot(x, y, tokenR, match.color[ti], alpha)
    A(alpha)
    ctx.beginPath()
    ctx.arc(x, y, tokenR, 0, TAU)
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 1.5
    ctx.stroke()
    txt(ROLES[i], x, y, { size: Math.max(8, 9.5 * U), color: TEAM_TEXT[ti], weight: 700, align: 'center', alpha })
  }))

  // Team labels sit over the bases, so the players emerge from underneath them.
  const labelAlpha = easeOut(seg(p, 0.06, 0.14))
  RIFT_BASES.forEach((base, ti) => {
    const c = at(base)
    const size = fz(12)
    const w = measure(match.tag[ti], size, 700) + 16
    const h = size + 10
    A(labelAlpha)
    rr(c.x - w / 2, c.y - h / 2, w, h, h / 2)
    ctx.fillStyle = match.color[ti]
    ctx.fill()
    txt(match.tag[ti], c.x, c.y, { size, color: TEAM_TEXT[ti], weight: 700, align: 'center', alpha: labelAlpha })
  })
}

// ---------- 02 · match data ----------
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
const SPOT_EVENTS = INGEST.filter((ev) => ev.spot)

function ingest (p) {
  const M = match
  const cards = cardRects()
  const logW = W * 0.36
  const lx = W / 2 - logW / 2
  const ly0 = H * 0.09
  const ly1 = H * 0.97
  A()
  softShadow(true)
  rr(lx, ly0, logW, ly1 - ly0, 12)
  ctx.fillStyle = C.surface
  ctx.fill()
  softShadow(false)
  ctx.strokeStyle = '#e2e4ee'
  ctx.stroke()
  txt(NARROW ? 'MATCH DATA' : 'MATCH DATA · LEAD @ 15 MIN', W / 2, ly0 - fz(11), { size: fz(10), color: C.dim, mono: true, weight: 600, align: 'center' })

  const lh = Math.max(14, 21 * U)
  const fs = fz(10.5)
  const spotFocus = 1 - seg(p, 0.46, 0.52)

  // The log is a conveyor that runs on the clock.
  const conveyor = (list, period, alpha) => {
    if (alpha <= 0) return
    const flow = LIVE ? T / period : p * 60
    const newest = Math.floor(flow)
    const visible = Math.ceil((ly1 - ly0) / lh) + 2
    for (let o = newest; o > newest - visible; o--) {
      const ev = list[((o % list.length) + list.length) % list.length]
      const age = flow - o
      const y = ly1 - lh * 0.6 - age * lh
      if (y < ly0 - lh) continue
      const pl = M.players[ev.ti][ev.i]
      const col = M.color[ev.ti]
      const fade = alpha * clamp((y - ly0) / 50) * clamp(age / 0.6)
      A(alpha * 0.1 * clamp(1 - age / 2))
      ctx.fillStyle = ev.spot ? C.hi : col
      ctx.fillRect(lx, y - lh / 2, logW, lh)
      txt(`${M.tag[ev.ti]} ${ROLES[ev.i].toLowerCase()}`, lx + 8, y, { size: fs, color: col, mono: true, weight: 600, alpha: fade })
      if (!NARROW) txt(STATS[ev.j].short, lx + logW * 0.56, y, { size: fs, color: C.dim, mono: true, alpha: fade, align: 'center' })
      txt(STATS[ev.j].fmt(pl.stats[ev.j]), lx + logW - 8, y, { size: fs, color: ev.spot ? C.hi : C.ink, mono: true, weight: ev.spot ? 700 : 500, alpha: fade, align: 'right' })
    }
  }
  ctx.save()
  rr(lx, ly0, logW, ly1 - ly0, 12)
  ctx.clip()
  conveyor(SPOT_EVENTS, 1100, seg(p, 0.03, 0.08) * (1 - seg(p, 0.46, 0.5)))
  conveyor(INGEST, 240, seg(p, 0.48, 0.54))
  ctx.restore()

  for (let ti = 0; ti < 2; ti++) {
    M.players[ti].forEach((pl, i) => {
      const c = cards[ti][i]
      const isSpot = ti === SPOT.ti && i === SPOT.i
      const a = isSpot ? 1 : 1 - 0.55 * spotFocus * seg(p, 0.02, 0.06)
      drawCard(c, ti, pl, a)
      for (let j = 0; j < 4; j++) {
        const ev = INGEST.find((e) => e.ti === ti && e.i === i && e.j === j)
        const arrive = ev.t + ev.dur
        const f = easeOut(seg(p, arrive, arrive + (isSpot ? 0.04 : 0.03)))
        const b = statBar(c, j)
        A(a)
        ctx.fillStyle = C.track
        ctx.fillRect(b.x, b.y, b.w, b.h)
        A(a)
        ctx.fillStyle = j === 3 ? C.accent : M.color[ti]
        ctx.fillRect(b.x, b.y, b.w * pl.stats[j] * f, b.h)
      }
      if (isSpot) spotRing(c, seg(p, 0.03, 0.07) * (0.35 + 0.65 * spotFocus))
    })
  }

  INGEST.forEach((ev) => {
    const lt = (p - ev.t) / ev.dur
    if (lt <= 0 || lt >= 1.25) return
    const c = cards[ev.ti][ev.i]
    const b = statBar(c, ev.j)
    const from = { x: ev.ti ? lx + logW - 4 : lx + 4, y: ly1 - lh }
    const to = { x: b.x + b.w * M.players[ev.ti][ev.i].stats[ev.j], y: b.y }
    flight(from, to, lt, M.color[ev.ti], ev.spot ? 3 : 2.2, ev.spot ? 44 : 26)
  })
}

function sceneData (p) {
  const old = p < 1 ? lerp(0, 0.48, p) : lerp(0.48, 0.93, p - 1)
  group(easeOut(seg(p, 0, 0.25)), () => ingest(old))
}

// ---------- 03 · performance scores ----------
const STAGE_NAMES = ['Early', 'Middle', 'Late']
const STAGE_MIN = ['10–15 min', '15–20 min', '20–25 min']

function scenePerf (p) {
  const M = match
  const toTrees = ease(seg(p, 0.82, 1.2))
  const toBars = ease(seg(p, 3, 3.25))
  const focus = ease(seg(p, 0.28, 0.55))

  group(1 - toBars, () => {
    // Beat 0: compare players only with their own position, and one game stage at a time.
    group(1 - ease(seg(p, 0.7, 1)), () => {
      const gather = ease(seg(p, 0.02, 0.32))
      txt('Compare the same role', W / 2, H * 0.08, { size: fz(17), weight: 750, align: 'center' })
      const cardW = W * 0.165
      const cardH = H * 0.24
      const rowY = H * 0.3
      ROLES.forEach((role, i) => {
        const cx = W * (0.12 + i * 0.19)
        const a = i === SPOT.i ? 1 : 1 - focus * 0.55
        panel(cx - cardW / 2, rowY - cardH / 2, cardW, cardH, gather * a, i === SPOT.i ? C.hi : C.faint)
        txt(NARROW ? role : ROLE_NAMES[i], cx, rowY - cardH * 0.28, { size: fz(11.5), weight: 700, color: i === SPOT.i ? C.hi : C.muted, align: 'center', alpha: gather * a })
        for (let ti = 0; ti < 2; ti++) {
          const px = lerp(cx, cx + (ti ? 1 : -1) * cardW * 0.22, gather)
          const py = lerp(H * (ti ? 0.44 : 0.16), rowY + cardH * 0.14, gather)
          person(px, py + bob(i * 1.1 + ti * 2, 2), M.color[ti], a * easeOut(seg(p, 0, 0.12)), Math.max(3, 4.5 * U))
        }
      })
      txt('Compare the same stage', W / 2, H * 0.56, { size: fz(15), weight: 750, align: 'center', alpha: easeOut(seg(p, 0.35, 0.55)) })
    })

    // The stage boxes grow into one model per stage.
    const panels = STAGE_NAMES.map((_, j) => ({
      x: W * (0.04 + j * 0.31),
      w: W * 0.3,
      y: lerp(H * 0.63, H * 0.1, toTrees),
      h: lerp(H * 0.2, H * 0.42, toTrees)
    }))
    const walks = [seg(p, 1.18, 1.5), seg(p, 1.5, 1.74), seg(p, 1.74, 1.98)]
    txt('T1 Mid · one model per stage', W / 2, H * 0.05, { size: fz(13), weight: 700, color: C.hi, align: 'center', alpha: easeOut(seg(p, 1, 1.25)) })
    panels.forEach((r, j) => {
      const appear = easeOut(seg(p, 0.4 + j * 0.06, 0.62 + j * 0.06))
      const cx = r.x + r.w / 2
      panel(r.x, r.y, r.w, r.h, appear, walks[j] > 0 ? C.hi : C.faint)
      txt(STAGE_NAMES[j], cx, r.y + fz(16), { size: fz(13), weight: 700, align: 'center', alpha: appear })
      if (!NARROW) txt(STAGE_MIN[j], cx, r.y + fz(32), { size: fz(9.5), color: C.dim, mono: true, align: 'center', alpha: appear })
      // Both players keep moving through the same time window.
      const windowA = appear * (1 - toTrees)
      if (LIVE && windowA > 0) {
        for (let ti = 0; ti < 2; ti++) {
          const t = cycle(3400, j / 3)
          const py = r.y + r.h * (ti ? 0.84 : 0.68)
          line(r.x + 10, py, r.x + r.w - 10, py, M.color[ti], 1, windowA * 0.15)
          dot(r.x + 10 + (r.w - 20) * t, py, 2.5, M.color[ti], windowA * Math.sin(Math.PI * t))
        }
      }
      const ta = easeOut(seg(p, 1.02 + j * 0.07, 1.3 + j * 0.07))
      if (ta > 0) {
        const lv = treeLayout(cx, r.y + r.h * 0.36, r.w * 0.76, r.h * 0.42)
        drawTree(lv, ta, 2)
        if (walks[j] > 0) {
          const path = treePath(lv, spot.leaves[j])
          const head = tracePath(path, easeOut(walks[j]), C.hi, 2, walks[j] < 1 ? 1 : 0.6 + 0.4 * pulse(1800, j / 3))
          if (walks[j] < 1) glow(head.x, head.y, 3, C.hi)
        }
        const label = easeOut(seg(walks[j], 0.85, 1))
        txt(`${ordinal(SPOT_PCT[j])} pct`, cx, r.y + r.h * 0.9, { size: fz(11.5), color: C.hi, mono: true, weight: 700, align: 'center', alpha: label })
      }
    })

    // Beat 2: three percentiles become one score, then a difference from expected.
    const formula = easeOut(seg(p, 2, 2.3))
    const gauge = easeOut(seg(p, 2.25, 2.6))
    const delta = ease(seg(p, 2.55, 2.9))
    txt(`84 × 0.35 + 71 × 0.25 + 78 × 0.40 = ${Math.round(SPOT_COMP)}`, W / 2, H * 0.6, { size: fz(13), color: C.ink, mono: true, weight: 700, align: 'center', alpha: formula })
    if (gauge > 0) {
      const x0 = W * 0.1
      const x1 = W * 0.9
      const y = H * 0.76
      const X = (v) => lerp(x0, x1, v / 100)
      A(gauge)
      ctx.fillStyle = C.track
      ctx.fillRect(x0, y - 3, x1 - x0, 6)
      const marks = [
        [OPP_COMP, M.color[1], `T2 ${Math.round(OPP_COMP)}`, -1],
        [SPOT_COMP, M.color[0], `T1 ${Math.round(SPOT_COMP)}`, -1],
        [GAME_AVG, C.dim, `expected ${Math.round(GAME_AVG)}`, 1]
      ]
      marks.forEach(([v, col, label, side]) => {
        glow(X(v), y, 4, col, gauge)
        txt(label, X(v), y + side * fz(20), { size: fz(11), color: col, mono: true, weight: 700, align: 'center', alpha: gauge })
      })
      if (delta > 0) {
        const end = lerp(GAME_AVG, SPOT_COMP, delta)
        line(X(GAME_AVG), y, X(end), y, C.green, 4, 0.9)
        runner([{ x: X(GAME_AVG), y }, { x: X(end), y }], 0, '#ffffff', delta, 1500)
        ripple(X(SPOT_COMP), y, 5, 20, M.color[0], delta, 1900)
      }
      txt(`${signed(spot.perf * PERF_SCALE, 0)} above expected`, W / 2, H * 0.92, { size: fz(18), color: C.green, weight: 750, align: 'center', alpha: delta })
    }
  })

  // Beat 3: the same comparison for all ten players.
  group(easeOut(seg(p, 3.12, 3.35)), () => {
    txt('Score against the opposite player', W / 2, H * 0.07, { size: fz(16), weight: 750, align: 'center' })
    const rh = H * 0.165
    const cx = W * 0.6
    const half = W * 0.32
    line(cx, H * 0.14, cx, H * 0.14 + rh * 5, C.faint, 1)
    ROLES.forEach((_, i) => {
      const y = H * 0.14 + i * rh
      const f = easeOut(seg(p, 3.3 + i * 0.1, 3.62 + i * 0.1))
      if (i === SPOT.i) {
        A(0.06)
        ctx.fillStyle = C.hi
        rr(W * 0.02, y + 3, W * 0.96, rh - 6, 10)
        ctx.fill()
      }
      txt(roleLabel(i), W * 0.05, y + rh / 2, { size: fz(13), color: i === SPOT.i ? C.hi : C.ink, weight: 700 })
      ;[0, 1].forEach((ti) => {
        const v = M.players[ti][i].perf
        const by = y + rh * (ti ? 0.68 : 0.32)
        const len = (v / 0.9) * half * f
        A(0.9)
        ctx.fillStyle = v >= 0 ? C.green : C.pink
        ctx.fillRect(Math.min(cx, cx + len), by - 4, Math.abs(len), 8)
        runner([{ x: cx, y: by }, { x: cx + len, y: by }], i * 0.11 + ti * 0.5, '#ffffff', f, 2200)
        txt(M.tag[ti], cx + (v >= 0 ? -8 : 8), by, { size: fz(10), color: M.color[ti], mono: true, weight: 700, align: v >= 0 ? 'right' : 'left', alpha: f })
        txt(signed(v * PERF_SCALE, 0), cx + len + (v >= 0 ? 7 : -7), by, { size: fz(10.5), color: v >= 0 ? C.green : C.pink, mono: true, weight: 700, align: v >= 0 ? 'left' : 'right', alpha: f })
      })
    })
  })
}

// ---------- 04 · skill profiles ----------
// Games carry on indefinitely past the recorded history, so the shape can keep evolving while idle.
function skillGame (M, ti, game) {
  if (game < M.hist[ti].length) return M.hist[ti][game]
  const random = rng(7301 + ti * 100003 + game * 7919)
  const later = game - 15
  return M.ema[ti][15].map((baseline, axis) => {
    const seed = axis * 1.37 + ti * 2.1
    const drift = 0.14 * (Math.sin(later / 22 + seed) - Math.sin(seed)) +
      0.06 * (Math.sin(later / 47 + seed * 2) - Math.sin(seed * 2))
    return clamp(baseline + drift + (random() - 0.5) * 0.36, 0.12, 0.92)
  })
}

function skillAverage (M, ti, game) {
  if (game < M.ema[ti].length) return M.ema[ti][game]
  // Rebuild the span-5 average over a bounded window, however long the page stays open.
  const start = Math.max(16, game - 47)
  let values = M.ema[ti][15].slice()
  for (let k = start; k <= game; k++) {
    const sample = skillGame(M, ti, k)
    values = values.map((value, axis) => lerp(value, sample[axis], 2 / 6))
  }
  return values
}

function sceneSkills (p) {
  const M = match
  const AX = NARROW ? ['VIS', 'CON', 'VER', 'AGG', 'SUR'] : ['vision', 'consistency', 'versatility', 'aggression', 'survivability']
  const min = Math.min(W, H)
  const R0 = min * 0.31
  const cy0 = H * 0.53
  const q = ease(seg(p, 2, 2.42))
  const fadeBig = 1 - q
  const slots = [
    { x: W * 0.18, y: H * 0.29 },
    { x: W * 0.82, y: H * 0.29 },
    { x: W * 0.5, y: H * 0.29 },
    { x: W * 0.32, y: H * 0.71 },
    { x: W * 0.68, y: H * 0.71 }
  ]
  const r = min * 0.15
  const R = lerp(R0, r, q)
  const cx = lerp(W / 2, slots[2].x, q)
  const cy = lerp(cy0, slots[2].y, q)
  const ang = (a) => -Math.PI / 2 + a * TAU / 5
  const ptAt = (x, y, rad, v, a) => ({ x: x + Math.cos(ang(a)) * rad * v, y: y + Math.sin(ang(a)) * rad * v })
  const polyAt = (x, y, rad, vals, scale = 1) => {
    ctx.beginPath()
    vals.forEach((v, a) => {
      const pt = ptAt(x, y, rad, v * scale, a)
      if (a === 0) ctx.moveTo(pt.x, pt.y)
      else ctx.lineTo(pt.x, pt.y)
    })
    ctx.closePath()
  }
  const grid = (x, y, rad, a, rings = 4) => {
    for (let ring = 1; ring <= rings; ring++) {
      A(a)
      polyAt(x, y, rad, [1, 1, 1, 1, 1], ring / rings)
      ctx.strokeStyle = C.faint
      ctx.lineWidth = 1
      ctx.stroke()
    }
    for (let k = 0; k < 5; k++) {
      const e = ptAt(x, y, rad, 1, k)
      line(x, y, e.x, e.y, C.faint, 1, a)
    }
  }

  const appear = easeOut(seg(p, 0, 0.22))
  grid(cx, cy, R, appear, q > 0.5 ? 3 : 4)
  for (let a = 0; a < 5; a++) {
    const lq = ptAt(cx, cy, R, 1.2, a)
    txt(AX[a], lq.x, lq.y, { size: fz(11), color: C.muted, mono: true, align: 'center', alpha: appear * fadeBig })
  }

  // Thin outlines are single games; the bold shape is the span-5 running average through them.
  const games = 15 * seg(p, 0.3, 1.7) + (LIVE ? T / 700 : 0)
  const emaA = appear * (0.3 + 0.7 * ease(seg(p, 1, 1.35)))
  const trail = fadeBig * easeOut(seg(p, 0.3, 0.6))
  // Only T1 is shown until the final step, when T2 joins each radar in turn.
  const enemyAt = (i) => {
    const order = [2, 0, 1, 3, 4].indexOf(i)
    return easeOut(seg(p, 3.05 + order * 0.1, 3.4 + order * 0.1))
  }
  for (let ti = 0; ti < 2; ti++) {
    const own = ti ? enemyAt(2) : 1
    if (own <= 0) continue
    const col = M.color[ti]
    for (let k = Math.max(0, Math.floor(games) - 10); k <= Math.floor(games); k++) {
      const age = games - k
      A(trail * clamp(0.1 + 0.55 * Math.exp(-age / 2.5)) * easeOut(clamp(age / 0.45)) * clamp((10 - age) / 3))
      polyAt(cx, cy, R, skillGame(M, ti, k))
      ctx.strokeStyle = col
      ctx.lineWidth = 1
      ctx.stroke()
    }
    const k0 = Math.floor(games)
    const from = skillAverage(M, ti, k0)
    const to = skillAverage(M, ti, k0 + 1)
    const settled = breathe(M.ema[ti][15], 2 + ti * 2)
    // The live average eases onto the fixed mid profile as it shrinks into the five-way comparison.
    const cur = from.map((v, a) => lerp(lerp(v, to[a], ease(games - k0)), settled[a], q))
    const grow = ti ? own : easeOut(seg(p, 0.08, 0.32))
    A(emaA)
    polyAt(cx, cy, R, cur, grow)
    ctx.fillStyle = rgba(col, 0.14)
    ctx.fill()
    ctx.strokeStyle = col
    ctx.lineWidth = lerp(2.4, 1.6, q)
    ctx.stroke()
    cur.forEach((v, a) => {
      const pt = ptAt(cx, cy, R, v * grow, a)
      dot(pt.x, pt.y, lerp(3, 1.8, q), col, emaA)
    })
  }

  // legend
  group(appear * fadeBig, () => {
    txt('T1 mid', W / 2, H * 0.06, { size: fz(13), color: M.color[0], weight: 700, align: 'center' })
    const legend = seg(p, 0.35, 0.55)
    line(W / 2 - 62, H * 0.97, W / 2 - 42, H * 0.97, C.muted, 1, legend * 0.7)
    txt('one game', W / 2 - 36, H * 0.97, { size: fz(10), color: C.muted, mono: true, alpha: legend })
    const avg = seg(p, 1, 1.25)
    line(W / 2 + 34, H * 0.97, W / 2 + 54, H * 0.97, C.ink, 2.4, avg)
    txt('average', W / 2 + 60, H * 0.97, { size: fz(10), color: C.ink, mono: true, alpha: avg })
  })

  const teamKey = easeOut(seg(p, 3, 3.25))
  group(q, () => {
    txt('T1', W / 2 - 16 * teamKey, H * 0.06, { size: fz(13), color: M.color[0], weight: 700, align: 'center' })
    txt('T2', W / 2 + 16, H * 0.06, { size: fz(13), color: M.color[1], weight: 700, align: 'center', alpha: teamKey })
  })

  // Other four positions.
  const others = [0, 1, 3, 4]
  const popAt = (i) => 2.32 + others.indexOf(i) * 0.12
  others.forEach((i) => {
    const st = popAt(i)
    const a = easeOut(seg(p, st, st + 0.2))
    if (a <= 0) return
    const s = backOut(seg(p, st, st + 0.2))
    const { x, y } = slots[i]
    grid(x, y, r * s, a, 3)
    for (let ti = 0; ti < 2; ti++) {
      const own = ti ? enemyAt(i) : 1
      if (own <= 0) continue
      const col = M.color[ti]
      const vals = breathe(M.posSkills[i][ti], i * 1.3 + ti * 2)
      A(a)
      polyAt(x, y, r, vals, s * own)
      ctx.fillStyle = rgba(col, 0.14)
      ctx.fill()
      ctx.strokeStyle = col
      ctx.lineWidth = 1.6
      ctx.stroke()
    }
  })
  ROLES.forEach((_, i) => {
    const a = i === 2 ? q : easeOut(seg(p, popAt(i) + 0.08, popAt(i) + 0.26))
    if (a <= 0) return
    const { x, y } = slots[i]
    const [t1, t2] = M.posSkills[i]
    const gap = t1.reduce((sum, v) => sum + v, 0) - t2.reduce((sum, v) => sum + v, 0)
    const lead = gap >= 0 ? 0 : 1
    txt(roleLabel(i), x, y + r * 1.34, { size: fz(13), color: i === SPOT.i ? C.hi : C.ink, weight: 700, align: 'center', alpha: a })
    txt(`${M.tag[lead]} ahead`, x, y + r * 1.34 + fz(16), { size: fz(10.5), color: M.color[lead], mono: true, weight: 600, align: 'center', alpha: a * enemyAt(i) })
  })
}

// ---------- 05 · player ratings ----------
function moveArrow (xa, xb, y, color, a) {
  line(xa, y, xb, y, color, 1.8, a)
  const dir = Math.sign(xb - xa) || 1
  A(a)
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.moveTo(xb + dir * 4, y)
  ctx.lineTo(xb - dir, y - 3)
  ctx.lineTo(xb - dir, y + 3)
  ctx.fill()
}

// One pass of the rating filter, told as the model's own cycle:
//   beat 0  a belief per player              beat 3  the surprise is shared out by uncertainty
//   beat 1  predict through sigma points     beat 4  performance nudge, then the loop repeats
//   beat 2  prediction against the result
function sceneRatings (p) {
  const M = match
  const L = { x0: W * 0.02, x1: W * 0.98, y0: H * 0.1, y1: H * 0.57 }
  const rowH = (L.y1 - L.y0) / 5
  const lab = NARROW ? 32 : 62
  const dom0 = 1240
  const dom1 = 1760
  const xOf = (r) => lerp(L.x0 + lab, L.x1, (r - dom0) / (dom1 - dom0))
  const baseOf = (i) => L.y0 + (i + 1) * rowH - 4
  const zoom = ease(seg(p, 0.5, 0.88))
  const others = easeOut(seg(p, 0.68, 0.95))
  const update = ease(seg(p, 3.25, 3.85))
  const nudge = ease(seg(p, 4.05, 4.6))
  const sigFade = easeOut(seg(p, 1, 1.2)) * (1 - seg(p, 1.92, 2.05))
  const state = (pl) => ({ mu: lerp(pl.mu, pl.mu1, update) + nudge * (pl.mu2 - pl.mu1), sig: lerp(pl.sig, pl.sig1, update) })
  const peakOf = (sig) => Math.min(rowH * 0.86, rowH * 0.62 * Math.pow(70 / sig, 0.75))
  const gy = (mu, sig, base, r) => base - peakOf(sig) * Math.exp(-0.5 * ((r - mu) / sig) ** 2)
  const spPos = {}

  ;[
    ['one belief per player', 0.04, 0.58],
    ['the state: ten beliefs', 0.62, 1],
    ['predict', 1, 2],
    ['compare', 2, 3],
    ['update', 3, 4],
    ['nudge, then repeat', 4, 5.4]
  ].forEach(([title, a, b]) => {
    txt(title, L.x1, H * 0.05, { size: fz(11.5), color: C.hi, mono: true, weight: 700, align: 'right', alpha: easeOut(seg(p, a, a + 0.12)) * (1 - seg(p, b, b + 0.1)) })
  })
  txt('━ T1', L.x0 + 2, H * 0.05, { size: fz(10.5), color: M.color[0], mono: true, weight: 700, alpha: others })
  txt('━ T2', L.x0 + 2 + fz(44), H * 0.05, { size: fz(10.5), color: M.color[1], mono: true, weight: 700, alpha: others })

  // One large belief first, which then takes its place among the ten.
  const bigBase = H * 0.72
  const bigPeak = H * 0.46
  const bigScale = (W * 0.7) / (8 * spot.sig)
  const drawIn = ease(seg(p, 0, 0.24))
  ctx.save()
  ctx.beginPath()
  ctx.rect(L.x0 + lab, 0, L.x1 - L.x0 - lab, H)
  ctx.clip()
  for (let i = 0; i < 5; i++) {
    const base = baseOf(i)
    line(xOf(dom0), base, L.x1, base, C.faint, 1, zoom)
    for (let ti = 0; ti < 2; ti++) {
      const pl = M.players[ti][i]
      const col = M.color[ti]
      const s = state(pl)
      const isSpot = ti === SPOT.ti && i === SPOT.i
      const alpha = isSpot ? 1 : others
      if (alpha <= 0) continue
      const point = (r) => {
        const row = { x: xOf(r), y: gy(s.mu, s.sig, base, r) }
        if (!isSpot || zoom >= 1) return row
        const big = { x: W / 2 + (r - s.mu) * bigScale, y: bigBase - bigPeak * drawIn * Math.exp(-0.5 * ((r - s.mu) / s.sig) ** 2) }
        return { x: lerp(big.x, row.x, zoom), y: lerp(big.y, row.y, zoom) }
      }
      const baseline = isSpot ? lerp(bigBase, base, zoom) : base
      A(alpha)
      ctx.beginPath()
      ctx.moveTo(point(s.mu - 4 * s.sig).x, baseline)
      for (let k = 0; k <= 64; k++) {
        const q = point(s.mu - 4 * s.sig + (8 * s.sig * k) / 64)
        ctx.lineTo(q.x, q.y)
      }
      ctx.lineTo(point(s.mu + 4 * s.sig).x, baseline)
      ctx.fillStyle = rgba(col, 0.12)
      ctx.fill()
      ctx.strokeStyle = col
      ctx.lineWidth = 1.6
      ctx.stroke()

      // Sigma points sit on the belief as it stood before this game.
      const pop = backOut(seg(p, 1.02 + i * 0.06, 1.2 + i * 0.06))
      for (const sgn of [-1, 0, 1]) {
        const r = pl.mu + sgn * pl.sig * 1.2
        const q = { x: xOf(r), y: gy(pl.mu, pl.sig, base, r) }
        if (sgn) spPos[`${ti}-${i}-${sgn}`] = q
        if (pop > 0 && sigFade > 0) {
          line(q.x, base, q.x, q.y, col, 1, 0.35 * sigFade * clamp(pop))
          glow(q.x, q.y, (sgn ? 2.2 : 3) * clamp(pop, 0, 1.3) * (LIVE ? 1 + 0.22 * Math.sin(T / 420 + i + ti * 2 + sgn) : 1), col, sigFade)
        }
      }

      const arrowY = base - peakOf(s.sig) - 7
      // The filter's move, then the performance nudge on top of it.
      if (update > 0 && nudge < 1) moveArrow(xOf(pl.mu), xOf(lerp(pl.mu, pl.mu1, update)), arrowY, col, 0.9 * (1 - nudge))
      if (nudge > 0) {
        const xa = xOf(pl.mu1)
        const xb = xOf(lerp(pl.mu1, pl.mu2, nudge))
        const mc = pl.perf >= 0 ? C.green : C.pink
        moveArrow(xa, xb, arrowY, mc, 0.9)
        runner([{ x: xa, y: arrowY }, { x: xb, y: arrowY }], i * 0.12 + ti * 0.5, mc, nudge, 1700)
      }
    }
  }
  ctx.restore()

  for (let i = 0; i < 5; i++) {
    txt(roleLabel(i), L.x0 + 4, baseOf(i) - rowH * 0.3, { size: fz(11), color: C.muted, weight: 700, alpha: zoom })
  }
  for (const t of NARROW ? [1400, 1500, 1600] : [1300, 1400, 1500, 1600, 1700]) {
    txt(String(t), xOf(t), L.y1 + 8, { size: fz(9.5), color: C.dim, mono: true, align: 'center', alpha: zoom })
  }

  // Annotations on the single large belief.
  const anatomy = easeOut(seg(p, 0.22, 0.4)) * (1 - seg(p, 0.5, 0.64))
  if (anatomy > 0) {
    const spread = spot.sig * bigScale
    const barY = bigBase - bigPeak * Math.exp(-0.5)
    line(W / 2, bigBase, W / 2, bigBase - bigPeak - 6, C.ink, 1.2, anatomy, [4, 4])
    txt('best estimate of skill (μ)', W / 2, bigBase - bigPeak - fz(16), { size: fz(13), weight: 700, align: 'center', alpha: anatomy })
    line(W / 2 - spread, barY, W / 2 + spread, barY, C.hi, 2, anatomy)
    txt('uncertainty (σ)', W / 2, barY + fz(16), { size: fz(13), color: C.hi, weight: 700, align: 'center', alpha: anatomy })
    txt('skill rating →', W * 0.85, bigBase + fz(14), { size: fz(11), color: C.dim, mono: true, align: 'right', alpha: anatomy })
  }

  // Predict: every sigma point goes through the win curve, and the results are averaged.
  const R = { x0: W * 0.12, x1: W * 0.97, y0: H * 0.68, y1: H * 0.94 }
  const dr = 820
  const curveX = (d) => lerp(R.x0 + 6, R.x1, (d + dr) / (2 * dr))
  const curveY = (pv) => lerp(R.y1, R.y0, pv)
  const ca = easeOut(seg(p, 1, 1.18)) * (1 - seg(p, 2.05, 2.28))
  if (ca > 0) {
    line(R.x0, R.y0 - 4, R.x0, R.y1, C.faint, 1, ca)
    line(R.x0, R.y1, R.x1, R.y1, C.faint, 1, ca)
    line(R.x0, curveY(0.5), R.x1, curveY(0.5), C.faint, 1, ca, [3, 4])
    line(curveX(0), R.y0, curveX(0), R.y1, C.faint, 1, ca, [3, 4])
    txt('win curve', R.x1, R.y0 - fz(10), { size: fz(11), color: C.accent, mono: true, weight: 700, alpha: ca, align: 'right' })
    txt('win chance', R.x0, R.y0 - fz(10), { size: fz(10), color: C.dim, mono: true, alpha: ca })
    txt('rating gap →', R.x1, R.y1 + fz(11), { size: fz(9.5), color: C.dim, mono: true, align: 'right', alpha: ca })
    const reveal = seg(p, 1.02, 1.2)
    A(ca)
    ctx.beginPath()
    for (let k = 0; k <= 80 * reveal; k++) {
      const d = -dr + (2 * dr * k) / 80
      if (k === 0) ctx.moveTo(curveX(d), curveY(sigmoid(d / 400)))
      else ctx.lineTo(curveX(d), curveY(sigmoid(d / 400)))
    }
    ctx.strokeStyle = C.accent
    ctx.lineWidth = 2.4
    ctx.stroke()
  }
  M.sp.forEach((q, idx) => {
    const lt = (p - (1.3 + idx * 0.012)) / 0.22
    if (lt <= 0 || sigFade <= 0) return
    const to = { x: curveX(q.d), y: curveY(sigmoid(q.d / 400)) }
    const col = q.ti < 0 ? C.ink : M.color[q.ti]
    const from = q.ti < 0 ? { x: (L.x0 + L.x1) / 2, y: L.y1 } : spPos[`${q.ti}-${q.i}-${q.s}`]
    if (lt < 1) {
      group(sigFade, () => flight(from, to, lt, col, q.ti < 0 ? 3 : 2, 18))
      return
    }
    const a = sigFade * clamp((lt - 1) * 4)
    line(to.x, to.y, R.x0, to.y, col, 1, a * 0.25)
    dot(R.x0, to.y, 1.6, col, a * 0.8)
    glow(to.x, to.y, q.ti < 0 ? 3 : 1.9, col, a)
    if (LIVE && q.ti >= 0) group(a, () => flight(from, to, cycle(2600, idx / 21), col, 1.6, 18))
  })

  // Compare: the prediction drops onto a 0-100% track and the result slams to one end of it.
  const track = { x0: W * 0.1, x1: W * 0.9, y: H * 0.7 }
  const X = (v) => lerp(track.x0, track.x1, v)
  const trackFade = easeOut(seg(p, 2.1, 2.3)) * (1 - 0.55 * seg(p, 3, 3.2)) * (1 - seg(p, 4, 4.2))
  const go = seg(p, 2.35, 2.62)
  const land = seg(p, 2.62, 2.82)
  const puckX = lerp(X(M.phat), X(1), go * go * go)
  const surprise = 1 - M.phat
  const barH = Math.max(6, 9 * U)
  group(trackFade, () => {
    A()
    rr(track.x0, track.y - barH / 2, track.x1 - track.x0, barH, barH / 2)
    ctx.fillStyle = C.track
    ctx.fill()
    txt('T2 wins', X(0), track.y - fz(18), { size: fz(11), color: M.color[1], mono: true, weight: 700 })
    if (go > 0) {
      A(0.85)
      ctx.fillStyle = C.green
      ctx.fillRect(X(M.phat), track.y - barH / 2, puckX - X(M.phat), barH)
      glow(puckX, track.y, Math.max(4, 6 * U), M.color[0])
    }
    if (land > 0 && land < 1) {
      const wave = easeOut(land)
      A(1 - wave)
      ctx.beginPath()
      ctx.arc(X(1), track.y, lerp(6, 16 + 44 * U, wave), 0, TAU)
      ctx.strokeStyle = M.color[0]
      ctx.lineWidth = 2.5
      ctx.stroke()
    }
    const result = easeOut(land)
    txt('RESULT · T1 WINS', X(1), track.y - fz(18), { size: fz(11.5), color: M.color[0], mono: true, weight: 700, align: 'right', alpha: result })
    txt('surprise', (X(M.phat) + X(1)) / 2, track.y + fz(16), { size: fz(12.5), color: C.green, weight: 700, align: 'center', alpha: result })
    txt(signed(surprise, 2), X(1) + 7, track.y, { size: fz(12), color: C.green, mono: true, weight: 700, alpha: result })

    // Two other predictions for the same result, to show what surprise measures.
    const ghosts = easeOut(seg(p, 2.82, 3)) * (1 - seg(p, 3, 3.18))
    ;[[0.9, 'confident call', 0.83], [0.2, 'upset', 0.91]].forEach(([said, label, row]) => {
      const y = H * row
      A(ghosts * 0.55)
      ctx.fillStyle = C.green
      ctx.fillRect(X(said), y - 3, X(1) - X(said), 6)
      txt(label, said > 0.5 ? X(said) - 8 : X(said) - 6, y, { size: fz(10.5), color: C.muted, mono: true, align: 'right', alpha: ghosts })
      txt(signed(1 - said, 2), X(1) + 7, y, { size: fz(11), color: C.muted, mono: true, weight: 700, alpha: ghosts })
    })
  })

  // A single predicted marker travels from the curve's axis onto the track.
  const predicted = easeOut(seg(p, 1.72, 1.85))
  if (predicted > 0) {
    const toTrack = ease(seg(p, 2.02, 2.3))
    const fade = 1 - seg(p, 4, 4.2)
    const x = lerp(R.x0, X(M.phat), toTrack)
    const y = lerp(curveY(M.phat), track.y, toTrack)
    glow(x, y, 4, C.hi, predicted * fade)
    const label = `predicted ${pct(M.phat)}`
    txt(label, lerp(x + 14, x, toTrack), y - fz(18) * toTrack, { size: fz(11.5), color: C.hi, mono: true, weight: 700, align: toTrack > 0.5 ? 'center' : 'left', alpha: predicted * fade })
  }

  // Update: the surprise streams up to the beliefs, split by how uncertain each one is.
  const midX = (X(M.phat) + X(1)) / 2
  M.players.forEach((team, ti) => team.forEach((pl, i) => {
    const t = seg(p, 3.05 + (ti * 5 + i) * 0.018, 3.34 + (ti * 5 + i) * 0.018)
    if (t <= 0 || t >= 1) return
    const end = { x: xOf(pl.mu), y: baseOf(i) }
    const head = easeOut(t)
    const tail = Math.max(0, head - 0.3)
    line(lerp(midX, end.x, tail), lerp(track.y, end.y, tail), lerp(midX, end.x, head), lerp(track.y, end.y, head), M.color[ti], 2, Math.sin(Math.PI * t))
  }))
  const callout = easeOut(seg(p, 3.45, 3.7)) * (1 - seg(p, 4, 4.15))
  if (callout > 0) {
    const everyone = M.players.flatMap((team) => team.map((pl, i) => ({ sig: pl.sig, i }))).sort((a, b) => a.sig - b.sig)
    const tight = everyone[0]
    const wide = everyone[everyone.length - 1]
    txt('wide belief: moves most', L.x1, baseOf(wide.i) - rowH * 0.72, { size: fz(10.5), color: C.hi, mono: true, weight: 700, align: 'right', alpha: callout })
    txt('tight belief: barely moves', L.x1, baseOf(tight.i) - rowH * 0.72 + (tight.i === wide.i ? fz(13) : 0), { size: fz(10.5), color: C.muted, mono: true, weight: 700, align: 'right', alpha: callout })
  }
  const equation = easeOut(seg(p, 3.2, 3.45)) * (1 - seg(p, 4, 4.15))
  txt('μ ← μ + K · (result − predicted)', W / 2, H * 0.83, { size: fz(14), color: C.ink, mono: true, weight: 700, align: 'center', alpha: equation })
  txt('K grows with σ²   ·   σ² shrinks', W / 2, H * 0.91, { size: fz(12), color: C.muted, mono: true, align: 'center', alpha: equation })

  // The cycle closes: updated beliefs are the starting point for the next game.
  const loopA = easeOut(seg(p, 4.1, 4.4))
  if (loopA > 0) {
    txt('Δμ += performance_score / 30', W / 2, H * 0.68, { size: fz(13), color: C.green, mono: true, weight: 700, align: 'center', alpha: loopA })
    const steps = ['Belief', 'Predict', 'Compare', 'Update']
    const chipW = W * 0.19
    const chipH = Math.max(22, 34 * U)
    const y = H * 0.82
    const centre = (k) => W * (0.14 + k * 0.24)
    const running = LIVE ? cycle(5200) * 4 : -1
    steps.forEach((step, k) => {
      const on = LIVE && Math.floor(running) === k ? Math.sin(Math.PI * (running - k)) : 0
      A(loopA)
      rr(centre(k) - chipW / 2, y - chipH / 2, chipW, chipH, chipH / 2)
      ctx.fillStyle = rgba(C.hi, 0.08 + 0.26 * on)
      ctx.fill()
      ctx.strokeStyle = rgba(C.hi, 0.35 + 0.5 * on)
      ctx.lineWidth = 1
      ctx.stroke()
      txt(step, centre(k), y, { size: fz(12), color: C.ink, weight: 700, align: 'center', alpha: loopA })
      if (k < 3) txt('→', (centre(k) + centre(k + 1)) / 2, y, { size: fz(13), color: C.dim, align: 'center', alpha: loopA })
    })
    const under = y + chipH / 2
    const low = under + fz(16)
    line(centre(3), under, centre(3), low, C.dim, 1, loopA)
    line(centre(3), low, centre(0), low, C.dim, 1, loopA)
    line(centre(0), low, centre(0), under + 4, C.dim, 1, loopA)
    txt('next game', W / 2, low + fz(10), { size: fz(10.5), color: C.dim, mono: true, align: 'center', alpha: loopA })
  }
}

// ---------- 06 · ratings over time ----------
// Illustrative career: outcomes and performance adjust the rating, observations contract uncertainty,
// and idle days widen it. The player stays in the same tier-2 league.
const TL = (() => {
  const r = rng(4242)
  const g = () => Math.sqrt(-2 * Math.log(r() + 1e-12)) * Math.cos(TAU * r())
  const HP = 1 / 2000
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
  let m = 1450
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

const OFFSETS = [
  { name: 'League A', a: 215, b: 223 },
  { name: 'League B', a: 187, b: 182 },
  { name: 'League C', a: 41, b: 35 },
  { name: 'League D', a: -14, b: -20 },
  { name: 'Tier 2', a: -50, b: -50 }
]

function sceneTime (beat) {
  const p = remap(beat, [0, 0.45, 0.66, 1])
  const G = { x0: W * 0.1, x1: W * 0.97, y0: H * 0.1, y1: H * 0.56 }
  const lo = 700
  const hi = 2300
  const xOf = (d) => lerp(G.x0, G.x1, d / TL.END)
  const yOf = (rt) => lerp(G.y1, G.y0, (rt - lo) / (hi - lo))
  const a0 = easeOut(seg(p, 0, 0.06))
  const day = p < 0.45
    ? lerp(0, TL.GAP[0], ease(seg(p, 0.03, 0.41)))
    : p < 0.66
      ? lerp(TL.GAP[0], TL.GAP[1], ease(seg(p, 0.45, 0.62)))
      : lerp(TL.GAP[1], TL.END, ease(seg(p, 0.66, 0.95)))
  const fs = fz(10.5)

  for (const rt of [1000, 1500, 2000]) {
    line(G.x0, yOf(rt), G.x1, yOf(rt), C.faint, 1, a0 * (rt === 1500 ? 1 : 0.6), rt === 1500 ? null : [3, 4])
    txt(String(rt), G.x0 - 6, yOf(rt), { size: fz(9.5), color: C.dim, mono: true, align: 'right', alpha: a0 })
  }
  txt(NARROW ? 'ONE PLAYER · RATING ± 1 SD' : 'ONE PLAYER’S RATING, GAME BY GAME · BAND = ± 1 SD', G.x0, H * 0.05, { size: fs, color: C.dim, mono: true, weight: 600, alpha: a0 })

  const sy = G.y1 + fz(15)
  A(a0 * 0.18)
  ctx.fillStyle = C.dim
  rr(G.x0 + 1, sy - 7, G.x1 - G.x0 - 2, 14, 7)
  ctx.fill()
  txt('Tier-2 league', (G.x0 + G.x1) / 2, sy, { size: fz(10), color: C.dim, mono: true, weight: 700, align: 'center', alpha: a0 })

  const ga = easeOut(seg(p, 0.47, 0.52))
  if (ga > 0) {
    A(0.06 * ga)
    ctx.fillStyle = C.pink
    ctx.fillRect(xOf(TL.GAP[0]), G.y0, xOf(TL.GAP[1]) - xOf(TL.GAP[0]), G.y1 - G.y0)
    txt(`${TL.GAP[1] - TL.GAP[0]} days off`, (xOf(TL.GAP[0]) + xOf(TL.GAP[1])) / 2, G.y0 + fz(11), { size: fs, color: C.pink, mono: true, weight: 700, align: 'center', alpha: ga })
  }
  const ia = easeOut(seg(day, 470, 478))
  if (ia > 0) {
    A(0.08 * ia)
    ctx.fillStyle = C.accent
    ctx.fillRect(xOf(476), G.y0, xOf(508) - xOf(476), G.y1 - G.y0)
    txt('intl', (xOf(476) + xOf(508)) / 2, G.y0 + fz(11), { size: fs, color: C.accent, mono: true, weight: 700, align: 'center', alpha: ia })
  }

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
  ripple(xOf(head.d), yOf(head.m), 4, 22, C.hi, a0, 1900)
  txt(`${Math.round(head.m)} ± ${Math.round(head.sd)}`, G.x1 - 4, G.y1 - fz(13), { size: fz(15), color: C.hi, mono: true, weight: 700, align: 'right', alpha: a0 })

  const K = { x: W * 0.03, y: H * 0.68, w: W * 0.94, h: H * 0.29 }
  const cards = [
    { a: easeOut(seg(p, 0.06, 0.12)) * (1 - seg(p, 0.45, 0.48)), draw: cardGames },
    { a: easeOut(seg(p, 0.48, 0.53)) * (1 - seg(p, 0.66, 0.69)), draw: cardIdle },
    { a: easeOut(seg(p, 0.69, 0.74)), draw: cardOffsets }
  ]
  cards.forEach((c) => { if (c.a > 0) { panel(K.x, K.y, K.w, K.h, c.a); c.draw(K, c.a, p) } })
}

function cardRows (K, a, title, rows) {
  const fs = fz(11)
  txt(title, K.x + 14, K.y + fz(16), { size: fz(10), color: C.hi, mono: true, weight: 700, alpha: a })
  const rh = Math.min(fz(26), (K.h - fz(32)) / rows.length)
  rows.forEach((row, k) => {
    const y = K.y + fz(34) + k * rh
    txt(row[0], K.x + 14, y, { size: fs, color: row[2] || C.ink, mono: true, weight: row[3] ? 700 : 500, alpha: a })
    if (row[1]) txt(row[1], K.x + K.w - 14, y, { size: fs, color: row[2] || C.ink, mono: true, weight: 700, align: 'right', alpha: a })
  })
}

function cardGames (K, a) {
  cardRows(K, a, 'EVERY GAME TIGHTENS THE BAND', [
    ['first game: league average', '1450'],
    ['no history yet', `± ${Math.round(TL.sd0)}`, C.muted],
    ['after a season of games', `± ${Math.round(TL.sdSeason)}`, C.hi, true]
  ])
}

function cardIdle (K, a) {
  const fs = fz(11)
  txt('IDLE DAYS ADD UNCERTAINTY', K.x + 14, K.y + fz(16), { size: fz(10), color: C.hi, mono: true, weight: 700, alpha: a })
  const tiers = [['major', 1], ['minor', 1.5], ['tier 2', 2]]
  const rh = Math.min(fz(24), (K.h - fz(54)) / 3)
  const bx = K.x + K.w * 0.26
  const bw = K.w * 0.42
  tiers.forEach(([name, mult], k) => {
    const y = K.y + fz(34) + k * rh
    const on = mult === 2
    txt(name, K.x + 14, y, { size: fs, color: on ? C.pink : C.muted, mono: true, weight: on ? 700 : 500, alpha: a })
    A(a)
    ctx.fillStyle = C.track
    ctx.fillRect(bx, y - 3, bw, 6)
    A(a)
    ctx.fillStyle = on ? C.pink : C.dim
    ctx.fillRect(bx, y - 3, bw * mult / 2, 6)
    txt(`+${Math.round(197 * mult)}/day`, K.x + K.w - 14, y, { size: fs, color: on ? C.pink : C.muted, mono: true, weight: 700, align: 'right', alpha: a })
  })
  txt(`this break: ± ${Math.round(TL.sdSeason)} → ± ${Math.round(TL.sdIdle)}`, K.x + 14, K.y + K.h - fz(13), { size: fs, color: C.pink, mono: true, weight: 700, alpha: a })
}

function cardOffsets (K, a, p) {
  const fs = fz(11)
  txt(NARROW ? 'LEAGUE OFFSETS · INTL ONLY' : 'LEAGUE OFFSETS · MOVED BY INTERNATIONAL GAMES ONLY', K.x + 14, K.y + fz(16), { size: fz(10), color: C.hi, mono: true, weight: 700, alpha: a })
  const t = ease(seg(p, 0.78, 0.98))
  const top = K.y + fz(32)
  const rh = (K.y + K.h - fz(8) - top) / OFFSETS.length
  const ax = K.x + K.w * 0.52
  const half = K.w * 0.3
  line(ax, top - 2, ax, top + rh * OFFSETS.length - 4, C.faint, 1, a)
  OFFSETS.forEach((o, k) => {
    const y = top + (k + 0.4) * rh
    const val = lerp(o.a, o.b, t)
    const len = (val / 240) * half
    txt(o.name, K.x + 14, y, { size: fs, color: C.muted, mono: true, weight: 600, alpha: a })
    A(a)
    ctx.fillStyle = val >= 0 ? C.green : C.pink
    ctx.fillRect(Math.min(ax, ax + len), y - 3, Math.abs(len), 6)
    txt(signed(Math.round(val)), K.x + K.w - 14, y, { size: fs, color: o.a !== o.b && t > 0 ? C.accent : C.ink, mono: true, weight: 700, align: 'right', alpha: a })
  })
}

// ---------- 07 · prediction ----------
// One continuous sequence, in reading order:
//   beat 0  the gaps between teams           beat 3  zoom out: every tree walks its own path
//   beat 1  they feed one tree's questions   beat 4  every tree's output adds up
//   beat 2  later trees correct earlier ones beat 5  the score becomes a win chance
const TREE_COUNT = 400
const SCORE_STEPS = (() => {
  const values = match.forest.map((tree) => Math.round(tree.val * 1000))
  // The displayed terms must add up to the score that gives the displayed probability.
  values[values.length - 1] += Math.round(match.logit * 1000) - values.reduce((a, b) => a + b, 0)
  const totals = [0]
  values.forEach((value) => totals.push(totals[totals.length - 1] + value))
  return { values, totals, final: totals[totals.length - 1] / 1000 }
})()
const FIELD_TREES = (() => {
  const r = rng(9091)
  return Array.from({ length: TREE_COUNT }, () => ({ leaf: r() * 8 | 0, up: r() > 0.46 }))
})()
// Past matches the boosting chart learns from: each starts undecided and moves towards its real result.
const CORRECTION_MATCHES = (() => {
  const r = rng(515)
  return Array.from({ length: 14 }, (_, i) => ({ x: (i + 0.5) / 14, target: r() > 0.5 ? 1 : 0, rate: 0.5 + r() * 0.24 }))
})()
const correctionAt = (k) => 2.3 + k * 0.12

function drawCorrections (p) {
  const B = { x0: W * 0.12, x1: W * 0.96, y0: H * 0.5, y1: H * 0.91 }
  const X = (v) => lerp(B.x0, B.x1, v)
  const Y = (v) => lerp(B.y1, B.y0, v)
  let done = 0
  for (let k = 0; k < 6; k++) done += ease(seg(p, correctionAt(k), correctionAt(k) + 0.1))

  const count = Math.round(done)
  txt(count ? `after ${count} tree${count === 1 ? '' : 's'}` : 'before any tree', B.x0, B.y0 - fz(16), { size: fz(12), color: C.ink, mono: true, weight: 700 })
  txt(`still wrong: ${Math.round(Math.pow(0.62, done) * 100)}%`, B.x1, B.y0 - fz(16), { size: fz(12), color: C.pink, mono: true, weight: 700, align: 'right' })
  txt('won', B.x0 - 6, Y(1), { size: fz(10), color: C.dim, mono: true, align: 'right' })
  txt('lost', B.x0 - 6, Y(0), { size: fz(10), color: C.dim, mono: true, align: 'right' })
  line(B.x0, Y(1), B.x1, Y(1), C.faint, 1)
  line(B.x0, Y(0), B.x1, Y(0), C.faint, 1)
  line(B.x0, Y(0.5), B.x1, Y(0.5), C.faint, 1, 1, [3, 4])

  CORRECTION_MATCHES.forEach((m) => {
    const x = X(m.x)
    const value = m.target + (0.5 - m.target) * Math.pow(m.rate, done)
    line(x, Y(m.target), x, Y(value), C.pink, 3, 0.55)
    A()
    ctx.strokeStyle = C.ink
    ctx.lineWidth = 1.5
    ctx.strokeRect(x - 4, Y(m.target) - 4, 8, 8)
    dot(x, Y(value), Math.max(3, 4.5 * U), C.ink)
  })
  txt('□ real result    ● model so far    ▎ error the next tree trains on', (B.x0 + B.x1) / 2, B.y1 + fz(15), { size: fz(NARROW ? 8.5 : 10.5), color: C.muted, mono: true, align: 'center' })
}

function scenePrediction (p) {
  const M = match
  const toTree = ease(seg(p, 1, 1.35))
  const toRow = ease(seg(p, 2, 2.3))
  const toField = ease(seg(p, 3, 3.5))
  const treesOut = ease(seg(p, 4, 4.22))

  // Titles replace each other in step with the composition.
  ;[
    ['The gaps between the teams', 0, 1],
    ['One tree asks three questions', 1, 2],
    ['Each tree corrects the last', 2, 3],
    ['Hundreds of trees. One prediction.', 3, 4]
  ].forEach(([title, a, b]) => {
    const alpha = easeOut(seg(p, a + 0.02, a + 0.2)) * (1 - ease(seg(p, b, b + 0.15)))
    txt(title, W / 2, H * 0.06, { size: fz(18), weight: 750, align: 'center', alpha })
  })

  // Beats 0-1: the feature list; the three features the first tree asks about glide into its questions.
  const F = { x0: W * 0.05, x1: W * 0.95, y0: H * 0.14, y1: H * 0.95 }
  const rh = (F.y1 - F.y0) / M.feats.length
  const ax = F.x0 + (F.x1 - F.x0) * 0.56
  const half = F.x1 - ax - 2
  const qSlot = (l) => H * (0.62 + l * 0.12)
  const fs = fz(12)
  if (toRow < 1) {
    line(ax, F.y0, ax, F.y1, C.faint, 1, 1 - toTree)
    txt(`← ${M.tag[1]}`, ax - half, F.y0 - fz(4), { size: fz(10), color: M.color[1], mono: true, weight: 700, alpha: easeOut(seg(p, 0, 0.2)) * (1 - toTree) })
    txt(`${M.tag[0]} →`, ax + half, F.y0 - fz(4), { size: fz(10), color: M.color[0], mono: true, weight: 700, align: 'right', alpha: easeOut(seg(p, 0, 0.2)) * (1 - toTree) })
    const strongest = seg(p, 0.6, 0.78)
    M.feats.forEach((f, k) => {
      const y = F.y0 + (k + 0.5) * rh
      const a = easeOut(seg(p, 0.03 + k * 0.05, 0.22 + k * 0.05))
      const fill = easeOut(seg(p, 0.08 + k * 0.05, 0.3 + k * 0.05))
      const col = f.v >= 0 ? M.color[0] : M.color[1]
      const lit = k === 0 ? strongest : 0
      const dim = k === 0 ? 1 : 1 - 0.5 * strongest
      const listA = a * dim * (1 - toTree)
      if (lit > 0) {
        A((0.05 + 0.06 * pulse(1600)) * lit * (1 - toTree))
        ctx.fillStyle = C.hi
        rr(F.x0 - 8, y - rh / 2 + 2, F.x1 - F.x0 + 16, rh - 4, 8)
        ctx.fill()
      }
      A(listA)
      ctx.fillStyle = C.track
      ctx.fillRect(ax - half, y - 3, half * 2, 6)
      A(listA)
      ctx.fillStyle = col
      const len = f.v * half * fill
      ctx.fillRect(Math.min(ax, ax + len), y - 3, Math.abs(len), 6)
      runner([{ x: ax, y }, { x: ax + len, y }], k * 0.13, '#ffffff', listA * fill, 2000)
      if (!NARROW) txt(signed(f.v, 2), ax + (f.v >= 0 ? -6 : 6), y - fz(9), { size: fz(9.5), color: C.dim, mono: true, align: f.v >= 0 ? 'right' : 'left', alpha: listA * fill })

      const asked = M.questions.findIndex((q) => q.f === k)
      if (asked < 0) {
        txt(f.name, F.x0, y, { size: fs, color: k === 0 ? C.hi : C.muted, mono: true, alpha: listA })
        return
      }
      // A question reuses the row's label, so the viewer can follow it from list to tree.
      const q = M.questions[asked]
      const qy = lerp(y, qSlot(asked), toTree)
      const qa = a * (1 - toRow)
      txt(f.name, F.x0, qy, { size: fs, color: toTree > 0.5 || k === 0 ? C.hi : C.muted, mono: true, weight: toTree > 0.5 ? 700 : 500, alpha: qa * dim })
      const tail = ` > ${q.thr.toFixed(2)}?`
      txt(tail, F.x0 + measure(f.name, fs, toTree > 0.5 ? 700 : 500, true), qy, { size: fs, color: C.ink, mono: true, alpha: qa * easeOut(seg(toTree, 0.6, 1)) })
      const answer = easeOut(seg(p, 1.38 + asked * 0.2, 1.5 + asked * 0.2))
      txt(q.yes ? 'yes → right' : 'no → left', F.x1, qy, { size: fs, color: q.yes ? C.green : C.pink, mono: true, weight: 700, align: 'right', alpha: answer * (1 - toRow) })
    })
  }

  const big = { cx: W / 2, top: H * 0.14, w: W * 0.74, h: H * 0.32 }
  const gw = (W * 0.9) / 6
  const rowRect = (k) => ({ cx: W * 0.05 + (k + 0.5) * gw, top: H * 0.17, w: gw * 0.82, h: H * 0.15 })
  const fieldBox = { x: W * 0.06, y: H * 0.13, w: W * 0.88, h: H * 0.8 }
  const cellW = fieldBox.w / 20
  const cellH = fieldBox.h / 20
  const fieldRect = (k) => ({ cx: fieldBox.x + ((k % 20) + 0.5) * cellW, top: fieldBox.y + Math.floor(k / 20) * cellH + cellH * 0.16, w: cellW * 0.72, h: cellH * 0.62 })
  const mix = (a, b, t) => ({ cx: lerp(a.cx, b.cx, t), top: lerp(a.top, b.top, t), w: lerp(a.w, b.w, t), h: lerp(a.h, b.h, t) })
  const rectOf = (k) => mix(k === 0 ? mix(big, rowRect(0), toRow) : rowRect(k), fieldRect(k), toField)

  group(1 - treesOut, () => {
    group(easeOut(seg(p, 2.2, 2.4)) * (1 - ease(seg(p, 3, 3.2))), () => drawCorrections(p))

    // Beat 3: the rest of the forest grows in, and each tree walks its own questions to a leaf.
    if (toField > 0) {
      const edges = new Path2D()
      const paths = [new Path2D(), new Path2D()]
      const leaves = [new Path2D(), new Path2D()]
      const sweep = new Path2D()
      const sweepAt = LIVE ? cycle(4200) : -1
      for (let i = 6; i < TREE_COUNT; i++) {
        const t = i / TREE_COUNT
        const grown = easeOut(seg(p, 3.2 + t * 0.5, 3.38 + t * 0.5))
        if (grown <= 0) continue
        const r = fieldRect(i)
        const w = r.w * grown
        const h = r.h * grown
        const top = r.top + (r.h - h) / 2
        const nodeX = (level, index) => r.cx - w / 2 + (index + 0.5) * w / (1 << level)
        const nodeY = (level) => top + (level * h) / 3
        for (let level = 0; level < 3; level++) {
          for (let index = 0; index < 1 << level; index++) {
            for (let child = 0; child < 2; child++) {
              edges.moveTo(nodeX(level, index), nodeY(level))
              edges.lineTo(nodeX(level + 1, index * 2 + child), nodeY(level + 1))
            }
          }
        }
        const tree = FIELD_TREES[i]
        const walked = seg(p, 3.3 + t * 0.55, 3.46 + t * 0.55) * 3
        const colorIndex = tree.up ? 0 : 1
        const lit = Math.abs(t - sweepAt) < 0.05
        for (let level = 0; level < 3 && walked > level; level++) {
          const amount = Math.min(1, walked - level)
          const x0 = nodeX(level, tree.leaf >> (3 - level))
          const y0 = nodeY(level)
          const x1 = lerp(x0, nodeX(level + 1, tree.leaf >> (2 - level)), amount)
          const y1 = lerp(y0, nodeY(level + 1), amount)
          for (const target of lit ? [paths[colorIndex], sweep] : [paths[colorIndex]]) {
            target.moveTo(x0, y0)
            target.lineTo(x1, y1)
          }
        }
        if (walked >= 3) {
          const leafX = nodeX(3, tree.leaf)
          const leafY = nodeY(3)
          leaves[colorIndex].moveTo(leafX + 1.2, leafY)
          leaves[colorIndex].arc(leafX, leafY, 1.2, 0, TAU)
        }
      }
      A(0.75)
      ctx.strokeStyle = C.faint
      ctx.lineWidth = 0.7
      ctx.stroke(edges)
      ;[C.green, C.pink].forEach((color, index) => {
        A(0.9)
        ctx.strokeStyle = color
        ctx.lineWidth = 1
        ctx.stroke(paths[index])
        ctx.fillStyle = color
        ctx.fill(leaves[index])
      })
      A()
      ctx.strokeStyle = C.ink
      ctx.lineWidth = 1.3
      ctx.stroke(sweep)
    }

    M.forest.forEach((tree, k) => {
      const entry = k === 0 ? easeOut(seg(p, 1.04, 1.34)) : easeOut(seg(p, correctionAt(k) - 0.08, correctionAt(k) + 0.04))
      if (entry <= 0) return
      const r = rectOf(k)
      const lv = treeLayout(r.cx, r.top, r.w, r.h)
      drawTree(lv, entry * (1 - 0.4 * toField), lerp(2.3, 0.7, toField))
      const walk = k === 0 ? seg(p, 1.38, 1.98) : seg(p, correctionAt(k) - 0.04, correctionAt(k) + 0.08)
      const color = k === 0 ? C.hi : C.accent
      if (walk > 0) {
        const path = treePath(lv, tree.leaf)
        const head = tracePath(path, walk, color, lerp(2.4, 0.9, toField), entry * (walk < 1 ? 1 : 0.65 + 0.35 * pulse(1800, k / 6)))
        if (walk < 1) glow(head.x, head.y, 3, color)
      }
      const detail = 1 - ease(seg(p, 3, 3.22))
      const label = k === 5 ? '… more' : `Tree ${k + 1}`
      txt(label, r.cx, r.top - fz(13), { size: fz(11), color: k === 0 ? C.hi : C.muted, mono: true, weight: 700, align: 'center', alpha: (k === 0 ? toRow : 1) * entry * detail })
      if (walk >= 1) {
        const leaf = treePath(lv, tree.leaf)[3]
        txt(signed(tree.val, 2), leaf.x, leaf.y + fz(14), { size: fz(11), color: tree.val >= 0 ? M.color[0] : M.color[1], mono: true, weight: 700, align: 'center', alpha: detail * easeOut(seg(walk, 0.9, 1)) })
      }
    })
  })

  // Beat 4: outputs add up, row by row.
  group(easeOut(seg(p, 4.08, 4.3)) * (1 - ease(seg(p, 5, 5.2))), () => drawScoreSum(p))

  // Beat 5: the score becomes a probability, worked through in full.
  group(easeOut(seg(p, 5.05, 5.32)), () => {
    const B = { x0: W * 0.14, x1: W * 0.86, y0: H * 0.07, y1: H * 0.4 }
    const dom = 3
    const X = (v) => lerp(B.x0, B.x1, (v + dom) / (2 * dom))
    const Y = (pv) => lerp(B.y1, B.y0, pv)
    line(B.x0, B.y1, B.x1, B.y1, C.faint, 1)
    line(X(0), B.y0, X(0), B.y1, C.faint, 1, 1, [3, 4])
    A()
    ctx.beginPath()
    for (let k = 0; k <= 80; k++) {
      const v = -dom + (2 * dom * k) / 80
      if (k === 0) ctx.moveTo(X(v), Y(sigmoid(v)))
      else ctx.lineTo(X(v), Y(sigmoid(v)))
    }
    ctx.strokeStyle = C.accent
    ctx.lineWidth = 2.6
    ctx.stroke()
    const t = ease(seg(p, 5.2, 5.5))
    const v = lerp(0, SCORE_STEPS.final, t)
    const q = sigmoid(v)
    line(X(v), B.y1, X(v), Y(q), C.hi, 1.2, 0.7, [3, 3])
    glow(X(v), Y(q), 5, C.hi)
    ripple(X(v), Y(q), 6, 28, C.hi, t, 1900)
    txt(`score ${signed(v, 3)}`, X(v), B.y1 + fz(14), { size: fz(12), color: C.hi, mono: true, weight: 700, align: 'center' })

    const score = SCORE_STEPS.final
    const inverse = Math.exp(-score)
    const line1 = easeOut(seg(p, 5.42, 5.56))
    const line2 = easeOut(seg(p, 5.54, 5.68))
    const line3 = easeOut(seg(p, 5.66, 5.8))
    const size = fz(14)
    txt('chance = 1 / (1 + e^(−score))', W / 2, H * 0.53, { size, color: C.muted, mono: true, align: 'center', alpha: line1 })
    txt(`= 1 / (1 + e^(−${score.toFixed(3)}))`, W / 2, H * 0.6, { size, color: C.ink, mono: true, align: 'center', alpha: line2 })
    txt(`= 1 / (1 + ${inverse.toFixed(3)})`, W / 2, H * 0.67, { size, color: C.ink, mono: true, align: 'center', alpha: line3 })
    const result = easeOut(seg(p, 5.78, 5.95))
    txt(`${Math.round(sigmoid(score) * 100)}%`, W / 2, H * 0.81, { size: fz(62), color: C.ink, weight: 800, align: 'center', alpha: result })
    txt('raw chance for T1', W / 2, H * 0.94, { size: fz(14), color: C.muted, mono: true, align: 'center', alpha: result })
  })
}

function drawScoreSum (p) {
  const number = (value) => (value / 1000).toFixed(3)
  const delta = (value) => `${value < 0 ? '−' : '+'}${number(Math.abs(value))}`
  const { values, totals } = SCORE_STEPS
  const left = W * 0.05
  const right = W * 0.95
  const rowH = H * 0.1
  const top = H * 0.22
  const midX = W * 0.5
  const totalX = W * 0.83
  txt('Hundreds of contributions. One total.', W / 2, H * 0.06, { size: fz(18), weight: 750, align: 'center' })
  txt('TREE', left + 10, H * 0.15, { size: fz(10), color: C.dim, mono: true, weight: 700 })
  txt('ADDS', midX, H * 0.15, { size: fz(10), color: C.dim, mono: true, weight: 700, align: 'center' })
  txt('RUNNING TOTAL', totalX, H * 0.15, { size: fz(10), color: C.hi, mono: true, weight: 700, align: 'center' })
  values.forEach((value, k) => {
    const start = 4.26 + k * 0.09
    const added = easeOut(seg(p, start, start + 0.12))
    const y = top + k * rowH
    const color = value >= 0 ? C.green : C.pink
    const alpha = 0.3 + added * 0.7
    A(added * 0.06)
    rr(left, y - rowH * 0.42, right - left, rowH * 0.86, 8)
    ctx.fillStyle = color
    ctx.fill()
    txt(k === 5 ? 'All the rest' : `Tree ${k + 1}`, left + 10, y, { size: fz(13.5), weight: 650, alpha })
    txt(delta(value), midX, y, { size: fz(15), color, mono: true, weight: 700, align: 'center', alpha })
    if (added >= 1) runner([{ x: midX + W * 0.09, y }, { x: totalX - W * 0.1, y }], k * 0.16, color, 0.9, 1800)
    if (added > 0) {
      const running = Math.round(lerp(totals[k], totals[k + 1], added))
      txt(number(running), totalX, y, { size: fz(16), color: C.hi, mono: true, weight: 750, align: 'center' })
    } else {
      txt('—', totalX, y, { size: fz(13), color: C.faint, align: 'center' })
    }
  })
  const done = easeOut(seg(p, 4.8, 5))
  line(left, H * 0.82, right, H * 0.82, C.faint, 1, done)
  txt(`FINAL SCORE = ${number(totals[6])}`, W / 2, H * 0.9, { size: fz(21), color: C.hi, mono: true, weight: 750, align: 'center', alpha: done })
}

// ---------- 09 · calibration + market ----------
function sceneCalibrate (beat) {
  const p = remap(beat, [0, 0.22, 0.46, 0.6, 0.86, 1])
  const M = match
  const settle = ease(seg(beat, 2.85, 3.25))
  const sLarge = Math.min(W * 0.76, H * 0.72)
  const sSmall = Math.min(W * 0.5, H * 0.58)
  const s = lerp(sLarge, sSmall, settle)
  const x0 = lerp((W - sLarge) / 2, W * 0.07, settle)
  const y0 = lerp(H * 0.09, H * 0.12, settle)
  const px = (v) => x0 + v * s
  const py = (v) => y0 + s - v * s
  const a0 = easeOut(seg(p, 0, 0.06))

  for (const g of [0, 0.25, 0.5, 0.75, 1]) {
    line(px(g), y0, px(g), y0 + s, C.faint, 1, a0 * (g % 1 === 0 ? 1 : 0.5))
    line(x0, py(g), x0 + s, py(g), C.faint, 1, a0 * (g % 1 === 0 ? 1 : 0.5))
  }
  line(px(0), py(0), px(1), py(1), C.dim, 1, a0, [4, 4])
  txt('perfect', px(0.78), py(0.86), { size: fz(10), color: C.dim, mono: true, align: 'right', alpha: a0 })
  txt('model said', x0 + s, y0 + s + fz(13), { size: fz(10.5), color: C.dim, mono: true, align: 'right', alpha: a0 })
  ctx.save()
  ctx.translate(x0 - fz(11), y0)
  ctx.rotate(-Math.PI / 2)
  txt('actually won', 0, 0, { size: fz(10.5), color: C.dim, mono: true, align: 'right', alpha: a0 })
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
  const m = ease(seg(beat, 1.5, 1.92))
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

  // Past predictions in buckets: each dot is what a bucket said against how often it actually won.
  const bucketCount = 10
  const bucketX = (j) => (j + 0.5) / bucketCount
  const bucketY = (j) => (j === 6 ? M.pCal : fraw(bucketX(j)))
  const bucketFade = 1 - ease(seg(beat, 2.85, 3.1))
  for (let j = 0; j < bucketCount; j++) {
    const a = easeOut(seg(beat, 0.25 + j * 0.03, 0.42 + j * 0.03)) * bucketFade
    if (a <= 0) continue
    line(px(bucketX(j)), py(bucketX(j)), px(bucketX(j)), py(bucketY(j)), C.pink, 2, a * 0.5)
    dot(px(bucketX(j)), py(bucketY(j)), Math.max(2.5, 3.6 * U), C.ink, a)
  }

  // Isotonic regression: the best-fitting line through the buckets that is only ever allowed to rise.
  let highest = 0
  const levels = Array.from({ length: bucketCount }, (_, j) => {
    highest = Math.max(highest, bucketY(j))
    return highest
  })
  const stepAlpha = easeOut(seg(beat, 1, 1.12)) * (1 - 0.5 * seg(beat, 3, 3.3))
  if (stepAlpha > 0) {
    ctx.save()
    ctx.beginPath()
    ctx.rect(x0 - 4, y0 - 4, (s + 8) * ease(seg(beat, 1, 1.45)), s + 8)
    ctx.clip()
    A(stepAlpha)
    ctx.beginPath()
    levels.forEach((level, j) => {
      if (j === 0) ctx.moveTo(px(0), py(level))
      else ctx.lineTo(px(j / bucketCount), py(level))
      ctx.lineTo(px((j + 1) / bucketCount), py(level))
    })
    ctx.strokeStyle = C.hi
    ctx.lineWidth = 2.2
    ctx.stroke()
    ctx.restore()
    txt('isotonic fit', px(0.26), py(levels[2]) - fz(14), { size: fz(11), color: C.hi, mono: true, weight: 700, align: 'center', alpha: stepAlpha * seg(beat, 1.2, 1.4) })
  }
  ctx.save()
  ctx.beginPath()
  ctx.rect(x0 - 4, y0 - 4, (s + 8) * reveal, s + 8)
  ctx.clip()
  draw((x) => lerp(fraw(x), fcal(x), m), m > 0.5 ? C.green : C.accent, 2.6, a0)
  ctx.restore()
  txt(m < 0.5 ? 'raw model' : 'calibrated', px(0.96), py(lerp(fraw(0.96), fcal(0.96), m)) - fz(12), { size: fz(11), color: m < 0.5 ? C.accent : C.green, mono: true, weight: 700, align: 'right', alpha: a0 })

  const oc = seg(p, 0.13, 0.17) * (1 - seg(p, 0.26, 0.31))
  if (oc > 0) {
    line(px(0.8), py(0.8), px(0.8), py(fraw(0.8)), C.hi, 1.5, oc, [2, 3])
    glow(px(0.8), py(fraw(0.8)), 3, C.hi, oc)
    txt(`said 80% → won ${Math.round(fraw(0.8) * 100)}%`, px(0.8) - 8, py(fraw(0.8)) + fz(14), { size: fz(11), color: C.hi, mono: true, weight: 700, align: 'right', alpha: oc })
  }

  // T1's raw number is read up to the stepped line, then across to its calibrated value.
  const ma = easeOut(seg(beat, 2, 2.1))
  if (ma > 0) {
    const up = ease(seg(beat, 2.08, 2.4))
    const across = ease(seg(beat, 2.4, 2.7))
    const x = px(M.pRaw)
    const base = y0 + s
    const level = py(M.pCal)
    line(x, base, x, lerp(base, level, up), C.hi, 1.5, ma)
    if (across > 0) line(x, level, lerp(x, x0, across), level, C.hi, 1.5, ma)
    glow(x, base, 3.4, C.hi, ma)
    glow(lerp(x, x0, across), lerp(base, level, up), 3.4, C.hi, ma)
    ripple(lerp(x, x0, across), level, 4, 18, C.hi, ma * across, 1900)
    txt(`raw ${pct(M.pRaw)}`, x, base + fz(29), { size: fz(11.5), color: C.hi, mono: true, weight: 700, align: 'center', alpha: ma })
    txt(`adjusted ${pct(M.pCal)}`, x0 + 8, level - fz(11), { size: fz(11.5), color: C.hi, mono: true, weight: 700, alpha: across })
  }

  // The donut only exists once the chart has moved aside to make room for it.
  const R = Math.min(W * 0.15, H * 0.19)
  const dcx = W * 0.79
  const dcy = H * 0.12 + sSmall / 2
  const thick = R * 0.17
  const fill = ease(seg(p, 0.6, 0.72))
  const start = -Math.PI / 2
  group(easeOut(seg(p, 0.59, 0.65)), () => {
    A()
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
      if (LIVE) {
        const orbit = start + TAU * cycle(4200) * fill
        dot(dcx + Math.cos(orbit) * R, dcy + Math.sin(orbit) * R, thick * 0.24, '#ffffff', 0.9)
      }
    }
    txt(`${Math.round(M.pCal * 100 * fill)}%`, dcx, dcy - R * 0.08, { size: Math.round(R * 0.46), color: C.ink, weight: 750, align: 'center', alpha: clamp(fill * 2) })
    txt(`${M.tag[0]} win`, dcx, dcy + R * 0.32, { size: fz(11), color: M.color[0], mono: true, weight: 700, align: 'center', alpha: clamp(fill * 2) })
  })

  const mk = easeOut(seg(p, 0.76, 0.8))
  if (mk > 0) {
    const ang = start + TAU * M.pm
    const r0 = R - thick
    const r1 = R + thick * 1.1
    line(dcx + Math.cos(ang) * r0, dcy + Math.sin(ang) * r0, dcx + Math.cos(ang) * r1, dcy + Math.sin(ang) * r1, C.hi, 2.5, mk * (0.6 + 0.4 * pulse(1400)))
    txt(`bookmakers ${pct(M.pm)}`, dcx, dcy + R + thick + fz(16), { size: fz(11.5), color: C.hi, mono: true, weight: 700, align: 'center', alpha: mk })
  }

  const ea = easeOut(seg(p, 0.86, 0.91))
  if (ea > 0) {
    const k = kellyOf(M)
    const ey = H * 0.86
    txt(`edge ${signed(k.edge * 100, 0)} points`, W / 2, ey, { size: fz(20), color: k.bet ? C.green : C.muted, weight: 750, align: 'center', alpha: ea })
    txt(k.bet ? `bet ${(k.stake * 100).toFixed(1)}% of bankroll on ${M.tag[k.side]}` : 'inside the margin · no bet', W / 2, ey + fz(23), { size: fz(12), color: C.muted, mono: true, align: 'center', alpha: ea })
  }
}

// ---------- 08 · every team vs every team ----------
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
    ['T1', 'Lg A', 1752], ['T3', 'Lg B', 1738], ['T4', 'Lg A', 1724], ['T2', 'Lg A', 1707],
    ['T5', 'Lg B', 1690], ['T6', 'Lg C', 1612], ['T7', 'Lg C', 1561], ['T8', 'Lg D', 1548]
  ].map(([tag, league, r]) => ({ tag, league, r }))
  const P = teams.map((a) => teams.map((b) => sigmoid((a.r - b.r) / 400)))
  const p1 = P[0][3]
  return { teams, P, ti: 0, tj: 3, series: [1, 3, 5].map((n) => ({ n, v: bestOf(p1, n) })) }
})()
const teamColor = (tag) => (tag === 'T1' ? C.t1 : tag === 'T2' ? C.t2 : C.ink)

function sceneLeague (beat) {
  const p = remap(beat, [0, 0.48, 0.74, 1])
  const M = match
  const T = LEAGUE.teams
  const n = T.length
  const fs = fz(11)
  const listA = 1 - seg(p, 0.45, 0.49)
  const matA = seg(p, 0.48, 0.53)

  const Lx = { x0: W * 0.04, x1: W * 0.96, y0: H * 0.1, y1: H * 0.62 }
  const lh = (Lx.y1 - Lx.y0) / n
  const hiT1 = seg(p, 0.22, 0.26) * (1 - seg(p, 0.45, 0.49))
  if (listA > 0) {
    txt('POWER RANKING', Lx.x0, H * 0.05, { size: fz(11), color: C.dim, mono: true, weight: 600, alpha: listA })
    T.forEach((t, k) => {
      const y = Lx.y0 + (k + 0.5) * lh
      const a = easeOut(seg(p, 0.02 + k * 0.02, 0.07 + k * 0.02)) * listA
      if (a <= 0) return
      if (k === LEAGUE.ti && hiT1 > 0) {
        A(0.08 * hiT1 * listA)
        ctx.fillStyle = C.hi
        rr(Lx.x0 - 6, y - lh / 2 + 2, Lx.x1 - Lx.x0 + 12, lh - 4, 7)
        ctx.fill()
      }
      txt(String(k + 1), Lx.x0 + 6, y, { size: fs, color: C.dim, mono: true, align: 'center', alpha: a })
      txt(t.tag, Lx.x0 + fz(24), y, { size: fs + 2, color: teamColor(t.tag), weight: 700, alpha: a })
      txt(t.league, Lx.x0 + fz(66), y, { size: fz(10), color: C.dim, mono: true, alpha: a })
      const bx = Lx.x0 + fz(112)
      const bw = Lx.x1 - bx - fz(42)
      const fill = easeOut(seg(p, 0.05 + k * 0.02, 0.14 + k * 0.02))
      A(a)
      ctx.fillStyle = C.track
      ctx.fillRect(bx, y - 3, bw, 6)
      A(a)
      ctx.fillStyle = k === LEAGUE.ti ? C.hi : C.accent
      ctx.fillRect(bx, y - 3, bw * ((t.r - 1450) / 320) * fill, 6)
      runner([{ x: bx, y }, { x: bx + bw * ((t.r - 1450) / 320) * fill, y }], k * 0.12, '#ffffff', a * fill, 2400)
      txt(String(t.r), Lx.x1, y, { size: fs, color: C.ink, mono: true, weight: 700, align: 'right', alpha: a })
    })
  }

  const head = fz(34)
  const cell = Math.min((W * 0.94 - head) / n, (H * 0.56 - 18) / n)
  const mx = (W - n * cell + head) / 2
  const my = H * 0.1 + fz(18)
  const fillAt = (i, j) => 0.5 + ((i + j) / (2 * n - 2)) * 0.16
  const hA = easeOut(seg(p, 0.48, 0.52)) * matA
  if (hA > 0) {
    txt(NARROW ? 'P(ROW BEATS COL)' : 'P(ROW BEATS COLUMN) · ONE GAME · NEUTRAL SIDE', W / 2, H * 0.05, { size: fz(10.5), color: C.dim, mono: true, weight: 600, align: 'center', alpha: hA })
    T.forEach((t, k) => {
      txt(t.tag, mx - 6, my + (k + 0.5) * cell, { size: fz(10), color: teamColor(t.tag), mono: true, weight: 700, align: 'right', alpha: hA })
      txt(t.tag, mx + (k + 0.5) * cell, my - 8, { size: fz(10), color: teamColor(t.tag), mono: true, weight: 700, align: 'center', alpha: hA })
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
      // A diagonal wave keeps travelling across the table.
      const wave = LIVE ? Math.max(0, 1 - Math.abs((i + j) / (2 * n - 2) - cycle(3600)) / 0.1) : 0
      A(a * clamp(0.12 + Math.abs(pv - 0.5) / 0.14 * 0.6 + 0.3 * wave))
      ctx.fillStyle = pv >= 0.5 ? C.green : C.pink
      ctx.fillRect(x + 1, y + 1, cell - 2, cell - 2)
      if (cell >= 26) txt(String(Math.round(pv * 100)), x + cell / 2, y + cell / 2, { size: cell >= 36 ? 11 : 9.5, color: C.ink, mono: true, weight: 600, align: 'center', alpha: a })
    }
  }

  const pa = easeOut(seg(p, 0.75, 0.79))
  if (pa > 0) {
    const x = mx + LEAGUE.tj * cell
    const y = my + LEAGUE.ti * cell
    A(pa * (0.55 + 0.45 * pulse(1400)))
    ctx.strokeStyle = C.hi
    ctx.lineWidth = 2
    rr(x - 1, y - 1, cell + 2, cell + 2, 4)
    ctx.stroke()
  }

  const K = { x: W * 0.03, y: my + n * cell + fz(12), w: W * 0.94, h: H * 0.98 - (my + n * cell + fz(12)) }
  const ca = easeOut(seg(p, 0.24, 0.29)) * (1 - seg(p, 0.45, 0.49))
  if (ca > 0 && K.h > 60) {
    panel(K.x, K.y, K.w, K.h, ca)
    const mean0 = M.players[0].reduce((s, q) => s + q.mu, 0) / 5
    const roster = M.players[0].map((q, i) => [roleLabel(i), String(Math.round(q.mu - mean0 + 1537))])
    const compact = K.h < 160
    const rows = compact
      ? [['average of five starters', '1537'], ['league offset', '+215', C.green], ['team rating', String(T[0].r), C.t1]]
      : [...roster, ['average + league offset', '+215', C.green], ['team rating', String(T[0].r), C.t1]]
    const titleH = fz(26)
    const rh = (K.h - titleH - 8) / rows.length
    txt('T1 · LATEST FIVE STARTERS', K.x + 14, K.y + fz(14), { size: fz(10), color: C.hi, mono: true, weight: 700, alpha: ca })
    rows.forEach(([role, val, col], k) => {
      const y = K.y + titleH + (k + 0.5) * rh
      txt(role, K.x + 14, y, { size: fs, color: col && k === rows.length - 1 ? col : C.muted, mono: true, weight: k === rows.length - 1 ? 700 : 500, alpha: ca })
      txt(val, K.x + K.w - 14, y, { size: fs, color: col || C.ink, mono: true, weight: 700, align: 'right', alpha: ca })
    })
  }
  const sa = easeOut(seg(p, 0.77, 0.82))
  if (sa > 0 && K.h > 60) {
    panel(K.x, K.y, K.w, K.h, sa)
    txt('T1 vs T2 · SERIES ODDS (NEUTRAL)', K.x + 14, K.y + fz(14), { size: fz(10), color: C.hi, mono: true, weight: 700, alpha: sa })
    const top = K.y + fz(26)
    const rh = (K.h - fz(26) - 8) / 3
    const bx = K.x + fz(52)
    const bw = K.w - fz(52) - fz(66)
    LEAGUE.series.forEach((s, k) => {
      const y = top + (k + 0.5) * rh
      const f = easeOut(seg(p, 0.8 + k * 0.03, 0.86 + k * 0.03))
      txt(`Bo${s.n}`, K.x + 14, y, { size: fs, color: C.muted, mono: true, weight: 700, alpha: sa })
      A(sa)
      ctx.fillStyle = rgba(C.t2, 0.35)
      ctx.fillRect(bx, y - 4, bw, 8)
      A(sa)
      ctx.fillStyle = C.t1
      ctx.fillRect(bx, y - 4, bw * s.v * f, 8)
      runner([{ x: bx, y }, { x: bx + bw * s.v * f, y }], k * 0.2, '#ffffff', sa * f, 2000)
      line(bx + bw / 2, y - 7, bx + bw / 2, y + 7, C.ink, 1, sa * 0.5)
      txt(`${(s.v * 100).toFixed(1)}%`, K.x + K.w - 14, y, { size: fs, color: C.t1, mono: true, weight: 700, align: 'right', alpha: sa * f })
    })
  }
}

// ---------- copy ----------
// One entry per stage, one beat per block of text. A beat's index is its animation's start in `p`.
const betLine = (() => {
  const k = kellyOf(match)
  return k.bet
    ? `A ${(k.edge * 100).toFixed(0)}-point edge, so a small bet: ${(k.stake * 100).toFixed(1)}% of the bankroll.`
    : 'No real edge, so no bet.'
})()

export const SCENES = [
  {
    short: 'The match',
    title: 'Two teams, five roles',
    code: 'TOP / JNG / MID / BOT / SUP',
    draw: sceneMatch,
    beats: [
      { text: 'One example match, Team 1 against Team 2 (T1 and T2 from here on), runs through every stage below. The figures are illustrative, but each step mirrors the real code. Five players on each side take their positions: Top, Jungle, Mid, and the Bot-Support duo.', ms: 7000 },
      { text: 'Each player lines up against their direct opposite, and those five pairings are how the model reads a match.', ms: 4000 }
    ]
  },
  {
    short: 'Match data',
    title: 'Match data',
    code: 'golddiffat15 · xpdiffat15 · csdiffat15 · vspm',
    draw: sceneData,
    beats: [
      { text: 'Every player is measured across hundreds of in-game metrics, each one judged directly against the opponent in their role. Here is how that fills out for one T1 player.' },
      { text: 'The other nine players follow, producing ten clean stat lines ready to score.' }
    ]
  },
  {
    short: 'Performance',
    title: 'Performance scores',
    code: 'performance_score = f_position(early, middle, late) − expected',
    draw: scenePerf,
    beats: [
      { text: 'Different roles have different jobs. For a fair comparison, players are scored within their role, separately for early, middle and late game.' },
      { text: `The early-game model ranks T1’s mid against every other mid player: ${ordinal(SPOT_PCT[0])} percentile. Middle and late game are ranked the same way: ${ordinal(SPOT_PCT[1])} and ${ordinal(SPOT_PCT[2])}.` },
      { text: `Weighted together that’s ${Math.round(SPOT_COMP)}, against ${Math.round(OPP_COMP)} for T2’s mid. Expected is the average of the two (${Math.round(GAME_AVG)}), so T1’s mid scores ${signed(spot.perf * PERF_SCALE, 0)}.` },
      { text: 'Every player is scored against their opposite number. Green is above expected and pink is below.' }
    ]
  },
  {
    short: 'Skills',
    title: 'Skill profiles',
    code: 'vision = z(wpm) + z(wcpm) + 0.5·z(vspm)   ·   EMA span 5',
    draw: sceneSkills,
    beats: [
      { text: 'Take one player. They get five skill scores, and each faint outline is one game. Single games are noisy.' },
      { text: 'The bold shape is a running average, so it follows form rather than flukes.' },
      { text: 'The same is done for every position on the team.' },
      { text: 'Then the same again for the other team, so all five match-ups can be compared.' }
    ]
  },
  {
    short: 'Ratings',
    title: 'Player ratings',
    code: 'h(x) = σ((s̄T1 − s̄T2) / 400)   ·   Δμ += performance_score / 30',
    draw: sceneRatings,
    beats: [
      { text: 'The model tracks a belief about every player: a best estimate of their skill and how uncertain that estimate is. Ten players means ten beliefs, rather than ten fixed Elo numbers.' },
      { text: 'To predict a game, an Unscented Kalman Filter places sigma points across those beliefs. Each is one plausible version of the ten players. A curve turns each one’s rating gap into a win chance, and those chances are averaged.' },
      { text: 'Then the game is played. The surprise is the gap between the prediction and the result: an upset is a big surprise, and a confident, correct call barely registers.' },
      { text: 'The surprise is shared out by uncertainty. The Kalman gain moves uncertain players the most and settled players the least, and every belief tightens with the new evidence.' },
      { text: 'Each player’s own performance score then nudges their rating individually. The updated beliefs become the starting point for the next game.' }
    ]
  },
  {
    short: 'Over time',
    title: 'Ratings over time',
    code: 'σ² += q_day · idle days · tier (×1 · ×1.5 · ×2)',
    draw: sceneTime,
    beats: [
      { text: `Ratings are never rebuilt from scratch. A new player starts at their league’s average with a wide band (± ${Math.round(TL.sd0)}), and every game narrows it.` },
      { text: `Time off widens it again. Uncertainty grows every idle day, twice as fast in tier-2 leagues, so this break takes it back to ± ${Math.round(TL.sdIdle)}.` },
      { text: 'League offsets are learned separately and only move in cross-region games at international tournaments, when the leagues actually meet.' }
    ]
  },
  {
    short: 'Prediction',
    title: 'Prediction',
    code: 'elo_edge · mid_perfL_edge · sup_elo_diff · bot_vision_edge · …',
    draw: scenePrediction,
    beats: [
      { text: 'Everything becomes head-to-head gaps between the teams, alongside context like patch, roster changes and region strength. The team rating gap is the strongest signal.' },
      { text: 'The model is a gradient-boosted forest. Each tree asks a few yes/no questions about those gaps and lands on a leaf.' },
      { text: `Tree 1 lands on ${signed(match.forest[0].val, 2)} for this match. Tree 2 isn’t trained on match results directly: it learns from whatever tree 1 still got wrong across past matches. Tree 3 then learns from what’s left, so the remaining error keeps shrinking.` },
      { text: 'There are hundreds of trees in all, and every one asks its own questions and lands on its own small correction.' },
      { text: 'Their outputs simply add up to one score.' },
      { text: `A logistic function turns that score into a probability: ${signed(SCORE_STEPS.final, 3)} becomes a raw win chance of ${pct(match.pRaw)} for T1. In practice several models are ensembled with bookmaker prices to reduce variance.` }
    ]
  },
  {
    short: 'Every team',
    title: 'Every team vs every team',
    code: 'P(i beats j) = σ(slope · (r̄ᵢ − r̄ⱼ) / 400)   ·   bestof_prob(p, n)',
    draw: sceneLeague,
    beats: [
      { text: 'The same ratings price any pairing, not just this match. A team’s rating is the average of its five latest starters, league offset included, so a roster change shows up straight away.' },
      { text: 'Every pair of ratings goes through the same win curve, filling in a full head-to-head table across leagues.' },
      { text: `Single-game odds then turn into series odds: T1’s ${pct(LEAGUE.P[0][3])} per game becomes ${(LEAGUE.series[2].v * 100).toFixed(1)}% over a best-of-five.` }
    ]
  },
  {
    short: 'Calibrate & bet',
    title: 'Calibrate & bet',
    code: 'p_cal = iso(p_raw)   ·   edge = p_cal − p_market   ·   stake = ¼ Kelly',
    draw: sceneCalibrate,
    beats: [
      { text: 'Calibration learns from past predictions. They’re grouped into buckets, and each bucket’s average prediction is compared with how often those teams actually won. Raw predictions turn out to be overconfident.' },
      { text: 'Isotonic regression then fits a stepped line through the buckets that can only ever rise. It becomes a lookup from any raw prediction to its real-world win rate, pulling predictions onto the diagonal.' },
      { text: `T1’s raw ${pct(match.pRaw)} is read off that line and comes out at ${pct(match.pCal)}.` },
      { text: `Final prediction: T1 wins ${pct(match.pCal)} of the time. The bookmakers have T1 at ${pct(match.pm)}.` },
      { text: betLine }
    ]
  }
]

// Draw one stage at progress p (in beats) onto the given context. A time of 0 leaves the loops off.
export function drawScene (context, index, p, { width, height, dpr, font }, time = 0) {
  ctx = context
  T = time
  LIVE = time > 0
  W = width
  H = height
  NARROW = width < 520
  U = clamp(Math.min(width, height) / 600, 0.55, 1.15)
  GA = 1
  if (font) FONT = font
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.globalAlpha = 1
  ctx.clearRect(0, 0, W, H)
  SCENES[index].draw(p)
}
