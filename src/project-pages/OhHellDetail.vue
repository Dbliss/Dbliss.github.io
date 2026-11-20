<template>
  <div class="ohp" :style="{ '--sy': scrollY }">
    <!-- HERO -->
    <header
      ref="heroEl"
      class="hero"
      :style="heroVars"
      @pointermove="onHeroMove"
      @pointerleave="onHeroLeave"
    >
      <RouterLink to="/projects" class="back">← All projects</RouterLink>
      <span class="hero-num hero-ten" aria-hidden="true">10</span>
      <span class="hero-num hero-one" aria-hidden="true">1</span>

      <div class="hero-fan" aria-hidden="true">
        <span
          v-for="(c, i) in heroCards"
          :key="c.r + c.s"
          class="ohc hero-card"
          :class="{ hidden: c.hidden }"
          :style="c.hidden ? { '--i': i - 2, '--n': i } : { ...cardBg(c), '--i': i - 2, '--n': i }"
        />
      </div>

      <div class="hero-copy">
        <p class="eyebrow">10-to-1 Bot · Game AI · Search · ML · Systems</p>
        <h1>An AI that plays<br>the cards it <em>can't see</em>.</h1>
        <p class="lead">Monte Carlo search over hidden hands, neural networks written in NumPy and improved by self-play, and a C search core compiled to WebAssembly. It all runs in a browser tab, and every change to the bot has to pass a statistical gate before it ships.</p>
        <div class="actions">
          <a :href="project.liveUrl" class="play" @pointermove="magnet" @pointerleave="unmagnet">
            <span>Play against it</span>
          </a>
          <a :href="project.repoUrl" class="link" target="_blank" rel="noopener noreferrer">Source on GitHub</a>
          <a href="/10-1/bid-game/" class="link">Bidding quiz</a>
        </div>
      </div>

      <dl class="hero-stats">
        <div v-for="s in HERO_STATS" :key="s.label">
          <dt>{{ s.label }}</dt>
          <dd>{{ Math.round(s.value * statsP).toLocaleString('en-US') }}<span>{{ s.unit }}</span></dd>
        </div>
      </dl>

      <div class="scroll-cue" aria-hidden="true"><span /></div>
    </header>

    <!-- THE DECISION: scroll-scrubbed -->
    <section ref="decideEl" class="decide">
      <div class="decide-sticky">
        <p class="kicker decide-kicker">01 · One decision, end to end</p>
        <div class="decide-stage">
          <HoverCanvas :draw="drawDecisionLive" :active="decideVisible" :repaint-key="stepIndex" />
        </div>
        <ol class="decide-steps">
          <li
            v-for="(s, i) in STEPS"
            :key="s.title"
            :class="{ on: i === stepIndex, done: i < stepIndex }"
          >
            <button type="button" class="step-btn" :aria-current="i === stepIndex ? 'step' : undefined" @click="goToStep(i)">
              <span class="step-n">0{{ i + 1 }} · <code>{{ s.code }}</code></span>
              <h3>{{ s.title }}</h3>
              <p>{{ s.body }}</p>
            </button>
          </li>
        </ol>
        <div class="decide-progress" aria-hidden="true">
          <span v-for="i in STEPS.length" :key="i" :class="{ on: i - 1 <= stepIndex }" />
        </div>
        <p class="decide-note">Illustrative hand. Scroll, or pick a step, to move on.</p>
      </div>
    </section>

    <!-- INSIDE THE BOT -->
    <section ref="insideEl" v-reveal class="inside">
      <div class="inside-head">
        <p class="kicker">02 · Inside the bot</p>
        <h2>Five parts, one hybrid.</h2>
        <p>The search does the reasoning; the networks tell it where to look.</p>
      </div>

      <div class="inside-body" @pointerenter="layerUser = true">
        <div class="layers" role="tablist" aria-label="Bot components">
          <button
            v-for="(l, i) in LAYERS"
            :id="`layer-tab-${i}`"
            :key="l.key"
            type="button"
            role="tab"
            class="layer"
            :class="{ on: i === layerIndex }"
            :aria-selected="i === layerIndex"
            aria-controls="layer-panel"
            @click="pickLayer(i)"
            @focus="pickLayer(i)"
          >
            <span class="layer-n">0{{ i + 1 }}</span>
            <span class="layer-name">{{ l.name }}</span>
            <span class="layer-lang">{{ l.lang }}</span>
            <span v-if="i === layerIndex && !layerUser" class="layer-timer" aria-hidden="true" :style="{ transform: `scaleX(${Math.min(1, vizT / LAYER_SECONDS)})` }" />
          </button>
        </div>

        <div id="layer-panel" class="layer-panel" role="tabpanel" :aria-labelledby="`layer-tab-${layerIndex}`">
          <Transition name="swap" mode="out-in">
            <div :key="layer.key" class="panel-inner">
              <div class="viz" aria-hidden="true">
                <!-- Belief sampler: deal around hard facts, weight by bids, resample -->
                <div v-if="layer.key === 'belief'" class="viz-belief">
                  <ol class="viz-steps">
                    <li v-for="(s, k) in BELIEF_STEPS" :key="s" :class="{ on: belief.phase === k, done: belief.phase > k }">{{ s }}</li>
                  </ol>
                  <div :key="belief.idx" class="belief-deal">
                    <div v-for="(row, s) in belief.rows" :key="row.seat" class="belief-row">
                      <span class="seat">{{ row.seat }}<small>{{ row.fact }}</small></span>
                      <span class="chips">
                        <span
                          v-for="(c, j) in row.cards"
                          :key="c.label"
                          class="chip"
                          :class="{ red: c.red, flag: row.flagHonours && c.honour && belief.phase >= 1 }"
                          :style="{ '--j': s * 3 + j }"
                        >{{ c.label }}</span>
                      </span>
                    </div>
                  </div>
                  <div class="belief-weight" :class="{ on: belief.phase >= 1 }">
                    <span>weight</span>
                    <span class="wbar"><i :style="{ transform: `scaleX(${belief.phase >= 1 ? belief.weight : 0})` }" /></span>
                    <b>{{ belief.phase >= 1 ? belief.weight.toFixed(2) : '–' }}</b>
                  </div>
                  <div class="belief-hist">
                    <span v-for="h in belief.history" :key="h.idx" :class="{ heavy: h.weight > 0.4 }" :style="{ '--w': h.weight }" />
                  </div>
                  <p class="viz-cap">West never gets a spade: that's a hard fact. Deals that give North high cards clash with its zero bid, so they weigh less and are drawn less often when the sample is resampled.</p>
                </div>

                <!-- Networks: features in, a probability per bid out -->
                <div v-else-if="layer.key === 'nets'" class="viz-netwrap">
                  <svg class="viz-net" viewBox="0 0 480 260">
                    <line
                      v-for="(e, k) in NET.edges"
                      :key="k"
                      :x1="e[0]" :y1="e[1]" :x2="e[2]" :y2="e[3]"
                      :class="{ live: net.stage >= e[4] + 1 }"
                    />
                    <circle v-for="(n, k) in NET.nodes" :key="'n' + k" :cx="n[0]" :cy="n[1]" r="6" :class="{ lit: net.stage >= n[2] }" />
                    <text v-for="(l, k) in NET.inputs" :key="'i' + k" x="102" :y="l[1] + 4" text-anchor="end">{{ l[0] }}</text>
                    <g v-for="(o, k) in NET.outputs" :key="'o' + k" class="out" :class="{ best: k === 2, show: net.stage >= 4 }">
                      <text x="338" :y="o.y + 4">bid {{ k }}</text>
                      <rect x="380" :y="o.y - 5" height="10" rx="3" :width="o.p * 150" :style="{ '--k': k }" />
                      <text class="pct" :x="386 + o.p * 150" :y="o.y + 4">{{ Math.round(o.p * 100) }}%</text>
                    </g>
                    <text v-for="(l, k) in NET.layerLabels" :key="'l' + k" :x="l[0]" y="252" text-anchor="middle" class="tick">{{ l[1] }}</text>
                  </svg>
                  <p class="viz-cap">The bid network turns a hand into a probability for every bid. The search then spends most of its deals on the likely ones instead of all eleven.</p>
                </div>

                <!-- Self-play: play, label, refit, repeat -->
                <div v-else-if="layer.key === 'selfplay'" class="viz-selfplay">
                  <svg viewBox="0 0 400 300">
                    <circle cx="200" cy="62" r="42" class="ring" />
                    <g class="orbit"><circle cx="200" cy="20" r="5" /></g>
                    <text x="200" y="66" text-anchor="middle" class="iter">iter {{ selfplay.iter || '–' }}</text>
                    <text
                      v-for="(c, k) in SELFPLAY_CYCLE"
                      :key="c.label"
                      :x="c.x"
                      :y="c.y"
                      :text-anchor="c.anchor"
                      :class="{ on: selfplay.stage === k }"
                    >{{ c.label }}</text>
                    <line x1="50" y1="272" x2="380" y2="272" class="axis" />
                    <polyline :points="selfplay.points" class="trace" />
                    <g v-for="(p, k) in SELFPLAY.dots" :key="k" class="pt" :class="{ show: k <= selfplay.iter }">
                      <circle :cx="p.x" :cy="p.y" r="5" />
                      <text :x="p.x" :y="p.y - 12" text-anchor="middle">{{ p.label }}</text>
                    </g>
                    <text v-for="(p, k) in SELFPLAY.dots" :key="'x' + k" :x="p.x" y="290" text-anchor="middle" class="tick">{{ k === 0 ? 'start' : k }}</text>
                  </svg>
                  <p class="viz-cap">Each lap: the networks play, every option at sampled decisions is scored by finishing the round, and the networks are refit on those scores. Points per game against the starting networks.</p>
                </div>

                <!-- Exact endgame: depth-first search, reusing solved positions -->
                <div v-else-if="layer.key === 'endgame'" class="viz-treewrap">
                  <svg class="viz-tree" viewBox="0 0 400 240">
                    <line
                      v-for="(n, k) in TREE.nodes.slice(1)"
                      :key="'e' + k"
                      :x1="n.px" :y1="n.py" :x2="n.x" :y2="n.y"
                      :class="{ seen: tree.step > n.order }"
                    />
                    <path v-for="(h, k) in TREE.hits" :key="'h' + k" :d="h.path" class="twin" :class="{ seen: tree.step > h.order }" />
                    <circle
                      v-for="(n, k) in TREE.nodes"
                      :key="'n' + k"
                      :cx="n.x" :cy="n.y"
                      :r="n.depth === 3 ? 4 : 7"
                      :class="{ seen: tree.step > n.order, hit: n.hit, cur: tree.step - 1 === n.order }"
                    />
                  </svg>
                  <p class="tree-count"><span><b>{{ tree.searched }}</b> positions searched</span><span class="gold"><b>{{ tree.reused }}</b> reused from the table</span></p>
                  <p class="viz-cap">Depth-first over every legal card. When the same cards remain after a different order of play, the answer comes from the transposition table and that whole branch is skipped.</p>
                </div>

                <!-- Native core: same budget, more deals, tighter estimates -->
                <div v-else-if="layer.key === 'core'" class="viz-core">
                  <p class="viz-sub">Deals finished in the same time budget</p>
                  <div class="lane">
                    <span class="lane-name">Python</span>
                    <span class="lane-track"><i class="one" :style="{ transform: `scaleX(${core.f})` }" /></span>
                    <b>{{ Math.round(core.f * 100) }}% of 1</b>
                  </div>
                  <div class="lane gold">
                    <span class="lane-name">C core</span>
                    <span class="lane-grid"><i v-for="k in 40" :key="k" :class="{ on: k <= core.n }" /></span>
                    <b>{{ core.n }}</b>
                  </div>
                  <p class="viz-sub">Error on each card's estimate</p>
                  <div class="lane">
                    <span class="lane-name">Python</span>
                    <span class="whisk" style="--e: 1"><i /></span>
                    <b>±1</b>
                  </div>
                  <div class="lane gold">
                    <span class="lane-name">C core</span>
                    <span class="whisk" style="--e: .16"><i /></span>
                    <b>±0.16</b>
                  </div>
                  <p class="viz-cap">Error shrinks with the square root of the deals, so 40 times the deals is about 6 times tighter. The WebAssembly build keeps about 80% of native speed.</p>
                </div>
              </div>

              <div class="panel-copy">
                <h3>{{ layer.name }}</h3>
                <p>{{ layer.body }}</p>
                <p class="panel-file"><code>{{ layer.file }}</code></p>
              </div>
            </div>
          </Transition>
        </div>
      </div>
    </section>

    <!-- EVALUATION -->
    <section v-reveal class="evaluate">
      <div class="evaluate-copy">
        <p class="kicker">03 · Evaluation</p>
        <h2>Nothing ships<br>on a hunch.</h2>
        <ol class="method">
          <li v-for="(m, i) in METHOD" :key="m.title" :style="{ '--i': i }">
            <strong>{{ m.title }}</strong>
            <span>{{ m.body }}</span>
          </li>
        </ol>
      </div>

      <figure class="seq">
        <svg viewBox="0 0 560 340" role="img" aria-label="Sequential test: v2 against v1 passed at the third of ten planned looks, then confirmed on unseen deals">
          <line :x1="SEQ.x0" :x2="SEQ.x1" :y1="SEQ.zero" :y2="SEQ.zero" class="zero" />
          <text :x="SEQ.x0 - 8" :y="SEQ.zero + 4" text-anchor="end" class="tick">0</text>
          <text :x="SEQ.x0 - 8" :y="SEQ.y(20) + 4" text-anchor="end" class="tick">+20</text>
          <text :x="SEQ.x0 - 8" :y="SEQ.y(-20) + 4" text-anchor="end" class="tick">−20</text>
          <g v-for="b in SEQ.bars" :key="b.label" class="seq-bar" :class="b.kind" :style="{ '--d': b.delay + 's' }">
            <line :x1="b.x" :x2="b.x" :y1="b.top" :y2="b.bottom" class="whisker" />
            <line :x1="b.x - 9" :x2="b.x + 9" :y1="b.top" :y2="b.top" class="cap" />
            <line :x1="b.x - 9" :x2="b.x + 9" :y1="b.bottom" :y2="b.bottom" class="cap" />
            <circle v-if="b.mid !== null" :cx="b.x" :cy="b.mid" r="5" />
            <text :x="b.x" y="326" text-anchor="middle" class="tick">{{ b.label }}</text>
          </g>
          <g class="stamp" :style="{ '--d': '2.1s' }">
            <text :x="SEQ.bars[2].x + 16" :y="SEQ.bars[2].top - 10">GATE PASSED</text>
          </g>
        </svg>
        <figcaption>
          <b>v2 against v1.</b> Points per game with the planned sequential margin. Stopped at the third of ten looks at +9.93 ± 7.56, then confirmed on unseen deals at <b>+11.37 ± 4.35</b>. Margins follow the O'Brien–Fleming plan; the first two point estimates are approximate.
        </figcaption>
      </figure>
      <div class="league">
        <div class="league-head">
          <h3>Against public Oh Hell bots</h3>
          <p>500 games at five-player tables, every seat rotation. Mean points per game.</p>
        </div>
        <ul class="league-bars">
          <li v-for="(b, i) in LEAGUE" :key="b.name" :class="{ me: b.me }" :style="{ '--v': b.points / 150, '--i': i }">
            <span class="lb-name">{{ b.name }}</span>
            <span class="lb-track"><i /></span>
            <span class="lb-val">{{ b.points.toFixed(1) }}</span>
          </li>
        </ul>
        <p class="league-note">Public bots were adapted to these rules (bowers, down/blind/up). This shows strength within this lineup, not against the originals on their native rules.</p>
      </div>

    </section>

    <!-- SYSTEMS -->
    <section v-reveal class="engine">
      <div class="engine-head">
        <p class="kicker">04 · Systems</p>
        <h2>Python and C,<br>with a browser tab for a server.</h2>
      </div>
      <ol class="flow">
        <li v-for="(n, i) in FLOW" :key="n.title" :style="{ '--i': i }">
          <span class="flow-tag">{{ n.tag }}</span>
          <strong>{{ n.title }}</strong>
          <span class="flow-sub">{{ n.sub }}</span>
          <span v-if="i < FLOW.length - 1" class="flow-wire" aria-hidden="true"><i /><i /><i /></span>
        </li>
      </ol>
      <ul class="facts">
        <li v-for="(f, i) in FACTS" :key="f.k" :style="{ '--i': i }"><b>{{ f.k }}</b><span>{{ f.v }}</span></li>
      </ul>
    </section>

    <!-- SKILLS -->
    <section v-reveal class="skills">
      <p class="kicker">05 · What it exercises</p>
      <div class="skill-grid">
        <div v-for="(g, i) in SKILLS" :key="g.area" class="skill" :style="{ '--i': i }">
          <h3>{{ g.area }}</h3>
          <ul><li v-for="s in g.items" :key="s">{{ s }}</li></ul>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import HoverCanvas from '../components/previews/HoverCanvas.vue'
import { drawDecision, DECISION_STEPS } from '../components/previews/ohHellScene'
import { RANKS, SUITS, atlasUrl } from '../components/previews/ohHellCards'

defineProps({ project: { type: Object, required: true } })

const cardBg = (c) => ({
  backgroundImage: `url(${atlasUrl})`,
  backgroundPosition: `${(RANKS.indexOf(c.r) / 12) * 100}% ${(SUITS.indexOf(c.s) / 3) * 100}%`
})
const reduceMotion = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

// ---------- Scroll-in reveals ----------
const io = typeof window !== 'undefined' && 'IntersectionObserver' in window
  ? new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target) }
    }
  }, { threshold: 0.18 })
  : null
const vReveal = {
  mounted (el) { io ? io.observe(el) : el.classList.add('in') },
  beforeUnmount (el) { io?.unobserve(el) }
}

// ---------- Hero ----------
// Your known cards in the middle, flanked by the hidden ones the bot has to reason about.
const heroCards = [
  { r: 'x1', s: 'S', hidden: true },
  { r: 'A', s: 'S' },
  { r: 'J', s: 'H' },
  { r: 'J', s: 'D' },
  { r: 'x2', s: 'S', hidden: true }
]
const HERO_STATS = [
  { label: 'C core vs Python', value: 40, unit: '×' },
  { label: 'Tests', value: 295, unit: '' },
  { label: 'Logged experiments', value: 75, unit: '' },
  { label: 'Game servers', value: 0, unit: '' }
]
const statsP = ref(reduceMotion ? 1 : 0)

const heroEl = ref(null)
const pointer = ref({ x: 0.5, y: 0.45 })
const heroVars = computed(() => ({
  '--mx': `${pointer.value.x * 100}%`,
  '--my': `${pointer.value.y * 100}%`,
  '--tx': (pointer.value.x - 0.5).toFixed(3),
  '--ty': (pointer.value.y - 0.5).toFixed(3)
}))
function onHeroMove (e) {
  const r = heroEl.value.getBoundingClientRect()
  pointer.value = { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height }
}
function onHeroLeave () { pointer.value = { x: 0.5, y: 0.45 } }

function magnet (e) {
  const el = e.currentTarget
  const r = el.getBoundingClientRect()
  el.style.setProperty('--mx', `${(e.clientX - r.left - r.width / 2) * 0.3}px`)
  el.style.setProperty('--my', `${(e.clientY - r.top - r.height / 2) * 0.4}px`)
}
function unmagnet (e) {
  e.currentTarget.style.setProperty('--mx', '0px')
  e.currentTarget.style.setProperty('--my', '0px')
}

// ---------- Decision (scroll-scrubbed) ----------
const STEPS = [
  { title: 'Observe', code: 'engine.py', body: 'The bot gets exactly what its seat can see: its hand, the trump card, every bid, the cards played, and which suits each player has shown they lack.' },
  { title: 'Hypothesise', code: 'belief.py', body: 'The unseen cards are dealt over and over in ways that respect those facts. At longer thinking times, each deal is weighted by how well it explains the bids and plays.' },
  { title: 'Search', code: 'core.c', body: 'Each deal is played out with the networks as a prior, for as long as the time budget allows. More deals mean tighter estimates. Near the end of a round, sampling hands over to exact search.' },
  { title: 'Decide', code: 'simulation.py', body: 'Scores are averaged over deals for every legal card, and the best one is played. The in-game advisor shows the same numbers.' }
]
// Each scroll zone triggers its own clip, which plays in real time (steps 2 and 3 loop
// until the next zone) instead of scrubbing with the scroll position.
const decideEl = ref(null)
const decideP = ref(0)
const decideVisible = ref(false)
const stepIndex = computed(() => Math.min(DECISION_STEPS - 1, Math.floor(decideP.value * DECISION_STEPS)))
let wallNow = 0
let stepStart = 0
watch(stepIndex, () => { stepStart = wallNow })
function drawDecisionLive (ctx, w, h, time) {
  wallNow = time
  drawDecision(ctx, w, h, { step: stepIndex.value, p: reduceMotion ? 99 : time - stepStart, wall: time })
}
drawDecisionLive.ready = drawDecision.ready
function goToStep (i) {
  const el = decideEl.value
  if (!el) return
  const top = el.getBoundingClientRect().top + window.scrollY
  const travel = el.offsetHeight - window.innerHeight
  window.scrollTo({ top: top + travel * (i + 0.5) / DECISION_STEPS, behavior: reduceMotion ? 'auto' : 'smooth' })
}

// ---------- Inside the bot ----------
const LAYERS = [
  {
    key: 'belief', name: 'Belief sampler', lang: 'Python + C', file: 'ohhell/belief.py',
    body: 'Deals the hidden cards under the hard constraints (hand sizes, suits a player has shown they lack), then reweights the deals by how well they explain the bids and plays so far, using importance resampling. Hands are 64-bit bitmasks, so dealing and checking constraints stays cheap.'
  },
  {
    key: 'nets', name: 'Policy networks', lang: 'NumPy', file: 'ohhell/learn/nn.py',
    body: 'Bid and play networks written from scratch in NumPy, including the Adam optimiser: bid 98→192→96→11, play 241→320→160→1. They act as a prior, steering where the search spends its deals.'
  },
  {
    key: 'selfplay', name: 'Self-play training', lang: 'Python', file: 'ohhell/learn/selfplay.py',
    body: 'Policy iteration. The networks take about 60% of the seats; every option at sampled decisions is labelled by finishing the round, then the networks are refit. Each of the four iterations produced around 550k bid and 635k play examples.'
  },
  {
    key: 'endgame', name: 'Exact endgame', lang: 'C', file: 'ohhell/native/core.c',
    body: 'Once few enough cards remain, sampling gives way to exact search over each deal. A transposition table means a position reached by different move orders is solved only once.'
  },
  {
    key: 'core', name: 'Native core', lang: 'C → WebAssembly', file: 'ohhell/native/core.c',
    body: 'The hot loops (dealing, play-outs and search) are 2,400 lines of C behind a Python interface, with a pure-Python fallback. Natively the C core is about 40 times faster. Each build is tagged with a SHA-256 of its source, so the loaded binary always matches the code.'
  }
]
const layerIndex = ref(0)
const layerUser = ref(false)
const layer = computed(() => LAYERS[layerIndex.value])
function pickLayer (i) { layerUser.value = true; layerIndex.value = i }
const LAYER_SECONDS = 10

const rnd = (n) => { const x = Math.sin(n * 91.7 + 13.1) * 43758.5453; return x - Math.floor(x) }
const shuffled = (list, seed) => {
  const a = list.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd(seed * 31 + i) * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// One clock for the active component's walkthrough; restarts when the tab changes.
const insideEl = ref(null)
let insideVisible = false
const vizT = ref(reduceMotion ? 6 : 0)
let vizTimer = 0
watch(layerIndex, () => { if (!reduceMotion) vizT.value = 0 })

// Belief sampler: West has shown out of spades (hard fact), North bid zero (soft evidence).
const BELIEF_STEPS = ['Deal around the hard facts', 'Weight by the bids', 'Resample by weight']
const BELIEF_POOL = ['A♠', 'K♠', '9♠', 'Q♥', '6♥', 'J♣', '10♣', '4♣', 'A♦', '8♦', '2♦', '5♥'].map((label) => ({
  label, red: /[♥♦]/.test(label), spade: label.endsWith('♠'), honour: /^[AKQJ]/.test(label)
}))
const WEIGHT_BY_HONOURS = [1, 0.45, 0.18, 0.06]
function beliefSample (idx) {
  const pool = shuffled(BELIEF_POOL, idx + 1)
  const west = pool.filter((c) => !c.spade).slice(0, 3)
  const rest = pool.filter((c) => !west.includes(c))
  const north = rest.slice(0, 3)
  return { west, north, east: rest.slice(3, 6), weight: WEIGHT_BY_HONOURS[north.filter((c) => c.honour).length] }
}
const BELIEF_PERIOD = 2.4
const belief = computed(() => {
  const idx = Math.floor(vizT.value / BELIEF_PERIOD)
  const phase = Math.min(2, Math.floor((vizT.value % BELIEF_PERIOD) / (BELIEF_PERIOD / 3)))
  const deal = beliefSample(idx)
  const history = []
  for (let k = Math.max(0, idx - 17); k < idx + (phase === 2 ? 1 : 0); k++) history.push({ idx: k, weight: beliefSample(k).weight })
  return {
    idx,
    phase,
    weight: deal.weight,
    history,
    rows: [
      { seat: 'West', fact: 'no ♠', cards: deal.west },
      { seat: 'North', fact: 'bid 0', cards: deal.north, flagHonours: true },
      { seat: 'East', fact: '', cards: deal.east }
    ]
  }
})

// Bid network: inputs -> 192 -> 96 -> one output per bid (five of eleven shown).
const NET = (() => {
  const sizes = [4, 6, 6, 5]
  const xs = [115, 185, 255, 325]
  const cols = sizes.map((n, li) => Array.from({ length: n }, (_, k) => [xs[li], 118 + (k - (n - 1) / 2) * (n > 5 ? 30 : 36), li]))
  const edges = []
  for (let li = 0; li < cols.length - 1; li++) {
    for (const a of cols[li]) for (const b of cols[li + 1]) edges.push([a[0], a[1], b[0], b[1], li])
  }
  const probs = [0.07, 0.22, 0.48, 0.17, 0.06]
  return {
    nodes: cols.flat(),
    edges,
    inputs: ['your hand', 'trump card', 'bids so far', 'seat, hand size'].map((l, k) => [l, cols[0][k][1]]),
    outputs: cols[3].map((n, k) => ({ y: n[1], p: probs[k] })),
    layerLabels: [[115, 'features'], [185, '192'], [255, '96'], [325, 'bids']]
  }
})()
const net = computed(() => ({ stage: Math.floor((vizT.value % 3.6) / 0.45) }))

// Self-play: four laps of play -> label -> refit, with the measured gain per lap.
const SELFPLAY_CYCLE = [
  { label: 'play', x: 200, y: 12, anchor: 'middle' },
  { label: 'label options', x: 248, y: 100, anchor: 'start' },
  { label: 'refit networks', x: 152, y: 100, anchor: 'end' }
]
const SELFPLAY = (() => {
  const vals = [0, 18.7, 22.1, 22.8, 23.5]
  return { dots: vals.map((v, k) => ({ x: 80 + k * 70, y: 268 - v * 5.6, label: k === 0 ? '0' : `+${v}` })) }
})()
const LAP = 1.8
const selfplay = computed(() => {
  const iter = Math.min(4, Math.floor((vizT.value % (LAP * 6)) / LAP))
  return {
    iter,
    stage: Math.floor(((vizT.value % LAP) / LAP) * 3),
    points: SELFPLAY.dots.slice(0, iter + 1).map((d) => `${d.x},${d.y}`).join(' ')
  }
})

// Exact endgame: depth-first order; two positions are transpositions of earlier ones.
const TREE = (() => {
  const spread = [0, 130, 42, 13]
  const nodes = []
  const hits = []
  let order = 0
  const twins = {}
  function visit (x, y, depth, branch, child, px, py) {
    const hit = depth === 2 && ((branch === 1 && child === 2) || (branch === 2 && child === 0))
    const node = { x, y, depth, px, py, order: order++, hit }
    nodes.push(node)
    if (depth === 2 && branch === 0) twins[child] = node
    if (hit) {
      const t = twins[child]
      hits.push({ order: node.order, path: `M ${x} ${y} Q ${(x + t.x) / 2} ${y - 46} ${t.x} ${t.y}` })
      return
    }
    if (depth === 3) return
    for (let c = 0; c < 3; c++) {
      visit(x + (c - 1) * spread[depth + 1], 22 + (depth + 1) * 62, depth + 1, depth === 0 ? c : branch, c, x, y)
    }
  }
  visit(200, 22, 0, 0, 0, 200, 22)
  return { nodes, hits }
})()
const STEP_S = 0.2
const tree = computed(() => {
  const total = TREE.nodes.length
  const step = Math.min(total, Math.floor((vizT.value % (total * STEP_S + 3)) / STEP_S))
  const seen = TREE.nodes.filter((n) => n.order < step)
  return { step, searched: seen.filter((n) => !n.hit).length, reused: seen.filter((n) => n.hit).length }
})

// Native core: one time budget, forty times the batches.
const core = computed(() => {
  const f = Math.min(1, (vizT.value % 5) / 4)
  return { f, n: Math.floor(f * 40) }
})

// ---------- Evaluation ----------
const METHOD = [
  { title: 'Paired deals', body: 'Candidate and baseline play identical cards, so luck of the deal cancels out of the comparison.' },
  { title: 'Sequential testing', body: "An O'Brien–Fleming plan: up to ten looks at 5% overall error, plus a futility stop, so clear results end early without inflating false positives." },
  { title: 'Unseen-deal confirmation', body: 'A "better" verdict has to repeat on deals the run never used before the bot is promoted.' },
  { title: 'Reproducible compute', body: "Long-thinking duels use calibrated deal budgets instead of the wall clock, so a duel replays exactly. An A/A run returns exactly zero." }
]
const SEQ = (() => {
  const x0 = 60
  const x1 = 540
  const y = (v) => 170 - v * 4.4
  const step = (x1 - x0 - 40) / 10
  const C = 22.68 // O'Brien-Fleming margin scale implied by ±7.56 at the third look
  const est = [6.1, 8.4, 9.93]
  const bars = []
  for (let k = 1; k <= 10; k++) {
    const m = C / k
    const x = x0 + (k - 0.5) * step
    if (k <= 3) bars.push({ x, mid: y(est[k - 1]), top: y(est[k - 1] + m), bottom: y(est[k - 1] - m), label: String(k), kind: k === 3 ? 'pass' : 'look', delay: 0.3 + k * 0.5 })
    else bars.push({ x, mid: null, top: y(m), bottom: y(-m), label: String(k), kind: 'planned', delay: 0.2 })
  }
  bars.push({ x: x1 - 10, mid: y(11.37), top: y(11.37 + 4.35), bottom: y(11.37 - 4.35), label: 'confirm', kind: 'confirm', delay: 2.6 })
  return { x0, x1, y, zero: y(0), bars }
})()

const LEAGUE = [
  { name: 'This bot (v2)', points: 147.54, me: true },
  { name: 'Campbell OI', points: 124.92 },
  { name: 'DRL heuristic', points: 64.92 },
  { name: 'Diminishing MCTS', points: 53.3 },
  { name: 'Diminishing MC', points: 40.44 }
]

// ---------- Systems ----------
const FLOW = [
  { tag: 'UI', title: 'React table', sub: 'TypeScript, Vite' },
  { tag: 'Thread', title: 'Web Worker', sub: 'Keeps the UI responsive' },
  { tag: 'Runtime', title: 'Pyodide', sub: 'The Python engine, unchanged' },
  { tag: 'Search', title: 'C core → WASM', sub: 'Built with Emscripten' }
]
const FACTS = [
  { k: 'One codebase', v: 'The same Python package runs the Flask dev server, the training jobs and the browser build.' },
  { k: '~15 MB, once', v: 'Pyodide, NumPy, the models and the core download on first visit and start in a few seconds.' },
  { k: 'Pinned toolchain', v: 'Pyodide 314.0.8 and Emscripten 5.0.3 are upgraded together, since the WASM core must match.' },
  { k: 'CI/CD', v: 'GitHub Actions builds the engine bundle and the frontend, then deploys them with this portfolio.' }
]
const SKILLS = [
  { area: 'Algorithms', items: ['Monte Carlo sampling', 'Importance resampling', 'Exact search with transposition tables', 'Bitboard representations'] },
  { area: 'Machine learning', items: ['MLPs and Adam in raw NumPy', 'Self-play policy iteration', 'Calibrated logistic models', 'Held-out evaluation'] },
  { area: 'Systems', items: ['C performance core', 'WebAssembly via Emscripten', 'Pyodide in a Web Worker', 'Source-hashed native builds'] },
  { area: 'Experimentation', items: ['Paired A/B designs', 'Sequential testing', 'Profiling-led hypotheses', 'Reproducible, logged runs'] },
  { area: 'Delivery', items: ['React + TypeScript UI', '295 automated tests', 'GitHub Actions to Pages', 'Static deploy, no backend'] }
]

// ---------- Scroll loop ----------
const scrollY = ref(0)
let raf = 0
let statsRaf = 0
const sectionProgress = (el) => {
  if (!el) return 0
  const r = el.getBoundingClientRect()
  const travel = r.height - window.innerHeight
  return travel > 0 ? Math.min(1, Math.max(0, -r.top / travel)) : 0
}
function measure () {
  raf = 0
  scrollY.value = window.scrollY
  decideP.value = sectionProgress(decideEl.value)
  decideVisible.value = isOnScreen(decideEl.value)
  insideVisible = isOnScreen(insideEl.value)
}
function isOnScreen (el) {
  if (!el) return false
  const r = el.getBoundingClientRect()
  return r.top < window.innerHeight && r.bottom > 0
}
function onScroll () { if (!raf) raf = requestAnimationFrame(measure) }

onMounted(() => {
  measure()
  window.addEventListener('scroll', onScroll, { passive: true })
  window.addEventListener('resize', onScroll)
  if (!reduceMotion) {
    const t0 = performance.now() + 900
    const tick = (now) => {
      const p = Math.min(1, Math.max(0, (now - t0) / 1400))
      statsP.value = 1 - (1 - p) ** 3
      if (p < 1) statsRaf = requestAnimationFrame(tick)
    }
    statsRaf = requestAnimationFrame(tick)
    // Run the component walkthrough while it is on screen, and tour the components
    // on its own until the visitor takes over.
    vizTimer = setInterval(() => {
      if (!insideVisible) return
      vizT.value += 0.1
      if (!layerUser.value && vizT.value >= LAYER_SECONDS) layerIndex.value = (layerIndex.value + 1) % LAYERS.length
    }, 100)
  }
})

onBeforeUnmount(() => {
  window.removeEventListener('scroll', onScroll)
  window.removeEventListener('resize', onScroll)
  cancelAnimationFrame(raf)
  cancelAnimationFrame(statsRaf)
  clearInterval(vizTimer)
  io?.disconnect()
})
</script>

<style scoped>
.ohp {
  --ink: #050d0a;
  --felt: #12402f;
  --felt-hi: #24664f;
  --brass: #c9ae79;
  --gold: #f0cf8f;
  --cream: #efe6d2;
  --mint: #71cba6;
  --red: #e2725b;
  --line: rgba(201, 174, 121, .22);
  --serif: Georgia, 'Times New Roman', serif;
  background: var(--ink);
  color: var(--cream);
  overflow-x: clip;
  font-size: 1.05rem;
  line-height: 1.7;
}
.ohp h1, .ohp h2, .ohp h3 { font-family: var(--serif); font-weight: 400; letter-spacing: -.01em; margin: 0; }
.ohp h2 { font-size: clamp(2.2rem, 5vw, 4.2rem); line-height: 1.05; }
.ohp p { margin: 0; }
.ohp code { font: .85em ui-monospace, SFMono-Regular, Consolas, monospace; color: var(--mint); }
.ohp a:focus-visible, .ohp button:focus-visible, .ohp summary:focus-visible { outline: 2px solid var(--mint); outline-offset: 4px; }
.kicker { color: var(--mint); font-size: .78rem; letter-spacing: .22em; text-transform: uppercase; margin-bottom: 1.2rem !important; }
section { position: relative; padding: clamp(5rem, 12vw, 10rem) clamp(1rem, 6vw, 6rem); }

.ohc {
  display: block;
  aspect-ratio: 132 / 192;
  background-size: 1300% 400%;
  border-radius: 7% / 4.8%;
  box-shadow: 0 18px 40px rgba(0, 0, 0, .45), 0 2px 6px rgba(0, 0, 0, .3);
}
.ohc.hidden {
  border: 3px solid #fbf7ee;
  background: repeating-linear-gradient(45deg, #b4413f 0 4px, #842a2c 4px 8px);
}

/* ---------------- HERO ---------------- */
.hero {
  position: relative;
  min-height: 100svh;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: end;
  gap: 2rem;
  padding: clamp(1rem, 4vw, 3rem);
  overflow: hidden;
  background:
    radial-gradient(circle at var(--mx) var(--my), rgba(36, 102, 79, .55), transparent 42%),
    radial-gradient(ellipse at 50% 40%, var(--felt) 0%, var(--ink) 70%);
}
.back {
  position: absolute; top: clamp(1rem, 3vw, 2rem); left: clamp(1rem, 4vw, 3rem); z-index: 3;
  font-size: .85rem; letter-spacing: .08em; opacity: .7; transition: opacity .2s;
}
.back:hover { opacity: 1; }
.hero-num {
  position: absolute; top: 50%;
  font: 700 clamp(14rem, 42vw, 40rem)/.8 var(--serif);
  letter-spacing: -.06em;
  pointer-events: none;
  user-select: none;
  animation: numIn 1.6s cubic-bezier(.2, .7, .2, 1) both;
}
.hero-ten {
  left: -3vw;
  color: transparent;
  -webkit-text-stroke: 1px rgba(201, 174, 121, .16);
  transform: translate(calc(var(--tx) * -30px), calc(-62% + var(--sy) * .25px));
}
.hero-one {
  right: 2vw;
  background: linear-gradient(170deg, var(--gold), #8d6d35);
  -webkit-background-clip: text; background-clip: text; color: transparent;
  opacity: .32;
  transform: translate(calc(var(--tx) * -50px), calc(-72% + var(--sy) * -.15px));
  animation-delay: .25s;
}
@keyframes numIn { from { opacity: 0; filter: blur(16px); letter-spacing: .1em; } }

.hero-fan {
  position: absolute; left: 62%; top: 34%;
  width: clamp(84px, 9vw, 128px);
  aspect-ratio: 132 / 192;
  transform: translate(-50%, -50%) perspective(900px) rotateX(calc(var(--ty) * -18deg)) rotateY(calc(var(--tx) * 24deg));
  transform-style: preserve-3d;
  transition: transform .4s cubic-bezier(.2, .7, .2, 1);
  z-index: 2;
}
.hero-card {
  position: absolute; inset: 0 auto auto 0; width: 100%;
  transform-origin: 50% 170%;
  transform: rotate(calc(var(--i) * 11deg)) translateZ(calc(var(--n) * 6px));
  animation: dealIn 1.1s cubic-bezier(.2, .8, .2, 1) backwards;
  animation-delay: calc(.5s + var(--n) * .11s);
  transition: transform .45s cubic-bezier(.2, .8, .2, 1), filter .3s;
}
.hero-card:hover { transform: rotate(calc(var(--i) * 11deg)) translateY(-14%) translateZ(40px); filter: brightness(1.08); }
@keyframes dealIn { from { opacity: 0; transform: translate(40vw, 60vh) rotate(160deg); } }

.hero-copy { position: relative; z-index: 3; max-width: 40rem; padding-bottom: clamp(2rem, 6vh, 4rem); animation: rise 1.2s .9s cubic-bezier(.2, .7, .2, 1) backwards; }
.eyebrow { color: var(--mint); font-size: .74rem; letter-spacing: .2em; text-transform: uppercase; }
.hero h1 { font-size: clamp(2.6rem, 6vw, 5.2rem); line-height: 1.02; margin: .8rem 0 1.2rem; }
.hero h1 em { color: var(--gold); }
.lead { font-size: clamp(1rem, 1.4vw, 1.15rem); line-height: 1.65; opacity: .82; max-width: 36rem; }
@keyframes rise { from { opacity: 0; transform: translateY(30px); } }

.hero-stats {
  position: relative; z-index: 3; margin: 0; padding-bottom: clamp(2rem, 6vh, 4rem);
  display: grid; grid-template-columns: repeat(2, minmax(8rem, auto)); gap: 1.4rem 2.4rem;
  animation: rise 1.2s 1.1s cubic-bezier(.2, .7, .2, 1) backwards;
}
.hero-stats div { border-top: 1px solid var(--line); padding-top: .7rem; }
.hero-stats dt { font-size: .7rem; letter-spacing: .16em; text-transform: uppercase; opacity: .6; }
.hero-stats dd { margin: 0; font: 400 clamp(2rem, 3.4vw, 3rem)/1.1 var(--serif); color: var(--gold); font-variant-numeric: tabular-nums; }
.hero-stats dd span { font-size: .6em; margin-left: .1em; }

.actions { display: flex; flex-wrap: wrap; align-items: center; gap: 1.6rem; margin-top: 2rem; }
.actions.center { justify-content: center; }
.play {
  --mx: 0px; --my: 0px;
  position: relative; display: inline-grid; place-items: center;
  padding: 1rem 1.9rem; border-radius: 999px;
  background: var(--gold); color: var(--ink); font-weight: 700; letter-spacing: .02em;
  transform: translate(var(--mx), var(--my));
  transition: transform .25s cubic-bezier(.2, .8, .2, 1), box-shadow .3s;
  overflow: hidden;
}
.play span { transform: translate(calc(var(--mx) * .3), calc(var(--my) * .3)); transition: transform .25s; }
.play::after {
  content: ''; position: absolute; inset: 0;
  background: linear-gradient(110deg, transparent 30%, rgba(255, 255, 255, .55) 50%, transparent 70%);
  transform: translateX(-120%); animation: sheen 3.6s 2s infinite;
}
.play:hover { box-shadow: 0 0 0 10px rgba(240, 207, 143, .12), 0 20px 50px rgba(240, 207, 143, .25); }
@keyframes sheen { 0%, 70% { transform: translateX(-120%); } 100% { transform: translateX(120%); } }
.link { position: relative; padding: .2rem 0; opacity: .8; transition: opacity .2s; }
.link::after { content: ''; position: absolute; left: 0; right: 0; bottom: 0; height: 1px; background: currentColor; transform: scaleX(.3); transform-origin: left; transition: transform .35s cubic-bezier(.2, .7, .2, 1); }
.link:hover { opacity: 1; }
.link:hover::after { transform: scaleX(1); }

.scroll-cue { position: absolute; left: 50%; bottom: 1.4rem; width: 1px; height: 56px; background: rgba(239, 230, 210, .15); overflow: hidden; }
.scroll-cue span { position: absolute; inset: 0; background: var(--gold); animation: cue 2s infinite cubic-bezier(.6, 0, .4, 1); }
@keyframes cue { from { transform: translateY(-100%); } to { transform: translateY(100%); } }

/* ---------------- DECISION ---------------- */
.decide { height: 400vh; padding: 0; background: radial-gradient(ellipse at 35% 50%, rgba(18, 64, 47, .7), transparent 70%); }
.decide-sticky {
  position: sticky; top: 0; height: 100vh;
  display: grid; grid-template-columns: 1.5fr 1fr; grid-template-rows: auto 1fr auto;
  gap: 1rem clamp(1.5rem, 4vw, 4rem);
  padding: clamp(1.5rem, 5vh, 3rem) clamp(1rem, 5vw, 5rem);
}
.decide-kicker { grid-column: 1 / -1; margin: 0 !important; }
.decide-stage { position: relative; align-self: center; aspect-ratio: 3 / 2; max-height: 72vh; border-radius: 1.2rem; overflow: hidden; box-shadow: 0 40px 100px rgba(0, 0, 0, .55), inset 0 0 0 1px var(--line); }
.decide-steps { list-style: none; margin: 0; padding: 0; align-self: center; display: grid; gap: 1.6rem; }
.decide-steps li { position: relative; padding-left: 1.4rem; opacity: .22; transform: translateX(10px); transition: opacity .5s, transform .5s cubic-bezier(.2, .7, .2, 1); }
.decide-steps li::before { content: ''; position: absolute; left: 0; top: .3rem; bottom: .3rem; width: 2px; background: rgba(239, 230, 210, .2); }
.decide-steps li.on { opacity: 1; transform: none; }
.decide-steps li.on::before { background: var(--gold); box-shadow: 0 0 12px var(--gold); }
.decide-steps li.done { opacity: .45; transform: none; }
.step-n { font-size: .72rem; letter-spacing: .14em; color: var(--mint); }
.decide-steps h3 { font-size: 1.5rem; margin: .1rem 0 .3rem; }
.decide-steps p { font-size: .92rem; opacity: .8; }
.decide-progress { grid-column: 1 / -1; display: grid; grid-template-columns: repeat(4, 1fr); gap: .5rem; }
.decide-progress span { height: 2px; background: rgba(239, 230, 210, .12); position: relative; overflow: hidden; }
.decide-progress span::after { content: ''; position: absolute; inset: 0; background: linear-gradient(90deg, var(--mint), var(--gold)); transform: scaleX(0); transform-origin: left; transition: transform .6s cubic-bezier(.2, .7, .2, 1); }
.decide-progress span.on::after { transform: scaleX(1); }
.step-btn { display: block; width: 100%; text-align: left; background: none; border: 0; padding: 0; color: inherit; font: inherit; cursor: pointer; }
.decide-note { position: absolute; right: clamp(1rem, 5vw, 5rem); bottom: calc(clamp(1.5rem, 5vh, 3rem) + .8rem); font-size: .72rem; opacity: .45; }

/* ---------------- INSIDE THE BOT ---------------- */
.inside-head { max-width: 42rem; }
.inside-head > p:not(.kicker) { opacity: .75; margin-top: 1rem; font-size: 1.15rem; }
.inside-body { display: grid; grid-template-columns: minmax(15rem, 22rem) 1fr; gap: clamp(1.5rem, 4vw, 4rem); margin-top: 3.5rem; }
.layers { display: grid; align-content: start; gap: .3rem; }
.layer {
  position: relative; display: grid; grid-template-columns: 2.4rem 1fr; text-align: left;
  padding: 1rem 1rem 1rem .4rem; border: 0; border-bottom: 1px solid var(--line);
  background: transparent; color: var(--cream); cursor: pointer; overflow: hidden;
  opacity: .5; transition: opacity .3s, padding .4s cubic-bezier(.2, .8, .2, 1);
}
.layer:hover { opacity: .85; }
.layer.on { opacity: 1; padding-left: 1rem; }
.layer.on::before { content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 2px; background: var(--gold); }
.layer-n { grid-row: span 2; font-size: .72rem; letter-spacing: .14em; color: var(--mint); padding-top: .35rem; }
.layer-name { font: 400 1.35rem/1.2 var(--serif); }
.layer-lang { font-size: .75rem; letter-spacing: .1em; text-transform: uppercase; opacity: .55; }
.layer-timer { position: absolute; left: 0; right: 0; bottom: -1px; height: 1px; background: var(--gold); transform-origin: left; transition: transform .1s linear; }

.layer-panel { position: relative; min-height: 26rem; border: 1px solid var(--line); border-radius: 1.2rem; background: radial-gradient(ellipse at 30% 30%, rgba(36, 102, 79, .25), transparent 70%); overflow: hidden; }
.panel-inner { display: grid; grid-template-columns: 1.15fr 1fr; gap: 2rem; align-items: center; padding: clamp(1.4rem, 3vw, 2.6rem); height: 100%; }
.panel-copy h3 { font-size: 2rem; margin-bottom: .8rem; }
.panel-copy p { opacity: .82; font-size: .98rem; }
.panel-file { margin-top: 1.2rem !important; opacity: 1 !important; }
.swap-enter-active, .swap-leave-active { transition: opacity .35s, transform .45s cubic-bezier(.2, .8, .2, 1); }
.swap-enter-from { opacity: 0; transform: translateY(18px); }
.swap-leave-to { opacity: 0; transform: translateY(-12px); }

.viz { min-height: 17rem; display: grid; align-content: center; gap: .9rem; width: 100%; }
.viz svg { width: 100%; height: auto; overflow: visible; }
.viz text { fill: var(--cream); font: 11px ui-monospace, Consolas, monospace; opacity: .7; }
.viz .tick { opacity: .45; }
.viz-cap { font-size: .8rem; line-height: 1.5; opacity: .62; }
.viz-sub { font-size: .7rem; letter-spacing: .14em; text-transform: uppercase; opacity: .55; }

/* Belief sampler */
.viz-steps { list-style: none; margin: 0; padding: 0; display: flex; gap: .4rem; counter-reset: s; }
.viz-steps li { flex: 1; font-size: .68rem; line-height: 1.3; padding: .45rem .5rem; border-radius: .4rem; border: 1px solid var(--line); opacity: .4; transition: opacity .3s, border-color .3s, background .3s; }
.viz-steps li::before { counter-increment: s; content: counter(s) ' '; color: var(--mint); }
.viz-steps li.on { opacity: 1; border-color: var(--gold); background: rgba(240, 207, 143, .08); }
.viz-steps li.done { opacity: .7; }
.belief-deal { display: grid; gap: .45rem; }
.belief-row { display: grid; grid-template-columns: 4.6rem 1fr; align-items: center; gap: .6rem; }
.seat { font-size: .8rem; display: grid; line-height: 1.2; }
.seat small { font-size: .66rem; color: var(--mint); letter-spacing: .06em; }
.chips { display: flex; gap: .35rem; }
.chip {
  min-width: 2.4rem; padding: .3rem .4rem; border-radius: .3rem; text-align: center;
  background: #fbf7ee; color: #1b1b1b; font: 600 .8rem/1 var(--serif);
  box-shadow: 0 3px 8px rgba(0, 0, 0, .35);
  animation: chipIn .35s calc(var(--j) * 55ms) cubic-bezier(.2, .8, .2, 1) backwards;
  transition: box-shadow .3s, transform .3s;
}
.chip.red { color: #b4302b; }
.chip.flag { box-shadow: 0 0 0 2px var(--red), 0 3px 8px rgba(0, 0, 0, .35); transform: translateY(-2px); }
@keyframes chipIn { from { opacity: 0; transform: translate(-30px, -10px) rotate(-12deg); } }
.belief-weight { display: grid; grid-template-columns: 4.6rem 1fr 2.6rem; align-items: center; gap: .6rem; font-size: .75rem; opacity: .4; transition: opacity .3s; }
.belief-weight.on { opacity: 1; }
.wbar { height: 6px; border-radius: 3px; background: rgba(239, 230, 210, .1); overflow: hidden; }
.wbar i { display: block; height: 100%; background: var(--gold); transform-origin: left; transition: transform .5s cubic-bezier(.2, .8, .2, 1); }
.belief-weight b { font: 400 1rem var(--serif); color: var(--gold); text-align: right; }
.belief-hist { display: flex; align-items: flex-end; gap: 3px; height: 2.6rem; border-bottom: 1px solid var(--line); }
.belief-hist span { flex: 1; max-width: 14px; height: calc(var(--w) * 100%); min-height: 2px; background: rgba(113, 203, 166, .45); border-radius: 2px 2px 0 0; animation: grow .4s cubic-bezier(.2, .8, .2, 1) backwards; transform-origin: bottom; }
.belief-hist span.heavy { background: var(--gold); }
@keyframes grow { from { transform: scaleY(0); } }

/* Networks */
.viz-net line { stroke: rgba(113, 203, 166, .12); stroke-width: 1; transition: stroke .3s; }
.viz-net line.live { stroke: rgba(240, 207, 143, .45); stroke-dasharray: 4 6; animation: flow .8s linear infinite; }
.viz-net circle { fill: var(--ink); stroke: var(--mint); stroke-width: 1.5; transition: fill .25s, stroke .25s; }
.viz-net circle.lit { fill: var(--gold); stroke: var(--gold); }
.viz-net .out rect { fill: rgba(113, 203, 166, .6); transform-box: fill-box; transform-origin: left; transform: scaleX(0); transition: transform .5s calc(var(--k) * 60ms) cubic-bezier(.2, .8, .2, 1); }
.viz-net .out.show rect { transform: scaleX(1); }
.viz-net .out.best rect { fill: var(--gold); }
.viz-net .out .pct { opacity: 0; transition: opacity .3s .3s; }
.viz-net .out.show .pct { opacity: .8; }
.viz-net .out.best text { fill: var(--gold); opacity: 1; }
@keyframes flow { to { stroke-dashoffset: -20; } }

/* Self-play */
.viz-selfplay .ring { fill: none; stroke: var(--line); stroke-width: 1.5; }
.viz-selfplay .orbit { transform-origin: 200px 62px; animation: orbit 1.8s linear infinite; }
.viz-selfplay .orbit circle { fill: var(--gold); filter: drop-shadow(0 0 6px var(--gold)); }
.viz-selfplay text.on { fill: var(--gold); opacity: 1; }
.viz-selfplay .iter { font-size: 13px; fill: var(--gold); opacity: 1; }
.viz-selfplay .axis { stroke: rgba(239, 230, 210, .2); }
.viz-selfplay .trace { fill: none; stroke: var(--gold); stroke-width: 2.5; }
.viz-selfplay .pt { opacity: 0; transition: opacity .4s; }
.viz-selfplay .pt.show { opacity: 1; }
.viz-selfplay .pt circle { fill: var(--gold); }
.viz-selfplay .pt text { fill: var(--gold); opacity: 1; font-size: 12px; }
@keyframes orbit { to { transform: rotate(360deg); } }

/* Exact endgame */
.viz-tree line { stroke: rgba(239, 230, 210, .3); opacity: 0; transition: opacity .25s; }
.viz-tree circle { fill: var(--ink); stroke: var(--mint); stroke-width: 1.5; opacity: 0; transition: opacity .25s, fill .25s; }
.viz-tree .seen { opacity: 1; }
.viz-tree circle.cur { fill: var(--mint); }
.viz-tree circle.hit { fill: var(--gold); stroke: var(--gold); }
.viz-tree circle.hit.seen { filter: drop-shadow(0 0 6px var(--gold)); }
.viz-tree .twin { fill: none; stroke: var(--gold); stroke-width: 1.5; stroke-dasharray: 4 4; opacity: 0; transition: opacity .3s; }
.viz-tree .twin.seen { opacity: .9; animation: flow 1s linear infinite; }
.tree-count { display: flex; gap: 1.6rem; font-size: .8rem; opacity: .8; }
.tree-count b { font: 400 1.4rem var(--serif); margin-right: .35rem; font-variant-numeric: tabular-nums; }
.tree-count .gold b { color: var(--gold); }

/* Native core */
.viz-core { display: grid; gap: .7rem; }
.lane { display: grid; grid-template-columns: 4.2rem 1fr 4.6rem; align-items: center; gap: .7rem; font-size: .8rem; }
.lane b { font: 400 1rem var(--serif); text-align: right; font-variant-numeric: tabular-nums; }
.lane.gold b, .lane.gold .lane-name { color: var(--gold); }
.lane-track { height: 12px; border-radius: 3px; background: rgba(239, 230, 210, .08); overflow: hidden; }
.lane-track .one { display: block; height: 100%; background: rgba(113, 203, 166, .6); transform-origin: left; }
.lane-grid { display: grid; grid-template-columns: repeat(20, 1fr); gap: 2px; }
.lane-grid i { height: 5px; border-radius: 1px; background: rgba(239, 230, 210, .08); transition: background .15s; }
.lane-grid i.on { background: var(--gold); }
.whisk { position: relative; height: 12px; }
.whisk::before { content: ''; position: absolute; left: 50%; top: 0; bottom: 0; width: 2px; margin-left: -1px; background: var(--cream); opacity: .6; }
.whisk i { position: absolute; top: 50%; left: 50%; height: 2px; width: calc(var(--e) * 100%); background: var(--mint); transform: translate(-50%, -50%); }
.whisk i::before, .whisk i::after { content: ''; position: absolute; top: -4px; width: 2px; height: 10px; background: inherit; }
.whisk i::before { left: 0; }
.whisk i::after { right: 0; }
.lane.gold .whisk i { background: var(--gold); }

/* ---------------- EVALUATION ---------------- */
.evaluate { display: grid; grid-template-columns: minmax(18rem, 30rem) 1fr; gap: clamp(2rem, 6vw, 6rem); align-items: center; background: linear-gradient(180deg, transparent, rgba(18, 64, 47, .3) 50%, transparent); }
.method { list-style: none; padding: 0; margin: 2.4rem 0 0; display: grid; gap: 1.3rem; counter-reset: m; }
.method li { position: relative; padding-left: 2.6rem; display: grid; gap: .2rem; opacity: 0; transform: translateY(16px); transition: opacity .7s calc(.3s + var(--i) * .12s), transform .7s calc(.3s + var(--i) * .12s) cubic-bezier(.2, .7, .2, 1); }
.evaluate.in .method li { opacity: 1; transform: none; }
.method li::before { counter-increment: m; content: '0' counter(m); position: absolute; left: 0; top: .15rem; font-size: .72rem; letter-spacing: .14em; color: var(--mint); }
.method strong { font: 400 1.25rem var(--serif); }
.method span { font-size: .93rem; opacity: .75; }

.seq { margin: 0; }
.seq svg { width: 100%; height: auto; overflow: visible; }
.seq .zero { stroke: rgba(239, 230, 210, .3); stroke-dasharray: 4 6; }
.seq .tick { fill: var(--cream); opacity: .5; font: 11px ui-monospace, Consolas, monospace; }
.seq-bar { opacity: 0; transform: translateY(10px); transition: opacity .6s var(--d), transform .6s var(--d) cubic-bezier(.2, .7, .2, 1); }
.evaluate.in .seq-bar { opacity: 1; transform: none; }
.seq-bar .whisker, .seq-bar .cap { stroke: var(--cream); stroke-width: 2; }
.seq-bar circle { fill: var(--cream); }
.seq-bar.planned .whisker, .seq-bar.planned .cap { stroke: rgba(239, 230, 210, .14); stroke-dasharray: 3 4; }
.evaluate.in .seq-bar.planned { opacity: 1; }
.seq-bar.pass .whisker, .seq-bar.pass .cap { stroke: var(--gold); }
.seq-bar.pass circle { fill: var(--gold); }
.seq-bar.confirm .whisker, .seq-bar.confirm .cap { stroke: var(--mint); }
.seq-bar.confirm circle { fill: var(--mint); }
.stamp text { fill: var(--gold); font: 700 12px system-ui, sans-serif; letter-spacing: .16em; }
.stamp { opacity: 0; transition: opacity .5s var(--d); }
.evaluate.in .stamp { opacity: 1; }
.seq figcaption { font-size: .86rem; opacity: .7; margin-top: 1rem; max-width: 36rem; }
.seq figcaption b { color: var(--gold); font-weight: 600; }

/* League (inside evaluation) */
.league { grid-column: 1 / -1; margin-top: clamp(3rem, 6vw, 5rem); display: grid; grid-template-columns: minmax(14rem, 22rem) 1fr; gap: 1rem clamp(2rem, 5vw, 5rem); }
.league-head h3 { font-size: 1.7rem; }
.league-head p { opacity: .7; font-size: .92rem; margin-top: .5rem !important; }
.league-bars { list-style: none; margin: 0; padding: 0; display: grid; gap: .9rem; }
.league-bars li { display: grid; grid-template-columns: 9rem 1fr 3.5rem; align-items: center; gap: 1rem; font-size: .9rem; }
.lb-track { height: 10px; border-radius: 5px; background: rgba(239, 230, 210, .06); overflow: hidden; }
.lb-track i { display: block; height: 100%; width: calc(var(--v) * 100%); border-radius: 5px; background: rgba(113, 203, 166, .45); transform: scaleX(0); transform-origin: left; transition: transform 1.2s calc(.3s + var(--i) * .1s) cubic-bezier(.2, .8, .2, 1); }
.evaluate.in .lb-track i { transform: scaleX(1); }
.league-bars li.me { color: var(--gold); font-weight: 600; }
.league-bars li.me .lb-track i { background: linear-gradient(90deg, var(--brass), var(--gold)); box-shadow: 0 0 18px rgba(240, 207, 143, .35); }
.lb-val { text-align: right; font-variant-numeric: tabular-nums; }
.league-note { grid-column: 2; font-size: .78rem; opacity: .5; }


/* ---------------- SYSTEMS ---------------- */
.engine-head { max-width: 40rem; }
.flow { list-style: none; padding: 0; margin: 4rem 0 2rem; display: grid; grid-template-columns: repeat(4, 1fr); gap: clamp(1rem, 3vw, 3rem); }
.flow li {
  position: relative; display: grid; gap: .3rem; padding: 1.4rem 1.2rem;
  border: 1px solid var(--line); border-radius: 1rem; background: rgba(239, 230, 210, .02);
  transform: translateY(calc(var(--i) * 1.6rem + 30px)); opacity: 0;
  transition: transform .9s cubic-bezier(.2, .7, .2, 1) calc(var(--i) * .12s), opacity .9s calc(var(--i) * .12s), border-color .3s;
}
.engine.in .flow li { transform: translateY(calc(var(--i) * 1.6rem)); opacity: 1; }
.flow li:hover { border-color: var(--gold); }
.flow-tag { font-size: .7rem; letter-spacing: .2em; text-transform: uppercase; color: var(--mint); }
.flow strong { font: 400 1.35rem var(--serif); }
.flow-sub { font-size: .85rem; opacity: .65; }
.flow-wire { position: absolute; left: 100%; top: 50%; width: clamp(1rem, 3vw, 3rem); height: 1px; background: rgba(201, 174, 121, .3); transform: translateY(.8rem) rotate(28deg); transform-origin: left; }
.flow-wire i { position: absolute; top: -2px; left: 0; width: 5px; height: 5px; border-radius: 50%; background: var(--gold); box-shadow: 0 0 8px var(--gold); animation: packet 1.8s linear infinite; }
.flow-wire i:nth-child(2) { animation-delay: .6s; }
.flow-wire i:nth-child(3) { animation-delay: 1.2s; }
@keyframes packet { from { left: 0; opacity: 0; } 20% { opacity: 1; } 80% { opacity: 1; } to { left: 100%; opacity: 0; } }
.facts { list-style: none; padding: 0; margin: 5rem 0 0; display: grid; grid-template-columns: repeat(4, 1fr); gap: 2rem; }
.facts li { display: grid; gap: .4rem; border-top: 1px solid var(--line); padding-top: 1rem; opacity: 0; transform: translateY(14px); transition: opacity .7s calc(.6s + var(--i) * .1s), transform .7s calc(.6s + var(--i) * .1s); }
.engine.in .facts li { opacity: 1; transform: none; }
.facts b { font: 400 1.25rem var(--serif); color: var(--gold); }
.facts span { font-size: .88rem; opacity: .72; }

/* ---------------- SKILLS ---------------- */
.skill-grid { display: grid; grid-template-columns: repeat(5, 1fr); border-top: 1px solid var(--line); }
.skill { padding: 1.6rem 1.2rem 1.6rem 0; border-right: 1px solid var(--line); opacity: 0; transform: translateY(20px); transition: opacity .7s calc(var(--i) * .1s), transform .7s calc(var(--i) * .1s) cubic-bezier(.2, .7, .2, 1), background .3s; }
.skill + .skill { padding-left: 1.2rem; }
.skill:last-child { border-right: 0; }
.skills.in .skill { opacity: 1; transform: none; }
.skill:hover { background: rgba(36, 102, 79, .18); }
.skill h3 { font-size: 1.35rem; color: var(--gold); margin-bottom: 1rem; }
.skill ul { list-style: none; margin: 0; padding: 0; display: grid; gap: .5rem; font-size: .9rem; opacity: .82; }
.skill li::before { content: '—'; color: var(--mint); margin-right: .5rem; }

/* Section heading reveals */
.inside-head, .evaluate-copy h2, .engine-head { opacity: 0; transform: translateY(40px); transition: opacity 1s, transform 1.1s cubic-bezier(.2, .7, .2, 1); }
.in .inside-head, .in .evaluate-copy h2, .in .engine-head { opacity: 1; transform: none; }

/* ---------------- Responsive ---------------- */
@media (max-width: 1100px) {
  .skill-grid { grid-template-columns: repeat(3, 1fr); }
  .skill:nth-child(3) { border-right: 0; }
  .skill:nth-child(4) { padding-left: 0; }
  .facts { grid-template-columns: 1fr 1fr; }
  .panel-inner { grid-template-columns: 1fr; }
}
@media (max-width: 900px) {
  .hero { grid-template-columns: 1fr; }
  .hero-stats { padding-bottom: 4rem; }
  .hero-copy { padding-bottom: 0; }
  .inside-body, .evaluate, .league { grid-template-columns: 1fr; }
  .league-note { grid-column: 1; }
  .layers { grid-auto-flow: column; grid-auto-columns: minmax(10rem, 1fr); overflow-x: auto; scrollbar-width: none; }
  .layer { border-bottom: 0; border-top: 1px solid var(--line); }
  .flow { grid-template-columns: 1fr 1fr; }
  .flow li, .engine.in .flow li { transform: none; }
  .flow-wire { display: none; }
  .decide-sticky { grid-template-columns: 1fr; grid-template-rows: auto auto 1fr auto; }
  .decide-stage { max-height: 46vh; width: 100%; }
  .decide-steps { align-self: start; }
  .decide-steps li:not(.on) { display: none; }
  .decide-note { display: none; }
}
@media (max-width: 600px) {
  .hero { padding-top: 16rem; }
  .hero-fan { left: 50%; top: 9rem; width: 74px; }
  .hero-ten, .hero-one { top: 10rem; font-size: 12rem; }
  .flow, .facts { grid-template-columns: 1fr; }
  .skill-grid { grid-template-columns: 1fr 1fr; }
  .skill, .skill + .skill { padding: 1.2rem .8rem 1.2rem 0; border-right: 0; }
  .league-bars li { grid-template-columns: 7rem 1fr 3rem; }
}

@media (prefers-reduced-motion: reduce) {
  .ohp *, .ohp *::before, .ohp *::after { animation: none !important; transition-duration: .01ms !important; transition-delay: 0s !important; }
  .hero-ten, .hero-one { transform: translateY(-55%); }
}
</style>
