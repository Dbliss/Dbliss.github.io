<template>
  <article class="card">
    <div class="tags" v-if="project.tags?.length">
      <span class="tag" v-for="t in project.tags" :key="t">{{ t }}</span>
    </div>

    <h3 style="margin:8px 0 4px">{{ project.title }}</h3>
    <p style="margin:10px 0 12px; color:var(--muted)">{{ project.excerpt }}</p>

    <div class="tags" style="margin-bottom:12px">
      <span class="tag" v-for="st in project.stack" :key="st">{{ st }}</span>
    </div>

    <div style="display:flex;gap:10px;flex-wrap:wrap">
      <RouterLink class="btn primary" :to="{ name:'project', params:{ slug: project.slug } }">Read case study</RouterLink>
      <a v-if="project.repoUrl" class="btn" :href="project.repoUrl" target="_blank" rel="noreferrer noopener">Code ↗</a>
      <a v-if="project.liveUrl" class="btn" :href="project.liveUrl" target="_blank" rel="noreferrer noopener">Live demo ↗</a>
    </div>
  </article>
</template>

<script setup>
defineProps({
  project: { type: Object, required: true }
})
</script>
