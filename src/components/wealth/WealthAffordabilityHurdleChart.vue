<template>
  <article class="wealth-hurdle">
    <div class="wealth-hurdle__header">
      <div>
        <h3>{{ title }}</h3>
        <p v-if="purchasePoint" class="wealth-hurdle__copy">
          Purchase year {{ purchaseYear }} with {{ formatCurrency(purchasePoint.optimalRequiredCash) }} total cash required.
        </p>
      </div>
      <p class="wealth-hurdle__status">
        {{ purchaseYear === null ? 'Not reached in horizon' : `Median purchase year ${purchaseYear}` }}
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
            <span><i class="wealth-hurdle__swatch wealth-hurdle__swatch--dashed" style="border-color:#7c3aed"></i>Deposit required</span>
            <span v-if="purchaseYear !== null"><i class="wealth-hurdle__swatch wealth-hurdle__swatch--marker"></i>Purchase year</span>
          </div>
        </div>
        <svg class="wealth-hurdle__svg" viewBox="0 0 520 220" preserveAspectRatio="xMidYMid meet" role="img" :aria-label="`${title} savings hurdle`">
          <rect x="48" y="16" width="452" height="164" rx="18" ry="18" class="wealth-hurdle__plot-bg" />
          <g v-for="tick in savingsTicks" :key="`s-${tick.value}`">
            <line x1="48" x2="500" :y1="yPos(savingsDomain, tick.value)" :y2="yPos(savingsDomain, tick.value)" class="wealth-hurdle__grid" />
            <text x="40" :y="yPos(savingsDomain, tick.value) + 4" class="wealth-hurdle__axis wealth-hurdle__axis--y">{{ formatShortCurrency(tick.value) }}</text>
          </g>
          <g v-for="tick in yearTicks" :key="`sy-${tick}`">
            <line :x1="xPos(tick)" :x2="xPos(tick)" y1="16" y2="180" class="wealth-hurdle__grid wealth-hurdle__grid--vertical" />
            <text :x="xPos(tick)" y="204" text-anchor="middle" class="wealth-hurdle__axis">Y{{ tick }}</text>
          </g>
          <g v-if="purchaseYear !== null">
            <line :x1="xPos(purchaseYear)" :x2="xPos(purchaseYear)" y1="16" y2="180" class="wealth-hurdle__purchase-line" />
            <text :x="xPos(purchaseYear)" y="28" text-anchor="middle" class="wealth-hurdle__purchase-label">Bought</text>
          </g>
          <path :d="buildPath(points, 'userSavings', savingsDomain)" class="wealth-hurdle__line" stroke="#2563eb" />
          <path :d="buildPath(points, 'optimalRequiredCash', savingsDomain)" class="wealth-hurdle__line wealth-hurdle__line--dotted" stroke="#7c3aed" />
        </svg>
      </section>

      <section class="wealth-hurdle__panel">
        <div class="wealth-hurdle__panel-head">
          <h4>Income vs borrowing hurdle</h4>
          <div class="wealth-hurdle__legend">
            <span><i class="wealth-hurdle__swatch" style="background:#14b8a6"></i>Household income</span>
            <span><i class="wealth-hurdle__swatch" style="background:#ef4444"></i>Income required</span>
          </div>
        </div>
        <svg class="wealth-hurdle__svg" viewBox="0 0 520 220" preserveAspectRatio="xMidYMid meet" role="img" :aria-label="`${title} income hurdle`">
          <rect x="48" y="16" width="452" height="164" rx="18" ry="18" class="wealth-hurdle__plot-bg" />
          <g v-for="tick in incomeTicks" :key="`i-${tick.value}`">
            <line x1="48" x2="500" :y1="yPos(incomeDomain, tick.value)" :y2="yPos(incomeDomain, tick.value)" class="wealth-hurdle__grid" />
            <text x="40" :y="yPos(incomeDomain, tick.value) + 4" class="wealth-hurdle__axis wealth-hurdle__axis--y">{{ formatShortCurrency(tick.value) }}</text>
          </g>
          <g v-for="tick in yearTicks" :key="`iy-${tick}`">
            <line :x1="xPos(tick)" :x2="xPos(tick)" y1="16" y2="180" class="wealth-hurdle__grid wealth-hurdle__grid--vertical" />
            <text :x="xPos(tick)" y="204" text-anchor="middle" class="wealth-hurdle__axis">Y{{ tick }}</text>
          </g>
          <path :d="buildPath(points, 'userIncome', incomeDomain)" class="wealth-hurdle__line" stroke="#14b8a6" />
          <path :d="buildPath(points, 'requiredIncome', incomeDomain)" class="wealth-hurdle__line wealth-hurdle__line--dashed" stroke="#ef4444" />
        </svg>
      </section>
    </div>
  </article>
</template>

<script setup>
import { computed } from 'vue'
import { formatShortCurrency } from '../../wealth/finance.js'

const props = defineProps({
  title: { type: String, required: true },
  purchaseYear: { type: Number, default: null },
  purchasePoint: { type: Object, default: null },
  points: { type: Array, default: () => [] }
})

const yearTicks = computed(() => {
  const maxYear = Math.max(0, ...props.points.map((point) => Number(point.year) || 0))
  if (maxYear <= 5) return Array.from({ length: maxYear + 1 }, (_, index) => index)
  return [...new Set([0, Math.round(maxYear * 0.25), Math.round(maxYear * 0.5), Math.round(maxYear * 0.75), maxYear])]
})

const savingsDomain = computed(() => buildDomain(props.points.flatMap((point) => [point.userSavings, point.optimalRequiredCash])))
const incomeDomain = computed(() => buildDomain(props.points.flatMap((point) => [point.userIncome, point.requiredIncome])))
const savingsTicks = computed(() => buildTicks(savingsDomain.value))
const incomeTicks = computed(() => buildTicks(incomeDomain.value))
function buildDomain(values) {
  const clean = values.filter((value) => Number.isFinite(Number(value)) && Number(value) >= 0).map((value) => Number(value))
  const max = clean.length ? Math.max(...clean) : 1
  return {
    min: 0,
    max: Math.max(1, max * 1.08)
  }
}

function buildTicks(domain) {
  return Array.from({ length: 4 }, (_, index) => ({
    value: domain.min + ((domain.max - domain.min) * index) / 3
  }))
}

function xPos(year) {
  const maxYear = Math.max(1, Math.max(0, ...props.points.map((point) => Number(point.year) || 0)))
  return 48 + (Math.max(0, Number(year) || 0) / maxYear) * 452
}

function yPos(domain, value) {
  const safeValue = Math.max(domain.min, Math.min(domain.max, Number(value) || 0))
  const span = Math.max(1, domain.max - domain.min)
  return 180 - ((safeValue - domain.min) / span) * 164
}

function buildPath(points, key, domain) {
  return points.reduce((path, point, index) => {
    const value = point?.[key]
    if (!Number.isFinite(Number(value))) return path
    const command = path ? 'L' : 'M'
    return `${path}${path ? ' ' : ''}${command} ${xPos(point.year)} ${yPos(domain, value)}`
  }, '')
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
.wealth-hurdle__legend {
  display: flex;
  gap: 0.75rem;
}

.wealth-hurdle__header,
.wealth-hurdle__panel-head {
  justify-content: space-between;
  align-items: flex-start;
}

.wealth-hurdle__header h3,
.wealth-hurdle__panel-head h4 {
  margin: 0.2rem 0 0;
}

.wealth-hurdle__panel-head h4 {
  font-size: 0.92rem;
}

.wealth-hurdle__copy,
.wealth-hurdle__status {
  margin: 0.3rem 0 0;
  color: #5d7394;
}

.wealth-hurdle__status {
  white-space: nowrap;
}

.wealth-hurdle__deposit-copy {
  margin: 0;
  color: #5d7394;
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

.wealth-hurdle__panel {
  display: grid;
  gap: 0.55rem;
  padding: 0.9rem;
  border-radius: 18px;
  background: rgba(247, 250, 255, 0.86);
  border: 1px solid rgba(154, 174, 204, 0.16);
}

.wealth-hurdle__legend {
  flex-wrap: wrap;
  color: #5d7394;
  font-size: 0.7rem;
}

.wealth-hurdle__legend span {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
}

.wealth-hurdle__swatch {
  width: 0.7rem;
  height: 0.7rem;
  border-radius: 999px;
}

.wealth-hurdle__swatch--dashed {
  background: transparent !important;
  border: 2px dotted currentColor;
}

.wealth-hurdle__swatch--marker {
  width: 0.2rem;
  border-radius: 999px;
  background: #173050;
}

.wealth-hurdle__svg {
  width: 100%;
  height: auto;
  display: block;
}

.wealth-hurdle__plot-bg {
  fill: rgba(255, 255, 255, 0.86);
  stroke: rgba(154, 174, 204, 0.18);
}

.wealth-hurdle__grid {
  stroke: rgba(160, 180, 210, 0.22);
  stroke-width: 1;
}

.wealth-hurdle__grid--vertical {
  stroke-dasharray: 4 6;
}

.wealth-hurdle__purchase-line {
  stroke: rgba(23, 48, 80, 0.82);
  stroke-width: 2;
  stroke-dasharray: 6 6;
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
  stroke-width: 3;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.wealth-hurdle__line--dashed {
  stroke-dasharray: 8 6;
}

.wealth-hurdle__line--dotted {
  stroke-dasharray: 2 8;
}

@media (max-width: 900px) {
  .wealth-hurdle__metrics,
  .wealth-hurdle__plots {
    grid-template-columns: 1fr;
  }

  .wealth-hurdle__header,
  .wealth-hurdle__panel-head {
    flex-direction: column;
  }

  .wealth-hurdle__status {
    white-space: normal;
  }
}
</style>
