// Project tile for the drone: the model hanging in a single cold shaft of light, in the dark.
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

const droneModelUrl = `${import.meta.env.BASE_URL}models/drone.glb`

const LIGHT_TOP = 7
const FLOOR_Y = -1.1
const SHAFT_TOP_RADIUS = 0.2
const SHAFT_BOTTOM_RADIUS = 2.3
const DRONE_Y = 1.25
const DUST_COUNT = 140

function backdrop () {
  const c = document.createElement('canvas')
  c.width = 512
  c.height = 352
  const g = c.getContext('2d')
  const glow = g.createRadialGradient(256, 120, 0, 256, 120, 330)
  glow.addColorStop(0, '#0f2130')
  glow.addColorStop(0.6, '#050a11')
  glow.addColorStop(1, '#010204')
  g.fillStyle = glow
  g.fillRect(0, 0, 512, 352)
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

function makeShaft () {
  const height = LIGHT_TOP - FLOOR_Y
  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uColor: { value: new THREE.Color(0xbfe6ff) },
      uPower: { value: 1 }
    },
    vertexShader: `
      varying vec3 vNormal;
      varying vec3 vView;
      varying float vHeight;
      void main () {
        vec4 viewPos = modelViewMatrix * vec4(position, 1.0);
        vNormal = normalize(normalMatrix * normal);
        vView = normalize(-viewPos.xyz);
        vHeight = uv.y;
        gl_Position = projectionMatrix * viewPos;
      }
    `,
    fragmentShader: `
      uniform vec3 uColor;
      uniform float uPower;
      varying vec3 vNormal;
      varying vec3 vView;
      varying float vHeight;
      void main () {
        float edge = pow(abs(dot(normalize(vNormal), normalize(vView))), 2.6);
        float along = 0.05 + 0.42 * pow(vHeight, 1.5);
        gl_FragColor = vec4(uColor * edge * along * uPower, 1.0);
      }
    `
  })
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(SHAFT_TOP_RADIUS, SHAFT_BOTTOM_RADIUS, height, 64, 1, true),
    material
  )
  mesh.position.y = FLOOR_Y + height / 2
  return { mesh, material }
}

function makeDust () {
  const seeds = Array.from({ length: DUST_COUNT }, () => ({
    y: Math.random(),
    angle: Math.random() * Math.PI * 2,
    radius: Math.sqrt(Math.random()) * 0.85,
    speed: 0.012 + Math.random() * 0.03,
    drift: 0.1 + Math.random() * 0.3
  }))
  const positions = new Float32Array(DUST_COUNT * 3)
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  const points = new THREE.Points(geometry, new THREE.PointsMaterial({
    color: 0xd8efff,
    size: 0.024,
    transparent: true,
    opacity: 0.55,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  }))

  function update (t) {
    seeds.forEach((seed, i) => {
      const f = (seed.y + t * seed.speed) % 1
      const y = FLOOR_Y + (LIGHT_TOP - 2 - FLOOR_Y) * f
      const shaftRadius = SHAFT_BOTTOM_RADIUS + (SHAFT_TOP_RADIUS - SHAFT_BOTTOM_RADIUS) * ((y - FLOOR_Y) / (LIGHT_TOP - FLOOR_Y))
      const angle = seed.angle + t * seed.drift
      positions[i * 3] = Math.cos(angle) * seed.radius * shaftRadius
      positions[i * 3 + 1] = y
      positions[i * 3 + 2] = Math.sin(angle) * seed.radius * shaftRadius
    })
    geometry.attributes.position.needsUpdate = true
  }
  return { points, update }
}

export async function buildDrone ({ scene, camera, renderer }) {
  const gltf = await new GLTFLoader().loadAsync(droneModelUrl)
  const model = gltf.scene

  const box = new THREE.Box3().setFromObject(model)
  const size = box.getSize(new THREE.Vector3())
  const center = box.getCenter(new THREE.Vector3())
  model.position.sub(center)
  const holder = new THREE.Group()
  holder.add(model)
  const scale = 3.2 / Math.max(size.x, size.y, size.z, 1e-6)
  holder.scale.setScalar(scale)
  holder.position.y = DRONE_Y
  scene.add(holder)

  const rotors = []
  model.traverse((obj) => {
    if (!obj.isMesh) return
    obj.material = obj.material.clone()
    obj.material.roughness = Math.min(obj.material.roughness ?? 0.7, 0.42)
    obj.material.metalness = Math.min(obj.material.metalness ?? 0.3, 0.55)
    obj.castShadow = true
    if (/Rotor_/i.test(obj.name)) rotors.push(obj)
  })

  const beacon = new THREE.Mesh(
    new THREE.SphereGeometry(0.035 / scale, 12, 10),
    new THREE.MeshBasicMaterial({ color: 0xff2a2a })
  )
  beacon.position.y = (size.y / 2) + 0.03 / scale
  holder.add(beacon)

  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.05
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  scene.background = backdrop()

  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(30, 64),
    new THREE.MeshStandardMaterial({ color: 0x10161d, roughness: 0.55, metalness: 0.25 })
  )
  floor.rotation.x = -Math.PI / 2
  floor.position.y = FLOOR_Y
  floor.receiveShadow = true
  scene.add(floor)

  const BASE_INTENSITY = 12
  const spot = new THREE.SpotLight(0xcfeaff, BASE_INTENSITY, 0, Math.atan((SHAFT_BOTTOM_RADIUS - SHAFT_TOP_RADIUS) / (LIGHT_TOP - FLOOR_Y)) * 1.04, 0.4, 0)
  spot.position.set(0, LIGHT_TOP, 0)
  spot.target.position.set(0, FLOOR_Y, 0)
  spot.castShadow = true
  spot.shadow.mapSize.set(1024, 1024)
  spot.shadow.camera.near = 1
  spot.shadow.camera.far = 12
  spot.shadow.bias = -0.0008
  scene.add(spot, spot.target)

  const rim = new THREE.DirectionalLight(0x3a6a96, 0.9)
  rim.position.set(-3, 2, -5)
  scene.add(rim)
  scene.add(new THREE.HemisphereLight(0x1b2a3a, 0x000000, 0.35))

  const shaft = makeShaft()
  scene.add(shaft.mesh)
  const dust = makeDust()
  scene.add(dust.points)

  camera.fov = 30
  camera.near = 0.1
  camera.far = 60
  camera.position.set(0, 0.5, 8.2)
  camera.lookAt(0, 0.2, 0)
  camera.updateProjectionMatrix()

  return (t, dt) => {
    holder.position.y = DRONE_Y + Math.sin(t * 0.8) * 0.09
    holder.rotation.y = -0.45 + t * 0.14
    holder.rotation.z = Math.sin(t * 0.55) * 0.035
    holder.rotation.x = 0.1 + Math.sin(t * 0.43) * 0.03
    for (const rotor of rotors) rotor.rotation.y += dt * 38

    // The light drops out for a beat now and then, like a failing lamp.
    const dip = Math.max(0, Math.sin(t * 1.3) * Math.sin(t * 7.1) * Math.sin(t * 0.37) - 0.25)
    const power = 1 - Math.min(0.75, dip * 2)
    spot.intensity = BASE_INTENSITY * power
    shaft.material.uniforms.uPower.value = power

    beacon.visible = Math.sin(t * 5) > -0.2
    dust.update(t)
  }
}
