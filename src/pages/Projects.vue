<template>
  <section>
    <div class="section-label">Projects</div>
    <h2 class="section-title">All projects</h2>
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
