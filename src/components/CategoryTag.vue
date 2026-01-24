<template>
  <span
    v-if="category"
    class="tag tag--category"
    :data-category="category"
    :data-tooltip="tooltip || null"
    tabindex="0"
  >
    {{ category }}
  </span>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  category: { type: String, default: '' }
})

const tooltip = computed(() => {
  const map = {
    External: 'Paid, customer-facing services delivered to clients.',
    Internal: 'Tools built for in-house teams and operations.',
    'Personal project': 'Self-initiated exploration and learning.'
  }

  return map[props.category] || ''
})
</script>
