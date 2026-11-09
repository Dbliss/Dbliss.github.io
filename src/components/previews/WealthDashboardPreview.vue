<template>
  <div ref="root" :class="['wp', active && 'is-on']">
    <div class="wp-stage" :style="stageStyle">
      <section class="wp-kpis">
        <article v-for="kpi in kpis" :key="kpi.kicker" class="wp-kpi card">
          <p class="wp-kicker">{{ kpi.kicker }}</p>
          <h3>{{ kpi.label }}</h3>
          <p class="wp-copy">{{ kpi.value }}</p>
        </article>
      </section>

      <div class="wp-charts">
        <WealthLineChart title="Liquidity Available" kicker="Scenario comparison" :series="preview.series" />
        <WealthCompositionBars
          title="Housing balance composition"
          subtitle="Final-year median liquid assets, home equity, and debt."
          :rows="preview.compositionRows"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
// Wealth Pathways tile: the calculator's own chart components and colours, showing real output from
// its simulator at the default inputs. wealthPreviewData.json holds that run, so the tile needs no worker.
// The components are laid out at a fixed desktop size and scaled to cover the tile.
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import WealthLineChart from '../wealth/WealthLineChart.vue'
import WealthCompositionBars from '../wealth/WealthCompositionBars.vue'
import preview from './wealthPreviewData.json'

defineProps({
  active: { type: Boolean, default: false }
})

const STAGE_W = 1280
const STAGE_H = 880

const kpis = [
  { kicker: 'Best median', ...preview.kpis.bestMedian },
  { kicker: 'Strongest downside', ...preview.kpis.downsideLeader },
  { kicker: 'Widest variability', ...preview.kpis.variabilityLeader }
]

const root = ref(null)
const tile = ref({ width: STAGE_W, height: STAGE_H })
let ro = null

const stageStyle = computed(() => {
  const { width, height } = tile.value
  const scale = Math.max(width / STAGE_W, height / STAGE_H)
  const x = (width - STAGE_W * scale) / 2
  return { transform: `translate(${x}px, 0) scale(${scale})` }
})

onMounted(() => {
  ro = new ResizeObserver(([entry]) => {
    tile.value = { width: entry.contentRect.width, height: entry.contentRect.height }
  })
  ro.observe(root.value)
})

onBeforeUnmount(() => ro?.disconnect())
</script>

<style scoped>
.wp {
  position: absolute;
  inset: 0;
  overflow: hidden;
  background:
    radial-gradient(circle at 15% 0%, rgba(56, 189, 248, 0.14), transparent 32%),
    radial-gradient(circle at 84% 8%, rgba(16, 185, 129, 0.12), transparent 28%),
    linear-gradient(180deg, #f8fbff 0%, #eef5ff 48%, #f5f8fd 100%);
}

.wp-stage {
  position: absolute;
  top: 0;
  left: 0;
  width: 1280px;
  height: 880px;
  box-sizing: border-box;
  padding: 26px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  color: #173050;
  transform-origin: top left;
  pointer-events: none;
}

/* The same card treatment the wealth page gives its panels */
.wp-stage :deep(.card) {
  border: 1px solid rgba(154, 174, 204, 0.22);
  background: rgba(255, 255, 255, 0.92);
  box-shadow: 0 18px 38px rgba(95, 122, 160, 0.12);
  border-radius: 24px;
}

.wp-kpis { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; }
.wp-kpi { padding: 16px; }
.wp-kicker { margin: 0; text-transform: uppercase; letter-spacing: 0.14em; font-size: 0.74rem; color: #5d7ba3; }
.wp-kpi h3 { margin: 4px 0 6px; font-size: 1.05rem; }
.wp-copy { margin: 0; color: #5d7394; font-size: 0.9rem; }

.wp-charts { display: grid; grid-template-columns: minmax(0, 1.65fr) minmax(0, 1fr); gap: 14px; align-items: start; }

/* A clean plot for a tile: the chart's cursor readout only makes sense when it can be pointed at */
.wp-stage :deep(.wealth-chart__hover-summary),
.wp-stage :deep(.wealth-chart__hover-line),
.wp-stage :deep(.wealth-chart__hover-dot) { display: none; }

/* On hover the real charts retract and redraw. Paused, each one sits on its finished first frame. */
.wp-stage :deep(.wealth-chart__line) {
  stroke-dasharray: 1900;
  animation: wp-line 7s linear infinite paused;
}
.wp-stage :deep(.wealth-chart__band) { animation: wp-band 7s linear infinite paused; }
.wp-stage :deep(.wealth-bars__segment) {
  transform-origin: left center;
  animation: wp-bar 7s cubic-bezier(.3, .7, .3, 1) infinite paused;
}
.wp.is-on .wp-stage :deep(.wealth-chart__line),
.wp.is-on .wp-stage :deep(.wealth-chart__band),
.wp.is-on .wp-stage :deep(.wealth-bars__segment) { animation-play-state: running; }

@keyframes wp-line {
  0%, 10% { stroke-dashoffset: 0; }
  20% { stroke-dashoffset: 1900; }
  72%, 100% { stroke-dashoffset: 0; }
}
@keyframes wp-band {
  0%, 10% { opacity: 0.72; }
  18%, 28% { opacity: 0; }
  62%, 100% { opacity: 0.72; }
}
@keyframes wp-bar {
  0%, 10% { transform: scaleX(1); }
  20%, 32% { transform: scaleX(0); }
  68%, 100% { transform: scaleX(1); }
}

@media (prefers-reduced-motion: reduce) {
  .wp-stage :deep(.wealth-chart__line),
  .wp-stage :deep(.wealth-chart__band),
  .wp-stage :deep(.wealth-bars__segment) { animation: none; }
}
</style>
