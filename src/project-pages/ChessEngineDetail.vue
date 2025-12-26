<template>
	<div class="page" :class="pageTheme">
		<section class="chess-stage">
			<canvas ref="canvasRef" class="chess-canvas"></canvas>

			<div
				class="stage-hero"
				:style="{
					opacity: heroOpacity,
					transform: `translateY(${heroTranslateY}px)`,
				}"
			>
				<div class="hero-title">{{ heroTitle }}</div>
				<div class="hero-sub mono">Scroll down to learn more</div>
			</div>

			<!-- Idle prompt ... -->
			<div class="idle-prompt" :class="{ 'is-visible': makeMoveVisible }" :aria-hidden="!makeMoveVisible">
				<div class="hero-sub mono idle-prompt-text">Make a move</div>
			</div>

			<!-- Skip-to-content prompt -->
			<div class="skip-prompt" :class="{ 'is-visible': skipPromptVisible }" :aria-hidden="!skipPromptVisible">
				<div class="skip-prompt-text mono">Only interested in the content?</div>
				<button class="skip-button mono" type="button" @click="skipToContent">
					Skip
				</button>
			</div>

			<!-- Loading overlay... -->
			<div class="vignette" />
		</section>

		<div class="scroll-spacer" :style="{ height: scrollSpacerHeight }" aria-hidden="true"></div>

		<!-- NEW: Content section (DOM cards) -->
		<article
		class="content"
		:class="{ 'is-visible': contentDomVisible }"
		:aria-hidden="(!contentDomVisible).toString()"
		>
			<section class="card hero">
				<div class="section-label">Chess · Project</div>
				<h1 class="hero-title"> </h1>
				<div class="hero-meta mono"><strong>Stack:</strong> </div>

				<div class="hero-grid">
					<div class="hero-copy">
						<p class="hero-summary">&nbsp;</p>
						<p class="hero-summary">&nbsp;</p>

						<div class="hero-actions">
							<a class="btn" href="#" @click.prevent> </a>
							<a class="btn secondary" href="#" @click.prevent> </a>
						</div>
					</div>

					<div class="hero-image">
						<div class="image-wrapper">
							<div class="image image-placeholder"></div>
						</div>
					</div>
				</div>
			</section>

			<section class="row grid cols-2">
				<div class="card">
					<div class="image-wrapper large">
						<div class="image image-placeholder large"></div>
					</div>
					<div class="image-wrapper large" style="margin-top:14px;">
						<div class="image image-placeholder large"></div>
					</div>
				</div>

				<section class="card">
					<div class="section-label"> </div>
					<h2 class="section-title small"> </h2>
					<p class="section-intro">&nbsp;</p>

					<ol class="pipeline-list">
						<li>&nbsp;</li>
						<li>&nbsp;</li>
						<li>&nbsp;</li>
						<li>&nbsp;</li>
					</ol>
				</section>
			</section>

			<section class="card outcomes">
				<div class="section-label"> </div>
				<h2 class="section-title small"> </h2>
				<p class="section-intro">&nbsp;</p>

				<div class="outcomes-grid">
					<div class="outcomes-text">
						<p>&nbsp;</p>
						<p>&nbsp;</p>
					</div>

					<div class="outcomes-images">
						<div class="image-wrapper large">
							<div class="image image-placeholder large"></div>
						</div>
						<div class="image-wrapper large">
							<div class="image image-placeholder large"></div>
						</div>
					</div>
				</div>
			</section>
		</article>
	</div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";

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

let canvasListenersAttached = false;

// Highlights (selection vs hover preview)
let selectionHighlightsGroup = null;
let hoverHighlightsGroup = null;

// Idle hint highlight (separate so it doesn't fight selection/hover)
let idleHintHighlightsGroup = null;

let dotGeo = null;
let captureRingGeo = null;
let selectRingGeo = null;
let highlightQuat = new THREE.Quaternion();

let matMoveSel = null;
let matCaptureSel = null;
let matSelectFrom = null;

let matMoveHover = null;
let matCaptureHover = null;

let matIdleHint = null;

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

const CAM_LOCAL_UP = new THREE.Vector3(0, 1, 0);

function getCameraUpWorld(out) {
	invariant(camera, "getCameraUpWorld requires camera.");
	return out.copy(CAM_LOCAL_UP).applyQuaternion(camera.quaternion).normalize();
}

// “Down on the screen” in world space = -cameraUpWorld
function getCameraScreenDownWorld(out) {
	return getCameraUpWorld(out).multiplyScalar(-1);
}

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

// Move animation (slightly slower by request)
const MOVE_ANIM = {
	durationSec: 0.38, // was 0.28
	jumpHeightRatio: 0.32, // relative to square size

	// Drag & drop settle: a touch snappier, and no extra "jump" (you're already lifted)
	dragDropDurationSec: 0.22,
	dragDropJumpHeightRatio: 0.0,

	// When cancelling an invalid drag (return to origin)
	dragCancelDurationSec: 0.18,
};

// Drag & drop config
const DRAG = {
	thresholdPx: 7,
	liftRatio: 0.20, // relative to square size
};

let dragCandidate = null; // { pieceRoot, fromSquare, startX, startY }
let draggingPiece = null;
let dragFromSquare = null;

let dragPlane = null;
let dragOffsetPlanar = new THREE.Vector3();
let dragLift = 0;
let dragLastPlanePoint = new THREE.Vector3();
let dragPrevControlsEnabled = false;

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
	// vh per stage
	transitionVh: 210,
	stages: 3,

	smoothing: 6.0,

	titleFadeStart: 0.05,
	titleFadeEnd: 0.32,

	// Start position
	introSideDist: 1.5,
	introUp: 0.02,
	introForward: 0,
	introSide: 0,
	introTargetUp: 0.08,

	// Final Position (stage 1)
	playBack: 1.1,
	playUp: 1.5,
	playSide: -0.0,
	playTargetUp: 0.0,

	// Learn-more Position (stage 2) — subtle lift + full roll upside down
	learnBack: 0.88,
	learnUp: 0.14,
	learnSide: 0.0,
	learnTargetUp: 0.14,
	learnTargetForward: 0.85,
	learnTargetSide: 0.0,
	learnRollRad: Math.PI,

	// Stage 3 (content) — camera pans DOWN to a text card
	contentBack: 0.88,
	contentUp: 0.14,
	contentSide: 0.0,
	contentTargetUp: 0.6,
	contentTargetForward: 0.85,
	contentTargetSide: 0.0,
	contentRollRad: Math.PI,

	twistDeg: 0,
};

// Scroll state (0..2)
let scrollTargetT = 0;
const scrollT = ref(0);
let endAutoAdvanceDone = false;


// Cinematic poses
let introCamPos = new THREE.Vector3();
let introTarget = new THREE.Vector3();
let playCamPos = new THREE.Vector3();
let playTarget = new THREE.Vector3();

// Stage 2 (learn more) pose
let learnCamPos = new THREE.Vector3();
let learnTarget = new THREE.Vector3();

// Stage 3 (content) pose
let contentCamPos = new THREE.Vector3();
let contentTarget = new THREE.Vector3();

// Basis for “white perspective”
let basisCenter = new THREE.Vector3();
let basisUp = new THREE.Vector3();
let basisRight = new THREE.Vector3();
let basisForward = new THREE.Vector3();
let boardSpan = 1;

let cinematicReady = false;

// ------------------------------------------------------------
// Stage 2 -> 3 scene objects
// ------------------------------------------------------------
let contentGroup = null;
let contentCardSprite = null;
let contentCardTexture = null;
let contentCardMaterial = null;

let fallingPiecesGroup = null;
let fallingPieces = []; // { obj, speed, angVel: THREE.Vector3 }
let rainSpawnAcc = 0;

let stage2DropStarted = false;
let stage2DropStartTime = 0;

const STAGE2_DROP = {
	startScrollT: 2.0,      // start dropping existing board pieces once you enter stage 2 transition
	maxDelaySec: 0.75,       // random delay per piece
	speedMinSpan: 0.55,      // multiplied by boardSpan
	speedMaxSpan: 1.30,
	cullBelowSpan: 3.25,     // remove once below center by this span
};

const BG_RAIN = {
	startScrollT: 1.60,      // start background rain when camera begins panning to the text card
	spinScrollT: 2.8,       // “then” -> start spawning spinning pieces late in the transition
	rateStraight: 10.0,       // pieces/sec (upright)
	rateSpin: 14.0,          // pieces/sec (random rotation)
	maxPieces: 140,
	spawnRadiusSpan: 1.8,
	spawnHeightSpan: 2.2,
	speedMinSpan: 0.85,
	speedMaxSpan: 1.70,
	angVelMax: 6.0,          // rad/sec
	cullBelowSpan: 3.8,
};

// ------------------------------------------------------------
// Stage 3 lock (once fully reached, prevent scrolling back up)
// ------------------------------------------------------------
const CONTENT_LOCK = {
	activateAtScrollT: 2.98, // near the end of stage 2->3 (3.0 is fully complete)
};

let contentLockActive = false;
let contentLockMinY = 0;

function computeContentLockMinY() {
	// Full stage-3 completion corresponds to scrollT === 3, which is scrollY === stageLenPx()*3
	return stageLenPx() * CINEMATIC.stages;
}

function enforceContentMinScroll() {
	if (!contentLockActive) return;
	if (window.scrollY < contentLockMinY) {
		window.scrollTo({ top: contentLockMinY, behavior: "auto" });
	}
}

function setHeaderVisible(visible) {
	// This assumes your header can be controlled by a global class.
	// If your header uses a store instead, swap this implementation.
	document.documentElement.classList.toggle("header-visible", visible);
}


// ------------------------------------------------------------
// Chess state (logic)
// ------------------------------------------------------------
const game = createChessGame();
let templatesGlobal = null;
let boardInfoGlobal = null;

const squareToPiece = new Map(); // square => Object3D root
let selected = null; // { pieceRoot, fromSquare }
let selectedMoves = []; // verbose moves from chess.js

// Engine
let engine = null;
const engineThinking = ref(false);

// End scene state: null | "win" | "lose" | "draw" | "gameover"
const endScene = ref(null);

const heroTitle = computed(() => {
	if (endScene.value === "win") return "You won!";
	if (endScene.value === "lose") return "You lost";
	if (endScene.value === "draw") return "Draw";
	if (endScene.value === "gameover") return "Game over";
	return "Chess Engine C++";
});

const pageTheme = computed(() => {
	if (endScene.value === "win") return "theme-win";
	if (endScene.value === "lose") return "theme-lose";
	if (endScene.value === "draw") return "theme-draw";
	if (endScene.value === "gameover") return "theme-draw"; // neutral look; change if you want
	return "theme-default";
});

// ------------------------------------------------------------
// Idle “Make a move” prompt + d2 pawn shake
// ------------------------------------------------------------
const IDLE_HINT = {
	delayMs: 400,
	square: "e2",
	settledP01: 0.995,
};

// subtle, “selected-ish” shake (continuous while hint is visible)
const IDLE_SHAKE = {
	rotAmp: 0.022,
	posAmp: 0.004,
	freq: 12.0,
};

const cinematicSettled = computed(() => scrollT.value >= IDLE_HINT.settledP01);

const idleHintVisible = ref(false);
let idleHintTimeout = 0;
const didAnyMove = ref(false);

let idleShakePiece = null;
let idleShakeBasePos = null;
let idleShakeBaseQuat = null;

const makeMoveVisible = computed(() => idleHintVisible.value);

function shouldShowIdleHint() {
	if (endScene.value) return false;
	if (didAnyMove.value) return false;
	if (!cinematicSettled.value) return false;
	if (loading.value) return false;
	if (engineThinking.value) return false;
	if (game.isGameOver()) return false;
	if (game.turn() !== "w") return false;
	if (isAnimating()) return false;
	if (isDraggingOrPending()) return false;
	return true;
}

const skipPromptVisible = computed(() => {
	if (loading.value) return false;
	if (!cinematicReady) return false;
	if (endScene.value) return false;
	if (!cinematicSettled.value) return false;

	// avoid offering the button during active interactions
	if (engineThinking.value) return false;
	if (isAnimating()) return false;
	if (isDraggingOrPending()) return false;

	return true;
});

const contentDomVisible = computed(() => {
	return !!endScene.value && scrollT.value >= 2.85;
});

function skipToContent() {
	if (endScene.value) return;

	// kill any chess UX state
	endScene.value = "gameover";

	cancelIdleHint();
	clearSelection();
	clearHover();
	detachDragListeners();

	window.scrollTo({ top: 0, behavior: "smooth" });
}


function clearIdleHintHighlights() {
	idleHintHighlightsGroup?.clear?.();
}

function stopIdleShake() {
	if (!idleShakePiece) return;
	idleShakePiece.position.copy(idleShakeBasePos);
	idleShakePiece.quaternion.copy(idleShakeBaseQuat);
	idleShakePiece.updateWorldMatrix(true, true);

	idleShakePiece = null;
	idleShakeBasePos = null;
	idleShakeBaseQuat = null;
}

function cancelIdleHint() {
	if (idleHintTimeout) {
		clearTimeout(idleHintTimeout);
		idleHintTimeout = 0;
	}
	idleHintVisible.value = false;
	clearIdleHintHighlights();
	stopIdleShake();
}

function scheduleIdleHint() {
	cancelIdleHint();
	idleHintTimeout = window.setTimeout(() => {
		if (!shouldShowIdleHint()) return;

		// Only show if the target pawn still exists at d2
		indexPiecesBySquare();
		const p = squareToPiece.get(IDLE_HINT.square);
		if (!p) return;

		idleHintVisible.value = true;
		startIdleHintVisuals();
	}, IDLE_HINT.delayMs);
}

function startIdleHintVisuals() {
	invariant(boardInfoGlobal, "Idle hint requires boardInfoGlobal.");
	invariant(basisRight && basisForward && basisUp, "Idle hint requires cinematic basis vectors.");

	indexPiecesBySquare();
	const pawn = squareToPiece.get(IDLE_HINT.square);
	if (!pawn) return;

	// Store base transform once (don’t drift)
	idleShakePiece = pawn;
	idleShakeBasePos = pawn.position.clone();
	idleShakeBaseQuat = pawn.quaternion.clone();

	// Add a subtle ring under d2 (separate group so it won’t clobber selection)
	clearIdleHintHighlights();
	addIdleHintRing(IDLE_HINT.square);
}

function addIdleHintRing(square) {
	invariant(boardInfoGlobal, "addIdleHintRing requires boardInfoGlobal.");
	invariant(idleHintHighlightsGroup, "addIdleHintRing requires idleHintHighlightsGroup.");

	const { file, rank } = squareToFileRank(square);
	const pos = getSquareCenterWorld(file, rank, boardInfoGlobal);
	snapToBoardTopInPlace(pos, boardInfoGlobal, 0.002);

	const mesh = new THREE.Mesh(selectRingGeo, matIdleHint);
	mesh.quaternion.copy(highlightQuat);
	mesh.position.copy(pos);
	mesh.renderOrder = 10; // behind selection (12/13) but above board
	idleHintHighlightsGroup.add(mesh);
}

watch(cinematicSettled, (settled) => {
	if (!settled) {
		cancelIdleHint();
		return;
	}
	// If we settle while already in a “showable” state, start the timer.
	if (shouldShowIdleHint()) scheduleIdleHint();
});

watch(loading, (isLoading) => {
	if (isLoading) {
		cancelIdleHint();
		return;
	}
	// If loading finishes after we already settled, start the timer.
	if (shouldShowIdleHint()) scheduleIdleHint();
});

// ------------------------------------------------------------

function initThree() {
	invariant(canvasRef.value, "Canvas ref is not set (canvasRef.value is null).");

	// Renderer
	renderer = new THREE.WebGLRenderer({
		canvas: canvasRef.value,
		antialias: true,
		alpha: true,
		powerPreference: "high-performance",
	});
	renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
	renderer.setSize(window.innerWidth, window.innerHeight);

	// Color management (support both newer and older three builds)
	if ("outputColorSpace" in renderer) renderer.outputColorSpace = THREE.SRGBColorSpace;
	else renderer.outputEncoding = THREE.sRGBEncoding;

	// Scene
	scene = new THREE.Scene();

	// Camera
	camera = new THREE.PerspectiveCamera(35, window.innerWidth / window.innerHeight, 0.01, 2000);
	camera.position.set(0, 1.2, 3.2);

	// Controls (you disable these in your cinematic every frame, but we still need them created)
	controls = new OrbitControls(camera, renderer.domElement);
	controls.enableDamping = true;
	controls.dampingFactor = 0.08;
	controls.enablePan = false;
	controls.enableZoom = false;
	controls.enabled = false;
	controls.update();

	// Environment lighting
	pmrem = new THREE.PMREMGenerator(renderer);
	envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
	scene.environment = envTex;

	// Highlight groups must exist BEFORE loadModel() finishes (your loader callback assumes this)
	selectionHighlightsGroup = new THREE.Group();
	selectionHighlightsGroup.name = "SelectionHighlights";
	scene.add(selectionHighlightsGroup);

	hoverHighlightsGroup = new THREE.Group();
	hoverHighlightsGroup.name = "HoverHighlights";
	scene.add(hoverHighlightsGroup);

	idleHintHighlightsGroup = new THREE.Group();
	idleHintHighlightsGroup.name = "IdleHintHighlights";
	scene.add(idleHintHighlightsGroup);

	// Stage 2 -> 3 props
	contentGroup = new THREE.Group();
	contentGroup.name = "ContentGroup";
	contentGroup.visible = false;
	scene.add(contentGroup);

	fallingPiecesGroup = new THREE.Group();
	fallingPiecesGroup.name = "FallingPieces";
	fallingPiecesGroup.visible = false;
	scene.add(fallingPiecesGroup);

	cinematicReady = false;
}

onMounted(() => {
	initThree();
	loadModel();
	startLoop();

	engine = new StockfishClient({
		workerUrl: "/stockfish/stockfish-17.1-lite-single-03e3232.js",
		skillLevel: 2,
		movetimeMs: 120,
	});

	void engine.init();

	onScroll();
	window.addEventListener("resize", onResize, { passive: true });
	window.addEventListener("scroll", onScroll, { passive: true });

	window.addEventListener("wheel", onWheelAutoAdvance, { passive: false });
});

onBeforeUnmount(() => {
	window.removeEventListener("resize", onResize);
	window.removeEventListener("scroll", onScroll);

	// NEW
	window.removeEventListener("wheel", onWheelAutoAdvance);

	cancelIdleHint();
	detachDragListeners();

	if (engine) engine.terminate();
	engine = null;

	cancelEndAutoSequence();
	stopLoop();
	disposeAll();
});


// ------------------------------------------------------------
// UI / scroll helpers
// ------------------------------------------------------------
const allowedStages = computed(() => (endScene.value ? CINEMATIC.stages : 1));

watch(allowedStages, (maxT) => {
	// If we just reduced the max (eg you started playing and locked),
	// clamp BOTH the window scroll and the internal scroll state immediately.
	const lenPx = stageLenPx();
	const maxY = lenPx * maxT;

	if (window.scrollY > maxY) {
		window.scrollTo({ top: maxY, behavior: "auto" });
	}

	scrollTargetT = Math.min(scrollTargetT, maxT);
	scrollT.value = Math.min(scrollT.value, maxT);

	applyCinematic(scrollT.value, true);
});

const scrollSpacerHeight = computed(() => {
	// You need +100vh so max scrollY can reach stageLenPx() * allowedStages
	return `${CINEMATIC.transitionVh * allowedStages.value + 100}vh`;
});

// Hero transforms
const heroOpacity = computed(() => {
	const p = scrollT.value;
	const t = smoothstep(CINEMATIC.titleFadeStart, CINEMATIC.titleFadeEnd, p);
	return 1 - t;
});

const heroTranslateY = computed(() => {
	const p = scrollT.value;
	const t = smoothstep(0.0, CINEMATIC.titleFadeEnd, p);
	return -28 * t;
});

function cachePiecePlacementMetrics(piece, boardInfo) {
	// Base center (XZ) in world
	const base = getBaseCenterXZWorld(piece);

	// Constant offset (world X/Z) from base-center to root position
	piece.userData.rootMinusBaseXZ = {
		x: piece.position.x - base.x,
		z: piece.position.z - base.z,
	};

	// Constant offset (along board normal) from bottom-most point to root
	tmpBox.setFromObject(piece);
	const bottomDot = getBoxExtremeAlongNormal(tmpBox, boardInfo.normal, false);
	piece.userData.rootMinusBottom = piece.position.dot(boardInfo.normal) - bottomDot;
}

function stageLenPx() {
	return Math.max(1, window.innerHeight * (CINEMATIC.transitionVh / 100));
}

function onScroll() {
	if (endAutoRunning) return;

	const lenPx = stageLenPx();
	const maxT = allowedStages.value;
	const maxY = lenPx * maxT;

	if (window.scrollY > maxY) {
		window.scrollTo({ top: maxY, behavior: "auto" });
	}

	if (contentLockActive) {
		enforceContentMinScroll();
	}

	const y = Math.min(window.scrollY, maxY);
	scrollTargetT = THREE.MathUtils.clamp(y / lenPx, 0, maxT);
}

function onWheelAutoAdvance(ev) {
	if (!endScene.value) return;

	if (endAutoAdvanceDone) return;
	if ((ev.deltaY ?? 0) <= 0) return;

	const topGatePx = Math.max(16, stageLenPx() * 0.08);
	if (window.scrollY > topGatePx) return;

	ev.preventDefault?.();

	endAutoAdvanceDone = true;

	startEndAutoSequence();
}

function loadModel() {
	// Prevent pointer events while loading/reloading
	detachCanvasListeners();

	loading.value = true;
	progress.value = 0;
	cinematicReady = false;

	const loader = new GLTFLoader();

	loader.load(
		chessModelUrl,
		(gltf) => {
			// These now won't crash because groups exist from initThree()
			clearSelection();
			clearHover();
			detachDragListeners();
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
			invariant(boardMesh, 'Board mesh not found. Rename the board node or adjust findBoardMesh().');

			const templates = getTemplatesStrict(root);
			templatesGlobal = templates;

			hideTemplates(templates);

			const boardRoot = boardMesh.parent ?? boardMesh;

			boardPickMeshes = [];
			boardRoot.traverse((o) => {
				if (!o.isMesh) return;
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

			game.reset();
			endScene.value = null;
			didAnyMove.value = false;
			endAutoAdvanceDone = false;

			resetStage23Effects();

			loading.value = false;

			// Now that piecesGroup/board exist, we can accept pointer input safely.
			attachCanvasListeners();

			if (shouldShowIdleHint()) scheduleIdleHint();
		},
		(evt) => {
			if (!evt?.total) return;
			progress.value = Math.min(1, evt.loaded / evt.total);
		},
		(e) => {
			loading.value = false;
			throwAsync(e);
		}
	);
}

function attachCanvasListeners() {
	invariant(renderer, "attachCanvasListeners requires renderer.");
	const el = renderer.domElement;

	if (canvasListenersAttached) return;

	el.addEventListener("pointermove", onPointerMove, { passive: true });
	el.addEventListener("pointerleave", clearHover, { passive: true });

	// NOTE: passive:false so we *can* preventDefault during drag start on touchpads/mobile.
	el.addEventListener("pointerdown", onPointerDown, { passive: false });

	canvasListenersAttached = true;
}

function detachCanvasListeners() {
	if (!renderer) return;

	const el = renderer.domElement;
	if (!canvasListenersAttached) return;

	el.removeEventListener("pointermove", onPointerMove);
	el.removeEventListener("pointerleave", clearHover);
	el.removeEventListener("pointerdown", onPointerDown);

	canvasListenersAttached = false;
}

function getWinnerColorIfCheckmate() {
	// Assumes chess.js-like API; guarded so it won't crash if wrapper differs.
	if (!game.isGameOver()) return null;

	// If we can detect checkmate, winner is the side that is NOT to move.
	if (typeof game.isCheckmate === "function" && game.isCheckmate()) {
		return game.turn() === "w" ? "black" : "white";
	}

	// Otherwise treat as draw (stalemate/rep/etc.)
	return "draw";
}

function triggerEndSceneIfGameOver() {
	if (endScene.value) return; // only trigger once
	if (!game.isGameOver()) return;

	cancelIdleHint();
	clearSelection();
	clearHover();

	const o = game.outcome();
	if (o.status === "checkmate") endScene.value = (o.winner === "white") ? "win" : "lose";
	else if (o.status === "draw") endScene.value = "draw";

	window.scrollTo({ top: computeContentLockMinY(), behavior: "smooth" });
}

// ------------------------------------------------------------
// End-scene auto-advance timing (seconds per segment)
// ------------------------------------------------------------
const END_AUTO = {
	seg01: 2.0,
	seg12: 1.5,
	seg23: 1.0,
};

let endAutoRaf = 0;
let endAutoStartMs = 0;
let endAutoRunning = false;

function cancelEndAutoSequence() {
	endAutoRunning = false;
	if (endAutoRaf) cancelAnimationFrame(endAutoRaf);
	endAutoRaf = 0;
	endAutoStartMs = 0;
}

// Cubic Hermite (C1-continuous) for scalar values.
// p0,p1: values at ends
// m0,m1: derivatives w.r.t TIME at ends
// u: 0..1
// dt: segment duration in seconds
function hermite1D(p0, p1, m0, m1, u, dt) {
	const u2 = u * u;
	const u3 = u2 * u;

	const h00 =  2 * u3 - 3 * u2 + 1;
	const h10 =      u3 - 2 * u2 + u;
	const h01 = -2 * u3 + 3 * u2;
	const h11 =      u3 -     u2;

	// Note: tangents scale by dt for time-parameterized Hermite
	return h00 * p0 + h10 * (m0 * dt) + h01 * p1 + h11 * (m1 * dt);
}

function startEndAutoSequence() {
	cancelEndAutoSequence();

	const lenPx = stageLenPx();
	const maxT = allowedStages.value; // should be 3 when endScene is set

	// Keyframes in "t space"
	const P = [0, 1, 2, Math.min(3, maxT)];

	// Segment durations (seconds)
	const D = [
		Math.max(0.001, END_AUTO.seg01),
		Math.max(0.001, END_AUTO.seg12),
		Math.max(0.001, END_AUTO.seg23),
	];

	// Velocities per segment (dt/dtime)
	const V = [
		(P[1] - P[0]) / D[0],
		(P[2] - P[1]) / D[1],
		(P[3] - P[2]) / D[2],
	];

	// Tangents (derivatives w.r.t time) at keyframes:
	// - endpoints: 0 for gentle start/end (one smooth animation feel)
	// - interior: average adjacent velocities -> C1 smooth join
	const M = [
		0.0,
		0.5 * (V[0] + V[1]),
		0.5 * (V[1] + V[2]),
		0.0,
	];

	const Tcum = [0, D[0], D[0] + D[1], D[0] + D[1] + D[2]];
	const totalDur = Tcum[3];

	endAutoStartMs = performance.now();
	endAutoRunning = true;

	// Put the scrollbar at the start cleanly once
	window.scrollTo({ top: 0, behavior: "auto" });

	const step = (nowMs) => {
		if (!endAutoRunning) return;

		const tSec = (nowMs - endAutoStartMs) / 1000;
		const s = Math.min(totalDur, Math.max(0, tSec));

		// Which segment?
		let seg = 0;
		if (s >= Tcum[2]) seg = 2;
		else if (s >= Tcum[1]) seg = 1;

		const segStart = Tcum[seg];
		const segDur = D[seg];
		const u = THREE.MathUtils.clamp((s - segStart) / segDur, 0, 1);

		// Smooth t with continuous velocity across segments
		const newT = hermite1D(P[seg], P[seg + 1], M[seg], M[seg + 1], u, segDur);

		// Drive cinematic directly (no per-frame scrollTo jitter)
		scrollTargetT = newT;

		// OPTIONAL: if you want the scrollbar to match, update it *lightly*.
		// Updating every frame tends to feel "jittery" due to scroll events.
		// This keeps it pretty aligned without fighting your onScroll too hard:
		if ((nowMs | 0) % 2 === 0) {
			window.scrollTo({ top: newT * lenPx, behavior: "auto" });
		}

		if (s >= totalDur - 1e-6) {
			scrollTargetT = P[3];
			window.scrollTo({ top: P[3] * lenPx, behavior: "auto" });
			endAutoRunning = false;
			endAutoRaf = 0;
			return;
		}

		endAutoRaf = requestAnimationFrame(step);
	};

	endAutoRaf = requestAnimationFrame(step);
}


// ------------------------------------------------------------
// “Let errors flow” helpers
// ------------------------------------------------------------
function invariant(cond, msg) {
	if (!cond) throw new Error(msg);
}

// Surface async errors with a proper uncaught stack (GLTFLoader callbacks, etc.)
function throwAsync(err) {
	setTimeout(() => {
		throw err instanceof Error ? err : new Error(String(err));
	}, 0);
}


// ------------------------------------------------------------
// Highlight system (dots + rings)
// ------------------------------------------------------------
function setupHighlightSystem(boardInfo) {
	invariant(selectionHighlightsGroup && hoverHighlightsGroup && idleHintHighlightsGroup, "Highlight groups not initialized.");

	// Clear any old markers
	selectionHighlightsGroup.clear();
	hoverHighlightsGroup.clear();
	idleHintHighlightsGroup.clear();

	const s = boardInfo.squareSize * GRID.spacing;

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

	matMoveSel = new THREE.MeshBasicMaterial({ color: 0x22262f, opacity: 0.88, ...common });
	matCaptureSel = new THREE.MeshBasicMaterial({ color: 0x22262f, opacity: 0.88, ...common });
	matSelectFrom = new THREE.MeshBasicMaterial({ color: 0x2f3440, opacity: 0.55, ...common });

	matMoveHover = new THREE.MeshBasicMaterial({ color: 0x22262f, opacity: 0.52, ...common });
	matCaptureHover = new THREE.MeshBasicMaterial({ color: 0x22262f, opacity: 0.52, ...common });

	matIdleHint = new THREE.MeshBasicMaterial({ color: 0x2f3440, opacity: 0.22, ...common });
}


function disposeHighlightSystem() {
	selectionHighlightsGroup?.clear();
	hoverHighlightsGroup?.clear();
	idleHintHighlightsGroup?.clear();

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

	matIdleHint?.dispose?.();
	matIdleHint = null;
}

function clearSelectionHighlights() {
	invariant(selectionHighlightsGroup, "selectionHighlightsGroup is not initialized.");
	selectionHighlightsGroup.clear();
}

function clearHoverHighlights() {
	invariant(hoverHighlightsGroup, "hoverHighlightsGroup is not initialized.");
	hoverHighlightsGroup.clear();
}

function addMoveMarker(square, kind, mode) {
	invariant(boardInfoGlobal, "addMoveMarker requires boardInfoGlobal.");

	const isSel = mode === "selection";
	const group = isSel ? selectionHighlightsGroup : hoverHighlightsGroup;

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
	invariant(boardInfoGlobal, "addFromMarker requires boardInfoGlobal.");
	invariant(selectionHighlightsGroup, "addFromMarker requires selectionHighlightsGroup.");

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
	if (selected?.pieceRoot === pieceRoot) return;
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

function isAnimating() {
	return moveAnims.length > 0;
}

function isDraggingOrPending() {
	return !!dragCandidate || !!draggingPiece;
}

function updateRayFromEvent(ev) {
	invariant(renderer, "renderer is null in updateRayFromEvent.");
	invariant(camera, "camera is null in updateRayFromEvent.");

	const rect = renderer.domElement.getBoundingClientRect();
	pointer.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
	pointer.y = -(((ev.clientY - rect.top) / rect.height) * 2 - 1);

	raycaster.setFromCamera(pointer, camera);
}

function buildBoardTopPlane(boardInfo) {
	// Point on the board top plane
	tmpTarget.copy(boardInfo.center);
	const d = boardInfo.boardTop - tmpTarget.dot(boardInfo.normal);
	tmpTarget.addScaledVector(boardInfo.normal, d);

	const pl = new THREE.Plane();
	pl.setFromNormalAndCoplanarPoint(boardInfo.normal, tmpTarget);
	return pl;
}

function projectPointToPlane(point, plane, out) {
	// projection = p - n * distanceToPoint(p)
	const dist = plane.distanceToPoint(point);
	return out.copy(point).addScaledVector(plane.normal, -dist);
}

function setCursor(c) {
	document.body.style.cursor = c || "";
}

// ------------------------------------------------------------
// Click / drag handling
// ------------------------------------------------------------
function onPointerDown(ev) {
	// Any interaction kills the hint immediately (text + ring + shake)
	if (endScene.value) return;
	cancelIdleHint();

	invariant(!loading.value, "Pointer interaction while model is still loading.");
	invariant(renderer && camera, "Pointer interaction before renderer/camera ready.");
	invariant(piecesGroup && boardMesh && boardInfoGlobal, "Pointer interaction before board/pieces are ready.");

	if (engineThinking.value) return;
	if (isAnimating()) return;

	// If we were mid-drag for any reason, end it cleanly.
	if (isDraggingOrPending()) {
		detachDragListeners();
		dragCandidate = null;
		draggingPiece = null;
		dragFromSquare = null;
	}

	updateRayFromEvent(ev);

	// 1) Click on a selection move dot => attempt move immediately
	if (selectionHighlightsGroup) {
		const hlHits = raycaster.intersectObject(selectionHighlightsGroup, true);
		if (hlHits.length) {
			const sq = hlHits[0].object?.userData?.square;
			if (sq) {
				tryMoveTo(sq, { fromDrag: false });
				return;
			}
		}
	}

	// 2) Click on a piece
	const pieceHits = raycaster.intersectObject(piecesGroup, true);
	if (pieceHits.length) {
		const pieceRoot = getPieceRootFromHit(pieceHits[0].object);
		if (pieceRoot) {
			const sq = fileRankToSquare(pieceRoot.userData.file, pieceRoot.userData.rank);
			const turnColor = game.turn() === "w" ? "white" : "black";

			// If we have a selection, clicking an enemy on a legal square should CAPTURE
			if (selected) {
				const legal = selectedMoves.some((m) => m.to === sq);
				const enemy = pieceRoot.userData.color !== selected.pieceRoot.userData.color;

				if (legal && enemy) {
					tryMoveTo(sq, { fromDrag: false });
					return;
				}
			}

			// Own-piece interaction: select + allow drag
			if (pieceRoot.userData.color === turnColor) {
				trySelectPiece(pieceRoot);

				// Only set up drag if it actually stayed selected
				if (selected?.pieceRoot === pieceRoot) {
					dragCandidate = {
						pieceRoot,
						fromSquare: sq,
						startX: ev.clientX,
						startY: ev.clientY,
					};

					attachDragListeners();
				}
				return;
			}

			// Enemy piece clicked when nothing selected: behave like before (clear selection)
			clearSelection();
			return;
		}
	}

	// 3) Click on board => if selected, try move to that square; else clear selection
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
			tryMoveTo(sq, { fromDrag: false });
			return;
		}

		clearSelection();
		return;
	}

	clearSelection();
}

function attachDragListeners() {
	window.addEventListener("pointermove", onDragPointerMove, { passive: false });
	window.addEventListener("pointerup", onDragPointerUp, { passive: false });
	window.addEventListener("pointercancel", onDragPointerUp, { passive: false });
}

function detachDragListeners() {
	window.removeEventListener("pointermove", onDragPointerMove);
	window.removeEventListener("pointerup", onDragPointerUp);
	window.removeEventListener("pointercancel", onDragPointerUp);

	dragCandidate = null;

	// Restore controls if we were dragging
	if (draggingPiece) {
		controls.enabled = dragPrevControlsEnabled;
	}

	draggingPiece = null;
	dragFromSquare = null;
	dragPlane = null;
	dragLift = 0;
	dragOffsetPlanar.set(0, 0, 0);
}

function startDraggingFromCandidate(ev) {
	if (!dragCandidate || draggingPiece) return;

	invariant(boardInfoGlobal, "startDraggingFromCandidate requires boardInfoGlobal.");
	invariant(controls, "startDraggingFromCandidate requires controls.");

	draggingPiece = dragCandidate.pieceRoot;
	dragFromSquare = dragCandidate.fromSquare;

	dragCandidate = null;

	clearHover(); // no glow/jiggle fighting drag
	setCursor("grabbing");

	dragPrevControlsEnabled = controls.enabled;
	controls.enabled = false;

	dragPlane = buildBoardTopPlane(boardInfoGlobal);
	dragLift = boardInfoGlobal.squareSize * DRAG.liftRatio;

	// Compute intersection point on plane
	updateRayFromEvent(ev);
	const hit = raycaster.ray.intersectPlane(dragPlane, tmpTarget);
	invariant(hit, "Ray did not intersect drag plane.");

	dragLastPlanePoint.copy(hit);

	// Offset so we don't snap the piece center to cursor
	const pieceProj = projectPointToPlane(draggingPiece.position, dragPlane, tmpV);
	dragOffsetPlanar.copy(pieceProj).sub(dragLastPlanePoint);

	// Lift immediately
	tmpTarget.copy(dragLastPlanePoint).add(dragOffsetPlanar).addScaledVector(boardInfoGlobal.normal, dragLift);
	draggingPiece.position.copy(tmpTarget);
	draggingPiece.updateWorldMatrix(true, true);
}

function updateDragging(ev) {
	invariant(draggingPiece && dragPlane && boardInfoGlobal, "updateDragging called without active drag.");

	ev.preventDefault?.();

	updateRayFromEvent(ev);
	const hit = raycaster.ray.intersectPlane(dragPlane, tmpTarget);
	invariant(hit, "Ray did not intersect drag plane during drag.");

	dragLastPlanePoint.copy(hit);

	tmpTarget.copy(dragLastPlanePoint)
		.add(dragOffsetPlanar)
		.addScaledVector(boardInfoGlobal.normal, dragLift);

	draggingPiece.position.copy(tmpTarget);
	draggingPiece.updateWorldMatrix(true, true);
}

function onDragPointerMove(ev) {
	if (!dragCandidate && !draggingPiece) return;
	if (engineThinking.value) return;
	if (isAnimating()) return;

	invariant(renderer && camera && boardInfoGlobal, "Drag move before renderer/camera/boardInfoGlobal ready.");

	if (draggingPiece) {
		updateDragging(ev);
		return;
	}

	// Candidate -> decide if we start dragging
	const dx = ev.clientX - dragCandidate.startX;
	const dy = ev.clientY - dragCandidate.startY;
	if (Math.hypot(dx, dy) >= DRAG.thresholdPx) {
		startDraggingFromCandidate(ev);
	}
}

function onDragPointerUp(ev) {
	if (!dragCandidate && !draggingPiece) return;

	// If we never started dragging: just clean up listeners.
	if (dragCandidate && !draggingPiece) {
		detachDragListeners();
		setCursor("");
		return;
	}

	invariant(boardInfoGlobal, "Drop without boardInfoGlobal.");

	// Dropping a piece
	invariant(draggingPiece, "Drop without draggingPiece.");

	// Compute drop square from the planar position under cursor (plus our planar offset)
	updateRayFromEvent(ev);
	const hit = dragPlane ? raycaster.ray.intersectPlane(dragPlane, tmpTarget) : null;
	invariant(hit, "Ray did not intersect drag plane on drop.");
	dragLastPlanePoint.copy(hit);

	const planar = tmpV.copy(dragLastPlanePoint).add(dragOffsetPlanar);

	const toSq = squareFromWorldPoint(planar, boardInfoGlobal);

	// Restore cursor / controls now (the animation will run independently)
	setCursor("");
	controls.enabled = dragPrevControlsEnabled;

	// Validate move before calling tryMoveTo (because tryMoveTo assumes visuals are still on squares)
	const fromSq = dragFromSquare;
	const piece = draggingPiece;

	detachDragListeners();

	// No square / same square => cancel (return + keep selection consistent)
	if (!toSq || !fromSq || toSq === fromSq) {
		animatePieceRootToSquare(piece, fromSq, {
			durationSec: MOVE_ANIM.dragCancelDurationSec,
			jumpHeightRatio: 0.0,
		});
		return;
	}

	// Must still be selected and legal
	const ok = !!selected && selected.fromSquare === fromSq && selectedMoves.some((m) => m.to === toSq);
	if (!ok) {
		// Return and clear selection (matches your click-to-illegal behavior)
		animatePieceRootToSquare(piece, fromSq, {
			durationSec: MOVE_ANIM.dragCancelDurationSec,
			jumpHeightRatio: 0.0,
		});
		clearSelection();
		return;
	}

	tryMoveTo(toSq, { fromDrag: true });
}

function trySelectPiece(pieceRoot) {
	// User is interacting: hide hint immediately
	cancelIdleHint();

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

function tryMoveTo(toSquare, { fromDrag = false } = {}) {
	if (!selected) return;
	if (isAnimating()) return;

	cancelIdleHint();

	const fromSquare = selected.fromSquare;

	const ok = selectedMoves.some((m) => m.to === toSquare);
	if (!ok) {
		clearSelection();
		return;
	}

	clearHover();
	clearIdleHintHighlights();

	const result = game.tryMove(fromSquare, toSquare, "q");
	if (!result) {
		clearSelection();
		return;
	}

	applyMoveToScene(result, selected.pieceRoot, fromSquare, toSquare, { fromDrag });

	didAnyMove.value = true;
	cancelIdleHint();

	clearSelection();

	// If user ended the game (mate/stalemate/etc.), show end scene and don't ask engine to move.
	triggerEndSceneIfGameOver();
	if (game.isGameOver()) return;

	void maybePlayBlackMove();
}


async function maybePlayBlackMove() {
	if (endScene.value) return;
	if (!engine) return;
	if (game.isGameOver()) return;
	if (game.turn() !== "b") return;

	engineThinking.value = true;
	clearSelection();
	clearHover();
	cancelIdleHint();

	try {
		await sleep(1000);

		const uci = await engine.bestMoveFromFen(game.fen(), { movetimeMs: 120 });
		if (!uci || uci === "(none)") return;

		const mv = parseUciMove(uci);
		if (!mv) return;

		indexPiecesBySquare();
		const pieceRoot = squareToPiece.get(mv.from);
		if (!pieceRoot) return;

		const result = game.tryMove(mv.from, mv.to, mv.promotion || "q");
		if (!result) return;

		applyMoveToScene(result, pieceRoot, mv.from, mv.to, { fromDrag: false });

		didAnyMove.value = true;
		cancelIdleHint();
		triggerEndSceneIfGameOver();
	} finally {
		engineThinking.value = false;

		if (shouldShowIdleHint()) scheduleIdleHint();
	}
}

function clearSelection() {
	selected = null;
	selectedMoves = [];
	clearSelectionHighlights();

	// If you're currently hovering something (and it's your turn), restore hover preview
	if (hoveredPiece) showHoverMoves(hoveredPiece);

	// When selection clears, if we’re otherwise eligible, restart idle timer.
	if (shouldShowIdleHint()) scheduleIdleHint();
}

// ------------------------------------------------------------
// Apply move to scene (captures, castling, en-passant, promotion)
// ------------------------------------------------------------
function applyMoveToScene(moveResult, movedPieceRoot, fromSquare, toSquare, { fromDrag = false } = {}) {
	const dur = fromDrag ? MOVE_ANIM.dragDropDurationSec : MOVE_ANIM.durationSec;
	const jumpRatio = fromDrag ? MOVE_ANIM.dragDropJumpHeightRatio : MOVE_ANIM.jumpHeightRatio;

	// Captures
	if (moveResult.flags?.includes("e")) {
		const { file: tf } = squareToFileRank(toSquare);
		const { rank: fr } = squareToFileRank(fromSquare);
		const capSq = fileRankToSquare(tf, fr);
		removePieceAtSquare(capSq);
	} else if (moveResult.flags?.includes("c")) {
		removePieceAtSquare(toSquare);
	}

	// Promotion needs to swap AFTER the landing (looks better)
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

	// Move the piece (jump anim or drag settle)
	animatePieceRootToSquare(movedPieceRoot, toSquare, {
		durationSec: dur,
		jumpHeightRatio: jumpRatio,
		onComplete: () => {
			if (promotionType) {
				replacePieceWithType(movedPieceRoot, promotionType, toSquare);
			}
			indexPiecesBySquare();
		},
	});

	// Castling: move rook too
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
			animatePieceRootToSquare(rook, rm.to, {
				durationSec: dur,
				jumpHeightRatio: MOVE_ANIM.jumpHeightRatio, // keep some life on rook movement
			});
		}
	}

	// Update mapping now (logic) even though visuals animate
	indexPiecesBySquare();
}

function animatePieceRootToSquare(pieceRoot, square, opts = {}) {
	invariant(boardInfoGlobal, "animatePieceRootToSquare requires boardInfoGlobal.");
	invariant(pieceRoot, "animatePieceRootToSquare requires pieceRoot.");

	const {
		durationSec = MOVE_ANIM.durationSec,
		onComplete = null,
		jumpHeightRatio = MOVE_ANIM.jumpHeightRatio,
	} = opts;

	// Record start
	const startPos = pieceRoot.position.clone();
	const startQuat = pieceRoot.quaternion.clone();

	// Update logical square immediately
	const { file, rank } = squareToFileRank(square);
	pieceRoot.userData.file = file;
	pieceRoot.userData.rank = rank;
	pieceRoot.userData.square = square;

	// Compute end transform by placing, then restore
	placeOnSquare(pieceRoot, boardInfoGlobal, file, rank, pieceRoot.userData.color);
	const endPos = pieceRoot.position.clone();
	const endQuat = pieceRoot.quaternion.clone();

	pieceRoot.position.copy(startPos);
	pieceRoot.quaternion.copy(startQuat);
	pieceRoot.updateWorldMatrix(true, true);

	const jumpH = boardInfoGlobal.squareSize * Math.max(0, jumpHeightRatio);

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

			a.onComplete?.();

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
	invariant(piecesGroup, "replacePieceWithType requires piecesGroup.");
	invariant(templatesGlobal, "replacePieceWithType requires templatesGlobal.");
	invariant(boardInfoGlobal, "replacePieceWithType requires boardInfoGlobal.");

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
	newPiece.userData.square = square;
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

	// PLAY (White perspective) — stage 1
	playTarget.copy(basisCenter).addScaledVector(basisUp, boardSpan * CINEMATIC.playTargetUp);
	playCamPos.copy(basisCenter)
		.addScaledVector(basisUp, boardSpan * CINEMATIC.playUp)
		.addScaledVector(basisForward, -boardSpan * CINEMATIC.playBack)
		.addScaledVector(basisRight, boardSpan * CINEMATIC.playSide);

	// Stage 2
	learnTarget.copy(basisCenter)
		.addScaledVector(basisUp, boardSpan * CINEMATIC.learnTargetUp)
		.addScaledVector(basisForward, boardSpan * CINEMATIC.learnTargetForward)
		.addScaledVector(basisRight, boardSpan * CINEMATIC.learnTargetSide);
	learnCamPos.copy(basisCenter)
		.addScaledVector(basisUp, boardSpan * CINEMATIC.learnUp)
		.addScaledVector(basisForward, -boardSpan * CINEMATIC.learnBack)
		.addScaledVector(basisRight, boardSpan * CINEMATIC.learnSide);

	// Stage 3 (content card)
	contentTarget.copy(basisCenter)
		.addScaledVector(basisUp, boardSpan * CINEMATIC.contentTargetUp)
		.addScaledVector(basisForward, boardSpan * CINEMATIC.contentTargetForward)
		.addScaledVector(basisRight, boardSpan * CINEMATIC.contentTargetSide);
	contentCamPos.copy(basisCenter)
		.addScaledVector(basisUp, boardSpan * CINEMATIC.contentUp)
		.addScaledVector(basisForward, -boardSpan * CINEMATIC.contentBack)
		.addScaledVector(basisRight, boardSpan * CINEMATIC.contentSide);

	ensureContentCard(); // creates/places the “Carpe diem” text box at contentTarget

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
	applyCinematic(scrollTargetT, true);
}

function applyCinematic(t, force = false) {
	if (!cinematicReady) return;

	const clamped = THREE.MathUtils.clamp(t, 0, allowedStages.value);

	let roll = 0;

	// We'll compute a target vector each frame (don’t let OrbitControls rebuild camera rotation)
	const target = tmpTarget;

	if (clamped <= 1) {
		// Stage 0 -> 1
		const e = easeInOutCubic(clamped);
		camera.position.lerpVectors(introCamPos, playCamPos, e);
		target.lerpVectors(introTarget, playTarget, e);
		roll = 0;
	} else if (clamped <= 2) {
		// Stage 1 -> 2
		const u = THREE.MathUtils.clamp(clamped - 1, 0, 1);
		const e = easeInOutCubic(u);
		camera.position.lerpVectors(playCamPos, learnCamPos, e);
		target.lerpVectors(playTarget, learnTarget, e);
		roll = CINEMATIC.learnRollRad * e;
	} else {
		// Stage 2 -> 3 (pan down to text card)
		const u = THREE.MathUtils.clamp(clamped - 2, 0, 1);
		const e = easeInOutCubic(u);
		camera.position.lerpVectors(learnCamPos, contentCamPos, e);
		target.lerpVectors(learnTarget, contentTarget, e);
		roll = THREE.MathUtils.lerp(CINEMATIC.learnRollRad, CINEMATIC.contentRollRad, e);
 	}

	// Keep controls target in sync for anything else relying on it
	if (controls) controls.target.copy(target);

	// CRITICAL: reset camera orientation every frame, then apply roll.
	// This prevents quaternion accumulation (“corkscrew” twisting).
	const up = (basisUp && basisUp.lengthSq() > 1e-8) ? basisUp : WORLD_UP;
	camera.up.copy(up);
	camera.lookAt(target);

	// Roll around the view axis (camera local Z) after lookAt
	if (Math.abs(roll) > 1e-6) {
		camera.rotateZ(roll);
	}

	camera.updateMatrixWorld(true);
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
		cachePiecePlacementMetrics(piece, boardInfo);

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

			// Force a uniform base color per side.
			if (nm.color) nm.color.copy(target);

			// Make shape readable with highlights instead of relying on albedo differences
			if (typeof nm.roughness === "number") nm.roughness = (color === "white") ? 0.10 : 0.30;
			if (typeof nm.metalness === "number") nm.metalness = (color === "white") ? 0.30 : 0.90;
			if ("envMapIntensity" in nm) nm.envMapIntensity = (color === "white") ? 1.45 : 0.55;

			// Small contrast help
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
	const x0 = box.min.x, y0 = box.min.y, z0 = box.min.z;
	const x1 = box.max.x, y1 = box.max.y, z1 = box.max.z;

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
	if (endScene.value) return;
	invariant(!loading.value, "Pointer move while model is loading.");
	invariant(piecesGroup, "Pointer move before piecesGroup is ready.");
	invariant(renderer && camera, "Pointer move before renderer/camera ready.");

	if (isAnimating()) return;
	if (isDraggingOrPending()) return;

	updateRayFromEvent(ev);

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

	setCursor("pointer");

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
	setCursor("");

	clearHoverHighlights();
}

function applyHoverShake(nowT) {
	if (!hoveredPiece) return;
	if (isDraggingOrPending()) return;

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

// Idle shake applied in the main render loop
function applyIdleShake(nowT) {
	if (!idleHintVisible.value) return;
	if (!idleShakePiece) return;

	// If pawn moved / captured / promoted away from d2, just drop the hint.
	if (idleShakePiece.userData.square !== IDLE_HINT.square) {
		cancelIdleHint();
		return;
	}

	// Don’t fight real interaction / animation
	if (selected || engineThinking.value || isAnimating() || isDraggingOrPending()) return;

	// Safety: basis vectors exist once cinematic is set up
	const right = basisRight && basisRight.lengthSq() > 1e-8 ? basisRight : null;
	const forward = basisForward && basisForward.lengthSq() > 1e-8 ? basisForward : null;
	const up = basisUp && basisUp.lengthSq() > 1e-8 ? basisUp : (boardInfoGlobal?.normal || WORLD_UP);

	invariant(right && forward, "Idle shake requires basisRight and basisForward.");

	const s1 = Math.sin(nowT * IDLE_SHAKE.freq);
	const s2 = Math.sin(nowT * IDLE_SHAKE.freq * 1.37);

	idleShakePiece.position.copy(idleShakeBasePos);
	idleShakePiece.quaternion.copy(idleShakeBaseQuat);

	// Planar wiggle (small)
	idleShakePiece.position.addScaledVector(right, IDLE_SHAKE.posAmp * s1);
	idleShakePiece.position.addScaledVector(forward, IDLE_SHAKE.posAmp * 0.6 * s2);

	// Yaw wobble around “up”
	tmpQuat.setFromAxisAngle(up, IDLE_SHAKE.rotAmp * s2);
	idleShakePiece.quaternion.multiply(tmpQuat);

	idleShakePiece.updateWorldMatrix(true, true);
}

function resetStage23Effects(fromDispose = false) {
	stage2DropStarted = false;
	stage2DropStartTime = 0;

	// clear per-piece drop metadata (don’t restore pieces; stage 2 is “destructive” by design)
	if (piecesGroup) {
		for (const p of piecesGroup.children) {
			if (p?.userData) delete p.userData.__drop;
		}
	}

	// clear background raining pieces
	if (fallingPiecesGroup) {
		for (const it of fallingPieces) {
			fallingPiecesGroup.remove(it.obj);
			disposeObject3D(it.obj);
		}
	}
	fallingPieces = [];
	rainSpawnAcc = 0;

	// clear content card
	if (contentGroup && contentCardSprite) {
		contentGroup.remove(contentCardSprite);
		contentCardSprite = null;
	}
	if (contentCardMaterial) {
		contentCardMaterial.dispose();
		contentCardMaterial = null;
	}
	if (contentCardTexture) {
		contentCardTexture.dispose();
		contentCardTexture = null;
	}

	// hide groups if we still exist
	if (!fromDispose) {
		contentGroup && (contentGroup.visible = false);
		fallingPiecesGroup && (fallingPiecesGroup.visible = false);
	}
}

function updateStage23Effects(delta) {
	// No stage 2/3 while playing; your existing allowedStages already enforces this,
	// but keep this guard so we don’t mutate pieces accidentally.
	if (!endScene.value) return;
	if (!cinematicReady) return;
	if (loading.value) return;
	if (!boardInfoGlobal) return;

	// Fade/show the content card as we enter stage 2 -> 3
	if (contentCardMaterial) {
		const a = smoothstep(2.0, 2.25, scrollT.value);
		contentCardMaterial.opacity = a;
	}
	if (contentGroup) {
		contentGroup.visible = scrollT.value >= 1.95;
	}

	// Start dropping the *existing* chess set (stage 2 continuation)
	if (!stage2DropStarted && scrollT.value >= STAGE2_DROP.startScrollT) {
		stage2DropStarted = true;
		stage2DropStartTime = elapsed;

		if (piecesGroup) {
			for (const p of piecesGroup.children) {
				p.userData.__drop = {
					delay: Math.random() * STAGE2_DROP.maxDelaySec,
					speed: boardSpan * (STAGE2_DROP.speedMinSpan + Math.random() * (STAGE2_DROP.speedMaxSpan - STAGE2_DROP.speedMinSpan)),
					traveled: 0,
				};
			}
		}
	}

	if (stage2DropStarted) {
		updateExistingPieceDrops(delta);
	}

	// Background rain (late stage 2 -> stage 3)
	updateBackgroundRain(delta);
}

function updateExistingPieceDrops(delta) {
	if (!piecesGroup) return;

	const up = (basisUp && basisUp.lengthSq() > 1e-8) ? basisUp : (boardInfoGlobal.normal || WORLD_UP);

	// Phase A: until we reach the fully “learn” pose (t < 2), drop in board/world down.
	// Phase B: from stage 2 onward (t >= 2), drop “down the screen” (toward the camera).
	const down = tmpAxisX; // reuse scratch
	if (scrollT.value < 2.0) {
		down.copy(up).multiplyScalar(-1);
	} else {
		getCameraScreenDownWorld(down);
	}

	const cullDist = boardSpan * STAGE2_DROP.cullBelowSpan;

	for (let i = piecesGroup.children.length - 1; i >= 0; i--) {
		const p = piecesGroup.children[i];
		const d = p?.userData?.__drop;
		if (!d) continue;

		if ((elapsed - stage2DropStartTime) < d.delay) continue;

		const ds = d.speed * delta;
		d.traveled = (d.traveled ?? 0) + ds;

		p.position.addScaledVector(down, ds);
		p.updateWorldMatrix(true, true);

		// Direction-safe cull: remove after traveling far enough, regardless of direction changes
		if (d.traveled > cullDist) {
			piecesGroup.remove(p);
			disposeObject3D(p);
		}
	}
}

function updateBackgroundRain(delta) {
	if (!fallingPiecesGroup || !templatesGlobal || !boardInfoGlobal) return;

	const active = scrollT.value >= BG_RAIN.startScrollT;
	fallingPiecesGroup.visible = active;
	if (!active) return;

	const spin = scrollT.value >= BG_RAIN.spinScrollT;

	const rate = spin ? BG_RAIN.rateSpin : BG_RAIN.rateStraight;
	rainSpawnAcc += rate * delta;

	// spawn
	while (rainSpawnAcc >= 1.0) {
		rainSpawnAcc -= 1.0;
		if (fallingPieces.length >= BG_RAIN.maxPieces) break;
		spawnBackgroundPiece({ spin });
	}

	const down = getCameraScreenDownWorld(tmpAxisX);
	const cullDist = boardSpan * BG_RAIN.cullBelowSpan;

	for (let i = fallingPieces.length - 1; i >= 0; i--) {
		const it = fallingPieces[i];
		const obj = it.obj;

		const ds = it.speed * delta;
		it.traveled = (it.traveled ?? 0) + ds;

		obj.position.addScaledVector(down, ds);

		if (spin) {
			obj.rotation.x += it.angVel.x * delta;
			obj.rotation.y += it.angVel.y * delta;
			obj.rotation.z += it.angVel.z * delta;
		}

		obj.updateWorldMatrix(true, true);

		if (it.traveled > cullDist) {
			fallingPiecesGroup.remove(obj);
			disposeObject3D(obj);
			fallingPieces.splice(i, 1);
		}
	}
}

function spawnBackgroundPiece({ spin }) {
	// pick template
	const types = Object.keys(TEMPLATE_NAMES);
	const type = types[Math.floor(Math.random() * types.length)];
	const color = Math.random() < 0.5 ? "white" : "black";

	const tpl = templatesGlobal[type];
	if (!tpl) return;

	const piece = clonePieceWithTint(tpl, color);
	piece.userData.type = type;
	piece.userData.color = color;

	// scale consistently with your set
	normalizePieceUprightAndScale(piece, boardInfoGlobal.squareSize, color);

	// Spawn around the BOARD, but lifted “up on screen” so it falls down toward camera.
	const screenDown = getCameraScreenDownWorld(tmpAxisX);
	const screenUp = tmpAxisY.copy(screenDown).multiplyScalar(-1);

	const r = boardSpan * BG_RAIN.spawnRadiusSpan;
	const h = boardSpan * BG_RAIN.spawnHeightSpan;

	const rx = (Math.random() * 2 - 1) * r;
	const rz = (Math.random() * 2 - 1) * r;

	const right = (basisRight && basisRight.lengthSq() > 1e-8) ? basisRight : new THREE.Vector3(1, 0, 0);
	const fwd = (basisForward && basisForward.lengthSq() > 1e-8) ? basisForward : new THREE.Vector3(0, 0, 1);

	piece.position.copy(basisCenter)
		.addScaledVector(right, rx)
		.addScaledVector(fwd, rz)
		.addScaledVector(screenUp, h);

	// stage-2 straight drop: keep upright (no extra rotation)
	// stage-3 background: random rotation
	if (spin) {
		piece.rotation.set(
			Math.random() * Math.PI * 2,
			Math.random() * Math.PI * 2,
			Math.random() * Math.PI * 2
		);
	}

	piece.updateWorldMatrix(true, true);
	fallingPiecesGroup.add(piece);

	const speed = boardSpan * (BG_RAIN.speedMinSpan + Math.random() * (BG_RAIN.speedMaxSpan - BG_RAIN.speedMinSpan));

	const angVel = new THREE.Vector3(
		(Math.random() * 2 - 1) * BG_RAIN.angVelMax,
		(Math.random() * 2 - 1) * BG_RAIN.angVelMax,
		(Math.random() * 2 - 1) * BG_RAIN.angVelMax
	);

	fallingPieces.push({ obj: piece, speed, angVel, traveled: 0 });
}

// 3D “text box” the camera pans to
function ensureContentCard() {
	if (!contentGroup) return;

	// rebuild every time cinematic basis is recomputed (safe + simple)
	if (contentCardSprite) {
		contentGroup.remove(contentCardSprite);
		contentCardSprite = null;
	}
	if (contentCardMaterial) {
		contentCardMaterial.dispose();
		contentCardMaterial = null;
	}
	if (contentCardTexture) {
		contentCardTexture.dispose();
		contentCardTexture = null;
	}

	contentCardTexture = makeTextCardTexture("Carpe diem");
	contentCardMaterial = new THREE.SpriteMaterial({
		map: contentCardTexture,
		transparent: true,
		opacity: 0.0,
		depthWrite: false,
		depthTest: false,
	});

	contentCardSprite = new THREE.Sprite(contentCardMaterial);
	contentCardSprite.renderOrder = 999; 
	contentCardSprite.position.copy(contentTarget);
	contentCardSprite.scale.set(boardSpan * 1.7, boardSpan * 0.62, 1);

	contentGroup.add(contentCardSprite);
	contentGroup.visible = false;
}

function makeTextCardTexture(text) {
	const c = document.createElement("canvas");
	c.width = 1024;
	c.height = 512;

	const ctx = c.getContext("2d");
	ctx.clearRect(0, 0, c.width, c.height);

	// card bg
	const pad = 52;
	const x = pad, y = pad, w = c.width - pad * 2, h = c.height - pad * 2;
	const r = 44;

	ctx.fillStyle = "rgba(10,16,32,0.78)";
	ctx.strokeStyle = "rgba(180,200,255,0.28)";
	ctx.lineWidth = 6;

	roundedRect(ctx, x, y, w, h, r);
	ctx.fill();
	ctx.stroke();

	// title text
	ctx.fillStyle = "rgba(245,248,255,0.96)";
	ctx.font = "800 92px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto";
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	ctx.fillText(text, c.width / 2, c.height / 2);

	const tex = new THREE.CanvasTexture(c);
	tex.colorSpace = THREE.SRGBColorSpace;
	tex.needsUpdate = true;
	return tex;
}

function roundedRect(ctx, x, y, w, h, r) {
	ctx.beginPath();
	ctx.moveTo(x + r, y);
	ctx.arcTo(x + w, y, x + w, y + h, r);
	ctx.arcTo(x + w, y + h, x, y + h, r);
	ctx.arcTo(x, y + h, x, y, r);
	ctx.arcTo(x, y, x + w, y, r);
	ctx.closePath();
}


// ------------------------------------------------------------
// Loop + resize + dispose
// ------------------------------------------------------------
function startLoop() {
	const tick = () => {
		raf = requestAnimationFrame(tick);

		invariant(renderer && scene && camera && controls, "Render loop ticked before three.js was initialized.");

		const delta = clock.getDelta();
		elapsed += delta;

		scrollT.value = THREE.MathUtils.damp(scrollT.value, scrollTargetT, CINEMATIC.smoothing, delta);
		applyCinematic(scrollT.value);

		// Activate lock once we fully arrive at stage 3
		if (endScene.value && !contentLockActive && scrollT.value >= CONTENT_LOCK.activateAtScrollT) {
			contentLockActive = true;
			contentLockMinY = computeContentLockMinY();
			enforceContentMinScroll();       // snap to the lock point if needed
			setHeaderVisible(true);          // show header now that we’re in content mode
		}

		updateStage23Effects(delta);

		updateMoveAnimations(elapsed);
		applyHoverShake(elapsed);
		applyIdleShake(elapsed);

		renderer.render(scene, camera);
	};
	tick();
}

function stopLoop() {
	if (raf) cancelAnimationFrame(raf);
	raf = 0;
}

function onResize() {
	invariant(renderer && camera, "Resize before renderer/camera initialized.");

	renderer.setSize(window.innerWidth, window.innerHeight);
	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();

	if (contentLockActive) {
		contentLockMinY = computeContentLockMinY();
		enforceContentMinScroll();
	}
}

function disposeAll() {
	detachCanvasListeners();

	detachDragListeners();
	clearHover();
	clearSelection();
	cancelIdleHint();

	disposeHighlightSystem();
	resetStage23Effects(true);

	if (contentGroup) {
		scene?.remove(contentGroup);
		contentGroup = null;
	}
	if (fallingPiecesGroup) {
		scene?.remove(fallingPiecesGroup);
		fallingPiecesGroup = null;
	}

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

function sleep(ms) {
	return new Promise((r) => setTimeout(r, ms));
}
</script>

<style scoped>
.page {
	min-height: 100vh;

	/* theme tokens */
	--accent: 80, 140, 255;         /* default blue */
	--title: 245, 248, 255;         /* default hero title */
	--sub: 231, 238, 252;           /* default hero sub */
}

.page.theme-win {
	--accent: 70, 220, 120;
	--title: 210, 255, 225;
	--sub: 200, 255, 215;
}

.page.theme-lose {
	--accent: 255, 80, 80;
	--title: 255, 215, 215;
	--sub: 255, 205, 205;
}

/* optional, if you want a distinct draw look */
.page.theme-draw {
	--accent: 200, 200, 210;
	--title: 245, 248, 255;
	--sub: 231, 238, 252;
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
	touch-action: pan-y;
}

.stage-hero {
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
	color: rgba(var(--title), 0.96);
	text-shadow:
		0 0 14px rgba(var(--accent), 0.35),
		0 0 44px rgba(var(--accent), 0.18),
		0 12px 60px rgba(0, 0, 0, 0.55);
}

.hero-sub {
	margin-top: 10px;
	opacity: 0.88;
	color: rgba(var(--sub), 0.90);
}

.idle-prompt {
	position: fixed;
	top: clamp(28px, 6vh, 80px);
	left: 0;
	right: 0;
	display: flex;
	justify-content: center;
	z-index: 9999;
	pointer-events: none;

	opacity: 0;
	transform: translateY(-8px);
	transition: opacity 360ms ease, transform 360ms ease;
	will-change: opacity, transform;
}

.idle-prompt.is-visible {
	opacity: 1;
	transform: translateY(0);
}

.idle-prompt-text {
	margin-top: 3vh; /* override .hero-sub margin-top */
	padding: 0;          /* no pill */
	background: none;    /* no glass */
	border: none;

	font-size: clamp(16px, 2.1vw, 20px); /* slightly bigger than hero-sub */
	font-weight: 600; /* close to “subtitle”, not shouty */
	letter-spacing: 0; /* keep it calm */
	text-transform: none;

	/* keep hero-sub's color/opacity look, add only a faint glow */
	text-shadow:
		0 0 14px rgba(80, 140, 255, 0.18),
		0 10px 40px rgba(0, 0, 0, 0.35);
}

.skip-prompt {
	position: fixed;
	left: 0;
	right: 0;
	bottom: 18px;

	display: flex;
	justify-content: center;
	align-items: center;
	gap: 12px;

	z-index: 9999;

	/* container itself doesn't steal clicks from canvas */
	pointer-events: none;

	opacity: 0;
	transform: translateY(8px);
	transition: opacity 360ms ease, transform 360ms ease;
	will-change: opacity, transform;
}

.skip-prompt.is-visible {
	opacity: 1;
	transform: translateY(0);
}

.skip-prompt-text {
	color: rgba(var(--sub), 0.92);
	text-shadow:
		0 0 14px rgba(var(--accent), 0.14),
		0 10px 40px rgba(0, 0, 0, 0.35);
}

.skip-button {
	/* button IS clickable */
	pointer-events: auto;

	cursor: pointer;
	border-radius: 999px;
	padding: 10px 14px;

	background: rgba(10, 16, 32, 0.62);
	border: 1px solid rgba(var(--accent), 0.35);
	color: rgba(var(--title), 0.95);

	font-weight: 700;
	letter-spacing: 0.01em;
	backdrop-filter: blur(10px);
}

.skip-button:hover {
	background: rgba(10, 16, 32, 0.78);
}

.skip-button:active {
	transform: translateY(1px);
}

.skip-button:focus-visible {
	outline: 2px solid rgba(var(--accent), 0.55);
	outline-offset: 2px;
}


.scroll-hint {
	position: fixed;
	top: clamp(28px, 6vh, 80px);
	left: 0;
	right: 0;
	display: flex;
	justify-content: center;
	z-index: 9998;
	pointer-events: none;

	opacity: 0;
	transform: translateY(-8px);
	transition: opacity 360ms ease, transform 360ms ease;
	will-change: opacity, transform;
}

.scroll-hint.is-visible {
	opacity: 1;
	transform: translateY(0);
}

.scroll-hint-text {
	margin-top: 0;
	padding: 0;
	background: none;
	border: none;

	font-size: clamp(16px, 2.1vw, 20px);
	font-weight: 600;

	text-shadow:
		0 0 14px rgba(var(--accent), 0.18),
		0 10px 40px rgba(0, 0, 0, 0.35);
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
	background: rgba(var(--accent), 0.90);
}

.vignette {
	pointer-events: none;
	position: absolute;
	inset: -2px;
	z-index: 1;
	background:
		radial-gradient(1200px 700px at 50% 35%, rgba(var(--accent), 0.14), rgba(0, 0, 0, 0) 55%),
		radial-gradient(1200px 900px at 50% 50%, rgba(0, 0, 0, 0), rgba(0, 0, 0, 0.55) 75%),
		linear-gradient(to bottom, rgba(0, 0, 0, 0.25), rgba(0, 0, 0, 0.35));
}

.mono {
	font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
}

.content {
	position: relative;
	z-index: 5; /* above the canvas/vignette */
	padding: 18px;
	width: min(1100px, calc(100vw - 36px));
	margin: 0 auto;

	opacity: 0;
	transform: translateY(10px);
	transition: opacity 300ms ease, transform 300ms ease;
	pointer-events: none; /* hidden state */
}

.content.is-visible {
	margin-top: 70vh;
	opacity: 1;
	transform: translateY(0);
	pointer-events: auto;
}

.card {
	border-radius: 14px;
	padding: 14px;
	background: rgba(10, 16, 32, 0.72);
	border: 1px solid rgba(231, 238, 252, 0.18);
	backdrop-filter: blur(10px);
}

.section-label {
	font-size: 0.75rem;
	letter-spacing: 0.08em;
	text-transform: uppercase;
	opacity: 0.8;
	color: rgba(var(--sub), 0.9);
}

.section-title.small {
	font-size: 1.05rem;
	margin: 6px 0 10px;
	color: rgba(var(--title), 0.95);
}

.section-intro,
.hero-summary,
.outcomes-text {
	color: rgba(var(--sub), 0.85);
}

.hero {
	margin-bottom: 16px;
}

.hero-grid {
	display: grid;
	grid-template-columns: minmax(0, 9fr) minmax(0, 7fr);
	gap: 20px;
	align-items: stretch;
}

.hero-copy {
	display: flex;
	flex-direction: column;
	gap: 8px;
}

.hero-meta {
	font-size: 0.9rem;
	opacity: 0.9;
	color: rgba(var(--sub), 0.85);
	margin-bottom: 10px;
}

.hero-actions {
	display: flex;
	gap: 10px;
	flex-wrap: wrap;
	margin-top: 8px;
}

.btn {
	pointer-events: auto;
	cursor: pointer;
	border-radius: 999px;
	padding: 10px 14px;
	background: rgba(10, 16, 32, 0.62);
	border: 1px solid rgba(var(--accent), 0.35);
	color: rgba(var(--title), 0.95);
	font-weight: 700;
	letter-spacing: 0.01em;
	text-decoration: none;
}

.btn.secondary {
	opacity: 0.9;
}

.row {
	margin-top: 18px;
}

.outcomes {
	margin-top: 18px;
}

.outcomes-grid {
	display: grid;
	grid-template-columns: minmax(0, 11fr) minmax(0, 7fr);
	gap: 20px;
	margin-top: 10px;
}

.outcomes-images {
	display: flex;
	flex-direction: column;
	gap: 14px;
}

.pipeline-list {
	padding-left: 20px;
	color: rgba(var(--sub), 0.85);
	line-height: 1.5;
	margin: 8px 0;
}

.image-wrapper {
	border-radius: 10px;
	overflow: hidden;
	border: 1px solid rgba(231, 238, 252, 0.16);
	background: radial-gradient(circle at top left, rgba(255, 255, 255, 0.05), transparent);
}

.image-wrapper.large {
	width: 100%;
}

.image-placeholder {
	width: 100%;
	height: 220px;
	background: rgba(255, 255, 255, 0.06);
}

.image-placeholder.large {
	height: 260px;
}

@media (max-width: 900px) {
	.hero-grid {
		grid-template-columns: 1fr;
	}
	.outcomes-grid {
		grid-template-columns: 1fr;
	}
}

</style>
