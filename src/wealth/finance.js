export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max)
}

export function roundCurrency(value) {
  return Math.round((Number(value) || 0) * 100) / 100
}

export function createMulberry32(seed) {
  let t = seed >>> 0
  return function random() {
    t += 0x6d2b79f5
    let r = Math.imul(t ^ (t >>> 15), t | 1)
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61)
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
}

export function sampleNormal(random, mean = 0, deviation = 1) {
  const u1 = Math.max(random(), Number.EPSILON)
  const u2 = Math.max(random(), Number.EPSILON)
  const mag = Math.sqrt(-2 * Math.log(u1))
  const z0 = mag * Math.cos(2 * Math.PI * u2)
  return mean + z0 * deviation
}

export function percentile(values, pct) {
  if (!values.length) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const idx = (sorted.length - 1) * pct
  const lower = Math.floor(idx)
  const upper = Math.ceil(idx)
  if (lower === upper) return sorted[lower]
  const weight = idx - lower
  return sorted[lower] * (1 - weight) + sorted[upper] * weight
}

export function percentileSummary(values) {
  return {
    p10: percentile(values, 0.1),
    p50: percentile(values, 0.5),
    p90: percentile(values, 0.9)
  }
}

export function formatShortCurrency(value) {
  const abs = Math.abs(value)
  if (abs >= 1_000_000) return `${value < 0 ? '-' : ''}$${(abs / 1_000_000).toFixed(abs >= 10_000_000 ? 0 : 1)}m`
  if (abs >= 1_000) return `${value < 0 ? '-' : ''}$${(abs / 1_000).toFixed(abs >= 100_000 ? 0 : 1)}k`
  return `${value < 0 ? '-' : ''}$${Math.round(abs)}`
}

export const FIRST_HOME_BUYER_STAMP_DUTY_FREE_LIMIT = 800_000
export const FIRST_HOME_BUYER_STAMP_DUTY_PHASE_OUT_LIMIT = 1_000_000
export const FIRST_HOME_BUYER_LOW_DEPOSIT_LIMIT = 1_500_000
export const APRA_SERVICEABILITY_BUFFER = 0.03
export const MIN_SERVICEABILITY_RATE = 0.08
export const SERVICEABILITY_RENT_CREDIT_PCT = 0.8
export const DEFAULT_SERVICEABILITY_ANNUAL_LIVING_COST = 640 * 52
export const NSW_TRANSFER_DUTY_PREMIUM_THRESHOLD = 3_721_000
export const NSW_LAND_TAX_THRESHOLD = 1_075_000
export const NSW_LAND_TAX_PREMIUM_THRESHOLD = 6_571_000
export const HELP_INDEXATION_RATE = 0.03

const helpRepaymentBands202526 = [
  { minIncomeExclusive: 0, maxIncomeInclusive: 67_000, type: 'none' },
  { minIncomeExclusive: 67_000, maxIncomeInclusive: 125_000, type: 'marginal', baseRepayment: 0, threshold: 67_000, rate: 0.15 },
  { minIncomeExclusive: 125_000, maxIncomeInclusive: 179_285, type: 'marginal', baseRepayment: 8_700, threshold: 125_000, rate: 0.17 },
  { minIncomeExclusive: 179_285, maxIncomeInclusive: Number.POSITIVE_INFINITY, type: 'flat', rate: 0.1 }
]

const propertyCostFormulae = {
  house: {
    councilRates: { base: 720, slope: 0.00202 },
    waterRates: { base: 760, slope: 0.00066 },
    insurance: { base: 1150, slope: 0.00138 },
    maintenance: { base: 900, slope: 0.00163 },
    strata: { base: 0, slope: 0 },
    legalFees: { base: 1550, slope: 0.00107 },
    buyersCosts: { base: 850, slope: 0.00158 },
    borrowingExpensesTotal: { base: 950, slope: 0.00087 },
    otherDeductibleExpensesAnnual: { base: 320, slope: 0.00059 },
    landValueShare: 0.62
  },
  apartment: {
    councilRates: { base: 700, slope: 0.00141 },
    waterRates: { base: 620, slope: 0.00046 },
    insurance: { base: 420, slope: 0.00075 },
    maintenance: { base: 450, slope: 0.00106 },
    strata: { base: 600, slope: 0.00592 },
    legalFees: { base: 1550, slope: 0.0012 },
    buyersCosts: { base: 1000, slope: 0.00155 },
    borrowingExpensesTotal: { base: 950, slope: 0.00092 },
    otherDeductibleExpensesAnnual: { base: 260, slope: 0.00069 },
    landValueShare: 0.2
  }
}

const residentTaxBandsByYear = {
  '2025-26': [
    { threshold: 0, baseTax: 0, rate: 0 },
    { threshold: 18_200, baseTax: 0, rate: 0.16 },
    { threshold: 45_000, baseTax: 4_288, rate: 0.30 },
    { threshold: 135_000, baseTax: 31_288, rate: 0.37 },
    { threshold: 190_000, baseTax: 51_638, rate: 0.45 }
  ],
  '2026-27': [
    { threshold: 0, baseTax: 0, rate: 0 },
    { threshold: 18_200, baseTax: 0, rate: 0.15 },
    { threshold: 45_000, baseTax: 4_020, rate: 0.30 },
    { threshold: 135_000, baseTax: 31_020, rate: 0.37 },
    { threshold: 190_000, baseTax: 51_370, rate: 0.45 }
  ]
}

const defaultTaxYear = '2026-27'
const medicareLevyRate = 0.02
const companyTaxRate = 0.3

function getResidentTaxBands(taxYear = defaultTaxYear) {
  return residentTaxBandsByYear[taxYear] || residentTaxBandsByYear[defaultTaxYear]
}

export function getAustralianTaxBreakdown(income, taxYear = defaultTaxYear) {
  const taxableIncome = Math.max(0, Number(income) || 0)
  const taxBands = getResidentTaxBands(taxYear)
  let selectedBand = taxBands[0]

  for (const band of taxBands) {
    if (taxableIncome >= band.threshold) selectedBand = band
  }

  const incomeTax = selectedBand.baseTax + Math.max(0, taxableIncome - selectedBand.threshold) * selectedBand.rate
  const medicareLevy = taxableIncome * medicareLevyRate
  const totalTaxBeforeOffsets = incomeTax + medicareLevy
  const marginalRate = taxableIncome <= 0 ? 0 : clamp(selectedBand.rate + medicareLevyRate, 0, 0.47)

  return {
    taxYear,
    taxableIncome,
    incomeTax,
    medicareLevy,
    totalTaxBeforeOffsets,
    totalTax: totalTaxBeforeOffsets,
    marginalRate
  }
}

export function calculateAustralianAnnualTax({
  taxYear = defaultTaxYear,
  salaryIncome = 0,
  taxablePortfolioIncome = 0,
  taxableRentalIncome = 0,
  frankingCredits = 0
} = {}) {
  const safeSalaryIncome = Math.max(0, Number(salaryIncome) || 0)
  const safePortfolioIncome = Number(taxablePortfolioIncome) || 0
  const safeRentalIncome = Number(taxableRentalIncome) || 0
  const safeFrankingCredits = Math.max(0, Number(frankingCredits) || 0)
  const taxableIncome = Math.max(0, safeSalaryIncome + safePortfolioIncome + safeRentalIncome)
  const salaryOnlyTax = getAustralianTaxBreakdown(safeSalaryIncome, taxYear)
  const taxBeforeCredits = getAustralianTaxBreakdown(taxableIncome, taxYear)
  const totalTax = taxBeforeCredits.totalTaxBeforeOffsets - safeFrankingCredits

  return {
    taxYear,
    taxableIncome,
    salaryOnlyTax: salaryOnlyTax.totalTax,
    incomeTax: taxBeforeCredits.incomeTax,
    medicareLevy: taxBeforeCredits.medicareLevy,
    frankingCredits: safeFrankingCredits,
    totalTax,
    deltaVsSalaryOnly: totalTax - salaryOnlyTax.totalTax
  }
}

export function calculateIncomeTaxDelta(baseTaxableIncome, incomeAdjustment, taxYear = defaultTaxYear) {
  const annualTax = calculateAustralianAnnualTax({
    taxYear,
    salaryIncome: baseTaxableIncome,
    taxableRentalIncome: incomeAdjustment
  })
  return annualTax.deltaVsSalaryOnly
}

export function estimateCapitalGainsTax({
  taxYear = defaultTaxYear,
  salaryIncome = 0,
  grossCapitalGain = 0,
  discountPct = 0.5,
  taxableCapitalGain
} = {}) {
  const safeGrossCapitalGain = Number(grossCapitalGain) || 0
  const resolvedTaxableCapitalGain =
    taxableCapitalGain === undefined
      ? safeGrossCapitalGain * (1 - clamp(Number(discountPct) || 0, 0, 1))
      : Math.max(0, Number(taxableCapitalGain) || 0)

  if (safeGrossCapitalGain <= 0 || resolvedTaxableCapitalGain <= 0) {
    return {
      grossCapitalGain: 0,
      taxableCapitalGain: 0,
      capitalGainsTax: 0
    }
  }

  const taxWithGain = getAustralianTaxBreakdown(Math.max(0, Number(salaryIncome) || 0) + resolvedTaxableCapitalGain, taxYear)
  const salaryOnlyTax = getAustralianTaxBreakdown(salaryIncome, taxYear)

  return {
    grossCapitalGain: safeGrossCapitalGain,
    taxableCapitalGain: resolvedTaxableCapitalGain,
    capitalGainsTax: Math.max(0, taxWithGain.totalTax - salaryOnlyTax.totalTax)
  }
}

export function normalisePortfolioWeights(portfolioConfig) {
  const rawWeights = {
    asxWeight: Math.max(0, Number(portfolioConfig.asxWeight) || 0),
    qqqWeight: Math.max(0, Number(portfolioConfig.qqqWeight) || 0),
    bondWeight: Math.max(0, Number(portfolioConfig.bondWeight) || 0),
    cashWeight: Math.max(0, Number(portfolioConfig.cashWeight) || 0),
    bitcoinWeight: Math.max(0, Number(portfolioConfig.bitcoinWeight) || 0)
  }
  const totalWeight = rawWeights.asxWeight + rawWeights.qqqWeight + rawWeights.bondWeight + rawWeights.cashWeight + rawWeights.bitcoinWeight

  if (totalWeight <= 0) {
    return {
      asxWeight: 0.2,
      qqqWeight: 0.7,
      bondWeight: 0.1,
      cashWeight: 0,
      bitcoinWeight: 0
    }
  }

  return {
    asxWeight: rawWeights.asxWeight / totalWeight,
    qqqWeight: rawWeights.qqqWeight / totalWeight,
    bondWeight: rawWeights.bondWeight / totalWeight,
    cashWeight: rawWeights.cashWeight / totalWeight,
    bitcoinWeight: rawWeights.bitcoinWeight / totalWeight
  }
}

export function samplePortfolioSleeveReturns(random, sampleAssetYear) {
  const sampler = typeof sampleAssetYear === 'function' ? sampleAssetYear : (() => 0)
  const sharedSample = typeof sampler.sampleAll === 'function' ? sampler.sampleAll(random) : null
  const asxReturn = clamp(sharedSample?.asxReturn ?? sampler('asx200', random), -0.75, 0.75)
  const qqqReturn = clamp(sharedSample?.qqqReturn ?? sampler('qqq', random), -0.85, 0.95)
  const bondReturn = clamp(sharedSample?.bondReturn ?? sampler('bonds', random), -0.25, 0.25)
  const cashReturn = clamp(sharedSample?.cashReturn ?? sampler('cash', random), -0.02, 0.12)
  const bitcoinReturn = clamp(sharedSample?.bitcoinReturn ?? sampler('bitcoin', random), -0.95, 2.5)

  return {
    asxReturn,
    qqqReturn,
    bondReturn,
    cashReturn,
    bitcoinReturn
  }
}

export function buildPortfolioYearFromSleeves(portfolioConfig, sleeveReturns) {
  const weights = normalisePortfolioWeights(portfolioConfig)
  const asxReturn = clamp(Number(sleeveReturns?.asxReturn) || 0, -0.75, 0.75)
  const qqqReturn = clamp(Number(sleeveReturns?.qqqReturn) || 0, -0.85, 0.95)
  const bondReturn = clamp(Number(sleeveReturns?.bondReturn) || 0, -0.25, 0.25)
  const cashReturn = clamp(Number(sleeveReturns?.cashReturn) || 0, -0.02, 0.12)
  const bitcoinReturn = clamp(Number(sleeveReturns?.bitcoinReturn) || 0, -0.95, 2.5)

  const totalReturn =
    weights.asxWeight * asxReturn +
    weights.qqqWeight * qqqReturn +
    weights.bondWeight * bondReturn +
    weights.cashWeight * cashReturn +
    weights.bitcoinWeight * bitcoinReturn

  const asxDividendIncome = weights.asxWeight * (portfolioConfig.asxDividendYield || 0)
  const qqqDividendIncome = weights.qqqWeight * (portfolioConfig.qqqDividendYield || 0)
  const bondIncome = weights.bondWeight * (portfolioConfig.bondIncomeYield || 0)
  const cashIncome = weights.cashWeight * (portfolioConfig.cashReturnMean || 0)
  const distributionYield = asxDividendIncome + qqqDividendIncome + bondIncome + cashIncome

  return {
    weights,
    totalReturn,
    distributionYield
  }
}

export function simulatePortfolioYear(portfolioConfig, random, sampleAssetYear) {
  return buildPortfolioYearFromSleeves(
    portfolioConfig,
    samplePortfolioSleeveReturns(random, sampleAssetYear)
  )
}

export function estimatePortfolioTaxableIncome(portfolioConfig, portfolioBalance) {
  const safeBalance = Math.max(0, Number(portfolioBalance) || 0)
  const weights = normalisePortfolioWeights(portfolioConfig)
  const asxDistribution = safeBalance * weights.asxWeight * Math.max(0, Number(portfolioConfig.asxDividendYield) || 0)
  const qqqDistribution = safeBalance * weights.qqqWeight * Math.max(0, Number(portfolioConfig.qqqDividendYield) || 0)
  const bondIncome = safeBalance * weights.bondWeight * Math.max(0, Number(portfolioConfig.bondIncomeYield) || 0)
  const cashInterest = safeBalance * weights.cashWeight * Math.max(0, Number(portfolioConfig.cashReturnMean) || 0)
  const frankedDistribution = asxDistribution * clamp(Number(portfolioConfig.asxFrankingPct) || 0, 0, 1)
  const frankingCredits = frankedDistribution * (companyTaxRate / (1 - companyTaxRate))
  const cashIncome = asxDistribution + qqqDistribution + bondIncome + cashInterest
  const taxableIncome = cashIncome + frankingCredits

  return {
    weights,
    cashIncome,
    taxableIncome,
    frankingCredits,
    asxDistribution,
    qqqDistribution,
    bondIncome,
    cashInterest
  }
}

export function estimateLmi(purchasePrice, depositPct, firstHomeBuyerEligible = false) {
  const safePrice = Math.max(0, Number(purchasePrice) || 0)
  const safeDepositPct = clamp(Number(depositPct) || 0, 0.05, 1)
  if (qualifiesForFirstHomeBuyerDepositScheme(safePrice, firstHomeBuyerEligible)) return 0
  const lvr = clamp(1 - safeDepositPct, 0, 0.95)
  if (lvr <= 0.8) return 0
  const baseLoan = safePrice * lvr
  return roundCurrency(baseLoan * getLmiRate(lvr))
}

export function getEffectiveOwnerDepositPct(propertyConfig) {
  const configuredDepositPct = clamp(
    Number(propertyConfig.ownerDepositPct ?? propertyConfig.depositPct) || 0,
    0.05,
    0.95
  )
  return configuredDepositPct
}

export function getEffectiveInvestmentDepositPct(propertyConfig) {
  return clamp(Number(propertyConfig.depositPct) || 0, 0.05, 0.95)
}

export function getPropertyInterestRate(propertyConfig, occupancyMode = 'owner') {
  const legacyRate = clamp(Number(propertyConfig.interestRate) || 0, 0, 0.2)
  const ownerRate = clamp(Number(propertyConfig.ownerInterestRate) || legacyRate, 0, 0.2)
  const investmentRate = clamp(Number(propertyConfig.investmentInterestRate) || legacyRate, 0, 0.2)
  return occupancyMode === 'investment' ? investmentRate : ownerRate
}

export function getPropertyLongRunInterestRate(propertyConfig, occupancyMode = 'owner') {
  const legacyRate = clamp(Number(propertyConfig.longRunInterestRate) || 0, 0, 0.2)
  const ownerRate = clamp(Number(propertyConfig.ownerLongRunInterestRate) || legacyRate, 0, 0.2)
  const investmentRate = clamp(Number(propertyConfig.investmentLongRunInterestRate) || legacyRate, 0, 0.2)
  return occupancyMode === 'investment' ? investmentRate : ownerRate
}

export function calculateAnnualMortgagePayment(principal, annualRate, yearsRemaining) {
  const safePrincipal = Math.max(0, Number(principal) || 0)
  const safeRate = Math.max(0, Number(annualRate) || 0)
  const safeYears = Math.max(1, Number(yearsRemaining) || 1)
  if (safePrincipal <= 0) return 0
  if (safeRate <= 0) return safePrincipal / safeYears
  const r = safeRate
  const pow = Math.pow(1 + r, safeYears)
  return safePrincipal * ((r * pow) / (pow - 1))
}

export function amortizeOneYear(balance, annualRate, yearsRemaining) {
  const startingBalance = Math.max(0, Number(balance) || 0)
  if (startingBalance <= 0) {
    return {
      payment: 0,
      interestPaid: 0,
      principalPaid: 0,
      endingBalance: 0
    }
  }
  const payment = calculateAnnualMortgagePayment(startingBalance, annualRate, yearsRemaining)
  const interestPaid = startingBalance * Math.max(0, annualRate)
  const principalPaid = Math.max(0, payment - interestPaid)
  const endingBalance = Math.max(0, startingBalance - principalPaid)
  return {
    payment,
    interestPaid,
    principalPaid: startingBalance - endingBalance,
    endingBalance
  }
}

export function qualifiesForFirstHomeBuyerDepositScheme(purchasePrice, firstHomeBuyerEligible) {
  const safePrice = Math.max(0, Number(purchasePrice) || 0)
  return Boolean(firstHomeBuyerEligible) && safePrice > 0 && safePrice <= FIRST_HOME_BUYER_LOW_DEPOSIT_LIMIT
}

export function getFirstHomeBuyerStampDutyReductionPct(purchasePrice, firstHomeBuyerEligible) {
  const safePrice = Math.max(0, Number(purchasePrice) || 0)
  if (!firstHomeBuyerEligible || safePrice <= 0) return 0
  if (safePrice <= FIRST_HOME_BUYER_STAMP_DUTY_FREE_LIMIT) return 1
  if (safePrice >= FIRST_HOME_BUYER_STAMP_DUTY_PHASE_OUT_LIMIT) return 0
  return 1 - ((safePrice - FIRST_HOME_BUYER_STAMP_DUTY_FREE_LIMIT) / (FIRST_HOME_BUYER_STAMP_DUTY_PHASE_OUT_LIMIT - FIRST_HOME_BUYER_STAMP_DUTY_FREE_LIMIT))
}

export function getLmiRate(lvr) {
  const safeLvr = clamp(Number(lvr) || 0, 0, 0.95)
  if (safeLvr <= 0.8) return 0
  if (safeLvr <= 0.85) return ((safeLvr - 0.8) / 0.05) * 0.015
  if (safeLvr <= 0.9) return 0.015 + ((safeLvr - 0.85) / 0.05) * 0.015
  return 0.03 + ((safeLvr - 0.9) / 0.05) * 0.02
}

export function applyFirstHomeBenefits(propertyConfig, firstHomeBuyerEligible, purchasePrice) {
  const stampDuty = Math.max(0, Number(propertyConfig.stampDuty) || 0)
  const reductionPct = getFirstHomeBuyerStampDutyReductionPct(purchasePrice, firstHomeBuyerEligible)
  return {
    adjustedStampDuty: roundCurrency(stampDuty * (1 - reductionPct))
  }
}

function getPropertyCostFormula(propertyType, key) {
  const resolvedType = propertyType === 'apartment' ? 'apartment' : 'house'
  return propertyCostFormulae[resolvedType][key]
}

function estimateAffineCost(formula, purchasePrice) {
  const safePrice = Math.max(0, Number(purchasePrice) || 0)
  if (!formula) return 0
  return roundCurrency(formula.base + safePrice * formula.slope)
}

function scaleValueFromBaseline(currentValue, previousBaseline, nextBaseline) {
  const safeCurrentValue = Math.max(0, Number(currentValue) || 0)
  const safePreviousBaseline = Math.max(0, Number(previousBaseline) || 0)
  const safeNextBaseline = Math.max(0, Number(nextBaseline) || 0)

  if (safeCurrentValue <= 0) return 0
  if (safePreviousBaseline > 0 && safeNextBaseline > 0) {
    return roundCurrency((safeCurrentValue / safePreviousBaseline) * safeNextBaseline)
  }
  return roundCurrency(Math.max(0, safeCurrentValue + (safeNextBaseline - safePreviousBaseline)))
}

export function estimateNswTransferDuty(purchasePrice) {
  const safePrice = Math.max(0, Number(purchasePrice) || 0)

  if (safePrice <= 17_000) return roundCurrency(safePrice * 0.0125)
  if (safePrice <= 37_000) return roundCurrency(212 + (safePrice - 17_000) * 0.015)
  if (safePrice <= 99_000) return roundCurrency(512 + (safePrice - 37_000) * 0.0175)
  if (safePrice <= 372_000) return roundCurrency(1597 + (safePrice - 99_000) * 0.035)
  if (safePrice <= 1_240_000) return roundCurrency(11_152 + (safePrice - 372_000) * 0.045)
  if (safePrice <= NSW_TRANSFER_DUTY_PREMIUM_THRESHOLD) {
    return roundCurrency(50_212 + (safePrice - 1_240_000) * 0.055)
  }
  return roundCurrency(186_667 + (safePrice - NSW_TRANSFER_DUTY_PREMIUM_THRESHOLD) * 0.07)
}

export function estimateNswAnnualLandTax(propertyType, purchasePrice) {
  const safePrice = Math.max(0, Number(purchasePrice) || 0)
  const landValueShare = propertyCostFormulae[propertyType === 'apartment' ? 'apartment' : 'house'].landValueShare
  const estimatedLandValue = safePrice * landValueShare

  if (estimatedLandValue <= NSW_LAND_TAX_THRESHOLD) return 0
  if (estimatedLandValue <= NSW_LAND_TAX_PREMIUM_THRESHOLD) {
    return roundCurrency(100 + (estimatedLandValue - NSW_LAND_TAX_THRESHOLD) * 0.016)
  }

  const premiumBaseTax = 100 + (NSW_LAND_TAX_PREMIUM_THRESHOLD - NSW_LAND_TAX_THRESHOLD) * 0.016
  return roundCurrency(premiumBaseTax + (estimatedLandValue - NSW_LAND_TAX_PREMIUM_THRESHOLD) * 0.02)
}

export function estimatePropertyCostFromPrice(propertyType, key, purchasePrice) {
  if (key === 'landTax') return estimateNswAnnualLandTax(propertyType, purchasePrice)
  return estimateAffineCost(getPropertyCostFormula(propertyType, key), purchasePrice)
}

export function estimateGenericPurchaseCosts(purchasePrice, propertyType = 'house') {
  return {
    stampDuty: estimateNswTransferDuty(purchasePrice),
    legalFees: estimatePropertyCostFromPrice(propertyType, 'legalFees', purchasePrice),
    buyersCosts: estimatePropertyCostFromPrice(propertyType, 'buyersCosts', purchasePrice)
  }
}

export function scalePurchaseCostsWithPrice(purchaseCosts, previousPurchasePrice, nextPurchasePrice, propertyType = 'house') {
  const safeNextPurchasePrice = Math.max(0, Number(nextPurchasePrice) || 0)
  if (safeNextPurchasePrice <= 0) {
    return {
      ...(purchaseCosts || {}),
      stampDuty: 0,
      legalFees: 0,
      buyersCosts: 0
    }
  }

  const currentCosts = {
    stampDuty: Math.max(0, Number(purchaseCosts?.stampDuty) || 0),
    legalFees: Math.max(0, Number(purchaseCosts?.legalFees) || 0),
    buyersCosts: Math.max(0, Number(purchaseCosts?.buyersCosts) || 0)
  }
  const previousEstimate = estimateGenericPurchaseCosts(previousPurchasePrice, propertyType)
  const nextEstimate = estimateGenericPurchaseCosts(safeNextPurchasePrice, propertyType)

  return {
    ...(purchaseCosts || {}),
    stampDuty: scaleValueFromBaseline(currentCosts.stampDuty, previousEstimate.stampDuty, nextEstimate.stampDuty),
    legalFees: scaleValueFromBaseline(currentCosts.legalFees, previousEstimate.legalFees, nextEstimate.legalFees),
    buyersCosts: scaleValueFromBaseline(currentCosts.buyersCosts, previousEstimate.buyersCosts, nextEstimate.buyersCosts)
  }
}

export function calculatePurchaseCosts(propertyConfig, firstHomeBuyerEligible, purchasePrice) {
  const fhb = applyFirstHomeBenefits(propertyConfig, firstHomeBuyerEligible, purchasePrice)
  const legalFees = Math.max(0, Number(propertyConfig.legalFees) || 0)
  const buyersCosts = Math.max(0, Number(propertyConfig.buyersCosts) || 0)
  return {
    stampDuty: fhb.adjustedStampDuty,
    legalFees,
    buyersCosts,
    total: roundCurrency(fhb.adjustedStampDuty + legalFees + buyersCosts)
  }
}

export function getOwnerHoldingCosts(propertyConfig) {
  return (
    Math.max(0, Number(propertyConfig.councilRates) || 0) +
    Math.max(0, Number(propertyConfig.waterRates) || 0) +
    Math.max(0, Number(propertyConfig.insurance) || 0) +
    Math.max(0, Number(propertyConfig.maintenance) || 0) +
    Math.max(0, Number(propertyConfig.strata) || 0)
  )
}

export function calculateBorrowingExpenseDeduction(borrowingExpensesTotal, mortgageYears, yearsOwned) {
  const total = Math.max(0, Number(borrowingExpensesTotal) || 0)
  if (total <= 0) return 0
  if (total <= 100) return yearsOwned <= 0 ? total : 0

  const deductionYears = Math.max(1, Math.min(5, Math.round(Number(mortgageYears) || 0) || 5))
  if (yearsOwned >= deductionYears) return 0
  return total / deductionYears
}

export function calculateInvestmentPropertyTaxPosition({
  propertyConfig,
  propertyValue,
  vacancyRate,
  interestPaid,
  yearsOwned
}) {
  const safePropertyValue = Math.max(0, Number(propertyValue) || 0)
  const rentReceived =
    safePropertyValue *
    Math.max(0, Number(propertyConfig.rentYield) || 0) *
    (1 - clamp(Number(vacancyRate) || 0, 0, 1))
  const managementFee = rentReceived * clamp(Number(propertyConfig.propertyManagementPct) || 0, 0, 1)
  const councilRates = Math.max(0, Number(propertyConfig.councilRates) || 0)
  const waterRates = Math.max(0, Number(propertyConfig.waterRates) || 0)
  const insurance = Math.max(0, Number(propertyConfig.insurance) || 0)
  const maintenance = Math.max(0, Number(propertyConfig.maintenance) || 0)
  const strata = Math.max(0, Number(propertyConfig.strata) || 0)
  const landTax = Math.max(0, Number(propertyConfig.landTax) || 0)
  const otherDeductibleExpensesAnnual = Math.max(0, Number(propertyConfig.otherDeductibleExpensesAnnual) || 0)
  const borrowingExpenseDeduction = calculateBorrowingExpenseDeduction(
    propertyConfig.borrowingExpensesTotal,
    propertyConfig.mortgageYears,
    yearsOwned
  )
  const cashOperatingExpenses =
    managementFee +
    councilRates +
    waterRates +
    insurance +
    maintenance +
    strata +
    landTax +
    otherDeductibleExpensesAnnual
  const taxableRentalIncome =
    rentReceived -
    managementFee -
    councilRates -
    waterRates -
    insurance -
    maintenance -
    strata -
    landTax -
    Math.max(0, Number(interestPaid) || 0) -
    borrowingExpenseDeduction -
    otherDeductibleExpensesAnnual

  return {
    rentReceived,
    managementFee,
    borrowingExpenseDeduction,
    cashOperatingExpenses,
    taxableRentalIncome
  }
}

export function getServiceabilityAssessmentRate(productRate) {
  return Math.max(
    clamp(Number(productRate) || 0, 0, 0.2) + APRA_SERVICEABILITY_BUFFER,
    MIN_SERVICEABILITY_RATE
  )
}

export function calculateAnnualServiceabilityLivingCosts(weeklyNonHousingLivingCosts) {
  const annualLivingCosts = Math.max(0, Number(weeklyNonHousingLivingCosts) || 0) * 52
  return Math.max(annualLivingCosts, DEFAULT_SERVICEABILITY_ANNUAL_LIVING_COST)
}

export function calculateHelpCompulsoryRepayment(annualIncome = 0) {
  const safeAnnualIncome = Math.max(0, Number(annualIncome) || 0)
  const band = helpRepaymentBands202526.find(candidate =>
    safeAnnualIncome > candidate.minIncomeExclusive && safeAnnualIncome <= candidate.maxIncomeInclusive
  ) || helpRepaymentBands202526[helpRepaymentBands202526.length - 1]

  if (band.type === 'none') return 0
  if (band.type === 'flat') return safeAnnualIncome * band.rate
  return band.baseRepayment + Math.max(0, safeAnnualIncome - band.threshold) * band.rate
}

export function rollForwardHelpDebt(openingBalance = 0, annualIncome = 0) {
  const safeOpeningBalance = Math.max(0, Number(openingBalance) || 0)
  if (safeOpeningBalance <= 0) {
    return {
      openingBalance: 0,
      indexedBalance: 0,
      scheduledRepayment: 0,
      actualRepayment: 0,
      closingBalance: 0
    }
  }

  const indexedBalance = safeOpeningBalance * (1 + HELP_INDEXATION_RATE)
  const scheduledRepayment = Math.max(0, calculateHelpCompulsoryRepayment(annualIncome))
  const actualRepayment = Math.min(indexedBalance, scheduledRepayment)

  return {
    openingBalance: safeOpeningBalance,
    indexedBalance,
    scheduledRepayment,
    actualRepayment,
    closingBalance: Math.max(0, indexedBalance - actualRepayment)
  }
}

export function assessPropertyPurchaseServiceability({
  taxYear = defaultTaxYear,
  annualIncome = 0,
  helpDebtBalance = 0,
  annualIncomeByBorrower = [],
  helpDebtBalances = [],
  weeklyNonHousingLivingCosts = 0,
  occupancyMode = 'owner',
  propertyConfig,
  propertyValue,
  mortgageYears,
  openingLoanBalance,
  personalHousingCostAnnual = 0,
  vacancyRate = 0
} = {}) {
  const safeAnnualIncome = Math.max(0, Number(annualIncome) || 0)
  const borrowerIncomes = Array.isArray(annualIncomeByBorrower) && annualIncomeByBorrower.length
    ? annualIncomeByBorrower.map(value => Math.max(0, Number(value) || 0))
    : [safeAnnualIncome]
  const borrowerHelpBalances = Array.isArray(helpDebtBalances) && helpDebtBalances.length
    ? helpDebtBalances.map(value => Math.max(0, Number(value) || 0))
    : [Math.max(0, Number(helpDebtBalance) || 0)]
  const safePropertyValue = Math.max(0, Number(propertyValue) || 0)
  const safeMortgageYears = Math.max(1, Number(mortgageYears) || Number(propertyConfig?.mortgageYears) || 1)
  const safeOpeningLoanBalance = Math.max(0, Number(openingLoanBalance) || 0)
  const annualLivingCosts = calculateAnnualServiceabilityLivingCosts(weeklyNonHousingLivingCosts)
  const salaryOnlyTax = borrowerIncomes.reduce((sum, borrowerIncome) => sum + calculateAustralianAnnualTax({
    taxYear,
    salaryIncome: borrowerIncome
  }).totalTax, 0)
  const helpRepayment = borrowerIncomes.reduce((sum, borrowerIncome, index) =>
    sum + rollForwardHelpDebt(borrowerHelpBalances[index] || 0, borrowerIncome).actualRepayment
  , 0)
  const annualDisposableAfterLiving = safeAnnualIncome - salaryOnlyTax - annualLivingCosts - helpRepayment
  const productRate = getPropertyInterestRate(propertyConfig, occupancyMode)
  const assessedRate = getServiceabilityAssessmentRate(productRate)
  const annualMortgagePayment = calculateAnnualMortgagePayment(safeOpeningLoanBalance, assessedRate, safeMortgageYears)

  if (occupancyMode === 'owner') {
    const annualCarry = annualMortgagePayment + getOwnerHoldingCosts(propertyConfig)
    return {
      annualLivingCosts,
      annualDisposableAfterLiving,
      helpRepayment,
      assessedRate,
      annualMortgagePayment,
      annualCarry,
      taxDelta: 0,
      affordable: annualDisposableAfterLiving >= annualCarry
    }
  }

  const rentalTaxPosition = calculateInvestmentPropertyTaxPosition({
    propertyConfig,
    propertyValue: safePropertyValue,
    vacancyRate,
    interestPaid: safeOpeningLoanBalance * productRate,
    yearsOwned: 0
  })
  const taxPosition = calculateAustralianAnnualTax({
    taxYear,
    salaryIncome: safeAnnualIncome,
    taxableRentalIncome: rentalTaxPosition.taxableRentalIncome
  })
  const rentCredit = rentalTaxPosition.rentReceived * SERVICEABILITY_RENT_CREDIT_PCT
  const annualCarry =
    Math.max(0, Number(personalHousingCostAnnual) || 0) +
    annualMortgagePayment +
    rentalTaxPosition.cashOperatingExpenses -
    rentCredit +
    taxPosition.deltaVsSalaryOnly

  return {
    annualLivingCosts,
    annualDisposableAfterLiving,
    helpRepayment,
    assessedRate,
    annualMortgagePayment,
    annualCarry,
    taxDelta: taxPosition.deltaVsSalaryOnly,
    rentCredit,
    rentalTaxPosition,
    affordable: annualDisposableAfterLiving >= annualCarry
  }
}

export function estimatePropertyBorrowingPower({
  taxYear = defaultTaxYear,
  annualIncome = 0,
  helpDebtBalance = 0,
  annualIncomeByBorrower = [],
  helpDebtBalances = [],
  weeklyNonHousingLivingCosts = 0,
  occupancyMode = 'owner',
  propertyConfig,
  propertyValue,
  mortgageYears,
  personalHousingCostAnnual = 0,
  vacancyRate = 0
} = {}) {
  const safeAnnualIncome = Math.max(0, Number(annualIncome) || 0)
  const borrowerIncomes = Array.isArray(annualIncomeByBorrower) && annualIncomeByBorrower.length
    ? annualIncomeByBorrower.map(value => Math.max(0, Number(value) || 0))
    : [safeAnnualIncome]
  const borrowerHelpBalances = Array.isArray(helpDebtBalances) && helpDebtBalances.length
    ? helpDebtBalances.map(value => Math.max(0, Number(value) || 0))
    : [Math.max(0, Number(helpDebtBalance) || 0)]
  const safePropertyValue = Math.max(0, Number(propertyValue) || 0)
  const safeMortgageYears = Math.max(1, Number(mortgageYears) || Number(propertyConfig?.mortgageYears) || 1)
  const annualLivingCosts = calculateAnnualServiceabilityLivingCosts(weeklyNonHousingLivingCosts)
  const salaryOnlyTax = borrowerIncomes.reduce((sum, borrowerIncome) => sum + calculateAustralianAnnualTax({
    taxYear,
    salaryIncome: borrowerIncome
  }).totalTax, 0)
  const helpRepayment = borrowerIncomes.reduce((sum, borrowerIncome, index) =>
    sum + rollForwardHelpDebt(borrowerHelpBalances[index] || 0, borrowerIncome).actualRepayment
  , 0)
  const netIncomeAfterBaseExpenses = safeAnnualIncome - salaryOnlyTax - annualLivingCosts - helpRepayment
  const productRate = getPropertyInterestRate(propertyConfig, occupancyMode)
  const assessedRate = getServiceabilityAssessmentRate(productRate)

  if (occupancyMode === 'owner') {
    const ownerHoldingCosts = getOwnerHoldingCosts(propertyConfig)
    const annualRepaymentRoom = Math.max(0, netIncomeAfterBaseExpenses - ownerHoldingCosts)
    const maxLoanSize = annualRepaymentRoom <= 0
      ? 0
      : solvePrincipalFromAnnualPayment(annualRepaymentRoom, assessedRate, safeMortgageYears)

    return {
      assessableIncome: safeAnnualIncome,
      annualLivingCosts,
      existingDebtCommitments: helpRepayment,
      helpRepayment,
      assessedRate,
      annualRepaymentRoom,
      maxLoanSize,
      ownerHoldingCosts,
      rentalIncomeCredit: 0,
      propertyOperatingCosts: ownerHoldingCosts,
      taxDelta: 0
    }
  }

  const rentalTaxPosition = calculateInvestmentPropertyTaxPosition({
    propertyConfig,
    propertyValue: safePropertyValue,
    vacancyRate,
    interestPaid: 0,
    yearsOwned: 0
  })
  const rentCredit = rentalTaxPosition.rentReceived * SERVICEABILITY_RENT_CREDIT_PCT
  const taxPosition = calculateAustralianAnnualTax({
    taxYear,
    salaryIncome: safeAnnualIncome,
    taxableRentalIncome: rentalTaxPosition.taxableRentalIncome
  })
  const existingDebtCommitments = helpRepayment + Math.max(0, Number(personalHousingCostAnnual) || 0)
  const annualRepaymentRoom = Math.max(
    0,
    netIncomeAfterBaseExpenses -
      Math.max(0, Number(personalHousingCostAnnual) || 0) -
      rentalTaxPosition.cashOperatingExpenses +
      rentCredit -
      taxPosition.deltaVsSalaryOnly
  )
  const maxLoanSize = annualRepaymentRoom <= 0
    ? 0
    : solvePrincipalFromAnnualPayment(annualRepaymentRoom, assessedRate, safeMortgageYears)

  return {
    assessableIncome: safeAnnualIncome + rentCredit,
    annualLivingCosts,
    existingDebtCommitments,
    helpRepayment,
    assessedRate,
    annualRepaymentRoom,
    maxLoanSize,
    ownerHoldingCosts: 0,
    rentalIncomeCredit: rentCredit,
    propertyOperatingCosts: rentalTaxPosition.cashOperatingExpenses,
    taxDelta: taxPosition.deltaVsSalaryOnly,
    rentalTaxPosition
  }
}

function solvePrincipalFromAnnualPayment(payment, annualRate, yearsRemaining) {
  const safePayment = Math.max(0, Number(payment) || 0)
  const safeRate = Math.max(0, Number(annualRate) || 0)
  const safeYears = Math.max(1, Number(yearsRemaining) || 1)
  if (safePayment <= 0) return 0
  if (safeRate <= 0) return safePayment * safeYears
  const pow = Math.pow(1 + safeRate, safeYears)
  return safePayment * ((pow - 1) / (safeRate * pow))
}

export function interpolateRate(startRate, endRate, yearIndex, blendYears = 5) {
  const t = clamp(yearIndex / Math.max(1, blendYears), 0, 1)
  return startRate + (endRate - startRate) * t
}
