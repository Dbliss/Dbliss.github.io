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

export function getAustralianTaxBreakdown(income) {
  const taxableIncome = Math.max(0, Number(income) || 0)
  let incomeTax = 0

  if (taxableIncome <= 18_200) {
    incomeTax = 0
  } else if (taxableIncome <= 45_000) {
    incomeTax = (taxableIncome - 18_200) * 0.16
  } else if (taxableIncome <= 135_000) {
    incomeTax = 4_288 + (taxableIncome - 45_000) * 0.30
  } else if (taxableIncome <= 190_000) {
    incomeTax = 31_288 + (taxableIncome - 135_000) * 0.37
  } else {
    incomeTax = 51_638 + (taxableIncome - 190_000) * 0.45
  }

  const medicareLevy = taxableIncome * 0.02
  const totalTax = incomeTax + medicareLevy
  const marginalRate = totalTax <= 0 ? 0 : incomeTax / taxableIncome + 0.02

  return {
    taxableIncome,
    incomeTax,
    medicareLevy,
    totalTax,
    marginalRate: clamp(marginalRate, 0, 0.47)
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

export function simulatePortfolioYear(portfolioConfig, random, taxableIncome) {
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

  const tax = estimatePortfolioTaxImpact({
    asxDistributionYield: asxDividendIncome,
    qqqDistributionYield: qqqDividendIncome,
    bondIncomeYield: bondIncome,
    frankingPct: portfolioConfig.asxFrankingPct || 0,
    taxableIncome
  })

  return {
    weights,
    totalReturn,
    distributionYield,
    taxImpactRate: tax.netTaxRate,
    frankingBenefitRate: tax.frankingBenefitRate
  }
}

export function estimatePortfolioTaxImpact({
  asxDistributionYield,
  qqqDistributionYield,
  bondIncomeYield,
  frankingPct,
  taxableIncome
}) {
  const { marginalRate } = getAustralianTaxBreakdown(taxableIncome)
  const asxDistribution = Math.max(0, asxDistributionYield || 0)
  const qqqDistribution = Math.max(0, qqqDistributionYield || 0)
  const bondIncome = Math.max(0, bondIncomeYield || 0)
  const frankedShare = asxDistribution * clamp(frankingPct || 0, 0, 1)
  const frankingCreditRate = frankedShare * (0.3 / 0.7)
  const grossedUpFranked = frankedShare + frankingCreditRate
  const taxOnFranked = grossedUpFranked * marginalRate
  const taxOnUnfranked = (asxDistribution - frankedShare + qqqDistribution + bondIncome) * marginalRate
  const netTaxRate = taxOnFranked + taxOnUnfranked - frankingCreditRate

  return {
    netTaxRate,
    frankingBenefitRate: frankingCreditRate
  }
}

export function estimateLmi(purchasePrice, depositPct) {
  const safePrice = Math.max(0, Number(purchasePrice) || 0)
  const safeDepositPct = clamp(Number(depositPct) || 0, 0, 1)
  if (safeDepositPct >= 0.2) return 0
  const leverageGap = 0.2 - safeDepositPct
  return safePrice * (0.012 + leverageGap * 0.14)
}

export function getEffectiveDepositPct(propertyConfig, firstHomeBuyerEligible) {
  const configuredDepositPct = clamp(Number(propertyConfig.depositPct) || 0, 0.05, 0.95)
  return firstHomeBuyerEligible ? 0.05 : configuredDepositPct
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

export function applyFirstHomeBenefits(propertyConfig, firstHomeBuyerEligible) {
  const stampDuty = Math.max(0, Number(propertyConfig.stampDuty) || 0)
  const grant = firstHomeBuyerEligible ? Math.max(0, Number(propertyConfig.firstHomeBuyerGrant) || 0) : 0
  const reductionPct = firstHomeBuyerEligible ? clamp(Number(propertyConfig.firstHomeBuyerDutyReductionPct) || 0, 0, 1) : 0
  return {
    adjustedStampDuty: stampDuty * (1 - reductionPct),
    grant
  }
}

export function calculatePurchaseCosts(propertyConfig, firstHomeBuyerEligible) {
  const fhb = applyFirstHomeBenefits(propertyConfig, firstHomeBuyerEligible)
  return {
    stampDuty: fhb.adjustedStampDuty,
    legalFees: Math.max(0, Number(propertyConfig.legalFees) || 0),
    buyersCosts: Math.max(0, Number(propertyConfig.buyersCosts) || 0),
    grant: fhb.grant,
    total:
      fhb.adjustedStampDuty +
      Math.max(0, Number(propertyConfig.legalFees) || 0) +
      Math.max(0, Number(propertyConfig.buyersCosts) || 0) -
      fhb.grant
  }
}

export function interpolateRate(startRate, endRate, yearIndex, blendYears = 5) {
  const t = clamp(yearIndex / Math.max(1, blendYears), 0, 1)
  return startRate + (endRate - startRate) * t
}
