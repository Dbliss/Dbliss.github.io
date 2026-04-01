import yearlyRegionMetricsCsv from '../../temp_data_aggregated/yearly_region_metrics.csv?raw'
import yearlySubregionMetricsCsv from '../../temp_data_aggregated/yearly_subregion_metrics.csv?raw'
import yearlySuburbMetricsCsv from '../../temp_data_aggregated/yearly_suburb_metrics.csv?raw'
import yipRentalYieldHistoryCsv from '../../temp_data_aggregated/yip_rental_yield_history.csv?raw'
import { buildRentalYieldMarket } from './rentalYieldMarket.js'

const currentMarketYear = new Date().getFullYear()
const minimumPropertySalesCount = 100
const minimumAnnualSalesForCalculations = 10
const minimumRecentHistoryYears = 20
const rentalYieldMarket = buildRentalYieldMarket(yipRentalYieldHistoryCsv, yearlySuburbMetricsCsv)

export const wealthPsiRegionMarketPayload = buildAreaMarketPayload([
  { type: 'region', source: 'temp_data_aggregated/yearly_region_metrics.csv', csvText: yearlyRegionMetricsCsv },
  { type: 'subregion', source: 'temp_data_aggregated/yearly_subregion_metrics.csv', csvText: yearlySubregionMetricsCsv },
  { type: 'suburb', source: 'temp_data_aggregated/yearly_suburb_metrics.csv', csvText: yearlySuburbMetricsCsv }
])

function buildAreaMarketPayload(datasets) {
  const areas = datasets
    .flatMap((dataset) => buildAreasFromCsv(dataset.csvText, dataset.type))
    .sort(sortAreas)

  return {
    metadata: {
      generatedFor: 'wealth pathways area market explorer',
      sources: [...datasets.map((dataset) => dataset.source), rentalYieldMarket.metadata.source],
      currentMarketYear,
      areaCount: areas.length
    },
    areas: areas.map(mergeRentalYieldIntoArea)
  }
}

function buildAreasFromCsv(csvText, type) {
  const rows = parseCsv(csvText)
  const groupedAreas = new Map()

  rows.forEach((row) => {
    const areaSeed = getAreaSeed(row, type)
    if (!areaSeed?.key || !areaSeed.label || !Number.isFinite(areaSeed.year)) return

    const entry = groupedAreas.get(areaSeed.key) || {
      ...areaSeed,
      rows: []
    }

    entry.rows.push({
      year: areaSeed.year,
      housePrice: toNumber(row.median_sale_price_house_aud),
      apartmentPrice: toNumber(row.median_sale_price_apartment_aud),
      houseSales: toNumber(row.sales_count_house),
      apartmentSales: toNumber(row.sales_count_apartment)
    })

    groupedAreas.set(areaSeed.key, entry)
  })

  return [...groupedAreas.values()].map(createAreaRecord).filter(Boolean)
}

function getAreaSeed(row, type) {
  const year = toNumber(row.year)
  const regionLabel = cleanText(row.region_label)
  const regionKey = cleanText(row.region_key)
  const postcode = cleanText(row.postcode)
  const suburb = cleanText(row.suburb)
  const subregionLabel = cleanText(row.subregion_label)
  const suburbLabel = cleanText(row.suburb_label)

  if (type === 'region') {
    return {
      key: regionKey,
      label: regionLabel,
      type,
      year,
      regionKey,
      subregionKey: null,
      regionLabel,
      postcode: null,
      suburb: null,
      searchText: regionLabel
    }
  }

  if (type === 'subregion') {
    if (!postcode || postcode === '0') return null
    const label = postcode
      ? `${postcode} in ${regionLabel}`
      : (subregionLabel || `Subregion in ${regionLabel}`)
    return {
      key: cleanText(row.subregion_key),
      label,
      type,
      year,
      regionKey,
      subregionKey: cleanText(row.subregion_key),
      regionLabel,
      postcode: postcode || null,
      suburb: null,
      searchText: [label, postcode, regionLabel, subregionLabel].filter(Boolean).join(' ')
    }
  }

  const label = suburb
    ? [suburb, postcode].filter(Boolean).join(' ')
    : (suburbLabel || null)

  return {
    key: cleanText(row.suburb_key),
    label,
    type,
    year,
    regionKey,
    subregionKey: cleanText(row.subregion_key),
    regionLabel,
    postcode: postcode || null,
    suburb: suburb || suburbLabel || null,
    searchText: [suburb, suburbLabel, postcode, regionLabel].filter(Boolean).join(' ')
  }
}

function createAreaRecord(area) {
  if (!area || !Array.isArray(area.rows) || !area.rows.length) return null

  const salesSummary = buildSalesSummary(area.rows)
  const rawHouseHistory = salesSummary.houseTotal >= minimumPropertySalesCount
    ? buildPropertyHistory(area.rows, 'housePrice', 'houseSales')
    : createEmptyPropertyHistory()
  const rawApartmentHistory = salesSummary.apartmentTotal >= minimumPropertySalesCount
    ? buildPropertyHistory(area.rows, 'apartmentPrice', 'apartmentSales')
    : createEmptyPropertyHistory()
  const houseHistory = hasRequiredRecentHistory(rawHouseHistory.calculationPoints)
    ? rawHouseHistory
    : createEmptyPropertyHistory()
  const apartmentHistory = hasRequiredRecentHistory(rawApartmentHistory.calculationPoints)
    ? rawApartmentHistory
    : createEmptyPropertyHistory()
  const historicalAnnualGrowthBlocks = buildJointGrowthBlocks(houseHistory.calculationPoints, apartmentHistory.calculationPoints)

  if (salesSummary.houseTotal < minimumPropertySalesCount && salesSummary.apartmentTotal < minimumPropertySalesCount) {
    return null
  }

  return {
    key: area.key,
    label: area.label,
    type: area.type,
    regionKey: area.regionKey || null,
    subregionKey: area.subregionKey || null,
    regionLabel: area.regionLabel,
    suburb: area.suburb,
    postcode: area.postcode,
    searchText: area.searchText,
    house: {
      currentPriceEstimate: houseHistory.estimatePoint?.value ?? houseHistory.latestActualPoint?.value ?? null,
      latestActualPrice: houseHistory.latestActualPoint?.value ?? null,
      annualGrowthMean: houseHistory.growthMean,
      annualGrowthVolatility: houseHistory.growthVolatility,
      historicalAnnualGrowthRates: houseHistory.historicalAnnualGrowthRates,
      yieldModel: null
    },
    apartment: {
      currentPriceEstimate: apartmentHistory.estimatePoint?.value ?? apartmentHistory.latestActualPoint?.value ?? null,
      latestActualPrice: apartmentHistory.latestActualPoint?.value ?? null,
      annualGrowthMean: apartmentHistory.growthMean,
      annualGrowthVolatility: apartmentHistory.growthVolatility,
      historicalAnnualGrowthRates: apartmentHistory.historicalAnnualGrowthRates,
      yieldModel: null
    },
    marketHistory: {
      currentMarketYear,
      house: houseHistory,
      apartment: apartmentHistory,
      historicalAnnualGrowthBlocks,
      salesSummary
    },
    historicalAnnualGrowthBlocks
  }
}

function mergeRentalYieldIntoArea(area) {
  if (!area || typeof area !== 'object') return area

  const yieldModelsForArea = rentalYieldMarket.areasByType?.[area.type]?.[area.key] || {}
  return {
    ...area,
    house: {
      ...(area.house || {}),
      yieldModel: cloneYieldModel(yieldModelsForArea.house)
    },
    apartment: {
      ...(area.apartment || {}),
      yieldModel: cloneYieldModel(yieldModelsForArea.apartment)
    }
  }
}

function cloneYieldModel(model) {
  if (!model || typeof model !== 'object') return null
  return JSON.parse(JSON.stringify(model))
}

function sortAreas(left, right) {
  const typeRank = { suburb: 0, subregion: 1, region: 2 }
  if (typeRank[left.type] !== typeRank[right.type]) {
    return typeRank[left.type] - typeRank[right.type]
  }
  return left.label.localeCompare(right.label, 'en-AU')
}

function buildPropertyHistory(rows, priceKey, salesKey) {
  const actualPoints = rows
    .map((row) => ({
      year: Number(row.year),
      value: toNumber(row[priceKey]),
      salesCount: toNumber(row[salesKey])
    }))
    .filter((point) => Number.isFinite(point.year) && Number.isFinite(point.value) && point.value > 0)
    .sort((left, right) => left.year - right.year)

  if (!actualPoints.length) {
    return createEmptyPropertyHistory()
  }

  const calculationPoints = excludeCalculationOutliers(actualPoints)
  if (!calculationPoints.length) {
    return createEmptyPropertyHistory()
  }

  const flaggedActualPoints = actualPoints.map((point) => ({
    ...point,
    ignoredForTrend: !calculationPoints.some((candidate) => candidate.year === point.year && candidate.value === point.value)
  }))

  const model = fitLogTrend(calculationPoints)
  const trendYears = [...new Set([...calculationPoints.map((point) => point.year), currentMarketYear])].sort((a, b) => a - b)
  const trendPoints = trendYears.map((year) => ({
    year,
    value: evaluateLogTrend(model, year)
  }))
  const latestActualPoint = flaggedActualPoints[flaggedActualPoints.length - 1]
  const latestCalculationPoint = calculationPoints[calculationPoints.length - 1]
  const estimatePoint = {
    year: currentMarketYear,
    value: currentMarketYear <= latestCalculationPoint.year
      ? latestCalculationPoint.value
      : evaluateLogTrend(model, currentMarketYear)
  }

  const historicalAnnualGrowthRates = buildHistoricalGrowthSeries(calculationPoints)
  const growthMean = estimateAnnualGrowthMean(calculationPoints, estimatePoint)

  return {
    actualPoints: flaggedActualPoints,
    calculationPoints,
    trendPoints,
    estimatePoint,
    latestActualPoint,
    historicalAnnualGrowthRates,
    growthMean,
    growthVolatility: calculateStandardDeviation(historicalAnnualGrowthRates),
    averageAnnualIncrease: calculateAverageAnnualIncrease(calculationPoints)
  }
}

function createEmptyPropertyHistory() {
  return {
    actualPoints: [],
    calculationPoints: [],
    trendPoints: [],
    estimatePoint: null,
    latestActualPoint: null,
    historicalAnnualGrowthRates: [],
    growthMean: null,
    growthVolatility: null,
    averageAnnualIncrease: null
  }
}

function hasRequiredRecentHistory(points) {
  if (!Array.isArray(points) || !points.length) return false

  const years = new Set(points.map((point) => Number(point.year)).filter(Number.isFinite))
  const endYear = currentMarketYear - 1
  const startYear = endYear - minimumRecentHistoryYears + 1

  for (let year = startYear; year <= endYear; year += 1) {
    if (!years.has(year)) return false
  }

  return true
}

function excludeCalculationOutliers(actualPoints) {
  const candidatePoints = actualPoints.filter((point) => (Number(point.salesCount) || 0) >= minimumAnnualSalesForCalculations)

  return candidatePoints.filter((point, index) => {
    const previousPoint = candidatePoints[index - 1] || null
    const nextPoint = candidatePoints[index + 1] || null

    if (!previousPoint && !nextPoint) return true

    const isMuchHigherThanPrevious = previousPoint ? point.value > previousPoint.value * 10 : false
    const isMuchLowerThanPrevious = previousPoint ? point.value < previousPoint.value / 10 : false
    const isMuchHigherThanNext = nextPoint ? point.value > nextPoint.value * 10 : false
    const isMuchLowerThanNext = nextPoint ? point.value < nextPoint.value / 10 : false

    if (!previousPoint) {
      return !isMuchLowerThanNext && !isMuchHigherThanNext
    }

    if (!nextPoint) {
      return !isMuchLowerThanPrevious && !isMuchHigherThanPrevious
    }

    if (isMuchHigherThanPrevious && isMuchHigherThanNext) return false
    if (isMuchLowerThanPrevious && isMuchLowerThanNext) return false
    return true
  })
}

function estimateAnnualGrowthMean(actualPoints, estimatePoint) {
  if (!estimatePoint || !actualPoints.length) return null

  const anchorPoint = [...actualPoints].reverse().find((point) => estimatePoint.year - point.year >= 8) || actualPoints[0]
  const yearSpan = estimatePoint.year - anchorPoint.year
  if (yearSpan <= 0 || anchorPoint.value <= 0 || estimatePoint.value <= 0) return null
  return Math.pow(estimatePoint.value / anchorPoint.value, 1 / yearSpan) - 1
}

function calculateAverageAnnualIncrease(actualPoints) {
  if (!Array.isArray(actualPoints) || actualPoints.length < 2) return null
  const firstPoint = actualPoints[0]
  const lastPoint = actualPoints[actualPoints.length - 1]
  const yearSpan = lastPoint.year - firstPoint.year
  if (yearSpan <= 0 || firstPoint.value <= 0 || lastPoint.value <= 0) return null
  return Math.pow(lastPoint.value / firstPoint.value, 1 / yearSpan) - 1
}

function buildHistoricalGrowthSeries(points) {
  const growthRates = []

  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1]
    const current = points[index]
    const yearSpan = current.year - previous.year
    if (yearSpan <= 0 || previous.value <= 0 || current.value <= 0) continue
    growthRates.push(Math.pow(current.value / previous.value, 1 / yearSpan) - 1)
  }

  return growthRates
}

function buildJointGrowthBlocks(housePoints, apartmentPoints) {
  const houseGrowthByYear = buildGrowthByYearMap(housePoints)
  const apartmentGrowthByYear = buildGrowthByYearMap(apartmentPoints)
  const years = [...new Set([...Object.keys(houseGrowthByYear), ...Object.keys(apartmentGrowthByYear)].map((value) => Number(value)))].sort((a, b) => a - b)

  return years
    .map((year) => ({
      year,
      houseGrowth: houseGrowthByYear[year] ?? null,
      apartmentGrowth: apartmentGrowthByYear[year] ?? null
    }))
    .filter((block) => Number.isFinite(block.houseGrowth) || Number.isFinite(block.apartmentGrowth))
}

function buildSalesSummary(rows) {
  const houseSales = rows.map((row) => toNumber(row.houseSales)).filter((value) => Number.isFinite(value))
  const apartmentSales = rows.map((row) => toNumber(row.apartmentSales)).filter((value) => Number.isFinite(value))

  return {
    houseTotal: houseSales.reduce((sum, value) => sum + value, 0),
    apartmentTotal: apartmentSales.reduce((sum, value) => sum + value, 0),
    houseAverage: houseSales.length ? houseSales.reduce((sum, value) => sum + value, 0) / houseSales.length : null,
    apartmentAverage: apartmentSales.length ? apartmentSales.reduce((sum, value) => sum + value, 0) / apartmentSales.length : null
  }
}

function buildGrowthByYearMap(points) {
  const growthByYear = {}

  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1]
    const current = points[index]
    if (current.year - previous.year !== 1) continue
    if (previous.value <= 0 || current.value <= 0) continue
    growthByYear[current.year] = (current.value / previous.value) - 1
  }

  return growthByYear
}

function fitLogTrend(points) {
  const minYear = points[0]?.year || currentMarketYear
  const samples = points.map((point) => ({
    x: point.year - minYear,
    y: Math.log(point.value)
  }))

  if (samples.length >= 5) {
    const quadraticCoefficients = solveRobustQuadraticLeastSquares(samples)
    if (quadraticCoefficients) {
      return {
        degree: 2,
        originYear: minYear,
        coefficients: quadraticCoefficients
      }
    }
  }

  if (samples.length >= 2) {
    const linearCoefficients = solveRobustLinearLeastSquares(samples)
    if (linearCoefficients) {
      return {
        degree: 1,
        originYear: minYear,
        coefficients: linearCoefficients
      }
    }
  }

  return {
    degree: 0,
    originYear: minYear,
    coefficients: [samples[0]?.y ?? 0]
  }
}

function evaluateLogTrend(model, year) {
  const offsetYear = year - model.originYear

  if (model.degree === 2) {
    const [a, b, c] = model.coefficients
    return Math.exp(a + (b * offsetYear) + (c * offsetYear * offsetYear))
  }

  if (model.degree === 1) {
    const [a, b] = model.coefficients
    return Math.exp(a + (b * offsetYear))
  }

  return Math.exp(model.coefficients[0])
}

function solveLinearLeastSquares(samples) {
  let sumX = 0
  let sumY = 0
  let sumXX = 0
  let sumXY = 0

  samples.forEach(({ x, y }) => {
    sumX += x
    sumY += y
    sumXX += x * x
    sumXY += x * y
  })

  const denominator = (samples.length * sumXX) - (sumX * sumX)
  if (!denominator) return null

  const slope = ((samples.length * sumXY) - (sumX * sumY)) / denominator
  const intercept = (sumY - (slope * sumX)) / samples.length
  return [intercept, slope]
}

function solveRobustLinearLeastSquares(samples) {
  return solveRobustLeastSquares(samples, solveWeightedLinearLeastSquares, evaluateLinearModel)
}

function solveQuadraticLeastSquares(samples) {
  let sumX = 0
  let sumXX = 0
  let sumXXX = 0
  let sumXXXX = 0
  let sumY = 0
  let sumXY = 0
  let sumXXY = 0

  samples.forEach(({ x, y }) => {
    const x2 = x * x
    sumX += x
    sumXX += x2
    sumXXX += x2 * x
    sumXXXX += x2 * x2
    sumY += y
    sumXY += x * y
    sumXXY += x2 * y
  })

  return solve3x3(
    [
      [samples.length, sumX, sumXX],
      [sumX, sumXX, sumXXX],
      [sumXX, sumXXX, sumXXXX]
    ],
    [sumY, sumXY, sumXXY]
  )
}

function solveRobustQuadraticLeastSquares(samples) {
  return solveRobustLeastSquares(samples, solveWeightedQuadraticLeastSquares, evaluateQuadraticModel)
}

function solveRobustLeastSquares(samples, weightedSolver, evaluator) {
  if (!samples.length) return null

  let weightedSamples = samples.map((sample) => ({ ...sample, w: 1 }))
  let coefficients = weightedSolver(weightedSamples)
  if (!coefficients) return null

  for (let iteration = 0; iteration < 5; iteration += 1) {
    const residuals = samples.map((sample) => Math.abs(sample.y - evaluator(coefficients, sample.x)))
    const scale = median(residuals) * 1.4826
    if (!Number.isFinite(scale) || scale <= 1e-9) break

    weightedSamples = samples
      .map((sample) => {
        const residual = Math.abs(sample.y - evaluator(coefficients, sample.x))
        const ratio = residual / (4.685 * scale)
        if (ratio >= 1) return { ...sample, w: 0 }
        const weight = 1 - (ratio * ratio)
        return { ...sample, w: weight * weight }
      })
      .filter((sample) => sample.w > 0)

    const nextCoefficients = weightedSolver(weightedSamples)
    if (!nextCoefficients) break
    coefficients = nextCoefficients
  }

  return coefficients
}

function solveWeightedLinearLeastSquares(samples) {
  let sumW = 0
  let sumWX = 0
  let sumWY = 0
  let sumWXX = 0
  let sumWXY = 0

  samples.forEach(({ x, y, w }) => {
    sumW += w
    sumWX += w * x
    sumWY += w * y
    sumWXX += w * x * x
    sumWXY += w * x * y
  })

  const denominator = (sumW * sumWXX) - (sumWX * sumWX)
  if (!denominator) return null

  const slope = ((sumW * sumWXY) - (sumWX * sumWY)) / denominator
  const intercept = (sumWY - (slope * sumWX)) / sumW
  return [intercept, slope]
}

function solveWeightedQuadraticLeastSquares(samples) {
  let sumW = 0
  let sumWX = 0
  let sumWXX = 0
  let sumWXXX = 0
  let sumWXXXX = 0
  let sumWY = 0
  let sumWXY = 0
  let sumWXXY = 0

  samples.forEach(({ x, y, w }) => {
    const x2 = x * x
    sumW += w
    sumWX += w * x
    sumWXX += w * x2
    sumWXXX += w * x2 * x
    sumWXXXX += w * x2 * x2
    sumWY += w * y
    sumWXY += w * x * y
    sumWXXY += w * x2 * y
  })

  return solve3x3(
    [
      [sumW, sumWX, sumWXX],
      [sumWX, sumWXX, sumWXXX],
      [sumWXX, sumWXXX, sumWXXXX]
    ],
    [sumWY, sumWXY, sumWXXY]
  )
}

function evaluateLinearModel(coefficients, x) {
  const [a, b] = coefficients
  return a + (b * x)
}

function evaluateQuadraticModel(coefficients, x) {
  const [a, b, c] = coefficients
  return a + (b * x) + (c * x * x)
}

function solve3x3(matrix, vector) {
  const working = matrix.map((row, rowIndex) => [...row, vector[rowIndex]])

  for (let column = 0; column < 3; column += 1) {
    let pivotRow = column
    for (let row = column + 1; row < 3; row += 1) {
      if (Math.abs(working[row][column]) > Math.abs(working[pivotRow][column])) {
        pivotRow = row
      }
    }

    const pivotValue = working[pivotRow][column]
    if (Math.abs(pivotValue) < 1e-12) return null
    if (pivotRow !== column) {
      const temp = working[column]
      working[column] = working[pivotRow]
      working[pivotRow] = temp
    }

    for (let row = column + 1; row < 3; row += 1) {
      const factor = working[row][column] / working[column][column]
      for (let cell = column; cell < 4; cell += 1) {
        working[row][cell] -= factor * working[column][cell]
      }
    }
  }

  const solution = new Array(3).fill(0)
  for (let row = 2; row >= 0; row -= 1) {
    let value = working[row][3]
    for (let column = row + 1; column < 3; column += 1) {
      value -= working[row][column] * solution[column]
    }
    solution[row] = value / working[row][row]
  }

  return solution
}

function calculateStandardDeviation(values) {
  if (values.length < 2) return null
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length
  const variance = values.reduce((sum, value) => sum + ((value - mean) ** 2), 0) / (values.length - 1)
  return Math.sqrt(variance)
}

function median(values) {
  if (!values.length) return 0
  const sorted = [...values].sort((left, right) => left - right)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle]
}

function parseCsv(text) {
  const lines = String(text || '').trim().split(/\r?\n/)
  if (!lines.length) return []

  const headers = parseCsvLine(lines[0])
  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line)
    const row = {}
    headers.forEach((header, index) => {
      row[header] = values[index] ?? ''
    })
    return row
  })
}

function parseCsvLine(line) {
  const values = []
  let current = ''
  let insideQuotes = false

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index]

    if (char === '"') {
      if (insideQuotes && line[index + 1] === '"') {
        current += '"'
        index += 1
      } else {
        insideQuotes = !insideQuotes
      }
      continue
    }

    if (char === ',' && !insideQuotes) {
      values.push(current)
      current = ''
      continue
    }

    current += char
  }

  values.push(current)
  return values
}

function cleanText(value) {
  const text = String(value || '').trim()
  return text || ''
}

function toNumber(value) {
  const safe = Number(String(value ?? '').trim())
  return Number.isFinite(safe) ? safe : null
}
