<script setup>
// Port of Super-Move's src/components/TruckFitScene.vue (the live app's "Review your truck fit"
// scene): same Kenney models, truck shell, logo, lighting, camera and drop animation. The one
// change is that the app plays the drop once, while here it loops: after the last item settles
// the load holds briefly, then restarts.
import { onBeforeUnmount, onMounted, ref } from 'vue';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import logoUrl from '../assets/super-move/logo.png';
import demo from '../assets/super-move/packing-demo.json';

// Kenney Furniture Kit (CC0) models, copied from Super-Move's Kenny/Models/GLTF format.
const modelUrls = import.meta.glob('../assets/super-move/models/*.glb', { query: '?url', import: 'default', eager: true });
const modelUrlFor = (model) => modelUrls[`../assets/super-move/models/${model}.glb`] || null;

// App.vue mapPackedTrucks
const trucks = demo.trucks.map((truck) => ({
  ...truck,
  packingGrid: { columns: truck.cellsX, rows: truck.cellsY, maxHeight: truck.cellsZ },
  items: truck.items.map((item) => ({ ...item, batch: Math.floor(item.sequence / 4) })),
}));

// Same per-item timing as TruckFitScene: delay = batch × 0.16 + (sequence % 4) × 0.04, 0.72 s drop.
const DROP = 0.72;
const DROP_HEIGHT = 1.1; // metres above its resting spot that each item starts falling from
const delayOf = (item) => item.batch * 0.16 + (item.sequence % 4) * 0.04;
const duration = Math.max(...trucks.flatMap((t) => t.items.map(delayOf))) + DROP;

const HOLD = 2.4; // seconds the full load stays on screen before the loop restarts
const LOOP = duration + HOLD;

const container = ref(null);
const stage = ref(null);
const status = ref('Loading 3D truck fit');
let elapsed = 0;
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

let renderer;
let scene;
let camera;
let controls;
let resizeObserver;
let visObserver;
let animationFrame;
let disposed = false;
let cameraFrame = 6.15;
let visible = false;
let lastTime = 0;
const animated = [];

const loader = new GLTFLoader();
const modelCache = new Map();

const truckPalette = {
  floor: 0xe2cd69,
  wall: 0xf4e3a2,
  rail: 0xd4b84f,
  dark: 0x263234,
};

const loadModel = (model) => {
  if (!modelCache.has(model)) {
    const url = modelUrlFor(model);
    modelCache.set(model, new Promise((resolve) => {
      if (!url) { resolve(null); return; }
      loader.load(url, (gltf) => resolve(gltf.scene), undefined, (error) => {
        console.warn(`Could not load Kenney model for ${model}`, error);
        resolve(null);
      });
    }));
  }
  return modelCache.get(model);
};

const makeMaterial = (color, options = {}) =>
  new THREE.MeshStandardMaterial({
    color,
    roughness: 0.68,
    metalness: 0.05,
    ...options,
  });

const makeBox = (width, height, depth, color, position, options = {}) => {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), makeMaterial(color, options));
  mesh.position.set(position.x, position.y, position.z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
};

const buildTruck = (truck, index) => {
  const group = new THREE.Group();
  const cargoLength = truck.cargoLength;
  const cargoDepth = truck.cargoWidth;
  const cargoHeight = truck.cargoHeight;
  const offset = (index - (trucks.length - 1) / 2) * (cargoDepth + 1.2);

  group.position.z = offset;
  group.add(makeBox(cargoLength, 0.08, cargoDepth, truckPalette.floor, { x: 0, y: 0, z: 0 }));
  group.add(makeBox(cargoLength, cargoHeight, 0.08, truckPalette.wall, { x: 0, y: cargoHeight / 2, z: -cargoDepth / 2 - 0.04 }, { transparent: true, opacity: 0.72 }));
  group.add(makeBox(0.08, cargoHeight, cargoDepth, truckPalette.wall, { x: -cargoLength / 2 - 0.04, y: cargoHeight / 2, z: 0 }, { transparent: true, opacity: 0.72 }));
  const railThickness = 0.08;
  const railY = cargoHeight + railThickness / 2;
  const railSpanX = cargoLength + railThickness;
  const railSpanZ = cargoDepth + railThickness;
  group.add(makeBox(railSpanX, railThickness, railThickness, truckPalette.rail, { x: 0, y: railY, z: cargoDepth / 2 + railThickness / 2 }));
  group.add(makeBox(railSpanX, railThickness, railThickness, truckPalette.rail, { x: 0, y: railY, z: -cargoDepth / 2 - railThickness / 2 }));
  group.add(makeBox(railThickness, railThickness, railSpanZ, truckPalette.rail, { x: cargoLength / 2 + railThickness / 2, y: railY, z: 0 }));
  group.add(makeBox(railThickness, railThickness, railSpanZ, truckPalette.rail, { x: -cargoLength / 2 - railThickness / 2, y: railY, z: 0 }));

  // Brand logo on the truck's exterior near-side panel.
  const logoMaterial = new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide });
  const logoMesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), logoMaterial);
  logoMesh.visible = false;
  logoMesh.position.set(0, cargoHeight * 0.55, cargoDepth / 2 + 0.05);
  logoMesh.renderOrder = 2;
  group.add(logoMesh);
  new THREE.TextureLoader().load(logoUrl, (texture) => {
    if (disposed) return;
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = renderer ? renderer.capabilities.getMaxAnisotropy() : 1;
    logoMaterial.map = texture;
    logoMaterial.needsUpdate = true;
    const imageAspect = texture.image.width / texture.image.height;
    const maxWidth = cargoLength * 0.5;
    const maxHeight = cargoHeight * 0.62;
    let logoWidth = maxWidth;
    let logoHeight = logoWidth / imageAspect;
    if (logoHeight > maxHeight) {
      logoHeight = maxHeight;
      logoWidth = logoHeight * imageAspect;
    }
    logoMesh.geometry.dispose();
    logoMesh.geometry = new THREE.PlaneGeometry(logoWidth, logoHeight);
    logoMesh.visible = true;
  });

  const gridColumns = truck.packingGrid?.columns || truck.gridColumns;
  const gridRows = truck.packingGrid?.rows || truck.gridRows;
  const grid = new THREE.GridHelper(Math.max(cargoLength, cargoDepth), Math.max(gridColumns, gridRows), 0xc8b764, 0xdccb7a);
  grid.position.y = 0.045;
  grid.scale.x = cargoLength / Math.max(cargoLength, cargoDepth);
  grid.scale.z = cargoDepth / Math.max(cargoLength, cargoDepth);
  group.add(grid);

  return {
    group,
    cargoLength,
    cargoDepth,
    cargoHeight,
    cellLength: cargoLength / gridColumns,
    cellDepth: cargoDepth / gridRows,
    cellHeight: cargoHeight / (truck.packingGrid?.maxHeight || Math.max(1, Math.round(cargoHeight * 10))),
  };
};

const orientationQuaternion = (item) => {
  const tip = new THREE.Quaternion();
  if (item.flip === 'end') {
    tip.setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2);
  } else if (item.flip === 'side') {
    tip.setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.PI / 2);
  }
  const yaw = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), -((item.yaw || 0) * Math.PI) / 2);
  return yaw.multiply(tip);
};

const WORLD_AXES = [new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 1)];

const normalizeModel = (source, item) => {
  if (!source) return null;

  const model = source.clone(true);
  model.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
      if (child.material) {
        child.material = child.material.clone();
        child.material.roughness = 0.72;
      }
    }
  });

  const isBox = item.model === 'cardboardBoxClosed';
  const fill = isBox ? 0.98 : 1;
  const quaternion = orientationQuaternion(item);
  const target = [
    Math.max(item.widthMeters * fill, 0.05),
    Math.max(item.heightMeters * fill, 0.05),
    Math.max(item.depthMeters * fill, 0.05),
  ];

  const naturalSize = new THREE.Box3().setFromObject(model).getSize(new THREE.Vector3()).toArray();
  const scale = [0, 1, 2].map((i) => {
    const rotated = WORLD_AXES[i].clone().applyQuaternion(quaternion);
    const comps = [Math.abs(rotated.x), Math.abs(rotated.y), Math.abs(rotated.z)];
    const worldAxis = comps.indexOf(Math.max(...comps));
    return target[worldAxis] / Math.max(naturalSize[i], 0.01);
  });
  model.scale.set(scale[0], scale[1], scale[2]);

  const pivot = new THREE.Group();
  pivot.quaternion.copy(quaternion);
  pivot.add(model);
  const posedBox = new THREE.Box3().setFromObject(pivot);
  const center = posedBox.getCenter(new THREE.Vector3());
  pivot.position.set(-center.x, -posedBox.min.y, -center.z);

  const wrapper = new THREE.Group();
  wrapper.add(pivot);
  wrapper.userData.delay = delayOf(item);
  return wrapper;
};

const addPackedItems = async (truckData, truckMesh) => {
  const loaded = await Promise.all(truckData.items.map((item) => loadModel(item.model)));
  if (disposed) return;

  truckData.items.forEach((item, index) => {
    const packedItem = {
      ...item,
      widthMeters: item.width * truckMesh.cellLength,
      depthMeters: item.depth * truckMesh.cellDepth,
      heightMeters: item.height * truckMesh.cellHeight,
    };
    const object = normalizeModel(loaded[index], packedItem);
    if (!object) return;

    const x = -truckMesh.cargoLength / 2 + (item.x + item.width / 2) * truckMesh.cellLength;
    const z = -truckMesh.cargoDepth / 2 + (item.y + item.depth / 2) * truckMesh.cellDepth;
    const targetY = 0.08 + item.z * truckMesh.cellHeight;
    object.position.set(x, truckMesh.cargoHeight + 1.5 + item.batch * 0.52, z);
    object.userData.targetY = targetY;
    // Portfolio change: drop from DROP_HEIGHT above the resting spot (the app uses cargoHeight + 1.5 m
    // above it, which starts items far outside a tightly framed camera).
    object.userData.startY = targetY + DROP_HEIGHT;
    truckMesh.group.add(object);
    animated.push(object);
  });
};

// TruckFitScene's per-object drop (ease-out cubic + settle bounce), evaluated at `elapsed`.
const applyClock = (t) => {
  for (const object of animated) {
    const p = Math.max(0, Math.min(1, (t - object.userData.delay) / DROP));
    const eased = 1 - Math.pow(1 - p, 3);
    object.position.y = THREE.MathUtils.lerp(object.userData.startY, object.userData.targetY, eased);
    if (p > 0.82) {
      object.position.y += Math.sin((p - 0.82) * Math.PI * 3) * 0.05 * (1 - p);
    }
  }
};

const setupScene = async () => {
  if (!container.value) return;

  disposed = false;
  status.value = 'Loading 3D truck fit';
  scene = new THREE.Scene();

  const width = container.value.clientWidth || 900;
  const height = container.value.clientHeight || 520;
  const aspect = width / height;
  const largestTruckLength = Math.max(...trucks.map((truck) => truck.cargoLength));
  const largestTruckHeight = Math.max(...trucks.map((truck) => truck.cargoHeight));
  cameraFrame = Math.max(3.55, largestTruckLength * 0.66, largestTruckHeight * 1.55);
  camera = new THREE.OrthographicCamera(-cameraFrame * aspect, cameraFrame * aspect, cameraFrame, -cameraFrame, 0.1, 100);
  camera.position.set(8.3, 7.0, 9.2);
  camera.lookAt(0, 0, 0);

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(width, height);
  renderer.setClearColor(0x000000, 0);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  container.value.replaceChildren(renderer.domElement);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 1.0, 0);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.enableZoom = false; // keep the mouse wheel for scrolling the page
  controls.minPolarAngle = 0.05;
  controls.maxPolarAngle = Math.PI / 2 - 0.02;
  controls.update();

  scene.add(new THREE.HemisphereLight(0xffffff, 0xa9b9b5, 2.7));

  const sun = new THREE.DirectionalLight(0xffffff, 2.2);
  sun.position.set(6, 10, 4);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  scene.add(sun);

  const ground = new THREE.Mesh(new THREE.PlaneGeometry(36, 24), new THREE.ShadowMaterial({ color: 0x6d7775, opacity: 0.12 }));
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.03;
  ground.receiveShadow = true;
  scene.add(ground);

  const truckMeshes = trucks.map((truck, index) => {
    const truckMesh = buildTruck(truck, index);
    scene.add(truckMesh.group);
    return truckMesh;
  });

  // Portfolio change: frame the camera on the trucks themselves (plus headroom for items landing on
  // top) instead of TruckFitScene's fixed frame, so nothing is clipped in a narrower column.
  fitBox = new THREE.Box3();
  truckMeshes.forEach((t) => fitBox.expandByObject(t.group));
  // Headroom for the highest falling item: it starts DROP_HEIGHT above a spot at most at the roof.
  fitBox.max.y += DROP_HEIGHT + 0.1;
  const centre = fitBox.getCenter(new THREE.Vector3());
  controls.target.copy(centre); // orbit around the load, so dragging keeps it in frame
  camera.lookAt(centre);
  controls.update();
  fitCamera();

  await Promise.all(trucks.map((truck, index) => addPackedItems(truck, truckMeshes[index])));
  status.value = '';
  animationFrame = requestAnimationFrame(animate);
};

const animate = (now) => {
  if (disposed || !renderer || !scene || !camera) return;
  animationFrame = requestAnimationFrame(animate);
  const dt = Math.min(0.05, (now - lastTime) / 1000 || 0);
  lastTime = now;
  if (!visible) return;

  elapsed = reduceMotion ? duration : (elapsed + dt) % LOOP;
  applyClock(Math.min(elapsed, duration));
  if (controls) controls.update();
  renderer.render(scene, camera);
};

const disposeObject = (object) => {
  object.traverse((child) => {
    if (child.geometry) child.geometry.dispose();
    if (child.material) {
      if (Array.isArray(child.material)) child.material.forEach((material) => material.dispose());
      else child.material.dispose();
    }
  });
};

// Fit the orthographic frustum to fitBox as seen from the camera, keeping the canvas aspect.
let fitBox = null;
const fitCamera = () => {
  if (!camera || !fitBox || !container.value) return;
  const aspect = (container.value.clientWidth || 900) / (container.value.clientHeight || 520);
  camera.updateMatrixWorld();
  const min = new THREE.Vector2(Infinity, Infinity);
  const max = new THREE.Vector2(-Infinity, -Infinity);
  for (let i = 0; i < 8; i += 1) {
    const v = new THREE.Vector3(
      i & 1 ? fitBox.max.x : fitBox.min.x,
      i & 2 ? fitBox.max.y : fitBox.min.y,
      i & 4 ? fitBox.max.z : fitBox.min.z,
    ).applyMatrix4(camera.matrixWorldInverse);
    min.min(new THREE.Vector2(v.x, v.y));
    max.max(new THREE.Vector2(v.x, v.y));
  }
  const cx = (min.x + max.x) / 2;
  const cy = (min.y + max.y) / 2;
  let halfW = ((max.x - min.x) / 2) * 1.08;
  let halfH = ((max.y - min.y) / 2) * 1.08;
  if (halfW / halfH < aspect) halfW = halfH * aspect;
  else halfH = halfW / aspect;
  camera.left = cx - halfW;
  camera.right = cx + halfW;
  camera.top = cy + halfH;
  camera.bottom = cy - halfH;
  camera.updateProjectionMatrix();
};

const resize = () => {
  if (!container.value || !renderer || !camera) return;
  const width = container.value.clientWidth || 900;
  const height = container.value.clientHeight || 520;
  fitCamera();
  renderer.setSize(width, height);
};

onMounted(async () => {
  await setupScene();
  resizeObserver = new ResizeObserver(resize);
  if (container.value) resizeObserver.observe(container.value);

  // Only animate while on screen, so the loop starts from an empty truck when it scrolls into view.
  visObserver = new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting && !visible) elapsed = 0;
    visible = entry.isIntersecting;
  }, { threshold: 0.2 });
  if (stage.value) visObserver.observe(stage.value);
});

onBeforeUnmount(() => {
  disposed = true;
  if (animationFrame) cancelAnimationFrame(animationFrame);
  resizeObserver?.disconnect();
  visObserver?.disconnect();
  controls?.dispose();
  if (scene) disposeObject(scene);
  renderer?.dispose();
});
</script>

<template>
  <div class="sm-fit">
    <div ref="stage" class="truck-fit-stage">
      <div class="three-truck-scene">
        <div ref="container" class="three-canvas" aria-label="3D packed truck visualization"></div>
        <div v-if="status" class="three-loading">{{ status }}</div>
      </div>
      <div class="scene-help">Click and drag to rotate</div>
    </div>
  </div>
</template>

<style scoped>
/* Super-Move design tokens and truck-fit stage styles (src/styles.css) */
.sm-fit {
  --line: #dbe2eb;
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

/* No frame: the trucks sit directly on the page (transparent canvas, shadows only). */
.truck-fit-stage {
  position: relative;
  min-height: 560px;
}

.three-truck-scene,
.three-canvas,
.three-canvas :deep(canvas) {
  display: block;
  width: 100%;
  height: 100%;
  min-height: 560px;
}
.three-truck-scene { position: absolute; inset: 0; }

.three-loading {
  position: absolute;
  right: 22px;
  bottom: 22px;
  padding: 10px 12px;
  border-radius: 8px;
  color: #25334a;
  background: rgb(255 255 255 / 90%);
  font-size: 12px;
  font-weight: 850;
  box-shadow: 0 10px 24px rgb(36 48 73 / 14%);
}

.scene-help {
  position: absolute;
  z-index: 2;
  left: 50%;
  bottom: 6px;
  transform: translateX(-50%);
  color: #50607a;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: .04em;
  white-space: nowrap;
  pointer-events: none;
}

@media (max-width: 640px) {
  .truck-fit-stage, .three-truck-scene, .three-canvas, .three-canvas :deep(canvas) { min-height: 420px; }
}
</style>
