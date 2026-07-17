// Weighted flow field (Dijkstra) from the core outward.
// Enemies descend the distance gradient; player buildings are expensive
// but passable, so enemies chew through walls when detours get too long.

import { GRID_W, GRID_H } from './defs.js'

const DIRS = [
  [1, 0], [-1, 0], [0, 1], [0, -1],
  [1, 1], [1, -1], [-1, 1], [-1, -1]
]

// Simple binary heap keyed on dist.
class Heap {
  constructor() { this.a = [] }
  push(node) {
    const a = this.a
    a.push(node)
    let i = a.length - 1
    while (i > 0) {
      const p = (i - 1) >> 1
      if (a[p].d <= a[i].d) break
      ;[a[p], a[i]] = [a[i], a[p]]
      i = p
    }
  }
  pop() {
    const a = this.a
    const top = a[0]
    const last = a.pop()
    if (a.length) {
      a[0] = last
      let i = 0
      for (;;) {
        const l = i * 2 + 1
        const r = l + 1
        let m = i
        if (l < a.length && a[l].d < a[m].d) m = l
        if (r < a.length && a[r].d < a[m].d) m = r
        if (m === i) break
        ;[a[m], a[i]] = [a[i], a[m]]
        i = m
      }
    }
    return top
  }
  get size() { return this.a.length }
}

/**
 * @param {Float32Array} cost per-tile entry cost (>= 1)
 * @param {Array<[number,number]>} goals tiles enemies walk toward
 * @returns {{dist: Float32Array, next: Int16Array}} next = index of tile to step to (-1 at goal)
 */
export function computeFlowField(cost, goals) {
  const n = GRID_W * GRID_H
  // Float64 + epsilon: with Float32 storage a distance could round UP, making
  // `nd < dist[ni]` true forever and looping the heap on large maps.
  const dist = new Float64Array(n).fill(Infinity)
  const next = new Int32Array(n).fill(-1)
  const heap = new Heap()

  for (const [gx, gy] of goals) {
    const gi = gy * GRID_W + gx
    dist[gi] = 0
    heap.push({ i: gi, d: 0 })
  }

  while (heap.size) {
    const { i, d } = heap.pop()
    if (d > dist[i]) continue
    const x = i % GRID_W
    const y = (i / GRID_W) | 0
    for (const [dx, dy] of DIRS) {
      const nx = x + dx
      const ny = y + dy
      if (nx < 0 || ny < 0 || nx >= GRID_W || ny >= GRID_H) continue
      // Prevent diagonal corner-cutting through two blocked orthogonals.
      if (dx !== 0 && dy !== 0) {
        const cA = cost[y * GRID_W + nx]
        const cB = cost[ny * GRID_W + x]
        if (cA > 8 && cB > 8) continue
      }
      const ni = ny * GRID_W + nx
      const step = (dx !== 0 && dy !== 0 ? 1.4142 : 1) * cost[ni]
      const nd = d + step
      if (nd < dist[ni] - 1e-6) {
        dist[ni] = nd
        next[ni] = i
        heap.push({ i: ni, d: nd })
      }
    }
  }
  return { dist, next }
}
