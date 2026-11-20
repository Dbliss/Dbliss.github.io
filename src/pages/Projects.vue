<template>
  <section class="pj">
    <div class="pj-grid">
      <ProjectCard
        v-for="p in list"
        :key="p.slug"
        :ref="card => setCard(p.slug, card)"
        :project="p"
        :class="{ 'is-full': fullRow.has(p.slug) }"
        :mobile-preview="mobilePreview"
        :playback-active="activePreview === p.slug"
        @hover="on => setHover(p.slug, on)"
      />
    </div>
  </section>
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { projects as all } from '../data/projects'
import ProjectCard from '../components/ProjectCard.vue'

const list = all

// Cards that span both desktop columns: anything flagged `wide`, plus a final
// card left alone on its row so the grid never ends on a half-empty row.
const fullRow = (() => {
  const full = new Set()
  let col = 0
  list.forEach((p, i) => {
    const last = i === list.length - 1
    if (p.wide || (last && col === 0)) {
      full.add(p.slug)
      col = 0
    } else {
      col = (col + 1) % 2
    }
  })
  return full
})()

const mobilePreview = ref(false)
const activePreview = ref(null)
const CYCLE_MS = 15000
const hovered = ref(null)
const cycled = ref(null)
let cycleTimer = 0
const cards = new Map()
let previewQuery
let frame = 0

function setCard(slug, card) {
  if (card) cards.set(slug, card.$el)
  else cards.delete(slug)
  schedulePreview()
}

function visibleSlugs() {
  return list
    .filter((p) => {
      const rect = cards.get(p.slug)?.getBoundingClientRect()
      return rect && rect.bottom > 0 && rect.top < window.innerHeight
    })
    .map((p) => p.slug)
}

function closestToCenter(slugs) {
  const center = window.innerHeight / 2
  let closest = null
  let distance = Infinity
  for (const slug of slugs) {
    const rect = cards.get(slug).getBoundingClientRect()
    const delta = Math.abs(rect.top + rect.height / 2 - center)
    if (delta < distance) {
      closest = slug
      distance = delta
    }
  }
  return closest
}

// Desktop: the hovered card plays; otherwise one on-screen card plays at a time
// and hands over to the next on-screen card every CYCLE_MS.
// Mobile: the card nearest the middle of the screen plays.
function updatePreview() {
  frame = 0
  if (document.hidden) {
    stopCycle()
    activePreview.value = null
    return
  }
  const visible = visibleSlugs()
  if (mobilePreview.value) {
    stopCycle()
    activePreview.value = closestToCenter(visible)
    return
  }
  if (!visible.includes(cycled.value)) setCycled(closestToCenter(visible))
  else if (!cycleTimer) startCycle()
  activePreview.value = hovered.value || cycled.value
}

function stopCycle() {
  clearTimeout(cycleTimer)
  cycleTimer = 0
}

function startCycle() {
  stopCycle()
  if (mobilePreview.value || hovered.value || !cycled.value || document.hidden) return
  cycleTimer = setTimeout(advanceCycle, CYCLE_MS)
}

function setCycled(slug) {
  cycled.value = slug
  startCycle()
}

function advanceCycle() {
  cycleTimer = 0
  const visible = visibleSlugs()
  setCycled(visible[(visible.indexOf(cycled.value) + 1) % visible.length] ?? null)
  schedulePreview()
}

function setHover(slug, on) {
  if (on) {
    hovered.value = slug
  } else if (hovered.value === slug) {
    // Carry on from the card the pointer just left, with a fresh full turn.
    hovered.value = null
    cycled.value = slug
  }
  startCycle()
  schedulePreview()
}

function schedulePreview() {
  if (!frame) frame = requestAnimationFrame(updatePreview)
}

function updatePreviewMode() {
  mobilePreview.value = previewQuery.matches
  schedulePreview()
}

onMounted(() => {
  previewQuery = window.matchMedia('(max-width: 760px), (hover: none)')
  updatePreviewMode()
  previewQuery.addEventListener('change', updatePreviewMode)
  window.addEventListener('scroll', schedulePreview, { passive: true })
  window.addEventListener('resize', schedulePreview)
  document.addEventListener('visibilitychange', schedulePreview)
})

onBeforeUnmount(() => {
  cancelAnimationFrame(frame)
  stopCycle()
  previewQuery?.removeEventListener('change', updatePreviewMode)
  window.removeEventListener('scroll', schedulePreview)
  window.removeEventListener('resize', schedulePreview)
  document.removeEventListener('visibilitychange', schedulePreview)
})
</script>

<style scoped>
.pj {
  background: #fff;
  padding: 8px 0;
}

.pj-grid {
  position: relative;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}
/* Wide projects, and an odd one out at the end, run the full width as a banner */
.pj-grid > .is-full { grid-column: 1 / -1; aspect-ratio: 32 / 11; }

@media (max-width: 760px) {
  .pj-grid { grid-template-columns: 1fr; }
  .pj-grid > .is-full { aspect-ratio: 16 / 11; }
}
</style>
