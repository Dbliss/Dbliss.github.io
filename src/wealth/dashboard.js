import { wealthDefaultStockBaselineKey } from '../data/wealthDefaults.js'
import {
  assessPropertyPurchaseServiceability,
  calculatePurchaseCosts,
  clamp,
  estimateLmi,
  getEffectiveInvestmentDepositPct,
  getEffectiveOwnerDepositPct,
  rollForwardHelpDebt,
  scalePurchaseCostsWithPrice
} from './finance.js'
import { normaliseHouseholdEarners, normaliseIncomeProfile } from './incomeSeries.js'

function orderStrategyKeys(result) {
  if (Array.isArray(result?.strategyOrder) && result.strategyOrder.length) return result.strategyOrder
  return Object.keys(result?.strategies || {})
}

function resolveBaselineKey(result, requestedBaselineKey) {
  if (requestedBaselineKey && result?.strategies?.[requestedBaselineKey]) return requestedBaselineKey
  if (result?.strategies?.[wealthDefaultStockBaselineKey]) return wealthDefaultStockBaselineKey
  return orderStrategyKeys(result).find(key => result?.strategies?.[key]?.baselineEligible) || null
}

function getPurchaseYear(strategy) {
  const purchasePoint = strategy.points.find(point => point.homeEquityP50 > 0)
  return purchasePoint ? purchasePoint.year : null
}

function getBreakevenYearVsBaseline(strategy, baseline) {
  if (!baseline || strategy.group !== 'housing') return null
  const hit = strategy.points.find((point) => {
    const baselinePoint = baseline.points.find(candidate => candidate.year === point.year)
    return baselinePoint && point.p50 > baselinePoint.p50
  })
  return hit ? hit.year : null
}

function buildNarrative(strategy, baseline, deltaVsBaseline) {
  if (strategy.group === 'stock') {
    return `${strategy.label} stays liquid and finishes at a median ${strategy.summary.finalMedianDisplay}.`
  }

  if (!baseline) {
    return `${strategy.label} reaches a median after-tax outcome of ${strategy.summary.finalMedianDisplay}.`
  }

  if (deltaVsBaseline > 0) {
    return `${strategy.label} finishes ahead of ${baseline.label} by ${formatCurrency(deltaVsBaseline)} on the median path.`
  }

  if (deltaVsBaseline < 0) {
    return `${strategy.label} finishes behind ${baseline.label} by ${formatCurrency(Math.abs(deltaVsBaseline))} on the median path.`
  }

  return `${strategy.label} finishes level with ${baseline.label} on the median path.`
}

function formatCurrency(value) {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    maximumFractionDigits: 0
  }).format(Number(value) || 0)
}

const affordabilityChartDefinitions = [
  { key: 'buyHouseHome', propertyKey: 'house', occupancyMode: 'owner', title: 'House to live in' },
  { key: 'buyHouseInvestmentProperty', propertyKey: 'house', occupancyMode: 'investment', title: 'House as investment' },
  { key: 'buyApartmentHome', propertyKey: 'apartment', occupancyMode: 'owner', title: 'Apartment to live in' },
  { key: 'buyApartmentInvestmentProperty', propertyKey: 'apartment', occupancyMode: 'investment', title: 'Apartment as investment' }
]

function getPurchaseCostsInput(property, occupancyMode) {
  return occupancyMode === 'owner' ? property.ownerPurchaseCosts : property.investmentPurchaseCosts
}

function buildPurchasePlan(propertyKey, property, propertyValue, occupancyMode, firstHomeBuyerEligible) {
  const configuredDepositPct = occupancyMode === 'owner'
    ? getEffectiveOwnerDepositPct(property)
    : getEffectiveInvestmentDepositPct(property)
  return buildPurchasePlanWithDepositPct(
    propertyKey,
    property,
    propertyValue,
    occupancyMode,
    firstHomeBuyerEligible,
    configuredDepositPct
  )
}

function buildPurchasePlanWithDepositPct(propertyKey, property, propertyValue, occupancyMode, firstHomeBuyerEligible, depositPct) {
  const scaledValue = Math.max(0, Number(propertyValue) || 0)
  const purchaseCostsInput = scalePurchaseCostsWithPrice(
    getPurchaseCostsInput(property, occupancyMode),
    property.purchasePrice,
    scaledValue,
    propertyKey
  )
  const effectiveDepositPct = clamp(Number(depositPct) || 0, 0.05, 0.95)
  const deposit = scaledValue * effectiveDepositPct
  const lmi = estimateLmi(scaledValue, effectiveDepositPct, firstHomeBuyerEligible)
  const purchaseCosts = calculatePurchaseCosts(purchaseCostsInput, firstHomeBuyerEligible, scaledValue)
  const borrowingExpensesUpfront = occupancyMode === 'investment'
    ? Math.max(0, Number(property.borrowingExpensesTotal) || 0)
    : 0

  return {
    deposit,
    requiredCash: deposit + purchaseCosts.total + borrowingExpensesUpfront,
    openingLoanBalance: Math.max(0, scaledValue - deposit + lmi)
  }
}

function assessPurchaseServiceabilityAtDepositPct({
  request,
  propertyKey,
  propertyValue,
  occupancyMode,
  personalHousingCostAnnual,
  helpDebtBalances,
  annualIncome,
  annualIncomeByBorrower,
  depositPct
}) {
  const propertyConfig = request.propertyConfig[propertyKey]
  const firstHomeBuyerEligible = occupancyMode === 'owner' && Boolean(request.propertyConfig.firstHomeBuyerEligible)
  const plan = buildPurchasePlanWithDepositPct(
    propertyKey,
    propertyConfig,
    propertyValue,
    occupancyMode,
    firstHomeBuyerEligible,
    depositPct
  )

  const serviceability = assessPropertyPurchaseServiceability({
    taxYear: request.profile.taxYear,
    annualIncome,
    annualIncomeByBorrower,
    helpDebtBalances,
    weeklyNonHousingLivingCosts: request.profile.weeklyNonHousingLivingCosts,
    occupancyMode,
    propertyConfig,
    propertyValue,
    mortgageYears: propertyConfig.mortgageYears,
    openingLoanBalance: plan.openingLoanBalance,
    personalHousingCostAnnual,
    vacancyRate: request.propertyConfig.vacancyRate
  })

  return {
    plan,
    serviceability
  }
}

function solveOptimalDepositPlan({
  request,
  propertyKey,
  propertyValue,
  occupancyMode,
  personalHousingCostAnnual,
  helpDebtBalances,
  annualIncome,
  annualIncomeByBorrower
}) {
  const firstHomeBuyerEligible = occupancyMode === 'owner' && Boolean(request.propertyConfig.firstHomeBuyerEligible)
  const property = request.propertyConfig[propertyKey]
  const configuredDepositPct = occupancyMode === 'owner'
    ? getEffectiveOwnerDepositPct(property)
    : getEffectiveInvestmentDepositPct(property)

  const configured = assessPurchaseServiceabilityAtDepositPct({
    request,
    propertyKey,
    propertyValue,
    occupancyMode,
    personalHousingCostAnnual,
    helpDebtBalances,
    annualIncome,
    annualIncomeByBorrower,
    depositPct: configuredDepositPct
  })

  if (configured.serviceability.affordable) {
    return {
      depositPct: configuredDepositPct,
      requiredCash: configured.plan.requiredCash,
      affordable: true
    }
  }

  let low = 0.05
  let high = 0.95
  let highAssessment = assessPurchaseServiceabilityAtDepositPct({
    request,
    propertyKey,
    propertyValue,
    occupancyMode,
    personalHousingCostAnnual,
    helpDebtBalances,
    annualIncome,
    annualIncomeByBorrower,
    depositPct: high
  })

  if (!highAssessment.serviceability.affordable) {
    return {
      depositPct: high,
      requiredCash: highAssessment.plan.requiredCash,
      affordable: false
    }
  }

  for (let step = 0; step < 28; step += 1) {
    const midpoint = (low + high) / 2
    const assessment = assessPurchaseServiceabilityAtDepositPct({
      request,
      propertyKey,
      propertyValue,
      occupancyMode,
      personalHousingCostAnnual,
      helpDebtBalances,
      annualIncome,
      annualIncomeByBorrower,
      depositPct: midpoint
    })

    if (assessment.serviceability.affordable) {
      high = midpoint
      highAssessment = assessment
    } else {
      low = midpoint
    }
  }

  return {
    depositPct: high,
    requiredCash: highAssessment.plan.requiredCash,
    affordable: true
  }
}

function solveRequiredHouseholdIncome({
  request,
  property,
  propertyValue,
  occupancyMode,
  personalHousingCostAnnual,
  helpDebtBalances,
  incomeShares
}) {
  const propertyConfig = request.propertyConfig[property]
  const plan = buildPurchasePlan(
    property,
    propertyConfig,
    propertyValue,
    occupancyMode,
    occupancyMode === 'owner' && Boolean(request.propertyConfig.firstHomeBuyerEligible)
  )

  let low = 0
  let high = Math.max(100000, propertyValue * 0.5)
  let affordable = false

  for (let step = 0; step < 24; step += 1) {
    const borrowerIncomes = incomeShares.map((share) => high * share)
    const serviceability = assessPropertyPurchaseServiceability({
      taxYear: request.profile.taxYear,
      annualIncome: high,
      annualIncomeByBorrower: borrowerIncomes,
      helpDebtBalances,
      weeklyNonHousingLivingCosts: request.profile.weeklyNonHousingLivingCosts,
      occupancyMode,
      propertyConfig,
      propertyValue,
      mortgageYears: propertyConfig.mortgageYears,
      openingLoanBalance: plan.openingLoanBalance,
      personalHousingCostAnnual,
      vacancyRate: request.propertyConfig.vacancyRate
    })

    if (serviceability.affordable) {
      affordable = true
      break
    }
    high *= 1.35
  }

  if (!affordable) return null

  for (let step = 0; step < 28; step += 1) {
    const midpoint = (low + high) / 2
    const borrowerIncomes = incomeShares.map((share) => midpoint * share)
    const serviceability = assessPropertyPurchaseServiceability({
      taxYear: request.profile.taxYear,
      annualIncome: midpoint,
      annualIncomeByBorrower: borrowerIncomes,
      helpDebtBalances,
      weeklyNonHousingLivingCosts: request.profile.weeklyNonHousingLivingCosts,
      occupancyMode,
      propertyConfig,
      propertyValue,
      mortgageYears: propertyConfig.mortgageYears,
      openingLoanBalance: plan.openingLoanBalance,
      personalHousingCostAnnual,
      vacancyRate: request.propertyConfig.vacancyRate
    })

    if (serviceability.affordable) {
      high = midpoint
    } else {
      low = midpoint
    }
  }

  return Math.round(high / 1000) * 1000
}

function buildAffordabilityHurdleCharts(result) {
  const request = result?.request
  if (!request?.profile || !result?.strategies) return []

  const householdProfile = normaliseIncomeProfile(request.profile)
  const baseEarners = normaliseHouseholdEarners(request.profile)
  const totalBaseIncome = Math.max(1, baseEarners.reduce((sum, earner) => sum + earner.annualIncome, 0))
  const incomeShares = baseEarners.map((earner) => Math.max(0, earner.annualIncome) / totalBaseIncome)
  const horizonYears = householdProfile.horizonYears

  return affordabilityChartDefinitions.map((definition) => {
    const strategy = result.strategies[definition.key]
    const property = request.propertyConfig[definition.propertyKey]
    const strategyPoints = strategy?.points || []
    let propertyValue = property.purchasePrice
    let rentLevel = request.housingCosts.weeklyRent * 52
    let boardLevel = request.housingCosts.weeklyBoardAtHome * 52
    let helpDebtBalances = baseEarners.map((earner) => earner.helpDebtBalance)

    const points = Array.from({ length: horizonYears }, (_, yearIndex) => {
      if (yearIndex > 0) {
        propertyValue *= 1 + property.growthMean
        rentLevel *= 1 + request.housingCosts.rentGrowthRate
        boardLevel *= 1 + request.housingCosts.boardGrowthRate
      }

      const liveAtHomeThisYear = request.housingCosts.liveAtHome && yearIndex < request.housingCosts.liveAtHomeYears
      const personalHousingCostAnnual = definition.occupancyMode === 'investment'
        ? (liveAtHomeThisYear ? boardLevel : rentLevel)
        : 0

      const userIncome = householdProfile.annualIncomeSeries[yearIndex] || 0
      const borrowerIncomes = baseEarners.map((earner) => earner.annualIncomeSeries[yearIndex] || 0)
      const plan = buildPurchasePlan(
        definition.propertyKey,
        property,
        propertyValue,
        definition.occupancyMode,
        definition.occupancyMode === 'owner' && Boolean(request.propertyConfig.firstHomeBuyerEligible)
      )
      const hurdlePoint = strategyPoints.find((point) => point.year === yearIndex)
      const userSavings = hurdlePoint
        ? Math.max(0, hurdlePoint.p50)
        : null
      const optimalDeposit = solveOptimalDepositPlan({
        request,
        propertyKey: definition.propertyKey,
        propertyValue,
        occupancyMode: definition.occupancyMode,
        personalHousingCostAnnual,
        helpDebtBalances,
        annualIncome: userIncome,
        annualIncomeByBorrower: borrowerIncomes
      })
      const requiredIncome = solveRequiredHouseholdIncome({
        request,
        property: definition.propertyKey,
        propertyValue,
        occupancyMode: definition.occupancyMode,
        personalHousingCostAnnual,
        helpDebtBalances,
        incomeShares
      })

      helpDebtBalances = helpDebtBalances.map((balance, index) =>
        rollForwardHelpDebt(balance, borrowerIncomes[index] || 0).closingBalance
      )

      return {
        year: yearIndex,
        propertyValue: Math.round(propertyValue),
        userIncome: Math.round(userIncome),
        requiredIncome,
        userSavings: userSavings === null ? null : Math.round(userSavings),
        requiredCash: Math.round(plan.requiredCash),
        optimalRequiredCash: Math.round(optimalDeposit.requiredCash),
        optimalDepositPct: Number((optimalDeposit.depositPct * 100).toFixed(1)),
        optimalDepositAffordable: optimalDeposit.affordable
      }
    })

    const purchaseYear = points.find((point) =>
      Number.isFinite(point.userSavings) &&
      Number.isFinite(point.optimalRequiredCash) &&
      point.userSavings >= point.optimalRequiredCash &&
      point.optimalDepositAffordable
    )?.year ?? null

    return {
      ...definition,
      purchaseYear,
      points
    }
  })
}

export function buildDashboardModel(result, requestedBaselineKey, inflationRate = 0.03) {
  const baselineKey = resolveBaselineKey(result, requestedBaselineKey)
  const baseline = baselineKey ? result?.strategies?.[baselineKey] || null : null
  const strategies = orderStrategyKeys(result)
    .map((key) => {
      const strategy = result.strategies[key]
      const purchaseYear = getPurchaseYear(strategy)
      const breakevenYearVsBaseline = getBreakevenYearVsBaseline(strategy, baseline)
      const finalPoint = strategy.points[strategy.points.length - 1]
      const deltaVsBaseline = baseline ? strategy.summary.finalMedianNetWorth - baseline.summary.finalMedianNetWorth : 0
      const variabilitySpread = finalPoint ? finalPoint.p90 - finalPoint.p10 : 0

      return {
        ...strategy,
        purchaseYear,
        breakevenYearVsBaseline,
        deltaVsBaseline,
        variabilitySpread,
        narrative: buildNarrative(strategy, baseline, deltaVsBaseline),
        baselineLabel: baseline?.label || null,
        inflationRate
      }
    })
    .sort((left, right) => right.summary.finalMedianNetWorth - left.summary.finalMedianNetWorth)

  const housingStrategies = strategies.filter(strategy => strategy.group === 'housing')

  return {
    baselineKey,
    baseline,
    strategies,
    kpis: {
      bestMedian: strategies.reduce((best, strategy) =>
        !best || strategy.summary.finalMedianNetWorth > best.summary.finalMedianNetWorth ? strategy : best
      , null),
      downsideLeader: strategies.reduce((best, strategy) =>
        !best || strategy.summary.downsideRisk > best.summary.downsideRisk ? strategy : best
      , null),
      variabilityLeader: strategies.reduce((best, strategy) =>
        !best || strategy.variabilitySpread > best.variabilitySpread ? strategy : best
      , null),
      firstHousingBeatBaseline: housingStrategies
        .filter(strategy => strategy.breakevenYearVsBaseline !== null)
        .sort((left, right) => left.breakevenYearVsBaseline - right.breakevenYearVsBaseline)[0] || null
    },
    narratives: strategies.slice(0, 3).map(strategy => strategy.narrative),
    affordabilityCharts: buildAffordabilityHurdleCharts(result),
    compositionRows: housingStrategies.map(strategy => ({
      key: strategy.key,
      label: strategy.shortLabel,
      liquid: Math.max(0, strategy.summary.finalMedianLiquidAssets),
      equity: Math.max(0, strategy.summary.finalMedianHomeEquity),
      debt: Math.max(0, strategy.summary.finalMedianDebt),
      total: strategy.summary.finalMedianHoldNetWorth
    }))
  }
}

function discountToToday(value, year, inflationRate) {
  const safeRate = Math.max(0, Number(inflationRate) || 0)
  return Math.round((Number(value) || 0) / Math.pow(1 + safeRate, year))
}

export function buildDashboardSeries(strategies, metric, inflationRate = 0.03) {
  return strategies.map((strategy) => ({
    id: strategy.key,
    label: strategy.label,
    color: strategy.color,
    accent: strategy.accent,
    points: strategy.points.map((point) => {
      if (metric === 'annualSurplus') {
        return {
          year: point.year,
          low: point.annualSurplusP10,
          mid: point.annualSurplusP50,
          high: point.annualSurplusP90
        }
      }

      if (metric === 'holdBalance') {
        return {
          year: point.year,
          low: point.holdNetWorthP10,
          mid: point.holdNetWorthP50,
          high: point.holdNetWorthP90
        }
      }

      if (metric === 'inflationAdjusted') {
        return {
          year: point.year,
          low: discountToToday(point.p10, point.year, inflationRate),
          mid: discountToToday(point.p50, point.year, inflationRate),
          high: discountToToday(point.p90, point.year, inflationRate)
        }
      }

      return {
        year: point.year,
        low: point.p10,
        mid: point.p50,
        high: point.p90
      }
    })
  }))
}
