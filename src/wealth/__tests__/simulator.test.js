import { cloneSimulationRequest } from '../../data/wealthDefaults.js'
import { simulateWealthPathways } from '../simulator.js'

describe('wealth simulator', () => {
  it('produces deterministic results for a fixed seeded request', () => {
    const request = cloneSimulationRequest()
    request.simulationSettings.iterations = 120

    const first = simulateWealthPathways(request)
    const second = simulateWealthPathways(request)

    expect(first.strategies.rentInvest.summary.finalMedianNetWorth)
      .toBe(second.strategies.rentInvest.summary.finalMedianNetWorth)
    expect(first.strategies.buyHouseHome.summary.downsideRisk)
      .toBe(second.strategies.buyHouseHome.summary.downsideRisk)
  })

  it('keeps owner-occupier and investment-property outcomes distinct', () => {
    const request = cloneSimulationRequest()
    request.simulationSettings.iterations = 120

    const result = simulateWealthPathways(request)

    expect(result.strategies.buyHouseHome.summary.finalMedianNetWorth)
      .not.toBe(result.strategies.buyHouseInvestmentProperty.summary.finalMedianNetWorth)
  })

  it('surfaces house and apartment pathways in the same run', () => {
    const request = cloneSimulationRequest()
    request.simulationSettings.iterations = 120

    const result = simulateWealthPathways(request)

    expect(result.strategies.buyHouseHome.label).toContain('House')
    expect(result.strategies.buyApartmentHome.label).toContain('Apartment')
    expect(result.strategies.buyApartmentHome.summary.finalMedianNetWorth)
      .not.toBe(result.strategies.buyHouseHome.summary.finalMedianNetWorth)
  })

  it('waits to buy until the deposit is affordable when savings are too low initially', () => {
    const request = cloneSimulationRequest()
    request.simulationSettings.iterations = 120
    request.profile.startingSavings = 20000
    request.profile.weeklyHousingAndInvestingBudget = 2100

    const result = simulateWealthPathways(request)
    const homePoints = result.strategies.buyHouseHome.points
    const purchasePoint = homePoints.find(point => point.homeEquityP50 > 0)

    expect(homePoints[0].homeEquityP50).toBe(0)
    expect(purchasePoint).toBeTruthy()
    expect(purchasePoint.year).toBeGreaterThan(0)
  })

  it('does not buy before the live-at-home period ends', () => {
    const request = cloneSimulationRequest()
    request.simulationSettings.iterations = 120
    request.housingCosts.liveAtHome = true
    request.housingCosts.liveAtHomeYears = 4
    request.profile.startingSavings = 150000
    request.profile.weeklyHousingAndInvestingBudget = 2600

    const result = simulateWealthPathways(request)
    const ownerPurchasePoint = result.strategies.buyHouseHome.points.find(point => point.homeEquityP50 > 0)
    const investmentPurchasePoint = result.strategies.buyHouseInvestmentProperty.points.find(point => point.homeEquityP50 > 0)

    expect(ownerPurchasePoint).toBeTruthy()
    expect(investmentPurchasePoint).toBeTruthy()
    expect(ownerPurchasePoint.year).toBeGreaterThanOrEqual(request.housingCosts.liveAtHomeYears)
    expect(investmentPurchasePoint.year).toBeGreaterThanOrEqual(request.housingCosts.liveAtHomeYears)
  })

  it('uses the first-home-buyer 5 percent deposit path when support is enabled', () => {
    const regularRequest = cloneSimulationRequest()
    regularRequest.simulationSettings.iterations = 120
    regularRequest.profile.startingSavings = 100000
    regularRequest.propertyConfig.firstHomeBuyerEligible = false
    regularRequest.propertyConfig.house.ownerDepositPct = 0.2

    const firstHomeBuyerRequest = cloneSimulationRequest()
    firstHomeBuyerRequest.simulationSettings.iterations = 120
    firstHomeBuyerRequest.profile.startingSavings = 100000
    firstHomeBuyerRequest.propertyConfig.firstHomeBuyerEligible = true
    firstHomeBuyerRequest.propertyConfig.house.ownerDepositPct = 0.05

    const regular = simulateWealthPathways(regularRequest)
    const firstHomeBuyer = simulateWealthPathways(firstHomeBuyerRequest)

    expect(regular.strategies.buyHouseHome.points[0].homeEquityP50).toBe(0)
    expect(firstHomeBuyer.strategies.buyHouseHome.points[0].homeEquityP50).toBeGreaterThan(0)
    expect(firstHomeBuyer.strategies.buyHouseHome.points[0].debtRemainingP50)
      .toBeGreaterThan(regular.strategies.buyHouseHome.points[0].debtRemainingP50)
  })

  it('treats lower live-at-home board as extra investable cash before move-out', () => {
    const rentingRequest = cloneSimulationRequest()
    rentingRequest.simulationSettings.iterations = 120
    rentingRequest.profile.startingSavings = 80000
    rentingRequest.profile.weeklyHousingAndInvestingBudget = 1000
    rentingRequest.housingCosts.weeklyRent = 700

    const liveAtHomeRequest = cloneSimulationRequest()
    liveAtHomeRequest.simulationSettings.iterations = 120
    liveAtHomeRequest.profile.startingSavings = 80000
    liveAtHomeRequest.profile.weeklyHousingAndInvestingBudget = 1000
    liveAtHomeRequest.housingCosts.liveAtHome = true
    liveAtHomeRequest.housingCosts.liveAtHomeYears = 2
    liveAtHomeRequest.housingCosts.weeklyRent = 700
    liveAtHomeRequest.housingCosts.weeklyBoardAtHome = 200

    const renting = simulateWealthPathways(rentingRequest)
    const liveAtHome = simulateWealthPathways(liveAtHomeRequest)

    expect(liveAtHome.strategies.rentInvest.points[1].liquidAssetsP50)
      .toBeGreaterThan(renting.strategies.rentInvest.points[1].liquidAssetsP50)
    expect(liveAtHome.strategies.rentInvest.points[1].annualSurplusP50)
      .toBeGreaterThan(renting.strategies.rentInvest.points[1].annualSurplusP50)
  })

  it('reports an estimated sale tax in property and portfolio outcomes', () => {
    const request = cloneSimulationRequest()
    request.simulationSettings.iterations = 120

    const result = simulateWealthPathways(request)

    expect(result.strategies.rentInvest.summary.finalMedianEstimatedSaleTax).toBeGreaterThanOrEqual(0)
    expect(result.strategies.buyHouseInvestmentProperty.summary.finalMedianEstimatedSaleTax).toBeGreaterThanOrEqual(0)
  })

  it('can hold pre-purchase property savings as cash instead of investing them', () => {
    const investedRequest = cloneSimulationRequest()
    investedRequest.simulationSettings.iterations = 120
    investedRequest.profile.startingSavings = 50000
    investedRequest.propertyConfig.investWhileSavingForDeposit = true

    const cashRequest = cloneSimulationRequest()
    cashRequest.simulationSettings.iterations = 120
    cashRequest.profile.startingSavings = 50000
    cashRequest.propertyConfig.investWhileSavingForDeposit = false

    const invested = simulateWealthPathways(investedRequest)
    const cashOnly = simulateWealthPathways(cashRequest)

    expect(invested.strategies.buyHouseHome.points[1].liquidAssetsP50)
      .toBeGreaterThan(cashOnly.strategies.buyHouseHome.points[1].liquidAssetsP50)
  })

  it('waits to buy when cash is ready but owner serviceability is not yet there', () => {
    const request = cloneSimulationRequest()
    request.simulationSettings.iterations = 120
    request.profile.startingSavings = 400000
    request.profile.annualIncome = 85000
    request.profile.incomeGrowthRate = 0.1
    request.propertyConfig.house.purchasePrice = 900000
    request.propertyConfig.house.ownerDepositPct = 0.05
    request.propertyConfig.house.growthMean = 0
    request.propertyConfig.house.growthVolatility = 0

    const result = simulateWealthPathways(request)
    const purchasePoint = result.strategies.buyHouseHome.points.find(point => point.homeEquityP50 > 0)

    expect(purchasePoint).toBeTruthy()
    expect(purchasePoint.year).toBeGreaterThan(0)
  })

  it('matches rent and invest when the buy-home path never becomes serviceable', () => {
    const request = cloneSimulationRequest()
    request.simulationSettings.iterations = 120
    request.profile.startingSavings = 250000
    request.profile.annualIncome = 70000
    request.profile.incomeGrowthRate = 0
    request.propertyConfig.investWhileSavingForDeposit = true
    request.propertyConfig.house.purchasePrice = 2500000
    request.propertyConfig.house.ownerDepositPct = 0.05
    request.propertyConfig.house.growthMean = 0.04
    request.propertyConfig.house.growthVolatility = 0

    const result = simulateWealthPathways(request)
    const rentInvest = result.strategies.rentInvest
    const buyHouseHome = result.strategies.buyHouseHome

    expect(buyHouseHome.points.every(point => point.homeEquityP50 === 0)).toBe(true)
    expect(buyHouseHome.summary.finalMedianNetWorth).toBe(rentInvest.summary.finalMedianNetWorth)
    expect(buyHouseHome.summary.downsideRisk).toBe(rentInvest.summary.downsideRisk)
    expect(buyHouseHome.summary.finalMedianTaxDelta).toBe(rentInvest.summary.finalMedianTaxDelta)
  })

  it('keeps growing the target property value while waiting to buy', () => {
    const flatGrowthRequest = cloneSimulationRequest()
    flatGrowthRequest.simulationSettings.iterations = 120
    flatGrowthRequest.profile.startingSavings = 400000
    flatGrowthRequest.profile.annualIncome = 85000
    flatGrowthRequest.profile.incomeGrowthRate = 0.1
    flatGrowthRequest.propertyConfig.house.purchasePrice = 900000
    flatGrowthRequest.propertyConfig.house.ownerDepositPct = 0.05
    flatGrowthRequest.propertyConfig.house.growthMean = 0
    flatGrowthRequest.propertyConfig.house.growthVolatility = 0

    const risingGrowthRequest = cloneSimulationRequest()
    risingGrowthRequest.simulationSettings.iterations = 120
    risingGrowthRequest.profile.startingSavings = 400000
    risingGrowthRequest.profile.annualIncome = 85000
    risingGrowthRequest.profile.incomeGrowthRate = 0.1
    risingGrowthRequest.propertyConfig.house.purchasePrice = 900000
    risingGrowthRequest.propertyConfig.house.ownerDepositPct = 0.05
    risingGrowthRequest.propertyConfig.house.growthMean = 0.06
    risingGrowthRequest.propertyConfig.house.growthVolatility = 0

    const flatGrowth = simulateWealthPathways(flatGrowthRequest)
    const risingGrowth = simulateWealthPathways(risingGrowthRequest)
    const flatPurchasePoint = flatGrowth.strategies.buyHouseHome.points.find(point => point.homeEquityP50 > 0)
    const risingPurchasePoint = risingGrowth.strategies.buyHouseHome.points.find(point => point.homeEquityP50 > 0)

    expect(flatPurchasePoint).toBeTruthy()
    expect(risingPurchasePoint).toBeTruthy()
    expect(risingPurchasePoint.debtRemainingP50).toBeGreaterThan(flatPurchasePoint.debtRemainingP50)
  })

  it('uses stricter carry for rentvest serviceability than owner-occupier serviceability', () => {
    const request = cloneSimulationRequest()
    request.simulationSettings.iterations = 120
    request.profile.startingSavings = 500000
    request.profile.annualIncome = 110000
    request.propertyConfig.house.purchasePrice = 780000
    request.propertyConfig.house.ownerDepositPct = 0.2
    request.propertyConfig.house.depositPct = 0.2
    request.propertyConfig.house.growthMean = 0
    request.propertyConfig.house.growthVolatility = 0
    request.propertyConfig.house.rentYield = 0.02
    request.housingCosts.weeklyRent = 1200

    const result = simulateWealthPathways(request)
    const ownerPurchasePoint = result.strategies.buyHouseHome.points.find(point => point.homeEquityP50 > 0)
    const investmentPurchasePoint = result.strategies.buyHouseInvestmentProperty.points.find(point => point.homeEquityP50 > 0)

    expect(ownerPurchasePoint).toBeTruthy()
    expect(investmentPurchasePoint).toBeTruthy()
    expect(ownerPurchasePoint.year).toBeLessThan(investmentPurchasePoint.year)
  })
})
