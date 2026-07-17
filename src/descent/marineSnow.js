// Marine snow on a 2D canvas — cheap depth-reactive particle drift for the
// descent homepage. Particles rise slowly (we're the one sinking), fade in
// below the surface chop and thin out through the deep kilometres.
const TAU = Math.PI * 2

const smooth = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

export function createMarineSnow(canvas, opts = {}) {
  const ctx = canvas.getContext('2d')
  const count = opts.mobile ? 70 : 150
  let w = 0
  let h = 0
  let dpr = 1
  let rafId = 0
  let depth = 0
  let last = 0

  const parts = []
  for (let i = 0; i < count; i++) {
    parts.push({
      x: Math.random(),
      y: Math.random(),
      r: 0.5 + Math.random() * 1.6,
      v: 0.018 + Math.random() * 0.05, // viewport-heights per second, upward
      wob: Math.random() * TAU,
      ws: 0.2 + Math.random() * 0.7,
      a: 0.2 + Math.random() * 0.55
    })
  }

  function resize(width, height) {
    dpr = Math.min(window.devicePixelRatio || 1, 2)
    w = width
    h = height
    canvas.width = Math.round(w * dpr)
    canvas.height = Math.round(h * dpr)
  }

  function setDepth(d) {
    depth = d
  }

  function frame(now) {
    rafId = requestAnimationFrame(frame)
    const dt = Math.min((now - last) / 1000, 0.05)
    last = now

    const vis = smooth(60, 320, depth) * (1 - 0.55 * smooth(2200, 5200, depth))
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, w, h)
    if (vis <= 0.01) return

    ctx.fillStyle = '#cfe9f2'
    for (const p of parts) {
      p.wob += p.ws * dt
      p.y -= p.v * dt
      if (p.y < -0.02) {
        p.y = 1.02
        p.x = Math.random()
      }
      ctx.globalAlpha = p.a * vis
      ctx.beginPath()
      ctx.arc((p.x + Math.sin(p.wob) * 0.006) * w, p.y * h, p.r, 0, TAU)
      ctx.fill()
    }
    ctx.globalAlpha = 1
  }

  function start() {
    last = performance.now()
    rafId = requestAnimationFrame(frame)
  }

  function dispose() {
    cancelAnimationFrame(rafId)
  }

  return { resize, setDepth, start, dispose }
}
