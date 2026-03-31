<template>
  <section class="wealth-sheet card">
    <div class="wealth-sheet__header">
      <div>
        <h2>Current household setup</h2>
      </div>
      <p class="wealth-sheet__copy">
        Costs are all weekly. Income is split across both people so each career path can move independently.
      </p>
    </div>

    <div class="wealth-sheet__grid">
      <label>
        <span>Number of people</span>
        <select v-model.number="householdSize">
          <option :value="1">1 person</option>
          <option :value="2">2 people</option>
        </select>
      </label>
      <label>
        <span>Time horizon of interest</span>
        <input v-model.number="form.profile.horizonYears" type="number" min="10" max="30" step="1" />
      </label>
      <label>
        <span>Living costs except rent (food, bills, etc.)</span>
        <input v-model.number="form.profile.weeklyNonHousingLivingCosts" type="number" min="0" step="25" />
      </label>
    </div>

    <section class="wealth-sheet__subsection">
      <div class="wealth-sheet__subsection-head">
        <h3>Housing setup</h3>
      </div>

      <div class="wealth-sheet__subsection-grid wealth-sheet__subsection-grid--housing">
        <label>
          <span>Current housing status</span>
          <select v-model="currentHousingStatus">
            <option value="renting">Renting</option>
            <option value="livingAtHome">Living at home</option>
          </select>
        </label>
        <label>
          <span>Rent cost + Utilities</span>
          <input v-model.number="form.housingCosts.weeklyRent" type="number" min="0" step="10" />
        </label>
        <label v-if="form.housingCosts.liveAtHome">
          <span>Years living at home</span>
          <input v-model.number="form.housingCosts.liveAtHomeYears" type="number" min="1" :max="Math.max(1, form.profile.horizonYears - 1)" step="1" />
        </label>
        <label v-if="form.housingCosts.liveAtHome">
          <span>At-home rent + bills cost</span>
          <input v-model.number="form.housingCosts.weeklyBoardAtHome" type="number" min="0" step="10" />
        </label>
      </div>
    </section>

    <section class="wealth-sheet__subsection">
      <div class="wealth-sheet__subsection-head">
        <h3>Household income trajectory</h3>
        <p class="wealth-sheet__subsection-copy">
          Set each person separately. The simulator combines both incomes into one household cashflow while preserving per-person salary tax and HELP treatment.
        </p>
      </div>

      <div class="wealth-sheet__earners">
        <article
          v-for="(earner, index) in earners"
          :key="earner.id || index"
          class="wealth-earner-card"
        >
          <div class="wealth-earner-card__head">
            <div>
              <p class="wealth-earner-card__kicker">Income profile</p>
              <h4>{{ earner.label || `Person ${index + 1}` }}</h4>
            </div>
            <div class="wealth-earner-card__summary">
              <strong>{{ formatCurrency(earner.annualIncome) }}</strong>
              <span>starting salary</span>
            </div>
          </div>

          <div class="wealth-sheet__subsection-grid">
            <label>
              <span>Name</span>
              <input v-model.trim="earner.label" type="text" maxlength="30" :placeholder="`Person ${index + 1}`" />
            </label>
            <label>
              <span>Gross income</span>
              <input v-model.number="earner.annualIncome" type="number" min="0" step="1000" />
            </label>
            <label>
              <span>Starting savings</span>
              <input v-model.number="earner.startingSavings" type="number" min="0" step="1000" />
            </label>
            <label>
              <span>HECS/HELP debt</span>
              <input v-model.number="earner.helpDebtBalance" type="number" min="0" step="1000" />
            </label>
            <label>
              <span>Average income growth %</span>
              <input
                :value="getEarnerGrowthPct(earner)"
                type="number"
                min="0"
                max="12"
                step="0.1"
                @input="setEarnerGrowthPct(earner, $event.target.value)"
              />
            </label>
            <label>
              <span>Income growth style</span>
              <select :value="getEarnerIncomeCurve(earner)" @change="setEarnerIncomeCurve(earner, $event.target.value)">
                <option value="exponential">Exponential</option>
                <option value="logarithmic">Logarithmic</option>
                <option value="sigmoid">Sigmoid (recommended)</option>
              </select>
            </label>
          </div>

          <WealthIncomeGrowthEditor
            :profile="earner"
            :profile-label="earner.label || `person ${index + 1}`"
          />
        </article>
      </div>

      <div class="wealth-sheet__summary-grid">
        <article class="wealth-sheet__summary-card">
          <span>Combined starting savings</span>
          <strong>{{ formatCurrency(totalStartingSavings) }}</strong>
        </article>
        <article class="wealth-sheet__summary-card">
          <span>Year {{ form.profile.horizonYears }} household income</span>
          <strong>{{ formatCurrency(finalYearIncome) }}</strong>
        </article>
        <article class="wealth-sheet__summary-card">
          <span>Combined HELP debt</span>
          <strong>{{ formatCurrency(totalHelpDebt) }}</strong>
        </article>
      </div>
    </section>
  </section>
</template>

<script setup>
import { computed, watch } from 'vue'
import WealthIncomeGrowthEditor from './WealthIncomeGrowthEditor.vue'
import { normaliseIncomeProfile } from '../../wealth/incomeSeries.js'

const DEFAULT_WEEKLY_RENT_BY_HOUSEHOLD_SIZE = {
  1: 500,
  2: 850
}

const DEFAULT_WEEKLY_SPENDING_BY_HOUSEHOLD_SIZE = {
  1: 400,
  2: 700
}

const DEFAULT_EARNERS = [
  {
    id: 'person-1',
    label: 'Person 1',
    startingSavings: 25000,
    annualIncome: 95000,
    helpDebtBalance: 15000,
    incomeGrowthRate: 0.038,
    incomeCurve: 'sigmoid',
    useCustomIncomeSeries: false,
    annualIncomeSeries: []
  },
  {
    id: 'person-2',
    label: 'Person 2',
    startingSavings: 15000,
    annualIncome: 70000,
    helpDebtBalance: 0,
    incomeGrowthRate: 0.034,
    incomeCurve: 'sigmoid',
    useCustomIncomeSeries: false,
    annualIncomeSeries: []
  }
]

const props = defineProps({
  form: { type: Object, required: true }
})

const earners = computed(() => props.form.profile.earners || [])
const householdSize = computed({
  get: () => Math.min(2, Math.max(1, earners.value.length || 1)),
  set: (value) => {
    const targetSize = value === 1 ? 1 : 2
    const previousSize = Math.min(2, Math.max(1, earners.value.length || 1))
    const previousRentDefault = getDefaultWeeklyRent(previousSize)
    const previousSpendingDefault = getDefaultWeeklySpending(previousSize)
    const nextEarners = Array.isArray(props.form.profile.earners)
      ? [...props.form.profile.earners]
      : []

    while (nextEarners.length < targetSize) {
      nextEarners.push(createDefaultEarner(nextEarners.length))
    }

    props.form.profile.earners = nextEarners.slice(0, targetSize)

    if (Number(props.form.housingCosts.weeklyRent) === previousRentDefault) {
      props.form.housingCosts.weeklyRent = getDefaultWeeklyRent(targetSize)
    }

    if (Number(props.form.profile.weeklyNonHousingLivingCosts) === previousSpendingDefault) {
      props.form.profile.weeklyNonHousingLivingCosts = getDefaultWeeklySpending(targetSize)
    }
  }
})

const householdProfile = computed(() => normaliseIncomeProfile(props.form.profile))
const totalStartingSavings = computed(() => householdProfile.value.startingSavings)
const totalHelpDebt = computed(() => householdProfile.value.helpDebtBalance)
const finalYearIncome = computed(() => {
  const series = householdProfile.value.annualIncomeSeries || []
  return series[series.length - 1] || 0
})

const currentHousingStatus = computed({
  get: () => props.form.housingCosts.liveAtHome ? 'livingAtHome' : 'renting',
  set: (value) => {
    props.form.housingCosts.liveAtHome = value === 'livingAtHome'
    if (!props.form.housingCosts.liveAtHome) {
      props.form.housingCosts.liveAtHomeYears = 0
    } else if (props.form.housingCosts.liveAtHomeYears < 1) {
      props.form.housingCosts.liveAtHomeYears = 1
    }
  }
})

function formatCurrency(value) {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    maximumFractionDigits: 0
  }).format(Number(value) || 0)
}

function getEarnerGrowthPct(earner) {
  return Number(((Number(earner?.incomeGrowthRate) || 0) * 100).toFixed(1))
}

function setEarnerGrowthPct(earner, value) {
  if (!earner) return
  earner.incomeGrowthRate = Math.max(0, Number(value) || 0) / 100
}

function getEarnerIncomeCurve(earner) {
  return ['logarithmic', 'sigmoid', 'exponential'].includes(earner?.incomeCurve) ? earner.incomeCurve : 'sigmoid'
}

function setEarnerIncomeCurve(earner, value) {
  if (!earner) return
  earner.incomeCurve = ['logarithmic', 'sigmoid', 'exponential'].includes(value) ? value : 'sigmoid'
}

function createDefaultEarner(index) {
  const fallback = DEFAULT_EARNERS[index] || DEFAULT_EARNERS[DEFAULT_EARNERS.length - 1]
  return {
    ...fallback,
    id: `person-${index + 1}`,
    label: fallback.label || `Person ${index + 1}`,
    startingSavings: Math.max(0, Number(fallback.startingSavings) || 0),
    annualIncomeSeries: Array.isArray(fallback.annualIncomeSeries) ? [...fallback.annualIncomeSeries] : []
  }
}

function getDefaultWeeklyRent(householdSize) {
  return DEFAULT_WEEKLY_RENT_BY_HOUSEHOLD_SIZE[householdSize] || DEFAULT_WEEKLY_RENT_BY_HOUSEHOLD_SIZE[1]
}

function getDefaultWeeklySpending(householdSize) {
  return DEFAULT_WEEKLY_SPENDING_BY_HOUSEHOLD_SIZE[householdSize] || DEFAULT_WEEKLY_SPENDING_BY_HOUSEHOLD_SIZE[1]
}

watch(
  householdSize,
  (value) => {
    const targetSize = value === 2 ? 2 : 1
    if (!Number.isFinite(Number(props.form.housingCosts.weeklyRent)) || Number(props.form.housingCosts.weeklyRent) <= 0) {
      props.form.housingCosts.weeklyRent = getDefaultWeeklyRent(targetSize)
    }
    if (!Number.isFinite(Number(props.form.profile.weeklyNonHousingLivingCosts)) || Number(props.form.profile.weeklyNonHousingLivingCosts) <= 0) {
      props.form.profile.weeklyNonHousingLivingCosts = getDefaultWeeklySpending(targetSize)
    }
  },
  { immediate: true }
)
</script>

<style scoped>
.wealth-sheet {
  display: grid;
  gap: 1.3rem;
  padding: 1.3rem;
}

.wealth-sheet__header {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: start;
}

.wealth-sheet__header h2 {
  margin: 0.15rem 0 0;
  font-size: clamp(1.65rem, 1.3rem + 1vw, 2.3rem);
  line-height: 1;
}

.wealth-sheet__kicker {
  margin: 0;
  text-transform: uppercase;
  letter-spacing: 0.16em;
  font-size: 0.74rem;
  color: #5d7ba3;
}

.wealth-sheet__copy {
  max-width: 30rem;
  margin: 0;
  color: #557090;
  line-height: 1.5;
}

.wealth-sheet__grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.9rem;
}

.wealth-sheet__grid label {
  display: grid;
  gap: 0.35rem;
  color: #5b7192;
  font-size: 0.84rem;
}

.wealth-sheet__grid input,
.wealth-sheet__grid select,
.wealth-sheet__subsection-grid select,
.wealth-sheet__subsection-grid input {
  width: 100%;
  min-height: 3.35rem;
  padding: 0.8rem 0.95rem;
  border-radius: 16px;
  border: 1px solid rgba(154, 174, 204, 0.22);
  background: rgba(248, 251, 255, 0.98);
  color: #173050;
  font: inherit;
}

.wealth-sheet__callout {
  padding: 1rem 1.05rem;
  border-radius: 20px;
  background: linear-gradient(135deg, rgba(224, 242, 254, 0.8), rgba(240, 249, 255, 0.95));
  border: 1px solid rgba(125, 211, 252, 0.25);
}

.wealth-sheet__callout strong {
  display: block;
  margin-bottom: 0.3rem;
}

.wealth-sheet__callout p {
  margin: 0;
  color: #4f6887;
}

.wealth-sheet__subsection {
  display: grid;
  gap: 1rem;
}

.wealth-sheet__subsection-head h3 {
  margin: 0.2rem 0 0;
  font-size: 1.15rem;
  color: #173050;
}

.wealth-sheet__subsection-copy {
  margin: -0.2rem 0 0;
  color: #5d7394;
  line-height: 1.5;
  font-size: 0.9rem;
}

.wealth-sheet__subsection-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.9rem;
}

.wealth-sheet__subsection-grid--housing {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.wealth-sheet__subsection-grid label {
  display: grid;
  gap: 0.35rem;
  color: #5b7192;
  font-size: 0.84rem;
}

.wealth-sheet__earners {
  display: grid;
  gap: 1rem;
}

.wealth-earner-card {
  display: grid;
  gap: 1rem;
  padding: 1rem;
  border-radius: 22px;
  border: 1px solid rgba(154, 174, 204, 0.18);
  background: rgba(250, 252, 255, 0.92);
}

.wealth-earner-card__head {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: flex-start;
}

.wealth-earner-card__kicker {
  margin: 0;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  font-size: 0.7rem;
  color: #6c84a5;
}

.wealth-earner-card__head h4 {
  margin: 0.2rem 0 0;
  font-size: 1.05rem;
  color: #173050;
}

.wealth-earner-card__summary {
  display: grid;
  gap: 0.15rem;
  text-align: right;
}

.wealth-earner-card__summary strong {
  font-size: 1.05rem;
  color: #173050;
}

.wealth-earner-card__summary span {
  color: #6481a6;
  font-size: 0.78rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

.wealth-sheet__summary-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.9rem;
}

.wealth-sheet__summary-card {
  display: grid;
  gap: 0.25rem;
  padding: 1rem;
  border-radius: 18px;
  background: rgba(239, 246, 255, 0.9);
  border: 1px solid rgba(125, 211, 252, 0.22);
}

.wealth-sheet__summary-card span {
  color: #5b7192;
  font-size: 0.78rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

.wealth-sheet__summary-card strong {
  color: #173050;
  font-size: 1.1rem;
}

@media (max-width: 820px) {
  .wealth-sheet__header {
    flex-direction: column;
  }

  .wealth-sheet__grid,
  .wealth-sheet__subsection-grid,
  .wealth-sheet__summary-grid {
    grid-template-columns: 1fr;
  }

  .wealth-earner-card__head {
    flex-direction: column;
  }

  .wealth-earner-card__summary {
    text-align: left;
  }
}
</style>
