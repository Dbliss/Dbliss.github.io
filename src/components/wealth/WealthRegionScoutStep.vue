<template>
  <section class="wealth-scout" :class="viewMode === 'inputs' ? 'wealth-scout--bare' : 'card'">
    <section v-if="viewMode === 'inputs'" class="wealth-scout__panel wealth-scout__panel--form">
      <div class="scout-form">
        <header class="scout-form__head">
          <p class="scout-form__eyebrow">Area search</p>
          <h2>Set your search</h2>
          <p class="scout-form__lede">
            Tell us your budget and what matters most, and we will rank every NSW suburb for you.
          </p>
        </header>

        <section class="scout-form__block">
          <div class="scout-form__budget-head">
            <span class="wealth-scout__metric-label">
              Target purchase price
              <span
                class="wealth-scout__metric-tooltip"
                tabindex="0"
                data-tooltip="The most you would pay for a property. Suburbs whose median sits at or below this price are treated as within budget."
                aria-label="What is the target purchase price?"
              >i</span>
            </span>
            <div class="scout-form__budget-value" data-prefix="$">
              <input
                :value="formattedBudget"
                type="text"
                inputmode="numeric"
                autocomplete="off"
                aria-label="Target purchase price"
                data-testid="scout-budget-input"
                :style="budgetInputStyle"
                @input="handleBudgetTextInput"
              />
            </div>
          </div>

          <input
            v-model.number="budgetUi"
            class="scout-form__slider"
            type="range"
            aria-label="Drag to adjust your target purchase price"
            :style="budgetSliderStyle"
            :min="budgetSliderBounds.min"
            :max="budgetSliderBounds.max"
            :step="budgetSliderBounds.step"
          />

          <div class="scout-form__scale">
            <span v-for="tick in budgetScaleTicks" :key="tick.value">{{ tick.label }}</span>
          </div>

          <div class="scout-form__callout">
            <span class="scout-form__callout-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M4 19V9" />
                <path d="M10 19V5" />
                <path d="M16 19v-7" />
                <path d="M21 19H3" />
              </svg>
            </span>
            <div class="scout-form__callout-copy">
              <strong>{{ medianHeadline }}</strong>
              <span>{{ medianSubline }}</span>
            </div>
          </div>
        </section>

        <section class="scout-form__block">
          <h3 class="scout-form__question">Next, what type of property?</h3>
          <div class="scout-form__option-grid">
            <button
              type="button"
              class="scout-form__option"
              :class="{ 'is-active': draftConfig.propertyType === 'apartment' }"
              :aria-pressed="draftConfig.propertyType === 'apartment'"
              @click="draftConfig.propertyType = 'apartment'"
            >
              <span class="scout-form__option-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M3 21h18" />
                  <path d="M5 21V4a1 1 0 0 1 1-1h7a1 1 0 0 1 1 1v17" />
                  <path d="M14 9h4a1 1 0 0 1 1 1v11" />
                  <path d="M8 7h3M8 11h3M8 15h3" />
                </svg>
              </span>
              <span class="scout-form__option-copy">
                <strong>Apartment</strong>
                <span>Rank by apartment medians, growth and rental yield.</span>
              </span>
              <span class="scout-form__radio" aria-hidden="true"></span>
            </button>

            <button
              type="button"
              class="scout-form__option"
              :class="{ 'is-active': draftConfig.propertyType === 'house' }"
              :aria-pressed="draftConfig.propertyType === 'house'"
              @click="draftConfig.propertyType = 'house'"
            >
              <span class="scout-form__option-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M3 10.5 12 3l9 7.5" />
                  <path d="M5.5 9.5V21h13V9.5" />
                  <path d="M10 21v-5.5h4V21" />
                </svg>
              </span>
              <span class="scout-form__option-copy">
                <strong>House</strong>
                <span>Rank by house medians, growth and rental yield.</span>
              </span>
              <span class="scout-form__radio" aria-hidden="true"></span>
            </button>
          </div>
        </section>

        <section class="scout-form__block">
          <h3 class="scout-form__question">Where should we look?</h3>
          <div class="scout-form__option-grid">
            <button
              type="button"
              class="scout-form__option"
              :class="{ 'is-active': locationPreference === 'broad' }"
              :aria-pressed="locationPreference === 'broad'"
              @click="selectLocationPreference('broad')"
            >
              <span class="scout-form__option-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M9 4 3 6.5v13L9 17l6 2.5 6-2.5v-13L15 6.5 9 4z" />
                  <path d="M9 4v13M15 6.5v13" />
                </svg>
              </span>
              <span class="scout-form__option-copy">
                <strong>All of NSW</strong>
                <span>Rank every individual suburb across the state.</span>
              </span>
              <span class="scout-form__radio" aria-hidden="true"></span>
            </button>

            <button
              type="button"
              class="scout-form__option"
              :class="{ 'is-active': locationPreference === 'specific' }"
              :aria-pressed="locationPreference === 'specific'"
              @click="selectLocationPreference('specific')"
            >
              <span class="scout-form__option-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M12 21s7-5.6 7-11a7 7 0 1 0-14 0c0 5.4 7 11 7 11z" />
                  <circle cx="12" cy="10" r="2.6" />
                </svg>
              </span>
              <span class="scout-form__option-copy">
                <strong>One region</strong>
                <span>Rank only the suburbs inside a region you pick.</span>
              </span>
              <span class="scout-form__radio" aria-hidden="true"></span>
            </button>
          </div>

          <Transition name="wealth-scout-reveal">
            <label v-if="locationPreference === 'specific'" class="scout-form__field">
              <span>Preferred region</span>
              <select v-model="draftConfig.locationKey">
                <option v-for="option in regionOptions" :key="option.key" :value="option.key">{{ option.label }}</option>
              </select>
            </label>
          </Transition>
        </section>

        <section class="scout-form__block">
          <h3 class="scout-form__question">
            <span class="wealth-scout__metric-label">
              What matters most to you?
              <span
                class="wealth-scout__metric-tooltip"
                tabindex="0"
                data-tooltip="Growth ranks suburbs on projected capital gains. Yield ranks them on projected rental return. Anywhere in between blends the two."
                aria-label="How is the growth and yield balance used?"
              >i</span>
            </span>
          </h3>
          <p class="scout-form__hint">Balance growth potential against rental return.</p>

          <div class="scout-form__balance">
            <div class="scout-form__balance-side">
              <strong>Growth</strong>
              <span>Capital growth focused</span>
            </div>
            <div class="scout-form__balance-track">
              <span class="scout-form__balance-flag" :style="rankingFlagStyle">{{ rankingPreferenceLabel }}</span>
              <input
                v-model.number="draftConfig.rentalYieldWeight"
                class="scout-form__slider"
                type="range"
                aria-label="Balance growth against rental yield"
                :style="rankingSliderStyle"
                min="0"
                max="1"
                step="0.05"
              />
            </div>
            <div class="scout-form__balance-side scout-form__balance-side--end">
              <strong>Yield</strong>
              <span>Rental yield focused</span>
            </div>
          </div>
        </section>

        <section class="scout-form__block">
          <h3 class="scout-form__question">
            <span class="wealth-scout__metric-label">
              Risk tolerance
              <span
                class="wealth-scout__metric-tooltip"
                tabindex="0"
                data-tooltip="Lower settings favour suburbs with more consistent projected outcomes. Higher settings accept greater volatility in pursuit of stronger returns."
                aria-label="How is risk tolerance used?"
              >i</span>
            </span>
          </h3>
          <p class="scout-form__hint">Choose how strongly projected volatility should influence the ranking.</p>

          <div class="scout-form__balance scout-form__balance--risk">
            <div class="scout-form__balance-side">
              <strong>Lower tolerance</strong>
              <span>Prioritise stability</span>
            </div>
            <div class="scout-form__balance-track scout-form__balance-track--risk">
              <span class="scout-form__balance-flag" :style="riskFlagStyle">{{ riskAppetiteLabel }}</span>
              <input
                v-model.number="riskAppetiteIndex"
                class="scout-form__slider"
                type="range"
                aria-label="Risk tolerance from 1 to 10"
                :style="riskSliderStyle"
                min="1"
                max="10"
                step="1"
              />
              <div class="scout-form__risk-scale" aria-hidden="true">
                <span v-for="level in 10" :key="level">{{ level }}</span>
              </div>
            </div>
            <div class="scout-form__balance-side scout-form__balance-side--end">
              <strong>Higher tolerance</strong>
              <span>Accept more volatility</span>
            </div>
          </div>
        </section>

        <footer class="scout-form__summary">
          <div>
            <span>Search scope</span>
            <strong>{{ searchScopeLabel }}</strong>
          </div>
          <div>
            <span>Budget</span>
            <strong>{{ formatCurrency(budgetUi) }}</strong>
          </div>
          <div>
            <span>Ranking</span>
            <strong>{{ rankingPreferenceLabel }} &middot; risk tolerance {{ riskAppetiteLabel }}</strong>
          </div>
        </footer>
      </div>
    </section>

    <section v-else class="wealth-scout__panel">
      <div v-if="isCalculating" class="wealth-scout__loading">
        <p class="wealth-scout__eyebrow">Searching the market</p>
        <h3>Ranking the best suburbs</h3>
        <p>Comparing expected growth, rental yield, and volatility for your current settings.</p>
        <div class="wealth-scout__loading-spinner" aria-hidden="true"></div>
      </div>

      <template v-else>
        <div class="wealth-scout__question-head wealth-scout__question-head--results">
          <div>
            <h3>
              {{
                resultsViewMode === 'map'
                  ? `${mapRecommendations.length} scored suburbs across NSW`
                  : filteredResultsModel.totalMatches
                    ? `${filteredResultsModel.totalMatches} matching suburbs`
                    : 'No matches yet'
              }}
            </h3>
          </div>
          <p v-if="resultsViewMode === 'map'">
            The map always shows every scored suburb, regardless of budget or price. Grey areas do not have enough market data to score.
          </p>
          <p v-else>
            Each result shows today's median, the expected annual growth, yield, and volatility. Open a result for the deeper projection view.
          </p>
        </div>

        <div class="wealth-scout__view-switch" aria-label="Choose results view">
          <button
            type="button"
            :class="{ 'is-active': resultsViewMode === 'list' }"
            :aria-pressed="resultsViewMode === 'list'"
            @click="resultsViewMode = 'list'"
          >
            List view
          </button>
          <button
            type="button"
            :class="{ 'is-active': resultsViewMode === 'map' }"
            :aria-pressed="resultsViewMode === 'map'"
            @click="resultsViewMode = 'map'"
          >
            Map view
          </button>
        </div>

        <div v-if="resultsViewMode === 'list'" class="wealth-scout__results-filters">
          <div class="wealth-scout__results-filters-head">
            <div>
              <h4>Results filter</h4>
            </div>
            <span>{{ filteredResultsModel.totalMatches }} matches</span>
          </div>

          <div class="wealth-scout__filter-toggle-group">
            <button type="button" class="wealth-scout__filter-chip" :class="{ 'is-active': resultFilters.mode === 'budget' }" @click="setResultsMode('budget')">
              Within my budget ({{ formatCurrency(appliedConfig.budget) }})
            </button>
            <button type="button" class="wealth-scout__filter-chip" :class="{ 'is-active': resultFilters.mode === 'all' }" @click="setResultsMode('all')">
              Any price
            </button>
          </div>

          <div v-if="resultFilters.mode === 'all'" class="wealth-scout__price-filter">
            <div class="wealth-scout__price-slider-shell" :style="priceSelectionStyle">
              <div class="wealth-scout__histogram">
                <div class="wealth-scout__histogram-bars">
                  <div v-for="(bin, index) in priceHistogramBins" :key="`bin-${index}`" class="wealth-scout__histogram-bar" :style="{ height: `${bin.height}%` }"></div>
                </div>
              </div>
              <div class="wealth-scout__range-track">
                <div class="wealth-scout__range-track-base"></div>
                <div class="wealth-scout__range-track-active"></div>
                <input v-model.number="draftMinPrice" class="wealth-scout__range-input wealth-scout__range-input--min" type="range" :min="resultPriceBounds.min" :max="resultPriceBounds.max" :step="resultPriceBounds.step" />
                <input v-model.number="draftMaxPrice" class="wealth-scout__range-input wealth-scout__range-input--max" type="range" :min="resultPriceBounds.min" :max="resultPriceBounds.max" :step="resultPriceBounds.step" />
              </div>
            </div>

            <div class="wealth-scout__price-input-grid">
              <label class="wealth-scout__price-field-box">
                <span>Min price</span>
                <div class="wealth-scout__price-field-value" data-prefix="$">
                  <input
                    :value="formattedDraftMinPrice"
                    type="text"
                    inputmode="numeric"
                    autocomplete="off"
                    @input="handlePriceTextInput('min', $event)"
                  />
                </div>
              </label>
              <label class="wealth-scout__price-field-box">
                <span>Max price</span>
                <div class="wealth-scout__price-field-value" data-prefix="$">
                  <input
                    :value="formattedDraftMaxPrice"
                    type="text"
                    inputmode="numeric"
                    autocomplete="off"
                    @input="handlePriceTextInput('max', $event)"
                  />
                </div>
              </label>
            </div>
          </div>
        </div>

        <label v-if="resultsViewMode === 'list'" class="wealth-scout__results-search">
          <input
            v-model.trim="resultFilters.searchQuery"
            type="search"
            placeholder="Search a suburb name"
          />
        </label>

        <WealthRegionScoutMap
          v-if="resultsViewMode === 'map' && mapRecommendations.length"
          :recommendations="mapRecommendations"
          :property-type-label="propertyTypeLabel"
          :score-bounds="relativeScoreBounds"
        />

        <div v-else-if="filteredResultsModel.hasRecommendations" class="wealth-scout__results">
          <article v-for="recommendation in visibleRecommendations" :key="recommendation.key" class="wealth-scout__result-card" :class="{ 'is-expanded': activeResultKey === recommendation.key }">
            <button type="button" class="wealth-scout__result-main" @click="toggleResult(recommendation.key)">
              <div class="wealth-scout__result-rank">#{{ recommendation.rank }}</div>
              <div class="wealth-scout__result-copy">
                <div class="wealth-scout__result-head">
                  <div>
                    <h4>{{ recommendation.label }}</h4>
                    <p>Suburb<template v-if="recommendation.regionLabel && recommendation.regionLabel !== recommendation.label"> | {{ recommendation.regionLabel }}</template></p>
                  </div>
                  <strong>{{ formatRelativeResultScore(recommendation) }}/10</strong>
                </div>

                <div class="wealth-scout__result-metrics">
                  <div>
                    <span>Median {{ propertyTypeLabel.toLowerCase() }} price</span>
                    <strong>{{ formatCurrency(recommendation.priceToday) }}</strong>
                  </div>
                  <div>
                    <span>Against your budget</span>
                    <strong>{{ formatBudgetGap(recommendation) }}</strong>
                  </div>
                  <div>
                    <span>Expected annual growth</span>
                    <strong>{{ formatPercent(recommendation.expectedAnnualGrowth) }}</strong>
                  </div>
                  <div>
                    <span>Expected rental yield</span>
                    <strong>{{ formatPercent(recommendation.expectedAnnualYield) }}</strong>
                  </div>
                  <div>
                    <span>Expected value in 10 years</span>
                    <strong>{{ formatCurrency(recommendation.expectedValueInTenYears) }}</strong>
                  </div>
                  <div>
                    <span>Avg yearly sales</span>
                    <strong>{{ formatGroupedNumber(recommendation.salesAverage) }}</strong>
                  </div>
                  <div>
                    <span>Growth volatility</span>
                    <strong>{{ formatPercent(recommendation.growthVolatility) }}</strong>
                  </div>
                  <div>
                    <span>Yield volatility</span>
                    <strong>{{ formatPercent(recommendation.yieldVolatility) }}</strong>
                  </div>
                </div>
              </div>
              <span class="wealth-scout__result-toggle" :class="{ 'is-open': activeResultKey === recommendation.key }" aria-hidden="true"></span>
            </button>

            <Transition name="wealth-scout-reveal">
              <div v-if="activeResultKey === recommendation.key" class="wealth-scout__detail">
                <div class="wealth-scout__charts wealth-scout__charts--stacked">
                  <WealthPropertyTrendChart :title="`Historical ${propertyTypeLabel.toLowerCase()} price`" color="#0f766e" :actual-points="recommendation.actualPoints" :trend-points="recommendation.trendPoints" :estimate-point="recommendation.estimatePoint" />
                  <WealthPropertyTrendChart
                    title="Historical rental yield"
                    kicker="Yield history"
                    color="#0f766e"
                    value-mode="percent"
                    :value-padding="0.005"
                    empty-text="No rental-yield history available for this property type."
                    actual-legend-label="Actual yearly yield"
                    trend-legend-label="Long-run yield mean"
                    estimate-legend-label="Current estimate"
                    :actual-points="recommendation.yieldActualPoints"
                    :trend-points="recommendation.yieldTrendPoints"
                    :estimate-point="null"
                  />
                  <WealthLineChart :title="`${propertyTypeLabel} price Monte Carlo`" subtitle="P25 / P50 / P75 projection for the next 30 years." kicker="Forward market path" :series="buildMonteCarloChartSeries(recommendation)" />
                </div>
              </div>
            </Transition>
          </article>
        </div>

        <div v-if="filteredResultsModel.hasRecommendations && resultsViewMode === 'list' && canLoadMoreResults" class="wealth-scout__results-more">
          <button type="button" class="wealth-scout__load-more-btn" @click="loadMoreResults">
            Show 10 more
          </button>
        </div>

        <div v-if="resultsViewMode === 'list' && !filteredResultsModel.hasRecommendations" class="wealth-scout__empty">
          <h4>No results match those settings</h4>
          <p>Raise your budget, widen the price range, or search across all of NSW instead of one region.</p>
        </div>
      </template>
    </section>
  </section>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import WealthLineChart from './WealthLineChart.vue'
import WealthPropertyTrendChart from './WealthPropertyTrendChart.vue'
import WealthRegionScoutMap from './WealthRegionScoutMap.vue'
import { buildRegionScoutResultsModel, normaliseRegionScoutConfig } from '../../wealth/regionScout.js'

const props = defineProps({
  view: {
    type: String,
    default: 'inputs'
  },
  scoutConfig: {
    type: Object,
    required: true
  },
  suburbSearchContext: {
    type: Object,
    default: () => ({ areasByKey: {}, areaOptions: [] })
  }
})

const emit = defineEmits(['loading-change'])

const budgetSliderBounds = { min: 200000, max: 3000000, step: 10000 }
const riskToleranceBounds = { min: 1, max: 10 }

const activeResultKey = ref(null)
const resultsViewMode = ref('list')
const draftConfig = reactive(normaliseRegionScoutConfig(props.scoutConfig))
const budgetUi = ref(draftConfig.budget)
const locationPreference = ref(draftConfig.locationKey ? 'specific' : 'broad')
const isCalculating = ref(props.view === 'results')
const calculationToken = ref(0)
const appliedConfig = ref(normaliseRegionScoutConfig(props.scoutConfig))
const resultsModel = ref(createEmptyResultsModel(appliedConfig.value))
const resultFilters = reactive({
  mode: 'budget',
  minPrice: 0,
  maxPrice: 0,
  searchQuery: ''
})
const draftMinPrice = ref(0)
const draftMaxPrice = ref(0)
const resultsVisibleCount = ref(10)
let priceCommitTimer = null
let budgetCommitTimer = null
let syncingConfig = false

const viewMode = computed(() => props.view === 'results' ? 'results' : 'inputs')

const regionOptions = computed(() =>
  (props.suburbSearchContext?.areaOptions || []).filter((option) => option.type === 'region')
)

const propertyTypeLabel = computed(() =>
  draftConfig.propertyType === 'house' ? 'House' : 'Apartment'
)
const formattedBudget = computed(() => formatGroupedNumber(budgetUi.value))
// Size the field to its own digits so the "$" never floats away from the number.
const budgetInputStyle = computed(() => ({
  width: `${Math.max(1, formattedBudget.value.length)}ch`
}))
const budgetSliderStyle = computed(() => ({
  '--fill': `${toSliderFillPercent(budgetUi.value, budgetSliderBounds.min, budgetSliderBounds.max)}%`
}))
const budgetScaleTicks = computed(() => {
  const span = budgetSliderBounds.max - budgetSliderBounds.min
  return Array.from({ length: 5 }, (_unused, index) => {
    const value = budgetSliderBounds.min + ((span / 4) * index)
    return {
      value,
      label: index === 4 ? `${formatCompactCurrency(value)}+` : formatCompactCurrency(value)
    }
  })
})

const suburbPrices = computed(() =>
  Object.values(props.suburbSearchContext?.areasByKey || {})
    .filter((area) => area?.type === 'suburb')
    .map((area) => {
      const property = area?.[draftConfig.propertyType]
      return Math.max(0, Number(property?.currentPriceEstimate ?? property?.latestActualPrice) || 0)
    })
    .filter((price) => price > 0)
)
const medianSuburbPrice = computed(() => calculateMedian(suburbPrices.value))
const suburbsWithinBudget = computed(() =>
  suburbPrices.value.filter((price) => price <= budgetUi.value).length
)
const medianHeadline = computed(() =>
  medianSuburbPrice.value > 0
    ? `NSW median ${propertyTypeLabel.value.toLowerCase()} price is ~${formatCompactCurrency(medianSuburbPrice.value)}`
    : `No ${propertyTypeLabel.value.toLowerCase()} medians loaded yet`
)
const medianSubline = computed(() => {
  if (!suburbPrices.value.length) return 'Suburb medians will appear once the market data loads.'
  const comparison = budgetUi.value >= medianSuburbPrice.value ? 'at or above' : 'below'
  return `Your budget is ${comparison} the state median. ${formatGroupedNumber(suburbsWithinBudget.value)} of ${formatGroupedNumber(suburbPrices.value.length)} suburbs sit within it.`
})

const rankingSliderStyle = computed(() => ({
  '--fill': `${toSliderFillPercent(draftConfig.rentalYieldWeight, 0, 1)}%`
}))
const rankingFlagStyle = computed(() => buildFlagStyle(toSliderFillPercent(draftConfig.rentalYieldWeight, 0, 1)))

const riskAppetiteIndex = computed({
  get: () => clampToRange(draftConfig.riskAppetite, riskToleranceBounds.min, riskToleranceBounds.max),
  set: (value) => {
    draftConfig.riskAppetite = clampToRange(value, riskToleranceBounds.min, riskToleranceBounds.max)
  }
})
const riskAppetiteLabel = computed(() => `${riskAppetiteIndex.value} / ${riskToleranceBounds.max}`)
const riskSliderStyle = computed(() => ({
  '--fill': `${toSliderFillPercent(riskAppetiteIndex.value, riskToleranceBounds.min, riskToleranceBounds.max)}%`
}))
const riskFlagStyle = computed(() => buildFlagStyle(
  toSliderFillPercent(riskAppetiteIndex.value, riskToleranceBounds.min, riskToleranceBounds.max)
))

const searchScopeLabel = computed(() => {
  if (locationPreference.value === 'specific') {
    const match = regionOptions.value.find((option) => option.key === draftConfig.locationKey)
    return match?.label ? `Suburbs in ${match.label}` : 'Pick a region'
  }
  return 'All NSW suburbs'
})
const resultPriceBounds = computed(() => buildResultPriceBounds(resultsModel.value.allRecommendations))
const filteredResultsModel = computed(() => buildFilteredResultsModel(resultsModel.value, resultFilters))
const formattedDraftMinPrice = computed(() => formatGroupedNumber(draftMinPrice.value))
const formattedDraftMaxPrice = computed(() => formatGroupedNumber(draftMaxPrice.value))
const visibleRecommendations = computed(() => filteredResultsModel.value.recommendations.slice(0, resultsVisibleCount.value))
const canLoadMoreResults = computed(() => visibleRecommendations.value.length < filteredResultsModel.value.totalMatches)
const mapRecommendations = computed(() =>
  (resultsModel.value.scoreReferenceRecommendations || resultsModel.value.allRecommendations || [])
    .map((recommendation, index) => ({
      ...recommendation,
      rank: index + 1
    }))
)
const priceHistogramBins = computed(() => buildPriceHistogramBins(resultsModel.value.allRecommendations, resultPriceBounds.value))
const priceSelectionStyle = computed(() => buildPriceSelectionStyle({
  minPrice: draftMinPrice.value,
  maxPrice: draftMaxPrice.value
}, resultPriceBounds.value))
const relativeScoreBounds = computed(() => buildRelativeScoreBounds(
  resultsModel.value.scoreReferenceRecommendations || resultsModel.value.allRecommendations
))

const rankingPreferenceLabel = computed(() => {
  const yieldWeight = Math.round((draftConfig.rentalYieldWeight || 0) * 100)
  if (yieldWeight === 0) return 'Growth only'
  if (yieldWeight === 100) return 'Yield only'
  if (yieldWeight === 50) return 'Balanced'
  return `${100 - yieldWeight}% growth / ${yieldWeight}% yield`
})

watch(resultsModel, (nextModel) => {
  syncResultFiltersForNewResults(nextModel)
}, { immediate: true, deep: true })

watch(isCalculating, (value) => {
  emit('loading-change', value)
}, { immediate: true })

watch(visibleRecommendations, (nextRecommendations) => {
  if (!nextRecommendations.some((item) => item.key === activeResultKey.value)) {
    activeResultKey.value = null
  }
}, { immediate: true, deep: true })

watch(() => [
  resultFilters.mode,
  resultFilters.minPrice,
  resultFilters.maxPrice,
  resultFilters.searchQuery,
  resultsModel.value.allRecommendations.length
], () => {
  resultsVisibleCount.value = 10
}, { immediate: true })

watch(draftMinPrice, (minPrice) => {
  const clampedMin = clampToRange(minPrice, resultPriceBounds.value.min, resultPriceBounds.value.max)
  if (clampedMin !== minPrice) {
    draftMinPrice.value = clampedMin
    return
  }
  if (clampedMin > draftMaxPrice.value) {
    draftMaxPrice.value = clampedMin
  }
  schedulePriceFilterCommit()
})

watch(draftMaxPrice, (maxPrice) => {
  const clampedMax = clampToRange(maxPrice, resultPriceBounds.value.min, resultPriceBounds.value.max)
  if (clampedMax !== maxPrice) {
    draftMaxPrice.value = clampedMax
    return
  }
  if (clampedMax < draftMinPrice.value) {
    draftMinPrice.value = clampedMax
  }
  schedulePriceFilterCommit()
})

watch(() => props.scoutConfig, (nextConfig) => {
  syncingConfig = true
  Object.assign(draftConfig, normaliseRegionScoutConfig(nextConfig))
  budgetUi.value = draftConfig.budget
  locationPreference.value = draftConfig.locationKey ? 'specific' : 'broad'
  syncingConfig = false
}, { deep: true })

watch(budgetUi, () => {
  scheduleBudgetCommit()
})

watch(draftConfig, () => {
  if (viewMode.value !== 'inputs' || syncingConfig) return
  commitDraftConfig()
}, { deep: true })

onMounted(() => {
  if (viewMode.value === 'results') {
    void calculateResults()
    return
  }
  commitDraftConfig()
})

onBeforeUnmount(() => {
  if (priceCommitTimer) window.clearTimeout(priceCommitTimer)
  if (budgetCommitTimer) window.clearTimeout(budgetCommitTimer)
})

function selectLocationPreference(mode) {
  locationPreference.value = mode === 'specific' ? 'specific' : 'broad'
  if (locationPreference.value !== 'specific') {
    draftConfig.locationKey = null
    return
  }
  // Default to a real region so the search is always runnable once this card is picked.
  if (!draftConfig.locationKey) {
    draftConfig.locationKey = regionOptions.value[0]?.key || null
  }
}

function handleBudgetTextInput(event) {
  const digitsOnly = String(event?.target?.value || '').replace(/[^\d]/g, '')
  budgetUi.value = digitsOnly ? Number(digitsOnly) : 0
}

function scheduleBudgetCommit() {
  if (budgetCommitTimer) window.clearTimeout(budgetCommitTimer)
  budgetCommitTimer = window.setTimeout(() => {
    budgetCommitTimer = null
    flushPendingBudgetCommit()
  }, 600)
}

function flushPendingBudgetCommit() {
  if (budgetCommitTimer) {
    window.clearTimeout(budgetCommitTimer)
    budgetCommitTimer = null
  }
  draftConfig.budget = normaliseRegionScoutConfig({ ...draftConfig, budget: budgetUi.value }).budget
}

function toggleResult(resultKey) {
  activeResultKey.value = activeResultKey.value === resultKey ? null : resultKey
}

function loadMoreResults() {
  resultsVisibleCount.value += 10
}

function handlePriceTextInput(boundary, event) {
  const rawValue = String(event?.target?.value || '')
  const digitsOnly = rawValue.replace(/[^\d]/g, '')
  const parsedValue = digitsOnly ? Number(digitsOnly) : 0

  if (boundary === 'min') {
    draftMinPrice.value = clampToRange(parsedValue, resultPriceBounds.value.min, draftMaxPrice.value)
    return
  }

  draftMaxPrice.value = clampToRange(parsedValue, draftMinPrice.value, resultPriceBounds.value.max)
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

function formatRelativeResultScore(recommendation) {
  const rawScore = Number(recommendation?.rankingScore)
  if (!Number.isFinite(rawScore)) return '0.0'
  const { min, max } = relativeScoreBounds.value
  if (!Number.isFinite(min) || !Number.isFinite(max)) return '0.0'
  if (Math.abs(max - min) < 1e-9) return '10.0'
  const relativeScore = ((rawScore - min) / (max - min)) * 10
  return clampToRange(relativeScore, 0, 10).toFixed(1)
}

function formatBudgetGap(recommendation) {
  const gap = Number(recommendation?.budgetGap) || 0
  if (gap === 0) return 'On budget'
  if (gap > 0) return `${formatCurrency(gap)} under`
  return `${formatCurrency(Math.abs(gap))} over`
}

async function calculateResults() {
  commitDraftConfig()
  const nextConfig = normaliseRegionScoutConfig(props.scoutConfig)
  const token = calculationToken.value + 1
  calculationToken.value = token
  isCalculating.value = true
  appliedConfig.value = nextConfig
  activeResultKey.value = null
  await nextTick()
  await waitForNextPaint()
  if (calculationToken.value !== token) return

  try {
    const nextResults = buildRegionScoutResultsModel({
      suburbSearchContext: props.suburbSearchContext,
      config: nextConfig
    })
    if (calculationToken.value !== token) return
    resultsModel.value = nextResults
  } finally {
    if (calculationToken.value === token) {
      isCalculating.value = false
    }
  }
}

function commitDraftConfig() {
  flushPendingBudgetCommit()
  Object.assign(props.scoutConfig, normaliseRegionScoutConfig(draftConfig))
}

function createEmptyResultsModel(config) {
  return {
    config,
    location: null,
    allRecommendations: [],
    scoreReferenceRecommendations: [],
    recommendations: [],
    totalMatches: 0,
    hasRecommendations: false
  }
}

function buildRelativeScoreBounds(recommendations = []) {
  const scores = recommendations
    .map((recommendation) => Number(recommendation?.rankingScore))
    .filter((score) => Number.isFinite(score))

  if (!scores.length) {
    return { min: 0, max: 0 }
  }

  return {
    min: Math.min(...scores),
    max: Math.max(...scores)
  }
}

function buildFilteredResultsModel(model, filters) {
  const rankedRecommendations = (model?.allRecommendations || []).filter((recommendation) => {
    if (filters.mode === 'all') return matchesPriceRange(recommendation, filters)
    return Boolean(recommendation?.withinBudget)
  }).map((recommendation, index) => ({
    ...recommendation,
    rank: index + 1
  }))
  const recommendations = rankedRecommendations.filter((recommendation) => matchesSearchQuery(recommendation, filters.searchQuery))

  return {
    ...model,
    recommendations,
    totalMatches: recommendations.length,
    hasRecommendations: recommendations.length > 0
  }
}

function buildResultPriceBounds(recommendations = []) {
  const prices = recommendations
    .map((recommendation) => Number(recommendation?.priceToday) || 0)
    .filter((price) => price > 0)

  if (!prices.length) {
    return { min: 0, max: 5_000_000, step: 10_000 }
  }

  const min = Math.floor(Math.min(...prices) / 10000) * 10000
  const max = Math.ceil(Math.max(...prices) / 10000) * 10000
  return {
    min,
    max: Math.max(max, min + 10000),
    step: 10_000
  }
}

function syncResultFiltersForNewResults(model) {
  const bounds = buildResultPriceBounds(model?.allRecommendations)
  resultFilters.mode = 'budget'
  resultFilters.minPrice = bounds.min
  resultFilters.maxPrice = bounds.max
  draftMinPrice.value = bounds.min
  draftMaxPrice.value = bounds.max
  if (priceCommitTimer) {
    clearTimeout(priceCommitTimer)
    priceCommitTimer = null
  }
}

function setResultsMode(mode) {
  resultFilters.mode = mode === 'all' ? 'all' : 'budget'
  if (resultFilters.mode === 'all') {
    draftMinPrice.value = resultFilters.minPrice
    draftMaxPrice.value = resultFilters.maxPrice
  }
}

function schedulePriceFilterCommit() {
  if (resultFilters.mode !== 'all') return
  if (priceCommitTimer) clearTimeout(priceCommitTimer)
  priceCommitTimer = setTimeout(() => {
    resultFilters.minPrice = draftMinPrice.value
    resultFilters.maxPrice = draftMaxPrice.value
    priceCommitTimer = null
  }, 120)
}

function matchesPriceRange(recommendation, filters) {
  const priceToday = Number(recommendation?.priceToday) || 0
  return priceToday >= filters.minPrice && priceToday <= filters.maxPrice
}

function matchesSearchQuery(recommendation, query) {
  const normalizedQuery = String(query || '').trim().toLowerCase()
  if (!normalizedQuery) return true

  const haystack = [
    recommendation?.label,
    recommendation?.regionLabel,
    recommendation?.type
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()

  return haystack.includes(normalizedQuery)
}

function buildPriceHistogramBins(recommendations = [], bounds = { min: 0, max: 0 }) {
  const binCount = 56
  const span = Math.max(1, (bounds.max || 0) - (bounds.min || 0))
  const bins = Array.from({ length: binCount }, () => 0)

  recommendations.forEach((recommendation) => {
    const price = Number(recommendation?.priceToday)
    if (!Number.isFinite(price)) return
    const ratio = (price - bounds.min) / span
    const index = Math.min(binCount - 1, Math.max(0, Math.floor(ratio * binCount)))
    bins[index] += 1
  })

  const maxCount = Math.max(...bins, 1)
  return bins.map((count) => ({
    count,
    height: count > 0 ? Math.max(10, (count / maxCount) * 100) : 0
  }))
}

function buildPriceSelectionStyle(filters, bounds) {
  const span = Math.max(1, (bounds.max || 0) - (bounds.min || 0))
  const start = (((filters.minPrice || 0) - bounds.min) / span) * 100
  const end = (((filters.maxPrice || 0) - bounds.min) / span) * 100
  const safeStart = Math.max(0, Math.min(100, start))
  const safeEnd = Math.max(0, Math.min(100, end))
  const safeWidth = Math.max(0, safeEnd - safeStart)
  return {
    '--range-start-ratio': `${safeStart / 100}`,
    '--range-end-ratio': `${safeEnd / 100}`,
    '--range-width-ratio': `${safeWidth / 100}`
  }
}

function toSliderFillPercent(value, min, max) {
  const span = Math.max(1e-9, (Number(max) || 0) - (Number(min) || 0))
  const ratio = ((Number(value) || 0) - (Number(min) || 0)) / span
  return Math.round(clampToRange(ratio, 0, 1) * 1000) / 10
}

function buildFlagStyle(fillPercent) {
  return {
    left: `${fillPercent}%`,
    // Nudge the flag back toward the track as it approaches either end so it never overhangs.
    transform: `translateX(calc(-50% + ${((50 - fillPercent) / 50) * 0.55}rem))`
  }
}

function calculateMedian(values = []) {
  if (!values.length) return 0
  const sorted = [...values].sort((left, right) => left - right)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2
    ? sorted[middle]
    : Math.round((sorted[middle - 1] + sorted[middle]) / 2)
}

function clampToRange(value, min, max) {
  return Math.min(max, Math.max(min, Number(value) || 0))
}

function formatGroupedNumber(value) {
  return new Intl.NumberFormat('en-AU', { maximumFractionDigits: 0 }).format(Number(value) || 0)
}

function formatCurrency(value) {
  return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 }).format(Number(value) || 0)
}

function formatCompactCurrency(value) {
  return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', notation: 'compact', maximumFractionDigits: 1 }).format(Number(value) || 0)
}

function formatPercent(value) {
  if (!Number.isFinite(Number(value))) return 'n/a'
  return `${(Number(value) * 100).toFixed(1)}% p.a.`
}

function waitForNextPaint() {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || typeof window.requestAnimationFrame !== 'function') {
      setTimeout(resolve, 0)
      return
    }
    window.requestAnimationFrame(() => window.requestAnimationFrame(resolve))
  })
}
</script>

<style scoped>
.wealth-scout {
  display: grid;
  gap: 1rem;
  padding: 1.3rem;
  background: linear-gradient(180deg, rgba(253, 254, 255, 0.96), rgba(243, 248, 255, 0.94));
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

/* The search form is its own card, so the surrounding shell stays invisible. */
.wealth-scout--bare {
  padding: 0;
  background: transparent;
}

.wealth-scout__panel--form {
  min-height: 0;
  padding: 0;
}

/* ---------- Search form ---------- */

.scout-form {
  --scout-accent: #2563eb;
  --scout-ink: #12233c;
  --scout-muted: #64748b;
  --scout-line: rgba(148, 163, 184, 0.24);
  display: grid;
  gap: 0;
  width: min(100%, var(--wealth-scout-max, 64rem));
  margin-inline: auto;
  padding: clamp(1.4rem, 1rem + 1.6vw, 2.6rem);
  border-radius: 26px;
  border: 1px solid rgba(165, 184, 213, 0.3);
  background: #ffffff;
  box-shadow: 0 24px 52px rgba(71, 109, 154, 0.12);
}

.scout-form__head {
  display: grid;
  gap: 0.4rem;
  padding-bottom: 1.6rem;
}

.scout-form__eyebrow {
  margin: 0;
  text-transform: uppercase;
  letter-spacing: 0.16em;
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--scout-accent);
}

.scout-form__head h2 {
  margin: 0.1rem 0 0;
  font-size: clamp(1.9rem, 1.5rem + 1.5vw, 2.85rem);
  line-height: 1.02;
  letter-spacing: -0.04em;
  color: var(--scout-ink);
}

.scout-form__lede {
  margin: 0.15rem 0 0;
  max-width: 32rem;
  color: var(--scout-muted);
  line-height: 1.6;
}

.scout-form__block {
  display: grid;
  gap: 0.85rem;
  padding: 1.5rem 0;
  border-top: 1px solid var(--scout-line);
}

.scout-form__question {
  margin: 0;
  font-size: 1.02rem;
  font-weight: 600;
  line-height: 1.3;
  color: var(--scout-ink);
}

.scout-form__hint {
  margin: -0.55rem 0 0;
  color: var(--scout-muted);
  font-size: 0.88rem;
  line-height: 1.5;
}

/* Budget */

.scout-form__budget-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 1rem;
  margin-bottom: 0.15rem;
}

.scout-form__budget-value {
  display: flex;
  align-items: baseline;
  color: var(--scout-ink);
}

.scout-form__budget-value::before {
  content: attr(data-prefix);
  font-size: clamp(1.4rem, 1.1rem + 1vw, 1.85rem);
  font-weight: 700;
  letter-spacing: -0.03em;
}

.scout-form__budget-value input {
  min-height: 0;
  padding: 0;
  border: 0;
  border-radius: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  font-size: clamp(1.4rem, 1.1rem + 1vw, 1.85rem);
  font-weight: 700;
  letter-spacing: -0.03em;
  text-align: left;
  box-shadow: none;
  appearance: none;
}

.scout-form__budget-value input:focus {
  outline: none;
  color: var(--scout-accent);
}

.scout-form__scale {
  display: flex;
  justify-content: space-between;
  gap: 0.5rem;
  margin-top: -0.35rem;
  color: #94a3b8;
  font-size: 0.76rem;
}

.scout-form__callout {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  margin-top: 0.35rem;
  padding: 0.85rem 1rem;
  border-radius: 16px;
  border: 1px solid var(--scout-line);
  background: #f8fafc;
}

.scout-form__callout-icon {
  display: grid;
  place-items: center;
  flex: 0 0 auto;
  width: 2.2rem;
  height: 2.2rem;
  border-radius: 12px;
  background: color-mix(in srgb, var(--scout-accent) 12%, white);
  color: var(--scout-accent);
}

.scout-form__callout-icon svg {
  width: 1.1rem;
  height: 1.1rem;
}

.scout-form__callout-copy {
  display: grid;
  gap: 0.12rem;
  min-width: 0;
}

.scout-form__callout-copy strong {
  color: var(--scout-ink);
  font-size: 0.9rem;
  font-weight: 600;
}

.scout-form__callout-copy span {
  color: var(--scout-muted);
  font-size: 0.82rem;
  line-height: 1.45;
}

/* Option cards */

.scout-form__option-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.85rem;
}

.scout-form__option {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 0.85rem;
  padding: 1rem;
  border-radius: 18px;
  border: 1.5px solid rgba(165, 184, 213, 0.4);
  background: #ffffff;
  color: var(--scout-ink);
  text-align: left;
  font: inherit;
  cursor: pointer;
  transition: border-color 140ms ease, background 140ms ease, box-shadow 140ms ease, transform 140ms ease;
}

.scout-form__option:hover {
  transform: translateY(-1px);
  border-color: color-mix(in srgb, var(--scout-accent) 34%, rgba(165, 184, 213, 0.4));
}

.scout-form__option.is-active {
  border-color: var(--scout-accent);
  background: color-mix(in srgb, var(--scout-accent) 5%, white);
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--scout-accent) 26%, transparent);
}

.scout-form__option-icon {
  display: grid;
  place-items: center;
  width: 2.6rem;
  height: 2.6rem;
  border-radius: 14px;
  background: #f1f5f9;
  color: #64748b;
  transition: background 140ms ease, color 140ms ease;
}

.scout-form__option.is-active .scout-form__option-icon {
  background: color-mix(in srgb, var(--scout-accent) 12%, white);
  color: var(--scout-accent);
}

.scout-form__option-icon svg {
  width: 1.35rem;
  height: 1.35rem;
}

.scout-form__option-copy {
  display: grid;
  gap: 0.18rem;
  min-width: 0;
}

.scout-form__option-copy strong {
  font-size: 0.98rem;
  font-weight: 600;
  line-height: 1.2;
}

.scout-form__option-copy span {
  color: var(--scout-muted);
  font-size: 0.82rem;
  line-height: 1.4;
}

.scout-form__radio {
  width: 1.15rem;
  height: 1.15rem;
  border-radius: 999px;
  border: 1.5px solid rgba(148, 163, 184, 0.6);
  background: #ffffff;
  transition: border-color 140ms ease, box-shadow 140ms ease, background 140ms ease;
}

.scout-form__option.is-active .scout-form__radio {
  border-color: var(--scout-accent);
  background: var(--scout-accent);
  box-shadow: inset 0 0 0 3px #ffffff;
}

.scout-form__field {
  display: grid;
  gap: 0.35rem;
  max-width: 24rem;
  color: var(--scout-muted);
  font-size: 0.82rem;
}

.scout-form__field select {
  width: 100%;
  min-height: 3rem;
  padding: 0.7rem 0.85rem;
  border-radius: 14px;
  border: 1px solid rgba(165, 184, 213, 0.44);
  background: #ffffff;
  color: var(--scout-ink);
  font: inherit;
}

.scout-form__field select:focus {
  outline: none;
  border-color: var(--scout-accent);
}

/* Balance sliders */

.scout-form__balance {
  display: grid;
  grid-template-columns: minmax(0, auto) minmax(8rem, 1fr) minmax(0, auto);
  align-items: center;
  gap: 1.1rem;
  padding: 1rem 1.15rem;
  border-radius: 18px;
  border: 1px solid var(--scout-line);
  background: #f8fafc;
}

.scout-form__balance-side {
  display: grid;
  gap: 0.1rem;
  max-width: 9rem;
}

.scout-form__balance-side--end {
  text-align: right;
  justify-items: end;
}

.scout-form__balance-side strong {
  color: var(--scout-ink);
  font-size: 0.92rem;
  font-weight: 600;
}

.scout-form__balance-side span {
  color: var(--scout-muted);
  font-size: 0.76rem;
  line-height: 1.35;
}

.scout-form__balance-track {
  position: relative;
  padding-top: 1.5rem;
}

.scout-form__balance-track--risk {
  padding-bottom: 1.25rem;
}

.scout-form__balance-flag {
  position: absolute;
  top: 0;
  white-space: nowrap;
  color: var(--scout-accent);
  font-size: 0.76rem;
  font-weight: 600;
}

.scout-form__risk-scale {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  display: flex;
  justify-content: space-between;
  color: #94a3b8;
  font-size: 0.65rem;
  line-height: 1;
  pointer-events: none;
}

/* Shared range styling */

.scout-form__slider {
  --fill: 50%;
  width: 100%;
  height: 1.2rem;
  margin: 0;
  padding: 0;
  background: transparent;
  border: 0;
  box-shadow: none;
  cursor: pointer;
  -webkit-appearance: none;
  appearance: none;
}

.scout-form__slider:focus-visible {
  outline: 2px solid color-mix(in srgb, var(--scout-accent) 55%, transparent);
  outline-offset: 4px;
  border-radius: 999px;
}

.scout-form__slider::-webkit-slider-runnable-track {
  height: 0.4rem;
  border-radius: 999px;
  background: linear-gradient(to right, var(--scout-accent) 0 var(--fill), #e2e8f0 var(--fill) 100%);
}

.scout-form__slider::-moz-range-track {
  height: 0.4rem;
  border-radius: 999px;
  background: linear-gradient(to right, var(--scout-accent) 0 var(--fill), #e2e8f0 var(--fill) 100%);
}

.scout-form__slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 1.15rem;
  height: 1.15rem;
  margin-top: -0.375rem;
  border-radius: 999px;
  border: 3px solid #ffffff;
  background: var(--scout-accent);
  box-shadow: 0 2px 8px rgba(37, 99, 235, 0.38);
}

.scout-form__slider::-moz-range-thumb {
  width: 1.15rem;
  height: 1.15rem;
  border-radius: 999px;
  border: 3px solid #ffffff;
  background: var(--scout-accent);
  box-shadow: 0 2px 8px rgba(37, 99, 235, 0.38);
}

/* Summary footer */

.scout-form__summary {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1rem;
  padding-top: 1.4rem;
  border-top: 1px solid var(--scout-line);
}

.scout-form__summary div {
  display: grid;
  gap: 0.2rem;
  min-width: 0;
}

.scout-form__summary span {
  color: #94a3b8;
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

.scout-form__summary strong {
  color: var(--scout-ink);
  font-size: 0.92rem;
  font-weight: 600;
  line-height: 1.35;
  overflow-wrap: anywhere;
}

/* ---------- Shared bits ---------- */

.wealth-scout__metric-label {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
}

.wealth-scout__metric-tooltip {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1rem;
  height: 1rem;
  border-radius: 999px;
  border: 1px solid rgba(93, 123, 163, 0.3);
  background: rgba(255, 255, 255, 0.82);
  color: #5d7ba3;
  font-size: 0.66rem;
  font-weight: 700;
  line-height: 1;
  cursor: help;
}

.wealth-scout__metric-tooltip::after {
  content: attr(data-tooltip);
  position: absolute;
  left: 50%;
  bottom: calc(100% + 10px);
  transform: translateX(-50%);
  width: max-content;
  max-width: min(320px, 72vw);
  padding: 0.65rem 0.75rem;
  border-radius: 0.85rem;
  background: rgba(11, 18, 32, 0.96);
  border: 1px solid rgba(148, 163, 184, 0.22);
  color: rgba(248, 250, 252, 0.94);
  font-size: 0.75rem;
  font-weight: 400;
  line-height: 1.35;
  letter-spacing: 0.01em;
  box-shadow: 0 14px 36px rgba(15, 23, 42, 0.28);
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  transition: opacity 0.16s ease, transform 0.16s ease, visibility 0s linear 0.16s;
  z-index: 30;
}

.wealth-scout__metric-tooltip::before {
  content: '';
  position: absolute;
  left: 50%;
  bottom: calc(100% + 4px);
  width: 0.62rem;
  height: 0.62rem;
  background: rgba(11, 18, 32, 0.96);
  border-left: 1px solid rgba(148, 163, 184, 0.22);
  border-top: 1px solid rgba(148, 163, 184, 0.22);
  transform: translateX(-50%) rotate(45deg);
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  transition: opacity 0.16s ease, visibility 0s linear 0.16s;
  z-index: 29;
}

.wealth-scout__metric-tooltip:hover::after,
.wealth-scout__metric-tooltip:focus-visible::after {
  opacity: 1;
  visibility: visible;
  transform: translateX(-50%) translateY(-2px);
  transition: opacity 0.16s ease, transform 0.16s ease, visibility 0s;
}

.wealth-scout__metric-tooltip:hover::before,
.wealth-scout__metric-tooltip:focus-visible::before {
  opacity: 1;
  visibility: visible;
  transition: opacity 0.16s ease, visibility 0s;
}

/* ---------- Results ---------- */

.wealth-scout__question-head,
.wealth-scout__result-head,
.wealth-scout__result-main,
.wealth-scout__result-metrics {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
}

.wealth-scout__eyebrow {
  margin: 0;
  text-transform: uppercase;
  letter-spacing: 0.16em;
  font-size: 0.74rem;
  color: #5d7ba3;
}

.wealth-scout__question-head h3,
.wealth-scout__result-head h4,
.wealth-scout__empty h4,
.wealth-scout__loading h3 {
  margin: 0.15rem 0 0;
  color: #173050;
}

.wealth-scout__question-head p,
.wealth-scout__result-head p,
.wealth-scout__empty p,
.wealth-scout__loading p {
  margin: 0;
  color: #5d7394;
  line-height: 1.55;
}

.wealth-scout__charts,
.wealth-scout__results {
  display: grid;
  gap: 0.85rem;
  min-width: 0;
}

.wealth-scout__question-head {
  position: relative;
  display: grid;
  justify-items: start;
  text-align: left;
  gap: 0.45rem;
  width: min(100%, 70rem);
  min-height: 0;
  padding: 0;
  margin: 0 auto;
  align-content: start;
}

.wealth-scout__question-head--results {
  align-items: center;
}

.wealth-scout__view-switch {
  display: inline-grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  width: min(100%, 20rem);
  margin: 0 auto;
  padding: 0.3rem;
  border: 1px solid rgba(148, 163, 184, 0.24);
  border-radius: 14px;
  background: #edf2f7;
}

.wealth-scout__view-switch button {
  min-height: 2.65rem;
  padding: 0.6rem 0.9rem;
  border: 0;
  border-radius: 10px;
  background: transparent;
  color: #64748b;
  font: inherit;
  font-size: 0.84rem;
  font-weight: 650;
  cursor: pointer;
  transition: color 140ms ease, background 140ms ease, box-shadow 140ms ease;
}

.wealth-scout__view-switch button.is-active {
  background: #fff;
  color: #173050;
  box-shadow: 0 2px 8px rgba(15, 23, 42, 0.08);
}

.wealth-scout__charts {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.wealth-scout__results-filters {
  display: grid;
  gap: 1rem;
  width: min(100%, 70rem);
  margin: 0 auto;
  padding: 1.1rem;
  border-radius: 22px;
  border: 1px solid rgba(154, 174, 204, 0.16);
  background: rgba(247, 250, 255, 0.92);
}

.wealth-scout__results-filters-head {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: end;
}

.wealth-scout__results-filters-head h4 {
  margin: 0.2rem 0 0;
  color: #173050;
}

.wealth-scout__filter-toggle-group,
.wealth-scout__price-input-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.8rem;
}

.wealth-scout__filter-chip,
.wealth-scout__price-input-grid label {
  display: grid;
  gap: 0.45rem;
}

.wealth-scout__filter-chip {
  min-height: 4rem;
  padding: 0.95rem 1rem;
  border: 1px solid rgba(154, 174, 204, 0.18);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.96);
  color: #173050;
  font: inherit;
  text-align: center;
  cursor: pointer;
}

.wealth-scout__filter-chip.is-active {
  border-color: rgba(37, 99, 235, 0.28);
  background: rgba(232, 242, 255, 0.96);
}

.wealth-scout__price-input-grid label {
  color: #5b7192;
  font-size: 0.84rem;
}

.wealth-scout__price-filter {
  display: grid;
  gap: 0.6rem;
}

.wealth-scout__results-search {
  display: grid;
  gap: 0.4rem;
  width: min(100%, 70rem);
  margin: 0.35rem auto 0;
}

.wealth-scout__results-search input {
  min-height: 3.5rem;
  padding: 0.95rem 1rem;
  border: 1px solid rgba(154, 174, 204, 0.22);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.98);
  color: #173050;
  font: inherit;
  box-shadow: none;
}

.wealth-scout__results-search input:focus {
  outline: none;
  border-color: rgba(23, 48, 80, 0.42);
}

.wealth-scout__price-slider-shell {
  position: relative;
  display: grid;
  gap: 0;
  width: 100%;
}

.wealth-scout__histogram {
  position: relative;
  z-index: 1;
  height: 4.08rem;
  padding: 0 0.35rem;
  overflow: hidden;
}

.wealth-scout__histogram-bars {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: repeat(56, minmax(0, 1fr));
  align-items: end;
  gap: 2px;
  height: 100%;
  transform: translateY(0.44rem);
}

.wealth-scout__histogram-bar {
  position: relative;
  z-index: 1;
  border-radius: 0;
  background: rgba(154, 174, 204, 0.7);
  min-height: 0;
}

.wealth-scout__range-track {
  --range-pad: 0.35rem;
  --range-thumb-size: 1.2rem;
  --range-usable-width: calc(100% - (var(--range-pad) * 2) - var(--range-thumb-size));
  position: relative;
  z-index: 2;
  height: 1.6rem;
  margin-top: -0.58rem;
  padding: 0 var(--range-pad);
}

.wealth-scout__range-track-base,
.wealth-scout__range-track-active {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  height: 0.4rem;
  border-radius: 999px;
}

.wealth-scout__range-track-base {
  left: var(--range-pad);
  right: var(--range-pad);
  background: rgba(154, 174, 204, 0.7);
}

.wealth-scout__range-track-active {
  background: #173050;
  left: calc(var(--range-pad) + (var(--range-thumb-size) / 2) + (var(--range-start-ratio, 0) * var(--range-usable-width)));
  width: calc(var(--range-width-ratio, 1) * var(--range-usable-width));
}

.wealth-scout__range-input {
  position: absolute;
  inset: 0;
  width: 100%;
  margin: 0;
  background: transparent;
  pointer-events: none;
  -webkit-appearance: none;
  appearance: none;
}

.wealth-scout__range-input::-webkit-slider-runnable-track {
  height: 0.4rem;
  background: transparent;
}

.wealth-scout__range-input::-moz-range-track {
  height: 0.4rem;
  background: transparent;
}

.wealth-scout__range-input::-webkit-slider-thumb {
  pointer-events: auto;
  -webkit-appearance: none;
  width: 1.2rem;
  height: 1.2rem;
  margin-top: -0.4rem;
  border-radius: 999px;
  border: 2px solid #fff;
  background: #173050;
  box-shadow: 0 4px 14px rgba(23, 48, 80, 0.16);
}

.wealth-scout__range-input::-moz-range-thumb {
  pointer-events: auto;
  width: 1.2rem;
  height: 1.2rem;
  border-radius: 999px;
  border: 2px solid #fff;
  background: #173050;
  box-shadow: 0 4px 14px rgba(23, 48, 80, 0.16);
}

.wealth-scout__price-field-box {
  display: grid;
  gap: 0;
  min-height: 4.2rem;
  padding: 0.38rem 0.8rem 0.32rem;
  border-radius: 12px;
  border: 1px solid rgba(154, 174, 204, 0.22);
  background: rgba(255, 255, 255, 0.98);
}

.wealth-scout__price-field-box span {
  color: #6a819f;
  font-size: 0.74rem;
  line-height: 1;
  margin: 0 0 -0.34rem;
}

.wealth-scout__price-field-box input,
.wealth-scout__price-field-value input {
  min-height: 0;
  padding: 0;
  border: 0 !important;
  border-radius: 0;
  background: transparent !important;
  color: #173050;
  font: inherit;
  font-size: 1.2rem !important;
  font-weight: 700;
  line-height: 1;
  box-shadow: none;
  appearance: none;
}

.wealth-scout__price-field-box input:focus {
  outline: none;
}

.wealth-scout__price-field-value {
  position: relative;
  display: flex;
  align-items: center;
  margin-top: -0.22rem;
}

.wealth-scout__price-field-value::before {
  content: attr(data-prefix);
  color: #173050;
  font-size: 1.3rem;
  line-height: 1;
  margin-right: 0.12rem;
}

.wealth-scout__results-more {
  display: flex;
  justify-content: center;
  width: min(100%, 70rem);
  margin: 0 auto;
}

.wealth-scout__load-more-btn {
  min-height: 3.4rem;
  padding: 0.85rem 1.2rem;
  border: 1px solid rgba(23, 48, 80, 0.22);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.96);
  color: #173050;
  font: inherit;
  cursor: pointer;
}

.wealth-scout__result-card,
.wealth-scout__empty,
.wealth-scout__loading {
  border-radius: 22px;
  border: 1px solid rgba(154, 174, 204, 0.16);
  background: rgba(247, 250, 255, 0.68);
  box-shadow: none;
  min-width: 0;
}

.wealth-scout__loading {
  display: grid;
  gap: 0.85rem;
  place-items: center;
  min-height: 22rem;
  padding: 2.2rem;
  text-align: center;
  background: rgba(247, 250, 255, 0.88);
}

.wealth-scout__loading-spinner {
  width: 3.2rem;
  height: 3.2rem;
  border-radius: 999px;
  border: 4px solid rgba(154, 174, 204, 0.26);
  border-top-color: #173050;
  animation: wealth-scout-spin 0.85s linear infinite;
}

.wealth-scout__result-main {
  width: 100%;
  text-align: left;
  font: inherit;
  color: inherit;
  cursor: pointer;
}

.wealth-scout__charts,
.wealth-scout__results,
.wealth-scout__empty {
  width: min(100%, 70rem);
  margin-inline: auto;
}

.wealth-scout__charts--stacked {
  grid-template-columns: 1fr;
}

.wealth-scout :deep(.wealth-chart__body) {
  min-height: 360px;
}

.wealth-scout__result-metrics span {
  color: #6481a6;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

.wealth-scout__result-card {
  overflow: hidden;
}

.wealth-scout__result-main {
  align-items: stretch;
  padding: 1rem;
  border: 0;
  background: transparent;
  min-width: 0;
}

.wealth-scout__result-toggle {
  align-self: center;
  width: 0.8rem;
  min-width: 0.8rem;
  height: 0.8rem;
  margin-left: 0.75rem;
  border-right: 2px solid rgba(23, 48, 80, 0.58);
  border-bottom: 2px solid rgba(23, 48, 80, 0.58);
  transform: rotate(45deg);
  transition: transform 160ms ease, border-color 160ms ease;
}

.wealth-scout__result-toggle.is-open {
  transform: rotate(225deg);
  border-color: #173050;
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
  min-width: 0;
}

.wealth-scout__result-head strong {
  color: #0f766e;
  white-space: nowrap;
}

.wealth-scout__result-metrics {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.75rem;
  min-width: 0;
}

.wealth-scout__result-metrics div {
  display: grid;
  gap: 0.18rem;
  padding: 0.85rem;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.9);
  min-width: 0;
}

.wealth-scout__detail {
  padding: 0 1rem 1rem;
}

.wealth-scout__empty {
  display: grid;
  gap: 0.6rem;
  padding: 1.1rem;
}

.wealth-scout-reveal-enter-active,
.wealth-scout-reveal-leave-active {
  transition: opacity 220ms ease, transform 220ms ease, max-height 220ms ease;
}

.wealth-scout-reveal-enter-from,
.wealth-scout-reveal-leave-to {
  opacity: 0;
  transform: translateY(-8px);
  max-height: 0;
}

@keyframes wealth-scout-spin {
  from {
    transform: rotate(0deg);
  }

  to {
    transform: rotate(360deg);
  }
}

@media (min-width: 1200px) {
  .scout-form__head {
    padding-bottom: 2rem;
  }

  .scout-form__block {
    gap: 1rem;
    padding: 1.9rem 0;
  }

  .scout-form__option-grid {
    gap: 1.1rem;
  }

  .scout-form__option {
    padding: 1.15rem 1.25rem;
  }

  .scout-form__summary {
    padding-top: 1.8rem;
  }
}

@media (max-width: 980px) {
  .wealth-scout__question-head,
.wealth-scout__result-head,
.wealth-scout__result-main,
.wealth-scout__charts {
    grid-template-columns: 1fr;
    display: grid;
  }

  .wealth-scout__panel {
    min-height: calc(100vh - 16rem);
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

  .wealth-scout__panel--form {
    min-height: 0;
    padding: 0;
  }

  .scout-form {
    border-radius: 20px;
  }

  .scout-form__option-grid,
  .scout-form__summary {
    grid-template-columns: 1fr;
  }

  .scout-form__balance {
    grid-template-columns: 1fr;
    gap: 0.55rem;
  }

  .scout-form__balance-side {
    max-width: none;
  }

  .scout-form__balance-side--end {
    text-align: left;
    justify-items: start;
    order: 3;
  }

  .scout-form__balance-track {
    order: 2;
  }

  .wealth-scout__result-head strong {
    white-space: normal;
  }

  .wealth-scout__result-card,
.wealth-scout__detail,
.wealth-scout__charts {
    min-width: 0;
    overflow: hidden;
  }

  .wealth-scout__results-filters,
.wealth-scout__results-search,
.wealth-scout__results-more {
    width: 100%;
  }

  .wealth-scout__results-filters-head,
.wealth-scout__result-main,
.wealth-scout__result-head {
    display: grid;
    grid-template-columns: 1fr;
  }

  .wealth-scout__result-toggle {
    margin-left: 0;
    justify-self: end;
  }

  .wealth-scout__result-copy,
.wealth-scout__result-head > div,
.wealth-scout__result-metrics,
.wealth-scout__result-metrics div {
    min-width: 0;
  }

  .wealth-scout__result-metrics {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .wealth-scout__result-head h4,
.wealth-scout__result-head p {
    overflow-wrap: anywhere;
  }

  .wealth-scout__price-field-box input,
.wealth-scout__price-field-value input,
.wealth-scout__price-field-value::before {
    font-size: 1.05rem !important;
  }

  .wealth-scout :deep(.wealth-chart) {
    min-width: 0;
    overflow: hidden;
  }

  .wealth-scout :deep(.wealth-chart__body) {
    min-height: 220px;
  }
}

@media (max-width: 560px) {
  .wealth-scout__result-metrics {
    grid-template-columns: 1fr;
  }
}
</style>
