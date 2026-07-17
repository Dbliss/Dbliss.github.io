# City layout JSON schema (v1)

Produced by the editor at `#/city-editor` (src/pages/CityEditor.vue → src/city/editor/).
Intended consumer: the home-page city (src/city/cityScene.js) — to be wired up so it
builds roads/buildings from this file instead of the current procedural layout.

```json
{
  "version": 1,
  "tile": 12,
  "roads": [[0, 0], [1, 0], [2, 0]],
  "objects": [
    { "kind": "house", "type": "building-type-a", "x": -66, "z": 42, "ry": 1.571, "s": 1 },
    { "kind": "landmark", "type": "hq", "x": 0, "z": 12, "ry": 0, "s": 1 }
  ]
}
```

## Fields

- `tile` — road grid pitch in world units (12 = one Kenney road tile footprint).
- `roads` — list of `[gx, gz]` integer grid cells that contain road. World position
  of a cell centre is `(gx * tile, gz * tile)`. The tile piece + rotation
  (straight / bend / T / crossroad / dead-end) is **derived from neighbours**, not
  stored — use `pickRoadTile(arms)` exported from `src/city/editor/editorScene.js`
  (arms: N = cell at gz-1, S = gz+1, E = gx+1, W = gx-1).
- `objects[]`:
  - `kind` + `type` — identify the asset; must match an entry in
    `src/city/editor/editorPalette.js`:
    - `house` / `building-type-{a,b,c,e,g,h,k,n}` — fit footprint 8
    - `commercial` / `building-{a..m}` — fit footprint 11
    - `skyscraper` / `building-skyscraper-{a..e}` — fit heights 26/34/28/36/24
    - `tree` / `tree-large` (h 6.5), `tree-small` (h 4.2)
    - `streetlight` / `light-curved` — fit height 6.8
    - `car` / kenney car names — fit footprint 4.4 (cars face +Z)
    - `landmark` / one of the cityScene landmark keys (`hq`, `sportslux`,
      `sports-booking`, `chessEngine`, `lol-match-predictor`,
      `wealth-pathways-au`, `asset-data-integration`, `contact`) — the editor
      shows a marker; the home scene should build the real procedural landmark
      group at this position/rotation.
  - `x`, `z` — world position (base at y=0), `ry` — Y rotation in radians,
    `s` — uniform scale.

## Workflow

1. Build the layout at `#/city-editor` (it autosaves to
   `localStorage["cityLayout.v1"]`).
2. Download JSON → commit as `src/data/cityLayout.json`.
3. Future: `buildCity()` reads that file for roads, buildings and landmark
   positions instead of `computeRoadLayout()` / random block fills.
