// Ten Thousand Meters — photographic surface dive into a procedural deep-ocean scene.
// Numbered full-frame plates drive the surface transition; the deeper world is
// generated in code. The camera travels down a vertical column as the page scrolls;
// each project zone is a group of objects parked at its depth stratum.

import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import chessModelUrl from '../assets/chess-engine/chess_set.glb?url'

const WORLD_H = 320 // world units for the full 0 → 10,000 m descent
const TAU = Math.PI * 2
const SUB_P = 0.055 // scroll fraction spent plunging from the boat under the surface
const droneModelUrl = `${import.meta.env.BASE_URL}models/drone.glb`
const cloudLayerUrl = `${import.meta.env.BASE_URL}images/descent/cloud-layer.webp`
const descentPlateUrls = ['0.png', '1.png', '2.png', '3.png', '4.png', '6.png', '7.png', '8.png']
  .map((name) => `${import.meta.env.BASE_URL}images/descent/sequence-v2/${name}`)
const DESCENT_PLATE_ASPECT = 1672 / 941

// ---------------------------------------------------------------------------
// Shared shader chunks
// ---------------------------------------------------------------------------

const SOFT_DISC_FRAG = /* glsl */ `
  float softDisc() {
    vec2 d = gl_PointCoord - 0.5;
    float r = length(d) * 2.0;
    return smoothstep(1.0, 0.15, r);
  }
`

// Water colour ramp by depth in metres (kept in sync with rampJS below).
const RAMP_GLSL = /* glsl */ `
  vec3 waterRamp(float d) {
    vec3 c0 = vec3(0.075, 0.500, 0.560); // sunlit turquoise
    vec3 c1 = vec3(0.016, 0.230, 0.430); // sapphire
    vec3 c2 = vec3(0.007, 0.062, 0.190); // deep blue
    vec3 c3 = vec3(0.0028, 0.016, 0.070); // indigo
    vec3 c4 = vec3(0.0010, 0.005, 0.026); // abyssal
    vec3 c5 = vec3(0.0004, 0.0018, 0.010); // hadal
    vec3 c6 = vec3(0.0001, 0.0007, 0.0040); // floor
    vec3 c = mix(c0, c1, smoothstep(0.0, 300.0, d));
    c = mix(c, c2, smoothstep(300.0, 1100.0, d));
    c = mix(c, c3, smoothstep(1100.0, 2600.0, d));
    c = mix(c, c4, smoothstep(2600.0, 4500.0, d));
    c = mix(c, c5, smoothstep(4500.0, 7000.0, d));
    c = mix(c, c6, smoothstep(7000.0, 10000.0, d));
    return c;
  }
`

// JS twin of the ramp for fog colour.
const RAMP_STOPS = [
  [0, 0.075, 0.5, 0.56],
  [300, 0.016, 0.23, 0.43],
  [1100, 0.007, 0.062, 0.19],
  [2600, 0.0028, 0.016, 0.07],
  [4500, 0.001, 0.005, 0.026],
  [7000, 0.0004, 0.0018, 0.01],
  [10000, 0.0001, 0.0007, 0.004]
]
function rampJS(d, out) {
  for (let i = 1; i < RAMP_STOPS.length; i++) {
    const a = RAMP_STOPS[i - 1]
    const b = RAMP_STOPS[i]
    if (d <= b[0] || i === RAMP_STOPS.length - 1) {
      let t = (d - a[0]) / (b[0] - a[0])
      t = Math.max(0, Math.min(1, t))
      t = t * t * (3 - 2 * t)
      out.setRGB(a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t, a[3] + (b[3] - a[3]) * t)
      return out
    }
  }
  return out
}

// ---------------------------------------------------------------------------
// Background water: fullscreen quad — gradient, god rays, caustics, dither
// ---------------------------------------------------------------------------

function makeBackground(plateTextureA, plateTextureB, cloudTexture) {
  const mat = new THREE.ShaderMaterial({
    depthWrite: false,
    depthTest: false,
    uniforms: {
      uTime: { value: 0 },
      uDepth: { value: 0 },
      uAspect: { value: 1 },
      uPlateAspect: { value: DESCENT_PLATE_ASPECT },
      uCamH: { value: 3 }, // camera height above the waterline (world units)
      uHorizon: { value: 0.35 }, // screen-space v of the horizon line
      uAbove: { value: 1 }, // 1 = above water, 0 = submerged (smooth dive crossfade)
      uPlateBlend: { value: 0 },
      uPlateProgress: { value: 0 },
      uPlateAlpha: { value: 1 },
      uSun: { value: new THREE.Vector2(0.7, 0.72) },
      uPlateMapA: { value: plateTextureA },
      uPlateMapB: { value: plateTextureB },
      uCloudMap: { value: cloudTexture }
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = vec4(position.xy, 1.0, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      precision highp float;
      varying vec2 vUv;
      uniform float uTime;
      uniform float uDepth;
      uniform float uAspect;
      uniform float uPlateAspect;
      uniform float uCamH;
      uniform float uHorizon;
      uniform float uAbove;
      uniform float uPlateBlend;
      uniform float uPlateProgress;
      uniform float uPlateAlpha;
      uniform vec2 uSun;
      uniform sampler2D uPlateMapA;
      uniform sampler2D uPlateMapB;
      uniform sampler2D uCloudMap;
      ${RAMP_GLSL}

      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
      }

      float vnoise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(
          mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
          mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
          u.y
        );
      }

      float fbm(vec2 p) {
        float s = 0.0;
        float a = 0.5;
        for (int i = 0; i < 4; i++) {
          s += a * vnoise(p);
          p *= 2.03;
          a *= 0.5;
        }
        return s;
      }

      vec2 coverUv(vec2 uv) {
        vec2 scale = vec2(1.0);
        if (uAspect > uPlateAspect) scale.y = uPlateAspect / uAspect;
        else scale.x = uAspect / uPlateAspect;
        return (uv - 0.5) * scale + 0.5;
      }

      vec3 samplePlate(vec2 uv) {
        return mix(
          texture2D(uPlateMapA, uv).rgb,
          texture2D(uPlateMapB, uv).rgb,
          uPlateBlend
        );
      }

      // The clear reference plate supplies the real mountain, sunlight and
      // atmospheric colour. A reference-derived cloud plate drifts over it.
      vec3 skyColor(vec2 p, float t) {
        float rel = vUv.y - uHorizon;

        // Cover-sample the plate so wide screens do not stretch the peaks.
        // Pixels beneath the horizon are never sampled from this plate; the
        // live ocean mesh owns that entire part of the frame.
        vec2 plateUv = coverUv(vUv);
        vec3 col = samplePlate(plateUv);
        float skyOnly = smoothstep(-0.002, 0.045, rel);

        // Keep the cloud bank rigid. As the waterline rises, move the cloud
        // plate upward by exactly the same screen-space distance. skyOnly and
        // highSky clip it to the sky, so clouds can never cross into the water.
        float cloudLife = 1.0 - smoothstep(0.12, 0.15, uPlateProgress);
        // Keep a little overscan around the cloud plate so its wider drift
        // never reveals a clamped edge. This matches the broad, slow movement
        // of the earlier photographic treatment rather than barely wobbling.
        vec2 cloudUv = (coverUv(vUv) - 0.5) * 0.88 + 0.5;
        cloudUv.y -= max(0.0, uHorizon - 0.35);
        cloudUv.x += sin(t * 0.057) * 0.055 * cloudLife;
        cloudUv.y += sin(t * 0.031 + 1.2) * 0.012 * cloudLife;
        vec3 cloud = texture2D(uCloudMap, cloudUv).rgb;
        // luminance of the lit clouds doubles as their coverage mask
        float cloudLum = max(cloud.r, max(cloud.g, cloud.b));
        float cloudMask = smoothstep(0.04, 0.5, cloudLum);
        // ride up in the sky and fade into the horizon haze
        float highSky = smoothstep(0.0, 0.34, rel);
        // The added cloud bank belongs only to the opening plate. Fade it out
        // as the first frame transition completes so later plates remain clean.
        float cloudAlpha = cloudMask * skyOnly * highSky * cloudLife * 0.8;
        col = 1.0 - (1.0 - col) * (1.0 - cloud * cloudAlpha);

        float haze = exp(-abs(rel) * 36.0);
        col = mix(col, vec3(0.72, 0.81, 0.83), haze * 0.14);
        // Soft, warm atmospheric haze at the horizon. Kept light so it blends
        // the blue sky into the plate's own hazy sea line instead of banding a
        // hard grey stripe across the frame.
        float horizonVeil = 1.0 - smoothstep(0.0, 0.075, rel);
        col = mix(col, vec3(0.80, 0.82, 0.82), horizonVeil * 0.28);
        return clamp(col, 0.0, 1.0);
      }
      // Cheap iterated caustic pattern (surface only).
      float caustics(vec2 uv, float t) {
        vec2 p = uv * 6.0;
        vec2 i = p;
        float c = 0.0;
        for (int n = 0; n < 3; n++) {
          float tt = t * (1.0 - 3.5 / float(n + 1));
          i = p + vec2(cos(tt - i.x) + sin(tt + i.y), sin(tt - i.y) + cos(tt + i.x));
          c += 1.0 / length(vec2(p.x / (sin(i.x + tt) / 0.6), p.y / (cos(i.y + tt) / 0.6)));
        }
        c /= 3.0;
        c = 1.17 - pow(c, 1.4);
        return pow(abs(c), 7.0);
      }

      void main() {
        vec2 p = vec2((vUv.x - 0.5) * uAspect, vUv.y);
        float t = uTime;

        // sunlight survives roughly the first kilometre
        float sun = exp(-uDepth / 320.0);
        float shallow = 1.0 - smoothstep(0.0, 220.0, uDepth);

        vec3 col = waterRamp(uDepth);

        // in-screen vertical gradient: sunlit ceiling up top, the water column
        // deepening toward the bottom of the frame. The extra falloff below is
        // what gives the view a sense of volume instead of a flat neon wash.
        float up = vUv.y;
        col *= 1.0 + up * 0.72 * sun;
        col *= mix(0.6, 1.06, smoothstep(0.0, 0.96, up));
        // bias the deeper (lower) water toward a richer blue-green, easing the
        // shallow turquoise off its neon cast
        col = mix(col * vec3(0.82, 0.95, 1.04), col, smoothstep(0.1, 0.9, up));

        // Refracted shafts originate where the visible sun meets the surface.
        // While the camera is above water they are hard-clipped to the water
        // side of the horizon, so light can never spill down from screen-top.
        // uAbove is a smooth dive crossfade driven by scroll (1 above → 0 under),
        // spread across the whole plunge so the surface never snaps to underwater.
        float above = uAbove;
        float belowSurface = 1.0 - smoothstep(uHorizon - 0.008, uHorizon + 0.008, vUv.y);
        float shaftMask = mix(1.0, belowSurface, step(-0.7, uCamH));
        vec2 sunSurface = vec2((uSun.x - 0.5) * uAspect, uHorizon);
        vec2 fromSun = p - sunSurface;
        float refractedX = fromSun.x + fromSun.y * 0.58;
        float beamNoise = fbm(vec2(refractedX * 2.2, fromSun.y * 0.7 - t * 0.035));
        float rays = sin(refractedX * 18.0 + beamNoise * 4.2 + t * 0.16) * 0.5 + 0.5;
        rays *= sin(refractedX * 7.0 - t * 0.11) * 0.5 + 0.5;
        rays = pow(rays, 3.2);
        float sunFan = exp(-abs(refractedX) * 1.15);
        rays *= smoothstep(0.02, 0.22, -fromSun.y) * shaftMask * sunFan;
        col += vec3(0.38, 0.72, 0.82) * rays * 0.72 * sun;

        // Caustic ceiling — the rippling underside of the surface. Two
        // decorrelated caustic layers stacked in the top of the frame (a broad
        // slow one plus a finer faster one) build the bright, textured sunlit
        // band that sits just below the waterline in real footage. Both fade out
        // with depth so only the shallow zones carry it.
        float ceilBand = smoothstep(0.4, 1.0, up);
        float ca1 = caustics(p * vec2(1.0, 1.6) + vec2(0.0, uDepth * 0.002), t * 0.45);
        float ca2 = caustics(p * vec2(2.4, 3.6) + vec2(t * 0.05, uDepth * 0.004), t * 0.7);
        float ceilLight = (ca1 * 0.7 + ca2 * 0.55) * ceilBand * shallow;
        col += vec3(0.5, 0.86, 0.92) * ceilLight * 0.42 * sun;
        col += vec3(0.66, 0.94, 1.0) * pow(ca2, 1.6) * ceilBand * shallow * 0.28 * sun;

        // slow large-scale water movement so the deep never reads as flat
        float wob = sin(p.x * 2.1 + t * 0.11) * sin(vUv.y * 3.3 - t * 0.07);
        col *= 1.0 + wob * 0.035;

        // gentle vignette
        float vig = smoothstep(1.45, 0.45, length(vec2(p.x, vUv.y - 0.5) * vec2(0.8, 1.5)));
        col *= mix(0.72, 1.0, vig);

        // Above-water scenery is clipped at the exact horizon. This prevents
        // the mountain plate leaking or smearing into the underwater view.
        float skyMask = smoothstep(uHorizon + 0.002, uHorizon + 0.025, vUv.y);

        // While above water the whole frame comes from one photograph: the
        // sky treatment above the horizon, the plate's own water below it.
        // A single blend keeps the underwater ramp from leaking through the
        // crossfade band at the horizon.
        //
        // The sequence already contains the intended water motion. Sampling
        // each plate without UV displacement keeps its waterline stable and
        // prevents the baked-in buoy from stretching sideways.
        vec3 plateStill = samplePlate(coverUv(vUv));
        // Only the opening plate receives the synthetic sky treatment. Keeping
        // it active later recolours the upper half of split-surface frames and
        // creates a visible horizontal boundary across the photograph.
        float openingTreatment = 1.0 - smoothstep(0.12, 0.15, uPlateProgress);
        vec3 surfacePlate = mix(plateStill, skyColor(p, t), skyMask * openingTreatment);
        // The final plates are fully underwater and no longer have a meaningful
        // sky/water split, so show them as complete frames during the handoff.
        float underwaterPlate = smoothstep(0.68, 0.86, uPlateProgress);
        vec3 sequencePlate = mix(surfacePlate, plateStill, underwaterPlate);
        col = mix(col, sequencePlate, uPlateAlpha);

        // dither to kill banding in the dark kilometres
        col += (hash(vUv * 913.0 + fract(t)) - 0.5) * 0.007;

        gl_FragColor = vec4(col, 1.0);
      }
    `
  })
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat)
  mesh.frustumCulled = false
  mesh.renderOrder = -100
  return mesh
}

// ---------------------------------------------------------------------------
// Marine snow — one Points cloud wrapped around the camera for the whole trip
// ---------------------------------------------------------------------------

function makeSnow(count, pixelRatio) {
  const geo = new THREE.BufferGeometry()
  const pos = new Float32Array(count * 3)
  const seed = new Float32Array(count)
  for (let i = 0; i < count; i++) {
    pos[i * 3] = (Math.random() - 0.5) * 46
    pos[i * 3 + 1] = -Math.random() * (WORLD_H + 60)
    pos[i * 3 + 2] = (Math.random() - 0.5) * 26 - 4
    seed[i] = Math.random()
  }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  geo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1))

  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uTime: { value: 0 },
      uCamY: { value: 0 },
      uDepth: { value: 0 },
      uPR: { value: pixelRatio }
    },
    vertexShader: /* glsl */ `
      attribute float aSeed;
      uniform float uTime, uCamY, uPR;
      varying float vSeed, vKill;
      void main() {
        vSeed = aSeed;
        vec3 p = position;
        // slow sink + lateral drift
        p.y -= uTime * (0.12 + aSeed * 0.25);
        p.x += sin(uTime * 0.18 + aSeed * 43.0) * 0.9;
        p.z += cos(uTime * 0.13 + aSeed * 17.0) * 0.6;
        // wrap the cloud vertically around the camera
        float span = 64.0;
        p.y = uCamY + (fract((p.y - uCamY) / span + 0.5) - 0.5) * span;
        // never above the waterline (y = 0)
        vKill = 1.0 - smoothstep(-1.2, -0.3, p.y);
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_PointSize = (1.4 + aSeed * 2.6) * uPR * (52.0 / max(1.0, -mv.z));
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      precision highp float;
      uniform float uDepth, uTime;
      varying float vSeed, vKill;
      ${SOFT_DISC_FRAG}
      void main() {
        float a = softDisc();
        // near the surface: bright suspended sediment; deep: sparse pale snow
        float deep = smoothstep(400.0, 2200.0, uDepth);
        vec3 col = mix(vec3(0.65, 0.9, 0.95), vec3(0.55, 0.62, 0.68), deep);
        float density = mix(0.5, 0.32, deep);
        // below ~2500 m a few motes twinkle faintly blue-green
        float bio = smoothstep(2500.0, 4000.0, uDepth) * step(0.86, vSeed);
        float tw = pow(sin(uTime * 1.4 + vSeed * 200.0) * 0.5 + 0.5, 4.0);
        col = mix(col, vec3(0.35, 0.95, 0.85), bio * tw);
        a *= density * (0.55 + 0.45 * sin(vSeed * 100.0)) + bio * tw * 0.5;
        gl_FragColor = vec4(col, a * vKill);
      }
    `
  })
  const pts = new THREE.Points(geo, mat)
  pts.frustumCulled = false
  return pts
}

// ---------------------------------------------------------------------------
// Rising micro-bubbles — surface zone only
// ---------------------------------------------------------------------------

function makeBubbles(count, pixelRatio) {
  const geo = new THREE.BufferGeometry()
  const pos = new Float32Array(count * 3)
  const seed = new Float32Array(count)
  for (let i = 0; i < count; i++) {
    pos[i * 3] = (Math.random() - 0.5) * 34
    pos[i * 3 + 1] = -Math.random() * 50
    pos[i * 3 + 2] = (Math.random() - 0.5) * 18 - 2
    seed[i] = Math.random()
  }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  geo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1))

  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uTime: { value: 0 },
      uDepth: { value: 0 },
      uPR: { value: pixelRatio }
    },
    vertexShader: /* glsl */ `
      attribute float aSeed;
      uniform float uTime, uPR;
      varying float vSeed;
      void main() {
        vSeed = aSeed;
        vec3 p = position;
        float speed = 1.2 + aSeed * 2.2;
        p.y = -50.0 + mod(p.y + 50.0 + uTime * speed, 49.0);
        p.x += sin(uTime * (0.8 + aSeed) + aSeed * 40.0) * 0.35;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_PointSize = (1.2 + aSeed * 2.2) * uPR * (46.0 / max(1.0, -mv.z));
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      precision highp float;
      uniform float uDepth;
      varying float vSeed;
      void main() {
        vec2 d = gl_PointCoord - 0.5;
        float r = length(d) * 2.0;
        // bright rim, dim centre: a tiny refractive shell
        float shell = smoothstep(1.0, 0.72, r) - smoothstep(0.68, 0.2, r) * 0.72;
        float glint = smoothstep(0.32, 0.0, length(gl_PointCoord - vec2(0.36, 0.62)));
        float fade = 1.0 - smoothstep(120.0, 380.0, uDepth);
        float a = (shell * 0.55 + glint * 0.5) * fade;
        gl_FragColor = vec4(vec3(0.75, 0.95, 1.0), a);
      }
    `
  })
  const pts = new THREE.Points(geo, mat)
  pts.frustumCulled = false
  return pts
}

// ---------------------------------------------------------------------------
// Volumetric light shafts — angled additive planes near the surface
// ---------------------------------------------------------------------------

function makeSunShafts() {
  const group = new THREE.Group()
  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    uniforms: {
      uTime: { value: 0 },
      uDepth: { value: 0 }
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      precision highp float;
      varying vec2 vUv;
      uniform float uTime, uDepth;
      void main() {
        float fade = exp(-uDepth / 260.0);
        float across = sin(vUv.x * 3.14159);
        float along = smoothstep(0.0, 0.25, vUv.y) * smoothstep(1.0, 0.55, vUv.y);
        float flicker = 0.75 + 0.25 * sin(uTime * 0.5 + vUv.x * 9.0);
        float a = pow(across, 2.2) * along * flicker * 0.16 * fade;
        gl_FragColor = vec4(vec3(0.65, 0.9, 0.95), a);
      }
    `
  })
  const geoms = []
  for (let i = 0; i < 5; i++) {
    const w = 1.6 + Math.random() * 2.4
    const g = new THREE.PlaneGeometry(w, 55)
    const m = new THREE.Mesh(g, mat)
    m.position.set(-1 + i * 2.2 + Math.random() * 1.2, -31, -6 - Math.random() * 5)
    // The plate's sun is high-right, so refraction travels down-left.
    m.rotation.z = -0.2 - Math.random() * 0.08
    m.rotation.y = (Math.random() - 0.5) * 0.6
    group.add(m)
    geoms.push(g)
  }
  return { group, mat }
}

// ---------------------------------------------------------------------------
// Ocean surface — layered swell; sun glitter above, luminous ceiling below
// ---------------------------------------------------------------------------

function makeOcean(sunDir, plateTextureA, plateTextureB) {
  // Extend far beyond the camera horizon. The old finite edge exposed a thin
  // strip of turquoise underwater background between the lake and the sky.
  const geo = new THREE.PlaneGeometry(900, 1400, 180, 200)
  geo.rotateX(-Math.PI / 2)
  geo.translate(0, 0, -650)
  const mat = new THREE.ShaderMaterial({
    transparent: true,
    side: THREE.DoubleSide,
    uniforms: {
      uTime: { value: 0 },
      uCamY: { value: 3 },
      uSunDir: { value: sunDir },
      uSurfaceAlpha: { value: 1 },
      uPlateMapA: { value: plateTextureA },
      uPlateMapB: { value: plateTextureB },
      uPlateBlend: { value: 0 },
      uPlateProgress: { value: 0 },
      uPlateMix: { value: 1 },
      uHorizon: { value: 0.35 },
      uSunX: { value: 0.69 }, // screen-space x of the sun's glitter column
      uAspect: { value: 1 },
      uPlateAspect: { value: DESCENT_PLATE_ASPECT },
      uResolution: { value: new THREE.Vector2(1, 1) }
    },
    vertexShader: /* glsl */ `
      uniform float uTime, uPlateProgress;
      varying vec3 vNormal, vWorld;
      varying float vWave;
      void main() {
        vec3 p = position;
        // Animate only the opening surface. The waves settle before later
        // split-surface plates, where a moving mesh creates a visible seam.
        // Four differently directed layers restore the broad, natural swell
        // of the earlier treatment instead of a simple two-wave wobble.
        float waveLife = 1.0 - smoothstep(0.10, 0.15, uPlateProgress);
        float a = p.x * 0.16 + p.z * 0.055 + uTime * 0.42;
        float b = p.x * 0.045 + p.z * 0.19 + uTime * 0.31;
        float c = p.x * 0.38 - p.z * 0.09 + uTime * 0.68;
        float d = p.x * 0.72 + p.z * 0.31 + uTime * 0.91;
        p.y = (sin(a) * 0.019 + sin(b) * 0.012
             + sin(c) * 0.007 + sin(d) * 0.003) * waveLife;
        float dx = (0.16 * cos(a) * 0.019 + 0.045 * cos(b) * 0.012
                  + 0.38 * cos(c) * 0.007 + 0.72 * cos(d) * 0.003) * waveLife;
        float dz = (0.055 * cos(a) * 0.019 + 0.19 * cos(b) * 0.012
                  - 0.09 * cos(c) * 0.007 + 0.31 * cos(d) * 0.003) * waveLife;
        vNormal = normalize(vec3(-dx, 1.0, -dz));
        vWave = p.y;
        vWorld = (modelMatrix * vec4(p, 1.0)).xyz;
        gl_Position = projectionMatrix * viewMatrix * vec4(vWorld, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      precision highp float;
      uniform float uTime, uCamY, uSurfaceAlpha;
      uniform float uPlateMix, uPlateBlend, uPlateProgress;
      uniform float uHorizon, uSunX, uAspect, uPlateAspect;
      uniform vec2 uResolution;
      uniform vec3 uSunDir;
      uniform sampler2D uPlateMapA, uPlateMapB;
      varying vec3 vNormal, vWorld;
      varying float vWave;

      vec2 coverUv(vec2 uv) {
        vec2 scale = vec2(1.0);
        if (uAspect > uPlateAspect) scale.y = uPlateAspect / uAspect;
        else scale.x = uAspect / uPlateAspect;
        return (uv - 0.5) * scale + 0.5;
      }

      vec3 samplePlate(vec2 uv) {
        return mix(
          texture2D(uPlateMapA, uv).rgb,
          texture2D(uPlateMapB, uv).rgb,
          uPlateBlend
        );
      }

      float ellipseMask(vec2 uv, vec2 center, vec2 radius) {
        float d = length((uv - center) / radius);
        return 1.0 - smoothstep(0.82, 1.0, d);
      }

      float capsuleMask(vec2 uv, vec2 a, vec2 b, float radius) {
        vec2 pa = uv - a;
        vec2 ba = b - a;
        float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
        return 1.0 - smoothstep(radius * 0.62, radius, length(pa - ba * h));
      }

      float subjectKeepMask(vec2 uv) {
        float travel = smoothstep(0.0, 0.58, uPlateProgress);
        vec2 boatCenter = vec2(0.5, mix(0.55, 0.76, travel));
        vec2 boatRadius = mix(vec2(0.105, 0.115), vec2(0.19, 0.16), travel);

        // Separate, feathered shapes keep the protected area tight: hull and
        // fisherman, rod, fishing line, and the foreground buoy. Masking them
        // independently avoids freezing a large obvious oval of surrounding
        // water while ensuring no part of the subject inherits the refraction.
        float boatAndPerson = ellipseMask(uv, boatCenter, boatRadius);
        vec2 rodBase = boatCenter + boatRadius * vec2(0.20, 0.20);
        vec2 rodTip = boatCenter + boatRadius * vec2(1.05, 0.88);
        float rod = capsuleMask(uv, rodBase, rodTip, mix(0.006, 0.010, travel));

        vec2 buoyCenter = vec2(mix(0.54, 0.56, travel), mix(0.205, 0.34, travel));
        vec2 buoyRadius = mix(vec2(0.026, 0.038), vec2(0.05, 0.065), travel);
        float buoy = ellipseMask(uv, buoyCenter, buoyRadius);
        float fishingLine = capsuleMask(
          uv,
          rodTip,
          buoyCenter + vec2(0.0, buoyRadius.y * 0.7),
          mix(0.0035, 0.006, travel)
        );

        float present = 1.0 - smoothstep(0.56, 0.70, uPlateProgress);
        return max(max(boatAndPerson, rod), max(fishingLine, buoy)) * present;
      }

      float hash21(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
      }
      float vnoise2(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(
          mix(hash21(i), hash21(i + vec2(1.0, 0.0)), u.x),
          mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), u.x),
          u.y
        );
      }

      void main() {
        vec3 V = normalize(cameraPosition - vWorld);

        // Fine ripples are evaluated per fragment rather than at the sparse
        // plane vertices. These microfacets are what break the reflection into
        // the glossy, irregular highlights seen on real open water.
        float warpA = sin(vWorld.x * 0.11 - vWorld.z * 0.075 + uTime * 0.16);
        float warpB = sin(vWorld.x * 0.065 + vWorld.z * 0.12 - uTime * 0.13);
        float p1 = vWorld.x * 0.72 + vWorld.z * 0.31 + warpA * 1.25 + uTime * 0.91;
        float p2 = vWorld.x * 1.27 - vWorld.z * 0.58 + warpB * 1.05 - uTime * 1.13;
        float p3 = vWorld.x * 0.43 + vWorld.z * 1.08 + (warpA - warpB) * 0.72 + uTime * 0.76;
        float p4 = vWorld.x * 2.08 + vWorld.z * 0.17 + warpB * 0.58 + uTime * 1.32;
        float p5 = vWorld.x * 0.24 - vWorld.z * 1.76 + warpA * 0.64 - uTime * 1.05;
        float p6 = vWorld.x * 4.55 + vWorld.z * 2.12 + warpB * 0.42 + uTime * 1.56;
        float p7 = vWorld.x * 1.68 - vWorld.z * 5.18 + warpA * 0.38 - uTime * 1.41;
        float microDx = cos(p1) * 0.07 + cos(p2) * 0.06 + cos(p3) * 0.035
                      + cos(p4) * 0.07 + cos(p5) * 0.025
                      + cos(p6) * 0.045 + cos(p7) * 0.035;
        float microDz = cos(p1) * 0.035 - cos(p2) * 0.065 + cos(p3) * 0.075
                      + cos(p4) * 0.012 - cos(p5) * 0.075
                      + cos(p6) * 0.04 - cos(p7) * 0.052;
        vec3 microNormal = normalize(vec3(-microDx, 1.0, -microDz));
        vec3 N = normalize(mix(normalize(vNormal), microNormal, 0.82));
        float ndv = max(dot(N, V), 0.0);

        if (gl_FrontFacing) {
          float fres = 0.02 + 0.98 * pow(1.0 - ndv, 5.0);
          float dist = length(vWorld - cameraPosition);
          vec3 deep = vec3(0.008, 0.07, 0.13);
          vec3 horizonSky = vec3(0.42, 0.58, 0.64);
          vec3 highSky = vec3(0.08, 0.28, 0.46);
          vec3 reflectedSky = mix(highSky, horizonSky, smoothstep(0.25, 0.92, N.y));
          vec3 col = mix(deep, reflectedSky, 0.24 + fres * 0.68);

          float rippleA = sin(vWorld.z * 0.42 + vWorld.x * 0.18 + uTime * 0.55);
          float rippleB = sin(vWorld.z * 0.73 - vWorld.x * 0.31 - uTime * 0.38);
          float ripple = rippleA * rippleB * 0.5 + 0.5;
          float crest = smoothstep(0.035, 0.14, vWave);
          float crossed = sin(p1) * sin(p4) * 0.5 + 0.5;
          float ridge = pow(crossed, 9.0);
          float fineCross = clamp(0.5 + sin(p6) * 0.25 + sin(p7) * 0.25, 0.0, 1.0);
          float fineRidge = pow(fineCross, 11.0);
          col *= 0.93 + fineRidge * 0.07;
          col += vec3(0.055, 0.105, 0.125)
               * (ripple * 0.12 + crest * 0.18 + ridge * 0.3 + fineRidge * 0.78);

          // Trace the reflected sun vector against each animated facet. Two
          // lobes produce the long warm path plus sharp broken sparkles.
          vec3 L = normalize(uSunDir);
          vec3 H = normalize(L + V);
          float sunHit = max(dot(N, H), 0.0);
          float breakup = sin(vWorld.x * 1.9 + uTime * 0.73)
                        * sin(vWorld.z * 1.35 - uTime * 0.49) * 0.5 + 0.5;
          float forward = max(1.0, cameraPosition.z - vWorld.z);
          float projectedX = (vWorld.x - cameraPosition.x) / forward;
          float sunPath = exp(-pow((projectedX - 0.39) / 0.064, 2.0));
          float brokenRows = pow(max(0.0, sin(vWorld.z * 4.25 + rippleA * 1.8 - uTime * 0.28)), 17.0);
          float broadSpec = sunPath * (0.045 + pow(sunHit, 18.0) * 0.82)
                          * (0.28 + breakup * 0.72);
          float tightSpec = sunPath * pow(sunHit, 54.0)
                          * smoothstep(0.48, 0.88, breakup)
                          * (0.22 + brokenRows * 1.35) * (0.48 + fineRidge * 0.9);
          col += vec3(1.0, 0.69, 0.34) * broadSpec * 1.12;
          col += vec3(1.0, 0.94, 0.73) * tightSpec * 1.22;

          float distanceHaze = smoothstep(45.0, 175.0, dist);
          col = mix(col, vec3(0.38, 0.5, 0.56), distanceHaze * 0.23);

          // ---- photographic water ------------------------------------------
          // The reference plate already contains the exact water we want below
          // the horizon. Sample it in screen space and refract the lookup
          // through the moving micro-ripples so the photo itself flows. The
          // procedural colour above remains as the fallback while the camera
          // plunges through the surface (uPlateMix fades with camera height).
          vec2 suv = gl_FragCoord.xy / uResolution;
          float shore = clamp((uHorizon - suv.y) / max(uHorizon, 0.001), 0.0, 1.0);
          float amp = shore * shore; // rigid at the horizon, supple up close
          // A coherent travelling current carries the photograph while the
          // smaller facets break it up. The previous revision leaned almost
          // entirely on micro-frequencies, which read as nervous shimmer rather
          // than the broad drift of water.
          vec2 flow = vec2(
            sin(suv.y * 13.0 + uTime * 0.34) + sin(suv.y * 27.0 - uTime * 0.19) * 0.45,
            cos(suv.x * 11.0 - uTime * 0.27) + sin(suv.x * 23.0 + uTime * 0.16) * 0.35
          );
          vec2 duv = flow * (0.0015 + 0.0105 * amp)
                   + vec2(microDx, microDz) * (0.0008 + 0.033 * amp);
          duv.y += vWave * 0.4 * amp;
          vec2 puv = suv + duv;
          puv.y = min(puv.y, uHorizon - 0.002);
          vec3 plate = samplePlate(coverUv(puv));
          vec3 plateStill = samplePlate(coverUv(suv));
          float keepStill = subjectKeepMask(suv);
          plate = mix(plate, plateStill, keepStill);

          // Gently animate the plate's existing sun glitter rather than
          // painting new speckles over the whole band. The glint mask keeps to
          // the bright warm reflection column under the sun (a horizontal gate
          // around uSunX plus a brightness gate), and two decorrelated
          // value-noise fields shimmer it — a product of plain sines would beat
          // into a regular moiré grid instead.
          float warmth = clamp(plate.r * 1.2 - plate.b, 0.0, 1.0);
          float lum = dot(plate, vec3(0.33));
          float sunCol = smoothstep(0.55, 0.16, abs(suv.x - uSunX));
          float glint = smoothstep(0.10, 0.40, warmth)
                      * smoothstep(0.20, 0.52, shore)
                      * smoothstep(0.42, 0.66, lum)
                      * sunCol;
          float s1 = vnoise2(suv * vec2(300.0, 190.0) + vec2(uTime * 0.6, -uTime * 0.4));
          float s2 = vnoise2(suv * vec2(210.0, 320.0) + vec2(-uTime * 0.5, uTime * 0.7));
          float tw = smoothstep(0.30, 0.9, s1 * s2) - 0.35;
          vec3 plateCol = plate * (1.0 + glint * tw * 0.55);
          // slow travelling shading keeps the open water alive up close
          plateCol *= 1.0 + (sin(p1) * 0.5 + sin(p3) * 0.5) * 0.05 * amp;
          plateCol = max(plateCol, 0.0);

          // Apply the mask again after glint and travelling-shade modulation.
          // This prevents the boat, person, rod, line, and buoy from brightness
          // pulsing even though their texture lookup is already stationary.
          plateCol = mix(plateCol, plateStill, keepStill);

          // Let the opening water breathe, then settle to the rigid plate before
          // the first frame change. Later plates must not warp or form seams.
          float openingMotion = 1.0 - smoothstep(0.10, 0.15, uPlateProgress);
          plateCol = mix(plateStill, plateCol, openingMotion);

          col = mix(col, plateCol, uPlateMix);

          // Do not draw protected subjects on the animated mesh at all. Even an
          // undistorted texture lookup still rides the displaced geometry and
          // makes baked-in objects bob. The transparent, feathered cutout lets
          // the rigid fullscreen plate underneath supply these pixels instead.
          float subjectCutout = keepStill * uPlateMix;
          gl_FragColor = vec4(col, uSurfaceAlpha * (1.0 - subjectCutout));
        } else {
          float pulse = sin(vWorld.x * 0.18 + uTime * 0.42)
                      * sin(vWorld.z * 0.15 - uTime * 0.31) * 0.5 + 0.5;
          float shaft = pow(max(0.0, 1.0 - length(vWorld.xz - vec2(19.0, -34.0)) * 0.009), 5.0);
          vec3 col = vec3(0.06, 0.34, 0.45) + vec3(0.12, 0.34, 0.39) * (pulse * 0.12 + shaft * 0.18);
          float fade = smoothstep(-9.0, -1.0, uCamY);
          gl_FragColor = vec4(col, fade * 0.72 * uSurfaceAlpha);
        }
      }
    `
  })
  const mesh = new THREE.Mesh(geo, mat)
  mesh.frustumCulled = false
  return { mesh, mat }
}

// ---------------------------------------------------------------------------
// Hook + fishing line — follows camera through the full descent
// ---------------------------------------------------------------------------

function makeHook() {
  const group = new THREE.Group()
  const metal = new THREE.MeshStandardMaterial({
    color: 0xc4d2d8,
    metalness: 0.9,
    roughness: 0.28
  })

  // J-bend
  const bend = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.04, 10, 26, Math.PI * 1.45), metal)
  bend.rotation.z = Math.PI * 0.77
  group.add(bend)
  // shank
  const shank = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.85, 8), metal)
  shank.position.set(0.26, 0.42, 0)
  group.add(shank)
  // eye
  const eye = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.025, 8, 14), metal)
  eye.position.set(0.26, 0.88, 0)
  group.add(eye)
  // barb
  const barb = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.16, 8), metal)
  barb.position.set(-0.24, 0.16, 0)
  barb.rotation.z = -0.3
  group.add(barb)
  // small sinker above the hook
  const sinker = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), metal)
  sinker.position.set(0.26, 1.15, 0)
  sinker.scale.y = 1.5
  group.add(sinker)

  // faint lure-light so the hook reads in the black kilometres
  const lamp = new THREE.PointLight(0xaee8ff, 4, 7, 2)
  lamp.position.set(0, 0.3, 0.6)
  group.add(lamp)

  // the line up to the boat / surface
  const LINE_PTS = 28
  const lineGeo = new THREE.BufferGeometry()
  lineGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(LINE_PTS * 3), 3))
  const line = new THREE.Line(
    lineGeo,
    new THREE.LineBasicMaterial({ color: 0xd5e5ea, transparent: true, opacity: 0.42 })
  )
  line.frustumCulled = false

  return { group, line, LINE_PTS }
}

// ---------------------------------------------------------------------------
// Chess knight — extruded 2D silhouette, glossy, catching the last light
// (placeholder until the real chess-set knight model loads)
// ---------------------------------------------------------------------------

const KNIGHT_OUTLINE = [
  [0.26, 0.02], [0.78, 0.02], [0.78, 0.1], [0.7, 0.14], [0.7, 0.2],
  [0.76, 0.24], [0.72, 0.3], [0.74, 0.45], [0.7, 0.6], [0.62, 0.74],
  [0.52, 0.85], [0.46, 0.95], [0.415, 0.87], [0.35, 0.965], [0.3, 0.86],
  [0.22, 0.8], [0.1, 0.7], [0.05, 0.62], [0.08, 0.565], [0.18, 0.55],
  [0.22, 0.5], [0.315, 0.455], [0.34, 0.38], [0.4, 0.28], [0.405, 0.2],
  [0.34, 0.14], [0.34, 0.1], [0.26, 0.1]
]

function makeKnight() {
  const shape = new THREE.Shape()
  KNIGHT_OUTLINE.forEach(([x, y], i) => {
    const px = (x - 0.42) * 3.4
    const py = (y - 0.5) * 3.4
    if (i === 0) shape.moveTo(px, py)
    else shape.lineTo(px, py)
  })
  shape.closePath()
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.42,
    bevelEnabled: true,
    bevelThickness: 0.07,
    bevelSize: 0.06,
    bevelSegments: 3,
    curveSegments: 6
  })
  geo.center()
  const mat = new THREE.MeshPhysicalMaterial({
    color: 0x27384c,
    roughness: 0.22,
    metalness: 0.35,
    clearcoat: 1.0,
    clearcoatRoughness: 0.12
  })
  const mesh = new THREE.Mesh(geo, mat)
  const pivot = new THREE.Group()
  pivot.add(mesh)

  // cool rim + fill so the gloss reads even as sunlight dies
  const rim = new THREE.PointLight(0x9fd8e8, 26, 18, 2)
  rim.position.set(3.0, 2.2, 3.6)
  pivot.add(rim)
  const fill = new THREE.PointLight(0x6fb9d8, 10, 16, 2)
  fill.position.set(-1.2, 0.4, 4.4)
  pivot.add(fill)
  const back = new THREE.PointLight(0x2a70a8, 12, 14, 2)
  back.position.set(-2.6, -0.8, -2.6)
  pivot.add(back)
  return { pivot, mesh }
}

// ---------------------------------------------------------------------------
// Drone project symbol — a readable fallback immediately, then the same GLB
// used by the city once it has loaded. It drifts as if neutrally buoyant.
// ---------------------------------------------------------------------------

function makeDrone() {
  const group = new THREE.Group()
  const modelHolder = new THREE.Group()
  const rotors = []
  group.add(modelHolder)

  const bodyMat = new THREE.MeshPhysicalMaterial({
    color: 0x435665,
    roughness: 0.3,
    metalness: 0.55,
    clearcoat: 0.7
  })
  const rotorMat = new THREE.MeshStandardMaterial({
    color: 0x18232b,
    roughness: 0.48,
    metalness: 0.45
  })

  // Procedural silhouette prevents an empty project zone while the GLB loads.
  const fallback = new THREE.Group()
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.48, 14, 10), bodyMat)
  body.scale.set(1.25, 0.48, 0.9)
  fallback.add(body)
  for (const [x, z] of [[-0.82, -0.64], [0.82, -0.64], [-0.82, 0.64], [0.82, 0.64]]) {
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 1.0, 7), bodyMat)
    arm.position.set(x * 0.5, 0, z * 0.5)
    arm.rotation.z = Math.PI / 2
    arm.rotation.y = Math.atan2(z, x)
    fallback.add(arm)

    const rotor = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.025, 18), rotorMat)
    rotor.position.set(x, 0.08, z)
    fallback.add(rotor)
    rotors.push(rotor)
  }
  modelHolder.add(fallback)

  const lamp = new THREE.PointLight(0x7de5d1, 18, 12, 2)
  lamp.position.set(0, 0.2, 1.6)
  group.add(lamp)
  const navLight = new THREE.Mesh(
    new THREE.SphereGeometry(0.09, 9, 7),
    new THREE.MeshBasicMaterial({ color: 0x79ffe2 })
  )
  navLight.position.set(0, 0.08, 0.75)
  group.add(navLight)

  new GLTFLoader().load(
    droneModelUrl,
    (gltf) => {
      const model = gltf.scene.clone(true)
      const box = new THREE.Box3().setFromObject(model)
      const size = box.getSize(new THREE.Vector3())
      const center = box.getCenter(new THREE.Vector3())
      model.position.sub(center)
      model.scale.setScalar(3.2 / Math.max(size.x, size.y, size.z, 1e-6))
      model.traverse((obj) => {
        if (!obj.isMesh) return
        obj.material = obj.material.clone()
        obj.material.roughness = Math.min(obj.material.roughness ?? 0.7, 0.45)
        obj.material.metalness = Math.max(obj.material.metalness ?? 0, 0.2)
        if (/Rotor_/i.test(obj.name)) rotors.push(obj)
      })
      modelHolder.remove(fallback)
      modelHolder.add(model)
    },
    undefined,
    () => {} // keep the procedural drone if the optional model cannot load
  )

  return { group, rotors }
}

// ---------------------------------------------------------------------------
// Fish school ↔ line chart — twilight zone
// ---------------------------------------------------------------------------

const CHART_PATH = [
  [-3.1, -1.3], [-1.9, -0.55], [-1.0, -0.95], [0.1, 0.05],
  [1.1, -0.25], [2.1, 0.85], [3.1, 1.55]
]

function makeFish(count, pixelRatio) {
  // distribute chart targets evenly along the polyline
  const segs = []
  let total = 0
  for (let i = 1; i < CHART_PATH.length; i++) {
    const dx = CHART_PATH[i][0] - CHART_PATH[i - 1][0]
    const dy = CHART_PATH[i][1] - CHART_PATH[i - 1][1]
    const len = Math.hypot(dx, dy)
    segs.push(len)
    total += len
  }
  const geo = new THREE.BufferGeometry()
  const swim = new Float32Array(count * 3)
  const chart = new Float32Array(count * 3)
  const seed = new Float32Array(count)
  for (let i = 0; i < count; i++) {
    swim[i * 3] = (Math.random() - 0.5) * 7
    swim[i * 3 + 1] = (Math.random() - 0.5) * 4
    swim[i * 3 + 2] = (Math.random() - 0.5) * 4
    let d = (i / count) * total
    let si = 0
    while (si < segs.length - 1 && d > segs[si]) { d -= segs[si]; si++ }
    const t = Math.min(1, d / segs[si])
    chart[i * 3] = CHART_PATH[si][0] + (CHART_PATH[si + 1][0] - CHART_PATH[si][0]) * t + (Math.random() - 0.5) * 0.1
    chart[i * 3 + 1] = CHART_PATH[si][1] + (CHART_PATH[si + 1][1] - CHART_PATH[si][1]) * t + (Math.random() - 0.5) * 0.1
    chart[i * 3 + 2] = (Math.random() - 0.5) * 0.25
    seed[i] = Math.random()
  }
  geo.setAttribute('position', new THREE.BufferAttribute(swim, 3))
  geo.setAttribute('aChart', new THREE.BufferAttribute(chart, 3))
  geo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1))

  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uTime: { value: 0 },
      uForm: { value: 0 },
      uPR: { value: pixelRatio }
    },
    vertexShader: /* glsl */ `
      attribute vec3 aChart;
      attribute float aSeed;
      uniform float uTime, uForm, uPR;
      varying float vSeed, vForm;
      void main() {
        float t = uTime;
        // coherent schooling motion: shared slow orbit + individual wiggle
        vec3 school = vec3(sin(t * 0.22) * 2.2, cos(t * 0.17) * 0.9, sin(t * 0.13) * 1.1);
        vec3 wiggle = vec3(
          sin(t * 1.4 + aSeed * 41.0) * 0.55 + sin(t * 0.5 + aSeed * 7.0) * 0.9,
          cos(t * 1.1 + aSeed * 29.0) * 0.4,
          sin(t * 0.9 + aSeed * 13.0) * 0.5
        );
        vec3 swimPos = position + school + wiggle;
        vec3 chartPos = aChart + vec3(0.0, sin(t * 2.2 + aSeed * 90.0) * 0.03, 0.0);
        // ripple into formation, staggered per fish
        float f = smoothstep(0.0, 1.0, clamp(uForm * 1.5 - aSeed * 0.5, 0.0, 1.0));
        vForm = f;
        vSeed = aSeed;
        vec3 p = mix(swimPos, chartPos, f);
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_PointSize = (1.8 + aSeed * 1.6 + f * 1.2) * uPR * (52.0 / max(1.0, -mv.z));
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      precision highp float;
      uniform float uTime;
      varying float vSeed, vForm;
      ${SOFT_DISC_FRAG}
      void main() {
        float a = softDisc();
        float pulse = 0.7 + 0.3 * sin(uTime * 2.0 + vSeed * 50.0);
        vec3 col = mix(vec3(0.25, 0.85, 0.75), vec3(0.45, 1.0, 0.85), vForm);
        gl_FragColor = vec4(col, a * (0.5 + vForm * 0.5) * pulse);
      }
    `
  })
  const pts = new THREE.Points(geo, mat)
  pts.frustumCulled = false
  return { points: pts, mat }
}

// ---------------------------------------------------------------------------
// Bioluminescent signal pairs — midnight zone
// ---------------------------------------------------------------------------

function makePulses(pixelRatio) {
  const pairs = [
    [[-4.2, 1.6, -2], [-1.4, 2.6, -3]],
    [[-3.4, -2.2, -1], [-0.4, -1.4, -2.5]],
    [[1.2, 2.2, -2], [4.0, 1.2, -1]],
    [[0.8, -2.6, -1.5], [3.6, -1.8, -3]],
    [[-1.8, 0.3, -4], [1.6, 0.9, -4.5]]
  ]
  const count = pairs.length * 3 // A glow, B glow, traveller
  const geo = new THREE.BufferGeometry()
  const pos = new Float32Array(count * 3)
  const aStart = new Float32Array(count * 3)
  const aEnd = new Float32Array(count * 3)
  const role = new Float32Array(count)
  const seed = new Float32Array(count)
  pairs.forEach((pair, pi) => {
    for (let r = 0; r < 3; r++) {
      const i = pi * 3 + r
      aStart.set(pair[0], i * 3)
      aEnd.set(pair[1], i * 3)
      pos.set(pair[0], i * 3)
      role[i] = r
      seed[i] = pi / pairs.length
    }
  })
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  geo.setAttribute('aStart', new THREE.BufferAttribute(aStart, 3))
  geo.setAttribute('aEnd', new THREE.BufferAttribute(aEnd, 3))
  geo.setAttribute('aRole', new THREE.BufferAttribute(role, 1))
  geo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1))

  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uTime: { value: 0 },
      uPR: { value: pixelRatio }
    },
    vertexShader: /* glsl */ `
      attribute vec3 aStart, aEnd;
      attribute float aRole, aSeed;
      uniform float uTime, uPR;
      varying float vBright, vRole;
      void main() {
        float phase = fract(uTime * 0.10 + aSeed);
        vec3 p = aStart;
        float bright = 0.0;
        if (aRole < 0.5) {
          // caller: pulse, then afterglow while the signal travels
          bright = exp(-pow((phase - 0.10) / 0.045, 2.0)) + exp(-pow((phase - 0.22) / 0.10, 2.0)) * 0.35;
        } else if (aRole < 1.5) {
          // responder: answers after the signal arrives
          p = aEnd;
          bright = exp(-pow((phase - 0.62) / 0.05, 2.0)) + exp(-pow((phase - 0.74) / 0.10, 2.0)) * 0.3;
        } else {
          // the signal itself, drifting between the two
          float tt = smoothstep(0.16, 0.58, phase);
          p = mix(aStart, aEnd, tt);
          p.y += sin(tt * 6.28318 + aSeed * 9.0) * 0.25;
          bright = smoothstep(0.14, 0.2, phase) * (1.0 - smoothstep(0.56, 0.62, phase));
        }
        vBright = bright;
        vRole = aRole;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        float base = aRole > 1.5 ? 5.0 : 16.0;
        gl_PointSize = base * (0.35 + bright) * uPR * (52.0 / max(1.0, -mv.z));
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      precision highp float;
      varying float vBright, vRole;
      void main() {
        vec2 d = gl_PointCoord - 0.5;
        float r = length(d) * 2.0;
        float core = smoothstep(0.5, 0.0, r);
        float halo = smoothstep(1.0, 0.1, r);
        vec3 cCall = vec3(0.30, 0.95, 0.90);
        vec3 cAns  = vec3(0.55, 0.75, 1.00);
        vec3 col = vRole < 0.5 ? cCall : (vRole < 1.5 ? cAns : vec3(0.7, 1.0, 0.95));
        float a = (core * 0.9 + halo * 0.35) * (0.04 + vBright);
        gl_FragColor = vec4(col, a);
      }
    `
  })
  const pts = new THREE.Points(geo, mat)
  pts.frustumCulled = false
  return { points: pts, mat }
}

// ---------------------------------------------------------------------------
// Jellyfish — translucent fresnel bells with shader-swayed tentacle trails
// ---------------------------------------------------------------------------

function makeJelly(seedVal) {
  const group = new THREE.Group()
  const uniforms = {
    uTime: { value: 0 },
    uSeed: { value: seedVal }
  }
  const bellGeo = new THREE.SphereGeometry(1, 22, 14, 0, TAU, 0, Math.PI * 0.58)
  const bellMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    uniforms,
    vertexShader: /* glsl */ `
      uniform float uTime, uSeed;
      varying vec3 vN, vV;
      varying float vRim;
      void main() {
        float pulse = sin(uTime * 1.25 + uSeed * 10.0);
        vec3 p = position;
        // bell contraction: squeeze xz, stretch y, flare the rim
        float rim = smoothstep(0.3, 1.0, 1.0 - p.y);
        p.xz *= 1.0 + pulse * 0.10 + rim * pulse * 0.06;
        p.y *= 1.0 - pulse * 0.08;
        vRim = rim;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        vN = normalize(normalMatrix * normal);
        vV = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      precision highp float;
      uniform float uTime, uSeed;
      varying vec3 vN, vV;
      varying float vRim;
      void main() {
        float fres = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 2.4);
        vec3 body = vec3(0.10, 0.30, 0.42);
        vec3 edge = vec3(0.55, 0.85, 1.0);
        vec3 glowc = vec3(0.85, 0.45, 0.75);
        vec3 col = mix(body, edge, fres) + glowc * vRim * 0.22 * (0.6 + 0.4 * sin(uTime * 1.25 + uSeed * 10.0));
        float a = fres * 0.55 + 0.05 + vRim * 0.06;
        gl_FragColor = vec4(col, a);
      }
    `
  })
  const bell = new THREE.Mesh(bellGeo, bellMat)
  group.add(bell)

  // inner organ glow
  const coreGeo = new THREE.SphereGeometry(0.34, 10, 8)
  const coreMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms,
    vertexShader: /* glsl */ `
      uniform float uTime, uSeed;
      varying float vF;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position * (1.0 + 0.1 * sin(uTime * 1.25 + uSeed * 10.0)), 1.0);
        vF = abs(dot(normalize(normalMatrix * normal), normalize(-mv.xyz)));
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      precision highp float;
      varying float vF;
      void main() {
        gl_FragColor = vec4(vec3(0.9, 0.55, 0.8), pow(vF, 2.0) * 0.5);
      }
    `
  })
  const core = new THREE.Mesh(coreGeo, coreMat)
  core.position.y = 0.15
  group.add(core)

  // tentacles: line segments displaced entirely in the vertex shader
  const T_COUNT = 7
  const T_SEGS = 13
  const verts = []
  const aT = []
  const aAng = []
  for (let ti = 0; ti < T_COUNT; ti++) {
    const ang = (ti / T_COUNT) * TAU + seedVal
    const r0 = 0.55
    for (let s = 0; s < T_SEGS; s++) {
      for (const ss of [s, s + 1]) {
        const t = ss / T_SEGS
        verts.push(Math.cos(ang) * r0 * (1 - t * 0.25), -0.2 - t * 2.6, Math.sin(ang) * r0 * (1 - t * 0.25))
        aT.push(t)
        aAng.push(ang)
      }
    }
  }
  const tGeo = new THREE.BufferGeometry()
  tGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(verts), 3))
  tGeo.setAttribute('aT', new THREE.BufferAttribute(new Float32Array(aT), 1))
  tGeo.setAttribute('aAng', new THREE.BufferAttribute(new Float32Array(aAng), 1))
  const tMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms,
    vertexShader: /* glsl */ `
      attribute float aT, aAng;
      uniform float uTime, uSeed;
      varying float vT;
      void main() {
        vT = aT;
        vec3 p = position;
        // trailing sway: waves travel down the tentacle
        float sway = sin(uTime * 1.1 - aT * 5.0 + uSeed * 8.0 + aAng) * 0.3 * aT;
        float drift = sin(uTime * 0.5 + uSeed * 4.0 + aAng * 2.0) * 0.22 * aT;
        p.x += sway + drift;
        p.z += cos(uTime * 0.9 - aT * 4.0 + aAng) * 0.24 * aT;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      precision highp float;
      varying float vT;
      void main() {
        float a = (1.0 - vT) * 0.32 + 0.02;
        gl_FragColor = vec4(vec3(0.5, 0.8, 0.95), a);
      }
    `
  })
  const tentacles = new THREE.LineSegments(tGeo, tMat)
  group.add(tentacles)
  return { group, uniforms }
}

// ---------------------------------------------------------------------------
// Hadal searchlight — additive cone sweeping the dark
// ---------------------------------------------------------------------------

function makeSearchlight() {
  const group = new THREE.Group()
  const uniforms = { uTime: { value: 0 } }
  const geo = new THREE.CylinderGeometry(0.07, 4.6, 22, 24, 6, true)
  geo.translate(0, -11, 0) // apex at group origin
  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    uniforms,
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      varying vec3 vN, vV;
      void main() {
        vUv = uv;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vN = normalize(normalMatrix * normal);
        vV = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      precision highp float;
      varying vec2 vUv;
      varying vec3 vN, vV;
      uniform float uTime;
      void main() {
        // uv.y = 1 at apex; fade along the beam and soften silhouette edges
        float along = pow(vUv.y, 1.6);
        float edge = pow(abs(dot(normalize(vN), normalize(vV))), 1.2);
        float streaks = 0.85 + 0.15 * sin(vUv.y * 46.0 - uTime * 1.6 + vUv.x * 12.0);
        float a = along * edge * streaks * 0.30;
        gl_FragColor = vec4(vec3(0.75, 0.92, 1.0), a);
      }
    `
  })
  const cone = new THREE.Mesh(geo, mat)
  group.add(cone)

  // the probe's lamp itself: a hard little glow at the apex
  const lampGeo = new THREE.SphereGeometry(0.16, 10, 8)
  const lampMat = new THREE.MeshBasicMaterial({
    color: 0xd8f2ff,
    transparent: true,
    opacity: 0.9,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  })
  group.add(new THREE.Mesh(lampGeo, lampMat))
  return { group, uniforms }
}

// ---------------------------------------------------------------------------
// Seafloor specks — stars underwater
// ---------------------------------------------------------------------------

function makeFloorSpecks(count, pixelRatio) {
  const geo = new THREE.BufferGeometry()
  const pos = new Float32Array(count * 3)
  const seed = new Float32Array(count)
  for (let i = 0; i < count; i++) {
    pos[i * 3] = (Math.random() - 0.5) * 70
    pos[i * 3 + 1] = -6 - Math.random() * 7
    pos[i * 3 + 2] = -2 - Math.random() * 26
    seed[i] = Math.random()
  }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  geo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1))
  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uTime: { value: 0 },
      uPR: { value: pixelRatio }
    },
    vertexShader: /* glsl */ `
      attribute float aSeed;
      uniform float uTime, uPR;
      varying float vSeed;
      void main() {
        vSeed = aSeed;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = (1.2 + aSeed * 2.4) * uPR * (52.0 / max(1.0, -mv.z));
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      precision highp float;
      uniform float uTime;
      varying float vSeed;
      ${SOFT_DISC_FRAG}
      void main() {
        float a = softDisc();
        float tw = pow(sin(uTime * 0.7 + vSeed * 210.0) * 0.5 + 0.5, 3.0);
        vec3 col = mix(vec3(0.35, 0.85, 0.8), vec3(0.9, 0.75, 0.5), step(0.8, vSeed));
        gl_FragColor = vec4(col, a * (0.12 + tw * 0.6));
      }
    `
  })
  const pts = new THREE.Points(geo, mat)
  pts.frustumCulled = false
  return pts
}

// ---------------------------------------------------------------------------
// Main factory
// ---------------------------------------------------------------------------

export function createDescentScene(canvas, opts = {}) {
  const isMobile = !!opts.mobile
  const onDepth = opts.onDepth || (() => {})

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: !isMobile,
    alpha: false,
    powerPreference: 'high-performance'
  })
  const maxPR = isMobile ? 1.5 : 2
  const pr = Math.min(window.devicePixelRatio || 1, maxPR)
  renderer.setPixelRatio(pr)
  renderer.toneMapping = THREE.ACESFilmicToneMapping

  const scene = new THREE.Scene()
  const fogColor = new THREE.Color()
  scene.fog = new THREE.FogExp2(0x03182a, 0.018)

  const camera = new THREE.PerspectiveCamera(58, 1, 0.1, 200)
  camera.position.set(0, 0, 10)

  // --- lighting ---------------------------------------------------------
  const sun = new THREE.DirectionalLight(0xbfe8ef, 2.4)
  sun.position.set(4, 9, 5)
  scene.add(sun)
  const hemi = new THREE.HemisphereLight(0x9fd8e0, 0x03253d, 0.8)
  scene.add(hemi)
  // Direction from a water facet toward the sun visible high-right in the
  // photographic plate. Its negative Z keeps the reflection in front of the
  // camera instead of producing an unrelated highlight behind the viewer.
  const sunDir = new THREE.Vector3(0.28, 0.62, -0.73).normalize()
  const SUN_WARM = new THREE.Color(1.0, 0.94, 0.8)
  const SUN_COOL = new THREE.Color(0xbfe8ef)
  const HAZE = new THREE.Color(0.62, 0.8, 0.86)

  // --- global elements ---------------------------------------------------
  // The numbered plates already contain the boat and fisherman. Adjacent
  // textures are crossfaded as the camera approaches and breaks the surface.
  const textureLoader = new THREE.TextureLoader()
  const descentTextures = descentPlateUrls.map((url) => {
    const texture = textureLoader.load(url)
    // NoColorSpace: these custom shaders write gl_FragColor raw, so the plates
    // must pass through undecoded or the whole frame displays too dark.
    texture.colorSpace = THREE.NoColorSpace
    texture.minFilter = THREE.LinearFilter
    texture.magFilter = THREE.LinearFilter
    return texture
  })

  // Lit-cloud plate, screened over the sky and shifted only with the waterline.
  const cloudTexture = textureLoader.load(cloudLayerUrl)
  cloudTexture.colorSpace = THREE.NoColorSpace
  cloudTexture.minFilter = THREE.LinearFilter
  cloudTexture.magFilter = THREE.LinearFilter
  cloudTexture.wrapS = THREE.ClampToEdgeWrapping
  cloudTexture.wrapT = THREE.ClampToEdgeWrapping

  const background = makeBackground(descentTextures[0], descentTextures[0], cloudTexture)
  scene.add(background)

  const snow = makeSnow(isMobile ? 550 : 1500, pr)
  scene.add(snow)

  // hook + line travel with the reader for the whole descent
  const hook = makeHook()
  hook.group.scale.setScalar(isMobile ? 0.8 : 1)
  scene.add(hook.group)
  scene.add(hook.line)

  const objX = isMobile ? 0 : -3.3
  const objScale = isMobile ? 0.72 : 1

  // --- zone groups (positioned once anchors are known) -------------------
  const zones = {}
  function zoneGroup(name) {
    const g = new THREE.Group()
    zones[name] = g
    scene.add(g)
    return g
  }

  // Surface
  const surfaceG = zoneGroup('surface')
  const bubbles = makeBubbles(isMobile ? 90 : 220, pr)
  surfaceG.add(bubbles)
  const shafts = makeSunShafts()
  surfaceG.add(shafts.group)
  const ocean = makeOcean(sunDir, descentTextures[0], descentTextures[0])
  surfaceG.add(ocean.mesh)

  let activePlateA = -1
  let activePlateB = -1
  function setDescentPlate(progress) {
    const frame = THREE.MathUtils.clamp(progress, 0, 1) * (descentTextures.length - 1)
    const indexA = Math.round(frame)
    const indexB = indexA
    const blend = 0

    if (indexA !== activePlateA || indexB !== activePlateB) {
      activePlateA = indexA
      activePlateB = indexB
      background.material.uniforms.uPlateMapA.value = descentTextures[indexA]
      background.material.uniforms.uPlateMapB.value = descentTextures[indexB]
      ocean.mat.uniforms.uPlateMapA.value = descentTextures[indexA]
      ocean.mat.uniforms.uPlateMapB.value = descentTextures[indexB]
    }

    background.material.uniforms.uPlateBlend.value = blend
    background.material.uniforms.uPlateProgress.value = progress
    ocean.mat.uniforms.uPlateBlend.value = blend
    ocean.mat.uniforms.uPlateProgress.value = progress
  }
  setDescentPlate(0)

  // Chess
  const chessG = zoneGroup('chess')
  const knight = makeKnight()
  knight.pivot.position.set(objX, isMobile ? 3.4 : 0, isMobile ? -3 : 0)
  knight.pivot.scale.setScalar(objScale)
  chessG.add(knight.pivot)

  // swap in the real chess-set knight once it loads (keeps silhouette fallback)
  new GLTFLoader().load(
    chessModelUrl,
    (gltf) => {
      const tpl = gltf.scene.getObjectByName('Knight_White_0')
      if (!tpl) return
      const piece = tpl.clone(true)
      piece.position.set(0, 0, 0)
      piece.rotation.set(0, 0, 0)
      piece.scale.set(1, 1, 1)
      piece.rotation.x = -Math.PI / 2 // pieces lie flat in the GLB
      const holder = new THREE.Group()
      holder.add(piece)
      const box = new THREE.Box3().setFromObject(holder)
      const size = box.getSize(new THREE.Vector3())
      const center = box.getCenter(new THREE.Vector3())
      piece.position.sub(center)
      holder.scale.setScalar(3.6 / Math.max(size.y, 1e-6))
      knight.pivot.remove(knight.mesh)
      knight.mesh.geometry.dispose()
      knight.pivot.add(holder)
    },
    undefined,
    () => {} // on error keep the extruded silhouette
  )

  // Twilight fish
  const fishG = zoneGroup('wealth')
  const fish = makeFish(isMobile ? 130 : 230, pr)
  fish.points.position.set(isMobile ? 0 : -1.2, 0, -1)
  fish.points.scale.setScalar(objScale)
  fishG.add(fish.points)

  // Midnight pulses
  const pulseG = zoneGroup('predictor')
  const pulses = makePulses(pr)
  pulseG.add(pulses.points)

  // Abyssal jellies
  const jellyG = zoneGroup('abyssal')
  const jellies = []
  const jellySpots = isMobile
    ? [[-1.6, 2.5, -5], [2.0, -1.5, -6]]
    : [[-5.2, 1.8, -4], [0.5, -2.4, -7], [4.8, 2.6, -6]]
  jellySpots.forEach((spot, i) => {
    const j = makeJelly(i * 2.13 + 0.7)
    j.group.position.set(spot[0], spot[1], spot[2])
    j.group.scale.setScalar(0.8 + i * 0.25)
    j.base = { x: spot[0], y: spot[1] }
    jellyG.add(j.group)
    jellies.push(j)
  })

  // Hadal searchlight
  const hadalG = zoneGroup('hadal')
  const light = makeSearchlight()
  light.group.position.set(0, 9, -6)
  hadalG.add(light.group)
  const drone = makeDrone()
  drone.group.position.set(objX, isMobile ? 3.5 : 0.2, -2.5)
  drone.group.scale.setScalar(isMobile ? 0.72 : 1)
  hadalG.add(drone.group)

  // Floor
  const floorG = zoneGroup('floor')
  floorG.add(makeFloorSpecks(isMobile ? 90 : 200, pr))

  // --- anchors: scroll fraction + metres per zone -------------------------
  let anchors = [
    { frac: 0, depth: 0 },
    { frac: 1, depth: 10000 }
  ]
  function setAnchors(list) {
    anchors = [{ frac: 0, depth: 0 }, ...list, { frac: 1, depth: 10000 }]
      .sort((a, b) => a.frac - b.frac)
    for (const a of list) {
      if (zones[a.name]) zones[a.name].position.y = -a.frac * WORLD_H
    }
  }
  function depthAt(p) {
    for (let i = 1; i < anchors.length; i++) {
      if (p <= anchors[i].frac || i === anchors.length - 1) {
        const a = anchors[i - 1]
        const b = anchors[i]
        const t = b.frac === a.frac ? 0 : (p - a.frac) / (b.frac - a.frac)
        return a.depth + (b.depth - a.depth) * Math.max(0, Math.min(1, t))
      }
    }
    return 0
  }

  // --- catch targets: drag the hook over these and something bites --------
  const pulseTargetA = new THREE.Object3D()
  pulseTargetA.position.set(-2.4, 0, -2)
  pulseG.add(pulseTargetA)
  const pulseTargetB = new THREE.Object3D()
  pulseTargetB.position.set(2.6, 0, -2)
  pulseG.add(pulseTargetB)
  const catchables = [
    { obj: knight.pivot, zone: chessG },
    { obj: fish.points, zone: fishG },
    { obj: pulseTargetA, zone: pulseG },
    { obj: pulseTargetB, zone: pulseG },
    ...jellies.map((j) => ({ obj: j.group, zone: jellyG })),
    { obj: drone.group, zone: hadalG }
  ].map((c) => ({ ...c, hovered: false, cooldown: 0 }))

  // --- pointer steering of the hook ---------------------------------------
  const pointer = { x: 0, y: 0 } // NDC
  function onPointerMove(e) {
    pointer.x = (e.clientX / window.innerWidth) * 2 - 1
    pointer.y = -((e.clientY / window.innerHeight) * 2 - 1)
  }
  window.addEventListener('pointermove', onPointerMove, { passive: true })

  // --- per-frame state -----------------------------------------------------
  let targetP = 0
  let curP = 0
  let fishForm = 0
  let curFishForm = 0
  let running = false
  let rafId = 0
  let lastDepthReported = -1
  let yankT = 10 // seconds since something last bit the hook
  const hookPos = new THREE.Vector3(0, 2, 2)
  const _v = new THREE.Vector3()
  const clock = new THREE.Clock()
  const knightBaseY = isMobile ? 3.4 : 0
  const PITCH0 = Math.atan(0.3 * Math.tan((58 * Math.PI) / 360)) // horizon at 35% up
  const TANHF = Math.tan((58 * Math.PI) / 360)

  function setProgress(p) { targetP = p }
  function setFishForm(v) { fishForm = v }

  function frame() {
    rafId = requestAnimationFrame(frame)
    const dt = Math.min(clock.getDelta(), 0.05)
    const t = clock.elapsedTime

    curP += (targetP - curP) * Math.min(1, dt * 9)
    curFishForm += (fishForm - curFishForm) * Math.min(1, dt * 5)

    const depth = depthAt(curP)

    // camera: rides the swell with the boat, then leans toward the surface and
    // plunges through. The dive plays in two beats so the surface crossfade is
    // spread across the whole plunge instead of snapping in a single frame.
    let camY
    let pitch
    let above
    let plateProgress = 1
    let plateAlpha = 0
    if (curP < SUB_P) {
      const u = Math.min(1, curP / SUB_P) // 0..1 across the plunge
      plateProgress = Math.min(1, u / 0.88)
      plateAlpha = 1 - THREE.MathUtils.smoothstep(u, 0.88, 1.0)
      const ue = u * u * (3 - 2 * u) // eased descent
      camY = 2.6 + (-SUB_P * WORLD_H - 2.6) * ue
      pitch = PITCH0 * (1 - ue)
      // Crossfade the final plate to the underwater column as we break through.
      const submerge = THREE.MathUtils.smoothstep(u, 0.34, 0.9)
      above = 1 - submerge
    } else {
      camY = -curP * WORLD_H
      pitch = 0
      above = 0
    }
    // Keep vertical movement entirely tied to scroll. This prevents the
    // waterline and underwater scene from bobbing while the page is still.
    camera.position.y = camY
    camera.position.x = (1 - above) * Math.sin(t * 0.11) * 0.25
    camera.rotation.x = pitch
    camera.rotation.z = (1 - above) * Math.sin(t * 0.07) * 0.008
    const horizon = 0.5 - (0.5 * Math.tan(pitch)) / TANHF

    // light dies with depth; warm sun while we're still in the air
    const sunF = Math.exp(-depth / 320)
    sun.intensity = 2.4 * sunF + above * 0.9
    sun.color.copy(SUN_COOL).lerp(SUN_WARM, above)
    hemi.intensity = 0.08 + 0.75 * sunF + 0.45 * above
    rampJS(depth, fogColor)
    fogColor.lerp(HAZE, above)
    scene.fog.color.copy(fogColor)
    scene.fog.density = (0.016 + (depth / 10000) * 0.02) * (1 - above) + 0.002 * above

    // uniforms
    setDescentPlate(plateProgress)
    background.material.uniforms.uTime.value = t
    background.material.uniforms.uDepth.value = depth
    background.material.uniforms.uCamH.value = camY
    background.material.uniforms.uHorizon.value = horizon
    background.material.uniforms.uAbove.value = above
    background.material.uniforms.uPlateAlpha.value = plateAlpha
    background.material.uniforms.uSun.value.set(0.69, horizon + 0.42)
    ocean.mat.uniforms.uTime.value = t
    ocean.mat.uniforms.uCamY.value = camY
    ocean.mat.uniforms.uSurfaceAlpha.value = THREE.MathUtils.smoothstep(camY, -5, 0.5)
    ocean.mat.uniforms.uHorizon.value = horizon
    ocean.mat.uniforms.uPlateMix.value = above
    ocean.mat.uniforms.uSunX.value = 0.69
    // Show the moving mesh on the opening slide, then remove it before the
    // split-surface plates. It returns once the photographic sequence is gone.
    ocean.mesh.visible = plateProgress < 0.15 || plateAlpha <= 0.01
    snow.material.uniforms.uTime.value = t
    snow.material.uniforms.uCamY.value = camY
    snow.material.uniforms.uDepth.value = depth
    bubbles.material.uniforms.uTime.value = t
    bubbles.material.uniforms.uDepth.value = depth
    // Do not introduce procedural bubbles over the photographic transition.
    bubbles.visible = plateAlpha <= 0.01
    shafts.mat.uniforms.uTime.value = t
    shafts.mat.uniforms.uDepth.value = depth
    fish.mat.uniforms.uTime.value = t
    fish.mat.uniforms.uForm.value = curFishForm
    pulses.mat.uniforms.uTime.value = t
    light.uniforms.uTime.value = t

    // zone-local animation + visibility culling (cheap: skip far strata)
    for (const name in zones) {
      const g = zones[name]
      g.visible = Math.abs(g.position.y - camY) < 70
    }
    surfaceG.visible = camY > -70

    // --- the hook: appears once we're under, steered by the pointer --------
    const hookOn = curP > SUB_P * 0.55
    hook.group.visible = hookOn
    hook.line.visible = hookOn
    if (hookOn) {
      const tx = camera.position.x + pointer.x * 6.0
      const ty = camY + pointer.y * 3.3
      hookPos.x += (tx - hookPos.x) * Math.min(1, dt * 5)
      hookPos.y += (ty - hookPos.y) * Math.min(1, dt * 5)
      yankT += dt
      const yank =
        yankT < 1 ? 1.5 * Math.exp(-5 * yankT) * Math.sin(Math.min(yankT * 11, Math.PI)) : 0
      hook.group.position.set(
        hookPos.x + Math.sin(t * 0.9) * 0.08,
        hookPos.y + yank + Math.sin(t * 0.7) * 0.06,
        hookPos.z
      )
      hook.group.rotation.y = Math.sin(t * 0.4) * 0.5
      hook.group.rotation.z = Math.sin(t * 0.5) * 0.07 + (tx - hookPos.x) * -0.06
      // the line runs from the hook eye up out of frame
      const hp = hook.line.geometry.attributes.position.array
      const hx = hook.group.position.x + 0.26
      const hy = hook.group.position.y + 0.9
      for (let i = 0; i < hook.LINE_PTS; i++) {
        const q = i / (hook.LINE_PTS - 1)
        hp[i * 3] = hx + Math.sin(q * 7 + t * 1.1) * 0.55 * q
        hp[i * 3 + 1] = hy + q * 95
        hp[i * 3 + 2] = hook.group.position.z
      }
      hook.line.geometry.attributes.position.needsUpdate = true

      // screen-space catch detection: pass the hook over a symbol → a bite
      camera.updateMatrixWorld()
      _v.copy(hook.group.position).project(camera)
      const hnx = _v.x
      const hny = _v.y
      for (const c of catchables) {
        c.cooldown -= dt
        if (!c.zone.visible) {
          c.hovered = false
          continue
        }
        _v.setFromMatrixPosition(c.obj.matrixWorld).project(camera)
        const dx = (_v.x - hnx) * camera.aspect
        const dy = _v.y - hny
        const near = dx * dx + dy * dy < 0.11
        if (near && !c.hovered && c.cooldown <= 0) {
          yankT = 0
          c.cooldown = 1.6
        }
        c.hovered = near
      }
    }

    if (chessG.visible) {
      // the knight twists and turns, very slowly, in the water
      knight.pivot.rotation.y = t * 0.12
      knight.pivot.rotation.x = Math.sin(t * 0.21) * 0.16
      knight.pivot.rotation.z = Math.sin(t * 0.16) * 0.12
      knight.pivot.position.y = knightBaseY + Math.sin(t * 0.5) * 0.18
    }
    if (jellyG.visible) {
      for (let i = 0; i < jellies.length; i++) {
        const j = jellies[i]
        j.uniforms.uTime.value = t
        j.group.position.y = j.base.y + Math.sin(t * 0.14 + i * 2.4) * 1.3 + t * 0.0
        j.group.position.x = j.base.x + Math.sin(t * 0.09 + i * 1.7) * 0.9
        j.group.rotation.z = Math.sin(t * 0.12 + i) * 0.12
        j.group.rotation.x = Math.sin(t * 0.1 + i * 3.1) * 0.08
      }
    }
    if (hadalG.visible) {
      light.group.rotation.z = Math.sin(t * 0.21) * 0.55
      light.group.rotation.x = Math.sin(t * 0.13) * 0.18 - 0.1
      drone.group.rotation.y = t * 0.1
      drone.group.rotation.x = Math.sin(t * 0.17) * 0.1
      drone.group.rotation.z = Math.sin(t * 0.13) * 0.12
      drone.group.position.y = (isMobile ? 3.5 : 0.2) + Math.sin(t * 0.42) * 0.28
      for (const rotor of drone.rotors) rotor.rotation.y += dt * 18
    }
    if (floorG.visible) {
      floorG.children[0].material.uniforms.uTime.value = t
    }

    renderer.render(scene, camera)

    const dRound = Math.round(depth)
    if (dRound !== lastDepthReported) {
      lastDepthReported = dRound
      onDepth(dRound)
    }
  }

  function start() {
    if (running) return
    running = true
    clock.start()
    rafId = requestAnimationFrame(frame)
  }
  function stop() {
    running = false
    cancelAnimationFrame(rafId)
  }

  function resize(w, h) {
    renderer.setSize(w, h, false)
    camera.aspect = w / h
    camera.updateProjectionMatrix()
    background.material.uniforms.uAspect.value = w / h
    ocean.mat.uniforms.uAspect.value = w / h
    renderer.getDrawingBufferSize(ocean.mat.uniforms.uResolution.value)
  }

  function onVisibility() {
    if (document.hidden) stop()
    else start()
  }
  document.addEventListener('visibilitychange', onVisibility)

  function dispose() {
    stop()
    document.removeEventListener('visibilitychange', onVisibility)
    window.removeEventListener('pointermove', onPointerMove)
    scene.traverse((obj) => {
      if (obj.geometry) obj.geometry.dispose()
      if (obj.material) {
        const materials = Array.isArray(obj.material) ? obj.material : [obj.material]
        materials.forEach((material) => {
          if (material.map) material.map.dispose()
          if (material.uniforms) {
            Object.values(material.uniforms).forEach(({ value }) => {
              if (value?.isTexture) value.dispose()
            })
          }
          material.dispose()
        })
      }
    })
    descentTextures.forEach((texture) => texture.dispose())
    cloudTexture.dispose()
    renderer.dispose()
  }

  return { setAnchors, setProgress, setFishForm, start, stop, resize, dispose }
}
