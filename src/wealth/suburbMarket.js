export function normaliseWealthPropertyMarketPayload(rawPayload) {
  const payload = rawPayload && typeof rawPayload === 'object' ? rawPayload : {}
  return {
    metadata: payload.metadata && typeof payload.metadata === 'object' ? payload.metadata : {},
    failures: Array.isArray(payload.failures) ? payload.failures : [],
    suburbs: payload.suburbs && typeof payload.suburbs === 'object' ? payload.suburbs : {},
    records: Array.isArray(payload.records) ? payload.records : []
  }
}

export function normaliseBoundaryManifest(rawManifest) {
  const manifest = rawManifest && typeof rawManifest === 'object' ? rawManifest : {}
  return {
    generatedAt: manifest.generatedAt || null,
    source: manifest.source || null,
    chunks: manifest.chunks && typeof manifest.chunks === 'object' ? manifest.chunks : {},
    states: Array.isArray(manifest.states) ? manifest.states : [],
    suburbs: manifest.suburbs && typeof manifest.suburbs === 'object' ? manifest.suburbs : {}
  }
}

export function normaliseSuburbLookup(rawLookup) {
  const lookup = rawLookup && typeof rawLookup === 'object' ? rawLookup : {}
  return {
    generatedAt: lookup.generatedAt || null,
    suburbsBySlug: lookup.suburbsBySlug && typeof lookup.suburbsBySlug === 'object' ? lookup.suburbsBySlug : {}
  }
}

export function buildSuburbSearchContext(rawPayload) {
  const payload = normaliseWealthPropertyMarketPayload(rawPayload)
  const suburbsBySlug = {}

  for (const [slug, suburb] of Object.entries(payload.suburbs)) {
    if (!suburb || typeof suburb !== 'object') continue
    suburbsBySlug[slug] = {
      ...suburb,
      slug,
      label: suburb.label || suburbLabel(suburb),
      state: suburb.state || ''
    }
  }

  const suburbOptions = Object.values(suburbsBySlug)
    .map(suburb => ({
      slug: suburb.slug,
      label: suburb.label,
      suburb: suburb.suburb,
      state: suburb.state,
      postcode: suburb.postcode
    }))
    .sort((left, right) => left.label.localeCompare(right.label, 'en-AU'))

  return {
    suburbsBySlug,
    suburbOptions,
    hasAnyData: suburbOptions.length > 0
  }
}

export function buildSuburbSelectionContext(rawPayload, rawManifest, rawLookup) {
  const payload = normaliseWealthPropertyMarketPayload(rawPayload)
  const manifest = normaliseBoundaryManifest(rawManifest)
  const lookup = normaliseSuburbLookup(rawLookup)
  const suburbsBySalCode = {}

  for (const [slug, suburb] of Object.entries(payload.suburbs)) {
    if (!suburb || typeof suburb !== 'object') continue
    const lookupEntry = lookup.suburbsBySlug[slug] || {}
    const salCode2021 = String(lookupEntry.salCode2021 || '').trim().toUpperCase()
    if (!salCode2021) continue
    const manifestEntry = manifest.suburbs[salCode2021] || {}
    const state = suburb.state || lookupEntry.state || manifestEntry.state || ''
    const geometryChunk = lookupEntry.geometryChunk || manifestEntry.chunk || null
    suburbsBySalCode[salCode2021] = {
      ...suburb,
      slug,
      salCode2021,
      state,
      label: suburb.label || suburbLabel(suburb),
      centroid: lookupEntry.centroid || manifestEntry.centroid || null,
      bbox: manifestEntry.bbox || null,
      geometryChunk
    }
  }

  const suburbOptions = Object.values(suburbsBySalCode)
    .map(suburb => ({
      salCode2021: suburb.salCode2021,
      slug: suburb.slug,
      label: suburb.label,
      suburb: suburb.suburb,
      state: suburb.state,
      postcode: suburb.postcode,
      geometryChunk: suburb.geometryChunk,
      centroid: suburb.centroid
    }))
    .sort((left, right) => left.label.localeCompare(right.label, 'en-AU'))

  const states = new Map()
  manifest.states.forEach((entry) => {
    if (!entry || !entry.code) return
    states.set(entry.code, { code: entry.code, name: entry.name || entry.code, chunk: entry.chunk || null })
  })
  suburbOptions.forEach((option) => {
    if (!option.state || states.has(option.state)) return
    states.set(option.state, { code: option.state, name: option.state, chunk: null })
  })

  return {
    manifest,
    suburbsBySalCode,
    suburbOptions,
    states: Array.from(states.values()).sort((left, right) => left.code.localeCompare(right.code, 'en-AU')),
    hasAnyData: suburbOptions.length > 0
  }
}

export function applySuburbMarketToFormBySlug(form, suburbsBySlug, slug) {
  if (!slug || !suburbsBySlug?.[slug]) return null
  return applySuburbMarketToForm(form, suburbsBySlug[slug])
}

export function createPropertyConfigPatchFromSuburb(suburb) {
  if (!suburb || typeof suburb !== 'object') return null
  const house = suburb.propertyTypes?.house || null
  const apartment = suburb.propertyTypes?.apartment || null
  const vacancyCandidates = [house?.vacancyRate, apartment?.vacancyRate].filter(isFiniteNumber)

  return {
    salCode2021: suburb.salCode2021 || null,
    slug: suburb.slug || null,
    label: suburb.label || suburbLabel(suburb),
    vacancyRate: vacancyCandidates.length ? vacancyCandidates[0] : null,
    house: buildPropertyPatch(house),
    apartment: buildPropertyPatch(apartment)
  }
}

export function applySuburbMarketToForm(form, suburb) {
  const patch = createPropertyConfigPatchFromSuburb(suburb)
  if (!patch || !form?.propertyConfig) return null

  if (isFiniteNumber(patch.vacancyRate)) {
    form.propertyConfig.vacancyRate = patch.vacancyRate
  }

  applyPropertyPatch(form.propertyConfig.house, patch.house)
  applyPropertyPatch(form.propertyConfig.apartment, patch.apartment)
  return patch
}

const SYDNEY_GROWTH_BASELINES = {
  house: 0.069,
  apartment: 0.03
}

function buildPropertyPatch(propertyData) {
  if (!propertyData || typeof propertyData !== 'object') return null
  return {
    purchasePrice: toNumber(propertyData.medianPrice),
    growthMean: toBlendedGrowth(propertyData.annualGrowthRate, propertyData.propertyType),
    rentYield: toRatio(propertyData.rentYield)
  }
}

function applyPropertyPatch(target, patch) {
  if (!target || !patch) return
  Object.entries(patch).forEach(([key, value]) => {
    if (isFiniteNumber(value)) {
      target[key] = value
    }
  })
}

function suburbLabel(suburb) {
  if (!suburb) return ''
  return suburb.postcode ? `${suburb.suburb}, ${suburb.state} ${suburb.postcode}` : `${suburb.suburb}, ${suburb.state}`
}

function toNumber(value) {
  const safe = Number(value)
  return Number.isFinite(safe) ? safe : null
}

function toRatio(value) {
  const safe = Number(value)
  return Number.isFinite(safe) ? safe : null
}

function toBlendedGrowth(value, propertyType) {
  const marketGrowth = toRatio(value)
  const sydneyBaseline = SYDNEY_GROWTH_BASELINES[propertyType]
  if (marketGrowth === null) return Number.isFinite(sydneyBaseline) ? sydneyBaseline : null
  if (!Number.isFinite(sydneyBaseline)) return marketGrowth
  return (marketGrowth + sydneyBaseline) / 2
}

function isFiniteNumber(value) {
  return Number.isFinite(Number(value))
}
