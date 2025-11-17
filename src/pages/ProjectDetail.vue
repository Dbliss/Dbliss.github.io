<template>
  <article>
    <RouterLink to="/projects" class="btn" style="margin-bottom:14px;display:inline-block">← Back to projects</RouterLink>

    <div class="grid cols-2">
      <div class="card">
        <div class="section-label">Case study</div>
        <h1 style="margin:4px 0 8px">{{ project.title }}</h1>
        <p class="section-sub">{{ project.tagline }}</p>

        <div class="tags" style="margin:8px 0 12px">
          <span class="tag" v-for="t in project.tags" :key="t">{{ t }}</span>
        </div>

        <div class="mono" style="font-size:.9rem;color:var(--muted)">
          <strong>Stack:</strong> {{ project.stack.join(' · ') }}
        </div>

        <div style="margin-top:12px;white-space:pre-wrap">{{ cleanedDescription }}</div>

        <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:16px">
          <a v-if="project.repoUrl" class="btn" :href="project.repoUrl" target="_blank" rel="noreferrer noopener">Code ↗</a>
          <a v-if="project.liveUrl" class="btn" :href="project.liveUrl" target="_blank" rel="noreferrer noopener">Live demo ↗</a>
        </div>
      </div>

      <aside class="card">
        <div class="section-label">Summary</div>
        <ul style="color:var(--muted);padding-left:18px;margin:10px 0">
          <li><strong>Role:</strong> Individual contributor / project owner</li>
          <li><strong>Focus:</strong> Problem → decisions → outcome</li>
          <li><strong>Code ownership:</strong> <span v-if="project.repoUrl">Open-source</span><span v-else>Proprietary (anonymised)</span></li>
        </ul>

        <div class="section-label" style="margin-top:10px">Links</div>
        <div class="tags" style="margin-top:6px">
          <a v-if="project.repoUrl" :href="project.repoUrl" class="tag" target="_blank">GitHub</a>
          <a v-if="project.liveUrl" :href="project.liveUrl" class="tag" target="_blank">Live demo</a>
        </div>
      </aside>
    </div>
  </article>
</template>

<script setup>
import { computed } from 'vue'
import { projects } from '../data/projects'
import { useRoute, RouterLink } from 'vue-router'

const route = useRoute()
const project = projects.find(p => p.slug === route.params.slug)

if (!project) {
  // naive redirect if slug is invalid
  window.location.hash = '#/projects'
}

const cleanedDescription = computed(() =>
  (project?.description || '').replace(/^\s+|\s+$/g, '')
)
</script>
