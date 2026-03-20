import {
  FIRST_HOME_BUYER_LOW_DEPOSIT_LIMIT,
  calculateAnnualMortgagePayment,
  amortizeOneYear,
  calculateAustralianAnnualTax,
  calculateInvestmentPropertyTaxPosition,
  calculatePurchaseCosts,
  clamp,
  createMulberry32,
  estimateCapitalGainsTax,
  estimateGenericPurchaseCosts,
  estimateLmi,
  estimatePortfolioTaxableIncome,
  formatShortCurrency,
  getEffectiveInvestmentDepositPct,
  getEffectiveOwnerDepositPct,
  interpolateRate,
  normalisePortfolioWeights,
  percentileSummary,
  roundCurrency,
  sampleNormal,
  simulatePortfolioYear
} from './finance.js'
import { getWealthStrategyMeta, wealthStrategyOrder, wealthVacancyRate, wealthVacancyRateVolatility } from '../data/wealthDefaults.js'

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
  const { profile, portfolioConfig, propertyConfig, housingCosts } = request
  return Array.from({ length: profile.horizonYears }, (_, yearIndex) => ({
    income: getAnnualSalary(profile, yearIndex),
    nonHousingLivingCosts: getAnnualNonHousingLivingCosts(profile, yearIndex),
    portfolioYear: simulatePortfolioYear(portfolioConfig, random),
    houseGrowth: clamp(sampleNormal(random, propertyConfig.house.growthMean, propertyConfig.house.growthVolatility), -0.25, 0.25),
    apartmentGrowth: clamp(sampleNormal(random, propertyConfig.apartment.growthMean, propertyConfig.apartment.growthVolatility), -0.18, 0.18),
    mortgageRateJitter: sampleNormal(random, 0, 0.0045),
    vacancyRate: clamp(sampleNormal(random, wealthVacancyRate, wealthVacancyRateVolatility), 0, 0.12),
    rentInflation: clamp(sampleNormal(random, housingCosts.rentGrowthRate, 0.01), 0, 0.08),
    boardInflation: clamp(sampleNormal(random, housingCosts.boardGrowthRate, 0.008), 0, 0.06)
  }))
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
      finalMedianDisplay: formatShortCurrency(finalPoint.p50)
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
  return profile.annualIncome * Math.pow(1 + profile.incomeGrowthRate, yearIndex)
}

function getAnnualNonHousingLivingCosts(profile, yearIndex) {
  return profile.weeklyNonHousingLivingCosts * 52 * Math.pow(1 + profile.incomeGrowthRate, yearIndex)
}

function getAnnualDisposableAfterLiving(market, taxYear) {
  const salaryOnlyTax = calculateAustralianAnnualTax({
    taxYear,
    salaryIncome: market.income
  })
  return market.income - salaryOnlyTax.totalTax - market.nonHousingLivingCosts
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
  propertyCapitalWorksClaimed = 0,
  propertyMainResidenceExempt = false
}) {
  const portfolioMarketValue = getInvestedBalance(liquidAssets)
  const propertyMarketValue = Math.max(0, Number(propertyValue) || 0)
  const debt = Math.max(0, Number(mortgageBalance) || 0)
  const adjustedPropertyCostBase = Math.max(0, Number(propertyCostBase) || 0) - Math.max(0, Number(propertyCapitalWorksClaimed) || 0)
  const portfolioRawGain = portfolioMarketValue - Math.max(0, Number(portfolioCostBasis) || 0)
  const propertyRawGain = propertyMainResidenceExempt ? 0 : propertyMarketValue - Math.max(0, adjustedPropertyCostBase)
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

function getOwnerHoldingCosts(property) {
  return (
    Math.max(0, Number(property.councilRates) || 0) +
    Math.max(0, Number(property.waterRates) || 0) +
    Math.max(0, Number(property.insurance) || 0) +
    Math.max(0, Number(property.maintenance) || 0) +
    Math.max(0, Number(property.strata) || 0)
  )
}

function getPurchaseCostsInput(property, occupancyMode) {
  return occupancyMode === 'owner' ? property.ownerPurchaseCosts : property.investmentPurchaseCosts
}

function scalePurchaseCosts(purchaseCosts, basePurchasePrice, nextPurchasePrice) {
  const currentCosts = normalisePurchaseCosts(purchaseCosts)
  const baseEstimate = estimateGenericPurchaseCosts(basePurchasePrice)
  const nextEstimate = estimateGenericPurchaseCosts(nextPurchasePrice)
  const scaleField = (currentValue, previousValue, nextValue) => {
    if (nextValue <= 0) return 0
    if (previousValue <= 0) return roundCurrency(nextValue)
    return roundCurrency((currentValue / previousValue) * nextValue)
  }

  return {
    ...currentCosts,
    stampDuty: scaleField(currentCosts.stampDuty, baseEstimate.stampDuty, nextEstimate.stampDuty),
    legalFees: scaleField(currentCosts.legalFees, baseEstimate.legalFees, nextEstimate.legalFees),
    buyersCosts: scaleField(currentCosts.buyersCosts, baseEstimate.buyersCosts, nextEstimate.buyersCosts)
  }
}

function getPurchasePlan(property, propertyValue, occupancyMode, firstHomeBuyerEligible) {
  const scaledValue = Math.max(0, Number(propertyValue) || 0)
  const purchaseCostsInput = scalePurchaseCosts(
    getPurchaseCostsInput(property, occupancyMode),
    property.purchasePrice,
    scaledValue
  )
  const effectiveDepositPct = occupancyMode === 'owner'
    ? getEffectiveOwnerDepositPct(property)
    : getEffectiveInvestmentDepositPct(property)
  const deposit = scaledValue * effectiveDepositPct
  const lmi = estimateLmi(scaledValue, effectiveDepositPct, firstHomeBuyerEligible)
  const purchaseCosts = calculatePurchaseCosts(purchaseCostsInput, firstHomeBuyerEligible, scaledValue)
  const borrowingExpensesUpfront = occupancyMode === 'investment'
    ? Math.max(0, Number(property.borrowingExpensesTotal) || 0)
    : 0

  return {
    deposit,
    effectiveDepositPct,
    lmi,
    purchaseCosts,
    borrowingExpensesUpfront,
    upfrontCash: deposit + purchaseCosts.total + borrowingExpensesUpfront,
    openingMortgageBalance: Math.max(0, scaledValue - deposit + lmi)
  }
}

function getPurchaseServiceability(request, market, occupancyMode, property, propertyValue, purchasePlan, atHomeHousingCosts) {
  const annualDisposableAfterLiving = getAnnualDisposableAfterLiving(market, request.profile.taxYear)
  const annualMortgagePayment = calculateAnnualMortgagePayment(
    purchasePlan.openingMortgageBalance,
    property.interestRate,
    property.mortgageYears
  )

  if (occupancyMode === 'owner') {
    const annualCarry = annualMortgagePayment + getOwnerHoldingCosts(property)
    return {
      annualDisposableAfterLiving,
      annualCarry,
      taxDelta: 0,
      affordable: annualDisposableAfterLiving >= annualCarry
    }
  }

  const rentalTaxPosition = calculateInvestmentPropertyTaxPosition({
    propertyConfig: property,
    propertyValue,
    vacancyRate: wealthVacancyRate,
    interestPaid: purchasePlan.openingMortgageBalance * property.interestRate,
    yearsOwned: 0
  })
  const taxPosition = calculateAustralianAnnualTax({
    taxYear: request.profile.taxYear,
    salaryIncome: market.income,
    taxableRentalIncome: rentalTaxPosition.taxableRentalIncome
  })
  const annualCarry =
    atHomeHousingCosts +
    annualMortgagePayment +
    rentalTaxPosition.cashOperatingExpenses -
    rentalTaxPosition.rentReceived +
    taxPosition.deltaVsSalaryOnly

  return {
    annualDisposableAfterLiving,
    annualCarry,
    taxDelta: taxPosition.deltaVsSalaryOnly,
    affordable: annualDisposableAfterLiving >= annualCarry
  }
}

function getPortfolioLedger(portfolioConfig, openingLiquidAssets, market) {
  const investedBalance = getInvestedBalance(openingLiquidAssets)
  const portfolioReturn = investedBalance * market.portfolioYear.totalReturn
  const taxableIncome = estimatePortfolioTaxableIncome(portfolioConfig, investedBalance)

  return {
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
  atHomeHousingCosts
}) {
  const property = request.propertyConfig[propertyKey]
  const openingPropertyValue = Math.max(0, Number(propertyValue) || 0)
  const yearsRemaining = Math.max(1, property.mortgageYears - yearsOwned)
  const baseRate = interpolateRate(property.interestRate, property.longRunInterestRate, yearsOwned, 5)
  const mortgageRate = clamp(baseRate + market.mortgageRateJitter, 0.03, 0.11)
  const amortization = amortizeOneYear(mortgageBalance, mortgageRate, yearsRemaining)
  const endMortgageBalance = amortization.endingBalance
  const endPropertyValue = openingPropertyValue * (1 + getPropertyGrowth(market, propertyKey))

  if (occupancyMode === 'owner') {
    return {
      endPropertyValue,
      endMortgageBalance,
      housingCashCosts: amortization.payment + getOwnerHoldingCosts(property),
      rentalReceipts: 0,
      taxRentalIncome: 0
    }
  }

  const rentalTaxPosition = calculateInvestmentPropertyTaxPosition({
    propertyConfig: property,
    propertyValue: openingPropertyValue,
    vacancyRate: market.vacancyRate,
    interestPaid: amortization.interestPaid,
    yearsOwned
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

function simulateRentInvestPath(request, marketPath) {
  const { profile, housingCosts, portfolioConfig } = request
  let liquidAssets = profile.startingSavings
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
    const portfolioLedger = getPortfolioLedger(portfolioConfig, openingLiquidAssets, market)
    const taxPosition = calculateAustralianAnnualTax({
      taxYear: profile.taxYear,
      salaryIncome: market.income,
      taxablePortfolioIncome: portfolioLedger.taxablePortfolioIncome,
      frankingCredits: portfolioLedger.frankingCredits
    })
    const annualSurplus =
      market.income -
      taxPosition.totalTax -
      market.nonHousingLivingCosts -
      housingCashCosts

    const preFlowInvestedBalance = getInvestedBalance(openingLiquidAssets) + portfolioLedger.portfolioReturn
    liquidAssets += portfolioLedger.portfolioReturn + annualSurplus
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
      annualSurplus,
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
  const initialPlan = getPurchasePlan(property, property.purchasePrice, occupancyMode, firstHomeBuyerEligible)

  let liquidAssets = profile.startingSavings
  let targetPropertyValue = property.purchasePrice
  let propertyValue = 0
  let mortgageBalance = 0
  let portfolioCostBasis = getInvestedBalance(liquidAssets)
  let propertyCostBase = 0
  let purchased = false
  let yearsOwned = 0
  let rentLevel = housingCosts.weeklyRent * 52
  let boardLevel = housingCosts.weeklyBoardAtHome * 52

  if (marketPath[0] && liquidAssets >= initialPlan.upfrontCash) {
    const openingMarket = marketPath[0]
    const atHomeHousingCosts = isLiveAtHomeYear(request, 0) ? boardLevel : rentLevel
    const openingPortfolioLedger = getPortfolioLedger(portfolioConfig, liquidAssets, openingMarket)
    const openingServiceability = getPurchaseServiceability(
      request,
      openingMarket,
      occupancyMode,
      property,
      targetPropertyValue,
      initialPlan,
      atHomeHousingCosts
    )

    if (openingServiceability.affordable) {
      const openingOwnedYear = simulateOwnedPropertyYear({
        request,
        market: openingMarket,
        occupancyMode,
        propertyKey,
        propertyValue: targetPropertyValue,
        mortgageBalance: initialPlan.openingMortgageBalance,
        yearsOwned: 0,
        atHomeHousingCosts
      })
      const openingTaxPosition = calculateAustralianAnnualTax({
        taxYear: profile.taxYear,
        salaryIncome: openingMarket.income,
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
        initialPlan.upfrontCash
      const openingAllocation = applySurplusAllocation({
        liquidAssets: liquidAssets + openingPortfolioLedger.portfolioReturn,
        annualSurplus: openingAnnualSurplus,
        mortgageBalance: openingOwnedYear.endMortgageBalance,
        allowMortgagePrepayment: propertyConfig.surplusAllocationMode === 'mortgagePrepayment'
      })

      if (openingAllocation.endingLiquidAssets >= 0) {
        liquidAssets -= initialPlan.upfrontCash
        portfolioCostBasis = updatePortfolioCostBasis(portfolioCostBasis, profile.startingSavings, liquidAssets)
        propertyValue = targetPropertyValue
        mortgageBalance = initialPlan.openingMortgageBalance
        propertyCostBase = getPropertyCostBaseAtPurchase(targetPropertyValue, initialPlan.purchaseCosts)
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
    propertyCapitalWorksClaimed: occupancyMode === 'investment'
      ? property.capitalWorksDeductionAnnual * yearsOwned
      : 0,
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
      const waitTaxPosition = calculateAustralianAnnualTax({
        taxYear: profile.taxYear,
        salaryIncome: market.income,
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

      const purchasePlan = getPurchasePlan(property, targetPropertyValue, occupancyMode, firstHomeBuyerEligible)
      if (openingLiquidAssets >= purchasePlan.upfrontCash) {
        const purchaseServiceability = getPurchaseServiceability(
          request,
          market,
          occupancyMode,
          property,
          targetPropertyValue,
          purchasePlan,
          atHomeHousingCosts
        )

        if (purchaseServiceability.affordable) {
          const purchaseOwnedYear = simulateOwnedPropertyYear({
            request,
            market,
            occupancyMode,
            propertyKey,
            propertyValue: targetPropertyValue,
            mortgageBalance: purchasePlan.openingMortgageBalance,
            yearsOwned: 0,
            atHomeHousingCosts
          })
          const purchaseTaxPosition = calculateAustralianAnnualTax({
            taxYear: profile.taxYear,
            salaryIncome: market.income,
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
          const purchaseAllocation = applySurplusAllocation({
            liquidAssets: openingLiquidAssets + portfolioLedger.portfolioReturn,
            annualSurplus: purchaseAnnualSurplus,
            mortgageBalance: purchaseOwnedYear.endMortgageBalance,
            allowMortgagePrepayment: propertyConfig.surplusAllocationMode === 'mortgagePrepayment'
          })

          if (purchaseAllocation.endingLiquidAssets >= 0) {
            purchased = true
            propertyValue = targetPropertyValue
            endPropertyValue = purchaseOwnedYear.endPropertyValue
            endMortgageBalance = purchaseAllocation.endingMortgageBalance
            propertyCostBase = getPropertyCostBaseAtPurchase(targetPropertyValue, purchasePlan.purchaseCosts)
            yearsOwned = 1
            housingCashCosts = purchaseOwnedYear.housingCashCosts
            rentalReceipts = purchaseOwnedYear.rentalReceipts
            taxRentalIncome = purchaseOwnedYear.taxRentalIncome
            totalTax = purchaseTaxPosition.totalTax
            taxDelta = purchaseTaxPosition.deltaVsSalaryOnly
            annualSurplus = purchaseAnnualSurplus
            allocation = purchaseAllocation
          } else {
            targetPropertyValue *= 1 + getPropertyGrowth(market, propertyKey)
          }
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
        atHomeHousingCosts
      })
      endMortgageBalance = ownedYear.endMortgageBalance
      endPropertyValue = ownedYear.endPropertyValue
      housingCashCosts = ownedYear.housingCashCosts
      rentalReceipts = ownedYear.rentalReceipts
      taxRentalIncome = ownedYear.taxRentalIncome
      yearsOwned += 1

      const taxPosition = calculateAustralianAnnualTax({
        taxYear: profile.taxYear,
        salaryIncome: market.income,
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

    if (!allocation) {
      allocation = applySurplusAllocation({
        liquidAssets: openingLiquidAssets + portfolioLedger.portfolioReturn,
        annualSurplus,
        mortgageBalance: endMortgageBalance,
        allowMortgagePrepayment: purchased && propertyConfig.surplusAllocationMode === 'mortgagePrepayment'
      })
    }

    const preFlowInvestedBalance = purchasedAtStart || investWhileSavingForDeposit
      ? getInvestedBalance(openingLiquidAssets) + portfolioLedger.portfolioReturn
      : 0
    liquidAssets = allocation.endingLiquidAssets
    portfolioCostBasis = !purchasedAtStart && !investWhileSavingForDeposit
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
      propertyCapitalWorksClaimed: occupancyMode === 'investment'
        ? property.capitalWorksDeductionAnnual * yearsOwned
        : 0,
      propertyMainResidenceExempt: occupancyMode === 'owner'
    })

    points.push(createSnapshot({
      liquidAssets,
      propertyValue,
      mortgageBalance,
      annualSurplus,
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
    buyersCosts: Math.max(0, Number(rawCosts?.buyersCosts ?? fallbackBuyersCosts) || 0),
    firstHomeBuyerDutyReductionPct: clamp(Number(rawCosts?.firstHomeBuyerDutyReductionPct) || 0, 0, 1),
    firstHomeBuyerGrant: Math.max(0, Number(rawCosts?.firstHomeBuyerGrant) || 0)
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
  const defaultOwnerDepositPct =
    Boolean(fallback.firstHomeBuyerEligible) && purchasePrice > 0 && purchasePrice <= FIRST_HOME_BUYER_LOW_DEPOSIT_LIMIT
      ? 0.05
      : investmentDepositPct

  return {
    ...property,
    purchasePrice,
    ownerDepositPct: clamp(Number(property.ownerDepositPct ?? defaultOwnerDepositPct) || 0, 0.05, 0.95),
    depositPct: investmentDepositPct,
    mortgageYears: Math.max(1, Math.round(Number(property.mortgageYears) || 30)),
    interestRate: clamp(Number(property.interestRate) || 0, 0, 0.2),
    longRunInterestRate: clamp(Number(property.longRunInterestRate) || 0, 0, 0.2),
    growthMean: clamp(Number(property.growthMean) || 0, -0.1, 0.2),
    growthVolatility: clamp(Number(property.growthVolatility) || 0, 0, 0.3),
    rentYield: clamp(Number(property.rentYield ?? fallback.rentYield) || 0, 0, 0.1),
    propertyManagementPct: clamp(Number(property.propertyManagementPct ?? fallback.propertyManagementPct) || 0, 0, 0.15),
    councilRates: Math.max(0, Number(property.councilRates) || 0),
    waterRates: Math.max(0, Number(property.waterRates) || 0),
    insurance: Math.max(0, Number(property.insurance) || 0),
    maintenance: Math.max(0, Number(property.maintenance) || 0),
    strata: Math.max(0, Number(property.strata) || 0),
    landTax: Math.max(0, Number(property.landTax) || 0),
    borrowingExpensesTotal: Math.max(0, Number(property.borrowingExpensesTotal) || 0),
    capitalWorksDeductionAnnual: Math.max(0, Number(property.capitalWorksDeductionAnnual) || 0),
    depreciationDeductionAnnual: Math.max(0, Number(property.depreciationDeductionAnnual) || 0),
    otherDeductibleExpensesAnnual: Math.max(0, Number(property.otherDeductibleExpensesAnnual) || 0),
    ownerPurchaseCosts,
    investmentPurchaseCosts
  }
}

function normaliseRequest(request) {
  const safe = JSON.parse(JSON.stringify(request))
  safe.profile.horizonYears = Math.round(clamp(safe.profile.horizonYears, 10, 30))
  safe.simulationSettings.iterations = Math.round(clamp(safe.simulationSettings.iterations, 120, 800))
  safe.profile.incomeGrowthRate = clamp(safe.profile.incomeGrowthRate, 0, 0.1)
  safe.profile.startingSavings = Math.max(0, Number(safe.profile.startingSavings) || 0)
  safe.profile.annualIncome = Math.max(0, Number(safe.profile.annualIncome) || 0)
  safe.profile.taxYear = typeof safe.profile.taxYear === 'string' ? safe.profile.taxYear : '2025-26'
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
  safe.propertyConfig.surplusAllocationMode =
    safe.propertyConfig.surplusAllocationMode === 'mortgagePrepayment'
      ? 'mortgagePrepayment'
      : 'portfolio'
  safe.propertyConfig.investWhileSavingForDeposit = safe.propertyConfig.investWhileSavingForDeposit !== false
  safe.propertyConfig.firstHomeBuyerEligible = Boolean(safe.propertyConfig.firstHomeBuyerEligible)
  safe.propertyConfig.vacancyRate = wealthVacancyRate
  safe.propertyConfig.house = normaliseProperty(safe.propertyConfig.house, safe.propertyConfig)
  safe.propertyConfig.apartment = normaliseProperty(safe.propertyConfig.apartment, safe.propertyConfig)
  return safe
}

export function simulateWealthPathways(rawRequest) {
  const request = normaliseRequest(rawRequest)
  const horizonYears = request.profile.horizonYears
  const strategyMeta = getWealthStrategyMeta()
  const bucketsByStrategy = Object.fromEntries(
    wealthStrategyOrder.map(strategyKey => [strategyKey, createStrategyBuckets(horizonYears)])
  )

  for (let iteration = 0; iteration < request.simulationSettings.iterations; iteration += 1) {
    const random = createMulberry32(request.simulationSettings.seed + iteration * 7919)
    const marketPath = sampleMarketPath(request, random)
    const strategySnapshots = {
      rentInvest: simulateRentInvestPath(request, marketPath),
      buyHouseHome: simulatePropertyPath(request, marketPath, 'owner', 'house'),
      buyApartmentHome: simulatePropertyPath(request, marketPath, 'owner', 'apartment'),
      buyHouseInvestmentProperty: simulatePropertyPath(request, marketPath, 'investment', 'house'),
      buyApartmentInvestmentProperty: simulatePropertyPath(request, marketPath, 'investment', 'apartment')
    }

    wealthStrategyOrder.forEach((strategyKey) => {
      strategySnapshots[strategyKey].forEach((snapshot, yearIndex) => {
        addMetrics(bucketsByStrategy[strategyKey][yearIndex], snapshot)
      })
    })
  }

  const strategies = Object.fromEntries(
    wealthStrategyOrder.map(strategyKey => [strategyKey, aggregateStrategy(strategyKey, bucketsByStrategy[strategyKey], strategyMeta)])
  )

  return {
    generatedAt: new Date().toISOString(),
    years: Array.from({ length: horizonYears + 1 }, (_, index) => index),
    iterations: request.simulationSettings.iterations,
    request,
    strategies
  }
}
