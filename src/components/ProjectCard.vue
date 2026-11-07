<template>
  <article
    class="pt"
    :data-category="project.category || null"
    @mouseenter="hovered = true"
    @mouseleave="hovered = false"
  >
    <ProjectMedia :slug="project.slug" :active="hovered" class="pt-media" />

    <!-- Whole tile is the link to the case study -->
    <RouterLink class="pt-link" :to="caseStudy">
      <span class="pt-sr">{{ project.title }} case study</span>
    </RouterLink>

    <div class="pt-label" aria-hidden="true">{{ project.title }}</div>

    <div class="pt-details" aria-hidden="true">
      <dl class="pt-meta">
        <dt>Project</dt><dd class="pt-title">{{ project.title }}</dd>
        <dt>Type</dt><dd>{{ typeLabel }}</dd>
        <dt>Focus</dt><dd>{{ (project.groups || project.tags || []).join(', ') }}</dd>
        <dt>Stack</dt><dd>{{ project.stack.slice(0, 4).join(', ') }}</dd>
      </dl>
      <p class="pt-excerpt">{{ project.excerpt }}</p>
      <span class="pt-cta">View case study →</span>
    </div>

    <div v-if="project.repoUrl || project.liveUrl" class="pt-ext">
      <a v-if="project.repoUrl" :href="project.repoUrl" target="_blank" rel="noreferrer noopener">Source ↗</a>
      <a v-if="project.liveUrl" :href="project.liveUrl" target="_blank" rel="noreferrer noopener">Live ↗</a>
    </div>
  </article>
</template>

<script setup>
import { computed, ref } from 'vue'
import ProjectMedia from './ProjectMedia.vue'

const props = defineProps({
  project: { type: Object, required: true }
})

// Tracked on the whole tile: the link and detail overlays sit on top of the media,
// so the media element itself never receives the pointer.
const hovered = ref(false)

const caseStudy = computed(() => ({ name: 'project', params: { slug: props.project.slug } }))

const TYPE = { External: 'Client work', Internal: 'Internal tool (in production)', 'Personal project': 'Personal project' }
const typeLabel = computed(() => TYPE[props.project.category] || props.project.category || '')
</script>

<style scoped>
.pt {
  --tone-rgb: 104, 88, 232;
  --mono: ui-monospace, "SFMono-Regular", "JetBrains Mono", Menlo, Consolas, monospace;
  position: relative;
  aspect-ratio: 16 / 11;
  overflow: hidden;
  background: #111;
  isolation: isolate;
}
.pt[data-category="External"] { --tone-rgb: 36, 104, 184; }
.pt[data-category="Internal"] { --tone-rgb: 196, 132, 24; }

.pt-media { transition: transform 1.1s cubic-bezier(.2, .7, .2, 1), filter .6s ease; }

/* Stretched link covering the tile */
.pt-link { position: absolute; inset: 0; z-index: 2; }
.pt-link:focus-visible { outline: 2px solid #fff; outline-offset: -6px; }
.pt-sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }

/* Resting label */
.pt-label {
  position: absolute;
  left: 20px;
  bottom: 18px;
  z-index: 1;
  padding: 6px 9px;
  background: rgba(255, 255, 255, .92);
  color: #111;
  font: 500 12px/1 var(--mono);
  letter-spacing: .04em;
  text-transform: uppercase;
  pointer-events: none;
  transition: opacity .35s ease;
}

/* Hover details */
.pt-details {
  position: absolute;
  inset: 0;
  z-index: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 8% 10%;
  color: #fff;
  font: 500 13px/1.45 var(--mono);
  letter-spacing: .03em;
  background: linear-gradient(90deg, rgba(8, 8, 16, .82), rgba(8, 8, 16, .55) 60%, rgba(8, 8, 16, .35));
  opacity: 0;
  pointer-events: none;
  transition: opacity .45s ease;
}
.pt-meta { margin: 0; display: grid; grid-template-columns: max-content 1fr; gap: 4px 22px; max-width: 560px; text-transform: uppercase; }
.pt-meta dt { color: rgba(255, 255, 255, .5); }
.pt-meta dd { margin: 0; }
.pt-meta > * { opacity: 0; transform: translateY(6px); transition: opacity .45s ease, transform .45s ease; }
.pt-title { font-weight: 700; }
.pt-excerpt {
  margin: 22px 0 0;
  max-width: 520px;
  font: 400 14px/1.55 system-ui, sans-serif;
  letter-spacing: 0;
  color: rgba(255, 255, 255, .82);
  opacity: 0;
  transition: opacity .45s ease .12s;
}
.pt-cta { margin-top: 20px; text-transform: uppercase; font-size: 12px; opacity: 0; transition: opacity .45s ease .18s; }

/* External links sit above the stretched link */
.pt-ext { position: absolute; top: 18px; right: 20px; z-index: 3; display: flex; gap: 8px; opacity: 0; transition: opacity .35s ease; }
.pt-ext a {
  padding: 6px 9px;
  background: rgba(255, 255, 255, .92);
  color: #111;
  font: 500 12px/1 var(--mono);
  letter-spacing: .04em;
  text-transform: uppercase;
  text-decoration: none;
}
.pt-ext a:hover { background: #fff; }

/* Reveal */
.pt:hover .pt-media,
.pt:focus-within .pt-media { transform: scale(1.025); }
.pt:hover .pt-details,
.pt:focus-within .pt-details,
.pt:hover .pt-ext,
.pt:focus-within .pt-ext { opacity: 1; }
.pt:hover .pt-label,
.pt:focus-within .pt-label { opacity: 0; }
.pt:hover .pt-meta > *,
.pt:focus-within .pt-meta > * { opacity: 1; transform: none; }
.pt:hover .pt-excerpt,
.pt:focus-within .pt-excerpt,
.pt:hover .pt-cta,
.pt:focus-within .pt-cta { opacity: 1; }
.pt-meta > :nth-child(3), .pt-meta > :nth-child(4) { transition-delay: .04s; }
.pt-meta > :nth-child(5), .pt-meta > :nth-child(6) { transition-delay: .08s; }
.pt-meta > :nth-child(7), .pt-meta > :nth-child(8) { transition-delay: .12s; }

/* Touch screens can't hover: keep the details visible along the bottom */
@media (hover: none) {
  .pt-label { display: none; }
  .pt-details {
    opacity: 1;
    justify-content: flex-end;
    padding: 18px;
    font-size: 11px;
    background: linear-gradient(0deg, rgba(8, 8, 16, .85), rgba(8, 8, 16, .2) 65%, transparent);
  }
  .pt-meta > *, .pt-cta { opacity: 1; transform: none; }
  .pt-excerpt { display: none; }
  .pt-cta { margin-top: 10px; }
  .pt-ext { opacity: 1; top: 12px; right: 12px; }
}

@media (max-width: 640px) {
  .pt-meta { gap: 2px 14px; }
}

@media (prefers-reduced-motion: reduce) {
  .pt-media, .pt-meta > * { transition: none; }
  .pt:hover .pt-media { transform: none; }
}
</style>
