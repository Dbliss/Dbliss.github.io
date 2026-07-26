import { buildRegionScoutResultsModel, normaliseRegionScoutConfig } from '../regionScout.js'

function createArea(key, { type = 'suburb', price, growthMean, growthVolatility, rentYield, regionKey = null }) {
  return {
    key,
    label: key,
    type,
    regionKey,
    regionLabel: regionKey || key,
    apartment: {
      currentPriceEstimate: price,
      annualGrowthMean: growthMean,
      annualGrowthVolatility: growthVolatility,
      rentYield
    },
    marketHistory: {
      apartment: { actualPoints: [], trendPoints: [], estimatePoint: null },
      salesSummary: { apartmentAverage: 100 }
    }
  }
}

function createContext(areas) {
  return {
    areasByKey: Object.fromEntries(areas.map((area) => [area.key, area])),
    areaOptions: areas.map((area) => ({ key: area.key, label: area.label, type: area.type }))
  }
}

const searchContext = createContext([
  createArea('steady', { price: 600000, growthMean: 0.05, growthVolatility: 0.04, rentYield: 0.04 }),
  createArea('wild', { price: 700000, growthMean: 0.05, growthVolatility: 0.2, rentYield: 0.04 }),
  createArea('expensive', { price: 2000000, growthMean: 0.09, growthVolatility: 0.04, rentYield: 0.04 })
])

describe('region scout search', () => {
  it('normalises a config down to the search inputs only', () => {
    const config = normaliseRegionScoutConfig({
      budget: 812345,
      propertyType: 'unit',
      rentalYieldWeight: 2,
      riskAppetite: 'huge'
    })

    expect(config).toEqual({
      budget: 812000,
      propertyType: 'apartment',
      granularity: 'suburb',
      locationKey: null,
      rentalYieldWeight: 1,
      riskAppetite: 5
    })
    expect(config.targetYears).toBeUndefined()
    expect(config.savingsMode).toBeUndefined()
  })

  it('always ranks at suburb level, even when a region granularity is requested', () => {
    expect(normaliseRegionScoutConfig({ granularity: 'region' }).granularity).toBe('suburb')

    const context = createContext([
      createArea('a-suburb', { type: 'suburb', price: 500000, growthMean: 0.05, growthVolatility: 0.05, rentYield: 0.04, regionKey: 'north' }),
      createArea('north', { type: 'region', price: 500000, growthMean: 0.05, growthVolatility: 0.05, rentYield: 0.04 })
    ])

    const model = buildRegionScoutResultsModel({
      suburbSearchContext: context,
      config: { budget: 800000, granularity: 'region' }
    })

    expect(model.allRecommendations.map((item) => item.key)).toEqual(['a-suburb'])
    expect(model.allRecommendations.every((item) => item.type === 'suburb')).toBe(true)
  })

  it('clamps the budget into a supported range', () => {
    expect(normaliseRegionScoutConfig({ budget: 5 }).budget).toBe(100000)
    expect(normaliseRegionScoutConfig({ budget: 99_000_000 }).budget).toBe(10000000)
  })

  it('flags which areas sit inside the budget without dropping the rest', () => {
    const model = buildRegionScoutResultsModel({
      suburbSearchContext: searchContext,
      config: { budget: 650000 }
    })

    expect(model.totalMatches).toBe(3)
    const byKey = Object.fromEntries(model.allRecommendations.map((item) => [item.key, item]))
    expect(byKey.steady.withinBudget).toBe(true)
    expect(byKey.steady.budgetGap).toBe(50000)
    expect(byKey.wild.withinBudget).toBe(false)
    expect(byKey.wild.budgetGap).toBe(-50000)
  })

  it('ranks a low-volatility area above an identical high-volatility one when risk appetite is small', () => {
    const model = buildRegionScoutResultsModel({
      suburbSearchContext: searchContext,
      config: { budget: 1000000, riskAppetite: 1 }
    })

    const order = model.allRecommendations.map((item) => item.key)
    expect(order.indexOf('steady')).toBeLessThan(order.indexOf('wild'))
  })

  it('scopes suburb results to the selected region', () => {
    const context = createContext([
      createArea('inner-suburb', { type: 'suburb', price: 500000, growthMean: 0.05, growthVolatility: 0.05, rentYield: 0.04, regionKey: 'north' }),
      createArea('outer-suburb', { type: 'suburb', price: 500000, growthMean: 0.05, growthVolatility: 0.05, rentYield: 0.04, regionKey: 'south' }),
      createArea('north', { type: 'region', price: 500000, growthMean: 0.05, growthVolatility: 0.05, rentYield: 0.04 })
    ])

    const model = buildRegionScoutResultsModel({
      suburbSearchContext: context,
      config: { budget: 800000, locationKey: 'north' }
    })

    expect(model.config.granularity).toBe('suburb')
    expect(model.allRecommendations.map((item) => item.key)).toEqual(['inner-suburb'])
    expect(model.scoreReferenceRecommendations).toHaveLength(2)
  })
})
