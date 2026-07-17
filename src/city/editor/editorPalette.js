/*
 * Palette of everything placeable in the city layout editor.
 *
 * Model entries point at the same Kenney GLBs the home scene uses, with the
 * same normalised sizes (fit.footprint / fit.height in world units), so a
 * layout authored here transfers 1:1 onto the landing page.
 *
 * Landmark entries are placeholder markers — the home scene builds the real
 * procedural landmark group at the saved position using the matching key.
 */

const sub = (n) => `models/kenney/suburban/${n}.glb`
const com = (n) => `models/kenney/commercial/${n}.glb`
const road = (n) => `models/kenney/roads/${n}.glb`
const car = (n) => `models/kenney/cars/${n}.glb`
const farm = (n) => `models/cozy-farm/${n}.glb`

const HOUSE_TYPES = ['a', 'b', 'c', 'e', 'g', 'h', 'k', 'n']
const CITY_TYPES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'k', 'm']
const SKYSCRAPERS = { a: 26, b: 34, c: 28, d: 36, e: 24 } // type → height
const CAR_TYPES = ['sedan', 'sedan-sports', 'taxi', 'police', 'suv', 'suv-luxury', 'hatchback-sports', 'delivery']

// Same keys/colors/radii as the landmark defs in cityScene.js
export const LANDMARKS = [
  { type: 'hq', label: 'About Me (HQ)', color: 0x8b5bff, radius: 13 },
  { type: 'sportslux', label: 'Sportslux Stadium', color: 0x9fc4ff, radius: 21 },
  { type: 'sports-booking', label: 'FrontRunner Park', color: 0x7fd4ff, radius: 22 },
  { type: 'chessEngine', label: 'Chess Park', color: 0xd9dcea, radius: 15 },
  { type: 'lol-match-predictor', label: 'Esports Arena', color: 0xff4fd8, radius: 17 },
  { type: 'wealth-pathways-au', label: 'Finance Tower', color: 0x6ee7a0, radius: 20 },
  { type: 'asset-data-integration', label: 'Data Hub', color: 0x41e6ff, radius: 14 },
  { type: 'contact', label: 'Comms Tower', color: 0xff5c5c, radius: 8 }
]

export const PALETTE = [
  ...HOUSE_TYPES.map((t) => ({
    kind: 'house',
    type: `building-type-${t}`,
    label: `House ${t.toUpperCase()}`,
    cat: 'Houses',
    url: sub(`building-type-${t}`),
    fit: { footprint: 8 }
  })),
  ...CITY_TYPES.map((t) => ({
    kind: 'commercial',
    type: `building-${t}`,
    label: `Building ${t.toUpperCase()}`,
    cat: 'Commercial',
    url: com(`building-${t}`),
    fit: { footprint: 11 }
  })),
  ...Object.entries(SKYSCRAPERS).map(([t, h]) => ({
    kind: 'skyscraper',
    type: `building-skyscraper-${t}`,
    label: `Tower ${t.toUpperCase()}`,
    cat: 'Skyscrapers',
    url: com(`building-skyscraper-${t}`),
    fit: { height: h }
  })),
  {
    kind: 'tree',
    type: 'tree-large',
    label: 'Tree (large)',
    cat: 'Nature',
    url: sub('tree-large'),
    fit: { height: 6.5 }
  },
  {
    kind: 'tree',
    type: 'tree-small',
    label: 'Tree (small)',
    cat: 'Nature',
    url: sub('tree-small'),
    fit: { height: 4.2 }
  },
  {
    kind: 'streetlight',
    type: 'light-curved',
    label: 'Street light',
    cat: 'Street',
    url: road('light-curved'),
    fit: { height: 6.8 }
  },
  ...CAR_TYPES.map((t) => ({
    kind: 'car',
    type: t,
    label: `Car — ${t}`,
    cat: 'Cars',
    url: car(t),
    fit: { footprint: 4.4 }
  })),
  { kind: 'farm', type: 'barn', label: 'Barn', cat: 'Farm', url: farm('barnlvl2'), fit: { footprint: 18 } },
  { kind: 'farm', type: 'soil', label: 'Soil plot', cat: 'Farm', url: farm('soil'), fit: { footprint: 12 } },
  { kind: 'farm', type: 'corn', label: 'Corn crop', cat: 'Farm', url: farm('corn'), fit: { height: 3 } },
  { kind: 'farm', type: 'wheat', label: 'Wheat crop', cat: 'Farm', url: farm('wheat'), fit: { height: 2.6 } },
  { kind: 'farm', type: 'hay-bale', label: 'Hay bale', cat: 'Farm', url: farm('haystackround'), fit: { footprint: 3.5 } },
  { kind: 'farm', type: 'cart', label: 'Farm cart', cat: 'Farm', url: farm('cart'), fit: { footprint: 5 } },
  { kind: 'farm', type: 'fence', label: 'Farm fence', cat: 'Farm', url: farm('fenceclean'), fit: { footprint: 7 } },  ...LANDMARKS.map((l) => ({
    kind: 'landmark',
    type: l.type,
    label: l.label,
    cat: 'Landmarks',
    marker: l
  }))
]

export const paletteId = (e) => `${e.kind}:${e.type}`
export const findEntry = (kind, type) => PALETTE.find((e) => e.kind === kind && e.type === type)

export const CATEGORIES = ['Houses', 'Commercial', 'Skyscrapers', 'Nature', 'Farm', 'Street', 'Cars', 'Landmarks']
