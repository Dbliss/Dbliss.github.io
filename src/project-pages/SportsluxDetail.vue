<template>
  <article class="sportslux-page">
    <RouterLink
      to="/projects"
      class="btn back-link"
    >
      ← Back to projects
    </RouterLink>

    <!-- LIGHT STREAMS (behind cards, inside content column) -->
    <div class="slx-light-layer" aria-hidden="true">
      <div class="slx-light-layer-inner">
        <div
          v-for="trail in lightTrails"
          :key="trail.id"
          class="slx-light"
          :style="{
            '--x': trail.x + '%',
            '--duration': trail.duration + 's',
            '--delay': trail.delay + 's',
            '--size': trail.size + 'px'
          }"
        ></div>
      </div>
    </div>

    <!-- HERO -->
    <section class="slx-hero" v-reveal>
      <div class="slx-hero-left">
        <p class="slx-kicker">Sports lighting · optimisation engine</p>

        <h1 class="slx-title">
          {{ project.title }}
        </h1>

        <p class="slx-subtitle">
          Sportslux turns luminaire data and customer requests into an optimisation problem. Any basic user feeds in
          field geometry, target lux levels and allowed hardware; the engine explores thousands of distributions and
          returns optimal solutions within seconds.
        </p>

        <div class="slx-meta-row">
          <div class="slx-tag-group">
            <span
              v-for="t in project.tags"
              :key="t"
              class="tag slx-tag"
            >
              {{ t }}
            </span>
          </div>

          <p class="slx-stack mono">
            <span class="slx-stack-label">Stack</span>
            <span class="slx-stack-value">{{ project.stack.join(' · ') }}</span>
          </p>
        </div>

        <div class="slx-hero-actions">
          <a
            v-if="project.repoUrl"
            class="btn btn-primary"
            :href="project.repoUrl"
            target="_blank"
            rel="noreferrer noopener"
          >
            View code ↗
          </a>
          <a
            v-if="project.liveUrl"
            class="btn btn-ghost"
            :href="project.liveUrl"
            target="_blank"
            rel="noreferrer noopener"
          >
            Live demo ↗
          </a>
        </div>

        <p class="slx-hero-footnote mono">
          From hours of rudimentary selection of lights positions to instant perfect solutions with live photometry.
        </p>
      </div>

      <div class="slx-hero-right">
        <img
          class="image"
          :src="login"
          alt="Sportslux secure login screen."
          loading="lazy"
        />
      </div>
    </section>

    <!-- ENGINE DESIGN -->
    <section class="slx-section slx-engine" v-reveal>
      <div class="slx-engine-header">
        <div class="slx-section-grid-engine">
          <div>
            <p class="section-label">Engine design & Simulation</p>
            <h2 class="section-title">Geometry, optimisation and photometry in one flow</h2>
            <p class="section-lead">
              The engine takes fixed project inputs, searches over the variables it can change,
              and returns a verified lighting design that meets the performance targets.
            </p>

            <p class="section-lead">
              The users selects the sport, field dimensions, pole positions, and
              what lumainaires to use. The engine automatically finds the minimun number of Fittings required
              to reach the optimal solution for the requirements. All done in seconds.
            </p>
          </div>

          <img
            class="image"
            :src="resultsGrid"
            alt="Sportslux photometry grid preview."
            loading="lazy"
          />
        </div>
      </div>

      <div class="slx-engine-matrix">
        <!-- Column 1: User inputs -->
        <div class="slx-engine-column">
          <div class="slx-engine-column-title">User inputs</div>
          <ul class="slx-engine-list">
            <li>
              <span class="slx-engine-label">Field length</span>
              <span class="slx-engine-value">{{ engineState.fieldWidth }}</span>
            </li>
            <li>
              <span class="slx-engine-label">Field width</span>
              <span class="slx-engine-value">{{ engineState.fieldHeight }}</span>
            </li>
            <li>
              <span class="slx-engine-label">Field shape</span>
              <span class="slx-engine-value">{{ engineState.fieldShape }}</span>
            </li>
            <li>
              <span class="slx-engine-label">Pole positions</span>
              <span class="slx-engine-value">{{ engineState.polePositions }}</span>
            </li>
            <li>
              <span class="slx-engine-label">Pole height</span>
              <span class="slx-engine-value">{{ engineState.poleHeight }}</span>
            </li>
            <li>
              <span class="slx-engine-label">Allowed luminaire models</span>
              <span class="slx-engine-value">{{ engineState.allowedLuminaires }}</span>
            </li>
            <li>
              <span class="slx-engine-label">Target Lux</span>
              <span class="slx-engine-value">{{ engineState.targetLux }}</span>
            </li>
            <li>
              <span class="slx-engine-label">Target uniformity</span>
              <span class="slx-engine-value">{{ engineState.targetUniformity }}</span>
            </li>
          </ul>
        </div>

        <div class="slx-engine-flow-line slx-engine-flow-line-1"></div>

        <!-- Column 2: Optimisation variables -->
        <div class="slx-engine-column">
          <div class="slx-engine-column-title">Optimisation variables</div>
          <ul class="slx-engine-list">
            <li>
              <span class="slx-engine-label">Luminaires per pole</span>
              <span class="slx-engine-value">{{ engineState.luminairesPerPole }}</span>
            </li>
            <li>
              <span class="slx-engine-label">Orientations</span>
              <span class="slx-engine-value-2">{{ engineState.luminaireOrientation }}</span>
            </li>
            <li>
              <span class="slx-engine-label">Tilts</span>
              <span class="slx-engine-value-2">{{ engineState.luminaireTilt }}</span>
            </li>
            <li>
              <span class="slx-engine-label">Luminaire models</span>
              <span class="slx-engine-value">{{ engineState.luminaireModel }}</span>
            </li>
          </ul>
        </div>

        <div class="slx-engine-flow-line slx-engine-flow-line-2"></div>

        <!-- Column 3: Results -->
        <div class="slx-engine-column">
          <div class="slx-engine-column-title">Results</div>
          <ul class="slx-engine-list">
            <li>
              <span class="slx-engine-label">Lux level</span>
              <span class="slx-engine-value">{{ engineState.luxLevel }}</span>
            </li>
            <li>
              <span class="slx-engine-label">Uniformity ratio</span>
              <span class="slx-engine-value">{{ engineState.uniformityRatio }}</span>
            </li>
            <li>
              <span class="slx-engine-label">Light spill</span>
              <span class="slx-engine-value">{{ engineState.lightSpill }}</span>
            </li>
          </ul>
        </div>
      </div>

      <!-- Evolving optimisation result visual -->
      <div class="slx-engine-result">
        <div class="slx-engine-result-grid">
          <img
            class="image"
            :src="currentResultFrame.image"
            :alt="`Optimisation stage ${currentResultFrame.id}`"
          />

          <div class="slx-engine-result-text">
            <h2 class="section-subtitle">
              Turning lighting design into an algorithm
            </h2>
            <p class="section-sub">
              Early sports lighting design is usually a loop of guessing pole layouts, running old photometry software, tweaking fittings
              and hoping the results satisfy Australian standards. Sportslux steamlines that process. To a computer,
              everything becomes geometry, constraints and objective functions.
            </p>

            <div style="margin-bottom: 0.8rem;"></div>

            <p class="section-sub">
              Because the objective is non-differential and discontinous, differential evolution was chosen as the intelligent search algorithm.
              The engine begins by randomly placing luminaires on the poles, then evaluates the photometry grid, isolux curves and glare.
              These metrics are assigned a cost score where heavy penalties are applied for any unmet targets. The algorithm then iteratively refines the solution
              until it converges to a low-cost solution.
            </p>

            <div style="margin-bottom: 0.8rem;"></div>

            <p class="section-sub">
              To minimise hardware, the search is staged: begin with one luminaire per pole, then increase the count only when targets can’t be met.
              Each stage is cached so the next depth can warm-start from previous best candidates, keeping runtimes low while reliably converging to a minimum-fitting design.
              A technique I learned from my work on chess engines, known as iterative deepening.
            </p>
          </div>
        </div>
      </div>
    </section>

    <!-- Images -->
    <section class="slx-section slx-section-block" v-reveal>
      <div class="slx-section-block">
        <div class="slx-gallery-card" role="group" aria-label="Sportslux UI examples">
          <figure class="slx-gallery-item">
            <img
              class="slx-gallery-img"
              :src="dashboardPreview"
              alt="UI of pole position selection."
              loading="lazy"
            />
            <figcaption class="slx-gallery-caption">
              Pole-position UI: invalid positions update as you change field size + sport
            </figcaption>
          </figure>

          <figure class="slx-gallery-item">
            <img
              class="slx-gallery-img"
              :src="resultsHeatmap"
              alt="Result of a simple configuration leading to a lighting design with all metrics passing."
              loading="lazy"
            />
            <figcaption class="slx-gallery-caption">
              Result from a simple user setup, with all metrics meeting requirements
            </figcaption>
          </figure>
        </div>
      </div>
    </section>

    <!-- FEATURES + ISOLUX -->
    <section class="slx-section slx-feature-layout" v-reveal>
      <!-- full-width label so both columns start below it -->
      <p class="section-label">Feature Set</p>

      <div class="slx-feature-grid">
        <!-- LEFT / ROW 1 -->
        <div class="slx-section-block slx-feature-left-top">
          <h2 class="section-title">Technical Challenges</h2>

          <p class="section-sub">
            Computers are excellent are forcefully computing millions of possibilities and finding the very best solution.
            However, this problem quickly grows beyond brute force. With up to nine luminaires per design, each with a unique orientation (0–360°), tilt (−10° to +15°),
            and luminaire model, the full combinatorial space exceeds <strong>10<sup>40</sup> possible configurations</strong>.
          </p>

          <p class="section-sub">
            Trying to evaluate every combination is computationally infeasible. Even at millions of evaluations per second,
            a brute-force search would take longer than the age of the universe.
            For Sportslux to be usable in practice, solutions needed to be returned in a few minutes or less.
          </p>

          <p class="section-sub">
            To achieve this, the engine relies on advanced optimisation algorithms to intelligently explore the solution space,
            rapidly converging toward optimal configurations without evaluating more than a tiny fraction of all possibilities.
            Reaching this level of performance required careful algorithm selection, aggressive pruning, and a deliberately
            engineered computation pipeline.
          </p>
        </div>

        <!-- RIGHT / ROW 1 -->
        <div class="slx-section-block slx-feature-right-top">
          <img
            class="image"
            :src="isoluxPreview"
            alt="Sportslux isolux curves and distributions."
            loading="lazy"
          />
        </div>

        <!-- LEFT / ROW 2 -->
        <div class="slx-section-block slx-feature-left-bottom">
          <h2 class="section-title">Key Optimisation Stratergies</h2>

          <div class="section-sub slx-feature-block">
            <div class="slx-feature-item">
              <strong>Extensive caching: </strong>
              <ul class="slx-subpoints">
                <li>Each luminaire footprint is pre-computed on file upload for every supported tilt angle.</li>
                <li>The optimiser caches all evaluated orientations so repeated configurations can be pulled directly from memory rather than recalculated.</li>
                <li>Complete solutions are cached in the database, enabling instant retrieval for repeated use cases (e.g. common sports presets).</li>
              </ul>
            </div>

            <div class="slx-feature-item">
              <strong>Parallel computation: </strong>
              <span>The model utilises all available CPU cores, allowing many candidate solutions to run simultaneously, drastically reducing optimisation time.</span>
            </div>

            <div class="slx-feature-item">
              <strong>High-efficiency data handling: </strong>
              <span>NumPy arrays and vectorised operations are used throughout the computation pipeline to manage large datasets with minimal overhead.</span>
            </div>

            <div class="slx-feature-item">
              <strong>Optimised library selection: </strong>
              <span>Performance-critical tasks leverage specialised libraries. For example, <code>cv2</code> is used for luminaire footprint transformations and SciPy for numeric optimisation.</span>
            </div>

            <div class="slx-feature-item">
              <strong>Algorithm tuning and evaluation: </strong>
              <span>Multiple optimisation methods were tested, ultimately converging on SciPy’s Differential Evolution algorithm as the best balance of reliability and performance for this problem.</span>
            </div>

            <div class="slx-feature-item">
              <strong>Code-level performance profiling: </strong>
              <span>The system was iteratively profiled line-by-line to identify inefficiencies and eliminate bottlenecks, ensuring consistent high-speed execution.</span>
            </div>

            <div class="slx-feature-item">
              <strong>Infrastructure choices: </strong>
              <span>AWS instances were selected based on memory and CPU performance to meet processing requirements while maintaining cost efficiency.</span>
            </div>
          </div>
        </div>

        <!-- RIGHT / ROW 2 -->
        <div class="slx-section-block slx-feature-right-bottom">
          <h2 class="section-title">Resulting speed</h2>

          <div class="table-wrapper slx-table">
            <table class="mono">
              <thead>
                <tr>
                  <th>Fittings</th>
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

          <p class="section-sub">
            <strong>*Fast mode</strong> finds the minimum hardware requirements for a field.
          </p>
          <p class="section-sub">
            <strong>*Advanced mode</strong> searches more extensively to find the very best solution.
          </p>
        </div>
      </div>
    </section>

        <!-- Admin page -->
    <section class="slx-section slx-section-grid-admin slx-modes" v-reveal>
      <div class="slx-section-block">
        <h2 class="section-title">
          Admin Functionality
        </h2>

        <p class="section-sub">
          The admin page allows key personel to easilyt invite users and revoke access.
          The role and permissions follow an easily adjustable role based access control (RBAC) model.
          Specific roles also possess the ability to change available luminaires by deleting a luminaire, or upload a new one.
          Admin also have the ability to monitor usage statistics, looking at total number of runs, and the most active users, 
          giving information about which employees are generating the most leads, and positions in the orgnisation use the tool most. 
        </p>
        <p class="section-sub">
          All customer information is secured using bcrypt and JWT tokens. Password are securely hashed and salted before storage, following
          modern industry practices.
        </p>
        <p class="section-sub">
          Cloud hosting lets Schreder teams and selected customers log in from anywhere with a browser. Specific ip addresses are whitelisted to ensure 
          only authorised users can access the system. The entire system only runs during extended working hours to reduce attack surface and deduct from
          operational costs.
        </p>
      </div>

      <div class="slx-section-block slx-panel">
        <img
          class="image"
          :src="admin"
          alt="Sportslux secure admin screen."
          loading="lazy"
        />
      </div>
    </section>

    <!-- Key Learnings -->
    <section class="slx-section slx-section-grid-learnings slx-modes" v-reveal>
       <div class="slx-section-block slx-panel">
        <img
          class="image"
          :src="devBoard"
          alt="Sportslux secure admin screen."
          loading="lazy"
        />
      </div>
      <div class="slx-section-block">
        <h2 class="section-title">
          Key Learnings
        </h2>
        <p class="section-sub">
          Sportslux was built by a team of two. Designed first as a locally hosted MVP, then deployed and iterated on in short sprints.
          The process was documented on Confluence and managed in Jira with ticketing and sprint planning.
          In a two-person team, you don’t get to specialise, you're forced to understand the full system end-to-end.
          Below are the key learnings from this project:
        </p>

        <ul class="slx-list">
          <li v-for="item in learnings" :key="item">
            {{ item }}
          </li>
        </ul>
      </div>
    </section>

    <!-- IMPACT -->
    <section class="slx-section" v-reveal>
      <p class="section-label">Impact</p>
      <div class="slx-section-grid-impact">
              <div class="slx-section-block">
        <h2 class="section-title">
          Business Value
        </h2>

        <ul class="slx-list-spaced">
          <li v-for="item in benefits" :key="item">
            {{ item }}
          </li>
        </ul>
      </div>

      <div class="slx-section-block">
        <img
          class="image"
          :src="reportImage"
          alt="Example of an automatically generated Sportslux report."
          loading="lazy"
        />
      </div>
      </div>
    </section>

    <!-- BACKEND ARCHITECTURE -->
    <section class="slx-section slx-impact" v-reveal>
      <div class="slx-section-block">
        <p class="section-label">Backend architecture</p>
        <h2 class="section-title">
          How the service is structured
        </h2>

        <div class="slx-section-block">
          <img
            class="image"
            :src="backendStructure"
            alt="Diagram of backend structure."
            loading="lazy"
          />
        </div>

        <div class="slx-roadmap-grid">
          <div>
            <h3 class="slx-small-heading">Request path</h3>
            <ul class="slx-list">
              <li v-for="item in backendRequestPath" :key="item">
                {{ item }}
              </li>
            </ul>
          </div>

          <div>
            <h3 class="slx-small-heading">Core components</h3>
            <ul class="slx-list">
              <li v-for="item in backendCoreComponents" :key="item">
                {{ item }}
              </li>
            </ul>
          </div>
        </div>

        <div style="margin-top: 1rem;"></div>

        <h3 class="slx-small-heading">Operational guarantees</h3>
        <ul class="slx-list">
          <li v-for="item in backendOps" :key="item">
            {{ item }}
          </li>
        </ul>
      </div>
    </section>

    <!-- TIMELINE -->
    <section class="slx-section slx-timeline" v-reveal>
      <p class="section-label">Timeline</p>
      <h2 class="section-title">
        Shipping Sportslux in stages
      </h2>

      <div
        ref="timelineScrollEl"
        class="slx-timeline-scroll"
        aria-label="Sportslux release timeline"
      >
        <ol class="slx-timeline-strip">
          <li
            v-for="(event, idx) in keyDates"
            :key="event.date + event.version"
            :ref="el => setTimelineItemRef(idx, el)"
            class="slx-timeline-chip"
            :class="{ 'is-current': isCurrentVersion(event) }"
          >
            <div class="slx-timeline-top">
              <span class="slx-timeline-dot" aria-hidden="true"></span>
              <div class="mono slx-timeline-date">
                {{ event.date }}
              </div>
            </div>

            <div class="slx-timeline-text">
              {{ event.title }}
            </div>

            <div class="mono slx-timeline-version">
              {{ event.version }}
            </div>
          </li>
        </ol>
      </div>
    </section>
  </article>
</template>

<script setup>
import { nextTick } from 'vue'
import { RouterLink } from 'vue-router'
import { computed, ref, onMounted, onBeforeUnmount } from 'vue'

import dashboardPreview from '../assets/sportslux-dashboard.png'
import resultsGrid from '../assets/sportslux-grid.png'
import resultsHeatmap from '../assets/sportslux-heatmap.png'
import isoluxPreview from '../assets/sportslux-isolux.png'
import reportImage from '../assets/sportslux-report.png'
import login from '../assets/sportslux-login.png'
import admin from '../assets/sportslux-admin.png'
import devBoard from '../assets/sportslux-devboard.png'
import backendStructure from '../assets/sportslux-structure.png'

import result1 from '../assets/sportslux_results/1.png'
import result2 from '../assets/sportslux_results/2.png'
import result3 from '../assets/sportslux_results/3.png'
import result4 from '../assets/sportslux_results/4.png'
import result5 from '../assets/sportslux_results/5.png'
import result6 from '../assets/sportslux_results/6.png'
import result7 from '../assets/sportslux_results/7.png'
import result8 from '../assets/sportslux_results/8.png'
import result9 from '../assets/sportslux_results/9.png'
import result10 from '../assets/sportslux_results/10.png'
import result11 from '../assets/sportslux_results/11.png'
import result12 from '../assets/sportslux_results/12.png'

const props = defineProps({
  project: {
    type: Object,
    required: true
  }
})

const TRAIL_COUNT = 40

const lightTrails = Array.from({ length: TRAIL_COUNT }, (_, i) => {
  const n = TRAIL_COUNT
  const baseX = 6 + (i * 88) / (n - 1) // 6% .. 94%
  return {
    id: i,
    x: baseX,
    duration: 40 + (i % 4) * 5,
    delay: -i * 1.7,
    size: 610 + (i % 3) * 60
  }
})

const currentVersion = computed(() => props.project?.currentVersion || 'V2.0.3')

function isCurrentVersion(event) {
  return event.version === currentVersion.value
}

const timelineScrollEl = ref(null)
const timelineItemEls = ref([])

function setTimelineItemRef(idx, el) {
  if (el) timelineItemEls.value[idx] = el
}

function centerTimelineOnCurrent() {
  const container = timelineScrollEl.value
  if (!container) return

  const idx = keyDates.findIndex(e => e.version === currentVersion.value)
  if (idx === -1) return

  const el = timelineItemEls.value[idx]
  if (!el) return

  // center the selected chip in the scroll container
  const containerRect = container.getBoundingClientRect()
  const elRect = el.getBoundingClientRect()

  const currentScrollLeft = container.scrollLeft
  const elCenter = (elRect.left - containerRect.left) + (elRect.width / 2)
  const targetScrollLeft = currentScrollLeft + elCenter - (containerRect.width / 2)

  container.scrollTo({ left: targetScrollLeft, behavior: 'auto' })
}

onMounted(async () => {
  await nextTick()
  centerTimelineOnCurrent()
})

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

const backendRequestPath = [
  'The UI sends a design request to NGINX, which serves the frontend and forwards API calls to FastAPI.',
  'FastAPI validates inputs and checks authentication/roles before the solver runs, so bad or unauthorised requests never reach compute.',
  'The solver runs and either reuses cached results or computes a new solution, then stores the run + outputs for later reuse.',
  '"In progress" and a loading screen come back to the UI immediately, with ability to cancel a job midway', 
  'Once a solution is reached, all results and exports are stored locally with persistance, meaning a user can refresh the page or changes tabs so without re-running the job.'
]

const backendCoreComponents = [
  'NGINX: a well known fast static delivery for the UI, plus a clean reverse proxy to the API.',
  'Gunicorn + FastAPI: handles real traffic reliably with multiple workers, and keeps the API strict and predictable with typed requests.',
  'Optimisation engine: kept separate from the web layer so it stays testable and easier for the user to get progress on.',
  'Postgres (RDS): a industry standard way to record user actions. Tables seperated per user functionality for easy management and future migrations.',
  'S3 storage: keeps generated reports/exports durable and lightweight to serve, without bloating the database.'
]

const backendOps = [
  'Every run is logged with enough metadata to reproduce issues, which makes debugging much faster than guessing from screenshots.',
  'Caching is built in, so repeated runs with the same inputs return instantly instead of burning compute again.',
  'Validation happens at the API boundary, so the solver and databases are protected.',
  'The system can be monitored through usage and health signals, automations are in place to ping a health point, with alerts on abnormality.'
]

const learnings = [
  'I had to design the overall structure of the system end-to-end, making sure it could scale cleanly and still stay reliable as usage grows.',
  'I learned that good API design is mostly about preventing misuse, so I built clear schemas, stringent validation, and role based permissions so the system can be managed safely.',
  'I further improved my code optimising skillset, this time in Python. This consisted of profiling properly, finding the real bottlenecks, and then fixing them with better data structures, caching, and vectorisation.',
  'I learned to iterate with the end-user in mind: collecting real feedback from customers, turning it into clear tickets, and planning sprints so we ship improvements without breaking what already works.',
  'How to properly future proof code, designing the database so new luminaire models and new constraints can be added without needing a schema rewrite or breaking existing projects.',
  'I learned the value of proper observability by storing API calls and run metadata. This made issues easily diagnosable, made solver runs reproducible, enabled monitoring of usage/health, and allowing for result caching.',
  'Documentation is what keeps momentum in a intermittent project, so I documented features, decisions, and backend structure, and kept commits clear enough that rollbacks and version tracking are easy.',
]


const benefits = [
  'Turned early sports-field design from hours of manual work into seconds-long solver runs for typical scopes. Each use saves about 2 hours of designer time.',
  'Since launch, designers have run Sportslux over 240 times. On average, about 11 times a week. 240 uses x 2 hours = 480 hours saved (at $150/hour) ~ $72 000 of business value within the firt 6 months of use.',
  'Sales teams can now build and iterate lighting concepts live in front of customers, lifting perceived technical maturity. Sales people who use the tool report increased sales rate. However, this is anectdotal',
  'Streamlines the handoff between sales teams and lighting designers, as initial designs are now formatted in the exact form a lighting designed desires, reducing rework and miscommunication.',
  'Customers now immediately recieve a detailed report of their intial design automatically generated by the system, improving customer experience and professionalism.',
  'All sales meetings now automatically log the customers exact requirements and initial designs, allowing for better follow-up and more tailored proposals.',
  'As a side use-case, the website also hosts a DGI calculator for quick daylight glare analysis, which has been used over 300 times since launch.',
  'Sportslux led to me getting nominated for the Young Achiever Award 2025, recognising the significant impact this project had on the business.'
]

const keyDates = [
  { date: '14/03/2025', version: 'V0.0.0', title: 'Exploration and initial implementation of the optimisation engine.' },
  { date: '14/04/2025', version: 'V0.1.0', title: 'Internal alpha and early designer feedback on the UI and solver outputs.' },
  { date: '24/04/2025', version: 'V1.0.0', title: 'First production rollout of Sportslux for day-to-day project work.' },
  { date: '09/06/2025', version: 'V1.0.1', title: 'Kickoff of V2 architecture and refactors based on production usage.' },
  { date: '11/07/2025', version: 'V1.1.0', title: 'V2 beta released to designers for testing and feedback.' },
  { date: '18/07/2025', version: 'V2.0.0', title: 'V2 deployed to production with expanded feature set.' },
  { date: '29/07/2025', version: 'V2.0.1', title: 'Stability and polish update focused on bug fixes.' },
  { date: '11/08/2025', version: 'V2.0.2', title: 'Additional stability pass and defect fixes in production.' },
  { date: '18/08/2025', version: 'V2.0.2', title: 'DGI calculator migrated into the Sportslux service.' },
  { date: '01/10/2025', version: 'V2.0.3', title: 'Further maintenance and bug-fix release.' },
  { date: 'Q1 2026', version: 'V3.0.0', title: 'V3 roadmap items tracked and prioritised in the backlog.' }
]

/* --------- OPTIMISATION RESULT FRAMES (IMAGE + METRICS) --------- */
/* 12 = worst, 1 = best */

const resultFrames = [
  { id: 12, image: result12, luminairesPerPole: 1, lux: 49, uniformity: 0.08, models: '1' },
  { id: 11, image: result11, luminairesPerPole: 1, lux: 60, uniformity: 0.10, models: '2' },
  { id: 10, image: result10, luminairesPerPole: 2, lux: 80, uniformity: 0.10, models: '3' },
  { id: 9,  image: result9,  luminairesPerPole: 2, lux: 90, uniformity: 0.12, models: '1' },
  { id: 8,  image: result8,  luminairesPerPole: 3, lux: 120, uniformity: 0.15, models: '1, 2' },
  { id: 7,  image: result7,  luminairesPerPole: 3, lux: 135, uniformity: 0.18, models: '1, 2' },
  { id: 6,  image: result6,  luminairesPerPole: 4, lux: 150, uniformity: 0.25, models: '1, 2' },
  { id: 5,  image: result5,  luminairesPerPole: 4, lux: 170, uniformity: 0.30, models: '2, 3' },
  { id: 4,  image: result4,  luminairesPerPole: 5, lux: 190, uniformity: 0.50, models: '1, 2' },
  { id: 3,  image: result3,  luminairesPerPole: 5, lux: 200, uniformity: 0.60, models: '1, 2, 3' },
  { id: 2,  image: result2,  luminairesPerPole: 5, lux: 210, uniformity: 0.65, models: '1, 2, 3' },
  { id: 1,  image: result1,  luminairesPerPole: 5, lux: 220, uniformity: 0.70, models: '1, 2, 3' }
]

const currentResultIndex = ref(0)
const currentResultFrame = computed(() => resultFrames[currentResultIndex.value])

/* ---------------- ENGINE MATRIX DEMO STATE ---------------- */

const engineState = ref({
  fieldWidth: '',
  fieldHeight: '',
  fieldShape: '',
  polePositions: '',
  poleHeight: '',
  allowedLuminaires: '',
  targetLux: '',
  targetUniformity: '',
  luminairesPerPole: '',
  luminaireOrientation: '',
  luminaireTilt: '',
  luminaireModel: '',
  luxLevel: '',
  uniformityRatio: '',
  lightSpill: ''
})

const fieldWidthOptions = [135]
const fieldHeightOptions = [115]
const poleHeightOptions = [30]
const allowedLuminaireOptions = ['x', 'y', 'z']

function randomChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

function randomFloat(min, max) {
  return min + Math.random() * (max - min)
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

function randomSubset(arr) {
  const count = Math.max(1, Math.floor(Math.random() * arr.length) + 1)
  const copy = arr.slice()
  const result = []
  while (result.length < count && copy.length) {
    const idx = Math.floor(Math.random() * copy.length)
    result.push(copy.splice(idx, 1)[0])
  }
  return result
}

/* --- Left column: INPUTS (updates slowly) --- */
function updateInputs() {
  const fw = randomChoice(fieldWidthOptions)
  const fh = randomChoice(fieldHeightOptions)
  const poleHeight = randomChoice(poleHeightOptions)
  const allowedLums = randomSubset(allowedLuminaireOptions)

  engineState.value.fieldWidth = fw + ' m'
  engineState.value.fieldHeight = fh + ' m'
  engineState.value.fieldShape = 'Oval'
  engineState.value.polePositions = '60m, 50m'
  engineState.value.poleHeight = poleHeight + ' m'
  engineState.value.allowedLuminaires = allowedLums.join(', ')
  engineState.value.targetLux = '200 lx'
  engineState.value.targetUniformity = '0.70'
}

/* --- Apply a result frame to middle + right column --- */
function applyFrame(idx) {
  const frame = resultFrames[idx]
  currentResultIndex.value = idx

  const lux = frame.lux
  const uni = frame.uniformity
  const spillBase = (1 - uni) * 100 / 3
  const spillValue = clamp(spillBase, 0, 100)
  const models = frame.models

  engineState.value.luminairesPerPole = String(frame.luminairesPerPole)
  engineState.value.luxLevel = lux + ' lx'
  engineState.value.uniformityRatio = uni.toFixed(2)
  engineState.value.lightSpill = spillValue.toFixed(1) + '%'
  engineState.value.luminaireModel = models

  // ✅ ensure middle-column variables re-sync with this frame's luminaire count
  updateVariablesFast()
}

/* --- Middle column: VARIABLES (updates frequently, uses current frame lum count) --- */
function updateVariablesFast() {
  const lumPerPole = parseInt(engineState.value.luminairesPerPole || '1', 10) || 1

  const orientationArray = Array.from({ length: lumPerPole }, () =>
    Math.round(randomFloat(0, 99))
  )
  const tiltArray = Array.from({ length: lumPerPole }, () =>
    Math.round(randomFloat(-10, 15))
  )

  engineState.value.luminaireOrientation = orientationArray.map(v => v + '°').join(',')
  engineState.value.luminaireTilt = tiltArray.map(v => v + '°').join(',')
}

/* --- Advance frame: 12 -> 11 -> ... -> 1 -> loop --- */
function advanceResultFrame() {
  const next = (currentResultIndex.value + 1) % resultFrames.length
  applyFrame(next)
}

let inputInterval
let variablesInterval
let frameInterval

onMounted(() => {
  updateInputs()
  applyFrame(0)           // start at 12.png (worst)
  updateVariablesFast()

  variablesInterval = setInterval(updateVariablesFast, 3000) // vars: fast
  frameInterval = setInterval(advanceResultFrame, 3000)     // image + outputs: medium
})

onBeforeUnmount(() => {
  clearInterval(inputInterval)
  clearInterval(variablesInterval)
  clearInterval(frameInterval)
})

/**
 * Scroll-based reveal directive
 * Fades & slides sections in as they enter the viewport.
 */
const vReveal = {
  mounted(el) {
    el.classList.add('slx-reveal')
    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible')
            observer.unobserve(entry.target)
          }
        })
      },
      {
        threshold: 0.2
      }
    )
    observer.observe(el)
  }
}
</script>

<style scoped>
.sportslux-page {
  position: relative;
  padding: clamp(1.8rem, 4vw, 3rem);
  background: radial-gradient(circle at top, #070a1b 0, #02030a 55%, #000 100%);
  color: #e6f0ff;
  overflow: hidden;
  width: 100vw;
  margin-inline: calc(50% - 50vw);
  min-height: 100vh;
  box-sizing: border-box;
}

:global(body) {
  overflow-x: hidden;
}

/* Ensure all normal children stay above the light layer */
.sportslux-page > * {
  position: relative;
  z-index: 1;
}

/* Constrain inner content width inside the full-bleed background */
.slx-hero,
.slx-section {
  max-width: 1100px;
  margin-inline: auto;
}

/* LIGHT STREAMS LAYER */

.slx-light-layer {
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  display: flex;
  justify-content: center;
}

.slx-light-layer-inner {
  position: relative;
  width: 100%;
  max-width: 1100px;
  height: 100%;
  margin-inline: auto;
}

.slx-light {
  position: absolute;
  top: -20%;
  left: var(--x);
  width: var(--size);
  height: var(--size);
  border-radius: 50%;
  background: radial-gradient(
    circle,
    rgba(235, 243, 255, 0.7) 0%,
    rgba(4, 7, 22, 0) 70%
  );
  filter: blur(18px);
  opacity: 0.45;
  mix-blend-mode: screen;
  transform: translate3d(-50%, 0, 0);
  animation:
    slx-light-fall var(--duration) linear infinite,
    slx-light-wave calc(var(--duration) * 0.9) ease-in-out infinite;
  animation-delay: var(--delay);
}

/* only vertical position + fade */
@keyframes slx-light-fall {
  0% {
    top: -20%;
    opacity: 0;
  }
  10% {
    opacity: 0.4;
  }
  90% {
    top: 100%;
    opacity: 0.4;
  }
  100% {
    top: 120%;
    opacity: 0;
  }
}

@keyframes slx-light-wave {
  0% {
    transform: translate3d(-50%, 0, 0);
  }
  25% {
    transform: translate3d(calc(-50% - 240px), 0, 0);
  }
  50% {
    transform: translate3d(calc(-50% + 240px), 0, 0);
  }
  75% {
    transform: translate3d(calc(-50% - 240px), 0, 0);
  }
  100% {
    transform: translate3d(-50%, 0, 0);
  }
}

.back-link {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  margin-bottom: 1.6rem;
  padding: 0.45rem 0.9rem;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.18);
  background: rgba(3, 5, 20, 0.9);
  color: inherit;
  font-size: 0.8rem;
  text-decoration: none;
  backdrop-filter: blur(18px);
  box-shadow: 0 12px 35px rgba(0, 0, 0, 0.6);
  transition:
    transform 0.18s cubic-bezier(0.22, 0.61, 0.36, 1),
    border-color 0.18s,
    background 0.18s,
    box-shadow 0.18s;
}

.back-link:hover {
  transform: translateY(-1px);
  border-color: rgba(255, 255, 255, 0.45);
  background: rgba(6, 10, 35, 0.98);
  box-shadow: 0 18px 45px rgba(0, 0, 0, 0.8);
}

/* Scroll reveal */

.slx-reveal {
  opacity: 0;
  transform: translateY(40px) scale(0.98);
  filter: blur(3px);
  transition:
    opacity 0.6s cubic-bezier(0.22, 0.61, 0.36, 1),
    transform 0.6s cubic-bezier(0.22, 0.61, 0.36, 1),
    filter 0.6s cubic-bezier(0.22, 0.61, 0.36, 1);
}

.slx-reveal.is-visible {
  opacity: 1;
  transform: translateY(0) scale(1);
  filter: blur(0);
}

/* Hero */

.slx-hero {
  position: relative;
  border-radius: 1.75rem;
  padding-left: clamp(1.9rem, 4vw, 2.8rem);
  background: linear-gradient(145deg, rgba(7, 12, 40, 0.88), rgba(12, 22, 70, 0.92));
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 26px 70px rgba(0, 0, 0, 0.8);
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(260px, 1fr);
  align-items: center;
  overflow: hidden;
  backdrop-filter: blur(18px);
}

.slx-hero-left {
  max-width: 100%;
}

/* Right panel should stretch fully and clip content */
.slx-hero-right {
  align-self: stretch;
  height: 100%;
  overflow: hidden;

  /* Match the hero rounding ONLY on the outside-right corners */
  border-top-right-radius: 1.75rem;
  border-bottom-right-radius: 1.75rem;

  /* Important: left edge must be perfectly square */
  border-top-left-radius: 0;
  border-bottom-left-radius: 0;
}

/* Image must fill the panel perfectly */
.slx-hero-right > img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;

  /* kill the global .image rounding */
  border-radius: 0;
}

.slx-kicker {
  text-transform: uppercase;
  letter-spacing: 0.18em;
  font-size: 0.78rem;
  color: #8cd5ff;
  margin-bottom: 0.6rem;
}

.slx-title {
  font-size: clamp(2.1rem, 2vw, 2.9rem);
  line-height: 1.05;
  letter-spacing: -0.04em;
  margin: 0 0 0.85rem;
}

.slx-subtitle {
  margin: 0 0 1.5rem;
  font-size: 0.98rem;
  color: #a6b4d1;
  max-width: 36rem;
}

.slx-meta-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
}

.slx-tag-group {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
}

.slx-tag {
  font-size: 0.76rem;
  border-radius: 999px;
  padding: 0.25rem 0.7rem;
  background: rgba(10, 22, 72, 0.8);
  border: 1px solid rgba(177, 206, 255, 0.3);
  color: #cfddff;
}

.slx-stack {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  font-size: 0.78rem;
  color: #9eb0d7;
}

.slx-stack-label {
  text-transform: uppercase;
  letter-spacing: 0.16em;
  font-size: 0.72rem;
  color: #7aa5ff;
}

.slx-stack-value {
  opacity: 0.9;
}

.slx-hero-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.8rem;
}

.btn {
  border-radius: 999px;
  border: 1px solid transparent;
  padding: 0.75rem 1.55rem;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  transform-origin: center;
  transition:
    transform 0.2s cubic-bezier(0.22, 0.61, 0.36, 1),
    box-shadow 0.2s,
    background 0.2s,
    border-color 0.2s,
    color 0.2s;
}

.btn-primary {
  background:
    radial-gradient(circle at 0% 0%, #ffffff33 0, transparent 60%),
    linear-gradient(120deg, #4dd2ff, #a855ff);
  color: #02010a;
  box-shadow: 0 16px 45px rgba(0, 0, 0, 0.6);
}

.btn-primary:hover {
  transform: translateY(-2px) scale(1.02);
  box-shadow: 0 22px 60px rgba(0, 0, 0, 0.8);
}

.btn-ghost {
  background: rgba(10, 18, 52, 0.8);
  border-color: rgba(187, 206, 255, 0.35);
  color: #dde6ff;
  backdrop-filter: blur(14px);
}

.btn-ghost:hover {
  transform: translateY(-1px);
  background: rgba(18, 27, 72, 0.95);
  border-color: rgba(221, 234, 255, 0.7);
}

.slx-hero-footnote {
  font-size: 0.78rem;
  color: #8b9ac4;
}

/* Generic sections */

.slx-section {
  margin-top: 2rem;
  border-radius: 1.5rem;
  padding: 1.7rem 1.8rem;
  background: linear-gradient(145deg, rgba(5, 10, 34, 0.9), rgba(7, 14, 46, 0.92));
  border: 1px solid rgba(255, 255, 255, 0.06);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(16px);
}

.slx-section-grid {
  display: grid;
  grid-template-columns: minmax(0, 3.5fr) minmax(0, 2.6fr);
  gap: 1.8rem;
  align-items: flex-start;
}

.slx-section-grid-impact {
  display: grid;
  grid-template-columns: minmax(0, 2.5fr) minmax(0, 2fr);
  gap: 1.8rem;
  align-items: flex-start;
}

.slx-section-grid-learnings {
  display: grid;
  grid-template-columns: minmax(0, 1.4fr) minmax(0, 2.6fr);
  gap: 1.8rem;
  align-items: flex-start;
}

.slx-section-grid-admin {
  display: grid;
  grid-template-columns: minmax(0, 3fr) minmax(0, 3fr);
  gap: 1.8rem;
  align-items: flex-start;
}


.slx-section-grid-engine {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 1.8rem;
  align-items: flex-start;
}

.slx-section-block {
  display: flex;
  flex-direction: column;
  gap: 0.7rem;
}

.section-label {
  text-transform: uppercase;
  letter-spacing: 0.16em;
  font-size: 0.78rem;
  color: #8db1ff;
}

.section-title {
  margin: 0;
  font-size: 1.3rem;
  letter-spacing: -0.02em;
}

.section-subtitle {
  margin: 0 0 0.3rem;
  font-size: 1rem;
}

.section-sub {
  margin: 0;
  font-size: 0.92rem;
  color: #a4b3d4;
}

/* Lists */
.slx-list {
  margin: 0;
  padding-left: 1.1rem;
  list-style: disc;
  display: grid;
  gap: 0.45rem;
  font-size: 0.9rem;
  color: #a7b5d5;
}

.slx-list-spaced {
 margin: 0;
  padding-left: 1.1rem;
  list-style: disc;
  display: grid;
  gap: 1rem;
  font-size: 0.9rem;
  color: #a7b5d5;
}


/* Images */

.image-wrapper {
  border-radius: 1rem;
  padding: 0.7rem;
  background: radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.02));
  border: 1px solid rgba(188, 214, 255, 0.26);
}

.image {
  width: 100%;
  display: block;
  border-radius: 0.7rem;
}

/* Images */

.slx-gallery-card {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 1rem;
}

.slx-gallery-item {
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
  min-width: 0;
}

.slx-gallery-img {
  width: 100%;
  aspect-ratio: 16 / 12;     /* forces same vertical size */
  height: auto;
  display: block;
  border-radius: 0.85rem;
  background: linear-gradient(145deg, #05081f, #050b2a);
}

.slx-gallery-caption {
  margin: 0;
  font-size: 0.8rem;
  line-height: 1.35;
  color: #a4b3d4;
  text-align: center;
}

@media (max-width: 900px) {
  .slx-gallery-card {
    grid-template-columns: 1fr;
  }
}

.slx-gallery {
  display: flex;
  flex-direction: row;
  gap: 0.85rem;
}

.slx-image-glow.secondary {
  opacity: 0.9;
}

.slx-image-large {
  min-height: 230px;
  background: linear-gradient(145deg, #05081f, #050b2a);
}

.slx-image-caption {
  margin-top: 0.65rem;
}

.slx-image-login {
  margin-top: 0.9rem;
}

.slx-image-report {
  background: linear-gradient(145deg, #05081f, #0a1238);
}

/* Engine */
.slx-engine {
  margin-top: 2.2rem;
  position: relative;
}

.slx-engine-header {
  margin-bottom: 1.2rem;
}

.slx-engine-flow {
  position: absolute;
  top: 10rem; /* tune so it sits between titles and first rows */
  left: 0;
  right: 0;
  pointer-events: none;
}

.slx-engine-flow-line {
  position: relative;
  justify-self: center;         
  align-self: center;
  width: calc(3vw + 20px); 
  height: calc(0.6vh + 5px);
  border-radius: 999px;
  margin: 0;
  background: linear-gradient(
    90deg,
    transparent,
    #4dd2ff,
    #a855ff,
    transparent
  );
  background-size: 200% 100%;
  animation:
    slx-flow-move 4s linear infinite reverse;
  transform-origin: center;
  opacity: 0.55;
  filter: drop-shadow(0 0 2px rgba(124, 149, 199, 0.35));
}

.slx-engine-flow-line-1 {
  animation-delay: 0s;
}

.slx-engine-flow-line-2 {
  animation-delay: 1.4s;
}

/* Arrowhead on the right */
.slx-engine-flow-line::after {
  content: '';
  position: absolute;
  right: -7px;
  top: 50%;
  transform: translateY(-50%);
  width: 0;
  height: 0;
  border-style: solid;
  border-width: 12px 0 12px 20px;
  border-color: transparent transparent transparent #4dd2ff;
  filter: drop-shadow(0 0 2px rgba(124, 149, 199, 0.35));
  animation:
    slx-flow-move 4s linear infinite reverse;
}

/* Simple movement of the gradient along the beam */
@keyframes slx-flow-move {
  0% {
    background-position: 0% 0;
  }
  100% {
    background-position: 200% 0;
  }
}

/* Optional: hide on small screens if it gets cramped */
@media (max-width: 960px) {
  .slx-engine-flow {
    display: none;
  }
}

.slx-engine-matrix {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr) auto minmax(0, 1fr);
  column-gap: 1.2rem;
  align-items: center;
}

/* Column content */
.slx-engine-list {
  position: relative;
  margin: 0;
  padding: 0.4rem 0.5rem;
  list-style: none;
  display: grid;
  gap: 0rem;
  font-size: 0.88rem;
  color: #c0c9e9;
}

/* Label + value rows */
.slx-engine-list li {
  display: inline-flex;
  align-items: baseline;
  justify-content: flex-start;
  gap: 0rem;
  padding: 0;
}

.slx-engine-label {
  flex: 1;
  opacity: 0.9;
}

.slx-engine-value {
  font-family: var(--mono-font, 'JetBrains Mono', ui-monospace, SFMono-Regular,
    Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace);
  font-size: 0.82rem;
  color: #9ad1ff;
  white-space: nowrap;
}

.slx-engine-value-2 {
  font-family: var(--mono-font, 'JetBrains Mono', ui-monospace, SFMono-Regular,
    Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace);
  font-size: 0.82rem;
  color: #9ad1ff;
  white-space: nowrap;
}

/* Square brackets [ ] */
.slx-engine-list::before,
.slx-engine-list::after {
  content: '';
  position: absolute;
  top: 0;
  bottom: 0;
  width: 10px;
  border-style: solid;
  border-color: #aecdff;
  border-radius: 0;
  box-shadow: none;
}

/* [ */
.slx-engine-list::before {
  left: 0;
  border-width: 2px 0 2px 2px;
}

/* ] */
.slx-engine-list::after {
  right: 0;
  border-width: 2px 2px 2px 0;
}

/* Result image + caption under matrix */
.slx-engine-result {
  margin-top: 1.8rem;
}

/* Two-column layout for image + text */
.slx-engine-result-grid {
  display: grid;
  grid-template-columns: 3fr 2.4fr;   /* 60% / 40% */
  gap: 2rem;
  align-items: start;
}

/* Keep your existing image now centered in its left column */
.slx-engine-result-visual {
  display: flex;
  justify-content: center;
}

/* Right-hand text styling */
.slx-engine-result-text {
  color: #c8d4f4;
  font-size: 0.92rem;
  padding-top: 0.4rem;
}

.slx-result-title {
  margin: 0 0 0.7rem;
  font-size: 1.05rem;
  color: #aecdff;
}



/* Stack image + text on mobile */
@media (max-width: 900px) {
  .slx-engine-result-grid {
    grid-template-columns: 1fr;
  }
}


/* Engine column wrappers + titles */
.slx-engine-column {
  position: relative;
}

/* Titles centred between [ ] and slightly above them (row -1 vibe) */
.slx-engine-column-title {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  top: -0.5rem; /* tweak this value if you want it closer/further */
  font-size: 0.78rem;
  text-transform: uppercase;
  letter-spacing: 0.16em;
  color: #8db1ff;
  white-space: nowrap;
}


/* Feature layout */

/* Feature layout */
.slx-feature-layout {
  margin-top: 2.1rem;
}

.slx-feature-grid {
  display: grid;
  grid-template-columns: minmax(0, 3.5fr) minmax(0, 2.6fr);
  grid-template-rows: auto auto;
  gap: 1.8rem;
  align-items: start;
}

/* ensure the right column doesn't get forced into weird centering */
.slx-feature-right-top,
.slx-feature-right-bottom {
  align-items: stretch;
}

.section-sub.slx-feature-block {
  display: flex;
  flex-direction: column;
  gap: 0.45rem; /* slightly more spacing between each technique */
}


/* mobile stack */
@media (max-width: 960px) {
  .slx-feature-grid {
    grid-template-columns: 1fr;
  }
}


.slx-visual-panel {
  display: flex;
  flex-direction: column;
}

/* Modes / table */

.slx-modes {
  margin-top: 2.1rem;
}

.table-wrapper {
  margin-top: 0.85rem;
  overflow-x: auto;
  border-radius: 0.85rem;
  border: 1px solid rgba(174, 199, 255, 0.35);
  text-align: center;
}

.table-wrapper table {
  width: 100%;
  border-collapse: collapse;
  min-width: 280px;
  font-size: 0.82rem;
}

.table-wrapper th,
.table-wrapper td {
  padding: 0.6rem 0.75rem;
  text-align: left;
  border-bottom: 1px solid rgba(92, 115, 170, 0.7);
}

.table-wrapper tbody tr:nth-child(even) td {
  background: rgba(8, 16, 46, 0.6);
}

/* Stack */

.slx-stack {
  margin-top: 2.1rem;
}

.slx-stack-panel {
  gap: 0.8rem;
}

.slx-stack-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
  margin-top: 0.4rem;
}

.slx-chip {
  border-radius: 999px;
  padding: 0.35rem 0.8rem;
  font-size: 0.8rem;
  background: rgba(10, 21, 66, 0.9);
  border: 1px solid rgba(173, 199, 255, 0.5);
  color: #d4e0ff;
}

/* Impact / roadmap */

.slx-impact {
  margin-top: 2.1rem;
}

.slx-roadmap-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(0, 1.1fr);
  gap: 1.2rem;
}

.slx-small-heading {
  font-size: 0.85rem;
  text-transform: uppercase;
  letter-spacing: 0.18em;
  margin: 0 0 0.4rem;
  color: #90b3ff;
}

/* TIMELINE (horizontal, compact) */
.slx-timeline {
  margin-top: 2.1rem;
}

.slx-timeline-scroll {
  margin-top: 0.9rem;
  overflow-x: auto;
  overflow-y: hidden;
  padding: 0.2rem 0.2rem 0.6rem;
  -webkit-overflow-scrolling: touch;
  contain: layout paint;
}

.slx-timeline-strip {
  list-style: none;
  display: flex;
  gap: 0.9rem;
  margin: 0;
  padding: 0;
  min-width: max-content;
}

.slx-timeline-chip {
  position: relative;
  width: 270px;
  border-radius: 1rem;
  padding: 0.85rem 0.95rem 1.35rem;
  background: rgba(6, 12, 40, 0.55);
  border: 1px solid rgba(188, 214, 255, 0.18);
  box-shadow: none;
  contain: content;
}

.slx-timeline-top {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  margin-bottom: 0.55rem;
}

.slx-timeline-dot {
  width: 10px;
  height: 10px;
  border-radius: 999px;
  background: radial-gradient(circle, #4dd2ff 0, #a855ff 100%);
  box-shadow: 0 0 0 4px rgba(77, 210, 255, 0.10);
  flex: 0 0 auto;
}

.slx-timeline-date {
  font-size: 0.78rem;
  color: #92a7d7;
  white-space: nowrap;
}

.slx-timeline-text {
  font-size: 0.9rem;
  color: #c2cff1;
  line-height: 1.25;
}

.slx-timeline-version {
  position: absolute;
  right: 0.85rem;
  bottom: 0.7rem;
  font-size: 0.78rem;
  color: #9ad1ff;
  opacity: 0.9;
}

.slx-timeline-chip.is-current {
  border-color: rgba(221, 234, 255, 0.65);
  background: linear-gradient(145deg, rgba(10, 22, 72, 0.78), rgba(7, 14, 46, 0.82));
  box-shadow: none;
}

.slx-timeline-chip.is-current .slx-timeline-version {
  color: #dde6ff;
  opacity: 1;
}

.slx-timeline-chip.is-current .slx-timeline-dot {
  box-shadow: 0 0 0 5px rgba(168, 85, 255, 0.14);
}

/* Scrollbar (subtle) */
.slx-timeline-scroll::-webkit-scrollbar {
  height: 10px;
}
.slx-timeline-scroll::-webkit-scrollbar-thumb {
  background: rgba(141, 177, 255, 0.22);
  border-radius: 999px;
}

/* Animations */

@keyframes slx-pole-breathe {
  0% {
    transform: translateY(0);
    opacity: 0.7;
  }
  50% {
    transform: translateY(-4px);
    opacity: 1;
  }
  100% {
    transform: translateY(1px);
    opacity: 0.85;
  }
}

@keyframes slx-beam-flicker {
  0% {
    opacity: 0.6;
    filter: blur(2px);
  }
  50% {
    opacity: 1;
    filter: blur(1px);
  }
  100% {
    opacity: 0.7;
    filter: blur(2.5px);
  }
}

@keyframes slx-lux-pulse {
  0% {
    background: radial-gradient(circle at 50% 60%, rgba(7, 11, 32, 0.96), rgba(5, 7, 24, 0.9));
    box-shadow: 0 0 0 1px rgba(15, 23, 56, 0.9) inset;
  }
  50% {
    background: radial-gradient(circle at 50% 50%, rgba(77, 210, 255, 0.9), rgba(10, 18, 52, 0.98));
    box-shadow:
      0 0 8px rgba(77, 210, 255, 0.7),
      0 0 0 1px rgba(29, 78, 216, 0.9) inset;
  }
  100% {
    background: radial-gradient(circle at 50% 40%, rgba(168, 85, 255, 0.9), rgba(9, 12, 38, 0.98));
    box-shadow:
      0 0 9px rgba(168, 85, 255, 0.7),
      0 0 0 1px rgba(56, 114, 255, 0.9) inset;
  }
}

/* Responsive */

@media (max-width: 960px) {
  .slx-hero {
    grid-template-columns: 1fr;
  }

  .slx-section-grid {
    grid-template-columns: 1fr;
  }

  .slx-timeline-grid {
    grid-template-columns: 1fr;
  }

  .slx-engine-matrix {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 720px) {
  .sportslux-page {
    padding: 1.4rem 1.1rem 1.8rem;
  }

  .slx-hero {
    padding: 1.6rem 1.4rem;
  }

  .slx-roadmap-grid {
    grid-template-columns: 1fr;
  }

  .slx-field-footer {
    justify-content: flex-start;
  }

  .slx-engine-matrix {
    grid-template-columns: 1fr;
  }
}
</style>
