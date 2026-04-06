import * as THREE from "three";

export const HOVER_GLOW = 0x2f6bff;

export const HOVER_SHAKE = {
	rotAmp: 0.03,
	posAmp: 0.006,
	freq: 16.0,
	holdSec: 1.0,
	totalSec: 2.0,
};

export const MOVE_ANIM = {
	durationSec: 0.38,
	jumpHeightRatio: 0.32,
	dragDropDurationSec: 0.22,
	dragDropJumpHeightRatio: 0.0,
	dragCancelDurationSec: 0.18,
};

export const DRAG = {
	thresholdPx: 7,
	liftRatio: 0.20,
};

export const TEMPLATE_NAMES = {
	pawn: "Pawn_White_0",
	rook: "Rook_Black_0",
	knight: "Knight_White_0",
	bishop: "Bishop_Black_0",
	queen: "Queen_White_0",
	king: "King_Black_0",
};

export const CINEMATIC = {
	transitionVh: 210,
	stages: 3,
	smoothing: 6.0,
	titleFadeStart: 0.05,
	titleFadeEnd: 0.32,
	introSideDist: 1.5,
	introUp: 0.02,
	introForward: 0,
	introSide: 0,
	introTargetUp: 0.08,
	playBack: 1.1,
	playUp: 1.5,
	playSide: -0.0,
	playTargetUp: 0.0,
	learnBack: 0.88,
	learnUp: 0.14,
	learnSide: 0.0,
	learnTargetUp: 0.14,
	learnTargetForward: 0.85,
	learnTargetSide: 0.0,
	learnRollRad: Math.PI,
	contentBack: 0.88,
	contentUp: 0.14,
	contentSide: 0.0,
	contentTargetUp: 0.6,
	contentTargetForward: 0.85,
	contentTargetSide: 0.0,
	contentRollRad: Math.PI,
	twistDeg: 0,
};

export const STAGE2_DROP = {
	startScrollT: 2.0,
	maxDelaySec: 0.75,
	speedMinSpan: 0.55,
	speedMaxSpan: 1.30,
	cullBelowSpan: 3.25,
};

export const BG_RAIN = {
	startScrollT: 1.60,
	spinScrollT: 2.8,
	rateStraight: 10.0,
	rateSpin: 14.0,
	maxPieces: 140,
	spawnRadiusSpan: 1.8,
	spawnHeightSpan: 2.2,
	speedMinSpan: 0.85,
	speedMaxSpan: 1.0,
	angVelMax: 3.0,
	cullBelowSpan: 3.8,
	minCamDistSpan: 1.05,
};

export const CONTENT_LOCK = {
	activateAtScrollT: 2.98,
};

export const CONTENT_SECTIONS = [
	{ id: "context", label: "Context" },
	{ id: "approach", label: "Approach" },
	{ id: "features", label: "Features" },
	{ id: "process", label: "Process" },
	{ id: "results", label: "Results" },
	{ id: "learnings", label: "Key learnings" },
	{ id: "tradeoffs", label: "Future improvements" },
];

export const IDLE_HINT = {
	delayMs: 400,
	square: "e2",
	settledP01: 0.995,
};

export const IDLE_SHAKE = {
	rotAmp: 0.022,
	posAmp: 0.004,
	freq: 12.0,
};

export const END_AUTO = {
	winDelayMs: 950,
	loseDelayMs: 1100,
	drawDelayMs: 900,
	gameoverDelayMs: 900,
};

export const BOARD_COLORS = {
	dark: "#769656",
	light: "#eeeed2",
	border: "#3b342e",
};

export const GRID = {
	spacing: 0.92,
	offsetFile: 0.0,
	offsetRank: 0.0,
};

export const PIECE = {
	footprintRatio: 0.55,
	liftEps: 0.001,
};

export const WHITE_TINT = new THREE.Color(0xd2c7b6);
export const BLACK_TINT = new THREE.Color(0x151515);
