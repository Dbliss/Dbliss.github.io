<template>
  <section :key="householdSizeSelection" class="wealth-sheet card">
    <div class="wealth-sheet__header">
      <div>
        <h2>Current household setup</h2>
      </div>
      <p class="wealth-sheet__copy">
        Costs are all weekly
      </p>
    </div>

    <div class="wealth-sheet__grid">
      <label>
        <span>Number of people</span>
        <select :value="householdSizeSelection" @change="handleHouseholdSizeSelectionChange($event.target.value)">
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
            <option value="owningExistingProperty">Already own current home</option>
          </select>
        </label>
        <label v-if="currentHousingStatus !== 'owningExistingProperty'">
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

    <section v-if="householdSize > 1" class="wealth-sheet__subsection">
      <div class="wealth-sheet__subsection-head">
        <h3>Children and family costs</h3>
      </div>
      <div class="wealth-sheet__subsection-grid">
        <label>
          <span>Children already in household</span>
          <select v-model.number="form.profile.familyPlan.existingChildren">
            <option :value="0">0</option>
            <option :value="1">1</option>
            <option :value="2">2</option>
            <option :value="3">3</option>
            <option :value="4">4</option>
          </select>
        </label>
      </div>
      <div class="wealth-family-plan__head">
        <span>Children planned</span>
      </div>
      <div class="wealth-family-plan">
        <div
          v-for="(child, index) in plannedChildren"
          :key="child.id || index"
          class="wealth-family-plan__row"
        >
          <label class="wealth-family-plan__field">
            <span>{{ getPlannedChildLabel(index) }}</span>
            <select class="wealth-family-plan__select" :value="child.year" @change="updatePlannedChildYear(index, $event.target.value)">
              <option
                v-for="year in getAvailableChildYears(child.year)"
                :key="year"
                :value="year"
              >
                Year {{ year }}
              </option>
            </select>
          </label>
          <button type="button" class="wealth-family-plan__remove" @click="removePlannedChild(index)">Remove</button>
        </div>
        <button
          type="button"
          class="wealth-family-plan__add"
          :disabled="plannedChildren.length >= 6"
          @click="addPlannedChild"
        >
          {{ plannedChildren.length >= 6 ? 'Maximum planned children reached' : 'Add planned child' }}
        </button>
      </div>
      <p class="wealth-sheet__subsection-copy">
        Each child increases the non-rent living-cost ~20%. Hugely estimated - take with caution. If you already have children, child costs are assumed already-included.  
      </p>
    </section>

    <section class="wealth-sheet__subsection">
      <div class="wealth-sheet__subsection-head">
        <h3>Household income trajectory</h3>
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
              <span>HECS debt</span>
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

          <div class="wealth-break-plan">
            <label class="wealth-break-plan__toggle">
              <input
                :checked="hasCareerBreaks(earner)"
                type="checkbox"
                @change="toggleCareerBreak(earner, $event.target.checked)"
              />
              <span>Plan a break from work</span>
            </label>

            <div v-if="hasCareerBreaks(earner)" class="wealth-break-plan__list">
              <div
                v-for="(plan, planIndex) in getBreakPlans(earner)"
                :key="plan.id || planIndex"
                class="wealth-break-plan__row"
              >
                <label class="wealth-family-plan__field">
                  <span>Start year</span>
                  <select
                    class="wealth-family-plan__select"
                    :value="plan.startYear"
                    @change="updateBreakPlanStartYear(earner, plan.id, $event.target.value)"
                  >
                    <option
                      v-for="year in getAvailableBreakStartYears(earner, plan.id, plan.reason)"
                      :key="year"
                      :value="year"
                    >
                      Year {{ year }}
                    </option>
                  </select>
                </label>
                <label class="wealth-family-plan__field">
                  <span>Time away</span>
                  <select
                    class="wealth-family-plan__select"
                    :value="plan.durationYears"
                    :disabled="plan.neverReturn"
                    @change="updateBreakPlanDuration(earner, plan.id, $event.target.value)"
                  >
                    <option :value="0.5">6 months</option>
                    <option v-for="year in Math.min(10, form.profile.horizonYears)" :key="year" :value="year">{{ getDurationLabel(year) }}</option>
                  </select>
                </label>
                <label class="wealth-family-plan__field">
                  <span>Reason</span>
                  <select
                    class="wealth-family-plan__select"
                    :value="plan.reason"
                    @change="updateBreakPlanReason(earner, plan.id, $event.target.value)"
                  >
                    <option value="personal">General break</option>
                    <option v-if="householdSize > 1" value="child">Child / parental leave</option>
                  </select>
                </label>
                <label class="wealth-break-plan__inline-toggle">
                  <input
                    :checked="plan.neverReturn"
                    type="checkbox"
                    @change="updateBreakPlanNeverReturn(earner, plan.id, $event.target.checked)"
                  />
                  <span>Never return</span>
                </label>
                <button type="button" class="wealth-family-plan__remove" @click="removeCareerBreak(earner, plan.id)">Remove</button>
              </div>
              <button
                type="button"
                class="wealth-family-plan__add"
                :disabled="getBreakPlans(earner).length >= 6"
                @click="addCareerBreak(earner)"
              >
                {{ getBreakPlans(earner).length >= 6 ? 'Maximum breaks reached' : 'Add another break' }}
              </button>
            </div>
          </div>

          <WealthIncomeGrowthEditor
            :profile="earner"
            :profile-label="earner.label || `person ${index + 1}`"
            :planned-child-years="plannedChildren.map((child) => child.year)"
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

    <section class="wealth-sheet__subsection">
      <div class="wealth-sheet__subsection-head">
        <h3>Current property position</h3>
      </div>

      <label class="wealth-break-plan__toggle">
        <input v-model="form.existingProperty.enabled" type="checkbox" />
        <span>I already own a property</span>
      </label>

      <div v-if="form.existingProperty.enabled" class="wealth-sheet__subsection">
        <div class="wealth-sheet__subsection-grid">
          <label>
            <span>Property use</span>
            <select v-model="form.existingProperty.occupancyMode">
              <option value="owner">Living in it</option>
              <option value="investment">Investment property</option>
            </select>
          </label>
          <label>
            <span>Property type</span>
            <select v-model="form.existingProperty.propertyType">
              <option value="house">House</option>
              <option value="apartment">Apartment</option>
            </select>
          </label>
          <label>
            <span>Current value</span>
            <input v-model.number="form.existingProperty.currentValue" type="number" min="0" step="1000" />
          </label>
          <label>
            <span>Mortgage left</span>
            <input v-model.number="form.existingProperty.mortgageBalance" type="number" min="0" step="1000" />
          </label>
          <label>
            <span>Years left on loan</span>
            <input v-model.number="form.existingProperty.mortgageYears" type="number" min="1" max="40" step="1" />
          </label>
          <label>
            <span>Current interest %</span>
            <input
              :value="((form.existingProperty.occupancyMode === 'investment' ? form.existingProperty.investmentInterestRate : form.existingProperty.ownerInterestRate) * 100).toFixed(2)"
              type="number"
              min="0"
              max="15"
              step="0.05"
              @input="
                form.existingProperty.occupancyMode === 'investment'
                  ? form.existingProperty.investmentInterestRate = (Number($event.target.value) || 0) / 100
                  : form.existingProperty.ownerInterestRate = (Number($event.target.value) || 0) / 100
              "
            />
          </label>
          <label v-if="form.existingProperty.occupancyMode === 'investment'">
            <span>Gross yield %</span>
            <input :value="(form.existingProperty.rentYield * 100).toFixed(2)" type="number" min="0" max="15" step="0.1" @input="form.existingProperty.rentYield = (Number($event.target.value) || 0) / 100" />
          </label>
        </div>

        <p class="wealth-sheet__subsection-copy">
          Repayments are estimated automatically from the remaining mortgage, years left, and current interest rate.
        </p>

        <SuburbSearchSelector
          :current-selection="selectedExistingPropertyAreaSelection"
          :suburb-options="suburbSearchContext.suburbOptions"
          @select-suburb="emit('select-existing-property-area', $event)"
        />

        <p v-if="selectedExistingPropertyAreaRecord" class="wealth-sheet__subsection-copy">
          Using {{ selectedExistingPropertyAreaRecord.label }} market history to project future valuation for your current {{ form.existingProperty.propertyType }}.
        </p>
      </div>
    </section>

  </section>
  <Teleport to="body">
    <div v-if="modalState.open" class="wealth-modal-backdrop" @click="handleModalBackdrop">
      <div class="wealth-modal" role="dialog" aria-modal="true" @click.stop>
        <p class="wealth-modal__title">{{ modalState.title }}</p>
        <p v-if="modalState.message" class="wealth-modal__message">{{ modalState.message }}</p>
        <input
          v-if="modalState.mode === 'prompt'"
          v-model.trim="modalState.input"
          class="wealth-modal__input"
          type="text"
          :placeholder="modalState.placeholder"
          @keydown.enter.prevent="confirmModal"
        />
        <div class="wealth-modal__actions">
          <button type="button" class="wealth-modal__btn wealth-modal__btn--ghost" @click="cancelModal">Cancel</button>
          <button type="button" class="wealth-modal__btn wealth-modal__btn--primary" @click="confirmModal">
            {{ modalState.confirmLabel }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import SuburbSearchSelector from './SuburbSearchSelector.vue'
import WealthIncomeGrowthEditor from './WealthIncomeGrowthEditor.vue'
import {
  getEarnerAnnualIncomeForYear,
  normaliseCareerBreakPlan,
  normaliseCareerBreakPlans,
  normaliseIncomeProfile
} from '../../wealth/incomeSeries.js'

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
    careerBreakPlans: [],
    careerBreakPlan: {
      enabled: false,
      startYear: 5,
      durationYears: 1,
      neverReturn: false,
      reason: 'personal'
    },
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
    careerBreakPlans: [],
    careerBreakPlan: {
      enabled: false,
      startYear: 5,
      durationYears: 1,
      neverReturn: false,
      reason: 'personal'
    },
    useCustomIncomeSeries: false,
    annualIncomeSeries: []
  }
]

const props = defineProps({
  form: { type: Object, required: true },
  suburbSearchContext: { type: Object, default: () => ({ suburbOptions: [] }) },
  selectedExistingPropertyAreaSelection: { type: Object, default: null },
  selectedExistingPropertyAreaRecord: { type: Object, default: null }
})
const emit = defineEmits(['select-existing-property-area'])
const modalState = reactive({
  open: false,
  mode: 'confirm',
  title: '',
  message: '',
  placeholder: '',
  confirmLabel: 'Confirm',
  input: '',
  expectedText: '',
  resolve: null
})

const earners = computed(() => props.form.profile.earners || [])
const householdSizeSelection = ref(Math.min(2, Math.max(1, earners.value.length || 1)))
const householdSize = computed(() => Math.min(2, Math.max(1, householdSizeSelection.value || 1)))

const householdProfile = computed(() => normaliseIncomeProfile(props.form.profile))
const totalStartingSavings = computed(() => householdProfile.value.startingSavings)
const totalHelpDebt = computed(() => householdProfile.value.helpDebtBalance)
const finalYearIncome = computed(() => {
  return earners.value.reduce((sum, earner) => sum + getEarnerAnnualIncomeForYear(earner, Math.max(0, Number(props.form.profile.horizonYears) - 1), earners.value.length), 0)
})
const plannedChildren = computed(() => props.form.profile.familyPlan?.plannedChildren || [])

const currentHousingStatus = computed({
  get: () => {
    if (props.form.existingProperty?.enabled && props.form.existingProperty?.occupancyMode === 'owner') return 'owningExistingProperty'
    return props.form.housingCosts.liveAtHome ? 'livingAtHome' : 'renting'
  },
  set: (value) => {
    props.form.housingCosts.liveAtHome = value === 'livingAtHome'
    if (value === 'owningExistingProperty') {
      props.form.existingProperty.enabled = true
      props.form.existingProperty.occupancyMode = 'owner'
      props.form.housingCosts.liveAtHome = false
      props.form.housingCosts.liveAtHomeYears = 0
      return
    }

    if (props.form.existingProperty?.occupancyMode === 'owner') {
      props.form.existingProperty.enabled = false
    }

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

function syncCareerBreakPlans(earner) {
  if (!earner) return []
  const plans = normaliseCareerBreakPlans(
    earner?.careerBreakPlans?.length ? earner.careerBreakPlans : earner?.careerBreakPlan,
    props.form.profile.horizonYears,
    householdSize.value > 1
  )
  earner.careerBreakPlans = plans
  earner.careerBreakPlan = plans[0] || normaliseCareerBreakPlan({}, props.form.profile.horizonYears, householdSize.value > 1)
  return earner.careerBreakPlans
}

function getBreakPlans(earner) {
  return Array.isArray(earner?.careerBreakPlans) ? earner.careerBreakPlans : []
}

function hasCareerBreaks(earner) {
  return Array.isArray(earner?.careerBreakPlans) && earner.careerBreakPlans.length > 0
}

function findCareerBreak(earner, breakId) {
  return getBreakPlans(earner).find((plan) => plan.id === breakId) || null
}

function toggleCareerBreak(earner, enabled) {
  if (!enabled) {
    earner.careerBreakPlans = []
    earner.careerBreakPlan = normaliseCareerBreakPlan({}, props.form.profile.horizonYears, householdSize.value > 1)
    syncParentLeaveChildYears(earner)
    return
  }

  if (!getBreakPlans(earner).length) {
    addCareerBreak(earner)
  }
}

function addCareerBreak(earner) {
  const plans = getBreakPlans(earner)
  if (plans.length >= 6) return
  const firstAvailableYear = getAvailableBreakStartYears(earner, null, 'personal')[0] || 1
  earner.careerBreakPlans = [
    ...plans,
    normaliseCareerBreakPlan({
      id: `career-break-${Date.now()}-${plans.length + 1}`,
      enabled: true,
      startYear: firstAvailableYear,
      durationYears: 1,
      neverReturn: false,
      reason: 'personal'
    }, props.form.profile.horizonYears, householdSize.value > 1)
  ]
  syncCareerBreakPlans(earner)
}

function removeCareerBreak(earner, breakId) {
  earner.careerBreakPlans = getBreakPlans(earner).filter((plan) => plan.id !== breakId)
  syncCareerBreakPlans(earner)
  syncParentLeaveChildYears(earner)
}

function updateBreakPlanStartYear(earner, breakId, value) {
  const plan = findCareerBreak(earner, breakId)
  if (!plan) return
  const minimumYear = plan.reason === 'child' ? 2 : 1
  plan.startYear = Math.max(minimumYear, Math.min(props.form.profile.horizonYears, Math.round(Number(value) || minimumYear)))
  syncCareerBreakPlans(earner)
  syncParentLeaveChildYears(earner)
}

function updateBreakPlanDuration(earner, breakId, value) {
  const plan = findCareerBreak(earner, breakId)
  if (!plan) return
  plan.durationYears = Number(value) === 0.5 ? 0.5 : Math.max(1, Number(value) || 1)
  syncCareerBreakPlans(earner)
}

function updateBreakPlanNeverReturn(earner, breakId, checked) {
  const plan = findCareerBreak(earner, breakId)
  if (!plan) return
  plan.neverReturn = Boolean(checked)
  syncCareerBreakPlans(earner)
}

function updateBreakPlanReason(earner, breakId, value) {
  const plan = findCareerBreak(earner, breakId)
  if (!plan) return
  plan.reason = value === 'child' && householdSize.value > 1 ? 'child' : 'personal'
  if (plan.reason === 'child' && plan.startYear < 2) {
    plan.startYear = 2
  }
  syncCareerBreakPlans(earner)
  syncParentLeaveChildYears(earner)
}

function getAvailableBreakStartYears(earner, currentBreakId = null, reason = 'personal') {
  const minimumYear = reason === 'child' ? 2 : 1
  const takenYears = new Set(
    getBreakPlans(earner)
      .filter((plan) => plan.id !== currentBreakId)
      .map((plan) => Math.round(Number(plan.startYear) || 0))
      .filter((year) => year >= minimumYear)
  )

  return Array.from({ length: props.form.profile.horizonYears }, (_, index) => index + 1)
    .filter((year) => year >= minimumYear && !takenYears.has(year))
}

async function addPlannedChild() {
  if (householdSize.value < 2) return
  const familyPlan = ensureFamilyPlan()
  const nextChildNumber = familyPlan.plannedChildren.length + 1
  if (nextChildNumber > 6) return
  if (nextChildNumber === 3) {
    const ok = await openConfirmModal({
      title: 'Are you sure?',
      message: 'You are about to add a third planned child.'
    })
    if (!ok) return
  }
  if (nextChildNumber === 4) {
    const ok = await openConfirmModal({
      title: 'Really? 💀',
      message: 'You are about to add a fourth planned child.'
    })
    if (!ok) return
  }
  if (nextChildNumber === 5) {
    const ok = await openConfirmModal({
      title: 'Fifth child confirmation',
      message: 'Confirm that you want to add a fifth planned child.',
      confirmLabel: 'Yes, continue'
    })
    if (!ok) return
  }

  const firstAvailableYear = Array.from({ length: props.form.profile.horizonYears }, (_, index) => index + 1)
    .filter((year) => year >= 2)
    .find((year) => !familyPlan.plannedChildren.some((child) => Number(child.year) === year))
  if (!firstAvailableYear) return
  familyPlan.plannedChildren.push({
    id: `planned-child-${familyPlan.plannedChildren.length + 1}`,
    year: firstAvailableYear,
    sourceBreakKey: null
  })
  sortAndDeduplicatePlannedChildren()
}

function removePlannedChild(index) {
  if (!Array.isArray(props.form.profile.familyPlan?.plannedChildren)) return
  props.form.profile.familyPlan.plannedChildren.splice(index, 1)
}

function ensureFamilyPlan() {
  if (!props.form.profile.familyPlan) {
    props.form.profile.familyPlan = { existingChildren: 0, plannedChildren: [] }
  }
  if (!Array.isArray(props.form.profile.familyPlan.plannedChildren)) {
    props.form.profile.familyPlan.plannedChildren = []
  }
  return props.form.profile.familyPlan
}

function sortAndDeduplicatePlannedChildren() {
  const familyPlan = ensureFamilyPlan()
  const seenYears = new Set()
  familyPlan.plannedChildren = familyPlan.plannedChildren
    .map((child, index) => ({
      id: child?.id || `planned-child-${index + 1}`,
      year: Math.max(2, Math.min(props.form.profile.horizonYears, Math.round(Number(child?.year) || 2))),
      sourceBreakKey: child?.sourceBreakKey || null
    }))
    .sort((left, right) => left.year - right.year)
    .filter((child) => {
      if (seenYears.has(child.year)) return false
      seenYears.add(child.year)
      return true
    })
}

function syncParentLeaveChildYears(earner) {
  if (householdSize.value < 2) return
  const familyPlan = ensureFamilyPlan()
  const ownedBreakKeys = new Set(getBreakPlans(earner).map((plan) => `${earner?.id || earner?.label || 'earner'}:${plan.id}`))

  familyPlan.plannedChildren = familyPlan.plannedChildren.filter((child) => !ownedBreakKeys.has(child?.sourceBreakKey))

  getBreakPlans(earner)
    .filter((plan) => plan.reason === 'child')
    .forEach((plan) => {
      const targetYear = Math.max(2, Math.min(props.form.profile.horizonYears, Math.round(Number(plan.startYear) || 2)))
      const sourceBreakKey = `${earner?.id || earner?.label || 'earner'}:${plan.id}`
      const alreadyExists = familyPlan.plannedChildren.some((child) => Number(child.year) === targetYear)
      if (alreadyExists) return
      familyPlan.plannedChildren.push({
        id: `planned-child-${familyPlan.plannedChildren.length + 1}`,
        year: targetYear,
        sourceBreakKey
      })
    })

  sortAndDeduplicatePlannedChildren()
}

function getAvailableChildYears(currentYear) {
  const current = Math.max(2, Math.round(Number(currentYear) || 2))
  const takenYears = new Set(
    plannedChildren.value
      .map((child) => Math.round(Number(child?.year) || 0))
      .filter((year) => year >= 2 && year !== current)
  )

  return Array.from({ length: props.form.profile.horizonYears }, (_, index) => index + 1)
    .filter((year) => year >= 2 && !takenYears.has(year))
}

function updatePlannedChildYear(index, value) {
  const familyPlan = ensureFamilyPlan()
  const targetYear = Math.max(2, Math.min(props.form.profile.horizonYears, Math.round(Number(value) || 2)))
  const existingAtYear = familyPlan.plannedChildren.findIndex((child, childIndex) =>
    childIndex !== index && Number(child?.year) === targetYear
  )

  if (existingAtYear >= 0) {
    familyPlan.plannedChildren.splice(index, 1)
    sortAndDeduplicatePlannedChildren()
    return
  }

  if (!familyPlan.plannedChildren[index]) return
  familyPlan.plannedChildren[index].year = targetYear
  sortAndDeduplicatePlannedChildren()
}

function getPlannedChildLabel(index) {
  if (index === 0) return 'First child'
  if (index === 1) return 'Second child'
  if (index === 2) return 'Third child'
  if (index === 3) return 'Fourth child'
  if (index === 4) return 'Fifth child'
  if (index === 5) return 'Sixth child'
  return `Child ${index + 1}`
}

function openConfirmModal({
  title,
  message = '',
  confirmLabel = 'Confirm'
} = {}) {
  return new Promise((resolve) => {
    modalState.open = true
    modalState.mode = 'confirm'
    modalState.title = title
    modalState.message = message
    modalState.placeholder = ''
    modalState.confirmLabel = confirmLabel
    modalState.input = ''
    modalState.expectedText = ''
    modalState.resolve = resolve
  })
}

function closeModal(result) {
  const resolver = modalState.resolve
  modalState.open = false
  modalState.mode = 'confirm'
  modalState.title = ''
  modalState.message = ''
  modalState.placeholder = ''
  modalState.confirmLabel = 'Confirm'
  modalState.input = ''
  modalState.expectedText = ''
  modalState.resolve = null
  if (typeof resolver === 'function') resolver(result)
}

function cancelModal() {
  closeModal(false)
}

function confirmModal() {
  if (modalState.mode === 'prompt' && modalState.input !== modalState.expectedText) return
  closeModal(true)
}

function handleModalBackdrop() {
  cancelModal()
}

function getDurationLabel(value) {
  return Number(value) === 0.5 ? '6 months' : `${Math.round(Number(value) || 1)} year${Number(value) === 1 ? '' : 's'}`
}

function syncExistingPropertyType() {
  const propertyType = props.form.existingProperty.propertyType === 'apartment' ? 'apartment' : 'house'
  props.form.existingProperty.propertyType = propertyType
  if (propertyType === 'house') {
    props.form.existingProperty.strata = 0
  }
  if (props.selectedExistingPropertyAreaSelection?.key) {
    emit('select-existing-property-area', props.selectedExistingPropertyAreaSelection)
  }
}

function createDefaultEarner(index) {
  const fallback = DEFAULT_EARNERS[index] || DEFAULT_EARNERS[DEFAULT_EARNERS.length - 1]
  const careerBreakPlans = normaliseCareerBreakPlans(
    fallback.careerBreakPlans?.length ? fallback.careerBreakPlans : fallback.careerBreakPlan,
    props.form.profile.horizonYears,
    index < 2
  )
  return {
    ...fallback,
    id: `person-${index + 1}`,
    label: fallback.label || `Person ${index + 1}`,
    startingSavings: Math.max(0, Number(fallback.startingSavings) || 0),
    careerBreakPlans,
    careerBreakPlan: careerBreakPlans[0] || normaliseCareerBreakPlan(fallback.careerBreakPlan, props.form.profile.horizonYears, index < 2),
    annualIncomeSeries: Array.isArray(fallback.annualIncomeSeries) ? [...fallback.annualIncomeSeries] : []
  }
}

function getDefaultWeeklyRent(householdSize) {
  return DEFAULT_WEEKLY_RENT_BY_HOUSEHOLD_SIZE[householdSize] || DEFAULT_WEEKLY_RENT_BY_HOUSEHOLD_SIZE[1]
}

function getDefaultWeeklySpending(householdSize) {
  return DEFAULT_WEEKLY_SPENDING_BY_HOUSEHOLD_SIZE[householdSize] || DEFAULT_WEEKLY_SPENDING_BY_HOUSEHOLD_SIZE[1]
}

function applyHouseholdSizeChange(value) {
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

  props.form.profile = {
    ...props.form.profile,
    earners: nextEarners.slice(0, targetSize)
  }

  if (Number(props.form.housingCosts.weeklyRent) === previousRentDefault) {
    props.form.housingCosts.weeklyRent = getDefaultWeeklyRent(targetSize)
  }

  if (Number(props.form.profile.weeklyNonHousingLivingCosts) === previousSpendingDefault) {
    props.form.profile.weeklyNonHousingLivingCosts = getDefaultWeeklySpending(targetSize)
  }
}

function handleHouseholdSizeSelectionChange(value) {
  const targetSize = Number(value) === 2 ? 2 : 1
  householdSizeSelection.value = targetSize
  applyHouseholdSizeChange(targetSize)
}

watch(
  () => Math.min(2, Math.max(1, earners.value.length || 1)),
  (value) => {
    if (householdSizeSelection.value !== value) {
      householdSizeSelection.value = value
    }
  },
  { immediate: true, flush: 'sync' }
)

watch(
  () => `${props.form.profile.horizonYears}|${householdSize.value}|${(props.form.profile.earners || []).map((earner) => earner?.id || earner?.label || '').join(',')}`,
  () => {
    props.form.profile.earners?.forEach((earner) => {
      syncCareerBreakPlans(earner)
    })
  },
  { immediate: true }
)

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

    if (!props.form.profile.familyPlan) {
      props.form.profile.familyPlan = { existingChildren: 0, plannedChildren: [] }
    }
    props.form.profile.earners.forEach((earner) => {
      syncCareerBreakPlans(earner)
    })
    sortAndDeduplicatePlannedChildren()
    if (targetSize < 2) {
      props.form.profile.familyPlan.existingChildren = 0
      props.form.profile.familyPlan.plannedChildren = []
      props.form.profile.earners.forEach((earner) => {
        getBreakPlans(earner).forEach((plan) => {
          if (plan.reason === 'child') plan.reason = 'personal'
        })
        syncCareerBreakPlans(earner)
      })
    }
  },
  { immediate: true }
)

watch(
  () => plannedChildren.value.map((child) => child.year).join(','),
  () => {
    sortAndDeduplicatePlannedChildren()
  }
)

watch(
  () => (props.form.profile.earners || []).map((earner) => {
    return (earner?.careerBreakPlans || [])
      .map((plan) => `${plan.id || 'break'}|${plan.reason || 'personal'}|${plan.startYear || 1}`)
      .join(';')
  }).join(','),
  () => {
    props.form.profile.earners?.forEach((earner) => {
      syncParentLeaveChildYears(earner)
    })
  },
  { deep: true, immediate: true }
)

watch(
  () => props.form.existingProperty.propertyType,
  () => {
    syncExistingPropertyType()
  }
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

.wealth-family-plan {
  display: grid;
  gap: 0.55rem;
}

.wealth-family-plan__head {
  margin-top: -0.25rem;
  color: #6a7f9f;
  font-size: 0.74rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.wealth-family-plan__head span {
  display: inline-block;
}

.wealth-family-plan__row {
  display: flex;
  gap: 0.45rem;
  align-items: end;
}

.wealth-family-plan__field {
  flex: 1 1 auto;
}

.wealth-family-plan__field span {
  display: inline-block;
  margin-bottom: 0.3rem;
  color: #4f6887;
  font-size: 0.83rem;
}

.wealth-family-plan__select {
  width: 100%;
  min-height: 2.9rem;
  padding: 0.7rem 2.6rem 0.7rem 0.9rem;
  border-radius: 14px;
  border: 1px solid rgba(154, 174, 204, 0.24);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(245, 249, 255, 0.95));
  color: #173050;
  font: inherit;
  appearance: none;
  background-image:
    linear-gradient(45deg, transparent 50%, #5d7ba3 50%),
    linear-gradient(135deg, #5d7ba3 50%, transparent 50%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(245, 249, 255, 0.95));
  background-position:
    calc(100% - 1.1rem) calc(50% - 0.1rem),
    calc(100% - 0.8rem) calc(50% - 0.1rem),
    0 0;
  background-size:
    0.35rem 0.35rem,
    0.35rem 0.35rem,
    100% 100%;
  background-repeat: no-repeat;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.7);
}

.wealth-family-plan__remove {
  min-height: 2.9rem;
  padding: 0.7rem 0.85rem;
  border-radius: 14px;
  border: 1px solid rgba(226, 232, 240, 0.9);
  background: rgba(255, 255, 255, 0.96);
  color: #5d7394;
  font: inherit;
  cursor: pointer;
  white-space: nowrap;
}

.wealth-family-plan__add {
  justify-self: start;
  min-height: 2.7rem;
  padding: 0.65rem 1rem;
  border-radius: 999px;
  border: 1px solid rgba(15, 108, 171, 0.18);
  background: linear-gradient(180deg, rgba(231, 245, 255, 0.95), rgba(215, 238, 255, 0.92));
  color: #0f6cab;
  font: inherit;
  font-weight: 600;
  cursor: pointer;
}

.wealth-family-plan__add:disabled {
  opacity: 0.55;
  cursor: default;
}

.wealth-modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 80;
  display: grid;
  place-items: center;
  padding: 1.25rem;
  background: transparent;
}

.wealth-modal {
  width: min(100%, 28rem);
  display: grid;
  gap: 0.9rem;
  padding: 1.2rem;
  border-radius: 20px;
  background: #ffffff;
  border: 1px solid rgba(226, 232, 240, 0.95);
  box-shadow: 0 28px 80px rgba(15, 23, 42, 0.2);
}

.wealth-modal__title {
  margin: 0;
  color: #173050;
  font-size: 1.1rem;
  font-weight: 700;
}

.wealth-modal__message {
  margin: 0;
  color: #5b7192;
  line-height: 1.5;
}

.wealth-modal__input {
  width: 100%;
  min-height: 3rem;
  padding: 0.8rem 0.95rem;
  border-radius: 14px;
  border: 1px solid rgba(154, 174, 204, 0.24);
  background: rgba(248, 251, 255, 0.98);
  color: #173050;
  font: inherit;
}

.wealth-modal__actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.6rem;
}

.wealth-modal__btn {
  min-height: 2.8rem;
  padding: 0.7rem 1rem;
  border-radius: 14px;
  font: inherit;
  cursor: pointer;
}

.wealth-modal__btn--ghost {
  border: 1px solid rgba(226, 232, 240, 0.95);
  background: #ffffff;
  color: #5d7394;
}

.wealth-modal__btn--primary {
  border: 1px solid rgba(15, 108, 171, 0.18);
  background: linear-gradient(180deg, rgba(231, 245, 255, 0.95), rgba(215, 238, 255, 0.92));
  color: #0f6cab;
  font-weight: 600;
}

.wealth-break-plan {
  display: grid;
  gap: 0.8rem;
}

.wealth-break-plan__list {
  display: grid;
  gap: 0.6rem;
}

.wealth-break-plan__row {
  display: flex;
  gap: 0.45rem;
  align-items: end;
  flex-wrap: nowrap;
}

.wealth-break-plan__row .wealth-family-plan__field {
  min-width: 0;
}

.wealth-break-plan__inline-toggle {
  display: inline-flex;
  align-items: center;
  gap: 0.9rem;
  min-height: 2.9rem;
  padding: 0 0.9rem;
  border-radius: 14px;
  border: 1px solid rgba(154, 174, 204, 0.22);
  background: rgba(248, 251, 255, 0.98);
  color: #173050;
  white-space: nowrap;
}

.wealth-break-plan__toggle {
  display: flex;
  align-items: center;
  gap: 0.7rem;
  color: #173050;
}

.wealth-break-plan__toggle input {
  width: 1rem;
  height: 1rem;
}

.wealth-chip-btn {
  min-height: 2.8rem;
  padding: 0.7rem 1rem;
  border-radius: 999px;
  border: 1px solid rgba(68, 109, 164, 0.18);
  background: rgba(15, 118, 110, 0.1);
  color: #0f5f58;
  font: inherit;
  cursor: pointer;
}

.wealth-chip-btn--ghost {
  background: rgba(255, 255, 255, 0.96);
  color: #355474;
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

  .wealth-break-plan__row {
    flex-wrap: wrap;
  }
}
</style>
