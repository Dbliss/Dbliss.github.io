import { onBeforeUnmount, onMounted, watch } from 'vue'

// A clock that only runs while `isActive()` is true (the project tile is hovered).
// Time is kept between hovers, so an animation pauses where it was and carries on from there.
// Under prefers-reduced-motion it never starts and each preview stays on its resting frame.
export function useHoverClock (isActive, onFrame) {
  let frame = 0
  let last = 0
  let time = 0

  const reduceMotion = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

  function loop (now) {
    frame = requestAnimationFrame(loop)
    const dt = Math.min(Math.max(0, now - last) / 1000, 0.1)
    last = now
    time += dt
    onFrame(time, dt)
  }

  function start () {
    if (frame || reduceMotion) return
    last = performance.now()
    frame = requestAnimationFrame(loop)
  }

  function stop () {
    cancelAnimationFrame(frame)
    frame = 0
  }

  watch(isActive, (on) => (on ? start() : stop()))
  onMounted(() => { if (isActive()) start() })
  onBeforeUnmount(stop)

  return { time: () => time }
}
