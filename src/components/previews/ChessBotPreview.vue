<template>
  <div ref="root" class="cb">
    <svg viewBox="0 0 80 80" class="cb-board">
      <rect
        v-for="sq in squares"
        :key="sq.name"
        :x="sq.x * 10"
        :y="sq.y * 10"
        width="10"
        height="10"
        :class="['cb-sq', sq.light ? 'is-light' : 'is-dark', lastMove && (lastMove.from === sq.name || lastMove.to === sq.name) && 'is-last']"
      />
      <text
        v-for="p in pieces"
        :key="p.id"
        x="5"
        y="5.4"
        :class="['cb-piece', p.color === 'w' ? 'is-white' : 'is-black']"
        :style="{ transform: `translate(${pos(p.square).x * 10}px, ${pos(p.square).y * 10}px)` }"
      >{{ GLYPH[p.type] }}</text>
    </svg>

    <div class="cb-panel">
      <div class="cb-title">Bot <span>vs</span> Bot</div>
      <dl class="cb-stats">
        <div><dt>Move</dt><dd>{{ moveNo }}</dd></div>
        <div><dt>Last</dt><dd>{{ lastMove ? lastMove.san : '—' }}</dd></div>
        <div><dt>Evaluation</dt><dd :class="evalScore >= 0 ? 'is-pos' : 'is-neg'">{{ evalLabel }}</dd></div>
      </dl>
      <div class="cb-bar"><span :style="{ width: barPct + '%' }" /></div>
      <div class="cb-status">{{ status }}</div>
    </div>
  </div>
</template>

<script setup>
// Two lightweight bots play full games against each other with chess.js.
// Each bot scores its legal moves on material, piece safety, checks and a little
// centralisation, plus noise so every game is different.
import { computed, onBeforeUnmount, onMounted, ref, shallowRef } from 'vue'
import { Chess } from 'chess.js'

const MOVE_MS = 1100
const END_HOLD_MS = 2600
const MAX_PLIES = 140
const VALUE = { p: 1, n: 3, b: 3.2, r: 5, q: 9, k: 0 }
const GLYPH = { k: '♚︎', q: '♛︎', r: '♜︎', b: '♝︎', n: '♞︎', p: '♟︎' }
const OPENINGS = [['e4', 'e5'], ['e4', 'c5'], ['d4', 'd5'], ['d4', 'Nf6'], ['c4', 'e5'], ['Nf3', 'd5'], ['e4', 'e6'], ['e4', 'c6']]

const root = ref(null)
const pieces = ref([])
const lastMove = shallowRef(null)
const moveNo = ref(1)
const evalScore = ref(0)
const status = ref('')

const squares = []
for (let r = 0; r < 8; r += 1) {
  for (let f = 0; f < 8; f += 1) {
    squares.push({ name: `${'abcdefgh'[f]}${8 - r}`, x: f, y: r, light: (r + f) % 2 === 0 })
  }
}
const pos = (sq) => ({ x: sq.charCodeAt(0) - 97, y: 8 - Number(sq[1]) })

let chess
let nextId = 0
let opening = []

function material (c) {
  let s = 0
  for (const row of c.board()) for (const p of row) if (p) s += (p.color === 'w' ? 1 : -1) * VALUE[p.type]
  return s
}

function newGame () {
  chess = new Chess()
  nextId = 0
  const list = []
  for (const row of chess.board()) for (const p of row) if (p) list.push({ id: nextId++, type: p.type, color: p.color, square: p.square })
  pieces.value = list
  lastMove.value = null
  moveNo.value = 1
  evalScore.value = 0
  status.value = 'White to move'
  opening = OPENINGS[Math.floor(Math.random() * OPENINGS.length)].slice()
}

function pickMove () {
  const book = opening.shift()
  if (book) return book
  const me = chess.turn()
  const them = me === 'w' ? 'b' : 'w'
  let best = null
  let bestScore = -Infinity
  for (const mv of chess.moves({ verbose: true })) {
    let s = 0
    if (mv.san.includes('#')) s += 1000
    if (mv.captured) s += VALUE[mv.captured] * 1.1
    if (mv.promotion) s += VALUE[mv.promotion]
    chess.move(mv)
    if (chess.isAttacked(mv.to, them)) s -= VALUE[mv.piece] * (chess.isAttacked(mv.to, me) ? 0.55 : 0.95)
    if (chess.inCheck()) s += 0.35
    if (chess.isDraw()) s -= 2
    chess.undo()
    const f = mv.to.charCodeAt(0) - 97
    const r = Number(mv.to[1]) - 1
    s += 0.12 * (3.5 - Math.max(Math.abs(f - 3.5), Math.abs(r - 3.5))) / 3.5
    if (mv.piece === 'k' && !mv.flags.includes('k') && !mv.flags.includes('q')) s -= 0.3
    s += Math.random() * 0.45
    if (s > bestScore) { bestScore = s; best = mv }
  }
  return best
}

function applyToPieces (mv) {
  let list = pieces.value
  const capSq = mv.flags.includes('e') ? `${mv.to[0]}${mv.from[1]}` : mv.to
  if (mv.captured) list = list.filter((p) => p.square !== capSq)
  list = list.map((p) => (p.square === mv.from ? { ...p, square: mv.to, type: mv.promotion || p.type } : p))
  if (mv.flags.includes('k') || mv.flags.includes('q')) {
    const rank = mv.from[1]
    const [rf, rt] = mv.flags.includes('k') ? [`h${rank}`, `f${rank}`] : [`a${rank}`, `d${rank}`]
    list = list.map((p) => (p.square === rf ? { ...p, square: rt } : p))
  }
  pieces.value = list
}

function play () {
  const choice = pickMove()
  const mv = chess.move(choice)
  applyToPieces(mv)
  lastMove.value = mv
  moveNo.value = Math.ceil(chess.history().length / 2)
  evalScore.value = material(chess) + (Math.random() - 0.5) * 0.3

  if (chess.isCheckmate()) status.value = `Checkmate · ${mv.color === 'w' ? 'White' : 'Black'} wins`
  else if (chess.isGameOver()) status.value = 'Draw'
  else if (chess.history().length >= MAX_PLIES) status.value = 'Adjudicated'
  else status.value = `${chess.turn() === 'w' ? 'White' : 'Black'} to move${chess.inCheck() ? ' · check' : ''}`

  return chess.isGameOver() || chess.history().length >= MAX_PLIES
}

const evalLabel = computed(() => `${evalScore.value >= 0 ? '+' : ''}${evalScore.value.toFixed(2)}`)
const barPct = computed(() => 50 + 50 * Math.tanh(evalScore.value / 6))

let timer = 0
let visible = false
let io
const reduceMotion = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

function loop () {
  timer = 0
  if (!visible) return
  const over = play()
  timer = setTimeout(() => {
    if (over) newGame()
    loop()
  }, over ? END_HOLD_MS : MOVE_MS)
}

newGame()

onMounted(() => {
  if (reduceMotion) {
    for (let i = 0; i < 12; i += 1) play()
    return
  }
  io = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting
    if (visible && !timer) timer = setTimeout(loop, 500)
  })
  io.observe(root.value)
})

onBeforeUnmount(() => {
  clearTimeout(timer)
  io?.disconnect()
})
</script>

<style scoped>
.cb { height: 100%; display: flex; align-items: center; gap: 14px; padding: 10px 14px; }
.cb-board { height: 100%; aspect-ratio: 1; flex: none; border-radius: 6px; overflow: hidden; box-shadow: 0 8px 24px rgba(0, 0, 0, .35); }
.cb-sq.is-light { fill: #ece6f6; }
.cb-sq.is-dark { fill: rgba(var(--tone-rgb), 1); opacity: .78; }
.cb-sq.is-last { fill: #f3d77a; opacity: .9; }
.cb-piece {
  font: 8.2px/1 "Segoe UI Symbol", "Noto Sans Symbols 2", "DejaVu Sans", serif;
  text-anchor: middle;
  dominant-baseline: central;
  transition: transform .45s cubic-bezier(.3, .7, .2, 1);
  paint-order: stroke;
  stroke-width: .45px;
}
.cb-piece.is-white { fill: #fff; stroke: #1d1f36; }
.cb-piece.is-black { fill: #1d1f36; stroke: rgba(255, 255, 255, .35); }

.cb-panel {
  flex: 1;
  min-width: 0;
  align-self: stretch;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 6px;
  padding: 10px 12px;
  border-radius: 10px;
  background: rgba(10, 10, 30, .45);
  border: 1px solid rgba(255, 255, 255, .1);
  color: #fff;
  font: 600 11px/1.2 system-ui, sans-serif;
}
.cb-title { font-weight: 800; font-size: 12px; letter-spacing: .02em; }
.cb-title span { opacity: .5; font-weight: 600; }
.cb-stats { margin: 0; display: grid; gap: 3px; }
.cb-stats div { display: flex; justify-content: space-between; gap: 8px; }
.cb-stats dt { opacity: .6; }
.cb-stats dd { margin: 0; font-variant-numeric: tabular-nums; }
.cb-stats .is-pos { color: #7ee2a8; }
.cb-stats .is-neg { color: #ff9b9b; }
.cb-bar { height: 5px; border-radius: 3px; background: #1d1f36; overflow: hidden; border: 1px solid rgba(255, 255, 255, .15); }
.cb-bar span { display: block; height: 100%; background: #fff; transition: width .5s ease; }
.cb-status { font-size: 10px; opacity: .55; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

@media (prefers-reduced-motion: reduce) {
  .cb-piece, .cb-bar span { transition: none; }
}
</style>
