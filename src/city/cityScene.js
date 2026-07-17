import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

import chessModelUrl from '../assets/chess-engine/chess_set.glb?url'
import cityLayoutJson from '../data/cityLayout.json'
import { ROAD_TILE_MODELS, normalizeCityLayout, pickRoadTile } from './layoutSchema.js'
import { findEntry } from './editor/editorPalette.js'
import { TEMPLATE_NAMES } from '../chess/detail/constants.js'
import {
  clonePieceWithTint,
  computeBoardGrid,
  findBoardMesh,
  normalizePieceUprightAndScale,
  placeOnSquare,
  recolorBoard
} from '../chess/detail/boardGeometry.js'

/*
 * Builds the rainy night "smart city" world for the landing page.
 *
 * The city fabric is built from CC0 Kenney kits (public/models/kenney):
 * road tiles, cars, suburban houses, street lights and commercial towers.
 * Landmark extras: "Football stadium" (Poly by Google, CC-BY 3.0) and
 * "Drone" (NateGazzard, CC-BY 3.0) via poly.pizza, plus the same chess set
 * GLB used on the chess-engine project page.
 *
 * buildCity(scene) constructs everything and returns:
 *   landmarks: [{ key, label, sub, route, anchor, hitMesh, ring, ... }]
 *   update(dt, elapsed): advances all animations (drone, cars, rain, pulses)
 *
 * Models stream in asynchronously into pre-positioned groups, so the
 * camera/tour logic never waits on the network.
 */

THREE.Cache.enabled = true

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

const rand = (a, b) => a + Math.random() * (b - a)
const BEACON_RED = new THREE.Color(0xff5c5c)
const WORLD_UP = new THREE.Vector3(0, 1, 0)

const texLoader = new THREE.TextureLoader()
const gltfLoader = new GLTFLoader()
const gltfCache = new Map()

export const asset = (p) => `${import.meta.env.BASE_URL}${p}`

/** Loads (and caches) a GLB. Returns a promise of the gltf object. */
export function loadGLB(url) {
  if (!gltfCache.has(url)) {
    gltfCache.set(
      url,
      new Promise((resolve, reject) => gltfLoader.load(url, resolve, undefined, reject))
    )
  }
  return gltfCache.get(url)
}

/** Loads a Color/NormalGL/Roughness JPG set from public/textures. */
function pbrMaps(name, rx, ry) {
  const base = `${import.meta.env.BASE_URL}textures/${name}_`
  const one = (suffix, srgb) => {
    const t = texLoader.load(base + suffix + '.jpg')
    t.wrapS = t.wrapT = THREE.RepeatWrapping
    t.repeat.set(rx, ry)
    t.anisotropy = 8
    if (srgb) t.colorSpace = THREE.SRGBColorSpace
    return t
  }
  return {
    map: one('Color', true),
    normalMap: one('NormalGL'),
    roughnessMap: one('Roughness')
  }
}

function canvasTexture(w, h, draw) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  draw(c.getContext('2d'), w, h)
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 4
  return tex
}

/** Soft radial glow sprite texture, tinted per-use via sprite material color. */
function makeGlowTexture() {
  return canvasTexture(128, 128, (ctx) => {
    const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64)
    g.addColorStop(0, 'rgba(255,255,255,0.9)')
    g.addColorStop(0.3, 'rgba(255,255,255,0.35)')
    g.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, 128, 128)
  })
}

let glowTex = null
function getGlowTex() {
  if (!glowTex) glowTex = makeGlowTexture()
  return glowTex
}

export function glowSprite(color, size, opacity = 0.8) {
  const mat = new THREE.SpriteMaterial({
    map: getGlowTex(),
    color,
    transparent: true,
    opacity,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  })
  const s = new THREE.Sprite(mat)
  s.scale.setScalar(size)
  return s
}

/** Flat additive pool of light on the ground (streetlights, floodlights). */
export function lightPool(color, size, opacity = 0.16) {
  const mat = new THREE.MeshBasicMaterial({
    map: getGlowTex(),
    color,
    transparent: true,
    opacity,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  })
  const m = new THREE.Mesh(new THREE.PlaneGeometry(size, size), mat)
  m.rotation.x = -Math.PI / 2
  m.renderOrder = 2
  return m
}

function invisibleHitMesh(radius, height) {
  const geo = new THREE.CylinderGeometry(radius, radius, height, 10)
  const mat = new THREE.MeshBasicMaterial({
    transparent: true,
    opacity: 0,
    depthWrite: false,
    depthTest: false
  })
  const m = new THREE.Mesh(geo, mat)
  m.position.y = height / 2
  return m
}

function groundRing(radius, color) {
  const geo = new THREE.RingGeometry(radius * 0.92, radius, 48)
  const mat = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: 0.0,
    side: THREE.DoubleSide,
    depthWrite: false
  })
  const ring = new THREE.Mesh(geo, mat)
  ring.rotation.x = -Math.PI / 2
  ring.position.y = 0.22
  ring.renderOrder = 3
  return ring
}

const std = (opts) => new THREE.MeshStandardMaterial({ roughness: 0.85, metalness: 0.1, ...opts })

/** Matte grass that doesn't sparkle under the moonlight at a distance. */
function grassMat(repeat, color) {
  const m = std({
    ...pbrMaps('Grass004', repeat, repeat),
    color,
    roughness: 0.98,
    envMapIntensity: 0.15
  })
  m.normalScale.set(0.25, 0.25)
  return m
}

function shadowify(group) {
  group.traverse((o) => {
    if (o.isMesh && !o.material.transparent) {
      o.castShadow = true
      o.receiveShadow = true
    }
  })
}

// ---------------------------------------------------------------------------
// GLB prep helpers
// ---------------------------------------------------------------------------

/**
 * Recenters + uniformly scales a loaded model in place: base sits at y=0,
 * centred on x/z. Pass either footprint (max of width/depth) or height.
 */
function fitModel(root, { footprint, height }) {
  const box = new THREE.Box3().setFromObject(root)
  const size = box.getSize(new THREE.Vector3())
  const center = box.getCenter(new THREE.Vector3())
  const s = footprint ? footprint / Math.max(size.x, size.z) : height / size.y
  root.scale.multiplyScalar(s)
  root.position.set(-center.x * s, -box.min.y * s, -center.z * s)
  return { w: size.x * s, h: size.y * s, d: size.z * s }
}

/** Enable shadows and apply the night-time material treatment to a model. */
function nightDress(root, { emissive = 0, roughness = null, envMapIntensity = 0.9, shadows = true } = {}) {
  const seen = new Set()
  root.traverse((o) => {
    if (!o.isMesh) return
    if (shadows) {
      o.castShadow = true
      o.receiveShadow = true
    }
    const mats = Array.isArray(o.material) ? o.material : [o.material]
    for (const m of mats) {
      if (!m || seen.has(m)) continue
      seen.add(m)
      if (roughness !== null && typeof m.roughness === 'number') m.roughness = roughness
      if ('envMapIntensity' in m) m.envMapIntensity = envMapIntensity
      // faint self-illumination so flat-colour kit models stay readable at night
      if (emissive > 0 && m.emissive) {
        m.emissive.set(0xffffff)
        m.emissiveMap = m.map ?? null
        m.emissiveIntensity = emissive
      }
    }
  })
}

/**
 * Flattens a kit model into a single geometry (for InstancedMesh) plus its
 * shared colormap material. Geometry is recentred (base y=0) and scaled so
 * `footprint` or `height` matches the requested size.
 */
function mergeModel(root, { footprint, height }) {
  root.updateMatrixWorld(true)
  const geos = []
  let material = null
  root.traverse((o) => {
    if (!o.isMesh) return
    if (!material) material = o.material
    let g = o.geometry.clone()
    g.applyMatrix4(o.matrixWorld)
    if (g.index) g = g.toNonIndexed()
    for (const key of Object.keys(g.attributes)) {
      if (key !== 'position' && key !== 'normal' && key !== 'uv') g.deleteAttribute(key)
    }
    if (!g.attributes.uv) {
      g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2))
    }
    geos.push(g)
  })
  const merged = mergeGeometries(geos, false)
  merged.computeBoundingBox()
  const box = merged.boundingBox
  const size = box.getSize(new THREE.Vector3())
  const center = box.getCenter(new THREE.Vector3())
  merged.translate(-center.x, -box.min.y, -center.z)
  const s = footprint ? footprint / Math.max(size.x, size.z) : height / size.y
  merged.scale(s, s, s)
  merged.computeBoundingBox()
  return { geometry: merged, material, size: size.multiplyScalar(s) }
}

function tuneKitMaterial(material, { roughness = 0.65, envMapIntensity = 0.9, emissive = 0 } = {}) {
  const m = material.clone()
  if (typeof m.roughness === 'number') m.roughness = roughness
  if ('envMapIntensity' in m) m.envMapIntensity = envMapIntensity
  if (emissive > 0 && m.emissive) {
    m.emissive.set(0xffffff)
    m.emissiveMap = m.map ?? null
    m.emissiveIntensity = emissive
  }
  return m
}

function instancedFrom(geometry, material, matrices, { cast = true, receive = true } = {}) {
  const mesh = new THREE.InstancedMesh(geometry, material, matrices.length)
  matrices.forEach((m, i) => mesh.setMatrixAt(i, m))
  mesh.instanceMatrix.needsUpdate = true
  mesh.castShadow = cast
  mesh.receiveShadow = receive
  return mesh
}

const composeMatrix = (() => {
  const pos = new THREE.Vector3()
  const quat = new THREE.Quaternion()
  const scl = new THREE.Vector3()
  const euler = new THREE.Euler()
  return (x, y, z, ry = 0, sx = 1, sy = 1, sz = 1) => {
    pos.set(x, y, z)
    euler.set(0, ry, 0)
    quat.setFromEuler(euler)
    scl.set(sx, sy, sz)
    return new THREE.Matrix4().compose(pos, quat, scl)
  }
})()

// ---------------------------------------------------------------------------
// City fabric layout
// ---------------------------------------------------------------------------

const CITY_HALF = 150
const TILE = 12 // footprint of one Kenney road tile in world units
const ROAD_Y = 0.04

function buildGround(scene) {
  // Continue the landscape beneath the city so it no longer reads as a disc
  // suspended over a dark void.
  const countryMat = grassMat(84, 0x263d32)
  const country = new THREE.Mesh(new THREE.CircleGeometry(590, 96), countryMat)
  country.rotation.x = -Math.PI / 2
  country.position.y = -0.12
  country.receiveShadow = true
  scene.add(country)

  // Matte urban ground — the wet sheen remains on roads/plazas only.
  const mat = std({
    ...pbrMaps('Concrete034', 36, 36),
    color: 0x353b4a,
    roughness: 0.96,
    envMapIntensity: 0.15
  })
  mat.normalScale.set(0.3, 0.3)
  const ground = new THREE.Mesh(new THREE.CircleGeometry(CITY_HALF + 30, 72), mat)
  ground.rotation.x = -Math.PI / 2
  ground.receiveShadow = true
  scene.add(ground)
}

/** Kenney CC0 trees plus a lightweight low-poly mountain silhouette. */
function buildOutskirts(scene) {
  let seed = 0x51f15e
  const random = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0
    return seed / 4294967296
  }

  const mountainGeometries = []
  for (let i = 0; i < 46; i++) {
    const angle = (i / 46) * Math.PI * 2 + (random() - 0.5) * 0.12
    const radius = 300 + random() * 92
    const height = 42 + random() * 76
    const width = 32 + random() * 48
    const ridge = new THREE.ConeGeometry(width, height, 7, 1)
    ridge.applyMatrix4(
      composeMatrix(
        Math.cos(angle) * radius,
        height / 2 - 3,
        Math.sin(angle) * radius,
        random() * Math.PI,
        1,
        1,
        0.72 + random() * 0.52
      )
    )
    mountainGeometries.push(ridge)
  }
  const mountains = new THREE.Mesh(
    mergeGeometries(mountainGeometries, false),
    std({ color: 0x273446, roughness: 1, metalness: 0, envMapIntensity: 0.15 })
  )
  mountains.receiveShadow = true
  scene.add(mountains)

  Promise.all([
    loadGLB(asset('models/kenney/suburban/tree-large.glb')),
    loadGLB(asset('models/kenney/suburban/tree-small.glb'))
  ])
    .then(([large, small]) => {
      const sources = [
        mergeModel(large.scene.clone(true), { height: 8.5 }),
        mergeModel(small.scene.clone(true), { height: 5.8 })
      ]
      const matrices = [[], []]
      for (let i = 0; i < 380; i++) {
        const angle = random() * Math.PI * 2
        const radius = 228 + Math.pow(random(), 0.78) * 92
        const index = random() > 0.34 ? 0 : 1
        const scale = 0.78 + random() * 0.62
        matrices[index].push(
          composeMatrix(
            Math.cos(angle) * radius,
            -0.04,
            Math.sin(angle) * radius,
            random() * Math.PI * 2,
            scale,
            scale,
            scale
          )
        )
      }
      sources.forEach((source, index) => {
        const material = tuneKitMaterial(source.material, {
          roughness: 0.95,
          envMapIntensity: 0.35,
          emissive: 0.025
        })
        scene.add(instancedFrom(source.geometry, material, matrices[index], { cast: false, receive: true }))
      })
    })
    .catch((e) => console.error('outskirts forest failed', e))
}

/**
 * Road graph derived from the layout's grid cells (see LAYOUT_SCHEMA.md).
 * Each cell becomes a node; edges connect adjacent cells (they feed the
 * navigator and the minimap), and lanes are maximal unbroken straight runs
 * used to route NPC traffic along real, continuous road.
 */
function roadDataFromCells(cells) {
  const set = new Set(cells.map(([gx, gz]) => `${gx},${gz}`))
  const has = (gx, gz) => set.has(`${gx},${gz}`)

  const nodes = []
  const edges = []
  for (const [gx, gz] of cells) {
    const arms = { N: has(gx, gz - 1), S: has(gx, gz + 1), E: has(gx + 1, gz), W: has(gx - 1, gz) }
    nodes.push({ gx, gz, x: gx * TILE, z: gz * TILE, arms })
    if (arms.S) edges.push({ vertical: true, p: gx * TILE, a: gz * TILE, b: (gz + 1) * TILE })
    if (arms.E) edges.push({ vertical: false, p: gz * TILE, a: gx * TILE, b: (gx + 1) * TILE })
  }

  const lanes = []
  for (const vertical of [true, false]) {
    const rows = new Map() // fixed coord → sorted list of running coords
    for (const [gx, gz] of cells) {
      const k = vertical ? gx : gz
      if (!rows.has(k)) rows.set(k, [])
      rows.get(k).push(vertical ? gz : gx)
    }
    for (const [k, ts] of rows) {
      ts.sort((a, b) => a - b)
      let t0 = ts[0]
      let prev = ts[0]
      for (let i = 1; i <= ts.length; i++) {
        if (i < ts.length && ts[i] === prev + 1) {
          prev = ts[i]
          continue
        }
        if (prev > t0) lanes.push({ vertical, p: k * TILE, t0: t0 * TILE, t1: prev * TILE })
        if (i < ts.length) t0 = prev = ts[i]
      }
    }
  }

  return { has, nodes, edges, lanes }
}

async function buildRoads(scene, roadData, colliders, { autoLights = true } = {}) {
  const kit = (n) => asset(`models/kenney/roads/${n}.glb`)
  const loaded = await Promise.all([
    ...Object.values(ROAD_TILE_MODELS).map((n) => loadGLB(kit(n))),
    loadGLB(kit('light-curved'))
  ])

  const tileNames = Object.keys(ROAD_TILE_MODELS)
  const tiles = {}
  tileNames.forEach((name, i) => {
    tiles[name] = mergeModel(loaded[i].scene.clone(true), { footprint: TILE })
  })
  const light = loaded[loaded.length - 1]

  // one shared wet-asphalt material for all tiles
  const roadMat = tuneKitMaterial(tiles.straight.material, {
    roughness: 0.22,
    envMapIntensity: 1.5,
    emissive: 0.05
  })

  // each cell picks its piece + rotation from its neighbours
  const mats = { straight: [], cross: [], tee: [], bend: [], end: [] }
  for (const { x, z, arms } of roadData.nodes) {
    const { tile, ry } = pickRoadTile(arms)
    mats[tile].push(composeMatrix(x, ROAD_Y, z, ry))
  }

  for (const [key, list] of Object.entries(mats)) {
    if (!list.length) continue
    scene.add(instancedFrom(tiles[key].geometry, roadMat, list, { cast: false, receive: true }))
  }

  // street lights at every intersection (skipped when the layout places its own)
  if (!autoLights) return
  const lightPrep = mergeModel(light.scene.clone(true), { height: 6.8 })
  const lightMat = tuneKitMaterial(lightPrep.material, { roughness: 0.5, envMapIntensity: 1.1 })
  const lightMats = []
  const glows = new THREE.Group()
  for (const { x, z, arms } of roadData.nodes) {
    const count = arms.N + arms.S + arms.E + arms.W
    if (count < 3) continue
    const px = x + TILE / 2 + 0.9
    const pz = z + TILE / 2 + 0.9
    // arm curls back over the road (toward -x)
    lightMats.push(composeMatrix(px, 0.05, pz, Math.PI / 2))
    const glow = glowSprite(0xffc37a, 1.45, 0.28)
    const lightX = px - 1.15
    glow.position.set(lightX, 6.4, pz)
    const targetX = lightX - 2.6
    const targetZ = pz
    const pool = lightPool(0xffbd72, 16, 0.1)
    pool.position.set(targetX, 0.12, targetZ)
    const beamHeight = Math.hypot(6.28, targetX - lightX, targetZ - pz)
    const beam = new THREE.Mesh(
      new THREE.ConeGeometry(4.5, beamHeight, 20, 1, true),
      new THREE.MeshBasicMaterial({
        color: 0xffc778,
        transparent: true,
        opacity: 0.018,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide
      })
    )
    beam.position.set((lightX + targetX) / 2, 3.26, (pz + targetZ) / 2)
    beam.quaternion.setFromUnitVectors(
      WORLD_UP,
      new THREE.Vector3(lightX - targetX, 6.28, pz - targetZ).normalize()
    )
    glows.add(glow, pool, beam)
  }
  if (lightMats.length) scene.add(instancedFrom(lightPrep.geometry, lightMat, lightMats))
  scene.add(glows)
}

// ---------------------------------------------------------------------------
// City fabric: layout-placed buildings, trees, street furniture
// ---------------------------------------------------------------------------

// night-time material treatment per object kind
const KIND_TUNE = {
  house: { roughness: 0.7, envMapIntensity: 0.8, emissive: 0.14 },
  commercial: { roughness: 0.6, envMapIntensity: 0.9, emissive: 0.22 },
  skyscraper: { roughness: 0.6, envMapIntensity: 0.9, emissive: 0.22 },
  tree: { roughness: 0.9, envMapIntensity: 0.6 },
  streetlight: { roughness: 0.5, envMapIntensity: 1.1 },
  car: { roughness: 0.32, envMapIntensity: 1.35, emissive: 0.06 },
  farm: { roughness: 0.8, envMapIntensity: 0.7, emissive: 0.08 }
}

// collision radius at s=1, by `kind:type` then `kind`; entries at 0 are drivable
const COLLIDER_R = {
  'tree:tree-large': 0.9,
  'tree:tree-small': 0.8,
  streetlight: 0.6,
  car: 1.55,
  'farm:soil': 0,
  'farm:corn': 0,
  'farm:wheat': 0,
  'farm:hay-bale': 1.6,
  'farm:cart': 2.2,
  'farm:fence': 3
}

// Rotated footprint boxes hug buildings much more closely than the old
// circles. `height` is also used by the chase-camera obstruction solver.
const COLLIDER_BOX = {
  house: { hx: 3.45, hz: 3.45, height: 8 },
  commercial: { hx: 4.75, hz: 4.75, height: 15 },
  skyscraper: { hx: 4.5, hz: 4.5, height: 34 },
  'farm:barn': { hx: 7.5, hz: 7.5, height: 11 },
  'farm:fence': { hx: 3.2, hz: 0.45, height: 2 }
}

/**
 * Places every non-landmark layout object: instanced per model, tuned for the
 * night scene, with matching collision circles.
 */
async function buildLayoutObjects(scene, objects, colliders) {
  const byModel = new Map() // `${kind}:${type}` → { entry, list }
  for (const o of objects) {
    const id = `${o.kind}:${o.type}`
    let group = byModel.get(id)
    if (!group) {
      const entry = findEntry(o.kind, o.type)
      if (!entry || !entry.url) {
        console.warn('unknown layout object skipped:', o.kind, o.type)
        continue
      }
      byModel.set(id, (group = { entry, list: [] }))
    }
    group.list.push(o)

    const box = COLLIDER_BOX[id] ?? COLLIDER_BOX[o.kind]
    if (box) {
      colliders.push({
        type: 'box',
        x: o.x,
        z: o.z,
        hx: box.hx * o.s,
        hz: box.hz * o.s,
        height: box.height * o.s,
        ry: o.ry,
        camera: true
      })
    } else {
      const r = (COLLIDER_R[id] ?? COLLIDER_R[o.kind] ?? 1.5) * o.s
      if (r > 0) colliders.push({ x: o.x, z: o.z, r })
    }
  }

  const glows = new THREE.Group()

  await Promise.all(
    [...byModel.values()].map(async ({ entry, list }) => {
      const gltf = await loadGLB(asset(entry.url))
      const prep = mergeModel(gltf.scene.clone(true), entry.fit)
      const mat = tuneKitMaterial(prep.material, KIND_TUNE[entry.kind] ?? {})
      const mats = list.map((o) => composeMatrix(o.x, 0.02, o.z, o.ry, o.s, o.s, o.s))
      scene.add(instancedFrom(prep.geometry, mat, mats))

      for (const o of list) {
        if (entry.kind === 'streetlight') {
          // lamp head glow + pool; the arm reaches toward local -Z
          const forwardX = -Math.sin(o.ry)
          const forwardZ = -Math.cos(o.ry)
          const hx = o.x + forwardX * 1.15 * o.s
          const hz = o.z + forwardZ * 1.15 * o.s
          const targetX = hx + forwardX * 2.6 * o.s
          const targetZ = hz + forwardZ * 2.6 * o.s
          const glow = glowSprite(0xffc37a, 1.45 * o.s, 0.28)
          glow.position.set(hx, 6.4 * o.s, hz)
          const pool = lightPool(0xffbd72, 16 * o.s, 0.1)
          pool.position.set(targetX, 0.12, targetZ)
          const beamHeight = Math.hypot(6.28 * o.s, targetX - hx, targetZ - hz)
          const beam = new THREE.Mesh(
            new THREE.ConeGeometry(4.5 * o.s, beamHeight, 20, 1, true),
            new THREE.MeshBasicMaterial({
              color: 0xffc778,
              transparent: true,
              opacity: 0.018,
              blending: THREE.AdditiveBlending,
              depthWrite: false,
              side: THREE.DoubleSide
            })
          )
          beam.position.set((hx + targetX) / 2, 3.26 * o.s, (hz + targetZ) / 2)
          beam.quaternion.setFromUnitVectors(
            WORLD_UP,
            new THREE.Vector3(hx - targetX, 6.28 * o.s, hz - targetZ).normalize()
          )
          glows.add(glow, pool, beam)
        }
      }
    })
  )

  if (glows.children.length) scene.add(glows)

}

// ---------------------------------------------------------------------------
// Cars
// ---------------------------------------------------------------------------

// Police cars are reserved for pursuit mode; normal city traffic is civilian.
const CAR_TYPES = ['sedan', 'sedan-sports', 'taxi', 'suv', 'suv-luxury', 'hatchback-sports', 'delivery']

async function buildCars(scene, lanes, cars) {
  const usable = lanes.filter((l) => l.t1 - l.t0 >= 60)
  if (!usable.length) return
  const totalLen = usable.reduce((s, l) => s + (l.t1 - l.t0), 0)
  const pickLane = () => {
    let r = Math.random() * totalLen
    for (const l of usable) {
      r -= l.t1 - l.t0
      if (r <= 0) return l
    }
    return usable[usable.length - 1]
  }

  const models = await Promise.all(
    CAR_TYPES.map((t) => loadGLB(asset(`models/kenney/cars/${t}.glb`)))
  )

  for (let i = 0; i < 26; i++) {
    const car = new THREE.Group()
    const body = models[i % models.length].scene.clone(true)
    // normalise car length (cars face +Z in the kit)
    const box = new THREE.Box3().setFromObject(body)
    const size = box.getSize(new THREE.Vector3())
    const s = 4.4 / size.z
    body.scale.setScalar(s)
    body.position.y = -box.min.y * s
    nightDress(body, { emissive: 0.06, roughness: 0.32, envMapIntensity: 1.35 })
    const headGlow = glowSprite(0xffe9b8, 1.8, 0.28)
    headGlow.position.set(0, 0.55, 2.6)
    const tailGlow = glowSprite(0xff5040, 1.4, 0.35)
    tailGlow.position.set(0, 0.55, -2.4)
    car.add(body, headGlow, tailGlow)

    const laneDef = pickLane()
    const vertical = laneDef.vertical
    const dir = Math.random() > 0.5 ? 1 : -1
    const speed = rand(9, 16)
    car.userData = {
      vertical,
      dir,
      speed,
      curSpeed: speed,
      laneCenter: laneDef.p,
      laneOffset: 1.8,
      // Australia drives on the left. The sign differs because fixed is X
      // for vertical roads and Z for horizontal roads.
      fixed: laneDef.p + (vertical ? -1 : 1) * 1.8 * dir,
      t: rand(laneDef.t0 + 6, laneDef.t1 - 6),
      t0: laneDef.t0 + 5,
      t1: laneDef.t1 - 5,
      turning: false,
      turnT: 0,
      turnDuration: 0.82
    }
    // face the direction of travel (model forward = +Z)
    car.rotation.y = vertical ? (dir === 1 ? 0 : Math.PI) : dir === 1 ? Math.PI / 2 : -Math.PI / 2
    scene.add(car)
    cars.push(car)
  }
}

// ---------------------------------------------------------------------------
// Rain
// ---------------------------------------------------------------------------

function buildRain(scene) {
  const COUNT = 1500
  const AREA = 250
  const TOP = 100
  const LEN = 1.7
  const SLANT = 0.4

  const positions = new Float32Array(COUNT * 6)
  const speeds = new Float32Array(COUNT)
  const seed = (i, y) => {
    const x = rand(-AREA / 2, AREA / 2)
    const z = rand(-AREA / 2, AREA / 2)
    positions[i * 6] = x + SLANT
    positions[i * 6 + 1] = y + LEN
    positions[i * 6 + 2] = z
    positions[i * 6 + 3] = x
    positions[i * 6 + 4] = y
    positions[i * 6 + 5] = z
    speeds[i] = rand(52, 86)
  }
  for (let i = 0; i < COUNT; i++) seed(i, rand(0, TOP))

  const geo = new THREE.BufferGeometry()
  const attr = new THREE.BufferAttribute(positions, 3)
  attr.setUsage(THREE.DynamicDrawUsage)
  geo.setAttribute('position', attr)
  const mat = new THREE.LineBasicMaterial({
    color: 0x93a8cc,
    transparent: true,
    opacity: 0.3,
    depthWrite: false
  })
  const lines = new THREE.LineSegments(geo, mat)
  lines.frustumCulled = false
  scene.add(lines)

  return {
    update(dt) {
      for (let i = 0; i < COUNT; i++) {
        const dy = speeds[i] * dt
        positions[i * 6 + 1] -= dy
        positions[i * 6 + 4] -= dy
        const drift = SLANT * dy * 0.4
        positions[i * 6] -= drift
        positions[i * 6 + 3] -= drift
        if (positions[i * 6 + 4] < 0.2) seed(i, TOP + rand(0, 12))
      }
      attr.needsUpdate = true
    },
    // rain drops are seeded around the local origin, so parking the whole
    // object over the player keeps them in a shower wherever they drive
    follow(x, z) {
      lines.position.x = x
      lines.position.z = z
    }
  }
}

// ---------------------------------------------------------------------------
// Sky
// ---------------------------------------------------------------------------

function buildSky(scene) {
  // rainy night sky: navy gradient with a bank of ragged clouds and a bright
  // horizon glow (city light bouncing off the overcast)
  const skyTex = canvasTexture(1024, 512, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, 0, h)
    g.addColorStop(0, '#070b1c')
    g.addColorStop(0.45, '#0d1332')
    g.addColorStop(0.72, '#1b2452')
    g.addColorStop(0.88, '#31396f')
    g.addColorStop(1, '#454c85')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, w, h)
    // soft cloud blobs (kept off the horizontal edges to hide the uv seam)
    for (let i = 0; i < 130; i++) {
      const x = rand(w * 0.04, w * 0.96)
      const y = rand(h * 0.18, h * 0.72)
      const r = rand(26, 90)
      const a = rand(0.1, 0.3)
      const grad = ctx.createRadialGradient(x, y, 0, x, y, r)
      grad.addColorStop(0, `rgba(58,68,116,${a})`)
      grad.addColorStop(1, 'rgba(58,68,116,0)')
      ctx.fillStyle = grad
      ctx.beginPath()
      ctx.ellipse(x, y, r * rand(1.4, 2.4), r * 0.55, 0, 0, Math.PI * 2)
      ctx.fill()
    }
  })
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(900, 32, 18),
    new THREE.MeshBasicMaterial({ map: skyTex, side: THREE.BackSide, fog: false, depthWrite: false })
  )
  dome.renderOrder = -10
  scene.add(dome)

  // a few stars through breaks in the cloud
  const starCount = 350
  const pos = new Float32Array(starCount * 3)
  for (let i = 0; i < starCount; i++) {
    const r = rand(420, 850)
    const theta = rand(0, Math.PI * 2)
    const phi = rand(0.05, Math.PI / 2.2)
    pos[i * 3] = r * Math.sin(phi) * Math.cos(theta)
    pos[i * 3 + 1] = r * Math.cos(phi)
    pos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta)
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  const mat = new THREE.PointsMaterial({
    color: 0xbfd0ff,
    size: 1.5,
    sizeAttenuation: false,
    transparent: true,
    opacity: 0.55,
    fog: false
  })
  scene.add(new THREE.Points(geo, mat))

  const moon = glowSprite(0xe6edff, 130, 0.55)
  moon.material.fog = false
  moon.position.set(-260, 240, -420)
  scene.add(moon)
}

// ---------------------------------------------------------------------------
// Landmarks
// ---------------------------------------------------------------------------

/**
 * Suburban park with a bookable community pitch (FrontRunner): grass, trees,
 * a fenced field with painted lines, a small grandstand and a bookings board.
 */
function landmarkBookablePark() {
  const g = new THREE.Group()

  // grass pitch with painted lines + mow stripes
  const pitch = new THREE.Mesh(new THREE.PlaneGeometry(32, 20), grassMat(5, 0x9fbf8a))
  pitch.rotation.x = -Math.PI / 2
  pitch.position.y = 0.12
  pitch.receiveShadow = true
  g.add(pitch)

  const lineTex = canvasTexture(512, 320, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h)
    // mow stripes
    for (let i = 0; i < 8; i++) {
      ctx.fillStyle = i % 2 ? 'rgba(0,0,0,0.14)' : 'rgba(255,255,255,0.05)'
      ctx.fillRect((i * w) / 8, 0, w / 8, h)
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.9)'
    ctx.lineWidth = 4
    ctx.strokeRect(14, 14, w - 28, h - 28)
    ctx.beginPath()
    ctx.moveTo(w / 2, 14)
    ctx.lineTo(w / 2, h - 14)
    ctx.stroke()
    ctx.beginPath()
    ctx.arc(w / 2, h / 2, 42, 0, Math.PI * 2)
    ctx.stroke()
    // goal boxes
    ctx.strokeRect(14, h / 2 - 62, 52, 124)
    ctx.strokeRect(w - 66, h / 2 - 62, 52, 124)
  })
  const lines = new THREE.Mesh(
    new THREE.PlaneGeometry(32, 20),
    new THREE.MeshBasicMaterial({ map: lineTex, transparent: true, opacity: 0.85, depthWrite: false })
  )
  lines.rotation.x = -Math.PI / 2
  lines.position.y = 0.16
  g.add(lines)

  // low fence around the field
  const fenceMat = std({ color: 0x2a3040, roughness: 0.6, metalness: 0.4 })
  const rail = new THREE.BoxGeometry(1, 0.08, 0.08)
  for (const [len, x, z, ry] of [
    [36, 0, 12.4, 0], [36, 0, -12.4, 0], [26, 18.4, 0, Math.PI / 2], [26, -18.4, 0, Math.PI / 2]
  ]) {
    const r = new THREE.Mesh(rail, fenceMat)
    r.scale.x = len
    r.position.set(x, 1, z)
    r.rotation.y = ry
    g.add(r)
  }

  // small grandstand
  const standMat = std({ color: 0x1d2333, roughness: 0.8 })
  for (let i = 0; i < 3; i++) {
    const step = new THREE.Mesh(new THREE.BoxGeometry(14, 0.7, 1.3), standMat)
    step.position.set(0, 0.35 + i * 0.7, 14.2 + i * 1.3)
    step.castShadow = true
    g.add(step)
  }

  // bookings board at the park entrance
  const boardTex = canvasTexture(512, 160, (ctx, w, h) => {
    ctx.fillStyle = '#060913'
    ctx.fillRect(0, 0, w, h)
    ctx.font = 'bold 54px system-ui, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillStyle = '#7fd4ff'
    ctx.fillText('BOOKINGS', w / 2, 66)
    ctx.fillStyle = '#67e08a'
    ctx.fillText('OPEN  ●  19:30', w / 2, 128)
  })
  const board = new THREE.Mesh(
    new THREE.PlaneGeometry(9, 2.8),
    new THREE.MeshBasicMaterial({ map: boardTex })
  )
  board.position.set(0, 6, 18.6)
  g.add(board)
  const boardPole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.18, 0.22, 5, 6),
    std({ color: 0x1a2030 })
  )
  boardPole.position.set(0, 2.5, 18.6)
  g.add(boardPole)

  // park trees around the pitch (Kenney suburban trees)
  loadGLB(asset('models/kenney/suburban/tree-large.glb'))
    .then((gltf) => {
      for (const [tx, tz] of [
        [-21, -14], [-23, 3], [-20, 16], [21, -15], [23, 6], [19, 17], [-8, -16.5], [9, -16.5]
      ]) {
        const tree = gltf.scene.clone(true)
        fitModel(tree, { height: rand(5.2, 7) })
        nightDress(tree, { roughness: 0.9, envMapIntensity: 0.6 })
        tree.position.set(tx, 0, tz)
        tree.rotation.y = rand(0, Math.PI * 2)
        g.add(tree)
      }
    })
    .catch((e) => console.error('park trees failed', e))

  // a couple of soft park lamps
  for (const [x, z] of [[-14, 17], [14, 17]]) {
    const lampPole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.12, 3.4, 6),
      std({ color: 0x1a2030 })
    )
    lampPole.position.set(x, 1.7, z)
    const glow = glowSprite(0xffd9a0, 2.6, 0.6)
    glow.position.set(x, 3.6, z)
    const pool = lightPool(0xffc37a, 9, 0.14)
    pool.position.set(x, 0.2, z)
    g.add(lampPole, glow, pool)
  }

  return { group: g, radius: 22, height: 12 }
}

/**
 * Sportslux stadium: "Football stadium" by Poly by Google (poly.pizza,
 * CC-BY 3.0), ringed by the floodlights the optimiser is all about.
 */
function landmarkStadium() {
  const g = new THREE.Group()

  loadGLB(asset('models/stadium.glb'))
    .then((gltf) => {
      const root = gltf.scene.clone(true)
      // the GLB is a mini diorama (stadium + ground plate + road + pavilion);
      // keep only the bowl/pitch primitives so it sits cleanly on the plaza
      const keep = new Set([
        'Box007_1', // seating bowl
        'Box007_1_1', // inner dark ring
        'Box007_1_12', // pitch
        'Box007_1_13', // outer walls
        'Box007_1_14', // stands
        'Box007_1_15' // roof ring
      ])
      const drop = []
      root.traverse((o) => {
        if (o.isMesh && !keep.has(o.name)) drop.push(o)
      })
      for (const d of drop) d.removeFromParent()
      fitModel(root, { footprint: 36 })
      nightDress(root, { emissive: 0.16, roughness: 0.6, envMapIntensity: 0.9 })
      g.add(root)
    })
    .catch((e) => console.error('stadium model failed', e))

  const glowInner = glowSprite(0x9fe0b5, 15, 0.14)
  glowInner.position.y = 5
  g.add(glowInner)

  const pool = lightPool(0xcfe4ff, 30, 0.1)
  pool.position.y = 0.18
  g.add(pool)

  // lighting-report board out front
  const boardTex = canvasTexture(512, 160, (ctx, w, h) => {
    ctx.fillStyle = '#060913'
    ctx.fillRect(0, 0, w, h)
    ctx.font = 'bold 54px system-ui, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillStyle = '#9fc4ff'
    ctx.fillText('SPORTSLUX', w / 2, 66)
    ctx.fillStyle = '#67e08a'
    ctx.fillText('750 LX · U0 0.74', w / 2, 128)
  })
  const board = new THREE.Mesh(
    new THREE.PlaneGeometry(11, 3.4),
    new THREE.MeshBasicMaterial({ map: boardTex })
  )
  board.position.set(0, 10.6, -14.6)
  g.add(board)
  const boardPole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.2, 0.25, 9, 6),
    std({ color: 0x1a2030 })
  )
  boardPole.position.set(0, 4.5, -14.6)
  g.add(boardPole)

  // floodlight towers at the four corners
  const poleMat = std({ color: 0x232a3a, roughness: 0.5, metalness: 0.6 })
  const headMat = new THREE.MeshBasicMaterial({ color: 0xf2f7ff })
  const beamMat = new THREE.MeshBasicMaterial({
    color: 0x9fc4ff,
    transparent: true,
    opacity: 0.07,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide
  })
  for (const [sx, sz] of [[-1, -1], [-1, 1], [1, -1], [1, 1]]) {
    const x = 18.5 * sx
    const z = 14 * sz
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.34, 15, 8), poleMat)
    pole.position.set(x, 7.5, z)
    pole.castShadow = true
    g.add(pole)

    const panel = new THREE.Group()
    for (let r = 0; r < 2; r++) {
      for (let c = 0; c < 3; c++) {
        const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.25), headMat)
        lamp.position.set((c - 1) * 0.62, r * 0.62, 0)
        panel.add(lamp)
      }
    }
    panel.position.set(x, 15, z)
    panel.lookAt(0, 0, 0)
    g.add(panel)

    const glow = glowSprite(0xcfe4ff, 8, 0.85)
    glow.position.set(x, 15.3, z)
    g.add(glow)

    const beam = new THREE.Mesh(new THREE.ConeGeometry(7, 18, 24, 1, true), beamMat)
    beam.position.set(x, 15, z)
    const target = new THREE.Vector3(x * 0.15, 0, z * 0.15)
    const dir = target.clone().sub(beam.position).normalize()
    beam.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), dir)
    beam.translateY(-9)
    g.add(beam)

    const pool = lightPool(0xcfe4ff, 20, 0.1)
    pool.position.set(x * 0.4, 0.18, z * 0.4)
    g.add(pool)
  }

  return { group: g, radius: 21, height: 16 }
}

/**
 * Chess park: the same GLB chess set as the chess-engine project page,
 * scaled up to park size with the standard starting layout.
 */
function landmarkChessPark(group, scene, def) {
  // paved park circle under the board
  const paving = pbrMaps('PavingStones138', 6, 6)
  const plaza = new THREE.Mesh(
    new THREE.CircleGeometry(15, 40),
    std({ ...paving, color: 0x777e94, roughness: 0.6, envMapIntensity: 0.8 })
  )
  plaza.rotation.x = -Math.PI / 2
  plaza.position.y = 0.1
  plaza.receiveShadow = true
  group.add(plaza)

  const glow = glowSprite(0xbac6ff, 20, 0.18)
  glow.position.y = 4
  group.add(glow)

  loadGLB(chessModelUrl)
    .then((gltf) => {
      const root = gltf.scene.clone(true)
      group.add(root)

      const boardMesh = findBoardMesh(root)
      if (!boardMesh) throw new Error('chess_set.glb has no board mesh')

      // scale so the board spans ~17 units, then sit it on the plaza
      const bb = new THREE.Box3().setFromObject(boardMesh)
      const bsize = bb.getSize(new THREE.Vector3())
      root.scale.multiplyScalar(17 / Math.max(bsize.x, bsize.z))
      root.updateMatrixWorld(true)

      const bb2 = new THREE.Box3().setFromObject(boardMesh)
      const c = bb2.getCenter(new THREE.Vector3())
      const gw = group.getWorldPosition(new THREE.Vector3())
      root.position.x += gw.x - c.x
      root.position.z += gw.z - c.z
      root.position.y += 0.12 - bb2.min.y
      root.updateMatrixWorld(true)

      const boardInfo = computeBoardGrid(boardMesh, WORLD_UP)
      recolorBoard(root, boardInfo.squareSize)
      root.traverse((o) => {
        if (o.isMesh) {
          o.castShadow = true
          o.receiveShadow = true
        }
      })

      // same template pieces + starting layout as the chess-engine page
      const templates = {}
      for (const [type, name] of Object.entries(TEMPLATE_NAMES)) {
        const node = root.getObjectByName(name)
        if (!node) throw new Error(`chess_set.glb is missing template "${name}"`)
        templates[type] = node
        node.visible = false
      }

      const piecesGroup = new THREE.Group()
      piecesGroup.name = 'ChessParkPieces'
      scene.add(piecesGroup)

      const addPiece = (type, color, file, rankIdx) => {
        const piece = clonePieceWithTint(templates[type], color)
        normalizePieceUprightAndScale(piece, boardInfo.squareSize, color)
        placeOnSquare(piece, boardInfo, file, rankIdx, color)
        shadowify(piece)
        piecesGroup.add(piece)
      }

      const back = ['rook', 'knight', 'bishop', 'queen', 'king', 'bishop', 'knight', 'rook']
      back.forEach((type, f) => {
        addPiece(type, 'white', f, 0)
        addPiece(type, 'black', f, 7)
      })
      for (let f = 0; f < 8; f++) {
        addPiece('pawn', 'white', f, 1)
        addPiece('pawn', 'black', f, 6)
      }
      piecesGroup.updateMatrixWorld(true)
    })
    .catch((e) => console.error('chess set failed', e))

  return { radius: 15, height: 8 }
}

/** Esports arena: Kenney commercial building with a jumbo odds screen. */
function landmarkEsportsArena() {
  const g = new THREE.Group()

  loadGLB(asset('models/kenney/commercial/building-f.glb'))
    .then((gltf) => {
      const root = gltf.scene.clone(true)
      const dims = fitModel(root, { footprint: 22 })
      // squash toward arena proportions if the kit building is too tall
      if (dims.h > 16) root.scale.y *= 14 / dims.h
      nightDress(root, { emissive: 0.28, roughness: 0.6, envMapIntensity: 0.9 })
      g.add(root)
    })
    .catch((e) => console.error('arena model failed', e))

  const screenTex = canvasTexture(512, 288, (ctx, w, h) => {
    ctx.fillStyle = '#07030f'
    ctx.fillRect(0, 0, w, h)
    ctx.font = 'bold 58px system-ui, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillStyle = '#ff4fd8'
    ctx.fillText('MATCH ODDS', w / 2, 70)
    ctx.strokeStyle = '#41e6ff'
    ctx.lineWidth = 6
    ctx.beginPath()
    const ptsN = 12
    for (let i = 0; i <= ptsN; i++) {
      const x = 40 + (i / ptsN) * (w - 80)
      const y = 190 - Math.sin(i * 0.9) * 34 - i * 4
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
    }
    ctx.stroke()
    ctx.font = 'bold 44px system-ui, sans-serif'
    ctx.fillStyle = '#67e08a'
    ctx.fillText('WIN P = 0.68', w / 2, 262)
  })
  // jumbo screen standing in front of the arena
  const screen = new THREE.Mesh(
    new THREE.PlaneGeometry(14, 7.9),
    new THREE.MeshBasicMaterial({ map: screenTex })
  )
  screen.position.set(0, 7.4, 12.4)
  g.add(screen)
  const screenBack = new THREE.Mesh(
    new THREE.BoxGeometry(14.4, 8.3, 0.5),
    std({ color: 0x10131f })
  )
  screenBack.position.set(0, 7.4, 12.1)
  g.add(screenBack)
  for (const x of [-5, 5]) {
    const strut = new THREE.Mesh(
      new THREE.CylinderGeometry(0.22, 0.26, 3.4, 6),
      std({ color: 0x1a2030 })
    )
    strut.position.set(x, 1.7, 12.1)
    g.add(strut)
  }

  const pool = lightPool(0xff4fd8, 26, 0.1)
  pool.position.set(0, 0.14, 12)
  g.add(pool)

  const glow = glowSprite(0xff4fd8, 24, 0.24)
  glow.position.y = 10
  g.add(glow)
  return { group: g, radius: 17, height: 14 }
}

/** Finance tower: Kenney skyscraper with the rising-wealth chart. */
function landmarkFinanceTower() {
  const g = new THREE.Group()

  let chart = null
  loadGLB(asset('models/kenney/commercial/building-skyscraper-b.glb'))
    .then((gltf) => {
      const root = gltf.scene.clone(true)
      const dims = fitModel(root, { height: 50 })
      nightDress(root, { emissive: 0.3, roughness: 0.55, envMapIntensity: 1.0 })
      g.add(root)
      // hang the chart just off the tower face
      if (chart) chart.position.z = dims.d / 2 + 0.6
    })
    .catch((e) => console.error('finance tower model failed', e))

  const crown = new THREE.Mesh(
    new THREE.BoxGeometry(10, 0.9, 10),
    new THREE.MeshBasicMaterial({ color: 0x6ee7a0 })
  )
  crown.position.y = 50.6
  g.add(crown)

  const chartTex = canvasTexture(256, 640, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h)
    ctx.strokeStyle = '#6ee7a0'
    ctx.lineWidth = 10
    ctx.beginPath()
    const steps = [
      [30, h - 60], [70, h - 180], [55, h - 240], [110, h - 350],
      [95, h - 410], [160, h - 520], [210, h - 590]
    ]
    steps.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)))
    ctx.stroke()
    // arrow head
    ctx.fillStyle = '#6ee7a0'
    ctx.beginPath()
    ctx.moveTo(210, h - 640 + 18)
    ctx.lineTo(178, h - 570)
    ctx.lineTo(232, h - 585)
    ctx.closePath()
    ctx.fill()
    ctx.font = 'bold 72px system-ui, sans-serif'
    ctx.fillStyle = '#9be7c0'
    ctx.textAlign = 'center'
    ctx.fillText('$', 52, 90)
  })
  chart = new THREE.Mesh(
    new THREE.PlaneGeometry(9.5, 42),
    new THREE.MeshBasicMaterial({ map: chartTex, transparent: true })
  )
  chart.position.set(0, 25, 7.2)
  g.add(chart)

  const glow = glowSprite(0x6ee7a0, 20, 0.28)
  glow.position.y = 51
  g.add(glow)
  return { group: g, radius: 20, height: 54 }
}

/** Data hub: Kenney commercial building wired up with glowing data pipes. */
function landmarkDataHub() {
  const g = new THREE.Group()

  loadGLB(asset('models/kenney/commercial/building-i.glb'))
    .then((gltf) => {
      const root = gltf.scene.clone(true)
      fitModel(root, { footprint: 15 })
      nightDress(root, { emissive: 0.26, roughness: 0.55, envMapIntensity: 1.0 })
      g.add(root)
    })
    .catch((e) => console.error('data hub model failed', e))

  // pipes arcing out to neighbouring blocks, with data pulses
  const pulses = []
  const pipeMat = std({ color: 0x16202f, emissive: 0x41e6ff, emissiveIntensity: 0.25, roughness: 0.4 })
  const pulseGeo = new THREE.SphereGeometry(0.42, 8, 8)
  const pulseMat = new THREE.MeshBasicMaterial({ color: 0x9df2ff })

  const ends = [
    new THREE.Vector3(20, 0.6, 8),
    new THREE.Vector3(-6, 0.6, 22),
    new THREE.Vector3(16, 0.6, -16)
  ]
  for (const end of ends) {
    const start = new THREE.Vector3(0, 5, 0)
    const mid = start.clone().add(end).multiplyScalar(0.5)
    mid.y = 10 + end.length() * 0.15
    const curve = new THREE.QuadraticBezierCurve3(start, mid, end)
    const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 24, 0.3, 8), pipeMat)
    g.add(tube)
    for (let k = 0; k < 2; k++) {
      const p = new THREE.Mesh(pulseGeo, pulseMat)
      g.add(p)
      pulses.push({ mesh: p, curve, offset: k * 0.5, speed: rand(0.25, 0.4) })
    }
  }

  const pool = lightPool(0x41e6ff, 24, 0.12)
  pool.position.y = 0.14
  g.add(pool)

  const glow = glowSprite(0x41e6ff, 16, 0.35)
  glow.position.y = 7
  g.add(glow)
  return { group: g, radius: 14, height: 9, pulses }
}

/** HQ: Kenney skyscraper wearing the name billboard. */
function landmarkHQ() {
  const g = new THREE.Group()

  loadGLB(asset('models/kenney/commercial/building-skyscraper-a.glb'))
    .then((gltf) => {
      const root = gltf.scene.clone(true)
      fitModel(root, { height: 23 })
      nightDress(root, { emissive: 0.3, roughness: 0.55, envMapIntensity: 1.0 })
      g.add(root)
    })
    .catch((e) => console.error('hq model failed', e))

  const billTex = canvasTexture(768, 256, (ctx, w, h) => {
    const grad = ctx.createLinearGradient(0, 0, w, 0)
    grad.addColorStop(0, '#151538')
    grad.addColorStop(1, '#241243')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, w, h)
    ctx.strokeStyle = '#8b5bff'
    ctx.lineWidth = 10
    ctx.strokeRect(5, 5, w - 10, h - 10)
    ctx.textAlign = 'center'
    ctx.fillStyle = '#f8fafc'
    ctx.font = 'bold 88px system-ui, sans-serif'
    ctx.fillText('DILLON BLISS', w / 2, 118)
    ctx.fillStyle = '#b7b9ff'
    ctx.font = '600 44px system-ui, sans-serif'
    ctx.fillText('ENGINEER · FULL-STACK · SYDNEY', w / 2, 196)
  })
  const bill = new THREE.Mesh(
    new THREE.PlaneGeometry(17, 5.6),
    new THREE.MeshBasicMaterial({ map: billTex })
  )
  bill.position.y = 26.5
  g.add(bill)
  const billBack = new THREE.Mesh(
    new THREE.BoxGeometry(17.4, 6, 0.5),
    std({ color: 0x10131f })
  )
  billBack.position.set(0, 26.5, -0.3)
  g.add(billBack)
  for (const x of [-6, 6]) {
    const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 3.4, 6), std({ color: 0x1a2030 }))
    strut.position.set(x, 23.2, -0.3)
    g.add(strut)
  }

  const glow = glowSprite(0x8b5bff, 18, 0.3)
  glow.position.y = 27
  g.add(glow)
  return { group: g, radius: 13, height: 30 }
}

function landmarkCommsTower() {
  const g = new THREE.Group()
  const mat = std({ color: 0x4a5570, roughness: 0.45, metalness: 0.5, emissive: 0x141a2c, emissiveIntensity: 0.6 })

  const s1 = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 2.4, 10, 8), mat)
  s1.position.y = 5
  s1.castShadow = true
  const s2 = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.6, 9, 8), mat)
  s2.position.y = 14.5
  const s3 = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.9, 8, 8), mat)
  s3.position.y = 23
  const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 6, 6), mat)
  antenna.position.y = 30

  const dishMat = std({ color: 0x232b3f, metalness: 0.5, roughness: 0.4 })
  for (const [y, ry] of [[16, 0.6], [19, 2.4], [13, 4.2]]) {
    const dish = new THREE.Mesh(new THREE.SphereGeometry(1.3, 12, 12, 0, Math.PI), dishMat)
    dish.position.y = y
    dish.rotation.y = ry
    dish.translateZ(1.4)
    g.add(dish)
  }

  const beacon = new THREE.Mesh(
    new THREE.SphereGeometry(0.5, 10, 10),
    new THREE.MeshBasicMaterial({ color: 0xff5c5c })
  )
  beacon.position.y = 33.2
  const beaconGlow = glowSprite(0xff5c5c, 7, 0.8)
  beaconGlow.position.y = 33.2

  // aviation marker lights up the mast + floodlit base
  for (const y of [10, 19, 26]) {
    const marker = new THREE.Mesh(
      new THREE.SphereGeometry(0.18, 6, 6),
      new THREE.MeshBasicMaterial({ color: 0xff8a80 })
    )
    marker.position.set(0, y, y === 19 ? -1.2 : 1.2)
    const mGlow = glowSprite(0xff8a80, 2.4, 0.5)
    mGlow.position.copy(marker.position)
    g.add(marker, mGlow)
  }
  const basePool = lightPool(0xaebaff, 18, 0.14)
  basePool.position.y = 0.16
  g.add(basePool)

  g.add(s1, s2, s3, antenna, beacon, beaconGlow)
  return { group: g, radius: 8, height: 34, beacon, beaconGlow }
}

/** "Drone" by NateGazzard (poly.pizza, CC-BY 3.0), rotors spun in update(). */
function buildDrone() {
  const g = new THREE.Group()
  const rotors = []

  loadGLB(asset('models/drone.glb'))
    .then((gltf) => {
      const root = gltf.scene.clone(true)
      fitModel(root, { footprint: 6 })
      nightDress(root, { emissive: 0.12, roughness: 0.4, envMapIntensity: 1.2 })
      g.add(root)
      for (const [index, name] of ['Rotor_FL', 'Rotor_FR', 'Rotor_BL', 'Rotor_BR'].entries()) {
        const r = root.getObjectByName(name)
        if (r?.geometry) {
          r.geometry = r.geometry.clone()
          r.geometry.computeBoundingBox()
          const pivot = r.geometry.boundingBox.getCenter(new THREE.Vector3())
          r.geometry.translate(-pivot.x, -pivot.y, -pivot.z)
          r.position.add(pivot)
          rotors.push({ rotor: r, direction: index % 2 ? -1 : 1 })
        }
      }
      // nav lights: red left, green right
      for (const [x, col] of [[-2.2, 0xff4040], [2.2, 0x3dff70]]) {
        const nav = glowSprite(col, 1.6, 0.7)
        nav.position.set(x, 0.6, 0)
        g.add(nav)
      }
    })
    .catch((e) => console.error('drone model failed', e))

  // downward search beam + ground spot that tracks the drone
  const beam = new THREE.Mesh(
    new THREE.ConeGeometry(4.2, 15, 20, 1, true),
    new THREE.MeshBasicMaterial({
      color: 0x8fe6ff,
      transparent: true,
      opacity: 0.05,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide
    })
  )
  beam.position.y = -7.7
  g.add(beam)

  return { group: g, rotors }
}

// ---------------------------------------------------------------------------
// Assembly
// ---------------------------------------------------------------------------

export function buildCity(scene) {
  const cityLayout = normalizeCityLayout(cityLayoutJson)
  const landmarkPlacements = new Map()
  for (const object of cityLayout.objects) {
    if (object.kind === 'landmark' && !landmarkPlacements.has(object.type)) {
      landmarkPlacements.set(object.type, object)
    }
  }

  scene.background = new THREE.Color(0x0a0f26)
  // fog colour doubles as the horizon glow, so keep it navy rather than black
  scene.fog = new THREE.FogExp2(0x131a38, 0.0021)

  scene.add(new THREE.AmbientLight(0x3d4668, 0.55))
  const hemi = new THREE.HemisphereLight(0x40507e, 0x10131c, 0.5)
  scene.add(hemi)
  const moonLight = new THREE.DirectionalLight(0x93a7ff, 1.15)
  moonLight.position.set(-120, 160, -80)
  moonLight.castShadow = true
  moonLight.shadow.mapSize.set(2048, 2048)
  moonLight.shadow.camera.left = -210
  moonLight.shadow.camera.right = 210
  moonLight.shadow.camera.top = 210
  moonLight.shadow.camera.bottom = -210
  moonLight.shadow.camera.near = 20
  moonLight.shadow.camera.far = 520
  moonLight.shadow.bias = -0.0006
  scene.add(moonLight)

  buildGround(scene)
  buildOutskirts(scene)
  buildSky(scene)

  // landmark placements: [key, builder, x, z, rotY, meta]
  const defs = [
    {
      key: 'hq',
      build: landmarkHQ,
      x: 0, z: 12, rot: 0,
      label: 'About Me',
      sub: 'HQ — who I am, experience & awards',
      route: '/about',
      color: 0x8b5bff,
      plaza: 16,
      radius: 13, height: 30,
      hitR: 8.5
    },
    {
      key: 'sportslux',
      build: landmarkStadium,
      x: 70, z: 44, rot: -0.3,
      label: 'Sportslux',
      sub: 'Sports lighting optimiser',
      route: '/projects/sportslux',
      color: 0x9fc4ff,
      plaza: 24,
      radius: 21, height: 16,
      hitR: 18.5
    },
    {
      key: 'sports-booking',
      build: landmarkBookablePark,
      x: -72, z: 42, rot: 0.4,
      label: 'FrontRunner',
      sub: 'Bookable park & sports ground',
      route: '/projects/sports-booking',
      color: 0x7fd4ff,
      plaza: 26,
      plazaType: 'grass',
      radius: 22, height: 12,
      hitR: 19.5
    },
    {
      key: 'chessEngine',
      build: landmarkChessPark,
      buildsInPlace: true,
      x: -62, z: -56, rot: 0.2,
      label: 'Chess Engine',
      sub: 'C++ engine, 2000+ rated',
      route: '/projects/chessEngine',
      color: 0xd9dcea,
      radius: 15, height: 8,
      hitR: 9
    },
    {
      key: 'lol-match-predictor',
      build: landmarkEsportsArena,
      x: 62, z: -58, rot: 0.25,
      label: 'Esports Predictor',
      sub: 'Bayesian match model vs bookmakers',
      route: '/projects/lol-match-predictor',
      color: 0xff4fd8,
      plaza: 19,
      radius: 17, height: 14,
      hitR: 13
    },
    {
      key: 'wealth-pathways-au',
      build: landmarkFinanceTower,
      x: 98, z: -6, rot: 0,
      label: 'Wealth Pathways',
      sub: 'Monte Carlo wealth calculator',
      route: '/projects/wealth-pathways-au',
      color: 0x6ee7a0,
      plaza: 14,
      radius: 20, height: 54,
      hitR: 7.5
    },
    {
      key: 'asset-data-integration',
      build: landmarkDataHub,
      x: -98, z: -8, rot: 0,
      label: 'Data Integration',
      sub: 'CMS → asset platform pipeline',
      route: '/projects/asset-data-integration',
      color: 0x41e6ff,
      plaza: 15,
      radius: 14, height: 14,
      hitR: 8.5
    },
    {
      key: 'contact',
      build: landmarkCommsTower,
      x: 4, z: -76, rot: 0,
      label: 'Contact',
      sub: 'Get in touch',
      route: '/contact',
      color: 0xff5c5c,
      plaza: 12,
      radius: 8, height: 34,
      hitR: 3.2
    }
  ]

  // The editor export is the source of truth for landmark transforms. Keep
  // the coordinates above as safe fallbacks if a future layout omits one.
  for (const def of defs) {
    const placement = landmarkPlacements.get(def.key)
    if (!placement) continue
    def.x = placement.x
    def.z = placement.z
    def.rot = placement.ry
    def.scale = placement.s
  }

  const landmarks = []
  const colliders = [] // {x, z, r} circles the player car cannot drive through
  let dataHubPulses = []
  let commsBeacon = null

  for (const def of defs) {
    let group
    let built = null
    if (def.buildsInPlace) {
      // builder needs its group pre-positioned (chess pieces are placed in
      // world space at scene level)
      group = new THREE.Group()
      group.position.set(def.x, 0, def.z)
      group.rotation.y = def.rot
      scene.add(group)
      built = def.build(group, scene, def)
    } else {
      built = def.build()
      group = built.group
      group.position.set(def.x, 0, def.z)
      group.rotation.y = def.rot
      scene.add(group)
    }
    const scale = def.scale ?? 1
    group.scale.setScalar(scale)
    const radius = (def.radius ?? built.radius) * scale
    const height = (def.height ?? built.height) * scale

    // paved (or grassed) precinct so the landmark sits on real ground,
    // and the roads that stop at its edge read as intentional
    if (def.plaza) {
      const mat =
        def.plazaType === 'grass'
          ? grassMat(def.plaza / 4, 0x8fb07e)
          : std({
              ...pbrMaps('PavingStones138', def.plaza / 2.4, def.plaza / 2.4),
              color: 0x82889e,
              roughness: 0.55,
              envMapIntensity: 0.7
            })
      const plaza = new THREE.Mesh(new THREE.CircleGeometry(def.plaza, 48), mat)
      plaza.rotation.x = -Math.PI / 2
      plaza.position.set(def.x, 0.06, def.z)
      plaza.receiveShadow = true
      scene.add(plaza)
    }

    if (built?.pulses) dataHubPulses = built.pulses
    if (built?.beacon) commsBeacon = { beacon: built.beacon, glow: built.beaconGlow }

    const hit = invisibleHitMesh(radius, height + 6)
    group.add(hit)
    hit.userData.landmarkKey = def.key

    const ring = groundRing(radius + 2, def.color)
    ring.position.x = def.x
    ring.position.z = def.z
    scene.add(ring)

    // solid core the car bumps into, plus a wider drive-in trigger circle
    const hitR = def.hitR ?? radius * 0.7
    colliders.push({ x: def.x, z: def.z, r: hitR, height, camera: true })

    landmarks.push({
      key: def.key,
      label: def.label,
      sub: def.sub,
      route: def.route,
      color: def.color,
      anchor: new THREE.Vector3(def.x, height + 7, def.z),
      center: new THREE.Vector3(def.x, height * 0.4, def.z),
      front: new THREE.Vector3(Math.sin(def.rot), 0, Math.cos(def.rot)),
      focusRadius: radius,
      focusHeight: height,
      enterR: Math.max(hitR + 5, radius + 4),
      hitMesh: hit,
      ring
    })
  }

  const layout = roadDataFromCells(cityLayout.roads)
  const placedObjects = cityLayout.objects.filter((object) => object.kind !== 'landmark')
  const hasPlacedStreetlights = placedObjects.some((object) => object.kind === 'streetlight')
  // Auto-light collision must exist before createPlayerCar builds its spatial
  // hash; the GLB models themselves stream in later.
  if (!hasPlacedStreetlights) {
    for (const { x, z, arms } of layout.nodes) {
      const count = arms.N + arms.S + arms.E + arms.W
      if (count < 3) continue
      colliders.push({ x: x + TILE / 2 + 0.9, z: z + TILE / 2 + 0.9, r: 0.72 })
    }
  }
  const cars = []
  buildRoads(scene, layout, colliders, { autoLights: !hasPlacedStreetlights })
    .catch((e) => console.error('roads failed', e))
  buildLayoutObjects(scene, placedObjects, colliders)
    .catch((e) => console.error('layout objects failed', e))
  buildCars(scene, layout.lanes, cars).catch((e) => console.error('cars failed', e))
  const rain = buildRain(scene)

  /** True when (x,z) sits on asphalt — used for on/off-road driving speed. */
  const HALF_TILE = TILE / 2
  function isOnRoad(x, z) {
    for (const e of layout.edges) {
      if (e.vertical) {
        if (Math.abs(x - e.p) <= HALF_TILE && z >= e.a - HALF_TILE && z <= e.b + HALF_TILE) return true
      } else if (Math.abs(z - e.p) <= HALF_TILE && x >= e.a - HALF_TILE && x <= e.b + HALF_TILE) {
        return true
      }
    }
    return false
  }

  // drone landmark flies a loop over the city
  const drone = buildDrone()
  scene.add(drone.group)
  const droneSpot = lightPool(0x8fe6ff, 12, 0.2)
  scene.add(droneSpot)
  const droneHit = invisibleHitMesh(7, 8)
  droneHit.position.y = 0
  drone.group.add(droneHit)
  droneHit.userData.landmarkKey = 'drone'
  const droneLandmark = {
    key: 'drone',
    label: 'Autonomous Drone',
    sub: 'Raspberry Pi flight controller',
    route: '/projects/drone',
    color: 0x67e08a,
    anchor: new THREE.Vector3(),
    center: new THREE.Vector3(),
    focusRadius: 10,
    focusHeight: 6,
    hitMesh: droneHit,
    ring: null,
    dynamic: true
  }
  landmarks.push(droneLandmark)

  function update(dt, t, playerPos = null) {
    // drone loop
    const a = t * 0.12
    const dx = Math.cos(a) * 58
    const dz = Math.sin(a) * 46
    const dy = 30 + Math.sin(t * 0.7) * 2.2
    drone.group.position.set(dx, dy, dz)
    drone.group.rotation.y = -a + Math.PI / 2
    drone.group.rotation.z = Math.sin(t * 0.9) * 0.06
    for (const { rotor, direction } of drone.rotors) rotor.rotation.y += dt * 58 * direction
    droneLandmark.anchor.set(dx, dy + 5, dz)
    droneLandmark.center.set(dx, dy, dz)
    droneSpot.position.set(dx, 0.16, dz)

    // cars — braking to a stop when the player car is close and ahead
    for (const car of cars) {
      const u = car.userData
      let braking = false
      if (playerPos) {
        const dx = playerPos.x - car.position.x
        const dz = playerPos.z - car.position.z
        const d2 = dx * dx + dz * dz
        if (d2 < 121) {
          const fx = u.vertical ? 0 : u.dir
          const fz = u.vertical ? u.dir : 0
          const ahead = fx * dx + fz * dz // distance to player along travel dir
          const lateral = Math.abs(u.vertical ? dx : dz) // offset from travel line
          braking = ahead > 1 && lateral < 4
        }
      }
      u.curSpeed += ((braking || u.turning ? 0 : u.speed) - u.curSpeed) * Math.min(dt * 2.5, 1)
      if (!u.turning) {
        u.t += u.curSpeed * u.dir * dt
        if (u.t > u.t1 || u.t < u.t0) {
          u.t = THREE.MathUtils.clamp(u.t, u.t0, u.t1)
          u.turning = true
          u.turnT = 0
          u.turnFromDir = u.dir
        }
      }
      u.bumpVX = (u.bumpVX || 0) * Math.exp(-dt * 2.2)
      u.bumpVZ = (u.bumpVZ || 0) * Math.exp(-dt * 2.2)
      u.bumpX = ((u.bumpX || 0) + u.bumpVX * dt) * Math.exp(-dt * 1.25)
      u.bumpZ = ((u.bumpZ || 0) + u.bumpVZ * dt) * Math.exp(-dt * 1.25)
      if (u.turning) {
        u.turnT = Math.min(u.turnT + dt / u.turnDuration, 1)
        const k = u.turnT
        const d = u.turnFromDir
        const arcForward = Math.sin(Math.PI * k) * u.laneOffset * d
        const across = Math.cos(Math.PI * k)
        if (u.vertical) {
          car.position.set(
            u.laneCenter - u.laneOffset * d * across + u.bumpX,
            0.06,
            u.t + arcForward + u.bumpZ
          )
          car.rotation.y = Math.atan2(d * Math.sin(Math.PI * k), d * Math.cos(Math.PI * k))
        } else {
          car.position.set(
            u.t + arcForward + u.bumpX,
            0.06,
            u.laneCenter + u.laneOffset * d * across + u.bumpZ
          )
          car.rotation.y = Math.atan2(d * Math.cos(Math.PI * k), -d * Math.sin(Math.PI * k))
        }
        if (k >= 1) {
          u.dir = -d
          u.fixed = u.laneCenter + (u.vertical ? -1 : 1) * u.laneOffset * u.dir
          u.turning = false
          u.curSpeed = Math.max(u.speed * 0.4, 4)
        }
      } else {
        car.rotation.y = u.vertical
          ? (u.dir === 1 ? 0 : Math.PI)
          : (u.dir === 1 ? Math.PI / 2 : -Math.PI / 2)
        if (u.vertical) car.position.set(u.fixed + u.bumpX, 0.06, u.t + u.bumpZ)
        else car.position.set(u.t + u.bumpX, 0.06, u.fixed + u.bumpZ)
      }
    }

    // Resolve civilian-to-civilian impacts after every car has moved. The
    // displacement is also fed back into each lane offset so it persists on
    // the next frame instead of visually snapping back.
    for (let i = 0; i < cars.length; i++) {
      const a = cars[i]
      const ua = a.userData
      for (let j = i + 1; j < cars.length; j++) {
        const b = cars[j]
        const ub = b.userData
        const dx = a.position.x - b.position.x
        const dz = a.position.z - b.position.z
        const d2 = dx * dx + dz * dz
        const radius = 3.1
        if (d2 >= radius * radius) continue
        const distance = Math.sqrt(Math.max(d2, 1e-6))
        const nx = distance > 0.001 ? dx / distance : 1
        const nz = distance > 0.001 ? dz / distance : 0
        const push = (radius - distance) * 0.5
        a.position.x += nx * push
        a.position.z += nz * push
        b.position.x -= nx * push
        b.position.z -= nz * push
        ua.bumpX = (ua.bumpX || 0) + nx * push
        ua.bumpZ = (ua.bumpZ || 0) + nz * push
        ub.bumpX = (ub.bumpX || 0) - nx * push
        ub.bumpZ = (ub.bumpZ || 0) - nz * push

        const avx = ua.vertical ? 0 : ua.dir * ua.curSpeed
        const avz = ua.vertical ? ua.dir * ua.curSpeed : 0
        const bvx = ub.vertical ? 0 : ub.dir * ub.curSpeed
        const bvz = ub.vertical ? ub.dir * ub.curSpeed : 0
        const closing = (avx - bvx) * nx + (avz - bvz) * nz
        if (closing < 0) {
          const impulse = -closing * 0.55
          ua.bumpVX = (ua.bumpVX || 0) + nx * impulse
          ua.bumpVZ = (ua.bumpVZ || 0) + nz * impulse
          ub.bumpVX = (ub.bumpVX || 0) - nx * impulse
          ub.bumpVZ = (ub.bumpVZ || 0) - nz * impulse
          ua.curSpeed *= 0.72
          ub.curSpeed *= 0.72
        }
      }
    }

    // rain follows the player so the shower never runs out at the map edge
    if (playerPos) rain.follow(playerPos.x, playerPos.z)
    rain.update(dt)

    // data pulses
    for (const p of dataHubPulses) {
      const k = (t * p.speed + p.offset) % 1
      p.curve.getPoint(k, p.mesh.position)
    }

    // comms beacon blink
    if (commsBeacon) {
      const on = (Math.sin(t * 3.2) + 1) / 2
      commsBeacon.beacon.material.color.copy(BEACON_RED).multiplyScalar(0.35 + on * 0.65)
      commsBeacon.glow.material.opacity = 0.25 + on * 0.6
    }
  }

  return { landmarks, update, layout, colliders, cars, isOnRoad, cityHalf: CITY_HALF }
}
