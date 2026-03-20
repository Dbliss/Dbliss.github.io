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

const defaultTaxYear = '2025-26'
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
  const bondWeight = clamp(Number(portfolioConfig.bondWeight) || 0, 0, 0.4)
  const equityBudget = 1 - bondWeight
  const equityRequested = Math.max(0, Number(portfolioConfig.asxWeight) || 0) + Math.max(0, Number(portfolioConfig.qqqWeight) || 0)
  const asxRatio = equityRequested > 0 ? Math.max(0, Number(portfolioConfig.asxWeight) || 0) / equityRequested : 0.5
  const qqqRatio = 1 - asxRatio
  return {
    asxWeight: equityBudget * asxRatio,
    qqqWeight: equityBudget * qqqRatio,
    bondWeight
  }
}

export function simulatePortfolioYear(portfolioConfig, random) {
  const weights = normalisePortfolioWeights(portfolioConfig)
  const asxReturn = clamp(sampleNormal(random, portfolioConfig.asxReturnMean, portfolioConfig.asxVolatility), -0.75, 0.75)
  const qqqReturn = clamp(sampleNormal(random, portfolioConfig.qqqReturnMean, portfolioConfig.qqqVolatility), -0.85, 0.95)
  const bondReturn = clamp(sampleNormal(random, portfolioConfig.bondReturnMean, portfolioConfig.bondVolatility), -0.25, 0.25)

  const totalReturn =
    weights.asxWeight * asxReturn +
    weights.qqqWeight * qqqReturn +
    weights.bondWeight * bondReturn

  const asxDividendIncome = weights.asxWeight * (portfolioConfig.asxDividendYield || 0)
  const qqqDividendIncome = weights.qqqWeight * (portfolioConfig.qqqDividendYield || 0)
  const bondIncome = weights.bondWeight * (portfolioConfig.bondIncomeYield || 0)
  const distributionYield = asxDividendIncome + qqqDividendIncome + bondIncome

  return {
    weights,
    totalReturn,
    distributionYield
  }
}

export function estimatePortfolioTaxableIncome(portfolioConfig, portfolioBalance) {
  const safeBalance = Math.max(0, Number(portfolioBalance) || 0)
  const weights = normalisePortfolioWeights(portfolioConfig)
  const asxDistribution = safeBalance * weights.asxWeight * Math.max(0, Number(portfolioConfig.asxDividendYield) || 0)
  const qqqDistribution = safeBalance * weights.qqqWeight * Math.max(0, Number(portfolioConfig.qqqDividendYield) || 0)
  const bondIncome = safeBalance * weights.bondWeight * Math.max(0, Number(portfolioConfig.bondIncomeYield) || 0)
  const frankedDistribution = asxDistribution * clamp(Number(portfolioConfig.asxFrankingPct) || 0, 0, 1)
  const frankingCredits = frankedDistribution * (companyTaxRate / (1 - companyTaxRate))
  const cashIncome = asxDistribution + qqqDistribution + bondIncome
  const taxableIncome = cashIncome + frankingCredits

  return {
    weights,
    cashIncome,
    taxableIncome,
    frankingCredits,
    asxDistribution,
    qqqDistribution,
    bondIncome
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
    adjustedStampDuty: roundCurrency(stampDuty * (1 - reductionPct)),
    grant: 0
  }
}

export function estimateGenericPurchaseCosts(purchasePrice) {
  const safePrice = Math.max(0, Number(purchasePrice) || 0)
  return {
    stampDuty: roundCurrency(safePrice * (0.0175 + safePrice / 41_000_000)),
    legalFees: roundCurrency(1700 + safePrice * 0.00092),
    buyersCosts: roundCurrency(1350 + safePrice * 0.00107)
  }
}

export function scalePurchaseCostsWithPrice(purchaseCosts, previousPurchasePrice, nextPurchasePrice) {
  const currentCosts = {
    stampDuty: Math.max(0, Number(purchaseCosts?.stampDuty) || 0),
    legalFees: Math.max(0, Number(purchaseCosts?.legalFees) || 0),
    buyersCosts: Math.max(0, Number(purchaseCosts?.buyersCosts) || 0)
  }
  const previousEstimate = estimateGenericPurchaseCosts(previousPurchasePrice)
  const nextEstimate = estimateGenericPurchaseCosts(nextPurchasePrice)
  const scaleField = (currentValue, previousValue, nextValue) => {
    if (nextValue <= 0) return 0
    if (previousValue <= 0) return roundCurrency(nextValue)
    return roundCurrency((currentValue / previousValue) * nextValue)
  }

  return {
    ...(purchaseCosts || {}),
    stampDuty: scaleField(currentCosts.stampDuty, previousEstimate.stampDuty, nextEstimate.stampDuty),
    legalFees: scaleField(currentCosts.legalFees, previousEstimate.legalFees, nextEstimate.legalFees),
    buyersCosts: scaleField(currentCosts.buyersCosts, previousEstimate.buyersCosts, nextEstimate.buyersCosts)
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
    grant: fhb.grant,
    total: roundCurrency(fhb.adjustedStampDuty + legalFees + buyersCosts - fhb.grant)
  }
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
  const capitalWorksDeductionAnnual = Math.max(0, Number(propertyConfig.capitalWorksDeductionAnnual) || 0)
  const depreciationDeductionAnnual = Math.max(0, Number(propertyConfig.depreciationDeductionAnnual) || 0)
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
    capitalWorksDeductionAnnual -
    depreciationDeductionAnnual -
    otherDeductibleExpensesAnnual

  return {
    rentReceived,
    managementFee,
    borrowingExpenseDeduction,
    capitalWorksDeductionAnnual,
    depreciationDeductionAnnual,
    cashOperatingExpenses,
    taxableRentalIncome
  }
}

export function interpolateRate(startRate, endRate, yearIndex, blendYears = 5) {
  const t = clamp(yearIndex / Math.max(1, blendYears), 0, 1)
  return startRate + (endRate - startRate) * t
}
