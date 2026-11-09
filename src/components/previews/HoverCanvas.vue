<template>
  <canvas ref="el" class="hc" />
</template>

<script setup>
// Full-tile 2D canvas. `draw(ctx, width, height, time)` paints one frame in CSS pixels;
// it is painted once at rest and then on every frame while the tile is hovered.
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { useHoverClock } from './useHoverClock'

const props = defineProps({
  draw: { type: Function, required: true },
  active: { type: Boolean, default: false }
})

const el = ref(null)
let ctx = null
let width = 0
let height = 0
let dpr = 1
let ro = null

function paint (time) {
  if (!ctx || !width || !height) return
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  props.draw(ctx, width, height, time)
}

const clock = useHoverClock(() => props.active, paint)

onMounted(() => {
  const canvas = el.value
  ctx = canvas.getContext('2d')
  ro = new ResizeObserver(([entry]) => {
    width = entry.contentRect.width
    height = entry.contentRect.height
    dpr = Math.min(window.devicePixelRatio || 1, 2)
    canvas.width = Math.round(width * dpr)
    canvas.height = Math.round(height * dpr)
    paint(clock.time())
  })
  ro.observe(canvas)
})

onBeforeUnmount(() => ro?.disconnect())
</script>

<style scoped>
.hc { position: absolute; inset: 0; width: 100%; height: 100%; display: block; }
</style>
