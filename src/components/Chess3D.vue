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
    const lower = new THREE.CylinderGeometry(0.25, 0.30, 0.80, 16)
    const lowerMesh = new THREE.Mesh(lower, mat)
    lowerMesh.position.y = 0.42
    lowerMesh.castShadow = true

    // collar line (a thin ring)
    const collar = new THREE.TorusGeometry(0.23, 0.04, 8, 24)
    const collarMesh = new THREE.Mesh(collar, mat)
    collarMesh.rotation.x = Math.PI / 2
    collarMesh.position.y = 0.72
    collarMesh.castShadow = true

    // head sphere
    const head = new THREE.SphereGeometry(0.19, 16, 16)
    const headMesh = new THREE.Mesh(head, mat)
    headMesh.position.y = 0.92
    headMesh.castShadow = true

    group.add(lowerMesh, collarMesh, headMesh)
 } else if (type === 'rook') {
    // main tower body (slight taper)
    const body = new THREE.CylinderGeometry(0.30, 0.36, 0.90, 16)
    const bodyMesh = new THREE.Mesh(body, mat)
    bodyMesh.position.y = 0.50
    bodyMesh.castShadow = true

    // neck: get a little thinner before the top
    const neck = new THREE.CylinderGeometry(0.22, 0.26, 0.10, 16)
    const neckMesh = new THREE.Mesh(neck, mat)
    neckMesh.position.y = 1.00
    neckMesh.castShadow = true

    // upper tower (taller top section)
    const crownWall = new THREE.CylinderGeometry(0.30, 0.34, 0.22, 16)
    const crownMesh = new THREE.Mesh(crownWall, mat)
    crownMesh.position.y = 1.20
    crownMesh.castShadow = true

    // crenellations: -_-_-_- pattern using small blocks around the rim
    const teeth = new THREE.BoxGeometry(0.10, 0.18, 0.16)
    const toothCount = 8
    const radius = 0.28
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
    // torso
    const torso = new THREE.CylinderGeometry(0.26, 0.34, 0.55, 16)
    const torsoMesh = new THREE.Mesh(torso, mat)
    torsoMesh.position.y = 0.40
    torsoMesh.castShadow = true

    // arched neck
    const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3( 0.00, 0.55,  0.05),
        new THREE.Vector3( 0.05, 0.95, -0.05),
        new THREE.Vector3(-0.02, 1.15, -0.10),
    ])
    const neckGeom = new THREE.TubeGeometry(curve, 12, 0.12, 8, false)
    const neckMesh = new THREE.Mesh(neckGeom, mat)
    neckMesh.castShadow = true

    // head + snout
    const head = new THREE.BoxGeometry(0.35, 0.28, 0.20)
    const headMesh = new THREE.Mesh(head, mat)
    headMesh.position.set(-0.05, 1.22, -0.15)
    headMesh.castShadow = true

    const snout = new THREE.BoxGeometry(0.22, 0.16, 0.20)
    const snoutMesh = new THREE.Mesh(snout, mat)
    snoutMesh.position.set(-0.10, 1.15, -0.27)
    snoutMesh.castShadow = true

    // ears
    const earGeom = new THREE.ConeGeometry(0.05, 0.14, 6)
    const ear1 = new THREE.Mesh(earGeom, mat)
    ear1.position.set(0.05, 1.32, -0.12)
    ear1.rotation.x = Math.PI * 0.15
    ear1.castShadow = true
    const ear2 = ear1.clone()
    ear2.position.x = -0.05

    // mane ridge (subtle)
    const mane = new THREE.BoxGeometry(0.06, 0.45, 0.18)
    const maneMesh = new THREE.Mesh(mane, mat)
    maneMesh.position.set(0.10, 0.95, 0.00)
    maneMesh.rotation.z = -0.20
    maneMesh.castShadow = true

    group.add(torsoMesh, neckMesh, headMesh, snoutMesh, ear1, ear2, maneMesh)
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

    // elliptical top with a rectangular slit via two clipping planes (diagonal)
    const topGeom = new THREE.SphereGeometry(0.18, 20, 20)
    const slitWidth = 0.06
    const theta = -Math.PI / 6
    const n = new THREE.Vector3(Math.cos(theta), 0, Math.sin(theta)).normalize()

    // Left half: keep region n·x <= -slitWidth/2
    const topMatA = mat.clone()
    topMatA.clippingPlanes = [ new THREE.Plane(n.clone().negate(), -slitWidth / 2) ]
    const topA = new THREE.Mesh(topGeom, topMatA)
    topA.position.y = 1.22
    topA.scale.set(0.7, 1.95, 1.0)
    topA.castShadow = true

    // Right half: keep region n·x >= +slitWidth/2
    const topMatB = mat.clone()
    topMatB.clippingPlanes = [ new THREE.Plane(n.clone(), -slitWidth / 2) ]
    const topB = new THREE.Mesh(topGeom, topMatB)
    topB.position.y = 1.22
    topB.scale.set(0.7, 1.95, 1.0)
    topB.castShadow = true

    // smaller ellipse cap on top
    const capGeom = new THREE.SphereGeometry(0.13, 20, 20)
    const cap = new THREE.Mesh(capGeom, mat)
    cap.position.y = 1.36
    cap.scale.set(0.65, 1.35, 0.65)
    cap.castShadow = true

    group.add(bodyMesh, collarMesh, topA, topB, cap)



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

function placePieces() {
    piecesGroup = new THREE.Group()

    const white = 0xF0F0F0
    const black = 0x2E2E2E

    const typesRank = ['rook','knight','bishop','queen','king','bishop','knight','rook']

    // White back rank (z = -3.5), pawns at z = -2.5
    for (let i=0; i<8; i++) {
    const t = typesRank[i]
    const p = makeSimplePiece(t, white)
    p.position.set((i - 3.5), 0.08, -3.5)
    p.userData.rest = p.position.clone()  
    piecesGroup.add(p)

    const pawn = makeSimplePiece('pawn', white)
    pawn.position.set((i - 3.5), 0.08, -2.5)
    pawn.userData.rest = pawn.position.clone()  
    piecesGroup.add(pawn)
    }

    // Black back rank (z = +3.5), pawns at z = +2.5
    for (let i=0; i<8; i++) {
    const t = typesRank[i]
    const p = makeSimplePiece(t, black)
    p.position.set((i - 3.5), 0.08, +3.5)
    p.userData.rest = p.position.clone() 
    piecesGroup.add(p)

    const pawn = makeSimplePiece('pawn', black)
    pawn.position.set((i - 3.5), 0.08, +2.5)
    pawn.userData.rest = pawn.position.clone()
    piecesGroup.add(pawn)
    }


    // shadow & pickable flags
    piecesGroup.traverse(obj => {
      if (obj.isMesh) obj.castShadow = true
    })

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
  placePieces()

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
