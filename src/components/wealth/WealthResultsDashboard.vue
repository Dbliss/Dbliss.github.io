<template>
  <section class="wealth-results">
    <div class="wealth-results__toolbar">
      <div class="wealth-results__meta">
        <p class="wealth-results__kicker">Results</p>
        <h2>Interactive outcome dashboard</h2>
        <p v-if="lastRunAt" class="wealth-results__copy">Last calculated {{ lastRunAt }}</p>
      </div>
    </div>

    <section class="wealth-results__kpis">
      <article class="wealth-results__kpi card">
        <p class="wealth-results__kpi-kicker">Best median</p>
        <h3>{{ visibleKpis.bestMedian?.label || (noVisibleStrategies ? 'No visible strategy' : 'No result') }}</h3>
        <p>{{ visibleKpis.bestMedian ? `${visibleKpis.bestMedian.summary.finalMedianDisplay} median sell-down result.` : noVisibleStrategies ? 'Use the strategy visibility chips above to show at least one strategy.' : 'Run the model to populate this card.' }}</p>
      </article>
      <article class="wealth-results__kpi card">
        <p class="wealth-results__kpi-kicker">Strongest downside</p>
        <h3>{{ visibleKpis.downsideLeader?.label || (noVisibleStrategies ? 'No visible strategy' : 'No result') }}</h3>
        <p>{{ visibleKpis.downsideLeader ? `${formatCurrency(visibleKpis.downsideLeader.summary.downsideRisk)} at the 25th percentile.` : noVisibleStrategies ? 'Use the strategy visibility chips above to show at least one strategy.' : 'Run the model to populate this card.' }}</p>
      </article>
      <article class="wealth-results__kpi card">
        <p class="wealth-results__kpi-kicker">Widest variability</p>
        <h3>{{ visibleKpis.variabilityLeader?.label || (noVisibleStrategies ? 'No visible strategy' : 'No result') }}</h3>
        <p>{{ visibleKpis.variabilityLeader ? `${formatCurrency(visibleKpis.variabilityLeader.variabilitySpread)} spread between P25 and P75 at the horizon.` : noVisibleStrategies ? 'Use the strategy visibility chips above to show at least one strategy.' : 'Run the model to populate this card.' }}</p>
      </article>
    </section>

    <div class="wealth-results__visibility card">
      <p class="wealth-results__kpi-kicker">Strategy visibility</p>
      <button
        v-for="strategy in filteredStrategies"
        :key="strategy.key"
        type="button"
        class="wealth-results__chip"
        :class="{ 'is-muted': mutedStrategyKeys.includes(strategy.key) }"
        @click="$emit('toggle-series', strategy.key)"
      >
        <span class="wealth-results__chip-dot" :style="{ background: strategy.color }"></span>
        {{ strategy.label }}
      </button>
    </div>

    <div class="wealth-results__chart-block">
      <WealthLineChart
        class="wealth-results__chart"
        :title="metricMeta.title"
        :subtitle="metricMeta.subtitle"
        kicker="Scenario comparison"
        :series="series"
        :muted-series-ids="mutedStrategyKeys"
      >
        <template #actions>
          <label class="wealth-results__select" aria-label="Select result metric">
            <select :value="metric" @change="$emit('update:metric', $event.target.value)">
              <option v-for="option in metricOptions" :key="option.key" :value="option.key">{{ option.label }}</option>
            </select>
          </label>
        </template>
      </WealthLineChart>

      <section v-if="visibleStrategies.length" class="wealth-results__flow-stack card">
        <div class="wealth-results__flow-controls">
          <button
            v-for="strategy in visibleStrategies"
            :key="strategy.key"
            type="button"
            class="wealth-results__chip"
            :class="{ 'is-active': strategy.key === sharedFlowStrategyKey }"
            @click="sharedFlowStrategyKey = strategy.key"
          >
            <span class="wealth-results__chip-dot" :style="{ background: strategy.color }"></span>
            {{ strategy.shortLabel || strategy.label }}
          </button>
        </div>

        <WealthIncomeAllocationChart
          embedded
          :show-strategy-controls="false"
          :strategies="visibleStrategies"
          :selected-strategy-key="sharedFlowStrategyKey"
          :selected-year="sharedFlowYear"
          :detail-period-key="sharedFlowPeriodKey"
          @update:selected-strategy-key="sharedFlowStrategyKey = $event"
          @update:selected-year="sharedFlowYear = $event"
          @update:detail-period-key="sharedFlowPeriodKey = $event"
        />

        <WealthIncomeAllocationChart
          embedded
          variant="guidance"
          :show-strategy-controls="false"
          :strategies="visibleStrategies"
          :selected-strategy-key="sharedFlowStrategyKey"
          :selected-year="sharedFlowYear"
          :detail-period-key="sharedFlowPeriodKey"
          @update:selected-strategy-key="sharedFlowStrategyKey = $event"
          @update:selected-year="sharedFlowYear = $event"
          @update:detail-period-key="sharedFlowPeriodKey = $event"
        />
      </section>
    </div>

    <div class="wealth-results__detail-grid">
      <section class="wealth-results__readout card">
        <p class="wealth-results__kpi-kicker">Scenario readout</p>
        <div class="wealth-results__list">
          <article v-for="strategy in visibleStrategies" :key="strategy.key" class="wealth-results__item">
            <div class="wealth-results__item-top">
              <div class="wealth-results__item-title">
                <span class="wealth-results__chip-dot" :style="{ background: strategy.color }"></span>
                <strong>{{ strategy.label }}</strong>
              </div>
              <span>{{ strategy.summary.finalMedianDisplay }}</span>
            </div>
            <div class="wealth-results__item-meta">
              <span>Downside {{ formatCurrency(strategy.summary.downsideRisk) }}</span>
              <span v-if="strategy.group === 'housing'">Vs baseline {{ formatSignedCurrency(strategy.deltaVsBaseline) }}</span>
              <span>Variability {{ formatCurrency(strategy.variabilitySpread) }}</span>
              <span v-if="strategy.purchaseYear !== null">Purchase year {{ strategy.purchaseYear }}</span>
            </div>
          </article>
          <p v-if="!visibleStrategies.length && filteredStrategies.length" class="wealth-results__copy">Use the strategy visibility chips above to show scenarios here.</p>
        </div>
      </section>

      <WealthCompositionBars
        v-if="visibleCompositionRows.length"
        title="Housing balance composition"
        subtitle="Final-year median liquid assets, home equity, and debt across the visible housing pathways."
        :rows="visibleCompositionRows"
      />
    </div>

    <section v-if="visibleAffordabilityCharts.length" class="wealth-results__hurdles card">
      <div class="wealth-results__hurdles-head">
        <p class="wealth-results__kpi-kicker">Purchase hurdles</p>
        <p class="wealth-results__copy">Deposit, borrowing, and savings hurdles across each property pathway.</p>
      </div>
      <div class="wealth-results__hurdles-grid">
        <WealthAffordabilityHurdleChart
          v-for="chart in visibleAffordabilityCharts"
          :key="chart.key"
          :title="chart.title"
          :configured-deposit-pct="chart.configuredDepositPct"
          :purchase-year="chart.purchaseYear"
          :purchase-point="chart.purchasePoint"
          :points="chart.points"
        />
      </div>
    </section>

  </section>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import WealthLineChart from './WealthLineChart.vue'
import WealthAffordabilityHurdleChart from './WealthAffordabilityHurdleChart.vue'
import WealthCompositionBars from './WealthCompositionBars.vue'
import WealthIncomeAllocationChart from './WealthIncomeAllocationChart.vue'
import { buildDashboardSeries } from '../../wealth/dashboard.js'

const props = defineProps({
  dashboard: { type: Object, required: true },
  groupFilter: { type: String, default: 'all' },
  metric: { type: String, default: 'sellDown' },
  mutedStrategyKeys: { type: Array, default: () => [] },
  inflationRate: { type: Number, default: 0.03 },
  lastRunAt: { type: String, default: '' },
  resultsStale: { type: Boolean, default: false },
  loading: { type: Boolean, default: false }
})

defineEmits(['update:groupFilter', 'update:metric', 'toggle-series'])

const metricOptions = [
  { key: 'sellDown', label: 'Liquidity Available' },
  { key: 'inflationAdjusted', label: "Today's dollars" },
  { key: 'annualSurplus', label: 'Annual surplus' },
  { key: 'holdBalance', label: 'Hold balance' }
]

const filteredStrategies = computed(() => props.dashboard.strategies)

const visibleStrategies = computed(() =>
  filteredStrategies.value.filter(strategy => !props.mutedStrategyKeys.includes(strategy.key))
)

const sharedFlowStrategyKey = ref('')
const sharedFlowYear = ref(null)
const sharedFlowPeriodKey = ref('annual')

watch(visibleStrategies, (strategies) => {
  if (!strategies.some((strategy) => strategy.key === sharedFlowStrategyKey.value)) {
    sharedFlowStrategyKey.value = strategies[0]?.key || ''
  }
  if (!strategies.length) {
    sharedFlowYear.value = null
    sharedFlowPeriodKey.value = 'annual'
  }
}, { immediate: true })

const noVisibleStrategies = computed(() =>
  !visibleStrategies.value.length && filteredStrategies.value.length > 0
)

const metricMeta = computed(() => {
  if (props.metric === 'inflationAdjusted') {
    return {
      title: "Liquidity Available in today's dollars",
      subtitle: 'Median, downside, and upside outcomes discounted back using the rent-growth assumption as the inflation proxy.'
    }
  }
  if (props.metric === 'annualSurplus') {
    return {
      title: 'Annual after-tax surplus or deficit',
      subtitle: 'Positive values indicate cash left after tax, living costs, rent, property cashflows, and compulsory HECS/HELP repayments.'
    }
  }
  if (props.metric === 'holdBalance') {
    return {
      title: 'Hold-only balance projection',
      subtitle: 'Net worth before sale tax, keeping the assets in place at each year.'
    }
  }
  return {
    title: 'After-tax liquidity available bands',
    subtitle: 'Each year assumes the remaining assets were sold in that year and estimated CGT was netted out where applicable.'
  }
})

const series = computed(() =>
  buildDashboardSeries(filteredStrategies.value, props.metric, props.inflationRate)
)

const visibleKpis = computed(() => {
  const strategies = visibleStrategies.value
  const housingStrategies = strategies.filter(strategy => strategy.group === 'housing')

  return {
    bestMedian: strategies.reduce((best, strategy) =>
      !best || strategy.summary.finalMedianNetWorth > best.summary.finalMedianNetWorth ? strategy : best
    , null),
    downsideLeader: strategies.reduce((best, strategy) =>
      !best || strategy.summary.downsideRisk > best.summary.downsideRisk ? strategy : best
    , null),
    variabilityLeader: strategies.reduce((best, strategy) =>
      !best || strategy.variabilitySpread > best.variabilitySpread ? strategy : best
    , null),
    firstHousingBeatBaseline: housingStrategies
      .filter(strategy => strategy.breakevenYearVsBaseline !== null)
      .sort((left, right) => left.breakevenYearVsBaseline - right.breakevenYearVsBaseline)[0] || null
  }
})

const visibleCompositionRows = computed(() => {
  const visibleKeys = new Set(visibleStrategies.value.map(strategy => strategy.key))
  return props.dashboard.compositionRows.filter(row => visibleKeys.has(row.key))
})

const visibleAffordabilityCharts = computed(() => {
  const visibleKeys = new Set(visibleStrategies.value.map(strategy => strategy.key))
  return (props.dashboard.affordabilityCharts || []).filter(chart => visibleKeys.has(chart.key))
})

function formatCurrency(value) {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    maximumFractionDigits: 0
  }).format(Number(value) || 0)
}

function formatSignedCurrency(value) {
  const safeValue = Number(value) || 0
  const formatted = formatCurrency(Math.abs(safeValue))
  if (safeValue === 0) return formatted
  return safeValue > 0 ? `+${formatted}` : `-${formatted}`
}
</script>

<style scoped>
.wealth-results {
  display: grid;
  gap: 1rem;
  min-width: 0;
}

.wealth-results__toolbar,
.wealth-results__visibility,
.wealth-results__item-top,
.wealth-results__item-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.wealth-results__toolbar {
  justify-content: space-between;
  align-items: end;
}

.wealth-results__meta h2 {
  margin: 0.15rem 0 0;
  font-size: clamp(1.5rem, 1.2rem + 0.95vw, 2.2rem);
}

.wealth-results__kicker,
.wealth-results__kpi-kicker {
  margin: 0;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  font-size: 0.74rem;
  color: #5d7ba3;
}

.wealth-results__copy {
  margin: 0.35rem 0 0;
  color: #5d7394;
}

.wealth-results__select {
  display: grid;
  gap: 0.35rem;
  color: #5b7192;
  font-size: 0.82rem;
}

.wealth-results__select select {
  min-width: 12rem;
  min-height: 3rem;
  padding: 0.75rem 0.85rem;
  border-radius: 16px;
  border: 1px solid rgba(154, 174, 204, 0.22);
  background: rgba(255, 255, 255, 0.96);
  color: #173050;
  font: inherit;
}

.wealth-results__chip {
  padding: 0.6rem 0.85rem;
  border-radius: 999px;
  border: 1px solid rgba(154, 174, 204, 0.22);
  background: rgba(248, 251, 255, 0.96);
  color: #385879;
  font: inherit;
  cursor: pointer;
}

.wealth-results__visibility {
  padding: 1rem;
  align-items: center;
}

.wealth-results__visibility .wealth-results__kpi-kicker {
  margin-right: 0.35rem;
}

.wealth-results__kpis {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.85rem;
}

.wealth-results__kpi {
  padding: 1rem;
}

.wealth-results__kpi h3 {
  margin: 0.25rem 0 0.35rem;
  font-size: 1.05rem;
}

.wealth-results__kpi p:last-child {
  margin: 0;
  color: #5d7394;
}

.wealth-results__chip {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  transition: opacity 140ms ease, transform 140ms ease, border-color 140ms ease, background 140ms ease;
}

.wealth-results__chip:hover {
  transform: translateY(-1px);
}

.wealth-results__chip.is-muted {
  opacity: 0.45;
}

.wealth-results__chip.is-active {
  border-color: rgba(37, 99, 235, 0.34);
  background: rgba(219, 234, 254, 0.9);
  color: #173050;
}

.wealth-results__chip-dot {
  width: 0.72rem;
  height: 0.72rem;
  border-radius: 999px;
  flex: 0 0 auto;
}

.wealth-results__chart-block {
  display: grid;
  gap: 1.2rem;
  min-width: 0;
}

.wealth-results__chart {
  width: 90%;
  margin: 0 auto;
  min-width: 0;
}

.wealth-results__flow-stack {
  display: grid;
  gap: 1.2rem;
  padding: 1rem;
  min-width: 0;
}

.wealth-results__flow-controls {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.wealth-results__readout {
  padding: 1rem;
}

.wealth-results__detail-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
  align-items: start;
  min-width: 0;
}

.wealth-results__hurdles {
  display: grid;
  gap: 1rem;
  padding: 1rem;
}

.wealth-results__hurdles-head {
  display: grid;
  gap: 0.2rem;
}

.wealth-results__hurdles-head .wealth-results__copy {
  margin: 0;
}

.wealth-results__hurdles-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;
}

.wealth-results__list {
  display: grid;
  gap: 0.8rem;
  margin-top: 0.8rem;
}

.wealth-results__item {
  padding: 0.9rem;
  border-radius: 18px;
  background: rgba(243, 247, 255, 0.92);
  border: 1px solid rgba(154, 174, 204, 0.16);
}

.wealth-results__item-title {
  display: inline-flex;
  gap: 0.45rem;
  align-items: center;
}

.wealth-results__item p {
  margin: 0.5rem 0;
  color: #5d7394;
}

.wealth-results__item-meta {
  color: #5d7394;
  font-size: 0.82rem;
}

@media (max-width: 1080px) {
  .wealth-results__kpis,
  .wealth-results__chart-block,
  .wealth-results__detail-grid,
  .wealth-results__hurdles-grid {
    grid-template-columns: 1fr;
  }

  .wealth-results__chart {
    width: 100%;
  }
}

@media (max-width: 720px) {
  .wealth-results {
    gap: 0.85rem;
  }

  .wealth-results__toolbar {
    align-items: stretch;
  }

  .wealth-results__select,
  .wealth-results__select select {
    width: 100%;
  }

  .wealth-results__flow-stack,
  .wealth-results__readout,
  .wealth-results__hurdles {
    padding: 0.9rem;
  }

  .wealth-results__visibility {
    gap: 0.5rem;
    padding: 0.85rem;
  }

  .wealth-results__chip {
    gap: 0.35rem;
    padding: 0.48rem 0.68rem;
    font-size: 0.74rem;
    line-height: 1.15;
  }

  .wealth-results__chip-dot {
    width: 0.58rem;
    height: 0.58rem;
  }

  .wealth-results__kpi,
  .wealth-results__item {
    padding: 0.85rem;
  }

  .wealth-results__item-top {
    flex-direction: column;
    align-items: flex-start;
  }

  .wealth-results__item-title {
    min-width: 0;
  }
}
</style>
