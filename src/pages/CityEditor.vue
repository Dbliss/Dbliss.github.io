<template>
  <div class="ed">
    <canvas ref="canvasEl" class="ed-canvas"></canvas>

    <div v-if="startupError" class="ed-error" role="alert">
      <strong>City editor could not start</strong>
      <span>{{ startupError }}</span>
    </div>

    <aside class="ed-panel">
      <h1>City layout editor</h1>
      <p class="hint">
        Left-click uses the active tool · right-drag orbits · middle-drag pans · wheel zooms
      </p>

      <div class="tools">
        <button :class="{ on: state.tool === 'road' }" @click="setTool('road')">Roads</button>
        <button :class="{ on: state.tool === 'select' }" @click="setTool('select')">Select / move</button>
        <button :class="{ on: state.tool === 'erase' }" @click="setTool('erase')">Erase</button>
      </div>

      <label class="row">
        Snap
        <select v-model.number="snap" @change="editor.setSnap(snap)">
          <option :value="0.5">0.5</option>
          <option :value="1">1</option>
          <option :value="3">3</option>
          <option :value="6">6</option>
          <option :value="12">12 (tile)</option>
        </select>
      </label>

      <details v-for="(items, cat) in grouped" :key="cat" :open="cat === 'Landmarks'">
        <summary>{{ cat }}</summary>
        <div class="palette">
          <button
            v-for="e in items"
            :key="e.id"
            :class="{ on: state.tool === 'place' && state.brush === e.id }"
            @click="setBrush(e.id)"
          >
            {{ e.label }}
          </button>
        </div>
      </details>

      <div class="actions">
        <button @click="download">Download JSON</button>
        <button @click="copyJson">{{ copied ? 'Copied ✓' : 'Copy JSON' }}</button>
        <button @click="fileEl.click()">Load JSON…</button>
        <input ref="fileEl" type="file" accept=".json,application/json" hidden @change="loadFile" />
        <button @click="editor.undo()">Undo (Ctrl+Z)</button>
        <button @click="editor.resetCamera()">Reset camera</button>
        <button @click="resetDefault">Reset to default</button>
        <button class="danger" @click="clearAll">Clear all</button>
      </div>

      <p class="stats">
        {{ state.stats.roads }} road tiles · {{ state.stats.objects }} objects
        <span v-if="restored" class="ok">· restored autosave</span>
      </p>
      <p v-if="state.selected" class="stats">
        Selected: {{ state.selected.kind }}/{{ state.selected.type }} at
        ({{ state.selected.x }}, {{ state.selected.z }})
      </p>

      <p class="hint keys">
        <b>R</b> rotate 90° (Shift+R 15°) · <b>[ ]</b> scale · <b>Del</b> remove selected ·
        <b>Alt+paint</b> erases road · <b>Esc</b> deselect
      </p>
      <router-link class="back" to="/">← back to home</router-link>
    </aside>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { createEditor } from '../city/editor/editorScene.js'
import { CATEGORIES, PALETTE, paletteId } from '../city/editor/editorPalette.js'
import { CITY_LAYOUT_STORAGE_KEY } from '../city/layoutSchema.js'
import defaultCityLayout from '../data/cityLayout.json'

const STORAGE_KEY = CITY_LAYOUT_STORAGE_KEY

const canvasEl = ref(null)
const fileEl = ref(null)
const snap = ref(1)
const copied = ref(false)
const restored = ref(false)
const startupError = ref('')
let editor = null
let saveTimer = 0

const state = reactive({
  tool: 'road',
  brush: null,
  stats: { roads: 0, objects: 0 },
  selected: null
})

const grouped = computed(() => {
  const g = {}
  for (const cat of CATEGORIES) {
    g[cat] = PALETTE.filter((e) => e.cat === cat).map((e) => ({ id: paletteId(e), label: e.label }))
  }
  return g
})

function onChange({ layout, stats, selected, tool, brush }) {
  state.tool = tool
  state.brush = brush
  state.stats = stats
  state.selected = selected
  clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(layout))
    } catch (e) {
      console.warn('autosave failed', e)
    }
  }, 400)
}

const setTool = (t) => editor.setTool(t)
const setBrush = (id) => editor.setBrush(id)

function download() {
  const blob = new Blob([JSON.stringify(editor.serialize(), null, 2)], { type: 'application/json' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = 'cityLayout.json'
  a.click()
  URL.revokeObjectURL(a.href)
}

async function copyJson() {
  await navigator.clipboard.writeText(JSON.stringify(editor.serialize(), null, 2))
  copied.value = true
  setTimeout(() => (copied.value = false), 1500)
}

function loadFile(e) {
  const file = e.target.files?.[0]
  if (!file) return
  file.text().then((text) => {
    try {
      editor.loadLayout(JSON.parse(text))
    } catch (err) {
      alert('Not valid layout JSON: ' + err.message)
    }
  })
  e.target.value = ''
}

function resetDefault() {
  if (confirm('Replace the current layout with the bundled default?')) {
    editor.loadLayout(defaultCityLayout)
    restored.value = false
  }
}

function clearAll() {
  if (confirm('Remove every road and object? (Ctrl+Z can restore)')) editor.clearAll()
}

onMounted(() => {
  try {
    editor = createEditor(canvasEl.value, { onChange })
  } catch (error) {
    startupError.value = error instanceof Error ? error.message : String(error)
    console.error('city editor failed to start', error)
    return
  }

  const saved = localStorage.getItem(STORAGE_KEY)
  if (saved) {
    try {
      editor.loadLayout(JSON.parse(saved))
      restored.value = true
    } catch (error) {
      console.warn('could not restore autosave', error)
      editor.loadLayout(defaultCityLayout)
    }
  } else {
    editor.loadLayout(defaultCityLayout)
  }
})

onBeforeUnmount(() => {
  clearTimeout(saveTimer)
  editor?.dispose()
})
</script>

<style scoped>
.ed {
  position: fixed;
  inset: 0;
  background: #171c28;
  color: #dce3f2;
  font-size: 13px;
}
.ed-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  display: block;
}
.ed-error {
  position: absolute;
  z-index: 3;
  top: 24px;
  left: 50%;
  transform: translateX(-50%);
  display: grid;
  gap: 4px;
  max-width: min(620px, calc(100vw - 32px));
  padding: 14px 18px;
  border: 1px solid #ff7777;
  border-radius: 10px;
  background: rgba(45, 10, 18, 0.96);
  color: #ffd7d7;
}
.ed-panel {
  position: absolute;
  top: 12px;
  left: 12px;
  bottom: 12px;
  width: 252px;
  overflow-y: auto;
  background: rgba(11, 14, 24, 0.92);
  border: 1px solid #2c3550;
  border-radius: 10px;
  padding: 14px;
  backdrop-filter: blur(6px);
}
h1 {
  font-size: 15px;
  margin: 0 0 6px;
  color: #fff;
}
.hint {
  color: #8b96b5;
  margin: 0 0 10px;
  line-height: 1.45;
}
.keys {
  margin-top: 10px;
}
.tools,
.actions,
.palette {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 10px;
}
button {
  background: #1d2438;
  color: #dce3f2;
  border: 1px solid #33406351;
  border-radius: 6px;
  padding: 5px 9px;
  cursor: pointer;
  font-size: 12px;
}
button:hover {
  background: #273052;
}
button.on {
  background: #3b2f78;
  border-color: #8b5bff;
  color: #fff;
}
button.danger {
  border-color: #7c3a3a;
  color: #ff9c9c;
}
.row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 4px 0 12px;
  color: #8b96b5;
}
select {
  background: #1d2438;
  color: #dce3f2;
  border: 1px solid #334063;
  border-radius: 6px;
  padding: 3px 6px;
}
details {
  margin-bottom: 8px;
}
summary {
  cursor: pointer;
  color: #aeb9d8;
  font-weight: 600;
  margin-bottom: 6px;
}
.stats {
  color: #8b96b5;
  margin: 6px 0 0;
}
.ok {
  color: #67e08a;
}
.back {
  display: inline-block;
  margin-top: 12px;
  color: #7fd4ff;
  text-decoration: none;
}
</style>
