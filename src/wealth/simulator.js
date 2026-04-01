import {
  FIRST_HOME_BUYER_LOW_DEPOSIT_LIMIT,
  assessPropertyPurchaseServiceability,
  calculateAnnualMortgagePayment,
  amortizeOneYear,
  calculateAustralianAnnualTax,
  rollForwardHelpDebt,
  calculateInvestmentPropertyTaxPosition,
  calculatePurchaseCosts,
  clamp,
  createMulberry32,
  createPriceAdjustedPropertyConfig,
  estimateCapitalGainsTax,
  estimateLmi,
  estimatePortfolioTaxableIncome,
  formatShortCurrency,
  buildPortfolioYearFromSleeves,
  getEffectiveInvestmentDepositPct,
  getEffectiveOwnerDepositPct,
  getOwnerHoldingCosts,
  getPropertyInterestRate,
  getPropertyLongRunInterestRate,
  isDepositScalingEnabled,
  interpolateRate,
  normalisePortfolioWeights,
  percentileSummary,
  roundCurrency,
  samplePortfolioSleeveReturns,
  scalePropertyCostWithPrice,
  scalePurchaseCostsWithPrice,
  sampleNormal
} from './finance.js'
import { createBootstrapPortfolioSampler } from './assetBootstrap.js'
import {
  getWealthStrategyMeta,
  resolveScenarioSelection,
  wealthStrategyOrder,
  wealthVacancyRate,
  wealthVacancyRateVolatility
} from '../data/wealthDefaults.js'
import { getIncomeForYear, getIncomeScaleForYear, normaliseHouseholdEarners, normaliseIncomeProfile } from './incomeSeries.js'

function createStrategyBuckets(horizonYears) {
  return Array.from({ length: horizonYears + 1 }, () => ({
    netWorth: [],
    liquidationNetWorth: [],
    liquidAssets: [],
    homeEquity: [],
    debtRemaining: [],
    annualSurplus: [],
    totalTax: [],
    taxDelta: [],
    cashDeficit: [],
    estimatedSaleTax: []
  }))
}

function sampleMarketPath(request, random) {
  const { profile, propertyConfig, housingCosts } = request
  const vacancyRate = clamp(Number(propertyConfig.vacancyRate) || wealthVacancyRate, 0, 0.12)
  const propertyGrowthBlockSampler = createPropertyGrowthBlockSampler(random, propertyConfig)
  return Array.from({ length: profile.horizonYears }, (_, yearIndex) => {
    const sampledPropertyGrowthBlock = propertyGrowthBlockSampler ? propertyGrowthBlockSampler() : null

    return {
      yearIndex,
      income: getAnnualSalary(profile, yearIndex),
      nonHousingLivingCosts: getAnnualNonHousingLivingCosts(profile, yearIndex),
      sleeveReturns: samplePortfolioSleeveReturns(
        random,
        createBootstrapPortfolioSampler(random, request.portfolioConfig)
      ),
      houseGrowth: samplePropertyGrowthRate(random, propertyConfig.house, -0.25, 0.25, sampledPropertyGrowthBlock?.houseGrowth),
      apartmentGrowth: samplePropertyGrowthRate(random, propertyConfig.apartment, -0.18, 0.18, sampledPropertyGrowthBlock?.apartmentGrowth),
      mortgageRateJitter: sampleNormal(random, 0, 0.0045),
      vacancyRate: clamp(sampleNormal(random, vacancyRate, wealthVacancyRateVolatility), 0, 0.12),
      rentInflation: clamp(sampleNormal(random, housingCosts.rentGrowthRate, 0.01), 0, 0.08),
      boardInflation: clamp(sampleNormal(random, housingCosts.boardGrowthRate, 0.008), 0, 0.06)
    }
  })
}

function createPropertyGrowthBlockSampler(random, propertyConfig) {
  const historicalBlocks = Array.isArray(propertyConfig?.historicalAnnualGrowthBlocks)
    ? propertyConfig.historicalAnnualGrowthBlocks
        .map((block) => ({
          year: Math.round(Number(block?.year) || 0),
          houseGrowth: Number.isFinite(Number(block?.houseGrowth)) ? Number(block.houseGrowth) : null,
          apartmentGrowth: Number.isFinite(Number(block?.apartmentGrowth)) ? Number(block.apartmentGrowth) : null
        }))
        .filter((block) =>
          Number.isFinite(block.year) &&
          (Number.isFinite(block.houseGrowth) || Number.isFinite(block.apartmentGrowth))
        )
    : []

  if (!historicalBlocks.length) return null

  return () => {
    const block = historicalBlocks[Math.floor(random() * historicalBlocks.length)]
    return {
      houseGrowth: Number.isFinite(block.houseGrowth) ? clamp(block.houseGrowth, -0.25, 0.25) : null,
      apartmentGrowth: Number.isFinite(block.apartmentGrowth) ? clamp(block.apartmentGrowth, -0.18, 0.18) : null
    }
  }
}

function samplePropertyGrowthRate(random, property, lowerBound, upperBound, sampledBlockValue = null) {
  if (Number.isFinite(sampledBlockValue)) {
    return clamp(Number(sampledBlockValue), lowerBound, upperBound)
  }

  const historicalSeries = Array.isArray(property?.historicalAnnualGrowthRates)
    ? property.historicalAnnualGrowthRates.filter(value => Number.isFinite(Number(value))).map(value => Number(value))
    : []

  if (historicalSeries.length) {
    const sampled = historicalSeries[Math.floor(random() * historicalSeries.length)]
    return clamp(sampled, lowerBound, upperBound)
  }

  return clamp(sampleNormal(random, property.growthMean, property.growthVolatility), lowerBound, upperBound)
}

function yearPoint(year, metrics) {
  const holdNetWorth = percentileSummary(metrics.netWorth)
  const liquidationNetWorth = percentileSummary(metrics.liquidationNetWorth)
  const liquidAssets = percentileSummary(metrics.liquidAssets)
  const homeEquity = percentileSummary(metrics.homeEquity)
  const debtRemaining = percentileSummary(metrics.debtRemaining)
  const annualSurplus = percentileSummary(metrics.annualSurplus)
  const totalTax = percentileSummary(metrics.totalTax)
  const taxDelta = percentileSummary(metrics.taxDelta)
  const cashDeficit = percentileSummary(metrics.cashDeficit)
  const estimatedSaleTax = percentileSummary(metrics.estimatedSaleTax)
  return {
    year,
    p10: roundCurrency(liquidationNetWorth.p10),
    p50: roundCurrency(liquidationNetWorth.p50),
    p90: roundCurrency(liquidationNetWorth.p90),
    holdNetWorthP10: roundCurrency(holdNetWorth.p10),
    holdNetWorthP50: roundCurrency(holdNetWorth.p50),
    holdNetWorthP90: roundCurrency(holdNetWorth.p90),
    liquidAssetsP10: roundCurrency(liquidAssets.p10),
    liquidAssetsP50: roundCurrency(liquidAssets.p50),
    liquidAssetsP90: roundCurrency(liquidAssets.p90),
    homeEquityP10: roundCurrency(homeEquity.p10),
    homeEquityP50: roundCurrency(homeEquity.p50),
    homeEquityP90: roundCurrency(homeEquity.p90),
    debtRemainingP10: roundCurrency(debtRemaining.p10),
    debtRemainingP50: roundCurrency(debtRemaining.p50),
    debtRemainingP90: roundCurrency(debtRemaining.p90),
    annualSurplusP10: roundCurrency(annualSurplus.p10),
    annualSurplusP50: roundCurrency(annualSurplus.p50),
    annualSurplusP90: roundCurrency(annualSurplus.p90),
    totalTaxP10: roundCurrency(totalTax.p10),
    totalTaxP50: roundCurrency(totalTax.p50),
    totalTaxP90: roundCurrency(totalTax.p90),
    taxDeltaP10: roundCurrency(taxDelta.p10),
    taxDeltaP50: roundCurrency(taxDelta.p50),
    taxDeltaP90: roundCurrency(taxDelta.p90),
    cashDeficitP10: roundCurrency(cashDeficit.p10),
    cashDeficitP50: roundCurrency(cashDeficit.p50),
    cashDeficitP90: roundCurrency(cashDeficit.p90),
    estimatedSaleTaxP10: roundCurrency(estimatedSaleTax.p10),
    estimatedSaleTaxP50: roundCurrency(estimatedSaleTax.p50),
    estimatedSaleTaxP90: roundCurrency(estimatedSaleTax.p90)
  }
}

function aggregateStrategy(strategyKey, buckets, strategyMeta) {
  const points = buckets.map((metrics, index) => yearPoint(index, metrics))
  const finalPoint = points[points.length - 1]
  const finalMetrics = buckets[buckets.length - 1] || null
  const worstCashDeficitPoint = points.reduce((worst, point) =>
    !worst || point.cashDeficitP50 > worst.cashDeficitP50 ? point : worst
  , null)
  const firstMedianDeficitPoint = points.find(point => point.cashDeficitP50 > 0) || null
  return {
    ...strategyMeta[strategyKey],
    key: strategyKey,
    points,
    summary: {
      finalMedianNetWorth: finalPoint.p50,
      downsideRisk: finalPoint.p10,
      finalMedianHoldNetWorth: finalPoint.holdNetWorthP50,
      finalMedianLiquidAssets: finalPoint.liquidAssetsP50,
      finalMedianHomeEquity: finalPoint.homeEquityP50,
      finalMedianDebt: finalPoint.debtRemainingP50,
      finalMedianAnnualSurplus: finalPoint.annualSurplusP50,
      finalMedianTotalTax: finalPoint.totalTaxP50,
      finalMedianTaxDelta: finalPoint.taxDeltaP50,
      finalMedianEstimatedSaleTax: finalPoint.estimatedSaleTaxP50,
      finalMedianCashDeficit: finalPoint.cashDeficitP50,
      maxMedianCashDeficit: worstCashDeficitPoint ? worstCashDeficitPoint.cashDeficitP50 : 0,
      firstMedianDeficitYear: firstMedianDeficitPoint ? firstMedianDeficitPoint.year : null,
      finalMedianDisplay: formatShortCurrency(finalPoint.p50),
      finalLiquidationSamples: Array.isArray(finalMetrics?.liquidationNetWorth)
        ? [...finalMetrics.liquidationNetWorth]
        : []
    }
  }
}

function addMetrics(bucket, snapshot) {
  bucket.netWorth.push(snapshot.netWorth)
  bucket.liquidationNetWorth.push(snapshot.liquidationNetWorth)
  bucket.liquidAssets.push(snapshot.liquidAssets)
  bucket.homeEquity.push(snapshot.homeEquity)
  bucket.debtRemaining.push(snapshot.debtRemaining)
  bucket.annualSurplus.push(snapshot.annualSurplus)
  bucket.totalTax.push(snapshot.totalTax)
  bucket.taxDelta.push(snapshot.taxDelta)
  bucket.cashDeficit.push(snapshot.cashDeficit)
  bucket.estimatedSaleTax.push(snapshot.estimatedSaleTax)
}

function isLiveAtHomeYear(request, yearIndex) {
  return request.housingCosts.liveAtHome && yearIndex < request.housingCosts.liveAtHomeYears
}

function getPropertyGrowth(market, propertyKey) {
  return propertyKey === 'apartment' ? market.apartmentGrowth : market.houseGrowth
}

function shouldApplyFirstHomeBuyerSupport(request, occupancyMode) {
  return occupancyMode === 'owner' && Boolean(request.propertyConfig.firstHomeBuyerEligible)
}

function getAnnualSalary(profile, yearIndex) {
  return getIncomeForYear(profile, yearIndex)
}

function getEarnersForYear(profile, yearIndex, helpDebtBalances = []) {
  const earners = normaliseHouseholdEarners(profile)
  return earners.map((earner, index) => ({
    ...earner,
    annualIncome: Number(earner.annualIncomeSeries?.[yearIndex]) || 0,
    helpDebtBalance: Math.max(0, Number(helpDebtBalances[index] ?? earner.helpDebtBalance) || 0)
  }))
}

function allocateSupplementaryIncome(earners, amount) {
  const safeAmount = Number(amount) || 0
  if (!earners.length || safeAmount === 0) return earners.map(() => 0)

  const totalSalary = earners.reduce((sum, earner) => sum + Math.max(0, Number(earner.annualIncome) || 0), 0)
  const baseWeights = totalSalary > 0
    ? earners.map((earner) => (Math.max(0, Number(earner.annualIncome) || 0) / totalSalary))
    : earners.map(() => 1 / earners.length)

  return baseWeights.map((weight, index) => {
    if (index === baseWeights.length - 1) {
      const allocatedSoFar = baseWeights
        .slice(0, -1)
        .reduce((sum, partialWeight) => sum + safeAmount * partialWeight, 0)
      return safeAmount - allocatedSoFar
    }
    return safeAmount * weight
  })
}

function calculateHouseholdTaxPosition({
  taxYear,
  earners,
  taxablePortfolioIncome = 0,
  taxableRentalIncome = 0,
  frankingCredits = 0
}) {
  const portfolioAllocations = allocateSupplementaryIncome(earners, taxablePortfolioIncome)
  const rentalAllocations = allocateSupplementaryIncome(earners, taxableRentalIncome)
  const frankingAllocations = allocateSupplementaryIncome(earners, frankingCredits)

  const breakdown = earners.map((earner, index) => calculateAustralianAnnualTax({
    taxYear,
    salaryIncome: earner.annualIncome,
    taxablePortfolioIncome: portfolioAllocations[index],
    taxableRentalIncome: rentalAllocations[index],
    frankingCredits: Math.max(0, frankingAllocations[index])
  }))

  return {
    totalTax: breakdown.reduce((sum, item) => sum + item.totalTax, 0),
    deltaVsSalaryOnly: breakdown.reduce((sum, item) => sum + item.deltaVsSalaryOnly, 0),
    breakdown
  }
}

function getAnnualNonHousingLivingCosts(profile, yearIndex) {
  return profile.weeklyNonHousingLivingCosts * 52 * getIncomeScaleForYear(profile, yearIndex)
}

function getInvestedBalance(liquidAssets) {
  return Math.max(0, Number(liquidAssets) || 0)
}

function updatePortfolioCostBasis(currentCostBasis, preFlowInvestedBalance, endingLiquidAssets) {
  const safeBasis = Math.max(0, Number(currentCostBasis) || 0)
  const safePreFlowBalance = Math.max(0, Number(preFlowInvestedBalance) || 0)
  const endingInvestedBalance = getInvestedBalance(endingLiquidAssets)

  if (endingInvestedBalance <= 0) return 0
  if (endingInvestedBalance >= safePreFlowBalance) {
    return safeBasis + (endingInvestedBalance - safePreFlowBalance)
  }
  if (safePreFlowBalance <= 0 || safeBasis <= 0) return 0

  const withdrawal = safePreFlowBalance - endingInvestedBalance
  return Math.max(0, safeBasis - safeBasis * (withdrawal / safePreFlowBalance))
}

function getPropertyCostBaseAtPurchase(propertyValue, purchaseCosts) {
  return (
    Math.max(0, Number(propertyValue) || 0) +
    Math.max(0, Number(purchaseCosts?.stampDuty) || 0) +
    Math.max(0, Number(purchaseCosts?.legalFees) || 0) +
    Math.max(0, Number(purchaseCosts?.buyersCosts) || 0)
  )
}

function getDiscountPct(yearsHeld) {
  return yearsHeld > 1 ? 0.5 : 0
}

function estimateLiquidationPosition({
  taxYear,
  salaryIncome,
  liquidAssets,
  portfolioCostBasis = 0,
  portfolioYearsHeld = 0,
  propertyValue = 0,
  mortgageBalance = 0,
  propertyCostBase = 0,
  propertyYearsOwned = 0,
  propertyMainResidenceExempt = false
}) {
  const portfolioMarketValue = getInvestedBalance(liquidAssets)
  const propertyMarketValue = Math.max(0, Number(propertyValue) || 0)
  const debt = Math.max(0, Number(mortgageBalance) || 0)
  const portfolioRawGain = portfolioMarketValue - Math.max(0, Number(portfolioCostBasis) || 0)
  const propertyRawGain = propertyMainResidenceExempt ? 0 : propertyMarketValue - Math.max(0, Number(propertyCostBase) || 0)
  const capitalLoss = Math.abs(Math.min(0, portfolioRawGain)) + Math.abs(Math.min(0, propertyRawGain))
  const positiveGainBuckets = [
    {
      grossGain: Math.max(0, portfolioRawGain),
      discountPct: getDiscountPct(portfolioYearsHeld)
    },
    {
      grossGain: Math.max(0, propertyRawGain),
      discountPct: propertyMainResidenceExempt ? 1 : getDiscountPct(propertyYearsOwned)
    }
  ]
    .filter(bucket => bucket.grossGain > 0)
    .sort((left, right) => left.discountPct - right.discountPct)

  let remainingLoss = capitalLoss
  let taxableCapitalGain = 0
  let grossCapitalGain = 0

  positiveGainBuckets.forEach((bucket) => {
    const offset = Math.min(remainingLoss, bucket.grossGain)
    const remainingGrossGain = bucket.grossGain - offset
    remainingLoss -= offset
    grossCapitalGain += remainingGrossGain
    taxableCapitalGain += remainingGrossGain * (1 - bucket.discountPct)
  })

  const saleTaxEstimate = estimateCapitalGainsTax({
    taxYear,
    salaryIncome,
    grossCapitalGain,
    taxableCapitalGain
  })

  return {
    liquidationNetWorth: liquidAssets + propertyMarketValue - debt - saleTaxEstimate.capitalGainsTax,
    estimatedSaleTax: saleTaxEstimate.capitalGainsTax,
    grossCapitalGain,
    taxableCapitalGain: saleTaxEstimate.taxableCapitalGain
  }
}

function createSnapshot({
  liquidAssets,
  propertyValue = 0,
  mortgageBalance = 0,
  annualSurplus = 0,
  totalTax = 0,
  taxDelta = 0,
  liquidationNetWorth = 0,
  estimatedSaleTax = 0
}) {
  const homeEquity = propertyValue - mortgageBalance
  return {
    netWorth: liquidAssets + homeEquity,
    liquidationNetWorth,
    liquidAssets,
    homeEquity,
    debtRemaining: mortgageBalance,
    annualSurplus,
    totalTax,
    taxDelta,
    cashDeficit: Math.max(0, -liquidAssets),
    estimatedSaleTax
  }
}

function getPurchaseCostsInput(property, occupancyMode) {
  return occupancyMode === 'owner' ? property.ownerPurchaseCosts : property.investmentPurchaseCosts
}

function getMinimumDepositPct(property, occupancyMode) {
  return occupancyMode === 'owner'
    ? getEffectiveOwnerDepositPct(property)
    : getEffectiveInvestmentDepositPct(property)
}

function getPurchasePlanAtDepositPct(propertyKey, property, propertyValue, occupancyMode, firstHomeBuyerEligible, depositPct) {
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
  const scaledBorrowingExpensesTotal = scalePropertyCostWithPrice(
    property.borrowingExpensesTotal,
    property.purchasePrice,
    scaledValue,
    propertyKey,
    'borrowingExpensesTotal'
  )
  const borrowingExpensesUpfront = occupancyMode === 'investment'
    ? scaledBorrowingExpensesTotal
    : 0
  const deductibleBorrowingExpensesTotal = occupancyMode === 'investment'
    ? scaledBorrowingExpensesTotal + lmi
    : 0

  return {
    deposit,
    effectiveDepositPct,
    lmi,
    purchaseCosts,
    borrowingExpensesUpfront,
    deductibleBorrowingExpensesTotal,
    upfrontCash: deposit + purchaseCosts.total + borrowingExpensesUpfront,
    openingMortgageBalance: Math.max(0, scaledValue - deposit + lmi)
  }
}

function getPurchasePlan(propertyKey, property, propertyValue, occupancyMode, firstHomeBuyerEligible) {
  return getPurchasePlanAtDepositPct(
    propertyKey,
    property,
    propertyValue,
    occupancyMode,
    firstHomeBuyerEligible,
    getMinimumDepositPct(property, occupancyMode)
  )
}

function getPurchaseServiceability(request, market, occupancyMode, propertyKey, property, propertyValue, purchasePlan, atHomeHousingCosts, helpDebtBalance) {
  const annualIncomeByBorrower = getEarnersForYear(request.profile, market.yearIndex, helpDebtBalance)
    .map((earner) => earner.annualIncome)
  return assessPropertyPurchaseServiceability({
    taxYear: request.profile.taxYear,
    annualIncome: market.income,
    helpDebtBalance,
    annualIncomeByBorrower,
    helpDebtBalances: helpDebtBalance,
    weeklyNonHousingLivingCosts: request.profile.weeklyNonHousingLivingCosts,
    occupancyMode,
    propertyType: propertyKey,
    propertyConfig: property,
    propertyValue,
    mortgageYears: property.mortgageYears,
    openingLoanBalance: purchasePlan.openingMortgageBalance,
    personalHousingCostAnnual: occupancyMode === 'investment' ? atHomeHousingCosts : 0,
    vacancyRate: clamp(Number(request.propertyConfig.vacancyRate) || wealthVacancyRate, 0, 0.12),
    borrowingExpensesTotalOverride: purchasePlan.deductibleBorrowingExpensesTotal
  })
}

function solvePurchasePlanForAvailableCash({
  request,
  market,
  propertyKey,
  property,
  propertyValue,
  occupancyMode,
  firstHomeBuyerEligible,
  atHomeHousingCosts,
  helpDebtBalance,
  availableCash
}) {
  const minimumDepositPct = getMinimumDepositPct(property, occupancyMode)
  const allowDepositScaling = isDepositScalingEnabled(property, occupancyMode)
  const minimumPlan = getPurchasePlanAtDepositPct(
    propertyKey,
    property,
    propertyValue,
    occupancyMode,
    firstHomeBuyerEligible,
    minimumDepositPct
  )

  if (!minimumPlan || availableCash < minimumPlan.upfrontCash) return null

  const minimumServiceability = getPurchaseServiceability(
    request,
    market,
    occupancyMode,
    propertyKey,
    property,
    propertyValue,
    minimumPlan,
    atHomeHousingCosts,
    helpDebtBalance
  )

  if (minimumServiceability.affordable) {
    return {
      purchasePlan: minimumPlan,
      serviceability: minimumServiceability
    }
  }

  if (!allowDepositScaling) return null

  let low = minimumDepositPct
  let high = 0.95
  let feasiblePlan = null
  let feasibleServiceability = null

  const highestPlan = getPurchasePlanAtDepositPct(
    propertyKey,
    property,
    propertyValue,
    occupancyMode,
    firstHomeBuyerEligible,
    high
  )

  if (!highestPlan || availableCash < highestPlan.upfrontCash) {
    while (high - low > 0.0005) {
      const midpoint = (low + high) / 2
      const midpointPlan = getPurchasePlanAtDepositPct(
        propertyKey,
        property,
        propertyValue,
        occupancyMode,
        firstHomeBuyerEligible,
        midpoint
      )
      if (midpointPlan && midpointPlan.upfrontCash <= availableCash) {
        low = midpoint
        feasiblePlan = midpointPlan
      } else {
        high = midpoint
      }
    }
  } else {
    feasiblePlan = highestPlan
  }

  if (!feasiblePlan) return null

  const feasibleCheck = getPurchaseServiceability(
    request,
    market,
    occupancyMode,
    propertyKey,
    property,
    propertyValue,
    feasiblePlan,
    atHomeHousingCosts,
    helpDebtBalance
  )

  if (!feasibleCheck.affordable) return null
  feasibleServiceability = feasibleCheck

  low = minimumDepositPct
  high = feasiblePlan.effectiveDepositPct
  let bestPlan = feasiblePlan
  let bestServiceability = feasibleServiceability

  for (let step = 0; step < 28; step += 1) {
    const midpoint = (low + high) / 2
    const midpointPlan = getPurchasePlanAtDepositPct(
      propertyKey,
      property,
      propertyValue,
      occupancyMode,
      firstHomeBuyerEligible,
      midpoint
    )

    if (!midpointPlan || midpointPlan.upfrontCash > availableCash) {
      low = midpoint
      continue
    }

    const midpointServiceability = getPurchaseServiceability(
      request,
      market,
      occupancyMode,
      propertyKey,
      property,
      propertyValue,
      midpointPlan,
      atHomeHousingCosts,
      helpDebtBalance
    )

    if (midpointServiceability.affordable) {
      bestPlan = midpointPlan
      bestServiceability = midpointServiceability
      high = midpoint
    } else {
      low = midpoint
    }
  }

  return {
    purchasePlan: bestPlan,
    serviceability: bestServiceability
  }
}

function getPortfolioLedger(portfolioConfig, openingLiquidAssets, market) {
  const investedBalance = getInvestedBalance(openingLiquidAssets)
  const portfolioYear = buildPortfolioYearFromSleeves(portfolioConfig, market.sleeveReturns)
  const portfolioReturn = investedBalance * portfolioYear.totalReturn
  const taxableIncome = estimatePortfolioTaxableIncome(portfolioConfig, investedBalance)

  return {
    portfolioYear,
    portfolioReturn,
    taxablePortfolioIncome: taxableIncome.taxableIncome,
    frankingCredits: taxableIncome.frankingCredits
  }
}

function getCashSavingsLedger() {
  return {
    portfolioReturn: 0,
    taxablePortfolioIncome: 0,
    frankingCredits: 0
  }
}

function simulateOwnedPropertyYear({
  request,
  market,
  occupancyMode,
  propertyKey,
  propertyValue,
  mortgageBalance,
  yearsOwned,
  atHomeHousingCosts,
  borrowingExpensesTotalOverride = null
}) {
  const property = request.propertyConfig[propertyKey]
  const openingPropertyValue = Math.max(0, Number(propertyValue) || 0)
  const adjustedProperty = createPriceAdjustedPropertyConfig(propertyKey, property, openingPropertyValue)
  const yearsRemaining = Math.max(1, property.mortgageYears - yearsOwned)
  const baseRate = interpolateRate(
    getPropertyInterestRate(adjustedProperty, occupancyMode),
    getPropertyLongRunInterestRate(adjustedProperty, occupancyMode),
    yearsOwned,
    5
  )
  const mortgageRate = clamp(baseRate + market.mortgageRateJitter, 0.03, 0.11)
  const amortization = amortizeOneYear(mortgageBalance, mortgageRate, yearsRemaining)
  const endMortgageBalance = amortization.endingBalance
  const endPropertyValue = openingPropertyValue * (1 + getPropertyGrowth(market, propertyKey))

  if (occupancyMode === 'owner') {
    return {
      endPropertyValue,
      endMortgageBalance,
      housingCashCosts: amortization.payment + getOwnerHoldingCosts(adjustedProperty),
      rentalReceipts: 0,
      taxRentalIncome: 0
    }
  }

  const rentalTaxPosition = calculateInvestmentPropertyTaxPosition({
    propertyConfig: adjustedProperty,
    propertyValue: openingPropertyValue,
    vacancyRate: market.vacancyRate,
    interestPaid: amortization.interestPaid,
    yearsOwned,
    borrowingExpensesTotalOverride
  })

  return {
    endPropertyValue,
    endMortgageBalance,
    housingCashCosts:
      atHomeHousingCosts +
      amortization.payment +
      rentalTaxPosition.cashOperatingExpenses,
    rentalReceipts: rentalTaxPosition.rentReceived,
    taxRentalIncome: rentalTaxPosition.taxableRentalIncome
  }
}

function applySurplusAllocation({
  liquidAssets,
  annualSurplus,
  mortgageBalance,
  allowMortgagePrepayment
}) {
  let endingLiquidAssets = liquidAssets + annualSurplus
  let endingMortgageBalance = mortgageBalance

  if (allowMortgagePrepayment && annualSurplus > 0 && endingMortgageBalance > 0) {
    const availableCash = Math.min(annualSurplus, Math.max(0, endingLiquidAssets))
    const extraMortgagePrepayment = Math.min(availableCash, endingMortgageBalance)
    endingMortgageBalance -= extraMortgagePrepayment
    endingLiquidAssets -= extraMortgagePrepayment
  }

  return {
    endingLiquidAssets,
    endingMortgageBalance
  }
}

function applyHelpDebtCashflow(earners, annualSurplus) {
  const ledgers = earners.map((earner) => rollForwardHelpDebt(earner.helpDebtBalance, earner.annualIncome))
  const totalRepayment = ledgers.reduce((sum, ledger) => sum + ledger.actualRepayment, 0)
  return {
    ledgers,
    closingBalances: ledgers.map((ledger) => ledger.closingBalance),
    annualSurplusAfterHelp: annualSurplus - totalRepayment
  }
}

function getAvailablePurchaseLiquidity({
  taxYear,
  salaryIncome,
  grossLiquidAssets,
  portfolioCostBasis = 0,
  portfolioYearsHeld = 0,
  investWhileSavingForDeposit = false
}) {
  const safeGrossLiquidAssets = Math.max(0, Number(grossLiquidAssets) || 0)
  if (!investWhileSavingForDeposit) {
    return {
      availableCash: safeGrossLiquidAssets,
      saleTax: 0
    }
  }

  const liquidation = estimateLiquidationPosition({
    taxYear,
    salaryIncome,
    liquidAssets: safeGrossLiquidAssets,
    portfolioCostBasis,
    portfolioYearsHeld
  })

  return {
    availableCash: Math.max(0, liquidation.liquidationNetWorth),
    saleTax: liquidation.estimatedSaleTax
  }
}

function simulateRentInvestPath(request, marketPath) {
  const { profile, housingCosts, portfolioConfig } = request
  let liquidAssets = profile.startingSavings
  let helpDebtBalances = normaliseHouseholdEarners(profile).map((earner) => earner.helpDebtBalance)
  let portfolioCostBasis = getInvestedBalance(liquidAssets)
  let rentLevel = housingCosts.weeklyRent * 52
  let boardLevel = housingCosts.weeklyBoardAtHome * 52
  const openingLiquidation = estimateLiquidationPosition({
    taxYear: profile.taxYear,
    salaryIncome: profile.annualIncome,
    liquidAssets,
    portfolioCostBasis
  })
  const points = [createSnapshot({ liquidAssets: profile.startingSavings, ...openingLiquidation })]

  marketPath.forEach((market, yearIndex) => {
    if (yearIndex > 0) {
      rentLevel *= 1 + market.rentInflation
      boardLevel *= 1 + market.boardInflation
    }

    const housingCashCosts = isLiveAtHomeYear(request, yearIndex) ? boardLevel : rentLevel
    const openingLiquidAssets = liquidAssets
    const earners = getEarnersForYear(profile, yearIndex, helpDebtBalances)
    const portfolioLedger = getPortfolioLedger(portfolioConfig, openingLiquidAssets, market)
    const taxPosition = calculateHouseholdTaxPosition({
      taxYear: profile.taxYear,
      earners,
      taxablePortfolioIncome: portfolioLedger.taxablePortfolioIncome,
      frankingCredits: portfolioLedger.frankingCredits
    })
    const annualSurplus =
      market.income -
      taxPosition.totalTax -
      market.nonHousingLivingCosts -
      housingCashCosts
    const helpCashflow = applyHelpDebtCashflow(earners, annualSurplus)
    helpDebtBalances = helpCashflow.closingBalances

    const preFlowInvestedBalance = getInvestedBalance(openingLiquidAssets) + portfolioLedger.portfolioReturn
    liquidAssets += portfolioLedger.portfolioReturn + helpCashflow.annualSurplusAfterHelp
    portfolioCostBasis = updatePortfolioCostBasis(portfolioCostBasis, preFlowInvestedBalance, liquidAssets)
    const liquidation = estimateLiquidationPosition({
      taxYear: profile.taxYear,
      salaryIncome: market.income,
      liquidAssets,
      portfolioCostBasis,
      portfolioYearsHeld: yearIndex + 1
    })

    points.push(createSnapshot({
      liquidAssets,
      annualSurplus: helpCashflow.annualSurplusAfterHelp,
      totalTax: taxPosition.totalTax,
      taxDelta: taxPosition.deltaVsSalaryOnly,
      ...liquidation
    }))
  })

  return points
}

function simulatePropertyPath(request, marketPath, occupancyMode, propertyKey) {
  const { profile, housingCosts, portfolioConfig, propertyConfig } = request
  const property = propertyConfig[propertyKey]
  const firstHomeBuyerEligible = shouldApplyFirstHomeBuyerSupport(request, occupancyMode)
  const investWhileSavingForDeposit = Boolean(propertyConfig.investWhileSavingForDeposit)
  let liquidAssets = profile.startingSavings
  let targetPropertyValue = property.purchasePrice
  let propertyValue = 0
  let mortgageBalance = 0
  let helpDebtBalances = normaliseHouseholdEarners(profile).map((earner) => earner.helpDebtBalance)
  let portfolioCostBasis = getInvestedBalance(liquidAssets)
  let propertyCostBase = 0
  let investmentBorrowingExpensesTotal = 0
  let purchased = false
  let yearsOwned = 0
  let rentLevel = housingCosts.weeklyRent * 52
  let boardLevel = housingCosts.weeklyBoardAtHome * 52

  if (marketPath[0]) {
    const openingMarket = marketPath[0]
    const atHomeHousingCosts = isLiveAtHomeYear(request, 0) ? boardLevel : rentLevel
    const openingEarners = getEarnersForYear(profile, 0, helpDebtBalances)
    const openingPortfolioLedger = getPortfolioLedger(portfolioConfig, liquidAssets, openingMarket)
    const openingGrossLiquidAssets = liquidAssets + openingPortfolioLedger.portfolioReturn
    const openingPurchaseLiquidity = getAvailablePurchaseLiquidity({
      taxYear: profile.taxYear,
      salaryIncome: openingMarket.income,
      grossLiquidAssets: openingGrossLiquidAssets,
      portfolioCostBasis,
      investWhileSavingForDeposit
    })
    const openingPurchaseAttempt = solvePurchasePlanForAvailableCash({
      request,
      market: openingMarket,
      propertyKey,
      property,
      propertyValue: targetPropertyValue,
      occupancyMode,
      firstHomeBuyerEligible,
      atHomeHousingCosts,
      helpDebtBalance: helpDebtBalances,
      availableCash: openingPurchaseLiquidity.availableCash
    })

    if (openingPurchaseAttempt) {
      const { purchasePlan: openingPlan } = openingPurchaseAttempt
      const openingOwnedYear = simulateOwnedPropertyYear({
        request,
        market: openingMarket,
        occupancyMode,
        propertyKey,
        propertyValue: targetPropertyValue,
        mortgageBalance: openingPlan.openingMortgageBalance,
        yearsOwned: 0,
        atHomeHousingCosts,
        borrowingExpensesTotalOverride: openingPlan.deductibleBorrowingExpensesTotal
      })
      const openingTaxPosition = calculateHouseholdTaxPosition({
        taxYear: profile.taxYear,
        earners: openingEarners,
        taxablePortfolioIncome: openingPortfolioLedger.taxablePortfolioIncome,
        taxableRentalIncome: openingOwnedYear.taxRentalIncome,
        frankingCredits: openingPortfolioLedger.frankingCredits
      })
      const openingAnnualSurplus =
        openingMarket.income +
        openingOwnedYear.rentalReceipts -
        openingTaxPosition.totalTax -
        openingMarket.nonHousingLivingCosts -
        openingOwnedYear.housingCashCosts -
        openingPlan.upfrontCash
      const openingHelpCashflow = applyHelpDebtCashflow(openingEarners, openingAnnualSurplus)
      const openingAllocation = applySurplusAllocation({
        liquidAssets: openingPurchaseLiquidity.availableCash,
        annualSurplus: openingHelpCashflow.annualSurplusAfterHelp,
        mortgageBalance: openingOwnedYear.endMortgageBalance,
        allowMortgagePrepayment: propertyConfig.surplusAllocationMode === 'mortgagePrepayment'
      })

      if (openingAllocation.endingLiquidAssets >= 0) {
        liquidAssets = Math.max(0, openingPurchaseLiquidity.availableCash - openingPlan.upfrontCash)
        portfolioCostBasis = Math.max(0, liquidAssets)
        propertyValue = targetPropertyValue
        mortgageBalance = openingPlan.openingMortgageBalance
        propertyCostBase = getPropertyCostBaseAtPurchase(targetPropertyValue, openingPlan.purchaseCosts)
        investmentBorrowingExpensesTotal = openingPlan.deductibleBorrowingExpensesTotal
        purchased = true
      }
    }
  }

  const openingLiquidation = estimateLiquidationPosition({
    taxYear: profile.taxYear,
    salaryIncome: profile.annualIncome,
    liquidAssets,
    portfolioCostBasis,
    propertyValue,
    mortgageBalance,
    propertyCostBase,
    propertyYearsOwned: yearsOwned,
    propertyMainResidenceExempt: occupancyMode === 'owner'
  })
  const points = [createSnapshot({ liquidAssets, propertyValue, mortgageBalance, ...openingLiquidation })]

  marketPath.forEach((market, yearIndex) => {
    if (yearIndex > 0) {
      rentLevel *= 1 + market.rentInflation
      boardLevel *= 1 + market.boardInflation
    }

    const purchasedAtStart = purchased
    const openingLiquidAssets = liquidAssets
    const earners = getEarnersForYear(profile, yearIndex, helpDebtBalances)
    const portfolioLedger = purchasedAtStart || investWhileSavingForDeposit
      ? getPortfolioLedger(portfolioConfig, openingLiquidAssets, market)
      : getCashSavingsLedger()
    const liveAtHomeThisYear = isLiveAtHomeYear(request, yearIndex)
    const atHomeHousingCosts = liveAtHomeThisYear ? boardLevel : rentLevel
    let annualSurplus = 0
    let totalTax = 0
    let taxDelta = 0
    let endPropertyValue = propertyValue
    let endMortgageBalance = mortgageBalance
    let taxRentalIncome = 0
    let housingCashCosts = 0
    let rentalReceipts = 0
    let allocation = null

    if (!purchased) {
      housingCashCosts = atHomeHousingCosts
      const waitTaxPosition = calculateHouseholdTaxPosition({
        taxYear: profile.taxYear,
        earners,
        taxablePortfolioIncome: portfolioLedger.taxablePortfolioIncome,
        frankingCredits: portfolioLedger.frankingCredits
      })
      totalTax = waitTaxPosition.totalTax
      taxDelta = waitTaxPosition.deltaVsSalaryOnly
      annualSurplus =
        market.income -
        totalTax -
        market.nonHousingLivingCosts -
        housingCashCosts

      const prePurchaseGrossLiquidAssets = openingLiquidAssets + portfolioLedger.portfolioReturn
      const purchaseLiquidity = getAvailablePurchaseLiquidity({
        taxYear: profile.taxYear,
        salaryIncome: market.income,
        grossLiquidAssets: prePurchaseGrossLiquidAssets,
        portfolioCostBasis,
        portfolioYearsHeld: yearIndex + 1,
        investWhileSavingForDeposit
      })

      const purchaseAttempt = solvePurchasePlanForAvailableCash({
        request,
        market,
        propertyKey,
        property,
        propertyValue: targetPropertyValue,
        occupancyMode,
        firstHomeBuyerEligible,
        atHomeHousingCosts,
        helpDebtBalance: helpDebtBalances,
        availableCash: purchaseLiquidity.availableCash
      })

      if (purchaseAttempt) {
        const { purchasePlan } = purchaseAttempt
        const purchaseOwnedYear = simulateOwnedPropertyYear({
          request,
          market,
          occupancyMode,
          propertyKey,
          propertyValue: targetPropertyValue,
          mortgageBalance: purchasePlan.openingMortgageBalance,
          yearsOwned: 0,
          atHomeHousingCosts,
          borrowingExpensesTotalOverride: purchasePlan.deductibleBorrowingExpensesTotal
        })
        const purchaseTaxPosition = calculateHouseholdTaxPosition({
          taxYear: profile.taxYear,
          earners,
          taxablePortfolioIncome: portfolioLedger.taxablePortfolioIncome,
          taxableRentalIncome: purchaseOwnedYear.taxRentalIncome,
          frankingCredits: portfolioLedger.frankingCredits
        })
        const purchaseAnnualSurplus =
          market.income +
          purchaseOwnedYear.rentalReceipts -
          purchaseTaxPosition.totalTax -
          market.nonHousingLivingCosts -
          purchaseOwnedYear.housingCashCosts -
          purchasePlan.upfrontCash
        const purchaseHelpCashflow = applyHelpDebtCashflow(earners, purchaseAnnualSurplus)
        const purchaseAllocation = applySurplusAllocation({
          liquidAssets: purchaseLiquidity.availableCash,
          annualSurplus: purchaseHelpCashflow.annualSurplusAfterHelp,
          mortgageBalance: purchaseOwnedYear.endMortgageBalance,
          allowMortgagePrepayment: propertyConfig.surplusAllocationMode === 'mortgagePrepayment'
        })

        if (purchaseAllocation.endingLiquidAssets >= 0) {
          purchased = true
          propertyValue = targetPropertyValue
          endPropertyValue = purchaseOwnedYear.endPropertyValue
          endMortgageBalance = purchaseAllocation.endingMortgageBalance
          propertyCostBase = getPropertyCostBaseAtPurchase(targetPropertyValue, purchasePlan.purchaseCosts)
          investmentBorrowingExpensesTotal = purchasePlan.deductibleBorrowingExpensesTotal
          yearsOwned = 1
          housingCashCosts = purchaseOwnedYear.housingCashCosts
          rentalReceipts = purchaseOwnedYear.rentalReceipts
          taxRentalIncome = purchaseOwnedYear.taxRentalIncome
          totalTax = purchaseTaxPosition.totalTax
          taxDelta = purchaseTaxPosition.deltaVsSalaryOnly
          annualSurplus = purchaseHelpCashflow.annualSurplusAfterHelp
          allocation = purchaseAllocation
          helpDebtBalances = purchaseHelpCashflow.closingBalances
        } else {
          targetPropertyValue *= 1 + getPropertyGrowth(market, propertyKey)
        }
      } else {
        targetPropertyValue *= 1 + getPropertyGrowth(market, propertyKey)
      }
    } else {
      const ownedYear = simulateOwnedPropertyYear({
        request,
        market,
        occupancyMode,
        propertyKey,
        propertyValue,
        mortgageBalance: endMortgageBalance,
        yearsOwned,
        atHomeHousingCosts,
        borrowingExpensesTotalOverride: investmentBorrowingExpensesTotal
      })
      endMortgageBalance = ownedYear.endMortgageBalance
      endPropertyValue = ownedYear.endPropertyValue
      housingCashCosts = ownedYear.housingCashCosts
      rentalReceipts = ownedYear.rentalReceipts
      taxRentalIncome = ownedYear.taxRentalIncome
      yearsOwned += 1

      const taxPosition = calculateHouseholdTaxPosition({
        taxYear: profile.taxYear,
        earners,
        taxablePortfolioIncome: portfolioLedger.taxablePortfolioIncome,
        taxableRentalIncome: taxRentalIncome,
        frankingCredits: portfolioLedger.frankingCredits
      })

      totalTax = taxPosition.totalTax
      taxDelta = taxPosition.deltaVsSalaryOnly
      annualSurplus =
        market.income +
        rentalReceipts -
        totalTax -
        market.nonHousingLivingCosts -
        housingCashCosts
    }

    const annualCashflow = allocation
      ? { annualSurplusAfterHelp: annualSurplus }
      : applyHelpDebtCashflow(earners, annualSurplus)
    if (!allocation) {
      helpDebtBalances = annualCashflow.closingBalances
    }

    if (!allocation) {
      allocation = applySurplusAllocation({
        liquidAssets: openingLiquidAssets + portfolioLedger.portfolioReturn,
        annualSurplus: annualCashflow.annualSurplusAfterHelp,
        mortgageBalance: endMortgageBalance,
        allowMortgagePrepayment: purchased && propertyConfig.surplusAllocationMode === 'mortgagePrepayment'
      })
    }

    const preFlowInvestedBalance = purchasedAtStart || investWhileSavingForDeposit
      ? getInvestedBalance(openingLiquidAssets) + portfolioLedger.portfolioReturn
      : 0
    liquidAssets = allocation.endingLiquidAssets
    portfolioCostBasis = !purchasedAtStart && purchased
      ? Math.max(0, liquidAssets)
      : !purchasedAtStart && !investWhileSavingForDeposit
        ? Math.max(0, liquidAssets)
        : updatePortfolioCostBasis(portfolioCostBasis, preFlowInvestedBalance, liquidAssets)
    mortgageBalance = purchased ? allocation.endingMortgageBalance : 0
    propertyValue = purchased ? endPropertyValue : 0
    const liquidation = estimateLiquidationPosition({
      taxYear: profile.taxYear,
      salaryIncome: market.income,
      liquidAssets,
      portfolioCostBasis,
      portfolioYearsHeld: yearIndex + 1,
      propertyValue,
      mortgageBalance,
      propertyCostBase,
      propertyYearsOwned: yearsOwned,
      propertyMainResidenceExempt: occupancyMode === 'owner'
    })

    points.push(createSnapshot({
      liquidAssets,
      propertyValue,
      mortgageBalance,
      annualSurplus: annualCashflow.annualSurplusAfterHelp,
      totalTax,
      taxDelta,
      ...liquidation
    }))
  })

  return points
}

function normalisePurchaseCosts(rawCosts, fallbackStampDuty = 0, fallbackLegalFees = 0, fallbackBuyersCosts = 0) {
  return {
    stampDuty: Math.max(0, Number(rawCosts?.stampDuty ?? fallbackStampDuty) || 0),
    legalFees: Math.max(0, Number(rawCosts?.legalFees ?? fallbackLegalFees) || 0),
    buyersCosts: Math.max(0, Number(rawCosts?.buyersCosts ?? fallbackBuyersCosts) || 0)
  }
}

function normaliseProperty(property, fallback = {}) {
  const ownerPurchaseCosts = normalisePurchaseCosts(
    property.ownerPurchaseCosts,
    property.stampDuty,
    property.legalFees,
    property.buyersCosts
  )
  const investmentPurchaseCosts = normalisePurchaseCosts(
    property.investmentPurchaseCosts,
    property.stampDuty,
    property.legalFees,
    property.buyersCosts
  )
  const purchasePrice = Math.max(0, Number(property.purchasePrice) || 0)
  const investmentDepositPct = clamp(Number(property.depositPct) || 0, 0.05, 0.95)
  const firstHomeBuyerLowDepositLimit = Math.max(
    0,
    Number(property.firstHomeBuyerLowDepositLimit ?? FIRST_HOME_BUYER_LOW_DEPOSIT_LIMIT) || FIRST_HOME_BUYER_LOW_DEPOSIT_LIMIT
  )
  const defaultOwnerDepositPct =
    Boolean(fallback.firstHomeBuyerEligible) && purchasePrice > 0 && purchasePrice <= firstHomeBuyerLowDepositLimit
      ? 0.05
      : investmentDepositPct

  return {
    ...property,
    purchasePrice,
    firstHomeBuyerLowDepositLimit,
    ownerDepositPct: clamp(Number(property.ownerDepositPct ?? defaultOwnerDepositPct) || 0, 0.05, 0.95),
    ownerScaleDepositToBuyAsap: property.ownerScaleDepositToBuyAsap !== false,
    depositPct: investmentDepositPct,
    investmentScaleDepositToBuyAsap: property.investmentScaleDepositToBuyAsap !== false,
    mortgageYears: Math.max(1, Math.round(Number(property.mortgageYears) || 30)),
    ownerInterestRate: getPropertyInterestRate(property, 'owner'),
    ownerLongRunInterestRate: getPropertyLongRunInterestRate(property, 'owner'),
    investmentInterestRate: getPropertyInterestRate(property, 'investment'),
    investmentLongRunInterestRate: getPropertyLongRunInterestRate(property, 'investment'),
    growthMean: clamp(Number(property.growthMean) || 0, -0.1, 0.2),
    growthVolatility: clamp(Number(property.growthVolatility) || 0, 0, 0.3),
    historicalAnnualGrowthRates: Array.isArray(property.historicalAnnualGrowthRates)
      ? property.historicalAnnualGrowthRates
          .map(value => Number(value))
          .filter(value => Number.isFinite(value) && value >= -0.5 && value <= 0.5)
      : [],
    rentYield: clamp(Number(property.rentYield ?? fallback.rentYield) || 0, 0, 0.1),
    propertyManagementPct: clamp(Number(property.propertyManagementPct ?? fallback.propertyManagementPct) || 0, 0, 0.15),
    councilRates: Math.max(0, Number(property.councilRates) || 0),
    waterRates: Math.max(0, Number(property.waterRates) || 0),
    insurance: Math.max(0, Number(property.insurance) || 0),
    maintenance: Math.max(0, Number(property.maintenance) || 0),
    strata: Math.max(0, Number(property.strata) || 0),
    landTax: Math.max(0, Number(property.landTax) || 0),
    borrowingExpensesTotal: Math.max(0, Number(property.borrowingExpensesTotal) || 0),
    otherDeductibleExpensesAnnual: Math.max(0, Number(property.otherDeductibleExpensesAnnual) || 0),
    ownerPurchaseCosts,
    investmentPurchaseCosts
  }
}

function normaliseRequest(request) {
  const safe = JSON.parse(JSON.stringify(request))
  safe.profile.horizonYears = Math.round(clamp(safe.profile.horizonYears, 10, 30))
  safe.simulationSettings.iterations = Math.round(clamp(safe.simulationSettings.iterations, 120, 500))
  safe.profile.startingSavings = Math.max(0, Number(safe.profile.startingSavings) || 0)
  safe.profile = {
    ...safe.profile,
    ...normaliseIncomeProfile(safe.profile)
  }
  safe.profile.taxYear = '2026-27'
  const normalisedEarners = normaliseHouseholdEarners(safe.profile)
  safe.profile.startingSavings = normalisedEarners
    .reduce((sum, earner) => sum + Math.max(0, Number(earner.startingSavings) || 0), 0)
  safe.profile.helpDebtBalance = normalisedEarners
    .reduce((sum, earner) => sum + earner.helpDebtBalance, 0)
  safe.profile.weeklyNonHousingLivingCosts = Math.max(
    0,
    Number(safe.profile.weeklyNonHousingLivingCosts ?? safe.profile.weeklyHousingAndInvestingBudget ?? safe.profile.weeklyAvailableToSave) || 0
  )
  safe.housingCosts.liveAtHome = Boolean(safe.housingCosts.liveAtHome)
  safe.housingCosts.liveAtHomeYears = safe.housingCosts.liveAtHome
    ? Math.round(clamp(safe.housingCosts.liveAtHomeYears, 1, safe.profile.horizonYears - 1))
    : 0
  safe.housingCosts.weeklyRent = Math.max(0, Number(safe.housingCosts.weeklyRent) || 0)
  safe.housingCosts.weeklyBoardAtHome = Math.max(0, Number(safe.housingCosts.weeklyBoardAtHome) || 0)
  safe.housingCosts.rentGrowthRate = clamp(safe.housingCosts.rentGrowthRate, 0, 0.1)
  safe.housingCosts.boardGrowthRate = clamp(safe.housingCosts.boardGrowthRate, 0, 0.1)
  safe.portfolioConfig = {
    ...safe.portfolioConfig,
    ...normalisePortfolioWeights(safe.portfolioConfig)
  }
  safe.portfolioConfig.bootstrapMethod =
    safe.portfolioConfig.bootstrapMethod === 'historical-monthly'
      ? 'historical-monthly'
      : 'historical-block'
  safe.portfolioConfig.bootstrapBlockSizeMonths = Math.round(clamp(
    Number(safe.portfolioConfig.bootstrapBlockSizeMonths) || 3,
    1,
    12
  ))
  safe.propertyConfig.surplusAllocationMode =
    safe.propertyConfig.surplusAllocationMode === 'mortgagePrepayment'
      ? 'mortgagePrepayment'
      : 'portfolio'
  safe.propertyConfig.investWhileSavingForDeposit = safe.propertyConfig.investWhileSavingForDeposit !== false
  safe.propertyConfig.firstHomeBuyerEligible = Boolean(safe.propertyConfig.firstHomeBuyerEligible)
  safe.propertyConfig.vacancyRate = clamp(Number(safe.propertyConfig.vacancyRate) || wealthVacancyRate, 0, 0.12)
  safe.propertyConfig.historicalAnnualGrowthBlocks = Array.isArray(safe.propertyConfig.historicalAnnualGrowthBlocks)
    ? safe.propertyConfig.historicalAnnualGrowthBlocks
        .map((block) => ({
          year: Math.round(Number(block?.year) || 0),
          houseGrowth: Number.isFinite(Number(block?.houseGrowth)) ? clamp(Number(block.houseGrowth), -0.5, 0.5) : null,
          apartmentGrowth: Number.isFinite(Number(block?.apartmentGrowth)) ? clamp(Number(block.apartmentGrowth), -0.5, 0.5) : null
        }))
        .filter((block) => Number.isFinite(block.year) && (block.houseGrowth !== null || block.apartmentGrowth !== null))
    : []
  safe.propertyConfig.house = normaliseProperty(safe.propertyConfig.house, safe.propertyConfig)
  safe.propertyConfig.apartment = normaliseProperty(safe.propertyConfig.apartment, safe.propertyConfig)
  safe.scenarioSelection = resolveScenarioSelection(safe.scenarioSelection)
  return safe
}

function createSingleAssetPortfolioConfig(portfolioConfig, assetKey) {
  return {
    ...portfolioConfig,
    asxWeight: assetKey === 'asx' ? 1 : 0,
    qqqWeight: assetKey === 'qqq' ? 1 : 0,
    bondWeight: assetKey === 'bond' ? 1 : 0,
    cashWeight: assetKey === 'cash' ? 1 : 0,
    bitcoinWeight: assetKey === 'bitcoin' ? 1 : 0
  }
}

export function simulateWealthPathways(rawRequest) {
  const request = normaliseRequest(rawRequest)
  const horizonYears = request.profile.horizonYears
  const strategyMeta = getWealthStrategyMeta()
  const selectedScenarioKeys = request.scenarioSelection.selectedScenarioKeys.filter(key => strategyMeta[key])
  const bucketsByStrategy = Object.fromEntries(
    selectedScenarioKeys.map(strategyKey => [strategyKey, createStrategyBuckets(horizonYears)])
  )

  for (let iteration = 0; iteration < request.simulationSettings.iterations; iteration += 1) {
    const random = createMulberry32(request.simulationSettings.seed + iteration * 7919)
    const marketPath = sampleMarketPath(request, random)
    const strategySnapshots = {
      stockPortfolio: simulateRentInvestPath(request, marketPath),
      stockQqq: simulateRentInvestPath({
        ...request,
        portfolioConfig: createSingleAssetPortfolioConfig(request.portfolioConfig, 'qqq')
      }, marketPath),
      stockAsx200: simulateRentInvestPath({
        ...request,
        portfolioConfig: createSingleAssetPortfolioConfig(request.portfolioConfig, 'asx')
      }, marketPath),
      stockBonds: simulateRentInvestPath({
        ...request,
        portfolioConfig: createSingleAssetPortfolioConfig(request.portfolioConfig, 'bond')
      }, marketPath),
      stockCash: simulateRentInvestPath({
        ...request,
        portfolioConfig: createSingleAssetPortfolioConfig(request.portfolioConfig, 'cash')
      }, marketPath),
      stockBitcoin: simulateRentInvestPath({
        ...request,
        portfolioConfig: createSingleAssetPortfolioConfig(request.portfolioConfig, 'bitcoin')
      }, marketPath),
      buyHouseHome: simulatePropertyPath(request, marketPath, 'owner', 'house'),
      buyApartmentHome: simulatePropertyPath(request, marketPath, 'owner', 'apartment'),
      buyHouseInvestmentProperty: simulatePropertyPath(request, marketPath, 'investment', 'house'),
      buyApartmentInvestmentProperty: simulatePropertyPath(request, marketPath, 'investment', 'apartment')
    }

    selectedScenarioKeys.forEach((strategyKey) => {
      strategySnapshots[strategyKey].forEach((snapshot, yearIndex) => {
        addMetrics(bucketsByStrategy[strategyKey][yearIndex], snapshot)
      })
    })
  }

  const strategies = Object.fromEntries(
    selectedScenarioKeys.map(strategyKey => [strategyKey, aggregateStrategy(strategyKey, bucketsByStrategy[strategyKey], strategyMeta)])
  )
  const finalMetricSamplesByStrategy = Object.fromEntries(
    selectedScenarioKeys.map((strategyKey) => {
      const finalBucket = bucketsByStrategy[strategyKey]?.[horizonYears]
      return [
        strategyKey,
        {
          sellDown: Array.isArray(finalBucket?.liquidationNetWorth)
            ? [...finalBucket.liquidationNetWorth]
            : [],
          holdBalance: Array.isArray(finalBucket?.netWorth)
            ? [...finalBucket.netWorth]
            : [],
          annualSurplus: Array.isArray(finalBucket?.annualSurplus)
            ? [...finalBucket.annualSurplus]
            : []
        }
      ]
    })
  )

  return {
    generatedAt: new Date().toISOString(),
    years: Array.from({ length: horizonYears + 1 }, (_, index) => index),
    iterations: request.simulationSettings.iterations,
    request,
    finalMetricSamplesByStrategy,
    strategies,
    strategyOrder: wealthStrategyOrder.filter(key => selectedScenarioKeys.includes(key))
  }
}
