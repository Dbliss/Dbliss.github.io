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
  sampleNormal,
  getEffectivePropertyRentYield
} from './finance.js'
import { createBootstrapPortfolioSampler } from './assetBootstrap.js'
import {
  getWealthStrategyMeta,
  resolveScenarioSelection,
  wealthStrategyOrder,
  wealthVacancyRate,
  wealthVacancyRateVolatility
} from '../data/wealthDefaults.js'
import {
  getAdjustedWeeklyLivingCosts,
  getIncomeScaleForYear,
  getEarnerAnnualIncomeForYear,
  normaliseCareerBreakPlan,
  normaliseCareerBreakPlans,
  normaliseFamilyPlan,
  normaliseHouseholdEarners,
  normaliseIncomeProfile
} from './incomeSeries.js'

const PARENTAL_LEAVE_BASE_PAYMENT = 25000

function createStrategyBuckets(horizonYears) {
  return Array.from({ length: horizonYears + 1 }, () => ({
    netWorth: [],
    liquidationNetWorth: [],
    liquidAssets: [],
    homeEquity: [],
    debtRemaining: [],
    helpDebtRemaining: [],
    annualSurplus: [],
    totalTax: [],
    taxDelta: [],
    cashDeficit: [],
    estimatedSaleTax: [],
    cashflowSalaryIncome: [],
    cashflowPortfolioReturn: [],
    cashflowRentalIncome: [],
    cashflowTaxes: [],
    cashflowHelpRepayments: [],
    cashflowLivingCosts: [],
    cashflowHousingCosts: [],
    cashflowUpfrontCosts: [],
    cashflowSurplus: [],
    cashflowDeficit: [],
    detailSalaryIncome: [],
    detailParentalLeavePayment: [],
    detailAsxDividends: [],
    detailQqqDividends: [],
    detailVgsDividends: [],
    detailVgeDividends: [],
    detailDbpIncome: [],
    detailBondIncome: [],
    detailCashInterest: [],
    detailPortfolioGrowth: [],
    detailRentPaid: [],
    detailBoardPaid: [],
    detailRentReceived: [],
    detailMortgageInterest: [],
    detailMortgagePrincipal: [],
    detailOwnerCosts: [],
    detailPropertyManagement: [],
    detailCouncilRates: [],
    detailWaterRates: [],
    detailInsurance: [],
    detailMaintenance: [],
    detailStrata: [],
    detailLandTax: [],
    detailOtherPropertyCosts: [],
    detailRentalTaxImpact: [],
    detailTaxes: [],
    detailHelpRepayments: [],
    detailDeposit: [],
    detailStampDuty: [],
    detailLegalFees: [],
    detailBuyersCosts: [],
    detailBorrowingExpenses: [],
    detailSurplus: [],
    detailDeficit: []
  }))
}

function sampleMarketPath(request, random) {
  const { profile, propertyConfig, housingCosts } = request
  const vacancyRate = clamp(Number(propertyConfig.vacancyRate) || wealthVacancyRate, 0, 0.12)
  const propertyGrowthBlockSampler = createPropertyGrowthBlockSampler(random, propertyConfig)
  const houseYieldSampler = createPropertyYieldSampler(random, propertyConfig.house)
  const apartmentYieldSampler = createPropertyYieldSampler(random, propertyConfig.apartment)
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
      houseYield: houseYieldSampler(),
      apartmentYield: apartmentYieldSampler(),
      mortgageRateJitter: sampleNormal(random, 0, 0.0045),
      vacancyRate: clamp(sampleNormal(random, vacancyRate, wealthVacancyRateVolatility), 0, 0.12),
      rentInflation: clamp(sampleNormal(random, housingCosts.rentGrowthRate, 0.01), 0, 0.08),
      boardInflation: clamp(sampleNormal(random, housingCosts.boardGrowthRate, 0.008), 0, 0.06)
    }
  })
}

function createPropertyYieldSampler(random, property) {
  const model = property?.yieldModel
  if (!model || typeof model !== 'object') {
    const fallbackYield = clamp(getEffectivePropertyRentYield(property), 0, 0.12)
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
  const helpDebtRemaining = percentileSummary(metrics.helpDebtRemaining)
  const annualSurplus = percentileSummary(metrics.annualSurplus)
  const totalTax = percentileSummary(metrics.totalTax)
  const taxDelta = percentileSummary(metrics.taxDelta)
  const cashDeficit = percentileSummary(metrics.cashDeficit)
  const estimatedSaleTax = percentileSummary(metrics.estimatedSaleTax)
  const cashflowSalaryIncome = percentileSummary(metrics.cashflowSalaryIncome)
  const cashflowPortfolioReturn = percentileSummary(metrics.cashflowPortfolioReturn)
  const cashflowRentalIncome = percentileSummary(metrics.cashflowRentalIncome)
  const cashflowTaxes = percentileSummary(metrics.cashflowTaxes)
  const cashflowHelpRepayments = percentileSummary(metrics.cashflowHelpRepayments)
  const cashflowLivingCosts = percentileSummary(metrics.cashflowLivingCosts)
  const cashflowHousingCosts = percentileSummary(metrics.cashflowHousingCosts)
  const cashflowUpfrontCosts = percentileSummary(metrics.cashflowUpfrontCosts)
  const cashflowSurplus = percentileSummary(metrics.cashflowSurplus)
  const cashflowDeficit = percentileSummary(metrics.cashflowDeficit)
  const detailSalaryIncome = percentileSummary(metrics.detailSalaryIncome)
  const detailParentalLeavePayment = percentileSummary(metrics.detailParentalLeavePayment)
  const detailAsxDividends = percentileSummary(metrics.detailAsxDividends)
  const detailQqqDividends = percentileSummary(metrics.detailQqqDividends)
  const detailVgsDividends = percentileSummary(metrics.detailVgsDividends)
  const detailVgeDividends = percentileSummary(metrics.detailVgeDividends)
  const detailDbpIncome = percentileSummary(metrics.detailDbpIncome)
  const detailBondIncome = percentileSummary(metrics.detailBondIncome)
  const detailCashInterest = percentileSummary(metrics.detailCashInterest)
  const detailPortfolioGrowth = percentileSummary(metrics.detailPortfolioGrowth)
  const detailRentPaid = percentileSummary(metrics.detailRentPaid)
  const detailBoardPaid = percentileSummary(metrics.detailBoardPaid)
  const detailRentReceived = percentileSummary(metrics.detailRentReceived)
  const detailMortgageInterest = percentileSummary(metrics.detailMortgageInterest)
  const detailMortgagePrincipal = percentileSummary(metrics.detailMortgagePrincipal)
  const detailOwnerCosts = percentileSummary(metrics.detailOwnerCosts)
  const detailPropertyManagement = percentileSummary(metrics.detailPropertyManagement)
  const detailCouncilRates = percentileSummary(metrics.detailCouncilRates)
  const detailWaterRates = percentileSummary(metrics.detailWaterRates)
  const detailInsurance = percentileSummary(metrics.detailInsurance)
  const detailMaintenance = percentileSummary(metrics.detailMaintenance)
  const detailStrata = percentileSummary(metrics.detailStrata)
  const detailLandTax = percentileSummary(metrics.detailLandTax)
  const detailOtherPropertyCosts = percentileSummary(metrics.detailOtherPropertyCosts)
  const detailRentalTaxImpact = percentileSummary(metrics.detailRentalTaxImpact)
  const detailTaxes = percentileSummary(metrics.detailTaxes)
  const detailHelpRepayments = percentileSummary(metrics.detailHelpRepayments)
  const detailDeposit = percentileSummary(metrics.detailDeposit)
  const detailStampDuty = percentileSummary(metrics.detailStampDuty)
  const detailLegalFees = percentileSummary(metrics.detailLegalFees)
  const detailBuyersCosts = percentileSummary(metrics.detailBuyersCosts)
  const detailBorrowingExpenses = percentileSummary(metrics.detailBorrowingExpenses)
  const detailSurplus = percentileSummary(metrics.detailSurplus)
  const detailDeficit = percentileSummary(metrics.detailDeficit)
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
    helpDebtRemainingP10: roundCurrency(helpDebtRemaining.p10),
    helpDebtRemainingP50: roundCurrency(helpDebtRemaining.p50),
    helpDebtRemainingP90: roundCurrency(helpDebtRemaining.p90),
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
    estimatedSaleTaxP90: roundCurrency(estimatedSaleTax.p90),
    cashflowBreakdown: {
      salaryIncome: roundCurrency(cashflowSalaryIncome.p50),
      portfolioReturn: roundCurrency(cashflowPortfolioReturn.p50),
      rentalIncome: roundCurrency(cashflowRentalIncome.p50),
      taxes: roundCurrency(cashflowTaxes.p50),
      helpRepayments: roundCurrency(cashflowHelpRepayments.p50),
      livingCosts: roundCurrency(cashflowLivingCosts.p50),
      housingCosts: roundCurrency(cashflowHousingCosts.p50),
      upfrontCosts: roundCurrency(cashflowUpfrontCosts.p50),
      surplus: roundCurrency(cashflowSurplus.p50),
      deficit: roundCurrency(cashflowDeficit.p50)
    },
    detailedCashflowBreakdown: {
      salaryIncome: roundCurrency(detailSalaryIncome.p50),
      parentalLeavePayment: roundCurrency(detailParentalLeavePayment.p50),
      asxDividends: roundCurrency(detailAsxDividends.p50),
      qqqDividends: roundCurrency(detailQqqDividends.p50),
      vgsDividends: roundCurrency(detailVgsDividends.p50),
      vgeDividends: roundCurrency(detailVgeDividends.p50),
      dbpIncome: roundCurrency(detailDbpIncome.p50),
      bondIncome: roundCurrency(detailBondIncome.p50),
      cashInterest: roundCurrency(detailCashInterest.p50),
      portfolioGrowth: roundCurrency(detailPortfolioGrowth.p50),
      rentPaid: roundCurrency(detailRentPaid.p50),
      boardPaid: roundCurrency(detailBoardPaid.p50),
      rentReceived: roundCurrency(detailRentReceived.p50),
      mortgageInterest: roundCurrency(detailMortgageInterest.p50),
      mortgagePrincipal: roundCurrency(detailMortgagePrincipal.p50),
      ownerCosts: roundCurrency(detailOwnerCosts.p50),
      propertyManagement: roundCurrency(detailPropertyManagement.p50),
      councilRates: roundCurrency(detailCouncilRates.p50),
      waterRates: roundCurrency(detailWaterRates.p50),
      insurance: roundCurrency(detailInsurance.p50),
      maintenance: roundCurrency(detailMaintenance.p50),
      strata: roundCurrency(detailStrata.p50),
      landTax: roundCurrency(detailLandTax.p50),
      otherPropertyCosts: roundCurrency(detailOtherPropertyCosts.p50),
      rentalTaxImpact: roundCurrency(detailRentalTaxImpact.p50),
      taxes: roundCurrency(detailTaxes.p50),
      helpRepayments: roundCurrency(detailHelpRepayments.p50),
      deposit: roundCurrency(detailDeposit.p50),
      stampDuty: roundCurrency(detailStampDuty.p50),
      legalFees: roundCurrency(detailLegalFees.p50),
      buyersCosts: roundCurrency(detailBuyersCosts.p50),
      borrowingExpenses: roundCurrency(detailBorrowingExpenses.p50),
      surplus: roundCurrency(detailSurplus.p50),
      deficit: roundCurrency(detailDeficit.p50)
    }
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
  bucket.helpDebtRemaining.push(snapshot.helpDebtRemaining)
  bucket.annualSurplus.push(snapshot.annualSurplus)
  bucket.totalTax.push(snapshot.totalTax)
  bucket.taxDelta.push(snapshot.taxDelta)
  bucket.cashDeficit.push(snapshot.cashDeficit)
  bucket.estimatedSaleTax.push(snapshot.estimatedSaleTax)
  bucket.cashflowSalaryIncome.push(snapshot.cashflowBreakdown.salaryIncome)
  bucket.cashflowPortfolioReturn.push(snapshot.cashflowBreakdown.portfolioReturn)
  bucket.cashflowRentalIncome.push(snapshot.cashflowBreakdown.rentalIncome)
  bucket.cashflowTaxes.push(snapshot.cashflowBreakdown.taxes)
  bucket.cashflowHelpRepayments.push(snapshot.cashflowBreakdown.helpRepayments)
  bucket.cashflowLivingCosts.push(snapshot.cashflowBreakdown.livingCosts)
  bucket.cashflowHousingCosts.push(snapshot.cashflowBreakdown.housingCosts)
  bucket.cashflowUpfrontCosts.push(snapshot.cashflowBreakdown.upfrontCosts)
  bucket.cashflowSurplus.push(snapshot.cashflowBreakdown.surplus)
  bucket.cashflowDeficit.push(snapshot.cashflowBreakdown.deficit)
  bucket.detailSalaryIncome.push(snapshot.detailedCashflowBreakdown.salaryIncome)
  bucket.detailParentalLeavePayment.push(snapshot.detailedCashflowBreakdown.parentalLeavePayment)
  bucket.detailAsxDividends.push(snapshot.detailedCashflowBreakdown.asxDividends)
  bucket.detailQqqDividends.push(snapshot.detailedCashflowBreakdown.qqqDividends)
  bucket.detailVgsDividends.push(snapshot.detailedCashflowBreakdown.vgsDividends)
  bucket.detailVgeDividends.push(snapshot.detailedCashflowBreakdown.vgeDividends)
  bucket.detailDbpIncome.push(snapshot.detailedCashflowBreakdown.dbpIncome)
  bucket.detailBondIncome.push(snapshot.detailedCashflowBreakdown.bondIncome)
  bucket.detailCashInterest.push(snapshot.detailedCashflowBreakdown.cashInterest)
  bucket.detailPortfolioGrowth.push(snapshot.detailedCashflowBreakdown.portfolioGrowth)
  bucket.detailRentPaid.push(snapshot.detailedCashflowBreakdown.rentPaid)
  bucket.detailBoardPaid.push(snapshot.detailedCashflowBreakdown.boardPaid)
  bucket.detailRentReceived.push(snapshot.detailedCashflowBreakdown.rentReceived)
  bucket.detailMortgageInterest.push(snapshot.detailedCashflowBreakdown.mortgageInterest)
  bucket.detailMortgagePrincipal.push(snapshot.detailedCashflowBreakdown.mortgagePrincipal)
  bucket.detailOwnerCosts.push(snapshot.detailedCashflowBreakdown.ownerCosts)
  bucket.detailPropertyManagement.push(snapshot.detailedCashflowBreakdown.propertyManagement)
  bucket.detailCouncilRates.push(snapshot.detailedCashflowBreakdown.councilRates)
  bucket.detailWaterRates.push(snapshot.detailedCashflowBreakdown.waterRates)
  bucket.detailInsurance.push(snapshot.detailedCashflowBreakdown.insurance)
  bucket.detailMaintenance.push(snapshot.detailedCashflowBreakdown.maintenance)
  bucket.detailStrata.push(snapshot.detailedCashflowBreakdown.strata)
  bucket.detailLandTax.push(snapshot.detailedCashflowBreakdown.landTax)
  bucket.detailOtherPropertyCosts.push(snapshot.detailedCashflowBreakdown.otherPropertyCosts)
  bucket.detailRentalTaxImpact.push(snapshot.detailedCashflowBreakdown.rentalTaxImpact)
  bucket.detailTaxes.push(snapshot.detailedCashflowBreakdown.taxes)
  bucket.detailHelpRepayments.push(snapshot.detailedCashflowBreakdown.helpRepayments)
  bucket.detailDeposit.push(snapshot.detailedCashflowBreakdown.deposit)
  bucket.detailStampDuty.push(snapshot.detailedCashflowBreakdown.stampDuty)
  bucket.detailLegalFees.push(snapshot.detailedCashflowBreakdown.legalFees)
  bucket.detailBuyersCosts.push(snapshot.detailedCashflowBreakdown.buyersCosts)
  bucket.detailBorrowingExpenses.push(snapshot.detailedCashflowBreakdown.borrowingExpenses)
  bucket.detailSurplus.push(snapshot.detailedCashflowBreakdown.surplus)
  bucket.detailDeficit.push(snapshot.detailedCashflowBreakdown.deficit)
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
  return getEarnersForYear(profile, yearIndex).reduce((sum, earner) => sum + earner.annualIncome, 0)
}

function getEarnersForYear(profile, yearIndex, helpDebtBalances = []) {
  const earners = normaliseHouseholdEarners(profile)
  return earners.map((earner, index) => ({
    ...earner,
    annualIncome: getEarnerAnnualIncomeForYear(earner, yearIndex, earners.length),
    helpDebtBalance: Math.max(0, Number(helpDebtBalances[index] ?? earner.helpDebtBalance) || 0)
  }))
}

function getParentalLeavePaymentForYear(profile, yearIndex, paymentAmount = PARENTAL_LEAVE_BASE_PAYMENT) {
  const earners = normaliseHouseholdEarners(profile)
  const familyPlan = normaliseFamilyPlan(profile, earners.length)
  const targetYear = Math.max(1, Math.round(Number(yearIndex) || 0) + 1)

  if (earners.length < 2) {
    return { total: 0, allocations: earners.map(() => 0) }
  }

  const hasPlannedChild = familyPlan.plannedChildren.some((child) => Number(child?.year) === targetYear)
  if (!hasPlannedChild) {
    return { total: 0, allocations: earners.map(() => 0) }
  }

  const recipientIndex = earners.findIndex((earner) =>
    normaliseCareerBreakPlans(
      earner?.careerBreakPlans?.length ? earner.careerBreakPlans : earner?.careerBreakPlan,
      profile?.horizonYears,
      earners.length > 1
    ).some((plan) => plan.reason === 'child' && Number(plan.startYear) === targetYear)
  )

  if (recipientIndex < 0) {
    return { total: 0, allocations: earners.map(() => 0) }
  }

  const total = Math.max(0, Math.round(Number(paymentAmount) || 0))
  return {
    total,
    allocations: earners.map((_, index) => (index === recipientIndex ? total : 0))
  }
}

function getRepresentativeWealthValue(snapshot) {
  return (Number(snapshot?.netWorth) || 0) - (Number(snapshot?.helpDebtRemaining) || 0)
}

function attachRepresentativeWealthPaths(strategies, snapshotPathsByStrategy) {
  Object.entries(strategies).forEach(([strategyKey, strategy]) => {
    const paths = snapshotPathsByStrategy[strategyKey] || []
    if (!paths.length) return

    const finalValues = paths.map((path) => getRepresentativeWealthValue(path[path.length - 1]))
    const targetFinalValue = percentileSummary(finalValues).p50
    const representativePath = paths.reduce((bestPath, path) => {
      if (!bestPath) return path
      const candidateDistance = Math.abs(getRepresentativeWealthValue(path[path.length - 1]) - targetFinalValue)
      const bestDistance = Math.abs(getRepresentativeWealthValue(bestPath[bestPath.length - 1]) - targetFinalValue)
      return candidateDistance < bestDistance ? path : bestPath
    }, null)

    if (!representativePath) return

    strategy.points = strategy.points.map((point, index) => {
      const snapshot = representativePath[index]
      if (!snapshot) return point

      return {
        ...point,
        wealthLiquidAssetsRepresentative: roundCurrency(snapshot.liquidAssets),
        wealthPropertyValueRepresentative: roundCurrency(Math.max(0, (Number(snapshot.homeEquity) || 0) + (Number(snapshot.debtRemaining) || 0))),
        wealthMortgageDebtRepresentative: roundCurrency(snapshot.debtRemaining),
        wealthHelpDebtRepresentative: roundCurrency(snapshot.helpDebtRemaining)
      }
    })
  })
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
  return getAdjustedWeeklyLivingCosts(profile, yearIndex) * 52 * getIncomeScaleForYear(profile, yearIndex)
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
  propertyHoldings = null,
  propertyValue = 0,
  mortgageBalance = 0,
  propertyCostBase = 0,
  propertyYearsOwned = 0,
  propertyMainResidenceExempt = false
}) {
  const portfolioMarketValue = getInvestedBalance(liquidAssets)
  const portfolioRawGain = portfolioMarketValue - Math.max(0, Number(portfolioCostBasis) || 0)
  const resolvedPropertyHoldings = Array.isArray(propertyHoldings) && propertyHoldings.length
    ? propertyHoldings
    : [{
        value: propertyValue,
        debt: mortgageBalance,
        costBase: propertyCostBase,
        yearsOwned: propertyYearsOwned,
        mainResidenceExempt: propertyMainResidenceExempt
      }]
  const propertyMarketValue = resolvedPropertyHoldings.reduce((sum, holding) => sum + Math.max(0, Number(holding?.value) || 0), 0)
  const debt = resolvedPropertyHoldings.reduce((sum, holding) => sum + Math.max(0, Number(holding?.debt) || 0), 0)
  const propertyGainBuckets = resolvedPropertyHoldings.map((holding) => {
    const marketValue = Math.max(0, Number(holding?.value) || 0)
    const costBase = Math.max(0, Number(holding?.costBase) || 0)
    const mainResidenceExempt = Boolean(holding?.mainResidenceExempt)
    const rawGain = mainResidenceExempt ? 0 : marketValue - costBase

    return {
      rawGain,
      discountPct: mainResidenceExempt ? 1 : getDiscountPct(holding?.yearsOwned)
    }
  })
  const capitalLoss = Math.abs(Math.min(0, portfolioRawGain)) + propertyGainBuckets.reduce((sum, bucket) => sum + Math.abs(Math.min(0, bucket.rawGain)), 0)
  const positiveGainBuckets = [
    {
      grossGain: Math.max(0, portfolioRawGain),
      discountPct: getDiscountPct(portfolioYearsHeld)
    },
    ...propertyGainBuckets.map((bucket) => ({
      grossGain: Math.max(0, bucket.rawGain),
      discountPct: bucket.discountPct
    }))
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
  helpDebtRemaining = 0,
  annualSurplus = 0,
  totalTax = 0,
  taxDelta = 0,
  liquidationNetWorth = 0,
  estimatedSaleTax = 0,
  cashflowBreakdown = {},
  detailedCashflowBreakdown = {}
}) {
  const homeEquity = propertyValue - mortgageBalance
  return {
    netWorth: liquidAssets + homeEquity,
    liquidationNetWorth,
    liquidAssets,
    homeEquity,
    debtRemaining: mortgageBalance,
    helpDebtRemaining: Math.max(0, Number(helpDebtRemaining) || 0),
    annualSurplus,
    totalTax,
    taxDelta,
    cashDeficit: Math.max(0, -liquidAssets),
    estimatedSaleTax,
    cashflowBreakdown: {
      salaryIncome: Math.max(0, Number(cashflowBreakdown.salaryIncome) || 0),
      portfolioReturn: Number(cashflowBreakdown.portfolioReturn) || 0,
      rentalIncome: Math.max(0, Number(cashflowBreakdown.rentalIncome) || 0),
      taxes: Math.max(0, Number(cashflowBreakdown.taxes) || 0),
      helpRepayments: Math.max(0, Number(cashflowBreakdown.helpRepayments) || 0),
      livingCosts: Math.max(0, Number(cashflowBreakdown.livingCosts) || 0),
      housingCosts: Math.max(0, Number(cashflowBreakdown.housingCosts) || 0),
      upfrontCosts: Math.max(0, Number(cashflowBreakdown.upfrontCosts) || 0),
      surplus: Math.max(0, Number(cashflowBreakdown.surplus) || 0),
      deficit: Math.max(0, Number(cashflowBreakdown.deficit) || 0)
    },
    detailedCashflowBreakdown: {
      salaryIncome: Math.max(0, Number(detailedCashflowBreakdown.salaryIncome) || 0),
      parentalLeavePayment: Math.max(0, Number(detailedCashflowBreakdown.parentalLeavePayment) || 0),
      asxDividends: Math.max(0, Number(detailedCashflowBreakdown.asxDividends) || 0),
      qqqDividends: Math.max(0, Number(detailedCashflowBreakdown.qqqDividends) || 0),
      vgsDividends: Math.max(0, Number(detailedCashflowBreakdown.vgsDividends) || 0),
      vgeDividends: Math.max(0, Number(detailedCashflowBreakdown.vgeDividends) || 0),
      dbpIncome: Math.max(0, Number(detailedCashflowBreakdown.dbpIncome) || 0),
      bondIncome: Math.max(0, Number(detailedCashflowBreakdown.bondIncome) || 0),
      cashInterest: Math.max(0, Number(detailedCashflowBreakdown.cashInterest) || 0),
      portfolioGrowth: Number(detailedCashflowBreakdown.portfolioGrowth) || 0,
      rentPaid: Math.max(0, Number(detailedCashflowBreakdown.rentPaid) || 0),
      boardPaid: Math.max(0, Number(detailedCashflowBreakdown.boardPaid) || 0),
      rentReceived: Math.max(0, Number(detailedCashflowBreakdown.rentReceived) || 0),
      mortgageInterest: Math.max(0, Number(detailedCashflowBreakdown.mortgageInterest) || 0),
      mortgagePrincipal: Math.max(0, Number(detailedCashflowBreakdown.mortgagePrincipal) || 0),
      ownerCosts: Math.max(0, Number(detailedCashflowBreakdown.ownerCosts) || 0),
      propertyManagement: Math.max(0, Number(detailedCashflowBreakdown.propertyManagement) || 0),
      councilRates: Math.max(0, Number(detailedCashflowBreakdown.councilRates) || 0),
      waterRates: Math.max(0, Number(detailedCashflowBreakdown.waterRates) || 0),
      insurance: Math.max(0, Number(detailedCashflowBreakdown.insurance) || 0),
      maintenance: Math.max(0, Number(detailedCashflowBreakdown.maintenance) || 0),
      strata: Math.max(0, Number(detailedCashflowBreakdown.strata) || 0),
      landTax: Math.max(0, Number(detailedCashflowBreakdown.landTax) || 0),
      otherPropertyCosts: Math.max(0, Number(detailedCashflowBreakdown.otherPropertyCosts) || 0),
      rentalTaxImpact: Number(detailedCashflowBreakdown.rentalTaxImpact) || 0,
      taxes: Math.max(0, Number(detailedCashflowBreakdown.taxes) || 0),
      helpRepayments: Math.max(0, Number(detailedCashflowBreakdown.helpRepayments) || 0),
      deposit: Math.max(0, Number(detailedCashflowBreakdown.deposit) || 0),
      stampDuty: Math.max(0, Number(detailedCashflowBreakdown.stampDuty) || 0),
      legalFees: Math.max(0, Number(detailedCashflowBreakdown.legalFees) || 0),
      buyersCosts: Math.max(0, Number(detailedCashflowBreakdown.buyersCosts) || 0),
      borrowingExpenses: Math.max(0, Number(detailedCashflowBreakdown.borrowingExpenses) || 0),
      surplus: Math.max(0, Number(detailedCashflowBreakdown.surplus) || 0),
      deficit: Math.max(0, Number(detailedCashflowBreakdown.deficit) || 0)
    }
  }
}

function buildExistingPropertyHolding(existingProperty, overrides = {}) {
  if (!existingProperty?.enabled) return null

  return {
    value: Math.max(0, Number(overrides.value ?? existingProperty.currentValue) || 0),
    debt: Math.max(0, Number(overrides.debt ?? existingProperty.mortgageBalance) || 0),
    costBase: Math.max(0, Number(overrides.costBase ?? existingProperty.currentValue) || 0),
    yearsOwned: Math.max(0, Number(overrides.yearsOwned ?? 0) || 0),
    mainResidenceExempt: (overrides.occupancyMode ?? existingProperty.occupancyMode) === 'owner'
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
    weeklyNonHousingLivingCosts: getAdjustedWeeklyLivingCosts(request.profile, market.yearIndex),
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
    asxDistribution: taxableIncome.asxDistribution,
    qqqDistribution: taxableIncome.qqqDistribution,
    vgsDistribution: taxableIncome.vgsDistribution,
    vgeDistribution: taxableIncome.vgeDistribution,
    dbpIncome: taxableIncome.dbpIncome,
    bondIncome: taxableIncome.bondIncome,
    cashInterest: taxableIncome.cashInterest,
    portfolioGrowth: portfolioReturn - taxableIncome.cashIncome,
    taxablePortfolioIncome: taxableIncome.taxableIncome,
    frankingCredits: taxableIncome.frankingCredits
  }
}

function getCashSavingsLedger() {
  return {
    portfolioReturn: 0,
    asxDistribution: 0,
    qqqDistribution: 0,
    vgsDistribution: 0,
    vgeDistribution: 0,
    dbpIncome: 0,
    bondIncome: 0,
    cashInterest: 0,
    portfolioGrowth: 0,
    taxablePortfolioIncome: 0,
    frankingCredits: 0
  }
}

function normaliseExistingProperty(existingProperty = {}) {
  const propertyType = existingProperty?.propertyType === 'apartment' ? 'apartment' : 'house'
  const occupancyMode = existingProperty?.occupancyMode === 'investment' ? 'investment' : 'owner'
  const currentValue = Math.max(0, Number(existingProperty?.currentValue ?? existingProperty?.purchasePrice) || 0)

  return {
    ...existingProperty,
    enabled: Boolean(existingProperty?.enabled),
    occupancyMode,
    propertyType,
    areaLabel: String(existingProperty?.areaLabel || ''),
    areaKey: existingProperty?.areaKey || null,
    currentValue,
    purchasePrice: currentValue,
    mortgageBalance: Math.max(0, Number(existingProperty?.mortgageBalance) || 0),
    mortgageYears: Math.max(1, Math.round(Number(existingProperty?.mortgageYears) || 25)),
    annualRepaymentOverride: Math.max(0, Number(existingProperty?.annualRepaymentOverride) || 0),
    ownerInterestRate: clamp(Number(existingProperty?.ownerInterestRate) || 0, 0, 0.2),
    ownerLongRunInterestRate: clamp(Number(existingProperty?.ownerLongRunInterestRate ?? existingProperty?.ownerInterestRate) || 0, 0, 0.2),
    investmentInterestRate: clamp(Number(existingProperty?.investmentInterestRate ?? existingProperty?.ownerInterestRate) || 0, 0, 0.2),
    investmentLongRunInterestRate: clamp(Number(existingProperty?.investmentLongRunInterestRate ?? existingProperty?.investmentInterestRate ?? existingProperty?.ownerInterestRate) || 0, 0, 0.2),
    growthMean: clamp(Number(existingProperty?.growthMean) || 0, -0.1, 0.2),
    growthVolatility: clamp(Number(existingProperty?.growthVolatility) || 0, 0, 0.3),
    historicalAnnualGrowthRates: Array.isArray(existingProperty?.historicalAnnualGrowthRates)
      ? existingProperty.historicalAnnualGrowthRates.map((value) => Number(value)).filter((value) => Number.isFinite(value) && value >= -0.5 && value <= 0.5)
      : [],
    yieldModel: normaliseYieldModel(existingProperty?.yieldModel),
    rentYield: clamp(Number(existingProperty?.rentYield) || 0, 0, 0.12),
    propertyManagementPct: clamp(Number(existingProperty?.propertyManagementPct) || 0, 0, 0.15),
    councilRates: Math.max(0, Number(existingProperty?.councilRates) || 0),
    waterRates: Math.max(0, Number(existingProperty?.waterRates) || 0),
    insurance: Math.max(0, Number(existingProperty?.insurance) || 0),
    maintenance: Math.max(0, Number(existingProperty?.maintenance) || 0),
    strata: Math.max(0, Number(existingProperty?.strata) || 0),
    landTax: Math.max(0, Number(existingProperty?.landTax) || 0),
    borrowingExpensesTotal: Math.max(0, Number(existingProperty?.borrowingExpensesTotal) || 0),
    otherDeductibleExpensesAnnual: Math.max(0, Number(existingProperty?.otherDeductibleExpensesAnnual) || 0),
    ownerPurchaseCosts: { stampDuty: 0, legalFees: 0, buyersCosts: 0 },
    investmentPurchaseCosts: { stampDuty: 0, legalFees: 0, buyersCosts: 0 }
  }
}

function simulateExistingPropertyYear(existingProperty, market, yearsOwned = 0) {
  if (!existingProperty?.enabled) {
    return {
      endPropertyValue: 0,
      endMortgageBalance: 0,
      housingCashCosts: 0,
      rentalReceipts: 0,
      taxRentalIncome: 0,
      mortgageInterest: 0,
      mortgagePrincipal: 0,
      propertyExpenses: {
        managementFee: 0,
        councilRates: 0,
        waterRates: 0,
        insurance: 0,
        maintenance: 0,
        strata: 0,
        landTax: 0,
        otherPropertyCosts: 0
      }
    }
  }

  const propertyKey = existingProperty.propertyType === 'apartment' ? 'apartment' : 'house'
  const openingPropertyValue = Math.max(0, Number(existingProperty.currentValue) || 0)
  const adjustedProperty = createPriceAdjustedPropertyConfig(propertyKey, existingProperty, openingPropertyValue)
  const yearsRemaining = Math.max(1, existingProperty.mortgageYears - yearsOwned)
  const occupancyMode = existingProperty.occupancyMode === 'investment' ? 'investment' : 'owner'
  const baseRate = interpolateRate(
    getPropertyInterestRate(adjustedProperty, occupancyMode),
    getPropertyLongRunInterestRate(adjustedProperty, occupancyMode),
    yearsOwned,
    5
  )
  const mortgageRate = clamp(baseRate + market.mortgageRateJitter, 0.03, 0.11)
  const amortization = amortizeOneYear(existingProperty.mortgageBalance, mortgageRate, yearsRemaining)
  const annualRepayment = existingProperty.annualRepaymentOverride > 0
    ? existingProperty.annualRepaymentOverride
    : amortization.payment
  const principalPaid = Math.max(0, annualRepayment - amortization.interestPaid)
  const endMortgageBalance = Math.max(0, existingProperty.mortgageBalance - principalPaid)
  const endPropertyValue = openingPropertyValue * (1 + getPropertyGrowth(market, propertyKey))

  if (occupancyMode === 'owner') {
    const ownerHoldingCosts = getOwnerHoldingCosts(adjustedProperty)
    return {
      endPropertyValue,
      endMortgageBalance,
      housingCashCosts: annualRepayment + ownerHoldingCosts,
      rentalReceipts: 0,
      taxRentalIncome: 0,
      mortgageInterest: amortization.interestPaid,
      mortgagePrincipal: principalPaid,
      propertyExpenses: {
        managementFee: 0,
        councilRates: adjustedProperty.councilRates,
        waterRates: adjustedProperty.waterRates,
        insurance: adjustedProperty.insurance,
        maintenance: adjustedProperty.maintenance,
        strata: adjustedProperty.strata,
        landTax: 0,
        otherPropertyCosts: 0
      }
    }
  }

  const rentalTaxPosition = calculateInvestmentPropertyTaxPosition({
    propertyConfig: adjustedProperty,
    propertyValue: openingPropertyValue,
    vacancyRate: market.vacancyRate,
    interestPaid: amortization.interestPaid,
    yearsOwned,
    rentYieldOverride: propertyKey === 'apartment' ? market.apartmentYield : market.houseYield
  })

  return {
    endPropertyValue,
    endMortgageBalance,
    housingCashCosts: annualRepayment + rentalTaxPosition.cashOperatingExpenses,
    rentalReceipts: rentalTaxPosition.rentReceived,
    taxRentalIncome: rentalTaxPosition.taxableRentalIncome,
    mortgageInterest: amortization.interestPaid,
    mortgagePrincipal: principalPaid,
    propertyExpenses: {
      managementFee: rentalTaxPosition.managementFee,
      councilRates: rentalTaxPosition.councilRates,
      waterRates: rentalTaxPosition.waterRates,
      insurance: rentalTaxPosition.insurance,
      maintenance: rentalTaxPosition.maintenance,
      strata: rentalTaxPosition.strata,
      landTax: rentalTaxPosition.landTax,
      otherPropertyCosts: rentalTaxPosition.otherDeductibleExpensesAnnual
    }
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
    const ownerHoldingCosts = getOwnerHoldingCosts(adjustedProperty)
    return {
      endPropertyValue,
      endMortgageBalance,
      housingCashCosts: amortization.payment + ownerHoldingCosts,
      rentalReceipts: 0,
      taxRentalIncome: 0,
      mortgageInterest: amortization.interestPaid,
      mortgagePrincipal: amortization.principalPaid,
      ownerHoldingCosts,
      propertyExpenses: {
        managementFee: 0,
        councilRates: adjustedProperty.councilRates,
        waterRates: adjustedProperty.waterRates,
        insurance: adjustedProperty.insurance,
        maintenance: adjustedProperty.maintenance,
        strata: adjustedProperty.strata,
        landTax: 0,
        otherPropertyCosts: 0,
        rentalTaxImpact: 0,
        borrowingExpenses: 0
      }
    }
  }

  const rentalTaxPosition = calculateInvestmentPropertyTaxPosition({
    propertyConfig: adjustedProperty,
    propertyValue: openingPropertyValue,
    vacancyRate: market.vacancyRate,
    interestPaid: amortization.interestPaid,
    yearsOwned,
    borrowingExpensesTotalOverride,
    rentYieldOverride: propertyKey === 'apartment' ? market.apartmentYield : market.houseYield
  })

  return {
    endPropertyValue,
    endMortgageBalance,
    housingCashCosts:
      atHomeHousingCosts +
      amortization.payment +
      rentalTaxPosition.cashOperatingExpenses,
    rentalReceipts: rentalTaxPosition.rentReceived,
    taxRentalIncome: rentalTaxPosition.taxableRentalIncome,
    mortgageInterest: amortization.interestPaid,
    mortgagePrincipal: amortization.principalPaid,
    ownerHoldingCosts: atHomeHousingCosts,
    propertyExpenses: {
      managementFee: rentalTaxPosition.managementFee,
      councilRates: rentalTaxPosition.councilRates,
      waterRates: rentalTaxPosition.waterRates,
      insurance: rentalTaxPosition.insurance,
      maintenance: rentalTaxPosition.maintenance,
      strata: rentalTaxPosition.strata,
      landTax: rentalTaxPosition.landTax,
      otherPropertyCosts: rentalTaxPosition.otherDeductibleExpensesAnnual,
      rentalTaxImpact: 0,
      borrowingExpenses: rentalTaxPosition.borrowingExpenseDeduction
    }
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
    totalRepayment,
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
  const { profile, housingCosts, portfolioConfig, existingProperty } = request
  let liquidAssets = profile.startingSavings
  let helpDebtBalances = normaliseHouseholdEarners(profile).map((earner) => earner.helpDebtBalance)
  let portfolioCostBasis = getInvestedBalance(liquidAssets)
  let existingPropertyValue = existingProperty.enabled ? existingProperty.currentValue : 0
  let existingMortgageBalance = existingProperty.enabled ? existingProperty.mortgageBalance : 0
  let existingYearsOwned = 0
  let rentLevel = housingCosts.weeklyRent * 52
  let boardLevel = housingCosts.weeklyBoardAtHome * 52
  let parentalLeavePaymentLevel = PARENTAL_LEAVE_BASE_PAYMENT
  const openingLiquidation = estimateLiquidationPosition({
    taxYear: profile.taxYear,
    salaryIncome: profile.annualIncome,
    liquidAssets,
    portfolioCostBasis,
    propertyHoldings: [buildExistingPropertyHolding(existingProperty)]
  })
  const points = [createSnapshot({
    liquidAssets: profile.startingSavings,
    propertyValue: existingPropertyValue,
    mortgageBalance: existingMortgageBalance,
    helpDebtRemaining: helpDebtBalances.reduce((sum, balance) => sum + (Number(balance) || 0), 0),
    ...openingLiquidation
  })]

  marketPath.forEach((market, yearIndex) => {
    if (yearIndex > 0) {
      rentLevel *= 1 + market.rentInflation
      boardLevel *= 1 + market.boardInflation
      parentalLeavePaymentLevel *= 1 + market.rentInflation
    }

    const baseHousingCashCosts = isLiveAtHomeYear(request, yearIndex) ? boardLevel : rentLevel
    const openingLiquidAssets = liquidAssets
    const baseEarners = getEarnersForYear(profile, yearIndex, helpDebtBalances)
    const parentalLeavePayment = getParentalLeavePaymentForYear(profile, yearIndex, parentalLeavePaymentLevel)
    const earners = baseEarners.map((earner, index) => ({
      ...earner,
      annualIncome: earner.annualIncome + (parentalLeavePayment.allocations[index] || 0)
    }))
    const existingOwnedYear = simulateExistingPropertyYear({
      ...existingProperty,
      currentValue: existingPropertyValue,
      mortgageBalance: existingMortgageBalance
    }, market, existingYearsOwned)
    const portfolioLedger = getPortfolioLedger(portfolioConfig, openingLiquidAssets, market)
    const taxPosition = calculateHouseholdTaxPosition({
      taxYear: profile.taxYear,
      earners,
      taxablePortfolioIncome: portfolioLedger.taxablePortfolioIncome,
      taxableRentalIncome: existingOwnedYear.taxRentalIncome,
      frankingCredits: portfolioLedger.frankingCredits
    })
    const housingCashCosts = existingProperty.enabled && existingProperty.occupancyMode === 'owner'
      ? existingOwnedYear.housingCashCosts
      : baseHousingCashCosts + existingOwnedYear.housingCashCosts
    const annualSurplus =
      market.income +
      parentalLeavePayment.total +
      existingOwnedYear.rentalReceipts -
      taxPosition.totalTax -
      market.nonHousingLivingCosts -
      housingCashCosts
    const helpCashflow = applyHelpDebtCashflow(earners, annualSurplus)
    helpDebtBalances = helpCashflow.closingBalances

    const preFlowInvestedBalance = getInvestedBalance(openingLiquidAssets) + portfolioLedger.portfolioReturn
    liquidAssets += portfolioLedger.portfolioReturn + helpCashflow.annualSurplusAfterHelp
    portfolioCostBasis = updatePortfolioCostBasis(portfolioCostBasis, preFlowInvestedBalance, liquidAssets)
    existingPropertyValue = existingOwnedYear.endPropertyValue
    existingMortgageBalance = existingOwnedYear.endMortgageBalance
    if (existingProperty.enabled) existingYearsOwned += 1
    const liquidation = estimateLiquidationPosition({
      taxYear: profile.taxYear,
      salaryIncome: market.income,
      liquidAssets,
      portfolioCostBasis,
      portfolioYearsHeld: yearIndex + 1,
      propertyHoldings: [
        buildExistingPropertyHolding(existingProperty, {
          value: existingPropertyValue,
          debt: existingMortgageBalance,
          yearsOwned: existingYearsOwned
        })
      ]
    })

    points.push(createSnapshot({
      liquidAssets,
      propertyValue: existingPropertyValue,
      mortgageBalance: existingMortgageBalance,
      helpDebtRemaining: helpDebtBalances.reduce((sum, balance) => sum + (Number(balance) || 0), 0),
      annualSurplus: helpCashflow.annualSurplusAfterHelp,
      totalTax: taxPosition.totalTax,
      taxDelta: taxPosition.deltaVsSalaryOnly,
      cashflowBreakdown: {
        salaryIncome: market.income + parentalLeavePayment.total,
        portfolioReturn: portfolioLedger.portfolioReturn,
        rentalIncome: existingOwnedYear.rentalReceipts,
        taxes: taxPosition.totalTax,
        helpRepayments: helpCashflow.totalRepayment,
        livingCosts: market.nonHousingLivingCosts,
        housingCosts: housingCashCosts,
        upfrontCosts: 0,
        surplus: Math.max(0, helpCashflow.annualSurplusAfterHelp),
        deficit: Math.max(0, -helpCashflow.annualSurplusAfterHelp)
      },
      detailedCashflowBreakdown: {
        salaryIncome: market.income,
        parentalLeavePayment: parentalLeavePayment.total,
        asxDividends: portfolioLedger.asxDistribution,
        qqqDividends: portfolioLedger.qqqDistribution,
        vgsDividends: portfolioLedger.vgsDistribution,
        vgeDividends: portfolioLedger.vgeDistribution,
        dbpIncome: portfolioLedger.dbpIncome,
        bondIncome: portfolioLedger.bondIncome,
        cashInterest: portfolioLedger.cashInterest,
        portfolioGrowth: portfolioLedger.portfolioGrowth,
        rentPaid: existingProperty.enabled && existingProperty.occupancyMode === 'owner' ? 0 : (baseHousingCashCosts === rentLevel ? baseHousingCashCosts : 0),
        boardPaid: existingProperty.enabled && existingProperty.occupancyMode === 'owner' ? 0 : (baseHousingCashCosts === boardLevel ? baseHousingCashCosts : 0),
        rentReceived: existingOwnedYear.rentalReceipts,
        mortgageInterest: existingOwnedYear.mortgageInterest,
        mortgagePrincipal: existingOwnedYear.mortgagePrincipal,
        ownerCosts: existingProperty.enabled && existingProperty.occupancyMode === 'owner'
          ? existingOwnedYear.propertyExpenses.councilRates + existingOwnedYear.propertyExpenses.waterRates + existingOwnedYear.propertyExpenses.insurance + existingOwnedYear.propertyExpenses.maintenance + existingOwnedYear.propertyExpenses.strata
          : 0,
        propertyManagement: existingOwnedYear.propertyExpenses.managementFee,
        councilRates: existingOwnedYear.propertyExpenses.councilRates,
        waterRates: existingOwnedYear.propertyExpenses.waterRates,
        insurance: existingOwnedYear.propertyExpenses.insurance,
        maintenance: existingOwnedYear.propertyExpenses.maintenance,
        strata: existingOwnedYear.propertyExpenses.strata,
        landTax: existingOwnedYear.propertyExpenses.landTax,
        otherPropertyCosts: existingOwnedYear.propertyExpenses.otherPropertyCosts,
        rentalTaxImpact: Math.max(0, taxPosition.deltaVsSalaryOnly),
        taxes: taxPosition.totalTax,
        helpRepayments: helpCashflow.totalRepayment,
        deposit: 0,
        stampDuty: 0,
        legalFees: 0,
        buyersCosts: 0,
        borrowingExpenses: 0,
        surplus: Math.max(0, helpCashflow.annualSurplusAfterHelp),
        deficit: Math.max(0, -helpCashflow.annualSurplusAfterHelp)
      },
      ...liquidation
    }))
  })

  return points
}

function simulatePropertyPath(request, marketPath, occupancyMode, propertyKey) {
  const { profile, housingCosts, portfolioConfig, propertyConfig, existingProperty } = request
  const property = propertyConfig[propertyKey]
  const firstHomeBuyerEligible = shouldApplyFirstHomeBuyerSupport(request, occupancyMode)
  const investWhileSavingForDeposit = Boolean(propertyConfig.investWhileSavingForDeposit)
  let liquidAssets = profile.startingSavings
  let targetPropertyValue = property.purchasePrice
  let propertyValue = 0
  let mortgageBalance = 0
  let existingPropertyValue = existingProperty.enabled ? existingProperty.currentValue : 0
  let existingMortgageBalance = existingProperty.enabled ? existingProperty.mortgageBalance : 0
  let helpDebtBalances = normaliseHouseholdEarners(profile).map((earner) => earner.helpDebtBalance)
  let portfolioCostBasis = getInvestedBalance(liquidAssets)
  let propertyCostBase = 0
  let existingPropertyCostBase = existingProperty.enabled ? existingProperty.currentValue : 0
  let investmentBorrowingExpensesTotal = 0
  let purchased = false
  let yearsOwned = 0
  let existingYearsOwned = 0
  let rentLevel = housingCosts.weeklyRent * 52
  let boardLevel = housingCosts.weeklyBoardAtHome * 52
  let parentalLeavePaymentLevel = PARENTAL_LEAVE_BASE_PAYMENT

  if (marketPath[0]) {
    const openingMarket = marketPath[0]
    const baseHousingCosts = isLiveAtHomeYear(request, 0) ? boardLevel : rentLevel
    const atHomeHousingCosts = existingProperty.enabled && existingProperty.occupancyMode === 'owner' ? 0 : baseHousingCosts
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
    propertyHoldings: [
      buildExistingPropertyHolding(existingProperty, {
        value: existingPropertyValue,
        debt: existingMortgageBalance,
        costBase: existingPropertyCostBase,
        yearsOwned: existingYearsOwned
      }),
      {
        value: propertyValue,
        debt: mortgageBalance,
        costBase: propertyCostBase,
        yearsOwned,
        mainResidenceExempt: occupancyMode === 'owner'
      }
    ].filter(Boolean)
  })
  const points = [createSnapshot({
    liquidAssets,
    propertyValue: propertyValue + existingPropertyValue,
    mortgageBalance: mortgageBalance + existingMortgageBalance,
    helpDebtRemaining: helpDebtBalances.reduce((sum, balance) => sum + (Number(balance) || 0), 0),
    ...openingLiquidation
  })]

  marketPath.forEach((market, yearIndex) => {
    if (yearIndex > 0) {
      rentLevel *= 1 + market.rentInflation
      boardLevel *= 1 + market.boardInflation
      parentalLeavePaymentLevel *= 1 + market.rentInflation
    }

    const purchasedAtStart = purchased
    const openingLiquidAssets = liquidAssets
    const baseEarners = getEarnersForYear(profile, yearIndex, helpDebtBalances)
    const parentalLeavePayment = getParentalLeavePaymentForYear(profile, yearIndex, parentalLeavePaymentLevel)
    const earners = baseEarners.map((earner, index) => ({
      ...earner,
      annualIncome: earner.annualIncome + (parentalLeavePayment.allocations[index] || 0)
    }))
    const portfolioLedger = purchasedAtStart || investWhileSavingForDeposit
      ? getPortfolioLedger(portfolioConfig, openingLiquidAssets, market)
      : getCashSavingsLedger()
    const liveAtHomeThisYear = isLiveAtHomeYear(request, yearIndex)
    const householdBaseHousingCosts = existingProperty.enabled && existingProperty.occupancyMode === 'owner'
      ? 0
      : (liveAtHomeThisYear ? boardLevel : rentLevel)
    const existingOwnedYear = simulateExistingPropertyYear({
      ...existingProperty,
      currentValue: existingPropertyValue,
      mortgageBalance: existingMortgageBalance
    }, market, existingYearsOwned)
    const atHomeHousingCosts = householdBaseHousingCosts
    let annualSurplus = 0
    let totalTax = 0
    let taxDelta = 0
    let endPropertyValue = propertyValue
    let endMortgageBalance = mortgageBalance
    let taxRentalIncome = 0
    let housingCashCosts = 0
    let rentalReceipts = 0
    let upfrontCosts = 0
    let annualSurplusBeforeHelp = 0
    let detailedBreakdown = {
      salaryIncome: market.income,
      parentalLeavePayment: parentalLeavePayment.total,
      asxDividends: portfolioLedger.asxDistribution,
      qqqDividends: portfolioLedger.qqqDistribution,
      vgsDividends: portfolioLedger.vgsDistribution,
      vgeDividends: portfolioLedger.vgeDistribution,
      dbpIncome: portfolioLedger.dbpIncome,
      bondIncome: portfolioLedger.bondIncome,
      cashInterest: portfolioLedger.cashInterest,
      portfolioGrowth: portfolioLedger.portfolioGrowth,
      rentPaid: 0,
      boardPaid: 0,
      rentReceived: 0,
      mortgageInterest: 0,
      mortgagePrincipal: 0,
      ownerCosts: 0,
      propertyManagement: 0,
      councilRates: 0,
      waterRates: 0,
      insurance: 0,
      maintenance: 0,
      strata: 0,
      landTax: 0,
      otherPropertyCosts: 0,
      rentalTaxImpact: 0,
      taxes: 0,
      helpRepayments: 0,
      deposit: 0,
      stampDuty: 0,
      legalFees: 0,
      buyersCosts: 0,
      borrowingExpenses: 0,
      surplus: 0,
      deficit: 0
    }
    let allocation = null

    if (!purchased) {
      housingCashCosts = atHomeHousingCosts
      const waitTaxPosition = calculateHouseholdTaxPosition({
        taxYear: profile.taxYear,
        earners,
        taxablePortfolioIncome: portfolioLedger.taxablePortfolioIncome,
        taxableRentalIncome: existingOwnedYear.taxRentalIncome,
        frankingCredits: portfolioLedger.frankingCredits
      })
      totalTax = waitTaxPosition.totalTax
      taxDelta = waitTaxPosition.deltaVsSalaryOnly
      annualSurplus =
        market.income +
        parentalLeavePayment.total +
        existingOwnedYear.rentalReceipts -
        totalTax -
        market.nonHousingLivingCosts -
        (housingCashCosts + existingOwnedYear.housingCashCosts)
      annualSurplusBeforeHelp = annualSurplus
      detailedBreakdown.rentPaid = liveAtHomeThisYear ? 0 : householdBaseHousingCosts
      detailedBreakdown.boardPaid = liveAtHomeThisYear ? householdBaseHousingCosts : 0

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
          taxableRentalIncome: purchaseOwnedYear.taxRentalIncome + existingOwnedYear.taxRentalIncome,
          frankingCredits: portfolioLedger.frankingCredits
        })
        const purchaseAnnualSurplus =
          market.income +
          parentalLeavePayment.total +
          existingOwnedYear.rentalReceipts +
          purchaseOwnedYear.rentalReceipts -
          purchaseTaxPosition.totalTax -
          market.nonHousingLivingCosts -
          purchaseOwnedYear.housingCashCosts -
          existingOwnedYear.housingCashCosts -
          purchasePlan.upfrontCash
        annualSurplusBeforeHelp = purchaseAnnualSurplus
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
          upfrontCosts = purchasePlan.upfrontCash
          totalTax = purchaseTaxPosition.totalTax
          taxDelta = purchaseTaxPosition.deltaVsSalaryOnly
          annualSurplus = purchaseHelpCashflow.annualSurplusAfterHelp
          allocation = purchaseAllocation
          helpDebtBalances = purchaseHelpCashflow.closingBalances
          detailedBreakdown.rentPaid = occupancyMode === 'investment' && !liveAtHomeThisYear ? householdBaseHousingCosts : 0
          detailedBreakdown.boardPaid = occupancyMode === 'investment' && liveAtHomeThisYear ? householdBaseHousingCosts : 0
          detailedBreakdown.rentReceived = rentalReceipts
          detailedBreakdown.mortgageInterest = purchaseOwnedYear.mortgageInterest
          detailedBreakdown.mortgagePrincipal = purchaseOwnedYear.mortgagePrincipal
          detailedBreakdown.ownerCosts = occupancyMode === 'owner' ? purchaseOwnedYear.propertyExpenses.councilRates + purchaseOwnedYear.propertyExpenses.waterRates + purchaseOwnedYear.propertyExpenses.insurance + purchaseOwnedYear.propertyExpenses.maintenance + purchaseOwnedYear.propertyExpenses.strata : 0
          detailedBreakdown.propertyManagement = purchaseOwnedYear.propertyExpenses.managementFee
          detailedBreakdown.councilRates = purchaseOwnedYear.propertyExpenses.councilRates
          detailedBreakdown.waterRates = purchaseOwnedYear.propertyExpenses.waterRates
          detailedBreakdown.insurance = purchaseOwnedYear.propertyExpenses.insurance
          detailedBreakdown.maintenance = purchaseOwnedYear.propertyExpenses.maintenance
          detailedBreakdown.strata = purchaseOwnedYear.propertyExpenses.strata
          detailedBreakdown.landTax = purchaseOwnedYear.propertyExpenses.landTax
          detailedBreakdown.otherPropertyCosts = purchaseOwnedYear.propertyExpenses.otherPropertyCosts
          detailedBreakdown.deposit = purchasePlan.deposit
          detailedBreakdown.stampDuty = purchasePlan.purchaseCosts.stampDuty
          detailedBreakdown.legalFees = purchasePlan.purchaseCosts.legalFees
          detailedBreakdown.buyersCosts = purchasePlan.purchaseCosts.buyersCosts
          detailedBreakdown.borrowingExpenses = purchasePlan.borrowingExpensesUpfront
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
        taxableRentalIncome: taxRentalIncome + existingOwnedYear.taxRentalIncome,
        frankingCredits: portfolioLedger.frankingCredits
      })

      totalTax = taxPosition.totalTax
      taxDelta = taxPosition.deltaVsSalaryOnly
      annualSurplus =
        market.income +
        parentalLeavePayment.total +
        existingOwnedYear.rentalReceipts +
        rentalReceipts -
        totalTax -
        market.nonHousingLivingCosts -
        housingCashCosts -
        existingOwnedYear.housingCashCosts
      annualSurplusBeforeHelp = annualSurplus
      detailedBreakdown.rentPaid = occupancyMode === 'investment' && !liveAtHomeThisYear ? householdBaseHousingCosts : 0
      detailedBreakdown.boardPaid = occupancyMode === 'investment' && liveAtHomeThisYear ? householdBaseHousingCosts : 0
      detailedBreakdown.rentReceived = rentalReceipts
      detailedBreakdown.mortgageInterest = ownedYear.mortgageInterest
      detailedBreakdown.mortgagePrincipal = ownedYear.mortgagePrincipal
      detailedBreakdown.ownerCosts = occupancyMode === 'owner' ? ownedYear.propertyExpenses.councilRates + ownedYear.propertyExpenses.waterRates + ownedYear.propertyExpenses.insurance + ownedYear.propertyExpenses.maintenance + ownedYear.propertyExpenses.strata : 0
      detailedBreakdown.propertyManagement = ownedYear.propertyExpenses.managementFee
      detailedBreakdown.councilRates = ownedYear.propertyExpenses.councilRates
      detailedBreakdown.waterRates = ownedYear.propertyExpenses.waterRates
      detailedBreakdown.insurance = ownedYear.propertyExpenses.insurance
      detailedBreakdown.maintenance = ownedYear.propertyExpenses.maintenance
      detailedBreakdown.strata = ownedYear.propertyExpenses.strata
      detailedBreakdown.landTax = ownedYear.propertyExpenses.landTax
      detailedBreakdown.otherPropertyCosts = ownedYear.propertyExpenses.otherPropertyCosts
      detailedBreakdown.borrowingExpenses = 0
    }

    const annualCashflow = allocation
      ? { annualSurplusAfterHelp: annualSurplus, totalRepayment: Math.max(0, annualSurplusBeforeHelp - annualSurplus), closingBalances: helpDebtBalances }
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
    existingPropertyValue = existingOwnedYear.endPropertyValue
    existingMortgageBalance = existingOwnedYear.endMortgageBalance
    if (existingProperty.enabled) existingYearsOwned += 1
    const liquidation = estimateLiquidationPosition({
      taxYear: profile.taxYear,
      salaryIncome: market.income,
      liquidAssets,
      portfolioCostBasis,
      portfolioYearsHeld: yearIndex + 1,
      propertyHoldings: [
        buildExistingPropertyHolding(existingProperty, {
          value: existingPropertyValue,
          debt: existingMortgageBalance,
          costBase: existingPropertyCostBase,
          yearsOwned: existingYearsOwned
        }),
        {
          value: propertyValue,
          debt: mortgageBalance,
          costBase: propertyCostBase,
          yearsOwned,
          mainResidenceExempt: occupancyMode === 'owner'
        }
      ].filter(Boolean)
    })

    points.push(createSnapshot({
      liquidAssets,
      propertyValue: propertyValue + existingPropertyValue,
      mortgageBalance: mortgageBalance + existingMortgageBalance,
      helpDebtRemaining: helpDebtBalances.reduce((sum, balance) => sum + (Number(balance) || 0), 0),
      annualSurplus: annualCashflow.annualSurplusAfterHelp,
      totalTax,
      taxDelta,
      cashflowBreakdown: {
        salaryIncome: market.income + parentalLeavePayment.total,
        portfolioReturn: portfolioLedger.portfolioReturn,
        rentalIncome: rentalReceipts + existingOwnedYear.rentalReceipts,
        taxes: totalTax,
        helpRepayments: annualCashflow.totalRepayment,
        livingCosts: market.nonHousingLivingCosts,
        housingCosts: housingCashCosts + existingOwnedYear.housingCashCosts,
        upfrontCosts,
        surplus: Math.max(0, annualCashflow.annualSurplusAfterHelp),
        deficit: Math.max(0, -annualCashflow.annualSurplusAfterHelp)
      },
      detailedCashflowBreakdown: {
        ...detailedBreakdown,
        rentReceived: (Number(detailedBreakdown.rentReceived) || 0) + existingOwnedYear.rentalReceipts,
        mortgageInterest: (Number(detailedBreakdown.mortgageInterest) || 0) + existingOwnedYear.mortgageInterest,
        mortgagePrincipal: (Number(detailedBreakdown.mortgagePrincipal) || 0) + existingOwnedYear.mortgagePrincipal,
        ownerCosts: (Number(detailedBreakdown.ownerCosts) || 0) + (existingProperty.enabled && existingProperty.occupancyMode === 'owner'
          ? existingOwnedYear.propertyExpenses.councilRates + existingOwnedYear.propertyExpenses.waterRates + existingOwnedYear.propertyExpenses.insurance + existingOwnedYear.propertyExpenses.maintenance + existingOwnedYear.propertyExpenses.strata
          : 0),
        propertyManagement: (Number(detailedBreakdown.propertyManagement) || 0) + existingOwnedYear.propertyExpenses.managementFee,
        councilRates: (Number(detailedBreakdown.councilRates) || 0) + existingOwnedYear.propertyExpenses.councilRates,
        waterRates: (Number(detailedBreakdown.waterRates) || 0) + existingOwnedYear.propertyExpenses.waterRates,
        insurance: (Number(detailedBreakdown.insurance) || 0) + existingOwnedYear.propertyExpenses.insurance,
        maintenance: (Number(detailedBreakdown.maintenance) || 0) + existingOwnedYear.propertyExpenses.maintenance,
        strata: (Number(detailedBreakdown.strata) || 0) + existingOwnedYear.propertyExpenses.strata,
        landTax: (Number(detailedBreakdown.landTax) || 0) + existingOwnedYear.propertyExpenses.landTax,
        otherPropertyCosts: (Number(detailedBreakdown.otherPropertyCosts) || 0) + existingOwnedYear.propertyExpenses.otherPropertyCosts,
        rentalTaxImpact: Math.max(0, taxDelta),
        taxes: totalTax,
        helpRepayments: annualCashflow.totalRepayment,
        surplus: Math.max(0, annualCashflow.annualSurplusAfterHelp),
        deficit: Math.max(0, -annualCashflow.annualSurplusAfterHelp)
      },
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
    yieldModel: normaliseYieldModel(property.yieldModel),
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
  safe.profile.earners = normalisedEarners.map((earner) => ({
    ...earner,
    careerBreakPlans: normaliseCareerBreakPlans(
      earner.careerBreakPlans?.length ? earner.careerBreakPlans : earner.careerBreakPlan,
      safe.profile.horizonYears,
      normalisedEarners.length > 1
    ),
    careerBreakPlan: normaliseCareerBreakPlan(earner.careerBreakPlan, safe.profile.horizonYears, normalisedEarners.length > 1)
  }))
  safe.profile.familyPlan = normaliseFamilyPlan(safe.profile, normalisedEarners.length)
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
  safe.existingProperty = normaliseExistingProperty(safe.existingProperty)
  safe.scenarioSelection = resolveScenarioSelection(safe.scenarioSelection)
  safe.scenarioSelection.selectedScenarioKeys = safe.scenarioSelection.selectedScenarioKeys.filter((strategyKey) =>
    isScenarioSupportedByRequest(safe, strategyKey)
  )
  return safe
}

function normaliseYieldModel(model) {
  if (!model || typeof model !== 'object') return null

  const actualYieldPoints = Array.isArray(model.actualYieldPoints)
    ? model.actualYieldPoints
        .map((point) => ({
          year: Math.round(Number(point?.year) || 0),
          value: Number(point?.value)
        }))
        .filter((point) => Number.isFinite(point.year) && Number.isFinite(point.value) && point.value > 0)
    : []

  if (!actualYieldPoints.length) return null

  return {
    sourceAreaKey: typeof model.sourceAreaKey === 'string' ? model.sourceAreaKey : null,
    sourceAreaLabel: typeof model.sourceAreaLabel === 'string' ? model.sourceAreaLabel : '',
    sourceAreaType: typeof model.sourceAreaType === 'string' ? model.sourceAreaType : null,
    currentYield: clamp(Number(model.currentYield) || actualYieldPoints[actualYieldPoints.length - 1]?.value || 0, 0, 0.12),
    longTermMean: clamp(Number(model.longTermMean) || averageSeries(actualYieldPoints.map((point) => point.value)) || 0, 0, 0.12),
    volatility: clamp(Number(model.volatility) || 0.0025, 0.0005, 0.03),
    meanReversionSpeed: clamp(Number(model.meanReversionSpeed) || 0.2, 0.05, 0.95),
    spreadMean: clamp(Number(model.spreadMean) || 0, -0.06, 0.06),
    spreadVolatility: clamp(Number(model.spreadVolatility) || Number(model.volatility) || 0.0025, 0.0005, 0.04),
    spreadMeanReversionSpeed: clamp(Number(model.spreadMeanReversionSpeed) || Number(model.meanReversionSpeed) || 0.2, 0.05, 0.95),
    benchmarkCurrentYield: clamp(Number(model.benchmarkCurrentYield ?? model.currentYield) || 0, 0, 0.12),
    benchmarkLongTermMean: clamp(Number(model.benchmarkLongTermMean ?? model.longTermMean ?? model.currentYield) || 0, 0, 0.12),
    benchmarkVolatility: clamp(Number(model.benchmarkVolatility) || Number(model.volatility) || 0.0025, 0.0005, 0.03),
    benchmarkMeanReversionSpeed: clamp(Number(model.benchmarkMeanReversionSpeed) || Number(model.meanReversionSpeed) || 0.2, 0.05, 0.95),
    nswSpreadMean: Number.isFinite(Number(model.nswSpreadMean)) ? Number(model.nswSpreadMean) : clamp(Number(model.spreadMean) || 0, -0.06, 0.06),
    historicalYieldRates: Array.isArray(model.historicalYieldRates)
      ? model.historicalYieldRates.map((value) => Number(value)).filter((value) => Number.isFinite(value) && value > 0 && value <= 0.12)
      : actualYieldPoints.map((point) => point.value),
    actualYieldPoints
  }
}

function isScenarioSupportedByRequest(request, strategyKey) {
  if (strategyKey === 'buyHouseInvestmentProperty') {
    return hasUsableInvestmentYield(request?.propertyConfig?.house)
  }
  if (strategyKey === 'buyApartmentInvestmentProperty') {
    return hasUsableInvestmentYield(request?.propertyConfig?.apartment)
  }
  return true
}

function hasUsableInvestmentYield(property) {
  if (property?.yieldModel?.actualYieldPoints?.length) return true
  return Number(property?.rentYield) > 0
}

function averageSeries(values) {
  if (!Array.isArray(values) || !values.length) return null
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function createSingleAssetPortfolioConfig(portfolioConfig, assetKey) {
  return {
    ...portfolioConfig,
    asxWeight: assetKey === 'asx' ? 1 : 0,
    qqqWeight: assetKey === 'qqq' ? 1 : 0,
    vgsWeight: assetKey === 'vgs' ? 1 : 0,
    vgeWeight: assetKey === 'vge' ? 1 : 0,
    dbpWeight: assetKey === 'dbp' ? 1 : 0,
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
  const snapshotPathsByStrategy = Object.fromEntries(
    selectedScenarioKeys.map(strategyKey => [strategyKey, []])
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
      stockVgs: simulateRentInvestPath({
        ...request,
        portfolioConfig: createSingleAssetPortfolioConfig(request.portfolioConfig, 'vgs')
      }, marketPath),
      stockVge: simulateRentInvestPath({
        ...request,
        portfolioConfig: createSingleAssetPortfolioConfig(request.portfolioConfig, 'vge')
      }, marketPath),
      stockDbp: simulateRentInvestPath({
        ...request,
        portfolioConfig: createSingleAssetPortfolioConfig(request.portfolioConfig, 'dbp')
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
      snapshotPathsByStrategy[strategyKey].push(strategySnapshots[strategyKey])
      strategySnapshots[strategyKey].forEach((snapshot, yearIndex) => {
        addMetrics(bucketsByStrategy[strategyKey][yearIndex], snapshot)
      })
    })
  }

  const strategies = Object.fromEntries(
    selectedScenarioKeys.map(strategyKey => [strategyKey, aggregateStrategy(strategyKey, bucketsByStrategy[strategyKey], strategyMeta)])
  )
  attachRepresentativeWealthPaths(strategies, snapshotPathsByStrategy)
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
