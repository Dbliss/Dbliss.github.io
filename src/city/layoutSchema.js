export const CITY_LAYOUT_VERSION = 1
export const CITY_LAYOUT_TILE = 12
export const CITY_LAYOUT_DEFAULT_REVISION = 5
export const CITY_LAYOUT_STORAGE_KEY = `cityLayout.v${CITY_LAYOUT_VERSION}.r${CITY_LAYOUT_DEFAULT_REVISION}`

const finite = (value) => typeof value === 'number' && Number.isFinite(value)

// Kenney road tile auto-tiling, shared by the editor and the home scene so a
// saved layout reproduces exactly. Arms: N = cell at gz-1, S = gz+1,
// E = gx+1, W = gx-1.
const TEE_ROT = { N: 0, E: -Math.PI / 2, S: Math.PI, W: Math.PI / 2 } // key: missing arm
const BEND_ROT = { SW: 0, SE: Math.PI / 2, NE: Math.PI, NW: -Math.PI / 2 }
const END_ROT = { E: 0, N: Math.PI / 2, W: Math.PI, S: -Math.PI / 2 } // key: open arm

export const ROAD_TILE_MODELS = {
  straight: 'road-straight',
  cross: 'road-crossroad',
  tee: 'road-intersection',
  bend: 'road-bend-sidewalk',
  end: 'road-end-round'
}

/** Picks the road tile piece + Y rotation for a cell from its four neighbours. */
export function pickRoadTile(arms) {
  const count = arms.N + arms.S + arms.E + arms.W
  if (count === 4) return { tile: 'cross', ry: 0 }
  if (count === 3) {
    const missing = ['N', 'E', 'S', 'W'].find((d) => !arms[d])
    return { tile: 'tee', ry: TEE_ROT[missing] }
  }
  if (count === 2 && arms.N && arms.S) return { tile: 'straight', ry: Math.PI / 2 }
  if (count === 2 && arms.E && arms.W) return { tile: 'straight', ry: 0 }
  if (count === 2) {
    const key = (arms.N ? 'N' : 'S') + (arms.E ? 'E' : 'W')
    return { tile: 'bend', ry: BEND_ROT[key] }
  }
  if (count === 1) {
    const open = ['N', 'E', 'S', 'W'].find((d) => arms[d])
    return { tile: 'end', ry: END_ROT[open] }
  }
  return { tile: 'straight', ry: 0 } // isolated cell
}

/** Validate and normalize JSON before it enters either Three.js scene. */
export function normalizeCityLayout(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('The layout must be a JSON object.')
  if (input.version !== CITY_LAYOUT_VERSION) throw new Error(`Unsupported layout version: ${input.version ?? 'missing'}.`)
  if (input.tile !== CITY_LAYOUT_TILE) throw new Error(`Tile size must be ${CITY_LAYOUT_TILE}.`)
  if (!Array.isArray(input.roads) || !Array.isArray(input.objects)) throw new Error('The layout must contain roads and objects arrays.')

  const roads = input.roads.map((cell, index) => {
    if (!Array.isArray(cell) || cell.length !== 2 || !cell.every(Number.isInteger)) throw new Error(`Road ${index + 1} must be an integer [gx, gz] pair.`)
    return [cell[0], cell[1]]
  })
  const objects = input.objects.map((object, index) => {
    if (!object || typeof object !== 'object') throw new Error(`Object ${index + 1} is invalid.`)
    if (typeof object.kind !== 'string' || typeof object.type !== 'string') throw new Error(`Object ${index + 1} needs kind and type strings.`)
    if (!finite(object.x) || !finite(object.z)) throw new Error(`Object ${index + 1} needs finite x and z coordinates.`)
    const ry = object.ry ?? 0
    const s = object.s ?? 1
    if (!finite(ry) || !finite(s) || s <= 0) throw new Error(`Object ${index + 1} has an invalid rotation or scale.`)
    return { kind: object.kind, type: object.type, x: object.x, z: object.z, ry, s }
  })
  return { version: CITY_LAYOUT_VERSION, tile: CITY_LAYOUT_TILE, roads, objects }
}