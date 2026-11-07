// Shared helpers for showing a Super-Move furniture model wrapped in the hitbox the packer uses.
// Used by the scrolling asset strip and the algorithm explorer's item preview.
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

// Kenney Furniture Kit (CC0) models, copied from Super-Move's Kenny/Models/GLTF format.
const modelUrls = import.meta.glob('../assets/super-move/models/*.glb', { query: '?url', import: 'default', eager: true })
const modelUrlFor = (model) => modelUrls[`../assets/super-move/models/${model}.glb`] || null

const loader = new GLTFLoader()
const cache = new Map()

// Resolves to the GLTF scene (or null if the model is missing / fails to load). Cached per model.
export const loadModel = (model) => {
  if (!cache.has(model)) {
    const url = modelUrlFor(model)
    cache.set(model, url ? loader.loadAsync(url).then((g) => g.scene).catch(() => null) : Promise.resolve(null))
  }
  return cache.get(model)
}

// Packer boxes are [x, y, z, w, d, h] in cm with y = depth and z = height. In three.js (as in
// Super-Move's dimensions editor): width → X, height → Y, depth → Z, from the back-left floor corner.
export const extentsOf = (boxes) => {
  let w = 0; let d = 0; let h = 0
  for (const [x, y, z, bw, bd, bh] of boxes) {
    w = Math.max(w, x + bw); d = Math.max(d, y + bd); h = Math.max(h, z + bh)
  }
  return { w: w / 100, d: d / 100, h: h / 100 }
}

export const ACCENT = 0x6858e8

// Model stretched to the packer's overall extents (like TruckFitScene), plus one wireframe + faint
// fill per hitbox box. Returned group is centred on the item's footprint with its base at y = 0.
// `track` receives every geometry/material created here, for disposal.
export const buildHitboxItem = (entry, source, { track = () => {}, fillOpacity = 0.08, lineOpacity = 0.9 } = {}) => {
  const ext = extentsOf(entry.boxes)
  const body = new THREE.Group()

  if (source) {
    const model = source.clone(true)
    const size = new THREE.Box3().setFromObject(model).getSize(new THREE.Vector3())
    model.scale.set(ext.w / Math.max(size.x, 0.01), ext.h / Math.max(size.y, 0.01), ext.d / Math.max(size.z, 0.01))
    const box = new THREE.Box3().setFromObject(model)
    model.position.sub(box.min)
    body.add(model)
  }

  const fillMat = new THREE.MeshBasicMaterial({ color: ACCENT, transparent: true, opacity: fillOpacity, depthWrite: false })
  const lineMat = new THREE.LineBasicMaterial({ color: ACCENT, transparent: true, opacity: lineOpacity })
  track(fillMat); track(lineMat)
  for (const [x, y, z, w, d, h] of entry.boxes) {
    const geo = new THREE.BoxGeometry(w / 100, h / 100, d / 100)
    const edgesGeo = new THREE.EdgesGeometry(geo)
    track(geo); track(edgesGeo)
    const pos = new THREE.Vector3((x + w / 2) / 100, (z + h / 2) / 100, (y + d / 2) / 100)
    const fill = new THREE.Mesh(geo, fillMat)
    fill.position.copy(pos)
    fill.renderOrder = 2
    const edges = new THREE.LineSegments(edgesGeo, lineMat)
    edges.position.copy(pos)
    edges.renderOrder = 3
    body.add(fill, edges)
  }

  body.position.set(-ext.w / 2, 0, -ext.d / 2)
  const group = new THREE.Group()
  group.add(body)
  return { group, ext }
}
