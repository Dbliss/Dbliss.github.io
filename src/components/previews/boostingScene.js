// Project tile for the esports predictor. It starts as plain colour, grows three decision trees node by
// node, then adds hundreds more. Each tree nudges one match's win chance, and the finish shows the
// predicted winner with the model's confidence (58%, the case study's worked example).

const TREE_COUNT = 400
const PREDICTION = 0.58
const MONO = 'ui-monospace, "SFMono-Regular", "JetBrains Mono", Menlo, Consolas, monospace'
const SANS = 'system-ui, -apple-system, "Segoe UI", sans-serif'

const HOT = '#ff3fa6'
const ICE = '#8fe3ff'
const WHITE = '#ffffff'
const TAU = Math.PI * 2

// Seconds along the loop.
const T = {
  buildFrom: 0.35, // first tree starts growing from its root
  buildGap: 0.42,
  buildFor: 1.15,
  walkFrom: 2.35, // the three trees answer their questions
  walkGap: 0.3,
  walkFor: 0.55,
  barIn: 2.05,
  morphFrom: 3.7,
  morphTo: 4.5,
  growFrom: 4.2, // the rest of the forest arrives
  growSpread: 2.4,
  growFor: 0.35,
  fieldWalkFrom: 4.3,
  fieldWalkFor: 0.45,
  sweepFrom: 6.9,
  sweepTo: 7.9,
  votesFrom: 7.9, // every tree's output flies in
  barOut: 7.95,
  dimFrom: 8,
  dimTo: 8.7,
  verdictIn: 8.35,
  verdictOut: 10.9,
  shrinkFrom: 10.9, // everything clears back to plain colour
  shrinkSpread: 0.7,
  shrinkFor: 0.3,
  period: 12.5
}

const clamp = (v) => Math.min(1, Math.max(0, v))
const lerp = (a, b, t) => a + (b - a) * t
const seg = (t, a, b) => clamp((t - a) / (b - a))
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
const easeOut = (t) => 1 - Math.pow(1 - t, 3)
const sigmoid = (v) => 1 / (1 + Math.exp(-v))

// Each tree's leaf, and how far it moves the score. Early trees carry the most, as in boosting,
// and the running total is made to land exactly on the prediction.
const TREES = (() => {
  let a = 9091
  const r = () => {
    a = (a * 1664525 + 1013904223) >>> 0
    return a / 4294967296
  }
  const trees = Array.from({ length: TREE_COUNT }, (_, i) => {
    const up = r() > 0.42
    return { leaf: Math.floor(r() * 8), up, value: (up ? 1 : -1) * (0.015 + 0.13 * Math.exp(-i / 55)) }
  })
  const target = Math.log(PREDICTION / (1 - PREDICTION))
  const correction = (target - trees.reduce((sum, tree) => sum + tree.value, 0)) / TREE_COUNT
  let total = 0
  trees.forEach((tree) => {
    total += tree.value + correction
    tree.total = total
  })
  return trees
})()

let cachedKey = ''
let cachedSlots = []

// Grid cells for every tree, nearest the centre first, so the forest grows outwards.
function slotsFor (W, H) {
  const key = `${W}x${H}`
  if (key === cachedKey) return cachedSlots
  const left = W * 0.04
  const top = H * 0.2
  const areaW = W * 0.92
  const areaH = H * 0.76
  const cols = Math.ceil(Math.sqrt(TREE_COUNT * (areaW / areaH) * 1.05))
  const rows = Math.ceil(TREE_COUNT / cols)
  const cellW = areaW / cols
  const cellH = areaH / rows
  const cells = []
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      cells.push({
        cx: left + (col + 0.5) * cellW,
        top: top + row * cellH + cellH * 0.14,
        w: cellW * 0.74,
        h: cellH * 0.66
      })
    }
  }
  const centerY = top + areaH / 2
  const dist = (c) => Math.hypot(c.cx - W / 2, c.top + c.h / 2 - centerY)
  cells.sort((p, q) => dist(p) - dist(q))
  cachedSlots = cells.slice(0, TREE_COUNT)
  cachedKey = key
  return cachedSlots
}

const nodeX = (r, level, index) => r.cx - r.w / 2 + (index + 0.5) * r.w / (1 << level)
const nodeY = (r, level) => r.top + (level * r.h) / 3

function addEdges (path, r) {
  for (let level = 0; level < 3; level++) {
    for (let index = 0; index < 1 << level; index++) {
      for (let child = 0; child < 2; child++) {
        path.moveTo(nodeX(r, level, index), nodeY(r, level))
        path.lineTo(nodeX(r, level + 1, index * 2 + child), nodeY(r, level + 1))
      }
    }
  }
}

// `built` runs 0..3.4: each level's nodes pop in, then its branches reach down to the next level.
function addGrowingEdges (path, r, built) {
  for (let level = 0; level < 3; level++) {
    const reach = clamp((built - level - 0.3) / 0.7)
    if (reach <= 0) continue
    for (let index = 0; index < 1 << level; index++) {
      for (let child = 0; child < 2; child++) {
        const x0 = nodeX(r, level, index)
        const y0 = nodeY(r, level)
        path.moveTo(x0, y0)
        path.lineTo(lerp(x0, nodeX(r, level + 1, index * 2 + child), reach), lerp(y0, nodeY(r, level + 1), reach))
      }
    }
  }
}

// Trace a tree's route to its leaf. `walked` runs 0..3, one unit per level.
function addRoute (path, r, leaf, walked) {
  for (let level = 0; level < 3 && walked > level; level++) {
    const amount = Math.min(1, walked - level)
    const x0 = nodeX(r, level, leaf >> (3 - level))
    const y0 = nodeY(r, level)
    path.moveTo(x0, y0)
    path.lineTo(lerp(x0, nodeX(r, level + 1, leaf >> (2 - level)), amount), lerp(y0, nodeY(r, level + 1), amount))
  }
}

function drawOdds (ctx, W, unit, chance, alpha) {
  if (alpha <= 0) return
  const left = 20
  const right = W - 20
  const y = 74
  const height = Math.max(4, 6 * unit)
  const split = lerp(left, right, chance)

  ctx.globalAlpha = alpha
  ctx.fillStyle = HOT
  ctx.fillRect(left, y, split - left, height)
  ctx.fillStyle = ICE
  ctx.fillRect(split, y, right - split, height)

  ctx.font = `600 ${Math.round(12 * unit)}px ${MONO}`
  ctx.textBaseline = 'alphabetic'
  ctx.fillStyle = WHITE
  ctx.textAlign = 'left'
  ctx.fillText(`TEAM 1  ${(chance * 100).toFixed(1)}%`, left, y - 8)
  ctx.textAlign = 'right'
  ctx.fillText(`${((1 - chance) * 100).toFixed(1)}%  TEAM 2`, right, y - 8)
  ctx.globalAlpha = 1
}

// The finish: a gauge that fills to the model's confidence, with the predicted winner beneath it.
function drawVerdict (ctx, W, centerY, radius, unit, alpha, fill) {
  if (alpha <= 0) return
  const centerX = W / 2
  const start = -Math.PI / 2

  ctx.globalAlpha = alpha
  ctx.lineCap = 'round'
  ctx.lineWidth = Math.max(5, 8 * unit)
  ctx.strokeStyle = 'rgba(255, 255, 255, .16)'
  ctx.beginPath()
  ctx.arc(centerX, centerY, radius, 0, TAU)
  ctx.stroke()
  ctx.strokeStyle = HOT
  ctx.beginPath()
  ctx.arc(centerX, centerY, radius, start, start + TAU * PREDICTION * fill)
  ctx.stroke()

  ctx.fillStyle = WHITE
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.font = `700 ${Math.round(radius * 0.68)}px ${SANS}`
  ctx.fillText(`${Math.round(PREDICTION * 100 * fill)}%`, centerX, centerY - radius * 0.07)
  ctx.font = `600 ${Math.round(10.5 * unit)}px ${MONO}`
  ctx.globalAlpha = alpha * 0.75
  ctx.fillText('CONFIDENCE', centerX, centerY + radius * 0.42)
  ctx.globalAlpha = alpha
  ctx.font = `650 ${Math.round(18 * unit)}px ${SANS}`
  ctx.fillText('Team 1 to win', centerX, centerY + radius + 30 * unit)
  ctx.globalAlpha = 1
}

export function drawBoosting (ctx, W, H, time) {
  const t = time % T.period
  const unit = Math.min(1.4, Math.max(0.6, Math.min(W, H) / 480))

  const bg = ctx.createRadialGradient(W / 2, H * 0.52, 0, W / 2, H * 0.52, Math.max(W, H) * 0.72)
  bg.addColorStop(0, '#4316d0')
  bg.addColorStop(0.45, '#1d0a68')
  bg.addColorStop(1, '#07031c')
  ctx.globalAlpha = 1
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, W, H)

  const slots = slotsFor(W, H)
  const morph = ease(seg(t, T.morphFrom, T.morphTo))
  const sweepFront = t > T.sweepFrom && t < T.sweepTo ? seg(t, T.sweepFrom, T.sweepTo) : -1
  const dim = 1 - 0.9 * ease(seg(t, T.dimFrom, T.dimTo))
  const shrinkAt = (rank) => 1 - ease(seg(
    t,
    T.shrinkFrom + (1 - rank) * T.shrinkSpread,
    T.shrinkFrom + (1 - rank) * T.shrinkSpread + T.shrinkFor
  ))

  const verdictCenterY = H * 0.34
  const verdictRadius = Math.min(W, H) * 0.2

  const edges = new Path2D()
  const routes = [new Path2D(), new Path2D()]
  const staticLeaves = [new Path2D(), new Path2D()]
  const sweep = new Path2D()
  const votes = []
  let walkedCount = 0

  for (let k = 0; k < 3; k++) {
    if (t >= T.walkFrom + k * T.walkGap + T.walkFor) walkedCount = k + 1
  }

  for (let i = 3; i < TREE_COUNT; i++) {
    const rank = i / (TREE_COUNT - 1)
    const walkStart = T.fieldWalkFrom + rank * T.growSpread
    if (t >= walkStart + T.fieldWalkFor) walkedCount = i + 1
    const growStart = T.growFrom + rank * T.growSpread
    const grow = easeOut(seg(t, growStart, growStart + T.growFor)) * shrinkAt(rank)
    if (grow <= 0) continue

    const slot = slots[i]
    const h = slot.h * grow
    const r = { cx: slot.cx, top: slot.top + (slot.h - h) / 2, w: slot.w * grow, h }
    const tree = TREES[i]
    addEdges(edges, r)
    const walked = seg(t, walkStart, walkStart + T.fieldWalkFor) * 3
    addRoute(routes[tree.up ? 0 : 1], r, tree.leaf, walked)
    if (sweepFront >= 0 && Math.abs(rank - sweepFront) < 0.05) addRoute(sweep, r, tree.leaf, walked)
    if (walked >= 3) {
      const x = nodeX(r, 3, tree.leaf)
      const y = nodeY(r, 3)
      if (t < T.votesFrom) {
        const path = staticLeaves[tree.up ? 0 : 1]
        path.moveTo(x + 1.3 * unit, y)
        path.arc(x, y, 1.3 * unit, 0, TAU)
      } else if (t < T.votesFrom + 1) {
        votes.push({ x, y, up: tree.up, rank })
      }
    }
  }

  ctx.lineCap = 'round'
  ctx.globalAlpha = dim
  ctx.strokeStyle = 'rgba(186, 164, 255, .34)'
  ctx.lineWidth = 0.7
  ctx.stroke(edges)
  ;[HOT, ICE].forEach((color, index) => {
    ctx.strokeStyle = color
    ctx.lineWidth = 1.1 * unit
    ctx.stroke(routes[index])
    ctx.fillStyle = color
    ctx.fill(staticLeaves[index])
  })
  ctx.strokeStyle = WHITE
  ctx.lineWidth = 1.5 * unit
  ctx.stroke(sweep)
  ctx.globalAlpha = 1

  // The first three trees: grown from their roots, large, then dropped into the field.
  for (let k = 0; k < 3; k++) {
    const buildStart = T.buildFrom + k * T.buildGap
    const built = seg(t, buildStart, buildStart + T.buildFor) * 3.4
    const size = shrinkAt(k / (TREE_COUNT - 1))
    if (built <= 0 || size <= 0) continue

    const big = { cx: W * (0.5 + (k - 1) * 0.3), top: H * 0.27, w: W * 0.26, h: H * 0.36 }
    const slot = slots[k]
    const placed = {
      cx: lerp(big.cx, slot.cx, morph),
      top: lerp(big.top, slot.top, morph),
      w: lerp(big.w, slot.w, morph),
      h: lerp(big.h, slot.h, morph)
    }
    const h = placed.h * size
    const r = { cx: placed.cx, top: placed.top + (placed.h - h) / 2, w: placed.w * size, h }
    const tree = TREES[k]
    const color = tree.up ? HOT : ICE

    const treeEdges = new Path2D()
    addGrowingEdges(treeEdges, r, built)
    ctx.globalAlpha = dim
    ctx.strokeStyle = 'rgba(208, 192, 255, .5)'
    ctx.lineWidth = lerp(1.3 * unit, 0.7, morph)
    ctx.stroke(treeEdges)

    const nodeR = lerp(3.6 * unit, 0, morph)
    if (nodeR > 0.3) {
      ctx.fillStyle = 'rgba(232, 224, 255, .9)'
      for (let level = 0; level <= 3; level++) {
        const pop = easeOut(clamp((built - level) / 0.35))
        if (pop <= 0) continue
        for (let index = 0; index < 1 << level; index++) {
          ctx.beginPath()
          ctx.arc(nodeX(r, level, index), nodeY(r, level), nodeR * pop, 0, TAU)
          ctx.fill()
        }
      }
    }

    const walkStart = T.walkFrom + k * T.walkGap
    const walked = seg(t, walkStart, walkStart + T.walkFor) * 3
    const route = new Path2D()
    addRoute(route, r, tree.leaf, walked)
    ctx.strokeStyle = color
    ctx.lineWidth = lerp(3.2 * unit, 1.1 * unit, morph)
    ctx.stroke(route)
    if (walked >= 3) {
      ctx.fillStyle = color
      ctx.beginPath()
      ctx.arc(nodeX(r, 3, tree.leaf), nodeY(r, 3), lerp(5.5 * unit, 1.3 * unit, morph) * size, 0, TAU)
      ctx.fill()
    }
    ctx.globalAlpha = 1
  }

  // Every tree's output flies in and becomes the prediction.
  const centerX = W / 2
  for (const vote of votes) {
    const start = T.votesFrom + vote.rank * 0.35
    const f = ease(seg(t, start, start + 0.55))
    if (f >= 1) continue
    ctx.fillStyle = vote.up ? HOT : ICE
    ctx.beginPath()
    ctx.arc(lerp(vote.x, centerX, f), lerp(vote.y, verdictCenterY, f), 1.6 * unit, 0, TAU)
    ctx.fill()
  }

  const chance = walkedCount ? sigmoid(TREES[walkedCount - 1].total) : 0.5
  const barAlpha = ease(seg(t, T.barIn, T.barIn + 0.3)) * (1 - ease(seg(t, T.barOut, T.barOut + 0.45)))
  drawOdds(ctx, W, unit, chance, barAlpha)

  const verdictAlpha = ease(seg(t, T.verdictIn, T.verdictIn + 0.5)) * (1 - ease(seg(t, T.verdictOut, T.verdictOut + 0.5)))
  drawVerdict(ctx, W, verdictCenterY, verdictRadius, unit, verdictAlpha, easeOut(seg(t, T.verdictIn, T.verdictIn + 1.1)))
}
