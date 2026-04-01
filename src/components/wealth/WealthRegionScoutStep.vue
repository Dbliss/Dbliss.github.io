<template>
  <section class="wealth-scout card">
    <Transition :name="transitionName" mode="out-in">
      <section :key="activeStep.key" class="wealth-scout__panel">
        <template v-if="activeStep.key === 'intro'">
          <div class="wealth-scout__hero">
            <p class="wealth-scout__kicker">Region scout</p>
            <h2>Find the next area worth targeting</h2>
            <p class="wealth-scout__copy">
              Answer a few questions, move back when you need to, and the scout will translate your savings path into suburbs or regions worth watching.
            </p>
          </div>
        </template>

        <template v-else-if="activeStep.key === 'timing'">
          <div class="wealth-scout__question-head">
            <p class="wealth-scout__question-index">{{ questionProgressLabel }}</p>
            <h3>When do you want to buy?</h3>
            <p>Pick a timeframe, or tell the scout to keep looking until something becomes realistically affordable.</p>
          </div>

          <div class="wealth-scout__selection-stage">
            <div class="wealth-scout__choice-grid wealth-scout__choice-grid--two">
              <button type="button" class="wealth-scout__choice" :class="{ 'is-active': draftConfig.buyFlexibility === 'target' }" @click="setTargetBuyMode()">
                <strong>I'll choose when to buy</strong>
                <span>Set a target purchase window yourself.</span>
              </button>
              <button type="button" class="wealth-scout__choice" :class="{ 'is-active': draftConfig.buyFlexibility === 'whenever' }" @click="setWheneverMode()">
                <strong>Buy whenever I can afford to</strong>
                <span>Let the scout surface the earliest realistic entry point.</span>
              </button>
            </div>

            <div class="wealth-scout__selection-detail">
              <div v-if="draftConfig.buyFlexibility === 'target'" class="wealth-scout__slider-card">
                <div class="wealth-scout__slider-head">
                  <span>Target timing</span>
                  <strong>{{ sliderTimingLabel }}</strong>
                </div>
                <input
                  v-model.number="draftConfig.targetYears"
                  class="wealth-scout__slider"
                  type="range"
                  min="0"
                  max="20"
                  step="1"
                  @input="draftConfig.buyFlexibility = 'target'"
                />
                <div class="wealth-scout__slider-scale">
                  <span>Now</span>
                  <span>10 years</span>
                  <span>20 years</span>
                </div>
              </div>
            </div>
          </div>
        </template>

        <template v-else-if="activeStep.key === 'savings'">
          <div class="wealth-scout__question-head">
            <p class="wealth-scout__question-index">{{ questionProgressLabel }}</p>
            <h3>Are you comfortable investing while you save for a house?</h3>
            <p>If yes, use the same portfolio sleeves as the main workbook. If no, the scout assumes high-interest cash.</p>
          </div>

          <div class="wealth-scout__selection-stage">
            <div class="wealth-scout__choice-grid wealth-scout__choice-grid--two">
              <button type="button" class="wealth-scout__choice" :class="{ 'is-active': draftConfig.savingsMode === 'defaultPortfolio' }" @click="selectSavingsMode('defaultPortfolio')">
                <strong>Yes, invest while saving</strong>
                <span>Use the portfolio mix below to grow the deposit.</span>
              </button>
              <button type="button" class="wealth-scout__choice" :class="{ 'is-active': draftConfig.savingsMode === 'cash' }" @click="selectSavingsMode('cash')">
                <strong>No, keep it in cash</strong>
                <span>Assume savings stay in a high-interest cash path.</span>
              </button>
            </div>

            <div class="wealth-scout__selection-detail">
              <div v-if="draftConfig.savingsMode === 'defaultPortfolio'" class="wealth-scout__portfolio">
                <label v-for="allocation in portfolioAllocationFields" :key="allocation.key" class="wealth-scout__allocation">
                  <span class="wealth-scout__allocation-top">
                    <span class="wealth-scout__allocation-title">
                      <i class="wealth-scout__swatch" :style="{ background: allocation.color }"></i>
                      {{ allocation.label }}
                    </span>
                    <strong>{{ getAllocationPct(allocation.key) }}%</strong>
                  </span>
                  <div class="wealth-scout__allocation-controls">
                    <input :value="getAllocationPct(allocation.key)" type="range" min="0" max="100" step="1" @input="handleAllocationInput(allocation.key, $event)" />
                    <input :value="getAllocationPct(allocation.key)" type="number" min="0" max="100" step="1" @input="handleAllocationInput(allocation.key, $event)" />
                  </div>
                </label>
              </div>
            </div>
          </div>
        </template>

        <template v-else-if="activeStep.key === 'power'">
          <div class="wealth-scout__question-head">
            <p class="wealth-scout__question-index">{{ questionProgressLabel }}</p>
            <h3>Your purchasing power and deposit runway</h3>
            <p>The chart tracks what you can buy over time and how much deposit cash you should have available from savings or sell-off value.</p>
          </div>

          <div class="wealth-scout__choice-grid wealth-scout__choice-grid--two">
            <button type="button" class="wealth-scout__choice" :class="{ 'is-active': draftConfig.depositMode === 'optimal' }" @click="draftConfig.depositMode = 'optimal'">
              <strong>Use the strongest deposit automatically</strong>
              <span>The scout scales deposit size up as savings grow.</span>
            </button>
            <button type="button" class="wealth-scout__choice" :class="{ 'is-active': draftConfig.depositMode === 'fixed' }" @click="draftConfig.depositMode = 'fixed'">
              <strong>Set my own deposit %</strong>
              <span>Keep the deposit ratio fixed across the scouting window.</span>
            </button>
          </div>

          <div v-if="draftConfig.depositMode === 'fixed'" class="wealth-scout__slider-card wealth-scout__slider-card--compact">
            <div class="wealth-scout__slider-head">
              <span>Fixed deposit size</span>
              <strong>{{ Math.round(draftConfig.fixedDepositPct * 100) }}%</strong>
            </div>
            <input v-model.number="fixedDepositPctUi" class="wealth-scout__slider" type="range" min="5" max="40" step="1" />
          </div>

          <div class="wealth-scout__summary-grid">
            <article class="wealth-scout__summary-card">
              <span>{{ draftConfig.buyFlexibility === 'target' ? `Purchasing power ${buyTimingLabel.toLowerCase()}` : 'Current purchasing power' }}</span>
              <strong>{{ formatCurrency(model.budget.affordablePrice) }}</strong>
              <small>Based on income, savings, HELP debt, and the deposit strategy above</small>
            </article>
            <article class="wealth-scout__summary-card">
              <span>Projected sell-off savings</span>
              <strong>{{ formatCurrency(model.futureSnapshot.liquidSavings) }}</strong>
              <small>{{ savingsPathLabel }}</small>
            </article>
            <article class="wealth-scout__summary-card">
              <span>Deposit cash needed</span>
              <strong>{{ formatCurrency(model.budget.requiredCash) }}</strong>
              <small>{{ depositModeLabel }}</small>
            </article>
            <article class="wealth-scout__summary-card">
              <span>Projected household income</span>
              <strong>{{ formatCurrency(model.futureSnapshot.annualIncome) }}</strong>
              <small>{{ draftConfig.buyFlexibility === 'target' ? buyTimingLabel : 'Current year snapshot' }}</small>
            </article>
          </div>

          <div class="wealth-scout__charts">
            <WealthLineChart title="Purchasing power over time" subtitle="The max property value your savings and serviceability support." kicker="0-20 year path" :series="purchasingPowerChartSeries" :markers="buyYearMarker" />
            <WealthLineChart title="Required deposit vs your sell-off savings" subtitle="Deposit cash includes purchase costs. Savings reflect the cash or portfolio sell-off path." kicker="Deposit runway" :series="depositChartSeries" :markers="buyYearMarker" />
          </div>

          <div class="wealth-scout__custom-range">
            <button type="button" class="wealth-scout__toggle-row" :class="{ 'is-active': draftConfig.hasCustomPriceRange }" @click="draftConfig.hasCustomPriceRange = !draftConfig.hasCustomPriceRange">
              <span>
                <strong>Do you want to set your own price range for results?</strong>
                <small>*This price is in today's value.</small>
              </span>
              <span>{{ draftConfig.hasCustomPriceRange ? 'Yes' : 'No' }}</span>
            </button>

            <Transition name="wealth-scout-reveal">
              <div v-if="draftConfig.hasCustomPriceRange" class="wealth-scout__range-grid">
                <label>
                  <span>Minimum price</span>
                  <select v-model.number="draftConfig.minPrice">
                    <option :value="null">No minimum</option>
                    <option v-for="value in priceOptions" :key="`min-${value}`" :value="value">{{ formatCurrency(value) }}</option>
                  </select>
                </label>
                <label>
                  <span>Maximum price</span>
                  <select v-model.number="draftConfig.maxPrice">
                    <option :value="null">No maximum</option>
                    <option v-for="value in priceOptions" :key="`max-${value}`" :value="value">{{ formatCurrency(value) }}</option>
                  </select>
                </label>
              </div>
            </Transition>
          </div>
        </template>

        <template v-else-if="activeStep.key === 'location'">
          <div class="wealth-scout__question-head">
            <p class="wealth-scout__question-index">{{ questionProgressLabel }}</p>
            <h3>Do you have a preference for location?</h3>
            <p>Pick a specific NSW region, or let the scout compare broad regions versus all individual suburbs.</p>
          </div>

          <div class="wealth-scout__choice-grid wealth-scout__choice-grid--two">
            <button type="button" class="wealth-scout__choice" :class="{ 'is-active': locationPreference === 'specific' }" @click="selectLocationPreference('specific')">
              <strong>Yes, I have a region in mind</strong>
              <span>Filter results down to one region.</span>
            </button>
            <button type="button" class="wealth-scout__choice" :class="{ 'is-active': locationPreference !== 'specific' }" @click="selectLocationPreference('broad')">
              <strong>No strong preference</strong>
              <span>Choose between top regions or all individual suburbs.</span>
            </button>
          </div>

          <Transition name="wealth-scout-reveal" mode="out-in">
            <div v-if="locationPreference === 'specific'" key="specific" class="wealth-scout__range-grid wealth-scout__range-grid--single">
              <label>
                <span>Preferred region</span>
                <select v-model="draftConfig.locationKey">
                  <option :value="null">Select a region</option>
                  <option v-for="option in regionOptions" :key="option.key" :value="option.key">{{ option.label }}</option>
                </select>
              </label>
            </div>
            <div v-else key="broad" class="wealth-scout__choice-grid wealth-scout__choice-grid--two">
              <button type="button" class="wealth-scout__choice" :class="{ 'is-active': draftConfig.granularity === 'region' }" @click="setBroadSearchMode('region')">
                <strong>Show top regions</strong>
                <span>Return larger regional catchments first.</span>
              </button>
              <button type="button" class="wealth-scout__choice" :class="{ 'is-active': draftConfig.granularity === 'suburb' }" @click="setBroadSearchMode('suburb')">
                <strong>Show all individual suburbs</strong>
                <span>Rank individual suburbs across NSW.</span>
              </button>
            </div>
          </Transition>
        </template>

        <template v-else-if="activeStep.key === 'property'">
          <div class="wealth-scout__question-head">
            <p class="wealth-scout__question-index">{{ questionProgressLabel }}</p>
            <h3>Are you interested in an apartment or house?</h3>
            <p>The scout uses the matching market history, growth assumptions, and purchasing-power track for that property type.</p>
          </div>

          <div class="wealth-scout__choice-grid wealth-scout__choice-grid--two">
            <button type="button" class="wealth-scout__choice" :class="{ 'is-active': draftConfig.propertyType === 'apartment' }" @click="draftConfig.propertyType = 'apartment'">
              <strong>Apartment</strong>
              <span>Use apartment medians and apartment-specific holding costs.</span>
            </button>
            <button type="button" class="wealth-scout__choice" :class="{ 'is-active': draftConfig.propertyType === 'house' }" @click="draftConfig.propertyType = 'house'">
              <strong>House</strong>
              <span>Use house medians and house-specific borrowing assumptions.</span>
            </button>
          </div>

          <div class="wealth-scout__summary-grid">
            <article class="wealth-scout__summary-card">
              <span>Search scope</span>
              <strong>{{ searchScopeLabel }}</strong>
              <small>{{ locationSummaryLabel }}</small>
            </article>
            <article class="wealth-scout__summary-card">
              <span>Buying goal</span>
              <strong>{{ buyTimingLabel }}</strong>
              <small>{{ draftConfig.buyFlexibility === 'whenever' ? 'Scout will surface earliest affordable timing' : 'Results fixed to the chosen timeframe' }}</small>
            </article>
          </div>
        </template>

        <template v-else-if="activeStep.key === 'ranking'">
          <div class="wealth-scout__question-head">
            <p class="wealth-scout__question-index">{{ questionProgressLabel }}</p>
            <h3>How should results be sorted?</h3>
            <p>Balance long-run capital growth against rental yield, and choose how much volatility should be penalised.</p>
          </div>

          <div class="wealth-scout__ranking">
            <div class="wealth-scout__ranking-head">
              <strong>Priority weighting</strong>
              <span>{{ rankingPreferenceLabel }}</span>
            </div>
            <input
              v-model.number="draftConfig.rentalYieldWeight"
              class="wealth-scout__slider"
              type="range"
              min="0"
              max="1"
              step="0.05"
            />
            <div class="wealth-scout__slider-scale">
              <span>Property growth only</span>
              <span>Balanced</span>
              <span>Rental yield only</span>
            </div>
            <div class="wealth-scout__choice-grid wealth-scout__choice-grid--three">
              <button type="button" class="wealth-scout__choice wealth-scout__choice--compact" :class="{ 'is-active': draftConfig.riskAppetite === 'small' }" @click="setRiskAppetite('small')">
                <strong>Small</strong>
                <span>Bigger penalty for volatility.</span>
              </button>
              <button type="button" class="wealth-scout__choice wealth-scout__choice--compact" :class="{ 'is-active': draftConfig.riskAppetite === 'medium' }" @click="setRiskAppetite('medium')">
                <strong>Medium</strong>
                <span>Balanced penalty.</span>
              </button>
              <button type="button" class="wealth-scout__choice wealth-scout__choice--compact" :class="{ 'is-active': draftConfig.riskAppetite === 'large' }" @click="setRiskAppetite('large')">
                <strong>Large</strong>
                <span>Smaller penalty for volatility.</span>
              </button>
            </div>
          </div>
        </template>

        <template v-else>
          <div class="wealth-scout__question-head wealth-scout__question-head--results">
            <div>
              <h3>{{ model.totalMatches ? `${model.totalMatches} matching ${appliedConfig.granularity === 'region' ? 'regions' : 'suburbs'}` : 'No matches yet' }}</h3>
            </div>
            <p>Each result shows today's median, the price at your buy timing, and the average yearly increase. Open a result for the deeper projection view.</p>
          </div>

          <div class="wealth-scout__summary-grid">
            <article class="wealth-scout__summary-card">
              <span>Current purchasing power</span>
              <strong>{{ formatCurrency(model.currentSnapshot.affordablePrice) }}</strong>
              <small>Year 0 affordability</small>
            </article>
            <article class="wealth-scout__summary-card">
              <span>{{ appliedConfig.buyFlexibility === 'target' ? 'Future purchasing power' : 'Best observed timing' }}</span>
              <strong>{{ appliedConfig.buyFlexibility === 'target' ? formatCurrency(model.futureSnapshot.affordablePrice) : (model.bestTiming === null ? 'None yet' : yearLabel(model.bestTiming)) }}</strong>
              <small>{{ appliedConfig.buyFlexibility === 'target' ? appliedBuyTimingLabel : 'Earliest affordable result in the current shortlist' }}</small>
            </article>
            <article class="wealth-scout__summary-card">
              <span>Projected savings</span>
              <strong>{{ formatCurrency(model.futureSnapshot.liquidSavings) }}</strong>
              <small>{{ savingsPathLabel }}</small>
            </article>
            <article class="wealth-scout__summary-card">
              <span>Price filter</span>
              <strong>{{ priceRangeLabel }}</strong>
              <small>In today's dollars</small>
            </article>
          </div>

          <div v-if="model.hasRecommendations" class="wealth-scout__results">
            <article v-for="(recommendation, index) in model.recommendations" :key="recommendation.key" class="wealth-scout__result-card" :class="{ 'is-expanded': activeResultKey === recommendation.key }">
              <button type="button" class="wealth-scout__result-main" @click="toggleResult(recommendation.key)">
                <div class="wealth-scout__result-rank">#{{ index + 1 }}</div>
                <div class="wealth-scout__result-copy">
                  <div class="wealth-scout__result-head">
                    <div>
                      <h4>{{ recommendation.label }}</h4>
                      <p>{{ recommendation.type === 'region' ? 'Region' : 'Suburb' }}<template v-if="recommendation.regionLabel && recommendation.regionLabel !== recommendation.label"> | {{ recommendation.regionLabel }}</template></p>
                    </div>
                    <strong>{{ formatPercent(recommendation.growthMean) }}</strong>
                  </div>

                  <div class="wealth-scout__result-metrics">
                    <div>
                      <span>Median {{ propertyTypeLabel.toLowerCase() }} price</span>
                      <strong>{{ formatCurrency(recommendation.priceToday) }}</strong>
                    </div>
                    <div>
                      <span>Buy-year price</span>
                      <strong>{{ formatCurrency(recommendation.buyYearPrice) }}</strong>
                    </div>
                    <div>
                      <span>Avg increase per year</span>
                      <strong>{{ formatPercent(recommendation.growthMean) }}</strong>
                    </div>
                    <div>
                      <span>Timing</span>
                      <strong>{{ recommendation.selectedTimingLabel }}</strong>
                    </div>
                    <div>
                      <span>Growth score</span>
                      <strong>{{ formatPercent(recommendation.growthScore) }}</strong>
                    </div>
                    <div>
                      <span>Yield score</span>
                      <strong>{{ formatPercent(recommendation.rentalYieldScore) }}</strong>
                    </div>
                  </div>
                </div>
              </button>

              <Transition name="wealth-scout-reveal">
                <div v-if="activeResultKey === recommendation.key" class="wealth-scout__detail">
                  <div class="wealth-scout__detail-metrics">
                    <article class="wealth-scout__detail-card">
                      <span>Deposit required</span>
                      <strong>{{ formatCurrency(recommendation.requiredCashAtBuyYear) }}</strong>
                      <small>{{ recommendation.requiredDepositPctAtBuyYear ? `${Math.round(recommendation.requiredDepositPctAtBuyYear * 100)}% of property value` : 'Not affordable within the current plan window' }}</small>
                    </article>
                    <article class="wealth-scout__detail-card">
                      <span>Budget gap at buy timing</span>
                      <strong :class="budgetClass(recommendation.budgetGap)">{{ formatSignedCurrency(recommendation.budgetGap) }}</strong>
                      <small>Positive means the plan clears the buy-year price</small>
                    </article>
                  </div>

                  <div class="wealth-scout__charts wealth-scout__charts--stacked">
                    <WealthPropertyTrendChart :title="`Historical ${propertyTypeLabel.toLowerCase()} price`" :subtitle="recommendation.selectedTimingLabel" color="#0f766e" :actual-points="recommendation.actualPoints" :trend-points="recommendation.trendPoints" :estimate-point="recommendation.estimatePoint" />
                    <WealthLineChart :title="`${propertyTypeLabel} price Monte Carlo`" subtitle="P10 / P50 / P90 projection for the next 30 years." kicker="Forward market path" :series="buildMonteCarloChartSeries(recommendation)" :markers="buildResultMarkers(recommendation)" />
                    <WealthLineChart title="Purchasing power vs required property value" subtitle="Compare what you can buy against the projected price path." kicker="30-year affordability" :series="buildResultPowerSeries(recommendation)" :markers="buildResultMarkers(recommendation)" />
                    <WealthLineChart title="Required deposit vs your sell-off savings" subtitle="Deposit cash includes purchase costs." kicker="30-year deposit path" :series="buildResultDepositSeries(recommendation)" :markers="buildResultMarkers(recommendation)" />
                  </div>
                </div>
              </Transition>
            </article>
          </div>

          <div v-else class="wealth-scout__empty">
            <h4>No results match those settings</h4>
            <p>Widen the price range, switch between regions and suburbs, or change the buy timing.</p>
          </div>
        </template>
      </section>
    </Transition>

    <div class="wealth-scout__footer">
      <button type="button" class="wealth-scout__nav wealth-scout__nav--secondary" :disabled="currentStepIndex === 0" @click="goBack">Previous</button>
      <button type="button" class="wealth-scout__nav wealth-scout__nav--primary" :disabled="!canMoveForward" @click="goNext">
        {{ currentStepIndex === steps.length - 1 ? 'Stay on results' : 'Next' }}
      </button>
    </div>
  </section>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import WealthLineChart from './WealthLineChart.vue'
import WealthPropertyTrendChart from './WealthPropertyTrendChart.vue'
import { buildRegionScoutModel, normaliseRegionScoutConfig } from '../../wealth/regionScout.js'
import { portfolioAllocationFields, setPortfolioAllocation } from '../../wealth/portfolioAllocation.js'

const props = defineProps({
  form: { type: Object, required: true },
  scoutConfig: {
    type: Object,
    required: true
  },
  suburbSearchContext: {
    type: Object,
    default: () => ({ areasByKey: {}, areaOptions: [] })
  }
})

const steps = [
  { key: 'intro', label: 'Intro' },
  { key: 'timing', label: 'Timing' },
  { key: 'savings', label: 'Savings path' },
  { key: 'power', label: 'Purchasing power' },
  { key: 'location', label: 'Location' },
  { key: 'property', label: 'Property type' },
  { key: 'ranking', label: 'Ranking' },
  { key: 'results', label: 'Results' }
]

const currentStepIndex = ref(0)
const transitionDirection = ref('forward')
const activeResultKey = ref(null)
const draftConfig = reactive(createDraftConfig(props.scoutConfig))
const locationPreference = ref(draftConfig.locationKey ? 'specific' : 'broad')

const appliedConfig = computed(() => props.scoutConfig)
const activeStep = computed(() => steps[currentStepIndex.value])
const transitionName = computed(() =>
  transitionDirection.value === 'forward' ? 'wealth-scout-slide-next' : 'wealth-scout-slide-back'
)

const regionOptions = computed(() =>
  (props.suburbSearchContext?.areaOptions || []).filter((option) => option.type === 'region')
)

const model = computed(() => buildRegionScoutModel({
  form: props.form,
  suburbSearchContext: props.suburbSearchContext,
  config: normaliseRegionScoutConfig(props.scoutConfig)
}))

const fixedDepositPctUi = computed({
  get: () => Math.round((Number(draftConfig.fixedDepositPct) || 0.2) * 100),
  set: (value) => {
    draftConfig.fixedDepositPct = Math.max(0.05, Math.min(0.95, (Number(value) || 20) / 100))
  }
})

const sliderTimingLabel = computed(() => yearLabel(draftConfig.targetYears))
const buyTimingLabel = computed(() =>
  draftConfig.buyFlexibility === 'whenever'
    ? 'Whenever I can afford to'
    : sliderTimingLabel.value
)
const savingsPathLabel = computed(() =>
  draftConfig.savingsMode === 'cash'
    ? 'High-interest cash savings'
    : 'Invested portfolio savings'
)
const depositModeLabel = computed(() =>
  draftConfig.depositMode === 'fixed'
    ? `${Math.round(draftConfig.fixedDepositPct * 100)}% fixed deposit`
    : 'Auto-scaled strongest deposit'
)
const propertyTypeLabel = computed(() =>
  draftConfig.propertyType === 'house' ? 'House' : 'Apartment'
)
const searchScopeLabel = computed(() => {
  if (locationPreference.value === 'specific') {
    const match = regionOptions.value.find((option) => option.key === draftConfig.locationKey)
    return match?.label || 'Pick a region'
  }
  return draftConfig.granularity === 'suburb' ? 'All individual suburbs' : 'Top regions'
})
const locationSummaryLabel = computed(() =>
  locationPreference.value === 'specific'
    ? 'Scoped to one region'
    : draftConfig.granularity === 'suburb'
      ? 'Statewide suburb ranking'
      : 'Statewide region ranking'
)
const priceRangeLabel = computed(() => {
  if (!draftConfig.hasCustomPriceRange) return 'Open range'
  if (draftConfig.minPrice && draftConfig.maxPrice) {
    return `${formatCurrency(draftConfig.minPrice)} to ${formatCurrency(draftConfig.maxPrice)}`
  }
  if (draftConfig.minPrice) return `${formatCurrency(draftConfig.minPrice)}+`
  if (draftConfig.maxPrice) return `Up to ${formatCurrency(draftConfig.maxPrice)}`
  return 'Open range'
})

const questionProgressLabel = computed(() => {
  const questionKeys = ['timing', 'savings', 'power', 'location', 'property', 'ranking']
  const visibleIndex = Math.max(1, questionKeys.indexOf(activeStep.value.key) + 1)
  return `Question ${visibleIndex}/${questionKeys.length}`
})

const appliedBuyTimingLabel = computed(() => (
  appliedConfig.value.buyFlexibility === 'whenever'
    ? 'Whenever I can afford to'
    : yearLabel(appliedConfig.value.targetYears)
))

const rankingPreferenceLabel = computed(() => {
  const yieldWeight = Math.round((draftConfig.rentalYieldWeight || 0) * 100)
  const growthWeight = 100 - yieldWeight
  return `${growthWeight}% growth / ${yieldWeight}% rent yield`
})

const furthestUnlockedStep = computed(() => {
  let unlocked = 0
  for (let index = 0; index < steps.length - 1; index += 1) {
    if (!isStepValid(index)) return index
    unlocked = index + 1
  }
  return Math.min(unlocked, steps.length - 1)
})

const canMoveForward = computed(() => isStepValid(currentStepIndex.value))

const buyYearMarker = computed(() => {
  const markerYear = appliedConfig.value.buyFlexibility === 'target' ? appliedConfig.value.targetYears : model.value.bestTiming
  return Number.isFinite(markerYear)
    ? [{ year: markerYear, label: appliedConfig.value.buyFlexibility === 'target' ? 'Buy target' : 'Best timing', color: '#0f766e' }]
    : []
})

const purchasingPowerChartSeries = computed(() => ([
  {
    id: 'power',
    label: 'Purchasing power',
    color: '#0f766e',
    accent: 'rgba(15, 118, 110, 0.15)',
    points: model.value.affordabilityTimeline.map((point) => ({
      year: point.year,
      low: point.affordablePrice,
      mid: point.affordablePrice,
      high: point.affordablePrice
    }))
  }
]))

const depositChartSeries = computed(() => ([
  {
    id: 'saved',
    label: 'Sell-off savings',
    color: '#2563eb',
    accent: 'rgba(37, 99, 235, 0.16)',
    points: model.value.affordabilityTimeline.map((point) => ({
      year: point.year,
      low: point.liquidSavings,
      mid: point.liquidSavings,
      high: point.liquidSavings
    }))
  },
  {
    id: 'required',
    label: 'Required deposit cash',
    color: '#f97316',
    accent: 'rgba(249, 115, 22, 0.14)',
    points: model.value.affordabilityTimeline.map((point) => ({
      year: point.year,
      low: point.requiredCash,
      mid: point.requiredCash,
      high: point.requiredCash
    }))
  }
]))

const priceOptions = buildPriceOptions()

watch(model, (nextModel) => {
  const firstKey = nextModel.recommendations[0]?.key || null
  if (!nextModel.recommendations.some((item) => item.key === activeResultKey.value)) {
    activeResultKey.value = firstKey
  }
}, { immediate: true })

watch(() => draftConfig.savingsMode, (mode) => {
  props.form.propertyConfig.investWhileSavingForDeposit = mode === 'defaultPortfolio'
}, { immediate: true })

watch(() => draftConfig.hasCustomPriceRange, (enabled) => {
  if (!enabled) {
    draftConfig.minPrice = null
    draftConfig.maxPrice = null
  }
})

watch(() => draftConfig.minPrice, (minPrice) => {
  if (draftConfig.maxPrice && minPrice && minPrice > draftConfig.maxPrice) {
    draftConfig.maxPrice = minPrice
  }
})

watch(() => draftConfig.maxPrice, (maxPrice) => {
  if (draftConfig.minPrice && maxPrice && maxPrice < draftConfig.minPrice) {
    draftConfig.minPrice = maxPrice
  }
})

watch(() => props.scoutConfig, (nextConfig) => {
  Object.assign(draftConfig, createDraftConfig(nextConfig))
}, { deep: true })

function isStepValid(index) {
  const stepKey = steps[index]?.key
  if (stepKey === 'savings') return draftConfig.savingsMode === 'cash' || portfolioTotalPct() === 100
  if (stepKey === 'location') return locationPreference.value === 'specific' ? Boolean(draftConfig.locationKey) : ['region', 'suburb'].includes(draftConfig.granularity)
  return true
}

function goToStep(index) {
  if (index < 0 || index >= steps.length) return
  if (index > furthestUnlockedStep.value) return
  transitionDirection.value = index >= currentStepIndex.value ? 'forward' : 'back'
  currentStepIndex.value = index
}

function goNext() {
  if (!canMoveForward.value || currentStepIndex.value >= steps.length - 1) return
  commitCurrentStep()
  goToStep(currentStepIndex.value + 1)
}

function goBack() {
  if (currentStepIndex.value <= 0) return
  goToStep(currentStepIndex.value - 1)
}

function setTargetBuyMode() {
  draftConfig.buyFlexibility = 'target'
}

function setWheneverMode() {
  draftConfig.buyFlexibility = 'whenever'
}

function selectSavingsMode(mode) {
  draftConfig.savingsMode = mode
}

function selectLocationPreference(mode) {
  locationPreference.value = mode === 'specific' ? 'specific' : 'broad'
  if (locationPreference.value === 'specific') draftConfig.granularity = 'region'
  else draftConfig.locationKey = null
}

function setBroadSearchMode(mode) {
  draftConfig.locationKey = null
  draftConfig.granularity = mode === 'suburb' ? 'suburb' : 'region'
}

function setRiskAppetite(value) {
  draftConfig.riskAppetite = value
}

function toggleResult(resultKey) {
  activeResultKey.value = activeResultKey.value === resultKey ? null : resultKey
}

function handleAllocationInput(key, event) {
  setPortfolioAllocation(props.form.portfolioConfig, key, event?.target?.value)
}

function getAllocationPct(key) {
  return Math.round((Math.max(0, Number(props.form.portfolioConfig[key]) || 0) * 100))
}

function portfolioTotalPct() {
  return portfolioAllocationFields.reduce((sum, field) => sum + getAllocationPct(field.key), 0)
}

function buildMonteCarloChartSeries(recommendation) {
  return [{
    id: 'mc',
    label: `${propertyTypeLabel.value} price`,
    color: '#0f766e',
    accent: 'rgba(15, 118, 110, 0.16)',
    points: recommendation.monteCarloSeries
  }]
}

function buildResultPowerSeries(recommendation) {
  return [
    {
      id: 'power',
      label: 'Your purchasing power',
      color: '#2563eb',
      accent: 'rgba(37, 99, 235, 0.16)',
      points: recommendation.purchasingPowerSeries.map((point) => ({ year: point.year, low: point.affordablePrice, mid: point.affordablePrice, high: point.affordablePrice }))
    },
    {
      id: 'required',
      label: 'Required property value',
      color: '#f97316',
      accent: 'rgba(249, 115, 22, 0.14)',
      points: recommendation.purchasingPowerSeries.map((point) => ({ year: point.year, low: point.requiredPrice, mid: point.requiredPrice, high: point.requiredPrice }))
    }
  ]
}

function buildResultDepositSeries(recommendation) {
  return [
    {
      id: 'saved',
      label: 'Sell-off savings',
      color: '#2563eb',
      accent: 'rgba(37, 99, 235, 0.16)',
      points: recommendation.depositSeries.map((point) => ({ year: point.year, low: point.sellOffSavings, mid: point.sellOffSavings, high: point.sellOffSavings }))
    },
    {
      id: 'deposit',
      label: 'Required deposit',
      color: '#f97316',
      accent: 'rgba(249, 115, 22, 0.14)',
      points: recommendation.depositSeries.map((point) => ({ year: point.year, low: point.requiredDeposit, mid: point.requiredDeposit, high: point.requiredDeposit }))
    }
  ]
}

function buildResultMarkers(recommendation) {
  return Number.isFinite(recommendation.selectedYear) ? [{ year: recommendation.selectedYear, label: 'Buy line', color: '#0f766e' }] : []
}

function buildPriceOptions() {
  const values = []
  for (let value = 300000; value <= 1000000; value += 50000) values.push(value)
  for (let value = 1100000; value <= 2500000; value += 100000) values.push(value)
  for (let value = 2750000; value <= 5000000; value += 250000) values.push(value)
  return values
}

function commitCurrentStep() {
  Object.assign(props.scoutConfig, normaliseRegionScoutConfig(draftConfig))
}

function createDraftConfig(config) {
  return {
    ...normaliseRegionScoutConfig(config)
  }
}

function formatCurrency(value) {
  return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 }).format(Number(value) || 0)
}

function formatSignedCurrency(value) {
  const safeValue = Number(value) || 0
  return `${safeValue >= 0 ? '+' : '-'}${formatCurrency(Math.abs(safeValue))}`
}

function formatPercent(value) {
  if (!Number.isFinite(Number(value))) return 'n/a'
  return `${(Number(value) * 100).toFixed(1)}% p.a.`
}

function budgetClass(value) {
  return (Number(value) || 0) >= 0 ? 'is-positive' : 'is-negative'
}

function yearLabel(year) {
  return Number(year) === 0 ? 'Now' : `In ${year} years`
}
</script>

<style scoped>
.wealth-scout {
  display: grid;
  gap: 1rem;
  padding: 1.3rem;
  background: linear-gradient(180deg, rgba(253, 254, 255, 0.96), rgba(243, 248, 255, 0.94));
}

.wealth-scout__hero,
.wealth-scout__question-head,
.wealth-scout__result-head,
.wealth-scout__slider-head,
.wealth-scout__allocation-top,
.wealth-scout__footer,
.wealth-scout__toggle-row,
.wealth-scout__result-main,
.wealth-scout__result-metrics,
.wealth-scout__detail-metrics {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
}

.wealth-scout__kicker,
.wealth-scout__eyebrow {
  margin: 0;
  text-transform: uppercase;
  letter-spacing: 0.16em;
  font-size: 0.74rem;
  color: #5d7ba3;
}

.wealth-scout__hero h2,
.wealth-scout__question-head h3,
.wealth-scout__result-head h4,
.wealth-scout__empty h4 {
  margin: 0.15rem 0 0;
  color: #173050;
}

.wealth-scout__hero {
  display: grid;
  align-content: center;
  justify-items: center;
  min-height: 20rem;
  max-width: 56rem;
  margin: 0 auto;
  text-align: center;
}

.wealth-scout__hero h2 {
  font-size: clamp(2.5rem, 2rem + 1.8vw, 4rem);
  line-height: 0.96;
  letter-spacing: -0.05em;
  max-width: 14ch;
}

.wealth-scout__copy,
.wealth-scout__question-head p,
.wealth-scout__result-head p,
.wealth-scout__empty p {
  margin: 0;
  color: #5d7394;
  line-height: 1.55;
}

.wealth-scout__choice-grid,
.wealth-scout__summary-grid,
.wealth-scout__charts,
.wealth-scout__results,
.wealth-scout__portfolio,
.wealth-scout__range-grid {
  display: grid;
  gap: 0.85rem;
}

.wealth-scout__panel {
  display: grid;
  gap: 1rem;
  min-height: calc(100vh - 18rem);
  padding: 1.6rem 0.4rem 1rem;
  border: 0;
  background: transparent;
  box-shadow: none;
}

.wealth-scout__question-head {
  position: relative;
  display: grid;
  justify-items: center;
  text-align: center;
  gap: 0.45rem;
  width: min(100%, 70rem);
  min-height: 11.5rem;
  padding: 0;
  margin: 0 auto;
  align-content: center;
}

.wealth-scout__question-head--results {
  align-items: center;
}

.wealth-scout__question-index {
  position: absolute;
  top: -0.4rem;
  right: 0;
  margin: 0;
  color: #6a819f;
  font-size: 0.82rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.wealth-scout__choice-grid--two,
.wealth-scout__summary-grid,
.wealth-scout__charts,
.wealth-scout__detail-metrics,
.wealth-scout__range-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.wealth-scout__choice-grid--three {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.wealth-scout__selection-stage {
  display: grid;
  gap: 1rem;
}

.wealth-scout__selection-detail {
  min-height: 10.5rem;
  width: min(100%, 70rem);
  margin-inline: auto;
}

.wealth-scout__choice,
.wealth-scout__summary-card,
.wealth-scout__slider-card,
.wealth-scout__allocation,
.wealth-scout__toggle-row,
.wealth-scout__result-card,
.wealth-scout__detail-card,
.wealth-scout__empty {
  border-radius: 22px;
  border: 1px solid rgba(154, 174, 204, 0.16);
  background: rgba(247, 250, 255, 0.88);
}

.wealth-scout__choice,
.wealth-scout__toggle-row,
.wealth-scout__result-main {
  width: 100%;
  text-align: left;
  font: inherit;
  color: inherit;
  cursor: pointer;
}

.wealth-scout__choice {
  display: grid;
  gap: 0.35rem;
  min-height: 8.75rem;
  padding: 1rem 1.05rem;
  align-content: center;
}

.wealth-scout__choice--compact {
  min-height: 0;
  padding: 0.9rem 1rem;
}

.wealth-scout__choice strong,
.wealth-scout__toggle-row strong,
.wealth-scout__summary-card strong,
.wealth-scout__detail-card strong {
  color: #173050;
}

.wealth-scout__choice span,
.wealth-scout__toggle-row small,
.wealth-scout__summary-card small,
.wealth-scout__detail-card small {
  color: #5d7394;
  line-height: 1.5;
}

.wealth-scout__choice.is-active,
.wealth-scout__toggle-row.is-active {
  border-color: rgba(37, 99, 235, 0.26);
  background: rgba(232, 242, 255, 0.96);
}

.wealth-scout__slider-card,
.wealth-scout__summary-card,
.wealth-scout__detail-card {
  display: grid;
  gap: 0.45rem;
  padding: 1rem;
}

.wealth-scout__question-head h3 {
  font-size: clamp(2rem, 1.55rem + 1.4vw, 3rem);
  line-height: 1.02;
  letter-spacing: -0.04em;
  max-width: 42ch;
  margin-inline: auto;
}

.wealth-scout__question-head p {
  max-width: 48rem;
  font-size: 1rem;
}

.wealth-scout__choice-grid,
.wealth-scout__slider-card,
.wealth-scout__summary-grid,
.wealth-scout__charts,
.wealth-scout__ranking,
.wealth-scout__custom-range,
.wealth-scout__portfolio,
.wealth-scout__range-grid,
.wealth-scout__results,
.wealth-scout__empty {
  width: min(100%, 70rem);
  margin-inline: auto;
}

.wealth-scout__choice-grid--two {
  grid-template-columns: repeat(2, minmax(18rem, 24rem));
  justify-content: center;
}

.wealth-scout__choice-grid--three {
  grid-template-columns: repeat(3, minmax(14rem, 18rem));
  justify-content: center;
}

.wealth-scout__ranking {
  display: grid;
  gap: 0.8rem;
}

.wealth-scout__charts--stacked {
  grid-template-columns: 1fr;
}

.wealth-scout :deep(.wealth-chart__body) {
  min-height: 360px;
}

.wealth-scout__ranking-head {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: center;
  color: #5d7394;
}

.wealth-scout__ranking-head strong {
  color: #173050;
}

.wealth-scout__choice,
.wealth-scout__summary-card,
.wealth-scout__slider-card,
.wealth-scout__allocation,
.wealth-scout__toggle-row,
.wealth-scout__result-card,
.wealth-scout__detail-card,
.wealth-scout__empty {
  border: 0;
  background: rgba(247, 250, 255, 0.68);
  box-shadow: none;
}

.wealth-scout__slider-card--compact {
  max-width: 32rem;
}

.wealth-scout__slider-head span,
.wealth-scout__summary-card span,
.wealth-scout__result-metrics span,
.wealth-scout__detail-card span {
  color: #6481a6;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

.wealth-scout__slider {
  width: 100%;
}

.wealth-scout__slider-scale {
  display: flex;
  justify-content: space-between;
  gap: 0.75rem;
  color: #6a819f;
  font-size: 0.8rem;
}

.wealth-scout__portfolio {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.wealth-scout__allocation {
  display: grid;
  gap: 0.6rem;
  padding: 0.95rem;
}

.wealth-scout__allocation-title {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  color: #173050;
}

.wealth-scout__swatch {
  width: 0.75rem;
  height: 0.75rem;
  border-radius: 999px;
}

.wealth-scout__allocation-controls {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 88px;
  gap: 0.75rem;
}

.wealth-scout__allocation-controls input,
.wealth-scout__range-grid select {
  width: 100%;
  min-height: 3rem;
  padding: 0.75rem 0.85rem;
  border-radius: 16px;
  border: 1px solid rgba(154, 174, 204, 0.2);
  background: rgba(255, 255, 255, 0.96);
  color: #173050;
  font: inherit;
}

.wealth-scout__allocation-controls input[type='range'] {
  min-height: 0;
  padding-inline: 0;
}

.wealth-scout__custom-range {
  display: grid;
  gap: 0.8rem;
}

.wealth-scout__toggle-row {
  align-items: center;
  padding: 1rem 1.05rem;
}

.wealth-scout__toggle-row span {
  display: grid;
  gap: 0.2rem;
}

.wealth-scout__range-grid label {
  display: grid;
  gap: 0.35rem;
  color: #5b7192;
  font-size: 0.84rem;
}

.wealth-scout__range-grid--single {
  max-width: 28rem;
}

.wealth-scout__result-card {
  overflow: hidden;
}

.wealth-scout__result-main {
  align-items: stretch;
  padding: 1rem;
  border: 0;
  background: transparent;
}

.wealth-scout__result-rank {
  width: 4rem;
  min-width: 4rem;
  display: grid;
  place-items: center;
  border-radius: 18px;
  background: linear-gradient(135deg, #dbeafe, #eff6ff);
  color: #1d4ed8;
  font-weight: 700;
}

.wealth-scout__result-copy,
.wealth-scout__detail {
  display: grid;
  gap: 0.9rem;
  flex: 1 1 auto;
}

.wealth-scout__result-head strong {
  color: #0f766e;
  white-space: nowrap;
}

.wealth-scout__result-metrics {
  flex-wrap: wrap;
}

.wealth-scout__result-metrics div {
  flex: 1 1 10rem;
  display: grid;
  gap: 0.18rem;
  padding: 0.85rem;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.9);
}

.wealth-scout__detail {
  padding: 0 1rem 1rem;
}

.wealth-scout__detail strong.is-positive {
  color: #0f766e;
}

.wealth-scout__detail strong.is-negative {
  color: #b42318;
}

.wealth-scout__empty {
  display: grid;
  gap: 0.6rem;
  padding: 1.1rem;
}

.wealth-scout__footer {
  align-items: center;
}

.wealth-scout__nav {
  border: 1px solid rgba(154, 174, 204, 0.22);
  border-radius: 999px;
  padding: 0.78rem 1.05rem;
  font: inherit;
  cursor: pointer;
}

.wealth-scout__nav--secondary {
  background: rgba(244, 248, 255, 0.96);
  color: #27415f;
}

.wealth-scout__nav--primary {
  background: linear-gradient(135deg, #8fd3ff, #bce4ff);
  color: #0f2848;
}

.wealth-scout__nav:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.wealth-scout-slide-next-enter-active,
.wealth-scout-slide-next-leave-active,
.wealth-scout-slide-back-enter-active,
.wealth-scout-slide-back-leave-active,
.wealth-scout-reveal-enter-active,
.wealth-scout-reveal-leave-active {
  transition: opacity 220ms ease, transform 220ms ease, max-height 220ms ease;
}

.wealth-scout-slide-next-enter-from,
.wealth-scout-slide-back-leave-to {
  opacity: 0;
  transform: translateX(26px);
}

.wealth-scout-slide-next-leave-to,
.wealth-scout-slide-back-enter-from {
  opacity: 0;
  transform: translateX(-26px);
}

.wealth-scout-reveal-enter-from,
.wealth-scout-reveal-leave-to {
  opacity: 0;
  transform: translateY(-8px);
  max-height: 0;
}

@media (max-width: 980px) {
  .wealth-scout__hero,
  .wealth-scout__question-head,
  .wealth-scout__result-head,
  .wealth-scout__result-main,
  .wealth-scout__footer,
  .wealth-scout__detail-metrics,
  .wealth-scout__charts,
  .wealth-scout__summary-grid,
  .wealth-scout__portfolio,
  .wealth-scout__choice-grid--three,
  .wealth-scout__choice-grid--two,
  .wealth-scout__range-grid {
    grid-template-columns: 1fr;
    display: grid;
  }

  .wealth-scout__panel {
    min-height: calc(100vh - 16rem);
  }

  .wealth-scout__question-head {
    min-height: 10.5rem;
    padding-inline: 1rem;
  }

  .wealth-scout__result-rank {
    width: 100%;
    min-width: 0;
    min-height: 3rem;
  }
}

@media (max-width: 720px) {
  .wealth-scout {
    padding: 1rem;
  }

  .wealth-scout__panel {
    min-height: calc(100vh - 14rem);
  }

  .wealth-scout__allocation-controls {
    grid-template-columns: 1fr;
  }

  .wealth-scout__question-index {
    right: 1rem;
  }
}
</style>
