import * as THREE from 'three'
import { asset, glowSprite, lightPool, loadGLB } from './cityScene.js'

/* Arcade rigid-body driving: planted GTA steering with derby-style impacts. */
const CAR_RADIUS = 1.25
const NPC_RADIUS = 1.55
const ROAD_MAX = 36
const OFFROAD_MAX = 11
const REVERSE_MAX = 10
const ACCEL = 21
const BRAKE = 36
const STEER_RATE = 1.65
const STATIC_RESTITUTION = 0.5

export function createPlayerCar(scene, { colliders, cars, isOnRoad, cityHalf }) {
  const group = new THREE.Group()
  group.position.set(-18, 0.06, -28.5)
  scene.add(group)

  const carVisual = new THREE.Group()
  const blackVisual = new THREE.Group()
  const droneVisual = new THREE.Group()
  const droneRotors = []
  group.add(carVisual, blackVisual, droneVisual)

  loadGLB(asset('models/kenney/cars/sedan-sports.glb'))
    .then((gltf) => {
      const body = gltf.scene.clone(true)
      const box = new THREE.Box3().setFromObject(body)
      const size = box.getSize(new THREE.Vector3())
      const s = 4.6 / size.z
      body.scale.setScalar(s)
      body.position.y = -box.min.y * s
      body.traverse((o) => {
        if (!o.isMesh) return
        o.castShadow = true
        o.receiveShadow = true
        const mats = Array.isArray(o.material) ? o.material : [o.material]
        for (const m of mats) {
          if (typeof m.roughness === 'number') m.roughness = 0.3
          if ('envMapIntensity' in m) m.envMapIntensity = 1.5
        }
      })
      carVisual.add(body)

      const darkBody = body.clone(true)
      darkBody.traverse((o) => {
        if (!o.isMesh) return
        const mats = Array.isArray(o.material) ? o.material : [o.material]
        const cloned = mats.map((material) => {
          const next = material.clone()
          if (next.color) next.color.multiplyScalar(0.075)
          if (next.emissive) next.emissive.multiplyScalar(0.18)
          if (typeof next.metalness === 'number') next.metalness = Math.max(next.metalness, 0.55)
          return next
        })
        o.material = Array.isArray(o.material) ? cloned : cloned[0]
      })
      blackVisual.add(darkBody)
      applyVehicleVisibility()
    })
    .catch((e) => console.error('player car model failed', e))

  loadGLB(asset('models/drone.glb'))
    .then((gltf) => {
      const root = gltf.scene.clone(true)
      const box = new THREE.Box3().setFromObject(root)
      const size = box.getSize(new THREE.Vector3())
      const scale = 5.4 / Math.max(size.x, size.z)
      const center = box.getCenter(new THREE.Vector3())
      root.scale.setScalar(scale)
      root.position.set(-center.x * scale, -center.y * scale, -center.z * scale)
      root.traverse((o) => {
        if (!o.isMesh) return
        o.castShadow = true
        o.receiveShadow = true
      })
      for (const [index, name] of ['Rotor_FL', 'Rotor_FR', 'Rotor_BL', 'Rotor_BR'].entries()) {
        const rotor = root.getObjectByName(name)
        if (rotor?.geometry) {
          rotor.geometry = rotor.geometry.clone()
          rotor.geometry.computeBoundingBox()
          const pivot = rotor.geometry.boundingBox.getCenter(new THREE.Vector3())
          rotor.geometry.translate(-pivot.x, -pivot.y, -pivot.z)
          rotor.position.add(pivot)
          droneRotors.push({ rotor, direction: index % 2 ? -1 : 1 })
        }
      }
      droneVisual.add(root)
      applyVehicleVisibility()
    })
    .catch((e) => console.error('player drone model failed', e))

  const headlight = new THREE.SpotLight(0xffe2b0, 105, 38, 0.42, 0.82, 1.8)
  headlight.position.set(0, 1.25, 1.65)
  const headTarget = new THREE.Object3D()
  headTarget.position.set(0, 0, 18)
  headlight.target = headTarget
  const headGlow = glowSprite(0xffe9b8, 1.75, 0.3)
  headGlow.position.set(0, 0.6, 2.7)
  const tailGlow = glowSprite(0xff5040, 1.6, 0.45)
  tailGlow.position.set(0, 0.6, -2.5)
  const pool = lightPool(0xffe2b0, 10, 0.065)
  pool.position.set(0, 0.1, 6)
  group.add(headlight, headTarget, headGlow, tailGlow, pool)

  const CELL = 14
  const grid = new Map()
  for (const c of colliders) {
    const reach = c.type === 'box' ? Math.max(c.hx, c.hz) : c.r
    const x0 = Math.floor((c.x - reach) / CELL)
    const x1 = Math.floor((c.x + reach) / CELL)
    const z0 = Math.floor((c.z - reach) / CELL)
    const z1 = Math.floor((c.z + reach) / CELL)
    for (let gx = x0; gx <= x1; gx++) {
      for (let gz = z0; gz <= z1; gz++) {
        const key = `${gx}|${gz}`
        let cell = grid.get(key)
        if (!cell) grid.set(key, (cell = []))
        cell.push(c)
      }
    }
  }

  const velocity = new THREE.Vector2()
  const state = {
    speed: 0,
    heading: Math.PI / 2,
    onRoad: true,
    velocity,
    vehicle: 'basic',
    dronePhase: 0,
    droneAltitude: 8,
    verticalSpeed: 0
  }
  group.rotation.y = state.heading
  const bound = cityHalf + 68

  function applyVehicleVisibility() {
    carVisual.visible = state?.vehicle === 'basic'
    blackVisual.visible = state?.vehicle === 'black'
    droneVisual.visible = state?.vehicle === 'drone'
    const lightsOn = state?.vehicle !== 'drone'
    for (const light of [headlight, headGlow, tailGlow, pool]) light.visible = lightsOn
  }

  function setVehicle(vehicle) {
    state.vehicle = vehicle
    velocity.set(0, 0)
    state.speed = 0
    state.droneAltitude = 8
    state.verticalSpeed = 0
    group.position.y = vehicle === 'drone' ? state.droneAltitude : 0.06
    applyVehicleVisibility()
  }

  function reset() {
    velocity.set(0, 0)
    state.speed = 0
    state.heading = Math.PI / 2
    state.droneAltitude = 8
    state.verticalSpeed = 0
    group.rotation.y = state.heading
    group.position.set(-18, state.vehicle === 'drone' ? 8 : 0.06, -28.5)
  }

  function resolveStatic(c, next) {
    let nx
    let nz
    let penetration
    if (c.type === 'box') {
      const cos = Math.cos(c.ry || 0)
      const sin = Math.sin(c.ry || 0)
      const dx = next.x - c.x
      const dz = next.y - c.z
      const lx = cos * dx - sin * dz
      const lz = sin * dx + cos * dz
      const ex = c.hx + CAR_RADIUS
      const ez = c.hz + CAR_RADIUS
      if (Math.abs(lx) >= ex || Math.abs(lz) >= ez) return
      const px = ex - Math.abs(lx)
      const pz = ez - Math.abs(lz)
      let lnx = 0
      let lnz = 0
      if (px < pz) {
        lnx = lx >= 0 ? 1 : -1
        penetration = px
      } else {
        lnz = lz >= 0 ? 1 : -1
        penetration = pz
      }
      nx = cos * lnx + sin * lnz
      nz = -sin * lnx + cos * lnz
    } else {
      const rr = c.r + CAR_RADIUS
      const dx = next.x - c.x
      const dz = next.y - c.z
      const d2 = dx * dx + dz * dz
      if (d2 >= rr * rr) return
      const d = Math.sqrt(Math.max(d2, 1e-8))
      nx = d > 0.001 ? dx / d : -Math.sin(state.heading)
      nz = d > 0.001 ? dz / d : -Math.cos(state.heading)
      penetration = rr - d
    }
    next.x += nx * penetration
    next.y += nz * penetration
    const normalSpeed = velocity.x * nx + velocity.y * nz
    if (normalSpeed < 0) {
      velocity.x -= (1 + STATIC_RESTITUTION) * normalSpeed * nx
      velocity.y -= (1 + STATIC_RESTITUTION) * normalSpeed * nz
      velocity.multiplyScalar(0.96)
    }
  }

  function update(dt, input) {
    const pos = group.position
    const isDrone = state.vehicle === 'drone'
    const onRoad = isDrone || isOnRoad(pos.x, pos.z)
    state.onRoad = onRoad
    const forward = new THREE.Vector2(Math.sin(state.heading), Math.cos(state.heading))
    let forwardSpeed = velocity.dot(forward)
    const throttle = (input.forward ? 1 : 0) - (input.back ? 1 : 0)
    if (throttle) {
      const braking = Math.sign(throttle) !== Math.sign(forwardSpeed) && Math.abs(forwardSpeed) > 1
      const force = braking ? BRAKE : ACCEL * (isDrone ? 0.82 : onRoad ? 1 : 0.58)
      velocity.addScaledVector(forward, throttle * force * dt)
    }

    const steer = (input.left ? 1 : 0) - (input.right ? 1 : 0)
    if (steer && Math.abs(forwardSpeed) > 0.35) {
      const grip = THREE.MathUtils.clamp(Math.abs(forwardSpeed) / 10, 0.22, 1)
      state.heading += steer * STEER_RATE * grip * dt * (forwardSpeed < 0 ? -1 : 1)
    }
    group.rotation.y = state.heading

    const newForward = new THREE.Vector2(Math.sin(state.heading), Math.cos(state.heading))
    const right = new THREE.Vector2(newForward.y, -newForward.x)
    const lateralSpeed = velocity.dot(right)
    velocity.addScaledVector(right, -lateralSpeed * Math.min(dt * (isDrone ? 4.8 : onRoad ? 3.15 : 4.1), 1))
    const drag = input.forward || input.back ? 0.2 : isDrone ? 0.9 : onRoad ? 0.76 : 1.6
    velocity.multiplyScalar(Math.exp(-dt * drag))
    forwardSpeed = velocity.dot(newForward)
    const maxForward = isDrone ? 25 : onRoad ? ROAD_MAX : OFFROAD_MAX
    if (forwardSpeed > maxForward) velocity.addScaledVector(newForward, maxForward - forwardSpeed)
    if (forwardSpeed < -REVERSE_MAX) velocity.addScaledVector(newForward, -REVERSE_MAX - forwardSpeed)

    const next = new THREE.Vector2(pos.x + velocity.x * dt, pos.z + velocity.y * dt)
    if (!isDrone) {
      const gx = Math.floor(next.x / CELL)
      const gz = Math.floor(next.y / CELL)
      const checked = new Set()
      for (let ix = gx - 1; ix <= gx + 1; ix++) {
        for (let iz = gz - 1; iz <= gz + 1; iz++) {
          const cell = grid.get(`${ix}|${iz}`)
          if (!cell) continue
          for (const c of cell) {
            if (checked.has(c)) continue
            checked.add(c)
            resolveStatic(c, next)
          }
        }
      }
    }

    // Exchange momentum with traffic rather than treating it as a solid wall.
    for (const car of isDrone ? [] : cars) {
      const u = car.userData
      const rr = NPC_RADIUS + CAR_RADIUS
      const dx = next.x - car.position.x
      const dz = next.y - car.position.z
      const d2 = dx * dx + dz * dz
      if (d2 >= rr * rr) continue
      const d = Math.sqrt(Math.max(d2, 1e-8))
      const nx = d > 0.001 ? dx / d : -newForward.x
      const nz = d > 0.001 ? dz / d : -newForward.y
      const penetration = rr - d
      next.x += nx * penetration * 0.55
      next.y += nz * penetration * 0.55
      u.bumpX = (u.bumpX || 0) - nx * penetration * 0.45
      u.bumpZ = (u.bumpZ || 0) - nz * penetration * 0.45
      const npcVX = (u.vertical ? 0 : u.dir * u.curSpeed) + (u.bumpVX || 0)
      const npcVZ = (u.vertical ? u.dir * u.curSpeed : 0) + (u.bumpVZ || 0)
      const closing = (velocity.x - npcVX) * nx + (velocity.y - npcVZ) * nz
      if (closing < 0) {
        const impulse = (-(1 + 0.88) * closing) / (1 + 1 / 1.2)
        velocity.x += nx * impulse
        velocity.y += nz * impulse
        u.bumpVX = (u.bumpVX || 0) - (nx * impulse) / 1.2
        u.bumpVZ = (u.bumpVZ || 0) - (nz * impulse) / 1.2
      }
    }

    const dist = next.length()
    if (dist > bound) {
      next.multiplyScalar(bound / dist)
      const outward = next.clone().normalize()
      const normalSpeed = velocity.dot(outward)
      if (normalSpeed > 0) velocity.addScaledVector(outward, -1.25 * normalSpeed)
    }
    pos.x = next.x
    pos.z = next.y
    if (isDrone) {
      state.dronePhase += dt
      const lift = (input.ascend ? 1 : 0) - (input.descend ? 1 : 0)
      state.verticalSpeed += lift * 18 * dt
      state.verticalSpeed *= Math.exp(-dt * (lift ? 2.1 : 4.2))
      state.droneAltitude = THREE.MathUtils.clamp(
        state.droneAltitude + state.verticalSpeed * dt,
        3.5,
        55
      )
      if ((state.droneAltitude === 3.5 && state.verticalSpeed < 0) ||
          (state.droneAltitude === 55 && state.verticalSpeed > 0)) state.verticalSpeed = 0
      pos.y = state.droneAltitude + Math.sin(state.dronePhase * 2.2) * 0.12
      for (const { rotor, direction } of droneRotors) rotor.rotation.y += dt * 58 * direction
    } else {
      pos.y = 0.06
    }
    state.speed = velocity.dot(newForward)
  }

  return { group, state, update, setVehicle, reset }
}

/** Road-aware pursuit AI used only by the black-car survival mode. */
export function createPoliceCar(scene, position, { layout, colliders, cars, policeCars, isOnRoad }) {
  const group = new THREE.Group()
  group.position.copy(position)
  group.position.y = 0.06
  scene.add(group)

  loadGLB(asset('models/kenney/cars/police.glb'))
    .then((gltf) => {
      const body = gltf.scene.clone(true)
      const box = new THREE.Box3().setFromObject(body)
      const size = box.getSize(new THREE.Vector3())
      const scale = 4.5 / size.z
      body.scale.setScalar(scale)
      body.position.y = -box.min.y * scale
      body.traverse((o) => {
        if (!o.isMesh) return
        o.castShadow = true
        o.receiveShadow = true
        const mats = Array.isArray(o.material) ? o.material : [o.material]
        for (const material of mats) {
          if (typeof material.roughness === 'number') material.roughness = 0.28
        }
      })
      group.add(body)
    })
    .catch((e) => console.error('police model failed', e))

  const red = glowSprite(0xff2038, 2.5, 0.85)
  red.position.set(-0.55, 1.45, 0)
  const blue = glowSprite(0x2878ff, 2.5, 0.85)
  blue.position.set(0.55, 1.45, 0)
  group.add(red, blue)

  const velocity = new THREE.Vector2()
  let heading = 0
  let sirenT = Math.random() * Math.PI * 2
  let path = []
  let pathIndex = 0
  let repathIn = Math.random() * 0.3
  let weave = 0
  let weaveTarget = 0
  let weaveIn = 0
  const personality = Math.random() * Math.PI * 2
  const nodeByKey = new Map(layout.nodes.map((node) => [`${node.gx},${node.gz}`, node]))

  function nearestNode(x, z) {
    let nearest = layout.nodes[0]
    let best = Infinity
    for (const node of layout.nodes) {
      const d2 = (node.x - x) ** 2 + (node.z - z) ** 2
      if (d2 < best) {
        best = d2
        nearest = node
      }
    }
    return nearest
  }

  function neighbours(node) {
    const result = []
    if (node.arms.N) result.push(nodeByKey.get(`${node.gx},${node.gz - 1}`))
    if (node.arms.S) result.push(nodeByKey.get(`${node.gx},${node.gz + 1}`))
    if (node.arms.E) result.push(nodeByKey.get(`${node.gx + 1},${node.gz}`))
    if (node.arms.W) result.push(nodeByKey.get(`${node.gx - 1},${node.gz}`))
    return result.filter(Boolean)
  }

  function routeTo(target) {
    const start = nearestNode(group.position.x, group.position.z)
    const goal = nearestNode(target.x, target.z)
    const queue = [start]
    const previous = new Map([[start, null]])
    for (let i = 0; i < queue.length && !previous.has(goal); i++) {
      for (const next of neighbours(queue[i])) {
        if (previous.has(next)) continue
        previous.set(next, queue[i])
        queue.push(next)
      }
    }
    if (!previous.has(goal)) {
      path = [goal]
      pathIndex = 0
      return
    }
    const nextPath = []
    for (let node = goal; node; node = previous.get(node)) nextPath.push(node)
    path = nextPath.reverse()
    pathIndex = Math.min(1, path.length - 1)
  }

  function colliderContains(collider, x, z, padding = 1.35) {
    if (collider.type === 'box') {
      const cos = Math.cos(collider.ry || 0)
      const sin = Math.sin(collider.ry || 0)
      const dx = x - collider.x
      const dz = z - collider.z
      const lx = cos * dx - sin * dz
      const lz = sin * dx + cos * dz
      return Math.abs(lx) < collider.hx + padding && Math.abs(lz) < collider.hz + padding
    }
    return (x - collider.x) ** 2 + (z - collider.z) ** 2 < (collider.r + padding) ** 2
  }

  function clearShortcut(target) {
    const dx = target.x - group.position.x
    const dz = target.z - group.position.z
    const distance = Math.hypot(dx, dz)
    if (distance > 58) return false
    const steps = Math.max(2, Math.ceil(distance / 2))
    for (let step = 1; step < steps; step++) {
      const k = step / steps
      const x = group.position.x + dx * k
      const z = group.position.z + dz * k
      if (colliders.some((collider) => colliderContains(collider, x, z))) return false
    }
    return true
  }

  function resolveColliders(next) {
    for (const collider of colliders) {
      let nx = 0
      let nz = 0
      let penetration = 0
      if (collider.type === 'box') {
        const cos = Math.cos(collider.ry || 0)
        const sin = Math.sin(collider.ry || 0)
        const dx = next.x - collider.x
        const dz = next.y - collider.z
        const lx = cos * dx - sin * dz
        const lz = sin * dx + cos * dz
        const ex = collider.hx + 1.35
        const ez = collider.hz + 1.35
        if (Math.abs(lx) >= ex || Math.abs(lz) >= ez) continue
        const px = ex - Math.abs(lx)
        const pz = ez - Math.abs(lz)
        const lnx = px < pz ? (lx >= 0 ? 1 : -1) : 0
        const lnz = px < pz ? 0 : (lz >= 0 ? 1 : -1)
        penetration = Math.min(px, pz)
        nx = cos * lnx + sin * lnz
        nz = -sin * lnx + cos * lnz
      } else {
        const dx = next.x - collider.x
        const dz = next.y - collider.z
        const radius = collider.r + 1.35
        const d2 = dx * dx + dz * dz
        if (d2 >= radius * radius) continue
        const d = Math.sqrt(Math.max(d2, 1e-6))
        nx = dx / d
        nz = dz / d
        penetration = radius - d
      }
      next.x += nx * penetration
      next.y += nz * penetration
      const into = velocity.x * nx + velocity.y * nz
      if (into < 0) {
        velocity.x -= into * nx
        velocity.y -= into * nz
        velocity.multiplyScalar(0.7)
      }
    }
  }

  function resolveVehicleCollisions(next) {
    for (const car of cars) {
      const userData = car.userData
      const dx = next.x - car.position.x
      const dz = next.y - car.position.z
      const d2 = dx * dx + dz * dz
      const radius = 2.9
      if (d2 >= radius * radius) continue
      const distance = Math.sqrt(Math.max(d2, 1e-6))
      const nx = distance > 0.001 ? dx / distance : 1
      const nz = distance > 0.001 ? dz / distance : 0
      const overlap = radius - distance
      const policePush = overlap * 0.62
      const trafficPush = overlap - policePush
      next.x += nx * policePush
      next.y += nz * policePush
      car.position.x -= nx * trafficPush
      car.position.z -= nz * trafficPush
      userData.bumpX = (userData.bumpX || 0) - nx * trafficPush
      userData.bumpZ = (userData.bumpZ || 0) - nz * trafficPush

      const carVX = userData.vertical ? 0 : userData.dir * userData.curSpeed
      const carVZ = userData.vertical ? userData.dir * userData.curSpeed : 0
      const closing = (velocity.x - carVX) * nx + (velocity.y - carVZ) * nz
      if (closing < 0) {
        velocity.x -= closing * nx * 0.7
        velocity.y -= closing * nz * 0.7
        userData.bumpVX = (userData.bumpVX || 0) + closing * nx * 0.45
        userData.bumpVZ = (userData.bumpVZ || 0) + closing * nz * 0.45
        userData.curSpeed *= 0.68
      }
    }

    for (const other of policeCars) {
      if (other.group === group) continue
      const dx = next.x - other.group.position.x
      const dz = next.y - other.group.position.z
      const d2 = dx * dx + dz * dz
      const radius = 2.7
      if (d2 >= radius * radius) continue
      const distance = Math.sqrt(Math.max(d2, 1e-6))
      const nx = distance > 0.001 ? dx / distance : 1
      const nz = distance > 0.001 ? dz / distance : 0
      const push = (radius - distance) * 0.5
      next.x += nx * push
      next.y += nz * push
      other.group.position.x -= nx * push
      other.group.position.z -= nz * push
      const into = velocity.x * nx + velocity.y * nz
      if (into < 0) {
        velocity.x -= into * nx * 0.75
        velocity.y -= into * nz * 0.75
      }
    }
  }

  function update(dt, target, difficulty) {
    repathIn -= dt
    if (repathIn <= 0 || pathIndex >= path.length) {
      routeTo(target)
      repathIn = 0.42 + Math.random() * 0.28
    }

    weaveIn -= dt
    if (weaveIn <= 0) {
      weaveTarget = THREE.MathUtils.randFloat(-0.9, 0.9)
      weaveIn = 0.7 + Math.random() * 1.4
    }
    weave = THREE.MathUtils.lerp(weave, weaveTarget, 1 - Math.exp(-dt * 2.2))

    const takingShortcut = clearShortcut(target)
    let aimX = target.x
    let aimZ = target.z
    if (!takingShortcut && path.length) {
      let node = path[Math.min(pathIndex, path.length - 1)]
      if (Math.hypot(node.x - group.position.x, node.z - group.position.z) < 4.2 && pathIndex < path.length - 1) {
        node = path[++pathIndex]
      }
      const previous = path[Math.max(0, pathIndex - 1)] ?? node
      let sx = node.x - previous.x
      let sz = node.z - previous.z
      const segmentLength = Math.hypot(sx, sz) || 1
      sx /= segmentLength
      sz /= segmentLength
      const laneOffset = 1.65 + weave
      aimX = node.x - sz * laneOffset
      aimZ = node.z + sx * laneOffset
    }

    let desiredX = aimX - group.position.x
    let desiredZ = aimZ - group.position.z
    const aimLength = Math.hypot(desiredX, desiredZ) || 1
    desiredX /= aimLength
    desiredZ /= aimLength

    // Formation separation keeps the pack active and prevents a single
    // tailgating queue while preserving the fastest road route.
    for (const other of policeCars) {
      if (other.group === group) continue
      const dx = group.position.x - other.group.position.x
      const dz = group.position.z - other.group.position.z
      const d2 = dx * dx + dz * dz
      if (d2 < 0.01 || d2 > 100) continue
      const force = (10 - Math.sqrt(d2)) / 10
      desiredX += (dx / Math.sqrt(d2)) * force * 1.35
      desiredZ += (dz / Math.sqrt(d2)) * force * 1.35
    }
    const desireLength = Math.hypot(desiredX, desiredZ) || 1
    desiredX /= desireLength
    desiredZ /= desireLength

    // A subtle per-unit oscillation makes the chase feel reactive rather than
    // robotic, without sacrificing its road-aware route.
    const erratic = Math.sin(sirenT * 0.58 + personality) * 0.11
    const desired = Math.atan2(desiredX, desiredZ) + erratic
    const delta = Math.atan2(Math.sin(desired - heading), Math.cos(desired - heading))
    heading += THREE.MathUtils.clamp(delta, -2.6 * dt, 2.6 * dt)
    const forward = new THREE.Vector2(Math.sin(heading), Math.cos(heading))
    const roadSpeed = Math.min(29, 16.5 + difficulty * 1.35)
    const targetSpeed = roadSpeed * (isOnRoad(group.position.x, group.position.z) ? 1 : 0.94)
    velocity.lerp(forward.multiplyScalar(targetSpeed), 1 - Math.exp(-dt * 2.7))
    const next = new THREE.Vector2(
      group.position.x + velocity.x * dt,
      group.position.z + velocity.y * dt
    )
    resolveColliders(next)
    resolveVehicleCollisions(next)
    group.position.x = next.x
    group.position.z = next.y
    group.rotation.y = heading
    sirenT += dt * 10
    red.material.opacity = Math.sin(sirenT) > 0 ? 0.95 : 0.18
    blue.material.opacity = Math.sin(sirenT) <= 0 ? 0.95 : 0.18
  }

  routeTo(position)
  return { group, update }
}
