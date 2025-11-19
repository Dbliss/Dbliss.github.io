<template>
  <section class="card">
    <div class="section-label">Contact</div>
    <h1 class="section-title">Have a project in mind?</h1>
    <p class="section-sub">
      I’m happy to chat about collaborations or interesting problems you’re stuck on.
    </p>

    <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:8px">
      <a class="btn primary" :href="'mailto:' + email + '?subject=Project%20inquiry'">Email me</a>
      <a class="btn" v-for="s in socials" :key="s.label" :href="s.href" target="_blank" rel="noreferrer noopener">
        {{ s.label }} ↗
      </a>
    </div>

    <p style="color:var(--muted);margin-top:10px">Prefer async? Send context, links; I’ll reply with concrete next steps.</p>
  </section>
</template>

<script setup>
import { socials } from '../data/socials'
const email = 'you@example.com'
</script>
