import * as THREE from 'three'

/*
 * Turn-by-turn directions over the road grid. The layout's nodes/edges form
 * an undirected graph; Dijkstra finds the shortest run of road segments from
 * the player's nearest crossing to the crossing nearest the destination, and
 * the result is drawn as a glowing tube hovering over the asphalt plus a
 * beacon column at the destination. The same points feed the minimap.
 */

export function createNavigator(scene, layout) {
  const key = (x, z) => `${x}|${z}`
  const nodes = new Map()
  for (const n of layout.nodes) nodes.set(key(n.x, n.z), { x: n.x, z: n.z, adj: [] })
  for (const e of layout.edges) {
    const a = nodes.get(e.vertical ? key(e.p, e.a) : key(e.a, e.p))
    const b = nodes.get(e.vertical ? key(e.p, e.b) : key(e.b, e.p))
    if (a && b) {
      a.adj.push(b)
      b.adj.push(a)
    }
  }
  const nodeList = [...nodes.values()]

  function nearestNode(x, z) {
    let best = null
    let bestD = Infinity
    for (const n of nodeList) {
      const d = (n.x - x) ** 2 + (n.z - z) ** 2
      if (d < bestD) {
        bestD = d
        best = n
      }
    }
    return best
  }

  /** Dijkstra (the graph is ~100 nodes, an array scan is plenty). */
  function findPath(start, goal) {
    const dist = new Map([[start, 0]])
    const prev = new Map()
    const open = new Set([start])
    const done = new Set()
    while (open.size) {
      let cur = null
      let curD = Infinity
      for (const n of open) {
        const d = dist.get(n)
        if (d < curD) {
          curD = d
          cur = n
        }
      }
      open.delete(cur)
      done.add(cur)
      if (cur === goal) break
      for (const nb of cur.adj) {
        if (done.has(nb)) continue
        const nd = curD + Math.hypot(nb.x - cur.x, nb.z - cur.z)
        if (nd < (dist.get(nb) ?? Infinity)) {
          dist.set(nb, nd)
          prev.set(nb, cur)
          open.add(nb)
        }
      }
    }
    if (!done.has(goal)) return null
    const path = [goal]
    while (prev.has(path[0])) path.unshift(prev.get(path[0]))
    return path
  }

  let routeMesh = null
  let beacon = null
  const api = {
    targetKey: null,
    points: [], // Vector3 waypoints, also drawn on the minimap

    setTarget(lm, from) {
      api.clear()
      const start = nearestNode(from.x, from.z)
      const goal = nearestNode(lm.center.x, lm.center.z)
      const path = start && goal ? findPath(start, goal) : null
      if (!path) return false

      const pts = [new THREE.Vector3(from.x, 0.5, from.z)]
      for (const n of path) {
        const p = new THREE.Vector3(n.x, 0.5, n.z)
        // skip nodes the player is basically standing on
        if (p.distanceToSquared(pts[pts.length - 1]) > 9) pts.push(p)
      }
      // final leg: from the last crossing toward the landmark, stopping at
      // the edge of its drive-in circle
      const last = pts[pts.length - 1]
      const toLm = new THREE.Vector3(lm.center.x - last.x, 0, lm.center.z - last.z)
      const len = toLm.length()
      const stop = Math.max(len - lm.enterR * 0.55, 0)
      if (stop > 3) pts.push(last.clone().addScaledVector(toLm.normalize(), stop))

      api.targetKey = lm.key
      api.points = pts

      if (pts.length >= 2) {
        const curve = new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.25)
        routeMesh = new THREE.Mesh(
          new THREE.TubeGeometry(curve, pts.length * 10, 0.32, 6),
          new THREE.MeshBasicMaterial({
            color: lm.color,
            transparent: true,
            opacity: 0.75,
            blending: THREE.AdditiveBlending,
            depthWrite: false
          })
        )
        routeMesh.renderOrder = 4
        scene.add(routeMesh)
      }

      beacon = new THREE.Mesh(
        new THREE.CylinderGeometry(1.1, 1.6, 46, 12, 1, true),
        new THREE.MeshBasicMaterial({
          color: lm.color,
          transparent: true,
          opacity: 0.16,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          side: THREE.DoubleSide
        })
      )
      beacon.position.set(lm.center.x, 23, lm.center.z)
      scene.add(beacon)
      return true
    },

    clear() {
      api.targetKey = null
      api.points = []
      if (routeMesh) {
        scene.remove(routeMesh)
        routeMesh.geometry.dispose()
        routeMesh.material.dispose()
        routeMesh = null
      }
      if (beacon) {
        scene.remove(beacon)
        beacon.geometry.dispose()
        beacon.material.dispose()
        beacon = null
      }
    },

    update(t) {
      if (routeMesh) routeMesh.material.opacity = 0.55 + Math.sin(t * 3) * 0.2
      if (beacon) beacon.material.opacity = 0.1 + (Math.sin(t * 2.4) + 1) * 0.05
    }
  }

  return api
}
