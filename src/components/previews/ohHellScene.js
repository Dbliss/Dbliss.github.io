// Oh Hell decision scene in four steps, each its own short clip:
//   0 observe - your hand and the trump card are dealt; opponents' hands stay hidden
//   1 sample  - the hidden hands are re-dealt over and over (runs until moved on)
//   2 search  - every sampled deal is played out; the chances keep tightening (runs on)
//   3 decide  - the best card lifts and is played
// drawDecision(ctx, w, h, { step, p, wall }): p = seconds since the step began,
// wall = a free-running clock for idle motion. Card drawing lives in ohHellCards.js.
import { GLYPH, RANKS, SUITS, cardsReady, clamp01, drawCard, easeInOut, easeOut, hash, lerp, span, text } from './ohHellCards'

// --- Scenario -------------------------------------------------------------
// Five-card round, hearts are trump, you lead the first trick and bid two.
// East dealt and bid last, so the bids (2 + 1 + 0 + 1) avoid the hand size.
const TRUMP_UP = { r: '7', s: 'H' }
const HAND = [
  { r: 'J', s: 'D', win: 0.41 }, // left bower, plays as trump
  { r: '9', s: 'H', win: 0.47 },
  { r: 'A', s: 'S', win: 0.63 },
  { r: '4', s: 'S', win: 0.52 },
  { r: 'K', s: 'C', win: 0.38 }
]
const BEST = 2
const SEATS = [
  { name: 'West', bid: 1, x: 92, y: 196, label: [92, 240, 'center'] },
  { name: 'North', bid: 0, x: 300, y: 76, label: [362, 81, 'left'] },
  { name: 'East', bid: 1, x: 508, y: 196, label: [508, 240, 'center'] }
]
const DECK = SUITS.flatMap((s) => RANKS.map((r) => ({ r, s })))
const SEEN = new Set([...HAND, TRUMP_UP].map((c) => c.r + c.s))
const UNSEEN = DECK.filter((c) => !SEEN.has(c.r + c.s))

const HAND_Y = 334
const CARD_W = 60
const CARD_H = 87
const OPP_W = 36
const OPP_H = 52
const TRICK_SPOTS = [[300, 202], [258, 178], [300, 154], [342, 178]] // S W N E

const STEP_CAPTIONS = [
  'What this seat can see',
  'Sampling the hidden hands',
  'Playing every sample out',
  `Best play: A${GLYPH.S} · ${Math.round(HAND[BEST].win * 100)}% chance to make the bid`
]
export const DECISION_STEPS = STEP_CAPTIONS.length

// Seeded shuffle of the unseen cards: one hypothetical deal of the hidden hands.
function sampleDeal (seed) {
  const pool = UNSEEN.slice()
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(hash(seed * 61 + i) * (i + 1))
    ;[pool[i], pool[j]] = [pool[j], pool[i]]
  }
  return pool
}

function handX (i) { return 300 + (i - 2) * 68 }
function oppX (seat, j) { return seat.x + (j - 2) * 15 }

export function drawDecision (ctx, width, height, { step = 0, p = 0, wall = 0 } = {}) {
  // Felt
  const bg = ctx.createRadialGradient(width / 2, height * 0.45, 0, width / 2, height * 0.45, Math.max(width, height) * 0.75)
  bg.addColorStop(0, '#1d5a48')
  bg.addColorStop(1, '#0a2a22')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, width, height)

  const scale = Math.min(width / 600, height / 400)
  ctx.save()
  ctx.translate((width - 600 * scale) / 2, (height - 400 * scale) / 2)
  ctx.scale(scale, scale)

  ctx.strokeStyle = 'rgba(201, 174, 121, 0.35)'
  ctx.lineWidth = 1.5
  ctx.beginPath(); ctx.ellipse(300, 190, 250, 150, 0, 0, Math.PI * 2); ctx.stroke()

  const deck = { x: 300, y: 178 }
  // Deal clock: plays during step 0, already finished afterwards.
  const t = step === 0 ? p : 99
  const sampling = step === 1 || step === 2
  // One continuous sampling clock across steps 1 and 2.
  const sampleClock = step === 1 ? p : step === 2 ? p + 2 : 0
  const decide = step === 3 ? easeInOut(span(p, 0.15, 0.75)) : 0
  const playP = step === 3 ? easeInOut(span(p, 1.4, 2.2)) : 0

  // Trump indicator
  const trumpIn = easeOut(span(t, 0, 0.6))
  drawCard(ctx, TRUMP_UP, 38, 60, 34, 49, { alpha: trumpIn, flip: span(t, 0.2, 0.7) })
  text(ctx, 'TRUMP', 64, 56, { size: 10, color: '#c9ae79', alpha: trumpIn, spacing: 1.5 })
  text(ctx, '♥ Hearts', 64, 72, { size: 12, color: '#f2a29b', alpha: trumpIn })

  // Opponents: dealt face down, then turned over to sampled hands while sampling.
  SEATS.forEach((seat, s) => {
    for (let j = 0; j < 5; j++) {
      const k = s * 5 + j
      const d0 = 1.2 + k * 0.05
      const dp = easeOut(span(t, d0, d0 + 0.4))
      if (dp <= 0) continue
      const x = lerp(deck.x, oppX(seat, j), dp)
      const y = lerp(deck.y, seat.y, dp)
      const rot = (j - 2) * 0.06 * dp
      let flip = 0
      let card = null
      if (sampling) {
        // Each card turns over to a fresh sampled card, staggered across the table.
        const phase = sampleClock * 6 + j * 0.13 + s * 0.29
        const local = phase % 1
        card = sampleDeal(Math.floor(phase) + 1)[k]
        flip = Math.min(span(local, 0, 0.12), 1 - span(local, 0.88, 1), step === 1 ? span(p, 0, 0.3) : 1)
      } else if (step === 3) {
        card = sampleDeal(7)[k]
        flip = 1 - span(p, 0, 0.4)
      }
      drawCard(ctx, card, x, y, OPP_W, OPP_H, { rot, flip, tint: 1 })
    }
    const [lx, ly, align] = seat.label
    text(ctx, `${seat.name} · bid ${seat.bid}`, lx, ly, { size: 12, align, alpha: span(t, 1.8, 2.2), color: '#e9dcc0' })
    // "?" while their cards are unknown
    if (step === 0) {
      const q = span(p, 2.3, 2.7)
      const pulse = 0.7 + 0.3 * Math.sin(wall * 5 + s)
      text(ctx, '?', seat.x, seat.y + 9, { size: 30, align: 'center', alpha: q * pulse, color: '#f0cf8f', font: 'Georgia, serif', weight: 700 })
    }
    if (sampling) {
      text(ctx, 'sampled', lx, ly + 14, { size: 10, align, alpha: step === 1 ? span(p, 0, 0.4) : 1, color: '#71cba6', spacing: 1 })
    }
  })

  // Play-outs: each sampled deal is played to the end as tricks in the centre.
  if (step === 2) {
    const rate = 0.34
    const ghostAlpha = span(p, 0.1, 0.5)
    const m = Math.floor(p / rate)
    const q = (p / rate) % 1
    const trick = sampleDeal(m * 7 + 3)
    const mine = Math.floor(hash(m) * 5)
    const from = [[handX(mine), HAND_Y], [SEATS[0].x, SEATS[0].y], [SEATS[1].x, SEATS[1].y], [SEATS[2].x, SEATS[2].y]]
    const winner = Math.floor(hash(m * 3 + 1) * 4)
    for (let i = 0; i < 4; i++) {
      const lead = (i + Math.floor(hash(m + 9) * 4)) % 4
      const pin = easeOut(span(q, lead * 0.08, lead * 0.08 + 0.32))
      const pout = easeInOut(span(q, 0.72, 1))
      const [tx, ty] = TRICK_SPOTS[i]
      const [wx, wy] = from[winner]
      const x = lerp(lerp(from[i][0], tx, pin), wx, pout)
      const y = lerp(lerp(from[i][1], ty, pin), wy, pout)
      const card = i === 0 ? HAND[mine] : trick[i]
      drawCard(ctx, card, x, y, 32, 46, { alpha: ghostAlpha * pin * (1 - pout * 0.9) * 0.9, rot: (i - 1.5) * 0.1, tint: i === 0 ? 0 : 1 })
    }
  }

  // Your hand
  HAND.forEach((card, i) => {
    const d0 = 0.2 + i * 0.14
    const dp = easeOut(span(t, d0, d0 + 0.45))
    if (dp <= 0) return
    const flip = span(t, d0 + 0.35, d0 + 0.75)
    const isBest = i === BEST
    let x = lerp(deck.x, handX(i), dp)
    let y = lerp(deck.y, HAND_Y + Math.abs(i - 2) * 5, dp) - (isBest ? 12 * decide : 0)
    let rot = (i - 2) * 0.07 * dp
    let w = CARD_W
    let h = CARD_H
    if (isBest && playP > 0) {
      x = lerp(x, TRICK_SPOTS[0][0], playP)
      y = lerp(y, TRICK_SPOTS[0][1] - 6, playP)
      rot = lerp(rot, 0, playP)
      w = lerp(CARD_W, 48, playP)
      h = lerp(CARD_H, 70, playP)
    }
    drawCard(ctx, card, x, y, w, h, { rot, flip, glow: isBest ? decide : 0, alpha: isBest ? 1 : 1 - 0.35 * decide })
  })
  text(ctx, 'You · bid 2', 66, 352, { size: 12, align: 'center', alpha: span(t, 0.8, 1.2), color: '#e9dcc0' })
  text(ctx, 'you lead', 66, 367, { size: 10, align: 'center', alpha: span(t, 0.8, 1.2), color: '#c9ae79' })

  // Chance to make the bid per card: appears with the search and keeps tightening
  // for as long as it runs (noise shrinks like 1/sqrt of deals played). Final on decide.
  if (step >= 2) {
    const barsIn = step === 2 ? span(p, 0.2, 0.7) : 1
    // The label makes way for the played card, which lands on the same spot.
    text(ctx, 'CHANCE TO MAKE THE BID', 300, 240, { size: 9.5, align: 'center', alpha: barsIn * 0.85 * (1 - span(p, 1.2, 1.5) * (step === 3 ? 1 : 0)), color: '#c9ae79', spacing: 1.5 })
    const tick = p * 10
    const k0 = Math.floor(tick)
    const f = tick - k0
    const noise = step === 2 ? 0.3 / Math.sqrt(1 + p * 1.5) : 0
    HAND.forEach((card, i) => {
      const jitter = lerp(hash(k0 * 5 + i) - 0.5, hash((k0 + 1) * 5 + i) - 0.5, f) * 2
      const v = clamp01(card.win + jitter * noise)
      const x = handX(i) - 26
      const isBest = i === BEST
      const gold = isBest ? decide : 0
      const fade = isBest ? 1 : 1 - 0.3 * decide
      ctx.save()
      ctx.globalAlpha *= barsIn * fade
      ctx.fillStyle = 'rgba(255, 255, 255, 0.12)'
      ctx.beginPath(); ctx.roundRect(x, 268, 52, 5, 2.5); ctx.fill()
      ctx.fillStyle = gold > 0.5 ? '#f0cf8f' : '#71cba6'
      ctx.beginPath(); ctx.roundRect(x, 268, Math.max(2, 52 * v), 5, 2.5); ctx.fill()
      ctx.restore()
      text(ctx, `${Math.round(v * 100)}%`, handX(i), 262, {
        size: isBest ? 13 + 2 * gold : 12, align: 'center', weight: 700,
        alpha: barsIn * fade, color: gold > 0.5 ? '#f0cf8f' : '#e9f5ef'
      })
    })
  }

  // Live indicator while sampling / searching: no count, it runs until moved on.
  if (sampling) {
    const a = step === 1 ? span(p, 0, 0.4) : 1
    const pulse = 0.5 + 0.5 * Math.sin(wall * 6)
    ctx.save()
    ctx.globalAlpha *= a
    ctx.fillStyle = `rgba(113, 203, 166, ${0.4 + 0.6 * pulse})`
    ctx.beginPath(); ctx.arc(500, 30, 4, 0, Math.PI * 2); ctx.fill()
    ctx.strokeStyle = `rgba(113, 203, 166, ${0.5 * (1 - pulse)})`
    ctx.beginPath(); ctx.arc(500, 30, 4 + 8 * pulse, 0, Math.PI * 2); ctx.stroke()
    ctx.restore()
    text(ctx, step === 1 ? 'SAMPLING' : 'SEARCHING', 512, 34, { size: 10, alpha: a, color: '#71cba6', spacing: 2 })
  }

  // Caption
  const isFinal = step === 3
  text(ctx, STEP_CAPTIONS[step] || '', 300, 26, {
    size: isFinal ? 15 : 14, align: 'center', alpha: span(p, 0, 0.35),
    color: isFinal ? '#f0cf8f' : '#f6e8c9', font: 'Georgia, serif', weight: isFinal ? 700 : 500
  })

  ctx.restore()
}

drawDecision.ready = cardsReady
