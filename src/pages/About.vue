<template>
  <section class="grid cols-2">
    <div class="card">
      <div class="section-label">About</div>
      <h1 class="section-title">How I work</h1>
      <p class="section-sub">
        I like systems that are robust enough for production but friendly enough for teammates to extend.
        I ship in small increments with clear interfaces and sensible tests.
      </p>

      <ul style="padding-left:18px;color:var(--muted)">
        <li><strong>Clarify the problem</strong> – constraints, success metrics, and trade‑offs.</li>
        <li><strong>Design the system</strong> – clean boundaries, safe migrations, boring tech where it matters.</li>
        <li><strong>Ship in slices</strong> – CI/CD, observability, docs.</li>
      </ul>
    </div>

    <aside class="card">
      <div class="section-label">Tech I enjoy</div>
      <ul style="padding-left:18px;color:var(--muted)">
        <li>Frontend: Vue 3 / TypeScript, component-driven UI, accessibility</li>
        <li>Backend: Python (FastAPI), Node, Postgres/Redis, background jobs</li>
        <li>Data/ML: Pandas, scikit-learn, evaluation, model serving</li>
      </ul>
      <div style="margin-top:14px">
        <RouterLink class="btn" to="/projects">See projects</RouterLink>
      </div>
    </aside>
  </section>
</template>

<script setup>
import { RouterLink } from 'vue-router'
</script>
