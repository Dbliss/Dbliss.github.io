<template>
  <section class="wealth-chart card">
    <div class="wealth-chart__header">
      <div>
        <p class="wealth-chart__kicker">{{ kicker }}</p>
        <h3>{{ title }}</h3>
        <p v-if="subtitle" class="wealth-chart__subtitle">{{ subtitle }}</p>
      </div>

      <div class="wealth-chart__legend">
        <button
          v-for="item in series"
          :key="item.id"
          type="button"
          class="wealth-chart__legend-item"
          :class="{ 'is-active': !isMuted(item.id), 'is-muted': isMuted(item.id) }"
          :aria-pressed="String(!isMuted(item.id))"
          @click="$emit('toggle-series', item.id)"
        >
          <span class="wealth-chart__dot" :style="{ background: item.color }"></span>
          <span>{{ item.label }}</span>
        </button>
      </div>
    </div>

    <p v-if="series.length > 1" class="wealth-chart__hint">
      Click a scenario to grey it out. Click it again to bring it back into focus.
    </p>

    <div
      ref="bodyRef"
      class="wealth-chart__body"
      @pointerleave="hoveredYear = null"
    >
      <svg
        v-if="activeSeries.length"
        class="wealth-chart__svg"
        :viewBox="`0 0 ${viewWidth} ${viewHeight}`"
        preserveAspectRatio="xMidYMid meet"
        role="img"
        :aria-label="title"
        @pointermove="onPointerMove"
      >
        <rect
          :x="padding.left"
          :y="padding.top"
          :width="viewWidth - padding.left - padding.right"
          :height="viewHeight - padding.top - padding.bottom"
          rx="20"
          ry="20"
          class="wealth-chart__plot-bg"
        />

        <g v-for="tick in yTicks" :key="`grid-${tick.value}`">
          <line
            :x1="padding.left"
            :x2="viewWidth - padding.right"
            :y1="yPos(tick.value)"
            :y2="yPos(tick.value)"
            class="wealth-chart__grid"
          />
          <text
            :x="padding.left - 12"
            :y="yPos(tick.value) + 5"
            class="wealth-chart__axis wealth-chart__axis--y"
          >
            {{ tick.label }}
          </text>
        </g>

        <g v-for="year in yearTicks" :key="`year-${year}`">
          <line
            :x1="xPos(year)"
            :x2="xPos(year)"
            :y1="padding.top"
            :y2="viewHeight - padding.bottom"
            class="wealth-chart__grid wealth-chart__grid--vertical"
          />
          <text
            :x="xPos(year)"
            :y="viewHeight - 12"
            text-anchor="middle"
            class="wealth-chart__axis"
          >
            Y{{ year }}
          </text>
        </g>

        <line
          v-if="crossesZero"
          :x1="padding.left"
          :x2="viewWidth - padding.right"
          :y1="yPos(0)"
          :y2="yPos(0)"
          class="wealth-chart__zero"
        />

        <g v-for="item in renderedSeries" :key="item.id">
          <path :d="item.bandPath" :fill="item.bandFill" class="wealth-chart__band" />
          <path :d="item.midPath" :stroke="item.lineColor" class="wealth-chart__line" />
        </g>

        <g v-if="hoveredYear !== null">
          <line
            :x1="xPos(hoveredYear)"
            :x2="xPos(hoveredYear)"
            :y1="padding.top"
            :y2="viewHeight - padding.bottom"
            class="wealth-chart__hover-line"
          />

          <g v-for="point in hoveredPoints" :key="`${point.id}-${hoveredYear}`">
            <circle
              :cx="xPos(hoveredYear)"
              :cy="yPos(point.mid)"
              r="5.5"
              :fill="point.color"
              class="wealth-chart__hover-dot"
            />
          </g>
        </g>
      </svg>

      <div
        v-if="hoveredYear !== null && hoveredPoints.length"
        class="wealth-chart__tooltip"
        :style="tooltipStyle"
      >
        <div class="wealth-chart__tooltip-title">Year {{ hoveredYear }}</div>
        <div v-for="point in hoveredPoints" :key="point.id" class="wealth-chart__tooltip-row">
          <span class="wealth-chart__tooltip-label">
            <i class="wealth-chart__tooltip-swatch" :style="{ background: point.color }"></i>
            {{ point.label }}
          </span>
          <span>{{ formatShortCurrency(point.mid) }}</span>
        </div>
      </div>

      <p v-else-if="series.length && !activeSeries.length" class="wealth-chart__empty">All scenarios are currently greyed out.</p>
      <p v-else-if="!series.length" class="wealth-chart__empty">Simulation results will appear here once the calculator runs.</p>
    </div>
  </section>
</template>

<script setup>
import { computed, ref } from 'vue'
import { clamp, formatShortCurrency } from '../../wealth/finance.js'

const props = defineProps({
  title: { type: String, required: true },
  subtitle: { type: String, default: '' },
  kicker: { type: String, default: 'Projection' },
  mutedSeriesIds: {
    type: Array,
    default: () => []
  },
  series: {
    type: Array,
    default: () => []
  }
})

defineEmits(['toggle-series'])

const viewWidth = 920
const viewHeight = 520
const padding = {
  top: 28,
  right: 36,
  bottom: 54,
  left: 92
}

const bodyRef = ref(null)
const hoveredYear = ref(null)

function isMuted(id) {
  return props.mutedSeriesIds.includes(id)
}

const activeSeries = computed(() =>
  props.series.filter(item => !isMuted(item.id))
)

const allYears = computed(() =>
  [...new Set(activeSeries.value.flatMap(item => item.points.map(point => point.year)))].sort((a, b) => a - b)
)

const yearDomain = computed(() => {
  const years = allYears.value
  const maxYear = years.length ? Math.max(...years) : 0
  return { min: 0, max: maxYear }
})

const valueDomain = computed(() => {
  const values = activeSeries.value.flatMap(item =>
    item.points.flatMap(point => [point.low, point.mid, point.high])
  )
  const min = values.length ? Math.min(0, ...values) : 0
  const max = values.length ? Math.max(...values) : 1
  if (min === max) return { min: min - 1, max: max + 1 }
  return { min, max }
})

const hoveredPoints = computed(() => {
  if (hoveredYear.value === null) return []
  return activeSeries.value
    .map(item => {
      const point = item.points.find(candidate => candidate.year === hoveredYear.value)
      return point
        ? {
            ...point,
            id: item.id,
            label: item.label,
            color: item.color
          }
        : null
    })
    .filter(Boolean)
})

const tooltipStyle = computed(() => {
  if (hoveredYear.value === null) return {}
  const xRatio = xPos(hoveredYear.value) / viewWidth
  const left = clamp(xRatio * 100, 14, 80)
  return {
    left: `${left}%`,
    top: '14px'
  }
})

const crossesZero = computed(() =>
  valueDomain.value.min < 0 && valueDomain.value.max > 0
)

const yearTicks = computed(() => {
  const { max } = yearDomain.value
  if (max <= 5) return Array.from({ length: max + 1 }, (_, index) => index)
  const roughSteps = [0, Math.round(max * 0.25), Math.round(max * 0.5), Math.round(max * 0.75), max]
  return [...new Set(roughSteps)]
})

const yTicks = computed(() => {
  const { min, max } = valueDomain.value
  return Array.from({ length: 5 }, (_, index) => {
    const step = index / 4
    const value = min + (max - min) * step
    return {
      value,
      label: formatShortCurrency(value)
    }
  })
})

function xPos(year) {
  const { min, max } = yearDomain.value
  const span = Math.max(1, max - min)
  return padding.left + ((year - min) / span) * (viewWidth - padding.left - padding.right)
}

function yPos(value) {
  const { min, max } = valueDomain.value
  const span = Math.max(1, max - min)
  return viewHeight - padding.bottom - ((value - min) / span) * (viewHeight - padding.top - padding.bottom)
}

function toPath(points, key) {
  return points
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${xPos(point.year)} ${yPos(point[key])}`)
    .join(' ')
}

function toBandPath(points) {
  if (!points.length) return ''
  const top = points.map(point => `${xPos(point.year)} ${yPos(point.high)}`).join(' L ')
  const bottom = [...points].reverse().map(point => `${xPos(point.year)} ${yPos(point.low)}`).join(' L ')
  return `M ${top} L ${bottom} Z`
}

const renderedSeries = computed(() =>
  activeSeries.value.map(item => ({
    ...item,
    lineColor: item.color,
    bandFill: item.accent || `${item.color}20`,
    midPath: toPath(item.points, 'mid'),
    bandPath: toBandPath(item.points)
  }))
)

function onPointerMove(event) {
  if (!bodyRef.value || !allYears.value.length) return
  const rect = bodyRef.value.getBoundingClientRect()
  const x = clamp(event.clientX - rect.left, 0, rect.width)
  const ratio = rect.width <= 0 ? 0 : x / rect.width
  const estimatedYear = yearDomain.value.min + ratio * (yearDomain.value.max - yearDomain.value.min)

  hoveredYear.value = allYears.value.reduce((bestYear, year) =>
    Math.abs(year - estimatedYear) < Math.abs(bestYear - estimatedYear) ? year : bestYear
  , allYears.value[0])
}
</script>

<style scoped>
.wealth-chart {
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
  background: linear-gradient(180deg, rgba(248, 251, 255, 0.96), rgba(241, 247, 255, 0.94));
  border-color: rgba(154, 174, 204, 0.22);
  color: #11233e;
}

.wealth-chart__header {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: flex-start;
  flex-wrap: wrap;
}

.wealth-chart__header h3 {
  margin: 0.15rem 0 0.35rem;
  font-size: 1.12rem;
}

.wealth-chart__kicker {
  margin: 0;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  font-size: 0.74rem;
  color: #5a7497;
}

.wealth-chart__subtitle,
.wealth-chart__hint,
.wealth-chart__empty {
  margin: 0;
  color: #5d7394;
  font-size: 0.9rem;
}

.wealth-chart__legend {
  display: flex;
  gap: 0.65rem;
  flex-wrap: wrap;
}

.wealth-chart__legend-item {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.45rem 0.7rem;
  border-radius: 999px;
  border: 1px solid rgba(154, 174, 204, 0.28);
  background: rgba(255, 255, 255, 0.72);
  color: #27415f;
  cursor: pointer;
  transition: transform 120ms ease, opacity 120ms ease, border-color 120ms ease;
}

.wealth-chart__legend-item.is-active {
  border-color: rgba(62, 117, 187, 0.45);
}

.wealth-chart__legend-item.is-muted {
  opacity: 0.45;
}

.wealth-chart__legend-item:hover {
  transform: translateY(-1px);
}

.wealth-chart__dot {
  width: 11px;
  height: 11px;
  border-radius: 999px;
}

.wealth-chart__body {
  position: relative;
  aspect-ratio: 16 / 9;
  min-height: 360px;
  padding: 0.2rem 0 0;
}

.wealth-chart__svg {
  width: 100%;
  height: 100%;
  display: block;
  overflow: visible;
}

.wealth-chart__plot-bg {
  fill: rgba(255, 255, 255, 0.74);
  stroke: rgba(154, 174, 204, 0.2);
  stroke-width: 1;
}

.wealth-chart__grid {
  stroke: rgba(160, 180, 210, 0.22);
  stroke-width: 1;
}

.wealth-chart__grid--vertical {
  stroke-dasharray: 4 6;
}

.wealth-chart__zero {
  stroke: rgba(239, 68, 68, 0.35);
  stroke-width: 1.4;
  stroke-dasharray: 6 6;
}

.wealth-chart__hover-line {
  stroke: rgba(34, 65, 102, 0.4);
  stroke-width: 1.4;
  stroke-dasharray: 5 5;
}

.wealth-chart__hover-dot {
  stroke: rgba(255, 255, 255, 0.95);
  stroke-width: 2;
}

.wealth-chart__axis {
  fill: #60779a;
  font-size: 12px;
}

.wealth-chart__axis--y {
  text-anchor: end;
}

.wealth-chart__band {
  opacity: 0.72;
}

.wealth-chart__line {
  fill: none;
  stroke-width: 3.5;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.wealth-chart__tooltip {
  position: absolute;
  z-index: 2;
  min-width: 180px;
  padding: 0.8rem 0.9rem;
  border-radius: 16px;
  border: 1px solid rgba(154, 174, 204, 0.28);
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 18px 40px rgba(73, 100, 138, 0.18);
  transform: translateX(-50%);
}

.wealth-chart__tooltip-title {
  margin-bottom: 0.45rem;
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: #5a7497;
}

.wealth-chart__tooltip-row {
  display: flex;
  justify-content: space-between;
  gap: 0.7rem;
  color: #173050;
  font-size: 0.88rem;
}

.wealth-chart__tooltip-row + .wealth-chart__tooltip-row {
  margin-top: 0.4rem;
}

.wealth-chart__tooltip-label {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
}

.wealth-chart__tooltip-swatch {
  width: 10px;
  height: 10px;
  border-radius: 999px;
}

@media (max-width: 720px) {
  .wealth-chart__body {
    aspect-ratio: 4 / 3;
    min-height: 300px;
  }

  .wealth-chart__svg {
    overflow: hidden;
  }

  .wealth-chart__tooltip {
    min-width: 150px;
  }
}
</style>
