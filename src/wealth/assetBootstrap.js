import rawWealthAssetBootstrapData from '../data/generated/wealthAssetBootstrap.json'

export const wealthBootstrapAssetOrder = ['qqq', 'asx200', 'bonds', 'cash', 'bitcoin']
const wealthBootstrapSharedAssetOrder = ['qqq', 'asx200', 'bonds', 'cash']
const wealthBootstrapStandaloneAssetOrder = wealthBootstrapAssetOrder.filter(
  key => !wealthBootstrapSharedAssetOrder.includes(key)
)

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

function clampInteger(value, min, max) {
  return Math.min(Math.max(Math.round(Number(value) || 0), min), max)
}

function resolveBootstrapMethod(options = {}) {
  return options?.bootstrapMethod === 'historical-monthly'
    ? 'historical-monthly'
    : 'historical-block'
}

function resolveBlockSizeMonths(options = {}) {
  return clampInteger(options?.bootstrapBlockSizeMonths, 1, wealthAssetBootstrapData.monthsPerSimulationYear) || 3
}

function buildSampledMonthSequence(monthlyReturns, random, options = {}) {
  const monthsPerSimulationYear = wealthAssetBootstrapData.monthsPerSimulationYear
  if (!monthlyReturns.length) return []

  if (resolveBootstrapMethod(options) === 'historical-monthly') {
    return Array.from({ length: monthsPerSimulationYear }, () => {
      const sampleIndex = Math.floor(random() * monthlyReturns.length)
      return monthlyReturns[sampleIndex]
    })
  }

  const blockSizeMonths = Math.min(resolveBlockSizeMonths(options), monthlyReturns.length)
  const sampledMonths = []

  while (sampledMonths.length < monthsPerSimulationYear) {
    const maxStartIndex = Math.max(0, monthlyReturns.length - blockSizeMonths)
    const startIndex = Math.floor(random() * (maxStartIndex + 1))

    for (
      let offset = 0;
      offset < blockSizeMonths && sampledMonths.length < monthsPerSimulationYear;
      offset += 1
    ) {
      sampledMonths.push(monthlyReturns[startIndex + offset])
    }
  }

  return sampledMonths
}

function compoundMonthlyReturns(sampledMonths) {
  if (!sampledMonths.length) return 0
  return sampledMonths.reduce((compoundedReturn, month) => (
    compoundedReturn * (1 + month.totalReturn)
  ), 1) - 1
}

function resolveMonthlySequenceForAsset(assetKey, random, options = {}, cachedSequences = {}) {
  const asset = wealthAssetBootstrapData.assets[assetKey]
  const monthlyReturns = asset?.monthlyReturns || []

  if (!monthlyReturns.length) return []
  if (Array.isArray(cachedSequences[assetKey])) return cachedSequences[assetKey]

  if (wealthBootstrapSharedAssetOrder.includes(assetKey)) {
    if (!Array.isArray(cachedSequences.__shared__)) {
      cachedSequences.__shared__ = buildSampledMonthSequence(monthlyReturns, random, options)
    }
    cachedSequences[assetKey] = cachedSequences.__shared__
    return cachedSequences[assetKey]
  }

  cachedSequences[assetKey] = buildSampledMonthSequence(monthlyReturns, random, options)
  return cachedSequences[assetKey]
}

export function createBootstrapPortfolioSampler(random, options = {}) {
  const cachedSequences = {}
  const cachedReturns = {}

  function sampleAssetYear(assetKey) {
    if (Object.prototype.hasOwnProperty.call(cachedReturns, assetKey)) return cachedReturns[assetKey]
    const sampledMonths = resolveMonthlySequenceForAsset(assetKey, random, options, cachedSequences)
    const totalReturn = compoundMonthlyReturns(sampledMonths)
    cachedReturns[assetKey] = totalReturn
    return totalReturn
  }

  sampleAssetYear.sampleAll = () => ({
    qqqReturn: sampleAssetYear('qqq'),
    asxReturn: sampleAssetYear('asx200'),
    bondReturn: sampleAssetYear('bonds'),
    cashReturn: sampleAssetYear('cash'),
    bitcoinReturn: sampleAssetYear('bitcoin')
  })

  sampleAssetYear.describe = () => ({
    method: resolveBootstrapMethod(options),
    blockSizeMonths: resolveBlockSizeMonths(options),
    sharedAssetKeys: [...wealthBootstrapSharedAssetOrder],
    standaloneAssetKeys: [...wealthBootstrapStandaloneAssetOrder]
  })

  return sampleAssetYear
}

export function sampleBootstrapAssetYear(assetKey, random, options = {}) {
  const sampler = createBootstrapPortfolioSampler(random, options)
  return sampler(assetKey)
}
