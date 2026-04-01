<template>
  <article class="wealth-trend card">
    <div class="wealth-trend__header">
      <div>
        <p class="wealth-trend__kicker">{{ kicker }}</p>
        <h4>{{ title }}</h4>
        <p v-if="subtitle" class="wealth-trend__subtitle">{{ subtitle }}</p>
      </div>
    </div>

    <div v-if="hasData" class="wealth-trend__body">
      <svg class="wealth-trend__svg" :viewBox="`0 0 ${viewWidth} ${viewHeight}`" preserveAspectRatio="xMidYMid meet" role="img" :aria-label="title">
        <rect
          :x="padding.left"
          :y="padding.top"
          :width="plotWidth"
          :height="plotHeight"
          rx="18"
          ry="18"
          class="wealth-trend__plot"
        />

        <g v-for="tick in yTicks" :key="`y-${tick.value}`">
          <line
            :x1="padding.left"
            :x2="padding.left + plotWidth"
            :y1="yPos(tick.value)"
            :y2="yPos(tick.value)"
            class="wealth-trend__grid"
          />
          <text :x="padding.left - 12" :y="yPos(tick.value) + 4" class="wealth-trend__axis wealth-trend__axis--y">
            {{ tick.label }}
          </text>
        </g>

        <g v-for="tick in xTicks" :key="`x-${tick}`">
          <line
            :x1="xPos(tick)"
            :x2="xPos(tick)"
            :y1="padding.top"
            :y2="padding.top + plotHeight"
            class="wealth-trend__grid wealth-trend__grid--vertical"
          />
          <text :x="xPos(tick)" :y="viewHeight - 10" text-anchor="middle" class="wealth-trend__axis">
            {{ tick }}
          </text>
        </g>

        <path :d="trendPath" class="wealth-trend__line wealth-trend__line--trend" :style="{ stroke: color }" />
        <path :d="actualPath" class="wealth-trend__line wealth-trend__line--actual" :style="{ stroke: color }" />

        <g
          v-for="point in actualChartPoints"
          :key="`actual-${point.year}`"
          class="wealth-trend__point-group"
        >
          <circle
            :cx="point.x"
            :cy="point.y"
            r="4.5"
            class="wealth-trend__dot"
            :class="{ 'is-active': hoverYear === point.year }"
            :style="{ fill: color }"
            tabindex="0"
            role="button"
            :aria-label="`${title} ${point.year}: ${formatValue(point.value)}`"
            @pointerenter="setHoverYear(point.year)"
            @pointerleave="clearHoverYear"
            @focus="setHoverYear(point.year)"
            @blur="clearHoverYear"
            @click="setHoverYear(point.year)"
          />
        </g>

        <g v-if="hoverPoint" class="wealth-trend__tooltip" :transform="tooltipTransform">
          <rect class="wealth-trend__tooltip-box" width="128" height="42" rx="12" ry="12" />
          <text x="12" y="18" class="wealth-trend__tooltip-year">{{ hoverPoint.year }}</text>
          <text x="12" y="32" class="wealth-trend__tooltip-value">{{ formatValue(hoverPoint.value) }}</text>
        </g>

        <circle
          v-if="estimatePoint"
          :cx="xPos(estimatePoint.year)"
          :cy="yPos(estimatePoint.value)"
          r="7"
          class="wealth-trend__estimate-dot"
          :style="{ fill: color }"
        />
      </svg>
    </div>

    <p v-else class="wealth-trend__empty">{{ emptyText }}</p>

    <div v-if="hasData" class="wealth-trend__legend">
      <span><i class="wealth-trend__swatch wealth-trend__swatch--actual" :style="{ background: color }"></i> {{ actualLegendLabel }}</span>
      <span><i class="wealth-trend__swatch wealth-trend__swatch--trend" :style="{ borderColor: color }"></i> {{ trendLegendLabel }}</span>
      <span v-if="estimatePoint"><i class="wealth-trend__swatch wealth-trend__swatch--estimate" :style="{ background: color }"></i> {{ estimateLegendLabel }}</span>
    </div>
  </article>
</template>

<script setup>
import { computed, ref } from 'vue'
import { formatShortCurrency } from '../../wealth/finance.js'

const props = defineProps({
  title: { type: String, required: true },
  subtitle: { type: String, default: '' },
  kicker: { type: String, default: 'Market history' },
  color: { type: String, default: '#2563eb' },
  valueMode: { type: String, default: 'currency' },
  valuePadding: { type: Number, default: null },
  emptyText: { type: String, default: 'No pricing history available for this property type.' },
  actualLegendLabel: { type: String, default: 'Actual yearly median' },
  trendLegendLabel: { type: String, default: 'Curved best-fit trend' },
  estimateLegendLabel: { type: String, default: 'Current estimate' },
  actualPoints: { type: Array, default: () => [] },
  trendPoints: { type: Array, default: () => [] },
  estimatePoint: { type: Object, default: null }
})

const viewWidth = 860
const viewHeight = 360
const padding = {
  top: 24,
  right: 22,
  bottom: 46,
  left: 74
}

const plotWidth = viewWidth - padding.left - padding.right
const plotHeight = viewHeight - padding.top - padding.bottom
const TOOLTIP_WIDTH = 128
const TOOLTIP_EDGE_PADDING = 8
const hoverYear = ref(null)

const allPoints = computed(() =>
  [...props.actualPoints, ...props.trendPoints, ...(props.estimatePoint ? [props.estimatePoint] : [])]
    .filter((point) => Number.isFinite(point?.year) && Number.isFinite(point?.value) && point.value > 0 && !point.ignoredForTrend)
)

const xPoints = computed(() =>
  [...props.actualPoints, ...props.trendPoints, ...(props.estimatePoint ? [props.estimatePoint] : [])]
    .filter((point) => Number.isFinite(point?.year))
)

const yPoints = computed(() =>
  [...props.actualPoints, ...props.trendPoints, ...(props.estimatePoint ? [props.estimatePoint] : [])]
    .filter((point) => Number.isFinite(point?.value) && point.value > 0)
)

const hasData = computed(() => allPoints.value.length > 1)

const xDomain = computed(() => {
  if (!xPoints.value.length) return { min: 0, max: 1 }
  const years = xPoints.value.map((point) => point.year)
  return { min: Math.min(...years), max: Math.max(...years) }
})

const yDomain = computed(() => {
  if (!yPoints.value.length) return { min: 0, max: 1 }
  const values = yPoints.value.map((point) => point.value)
  const min = Math.min(...values)
  const max = Math.max(...values)

  if (props.valueMode === 'percent') {
    const padding = Number.isFinite(Number(props.valuePadding)) ? Number(props.valuePadding) : 0.005
    return {
      min: Math.max(0, min - padding),
      max: max + padding
    }
  }

  const paddingAmount = Math.max((max - min) * 0.12, max * 0.08, 1)
  return {
    min: Math.max(0, min - paddingAmount),
    max: max + paddingAmount
  }
})

const xTicks = computed(() => {
  const { min, max } = xDomain.value
  if (min === max) return [min]
  const ticks = [min, Math.round(min + ((max - min) / 3)), Math.round(min + (((max - min) * 2) / 3)), max]
  return [...new Set(ticks)]
})

const yTicks = computed(() => {
  const { min, max } = yDomain.value
  return Array.from({ length: 4 }, (_, index) => {
    const ratio = index / 3
    const value = min + ((max - min) * ratio)
    return {
      value,
      label: formatValue(value)
    }
  })
})

const actualPath = computed(() => toPath(props.actualPoints))
const trendPath = computed(() => toPath(props.trendPoints))
const actualChartPoints = computed(() =>
  props.actualPoints
    .filter((point) => Number.isFinite(point?.year) && Number.isFinite(point?.value) && point.value > 0)
    .map((point) => ({
      ...point,
      x: xPos(point.year),
      y: yPos(point.value)
    }))
)
const hoverPoint = computed(() =>
  actualChartPoints.value.find((point) => point.year === hoverYear.value) || null
)
const tooltipTransform = computed(() => {
  if (!hoverPoint.value) return 'translate(0 0)'
  const x = Math.min(
    Math.max(hoverPoint.value.x - (TOOLTIP_WIDTH / 2), padding.left + TOOLTIP_EDGE_PADDING),
    viewWidth - TOOLTIP_WIDTH - TOOLTIP_EDGE_PADDING
  )
  const y = Math.max(hoverPoint.value.y - 48, 10)
  return `translate(${x} ${y})`
})

function xPos(year) {
  const { min, max } = xDomain.value
  const span = Math.max(Number.EPSILON, max - min)
  return padding.left + (((year - min) / span) * plotWidth)
}

function yPos(value) {
  const { min, max } = yDomain.value
  const span = Math.max(Number.EPSILON, max - min)
  const normalized = (value - min) / span
  return padding.top + plotHeight - (normalized * plotHeight)
}

function toPath(points) {
  const cleanPoints = points.filter((point) => Number.isFinite(point?.year) && Number.isFinite(point?.value) && point.value > 0)
  return cleanPoints
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${xPos(point.year)} ${yPos(point.value)}`)
    .join(' ')
}

function formatValue(value) {
  if (props.valueMode === 'percent') {
    if (!Number.isFinite(Number(value))) return 'n/a'
    return `${(Number(value) * 100).toFixed(2)}%`
  }
  return formatShortCurrency(value)
}

function setHoverYear(year) {
  hoverYear.value = year
}

function clearHoverYear() {
  hoverYear.value = null
}
</script>

<style scoped>
.wealth-trend {
  display: grid;
  gap: 0.9rem;
  padding: 1rem;
  border: 1px solid rgba(154, 174, 204, 0.18);
  background: rgba(255, 255, 255, 0.72);
}

.wealth-trend__header {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: flex-start;
}

.wealth-trend__kicker {
  margin: 0;
  font-size: 0.72rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #6481a6;
}

.wealth-trend__header h4 {
  margin: 0.18rem 0 0;
  font-size: 1rem;
}

.wealth-trend__subtitle,
.wealth-trend__empty {
  margin: 0.3rem 0 0;
  color: #5d7394;
  line-height: 1.45;
}

.wealth-trend__body {
  width: 100%;
}

.wealth-trend__svg {
  width: 100%;
  height: auto;
  display: block;
}

.wealth-trend__plot {
  fill: rgba(248, 251, 255, 0.96);
  stroke: rgba(154, 174, 204, 0.22);
}

.wealth-trend__grid {
  stroke: rgba(160, 180, 210, 0.22);
  stroke-width: 1;
}

.wealth-trend__grid--vertical {
  stroke-dasharray: 4 6;
}

.wealth-trend__axis {
  fill: #60779a;
  font-size: 12px;
}

.wealth-trend__axis--y {
  text-anchor: end;
}

.wealth-trend__line {
  fill: none;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.wealth-trend__line--actual {
  stroke-width: 3.5;
}

.wealth-trend__line--trend {
  stroke-width: 2.2;
  stroke-dasharray: 9 7;
  opacity: 0.9;
}

.wealth-trend__dot,
.wealth-trend__estimate-dot {
  stroke: rgba(255, 255, 255, 0.95);
  stroke-width: 2;
}

.wealth-trend__point-group {
  cursor: pointer;
}

.wealth-trend__dot {
  transition: transform 140ms ease, filter 140ms ease, r 140ms ease;
}

.wealth-trend__dot.is-active,
.wealth-trend__point-group:hover .wealth-trend__dot {
  filter: drop-shadow(0 0 8px rgba(15, 40, 72, 0.22));
}

.wealth-trend__dot:focus-visible {
  outline: none;
  stroke: rgba(15, 40, 72, 0.9);
  stroke-width: 3;
}

.wealth-trend__estimate-dot {
  stroke-width: 3;
}

.wealth-trend__tooltip {
  pointer-events: none;
}

.wealth-trend__tooltip-box {
  fill: rgba(15, 40, 72, 0.94);
  stroke: rgba(143, 211, 255, 0.36);
  stroke-width: 1;
}

.wealth-trend__tooltip-year {
  fill: rgba(190, 223, 255, 0.95);
  font-size: 9px;
  letter-spacing: 0.08em;
}

.wealth-trend__tooltip-value {
  fill: #ffffff;
  font-size: 11px;
  font-weight: 600;
}

.wealth-trend__legend {
  display: flex;
  flex-wrap: wrap;
  gap: 0.8rem 1rem;
  color: #516a8c;
  font-size: 0.8rem;
}

.wealth-trend__legend span {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
}

.wealth-trend__swatch {
  width: 0.8rem;
  height: 0.8rem;
  border-radius: 999px;
  flex: 0 0 auto;
}

.wealth-trend__swatch--trend {
  background: transparent;
  border: 2px dashed currentColor;
}

.wealth-trend__swatch--estimate {
  box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.82) inset;
}

@media (max-width: 700px) {
  .wealth-trend__header {
    flex-direction: column;
  }

}
</style>
