import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

import { PALETTE, findEntry, paletteId } from './editorPalette.js'
import {
  CITY_LAYOUT_TILE,
  CITY_LAYOUT_VERSION,
  ROAD_TILE_MODELS,
  normalizeCityLayout,
  pickRoadTile
} from '../layoutSchema.js'

export { pickRoadTile } from '../layoutSchema.js'

/*
 * Interactive city layout editor scene.
 *
 * Roads are painted on a TILE-sized grid and auto-tiled: each cell picks the
 * right Kenney piece (straight / bend / T / crossroad / dead-end) from its
 * four neighbours, using the same rotation conventions verified in
 * cityScene.js, so whatever reads the saved layout can reproduce the roads
 * exactly.
 *
 * Everything else (buildings, trees, cars, landmark markers) is a free
 * object snapped to a configurable step, with per-object rotation and scale.
 *
 * serialize() → { version, tile, roads: [[gx,gz]…], objects: [{kind,type,x,z,ry,s}…] }
 */

export const LAYOUT_VERSION = CITY_LAYOUT_VERSION
export const TILE = CITY_LAYOUT_TILE
export const GRID_HALF = 210 // 35×35 cells, centres at multiples of TILE in [-204,204]
const MAX_CELL = Math.floor((GRID_HALF - TILE / 2) / TILE) // 17
const WORLD_RADIUS = 720
const surfaceY = (x, z) => Math.sqrt(Math.max(0, WORLD_RADIUS ** 2 - x ** 2 - z ** 2)) - WORLD_RADIUS

const gltfLoader = new GLTFLoader()
const gltfCache = new Map()
const asset = (p) => `${import.meta.env.BASE_URL}${p}`

function loadGLB(url) {
  if (!gltfCache.has(url)) {
    gltfCache.set(
      url,
      new Promise((resolve, reject) => gltfLoader.load(url, resolve, undefined, reject))
    )
  }
  return gltfCache.get(url)
}

/** Recenters + uniformly scales a model: base at y=0, centred on x/z. */
function fitModel(root, { footprint, height }) {
  const box = new THREE.Box3().setFromObject(root)
  const size = box.getSize(new THREE.Vector3())
  const center = box.getCenter(new THREE.Vector3())
  const s = footprint ? footprint / Math.max(size.x, size.z) : height / size.y
  root.scale.multiplyScalar(s)
  root.position.set(-center.x * s, -box.min.y * s, -center.z * s)
}

function textSprite(text, cssColor) {
  const c = document.createElement('canvas')
  c.width = 512
  c.height = 128
  const ctx = c.getContext('2d')
  ctx.font = 'bold 56px system-ui, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = 'rgba(8,10,18,0.72)'
  const w = ctx.measureText(text).width + 48
  ctx.fillRect((512 - w) / 2, 14, w, 100)
  ctx.fillStyle = cssColor
  ctx.fillText(text, 256, 66)
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false })
  )
  sprite.scale.set(18, 4.5, 1)
  return sprite
}

/** Placeholder marker for a procedural landmark (built for real on Home). */
function makeLandmarkMarker({ label, color, radius }) {
  const g = new THREE.Group()
  const css = '#' + color.toString(16).padStart(6, '0')

  const disc = new THREE.Mesh(
    new THREE.CircleGeometry(radius, 48),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.14, depthWrite: false })
  )
  disc.rotation.x = -Math.PI / 2
  disc.position.y = 0.06
  g.add(disc)

  const ring = new THREE.Mesh(
    new THREE.RingGeometry(radius - 0.5, radius, 48),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85, side: THREE.DoubleSide, depthWrite: false })
  )
  ring.rotation.x = -Math.PI / 2
  ring.position.y = 0.08
  g.add(ring)

  // direction notch so rotation is visible
  const notch = new THREE.Mesh(
    new THREE.ConeGeometry(1.4, 3.2, 4),
    new THREE.MeshBasicMaterial({ color })
  )
  notch.rotation.x = Math.PI / 2
  notch.position.set(0, 0.4, radius - 2.2)
  g.add(notch)

  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.25, 0.25, 9, 8),
    new THREE.MeshBasicMaterial({ color })
  )
  pole.position.y = 4.5
  g.add(pole)

  const label3d = textSprite(label, css)
  label3d.position.y = 11
  g.add(label3d)
  return g
}


export function createEditor(canvas, { onChange = () => {} } = {}) {
  // ------------------------------------------------------------- scene setup
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.outputColorSpace = THREE.SRGBColorSpace

  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0x171c28)

  const camera = new THREE.PerspectiveCamera(55, 1, 0.5, 2000)
  const HOME_POS = new THREE.Vector3(155, 205, 170)
  camera.position.copy(HOME_POS)

  scene.add(new THREE.HemisphereLight(0xdfe8ff, 0x6b7280, 1.15))
  const sun = new THREE.DirectionalLight(0xffffff, 1.7)
  sun.position.set(120, 200, 70)
  scene.add(sun)

  // A true spherical world surface; the editable city is the upper cap.
  const ground = new THREE.Mesh(
    new THREE.SphereGeometry(WORLD_RADIUS, 96, 64),
    new THREE.MeshStandardMaterial({ color: 0x263f36, roughness: 1 })
  )
  ground.position.y = -WORLD_RADIUS
  ground.receiveShadow = true
  scene.add(ground)

  // Curved authoring grid follows the globe instead of cutting through it.
  const grid = new THREE.Group()
  const gridMat = new THREE.LineBasicMaterial({ color: 0x526079, transparent: true, opacity: 0.42 })
  const lineSteps = 56
  for (let c = -GRID_HALF; c <= GRID_HALF; c += TILE) {
    for (const vertical of [true, false]) {
      const points = []
      for (let i = 0; i <= lineSteps; i++) {
        const t = -GRID_HALF + (i / lineSteps) * GRID_HALF * 2
        const x = vertical ? c : t
        const z = vertical ? t : c
        points.push(new THREE.Vector3(x, surfaceY(x, z) + 0.04, z))
      }
      grid.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), gridMat))
    }
  }
  scene.add(grid)

  const centerMark = new THREE.Mesh(
    new THREE.CircleGeometry(1.2, 24),
    new THREE.MeshBasicMaterial({ color: 0x8b5bff, transparent: true, opacity: 0.7 })
  )
  centerMark.rotation.x = -Math.PI / 2
  centerMark.position.y = 0.03
  scene.add(centerMark)

  const controls = new OrbitControls(camera, canvas)
  controls.target.set(0, 0, 0)
  controls.enableDamping = true
  controls.dampingFactor = 0.12
  controls.maxPolarAngle = Math.PI / 2.05
  controls.minDistance = 15
  controls.maxDistance = 550
  // left button is reserved for editing tools
  controls.mouseButtons = { LEFT: null, MIDDLE: THREE.MOUSE.PAN, RIGHT: THREE.MOUSE.ROTATE }

  const roadsGroup = new THREE.Group()
  const objectsGroup = new THREE.Group()
  scene.add(roadsGroup, objectsGroup)

  // ------------------------------------------------------------------ state
  const roads = new Set() // "gx,gz"
  const objects = [] // { id, kind, type, x, z, ry, s, root }
  let nextId = 1
  let tool = 'road'
  let brush = null // palette entry for 'place'
  let ghost = null
  let ghostFor = null
  let currentRy = 0
  let currentScale = 1
  let selected = null
  let snap = 1
  let disposed = false
  const undoStack = []

  const cellKey = (gx, gz) => `${gx},${gz}`
  const inBounds = (gx, gz) => Math.abs(gx) <= MAX_CELL && Math.abs(gz) <= MAX_CELL

  // ------------------------------------------------------------- templates
  const templates = new Map() // paletteId → Promise<Object3D>

  function ensureTemplate(entry) {
    const id = paletteId(entry)
    if (!templates.has(id)) {
      if (entry.marker) {
        templates.set(id, Promise.resolve(makeLandmarkMarker(entry.marker)))
      } else {
        templates.set(
          id,
          loadGLB(asset(entry.url)).then((gltf) => {
            const inner = gltf.scene.clone(true)
            fitModel(inner, entry.fit)
            const wrap = new THREE.Group()
            wrap.add(inner)
            return wrap
          })
        )
      }
    }
    return templates.get(id)
  }

  const roadTemplates = {}
  const roadsReady = Promise.all(
    Object.entries(ROAD_TILE_MODELS).map(([tile, name]) =>
      loadGLB(asset(`models/kenney/roads/${name}.glb`)).then((gltf) => {
        const inner = gltf.scene.clone(true)
        fitModel(inner, { footprint: TILE })
        const wrap = new THREE.Group()
        wrap.add(inner)
        roadTemplates[tile] = wrap
      })
    )
  ).catch((e) => console.error('road tiles failed to load', e))

  // ------------------------------------------------------------------ roads
  const cellMeshes = new Map() // key → Object3D in roadsGroup

  async function rebuildRoads() {
    await roadsReady
    if (disposed) return
    roadsGroup.clear()
    cellMeshes.clear()
    for (const key of roads) {
      const [gx, gz] = key.split(',').map(Number)
      const arms = {
        N: roads.has(cellKey(gx, gz - 1)),
        S: roads.has(cellKey(gx, gz + 1)),
        E: roads.has(cellKey(gx + 1, gz)),
        W: roads.has(cellKey(gx - 1, gz))
      }
      const { tile, ry } = pickRoadTile(arms)
      const m = roadTemplates[tile].clone(true)
      m.position.set(gx * TILE, surfaceY(gx * TILE, gz * TILE) + 0.04, gz * TILE)
      m.rotation.y = ry
      m.userData.cell = key
      roadsGroup.add(m)
      cellMeshes.set(key, m)
    }
  }

  // ---------------------------------------------------------------- objects
  function spawnObject(rec) {
    const entry = findEntry(rec.kind, rec.type)
    if (!entry) {
      console.warn('unknown layout object skipped:', rec.kind, rec.type)
      return null
    }
    const root = new THREE.Group()
    root.position.set(rec.x, surfaceY(rec.x, rec.z), rec.z)
    root.rotation.y = rec.ry
    root.scale.setScalar(rec.s)
    const record = { id: nextId++, kind: rec.kind, type: rec.type, x: rec.x, z: rec.z, ry: rec.ry, s: rec.s, root }
    root.userData.recordId = record.id
    objectsGroup.add(root)
    objects.push(record)
    ensureTemplate(entry).then((tpl) => {
      if (!disposed && root.parent) root.add(tpl.clone(true))
    })
    return record
  }

  function removeObject(record) {
    record.root.removeFromParent()
    const i = objects.indexOf(record)
    if (i >= 0) objects.splice(i, 1)
    if (selected?.record === record) clearSelection()
  }

  // -------------------------------------------------------------- selection
  const selectionBox = new THREE.Box3Helper(new THREE.Box3(), 0x67e08a)
  selectionBox.visible = false
  scene.add(selectionBox)

  function refreshSelectionBox() {
    if (!selected) return
    selectionBox.box.setFromObject(selected.record.root)
    if (selectionBox.box.isEmpty()) {
      selectionBox.box.setFromCenterAndSize(
        new THREE.Vector3(selected.record.x, surfaceY(selected.record.x, selected.record.z) + 2, selected.record.z),
        new THREE.Vector3(4, 4, 4)
      )
    }
  }

  function select(record) {
    selected = { record }
    selectionBox.visible = true
    refreshSelectionBox()
    emit()
  }

  function clearSelection() {
    selected = null
    selectionBox.visible = false
    emit()
  }

  // ------------------------------------------------------------------ ghost
  function ghostify(obj) {
    obj.traverse((o) => {
      if (o.isMesh || o.isSprite) {
        o.material = o.material.clone()
        o.material.transparent = true
        o.material.opacity = 0.5
        o.material.depthWrite = false
      }
    })
  }

  const roadCursor = new THREE.Mesh(
    new THREE.PlaneGeometry(TILE, TILE),
    new THREE.MeshBasicMaterial({ color: 0x67e08a, transparent: true, opacity: 0.28, depthWrite: false })
  )
  roadCursor.rotation.x = -Math.PI / 2
  roadCursor.position.y = 0.1
  roadCursor.visible = false
  scene.add(roadCursor)

  function refreshGhost() {
    if (ghost) {
      ghost.removeFromParent()
      ghost = null
    }
    ghostFor = null
    if (tool !== 'place' || !brush) return
    const entry = brush
    ghostFor = paletteId(entry)
    const g = new THREE.Group()
    g.visible = false
    scene.add(g)
    ghost = g
    ensureTemplate(entry).then((tpl) => {
      if (disposed || ghost !== g || ghostFor !== paletteId(entry)) return
      const c = tpl.clone(true)
      ghostify(c)
      g.add(c)
    })
  }

  // ------------------------------------------------------------------ undo
  function pushUndo() {
    undoStack.push(JSON.stringify(serialize()))
    if (undoStack.length > 50) undoStack.shift()
  }

  function undo() {
    const prev = undoStack.pop()
    if (!prev) return
    applyLayout(JSON.parse(prev), { silentUndo: true })
  }

  // ------------------------------------------------------------ (de)serialise
  const round = (v, p = 100) => Math.round(v * p) / p

  function serialize() {
    return {
      version: LAYOUT_VERSION,
      tile: TILE,
      roads: [...roads].map((k) => k.split(',').map(Number)),
      objects: objects.map((o) => ({
        kind: o.kind,
        type: o.type,
        x: round(o.x),
        z: round(o.z),
        ry: round(o.ry, 1000),
        s: round(o.s, 1000)
      }))
    }
  }

  function applyLayout(layout, { silentUndo = false } = {}) {
    layout = normalizeCityLayout(layout)
    if (!silentUndo) pushUndo()
    roads.clear()
    for (const rec of [...objects]) removeObject(rec)
    clearSelection()
    for (const cell of layout?.roads ?? []) {
      const [gx, gz] = cell
      if (Number.isInteger(gx) && Number.isInteger(gz) && inBounds(gx, gz)) roads.add(cellKey(gx, gz))
    }
    for (const o of layout?.objects ?? []) {
      if (typeof o?.x !== 'number' || typeof o?.z !== 'number') continue
      spawnObject({ kind: o.kind, type: o.type, x: o.x, z: o.z, ry: o.ry ?? 0, s: o.s ?? 1 })
    }
    rebuildRoads()
    emit()
  }

  function emit() {
    onChange({
      layout: serialize(),
      stats: { roads: roads.size, objects: objects.length },
      selected: selected
        ? { kind: selected.record.kind, type: selected.record.type, x: round(selected.record.x), z: round(selected.record.z) }
        : null,
      tool,
      brush: brush ? paletteId(brush) : null
    })
  }

  // -------------------------------------------------------------- pointing
  const raycaster = new THREE.Raycaster()
  const ndc = new THREE.Vector2()
  const worldSphere = new THREE.Sphere(new THREE.Vector3(0, -WORLD_RADIUS, 0), WORLD_RADIUS)
  const hitPoint = new THREE.Vector3()

  function pointerRay(e) {
    const r = canvas.getBoundingClientRect()
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1)
    raycaster.setFromCamera(ndc, camera)
  }

  function groundHit(e) {
    pointerRay(e)
    if (!raycaster.ray.intersectSphere(worldSphere, hitPoint)) return null
    return Math.abs(hitPoint.x) <= GRID_HALF && Math.abs(hitPoint.z) <= GRID_HALF ? hitPoint : null
  }

  const snapVal = (v) => Math.round(v / snap) * snap
  const clampWorld = (v) => Math.max(-GRID_HALF, Math.min(GRID_HALF, v))

  function pickRecord(e) {
    pointerRay(e)
    const hits = raycaster.intersectObjects(objectsGroup.children, true)
    if (!hits.length) return null
    let o = hits[0].object
    while (o.parent && o.parent !== objectsGroup) o = o.parent
    return objects.find((r) => r.root === o) ?? null
  }

  function pickRoadCell(e) {
    pointerRay(e)
    const hits = raycaster.intersectObjects(roadsGroup.children, true)
    if (!hits.length) return null
    let o = hits[0].object
    while (o.parent && o.parent !== roadsGroup) o = o.parent
    return o.userData.cell ?? null
  }

  // pointer state
  let painting = false // road paint drag
  let paintErase = false
  let lastPaintedCell = null
  let strokeChanged = false
  let dragging = null // record being moved
  let downAt = null

  function cellsBetween(from, to) {
    if (!from) return [to]
    const cells = []
    let [x0, z0] = from
    const [x1, z1] = to
    const dx = Math.abs(x1 - x0)
    const dz = Math.abs(z1 - z0)
    const sx = x0 < x1 ? 1 : -1
    const sz = z0 < z1 ? 1 : -1
    let error = dx - dz
    while (true) {
      cells.push([x0, z0])
      if (x0 === x1 && z0 === z1) break
      const doubled = error * 2
      if (doubled > -dz) { error -= dz; x0 += sx }
      if (doubled < dx) { error += dx; z0 += sz }
    }
    return cells
  }

  function paintCellAt(e) {
    const p = groundHit(e)
    if (!p) return
    const gx = Math.round(p.x / TILE)
    const gz = Math.round(p.z / TILE)
    if (!inBounds(gx, gz)) return
    const target = [gx, gz]
    if (lastPaintedCell?.[0] === gx && lastPaintedCell?.[1] === gz) return
    let changed = false
    for (const [cellX, cellZ] of cellsBetween(lastPaintedCell, target)) {
      if (!inBounds(cellX, cellZ)) continue
      const key = cellKey(cellX, cellZ)
      changed = (paintErase ? roads.delete(key) : !roads.has(key) && roads.add(key)) || changed
    }
    lastPaintedCell = target
    if (changed) {
      strokeChanged = true
      rebuildRoads().then(emit)
    }
  }

  function onPointerDown(e) {
    if (e.button !== 0) return
    downAt = { x: e.clientX, y: e.clientY }
    if (tool === 'road') {
      pushUndo()
      strokeChanged = false
      painting = true
      paintErase = e.altKey
      lastPaintedCell = null
      paintCellAt(e)
    } else if (tool === 'select') {
      const rec = pickRecord(e)
      if (rec) {
        select(rec)
        pushUndo()
        dragging = rec
        controls.enabled = false
      } else {
        clearSelection()
      }
    }
  }

  function onPointerMove(e) {
    const p = groundHit(e)
    if (tool === 'road') {
      if (p) {
        const gx = Math.round(p.x / TILE)
        const gz = Math.round(p.z / TILE)
        roadCursor.visible = inBounds(gx, gz)
        roadCursor.position.set(gx * TILE, surfaceY(gx * TILE, gz * TILE) + 0.1, gz * TILE)
      } else roadCursor.visible = false
      if (painting && e.buttons & 1) paintCellAt(e)
      else painting = false
    } else roadCursor.visible = false

    if (tool === 'place' && ghost && p) {
      ghost.visible = true
      const ghostX = clampWorld(snapVal(p.x))
      const ghostZ = clampWorld(snapVal(p.z))
      ghost.position.set(ghostX, surfaceY(ghostX, ghostZ), ghostZ)
      ghost.rotation.y = currentRy
      ghost.scale.setScalar(currentScale)
    } else if (ghost) ghost.visible = false

    if (dragging && p) {
      dragging.x = clampWorld(snapVal(p.x))
      dragging.z = clampWorld(snapVal(p.z))
      dragging.root.position.set(dragging.x, surfaceY(dragging.x, dragging.z), dragging.z)
      refreshSelectionBox()
    }
  }

  function onPointerUp(e) {
    // Ignore pointer releases that began on the editor panel or elsewhere.
    if (e.button !== 0 || !downAt) return
    const moved = downAt && Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y) > 4
    if (painting) {
      painting = false
      if (!strokeChanged) undoStack.pop() // no-op stroke, drop the snapshot
    }
    if (dragging) {
      if (!moved) undoStack.pop() // click without drag, nothing changed
      dragging = null
      controls.enabled = true
      emit()
    } else if (tool === 'place' && brush && !moved) {
      const p = groundHit(e)
      if (p) {
        pushUndo()
        const rec = spawnObject({
          kind: brush.kind,
          type: brush.type,
          x: clampWorld(snapVal(p.x)),
          z: clampWorld(snapVal(p.z)),
          ry: currentRy,
          s: currentScale
        })
        if (rec) emit()
      }
    } else if (tool === 'erase' && !moved) {
      const rec = pickRecord(e)
      if (rec) {
        pushUndo()
        removeObject(rec)
        emit()
      } else {
        const cell = pickRoadCell(e)
        if (cell) {
          pushUndo()
          roads.delete(cell)
          rebuildRoads().then(emit)
        }
      }
    }
    downAt = null
  }

  function onKeyDown(e) {
    const tag = document.activeElement?.tagName
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
    const key = e.key.toLowerCase()

    if ((e.ctrlKey || e.metaKey) && key === 'z') {
      e.preventDefault()
      undo()
      return
    }
    if (key === 'r') {
      const step = e.shiftKey ? Math.PI / 12 : Math.PI / 2
      if (selected) {
        pushUndo()
        selected.record.ry = (selected.record.ry + step) % (Math.PI * 2)
        selected.record.root.rotation.y = selected.record.ry
        refreshSelectionBox()
        emit()
      } else currentRy = (currentRy + step) % (Math.PI * 2)
    } else if (key === '[' || key === ']') {
      const f = key === ']' ? 1.05 : 1 / 1.05
      if (selected) {
        pushUndo()
        selected.record.s = Math.min(2.5, Math.max(0.4, selected.record.s * f))
        selected.record.root.scale.setScalar(selected.record.s)
        refreshSelectionBox()
        emit()
      } else currentScale = Math.min(2.5, Math.max(0.4, currentScale * f))
    } else if ((key === 'delete' || key === 'backspace') && selected) {
      pushUndo()
      removeObject(selected.record)
      emit()
    } else if (key === 'escape') {
      clearSelection()
    }
  }

  canvas.addEventListener('pointerdown', onPointerDown)
  canvas.addEventListener('pointermove', onPointerMove)
  window.addEventListener('pointerup', onPointerUp)
  window.addEventListener('keydown', onKeyDown)
  canvas.addEventListener('contextmenu', (e) => e.preventDefault())

  // ----------------------------------------------------------------- sizing
  function resize() {
    const w = canvas.clientWidth
    const h = canvas.clientHeight
    if (!w || !h) return
    renderer.setSize(w, h, false)
    camera.aspect = w / h
    camera.updateProjectionMatrix()
  }
  const ro = new ResizeObserver(resize)
  ro.observe(canvas)
  resize()

  let raf = 0
  function loop() {
    if (disposed) return
    raf = requestAnimationFrame(loop)
    controls.update()
    renderer.render(scene, camera)
  }
  loop()

  // -------------------------------------------------------------------- api
  return {
    setTool(t) {
      tool = t
      if (t !== 'select') clearSelection()
      refreshGhost()
      emit()
    },
    setBrush(id) {
      brush = PALETTE.find((e) => paletteId(e) === id) ?? null
      tool = 'place'
      refreshGhost()
      emit()
    },
    setSnap(v) {
      snap = v
    },
    serialize,
    loadLayout: (layout) => applyLayout(layout),
    clearAll() {
      applyLayout({ version: LAYOUT_VERSION, tile: TILE, roads: [], objects: [] })
    },
    undo,
    resetCamera() {
      camera.position.copy(HOME_POS)
      controls.target.set(0, 0, 0)
    },
    dispose() {
      disposed = true
      cancelAnimationFrame(raf)
      ro.disconnect()
      canvas.removeEventListener('pointerdown', onPointerDown)
      canvas.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
      window.removeEventListener('keydown', onKeyDown)
      controls.dispose()
      renderer.dispose()
    }
  }
}
