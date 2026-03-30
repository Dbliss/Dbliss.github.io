export function normaliseAreaMarketPayload(rawPayload) {
  const payload = rawPayload && typeof rawPayload === 'object' ? rawPayload : {}
  return {
    metadata: payload.metadata && typeof payload.metadata === 'object' ? payload.metadata : {},
    areas: Array.isArray(payload.areas) ? payload.areas : []
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
    house: buildPropertyPatch(area.house),
    apartment: buildPropertyPatch(area.apartment),
    houseGrowthYears: Array.isArray(area.house?.historicalAnnualGrowthRates) ? area.house.historicalAnnualGrowthRates.length : 0,
    apartmentGrowthYears: Array.isArray(area.apartment?.historicalAnnualGrowthRates) ? area.apartment.historicalAnnualGrowthRates.length : 0
  }
}

export function applyAreaMarketToForm(form, area) {
  const patch = createPropertyConfigPatchFromArea(area)
  if (!patch || !form?.propertyConfig) return null
  applyPropertyPatch(form.propertyConfig.house, patch.house)
  applyPropertyPatch(form.propertyConfig.apartment, patch.apartment)
  return patch
}

function buildPropertyPatch(propertyData) {
  if (!propertyData || typeof propertyData !== 'object') return null
  return {
    purchasePrice: toNumber(propertyData.currentPriceEstimate ?? propertyData.latestActualPrice),
    growthMean: toNumber(propertyData.annualGrowthMean),
    growthVolatility: toNumber(propertyData.annualGrowthVolatility),
    historicalAnnualGrowthRates: Array.isArray(propertyData.historicalAnnualGrowthRates)
      ? propertyData.historicalAnnualGrowthRates.map((value) => Number(value)).filter((value) => Number.isFinite(value))
      : []
  }
}

function applyPropertyPatch(target, patch) {
  if (!target || !patch) return
  Object.entries(patch).forEach(([key, value]) => {
    if (key === 'historicalAnnualGrowthRates') {
      target[key] = Array.isArray(value) ? [...value] : []
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
