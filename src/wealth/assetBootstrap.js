import rawWealthAssetBootstrapData from '../data/generated/wealthAssetBootstrap.json'

export const wealthBootstrapAssetOrder = ['qqq', 'asx200', 'vgs', 'vge', 'dbp', 'bonds', 'cash', 'bitcoin']
const wealthBootstrapSharedAssetOrder = ['qqq', 'asx200', 'vgs', 'vge', 'dbp', 'bonds', 'cash']
const wealthBootstrapStandaloneAssetOrder = wealthBootstrapAssetOrder.filter(
  key => !wealthBootstrapSharedAssetOrder.includes(key)
)
const ASSET_LOOKBACK_MONTHS = {
  bitcoin: 60
}

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
  const rawMonthlyReturns = Array.isArray(entry?.monthlyReturns)
    ? entry.monthlyReturns.map(normaliseMonthlyReturn).filter(Boolean)
    : []
  const maxLookbackMonths = ASSET_LOOKBACK_MONTHS[key] || 0
  const monthlyReturns = maxLookbackMonths > 0
    ? rawMonthlyReturns.slice(-maxLookbackMonths)
    : rawMonthlyReturns

  return {
    key,
    label: entry?.label || key,
    ticker: entry?.ticker || '',
    currency: entry?.currency || '',
    lookbackYears: roundLookbackYears(monthlyReturns.length),
    source: entry?.source || '',
    sourceUrl: entry?.sourceUrl || '',
    startMonth: monthlyReturns[0]?.month ?? entry?.startMonth ?? null,
    endMonth: monthlyReturns[monthlyReturns.length - 1]?.month ?? entry?.endMonth ?? null,
    months: monthlyReturns.length,
    monthlyReturns
  }
}

function roundLookbackYears(monthCount) {
  return Math.round((Math.max(0, Number(monthCount) || 0) / 12) * 10) / 10
}

function trimAssetToMonths(asset, months) {
  const monthlyReturns = asset.monthlyReturns.filter(entry => months.has(entry.month))
  return {
    ...asset,
    lookbackYears: roundLookbackYears(monthlyReturns.length),
    startMonth: monthlyReturns[0]?.month ?? null,
    endMonth: monthlyReturns[monthlyReturns.length - 1]?.month ?? null,
    months: monthlyReturns.length,
    monthlyReturns
  }
}

// Shared funds are sampled at the same calendar months so that how they move together survives,
// for example shares falling while bonds rise in the same crisis. That needs months every shared
// fund has, so each shared history is trimmed to the window they all cover.
function alignSharedAssets(assets) {
  const sharedWithData = wealthBootstrapSharedAssetOrder.filter(key => assets[key]?.monthlyReturns.length)
  const commonMonths = sharedWithData.reduce((common, key) => {
    const months = new Set(assets[key].monthlyReturns.map(entry => entry.month))
    return common === null ? months : new Set([...common].filter(month => months.has(month)))
  }, null)
  if (!commonMonths || commonMonths.size === 0) return null

  sharedWithData.forEach((key) => {
    assets[key] = trimAssetToMonths(assets[key], commonMonths)
  })
  const reference = assets[sharedWithData[0]]
  return {
    assetKeys: sharedWithData,
    startMonth: reference.startMonth,
    endMonth: reference.endMonth,
    months: reference.months
  }
}

export const wealthAssetBootstrapData = (() => {
  const assets = Object.fromEntries(
    wealthBootstrapAssetOrder.map((key) => [key, normaliseAsset(rawWealthAssetBootstrapData?.assets?.[key], key)])
  )
  const sharedWindow = alignSharedAssets(assets)

  return {
    generatedAt: rawWealthAssetBootstrapData?.generatedAt || null,
    monthsPerSimulationYear: Math.max(1, Number(rawWealthAssetBootstrapData?.monthsPerSimulationYear) || 12),
    sharedWindow,
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

  const sharedWindow = wealthAssetBootstrapData.sharedWindow
  if (sharedWindow?.assetKeys.includes(assetKey)) {
    // Every shared fund holds the same months in the same order, so one sampled set of
    // positions reads each fund at the same calendar months.
    if (!Array.isArray(cachedSequences.__shared__)) {
      const positions = Array.from({ length: sharedWindow.months }, (_, index) => index)
      cachedSequences.__shared__ = buildSampledMonthSequence(positions, random, options)
    }
    cachedSequences[assetKey] = cachedSequences.__shared__.map(index => monthlyReturns[index])
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
    vgsReturn: sampleAssetYear('vgs'),
    vgeReturn: sampleAssetYear('vge'),
    dbpReturn: sampleAssetYear('dbp'),
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
