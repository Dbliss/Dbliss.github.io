import * as THREE from 'three'

/*
 * Builds the night-time "smart city" world for the landing page.
 *
 * buildCity(scene) constructs everything and returns:
 *   landmarks: [{ key, label, sub, route, anchor, hitMesh, ring, ... }]
 *   update(dt, elapsed): advances all animations (drone, cars, pulses, beacons)
 *
 * Ground/road/grass surfaces use CC0 PBR textures from ambientCG
 * (public/textures). Everything else is procedural.
 */

THREE.Cache.enabled = true

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

const rand = (a, b) => a + Math.random() * (b - a)
const BEACON_RED = new THREE.Color(0xff5c5c)

const texLoader = new THREE.TextureLoader()

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

function glowSprite(color, size, opacity = 0.8) {
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
function lightPool(color, size, opacity = 0.16) {
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

/**
 * Facade texture with framed windows, floor bands and varied lighting.
 * Used as both color map and emissive map (walls are near-black so they
 * barely emit; lit windows glow through bloom).
 */
function facadeTexture(rows, cols = 8, hue = 'warm') {
  const cell = 32
  return canvasTexture(cols * cell, rows * cell, (ctx, w, h) => {
    // wall: subtle vertical gradient, very dark blue-grey
    const grad = ctx.createLinearGradient(0, 0, 0, h)
    grad.addColorStop(0, '#131722')
    grad.addColorStop(1, '#0a0d16')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, w, h)

    for (let r = 0; r < rows; r++) {
      // floor slab line
      ctx.fillStyle = 'rgba(0,0,0,0.55)'
      ctx.fillRect(0, r * cell, w, 3)
      // some floors are fully dark (offices closed)
      const floorLit = Math.random() > 0.25
      for (let c = 0; c < cols; c++) {
        const x = c * cell + 6
        const y = r * cell + 8
        const ww = cell - 12
        const wh = cell - 14
        // window frame
        ctx.fillStyle = '#05070d'
        ctx.fillRect(x - 2, y - 2, ww + 4, wh + 4)
        const lit = floorLit && Math.random() > 0.45
        if (!lit) {
          // dark glass with faint sky reflection
          const gg = ctx.createLinearGradient(0, y, 0, y + wh)
          gg.addColorStop(0, 'rgba(60,80,130,0.25)')
          gg.addColorStop(1, 'rgba(12,16,28,0.9)')
          ctx.fillStyle = gg
          ctx.fillRect(x, y, ww, wh)
          continue
        }
        const warm = hue === 'warm' ? Math.random() > 0.3 : Math.random() > 0.72
        const a = rand(0.45, 1)
        const gg = ctx.createLinearGradient(0, y, 0, y + wh)
        if (warm) {
          gg.addColorStop(0, `rgba(255,214,150,${a})`)
          gg.addColorStop(1, `rgba(255,178,96,${a * 0.75})`)
        } else {
          gg.addColorStop(0, `rgba(168,205,255,${a})`)
          gg.addColorStop(1, `rgba(120,165,235,${a * 0.75})`)
        }
        ctx.fillStyle = gg
        ctx.fillRect(x, y, ww, wh)
        // mullion
        ctx.fillStyle = 'rgba(5,7,13,0.85)'
        ctx.fillRect(x + ww / 2 - 1, y, 2, wh)
      }
    }
  })
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

function shadowify(group) {
  group.traverse((o) => {
    if (o.isMesh && !o.material.transparent) {
      o.castShadow = true
      o.receiveShadow = true
    }
  })
}

// ---------------------------------------------------------------------------
// City fabric: ground, roads, filler buildings, street lights, sky, cars
// ---------------------------------------------------------------------------

const CITY_HALF = 120
const ROADS = [-90, -60, -30, 0, 30, 60, 90]
const ROAD_W = 6
const WALK_W = 2.6

function buildGround(scene) {
  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(CITY_HALF * 2.4, 72),
    std({ ...pbrMaps('Concrete034', 60, 60), color: 0x707890, roughness: 1 })
  )
  ground.rotation.x = -Math.PI / 2
  ground.receiveShadow = true
  scene.add(ground)
}

/**
 * Roads are built as 30-unit segments between intersections. Segments whose
 * centre falls inside a landmark precinct are skipped, so roads stop at the
 * plaza edge instead of running through a stadium or park.
 *
 * Returns the open "lanes" (maximal unbroken runs of segments) so cars can be
 * routed only along real, continuous road.
 */
function buildRoads(scene, exclusions) {
  const SEG = 30
  const blockedAt = (x, z) =>
    exclusions.some((e) => (x - e.x) ** 2 + (z - e.z) ** 2 < e.r * e.r)

  // collect kept segments + open lane intervals
  const kept = [] // { x, z, vertical }
  const lanes = [] // { vertical, p, t0, t1 }
  for (const axis of ['x', 'z']) {
    for (const p of ROADS) {
      let run = null
      for (let c = -CITY_HALF + SEG / 2; c < CITY_HALF; c += SEG) {
        const [sx, sz] = axis === 'x' ? [p, c] : [c, p]
        if (!blockedAt(sx, sz)) {
          kept.push({ x: sx, z: sz, vertical: axis === 'x' })
          if (run) run.t1 = c + SEG / 2
          else run = { vertical: axis === 'x', p, t0: c - SEG / 2, t1: c + SEG / 2 }
        } else if (run) {
          lanes.push(run)
          run = null
        }
      }
      if (run) lanes.push(run)
    }
  }

  const asphalt = pbrMaps('Asphalt025C', 1, 2)
  const roadMat = std({ ...asphalt, color: 0x9aa2b6, roughness: 1 })

  // lane markings: edge lines + centre dashes, tiled along each segment
  const markTex = canvasTexture(128, 512, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h)
    ctx.fillStyle = 'rgba(235,240,255,0.9)'
    ctx.fillRect(8, 0, 3, h)
    ctx.fillRect(w - 11, 0, 3, h)
    ctx.fillStyle = 'rgba(255,220,130,0.9)'
    for (let y = 0; y < h; y += 64) ctx.fillRect(w / 2 - 2, y, 4, 30)
  })
  markTex.wrapT = THREE.RepeatWrapping
  markTex.repeat.set(1, 1)
  const markMat = new THREE.MeshBasicMaterial({
    map: markTex,
    transparent: true,
    opacity: 0.5,
    depthWrite: false
  })

  const walkMaps = pbrMaps('PavingStones138', 1.2, 8)
  const walkMat = std({ ...walkMaps, color: 0x878da4, roughness: 1 })

  const roads = new THREE.InstancedMesh(new THREE.PlaneGeometry(ROAD_W, SEG), roadMat, kept.length)
  const marks = new THREE.InstancedMesh(new THREE.PlaneGeometry(ROAD_W, SEG), markMat, kept.length)
  const walks = new THREE.InstancedMesh(
    new THREE.BoxGeometry(WALK_W, 0.24, SEG),
    walkMat,
    kept.length * 2
  )
  roads.receiveShadow = walks.receiveShadow = true

  const dummy = new THREE.Object3D()
  let wi = 0
  kept.forEach((s, i) => {
    // vertical roads sit a hair higher than horizontal so overlaps never z-fight
    const yr = s.vertical ? 0.05 : 0.035
    dummy.rotation.set(-Math.PI / 2, 0, s.vertical ? 0 : Math.PI / 2)
    dummy.position.set(s.x, yr, s.z)
    dummy.scale.setScalar(1)
    dummy.updateMatrix()
    roads.setMatrixAt(i, dummy.matrix)
    dummy.position.y = yr + 0.04
    dummy.updateMatrix()
    marks.setMatrixAt(i, dummy.matrix)

    for (const side of [-1, 1]) {
      const off = side * (ROAD_W / 2 + WALK_W / 2)
      dummy.rotation.set(0, s.vertical ? 0 : Math.PI / 2, 0)
      dummy.position.set(s.vertical ? s.x + off : s.x, 0.02, s.vertical ? s.z : s.z + off)
      dummy.updateMatrix()
      walks.setMatrixAt(wi++, dummy.matrix)
    }
  })
  scene.add(roads, marks, walks)
  return lanes
}

/**
 * Filler skyline. Buildings are grouped into height classes so each class
 * shares one InstancedMesh + one facade texture (windows never stretch
 * vertically). Landmark districts are kept clear via exclusion zones.
 */
function buildFillerBuildings(scene, exclusions) {
  const classes = [
    { height: 8, rows: 4, count: 70 },
    { height: 14, rows: 7, count: 60 },
    { height: 22, rows: 11, count: 40 },
    { height: 34, rows: 17, count: 18 }
  ]
  const tooClose = (x, z) =>
    exclusions.some((e) => (x - e.x) ** 2 + (z - e.z) ** 2 < e.r * e.r)
  const nearRoad = (v) => ROADS.some((r) => Math.abs(v - r) < ROAD_W / 2 + WALK_W + 2.5)

  const dummy = new THREE.Object3D()
  const color = new THREE.Color()
  const rooftopSpots = []

  for (const cls of classes) {
    const tex = facadeTexture(cls.rows)
    const side = std({
      color: 0xffffff, // facade colour comes from the (mostly dark) windows map
      map: tex,
      emissive: 0xffffff,
      emissiveMap: tex,
      emissiveIntensity: 1.05,
      roughness: 0.75
    })
    const cap = std({ color: 0x11141f, roughness: 0.95 })
    const geo = new THREE.BoxGeometry(1, 1, 1)
    // box material order: +x,-x,+y,-y,+z,-z
    const mesh = new THREE.InstancedMesh(geo, [side, side, cap, cap, side, side], cls.count)
    mesh.castShadow = true
    mesh.receiveShadow = true

    let placed = 0
    let guard = 0
    while (placed < cls.count && guard++ < 4000) {
      const x = rand(-CITY_HALF + 8, CITY_HALF - 8)
      const z = rand(-CITY_HALF + 8, CITY_HALF - 8)
      if (nearRoad(x) || nearRoad(z) || tooClose(x, z)) continue
      const w = rand(5, 11)
      const dpt = rand(5, 11)
      dummy.position.set(x, cls.height / 2, z)
      dummy.scale.set(w, cls.height, dpt)
      dummy.rotation.y = 0
      dummy.updateMatrix()
      mesh.setMatrixAt(placed, dummy.matrix)
      color.setHSL(0.62, 0.12, rand(0.55, 1) * 0.35 + 0.35)
      mesh.setColorAt(placed, color)
      placed++
      if (cls.height >= 14 && Math.random() > 0.4) {
        rooftopSpots.push({ x, y: cls.height, z, w, d: dpt })
      }
    }
    mesh.count = placed
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
    scene.add(mesh)
  }

  // rooftop clutter: AC units + water tanks so roofs aren't bare slabs
  const clutter = new THREE.InstancedMesh(
    new THREE.BoxGeometry(1, 1, 1),
    std({ color: 0x1c2130, roughness: 0.8 }),
    rooftopSpots.length * 2
  )
  clutter.castShadow = true
  let ci = 0
  for (const s of rooftopSpots) {
    const n = Math.random() > 0.55 ? 2 : 1
    for (let k = 0; k < n; k++) {
      const bw = rand(1, 2.2)
      const bh = rand(0.7, 1.6)
      dummy.position.set(
        s.x + rand(-s.w / 2 + 1.4, s.w / 2 - 1.4),
        s.y + bh / 2,
        s.z + rand(-s.d / 2 + 1.4, s.d / 2 - 1.4)
      )
      dummy.scale.set(bw, bh, rand(1, 2.2))
      dummy.rotation.y = rand(0, Math.PI)
      dummy.updateMatrix()
      clutter.setMatrixAt(ci++, dummy.matrix)
    }
  }
  clutter.count = ci
  clutter.instanceMatrix.needsUpdate = true
  scene.add(clutter)
}

/** Low-poly street trees scattered along the sidewalks. */
function buildTrees(scene, exclusions) {
  const count = 90
  const trunkMat = std({ color: 0x2a2118, roughness: 1 })
  const leafMat = std({ color: 0x18321f, roughness: 1 })
  const trunk = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.16, 0.24, 1, 6), trunkMat, count)
  const leaves = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), leafMat, count)
  trunk.castShadow = leaves.castShadow = true

  const tooClose = (x, z) =>
    exclusions.some((e) => (x - e.x) ** 2 + (z - e.z) ** 2 < e.r * e.r)

  const dummy = new THREE.Object3D()
  let placed = 0
  let guard = 0
  while (placed < count && guard++ < 3000) {
    // hug the sidewalks: pick a road, offset just past the kerb
    const road = ROADS[Math.floor(rand(0, ROADS.length))]
    const along = rand(-CITY_HALF + 6, CITY_HALF - 6)
    const side = Math.random() > 0.5 ? 1 : -1
    const off = road + side * (ROAD_W / 2 + WALK_W + rand(1.2, 2.4))
    const vertical = Math.random() > 0.5
    const x = vertical ? off : along
    const z = vertical ? along : off
    if (tooClose(x, z)) continue
    if (ROADS.some((r) => Math.abs(x - r) < ROAD_W / 2 + 0.8) && ROADS.some((r) => Math.abs(z - r) < ROAD_W / 2 + 0.8)) continue

    const h = rand(2.2, 3.6)
    dummy.position.set(x, h / 2, z)
    dummy.scale.set(1, h, 1)
    dummy.rotation.set(0, 0, 0)
    dummy.updateMatrix()
    trunk.setMatrixAt(placed, dummy.matrix)
    const s = rand(1.5, 2.6)
    dummy.position.set(x, h + s * 0.5, z)
    dummy.scale.set(s, s * rand(0.9, 1.2), s)
    dummy.rotation.y = rand(0, Math.PI)
    dummy.updateMatrix()
    leaves.setMatrixAt(placed, dummy.matrix)
    placed++
  }
  trunk.count = leaves.count = placed
  trunk.instanceMatrix.needsUpdate = true
  leaves.instanceMatrix.needsUpdate = true
  scene.add(trunk, leaves)
}

function buildStreetLights(scene, exclusions) {
  const poleMat = std({ color: 0x1a1f2c, roughness: 0.6, metalness: 0.5 })
  const headMat = new THREE.MeshBasicMaterial({ color: 0xffd9a0 })
  const poleGeo = new THREE.CylinderGeometry(0.1, 0.16, 5.4, 6)
  const armGeo = new THREE.CylinderGeometry(0.07, 0.07, 2.2, 6)
  const headGeo = new THREE.BoxGeometry(0.9, 0.22, 0.34)

  const group = new THREE.Group()
  for (const x of ROADS) {
    for (const z of ROADS) {
      if ((ROADS.indexOf(x) + ROADS.indexOf(z)) % 2 !== 0) continue
      const px = x + ROAD_W / 2 + WALK_W / 2
      const pz = z + ROAD_W / 2 + WALK_W / 2
      if (exclusions.some((e) => (px - e.x) ** 2 + (pz - e.z) ** 2 < e.r * e.r)) continue

      const pole = new THREE.Mesh(poleGeo, poleMat)
      pole.position.set(px, 2.7, pz)
      // arm reaches back over the road
      const arm = new THREE.Mesh(armGeo, poleMat)
      arm.position.set(px - 0.9, 5.35, pz)
      arm.rotation.z = Math.PI / 2
      const head = new THREE.Mesh(headGeo, headMat)
      head.position.set(px - 1.8, 5.28, pz)
      const glow = glowSprite(0xffc37a, 3.4, 0.55)
      glow.position.set(px - 1.8, 5.28, pz)
      const pool = lightPool(0xffbd72, 13, 0.16)
      pool.position.set(px - 1.8, 0.12, pz)
      group.add(pole, arm, head, glow, pool)
    }
  }
  scene.add(group)
}

function buildSky(scene) {
  // gradient dome
  const skyTex = canvasTexture(16, 512, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, 0, h)
    g.addColorStop(0, '#01020a')
    g.addColorStop(0.55, '#060a1e')
    g.addColorStop(0.82, '#0d1330')
    g.addColorStop(1, '#1a1f42')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, w, h)
  })
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(900, 32, 18),
    new THREE.MeshBasicMaterial({ map: skyTex, side: THREE.BackSide, fog: false, depthWrite: false })
  )
  dome.renderOrder = -10
  scene.add(dome)

  const starCount = 900
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
    opacity: 0.75,
    fog: false
  })
  scene.add(new THREE.Points(geo, mat))

  const moon = glowSprite(0xdfe8ff, 90, 0.5)
  moon.material.fog = false
  moon.position.set(-260, 220, -420)
  scene.add(moon)
}

function buildCars(scene, lanes) {
  const cars = []
  // only route cars along comfortably long unbroken stretches of road
  const usable = lanes.filter((l) => l.t1 - l.t0 >= 60)
  if (!usable.length) return cars
  const totalLen = usable.reduce((s, l) => s + (l.t1 - l.t0), 0)
  function pickLane() {
    let r = Math.random() * totalLen
    for (const l of usable) {
      r -= l.t1 - l.t0
      if (r <= 0) return l
    }
    return usable[usable.length - 1]
  }
  const bodyGeo = new THREE.BoxGeometry(2.4, 0.65, 1.25)
  const cabinGeo = new THREE.BoxGeometry(1.3, 0.5, 1.05)
  const palette = [0xb8c4d8, 0x76502e, 0x384556, 0x6e2430, 0x2c3e30, 0x8890a0]
  const headMat = new THREE.MeshBasicMaterial({ color: 0xfff2cf })
  const tailMat = new THREE.MeshBasicMaterial({ color: 0xff3b30 })
  const lampGeo = new THREE.BoxGeometry(0.08, 0.14, 0.3)

  for (let i = 0; i < 20; i++) {
    const car = new THREE.Group()
    const bodyMat = std({ color: palette[i % palette.length], roughness: 0.35, metalness: 0.6 })
    const body = new THREE.Mesh(bodyGeo, bodyMat)
    body.position.y = 0.5
    const cabin = new THREE.Mesh(cabinGeo, std({ color: 0x0d1018, roughness: 0.2, metalness: 0.4 }))
    cabin.position.set(-0.15, 1.0, 0)
    body.castShadow = true
    for (const s of [-1, 1]) {
      const hl = new THREE.Mesh(lampGeo, headMat)
      hl.position.set(1.22, 0.5, 0.4 * s)
      const tl = new THREE.Mesh(lampGeo, tailMat)
      tl.position.set(-1.22, 0.5, 0.4 * s)
      car.add(hl, tl)
    }
    const headGlow = glowSprite(0xffe9b8, 2.6, 0.5)
    headGlow.position.set(1.7, 0.5, 0)
    car.add(body, cabin, headGlow)

    const laneDef = pickLane()
    const vertical = laneDef.vertical
    const dir = Math.random() > 0.5 ? 1 : -1
    const lane = 1.6 * dir
    car.userData = {
      vertical,
      dir,
      speed: rand(9, 16),
      fixed: laneDef.p + lane,
      t: rand(laneDef.t0 + 4, laneDef.t1 - 4),
      t0: laneDef.t0 + 3,
      t1: laneDef.t1 - 3
    }
    // face the direction of travel
    car.rotation.y = vertical
      ? (dir === 1 ? -Math.PI / 2 : Math.PI / 2)
      : (dir === 1 ? 0 : Math.PI)
    scene.add(car)
    cars.push(car)
  }
  return cars
}

// ---------------------------------------------------------------------------
// Landmarks
// ---------------------------------------------------------------------------

function landmarkSportsField() {
  const g = new THREE.Group()

  // grass pitch with painted lines + mow stripes
  const grass = pbrMaps('Grass004', 5, 3)
  const pitch = new THREE.Mesh(
    new THREE.PlaneGeometry(32, 20),
    std({ ...grass, color: 0x9fbf8a, roughness: 1 })
  )
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

  const poleMat = std({ color: 0x232a3a, roughness: 0.5, metalness: 0.6 })
  const headMat = new THREE.MeshBasicMaterial({ color: 0xf2f7ff })
  const beamMat = new THREE.MeshBasicMaterial({
    color: 0x9fc4ff,
    transparent: true,
    opacity: 0.08,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide
  })

  for (const [sx, sz] of [[-1, -1], [-1, 1], [1, -1], [1, 1]]) {
    const x = 17 * sx
    const z = 11.5 * sz
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.34, 13, 8), poleMat)
    pole.position.set(x, 6.5, z)
    pole.castShadow = true
    g.add(pole)

    // 2x3 floodlight panel
    const panel = new THREE.Group()
    for (let r = 0; r < 2; r++) {
      for (let c = 0; c < 3; c++) {
        const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.25), headMat)
        lamp.position.set((c - 1) * 0.62, r * 0.62, 0)
        panel.add(lamp)
      }
    }
    panel.position.set(x, 13, z)
    panel.lookAt(0, 0, 0)
    g.add(panel)

    const glow = glowSprite(0xcfe4ff, 8, 0.85)
    glow.position.set(x, 13.3, z)
    g.add(glow)

    // light cone aimed at pitch centre
    const beam = new THREE.Mesh(new THREE.ConeGeometry(7, 17, 24, 1, true), beamMat)
    beam.position.set(x, 13, z)
    const target = new THREE.Vector3(x * 0.15, 0, z * 0.15)
    const dir = target.clone().sub(beam.position).normalize()
    const axis = new THREE.Vector3(0, -1, 0)
    beam.quaternion.setFromUnitVectors(axis, dir)
    beam.translateY(-8.5)
    g.add(beam)

    const pool = lightPool(0xcfe4ff, 20, 0.12)
    pool.position.set(x * 0.4, 0.18, z * 0.4)
    g.add(pool)
  }
  return { group: g, radius: 22, height: 15 }
}

function landmarkStadium() {
  const g = new THREE.Group()

  // stadium bowl via lathe profile
  const pts = [
    new THREE.Vector2(15, 0),
    new THREE.Vector2(17.5, 3.5),
    new THREE.Vector2(19, 7),
    new THREE.Vector2(17.8, 7.4),
    new THREE.Vector2(15.8, 3.6),
    new THREE.Vector2(13.6, 0.6)
  ]
  const bowl = new THREE.Mesh(
    new THREE.LatheGeometry(pts, 48),
    std({ color: 0x3c4763, roughness: 0.6, metalness: 0.25, side: THREE.DoubleSide })
  )
  bowl.scale.z = 0.78
  bowl.castShadow = true
  g.add(bowl)

  const grass = pbrMaps('Grass004', 3, 3)
  const inner = new THREE.Mesh(
    new THREE.CircleGeometry(13, 40),
    std({ ...grass, color: 0xc0dca6, emissive: 0x1c4a28, emissiveIntensity: 0.35, roughness: 1 })
  )
  inner.rotation.x = -Math.PI / 2
  inner.position.y = 0.3
  inner.scale.y = 0.78 // matches bowl squash (circle local Y maps to world Z)
  g.add(inner)

  // rim lighting band
  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(18.4, 0.28, 8, 64),
    new THREE.MeshBasicMaterial({ color: 0x7fd4ff })
  )
  rim.rotation.x = Math.PI / 2
  rim.scale.y = 0.78
  rim.position.y = 7.3
  g.add(rim)

  const glowInner = glowSprite(0x9fe0b5, 15, 0.16)
  glowInner.position.y = 4
  g.add(glowInner)

  // scoreboard
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
    new THREE.PlaneGeometry(11, 3.4),
    new THREE.MeshBasicMaterial({ map: boardTex })
  )
  board.position.set(0, 10.6, -13.2)
  g.add(board)
  const boardPole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.2, 0.25, 9, 6),
    std({ color: 0x1a2030 })
  )
  boardPole.position.set(0, 4.5, -13.2)
  g.add(boardPole)

  return { group: g, radius: 21, height: 12 }
}

function landmarkChessPark() {
  const g = new THREE.Group()

  // paved park circle under the board
  const paving = pbrMaps('PavingStones138', 6, 6)
  const plaza = new THREE.Mesh(
    new THREE.CircleGeometry(15, 40),
    std({ ...paving, color: 0x777e94, roughness: 1 })
  )
  plaza.rotation.x = -Math.PI / 2
  plaza.position.y = 0.1
  plaza.receiveShadow = true
  g.add(plaza)

  const boardTex = canvasTexture(256, 256, (ctx) => {
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        ctx.fillStyle = (r + c) % 2 ? '#131722' : '#c9cede'
        ctx.fillRect(c * 32, r * 32, 32, 32)
      }
    }
  })
  const board = new THREE.Mesh(
    new THREE.BoxGeometry(18, 0.6, 18),
    std({ color: 0xffffff, map: boardTex, emissive: 0x556, emissiveIntensity: 0.12, roughness: 0.4 })
  )
  board.position.y = 0.4
  board.receiveShadow = true
  g.add(board)

  const white = std({ color: 0xd9dcea, roughness: 0.35, metalness: 0.1 })
  const black = std({ color: 0x1a1e2c, roughness: 0.35, metalness: 0.2 })

  function pawn(mat) {
    const p = new THREE.Group()
    const base = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.4, 0.7, 20), mat)
    base.position.y = 0.35
    const body = new THREE.Mesh(new THREE.ConeGeometry(1, 2.6, 20), mat)
    body.position.y = 2
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.75, 20, 20), mat)
    head.position.y = 3.5
    p.add(base, body, head)
    return p
  }
  function rook(mat) {
    const p = new THREE.Group()
    const base = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.5, 0.7, 20), mat)
    base.position.y = 0.35
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 1.15, 3.4, 20), mat)
    body.position.y = 2.4
    const top = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.25, 0.6, 20), mat)
    top.position.y = 4.3
    p.add(base, body, top)
    for (let i = 0; i < 5; i++) {
      const cren = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.55, 0.45), mat)
      const a = (i / 5) * Math.PI * 2
      cren.position.set(Math.cos(a) * 0.95, 4.85, Math.sin(a) * 0.95)
      p.add(cren)
    }
    return p
  }
  function king(mat) {
    const p = new THREE.Group()
    const base = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.7, 0.8, 20), mat)
    base.position.y = 0.4
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 1.25, 4.4, 20), mat)
    body.position.y = 3
    const collar = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.05, 0.4, 20), mat)
    collar.position.y = 5.3
    const crossV = new THREE.Mesh(new THREE.BoxGeometry(0.3, 1.3, 0.3), mat)
    crossV.position.y = 6.3
    const crossH = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.3, 0.3), mat)
    crossH.position.y = 6.45
    p.add(base, body, collar, crossV, crossH)
    return p
  }

  const pieces = [
    [king(white), -2.5, 2.5],
    [rook(black), 3, -3],
    [pawn(white), 5.5, 3],
    [pawn(black), -5.5, -4.5],
    [rook(white), -7, 5]
  ]
  for (const [piece, x, z] of pieces) {
    piece.position.set(x, 0.7, z)
    shadowify(piece)
    g.add(piece)
  }

  const glow = glowSprite(0xbac6ff, 20, 0.2)
  glow.position.y = 4
  g.add(glow)
  return { group: g, radius: 15, height: 8 }
}

function landmarkEsportsArena() {
  const g = new THREE.Group()

  const wallTex = facadeTexture(5, 9, 'cool')
  const wall = std({
    color: 0xffffff,
    map: wallTex,
    emissive: 0xffffff,
    emissiveMap: wallTex,
    emissiveIntensity: 0.9,
    roughness: 0.55
  })
  const roof = std({ color: 0x151322, roughness: 0.5, metalness: 0.3 })
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(22, 12, 16),
    [wall, wall, roof, roof, wall, wall]
  )
  body.position.y = 6
  body.castShadow = true
  g.add(body)

  // neon roof trim
  const trimMat = new THREE.MeshBasicMaterial({ color: 0xff4fd8 })
  const trims = [
    [22.4, 0.3, 0.3, 0, 12.1, 8.05],
    [22.4, 0.3, 0.3, 0, 12.1, -8.05],
    [0.3, 0.3, 16.4, 11.05, 12.1, 0],
    [0.3, 0.3, 16.4, -11.05, 12.1, 0],
    // vertical corner accents
    [0.3, 12.2, 0.3, 11.05, 6, 8.05],
    [0.3, 12.2, 0.3, -11.05, 6, 8.05],
    [0.3, 12.2, 0.3, 11.05, 6, -8.05],
    [0.3, 12.2, 0.3, -11.05, 6, -8.05]
  ]
  for (const [w, h, d, x, y, z] of trims) {
    const t = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), trimMat)
    t.position.set(x, y, z)
    g.add(t)
  }

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
  const screen = new THREE.Mesh(
    new THREE.PlaneGeometry(18, 10),
    new THREE.MeshBasicMaterial({ map: screenTex })
  )
  screen.position.set(0, 7, 8.06)
  g.add(screen)

  const pool = lightPool(0xff4fd8, 26, 0.1)
  pool.position.set(0, 0.14, 12)
  g.add(pool)

  const glow = glowSprite(0xff4fd8, 24, 0.28)
  glow.position.y = 10
  g.add(glow)
  return { group: g, radius: 17, height: 14 }
}

function landmarkFinanceTower() {
  const g = new THREE.Group()

  const tex = facadeTexture(26, 8, 'cool')
  const side = std({
    color: 0xffffff,
    map: tex,
    emissive: 0xffffff,
    emissiveMap: tex,
    emissiveIntensity: 1.05,
    roughness: 0.6
  })
  const cap = std({ color: 0x11141f })
  const tower = new THREE.Mesh(new THREE.BoxGeometry(13, 52, 13), [side, side, cap, cap, side, side])
  tower.position.y = 26
  tower.castShadow = true
  g.add(tower)

  const crown = new THREE.Mesh(
    new THREE.BoxGeometry(13.4, 1.2, 13.4),
    new THREE.MeshBasicMaterial({ color: 0x6ee7a0 })
  )
  crown.position.y = 52.6
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
  const chart = new THREE.Mesh(
    new THREE.PlaneGeometry(11, 46),
    new THREE.MeshBasicMaterial({ map: chartTex, transparent: true })
  )
  chart.position.set(0, 27, 6.6)
  g.add(chart)

  // little suburb beside the tower (the "pathways" part)
  const houseBody = std({ color: 0x232838, roughness: 0.8 })
  const roofMat = std({ color: 0x3a3040, roughness: 0.9 })
  const winMat = new THREE.MeshBasicMaterial({ color: 0xffd28a })
  for (let i = 0; i < 6; i++) {
    const hx = -14 - (i % 3) * 7
    const hz = -4 + Math.floor(i / 3) * 9
    const house = new THREE.Group()
    const b = new THREE.Mesh(new THREE.BoxGeometry(4.2, 3, 4.2), houseBody)
    b.position.y = 1.5
    b.castShadow = true
    const roof = new THREE.Mesh(new THREE.ConeGeometry(3.4, 2.2, 4), roofMat)
    roof.position.y = 4.1
    roof.rotation.y = Math.PI / 4
    const win = new THREE.Mesh(new THREE.PlaneGeometry(1, 0.8), winMat)
    win.position.set(0, 1.6, 2.11)
    house.add(b, roof, win)
    house.position.set(hx, 0, hz)
    g.add(house)
  }

  const glow = glowSprite(0x6ee7a0, 20, 0.3)
  glow.position.y = 53
  g.add(glow)
  return { group: g, radius: 20, height: 54 }
}

function landmarkDataHub() {
  const g = new THREE.Group()

  const hub = new THREE.Mesh(
    new THREE.CylinderGeometry(6, 7, 7, 8),
    std({ color: 0x101828, emissive: 0x41e6ff, emissiveIntensity: 0.08, roughness: 0.45, metalness: 0.4 })
  )
  hub.position.y = 3.5
  hub.castShadow = true
  g.add(hub)

  const bandMat = new THREE.MeshBasicMaterial({ color: 0x41e6ff })
  for (const y of [1.6, 3.5, 5.4]) {
    const band = new THREE.Mesh(new THREE.TorusGeometry(6.4 - (y - 3.5) * 0.25, 0.12, 6, 32), bandMat)
    band.rotation.x = Math.PI / 2
    band.position.y = y
    g.add(band)
  }

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

function landmarkHQ() {
  const g = new THREE.Group()

  const tex = facadeTexture(11)
  const side = std({
    color: 0xffffff,
    map: tex,
    emissive: 0xffffff,
    emissiveMap: tex,
    emissiveIntensity: 1.05,
    roughness: 0.65
  })
  const cap = std({ color: 0x11141f })
  const b = new THREE.Mesh(new THREE.BoxGeometry(15, 22, 15), [side, side, cap, cap, side, side])
  b.position.y = 11
  b.castShadow = true
  g.add(b)

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

function buildDrone() {
  const g = new THREE.Group()
  const bodyMat = std({ color: 0x2a3248, roughness: 0.35, metalness: 0.55 })
  const darkMat = std({ color: 0x11141f, roughness: 0.5, metalness: 0.3 })

  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.8, 0.55, 8), bodyMat)
  const canopy = new THREE.Mesh(new THREE.SphereGeometry(0.5, 12, 8), darkMat)
  canopy.position.y = 0.35
  canopy.scale.set(1.2, 0.6, 1.2)
  // camera gimbal
  const gimbal = new THREE.Mesh(new THREE.SphereGeometry(0.34, 12, 12), darkMat)
  gimbal.position.y = -0.42
  const lens = new THREE.Mesh(
    new THREE.CylinderGeometry(0.14, 0.14, 0.16, 10),
    new THREE.MeshBasicMaterial({ color: 0x9adcff })
  )
  lens.rotation.x = Math.PI / 2.4
  lens.position.set(0, -0.48, 0.28)
  g.add(body, canopy, gimbal, lens)

  const rotors = []
  for (const [sx, sz] of [[-1, -1], [-1, 1], [1, -1], [1, 1]]) {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.14, 0.22), bodyMat)
    arm.position.set(sx * 1.05, 0.08, sz * 1.05)
    arm.rotation.y = -Math.atan2(sz, sx)
    g.add(arm)
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, 0.34, 8), darkMat)
    hub.position.set(sx * 1.7, 0.18, sz * 1.7)
    g.add(hub)
    const rotor = new THREE.Mesh(
      new THREE.CylinderGeometry(0.85, 0.85, 0.04, 20),
      new THREE.MeshBasicMaterial({ color: 0xaab6d4, transparent: true, opacity: 0.3, depthWrite: false })
    )
    rotor.position.set(sx * 1.7, 0.34, sz * 1.7)
    g.add(rotor)
    rotors.push(rotor)
    // nav light: red left, green right
    const navCol = sx < 0 ? 0xff4040 : 0x3dff70
    const nav = new THREE.Mesh(new THREE.SphereGeometry(0.09, 6, 6), new THREE.MeshBasicMaterial({ color: navCol }))
    nav.position.set(sx * 1.7, 0.02, sz * 1.7)
    g.add(nav)
  }

  const glow = glowSprite(0x67e08a, 4, 0.55)
  g.add(glow)

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

  g.scale.setScalar(1.9)
  return { group: g, rotors }
}

// ---------------------------------------------------------------------------
// Assembly
// ---------------------------------------------------------------------------

export function buildCity(scene) {
  scene.background = new THREE.Color(0x02030a)
  scene.fog = new THREE.FogExp2(0x05070f, 0.0026)

  scene.add(new THREE.AmbientLight(0x465078, 1.15))
  const hemi = new THREE.HemisphereLight(0x40507e, 0x10131c, 0.95)
  scene.add(hemi)
  const moonLight = new THREE.DirectionalLight(0x93a7ff, 1.4)
  moonLight.position.set(-120, 160, -80)
  moonLight.castShadow = true
  moonLight.shadow.mapSize.set(2048, 2048)
  moonLight.shadow.camera.left = -170
  moonLight.shadow.camera.right = 170
  moonLight.shadow.camera.top = 170
  moonLight.shadow.camera.bottom = -170
  moonLight.shadow.camera.near = 20
  moonLight.shadow.camera.far = 520
  moonLight.shadow.bias = -0.0006
  scene.add(moonLight)

  buildGround(scene)
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
      plaza: 16
    },
    {
      key: 'sportslux',
      build: landmarkSportsField,
      x: -72, z: 42, rot: 0.4,
      label: 'Sportslux',
      sub: 'Sports lighting optimiser',
      route: '/projects/sportslux',
      color: 0x9fc4ff,
      plaza: 26,
      plazaType: 'grass'
    },
    {
      key: 'sports-booking',
      build: landmarkStadium,
      x: 70, z: 44, rot: -0.3,
      label: 'FrontRunner',
      sub: 'Sports booking platform',
      route: '/projects/sports-booking',
      color: 0x7fd4ff,
      plaza: 24
    },
    {
      key: 'chessEngine',
      build: landmarkChessPark,
      x: -62, z: -56, rot: 0.2,
      label: 'Chess Engine',
      sub: 'C++ engine, 2000+ rated',
      route: '/projects/chessEngine',
      color: 0xd9dcea
    },
    {
      key: 'lol-match-predictor',
      build: landmarkEsportsArena,
      x: 62, z: -58, rot: 0.25,
      label: 'Esports Predictor',
      sub: 'Bayesian match model vs bookmakers',
      route: '/projects/lol-match-predictor',
      color: 0xff4fd8,
      plaza: 19
    },
    {
      key: 'wealth-pathways-au',
      build: landmarkFinanceTower,
      x: 98, z: -6, rot: 0,
      label: 'Wealth Pathways',
      sub: 'Monte Carlo wealth calculator',
      route: '/projects/wealth-pathways-au',
      color: 0x6ee7a0,
      plaza: 14
    },
    {
      key: 'asset-data-integration',
      build: landmarkDataHub,
      x: -98, z: -8, rot: 0,
      label: 'Data Integration',
      sub: 'CMS → asset platform pipeline',
      route: '/projects/asset-data-integration',
      color: 0x41e6ff,
      plaza: 15
    },
    {
      key: 'contact',
      build: landmarkCommsTower,
      x: 4, z: -76, rot: 0,
      label: 'Contact',
      sub: 'Get in touch',
      route: '/contact',
      color: 0xff5c5c,
      plaza: 12
    }
  ]

  const landmarks = []
  const exclusions = []
  let dataHubPulses = []
  let commsBeacon = null

  for (const def of defs) {
    const built = def.build()
    const group = built.group
    group.position.set(def.x, 0, def.z)
    group.rotation.y = def.rot
    scene.add(group)

    // paved (or grassed) precinct so the landmark sits on real ground,
    // and the roads that stop at its edge read as intentional
    if (def.plaza) {
      const maps =
        def.plazaType === 'grass'
          ? pbrMaps('Grass004', def.plaza / 4, def.plaza / 4)
          : pbrMaps('PavingStones138', def.plaza / 2.4, def.plaza / 2.4)
      const plaza = new THREE.Mesh(
        new THREE.CircleGeometry(def.plaza, 48),
        std({
          ...maps,
          color: def.plazaType === 'grass' ? 0x8fb07e : 0x82889e,
          roughness: 1
        })
      )
      plaza.rotation.x = -Math.PI / 2
      plaza.position.set(def.x, 0.06, def.z)
      plaza.receiveShadow = true
      scene.add(plaza)
    }

    if (built.pulses) dataHubPulses = built.pulses
    if (built.beacon) commsBeacon = { beacon: built.beacon, glow: built.beaconGlow }

    const hit = invisibleHitMesh(built.radius, built.height + 6)
    group.add(hit)
    hit.userData.landmarkKey = def.key

    const ring = groundRing(built.radius + 2, def.color)
    ring.position.x = def.x
    ring.position.z = def.z
    scene.add(ring)

    landmarks.push({
      key: def.key,
      label: def.label,
      sub: def.sub,
      route: def.route,
      color: def.color,
      anchor: new THREE.Vector3(def.x, built.height + 7, def.z),
      center: new THREE.Vector3(def.x, built.height * 0.4, def.z),
      front: new THREE.Vector3(Math.sin(def.rot), 0, Math.cos(def.rot)),
      focusRadius: built.radius,
      focusHeight: built.height,
      hitMesh: hit,
      ring
    })
    exclusions.push({ x: def.x, z: def.z, r: built.radius + 8 })
  }

  const lanes = buildRoads(scene, exclusions)
  buildStreetLights(scene, exclusions)
  buildFillerBuildings(scene, exclusions)
  buildTrees(scene, exclusions)
  const cars = buildCars(scene, lanes)

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

  function update(dt, t) {
    // drone loop
    const a = t * 0.12
    const dx = Math.cos(a) * 58
    const dz = Math.sin(a) * 46
    const dy = 30 + Math.sin(t * 0.7) * 2.2
    drone.group.position.set(dx, dy, dz)
    drone.group.rotation.y = -a + Math.PI / 2
    drone.group.rotation.z = Math.sin(t * 0.9) * 0.06
    for (const r of drone.rotors) r.rotation.y += dt * 40
    droneLandmark.anchor.set(dx, dy + 5, dz)
    droneLandmark.center.set(dx, dy, dz)
    droneSpot.position.set(dx, 0.16, dz)

    // cars
    for (const car of cars) {
      const u = car.userData
      u.t += u.speed * u.dir * dt
      if (u.t > u.t1) u.t = u.t0
      if (u.t < u.t0) u.t = u.t1
      if (u.vertical) car.position.set(u.fixed, 0.05, u.t)
      else car.position.set(u.t, 0.05, u.fixed)
    }

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

  return { landmarks, update }
}
