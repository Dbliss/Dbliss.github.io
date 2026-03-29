<template>
  <section class="wealth-workbook card">
    <div class="wealth-workbook__header">
      <div>
        <p class="wealth-workbook__kicker">Inputs</p>
        <h2>Move through the workbook sheets</h2>
      </div>
      <p class="wealth-workbook__copy">
        Each sheet controls a different part of the model. Irrelevant sheets stay hidden so the flow stays focused.
      </p>
    </div>

    <div class="wealth-workbook__tabs">
      <button
        v-for="sheet in availableSheets"
        :key="sheet.key"
        type="button"
        class="wealth-workbook__tab"
        :class="{ 'is-active': activeSheet === sheet.key }"
        @click="$emit('update:activeSheet', sheet.key)"
      >
        {{ sheet.label }}
      </button>
    </div>

    <Transition name="wealth-sheet-slide" mode="out-in">
      <section :key="activeSheet" class="wealth-workbook__panel">
        <template v-if="activeSheet === 'stock'">
          <div class="wealth-workbook__panel-head">
            <h3>Stock assumptions</h3>
            <p>The portfolio baseline uses this live sleeve mix, while the single-asset stock scenarios still show the pure QQQ, ASX200, bond, cash, and bitcoin tracks.</p>
          </div>
          <div class="wealth-workbook__allocation-grid">
            <label
              v-for="allocation in allocationFields"
              :key="allocation.key"
              class="wealth-workbook__allocation"
              :class="{ 'is-locked': isLocked(allocation.key) }"
            >
              <span class="wealth-workbook__allocation-head">
                <span class="wealth-workbook__allocation-title">
                  <i class="wealth-workbook__allocation-swatch" :style="{ background: allocation.color }"></i>
                  {{ allocation.label }}
                </span>
                <button
                  type="button"
                  class="wealth-workbook__lock-btn"
                  :class="{ 'is-active': isLocked(allocation.key) }"
                  :aria-pressed="isLocked(allocation.key)"
                  @click.prevent="toggleLock(allocation.key)"
                >
                  {{ isLocked(allocation.key) ? 'Locked' : 'Lock' }}
                </button>
              </span>
              <div class="wealth-workbook__allocation-controls">
                <input
                  :value="getAllocationPct(allocation.key)"
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  :disabled="isLocked(allocation.key) && !hasUnlockedPeers(allocation.key)"
                  @input="handleAllocationInput(allocation.key, $event)"
                />
                <input
                  :value="getAllocationPct(allocation.key)"
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  :disabled="isLocked(allocation.key) && !hasUnlockedPeers(allocation.key)"
                  @input="handleAllocationInput(allocation.key, $event)"
                />
              </div>
            </label>
          </div>
          <div class="wealth-workbook__bootstrap-grid">
            <article
              v-for="asset in bootstrapAssets"
              :key="asset.key"
              class="wealth-workbook__bootstrap-card"
            >
              <div class="wealth-workbook__bootstrap-top">
                <strong>{{ asset.label }}</strong>
                <span>{{ asset.ticker }}</span>
              </div>
              <p>
                {{ asset.lookbackYears }} year bootstrap window from {{ asset.startMonth }} to {{ asset.endMonth }}.
              </p>
              <span>{{ asset.months }} historical months in the bootstrap pool.</span>
            </article>
          </div>
          <p class="wealth-workbook__note">
            {{ bootstrapSamplingNote }}
          </p>
        </template>

        <template v-else-if="activeSheet === 'housingSetup'">
          <div class="wealth-workbook__panel-head">
            <h3>Housing setup</h3>
            <p>These settings shape how the housing pathways behave on top of the baseline housing costs set in the introduction.</p>
          </div>
          <div class="wealth-workbook__grid">
            <label>
              <span>Vacancy baseline %</span>
              <input v-model.number="vacancyRatePct" type="number" min="0" max="12" step="0.1" />
            </label>
            <label class="wealth-workbook__toggle">
              <input v-model="form.propertyConfig.firstHomeBuyerEligible" type="checkbox" />
              <span>Apply first-home-buyer support to owner paths</span>
            </label>
            <label class="wealth-workbook__toggle">
              <input v-model="form.propertyConfig.investWhileSavingForDeposit" type="checkbox" />
              <span>Invest while saving for deposit</span>
            </label>
            <label>
              <span>Property surplus routing</span>
              <select v-model="form.propertyConfig.surplusAllocationMode">
                <option value="portfolio">Invest surplus</option>
                <option value="mortgagePrepayment">Prepay mortgage</option>
              </select>
            </label>
          </div>
        </template>

        <template v-else-if="activeSheet === 'suburb'">
          <div class="wealth-workbook__panel-head">
            <h3>Suburb defaults</h3>
            <p>Use a suburb search to prefill price, growth, yield, and vacancy assumptions before adjusting them manually.</p>
          </div>
          <SuburbSearchSelector
            :current-selection="selectedSuburbSelection"
            :suburb-options="suburbSearchContext.suburbOptions"
            @select-suburb="$emit('select-suburb', $event)"
          />
          <div v-if="selectedSuburbRecord" class="wealth-workbook__summary-grid">
            <div>
              <span>Applied suburb</span>
              <strong>{{ selectedSuburbRecord.label }}</strong>
            </div>
            <div v-if="selectedSuburbPreview.house">
              <span>House median</span>
              <strong>{{ formatCurrency(selectedSuburbPreview.house.purchasePrice) }}</strong>
            </div>
            <div v-if="selectedSuburbPreview.apartment">
              <span>Apartment median</span>
              <strong>{{ formatCurrency(selectedSuburbPreview.apartment.purchasePrice) }}</strong>
            </div>
            <div v-if="selectedSuburbPreview.vacancyRate !== null">
              <span>Vacancy baseline</span>
              <strong>{{ formatPercent(selectedSuburbPreview.vacancyRate) }}</strong>
            </div>
          </div>
        </template>

        <template v-else-if="activeSheet === 'apartment'">
          <div class="wealth-workbook__panel-head">
            <h3>Apartment assumptions</h3>
            <p>Owner and rentvest apartment paths both draw from this sheet.</p>
          </div>
          <div class="wealth-workbook__grid wealth-workbook__grid--triple">
            <label>
              <span>Target price</span>
              <input v-model.number="form.propertyConfig.apartment.purchasePrice" type="number" min="0" step="1000" />
            </label>
            <label>
              <span>Owner deposit %</span>
              <input v-model.number="apartmentOwnerDepositPct" type="number" min="5" max="80" step="1" />
            </label>
            <label>
              <span>Investment deposit %</span>
              <input v-model.number="apartmentDepositPct" type="number" min="5" max="80" step="1" />
            </label>
            <label>
              <span>Mortgage years</span>
              <select v-model.number="form.propertyConfig.apartment.mortgageYears">
                <option :value="20">20 years</option>
                <option :value="25">25 years</option>
                <option :value="30">30 years</option>
              </select>
            </label>
            <label>
              <span>Owner rate %</span>
              <input v-model.number="apartmentOwnerRatePct" type="number" min="1" max="12" step="0.1" />
            </label>
            <label>
              <span>Owner long-run rate %</span>
              <input v-model.number="apartmentOwnerLongRunRatePct" type="number" min="1" max="12" step="0.1" />
            </label>
            <label>
              <span>Investment rate %</span>
              <input v-model.number="apartmentInvestmentRatePct" type="number" min="1" max="12" step="0.1" />
            </label>
            <label>
              <span>Investment long-run rate %</span>
              <input v-model.number="apartmentInvestmentLongRunRatePct" type="number" min="1" max="12" step="0.1" />
            </label>
            <label>
              <span>Growth %</span>
              <input v-model.number="apartmentGrowthPct" type="number" min="0" max="12" step="0.1" />
            </label>
            <label>
              <span>Rent yield %</span>
              <input v-model.number="apartmentRentYieldPct" type="number" min="0" max="10" step="0.1" />
            </label>
            <label>
              <span>Management fee %</span>
              <input v-model.number="apartmentManagementPct" type="number" min="0" max="15" step="0.1" />
            </label>
            <label>
              <span>Stamp duty</span>
              <input v-model.number="apartmentStampDuty" type="number" min="0" step="100" />
            </label>
            <label>
              <span>Legal fees</span>
              <input v-model.number="apartmentLegalFees" type="number" min="0" step="100" />
            </label>
            <label>
              <span>Buyer costs</span>
              <input v-model.number="apartmentBuyersCosts" type="number" min="0" step="100" />
            </label>
            <label>
              <span>Council rates</span>
              <input v-model.number="form.propertyConfig.apartment.councilRates" type="number" min="0" step="100" />
            </label>
            <label>
              <span>Water rates</span>
              <input v-model.number="form.propertyConfig.apartment.waterRates" type="number" min="0" step="100" />
            </label>
            <label>
              <span>Insurance</span>
              <input v-model.number="form.propertyConfig.apartment.insurance" type="number" min="0" step="100" />
            </label>
            <label>
              <span>Maintenance</span>
              <input v-model.number="form.propertyConfig.apartment.maintenance" type="number" min="0" step="100" />
            </label>
            <label>
              <span>Strata</span>
              <input v-model.number="form.propertyConfig.apartment.strata" type="number" min="0" step="100" />
            </label>
            <label>
              <span>Borrowing expenses</span>
              <input v-model.number="form.propertyConfig.apartment.borrowingExpensesTotal" type="number" min="0" step="100" />
            </label>
            <label>
              <span>Other deductible expenses</span>
              <input v-model.number="form.propertyConfig.apartment.otherDeductibleExpensesAnnual" type="number" min="0" step="100" />
            </label>
          </div>
        </template>

        <template v-else-if="activeSheet === 'house'">
          <div class="wealth-workbook__panel-head">
            <h3>House assumptions</h3>
            <p>Owner and rentvest house paths both draw from this sheet.</p>
          </div>
          <div class="wealth-workbook__grid wealth-workbook__grid--triple">
            <label>
              <span>Target price</span>
              <input v-model.number="form.propertyConfig.house.purchasePrice" type="number" min="0" step="1000" />
            </label>
            <label>
              <span>Owner deposit %</span>
              <input v-model.number="houseOwnerDepositPct" type="number" min="5" max="80" step="1" />
            </label>
            <label>
              <span>Investment deposit %</span>
              <input v-model.number="houseDepositPct" type="number" min="5" max="80" step="1" />
            </label>
            <label>
              <span>Mortgage years</span>
              <select v-model.number="form.propertyConfig.house.mortgageYears">
                <option :value="20">20 years</option>
                <option :value="25">25 years</option>
                <option :value="30">30 years</option>
              </select>
            </label>
            <label>
              <span>Owner rate %</span>
              <input v-model.number="houseOwnerRatePct" type="number" min="1" max="12" step="0.1" />
            </label>
            <label>
              <span>Owner long-run rate %</span>
              <input v-model.number="houseOwnerLongRunRatePct" type="number" min="1" max="12" step="0.1" />
            </label>
            <label>
              <span>Investment rate %</span>
              <input v-model.number="houseInvestmentRatePct" type="number" min="1" max="12" step="0.1" />
            </label>
            <label>
              <span>Investment long-run rate %</span>
              <input v-model.number="houseInvestmentLongRunRatePct" type="number" min="1" max="12" step="0.1" />
            </label>
            <label>
              <span>Growth %</span>
              <input v-model.number="houseGrowthPct" type="number" min="0" max="12" step="0.1" />
            </label>
            <label>
              <span>Rent yield %</span>
              <input v-model.number="houseRentYieldPct" type="number" min="0" max="10" step="0.1" />
            </label>
            <label>
              <span>Management fee %</span>
              <input v-model.number="houseManagementPct" type="number" min="0" max="15" step="0.1" />
            </label>
            <label>
              <span>Stamp duty</span>
              <input v-model.number="houseStampDuty" type="number" min="0" step="100" />
            </label>
            <label>
              <span>Legal fees</span>
              <input v-model.number="houseLegalFees" type="number" min="0" step="100" />
            </label>
            <label>
              <span>Buyer costs</span>
              <input v-model.number="houseBuyersCosts" type="number" min="0" step="100" />
            </label>
            <label>
              <span>Council rates</span>
              <input v-model.number="form.propertyConfig.house.councilRates" type="number" min="0" step="100" />
            </label>
            <label>
              <span>Water rates</span>
              <input v-model.number="form.propertyConfig.house.waterRates" type="number" min="0" step="100" />
            </label>
            <label>
              <span>Insurance</span>
              <input v-model.number="form.propertyConfig.house.insurance" type="number" min="0" step="100" />
            </label>
            <label>
              <span>Maintenance</span>
              <input v-model.number="form.propertyConfig.house.maintenance" type="number" min="0" step="100" />
            </label>
            <label>
              <span>Borrowing expenses</span>
              <input v-model.number="form.propertyConfig.house.borrowingExpensesTotal" type="number" min="0" step="100" />
            </label>
            <label>
              <span>Other deductible expenses</span>
              <input v-model.number="form.propertyConfig.house.otherDeductibleExpensesAnnual" type="number" min="0" step="100" />
            </label>
          </div>
        </template>
      </section>
    </Transition>
  </section>
</template>

<script setup>
import { computed } from 'vue'
import SuburbSearchSelector from './SuburbSearchSelector.vue'
import { getWealthBootstrapAssets } from '../../wealth/assetBootstrap.js'
import {
  getLockedWeightKeys,
  isPortfolioWeightLocked,
  portfolioAllocationFields as allocationFields,
  setPortfolioAllocation,
  togglePortfolioWeightLock
} from '../../wealth/portfolioAllocation.js'

const props = defineProps({
  form: { type: Object, required: true },
  activeSheet: { type: String, required: true },
  scenarioSelection: { type: Object, required: true },
  suburbSearchContext: { type: Object, required: true },
  selectedSuburbSelection: { type: Object, default: null },
  selectedSuburbRecord: { type: Object, default: null },
  selectedSuburbPreview: {
    type: Object,
    default: () => ({ house: null, apartment: null, vacancyRate: null })
  }
})

defineEmits(['update:activeSheet', 'select-suburb'])

const availableSheets = computed(() => {
  const sheets = [
    ...(props.scenarioSelection.includeStocks ? [{ key: 'stock', label: 'Stock assumptions' }] : []),
    ...(props.scenarioSelection.includeHousing ? [{ key: 'housingSetup', label: 'Housing setup' }] : []),
    ...(props.scenarioSelection.includeHousing
      ? [
          { key: 'suburb', label: 'Suburb defaults' },
          { key: 'apartment', label: 'Apartment assumptions' },
          { key: 'house', label: 'House assumptions' }
        ]
      : [])
  ]
  return sheets
})

const bootstrapAssets = getWealthBootstrapAssets()
const bootstrapSamplingNote = computed(() => {
  const method = props.form.portfolioConfig.bootstrapMethod === 'historical-monthly'
    ? 'historical-monthly'
    : 'historical-block'
  const blockSizeMonths = Math.max(1, Math.round(Number(props.form.portfolioConfig.bootstrapBlockSizeMonths) || 3))

  if (method === 'historical-monthly') {
    return 'Stock paths bootstrap shared historical months across QQQ, ASX200, bonds, and cash so cross-asset moves stay aligned within each simulated year. Bitcoin still uses its shorter 4 year history.'
  }

  return `Stock paths bootstrap shared ${blockSizeMonths}-month historical blocks across QQQ, ASX200, bonds, and cash so crashes and momentum clusters stay intact within each simulated year. Bitcoin still uses its shorter 4 year history.`
})

function percentProxy(getter, setter) {
  return computed({
    get: () => Number(((Number(getter()) || 0) * 100).toFixed(1)),
    set: (value) => setter(Math.max(0, Number(value) || 0) / 100)
  })
}

function getAllocationPct(key) {
  return Math.round((Math.max(0, Number(props.form.portfolioConfig[key]) || 0) * 100))
}

function setAllocation(targetKey, value) {
  setPortfolioAllocation(props.form.portfolioConfig, targetKey, value)
}

function handleAllocationInput(targetKey, event) {
  setAllocation(targetKey, event?.target?.value)

  if (event?.target) {
    event.target.value = String(getAllocationPct(targetKey))
  }
}

function toggleLock(key) {
  togglePortfolioWeightLock(props.form.portfolioConfig, key)
}

function isLocked(key) {
  return isPortfolioWeightLocked(props.form.portfolioConfig, key)
}

function hasUnlockedPeers(key) {
  const lockedKeys = new Set(getLockedWeightKeys(props.form.portfolioConfig))
  return allocationFields.some(field => field.key !== key && !lockedKeys.has(field.key))
}

const vacancyRatePct = percentProxy(() => props.form.propertyConfig.vacancyRate, value => { props.form.propertyConfig.vacancyRate = value })
const houseOwnerDepositPct = percentProxy(() => props.form.propertyConfig.house.ownerDepositPct, value => { props.form.propertyConfig.house.ownerDepositPct = value })
const houseDepositPct = percentProxy(() => props.form.propertyConfig.house.depositPct, value => { props.form.propertyConfig.house.depositPct = value })
const houseOwnerRatePct = percentProxy(() => props.form.propertyConfig.house.ownerInterestRate, value => { props.form.propertyConfig.house.ownerInterestRate = value })
const houseOwnerLongRunRatePct = percentProxy(() => props.form.propertyConfig.house.ownerLongRunInterestRate, value => { props.form.propertyConfig.house.ownerLongRunInterestRate = value })
const houseInvestmentRatePct = percentProxy(() => props.form.propertyConfig.house.investmentInterestRate, value => { props.form.propertyConfig.house.investmentInterestRate = value })
const houseInvestmentLongRunRatePct = percentProxy(() => props.form.propertyConfig.house.investmentLongRunInterestRate, value => { props.form.propertyConfig.house.investmentLongRunInterestRate = value })
const houseGrowthPct = percentProxy(() => props.form.propertyConfig.house.growthMean, value => { props.form.propertyConfig.house.growthMean = value })
const houseRentYieldPct = percentProxy(() => props.form.propertyConfig.house.rentYield, value => { props.form.propertyConfig.house.rentYield = value })
const houseManagementPct = percentProxy(() => props.form.propertyConfig.house.propertyManagementPct, value => { props.form.propertyConfig.house.propertyManagementPct = value })
const apartmentOwnerDepositPct = percentProxy(() => props.form.propertyConfig.apartment.ownerDepositPct, value => { props.form.propertyConfig.apartment.ownerDepositPct = value })
const apartmentDepositPct = percentProxy(() => props.form.propertyConfig.apartment.depositPct, value => { props.form.propertyConfig.apartment.depositPct = value })
const apartmentOwnerRatePct = percentProxy(() => props.form.propertyConfig.apartment.ownerInterestRate, value => { props.form.propertyConfig.apartment.ownerInterestRate = value })
const apartmentOwnerLongRunRatePct = percentProxy(() => props.form.propertyConfig.apartment.ownerLongRunInterestRate, value => { props.form.propertyConfig.apartment.ownerLongRunInterestRate = value })
const apartmentInvestmentRatePct = percentProxy(() => props.form.propertyConfig.apartment.investmentInterestRate, value => { props.form.propertyConfig.apartment.investmentInterestRate = value })
const apartmentInvestmentLongRunRatePct = percentProxy(() => props.form.propertyConfig.apartment.investmentLongRunInterestRate, value => { props.form.propertyConfig.apartment.investmentLongRunInterestRate = value })
const apartmentGrowthPct = percentProxy(() => props.form.propertyConfig.apartment.growthMean, value => { props.form.propertyConfig.apartment.growthMean = value })
const apartmentRentYieldPct = percentProxy(() => props.form.propertyConfig.apartment.rentYield, value => { props.form.propertyConfig.apartment.rentYield = value })
const apartmentManagementPct = percentProxy(() => props.form.propertyConfig.apartment.propertyManagementPct, value => { props.form.propertyConfig.apartment.propertyManagementPct = value })

function createSharedPurchaseCostProxy(propertyKey, costKey) {
  return computed({
    get: () => Number(props.form.propertyConfig[propertyKey].ownerPurchaseCosts?.[costKey] || 0),
    set: (value) => {
      const safeValue = Math.max(0, Number(value) || 0)
      props.form.propertyConfig[propertyKey].ownerPurchaseCosts[costKey] = safeValue
      props.form.propertyConfig[propertyKey].investmentPurchaseCosts[costKey] = safeValue
    }
  })
}

const apartmentStampDuty = createSharedPurchaseCostProxy('apartment', 'stampDuty')
const apartmentLegalFees = createSharedPurchaseCostProxy('apartment', 'legalFees')
const apartmentBuyersCosts = createSharedPurchaseCostProxy('apartment', 'buyersCosts')
const houseStampDuty = createSharedPurchaseCostProxy('house', 'stampDuty')
const houseLegalFees = createSharedPurchaseCostProxy('house', 'legalFees')
const houseBuyersCosts = createSharedPurchaseCostProxy('house', 'buyersCosts')

function formatCurrency(value) {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    maximumFractionDigits: 0
  }).format(Number(value) || 0)
}

function formatPercent(value) {
  return `${Math.round((Number(value) || 0) * 100)}%`
}
</script>

<style scoped>
.wealth-workbook {
  display: grid;
  gap: 1rem;
  padding: 1.25rem;
}

.wealth-workbook__header {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
}

.wealth-workbook__header h2 {
  margin: 0.15rem 0 0;
  font-size: clamp(1.5rem, 1.2rem + 0.9vw, 2.15rem);
}

.wealth-workbook__kicker {
  margin: 0;
  text-transform: uppercase;
  letter-spacing: 0.16em;
  font-size: 0.74rem;
  color: #5d7ba3;
}

.wealth-workbook__copy {
  margin: 0;
  max-width: 30rem;
  color: #587090;
  line-height: 1.5;
}

.wealth-workbook__tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 0.65rem;
}

.wealth-workbook__tab {
  padding: 0.65rem 0.95rem;
  border-radius: 999px;
  border: 1px solid rgba(154, 174, 204, 0.22);
  background: rgba(244, 248, 255, 0.96);
  color: #385879;
  font: inherit;
  cursor: pointer;
}

.wealth-workbook__tab.is-active {
  background: rgba(216, 234, 255, 0.98);
  border-color: rgba(45, 118, 212, 0.3);
  color: #133657;
}

.wealth-workbook__panel {
  display: grid;
  gap: 1rem;
  min-height: 28rem;
  padding: 1rem;
  border-radius: 24px;
  background:
    radial-gradient(circle at right top, rgba(125, 211, 252, 0.14), transparent 28%),
    linear-gradient(180deg, rgba(248, 251, 255, 0.94), rgba(241, 247, 255, 0.92));
  border: 1px solid rgba(154, 174, 204, 0.16);
}

.wealth-workbook__panel-head h3 {
  margin: 0;
  font-size: 1.25rem;
}

.wealth-workbook__panel-head p {
  margin: 0.35rem 0 0;
  color: #5d7394;
}

.wealth-workbook__bootstrap-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.8rem;
}

.wealth-workbook__bootstrap-card {
  display: grid;
  gap: 0.5rem;
  padding: 1rem;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.82);
  border: 1px solid rgba(154, 174, 204, 0.16);
}

.wealth-workbook__bootstrap-top {
  display: flex;
  justify-content: space-between;
  gap: 0.75rem;
  align-items: baseline;
}

.wealth-workbook__bootstrap-card p,
.wealth-workbook__bootstrap-card span {
  margin: 0;
  color: #5d7394;
  line-height: 1.5;
}

.wealth-workbook__note {
  margin: -0.1rem 0 0;
  padding: 0.9rem 1rem;
  border-radius: 18px;
  background: rgba(214, 233, 255, 0.58);
  border: 1px solid rgba(82, 136, 201, 0.18);
  color: #315273;
  line-height: 1.55;
}

.wealth-workbook__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.85rem;
}

.wealth-workbook__allocation-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.8rem;
}

.wealth-workbook__allocation {
  display: grid;
  gap: 0.45rem;
  color: #5b7192;
  font-size: 0.84rem;
  padding: 0.85rem;
  border-radius: 18px;
  border: 1px solid rgba(154, 174, 204, 0.18);
  background: rgba(255, 255, 255, 0.68);
}

.wealth-workbook__allocation.is-locked {
  border-color: rgba(37, 99, 235, 0.28);
  box-shadow: inset 0 0 0 1px rgba(37, 99, 235, 0.08);
}

.wealth-workbook__allocation-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.wealth-workbook__allocation-title {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
}

.wealth-workbook__allocation-swatch {
  width: 0.72rem;
  height: 0.72rem;
  border-radius: 999px;
  flex: 0 0 auto;
}

.wealth-workbook__lock-btn {
  border: 1px solid rgba(154, 174, 204, 0.24);
  border-radius: 999px;
  padding: 0.38rem 0.72rem;
  background: rgba(244, 248, 255, 0.96);
  color: #355474;
  font: inherit;
  font-size: 0.76rem;
  cursor: pointer;
}

.wealth-workbook__lock-btn.is-active {
  border-color: rgba(37, 99, 235, 0.28);
  background: rgba(219, 234, 254, 0.92);
  color: #1d4ed8;
}

.wealth-workbook__allocation-controls {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 84px;
  gap: 0.7rem;
  align-items: center;
}

.wealth-workbook__grid--triple {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.wealth-workbook__grid--quad {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.wealth-workbook__grid label,
.wealth-workbook__toggle {
  display: grid;
  gap: 0.35rem;
  color: #5b7192;
  font-size: 0.84rem;
}

.wealth-workbook__grid input,
.wealth-workbook__grid select,
.wealth-workbook__allocation-controls input {
  width: 100%;
  min-height: 3.2rem;
  padding: 0.8rem 0.9rem;
  border-radius: 16px;
  border: 1px solid rgba(154, 174, 204, 0.22);
  background: rgba(255, 255, 255, 0.96);
  color: #173050;
  font: inherit;
}

.wealth-workbook__allocation-controls input[type='range'] {
  min-height: 0;
  padding-inline: 0;
}

.wealth-workbook__allocation-controls input:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.wealth-workbook__toggle {
  grid-template-columns: 20px 1fr;
  align-items: center;
  min-height: 3.2rem;
  padding: 0.8rem 0.9rem;
  border-radius: 16px;
  border: 1px solid rgba(154, 174, 204, 0.22);
  background: rgba(255, 255, 255, 0.96);
}

.wealth-workbook__toggle input {
  width: 18px;
  height: 18px;
  min-height: 0;
  padding: 0;
}

.wealth-workbook__summary-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.8rem;
}

.wealth-workbook__summary-grid div {
  padding: 0.9rem;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.72);
  border: 1px solid rgba(154, 174, 204, 0.16);
}

.wealth-workbook__summary-grid span {
  display: block;
  margin-bottom: 0.28rem;
  color: #6481a6;
  font-size: 0.78rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

.wealth-sheet-slide-enter-active,
.wealth-sheet-slide-leave-active {
  transition: opacity 180ms ease, transform 180ms ease;
}

.wealth-sheet-slide-enter-from,
.wealth-sheet-slide-leave-to {
  opacity: 0;
  transform: translateX(18px);
}

@media (max-width: 1100px) {
  .wealth-workbook__bootstrap-grid,
  .wealth-workbook__grid--quad,
  .wealth-workbook__grid--triple {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 820px) {
  .wealth-workbook__header,
  .wealth-workbook__bootstrap-grid,
  .wealth-workbook__allocation-grid,
  .wealth-workbook__grid,
  .wealth-workbook__summary-grid,
  .wealth-workbook__grid--quad,
  .wealth-workbook__grid--triple {
    display: grid;
    grid-template-columns: 1fr;
  }

  .wealth-workbook__allocation-controls {
    grid-template-columns: 1fr;
  }
}
</style>
