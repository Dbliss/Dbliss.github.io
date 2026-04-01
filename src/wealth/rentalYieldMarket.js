export function buildRentalYieldMarket(yipCsvText, suburbMetricsCsvText) {
  const yipRows = parseCsv(yipCsvText)
  const suburbMetricRows = parseCsv(suburbMetricsCsvText)
  const suburbSalesByYear = buildSuburbSalesByYear(suburbMetricRows)
  const suburbSeriesByProperty = buildSuburbYieldSeries(yipRows, suburbSalesByYear)
  const nswBenchmarkByProperty = buildNswBenchmarkSeries(suburbSeriesByProperty)
  const groupedAreaSeries = buildGroupedAreaSeries(suburbSeriesByProperty)

  return {
    metadata: {
      source: 'temp_data_aggregated/yip_rental_yield_history.csv',
      suburbCount: Object.keys(groupedAreaSeries.suburb).length
    },
    nswBenchmarkByProperty,
    areasByType: {
      suburb: buildAreaModels(groupedAreaSeries.suburb, nswBenchmarkByProperty),
      subregion: buildAreaModels(groupedAreaSeries.subregion, nswBenchmarkByProperty),
      region: buildAreaModels(groupedAreaSeries.region, nswBenchmarkByProperty)
    }
  }
}

function buildSuburbSalesByYear(rows) {
  const lookup = new Map()

  rows.forEach((row) => {
    const suburbKey = cleanText(row.suburb_key)
    const year = toNumber(row.year)
    if (!suburbKey || !Number.isFinite(year)) return

    lookup.set(`${suburbKey}|${year}`, {
      suburbKey,
      subregionKey: cleanText(row.subregion_key),
      regionKey: cleanText(row.region_key),
      regionLabel: cleanText(row.region_label),
      postcode: cleanText(row.postcode),
      suburb: cleanText(row.suburb),
      houseSales: Math.max(0, toNumber(row.sales_count_house) || 0),
      apartmentSales: Math.max(0, toNumber(row.sales_count_apartment) || 0)
    })
  })

  return lookup
}

function buildSuburbYieldSeries(rows, suburbSalesByYear) {
  const grouped = new Map()

  rows.forEach((row) => {
    const suburbKey = cleanText(row.suburb_key)
    const propertyType = normalisePropertyType(row.property_type)
    const year = extractYear(row.date)
    const yieldValue = toNumber(row.rental_yield_ratio)
    if (!suburbKey || !propertyType || !Number.isFinite(year) || !Number.isFinite(yieldValue) || yieldValue <= 0) return

    const salesEntry = suburbSalesByYear.get(`${suburbKey}|${year}`)
    const fallbackHouseSales = Math.max(0, toNumber(row.sales_count_house_source_csv) || 0)
    const fallbackApartmentSales = Math.max(0, toNumber(row.sales_count_apartment_source_csv) || 0)
    const weight = propertyType === 'house'
      ? (salesEntry?.houseSales ?? fallbackHouseSales)
      : (salesEntry?.apartmentSales ?? fallbackApartmentSales)

    const areaMeta = salesEntry || {
      suburbKey,
      subregionKey: '',
      regionKey: '',
      regionLabel: cleanText(row.region_label),
      postcode: cleanText(row.postcode),
      suburb: cleanText(row.suburb)
    }

    const groupKey = `${suburbKey}|${propertyType}`
    const entry = grouped.get(groupKey) || {
      key: suburbKey,
      type: 'suburb',
      propertyType,
      subregionKey: areaMeta.subregionKey,
      regionKey: areaMeta.regionKey,
      regionLabel: areaMeta.regionLabel,
      postcode: areaMeta.postcode,
      suburb: areaMeta.suburb,
      seriesByYear: new Map()
    }

    entry.seriesByYear.set(year, {
      year,
      value: yieldValue,
      weight: Math.max(0, Number(weight) || 0)
    })
    grouped.set(groupKey, entry)
  })

  return grouped
}

function buildNswBenchmarkSeries(suburbSeriesByProperty) {
  const benchmark = {
    house: new Map(),
    apartment: new Map()
  }

  suburbSeriesByProperty.forEach((entry) => {
    const target = benchmark[entry.propertyType]
    if (!target) return

    entry.seriesByYear.forEach((point, year) => {
      const aggregate = target.get(year) || { weightedValueSum: 0, totalWeight: 0, fallbackValues: [] }
      const weight = Math.max(0, Number(point.weight) || 0)
      if (weight > 0) {
        aggregate.weightedValueSum += point.value * weight
        aggregate.totalWeight += weight
      } else {
        aggregate.fallbackValues.push(point.value)
      }
      target.set(year, aggregate)
    })
  })

  return Object.fromEntries(
    Object.entries(benchmark).map(([propertyType, seriesMap]) => [
      propertyType,
      summariseSeriesMap(seriesMap)
    ])
  )
}

function buildGroupedAreaSeries(suburbSeriesByProperty) {
  const result = {
    suburb: {},
    subregion: {},
    region: {}
  }

  suburbSeriesByProperty.forEach((entry) => {
    const suburbKey = entry.key
    result.suburb[suburbKey] = result.suburb[suburbKey] || {}
    result.suburb[suburbKey][entry.propertyType] = {
      areaKey: suburbKey,
      areaType: 'suburb',
      propertyType: entry.propertyType,
      yearSeries: seriesMapToPoints(entry.seriesByYear)
    }

    if (entry.subregionKey) {
      const subregionKey = entry.subregionKey
      result.subregion[subregionKey] = result.subregion[subregionKey] || {}
      const subregionProperty = result.subregion[subregionKey][entry.propertyType] || {
        areaKey: subregionKey,
        areaType: 'subregion',
        propertyType: entry.propertyType,
        weightedByYear: new Map()
      }
      mergeWeightedSeries(subregionProperty.weightedByYear, entry.seriesByYear)
      result.subregion[subregionKey][entry.propertyType] = subregionProperty
    }

    if (entry.regionKey) {
      const regionKey = entry.regionKey
      result.region[regionKey] = result.region[regionKey] || {}
      const regionProperty = result.region[regionKey][entry.propertyType] || {
        areaKey: regionKey,
        areaType: 'region',
        propertyType: entry.propertyType,
        weightedByYear: new Map()
      }
      mergeWeightedSeries(regionProperty.weightedByYear, entry.seriesByYear)
      result.region[regionKey][entry.propertyType] = regionProperty
    }
  })

  ;['subregion', 'region'].forEach((areaType) => {
    Object.values(result[areaType]).forEach((properties) => {
      Object.values(properties).forEach((propertyEntry) => {
        propertyEntry.yearSeries = summariseSeriesMap(propertyEntry.weightedByYear)
        delete propertyEntry.weightedByYear
      })
    })
  })

  return result
}

function buildAreaModels(areaSeriesByKey, nswBenchmarkByProperty) {
  return Object.fromEntries(
    Object.entries(areaSeriesByKey).map(([areaKey, propertyEntries]) => {
      const nextProperties = {}

      Object.entries(propertyEntries).forEach(([propertyType, propertyEntry]) => {
        const benchmarkSeries = nswBenchmarkByProperty[propertyType] || []
        nextProperties[propertyType] = buildYieldModel(propertyEntry.yearSeries, benchmarkSeries, propertyEntry.areaType)
      })

      return [areaKey, nextProperties]
    })
  )
}

function buildYieldModel(actualYieldPoints, benchmarkSeries, areaType) {
  const usablePoints = Array.isArray(actualYieldPoints)
    ? actualYieldPoints
        .map((point) => ({
          year: Math.round(Number(point?.year) || 0),
          value: Number(point?.value)
        }))
        .filter((point) => Number.isFinite(point.year) && Number.isFinite(point.value) && point.value > 0)
        .sort((left, right) => left.year - right.year)
    : []

  if (usablePoints.length < 6) return null

  const benchmarkByYear = new Map(
    (Array.isArray(benchmarkSeries) ? benchmarkSeries : [])
      .map((point) => [Math.round(Number(point?.year) || 0), Number(point?.value)])
      .filter((entry) => Number.isFinite(entry[0]) && Number.isFinite(entry[1]))
  )

  const spreads = usablePoints
    .map((point) => ({
      year: point.year,
      value: point.value - (benchmarkByYear.get(point.year) ?? point.value)
    }))
    .filter((point) => Number.isFinite(point.value))

  const values = usablePoints.map((point) => point.value)
  const spreadValues = spreads.map((point) => point.value)
  const currentYield = usablePoints[usablePoints.length - 1]?.value ?? null
  const benchmarkCurrentYield = benchmarkByYear.get(usablePoints[usablePoints.length - 1]?.year) ?? null

  return {
    sourceAreaType: areaType,
    currentYield,
    longTermMean: average(values),
    volatility: calculateStandardDeviation(values),
    meanReversionSpeed: estimateMeanReversionSpeed(values),
    spreadMean: average(spreadValues),
    spreadVolatility: calculateStandardDeviation(spreadValues),
    spreadMeanReversionSpeed: estimateMeanReversionSpeed(spreadValues),
    benchmarkCurrentYield,
    benchmarkLongTermMean: average((benchmarkSeries || []).map((point) => Number(point?.value)).filter(Number.isFinite)),
    benchmarkVolatility: calculateStandardDeviation((benchmarkSeries || []).map((point) => Number(point?.value)).filter(Number.isFinite)),
    benchmarkMeanReversionSpeed: estimateMeanReversionSpeed((benchmarkSeries || []).map((point) => Number(point?.value)).filter(Number.isFinite)),
    nswSpreadMean: average(spreadValues),
    historicalYieldRates: [...values],
    actualYieldPoints: usablePoints,
    benchmarkYieldPoints: Array.isArray(benchmarkSeries) ? benchmarkSeries : [],
    historyWindow: {
      startYear: usablePoints[0]?.year ?? null,
      endYear: usablePoints[usablePoints.length - 1]?.year ?? null
    }
  }
}

function mergeWeightedSeries(target, source) {
  source.forEach((point, year) => {
    const entry = target.get(year) || { weightedValueSum: 0, totalWeight: 0, fallbackValues: [] }
    const weight = Math.max(0, Number(point.weight) || 0)
    if (weight > 0) {
      entry.weightedValueSum += point.value * weight
      entry.totalWeight += weight
    } else {
      entry.fallbackValues.push(point.value)
    }
    target.set(year, entry)
  })
}

function summariseSeriesMap(seriesMap) {
  return [...seriesMap.entries()]
    .map(([year, entry]) => {
      if ((entry.totalWeight || 0) > 0) {
        return {
          year,
          value: entry.weightedValueSum / entry.totalWeight
        }
      }

      const fallbackValues = Array.isArray(entry.fallbackValues) ? entry.fallbackValues : []
      if (!fallbackValues.length) return null
      return {
        year,
        value: average(fallbackValues)
      }
    })
    .filter(Boolean)
    .sort((left, right) => left.year - right.year)
}

function seriesMapToPoints(seriesMap) {
  return [...seriesMap.values()]
    .map((point) => ({
      year: point.year,
      value: point.value
    }))
    .sort((left, right) => left.year - right.year)
}

function estimateMeanReversionSpeed(values) {
  const series = Array.isArray(values)
    ? values.map((value) => Number(value)).filter(Number.isFinite)
    : []
  if (series.length < 3) return 0.2

  const pairs = []
  for (let index = 1; index < series.length; index += 1) {
    pairs.push([series[index - 1], series[index]])
  }

  const xMean = average(pairs.map((pair) => pair[0]))
  const yMean = average(pairs.map((pair) => pair[1]))
  let numerator = 0
  let denominator = 0

  pairs.forEach(([x, y]) => {
    numerator += (x - xMean) * (y - yMean)
    denominator += (x - xMean) ** 2
  })

  if (!denominator) return 0.2
  const beta = numerator / denominator
  return clamp(1 - beta, 0.05, 0.95)
}

function calculateStandardDeviation(values) {
  const series = Array.isArray(values)
    ? values.map((value) => Number(value)).filter(Number.isFinite)
    : []
  if (series.length < 2) return 0.0025
  const mean = average(series)
  const variance = series.reduce((sum, value) => sum + ((value - mean) ** 2), 0) / (series.length - 1)
  return Math.max(Math.sqrt(variance), 0.0005)
}

function average(values) {
  const series = Array.isArray(values)
    ? values.map((value) => Number(value)).filter(Number.isFinite)
    : []
  if (!series.length) return null
  return series.reduce((sum, value) => sum + value, 0) / series.length
}

function normalisePropertyType(value) {
  const text = cleanText(value).toLowerCase()
  if (text === 'house') return 'house'
  if (text === 'unit' || text === 'apartment') return 'apartment'
  return null
}

function extractYear(value) {
  const text = cleanText(value)
  if (!text) return null
  const match = text.match(/^(\d{4})-/)
  return match ? Number(match[1]) : null
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
  return String(value || '').trim()
}

function toNumber(value) {
  const safe = Number(String(value ?? '').trim())
  return Number.isFinite(safe) ? safe : null
}

function clamp(value, min, max) {
  return Math.min(Math.max(Number(value) || 0, min), max)
}
