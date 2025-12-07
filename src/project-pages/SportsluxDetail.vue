<template>
  <article>
    <RouterLink to="/projects" class="btn" style="margin-bottom:14px;display:inline-block">
      ← Back to projects
    </RouterLink>

    <section class="card hero">
      <div class="section-label">Sports Lighting · Optimisation</div>
      <h1 class="hero-title">{{ project.title }}</h1>
      <p class="hero-summary">
        Automated sports lighting configuration calculator designed to optimise luminaire placement, aiming, and fixture mixes
        for Schreder projects.
      </p>

      <div class="tags hero-tags">
        <span class="tag" v-for="t in project.tags" :key="t">{{ t }}</span>
      </div>

      <div class="hero-meta mono">
        <strong>Stack:</strong> {{ project.stack.join(' · ') }}
      </div>

      <div class="hero-grid">
        <div class="hero-copy">
          <p class="hero-summary">
            Sportslux is an internal tool used by Schreder's lighting designers. Typically, a lighting designer will receive a
            project scope and then spend hours finding the optimal lighting configuration manually. Sportslux automates this
            process, allowing designers to input project parameters and receive optimal configurations in seconds rather than hours.
          </p>

          <p class="hero-summary">
            The tool uses a combination of fast geometric algorithms and an advanced optimisation solver to explore fixture
            placements, aiming angles, and optic combinations. It generates dynamic visual previews including heatmaps and isolux
            plots, enabling designers to make informed decisions quickly. The application also produces comprehensive reports that
            include key metrics required by AS/NZS standards.
          </p>

          <div class="hero-actions">
            <a
              v-if="project.repoUrl"
              class="btn"
              :href="project.repoUrl"
              target="_blank"
              rel="noreferrer noopener"
            >
              View code ↗
            </a>
            <a
              v-if="project.liveUrl"
              class="btn secondary"
              :href="project.liveUrl"
              target="_blank"
              rel="noreferrer noopener"
            >
              Live demo ↗
            </a>
          </div>
        </div>

        <div class="hero-image">
          <div class="image-wrapper">
            <img class="image" :src="dashboardPreview" alt="Sportslux dashboard preview." loading="lazy" />
          </div>
        </div>
      </div>
    </section>

    <!-- What I learned / Tech & skills -->
    <section class="card grid cols-2 learn-section">
      <div>
        <div class="section-label">What I learned</div>
        <h2 class="section-title small">Shipping a production-ready cloud application</h2>
        <p class="section-sub">
          Sportslux was an end-to-end build: from database schema design and API performance to cloud deployment, observability,
          and frontend integration. It significantly deepened my experience with production architecture on AWS.
        </p>

        <ul class="bulleted">
          <li v-for="item in learnings" :key="item">
            {{ item }}
          </li>
        </ul>
      </div>

      <div class="stack-gallery">
        <div class="image-wrapper">
          <img class="image" :src="resultsGrid" alt="Sportslux heatmap results preview." loading="lazy" />
        </div>

        <div class="image-wrapper" style="margin-top:12px">
          <img class="image" :src="resultsHeatmap" alt="Sportslux optimisation summary preview." loading="lazy" />
        </div>
      </div>
    </section>

    <section class="row grid cols-2">
      <div class="card">
        <div class="section-label">Feature set</div>
        <h2 class="section-title small">Built for day-to-day lighting design</h2>
        <ul class="bulleted">
          <li v-for="feature in features" :key="feature">{{ feature }}</li>
        </ul>
      </div>

      <div class="card">
        <div class="image-wrapper large">
          <img class="image" :src="isoluxPreview" alt="Isolux preview." loading="lazy" />
        </div>
        <p class="section-sub" style="margin-top:10px">
          Dynamic visual preview generates real-time heatmaps, isolux plots, and interactive distributions so designers can adjust live.
        </p>
      </div>
    </section>

    <section class="card grid cols-2" style="gap:18px">
      <div>
        <div class="section-label">Modes</div>
        <h2 class="section-title small">Fast vs advanced computing</h2>
        <p class="section-sub">
          Quick searches satisfy common requirements in seconds, while the advanced solver explores more combinations for
          perfect distributions.
        </p>
        <div class="table-wrapper">
          <table class="mono">
            <thead>
              <tr>
                <th>Fittings per pole</th>
                <th>Fast mode</th>
                <th>Advanced mode</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in performance" :key="row.fittings">
                <td>{{ row.fittings }}</td>
                <td>{{ row.fast }}</td>
                <td>{{ row.advanced }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <div class="section-label">Interactive & secure</div>
        <h2 class="section-title small">Built for Customisation</h2>
        <ul class="bulleted">
          <li>Robust login with role-based access and private deployments.</li>
          <li>Interactive mode for manual adjustments with immediate visual feedback.</li>
          <li>Cloud-hosted for easy access by Schreder teams and customers.</li>
        </ul>
        <div class="image-wrapper" style="margin-top:12px">
          <img class="image" :src="login" alt="Sportslux login preview." loading="lazy" />
        </div>
      </div>
    </section>

    <!-- Key benefits / Impact -->
    <section class="card">
      <div class="section-label">Impact</div>
      <h2 class="section-title small">Key benefits for Schreder</h2>
      <ul class="bulleted">
        <li v-for="item in benefits" :key="item">
          {{ item }}
        </li>
      </ul>
    </section>

    <section class="row grid cols-2">
      <div class="card">
        <div class="section-label">Upcoming features</div>
        <h2 class="section-title small">Roadmap highlights</h2>
        <ul class="bulleted">
          <li v-for="item in upcoming" :key="item">{{ item }}</li>
        </ul>
      </div>

      <div class="card">
        <div class="section-label">Limitations</div>
        <h2 class="section-title small">Known constraints at launch</h2>
        <ul class="bulleted">
          <li v-for="item in limitations" :key="item">{{ item }}</li>
        </ul>
      </div>
    </section>

    <section class="card">
      <div class="section-label">Timeline</div>
      <h2 class="section-title small">Key delivery dates</h2>
      <div class="timeline-grid">
        <div class="image-wrapper" style="align-self:start">
          <img class="image" :src="reportImage" alt="Automatic reports generated." loading="lazy" />
        </div>

        <div class="timeline">
          <div v-for="event in keyDates" :key="event.date" class="timeline-item">
            <div class="timeline-date mono">{{ event.date }}</div>
            <div class="timeline-content">{{ event.title }}</div>
          </div>
        </div>
      </div>
    </section>
  </article>
</template>

<script setup>
import { RouterLink } from 'vue-router'

import dashboardPreview from '../assets/sportslux-dashboard.png'
import resultsGrid from '../assets/sportslux-grid.png'
import resultsHeatmap from '../assets/sportslux-heatmap.png'
import isoluxPreview from '../assets/sportslux-isolux.png'
import reportImage from '../assets/sportslux-report.png'
import login from '../assets/sportslux-login.png'

const props = defineProps({
  project: {
    type: Object,
    required: true
  }
})

const features = [
  'Optimal lighting calculation for luminaire orientation, tilt, and optic combinations.',
  'Dynamic visual previews: heatmaps, isolux plots, and interactive distributions.',
  'Multiple fittings per pole with configurable heights, spacing, and field shapes.',
  'Sport selection that loads standards and recommended pole heights and locations for the chosen code.',
  'Uploads of custom IES files to allow a dynamic fixture database.',
  'Customer ready downloadable reports with summarised solutions.',
  'Lux distributions, uniformity gradients, and glare rating calculations aligned to comply with AS/NZS standards.'
]

const performance = [
  { fittings: 1, fast: '< 1 sec', advanced: '< 1 sec' },
  { fittings: 2, fast: '1 sec', advanced: '1 sec' },
  { fittings: 3, fast: '2 sec', advanced: '3 sec' },
  { fittings: 4, fast: '2 sec', advanced: '7 sec' },
  { fittings: 5, fast: '3 sec', advanced: '10 sec' },
  { fittings: 6, fast: '5 sec', advanced: '25 sec' },
  { fittings: 7, fast: '10 sec', advanced: '40 sec' },
  { fittings: 8, fast: '15 sec', advanced: '1 min' }
]

const learnings = [
  'Cloud deployment through AWS, including environment configuration and monitoring of a live production system.',
  'AWS RDS – PostgreSQL database acting as the central relational store for projects, fittings, and optimisation results.',
  'Python FastAPI backend served via Gunicorn + NGINX, providing a high-performance, type-safe API layer.',
  'Vue frontend with Vuetify (Material Design) to build responsive, component-based interfaces for designers and sales teams.',
  'Vite as the dev server and build tool, giving fast local development and optimised production bundles.',
  'NGINX used both as a reverse proxy for FastAPI and for serving the compiled frontend with caching and compression.',
  'AWS S3 used as a durable storage layer for generated reports, exports, and other static assets.'
]

const benefits = [
  'Reduced preliminary lighting design time from hours or days down to literal seconds for typical scopes.',
  'The application has been used on average around ten times per week since its initial deployment.',
  'Enables salespeople to dynamically create lighting concepts in front of customers, projecting professionalism and technical confidence.',
  'Keeps Schreder flexible in solution design, making it easy to adapt to non-standard field geometries and evolving project constraints.'
]

const upcoming = [
  'More pole support with AS/NZS 1158 placement guidance (edge distances, spacing vs mounting height).',
  'Pole placement restrictions for goals/key areas and recommended counts per field dimension.',
  'Customisable fields via stacked shapes and Google Maps integration.',
  'Expanded recommendations for pole height and spacing relative to mounting height.'
]

const limitations = [
  'Current release supports four poles per field.',
  'Optimisation time grows for complex configurations (>6 fittings per pole).',
  'Edge distance and placement restrictions are being staged into future releases.'
]

const keyDates = [
  { date: '14/03/2025', version: 'V0.0.0', title: 'Development begins' },
  { date: '14/04/2025', version: 'V0.1.0', title: 'Testing & early access' },
  { date: '24/04/2025', version: 'V1.0.0', title: 'Full deployment of V1' },
  { date: '09/06/2025', version: 'V1.0.1', title: 'Development of V2 begins' },
  { date: '11/07/2025', version: 'V1.1.0', title: 'Testing & early access of V2' },
  { date: '18/07/2025', version: 'V2.0.0', title: 'Full deployment of V2' },
  { date: '29/07/2025', version: 'V2.0.1', title: 'Bug Fix Release' },
  { date: '11/08/2025', version: 'V2.0.2', title: 'Bug Fix Release' },
  { date: '18/08/2025', version: 'V2.0.2', title: 'Migrated DGI Calculator into the Sportslux Service' },
  { date: '01/10/2025', version: 'V2.0.3', title: 'Bug Fix Release' },
  { date: 'Q1 2026', version: 'V3.0.0', title: 'Additional roadmap items tracked in the backlog' }
]
</script>

<style scoped>
.hero {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.hero-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  align-items: center;
  gap: 16px;
}

.hero-image .image-wrapper {
  background: radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.18), rgba(255, 255, 255, 0));
}

.hero-title {
  font-size: clamp(1.6rem, 2vw, 2rem);
  margin: 0;
}

.hero-tags {
  margin: 6px 0 2px;
}

.hero-summary {
  margin: 6px 0;
  color: var(--muted);
}

.hero-actions {
  display: flex;
  gap: 10px;
  margin-top: 10px;
  flex-wrap: wrap;
}

.row {
  margin-top: 18px;
}

.bulleted {
  padding-left: 18px;
  color: var(--muted);
  display: grid;
  gap: 6px;
}

.table-wrapper {
  margin-top: 10px;
  overflow-x: auto;
  border: 1px solid var(--border);
  border-radius: 10px;
}

.table-wrapper table {
  width: 100%;
  border-collapse: collapse;
  min-width: 280px;
}

.table-wrapper th,
.table-wrapper td {
  padding: 10px;
  text-align: left;
  border-bottom: 1px solid var(--border);
}

.table-wrapper th {
  background: var(--surface-2);
}

.timeline {
  display: grid;
  gap: 10px;
  margin-top: 12px;
}

.timeline-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 14px;
  align-items: start;
}

.timeline-item {
  display: grid;
  grid-template-columns: 120px 1fr;
  gap: 10px;
  align-items: center;
}

.timeline-date {
  color: var(--muted);
}

.image-wrapper {
  background: var(--surface-2);
  border-radius: 12px;
  padding: 10px;
  border: 1px solid var(--border);
}

.image-wrapper.large {
  min-height: 230px;
}

.image {
  width: 100%;
  display: block;
}

.learn-section {
  margin-top: 18px;
  gap: 18px;
}

.stack-gallery {
  display: flex;
  flex-direction: column;
}

@media (max-width: 640px) {
  .timeline-item {
    grid-template-columns: 1fr;
  }
}
</style>
