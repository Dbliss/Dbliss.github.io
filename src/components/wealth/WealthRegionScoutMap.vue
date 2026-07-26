<template>
  <section class="scout-map">
    <header class="scout-map__header">
      <div>
        <p class="scout-map__eyebrow">Score map</p>
        <h4>Explore every NSW suburb</h4>
        <p>Drag to move, scroll to zoom, and select a scored suburb for its full market outlook.</p>
      </div>
      <div class="scout-map__legend" aria-label="Map score legend">
        <span>Lower score</span>
        <span class="scout-map__legend-ramp" aria-hidden="true"></span>
        <span>Higher score</span>
      </div>
    </header>

    <div class="scout-map__layout" :class="{ 'has-selection': selectedRecommendation }">
      <div
        ref="mapFrame"
        class="scout-map__frame"
        :class="{ 'is-dragging': isDragging }"
        tabindex="0"
        role="application"
        :aria-label="mapAriaLabel"
        @wheel.prevent="handleWheel"
        @pointerdown="handlePointerDown"
        @pointermove="handlePointerMove"
        @pointerup="handlePointerUp"
        @pointercancel="handlePointerUp"
        @pointerleave="handlePointerLeave"
        @keydown="handleKeydown"
      >
        <canvas ref="mapCanvas" class="scout-map__canvas"></canvas>

        <div v-if="isLoading" class="scout-map__status">
          <span class="scout-map__spinner" aria-hidden="true"></span>
          <strong>Drawing suburb boundaries</strong>
        </div>
        <div v-else-if="loadError" class="scout-map__status scout-map__status--error">
          <strong>Map boundaries could not be loaded.</strong>
          <span>The ranked list is still available.</span>
        </div>

        <div
          v-if="hoveredFeature && !isDragging"
          class="scout-map__tooltip"
          :style="{ left: `${tooltipPosition.x}px`, top: `${tooltipPosition.y}px` }"
        >
          <strong>{{ hoveredFeature.name }}</strong>
          <span v-if="hoveredFeature.recommendation">
            {{ formatScore(hoveredFeature.recommendation) }}/10 ·
            {{ formatCurrency(hoveredFeature.recommendation.priceToday) }}
          </span>
          <span v-else>No score for the current filters</span>
        </div>

        <div class="scout-map__controls" aria-label="Map controls">
          <button type="button" aria-label="Zoom in" @click.stop="zoomBy(1.35)">+</button>
          <button type="button" aria-label="Zoom out" @click.stop="zoomBy(1 / 1.35)">−</button>
          <button type="button" class="scout-map__reset" @click.stop="resetView">Reset</button>
        </div>

        <p class="scout-map__attribution">
          Boundaries: Australian Bureau of Statistics, ASGS 2021 (CC BY 4.0)
        </p>
      </div>

      <Transition name="scout-map-drawer">
        <aside v-if="selectedRecommendation" class="scout-map__drawer" aria-live="polite">
          <button type="button" class="scout-map__close" aria-label="Close suburb details" @click="clearSelection">×</button>

          <div class="scout-map__drawer-head">
            <p>#{{ selectedRecommendation.rank }} suburb</p>
            <h4>{{ selectedRecommendation.label }}</h4>
            <span>{{ selectedRecommendation.regionLabel }}</span>
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
    </div>
  </section>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import WealthLineChart from './WealthLineChart.vue'
import WealthPropertyTrendChart from './WealthPropertyTrendChart.vue'

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

const mapFrame = ref(null)
const mapCanvas = ref(null)
const isLoading = ref(true)
const loadError = ref(false)
const isDragging = ref(false)
const hoveredFeature = ref(null)
const selectedRecommendation = ref(null)
const tooltipPosition = ref({ x: 0, y: 0 })

const zoom = ref(1)
const pan = ref({ x: 0, y: 0 })

let mapFeatures = []
let mapBounds = null
let resizeObserver = null
let drawFrame = null
let pointerStart = null
let lastPointer = null
let didDrag = false

const recommendationBySuburb = computed(() => {
  const lookup = new Map()
  props.recommendations.forEach((recommendation) => {
    const key = normaliseSuburbName(recommendation.suburb || recommendation.label)
    if (!lookup.has(key)) lookup.set(key, recommendation)
  })
  return lookup
})

const mapAriaLabel = computed(() =>
  `Interactive NSW suburb score map. ${props.recommendations.length} scored suburbs are visible. Use arrow keys to move and plus or minus to zoom.`
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
  scheduleDraw()
})

watch(() => props.scoreBounds, scheduleDraw, { deep: true })
watch(selectedRecommendation, scheduleDraw)

onMounted(async () => {
  resizeObserver = new ResizeObserver(() => scheduleDraw())
  if (mapFrame.value) resizeObserver.observe(mapFrame.value)

  try {
    const response = await fetch(`${import.meta.env.BASE_URL}data/nsw-suburb-boundaries.json`)
    if (!response.ok) throw new Error(`Boundary request failed with ${response.status}`)
    const payload = await response.json()
    mapFeatures = await prepareFeaturesInChunks(payload.features || [])
    mapBounds = calculateFeatureBounds(mapFeatures)
  } catch (error) {
    console.error('Unable to load NSW suburb boundaries', error)
    loadError.value = true
  } finally {
    isLoading.value = false
    await nextTick()
    scheduleDraw()
  }
})

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  if (drawFrame) cancelAnimationFrame(drawFrame)
})

function prepareFeature(feature) {
  const geometry = feature?.g
  if (!geometry || !['Polygon', 'MultiPolygon'].includes(geometry.type)) return null
  const polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates
  const bounds = calculatePolygonBounds(polygons)
  if (!bounds) return null
  return {
    code: feature.c,
    name: feature.n,
    nameKey: normaliseSuburbName(feature.n),
    polygons,
    bounds,
    path: buildFeaturePath(polygons)
  }
}

async function prepareFeaturesInChunks(features) {
  const preparedFeatures = []
  const chunkSize = 300

  for (let index = 0; index < features.length; index += chunkSize) {
    preparedFeatures.push(
      ...features
        .slice(index, index + chunkSize)
        .map(prepareFeature)
        .filter(Boolean)
    )

    if (index + chunkSize < features.length) {
      await yieldToBrowser()
    }
  }

  return preparedFeatures
}

function buildFeaturePath(polygons) {
  const path = new Path2D()
  polygons.forEach((polygon) => {
    polygon.forEach((ring) => {
      ring.forEach((point, index) => {
        if (index === 0) path.moveTo(point[0], point[1])
        else path.lineTo(point[0], point[1])
      })
      path.closePath()
    })
  })
  return path
}

function calculatePolygonBounds(polygons) {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity

  polygons.forEach((polygon) => polygon.forEach((ring) => ring.forEach(([x, y]) => {
    minX = Math.min(minX, x)
    minY = Math.min(minY, y)
    maxX = Math.max(maxX, x)
    maxY = Math.max(maxY, y)
  })))

  return Number.isFinite(minX) ? { minX, minY, maxX, maxY } : null
}

function calculateFeatureBounds(features) {
  if (!features.length) return null
  return features.reduce((bounds, feature) => ({
    minX: Math.min(bounds.minX, feature.bounds.minX),
    minY: Math.min(bounds.minY, feature.bounds.minY),
    maxX: Math.max(bounds.maxX, feature.bounds.maxX),
    maxY: Math.max(bounds.maxY, feature.bounds.maxY)
  }), { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity })
}

function scheduleDraw() {
  if (drawFrame) cancelAnimationFrame(drawFrame)
  drawFrame = requestAnimationFrame(() => {
    drawFrame = null
    drawMap()
  })
}

function drawMap() {
  const canvas = mapCanvas.value
  const frame = mapFrame.value
  if (!canvas || !frame || !mapBounds) return

  const width = Math.max(1, frame.clientWidth)
  const height = Math.max(1, frame.clientHeight)
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  if (canvas.width !== Math.round(width * dpr) || canvas.height !== Math.round(height * dpr)) {
    canvas.width = Math.round(width * dpr)
    canvas.height = Math.round(height * dpr)
  }

  const context = canvas.getContext('2d')
  context.setTransform(dpr, 0, 0, dpr, 0, 0)
  context.clearRect(0, 0, width, height)
  context.fillStyle = '#eaf3f7'
  context.fillRect(0, 0, width, height)

  const transform = getMapTransform(width, height)
  context.save()
  context.translate(transform.originX + pan.value.x, transform.originY + pan.value.y)
  context.scale(transform.scale * zoom.value, -transform.scale * zoom.value)
  context.translate(-transform.centerX, -transform.centerY)
  context.lineJoin = 'round'

  mapFeatures.forEach((feature) => {
    const recommendation = recommendationBySuburb.value.get(feature.nameKey)
    const isSelected = recommendation?.key === selectedRecommendation.value?.key
    context.fillStyle = isSelected
      ? '#f59e0b'
      : recommendation
        ? scoreColor(getRelativeScore(recommendation))
        : '#f7fafc'
    context.strokeStyle = isSelected
      ? '#92400e'
      : recommendation
        ? 'rgba(15, 74, 74, 0.56)'
        : 'rgba(100, 116, 139, 0.34)'
    context.lineWidth = 0.72 / (transform.scale * zoom.value)
    context.fill(feature.path, 'evenodd')
    context.stroke(feature.path)
  })

  context.restore()
}

function getMapTransform(width, height) {
  const padding = Math.min(width, height) * 0.055
  const spanX = Math.max(0.001, mapBounds.maxX - mapBounds.minX)
  const spanY = Math.max(0.001, mapBounds.maxY - mapBounds.minY)
  return {
    centerX: (mapBounds.minX + mapBounds.maxX) / 2,
    centerY: (mapBounds.minY + mapBounds.maxY) / 2,
    originX: width / 2,
    originY: height / 2,
    scale: Math.min((width - (padding * 2)) / spanX, (height - (padding * 2)) / spanY)
  }
}

function eventToWorld(event) {
  const frame = mapFrame.value
  if (!frame || !mapBounds) return null
  const rect = frame.getBoundingClientRect()
  const x = event.clientX - rect.left
  const y = event.clientY - rect.top
  const transform = getMapTransform(rect.width, rect.height)
  const activeScale = transform.scale * zoom.value
  return {
    x: transform.centerX + ((x - transform.originX - pan.value.x) / activeScale),
    y: transform.centerY - ((y - transform.originY - pan.value.y) / activeScale),
    screenX: x,
    screenY: y
  }
}

function findFeatureAtPoint(point) {
  if (!point) return null
  for (let index = mapFeatures.length - 1; index >= 0; index -= 1) {
    const feature = mapFeatures[index]
    if (
      point.x < feature.bounds.minX ||
      point.x > feature.bounds.maxX ||
      point.y < feature.bounds.minY ||
      point.y > feature.bounds.maxY
    ) continue
    if (feature.polygons.some((polygon) => pointInPolygon(point.x, point.y, polygon))) {
      return {
        ...feature,
        recommendation: recommendationBySuburb.value.get(feature.nameKey) || null
      }
    }
  }
  return null
}

function pointInPolygon(x, y, rings) {
  if (!rings.length || !pointInRing(x, y, rings[0])) return false
  return !rings.slice(1).some((ring) => pointInRing(x, y, ring))
}

function pointInRing(x, y, ring) {
  let inside = false
  for (let index = 0, previous = ring.length - 1; index < ring.length; previous = index, index += 1) {
    const [currentX, currentY] = ring[index]
    const [previousX, previousY] = ring[previous]
    const intersects = ((currentY > y) !== (previousY > y))
      && (x < ((previousX - currentX) * (y - currentY)) / ((previousY - currentY) || 1e-12) + currentX)
    if (intersects) inside = !inside
  }
  return inside
}

function handlePointerDown(event) {
  if (event.button !== 0) return
  mapFrame.value?.setPointerCapture(event.pointerId)
  isDragging.value = true
  didDrag = false
  pointerStart = { x: event.clientX, y: event.clientY }
  lastPointer = pointerStart
}

function handlePointerMove(event) {
  const point = eventToWorld(event)
  tooltipPosition.value = {
    x: Math.min((mapFrame.value?.clientWidth || 0) - 160, point?.screenX + 14),
    y: Math.max(10, (point?.screenY || 0) - 18)
  }

  if (isDragging.value && lastPointer) {
    const deltaX = event.clientX - lastPointer.x
    const deltaY = event.clientY - lastPointer.y
    if (Math.hypot(event.clientX - pointerStart.x, event.clientY - pointerStart.y) > 4) didDrag = true
    pan.value = { x: pan.value.x + deltaX, y: pan.value.y + deltaY }
    lastPointer = { x: event.clientX, y: event.clientY }
    hoveredFeature.value = null
    scheduleDraw()
    return
  }

  hoveredFeature.value = findFeatureAtPoint(point)
}

function handlePointerUp(event) {
  if (!isDragging.value) return
  mapFrame.value?.releasePointerCapture?.(event.pointerId)
  isDragging.value = false
  lastPointer = null
  if (didDrag) return

  const feature = findFeatureAtPoint(eventToWorld(event))
  if (feature?.recommendation) selectedRecommendation.value = feature.recommendation
}

function handlePointerLeave() {
  if (!isDragging.value) hoveredFeature.value = null
}

function handleWheel(event) {
  const factor = Math.exp(-event.deltaY * 0.0012)
  zoomAt(factor, event.clientX, event.clientY)
}

function zoomBy(factor) {
  const rect = mapFrame.value?.getBoundingClientRect()
  if (!rect) return
  zoomAt(factor, rect.left + (rect.width / 2), rect.top + (rect.height / 2))
}

function zoomAt(factor, clientX, clientY) {
  const frame = mapFrame.value
  if (!frame) return
  const rect = frame.getBoundingClientRect()
  const pointerX = clientX - rect.left
  const pointerY = clientY - rect.top
  const originX = rect.width / 2
  const originY = rect.height / 2
  const previousZoom = zoom.value
  const nextZoom = clamp(previousZoom * factor, 1, 120)
  const ratio = nextZoom / previousZoom
  pan.value = {
    x: pointerX - originX - ((pointerX - originX - pan.value.x) * ratio),
    y: pointerY - originY - ((pointerY - originY - pan.value.y) * ratio)
  }
  zoom.value = nextZoom
  scheduleDraw()
}

function handleKeydown(event) {
  const panStep = 44
  if (event.key === '+' || event.key === '=') zoomBy(1.35)
  else if (event.key === '-') zoomBy(1 / 1.35)
  else if (event.key === 'ArrowLeft') pan.value = { ...pan.value, x: pan.value.x + panStep }
  else if (event.key === 'ArrowRight') pan.value = { ...pan.value, x: pan.value.x - panStep }
  else if (event.key === 'ArrowUp') pan.value = { ...pan.value, y: pan.value.y + panStep }
  else if (event.key === 'ArrowDown') pan.value = { ...pan.value, y: pan.value.y - panStep }
  else if (event.key === 'Escape') clearSelection()
  else return
  event.preventDefault()
  scheduleDraw()
}

function resetView() {
  zoom.value = 1
  pan.value = { x: 0, y: 0 }
  scheduleDraw()
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

function scoreColor(score) {
  const stops = score < 5
    ? { from: [220, 232, 247], to: [87, 170, 158], progress: score / 5 }
    : { from: [87, 170, 158], to: [15, 118, 110], progress: (score - 5) / 5 }
  const channels = stops.from.map((value, index) => Math.round(value + ((stops.to[index] - value) * stops.progress)))
  return `rgb(${channels.join(',')})`
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

function yieldToBrowser() {
  return new Promise((resolve) => requestAnimationFrame(resolve))
}
</script>

<style scoped>
.scout-map {
  display: grid;
  gap: 1rem;
  width: min(100%, 70rem);
  margin-inline: auto;
}

.scout-map__header {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 1.5rem;
  padding: 1rem 1.1rem;
  border: 1px solid rgba(148, 163, 184, 0.22);
  border-radius: 18px;
  background: #fff;
}

.scout-map__header h4,
.scout-map__header p {
  margin: 0;
}

.scout-map__header h4 {
  margin-top: 0.18rem;
  color: #12233c;
  font-size: 1.1rem;
}

.scout-map__header > div > p:last-child {
  margin-top: 0.25rem;
  color: #64748b;
  font-size: 0.86rem;
  line-height: 1.5;
}

.scout-map__eyebrow {
  color: #0f766e;
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.scout-map__legend {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  flex: 0 0 auto;
  color: #64748b;
  font-size: 0.72rem;
}

.scout-map__legend-ramp {
  width: 7rem;
  height: 0.55rem;
  border-radius: 999px;
  background: linear-gradient(90deg, #dce8f7, #57aa9e, #0f766e);
}

.scout-map__layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 1rem;
}

.scout-map__layout.has-selection {
  grid-template-columns: minmax(0, 1.25fr) minmax(19rem, 0.75fr);
}

.scout-map__frame {
  position: relative;
  min-width: 0;
  height: min(72vh, 46rem);
  min-height: 34rem;
  overflow: hidden;
  border: 1px solid rgba(100, 116, 139, 0.3);
  border-radius: 22px;
  background: #eaf3f7;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.6);
  cursor: grab;
  touch-action: none;
}

.scout-map__frame:focus-visible {
  outline: 3px solid rgba(37, 99, 235, 0.35);
  outline-offset: 2px;
}

.scout-map__frame.is-dragging {
  cursor: grabbing;
}

.scout-map__canvas {
  display: block;
  width: 100%;
  height: 100%;
}

.scout-map__status {
  position: absolute;
  inset: 0;
  display: grid;
  place-content: center;
  justify-items: center;
  gap: 0.65rem;
  padding: 2rem;
  background: rgba(234, 243, 247, 0.9);
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
  z-index: 3;
  display: grid;
  gap: 0.12rem;
  min-width: 10rem;
  max-width: 15rem;
  padding: 0.65rem 0.75rem;
  border: 1px solid rgba(15, 23, 42, 0.1);
  border-radius: 12px;
  background: rgba(15, 23, 42, 0.92);
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.2);
  color: #fff;
  pointer-events: none;
  transform: translateY(-100%);
}

.scout-map__tooltip strong {
  font-size: 0.78rem;
}

.scout-map__tooltip span {
  color: rgba(255, 255, 255, 0.72);
  font-size: 0.7rem;
}

.scout-map__controls {
  position: absolute;
  z-index: 2;
  top: 1rem;
  right: 1rem;
  display: grid;
  overflow: hidden;
  border: 1px solid rgba(100, 116, 139, 0.28);
  border-radius: 12px;
  background: #fff;
  box-shadow: 0 8px 22px rgba(15, 23, 42, 0.12);
}

.scout-map__controls button {
  width: 2.7rem;
  min-height: 2.55rem;
  padding: 0;
  border: 0;
  border-bottom: 1px solid rgba(148, 163, 184, 0.22);
  background: #fff;
  color: #12233c;
  font: inherit;
  font-size: 1.25rem;
  cursor: pointer;
}

.scout-map__controls button:hover {
  background: #f1f5f9;
}

.scout-map__controls .scout-map__reset {
  width: auto;
  min-width: 3.7rem;
  padding-inline: 0.45rem;
  border-bottom: 0;
  color: #475569;
  font-size: 0.68rem;
  font-weight: 700;
}

.scout-map__attribution {
  position: absolute;
  right: 0.75rem;
  bottom: 0.55rem;
  margin: 0;
  padding: 0.24rem 0.4rem;
  border-radius: 5px;
  background: rgba(255, 255, 255, 0.8);
  color: #64748b;
  font-size: 0.58rem;
}

.scout-map__drawer {
  position: relative;
  min-width: 0;
  max-height: min(72vh, 46rem);
  overflow: auto;
  padding: 1.2rem;
  border: 1px solid rgba(148, 163, 184, 0.25);
  border-radius: 22px;
  background: #fff;
  box-shadow: 0 18px 40px rgba(71, 109, 154, 0.12);
}

.scout-map__close {
  position: sticky;
  z-index: 2;
  top: 0;
  float: right;
  display: grid;
  place-items: center;
  width: 2rem;
  height: 2rem;
  padding: 0;
  border: 1px solid rgba(148, 163, 184, 0.3);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.94);
  color: #475569;
  font: inherit;
  font-size: 1.25rem;
  cursor: pointer;
}

.scout-map__drawer-head {
  display: grid;
  gap: 0.2rem;
  padding: 0.2rem 2.4rem 1rem 0;
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
  font-size: 1.35rem;
  line-height: 1.15;
}

.scout-map__drawer-head span {
  color: #64748b;
  font-size: 0.78rem;
}

.scout-map__drawer-head strong {
  margin-top: 0.45rem;
  color: #0f766e;
  font-size: 1.3rem;
}

.scout-map__metrics {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.65rem;
  padding: 1rem 0;
}

.scout-map__metrics div {
  display: grid;
  gap: 0.15rem;
  min-width: 0;
  padding: 0.65rem;
  border-radius: 12px;
  background: #f8fafc;
}

.scout-map__metrics span {
  color: #64748b;
  font-size: 0.66rem;
  line-height: 1.3;
}

.scout-map__metrics strong {
  color: #12233c;
  font-size: 0.8rem;
  overflow-wrap: anywhere;
}

.scout-map__charts {
  display: grid;
  gap: 0.9rem;
}

.scout-map__charts :deep(.wealth-chart) {
  min-width: 0;
  overflow: hidden;
}

.scout-map-drawer-enter-active,
.scout-map-drawer-leave-active {
  transition: opacity 180ms ease, transform 180ms ease;
}

.scout-map-drawer-enter-from,
.scout-map-drawer-leave-to {
  opacity: 0;
  transform: translateX(12px);
}

@keyframes scout-map-spin {
  to { transform: rotate(360deg); }
}

@media (max-width: 980px) {
  .scout-map__layout.has-selection {
    grid-template-columns: 1fr;
  }

  .scout-map__drawer {
    max-height: none;
  }
}

@media (max-width: 720px) {
  .scout-map__header {
    display: grid;
    align-items: start;
  }

  .scout-map__legend {
    width: 100%;
  }

  .scout-map__legend-ramp {
    flex: 1 1 auto;
  }

  .scout-map__frame {
    height: 65vh;
    min-height: 28rem;
    border-radius: 18px;
  }

  .scout-map__metrics {
    grid-template-columns: 1fr;
  }

  .scout-map__attribution {
    left: 0.6rem;
    right: auto;
    max-width: calc(100% - 5rem);
  }
}
</style>
