<template>
  <article class="wealth-hurdle" @pointerleave="hoveredYear = null">
    <div class="wealth-hurdle__header">
      <div>
        <h3>{{ title }}</h3>
        <p v-if="purchasePoint" class="wealth-hurdle__copy">
          Purchase year {{ purchaseYear }} with {{ formatCurrency(purchasePoint.optimalRequiredCash) }} total cash required.
        </p>
      </div>
      <p class="wealth-hurdle__status">
        {{ purchaseYear === null ? 'Never could afford property' : `Median purchase year ${purchaseYear}` }}
      </p>
    </div>

    <p v-if="purchasePoint" class="wealth-hurdle__deposit-copy">
      Deposit required in simulation
      <strong>{{ formatCurrency(purchasePoint.optimalDepositAmount) }} / {{ formatPercent(purchasePoint.optimalDepositPct) }} of home value</strong>
    </p>

    <div class="wealth-hurdle__plots">
      <section class="wealth-hurdle__panel">
        <div class="wealth-hurdle__panel-head">
          <h4>Deposit required vs liquidity available</h4>
          <div class="wealth-hurdle__legend">
            <span><i class="wealth-hurdle__swatch" style="background:#2563eb"></i>Liquidity Available</span>
            <span><i class="wealth-hurdle__swatch wealth-hurdle__swatch--dotted" style="border-color:#7c3aed"></i>Deposit required</span>
            <span v-if="purchaseYear !== null"><i class="wealth-hurdle__swatch wealth-hurdle__swatch--marker"></i>Purchase year</span>
          </div>
        </div>
        <svg
          class="wealth-hurdle__svg"
          :viewBox="`0 0 ${viewWidth} ${viewHeight}`"
          preserveAspectRatio="xMidYMid meet"
          role="img"
          :aria-label="`${title} savings hurdle`"
          @pointermove="onPointerMove"
        >
          <rect
            :x="padding.left"
            :y="padding.top"
            :width="plotWidth"
            :height="plotHeight"
            rx="22"
            ry="22"
            class="wealth-hurdle__plot-bg"
          />
          <g v-for="tick in savingsTicks" :key="`s-${tick.value}`">
            <line :x1="padding.left" :x2="viewWidth - padding.right" :y1="yPos(savingsDomain, tick.value)" :y2="yPos(savingsDomain, tick.value)" class="wealth-hurdle__grid" />
            <text :x="padding.left - 12" :y="yPos(savingsDomain, tick.value) + 5" class="wealth-hurdle__axis wealth-hurdle__axis--y">{{ formatShortCurrency(tick.value) }}</text>
          </g>
          <g v-for="tick in yearTicks" :key="`sy-${tick}`">
            <line :x1="xPos(tick)" :x2="xPos(tick)" :y1="padding.top" :y2="viewHeight - padding.bottom" class="wealth-hurdle__grid wealth-hurdle__grid--vertical" />
            <text :x="xPos(tick)" :y="viewHeight - 12" text-anchor="middle" class="wealth-hurdle__axis">Y{{ tick }}</text>
          </g>
          <g v-if="purchaseYear !== null">
            <line :x1="xPos(purchaseYear)" :x2="xPos(purchaseYear)" :y1="padding.top" :y2="viewHeight - padding.bottom" class="wealth-hurdle__purchase-line" />
            <text :x="xPos(purchaseYear)" :y="padding.top + 14" text-anchor="middle" class="wealth-hurdle__purchase-label">Bought</text>
          </g>
          <path :d="buildPath('userSavings', savingsDomain)" class="wealth-hurdle__line" stroke="#2563eb" />
          <path :d="buildPath('optimalRequiredCash', savingsDomain)" class="wealth-hurdle__line wealth-hurdle__line--dotted" stroke="#7c3aed" />
          <g v-if="displayPoint">
            <line :x1="xPos(displayYear)" :x2="xPos(displayYear)" :y1="padding.top" :y2="viewHeight - padding.bottom" class="wealth-hurdle__hover-line" />
            <circle :cx="xPos(displayYear)" :cy="yPos(savingsDomain, displayPoint.userSavings)" r="6.5" fill="#2563eb" class="wealth-hurdle__point" />
            <circle :cx="xPos(displayYear)" :cy="yPos(savingsDomain, displayPoint.optimalRequiredCash)" r="6.5" fill="#7c3aed" class="wealth-hurdle__point" />
          </g>
        </svg>
      </section>

      <section class="wealth-hurdle__panel">
        <div class="wealth-hurdle__panel-head">
          <h4>Income vs borrowing hurdle</h4>
          <div class="wealth-hurdle__legend">
            <span><i class="wealth-hurdle__swatch" style="background:#14b8a6"></i>Household income</span>
            <span><i class="wealth-hurdle__swatch wealth-hurdle__swatch--dashed" style="border-color:#ef4444"></i>Income required</span>
          </div>
        </div>
        <svg
          class="wealth-hurdle__svg"
          :viewBox="`0 0 ${viewWidth} ${viewHeight}`"
          preserveAspectRatio="xMidYMid meet"
          role="img"
          :aria-label="`${title} income hurdle`"
          @pointermove="onPointerMove"
        >
          <rect
            :x="padding.left"
            :y="padding.top"
            :width="plotWidth"
            :height="plotHeight"
            rx="22"
            ry="22"
            class="wealth-hurdle__plot-bg"
          />
          <g v-for="tick in incomeTicks" :key="`i-${tick.value}`">
            <line :x1="padding.left" :x2="viewWidth - padding.right" :y1="yPos(incomeDomain, tick.value)" :y2="yPos(incomeDomain, tick.value)" class="wealth-hurdle__grid" />
            <text :x="padding.left - 12" :y="yPos(incomeDomain, tick.value) + 5" class="wealth-hurdle__axis wealth-hurdle__axis--y">{{ formatShortCurrency(tick.value) }}</text>
          </g>
          <g v-for="tick in yearTicks" :key="`iy-${tick}`">
            <line :x1="xPos(tick)" :x2="xPos(tick)" :y1="padding.top" :y2="viewHeight - padding.bottom" class="wealth-hurdle__grid wealth-hurdle__grid--vertical" />
            <text :x="xPos(tick)" :y="viewHeight - 12" text-anchor="middle" class="wealth-hurdle__axis">Y{{ tick }}</text>
          </g>
          <g v-if="purchaseYear !== null">
            <line :x1="xPos(purchaseYear)" :x2="xPos(purchaseYear)" :y1="padding.top" :y2="viewHeight - padding.bottom" class="wealth-hurdle__purchase-line" />
          </g>
          <path :d="buildPath('userIncome', incomeDomain)" class="wealth-hurdle__line" stroke="#14b8a6" />
          <path :d="buildPath('requiredIncome', incomeDomain)" class="wealth-hurdle__line wealth-hurdle__line--dashed" stroke="#ef4444" />
          <g v-if="displayPoint">
            <line :x1="xPos(displayYear)" :x2="xPos(displayYear)" :y1="padding.top" :y2="viewHeight - padding.bottom" class="wealth-hurdle__hover-line" />
            <circle :cx="xPos(displayYear)" :cy="yPos(incomeDomain, displayPoint.userIncome)" r="6.5" fill="#14b8a6" class="wealth-hurdle__point" />
            <circle :cx="xPos(displayYear)" :cy="yPos(incomeDomain, displayPoint.requiredIncome)" r="6.5" fill="#ef4444" class="wealth-hurdle__point" />
          </g>
        </svg>
      </section>
    </div>

    <aside v-if="displayPoint" class="wealth-hurdle__readout">
      <div class="wealth-hurdle__readout-head">
        <p class="wealth-hurdle__readout-kicker">Selected year</p>
        <h4>Year {{ displayYear }}</h4>
      </div>
      <div class="wealth-hurdle__metrics">
        <article class="wealth-hurdle__metric">
          <span>Liquidity Available</span>
          <strong>{{ formatCurrency(displayPoint.userSavings) }}</strong>
        </article>
        <article class="wealth-hurdle__metric">
          <span>Deposit required</span>
          <strong>{{ formatCurrency(displayPoint.optimalRequiredCash) }}</strong>
        </article>
        <article class="wealth-hurdle__metric">
          <span>Household income</span>
          <strong>{{ formatCurrency(displayPoint.userIncome) }}</strong>
        </article>
        <article class="wealth-hurdle__metric">
          <span>Income required</span>
          <strong>{{ formatCurrency(displayPoint.requiredIncome) }}</strong>
        </article>
      </div>
    </aside>
  </article>
</template>

<script setup>
import { computed, ref } from 'vue'
import { formatShortCurrency } from '../../wealth/finance.js'

const props = defineProps({
  title: { type: String, required: true },
  purchaseYear: { type: Number, default: null },
  purchasePoint: { type: Object, default: null },
  points: { type: Array, default: () => [] }
})

const viewWidth = 860
const viewHeight = 360
const padding = {
  top: 24,
  right: 28,
  bottom: 58,
  left: 94
}

const hoveredYear = ref(null)

const plotWidth = viewWidth - padding.left - padding.right
const plotHeight = viewHeight - padding.top - padding.bottom

const allYears = computed(() =>
  [...new Set(props.points.map(point => Number(point.year) || 0))].sort((left, right) => left - right)
)

const yearDomain = computed(() => ({
  min: 0,
  max: Math.max(1, ...allYears.value, 0)
}))

const yearTicks = computed(() => {
  const maxYear = yearDomain.value.max
  if (maxYear <= 5) return Array.from({ length: maxYear + 1 }, (_, index) => index)
  return [...new Set([0, Math.round(maxYear * 0.25), Math.round(maxYear * 0.5), Math.round(maxYear * 0.75), maxYear])]
})

const savingsDomain = computed(() => buildDomain(props.points.flatMap(point => [point.userSavings, point.optimalRequiredCash])))
const incomeDomain = computed(() => buildDomain(props.points.flatMap(point => [point.userIncome, point.requiredIncome])))
const savingsTicks = computed(() => buildTicks(savingsDomain.value))
const incomeTicks = computed(() => buildTicks(incomeDomain.value))

const defaultYear = computed(() => {
  if (props.purchaseYear !== null && Number.isFinite(Number(props.purchaseYear))) return Number(props.purchaseYear)
  return allYears.value.length ? allYears.value[allYears.value.length - 1] : null
})

const displayYear = computed(() => hoveredYear.value ?? defaultYear.value)

const displayPoint = computed(() => {
  if (displayYear.value === null || !props.points.length) return null
  return props.points.find(point => Number(point.year) === displayYear.value) || null
})

function buildDomain(values) {
  const clean = values
    .filter(value => Number.isFinite(Number(value)) && Number(value) >= 0)
    .map(value => Number(value))
  const max = clean.length ? Math.max(...clean) : 1
  return {
    min: 0,
    max: Math.max(1, max * 1.1)
  }
}

function buildTicks(domain) {
  return Array.from({ length: 5 }, (_, index) => ({
    value: domain.min + ((domain.max - domain.min) * index) / 4
  }))
}

function xPos(year) {
  const span = Math.max(1, yearDomain.value.max - yearDomain.value.min)
  return padding.left + ((Math.max(0, Number(year) || 0) - yearDomain.value.min) / span) * plotWidth
}

function yPos(domain, value) {
  const safeValue = Math.max(domain.min, Math.min(domain.max, Number(value) || 0))
  const span = Math.max(1, domain.max - domain.min)
  return viewHeight - padding.bottom - ((safeValue - domain.min) / span) * plotHeight
}

function buildPath(key, domain) {
  return props.points.reduce((path, point, index) => {
    const value = point?.[key]
    if (!Number.isFinite(Number(value))) return path
    const command = index === 0 || !path ? 'M' : 'L'
    return `${path}${path ? ' ' : ''}${command} ${xPos(point.year)} ${yPos(domain, value)}`
  }, '')
}

function onPointerMove(event) {
  if (!allYears.value.length) return

  const svg = event.currentTarget
  const ctm = typeof svg?.getScreenCTM === 'function' ? svg.getScreenCTM() : null
  if (!ctm) return

  const svgX = (event.clientX - ctm.e) / ctm.a
  const chartX = clamp(svgX - padding.left, 0, plotWidth)
  const ratio = plotWidth <= 0 ? 0 : chartX / plotWidth
  const estimatedYear = yearDomain.value.min + ratio * (yearDomain.value.max - yearDomain.value.min)

  hoveredYear.value = allYears.value.reduce((bestYear, year) =>
    Math.abs(year - estimatedYear) < Math.abs(bestYear - estimatedYear) ? year : bestYear
  , allYears.value[0])
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max)
}

function formatCurrency(value) {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    maximumFractionDigits: 0
  }).format(Number(value) || 0)
}

function formatPercent(value) {
  return `${Number(value || 0).toFixed(1)}%`
}
</script>

<style scoped>
.wealth-hurdle {
  display: grid;
  gap: 1rem;
  padding: 1rem;
}

.wealth-hurdle__header,
.wealth-hurdle__panel-head,
.wealth-hurdle__legend,
.wealth-hurdle__readout-head {
  display: flex;
  gap: 0.75rem;
}

.wealth-hurdle__header,
.wealth-hurdle__panel-head,
.wealth-hurdle__readout-head {
  justify-content: space-between;
  align-items: flex-start;
}

.wealth-hurdle__header h3,
.wealth-hurdle__panel-head h4,
.wealth-hurdle__readout-head h4 {
  margin: 0.2rem 0 0;
}

.wealth-hurdle__panel-head h4,
.wealth-hurdle__readout-head h4 {
  font-size: 0.98rem;
}

.wealth-hurdle__copy,
.wealth-hurdle__status,
.wealth-hurdle__deposit-copy,
.wealth-hurdle__readout-kicker {
  margin: 0.3rem 0 0;
  color: #5d7394;
}

.wealth-hurdle__status {
  white-space: nowrap;
}

.wealth-hurdle__deposit-copy strong {
  display: block;
  margin-top: 0.15rem;
  color: #173050;
  font-size: 1rem;
}

.wealth-hurdle__plots {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
}

.wealth-hurdle__panel,
.wealth-hurdle__readout {
  display: grid;
  gap: 0.75rem;
  padding: 1rem;
  border-radius: 22px;
  background: rgba(247, 250, 255, 0.9);
  border: 1px solid rgba(154, 174, 204, 0.16);
}

.wealth-hurdle__legend {
  flex-wrap: wrap;
  color: #5d7394;
  font-size: 0.72rem;
}

.wealth-hurdle__legend span {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
}

.wealth-hurdle__swatch {
  width: 0.78rem;
  height: 0.78rem;
  border-radius: 999px;
}

.wealth-hurdle__swatch--dashed,
.wealth-hurdle__swatch--dotted {
  background: transparent !important;
}

.wealth-hurdle__swatch--dashed {
  border: 2px dashed currentColor;
}

.wealth-hurdle__swatch--dotted {
  border: 2px dotted currentColor;
}

.wealth-hurdle__swatch--marker {
  width: 0.22rem;
  border-radius: 999px;
  background: #173050;
}

.wealth-hurdle__svg {
  width: 100%;
  height: auto;
  display: block;
  overflow: visible;
  cursor: crosshair;
}

.wealth-hurdle__plot-bg {
  fill: rgba(255, 255, 255, 0.92);
  stroke: rgba(154, 174, 204, 0.18);
}

.wealth-hurdle__grid {
  stroke: rgba(160, 180, 210, 0.22);
  stroke-width: 1;
}

.wealth-hurdle__grid--vertical {
  stroke-dasharray: 4 7;
}

.wealth-hurdle__purchase-line,
.wealth-hurdle__hover-line {
  stroke-width: 2;
}

.wealth-hurdle__purchase-line {
  stroke: rgba(23, 48, 80, 0.72);
  stroke-dasharray: 7 6;
}

.wealth-hurdle__hover-line {
  stroke: rgba(37, 99, 235, 0.26);
  stroke-dasharray: 4 6;
}

.wealth-hurdle__purchase-label {
  fill: #173050;
  font-size: 0.72rem;
  font-weight: 600;
}

.wealth-hurdle__axis {
  fill: #60779a;
  font-size: 11px;
}

.wealth-hurdle__axis--y {
  text-anchor: end;
}

.wealth-hurdle__line {
  fill: none;
  stroke-width: 3.5;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.wealth-hurdle__line--dashed {
  stroke-dasharray: 10 7;
}

.wealth-hurdle__line--dotted {
  stroke-dasharray: 2 10;
}

.wealth-hurdle__point {
  stroke: rgba(255, 255, 255, 0.96);
  stroke-width: 3;
}

.wealth-hurdle__readout {
  grid-template-columns: auto 1fr;
  align-items: start;
}

.wealth-hurdle__readout-kicker {
  text-transform: uppercase;
  letter-spacing: 0.14em;
  font-size: 0.72rem;
}

.wealth-hurdle__metrics {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.75rem;
}

.wealth-hurdle__metric {
  display: grid;
  gap: 0.2rem;
  padding: 0.8rem 0.9rem;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.82);
  border: 1px solid rgba(154, 174, 204, 0.14);
}

.wealth-hurdle__metric span {
  color: #60779a;
  font-size: 0.76rem;
}

.wealth-hurdle__metric strong {
  color: #173050;
  font-size: 1rem;
}

@media (max-width: 1100px) {
  .wealth-hurdle__plots,
  .wealth-hurdle__metrics,
  .wealth-hurdle__readout {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 900px) {
  .wealth-hurdle__header,
  .wealth-hurdle__panel-head,
  .wealth-hurdle__readout-head {
    flex-direction: column;
  }

  .wealth-hurdle__status {
    white-space: normal;
  }
}
</style>
