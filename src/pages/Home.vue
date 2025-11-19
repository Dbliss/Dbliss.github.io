<template>
  <!-- HERO -->
  <section class="hero">
    <div class="hero-main">
      <!-- Left: intro + facts -->
      <div class="hero-main-text">
        <div class="section-label">Welcome</div>
        <h1>
          This is your engineer
          <strong style="color:#b7b9ff">Dillon Bliss-Henaghan</strong>
        </h1>
        <p class="section-sub">
          Mechatronic Engineer with experience working as Full-Stack Developer based in Sydney. I design and build robust systems
          from dashboards and APIs to data/ML tools with a focus on reliability and performance.
        </p>

        <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:10px">
          <RouterLink class="btn primary" to="/projects">View projects</RouterLink>
          <RouterLink class="btn" to="/about">About me</RouterLink>
        </div>

        <ul class="hero-facts">
          <li>📍 Sydney, Australia</li>
          <li>📖  End-to-end design · Frontend · Backend · System Integrations · Data/ML</li>
          <li>🛠 Python, JavaScript, TypeScript, C++, Vue, HTML/CSS, SQL</li>
          <li>🚀 2+ Years Professional Experience</li>
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
      A quick snapshot - The full timeline and details can be found in my resume and LinkedIn.
    </p>

    <div class="grid cols-2">
      <!-- Experience -->
      <div class="card">
        <h3 style="margin-top:0;margin-bottom:8px">Experience</h3>
        <ul style="padding-left:18px;color:var(--muted);margin:0">
          <li>
            <strong>Project and System Services Engineer · Schréder</strong> – smart city and lighting projects,
            integrating IoT systems with custom software.
          </li>
          <li>
            Built and upkeep multiple end-to-end custom solutions for large customers in Australia. Including full stack dashboards with integrating features for other platforms.
          </li>
          <li>
            Built internal systems and frontends to automate repetitive tasks and improve team efficiency. 
          </li>
        </ul>
      </div>

      <!-- Achievements -->
      <div class="card">
        <h3 style="margin-top:0;margin-bottom:8px">Selected achievements</h3>
        <ul style="padding-left:18px;color:var(--muted);margin:0">
          <li>
            Finalist for the 2025 Young Achiever Award (Lighting Council of Australia) for contributions to
            smart city projects.
          </li>
          <li>
            Rising star employee award (Schréder, Jan 2025) for proactive development of internal tools.
          </li>
          <li>
            High distinction average in my final year of Bachelor of Engineering (Mechatronics) at UNSW.
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
      Flagship case studies. See the full list on the projects page.
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
