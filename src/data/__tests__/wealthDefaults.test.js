import {
  createDefaultScenarioSelection,
  resolveScenarioSelection,
  wealthHousingStrategyKeys,
  wealthStockStrategyKeys
} from '../wealthDefaults.js'

describe('wealth default scenario selection', () => {
  it('keeps all stock and housing strategies by default', () => {
    const selection = createDefaultScenarioSelection()

    expect(selection.selectedScenarioKeys).toEqual([
      ...wealthStockStrategyKeys,
      ...wealthHousingStrategyKeys
    ])
  })

  it('filters to stocks only when housing is disabled', () => {
    const selection = resolveScenarioSelection({
      includeStocks: true,
      includeHousing: false,
      selectedScenarioKeys: [...wealthStockStrategyKeys]
    })

    expect(selection.selectedScenarioKeys).toEqual(wealthStockStrategyKeys)
  })

  it('filters to housing only when stocks are disabled', () => {
    const selection = resolveScenarioSelection({
      includeStocks: false,
      includeHousing: true,
      selectedScenarioKeys: [...wealthHousingStrategyKeys]
    })

    expect(selection.selectedScenarioKeys).toEqual(wealthHousingStrategyKeys)
    expect(selection.stockBaselineKey).toBe(null)
  })

  it('keeps a chosen stock baseline when it remains available', () => {
    const selection = resolveScenarioSelection({
      includeStocks: true,
      includeHousing: true,
      selectedScenarioKeys: [...wealthStockStrategyKeys, ...wealthHousingStrategyKeys],
      stockBaselineKey: 'stockCash'
    })

    expect(selection.stockBaselineKey).toBe('stockCash')
  })
})
