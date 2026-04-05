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
          'is-complete': index < currentIndex,
          'is-disabled': stageDisabledKeys.includes(stage.key)
        }"
        :disabled="stageDisabledKeys.includes(stage.key)"
        @click="$emit('select-stage', stage.key)"
      >
        <span class="wealth-progress__index">{{ index + 1 }}</span>
        <span class="wealth-progress__label">{{ stage.label }}</span>
      </button>
    </div>
    <div v-if="activeSubsteps.length && substepHostIndex >= 0" class="wealth-progress__substeps-row">
      <div
        v-for="stage in stages"
        :key="`substeps-${stage.key}`"
        class="wealth-progress__substeps-slot"
      >
        <div
          v-if="stage.key === substepHostKey"
          class="wealth-progress__substeps"
        >
          <button
            v-for="substep in activeSubsteps"
            :key="substep.key"
            type="button"
            class="wealth-progress__substep"
            :class="{
              'is-active': substep.key === currentSubstep,
              'is-complete': completedSubstepKeys.includes(substep.key),
              'is-disabled': substepDisabledKeys.includes(substep.key)
            }"
            :disabled="substepDisabledKeys.includes(substep.key)"
            @click="$emit('select-substep', substep.key)"
          >
            {{ substep.label }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  stages: { type: Array, default: () => [] },
  currentStage: { type: String, required: true },
  currentSubstep: { type: String, default: '' },
  substeps: { type: Array, default: () => [] },
  substepHostKey: { type: String, default: '' },
  stageDisabledKeys: { type: Array, default: () => [] },
  completedSubstepKeys: { type: Array, default: () => [] },
  substepDisabledKeys: { type: Array, default: () => [] }
})

defineEmits(['select-stage', 'select-substep'])

const currentIndex = computed(() =>
  props.stages.findIndex(stage => stage.key === props.currentStage)
)

const activeSubsteps = computed(() =>
  props.currentStage === props.substepHostKey ? props.substeps : []
)

const substepHostIndex = computed(() =>
  props.stages.findIndex(stage => stage.key === props.substepHostKey)
)
</script>

<style scoped>
.wealth-progress {
  padding: 0.8rem;
}

.wealth-progress__row {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.65rem;
}

.wealth-progress__substeps-row {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.65rem;
  margin-top: 0.65rem;
}

.wealth-progress__substeps-slot {
  position: relative;
  min-width: 0;
  overflow: visible;
}

.wealth-progress__substeps {
  position: relative;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  flex-wrap: nowrap;
  gap: 0.5rem;
  width: max-content;
  min-width: calc(100% + 5rem);
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

.wealth-progress__step:disabled,
.wealth-progress__substep:disabled {
  cursor: not-allowed;
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

.wealth-progress__substep {
  flex: 0 0 auto;
  min-height: 2.2rem;
  padding: 0.4rem 0.75rem;
  border-radius: 12px;
  border: 1px solid rgba(154, 174, 204, 0.2);
  background: rgba(244, 248, 255, 0.92);
  color: #466486;
  font: inherit;
  font-size: 0.82rem;
  font-weight: 600;
  white-space: nowrap;
  cursor: pointer;
}

.wealth-progress__substep.is-active {
  border-color: rgba(45, 118, 212, 0.3);
  background: rgba(216, 234, 255, 0.98);
  color: #153355;
}

.wealth-progress__substep.is-complete:not(.is-active) {
  border-color: rgba(16, 185, 129, 0.24);
  background: rgba(220, 252, 231, 0.62);
}

.wealth-progress__step.is-disabled:not(.is-active),
.wealth-progress__substep.is-disabled:not(.is-active) {
  opacity: 0.5;
}

@media (max-width: 780px) {
  .wealth-progress__row {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .wealth-progress__substeps-row {
    display: none;
  }

  .wealth-progress__step {
    justify-content: flex-start;
  }

  .wealth-progress__substeps {
    left: 0;
    transform: none;
    flex-wrap: nowrap;
    width: 100%;
    min-width: 0;
    overflow-x: auto;
    padding-bottom: 0.2rem;
    scrollbar-width: thin;
    -webkit-overflow-scrolling: touch;
    justify-content: flex-start;
  }
}
</style>
