import { buildDashboardModel, buildDashboardSeries } from '../dashboard.js'

const result = {
  strategyOrder: ['stockQqq', 'buyHouseHome'],
  strategies: {
    stockQqq: {
      key: 'stockQqq',
      group: 'stock',
      baselineEligible: true,
      label: 'QQQ',
      shortLabel: 'QQQ',
      color: '#7dd3fc',
      accent: 'rgba(125, 211, 252, 0.18)',
      summary: {
        finalMedianNetWorth: 500000,
        downsideRisk: 360000,
        finalMedianLiquidAssets: 500000,
        finalMedianHomeEquity: 0,
        finalMedianDebt: 0,
        finalMedianHoldNetWorth: 500000,
        maxMedianCashDeficit: 0,
        finalMedianDisplay: '$500k'
      },
      points: [
        { year: 0, p10: 100000, p50: 100000, p90: 100000, holdNetWorthP10: 100000, holdNetWorthP50: 100000, holdNetWorthP90: 100000, annualSurplusP10: 1000, annualSurplusP50: 2000, annualSurplusP90: 3000, homeEquityP50: 0 },
        { year: 10, p10: 360000, p50: 500000, p90: 720000, holdNetWorthP10: 360000, holdNetWorthP50: 500000, holdNetWorthP90: 720000, annualSurplusP10: 2000, annualSurplusP50: 4000, annualSurplusP90: 6000, homeEquityP50: 0 }
      ]
    },
    buyHouseHome: {
      key: 'buyHouseHome',
      group: 'housing',
      baselineEligible: false,
      label: 'Buy House To Live In',
      shortLabel: 'Own House',
      color: '#10b981',
      accent: 'rgba(16, 185, 129, 0.18)',
      summary: {
        finalMedianNetWorth: 620000,
        downsideRisk: 330000,
        finalMedianLiquidAssets: 110000,
        finalMedianHomeEquity: 650000,
        finalMedianDebt: 140000,
        finalMedianHoldNetWorth: 760000,
        maxMedianCashDeficit: 18000,
        finalMedianDisplay: '$620k'
      },
      points: [
        { year: 0, p10: 100000, p50: 100000, p90: 100000, holdNetWorthP10: 100000, holdNetWorthP50: 100000, holdNetWorthP90: 100000, annualSurplusP10: -2000, annualSurplusP50: -1000, annualSurplusP90: 0, homeEquityP50: 0 },
        { year: 5, p10: 180000, p50: 240000, p90: 310000, holdNetWorthP10: 220000, holdNetWorthP50: 290000, holdNetWorthP90: 350000, annualSurplusP10: -5000, annualSurplusP50: -1000, annualSurplusP90: 1500, homeEquityP50: 120000 },
        { year: 10, p10: 330000, p50: 620000, p90: 910000, holdNetWorthP10: 430000, holdNetWorthP50: 760000, holdNetWorthP90: 1040000, annualSurplusP10: -3000, annualSurplusP50: 2500, annualSurplusP90: 8000, homeEquityP50: 650000 }
      ]
    }
  }
}

describe('wealth dashboard adapters', () => {
  it('derives baseline deltas and breakeven years', () => {
    const dashboard = buildDashboardModel(result, 'stockQqq', 0.03)
    const housing = dashboard.strategies.find(strategy => strategy.key === 'buyHouseHome')

    expect(dashboard.baselineKey).toBe('stockQqq')
    expect(housing.deltaVsBaseline).toBe(120000)
    expect(housing.breakevenYearVsBaseline).toBe(10)
    expect(housing.purchaseYear).toBe(5)
  })

  it('builds metric series for dashboard charts', () => {
    const dashboard = buildDashboardModel(result, 'stockQqq', 0.03)
    const series = buildDashboardSeries(dashboard.strategies, 'annualSurplus', 0.03)

    expect(series[0].points[1].mid).toBe(4000)
    expect(series[1].points[1].low).toBe(-5000)
  })
})
