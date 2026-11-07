<template>
  <div class="ax">
    <!-- Stepper -->
    <div class="ax-steps" role="tablist" aria-label="Packing algorithm steps" :style="{ '--n': steps.length, '--i': active }">
      <button
        v-for="(s, i) in steps"
        :key="s.key"
        type="button"
        role="tab"
        class="ax-step"
        :class="{ active: i === active, done: i < active }"
        :aria-selected="i === active"
        @click="active = i"
      >
        <span class="ax-step-num">{{ String(i + 1).padStart(2, '0') }}</span>
        <span class="ax-step-title">{{ s.short }}</span>
      </button>
      <span class="ax-track" aria-hidden="true"><span class="ax-indicator" /></span>
    </div>

    <div class="ax-panel" role="tabpanel">
      <div class="ax-head">
        <div class="ax-head-row">
          <h3>{{ steps[active].title }}</h3>
          <div class="ax-arrows">
            <button type="button" class="ax-arrow" :disabled="active === 0" aria-label="Previous step" @click="active -= 1">
              <svg viewBox="0 0 24 24"><path d="M15 6l-6 6 6 6" /></svg>
            </button>
            <button type="button" class="ax-arrow" :disabled="active === steps.length - 1" aria-label="Next step" @click="active += 1">
              <svg viewBox="0 0 24 24"><path d="M9 6l6 6-6 6" /></svg>
            </button>
          </div>
        </div>
        <p>{{ steps[active].body }}</p>
      </div>

      <!-- 1 · Describe every item -->
      <div v-if="active === 0" class="ax-vis">
        <div class="ax-item">
          <div class="ax-preview">
            <SuperMoveItemPreview :entries="sampleItems" :index="itemIdx" />
            <div class="ax-preview-name">{{ picked.name }}</div>
            <div class="ax-cycle" aria-hidden="true">
              <span v-for="(it, i) in sampleItems" :key="it.asset" :class="{ on: i === itemIdx }" />
            </div>
          </div>
          <dl class="ax-rules">
            <div>
              <dt>Stack level</dt>
              <dd>
                <span class="ax-level">
                  <span v-for="n in 11" :key="n" :class="{ on: n - 1 === picked.stackLevel }">{{ n - 1 }}</span>
                </span>
                <small>{{ picked.stackLevel === 0 ? 'Floor only' : `Stack level ${picked.stackLevel}` }}</small>
              </dd>
            </div>
            <div>
              <dt>Open top</dt>
              <dd><span class="ax-pill" :class="picked.openTop ? 'yes' : 'no'">{{ picked.openTop ? 'Yes, can be stacked on' : 'No, nothing goes on top' }}</span></dd>
            </div>
            <div>
              <dt>Poses</dt>
              <dd class="ax-pills">
                <span v-for="f in ['flat', 'end', 'side']" :key="f" class="ax-pill" :class="(picked.flips || ['flat']).includes(f) ? 'yes' : 'off'">{{ POSE[f] }}</span>
              </dd>
            </div>
            <div>
              <dt>Hitbox</dt>
              <dd>{{ picked.boxes.length === 1 ? 'Single box' : `${picked.boxes.length} boxes (composite)` }} · {{ extent(picked).join(' × ') }} cm</dd>
            </div>
          </dl>
        </div>
      </div>

      <!-- 2 · Where does each item go (2D) -->
      <div v-else-if="active === 1" class="ax-vis">
        <svg class="ax-side" :viewBox="sv.viewBox" aria-label="Side view of a truck being loaded one item at a time">
          <!-- truck -->
          <rect :x="sv.box.x" :y="sv.box.y" :width="sv.box.w" :height="sv.box.h" class="ax-cargo" />
          <text :x="sv.box.x + 6" :y="sv.box.y + sv.box.h + 16" class="ax-axis">← Front of truck</text>
          <text :x="sv.box.x + sv.box.w - 6" :y="sv.box.y + sv.box.h + 16" class="ax-axis" text-anchor="end">Doors →</text>

          <!-- items already loaded, drawn with the app's own side-view images -->
          <image v-for="p in loadedSoFar" :key="p.key" v-bind="imgFor(p, U, sv.box.x, floorY)" preserveAspectRatio="none" />

          <!-- the spots it weighed for the current item -->
          <defs>
            <pattern id="ax-hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <rect width="8" height="8" fill="rgba(194, 69, 61, .08)" />
              <line x1="0" y1="0" x2="0" y2="8" stroke="#c2453d" stroke-width="2.5" />
            </pattern>
          </defs>
          <template v-if="cur && phase === 'scan'">
            <!-- closed tops: red // hatching on top of the item that can't be stacked on -->
            <g v-for="c in shownCandidates.filter((k) => k.onto)" :key="`h${c.onto.id}`" class="ax-closed">
              <rect :x="X(c.onto.x)" :y="Y(c.onto.top + HATCH)" :width="c.onto.w * U" :height="HATCH * U" fill="url(#ax-hatch)" />
              <line :x1="X(c.onto.x)" :x2="X(c.onto.x + c.onto.w)" :y1="Y(c.onto.top)" :y2="Y(c.onto.top)" class="ax-closed-edge" />
              <circle :cx="X(c.onto.x + c.onto.w / 2)" :cy="Y(c.onto.top + HATCH / 2)" r="10" class="ax-badge" />
              <text :x="X(c.onto.x + c.onto.w / 2)" :y="Y(c.onto.top + HATCH / 2) + 4" text-anchor="middle" class="ax-badge-n">{{ c.n }}</text>
            </g>
            <!-- every other spot as an outline -->
            <g v-for="(c, i) in shownCandidates.filter((k) => !k.onto)" :key="i" :class="['ax-cand', c.chosen ? 'chosen' : c.legal ? 'legal' : 'bad']">
              <rect :x="X(c.x)" :y="Y(c.z + c.h)" :width="c.w * U" :height="c.h * U" rx="3" />
              <template v-if="c.n">
                <circle :cx="X(c.x) + (c.w * U) / 2" :cy="Y(c.z + c.h / 2)" r="10" class="ax-badge" />
                <text :x="X(c.x) + (c.w * U) / 2" :y="Y(c.z + c.h / 2) + 4" text-anchor="middle" class="ax-badge-n">{{ c.n }}</text>
              </template>
              <text v-if="c.chosen" :x="X(c.x) + (c.w * U) / 2" :y="Y(c.z + c.h) - 6" text-anchor="middle" class="ax-chosen-label">✓ here</text>
            </g>
          </template>

          <!-- current item dropping in -->
          <g
            v-if="cur && cur.chosen && phase === 'drop'"
            class="ax-drop"
            :style="{ transform: `translateY(${dropOffset}px)` }"
          >
            <image v-bind="imgFor(cur.chosen, U, sv.box.x, floorY)" preserveAspectRatio="none" />
          </g>
        </svg>

        <div class="ax-now">
          <template v-if="cur">
            <div class="ax-now-item">
              <img :src="imgUrl(cur.item.img)" alt="" class="ax-now-img" />
              <b>{{ cur.item.name }}</b>
              <span>stack level {{ cur.item.level }} · {{ cur.item.open ? 'open top' : 'closed top' }}</span>
            </div>
            <div class="ax-now-why">
              <template v-if="numbered.length">
                These spots further towards the front of the truck break a rule:
              </template>
              <template v-else>Nothing further towards the front of the truck is in the way, so it goes straight in.</template>
            </div>
            <ol class="ax-why-list">
              <li v-for="r in numbered" :key="r.reason">
                <span class="ax-why-n">{{ r.nums.join(', ') }}</span>
                <span><b>{{ r.rule }}.</b> {{ r.reason }}</span>
              </li>
            </ol>
            <div v-if="cur.chosen" class="ax-now-pick">
              <span class="ax-why-n ok">✓</span>
              It takes the first legal spot: as close to the front of the truck as possible, then as low as possible.
            </div>
          </template>
        </div>

        <div class="ax-legend">
          <span><i class="lg chosen" />Chosen spot</span>
          <span><i class="lg legal" />Legal, but nearer the doors</span>
          <span><i class="lg bad" />Breaks a rule</span>
          <span><i class="lg closed" />Closed top: nothing can go on it</span>
          <span class="ax-legend-note">A simplified 2D version of the same rules.</span>
        </div>
      </div>

      <!-- 3 · Which full load is best: the genetic algorithm as a growing, pruned family tree -->
      <div v-else class="ax-vis">
        <div class="ax-ga">
          <div class="ax-tree-wrap">
            <svg class="ax-tree" :viewBox="`0 0 ${TREE.viewW} ${TREE.viewH}`" preserveAspectRatio="xMinYMin meet" aria-label="Genetic algorithm family tree">
              <g class="ax-tree-pan" :style="{ transform: `translateX(${-treeShift}px)` }">
                <g v-for="(c, g) in cols" :key="`h${g}`">
                  <text :x="TREE.left + g * TREE.colW + TREE.nodeW / 2" y="12" text-anchor="middle" class="ax-gen-label">
                    {{ g === 0 ? 'Start' : `Gen ${g}` }}
                  </text>
                  <text :x="TREE.left + g * TREE.colW + TREE.nodeW / 2" y="25" text-anchor="middle" class="ax-gen-sub">
                    {{ g === 0 ? '8 random guesses' : '2 kept · 5 bred · 1 new' }}
                  </text>
                </g>
                <!-- the top 2 of each generation, the ones copied into the next: boxed where they're picked -->
                <g v-for="(c, g) in cols" :key="`t${g}`" class="ax-top2">
                  <rect
                    :x="TREE.left + g * TREE.colW - 5" :y="TREE.top - 5"
                    :width="TREE.nodeW + 10" :height="TREE.rowH + TREE.nodeH + 10" rx="10"
                  />
                  <text :x="TREE.left + g * TREE.colW - 9" :y="TREE.top + (TREE.rowH + TREE.nodeH) / 2 + 3" text-anchor="end">top 2</text>
                </g>
                <path v-for="e in tree.edges" :key="e.key" :d="e.d" :class="['ax-edge', e.kind, { line: e.line }]" />
                <g v-for="n in tree.nodes" :key="n.key" :class="['ax-node', n.n.origin, { pruned: n.pruned, line: n.line }]">
                  <rect :x="n.x" :y="n.y" :width="TREE.nodeW" :height="TREE.nodeH" rx="7" class="ax-node-box" />
                  <rect :x="n.x" :y="n.y" width="5" :height="TREE.nodeH" rx="2" class="ax-node-stripe" />
                  <text v-if="TAG[n.n.origin]" :x="n.x + 11" :y="n.y + TREE.nodeH / 2 + 3.5" class="ax-node-tag">{{ TAG[n.n.origin] }}</text>
                  <text
                    :x="TAG[n.n.origin] ? n.x + TREE.nodeW - 8 : n.x + TREE.nodeW / 2 + 2"
                    :y="n.y + TREE.nodeH / 2 + 4"
                    :text-anchor="TAG[n.n.origin] ? 'end' : 'middle'"
                    class="ax-node-score"
                  >
                    {{ n.n.result.unplaced.length ? `${n.n.result.unplaced.length} left out` : n.n.score.toFixed(3) }}
                  </text>
                  <text v-if="n.pruned" :x="n.x + TREE.nodeW + 7" :y="n.y + TREE.nodeH / 2 + 4" class="ax-prune-x">✕</text>
                </g>
              </g>
            </svg>
            <div class="ax-tree-legend">
              <span><i class="top2" />Top 2: the best of each generation</span>
              <span><i class="kept" />Kept: those top 2, copied into the next generation</span>
              <span><i class="child" />Bred from two parents</span>
              <span><i class="random" />New: a random load</span>
              <span><i class="pruned" />Pruned: had no children</span>
              <span><i class="line" />Family line of the best load</span>
            </div>
          </div>

          <div class="ax-best">
            <div class="ax-best-label">Best load so far</div>
            <svg v-if="bestNode" :viewBox="`0 0 ${T.L * 8} ${T.H * 8}`" class="ax-best-truck">
              <rect x="0" y="0" :width="T.L * 8" :height="T.H * 8" class="ax-mini-bg" />
              <image v-for="p in bestNode.result.placed" :key="p.id" v-bind="imgFor(p, 8, 0, T.H * 8)" preserveAspectRatio="none" />
            </svg>
            <div class="ax-best-stats">
              <span>Score <b>{{ bestNode ? bestNode.score.toFixed(3) : '' }}</b></span>
              <span>Generation <b>{{ Math.max(0, cols.length - 1) }}</b></span>
            </div>
            <p class="ax-foot">
              Lower scores are better. A load scores worse for trapped air, a jagged top and weight near the doors, and better
              for tall, solid stacks. Each generation keeps the best 2, breeds 5 children from them, and adds 1 random load.
              The real search does this with {{ population }} candidate loads of all {{ demo.itemCount }} items in 3D,
              within {{ demo.source.budgetMs / 1000 }} s.
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import demo from '../assets/super-move/packing-demo.json'
import SuperMoveItemPreview from './SuperMoveItemPreview.vue'
import { ITEMS, TRUCK as T, createGA, defaultOrder, pack } from './superMoveToy2d.js'

// Super-Move's own side-view furniture images (Kenney Furniture Kit, CC0).
const sideImgs = import.meta.glob('../assets/super-move/side/*.png', { query: '?url', import: 'default', eager: true })
const imgUrl = (name) => sideImgs[`../assets/super-move/side/${name}.png`]
const BASE = Object.fromEntries(ITEMS.map((it) => [it.id, it]))
// SVG <image> attributes for a placed 2D item (cells), at `u` px per cell, with the truck's left edge
// at `ox` and floor at `floorY`. An item turned on its side draws its image rotated to match.
const imgFor = (p, u, ox, floorY) => {
  const base = BASE[p.id] || p
  const x = ox + p.x * u
  const y = floorY - (p.z + p.h) * u
  const w = p.w * u
  const h = p.h * u
  if (p.w === base.w && p.h === base.h) return { href: imgUrl(p.img), x, y, width: w, height: h }
  const cx = x + w / 2
  const cy = y + h / 2
  return { href: imgUrl(p.img), x: cx - h / 2, y: cy - w / 2, width: h, height: w, transform: `rotate(-90 ${cx} ${cy})` }
}

const active = ref(0)

const steps = [
  { key: 'items', short: 'Items', title: 'Describe every item',
    body: 'The truck is a grid of 10 cm cubes. Every piece of furniture has a hitbox in those cubes and three hand-tuned rules that decide what it may touch.' },
  { key: 'place', short: 'Placement', title: 'Where does each item go?',
    body: 'Heavy floor items go first. For each item it tries every spot, throws out the ones that break a rule, and takes the legal spot closest to the front of the truck, then the lowest. The load builds in walls from the front to the doors.' },
  { key: 'best', short: 'Best load', title: 'Which full load is best?',
    body: 'Different orderings give different loads that all fit. A genetic algorithm keeps the best ones, breeds new orderings from them, and keeps going until time runs out.' }
]

/* ---------- 1 · items ---------- */
const POSE = { flat: 'Upright', end: 'On its end', side: 'On its side' }
// A spread of stack levels (0 floor-only → 10 lightest), poses and open/closed tops.
const WANT = [
  'kitchenFridgeLarge', 'bedDouble', 'loungeSofaCorner', 'cabinetBedDrawer', 'deskCorner', 'cabinetTelevision',
  'bookcaseOpenLow', 'loungeChair', 'tableCoffee', 'chair', 'kitchenMicrowave', 'boxWardrobe', 'televisionModern', 'pottedPlant'
]
const sampleItems = WANT.map((a) => demo.hitboxes.find((h) => h.asset === a)).filter(Boolean)
const itemIdx = ref(0)
const picked = computed(() => sampleItems[itemIdx.value] || demo.hitboxes[0])
const extent = (h) => {
  let w = 0; let d = 0; let z = 0
  for (const [x, y, zz, bw, bd, bh] of h.boxes) { w = Math.max(w, x + bw); d = Math.max(d, y + bd); z = Math.max(z, zz + bh) }
  return [Math.round(w), Math.round(d), Math.round(z)]
}

/* ---------- 2 · placement (2D replay) ---------- */
const U = 15 // px per 2D cell
const HEAD = 3 // cells of headroom above the roof, for the drop-in animation
const HATCH = 1.4 // cells of red hatching drawn on top of a closed-top item
const sv = (() => {
  const pad = 6
  const box = { x: pad, y: pad + HEAD * U, w: T.L * U, h: T.H * U }
  return {
    viewBox: `0 0 ${box.x + box.w + pad} ${box.y + box.h + 22}`,
    box
  }
})()
const X = (x) => sv.box.x + x * U
const Y = (z) => sv.box.y + (T.H - z) * U
const floorY = sv.box.y + T.H * U

const trace = pack(defaultOrder(), null, { trace: true }).steps.map((s, i) => ({
  ...s,
  chosen: s.chosen ? { ...s.chosen, key: i } : null
}))
const stepIdx = ref(0)
const phase = ref('scan') // 'scan' → show the spots weighed; 'drop' → item falls into place
const dropOffset = ref(-HEAD * U)
const cur = computed(() => trace[stepIdx.value] || null)
const loadedSoFar = computed(() => trace.slice(0, stepIdx.value).map((s) => s.chosen).filter(Boolean))
// The rejected spots nearer the front than the chosen one (they explain why it didn't go further
// forward), numbered 1…n, then the other legal spots, then the chosen one.
const shownCandidates = computed(() => {
  if (!cur.value) return []
  const c = cur.value.candidates
  const limit = cur.value.chosen ? cur.value.chosen.x : Infinity
  // Spots that would poke through the roof are still rejected, but not drawn: they're obviously wrong.
  // Several spots blocked by the same closed-top item collapse to one (it's drawn as hatching on it).
  const seenClosed = new Set()
  const bad = c.filter((k) => !k.legal && k.rule !== 'Too tall' && k.x <= limit)
    .sort((a, b) => a.x - b.x || a.z - b.z)
    .filter((k) => !k.onto || (!seenClosed.has(k.onto.id) && seenClosed.add(k.onto.id)))
    .slice(0, 5)
    .map((k, i) => ({ ...k, n: i + 1 }))
  const legal = c.filter((k) => k.legal && !k.chosen)
  const chosen = c.filter((k) => k.chosen)
  return [...bad, ...legal, ...chosen]
})
// One line per distinct reason, listing the numbered spots it applies to.
const numbered = computed(() => {
  const groups = new Map()
  for (const k of shownCandidates.value) {
    if (!k.n) continue
    if (!groups.has(k.reason)) groups.set(k.reason, { rule: k.rule, reason: k.reason, nums: [] })
    groups.get(k.reason).nums.push(k.n)
  }
  return [...groups.values()]
})

let placeTimer = 0
const SCAN_MS = 770 // base pause per item (30% quicker than the first cut)
const READ_MS = 700 // extra time per reason shown, so the explanations can be read
const DROP_MS = 336
const scanTime = () => SCAN_MS + READ_MS * Math.min(2, numbered.value.length)
const runPlacement = () => {
  clearTimeout(placeTimer)
  const tick = () => {
    if (active.value !== 1) return
    if (phase.value === 'scan') {
      phase.value = 'drop'
      dropOffset.value = -HEAD * U
      requestAnimationFrame(() => requestAnimationFrame(() => { dropOffset.value = 0 }))
      placeTimer = setTimeout(tick, DROP_MS)
    } else {
      if (stepIdx.value + 1 >= trace.length) {
        stepIdx.value = trace.length // show the full load briefly, then start over
        placeTimer = setTimeout(() => { stepIdx.value = 0; phase.value = 'scan'; placeTimer = setTimeout(tick, scanTime()) }, 2600)
        return
      }
      stepIdx.value += 1
      phase.value = 'scan'
      placeTimer = setTimeout(tick, scanTime())
    }
  }
  stepIdx.value = 0
  phase.value = 'scan'
  placeTimer = setTimeout(tick, scanTime())
}

/* ---------- 3 · genetic algorithm (live family tree) ---------- */
const population = Math.max(16, Math.min(48, demo.itemCount))
const GENS = 7
const TREE = { colW: 150, rowH: 38, nodeW: 100, nodeH: 26, top: 36, left: 40, viewW: 760 }
const TAG = { kept: 'KEPT', random: 'NEW' }
TREE.viewH = TREE.top + 8 * TREE.rowH
const cols = ref([]) // one column per generation, nodes sorted best first
const nodePos = (g, r) => ({ x: TREE.left + g * TREE.colW, y: TREE.top + r * TREE.rowH })

const tree = computed(() => {
  const nodes = []
  const edges = []
  const index = cols.value.map((c) => new Map(c.map((n, r) => [n.id, r])))
  cols.value.forEach((col, g) => {
    const next = cols.value[g + 1]
    col.forEach((n, r) => {
      const { x, y } = nodePos(g, r)
      // Pruned = left no descendants in the next generation: that branch ends here.
      const pruned = !!next && !next.some((m) => (m.parents || []).includes(n.id))
      nodes.push({ key: `${g}-${n.id}`, x, y, n, pruned })
      if (g === 0) return
      const parents = n.parents || []
      parents.forEach((pid, pi) => {
        const pr = index[g - 1].get(pid)
        if (pr === undefined) return
        const a = nodePos(g - 1, pr)
        const x1 = a.x + TREE.nodeW; const y1 = a.y + TREE.nodeH / 2
        const x2 = x; const y2 = y + TREE.nodeH / 2
        const mx = (x1 + x2) / 2
        edges.push({
          key: `${g}-${n.id}-${pi}`,
          d: `M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}`,
          kind: n.origin === 'kept' ? 'kept' : pi === 0 ? 'main' : 'second',
          from: `${g - 1}-${pid}`,
          to: `${g}-${n.id}`
        })
      })
      if (!parents.length) {
        edges.push({ key: `${g}-${n.id}-new`, d: `M${x - 34},${y + TREE.nodeH / 2} L${x},${y + TREE.nodeH / 2}`, kind: 'new' })
      }
    })
  })
  // Family line of the current best: follow each node's first (elite) parent back to the start.
  const line = new Set()
  let g = cols.value.length - 1
  let id = cols.value[g]?.[0]?.id
  while (g >= 0 && id !== undefined) {
    line.add(`${g}-${id}`)
    const n = cols.value[g][index[g].get(id)]
    id = n?.parents?.[0]
    g -= 1
  }
  edges.forEach((e) => { e.line = line.has(e.from) && line.has(e.to) })
  nodes.forEach((n) => { n.line = line.has(n.key) })
  return { nodes, edges }
})
// Pan so the newest generation stays in view as the tree grows.
const treeShift = computed(() => {
  const lastRight = TREE.left + (cols.value.length - 1) * TREE.colW + TREE.nodeW + 30
  return Math.max(0, lastRight - TREE.viewW)
})
const bestNode = computed(() => cols.value[cols.value.length - 1]?.[0] || null)

let ga = createGA()
let gaTimer = 0
const runGA = () => {
  clearTimeout(gaTimer)
  const restart = () => {
    ga = createGA()
    cols.value = [ga.population]
  }
  const tick = () => {
    if (active.value !== 2) return
    if (cols.value.length - 1 >= GENS) {
      gaTimer = setTimeout(() => { restart(); gaTimer = setTimeout(tick, 2000) }, 3500)
      return
    }
    cols.value = [...cols.value, ga.step()]
    gaTimer = setTimeout(tick, 2400)
  }
  restart()
  gaTimer = setTimeout(tick, 2000)
}

/* ---------- lifecycle: only the open step animates ---------- */
let cycleTimer = 0
const startStep = (i) => {
  clearInterval(cycleTimer)
  clearTimeout(placeTimer)
  clearTimeout(gaTimer)
  if (i === 0) cycleTimer = setInterval(() => { itemIdx.value = (itemIdx.value + 1) % sampleItems.length }, 3200)
  else if (i === 1) runPlacement()
  else runGA()
}
watch(active, startStep)
onMounted(() => startStep(active.value))
onBeforeUnmount(() => { clearInterval(cycleTimer); clearTimeout(placeTimer); clearTimeout(gaTimer) })
</script>

<style scoped>
.ax { --good: #1f8a52; --bad: #c2453d; --soft: #fbfbff; }

/* stepper: plain tabs over a hairline track with a sliding accent indicator */
.ax-steps {
  position: relative;
  display: grid; grid-template-columns: repeat(var(--n), minmax(0, 1fr));
  padding-bottom: 12px;
}
.ax-step {
  display: flex; flex-direction: column; align-items: flex-start; gap: 2px;
  padding: 4px 8px 4px 0; border: 0; background: none; cursor: pointer; text-align: left;
  font: inherit; color: #a0a5b8; transition: color .2s;
}
.ax-step:hover { color: var(--muted); }
.ax-step-num {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: .72rem; font-weight: 700; letter-spacing: .04em;
}
.ax-step-title { font-size: .88rem; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; }
.ax-step.done { color: var(--muted); }
.ax-step.active { color: var(--ink); }
.ax-step.active .ax-step-num { color: var(--accent); }
.ax-track { position: absolute; left: 0; right: 0; bottom: 0; height: 2px; border-radius: 2px; background: #eceef5; }
.ax-indicator {
  position: absolute; top: 0; bottom: 0; left: 0;
  width: calc(100% / var(--n));
  border-radius: 2px; background: var(--accent);
  transform: translateX(calc(var(--i) * 100%));
  transition: transform .35s cubic-bezier(.2, .8, .2, 1);
}

/* panel */
.ax-panel { margin-top: 20px; }
.ax-head-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 6px; }
.ax-head h3 { margin: 0; font-size: 1.25rem; letter-spacing: -.02em; }
.ax-head p { margin: 0; color: var(--muted); line-height: 1.7; }
.ax-arrows { display: flex; gap: 6px; flex: none; }
.ax-arrow {
  width: 32px; height: 32px; display: grid; place-items: center;
  border: 1px solid var(--line); border-radius: 50%; background: #fff; cursor: pointer; color: var(--ink);
  transition: border-color .2s, color .2s;
}
.ax-arrow:hover:not(:disabled) { border-color: var(--accent); color: var(--accent); }
.ax-arrow:disabled { opacity: .3; cursor: default; }
.ax-arrow svg { width: 16px; height: 16px; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
.ax-vis { margin-top: 16px; min-height: 300px; }
.ax-foot { margin: 8px 0 0; font-size: .8rem; color: var(--muted); line-height: 1.6; }

.ax-pill {
  display: inline-block; padding: 3px 9px; border-radius: 99px; font-size: .76rem; font-weight: 700;
  border: 1px solid var(--line); color: var(--muted); background: #fff;
}
.ax-pill.yes { color: var(--good); border-color: #cfe9d9; background: #f2fbf5; }
.ax-pill.no { color: var(--bad); border-color: #f3d6d6; background: #fdf4f3; }
.ax-pill.off { opacity: .55; }
.ax-pills { display: flex; flex-wrap: wrap; gap: 6px; }

/* 1 · items */
.ax-item { display: grid; grid-template-columns: minmax(170px, 230px) minmax(0, 1fr); gap: 20px; align-items: center; }
.ax-preview { display: flex; flex-direction: column; align-items: center; }
.ax-preview-name { margin-top: 2px; font-weight: 750; font-size: .92rem; text-align: center; }
.ax-cycle { display: flex; gap: 5px; margin-top: 8px; }
.ax-cycle span { width: 6px; height: 6px; border-radius: 99px; background: #dfe1ea; transition: width .3s, background .3s; }
.ax-cycle span.on { width: 18px; background: var(--accent); }
.ax-rules { margin: 0; display: grid; gap: 10px; }
.ax-rules div { display: grid; grid-template-columns: 92px minmax(0, 1fr); gap: 10px; align-items: center; }
.ax-rules dt { font-size: .78rem; font-weight: 700; color: var(--muted); }
.ax-rules dd { margin: 0; font-size: .86rem; display: flex; flex-wrap: wrap; align-items: center; gap: 6px 10px; }
.ax-rules small { color: var(--muted); font-size: .76rem; }
.ax-level { display: inline-flex; gap: 2px; }
.ax-level span {
  width: 17px; height: 20px; border-radius: 4px; display: grid; place-items: center;
  font-size: .64rem; font-weight: 700; color: #a3a7b8; background: #f1f2f7;
}
.ax-level span.on { color: #fff; background: var(--accent); }

/* 2 · placement */
.ax-side { width: 100%; height: auto; max-height: 380px; display: block; overflow: visible; }
.ax-cargo { fill: #fbf6dc; stroke: #d4b84f; stroke-width: 2; }
.ax-axis { font-size: 11px; fill: #8a90a6; font-weight: 600; }
.ax-cand rect { fill-opacity: .12; stroke-width: 1.8; stroke-dasharray: 5 4; }
.ax-cand.bad rect { fill: var(--bad); stroke: var(--bad); }
.ax-badge { fill: var(--bad); }
.ax-closed-edge { stroke: var(--bad); stroke-width: 2.5; }
.ax-badge-n { font-size: 12px; font-weight: 800; fill: #fff; }
.ax-chosen-label { font-size: 11px; font-weight: 800; fill: var(--good); }
.ax-cand.legal rect { fill: #9aa1b8; stroke: #9aa1b8; fill-opacity: .06; }
.ax-cand.chosen rect { fill: var(--good); stroke: var(--good); fill-opacity: .25; stroke-dasharray: none; stroke-width: 2.4; }
.ax-drop { transition: transform .29s cubic-bezier(.3, 0, .2, 1); }
.ax-now { margin-top: 10px; min-height: 150px; }
.ax-now-item { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; font-size: .92rem; }
.ax-now-item span:last-child { color: var(--muted); font-size: .84rem; }
.ax-now-img { height: 26px; width: auto; max-width: 64px; object-fit: contain; }
.ax-now-why { margin-top: 6px; font-size: .84rem; color: var(--muted); }
.ax-why-list { list-style: none; margin: 6px 0 0; padding: 0; display: grid; gap: 6px; }
.ax-why-list li, .ax-now-pick { display: flex; align-items: flex-start; gap: 8px; font-size: .86rem; line-height: 1.5; color: #3d4359; }
.ax-why-list b { color: var(--bad); }
.ax-why-n {
  flex: none; min-width: 20px; height: 20px; padding: 0 6px; border-radius: 99px;
  display: grid; place-items: center; font-size: .72rem; font-weight: 800; color: #fff; background: var(--bad);
}
.ax-why-n.ok { background: var(--good); }
.ax-now-pick { margin-top: 6px; }
.ax-legend { display: flex; flex-wrap: wrap; align-items: center; gap: 6px 14px; margin-top: 4px; font-size: .76rem; color: var(--muted); }
.ax-legend span { display: inline-flex; align-items: center; gap: 6px; }
.ax-legend .lg { width: 14px; height: 10px; border-radius: 2px; display: inline-block; border: 1.5px dashed; }
.ax-legend .lg.chosen { border-style: solid; border-color: var(--good); background: rgba(31, 138, 82, .25); }
.ax-legend .lg.legal { border-color: #9aa1b8; }
.ax-legend .lg.bad { border-color: var(--bad); background: rgba(194, 69, 61, .12); }
.ax-legend .lg.closed {
  border: 0; border-bottom: 2px solid var(--bad); border-radius: 0;
  background: repeating-linear-gradient(-45deg, var(--bad) 0 2px, rgba(194, 69, 61, .08) 2px 6px);
}
.ax-legend-note { margin-left: auto; font-style: italic; }

/* 3 · genetic algorithm tree */
.ax-ga { display: grid; grid-template-columns: minmax(0, 1fr) minmax(260px, 320px); gap: 24px; align-items: start; }
.ax-tree-wrap { min-width: 0; }
.ax-tree { width: 100%; height: auto; display: block; overflow: hidden; }
.ax-tree-pan { transition: transform .8s cubic-bezier(.2, .8, .2, 1); }
.ax-gen-label { font-size: 11px; font-weight: 750; fill: #5d6378; letter-spacing: .04em; }
.ax-gen-sub { font-size: 9px; font-weight: 600; fill: #a0a5b8; }

/* branches grow in (dash offset); the best load's family line is drawn dark on top */
.ax-edge { fill: none; stroke: #cfd2de; stroke-width: 1.4; stroke-dasharray: 260; stroke-dashoffset: 260; animation: ax-grow .7s ease-out forwards; transition: stroke .5s, opacity .5s; }
.ax-edge.kept { stroke: #b4b9c9; stroke-width: 2.4; }
.ax-edge.second { stroke-width: 1; opacity: .65; }
.ax-edge.new { stroke: #e0b25c; stroke-dasharray: 4 4; stroke-dashoffset: 0; animation: ax-fade .5s ease-out both; }
.ax-edge.line { stroke: var(--ink); stroke-width: 3; opacity: 1; }
@keyframes ax-grow { to { stroke-dashoffset: 0; } }
@keyframes ax-fade { from { opacity: 0; } to { opacity: 1; } }

/* nodes appear once their branch has grown; a pruned node fades out after the next generation lands */
.ax-node { animation: ax-pop .45s ease-out .45s both; transition: opacity .5s .6s, filter .5s .6s; }
@keyframes ax-pop { from { opacity: 0; transform: translateX(-6px); } to { opacity: 1; transform: none; } }
.ax-node-box { fill: #fff; stroke: #d5d8e4; stroke-width: 1.2; }
.ax-node-stripe { fill: #b9bdcc; }
.ax-node.kept .ax-node-stripe { fill: var(--good); }
.ax-node.child .ax-node-stripe { fill: var(--accent); }
.ax-node.random .ax-node-stripe { fill: #e0a43c; }
.ax-node-score { font-size: 11px; font-weight: 800; fill: var(--ink); font-variant-numeric: tabular-nums; }
.ax-node-tag { font-size: 8px; font-weight: 800; letter-spacing: .06em; }
.ax-node.kept .ax-node-tag { fill: var(--good); }
.ax-node.random .ax-node-tag { fill: #b7791f; }
.ax-node.kept .ax-node-box { fill: #f2fbf5; stroke: #bfe3cc; }
.ax-node.line .ax-node-box { stroke: var(--ink); stroke-width: 2.2; }
.ax-node.pruned { opacity: .38; filter: grayscale(1); }
.ax-prune-x { font-size: 12px; font-weight: 800; fill: var(--bad); }

.ax-tree-legend { display: flex; flex-wrap: wrap; gap: 6px 14px; margin-top: 8px; font-size: .76rem; color: var(--muted); }
.ax-tree-legend span { display: inline-flex; align-items: center; gap: 6px; }
.ax-tree-legend i { width: 12px; height: 12px; border-radius: 3px; display: inline-block; }
.ax-tree-legend i.kept { background: var(--good); }
.ax-tree-legend i.child { background: var(--accent); }
.ax-tree-legend i.random { background: #e0a43c; }
.ax-tree-legend i.pruned { background: #d5d8e4; opacity: .7; }
.ax-tree-legend i.line { height: 3px; width: 16px; background: var(--ink); border-radius: 2px; }
.ax-tree-legend i.top2 { background: none; border: 1.5px dashed var(--good); }
.ax-top2 rect { fill: rgba(31, 138, 82, .05); stroke: var(--good); stroke-width: 1.4; stroke-dasharray: 5 4; animation: ax-fade .5s ease-out .5s both; }
.ax-top2 text { font-size: 9px; font-weight: 800; fill: var(--good); letter-spacing: .03em; animation: ax-fade .5s ease-out .5s both; }

.ax-best-label { font-size: .74rem; font-weight: 750; letter-spacing: .08em; text-transform: uppercase; color: var(--muted); margin-bottom: 8px; }
.ax-best-truck { width: 100%; height: auto; display: block; border-radius: 6px; border: 1px solid #ecdca0; }
.ax-mini-bg { fill: #fbf6dc; }
.ax-best-stats { display: flex; justify-content: space-between; margin-top: 8px; font-size: .86rem; color: var(--muted); }
.ax-best-stats b { color: var(--ink); font-variant-numeric: tabular-nums; }

@media (max-width: 900px) {
  .ax-ga { grid-template-columns: 1fr; }
}
@media (max-width: 560px) {
  .ax-step-title { font-size: .8rem; }
  .ax-item { grid-template-columns: 1fr; }
  .ax-preview { max-width: 220px; margin: 0 auto; }
  .ax-legend-note { margin-left: 0; }
}
</style>
