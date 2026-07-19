// Frontier 3D presentation layer.
// Renders the game state with the same asset pipeline as the landing-page
// city: Kenney GLB kits (roads, suburban, commercial, cars, survival, nature)
// + the cozy-farm pack and a KayKit sword. Trees and rocks are instanced per
// tier in 32×32-tile chunks so the huge map stays fast, and everything past
// the mist (VIEW_DISTANCE) is culled.
//
// The scene reconciles against game state every frame (buildings/enemies/
// villagers/projectiles/effects keyed by object identity), so the engine
// stays a pure simulation.

import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { pickRoadTile, ROAD_TILE_MODELS } from '../city/layoutSchema.js'
import {
  TILE, GRID_W, GRID_H, BUILDINGS, GATHER, VIEW_DISTANCE,
  TREE_TIERS, ROCK_TIERS, BUILD_ORDER
} from './defs.js'

const T3 = 2                       // world units per tile
const HALF_W = (GRID_W * T3) / 2
const HALF_H = (GRID_H * T3) / 2
const twx = (tx) => tx * T3 - HALF_W   // tile-unit x -> world x (tile centre at tx+0.5)
const twz = (ty) => ty * T3 - HALF_H
const CULL_DIST = VIEW_DISTANCE + 8    // hide entities beyond the mist
const ANIM_DIST = 60                   // skip limb animation beyond this

const asset = (p) => `${import.meta.env.BASE_URL}${p}`
const gltfLoader = new GLTFLoader()
const gltfCache = new Map()
function loadGLB(url) {
  if (!gltfCache.has(url)) {
    gltfCache.set(url, new Promise((res, rej) => gltfLoader.load(url, res, undefined, rej)))
  }
  return gltfCache.get(url)
}

// ---------------------------------------------------------------- materials

const MAT = {
  wood: new THREE.MeshStandardMaterial({ color: 0x8a6b43, roughness: 0.85 }),
  woodDark: new THREE.MeshStandardMaterial({ color: 0x5f4629, roughness: 0.9 }),
  stone: new THREE.MeshStandardMaterial({ color: 0x9a9ba1, roughness: 0.9 }),
  stoneDark: new THREE.MeshStandardMaterial({ color: 0x6e7076, roughness: 0.9 }),
  metal: new THREE.MeshStandardMaterial({ color: 0x7a8494, roughness: 0.45, metalness: 0.55 }),
  metalDark: new THREE.MeshStandardMaterial({ color: 0x3c434f, roughness: 0.5, metalness: 0.5 }),
  energy: new THREE.MeshStandardMaterial({
    color: 0x143842, emissive: 0x5ee6ff, emissiveIntensity: 1.4, roughness: 0.4
  }),
  energyGlass: new THREE.MeshStandardMaterial({
    color: 0x0f2a33, emissive: 0x5ee6ff, emissiveIntensity: 0.8,
    transparent: true, opacity: 0.55, roughness: 0.2
  }),
  cloth: new THREE.MeshStandardMaterial({ color: 0xc0392b, roughness: 0.9 }),
  dirt: new THREE.MeshStandardMaterial({ color: 0x6b5232, roughness: 1 }),
  trunk: new THREE.MeshStandardMaterial({ color: 0x6d5433, roughness: 1 }),
  rock: new THREE.MeshStandardMaterial({ color: 0x84878d, roughness: 0.95 }),
  crystal: new THREE.MeshStandardMaterial({
    color: 0x1d4a54, emissive: 0x4fd8f0, emissiveIntensity: 0.55, roughness: 0.3
  })
}

function box(w, h, d, mat, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat)
  m.position.set(x, y + h / 2, z)
  m.castShadow = m.receiveShadow = true
  return m
}
function cyl(rt, rb, h, mat, x = 0, y = 0, z = 0, seg = 10) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat)
  m.position.set(x, y + h / 2, z)
  m.castShadow = m.receiveShadow = true
  return m
}
function cone(r, h, mat, x = 0, y = 0, z = 0, seg = 4) {
  const m = new THREE.Mesh(new THREE.ConeGeometry(r, h, seg), mat)
  m.position.set(x, y + h / 2, z)
  m.castShadow = m.receiveShadow = true
  return m
}

// glow sprite (soft radial texture built once)
let glowTex = null
function getGlowTex() {
  if (!glowTex) {
    const c = document.createElement('canvas')
    c.width = c.height = 64
    const g = c.getContext('2d')
    const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32)
    grad.addColorStop(0, 'rgba(255,255,255,0.9)')
    grad.addColorStop(0.35, 'rgba(255,255,255,0.3)')
    grad.addColorStop(1, 'rgba(255,255,255,0)')
    g.fillStyle = grad
    g.fillRect(0, 0, 64, 64)
    glowTex = new THREE.CanvasTexture(c)
  }
  return glowTex
}
function glowSprite(color, size, opacity = 0.8) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({
    map: getGlowTex(), color, transparent: true, opacity,
    blending: THREE.AdditiveBlending, depthWrite: false
  }))
  s.scale.setScalar(size)
  return s
}

// ---------------------------------------------------------------- GLB prep

function fitModel(root, { footprint, height }) {
  const bbox = new THREE.Box3().setFromObject(root)
  const size = bbox.getSize(new THREE.Vector3())
  const center = bbox.getCenter(new THREE.Vector3())
  const s = footprint ? footprint / Math.max(size.x, size.z) : height / size.y
  root.scale.multiplyScalar(s)
  root.position.set(-center.x * s, -bbox.min.y * s, -center.z * s)
}

function dressModel(root, { emissive = 0 } = {}) {
  const seen = new Set()
  root.traverse((o) => {
    if (!o.isMesh) return
    o.castShadow = true
    o.receiveShadow = true
    const mats = Array.isArray(o.material) ? o.material : [o.material]
    for (const m of mats) {
      if (!m || seen.has(m)) continue
      seen.add(m)
      if (typeof m.roughness === 'number') m.roughness = 0.8
      if (emissive > 0 && m.emissive) {
        m.emissive.set(0xffffff)
        m.emissiveMap = m.map ?? null
        m.emissiveIntensity = emissive
      }
    }
  })
}

// fit: number = footprint in world units; { height } = fit by height instead.
const KIT = {
  // cozy farm
  barn: ['models/cozy-farm/barnlvl2.glb', 3.6],
  haystack: ['models/cozy-farm/haystackround.glb', 1.5],
  soil: ['models/cozy-farm/soil.glb', 1.85],
  wheat: ['models/cozy-farm/wheat.glb', 0.55],
  corn: ['models/cozy-farm/corn.glb', 0.55],
  cart: ['models/cozy-farm/cart.glb', 1.3],
  // survival kit (era-0 camp + tools)
  tent: ['models/kenney/survival/tent.glb', 3.2],
  tentCanvas: ['models/kenney/survival/tent-canvas.glb', 2.4],
  campfirePit: ['models/kenney/survival/campfire-pit.glb', 0.95],
  campfireStand: ['models/kenney/survival/campfire-stand.glb', 1.1],
  workbench: ['models/kenney/survival/workbench.glb', 1.25],
  anvil: ['models/kenney/survival/workbench-anvil.glb', 1.15],
  grind: ['models/kenney/survival/workbench-grind.glb', 1.15],
  chest: ['models/kenney/survival/chest.glb', 0.8],
  barrel: ['models/kenney/survival/barrel.glb', 0.55],
  structure: ['models/kenney/survival/structure.glb', 3.5],
  structureMetal: ['models/kenney/survival/structure-metal.glb', 3.5],
  resourceWood: ['models/kenney/survival/resource-wood.glb', 0.85],
  resourceStone: ['models/kenney/survival/resource-stone.glb', 0.85],
  resourceStoneL: ['models/kenney/survival/resource-stone-large.glb', 1.05],
  resourcePlanks: ['models/kenney/survival/resource-planks.glb', 0.85],
  treeLog: ['models/kenney/survival/tree-log.glb', 0.95],
  signpost: ['models/kenney/survival/signpost.glb', 0.7],
  bedroll: ['models/kenney/survival/bedroll.glb', 1.05],
  bucket: ['models/kenney/survival/bucket.glb', 0.4],
  bottle: ['models/kenney/survival/bottle.glb', { height: 0.5 }],
  // hand tools (viewmodels + NPC hands + icons)
  toolAxe: ['models/kenney/survival/tool-axe.glb', { height: 0.5 }],
  toolAxeUp: ['models/kenney/survival/tool-axe-upgraded.glb', { height: 0.52 }],
  toolPick: ['models/kenney/survival/tool-pickaxe.glb', { height: 0.5 }],
  toolPickUp: ['models/kenney/survival/tool-pickaxe-upgraded.glb', { height: 0.52 }],
  toolHammer: ['models/kenney/survival/tool-hammer.glb', { height: 0.45 }],
  toolHammerUp: ['models/kenney/survival/tool-hammer-upgraded.glb', { height: 0.47 }],
  toolHoe: ['models/kenney/survival/tool-hoe.glb', { height: 0.5 }],
  swordK: ['models/kenney/survival/sword_1handed.gltf', { height: 0.72 }],
  // nature crops (farm levels)
  cropWheat: ['models/kenney/nature/crops_wheatStageB.glb', { height: 0.55 }],
  cropCarrot: ['models/kenney/nature/crop_carrot.glb', 0.5],
  cropTurnip: ['models/kenney/nature/crop_turnip.glb', 0.5],
  cropPumpkin: ['models/kenney/nature/crop_pumpkin.glb', 0.55],
  cropMelon: ['models/kenney/nature/crop_melon.glb', 0.55],
  cropCorn: ['models/kenney/nature/crops_cornStageC.glb', { height: 0.85 }],
  // suburban houses (era 1)
  subA: ['models/kenney/suburban/building-type-a.glb', 1.75],
  subB: ['models/kenney/suburban/building-type-b.glb', 1.75],
  subC: ['models/kenney/suburban/building-type-c.glb', 1.75],
  subE: ['models/kenney/suburban/building-type-e.glb', 1.75],
  subG: ['models/kenney/suburban/building-type-g.glb', 1.75],
  subH: ['models/kenney/suburban/building-type-h.glb', 1.75],
  subK: ['models/kenney/suburban/building-type-k.glb', 1.75],
  subN: ['models/kenney/suburban/building-type-n.glb', 1.75],
  // commercial (era 2)
  comA: ['models/kenney/commercial/building-a.glb', 1.8],
  comB: ['models/kenney/commercial/building-b.glb', 1.8],
  comC: ['models/kenney/commercial/building-c.glb', 1.8],
  comD: ['models/kenney/commercial/building-d.glb', 1.8],
  comE: ['models/kenney/commercial/building-e.glb', 1.8],
  comF: ['models/kenney/commercial/building-f.glb', 1.8],
  comG: ['models/kenney/commercial/building-g.glb', 1.8],
  comI: ['models/kenney/commercial/building-i.glb', 1.8],
  comK: ['models/kenney/commercial/building-k.glb', 2.2],
  comM: ['models/kenney/commercial/building-m.glb', 1.8],
  skyA: ['models/kenney/commercial/building-skyscraper-a.glb', 3.4],
  skyD: ['models/kenney/commercial/building-skyscraper-d.glb', 1.9],
  // cars
  carSedan: ['models/kenney/cars/sedan.glb', 1.15],
  carTaxi: ['models/kenney/cars/taxi.glb', 1.15],
  carSuv: ['models/kenney/cars/suv.glb', 1.15],
  carDelivery: ['models/kenney/cars/delivery.glb', 1.25],
  carSports: ['models/kenney/cars/sedan-sports.glb', 1.15]
}
for (const [k, n] of Object.entries(ROAD_TILE_MODELS)) {
  KIT['road_' + k] = [`models/kenney/roads/${n}.glb`, T3]
}
// nature trees/rocks — one kit entry per tier model
for (const t of TREE_TIERS) {
  KIT['nt_' + t.model] = [`models/kenney/nature/${t.model}.glb`, { height: 2.1 }]
}
for (const r of ROCK_TIERS) {
  KIT['nr_' + r.model] = [`models/kenney/nature/${r.model}.glb`, 1.35]
}

const templateCache = new Map()
const loadedTemplates = new Map() // kitId -> template group (resolved)
function template(kitId, opts = {}) {
  if (!templateCache.has(kitId)) {
    const [path, fit] = KIT[kitId]
    templateCache.set(kitId, loadGLB(asset(path)).then((gltf) => {
      const root = gltf.scene.clone(true)
      const wrap = new THREE.Group()
      wrap.add(root)
      fitModel(root, typeof fit === 'number' ? { footprint: fit } : fit)
      dressModel(root, opts)
      loadedTemplates.set(kitId, wrap)
      return wrap
    }))
  }
  return templateCache.get(kitId)
}
function preloadKits(ids) {
  return Promise.allSettled(ids.map(id => template(id)))
}

/** Adds a clone of a kit model to `parent` once loaded (parent may die first). */
function addKit(parent, kitId, { x = 0, y = 0, z = 0, ry = 0, rx = 0, rz = 0, s = 1, emissive = 0 } = {}) {
  template(kitId, { emissive }).then((tpl) => {
    let root = parent
    while (root.parent) root = root.parent
    if (!root.isScene && !root.userData.keepOffscreen) return // already removed
    const m = tpl.clone(true)
    m.position.set(x, y, z)
    m.rotation.set(rx, ry, rz)
    m.scale.setScalar(s)
    parent.add(m)
  }).catch(() => {})
}

const HOUSE_E1 = ['subA', 'subB', 'subC', 'subE', 'subG', 'subH', 'subK', 'subN']
const HOUSE_E2 = ['comA', 'comB', 'comC', 'comD', 'comE', 'comF']
const CAR_KITS = ['carSedan', 'carTaxi', 'carSuv', 'carDelivery', 'carSports']

/** Baked {geometry, material} pairs of a loaded kit template, for instancing. */
const bakedCache = new Map()
function bakedPairs(kitId, tint = 0) {
  const key = kitId + ':' + tint
  if (bakedCache.has(key)) return bakedCache.get(key)
  const tpl = loadedTemplates.get(kitId)
  if (!tpl) return null
  tpl.updateMatrixWorld(true)
  const pairs = []
  tpl.traverse((o) => {
    if (!o.isMesh) return
    const g = o.geometry.clone()
    g.applyMatrix4(o.matrixWorld)
    let m = o.material
    if (tint) {
      m = m.clone()
      if (m.color) m.color = m.color.clone().lerp(new THREE.Color(tint), 0.45)
    }
    pairs.push({ g, m })
  })
  bakedCache.set(key, pairs)
  return pairs
}

// ---------------------------------------------------------------- building visuals

/** Builds the visual group for a building at the current era + level. */
function buildingVisual(b, era, game) {
  const g = new THREE.Group()
  const level = b.level || 1
  const v = b.uid % 997 // deterministic variety
  const ry = ((v % 4) * Math.PI) / 2
  const foot = b.size * T3 * 0.9 // desired model footprint in world units
  const ks = (kit) => {
    const fit = KIT[kit][1]
    return typeof fit === 'number' ? foot / fit : 1
  }
  const lvlScale = 1 + (level - 1) * 0.07

  const pennants = (n, h) => {
    for (let i = 0; i < n - 1; i++) {
      const pole = cyl(0.03, 0.035, 0.9, MAT.woodDark, foot * 0.42 - i * 0.42, h, foot * 0.42, 5)
      const flag = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.22),
        new THREE.MeshStandardMaterial({ color: 0xe8a24c, roughness: 0.85, side: THREE.DoubleSide }))
      flag.position.set(foot * 0.42 - i * 0.42 + 0.18, h + 0.78, foot * 0.42)
      g.add(pole, flag)
    }
  }

  switch (b.type) {
    case 'core': {
      if (era === 0) {
        addKit(g, 'tentCanvas', { s: ks('tentCanvas') * 0.8, ry: 0.3 })
        addKit(g, 'campfirePit', { x: foot * 0.34, z: foot * 0.32 })
        addKit(g, 'chest', { x: -foot * 0.36, z: foot * 0.3, ry: 0.6, s: 0.6 })
        if (level >= 2) addKit(g, 'tent', { x: -foot * 0.28, z: -foot * 0.34, ry: 2.4, s: 0.3 })
        if (level >= 3) addKit(g, 'signpost', { x: foot * 0.42, z: -foot * 0.3, ry: -0.4 })
      } else if (era === 1) {
        addKit(g, 'comK', { emissive: 0.12, s: ks('comK') * 0.85 })
        g.add(box(foot * 0.7, 0.25, foot * 0.7, MAT.stone, 0, 0, 0))
      } else {
        addKit(g, 'skyA', { emissive: 0.3, s: ks('skyA') })
      }
      pennants(level, 0)
      const beacon = glowSprite(era === 2 ? 0x5ee6ff : 0xffb45a, 6, 0.5)
      beacon.position.y = era === 2 ? 10 : 4.6
      beacon.name = 'nightGlow'
      g.add(beacon)
      break
    }
    case 'house': {
      if (era === 0) {
        addKit(g, 'tentCanvas', { ry, s: ks('tentCanvas') * 0.75 * lvlScale })
        addKit(g, 'bedroll', { x: foot * 0.28, z: foot * 0.3, ry: ry + 0.5, s: 0.8 })
        if (level >= 2) addKit(g, 'barrel', { x: -foot * 0.32, z: foot * 0.3 })
        if (level >= 3) addKit(g, 'haystack', { x: -foot * 0.3, z: -foot * 0.34, s: 0.45 })
      } else if (era === 1) {
        const kit = HOUSE_E1[v % HOUSE_E1.length]
        addKit(g, kit, { ry, emissive: 0.1, s: ks(kit) * lvlScale })
      } else {
        const kit = HOUSE_E2[v % HOUSE_E2.length]
        addKit(g, kit, { ry, emissive: 0.28, s: ks(kit) * lvlScale })
      }
      break
    }
    case 'farm': {
      addKit(g, 'soil', { s: ks('soil') * (0.82 + level * 0.09) })
      // crop type changes with farm level (and glows in the neon era)
      const rows = [[-1.15, -0.95], [-1.15, 0.95], [0, -0.95], [0, 0.95], [1.15, -0.95], [1.15, 0.95]]
      const em = era === 2 ? 0.25 : 0
      const plantedRows = Math.min(rows.length, 2 + (level - 1) * 2)
      for (let i = 0; i < plantedRows; i++) {
        const [dx, dz] = rows[i]
        const crop = level === 1 ? (era === 0 ? 'cropWheat' : 'wheat')
          : level === 2 ? (i % 2 ? 'cropCarrot' : 'cropTurnip')
            : (i % 3 === 0 ? 'cropPumpkin' : i % 3 === 1 ? 'cropCorn' : 'cropMelon')
        addKit(g, crop, { x: dx, z: dz, s: 1.05, emissive: em })
      }
      if (level >= 3) addKit(g, 'cart', { x: foot * 0.42, z: 0, ry: ry + 0.4, s: 0.55 })
      if (era === 2) {
        const glow = glowSprite(0x7dffb8, 3, 0.3)
        glow.position.y = 0.8
        glow.name = 'nightGlow'
        g.add(glow)
      }
      break
    }
    case 'barracks': {
      // Every level swaps the main building silhouette: tent, timber hall,
      // then reinforced keep.
      const kit = level === 1 ? 'tent' : level === 2 && era < 2 ? 'structure' : 'structureMetal'
      addKit(g, kit, { s: ks(kit) * 0.95 * lvlScale, emissive: era === 2 ? 0.2 : 0 })
      if (era === 1) g.add(box(foot * 0.92, 0.18, foot * 0.92, MAT.stone, 0, 0, 0))
      // training yard: crossed spears rack + banner
      const s1 = cyl(0.03, 0.03, 1.4, MAT.woodDark, -0.9, 0, 1.35, 5)
      s1.rotation.z = 0.45
      const s2 = cyl(0.03, 0.03, 1.4, MAT.woodDark, -0.6, 0, 1.35, 5)
      s2.rotation.z = -0.45
      g.add(s1, s2)
      const pole = cyl(0.035, 0.045, 2.2, MAT.woodDark, 1.35, 0, 1.35, 6)
      const flag = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.42),
        new THREE.MeshStandardMaterial({ color: 0xd8434f, roughness: 0.85, side: THREE.DoubleSide }))
      flag.position.set(1.7, 1.85, 1.35)
      g.add(pole, flag)
      if (level >= 2) addKit(g, 'chest', { x: -1.35, z: 1.3, ry: 0.5 })
      break
    }
    case 'lumber': {
      g.add(cyl(0.95, 0.95, 0.06, MAT.dirt, 0, 0, 0, 12))
      addKit(g, 'treeLog', { x: -0.3, ry: ry + 0.4, s: 0.9 })
      addKit(g, 'resourceWood', { x: 0.45, z: 0.35, ry, s: 0.9 })
      if (level >= 2) addKit(g, 'resourcePlanks', { x: 0.4, z: -0.4, ry: ry + 1, s: 0.85 })
      if (level >= 2) addKit(g, 'workbench', { x: -0.35, z: -0.45, ry: ry + 0.4, s: 0.65 })
      if (level >= 3) {
        addKit(g, 'structure', { z: -0.15, ry, s: 0.42 })
        addKit(g, 'cart', { x: -0.2, z: 0.55, ry: ry + 2, s: 0.55 })
      }
      break
    }
    case 'quarry': {
      g.add(cyl(0.95, 0.95, 0.06, MAT.stoneDark, 0, 0, 0, 12))
      addKit(g, 'resourceStone', { x: -0.35, z: 0.2, ry, s: 0.9 })
      addKit(g, 'resourceStoneL', { x: 0.4, z: -0.25, ry: ry + 0.8, s: 0.9 })
      if (level >= 2) addKit(g, 'bucket', { x: 0.35, z: 0.5 })
      if (level === 2) addKit(g, 'structure', { z: 0.05, ry: ry + 0.5, s: 0.32 })
      if (level >= 3) {
        addKit(g, 'structureMetal', { z: 0.05, ry: ry + 0.5, s: 0.38 })
        addKit(g, 'cart', { x: -0.15, z: -0.6, ry: ry + 1.2, s: 0.55 })
      }
      break
    }
    case 'forge': {
      g.add(cyl(foot * 0.52, foot * 0.55, 0.08, MAT.stoneDark, 0, 0, 0, 14))
      addKit(g, 'anvil', { x: -0.55, z: 0.3, ry: 0.4, s: 1.1 })
      addKit(g, 'workbench', { x: 0.75, z: -0.55, ry: -0.5, s: 1.05 })
      addKit(g, 'campfireStand', { x: -0.7, z: -0.7 })
      if (level >= 2) addKit(g, 'grind', { x: 0.75, z: 0.65, ry: 2.6, s: 1.05 })
      if (level >= 3) addKit(g, 'chest', { x: 0.05, z: 1.05, ry: 3.1 })
      if (level >= 4) addKit(g, 'resourcePlanks', { x: -1.15, z: 0.9, s: 0.8 })
      const glow = glowSprite(0xffa04a, 2.6, 0.45)
      glow.position.set(-0.7, 0.8, -0.7)
      glow.name = 'nightGlow'
      g.add(glow)
      break
    }
    case 'wall': {
      const wry = wallOrientation(b, game)
      if (era === 0) {
        // wooden palisade (procedural — the fence GLB scales unreliably)
        for (const lx of [-0.75, -0.25, 0.25, 0.75]) {
          const post = cyl(0.13, 0.15, 1.05 + (lx * 37 % 1) * 0.2, MAT.woodDark, lx, 0, 0, 6)
          g.add(post)
        }
        const rail = box(1.9, 0.12, 0.1, MAT.wood, 0, 0.62, 0.14)
        g.add(rail)
        g.rotation.y = wry
      } else if (era === 1) {
        g.add(box(1.95, 1.1, 0.55, MAT.stone, 0, 0, 0))
        g.add(box(0.3, 1.35, 0.62, MAT.stoneDark, -0.7, 0, 0))
        g.add(box(0.3, 1.35, 0.62, MAT.stoneDark, 0.7, 0, 0))
        g.rotation.y = wry
      } else {
        const post1 = box(0.22, 1.5, 0.22, MAT.metalDark, -0.85, 0, 0)
        const post2 = box(0.22, 1.5, 0.22, MAT.metalDark, 0.85, 0, 0)
        const field = box(1.7, 1.25, 0.12, MAT.energyGlass, 0, 0.1, 0)
        field.castShadow = false
        g.add(post1, post2, field)
        g.rotation.y = wry
      }
      break
    }
    case 'arrow': {
      if (era === 0) {
        for (const [lx, lz] of [[-0.5, -0.5], [0.5, -0.5], [-0.5, 0.5], [0.5, 0.5]]) {
          g.add(box(0.16, 1.5, 0.16, MAT.woodDark, lx, 0, lz))
        }
        g.add(box(1.5, 0.16, 1.5, MAT.wood, 0, 1.5, 0))
        g.add(box(1.25, 0.5, 1.25, MAT.woodDark, 0, 1.66, 0))
        g.add(cone(1.0, 0.7, MAT.cloth, 0, 2.35, 0))
      } else if (era === 1) {
        g.add(cyl(0.62, 0.75, 1.9, MAT.stone, 0, 0, 0, 8))
        g.add(cyl(0.75, 0.75, 0.3, MAT.stoneDark, 0, 1.9, 0, 8))
        g.add(cone(0.62, 0.8, MAT.cloth, 0, 2.2, 0, 8))
      } else {
        g.add(cyl(0.45, 0.62, 2.2, MAT.metal, 0, 0, 0, 8))
        g.add(cyl(0.62, 0.62, 0.25, MAT.metalDark, 0, 2.2, 0, 8))
        const orb = new THREE.Mesh(new THREE.SphereGeometry(0.3, 10, 8), MAT.energy)
        orb.position.y = 2.7
        g.add(orb)
      }
      const barrel = box(0.16, 0.16, 1.0, era === 2 ? MAT.energy : MAT.woodDark, 0, era === 0 ? 1.95 : 2.05, 0.3)
      barrel.name = 'barrel'
      g.add(barrel)
      const glow = glowSprite(era === 2 ? 0x5ee6ff : 0xffb45a, 2.4, 0.4)
      glow.position.y = era === 0 ? 2.4 : 2.6
      glow.name = 'nightGlow'
      g.add(glow)
      g.scale.setScalar(lvlScale)
      break
    }
    case 'cannon': {
      g.add(box(1.5, 0.5, 1.5, era >= 2 ? MAT.metalDark : MAT.stoneDark, 0, 0, 0))
      g.add(cyl(0.5, 0.6, 0.5, era >= 2 ? MAT.metal : MAT.stone, 0, 0.5, 0, 8))
      const barrel = cyl(0.16, 0.22, 1.3, MAT.metalDark, 0, 0.75, 0.4, 8)
      barrel.rotation.x = Math.PI / 2.6
      barrel.name = 'barrel'
      g.add(barrel)
      g.scale.setScalar(lvlScale)
      break
    }
    case 'tesla': {
      g.add(cyl(0.16, 0.3, 2.4, MAT.metalDark, 0, 0, 0, 8))
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.06, 8, 16), MAT.metal)
      ring.position.y = 2.0
      ring.rotation.x = Math.PI / 2
      g.add(ring)
      const orb = new THREE.Mesh(new THREE.SphereGeometry(0.34, 12, 10), MAT.energy)
      orb.position.y = 2.6
      orb.name = 'teslaOrb'
      g.add(orb)
      const glow = glowSprite(0x8fd8ff, 2.8, 0.55)
      glow.position.y = 2.6
      glow.name = 'nightGlow'
      g.add(glow)
      g.scale.setScalar(lvlScale)
      break
    }
    case 'market': {
      const kit = era <= 1 ? 'comM' : 'comG'
      addKit(g, kit, { ry, emissive: era <= 1 ? 0.12 : 0.3, s: ks(kit) * lvlScale })
      break
    }
    case 'lab': {
      const kit = era >= 2 ? 'comI' : 'comG'
      addKit(g, kit, { ry, emissive: era >= 2 ? 0.3 : 0.15, s: ks(kit) * lvlScale })
      addKit(g, 'bottle', { x: foot * 0.4, z: foot * 0.38 })
      const glow = glowSprite(0x7fb8ff, 2.4, 0.35)
      glow.position.y = 2.6
      glow.name = 'nightGlow'
      g.add(glow)
      break
    }
    case 'generator': {
      const inner = new THREE.Group()
      inner.add(box(1.5, 0.9, 1.5, MAT.metalDark, 0, 0, 0))
      inner.add(cyl(0.2, 0.2, 1.3, MAT.metal, -0.4, 0.9, -0.35, 8))
      inner.add(cyl(0.2, 0.2, 1.05, MAT.metal, 0.1, 0.9, -0.35, 8))
      inner.add(box(0.7, 0.5, 0.5, MAT.energy, 0.25, 0.9, 0.35))
      inner.scale.setScalar(b.size * 0.95 * lvlScale)
      g.add(inner)
      break
    }
    case 'extractor': {
      g.add(cyl(0.55, 0.7, 0.5, MAT.metalDark, 0, 0, 0, 8))
      const drill = cone(0.3, 1.0, MAT.metal, 0, 0.5, 0, 8)
      drill.name = 'spinner'
      g.add(drill)
      const orb = new THREE.Mesh(new THREE.OctahedronGeometry(0.32), MAT.crystal)
      orb.position.y = 1.9
      orb.name = 'bobber'
      g.add(orb)
      const glow = glowSprite(0x4fd8f0, 2.6, 0.5)
      glow.position.y = 1.9
      glow.name = 'nightGlow'
      g.add(glow)
      g.scale.setScalar(lvlScale)
      break
    }
  }
  return g
}

/** Walls (and fences) align to their neighbouring walls like road tiles do. */
function wallOrientation(b, game) {
  const at = (dx, dy) => {
    const x = b.x + dx, y = b.y + dy
    if (x < 0 || y < 0 || x >= GRID_W || y >= GRID_H) return false
    const uidAt = game.buildingAt[y * GRID_W + x]
    if (uidAt < 0) return false
    const o = game.buildingByUid(uidAt)
    return !!(o && o.def.isWall)
  }
  const ns = at(0, -1) || at(0, 1)
  const ew = at(-1, 0) || at(1, 0)
  if (ns && !ew) return Math.PI / 2
  return 0
}

// ---------------------------------------------------------------- enemies

function enemyVisual(e) {
  // Articulated low-poly creatures; anim refs stored in userData.anim.
  const g = new THREE.Group()
  const c = new THREE.Color(e.def.color)
  const mat = new THREE.MeshStandardMaterial({ color: c, roughness: 0.7 })
  const dark = new THREE.MeshStandardMaterial({ color: c.clone().multiplyScalar(0.55), roughness: 0.8 })
  const anim = {}
  const eyeMat = new THREE.MeshStandardMaterial({ color: 0x111111, emissive: 0xffcf5e, emissiveIntensity: 1.2 })
  const eye = (r, x, y, z) => {
    const m = new THREE.Mesh(new THREE.SphereGeometry(r, 6, 5), eyeMat)
    m.position.set(x, y, z)
    return m
  }
  const legPivot = (mat2, px, py, pz, len = 0.22) => {
    const p = new THREE.Group()
    p.position.set(px, py, pz)
    const m = box(0.07, len, 0.07, mat2, 0, -len, 0)
    p.add(m)
    g.add(p)
    return p
  }

  if (e.type === 'grub') {
    // segmented caterpillar with feet
    anim.segs = []
    const sizes = [0.3, 0.25, 0.2]
    sizes.forEach((r, i) => {
      const seg = new THREE.Mesh(new THREE.SphereGeometry(r, 9, 7), i === 0 ? mat : dark)
      seg.position.set(0, r * 0.85, -i * 0.38 + 0.19)
      seg.castShadow = true
      g.add(seg)
      anim.segs.push(seg)
    })
    g.add(eye(0.05, -0.11, 0.34, 0.42), eye(0.05, 0.11, 0.34, 0.42))
    anim.legs = [
      legPivot(dark, -0.22, 0.2, 0.15, 0.16), legPivot(dark, 0.22, 0.2, 0.15, 0.16),
      legPivot(dark, -0.2, 0.18, -0.2, 0.16), legPivot(dark, 0.2, 0.18, -0.2, 0.16)
    ]
  } else if (e.type === 'shell') {
    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.52, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat)
    dome.position.y = 0.22
    dome.castShadow = true
    g.add(dome)
    for (let i = 0; i < 5; i++) {
      g.add(cone(0.08, 0.25, MAT.stoneDark, Math.cos(i * 1.25) * 0.3, 0.5, Math.sin(i * 1.25) * 0.3, 5))
    }
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), dark)
    head.position.set(0, 0.24, 0.55)
    g.add(head, eye(0.045, -0.07, 0.28, 0.66), eye(0.045, 0.07, 0.28, 0.66))
    anim.legs = []
    for (const sx of [-1, 1]) {
      for (const sz of [-0.28, 0.05, 0.38]) {
        anim.legs.push(legPivot(dark, sx * 0.45, 0.28, sz, 0.26))
      }
    }
  } else if (e.type === 'wasp') {
    const bodyG = new THREE.SphereGeometry(0.28, 10, 8)
    bodyG.scale(1, 0.8, 1.5)
    const body = new THREE.Mesh(bodyG, mat)
    body.castShadow = true
    g.add(body)
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), dark)
    head.position.set(0, 0.05, 0.42)
    g.add(head, eye(0.05, -0.08, 0.12, 0.52), eye(0.05, 0.08, 0.12, 0.52))
    g.add(cone(0.07, 0.3, MAT.stoneDark, 0, -0.05, -0.5, 5)).children.at(-1).rotation.x = Math.PI / 2 + 0.3
    const wingMat = new THREE.MeshStandardMaterial({
      color: 0xffffff, transparent: true, opacity: 0.45, roughness: 0.3, side: THREE.DoubleSide
    })
    anim.wings = []
    for (const s of [-1, 1]) {
      for (const z of [0.1, -0.12]) {
        const wing = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 0.24), wingMat)
        wing.position.set(s * 0.34, 0.16, z)
        wing.rotation.z = s * 0.4
        wing.userData.side = s
        anim.wings.push(wing)
        g.add(wing)
      }
    }
  } else if (e.type === 'lobber') {
    // crab-like artillery beast
    const bodyG = new THREE.SphereGeometry(0.4, 9, 7)
    bodyG.scale(1.25, 0.7, 1)
    const body = new THREE.Mesh(bodyG, mat)
    body.position.y = 0.42
    body.castShadow = true
    g.add(body, eye(0.05, -0.14, 0.62, 0.34), eye(0.05, 0.14, 0.62, 0.34))
    const tube = cyl(0.12, 0.16, 0.7, MAT.metalDark, 0, 0.62, -0.15, 8)
    tube.rotation.x = -0.7
    g.add(tube)
    anim.claws = []
    for (const s of [-1, 1]) {
      const claw = new THREE.Group()
      claw.position.set(s * 0.52, 0.4, 0.3)
      const arm = box(0.1, 0.1, 0.3, dark, 0, 0, 0.12)
      const pincer = box(0.18, 0.14, 0.22, mat, 0, 0, 0.36)
      claw.add(arm, pincer)
      anim.claws.push(claw)
      g.add(claw)
    }
    anim.legs = []
    for (const sx of [-1, 1]) {
      for (const sz of [-0.2, 0.12]) {
        anim.legs.push(legPivot(dark, sx * 0.42, 0.3, sz, 0.3))
      }
    }
  } else { // behemoth
    const bodyG = new THREE.IcosahedronGeometry(1.1, 0)
    bodyG.scale(1, 1.15, 0.9)
    const body = new THREE.Mesh(bodyG, mat)
    body.position.y = 1.55
    body.castShadow = true
    g.add(body)
    anim.body = body
    const head = new THREE.Mesh(new THREE.IcosahedronGeometry(0.45, 0), dark)
    head.position.set(0, 2.45, 0.55)
    g.add(head, eye(0.09, -0.18, 2.5, 0.92), eye(0.09, 0.18, 2.5, 0.92))
    for (const s of [-1, 1]) {
      const horn = cone(0.2, 0.8, MAT.stoneDark, s * 0.45, 2.7, 0.4, 5)
      horn.rotation.z = -s * 0.55
      g.add(horn)
    }
    anim.arms = []
    for (const s of [-1, 1]) {
      const arm = new THREE.Group()
      arm.position.set(s * 1.1, 2.0, 0)
      const upper = box(0.34, 1.15, 0.38, dark, 0, -1.15, 0)
      const fist = new THREE.Mesh(new THREE.IcosahedronGeometry(0.32, 0), mat)
      fist.position.y = -1.25
      arm.add(upper, fist)
      anim.arms.push(arm)
      g.add(arm)
    }
    for (const s of [-1, 1]) {
      g.add(box(0.42, 0.85, 0.5, dark, s * 0.5, 0, 0.05))
    }
  }
  g.userData.anim = anim
  return g
}

function makeHpBar() {
  const bg = new THREE.Sprite(new THREE.SpriteMaterial({ color: 0x111111, opacity: 0.65, transparent: true, depthWrite: false }))
  bg.scale.set(1.1, 0.12, 1)
  const fg = new THREE.Sprite(new THREE.SpriteMaterial({ color: 0x7ed957, opacity: 0.95, transparent: true, depthWrite: false }))
  fg.center.set(0, 0.5)
  fg.position.x = -0.55
  fg.scale.set(1.1, 0.09, 1)
  const g = new THREE.Group()
  g.add(bg, fg)
  g.visible = false
  return { group: g, fg }
}

// ================================================================= scene

export function createScene3D(game, canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' })
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.25
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFShadowMap

  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0x9fc4e8)
  scene.fog = new THREE.Fog(0x9fc4e8, 42, VIEW_DISTANCE)

  const camera = new THREE.PerspectiveCamera(45, 1, 0.4, 420)
  const camCtl = { tx: 0, tz: 6, dist: 46, azim: Math.PI * 0.05, polar: 0.96 }

  // ----- lights
  const hemi = new THREE.HemisphereLight(0xbfd8ff, 0x50593f, 0.85)
  scene.add(hemi)
  const sun = new THREE.DirectionalLight(0xfff1d6, 2.4)
  sun.position.set(45, 70, 25)
  sun.castShadow = true
  sun.shadow.mapSize.set(1024, 1024)
  sun.shadow.camera.left = -38
  sun.shadow.camera.right = 38
  sun.shadow.camera.top = 38
  sun.shadow.camera.bottom = -38
  sun.shadow.camera.far = 200
  sun.shadow.bias = -0.0005
  scene.add(sun)
  scene.add(sun.target)
  const coreLight = new THREE.PointLight(0xffb45a, 0, 26, 1.6)
  coreLight.position.set(0, 4, 0)
  scene.add(coreLight)

  // ----- ground
  const texLoader = new THREE.TextureLoader()
  const grassTex = (suffix, srgb) => {
    const t = texLoader.load(asset(`textures/Grass004_${suffix}.jpg`))
    t.wrapS = t.wrapT = THREE.RepeatWrapping
    t.repeat.set(64, 64)
    t.anisotropy = 4
    if (srgb) t.colorSpace = THREE.SRGBColorSpace
    return t
  }
  const groundMat = new THREE.MeshStandardMaterial({
    map: grassTex('Color', true),
    normalMap: grassTex('NormalGL'),
    roughnessMap: grassTex('Roughness'),
    color: 0xa8c090,
    roughness: 0.98
  })
  groundMat.normalScale.set(0.3, 0.3)
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(GRID_W * T3, GRID_H * T3), groundMat)
  ground.rotation.x = -Math.PI / 2
  ground.receiveShadow = true
  scene.add(ground)
  const outerMat = groundMat.clone()
  outerMat.color = new THREE.Color(0x5f7050)
  const outer = new THREE.Mesh(new THREE.PlaneGeometry(900, 900), outerMat)
  outer.rotation.x = -Math.PI / 2
  outer.position.y = -0.08
  outer.receiveShadow = true
  scene.add(outer)

  const grid = new THREE.GridHelper(GRID_W * T3, GRID_W, 0xffffff, 0xffffff)
  grid.material.transparent = true
  grid.material.opacity = 0.07
  grid.position.y = 0.03
  grid.visible = false
  scene.add(grid)

  // ----- placement ghost + selection ring
  const ghostMat = new THREE.MeshStandardMaterial({ color: 0x7ed957, transparent: true, opacity: 0.4 })
  const ghost = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), ghostMat)
  ghost.visible = false
  scene.add(ghost)
  const rangeRing = new THREE.Mesh(
    new THREE.RingGeometry(0.96, 1, 48),
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.4, side: THREE.DoubleSide, depthWrite: false })
  )
  rangeRing.rotation.x = -Math.PI / 2
  rangeRing.position.y = 0.06
  rangeRing.visible = false
  scene.add(rangeRing)
  const selRing = rangeRing.clone()
  selRing.material = rangeRing.material.clone()
  selRing.material.opacity = 0.7
  selRing.visible = false
  scene.add(selRing)

  // ----- first-person viewmodel (held tool — real kit models)
  scene.add(camera) // required so camera children (the tool) render
  const viewModel = new THREE.Group()
  viewModel.position.set(0.46, -0.42, -0.85)
  viewModel.rotation.set(0.35, -0.3, 0.12)
  camera.add(viewModel)
  const VM_KIT = (tool, tiers) => {
    if (tool === 'sword') return 'swordK'
    const up = tool === 'axe' ? tiers.axe >= 5 : tool === 'pick' ? tiers.pick >= 5 : tiers.hammer >= 5
    if (tool === 'axe') return up ? 'toolAxeUp' : 'toolAxe'
    if (tool === 'pick') return up ? 'toolPickUp' : 'toolPick'
    return up ? 'toolHammerUp' : 'toolHammer'
  }
  let vmKey = null
  let swingT = -1
  function startSwing() { swingT = 0 }
  function updateViewModel(dt) {
    viewModel.visible = game.camMode === 'fp' && game.phase !== 'over'
    if (!viewModel.visible) return
    const toolId = game.tool === 'build' ? 'hammer' : game.tool
    const key = VM_KIT(toolId, game.toolTiers)
    if (vmKey !== key) {
      vmKey = key
      viewModel.clear()
      const holder = new THREE.Group()
      // grip low so the head sits up like it's held
      addKit(holder, key, { y: -0.1, s: 0.55 })
      viewModel.add(holder)
      // strip shadows + brighten the held tool (it sits in the camera's shade)
      setTimeout(() => holder.traverse((o) => {
        if (o.isMesh) {
          o.castShadow = false
          o.receiveShadow = false
          o.material = o.material.clone()
          if (o.material.emissive) {
            o.material.emissive.set(0xffffff)
            o.material.emissiveMap = o.material.map ?? null
            o.material.emissiveIntensity = 0.35
          }
        }
      }), 350)
    }
    if (swingT >= 0) {
      swingT += dt
      const k = Math.min(1, swingT / 0.32)
      const a = Math.sin(k * Math.PI)
      viewModel.rotation.x = 0.35 - a * 1.5
      viewModel.position.z = -0.85 - a * 0.22
      viewModel.position.y = -0.42 - a * 0.1
      if (k >= 1) swingT = -1
    } else {
      // gentle idle sway
      viewModel.rotation.x = 0.35 + Math.sin(game.time * 1.7) * 0.02
      viewModel.position.y = -0.42 + Math.sin(game.time * 2.3) * 0.008
      viewModel.position.z = -0.85
    }
  }

  // ----- state maps
  const worldRoot = new THREE.Group()
  scene.add(worldRoot)
  const buildingObjs = new Map()  // building -> { group, era, level, bar, ...cached parts }
  const enemyObjs = new Map()     // enemy -> { group, bar }
  const unitObjs = new Map()      // soldiers -> { group, bar }
  const villagerObjs = new Map()  // villagers -> { group, bar, toolKit, props }
  const projObjs = new Map()      // projectile -> mesh
  const fxObjs = new Map()        // effect -> object
  let bannerObj = null
  let commanderObj = null
  let roadRebuildCd = 0
  let nodeVersion = -1
  let roadVersion = -1
  let roadGroup = null
  const cars = []
  let nightAmount = 0

  // ================================================================ icons
  // Tiny offscreen renderer that photographs kit models / visuals so the UI
  // can show real thumbnails instead of emojis.

  const iconCanvas = document.createElement('canvas')
  iconCanvas.width = iconCanvas.height = 112
  const iconRenderer = new THREE.WebGLRenderer({ canvas: iconCanvas, antialias: true, alpha: true })
  iconRenderer.outputColorSpace = THREE.SRGBColorSpace
  iconRenderer.setSize(112, 112, false)
  const iconScene = new THREE.Scene()
  iconScene.userData.keepOffscreen = true
  iconScene.add(new THREE.HemisphereLight(0xffffff, 0x8899aa, 1.15))
  const iconSun = new THREE.DirectionalLight(0xfff1d6, 2.2)
  iconSun.position.set(3, 5, 4)
  iconScene.add(iconSun)
  const iconCam = new THREE.PerspectiveCamera(30, 1, 0.05, 100)

  async function renderIcon(build) {
    const g = build()
    iconScene.add(g)
    // let async kit clones attach (templates are preloaded, so 2 ticks is enough)
    await new Promise(r => setTimeout(r, 0))
    await new Promise(r => setTimeout(r, 0))
    const bbox = new THREE.Box3().setFromObject(g)
    const size = bbox.getSize(new THREE.Vector3())
    const center = bbox.getCenter(new THREE.Vector3())
    const radius = Math.max(size.x, size.y, size.z) * 0.5 || 1
    const dir = new THREE.Vector3(1, 0.72, 1.35).normalize()
    iconCam.position.copy(center).addScaledVector(dir, radius * 2.9)
    iconCam.lookAt(center)
    iconRenderer.render(iconScene, iconCam)
    const url = iconCanvas.toDataURL('image/png')
    iconScene.remove(g)
    return url
  }

  let iconEra = -1
  let iconsBusy = false
  async function refreshIcons() {
    if (iconsBusy || !game.ui.icons) return
    iconsBusy = true
    const era = game.era
    const icons = game.ui.icons
    const jobs = []
    // resources
    jobs.push(['res_wood', () => { const g = new THREE.Group(); addKit(g, 'resourceWood'); return g }])
    jobs.push(['res_stone', () => { const g = new THREE.Group(); addKit(g, 'resourceStone'); return g }])
    jobs.push(['res_food', () => { const g = new THREE.Group(); addKit(g, 'cropWheat', { s: 1.4 }); return g }])
    jobs.push(['res_knowledge', () => { const g = new THREE.Group(); addKit(g, 'bottle', { s: 1.4 }); return g }])
    jobs.push(['res_energy', () => {
      const g = new THREE.Group()
      const cry = new THREE.Mesh(new THREE.OctahedronGeometry(0.4, 0), MAT.crystal)
      cry.scale.set(1, 1.6, 1)
      cry.position.y = 0.55
      g.add(cry)
      return g
    }])
    // tools
    for (const [key, kit] of [
      ['tool_sword', 'swordK'],
      ['tool_axe', 'toolAxe'], ['tool_axe_up', 'toolAxeUp'],
      ['tool_pick', 'toolPick'], ['tool_pick_up', 'toolPickUp'],
      ['tool_hammer', 'toolHammer'], ['tool_hammer_up', 'toolHammerUp'],
      ['tool_hoe', 'toolHoe']
    ]) {
      jobs.push([key, () => { const g = new THREE.Group(); addKit(g, kit); return g }])
    }
    // people
    jobs.push(['pop', () => personVisual({})])
    jobs.push(['soldier', () => personVisual({ tunic: SOLDIER_BODY.clone(), helmet: true, toolKit: 'swordK' })])
    jobs.push(['banner', () => makeBannerVisual()])
    // buildings at the current era
    const mockGame = { buildingAt: game.buildingAt, buildingByUid: () => null }
    for (const type of ['core', ...BUILD_ORDER]) {
      const def = BUILDINGS[type]
      jobs.push(['b_' + type, () => {
        if (type === 'road') {
          const g = new THREE.Group()
          addKit(g, 'road_straight', { ry: 0 })
          return g
        }
        return buildingVisual({ uid: 3, type, def, x: 0, y: 0, size: def.size, level: 1 }, era, mockGame)
      }])
    }
    for (const [key, build] of jobs) {
      const k = key.startsWith('b_') ? `${key}_${era}` : key
      if (icons[k]) continue
      try {
        icons[k] = await renderIcon(build)
      } catch { /* icon stays blank; UI shows fallback */ }
    }
    iconEra = era
    iconsBusy = false
  }

  // ================================================================ input

  const ray = new THREE.Raycaster()
  const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
  const ndc = new THREE.Vector2()
  const hitPt = new THREE.Vector3()

  function pickTile(clientX, clientY) {
    const r = canvas.getBoundingClientRect()
    ndc.set(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1)
    ray.setFromCamera(ndc, camera)
    if (!ray.ray.intersectPlane(groundPlane, hitPt)) return null
    return {
      x: Math.floor((hitPt.x + HALF_W) / T3),
      y: Math.floor((hitPt.z + HALF_H) / T3),
      wx: hitPt.x,
      wz: hitPt.z
    }
  }

  // Two camera modes. First-person commander (default): pointer-lock look,
  // WASD walks, SPACE jumps, crosshair aims. Orbit (tactical): drag pan, wheel zoom.
  game.camMode = 'fp'
  const fp = { yaw: Math.PI, pitch: -0.12 }
  const keys = new Set()
  const isLocked = () => document.pointerLockElement === canvas
  const uiBlocking = () =>
    game.buildMenu || game.panelOpen || game.phase === 'choice' ||
    game.phase === 'over' || game.paused || game.ui.rosterOpen

  let toolCd = 0
  function fpAct(button) {
    if (game.phase === 'over') return
    if (button === 2) {
      game.placing = null
      game.syncUi()
      return
    }
    if (button !== 0) return
    if (game.tool === 'build') {
      const t = game.hover
      if (!t) return
      if (game.placing) {
        const d = Math.hypot(t.x + 0.5 - game.commander.x, t.y + 0.5 - game.commander.y)
        if (d > game.buildReach()) {
          game.cb.toast('Too far away — walk closer to build')
          return
        }
        startSwing()
        game.tryPlace(game.placing, t.x, t.y)
      } else {
        game.openBuildMenu()
      }
      return
    }
    if (toolCd > 0) return
    toolCd = 0.45
    startSwing()
    if (game.tool === 'sword') {
      game.swingSword(Math.sin(fp.yaw), Math.cos(fp.yaw))
    } else {
      const hit = raycastNodes()
      if (hit && hit.dist <= GATHER.reach * T3) {
        if (!game.chopNode(hit.i, game.tool)) game.audio.play('swing')
      } else {
        game.audio.play('swing')
      }
    }
  }

  /** Raycast the crosshair against resource-node instanced meshes. */
  let nodeMeshes = []
  function raycastNodes() {
    if (!nodeMeshes.length) return null
    ray.setFromCamera(ndc.set(0, 0), camera)
    const hits = ray.intersectObjects(nodeMeshes, false)
    for (const h of hits) {
      if (h.instanceId === undefined) continue
      const tiles = h.object.userData.tiles
      if (!tiles) continue
      return { i: tiles[h.instanceId], dist: h.distance }
    }
    return null
  }

  /** Interact (E): open the panel for the aimed or nearest building. */
  function interact() {
    if (game.panelOpen || game.buildMenu) {
      game.closePanels()
      return
    }
    const t = game.hover
    if (t && t.x >= 0 && t.y >= 0 && t.x < GRID_W && t.y < GRID_H) {
      const uidAt = game.buildingAt[t.y * GRID_W + t.x]
      if (uidAt >= 0) {
        const b = game.buildingByUid(uidAt)
        if (b) {
          const d = Math.hypot(b.x + b.size / 2 - game.commander.x, b.y + b.size / 2 - game.commander.y)
          if (d < 14) {
            game.openInteract(b)
            return
          }
        }
      }
    }
    // fall back to the building the commander stands beside
    let best = null, bd = 5
    for (const b of game.buildings) {
      const d = Math.hypot(b.x + b.size / 2 - game.commander.x, b.y + b.size / 2 - game.commander.y) - b.size / 2
      if (d < bd) { bd = d; best = b }
    }
    if (best) game.openInteract(best)
  }

  let drag = null
  const onDown = (e) => {
    game.audio.ensure()
    if (game.camMode === 'fp') {
      if (!isLocked()) {
        if (!uiBlocking()) canvas.requestPointerLock?.()
        return
      }
      fpAct(e.button)
      return
    }
    canvas.setPointerCapture(e.pointerId)
    drag = {
      sx: e.clientX, sy: e.clientY,
      tx: camCtl.tx, tz: camCtl.tz,
      azim: camCtl.azim,
      moved: false,
      pan: e.button !== 0 || !game.placing,
      rotate: e.button === 2 && e.shiftKey
    }
    if (e.button === 2 && game.placing) {
      game.placing = null
      game.syncUi()
    }
  }
  const onMove = (e) => {
    if (game.camMode === 'fp') {
      if (isLocked()) {
        fp.yaw -= e.movementX * 0.0024
        fp.pitch = Math.max(-1.15, Math.min(0.55, fp.pitch - e.movementY * 0.0024))
      }
      return // fp aim tile is computed from screen centre each frame
    }
    const t = pickTile(e.clientX, e.clientY)
    if (t) game.hover = t
    if (!drag) return
    const dx = e.clientX - drag.sx
    const dy = e.clientY - drag.sy
    if (Math.abs(dx) + Math.abs(dy) > 5) drag.moved = true
    if (!drag.moved) return
    if (drag.rotate) {
      camCtl.azim = drag.azim - dx * 0.008
      return
    }
    if (drag.pan) {
      const k = camCtl.dist * 0.0016
      const cos = Math.cos(camCtl.azim), sin = Math.sin(camCtl.azim)
      camCtl.tx = drag.tx - (dx * cos - dy * sin) * k
      camCtl.tz = drag.tz - (dy * cos + dx * sin) * k
      camCtl.tx = Math.max(-HALF_W - 10, Math.min(HALF_W + 10, camCtl.tx))
      camCtl.tz = Math.max(-HALF_H - 10, Math.min(HALF_H + 10, camCtl.tz))
    }
  }
  const onUp = (e) => {
    if (game.camMode === 'fp') return
    const wasDrag = drag && drag.moved
    drag = null
    if (e.button !== 0 || wasDrag || game.phase === 'over') return
    const t = pickTile(e.clientX, e.clientY)
    if (!t) return
    if (game.placing) game.tryPlace(game.placing, t.x, t.y)
    else game.selectAt(t.x, t.y)
  }
  const onWheel = (e) => {
    e.preventDefault()
    if (game.camMode === 'fp') {
      if (game.tool === 'build' && game.placing) game.cyclePlacing(e.deltaY > 0 ? 1 : -1)
      return
    }
    camCtl.dist = Math.max(14, Math.min(130, camCtl.dist * (e.deltaY > 0 ? 1.1 : 0.9)))
  }

  function toggleMode() {
    if (game.camMode === 'fp') {
      game.camMode = 'orbit'
      document.exitPointerLock?.()
      camCtl.tx = twx(game.commander.x)
      camCtl.tz = twz(game.commander.y) + 4
    } else {
      game.camMode = 'fp'
    }
    game.syncUi(true)
  }

  const onKeyDown = (e) => {
    const k = e.key.toLowerCase()
    keys.add(k)
    if (e.key === 'Escape') {
      game.placing = null
      game.closePanels()
    }
    if (k === ' ' && !uiBlocking()) {
      e.preventDefault()
      game.jump()
    }
    if (k === 'v') toggleMode()
    if (k === 'e' && game.camMode === 'fp') {
      if (!game.buildMenu && game.phase !== 'choice' && game.phase !== 'over') interact()
    }
    if (k === 'b') {
      const t = game.hover || { x: Math.floor(game.commander.x), y: Math.floor(game.commander.y) }
      game.toggleBanner(t.x, t.y)
    }
  }
  const onKeyUp = (e) => keys.delete(e.key.toLowerCase())
  const onBlur = () => keys.clear()
  const onCtx = (e) => e.preventDefault()

  function updateInput(dt) {
    if (game.camMode === 'fp') {
      // free the mouse whenever a menu needs it
      if (isLocked() && uiBlocking()) {
        document.exitPointerLock?.()
      }
      // walk the commander (not while the full build menu is up or you're down)
      const canWalk = !game.buildMenu && game.phase !== 'choice' && !(game.commander.downT > 0)
      const speed = (keys.has('shift') ? 7.5 : 4.4) * dt
      let f = 0, s = 0
      if (canWalk) {
        if (keys.has('w') || keys.has('arrowup')) f += 1
        if (keys.has('s') || keys.has('arrowdown')) f -= 1
        if (keys.has('a') || keys.has('arrowleft')) s -= 1
        if (keys.has('d') || keys.has('arrowright')) s += 1
      }
      if (f || s) {
        const len = Math.hypot(f, s) || 1
        const sinY = Math.sin(fp.yaw), cosY = Math.cos(fp.yaw)
        // forward (sinY, cosY) and right (-cosY, sinY) in tile space
        const dx = ((sinY * f) / len + (-cosY * s) / len) * speed
        const dz = ((cosY * f) / len + (sinY * s) / len) * speed
        game.moveCircle(game.commander, dx, dz, 0.3) // hitbox: slide along buildings/nodes
        game.commander.x = Math.max(0.6, Math.min(GRID_W - 0.6, game.commander.x))
        game.commander.y = Math.max(0.6, Math.min(GRID_H - 0.6, game.commander.y))
        game.commanderMoving = true
      } else {
        game.commanderMoving = false
      }
      game.commanderYaw = fp.yaw
      // aim tile from screen centre
      ray.setFromCamera(ndc.set(0, 0), camera)
      if (ray.ray.intersectPlane(groundPlane, hitPt)) {
        game.hover = {
          x: Math.floor((hitPt.x + HALF_W) / T3),
          y: Math.floor((hitPt.z + HALF_H) / T3)
        }
      }
    } else {
      const pan = camCtl.dist * 1.6 * dt
      const cos = Math.cos(camCtl.azim), sin = Math.sin(camCtl.azim)
      let mx = 0, mz = 0
      if (keys.has('w') || keys.has('arrowup')) mz = -1
      if (keys.has('s') || keys.has('arrowdown')) mz = 1
      if (keys.has('a') || keys.has('arrowleft')) mx = -1
      if (keys.has('d') || keys.has('arrowright')) mx = 1
      if (mx || mz) {
        camCtl.tx += (mx * cos - mz * sin) * pan
        camCtl.tz += (mz * cos + mx * sin) * pan
        camCtl.tx = Math.max(-HALF_W - 10, Math.min(HALF_W + 10, camCtl.tx))
        camCtl.tz = Math.max(-HALF_H - 10, Math.min(HALF_H + 10, camCtl.tz))
      }
      if (keys.has('q')) camCtl.azim += 1.8 * dt
      if (keys.has('e')) camCtl.azim -= 1.8 * dt
    }
  }

  canvas.addEventListener('pointerdown', onDown)
  canvas.addEventListener('pointermove', onMove)
  canvas.addEventListener('pointerup', onUp)
  canvas.addEventListener('wheel', onWheel, { passive: false })
  canvas.addEventListener('contextmenu', onCtx)
  window.addEventListener('keydown', onKeyDown)
  window.addEventListener('keyup', onKeyUp)
  window.addEventListener('blur', onBlur)

  // ================================================================ nodes
  // Trees/rocks/crystals as instanced meshes, chunked 32×32 tiles so distant
  // chunks cull away behind the mist.

  const CHUNK = 32
  const CHUNKS_X = Math.ceil(GRID_W / CHUNK)
  const CHUNKS_Y = Math.ceil(GRID_H / CHUNK)
  const nodeChunks = [] // {group, cx, cy, wx, wz}
  const nodeRoot = new THREE.Group()
  worldRoot.add(nodeRoot)
  let nodeAssetsReady = false
  let pendingNodeRebuild = true

  for (let cy = 0; cy < CHUNKS_Y; cy++) {
    for (let cx = 0; cx < CHUNKS_X; cx++) {
      const group = new THREE.Group()
      nodeRoot.add(group)
      nodeChunks.push({
        group, cx, cy,
        wx: twx((cx + 0.5) * CHUNK), wz: twz((cy + 0.5) * CHUNK)
      })
    }
  }

  // crystal geometry (procedural — glows nicely)
  const crystalPairs = (() => {
    const baseG = new THREE.DodecahedronGeometry(0.52, 0)
    baseG.scale(1, 0.5, 1)
    baseG.translate(0, 0.16, 0)
    const cryG = new THREE.OctahedronGeometry(0.42, 0)
    cryG.scale(1, 1.6, 1)
    cryG.translate(0, 0.7, 0)
    const smallG = new THREE.OctahedronGeometry(0.22, 0)
    smallG.scale(1, 1.5, 1)
    smallG.translate(0.4, 0.34, 0.2)
    return [
      { g: baseG, m: MAT.stoneDark },
      { g: cryG, m: MAT.crystal },
      { g: smallG, m: MAT.crystal }
    ]
  })()

  const dummy = new THREE.Object3D()
  function rebuildChunk(chunk) {
    // dispose old instanced meshes (geometries are shared — don't dispose those)
    for (const child of [...chunk.group.children]) {
      chunk.group.remove(child)
      child.dispose?.()
    }
    // gather nodes by kind+tier within the chunk
    const byKey = new Map()
    const x0 = chunk.cx * CHUNK, y0 = chunk.cy * CHUNK
    const x1 = Math.min(GRID_W, x0 + CHUNK), y1 = Math.min(GRID_H, y0 + CHUNK)
    for (let y = y0; y < y1; y++) {
      for (let x = x0; x < x1; x++) {
        const i = y * GRID_W + x
        if (game.nodeAmount[i] <= 0) continue
        const kind = game.nodeKind[i]
        if (kind === 0) continue
        const key = kind * 16 + (game.nodeTier[i] || 1)
        if (!byKey.has(key)) byKey.set(key, [])
        byKey.get(key).push(i)
      }
    }
    for (const [key, list] of byKey) {
      const kind = key >> 4
      const tier = key & 15
      let pairs, baseScale
      if (kind === 1) {
        const spec = TREE_TIERS[tier - 1]
        pairs = bakedPairs('nt_' + spec.model)
        baseScale = spec.scale
      } else if (kind === 2) {
        const spec = ROCK_TIERS[tier - 1]
        pairs = bakedPairs('nr_' + spec.model, spec.tint || 0)
        baseScale = spec.scale
      } else {
        pairs = crystalPairs
        baseScale = 0.9 + tier * 0.08
      }
      if (!pairs) continue
      for (const { g: geom, m: mat } of pairs) {
        const mesh = new THREE.InstancedMesh(geom, mat, list.length)
        list.forEach((i, idx) => {
          const x = i % GRID_W, y = (i / GRID_W) | 0
          const seed = game.groundSeed[i]
          const grow = 0.55 + 0.45 * Math.min(1, game.nodeAmount[i] / (game.nodeAmountMax[i] || 1))
          dummy.position.set(
            twx(x + 0.5) + (seed - 0.5) * 0.8, 0,
            twz(y + 0.5) + ((seed * 7) % 1 - 0.5) * 0.8
          )
          dummy.rotation.set(0, seed * 6.28, 0)
          dummy.scale.setScalar(baseScale * grow * (0.85 + ((seed * 13) % 1) * 0.3))
          dummy.updateMatrix()
          mesh.setMatrixAt(idx, dummy.matrix)
        })
        mesh.instanceMatrix.needsUpdate = true
        mesh.castShadow = true
        mesh.receiveShadow = true
        mesh.userData.tiles = list // instanceId -> tile index, for tool raycasts
        mesh.computeBoundingSphere?.()
        chunk.group.add(mesh)
      }
    }
  }

  function rebuildNodeMeshList() {
    nodeMeshes = []
    for (const c of nodeChunks) {
      for (const m of c.group.children) nodeMeshes.push(m)
    }
  }

  function updateNodes() {
    if (!nodeAssetsReady) return
    if (game.nodeVersion === nodeVersion && !pendingNodeRebuild) return
    const full = pendingNodeRebuild || !game.nodeDirty
    nodeVersion = game.nodeVersion
    pendingNodeRebuild = false
    if (full) {
      for (const c of nodeChunks) rebuildChunk(c)
    } else {
      const dirty = new Set()
      for (const i of game.nodeDirty) {
        const x = i % GRID_W, y = (i / GRID_W) | 0
        dirty.add(((y / CHUNK) | 0) * CHUNKS_X + ((x / CHUNK) | 0))
      }
      for (const ci of dirty) rebuildChunk(nodeChunks[ci])
    }
    game.nodeDirty = []
    rebuildNodeMeshList()
  }

  // preload everything the world + icons need, then build
  const PRELOAD = [
    ...TREE_TIERS.map(t => 'nt_' + t.model),
    ...ROCK_TIERS.map(r => 'nr_' + r.model),
    'tent', 'tentCanvas', 'campfirePit', 'campfireStand', 'workbench', 'anvil', 'grind',
    'chest', 'barrel', 'structure', 'resourceWood', 'resourceStone', 'resourceStoneL',
    'resourcePlanks', 'treeLog', 'signpost', 'bedroll', 'bucket', 'bottle',
    'toolAxe', 'toolAxeUp', 'toolPick', 'toolPickUp', 'toolHammer', 'toolHammerUp',
    'toolHoe', 'swordK', 'soil', 'cropWheat', 'cropCarrot', 'cropTurnip', 'cropPumpkin',
    'cropMelon', 'cropCorn', 'cart', 'haystack'
  ]
  preloadKits(PRELOAD).then(() => {
    nodeAssetsReady = true
    pendingNodeRebuild = true
    refreshIcons()
  })

  // ================================================================ roads + cars

  function rebuildRoads() {
    if (roadGroup) worldRoot.remove(roadGroup)
    roadGroup = new THREE.Group()
    const has = (x, y) =>
      x >= 0 && y >= 0 && x < GRID_W && y < GRID_H && game.roadAt[y * GRID_W + x] === 1
    for (let y = 0; y < GRID_H; y++) {
      for (let x = 0; x < GRID_W; x++) {
        if (!has(x, y)) continue
        const arms = { N: has(x, y - 1), S: has(x, y + 1), E: has(x + 1, y), W: has(x - 1, y) }
        const { tile, ry } = pickRoadTile(arms)
        addKit(roadGroup, 'road_' + tile, { x: twx(x + 0.5), z: twz(y + 0.5), ry })
      }
    }
    worldRoot.add(roadGroup)
    syncCarCount()
  }

  function roadNeighbours(x, y) {
    const out = []
    const has = (nx, ny) =>
      nx >= 0 && ny >= 0 && nx < GRID_W && ny < GRID_H && game.roadAt[ny * GRID_W + nx] === 1
    if (has(x, y - 1)) out.push([0, -1])
    if (has(x, y + 1)) out.push([0, 1])
    if (has(x + 1, y)) out.push([1, 0])
    if (has(x - 1, y)) out.push([-1, 0])
    return out
  }

  function syncCarCount() {
    const roadTiles = []
    for (let i = 0; i < game.roadAt.length; i++) if (game.roadAt[i] === 1) roadTiles.push(i)
    const want = Math.min(5, Math.floor(roadTiles.length / 6))
    while (cars.length > want) {
      const c = cars.pop()
      worldRoot.remove(c.group)
    }
    while (cars.length < want && roadTiles.length) {
      const i = roadTiles[Math.floor(Math.random() * roadTiles.length)]
      const x = i % GRID_W, y = (i / GRID_W) | 0
      const dirs = roadNeighbours(x, y)
      const dir = dirs.length ? dirs[Math.floor(Math.random() * dirs.length)] : [1, 0]
      const group = new THREE.Group()
      addKit(group, CAR_KITS[Math.floor(Math.random() * CAR_KITS.length)])
      worldRoot.add(group)
      cars.push({ group, x, y, dir, t: Math.random(), speed: 1.6 + Math.random() * 0.8 })
    }
  }

  function updateCars(dt) {
    for (const c of cars) {
      c.t += (dt * c.speed) / T3 * 2
      if (c.t >= 1) {
        c.t = 0
        c.x += c.dir[0]
        c.y += c.dir[1]
        const opts = roadNeighbours(c.x, c.y).filter(([dx, dy]) => !(dx === -c.dir[0] && dy === -c.dir[1]))
        if (opts.length) {
          // prefer going straight
          const straight = opts.find(([dx, dy]) => dx === c.dir[0] && dy === c.dir[1])
          c.dir = straight && Math.random() < 0.7 ? straight : opts[Math.floor(Math.random() * opts.length)]
        } else {
          c.dir = [-c.dir[0], -c.dir[1]]
        }
      }
      const fx = c.x + 0.5 + c.dir[0] * c.t
      const fy = c.y + 0.5 + c.dir[1] * c.t
      // offset to the left lane relative to travel direction
      const ox = c.dir[1] * -0.42
      const oz = c.dir[0] * 0.42
      c.group.position.set(twx(fx) + ox, 0.02, twz(fy) + oz)
      c.group.rotation.y = Math.atan2(c.dir[0], c.dir[1])
    }
  }

  // ================================================================ reconcile

  let camX = 0, camZ = 0
  function cullByDist(group, wx, wz, extra = 0) {
    const dx = wx - camX, dz = wz - camZ
    const lim = CULL_DIST + extra
    const vis = dx * dx + dz * dz < lim * lim
    group.visible = vis
    return vis
  }
  function near(wx, wz, r) {
    const dx = wx - camX, dz = wz - camZ
    return dx * dx + dz * dz < r * r
  }

  function syncBuildings() {
    const alive = new Set(game.buildings)
    for (const b of game.buildings) {
      let rec = buildingObjs.get(b)
      if (rec && (rec.era !== game.era || rec.level !== (b.level || 1))) {
        worldRoot.remove(rec.group)
        buildingObjs.delete(b)
        rec = null
      }
      if (!rec) {
        const group = buildingVisual(b, game.era, game)
        group.position.set(twx(b.x + b.size / 2), 0, twz(b.y + b.size / 2))
        const bar = makeHpBar()
        bar.group.position.y = b.type === 'core' ? 7 : b.size > 1 ? 4.2 : 2.6
        group.add(bar.group)
        worldRoot.add(group)
        // cache named parts once — per-frame getObjectByName over GLB trees was a hotspot
        rec = {
          group, era: game.era, level: b.level || 1, bar,
          wx: twx(b.x + b.size / 2), wz: twz(b.y + b.size / 2),
          barrel: group.getObjectByName('barrel'),
          spinner: group.getObjectByName('spinner'),
          bobber: group.getObjectByName('bobber'),
          orb: group.getObjectByName('teslaOrb'),
          glow: group.getObjectByName('nightGlow')
        }
        buildingObjs.set(b, rec)
      }
      if (!cullByDist(rec.group, rec.wx, rec.wz, b.size * 2)) continue
      // hp bar
      const damaged = b.hp < b.hpMax
      rec.bar.group.visible = damaged
      if (damaged) {
        const f = Math.max(0, b.hp / b.hpMax)
        rec.bar.fg.scale.x = 1.1 * f
        rec.bar.fg.material.color.setHex(f > 0.5 ? 0x7ed957 : f > 0.25 ? 0xffd35e : 0xff5e5e)
      }
      // tower aim + idle animations
      if (rec.barrel && b.aim !== undefined) {
        rec.group.rotation.y = Math.PI / 2 - b.aim
      }
      if (rec.spinner) rec.spinner.rotation.y += 0.15
      if (rec.bobber) rec.bobber.position.y = 1.9 + Math.sin(game.time * 2 + b.uid) * 0.15
      if (rec.orb) rec.orb.scale.setScalar(1 + Math.sin(game.time * 5 + b.uid) * 0.08)
    }
    for (const [b, rec] of buildingObjs) {
      if (!alive.has(b)) {
        worldRoot.remove(rec.group)
        buildingObjs.delete(b)
      }
    }
  }

  function syncEnemies(dt) {
    const alive = new Set(game.enemies)
    for (const e of game.enemies) {
      let rec = enemyObjs.get(e)
      if (!rec) {
        const group = enemyVisual(e)
        const bar = makeHpBar()
        bar.group.position.y = e.def.boss ? 3.2 : 1.1
        group.add(bar.group)
        worldRoot.add(group)
        rec = { group, bar }
        enemyObjs.set(e, rec)
      }
      const wx = twx(e.x), wz = twz(e.y)
      if (!cullByDist(rec.group, wx, wz)) continue
      const y = e.def.flying ? 2.6 + Math.sin(e.wobble) * 0.25 : 0
      rec.group.position.set(wx, y, wz)
      const A = near(wx, wz, ANIM_DIST) ? (rec.group.userData.anim || {}) : {}
      if (e.def.flying) {
        if (A.wings) {
          const flap = Math.sin(game.time * 30 + e.uid) * 0.55
          for (const w of A.wings) w.rotation.z = w.userData.side * (0.4 + flap)
        }
      } else {
        rec.group.position.y = Math.abs(Math.sin(e.wobble)) * 0.06
        if (A.legs) {
          for (let i = 0; i < A.legs.length; i++) {
            A.legs[i].rotation.x = Math.sin(e.wobble * 1.5 + i * 1.7) * 0.5
          }
        }
        if (A.segs) {
          // inchworm squash
          const p = Math.sin(e.wobble)
          rec.group.scale.z = 1 + p * 0.12
          rec.group.scale.y = 1 - p * 0.08
        }
        if (A.claws) {
          for (let i = 0; i < A.claws.length; i++) {
            A.claws[i].rotation.y = Math.sin(e.wobble + i * 3) * 0.3 * (i ? 1 : -1)
          }
        }
        if (A.arms) {
          const sw = Math.sin(e.wobble * 0.8) * 0.4
          A.arms[0].rotation.x = sw
          A.arms[1].rotation.x = -sw
        }
        if (A.body) A.body.rotation.y = Math.sin(e.wobble * 0.4) * 0.1
      }
      // face travel direction
      if (rec.lastX !== undefined) {
        const dx = e.x - rec.lastX, dy = e.y - rec.lastY
        if (Math.abs(dx) + Math.abs(dy) > 0.001) {
          rec.group.rotation.y = Math.atan2(dx, dy)
        }
      }
      rec.lastX = e.x
      rec.lastY = e.y
      const damaged = e.hp < e.hpMax
      rec.bar.group.visible = damaged
      if (damaged) {
        rec.bar.fg.scale.x = 1.1 * Math.max(0, e.hp / e.hpMax)
        rec.bar.fg.material.color.setHex(0xff6a5e)
      }
    }
    for (const [e, rec] of enemyObjs) {
      if (!alive.has(e)) {
        worldRoot.remove(rec.group)
        enemyObjs.delete(e)
      }
    }
  }

  // ---- people: villagers, soldiers, commander, banner --------------------

  const SKIN = new THREE.MeshStandardMaterial({ color: 0xe8c49a, roughness: 0.85 })
  const PANTS = new THREE.MeshStandardMaterial({ color: 0x4a4038, roughness: 0.9 })
  const SOLDIER_BODY = new THREE.MeshStandardMaterial({ color: 0x3f7fa8, roughness: 0.8 })
  const JOB_COLORS = {
    idle: 0x9a8f80, wood: 0x6f8f4a, mine: 0x8a8f98, farm: 0xc9a35a,
    work: 0x6e8fa8, train: 0x5b7fa8
  }

  /** Articulated low-poly person; hinged legs/arms, optional kit tool in hand. */
  function personVisual({ tunic = null, scale = 1, helmet = false, toolKit = null } = {}) {
    const g = new THREE.Group()
    const s = scale
    const tunicMat = tunic || new THREE.MeshStandardMaterial({ color: 0x9a8f80, roughness: 0.85 })
    const limb = (w, h, d, mat, px, py, pz) => {
      const pivot = new THREE.Group()
      pivot.position.set(px, py, pz)
      const m = box(w, h, d, mat, 0, -h, 0)
      m.position.y = -h / 2
      pivot.add(m)
      g.add(pivot)
      return pivot
    }
    const legL = limb(0.12 * s, 0.5 * s, 0.14 * s, PANTS, -0.1 * s, 0.5 * s, 0)
    const legR = limb(0.12 * s, 0.5 * s, 0.14 * s, PANTS, 0.1 * s, 0.5 * s, 0)
    const torso = box(0.38 * s, 0.5 * s, 0.22 * s, tunicMat, 0, 0.5 * s, 0)
    const head = box(0.24 * s, 0.24 * s, 0.22 * s, SKIN, 0, 1.02 * s, 0)
    g.add(torso, head)
    if (helmet) g.add(box(0.27 * s, 0.09 * s, 0.25 * s, tunicMat, 0, 1.24 * s, 0))
    const armL = limb(0.1 * s, 0.42 * s, 0.12 * s, tunicMat, -0.25 * s, 0.98 * s, 0)
    const armR = limb(0.1 * s, 0.42 * s, 0.12 * s, tunicMat, 0.25 * s, 0.98 * s, 0)
    g.userData.limbs = { legL, legR, armL, armR }
    g.userData.tunicMat = tunicMat
    g.userData.toolHolder = null
    if (toolKit) attachTool(g, toolKit, s)
    return g
  }

  function attachTool(personG, toolKit, s = 1) {
    const armR = personG.userData.limbs.armR
    if (personG.userData.toolHolder) {
      armR.remove(personG.userData.toolHolder)
      personG.userData.toolHolder = null
    }
    if (!toolKit) return
    const holder = new THREE.Group()
    holder.position.set(0.02 * s, -0.42 * s, 0.1 * s)
    holder.rotation.x = 0.6
    addKit(holder, toolKit, { s: 0.9 * s })
    armR.add(holder)
    personG.userData.toolHolder = holder
  }

  function villagerToolKit(v) {
    const t = game.toolTiers
    if (v.job === 'wood') return t.axe >= 5 ? 'toolAxeUp' : 'toolAxe'
    if (v.job === 'mine') return t.pick >= 5 ? 'toolPickUp' : 'toolPick'
    if (v.job === 'farm') return 'toolHoe'
    return null
  }

  const villagerObjsSync = () => {
    const alive = new Set(game.villagers)
    for (const v of game.villagers) {
      let rec = villagerObjs.get(v)
      if (!rec) {
        const tunic = new THREE.MeshStandardMaterial({ color: JOB_COLORS[v.job] || 0x9a8f80, roughness: 0.85 })
        const group = personVisual({ tunic, scale: 0.92 })
        const bar = makeHpBar()
        bar.group.position.y = 1.35
        bar.group.scale.setScalar(0.6)
        group.add(bar.group)
        // carry props (kit resource stacks shown while hauling)
        const carryWood = new THREE.Group()
        carryWood.position.set(0, 1.05, -0.3)
        carryWood.visible = false
        addKit(carryWood, 'resourceWood', { s: 0.5 })
        const carryStone = new THREE.Group()
        carryStone.position.set(0, 1.05, -0.3)
        carryStone.visible = false
        addKit(carryStone, 'resourceStone', { s: 0.5 })
        group.add(carryWood, carryStone)
        worldRoot.add(group)
        rec = { group, bar, toolKit: undefined, carryWood, carryStone }
        villagerObjs.set(v, rec)
      }
      const wx = twx(v.x), wz = twz(v.y)
      if (!cullByDist(rec.group, wx, wz)) continue
      const bob = v.moving ? Math.abs(Math.sin(v.wobble)) * 0.05 : 0
      rec.group.position.set(wx, bob, wz)
      rec.group.userData.tunicMat.color.setHex(v.sheltering ? 0x59677a :
        v.fleeing ? 0xd86a5a : (JOB_COLORS[v.job] || 0x9a8f80))
      const kit = villagerToolKit(v)
      if (rec.toolKit !== kit) {
        rec.toolKit = kit
        attachTool(rec.group, kit, 0.92)
      }
      rec.carryWood.visible = v.carry > 0 && v.job === 'wood'
      rec.carryStone.visible = v.carry > 0 && v.job === 'mine'
      if (near(wx, wz, ANIM_DIST)) {
        const L = rec.group.userData.limbs
        const working = v.working && game.time - v.working < 0.5
        const sw = v.moving ? Math.sin(v.wobble) * 0.6 : 0
        L.legL.rotation.x = sw
        L.legR.rotation.x = -sw
        L.armL.rotation.x = -sw * 0.6
        L.armR.rotation.x = working ? -1.3 + Math.sin(game.time * 7 + v.uid) * 0.75 : sw * 0.6
      }
      if (rec.lastX !== undefined && (v.x !== rec.lastX || v.y !== rec.lastY)) {
        rec.group.rotation.y = Math.atan2(v.x - rec.lastX, v.y - rec.lastY)
      }
      rec.lastX = v.x
      rec.lastY = v.y
      const damaged = v.hp < v.hpMax
      rec.bar.group.visible = damaged
      if (damaged) {
        rec.bar.fg.scale.x = 1.1 * Math.max(0, v.hp / v.hpMax)
        rec.bar.fg.material.color.setHex(0xffd35e)
      }
    }
    for (const [v, rec] of villagerObjs) {
      if (!alive.has(v)) {
        worldRoot.remove(rec.group)
        villagerObjs.delete(v)
      }
    }
  }

  function syncUnits() {
    const alive = new Set(game.units)
    for (const u of game.units) {
      let rec = unitObjs.get(u)
      if (!rec) {
        const group = personVisual({
          tunic: new THREE.MeshStandardMaterial({ color: 0x3f7fa8, roughness: 0.8 }),
          helmet: true, toolKit: 'swordK'
        })
        const bar = makeHpBar()
        bar.group.position.y = 1.35
        bar.group.scale.setScalar(0.7)
        group.add(bar.group)
        worldRoot.add(group)
        rec = { group, bar }
        unitObjs.set(u, rec)
      }
      const wx = twx(u.x), wz = twz(u.y)
      if (!cullByDist(rec.group, wx, wz)) continue
      const bob = u.moving ? Math.abs(Math.sin(u.wobble)) * 0.06 : 0
      rec.group.position.set(wx, bob, wz)
      if (near(wx, wz, ANIM_DIST)) {
        const L = rec.group.userData.limbs
        const sw = u.moving ? Math.sin(u.wobble) * 0.6 : 0
        L.legL.rotation.x = sw
        L.legR.rotation.x = -sw
        L.armL.rotation.x = -sw * 0.6
        const striking = u.struck && game.time - u.struck < 0.18
        L.armR.rotation.x = striking ? -1.9 : sw * 0.6
      }
      // face the target or travel direction
      const face = u.target || (rec.lastX !== undefined && (u.x !== rec.lastX || u.y !== rec.lastY)
        ? { x: u.x + (u.x - rec.lastX), y: u.y + (u.y - rec.lastY) }
        : null)
      if (face) rec.group.rotation.y = Math.atan2(face.x - u.x, face.y - u.y)
      rec.lastX = u.x
      rec.lastY = u.y
      const damaged = u.hp < u.hpMax
      rec.bar.group.visible = damaged
      if (damaged) {
        rec.bar.fg.scale.x = 1.1 * Math.max(0, u.hp / u.hpMax)
        rec.bar.fg.material.color.setHex(0x7fd8e8)
      }
    }
    for (const [u, rec] of unitObjs) {
      if (!alive.has(u)) {
        worldRoot.remove(rec.group)
        unitObjs.delete(u)
      }
    }
  }

  function ensureCommander() {
    if (commanderObj) return commanderObj
    const tunic = new THREE.MeshStandardMaterial({ color: 0x8a3b3b, roughness: 0.8 })
    commanderObj = personVisual({ tunic, scale: 1.15 })
    // small gold pauldron marks the commander
    const trim = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.045, 6, 12), new THREE.MeshStandardMaterial({
      color: 0xd8a848, roughness: 0.4, metalness: 0.6
    }))
    trim.position.y = 0.72
    trim.rotation.x = Math.PI / 2
    commanderObj.add(trim)
    worldRoot.add(commanderObj)
    return commanderObj
  }

  function updateCommanderBody() {
    const c = ensureCommander()
    c.visible = game.camMode === 'orbit'
    if (!c.visible) return
    const bob = game.commanderMoving ? Math.abs(Math.sin(game.time * 9)) * 0.05 : 0
    c.position.set(twx(game.commander.x), bob + game.commander.jumpY, twz(game.commander.y))
    c.rotation.y = fp.yaw + Math.PI
    if (game.commander.downT > 0) {
      c.rotation.z = Math.PI / 2
      c.position.y = 0.3
    } else {
      c.rotation.z = 0
    }
    const L = c.userData.limbs
    if (L) {
      const sw = game.commanderMoving ? Math.sin(game.time * 9) * 0.6 : 0
      L.legL.rotation.x = sw
      L.legR.rotation.x = -sw
      L.armL.rotation.x = -sw * 0.6
      L.armR.rotation.x = sw * 0.6
    }
  }

  function makeBannerVisual() {
    const g = new THREE.Group()
    g.add(cyl(0.04, 0.05, 2.1, MAT.woodDark, 0, 0, 0, 6))
    const flag = new THREE.Mesh(
      new THREE.PlaneGeometry(0.85, 0.5),
      new THREE.MeshStandardMaterial({ color: 0xd8434f, roughness: 0.85, side: THREE.DoubleSide })
    )
    flag.position.set(0.44, 1.78, 0)
    flag.name = 'flag'
    g.add(flag)
    return g
  }

  function updateBanner() {
    if (!game.banner) {
      if (bannerObj) bannerObj.visible = false
      return
    }
    if (!bannerObj) {
      bannerObj = makeBannerVisual()
      const glow = glowSprite(0xff7a6b, 2.4, 0.4)
      glow.position.y = 1.9
      bannerObj.add(glow)
      worldRoot.add(bannerObj)
    }
    bannerObj.visible = true
    bannerObj.position.set(twx(game.banner.x), 0, twz(game.banner.y))
    const flag = bannerObj.getObjectByName('flag')
    flag.rotation.y = Math.sin(game.time * 3) * 0.3
  }

  const arrowGeo = new THREE.BoxGeometry(0.06, 0.06, 0.55)
  const arrowMat = new THREE.MeshBasicMaterial({ color: 0xf5e6c0 })
  const ballGeo = new THREE.SphereGeometry(0.16, 8, 6)
  const ballMat = new THREE.MeshStandardMaterial({ color: 0x2b2b2b, roughness: 0.6 })
  const shellMat = new THREE.MeshStandardMaterial({ color: 0xa78ae8, emissive: 0x6a4fd8, emissiveIntensity: 0.8 })
  const rockGeo = new THREE.DodecahedronGeometry(0.09, 0)

  function syncProjectiles() {
    const alive = new Set(game.projectiles)
    for (const p of game.projectiles) {
      let m = projObjs.get(p)
      if (!m) {
        if (p.kind === 'arrow') m = new THREE.Mesh(arrowGeo, arrowMat)
        else if (p.kind === 'cannon') m = new THREE.Mesh(ballGeo, ballMat)
        else if (p.kind === 'rock') m = new THREE.Mesh(rockGeo, ballMat)
        else m = new THREE.Mesh(ballGeo, shellMat)
        worldRoot.add(m)
        projObjs.set(p, m)
      }
      const h = p.kind === 'shell' ? 1.6 : p.kind === 'cannon' ? 1.2 : 1.4
      m.position.set(twx(p.x), h, twz(p.y))
      if (p.rot !== undefined) m.rotation.y = Math.atan2(Math.cos(p.rot), Math.sin(p.rot))
    }
    for (const [p, m] of projObjs) {
      if (!alive.has(p)) {
        worldRoot.remove(m)
        projObjs.delete(p)
      }
    }
  }

  const boomGeo = new THREE.SphereGeometry(1, 10, 8)
  function syncEffects() {
    const alive = new Set(game.effects)
    for (const fx of game.effects) {
      let o = fxObjs.get(fx)
      if (!o) {
        if (fx.kind === 'lightning') {
          const pts = fx.pts.map(([x, y]) => new THREE.Vector3(twx(x), 2.2, twz(y)))
          const jag = []
          for (let i = 0; i < pts.length - 1; i++) {
            jag.push(pts[i])
            const mid = pts[i].clone().lerp(pts[i + 1], 0.5)
            mid.y += (Math.random() - 0.5) * 1.2
            jag.push(mid)
          }
          jag.push(pts[pts.length - 1])
          o = new THREE.Line(
            new THREE.BufferGeometry().setFromPoints(jag),
            new THREE.LineBasicMaterial({ color: 0x9fe8ff, transparent: true })
          )
        } else {
          const color = fx.kind === 'ring' ? 0xffffff : fx.kind === 'pop' ? new THREE.Color(fx.color || '#fff').getHex() : 0xffa04a
          o = new THREE.Mesh(boomGeo, new THREE.MeshBasicMaterial({
            color, transparent: true, opacity: 0.7, depthWrite: false,
            blending: THREE.AdditiveBlending
          }))
          o.position.set(twx(fx.x / TILE), 0.6, twz(fx.y / TILE))
        }
        worldRoot.add(o)
        fxObjs.set(fx, o)
      }
      const f = fx.t / fx.ttl
      if (fx.kind === 'lightning') {
        o.material.opacity = 1 - f
      } else {
        const r = (fx.r / TILE) * T3
        o.scale.setScalar(Math.max(0.05, r * (0.3 + f * 0.9) * 0.5))
        o.material.opacity = 0.7 * (1 - f)
      }
    }
    for (const [fx, o] of fxObjs) {
      if (!alive.has(fx)) {
        worldRoot.remove(o)
        if (o.geometry && fx.kind === 'lightning') o.geometry.dispose()
        if (o.material) o.material.dispose()
        fxObjs.delete(fx)
      }
    }
  }

  // ================================================================ ambience

  const DAY = {
    bg: new THREE.Color(0x9fc4e8), fogC: new THREE.Color(0x9fc4e8),
    hemi: 0.85, sun: 2.4, sunC: new THREE.Color(0xfff1d6)
  }
  const NIGHT = {
    bg: new THREE.Color(0x0b1020), fogC: new THREE.Color(0x0b1020),
    hemi: 0.22, sun: 0.35, sunC: new THREE.Color(0x8fa8e0)
  }
  const tmpC = new THREE.Color()

  function updateAmbience(dt) {
    const goal = game.phase === 'night' ? 1 : 0
    nightAmount += (goal - nightAmount) * Math.min(1, dt * 1.6)
    const n = nightAmount
    scene.background.copy(tmpC.copy(DAY.bg).lerp(NIGHT.bg, n))
    scene.fog.color.copy(scene.background)
    // the mist closes in at night; the tactical camera sees over more of it
    const orbitExtra = game.camMode === 'orbit' ? camCtl.dist * 1.4 : 0
    scene.fog.near = 42 - n * 14 + orbitExtra * 0.5
    scene.fog.far = VIEW_DISTANCE - n * 24 + orbitExtra
    hemi.intensity = DAY.hemi + (NIGHT.hemi - DAY.hemi) * n
    sun.intensity = DAY.sun + (NIGHT.sun - DAY.sun) * n
    sun.color.copy(tmpC.copy(DAY.sunC).lerp(NIGHT.sunC, n))
    coreLight.intensity = n * (game.era === 2 ? 3.2 : 2.2)
    coreLight.color.setHex(game.era === 2 ? 0x5ee6ff : 0xffb45a)
    // per-building night glows (cached refs)
    for (const [, rec] of buildingObjs) {
      if (rec.glow) rec.glow.material.opacity = 0.12 + n * 0.5
    }
  }

  function updateGhost() {
    const placing = game.placing && BUILDINGS[game.placing]
    grid.visible = !!placing
    if (!placing || !game.hover) {
      ghost.visible = false
      rangeRing.visible = false
      return
    }
    const t = game.hover
    // in first person the ghost only shows within building reach
    if (game.camMode === 'fp') {
      const d = Math.hypot(t.x + 0.5 - game.commander.x, t.y + 0.5 - game.commander.y)
      if (d > game.buildReach()) {
        ghost.visible = false
        rangeRing.visible = false
        return
      }
    }
    const ok = game.canPlace(game.placing, t.x, t.y)
    const s = placing.size * T3
    ghost.visible = true
    ghost.scale.set(s * 0.92, placing.isRoad ? 0.1 : 1.4, s * 0.92)
    ghost.position.set(twx(t.x + placing.size / 2), (placing.isRoad ? 0.1 : 1.4) / 2, twz(t.y + placing.size / 2))
    ghostMat.color.setHex(ok ? 0x7ed957 : 0xff5e5e)
    if (placing.tower || placing.aura) {
      const r = placing.tower
        ? (placing.tower.range + game.mods.towerRange) * T3
        : placing.aura.radius * T3
      rangeRing.visible = true
      rangeRing.scale.setScalar(r)
      rangeRing.position.set(ghost.position.x, 0.06, ghost.position.z)
    } else {
      rangeRing.visible = false
    }
  }

  function updateSelection() {
    const s = game.selected
    if (!s) {
      selRing.visible = false
      return
    }
    selRing.visible = true
    const r = s.def.tower ? game.towerStats(s).range * T3 : s.size * T3 * 0.8
    selRing.scale.setScalar(r)
    selRing.position.set(twx(s.x + s.size / 2), 0.06, twz(s.y + s.size / 2))
  }

  // ================================================================ frame

  let w = 0, h = 0
  function resize() {
    const cw = canvas.clientWidth, ch = canvas.clientHeight
    if (cw !== w || ch !== h) {
      w = cw; h = ch
      renderer.setSize(cw, ch, false)
      renderer.setPixelRatio(Math.min(1.5, window.devicePixelRatio || 1))
      camera.aspect = cw / Math.max(1, ch)
      camera.updateProjectionMatrix()
    }
  }

  const fpDir = new THREE.Vector3()
  function update(dt) {
    resize()
    if (toolCd > 0) toolCd -= dt
    updateInput(dt)
    updateViewModel(dt)
    if (game.camMode === 'fp') {
      const ex = twx(game.commander.x)
      const ez = twz(game.commander.y)
      const bob = game.commanderMoving && game.commander.grounded ? Math.sin(game.time * 11) * 0.05 : 0
      const downDip = game.commander.downT > 0 ? -1.15 : 0
      camera.position.set(ex, 1.72 + bob + game.commander.jumpY + downDip, ez)
      fpDir.set(
        Math.sin(fp.yaw) * Math.cos(fp.pitch),
        Math.sin(fp.pitch),
        Math.cos(fp.yaw) * Math.cos(fp.pitch)
      )
      camera.lookAt(ex + fpDir.x, camera.position.y + fpDir.y, ez + fpDir.z)
      sun.position.set(ex + 35, 62, ez + 20)
      sun.target.position.set(ex, 0, ez)
    } else {
      const { tx, tz, dist, azim, polar } = camCtl
      camera.position.set(
        tx + Math.sin(azim) * Math.cos(polar) * dist,
        Math.sin(polar) * dist,
        tz + Math.cos(azim) * Math.cos(polar) * dist
      )
      camera.lookAt(tx, 0, tz)
      sun.position.set(tx + 35, 62, tz + 20)
      sun.target.position.set(tx, 0, tz)
    }
    camX = camera.position.x
    camZ = camera.position.z

    updateNodes()
    // chunk-level mist culling
    for (const c of nodeChunks) {
      cullByDist(c.group, c.wx, c.wz, CHUNK * T3 * 0.75)
    }
    roadRebuildCd -= dt
    if (game.roadVersion !== roadVersion && roadRebuildCd <= 0) {
      roadVersion = game.roadVersion
      roadRebuildCd = 0.25 // batch rapid road placement into one rebuild
      rebuildRoads()
    }
    if (iconEra !== game.era && nodeAssetsReady) refreshIcons()
    syncBuildings()
    syncEnemies(dt)
    villagerObjsSync()
    syncUnits()
    syncProjectiles()
    syncEffects()
    updateCars(dt)
    updateCommanderBody()
    updateBanner()
    updateAmbience(dt)
    updateGhost()
    updateSelection()

    renderer.render(scene, camera)
  }

  function destroy() {
    if (isLocked()) document.exitPointerLock?.()
    canvas.removeEventListener('pointerdown', onDown)
    canvas.removeEventListener('pointermove', onMove)
    canvas.removeEventListener('pointerup', onUp)
    canvas.removeEventListener('wheel', onWheel)
    canvas.removeEventListener('contextmenu', onCtx)
    window.removeEventListener('keydown', onKeyDown)
    window.removeEventListener('keyup', onKeyUp)
    window.removeEventListener('blur', onBlur)
    iconRenderer.dispose()
    renderer.dispose()
  }

  /** Fully clears world objects (used by game.reset). */
  function clearWorld() {
    for (const [, rec] of buildingObjs) worldRoot.remove(rec.group)
    for (const [, rec] of enemyObjs) worldRoot.remove(rec.group)
    for (const [, rec] of unitObjs) worldRoot.remove(rec.group)
    for (const [, rec] of villagerObjs) worldRoot.remove(rec.group)
    for (const [, m] of projObjs) worldRoot.remove(m)
    for (const [, o] of fxObjs) worldRoot.remove(o)
    buildingObjs.clear()
    enemyObjs.clear()
    unitObjs.clear()
    villagerObjs.clear()
    projObjs.clear()
    fxObjs.clear()
    for (const c of cars.splice(0)) worldRoot.remove(c.group)
    if (bannerObj) bannerObj.visible = false
    nodeVersion = -1
    pendingNodeRebuild = true
    roadVersion = -1
    camCtl.tx = 0
    camCtl.tz = 6
    camCtl.dist = 46
    fp.yaw = Math.PI
    fp.pitch = -0.12
  }

  /** Debug/tour helper: reposition the orbit camera. */
  function setCamera(opts = {}) {
    Object.assign(camCtl, opts)
  }

  return { update, destroy, clearWorld, setCamera, toggleMode, refreshIcons }
}
