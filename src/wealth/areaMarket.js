export const NSW_HOME_GUARANTEE_HIGH_CAP_LIMIT = 1_500_000
export const NSW_HOME_GUARANTEE_OTHER_CAP_LIMIT = 800_000
const NSW_HOME_GUARANTEE_HIGH_CAP_REGIONS = new Set([
  'Central Coast',
  'Metropolitan Sydney',
  'Illawarra',
  'Hunter'
])

export function normaliseAreaMarketPayload(rawPayload) {
  const payload = rawPayload && typeof rawPayload === 'object' ? rawPayload : {}
  const areas = Array.isArray(payload.areas)
    ? payload.areas
    : payload.suburbs && typeof payload.suburbs === 'object'
      ? Object.values(payload.suburbs).map(normaliseSuburbAreaRecord).filter(Boolean)
      : []
  return {
    metadata: payload.metadata && typeof payload.metadata === 'object' ? payload.metadata : {},
    areas
  }
}

export function buildAreaSearchContext(rawPayload) {
  const payload = normaliseAreaMarketPayload(rawPayload)
  const areasByKey = {}

  payload.areas.forEach((area) => {
    if (!area || typeof area !== 'object' || !area.key) return
    areasByKey[area.key] = {
      ...area,
      typeLabel: area.type === 'region'
        ? 'Region'
        : area.type === 'subregion'
          ? 'Subregion'
          : 'Suburb'
    }
  })

  Object.values(areasByKey).forEach((area) => {
    ;['house', 'apartment'].forEach((propertyType) => {
      const property = area[propertyType]
      if (!property) return
      property.resolvedYieldModel = resolveYieldModelForArea(area, propertyType, areasByKey)
    })
  })

  const areaOptions = Object.values(areasByKey)
    .map((area) => ({
      key: area.key,
      label: area.label,
      type: area.type,
      typeLabel: area.typeLabel,
      regionLabel: area.regionLabel,
      postcode: area.postcode,
      suburb: area.suburb,
      searchText: area.searchText || area.label
    }))
    .sort((left, right) => left.label.localeCompare(right.label, 'en-AU'))

  return {
    metadata: payload.metadata,
    areasByKey,
    areaOptions,
    suburbOptions: areaOptions,
    hasAnyData: areaOptions.length > 0
  }
}

export function createPropertyConfigPatchFromArea(area) {
  if (!area || typeof area !== 'object') return null

  return {
    key: area.key || null,
    label: area.label || '',
    type: area.type || null,
    regionKey: area.regionKey || null,
    subregionKey: area.subregionKey || null,
    historicalAnnualGrowthBlocks: Array.isArray(area.historicalAnnualGrowthBlocks)
      ? area.historicalAnnualGrowthBlocks
          .map((block) => ({
            year: Number(block?.year),
            houseGrowth: toNumber(block?.houseGrowth),
            apartmentGrowth: toNumber(block?.apartmentGrowth)
          }))
          .filter((block) => Number.isFinite(block.year) && (block.houseGrowth !== null || block.apartmentGrowth !== null))
      : [],
    house: buildPropertyPatch(area.house),
    apartment: buildPropertyPatch(area.apartment),
    houseGrowthYears: Array.isArray(area.house?.historicalAnnualGrowthRates) ? area.house.historicalAnnualGrowthRates.length : 0,
    apartmentGrowthYears: Array.isArray(area.apartment?.historicalAnnualGrowthRates) ? area.apartment.historicalAnnualGrowthRates.length : 0
  }
}

export function applyAreaMarketToForm(form, area) {
  const patch = createPropertyConfigPatchFromArea(area)
  if (!patch || !form?.propertyConfig) return null
  form.propertyConfig.historicalAnnualGrowthBlocks = Array.isArray(patch.historicalAnnualGrowthBlocks)
    ? patch.historicalAnnualGrowthBlocks.map((block) => ({ ...block }))
    : []
  applyPropertyPatch(form.propertyConfig.house, patch.house)
  applyPropertyPatch(form.propertyConfig.apartment, patch.apartment)
  return patch
}

export function getFirstHomeBuyerLowDepositLimitForArea(area) {
  const regionLabel = String(area?.regionLabel || '').trim()
  if (regionLabel) {
    return NSW_HOME_GUARANTEE_HIGH_CAP_REGIONS.has(regionLabel)
      ? NSW_HOME_GUARANTEE_HIGH_CAP_LIMIT
      : NSW_HOME_GUARANTEE_OTHER_CAP_LIMIT
  }

  const areaLabel = String(area?.label || '').trim()
  return NSW_HOME_GUARANTEE_HIGH_CAP_REGIONS.has(areaLabel)
    ? NSW_HOME_GUARANTEE_HIGH_CAP_LIMIT
    : NSW_HOME_GUARANTEE_OTHER_CAP_LIMIT
}

function buildPropertyPatch(propertyData) {
  if (!propertyData || typeof propertyData !== 'object') return null
  const yieldModel = cloneYieldModel(propertyData.resolvedYieldModel || propertyData.yieldModel)
  return {
    purchasePrice: toNumber(propertyData.currentPriceEstimate ?? propertyData.latestActualPrice),
    growthMean: toNumber(propertyData.annualGrowthMean),
    growthVolatility: toNumber(propertyData.annualGrowthVolatility),
    historicalAnnualGrowthRates: Array.isArray(propertyData.historicalAnnualGrowthRates)
      ? propertyData.historicalAnnualGrowthRates.map((value) => Number(value)).filter((value) => Number.isFinite(value))
      : [],
    rentYield: toNumber(yieldModel?.currentYield),
    yieldModel
  }
}

function applyPropertyPatch(target, patch) {
  if (!target || !patch) return
  Object.entries(patch).forEach(([key, value]) => {
    if (key === 'historicalAnnualGrowthRates') {
      target[key] = Array.isArray(value) ? [...value] : []
      return
    }
    if (key === 'yieldModel') {
      target[key] = cloneYieldModel(value)
      return
    }
    if (Number.isFinite(Number(value))) {
      target[key] = value
    }
  })
}

function toNumber(value) {
  const safe = Number(value)
  return Number.isFinite(safe) ? safe : null
}

function resolveYieldModelForArea(area, propertyType, areasByKey) {
  const directModel = cloneYieldModel(area?.[propertyType]?.yieldModel)
  if (directModel) {
    return withYieldSourceMetadata(directModel, area)
  }

  const fallbackAreas = []
  if (area?.type === 'suburb' && area?.subregionKey && areasByKey[area.subregionKey]) {
    fallbackAreas.push(areasByKey[area.subregionKey])
  }
  if (area?.regionKey && areasByKey[area.regionKey]) {
    fallbackAreas.push(areasByKey[area.regionKey])
  }

  for (const fallbackArea of fallbackAreas) {
    const model = cloneYieldModel(fallbackArea?.[propertyType]?.yieldModel)
    if (model) return withYieldSourceMetadata(model, fallbackArea)
  }

  return null
}

function withYieldSourceMetadata(model, area) {
  if (!model) return null
  return {
    ...model,
    sourceAreaKey: area?.key || null,
    sourceAreaLabel: area?.label || '',
    sourceAreaType: area?.type || model.sourceAreaType || null
  }
}

function cloneYieldModel(model) {
  return model && typeof model === 'object' ? JSON.parse(JSON.stringify(model)) : null
}

function normaliseSuburbAreaRecord(area) {
  if (!area || typeof area !== 'object') return null

  const suburbLabel = area.label || [area.suburb, area.state].filter(Boolean).join(', ')
  if (!suburbLabel) return null

  return {
    key: area.slug || suburbLabel.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
    label: suburbLabel,
    type: 'suburb',
    suburb: area.suburb || suburbLabel,
    postcode: area.postcode || null,
    regionLabel: area.region || null,
    searchText: [suburbLabel, area.suburb, area.state, area.postcode, area.region].filter(Boolean).join(' '),
    house: normalisePropertyTypeRecord(area.propertyTypes?.house),
    apartment: normalisePropertyTypeRecord(area.propertyTypes?.apartment)
  }
}

function normalisePropertyTypeRecord(property) {
  if (!property || typeof property !== 'object') return null

  return {
    currentPriceEstimate: toNumber(property.medianPrice),
    latestActualPrice: toNumber(property.medianPrice),
    annualGrowthMean: toNumber(property.annualGrowthRate),
    annualGrowthVolatility: null,
    historicalAnnualGrowthRates: []
  }
}
