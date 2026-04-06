import * as THREE from "three";

import { fileRankToSquare } from "../chessGame.js";
import { BLACK_TINT, BOARD_COLORS, GRID, PIECE, WHITE_TINT } from "./constants.js";

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

export function buildBoardTopPlane(boardInfo) {
	const point = tmpTarget.copy(boardInfo.center);
	const d = boardInfo.boardTop - point.dot(boardInfo.normal);
	point.addScaledVector(boardInfo.normal, d);

	const plane = new THREE.Plane();
	plane.setFromNormalAndCoplanarPoint(boardInfo.normal, point);
	return plane;
}

export function projectPointToPlane(point, plane, out) {
	const dist = plane.distanceToPoint(point);
	return out.copy(point).addScaledVector(plane.normal, -dist);
}

export function getSquareCenterWorld(file, rank, boardInfo) {
	const { center, squareSize, fileAxis, rankAxis } = boardInfo;
	const fx = (file - 3.5) * GRID.spacing + GRID.offsetFile;
	const rz = (rank - 3.5) * GRID.spacing + GRID.offsetRank;

	return tmpTarget
		.copy(center)
		.addScaledVector(fileAxis, fx * squareSize)
		.addScaledVector(rankAxis, rz * squareSize)
		.clone();
}

export function snapToBoardTopInPlace(pos, boardInfo, lift = 0.0) {
	const d = boardInfo.boardTop - pos.dot(boardInfo.normal);
	pos.addScaledVector(boardInfo.normal, d + lift);
	return pos;
}

export function squareFromWorldPoint(point, boardInfo) {
	const v = tmpV.copy(point).sub(boardInfo.center);
	const denom = Math.max(1e-6, boardInfo.squareSize * GRID.spacing);
	const u = v.dot(boardInfo.fileAxis) / denom + 3.5;
	const w = v.dot(boardInfo.rankAxis) / denom + 3.5;

	const file = Math.round(u);
	const rank = Math.round(w);
	if (file < 0 || file > 7 || rank < 0 || rank > 7) return null;
	return fileRankToSquare(file, rank);
}

export function clonePieceWithTint(template, color) {
	const clone = template.clone(true);
	clone.visible = true;
	clone.traverse((o) => {
		o.visible = true;
	});

	const target = color === "white" ? WHITE_TINT : BLACK_TINT;
	clone.traverse((o) => {
		if (!o.isMesh || !o.material) return;

		const apply = (material) => {
			const nextMaterial = material.clone();
			if (nextMaterial.color) nextMaterial.color.copy(target);
			if (typeof nextMaterial.roughness === "number") nextMaterial.roughness = color === "white" ? 0.10 : 0.30;
			if (typeof nextMaterial.metalness === "number") nextMaterial.metalness = color === "white" ? 0.30 : 0.90;
			if ("envMapIntensity" in nextMaterial) nextMaterial.envMapIntensity = color === "white" ? 1.45 : 0.55;
			if (nextMaterial.color) nextMaterial.color.offsetHSL(0, 0, color === "white" ? -0.06 : 0.03);
			if (nextMaterial.emissive) nextMaterial.emissive.setHex(0x000000);
			nextMaterial.needsUpdate = true;
			return nextMaterial;
		};

		o.material = Array.isArray(o.material) ? o.material.map(apply) : apply(o.material);
	});

	return clone;
}

export function recolorBoard(boardRoot, squareSize) {
	if (!boardRoot) return;

	boardRoot.traverse((o) => {
		if (!o.isMesh || !o.material) return;
		if (/pawn|rook|knight|bishop|queen|king/i.test(o.name || "")) return;

		tmpBox.setFromObject(o);
		tmpBox.getSize(tmpSize);
		const isBorderByThickness = tmpSize.y > squareSize * 0.18;
		const objName = (o.name || "").toLowerCase();

		const apply = (material) => {
			const nextMaterial = material.clone();
			if (!nextMaterial.color) return nextMaterial;

			const matName = (nextMaterial.name || "").toLowerCase();
			const isBorderByName = /frame|border|rim|edge|base|wood/.test(matName) || /frame|border|rim|edge|base|wood/.test(objName);
			const isLight = /light|white|tan|beige/.test(matName) || /light|white|tan|beige/.test(objName);
			const isDark = /dark|black|green/.test(matName) || /dark|black|green/.test(objName);

			let role = "dark";
			if (isBorderByThickness || isBorderByName) role = "border";
			else if (isLight && !isDark) role = "light";
			else if (isDark && !isLight) role = "dark";
			else {
				const color = material.color || nextMaterial.color;
				const luminance = 0.2126 * color.r + 0.7152 * color.g + 0.0722 * color.b;
				role = luminance > 0.55 ? "light" : "dark";
			}

			nextMaterial.color.set(BOARD_COLORS[role]);
			nextMaterial.needsUpdate = true;
			return nextMaterial;
		};

		o.material = Array.isArray(o.material) ? o.material.map(apply) : apply(o.material);
	});
}

export function findBoardMesh(rootObj) {
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

export function computeBoardGrid(board, worldUp) {
	tmpBox.setFromObject(board);
	tmpBox.getSize(tmpSize);
	tmpBox.getCenter(tmpCenter);

	const squareSize = Math.min(tmpSize.x, tmpSize.z) / 8;

	board.getWorldQuaternion(tmpQuat);
	tmpAxisX.set(1, 0, 0).applyQuaternion(tmpQuat).normalize();
	tmpAxisY.set(0, 1, 0).applyQuaternion(tmpQuat).normalize();
	tmpAxisZ.set(0, 0, 1).applyQuaternion(tmpQuat).normalize();

	let normal = tmpAxisY;
	let best = Math.abs(tmpAxisY.dot(worldUp));

	const xScore = Math.abs(tmpAxisX.dot(worldUp));
	if (xScore > best) {
		best = xScore;
		normal = tmpAxisX;
	}

	const zScore = Math.abs(tmpAxisZ.dot(worldUp));
	if (zScore > best) {
		best = zScore;
		normal = tmpAxisZ;
	}

	tmpNormal.copy(normal).normalize();
	if (tmpNormal.dot(worldUp) < 0) tmpNormal.multiplyScalar(-1);

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

export function getBoxExtremeAlongNormal(box, normal, max) {
	const x0 = box.min.x;
	const y0 = box.min.y;
	const z0 = box.min.z;
	const x1 = box.max.x;
	const y1 = box.max.y;
	const z1 = box.max.z;

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

export function normalizePieceUprightAndScale(piece, squareSize) {
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
		const scale = THREE.MathUtils.clamp(desired / footprint, 0.001, 1000);
		piece.scale.multiplyScalar(scale);
		piece.updateWorldMatrix(true, true);
	}
}

export function placeOnSquare(piece, boardInfo, file, rank, color) {
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

export function getBaseCenterXZWorld(obj) {
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
