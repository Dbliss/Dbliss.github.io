<template>
  <section class="wealth-dist card">
    <div class="wealth-dist__header">
      <div>
        <p class="wealth-dist__kicker">{{ kicker }}</p>
        <h3>{{ title }}</h3>
        <p v-if="subtitle" class="wealth-dist__subtitle">{{ subtitle }}</p>
      </div>
      <div v-if="$slots.actions" class="wealth-dist__actions">
        <slot name="actions"></slot>
      </div>
    </div>

    <div class="wealth-dist__layout">
      <div
        class="wealth-dist__body"
        @pointerleave="hoveredValue = null"
      >
        <svg
          v-if="activeSeries.length"
          ref="svgRef"
          class="wealth-dist__svg"
          :viewBox="`0 0 ${viewWidth} ${viewHeight}`"
          preserveAspectRatio="xMidYMid meet"
          role="img"
          :aria-label="title"
          @pointermove="onPointerMove"
        >
          <rect
            :x="padding.left"
            :y="padding.top"
            :width="plotWidth"
            :height="plotHeight"
            rx="20"
            ry="20"
            class="wealth-dist__plot-bg"
          />

          <g v-for="tick in yTicks" :key="`y-${tick}`">
            <line
              :x1="padding.left"
              :x2="viewWidth - padding.right"
              :y1="yPos(tick)"
              :y2="yPos(tick)"
              class="wealth-dist__grid"
            />
          </g>

          <g v-for="tick in xTicks" :key="`x-${tick}`">
            <line
              :x1="xPos(tick)"
              :x2="xPos(tick)"
              :y1="padding.top"
              :y2="viewHeight - padding.bottom"
              class="wealth-dist__grid wealth-dist__grid--vertical"
            />
            <text
              :x="xPos(tick)"
              :y="viewHeight - 12"
              text-anchor="middle"
              class="wealth-dist__axis"
            >
              {{ formatShortCurrency(tick) }}
            </text>
          </g>

          <g v-for="item in renderedSeries" :key="item.id">
            <path :d="item.areaPath" :fill="item.bandFill" class="wealth-dist__area" />
            <path :d="item.linePath" :stroke="item.color" class="wealth-dist__line" />
          </g>

          <g v-if="displayValue !== null">
            <line
              :x1="xPos(displayValue)"
              :x2="xPos(displayValue)"
              :y1="padding.top"
              :y2="viewHeight - padding.bottom"
              class="wealth-dist__hover-line"
            />
            <g v-for="item in displaySeries" :key="`${item.id}-${displayValue}`">
              <circle
                :cx="xPos(displayValue)"
                :cy="yPos(item.density)"
                r="5.5"
                :fill="item.color"
                class="wealth-dist__hover-dot"
              />
            </g>
          </g>
        </svg>

        <p v-if="series.length && !activeSeries.length" class="wealth-dist__empty">All scenarios are currently greyed out.</p>
        <p v-else-if="!series.length" class="wealth-dist__empty">Simulation results will appear here once the calculator runs.</p>
      </div>

      <aside v-if="activeSeries.length" class="wealth-dist__side card">
        <div class="wealth-dist__side-header">
          <p class="wealth-dist__kicker">Hovered outcome</p>
          <h4>{{ displayValue === null ? 'Move across the curve' : formatShortCurrency(displayValue) }}</h4>
        </div>
        <div class="wealth-dist__side-list">
          <div v-for="item in displaySeries" :key="item.id" class="wealth-dist__side-row">
            <div class="wealth-dist__side-top">
              <span class="wealth-dist__tooltip-label">
                <i class="wealth-dist__tooltip-swatch" :style="{ background: item.color }"></i>
                {{ item.label }}
              </span>
              <strong>{{ item.percentileLabel }}</strong>
            </div>
            <div class="wealth-dist__side-stats">
              <span v-if="displayValue !== null">Outcome {{ formatShortCurrency(displayValue) }}</span>
              <span>P10 {{ formatShortCurrency(item.stats.p10) }}</span>
              <span>P50 {{ formatShortCurrency(item.stats.p50) }}</span>
              <span>P90 {{ formatShortCurrency(item.stats.p90) }}</span>
            </div>
          </div>
        </div>
      </aside>
    </div>
  </section>
</template>

<script setup>
import { computed, ref } from 'vue'
import { clamp, formatShortCurrency } from '../../wealth/finance.js'

const props = defineProps({
  title: { type: String, required: true },
  subtitle: { type: String, default: '' },
  kicker: { type: String, default: 'Distribution' },
  mutedSeriesIds: {
    type: Array,
    default: () => []
  },
  series: {
    type: Array,
    default: () => []
  }
})

const viewWidth = 1120
const viewHeight = 760
const padding = {
  top: 28,
  right: 36,
  bottom: 54,
  left: 92
}

const plotWidth = viewWidth - padding.left - padding.right
const plotHeight = viewHeight - padding.top - padding.bottom
const binCount = 56
const svgRef = ref(null)
const hoveredValue = ref(null)

const activeSeries = computed(() =>
  props.series
    .filter(item => item && !props.mutedSeriesIds.includes(item.id) && Array.isArray(item.samples) && item.samples.length)
    .map((item) => ({
      ...item,
      stats: {
        p10: Number(item?.stats?.p10) || 0,
        p50: Number(item?.stats?.p50) || 0,
        p90: Number(item?.stats?.p90) || 0,
        displayP50: item?.stats?.displayP50 || formatShortCurrency(Number(item?.stats?.p50) || 0)
      }
    }))
)

const valueDomain = computed(() => {
  const values = activeSeries.value.flatMap(item => item.samples)
  const min = values.length ? Math.min(...values) : 0
  const max = values.length ? Math.max(...values) : 1
  if (min === max) return { min: min - 1, max: max + 1 }
  const paddingValue = (max - min) * 0.05
  return { min: min - paddingValue, max: max + paddingValue }
})

const kdeSeries = computed(() => {
  const { min, max } = valueDomain.value
  const shift = min <= 0 ? Math.abs(min) + 1 : 1
  const zMin = Math.log(Math.max(min + shift, 1e-9))
  const zMax = Math.log(Math.max(max + shift, 1e-9))
  const zSpan = Math.max(zMax - zMin, 1e-6)

  return activeSeries.value.map((item) => {
    const transformedSamples = item.samples
      .map((value) => Math.log(Math.max(value + shift, 1e-9)))
      .filter((value) => Number.isFinite(value))

    const bandwidth = computeKdeBandwidth(transformedSamples, zSpan)
    const densityPoints = Array.from({ length: binCount }, (_, index) => {
      const ratio = binCount <= 1 ? 0 : index / (binCount - 1)
      const z = zMin + ratio * zSpan
      const x = Math.exp(z) - shift
      const density = kernelDensityEstimate(z, transformedSamples, bandwidth)
      return {
        x,
        density
      }
    })

    return {
      ...item,
      densityPoints,
      maxDensity: Math.max(...densityPoints.map(point => point.density), 0)
    }
  })
})

const densityDomain = computed(() => {
  const maxDensity = Math.max(0.01, ...kdeSeries.value.map(item => item.maxDensity))
  return { min: 0, max: maxDensity * 1.1 }
})

const renderedSeries = computed(() =>
  kdeSeries.value.map((item) => ({
    ...item,
    linePath: toLinePath(item.densityPoints),
    areaPath: toAreaPath(item.densityPoints),
    bandFill: item.accent || `${item.color}20`
  }))
)

const displayValue = computed(() => hoveredValue.value)

const displaySeries = computed(() => {
  if (!activeSeries.value.length) return []

  return renderedSeries.value
    .map((item) => {
      const percentile = displayValue.value === null
        ? 0.5
        : percentileAtValue(item.samples, displayValue.value)
      return {
        ...item,
        density: displayValue.value === null
          ? interpolateDensityAtX(item.densityPoints, item.stats.p50)
          : interpolateDensityAtX(item.densityPoints, displayValue.value),
        percentile,
        percentileLabel: formatPercentile(percentile)
      }
    })
    .sort((left, right) => right.percentile - left.percentile)
})

const xTicks = computed(() => {
  const { min, max } = valueDomain.value
  return Array.from({ length: 5 }, (_, index) => min + ((max - min) * index) / 4)
})

const yTicks = computed(() => {
  const { max } = densityDomain.value
  return Array.from({ length: 4 }, (_, index) => (max * index) / 3)
})

function xPos(value) {
  const { min, max } = valueDomain.value
  const span = Math.max(1, max - min)
  return padding.left + ((value - min) / span) * plotWidth
}

function yPos(value) {
  const { min, max } = densityDomain.value
  const span = Math.max(0.0001, max - min)
  return viewHeight - padding.bottom - ((value - min) / span) * plotHeight
}

function onPointerMove(event) {
  const svg = svgRef.value || event.currentTarget
  if (!svg) return

  const ctm = typeof svg.getScreenCTM === 'function' ? svg.getScreenCTM() : null
  if (!ctm) return

  const svgX = (event.clientX - ctm.e) / ctm.a
  const chartX = clamp(svgX - padding.left, 0, plotWidth)
  const ratio = plotWidth <= 0 ? 0 : chartX / plotWidth
  hoveredValue.value = valueDomain.value.min + ratio * (valueDomain.value.max - valueDomain.value.min)
}

function toLinePath(points) {
  return toSmoothPath(points)
}

function toAreaPath(points) {
  if (!points.length) return ''
  const top = toSmoothPath(points)
  const startX = xPos(points[0].x)
  const endX = xPos(points[points.length - 1].x)
  const baseY = yPos(0)
  return `${top} L ${endX} ${baseY} L ${startX} ${baseY} Z`
}

function toSmoothPath(points) {
  if (!points.length) return ''
  if (points.length === 1) return `M ${xPos(points[0].x)} ${yPos(points[0].density)}`

  const coords = points.map((point) => ({
    x: xPos(point.x),
    y: yPos(point.density)
  }))

  let path = `M ${coords[0].x} ${coords[0].y}`
  for (let index = 0; index < coords.length - 1; index += 1) {
    const previous = coords[Math.max(0, index - 1)]
    const current = coords[index]
    const next = coords[index + 1]
    const afterNext = coords[Math.min(coords.length - 1, index + 2)]

    const control1X = current.x + (next.x - previous.x) / 6
    const control1Y = current.y + (next.y - previous.y) / 6
    const control2X = next.x - (afterNext.x - current.x) / 6
    const control2Y = next.y - (afterNext.y - current.y) / 6

    path += ` C ${control1X} ${control1Y}, ${control2X} ${control2Y}, ${next.x} ${next.y}`
  }
  return path
}

function computeKdeBandwidth(samples, span) {
  if (!samples.length) return Math.max(span / 12, 0.12)
  const mean = samples.reduce((sum, value) => sum + value, 0) / samples.length
  const variance = samples.reduce((sum, value) => sum + ((value - mean) ** 2), 0) / samples.length
  const sigma = Math.sqrt(Math.max(variance, 1e-9))
  const silverman = 1.06 * sigma * Math.pow(samples.length, -0.2)
  return Math.max(silverman * 2.4, span / 48, 0.08)
}

function kernelDensityEstimate(z, samples, bandwidth) {
  if (!samples.length) return 0
  const normalizer = samples.length * bandwidth * Math.sqrt(2 * Math.PI)
  const weightedSum = samples.reduce((sum, sample) => {
    const scaled = (z - sample) / bandwidth
    return sum + Math.exp(-0.5 * scaled * scaled)
  }, 0)
  return weightedSum / Math.max(normalizer, 1e-9)
}

function interpolateDensityAtX(points, value) {
  if (!points.length) return 0
  if (value <= points[0].x) return points[0].density
  if (value >= points[points.length - 1].x) return points[points.length - 1].density

  for (let index = 0; index < points.length - 1; index += 1) {
    const left = points[index]
    const right = points[index + 1]
    if (value < left.x || value > right.x) continue
    const span = Math.max(right.x - left.x, 1e-9)
    const ratio = (value - left.x) / span
    return left.density + (right.density - left.density) * ratio
  }

  return 0
}

function percentileAtValue(samples, value) {
  if (!samples.length) return 0
  const count = samples.reduce((sum, sample) => sum + (sample <= value ? 1 : 0), 0)
  return count / samples.length
}

function formatPercentile(percentile) {
  const bounded = Math.min(Math.max(percentile, 0), 1)
  return `${Math.round((1 - bounded) * 100)}% chance`
}
</script>

<style scoped>
.wealth-dist {
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
  background: linear-gradient(180deg, rgba(248, 251, 255, 0.96), rgba(241, 247, 255, 0.94));
  border-color: rgba(154, 174, 204, 0.22);
  color: #11233e;
}

.wealth-dist__header {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: flex-start;
  flex-wrap: wrap;
}

.wealth-dist__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
  align-items: center;
}

.wealth-dist__header h3 {
  margin: 0.15rem 0 0.35rem;
  font-size: 1.12rem;
}

.wealth-dist__kicker {
  margin: 0;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  font-size: 0.74rem;
  color: #5a7497;
}

.wealth-dist__subtitle,
.wealth-dist__empty {
  margin: 0;
  color: #5d7394;
  font-size: 0.9rem;
}

.wealth-dist__layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 320px;
  gap: 1rem;
  align-items: stretch;
  overflow: hidden;
}

.wealth-dist__body {
  position: relative;
  aspect-ratio: 16 / 10;
  min-height: 500px;
  padding: 0.2rem 0 0;
}

.wealth-dist__svg {
  width: 100%;
  height: 100%;
  display: block;
  overflow: visible;
  cursor: crosshair;
  touch-action: pan-y;
}

.wealth-dist__plot-bg {
  fill: rgba(255, 255, 255, 0.74);
  stroke: rgba(154, 174, 204, 0.2);
  stroke-width: 1;
}

.wealth-dist__grid {
  stroke: rgba(160, 180, 210, 0.22);
  stroke-width: 1;
}

.wealth-dist__grid--vertical {
  stroke-dasharray: 4 6;
}

.wealth-dist__axis {
  fill: #60779a;
  font-size: 12px;
}

.wealth-dist__axis--y {
  text-anchor: end;
}

.wealth-dist__area {
  opacity: 0.55;
}

.wealth-dist__line {
  fill: none;
  stroke-width: 3;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.wealth-dist__hover-line {
  stroke: rgba(34, 65, 102, 0.4);
  stroke-width: 1.4;
  stroke-dasharray: 5 5;
}

.wealth-dist__hover-dot {
  stroke: rgba(255, 255, 255, 0.95);
  stroke-width: 2;
}

.wealth-dist__side {
  display: grid;
  align-content: start;
  gap: 0.9rem;
  width: 320px;
  min-width: 320px;
  max-width: 320px;
  padding: 1rem;
  border: 1px solid rgba(154, 174, 204, 0.28);
  background: rgba(247, 250, 255, 0.94);
  overflow: hidden;
  contain: layout paint;
}

.wealth-dist__side-header h4 {
  margin: 0.2rem 0 0;
  font-size: 1.05rem;
  min-height: 1.4em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-variant-numeric: tabular-nums;
}

.wealth-dist__side-list {
  display: grid;
  gap: 0.8rem;
}

.wealth-dist__side-row {
  display: grid;
  gap: 0.35rem;
  padding: 0.8rem;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid rgba(154, 174, 204, 0.18);
}

.wealth-dist__side-top {
  display: flex;
  justify-content: space-between;
  gap: 0.5rem;
  align-items: flex-start;
}

.wealth-dist__tooltip-label {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  min-width: 0;
  flex: 1 1 auto;
  font-size: 0.78rem;
  line-height: 1.15;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.wealth-dist__side-top strong {
  flex: 0 0 auto;
  min-width: 5.4rem;
  text-align: right;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
  font-size: 0.8rem;
  line-height: 1.15;
}

.wealth-dist__side-row,
.wealth-dist__side-stats,
.wealth-dist__side-header,
.wealth-dist__side-top {
  min-width: 0;
}

.wealth-dist__side-stats span {
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}

.wealth-dist__side-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem 0.75rem;
  color: #526b8d;
  font-size: 0.8rem;
}

.wealth-dist__tooltip-swatch {
  width: 10px;
  height: 10px;
  border-radius: 999px;
}

@media (max-width: 720px) {
  .wealth-dist__layout {
    grid-template-columns: 1fr;
  }

  .wealth-dist__body {
    aspect-ratio: 4 / 3;
    min-height: 400px;
  }

  .wealth-dist__svg {
    overflow: hidden;
  }

  .wealth-dist__side {
    width: 100%;
    min-width: 0;
    max-width: none;
  }
}
</style>
