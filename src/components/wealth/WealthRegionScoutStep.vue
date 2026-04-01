<template>
  <section class="wealth-scout card">
    <div class="wealth-scout__header">
      <div>
        <p class="wealth-scout__kicker">Region scout</p>
        <h2>Find the best area to target next</h2>
      </div>
      <p class="wealth-scout__copy">
        Set your filters, choose when you want to buy, and the scout estimates your maximum affordable price at that time using an optimal deposit size.
      </p>
    </div>

    <div class="wealth-scout__filter-bar">
      <label class="wealth-scout__filter">
        <span>Buy in</span>
        <input v-model.number="resolvedConfig.targetYears" type="number" min="1" :max="form.profile.horizonYears" step="1" />
      </label>

      <label class="wealth-scout__filter">
        <span>Price range min</span>
        <input v-model.number="resolvedConfig.minPrice" type="number" min="0" step="10000" placeholder="Any" />
      </label>

      <label class="wealth-scout__filter">
        <span>Price range max</span>
        <input v-model.number="resolvedConfig.maxPrice" type="number" min="0" step="10000" placeholder="Any" />
      </label>

      <label class="wealth-scout__filter">
        <span>Location</span>
        <select v-model="resolvedConfig.locationKey">
          <option :value="null">All regions</option>
          <option v-for="option in regionOptions" :key="option.key" :value="option.key">
            {{ option.label }}
          </option>
        </select>
      </label>

      <label class="wealth-scout__filter">
        <span>Granularity</span>
        <select v-model="resolvedConfig.granularity">
          <option value="region">Region</option>
          <option value="subregion">Subregion</option>
          <option value="suburb">Suburb</option>
        </select>
      </label>

      <div class="wealth-scout__filter wealth-scout__filter--segmented">
        <span>Property type</span>
        <div class="wealth-scout__segmented">
          <button
            type="button"
            class="wealth-scout__segment"
            :class="{ 'is-active': resolvedConfig.propertyType === 'apartment' }"
            @click="resolvedConfig.propertyType = 'apartment'"
          >
            Apartment
          </button>
          <button
            type="button"
            class="wealth-scout__segment"
            :class="{ 'is-active': resolvedConfig.propertyType === 'house' }"
            @click="resolvedConfig.propertyType = 'house'"
          >
            House
          </button>
        </div>
      </div>

      <div class="wealth-scout__filter wealth-scout__filter--segmented">
        <span>Savings path</span>
        <div class="wealth-scout__segmented">
          <button
            type="button"
            class="wealth-scout__segment"
            :class="{ 'is-active': resolvedConfig.savingsMode === 'defaultPortfolio' }"
            @click="resolvedConfig.savingsMode = 'defaultPortfolio'"
          >
            Default portfolio
          </button>
          <button
            type="button"
            class="wealth-scout__segment"
            :class="{ 'is-active': resolvedConfig.savingsMode === 'cash' }"
            @click="resolvedConfig.savingsMode = 'cash'"
          >
            High interest cash
          </button>
        </div>
      </div>
    </div>

    <div class="wealth-scout__summary-grid">
      <article class="wealth-scout__summary-card">
        <span>Max affordable in {{ resolvedConfig.targetYears }}y</span>
        <strong>{{ formatCurrency(model.budget.affordablePrice) }}</strong>
        <small>Optimal deposit sizing, including purchase costs</small>
      </article>
      <article class="wealth-scout__summary-card">
        <span>Projected savings</span>
        <strong>{{ formatCurrency(model.futureSnapshot.liquidSavings) }}</strong>
        <small>{{ savingsModeLabel }}</small>
      </article>
      <article class="wealth-scout__summary-card">
        <span>Projected household income</span>
        <strong>{{ formatCurrency(model.futureSnapshot.annualIncome) }}</strong>
        <small>Year {{ resolvedConfig.targetYears }} income</small>
      </article>
      <article class="wealth-scout__summary-card">
        <span>Search scope</span>
        <strong>{{ scopeLabel }}</strong>
        <small>{{ granularityLabel }}</small>
      </article>
      <article class="wealth-scout__summary-card">
        <span>Results</span>
        <strong>{{ model.totalMatches }}</strong>
        <small>Matching areas after filters</small>
      </article>
    </div>

    <p class="wealth-scout__note">
      Time period changes both sides of the equation: your projected deposit grows, and the filtered area prices are projected forward using each market's expected growth rate.
    </p>

    <div v-if="model.hasRecommendations" class="wealth-scout__results">
      <article
        v-for="(recommendation, index) in model.recommendations"
        :key="recommendation.key"
        class="wealth-scout__result-card"
      >
        <div class="wealth-scout__result-rank">#{{ index + 1 }}</div>
        <div class="wealth-scout__result-main">
          <div class="wealth-scout__result-head">
            <div>
              <h3>{{ recommendation.label }}</h3>
              <p>
                {{ recommendation.type === 'suburb' ? 'Suburb' : recommendation.type === 'subregion' ? 'Subregion' : 'Region' }}
                <template v-if="recommendation.regionLabel && recommendation.regionLabel !== recommendation.label">
                  | {{ recommendation.regionLabel }}
                </template>
              </p>
            </div>
            <strong>{{ formatPercent(recommendation.growthMean) }}</strong>
          </div>

          <div class="wealth-scout__result-metrics">
            <div>
              <span>Current median</span>
              <strong>{{ formatCurrency(recommendation.priceToday) }}</strong>
            </div>
            <div>
              <span>Estimated buy-year price</span>
              <strong>{{ formatCurrency(recommendation.targetPrice) }}</strong>
            </div>
            <div>
              <span>Vs your max</span>
              <strong :class="budgetClass(recommendation.budgetGap)">{{ formatSignedCurrency(recommendation.budgetGap) }}</strong>
            </div>
            <div>
              <span>History depth</span>
              <strong>{{ recommendation.historyYears }} yrs</strong>
            </div>
          </div>
        </div>
      </article>
    </div>

    <div v-else class="wealth-scout__empty">
      <h3>No results match those filters</h3>
      <p>Widen the price range, change the location, or switch granularity.</p>
    </div>
  </section>
</template>

<script setup>
import { computed } from 'vue'
import { buildRegionScoutModel, normaliseRegionScoutConfig } from '../../wealth/regionScout.js'

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

const resolvedConfig = computed(() => props.scoutConfig)

const regionOptions = computed(() =>
  (props.suburbSearchContext?.areaOptions || []).filter((option) => option.type === 'region')
)

const model = computed(() => buildRegionScoutModel({
  form: props.form,
  suburbSearchContext: props.suburbSearchContext,
  config: normaliseRegionScoutConfig(props.scoutConfig)
}))

const scopeLabel = computed(() => {
  if (model.value.location?.label) return model.value.location.label
  return 'All NSW regions'
})
const granularityLabel = computed(() => {
  if (resolvedConfig.value.granularity === 'suburb') return 'Showing suburbs'
  if (resolvedConfig.value.granularity === 'subregion') return 'Showing subregions'
  return 'Showing regions'
})
const savingsModeLabel = computed(() =>
  resolvedConfig.value.savingsMode === 'cash'
    ? 'Future savings held in high interest cash'
    : 'Future savings compounded in your default portfolio'
)

function formatCurrency(value) {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    maximumFractionDigits: 0
  }).format(Number(value) || 0)
}

function formatSignedCurrency(value) {
  const safeValue = Number(value) || 0
  const sign = safeValue >= 0 ? '+' : '-'
  return `${sign}${formatCurrency(Math.abs(safeValue))}`
}

function formatPercent(value) {
  if (!Number.isFinite(Number(value))) return 'n/a'
  return `${(Number(value) * 100).toFixed(1)}% p.a.`
}

function budgetClass(value) {
  return (Number(value) || 0) >= 0 ? 'is-positive' : 'is-negative'
}
</script>

<style scoped>
.wealth-scout {
  display: grid;
  gap: 1.15rem;
  padding: 1.3rem;
}

.wealth-scout__header {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
}

.wealth-scout__kicker {
  margin: 0;
  text-transform: uppercase;
  letter-spacing: 0.16em;
  font-size: 0.74rem;
  color: #5d7ba3;
}

.wealth-scout__header h2 {
  margin: 0.15rem 0 0;
  font-size: clamp(1.7rem, 1.35rem + 1vw, 2.3rem);
  line-height: 1;
}

.wealth-scout__copy {
  margin: 0;
  max-width: 34rem;
  color: #577190;
  line-height: 1.5;
}

.wealth-scout__controls,
.wealth-scout__summary-grid,
.wealth-scout__result-metrics {
  display: grid;
  gap: 0.9rem;
}

.wealth-scout__filter-bar,
.wealth-scout__summary-grid {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.wealth-scout__filter {
  display: grid;
  gap: 0.35rem;
  color: #5b7192;
  font-size: 0.84rem;
}

.wealth-scout__filter input,
.wealth-scout__filter select {
  width: 100%;
  min-height: 3.2rem;
  padding: 0.8rem 0.9rem;
  border-radius: 16px;
  border: 1px solid rgba(154, 174, 204, 0.22);
  background: rgba(255, 255, 255, 0.96);
  color: #173050;
  font: inherit;
}

.wealth-scout__filter--segmented {
  align-content: start;
}

.wealth-scout__segmented {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.55rem;
}

.wealth-scout__segment {
  min-height: 3.2rem;
  border-radius: 16px;
  border: 1px solid rgba(154, 174, 204, 0.22);
  background: rgba(244, 248, 255, 0.96);
  color: #355474;
  font: inherit;
  cursor: pointer;
}

.wealth-scout__segment.is-active {
  border-color: rgba(37, 99, 235, 0.28);
  background: rgba(219, 234, 254, 0.92);
  color: #1d4ed8;
}

.wealth-scout__summary-card,
.wealth-scout__result-card {
  border-radius: 20px;
  border: 1px solid rgba(154, 174, 204, 0.16);
  background: rgba(247, 250, 255, 0.8);
}

.wealth-scout__summary-card {
  display: grid;
  gap: 0.2rem;
  padding: 1rem;
}

.wealth-scout__summary-card span {
  color: #6481a6;
  font-size: 0.76rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

.wealth-scout__summary-card strong {
  color: #173050;
  font-size: 1.15rem;
}

.wealth-scout__summary-card small,
.wealth-scout__result-head p,
.wealth-scout__note,
.wealth-scout__near-miss span {
  color: #5d7394;
}

.wealth-scout__note {
  margin: 0;
  padding: 0.9rem 1rem;
  border-radius: 18px;
  background: rgba(214, 233, 255, 0.58);
  border: 1px solid rgba(82, 136, 201, 0.18);
  line-height: 1.55;
}

.wealth-scout__results {
  display: grid;
  gap: 0.8rem;
}

.wealth-scout__result-card {
  display: grid;
  grid-template-columns: 4rem minmax(0, 1fr);
  gap: 1rem;
  padding: 1rem;
}

.wealth-scout__result-rank {
  display: grid;
  place-items: center;
  border-radius: 18px;
  background: linear-gradient(135deg, #dbeafe, #eff6ff);
  color: #1d4ed8;
  font-size: 1.15rem;
  font-weight: 700;
}

.wealth-scout__result-main {
  display: grid;
  gap: 0.85rem;
}

.wealth-scout__result-head {
  display: flex;
  justify-content: space-between;
  gap: 0.85rem;
  align-items: start;
}

.wealth-scout__result-head h3,
.wealth-scout__empty h3 {
  margin: 0;
  color: #173050;
}

.wealth-scout__result-head p,
.wealth-scout__empty p {
  margin: 0.2rem 0 0;
}

.wealth-scout__result-head strong {
  color: #0f766e;
  white-space: nowrap;
}

.wealth-scout__result-metrics {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.wealth-scout__result-metrics div {
  display: grid;
  gap: 0.15rem;
  padding: 0.8rem;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.9);
}

.wealth-scout__result-metrics span {
  color: #6481a6;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

.wealth-scout__result-metrics strong {
  color: #173050;
}

.wealth-scout__result-metrics strong.is-positive {
  color: #0f766e;
}

.wealth-scout__result-metrics strong.is-negative {
  color: #b42318;
}

.wealth-scout__empty {
  display: grid;
  gap: 0.8rem;
  padding: 1.1rem;
  border-radius: 22px;
  border: 1px dashed rgba(154, 174, 204, 0.32);
  background: rgba(255, 255, 255, 0.72);
}

@media (max-width: 1100px) {
  .wealth-scout__filter-bar,
  .wealth-scout__summary-grid,
  .wealth-scout__result-metrics {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 820px) {
  .wealth-scout__header,
  .wealth-scout__filter-bar,
  .wealth-scout__summary-grid,
  .wealth-scout__result-card,
  .wealth-scout__result-metrics {
    grid-template-columns: 1fr;
  }

  .wealth-scout__header,
  .wealth-scout__result-head {
    display: grid;
  }
}
</style>

