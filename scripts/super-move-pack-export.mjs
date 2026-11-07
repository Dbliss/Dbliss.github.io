// Runs Super-Move's OWN code on one of its OWN quick-estimate presets and exports the placements
// for the portfolio's packing replay. Nothing about the inventory, item profiles, trucks or packer
// is re-implemented here: they are imported from the repo, or evaluated straight out of App.vue.
//
// Usage: node scripts/super-move-pack-export.mjs ../Super-Move house src/assets/super-move/packing-demo.json
import fs from 'fs';
import os from 'os';
import path from 'path';
import module from 'module';
import { pathToFileURL } from 'url';
import { execSync } from 'child_process';

const [root, houseId = 'house', outFile] = process.argv.slice(2);

// Vite's `?raw` import (attributes.js reads furniture.csv this way) → plain string module.
module.registerHooks({
  resolve(specifier, context, next) {
    if (specifier.endsWith('?raw')) {
      const url = new URL(specifier.replace(/\?raw$/, ''), context.parentURL);
      return { url: `${url.href}?raw`, shortCircuit: true };
    }
    return next(specifier, context);
  },
  load(url, context, next) {
    if (url.endsWith('?raw')) {
      const file = new URL(url.replace(/\?raw$/, ''));
      return { format: 'module', source: `export default ${JSON.stringify(fs.readFileSync(file, 'utf8'))};`, shortCircuit: true };
    }
    return next(url, context);
  },
});

const imp = (p) => import(pathToFileURL(path.join(root, p)).href);
const readJson = (p) => JSON.parse(fs.readFileSync(path.join(root, p), 'utf8'));

const { rooms, modelAssetFor } = await imp('src/data/rooms.js');
const { resolveAttributes, allowedFlips } = await imp('src/data/attributes.js');
const { buildShape, buildComposite } = await imp('src/utils/shapes.js');

// The packer, loaded from a temporary copy of packing.js + shapes.js with two instrumentation-only
// edits: export the internal helpers the explorer charts (bounds, fleet candidates, feasibility,
// layout stats) and record the GA's best fitness each generation. Packing behaviour is unchanged.
const packDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sm-pack-'));
fs.copyFileSync(path.join(root, 'src/utils/shapes.js'), path.join(packDir, 'shapes.js'));
let packSrc = fs.readFileSync(path.join(root, 'src/utils/packing.js'), 'utf8').replace(/\r\n/g, '\n');
const patch = (find, replacement) => {
  if (!packSrc.includes(find)) throw new Error(`packing.js patch point not found: ${find}`);
  packSrc = packSrc.replace(find, replacement);
};
patch('  let stall = 0;\n', '  globalThis.__gaTrace?.push(population[0]?.fitness);\n  let stall = 0;\n');
patch('    stall = improved ? 0 : stall + 1;\n', '    stall = improved ? 0 : stall + 1;\n    globalThis.__gaTrace?.push(population[0].fitness);\n');
packSrc += '\nexport { computeBounds, candidateFleets, packFleetFast, truckLayoutStats, layoutScore, floorArea };\n';
fs.writeFileSync(path.join(packDir, 'packing.js'), packSrc);
const packer = await import(pathToFileURL(path.join(packDir, 'packing.js')).href);
const { planAndPack } = packer;
const objectShapes = readJson('src/data/objectShapes.json');
const savedDimensions = readJson('src/data/objectDimensions.json');
const savedAttributes = readJson('src/data/objectAttributes.json');

// Evaluate App.vue's own definitions: houseTypes … buildTruckTemplate, plus the household
// defaults and the packing budget the live app hands the worker.
const app = fs.readFileSync(path.join(root, 'src/App.vue'), 'utf8');
const slice = (from, to) => {
  const a = app.indexOf(from);
  const b = app.indexOf(to, a);
  if (a < 0 || b < 0) throw new Error(`App.vue: could not find ${from} … ${to}`);
  return app.slice(a, b);
};
const block = [
  slice('const houseTypes = [', 'const step = ref(0);'),
  slice('const householdDefaultsByHouse = {', '// Base volume per home type'),
  slice('const PACKING_BUDGET_MS', '\n'),
].join('\n');
const scope = { reactive: (o) => o, objectShapes, savedDimensions, savedAttributes, resolveAttributes, allowedFlips, buildShape, buildComposite };
const evaluated = new Function(...Object.keys(scope), `${block}
  return { houseTypes, householdDefaultsByHouse, truckSizes, profileForItem, buildTruckTemplate, PACKING_BUDGET_MS };`)(...Object.values(scope));
const { houseTypes, householdDefaultsByHouse, truckSizes, profileForItem, buildTruckTemplate, PACKING_BUDGET_MS } = evaluated;

// Quick estimate with the home type's default household counts (App.vue seedFurnitureDefaults,
// where every room scale is 1): the preset's defaults for each included room.
const house = houseTypes.find((h) => h.id === houseId);
const details = householdDefaultsByHouse[houseId];
const included = (roomId) => (['kitchen', 'laundry'].includes(roomId) ? house.rooms.includes(roomId) : (details[roomId === 'bedroom' ? 'bedrooms' : roomId === 'bathroom' ? 'bathrooms' : roomId] || 0) > 0);
const inventory = rooms
  .filter((room) => included(room.id))
  .flatMap((room) => room.items.map((item) => ({ ...item, room: room.name, quantity: house.defaults[item.id] || 0 })))
  .filter((item) => item.quantity > 0);

// App.vue packedUnits
const items = inventory.flatMap((item) =>
  Array.from({ length: item.quantity }, (_, index) => ({
    key: `${item.id}-${index}`, id: item.id, asset: item.asset, custom: item.custom, name: item.name, room: item.room, volume: item.volume,
    ...profileForItem(item),
  })));
const fleet = truckSizes.map((t) => buildTruckTemplate(t, 1));

globalThis.__gaTrace = [];
const t0 = Date.now();
const { trucks, unplaced } = planAndPack(items, { truckSizes: fleet, budgetMs: PACKING_BUDGET_MS });
const gaTrace = globalThis.__gaTrace;
console.log(`${house.name}: ${items.length} items -> ${trucks.map((t) => `${t.label} (${t.items.length})`).join(', ')}; unplaced ${unplaced.length}; ${Date.now() - t0}ms (budget ${PACKING_BUDGET_MS}); ${gaTrace.length} GA generations`);

// --- What the packer decided, for the algorithm explorer ------------------------------------
// Everything below re-runs the packer's own deterministic pieces (bounds, fixed-seed feasibility)
// so the charts show exactly what planAndPack did on this load.
const sizes = [...fleet].sort((a, b) => a.capacity - b.capacity);
const largest = sizes[sizes.length - 1];
const bounds = packer.computeBounds(items, sizes);
const volumeBound = Math.ceil(bounds.totalVolume / largest.capacity);
const floorBound = Math.ceil(bounds.baseFootprint / packer.floorArea(largest));

// Phase 1: N largest trucks, N upward from the bound, until everything fits.
const countAttempts = [];
let truckCount = 0;
for (let n = bounds.nMin; n <= bounds.nMin + 6; n += 1) {
  const r = packer.packFleetFast(items, Array.from({ length: n }, () => largest));
  countAttempts.push({ n, placed: r ? r.placed : 0, fits: !!r && r.unplaced.length === 0 });
  if (r && r.unplaced.length === 0) { truckCount = n; break; }
}

// Phase 2: every fleet of that size, the cheap rejection test, then feasibility in cost order.
const allFleets = [];
const build = (i, left, chosen) => {
  if (i === sizes.length - 1) { allFleets.push([...chosen, left]); return; }
  for (let c = 0; c <= left; c += 1) build(i + 1, left - c, [...chosen, c]);
};
build(0, truckCount, []);
let chosenFound = false;
const fleetCandidates = allFleets
  .map((counts) => {
    const list = counts.flatMap((c, s) => Array.from({ length: c }, () => sizes[s]));
    const capacity = list.reduce((s, t) => s + t.capacity, 0);
    const floor = list.reduce((s, t) => s + packer.floorArea(t), 0);
    const maxIdx = counts.reduce((m, c, s) => (c > 0 ? s : m), -1);
    let reason = '';
    if (maxIdx < bounds.reqIdx) reason = 'An item only fits a larger truck';
    else if (capacity + 0.01 < bounds.totalVolume) reason = 'Not enough volume';
    else if (floor < bounds.baseFootprint) reason = 'Not enough floor space';
    return { label: counts.map((c, s) => (c ? `${c}× ${sizes[s].name}` : '')).filter(Boolean).join(' + '), capacity, list, reason };
  })
  .sort((a, b) => a.capacity - b.capacity)
  .map((f) => {
    if (f.reason) return { label: f.label, capacity: f.capacity, status: 'rejected', reason: f.reason };
    if (chosenFound) return { label: f.label, capacity: f.capacity, status: 'skipped', reason: 'A cheaper fleet already fits' };
    const r = packer.packFleetFast(items, f.list);
    const fits = !!r && r.unplaced.length === 0;
    if (fits) chosenFound = true;
    return { label: f.label, capacity: f.capacity, status: fits ? 'chosen' : 'failed', reason: fits ? 'Cheapest fleet that packs everything' : `Packs ${r ? r.placed : 0} of ${items.length}` };
  });

// Final layout: the weighted terms of layoutScore, averaged over the trucks.
const W = { trapped: 8, rough: 3, back: 2, height: -2, wall: -1.5 };
let occ = 0; let env = 0; let trapped = 0; let back = 0; let rough = 0; let height = 0; let wall = 0;
for (const t of trucks) {
  const s = packer.truckLayoutStats(t);
  trapped += s.trapped; env += s.envelope; occ += s.occupied;
  back += s.backLoadMean * s.occupied; rough += s.roughnessNorm; height += s.heightMean; wall += s.wallFrac;
}
const terms = {
  trapped: trapped / env, rough: rough / trucks.length, back: back / occ, height: height / trucks.length, wall: wall / trucks.length,
};
const scoreTerms = Object.entries(terms).map(([k, v]) => ({ key: k, value: +v.toFixed(4), weight: W[k], contribution: +(v * W[k]).toFixed(4) }));

const isLoadLast = (it) => /plant/i.test(`${it.asset || ''} ${it.id || ''} ${it.name || ''}`);
const loadRank = (it) => (isLoadLast(it) ? 2 : !it.openTop && it.stackLevel === 0 ? 1 : 0);

const analysis = {
  bounds: {
    totalVolume: +bounds.totalVolume.toFixed(2), capacity: largest.capacity, volumeBound,
    baseFootprint: bounds.baseFootprint, floorArea: packer.floorArea(largest), floorBound,
    dimensionBound: 1, requiredSize: sizes[Math.max(0, bounds.reqIdx)].name, nMin: bounds.nMin,
  },
  countAttempts,
  truckCount,
  fleetCandidates,
  ga: {
    generations: gaTrace.length - 1,
    best: gaTrace.map((f) => (f && f[0] === 0 ? +f[2].toFixed(4) : null)),
  },
  scoreTerms,
  finalScore: +scoreTerms.reduce((s, t) => s + t.contribution, 0).toFixed(4),
};
fs.rmSync(packDir, { recursive: true, force: true });

// Output exactly what Super-Move's TruckFitScene consumes (App.vue mapPackedTrucks → :trucks), minus
// the heavy voxel shapes. `model` is the Kenney GLB the scene loads for the item (modelAssetFor).
// The packer's collision shape for every asset in the load, straight from objectDimensions.json
// (hand-authored in the /dimensions editor): composite assets keep their boxes, plain assets are one
// box. Boxes are [x, y, z, w, d, h] in cm with y = depth and z = height (packer axes).
function hitboxesFor(packedTrucks) {
  const seen = new Map();
  for (const t of packedTrucks) {
    for (const it of t.items) {
      if (seen.has(it.asset)) continue;
      const saved = savedDimensions[it.asset];
      const boxes = saved?.type === 'composite'
        ? saved.boxes.map((b) => [b.x, b.y, b.z, b.w, b.d, b.h])
        : [[0, 0, 0, saved?.widthCm ?? 60, saved?.depthCm ?? 60, saved?.heightCm ?? 60]];
      seen.set(it.asset, {
        asset: it.asset, name: it.name, model: modelAssetFor(it.asset), composite: saved?.type === 'composite', boxes,
        stackLevel: it.stackLevel, openTop: it.openTop, flips: it.orientationFlips,
      });
    }
  }
  return [...seen.values()];
}

const sha = (() => { try { return execSync('git rev-parse --short HEAD', { cwd: root }).toString().trim(); } catch { return ''; } })();
const out = {
  source: { repo: 'Dbliss/Super-Move', preset: house.id, presetName: house.name, budgetMs: PACKING_BUDGET_MS, head: sha },
  move: house.name,
  itemCount: items.length,
  trucks: trucks.map((t) => ({
    id: t.id, name: t.name, label: t.label, capacity: t.capacity,
    cargoLength: t.cargoLength, cargoWidth: t.cargoWidth, cargoHeight: t.cargoHeight,
    gridColumns: t.gridColumns, gridRows: t.gridRows,
    cellsX: t.cellsX, cellsY: t.cellsY, cellsZ: t.cellsZ,
    usedCells: t.usedCells, gridCells: t.gridCells,
    items: [...t.items].sort((a, b) => a.sequence - b.sequence).map((it) => ({
      key: it.key, id: it.id, name: it.name, room: it.room, asset: it.asset, model: modelAssetFor(it.asset),
      custom: !!it.custom, stackLevel: it.stackLevel, openTop: it.openTop, rank: loadRank(it), cells: it.shape.voxels.length,
      x: it.x, y: it.y, z: it.z, width: it.width, depth: it.depth, height: it.height,
      flip: it.flip, yaw: it.yaw, rotation: it.rotation, sequence: it.sequence,
    })),
  })),
  hitboxes: hitboxesFor(trucks),
  analysis,
};
if (outFile) {
  fs.writeFileSync(outFile, JSON.stringify(out));
  console.log('wrote', outFile, fs.statSync(outFile).size, 'bytes');
}
