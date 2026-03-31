<template>
  <section class="income-editor">
    <div class="income-editor__header">
      <div class="income-editor__actions">
        <button
          v-if="profile.useCustomIncomeSeries"
          type="button"
          class="income-editor__reset"
          @click="resetToFlatGrowth"
        >
          Reset to flat growth
        </button>
      </div>
    </div>

    <p class="income-editor__copy">
      Drag the points for later years if you want to model promotions, plateaus, or career changes.
    </p>

    <div class="income-editor__chart-card">
      <svg
        ref="chartRef"
        class="income-editor__chart"
        viewBox="0 0 760 196"
        role="img"
        :aria-label="`Projected annual income for ${profileLabel} over the selected time horizon`"
        @pointermove="handlePointerMove"
        @pointerup="endDrag"
        @pointerleave="handlePointerLeave"
      >
        <text
          v-for="guide in yGuides"
          :key="`${guide.value}-label`"
          :x="guide.labelX"
          :y="guide.labelY"
          class="income-editor__guide-label"
          text-anchor="start"
        >
          {{ formatCompactCurrency(guide.value) }}
        </text>
        <path
          v-for="guide in yGuides"
          :key="guide.value"
          :d="guide.path"
          class="income-editor__guide"
        />
        <path :d="areaPath" class="income-editor__area" />
        <path :d="linePath" class="income-editor__line" />

        <g
          v-for="point in chartPoints"
          :key="point.index"
          class="income-editor__point-group"
        >
          <circle
            :cx="point.x"
            :cy="point.y"
            :r="point.index === 0 ? 4.2 : 4.9"
            class="income-editor__point"
            :class="{
              'is-locked': point.index === 0,
              'is-active': hoverYearIndex === point.index || selectedYearIndex === point.index
            }"
            @click="selectedYearIndex = point.index"
            @pointerenter="setHoverYear(point.index)"
            @pointerleave="clearHoverYear"
            @pointerdown="startDrag(point.index, $event)"
          />
        </g>

        <g v-if="hoverPoint" class="income-editor__tooltip" :transform="tooltipTransform">
          <rect class="income-editor__tooltip-box" width="118" height="42" rx="12" ry="12" />
          <text x="12" y="18" class="income-editor__tooltip-year">Year {{ hoverPoint.index + 1 }}</text>
          <text x="12" y="32" class="income-editor__tooltip-value">{{ formatCurrency(hoverPoint.income) }}</text>
        </g>
      </svg>

      <div class="income-editor__axis">
        <span>Year 1</span>
        <span>Year {{ profile.horizonYears }}</span>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import {
  buildFlatIncomeSeries,
  normaliseIncomeProfile,
  resizeCustomIncomeSeries
} from '../../wealth/incomeSeries.js'

const props = defineProps({
  profile: { type: Object, required: true },
  profileLabel: { type: String, default: 'this person' }
})

const CHART_WIDTH = 760
const CHART_HEIGHT = 196
const CHART_LEFT = 78
const CHART_RIGHT = 28
const CHART_TOP = 18
const CHART_BOTTOM = 24
const CHART_TOOLTIP_WIDTH = 118
const CHART_TOOLTIP_EDGE_PADDING = 8

const chartRef = ref(null)
const selectedYearIndex = ref(1)
const draggingYearIndex = ref(null)
const hoverYearIndex = ref(null)
const dragStartY = ref(0)
const dragStartIncome = ref(0)

watch(
  () => props.profile.horizonYears,
  (value) => {
    const safeHorizonYears = Math.max(10, Math.min(30, Math.round(Number(value) || 30)))
    if (safeHorizonYears !== value) {
      props.profile.horizonYears = safeHorizonYears
      return
    }

    if (selectedYearIndex.value > safeHorizonYears - 1) {
      selectedYearIndex.value = safeHorizonYears - 1
    }

    syncIncomeSeries('horizon')
  },
  { immediate: true }
)

watch(
  () => props.profile.annualIncome,
  (value) => {
    const safeAnnualIncome = Math.max(0, Number(value) || 0)
    if (safeAnnualIncome !== value) {
      props.profile.annualIncome = safeAnnualIncome
      return
    }

    resetToFlatGrowth()
  },
  { immediate: true }
)

watch(
  () => props.profile.incomeGrowthRate,
  (value) => {
    const safeGrowthRate = Math.max(0, Math.min(0.1, Number(value) || 0))
    if (safeGrowthRate !== value) {
      props.profile.incomeGrowthRate = safeGrowthRate
      return
    }

    resetToFlatGrowth()
  },
  { immediate: true }
)

watch(
  () => props.profile.incomeCurve,
  (value) => {
    const safeIncomeCurve = ['logarithmic', 'sigmoid', 'exponential'].includes(value) ? value : 'sigmoid'
    if (safeIncomeCurve !== value) {
      props.profile.incomeCurve = safeIncomeCurve
      return
    }

    resetToFlatGrowth()
  },
  { immediate: true }
)

watch(
  () => props.profile.useCustomIncomeSeries,
  () => {
    syncIncomeSeries('mode')
  },
  { immediate: true }
)

const incomeSeries = computed(() => normaliseIncomeProfile(props.profile).annualIncomeSeries)

const chartMetrics = computed(() => {
  const series = incomeSeries.value
  const baseIncome = Math.max(series[0] || 0, 1)
  const maxIncome = Math.max(...series, 1)
  const visualMin = Math.max(0, baseIncome * 0.7)
  const visualMax = Math.max(maxIncome * 1.08, visualMin + 1000)
  return { visualMin, visualMax }
})

const chartPoints = computed(() => {
  const series = incomeSeries.value
  const usableWidth = CHART_WIDTH - CHART_LEFT - CHART_RIGHT
  const usableHeight = CHART_HEIGHT - CHART_TOP - CHART_BOTTOM
  const denominator = Math.max(1, series.length - 1)
  const incomeRange = Math.max(1, chartMetrics.value.visualMax - chartMetrics.value.visualMin)

  return series.map((income, index) => {
    const x = CHART_LEFT + (usableWidth * index) / denominator
    const y = CHART_TOP + usableHeight - ((income - chartMetrics.value.visualMin) / incomeRange) * usableHeight
    return {
      index,
      income,
      x,
      y
    }
  })
})

const linePath = computed(() =>
  chartPoints.value.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ')
)

const areaPath = computed(() => {
  if (!chartPoints.value.length) return ''
  const bottomY = CHART_HEIGHT - CHART_BOTTOM
  const firstPoint = chartPoints.value[0]
  const lastPoint = chartPoints.value[chartPoints.value.length - 1]
  return `${linePath.value} L ${lastPoint.x} ${bottomY} L ${firstPoint.x} ${bottomY} Z`
})

const yGuides = computed(() => {
  const steps = 5
  return Array.from({ length: steps }, (_, index) => {
    const ratio = index / (steps - 1)
    const value = chartMetrics.value.visualMax - (chartMetrics.value.visualMax - chartMetrics.value.visualMin) * ratio
    const y = CHART_TOP + (CHART_HEIGHT - CHART_BOTTOM - CHART_TOP) * ratio
    return {
      value,
      path: `M ${CHART_LEFT} ${y} L ${CHART_WIDTH - CHART_RIGHT} ${y}`,
      labelX: 8,
      labelY: y + 3
    }
  })
})

const hoverPoint = computed(() => {
  const activeIndex = draggingYearIndex.value ?? hoverYearIndex.value
  return chartPoints.value.find(point => point.index === activeIndex) || null
})

const tooltipTransform = computed(() => {
  if (!hoverPoint.value) return 'translate(0 0)'
  const x = Math.min(
    Math.max(hoverPoint.value.x - CHART_TOOLTIP_WIDTH / 2, CHART_LEFT + CHART_TOOLTIP_EDGE_PADDING),
    CHART_WIDTH - CHART_TOOLTIP_WIDTH - CHART_TOOLTIP_EDGE_PADDING
  )
  const y = Math.max(hoverPoint.value.y - 48, 10)
  return `translate(${x} ${y})`
})

function syncIncomeSeries() {
  const profile = normaliseIncomeProfile(props.profile)

  if (!profile.useCustomIncomeSeries) {
    props.profile.annualIncomeSeries = buildFlatIncomeSeries(
      profile.annualIncome,
      profile.incomeGrowthRate,
      profile.horizonYears,
      profile.incomeCurve
    )
    return
  }

  props.profile.annualIncomeSeries = resizeCustomIncomeSeries(
    props.profile.annualIncomeSeries,
    profile.annualIncome,
    profile.horizonYears,
    profile.incomeGrowthRate,
    profile.incomeCurve
  )
}

function resetToFlatGrowth() {
  props.profile.useCustomIncomeSeries = false
  props.profile.annualIncomeSeries = buildFlatIncomeSeries(
    props.profile.annualIncome,
    props.profile.incomeGrowthRate,
    props.profile.horizonYears,
    props.profile.incomeCurve
  )
}

function updateIncomeAtIndex(index, value) {
  if (index <= 0) return
  const nextValue = Math.max(0, Math.round(Number(value) || 0))
  const currentSeries = [...incomeSeries.value]
  const currentValue = Math.max(0, currentSeries[index] || 0)
  const nextSeries = [...currentSeries]

  nextSeries[index] = nextValue

  if (currentValue > 0) {
    const scale = nextValue / currentValue
    for (let offsetIndex = index + 1; offsetIndex < nextSeries.length; offsetIndex += 1) {
      nextSeries[offsetIndex] = Math.max(0, Math.round(currentSeries[offsetIndex] * scale))
    }
  } else {
    for (let offsetIndex = index + 1; offsetIndex < nextSeries.length; offsetIndex += 1) {
      nextSeries[offsetIndex] = nextValue
    }
  }

  props.profile.useCustomIncomeSeries = true
  props.profile.annualIncomeSeries = resizeCustomIncomeSeries(
    nextSeries,
    props.profile.annualIncome,
    props.profile.horizonYears,
    props.profile.incomeGrowthRate,
    props.profile.incomeCurve
  )
}

function startDrag(index, event) {
  selectedYearIndex.value = index
  hoverYearIndex.value = index
  if (index === 0) return
  draggingYearIndex.value = index
  dragStartY.value = event.clientY
  dragStartIncome.value = incomeSeries.value[index] || 0
  event.preventDefault()
}

function endDrag() {
  draggingYearIndex.value = null
  dragStartY.value = 0
  dragStartIncome.value = 0
}

function setHoverYear(index) {
  hoverYearIndex.value = index
}

function clearHoverYear() {
  if (draggingYearIndex.value !== null) return
  hoverYearIndex.value = null
}

function handlePointerLeave() {
  hoverYearIndex.value = null
  endDrag()
}

function handlePointerMove(event) {
  const index = draggingYearIndex.value
  if (!chartRef.value) return

  if (index === null) return
  const pixelsPerStep = 14
  const deltaY = dragStartY.value - event.clientY
  const incomeSteps = Math.trunc(deltaY / pixelsPerStep)
  const dragDistance = Math.abs(deltaY)
  const dollarsPerStep = deltaY >= 0
    ? Math.min(10000, 1000 * (Math.floor(dragDistance / 70) + 1))
    : 1000 * (Math.floor(dragDistance / 70) + 1)
  const nextIncome = Math.max(0, dragStartIncome.value + incomeSteps * dollarsPerStep)
  updateIncomeAtIndex(index, nextIncome)
  hoverYearIndex.value = index
}

function formatCurrency(value) {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    maximumFractionDigits: 0
  }).format(Number(value) || 0)
}

function formatCompactCurrency(value) {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    notation: 'compact',
    maximumFractionDigits: 1
  }).format(Number(value) || 0)
}

onBeforeUnmount(() => {
  draggingYearIndex.value = null
  hoverYearIndex.value = null
})
</script>

<style scoped>
.income-editor {
  display: grid;
  gap: 1rem;
}

.income-editor__header,
.income-editor__actions {
  display: flex;
  gap: 0.75rem;
}

.income-editor__header {
  justify-content: space-between;
  align-items: center;
}

.income-editor__eyebrow {
  margin: 0;
  text-transform: uppercase;
  letter-spacing: 0.16em;
  font-size: 0.7rem;
  color: #5d7ba3;
}

.income-editor__header h3 {
  margin: 0.25rem 0 0;
  font-size: 1.05rem;
}

.income-editor__actions {
  align-items: center;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.income-editor__reset {
  border-radius: 999px;
  font: inherit;
}

.income-editor__reset {
  border: 1px solid rgba(154, 174, 204, 0.24);
  padding: 0.48rem 0.8rem;
  background: rgba(255, 255, 255, 0.92);
  color: #21456d;
  cursor: pointer;
}

.income-editor__copy {
  margin: 0;
  color: #5b7192;
  line-height: 1.5;
}

.income-editor__chart-card {
  display: grid;
  gap: 0.6rem;
}

.income-editor__chart {
  width: 100%;
  height: auto;
  touch-action: none;
}

.income-editor__guide-label {
  fill: #6a84a8;
  font-size: 9px;
  letter-spacing: 0.02em;
}

.income-editor__guide {
  fill: none;
  stroke: rgba(128, 152, 182, 0.18);
  stroke-width: 1;
}

.income-editor__area {
  fill: rgba(125, 211, 252, 0.18);
}

.income-editor__line {
  fill: none;
  stroke: #0f6cab;
  stroke-width: 3;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.income-editor__point {
  fill: #ffffff;
  stroke: #0f6cab;
  stroke-width: 2;
  cursor: pointer;
  transition: fill 120ms ease, stroke 120ms ease;
}

.income-editor__point.is-active {
  fill: #dff3ff;
}

.income-editor__point.is-locked {
  fill: #0f6cab;
  cursor: default;
}

.income-editor__point-group:hover .income-editor__point:not(.is-locked) {
  stroke: #0a4f80;
}

.income-editor__axis {
  display: flex;
  justify-content: space-between;
  color: #6481a6;
  font-size: 0.65rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

.income-editor__tooltip {
  pointer-events: none;
}

.income-editor__tooltip-box {
  fill: rgba(15, 40, 72, 0.94);
  stroke: rgba(143, 211, 255, 0.36);
  stroke-width: 1;
}

.income-editor__tooltip-year {
  fill: rgba(190, 223, 255, 0.95);
  font-size: 9px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.income-editor__tooltip-value {
  fill: #ffffff;
  font-size: 11px;
  font-weight: 600;
}

@media (max-width: 820px) {
  .income-editor__header {
    display: grid;
  }

  .income-editor__actions {
    justify-content: flex-start;
  }
}
</style>
