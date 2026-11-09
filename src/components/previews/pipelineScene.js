// Project tile for Asset Data Integration, reduced to one idea: messy records drift in from the left,
// pass through a single line, and leave as clean ordered rows. Two colours, no labels.

const GROUND = '#0b2530'
const GROUND_EDGE = '#061419'
const RAW = '#efe4cf'
const CLEAN = '#6fe0cf'

const LANES = 5
const CYCLES_PER_SECOND = 0.065

const seeded = (() => {
  let a = 2201
  return () => {
    a = (a * 1664525 + 1013904223) >>> 0
    return a / 4294967296
  }
})()

const makeRecord = (phase, lane, rejected) => ({
  phase,
  lane,
  rejected,
  spreadY: (seeded() - 0.5) * 2,
  spreadX: seeded() - 0.5,
  wobble: 0.5 + seeded() * 1.2,
  radius: 1.3 + seeded() * 3.2,
  alpha: 0.35 + seeded() * 0.55
})

// Clean records are evenly phased so the rows come out perfectly spaced.
const RECORDS = [
  ...Array.from({ length: 95 }, (_, i) => makeRecord(i / 95, i % LANES, false)),
  // A few never make it past the line: the ones the pipeline filters out.
  ...Array.from({ length: 16 }, () => makeRecord(seeded(), 2, true))
]

const smooth = (t) => t * t * (3 - 2 * t)

export function drawPipeline (ctx, W, H, time) {
  const gateX = Math.round(W * 0.5) + 0.5
  const centerY = H * 0.4
  const laneGap = Math.max(11, H * 0.05)
  const spreadH = H * 0.34
  const unit = Math.min(1.3, Math.max(0.7, W / 700))

  const bg = ctx.createRadialGradient(gateX, centerY, 0, gateX, centerY, Math.max(W, H) * 0.7)
  bg.addColorStop(0, GROUND)
  bg.addColorStop(1, GROUND_EDGE)
  ctx.globalAlpha = 1
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, W, H)

  const laneY = (lane) => Math.round(centerY + (lane - (LANES - 1) / 2) * laneGap) + 0.5

  // Faint rails for the clean side.
  ctx.strokeStyle = CLEAN
  ctx.globalAlpha = 0.12
  ctx.lineWidth = 1
  ctx.beginPath()
  for (let lane = 0; lane < LANES; lane++) {
    ctx.moveTo(gateX, laneY(lane))
    ctx.lineTo(W, laneY(lane))
  }
  ctx.stroke()
  ctx.globalAlpha = 1

  const travel = W * 1.12
  const start = -W * 0.06
  const size = Math.max(3, Math.round(5 * unit))

  for (const record of RECORDS) {
    const u = (time * CYCLES_PER_SECOND + record.phase) % 1
    const x = start + u * travel

    if (x < gateX) {
      const toGate = Math.max(0, x / gateX)
      const settle = smooth(toGate)
      const looseY = centerY + record.spreadY * spreadH + Math.sin(time * record.wobble + record.phase * 40) * H * 0.012
      const y = looseY + (laneY(record.lane) - looseY) * (settle * settle)
      const px = x + record.spreadX * W * 0.05 * (1 - settle)
      const fade = record.rejected ? 1 - smooth(Math.max(0, (toGate - 0.82) / 0.18)) : 1
      ctx.globalAlpha = record.alpha * fade
      ctx.fillStyle = RAW
      ctx.beginPath()
      ctx.arc(px, y, record.radius * unit * (1 - settle * 0.25), 0, Math.PI * 2)
      ctx.fill()
    } else if (!record.rejected) {
      ctx.globalAlpha = 1
      ctx.fillStyle = CLEAN
      ctx.fillRect(Math.round(x), Math.round(laneY(record.lane) - size / 2), size, size)
    }
  }

  ctx.globalAlpha = 0.8
  ctx.fillStyle = RAW
  ctx.fillRect(gateX - 0.5, H * 0.1, 1, H * 0.6)
  ctx.globalAlpha = 1
}
