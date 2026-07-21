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
import { computed, defineAsyncComponent } from 'vue'
import { useRoute, RouterLink } from 'vue-router'

import { projects } from '../data/projects'

// 1) get slug from route
const route = useRoute()

// 2) look up project metadata
const project = computed(() =>
  projects.find(p => p.slug === route.params.slug)
)

// Each case study is its own chunk. This prevents one project visit (and the
// initial site load) from downloading every project's images, charts, games,
// Stockfish integration, and three.js code.
const componentMap = {
  'lol-match-predictor': defineAsyncComponent(() => import('../project-pages/LolMatchPredictorDetail.vue')),
  sportslux: defineAsyncComponent(() => import('../project-pages/SportsluxDetail.vue')),
  chessEngine: defineAsyncComponent(() => import('../project-pages/ChessEngineDetail.vue')),
  'sports-booking': defineAsyncComponent(() => import('../project-pages/SportsBookingDetail.vue')),
  'asset-data-integration': defineAsyncComponent(() => import('../project-pages/AssetDataIntegrationDetail.vue')),
  drone: defineAsyncComponent(() => import('../project-pages/DroneDetail.vue')),
  'wealth-pathways-au': defineAsyncComponent(() => import('../project-pages/WealthPathwaysWorkbookDetail.vue'))
}

const DefaultProjectDetail = defineAsyncComponent(() =>
  import('../project-pages/DefaultProjectDetail.vue')
)

// 4) choose component; default if no custom one defined
const detailComponent = computed(
  () => componentMap[route.params.slug] || DefaultProjectDetail
)
</script>
