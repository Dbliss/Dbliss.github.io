<template>
  <section class="projects-page">
    <div class="section-label">Projects</div>
    <h1 class="section-title">Selected work</h1>
    <p class="section-sub">Each project has a focused case study. Click through to see the problem, approach, and outcome.</p>

    <div class="grid cols-3">
      <ProjectCard v-for="p in list" :key="p.slug" :project="p" />
    </div>
  </section>
</template>

<script setup>
import { projects as all } from '../data/projects'
import ProjectCard from '../components/ProjectCard.vue'

const list = all
</script>

<style scoped>
.projects-page{padding-top:12px}.projects-page .grid{margin-top:42px}.projects-page :deep(.card){display:flex;flex-direction:column;min-height:100%}.projects-page :deep(.card>div:last-child){margin-top:auto}
</style>
