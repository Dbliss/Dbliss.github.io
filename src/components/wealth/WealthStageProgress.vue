<template>
  <div class="wealth-progress card">
    <div class="wealth-progress__row">
      <button
        v-for="(stage, index) in stages"
        :key="stage.key"
        type="button"
        class="wealth-progress__step"
        :class="{
          'is-active': stage.key === currentStage,
          'is-complete': index < currentIndex
        }"
        @click="$emit('select-stage', stage.key)"
      >
        <span class="wealth-progress__index">{{ index + 1 }}</span>
        <span class="wealth-progress__label">{{ stage.label }}</span>
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  stages: { type: Array, default: () => [] },
  currentStage: { type: String, required: true }
})

defineEmits(['select-stage'])

const currentIndex = computed(() =>
  props.stages.findIndex(stage => stage.key === props.currentStage)
)
</script>

<style scoped>
.wealth-progress {
  position: sticky;
  top: 0.85rem;
  z-index: 8;
  padding: 0.8rem;
  backdrop-filter: blur(14px);
}

.wealth-progress__row {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.65rem;
}

.wealth-progress__step {
  display: inline-flex;
  align-items: center;
  gap: 0.65rem;
  justify-content: center;
  min-height: 3.3rem;
  padding: 0.75rem 0.9rem;
  border-radius: 18px;
  border: 1px solid rgba(154, 174, 204, 0.22);
  background: rgba(248, 251, 255, 0.9);
  color: #37567a;
  font: inherit;
  cursor: pointer;
  transition: transform 120ms ease, border-color 120ms ease, background 120ms ease;
}

.wealth-progress__step:hover {
  transform: translateY(-1px);
}

.wealth-progress__step.is-active {
  border-color: rgba(45, 118, 212, 0.32);
  background: rgba(223, 237, 255, 0.96);
  color: #153355;
}

.wealth-progress__step.is-complete:not(.is-active) {
  border-color: rgba(16, 185, 129, 0.28);
  background: rgba(220, 252, 231, 0.72);
}

.wealth-progress__index {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.7rem;
  height: 1.7rem;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.88);
  color: inherit;
  font-size: 0.82rem;
  font-weight: 700;
}

.wealth-progress__label {
  font-size: 0.92rem;
  font-weight: 600;
}

@media (max-width: 780px) {
  .wealth-progress__row {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .wealth-progress__step {
    justify-content: flex-start;
  }
}
</style>
