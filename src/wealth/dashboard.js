import { wealthDefaultStockBaselineKey } from '../data/wealthDefaults.js'

function orderStrategyKeys(result) {
  if (Array.isArray(result?.strategyOrder) && result.strategyOrder.length) return result.strategyOrder
  return Object.keys(result?.strategies || {})
}

function resolveBaselineKey(result, requestedBaselineKey) {
  if (requestedBaselineKey && result?.strategies?.[requestedBaselineKey]) return requestedBaselineKey
  if (result?.strategies?.[wealthDefaultStockBaselineKey]) return wealthDefaultStockBaselineKey
  return orderStrategyKeys(result).find(key => result?.strategies?.[key]?.baselineEligible) || null
}

function getPurchaseYear(strategy) {
  const purchasePoint = strategy.points.find(point => point.homeEquityP50 > 0)
  return purchasePoint ? purchasePoint.year : null
}

function getBreakevenYearVsBaseline(strategy, baseline) {
  if (!baseline || strategy.group !== 'housing') return null
  const hit = strategy.points.find((point) => {
    const baselinePoint = baseline.points.find(candidate => candidate.year === point.year)
    return baselinePoint && point.p50 > baselinePoint.p50
  })
  return hit ? hit.year : null
}

function buildNarrative(strategy, baseline, deltaVsBaseline) {
  if (strategy.group === 'stock') {
    return `${strategy.label} stays liquid and finishes at a median ${strategy.summary.finalMedianDisplay}.`
  }

  if (!baseline) {
    return `${strategy.label} reaches a median after-tax outcome of ${strategy.summary.finalMedianDisplay}.`
  }

  if (deltaVsBaseline > 0) {
    return `${strategy.label} finishes ahead of ${baseline.label} by ${formatCurrency(deltaVsBaseline)} on the median path.`
  }

  if (deltaVsBaseline < 0) {
    return `${strategy.label} finishes behind ${baseline.label} by ${formatCurrency(Math.abs(deltaVsBaseline))} on the median path.`
  }

  return `${strategy.label} finishes level with ${baseline.label} on the median path.`
}

function formatCurrency(value) {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    maximumFractionDigits: 0
  }).format(Number(value) || 0)
}

export function buildDashboardModel(result, requestedBaselineKey, inflationRate = 0.03) {
  const baselineKey = resolveBaselineKey(result, requestedBaselineKey)
  const baseline = baselineKey ? result?.strategies?.[baselineKey] || null : null
  const strategies = orderStrategyKeys(result)
    .map((key) => {
      const strategy = result.strategies[key]
      const purchaseYear = getPurchaseYear(strategy)
      const breakevenYearVsBaseline = getBreakevenYearVsBaseline(strategy, baseline)
      const finalPoint = strategy.points[strategy.points.length - 1]
      const deltaVsBaseline = baseline ? strategy.summary.finalMedianNetWorth - baseline.summary.finalMedianNetWorth : 0
      const variabilitySpread = finalPoint ? finalPoint.p90 - finalPoint.p10 : 0

      return {
        ...strategy,
        purchaseYear,
        breakevenYearVsBaseline,
        deltaVsBaseline,
        variabilitySpread,
        narrative: buildNarrative(strategy, baseline, deltaVsBaseline),
        baselineLabel: baseline?.label || null,
        inflationRate
      }
    })

  const housingStrategies = strategies.filter(strategy => strategy.group === 'housing')

  return {
    baselineKey,
    baseline,
    strategies,
    kpis: {
      bestMedian: strategies.reduce((best, strategy) =>
        !best || strategy.summary.finalMedianNetWorth > best.summary.finalMedianNetWorth ? strategy : best
      , null),
      downsideLeader: strategies.reduce((best, strategy) =>
        !best || strategy.summary.downsideRisk > best.summary.downsideRisk ? strategy : best
      , null),
      variabilityLeader: strategies.reduce((best, strategy) =>
        !best || strategy.variabilitySpread > best.variabilitySpread ? strategy : best
      , null),
      firstHousingBeatBaseline: housingStrategies
        .filter(strategy => strategy.breakevenYearVsBaseline !== null)
        .sort((left, right) => left.breakevenYearVsBaseline - right.breakevenYearVsBaseline)[0] || null
    },
    narratives: strategies.slice(0, 3).map(strategy => strategy.narrative),
    compositionRows: housingStrategies.map(strategy => ({
      key: strategy.key,
      label: strategy.shortLabel,
      liquid: Math.max(0, strategy.summary.finalMedianLiquidAssets),
      equity: Math.max(0, strategy.summary.finalMedianHomeEquity),
      debt: Math.max(0, strategy.summary.finalMedianDebt),
      total: strategy.summary.finalMedianHoldNetWorth
    }))
  }
}

function discountToToday(value, year, inflationRate) {
  const safeRate = Math.max(0, Number(inflationRate) || 0)
  return Math.round((Number(value) || 0) / Math.pow(1 + safeRate, year))
}

export function buildDashboardSeries(strategies, metric, inflationRate = 0.03) {
  return strategies.map((strategy) => ({
    id: strategy.key,
    label: strategy.label,
    color: strategy.color,
    accent: strategy.accent,
    points: strategy.points.map((point) => {
      if (metric === 'annualSurplus') {
        return {
          year: point.year,
          low: point.annualSurplusP10,
          mid: point.annualSurplusP50,
          high: point.annualSurplusP90
        }
      }

      if (metric === 'holdBalance') {
        return {
          year: point.year,
          low: point.holdNetWorthP10,
          mid: point.holdNetWorthP50,
          high: point.holdNetWorthP90
        }
      }

      if (metric === 'inflationAdjusted') {
        return {
          year: point.year,
          low: discountToToday(point.p10, point.year, inflationRate),
          mid: discountToToday(point.p50, point.year, inflationRate),
          high: discountToToday(point.p90, point.year, inflationRate)
        }
      }

      return {
        year: point.year,
        low: point.p10,
        mid: point.p50,
        high: point.p90
      }
    })
  }))
}
