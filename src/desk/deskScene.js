import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import chessModelUrl from '../assets/chess-engine/chess_set.glb?url'
import { TEMPLATE_NAMES } from '../chess/detail/constants.js'
import {
  clonePieceWithTint,
  computeBoardGrid,
  findBoardMesh,
  normalizePieceUprightAndScale,
  placeOnSquare,
  recolorBoard
} from '../chess/detail/boardGeometry.js'

const TAU = Math.PI * 2
const gltfLoader = new GLTFLoader()
const asset = (path) => (import.meta.env.BASE_URL || '/') + path.replace(/^\/+/, '')

function roundedBox(width, height, depth, radius, material) {
  const shape = new THREE.Shape()
  const x = -width / 2
  const y = -height / 2
  shape.moveTo(x + radius, y)
  shape.lineTo(x + width - radius, y)
  shape.quadraticCurveTo(x + width, y, x + width, y + radius)
  shape.lineTo(x + width, y + height - radius)
  shape.quadraticCurveTo(x + width, y + height, x + width - radius, y + height)
  shape.lineTo(x + radius, y + height)
  shape.quadraticCurveTo(x, y + height, x, y + height - radius)
  shape.lineTo(x, y + radius)
  shape.quadraticCurveTo(x, y, x + radius, y)
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelSegments: 3,
    steps: 1,
    bevelSize: Math.min(radius * 0.45, 0.08),
    bevelThickness: 0.05
  })
  geometry.center()
  return new THREE.Mesh(geometry, material)
}

function labelTexture(title, subtitle, accent = '#6658d9', dark = '#24253d') {
  const canvas = document.createElement('canvas')
  canvas.width = 1024
  canvas.height = 640
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = dark
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.fillStyle = accent
  ctx.fillRect(0, 0, 22, canvas.height)
  ctx.fillStyle = 'rgba(255,255,255,.08)'
  for (let y = 70; y < 600; y += 68) ctx.fillRect(72, y, 880, 2)
  ctx.fillStyle = '#f4efe5'
  ctx.font = '700 74px Arial'
  ctx.fillText(title, 78, 150)
  ctx.fillStyle = '#a8adb5'
  ctx.font = '36px monospace'
  ctx.fillText(subtitle, 80, 215)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 4
  return texture
}

function paperTexture(kind) {
  const canvas = document.createElement('canvas')
  canvas.width = 768
  canvas.height = 1024
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#eee8d9'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.strokeStyle = '#d6cdbb'
  ctx.lineWidth = 2
  for (let y = 95; y < 980; y += 46) {
    ctx.beginPath(); ctx.moveTo(50, y); ctx.lineTo(720, y); ctx.stroke()
  }
  ctx.fillStyle = '#202832'
  ctx.font = '700 48px Arial'
  ctx.fillText(kind === 'api' ? 'SYSTEM MAP' : 'OPTIMISATION', 54, 68)
  if (kind === 'api') {
    const boxes = [
      [75, 210, 180, 100, 'CLIENT'], [440, 210, 190, 100, 'API'],
      [260, 500, 210, 100, 'WORKER'], [90, 760, 200, 100, 'CMS'],
      [480, 760, 190, 100, 'ASSETS']
    ]
    ctx.lineWidth = 12
    ctx.strokeStyle = '#6555d9'
    boxes.forEach(([x, y, w, h, text]) => {
      ctx.fillStyle = '#fffaf0'; ctx.fillRect(x, y, w, h)
      ctx.strokeRect(x, y, w, h)
      ctx.fillStyle = '#242a31'; ctx.font = '700 25px monospace'; ctx.fillText(text, x + 20, y + 60)
    })
    ctx.beginPath(); ctx.moveTo(255, 260); ctx.lineTo(440, 260); ctx.lineTo(365, 500)
    ctx.moveTo(260, 600); ctx.lineTo(190, 760); ctx.moveTo(470, 600); ctx.lineTo(570, 760); ctx.stroke()
  } else {
    ctx.strokeStyle = '#6555d9'; ctx.lineWidth = 14; ctx.lineCap = 'round'; ctx.lineJoin = 'round'
    ctx.beginPath(); ctx.moveTo(80, 840)
    ;[[155, 760], [240, 790], [330, 620], [420, 655], [520, 420], [665, 260]].forEach(([x, y]) => ctx.lineTo(x, y))
    ctx.stroke()
    ctx.strokeStyle = '#334a62'; ctx.lineWidth = 10
    ctx.beginPath(); ctx.moveTo(80, 880)
    ;[[170, 820], [270, 730], [380, 735], [500, 610], [665, 540]].forEach(([x, y]) => ctx.lineTo(x, y))
    ctx.stroke()
    ctx.fillStyle = '#6555d9'; ctx.font = '700 32px monospace'; ctx.fillText('min(error) = 0.024', 70, 150)
  }
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 4
  return texture
}

function addRoute(group, route, label, clickables) {
  group.userData.route = route
  group.userData.label = label
  group.traverse((child) => {
    if (child.isMesh) {
      child.userData.route = route
      child.userData.label = label
      clickables.push(child)
    }
  })
}

function makeDrone(materials) {
  const g = new THREE.Group()
  const body = roundedBox(1.45, 0.8, 0.32, 0.24, materials.orange)
  body.rotation.x = -Math.PI / 2; body.position.y = 0.42; g.add(body)
  const hub = new THREE.Mesh(new THREE.SphereGeometry(0.35, 24, 12), materials.charcoal)
  hub.scale.set(1.2, 0.45, 0.8); hub.position.y = 0.72; g.add(hub)
  const arms = [[-0.95, -0.72], [0.95, -0.72], [-0.95, 0.72], [0.95, 0.72]]
  arms.forEach(([x, z]) => {
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 1.18, 10), materials.metal)
    arm.position.set(x * 0.48, 0.55, z * 0.48); arm.rotation.z = Math.PI / 2
    arm.rotation.y = Math.atan2(z, x); g.add(arm)
    const motor = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.24, 0.24, 16), materials.charcoal)
    motor.position.set(x, 0.52, z); g.add(motor)
    const rotor = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.025, 6, 36), materials.orange)
    rotor.rotation.x = Math.PI / 2; rotor.position.set(x, 0.68, z); g.add(rotor)
    const blade = new THREE.Mesh(new THREE.BoxGeometry(1.08, 0.025, 0.085), materials.metal)
    blade.position.set(x, 0.7, z); blade.rotation.y = (x + z) * 0.8; g.add(blade)
  })
  return g
}

function makeChess(materials) {
  const g = new THREE.Group()
  const board = roundedBox(3.05, 3.05, 0.18, 0.12, materials.woodDark)
  board.rotation.x = -Math.PI / 2; board.position.y = 0.2; g.add(board)
  const tileGeo = new THREE.BoxGeometry(0.34, 0.07, 0.34)
  for (let x = 0; x < 8; x++) for (let z = 0; z < 8; z++) {
    const tile = new THREE.Mesh(tileGeo, (x + z) % 2 ? materials.cream : materials.blue)
    tile.position.set((x - 3.5) * 0.34, 0.34, (z - 3.5) * 0.34); g.add(tile)
  }
  const positions = [[-1.18, -1.18], [-0.5, -1.18], [0.18, -0.84], [0.86, -1.18], [-0.84, 1.18], [0.52, 0.84], [1.18, 1.18]]
  positions.forEach(([x, z], i) => {
    const dark = i > 3
    const pawn = new THREE.Group()
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.2, 0.12, 16), dark ? materials.charcoal : materials.cream)
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.1, i === 2 || i === 5 ? 0.42 : 0.25, 12), dark ? materials.charcoal : materials.cream)
    const head = new THREE.Mesh(new THREE.SphereGeometry(i === 2 || i === 5 ? 0.14 : 0.1, 16, 8), dark ? materials.charcoal : materials.cream)
    base.position.y = 0.43; stem.position.y = 0.58; head.position.y = i === 2 || i === 5 ? 0.83 : 0.72
    pawn.add(base, stem, head); pawn.position.set(x, 0, z); g.add(pawn)
  })
  return g
}

function makeNotebook(materials) {
  const g = new THREE.Group()
  const cover = roundedBox(2.35, 3.1, 0.14, 0.12, materials.red)
  cover.rotation.x = -Math.PI / 2; cover.position.y = 0.22; g.add(cover)
  const pageMat = new THREE.MeshStandardMaterial({ map: labelTexture('WEALTH', 'Monte Carlo / 30 years', '#e6a43b', '#f3eedf'), roughness: 0.92 })
  const page = new THREE.Mesh(new THREE.BoxGeometry(2.12, 0.06, 2.85), pageMat)
  page.position.set(0.08, 0.34, 0); g.add(page)
  for (let z = -1.25; z < 1.3; z += 0.28) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.085, 0.018, 6, 14, Math.PI), materials.metal)
    ring.position.set(-1.12, 0.45, z); ring.rotation.x = Math.PI / 2; ring.rotation.z = Math.PI / 2; g.add(ring)
  }
  const pencil = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 2.7, 8), materials.orange)
  pencil.rotation.z = Math.PI / 2; pencil.rotation.y = 0.2; pencil.position.set(0.4, 0.48, -1.05); g.add(pencil)
  return g
}

function makeCircuit(materials) {
  const g = new THREE.Group()
  const pcb = roundedBox(3.2, 2.25, 0.12, 0.12, materials.green)
  pcb.rotation.x = -Math.PI / 2; pcb.position.y = 0.25; g.add(pcb)
  const traces = [[-1.3, -0.75, 2.0, 0.04], [-1.1, 0.78, 1.8, 0.04], [0.8, 0.25, 1.2, 0.04], [-0.5, -0.15, 1.7, 0.04]]
  traces.forEach(([x, z, w, d], i) => {
    const trace = new THREE.Mesh(new THREE.BoxGeometry(w, 0.025, d), materials.copper)
    trace.position.set(x + w / 2, 0.34, z); if (i > 1) trace.rotation.y = Math.PI / 2; g.add(trace)
  })
  ;[[-0.72, 0], [0.65, -0.55], [0.78, 0.58]].forEach(([x, z], i) => {
    const chip = new THREE.Mesh(new THREE.BoxGeometry(i ? 0.55 : 0.95, 0.18, i ? 0.42 : 0.72), materials.charcoal)
    chip.position.set(x, 0.47, z); g.add(chip)
    for (let p = -2; p <= 2; p++) {
      const pin = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.04, 0.06), materials.metal)
      pin.position.set(x + p * 0.13, 0.42, z + (i ? 0.26 : 0.43)); g.add(pin)
    }
  })
  for (let i = 0; i < 9; i++) {
    const led = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.04, 10), i % 3 === 0 ? materials.orangeGlow : materials.copper)
    led.position.set(-1.35 + i * 0.32, 0.37, 0.9); g.add(led)
  }
  return g
}

function makeLaptop(materials) {
  const g = new THREE.Group()
  const screenMat = new THREE.MeshStandardMaterial({ map: labelTexture('FRONTIER', 'BUILD  /  DEFEND  /  EVOLVE'), roughness: 0.45, emissive: '#15130d', emissiveIntensity: 0.6 })
  const screen = roundedBox(4.2, 2.55, 0.18, 0.18, materials.charcoal)
  screen.position.set(0, 2.35, -0.7); g.add(screen)
  const display = new THREE.Mesh(new THREE.PlaneGeometry(3.78, 2.1), screenMat)
  display.position.set(0, 2.36, -0.6); g.add(display)
  const neck = new THREE.Mesh(new THREE.BoxGeometry(0.42, 1.2, 0.38), materials.metal)
  neck.position.set(0, 0.92, -0.72); g.add(neck)
  const foot = roundedBox(1.8, 0.75, 0.12, 0.12, materials.charcoal)
  foot.rotation.x = -Math.PI / 2; foot.position.set(0, 0.22, -0.52); g.add(foot)

  const keyboardBase = roundedBox(3.45, 1.25, 0.12, 0.12, materials.cream)
  keyboardBase.rotation.x = -Math.PI / 2; keyboardBase.position.set(-0.25, 0.26, 1.08); g.add(keyboardBase)
  for (let row = 0; row < 4; row++) for (let col = 0; col < 12; col++) {
    const accent = (row === 0 && col > 8) || (row === 3 && col > 9)
    const key = new THREE.Mesh(new THREE.BoxGeometry(0.21, 0.045, 0.19), accent ? materials.orange : materials.keyLight)
    key.position.set(-1.4 + col * 0.245, 0.36, 0.72 + row * 0.245); g.add(key)
  }
  const mouse = roundedBox(0.55, 0.82, 0.16, 0.22, materials.cream)
  mouse.rotation.x = -Math.PI / 2; mouse.position.set(2.05, 0.26, 1.18); g.add(mouse)
  return g
}

function makePaper(kind, materials) {
  const g = new THREE.Group()
  const paperMat = new THREE.MeshStandardMaterial({ map: paperTexture(kind), roughness: 0.95 })
  const sheet = roundedBox(2.65, 3.45, 0.05, 0.04, paperMat)
  sheet.rotation.x = -Math.PI / 2; sheet.position.y = 0.26; g.add(sheet)
  const clip = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.12, 0.28), materials.metal)
  clip.position.set(0, 0.38, -1.62); g.add(clip)
  return g
}

function makeMug(materials) {
  const g = new THREE.Group()
  const mug = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.56, 1.05, 32, 1, true), materials.cream)
  mug.position.y = 0.72; g.add(mug)
  const coffee = new THREE.Mesh(new THREE.CircleGeometry(0.55, 32), materials.coffee)
  coffee.rotation.x = -Math.PI / 2; coffee.position.y = 1.24; g.add(coffee)
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.43, 0.11, 10, 24, Math.PI * 1.35), materials.cream)
  handle.rotation.y = Math.PI / 2; handle.rotation.z = -0.68; handle.position.set(0.58, 0.75, 0); g.add(handle)
  const coaster = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.85, 0.06, 32), materials.blue)
  coaster.position.y = 0.16; g.add(coaster)
  return g
}

function makePlant(materials) {
  const g = new THREE.Group()
  const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.34, 0.72, 6), materials.cream)
  pot.position.y = 0.48; g.add(pot)
  const soil = new THREE.Mesh(new THREE.CircleGeometry(0.41, 16), materials.coffee)
  soil.rotation.x = -Math.PI / 2; soil.position.y = 0.85; g.add(soil)
  ;[
    [-0.22, 1.28, -0.12, -0.55], [0.2, 1.4, 0.04, 0.5], [0, 1.65, -0.08, 0.05],
    [-0.34, 1.58, 0.1, -0.75], [0.34, 1.72, -0.02, 0.72], [-0.08, 1.95, 0.08, -0.2]
  ].forEach(([x, y, z, r], i) => {
    const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.28 + (i % 2) * 0.05, 0.9, 4), materials.plant)
    leaf.position.set(x, y, z); leaf.rotation.z = r; leaf.scale.z = 0.45; g.add(leaf)
  })
  return g
}

function makeBookStack(materials) {
  const g = new THREE.Group()
  ;[
    [0, 0.13, 0, 1.85, 0.18, 1.15, materials.blue],
    [0.08, 0.33, -0.02, 1.65, 0.18, 1.05, materials.cream],
    [-0.04, 0.53, 0.03, 1.72, 0.2, 1.08, materials.orange]
  ].forEach(([x, y, z, w, h, d, material], i) => {
    const book = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material)
    book.rotation.y = (i - 1) * 0.07
    book.position.set(x, y, z)
    g.add(book)
  })
  return g
}

function makeDeskLamp(materials) {
  const g = new THREE.Group()
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.95, 0.18, 24), materials.charcoal)
  base.position.y = 0.15; g.add(base)
  const lower = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 2.8, 12), materials.metal)
  lower.position.set(0, 1.45, 0); lower.rotation.z = -0.12; g.add(lower)
  const upper = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 2.5, 12), materials.metal)
  upper.position.set(-0.75, 3.45, 0.05); upper.rotation.z = 0.72; g.add(upper)
  const joint = new THREE.Mesh(new THREE.SphereGeometry(0.18, 16, 8), materials.orange)
  joint.position.set(-0.16, 2.82, 0.03); g.add(joint)
  const shade = new THREE.Mesh(new THREE.ConeGeometry(0.72, 1.05, 20, 1, true), materials.charcoal)
  shade.position.set(-1.62, 4.18, 0.08); shade.rotation.z = -0.78; g.add(shade)
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.24, 16, 8), materials.lampGlow)
  bulb.position.set(-1.95, 3.84, 0.08); g.add(bulb)
  return g
}

function makeRgbBar(material) {
  const g = new THREE.Group()
  const housing = roundedBox(3.8, 0.24, 0.2, 0.09, material)
  housing.rotation.x = -Math.PI / 2; housing.position.y = 0.12; g.add(housing)
  return g
}

function makeHitBox(width, height, depth) {
  const hit = new THREE.Mesh(
    new THREE.BoxGeometry(width, height, depth),
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })
  )
  hit.position.y = height / 2
  return hit
}

function makeGlbProp(path, footprint, rotationY = 0) {
  const g = new THREE.Group()
  gltfLoader.load(asset(path), (gltf) => {
    const root = gltf.scene.clone(true)
    const box = new THREE.Box3().setFromObject(root)
    const size = box.getSize(new THREE.Vector3())
    root.scale.multiplyScalar(footprint / Math.max(size.x, size.z))
    root.updateMatrixWorld(true)
    const fitted = new THREE.Box3().setFromObject(root)
    const center = fitted.getCenter(new THREE.Vector3())
    root.position.set(-center.x, -fitted.min.y, -center.z)
    root.rotation.y = rotationY
    root.traverse((node) => {
      if (!node.isMesh) return
      node.castShadow = true
      node.receiveShadow = true
      node.frustumCulled = false
    })
    g.add(root)
  }, undefined, (error) => console.error('desk prop model failed', path, error))
  return g
}

function makeDroneModel() {
  const g = new THREE.Group()
  g.userData.rotors = []
  g.add(makeHitBox(3.4, 1.8, 3.4))
  gltfLoader.load(asset('models/drone.glb'), (gltf) => {
    const root = gltf.scene.clone(true)
    const box = new THREE.Box3().setFromObject(root)
    const size = box.getSize(new THREE.Vector3())
    root.scale.multiplyScalar(3.2 / Math.max(size.x, size.z))
    root.updateMatrixWorld(true)
    const fitted = new THREE.Box3().setFromObject(root)
    const center = fitted.getCenter(new THREE.Vector3())
    root.position.x -= center.x
    root.position.z -= center.z
    root.position.y -= fitted.min.y
    root.rotation.y = -0.35
    root.traverse((node) => {
      if (!node.isMesh) return
      node.castShadow = true
      node.receiveShadow = true
      node.frustumCulled = false
      if (node.material) {
        node.material = node.material.clone()
        node.material.roughness = 0.42
        node.material.metalness = Math.max(node.material.metalness || 0, 0.08)
      }
    })
    for (const [index, name] of ['Rotor_FL', 'Rotor_FR', 'Rotor_BL', 'Rotor_BR'].entries()) {
      const rotor = root.getObjectByName(name)
      if (rotor) g.userData.rotors.push({ rotor, direction: index % 2 ? -1 : 1 })
    }
    g.add(root)
  }, undefined, (error) => console.error('desk drone model failed', error))
  return g
}

function makeChessModel() {
  const g = new THREE.Group()
  g.add(makeHitBox(3.8, 1.8, 3.8))
  gltfLoader.load(chessModelUrl, (gltf) => {
    const model = new THREE.Group()
    const root = gltf.scene.clone(true)
    model.add(root)
    root.updateMatrixWorld(true)
    const board = findBoardMesh(root)
    if (!board) throw new Error('chess_set.glb has no board mesh')
    const boardInfo = computeBoardGrid(board, new THREE.Vector3(0, 1, 0))
    recolorBoard(root, boardInfo.squareSize)

    const templates = {}
    for (const [type, name] of Object.entries(TEMPLATE_NAMES)) {
      const template = root.getObjectByName(name)
      if (!template) throw new Error('chess_set.glb is missing template ' + name)
      templates[type] = template
      template.visible = false
    }

    const pieces = new THREE.Group()
    model.add(pieces)
    const addPiece = (type, color, file, rank) => {
      const piece = clonePieceWithTint(templates[type], color)
      normalizePieceUprightAndScale(piece, boardInfo.squareSize, color)
      placeOnSquare(piece, boardInfo, file, rank, color)
      piece.traverse((node) => {
        if (node.isMesh) {
          node.castShadow = true
          node.receiveShadow = true
          node.frustumCulled = false
        }
      })
      pieces.add(piece)
    }
    const backRank = ['rook', 'knight', 'bishop', 'queen', 'king', 'bishop', 'knight', 'rook']
    backRank.forEach((type, file) => {
      addPiece(type, 'white', file, 0)
      addPiece(type, 'black', file, 7)
    })
    for (let file = 0; file < 8; file++) {
      addPiece('pawn', 'white', file, 1)
      addPiece('pawn', 'black', file, 6)
    }

    const boardBox = new THREE.Box3().setFromObject(board)
    const boardSize = boardBox.getSize(new THREE.Vector3())
    model.scale.multiplyScalar(3.45 / Math.max(boardSize.x, boardSize.z))
    model.updateMatrixWorld(true)
    const fittedBoard = new THREE.Box3().setFromObject(board)
    const center = fittedBoard.getCenter(new THREE.Vector3())
    model.position.x -= center.x
    model.position.z -= center.z
    model.position.y += 0.08 - fittedBoard.min.y
    root.traverse((node) => {
      if (node.isMesh) {
        node.castShadow = true
        node.receiveShadow = true
        node.frustumCulled = false
      }
    })
    g.add(model)
  }, undefined, (error) => console.error('desk chess model failed', error))
  return g
}

function makeStationery(materials) {
  const g = new THREE.Group()
  const ruler = roundedBox(2.7, 0.34, 0.07, 0.05, materials.ruler)
  ruler.rotation.x = -Math.PI / 2; ruler.rotation.z = 0.16; ruler.position.set(0, 0.13, 0); g.add(ruler)
  ;[-0.22, 0.08, 0.38].forEach((z, i) => {
    const pencil = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 2.2 - i * 0.18, 8), i === 1 ? materials.blue : materials.orange)
    pencil.rotation.z = Math.PI / 2; pencil.rotation.y = -0.12 + i * 0.08
    pencil.position.set(0.15, 0.19 + i * 0.01, z); g.add(pencil)
  })
  return g
}

function makeHeadphones(materials) {
  const g = new THREE.Group()
  const band = new THREE.Mesh(new THREE.TorusGeometry(0.92, 0.11, 10, 28, Math.PI * 1.35), materials.charcoal)
  band.rotation.x = -Math.PI / 2; band.rotation.z = -Math.PI * 0.17; band.position.y = 0.28; g.add(band)
  ;[-0.76, 0.76].forEach((x) => {
    const cup = roundedBox(0.48, 0.72, 0.25, 0.18, materials.orange)
    cup.rotation.x = -Math.PI / 2; cup.position.set(x, 0.24, 0.22); g.add(cup)
  })
  return g
}

function makeMicrophone(materials) {
  const g = new THREE.Group()
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.72, 0.12, 24), materials.charcoal)
  base.position.y = 0.12; g.add(base)
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 1.35, 12), materials.metal)
  stem.position.y = 0.82; g.add(stem)
  const mic = new THREE.Mesh(new THREE.CapsuleGeometry(0.28, 0.68, 8, 14), materials.charcoal)
  mic.position.y = 1.72; mic.rotation.z = -0.18; g.add(mic)
  for (let y = 1.52; y < 1.94; y += 0.13) {
    const grille = new THREE.Mesh(new THREE.TorusGeometry(0.285, 0.018, 5, 18), materials.metal)
    grille.position.y = y; grille.rotation.x = Math.PI / 2; g.add(grille)
  }
  return g
}

function makeOverheadLamp(materials) {
  const g = new THREE.Group()
  const housing = roundedBox(4.6, 0.55, 0.34, 0.14, materials.charcoal)
  housing.position.y = 0; g.add(housing)
  const panel = roundedBox(4.15, 0.28, 0.12, 0.1, materials.ceilingGlow)
  panel.position.set(0, -0.31, 0); g.add(panel)
  return g
}

export function createDeskScene(canvas, { onNavigate, mobile = false } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !mobile, alpha: false, powerPreference: 'high-performance' })
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.02
  renderer.shadowMap.enabled = !mobile
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile ? 1.35 : 2))

  const scene = new THREE.Scene()
  scene.background = new THREE.Color('#03050a')
  scene.fog = new THREE.Fog('#03050a', 48, 96)
  const camera = new THREE.PerspectiveCamera(34, 1, 0.035, 90)
  const pointer = new THREE.Vector2(0, 0)
  const raycaster = new THREE.Raycaster()
  const clickables = []
  const animated = []

  const mat = (color, roughness = 0.65, metalness = 0) => new THREE.MeshStandardMaterial({ color, roughness, metalness, flatShading: true })
  const materials = {
    orange: mat('#7463df', 0.55), orangeGlow: new THREE.MeshStandardMaterial({ color: '#8f7cff', emissive: '#5f4bdd', emissiveIntensity: 1.35, flatShading: true }),
    red: mat('#9b7bb7', 0.72), charcoal: mat('#292a43', 0.58, 0.04), metal: mat('#9a9bb2', 0.46, 0.35),
    key: mat('#4d4d73', 0.7), keyLight: mat('#ddd8e8', 0.76), cream: mat('#e9e3dc', 0.82), blue: mat('#58619a', 0.7), green: mat('#618f7c', 0.7),
    copper: mat('#d39b74', 0.55, 0.22), woodDark: mat('#817b96', 0.8), coffee: mat('#3a3150', 0.45), plant: mat('#47764f', 0.78),
    lampGlow: new THREE.MeshStandardMaterial({ color: '#ffd1a1', emissive: '#ff8a3d', emissiveIntensity: 4.5, roughness: 0.35 }),
    rgbCyan: new THREE.MeshStandardMaterial({ color: '#48cfe0', emissive: '#20b8db', emissiveIntensity: 5, roughness: 0.4 }),
    rgbMagenta: new THREE.MeshStandardMaterial({ color: '#d36adf', emissive: '#b936d0', emissiveIntensity: 5, roughness: 0.4 }),
    ceilingGlow: new THREE.MeshStandardMaterial({ color: '#d7fbff', emissive: '#73e8ff', emissiveIntensity: 6.5, roughness: 0.28 }),
    ruler: new THREE.MeshStandardMaterial({ color: '#efc36b', transparent: true, opacity: 0.82, roughness: 0.52 })
  }

  const desk = new THREE.Mesh(new THREE.BoxGeometry(62, 0.8, 18.5), new THREE.MeshStandardMaterial({ color: '#dedbe6', roughness: 0.82, flatShading: true }))
  desk.position.set(1.5, -0.45, 0); desk.receiveShadow = true; scene.add(desk)

  const objects = [
    { id: 'drone', x: -20.5, z: -1.25, rot: -0.12, route: '/projects/drone', label: 'Autonomous Drone', object: makeDroneModel() },
    { id: 'chess', x: -14.5, z: 1.45, rot: 0.08, route: '/projects/chessEngine', label: 'C++ Chess Engine', object: makeChessModel() },
    { id: 'notebook', x: -8.5, z: -1.15, rot: -0.15, route: '/projects/wealth-pathways-au', label: 'Wealth Pathways', object: makeNotebook(materials) },
    { id: 'circuit', x: -2.5, z: 1.3, rot: 0.08, route: '/projects/sports-booking', label: 'Sports Booking', object: makeCircuit(materials) },
    { id: 'laptop', x: 4, z: -0.35, rot: 0, route: '/frontier', label: 'Frontier', object: makeLaptop(materials) },
    { id: 'graphs', x: 10.5, z: 1.05, rot: -0.13, route: '/projects/sportslux', label: 'Sportslux Optimiser', object: makePaper('graph', materials) },
    { id: 'api', x: 16.5, z: -1.15, rot: 0.14, route: '/projects/asset-data-integration', label: 'Asset Data Integration', object: makePaper('api', materials) },
    { id: 'mug', x: 22.5, z: 1.25, rot: 0, route: '/projects/lol-match-predictor', label: 'Bayesian Predictor', object: makeMug(materials) }
  ]
  objects.forEach((item, i) => {
    item.object.position.set(item.x, 0.04, item.z)
    item.object.rotation.y = item.rot
    item.object.traverse((child) => { if (child.isMesh) { child.castShadow = !mobile; child.receiveShadow = !mobile } })
    addRoute(item.object, item.route, item.label, clickables)
    scene.add(item.object)
    if (item.id === 'drone' || item.id === 'mug') animated.push({ group: item.object, phase: i })
  })

  // Supporting props make the long desk feel inhabited without competing with
  // the eight clickable project objects.
  const plant = makeGlbProp('models/kenney/nature/plant_bush.glb', 1.5, -0.3); plant.position.set(-17.7, 0.04, -5.2); scene.add(plant)
  const bottle = makeGlbProp('models/kenney/survival/bottle.glb', 0.55, 0.2); bottle.position.set(6.9, 0.04, 4.9); scene.add(bottle)
  const books = makeBookStack(materials); books.position.set(19.4, 0.04, -4.6); books.rotation.y = -0.12; scene.add(books)
  const booksLeft = makeBookStack(materials); booksLeft.position.set(-11.2, 0.04, -5.0); booksLeft.rotation.y = 0.18; scene.add(booksLeft)
  const deskLamp = makeDeskLamp(materials); deskLamp.position.set(8.8, 0.04, -5.2); deskLamp.rotation.y = -0.08; scene.add(deskLamp)
  const cyanBar = makeRgbBar(materials.rgbCyan); cyanBar.position.set(-8, 0.05, -7.6); scene.add(cyanBar)
  const magentaBar = makeRgbBar(materials.rgbMagenta); magentaBar.position.set(16, 0.05, -7.6); scene.add(magentaBar)
  const stationeryA = makeStationery(materials); stationeryA.position.set(-5.2, 0.04, 5.25); stationeryA.rotation.y = -0.18; scene.add(stationeryA)
  const stationeryB = makeStationery(materials); stationeryB.position.set(14.1, 0.04, 4.9); stationeryB.rotation.y = 0.24; scene.add(stationeryB)
  const headphones = makeHeadphones(materials); headphones.position.set(11.7, 0.04, -4.7); headphones.rotation.y = -0.2; scene.add(headphones)
  const microphone = makeMicrophone(materials); microphone.position.set(-1.2, 0.04, -5.2); scene.add(microphone)
  const chessLamp = makeOverheadLamp(materials); chessLamp.position.set(-14.5, 6.9, 5.0); scene.add(chessLamp)
  ;[plant, bottle, books, booksLeft, deskLamp, cyanBar, magentaBar, stationeryA, stationeryB, headphones, microphone, chessLamp].forEach((group) => group.traverse((child) => {
    if (child.isMesh) { child.castShadow = !mobile; child.receiveShadow = !mobile }
  }))

  // Low neutral ambience retains readable silhouettes. All visible highlights
  // then come from fixtures that exist in the scene: the warm desk lamp and
  // the cyan/magenta RGB bars.
  scene.add(new THREE.AmbientLight('#b9b1d0', 1.32))
  const lampKey = new THREE.SpotLight('#ffad68', 115, 29, 0.68, 0.78, 1.25)
  lampKey.position.set(6.85, 4.1, -5.1); lampKey.target.position.set(4.2, 0, 0.4)
  lampKey.castShadow = !mobile; lampKey.shadow.mapSize.set(mobile ? 512 : 1024, mobile ? 512 : 1024)
  scene.add(lampKey, lampKey.target)
  const lampBounce = new THREE.PointLight('#ff7b45', 28, 18, 2); lampBounce.position.set(6.5, 1.1, -3.4); scene.add(lampBounce)
  const cyanLight = new THREE.PointLight('#29d8ef', 42, 23, 2); cyanLight.position.set(-8, 1.2, -6.8); scene.add(cyanLight)
  const magentaLight = new THREE.PointLight('#db54e8', 44, 24, 2); magentaLight.position.set(16, 1.2, -6.8); scene.add(magentaLight)
  const chessKey = new THREE.SpotLight('#b9f5ff', 150, 24, 0.55, 0.72, 1.15)
  chessKey.position.set(-14.5, 6.55, 5.0); chessKey.target.position.set(-14.5, 0, 1.45)
  chessKey.castShadow = !mobile; chessKey.shadow.mapSize.set(mobile ? 512 : 1024, mobile ? 512 : 1024)
  scene.add(chessKey, chessKey.target)
  const leftFill = new THREE.PointLight('#7bdff2', 34, 26, 2); leftFill.position.set(-21, 3.6, -5.8); scene.add(leftFill)
  const rightFill = new THREE.PointLight('#c978ef', 28, 24, 2); rightFill.position.set(24, 3.4, -5.5); scene.add(rightFill)

  const clock = new THREE.Clock()
  let progress = 0
  let raf = 0
  let width = 1
  let height = 1
  let hovered = null
  let running = true
  let focusX = -20.5
  let focusZ = 0
  let zoomDistance = 10.6

  const stops = objects.map((o) => o.x)
  stops.push(26.5)

  function samplePath(p) {
    const scaled = THREE.MathUtils.clamp(p, 0, 1) * (stops.length - 1)
    const index = Math.min(stops.length - 2, Math.floor(scaled))
    const raw = scaled - index
    // Quintic smootherstep: a deliberate slow-fast-slow warp between objects.
    const warp = raw * raw * raw * (raw * (raw * 6 - 15) + 10)
    return {
      x: THREE.MathUtils.lerp(stops[index], stops[index + 1], warp),
      z: 0
    }
  }

  function render() {
    if (!running) return
    const dt = Math.min(clock.getDelta(), 0.05)
    const t = clock.elapsedTime
    const pos = samplePath(progress)
    const cameraEase = 1 - Math.exp(-dt * 5.2)
    const focusEase = 1 - Math.exp(-dt * 7.5)
    focusX += (pos.x - focusX) * focusEase
    focusZ += (pos.z - focusZ) * focusEase
    camera.position.x += (focusX + pointer.x * 0.22 - camera.position.x) * cameraEase
    camera.position.z += (focusZ + zoomDistance + pointer.y * 0.14 - camera.position.z) * cameraEase
    camera.position.y += ((mobile ? 12.2 : 10.4) - camera.position.y) * cameraEase
    camera.lookAt(focusX, 0.18, focusZ)
    animated.forEach(({ group, phase }, i) => {
      if (i === 0) {
        group.position.y = 0.04 + Math.sin(t * 0.72 + phase) * 0.012
        group.userData.rotors?.forEach(({ rotor, direction }) => { rotor.rotation.y += dt * 26 * direction })
      }
    })
    renderer.render(scene, camera)
    raf = requestAnimationFrame(render)
  }

  function pick(event, navigate = false) {
    const rect = canvas.getBoundingClientRect()
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
    raycaster.setFromCamera(pointer, camera)
    const hit = raycaster.intersectObjects(clickables, false)[0]?.object || null
    const route = hit?.userData.route
    if (navigate && route) onNavigate?.(route)
    if (hit !== hovered) {
      hovered = hit
      canvas.style.cursor = route ? 'pointer' : 'grab'
      canvas.setAttribute('aria-label', route ? `Open ${hit.userData.label}` : "Interactive engineer's desk")
    }
  }

  function onMove(event) { pick(event, false) }
  function onClick(event) { pick(event, true) }
  canvas.addEventListener('pointermove', onMove, { passive: true })
  canvas.addEventListener('click', onClick)

  function resize(w, h) {
    width = w; height = h
    camera.aspect = width / height
    camera.fov = mobile || width / height < 0.85 ? 46 : 34
    camera.updateProjectionMatrix()
    renderer.setSize(width, height, false)
  }

  resize(window.innerWidth, window.innerHeight)
  camera.position.set(-20.5, mobile ? 12.2 : 10.4, 10.8)
  render()

  return {
    setProgress(value) { progress = THREE.MathUtils.clamp(value, 0, 1) },
    zoomBy(amount) {
      zoomDistance = THREE.MathUtils.clamp(zoomDistance - amount, 9.25, 12.0)
    },
    resize,
    dispose() {
      running = false
      cancelAnimationFrame(raf)
      canvas.removeEventListener('pointermove', onMove)
      canvas.removeEventListener('click', onClick)
      scene.traverse((child) => {
        if (child.geometry) child.geometry.dispose()
        if (child.material) {
          const list = Array.isArray(child.material) ? child.material : [child.material]
          list.forEach((m) => { if (m.map) m.map.dispose(); m.dispose() })
        }
      })
      renderer.dispose()
    }
  }
}
