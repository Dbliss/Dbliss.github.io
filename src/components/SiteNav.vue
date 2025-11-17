<template>
  <header class="nav">
    <div class="brand">
      <div class="logo">DB</div>
      <div>
        <small>Portfolio</small>
        <div class="mono">Dillon Bliss‑Henaghan</div>
      </div>
    </div>

    <nav class="navlinks">
      <RouterLink to="/">Home</RouterLink>
      <RouterLink to="/projects">Projects</RouterLink>
      <RouterLink to="/about">About</RouterLink>
      <RouterLink to="/contact">Contact</RouterLink>
    </nav>

    <div class="actions">
      <a v-for="s in socials" :key="s.label" :href="s.href" class="btn" target="_blank" rel="noreferrer noopener">
        <span v-if="s.icon==='in'">in</span>
        <span v-else>{{ s.icon }}</span>
        <span class="sr-only">{{ s.label }}</span>
      </a>
      <RouterLink class="btn primary" to="/projects">View projects</RouterLink>
    </div>
  </header>
</template>

<script setup>
import { socials } from '../data/socials'
</script>

<style scoped>
.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
</style>
