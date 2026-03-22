import { cloneSimulationRequest } from '../../data/wealthDefaults.js'
import {
  amortizeOneYear,
  assessPropertyPurchaseServiceability,
  calculateAnnualMortgagePayment,
  calculateAustralianAnnualTax,
  calculatePurchaseCosts,
  estimateGenericPurchaseCosts,
  estimateLmi,
  estimatePortfolioTaxableIncome,
  getEffectiveInvestmentDepositPct,
  getEffectiveOwnerDepositPct,
  getOwnerHoldingCosts,
  getServiceabilityAssessmentRate,
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

  it('scales shared purchase costs with property value using the NSW baselines', () => {
    const base = estimateGenericPurchaseCosts(700000, 'house')
    const scaled = scalePurchaseCostsWithPrice(base, 700000, 900000, 'house')

    expect(scaled.stampDuty).toBeGreaterThan(base.stampDuty)
    expect(scaled.legalFees).toBeGreaterThan(base.legalFees)
    expect(scaled.buyersCosts).toBeGreaterThan(base.buyersCosts)
  })

  it('preserves manual purchase-cost overrides as a ratio to the NSW purchase-cost baseline when price changes', () => {
    const base = estimateGenericPurchaseCosts(700000, 'house')
    const scaled = scalePurchaseCostsWithPrice({
      stampDuty: base.stampDuty * 1.1,
      legalFees: base.legalFees * 0.9,
      buyersCosts: base.buyersCosts * 1.25
    }, 700000, 900000, 'house')
    const next = estimateGenericPurchaseCosts(900000, 'house')

    expect(scaled.stampDuty / next.stampDuty).toBeCloseTo(1.1, 2)
    expect(scaled.legalFees / next.legalFees).toBeCloseTo(0.9, 2)
    expect(scaled.buyersCosts / next.buyersCosts).toBeCloseTo(1.25, 2)
  })

  it('normalises portfolio weights across all sleeves to a full allocation', () => {
    const weights = normalisePortfolioWeights({
      asxWeight: 0.55,
      qqqWeight: 0.25,
      bondWeight: 0.4,
      cashWeight: 0.1
    })

    expect(weights.bondWeight).toBeCloseTo(0.3077, 3)
    expect(weights.cashWeight).toBeCloseTo(0.0769, 3)
    expect(weights.asxWeight + weights.qqqWeight + weights.bondWeight + weights.cashWeight).toBeCloseTo(1)
  })

  it('treats cash allocations as taxable interest income', () => {
    const income = estimatePortfolioTaxableIncome({
      asxWeight: 0.3,
      qqqWeight: 0.2,
      bondWeight: 0.1,
      cashWeight: 0.4,
      asxDividendYield: 0.04,
      qqqDividendYield: 0.01,
      bondIncomeYield: 0.02,
      cashReturnMean: 0.035,
      asxFrankingPct: 0
    }, 100000)

    expect(income.cashInterest).toBeCloseTo(1400)
    expect(income.cashIncome).toBeCloseTo(2800)
  })

  it('reduces net tax drag when franking credits are present', () => {
    const noFrankingIncome = estimatePortfolioTaxableIncome({
      asxWeight: 0.6,
      qqqWeight: 0.2,
      bondWeight: 0.2,
      asxDividendYield: 0.04,
      qqqDividendYield: 0.01,
      bondIncomeYield: 0.02,
      asxFrankingPct: 0
    }, 250000)
    const withFrankingIncome = estimatePortfolioTaxableIncome({
      asxWeight: 0.6,
      qqqWeight: 0.2,
      bondWeight: 0.2,
      asxDividendYield: 0.04,
      qqqDividendYield: 0.01,
      bondIncomeYield: 0.02,
      asxFrankingPct: 0.75
    }, 250000)

    const noFrankingTax = calculateAustralianAnnualTax({
      taxYear: '2025-26',
      salaryIncome: 110000,
      taxablePortfolioIncome: noFrankingIncome.taxableIncome,
      frankingCredits: noFrankingIncome.frankingCredits
    })
    const withFrankingTax = calculateAustralianAnnualTax({
      taxYear: '2025-26',
      salaryIncome: 110000,
      taxablePortfolioIncome: withFrankingIncome.taxableIncome,
      frankingCredits: withFrankingIncome.frankingCredits
    })

    expect(withFrankingTax.deltaVsSalaryOnly).toBeLessThan(noFrankingTax.deltaVsSalaryOnly)
  })

  it('uses an APRA-style assessment rate with a floor', () => {
    expect(getServiceabilityAssessmentRate(0.055)).toBeCloseTo(0.085)
    expect(getServiceabilityAssessmentRate(0.045)).toBeCloseTo(0.08)
  })

  it('uses an 80 percent rent credit for investment-property serviceability', () => {
    const request = cloneSimulationRequest()
    const property = request.propertyConfig.house
    const openingLoanBalance = 700000
    const serviceability = assessPropertyPurchaseServiceability({
      taxYear: request.profile.taxYear,
      annualIncome: request.profile.annualIncome,
      weeklyNonHousingLivingCosts: request.profile.weeklyNonHousingLivingCosts,
      occupancyMode: 'investment',
      propertyConfig: property,
      propertyValue: property.purchasePrice,
      mortgageYears: property.mortgageYears,
      openingLoanBalance,
      personalHousingCostAnnual: request.housingCosts.weeklyRent * 52,
      vacancyRate: request.propertyConfig.vacancyRate
    })

    expect(serviceability.rentCredit).toBeCloseTo(serviceability.rentalTaxPosition.rentReceived * 0.8)
  })

  it('can fail serviceability even when the product-rate carry would fit because the assessment buffer applies', () => {
    const property = {
      ownerInterestRate: 0.055,
      ownerLongRunInterestRate: 0.0525,
      investmentInterestRate: 0.0574,
      investmentLongRunInterestRate: 0.055,
      mortgageYears: 30,
      councilRates: 2700,
      waterRates: 1400,
      insurance: 2500,
      maintenance: 2500,
      strata: 0,
      rentYield: 0.037,
      propertyManagementPct: 0.065,
      landTax: 0,
      otherDeductibleExpensesAnnual: 900,
      borrowingExpensesTotal: 1800
    }
    const openingLoanBalance = 800000
    const productRateCarry =
      calculateAnnualMortgagePayment(openingLoanBalance, property.ownerInterestRate, property.mortgageYears) +
      getOwnerHoldingCosts(property)
    const serviceability = assessPropertyPurchaseServiceability({
      taxYear: '2025-26',
      annualIncome: 110000,
      weeklyNonHousingLivingCosts: 640,
      occupancyMode: 'owner',
      propertyConfig: property,
      propertyValue: 980000,
      mortgageYears: property.mortgageYears,
      openingLoanBalance
    })

    expect(productRateCarry).toBeLessThan(serviceability.annualDisposableAfterLiving)
    expect(serviceability.affordable).toBe(false)
  })

  it('refreshes defaults and keeps owner and investor rate inputs distinct without grant fields', () => {
    const request = cloneSimulationRequest()

    expect(request.profile.incomeGrowthRate).toBeCloseTo(0.034)
    expect(request.housingCosts.rentGrowthRate).toBeCloseTo(0.039)
    expect(request.housingCosts.boardGrowthRate).toBeCloseTo(0.034)
    expect(request.propertyConfig.house.ownerInterestRate).toBeCloseTo(0.055)
    expect(request.propertyConfig.house.investmentInterestRate).toBeCloseTo(0.0574)
    expect(request.propertyConfig.house.ownerPurchaseCosts.firstHomeBuyerGrant).toBeUndefined()
    expect(request.propertyConfig.house.ownerPurchaseCosts.firstHomeBuyerDutyReductionPct).toBeUndefined()
  })
})
