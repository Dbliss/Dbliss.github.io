import {
  amortizeOneYear,
  calculateAnnualMortgagePayment,
  calculatePurchaseCosts,
  estimateGenericPurchaseCosts,
  estimateLmi,
  estimatePortfolioTaxImpact,
  getEffectiveInvestmentDepositPct,
  getEffectiveOwnerDepositPct,
  normalisePortfolioWeights,
  scalePurchaseCostsWithPrice
} from '../finance.js'

describe('wealth finance helpers', () => {
  it('calculates a positive mortgage payment and reduces balance after one year', () => {
    const payment = calculateAnnualMortgagePayment(800000, 0.06, 30)
    const year = amortizeOneYear(800000, 0.06, 30)

    expect(payment).toBeGreaterThan(0)
    expect(year.endingBalance).toBeLessThan(800000)
    expect(year.interestPaid).toBeGreaterThan(0)
  })

  it('waives owner stamp duty below 800k and tapers it to 1m', () => {
    const config = {
      stampDuty: 32000,
      legalFees: 2500,
      buyersCosts: 1800
    }

    const regular = calculatePurchaseCosts(config, false, 900000)
    const fullyExempt = calculatePurchaseCosts(config, true, 750000)
    const tapered = calculatePurchaseCosts(config, true, 900000)

    expect(fullyExempt.stampDuty).toBe(0)
    expect(fullyExempt.total).toBe(4300)
    expect(tapered.stampDuty).toBe(16000)
    expect(tapered.total).toBeLessThan(regular.total)
  })

  it('keeps owner and investment deposit settings distinct', () => {
    expect(getEffectiveOwnerDepositPct({ ownerDepositPct: 0.05, depositPct: 0.2 })).toBeCloseTo(0.05)
    expect(getEffectiveOwnerDepositPct({ ownerDepositPct: 0.12, depositPct: 0.2 })).toBeCloseTo(0.12)
    expect(getEffectiveInvestmentDepositPct({ ownerDepositPct: 0.05, depositPct: 0.2 })).toBeCloseTo(0.2)
  })

  it('removes LMI for eligible first-home-buyer purchases and scales it with higher LVRs otherwise', () => {
    expect(estimateLmi(1_400_000, 0.05, true)).toBe(0)
    expect(estimateLmi(900000, 0.15, false)).toBeLessThan(estimateLmi(900000, 0.1, false))
    expect(estimateLmi(900000, 0.1, false)).toBeLessThan(estimateLmi(900000, 0.05, false))
  })

  it('scales shared purchase costs with property value using the generic formulas', () => {
    const base = estimateGenericPurchaseCosts(700000)
    const scaled = scalePurchaseCostsWithPrice(base, 700000, 900000)

    expect(scaled.stampDuty).toBeGreaterThan(base.stampDuty)
    expect(scaled.legalFees).toBeGreaterThan(base.legalFees)
    expect(scaled.buyersCosts).toBeGreaterThan(base.buyersCosts)
  })

  it('preserves manual purchase-cost overrides as a ratio to the generic baseline when price changes', () => {
    const base = estimateGenericPurchaseCosts(700000)
    const scaled = scalePurchaseCostsWithPrice({
      stampDuty: base.stampDuty * 1.1,
      legalFees: base.legalFees * 0.9,
      buyersCosts: base.buyersCosts * 1.25
    }, 700000, 900000)
    const next = estimateGenericPurchaseCosts(900000)

    expect(scaled.stampDuty / next.stampDuty).toBeCloseTo(1.1, 2)
    expect(scaled.legalFees / next.legalFees).toBeCloseTo(0.9, 2)
    expect(scaled.buyersCosts / next.buyersCosts).toBeCloseTo(1.25, 2)
  })

  it('normalises portfolio weights while preserving the bond cap behaviour', () => {
    const weights = normalisePortfolioWeights({
      asxWeight: 0.55,
      qqqWeight: 0.25,
      bondWeight: 0.4
    })

    expect(weights.bondWeight).toBeCloseTo(0.4)
    expect(weights.asxWeight + weights.qqqWeight + weights.bondWeight).toBeCloseTo(1)
  })

  it('reduces net tax drag when franking credits are present', () => {
    const noFranking = estimatePortfolioTaxImpact({
      asxDistributionYield: 0.04,
      qqqDistributionYield: 0.01,
      bondIncomeYield: 0.02,
      frankingPct: 0,
      taxableIncome: 110000
    })

    const withFranking = estimatePortfolioTaxImpact({
      asxDistributionYield: 0.04,
      qqqDistributionYield: 0.01,
      bondIncomeYield: 0.02,
      frankingPct: 0.75,
      taxableIncome: 110000
    })

    expect(withFranking.netTaxRate).toBeLessThan(noFranking.netTaxRate)
  })
})
