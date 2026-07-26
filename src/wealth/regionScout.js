import {
  clamp,
  createMulberry32,
  percentileSummary,
  sampleNormal
} from './finance.js'

const DEFAULT_REGION_SCOUT_CONFIG = {
  budget: 800000,
  propertyType: 'apartment',
  granularity: 'suburb',
  locationKey: null,
  rentalYieldWeight: 0,
  riskAppetite: 5
}

const MIN_BUDGET = 100000
const MAX_BUDGET = 10000000
const MIN_RISK_TOLERANCE = 1
const MAX_RISK_TOLERANCE = 10
// The scout only ever ranks suburbs. A location, when set, narrows which suburbs are in scope.
const RESULT_AREA_TYPE = 'suburb'

export function normaliseRegionScoutConfig(config = {}) {
  const locationKey = typeof config.locationKey === 'string' && config.locationKey.trim()
    ? config.locationKey.trim()
    : null

  return {
    budget: roundToNearestThousand(clamp(Number(config.budget) || DEFAULT_REGION_SCOUT_CONFIG.budget, MIN_BUDGET, MAX_BUDGET)),
    propertyType: config.propertyType === 'house' ? 'house' : 'apartment',
    granularity: RESULT_AREA_TYPE,
    locationKey,
    rentalYieldWeight: clamp(Number(config.rentalYieldWeight) || 0, 0, 1),
    riskAppetite: normaliseRiskTolerance(config.riskAppetite)
  }
}

export function buildRegionScoutResultsModel({ suburbSearchContext, config }) {
  const resolvedConfig = normaliseRegionScoutConfig(config)
  const location = resolvedConfig.locationKey
    ? suburbSearchContext?.areasByKey?.[resolvedConfig.locationKey] || null
    : null

  const statewideCandidates = Object.values(suburbSearchContext?.areasByKey || {})
    .filter((area) => area?.type === RESULT_AREA_TYPE)
    .map((area) => buildRecommendation(area, resolvedConfig))
    .filter(Boolean)

  const candidates = statewideCandidates
    .filter((area) => matchesLocation(area, location))
    .sort(compareRecommendations)
  const scoreReferenceRecommendations = [...statewideCandidates].sort(compareRecommendations)

  return {
    config: resolvedConfig,
    location,
    allRecommendations: candidates,
    scoreReferenceRecommendations,
    recommendations: candidates.slice(0, 12),
    totalMatches: candidates.length,
    hasRecommendations: candidates.length > 0
  }
}

function buildRecommendation(area, config) {
  const property = area?.[config.propertyType]
  const priceToday = Math.max(0, Number(property?.currentPriceEstimate ?? property?.latestActualPrice) || 0)
  const growthMean = Number(property?.annualGrowthMean)
  if (!(priceToday > 0) || !Number.isFinite(growthMean)) return null

  const growthVolatility = clamp(Number(property?.annualGrowthVolatility) || Math.max(Math.abs(growthMean) * 1.4, 0.04), 0.03, 0.25)
  const marketScore = buildMarketScore(area, config.propertyType, priceToday, growthMean, growthVolatility, config, seedFromKey(area.key))
  const actualPoints = area?.marketHistory?.[config.propertyType]?.actualPoints || []
  const firstYear = actualPoints[0]?.year || null
  const lastYear = actualPoints[actualPoints.length - 1]?.year || null
  const historyYears = firstYear && lastYear ? Math.max(1, (lastYear - firstYear) + 1) : actualPoints.length
  const salesAverage = Number(
    property?.dataSourceSalesAverage
      ?? area?.marketHistory?.salesSummary?.[`${config.propertyType}Average`]
  ) || 0
  const monteCarloSeries = buildMonteCarloSeries(area, config.propertyType, priceToday, growthMean, growthVolatility, 30, seedFromKey(area.key))

  return {
    key: area.key,
    label: area.label,
    suburb: area.suburb || area.label,
    postcode: area.postcode || null,
    type: area.type,
    regionKey: area.regionKey || null,
    regionLabel: area.regionLabel || area.label,
    priceToday,
    budgetGap: config.budget - priceToday,
    withinBudget: priceToday <= config.budget,
    growthMean,
    expectedAnnualGrowth: marketScore.growthMedian,
    growthVolatility: marketScore.growthVolatility,
    expectedAnnualYield: marketScore.yieldMedian,
    yieldVolatility: marketScore.yieldVolatility,
    expectedValueInTenYears: monteCarloSeries.find((point) => point.year === 10)?.mid || priceToday,
    rankingScore: marketScore.combinedScore,
    historyYears,
    salesAverage,
    marketDataSourceKey: property?.dataSourceAreaKey || area.key,
    marketDataSourceLabel: property?.dataSourceAreaLabel || area.label,
    marketDataSourceType: property?.dataSourceAreaType || 'suburb',
    actualPoints,
    trendPoints: area?.marketHistory?.[config.propertyType]?.trendPoints || [],
    estimatePoint: area?.marketHistory?.[config.propertyType]?.estimatePoint || null,
    yieldActualPoints: getYieldActualPoints(area, config.propertyType),
    yieldTrendPoints: buildYieldTrendPoints(area, config.propertyType),
    monteCarloSeries
  }
}

function buildMonteCarloSeries(area, propertyType, startPrice, growthMean, growthVolatility, horizonYears, seed) {
  const random = createMulberry32(seed)
  const propertyGrowthBlockSampler = createPropertyGrowthBlockSampler(random, area)
  const property = area?.[propertyType]
  const lowerBound = propertyType === 'house' ? -0.25 : -0.18
  const upperBound = propertyType === 'house' ? 0.25 : 0.18
  const samplesByYear = Array.from({ length: horizonYears + 1 }, () => [])
  const iterations = 220

  for (let iteration = 0; iteration < iterations; iteration += 1) {
    let price = Math.max(0, Number(startPrice) || 0)
    samplesByYear[0].push(price)
    for (let year = 1; year <= horizonYears; year += 1) {
      const sampledPropertyGrowthBlock = propertyGrowthBlockSampler ? propertyGrowthBlockSampler() : null
      const sampledGrowth = samplePropertyGrowthRate(
        random,
        property,
        growthMean,
        growthVolatility,
        lowerBound,
        upperBound,
        sampledPropertyGrowthBlock?.[propertyType === 'house' ? 'houseGrowth' : 'apartmentGrowth']
      )
      price = Math.max(0, price * (1 + sampledGrowth))
      samplesByYear[year].push(price)
    }
  }

  return samplesByYear.map((values, year) => {
    const summary = percentileSummary(values)
    return {
      year,
      low: roundToNearestThousand(summary.p10),
      mid: roundToNearestThousand(summary.p50),
      high: roundToNearestThousand(summary.p90)
    }
  })
}

function compareRecommendations(left, right) {
  if (right.rankingScore !== left.rankingScore) return right.rankingScore - left.rankingScore
  if (right.growthMean !== left.growthMean) return right.growthMean - left.growthMean
  if (right.salesAverage !== left.salesAverage) return right.salesAverage - left.salesAverage
  return left.priceToday - right.priceToday
}

function buildMarketScore(area, propertyType, startPrice, growthMean, growthVolatility, config, seed) {
  const random = createMulberry32(seed ^ 0x9e3779b9)
  const propertyGrowthBlockSampler = createPropertyGrowthBlockSampler(random, area)
  const property = area?.[propertyType]
  const lowerBound = propertyType === 'house' ? -0.25 : -0.18
  const upperBound = propertyType === 'house' ? 0.25 : 0.18
  const yieldSampler = createPropertyYieldSampler(random, area?.[propertyType])
  const growthOutcomes = []
  const yieldOutcomes = []
  const priceSamplesByYear = Array.from({ length: 31 }, () => [])
  const iterations = 220

  for (let iteration = 0; iteration < iterations; iteration += 1) {
    let price = Math.max(0, Number(startPrice) || 0)
    let yieldTotal = 0
    priceSamplesByYear[0].push(price)
    for (let year = 1; year <= 30; year += 1) {
      const sampledPropertyGrowthBlock = propertyGrowthBlockSampler ? propertyGrowthBlockSampler() : null
      const sampledGrowth = samplePropertyGrowthRate(
        random,
        property,
        growthMean,
        growthVolatility,
        lowerBound,
        upperBound,
        sampledPropertyGrowthBlock?.[propertyType === 'house' ? 'houseGrowth' : 'apartmentGrowth']
      )
      price = Math.max(0, price * (1 + sampledGrowth))
      priceSamplesByYear[year].push(price)
      yieldTotal += yieldSampler()
    }
    growthOutcomes.push(Math.pow(price / Math.max(startPrice, 1), 1 / 30) - 1)
    yieldOutcomes.push(yieldTotal / 30)
  }

  const growthMedianPathAnnualIncrease = calculateMedianPathAverageAnnualIncrease(priceSamplesByYear)
  const growthMedianRaw = percentileSummary(growthOutcomes).p50
  const yieldMedianRaw = percentileSummary(yieldOutcomes).p50
  const growthMedian = Number.isFinite(growthMedianPathAnnualIncrease)
    ? growthMedianPathAnnualIncrease
    : (Number.isFinite(growthMedianRaw) ? growthMedianRaw : (Number(growthMean) || 0))
  const fallbackYield = getFallbackRentYield(area?.[propertyType])
  const yieldMedian = Number.isFinite(yieldMedianRaw) ? yieldMedianRaw : fallbackYield
  const growthOutcomeVolatility = Number.isFinite(calculateStandardDeviation(growthOutcomes))
    ? calculateStandardDeviation(growthOutcomes)
    : Math.max(0, Number(growthVolatility) || 0)
  const yieldOutcomeVolatility = Number.isFinite(calculateStandardDeviation(yieldOutcomes))
    ? calculateStandardDeviation(yieldOutcomes)
    : 0
  const growthScore = calculateWeightedPreferenceScore(growthMedian, growthOutcomeVolatility, config.riskAppetite)
  const yieldScore = calculateWeightedPreferenceScore(yieldMedian, yieldOutcomeVolatility, config.riskAppetite)
  const combinedScore = (growthScore * (1 - config.rentalYieldWeight)) + (yieldScore * config.rentalYieldWeight)

  return {
    growthMedian,
    yieldMedian,
    growthVolatility: growthOutcomeVolatility,
    yieldVolatility: yieldOutcomeVolatility,
    growthScore,
    yieldScore,
    combinedScore
  }
}

function calculateMedianPathAverageAnnualIncrease(priceSamplesByYear = []) {
  if (!Array.isArray(priceSamplesByYear) || priceSamplesByYear.length < 2) return null

  const medianPath = priceSamplesByYear
    .map((values, year) => {
      if (!Array.isArray(values) || !values.length) return null
      const summary = percentileSummary(values)
      return {
        year,
        value: Number(summary.p50)
      }
    })
    .filter((point) => point && Number.isFinite(point.value) && point.value > 0)

  if (medianPath.length < 2) return null

  const annualChanges = []
  for (let index = 1; index < medianPath.length; index += 1) {
    const previousValue = medianPath[index - 1]?.value
    const currentValue = medianPath[index]?.value
    if (!(previousValue > 0) || !(currentValue > 0)) continue
    annualChanges.push((currentValue / previousValue) - 1)
  }

  if (!annualChanges.length) return null
  return annualChanges.reduce((sum, value) => sum + value, 0) / annualChanges.length
}

function createPropertyYieldSampler(random, property) {
  const model = property?.resolvedYieldModel || property?.yieldModel
  if (!model || typeof model !== 'object') {
    const fallbackYield = getFallbackRentYield(property)
    return () => fallbackYield
  }

  let benchmarkYield = clamp(
    Number(model.benchmarkCurrentYield ?? model.benchmarkLongTermMean ?? model.longTermMean ?? model.currentYield) || 0,
    0.01,
    0.12
  )
  let spread = Number(model.currentYield) - benchmarkYield
  if (!Number.isFinite(spread)) {
    spread = Number(model.spreadMean) || 0
  }

  const benchmarkMean = clamp(
    Number(model.benchmarkLongTermMean ?? model.longTermMean ?? benchmarkYield) || benchmarkYield,
    0.01,
    0.12
  )
  const benchmarkTheta = clamp(Number(model.benchmarkMeanReversionSpeed) || 0.2, 0.05, 0.95)
  const benchmarkSigma = clamp(Number(model.benchmarkVolatility) || 0.003, 0.0005, 0.03)
  const spreadMean = clamp(Number(model.spreadMean) || 0, -0.06, 0.06)
  const spreadTheta = clamp(Number(model.spreadMeanReversionSpeed) || Number(model.meanReversionSpeed) || 0.25, 0.05, 0.95)
  const spreadSigma = clamp(Number(model.spreadVolatility) || Number(model.volatility) || 0.003, 0.0005, 0.04)

  return () => {
    benchmarkYield = clamp(
      benchmarkYield + benchmarkTheta * (benchmarkMean - benchmarkYield) + sampleNormal(random, 0, benchmarkSigma),
      0.01,
      0.12
    )
    spread = clamp(
      spread + spreadTheta * (spreadMean - spread) + sampleNormal(random, 0, spreadSigma),
      -0.06,
      0.08
    )
    return clamp(benchmarkYield + spread, 0.01, 0.12)
  }
}

function getFallbackRentYield(property) {
  return clamp(Number(property?.rentYield) || Number(property?.resolvedYieldModel?.currentYield) || Number(property?.yieldModel?.currentYield) || 0.04, 0.01, 0.12)
}

function getYieldActualPoints(area, propertyType) {
  const yieldModel = area?.[propertyType]?.resolvedYieldModel || area?.[propertyType]?.yieldModel
  return Array.isArray(yieldModel?.actualYieldPoints) ? yieldModel.actualYieldPoints : []
}

function buildYieldTrendPoints(area, propertyType) {
  const yieldModel = area?.[propertyType]?.resolvedYieldModel || area?.[propertyType]?.yieldModel
  const points = Array.isArray(yieldModel?.actualYieldPoints) ? yieldModel.actualYieldPoints : []
  const mean = Number(yieldModel?.longTermMean)
  if (!points.length || !Number.isFinite(mean)) return []

  return points.map((point) => ({
    year: point.year,
    value: mean
  }))
}

function createPropertyGrowthBlockSampler(random, area) {
  const historicalBlocks = Array.isArray(area?.historicalAnnualGrowthBlocks)
    ? area.historicalAnnualGrowthBlocks
        .map((block) => ({
          year: Math.round(Number(block?.year) || 0),
          houseGrowth: Number.isFinite(Number(block?.houseGrowth)) ? Number(block.houseGrowth) : null,
          apartmentGrowth: Number.isFinite(Number(block?.apartmentGrowth)) ? Number(block.apartmentGrowth) : null
        }))
        .filter((block) =>
          Number.isFinite(block.year) &&
          (Number.isFinite(block.houseGrowth) || Number.isFinite(block.apartmentGrowth))
        )
    : []

  if (!historicalBlocks.length) return null

  return () => {
    const block = historicalBlocks[Math.floor(random() * historicalBlocks.length)]
    return {
      houseGrowth: Number.isFinite(block.houseGrowth) ? clamp(block.houseGrowth, -0.25, 0.25) : null,
      apartmentGrowth: Number.isFinite(block.apartmentGrowth) ? clamp(block.apartmentGrowth, -0.18, 0.18) : null
    }
  }
}

function samplePropertyGrowthRate(random, property, growthMean, growthVolatility, lowerBound, upperBound, sampledBlockValue = null) {
  if (Number.isFinite(sampledBlockValue)) {
    return clamp(Number(sampledBlockValue), lowerBound, upperBound)
  }

  const historicalSeries = Array.isArray(property?.historicalAnnualGrowthRates)
    ? property.historicalAnnualGrowthRates.filter((value) => Number.isFinite(Number(value))).map((value) => Number(value))
    : []

  if (historicalSeries.length) {
    const sampled = historicalSeries[Math.floor(random() * historicalSeries.length)]
    return clamp(sampled, lowerBound, upperBound)
  }

  return clamp(sampleNormal(random, growthMean, growthVolatility), lowerBound, upperBound)
}

function calculateWeightedPreferenceScore(median, volatility, riskAppetite = DEFAULT_REGION_SCOUT_CONFIG.riskAppetite) {
  const safeMedian = Number.isFinite(Number(median)) ? Number(median) : 0
  const safeVolatility = Math.max(0, Math.abs(Number(volatility) || 0))
  const tolerance = normaliseRiskTolerance(riskAppetite)
  const volatilityPenaltyMultiplier = tolerance <= 5
    ? 1.5 - (((tolerance - 1) / 4) * 0.75)
    : 0.75 - (((tolerance - 5) / 5) * 0.65)
  return safeMedian - (safeVolatility * volatilityPenaltyMultiplier)
}

function normaliseRiskTolerance(value) {
  const legacyValues = { small: 1, medium: 5, large: 10 }
  const numericValue = legacyValues[value] ?? Number(value)
  if (!Number.isFinite(numericValue)) return DEFAULT_REGION_SCOUT_CONFIG.riskAppetite
  return Math.round(clamp(numericValue, MIN_RISK_TOLERANCE, MAX_RISK_TOLERANCE))
}

function calculateStandardDeviation(values = []) {
  if (!Array.isArray(values) || values.length < 2) return 0
  const mean = values.reduce((sum, value) => sum + (Number(value) || 0), 0) / values.length
  const variance = values.reduce((sum, value) => {
    const diff = (Number(value) || 0) - mean
    return sum + (diff * diff)
  }, 0) / values.length
  return Math.sqrt(Math.max(variance, 0))
}

function matchesLocation(area, location) {
  if (!location) return true
  if (area.regionKey && location.key) return area.regionKey === location.key
  return area.regionLabel === location.label
}

function roundToNearestThousand(value) {
  return Math.round((Math.max(0, Number(value) || 0)) / 1000) * 1000
}

function seedFromKey(key = '') {
  return String(key).split('').reduce((hash, character) => ((hash * 31) + character.charCodeAt(0)) >>> 0, 7)
}
