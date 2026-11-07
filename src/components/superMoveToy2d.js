// A 2D (side-view) version of Super-Move's packer, small enough to animate and follow by eye.
// Same rules as the real one (src/utils/packing.js), with the depth axis dropped:
//   - load order: heaviest stack level first; closed-top floor pieces late; plants last
//   - stack level 0 items ride the floor; anything else may rest on the floor, or on open-topped
//     items at the same or a lower stack level
//   - at least 70% of its base must be supported
//   - among legal spots: furthest back (lowest x), then lowest, then the orientation bias
// Layout score mirrors layoutScore's main terms (trapped air, jagged skyline, weight towards the
// doors, stack height). Lower is better.

// One cell ≈ 20 cm, so the truck is 2.4 m tall. Item sizes follow the proportions of Super-Move's
// side-view images (`img`, Kenney Furniture Kit, CC0) so the pictures aren't distorted.
export const TRUCK = { L: 38, H: 12 }

const BOX = (n) => ({ id: `box${n}`, name: 'Box', img: 'cardboardBoxClosed', w: 2, h: 2, level: 7, open: true, kind: 'box' })
const CHAIR = (n) => ({ id: `chair${n}`, name: 'Chair', img: 'chair', w: 2, h: 4, level: 8, open: false, kind: 'chair' })

export const ITEMS = [
  { id: 'fridge', name: 'Fridge', img: 'kitchenFridgeLarge', w: 5, h: 8, level: 0, open: true, kind: 'heavy' },
  { id: 'washer', name: 'Washer', img: 'washer', w: 4, h: 4, level: 0, open: true, kind: 'heavy' },
  { id: 'bed', name: 'Bed', img: 'bedDouble', w: 12, h: 3, level: 0, open: true, rot: true, kind: 'heavy' },
  { id: 'wardrobe', name: 'Wardrobe', img: 'bookcaseClosed', w: 4, h: 7, level: 0, open: false, kind: 'closed' },
  { id: 'drawers', name: 'Drawers', img: 'cabinetBedDrawer', w: 3, h: 2, level: 2, open: true, kind: 'mid' },
  { id: 'bookcase', name: 'Bookcase', img: 'bookcaseOpen', w: 4, h: 7, level: 2, open: true, rot: true, kind: 'mid' },
  { id: 'table', name: 'Table', img: 'table', w: 7, h: 3, level: 5, open: true, rot: true, kind: 'mid' },
  { id: 'tv', name: 'TV unit', img: 'cabinetTelevision', w: 6, h: 3, level: 5, open: true, kind: 'mid' },
  ...Array.from({ length: 16 }, (_, i) => BOX(i + 1)),
  CHAIR(1), CHAIR(2),
  { id: 'plant', name: 'Plant', img: 'pottedPlant', w: 2, h: 5, level: 9, open: false, kind: 'plant' }
]

export const COLORS = { heavy: '#6858e8', closed: '#f59e0b', mid: '#3b82f6', box: '#c9a26b', chair: '#ef6f6c', plant: '#1f8a52' }

// Real packer's loadOrder: plants last, closed-top floor items just before them (tallest first),
// everything else heaviest (lowest stack level) first.
const rank = (it) => (it.kind === 'plant' ? 2 : !it.open && it.level === 0 ? 1 : 0)
export const loadOrder = (a, b) => {
  const ra = rank(a); const rb = rank(b)
  if (ra !== rb) return ra - rb
  return ra > 0 ? b.h - a.h : a.level - b.level
}

// Deterministic first ordering (the real packer's first seed): load order, then biggest first.
export const defaultOrder = () => [...ITEMS].sort((a, b) => loadOrder(a, b) || b.w * b.h - a.w * a.h)

// 'TV unit' stays as is; everything else reads as lower case mid-sentence.
const lower = (n) => (/^[A-Z]{2}/.test(n) ? n : n.toLowerCase())

// Lexicographic "a < b": the first differing element decides (as compareScores in the packer).
const lexLess = (a, b) => {
  for (let i = 0; i < a.length; i += 1) if (a[i] !== b[i]) return a[i] < b[i]
  return false
}

const orientations = (it) => (it.rot ? [{ w: it.w, h: it.h }, { w: it.h, h: it.w }] : [{ w: it.w, h: it.h }])
const biasKey = (o, bias) => (bias === 'tall' ? -o.h : bias === 'flat' ? o.h : 0)

// Pack an ordering. Returns the placements plus, for each item, every candidate spot it weighed
// (with the reason it was rejected), so the placement step can be replayed.
export const pack = (order, bias = null, { trace = false } = {}) => {
  const { L, H } = TRUCK
  const top = new Array(L).fill(0)
  const owner = Array.from({ length: L }, () => new Array(H).fill(-1))
  const placed = []
  const steps = []
  const unplaced = []

  for (const item of order) {
    const anchors = new Set([0])
    for (const p of placed) { anchors.add(p.x); anchors.add(p.x + p.w) }
    const candidates = []
    let best = null
    for (const x of [...anchors].sort((a, b) => a - b)) {
      for (const o of orientations(item)) {
        if (x + o.w > L) continue
        let z = 0
        for (let c = x; c < x + o.w; c += 1) z = Math.max(z, top[c])
        const cand = { x, z, w: o.w, h: o.h, legal: true, rule: '', reason: '' }
        const name = lower(item.name)
        if (z + o.h > H) {
          cand.legal = false
          cand.rule = 'Too tall'
          cand.reason = `Stacked here, the ${name} would stick out above the ${(H * 0.2).toFixed(1)} m roof.`
        } else if (z > 0 && item.level === 0) {
          // Real packer: level 0 is heavy base items (fridges, beds, washers) that ride the floor.
          cand.legal = false
          cand.rule = 'Floor only'
          cand.reason = `The ${name} is stack level 0, a heavy item that must go on the floor.`
        } else if (z > 0) {
          let contact = 0
          for (let c = x; c < x + o.w && cand.legal; c += 1) {
            if (top[c] !== z) continue
            contact += 1
            const below = placed[owner[c][z - 1]]
            const bname = lower(below.name)
            if (!below.open) {
              cand.legal = false
              cand.rule = 'Closed top'
              // The closed-top item it would rest on, so the view can hatch the top of it.
              cand.onto = { id: below.id, x: below.x, w: below.w, top: below.z + below.h }
              cand.reason = `It would sit on the ${bname}, which has a closed top, so nothing can be stacked on it.`
            } else if (below.level > item.level) {
              cand.legal = false
              cand.rule = 'Too heavy'
              cand.reason = `The ${name} (stack level ${item.level}) is heavier than the ${bname} (level ${below.level}) it would sit on.`
            }
          }
          if (cand.legal && contact < o.w * 0.7) {
            cand.legal = false
            cand.rule = 'Not supported'
            cand.reason = `Only ${Math.round((contact / o.w) * 100)}% of the ${name}'s base would rest on something. It needs at least 70%.`
          }
        }
        candidates.push(cand)
        if (!cand.legal) continue
        const key = [x, z, biasKey(o, bias), x + o.w]
        if (!best || lexLess(key, best.key)) best = { ...cand, key }
      }
    }
    if (!best) {
      unplaced.push(item)
      if (trace) steps.push({ item, candidates, chosen: null })
      continue
    }
    const p = { ...item, x: best.x, z: best.z, w: best.w, h: best.h }
    const idx = placed.length
    placed.push(p)
    for (let c = p.x; c < p.x + p.w; c += 1) {
      for (let k = p.z; k < p.z + p.h; k += 1) owner[c][k] = idx
      top[c] = p.z + p.h
    }
    if (trace) {
      for (const c of candidates) c.chosen = c.legal && c.x === best.x && c.z === best.z && c.w === best.w
      steps.push({ item, candidates, chosen: p })
    }
  }

  return { placed, unplaced, steps, top, score: scoreLayout(placed, top, unplaced.length) }
}

export const scoreLayout = (placed, top, unplacedCount = 0) => {
  const { L, H } = TRUCK
  let occupied = 0; let back = 0; let under = 0
  for (const p of placed) {
    occupied += p.w * p.h
    for (let c = p.x; c < p.x + p.w; c += 1) back += (c / (L - 1)) * p.h
  }
  for (let c = 0; c < L; c += 1) under += top[c]
  const trapped = (under - occupied) / (L * H)
  let rough = 0
  for (let c = 0; c + 1 < L; c += 1) rough += Math.abs(top[c] - top[c + 1])
  const roughNorm = rough / ((L - 1) * H)
  const cols = top.filter((t) => t > 0)
  const height = cols.length ? cols.reduce((s, t) => s + t, 0) / (cols.length * H) : 0
  const backMean = occupied ? back / occupied : 0
  return 8 * trapped + 3 * roughNorm + 2 * backMean - 2 * height + unplacedCount
}

// Seedable PRNG (mulberry32, as in the real packer) so the GA animation is reproducible.
export const mulberry32 = (seed) => () => {
  seed |= 0
  seed = (seed + 0x6d2b79f5) | 0
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

// Random-key genetic algorithm, as in the real searchBestLayout: a genome is one key per item plus
// an orientation bias. It decodes by sorting on (load order, key), so heavy-first is always kept and
// the search only reorders items within the same weight class.
const BIASES = [null, 'flat', 'tall']
export const decode = (g) => {
  const order = ITEMS.map((it, i) => ({ it, k: g.keys[i] }))
    .sort((a, b) => loadOrder(a.it, b.it) || a.k - b.k)
    .map((x) => x.it)
  return pack(order, g.bias)
}

// Defaults are tuned for the explorer animation: a random first generation (the real packer
// warm-starts from its structured orderings, but here that's already near-optimal and leaves the
// tree nothing to show) and a seed whose run improves visibly over 7 generations.
export const createGA = (seed = 244, { pop = 8, elite = 2, mutants = 1, rho = 0.7, warmStart = false } = {}) => {
  const rng = mulberry32(seed)
  let nextId = 0
  // Each candidate keeps a stable id (survivors carry theirs), so the UI can animate them moving.
  const evaluate = (g) => { const r = decode(g); return { ...g, id: nextId++, result: r, score: r.score } }
  const randomGenome = (origin = 'random') =>
    evaluate({ keys: ITEMS.map(() => rng()), bias: BIASES[Math.floor(rng() * BIASES.length)], origin })

  // Warm start, like the real packer: the default ordering is one of the first candidates.
  const order = defaultOrder()
  const warm = evaluate({ keys: ITEMS.map((it) => (order.indexOf(it) + 0.5) / ITEMS.length), bias: null, origin: 'start' })
  let population = warmStart
    ? [warm, ...Array.from({ length: pop - 1 }, () => randomGenome('start'))]
    : Array.from({ length: pop }, () => randomGenome('start'))
  population.sort((a, b) => a.score - b.score)
  let generation = 0

  const step = () => {
    // `parents` records lineage for the tree view: survivors descend from themselves, children from
    // an elite and a non-elite parent, random newcomers from nobody.
    const elites = population.slice(0, elite).map((g) => ({ ...g, origin: 'kept', parents: [g.id] }))
    const next = [...elites]
    for (let m = 0; m < mutants; m += 1) next.push({ ...randomGenome('random'), parents: [] })
    while (next.length < pop) {
      const a = elites[Math.floor(rng() * elites.length)]
      const b = population[elite + Math.floor(rng() * (pop - elite))]
      const keys = a.keys.map((k, i) => (rng() < rho ? k : b.keys[i]))
      next.push(evaluate({ keys, bias: rng() < rho ? a.bias : b.bias, origin: 'child', parents: [a.id, b.id] }))
    }
    next.sort((x, y) => x.score - y.score)
    population = next
    generation += 1
    return population
  }

  return { get population() { return population }, get generation() { return generation }, step }
}
