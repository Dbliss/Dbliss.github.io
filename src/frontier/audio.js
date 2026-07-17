// Tiny WebAudio synth for game feedback. No samples, just oscillators.

export function createAudio() {
  let ctx = null
  let muted = false
  let lastPlay = {}

  function ensure() {
    if (!ctx) {
      try {
        ctx = new (window.AudioContext || window.webkitAudioContext)()
      } catch { ctx = null }
    }
    if (ctx && ctx.state === 'suspended') ctx.resume()
  }

  function blip(freq, dur, type = 'square', vol = 0.05, slide = 0) {
    if (!ctx || muted) return
    const t = ctx.currentTime
    const o = ctx.createOscillator()
    const g = ctx.createGain()
    o.type = type
    o.frequency.setValueAtTime(freq, t)
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t + dur)
    g.gain.setValueAtTime(vol, t)
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    o.connect(g).connect(ctx.destination)
    o.start(t)
    o.stop(t + dur + 0.02)
  }

  const sounds = {
    build: () => { blip(220, 0.08, 'triangle', 0.06); blip(330, 0.12, 'triangle', 0.05) },
    swing: () => blip(320, 0.12, 'sawtooth', 0.02, -180),
    swordHit: () => { blip(700, 0.06, 'square', 0.04, -250); blip(240, 0.1, 'sawtooth', 0.04, -80) },
    chop: () => blip(190, 0.09, 'square', 0.06, -60),
    mine: () => { blip(1100, 0.05, 'square', 0.03, -400); blip(150, 0.08, 'sawtooth', 0.04, -30) },
    deny: () => blip(140, 0.15, 'sawtooth', 0.04, -60),
    arrow: () => blip(900, 0.05, 'square', 0.015, -300),
    cannon: () => blip(90, 0.25, 'sawtooth', 0.06, -50),
    zap: () => blip(1400, 0.09, 'sawtooth', 0.025, -900),
    kill: () => blip(500, 0.07, 'triangle', 0.03, -200),
    crumble: () => blip(70, 0.3, 'sawtooth', 0.07, -30),
    horn: () => { blip(160, 0.5, 'sawtooth', 0.05); blip(240, 0.5, 'sawtooth', 0.03) },
    victory: () => { blip(440, 0.15, 'triangle', 0.05); setTimeout(() => blip(550, 0.15, 'triangle', 0.05), 120); setTimeout(() => blip(660, 0.25, 'triangle', 0.05), 240) },
    upgrade: () => { blip(520, 0.1, 'triangle', 0.05); setTimeout(() => blip(780, 0.15, 'triangle', 0.05), 90) },
    era: () => { [330, 415, 495, 660].forEach((f, i) => setTimeout(() => blip(f, 0.3, 'triangle', 0.06), i * 140)) },
    defeat: () => { [330, 260, 200, 150].forEach((f, i) => setTimeout(() => blip(f, 0.35, 'sawtooth', 0.05), i * 200)) }
  }

  // rate limits so hordes don't create noise walls
  const minGap = { arrow: 0.06, kill: 0.05, zap: 0.1, cannon: 0.12, chop: 0.1, mine: 0.1, swing: 0.1 }

  function play(name) {
    if (!ctx || muted || !sounds[name]) return
    const now = performance.now() / 1000
    const gap = minGap[name] || 0
    if (gap && lastPlay[name] && now - lastPlay[name] < gap) return
    lastPlay[name] = now
    sounds[name]()
  }

  return {
    ensure,
    play,
    setMuted(m) { muted = m },
    get muted() { return muted },
    destroy() { if (ctx) ctx.close().catch(() => {}) }
  }
}
