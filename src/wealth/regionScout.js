import {
  calculateAustralianAnnualTax,
  calculatePurchaseCosts,
  clamp,
  createMulberry32,
  estimateLmi,
  estimatePropertyBorrowingPower,
  getEffectiveOwnerDepositPct,
  isDepositScalingEnabled,
  normalisePortfolioWeights,
  percentileSummary,
  sampleNormal,
  scalePurchaseCostsWithPrice
} from './finance.js'
import { wealthAssetBootstrapData } from './assetBootstrap.js'
import { normaliseHouseholdEarners, normaliseIncomeProfile } from './incomeSeries.js'

const DEFAULT_REGION_SCOUT_CONFIG = {
  targetYears: 5,
  buyFlexibility: 'target',
  propertyType: 'apartment',
  granularity: 'region',
  locationKey: null,
  savingsMode: 'defaultPortfolio',
  depositMode: 'optimal',
  fixedDepositPct: 0.2,
  rentalYieldWeight: 0,
  riskAppetite: 'medium'
}

const SUPPORTED_AREA_TYPES = new Set(['region', 'suburb'])
const ASSET_KEY_BY_WEIGHT = {
  qqqWeight: 'qqq',
  asxWeight: 'asx200',
  bondWeight: 'bonds',
  cashWeight: 'cash',
  bitcoinWeight: 'bitcoin'
}

export function normaliseRegionScoutConfig(config = {}) {
  const buyFlexibility = config.buyFlexibility === 'whenever' ? 'whenever' : 'target'
  const locationKey = typeof config.locationKey === 'string' && config.locationKey.trim()
    ? config.locationKey.trim()
    : null

  return {
    targetYears: Math.round(clamp(Number(config.targetYears) || DEFAULT_REGION_SCOUT_CONFIG.targetYears, 0, 20)),
    buyFlexibility,
    propertyType: config.propertyType === 'house' ? 'house' : 'apartment',
    granularity: locationKey ? 'suburb' : (config.granularity === 'suburb' ? 'suburb' : 'region'),
    locationKey,
    savingsMode: config.savingsMode === 'cash' ? 'cash' : 'defaultPortfolio',
    depositMode: config.depositMode === 'fixed' ? 'fixed' : 'optimal',
    fixedDepositPct: clamp(Number(config.fixedDepositPct) || DEFAULT_REGION_SCOUT_CONFIG.fixedDepositPct, 0.05, 0.95),
    rentalYieldWeight: clamp(Number(config.rentalYieldWeight) || 0, 0, 1),
    riskAppetite: ['small', 'medium', 'large'].includes(config.riskAppetite) ? config.riskAppetite : 'medium'
  }
}

export function buildRegionScoutPreviewModel({ form, suburbSearchContext, config }) {
  const resolvedConfig = normaliseRegionScoutConfig(config)
  const location = resolvedConfig.locationKey
    ? suburbSearchContext?.areasByKey?.[resolvedConfig.locationKey] || null
    : null
  const summaryTimeline = buildAffordabilityTimeline(form, resolvedConfig.propertyType, resolvedConfig, 20)
  const detailTimeline = buildAffordabilityTimeline(form, resolvedConfig.propertyType, resolvedConfig, 30)
  const summaryYear = resolvedConfig.buyFlexibility === 'target' ? resolvedConfig.targetYears : 0
  const summaryEntry = summaryTimeline.find((entry) => entry.year === summaryYear) || summaryTimeline[0] || createEmptyTimelineEntry()

  return {
    config: resolvedConfig,
    location,
    budget: {
      affordablePrice: summaryEntry.affordablePrice,
      requiredCash: summaryEntry.requiredCash,
      depositPct: summaryEntry.depositPct,
      remainingCash: summaryEntry.remainingCash
    },
    currentSnapshot: summaryTimeline[0] || createEmptyTimelineEntry(),
    futureSnapshot: summaryEntry,
    affordabilityTimeline: summaryTimeline,
    detailTimeline
  }
}

export function buildRegionScoutResultsModel({ form, suburbSearchContext, config, previewModel = null }) {
  const preview = previewModel || buildRegionScoutPreviewModel({ form, suburbSearchContext, config })
  const resolvedConfig = preview.config
  const location = preview.location

  const statewideCandidates = Object.values(suburbSearchContext?.areasByKey || {})
    .filter((area) => SUPPORTED_AREA_TYPES.has(area?.type))
    .filter((area) => area.type === resolvedConfig.granularity)
    .map((area) => buildRecommendation(area, form, resolvedConfig, preview.detailTimeline))
    .filter(Boolean)

  const candidates = statewideCandidates.filter((area) => matchesLocation(area, location, resolvedConfig.granularity))
  const filteredCandidates = candidates.sort(compareRecommendations)
  const scoreReferenceRecommendations = [...statewideCandidates].sort(compareRecommendations)

  const recommendations = filteredCandidates.slice(0, 12)
  const bestTiming = recommendations
    .map((candidate) => candidate.selectedYear)
    .filter((year) => Number.isFinite(year))
    .sort((left, right) => left - right)[0] ?? null

  return {
    ...preview,
    allRecommendations: filteredCandidates,
    scoreReferenceRecommendations,
    recommendations,
    totalMatches: filteredCandidates.length,
    hasRecommendations: recommendations.length > 0,
    bestTiming
  }
}

export function buildRegionScoutModel(args) {
  const preview = buildRegionScoutPreviewModel(args)
  return buildRegionScoutResultsModel({ ...args, previewModel: preview })
}

function buildAffordabilityTimeline(form, propertyType, config, horizonYears = 20) {
  const years = Array.from({ length: horizonYears + 1 }, (_, index) => index)
  return years.map((year) => {
    const snapshot = estimateHouseholdSnapshot(form, year, config.savingsMode)
    const budget = estimateBuyingBudget(form, propertyType, snapshot, config)
    return {
      year,
      annualIncome: snapshot.annualIncome,
      liquidSavings: snapshot.liquidSavings,
      savingsReturnRate: snapshot.savingsReturnRate,
      affordablePrice: budget.affordablePrice,
      requiredCash: budget.requiredCash,
      depositPct: budget.depositPct,
      remainingCash: budget.remainingCash
    }
  })
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

function estimateBuyingBudget(form, propertyType, snapshot, config) {
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

  while (canAffordProperty(form, snapshot, propertyType, high, config) && high < 12_000_000) {
    low = high
    high *= 1.2
  }

  for (let step = 0; step < 30; step += 1) {
    const midpoint = roundToNearestThousand((low + high) / 2)
    if (canAffordProperty(form, snapshot, propertyType, midpoint, config)) {
      low = midpoint
    } else {
      high = midpoint
    }
  }

  const affordablePrice = roundToNearestThousand(low)
  const plan = solvePurchasePlan(form, snapshot, propertyType, affordablePrice, config)

  return {
    affordablePrice,
    requiredCash: plan?.requiredCash || 0,
    depositPct: plan?.depositPct || getEffectiveOwnerDepositPct(propertyConfig),
    remainingCash: Math.max(0, snapshot.liquidSavings - (plan?.requiredCash || 0))
  }
}

function canAffordProperty(form, snapshot, propertyType, propertyValue, config) {
  const propertyConfig = form?.propertyConfig?.[propertyType]
  const plan = solvePurchasePlan(form, snapshot, propertyType, propertyValue, config)
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

function solvePurchasePlan(form, snapshot, propertyType, propertyValue, config) {
  const propertyConfig = form?.propertyConfig?.[propertyType]
  if (!propertyConfig) return null

  if (config.depositMode === 'fixed') {
    const fixedPlan = buildPurchasePlan(form, propertyType, propertyValue, config.fixedDepositPct)
    return fixedPlan && fixedPlan.requiredCash <= snapshot.liquidSavings ? fixedPlan : null
  }

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

function buildRecommendation(area, form, config, detailTimeline) {
  const property = area?.[config.propertyType]
  const priceToday = Math.max(0, Number(property?.currentPriceEstimate ?? property?.latestActualPrice) || 0)
  const growthMean = Number(property?.annualGrowthMean)
  if (!(priceToday > 0) || !Number.isFinite(growthMean)) return null

  const growthVolatility = clamp(Number(property?.annualGrowthVolatility) || Math.max(Math.abs(growthMean) * 1.4, 0.04), 0.03, 0.25)
  const marketScore = buildMarketScore(area, config.propertyType, priceToday, growthMean, growthVolatility, config, seedFromKey(area.key))
  const priceRequirementSeries = detailTimeline.map((timelinePoint) => {
    const projectedPrice = roundToNearestThousand(priceToday * Math.pow(1 + growthMean, timelinePoint.year))
    const plan = solvePurchasePlan(form, { ...timelinePoint }, config.propertyType, projectedPrice, config)
    return {
      year: timelinePoint.year,
      projectedPrice,
      requiredCash: plan?.requiredCash || 0,
      depositPct: plan?.depositPct || null,
      affordable: Boolean(plan) && timelinePoint.affordablePrice >= projectedPrice && timelinePoint.liquidSavings >= plan.requiredCash
    }
  })

  const targetSeriesPoint = priceRequirementSeries.find((point) => point.year === config.targetYears) || null
  const selectedSeriesPoint = resolveSelectedTimingPoint(priceRequirementSeries, config)
  const summaryPoint = priceRequirementSeries.find((point) => point.year === (config.buyFlexibility === 'target' ? config.targetYears : 0))
    || priceRequirementSeries[0]
  const actualPoints = area?.marketHistory?.[config.propertyType]?.actualPoints || []
  const firstYear = actualPoints[0]?.year || null
  const lastYear = actualPoints[actualPoints.length - 1]?.year || null
  const historyYears = firstYear && lastYear ? Math.max(1, (lastYear - firstYear) + 1) : actualPoints.length
  const salesAverage = Number(area?.marketHistory?.salesSummary?.[`${config.propertyType}Average`]) || 0
  const comparisonPoint = config.buyFlexibility === 'target'
    ? (targetSeriesPoint || summaryPoint)
    : (selectedSeriesPoint || summaryPoint)
  const comparisonPrice = comparisonPoint?.projectedPrice || summaryPoint?.projectedPrice || priceToday
  const comparisonBudget = detailTimeline.find((point) => point.year === (comparisonPoint?.year ?? summaryPoint?.year ?? 0)) || detailTimeline[0]
  const budgetGap = (comparisonBudget?.affordablePrice || 0) - comparisonPrice
  const monteCarloSeries = buildMonteCarloSeries(priceToday, growthMean, growthVolatility, 30, seedFromKey(area.key))
  const affordableAtTargetYear = Boolean(targetSeriesPoint?.affordable)

  return {
    key: area.key,
    label: area.label,
    type: area.type,
    regionLabel: area.regionLabel || area.label,
    priceToday,
    buyYearPrice: comparisonPrice,
    comparisonPrice,
    selectedYear: selectedSeriesPoint?.year ?? null,
    earliestAffordableYear: priceRequirementSeries.find((point) => point.affordable)?.year ?? null,
    selectedTimingLabel: selectedSeriesPoint?.label || 'Not affordable in 20 years',
    growthMean,
    growthScore: marketScore.growthScore,
    growthScoreRaw: marketScore.growthMedian,
    growthScoreVolatility: marketScore.growthVolatility,
    rentalYieldScore: marketScore.yieldScore,
    rentalYieldMedian: marketScore.yieldMedian,
    rentalYieldVolatility: marketScore.yieldVolatility,
    rankingScore: marketScore.combinedScore,
    historyYears,
    salesAverage,
    budgetGap,
    isAffordable: config.buyFlexibility === 'target' ? affordableAtTargetYear : Boolean(selectedSeriesPoint?.affordable),
    requiredCashAtBuyYear: comparisonPoint?.requiredCash || 0,
    requiredDepositPctAtBuyYear: comparisonPoint?.depositPct || null,
    actualPoints,
    trendPoints: area?.marketHistory?.[config.propertyType]?.trendPoints || [],
    estimatePoint: area?.marketHistory?.[config.propertyType]?.estimatePoint || null,
    purchasingPowerSeries: detailTimeline.map((point) => ({
      year: point.year,
      affordablePrice: point.affordablePrice,
      requiredPrice: priceRequirementSeries.find((candidate) => candidate.year === point.year)?.projectedPrice || 0
    })),
    depositSeries: detailTimeline.map((point) => {
      const required = priceRequirementSeries.find((candidate) => candidate.year === point.year)
      return {
        year: point.year,
        sellOffSavings: point.liquidSavings,
        requiredDeposit: required?.requiredCash || 0
      }
    }),
    priceRequirementSeries,
    monteCarloSeries
  }
}

function resolveSelectedTimingPoint(priceRequirementSeries, config) {
  if (config.buyFlexibility === 'target') {
    const point = priceRequirementSeries.find((entry) => entry.year === config.targetYears)
    if (point?.affordable) {
      return {
        ...point,
        label: yearLabel(config.targetYears)
      }
    }

    const earliestAffordable = priceRequirementSeries.find((entry) => entry.affordable)
    return earliestAffordable
      ? {
          ...earliestAffordable,
          label: `Earliest affordable: ${yearLabel(earliestAffordable.year)}`
        }
      : null
  }

  const earliestAffordable = priceRequirementSeries.find((entry) => entry.affordable)
  return earliestAffordable
    ? {
        ...earliestAffordable,
        label: `Earliest affordable: ${yearLabel(earliestAffordable.year)}`
      }
    : null
}

function buildMonteCarloSeries(startPrice, growthMean, growthVolatility, horizonYears, seed) {
  const random = createMulberry32(seed)
  const samplesByYear = Array.from({ length: horizonYears + 1 }, () => [])
  const iterations = 220

  for (let iteration = 0; iteration < iterations; iteration += 1) {
    let price = Math.max(0, Number(startPrice) || 0)
    samplesByYear[0].push(price)
    for (let year = 1; year <= horizonYears; year += 1) {
      const sampledGrowth = clamp(sampleNormal(random, growthMean, growthVolatility), -0.25, 0.35)
      price = Math.max(0, price * (1 + sampledGrowth))
      samplesByYear[year].push(price)
    }
  }

  return samplesByYear.map((values, year) => {
    const summary = percentileSummary(values)
    return {
      year,
      low: roundToNearestThousand(summary.p10),
      mid: roundToNearestThousand(summary.p50),
      high: roundToNearestThousand(summary.p90)
    }
  })
}

function compareRecommendations(left, right) {
  const leftYear = Number.isFinite(left.selectedYear) ? left.selectedYear : Number.POSITIVE_INFINITY
  const rightYear = Number.isFinite(right.selectedYear) ? right.selectedYear : Number.POSITIVE_INFINITY

  if (right.rankingScore !== left.rankingScore) return right.rankingScore - left.rankingScore
  if (leftYear !== rightYear) return leftYear - rightYear
  if (right.budgetGap !== left.budgetGap) return right.budgetGap - left.budgetGap
  if (right.growthMean !== left.growthMean) return right.growthMean - left.growthMean
  if (right.salesAverage !== left.salesAverage) return right.salesAverage - left.salesAverage
  return left.buyYearPrice - right.buyYearPrice
}

function buildMarketScore(area, propertyType, startPrice, growthMean, growthVolatility, config, seed) {
  const random = createMulberry32(seed ^ 0x9e3779b9)
  const yieldSampler = createPropertyYieldSampler(random, area?.[propertyType])
  const growthOutcomes = []
  const yieldOutcomes = []
  const iterations = 220

  for (let iteration = 0; iteration < iterations; iteration += 1) {
    let price = Math.max(0, Number(startPrice) || 0)
    let yieldTotal = 0
    for (let year = 1; year <= 30; year += 1) {
      const sampledGrowth = clamp(sampleNormal(random, growthMean, growthVolatility), -0.25, 0.35)
      price = Math.max(0, price * (1 + sampledGrowth))
      yieldTotal += yieldSampler()
    }
    growthOutcomes.push(Math.pow(price / Math.max(startPrice, 1), 1 / 30) - 1)
    yieldOutcomes.push(yieldTotal / 30)
  }

  const growthMedianRaw = percentileSummary(growthOutcomes).p50
  const yieldMedianRaw = percentileSummary(yieldOutcomes).p50
  const growthMedian = Number.isFinite(growthMedianRaw) ? growthMedianRaw : (Number(growthMean) || 0)
  const fallbackYield = getFallbackRentYield(area?.[propertyType])
  const yieldMedian = Number.isFinite(yieldMedianRaw) ? yieldMedianRaw : fallbackYield
  const growthOutcomeVolatility = Number.isFinite(calculateStandardDeviation(growthOutcomes))
    ? calculateStandardDeviation(growthOutcomes)
    : Math.max(0, Number(growthVolatility) || 0)
  const yieldOutcomeVolatility = Number.isFinite(calculateStandardDeviation(yieldOutcomes))
    ? calculateStandardDeviation(yieldOutcomes)
    : 0
  const penalty = getRiskPenaltyMultiplier(config.riskAppetite)
  const growthScore = growthMedian - (growthOutcomeVolatility * penalty)
  const yieldScore = yieldMedian - (yieldOutcomeVolatility * penalty)
  const combinedScore = (growthScore * (1 - config.rentalYieldWeight)) + (yieldScore * config.rentalYieldWeight)

  return {
    growthMedian,
    yieldMedian,
    growthVolatility: growthOutcomeVolatility,
    yieldVolatility: yieldOutcomeVolatility,
    growthScore,
    yieldScore,
    combinedScore
  }
}

function createPropertyYieldSampler(random, property) {
  const model = property?.resolvedYieldModel || property?.yieldModel
  if (!model || typeof model !== 'object') {
    const fallbackYield = getFallbackRentYield(property)
    return () => fallbackYield
  }

  let benchmarkYield = clamp(
    Number(model.benchmarkCurrentYield ?? model.benchmarkLongTermMean ?? model.longTermMean ?? model.currentYield) || 0,
    0.01,
    0.12
  )
  let spread = Number(model.currentYield) - benchmarkYield
  if (!Number.isFinite(spread)) {
    spread = Number(model.spreadMean) || 0
  }

  const benchmarkMean = clamp(
    Number(model.benchmarkLongTermMean ?? model.longTermMean ?? benchmarkYield) || benchmarkYield,
    0.01,
    0.12
  )
  const benchmarkTheta = clamp(Number(model.benchmarkMeanReversionSpeed) || 0.2, 0.05, 0.95)
  const benchmarkSigma = clamp(Number(model.benchmarkVolatility) || 0.003, 0.0005, 0.03)
  const spreadMean = clamp(Number(model.spreadMean) || 0, -0.06, 0.06)
  const spreadTheta = clamp(Number(model.spreadMeanReversionSpeed) || Number(model.meanReversionSpeed) || 0.25, 0.05, 0.95)
  const spreadSigma = clamp(Number(model.spreadVolatility) || Number(model.volatility) || 0.003, 0.0005, 0.04)

  return () => {
    benchmarkYield = clamp(
      benchmarkYield + benchmarkTheta * (benchmarkMean - benchmarkYield) + sampleNormal(random, 0, benchmarkSigma),
      0.01,
      0.12
    )
    spread = clamp(
      spread + spreadTheta * (spreadMean - spread) + sampleNormal(random, 0, spreadSigma),
      -0.06,
      0.08
    )
    return clamp(benchmarkYield + spread, 0.01, 0.12)
  }
}

function getFallbackRentYield(property) {
  return clamp(Number(property?.rentYield) || Number(property?.resolvedYieldModel?.currentYield) || Number(property?.yieldModel?.currentYield) || 0.04, 0.01, 0.12)
}

function getRiskPenaltyMultiplier(riskAppetite = 'medium') {
  if (riskAppetite === 'small') return 0.75
  if (riskAppetite === 'large') return 0.2
  return 0.45
}

function calculateStandardDeviation(values = []) {
  if (!Array.isArray(values) || values.length < 2) return 0
  const mean = values.reduce((sum, value) => sum + (Number(value) || 0), 0) / values.length
  const variance = values.reduce((sum, value) => {
    const diff = (Number(value) || 0) - mean
    return sum + (diff * diff)
  }, 0) / values.length
  return Math.sqrt(Math.max(variance, 0))
}

function matchesLocation(area, location, granularity) {
  if (!location) return true
  if (granularity === 'region') return area.key === location.key
  if (area.regionKey && location.key) return area.regionKey === location.key
  return area.regionLabel === location.label
}

function roundToNearestThousand(value) {
  return Math.round((Math.max(0, Number(value) || 0)) / 1000) * 1000
}

function yearLabel(year) {
  return Number(year) === 0 ? 'Now' : `In ${year} years`
}

function seedFromKey(key = '') {
  return String(key).split('').reduce((hash, character) => ((hash * 31) + character.charCodeAt(0)) >>> 0, 7)
}

function createEmptyTimelineEntry() {
  return {
    year: 0,
    annualIncome: 0,
    liquidSavings: 0,
    savingsReturnRate: 0,
    affordablePrice: 0,
    requiredCash: 0,
    depositPct: 0,
    remainingCash: 0
  }
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
