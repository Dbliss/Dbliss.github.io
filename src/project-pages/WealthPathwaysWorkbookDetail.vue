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
        v-if="!isRegionScoutMode"
        :stages="stageDefinitions"
        :current-stage="currentStage"
        :current-substep="activeSheet"
        :substeps="inputStageSubsteps"
        substep-host-key="inputs"
        :stage-disabled-keys="disabledStageKeys"
        :completed-substep-keys="completedInputSheetKeys"
        :substep-disabled-keys="disabledInputSheetKeys"
        @select-stage="handleStageSelect"
        @select-substep="handleSubstepSelect"
      />

      <div v-if="errorMessage" class="wealth-error">{{ errorMessage }}</div>

      <div v-if="showResultsLoadingScreen" class="wealth-results-loading-overlay">
        <div class="wealth-results-loading card">
          <p class="wealth-results-loading__eyebrow">{{ loadingScreenContent.eyebrow }}</p>
          <h3>{{ loadingScreenContent.title }}</h3>
          <p>{{ loadingScreenContent.copy }}</p>
          <div class="wealth-results-loading__spinner" aria-hidden="true"></div>
        </div>
      </div>

      <Transition name="wealth-stage-slide" mode="out-in">
        <section :key="currentStage" class="wealth-stage">
        <template v-if="currentStage === 'interests'">
          <WealthInterestStep
            :scenario-selection="form.scenarioSelection"
            :selected-mode="selectedComparisonMode"
            @select-mode="selectComparisonMode"
          />
          <div class="wealth-stage-footer">
            <button type="button" class="wealth-secondary-btn" disabled>Back</button>
          </div>
        </template>

        <template v-else-if="currentStage === 'situation'">
          <WealthIntroStep :form="form" />
          <div class="wealth-stage-footer">
            <button type="button" class="wealth-secondary-btn" @click="currentStage = 'interests'">Back: Interests</button>
            <p v-if="situationStageMessage" class="wealth-stage-hint">{{ situationStageMessage }}</p>
            <button type="button" class="wealth-primary-btn" :disabled="!canProceedToInputs" @click="goToInputs">Next: Inputs</button>
          </div>
        </template>

        <template v-else-if="currentStage === 'inputs'">
          <WealthInputWorkbook
            :form="form"
            :active-sheet="activeSheet"
            :scenario-selection="form.scenarioSelection"
            :region-scout-config="regionScoutConfig"
            :suburb-search-context="suburbSearchContext"
            :selected-apartment-area-selection="selectedApartmentAreaSelection"
            :selected-apartment-area-record="selectedApartmentAreaRecord"
            :selected-apartment-area-preview="selectedApartmentAreaPreview"
            :selected-house-area-selection="selectedHouseAreaSelection"
            :selected-house-area-record="selectedHouseAreaRecord"
            :selected-house-area-preview="selectedHouseAreaPreview"
            @select-property-area="handlePropertyAreaSelect"
          />

          <div class="wealth-stage-footer" :class="{ 'wealth-stage-footer--scout': activeSheet === 'regionScout' }">
            <button type="button" class="wealth-secondary-btn" @click="goToPreviousInputStep">
              {{ activeSheet === firstInputSheet ? `Back: ${firstInputSheetBackLabel}` : `Back: ${previousInputSheetLabel}` }}
            </button>
            <p v-if="activeInputSheetMessage" class="wealth-stage-hint">{{ activeInputSheetMessage }}</p>
            <button
              type="button"
              class="wealth-primary-btn"
              data-testid="continue-results"
              :disabled="loading || !activeInputSheetComplete"
              @click="goToNextInputStep"
            >
              {{ loading ? 'Running simulation...' : inputPrimaryActionLabel }}
            </button>
          </div>
        </template>

        <template v-else>
          <div v-if="selectedComparisonMode === 'regionScout'" class="wealth-region-scout-stage">
            <div class="wealth-stage-footer wealth-stage-footer--scout-results">
              <button type="button" class="wealth-secondary-btn" @click="goToSuburbSearch">Back: Suburb search</button>
            </div>
            <WealthRegionScoutStep
              view="results"
              :scout-config="regionScoutConfig"
              :suburb-search-context="suburbSearchContext"
              @loading-change="handleRegionScoutLoadingChange"
            />
          </div>
          <WealthResultsDashboard
            v-else
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
import WealthRegionScoutStep from '../components/wealth/WealthRegionScoutStep.vue'
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
import { estimateGenericPurchaseCosts, estimatePropertyCostFromPrice, clamp } from '../wealth/finance.js'
import { WealthSimulationClient } from '../wealth/client.js'
import { buildDashboardModel } from '../wealth/dashboard.js'
import {
  NSW_HOME_GUARANTEE_HIGH_CAP_LIMIT,
  buildAreaSearchContext,
  createPropertyConfigPatchFromArea,
  getFirstHomeBuyerLowDepositLimitForArea
} from '../wealth/areaMarket.js'
import { wealthPsiRegionMarketPayload } from '../wealth/psiRegionMarket.js'

const props = defineProps({
  project: { type: Object, required: true }
})

const allStageDefinitions = [
  { key: 'interests', label: 'Interests' },
  { key: 'situation', label: 'Your Situation' },
  { key: 'inputs', label: 'Inputs' },
  { key: 'results', label: 'Results' }
]
const comparisonModeScenarioKeys = {
  portfolioDeepDive: [...wealthStockStrategyKeys],
  propertyVsStocks: [wealthDefaultStockBaselineKey, ...wealthHousingStrategyKeys],
  propertyInvestmentVsLiving: [...wealthHousingStrategyKeys]
}

const housePropertyCostKeys = ['councilRates', 'waterRates', 'insurance', 'maintenance', 'landTax', 'borrowingExpensesTotal', 'otherDeductibleExpensesAnnual']
const apartmentPropertyCostKeys = ['councilRates', 'waterRates', 'insurance', 'maintenance', 'strata', 'landTax', 'borrowingExpensesTotal', 'otherDeductibleExpensesAnnual']

const form = reactive(cloneSimulationRequest())
form.propertyConfig.vacancyRate = wealthVacancyRate
form.scenarioSelection = resolveScenarioSelection(form.scenarioSelection)

const strategyMeta = getWealthStrategyMeta()
const client = new WealthSimulationClient()
const currentStage = ref('interests')
const activeSheet = ref('stock')
const selectedComparisonMode = ref(null)
const hasEnteredWorkspace = ref(false)
const result = ref(null)
const loading = ref(false)
const errorMessage = ref('')
const lastRunAt = ref('')
const resultsStale = ref(true)
const regionScoutLoadingScreen = ref(false)
const resultsLoadingScreen = ref(false)
const mutedStrategyKeys = ref([])
const groupFilter = ref('all')
const resultMetric = ref('sellDown')
const selectedApartmentAreaSelection = ref(null)
const selectedHouseAreaSelection = ref(null)
const areaMarketPayload = ref(wealthPsiRegionMarketPayload)
const regionScoutConfig = reactive({
  budget: 800000,
  propertyType: 'apartment',
  granularity: 'suburb',
  locationKey: null,
  rentalYieldWeight: 0,
  riskAppetite: 5
})
const heroRef = ref(null)
const workspaceRef = ref(null)
let runToken = 0
let isEnforcingWorkspaceScroll = false
const workspaceRevealOffset = 104

// The region scout is a pure market search, so it skips the personal-situation stage.
const isRegionScoutMode = computed(() => selectedComparisonMode.value === 'regionScout')
const stageDefinitions = computed(() =>
  allStageDefinitions.filter((stage) => !(isRegionScoutMode.value && stage.key === 'situation'))
)

const suburbSearchContext = computed(() => buildAreaSearchContext(areaMarketPayload.value))
const selectedApartmentAreaRecord = computed(() => {
  const key = selectedApartmentAreaSelection.value?.key
  return key ? suburbSearchContext.value.areasByKey[key] || null : null
})
const selectedHouseAreaRecord = computed(() => {
  const key = selectedHouseAreaSelection.value?.key
  return key ? suburbSearchContext.value.areasByKey[key] || null : null
})
const selectedApartmentAreaPreview = computed(() => createPropertyConfigPatchFromArea(selectedApartmentAreaRecord.value) || {
  house: null,
  apartment: null,
  regionKey: null,
  subregionKey: null,
  houseGrowthYears: 0,
  apartmentGrowthYears: 0
})
const selectedHouseAreaPreview = computed(() => createPropertyConfigPatchFromArea(selectedHouseAreaRecord.value) || {
  house: null,
  apartment: null,
  regionKey: null,
  subregionKey: null,
  houseGrowthYears: 0,
  apartmentGrowthYears: 0
})
const showResultsLoadingScreen = computed(() =>
  regionScoutLoadingScreen.value || resultsLoadingScreen.value
)
const loadingScreenContent = computed(() => {
  if (selectedComparisonMode.value === 'regionScout') {
    return {
      eyebrow: 'Calculating shortlist',
      title: 'Ranking the best suburbs',
      copy: 'Comparing affordability, growth, yield, and timing for your current settings.'
    }
  }

  return {
    eyebrow: 'Running simulation',
    title: 'Building your results dashboard',
    copy: 'Calculating every pathway across your current assumptions before loading the comparison view.'
  }
})

const availableInputSheetKeys = computed(() => {
  if (!selectedComparisonMode.value) return []
  if (selectedComparisonMode.value === 'regionScout') return ['regionScout']
  const keys = []
  if (form.scenarioSelection.includeStocks) keys.push('stock')
  if (form.scenarioSelection.includeHousing) keys.push('apartment', 'house')
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
    ? buildDashboardModel(result.value, form.scenarioSelection.stockBaselineKey, form.housingCosts.rentGrowthRate, form)
    : emptyDashboard
)

const inputStageSubsteps = computed(() =>
  availableInputSheetKeys.value.map((sheetKey) => ({
    key: sheetKey,
    label:
      sheetKey === 'stock'
        ? 'Stock assumptions'
        : sheetKey === 'regionScout'
          ? 'Suburb search'
        : sheetKey === 'apartment'
          ? 'Apartment assumptions'
          : sheetKey === 'house'
            ? 'House assumptions'
            : sheetKey
  }))
)

function isStockSheetComplete() {
  const weights = [
    Number(form.portfolioConfig.asxWeight) || 0,
    Number(form.portfolioConfig.qqqWeight) || 0,
    Number(form.portfolioConfig.vgsWeight) || 0,
    Number(form.portfolioConfig.vgeWeight) || 0,
    Number(form.portfolioConfig.dbpWeight) || 0,
    Number(form.portfolioConfig.bondWeight) || 0,
    Number(form.portfolioConfig.cashWeight) || 0,
    Number(form.portfolioConfig.bitcoinWeight) || 0
  ]
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0)
  return totalWeight > 0 && Math.abs(totalWeight - 1) < 0.011
}

function isPropertySheetComplete(propertyType) {
  const selection = propertyType === 'apartment'
    ? selectedApartmentAreaSelection.value
    : selectedHouseAreaSelection.value
  const record = propertyType === 'apartment'
    ? selectedApartmentAreaRecord.value
    : selectedHouseAreaRecord.value
  const preview = propertyType === 'apartment'
    ? selectedApartmentAreaPreview.value
    : selectedHouseAreaPreview.value

  const purchasePrice = Number(preview?.[propertyType]?.purchasePrice) || 0
  const actualPoints = record?.marketHistory?.[propertyType]?.actualPoints || []

  if (!selection?.key || !record) return false
  if (!(purchasePrice > 0 && actualPoints.length > 0)) return false

  const property = form.propertyConfig[propertyType]
  return Number(property?.purchasePrice) > 0
}

function getInputSheetState(sheetKey) {
  if (sheetKey === 'stock') {
    return isStockSheetComplete()
      ? { complete: true, message: '' }
      : { complete: false, message: 'Set a valid 100% portfolio mix before continuing.' }
  }

  if (sheetKey === 'apartment') {
    return isPropertySheetComplete('apartment')
      ? { complete: true, message: '' }
      : { complete: false, message: 'Select an apartment area before continuing.' }
  }

  if (sheetKey === 'house') {
    return isPropertySheetComplete('house')
      ? { complete: true, message: '' }
      : { complete: false, message: 'Select a house area before continuing.' }
  }

  if (sheetKey === 'regionScout') {
    if (!(Number(regionScoutConfig.budget) > 0)) {
      return { complete: false, message: 'Enter a budget before searching.' }
    }

    // A null location means "all of NSW"; a set one has to resolve to a real region.
    const hasValidLocation = !regionScoutConfig.locationKey
      || Boolean(suburbSearchContext.value.areasByKey[regionScoutConfig.locationKey])

    return hasValidLocation
      ? { complete: true, message: '' }
      : { complete: false, message: 'Choose which region the scout should search before continuing.' }
  }

  return { complete: true, message: '' }
}

const completedInputSheetKeys = computed(() =>
  availableInputSheetKeys.value.filter(sheetKey => getInputSheetState(sheetKey).complete)
)

const firstIncompleteInputSheetIndex = computed(() =>
  availableInputSheetKeys.value.findIndex(sheetKey => !getInputSheetState(sheetKey).complete)
)

const furthestUnlockedInputSheetIndex = computed(() => {
  const firstIncompleteIndex = firstIncompleteInputSheetIndex.value
  if (firstIncompleteIndex < 0) return Math.max(availableInputSheetKeys.value.length - 1, 0)
  return firstIncompleteIndex
})

const disabledInputSheetKeys = computed(() =>
  availableInputSheetKeys.value.filter((sheetKey, index) => index > furthestUnlockedInputSheetIndex.value)
)

const allInputSheetsComplete = computed(() =>
  availableInputSheetKeys.value.every(sheetKey => getInputSheetState(sheetKey).complete)
)

const activeInputSheetState = computed(() => getInputSheetState(activeSheet.value))
const activeInputSheetComplete = computed(() => activeInputSheetState.value.complete)
const activeInputSheetMessage = computed(() => activeInputSheetState.value.message)
const activeInputSheetIndex = computed(() => availableInputSheetKeys.value.indexOf(activeSheet.value))
const firstInputSheet = computed(() => availableInputSheetKeys.value[0] || '')
const isLastInputSheet = computed(() =>
  activeInputSheetIndex.value >= 0 && activeInputSheetIndex.value === availableInputSheetKeys.value.length - 1
)

const nextInputSheet = computed(() =>
  !isLastInputSheet.value && activeInputSheetIndex.value >= 0
    ? availableInputSheetKeys.value[activeInputSheetIndex.value + 1]
    : ''
)

const previousInputSheet = computed(() =>
  activeInputSheetIndex.value > 0
    ? availableInputSheetKeys.value[activeInputSheetIndex.value - 1]
    : ''
)

function getSheetLabel(sheetKey) {
  return inputStageSubsteps.value.find((substep) => substep.key === sheetKey)?.label || sheetKey
}

const previousInputSheetLabel = computed(() => getSheetLabel(previousInputSheet.value))
const nextInputSheetLabel = computed(() => getSheetLabel(nextInputSheet.value))
const inputPrimaryActionLabel = computed(() => {
  if (!isLastInputSheet.value) return `Next: ${nextInputSheetLabel.value}`
  return isRegionScoutMode.value ? 'Search areas' : 'Generate results'
})
const firstInputSheetBackLabel = computed(() =>
  isRegionScoutMode.value ? 'Interests' : 'Your Situation'
)
const situationStageState = computed(() => ({ complete: true, message: '' }))
const canProceedToInputs = computed(() => situationStageState.value.complete)
const situationStageMessage = computed(() => situationStageState.value.message)
const disabledStageKeys = computed(() => {
  const keys = []
  if (!selectedComparisonMode.value) keys.push('situation')
  if (!selectedComparisonMode.value || !canProceedToInputs.value) keys.push('inputs')
  if (!((selectedComparisonMode.value === 'regionScout' || result.value) && allInputSheetsComplete.value)) keys.push('results')
  return keys
})

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
  const safeValue = Math.round(Math.max(0, Number(value) || 0))
  property.ownerPurchaseCosts[key] = safeValue
  property.investmentPurchaseCosts[key] = safeValue
}

function syncSharedPurchaseCosts(propertyType, property, previousPrice, nextPrice) {
  const safeNextPrice = Math.max(0, Number(nextPrice) || 0)
  const estimatedCosts = estimateGenericPurchaseCosts(safeNextPrice, propertyType)

  setSharedPurchaseCost(property, 'stampDuty', Math.round(estimatedCosts.stampDuty))
  setSharedPurchaseCost(property, 'legalFees', Math.round(estimatedCosts.legalFees))
  setSharedPurchaseCost(property, 'buyersCosts', Math.round(estimatedCosts.buyersCosts))
}

function syncPropertyCostsWithPrice(propertyType, property, keys, previousPrice, nextPrice) {
  const safeNextPrice = Math.max(0, Number(nextPrice) || 0)
  if (safeNextPrice <= 0) {
    keys.forEach((key) => {
      property[key] = 0
    })
    return
  }

  keys.forEach((key) => {
    property[key] = Math.round(estimatePropertyCostFromPrice(propertyType, key, safeNextPrice))
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
  selectedComparisonMode.value = modeKey
  const selectedScenarioKeys = comparisonModeScenarioKeys[modeKey] || comparisonModeScenarioKeys.propertyVsStocks
  const stockBaselineKey = selectedScenarioKeys.includes(wealthDefaultStockBaselineKey)
    ? wealthDefaultStockBaselineKey
    : null

  syncScenarioSelection({
    selectedScenarioKeys,
    stockBaselineKey
  })

  if (currentStage.value !== 'interests') return

  if (modeKey === 'regionScout') {
    void enterWorkspace()
    currentStage.value = 'inputs'
    activeSheet.value = 'regionScout'
    return
  }

  goToSituation()
}

function goToSituation() {
  void enterWorkspace()
  currentStage.value = 'situation'
}

function goToInputs() {
  if (!canProceedToInputs.value) return
  void enterWorkspace()
  currentStage.value = 'inputs'
  activeSheet.value = firstInputSheet.value
}

// The scout pathway hides the stage bar, so results need their own way back to the form.
function goToSuburbSearch() {
  currentStage.value = 'inputs'
  activeSheet.value = 'regionScout'
}

function handleStageSelect(stageKey) {
  if (disabledStageKeys.value.includes(stageKey)) return
  if (stageKey === 'inputs' && currentStage.value === 'interests') return
  void enterWorkspace()
  currentStage.value = stageKey
}

function handleSubstepSelect(sheetKey) {
  if (!availableInputSheetKeys.value.includes(sheetKey)) return
  if (disabledInputSheetKeys.value.includes(sheetKey)) return
  activeSheet.value = sheetKey
}

function goToPreviousInputStep() {
  if (previousInputSheet.value) {
    activeSheet.value = previousInputSheet.value
    return
  }

  currentStage.value = isRegionScoutMode.value ? 'interests' : 'situation'
}

async function goToNextInputStep() {
  if (!activeInputSheetComplete.value) return

  if (!isLastInputSheet.value) {
    activeSheet.value = nextInputSheet.value
    return
  }

  await generateResults()
}

function applyAreaPatchToProperty(propertyType, selection) {
  const area = selection?.key ? suburbSearchContext.value.areasByKey[selection.key] : null
  const patch = createPropertyConfigPatchFromArea(area)
  const property = form.propertyConfig[propertyType]
  property.firstHomeBuyerLowDepositLimit = area
    ? getFirstHomeBuyerLowDepositLimitForArea(area)
    : NSW_HOME_GUARANTEE_HIGH_CAP_LIMIT
  if (!patch?.[propertyType]) {
    property.yieldModel = null
    property.rentYield = 0
    return
  }

  Object.entries(patch[propertyType]).forEach(([key, value]) => {
    if (key === 'historicalAnnualGrowthRates') {
      form.propertyConfig[propertyType][key] = Array.isArray(value) ? [...value] : []
      return
    }
    if (key === 'yieldModel') {
      form.propertyConfig[propertyType][key] = value ? JSON.parse(JSON.stringify(value)) : null
      form.propertyConfig[propertyType].rentYield = Number(value?.currentYield) || 0
      return
    }
    if (Number.isFinite(Number(value))) {
      form.propertyConfig[propertyType][key] = value
    }
  })

  syncSharedPurchaseCosts(propertyType, property, property.purchasePrice, property.purchasePrice)
  syncPropertyCostsWithPrice(
    propertyType,
    property,
    propertyType === 'house' ? housePropertyCostKeys : apartmentPropertyCostKeys,
    property.purchasePrice,
    property.purchasePrice
  )
}

function syncJointGrowthBlocks() {
  const apartmentKey = selectedApartmentAreaSelection.value?.key || null
  const houseKey = selectedHouseAreaSelection.value?.key || null

  if (!apartmentKey || apartmentKey !== houseKey) {
    form.propertyConfig.historicalAnnualGrowthBlocks = []
    return
  }

  const patch = createPropertyConfigPatchFromArea(selectedApartmentAreaRecord.value)
  form.propertyConfig.historicalAnnualGrowthBlocks = Array.isArray(patch?.historicalAnnualGrowthBlocks)
    ? patch.historicalAnnualGrowthBlocks.map((block) => ({ ...block }))
    : []
}

function handlePropertyAreaSelect({ propertyType, selection }) {
  if (propertyType === 'apartment') {
    selectedApartmentAreaSelection.value = selection || null
  } else if (propertyType === 'house') {
    selectedHouseAreaSelection.value = selection || null
  } else {
    return
  }

  applyAreaPatchToProperty(propertyType, selection)
  syncJointGrowthBlocks()
}

function cloneRequest() {
  const request = JSON.parse(JSON.stringify(form))
  request.propertyConfig.vacancyRate = clamp(Number(request.propertyConfig.vacancyRate) || wealthVacancyRate, 0, 0.12)
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
  if (!allInputSheetsComplete.value) return

  if (selectedComparisonMode.value === 'regionScout') {
    regionScoutLoadingScreen.value = true
    await enterWorkspace()
    currentStage.value = 'results'
    return
  }

  resultsLoadingScreen.value = true
  await enterWorkspace()
  currentStage.value = 'results'
  try {
    const ok = await runSimulation()
    if (!ok) {
      currentStage.value = 'inputs'
    }
  } finally {
    resultsLoadingScreen.value = false
  }
}

function toggleStrategy(key) {
  const next = new Set(mutedStrategyKeys.value)
  if (next.has(key)) next.delete(key)
  else next.add(key)
  mutedStrategyKeys.value = Array.from(next)
}

function handleRegionScoutLoadingChange(isLoading) {
  regionScoutLoadingScreen.value = Boolean(isLoading)
}

watch(form, () => {
  resultsStale.value = true
}, { deep: true })

watch(currentStage, (stageKey) => {
  if (stageKey !== 'interests') {
    void enterWorkspace()
  }
  if (stageKey === 'results') {
    void scrollResultsToTop()
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

  if (!smooth || typeof window === 'undefined' || wasEntered) return
  window.scrollTo({ top: getWorkspaceTop(), behavior: 'smooth' })
}

async function scrollResultsToTop() {
  await nextTick()
  if (typeof window !== 'undefined') {
    window.scrollTo({ top: 0, behavior: 'auto' })
  }
  workspaceRef.value?.scrollTo?.({ top: 0, behavior: 'auto' })
}

function getWorkspaceTop() {
  if (typeof window === 'undefined') return 0
  const rectTop = workspaceRef.value?.getBoundingClientRect?.().top || 0
  return Math.max(0, Math.round(window.scrollY + rectTop - workspaceRevealOffset))
}

function enforceWorkspaceTopBoundary() {
  if (typeof window === 'undefined' || !hasEnteredWorkspace.value || isEnforcingWorkspaceScroll) return
  const workspaceTop = getWorkspaceTop()
  if (window.scrollY >= workspaceTop - 2) return

  isEnforcingWorkspaceScroll = true
  window.scrollTo({ top: workspaceTop, behavior: 'auto' })
  window.requestAnimationFrame(() => {
    isEnforcingWorkspaceScroll = false
  })
}

function updateWorkspaceState() {
  if (typeof window === 'undefined') return
  if (hasEnteredWorkspace.value) {
    enforceWorkspaceTopBoundary()
    return
  }
  const heroHeight = heroRef.value?.offsetHeight || window.innerHeight || 1
  if (window.scrollY > heroHeight * 0.28) {
    void enterWorkspace({ smooth: true })
  }
}

onMounted(() => {
  updateWorkspaceState()
  window.addEventListener('scroll', updateWorkspaceState, { passive: true })
})

onBeforeUnmount(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('scroll', updateWorkspaceState)
  }
  client.destroy()
})
</script>

<style scoped>
.wealth-page {
  --wealth-content-max: 1360px;
  /* Shared by the region scout form and its footer so both stay on the same column. */
  --wealth-scout-max: 64rem;
  color: #173050;
  box-sizing: border-box;
  position: relative;
  width: 100vw;
  margin-inline: calc(50% - 50vw);
  padding: 1.3rem clamp(1.2rem, 4vw, 4.4rem) 3rem;
  background:
    radial-gradient(circle at 15% 0%, rgba(56, 189, 248, 0.14), transparent 32%),
    radial-gradient(circle at 84% 8%, rgba(16, 185, 129, 0.12), transparent 28%),
    linear-gradient(180deg, #f8fbff 0%, #eef5ff 48%, #f5f8fd 100%);
}

.wealth-page::before {
  content: "";
  position: absolute;
  top: -1.2rem;
  left: 0;
  right: 0;
  height: 1.2rem;
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
    opacity 420ms cubic-bezier(0.22, 1, 0.36, 1),
    transform 520ms cubic-bezier(0.22, 1, 0.36, 1),
    filter 520ms cubic-bezier(0.22, 1, 0.36, 1);
}

.wealth-hero.is-entered {
  opacity: 0.38;
  transform: translateY(-2.75rem) scale(0.985);
  filter: blur(8px);
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
  transition: opacity 260ms ease;
}

.wealth-hero__title {
  margin: 0.25rem 0 0;
  font-size: clamp(3rem, 2.1rem + 3vw, 5.1rem);
  line-height: 0.94;
  letter-spacing: -0.05em;
  transition: opacity 260ms ease;
}

.wealth-tagline {
  max-width: 44rem;
  margin: 1rem auto 0;
  color: #3e5d81;
  font-size: clamp(1.02rem, 0.96rem + 0.55vw, 1.28rem);
  line-height: 1.5;
  transition: opacity 260ms ease;
}

.wealth-hero__description {
  max-width: 46rem;
  margin: 1.1rem auto 0;
  color: #536d90;
  line-height: 1.7;
  transition: opacity 260ms ease;
}

.wealth-hero.is-entered .wealth-hero__kicker,
.wealth-hero.is-entered .wealth-hero__title,
.wealth-hero.is-entered .wealth-tagline,
.wealth-hero.is-entered .wealth-hero__description {
  opacity: 0.12;
}

.wealth-hero__scroll {
  margin: 0.5rem 0 0;
  color: #5d7ba3;
  font-size: 0.8rem;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  transition: opacity 220ms ease, transform 220ms ease;
}

.wealth-hero.is-entered .wealth-hero__scroll {
  opacity: 0;
  transform: translateY(-0.5rem);
}

.wealth-workspace {
  position: relative;
  opacity: 0.72;
  transform: translateY(2rem);
  transition:
    opacity 420ms cubic-bezier(0.22, 1, 0.36, 1),
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
.wealth-banner__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.wealth-stage-footer,
.wealth-banner {
  justify-content: space-between;
  align-items: center;
}

.wealth-stage-footer--scout {
  width: min(100%, var(--wealth-scout-max));
  margin-inline: auto;
}

.wealth-stage-hint {
  flex: 1 1 18rem;
  margin: 0;
  color: #5d7394;
  line-height: 1.5;
}

.wealth-page :deep(.card) {
  border: 1px solid rgba(154, 174, 204, 0.22);
  background: rgba(255, 255, 255, 0.92);
  box-shadow: 0 18px 38px rgba(95, 122, 160, 0.12);
  border-radius: 24px;
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

.wealth-primary-btn:disabled,
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

.wealth-region-scout-stage {
  display: grid;
  gap: 0.85rem;
}

.wealth-stage-footer--scout-results {
  justify-content: flex-start;
}

.wealth-results-loading-overlay {
  position: absolute;
  inset: 0;
  z-index: 30;
  display: grid;
  align-items: start;
  padding-top: 1rem;
  background: rgba(243, 248, 255, 0.82);
  backdrop-filter: blur(4px);
}

.wealth-results-loading {
  display: grid;
  gap: 0.85rem;
  place-items: center;
  min-height: 22rem;
  padding: 2.2rem;
  text-align: center;
}

.wealth-results-loading__eyebrow {
  margin: 0;
  text-transform: uppercase;
  letter-spacing: 0.16em;
  font-size: 0.74rem;
  color: #5d7ba3;
}

.wealth-results-loading h3 {
  margin: 0.15rem 0 0;
  color: #173050;
}

.wealth-results-loading p {
  margin: 0;
  color: #5d7394;
  line-height: 1.55;
}

.wealth-results-loading__spinner {
  width: 3.2rem;
  height: 3.2rem;
  border-radius: 999px;
  border: 4px solid rgba(154, 174, 204, 0.26);
  border-top-color: #173050;
  animation: wealth-region-scout-spin 0.85s linear infinite;
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

@keyframes wealth-region-scout-spin {
  from {
    transform: rotate(0deg);
  }

  to {
    transform: rotate(360deg);
  }
}

@media (min-width: 1200px) {
  .wealth-page {
    --wealth-scout-max: 70rem;
  }
}

@media (min-width: 1560px) {
  .wealth-page {
    --wealth-scout-max: 76rem;
  }
}

@media (max-width: 720px) {
  .wealth-page {
    padding: 1rem 1rem 2.4rem;
  }

  .wealth-hero {
    min-height: calc(100vh - 2rem);
  }

  .wealth-banner,
  .wealth-stage-footer {
    align-items: stretch;
  }

  .wealth-stage-footer {
    display: grid;
    grid-template-columns: 1fr;
  }

  .wealth-primary-btn,
  .wealth-secondary-btn {
    width: 100%;
    justify-content: center;
  }
}
</style>
