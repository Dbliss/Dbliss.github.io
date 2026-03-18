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
    expect(first.strategies.buyHome.summary.downsideRisk)
      .toBe(second.strategies.buyHome.summary.downsideRisk)
  })

  it('keeps owner-occupier and investment-property outcomes distinct', () => {
    const request = cloneSimulationRequest()
    request.simulationSettings.iterations = 120

    const result = simulateWealthPathways(request)

    expect(result.strategies.buyHome.summary.finalMedianNetWorth)
      .not.toBe(result.strategies.buyInvestmentProperty.summary.finalMedianNetWorth)
  })

  it('changes labels and outcomes when the selected property type changes', () => {
    const houseRequest = cloneSimulationRequest()
    houseRequest.simulationSettings.iterations = 120

    const apartmentRequest = cloneSimulationRequest()
    apartmentRequest.simulationSettings.iterations = 120
    apartmentRequest.propertyConfig.targetPropertyType = 'apartment'

    const houseResult = simulateWealthPathways(houseRequest)
    const apartmentResult = simulateWealthPathways(apartmentRequest)

    expect(houseResult.strategies.buyHome.label).toContain('House')
    expect(apartmentResult.strategies.buyHome.label).toContain('Apartment')
    expect(apartmentResult.strategies.buyHome.summary.finalMedianNetWorth)
      .not.toBe(houseResult.strategies.buyHome.summary.finalMedianNetWorth)
  })

  it('waits to buy until the deposit is affordable when savings are too low initially', () => {
    const request = cloneSimulationRequest()
    request.simulationSettings.iterations = 120
    request.profile.startingSavings = 20000
    request.profile.weeklyAvailableToSave = 2100

    const result = simulateWealthPathways(request)
    const homePoints = result.strategies.buyHome.points
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
    request.profile.weeklyAvailableToSave = 2600

    const result = simulateWealthPathways(request)
    const purchasePoint = result.strategies.buyHome.points.find(point => point.homeEquityP50 > 0)

    expect(purchasePoint).toBeTruthy()
    expect(purchasePoint.year).toBeGreaterThanOrEqual(request.housingCosts.liveAtHomeYears)
  })

  it('uses the first-home-buyer 5 percent deposit path when support is enabled', () => {
    const regularRequest = cloneSimulationRequest()
    regularRequest.simulationSettings.iterations = 120
    regularRequest.profile.startingSavings = 100000
    regularRequest.propertyConfig.firstHomeBuyerEligible = false

    const firstHomeBuyerRequest = cloneSimulationRequest()
    firstHomeBuyerRequest.simulationSettings.iterations = 120
    firstHomeBuyerRequest.profile.startingSavings = 100000
    firstHomeBuyerRequest.propertyConfig.firstHomeBuyerEligible = true

    const regular = simulateWealthPathways(regularRequest)
    const firstHomeBuyer = simulateWealthPathways(firstHomeBuyerRequest)

    expect(regular.strategies.buyHome.points[0].homeEquityP50).toBe(0)
    expect(firstHomeBuyer.strategies.buyHome.points[0].homeEquityP50).toBeGreaterThan(0)
    expect(firstHomeBuyer.strategies.buyHome.points[0].debtRemainingP50)
      .toBeGreaterThan(regular.strategies.buyHome.points[0].debtRemainingP50)
  })
})
