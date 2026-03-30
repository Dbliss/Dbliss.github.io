<template>
  <article class="wealth-page">
    <section ref="heroRef" class="wealth-hero" :class="{ 'is-entered': hasEnteredWorkspace }">
      <p class="wealth-hero__kicker">Wealth Pathways</p>
      <h1 class="wealth-hero__title">{{ project.title }}</h1>
      <p class="wealth-tagline">{{ project.tagline }}</p>
      <p v-if="project.excerpt || project.description?.trim()" class="wealth-hero__description">
        {{ project.excerpt || project.description?.trim() }}
      </p>
      <p v-if="!hasEnteredWorkspace" class="wealth-hero__scroll">Scroll to continue</p>
    </section>

    <div ref="workspaceRef" class="wealth-workspace" :class="{ 'is-entered': hasEnteredWorkspace }">
      <WealthStageProgress
        :stages="stageDefinitions"
        :current-stage="currentStage"
        @select-stage="handleStageSelect"
      />

      <div v-if="errorMessage" class="wealth-error">{{ errorMessage }}</div>

      <Transition name="wealth-stage-slide" mode="out-in">
        <section :key="currentStage" class="wealth-stage">
        <template v-if="currentStage === 'introduction'">
          <WealthIntroStep :form="form" />
          <div class="wealth-stage-footer">
            <button type="button" class="wealth-secondary-btn" disabled>Back</button>
            <button type="button" class="wealth-primary-btn" @click="currentStage = 'interests'">Next: Interests</button>
          </div>
        </template>

        <template v-else-if="currentStage === 'interests'">
          <WealthInterestStep
            :scenario-selection="form.scenarioSelection"
            @select-mode="selectComparisonMode"
          />
          <div class="wealth-stage-footer">
            <button type="button" class="wealth-secondary-btn" @click="currentStage = 'introduction'">Back</button>
            <button type="button" class="wealth-primary-btn" @click="goToInputs">Next: Inputs</button>
          </div>
        </template>

        <template v-else-if="currentStage === 'inputs'">
          <div class="wealth-banner card">
            <div>
              <p class="wealth-banner__kicker">Workbook</p>
              <h2>Parameters by section</h2>
            </div>
            <div class="wealth-banner__chips">
              <span v-if="form.scenarioSelection.includeStocks" class="wealth-pill">Stocks</span>
              <span v-if="form.scenarioSelection.includeHousing" class="wealth-pill wealth-pill--housing">Housing</span>
            </div>
          </div>

          <WealthInputWorkbook
            :form="form"
            :active-sheet="activeSheet"
            :scenario-selection="form.scenarioSelection"
            :suburb-search-context="suburbSearchContext"
            :selected-suburb-selection="selectedSuburbSelection"
            :selected-suburb-record="selectedSuburbRecord"
            :selected-suburb-preview="selectedSuburbPreview"
            @update:activeSheet="activeSheet = $event"
            @select-suburb="handleSuburbSelect"
          />

          <div class="wealth-stage-footer">
            <button type="button" class="wealth-secondary-btn" @click="currentStage = 'interests'">Back</button>
            <button type="button" class="wealth-primary-btn" data-testid="continue-results" @click="generateResults">
              {{ loading ? 'Running simulation...' : 'Generate results' }}
            </button>
          </div>
        </template>

        <template v-else>
          <div class="wealth-results-toolbar">
            <button type="button" class="wealth-secondary-btn" @click="currentStage = 'inputs'">Edit inputs</button>
            <button type="button" class="wealth-primary-btn" data-testid="rerun-results" @click="rerunResults">
              {{ loading ? 'Running simulation...' : 'Recalculate with current inputs' }}
            </button>
          </div>

          <WealthResultsDashboard
            :dashboard="dashboard"
            :group-filter="groupFilter"
            :metric="resultMetric"
            :muted-strategy-keys="mutedStrategyKeys"
            :inflation-rate="form.housingCosts.rentGrowthRate"
            :last-run-at="lastRunAt"
            :results-stale="resultsStale"
            :loading="loading"
            @update:groupFilter="groupFilter = $event"
            @update:metric="resultMetric = $event"
            @toggle-series="toggleStrategy"
          />
        </template>
        </section>
      </Transition>
    </div>
  </article>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import WealthStageProgress from '../components/wealth/WealthStageProgress.vue'
import WealthIntroStep from '../components/wealth/WealthIntroStep.vue'
import WealthInterestStep from '../components/wealth/WealthInterestStep.vue'
import WealthInputWorkbook from '../components/wealth/WealthInputWorkbook.vue'
import WealthResultsDashboard from '../components/wealth/WealthResultsDashboard.vue'
import {
  cloneSimulationRequest,
  getWealthStrategyMeta,
  resolveScenarioSelection,
  wealthDefaultStockBaselineKey,
  wealthHousingStrategyKeys,
  wealthStockStrategyKeys,
  wealthStrategyOrder,
  wealthVacancyRate
} from '../data/wealthDefaults.js'
import { estimatePropertyCostFromPrice, scalePurchaseCostsWithPrice, clamp } from '../wealth/finance.js'
import { WealthSimulationClient } from '../wealth/client.js'
import { buildDashboardModel } from '../wealth/dashboard.js'
import { applyAreaMarketToForm, buildAreaSearchContext, createPropertyConfigPatchFromArea } from '../wealth/areaMarket.js'

const props = defineProps({
  project: { type: Object, required: true }
})

const stageDefinitions = [
  { key: 'introduction', label: 'Introduction' },
  { key: 'interests', label: 'Interests' },
  { key: 'inputs', label: 'Inputs' },
  { key: 'results', label: 'Results' }
]
const comparisonModeScenarioKeys = {
  portfolioDeepDive: [...wealthStockStrategyKeys],
  propertyVsStocks: [wealthDefaultStockBaselineKey, ...wealthHousingStrategyKeys],
  propertyInvestmentVsLiving: [...wealthHousingStrategyKeys]
}

const housePropertyCostKeys = ['councilRates', 'waterRates', 'insurance', 'maintenance', 'borrowingExpensesTotal', 'otherDeductibleExpensesAnnual']
const apartmentPropertyCostKeys = ['councilRates', 'waterRates', 'insurance', 'maintenance', 'strata', 'borrowingExpensesTotal', 'otherDeductibleExpensesAnnual']

const form = reactive(cloneSimulationRequest())
form.propertyConfig.vacancyRate = wealthVacancyRate
form.propertyConfig.house.landTax = 0
form.propertyConfig.apartment.landTax = 0
form.scenarioSelection = resolveScenarioSelection(form.scenarioSelection)

const strategyMeta = getWealthStrategyMeta()
const client = new WealthSimulationClient()
const currentStage = ref('introduction')
const activeSheet = ref('stock')
const hasEnteredWorkspace = ref(false)
const result = ref(null)
const loading = ref(false)
const errorMessage = ref('')
const lastRunAt = ref('')
const resultsStale = ref(true)
const mutedStrategyKeys = ref([])
const groupFilter = ref('all')
const resultMetric = ref('sellDown')
const selectedSuburbSelection = ref(null)
const areaMarketPayload = ref(null)
const heroRef = ref(null)
const workspaceRef = ref(null)
let runToken = 0

const suburbSearchContext = computed(() => buildAreaSearchContext(areaMarketPayload.value))
const selectedSuburbRecord = computed(() => {
  const key = selectedSuburbSelection.value?.key
  return key ? suburbSearchContext.value.areasByKey[key] || null : null
})
const selectedSuburbPreview = computed(() => createPropertyConfigPatchFromArea(selectedSuburbRecord.value) || {
  house: null,
  apartment: null,
  houseGrowthYears: 0,
  apartmentGrowthYears: 0
})

const availableInputSheetKeys = computed(() => {
  const keys = []
  if (form.scenarioSelection.includeStocks) keys.push('stock')
  if (form.scenarioSelection.includeHousing) keys.push('housingSetup', 'suburb', 'apartment', 'house')
  return keys
})

const emptyDashboard = {
  baselineKey: null,
  baseline: null,
  strategies: [],
  kpis: {
    bestMedian: null,
    downsideLeader: null,
    variabilityLeader: null,
    firstHousingBeatBaseline: null
  },
  narratives: [],
  compositionRows: []
}

const dashboard = computed(() =>
  result.value
    ? buildDashboardModel(result.value, form.scenarioSelection.stockBaselineKey, form.housingCosts.rentGrowthRate)
    : emptyDashboard
)

function scaleValueFromBaseline(currentValue, previousBaseline, nextBaseline) {
  const safeCurrentValue = Math.max(0, Number(currentValue) || 0)
  const safePreviousBaseline = Math.max(0, Number(previousBaseline) || 0)
  const safeNextBaseline = Math.max(0, Number(nextBaseline) || 0)

  if (safeCurrentValue <= 0) return 0
  if (safePreviousBaseline > 0 && safeNextBaseline > 0) {
    return Math.round((safeCurrentValue / safePreviousBaseline) * safeNextBaseline)
  }
  return Math.round(Math.max(0, safeCurrentValue + (safeNextBaseline - safePreviousBaseline)))
}

function getSharedPurchaseCost(property, key) {
  return Math.max(0, Number(property.ownerPurchaseCosts?.[key] ?? property.investmentPurchaseCosts?.[key]) || 0)
}

function setSharedPurchaseCost(property, key, value) {
  const safeValue = Math.max(0, Number(value) || 0)
  property.ownerPurchaseCosts[key] = safeValue
  property.investmentPurchaseCosts[key] = safeValue
}

function syncSharedPurchaseCosts(propertyType, property, previousPrice, nextPrice) {
  const scaledCosts = scalePurchaseCostsWithPrice(
    {
      stampDuty: getSharedPurchaseCost(property, 'stampDuty'),
      legalFees: getSharedPurchaseCost(property, 'legalFees'),
      buyersCosts: getSharedPurchaseCost(property, 'buyersCosts')
    },
    previousPrice,
    nextPrice,
    propertyType
  )

  setSharedPurchaseCost(property, 'stampDuty', scaledCosts.stampDuty)
  setSharedPurchaseCost(property, 'legalFees', scaledCosts.legalFees)
  setSharedPurchaseCost(property, 'buyersCosts', scaledCosts.buyersCosts)
}

function syncPropertyCostsWithPrice(propertyType, property, keys, previousPrice, nextPrice) {
  const safePreviousPrice = Math.max(0, Number(previousPrice) || 0)
  const safeNextPrice = Math.max(0, Number(nextPrice) || 0)
  if (safeNextPrice <= 0) {
    keys.forEach((key) => {
      property[key] = 0
    })
    return
  }

  keys.forEach((key) => {
    const currentValue = Math.max(0, Number(property[key]) || 0)
    const previousBaseline = safePreviousPrice > 0 ? estimatePropertyCostFromPrice(propertyType, key, safePreviousPrice) : 0
    const nextBaseline = estimatePropertyCostFromPrice(propertyType, key, safeNextPrice)
    property[key] = scaleValueFromBaseline(currentValue, previousBaseline, nextBaseline)
  })
}

function initialisePropertyCosts() {
  syncSharedPurchaseCosts('house', form.propertyConfig.house, form.propertyConfig.house.purchasePrice, form.propertyConfig.house.purchasePrice)
  syncSharedPurchaseCosts('apartment', form.propertyConfig.apartment, form.propertyConfig.apartment.purchasePrice, form.propertyConfig.apartment.purchasePrice)
  syncPropertyCostsWithPrice('house', form.propertyConfig.house, housePropertyCostKeys, form.propertyConfig.house.purchasePrice, form.propertyConfig.house.purchasePrice)
  syncPropertyCostsWithPrice('apartment', form.propertyConfig.apartment, apartmentPropertyCostKeys, form.propertyConfig.apartment.purchasePrice, form.propertyConfig.apartment.purchasePrice)
}

initialisePropertyCosts()

function syncScenarioSelection(nextPatch = {}) {
  const nextSelectedScenarioKeys = Array.isArray(nextPatch.selectedScenarioKeys)
    ? nextPatch.selectedScenarioKeys
    : form.scenarioSelection.selectedScenarioKeys
  const selectedScenarioKeys = wealthStrategyOrder.filter(key => nextSelectedScenarioKeys.includes(key))

  if (!selectedScenarioKeys.length) return

  const includeStocks = selectedScenarioKeys.some(key => wealthStockStrategyKeys.includes(key))
  const includeHousing = selectedScenarioKeys.some(key => wealthHousingStrategyKeys.includes(key))
  const preferredBaselineKey = nextPatch.stockBaselineKey ?? form.scenarioSelection.stockBaselineKey
  let stockBaselineKey = null

  if (includeStocks) {
    const selectedStockKeys = wealthStockStrategyKeys.filter(key => selectedScenarioKeys.includes(key))
    if (preferredBaselineKey && selectedStockKeys.includes(preferredBaselineKey)) {
      stockBaselineKey = preferredBaselineKey
    } else if (selectedStockKeys.includes(wealthDefaultStockBaselineKey)) {
      stockBaselineKey = wealthDefaultStockBaselineKey
    } else {
      stockBaselineKey = selectedStockKeys[0] || null
    }
  }

  form.scenarioSelection = resolveScenarioSelection({
    ...form.scenarioSelection,
    ...nextPatch,
    includeStocks,
    includeHousing,
    selectedScenarioKeys,
    stockBaselineKey
  })
}

function selectComparisonMode(modeKey) {
  const selectedScenarioKeys = comparisonModeScenarioKeys[modeKey] || comparisonModeScenarioKeys.propertyVsStocks
  const stockBaselineKey = selectedScenarioKeys.includes(wealthDefaultStockBaselineKey)
    ? wealthDefaultStockBaselineKey
    : null

  syncScenarioSelection({
    selectedScenarioKeys,
    stockBaselineKey
  })
}

selectComparisonMode('propertyVsStocks')

function goToInputs() {
  void enterWorkspace()
  currentStage.value = 'inputs'
}

function handleStageSelect(stageKey) {
  if (stageKey === 'results' && !result.value) return
  if (stageKey === 'inputs' && currentStage.value === 'introduction') return
  void enterWorkspace()
  currentStage.value = stageKey
}

function handleSuburbSelect(selection) {
  selectedSuburbSelection.value = selection
  const area = selection?.key ? suburbSearchContext.value.areasByKey[selection.key] : null
  applyAreaMarketToForm(form, area)
}

function cloneRequest() {
  const request = JSON.parse(JSON.stringify(form))
  request.propertyConfig.vacancyRate = clamp(Number(request.propertyConfig.vacancyRate) || wealthVacancyRate, 0, 0.12)
  request.propertyConfig.house.landTax = 0
  request.propertyConfig.apartment.landTax = 0
  request.scenarioSelection = resolveScenarioSelection(request.scenarioSelection)
  return request
}

async function runSimulation() {
  const token = ++runToken
  loading.value = true
  errorMessage.value = ''
  try {
    const response = await client.run(cloneRequest())
    if (token !== runToken) return false
    result.value = response
    resultsStale.value = false
    mutedStrategyKeys.value = []
    if (groupFilter.value !== 'all' && !response.strategyOrder.some(key => strategyMeta[key]?.group === groupFilter.value)) {
      groupFilter.value = 'all'
    }
    lastRunAt.value = new Intl.DateTimeFormat('en-AU', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).format(new Date())
    return true
  } catch (error) {
    if (token !== runToken) return false
    errorMessage.value = error instanceof Error ? error.message : 'Simulation failed.'
    return false
  } finally {
    if (token === runToken) loading.value = false
  }
}

async function generateResults() {
  const ok = await runSimulation()
  if (ok) {
    await enterWorkspace()
    currentStage.value = 'results'
  }
}

async function rerunResults() {
  await runSimulation()
}

function toggleStrategy(key) {
  const next = new Set(mutedStrategyKeys.value)
  if (next.has(key)) next.delete(key)
  else next.add(key)
  mutedStrategyKeys.value = Array.from(next)
}

watch(form, () => {
  resultsStale.value = true
}, { deep: true })

watch(currentStage, (stageKey) => {
  if (stageKey !== 'introduction') {
    void enterWorkspace()
  }
})

watch(
  () => form.profile.horizonYears,
  (value) => {
    form.profile.horizonYears = Math.round(clamp(value, 10, 30))
    const maxLiveAtHomeYears = Math.max(0, form.profile.horizonYears - 1)
    if (form.housingCosts.liveAtHomeYears > maxLiveAtHomeYears) {
      form.housingCosts.liveAtHomeYears = maxLiveAtHomeYears
    }
  }
)

watch(
  () => form.housingCosts.liveAtHome,
  (enabled) => {
    if (!enabled) {
      form.housingCosts.liveAtHomeYears = 0
      return
    }

    if (form.housingCosts.liveAtHomeYears < 1) {
      form.housingCosts.liveAtHomeYears = 1
    }
  }
)

watch(
  availableInputSheetKeys,
  (keys) => {
    if (!keys.includes(activeSheet.value)) activeSheet.value = keys[0]
  },
  { immediate: true }
)

watch(
  () => form.propertyConfig.house.purchasePrice,
  (value, previousValue) => {
    const safeValue = Math.max(0, Number(value) || 0)
    if (safeValue !== value) {
      form.propertyConfig.house.purchasePrice = safeValue
      return
    }
    syncSharedPurchaseCosts('house', form.propertyConfig.house, previousValue, safeValue)
    syncPropertyCostsWithPrice('house', form.propertyConfig.house, housePropertyCostKeys, previousValue, safeValue)
  }
)

watch(
  () => form.propertyConfig.apartment.purchasePrice,
  (value, previousValue) => {
    const safeValue = Math.max(0, Number(value) || 0)
    if (safeValue !== value) {
      form.propertyConfig.apartment.purchasePrice = safeValue
      return
    }
    syncSharedPurchaseCosts('apartment', form.propertyConfig.apartment, previousValue, safeValue)
    syncPropertyCostsWithPrice('apartment', form.propertyConfig.apartment, apartmentPropertyCostKeys, previousValue, safeValue)
  }
)

async function enterWorkspace({ smooth = false } = {}) {
  const wasEntered = hasEnteredWorkspace.value
  hasEnteredWorkspace.value = true
  await nextTick()

  if (!smooth || typeof window === 'undefined') return
  if (wasEntered) return
  workspaceRef.value?.scrollIntoView({ block: 'start', behavior: 'smooth' })
}

function updateWorkspaceState() {
  if (typeof window === 'undefined' || hasEnteredWorkspace.value) return
  const heroHeight = heroRef.value?.offsetHeight || window.innerHeight || 1
  if (window.scrollY > heroHeight * 0.28) {
    void enterWorkspace({ smooth: true })
  }
}

onMounted(() => {
  void loadAreaMarketDefaults()
  updateWorkspaceState()
  window.addEventListener('scroll', updateWorkspaceState, { passive: true })
})

onBeforeUnmount(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('scroll', updateWorkspaceState)
  }
  client.destroy()
})

async function loadAreaMarketDefaults() {
  try {
    const response = await fetch(`${import.meta.env.BASE_URL}data/generated/wealthPsiAreaDefaults.json`, { cache: 'no-store' })
    if (!response.ok) throw new Error(`Failed to load area defaults (${response.status})`)
    areaMarketPayload.value = await response.json()
  } catch (error) {
    console.error(error)
    errorMessage.value = error instanceof Error ? error.message : 'Failed to load area defaults.'
  }
}
</script>

<style scoped>
.wealth-page {
  --wealth-content-max: 1360px;
  color: #173050;
  box-sizing: border-box;
  width: 100vw;
  margin-inline: calc(50% - 50vw);
  padding: 1.3rem clamp(1.2rem, 4vw, 4.4rem) 3rem;
  background:
    radial-gradient(circle at 15% 0%, rgba(56, 189, 248, 0.14), transparent 32%),
    radial-gradient(circle at 84% 8%, rgba(16, 185, 129, 0.12), transparent 28%),
    linear-gradient(180deg, #f8fbff 0%, #eef5ff 48%, #f5f8fd 100%);
}

.wealth-hero,
.wealth-workspace,
.wealth-progress,
.wealth-stage,
.wealth-error {
  width: min(100%, var(--wealth-content-max));
  margin-inline: auto;
}

.wealth-hero {
  max-width: 980px;
  min-height: calc(100vh - 2.6rem);
  display: grid;
  align-content: center;
  justify-items: center;
  gap: 0.9rem;
  padding: clamp(2.4rem, 6vw, 4.8rem) clamp(1.2rem, 4vw, 3rem);
  text-align: center;
  overflow: clip;
  transition:
    min-height 520ms cubic-bezier(0.22, 1, 0.36, 1),
    padding 520ms cubic-bezier(0.22, 1, 0.36, 1),
    gap 420ms cubic-bezier(0.22, 1, 0.36, 1);
}

.wealth-hero.is-entered {
  min-height: 0;
  gap: 0.1rem;
  padding-top: 0.2rem;
  padding-bottom: 0.15rem;
}

.wealth-hero__kicker,
.wealth-banner__kicker {
  margin: 0;
  text-transform: uppercase;
  letter-spacing: 0.16em;
  font-size: 0.74rem;
  color: #5d7ba3;
}

.wealth-hero__kicker {
  transition:
    opacity 340ms cubic-bezier(0.22, 1, 0.36, 1),
    max-height 420ms cubic-bezier(0.22, 1, 0.36, 1),
    transform 420ms cubic-bezier(0.22, 1, 0.36, 1),
    margin 420ms cubic-bezier(0.22, 1, 0.36, 1);
  overflow: hidden;
}

.wealth-hero__title {
  margin: 0.25rem 0 0;
  font-size: clamp(3rem, 2.1rem + 3vw, 5.1rem);
  line-height: 0.94;
  letter-spacing: -0.05em;
  overflow: hidden;
  transition:
    opacity 340ms cubic-bezier(0.22, 1, 0.36, 1),
    max-height 420ms cubic-bezier(0.22, 1, 0.36, 1),
    transform 420ms cubic-bezier(0.22, 1, 0.36, 1),
    margin 420ms cubic-bezier(0.22, 1, 0.36, 1);
}

.wealth-hero.is-entered .wealth-hero__title {
  opacity: 0;
  max-height: 0;
  margin: 0;
  transform: translateY(-18px);
}

.wealth-tagline {
  max-width: 44rem;
  margin: 1rem auto 0;
  color: #3e5d81;
  font-size: clamp(1.02rem, 0.96rem + 0.55vw, 1.28rem);
  line-height: 1.5;
  overflow: hidden;
  transition:
    opacity 340ms cubic-bezier(0.22, 1, 0.36, 1),
    max-height 420ms cubic-bezier(0.22, 1, 0.36, 1),
    transform 420ms cubic-bezier(0.22, 1, 0.36, 1),
    margin 420ms cubic-bezier(0.22, 1, 0.36, 1);
}

.wealth-hero__description {
  max-width: 46rem;
  margin: 1.1rem auto 0;
  color: #536d90;
  line-height: 1.7;
  overflow: hidden;
  transition:
    opacity 340ms cubic-bezier(0.22, 1, 0.36, 1),
    max-height 420ms cubic-bezier(0.22, 1, 0.36, 1),
    transform 420ms cubic-bezier(0.22, 1, 0.36, 1),
    margin 420ms cubic-bezier(0.22, 1, 0.36, 1);
}

.wealth-hero.is-entered .wealth-hero__kicker,
.wealth-hero.is-entered .wealth-tagline,
.wealth-hero.is-entered .wealth-hero__description {
  opacity: 0;
  max-height: 0;
  margin: 0;
  transform: translateY(-18px);
}

.wealth-hero__scroll {
  margin: 0.5rem 0 0;
  color: #5d7ba3;
  font-size: 0.8rem;
  letter-spacing: 0.18em;
  text-transform: uppercase;
}

.wealth-workspace {
  opacity: 0.9;
  transform: translateY(34px);
  transition:
    opacity 360ms cubic-bezier(0.22, 1, 0.36, 1),
    transform 560ms cubic-bezier(0.22, 1, 0.36, 1);
}

.wealth-workspace.is-entered {
  opacity: 1;
  transform: translateY(0);
}

.wealth-stage {
  display: grid;
  gap: 1rem;
  margin-top: 1rem;
}

.wealth-stage-footer,
.wealth-results-toolbar,
.wealth-banner,
.wealth-banner__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.wealth-stage-footer,
.wealth-results-toolbar,
.wealth-banner {
  justify-content: space-between;
  align-items: center;
}

.wealth-banner,
.wealth-page :deep(.card) {
  border: 1px solid rgba(154, 174, 204, 0.22);
  background: rgba(255, 255, 255, 0.92);
  box-shadow: 0 18px 38px rgba(95, 122, 160, 0.12);
  border-radius: 24px;
}

.wealth-banner {
  padding: 1rem 1.1rem;
}

.wealth-banner h2 {
  margin: 0.2rem 0 0;
}

.wealth-pill {
  padding: 0.45rem 0.75rem;
  border-radius: 999px;
  background: rgba(224, 242, 254, 0.86);
  color: #0c4a6e;
  white-space: nowrap;
}

.wealth-pill--housing {
  background: rgba(220, 252, 231, 0.86);
  color: #166534;
}

.wealth-primary-btn,
.wealth-secondary-btn {
  border: 1px solid rgba(154, 174, 204, 0.24);
  border-radius: 999px;
  padding: 0.7rem 1.05rem;
  font: inherit;
  cursor: pointer;
  transition: transform 120ms ease, border-color 120ms ease, background 120ms ease;
}

.wealth-primary-btn {
  background: linear-gradient(135deg, #8fd3ff, #bce4ff);
  color: #0f2848;
}

.wealth-secondary-btn {
  background: rgba(244, 248, 255, 0.96);
  color: #27415f;
}

.wealth-primary-btn:hover,
.wealth-secondary-btn:hover:not(:disabled) {
  transform: translateY(-1px);
}

.wealth-secondary-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.wealth-error {
  margin-top: 1rem;
  padding: 0.95rem 1rem;
  border-radius: 18px;
  background: rgba(254, 242, 242, 0.95);
  border: 1px solid rgba(248, 113, 113, 0.24);
  color: #b91c1c;
}

.wealth-stage-slide-enter-active,
.wealth-stage-slide-leave-active {
  transition: opacity 180ms ease, transform 180ms ease;
}

.wealth-stage-slide-enter-from,
.wealth-stage-slide-leave-to {
  opacity: 0;
  transform: translateX(24px);
}

@media (max-width: 720px) {
  .wealth-page {
    padding: 1rem 1rem 2.4rem;
  }

  .wealth-hero {
    min-height: calc(100vh - 2rem);
  }

  .wealth-banner,
  .wealth-stage-footer,
  .wealth-results-toolbar {
    align-items: stretch;
  }
}
</style>
