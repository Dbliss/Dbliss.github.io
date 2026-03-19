import { simulateWealthPathways } from './simulator.js'

export class WealthSimulationClient {
  constructor() {
    this.nextId = 0
    this.pending = new Map()
    this.worker = typeof Worker !== 'undefined'
      ? new Worker(new URL('./worker.js', import.meta.url), { type: 'module' })
      : null

    if (this.worker) {
      this.worker.onmessage = (event) => {
        const { id, ok, result, error } = event.data || {}
        const handlers = this.pending.get(id)
        if (!handlers) return
        this.pending.delete(id)
        if (ok) handlers.resolve(result)
        else handlers.reject(new Error(error || 'Simulation failed'))
      }
    }
  }

  run(payload) {
    if (!this.worker) {
      return Promise.resolve(simulateWealthPathways(payload))
    }

    const id = this.nextId
    this.nextId += 1

    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject })
      this.worker.postMessage({ id, payload })
    })
  }

  destroy() {
    if (this.worker) {
      this.worker.terminate()
      this.worker = null
    }
    this.pending.forEach(({ reject }) => reject(new Error('Simulation cancelled')))
    this.pending.clear()
  }
}
