import { cloneSimulationRequest, wealthHousingStrategyKeys, wealthStockStrategyKeys } from '../../data/wealthDefaults.js'
import { simulateWealthPathways } from '../simulator.js'

describe('wealth simulator', () => {
  it('produces deterministic results for a fixed seeded request', () => {
    const request = cloneSimulationRequest()
    request.simulationSettings.iterations = 120

    const first = simulateWealthPathways(request)
    const second = simulateWealthPathways(request)

    expect(first.strategies.stockQqq.summary.finalMedianNetWorth)
      .toBe(second.strategies.stockQqq.summary.finalMedianNetWorth)
    expect(first.strategies.buyHouseHome.summary.downsideRisk)
      .toBe(second.strategies.buyHouseHome.summary.downsideRisk)
  })

  it('supports stock-only selection', () => {
    const request = cloneSimulationRequest()
    request.simulationSettings.iterations = 120
    request.scenarioSelection.includeHousing = false
    request.scenarioSelection.selectedScenarioKeys = [...wealthStockStrategyKeys]

    const result = simulateWealthPathways(request)

    expect(Object.keys(result.strategies)).toEqual(wealthStockStrategyKeys)
    expect(result.strategyOrder).toEqual(wealthStockStrategyKeys)
  })

  it('supports housing-only selection', () => {
    const request = cloneSimulationRequest()
    request.simulationSettings.iterations = 120
    request.scenarioSelection.includeStocks = false
    request.scenarioSelection.selectedScenarioKeys = [...wealthHousingStrategyKeys]

    const result = simulateWealthPathways(request)

    expect(Object.keys(result.strategies)).toEqual(wealthHousingStrategyKeys)
    expect(result.strategyOrder).toEqual(wealthHousingStrategyKeys)
  })

  it('keeps the standalone stock scenarios distinct', () => {
    const request = cloneSimulationRequest()
    request.simulationSettings.iterations = 120

    const result = simulateWealthPathways(request)

    expect(result.strategies.stockQqq.summary.finalMedianNetWorth)
      .not.toBe(result.strategies.stockCash.summary.finalMedianNetWorth)
    expect(result.strategies.stockAsx200.summary.finalMedianNetWorth)
      .not.toBe(result.strategies.stockBonds.summary.finalMedianNetWorth)
  })

  it('includes bitcoin as a distinct stock scenario', () => {
    const request = cloneSimulationRequest()
    request.simulationSettings.iterations = 120

    const result = simulateWealthPathways(request)

    expect(result.strategies.stockBitcoin).toBeTruthy()
    expect(result.strategies.stockBitcoin.summary.finalMedianNetWorth)
      .not.toBe(result.strategies.stockCash.summary.finalMedianNetWorth)
  })

  it('treats lower live-at-home board as extra investable cash before move-out', () => {
    const rentingRequest = cloneSimulationRequest()
    rentingRequest.simulationSettings.iterations = 120
    rentingRequest.profile.startingSavings = 80000
    rentingRequest.profile.weeklyNonHousingLivingCosts = 1000
    rentingRequest.housingCosts.weeklyRent = 700

    const liveAtHomeRequest = cloneSimulationRequest()
    liveAtHomeRequest.simulationSettings.iterations = 120
    liveAtHomeRequest.profile.startingSavings = 80000
    liveAtHomeRequest.profile.weeklyNonHousingLivingCosts = 1000
    liveAtHomeRequest.housingCosts.liveAtHome = true
    liveAtHomeRequest.housingCosts.liveAtHomeYears = 2
    liveAtHomeRequest.housingCosts.weeklyRent = 700
    liveAtHomeRequest.housingCosts.weeklyBoardAtHome = 200

    const renting = simulateWealthPathways(rentingRequest)
    const liveAtHome = simulateWealthPathways(liveAtHomeRequest)

    expect(liveAtHome.strategies.stockQqq.points[1].liquidAssetsP50)
      .toBeGreaterThan(renting.strategies.stockQqq.points[1].liquidAssetsP50)
    expect(liveAtHome.strategies.stockQqq.points[1].annualSurplusP50)
      .toBeGreaterThan(renting.strategies.stockQqq.points[1].annualSurplusP50)
  })

  it('waits to buy until the deposit is affordable when savings are too low initially', () => {
    const request = cloneSimulationRequest()
    request.simulationSettings.iterations = 120
    request.profile.startingSavings = 20000
    request.profile.weeklyNonHousingLivingCosts = 2100

    const result = simulateWealthPathways(request)
    const homePoints = result.strategies.buyHouseHome.points
    const purchasePoint = homePoints.find(point => point.homeEquityP50 > 0)

    expect(homePoints[0].homeEquityP50).toBe(0)
    expect(purchasePoint).toBeTruthy()
    expect(purchasePoint.year).toBeGreaterThan(0)
  })

  it('keeps owner-occupier and rentvest outcomes distinct', () => {
    const request = cloneSimulationRequest()
    request.simulationSettings.iterations = 120

    const result = simulateWealthPathways(request)

    expect(result.strategies.buyHouseHome.summary.finalMedianNetWorth)
      .not.toBe(result.strategies.buyHouseInvestmentProperty.summary.finalMedianNetWorth)
    expect(result.strategies.buyApartmentHome.summary.finalMedianNetWorth)
      .not.toBe(result.strategies.buyApartmentInvestmentProperty.summary.finalMedianNetWorth)
  })

  it('reduces annual surplus while HELP debt is being repaid', () => {
    const noHelpRequest = cloneSimulationRequest()
    noHelpRequest.simulationSettings.iterations = 120
    noHelpRequest.profile.annualIncome = 120000
    noHelpRequest.profile.helpDebtBalance = 0

    const withHelpRequest = cloneSimulationRequest()
    withHelpRequest.simulationSettings.iterations = 120
    withHelpRequest.profile.annualIncome = 120000
    withHelpRequest.profile.helpDebtBalance = 40000

    const noHelp = simulateWealthPathways(noHelpRequest)
    const withHelp = simulateWealthPathways(withHelpRequest)

    expect(withHelp.strategies.stockQqq.points[1].annualSurplusP50)
      .toBeLessThan(noHelp.strategies.stockQqq.points[1].annualSurplusP50)
  })

  it('restores annual surplus after HELP debt is fully repaid', () => {
    const noHelpRequest = cloneSimulationRequest()
    noHelpRequest.simulationSettings.iterations = 120
    noHelpRequest.profile.annualIncome = 100000
    noHelpRequest.profile.weeklyNonHousingLivingCosts = 0
    noHelpRequest.housingCosts.weeklyRent = 0
    noHelpRequest.housingCosts.rentGrowthRate = 0
    noHelpRequest.profile.helpDebtBalance = 0

    const withHelpRequest = cloneSimulationRequest()
    withHelpRequest.simulationSettings.iterations = 120
    withHelpRequest.profile.annualIncome = 100000
    withHelpRequest.profile.weeklyNonHousingLivingCosts = 0
    withHelpRequest.housingCosts.weeklyRent = 0
    withHelpRequest.housingCosts.rentGrowthRate = 0
    withHelpRequest.profile.helpDebtBalance = 5000

    const noHelp = simulateWealthPathways(noHelpRequest)
    const withHelp = simulateWealthPathways(withHelpRequest)

    expect(withHelp.strategies.stockQqq.points[1].annualSurplusP50)
      .toBeLessThan(noHelp.strategies.stockQqq.points[1].annualSurplusP50)
    expect(withHelp.strategies.stockQqq.points[3].annualSurplusP50)
      .toBe(noHelp.strategies.stockQqq.points[3].annualSurplusP50)
  })

  it('can delay a housing purchase when HELP debt reduces saving power and serviceability', () => {
    const noHelpRequest = cloneSimulationRequest()
    noHelpRequest.simulationSettings.iterations = 120
    noHelpRequest.profile.startingSavings = 25000
    noHelpRequest.profile.annualIncome = 115000
    noHelpRequest.profile.weeklyNonHousingLivingCosts = 1200
    noHelpRequest.housingCosts.weeklyRent = 650
    noHelpRequest.profile.helpDebtBalance = 0

    const withHelpRequest = cloneSimulationRequest()
    withHelpRequest.simulationSettings.iterations = 120
    withHelpRequest.profile.startingSavings = 25000
    withHelpRequest.profile.annualIncome = 115000
    withHelpRequest.profile.weeklyNonHousingLivingCosts = 1200
    withHelpRequest.housingCosts.weeklyRent = 650
    withHelpRequest.profile.helpDebtBalance = 45000

    const noHelp = simulateWealthPathways(noHelpRequest)
    const withHelp = simulateWealthPathways(withHelpRequest)
    const noHelpPurchaseYear = noHelp.strategies.buyApartmentHome.points.find(point => point.homeEquityP50 > 0)?.year ?? Number.POSITIVE_INFINITY
    const withHelpPurchaseYear = withHelp.strategies.buyApartmentHome.points.find(point => point.homeEquityP50 > 0)?.year ?? Number.POSITIVE_INFINITY

    expect(withHelpPurchaseYear).toBeGreaterThanOrEqual(noHelpPurchaseYear)
  })
})
