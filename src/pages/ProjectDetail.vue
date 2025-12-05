<template>
  <article v-if="project">
    <component :is="detailComponent" :project="project" />
  </article>

  <article v-else class="card">
    <RouterLink to="/projects" class="btn" style="margin-bottom:14px;display:inline-block">
      ← Back to projects
    </RouterLink>
    <h1 style="margin:4px 0 8px">Project not found</h1>
    <p class="section-sub">The requested project slug doesn’t match anything in <code>projects.js</code>.</p>
  </article>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute, RouterLink } from 'vue-router'

import { projects } from '../data/projects'
import DefaultProjectDetail from '../project-pages/DefaultProjectDetail.vue'
import LolMatchPredictorDetail from '../project-pages/LolMatchPredictorDetail.vue'

// 1) get slug from route
const route = useRoute()

// 2) look up project metadata
const project = computed(() =>
  projects.find(p => p.slug === route.params.slug)
)

// 3) map each slug to a custom component
const componentMap = {
  'lol-match-predictor': LolMatchPredictorDetail
  // later:
  // 'smart-lighting-dashboard': SmartLightingDashboardDetail,
  // 'invoice-automation': InvoiceAutomationDetail,
  // ...
}

// 4) choose component; default if no custom one defined
const detailComponent = computed(
  () => componentMap[route.params.slug] || DefaultProjectDetail
)
</script>
