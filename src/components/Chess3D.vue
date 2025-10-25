<template>
  <canvas ref="canvas" />
</template>

<script setup>
import { onMounted, onBeforeUnmount, ref } from 'vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

const canvas = ref(null)

let renderer, scene, camera, controls, raycaster, mouse
let boardGroup, piecesGroup

// Put your FEN here (only the board layout part is used; other FEN fields ignored)
const FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR'
// const FEN = '4R3/8/8/2Pkp3/N7/4rnKB/1nb5/b1r5'

const pieceCache = {} // { pawn, rook, knight, bishop, queen, king }: THREE.Group
let animationId = null
let hoveredPiece = null
let wireframeEnabled = false
let clock

// for shake animation
const hoverState = new Map() // piece => { t: number, active: boolean }

const SQUARES = 8
const SQUARE_SIZE = 1
const BOARD_SIZE = SQUARES * SQUARE_SIZE

function makeBoard() {
  boardGroup = new THREE.Group()
  const geom = new THREE.BoxGeometry(SQUARE_SIZE, 0.08, SQUARE_SIZE)

  const lightMat = new THREE.MeshStandardMaterial({ color: 0xEEEED2 })
  const darkMat  = new THREE.MeshStandardMaterial({ color: 0x769656 })

  for (let x = 0; x < SQUARES; x++) {
    for (let z = 0; z < SQUARES; z++) {
      const isDark = (x + z) % 2 === 1
      const mat = isDark ? darkMat.clone() : lightMat.clone()
      const square = new THREE.Mesh(geom, mat)
      square.receiveShadow = true
      square.position.set(
        (x - SQUARES/2 + 0.5) * SQUARE_SIZE,
        0,
        (z - SQUARES/2 + 0.5) * SQUARE_SIZE
      )
      boardGroup.add(square)
    }
  }

  // frame under the board
  const frameGeom = new THREE.BoxGeometry(BOARD_SIZE + 0.6, 0.25, BOARD_SIZE + 0.6)
  const frameMat  = new THREE.MeshStandardMaterial({ color: 0x0a1322, metalness: .2, roughness: .6 })
  const frame = new THREE.Mesh(frameGeom, frameMat)
  frame.position.set(0, -0.2, 0)
  frame.receiveShadow = true
  boardGroup.add(frame)

  scene.add(boardGroup)
}

function pieceMaterial(colorHex) {
  // slightly glossy plastic/wood-ish
  return new THREE.MeshPhysicalMaterial({
    color: colorHex,
    metalness: 0.0,
    roughness: 0.45,
    clearcoat: 0.6,
    clearcoatRoughness: 0.2
  })
}


function makeSimplePiece(type, colorHex = 0xf0f3ff) {
  // Procedural low-poly approximations to avoid external assets
  const group = new THREE.Group()
  const mat = pieceMaterial(colorHex)

  const base = new THREE.CylinderGeometry(0.30, 0.35, 0.15, 16)
  const baseMesh = new THREE.Mesh(base, mat)
  baseMesh.castShadow = true
  group.add(baseMesh)

  if (type === 'pawn') {
    // lower body: slightly thinner towards the top
    const lower = new THREE.CylinderGeometry(0.16, 0.24, 0.65, 16)
    const lowerMesh = new THREE.Mesh(lower, mat)
    lowerMesh.position.y = 0.42
    lowerMesh.castShadow = true

    // collar line (a thin ring)
    const collar = new THREE.TorusGeometry(0.15, 0.04, 8, 24)
    const collarMesh = new THREE.Mesh(collar, mat)
    collarMesh.rotation.x = Math.PI / 2
    collarMesh.position.y = 0.72
    collarMesh.castShadow = true

    // head sphere
    const head = new THREE.SphereGeometry(0.19, 16, 16)
    const headMesh = new THREE.Mesh(head, mat)
    headMesh.position.y = 0.82
    headMesh.castShadow = true

    group.add(lowerMesh, collarMesh, headMesh)
 } else if (type === 'rook') {
    // main tower body (slight taper)
    const body = new THREE.CylinderGeometry(0.26, 0.26, 0.90, 16)
    const bodyMesh = new THREE.Mesh(body, mat)
    bodyMesh.position.y = 0.50
    bodyMesh.castShadow = true

    // neck: get a little thinner before the top
    const neck = new THREE.CylinderGeometry(0.22, 0.26, 0.10, 16)
    const neckMesh = new THREE.Mesh(neck, mat)
    neckMesh.position.y = 1.00
    neckMesh.castShadow = true

    // upper tower (taller top section)
    const crownWall = new THREE.CylinderGeometry(0.28, 0.26, 0.22, 16)
    const crownMesh = new THREE.Mesh(crownWall, mat)
    crownMesh.position.y = 1.20
    crownMesh.castShadow = true

    // crenellations: -_-_-_- pattern using small blocks around the rim
    const teeth = new THREE.BoxGeometry(0.10, 0.18, 0.16)
    const toothCount = 8
    const radius = 0.24
    for (let i = 0; i < toothCount; i += 2) { // place every other to create gaps
        const angle = (i / toothCount) * Math.PI * 2
        const tx = Math.cos(angle) * radius
        const tz = Math.sin(angle) * radius
        const tooth = new THREE.Mesh(teeth, mat)
        tooth.position.set(tx, 1.35, tz)
        tooth.lookAt(0, 1.35, 0) // orient radially
        tooth.castShadow = true
        group.add(tooth)
    }

    group.add(bodyMesh, neckMesh, crownMesh)
  } else if (type === 'knight') {
    // tunables so you can quickly iterate
    const detail = 24;          // curve/bevel smoothness (12–36)
    const thickness = 0.13;     // side-to-side thickness of the head/neck
    const bevel = 0.02;         // edge softness

    // base/torso (slightly refined cylinder so proportions feel Staunton-ish)
    const torso = new THREE.CylinderGeometry(0.16, 0.22, 0.65, 24);
    const torsoMesh = new THREE.Mesh(torso, mat);
    torsoMesh.position.y = 0.40;
    torsoMesh.castShadow = true;
    group.add(torsoMesh);

    // --- head + neck as one extruded silhouette (the big visual win) ---
    const s = new THREE.Shape();
    // start rear/low neck
    s.moveTo(0.15, 0.50);
    // back of neck up to crest
    s.quadraticCurveTo(0.10, 0.90, 0.06, 1.08);
    // forehead dome
    s.bezierCurveTo(0.05, 1.26, -0.02, 1.28, -0.10, 1.24);
    // nose/muzzle
    s.bezierCurveTo(-0.42, 1.18, -0.26, 1.07, -0.22, 1.02);
    // mouth line to chin
    // throat curve back into the lower neck
    s.quadraticCurveTo(0.05, 0.96, 0.10, 0.90);
    s.quadraticCurveTo(0.15, 0.78, 0.15, 0.60);
    // (shape is implicitly closed back to moveTo)

    const headNeckGeom = new THREE.ExtrudeGeometry(s, {
        depth: thickness,
        bevelEnabled: true,
        bevelThickness: bevel,
        bevelSize: bevel,
        bevelSegments: 3,
        curveSegments: detail,
        steps: 1
    });
    headNeckGeom.computeVertexNormals();

    // ⬇️ Recenter only in X and Z (keep Y as-is)
    headNeckGeom.computeBoundingBox();
    const bb = headNeckGeom.boundingBox;
    const cx = (bb.min.x + bb.max.x) / 2 + 0.1;        // horizontal center
    const cz = (bb.min.z + bb.max.z) / 2;        // depth center (≈ thickness/2)
    headNeckGeom.translate(-cx, 0, -cz);

    const headNeck = new THREE.Mesh(headNeckGeom, mat);
    headNeck.castShadow = true;
    headNeck.rotation.y = Math.PI / 2;           // face -Z like before
    group.add(headNeck);


    // --- ears (small tapered cones, slightly tilted) ---
    const earGeom = new THREE.ConeGeometry(0.045, 0.12, 8);
    const ear1 = new THREE.Mesh(earGeom, mat);
    ear1.position.set(-0.045, 1.29, 0.06);
    ear1.rotation.x = Math.PI * 0.15;
    ear1.castShadow = true;

    const ear2 = ear1.clone();
    ear2.position.x = 0.045;
    group.add(ear1, ear2);

    // --- simple eye (fake recess with a tiny sphere – swap for CSG later if desired) ---
    const eye = new THREE.SphereGeometry(0.03, 16, 12);
    const eyeMesh = new THREE.Mesh(eye, mat);
    eyeMesh.position.set(-0.07, 1.16, 0.1);

    const eye2 = eyeMesh.clone();
    eye2.position.x = 0.07;
    group.add(eyeMesh, eye2);

    // --- mane as a thin extruded slab along the crest ---
    const maneShape = new THREE.Shape();
    maneShape.moveTo(0, 0.98);
    maneShape.quadraticCurveTo(0.05, 0.98, 0.06, 1.16);
    maneShape.lineTo(-0.02, 1.16);
    maneShape.quadraticCurveTo(-0.02, 0.96, 0.08, 0.66);

    const maneGeom = new THREE.ExtrudeGeometry(maneShape, {
        depth: 0.08,
        bevelEnabled: false,
        curveSegments: detail
    });
    const maneMesh = new THREE.Mesh(maneGeom, mat);
    maneMesh.position.z = thickness * 0.55; // sits slightly proud of the crest
    maneMesh.castShadow = true;
    group.add(maneMesh);

    // --- subtle collar ring (optional, helps readability above the base) ---
    const collar = new THREE.TorusGeometry(0.19, 0.03, 12, 32);
    const collarMesh = new THREE.Mesh(collar, mat);
    collarMesh.rotation.x = Math.PI / 2;
    collarMesh.position.y = 0.70;
    collarMesh.castShadow = true;
    group.add(collarMesh);
} else if (type === 'bishop') {
    // taller, thinner body
    const body = new THREE.CylinderGeometry(0.14, 0.20, 0.90, 16)
    const bodyMesh = new THREE.Mesh(body, mat)
    bodyMesh.position.y = 0.60
    bodyMesh.castShadow = true

    // collar ring
    const collar = new THREE.TorusGeometry(0.16, 0.04, 8, 24)
    const collarMesh = new THREE.Mesh(collar, mat)
    collarMesh.rotation.x = Math.PI / 2
    collarMesh.position.y = 0.98
    collarMesh.castShadow = true

    // elliptical top (base)
    const topGeom = new THREE.SphereGeometry(0.15, 20, 20)
    const topMesh = new THREE.Mesh(topGeom, mat)
    topMesh.position.y = 1.22
    topMesh.scale.set(0.7, 1.95, 0.7)
    topMesh.castShadow = true

    // smaller ellipse cap on top
    const capGeom = new THREE.SphereGeometry(0.08, 20, 20)
    const cap = new THREE.Mesh(capGeom, mat)
    cap.position.y = 1.48
    cap.scale.set(0.65, 1.35, 0.65)
    cap.castShadow = true

    group.add(bodyMesh, collarMesh, topMesh, cap)
  } else if (type === 'queen') {
    const body = new THREE.ConeGeometry(0.38, 1.0, 16)
    const crown = new THREE.TorusGeometry(0.25, 0.06, 8, 16)
    const b = new THREE.Mesh(body, mat); b.position.y = 0.65; b.castShadow = true
    const c = new THREE.Mesh(crown, mat); c.position.y = 1.05; c.rotation.x = Math.PI/2; c.castShadow = true
    group.add(b, c)
  } else if (type === 'king') {
    const body = new THREE.ConeGeometry(0.40, 1.1, 16)
    const crossV = new THREE.BoxGeometry(0.06, 0.25, 0.06)
    const crossH = new THREE.BoxGeometry(0.18, 0.06, 0.06)
    const b = new THREE.Mesh(body, mat); b.position.y = 0.7; b.castShadow = true
    const v = new THREE.Mesh(crossV, mat); v.position.y = 1.15; v.castShadow = true
    const h = new THREE.Mesh(crossH, mat); h.position.set(0, 1.15, 0); h.castShadow = true
    group.add(b, v, h)
  }

  // Save natural rest position for shake math
  group.userData.rest = new THREE.Vector3(0, 0, 0)
  group.userData.type = type
  group.userData.isPiece = true
  return group
}

function placePiecesFromFEN(fen) {
  // clear previous group if present
  if (piecesGroup) scene.remove(piecesGroup)
  piecesGroup = new THREE.Group()

  const WHITE = 0xEEEEEE
  const BLACK = 0x333333

  // map FEN letter -> {type,color}
  const toPiece = (ch) => {
    const isLower = ch === ch.toLowerCase()
    const color = isLower ? BLACK : WHITE
    const t = ch.toLowerCase()
    const type =
      t === 'p' ? 'pawn'   :
      t === 'r' ? 'rook'   :
      t === 'n' ? 'knight' :
      t === 'b' ? 'bishop' :
      t === 'q' ? 'queen'  :
      t === 'k' ? 'king'   : null
    return type ? { type, color } : null
  }

  // use only the placement part before spaces
  const rows = fen.trim().split(' ')[0].split('/')
  if (rows.length !== 8) {
    console.warn('Invalid FEN rows; expected 8')
    return
  }

  // FEN rows go rank 8 → 1. Our board z: rank 8 = +3.5, rank 1 = -3.5
  for (let rank = 0; rank < 8; rank++) {
    let file = 0
    for (const ch of rows[rank]) {
      if (ch >= '1' && ch <= '8') {
        file += Number(ch)
      } else {
        const spec = toPiece(ch)
        if (spec && file < 8) {
          const g = makeSimplePiece(spec.type, spec.color)
          const x = (file - 3.5)
          const z = (3.5 - rank)
          g.position.set(x, 0.08, z)
          g.userData.rest = g.position.clone()
          piecesGroup.add(g)
          file += 1
        }
      }
    }
  }

  scene.add(piecesGroup)
}


function init() {
  scene = new THREE.Scene()
  scene.background = new THREE.Color(0x0d1420)

  camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100)
  camera.position.set(4.6, 5.4, 7.4)
  camera.lookAt(0, 0.3, 0)

    renderer = new THREE.WebGLRenderer({ canvas: canvas.value, antialias: true, alpha: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    const parent = canvas.value.parentElement
    renderer.setSize(parent.clientWidth || window.innerWidth, parent.clientHeight || window.innerHeight)
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    renderer.setClearColor(0x000000, 0)   // ← transparent
    scene.background = null               // ← no solid bg



  controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.target.set(0, 0.4, 0)

  // Lights
  const hemi = new THREE.HemisphereLight(0xbdd1ff, 0x0b0f18, 0.7)
  scene.add(hemi)

  const dir = new THREE.DirectionalLight(0xffffff, 0.85)
  dir.position.set(4, 8, 4)
  dir.castShadow = true
  dir.shadow.mapSize.set(2048, 2048)
  dir.shadow.camera.near = 1
  dir.shadow.camera.far = 20
  scene.add(dir)

  // Ground plane for soft falloff
  const groundGeom = new THREE.PlaneGeometry(50, 50)
  const groundMat = new THREE.ShadowMaterial({ opacity: 0.25 })
  const ground = new THREE.Mesh(groundGeom, groundMat)
  ground.rotation.x = -Math.PI / 2
  ground.position.y = -0.01
  ground.receiveShadow = true
  scene.add(ground)

  makeBoard()
  placePiecesFromFEN(FEN)

  raycaster = new THREE.Raycaster()
  mouse = new THREE.Vector2()
  clock = new THREE.Clock()

  window.addEventListener('resize', onResize)
  renderer.domElement.addEventListener('mousemove', onMouseMove)
  renderer.domElement.addEventListener('mouseleave', onMouseLeave)

  animate()
}

function onResize() {
  const width = canvas.value.clientWidth || window.innerWidth
  const height = canvas.value.clientHeight || window.innerHeight
  camera.aspect = width / height
  camera.updateProjectionMatrix()
  renderer.setSize(width, height)
}

function onMouseMove(e) {
  const rect = renderer.domElement.getBoundingClientRect()
  mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
  mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1
}

function onMouseLeave() {
  hoveredPiece = null
}

function pick() {
  raycaster.setFromCamera(mouse, camera)
  const intersects = raycaster.intersectObjects(piecesGroup.children, true)
  if (intersects.length > 0) {
    // find the top-level piece group
    let obj = intersects[0].object
    while (obj && !obj.userData.isPiece && obj.parent) obj = obj.parent
    return obj?.userData.isPiece ? obj : null
  }
  return null
}

// Very light “shake”: a small, decaying sine offset while hovered.
function applyShake(piece, dt) {
  const speed = 12        // oscillations per second
  const amp = 0.03        // max offset (meters)
  const decay = 0.9       // decay per second while hovered
  const kRot = 0.35       // coupling into slight rotation

  let state = hoverState.get(piece)
  if (!state) {
    state = { t: Math.random() * Math.PI * 2, active: true }
    hoverState.set(piece, state)
  }

  state.t += speed * dt

  // Create a 2D “shiver”
  const ox = Math.sin(state.t) * amp
  const oz = Math.cos(state.t * 1.3) * amp

  // Smoothly decay previous offset when not hovered
  state.active = true

  piece.position.x = piece.userData.rest.x + ox
  piece.position.z = piece.userData.rest.z + oz
  piece.rotation.y = kRot * Math.sin(state.t * 0.7) // subtle yaw
}

// When a piece is no longer hovered, tween it back
function relaxPieces(dt) {
  const relaxSpeed = 8
  piecesGroup.children.forEach(piece => {
    if (!piece.userData.isPiece) return
    // if currently hovered, we'll handle in applyShake
    const state = hoverState.get(piece)
    const isHovered = (piece === hoveredPiece)
    if (!isHovered) {
      const targetX = piece.userData.rest.x
      const targetZ = piece.userData.rest.z
      piece.position.x += (targetX - piece.position.x) * Math.min(1, relaxSpeed * dt)
      piece.position.z += (targetZ - piece.position.z) * Math.min(1, relaxSpeed * dt)
      piece.rotation.y += (0 - piece.rotation.y) * Math.min(1, relaxSpeed * dt)
      if (state) state.active = false
    }
  })
}

function animate() {
  animationId = requestAnimationFrame(animate)
  const dt = Math.min(0.033, clock.getDelta())

  controls.update()

  hoveredPiece = pick()
  if (hoveredPiece) applyShake(hoveredPiece, dt)
  relaxPieces(dt)

  renderer.render(scene, camera)
}

function setWireframe(enabled) {
  const set = (obj) => {
    if (obj.material) {
      if (Array.isArray(obj.material)) obj.material.forEach(m => m.wireframe = enabled)
      else obj.material.wireframe = enabled
    }
  }
  scene.traverse(set)
}

function cleanup() {
  cancelAnimationFrame(animationId)
  window.removeEventListener('resize', onResize)
  if (renderer) {
    renderer.domElement.removeEventListener('mousemove', onMouseMove)
    renderer.domElement.removeEventListener('mouseleave', onMouseLeave)
    renderer.dispose()
  }
}

onMounted(() => init())
onBeforeUnmount(() => cleanup())

// Expose a small API to App.vue
const toggleWireframe = () => {
  wireframeEnabled = !wireframeEnabled
  setWireframe(wireframeEnabled)
}
defineExpose({ toggleWireframe })
</script>

<style scoped>
canvas {
  width: 100%;
  height: 100%;
  display: block;
}
</style>
