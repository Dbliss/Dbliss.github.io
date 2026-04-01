import {
  calculateAustralianAnnualTax,
  calculatePurchaseCosts,
  clamp,
  estimateLmi,
  estimatePropertyBorrowingPower,
  getEffectiveOwnerDepositPct,
  isDepositScalingEnabled,
  normalisePortfolioWeights,
  scalePurchaseCostsWithPrice
} from './finance.js'
import { wealthAssetBootstrapData } from './assetBootstrap.js'
import { normaliseHouseholdEarners, normaliseIncomeProfile } from './incomeSeries.js'

const DEFAULT_REGION_SCOUT_CONFIG = {
  targetYears: 5,
  propertyType: 'apartment',
  granularity: 'region',
  locationKey: null,
  savingsMode: 'defaultPortfolio',
  minPrice: null,
  maxPrice: null
}

const SUPPORTED_AREA_TYPES = new Set(['region', 'subregion', 'suburb'])
const ASSET_KEY_BY_WEIGHT = {
  qqqWeight: 'qqq',
  asxWeight: 'asx200',
  bondWeight: 'bonds',
  cashWeight: 'cash',
  bitcoinWeight: 'bitcoin'
}

export function normaliseRegionScoutConfig(config = {}) {
  const targetYears = Math.max(1, Math.round(Number(config.targetYears) || DEFAULT_REGION_SCOUT_CONFIG.targetYears))
  const propertyType = config.propertyType === 'house' ? 'house' : 'apartment'
  const granularity = ['region', 'subregion', 'suburb'].includes(config.granularity) ? config.granularity : 'region'
  const savingsMode = config.savingsMode === 'cash' ? 'cash' : 'defaultPortfolio'
  const locationKey = typeof config.locationKey === 'string' && config.locationKey.trim()
    ? config.locationKey.trim()
    : null
  const minPrice = parseOptionalPrice(config.minPrice)
  const maxPrice = parseOptionalPrice(config.maxPrice)

  return {
    targetYears,
    propertyType,
    granularity,
    locationKey,
    savingsMode,
    minPrice,
    maxPrice
  }
}

export function buildRegionScoutModel({ form, suburbSearchContext, config }) {
  const resolvedConfig = normaliseRegionScoutConfig(config)
  const futureSnapshot = estimateHouseholdSnapshot(form, resolvedConfig.targetYears, resolvedConfig.savingsMode)
  const futureBudget = estimateBuyingBudget(form, resolvedConfig.propertyType, futureSnapshot)
  const location = resolvedConfig.locationKey
    ? suburbSearchContext?.areasByKey?.[resolvedConfig.locationKey] || null
    : null

  const candidates = Object.values(suburbSearchContext?.areasByKey || {})
    .filter((area) => SUPPORTED_AREA_TYPES.has(area?.type))
    .filter((area) => area.type === resolvedConfig.granularity)
    .filter((area) => matchesLocation(area, location, resolvedConfig.granularity))
    .map((area) => buildCandidate(area, resolvedConfig.propertyType, resolvedConfig.targetYears, futureBudget.affordablePrice))
    .filter(Boolean)

  const filteredCandidates = candidates
    .filter((candidate) => (
      (resolvedConfig.minPrice === null || candidate.targetPrice >= resolvedConfig.minPrice) &&
      (resolvedConfig.maxPrice === null || candidate.targetPrice <= resolvedConfig.maxPrice)
    ))
    .sort(compareRecommendations)

  return {
    config: resolvedConfig,
    futureSnapshot,
    budget: futureBudget,
    location,
    recommendations: filteredCandidates.slice(0, 12),
    totalMatches: filteredCandidates.length,
    hasRecommendations: filteredCandidates.length > 0
  }
}

function estimateHouseholdSnapshot(form, targetYears, savingsMode) {
  const householdProfile = normaliseIncomeProfile(form?.profile || {})
  const earners = normaliseHouseholdEarners(form?.profile || {})
  const taxYear = form?.profile?.taxYear || '2026-27'
  const annualLivingCosts = Math.max(0, Number(form?.profile?.weeklyNonHousingLivingCosts) || 0) * 52
  const rentGrowthRate = clamp(Number(form?.housingCosts?.rentGrowthRate) || 0, 0, 0.1)
  const boardGrowthRate = clamp(Number(form?.housingCosts?.boardGrowthRate) || 0, 0, 0.1)
  const liveAtHomeYears = Math.max(0, Number(form?.housingCosts?.liveAtHomeYears) || 0)
  const liveAtHome = Boolean(form?.housingCosts?.liveAtHome)
  const savingsReturnRate = getSavingsReturnRate(form, savingsMode)

  let liquidSavings = householdProfile.startingSavings || 0
  let helpDebtBalances = earners.map((earner) => Math.max(0, Number(earner.helpDebtBalance) || 0))
  let annualRent = Math.max(0, Number(form?.housingCosts?.weeklyRent) || 0) * 52
  let annualBoard = Math.max(0, Number(form?.housingCosts?.weeklyBoardAtHome) || 0) * 52

  for (let yearIndex = 0; yearIndex < targetYears; yearIndex += 1) {
    if (yearIndex > 0) {
      annualRent *= 1 + rentGrowthRate
      annualBoard *= 1 + boardGrowthRate
    }

    const borrowerIncomes = earners.map((earner) => Number(earner.annualIncomeSeries?.[yearIndex]) || 0)
    const salaryTax = borrowerIncomes.reduce((sum, annualIncome) => (
      sum + calculateAustralianAnnualTax({ taxYear, salaryIncome: annualIncome }).totalTax
    ), 0)

    let helpRepaymentTotal = 0
    helpDebtBalances = helpDebtBalances.map((balance, index) => {
      const outcome = rollForwardHelpDebtEstimate(balance, borrowerIncomes[index] || 0)
      helpRepaymentTotal += outcome.actualRepayment
      return outcome.closingBalance
    })

    const housingCost = liveAtHome && yearIndex < liveAtHomeYears ? annualBoard : annualRent
    const annualIncome = borrowerIncomes.reduce((sum, income) => sum + income, 0)
    const annualSurplus = annualIncome - salaryTax - helpRepaymentTotal - annualLivingCosts - housingCost

    liquidSavings = Math.max(0, liquidSavings * (1 + savingsReturnRate) + annualSurplus)
  }

  const targetYearIndex = Math.min(Math.max(0, targetYears), Math.max(0, (householdProfile.annualIncomeSeries?.length || 1) - 1))
  const borrowerIncomes = earners.map((earner) => Number(earner.annualIncomeSeries?.[targetYearIndex]) || 0)

  return {
    targetYears,
    annualIncome: householdProfile.annualIncomeSeries?.[targetYearIndex] || householdProfile.annualIncome || 0,
    borrowerIncomes,
    helpDebtBalances,
    liquidSavings,
    savingsReturnRate
  }
}

function getSavingsReturnRate(form, savingsMode) {
  if (savingsMode === 'cash') {
    return clamp(Number(form?.portfolioConfig?.cashReturnMean) || 0, -0.02, 0.12)
  }

  const weights = normalisePortfolioWeights(form?.portfolioConfig || {})
  return Object.entries(ASSET_KEY_BY_WEIGHT).reduce((sum, [weightKey, assetKey]) => {
    const assetReturn = estimateAnnualAssetReturn(assetKey)
    return sum + (Number(weights[weightKey]) || 0) * assetReturn
  }, 0)
}

function estimateAnnualAssetReturn(assetKey) {
  const monthlyReturns = wealthAssetBootstrapData.assets?.[assetKey]?.monthlyReturns || []
  if (!monthlyReturns.length) return 0
  const compounded = monthlyReturns.reduce((value, month) => value * (1 + (Number(month.totalReturn) || 0)), 1)
  return Math.pow(compounded, 12 / monthlyReturns.length) - 1
}

function estimateBuyingBudget(form, propertyType, snapshot) {
  const propertyConfig = form?.propertyConfig?.[propertyType]
  if (!propertyConfig) {
    return {
      affordablePrice: 0,
      requiredCash: 0,
      depositPct: 0,
      remainingCash: snapshot.liquidSavings || 0
    }
  }

  const basePrice = Math.max(250000, Number(propertyConfig.purchasePrice) || 0)
  let low = 0
  let high = basePrice

  while (canAffordProperty(form, snapshot, propertyType, high) && high < 12_000_000) {
    low = high
    high *= 1.2
  }

  for (let step = 0; step < 30; step += 1) {
    const midpoint = roundToNearestThousand((low + high) / 2)
    if (canAffordProperty(form, snapshot, propertyType, midpoint)) {
      low = midpoint
    } else {
      high = midpoint
    }
  }

  const affordablePrice = roundToNearestThousand(low)
  const plan = solveBestPurchasePlan(form, snapshot, propertyType, affordablePrice)

  return {
    affordablePrice,
    requiredCash: plan?.requiredCash || 0,
    depositPct: plan?.depositPct || getEffectiveOwnerDepositPct(propertyConfig),
    remainingCash: Math.max(0, snapshot.liquidSavings - (plan?.requiredCash || 0))
  }
}

function canAffordProperty(form, snapshot, propertyType, propertyValue) {
  const propertyConfig = form?.propertyConfig?.[propertyType]
  const plan = solveBestPurchasePlan(form, snapshot, propertyType, propertyValue)
  if (!propertyConfig || !plan) return false

  const borrowingPower = estimatePropertyBorrowingPower({
    taxYear: form?.profile?.taxYear,
    annualIncome: snapshot.annualIncome,
    annualIncomeByBorrower: snapshot.borrowerIncomes,
    helpDebtBalances: snapshot.helpDebtBalances,
    weeklyNonHousingLivingCosts: form?.profile?.weeklyNonHousingLivingCosts,
    occupancyMode: 'owner',
    propertyType,
    propertyConfig,
    propertyValue,
    mortgageYears: propertyConfig.mortgageYears
  })

  return plan.openingLoanBalance <= borrowingPower.maxLoanSize
}

function solveBestPurchasePlan(form, snapshot, propertyType, propertyValue) {
  const propertyConfig = form?.propertyConfig?.[propertyType]
  if (!propertyConfig) return null

  const minimumPlan = buildPurchasePlan(form, propertyType, propertyValue, getEffectiveOwnerDepositPct(propertyConfig))
  if (!minimumPlan || minimumPlan.requiredCash > snapshot.liquidSavings) return null

  if (!isDepositScalingEnabled(propertyConfig, 'owner')) return minimumPlan

  let low = minimumPlan.depositPct
  let high = 0.95
  let bestPlan = minimumPlan

  const highPlan = buildPurchasePlan(form, propertyType, propertyValue, high)
  if (highPlan && highPlan.requiredCash <= snapshot.liquidSavings) {
    return highPlan
  }

  for (let step = 0; step < 28; step += 1) {
    const midpoint = (low + high) / 2
    const plan = buildPurchasePlan(form, propertyType, propertyValue, midpoint)
    if (!plan) break
    if (plan.requiredCash <= snapshot.liquidSavings) {
      low = midpoint
      bestPlan = plan
    } else {
      high = midpoint
    }
  }

  return bestPlan
}

function buildPurchasePlan(form, propertyType, propertyValue, depositPct) {
  const propertyConfig = form?.propertyConfig?.[propertyType]
  if (!propertyConfig) return null

  const safePropertyValue = Math.max(0, Number(propertyValue) || 0)
  const safeDepositPct = clamp(Number(depositPct) || 0, 0.05, 0.95)
  const deposit = safePropertyValue * safeDepositPct
  const lmi = estimateLmi(safePropertyValue, safeDepositPct, Boolean(form?.propertyConfig?.firstHomeBuyerEligible))
  const scaledPurchaseCosts = scalePurchaseCostsWithPrice(
    propertyConfig.ownerPurchaseCosts,
    propertyConfig.purchasePrice,
    safePropertyValue,
    propertyType
  )
  const purchaseCosts = calculatePurchaseCosts(
    scaledPurchaseCosts,
    Boolean(form?.propertyConfig?.firstHomeBuyerEligible),
    safePropertyValue
  )

  return {
    depositPct: safeDepositPct,
    requiredCash: deposit + purchaseCosts.total,
    openingLoanBalance: Math.max(0, safePropertyValue - deposit + lmi)
  }
}

function buildCandidate(area, propertyType, targetYears, futureBudget) {
  const property = area?.[propertyType]
  const priceToday = Math.max(0, Number(property?.currentPriceEstimate ?? property?.latestActualPrice) || 0)
  const growthMean = Number(property?.annualGrowthMean)
  if (!(priceToday > 0) || !Number.isFinite(growthMean)) return null

  const targetPrice = priceToday * Math.pow(1 + growthMean, targetYears)
  const actualPoints = area?.marketHistory?.[propertyType]?.actualPoints || []
  const firstYear = actualPoints[0]?.year || null
  const lastYear = actualPoints[actualPoints.length - 1]?.year || null
  const historyYears = firstYear && lastYear ? Math.max(1, (lastYear - firstYear) + 1) : actualPoints.length
  const salesAverage = Number(area?.marketHistory?.salesSummary?.[`${propertyType}Average`]) || 0

  return {
    key: area.key,
    label: area.label,
    type: area.type,
    regionLabel: area.regionLabel || area.label,
    priceToday,
    targetPrice,
    growthMean,
    historyYears,
    salesAverage,
    budgetGap: futureBudget - targetPrice
  }
}

function matchesLocation(area, location, granularity) {
  if (!location) return true
  if (granularity === 'region') return area.key === location.key
  return area.regionLabel === location.label
}

function compareRecommendations(left, right) {
  if (right.growthMean !== left.growthMean) return right.growthMean - left.growthMean
  if (right.budgetGap !== left.budgetGap) return right.budgetGap - left.budgetGap
  if (right.salesAverage !== left.salesAverage) return right.salesAverage - left.salesAverage
  return left.targetPrice - right.targetPrice
}

function parseOptionalPrice(value) {
  const safeValue = Number(value)
  return Number.isFinite(safeValue) && safeValue > 0 ? safeValue : null
}

function roundToNearestThousand(value) {
  return Math.round((Math.max(0, Number(value) || 0)) / 1000) * 1000
}

function rollForwardHelpDebtEstimate(openingBalance = 0, annualIncome = 0) {
  const safeOpeningBalance = Math.max(0, Number(openingBalance) || 0)
  if (safeOpeningBalance <= 0) {
    return {
      actualRepayment: 0,
      closingBalance: 0
    }
  }

  const indexedBalance = safeOpeningBalance * 1.03
  const repayment = estimateHelpRepayment(annualIncome)
  const actualRepayment = Math.min(indexedBalance, repayment)

  return {
    actualRepayment,
    closingBalance: Math.max(0, indexedBalance - actualRepayment)
  }
}

function estimateHelpRepayment(annualIncome = 0) {
  const safeAnnualIncome = Math.max(0, Number(annualIncome) || 0)
  if (safeAnnualIncome <= 67_000) return 0
  if (safeAnnualIncome <= 125_000) return Math.max(0, safeAnnualIncome - 67_000) * 0.15
  if (safeAnnualIncome <= 179_285) return 8_700 + Math.max(0, safeAnnualIncome - 125_000) * 0.17
  return safeAnnualIncome * 0.1
}
