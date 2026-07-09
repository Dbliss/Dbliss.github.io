<template>
  <!-- INTRO (moved here from the old landing page) -->
  <section class="hero">
    <div class="hero-main">
      <div class="hero-main-text">
        <div class="section-label">About</div>
        <h1>
          This is your engineer, <strong style="color:#b7b9ff">Dillon Bliss</strong>
        </h1>
        <p class="section-sub">
          Mechatronic Engineer working as Full-Stack Developer based in Sydney. I design and build robust systems
          across backend, frontend and cloud infrastructure with a focus on reliability and performance.
        </p>

        <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:10px">
          <RouterLink class="btn primary" to="/projects">View projects</RouterLink>
          <RouterLink class="btn" to="/contact">Contact me</RouterLink>
        </div>

        <ul class="hero-facts">
          <li>📍 Sydney, Australia</li>
          <li>📖 End-to-end design · Frontend · Backend · Data/ML</li>
          <li>🛠 Python, JavaScript, TypeScript, C++, Vue, HTML/CSS, SQL</li>
          <li>🚀 2+ Years Professional Experience</li>
        </ul>
      </div>

      <div class="hero-main-photo" aria-hidden="true">
        <img class="headshot-img" :src="headshotUrl" alt="" />
      </div>
    </div>
  </section>

  <!-- EXPERIENCE + ACHIEVEMENTS -->
  <section style="margin-top:24px">
    <div class="section-title">Experience &amp; achievements</div>
    <p class="section-sub">
      The full timeline and details can be found in my resume and LinkedIn.
    </p>

    <div class="grid cols-2">
      <div class="card">
        <h3 style="margin-top:0;margin-bottom:8px">Experience</h3>
        <ul style="padding-left:18px;color:var(--muted);margin:0">
          <li>
            Worked within smart city and lighting projects, integrating IoT systems with custom software.
          </li>
          <li>
            Deployed various end-to-end full stack solutions for large customers in Australia.
          </li>
          <li>
            Built internal systems and frontends to automate repetitive tasks and improve team efficiency.
          </li>
        </ul>
      </div>

      <div class="card">
        <h3 style="margin-top:0;margin-bottom:8px">Selected achievements</h3>
        <ul style="padding-left:18px;color:var(--muted);margin:0">
          <li>
            Rising Star Employee Award (Schréder, 2025).
          </li>
          <li>
            Young Achiever Award Finalist (Lighting Council of Australia, 2025).
          </li>
          <li>
            High distinction average in final year of Bachelor of Engineering at UNSW.
          </li>
        </ul>
      </div>
    </div>
  </section>

  <!-- HOW I WORK / NEXT UP -->
  <section style="margin-top:24px" class="grid cols-2">
    <div class="card">
      <div class="section-label">What I do</div>
      <h2 class="section-title">Current role</h2>
      <p class="section-sub" style="max-width:none">
        Full-stack developer on smart city and sports lighting platforms — from optimisation
        engines and data pipelines to customer-facing booking and configuration tools.
      </p>
    </div>

    <div class="card">
      <div class="section-label">Next up</div>
      <h2 class="section-title">Upcoming projects</h2>
      <p class="section-sub" style="max-width:none">
        This portfolio keeps growing — new landmarks appear in the
        <RouterLink to="/" style="color:#b7b9ff">interactive city</RouterLink>
        as projects ship.
      </p>
    </div>
  </section>
</template>

<script setup>
import { RouterLink } from 'vue-router'
import headshotUrl from '../assets/site/dillon.png'
</script>
