<template>
  <section class="pj">
    <header class="pj-head">
      <div class="pj-bar">
        <h1 class="pj-count">Selected projects({{ list.length }})</h1>
        <div class="pj-filters" role="group" aria-label="Filter projects">
          <button
            v-for="f in filters"
            :key="f.label"
            type="button"
            :class="['pj-filter', active === f.label && 'is-active']"
            :aria-pressed="active === f.label"
            @click="active = f.label"
          >{{ f.label }}<sup>{{ f.count }}</sup></button>
        </div>
      </div>
    </header>

    <TransitionGroup tag="div" name="pj" class="pj-grid">
      <ProjectCard v-for="p in list" :key="p.slug" :project="p" />
    </TransitionGroup>
  </section>
</template>

<script setup>
import { computed, ref } from 'vue'
import { projects as all } from '../data/projects'
import ProjectCard from '../components/ProjectCard.vue'

const ALL = 'All'
// What a hiring manager screens for: shipped work, and the kind of engineering.
const GROUPS = ['In production', 'Full-stack & web', 'AI & ML', 'Data engineering', 'Algorithms & optimisation', 'Systems & embedded']

const filters = computed(() => [
  { label: ALL, count: all.length },
  ...GROUPS.map((g) => ({ label: g, count: all.filter((p) => p.groups?.includes(g)).length })).filter((f) => f.count)
])
const active = ref(ALL)

const list = computed(() => (active.value === ALL ? all : all.filter((p) => p.groups?.includes(active.value))))
</script>

<style scoped>
.pj {
  --mono: ui-monospace, "SFMono-Regular", "JetBrains Mono", Menlo, Consolas, monospace;
  background: #fff;
  padding-bottom: 8px;
}

.pj-head { padding: 72px 20px 18px; }
.pj-bar {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px 32px;
  flex-wrap: wrap;
}
.pj-count {
  margin: 0;
  color: #111;
  font: 500 13px/1 var(--mono);
  letter-spacing: .04em;
  text-transform: uppercase;
}

.pj-filters { display: flex; flex-wrap: wrap; gap: 6px 22px; }
.pj-filter {
  padding: 2px 0;
  border: 0;
  border-bottom: 1px solid transparent;
  background: none;
  color: #8a8a8a;
  font: 500 13px/1.3 var(--mono);
  letter-spacing: .04em;
  text-transform: uppercase;
  cursor: pointer;
  transition: color .2s, border-color .2s;
}
.pj-filter sup { margin-left: 2px; font-size: 9px; }
.pj-filter:hover { color: #111; }
.pj-filter.is-active { color: #111; border-bottom-color: #111; }
.pj-filter:focus-visible { outline: 1px solid #111; outline-offset: 3px; }

.pj-grid {
  position: relative;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}
/* An odd one out at the end runs the full width as a wide banner */
.pj-grid > :last-child:nth-child(odd) { grid-column: 1 / -1; aspect-ratio: 32 / 11; }

@media (max-width: 760px) {
  .pj-head { padding: 40px 16px 14px; }
  .pj-grid { grid-template-columns: 1fr; }
  .pj-grid > :last-child:nth-child(odd) { aspect-ratio: 16 / 11; }
}

.pj-enter-active { transition: opacity .4s ease; }
.pj-enter-from { opacity: 0; }
.pj-leave-active { display: none; }
.pj-move { transition: transform .5s cubic-bezier(.2, .8, .2, 1); }
</style>
