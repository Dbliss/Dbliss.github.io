// Project tile for the chess engine: the case study's 3D board with its real colours and lighting,
// replaying three famous games at speed on a loop.
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { Chess } from 'chess.js'
import chessModelUrl from '../../assets/chess-engine/chess_set.glb?url'
import {
  clonePieceWithTint,
  computeBoardGrid,
  findBoardMesh,
  getSquareCenterWorld,
  normalizePieceUprightAndScale,
  placeOnSquare,
  recolorBoard,
  snapToBoardTopInPlace
} from '../../chess/detail/boardGeometry.js'
import { GRID, TEMPLATE_NAMES } from '../../chess/detail/constants.js'

const WORLD_UP = new THREE.Vector3(0, 1, 0)

const PLY_SECONDS = 0.24
const MOVE_SECONDS = 0.17
const HOLD_SECONDS = 1.2
const RESET_SECONDS = 0.6

const GAME_MOVES = [
  // Paul Morphy vs Duke Karl / Count Isouard, Paris 1858 (the Opera Game)
  'e4 e5 Nf3 d6 d4 Bg4 dxe5 Bxf3 Qxf3 dxe5 Bc4 Nf6 Qb3 Qe7 Nc3 c6 Bg5 b5 Nxb5 cxb5 Bxb5+ Nbd7 O-O-O Rd8 Rxd7 Rxd7 Rd1 Qe6 Bxd7+ Nxd7 Qb8+ Nxb8 Rd8#',
  // Adolf Anderssen vs Lionel Kieseritzky, London 1851 (the Immortal Game)
  'e4 e5 f4 exf4 Bc4 Qh4+ Kf1 b5 Bxb5 Nf6 Nf3 Qh6 d3 Nh5 Nh4 Qg5 Nf5 c6 g4 Nf6 Rg1 cxb5 h4 Qg6 h5 Qg5 Qf3 Ng8 Bxf4 Qf6 Nc3 Bc5 Nd5 Qxb2 Bd6 Bxg1 e5 Qxa1+ Ke2 Na6 Nxg7+ Kd8 Qf6+ Nxf6 Be7#',
  // Donald Byrne vs Bobby Fischer, New York 1956 (the Game of the Century)
  'Nf3 Nf6 c4 g6 Nc3 Bg7 d4 O-O Bf4 d5 Qb3 dxc4 Qxc4 c6 e4 Nbd7 Rd1 Nb6 Qc5 Bg4 Bg5 Na4 Qa3 Nxc3 bxc3 Nxe4 Bxe7 Qb6 Bc4 Nxc3 Bc5 Rfe8+ Kf1 Be6 Bxb6 Bxc4+ Kg1 Ne2+ Kf1 Nxd4+ Kg1 Ne2+ Kf1 Nc3+ Kg1 axb6 Qb4 Ra4 Qxb6 Nxd1 h3 Rxa2 Kh2 Nxf2 Re1 Rxe1 Qd8+ Bf8 Nxe1 Bd5 Nf3 Ne4 Qb8 b5 h4 h5 Ne5 Kg7 Kg1 Bc5+ Kf1 Ng3+ Ke1 Bb4+ Kd1 Bb3+ Kc1 Ne2+ Kb1 Nc3+ Kc1 Rc2#'
]

function parseGame (sans) {
  const game = new Chess()
  sans.split(' ').forEach((san) => game.move(san))
  return game.history({ verbose: true })
}

const BACK_RANK = ['rook', 'knight', 'bishop', 'queen', 'king', 'bishop', 'knight', 'rook']
const fileOf = (square) => square.charCodeAt(0) - 97
const rankOf = (square) => Number(square[1]) - 1
const squareName = (file, rank) => `${String.fromCharCode(97 + file)}${rank + 1}`

// The case study page's background, painted behind the board.
function backdrop () {
  const c = document.createElement('canvas')
  c.width = 512
  c.height = 352
  const g = c.getContext('2d')
  const base = g.createLinearGradient(0, 0, 0, 352)
  base.addColorStop(0, '#090b1c')
  base.addColorStop(1, '#04050f')
  g.fillStyle = base
  g.fillRect(0, 0, 512, 352)
  const glow = g.createRadialGradient(256, 120, 0, 256, 120, 215)
  glow.addColorStop(0, 'rgba(36, 49, 108, .58)')
  glow.addColorStop(1, 'rgba(9, 10, 26, 0)')
  g.fillStyle = glow
  g.fillRect(0, 0, 512, 352)
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

export async function buildChess ({ scene, camera, renderer }) {
  const gltf = await new GLTFLoader().loadAsync(chessModelUrl)
  const root = gltf.scene
  scene.add(root)
  root.updateMatrixWorld(true)
  const GAMES = GAME_MOVES.map(parseGame)

  const boardMesh = findBoardMesh(root)
  const templates = Object.fromEntries(
    Object.entries(TEMPLATE_NAMES).map(([type, name]) => {
      const node = root.getObjectByName(name)
      if (!node) throw new Error(`chess_set.glb has no "${name}" node`)
      return [type, node]
    })
  )
  Object.values(templates).forEach((node) => { node.visible = false })

  const boardRoot = boardMesh.parent ?? boardMesh
  const info = computeBoardGrid(boardMesh, WORLD_UP)
  recolorBoard(boardRoot, info.squareSize)

  const boardSize = info.squareSize * 8
  const step = info.squareSize * GRID.spacing
  const pieces = []

  const addPiece = (type, color, file, rank) => {
    const obj = clonePieceWithTint(templates[type], color)
    normalizePieceUprightAndScale(obj, info.squareSize, color)
    placeOnSquare(obj, info, file, rank, color)
    scene.add(obj)
    pieces.push({ obj, type, home: obj.position.clone(), homeFile: file, homeRank: rank, from: obj.position.clone() })
  }
  BACK_RANK.forEach((type, file) => {
    addPiece(type, 'white', file, 0)
    addPiece('pawn', 'white', file, 1)
    addPiece(type, 'black', file, 7)
    addPiece('pawn', 'black', file, 6)
  })

  function setOnBoard (piece, file, rank, lift = 0) {
    piece.obj.position.copy(piece.home)
      .addScaledVector(info.fileAxis, (file - piece.homeFile) * step)
      .addScaledVector(info.rankAxis, (rank - piece.homeRank) * step)
      .addScaledVector(info.normal, lift)
  }

  // Lit squares under the last move.
  const marks = [0, 1].map(() => {
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(step * 0.96, step * 0.96),
      new THREE.MeshBasicMaterial({ color: 0x2f3440, transparent: true, opacity: 0.55, depthWrite: false })
    )
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), info.normal)
    mesh.visible = false
    scene.add(mesh)
    return mesh
  })
  function mark (mesh, square) {
    const point = getSquareCenterWorld(fileOf(square), rankOf(square), info)
    snapToBoardTopInPlace(point, info, info.squareSize * 0.012)
    mesh.position.copy(point)
    mesh.visible = true
  }

  // Same lighting as the case study: the room environment on its own, no tone mapping.
  const pmrem = new THREE.PMREMGenerator(renderer)
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
  pmrem.dispose()
  scene.background = backdrop()

  camera.fov = 30
  camera.near = boardSize * 0.02
  camera.far = boardSize * 12
  camera.updateProjectionMatrix()
  const look = info.center.clone().addScaledVector(info.normal, -boardSize * 0.2)
  function aimCamera (t) {
    const angle = -0.52 + Math.sin(t * 0.14) * 0.2
    camera.position.copy(info.center)
      .addScaledVector(info.fileAxis, Math.sin(angle) * boardSize * 1.55)
      .addScaledVector(info.rankAxis, -Math.cos(angle) * boardSize * 1.55)
      .addScaledVector(info.normal, boardSize * 1.05)
    camera.lookAt(look)
  }

  // ---- playback ----
  let at = {}
  let gameIndex = 0
  let ply = 0
  let phase = 'play'
  let phaseTime = 0
  let current = null

  function resetBoard () {
    at = {}
    for (const piece of pieces) {
      piece.obj.visible = true
      piece.obj.position.copy(piece.home)
      at[squareName(piece.homeFile, piece.homeRank)] = piece
    }
  }

  function beginMove (move) {
    const mover = at[move.from]
    let victim = null
    if (move.captured) {
      const square = move.flags.includes('e') ? `${move.to[0]}${move.from[1]}` : move.to
      victim = at[square]
      delete at[square]
    }
    let rook = null
    if (move.flags.includes('k') || move.flags.includes('q')) {
      const rank = move.from[1]
      const [from, to] = move.flags.includes('k') ? [`h${rank}`, `f${rank}`] : [`a${rank}`, `d${rank}`]
      rook = { piece: at[from], from, to }
    }
    mark(marks[0], move.from)
    mark(marks[1], move.to)
    current = { move, mover, victim, rook }
  }

  function slide (piece, from, to, u, arc) {
    const eased = u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2
    setOnBoard(
      piece,
      fileOf(from) + (fileOf(to) - fileOf(from)) * eased,
      rankOf(from) + (rankOf(to) - rankOf(from)) * eased,
      Math.sin(Math.PI * u) * arc
    )
  }

  function commitMove () {
    const { move, mover, rook } = current
    delete at[move.from]
    at[move.to] = mover
    if (rook) {
      delete at[rook.from]
      at[rook.to] = rook.piece
    }
    current = null
  }

  function advance (dt) {
    phaseTime += dt
    if (phase === 'play') {
      const game = GAMES[gameIndex]
      if (!current) beginMove(game[ply])
      const { move, mover, victim, rook } = current
      const u = Math.min(1, phaseTime / MOVE_SECONDS)
      slide(mover, move.from, move.to, u, info.squareSize * (mover.type === 'knight' ? 0.85 : 0.14))
      if (rook) slide(rook.piece, rook.from, rook.to, u, info.squareSize * 0.14)
      if (victim && u > 0.7) victim.obj.visible = false
      if (phaseTime >= PLY_SECONDS) {
        commitMove()
        phaseTime = 0
        ply += 1
        if (ply >= game.length) phase = 'hold'
      }
    } else if (phase === 'hold') {
      if (phaseTime >= HOLD_SECONDS) {
        phase = 'reset'
        phaseTime = 0
        marks.forEach((m) => { m.visible = false })
        pieces.forEach((piece) => {
          piece.from.copy(piece.obj.position)
          piece.obj.visible = true
        })
      }
    } else {
      const u = Math.min(1, phaseTime / RESET_SECONDS)
      const eased = u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2
      pieces.forEach((piece) => piece.obj.position.lerpVectors(piece.from, piece.home, eased))
      if (u >= 1) {
        resetBoard()
        gameIndex = (gameIndex + 1) % GAMES.length
        ply = 0
        phase = 'play'
        phaseTime = 0
      }
    }
  }

  resetBoard()

  return (t, dt) => {
    if (dt > 0) advance(dt)
    aimCamera(t)
  }
}
