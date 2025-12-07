<template>
  <article>
    <RouterLink to="/projects" class="btn" style="margin-bottom:14px;display:inline-block">
      ← Back to projects
    </RouterLink>

    <section class="card hero">
      <div class="section-label">Sports Lighting · Optimisation</div>
      <h1 class="hero-title">{{ project.title }}</h1>
      <p class="hero-summary">
        Advanced sports lighting configuration calculator designed to optimise luminaire placement, aiming, and fixture mixes
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
            Sportslux combines deterministic rules (pole placements, pole heights, standard compliance) with optimisation modes
            that search for layouts meeting lux, uniformity, and glare constraints. Users can upload IES files, mix optics, and
            export the results to PDF reports.
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
            <img class="image" :src="heroHeatmap" alt="Sportslux heatmap preview." loading="lazy" />
          </div>
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
          Dynamic visual preview generates heatmaps, isolux plots, and interactive distributions so designers can adjust live.
        </p>
      </div>
    </section>

    <section class="card grid cols-2" style="gap:18px">
      <div>
        <div class="section-label">Modes</div>
        <h2 class="section-title small">Fast vs advanced computing</h2>
        <p class="section-sub">
          Quick searches satisfy common installations in seconds, while the advanced solver explores more combinations for
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
        <h2 class="section-title small">Built to collaborate</h2>
        <ul class="bulleted">
          <li>Robust login with role-based access and private deployments.</li>
          <li>Interactive mode for manual adjustments with immediate visual feedback.</li>
          <li>Cloud-hosted for easy access by Schreder teams and customers.</li>
        </ul>
        <div class="image-wrapper" style="margin-top:12px">
          <img class="image" :src="dashboardPreview" alt="Sportslux dashboard preview." loading="lazy" />
        </div>
      </div>
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
          <img class="image" :src="timelineVisual" alt="Project roadmap milestones." loading="lazy" />
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

import dashboardPreview from '../assets/sportslux-dashboard.svg'
import heroHeatmap from '../assets/sportslux-heatmap.svg'
import isoluxPreview from '../assets/sportslux-isolux.svg'
import timelineVisual from '../assets/sportslux-timeline.svg'

const props = defineProps({
  project: {
    type: Object,
    required: true
  }
})

const features = [
  'Optimal lighting calculation for luminaire orientation, tilt, and optic combinations.',
  'Dynamic visual previews: heatmaps, isolux plots, and interactive distributions.',
  'Multiple fittings per pole with configurable heights and spacing guidance.',
  'Sport selection that loads standards and recommended pole heights for the chosen code.',
  'Uploads of custom IES files to expand the fixture database.',
  'Downloadable reports with PDF exports and supporting data.',
  'Automatic glare rating and uniformity gradient calculations aligned to AS/NZS standards.'
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
  { date: '14/03/2025', title: 'Development begins' },
  { date: '14/04/2025', title: 'Testing & early access' },
  { date: '24/04/2025', title: 'Full deployment of V1.0.0' },
  { date: '09/06/2025', title: 'Development of V2.0.0 begins' },
  { date: '11/07/2025', title: 'Testing & early access of V2.0.0' },
  { date: '18/07/2025', title: 'Full deployment of V2.0.0' },
  { date: '29/07/2025', title: 'Bug Fix Release V2.0.1' },
  { date: '11/08/2025', title: 'Bug Fix Release V2.0.2' },
  { date: '18/08/2025', title: 'Migrated DGI Calculator into the Sportslux Service' },
  { date: '01/10/2025', title: 'Bug Fix Release V2.0.3' },
  { date: 'Q4 2025', title: 'Additional roadmap items tracked in the backlog' }
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

@media (max-width: 640px) {
  .timeline-item {
    grid-template-columns: 1fr;
  }
}
</style>
