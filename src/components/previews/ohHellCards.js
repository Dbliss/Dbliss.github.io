// Shared card drawing for the Oh Hell canvases. Faces come from one sprite sheet
// built from the game's own card images: 13 ranks x 4 suits, rows ordered
// spades, hearts, clubs, diamonds; each cell is 132 x 192.
import atlasUrl from '../../assets/oh-hell/cards-atlas.webp'

export { atlasUrl }
export const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A']
export const SUITS = ['S', 'H', 'C', 'D']
export const GLYPH = { S: '♠', H: '♥', C: '♣', D: '♦' }
const CELL_W = 132
const CELL_H = 192

let atlas = null
export let cardsReady = Promise.resolve()
if (typeof Image !== 'undefined') {
  atlas = new Image()
  atlas.src = atlasUrl
  cardsReady = atlas.decode().catch(() => {})
}

export const clamp01 = (v) => Math.max(0, Math.min(1, v))
export const span = (t, a, b) => clamp01((t - a) / (b - a))
export const easeOut = (p) => 1 - (1 - p) ** 3
export const easeInOut = (p) => (p < 0.5 ? 4 * p ** 3 : 1 - (-2 * p + 2) ** 3 / 2)
export const lerp = (a, b, p) => a + (b - a) * p
export const hash = (n) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453
  return x - Math.floor(x)
}

let back = null
function cardBack () {
  if (back || typeof document === 'undefined') return back
  back = document.createElement('canvas')
  back.width = CELL_W
  back.height = CELL_H
  const b = back.getContext('2d')
  b.fillStyle = '#fbf7ee'
  b.beginPath(); b.roundRect(0, 0, CELL_W, CELL_H, 10); b.fill()
  b.save()
  b.beginPath(); b.roundRect(8, 8, CELL_W - 16, CELL_H - 16, 6); b.clip()
  b.fillStyle = '#842a2c'
  b.fillRect(0, 0, CELL_W, CELL_H)
  b.strokeStyle = '#b4413f'
  b.lineWidth = 4
  for (let k = -CELL_H; k < CELL_W + CELL_H; k += 11) {
    b.beginPath(); b.moveTo(k, 0); b.lineTo(k + CELL_H, CELL_H); b.stroke()
  }
  b.restore()
  return back
}

// Draws a card centred on (x, y). `flip` in 0..1 turns it over (back -> face).
export function drawCard (ctx, card, x, y, w, h, { rot = 0, alpha = 1, flip = 1, glow = 0, tint = 0, shadow = 1 } = {}) {
  if (alpha <= 0) return
  const showFace = card && flip >= 0.5
  const sx = Math.max(0.02, Math.abs(Math.cos(Math.PI * flip)))
  ctx.save()
  ctx.globalAlpha *= alpha
  ctx.translate(x, y)
  ctx.rotate(rot)
  ctx.scale(sx, 1)
  ctx.shadowColor = glow > 0 ? `rgba(240, 207, 143, ${0.9 * glow})` : `rgba(0, 0, 0, ${0.35 * shadow})`
  ctx.shadowBlur = glow > 0 ? 22 * glow : 6 * shadow
  ctx.shadowOffsetY = glow > 0 ? 0 : 2 * shadow
  ctx.fillStyle = '#fbf7ee'
  ctx.beginPath(); ctx.roundRect(-w / 2, -h / 2, w, h, w * 0.08); ctx.fill()
  ctx.shadowColor = 'transparent'
  if (showFace) {
    if (atlas && atlas.complete && atlas.naturalWidth) {
      const col = RANKS.indexOf(card.r)
      const row = SUITS.indexOf(card.s)
      ctx.drawImage(atlas, col * CELL_W, row * CELL_H, CELL_W, CELL_H, -w / 2, -h / 2, w, h)
    } else {
      ctx.fillStyle = card.s === 'H' || card.s === 'D' ? '#c0302b' : '#1b1b1b'
      ctx.font = `bold ${w * 0.32}px Georgia, serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(card.r + GLYPH[card.s], 0, 0)
    }
    if (tint > 0) {
      // Teal wash marks a sampled (hypothetical) card rather than a known one.
      ctx.fillStyle = `rgba(113, 203, 166, ${0.22 * tint})`
      ctx.beginPath(); ctx.roundRect(-w / 2, -h / 2, w, h, w * 0.08); ctx.fill()
    }
  } else {
    const img = cardBack()
    if (img) ctx.drawImage(img, -w / 2, -h / 2, w, h)
  }
  if (glow > 0) {
    ctx.strokeStyle = `rgba(240, 207, 143, ${glow})`
    ctx.lineWidth = 2.5
    ctx.beginPath(); ctx.roundRect(-w / 2, -h / 2, w, h, w * 0.08); ctx.stroke()
  }
  ctx.restore()
}

export function text (ctx, str, x, y, { size = 12, color = '#f6e8c9', align = 'left', weight = 600, alpha = 1, font = 'system-ui, sans-serif', spacing = 0 } = {}) {
  if (alpha <= 0) return
  ctx.save()
  ctx.globalAlpha *= alpha
  ctx.fillStyle = color
  ctx.font = `${weight} ${size}px ${font}`
  ctx.textAlign = align
  ctx.textBaseline = 'alphabetic'
  if (spacing && 'letterSpacing' in ctx) ctx.letterSpacing = `${spacing}px`
  ctx.fillText(str, x, y)
  ctx.restore()
}
