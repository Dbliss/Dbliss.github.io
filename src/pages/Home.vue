<template>
  <!-- HERO -->
  <section class="hero">
    <div class="hero-main">
      <!-- Left: intro + facts -->
      <div class="hero-main-text">
        <div class="section-label">Welcome</div>
        <h1>
          This is your developer
          <strong style="color:#b7b9ff">Dillon Bliss-Henaghan</strong>
        </h1>
        <p class="section-sub">
          Software Engineer &amp; Data Scientist based in Sydney. I design and build robust systems –
          from dashboards and APIs to data/ML tools – with a focus on clarity and performance.
        </p>

        <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:10px">
          <RouterLink class="btn primary" to="/projects">View projects</RouterLink>
          <RouterLink class="btn" to="/about">About me</RouterLink>
        </div>

        <ul class="hero-facts">
          <li>📍 Sydney, Australia</li>
          <li>🛠 Python · TypeScript · Vue · Data/ML</li>
          <li>🚀 Shipping software since 2019</li>
        </ul>
      </div>

      <!-- Right: photo sitting on top of a panel, not inside its own box -->
      <div class="hero-main-photo" aria-hidden="true">
        <img class="headshot-img" :src="headshotUrl" alt="" />
      </div>
    </div>
  </section>

  <!-- EXPERIENCE + ACHIEVEMENTS SNAPSHOT -->
  <section style="margin-top:24px">
    <div class="section-label">Profile</div>
    <div class="section-title">Experience &amp; achievements</div>
    <p class="section-sub">
      A quick snapshot for hiring managers. The full timeline and details live in my resume and LinkedIn.
    </p>

    <div class="grid cols-2">
      <!-- Experience -->
      <div class="card">
        <h3 style="margin-top:0;margin-bottom:8px">Experience</h3>
        <ul style="padding-left:18px;color:var(--muted);margin:0">
          <li>
            <strong>Graduate Project Engineer · Schréder</strong> – smart city / smart lighting projects,
            integrating IoT systems with custom software.
          </li>
          <li>
            Led front-end work on a smart-lighting control dashboard (Vue 3 + TypeScript) and integrations
            with an S4i CMS.
          </li>
          <li>
            Built internal tools and automation scripts (Python) to reduce repetitive engineering work.
          </li>
        </ul>
      </div>

      <!-- Achievements -->
      <div class="card">
        <h3 style="margin-top:0;margin-bottom:8px">Selected achievements</h3>
        <ul style="padding-left:18px;color:var(--muted);margin:0">
          <li>
            Designed and shipped a production smart-lighting dashboard that significantly reduced field
            configuration time.
          </li>
          <li>
            Built a League of Legends match prediction pipeline (Elo-style ratings + Random Forest)
            achieving mid-60% accuracy with calibrated probabilities.
          </li>
          <li>
            Automated invoice generation from lesson logs, replacing manual monthly work with a repeatable,
            auditable process.
          </li>
        </ul>
      </div>
    </div>
  </section>

  <!-- FEATURED PROJECTS -->
  <section style="margin-top:24px">
    <div class="section-label">Selected work</div>
    <div class="section-title">Featured projects</div>
    <p class="section-sub">
      Three flagship case studies. See the full list on the projects page.
    </p>
    <div class="grid cols-3">
      <ProjectCard v-for="p in featured" :key="p.slug" :project="p" />
    </div>
  </section>
</template>

<script setup>
import { RouterLink } from 'vue-router'
import ProjectCard from '../components/ProjectCard.vue'
import { projects } from '../data/projects'
import headshotUrl from '../assets/dillon.png'

const featured = projects.filter(p => p.featured).slice(0, 3)
</script>
