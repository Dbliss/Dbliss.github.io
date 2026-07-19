// Static game data: eras, buildings, node tiers, tools, enemies, waves, upgrades.

export const TILE = 32
export const GRID_W = 128
export const GRID_H = 128
export const MAP_SEED = 1337       // the map layout is fixed
export const CLEAR_RADIUS = 7      // buildable clearing around the Beacon
export const SPAWN_RADIUS = 34     // enemies emerge from the mist at this radius
export const VIEW_DISTANCE = 110   // world units — beyond this is mist (culled)

export const ERAS = [
  {
    id: 0,
    numeral: 'I',
    name: 'Frontier Camp',
    ground: ['#3e5734', '#425c37', '#39512f'],
    groundNight: '#141d26',
    accent: '#e8a24c',
    wallHp: 140,
    blurb: 'Wood, fire and grit. Hold the line.'
  },
  {
    id: 1,
    numeral: 'II',
    name: 'Fortified Town',
    ground: ['#4a5440', '#4f5a44', '#454f3b'],
    groundNight: '#131a24',
    accent: '#d8c27a',
    wallHp: 280,
    blurb: 'Stone walls, workshops and scholars.'
  },
  {
    id: 2,
    numeral: 'III',
    name: 'Neon Metropolis',
    ground: ['#343b46', '#38404c', '#303742'],
    groundNight: '#0d1119',
    accent: '#5ee6ff',
    wallHp: 460,
    blurb: 'Energy grids, tesla arcs and holograms.'
  }
]

// ------------------------------------------------------------------ nodes
// 8 tiers of trees and rocks. Harder tiers live further from the Beacon and
// need a better axe/pickaxe (tool tier >= node tier). `amount` is the node's
// resource pool, `yield` what one chop/mine hit returns.

export const TREE_TIERS = [
  { tier: 1, name: 'Scrub Pine', model: 'tree_small', amount: 40, yield: 2, scale: 0.72, tint: 0x89b85a },
  { tier: 2, name: 'Birch', model: 'tree_default', amount: 60, yield: 3, scale: 0.9, tint: 0xa5c86b },
  { tier: 3, name: 'Oak', model: 'tree_oak', amount: 90, yield: 4, scale: 1.12, tint: 0x6f9b45 },
  { tier: 4, name: 'Fir', model: 'tree_pineRoundA', amount: 130, yield: 6, scale: 1.38, tint: 0x477c43 },
  { tier: 5, name: 'Old Pine', model: 'tree_pineTallA', amount: 180, yield: 8, scale: 1.68, tint: 0x315f3e },
  { tier: 6, name: 'Broadwood', model: 'tree_fat', amount: 240, yield: 11, scale: 2.02, tint: 0x586b35 },
  { tier: 7, name: 'Ironwood', model: 'tree_tall_dark', amount: 320, yield: 15, scale: 2.4, tint: 0x34443f },
  { tier: 8, name: 'Eldertree', model: 'tree_pineTallA_detailed', amount: 420, yield: 20, scale: 2.9, tint: 0x263d34 }
]

export const ROCK_TIERS = [
  { tier: 1, name: 'Loose Stones', model: 'rock_largeA', amount: 45, yield: 2, scale: 1.08, tint: 0x7d8790 },
  { tier: 2, name: 'Limestone', model: 'rock_smallC', amount: 70, yield: 3, scale: 1.05 },
  { tier: 3, name: 'Granite', model: 'rock_largeA', amount: 100, yield: 4, scale: 1.1 },
  { tier: 4, name: 'Iron Vein', model: 'rock_largeC', amount: 140, yield: 6, scale: 1.2, tint: 0xb08968 },
  { tier: 5, name: 'Silver Vein', model: 'rock_tallA', amount: 190, yield: 8, scale: 1.25, tint: 0xc8d0dc },
  { tier: 6, name: 'Gold Vein', model: 'rock_tallC', amount: 250, yield: 11, scale: 1.3, tint: 0xd8b74a },
  { tier: 7, name: 'Obsidian', model: 'rock_largeF', amount: 330, yield: 15, scale: 1.45, tint: 0x4a4658 },
  { tier: 8, name: 'Starstone', model: 'rock_tallD', amount: 430, yield: 20, scale: 1.65, tint: 0x7ae0e8 }
]

// Crystal stays a special node (energy). Needs pickaxe tier 4+.
export const CRYSTAL = { name: 'Crystal', amount: 140, yield: 3, minTool: 4 }

// ------------------------------------------------------------------ tools
// Global tool tiers, shared by the commander and every villager. Researched
// at the Forge; higher Forge levels unlock higher tiers.

export const TOOL_IDS = ['sword', 'axe', 'pick', 'hammer']

export const TOOLS = {
  sword: { id: 'sword', name: 'Sword', desc: 'Strike enemies in front of you. Higher tiers hit harder — soldiers use it too.' },
  axe: { id: 'axe', name: 'Axe', desc: 'Chop trees. Tier gates which trees you and your villagers can fell.' },
  pick: { id: 'pick', name: 'Pickaxe', desc: 'Mine rock and crystal. Tier gates which veins can be mined.' },
  hammer: { id: 'hammer', name: 'Hammer', desc: 'Build and repair. Higher tiers extend build reach and cut repair costs.' }
}

export const TOOL_TIER_NAMES = ['', 'Flint', 'Copper', 'Bronze', 'Iron', 'Steel', 'Silvered', 'Obsidian', 'Starforged']

// Cost to research tier t (index t, 1-based; tier 1 is free/starting).
export const TOOL_TIER_COSTS = [
  null,
  null,
  { wood: 30, stone: 15 },
  { wood: 60, stone: 40 },
  { wood: 100, stone: 80, knowledge: 10 },
  { wood: 160, stone: 130, knowledge: 20 },
  { wood: 240, stone: 200, knowledge: 35 },
  { wood: 350, stone: 300, knowledge: 55, energy: 20 },
  { wood: 500, stone: 450, knowledge: 80, energy: 40 }
]

// Forge level required to research a given tool tier.
export const forgeLevelFor = (tier) => Math.max(1, Math.ceil((tier - 1) / 2) + (tier > 2 ? 0 : 0)) // t2→1, t3-4→2, t5-6→3, t7-8→4
export const FORGE_REQ = [0, 1, 1, 2, 2, 3, 3, 4, 4] // index = tool tier

export const MAX_TOOL_TIER = 8

// Damage / yield scaling per tool tier.
// The commander can interrupt and finish enemies, but trained soldiers are
// now the settlement's dependable front line.
export const SWORD = { dmg: 8, reach: 2.25, arc: 0.78, cooldown: 0.62, dmgPerTier: 0.25 }
export const GATHER = {
  reach: 3.6,          // tiles
  cooldown: 0.45,
  yieldPerTier: 0.25,  // +25% yield per tool tier above the node's tier requirement... applied to tool tier
  crystal: { yield: 3, drain: 12 }
}
export const BUILD_REACH = 10        // tiles, +hammer bonus
export const HAMMER_REACH_PER_TIER = 1.2
export const HAMMER_REPAIR_DISCOUNT = 0.06 // per tier, max ~50%

export const JUMP = { velocity: 7.6, gravity: 22 }

// Player hand tools (first-person). Keys 1-4.
export const PLAYER_TOOLS = [
  { id: 'sword', name: 'Sword', desc: 'Strike enemies in front of you' },
  { id: 'axe', name: 'Axe', desc: 'Chop trees for wood' },
  { id: 'pick', name: 'Pickaxe', desc: 'Mine rock and crystal' },
  { id: 'build', name: 'Build', desc: 'Open the build menu (hammer out)' }
]

// ------------------------------------------------------------------ buildings
// era: era in which the building becomes available. size: tiles square.
// limit: max count per Beacon level [L1..L5]. maxLevel: upgrade cap.
// Upgrades multiply hp ×1.6, production ×1.5, tower dmg ×1.4 per level.

export const CORE_LEVELS = [
  null,
  { hp: 1200, cost: null },
  { hp: 1900, cost: { wood: 120, stone: 80 } },
  { hp: 2800, cost: { wood: 260, stone: 200, food: 60 } },
  { hp: 3900, cost: { wood: 450, stone: 380, knowledge: 40 } },
  { hp: 5200, cost: { wood: 700, stone: 600, knowledge: 80, energy: 40 } }
]
export const MAX_CORE_LEVEL = 5

export const UPGRADE_COST_MULT = 1.9   // building upgrade cost = base cost × mult^(level-1) × 1.4
export const UPGRADE_HP_MULT = 1.6
export const UPGRADE_PROD_MULT = 1.5
export const UPGRADE_TOWER_DMG_MULT = 1.4
export const UPGRADE_TOWER_RANGE_ADD = 0.4

export const BUILDINGS = {
  core: {
    id: 'core',
    name: 'The Beacon',
    era: 0,
    size: 3,
    hp: 1200,
    cost: {},
    desc: 'Your heart and main storehouse. Upgrade it to raise building limits. If it falls, the run ends.',
    popCap: 6,
    unbuildable: true,
    maxLevel: MAX_CORE_LEVEL,
    interact: 'core'
  },
  house: {
    id: 'house',
    name: 'House',
    era: 0,
    size: 2,
    hp: 90,
    cost: { wood: 12, stone: 3 },
    popCap: 4,
    popCapPerLevel: 2,
    maxLevel: 3,
    limit: [3, 5, 7, 9, 12],
    desc: '+4 population capacity (+2 per upgrade).',
    interact: 'info'
  },
  farm: {
    id: 'farm',
    name: 'Farm',
    era: 0,
    size: 2,
    hp: 80,
    cost: { wood: 18, stone: 4 },
    workers: 1,
    workerJob: 'farm',
    workersPerLevel: 0,
    produces: { food: 0.55 },
    maxLevel: 3,
    limit: [2, 3, 5, 7, 9],
    desc: 'Employs one farmer. Upgrades enlarge the fields and improve their yield.',
    interact: 'farm'
  },
  lumber: {
    id: 'lumber',
    name: 'Lumber Camp',
    era: 0,
    size: 1,
    hp: 80,
    cost: { wood: 14, stone: 3 },
    workers: 1,
    workerJob: 'wood',
    workersPerLevel: 1,
    needsNode: 'tree',
    maxLevel: 3,
    limit: [2, 3, 4, 5, 6],
    depot: 'wood',
    desc: 'Employs one lumberjack per level to fell and haul nearby trees.',
    interact: 'info'
  },
  quarry: {
    id: 'quarry',
    name: 'Quarry',
    era: 0,
    size: 1,
    hp: 90,
    cost: { wood: 18, stone: 6 },
    workers: 1,
    workerJob: 'mine',
    workersPerLevel: 1,
    needsNode: 'rock',
    maxLevel: 3,
    limit: [2, 3, 4, 5, 6],
    depot: 'stone',
    desc: 'Employs one miner per level to quarry and haul nearby stone.',
    interact: 'info'
  },
  forge: {
    id: 'forge',
    name: 'Forge',
    era: 0,
    size: 2,
    hp: 130,
    cost: { wood: 35, stone: 20 },
    maxLevel: 4,
    limit: [1, 1, 1, 1, 1],
    desc: 'Research better tools for you and every villager. Upgrade the Forge to unlock higher tiers.',
    interact: 'forge'
  },
  wall: {
    id: 'wall',
    name: 'Wall',
    era: 0,
    size: 1,
    hp: 140, // overridden by era
    cost: { wood: 3, stone: 1 },
    isWall: true,
    limit: [40, 70, 110, 160, 220],
    desc: 'Redirects enemies. Upgrades each era.',
    interact: 'info'
  },
  arrow: {
    id: 'arrow',
    name: 'Arrow Tower',
    era: 0,
    size: 1,
    hp: 130,
    cost: { wood: 22, stone: 8 },
    tower: { range: 4.4, dmg: 7, rate: 1.15, kind: 'arrow' },
    maxLevel: 3,
    limit: [4, 6, 9, 12, 16],
    desc: 'Fast single-target shots.',
    interact: 'info'
  },
  barracks: {
    id: 'barracks',
    name: 'Barracks',
    era: 0,
    size: 2,
    hp: 140,
    cost: { wood: 25, stone: 8, food: 10 },
    trains: 1,
    trainsPerLevel: 1,
    replacementTime: 24,
    maxLevel: 3,
    limit: [1, 1, 2, 2, 3],
    desc: 'Automatically fields one soldier per level. Fallen troops take time to replace.',
    interact: 'barracks'
  },
  road: {
    id: 'road',
    name: 'Road',
    era: 1,
    size: 1,
    hp: 0,
    cost: { stone: 2 },
    isRoad: true,
    limit: [20, 40, 70, 110, 160],
    desc: '+8% production to adjacent buildings. Cars arrive on their own.'
  },
  lab: {
    id: 'lab',
    name: 'Research Lab',
    era: 1,
    size: 2,
    hp: 100,
    cost: { wood: 30, stone: 20 },
    produces: { knowledge: 0.28 },
    workers: 1,
    workerJob: 'work',
    workersPerLevel: 1,
    maxLevel: 3,
    limit: [1, 2, 3, 4, 5],
    desc: 'Generates knowledge (rerolls rewards, unlocks high tool tiers).',
    interact: 'info'
  },
  market: {
    id: 'market',
    name: 'Training Grounds',
    era: 1,
    size: 2,
    hp: 100,
    cost: { wood: 25, stone: 35 },
    training: true,
    maxLevel: 3,
    limit: [1, 2, 3, 4, 5],
    desc: 'Awards a random permanent team doctrine when built and upgraded. Rare doctrines can transform a run.',
    interact: 'training'
  },
  cannon: {
    id: 'cannon',
    name: 'Cannon',
    era: 1,
    size: 1,
    hp: 160,
    cost: { wood: 20, stone: 45 },
    tower: { range: 5.2, dmg: 16, rate: 0.5, kind: 'cannon', splash: 1.25 },
    maxLevel: 3,
    limit: [0, 2, 4, 6, 9],
    desc: 'Slow splash damage. Great vs hordes.',
    interact: 'info'
  },
  generator: {
    id: 'generator',
    name: 'Generator',
    era: 2,
    size: 2,
    hp: 120,
    cost: { stone: 40, wood: 20 },
    produces: { energy: 0.55 },
    workers: 1,
    workerJob: 'work',
    workersPerLevel: 1,
    maxLevel: 3,
    limit: [0, 0, 2, 4, 6],
    desc: 'Produces energy for tesla towers.',
    interact: 'info'
  },
  extractor: {
    id: 'extractor',
    name: 'Crystal Extractor',
    era: 2,
    size: 1,
    hp: 110,
    cost: { stone: 30 },
    produces: { energy: 0.7 },
    workers: 1,
    workerJob: 'work',
    workersPerLevel: 1,
    needsNode: 'crystal',
    maxLevel: 3,
    limit: [0, 0, 2, 4, 6],
    desc: 'Taps adjacent crystal. High energy output.',
    interact: 'info'
  },
  tesla: {
    id: 'tesla',
    name: 'Tesla Tower',
    era: 2,
    size: 1,
    hp: 150,
    cost: { stone: 35, wood: 15 },
    tower: { range: 4.8, dmg: 11, rate: 0.85, kind: 'tesla', chain: 3, energyPerShot: 0.6 },
    maxLevel: 3,
    limit: [0, 0, 2, 4, 8],
    desc: 'Chain lightning. Costs energy per shot.',
    interact: 'info'
  }
}

export const BUILD_ORDER = [
  'house', 'farm', 'lumber', 'quarry', 'forge', 'wall', 'arrow', 'barracks',
  'road', 'lab', 'market', 'cannon',
  'generator', 'extractor', 'tesla'
]

export const buildingLimit = (typeId, coreLevel) => {
  const def = BUILDINGS[typeId]
  if (!def || !def.limit) return Infinity
  return def.limit[Math.min(coreLevel, def.limit.length) - 1]
}

// ------------------------------------------------------------------ people

export const VILLAGER = {
  hp: 30,
  speed: 3.1,
  carry: 12,          // resources hauled before returning to a depot
  chopTime: 1.6,      // seconds per swing
  fleeRadius: 7,      // run home when an enemy is this close
  foodUpkeep: 0.05,   // food per second each
  replacementTime: 20
}

export const JOBS = [
  { id: 'idle', name: 'Rest', desc: 'Stay near the Beacon.' },
  { id: 'wood', name: 'Chop Wood', desc: 'Fell the nearest trees your axe tier allows.' },
  { id: 'mine', name: 'Mine Stone', desc: 'Mine the nearest rocks your pickaxe tier allows.' },
  { id: 'farm', name: 'Farm', desc: 'Work an unstaffed farm.' },
  { id: 'work', name: 'Tend Building', desc: 'Operate the building that employs this villager.' },
  { id: 'train', name: 'Enlist', desc: 'Train at the barracks into a soldier.' }
]

export const SOLDIER = {
  hp: 55,
  dmg: 8,
  rate: 0.8,      // ranged attacks per second
  range: 7.5,
  aggro: 18,      // actively hunt enemies around their post
  speed: 3.8,
  projectileSpeed: 14,
  trainTime: 6,   // seconds in the barracks
  cost: { food: 10 },
  hpPerBarracksLevel: 0.25,
  dmgPerSwordTier: 0.35
}

// Training Grounds rolls one permanent doctrine on construction and on each
// upgrade. Weight makes the run-changing doctrines genuinely uncommon.
export const TRAINING_BUFFS = [
  { id: 'trail_legs', name: 'Trail Legs', desc: 'All workers move 18% faster.', weight: 12, mods: { villagerSpeed: 0.18 } },
  { id: 'sharp_axes', name: 'Sharp Axes', desc: 'Lumberjacks chop 25% faster.', weight: 12, mods: { woodSpeed: 0.25 } },
  { id: 'stone_rhythm', name: 'Stone Rhythm', desc: 'Miners work 25% faster.', weight: 12, mods: { mineSpeed: 0.25 } },
  { id: 'deep_baskets', name: 'Deep Baskets', desc: 'Workers carry 40% more.', weight: 10, mods: { carryBonus: 0.4 } },
  { id: 'field_rations', name: 'Field Rations', desc: 'Villager food upkeep falls 25%.', weight: 10, mods: { upkeepDiscount: 0.25 } },
  { id: 'quick_draw', name: 'Quick Draw', desc: 'Barracks troops fire 22% faster.', weight: 11, mods: { soldierRate: 0.22 } },
  { id: 'broadheads', name: 'Broadheads', desc: 'Barracks troops deal 25% more damage.', weight: 11, mods: { soldierDmg: 0.25 } },
  { id: 'long_sight', name: 'Long Sight', desc: 'Barracks troop range increases by 2 tiles.', weight: 9, mods: { soldierRange: 2 } },
  { id: 'marching_drill', name: 'Marching Drill', desc: 'Barracks troops move 20% faster.', weight: 9, mods: { soldierSpeed: 0.2 } },
  { id: 'padded_coats', name: 'Padded Coats', desc: 'Barracks troops gain 25% maximum health.', weight: 9, mods: { soldierHp: 0.25 } },
  { id: 'command_drill', name: 'Command Drill', desc: 'The commander moves 15% faster.', weight: 8, mods: { commanderSpeed: 0.15 } },
  { id: 'night_school', name: 'Night School', desc: 'Production continues at 35% while workers shelter.', weight: 5, rare: true, mods: { nightShift: 0.35 } },
  { id: 'master_craftsfolk', name: 'Master Craftsfolk', desc: 'All gathering and production improves by 45%.', weight: 3, rare: true, mods: { prodMult: 0.45, woodSpeed: 0.2, mineSpeed: 0.2 } },
  { id: 'volley_fire', name: 'Volley Fire', desc: 'Barracks troops fire twice as fast.', weight: 2, rare: true, mods: { soldierRate: 1 } },
  { id: 'frontier_legend', name: 'Frontier Legends', desc: 'All people move faster; troops gain major damage, range and health.', weight: 1, rare: true, mods: { villagerSpeed: 0.3, soldierSpeed: 0.3, soldierDmg: 0.5, soldierRange: 2, soldierHp: 0.5 } }
]

// ------------------------------------------------------------------ enemies

export const ENEMIES = {
  grub: {
    id: 'grub',
    name: 'Grub',
    hp: 20,
    speed: 2.1,
    dmg: 9, // dps vs buildings/people
    radius: 0.28,
    color: '#8fd14f',
    targeting: 'nearest',   // nearest building or person
    sight: 11,
    drops: { wood: 1 },
    score: 1
  },
  shell: {
    id: 'shell',
    name: 'Shellback',
    hp: 95,
    speed: 1.05,
    dmg: 16,
    armor: 3,
    radius: 0.4,
    color: '#c98944',
    targeting: 'nearest',
    sight: 10,
    drops: { stone: 2 },
    score: 3
  },
  wasp: {
    id: 'wasp',
    name: 'Razorwasp',
    hp: 34,
    speed: 2.9,
    dmg: 11,
    flying: true,
    radius: 0.3,
    color: '#e065c9',
    targeting: 'core',      // beelines straight for the Beacon
    drops: { food: 2 },
    score: 2
  },
  lobber: {
    id: 'lobber',
    name: 'Lobber',
    hp: 70,
    speed: 1.35,
    dmg: 14, // per lobbed shell
    siege: { range: 3.6, rate: 0.5 },
    radius: 0.38,
    color: '#7f8fe0',
    targeting: 'nearest',
    sight: 12,
    drops: { stone: 2, wood: 1 },
    score: 3
  },
  behemoth: {
    id: 'behemoth',
    name: 'The Behemoth',
    hp: 2100,
    speed: 0.72,
    dmg: 80,
    armor: 4,
    radius: 0.9,
    boss: true,
    targeting: 'flow',      // marches on the Beacon, smashing what's in the way
    spawnMinions: { type: 'grub', n: 4, every: 7 },
    color: '#e0524f',
    drops: { wood: 30, stone: 30, food: 20 },
    score: 50
  }
}

// Wave table. hp scaling applied on top in game.js.
export const WAVES = [
  { grub: 8 },
  { grub: 14 },
  { grub: 12, shell: 3 },
  { grub: 18, shell: 5 },
  { grub: 16, shell: 6, wasp: 6 },
  { grub: 22, shell: 6, wasp: 9 },
  { grub: 20, shell: 8, wasp: 6, lobber: 4 },
  { grub: 26, shell: 10, wasp: 10, lobber: 6 },
  { grub: 28, shell: 12, wasp: 12, lobber: 8 },
  { grub: 32, shell: 14, wasp: 14, lobber: 10 },
  { grub: 36, shell: 16, wasp: 16, lobber: 12 },
  { grub: 30, shell: 12, wasp: 12, lobber: 8, behemoth: 1 }
]

export const WAVE_HP_SCALE = (wave) => 1 + (wave - 1) * 0.17

// Roguelike upgrade pool. `mods` keys are read by game.js.
export const UPGRADES = [
  {
    id: 'twinArrows',
    name: 'Twin Arrows',
    icon: 'arrow',
    tag: 'Fortress',
    desc: 'Arrow towers loose two arrows per shot.',
    mods: { arrowMulti: 1 }
  },
  {
    id: 'masonry',
    name: 'Reinforced Masonry',
    icon: 'wall',
    tag: 'Fortress',
    desc: 'Walls gain +60% maximum health. Existing walls are reinforced.',
    mods: { wallHpMult: 0.6 }
  },
  {
    id: 'livingWalls',
    name: 'Living Walls',
    icon: 'wall',
    tag: 'Biomass',
    desc: 'Walls slowly regenerate (1.6 hp/s).',
    mods: { wallRegen: 1.6 }
  },
  {
    id: 'toolsmiths',
    name: 'Toolsmiths',
    icon: 'forge',
    tag: 'Industry',
    desc: 'All production +25%.',
    mods: { prodMult: 0.25 }
  },
  {
    id: 'compost',
    name: 'Compost Cycle',
    icon: 'farm',
    tag: 'Biomass',
    desc: 'Enemies dying within 3 tiles of a farm yield +6 food.',
    mods: { compost: 6 }
  },
  {
    id: 'chainSurge',
    name: 'Chain Surge',
    icon: 'tesla',
    tag: 'Energy',
    era: 2,
    desc: 'Tesla lightning chains to two extra targets.',
    mods: { teslaChain: 2 }
  },
  {
    id: 'overwatch',
    name: 'Overwatch',
    icon: 'arrow',
    tag: 'Fortress',
    desc: 'All towers gain +1 range.',
    mods: { towerRange: 1 }
  },
  {
    id: 'bounty',
    name: 'Bounty Hunters',
    icon: 'market',
    tag: 'Industry',
    desc: 'Enemies drop 60% more resources.',
    mods: { dropMult: 0.6 }
  },
  {
    id: 'timber',
    name: 'Cheap Timber',
    icon: 'lumber',
    tag: 'Industry',
    desc: 'Wood costs of all buildings reduced by 25%.',
    mods: { woodDiscount: 0.25 }
  },
  {
    id: 'sharpshooters',
    name: 'Sharpshooters',
    icon: 'arrow',
    tag: 'Fortress',
    desc: 'All towers deal +30% damage.',
    mods: { towerDmg: 0.3 }
  },
  {
    id: 'fortressDoctrine',
    name: 'Fortress Doctrine',
    icon: 'wall',
    tag: 'Fortress',
    desc: 'Towers adjacent to a wall deal +35% damage.',
    mods: { fortressDoctrine: 0.35 }
  },
  {
    id: 'boomGates',
    name: 'Boom Gates',
    icon: 'cannon',
    tag: 'Energy',
    desc: 'Walls explode when destroyed (40 dmg, 2 tile radius).',
    mods: { boomWalls: 40 }
  },
  {
    id: 'medics',
    name: 'Field Medics',
    icon: 'house',
    tag: 'Civic',
    desc: 'After each wave every building repairs 40% of missing health.',
    mods: { postWaveRepair: 0.4 }
  },
  {
    id: 'coldFusion',
    name: 'Cold Fusion',
    icon: 'generator',
    tag: 'Energy',
    era: 2,
    desc: 'Energy production +50%.',
    mods: { energyMult: 0.5 }
  },
  {
    id: 'scholars',
    name: 'Wandering Scholars',
    icon: 'lab',
    tag: 'Civic',
    desc: 'Gain +0.15 knowledge per second, always.',
    mods: { passiveKnowledge: 0.15 }
  },
  {
    id: 'armedCitizens',
    name: 'Armed Citizens',
    icon: 'house',
    tag: 'Civic',
    desc: 'Houses throw rocks at nearby enemies (range 2.6).',
    mods: { armedHouses: 1 }
  },
  {
    id: 'cannonade',
    name: 'Cannonade',
    icon: 'cannon',
    tag: 'Fortress',
    era: 1,
    desc: 'Cannon splash radius +50%.',
    mods: { splashMult: 0.5 }
  },
  {
    id: 'repairDrones',
    name: 'Repair Drones',
    icon: 'extractor',
    tag: 'Energy',
    era: 2,
    desc: 'A drone repairs your most damaged building (3 hp/s).',
    mods: { repairDrone: 3 }
  }
]

export const RALLY = { cost: { food: 15 }, duration: 10, cooldown: 35, rateBonus: 0.6 }
export const REPAIR_COST_PER_HP = 0.08 // wood per hp repaired
export const DEMOLISH_REFUND = 0.5

export const START_RESOURCES = { wood: 70, stone: 45, food: 40, energy: 0, knowledge: 0 }
export const PREP_TIME = 90
export const REROLL_COST = 25
