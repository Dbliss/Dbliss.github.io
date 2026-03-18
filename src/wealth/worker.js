import { simulateWealthPathways } from './simulator.js'

self.onmessage = (event) => {
  const { id, payload } = event.data || {}

  try {
    const result = simulateWealthPathways(payload)
    self.postMessage({ id, ok: true, result })
  } catch (error) {
    self.postMessage({
      id,
      ok: false,
      error: error instanceof Error ? error.message : 'Simulation failed'
    })
  }
}
