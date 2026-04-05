<template>
  <section :class="['wealth-flow', { card: !props.embedded, 'wealth-flow--embedded': props.embedded }]">
    <div class="wealth-flow__header">
      <div>
        <p class="wealth-flow__kicker">{{ activeModeMeta.kicker }}</p>
        <h3>{{ activeModeMeta.title }}</h3>
        <p class="wealth-flow__subtitle">{{ activeModeMeta.subtitle }}</p>
      </div>
    </div>

    <div v-if="showModeControls" class="wealth-flow__controls">
      <button
        v-for="mode in modeOptions"
        :key="mode.key"
        type="button"
        class="wealth-flow__chip"
        :class="{ 'is-active': mode.key === activeModeKey }"
        @click="activeModeKey = mode.key"
      >
        {{ mode.label }}
      </button>
    </div>

    <div v-if="props.showStrategyControls && strategyOptions.length > 1" class="wealth-flow__controls">
      <button
        v-for="strategy in strategyOptions"
        :key="strategy.key"
        type="button"
        class="wealth-flow__chip"
        :class="{ 'is-active': strategy.key === currentStrategyKey }"
        @click="setCurrentStrategyKey(strategy.key)"
      >
        <span class="wealth-flow__chip-dot" :style="{ background: strategy.color }"></span>
        {{ strategy.shortLabel || strategy.label }}
      </button>
    </div>

    <div class="wealth-flow__layout">
      <div class="wealth-flow__body" @pointerleave="onChartLeave">
        <svg
          v-if="activeYearRows.length"
          class="wealth-flow__svg"
          :viewBox="`0 0 ${viewWidth} ${viewHeight}`"
          preserveAspectRatio="none"
          role="img"
          :aria-label="activeModeMeta.title"
        >
          <rect
            :x="padding.left"
            :y="padding.top"
            :width="plotWidth"
            :height="plotHeight"
            rx="20"
            ry="20"
            class="wealth-flow__plot-bg"
          />

          <g v-for="tick in yTicks" :key="`y-${tick.value}`">
            <line
              :x1="padding.left"
              :x2="viewWidth - padding.right"
              :y1="yPos(tick.value)"
              :y2="yPos(tick.value)"
              class="wealth-flow__grid"
            />
            <text
              :x="padding.left - 12"
              :y="yPos(tick.value) + 5"
              class="wealth-flow__axis wealth-flow__axis--y"
            >
              {{ tick.label }}
            </text>
          </g>

          <g v-for="row in activeYearRows" :key="`x-${row.year}`">
            <line
              :x1="xPos(row.year)"
              :x2="xPos(row.year)"
              :y1="padding.top"
              :y2="viewHeight - padding.bottom"
              class="wealth-flow__grid wealth-flow__grid--vertical"
            />
            <text
              :x="xPos(row.year)"
              :y="viewHeight - 12"
              text-anchor="middle"
              class="wealth-flow__axis wealth-flow__axis--x"
              :class="{ 'is-selected': row.year === currentSelectedYear }"
              @click="onSelectYear(row.year)"
            >
              Y{{ row.year }}
            </text>
          </g>

          <line
            :x1="padding.left"
            :x2="viewWidth - padding.right"
            :y1="yPos(0)"
            :y2="yPos(0)"
            class="wealth-flow__zero"
          />

          <g v-for="row in activeYearRows" :key="`bars-${row.year}`">
            <rect
              :x="xPos(row.year) - ((barWidth + 18) / 2)"
              :y="padding.top"
              :width="barWidth + 18"
              :height="plotHeight"
              class="wealth-flow__column-hit"
              @pointerenter="onColumnHover(row.year)"
              @click="onSelectYear(row.year)"
            />
            <rect
              :x="xPos(row.year) - ((barWidth + 10) / 2)"
              :y="padding.top"
              :width="barWidth + 10"
              :height="plotHeight"
              :class="[
                'wealth-flow__column-accent',
                {
                  'is-hovered': isColumnHovered(row.year),
                  'is-selected': isColumnSelected(row.year)
                }
              ]"
            />
            <rect
              v-for="segment in row.segments"
              :key="`${row.year}-${segment.key}`"
              :x="xPos(row.year) - (barWidth / 2)"
              :y="segment.value >= 0 ? yPos(segment.end) : yPos(segment.start)"
              :width="barWidth"
              :height="Math.max(2, Math.abs(yPos(segment.end) - yPos(segment.start)))"
              :fill="segment.color"
              :class="[
                'wealth-flow__segment',
                {
                  'is-active': isSegmentHovered(row.year, segment.key),
                  'is-column-hovered': isColumnHovered(row.year),
                  'is-column-selected': isColumnSelected(row.year)
                }
              ]"
              @click="onSelectYear(row.year)"
            />
          </g>

          <line
            v-if="currentSelectedYear !== null"
            :x1="xPos(currentSelectedYear)"
            :x2="xPos(currentSelectedYear)"
            :y1="padding.top"
            :y2="viewHeight - padding.bottom"
            class="wealth-flow__hover-line"
          />
        </svg>

        <p v-if="!activeYearRows.length" class="wealth-flow__empty">Simulation results will appear here once the calculator runs.</p>
      </div>

      <aside :class="['wealth-flow__side', { card: !props.embedded }]">
        <div v-if="selectedRow" class="wealth-flow__side-header">
          <div class="wealth-flow__side-topline">
            <div>
              <p class="wealth-flow__kicker">Selected year</p>
              <h4>Year {{ selectedRow.year }}</h4>
            </div>

            <div class="wealth-flow__controls wealth-flow__controls--tight">
              <button
                type="button"
                class="wealth-flow__chip wealth-flow__chip--small"
                :class="{ 'is-active': currentDetailPeriodKey === 'annual' }"
                @click="setCurrentDetailPeriodKey('annual')"
              >
                Per year
              </button>
              <button
                type="button"
                class="wealth-flow__chip wealth-flow__chip--small"
                :class="{ 'is-active': currentDetailPeriodKey === 'weekly' }"
                @click="setCurrentDetailPeriodKey('weekly')"
              >
                Per week
              </button>
            </div>
          </div>

          <div class="wealth-flow__side-summary">
            <p class="wealth-flow__side-copy wealth-flow__side-copy--left">
              {{ activeModeMeta.positiveLabel }} {{ formatScaledCurrency(selectedRow.positiveTotal) }}
            </p>
            <p class="wealth-flow__side-copy wealth-flow__side-copy--right">
              {{ activeModeMeta.negativeLabel }} {{ formatScaledCurrency(selectedRow.negativeTotal) }}
            </p>
          </div>
        </div>

        <div v-if="selectedRow" class="wealth-flow__detail-layout">
          <section class="wealth-flow__detail-column">
            <div class="wealth-flow__detail-list">
              <article
                v-for="segment in selectedPositiveSegments"
                :key="segment.key"
                class="wealth-flow__side-row"
                :class="{ 'is-active': isSegmentHovered(selectedRow.year, segment.key) }"
                @pointerenter="onDetailHover(selectedRow.year, segment)"
                @pointerleave="onSegmentLeave"
              >
                <div class="wealth-flow__side-top">
                  <span class="wealth-flow__tooltip-label">{{ segment.label }}</span>
                </div>
                <div class="wealth-flow__side-meta wealth-flow__side-meta--table">
                  <strong>{{ formatScaledCurrency(segment.amount) }}</strong>
                  <span>|</span>
                  <span>{{ formatSegmentPercent(segment.percentLabel) }}</span>
                </div>
              </article>
            </div>
          </section>

          <div class="wealth-flow__detail-bar-shell">
            <svg
              class="wealth-flow__detail-bar"
              :viewBox="`0 0 ${detailViewWidth} ${detailViewHeight}`"
              preserveAspectRatio="none"
              role="img"
              :aria-label="`Year ${selectedRow.year} detail`"
            >
              <line
                :x1="detailPadding.left"
                :x2="detailViewWidth - detailPadding.right"
                :y1="detailYPos(0)"
                :y2="detailYPos(0)"
                class="wealth-flow__zero"
              />
              <rect
                v-for="segment in selectedRow.segments"
                :key="`detail-${segment.key}`"
                :x="detailBarX"
                :y="segment.value >= 0 ? detailYPos(segment.end, selectedRow) : detailYPos(segment.start, selectedRow)"
                :width="detailBarWidth"
                :height="Math.max(2, Math.abs(detailYPos(segment.end, selectedRow) - detailYPos(segment.start, selectedRow)))"
                :fill="segment.color"
                :data-direction="segment.value >= 0 ? 'positive' : 'negative'"
                :class="['wealth-flow__segment', 'wealth-flow__detail-segment', { 'is-active': isSegmentHovered(selectedRow.year, segment.key) }]"
                @pointerenter="onDetailHover(selectedRow.year, segment)"
                @pointerleave="onSegmentLeave"
              />
            </svg>
          </div>

          <section class="wealth-flow__detail-column">
            <div class="wealth-flow__detail-list">
              <article
                v-for="segment in selectedNegativeSegments"
                :key="segment.key"
                class="wealth-flow__side-row"
                :class="{ 'is-active': isSegmentHovered(selectedRow.year, segment.key) }"
                @pointerenter="onDetailHover(selectedRow.year, segment)"
                @pointerleave="onSegmentLeave"
              >
                <div class="wealth-flow__side-top">
                  <span class="wealth-flow__tooltip-label">{{ segment.label }}</span>
                </div>
                <div class="wealth-flow__side-meta wealth-flow__side-meta--table">
                  <strong>{{ formatScaledCurrency(segment.amount) }}</strong>
                  <span>|</span>
                  <span>{{ formatSegmentPercent(segment.percentLabel) }}</span>
                </div>
              </article>
            </div>
          </section>
        </div>

        <div v-else class="wealth-flow__side-empty">
          <p class="wealth-flow__kicker">Year detail</p>
          <h4>Select a year</h4>
          <p class="wealth-flow__side-copy">Click any year on the chart to inspect the positive and negative contributors, then switch between yearly and weekly amounts.</p>
        </div>
      </aside>
    </div>
  </section>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { formatShortCurrency } from '../../wealth/finance.js'

const props = defineProps({
  detailPeriodKey: {
    type: String,
    default: ''
  },
  embedded: {
    type: Boolean,
    default: false
  },
  selectedStrategyKey: {
    type: String,
    default: ''
  },
  selectedYear: {
    type: Number,
    default: null
  },
  showStrategyControls: {
    type: Boolean,
    default: true
  },
  variant: {
    type: String,
    default: 'outcome'
  },
  strategies: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits([
  'update:detailPeriodKey',
  'update:selectedStrategyKey',
  'update:selectedYear'
])

const viewWidth = 1120
const viewHeight = 760
const padding = { top: 28, right: 36, bottom: 54, left: 92 }
const plotWidth = viewWidth - padding.left - padding.right
const plotHeight = viewHeight - padding.top - padding.bottom
const detailViewWidth = 170
const detailViewHeight = 520
const detailPadding = { top: 8, right: 20, bottom: 8, left: 20 }
const detailPlotWidth = detailViewWidth - detailPadding.left - detailPadding.right
const detailPlotHeight = detailViewHeight - detailPadding.top - detailPadding.bottom
const detailBarWidth = 68
const detailBarX = detailPadding.left + ((detailPlotWidth - detailBarWidth) / 2)
const modeOptions = [
  { key: 'cashflow', label: 'Cashflow' },
  { key: 'netWorthChange', label: 'Net Worth Change' }
]

const modeMeta = {
  cashflow: {
    kicker: 'Cashflow',
    title: 'Cash received and cash spent each year',
    subtitle: 'Tracks actual cash moving in and out of the household. Unrealised portfolio and property gains are excluded.',
    positiveLabel: 'Inflows',
    negativeLabel: 'Outflows',
    percentLabelSuffix: 'of annual flow'
  },
  netWorthChange: {
    kicker: 'Net Worth Change',
    title: 'What changed wealth each year',
    subtitle: 'Shows annual wealth drivers including retained earnings, market growth, property growth, and debt paydown.',
    positiveLabel: 'Positive drivers',
    negativeLabel: 'Drags',
    percentLabelSuffix: 'of annual movement'
  }
}

const guidanceMeta = {
  kicker: 'Budget Guide',
  title: 'How to allocate the money you receive',
  subtitle: 'Turns the yearly result into a practical budget: gross income in, tax and required spending out, then the exact next step for any remaining cash.',
  positiveLabel: 'Inflow',
  negativeLabel: 'Outflow',
  percentLabelSuffix: 'of flow'
}

const wealthMeta = {
  kicker: 'Cumulative Net Worth',
  title: 'Assets built and liabilities remaining by year',
  subtitle: 'Shows net worth as a balance sheet: liquid assets and gross property value on one side, with mortgage and remaining HELP/HECS debt reducing the total.',
  positiveLabel: 'Assets',
  negativeLabel: 'Liabilities',
  percentLabelSuffix: 'of balance sheet'
}

const localSelectedYear = ref(null)
const hoveredColumnYear = ref(null)
const hoveredSegment = ref(null)
const localStrategyKey = ref('')
const activeModeKey = ref('cashflow')
const localDetailPeriodKey = ref('annual')

const strategyOptions = computed(() =>
  props.strategies.filter((strategy) => Array.isArray(strategy?.points) && strategy.points.length)
)

const activeStrategy = computed(() =>
  strategyOptions.value.find((strategy) => strategy.key === currentStrategyKey.value) || strategyOptions.value[0] || null
)

const showModeControls = computed(() => props.variant === 'outcome')

const activeModeMeta = computed(() => {
  if (props.variant === 'wealth') return wealthMeta
  if (props.variant === 'guidance') return guidanceMeta
  return modeMeta[activeModeKey.value] || modeMeta.cashflow
})
const currentDetailPeriodKey = computed(() => props.detailPeriodKey || localDetailPeriodKey.value)
const currentSelectedYear = computed(() => props.selectedYear ?? localSelectedYear.value)
const currentStrategyKey = computed(() => props.selectedStrategyKey || localStrategyKey.value)
const detailPeriodDivisor = computed(() => currentDetailPeriodKey.value === 'weekly' ? 52 : 1)

watch(strategyOptions, (strategies) => {
  if (!strategies.some((strategy) => strategy.key === currentStrategyKey.value)) {
    setCurrentStrategyKey(strategies[0]?.key || '')
  }
}, { immediate: true })

watch(() => props.selectedStrategyKey, (value) => {
  if (value) localStrategyKey.value = value
})

watch(() => props.selectedYear, (value) => {
  if (value !== null) localSelectedYear.value = value
})

watch(() => props.detailPeriodKey, (value) => {
  if (value) localDetailPeriodKey.value = value
})

watch([currentStrategyKey, activeModeKey], () => {
  const points = activeStrategy.value?.points || []
  setCurrentSelectedYear(points.length ? points[points.length - 1].year : null)
  hoveredColumnYear.value = null
  hoveredSegment.value = null
  setCurrentDetailPeriodKey('annual')
}, { immediate: true })

function sumAbs(values) {
  return values.reduce((sum, value) => sum + Math.abs(Number(value) || 0), 0)
}

function buildCashflowSegments(point) {
  const detailed = point?.detailedCashflowBreakdown || {}
  const cashflow = point?.cashflowBreakdown || {}

  return [
    { key: 'salaryIncome', label: 'Salary income', value: Number(detailed.salaryIncome) || 0, color: '#2563eb', directionLabel: 'Income' },
    { key: 'parentalLeavePayment', label: 'Parental leave payment', value: Number(detailed.parentalLeavePayment) || 0, color: '#1d4ed8', directionLabel: 'Income' },
    { key: 'asxDividends', label: 'ASX dividends', value: Number(detailed.asxDividends) || 0, color: '#3b82f6', directionLabel: 'Income' },
    { key: 'qqqDividends', label: 'QQQ distributions', value: Number(detailed.qqqDividends) || 0, color: '#60a5fa', directionLabel: 'Income' },
    { key: 'vgsDividends', label: 'VGS distributions', value: Number(detailed.vgsDividends) || 0, color: '#818cf8', directionLabel: 'Income' },
    { key: 'vgeDividends', label: 'VGE distributions', value: Number(detailed.vgeDividends) || 0, color: '#f472b6', directionLabel: 'Income' },
    { key: 'dbpIncome', label: 'DBP income', value: Number(detailed.dbpIncome) || 0, color: '#d97706', directionLabel: 'Income' },
    { key: 'bondIncome', label: 'Bond income', value: Number(detailed.bondIncome) || 0, color: '#38bdf8', directionLabel: 'Income' },
    { key: 'cashInterest', label: 'Cash interest', value: Number(detailed.cashInterest) || 0, color: '#0ea5e9', directionLabel: 'Income' },
    { key: 'rentReceived', label: 'Rent received', value: Number(detailed.rentReceived) || 0, color: '#14b8a6', directionLabel: 'Income' },
    { key: 'taxes', label: 'Income tax', value: -(Number(detailed.taxes) || 0), color: '#dc2626', directionLabel: 'Outflow' },
    { key: 'helpRepayments', label: 'HELP repayment', value: -(Number(detailed.helpRepayments) || 0), color: '#fb7185', directionLabel: 'Outflow' },
    { key: 'livingCosts', label: 'Living costs', value: -(Number(cashflow.livingCosts) || 0), color: '#a855f7', directionLabel: 'Outflow' },
    { key: 'housingCosts', label: 'Housing and property costs', value: -(Number(cashflow.housingCosts) || 0), color: '#22c55e', directionLabel: 'Outflow' },
    { key: 'upfrontCosts', label: 'Deposit and buying costs', value: -(Number(cashflow.upfrontCosts) || 0), color: '#f59e0b', directionLabel: 'Outflow' },
    { key: 'deficit', label: 'Cash shortfall', value: -(Number(detailed.deficit) || 0), color: '#991b1b', directionLabel: 'Shortfall' }
  ]
}

function buildGuidanceSegments(point) {
  const detailed = point?.detailedCashflowBreakdown || {}
  const cashflow = point?.cashflowBreakdown || {}

  const portfolioCashIncome =
    (Number(detailed.asxDividends) || 0) +
    (Number(detailed.qqqDividends) || 0) +
    (Number(detailed.vgsDividends) || 0) +
    (Number(detailed.vgeDividends) || 0) +
    (Number(detailed.dbpIncome) || 0) +
    (Number(detailed.bondIncome) || 0) +
    (Number(detailed.cashInterest) || 0)
  const parentalLeavePayment = Number(detailed.parentalLeavePayment) || 0
  const rentReceived = Number(detailed.rentReceived) || 0
  const mortgageRepayment =
    (Number(detailed.mortgageInterest) || 0) +
    (Number(detailed.mortgagePrincipal) || 0)
  const propertyRunningCosts =
    (Number(detailed.ownerCosts) || 0) +
    (Number(detailed.propertyManagement) || 0) +
    (Number(detailed.landTax) || 0) +
    (Number(detailed.otherPropertyCosts) || 0)
  const totalTax = Number(detailed.taxes) || 0
  const helpRepayments = Number(detailed.helpRepayments) || 0
  const livingCosts = Number(cashflow.livingCosts) || 0
  const rentOrBoard = (Number(detailed.rentPaid) || 0) + (Number(detailed.boardPaid) || 0)
  const upfrontCosts = Number(cashflow.upfrontCosts) || 0
  const grossSalary = Number(detailed.salaryIncome) || 0
  const grossReceipts = grossSalary + parentalLeavePayment + portfolioCashIncome + rentReceived
  const baseAllocations =
    totalTax +
    helpRepayments +
    livingCosts +
    rentOrBoard +
    mortgageRepayment +
    propertyRunningCosts +
    upfrontCosts
  const useCashSavings = Math.max(0, baseAllocations - grossReceipts)
  const residualAllocation = Math.max(0, grossReceipts + useCashSavings - baseAllocations)
  const rentOrBoardLabel = getGuidanceHousingLabel(point)
  const residualAllocationLabel = getGuidanceResidualLabel(point)

  return [
    { key: 'salaryIncome', label: 'Salary income', value: grossSalary, color: '#2563eb', directionLabel: 'Receipt' },
    { key: 'parentalLeavePayment', label: 'Parental leave payment', value: parentalLeavePayment, color: '#1d4ed8', directionLabel: 'Receipt' },
    { key: 'portfolioCashIncome', label: 'Portfolio income received', value: portfolioCashIncome, color: '#0ea5e9', directionLabel: 'Receipt' },
    { key: 'rentReceived', label: 'Rent received', value: rentReceived, color: '#14b8a6', directionLabel: 'Receipt' },
    { key: 'useCashSavings', label: 'Use cash savings', value: useCashSavings, color: '#6366f1', directionLabel: 'Receipt' },
    { key: 'taxes', label: 'Tax', value: -totalTax, color: '#dc2626', directionLabel: 'Allocation' },
    { key: 'helpRepayments', label: 'HELP repayment', value: -helpRepayments, color: '#fb7185', directionLabel: 'Allocation' },
    { key: 'livingCosts', label: 'Living costs', value: -livingCosts, color: '#a855f7', directionLabel: 'Allocation' },
    { key: 'rentOrBoard', label: rentOrBoardLabel, value: -rentOrBoard, color: '#8b5cf6', directionLabel: 'Allocation' },
    { key: 'mortgageRepayment', label: 'Mortgage repayment', value: -mortgageRepayment, color: '#ef4444', directionLabel: 'Allocation' },
    { key: 'propertyRunningCosts', label: 'Property running costs', value: -propertyRunningCosts, color: '#22c55e', directionLabel: 'Allocation' },
    { key: 'upfrontCosts', label: 'Upfront property costs', value: -upfrontCosts, color: '#f59e0b', directionLabel: 'Allocation' },
    { key: 'residualAllocation', label: residualAllocationLabel, value: -residualAllocation, color: '#1d4ed8', directionLabel: 'Allocation' }
  ]
}

function getGuidanceHousingLabel(point) {
  const detailed = point?.detailedCashflowBreakdown || {}
  const boardPaid = Number(detailed.boardPaid) || 0
  const rentPaid = Number(detailed.rentPaid) || 0

  if (boardPaid > 0) return 'Living at home costs'
  if (rentPaid > 0) return 'Rent'

  const livesAtHomeThisYear =
    Boolean(activeStrategy.value?.guidanceLiveAtHome) &&
    point?.year < (Number(activeStrategy.value?.guidanceLiveAtHomeYears) || 0)

  return livesAtHomeThisYear ? 'Living at home costs' : 'Rent'
}

function getGuidanceResidualLabel(point) {
  const strategy = activeStrategy.value

  if (!strategy || strategy.group === 'stock') return 'Invest'

  const purchaseYear = Number.isFinite(Number(strategy.purchaseYear)) ? Number(strategy.purchaseYear) : null
  const purchasedByThisYear = purchaseYear !== null && (Number(point?.year) || 0) >= purchaseYear

  if (!purchasedByThisYear) {
    return strategy.guidanceInvestWhileSavingForDeposit
      ? 'Invest while saving'
      : 'Save for deposit'
  }

  return strategy.guidanceSurplusAllocationMode === 'mortgagePrepayment'
    ? 'Prepay mortgage'
    : 'Invest'
}

function getPropertyGrowth(point, previousPoint) {
  if (!previousPoint) return 0
  const homeEquityChange = (Number(point?.homeEquity) || 0) - (Number(previousPoint?.homeEquity) || 0)
  const mortgagePrincipal = Number(point?.detailedCashflowBreakdown?.mortgagePrincipal) || 0
  const depositContribution = Number(point?.detailedCashflowBreakdown?.deposit) || 0
  return homeEquityChange - mortgagePrincipal - depositContribution
}

function buildNetWorthChangeSegments(point, previousPoint) {
  const detailed = point?.detailedCashflowBreakdown || {}
  const cashflow = point?.cashflowBreakdown || {}

  const salaryIncome = Number(detailed.salaryIncome) || 0
  const parentalLeavePayment = Number(detailed.parentalLeavePayment) || 0
  const cashYield =
    (Number(detailed.asxDividends) || 0) +
    (Number(detailed.qqqDividends) || 0) +
    (Number(detailed.vgsDividends) || 0) +
    (Number(detailed.vgeDividends) || 0) +
    (Number(detailed.dbpIncome) || 0) +
    (Number(detailed.bondIncome) || 0) +
    (Number(detailed.cashInterest) || 0) +
    (Number(detailed.rentReceived) || 0)
  const portfolioGrowth = Number(detailed.portfolioGrowth) || 0
  const propertyGrowth = getPropertyGrowth(point, previousPoint)
  const debtPaydown = Number(detailed.mortgagePrincipal) || 0
  const taxesAndRequiredPayments =
    (Number(detailed.taxes) || 0) +
    (Number(detailed.helpRepayments) || 0)
  const livingAndHousingSpend =
    (Number(cashflow.livingCosts) || 0) +
    (Number(cashflow.housingCosts) || 0)
  const upfrontCosts = Number(cashflow.upfrontCosts) || 0

  return [
    { key: 'salaryIncome', label: 'Earned income', value: salaryIncome, color: '#2563eb', directionLabel: 'Positive driver' },
    { key: 'parentalLeavePayment', label: 'Parental leave payment', value: parentalLeavePayment, color: '#1d4ed8', directionLabel: 'Positive driver' },
    { key: 'cashYield', label: 'Cash yield from investments and rent', value: cashYield, color: '#0ea5e9', directionLabel: 'Positive driver' },
    { key: 'portfolioGrowth', label: portfolioGrowth >= 0 ? 'Portfolio market growth' : 'Portfolio drawdown', value: portfolioGrowth, color: portfolioGrowth >= 0 ? '#0284c7' : '#f97316', directionLabel: portfolioGrowth >= 0 ? 'Positive driver' : 'Drag' },
    { key: 'propertyGrowth', label: propertyGrowth >= 0 ? 'Property growth' : 'Property decline', value: propertyGrowth, color: propertyGrowth >= 0 ? '#16a34a' : '#dc2626', directionLabel: propertyGrowth >= 0 ? 'Positive driver' : 'Drag' },
    { key: 'debtPaydown', label: 'Mortgage principal paid down', value: debtPaydown, color: '#f59e0b', directionLabel: 'Positive driver' },
    { key: 'taxesAndRequiredPayments', label: 'Tax and required repayments', value: -taxesAndRequiredPayments, color: '#ef4444', directionLabel: 'Drag' },
    { key: 'livingAndHousingSpend', label: 'Living and housing spend', value: -livingAndHousingSpend, color: '#8b5cf6', directionLabel: 'Drag' },
    { key: 'upfrontCosts', label: 'Deposit and buying costs', value: -upfrontCosts, color: '#92400e', directionLabel: 'Drag' }
  ]
}

function buildWealthSegments(point) {
  const liquidAssets = Number(point?.wealthLiquidAssetsRepresentative) || 0
  const mortgageDebt = Number(point?.wealthMortgageDebtRepresentative) || 0
  const helpDebt = Number(point?.wealthHelpDebtRepresentative) || 0
  const propertyValue = Math.max(0, Number(point?.wealthPropertyValueRepresentative) || 0)

  return [
    { key: 'liquidAssets', label: 'Liquid assets and portfolio', value: liquidAssets, color: '#2563eb', directionLabel: 'Asset' },
    { key: 'propertyValue', label: 'Property value', value: propertyValue, color: '#16a34a', directionLabel: 'Asset' },
    { key: 'mortgageDebt', label: 'Mortgage debt', value: -mortgageDebt, color: '#ef4444', directionLabel: 'Liability' },
    { key: 'helpDebt', label: 'HELP/HECS debt', value: -helpDebt, color: '#f97316', directionLabel: 'Liability' }
  ]
}

function getSegmentDefinitions(point, previousPoint) {
  if (props.variant === 'wealth') {
    return buildWealthSegments(point)
  }

  if (props.variant === 'guidance') {
    return buildGuidanceSegments(point)
  }

  if (activeModeKey.value === 'netWorthChange') {
    return buildNetWorthChangeSegments(point, previousPoint)
  }

  return buildCashflowSegments(point)
}

function getSegmentsForPoint(point, previousPoint) {
  const entries = getSegmentDefinitions(point, previousPoint).filter((entry) => Math.abs(entry.value) > 0.5)
  let positiveCursor = 0
  let negativeCursor = 0

  const segments = entries.map((entry) => {
    if (entry.value >= 0) {
      const start = positiveCursor
      positiveCursor += entry.value
      return { ...entry, start, end: positiveCursor }
    }
    const start = negativeCursor
    negativeCursor += entry.value
    return { ...entry, start, end: negativeCursor }
  })

  const tooltipSegments = segments.map((segment) => ({
    ...segment,
    amount: Math.abs(segment.value),
    percentLabel: `${(
      (
        Math.abs(segment.value) /
        Math.max(1, segment.value >= 0 ? positiveCursor : Math.abs(negativeCursor))
      ) * 100
    ).toFixed(1)}% ${activeModeMeta.value.percentLabelSuffix}`
  }))

  return {
    segments,
    tooltipSegments,
    positiveTotal: positiveCursor,
    negativeTotal: Math.abs(negativeCursor)
  }
}

const activeYearRows = computed(() =>
  (activeStrategy.value?.points || [])
    .map((point, index, points) => ({
      year: point.year,
      ...getSegmentsForPoint(point, index > 0 ? points[index - 1] : null)
    }))
    .filter((row) => row.year > 0)
)

const selectedRow = computed(() =>
  activeYearRows.value.find((row) => row.year === currentSelectedYear.value) || null
)

const selectedPositiveSegments = computed(() =>
  [...(selectedRow.value?.tooltipSegments || [])]
    .filter((segment) => segment.value > 0)
    .sort((left, right) => right.amount - left.amount)
)

const selectedNegativeSegments = computed(() =>
  [...(selectedRow.value?.tooltipSegments || [])]
    .filter((segment) => segment.value < 0)
    .sort((left, right) => right.amount - left.amount)
)

const yearDomain = computed(() => {
  const maxYear = activeYearRows.value.length ? Math.max(...activeYearRows.value.map((row) => row.year)) : 0
  return { min: 0, max: maxYear }
})

const valueDomain = computed(() => {
  const positiveMax = Math.max(1, ...activeYearRows.value.map((row) => row.positiveTotal))
  const negativeMax = Math.max(1, ...activeYearRows.value.map((row) => row.negativeTotal))
  const extent = Math.max(positiveMax, negativeMax)
  return { min: -extent, max: extent }
})

const yTicks = computed(() =>
  Array.from({ length: 5 }, (_, index) => {
    const ratio = 1 - (index / 4)
    const value = valueDomain.value.min + ((valueDomain.value.max - valueDomain.value.min) * ratio)
    return { value, label: formatShortCurrency(Math.abs(value)) }
  })
)

const barWidth = computed(() => {
  const count = Math.max(1, activeYearRows.value.length)
  return Math.max(16, Math.min(54, (plotWidth / count) * 0.68))
})

function xPos(year) {
  const { min, max } = yearDomain.value
  const span = Math.max(1, max - min)
  return padding.left + ((year - min) / span) * plotWidth
}

function yPos(value) {
  const { min, max } = valueDomain.value
  const span = Math.max(1, max - min)
  return viewHeight - padding.bottom - ((value - min) / span) * plotHeight
}

function detailYPos(value, row) {
  const extent = Math.max(1, row?.positiveTotal || 0, row?.negativeTotal || 0)
  return detailViewHeight - detailPadding.bottom - ((value + extent) / (extent * 2)) * detailPlotHeight
}

function isSegmentHovered(year, key) {
  return hoveredSegment.value?.year === year && hoveredSegment.value?.key === key
}

function isColumnHovered(year) {
  return hoveredColumnYear.value === year
}

function isColumnSelected(year) {
  return currentSelectedYear.value === year
}

function formatScaledCurrency(amount) {
  return formatShortCurrency((Number(amount) || 0) / detailPeriodDivisor.value)
}

function formatSegmentPercent(percentLabel) {
  return String(percentLabel || '').replace(activeModeMeta.value.percentLabelSuffix, '').trim()
}

function onSelectYear(year) {
  setCurrentSelectedYear(year)
}

function onColumnHover(year) {
  hoveredColumnYear.value = year
}

function onDetailHover(year, segment) {
  hoveredSegment.value = {
    ...segment,
    year
  }
}

function onSegmentLeave() {
  hoveredSegment.value = null
}

function onChartLeave() {
  hoveredColumnYear.value = null
  hoveredSegment.value = null
}

function setCurrentDetailPeriodKey(value) {
  localDetailPeriodKey.value = value
  emit('update:detailPeriodKey', value)
}

function setCurrentSelectedYear(value) {
  localSelectedYear.value = value
  emit('update:selectedYear', value)
}

function setCurrentStrategyKey(value) {
  localStrategyKey.value = value
  emit('update:selectedStrategyKey', value)
}
</script>

<style scoped>
.wealth-flow {
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
  background: linear-gradient(180deg, rgba(248, 251, 255, 0.96), rgba(241, 247, 255, 0.94));
  border-color: rgba(154, 174, 204, 0.22);
  color: #11233e;
}

.wealth-flow--embedded + .wealth-flow--embedded {
  padding-top: 1rem;
  border-top: 1px solid rgba(154, 174, 204, 0.18);
}

.wealth-flow__header h3,
.wealth-flow__side-header h4,
.wealth-flow__side-empty h4 {
  margin: 0.15rem 0 0.35rem;
}

.wealth-flow__kicker {
  margin: 0;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  font-size: 0.74rem;
  color: #5a7497;
}

.wealth-flow__subtitle,
.wealth-flow__side-copy,
.wealth-flow__empty {
  margin: 0;
  color: #5d7394;
  font-size: 0.9rem;
}

.wealth-flow__side-summary {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
}

.wealth-flow__side-copy--left {
  text-align: left;
}

.wealth-flow__side-copy--right {
  text-align: right;
}

.wealth-flow__controls {
  display: flex;
  flex-wrap: wrap;
  gap: 0.65rem;
}

.wealth-flow__controls--tight {
  justify-content: flex-end;
  gap: 0.45rem;
}

.wealth-flow__chip {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.6rem 0.85rem;
  border-radius: 999px;
  border: 1px solid rgba(154, 174, 204, 0.22);
  background: rgba(248, 251, 255, 0.96);
  color: #385879;
  font: inherit;
  cursor: pointer;
}

.wealth-flow__chip--small {
  padding: 0.45rem 0.72rem;
}

.wealth-flow__chip.is-active {
  border-color: rgba(37, 99, 235, 0.34);
  background: rgba(219, 234, 254, 0.9);
  color: #173050;
}

.wealth-flow__chip-dot {
  width: 10px;
  height: 10px;
  border-radius: 999px;
  flex: 0 0 auto;
}

.wealth-flow__layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 360px;
  gap: 1rem;
  align-items: start;
}

.wealth-flow__body {
  position: relative;
  height: 520px;
  min-height: 520px;
}

.wealth-flow__svg {
  width: 100%;
  height: 100%;
  display: block;
  overflow: visible;
  cursor: pointer;
}

.wealth-flow__plot-bg {
  fill: rgba(255, 255, 255, 0.74);
  stroke: rgba(154, 174, 204, 0.2);
  stroke-width: 1;
}

.wealth-flow__grid {
  stroke: rgba(160, 180, 210, 0.22);
  stroke-width: 1;
}

.wealth-flow__grid--vertical {
  stroke-dasharray: 4 6;
}

.wealth-flow__axis {
  fill: #60779a;
  font-size: 12px;
}

.wealth-flow__axis--y {
  text-anchor: end;
}

.wealth-flow__axis--x {
  cursor: pointer;
}

.wealth-flow__axis--x.is-selected {
  fill: #173050;
  font-weight: 700;
}

.wealth-flow__zero {
  stroke: rgba(15, 40, 72, 0.5);
  stroke-width: 1.5;
}

.wealth-flow__segment {
  opacity: 0.9;
  transform-origin: center;
  transition: opacity 160ms ease, filter 160ms ease, transform 160ms ease;
}

.wealth-flow__segment.is-column-hovered {
  opacity: 0.98;
  filter: brightness(1.04) saturate(1.04);
}

.wealth-flow__segment.is-column-selected {
  opacity: 1;
  filter: brightness(1.08) saturate(1.08);
}

.wealth-flow__segment.is-active {
  opacity: 1;
  filter: brightness(1.08) saturate(1.08);
}

.wealth-flow__hover-line {
  stroke: rgba(34, 65, 102, 0.4);
  stroke-width: 1.4;
  stroke-dasharray: 5 5;
}

.wealth-flow__column-hit {
  fill: transparent;
  cursor: pointer;
}

.wealth-flow__column-accent {
  fill: transparent;
  stroke: transparent;
  transition: fill 160ms ease, stroke 160ms ease, opacity 160ms ease;
  pointer-events: none;
}

.wealth-flow__column-accent.is-hovered {
  fill: rgba(37, 99, 235, 0.08);
  stroke: rgba(37, 99, 235, 0.18);
}

.wealth-flow__column-accent.is-selected {
  fill: rgba(37, 99, 235, 0.14);
  stroke: rgba(37, 99, 235, 0.32);
}

.wealth-flow__side {
  display: grid;
  align-content: start;
  gap: 0.9rem;
  padding: 1rem;
  border: 1px solid rgba(154, 174, 204, 0.28);
  background: rgba(247, 250, 255, 0.94);
}

.wealth-flow__side-topline {
  display: flex;
  justify-content: space-between;
  gap: 0.8rem;
  align-items: start;
}

.wealth-flow__detail-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 92px minmax(0, 1fr);
  gap: 0.85rem;
  align-items: start;
}

.wealth-flow__detail-column {
  display: grid;
  gap: 0.3rem;
}

.wealth-flow__detail-list {
  display: grid;
  gap: 0;
}

.wealth-flow__detail-bar-shell {
  display: flex;
  justify-content: center;
  align-items: stretch;
}

.wealth-flow__detail-bar {
  width: 96px;
  min-height: 430px;
  height: 430px;
  display: block;
  overflow: visible;
}

.wealth-flow__side-row {
  display: grid;
  gap: 0.08rem;
  padding: 0.42rem 0;
  border-radius: 0;
  background: transparent;
  border: 0;
  border-bottom: 1px solid rgba(154, 174, 204, 0.18);
  min-height: 0;
}

.wealth-flow__side-row.is-active {
  border-bottom-color: rgba(37, 99, 235, 0.4);
  background: rgba(219, 234, 254, 0.42);
}

.wealth-flow__side-top,
.wealth-flow__side-meta {
  display: flex;
  justify-content: flex-start;
  gap: 0.45rem;
  flex-wrap: nowrap;
}

.wealth-flow__tooltip-label {
  display: inline-flex;
  align-items: center;
  gap: 0;
  font-size: 0.84rem;
  line-height: 1.2;
}

.wealth-flow__side-meta {
  color: #526b8d;
  font-size: 0.75rem;
}

.wealth-flow__side-meta--table {
  align-items: baseline;
}

.wealth-flow__side-meta--table strong {
  font-size: 0.77rem;
  font-weight: 600;
}

.wealth-flow__detail-segment {
  cursor: pointer;
  filter: drop-shadow(0 0 0 rgba(17, 35, 62, 0));
}

.wealth-flow__detail-segment.is-active {
  transform: scaleX(1.16) scaleY(1.04) translateX(-4px);
  filter: brightness(1.1) saturate(1.12) drop-shadow(0 6px 12px rgba(17, 35, 62, 0.22));
}

.wealth-flow__detail-segment.is-active[data-direction='negative'] {
  transform: scaleX(1.16) scaleY(1.04) translateX(4px);
}

.wealth-flow__side-empty {
  display: grid;
  gap: 0.45rem;
}

@media (max-width: 960px) {
  .wealth-flow__layout {
    grid-template-columns: 1fr;
  }

  .wealth-flow__detail-layout {
    grid-template-columns: minmax(0, 1fr) 82px minmax(0, 1fr);
  }

  .wealth-flow__detail-bar {
    min-height: 320px;
    height: 320px;
    width: 86px;
  }
}

@media (max-width: 720px) {
  .wealth-flow__body {
    height: 400px;
    min-height: 400px;
  }

  .wealth-flow__svg {
    overflow: hidden;
  }

  .wealth-flow__side-topline,
  .wealth-flow__detail-layout {
    display: grid;
    grid-template-columns: 1fr;
  }

  .wealth-flow__controls--tight {
    justify-content: start;
  }

  .wealth-flow__detail-bar {
    min-height: 220px;
    height: 220px;
    width: 78px;
  }
}
</style>
