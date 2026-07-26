<template>
  <Teleport to="body">
    <section class="scout-map" role="dialog" aria-modal="true" aria-label="NSW suburb score map">
      <div
        ref="mapContainer"
        class="scout-map__map"
        tabindex="0"
        role="application"
        :aria-label="mapAriaLabel"
        @keydown="handleKeydown"
      ></div>

      <header class="scout-map__header">
        <div>
          <p class="scout-map__eyebrow">Score map</p>
          <h4>Explore every NSW suburb</h4>
          <p>Drag and zoom around the map, then select a scored suburb for its full market outlook.</p>
        </div>
        <div class="scout-map__legend" aria-label="Map score legend">
          <span>No data</span>
          <i class="scout-map__legend-empty" aria-hidden="true"></i>
          <span>Lower score</span>
          <i class="scout-map__legend-ramp" aria-hidden="true"></i>
          <span>Higher score</span>
        </div>
        <button type="button" class="scout-map__exit" @click="emit('close')">List view</button>
      </header>

      <div v-if="isLoading" class="scout-map__status">
        <span class="scout-map__spinner" aria-hidden="true"></span>
        <strong>Loading suburb map</strong>
      </div>
      <div v-else-if="loadError" class="scout-map__status scout-map__status--error">
        <strong>The map could not be loaded.</strong>
        <span>The ranked list is still available.</span>
      </div>

      <div
        v-if="hoveredFeature"
        class="scout-map__tooltip"
        :style="{ left: `${tooltipPosition.x}px`, top: `${tooltipPosition.y}px` }"
      >
        <strong>{{ hoveredFeature.name }}</strong>
        <span v-if="hoveredFeature.recommendation">
          {{ formatScore(hoveredFeature.recommendation) }}/10 ·
          {{ formatCurrency(hoveredFeature.recommendation.priceToday) }}
        </span>
        <span v-else>Insufficient market history to score</span>
      </div>

      <Transition name="scout-map-drawer">
        <aside v-if="selectedRecommendation" class="scout-map__drawer" aria-live="polite">
          <button type="button" class="scout-map__close" aria-label="Close suburb details" @click="clearSelection">×</button>

          <div class="scout-map__drawer-head">
            <p>#{{ selectedRecommendation.rank }} suburb</p>
            <h4>{{ selectedRecommendation.label }}</h4>
            <span>{{ selectedRecommendation.regionLabel }}</span>
            <span v-if="selectedRecommendation.marketDataSourceType === 'postcode'" class="scout-map__data-source">
              Uses the broader {{ selectedRecommendation.marketDataSourceLabel }} market history because direct suburb sales are limited.
            </span>
            <strong>{{ formatScore(selectedRecommendation) }}/10</strong>
          </div>

          <div class="scout-map__metrics">
            <div>
              <span>Median {{ propertyTypeLabel.toLowerCase() }} price</span>
              <strong>{{ formatCurrency(selectedRecommendation.priceToday) }}</strong>
            </div>
            <div>
              <span>Against your budget</span>
              <strong>{{ formatBudgetGap(selectedRecommendation) }}</strong>
            </div>
            <div>
              <span>Expected annual growth</span>
              <strong>{{ formatPercent(selectedRecommendation.expectedAnnualGrowth) }}</strong>
            </div>
            <div>
              <span>Expected rental yield</span>
              <strong>{{ formatPercent(selectedRecommendation.expectedAnnualYield) }}</strong>
            </div>
            <div>
              <span>Expected value in 10 years</span>
              <strong>{{ formatCurrency(selectedRecommendation.expectedValueInTenYears) }}</strong>
            </div>
            <div>
              <span>Avg yearly sales</span>
              <strong>{{ formatGroupedNumber(selectedRecommendation.salesAverage) }}</strong>
            </div>
            <div>
              <span>Growth volatility</span>
              <strong>{{ formatPercent(selectedRecommendation.growthVolatility) }}</strong>
            </div>
            <div>
              <span>Yield volatility</span>
              <strong>{{ formatPercent(selectedRecommendation.yieldVolatility) }}</strong>
            </div>
          </div>

          <div class="scout-map__charts">
            <WealthPropertyTrendChart
              :title="`Historical ${propertyTypeLabel.toLowerCase()} price`"
              color="#0f766e"
              :actual-points="selectedRecommendation.actualPoints"
              :trend-points="selectedRecommendation.trendPoints"
              :estimate-point="selectedRecommendation.estimatePoint"
            />
            <WealthPropertyTrendChart
              title="Historical rental yield"
              kicker="Yield history"
              color="#0f766e"
              value-mode="percent"
              :value-padding="0.005"
              empty-text="No rental-yield history available for this property type."
              actual-legend-label="Actual yearly yield"
              trend-legend-label="Long-run yield mean"
              estimate-legend-label="Current estimate"
              :actual-points="selectedRecommendation.yieldActualPoints"
              :trend-points="selectedRecommendation.yieldTrendPoints"
              :estimate-point="null"
            />
            <WealthLineChart
              :title="`${propertyTypeLabel} price Monte Carlo`"
              subtitle="P25 / P50 / P75 projection for the next 30 years."
              kicker="Forward market path"
              :series="monteCarloChartSeries"
            />
          </div>
        </aside>
      </Transition>
    </section>
  </Teleport>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import WealthLineChart from './WealthLineChart.vue'
import WealthPropertyTrendChart from './WealthPropertyTrendChart.vue'

const emit = defineEmits(['close'])

const props = defineProps({
  recommendations: {
    type: Array,
    default: () => []
  },
  propertyTypeLabel: {
    type: String,
    default: 'Apartment'
  },
  scoreBounds: {
    type: Object,
    default: () => ({ min: 0, max: 0 })
  }
})

const MAP_STYLE_URL = 'https://tiles.openfreemap.org/styles/bright'
const SOURCE_ID = 'nsw-suburbs'
const FILL_LAYER_ID = 'nsw-suburbs-fill'
const LINE_LAYER_ID = 'nsw-suburbs-line'
const SELECTED_FILL_LAYER_ID = 'nsw-suburbs-selected-fill'
const SELECTED_LINE_LAYER_ID = 'nsw-suburbs-selected-line'
const EMPTY_SELECTION = '__no_selected_suburb__'
const SCORE_STOPS = [
  0, '#440154',
  2, '#3e4a89',
  4, '#26828e',
  6, '#1f9e89',
  8, '#6ece58',
  10, '#fde725'
]

const mapContainer = ref(null)
const isLoading = ref(true)
const loadError = ref(false)
const hoveredFeature = ref(null)
const selectedRecommendation = ref(null)
const tooltipPosition = ref({ x: 0, y: 0 })

let map = null
let boundaryFeatures = []
let recommendationByBoundaryCode = new Map()

const recommendationLookups = computed(() => {
  const exact = new Map()
  const canonical = new Map()

  props.recommendations.forEach((recommendation) => {
    const name = recommendation.suburb || recommendation.label
    addLookupCandidate(exact, normaliseSuburbName(name), recommendation)
    addLookupCandidate(canonical, canonicalSuburbName(name), recommendation)
  })

  return { exact, canonical }
})

const mapAriaLabel = computed(() =>
  `Interactive NSW suburb score map. ${props.recommendations.length} scored suburbs are visible.`
)

const monteCarloChartSeries = computed(() => selectedRecommendation.value ? [{
  id: 'mc',
  label: `${props.propertyTypeLabel} price`,
  color: '#0f766e',
  accent: 'rgba(15, 118, 110, 0.16)',
  points: selectedRecommendation.value.monteCarloSeries
}] : [])

watch(() => props.recommendations, () => {
  if (selectedRecommendation.value) {
    selectedRecommendation.value = props.recommendations.find(
      (recommendation) => recommendation.key === selectedRecommendation.value.key
    ) || null
  }
  updateMapData()
})

watch(() => props.scoreBounds, updateMapData, { deep: true })
watch(selectedRecommendation, updateSelectedLayers)

onMounted(async () => {
  document.body.classList.add('has-scout-map-open')
  document.addEventListener('keydown', handleDocumentKeydown)

  try {
    const response = await fetch(`${import.meta.env.BASE_URL}data/nsw-suburb-boundaries.json`)
    if (!response.ok) throw new Error(`Boundary request failed with ${response.status}`)
    const payload = await response.json()
    boundaryFeatures = (payload.features || []).filter(
      (feature) => feature?.g && ['Polygon', 'MultiPolygon'].includes(feature.g.type)
    )
    initialiseMap()
  } catch (error) {
    console.error('Unable to load NSW suburb map', error)
    loadError.value = true
    isLoading.value = false
  }
})

onBeforeUnmount(() => {
  document.body.classList.remove('has-scout-map-open')
  document.removeEventListener('keydown', handleDocumentKeydown)
  map?.remove()
  map = null
})

function initialiseMap() {
  map = new maplibregl.Map({
    container: mapContainer.value,
    style: MAP_STYLE_URL,
    center: [147.2, -32.6],
    zoom: 4.7,
    minZoom: 4,
    maxZoom: 16,
    attributionControl: true
  })

  map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right')
  map.once('error', (event) => {
    if (!isLoading.value) return
    console.error('Unable to load the map style', event.error)
    loadError.value = true
    isLoading.value = false
  })

  map.once('load', () => {
    const firstLabelLayer = map.getStyle().layers.find((layer) => layer.type === 'symbol')?.id
    map.addSource(SOURCE_ID, {
      type: 'geojson',
      data: buildMapGeoJson(),
      promoteId: 'code',
      attribution: 'Suburb boundaries: Australian Bureau of Statistics, ASGS 2021 (CC BY 4.0)'
    })

    map.addLayer({
      id: FILL_LAYER_ID,
      type: 'fill',
      source: SOURCE_ID,
      paint: {
        'fill-color': [
          'case',
          ['==', ['get', 'hasData'], true],
          ['interpolate', ['linear'], ['get', 'score'], ...SCORE_STOPS],
          '#94a3b8'
        ],
        'fill-opacity': [
          'case',
          ['==', ['get', 'hasData'], true],
          0.58,
          0.34
        ]
      }
    }, firstLabelLayer)

    map.addLayer({
      id: LINE_LAYER_ID,
      type: 'line',
      source: SOURCE_ID,
      paint: {
        'line-color': [
          'case',
          ['==', ['get', 'hasData'], true],
          'rgba(30, 41, 59, 0.72)',
          'rgba(71, 85, 105, 0.48)'
        ],
        'line-width': ['interpolate', ['linear'], ['zoom'], 4, 0.35, 10, 1, 16, 2]
      }
    }, firstLabelLayer)

    map.addLayer({
      id: SELECTED_FILL_LAYER_ID,
      type: 'fill',
      source: SOURCE_ID,
      filter: ['==', ['get', 'recommendationKey'], EMPTY_SELECTION],
      paint: {
        'fill-color': '#ffb000',
        'fill-opacity': 0.72
      }
    }, firstLabelLayer)

    map.addLayer({
      id: SELECTED_LINE_LAYER_ID,
      type: 'line',
      source: SOURCE_ID,
      filter: ['==', ['get', 'recommendationKey'], EMPTY_SELECTION],
      paint: {
        'line-color': '#111827',
        'line-width': 2.5
      }
    }, firstLabelLayer)

    map.on('mousemove', FILL_LAYER_ID, handleMapHover)
    map.on('mouseleave', FILL_LAYER_ID, clearHover)
    map.on('click', FILL_LAYER_ID, handleMapClick)
    map.fitBounds([[140.8, -37.7], [154.2, -28.0]], { padding: 36, duration: 0 })
    isLoading.value = false
  })
}

function buildMapGeoJson() {
  recommendationByBoundaryCode = new Map()
  return {
    type: 'FeatureCollection',
    features: boundaryFeatures.map((feature) => {
      const recommendation = findRecommendationForBoundary(feature.n)
      if (recommendation) recommendationByBoundaryCode.set(String(feature.c), recommendation)
      return {
        type: 'Feature',
        id: String(feature.c),
        properties: {
          code: String(feature.c),
          name: feature.n,
          hasData: Boolean(recommendation),
          score: recommendation ? getRelativeScore(recommendation) : 0,
          recommendationKey: recommendation?.key || ''
        },
        geometry: feature.g
      }
    })
  }
}

function updateMapData() {
  if (!map?.getSource(SOURCE_ID)) return
  map.getSource(SOURCE_ID).setData(buildMapGeoJson())
  updateSelectedLayers()
}

function updateSelectedLayers() {
  if (!map?.getLayer(SELECTED_FILL_LAYER_ID)) return
  const key = selectedRecommendation.value?.key || EMPTY_SELECTION
  const filter = ['==', ['get', 'recommendationKey'], key]
  map.setFilter(SELECTED_FILL_LAYER_ID, filter)
  map.setFilter(SELECTED_LINE_LAYER_ID, filter)
}

function handleMapHover(event) {
  const feature = event.features?.[0]
  if (!feature) return
  const recommendation = recommendationByBoundaryCode.get(String(feature.properties.code)) || null
  hoveredFeature.value = {
    name: feature.properties.name,
    recommendation
  }
  tooltipPosition.value = {
    x: Math.max(12, Math.min((mapContainer.value?.clientWidth || 0) - 245, event.point.x + 14)),
    y: Math.max(12, event.point.y - 16)
  }
  map.getCanvas().style.cursor = recommendation ? 'pointer' : 'default'
}

function clearHover() {
  hoveredFeature.value = null
  if (map) map.getCanvas().style.cursor = ''
}

function handleMapClick(event) {
  const feature = event.features?.[0]
  const recommendation = recommendationByBoundaryCode.get(String(feature?.properties?.code)) || null
  if (recommendation) selectedRecommendation.value = recommendation
}

function addLookupCandidate(lookup, key, recommendation) {
  if (!key) return
  if (!lookup.has(key)) lookup.set(key, [])
  lookup.get(key).push(recommendation)
}

function findRecommendationForBoundary(boundaryName) {
  const exactCandidates = recommendationLookups.value.exact.get(normaliseSuburbName(boundaryName)) || []
  if (exactCandidates.length) return chooseRecommendation(exactCandidates, boundaryName)
  const canonicalCandidates = recommendationLookups.value.canonical.get(canonicalSuburbName(boundaryName)) || []
  return chooseRecommendation(canonicalCandidates, boundaryName)
}

function chooseRecommendation(candidates, boundaryName) {
  if (!candidates.length) return null
  if (candidates.length === 1) return candidates[0]

  const qualifier = normaliseSuburbName(
    String(boundaryName || '').match(/\(([^)]+)\)\s*$/)?.[1]?.replace(/\s*(?:-|–)\s*NSW$/i, '') || ''
  )
  const regionMatch = qualifier
    ? candidates.find((candidate) => qualifier.includes(normaliseSuburbName(candidate.regionLabel)))
    : null

  return regionMatch || [...candidates].sort(
    (left, right) => getRecommendationDataWeight(right) - getRecommendationDataWeight(left)
  )[0]
}

function getRecommendationDataWeight(recommendation) {
  return (Number(recommendation?.historyYears) || 0) * 100000
    + (Number(recommendation?.salesAverage) || 0)
}

function handleDocumentKeydown(event) {
  if (event.key !== 'Escape') return
  if (selectedRecommendation.value) clearSelection()
  else emit('close')
}

function handleKeydown(event) {
  if (event.key === 'Escape') handleDocumentKeydown(event)
}

function clearSelection() {
  selectedRecommendation.value = null
}

function getRelativeScore(recommendation) {
  const rawScore = Number(recommendation?.rankingScore)
  const min = Number(props.scoreBounds?.min)
  const max = Number(props.scoreBounds?.max)
  if (!Number.isFinite(rawScore) || !Number.isFinite(min) || !Number.isFinite(max)) return 0
  if (Math.abs(max - min) < 1e-9) return 10
  return clamp(((rawScore - min) / (max - min)) * 10, 0, 10)
}

function formatScore(recommendation) {
  return getRelativeScore(recommendation).toFixed(1)
}

function normaliseSuburbName(value) {
  return String(value || '')
    .replace(/\s+\d{4}\s*$/, '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .trim()
    .toUpperCase()
}

function canonicalSuburbName(value) {
  return normaliseSuburbName(
    String(value || '').replace(/\s+\((?:[^()]*(?:-|–)\s*)?NSW\)\s*$/i, '')
  )
}

function formatBudgetGap(recommendation) {
  const gap = Number(recommendation?.budgetGap) || 0
  if (gap === 0) return 'On budget'
  if (gap > 0) return `${formatCurrency(gap)} under`
  return `${formatCurrency(Math.abs(gap))} over`
}

function formatGroupedNumber(value) {
  return new Intl.NumberFormat('en-AU', { maximumFractionDigits: 0 }).format(Number(value) || 0)
}

function formatCurrency(value) {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    maximumFractionDigits: 0
  }).format(Number(value) || 0)
}

function formatPercent(value) {
  if (!Number.isFinite(Number(value))) return 'n/a'
  return `${(Number(value) * 100).toFixed(1)}% p.a.`
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, Number(value) || 0))
}
</script>

<style scoped>
.scout-map {
  position: fixed;
  z-index: 9000;
  inset: 76px 0 0;
  width: 100vw;
  background: #dce8ee;
}

.scout-map__map {
  position: absolute;
  inset: 0;
}

.scout-map__map:focus-visible {
  outline: 3px solid rgba(37, 99, 235, 0.5);
  outline-offset: -3px;
}

.scout-map__map :deep(.maplibregl-ctrl-top-right) {
  top: 0.75rem;
  right: 0.75rem;
}

.scout-map__map :deep(.maplibregl-ctrl-group) {
  overflow: hidden;
  border-radius: 12px;
  box-shadow: 0 8px 22px rgba(15, 23, 42, 0.16);
}

.scout-map__header {
  position: absolute;
  z-index: 5;
  top: 1rem;
  left: 1rem;
  display: flex;
  align-items: center;
  gap: 1.25rem;
  max-width: calc(100% - 7.5rem);
  padding: 0.9rem 1rem;
  border: 1px solid rgba(148, 163, 184, 0.3);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.94);
  box-shadow: 0 12px 30px rgba(15, 23, 42, 0.14);
  backdrop-filter: blur(12px);
}

.scout-map__header h4,
.scout-map__header p {
  margin: 0;
}

.scout-map__header h4 {
  margin-top: 0.12rem;
  color: #12233c;
  font-size: 1.05rem;
}

.scout-map__header > div > p:last-child {
  margin-top: 0.2rem;
  color: #64748b;
  font-size: 0.78rem;
}

.scout-map__eyebrow {
  color: #0f766e;
  font-size: 0.65rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.scout-map__legend {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  color: #64748b;
  font-size: 0.68rem;
  white-space: nowrap;
}

.scout-map__legend-ramp,
.scout-map__legend-empty {
  display: inline-block;
  height: 0.55rem;
  border: 1px solid rgba(71, 85, 105, 0.3);
  border-radius: 999px;
}

.scout-map__legend-ramp {
  width: 6rem;
  background: linear-gradient(90deg, #440154, #31688e, #1f9e89, #6ece58, #fde725);
}

.scout-map__legend-empty {
  width: 1rem;
  background: #94a3b8;
}

.scout-map__exit {
  min-height: 2.4rem;
  padding: 0.5rem 0.8rem;
  border: 1px solid rgba(71, 85, 105, 0.25);
  border-radius: 10px;
  background: #fff;
  color: #173050;
  font: inherit;
  font-size: 0.76rem;
  font-weight: 700;
  white-space: nowrap;
  cursor: pointer;
}

.scout-map__exit:hover {
  background: #f1f5f9;
}

.scout-map__status {
  position: absolute;
  z-index: 6;
  inset: 0;
  display: grid;
  place-content: center;
  justify-items: center;
  gap: 0.65rem;
  background: rgba(234, 243, 247, 0.92);
  color: #12233c;
  text-align: center;
}

.scout-map__status--error span {
  color: #64748b;
  font-size: 0.85rem;
}

.scout-map__spinner {
  width: 2rem;
  height: 2rem;
  border: 3px solid rgba(15, 118, 110, 0.18);
  border-top-color: #0f766e;
  border-radius: 50%;
  animation: scout-map-spin 800ms linear infinite;
}

.scout-map__tooltip {
  position: absolute;
  z-index: 7;
  display: grid;
  gap: 0.12rem;
  min-width: 10rem;
  max-width: 15rem;
  padding: 0.65rem 0.75rem;
  border-radius: 12px;
  background: rgba(15, 23, 42, 0.94);
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.2);
  color: #fff;
  pointer-events: none;
  transform: translateY(-100%);
}

.scout-map__tooltip strong {
  font-size: 0.78rem;
}

.scout-map__tooltip span {
  color: rgba(255, 255, 255, 0.74);
  font-size: 0.7rem;
}

.scout-map__drawer {
  position: absolute;
  z-index: 8;
  inset: 0 0 0 auto;
  width: 50vw;
  overflow: auto;
  padding: clamp(1.2rem, 2vw, 2rem);
  border-left: 1px solid rgba(148, 163, 184, 0.3);
  background: rgba(255, 255, 255, 0.98);
  box-shadow: -18px 0 44px rgba(15, 23, 42, 0.2);
}

.scout-map__close {
  position: sticky;
  z-index: 2;
  top: 0;
  float: right;
  display: grid;
  place-items: center;
  width: 2.25rem;
  height: 2.25rem;
  padding: 0;
  border: 1px solid rgba(148, 163, 184, 0.3);
  border-radius: 999px;
  background: #fff;
  color: #475569;
  font: inherit;
  font-size: 1.35rem;
  cursor: pointer;
}

.scout-map__drawer-head {
  display: grid;
  gap: 0.2rem;
  padding: 0.2rem 3rem 1.2rem 0;
  border-bottom: 1px solid rgba(148, 163, 184, 0.2);
}

.scout-map__drawer-head p,
.scout-map__drawer-head h4,
.scout-map__drawer-head span,
.scout-map__drawer-head strong {
  margin: 0;
}

.scout-map__drawer-head p {
  color: #0f766e;
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.scout-map__drawer-head h4 {
  color: #12233c;
  font-size: clamp(1.45rem, 2vw, 2rem);
}

.scout-map__drawer-head span {
  color: #64748b;
  font-size: 0.82rem;
}

.scout-map__drawer-head .scout-map__data-source {
  max-width: 42rem;
  margin-top: 0.45rem;
  padding: 0.55rem 0.65rem;
  border-radius: 9px;
  background: #f1f5f9;
  color: #475569;
  line-height: 1.45;
}

.scout-map__drawer-head strong {
  margin-top: 0.45rem;
  color: #0f766e;
  font-size: 1.45rem;
}

.scout-map__metrics {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.75rem;
  padding: 1.2rem 0;
}

.scout-map__metrics div {
  display: grid;
  gap: 0.2rem;
  padding: 0.75rem;
  border-radius: 12px;
  background: #f8fafc;
}

.scout-map__metrics span {
  color: #64748b;
  font-size: 0.7rem;
}

.scout-map__metrics strong {
  color: #12233c;
  font-size: 0.85rem;
}

.scout-map__charts {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
}

.scout-map__charts :deep(.wealth-chart) {
  min-width: 0;
  overflow: hidden;
}

.scout-map__charts :deep(.wealth-chart:last-child) {
  grid-column: 1 / -1;
}

.scout-map-drawer-enter-active,
.scout-map-drawer-leave-active {
  transition: opacity 180ms ease, transform 220ms ease;
}

.scout-map-drawer-enter-from,
.scout-map-drawer-leave-to {
  opacity: 0;
  transform: translateX(2rem);
}

@keyframes scout-map-spin {
  to { transform: rotate(360deg); }
}

@media (max-width: 980px) {
  .scout-map__drawer {
    width: 100vw;
  }

  .scout-map__charts {
    grid-template-columns: 1fr;
  }

  .scout-map__charts :deep(.wealth-chart:last-child) {
    grid-column: auto;
  }
}

@media (max-width: 800px) {
  .scout-map {
    inset-block-start: 68px;
  }
}

@media (max-width: 720px) {
  .scout-map__header {
    top: 0.65rem;
    left: 0.65rem;
    right: 4.7rem;
    max-width: none;
    padding: 0.7rem;
  }

  .scout-map__header > div:first-child > p:last-child,
  .scout-map__eyebrow,
  .scout-map__legend {
    display: none;
  }

  .scout-map__header h4 {
    margin: 0;
    font-size: 0.88rem;
  }

  .scout-map__exit {
    min-height: 2.2rem;
    margin-left: auto;
  }

  .scout-map__drawer {
    padding: 1rem;
  }

  .scout-map__metrics {
    grid-template-columns: 1fr;
  }
}

:global(body.has-scout-map-open) {
  overflow: hidden;
}

:global(body.has-scout-map-open .page > .nav) {
  position: fixed;
  z-index: 9001;
  inset: 0 0 auto;
  width: 100%;
}
</style>
