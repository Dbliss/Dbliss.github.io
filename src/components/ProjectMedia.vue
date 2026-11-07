<template>
  <div ref="root" :class="['pm', `pm--${kind}`]" :data-slug="slug">
    <!-- Real footage -->
    <video
      v-if="kind === 'video'"
      ref="video"
      class="pm-fill"
      :src="media.video"
      :poster="media.poster"
      muted
      loop
      playsinline
      preload="none"
    />

    <!-- Desktop + phone screenshots -->
    <div v-else-if="kind === 'screens'" class="pm-screens">
      <img class="pm-desktop" :src="media.desktop" alt="" loading="lazy" decoding="async" />
      <img v-if="media.phone" class="pm-phone" :src="media.phone" alt="" loading="lazy" decoding="async" />
    </div>

    <!-- Editorial row of images -->
    <div v-else-if="kind === 'gallery'" class="pm-gallery">
      <img v-for="(src, i) in media.images" :key="src" :src="src" alt="" loading="lazy" decoding="async" :style="{ animationDelay: i * -2.2 + 's' }" />
    </div>

    <!-- Real-time 3D scene -->
    <ProjectPreview3d v-else-if="kind === '3d'" :kind="media.scene" />

    <!-- Live animated scene, designed at a fixed size and scaled to fill the tile -->
    <div v-else :class="['pm-stage-wrap', DARK.has(slug) ? 'is-dark' : 'is-light']">
      <div class="pm-stage" :style="stageStyle">
        <ProjectPreview :slug="slug" class="pm-scene" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import ProjectPreview from './ProjectPreview.vue'
import ProjectPreview3d from './ProjectPreview3d.vue'
import liveOptimiser from '../assets/sportslux/videos/live-optimiser.mp4'
import liveOptimiserPoster from '../assets/sportslux/videos/live-optimiser.jpg'
import bookingDesktop from '../assets/sports-booking/admin_on_behalf.png'
import bookingPhone from '../assets/sports-booking/mobile_view.png'
import cwCollagen from '../assets/curated-wellness/how-to-collagen.jpg'
import cwProtein from '../assets/curated-wellness/how-to-protein.jpg'
import cwCreatine from '../assets/curated-wellness/how-to-creatine.jpg'

const props = defineProps({
  slug: { type: String, required: true },
  // Videos only play while this is true (the parent card is hovered).
  active: { type: Boolean, default: false }
})

// One place to choose what each project tile shows. To swap in a new screen recording,
// import it above and point the project at { video, poster }.
const MEDIA = {
  sportslux: { video: liveOptimiser, poster: liveOptimiserPoster },
  'sports-booking': { desktop: bookingDesktop, phone: bookingPhone },
  'curated-wellness': { images: [cwCollagen, cwProtein, cwCreatine] },
  'super-move': { scene: 'furniture' }
}

const DARK = new Set(['lol-match-predictor', 'chessEngine', 'asset-data-integration'])

const media = computed(() => MEDIA[props.slug] || {})
const kind = computed(() => {
  const m = media.value
  if (m.video) return 'video'
  if (m.desktop) return 'screens'
  if (m.images) return 'gallery'
  if (m.scene) return '3d'
  return 'live'
})

// Live scenes are authored at STAGE_W × STAGE_H and scaled up to the tile.
const STAGE_W = 340
const STAGE_H = 234
const root = ref(null)
const video = ref(null)
const scale = ref(1)
const stageStyle = computed(() => ({
  width: `${STAGE_W}px`,
  height: `${STAGE_H}px`,
  transform: `translate(-50%, -50%) scale(${scale.value})`
}))

let ro
onMounted(() => {
  ro = new ResizeObserver(([entry]) => {
    const { width, height } = entry.contentRect
    scale.value = Math.min(width / STAGE_W, height / STAGE_H) * 0.92
  })
  ro.observe(root.value)
})
onBeforeUnmount(() => ro?.disconnect())

// Play footage only while hovered; otherwise rest on the poster frame.
watch(() => props.active, (active) => {
  const v = video.value
  if (!v) return
  if (active && !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
    v.play().catch(() => {})
  } else {
    v.pause()
  }
})
</script>

<style scoped>
.pm { position: absolute; inset: 0; overflow: hidden; background: #111; }
.pm-fill { width: 100%; height: 100%; object-fit: cover; display: block; }

/* Live scene: the stage is scaled to fit; the tile carries the background */
.pm-stage-wrap { position: absolute; inset: 0; }
.pm-stage-wrap.is-dark {
  background:
    radial-gradient(70% 90% at 78% 8%, rgba(var(--tone-rgb), .5), transparent 65%),
    radial-gradient(60% 80% at 8% 100%, rgba(var(--tone-rgb), .28), transparent 70%),
    #121133;
}
.pm-stage-wrap.is-light {
  background:
    radial-gradient(70% 90% at 80% 0%, rgba(var(--tone-rgb), .22), transparent 65%),
    linear-gradient(170deg, #f7f7fb, #e9eaf3);
}
.pm-stage { position: absolute; top: 50%; left: 50%; transform-origin: center; }
.pm-scene { background: transparent !important; }

/* Screenshots */
.pm--screens {
  background:
    radial-gradient(80% 90% at 20% 0%, rgba(var(--tone-rgb), .35), transparent 70%),
    linear-gradient(160deg, #eef1f8, #dfe5f1);
}
.pm-screens { position: absolute; inset: 0; }
.pm-desktop {
  position: absolute;
  left: 7%;
  top: 12%;
  width: 78%;
  border-radius: 8px;
  box-shadow: 0 30px 70px rgba(20, 30, 60, .28), 0 0 0 1px rgba(20, 30, 60, .06);
}
.pm-phone {
  position: absolute;
  right: 6%;
  bottom: -6%;
  width: 22%;
  border-radius: 14px;
  border: 5px solid #14152a;
  box-shadow: 0 30px 60px rgba(20, 30, 60, .35);
}

/* Gallery */
.pm--gallery {
  background:
    radial-gradient(70% 80% at 80% 10%, rgba(var(--tone-rgb), .22), transparent 70%),
    #efe9e2;
}
.pm-gallery { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; gap: 3%; padding: 0 8%; }
.pm-gallery img {
  width: 27%;
  aspect-ratio: 4 / 5.2;
  object-fit: cover;
  border-radius: 6px;
  box-shadow: 0 24px 50px rgba(60, 40, 20, .2);
  animation: pm-float 7s ease-in-out infinite;
}
.pm-gallery img:nth-child(2) { width: 31%; }
@keyframes pm-float { 50% { transform: translateY(-10px); } }

/* 3D */
.pm--3d {
  background:
    radial-gradient(70% 80% at 50% 110%, rgba(var(--tone-rgb), .28), transparent 70%),
    linear-gradient(180deg, #f4f5fa, #e6e9f3);
}

@media (prefers-reduced-motion: reduce) {
  .pm-gallery img { animation: none; }
}
</style>
