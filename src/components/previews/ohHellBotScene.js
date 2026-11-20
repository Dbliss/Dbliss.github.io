// Tile preview for the 10-to-1 bot: the bot's head while it picks a card.
// One 13 s loop on a dark table:
//   deal     - the bot's hand is dealt and turned over
//   observe  - the three opponents' hands land face down ("?")
//   sample   - hidden hands are re-dealt over and over (teal = hypothetical card)
//   simulate - rollouts shoot up from each candidate card like lightning and land as
//              outcome dots (made the bid / bust). Every estimate on screen is counted
//              from those rollouts, so the bars and ranking tighten as the count climbs.
//   decide   - the other cards dim, the best card glows and rises, verdict.
// drawBotThinking(ctx, width, height, time) paints one frame in CSS pixels.
import { GLYPH, RANKS, SUITS, cardsReady, clamp01, drawCard, easeInOut, easeOut, hash, lerp, span, text } from './ohHellCards'

const MONO = 'ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace'

// --- Scenario (matches the case study): hearts are trump, you lead and bid two.
const TRUMP = { r: '7', s: 'H' }
const HAND = [
  { r: 'J', s: 'D', p: 0.41 }, // left bower, plays as trump
  { r: '9', s: 'H', p: 0.47 },
  { r: 'A', s: 'S', p: 0.63 },
  { r: '4', s: 'S', p: 0.52 },
  { r: 'K', s: 'C', p: 0.38 }
]
const BEST = 2
const HUE = ['#5ab8ff', '#a78bfa', '#4fe0b5', '#ff9f5a', '#ff7ab6']
const GOLD = '#f0cf8f'
const LOSS = '#ff4d6a'
const INK = '#e8f1ff'
const DIM = 'rgba(170, 200, 255, 0.55)'
const SEATS = [
  { name: 'WEST', bid: 1, x: 95 },
  { name: 'NORTH', bid: 0, x: 225 },
  { name: 'EAST', bid: 1, x: 355 }
]
const code = (c) => c.r + GLYPH[c.s]

const DECK = SUITS.flatMap((s) => RANKS.map((r) => ({ r, s })))
const SEEN = new Set([...HAND, TRUMP].map((c) => c.r + c.s))
const UNSEEN = DECK.filter((c) => !SEEN.has(c.r + c.s))

function sampleDeal (seed) {
  const pool = UNSEEN.slice()
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(hash(seed * 61 + i) * (i + 1))
    ;[pool[i], pool[j]] = [pool[j], pool[i]]
  }
  return pool
}

// --- Timeline --------------------------------------------------------------
const PERIOD = 13
const T = { hand: 0.3, opp: 1.1, sample: 2.2, sim: 3.0, decide: 9.0, fade: 12.2 }
const SIM_LEN = T.decide - T.sim
const REST_T = 7.4 // resting frame: mid-search, busiest moment

// Rollouts accelerate: count(s) = A s + B s^2 seconds into the search.
const RATE_A = 10
const RATE_B = 7
const simSeconds = (t) => Math.max(0, Math.min(t - T.sim, SIM_LEN))
const rolloutsAt = (t) => { const s = simSeconds(t); return RATE_A * s + RATE_B * s * s }
const spawnAt = (k) => T.sim + (-RATE_A + Math.sqrt(RATE_A * RATE_A + 4 * RATE_B * k)) / (2 * RATE_B)
// Each drawn rollout stands in for a batch of real ones in the counter.
const BATCH = 41
const candidateOf = (k) => Math.floor(hash(k * 7.31 + 2) * 5)
const PHASE = HAND.map((_, c) => hash(c * 17 + 4))

// Replays every rollout up to time t. Outcomes are spread evenly (rather than
// purely random) so each card's estimate converges on its true chance on cue.
function simulate (t, keepFor = 0) {
  const total = Math.floor(rolloutsAt(t))
  const n = [0, 0, 0, 0, 0]
  const w = [0, 0, 0, 0, 0]
  const recent = []
  for (let k = 0; k < total; k++) {
    const c = candidateOf(k)
    const j = n[c]
    const p = HAND[c].p
    const win = Math.floor((j + 1) * p + PHASE[c]) - Math.floor(j * p + PHASE[c])
    n[c]++
    w[c] += win
    if (keepFor && t - spawnAt(k) < keepFor) recent.push({ k, c, win, at: spawnAt(k) })
  }
  return { total, n, est: n.map((m, i) => (w[i] + 1) / (m + 2)), recent }
}

function ranksOf (est) {
  const order = est.map((v, i) => i).sort((a, b) => est[b] - est[a])
  const rank = []
  order.forEach((c, r) => { rank[c] = r })
  return rank
}

// --- Geometry --------------------------------------------------------------
const CX = 225 // centre of the main stage (the panel owns x > 455)
const HAND_Y = 240
const CW = 56
const CH = 81
const OPP_Y = 66
const handX = (i) => CX + (i - 2) * 72
const BEST_TO = { x: 150, y: 142, w: 84, h: 122 }

// A rollout's lightning path from its card up to its outcome leaf.
function rolloutPath (k, c) {
  const sx = handX(c) + (hash(k * 2.7) - 0.5) * 22
  const sy = HAND_Y - CH / 2 + 2
  const ex = 30 + hash(k * 3.1) * 390
  const ey = 114 + hash(k * 5.7) * 62
  const dx = ex - sx
  const dy = ey - sy
  const len = Math.hypot(dx, dy) || 1
  const px = -dy / len
  const py = dx / len
  const pts = [[sx, sy]]
  for (let i = 1; i < 4; i++) {
    const f = i / 4
    const j = (hash(k * 11 + i) - 0.5) * 38
    pts.push([sx + dx * f + px * j, sy + dy * f + py * j])
  }
  pts.push([ex, ey])
  return pts
}

function strokePartial (ctx, pts, u) {
  const segs = pts.length - 1
  const at = u * segs
  const whole = Math.floor(at)
  ctx.beginPath()
  ctx.moveTo(pts[0][0], pts[0][1])
  for (let i = 1; i <= whole && i <= segs; i++) ctx.lineTo(pts[i][0], pts[i][1])
  let head = pts[Math.min(whole, segs)]
  if (whole < segs) {
    const f = at - whole
    const a = pts[whole]
    const b = pts[whole + 1]
    head = [lerp(a[0], b[0], f), lerp(a[1], b[1], f)]
    ctx.lineTo(head[0], head[1])
  }
  ctx.stroke()
  return head
}

function strokeCard (ctx, x, y, w, h, rot, color, alpha, lw = 1.5) {
  if (alpha <= 0) return
  ctx.save()
  ctx.globalAlpha *= alpha
  ctx.translate(x, y)
  ctx.rotate(rot)
  ctx.strokeStyle = color
  ctx.lineWidth = lw
  ctx.shadowColor = color
  ctx.shadowBlur = 12
  ctx.beginPath(); ctx.roundRect(-w / 2 - 2, -h / 2 - 2, w + 4, h + 4, w * 0.1); ctx.stroke()
  ctx.restore()
}

const fmt = (n) => Math.floor(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')

// --- Frame -------------------------------------------------------------------
export function drawBotThinking (ctx, width, height, time) {
  const t = time === 0 ? REST_T : time % PERIOD
  const light = easeOut(span(t, 0, 0.6)) * (1 - span(t, T.fade, PERIOD - 0.05))
  const d = t - T.decide
  const dim = easeInOut(span(d, 0, 0.5))
  const lock = easeOut(span(d, 0.2, 0.8))
  const rise = easeInOut(span(d, 0.6, 1.3))
  const reveal = easeOut(span(d, 1.1, 1.6))
  const simming = t >= T.sim && t < T.decide
  const sim = simulate(t, 3.2)

  ctx.fillStyle = '#04060c'
  ctx.fillRect(0, 0, width, height)

  const scale = Math.min(width / 600, height / 400)
  ctx.save()
  ctx.translate(width / 2, height / 2)
  ctx.scale(scale, scale)
  ctx.translate(-300, -200)
  ctx.globalAlpha = light

  // Backdrop glow, warming to gold on the decision.
  const glow = ctx.createRadialGradient(CX, 150, 0, CX, 150, 380)
  glow.addColorStop(0, `rgba(${Math.round(lerp(30, 90, dim))}, ${Math.round(lerp(80, 70, dim))}, ${Math.round(lerp(150, 40, dim))}, 0.5)`)
  glow.addColorStop(1, 'rgba(4, 6, 12, 0)')
  ctx.fillStyle = glow
  ctx.fillRect(-300, -200, 1200, 800)

  // Static grid.
  ctx.strokeStyle = 'rgba(110, 160, 255, 0.05)'
  ctx.lineWidth = 1
  ctx.beginPath()
  for (let x = -100; x <= 700; x += 25) { ctx.moveTo(x, -60); ctx.lineTo(x, 460) }
  for (let y = -50; y <= 450; y += 25) { ctx.moveTo(-100, y); ctx.lineTo(700, y) }
  ctx.stroke()

  // --- Header ---------------------------------------------------------------
  text(ctx, '10-TO-1 BOT', 20, 28, { size: 12, weight: 800, font: MONO, color: INK, spacing: 2.5 })
  text(ctx, 'TRUMP', 556, 28, { size: 9, font: MONO, color: DIM, align: 'right', spacing: 1.5 })
  drawCard(ctx, TRUMP, 574, 24, 17, 25, { alpha: span(t, 0.4, 0.8), flip: span(t, 0.5, 0.9), shadow: 0.5 })

  // --- Opponents: face down, then re-dealt as samples ------------------------
  SEATS.forEach((seat, si) => {
    const sampling = t >= T.sample
    for (let j = 0; j < 5; j++) {
      const k = si * 5 + j
      const d0 = T.opp + k * 0.04
      const dp = easeOut(span(t, d0, d0 + 0.35))
      if (dp <= 0) continue
      let card = null
      let flip = 0
      if (sampling) {
        const speed = simming ? 9 : 5
        const ph = (t - T.sample) * speed + j * 0.13 + si * 0.29
        const local = ph % 1
        card = sampleDeal(Math.floor(ph) + 1)[k]
        flip = Math.min(span(local, 0, 0.15), 1 - span(local, 0.85, 1)) * span(t, T.sample, T.sample + 0.3) * (1 - span(d, 0, 0.4))
      }
      drawCard(ctx, card, seat.x + (j - 2) * 14, lerp(36, OPP_Y, dp), 20, 29, {
        rot: (j - 2) * 0.05, flip, tint: 1, alpha: dp * (1 - 0.6 * dim), shadow: 0.6
      })
    }
    const la = span(t, T.opp + 0.4, T.opp + 0.8) * (1 - 0.6 * dim)
    text(ctx, `${seat.name} · BID ${seat.bid}`, seat.x, 97, { size: 8.5, font: MONO, align: 'center', alpha: la, color: sampling && d < 0 ? '#4fe0b5' : DIM, spacing: 1 })
    if (!sampling) {
      const q = span(t, T.opp + 0.6, T.opp + 1.0) * (0.6 + 0.4 * Math.sin(t * 5 + si))
      text(ctx, '?', seat.x, OPP_Y + 9, { size: 26, align: 'center', alpha: q, color: GOLD, font: 'Georgia, serif', weight: 700 })
    }
  })

  // --- Rollouts: lightning up from each card, landing as outcome dots ---------
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  const pulse = [0, 0, 0, 0, 0]
  for (const r of sim.recent) {
    const age = t - r.at
    if (age > 3.2) continue
    pulse[r.c] = Math.max(pulse[r.c], 1 - span(age, 0, 0.25))
    const pts = rolloutPath(r.k, r.c)
    const head = clamp01(age / 0.42)
    const fade = (1 - span(age, 0.42, 1.0)) * (1 - dim)
    if (fade > 0) {
      ctx.globalAlpha = light * 0.7 * fade
      ctx.strokeStyle = HUE[r.c]
      ctx.lineWidth = 1.2
      const [hx, hy] = strokePartial(ctx, pts, easeOut(head))
      if (head < 1) {
        ctx.globalAlpha = light * fade
        ctx.fillStyle = '#ffffff'
        ctx.beginPath(); ctx.arc(hx, hy, 1.8, 0, Math.PI * 2); ctx.fill()
      }
    }
    if (age >= 0.42) {
      const [ex, ey] = pts[pts.length - 1]
      const la = (1 - span(age, 0.42, 3.2)) * (1 - 0.85 * dim)
      ctx.globalAlpha = light * la
      ctx.fillStyle = r.win ? HUE[r.c] : LOSS
      ctx.beginPath(); ctx.arc(ex, ey, r.win ? 2.4 : 1.5, 0, Math.PI * 2); ctx.fill()
      const burst = span(age, 0.42, 0.9)
      if (burst < 1) {
        ctx.globalAlpha = light * (1 - burst) * 0.8
        ctx.strokeStyle = r.win ? HUE[r.c] : LOSS
        ctx.lineWidth = 1
        ctx.beginPath(); ctx.arc(ex, ey, lerp(2, 13, easeOut(burst)), 0, Math.PI * 2); ctx.stroke()
      }
    }
  }
  ctx.restore()

  // --- Estimates (shared by the bars, ranking and plot) ------------------------
  const tick = t * 8
  const k0 = Math.floor(tick)
  const f = tick - k0
  const shown = sim.est.map((v, i) => {
    const jitter = lerp(hash(k0 * 5 + i) - 0.5, hash((k0 + 1) * 5 + i) - 0.5, f) * 2
    const noisy = clamp01(v + (simming ? jitter * 0.2 / Math.sqrt(sim.n[i] + 1) : 0))
    return lerp(noisy, HAND[i].p, dim)
  })
  const barsIn = span(t, T.sim, T.sim + 0.4)

  // --- Your hand ---------------------------------------------------------------
  let bestDraw = null
  HAND.forEach((card, i) => {
    const d0 = T.hand + i * 0.12
    const dp = easeOut(span(t, d0, d0 + 0.5))
    if (dp <= 0) return
    const flip = easeInOut(span(t, d0 + 0.3, d0 + 0.65))
    const think = pulse[i] * (1 - dim)
    let x = lerp(CX, handX(i), dp)
    let y = lerp(470, HAND_Y + Math.abs(i - 2) * 4, dp) - 4 * think
    let rot = lerp(1.2, (i - 2) * 0.05, dp)
    if (i === BEST) {
      bestDraw = {
        card,
        x: lerp(x, BEST_TO.x, rise),
        y: lerp(y, BEST_TO.y, rise),
        w: lerp(CW, BEST_TO.w, rise),
        h: lerp(CH, BEST_TO.h, rise),
        rot: lerp(rot, 0, rise),
        flip
      }
      return
    }
    y += 10 * dim
    drawCard(ctx, card, x, y, CW, CH, { rot, flip, alpha: 1 - 0.6 * dim, shadow: 1.5 })
    strokeCard(ctx, x, y, CW, CH, rot, HUE[i], think * 0.9)
  })

  // Bars under each card.
  HAND.forEach((card, i) => {
    if (barsIn <= 0) return
    const isBest = i === BEST
    const fade = isBest ? 1 - rise : 1 - 0.65 * dim
    const color = isBest && dim > 0.5 ? GOLD : HUE[i]
    const x0 = handX(i) - 26
    ctx.save()
    ctx.globalAlpha *= barsIn * fade
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)'
    ctx.beginPath(); ctx.roundRect(x0, 303, 52, 4, 2); ctx.fill()
    ctx.fillStyle = color
    ctx.shadowColor = color
    ctx.shadowBlur = 8
    ctx.beginPath(); ctx.roundRect(x0, 303, Math.max(2, 52 * shown[i]), 4, 2); ctx.fill()
    ctx.restore()
    text(ctx, `${Math.round(shown[i] * 100)}%`, handX(i), 298, { size: 11, weight: 700, font: MONO, align: 'center', alpha: barsIn * fade, color })
    text(ctx, `n=${sim.n[i] * BATCH}`, handX(i), 319, { size: 7.5, font: MONO, align: 'center', alpha: barsIn * fade * 0.55, color: INK })
  })

  // --- Side panel: counter and live ranking ------------------------------------
  const panelIn = easeOut(span(t, 0.2, 0.8))
  ctx.save()
  ctx.globalAlpha *= panelIn
  ctx.translate((1 - panelIn) * 20, 0)
  ctx.fillStyle = 'rgba(14, 22, 42, 0.62)'
  ctx.strokeStyle = 'rgba(110, 170, 255, 0.2)'
  ctx.lineWidth = 1
  ctx.beginPath(); ctx.roundRect(458, 42, 132, 170, 8); ctx.fill(); ctx.stroke()

  text(ctx, 'ROLLOUTS', 468, 60, { size: 8, font: MONO, color: DIM, spacing: 1.5 })
  text(ctx, fmt(rolloutsAt(t) * BATCH), 468, 82, { size: 18, weight: 800, font: MONO, color: d >= 0 ? GOLD : INK })

  text(ctx, 'EVALUATION', 468, 104, { size: 8, font: MONO, color: DIM, spacing: 1.5 })
  // Rows slide between ranks as the estimates overtake each other.
  const q = t * 3
  const q0 = Math.floor(q)
  const r0 = ranksOf(simulate(q0 / 3).est)
  const r1 = ranksOf(simulate((q0 + 1) / 3).est)
  const qf = easeInOut(q - q0)
  HAND.forEach((card, i) => {
    const rank = barsIn > 0 ? lerp(r0[i], r1[i], qf) : i
    const y = 121 + rank * 19
    const isBest = i === BEST
    const color = isBest && dim > 0.5 ? GOLD : HUE[i]
    const a = isBest ? 1 : 1 - 0.55 * dim
    if (isBest && dim > 0) {
      ctx.fillStyle = `rgba(240, 207, 143, ${0.14 * dim})`
      ctx.fillRect(462, y - 12, 124, 17)
    }
    text(ctx, code(card), 468, y, { size: 11, weight: 700, font: MONO, color, alpha: a })
    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)'
    ctx.fillRect(494, y - 5, 54, 3)
    ctx.save()
    ctx.globalAlpha *= a * barsIn
    ctx.fillStyle = color
    ctx.fillRect(494, y - 5, 54 * shown[i], 3)
    ctx.restore()
    text(ctx, barsIn > 0 ? shown[i].toFixed(2) : '--', 581, y, { size: 9, font: MONO, align: 'right', color: INK, alpha: a })
  })
  ctx.restore()

  // --- Decision: the others dim, the best card glows and rises, verdict fades in.
  if (bestDraw) {
    const b = bestDraw
    drawCard(ctx, b.card, b.x, b.y, b.w, b.h, { rot: b.rot, flip: b.flip, glow: lock, shadow: 1.5 })
    if (d < 0) strokeCard(ctx, b.x, b.y, b.w, b.h, b.rot, HUE[BEST], pulse[BEST] * 0.9)

    if (reveal > 0) {
      text(ctx, 'BEST PLAY', 214, 118, { size: 9, font: MONO, color: GOLD, spacing: 2.5, alpha: reveal })
      text(ctx, code(b.card), 211, 160, { size: 44, weight: 700, font: 'Georgia, serif', color: '#fff4dc', alpha: reveal })
      text(ctx, `${Math.round(HAND[BEST].p * 100)}% to make the bid`, 214, 182, { size: 11, weight: 600, font: MONO, color: INK, alpha: reveal })
    }
  }
  ctx.restore()

  // Vignette.
  const vig = ctx.createRadialGradient(width / 2, height / 2, Math.min(width, height) * 0.4, width / 2, height / 2, Math.max(width, height) * 0.78)
  vig.addColorStop(0, 'rgba(0,0,0,0)')
  vig.addColorStop(1, 'rgba(0,0,0,0.6)')
  ctx.fillStyle = vig
  ctx.fillRect(0, 0, width, height)
}

drawBotThinking.ready = cardsReady
