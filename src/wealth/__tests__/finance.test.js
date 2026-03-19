import {
  amortizeOneYear,
  calculateAnnualMortgagePayment,
  calculatePurchaseCosts,
  estimatePortfolioTaxImpact,
  getEffectiveDepositPct,
  normalisePortfolioWeights
} from '../finance.js'

describe('wealth finance helpers', () => {
  it('calculates a positive mortgage payment and reduces balance after one year', () => {
    const payment = calculateAnnualMortgagePayment(800000, 0.06, 30)
    const year = amortizeOneYear(800000, 0.06, 30)

    expect(payment).toBeGreaterThan(0)
    expect(year.endingBalance).toBeLessThan(800000)
    expect(year.interestPaid).toBeGreaterThan(0)
  })

  it('applies first-home-buyer benefits to purchase costs', () => {
    const config = {
      stampDuty: 32000,
      legalFees: 2500,
      buyersCosts: 1800,
      firstHomeBuyerDutyReductionPct: 0.5,
      firstHomeBuyerGrant: 10000
    }

    const regular = calculatePurchaseCosts(config, false)
    const firstHomeBuyer = calculatePurchaseCosts(config, true)

    expect(firstHomeBuyer.total).toBeLessThan(regular.total)
    expect(firstHomeBuyer.grant).toBe(10000)
  })

  it('forces a 5 percent deposit when first-home-buyer support is enabled', () => {
    expect(getEffectiveDepositPct({ depositPct: 0.2 }, false)).toBeCloseTo(0.2)
    expect(getEffectiveDepositPct({ depositPct: 0.2 }, true)).toBeCloseTo(0.05)
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
