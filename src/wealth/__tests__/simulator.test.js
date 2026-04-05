import { cloneSimulationRequest, wealthHousingStrategyKeys, wealthStockStrategyKeys } from '../../data/wealthDefaults.js'
import { simulateWealthPathways } from '../simulator.js'

function setSingleEarnerProfile(request, {
  annualIncome,
  startingSavings,
  helpDebtBalance
} = {}) {
  const earner = request.profile.earners[0]

  if (annualIncome !== undefined) {
    request.profile.annualIncome = annualIncome
    earner.annualIncome = annualIncome
  }

  if (startingSavings !== undefined) {
    request.profile.startingSavings = startingSavings
    earner.startingSavings = startingSavings
  }

  if (helpDebtBalance !== undefined) {
    request.profile.helpDebtBalance = helpDebtBalance
    earner.helpDebtBalance = helpDebtBalance
  }
}

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

  it('supports a mixed custom subset of stock and housing scenarios', () => {
    const request = cloneSimulationRequest()
    request.simulationSettings.iterations = 120
    request.scenarioSelection.selectedScenarioKeys = ['stockPortfolio', 'buyHouseHome']

    const result = simulateWealthPathways(request)

    expect(Object.keys(result.strategies)).toEqual(['stockPortfolio', 'buyHouseHome'])
    expect(result.strategyOrder).toEqual(['stockPortfolio', 'buyHouseHome'])
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

  it('does not buy immediately when starting savings are too low', () => {
    const request = cloneSimulationRequest()
    request.simulationSettings.iterations = 120
    setSingleEarnerProfile(request, { startingSavings: 30000 })
    request.profile.weeklyNonHousingLivingCosts = 1500

    const result = simulateWealthPathways(request)
    const homePoints = result.strategies.buyHouseHome.points
    const purchasePoint = homePoints.find(point => point.homeEquityP50 > 0)

    expect(homePoints[0].homeEquityP50).toBe(0)
    if (purchasePoint) {
      expect(purchasePoint.year).toBeGreaterThan(0)
    }
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

  it('drops an investment-property scenario when no yield model or fallback yield is available', () => {
    const request = cloneSimulationRequest()
    request.simulationSettings.iterations = 120
    request.propertyConfig.house.yieldModel = null
    request.propertyConfig.house.rentYield = 0

    const result = simulateWealthPathways(request)

    expect(result.strategies.buyHouseInvestmentProperty).toBeUndefined()
    expect(result.strategies.buyHouseHome).toBeTruthy()
  })

  it('reduces annual surplus while HELP debt is being repaid', () => {
    const noHelpRequest = cloneSimulationRequest()
    noHelpRequest.simulationSettings.iterations = 120
    setSingleEarnerProfile(noHelpRequest, {
      annualIncome: 120000,
      helpDebtBalance: 0
    })

    const withHelpRequest = cloneSimulationRequest()
    withHelpRequest.simulationSettings.iterations = 120
    setSingleEarnerProfile(withHelpRequest, {
      annualIncome: 120000,
      helpDebtBalance: 40000
    })

    const noHelp = simulateWealthPathways(noHelpRequest)
    const withHelp = simulateWealthPathways(withHelpRequest)

    expect(withHelp.strategies.stockQqq.points[1].annualSurplusP50)
      .toBeLessThan(noHelp.strategies.stockQqq.points[1].annualSurplusP50)
  })

  it('restores annual surplus after HELP debt is fully repaid', () => {
    const noHelpRequest = cloneSimulationRequest()
    noHelpRequest.simulationSettings.iterations = 120
    setSingleEarnerProfile(noHelpRequest, {
      annualIncome: 100000,
      helpDebtBalance: 0
    })
    noHelpRequest.profile.weeklyNonHousingLivingCosts = 0
    noHelpRequest.housingCosts.weeklyRent = 0
    noHelpRequest.housingCosts.rentGrowthRate = 0

    const withHelpRequest = cloneSimulationRequest()
    withHelpRequest.simulationSettings.iterations = 120
    setSingleEarnerProfile(withHelpRequest, {
      annualIncome: 100000,
      helpDebtBalance: 5000
    })
    withHelpRequest.profile.weeklyNonHousingLivingCosts = 0
    withHelpRequest.housingCosts.weeklyRent = 0
    withHelpRequest.housingCosts.rentGrowthRate = 0

    const noHelp = simulateWealthPathways(noHelpRequest)
    const withHelp = simulateWealthPathways(withHelpRequest)

    expect(withHelp.strategies.stockQqq.points[1].annualSurplusP50)
      .toBeLessThan(noHelp.strategies.stockQqq.points[1].annualSurplusP50)
    expect(Math.abs(
      withHelp.strategies.stockQqq.points[3].annualSurplusP50 -
      noHelp.strategies.stockQqq.points[3].annualSurplusP50
    )).toBeLessThan(25)
  })

  it('can delay a housing purchase when HELP debt reduces saving power and serviceability', () => {
    const noHelpRequest = cloneSimulationRequest()
    noHelpRequest.simulationSettings.iterations = 120
    setSingleEarnerProfile(noHelpRequest, {
      startingSavings: 25000,
      annualIncome: 115000,
      helpDebtBalance: 0
    })
    noHelpRequest.profile.weeklyNonHousingLivingCosts = 1200
    noHelpRequest.housingCosts.weeklyRent = 650

    const withHelpRequest = cloneSimulationRequest()
    withHelpRequest.simulationSettings.iterations = 120
    setSingleEarnerProfile(withHelpRequest, {
      startingSavings: 25000,
      annualIncome: 115000,
      helpDebtBalance: 45000
    })
    withHelpRequest.profile.weeklyNonHousingLivingCosts = 1200
    withHelpRequest.housingCosts.weeklyRent = 650

    const noHelp = simulateWealthPathways(noHelpRequest)
    const withHelp = simulateWealthPathways(withHelpRequest)
    const noHelpPurchaseYear = noHelp.strategies.buyApartmentHome.points.find(point => point.homeEquityP50 > 0)?.year ?? Number.POSITIVE_INFINITY
    const withHelpPurchaseYear = withHelp.strategies.buyApartmentHome.points.find(point => point.homeEquityP50 > 0)?.year ?? Number.POSITIVE_INFINITY

    expect(withHelpPurchaseYear).toBeGreaterThanOrEqual(noHelpPurchaseYear)
  })

  it('keeps representative wealth chart components on a single purchase path', () => {
    const request = cloneSimulationRequest()
    request.simulationSettings.iterations = 120

    const result = simulateWealthPathways(request)
    const points = result.strategies.buyHouseHome.points
    const firstRepresentativePropertyYear = points.findIndex((point) =>
      (Number(point.wealthPropertyValueRepresentative) || 0) > 0
    )

    points.forEach((point, index) => {
      const propertyValue = Number(point.wealthPropertyValueRepresentative) || 0
      const mortgageDebt = Number(point.wealthMortgageDebtRepresentative) || 0

      if (propertyValue <= 0) {
        expect(mortgageDebt).toBe(0)
      }

      if (firstRepresentativePropertyYear !== -1 && index >= firstRepresentativePropertyYear) {
        expect(propertyValue).toBeGreaterThan(0)
      }
    })
  })
})
