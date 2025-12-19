<template>
	<div class="page">
		<section class="chess-stage">
			<canvas ref="canvasRef" class="chess-canvas"></canvas>

			<!-- Hero title that fades/moves out as you scroll -->
			<div
				class="hero"
				:style="{
					opacity: heroOpacity,
					transform: `translateY(${heroTranslateY}px)`,
				}"
			>
				<div class="hero-title">Chess Engine C++</div>
				<div class="hero-sub mono">Scroll to reveal the board</div>
			</div>

			<!-- Move / feature info (updates after every move) -->
			<div v-if="lastMove || featureBlurb" class="info-card">
				<div v-if="lastMove" class="info-title">{{ lastMove }}</div>
				<div v-if="featureBlurb" class="info-sub mono">{{ featureBlurb }}</div>
			</div>

			<div v-if="loading || error" class="overlay">
				<div v-if="loading" class="overlay-card">
					<div class="title">Loading chess set…</div>
					<div class="bar">
						<div class="fill" :style="{ width: `${Math.round(progress * 100)}%` }"></div>
					</div>
					<div class="sub mono">{{ Math.round(progress * 100) }}%</div>
				</div>

				<div v-else class="overlay-card error">
					<div class="title">Failed to load GLB</div>
					<div class="sub mono">{{ error }}</div>
				</div>
			</div>

			<div class="vignette" />
		</section>

		<div class="scroll-spacer" aria-hidden="true"></div>
	</div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from "vue";

import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

import chessModelUrl from "../assets/chessboard/chess_set.glb?url";

import { createChessGame, fileRankToSquare, squareToFileRank } from "../chess/chessGame.js";
import { StockfishClient, parseUciMove } from "../chess/stockfishClient.js";

const canvasRef = ref(null);

const loading = ref(true);
const progress = ref(0);
const error = ref("");

let renderer = null;
let scene = null;
let camera = null;
let controls = null;

let pmrem = null;
let envTex = null;

let root = null;
let boardMesh = null;

let piecesGroup = null;
let meshToPiece = new WeakMap();

// Highlights (selection vs hover preview)
let selectionHighlightsGroup = null;
let hoverHighlightsGroup = null;

let dotGeo = null;
let captureRingGeo = null;
let selectRingGeo = null;
let highlightQuat = new THREE.Quaternion();

let matMoveSel = null;
let matCaptureSel = null;
let matSelectFrom = null;

let matMoveHover = null;
let matCaptureHover = null;

let raf = 0;
const clock = new THREE.Clock();
let elapsed = 0;

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

let boardPickMeshes = []; // meshes that cover the playable board for raycasting

let hoveredPiece = null;
let hoveredBasePos = null;
let hoveredBaseQuat = null;
let hoveredEmissiveRestore = [];
let hoverStartTime = 0;

const tmpEuler = new THREE.Euler();
const tmpQuat = new THREE.Quaternion();
const tmpBox = new THREE.Box3();
const tmpSize = new THREE.Vector3();
const tmpCenter = new THREE.Vector3();
const tmpAxisX = new THREE.Vector3();
const tmpAxisY = new THREE.Vector3();
const tmpAxisZ = new THREE.Vector3();
const tmpNormal = new THREE.Vector3();
const tmpCorner = new THREE.Vector3();
const tmpTarget = new THREE.Vector3();
const tmpV = new THREE.Vector3();
const tmpM = new THREE.Matrix4();

const colorBase = new THREE.Color(0xffffff);
const WORLD_UP = new THREE.Vector3(0, 1, 0);

const BOARD_COLORS = {
	dark: "#769656",
	light: "#eeeed2",
	border: "#3b342e",
};

const GRID = {
	spacing: 0.92,
	offsetFile: 0.0,
	offsetRank: 0.0,
};

const PIECE = {
	footprintRatio: 0.55,
	liftEps: 0.001,
};

const WHITE_TINT = new THREE.Color(0xd2c7b6);
const BLACK_TINT = new THREE.Color(0x151515);
const HOVER_GLOW = 0x2f6bff;

// Hover jiggle envelope: 2s total, 1s steady then 1s ease-out
const HOVER_SHAKE = {
	rotAmp: 0.03, // radians (light)
	posAmp: 0.006, // world units (light)
	freq: 16.0,
	holdSec: 1.0,
	totalSec: 2.0,
};

// Move animation
const MOVE_ANIM = {
	durationSec: 0.28,
	jumpHeightRatio: 0.32, // relative to square size
};

// Active piece move animations
let moveAnims = []; // { piece, startPos, endPos, startQuat, endQuat, startT, dur, jumpH, onComplete? }

const TEMPLATE_NAMES = {
	pawn: "Pawn_White_0",
	rook: "Rook_Black_0",
	knight: "Knight_White_0",
	bishop: "Bishop_Black_0",
	queen: "Queen_White_0",
	king: "King_Black_0",
};

// ------------------------------------------------------------
// Cinematic scroll config
// ------------------------------------------------------------
const CINEMATIC = {
	transitionVh: 160,
	smoothing: 8.0,
	enableOrbitAt: 0.98,

	titleFadeStart: 0.05,
	titleFadeEnd: 0.32,

	// Final Position
	playBack: 1,
	playUp: 1.10,
	playSide: -0.0,
	playTargetUp: 0.10,

	// Start position
	introSideDist: 1.5,
	introUp: 0.0,
	introForward: 0.0,
	introSide: 0,
	introTargetUp: 0,

	twistDeg: 0,
};

// Scroll state
let scrollTarget01 = 0;
const scroll01 = ref(0);

// Cinematic poses
let cinematicReady = false;
let introCamPos = new THREE.Vector3();
let introTarget = new THREE.Vector3();
let playCamPos = new THREE.Vector3();
let playTarget = new THREE.Vector3();

// Basis for “white perspective”
let basisCenter = new THREE.Vector3();
let basisUp = new THREE.Vector3();
let basisRight = new THREE.Vector3();
let basisForward = new THREE.Vector3();
let boardSpan = 1;

// ------------------------------------------------------------
// Chess state (logic)
// ------------------------------------------------------------
const game = createChessGame();
let templatesGlobal = null;
let boardInfoGlobal = null;

const squareToPiece = new Map(); // square => Object3D root
let selected = null; // { pieceRoot, fromSquare }
let selectedMoves = []; // verbose moves from chess.js

const lastMove = ref("");
const featureBlurb = ref("");
let blurbIndex = 0;

let engine = null;
const engineThinking = ref(false);

const FEATURE_BLURBS = [
	"Feature: Deterministic evaluation core + clean C++ API surface.",
	"Feature: Movegen + legality (pins/checks) validated by test suite.",
	"Feature: Search scaffolding: iterative deepening + TT-ready hooks.",
	"Feature: Frontend is purely visual—engine talks via a thin interface layer.",
	"Feature: Profiling-first mindset: counters, timing, and hotspot visibility.",
];

// ------------------------------------------------------------

onMounted(() => {
	initThree();
	loadModel();
	startLoop();

	// Engine init (doesn't block rendering)
	engine = new StockfishClient({
		workerUrl: "/stockfish/stockfish-17.1-lite-single-03e3232.js",
		skillLevel: 2,
		movetimeMs: 120,
	});

	engine.init().catch((e) => {
		console.error("Stockfish init failed:", e);
	});

	onScroll();
	window.addEventListener("resize", onResize, { passive: true });
	window.addEventListener("scroll", onScroll, { passive: true });
});

onBeforeUnmount(() => {
	window.removeEventListener("resize", onResize);
	window.removeEventListener("scroll", onScroll);

	try {
		engine?.terminate?.();
	} catch {}
	engine = null;

	stopLoop();
	disposeAll();
});

// Hero transforms
const heroOpacity = computed(() => {
	const p = scroll01.value;
	const t = smoothstep(CINEMATIC.titleFadeStart, CINEMATIC.titleFadeEnd, p);
	return 1 - t;
});

const heroTranslateY = computed(() => {
	const p = scroll01.value;
	const t = smoothstep(0.0, CINEMATIC.titleFadeEnd, p);
	return -28 * t;
});

function onScroll() {
	const lenPx = Math.max(1, window.innerHeight * (CINEMATIC.transitionVh / 100));
	scrollTarget01 = THREE.MathUtils.clamp(window.scrollY / lenPx, 0, 1);
}

function initThree() {
	const canvas = canvasRef.value;
	if (!canvas) {
		error.value = "Missing canvas.";
		loading.value = false;
		return;
	}

	renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
	renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
	renderer.setSize(window.innerWidth, window.innerHeight);
	renderer.setClearAlpha(0);
	renderer.outputColorSpace = THREE.SRGBColorSpace;

	scene = new THREE.Scene();
	scene.background = null;

	camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.01, 500);
	camera.position.set(0, 3.2, 6.2);

	controls = new OrbitControls(camera, renderer.domElement);
	controls.enableDamping = true;
	controls.dampingFactor = 0.06;
	controls.enablePan = true;
	controls.target.set(0, 1.0, 0);

	scene.add(new THREE.HemisphereLight(0xffffff, 0x1a2340, 0.75));

	const key = new THREE.DirectionalLight(0xffffff, 1.15);
	key.position.set(7, 10, 7);
	scene.add(key);

	const rim = new THREE.DirectionalLight(0xffffff, 0.35);
	rim.position.set(-8, 6, -6);
	scene.add(rim);

	pmrem = new THREE.PMREMGenerator(renderer);
	envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
	scene.environment = envTex;

	renderer.domElement.addEventListener("pointermove", onPointerMove, { passive: true });
	renderer.domElement.addEventListener("pointerleave", clearHover, { passive: true });
	renderer.domElement.addEventListener("pointerdown", onPointerDown, { passive: true });
}

function loadModel() {
	loading.value = true;
	error.value = "";
	progress.value = 0;
	cinematicReady = false;

	const loader = new GLTFLoader();

	loader.load(
		chessModelUrl,
		(gltf) => {
			clearSelection();
			clearHover();

			disposeHighlightSystem();

			if (piecesGroup) {
				scene.remove(piecesGroup);
				disposeObject3D(piecesGroup);
				piecesGroup = null;
			}

			if (root) {
				scene.remove(root);
				disposeObject3D(root);
				root = null;
			}

			root = gltf.scene;
			root.traverse((o) => {
				if (o.isMesh) o.frustumCulled = true;
			});
			scene.add(root);

			boardMesh = findBoardMesh(root);
			if (!boardMesh) {
				loading.value = false;
				error.value = "Board mesh not found. Rename the board node or adjust findBoardMesh().";
				return;
			}

			let templates;
			try {
				templates = getTemplatesStrict(root);
			} catch (e) {
				loading.value = false;
				error.value = e?.message || String(e);
				return;
			}
			templatesGlobal = templates;

			hideTemplates(templates);

			const boardRoot = boardMesh.parent ?? boardMesh;

			// NEW: build a list of meshes that represent the playable board surface for raycasting
			boardPickMeshes = [];
			boardRoot.traverse((o) => {
				if (!o.isMesh) return;
				// exclude piece meshes/templates
				if (/pawn|rook|knight|bishop|queen|king/i.test(o.name || "")) return;
				boardPickMeshes.push(o);
			});

			const boardInfo = computeBoardGrid(boardMesh);
			boardInfoGlobal = boardInfo;

			recolorBoard(boardRoot, boardInfo.squareSize);

			buildFullSetFromTemplates(templates, boardMesh);
			indexPiecesBySquare();

			setupHighlightSystem(boardInfo);
			setupCinematicFromBoard(boardInfo, boardMesh);

			// Reset chess state to starting position
			game.reset();
			lastMove.value = "";
			featureBlurb.value = "";

			loading.value = false;
		},
		(evt) => {
			if (!evt?.total) return;
			progress.value = Math.min(1, evt.loaded / evt.total);
		},
		(e) => {
			loading.value = false;
			error.value = e?.message || String(e);
		}
	);
}


// ------------------------------------------------------------
// Highlight system (dots + rings)
// ------------------------------------------------------------
function setupHighlightSystem(boardInfo) {
	selectionHighlightsGroup = new THREE.Group();
	selectionHighlightsGroup.name = "SelectionMoveDots";
	scene.add(selectionHighlightsGroup);

	hoverHighlightsGroup = new THREE.Group();
	hoverHighlightsGroup.name = "HoverMoveDots";
	scene.add(hoverHighlightsGroup);

	const s = boardInfo.squareSize * GRID.spacing;

	// Dot size tuned to "small" but clickable/visible.
	const r = s * 0.14;

	dotGeo = new THREE.CircleGeometry(r, 32);
	captureRingGeo = new THREE.RingGeometry(r * 0.55, r * 0.9, 32);
	selectRingGeo = new THREE.RingGeometry(r * 1.25, r * 1.55, 48);

	// Orient XY => board plane (x=fileAxis, y=rankAxis, z=normal)
	tmpM.makeBasis(boardInfo.fileAxis, boardInfo.rankAxis, boardInfo.normal);
	highlightQuat.setFromRotationMatrix(tmpM);

	const common = {
		transparent: true,
		depthWrite: false,
		polygonOffset: true,
		polygonOffsetFactor: -1,
		polygonOffsetUnits: -1,
	};

	// Selection dots: more solid
	matMoveSel = new THREE.MeshBasicMaterial({ color: 0x22262f, opacity: 0.88, ...common });
	matCaptureSel = new THREE.MeshBasicMaterial({ color: 0x22262f, opacity: 0.88, ...common });
	matSelectFrom = new THREE.MeshBasicMaterial({ color: 0x2f3440, opacity: 0.55, ...common });

	// Hover preview: more subtle
	matMoveHover = new THREE.MeshBasicMaterial({ color: 0x22262f, opacity: 0.52, ...common });
	matCaptureHover = new THREE.MeshBasicMaterial({ color: 0x22262f, opacity: 0.52, ...common });
}

function disposeHighlightSystem() {
	if (selectionHighlightsGroup) {
		scene?.remove(selectionHighlightsGroup);
		selectionHighlightsGroup.clear();
		selectionHighlightsGroup = null;
	}
	if (hoverHighlightsGroup) {
		scene?.remove(hoverHighlightsGroup);
		hoverHighlightsGroup.clear();
		hoverHighlightsGroup = null;
	}

	dotGeo?.dispose?.();
	dotGeo = null;
	captureRingGeo?.dispose?.();
	captureRingGeo = null;
	selectRingGeo?.dispose?.();
	selectRingGeo = null;

	matMoveSel?.dispose?.();
	matMoveSel = null;
	matCaptureSel?.dispose?.();
	matCaptureSel = null;
	matSelectFrom?.dispose?.();
	matSelectFrom = null;

	matMoveHover?.dispose?.();
	matMoveHover = null;
	matCaptureHover?.dispose?.();
	matCaptureHover = null;
}

function clearSelectionHighlights() {
	selectionHighlightsGroup?.clear?.();
}

function clearHoverHighlights() {
	hoverHighlightsGroup?.clear?.();
}

function addMoveMarker(square, kind, mode) {
	if (!boardInfoGlobal) return;

	const isSel = mode === "selection";
	const group = isSel ? selectionHighlightsGroup : hoverHighlightsGroup;
	if (!group) return;

	const { file, rank } = squareToFileRank(square);
	const pos = getSquareCenterWorld(file, rank, boardInfoGlobal);
	snapToBoardTopInPlace(pos, boardInfoGlobal, 0.002);

	let geo = dotGeo;
	let mat = isSel ? matMoveSel : matMoveHover;

	if (kind === "capture") {
		geo = captureRingGeo;
		mat = isSel ? matCaptureSel : matCaptureHover;
	}

	const mesh = new THREE.Mesh(geo, mat);
	mesh.quaternion.copy(highlightQuat);
	mesh.position.copy(pos);
	mesh.renderOrder = isSel ? 12 : 11;

	// Only selection markers are clickable for "move now"
	if (isSel) mesh.userData.square = square;

	group.add(mesh);
}

function addFromMarker(square) {
	if (!boardInfoGlobal || !selectionHighlightsGroup) return;

	const { file, rank } = squareToFileRank(square);
	const pos = getSquareCenterWorld(file, rank, boardInfoGlobal);
	snapToBoardTopInPlace(pos, boardInfoGlobal, 0.002);

	const mesh = new THREE.Mesh(selectRingGeo, matSelectFrom);
	mesh.quaternion.copy(highlightQuat);
	mesh.position.copy(pos);
	mesh.renderOrder = 13;
	selectionHighlightsGroup.add(mesh);
}

function showSelectionAndMoves(fromSquare, movesVerbose) {
	clearSelectionHighlights();
	clearHoverHighlights(); // selection should "own" the board UI

	addFromMarker(fromSquare);

	for (const m of movesVerbose) {
		const isCap = m.flags?.includes("c") || m.flags?.includes("e");
		addMoveMarker(m.to, isCap ? "capture" : "move", "selection");
	}
}

function showHoverMoves(pieceRoot) {
	clearHoverHighlights();
	if (!pieceRoot) return;
	if (!selected || selected?.pieceRoot !== pieceRoot) {
		// Only preview if not currently selected something
	} else {
		return;
	}
	if (engineThinking.value || game.isGameOver()) return;

	const sq = fileRankToSquare(pieceRoot.userData.file, pieceRoot.userData.rank);
	const turnColor = game.turn() === "w" ? "white" : "black";
	if (pieceRoot.userData.color !== turnColor) return;

	const moves = game.legalMovesFrom(sq);
	for (const m of moves) {
		const isCap = m.flags?.includes("c") || m.flags?.includes("e");
		addMoveMarker(m.to, isCap ? "capture" : "move", "hover");
	}
}

function getPieceRootFromHit(obj) {
	let o = obj;
	while (o) {
		const pr = meshToPiece.get(o);
		if (pr) return pr;
		o = o.parent;
	}
	return null;
}


// ------------------------------------------------------------
// Click handling (select piece / move)
// ------------------------------------------------------------
function isAnimating() {
	return moveAnims.length > 0;
}

function onPointerDown(ev) {
	if (!renderer || !camera || loading.value || error.value) return;
	if (engineThinking.value) return;
	if (isAnimating()) return;
	if (!piecesGroup || !boardMesh || !boardInfoGlobal) return;

	const rect = renderer.domElement.getBoundingClientRect();
	pointer.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
	pointer.y = -(((ev.clientY - rect.top) / rect.height) * 2 - 1);

	raycaster.setFromCamera(pointer, camera);

	// 1) Click on a selection move dot => attempt move immediately
	if (selectionHighlightsGroup) {
		const hlHits = raycaster.intersectObject(selectionHighlightsGroup, true);
		if (hlHits.length) {
			const sq = hlHits[0].object?.userData?.square;
			if (sq) {
				tryMoveTo(sq);
				return;
			}
		}
	}

	// 2) Click on a piece
	const pieceHits = raycaster.intersectObject(piecesGroup, true);
	if (pieceHits.length) {
		const pieceRoot = getPieceRootFromHit(pieceHits[0].object);
		if (pieceRoot) {
			// If we have a selection, clicking an enemy on a legal square should CAPTURE
			if (selected) {
				const targetSq = fileRankToSquare(pieceRoot.userData.file, pieceRoot.userData.rank);
				const legal = selectedMoves.some((m) => m.to === targetSq);
				const enemy = pieceRoot.userData.color !== selected.pieceRoot.userData.color;

				if (legal && enemy) {
					tryMoveTo(targetSq);
					return;
				}
			}

			// Otherwise treat it as (re)select
			trySelectPiece(pieceRoot);
			return;
		}
	}


	// 3) Click on board => if selected, try move to that square; else clear selection
	// 3) Click on board (use the pick meshes, not just boardMesh)
	const boardHits = boardPickMeshes.length
		? raycaster.intersectObjects(boardPickMeshes, true)
		: raycaster.intersectObject(boardMesh, true);

	if (boardHits.length) {
		const sq = squareFromWorldPoint(boardHits[0].point, boardInfoGlobal);

		if (!sq) {
			clearSelection();
			return;
		}

		if (selected) {
			tryMoveTo(sq);
			return;
		}

		clearSelection();
		return;
	}

	clearSelection();
}

function trySelectPiece(pieceRoot) {
	indexPiecesBySquare();

	const sq = fileRankToSquare(pieceRoot.userData.file, pieceRoot.userData.rank);
	const turnColor = game.turn() === "w" ? "white" : "black";

	// Enforce turn
	if (pieceRoot.userData.color !== turnColor) {
		clearSelection();
		return;
	}

	// Toggle off if re-clicked
	if (selected?.fromSquare === sq) {
		clearSelection();
		return;
	}

	const moves = game.legalMovesFrom(sq);
	selected = { pieceRoot, fromSquare: sq };
	selectedMoves = moves;

	showSelectionAndMoves(sq, moves);
}

function tryMoveTo(toSquare) {
	if (!selected) return;
	if (isAnimating()) return;

	const fromSquare = selected.fromSquare;

	// Only allow squares that are in the current move list
	const ok = selectedMoves.some((m) => m.to === toSquare);
	if (!ok) {
		clearSelection();
		return;
	}

	clearHover(); // avoid jitter/glow fighting animation

	// Always promote to queen for now
	const result = game.tryMove(fromSquare, toSquare, "q");
	if (!result) {
		clearSelection();
		return;
	}

	// Apply 3D updates based on move flags
	applyMoveToScene(result, selected.pieceRoot, fromSquare, toSquare);

	// Update UI blurb
	lastMove.value = `Move: ${result.san}`;
	featureBlurb.value = FEATURE_BLURBS[blurbIndex % FEATURE_BLURBS.length];
	blurbIndex++;

	clearSelection();
	void maybePlayBlackMove();
}

async function maybePlayBlackMove() {
	if (!engine) return;
	if (game.isGameOver()) return;
	if (game.turn() !== "b") return;

	engineThinking.value = true;
	clearSelection();
	clearHover();

	try {
		const uci = await engine.bestMoveFromFen(game.fen(), { movetimeMs: 120 });
		if (!uci || uci === "(none)") return;

		const mv = parseUciMove(uci);
		if (!mv) return;

		// Find the moved piece in the scene
		indexPiecesBySquare();
		const pieceRoot = squareToPiece.get(mv.from);
		if (!pieceRoot) return;

		const result = game.tryMove(mv.from, mv.to, mv.promotion || "q");
		if (!result) return;

		applyMoveToScene(result, pieceRoot, mv.from, mv.to);

		lastMove.value = `Move: ${result.san}`;
		featureBlurb.value = FEATURE_BLURBS[blurbIndex % FEATURE_BLURBS.length];
		blurbIndex++;
	} catch (e) {
		console.error("Engine move failed:", e);
	} finally {
		engineThinking.value = false;
	}
}

function clearSelection() {
	selected = null;
	selectedMoves = [];
	clearSelectionHighlights();

	// If you're currently hovering something (and it's your turn), restore hover preview
	if (hoveredPiece) showHoverMoves(hoveredPiece);
}

// ------------------------------------------------------------
// Apply move to scene (captures, castling, en-passant, promotion)
// ------------------------------------------------------------
function applyMoveToScene(moveResult, movedPieceRoot, fromSquare, toSquare) {
	// Captures
	if (moveResult.flags?.includes("e")) {
		const { file: tf } = squareToFileRank(toSquare);
		const { rank: fr } = squareToFileRank(fromSquare);
		const capSq = fileRankToSquare(tf, fr);
		removePieceAtSquare(capSq);
	} else if (moveResult.flags?.includes("c")) {
		removePieceAtSquare(toSquare);
	}

	// Promotion needs to swap AFTER the jump lands (looks much better)
	let promotionType = null;
	if (moveResult.flags?.includes("p")) {
		const promo = (moveResult.promotion || "q").toLowerCase();
		promotionType =
			promo === "q" ? "queen" :
			promo === "r" ? "rook" :
			promo === "b" ? "bishop" :
			promo === "n" ? "knight" :
			"queen";
	}

	// Move the piece (jump anim)
	animatePieceRootToSquare(movedPieceRoot, toSquare, {
		onComplete: () => {
			if (promotionType) {
				replacePieceWithType(movedPieceRoot, promotionType, toSquare);
			}
			indexPiecesBySquare();
		},
	});

	// Castling: move rook too (jump anim)
	if (moveResult.flags?.includes("k") || moveResult.flags?.includes("q")) {
		const side = moveResult.flags.includes("k") ? "k" : "q";
		const color = moveResult.color === "w" ? "w" : "b";

		const rookMoves = {
			w: {
				k: { from: "h1", to: "f1" },
				q: { from: "a1", to: "d1" },
			},
			b: {
				k: { from: "h8", to: "f8" },
				q: { from: "a8", to: "d8" },
			},
		};

		const rm = rookMoves[color][side];
		const rook = squareToPiece.get(rm.from);
		if (rook) {
			animatePieceRootToSquare(rook, rm.to);
		}
	}

	// Update mapping now (logic) even though visuals animate
	indexPiecesBySquare();
}

function animatePieceRootToSquare(pieceRoot, square, opts = {}) {
	if (!boardInfoGlobal || !pieceRoot) return;

	const { durationSec = MOVE_ANIM.durationSec, onComplete = null } = opts;

	// Record start
	const startPos = pieceRoot.position.clone();
	const startQuat = pieceRoot.quaternion.clone();

	// Update logical square immediately
	const { file, rank } = squareToFileRank(square);
	pieceRoot.userData.file = file;
	pieceRoot.userData.rank = rank;

	// Compute end transform by placing, then restore
	placeOnSquare(pieceRoot, boardInfoGlobal, file, rank, pieceRoot.userData.color);
	const endPos = pieceRoot.position.clone();
	const endQuat = pieceRoot.quaternion.clone();

	pieceRoot.position.copy(startPos);
	pieceRoot.quaternion.copy(startQuat);
	pieceRoot.updateWorldMatrix(true, true);

	const jumpH = (boardInfoGlobal.squareSize * MOVE_ANIM.jumpHeightRatio);

	moveAnims.push({
		piece: pieceRoot,
		startPos,
		endPos,
		startQuat,
		endQuat,
		startT: elapsed,
		dur: Math.max(0.05, durationSec),
		jumpH: Math.max(0, jumpH),
		onComplete,
	});
}

function updateMoveAnimations(nowT) {
	if (!moveAnims.length) return;

	const upDir = (basisUp && basisUp.lengthSq() > 1e-8) ? basisUp : (boardInfoGlobal?.normal || WORLD_UP);

	for (let i = moveAnims.length - 1; i >= 0; i--) {
		const a = moveAnims[i];
		const t = (nowT - a.startT) / a.dur;

		if (t >= 1) {
			a.piece.position.copy(a.endPos);
			a.piece.quaternion.copy(a.endQuat);
			a.piece.updateWorldMatrix(true, true);

			try { a.onComplete?.(); } catch (e) { console.error(e); }

			moveAnims.splice(i, 1);
			continue;
		}

		const e = easeInOutCubic(Math.max(0, Math.min(1, t)));
		const jump = Math.sin(Math.PI * e) * a.jumpH;

		tmpTarget.copy(a.startPos).lerp(a.endPos, e).addScaledVector(upDir, jump);
		a.piece.position.copy(tmpTarget);
		a.piece.quaternion.slerpQuaternions(a.startQuat, a.endQuat, e);
		a.piece.updateWorldMatrix(true, true);
	}
}

function removePieceAtSquare(square) {
	const victim = squareToPiece.get(square);
	if (!victim || !piecesGroup) return;

	piecesGroup.remove(victim);
	disposeObject3D(victim);
}

function replacePieceWithType(oldPiece, newType, square) {
	if (!piecesGroup || !templatesGlobal) return;

	const color = oldPiece.userData.color;
	const { file, rank } = squareToFileRank(square);

	// Remove old
	piecesGroup.remove(oldPiece);
	disposeObject3D(oldPiece);

	// Spawn new
	const newPiece = clonePieceWithTint(templatesGlobal[newType], color);
	newPiece.userData.type = newType;
	newPiece.userData.color = color;
	newPiece.userData.file = file;
	newPiece.userData.rank = rank;
	newPiece.name = `${color}_${newType}_${file}_${rank}`;

	normalizePieceUprightAndScale(newPiece, boardInfoGlobal.squareSize, color);
	placeOnSquare(newPiece, boardInfoGlobal, file, rank, color);

	newPiece.traverse((o) => {
		if (o.isMesh) meshToPiece.set(o, newPiece);
	});

	piecesGroup.add(newPiece);
}

// ------------------------------------------------------------
// Square math (world <-> file/rank)
// ------------------------------------------------------------
function getSquareCenterWorld(file, rank, boardInfo) {
	const { center, squareSize, fileAxis, rankAxis } = boardInfo;

	const fx = (file - 3.5) * GRID.spacing + GRID.offsetFile;
	const rz = (rank - 3.5) * GRID.spacing + GRID.offsetRank;

	return tmpTarget.copy(center)
		.addScaledVector(fileAxis, fx * squareSize)
		.addScaledVector(rankAxis, rz * squareSize)
		.clone();
}

function snapToBoardTopInPlace(pos, boardInfo, lift = 0.0) {
	const d = boardInfo.boardTop - pos.dot(boardInfo.normal);
	pos.addScaledVector(boardInfo.normal, d + lift);
	return pos;
}

function squareFromWorldPoint(point, boardInfo) {
	const v = tmpV.copy(point).sub(boardInfo.center);

	const denom = Math.max(1e-6, boardInfo.squareSize * GRID.spacing);
	const u = v.dot(boardInfo.fileAxis) / denom + 3.5;
	const w = v.dot(boardInfo.rankAxis) / denom + 3.5;

	const file = Math.round(u);
	const rank = Math.round(w);

	if (file < 0 || file > 7 || rank < 0 || rank > 7) return null;

	return fileRankToSquare(file, rank);
}

function indexPiecesBySquare() {
	squareToPiece.clear();
	if (!piecesGroup) return;

	for (const piece of piecesGroup.children) {
		const sq = fileRankToSquare(piece.userData.file, piece.userData.rank);
		piece.userData.square = sq;
		squareToPiece.set(sq, piece);
	}
}

// ------------------------------------------------------------
// Cinematic camera path (scroll driven)
// ------------------------------------------------------------
function setupCinematicFromBoard(boardInfo, board) {
	tmpBox.setFromObject(board);
	tmpBox.getSize(tmpSize);
	tmpBox.getCenter(tmpCenter);

	boardSpan = Math.max(tmpSize.x, tmpSize.z);

	basisCenter.copy(boardInfo.center);
	basisRight.copy(boardInfo.fileAxis).normalize();
	basisForward.copy(boardInfo.rankAxis).normalize();
	basisUp.copy(boardInfo.normal).normalize();
	if (basisUp.dot(WORLD_UP) < 0) basisUp.multiplyScalar(-1);

	// INTRO (side spectator)
	introTarget.copy(basisCenter).addScaledVector(basisUp, boardSpan * CINEMATIC.introTargetUp);
	introCamPos.copy(basisCenter)
		.addScaledVector(basisUp, boardSpan * CINEMATIC.introUp)
		.addScaledVector(basisRight, boardSpan * CINEMATIC.introSideDist)
		.addScaledVector(basisForward, boardSpan * CINEMATIC.introForward);

	// PLAY (White perspective)
	playTarget.copy(basisCenter).addScaledVector(basisUp, boardSpan * CINEMATIC.playTargetUp);
	playCamPos.copy(basisCenter)
		.addScaledVector(basisUp, boardSpan * CINEMATIC.playUp)
		.addScaledVector(basisForward, -boardSpan * CINEMATIC.playBack)
		.addScaledVector(basisRight, boardSpan * CINEMATIC.playSide);

	if (Math.abs(CINEMATIC.twistDeg) > 1e-6) {
		const twist = THREE.MathUtils.degToRad(CINEMATIC.twistDeg);
		tmpQuat.setFromAxisAngle(basisUp, twist);

		const off = tmpV.copy(playCamPos).sub(basisCenter).applyQuaternion(tmpQuat);
		playCamPos.copy(basisCenter).add(off);
	}

	camera.position.copy(introCamPos);
	controls.target.copy(introTarget);

	const introDist = camera.position.distanceTo(controls.target);
	camera.near = Math.max(0.01, introDist / 100);
	camera.far = Math.max(500, introDist * 6);

	camera.updateProjectionMatrix();
	controls.update();

	cinematicReady = true;
	applyCinematic(scrollTarget01, true);
}

function applyCinematic(p01, force = false) {
	if (!cinematicReady || !camera || !controls) return;

	const e = easeInOutCubic(p01);

	camera.position.lerpVectors(introCamPos, playCamPos, e);
	controls.target.lerpVectors(introTarget, playTarget, e);

	controls.enabled = p01 >= CINEMATIC.enableOrbitAt;
	controls.update();

	if (force) camera.updateProjectionMatrix();
}

// ------------------------------------------------------------
// Strict templates (no fallback)
// ------------------------------------------------------------
function getTemplatesStrict(rootObj) {
	const out = {};
	for (const [type, name] of Object.entries(TEMPLATE_NAMES)) {
		const node = rootObj.getObjectByName(name);
		if (!node) throw new Error(`Missing template node "${name}" for type "${type}".`);
		out[type] = node;
	}
	return out;
}

function hideTemplates(templates) {
	for (const t of Object.values(templates)) t.visible = false;
}

// ------------------------------------------------------------
// Build full set
// ------------------------------------------------------------
function buildFullSetFromTemplates(templates, board) {
	clearHover();

	if (piecesGroup) {
		scene.remove(piecesGroup);
		disposeObject3D(piecesGroup);
		piecesGroup = null;
	}

	piecesGroup = new THREE.Group();
	piecesGroup.name = "GeneratedPieces";
	scene.add(piecesGroup);

	meshToPiece = new WeakMap();

	const boardInfo = computeBoardGrid(board);

	const addPiece = (type, color, file, rank) => {
		const piece = clonePieceWithTint(templates[type], color);

		piece.userData.type = type;
		piece.userData.color = color;
		piece.userData.file = file;
		piece.userData.rank = rank;

		piece.name = `${color}_${type}_${file}_${rank}`;

		normalizePieceUprightAndScale(piece, boardInfo.squareSize, color);
		placeOnSquare(piece, boardInfo, file, rank, color);

		piece.traverse((o) => {
			if (o.isMesh) meshToPiece.set(o, piece);
		});

		piecesGroup.add(piece);
	};

	// White
	addPiece("rook", "white", 0, 0);
	addPiece("knight", "white", 1, 0);
	addPiece("bishop", "white", 2, 0);
	addPiece("queen", "white", 3, 0);
	addPiece("king", "white", 4, 0);
	addPiece("bishop", "white", 5, 0);
	addPiece("knight", "white", 6, 0);
	addPiece("rook", "white", 7, 0);
	for (let f = 0; f < 8; f++) addPiece("pawn", "white", f, 1);

	// Black
	addPiece("rook", "black", 0, 7);
	addPiece("knight", "black", 1, 7);
	addPiece("bishop", "black", 2, 7);
	addPiece("queen", "black", 3, 7);
	addPiece("king", "black", 4, 7);
	addPiece("bishop", "black", 5, 7);
	addPiece("knight", "black", 6, 7);
	addPiece("rook", "black", 7, 7);
	for (let f = 0; f < 8; f++) addPiece("pawn", "black", f, 6);

	piecesGroup.updateMatrixWorld(true);
}

function clonePieceWithTint(template, color) {
	const clone = template.clone(true);
	clone.visible = true;
	clone.traverse((o) => {
		o.visible = true;
	});

	const target = color === "white" ? WHITE_TINT : BLACK_TINT;

	clone.traverse((o) => {
		if (!o.isMesh || !o.material) return;

		const apply = (m) => {
		const nm = m.clone();

		// IMPORTANT: ignore template base color entirely (templates are inconsistent).
		// Force a uniform base color per side.
		if (nm.color) nm.color.copy(target);

		// Make shape readable with highlights instead of relying on albedo differences
		if (typeof nm.roughness === "number") nm.roughness = (color === "white") ? 0.10 : 0.30; // rougher black
		if (typeof nm.metalness === "number") nm.metalness = (color === "white") ? 0.30 : 0.90; // less metallic black
		if ("envMapIntensity" in nm) nm.envMapIntensity = (color === "white") ? 1.45 : 0.55;   // softer env reflections

		// Optional (tiny) contrast help: slightly darken whites / slightly lift blacks
		// without depending on original template colors.
		if (nm.color) nm.color.offsetHSL(0, 0, (color === "white") ? -0.06 : 0.03);

		if (nm.emissive) nm.emissive.setHex(0x000000);

		nm.needsUpdate = true;
		return nm;
		};

		o.material = Array.isArray(o.material) ? o.material.map(apply) : apply(o.material);
	});

	return clone;
}

function recolorBoard(boardRoot, squareSize) {
	if (!boardRoot) return;

	boardRoot.traverse((o) => {
		if (!o.isMesh || !o.material) return;
		if (/pawn|rook|knight|bishop|queen|king/i.test(o.name || "")) return;

		tmpBox.setFromObject(o);
		tmpBox.getSize(tmpSize);
		const isBorderByThickness = tmpSize.y > squareSize * 0.18;

		const objName = (o.name || "").toLowerCase();

		const apply = (m) => {
			const nm = m.clone();
			if (!nm.color) return nm;

			const matName = (nm.name || "").toLowerCase();

			const isBorderByName =
				/frame|border|rim|edge|base|wood/.test(matName) ||
				/frame|border|rim|edge|base|wood/.test(objName);

			const isLight =
				/light|white|tan|beige/.test(matName) ||
				/light|white|tan|beige/.test(objName);

			const isDark =
				/dark|black|green/.test(matName) ||
				/dark|black|green/.test(objName);

			let role = "dark";
			if (isBorderByThickness || isBorderByName) role = "border";
			else if (isLight && !isDark) role = "light";
			else if (isDark && !isLight) role = "dark";
			else {
				const c = m.color || nm.color;
				const l = 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;
				role = l > 0.55 ? "light" : "dark";
			}

			nm.color.set(BOARD_COLORS[role]);
			nm.needsUpdate = true;
			return nm;
		};

		o.material = Array.isArray(o.material) ? o.material.map(apply) : apply(o.material);
	});
}

// ------------------------------------------------------------
// Board/grid math
// ------------------------------------------------------------
function findBoardMesh(rootObj) {
	let best = null;
	let bestScore = -Infinity;

	const box = new THREE.Box3();
	const size = new THREE.Vector3();

	rootObj.traverse((o) => {
		if (!o.isMesh) return;

		box.setFromObject(o);
		box.getSize(size);

		const flatness = size.y / Math.max(size.x, size.z, 1e-6);
		const area = size.x * size.z;

		let score = area * (flatness < 0.12 ? 1 : 0);
		if (/board/i.test(o.name || "")) score *= 4;

		if (score > bestScore) {
			bestScore = score;
			best = o;
		}
	});

	return best;
}

function computeBoardGrid(board) {
	tmpBox.setFromObject(board);
	tmpBox.getSize(tmpSize);
	tmpBox.getCenter(tmpCenter);

	const squareSize = Math.min(tmpSize.x, tmpSize.z) / 8;

	board.getWorldQuaternion(tmpQuat);
	tmpAxisX.set(1, 0, 0).applyQuaternion(tmpQuat).normalize();
	tmpAxisY.set(0, 1, 0).applyQuaternion(tmpQuat).normalize();
	tmpAxisZ.set(0, 0, 1).applyQuaternion(tmpQuat).normalize();

	let normal = tmpAxisY;
	let best = Math.abs(tmpAxisY.dot(WORLD_UP));

	const xScore = Math.abs(tmpAxisX.dot(WORLD_UP));
	if (xScore > best) {
		best = xScore;
		normal = tmpAxisX;
	}

	const zScore = Math.abs(tmpAxisZ.dot(WORLD_UP));
	if (zScore > best) {
		best = zScore;
		normal = tmpAxisZ;
	}

	tmpNormal.copy(normal).normalize();
	// Make sure normal points upward (avoids "underside" placement if model axis is flipped)
	if (tmpNormal.dot(WORLD_UP) < 0) tmpNormal.multiplyScalar(-1);

	const fileAxis = tmpAxisX.clone().sub(tmpNormal.clone().multiplyScalar(tmpAxisX.dot(tmpNormal)));
	if (fileAxis.lengthSq() < 1e-10) throw new Error("Board file axis is degenerate after projection.");
	fileAxis.normalize();

	const rankAxis = tmpNormal.clone().cross(fileAxis).normalize();

	const boardTop = getBoxExtremeAlongNormal(tmpBox, tmpNormal, true);

	return {
		center: tmpCenter.clone(),
		squareSize,
		normal: tmpNormal.clone(),
		fileAxis,
		rankAxis,
		boardTop,
	};
}

function getBoxExtremeAlongNormal(box, normal, max) {
	const x0 = box.min.x,
		y0 = box.min.y,
		z0 = box.min.z;
	const x1 = box.max.x,
		y1 = box.max.y,
		z1 = box.max.z;

	let extreme = max ? -Infinity : Infinity;

	const test = (x, y, z) => {
		tmpCorner.set(x, y, z);
		const d = tmpCorner.dot(normal);
		if (max) extreme = Math.max(extreme, d);
		else extreme = Math.min(extreme, d);
	};

	test(x0, y0, z0);
	test(x0, y0, z1);
	test(x0, y1, z0);
	test(x0, y1, z1);
	test(x1, y0, z0);
	test(x1, y0, z1);
	test(x1, y1, z0);
	test(x1, y1, z1);

	return extreme;
}

// ------------------------------------------------------------
// Piece placement
// ------------------------------------------------------------
function normalizePieceUprightAndScale(piece, squareSize, color) {
	piece.position.set(0, 0, 0);
	piece.rotation.set(0, 0, 0);
	piece.updateWorldMatrix(true, true);

	piece.rotation.x = -Math.PI / 2;
	piece.rotation.z = Math.PI / 2;
	piece.updateWorldMatrix(true, true);

	tmpBox.setFromObject(piece);
	tmpBox.getSize(tmpSize);

	const footprint = Math.max(tmpSize.x, tmpSize.z);
	if (footprint > 1e-6 && squareSize > 1e-6) {
		const desired = squareSize * PIECE.footprintRatio;
		const s = THREE.MathUtils.clamp(desired / footprint, 0.001, 1000);
		piece.scale.multiplyScalar(s);
		piece.updateWorldMatrix(true, true);
	}
}

function placeOnSquare(piece, boardInfo, file, rank, color) {
	const { center, squareSize, normal, fileAxis, rankAxis, boardTop } = boardInfo;

	const fx = (file - 3.5) * GRID.spacing + GRID.offsetFile;
	const rz = (rank - 3.5) * GRID.spacing + GRID.offsetRank;

	tmpTarget.copy(center).addScaledVector(fileAxis, fx * squareSize).addScaledVector(rankAxis, rz * squareSize);

	piece.position.copy(tmpTarget);

	const boardRoll = Math.atan2(fileAxis.z, fileAxis.x);
	piece.rotation.z = boardRoll + (color === "black" ? -0.5 * Math.PI : 0.5 * Math.PI);

	piece.updateWorldMatrix(true, true);

	const base = getBaseCenterXZWorld(piece);
	piece.position.x += tmpTarget.x - base.x;
	piece.position.z += tmpTarget.z - base.z;

	piece.updateWorldMatrix(true, true);

	tmpBox.setFromObject(piece);
	const pieceBottom = getBoxExtremeAlongNormal(tmpBox, normal, false);
	const lift = boardTop - pieceBottom + PIECE.liftEps;

	piece.position.addScaledVector(normal, lift);
	piece.updateWorldMatrix(true, true);
}

function getBaseCenterXZWorld(obj) {
	tmpBox.setFromObject(obj);
	const minY = tmpBox.min.y;
	const maxY = tmpBox.max.y;

	const yThresh = minY + (maxY - minY) * 0.08;

	let sx = 0;
	let sz = 0;
	let n = 0;

	obj.traverse((o) => {
		if (!o.isMesh || !o.geometry?.attributes?.position) return;

		const pos = o.geometry.attributes.position;
		o.updateWorldMatrix(true, false);
		const mat = o.matrixWorld;

		const step = Math.max(1, Math.floor(pos.count / 1500));
		for (let i = 0; i < pos.count; i += step) {
			tmpV.fromBufferAttribute(pos, i).applyMatrix4(mat);
			if (tmpV.y <= yThresh) {
				sx += tmpV.x;
				sz += tmpV.z;
				n++;
			}
		}
	});

	if (n > 0) return new THREE.Vector3(sx / n, 0, sz / n);

	tmpBox.getCenter(tmpCenter);
	return new THREE.Vector3(tmpCenter.x, 0, tmpCenter.z);
}

// ------------------------------------------------------------
// Hover pick + glow + time-limited jiggle + hover move preview
// ------------------------------------------------------------
function onPointerMove(ev) {
	if (!piecesGroup || loading.value || error.value) return;
	if (!renderer || !camera) return;
	if (isAnimating()) return;

	const rect = renderer.domElement.getBoundingClientRect();
	pointer.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
	pointer.y = -(((ev.clientY - rect.top) / rect.height) * 2 - 1);

	raycaster.setFromCamera(pointer, camera);

	const hits = raycaster.intersectObject(piecesGroup, true);
	if (!hits.length) {
		clearHover();
		return;
	}

	const pieceRoot = getPieceRootFromHit(hits[0].object);
	if (!pieceRoot) {
		clearHover();
		return;
	}

	if (hoveredPiece === pieceRoot) return;
	setHover(pieceRoot);
}

function setHover(pieceRoot) {
	clearHover();

	hoveredPiece = pieceRoot;
	hoveredBasePos = pieceRoot.position.clone();
	hoveredBaseQuat = pieceRoot.quaternion.clone();
	hoverStartTime = elapsed;

	document.body.style.cursor = "pointer";

	hoveredEmissiveRestore = [];
	pieceRoot.traverse((o) => {
		if (!o.isMesh || !o.material) return;

		const mats = Array.isArray(o.material) ? o.material : [o.material];
		for (const m of mats) {
			if (!m?.emissive) continue;
			hoveredEmissiveRestore.push({ mat: m, emissive: m.emissive.clone() });
			m.emissive.setHex(HOVER_GLOW);
			m.needsUpdate = true;
		}
	});

	// Hover preview moves (only when nothing selected)
	if (!selected) showHoverMoves(pieceRoot);
}

function clearHover() {
	if (!hoveredPiece) return;

	hoveredPiece.position.copy(hoveredBasePos);
	hoveredPiece.quaternion.copy(hoveredBaseQuat);

	for (const { mat, emissive } of hoveredEmissiveRestore) {
		mat.emissive.copy(emissive);
		mat.needsUpdate = true;
	}

	hoveredPiece = null;
	hoveredBasePos = null;
	hoveredBaseQuat = null;
	hoveredEmissiveRestore = [];
	document.body.style.cursor = "";

	clearHoverHighlights();
}

function applyHoverShake(nowT) {
	if (!hoveredPiece) return;

	const dt = nowT - hoverStartTime;

	// 0..1s steady, then ease out to 0 by 2s
	let env = 1.0;
	if (dt >= HOVER_SHAKE.totalSec) env = 0.0;
	else if (dt > HOVER_SHAKE.holdSec) {
		const t01 = (dt - HOVER_SHAKE.holdSec) / Math.max(1e-6, HOVER_SHAKE.totalSec - HOVER_SHAKE.holdSec);
		env = 1.0 - smoothstep(0, 1, t01);
	}

	// Stop fully after 2s (but keep glow / cursor)
	if (env <= 1e-4) {
		hoveredPiece.position.copy(hoveredBasePos);
		hoveredPiece.quaternion.copy(hoveredBaseQuat);
		return;
	}

	const f = HOVER_SHAKE.freq;

	hoveredPiece.position.copy(hoveredBasePos);
	hoveredPiece.quaternion.copy(hoveredBaseQuat);

	tmpEuler.set(
		env * HOVER_SHAKE.rotAmp * Math.sin(nowT * f * 1.1),
		env * HOVER_SHAKE.rotAmp * 0.8 * Math.sin(nowT * f * 0.9),
		env * HOVER_SHAKE.rotAmp * 0.6 * Math.sin(nowT * f * 1.3)
	);

	tmpQuat.setFromEuler(tmpEuler);
	hoveredPiece.quaternion.multiply(tmpQuat);

	hoveredPiece.position.x += env * HOVER_SHAKE.posAmp * Math.sin(nowT * f * 1.7);
	hoveredPiece.position.z += env * HOVER_SHAKE.posAmp * Math.cos(nowT * f * 1.4);
}

// ------------------------------------------------------------
// Loop + resize + dispose
// ------------------------------------------------------------
function startLoop() {
	const tick = () => {
		raf = requestAnimationFrame(tick);
		if (!renderer || !scene || !camera || !controls) return;

		const delta = clock.getDelta();
		elapsed += delta;

		scroll01.value = THREE.MathUtils.damp(scroll01.value, scrollTarget01, CINEMATIC.smoothing, delta);
		applyCinematic(scroll01.value);

		updateMoveAnimations(elapsed);
		applyHoverShake(elapsed);

		renderer.render(scene, camera);
	};
	tick();
}

function stopLoop() {
	if (raf) cancelAnimationFrame(raf);
	raf = 0;
}

function onResize() {
	if (!renderer || !camera) return;

	renderer.setSize(window.innerWidth, window.innerHeight);
	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();
}

function disposeAll() {
	if (renderer?.domElement) {
		renderer.domElement.removeEventListener("pointermove", onPointerMove);
		renderer.domElement.removeEventListener("pointerleave", clearHover);
		renderer.domElement.removeEventListener("pointerdown", onPointerDown);
	}

	clearHover();
	clearSelection();

	disposeHighlightSystem();

	if (piecesGroup) {
		scene?.remove(piecesGroup);
		disposeObject3D(piecesGroup);
		piecesGroup = null;
	}

	if (root) {
		scene?.remove(root);
		disposeObject3D(root);
		root = null;
	}

	envTex?.dispose?.();
	envTex = null;

	pmrem?.dispose?.();
	pmrem = null;

	controls?.dispose();
	controls = null;

	renderer?.dispose();
	renderer = null;

	scene = null;
	camera = null;
}

function disposeObject3D(obj) {
	obj.traverse((o) => {
		if (!o.isMesh) return;

		o.geometry?.dispose?.();

		const mats = Array.isArray(o.material) ? o.material : [o.material];
		for (const m of mats) {
			if (!m) continue;

			for (const k of Object.keys(m)) {
				const v = m[k];
				if (v && v.isTexture) v.dispose();
			}

			m.dispose?.();
		}
	});
}

// ------------------------------------------------------------
// Helpers
// ------------------------------------------------------------
function smoothstep(edge0, edge1, x) {
	const t = THREE.MathUtils.clamp((x - edge0) / Math.max(1e-6, edge1 - edge0), 0, 1);
	return t * t * (3 - 2 * t);
}

function easeInOutCubic(x) {
	const t = THREE.MathUtils.clamp(x, 0, 1);
	return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}
</script>

<style scoped>
.page {
	min-height: 100vh;
}

.chess-stage {
	position: fixed;
	inset: 0;
	width: 100vw;
	height: 100vh;
	overflow: hidden;
}

.chess-canvas {
	width: 100%;
	height: 100%;
	display: block;
}

.hero {
	position: absolute;
	inset: 0;
	display: grid;
	place-items: center;
	pointer-events: none;
	z-index: 2;
	text-align: center;
	padding: 0 18px;
}

.hero-title {
	font-weight: 900;
	letter-spacing: 0.02em;
	line-height: 1;
	font-size: clamp(40px, 7vw, 78px);
	color: rgba(245, 248, 255, 0.96);
	text-shadow: 0 0 14px rgba(80, 140, 255, 0.35), 0 0 44px rgba(80, 140, 255, 0.18),
		0 12px 60px rgba(0, 0, 0, 0.55);
}

.hero-sub {
	margin-top: 10px;
	opacity: 0.88;
	color: rgba(231, 238, 252, 0.9);
}

.info-card {
	position: absolute;
	left: 18px;
	bottom: 18px;
	width: min(520px, calc(100vw - 36px));
	border-radius: 14px;
	padding: 12px 14px;
	background: rgba(10, 16, 32, 0.62);
	border: 1px solid rgba(231, 238, 252, 0.16);
	backdrop-filter: blur(10px);
	z-index: 2;
	pointer-events: none;
}

.info-title {
	font-weight: 800;
	color: rgba(231, 238, 252, 0.95);
	margin-bottom: 6px;
}

.info-sub {
	opacity: 0.88;
	color: rgba(231, 238, 252, 0.9);
}

.overlay {
	position: absolute;
	inset: 0;
	display: grid;
	place-items: center;
	pointer-events: none;
	z-index: 3;
}

.overlay-card {
	width: min(340px, 88vw);
	border-radius: 14px;
	padding: 14px;
	background: rgba(10, 16, 32, 0.72);
	border: 1px solid rgba(231, 238, 252, 0.18);
	backdrop-filter: blur(10px);
}

.overlay-card.error {
	border-color: rgba(255, 80, 80, 0.26);
}

.title {
	font-weight: 700;
	margin-bottom: 10px;
	color: rgba(231, 238, 252, 0.95);
}

.sub {
	opacity: 0.85;
	color: rgba(231, 238, 252, 0.9);
}

.bar {
	height: 10px;
	border-radius: 999px;
	overflow: hidden;
	border: 1px solid rgba(231, 238, 252, 0.14);
	background: rgba(255, 255, 255, 0.06);
	margin-bottom: 8px;
}

.fill {
	height: 100%;
	background: rgba(60, 120, 255, 0.9);
}

.scroll-spacer {
	height: 220vh;
}

.vignette {
	pointer-events: none;
	position: absolute;
	inset: -2px;
	z-index: 1;
	background: radial-gradient(1200px 700px at 50% 35%, rgba(255, 255, 255, 0.08), rgba(0, 0, 0, 0) 55%),
		radial-gradient(1200px 900px at 50% 50%, rgba(0, 0, 0, 0), rgba(0, 0, 0, 0.55) 75%),
		linear-gradient(to bottom, rgba(0, 0, 0, 0.25), rgba(0, 0, 0, 0.35));
}

.mono {
	font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
}
</style>
