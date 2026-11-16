<template>
  <section class="notes">
    <header class="head">
      <div class="section-label">Study notes</div>
      <h1 class="title">Notes</h1>
      <p class="sub">Animated walk-throughs, one worked example each. Lines on the right join notes that share an idea.</p>
    </header>

    <div v-if="notes.length" class="toolbar">
      <label class="search">
        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4.5 4.5" /></svg>
        <span class="sr-only">Search notes</span>
        <input v-model="query" type="search" placeholder="Search notes" autocomplete="off">
      </label>
      <div v-if="!searching && branchKeys.length" class="tree-actions">
        <button type="button" @click="collapsed = new Set()">Expand all</button>
        <button type="button" @click="collapsed = new Set(branchKeys)">Collapse all</button>
      </div>
    </div>

    <p v-if="status === 'loading'" class="state">Loading notes…</p>
    <p v-else-if="status === 'error'" class="state">The notes list could not be loaded. Try refreshing the page.</p>
    <p v-else-if="!rows.length" class="state">No notes match “{{ query }}”.</p>

    <div v-else ref="treeEl" class="tree" :class="{ 'is-hovering': hoverKey }">
      <svg class="arcs" aria-hidden="true" :width="box.w" :height="box.h">
        <path
          v-for="arc in arcs"
          :key="arc.id"
          :d="arc.d"
          :class="['arc', hoverKey && (arc.a === hoverKey || arc.b === hoverKey) && 'is-on']"
        />
      </svg>

      <ul class="rows" role="tree" aria-label="Study notes by topic">
        <li
          v-for="row in rows"
          :key="row.key"
          :ref="(el) => setRowEl(row.key, el)"
          role="treeitem"
          :aria-level="row.depth + 1"
          :aria-expanded="row.kind === 'note' ? undefined : !isCollapsed(row.key)"
          :class="[
            'row',
            `row-${row.kind}`,
            row.depth === 0 && 'row-root',
            linkedKeys.has(row.key) && 'is-linked',
            hoverKey === row.key && 'is-hover',
            endpointKeys.has(row.key) && 'is-endpoint',
          ]"
        >
          <span v-for="(g, i) in row.guides" :key="i" :class="['g', `g-${g}`]" aria-hidden="true" />

          <button
            v-if="row.kind !== 'note'"
            type="button"
            class="branch"
            :disabled="searching"
            @click="toggle(row.key)"
          >
            <svg class="chev" viewBox="0 0 12 12" aria-hidden="true"><path d="M4 2.5 7.5 6 4 9.5" /></svg>
            <span class="branch-label">{{ row.label }}</span>
            <span v-if="row.kind === 'series'" class="branch-kind mono">series</span>
            <span class="branch-count mono">{{ row.count }}</span>
            <span class="leader" aria-hidden="true" />
            <span class="dot" aria-hidden="true" />
          </button>

          <div v-else class="leaf-wrap">
            <a
              class="leaf"
              :href="href(row.note)"
              :title="row.note.summary"
              @mouseenter="hoverKey = row.key"
              @mouseleave="hoverKey = null"
              @focus="hoverKey = row.key"
              @blur="hoverKey = null"
            >
              <span v-if="row.note.part" class="part mono">{{ row.note.part }}</span>
              <span class="leaf-title">{{ row.note.title }}</span>
              <span class="leader" aria-hidden="true" />
              <span v-if="row.note.minutes" class="mins mono">{{ row.note.minutes }} min</span>
              <span class="dot" aria-hidden="true" />
            </a>
            <span v-if="related.get(row.note.slug)?.size" class="see-also">
              <span class="mono">see also</span>
              <a v-for="r in relatedNotes(row.note)" :key="r.slug" :href="href(r)">{{ r.title }}</a>
            </span>
          </div>
        </li>
      </ul>
    </div>
  </section>
</template>

<script setup>
// Lists the notes in public/study-notes/. That folder's notes.json is the source of truth,
// so a new note appears here without any change to this component.
//
// Notes are shown as a tree: topic path ("Statistics / State estimation") → series → note.
// Notes are linked when they share a tag or name each other in `related`, and the links
// are drawn as arcs in the right-hand rail.
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

const BASE = `${import.meta.env.BASE_URL}study-notes/`
const RAIL = 132

const notes = ref([])
const status = ref('loading')
const query = ref('')
const collapsed = ref(new Set())
const hoverKey = ref(null)
const treeEl = ref(null)
const box = ref({ w: 0, h: 0 })
const positions = ref(new Map())

const searching = computed(() => query.value.trim().length > 0)
const href = (n) => BASE + (n.file || `${n.slug}.html`)
const noteKey = (n) => `n:${n.slug}`
const topicPath = (n) => String(n.topic || 'Other').split('/').map((s) => s.trim()).filter(Boolean)

const bySlug = computed(() => new Map(notes.value.map((n) => [n.slug, n])))

// Two notes are related when either lists the other in `related`, or they share a tag.
// Notes in the same series are already joined by the tree, so they are not linked again.
const related = computed(() => {
  const map = new Map(notes.value.map((n) => [n.slug, new Set()]))
  const link = (a, b) => {
    if (a === b || !map.has(a) || !map.has(b)) return
    const na = bySlug.value.get(a)
    const nb = bySlug.value.get(b)
    if (na.series && na.series === nb.series) return
    map.get(a).add(b)
    map.get(b).add(a)
  }
  const byTag = new Map()
  notes.value.forEach((n) => {
    ;(n.related || []).forEach((r) => link(n.slug, r))
    ;(n.tags || []).forEach((t) => {
      const k = t.toLowerCase()
      if (!byTag.has(k)) byTag.set(k, [])
      byTag.get(k).push(n.slug)
    })
  })
  byTag.forEach((slugs) => slugs.forEach((a) => slugs.forEach((b) => link(a, b))))
  return map
})

const relatedNotes = (n) => [...(related.value.get(n.slug) || [])].map((s) => bySlug.value.get(s))

const matches = computed(() => {
  const q = query.value.trim().toLowerCase()
  if (!q) return notes.value
  return notes.value.filter((n) =>
    [n.title, n.summary, n.topic, n.series, ...(n.tags || [])].some((s) => s?.toLowerCase().includes(q)))
})

// Builds topic → sub-topic → series → note, keeping first-appearance order.
const tree = computed(() => {
  const root = { children: [], index: new Map() }
  const child = (parent, key, make) => {
    if (!parent.index.has(key)) {
      const node = { key, children: [], index: new Map(), ...make() }
      parent.index.set(key, node)
      parent.children.push(node)
    }
    return parent.index.get(key)
  }
  matches.value.forEach((n) => {
    let node = root
    const path = []
    topicPath(n).forEach((label) => {
      path.push(label)
      node = child(node, `t:${path.join('/')}`, () => ({ kind: 'topic', label }))
    })
    if (n.series) node = child(node, `s:${path.join('/')}/${n.series}`, () => ({ kind: 'series', label: n.series }))
    child(node, noteKey(n), () => ({ kind: 'note', note: n }))
  })
  const finish = (node) => {
    node.children.forEach(finish)
    if (node.kind === 'series') node.children.sort((a, b) => (a.note.part || 0) - (b.note.part || 0))
    node.count = node.kind === 'note' ? 1 : node.children.reduce((s, c) => s + c.count, 0)
  }
  root.children.forEach(finish)
  return root.children
})

const branchKeys = computed(() => {
  const keys = []
  const walk = (nodes) => nodes.forEach((n) => { if (n.kind !== 'note') { keys.push(n.key); walk(n.children) } })
  walk(tree.value)
  return keys
})

const isCollapsed = (key) => !searching.value && collapsed.value.has(key)

function toggle (key) {
  const next = new Set(collapsed.value)
  next.has(key) ? next.delete(key) : next.add(key)
  collapsed.value = next
}

// Flattens the visible tree. `guides` draws the connector lines: one cell per ancestor
// level ('pipe' while that ancestor has more siblings below), then this row's own 'tee' or 'elbow'.
// `visible` maps each note to the row that stands for it: itself, or its outermost collapsed branch.
const layout = computed(() => {
  const rows = []
  const visible = new Map()
  const walk = (nodes, depth, guides, hiddenBy) => {
    nodes.forEach((node, i) => {
      const last = i === nodes.length - 1
      const own = depth === 0 ? [] : [...guides, last ? 'elbow' : 'tee']
      if (!hiddenBy) rows.push({ ...node, depth, guides: own })
      if (node.kind === 'note') {
        visible.set(node.note.slug, hiddenBy || node.key)
        return
      }
      const nextGuides = depth === 0 ? [] : [...guides, last ? 'blank' : 'pipe']
      walk(node.children, depth + 1, nextGuides, hiddenBy || (isCollapsed(node.key) ? node.key : null))
    })
  }
  walk(tree.value, 0, [], null)
  return { rows, visible }
})

const rows = computed(() => layout.value.rows)

// One arc per pair of visible rows that hold related notes.
const links = computed(() => {
  const { visible } = layout.value
  const seen = new Map()
  related.value.forEach((others, a) => {
    others.forEach((b) => {
      const ka = visible.get(a)
      const kb = visible.get(b)
      if (!ka || !kb || ka === kb) return
      const id = [ka, kb].sort().join('|')
      if (!seen.has(id)) seen.set(id, { id, a: ka, b: kb })
    })
  })
  return [...seen.values()]
})

const endpointKeys = computed(() => new Set(links.value.flatMap((l) => [l.a, l.b])))

const linkedKeys = computed(() => {
  if (!hoverKey.value) return new Set()
  const out = new Set()
  links.value.forEach((l) => {
    if (l.a === hoverKey.value) out.add(l.b)
    if (l.b === hoverKey.value) out.add(l.a)
  })
  return out
})

const arcs = computed(() => links.value.flatMap((l) => {
  const pa = positions.value.get(l.a)
  const pb = positions.value.get(l.b)
  if (!pa || !pb) return []
  const [top, bot] = pa.y < pb.y ? [pa, pb] : [pb, pa]
  const x = Math.max(pa.x, pb.x)
  const bulge = Math.min(Math.max((bot.y - top.y) * 0.42, 26), RAIL - 18)
  return [{ ...l, d: `M ${top.x} ${top.y} C ${x + bulge} ${top.y}, ${x + bulge} ${bot.y}, ${bot.x} ${bot.y}` }]
}))

// Arc endpoints are measured from each row's dot, so they follow wrapping and collapsing.
const rowEls = new Map()
function setRowEl (key, el) {
  if (el) rowEls.set(key, el)
  else rowEls.delete(key)
}

function measure () {
  const host = treeEl.value
  if (!host) return
  const origin = host.getBoundingClientRect()
  const next = new Map()
  rowEls.forEach((el, key) => {
    const dot = el.querySelector('.dot')
    if (!dot) return
    const r = dot.getBoundingClientRect()
    if (!r.width) return
    next.set(key, { x: r.left + r.width / 2 - origin.left, y: r.top + r.height / 2 - origin.top })
  })
  positions.value = next
  box.value = { w: host.clientWidth, h: host.scrollHeight }
}

let observer
watch(rows, () => nextTick(measure), { flush: 'post' })
watch(treeEl, (el, old) => {
  if (old) observer?.unobserve(old)
  if (el) { observer?.observe(el); nextTick(measure) }
})

onMounted(async () => {
  observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => measure()) : null
  window.addEventListener('resize', measure)
  try {
    const res = await fetch(`${BASE}notes.json`, { cache: 'no-cache' })
    if (!res.ok) throw new Error(res.statusText)
    const data = await res.json()
    notes.value = Array.isArray(data) ? data : []
    status.value = 'ready'
  } catch {
    status.value = 'error'
  }
})

onBeforeUnmount(() => {
  observer?.disconnect()
  window.removeEventListener('resize', measure)
})
</script>

<style scoped>
.notes {
  --rail: 132px;
  --row: 40px;
  --indent: 26px;
  --guide: #d6d9e6;
  max-width: 920px;
}

.head {
  max-width: 620px;
}

.title {
  margin: 10px 0 0;
  font-size: clamp(2.3rem, 4.6vw, 3.6rem);
  line-height: 1.02;
  letter-spacing: -0.05em;
  color: var(--ink);
}

.sub {
  margin: 14px 0 0;
  font-size: 1rem;
  line-height: 1.6;
  color: var(--muted);
}

/* Toolbar */
.toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px 18px;
  margin: 36px 0 20px;
}

.search {
  position: relative;
  display: flex;
  align-items: center;
  flex: 0 1 320px;
  min-width: 220px;
}

.search svg {
  position: absolute;
  left: 14px;
  width: 17px;
  height: 17px;
  fill: none;
  stroke: var(--muted);
  stroke-width: 2;
  stroke-linecap: round;
  pointer-events: none;
}

.search input {
  width: 100%;
  height: 42px;
  padding: 0 14px 0 40px;
  border: 1px solid var(--line);
  border-radius: 10px;
  background: #fff;
  color: var(--ink);
  outline: none;
  transition: border-color 160ms ease, box-shadow 160ms ease;
}

.search input:focus {
  border-color: #cfc8ff;
  box-shadow: 0 0 0 4px rgba(104, 88, 232, 0.12);
}

.tree-actions {
  display: flex;
  gap: 4px;
}

.tree-actions button {
  padding: 6px 10px;
  border: 0;
  border-radius: 8px;
  background: none;
  color: var(--muted);
  font: inherit;
  font-size: 0.82rem;
  font-weight: 650;
  cursor: pointer;
}

.tree-actions button:hover {
  background: rgba(27, 31, 69, 0.05);
  color: var(--ink);
}

.state {
  margin: 32px 0;
  color: var(--muted);
}

/* Tree */
.tree {
  position: relative;
  padding: 6px var(--rail) 18px 0;
  border-top: 1px solid var(--ink);
}

.arcs {
  position: absolute;
  inset: 0;
  overflow: visible;
  pointer-events: none;
}

.arc {
  fill: none;
  stroke: rgba(104, 88, 232, 0.28);
  stroke-width: 1.25;
  transition: stroke 180ms ease, stroke-width 180ms ease, opacity 180ms ease;
}

.is-hovering .arc {
  opacity: 0.25;
}

.is-hovering .arc.is-on {
  opacity: 1;
  stroke: var(--accent);
  stroke-width: 2;
}

.rows {
  margin: 0;
  padding: 0;
  list-style: none;
}

.row {
  position: relative;
  display: flex;
  align-items: stretch;
  min-height: var(--row);
  transition: opacity 180ms ease;
}

.row-root {
  margin-top: 22px;
}

.row-root:first-child {
  margin-top: 8px;
}

.is-hovering .row-note:not(.is-hover):not(.is-linked) {
  opacity: 0.45;
}

/* Connector guides */
.g {
  position: relative;
  flex: 0 0 var(--indent);
  align-self: stretch;
}

.g-pipe::before,
.g-tee::before,
.g-elbow::before {
  content: '';
  position: absolute;
  left: 9px;
  top: 0;
  bottom: 0;
  border-left: 1px solid var(--guide);
}

.g-elbow::before {
  bottom: auto;
  height: calc(var(--row) / 2);
}

.g-tee::after,
.g-elbow::after {
  content: '';
  position: absolute;
  left: 9px;
  right: 3px;
  top: calc(var(--row) / 2);
  border-top: 1px solid var(--guide);
}

.leaf-wrap {
  display: flex;
  flex: 1 1 0;
  flex-direction: column;
  min-width: 0;
}

/* Branch rows (topics and series) */
.branch,
.leaf {
  display: flex;
  flex: 1 1 0;
  align-items: center;
  gap: 10px;
  min-width: 0;
  min-height: var(--row);
  padding: 0 0 0 6px;
  border: 0;
  border-radius: 8px;
  background: none;
  color: var(--ink);
  font: inherit;
  text-align: left;
  text-decoration: none;
}

.branch {
  cursor: pointer;
}

.branch:disabled {
  cursor: default;
}

.chev {
  flex: none;
  width: 12px;
  height: 12px;
  fill: none;
  stroke: var(--muted);
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
  transform: rotate(90deg);
  transition: transform 180ms ease;
}

.row[aria-expanded='false'] .chev {
  transform: none;
}

.branch:disabled .chev {
  opacity: 0.35;
}

.branch-label {
  font-weight: 700;
  letter-spacing: -0.01em;
}

.row-root .branch-label {
  font-size: 0.8rem;
  font-weight: 800;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

.row-series .branch-label {
  font-weight: 650;
}

.branch-kind {
  padding: 1px 6px;
  border: 1px solid var(--line);
  border-radius: 5px;
  color: var(--muted);
  font-size: 0.68rem;
}

.branch-count {
  color: #a3a8bd;
  font-size: 0.74rem;
}

.leader {
  flex: 1 1 auto;
  min-width: 16px;
  align-self: center;
  margin-top: 4px;
  border-bottom: 1px dotted #d3d6e2;
}

.dot {
  flex: none;
  width: 9px;
  height: 9px;
  margin-right: -5px;
  border: 1.5px solid #c2c6d6;
  border-radius: 50%;
  background: #fff;
  transition: background-color 180ms ease, border-color 180ms ease, transform 180ms ease;
}

.row-topic .dot,
.row-series .dot {
  visibility: hidden;
}

.row-topic.is-endpoint .dot,
.row-series.is-endpoint .dot {
  visibility: visible;
  border-style: dashed;
}

.row.is-endpoint .dot {
  border-color: rgba(104, 88, 232, 0.55);
}

.row.is-hover .dot,
.row.is-linked .dot {
  border-color: var(--accent);
  background: var(--accent);
  transform: scale(1.25);
}

/* Note rows */
.part {
  flex: none;
  display: grid;
  place-items: center;
  width: 20px;
  height: 20px;
  border-radius: 6px;
  background: rgba(104, 88, 232, 0.1);
  color: var(--accent);
  font-size: 0.72rem;
  font-weight: 700;
}

.leaf-title {
  min-width: 0;
  font-size: 1.02rem;
  font-weight: 560;
  line-height: 1.3;
  padding: 9px 0;
  transition: color 160ms ease;
}

.mins {
  flex: none;
  color: var(--muted);
  font-size: 0.76rem;
}

.leaf:hover .leaf-title,
.leaf:focus-visible .leaf-title,
.row.is-linked .leaf-title {
  color: var(--accent);
}

.leaf:hover .leader,
.leaf:focus-visible .leader {
  border-bottom-color: var(--accent);
}

.leaf:focus-visible,
.branch:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

/* Inline related links: only shown where there is no room for the arc rail. */
.see-also {
  display: none;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

@media (max-width: 640px) {
  .notes {
    --indent: 18px;
  }

  .toolbar {
    margin-top: 28px;
  }

  .search {
    flex-basis: 100%;
  }

  .tree {
    padding-right: 0;
  }

  .arcs,
  .dot,
  .leader {
    display: none;
  }

  .mins {
    margin-left: auto;
    padding-left: 10px;
  }

  .g-pipe::before,
  .g-tee::before,
  .g-elbow::before,
  .g-tee::after,
  .g-elbow::after {
    left: 6px;
  }

  .see-also {
    display: flex;
    flex-wrap: wrap;
    gap: 2px 10px;
    padding: 0 0 10px 6px;
    font-size: 0.8rem;
  }

  .see-also .mono {
    color: var(--muted);
    font-size: 0.7rem;
  }

  .see-also a {
    color: var(--accent);
    text-decoration: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .row,
  .arc,
  .dot,
  .chev,
  .leaf-title,
  .search input {
    transition: none;
  }
}
</style>
