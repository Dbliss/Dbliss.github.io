<template>
  <section>
    <div class="section-label">Projects</div>
    <h2 class="section-title">All projects</h2>
    <p class="section-sub">Each project has a focused case study. Click through to see the problem, approach, and outcome.</p>

    <div class="card" style="margin:16px 0">
      <div class="section-label">Categories</div>
      <ul style="color:var(--muted);padding-left:18px;margin:10px 0">
        <li><strong>External:</strong> Paid, customer-facing services delivered to clients.</li>
        <li><strong>Internal:</strong> Tools built for in-house teams and operations.</li>
        <li><strong>Personal project:</strong> Self-initiated exploration and learning.</li>
      </ul>
    </div>

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
