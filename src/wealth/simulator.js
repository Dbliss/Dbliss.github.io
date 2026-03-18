import {
  amortizeOneYear,
  calculatePurchaseCosts,
  clamp,
  createMulberry32,
  estimateLmi,
  formatShortCurrency,
  getEffectiveDepositPct,
  getAustralianTaxBreakdown,
  normalisePortfolioWeights,
  percentileSummary,
  roundCurrency,
  sampleNormal,
  simulatePortfolioYear
} from './finance.js'
import { getWealthStrategyMeta, wealthStrategyOrder } from '../data/wealthDefaults.js'

function createStrategyBuckets(horizonYears) {
  return Array.from({ length: horizonYears + 1 }, () => ({
    netWorth: [],
    liquidAssets: [],
    homeEquity: [],
    debtRemaining: [],
    annualCashOutflow: [],
    taxImpact: []
  }))
}

function sampleMarketPath(request, random) {
  const { profile, portfolioConfig, propertyConfig, housingCosts } = request
  return Array.from({ length: profile.horizonYears }, (_, yearIndex) => {
    const income = profile.annualIncome * Math.pow(1 + profile.incomeGrowthRate, yearIndex)
    const houseGrowth = clamp(sampleNormal(random, propertyConfig.house.growthMean, propertyConfig.house.growthVolatility), -0.25, 0.25)
    const apartmentGrowth = clamp(sampleNormal(random, propertyConfig.apartment.growthMean, propertyConfig.apartment.growthVolatility), -0.18, 0.18)
    const portfolioYear = simulatePortfolioYear(portfolioConfig, random, income)
    const mortgageRateJitter = sampleNormal(random, 0, 0.0045)
    return {
      income,
      portfolioYear,
      rentInflation: clamp(sampleNormal(random, housingCosts.rentGrowthRate, 0.01), 0, 0.08),
      boardInflation: clamp(sampleNormal(random, housingCosts.boardGrowthRate, 0.008), 0, 0.06),
      houseGrowth,
      apartmentGrowth,
      mortgageRateJitter
    }
  })
}

function yearPoint(year, metrics) {
  const netWorth = percentileSummary(metrics.netWorth)
  const liquidAssets = percentileSummary(metrics.liquidAssets)
  const homeEquity = percentileSummary(metrics.homeEquity)
  const debtRemaining = percentileSummary(metrics.debtRemaining)
  const annualCashOutflow = percentileSummary(metrics.annualCashOutflow)
  const taxImpact = percentileSummary(metrics.taxImpact)
  return {
    year,
    p10: roundCurrency(netWorth.p10),
    p50: roundCurrency(netWorth.p50),
    p90: roundCurrency(netWorth.p90),
    liquidAssetsP10: roundCurrency(liquidAssets.p10),
    liquidAssetsP50: roundCurrency(liquidAssets.p50),
    liquidAssetsP90: roundCurrency(liquidAssets.p90),
    homeEquityP10: roundCurrency(homeEquity.p10),
    homeEquityP50: roundCurrency(homeEquity.p50),
    homeEquityP90: roundCurrency(homeEquity.p90),
    debtRemainingP10: roundCurrency(debtRemaining.p10),
    debtRemainingP50: roundCurrency(debtRemaining.p50),
    debtRemainingP90: roundCurrency(debtRemaining.p90),
    annualCashOutflowP10: roundCurrency(annualCashOutflow.p10),
    annualCashOutflowP50: roundCurrency(annualCashOutflow.p50),
    annualCashOutflowP90: roundCurrency(annualCashOutflow.p90),
    taxImpactP10: roundCurrency(taxImpact.p10),
    taxImpactP50: roundCurrency(taxImpact.p50),
    taxImpactP90: roundCurrency(taxImpact.p90)
  }
}

function aggregateStrategy(strategyKey, buckets, strategyMeta) {
  const points = buckets.map((metrics, index) => yearPoint(index, metrics))
  const finalPoint = points[points.length - 1]
  return {
    ...strategyMeta[strategyKey],
    key: strategyKey,
    points,
    summary: {
      finalMedianNetWorth: finalPoint.p50,
      downsideRisk: finalPoint.p10,
      finalMedianLiquidAssets: finalPoint.liquidAssetsP50,
      finalMedianHomeEquity: finalPoint.homeEquityP50,
      finalMedianDebt: finalPoint.debtRemainingP50,
      finalMedianCashOutflow: finalPoint.annualCashOutflowP50,
      finalMedianTaxImpact: finalPoint.taxImpactP50,
      finalMedianDisplay: formatShortCurrency(finalPoint.p50)
    }
  }
}

function addMetrics(bucket, snapshot) {
  bucket.netWorth.push(snapshot.netWorth)
  bucket.liquidAssets.push(snapshot.liquidAssets)
  bucket.homeEquity.push(snapshot.homeEquity)
  bucket.debtRemaining.push(snapshot.debtRemaining)
  bucket.annualCashOutflow.push(snapshot.annualCashOutflow)
  bucket.taxImpact.push(snapshot.taxImpact)
}

function getSelectedPropertyKey(request) {
  return request.propertyConfig.targetPropertyType === 'apartment' ? 'apartment' : 'house'
}

function isLiveAtHomeYear(request, yearIndex) {
  return request.housingCosts.liveAtHome && yearIndex < request.housingCosts.liveAtHomeYears
}

function getPropertyGrowth(market, propertyKey) {
  return propertyKey === 'apartment' ? market.apartmentGrowth : market.houseGrowth
}

function applyPortfolioBalance(liquidAssets, portfolioYear) {
  const investedBalance = Math.max(0, liquidAssets)
  const growth = investedBalance * portfolioYear.totalReturn
  const taxImpact = investedBalance * Math.max(0, portfolioYear.taxImpactRate)
  return {
    nextLiquidAssets: liquidAssets + growth - taxImpact,
    taxImpact
  }
}

function createSnapshot(liquidAssets, propertyValue = 0, mortgageBalance = 0, annualCashOutflow = 0, taxImpact = 0) {
  const homeEquity = Math.max(0, propertyValue - mortgageBalance)
  return {
    netWorth: liquidAssets + homeEquity,
    liquidAssets,
    homeEquity,
    debtRemaining: mortgageBalance,
    annualCashOutflow,
    taxImpact
  }
}

function simulateRentInvestPath(request, marketPath) {
  const { profile, housingCosts } = request
  const points = [createSnapshot(profile.startingSavings)]
  let liquidAssets = profile.startingSavings
  let rentLevel = housingCosts.weeklyRent * 52
  let boardLevel = housingCosts.weeklyBoardAtHome * 52

  marketPath.forEach((market, yearIndex) => {
    if (yearIndex > 0) {
      rentLevel *= 1 + market.rentInflation
      boardLevel *= 1 + market.boardInflation
    }

    const savingsBase = profile.weeklyAvailableToSave * 52 * Math.pow(1 + profile.incomeGrowthRate, yearIndex)
    const housingOutflow = isLiveAtHomeYear(request, yearIndex) ? boardLevel : rentLevel
    const portfolioResult = applyPortfolioBalance(liquidAssets, market.portfolioYear)
    liquidAssets = portfolioResult.nextLiquidAssets + savingsBase - housingOutflow

    points.push(createSnapshot(liquidAssets, 0, 0, housingOutflow, portfolioResult.taxImpact))
  })

  return points
}

function getPurchasePlan(property, propertyConfig, propertyValue) {
  const scaledValue = Math.max(0, propertyValue)
  const purchasePriceScale = property.purchasePrice > 0 ? scaledValue / property.purchasePrice : 1
  const scaledProperty = {
    ...property,
    stampDuty: property.stampDuty * purchasePriceScale,
    buyersCosts: property.buyersCosts * purchasePriceScale
  }
  const effectiveDepositPct = getEffectiveDepositPct(property, propertyConfig.firstHomeBuyerEligible)
  const deposit = scaledValue * effectiveDepositPct
  const lmi = estimateLmi(scaledValue, effectiveDepositPct)
  const purchaseCosts = calculatePurchaseCosts(scaledProperty, propertyConfig.firstHomeBuyerEligible)

  return {
    deposit,
    effectiveDepositPct,
    lmi,
    purchaseCosts,
    upfrontCash: deposit + purchaseCosts.total
  }
}

function simulatePropertyPath(request, marketPath, occupancyMode) {
  const { profile, housingCosts, propertyConfig } = request
  const propertyKey = getSelectedPropertyKey(request)
  const property = propertyConfig[propertyKey]
  const startsPostHome = !housingCosts.liveAtHome || housingCosts.liveAtHomeYears <= 0
  const initialPlan = getPurchasePlan(property, propertyConfig, property.purchasePrice)

  let liquidAssets = profile.startingSavings
  let propertyValue = property.purchasePrice
  let mortgageBalance = 0
  let purchased = false
  let yearsOwned = 0
  let rentLevel = housingCosts.weeklyRent * 52
  let boardLevel = housingCosts.weeklyBoardAtHome * 52

  if (startsPostHome && liquidAssets >= initialPlan.upfrontCash) {
    liquidAssets -= initialPlan.upfrontCash
    mortgageBalance = propertyValue - initialPlan.deposit + initialPlan.lmi
    purchased = true
  }

  const points = [
    purchased
      ? createSnapshot(liquidAssets, propertyValue, mortgageBalance, initialPlan.upfrontCash)
      : createSnapshot(liquidAssets)
  ]

  marketPath.forEach((market, yearIndex) => {
    if (yearIndex > 0) {
      rentLevel *= 1 + market.rentInflation
      boardLevel *= 1 + market.boardInflation
    }

    const savingsBase = profile.weeklyAvailableToSave * 52 * Math.pow(1 + profile.incomeGrowthRate, yearIndex)

    if (isLiveAtHomeYear(request, yearIndex)) {
      const portfolioResult = applyPortfolioBalance(liquidAssets, market.portfolioYear)
      liquidAssets = portfolioResult.nextLiquidAssets + savingsBase - boardLevel
      propertyValue *= 1 + getPropertyGrowth(market, propertyKey)
      points.push(createSnapshot(liquidAssets, 0, 0, boardLevel, portfolioResult.taxImpact))
      return
    }

    let purchasePlan = null
    let purchasedThisYear = false

    if (!purchased) {
      purchasePlan = getPurchasePlan(property, propertyConfig, propertyValue)
      if (liquidAssets >= purchasePlan.upfrontCash) {
        liquidAssets -= purchasePlan.upfrontCash
        mortgageBalance = propertyValue - purchasePlan.deposit + purchasePlan.lmi
        purchased = true
        purchasedThisYear = true
        yearsOwned = 0
      }
    }

    if (!purchased) {
      const portfolioResult = applyPortfolioBalance(liquidAssets, market.portfolioYear)
      liquidAssets = portfolioResult.nextLiquidAssets + savingsBase - rentLevel
      propertyValue *= 1 + getPropertyGrowth(market, propertyKey)
      points.push(createSnapshot(liquidAssets, 0, 0, rentLevel, portfolioResult.taxImpact))
      return
    }

    const yearsRemaining = Math.max(1, property.mortgageYears - yearsOwned)
    const baseRate =
      property.interestRate + (property.longRunInterestRate - property.interestRate) * clamp(yearsOwned / 5, 0, 1)
    const mortgageRate = clamp(baseRate + market.mortgageRateJitter, 0.03, 0.11)
    const amortization = amortizeOneYear(mortgageBalance, mortgageRate, yearsRemaining)
    mortgageBalance = amortization.endingBalance
    propertyValue *= 1 + getPropertyGrowth(market, propertyKey)

    const recurringCosts =
      property.councilRates +
      property.insurance +
      property.maintenance +
      property.strata

    const portfolioResult = applyPortfolioBalance(liquidAssets, market.portfolioYear)
    let annualCashOutflow = 0
    let combinedTaxImpact = portfolioResult.taxImpact
    let contribution = 0

    if (occupancyMode === 'owner') {
      annualCashOutflow = amortization.payment + recurringCosts
      contribution = savingsBase - annualCashOutflow
    } else {
      const rentIncome = propertyValue * propertyConfig.rentYield * (1 - propertyConfig.vacancyRate)
      const managementFee = rentIncome * propertyConfig.propertyManagementPct
      const taxablePropertyIncome =
        rentIncome -
        managementFee -
        recurringCosts -
        amortization.interestPaid
      const propertyTaxImpact = taxablePropertyIncome * getAustralianTaxBreakdown(market.income).marginalRate
      const netPropertyCashflow =
        rentIncome -
        managementFee -
        recurringCosts -
        amortization.payment -
        propertyTaxImpact

      annualCashOutflow = Math.max(0, rentLevel - netPropertyCashflow)
      combinedTaxImpact += propertyTaxImpact
      contribution = savingsBase - rentLevel + netPropertyCashflow
    }

    if (purchasedThisYear && purchasePlan) {
      annualCashOutflow += purchasePlan.upfrontCash
    }

    liquidAssets = portfolioResult.nextLiquidAssets + contribution
    yearsOwned += 1

    points.push(createSnapshot(liquidAssets, propertyValue, mortgageBalance, annualCashOutflow, combinedTaxImpact))
  })

  return points
}

function normaliseRequest(request) {
  const safe = JSON.parse(JSON.stringify(request))
  safe.profile.horizonYears = Math.round(clamp(safe.profile.horizonYears, 10, 30))
  safe.simulationSettings.iterations = Math.round(clamp(safe.simulationSettings.iterations, 120, 800))
  safe.profile.incomeGrowthRate = clamp(safe.profile.incomeGrowthRate, 0, 0.1)
  safe.housingCosts.liveAtHome = Boolean(safe.housingCosts.liveAtHome)
  safe.housingCosts.liveAtHomeYears = safe.housingCosts.liveAtHome
    ? Math.round(clamp(safe.housingCosts.liveAtHomeYears, 1, safe.profile.horizonYears - 1))
    : 0
  safe.housingCosts.rentGrowthRate = clamp(safe.housingCosts.rentGrowthRate, 0, 0.1)
  safe.housingCosts.boardGrowthRate = clamp(safe.housingCosts.boardGrowthRate, 0, 0.1)
  safe.portfolioConfig = {
    ...safe.portfolioConfig,
    ...normalisePortfolioWeights(safe.portfolioConfig)
  }
  safe.propertyConfig.targetPropertyType = safe.propertyConfig.targetPropertyType === 'apartment' ? 'apartment' : 'house'
  return safe
}

export function simulateWealthPathways(rawRequest) {
  const request = normaliseRequest(rawRequest)
  const horizonYears = request.profile.horizonYears
  const strategyMeta = getWealthStrategyMeta(request.propertyConfig.targetPropertyType)
  const bucketsByStrategy = Object.fromEntries(
    wealthStrategyOrder.map(strategyKey => [strategyKey, createStrategyBuckets(horizonYears)])
  )

  for (let iteration = 0; iteration < request.simulationSettings.iterations; iteration += 1) {
    const random = createMulberry32(request.simulationSettings.seed + iteration * 7919)
    const marketPath = sampleMarketPath(request, random)
    const strategySnapshots = {
      rentInvest: simulateRentInvestPath(request, marketPath),
      buyHome: simulatePropertyPath(request, marketPath, 'owner'),
      buyInvestmentProperty: simulatePropertyPath(request, marketPath, 'investment')
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
