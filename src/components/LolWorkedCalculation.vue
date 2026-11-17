<template>
  <aside class="calculation" :class="{ active }" :aria-label="calculation.title">
    <h4>{{ calculation.title }}</h4>
    <p>{{ calculation.explanation }}</p>
    <div v-for="(line, i) in calculation.lines" :key="i" class="equation-row">
      <span class="equation-label">{{ line.label }}</span>
      <!-- MathML is authored locally in lolModelScenes.js; no user HTML is accepted. -->
      <div class="equation" v-html="line.math" />
    </div>
    <p class="interpretation">{{ calculation.interpretation }}</p>
  </aside>
</template>

<script setup>
defineProps({
  calculation: { type: Object, required: true },
  active: Boolean
})
</script>

<style scoped>
.calculation {
  margin: 12px 0 22px 17px;
  padding: clamp(16px, 2vw, 24px);
  border: 1px solid #dce0ea;
  border-left: 3px solid #c9cde0;
  border-radius: 4px 12px 12px 4px;
  background: #fff;
  color: #111632;
  transition: border-color 0.3s ease;
}
.calculation.active { border-left-color: #6858e8; }
h4 { margin: 0 0 10px; font-size: 1.06rem; line-height: 1.4; }
p { margin: 0; font-size: 0.95rem; line-height: 1.6; }
.equation-row { margin-top: 18px; }
.equation-label {
  display: block;
  margin-bottom: 8px;
  font-size: 0.72rem;
  font-weight: 650;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #626980;
}
.equation {
  padding: 10px 0;
  overflow-x: auto;
  font-size: clamp(1.1rem, 1.6vw, 1.3rem);
}
.equation :deep(math) {
  margin: 0;
  font-family: 'Cambria Math', 'STIX Two Math', 'Latin Modern Math', math;
}
.interpretation { margin-top: 18px; padding-top: 14px; border-top: 1px solid #eceef4; }
@media (prefers-reduced-motion: reduce) {
  .calculation { transition: none; }
}
</style>
