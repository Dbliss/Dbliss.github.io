<template>
  <article>
    <RouterLink
      to="/projects"
      class="btn"
      style="margin-bottom:14px;display:inline-block"
    >
      Back to projects
    </RouterLink>

    <section class="card">
      <div class="section-label">Case study</div>
      <h1 style="margin:4px 0 8px">{{ project.title }}</h1>
      <p class="section-sub">{{ project.tagline }}</p>
      <p class="section-sub" style="margin-top:10px">{{ project.excerpt }}</p>

      <div class="tags" style="margin:10px 0 12px">
        <CategoryTag :category="project.category" />
        <span class="tag" v-for="t in project.tags" :key="t">{{ t }}</span>
      </div>

      <div class="mono" style="font-size:.9rem;color:var(--muted)">
        <strong>Stack:</strong> {{ project.stack.join(' / ') }}
      </div>

      <p class="section-sub" style="margin-top:12px">Documentation pending</p>

      <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:16px">
        <a
          v-if="project.repoUrl"
          class="btn"
          :href="project.repoUrl"
          target="_blank"
          rel="noreferrer noopener"
        >
          Code
        </a>
        <a
          v-if="project.liveUrl"
          class="btn"
          :href="project.liveUrl"
          target="_blank"
          rel="noreferrer noopener"
        >
          Live demo
        </a>
      </div>
    </section>
  </article>
</template>

<script setup>
import { RouterLink } from 'vue-router'
import CategoryTag from '../components/CategoryTag.vue'

defineProps({
  project: {
    type: Object,
    required: true
  }
})
</script>
