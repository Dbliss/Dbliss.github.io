// Frontier — core game engine.
// A settlement-defence roguelike: build and upgrade a city, command villagers,
// forge better tools, and hold the Beacon through twelve nights.

import {
  TILE, GRID_W, GRID_H, MAP_SEED, CLEAR_RADIUS, SPAWN_RADIUS,
  ERAS, BUILDINGS, ENEMIES, WAVES, WAVE_HP_SCALE,
  UPGRADES, RALLY, REPAIR_COST_PER_HP, DEMOLISH_REFUND,
  START_RESOURCES, PREP_TIME, REROLL_COST,
  BUILD_ORDER, SWORD, GATHER, JUMP,
  TREE_TIERS, ROCK_TIERS, CRYSTAL,
  TOOL_TIER_COSTS, TOOL_TIER_NAMES, FORGE_REQ, MAX_TOOL_TIER,
  BUILD_REACH, HAMMER_REACH_PER_TIER, HAMMER_REPAIR_DISCOUNT,
  CORE_LEVELS, MAX_CORE_LEVEL, UPGRADE_COST_MULT, UPGRADE_HP_MULT,
  UPGRADE_PROD_MULT, UPGRADE_TOWER_DMG_MULT, UPGRADE_TOWER_RANGE_ADD,
  buildingLimit, VILLAGER, SOLDIER, JOBS
} from './defs.js'
import { computeFlowField } from './pathfind.js'
import { createScene3D } from './scene3d.js'
import { createAudio } from './audio.js'

const NODE_KIND = { none: 0, tree: 1, rock: 2, crystal: 3 }

const NAMES = [
  'Ada', 'Bram', 'Cato', 'Dara', 'Edda', 'Finn', 'Gale', 'Hild', 'Ivo', 'Juna',
  'Kell', 'Lena', 'Milo', 'Nyra', 'Otto', 'Pia', 'Quill', 'Rook', 'Sela', 'Tam',
  'Ulf', 'Vera', 'Wren', 'Xan', 'Yara', 'Zeb', 'Asha', 'Bo', 'Cleo', 'Dov'
]

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

let uid = 1

export class FrontierGame {
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {object} ui reactive object owned by the Vue page (engine writes, page reads)
   * @param {object} cb { toast, offerUpgrades, eraAdvance, gameOver }
   */
  constructor(canvas, ui, cb) {
    this.canvas = canvas
    this.ui = ui
    this.cb = cb
    this.audio = createAudio()
    this.destroyed = false
    this.paused = false
    this.reset()
    this.view = createScene3D(this, canvas)
    this.lastT = performance.now()
    this.raf = requestAnimationFrame(this.frame)
  }

  reset() {
    this.res = { ...START_RESOURCES }
    this.era = 0
    this.wave = 1
    this.phase = 'day' // day | night | choice | over
    this.phaseT = PREP_TIME
    this.time = 0
    this.mods = {
      arrowMulti: 0, wallHpMult: 0, wallRegen: 0, prodMult: 0, compost: 0,
      teslaChain: 0, towerRange: 0, dropMult: 0, woodDiscount: 0, towerDmg: 0,
      fortressDoctrine: 0, boomWalls: 0, postWaveRepair: 0, energyMult: 0,
      passiveKnowledge: 0, armedHouses: 0, splashMult: 0, repairDrone: 0
    }
    this.toolTiers = { sword: 1, axe: 1, pick: 1, hammer: 1 }
    this.picked = []
    this.offers = []
    this.stats = { kills: 0, built: 0, wavesCleared: 0, started: Date.now() }
    this.buildings = []
    this.enemies = []
    this.units = []       // soldiers
    this.villagers = []
    this.projectiles = []
    this.effects = []
    this.spawnQueue = []
    this.commander = {
      x: GRID_W / 2, y: GRID_H / 2 + 4,
      hp: 100, hpMax: 100, jumpY: 0, vy: 0, grounded: true, downT: 0
    }
    this.banner = null
    this.unitSlot = 0
    this.tool = 'sword'
    this.buildingAt = new Int32Array(GRID_W * GRID_H).fill(-1)
    this.roadAt = new Uint8Array(GRID_W * GRID_H)
    this.nodeKind = new Uint8Array(GRID_W * GRID_H)
    this.nodeTier = new Uint8Array(GRID_W * GRID_H)
    this.nodeAmount = new Float32Array(GRID_W * GRID_H)
    this.nodeAmountMax = new Float32Array(GRID_W * GRID_H)
    this.groundSeed = new Float32Array(GRID_W * GRID_H)
    this.nodeVersion = (this.nodeVersion || 0) + 1
    this.nodeDirty = null // null = rebuild everything; else list of tile indices
    this.roadVersion = (this.roadVersion || 0) + 1
    this.flow = null
    this.flowDirty = true
    this.auraDirty = true
    this.growthT = 0
    this.rosterT = 0
    this.rallyT = 0       // remaining active time
    this.rallyCd = 0
    this.placing = null
    this.hover = null
    this.selected = null   // building shown in the interact panel
    this.panelOpen = false
    this.buildMenu = false
    this.eraFlash = 0
    this.generateMap()
    this.spawnCore()
    for (let i = 0; i < 4; i++) this.spawnVillager()
    if (this.view) this.view.clearWorld()
    this.syncUi(true)
    this.syncRoster()
  }

  // ---------------------------------------------------------------- map
  // The map is FIXED (seeded): a clearing around the Beacon, then rings of
  // trees and rock veins that grow tougher toward the edge of the mist.

  tierAtRadius(d) {
    return Math.max(1, Math.min(8, 1 + Math.floor((d - CLEAR_RADIUS - 1) / 6.5)))
  }

  generateMap() {
    const rnd = mulberry32(MAP_SEED)
    for (let i = 0; i < this.groundSeed.length; i++) this.groundSeed[i] = rnd()
    const cx = GRID_W / 2, cy = GRID_H / 2
    const put = (kind, x, y, tier, tiers) => {
      if (x < 1 || y < 1 || x >= GRID_W - 1 || y >= GRID_H - 1) return
      const d = Math.hypot(x - cx, y - cy)
      if (d < CLEAR_RADIUS) return
      const i = y * GRID_W + x
      if (this.nodeKind[i] !== NODE_KIND.none) return
      this.nodeKind[i] = kind
      this.nodeTier[i] = tier
      const base = kind === NODE_KIND.crystal ? CRYSTAL.amount : tiers[tier - 1].amount
      const amt = base * (0.75 + rnd() * 0.5)
      this.nodeAmount[i] = amt
      this.nodeAmountMax[i] = amt
    }
    const cluster = (kind, tier, tiers, count, ringR, ringW, sizeMin, sizeMax) => {
      for (let c = 0; c < count; c++) {
        const ang = rnd() * Math.PI * 2
        const r = ringR + (rnd() - 0.5) * ringW
        const bx = Math.round(cx + Math.cos(ang) * r)
        const by = Math.round(cy + Math.sin(ang) * r)
        const size = sizeMin + Math.floor(rnd() * (sizeMax - sizeMin + 1))
        for (let s = 0; s < size; s++) {
          const x = bx + Math.round((rnd() - 0.5) * 5)
          const y = by + Math.round((rnd() - 0.5) * 5)
          // jitter tier ±1 within the band for a natural border
          const t = Math.max(1, Math.min(8, tier + (rnd() < 0.18 ? (rnd() < 0.5 ? -1 : 1) : 0)))
          put(kind, x, y, t, tiers)
        }
      }
    }
    for (let tier = 1; tier <= 8; tier++) {
      const ringR = CLEAR_RADIUS + 1 + (tier - 0.5) * 6.5
      const circ = ringR * Math.PI * 2
      cluster(NODE_KIND.tree, tier, TREE_TIERS, Math.round(circ / 9), ringR, 6.5, 6, 13)
      cluster(NODE_KIND.rock, tier, ROCK_TIERS, Math.round(circ / 16), ringR, 6.5, 4, 8)
      if (tier >= 4 && tier <= 7) {
        cluster(NODE_KIND.crystal, tier, null, Math.round(circ / 40), ringR, 6.5, 2, 4)
      }
    }
    // edge wilds: everything past the last ring is tier 8 forest
    const edgeR = CLEAR_RADIUS + 1 + 8 * 6.5
    for (let y = 1; y < GRID_H - 1; y++) {
      for (let x = 1; x < GRID_W - 1; x++) {
        const d = Math.hypot(x - cx, y - cy)
        if (d > edgeR && rnd() < 0.16) {
          put(rnd() < 0.7 ? NODE_KIND.tree : NODE_KIND.rock, x, y, 8, rnd() < 0.7 ? TREE_TIERS : ROCK_TIERS)
        }
      }
    }
  }

  spawnCore() {
    const def = BUILDINGS.core
    const s = def.size
    const x = Math.floor(GRID_W / 2) - Math.floor(s / 2)
    const y = Math.floor(GRID_H / 2) - Math.floor(s / 2)
    const b = {
      uid: uid++, type: 'core', def, x, y, size: s, level: 1,
      hp: CORE_LEVELS[1].hp, hpMax: CORE_LEVELS[1].hp,
      cooldown: 0, prodBonus: 0, active: true
    }
    this.buildings.push(b)
    this.core = b
    for (let dy = 0; dy < s; dy++) {
      for (let dx = 0; dx < s; dx++) {
        this.buildingAt[(y + dy) * GRID_W + (x + dx)] = b.uid
      }
    }
  }

  buildingByUid(id) {
    return this.buildings.find(b => b.uid === id)
  }

  /** A node at tile i was depleted — tell the view to refresh just that chunk. */
  markNodeDirty(i) {
    if (this.nodeDirty) this.nodeDirty.push(i)
    else this.nodeDirty = [i]
    this.nodeVersion++
  }

  get coreLevel() { return this.core ? this.core.level : 1 }

  countType(typeId) {
    if (typeId === 'road') {
      let n = 0
      for (let i = 0; i < this.roadAt.length; i++) if (this.roadAt[i]) n++
      return n
    }
    let n = 0
    for (const b of this.buildings) if (b.type === typeId) n++
    return n
  }

  // ---------------------------------------------------------------- selection / interaction

  selectAt(tx, ty) {
    if (tx < 0 || ty < 0 || tx >= GRID_W || ty >= GRID_H) return
    const uidAt = this.buildingAt[ty * GRID_W + tx]
    const b = uidAt >= 0 ? this.buildingByUid(uidAt) : null
    if (b) this.openInteract(b)
    else this.closePanels()
  }

  openInteract(b) {
    this.selected = b
    this.panelOpen = true
    this.buildMenu = false
    this.syncUi(true)
  }

  closePanels() {
    this.selected = null
    this.panelOpen = false
    this.buildMenu = false
    this.syncUi(true)
  }

  openBuildMenu() {
    this.buildMenu = true
    this.panelOpen = false
    this.selected = null
    this.placing = null
    this.syncUi(true)
  }

  // ---------------------------------------------------------------- building

  costOf(typeId) {
    const def = BUILDINGS[typeId]
    const cost = { ...def.cost }
    if (cost.wood && this.mods.woodDiscount) {
      cost.wood = Math.ceil(cost.wood * (1 - this.mods.woodDiscount))
    }
    return cost
  }

  canAfford(cost) {
    return Object.entries(cost).every(([k, v]) => this.res[k] >= v)
  }

  pay(cost, sign = 1) {
    for (const [k, v] of Object.entries(cost)) this.res[k] -= v * sign
  }

  canPlace(typeId, tx, ty) {
    const def = BUILDINGS[typeId]
    if (!def || def.unbuildable) return false
    if (this.era < def.era) return false
    const s = def.size
    if (tx < 0 || ty < 0 || tx + s > GRID_W || ty + s > GRID_H) return false
    for (let dy = 0; dy < s; dy++) {
      for (let dx = 0; dx < s; dx++) {
        const i = (ty + dy) * GRID_W + (tx + dx)
        if (this.buildingAt[i] >= 0) return false
        if (this.roadAt[i] === 1) return false
        if (this.nodeKind[i] !== NODE_KIND.none && this.nodeAmount[i] > 0) return false
      }
    }
    if (def.needsNode) {
      if (this.adjacentNode(tx, ty, NODE_KIND[def.needsNode]) < 0) return false
    }
    return true
  }

  adjacentNode(tx, ty, kind) {
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const x = tx + dx, y = ty + dy
        if (x < 0 || y < 0 || x >= GRID_W || y >= GRID_H) continue
        const i = y * GRID_W + x
        if (this.nodeKind[i] === kind && this.nodeAmount[i] > 0) return i
      }
    }
    return -1
  }

  buildReach() {
    return BUILD_REACH + (this.toolTiers.hammer - 1) * HAMMER_REACH_PER_TIER
  }

  tryPlace(typeId, tx, ty) {
    const def = BUILDINGS[typeId]
    const cost = this.costOf(typeId)
    const limit = buildingLimit(typeId, this.coreLevel)
    if (this.countType(typeId) >= limit) {
      this.cb.toast(limit === 0
        ? `${def.name} needs a higher Beacon level`
        : `${def.name} limit reached (${limit}) — upgrade the Beacon`)
      this.audio.play('deny')
      return
    }
    if (!this.canPlace(typeId, tx, ty)) {
      this.cb.toast('Can\'t build there' + (def.needsNode ? ` — needs adjacent ${def.needsNode}` : ''))
      return
    }
    if (!this.canAfford(cost)) {
      this.cb.toast('Not enough resources')
      this.audio.play('deny')
      return
    }
    this.pay(cost)
    if (def.isRoad) {
      this.roadAt[ty * GRID_W + tx] = 1
      this.roadVersion++
      this.auraDirty = true
      this.stats.built++
      this.audio.play('build')
      return
    }
    const hpMax = def.isWall
      ? Math.round(ERAS[this.era].wallHp * (1 + this.mods.wallHpMult))
      : def.hp
    const b = {
      uid: uid++, type: typeId, def, x: tx, y: ty, size: def.size, level: 1,
      hp: hpMax, hpMax, cooldown: Math.random() * 0.3, prodBonus: 0,
      active: true, spentCost: cost
    }
    this.buildings.push(b)
    for (let dy = 0; dy < def.size; dy++) {
      for (let dx = 0; dx < def.size; dx++) {
        this.buildingAt[(ty + dy) * GRID_W + (tx + dx)] = b.uid
      }
    }
    this.stats.built++
    this.flowDirty = true
    this.auraDirty = true
    this.audio.play('build')
    this.effects.push({ kind: 'ring', x: (tx + def.size / 2) * TILE, y: (ty + def.size / 2) * TILE, t: 0, ttl: 0.4, r: TILE })
    // keep placing for walls / repeat building; hold to spam
  }

  // ---- upgrades (Clash-style: per-building levels, Beacon gates limits) ----

  upgradeCost(b) {
    if (b.type === 'core') {
      return b.level >= MAX_CORE_LEVEL ? null : CORE_LEVELS[b.level + 1].cost
    }
    if (!b.def.maxLevel || b.level >= b.def.maxLevel) return null
    const mult = Math.pow(UPGRADE_COST_MULT, b.level - 1) * 1.4
    const out = {}
    for (const [k, v] of Object.entries(b.def.cost)) out[k] = Math.ceil(v * mult)
    if (Object.keys(out).length === 0) out.wood = Math.ceil(20 * mult)
    return out
  }

  upgradeBuilding(b) {
    const cost = this.upgradeCost(b)
    if (!cost) return
    if (!this.canAfford(cost)) {
      this.cb.toast('Not enough resources to upgrade')
      this.audio.play('deny')
      return
    }
    this.pay(cost)
    b.level++
    if (b.type === 'core') {
      const spec = CORE_LEVELS[b.level]
      b.hpMax = spec.hp
      b.hp = spec.hp
      this.cb.toast(`The Beacon reaches level ${b.level} — building limits raised`)
    } else {
      const nm = Math.round(b.hpMax * UPGRADE_HP_MULT)
      b.hp += nm - b.hpMax
      b.hpMax = nm
    }
    b.visualDirty = true
    this.auraDirty = true
    this.audio.play('upgrade')
    this.effects.push({
      kind: 'ring',
      x: (b.x + b.size / 2) * TILE, y: (b.y + b.size / 2) * TILE,
      t: 0, ttl: 0.6, r: TILE * (b.size + 1)
    })
    this.syncUi(true)
  }

  prodMultOf(b) {
    return Math.pow(UPGRADE_PROD_MULT, (b.level || 1) - 1)
  }

  demolishSelected() {
    const b = this.selected
    if (!b || b.type === 'core') return
    this.removeBuilding(b, false)
    if (b.spentCost) this.pay(Object.fromEntries(
      Object.entries(b.spentCost).map(([k, v]) => [k, v * DEMOLISH_REFUND])
    ), -1)
    this.closePanels()
  }

  repairSelected() {
    const b = this.selected
    if (!b) return
    const missing = b.hpMax - b.hp
    if (missing <= 0) return
    const discount = 1 - Math.min(0.5, (this.toolTiers.hammer - 1) * HAMMER_REPAIR_DISCOUNT)
    const cost = Math.ceil(missing * REPAIR_COST_PER_HP * discount)
    if (this.res.wood < cost) {
      this.cb.toast(`Repair needs ${cost} wood`)
      return
    }
    this.res.wood -= cost
    b.hp = b.hpMax
    this.audio.play('build')
    this.syncUi(true)
  }

  removeBuilding(b, violent) {
    const idx = this.buildings.indexOf(b)
    if (idx < 0) return
    this.buildings.splice(idx, 1)
    for (let dy = 0; dy < b.size; dy++) {
      for (let dx = 0; dx < b.size; dx++) {
        this.buildingAt[(b.y + dy) * GRID_W + (b.x + dx)] = -1
      }
    }
    this.flowDirty = true
    this.auraDirty = true
    if (this.selected === b) { this.selected = null; this.panelOpen = false }
    if (violent) {
      const cx = (b.x + b.size / 2) * TILE, cy = (b.y + b.size / 2) * TILE
      this.effects.push({ kind: 'boom', x: cx, y: cy, t: 0, ttl: 0.5, r: TILE * b.size })
      this.audio.play('crumble')
      if (b.def.isWall && this.mods.boomWalls) {
        this.areaDamage(b.x + 0.5, b.y + 0.5, 2, this.mods.boomWalls)
        this.effects.push({ kind: 'boom', x: cx, y: cy, t: 0, ttl: 0.6, r: TILE * 2.4 })
      }
      if (b.type === 'core') this.finish(false)
    }
  }

  // ---------------------------------------------------------------- forge

  toolResearchState(toolId) {
    const cur = this.toolTiers[toolId]
    const next = cur + 1
    if (next > MAX_TOOL_TIER) return { cur, next: null }
    const forge = this.buildings.find(b => b.type === 'forge')
    const forgeLevel = forge ? forge.level : 0
    return {
      cur,
      next,
      name: TOOL_TIER_NAMES[next],
      cost: TOOL_TIER_COSTS[next],
      needsForge: FORGE_REQ[next],
      forgeLevel,
      locked: forgeLevel < FORGE_REQ[next]
    }
  }

  researchTool(toolId) {
    const st = this.toolResearchState(toolId)
    if (!st.next) return
    if (st.locked) {
      this.cb.toast(`Needs Forge level ${st.needsForge}`)
      this.audio.play('deny')
      return
    }
    if (!this.canAfford(st.cost)) {
      this.cb.toast('Not enough resources')
      this.audio.play('deny')
      return
    }
    this.pay(st.cost)
    this.toolTiers[toolId] = st.next
    this.audio.play('upgrade')
    this.cb.toast(`${TOOL_TIER_NAMES[st.next]} ${toolId === 'pick' ? 'pickaxe' : toolId} forged — everyone re-equips`)
    this.syncUi(true)
  }

  // ---------------------------------------------------------------- phases

  callNight() {
    if (this.phase !== 'day') return
    this.res.knowledge += 4
    this.cb.toast('+4 knowledge for bravery')
    this.startNight()
  }

  startNight() {
    this.phase = 'night'
    this.phaseT = 0
    this.audio.play('horn')
    const comp = WAVES[this.wave - 1]
    const hpScale = WAVE_HP_SCALE(this.wave)
    // 2-3 spawn clusters on the mist ring
    const nGroups = this.wave < 4 ? 1 : this.wave < 8 ? 2 : 3
    const groups = []
    for (let g = 0; g < nGroups; g++) groups.push(this.randomSpawnPoint())
    this.spawnQueue = []
    let t = 1.5
    for (const [type, n] of Object.entries(comp)) {
      const def = ENEMIES[type]
      for (let i = 0; i < n; i++) {
        const g = groups[i % groups.length]
        this.spawnQueue.push({
          type, hpScale, t: t + i * (def.boss ? 0 : 0.55) + Math.random() * 0.4,
          x: g.x + (Math.random() - 0.5) * 3, y: g.y + (Math.random() - 0.5) * 3
        })
      }
      t += 2
    }
    this.spawnQueue.sort((a, b) => a.t - b.t)
    this.nightT = 0
    this.syncUi(true)
  }

  randomSpawnPoint() {
    const ang = Math.random() * Math.PI * 2
    return {
      x: GRID_W / 2 + Math.cos(ang) * SPAWN_RADIUS,
      y: GRID_H / 2 + Math.sin(ang) * SPAWN_RADIUS
    }
  }

  endWave() {
    this.stats.wavesCleared++
    this.audio.play('victory')
    // post-wave repair
    if (this.mods.postWaveRepair) {
      for (const b of this.buildings) {
        b.hp = Math.min(b.hpMax, b.hp + (b.hpMax - b.hp) * this.mods.postWaveRepair)
      }
    }
    // wave bounty
    this.res.wood += 10 + this.wave * 2
    this.res.stone += 5 + this.wave
    if (this.wave >= WAVES.length) {
      this.finish(true)
      return
    }
    this.phase = 'choice'
    this.rollOffers()
    this.cb.offerUpgrades(this.offers)
    this.syncUi(true)
  }

  rollOffers() {
    const pool = UPGRADES.filter(u =>
      !this.picked.includes(u.id) && (u.era === undefined || this.era >= u.era)
    )
    const offers = []
    while (offers.length < 3 && pool.length) {
      const i = Math.floor(Math.random() * pool.length)
      offers.push(pool.splice(i, 1)[0])
    }
    this.offers = offers
  }

  rerollOffers() {
    if (this.res.knowledge < REROLL_COST) return
    this.res.knowledge -= REROLL_COST
    this.rollOffers()
    this.cb.offerUpgrades(this.offers)
    this.syncUi(true)
  }

  chooseUpgrade(id) {
    const u = this.offers.find(o => o.id === id)
    if (!u || this.phase !== 'choice') return
    this.picked.push(u.id)
    for (const [k, v] of Object.entries(u.mods)) this.mods[k] += v
    if (u.mods.wallHpMult) {
      for (const b of this.buildings) {
        if (b.def.isWall) {
          const nm = Math.round(ERAS[this.era].wallHp * (1 + this.mods.wallHpMult))
          b.hp += nm - b.hpMax
          b.hpMax = nm
        }
      }
    }
    this.audio.play('upgrade')
    const clearedWave = this.wave
    this.wave++
    this.phase = 'day'
    this.phaseT = PREP_TIME
    if (clearedWave === 4 || clearedWave === 8) this.advanceEra()
    this.syncUi(true)
  }

  advanceEra() {
    this.era++
    const era = ERAS[this.era]
    this.eraFlash = 1.6
    // civilisation leap: full heal, wall upgrade, gifts
    for (const b of this.buildings) {
      if (b.def.isWall) {
        b.hpMax = Math.round(era.wallHp * (1 + this.mods.wallHpMult))
      }
      b.hp = b.hpMax
    }
    this.core.hpMax += 600
    this.core.hp = this.core.hpMax
    this.res.wood += 40
    this.res.stone += 30
    if (this.era === 2) this.res.energy += 10
    this.audio.play('era')
    this.cb.eraAdvance(era)
    this.syncUi(true)
  }

  rally() {
    if (this.phase !== 'night' || this.rallyCd > 0) return
    if (!this.canAfford(RALLY.cost)) {
      this.cb.toast('Rally needs 15 food')
      return
    }
    this.pay(RALLY.cost)
    this.rallyT = RALLY.duration
    this.rallyCd = RALLY.cooldown
    this.audio.play('horn')
    this.cb.toast('Rally! Towers fire faster')
  }

  finish(win) {
    if (this.phase === 'over') return
    this.phase = 'over'
    this.placing = null
    const mins = Math.round((Date.now() - this.stats.started) / 6000) / 10
    this.cb.gameOver(win, {
      kills: this.stats.kills,
      waves: this.stats.wavesCleared,
      built: this.stats.built,
      era: ERAS[this.era].name,
      minutes: mins,
      upgrades: this.picked.length
    })
    this.audio.play(win ? 'era' : 'defeat')
    this.syncUi(true)
  }

  // ---------------------------------------------------------------- simulation

  frame = (now) => {
    if (this.destroyed) return
    const dt = Math.min(0.05, (now - this.lastT) / 1000)
    this.lastT = now
    if (!this.paused && this.phase !== 'over') this.tick(dt)
    if (this.eraFlash > 0) this.eraFlash -= dt
    this.view.update(dt)
    this.syncUi()
    this.raf = requestAnimationFrame(this.frame)
  }

  tick(dt) {
    this.time += dt
    if (this.flowDirty) this.recomputeFlow()
    if (this.auraDirty) this.recomputeAuras()
    this.updateCommander(dt)
    this.updateEconomy(dt)
    if (this.phase === 'day') {
      this.phaseT -= dt
      if (this.phaseT <= 0) this.startNight()
    } else if (this.phase === 'night') {
      this.nightT += dt
      this.updateSpawns()
      if (this.spawnQueue.length === 0 && this.enemies.length === 0 && this.nightT > 3) {
        this.endWave()
      }
    }
    this.updateEnemies(dt)
    this.updateVillagers(dt)
    this.updateUnits(dt)
    this.updateTowers(dt)
    this.updateProjectiles(dt)
    if (this.rallyT > 0) this.rallyT -= dt
    if (this.rallyCd > 0) this.rallyCd -= dt
    this.rosterT += dt
    if (this.rosterT > 0.5) {
      this.rosterT = 0
      this.syncRoster()
    }
    // effects age
    for (let i = this.effects.length - 1; i >= 0; i--) {
      const fx = this.effects[i]
      fx.t += dt
      if (fx.t > fx.ttl) this.effects.splice(i, 1)
    }
  }

  updateCommander(dt) {
    const c = this.commander
    // jump physics (jumpY rides on top of terrain height 0)
    if (!c.grounded || c.jumpY > 0) {
      c.vy -= JUMP.gravity * dt
      c.jumpY += c.vy * dt
      if (c.jumpY <= 0) {
        c.jumpY = 0
        c.vy = 0
        c.grounded = true
      }
    }
    if (c.downT > 0) {
      c.downT -= dt
      if (c.downT <= 0) {
        c.hp = c.hpMax * 0.5
        c.x = GRID_W / 2
        c.y = GRID_H / 2 + 3
        this.cb.toast('You wake at the Beacon, patched up')
      }
    } else {
      // slow regen by day, trickle at night
      c.hp = Math.min(c.hpMax, c.hp + (this.phase === 'day' ? 2.5 : 0.6) * dt)
    }
  }

  jump() {
    const c = this.commander
    if (c.grounded && c.downT <= 0) {
      c.grounded = false
      c.vy = JUMP.velocity
      c.jumpY = Math.max(c.jumpY, 0.001)
    }
  }

  hurtCommander(dmg) {
    const c = this.commander
    if (c.downT > 0) return
    c.hp -= dmg
    c.lastHit = this.time
    if (c.hp <= 0) {
      c.hp = 0
      c.downT = 6
      this.cb.toast('You are knocked out — the militia drags you home')
      this.audio.play('crumble')
    }
  }

  recomputeFlow() {
    const cost = new Float32Array(GRID_W * GRID_H).fill(1)
    const byUid = new Map(this.buildings.map(b => [b.uid, b]))
    for (let i = 0; i < cost.length; i++) {
      if (this.nodeKind[i] !== NODE_KIND.none && this.nodeAmount[i] > 0) cost[i] = 2.6
      const uidAt = this.buildingAt[i]
      if (uidAt >= 0) {
        const b = byUid.get(uidAt)
        if (b) cost[i] = b.def.isWall ? 42 : 16
      }
    }
    const goals = []
    for (let dy = 0; dy < this.core.size; dy++) {
      for (let dx = 0; dx < this.core.size; dx++) {
        goals.push([this.core.x + dx, this.core.y + dy])
      }
    }
    this.flow = computeFlowField(cost, goals)
    this.flowDirty = false
  }

  recomputeAuras() {
    for (const b of this.buildings) b.prodBonus = 0
    for (const m of this.buildings) {
      if (!m.def.aura) continue
      const bonus = m.def.aura.prodBonus + (m.def.auraPerLevel || 0) * ((m.level || 1) - 1)
      for (const b of this.buildings) {
        if (b === m || !b.def.produces) continue
        const d = Math.hypot(b.x - m.x, b.y - m.y)
        if (d <= m.def.aura.radius) b.prodBonus = Math.max(b.prodBonus, bonus)
      }
    }
    // logistics: +8% production for buildings touching a road
    for (const b of this.buildings) {
      if (!b.def.produces) continue
      let onRoad = false
      for (let dy = -1; dy <= b.size && !onRoad; dy++) {
        for (let dx = -1; dx <= b.size && !onRoad; dx++) {
          const x = b.x + dx, y = b.y + dy
          if (x < 0 || y < 0 || x >= GRID_W || y >= GRID_H) continue
          if (this.roadAt[y * GRID_W + x] === 1) onRoad = true
        }
      }
      if (onRoad) b.prodBonus += 0.08
    }
    this.auraDirty = false
  }

  updateEconomy(dt) {
    // population capacity from houses + core
    let popCap = 0
    for (const b of this.buildings) {
      if (!b.def.popCap) continue
      popCap += b.def.popCap + (b.def.popCapPerLevel || 0) * ((b.level || 1) - 1)
    }
    this.popCap = popCap
    this.pop = this.villagers.length + this.units.length

    const starving = this.res.food <= 0
    const prodMult = (1 + this.mods.prodMult) * (starving ? 0.5 : 1)

    for (const b of this.buildings) {
      b.active = true
      if (!b.def.produces) continue
      // farms need a farmer standing in them
      if (b.type === 'farm') {
        if (!(b.staffed > 0)) { b.active = false; continue }
      }
      // node-fed buildings drain their node
      if (b.def.needsNode) {
        const ni = this.adjacentNode(b.x, b.y, NODE_KIND[b.def.needsNode])
        if (ni < 0) { b.active = false; continue }
        const drain = 0.5 * dt
        this.nodeAmount[ni] = Math.max(0, this.nodeAmount[ni] - drain)
        if (this.nodeAmount[ni] <= 0) {
          this.flowDirty = true
          this.markNodeDirty(ni)
        }
      }
      const lvlMult = this.prodMultOf(b)
      for (const [k, v] of Object.entries(b.def.produces)) {
        let rate = v * lvlMult * prodMult * (1 + b.prodBonus)
        if (k === 'energy') rate *= 1 + this.mods.energyMult
        if (k === 'food' && b.type === 'farm') {
          rate *= Math.min(1, b.staffed)
          if (starving) rate = v * lvlMult * Math.min(1, b.staffed) // farms never halted
        }
        this.res[k] += rate * dt
      }
    }

    // eating + growth
    this.res.food = Math.max(0, this.res.food - this.pop * VILLAGER.foodUpkeep * dt)
    this.growthT += dt
    if (this.growthT > 7) {
      this.growthT = 0
      if (this.res.food > 5 && this.pop < this.popCap) {
        this.spawnVillager()
        this.cb.toast(`${this.villagers[this.villagers.length - 1].name} joins the settlement`)
      } else if (starving && this.villagers.length > 1) {
        const v = this.villagers.pop()
        this.cb.toast(`${v.name} starved — grow more food`)
      }
    }
    if (this.mods.passiveKnowledge) this.res.knowledge += this.mods.passiveKnowledge * dt

    // wall regen + repair drone
    if (this.mods.wallRegen) {
      for (const b of this.buildings) {
        if (b.def.isWall && b.hp < b.hpMax) b.hp = Math.min(b.hpMax, b.hp + this.mods.wallRegen * dt)
      }
    }
    if (this.mods.repairDrone) {
      let worst = null
      for (const b of this.buildings) {
        if (b.hp < b.hpMax && (!worst || b.hp / b.hpMax < worst.hp / worst.hpMax)) worst = b
      }
      if (worst) worst.hp = Math.min(worst.hpMax, worst.hp + this.mods.repairDrone * dt)
    }
    this.res.energy = Math.min(this.res.energy, 60)
  }

  // ---------------------------------------------------------------- villagers

  spawnVillager() {
    const ang = Math.random() * Math.PI * 2
    const v = {
      uid: uid++,
      name: NAMES[Math.floor(Math.random() * NAMES.length)],
      x: GRID_W / 2 + Math.cos(ang) * 3.2,
      y: GRID_H / 2 + Math.sin(ang) * 3.2,
      hp: VILLAGER.hp, hpMax: VILLAGER.hp,
      job: 'idle', state: 'idle', carry: 0, carryKind: null,
      nodeI: -1, workAt: 0, chopT: 0, trainT: 0,
      wobble: Math.random() * 6, moving: false, fleeing: false,
      wanderT: 0, wx: 0, wy: 0, stuckT: 0
    }
    this.villagers.push(v)
    return v
  }

  setJob(vUid, job) {
    const v = this.villagers.find(x => x.uid === vUid)
    if (!v) return
    if (job === 'train') {
      const cap = this.soldierCapacity()
      const inTraining = this.villagers.filter(x => x.job === 'train').length
      if (!this.buildings.some(b => b.type === 'barracks')) {
        this.cb.toast('Build a barracks first')
        return
      }
      if (this.units.length + inTraining >= cap) {
        this.cb.toast(`Barracks full (${cap} soldiers) — upgrade or build another`)
        return
      }
    }
    if (job === 'farm' && !this.buildings.some(b => b.type === 'farm')) {
      this.cb.toast('Build a farm first')
      return
    }
    v.job = job
    v.state = 'seek'
    v.nodeI = -1
    v.workAt = 0
    v.chopT = 0
    v.trainT = 0
    this.syncRoster()
  }

  setAllJobs(job) {
    for (const v of this.villagers) {
      if (v.job !== job) this.setJob(v.uid, job)
    }
  }

  soldierCapacity() {
    let cap = 0
    for (const b of this.buildings) {
      if (b.def.trains) cap += b.def.trains + (b.def.trainsPerLevel || 0) * ((b.level || 1) - 1)
    }
    return cap
  }

  /** Nearest harvestable node of `kind` for tool tier `maxTier`. */
  findNode(v, kind, maxTier) {
    const vx = v.x, vy = v.y
    let best = -1, bd = Infinity
    // spiral out from the villager in rings to avoid scanning the whole map
    const cx = Math.floor(vx), cy = Math.floor(vy)
    for (let r = 1; r < 46; r++) {
      const x0 = Math.max(1, cx - r), x1 = Math.min(GRID_W - 2, cx + r)
      const y0 = Math.max(1, cy - r), y1 = Math.min(GRID_H - 2, cy + r)
      for (let y = y0; y <= y1; y++) {
        const onYEdge = (y === y0 || y === y1)
        for (let x = x0; x <= x1; x += onYEdge ? 1 : (x1 - x0 || 1)) {
          const i = y * GRID_W + x
          if (this.nodeKind[i] !== kind || this.nodeAmount[i] <= 0) continue
          if (this.nodeTier[i] > maxTier) continue
          const claim = this.nodeClaims.get(i) || 0
          if (claim >= 2) continue
          const d = Math.hypot(x + 0.5 - vx, y + 0.5 - vy) + claim * 3
          if (d < bd) { bd = d; best = i }
        }
      }
      if (best >= 0 && r > Math.ceil(bd) + 2) break
    }
    return best
  }

  /** Nearest resource drop-off for a carry kind. */
  findDepot(v, kind) {
    let best = this.core, bd = Math.hypot(this.core.x + 1.5 - v.x, this.core.y + 1.5 - v.y)
    for (const b of this.buildings) {
      if (b.def.depot !== kind) continue
      const d = Math.hypot(b.x + b.size / 2 - v.x, b.y + b.size / 2 - v.y)
      if (d < bd) { bd = d; best = b }
    }
    return best
  }

  /** Walk toward (gx, gy); returns remaining distance. Slides on obstacles. */
  walkTo(ent, gx, gy, speed, dt) {
    const dx = gx - ent.x, dy = gy - ent.y
    const d = Math.hypot(dx, dy)
    if (d < 0.01) return 0
    const px = ent.x, py = ent.y
    this.moveCircle(ent, (dx / d) * speed * dt, (dy / d) * speed * dt, 0.26)
    ent.moving = true
    // unstick: if barely moving, sidestep
    const progress = Math.hypot(ent.x - px, ent.y - py)
    if (progress < speed * dt * 0.25) {
      ent.stuckT = (ent.stuckT || 0) + dt
      if (ent.stuckT > 0.4) {
        const side = ((ent.uid % 2) === 0 ? 1 : -1) * (ent.stuckT > 1.2 ? -1 : 1)
        this.moveCircle(ent, (-dy / d) * speed * dt * side, (dx / d) * speed * dt * side, 0.26)
        if (ent.stuckT > 2.0) ent.stuckT = 0
      }
    } else {
      ent.stuckT = 0
    }
    return Math.hypot(gx - ent.x, gy - ent.y)
  }

  updateVillagers(dt) {
    this.nodeClaims = this.nodeClaims || new Map()
    const claims = new Map()
    for (const v of this.villagers) {
      if (v.nodeI >= 0) claims.set(v.nodeI, (claims.get(v.nodeI) || 0) + 1)
    }
    this.nodeClaims = claims

    // reset farm staffing each tick; farmers standing in a farm re-add
    for (const b of this.buildings) if (b.type === 'farm') b.staffed = 0

    const coreX = this.core.x + this.core.size / 2
    const coreY = this.core.y + this.core.size / 2

    for (let idx = this.villagers.length - 1; idx >= 0; idx--) {
      const v = this.villagers[idx]
      v.wobble += dt * 7
      v.moving = false
      if (v.hp <= 0) {
        this.villagers.splice(idx, 1)
        this.effects.push({ kind: 'pop', x: v.x * TILE, y: v.y * TILE, t: 0, ttl: 0.4, r: TILE * 0.6, color: '#e8c49a' })
        this.cb.toast(`${v.name} was slain`)
        continue
      }

      // flee from nearby enemies (except soldiers-in-training already at barracks)
      if (this.enemies.length && v.job !== 'train') {
        let danger = null, dd = VILLAGER.fleeRadius
        for (const e of this.enemies) {
          const d = Math.hypot(e.x - v.x, e.y - v.y)
          if (d < dd) { dd = d; danger = e }
        }
        if (danger) {
          v.fleeing = true
          this.walkTo(v, coreX, coreY, VILLAGER.speed * 1.35, dt)
          continue
        }
      }
      v.fleeing = false

      switch (v.job) {
        case 'idle': {
          v.wanderT -= dt
          if (v.wanderT <= 0) {
            v.wanderT = 2 + Math.random() * 3
            const ang = Math.random() * Math.PI * 2
            v.wx = coreX + Math.cos(ang) * (2 + Math.random() * 4)
            v.wy = coreY + Math.sin(ang) * (2 + Math.random() * 4)
          }
          if (Math.hypot(v.wx - v.x, v.wy - v.y) > 0.5) {
            this.walkTo(v, v.wx, v.wy, VILLAGER.speed * 0.55, dt)
          }
          break
        }
        case 'wood':
        case 'mine': {
          const kind = v.job === 'wood' ? NODE_KIND.tree : NODE_KIND.rock
          const tiers = v.job === 'wood' ? TREE_TIERS : ROCK_TIERS
          const toolTier = v.job === 'wood' ? this.toolTiers.axe : this.toolTiers.pick
          const resKind = v.job === 'wood' ? 'wood' : 'stone'
          if (v.carry >= VILLAGER.carry) {
            // haul to depot
            const depot = this.findDepot(v, resKind)
            const gx = depot.x + depot.size / 2, gy = depot.y + depot.size / 2
            const d = this.walkTo(v, gx, gy, VILLAGER.speed, dt)
            if (d < depot.size / 2 + 0.9) {
              this.res[resKind] += v.carry
              this.effects.push({ kind: 'ring', x: gx * TILE, y: gy * TILE, t: 0, ttl: 0.3, r: TILE * 0.8 })
              v.carry = 0
            }
            break
          }
          if (v.nodeI < 0 || this.nodeAmount[v.nodeI] <= 0 || this.nodeTier[v.nodeI] > toolTier) {
            v.nodeI = this.findNode(v, kind, toolTier)
            v.chopT = 0
            if (v.nodeI < 0) {
              // nothing harvestable — deposit what we hold, else idle near core
              if (v.carry > 0) { v.carry = VILLAGER.carry } // trigger haul next tick
              else this.walkTo(v, coreX, coreY, VILLAGER.speed * 0.5, dt)
              break
            }
          }
          const nx = (v.nodeI % GRID_W) + 0.5
          const ny = Math.floor(v.nodeI / GRID_W) + 0.5
          const d = Math.hypot(nx - v.x, ny - v.y)
          if (d > 1.25) {
            this.walkTo(v, nx, ny, VILLAGER.speed, dt)
          } else {
            v.chopT += dt
            v.working = this.time // drives the swing animation
            if (v.chopT >= VILLAGER.chopTime) {
              v.chopT = 0
              const tier = this.nodeTier[v.nodeI]
              const spec = tiers[tier - 1]
              const yieldAmt = spec.yield * (1 + 0.15 * (toolTier - tier))
              const take = Math.min(yieldAmt, this.nodeAmount[v.nodeI], VILLAGER.carry - v.carry + yieldAmt)
              v.carry += Math.min(take, yieldAmt)
              this.nodeAmount[v.nodeI] -= yieldAmt
              this.audio.play(v.job === 'wood' ? 'chop' : 'mine', 0.4)
              if (this.nodeAmount[v.nodeI] <= 0) {
                this.nodeAmount[v.nodeI] = 0
                this.markNodeDirty(v.nodeI)
                this.flowDirty = true
                v.nodeI = -1
              }
            }
          }
          break
        }
        case 'farm': {
          let farm = v.workAt ? this.buildingByUid(v.workAt) : null
          if (!farm || farm.type !== 'farm') {
            // claim the nearest unstaffed farm
            let best = null, bd = Infinity
            const claimed = new Set(this.villagers.filter(o => o !== v && o.job === 'farm').map(o => o.workAt))
            for (const b of this.buildings) {
              if (b.type !== 'farm' || claimed.has(b.uid)) continue
              const d = Math.hypot(b.x + 1 - v.x, b.y + 1 - v.y)
              if (d < bd) { bd = d; best = b }
            }
            if (!best) {
              this.walkTo(v, coreX, coreY, VILLAGER.speed * 0.5, dt)
              break
            }
            v.workAt = best.uid
            farm = best
          }
          const gx = farm.x + farm.size / 2, gy = farm.y + farm.size + 0.4
          const d = Math.hypot(gx - v.x, gy - v.y)
          if (d > 0.5) this.walkTo(v, gx, gy, VILLAGER.speed, dt)
          else {
            farm.staffed = (farm.staffed || 0) + 1
            v.working = this.time
          }
          break
        }
        case 'train': {
          let barracks = v.workAt ? this.buildingByUid(v.workAt) : null
          if (!barracks || !barracks.def.trains) {
            let best = null, bd = Infinity
            for (const b of this.buildings) {
              if (!b.def.trains) continue
              const d = Math.hypot(b.x + 1 - v.x, b.y + 1 - v.y)
              if (d < bd) { bd = d; best = b }
            }
            if (!best) { v.job = 'idle'; break }
            v.workAt = best.uid
            barracks = best
          }
          const gx = barracks.x + barracks.size / 2, gy = barracks.y + barracks.size + 0.5
          const d = Math.hypot(gx - v.x, gy - v.y)
          if (d > 0.7) {
            this.walkTo(v, gx, gy, VILLAGER.speed, dt)
            break
          }
          v.trainT += dt
          v.working = this.time
          if (v.trainT >= SOLDIER.trainTime) {
            if (!this.canAfford(SOLDIER.cost)) { v.trainT = SOLDIER.trainTime; break }
            this.pay(SOLDIER.cost)
            this.villagers.splice(idx, 1)
            const barracksLvl = barracks.level || 1
            const hp = Math.round(SOLDIER.hp * (1 + SOLDIER.hpPerBarracksLevel * (barracksLvl - 1)))
            this.units.push({
              uid: uid++, name: v.name, home: barracks.uid, slot: this.unitSlot++,
              x: gx + (Math.random() - 0.5), y: gy + 0.4,
              hp, hpMax: hp, mode: 'guard',
              cooldown: 0, target: null, wobble: Math.random() * 6
            })
            this.effects.push({ kind: 'ring', x: gx * TILE, y: gy * TILE, t: 0, ttl: 0.4, r: TILE })
            this.cb.toast(`${v.name} enlisted as a soldier`)
            this.audio.play('upgrade')
            this.syncRoster()
          }
          break
        }
      }
      v.x = Math.max(0.5, Math.min(GRID_W - 0.5, v.x))
      v.y = Math.max(0.5, Math.min(GRID_H - 0.5, v.y))
    }
  }

  // ---------------------------------------------------------------- soldiers

  setSoldierMode(uidS, mode) {
    const u = this.units.find(x => x.uid === uidS)
    if (u) u.mode = mode
    this.syncRoster()
  }

  soldierStats() {
    const t = this.toolTiers.sword
    return {
      dmg: SOLDIER.dmg * (1 + SOLDIER.dmgPerSwordTier * (t - 1)),
      rate: SOLDIER.rate,
      range: SOLDIER.range,
      speed: SOLDIER.speed
    }
  }

  updateUnits(dt) {
    const st = this.soldierStats()
    const coreX = this.core.x + this.core.size / 2
    const coreY = this.core.y + this.core.size / 2
    for (let i = this.units.length - 1; i >= 0; i--) {
      const u = this.units[i]
      if (u.hp <= 0) {
        this.units.splice(i, 1)
        this.effects.push({ kind: 'pop', x: u.x * TILE, y: u.y * TILE, t: 0, ttl: 0.4, r: TILE * 0.6, color: '#7fd8e8' })
        this.cb.toast(`Soldier ${u.name || ''} has fallen`)
        continue
      }
      u.wobble += dt * 7
      u.cooldown -= dt
      const anchor = u.mode === 'follow'
        ? this.commander
        : (this.banner || { x: coreX, y: coreY })
      // acquire target: enemies threatening the anchor zone, or right next to the unit
      if (u.target && (u.target.hp <= 0 || !this.enemySet.has(u.target))) u.target = null
      if (!u.target) {
        let best = null, bd = Infinity
        for (const e of this.enemies) {
          if (e.def.flying) continue
          const dAnchor = Math.hypot(e.x - anchor.x, e.y - anchor.y)
          const dSelf = Math.hypot(e.x - u.x, e.y - u.y)
          const d = Math.min(dAnchor, dSelf)
          if ((dAnchor < SOLDIER.aggro || dSelf < 3.5) && d < bd) { bd = d; best = e }
        }
        u.target = best
      }
      if (u.target) {
        const d = Math.hypot(u.target.x - u.x, u.target.y - u.y)
        if (d > st.range) {
          this.moveCircle(u, ((u.target.x - u.x) / d) * st.speed * dt,
            ((u.target.y - u.y) / d) * st.speed * dt, 0.26)
          u.moving = true
        } else {
          u.moving = false
          if (u.cooldown <= 0) {
            u.cooldown = 1 / st.rate
            this.damageEnemy(u.target, st.dmg)
            u.struck = this.time
            this.audio.play('kill', 0.5)
          }
        }
      } else {
        // formation: ring around the anchor
        let ang, rad
        if (u.mode === 'follow' && !this.banner) {
          const yaw = this.commanderYaw || 0
          const behind = Math.atan2(Math.cos(yaw), Math.sin(yaw)) + Math.PI
          ang = behind + ((u.slot % 5) - 2) * 0.55
          rad = 1.6 + (u.slot % 3) * 0.5
        } else {
          ang = u.slot * 2.4
          rad = (this.banner && u.mode !== 'follow' ? 1.1 : 3.0) + (u.slot % 5) * 0.3
        }
        const gx = anchor.x + Math.cos(ang) * rad
        const gy = anchor.y + Math.sin(ang) * rad
        const d = Math.hypot(gx - u.x, gy - u.y)
        u.moving = d > 0.35
        if (u.moving) {
          this.moveCircle(u, ((gx - u.x) / d) * st.speed * dt,
            ((gy - u.y) / d) * st.speed * dt, 0.26)
        }
      }
      u.x = Math.max(0.5, Math.min(GRID_W - 0.5, u.x))
      u.y = Math.max(0.5, Math.min(GRID_H - 0.5, u.y))
    }
  }

  toggleBanner(tx, ty) {
    if (this.banner) {
      this.banner = null
      this.cb.toast('Banner lifted — soldiers guard the Beacon')
    } else {
      this.banner = { x: tx + 0.5, y: ty + 0.5 }
      this.cb.toast('Banner planted — soldiers hold there')
      this.audio.play('horn')
    }
    this.syncUi(true)
  }

  // ---------------------------------------------------------------- enemies

  updateSpawns() {
    while (this.spawnQueue.length && this.spawnQueue[0].t <= this.nightT) {
      const s = this.spawnQueue.shift()
      this.spawnEnemy(s.type, s.x, s.y, s.hpScale)
    }
  }

  spawnEnemy(type, x, y, hpScale) {
    const def = ENEMIES[type]
    const hp = Math.round(def.hp * hpScale)
    this.enemies.push({
      uid: uid++, type, def, x, y, hp, hpMax: hp,
      cooldown: 0, minionT: 0, retargetT: 0, target: null,
      wobble: Math.random() * Math.PI * 2
    })
  }

  /** Nearest thing an enemy wants to bite: buildings, soldiers, villagers, you. */
  acquireTarget(e) {
    const sight = e.def.sight || 10
    let best = null, bd = sight
    for (const b of this.buildings) {
      const d = Math.hypot(b.x + b.size / 2 - e.x, b.y + b.size / 2 - e.y) - b.size / 2
      if (d < bd) { bd = d; best = b }
    }
    for (const u of this.units) {
      const d = Math.hypot(u.x - e.x, u.y - e.y)
      if (d < bd) { bd = d; best = u }
    }
    for (const v of this.villagers) {
      const d = Math.hypot(v.x - e.x, v.y - e.y)
      if (d < bd) { bd = d; best = v }
    }
    if (this.commander.downT <= 0) {
      const c = this.commander
      const d = Math.hypot(c.x - e.x, c.y - e.y)
      if (d < bd) { bd = d; best = c }
    }
    return best
  }

  targetAlive(t) {
    if (!t) return false
    if (t === this.commander) return t.downT <= 0
    if (t.def) return this.buildings.includes(t) && t.hp > 0 // building
    return t.hp > 0
  }

  updateEnemies(dt) {
    this.enemySet = new Set(this.enemies)
    const coreX = GRID_W / 2, coreY = GRID_H / 2
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i]
      if (e.hp <= 0) { this.killEnemy(i, e); continue }
      e.wobble += dt * 6
      e.cooldown -= dt

      if (e.def.boss && e.def.spawnMinions) {
        e.minionT += dt
        if (e.minionT > e.def.spawnMinions.every) {
          e.minionT = 0
          for (let m = 0; m < e.def.spawnMinions.n; m++) {
            this.spawnEnemy(e.def.spawnMinions.type, e.x + (Math.random() - 0.5), e.y + (Math.random() - 0.5), 1)
          }
          this.effects.push({ kind: 'ring', x: e.x * TILE, y: e.y * TILE, t: 0, ttl: 0.5, r: TILE * 2 })
        }
      }

      const targeting = e.def.targeting || 'nearest'

      if (targeting === 'core') {
        // beeline for the Beacon (flying skips everything)
        const t = this.core
        const gx = t.x + t.size / 2, gy = t.y + t.size / 2
        const d = Math.hypot(gx - e.x, gy - e.y)
        if (d < t.size / 2 + 0.6) {
          this.hitBuilding(t, e.def.dmg * dt)
        } else {
          e.x += ((gx - e.x) / d) * e.def.speed * dt
          e.y += ((gy - e.y) / d) * e.def.speed * dt
        }
        continue
      }

      // siege types stop and shell buildings in range
      if (e.def.siege) {
        const target = this.nearestBuilding(e.x, e.y, e.def.siege.range)
        if (target) {
          if (e.cooldown <= 0) {
            e.cooldown = 1 / e.def.siege.rate
            this.projectiles.push({
              kind: 'shell', x: e.x, y: e.y,
              target, dmgB: e.def.dmg, speed: 5.5, hostile: true
            })
          }
          continue
        }
      }

      if (targeting === 'nearest') {
        e.retargetT -= dt
        if (e.retargetT <= 0 || !this.targetAlive(e.target)) {
          e.retargetT = 0.6
          e.target = this.acquireTarget(e)
        }
        const t = e.target
        if (t) {
          const isBuilding = !!t.def && t.size !== undefined
          const gx = isBuilding ? t.x + t.size / 2 : t.x
          const gy = isBuilding ? t.y + t.size / 2 : t.y
          const reach = (isBuilding ? t.size / 2 : 0.3) + e.def.radius + 0.35
          const d = Math.hypot(gx - e.x, gy - e.y)
          if (d <= reach) {
            if (isBuilding) this.hitBuilding(t, e.def.dmg * dt)
            else if (t === this.commander) this.hurtCommander(e.def.dmg * dt)
            else t.hp -= e.def.dmg * dt
          } else {
            e.x += ((gx - e.x) / d) * e.def.speed * dt
            e.y += ((gy - e.y) / d) * e.def.speed * dt
          }
          continue
        }
      }

      // fall through: march on the Beacon via the flow field
      const tx = Math.max(0, Math.min(GRID_W - 1, Math.floor(e.x)))
      const ty = Math.max(0, Math.min(GRID_H - 1, Math.floor(e.y)))
      const ti = ty * GRID_W + tx
      const ni = this.flow ? this.flow.next[ti] : -1
      let gx, gy
      if (ni >= 0) {
        gx = (ni % GRID_W) + 0.5
        gy = Math.floor(ni / GRID_W) + 0.5
      } else {
        gx = coreX; gy = coreY
      }
      // building in the way? attack it
      const bUid = ni >= 0 ? this.buildingAt[ni] : this.buildingAt[ti]
      if (bUid >= 0 && Math.hypot(gx - e.x, gy - e.y) < 1.1) {
        const b = this.buildingByUid(bUid)
        if (b) {
          this.hitBuilding(b, e.def.dmg * dt)
          continue
        }
      }
      const d = Math.hypot(gx - e.x, gy - e.y) || 1
      e.x += ((gx - e.x) / d) * e.def.speed * dt
      e.y += ((gy - e.y) / d) * e.def.speed * dt
    }
  }

  nearestBuilding(x, y, range) {
    let best = null, bd = range
    for (const b of this.buildings) {
      const d = Math.hypot(b.x + b.size / 2 - x, b.y + b.size / 2 - y)
      if (d < bd) { bd = d; best = b }
    }
    return best
  }

  hitBuilding(b, dmg) {
    b.hp -= dmg
    b.lastHit = this.time
    if (b.hp <= 0) this.removeBuilding(b, true)
  }

  killEnemy(idx, e) {
    this.enemies.splice(idx, 1)
    this.stats.kills++
    const mult = 1 + this.mods.dropMult
    for (const [k, v] of Object.entries(e.def.drops)) this.res[k] += v * mult
    if (this.mods.compost) {
      for (const b of this.buildings) {
        if (b.type === 'farm' && Math.hypot(b.x - e.x, b.y - e.y) <= 3) {
          this.res.food += this.mods.compost
          break
        }
      }
    }
    this.effects.push({ kind: 'pop', x: e.x * TILE, y: e.y * TILE, t: 0, ttl: 0.35, r: TILE * e.def.radius * 2.5, color: e.def.color })
    if (e.def.boss) this.effects.push({ kind: 'boom', x: e.x * TILE, y: e.y * TILE, t: 0, ttl: 1, r: TILE * 4 })
    this.audio.play('kill')
  }

  // ---------------------------------------------------------------- tools

  setTool(id) {
    this.tool = id
    if (id === 'build') {
      this.openBuildMenu()
    } else {
      this.placing = null
      this.buildMenu = false
    }
    this.syncUi(true)
  }

  /** Called from the build menu: choose a building, close menu, start placing. */
  chooseBuilding(typeId) {
    this.tool = 'build'
    this.placing = typeId
    this.buildMenu = false
    this.syncUi(true)
  }

  cyclePlacing(dir) {
    if (this.tool !== 'build' || !this.placing) return
    const list = BUILD_ORDER.filter(t => BUILDINGS[t].era <= this.era)
    const i = Math.max(0, list.indexOf(this.placing))
    this.placing = list[(i + dir + list.length) % list.length]
    this.syncUi(true)
  }

  swordDmg() {
    return SWORD.dmg * (1 + SWORD.dmgPerTier * (this.toolTiers.sword - 1))
  }

  /** Sword strike in the facing direction (tile-space unit vector). */
  swingSword(dirX, dirY) {
    const c = this.commander
    let hit = false
    const dmg = this.swordDmg()
    for (const e of this.enemies) {
      const dx = e.x - c.x, dy = e.y - c.y
      const d = Math.hypot(dx, dy)
      if (d > SWORD.reach + e.def.radius) continue
      if (d > 0.01 && (dx * dirX + dy * dirY) / d < Math.cos(SWORD.arc)) continue
      this.damageEnemy(e, dmg)
      this.effects.push({ kind: 'pop', x: e.x * TILE, y: e.y * TILE, t: 0, ttl: 0.3, r: TILE * 0.6, color: '#ffd9a0' })
      hit = true
    }
    this.audio.play(hit ? 'swordHit' : 'swing')
    return hit
  }

  /** Manual harvest with axe/pickaxe at a node tile index. */
  chopNode(i, tool) {
    const kindN = this.nodeKind[i]
    if (kindN === NODE_KIND.none || this.nodeAmount[i] <= 0) return false
    const kind = ['none', 'tree', 'rock', 'crystal'][kindN]
    if (tool === 'axe' && kind !== 'tree') return false
    if (tool === 'pick' && kind === 'tree') return false
    const tier = this.nodeTier[i] || 1
    const toolTier = tool === 'axe' ? this.toolTiers.axe : this.toolTiers.pick
    if (kind === 'crystal') {
      if (toolTier < CRYSTAL.minTool) {
        this.cb.toast(`Crystal needs a tier ${CRYSTAL.minTool}+ pickaxe — visit the Forge`)
        this.audio.play('deny')
        return false
      }
    } else if (tier > toolTier) {
      const spec = (kind === 'tree' ? TREE_TIERS : ROCK_TIERS)[tier - 1]
      this.cb.toast(`${spec.name} needs a tier ${tier}+ ${tool === 'axe' ? 'axe' : 'pickaxe'} — visit the Forge`)
      this.audio.play('deny')
      return false
    }
    let yieldAmt, resKind
    if (kind === 'crystal') {
      yieldAmt = CRYSTAL.yield
      resKind = 'energy'
    } else {
      const spec = (kind === 'tree' ? TREE_TIERS : ROCK_TIERS)[tier - 1]
      yieldAmt = Math.round(spec.yield * (1 + 0.15 * (toolTier - tier)) * 1.5) // you chop harder than villagers
      resKind = kind === 'tree' ? 'wood' : 'stone'
    }
    this.res[resKind] += yieldAmt
    this.nodeAmount[i] = Math.max(0, this.nodeAmount[i] - yieldAmt)
    if (this.nodeAmount[i] <= 0) {
      this.markNodeDirty(i)
      this.flowDirty = true
    }
    const x = (i % GRID_W) + 0.5, y = ((i / GRID_W) | 0) + 0.5
    this.effects.push({
      kind: 'pop', x: x * TILE, y: y * TILE, t: 0, ttl: 0.4, r: TILE * 0.7,
      color: kind === 'tree' ? '#8a6b43' : kind === 'rock' ? '#9a9ba1' : '#5ee6ff'
    })
    this.audio.play(kind === 'tree' ? 'chop' : 'mine')
    return true
  }

  // ---------------------------------------------------------------- collision

  isBlockedTile(tx, ty) {
    if (tx < 0 || ty < 0 || tx >= GRID_W || ty >= GRID_H) return true
    const i = ty * GRID_W + tx
    if (this.buildingAt[i] >= 0) return true
    return this.nodeKind[i] !== NODE_KIND.none && this.nodeAmount[i] > 0
  }

  /** Circle-vs-tile collision with axis-separated sliding. Mutates ent.x/y. */
  moveCircle(ent, dx, dy, r = 0.3) {
    const clear = (x, y) => {
      for (const [cx, cy] of [[-r, -r], [r, -r], [-r, r], [r, r]]) {
        if (this.isBlockedTile(Math.floor(x + cx), Math.floor(y + cy))) return false
      }
      return true
    }
    const nx = ent.x + dx
    if (clear(nx, ent.y)) ent.x = nx
    const ny = ent.y + dy
    if (clear(ent.x, ny)) ent.y = ny
  }

  // ---------------------------------------------------------------- towers

  towerStats(b) {
    const t = b.def.tower
    const lvl = (b.level || 1) - 1
    let dmg = t.dmg * (1 + this.mods.towerDmg) * Math.pow(UPGRADE_TOWER_DMG_MULT, lvl)
    if (this.mods.fortressDoctrine && this.isNextToWall(b)) dmg *= 1 + this.mods.fortressDoctrine
    let rate = t.rate * (this.rallyT > 0 ? 1 + RALLY.rateBonus : 1)
    const range = t.range + this.mods.towerRange + UPGRADE_TOWER_RANGE_ADD * lvl
    let splash = (t.splash || 0) * (1 + this.mods.splashMult)
    let chain = (t.chain || 0) + (t.kind === 'tesla' ? this.mods.teslaChain : 0)
    return { dmg, rate, range, splash, chain, kind: t.kind, energyPerShot: t.energyPerShot || 0 }
  }

  isNextToWall(b) {
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const x = b.x + dx, y = b.y + dy
        if (x < 0 || y < 0 || x >= GRID_W || y >= GRID_H) continue
        const u = this.buildingAt[y * GRID_W + x]
        if (u >= 0 && u !== b.uid) {
          const o = this.buildingByUid(u)
          if (o && o.def.isWall) return true
        }
      }
    }
    return false
  }

  updateTowers(dt) {
    if (!this.enemies.length) return
    for (const b of this.buildings) {
      const isHouseGun = this.mods.armedHouses && b.type === 'house'
      if (!b.def.tower && !isHouseGun) continue
      b.cooldown -= dt
      if (b.cooldown > 0) continue
      const st = b.def.tower
        ? this.towerStats(b)
        : { dmg: 3, rate: 0.8, range: 2.6, splash: 0, chain: 0, kind: 'rock', energyPerShot: 0 }
      const cx = b.x + b.size / 2, cy = b.y + b.size / 2
      const target = this.nearestEnemy(cx, cy, st.range)
      if (!target) continue
      if (st.energyPerShot && this.res.energy < st.energyPerShot) { b.starved = true; continue }
      b.starved = false
      b.cooldown = 1 / st.rate
      b.aim = Math.atan2(target.y - cy, target.x - cx)
      if (st.kind === 'tesla') {
        this.res.energy -= st.energyPerShot
        this.fireTesla(cx, cy, target, st)
      } else if (st.kind === 'cannon') {
        this.projectiles.push({ kind: 'cannon', x: cx, y: cy, tx: target.x, ty: target.y, speed: 9, dmg: st.dmg, splash: st.splash })
        this.audio.play('cannon')
      } else {
        const shots = st.kind === 'arrow' ? 1 + this.mods.arrowMulti : 1
        for (let s = 0; s < shots; s++) {
          this.projectiles.push({
            kind: st.kind === 'rock' ? 'rock' : 'arrow',
            x: cx + (Math.random() - 0.5) * 0.2, y: cy + (Math.random() - 0.5) * 0.2,
            target, speed: 13, dmg: st.dmg
          })
        }
        this.audio.play('arrow')
      }
    }
  }

  nearestEnemy(x, y, range) {
    let best = null, bd = range
    for (const e of this.enemies) {
      const d = Math.hypot(e.x - x, e.y - y)
      if (d < bd) { bd = d; best = e }
    }
    return best
  }

  fireTesla(cx, cy, first, st) {
    const pts = [[cx, cy]]
    const hitSet = new Set()
    let cur = first
    let dmg = st.dmg
    for (let hop = 0; hop <= st.chain && cur; hop++) {
      pts.push([cur.x, cur.y])
      this.damageEnemy(cur, dmg)
      hitSet.add(cur.uid)
      dmg *= 0.8
      let nxt = null, bd = 3
      for (const e of this.enemies) {
        if (hitSet.has(e.uid) || e.hp <= 0) continue
        const d = Math.hypot(e.x - cur.x, e.y - cur.y)
        if (d < bd) { bd = d; nxt = e }
      }
      cur = nxt
    }
    this.effects.push({ kind: 'lightning', pts, t: 0, ttl: 0.18 })
    this.audio.play('zap')
  }

  damageEnemy(e, dmg) {
    const armor = e.def.armor || 0
    e.hp -= Math.max(1, dmg - armor)
  }

  areaDamage(x, y, radius, dmg) {
    for (const e of this.enemies) {
      const d = Math.hypot(e.x - x, e.y - y)
      if (d <= radius) this.damageEnemy(e, dmg * (1 - d / (radius * 1.6)))
    }
  }

  updateProjectiles(dt) {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i]
      let gx, gy
      if (p.kind === 'cannon') {
        gx = p.tx; gy = p.ty
      } else if (p.hostile) {
        if (!this.buildings.includes(p.target)) { this.projectiles.splice(i, 1); continue }
        gx = p.target.x + p.target.size / 2; gy = p.target.y + p.target.size / 2
      } else {
        if (!p.target || p.target.hp <= 0 || !this.enemies.includes(p.target)) {
          this.projectiles.splice(i, 1); continue
        }
        gx = p.target.x; gy = p.target.y
      }
      const d = Math.hypot(gx - p.x, gy - p.y)
      const step = p.speed * dt
      if (d <= step + 0.15) {
        if (p.kind === 'cannon') {
          this.areaDamage(gx, gy, p.splash, p.dmg)
          this.effects.push({ kind: 'boom', x: gx * TILE, y: gy * TILE, t: 0, ttl: 0.4, r: p.splash * TILE })
        } else if (p.hostile) {
          this.hitBuilding(p.target, p.dmgB)
          this.effects.push({ kind: 'boom', x: gx * TILE, y: gy * TILE, t: 0, ttl: 0.3, r: TILE * 0.7 })
        } else {
          this.damageEnemy(p.target, p.dmg)
        }
        this.projectiles.splice(i, 1)
        continue
      }
      p.x += ((gx - p.x) / d) * step
      p.y += ((gy - p.y) / d) * step
      p.rot = Math.atan2(gy - p.y, gx - p.x)
    }
  }

  // ---------------------------------------------------------------- UI sync

  setPlacing(typeId) {
    this.placing = this.placing === typeId ? null : typeId
    this.syncUi()
  }

  /** Villager & soldier roster for the command log panel. */
  syncRoster() {
    const jobName = (id) => (JOBS.find(j => j.id === id) || JOBS[0]).name
    this.ui.villagers = this.villagers.map(v => ({
      uid: v.uid,
      name: v.name,
      job: v.job,
      status: v.fleeing ? 'fleeing!' :
        v.job === 'train' ? (v.trainT > 0 ? `training ${Math.round(100 * v.trainT / SOLDIER.trainTime)}%` : 'heading to barracks') :
        v.job === 'wood' || v.job === 'mine'
          ? (v.carry >= VILLAGER.carry ? 'hauling' : v.working && this.time - v.working < 2 ? 'working' : 'walking')
          : v.job === 'farm' ? (v.working && this.time - v.working < 2 ? 'farming' : 'walking') : jobName(v.job).toLowerCase(),
      carry: Math.round(v.carry)
    }))
    this.ui.soldiers = this.units.map(u => ({
      uid: u.uid,
      name: u.name || 'Soldier',
      mode: u.mode,
      hp: Math.ceil(u.hp),
      hpMax: u.hpMax,
      fighting: !!u.target
    }))
  }

  syncUi(force) {
    const ui = this.ui
    const set = (k, v) => { if (force || ui[k] !== v) ui[k] = v }
    set('wood', Math.floor(this.res.wood))
    set('stone', Math.floor(this.res.stone))
    set('food', Math.floor(this.res.food))
    set('energy', Math.floor(this.res.energy))
    set('knowledge', Math.floor(this.res.knowledge))
    set('pop', this.pop || 0)
    set('popCap', this.popCap || 0)
    set('era', this.era)
    set('wave', Math.min(this.wave, WAVES.length))
    set('waveTotal', WAVES.length)
    set('phase', this.phase)
    set('phaseT', Math.max(0, Math.ceil(this.phaseT)))
    set('enemiesLeft', this.enemies.length + this.spawnQueue.length)
    set('rallyCd', Math.max(0, Math.ceil(this.rallyCd)))
    set('rallyActive', this.rallyT > 0)
    set('placing', this.placing)
    set('paused', this.paused)
    set('units', this.units.length)
    set('soldierCap', this.soldierCapacity())
    set('hasBanner', !!this.banner)
    set('camMode', this.camMode || 'fp')
    set('tool', this.tool)
    set('buildMenu', this.buildMenu)
    set('coreLevel', this.coreLevel)
    set('commanderHp', Math.ceil(this.commander.hp))
    set('commanderDown', this.commander.downT > 0)
    // tool tiers (small fixed object; rebuild when changed)
    if (force || !ui.toolTiers ||
        ui.toolTiers.sword !== this.toolTiers.sword || ui.toolTiers.axe !== this.toolTiers.axe ||
        ui.toolTiers.pick !== this.toolTiers.pick || ui.toolTiers.hammer !== this.toolTiers.hammer) {
      ui.toolTiers = { ...this.toolTiers }
    }
    // build counts for the menu (only while it's open)
    if (this.buildMenu || force) {
      const counts = {}
      for (const t of BUILD_ORDER) counts[t] = this.countType(t)
      ui.buildCounts = counts
    }
    const s = this.selected
    if (s && this.panelOpen) {
      const upCost = this.upgradeCost(s)
      const info = {
        uid: s.uid, type: s.type, name: s.def.name,
        level: s.level || 1, maxLevel: s.def.maxLevel || 1,
        hp: Math.ceil(s.hp), hpMax: s.hpMax,
        desc: s.def.desc, isCore: s.type === 'core',
        interact: s.def.interact || 'info',
        repairCost: Math.ceil((s.hpMax - s.hp) * REPAIR_COST_PER_HP *
          (1 - Math.min(0.5, (this.toolTiers.hammer - 1) * HAMMER_REPAIR_DISCOUNT))),
        upgradeCost: upCost,
        canUpgrade: !!upCost && this.canAfford(upCost),
        active: s.active !== false,
        staffed: s.staffed || 0
      }
      if (s.type === 'forge' || s.type === 'core') {
        info.tools = {}
        for (const tid of ['sword', 'axe', 'pick', 'hammer']) {
          const st = this.toolResearchState(tid)
          info.tools[tid] = st.next ? {
            cur: st.cur, next: st.next, name: st.name, cost: st.cost,
            locked: st.locked, needsForge: st.needsForge,
            affordable: !st.locked && this.canAfford(st.cost)
          } : { cur: st.cur, next: null }
        }
      }
      if (s.def.trains) {
        info.soldiers = this.units.filter(u => u.home === s.uid).length
        info.trainCap = s.def.trains + (s.def.trainsPerLevel || 0) * ((s.level || 1) - 1)
      }
      const prev = ui.panel
      if (force || !prev || prev.uid !== info.uid || prev.hp !== info.hp ||
          prev.level !== info.level || prev.canUpgrade !== info.canUpgrade ||
          prev.active !== info.active || prev.staffed !== info.staffed) {
        ui.panel = info
      }
    } else if (ui.panel) {
      ui.panel = null
    }
  }

  destroy() {
    this.destroyed = true
    cancelAnimationFrame(this.raf)
    this.view.destroy()
    this.audio.destroy()
  }
}
