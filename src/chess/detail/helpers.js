import * as THREE from "three";

export function disposeObject3D(obj) {
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

export function smoothstep(edge0, edge1, x) {
	const t = THREE.MathUtils.clamp((x - edge0) / Math.max(1e-6, edge1 - edge0), 0, 1);
	return t * t * (3 - 2 * t);
}

export function easeInOutCubic(x) {
	const t = THREE.MathUtils.clamp(x, 0, 1);
	return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export function sleep(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}
