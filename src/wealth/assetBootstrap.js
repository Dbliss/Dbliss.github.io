import rawWealthAssetBootstrapData from '../data/generated/wealthAssetBootstrap.json'

export const wealthBootstrapAssetOrder = ['qqq', 'asx200', 'bonds', 'cash', 'bitcoin']

function normaliseMonthlyReturn(entry) {
  const totalReturn = Number(entry?.totalReturn)
  if (!Number.isFinite(totalReturn)) return null
  return {
    month: entry?.month || '',
    monthEnd: entry?.monthEnd || null,
    totalReturn
  }
}

function normaliseAsset(entry, key) {
  const monthlyReturns = Array.isArray(entry?.monthlyReturns)
    ? entry.monthlyReturns.map(normaliseMonthlyReturn).filter(Boolean)
    : []

  return {
    key,
    label: entry?.label || key,
    ticker: entry?.ticker || '',
    currency: entry?.currency || '',
    lookbackYears: Math.max(0, Number(entry?.lookbackYears) || 0),
    source: entry?.source || '',
    sourceUrl: entry?.sourceUrl || '',
    startMonth: entry?.startMonth || (monthlyReturns[0]?.month ?? null),
    endMonth: entry?.endMonth || (monthlyReturns[monthlyReturns.length - 1]?.month ?? null),
    months: Math.max(0, Number(entry?.months) || monthlyReturns.length),
    monthlyReturns
  }
}

export const wealthAssetBootstrapData = (() => {
  const assets = Object.fromEntries(
    wealthBootstrapAssetOrder.map((key) => [key, normaliseAsset(rawWealthAssetBootstrapData?.assets?.[key], key)])
  )

  return {
    generatedAt: rawWealthAssetBootstrapData?.generatedAt || null,
    monthsPerSimulationYear: Math.max(1, Number(rawWealthAssetBootstrapData?.monthsPerSimulationYear) || 12),
    assets
  }
})()

export function getWealthBootstrapAssets() {
  return wealthBootstrapAssetOrder.map(key => wealthAssetBootstrapData.assets[key]).filter(Boolean)
}

export function sampleBootstrapAssetYear(assetKey, random) {
  const asset = wealthAssetBootstrapData.assets[assetKey]
  const monthlyReturns = asset?.monthlyReturns || []
  const monthsPerSimulationYear = wealthAssetBootstrapData.monthsPerSimulationYear

  if (!monthlyReturns.length) return 0

  let compoundedReturn = 1
  for (let monthIndex = 0; monthIndex < monthsPerSimulationYear; monthIndex += 1) {
    const sampleIndex = Math.floor(random() * monthlyReturns.length)
    const sampledMonth = monthlyReturns[sampleIndex]
    compoundedReturn *= 1 + sampledMonth.totalReturn
  }

  return compoundedReturn - 1
}
