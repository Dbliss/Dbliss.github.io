<template>
  <section class="suburb-selector card">
    <div class="suburb-selector__header">
      <div>
        <p class="suburb-selector__kicker">Suburb Defaults</p>
        <h3>Select a suburb from the map</h3>
        <p class="suburb-selector__copy">
          Pick a suburb to prefill house and apartment price, growth, yield, and vacancy from your property-market dataset.
          NSW tax and duty logic stays unchanged for now.
        </p>
      </div>
      <div v-if="currentSelection?.label" class="suburb-selector__selection">
        <span>Selected</span>
        <strong>{{ currentSelection.label }}</strong>
      </div>
    </div>

    <div class="suburb-selector__controls">
      <label>
        <span>State</span>
        <select :value="activeState" @change="handleStateChange($event.target.value)">
          <option v-for="state in availableStates" :key="state.code" :value="state.code">{{ state.name }}</option>
        </select>
      </label>
      <label>
        <span>Search suburb</span>
        <input
          v-model.trim="searchQuery"
          type="search"
          placeholder="Search suburb, state, or postcode"
        />
      </label>
    </div>

    <div class="suburb-selector__layout">
      <div class="suburb-selector__map-wrap">
        <div ref="mapEl" class="suburb-selector__map" :class="{ 'is-disabled': !mapReady || !currentChunkMeta }"></div>
        <div v-if="statusMessage" class="suburb-selector__status">
          {{ statusMessage }}
        </div>
      </div>

      <div class="suburb-selector__results">
        <p class="suburb-selector__results-title">Matching suburbs</p>
        <div v-if="filteredSuburbs.length" class="suburb-selector__list">
          <button
            v-for="suburb in filteredSuburbs"
            :key="suburb.salCode2021"
            type="button"
            class="suburb-selector__option"
            :class="{ 'is-active': currentSelection?.salCode2021 === suburb.salCode2021 }"
            @click="selectSuburb(suburb)"
          >
            <strong>{{ suburb.suburb }}</strong>
            <span>{{ suburb.state }}<template v-if="suburb.postcode"> {{ suburb.postcode }}</template></span>
          </button>
        </div>
        <p v-else class="suburb-selector__empty">No market-enabled suburbs match the current search.</p>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import 'maplibre-gl/dist/maplibre-gl.css'

const props = defineProps({
  currentSelection: { type: Object, default: null },
  manifest: { type: Object, default: () => ({}) },
  selectedState: { type: String, default: '' },
  suburbOptions: { type: Array, default: () => [] }
})

const emit = defineEmits(['select-suburb', 'update:selectedState'])

const mapEl = ref(null)
const mapReady = ref(false)
const searchQuery = ref('')
const statusMessage = ref('Loading map…')
const hoveredSalCode = ref(null)
const loadedChunkId = ref('')
const chunkCache = new Map()

let maplibreModule = null
let map = null

const availableStates = computed(() => {
  const manifestStates = Array.isArray(props.manifest?.states) ? props.manifest.states : []
  if (manifestStates.length) return manifestStates

  const codes = [...new Set(props.suburbOptions.map(option => option.state).filter(Boolean))]
  return codes.map(code => ({ code, name: code, chunk: null }))
})

const activeState = computed(() => {
  if (props.selectedState) return props.selectedState
  return availableStates.value[0]?.code || ''
})

const filteredSuburbs = computed(() => {
  const query = searchQuery.value.toLowerCase()
  return props.suburbOptions
    .filter((option) => !activeState.value || option.state === activeState.value)
    .filter((option) => {
      if (!query) return true
      return [option.label, option.suburb, option.state, option.postcode]
        .filter(Boolean)
        .some(value => String(value).toLowerCase().includes(query))
    })
    .slice(0, 18)
})

const currentChunkMeta = computed(() => {
  const states = availableStates.value
  const active = states.find(entry => entry.code === activeState.value)
  const chunkId = active?.chunk || findChunkForState(activeState.value)
  return chunkId ? props.manifest?.chunks?.[chunkId] || null : null
})

onMounted(async () => {
  await initialiseMap()
  await loadActiveChunk()
})

onBeforeUnmount(() => {
  if (map) {
    map.remove()
    map = null
  }
})

watch(activeState, async () => {
  searchQuery.value = ''
  await loadActiveChunk()
})

watch(
  () => props.currentSelection?.salCode2021,
  () => {
    updateSelectionLayer()
    focusSelectedSuburb()
  }
)

async function initialiseMap() {
  if (!mapEl.value || typeof window === 'undefined') {
    statusMessage.value = 'Map is unavailable in this environment.'
    return
  }

  try {
    maplibreModule = await import('maplibre-gl')
    map = new maplibreModule.Map({
      container: mapEl.value,
      style: {
        version: 8,
        sources: {},
        layers: [
          {
            id: 'background',
            type: 'background',
            paint: {
              'background-color': '#eef5ff'
            }
          }
        ]
      },
      center: [134, -26],
      zoom: 3.1,
      minZoom: 2.5,
      maxZoom: 12,
      attributionControl: false
    })

    map.addControl(new maplibreModule.NavigationControl({ showCompass: false }), 'top-right')
    map.on('load', () => {
      mapReady.value = true
      installLayers()
      statusMessage.value = ''
    })
  } catch (error) {
    statusMessage.value = error instanceof Error ? error.message : 'MapLibre failed to load.'
  }
}

function installLayers() {
  if (!map || map.getSource('suburbs')) return
  map.addSource('suburbs', {
    type: 'geojson',
    data: emptyFeatureCollection(),
    promoteId: 'salCode2021'
  })

  map.addLayer({
    id: 'suburbs-fill',
    type: 'fill',
    source: 'suburbs',
    paint: {
      'fill-color': [
        'case',
        ['==', ['get', 'hasMarketData'], true],
        '#7dd3fc',
        '#d7deea'
      ],
      'fill-opacity': [
        'case',
        ['==', ['get', 'hasMarketData'], true],
        0.35,
        0.15
      ]
    }
  })

  map.addLayer({
    id: 'suburbs-outline',
    type: 'line',
    source: 'suburbs',
    paint: {
      'line-color': '#7a92b4',
      'line-width': 1.1,
      'line-opacity': 0.85
    }
  })

  map.addLayer({
    id: 'suburbs-hover',
    type: 'line',
    source: 'suburbs',
    filter: ['==', ['get', 'salCode2021'], ''],
    paint: {
      'line-color': '#163a69',
      'line-width': 2.6
    }
  })

  map.addLayer({
    id: 'suburbs-selected',
    type: 'line',
    source: 'suburbs',
    filter: ['==', ['get', 'salCode2021'], ''],
    paint: {
      'line-color': '#22c55e',
      'line-width': 3
    }
  })

  map.on('mousemove', 'suburbs-fill', handleMapHover)
  map.on('mouseleave', 'suburbs-fill', () => {
    hoveredSalCode.value = null
    updateHoverLayer()
  })
  map.on('click', 'suburbs-fill', handleMapClick)
}

async function loadActiveChunk() {
  if (!mapReady.value || !currentChunkMeta.value) {
    if (!availableStates.value.length) {
      statusMessage.value = 'No suburb geometry manifest is available yet.'
    }
    return
  }

  const chunkId = currentChunkMeta.value.id
  if (!chunkId) return
  if (!chunkCache.has(chunkId)) {
    statusMessage.value = 'Loading suburb boundaries…'
    const response = await fetch(currentChunkMeta.value.path)
    if (!response.ok) {
      statusMessage.value = `Unable to load suburb boundaries for ${activeState.value}.`
      return
    }
    chunkCache.set(chunkId, await response.json())
  }

  loadedChunkId.value = chunkId
  const source = map?.getSource('suburbs')
  source?.setData(chunkCache.get(chunkId))
  fitToChunk(currentChunkMeta.value)
  updateSelectionLayer()
  updateHoverLayer()
  statusMessage.value = ''
}

function fitToChunk(chunkMeta) {
  if (!map || !Array.isArray(chunkMeta?.bbox) || chunkMeta.bbox.length !== 4) return
  map.fitBounds(
    [
      [chunkMeta.bbox[0], chunkMeta.bbox[1]],
      [chunkMeta.bbox[2], chunkMeta.bbox[3]]
    ],
    { padding: 28, duration: 0 }
  )
}

function handleStateChange(value) {
  emit('update:selectedState', value)
}

function handleMapHover(event) {
  const feature = event.features?.[0]
  hoveredSalCode.value = String(feature?.properties?.salCode2021 || '')
  updateHoverLayer()
  if (map) {
    map.getCanvas().style.cursor = feature?.properties?.hasMarketData ? 'pointer' : 'default'
  }
}

function handleMapClick(event) {
  const feature = event.features?.[0]
  if (!feature?.properties?.hasMarketData) return
  const option = props.suburbOptions.find(
    suburb => suburb.salCode2021 === String(feature.properties.salCode2021 || '')
  )
  if (option) selectSuburb(option)
}

function selectSuburb(suburb) {
  emit('select-suburb', {
    salCode2021: suburb.salCode2021,
    slug: suburb.slug,
    label: suburb.label
  })
}

function updateHoverLayer() {
  if (!map?.getLayer('suburbs-hover')) return
  map.setFilter('suburbs-hover', ['==', ['get', 'salCode2021'], hoveredSalCode.value || ''])
}

function updateSelectionLayer() {
  if (!map?.getLayer('suburbs-selected')) return
  map.setFilter('suburbs-selected', ['==', ['get', 'salCode2021'], props.currentSelection?.salCode2021 || ''])
}

function focusSelectedSuburb() {
  const selection = props.currentSelection
  if (!selection || !map) return
  const selectedOption = props.suburbOptions.find(option => option.salCode2021 === selection.salCode2021)
  if (!selectedOption) return
  if (selectedOption.state && selectedOption.state !== activeState.value) {
    emit('update:selectedState', selectedOption.state)
    return
  }
  if (selectedOption.geometryChunk && selectedOption.geometryChunk !== loadedChunkId.value) return
  if (Array.isArray(selectedOption.centroid) && selectedOption.centroid.length === 2) {
    map.easeTo({ center: selectedOption.centroid, zoom: Math.max(map.getZoom(), 10), duration: 350 })
  }
}

function findChunkForState(stateCode) {
  if (!stateCode || !props.manifest?.chunks) return null
  const entries = Object.values(props.manifest.chunks)
  const match = entries.find(chunk => chunk?.id === stateCode.toLowerCase())
  return match?.id || null
}

function emptyFeatureCollection() {
  return {
    type: 'FeatureCollection',
    features: []
  }
}
</script>

<style scoped>
.suburb-selector {
  padding: 1rem 1.1rem;
}

.suburb-selector__header,
.suburb-selector__controls,
.suburb-selector__layout {
  display: grid;
  gap: 1rem;
}

.suburb-selector__header {
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: start;
}

.suburb-selector__kicker {
  margin: 0 0 0.35rem;
  text-transform: uppercase;
  letter-spacing: 0.16em;
  font-size: 0.72rem;
  color: #5f7a9f;
}

.suburb-selector__header h3,
.suburb-selector__results-title {
  margin: 0;
}

.suburb-selector__copy {
  margin: 0.45rem 0 0;
  color: #5b7091;
  line-height: 1.5;
}

.suburb-selector__selection {
  min-width: 220px;
  padding: 0.85rem 0.95rem;
  border: 1px solid rgba(154, 174, 204, 0.22);
  border-radius: 18px;
  background: rgba(244, 249, 255, 0.86);
}

.suburb-selector__selection span {
  display: block;
  font-size: 0.78rem;
  color: #6782a6;
  text-transform: uppercase;
  letter-spacing: 0.14em;
}

.suburb-selector__selection strong {
  display: block;
  margin-top: 0.35rem;
  color: #173050;
}

.suburb-selector__controls {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.suburb-selector__controls label,
.suburb-selector__controls input,
.suburb-selector__controls select {
  width: 100%;
}

.suburb-selector__controls span {
  display: block;
  margin-bottom: 0.35rem;
  font-size: 0.82rem;
  color: #5c7598;
}

.suburb-selector__layout {
  grid-template-columns: minmax(0, 1.35fr) minmax(280px, 0.8fr);
  align-items: start;
}

.suburb-selector__map-wrap {
  position: relative;
}

.suburb-selector__map {
  min-height: 430px;
  border-radius: 20px;
  overflow: hidden;
  border: 1px solid rgba(154, 174, 204, 0.22);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.5);
}

.suburb-selector__map.is-disabled {
  opacity: 0.72;
}

.suburb-selector__status {
  position: absolute;
  left: 1rem;
  right: 1rem;
  bottom: 1rem;
  padding: 0.75rem 0.9rem;
  border-radius: 14px;
  background: rgba(15, 23, 42, 0.78);
  color: #fff;
  font-size: 0.88rem;
}

.suburb-selector__results {
  display: grid;
  gap: 0.8rem;
}

.suburb-selector__list {
  display: grid;
  gap: 0.55rem;
  max-height: 430px;
  overflow: auto;
}

.suburb-selector__option {
  display: grid;
  gap: 0.2rem;
  width: 100%;
  padding: 0.85rem 0.95rem;
  text-align: left;
  border-radius: 16px;
  border: 1px solid rgba(154, 174, 204, 0.22);
  background: rgba(255, 255, 255, 0.88);
  color: #173050;
}

.suburb-selector__option.is-active {
  border-color: rgba(34, 197, 94, 0.55);
  background: rgba(220, 252, 231, 0.68);
}

.suburb-selector__option span,
.suburb-selector__empty {
  color: #5b7091;
}

@media (max-width: 980px) {
  .suburb-selector__header,
  .suburb-selector__controls,
  .suburb-selector__layout {
    grid-template-columns: 1fr;
  }

  .suburb-selector__map,
  .suburb-selector__list {
    min-height: 320px;
    max-height: 320px;
  }
}
</style>
