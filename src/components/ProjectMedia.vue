<template>
  <div :class="['pm', `pm--${kind}`, active && 'is-active']" :data-slug="slug">
    <video
      v-if="kind === 'video'"
      ref="video"
      class="pm-fill"
      :src="media.video"
      muted
      loop
      playsinline
      preload="metadata"
    />

    <img v-else-if="kind === 'image'" class="pm-fill" :src="media.image" alt="" loading="lazy" decoding="async" />

    <BellaPreview v-else-if="kind === 'bella'" :image="media.bella" :active="active" />

    <WealthDashboardPreview v-else-if="kind === 'wealth'" :active="active" />

    <HoverCanvas v-else-if="kind === 'canvas'" :draw="media.draw" :active="active" />

    <ProjectPreview3d v-else-if="kind === '3d'" :kind="media.scene" :active="active" />
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import ProjectPreview3d from './ProjectPreview3d.vue'
import BellaPreview from './previews/BellaPreview.vue'
import HoverCanvas from './previews/HoverCanvas.vue'
import WealthDashboardPreview from './previews/WealthDashboardPreview.vue'
import { drawBoosting } from './previews/boostingScene'
import { drawPipeline } from './previews/pipelineScene'
import { useHoverClock } from './previews/useHoverClock'
import sportsluxRecording from '../assets/sportslux/videos/sportslux-recording.mp4'
import floodlitField from '../assets/sports-booking/floodlit-field.jpg'
import curatedWellness from '../assets/curated-wellness/curated-wellness.png'

const props = defineProps({
  slug: { type: String, required: true },
  // Everything animated on a tile only plays while this is true (the parent card is hovered).
  active: { type: Boolean, default: false }
})

// One place to choose what each project tile shows.
const MEDIA = {
  'lol-match-predictor': { draw: drawBoosting },
  // The media fragment makes the browser show that frame while the video sits paused.
  // trimStart / trimEnd are seconds cut from each end of the recording at playback.
  sportslux: { video: `${sportsluxRecording}#t=5`, rate: 1.5, trimStart: 5, trimEnd: 2 },
  chessEngine: { scene: 'chess' },
  'sports-booking': { image: floodlitField },
  'curated-wellness': { bella: curatedWellness },
  'asset-data-integration': { draw: drawPipeline },
  drone: { scene: 'drone' },
  'wealth-pathways-au': { wealth: true },
  'super-move': { scene: 'furniture' }
}

const media = computed(() => MEDIA[props.slug] || {})
const kind = computed(() => {
  const m = media.value
  if (m.video) return 'video'
  if (m.image) return 'image'
  if (m.bella) return 'bella'
  if (m.wealth) return 'wealth'
  if (m.draw) return 'canvas'
  if (m.scene) return '3d'
  return 'empty'
})

const video = ref(null)

// Checked every frame while hovered, so the cut points land exactly.
useHoverClock(() => props.active, () => {
  const v = video.value
  const { trimStart = 0, trimEnd = 0 } = media.value
  if (!v || !Number.isFinite(v.duration) || (!trimStart && !trimEnd)) return
  if (v.currentTime < trimStart || v.currentTime >= v.duration - trimEnd) v.currentTime = trimStart
})

watch(() => props.active, (active) => {
  const v = video.value
  if (!v) return
  if (active && !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
    v.playbackRate = media.value.rate ?? 1
    v.play().catch(() => {})
  } else {
    v.pause()
  }
})
</script>

<style scoped>
.pm { position: absolute; inset: 0; overflow: hidden; background: #111; }
.pm-fill { width: 100%; height: 100%; object-fit: cover; display: block; }

/* Still images drift slowly towards their top-right corner on hover */
.pm--image .pm-fill { transform-origin: 100% 0; transition: transform 1.2s ease; }
.pm--image.is-active .pm-fill { transform: scale(1.09); transition: transform 9s cubic-bezier(.2, .6, .3, 1); }

@media (prefers-reduced-motion: reduce) {
  .pm--image .pm-fill, .pm--image.is-active .pm-fill { transform: none; transition: none; }
}

.pm--3d {
  background:
    radial-gradient(70% 80% at 50% 110%, rgba(var(--tone-rgb), .28), transparent 70%),
    linear-gradient(180deg, #f4f5fa, #e6e9f3);
}
</style>
