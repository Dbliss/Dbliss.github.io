import { clamp } from './finance.js'

function toIncome(value) {
  return Math.max(0, Number(value) || 0)
}

function clampIncomeCurve(value) {
  if (value === 'logarithmic') return 'logarithmic'
  if (value === 'sigmoid') return 'sigmoid'
  if (value === 'exponential') return 'exponential'
  return 'sigmoid'
}

function createDefaultCareerBreakPlan(horizonYears = 30) {
  return {
    id: null,
    enabled: false,
    startYear: Math.min(5, Math.max(1, horizonYears)),
    durationYears: 1,
    neverReturn: false,
    reason: 'personal'
  }
}

function createDefaultFamilyPlan() {
  return {
    existingChildren: 0,
    plannedChildren: []
  }
}

export function clampIncomeGrowthRate(value) {
  return clamp(Number(value) || 0, 0, 0.1)
}

function getSafeHorizonYears(value) {
  return Math.max(1, Math.round(Number(value) || 1))
}

export function normaliseCareerBreakPlan(plan = {}, horizonYears = 30, allowChildReason = true) {
  const safeHorizonYears = getSafeHorizonYears(horizonYears)
  const safeDuration = Number(plan?.durationYears)
  const durationYears = safeDuration === 0.5
    ? 0.5
    : Math.max(1, Math.min(safeHorizonYears, Math.round(safeDuration || 1)))
  const reason = plan?.reason === 'child' && allowChildReason ? 'child' : 'personal'
  const minimumStartYear = reason === 'child' ? Math.min(2, safeHorizonYears) : 1

  return {
    ...createDefaultCareerBreakPlan(safeHorizonYears),
    id: plan?.id || null,
    enabled: Boolean(plan?.enabled),
    startYear: clamp(Math.round(Number(plan?.startYear) || minimumStartYear), minimumStartYear, safeHorizonYears),
    durationYears,
    neverReturn: Boolean(plan?.neverReturn),
    reason
  }
}

export function normaliseCareerBreakPlans(plans = [], horizonYears = 30, allowChildReason = true) {
  const safeHorizonYears = getSafeHorizonYears(horizonYears)
  const rawPlans = Array.isArray(plans) && plans.length
    ? plans
    : [plans].filter(Boolean)

  return rawPlans
    .map((plan, index) => normaliseCareerBreakPlan(plan, safeHorizonYears, allowChildReason))
    .filter((plan) => plan.enabled)
    .map((plan, index) => ({
      ...plan,
      id: plan.id || `career-break-${index + 1}`
    }))
    .sort((left, right) => left.startYear - right.startYear)
}

export function normaliseFamilyPlan(profile = {}, householdSize = null) {
  const resolvedHouseholdSize = householdSize ?? (Array.isArray(profile?.earners) && profile.earners.length ? profile.earners.length : 1)
  if (resolvedHouseholdSize < 2) {
    return createDefaultFamilyPlan()
  }

  const existingChildren = Math.max(0, Math.min(6, Math.round(Number(profile?.familyPlan?.existingChildren) || 0)))
  const plannedChildren = Array.isArray(profile?.familyPlan?.plannedChildren)
    ? profile.familyPlan.plannedChildren
        .map((child, index) => ({
          id: child?.id || `planned-child-${index + 1}`,
          year: Math.max(2, Math.round(Number(child?.year) || 2))
        }))
        .slice(0, 6)
    : []

  return {
    existingChildren,
    plannedChildren
  }
}

export function getPlannedChildrenCountByYear(profile = {}, yearIndex = 0) {
  const familyPlan = normaliseFamilyPlan(profile)
  const safeYear = Math.max(0, Math.round(Number(yearIndex) || 0))
  return familyPlan.plannedChildren.filter((child) => Math.max(1, Math.round(Number(child.year) || 1)) <= safeYear + 1).length
}

export function getTotalChildrenCountByYear(profile = {}, yearIndex = 0) {
  const familyPlan = normaliseFamilyPlan(profile)
  return familyPlan.existingChildren + getPlannedChildrenCountByYear(profile, yearIndex)
}

export function getAdjustedWeeklyLivingCosts(profile = {}, yearIndex = 0) {
  const baseWeeklyCost = Math.max(0, Number(profile?.weeklyNonHousingLivingCosts) || 0)
  const householdSize = Array.isArray(profile?.earners) && profile.earners.length ? profile.earners.length : 1
  if (householdSize < 2) return baseWeeklyCost

  const familyPlan = normaliseFamilyPlan(profile, householdSize)
  const currentFactor = 1 + (familyPlan.existingChildren * 0.2)
  const targetFactor = 1 + (getTotalChildrenCountByYear(profile, yearIndex) * 0.2)
  if (currentFactor <= 0) return baseWeeklyCost
  return baseWeeklyCost * (targetFactor / currentFactor)
}

export function getCareerBreakIncomeFactor(earner = {}, yearIndex = 0, householdSize = 1) {
  const safeYearIndex = Math.max(0, Math.round(Number(yearIndex) || 0))
  const plans = normaliseCareerBreakPlans(
    earner?.careerBreakPlans?.length ? earner.careerBreakPlans : earner?.careerBreakPlan,
    earner?.horizonYears,
    householdSize > 1
  )
  if (!plans.length) return 1

  let leaveFraction = 0
  for (const plan of plans) {
    const startIndex = Math.max(0, plan.startYear - 1)
    if (safeYearIndex < startIndex) continue
    if (plan.neverReturn) return 0
    if (plan.durationYears === 0.5) {
      if (safeYearIndex === startIndex) {
        leaveFraction += 0.5
      }
      continue
    }
    if (safeYearIndex < startIndex + plan.durationYears) {
      leaveFraction += 1
    }
  }

  return Math.max(0, 1 - Math.min(1, leaveFraction))
}

export function getEarnerAnnualIncomeForYear(earner = {}, yearIndex = 0, householdSize = 1) {
  const safeYearIndex = Math.max(0, Math.round(Number(yearIndex) || 0))
  const baseSeries = Array.isArray(earner?.annualIncomeSeries) && earner.annualIncomeSeries.length
    ? earner.annualIncomeSeries
    : [Math.max(0, Number(earner?.annualIncome) || 0)]
  const safeBaseIncome = (index) => Math.max(0, Number(baseSeries[Math.max(0, Math.min(index, baseSeries.length - 1))] ?? earner?.annualIncome) || 0)
  const plans = normaliseCareerBreakPlans(
    earner?.careerBreakPlans?.length ? earner.careerBreakPlans : earner?.careerBreakPlan,
    earner?.horizonYears,
    householdSize > 1
  )

  if (!plans.length) return Math.round(safeBaseIncome(safeYearIndex))

  let sourceIndex = -1
  let inFullLeaveBlock = false

  for (let index = 0; index <= safeYearIndex; index += 1) {
    const leaveFactor = getCareerBreakIncomeFactor({
      ...earner,
      careerBreakPlans: plans
    }, index, householdSize)

    if (leaveFactor <= 0) {
      if (!inFullLeaveBlock) {
        sourceIndex = Math.max(-1, sourceIndex - 1)
        inFullLeaveBlock = true
      }
      if (index === safeYearIndex) return 0
      continue
    }

    inFullLeaveBlock = false
    sourceIndex += 1
    const income = safeBaseIncome(sourceIndex) * leaveFactor
    if (index === safeYearIndex) return Math.round(income)
  }

  return Math.round(safeBaseIncome(safeYearIndex))
}

function normaliseSingleIncomeProfile(profile = {}) {
  const safeAnnualIncome = toIncome(profile.annualIncome)
  const safeHorizonYears = getSafeHorizonYears(profile.horizonYears)
  const safeGrowthRate = clampIncomeGrowthRate(profile.incomeGrowthRate)
  const incomeCurve = clampIncomeCurve(profile.incomeCurve)
  const useCustomIncomeSeries = Boolean(profile.useCustomIncomeSeries)
  const annualIncomeSeries = useCustomIncomeSeries
    ? resizeCustomIncomeSeries(profile.annualIncomeSeries, safeAnnualIncome, safeHorizonYears, safeGrowthRate, incomeCurve)
    : buildFlatIncomeSeries(safeAnnualIncome, safeGrowthRate, safeHorizonYears, incomeCurve)

  return {
    annualIncome: safeAnnualIncome,
    horizonYears: safeHorizonYears,
    incomeGrowthRate: safeGrowthRate,
    incomeCurve,
    useCustomIncomeSeries,
    annualIncomeSeries
  }
}

function getIncomeShareWeights(earners) {
  const householdIncome = earners.reduce((sum, earner) => sum + earner.annualIncome, 0)
  if (householdIncome > 0) {
    return earners.map((earner) => earner.annualIncome / householdIncome)
  }
  return earners.map(() => 1 / Math.max(earners.length, 1))
}

export function normaliseHouseholdEarners(profile = {}) {
  const safeHorizonYears = getSafeHorizonYears(profile.horizonYears)
  const earners = Array.isArray(profile.earners) && profile.earners.length
    ? profile.earners
    : [{
        annualIncome: profile.annualIncome,
        incomeGrowthRate: profile.incomeGrowthRate,
        incomeCurve: profile.incomeCurve,
        useCustomIncomeSeries: profile.useCustomIncomeSeries,
        annualIncomeSeries: profile.annualIncomeSeries,
        helpDebtBalance: profile.helpDebtBalance,
        label: 'Borrower 1'
      }]

  const normalisedEarners = earners.slice(0, 2).map((earner, index) => {
    const normalisedIncome = normaliseSingleIncomeProfile({
      ...earner,
      horizonYears: safeHorizonYears
    })

    return {
      id: earner?.id || `earner-${index + 1}`,
      label: String(earner?.label || `Borrower ${index + 1}`),
      startingSavings: Math.max(0, Number(earner?.startingSavings) || 0),
      helpDebtBalance: Math.max(0, Number(earner?.helpDebtBalance) || 0),
      careerBreakPlans: normaliseCareerBreakPlans(
        earner?.careerBreakPlans?.length ? earner.careerBreakPlans : earner?.careerBreakPlan,
        safeHorizonYears,
        earners.length > 1
      ),
      careerBreakPlan: normaliseCareerBreakPlans(
        earner?.careerBreakPlans?.length ? earner.careerBreakPlans : earner?.careerBreakPlan,
        safeHorizonYears,
        earners.length > 1
      )[0] || createDefaultCareerBreakPlan(safeHorizonYears),
      ...normalisedIncome
    }
  })

  return normalisedEarners.length ? normalisedEarners : [{
    id: 'earner-1',
    label: 'Borrower 1',
    startingSavings: 0,
    helpDebtBalance: 0,
    careerBreakPlans: [],
    careerBreakPlan: createDefaultCareerBreakPlan(safeHorizonYears),
    ...normaliseSingleIncomeProfile({ annualIncome: 0, horizonYears: safeHorizonYears })
  }]
}

export function combineIncomeSeries(earners = [], horizonYears = 1) {
  const safeHorizonYears = getSafeHorizonYears(horizonYears)
  return Array.from({ length: safeHorizonYears }, (_, yearIndex) =>
    Math.round(earners.reduce((sum, earner) => sum + (Number(earner?.annualIncomeSeries?.[yearIndex]) || 0), 0))
  )
}

export function buildFlatIncomeSeries(annualIncome, incomeGrowthRate, horizonYears, incomeCurve = 'sigmoid') {
  const safeAnnualIncome = toIncome(annualIncome)
  const safeGrowthRate = clampIncomeGrowthRate(incomeGrowthRate)
  const safeHorizonYears = getSafeHorizonYears(horizonYears)
  const safeIncomeCurve = clampIncomeCurve(incomeCurve)

  if (safeIncomeCurve === 'logarithmic') {
    const saturationWeight = Math.max(4.5, 8 - safeGrowthRate * 20)
    return Array.from({ length: safeHorizonYears }, (_, yearIndex) => {
      if (yearIndex === 0) return safeAnnualIncome
      const progress = yearIndex / Math.max(1, safeHorizonYears - 1)
      const scaledProgress = Math.log1p(progress * saturationWeight) / Math.log1p(saturationWeight)
      const effectiveYears = scaledProgress * Math.max(1, safeHorizonYears - 1)
      return Math.round(safeAnnualIncome * Math.pow(1 + safeGrowthRate, effectiveYears))
    })
  }

  if (safeIncomeCurve === 'sigmoid') {
    const midpoint = Math.max(0.35, Math.min(0.55, 0.48 - safeGrowthRate * 0.6))
    const steepness = Math.max(4.5, Math.min(8, 5.8 + safeGrowthRate * 18))
    const startValue = 1 / (1 + Math.exp(steepness * midpoint))
    const endValue = 1 / (1 + Math.exp(-steepness * (1 - midpoint)))

    return Array.from({ length: safeHorizonYears }, (_, yearIndex) => {
      if (yearIndex === 0) return safeAnnualIncome
      const progress = yearIndex / Math.max(1, safeHorizonYears - 1)
      const logisticValue = 1 / (1 + Math.exp(-steepness * (progress - midpoint)))
      const scaledProgress = (logisticValue - startValue) / Math.max(0.0001, endValue - startValue)
      const effectiveYears = scaledProgress * Math.max(1, safeHorizonYears - 1)
      return Math.round(safeAnnualIncome * Math.pow(1 + safeGrowthRate, effectiveYears))
    })
  }

  return Array.from({ length: safeHorizonYears }, (_, yearIndex) =>
    Math.round(safeAnnualIncome * Math.pow(1 + safeGrowthRate, yearIndex))
  )
}

export function resizeCustomIncomeSeries(series, annualIncome, horizonYears, incomeGrowthRate, incomeCurve = 'sigmoid') {
  const flatSeries = buildFlatIncomeSeries(annualIncome, incomeGrowthRate, horizonYears, incomeCurve)
  const safeSeries = Array.isArray(series) ? series : []

  return flatSeries.map((fallbackValue, index) => {
    if (index === 0) return fallbackValue
    const customValue = toIncome(safeSeries[index])
    return customValue > 0 ? Math.round(customValue) : fallbackValue
  })
}

export function scaleCustomIncomeSeries(series, previousAnnualIncome, nextAnnualIncome, horizonYears, incomeGrowthRate, incomeCurve = 'sigmoid') {
  const resizedSeries = resizeCustomIncomeSeries(series, previousAnnualIncome, horizonYears, incomeGrowthRate, incomeCurve)
  const safePreviousAnnualIncome = toIncome(previousAnnualIncome)
  const safeNextAnnualIncome = toIncome(nextAnnualIncome)

  if (safePreviousAnnualIncome <= 0) {
    return resizeCustomIncomeSeries(series, nextAnnualIncome, horizonYears, incomeGrowthRate, incomeCurve)
  }

  const scale = safeNextAnnualIncome / safePreviousAnnualIncome
  return resizedSeries.map((value, index) =>
    index === 0 ? safeNextAnnualIncome : Math.round(Math.max(0, value * scale))
  )
}

export function normaliseIncomeProfile(profile = {}) {
  const safeHorizonYears = getSafeHorizonYears(profile.horizonYears)
  const normalisedEarners = normaliseHouseholdEarners({
    ...profile,
    horizonYears: safeHorizonYears
  })
  const annualIncomeSeries = combineIncomeSeries(normalisedEarners, safeHorizonYears)
  const annualIncome = annualIncomeSeries[0] || 0
  const incomeShareWeights = getIncomeShareWeights(normalisedEarners)
  const blendedGrowthRate = normalisedEarners.reduce(
    (sum, earner, index) => sum + earner.incomeGrowthRate * (incomeShareWeights[index] || 0),
    0
  )
  const householdUsesCustomSeries = normalisedEarners.some((earner) => earner.useCustomIncomeSeries)
  const blendedCurve = householdUsesCustomSeries
    ? 'sigmoid'
    : normalisedEarners.every((earner) => earner.incomeCurve === 'exponential')
      ? 'exponential'
      : normalisedEarners.every((earner) => earner.incomeCurve === 'logarithmic')
        ? 'logarithmic'
        : 'sigmoid'

  return {
    annualIncome,
    horizonYears: safeHorizonYears,
    incomeGrowthRate: blendedGrowthRate,
    incomeCurve: blendedCurve,
    useCustomIncomeSeries: householdUsesCustomSeries,
    annualIncomeSeries,
    earners: normalisedEarners,
    familyPlan: normaliseFamilyPlan(profile, normalisedEarners.length),
    startingSavings: normalisedEarners.reduce((sum, earner) => sum + earner.startingSavings, 0),
    helpDebtBalance: normalisedEarners.reduce((sum, earner) => sum + earner.helpDebtBalance, 0)
  }
}

export function getIncomeForYear(profile, yearIndex) {
  const normalisedProfile = normaliseIncomeProfile(profile)
  const safeYearIndex = clamp(Math.round(Number(yearIndex) || 0), 0, normalisedProfile.annualIncomeSeries.length - 1)
  return normalisedProfile.annualIncomeSeries[safeYearIndex] || 0
}

export function getIncomeScaleForYear(profile, yearIndex) {
  const normalisedProfile = normaliseIncomeProfile(profile)
  const baseIncome = normalisedProfile.annualIncomeSeries[0] || 0
  if (baseIncome <= 0) return 1
  return (normalisedProfile.annualIncomeSeries[Math.max(0, Math.min(yearIndex, normalisedProfile.annualIncomeSeries.length - 1))] || 0) / baseIncome
}
