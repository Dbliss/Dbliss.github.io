<template>
  <div ref="root" :class="['pp', DARK.has(slug) && 'pp--dark']" :data-slug="slug" aria-hidden="true">
    <!-- Sportslux: the real loading screen, best design so far updating live -->
    <video
      v-if="slug === 'sportslux'"
      ref="video"
      class="pp-media"
      :src="sportsluxVideo"
      :poster="sportsluxPoster"
      muted
      loop
      playsinline
      preload="none"
    />

    <!-- Chess engine: bot vs bot games played out live -->
    <ChessBotPreview v-else-if="slug === 'chessEngine'" />

    <!-- Esports predictor: an unscented Kalman filter tracking a team rating -->
    <UkfPreview v-else-if="slug === 'lol-match-predictor'" />

    <!-- Sports booking: calendar slots getting booked -->
    <svg v-else-if="slug === 'sports-booking'" viewBox="0 0 320 150" class="pp-svg">
      <g v-for="d in 7" :key="'d' + d">
        <text :x="44 + (d - 1) * 36 + 14" y="22" text-anchor="middle" class="pp-label">{{ 'MTWTFSS'[d - 1] }}</text>
      </g>
      <rect
        v-for="(c, i) in calendarCells"
        :key="i"
        :x="44 + c.col * 36"
        :y="32 + c.row * 27"
        width="30"
        height="21"
        rx="5"
        :class="['pp-cell', c.booked && 'is-booked']"
        :style="c.booked ? { animationDelay: c.delay + 's' } : null"
      />
    </svg>

    <!-- Curated wellness: AI shopping assistant chat -->
    <div v-else-if="slug === 'curated-wellness'" class="pp-chat">
      <div class="pp-bubble pp-user">Best protein for recovery?</div>
      <div class="pp-slot">
        <div class="pp-bubble pp-bot pp-typing"><span /><span /><span /></div>
        <div class="pp-bubble pp-bot pp-answer">
          <img :src="wellnessImg" alt="" loading="lazy" />
          <span>Whey isolate, 30g post-workout</span>
        </div>
      </div>
    </div>

    <!-- Asset data integration: records flowing through a pipeline -->
    <svg v-else-if="slug === 'asset-data-integration'" viewBox="0 0 320 150" class="pp-svg">
      <path v-for="(p, i) in pipes" :key="'p' + i" :d="p" class="pp-pipe" />
      <g v-for="(y, i) in [30, 75, 120]" :key="'s' + i">
        <rect x="20" :y="y - 13" width="62" height="26" rx="7" class="pp-node" />
        <text x="51" :y="y + 4" text-anchor="middle" class="pp-label">{{ ['CSV', 'API', 'GIS'][i] }}</text>
      </g>
      <rect x="132" y="55" width="62" height="40" rx="9" class="pp-node pp-hub" />
      <text x="163" y="79" text-anchor="middle" class="pp-label pp-hub-text">ETL</text>
      <g transform="translate(250 50)">
        <ellipse cx="25" cy="6" rx="25" ry="7" class="pp-node" />
        <path d="M0 6 v38 a25 7 0 0 0 50 0 v-38" class="pp-node" />
        <path d="M0 19 a25 7 0 0 0 50 0 M0 31 a25 7 0 0 0 50 0" class="pp-pipe" />
      </g>
      <circle v-for="(p, i) in packets" :key="'k' + i" r="4" class="pp-packet">
        <animateMotion :path="p.path" :dur="p.dur + 's'" :begin="p.begin + 's'" repeatCount="indefinite" />
      </circle>
    </svg>

    <!-- Drone: hovering quad with spinning rotors -->
    <svg v-else-if="slug === 'drone'" viewBox="0 0 320 150" class="pp-svg">
      <ellipse cx="160" cy="136" rx="46" ry="5" class="pp-shadow" />
      <g class="pp-hover">
        <line x1="112" y1="58" x2="208" y2="58" class="pp-arm" />
        <line x1="128" y1="48" x2="192" y2="68" class="pp-arm" />
        <rect x="140" y="50" width="40" height="18" rx="8" class="pp-body" />
        <circle cx="160" cy="59" r="3" class="pp-led" />
        <ellipse v-for="(x, i) in [112, 208, 128, 192]" :key="i" :cx="x" :cy="[58, 58, 48, 68][i] - 6" rx="22" ry="3.5" class="pp-rotor" :style="{ animationDelay: i * -0.04 + 's' }" />
        <line x1="150" y1="68" x2="146" y2="80" class="pp-arm" />
        <line x1="170" y1="68" x2="174" y2="80" class="pp-arm" />
      </g>
    </svg>

    <!-- Wealth pathways: diverging net-worth projections -->
    <svg v-else-if="slug === 'wealth-pathways-au'" viewBox="0 0 320 150" class="pp-svg">
      <g class="pp-grid">
        <line v-for="i in 4" :key="'h' + i" x1="30" x2="300" :y1="10 + i * 28" :y2="10 + i * 28" />
      </g>
      <path class="pp-area" d="M30 132 C 120 126, 200 92, 300 20 L300 132 Z" />
      <path class="pp-draw pp-l1" d="M30 132 C 120 126, 200 92, 300 20" />
      <path class="pp-draw pp-l2" d="M30 132 C 120 124, 210 104, 300 62" />
      <path class="pp-draw pp-l3" d="M30 132 C 120 126, 220 116, 300 96" />
      <g class="pp-chip pp-chip-late">
        <rect x="200" y="6" width="92" height="22" rx="11" />
        <text x="246" y="21" text-anchor="middle">Invest + PPOR</text>
      </g>
    </svg>

    <!-- Super Move: furniture packing into a truck -->
    <svg v-else-if="slug === 'super-move'" viewBox="0 0 320 150" class="pp-svg">
      <rect x="40" y="34" width="190" height="92" rx="6" class="pp-truck" />
      <path d="M230 64 h40 l22 26 v36 h-62 z" class="pp-truck" />
      <rect x="244" y="72" width="26" height="18" rx="3" class="pp-window" />
      <circle cx="84" cy="128" r="11" class="pp-wheel" />
      <circle cx="196" cy="128" r="11" class="pp-wheel" />
      <circle cx="264" cy="128" r="11" class="pp-wheel" />
      <rect
        v-for="(b, i) in boxes"
        :key="i"
        :x="b.x"
        :y="b.y"
        :width="b.w"
        :height="b.h"
        rx="3"
        class="pp-box"
        :style="{ animationDelay: i * 0.32 + 's', fillOpacity: 1 - (i % 3) * 0.18 }"
      />
    </svg>

    <!-- Fallback -->
    <div v-else class="pp-fallback" />
  </div>
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'
import sportsluxVideo from '../assets/sportslux/videos/live-optimiser.mp4'
import sportsluxPoster from '../assets/sportslux/videos/live-optimiser.jpg'
import wellnessImg from '../assets/curated-wellness/how-to-protein.jpg'
import UkfPreview from './previews/UkfPreview.vue'
import ChessBotPreview from './previews/ChessBotPreview.vue'

defineProps({
  slug: { type: String, required: true }
})

// Previews drawn on a deep, dark panel (like a product screen) rather than a light wash.
const DARK = new Set(['lol-match-predictor', 'chessEngine', 'asset-data-integration', 'sportslux'])

// The loading-screen capture is large: only fetch / play it while the card is on screen.
const root = ref(null)
const video = ref(null)
let io
onMounted(() => {
  if (!video.value) return
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
  io = new IntersectionObserver(([entry]) => {
    const v = video.value
    if (!v) return
    if (entry.isIntersecting) v.play().catch(() => {})
    else v.pause()
  }, { threshold: 0.25 })
  io.observe(root.value)
})
onBeforeUnmount(() => io?.disconnect())

const bookedSet = new Set([2, 5, 8, 10, 15, 17, 19, 22, 24, 26])
const calendarCells = Array.from({ length: 28 }, (_, i) => ({
  col: i % 7,
  row: Math.floor(i / 7),
  booked: bookedSet.has(i),
  delay: [...bookedSet].indexOf(i) * 0.3
}))

const pipes = [
  'M82 30 C 110 30, 105 66, 132 70',
  'M82 75 L132 75',
  'M82 120 C 110 120, 105 84, 132 80',
  'M194 75 C 220 75, 225 75, 250 75'
]
const packets = [
  { path: 'M82 30 C 110 30, 105 66, 132 70 L194 75 C 220 75, 225 75, 262 75', dur: 2.4, begin: 0 },
  { path: 'M82 75 L132 75 L194 75 C 220 75, 225 75, 262 75', dur: 2, begin: 0.7 },
  { path: 'M82 120 C 110 120, 105 84, 132 80 L194 75 C 220 75, 225 75, 262 75', dur: 2.6, begin: 1.3 }
]

const boxes = [
  { x: 46, y: 80, w: 44, h: 40 },
  { x: 92, y: 92, w: 36, h: 28 },
  { x: 130, y: 70, w: 30, h: 50 },
  { x: 162, y: 96, w: 62, h: 24 },
  { x: 46, y: 50, w: 44, h: 28 },
  { x: 92, y: 62, w: 36, h: 28 },
  { x: 162, y: 68, w: 30, h: 26 },
  { x: 194, y: 40, w: 30, h: 54 },
  { x: 130, y: 40, w: 62, h: 26 },
  { x: 92, y: 40, w: 36, h: 20 }
]
</script>

<style scoped>
.pp {
  position: relative;
  height: 100%;
  overflow: hidden;
  background:
    radial-gradient(120% 90% at 85% 0%, rgba(var(--tone-rgb), .2), transparent 60%),
    linear-gradient(160deg, #fff, rgba(var(--tone-rgb), .08));
  --tone-ink: rgb(var(--tone-rgb));
}
.pp--dark {
  background:
    radial-gradient(90% 120% at 80% 10%, rgba(var(--tone-rgb), .55), transparent 65%),
    radial-gradient(70% 90% at 10% 100%, rgba(var(--tone-rgb), .3), transparent 70%),
    #15143a;
}
.pp-media { width: 100%; height: 100%; object-fit: cover; display: block; }
.pp-svg { width: 100%; height: 100%; display: block; }

/* Pipeline on the dark panel */
.pp--dark .pp-node { fill: rgba(255, 255, 255, .07); stroke: rgba(255, 255, 255, .3); }
.pp--dark .pp-hub { fill: rgba(var(--tone-rgb), .55); stroke: rgba(255, 255, 255, .6); }
.pp--dark .pp-pipe { stroke: rgba(var(--tone-rgb), .75); }
.pp--dark .pp-label { fill: rgba(255, 255, 255, .85); }
.pp--dark .pp-packet { fill: #fff; filter: drop-shadow(0 0 3px rgba(255, 255, 255, .9)); }

.pp-grid line { stroke: rgba(var(--tone-rgb), .14); stroke-width: 1; }
.pp-label { font: 700 10px/1 system-ui, sans-serif; fill: rgba(var(--tone-rgb), .75); letter-spacing: .04em; }
.pp-chip rect { fill: #fff; stroke: rgba(var(--tone-rgb), .35); }
.pp-chip text { font: 800 11px/1 system-ui, sans-serif; fill: var(--tone-ink); }
.pp-chip { animation: pp-fade-loop 5s ease-out infinite; }
.pp-chip-late { animation-delay: .8s; }

/* Line drawing loop */
.pp-draw { fill: none; stroke: var(--tone-ink); stroke-width: 3; stroke-linecap: round; stroke-dasharray: 420; animation: pp-draw 5s ease-in-out infinite; }
@keyframes pp-draw {
  0% { stroke-dashoffset: 420; opacity: 1; }
  45%, 85% { stroke-dashoffset: 0; opacity: 1; }
  100% { stroke-dashoffset: 0; opacity: 0; }
}
.pp-ideal { stroke: rgba(var(--tone-rgb), .35); stroke-width: 1.5; stroke-dasharray: 4 5; }
.pp-dots circle { fill: #fff; stroke: var(--tone-ink); stroke-width: 2; animation: pp-fade-loop 5s ease-out infinite; }
@keyframes pp-fade-loop {
  0%, 8% { opacity: 0; }
  20%, 85% { opacity: 1; }
  100% { opacity: 0; }
}

/* Calendar */
.pp-cell { fill: #fff; stroke: rgba(var(--tone-rgb), .18); }
.pp-cell.is-booked { animation: pp-book 6s ease-out infinite; }
@keyframes pp-book {
  0%, 5% { fill: #fff; }
  12%, 82% { fill: rgba(var(--tone-rgb), .78); stroke: transparent; }
  95%, 100% { fill: #fff; }
}

/* Chat */
.pp-chat { height: 100%; padding: 14px 16px; display: flex; flex-direction: column; gap: 8px; font: 600 12px/1.3 system-ui, sans-serif; }
.pp-bubble { max-width: 78%; padding: 7px 11px; border-radius: 12px; opacity: 0; animation: pp-chat 7s ease-out infinite; }
.pp-user { align-self: flex-end; background: var(--tone-ink); color: #fff; border-bottom-right-radius: 4px; }
.pp-bot { align-self: flex-start; background: #fff; color: #2b3048; border: 1px solid rgba(var(--tone-rgb), .18); border-bottom-left-radius: 4px; }
.pp-slot { position: relative; display: flex; }
.pp-typing { position: absolute; top: 0; left: 0; display: flex; gap: 4px; animation-name: pp-typing; animation-delay: .9s; }
.pp-typing span { width: 6px; height: 6px; border-radius: 50%; background: rgba(var(--tone-rgb), .6); animation: pp-dot 1s ease-in-out infinite; }
.pp-typing span:nth-child(2) { animation-delay: .15s; }
.pp-typing span:nth-child(3) { animation-delay: .3s; }
.pp-answer { display: flex; align-items: center; gap: 8px; animation-delay: 2.1s; }
.pp-answer img { width: 32px; height: 32px; border-radius: 7px; object-fit: cover; }
@keyframes pp-chat {
  0% { opacity: 0; transform: translateY(6px); }
  6%, 88% { opacity: 1; transform: none; }
  100% { opacity: 0; }
}
@keyframes pp-typing {
  0% { opacity: 0; }
  5%, 15% { opacity: 1; }
  18%, 100% { opacity: 0; }
}
@keyframes pp-dot { 50% { transform: translateY(-3px); } }

/* Pipeline */
.pp-pipe { fill: none; stroke: rgba(var(--tone-rgb), .3); stroke-width: 1.6; }
.pp-node { fill: #fff; stroke: rgba(var(--tone-rgb), .4); stroke-width: 1.4; }
.pp-hub { fill: var(--tone-ink); stroke: none; }
.pp-hub-text { fill: #fff; }
.pp-packet { fill: var(--tone-ink); }

/* Drone */
.pp-hover { animation: pp-hover 3.2s ease-in-out infinite; }
@keyframes pp-hover { 50% { transform: translateY(-10px); } }
.pp-arm { stroke: #3a4060; stroke-width: 3; stroke-linecap: round; }
.pp-body { fill: var(--tone-ink); }
.pp-led { fill: #7cf2b0; animation: pp-blink 1.2s steps(2) infinite; }
@keyframes pp-blink { 50% { opacity: .2; } }
.pp-rotor { fill: rgba(var(--tone-rgb), .35); transform-box: fill-box; transform-origin: center; animation: pp-spin .14s linear infinite; }
@keyframes pp-spin { 50% { transform: scaleX(.25); } }
.pp-shadow { fill: rgba(var(--tone-rgb), .18); animation: pp-shadow 3.2s ease-in-out infinite; transform-box: fill-box; transform-origin: center; }
@keyframes pp-shadow { 50% { transform: scaleX(.8); opacity: .6; } }

/* Wealth */
.pp-area { fill: rgba(var(--tone-rgb), .08); animation: pp-fade-loop 5s ease-out infinite; }
.pp-l2 { opacity: .55; stroke-width: 2.4; animation-delay: .25s; }
.pp-l3 { opacity: .3; stroke-width: 2; animation-delay: .5s; }

/* Truck */
.pp-truck { fill: #fff; stroke: rgba(var(--tone-rgb), .45); stroke-width: 2; }
.pp-window { fill: rgba(var(--tone-rgb), .18); }
.pp-wheel { fill: #3a4060; stroke: #fff; stroke-width: 3; }
.pp-box { fill: var(--tone-ink); stroke: #fff; stroke-width: 1.5; animation: pp-drop 6s cubic-bezier(.3, 1.3, .5, 1) infinite both; }
@keyframes pp-drop {
  0% { transform: translateY(-70px); opacity: 0; }
  8%, 82% { transform: none; opacity: 1; }
  92%, 100% { transform: none; opacity: 0; }
}

.pp-fallback { height: 100%; background: linear-gradient(135deg, rgba(var(--tone-rgb), .22), transparent); }

@media (prefers-reduced-motion: reduce) {
  .pp *, .pp { animation: none !important; }
  .pp-bubble, .pp-dots circle, .pp-chip { opacity: 1; }
  .pp-typing { display: none; }
}
</style>
