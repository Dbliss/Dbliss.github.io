<template>
  <article class="fr-page">
    <div class="fr-bg" aria-hidden="true">
      <span class="fr-orb fr-orb-1"></span>
      <span class="fr-orb fr-orb-2"></span>
      <span class="fr-grid"></span>
    </div>

    <RouterLink to="/projects" class="btn fr-back">Back to projects</RouterLink>

    <section class="fr-hero fr-reveal" v-reveal>
      <div class="fr-hero-copy">
        <p class="fr-kicker">FrontRunner product case study</p>
        <h1 class="fr-title">{{ project.title }}</h1>
        <p class="fr-tagline">{{ project.tagline }}</p>
        <p class="fr-lead">
          FrontRunner is a customer-facing booking platform for councils and sports operators that centralises
          reservations, automates lighting schedules through EXEDRA, and removes manual coordination overhead.
        </p>

        <div class="fr-pill-row">
          <CategoryTag :category="project.category" />
          <span class="tag" v-for="tag in project.tags" :key="tag">{{ tag }}</span>
        </div>

        <p class="fr-stack mono"><strong>Stack:</strong> {{ project.stack.join(' | ') }}</p>
        <p class="fr-doc-note mono">Source baseline: FrontRunner Product Overview v1.0, February 11, 2026.</p>
      </div>

      <figure class="fr-hero-media">
        <img class="fr-hero-image" :src="login" alt="FrontRunner login and booking interface preview." loading="eager" />
      </figure>
    </section>

    <section class="fr-segment-nav card fr-reveal" v-reveal>
      <button
        v-for="segment in segments"
        :key="segment.id"
        type="button"
        class="fr-nav-btn"
        :class="{ 'is-active': activeSegment === segment.id }"
        :aria-pressed="(activeSegment === segment.id).toString()"
        @click="activeSegment = segment.id"
      >
        {{ segment.label }}
      </button>
    </section>

    <div class="fr-content">
      <section v-show="activeSegment === 'context'" class="card fr-section fr-segment-panel fr-reveal" v-reveal>
        <p class="section-label">Context</p>
        <h2 class="fr-section-title">Why this platform exists</h2>
        <p class="fr-copy">
          Councils and sports operators need one operating model that handles scheduling, communication, and lighting
          automation in the same product. Before FrontRunner, these workflows were fragmented across manual calendars,
          email threads, and controller-level changes.
        </p>

        <section class="fr-context-chapter">
          <p class="fr-context-step mono">01 | Operational baseline</p>
          <h3 class="fr-context-title">What teams were dealing with before FrontRunner</h3>
          <div class="fr-context-grid">
            <article class="fr-context-card" v-for="item in contextBlocks" :key="item.title">
              <h4>{{ item.title }}</h4>
              <p>{{ item.copy }}</p>
            </article>
          </div>
        </section>

        <section class="fr-context-chapter">
          <p class="fr-context-step mono">02 | Stakeholders</p>
          <h3 class="fr-context-title">Who this product has to satisfy on day one</h3>
          <div class="fr-context-stakeholder-grid">
            <article class="fr-context-card" v-for="item in stakeholderNeeds" :key="item.role">
              <h4>{{ item.role }}</h4>
              <p>{{ item.need }}</p>
              <p class="fr-context-meta mono">{{ item.risk }}</p>
            </article>
          </div>
        </section>

        <section class="fr-context-chapter">
          <p class="fr-context-step mono">03 | Product framing</p>
          <h3 class="fr-context-title">What had to be true for v1 to be viable</h3>
          <ul class="fr-list fr-context-list">
            <li v-for="item in contextV1Goals" :key="item">{{ item }}</li>
          </ul>
        </section>

        <section class="fr-context-chapter">
          <p class="fr-context-step mono">04 | Evidence backlog</p>
          <h3 class="fr-context-title">Context points to add before final publishing</h3>
          <ul class="fr-list fr-context-list">
            <li v-for="item in contextTodoBacklog" :key="item">{{ item }}</li>
          </ul>
        </section>

        <div class="fr-context-media-wrap">
          <p class="fr-context-step mono">Visual references</p>
          <div class="fr-context-media-grid">
            <figure class="fr-context-media">
              <img :src="login" alt="User booking and authentication experience." loading="lazy" />
            </figure>
            <figure class="fr-context-media">
              <img :src="tenancy" alt="Subtenancy delegation for regional venue control." loading="lazy" />
            </figure>
            <figure class="fr-context-media">
              <img :src="mobileView" alt="Mobile booking experience for field-side operations." loading="lazy" />
            </figure>
          </div>
        </div>
      </section>

      <section v-show="activeSegment === 'system-design'" class="card fr-section fr-segment-panel fr-reveal" v-reveal>
        <p class="section-label">System Design</p>
        <h2 class="fr-section-title">Structured System Design Walkthrough</h2>
        <p class="fr-copy">
          This section follows a system design interview structure from scope to deep dives. Each step is isolated so
          the design reads clearly for engineering leaders and hiring managers.
        </p>

        <section class="fr-design-block">
          <p class="fr-design-step mono">1) Functional Requirements</p>
          <h3 class="fr-design-title">Prioritized user actions</h3>
          <p class="fr-copy">
            Requirements are intentionally narrowed to top-priority behavior so the architecture remains focused.
          </p>
          <div class="fr-split-grid fr-split-grid-wide">
            <article class="fr-subcard">
              <h3>Clarifying questions asked</h3>
              <ul class="fr-list compact">
                <li v-for="item in functionalQuestions" :key="item">{{ item }}</li>
              </ul>
            </article>
            <article class="fr-subcard">
              <h3>Top requirements</h3>
              <ul class="fr-list compact">
                <li v-for="item in functionalRequirements" :key="item">{{ item }}</li>
              </ul>
            </article>
          </div>
        </section>

        <section class="fr-design-block">
          <p class="fr-design-step mono">2) Non-functional Requirements</p>
          <h3 class="fr-design-title">Quantified system quality goals</h3>
          <div class="fr-split-grid fr-split-grid-wide">
            <article class="fr-subcard">
              <h3>Targets</h3>
              <ul class="fr-list compact">
                <li v-for="item in nonFunctionalRequirements" :key="item">{{ item }}</li>
              </ul>
            </article>
            <article class="fr-subcard">
              <h3>Design checklist used</h3>
              <ul class="fr-list compact">
                <li v-for="item in nonFunctionalChecklist" :key="item">{{ item }}</li>
              </ul>
            </article>
          </div>
        </section>

        <section class="fr-design-block">
          <p class="fr-design-step mono">3) Capacity Estimation</p>
          <h3 class="fr-design-title">Calculate only when it changes design</h3>
          <article class="fr-subcard fr-subcard-wide">
            <p class="fr-copy">{{ capacityApproach }}</p>
            <ul class="fr-list compact">
              <li v-for="item in capacityTriggers" :key="item">{{ item }}</li>
            </ul>
          </article>
        </section>

        <section class="fr-design-block">
          <p class="fr-design-step mono">4) Core Entities</p>
          <h3 class="fr-design-title">Initial data model primitives</h3>
          <div class="fr-entity-grid">
            <article class="fr-entity-card" v-for="entity in coreEntities" :key="entity.name">
              <h3>{{ entity.name }}</h3>
              <p>{{ entity.purpose }}</p>
              <p class="fr-entity-meta mono">{{ entity.keyFields }}</p>
            </article>
          </div>
        </section>

        <section class="fr-design-block">
          <p class="fr-design-step mono">5) API or System Interface</p>
          <h3 class="fr-design-title">REST-first contract</h3>
          <p class="fr-copy">
            External interfaces default to REST resources. Sensitive identity is derived from authenticated tokens, not
            request body user IDs.
          </p>
          <div class="fr-api-grid">
            <article class="fr-api-card" v-for="api in apiEndpoints" :key="api.method + api.path">
              <p class="fr-api-meta mono">{{ api.method }}</p>
              <p class="fr-api-path mono">{{ api.path }}</p>
              <p>{{ api.purpose }}</p>
            </article>
          </div>
        </section>

        <section class="fr-design-block">
          <p class="fr-design-step mono">6) Data Flow (optional)</p>
          <h3 class="fr-design-title">End-to-end request lifecycle</h3>
          <div class="fr-flow-grid">
            <article class="fr-flow-card" v-for="step in dataFlowSteps" :key="step.title">
              <p class="fr-flow-step mono">{{ step.step }}</p>
              <h3>{{ step.title }}</h3>
              <p>{{ step.copy }}</p>
            </article>
          </div>
        </section>

        <section class="fr-design-block">
          <p class="fr-design-step mono">7) High Level Design</p>
          <h3 class="fr-design-title">Primary components and responsibilities</h3>
          <div class="fr-arch-grid">
            <article class="fr-arch-card" v-for="component in highLevelComponents" :key="component.name">
              <h3>{{ component.name }}</h3>
              <p>{{ component.responsibility }}</p>
              <p class="fr-arch-meta mono">{{ component.state }}</p>
            </article>
          </div>
        </section>

        <section class="fr-design-block">
          <p class="fr-design-step mono">8) Deep Dives</p>
          <h3 class="fr-design-title">Bottlenecks, edge cases, and hardening</h3>
          <div class="fr-deep-grid">
            <article class="fr-deep-card" v-for="item in deepDiveAreas" :key="item.title">
              <h3>{{ item.title }}</h3>
              <p>{{ item.copy }}</p>
            </article>
          </div>
        </section>
      </section>

      <section v-show="activeSegment === 'outcomes'" class="card fr-section fr-segment-panel fr-reveal" v-reveal>
        <p class="section-label">Outcomes</p>
        <h2 class="fr-section-title">Commercial impact, performance, and growth</h2>
        <p class="fr-copy">
          This section is intentionally structured for leadership and hiring review. Replace placeholders with verified
          production values from analytics, finance, and reliability reporting.
        </p>

        <section class="fr-outcome-block">
          <h3 class="fr-outcome-title">Commercial</h3>
          <div class="fr-metric-grid">
            <article class="fr-metric-card" v-for="kpi in commercialMetrics" :key="kpi.label">
              <p class="fr-metric-label">{{ kpi.label }}</p>
              <p class="fr-metric-value mono">{{ kpi.value }}</p>
              <p class="fr-metric-detail">{{ kpi.detail }}</p>
            </article>
          </div>
        </section>

        <section class="fr-outcome-block">
          <h3 class="fr-outcome-title">Performance</h3>
          <div class="fr-metric-grid">
            <article class="fr-metric-card" v-for="kpi in performanceMetrics" :key="kpi.label">
              <p class="fr-metric-label">{{ kpi.label }}</p>
              <p class="fr-metric-value mono">{{ kpi.value }}</p>
              <p class="fr-metric-detail">{{ kpi.detail }}</p>
            </article>
          </div>
        </section>

        <section class="fr-outcome-block">
          <h3 class="fr-outcome-title">Key Learnings</h3>
          <div class="fr-learning-grid">
            <article class="fr-learning-card" v-for="item in keyLearnings" :key="item.title">
              <h4>{{ item.title }}</h4>
              <p><strong>Hardship:</strong> {{ item.hardship }}</p>
              <p><strong>How I overcame it:</strong> {{ item.overcome }}</p>
              <p><strong>Skills developed:</strong> {{ item.skills }}</p>
            </article>
          </div>
        </section>
      </section>
    </div>
  </article>
</template>

<script setup>
import { ref } from 'vue'
import { RouterLink } from 'vue-router'
import CategoryTag from '../components/CategoryTag.vue'

import login from '../assets/sports-booking/login.png'
import mobileView from '../assets/sports-booking/mobile_view.png'
import tenancy from '../assets/sports-booking/tenancy.png'

defineProps({
  project: {
    type: Object,
    required: true
  }
})

const segments = [
  { id: 'context', label: 'Context' },
  { id: 'system-design', label: 'System Design' },
  { id: 'outcomes', label: 'Outcomes' }
]

const activeSegment = ref('context')

const contextBlocks = [
  {
    title: 'Problem statement',
    copy: 'Field bookings, lighting changes, and stakeholder communication often run in separate tools. That creates conflict risk, delayed updates, and weak operational visibility.'
  },
  {
    title: 'Technology shift: smart lighting',
    copy: 'API-addressable smart lighting ecosystems make software-defined field operations practical. Booking intent can now be translated directly into controlled lighting schedules.'
  },
  {
    title: 'Benefits to councils and operators',
    copy: 'FrontRunner cuts manual rework, enforces policy at request time, improves auditability, and gives teams one clear operating surface for scheduling and reporting.'
  }
]

const stakeholderNeeds = [
  {
    role: 'Council operations manager',
    need: 'Needs one source of truth for bookings and lighting outcomes across every managed venue.',
    risk: 'Failure mode: manual workarounds and weak reporting confidence.'
  },
  {
    role: 'Venue administrator',
    need: 'Needs fast booking-on-behalf flows, conflict visibility, and bulk actions for weather or maintenance.',
    risk: 'Failure mode: slow response when schedules change on the same day.'
  },
  {
    role: 'Sub-tenant coordinator',
    need: 'Needs local autonomy while respecting parent-tenant governance and policy restrictions.',
    risk: 'Failure mode: over-permissioned access or blocked regional operations.'
  },
  {
    role: 'Public hirer or club staff',
    need: 'Needs a clear self-service flow with immediate booking confirmation and transparent eligibility rules.',
    risk: 'Failure mode: drop-off at request stage and increased support load.'
  }
]

const contextV1Goals = [
  'Deliver one booking surface that enforces policy and conflict checks before confirmation.',
  'Translate validated bookings into dependable lighting schedules without manual controller edits.',
  'Support tenant and sub-tenant governance with clear, auditable permission boundaries.',
  'Establish trust with operators through reliable same-day schedule publication.',
  'TODO: Add exact v1 adoption criteria agreed with delivery and operations teams.'
]

const contextTodoBacklog = [
  'TODO: Add baseline numbers for admin hours per week spent on booking and lighting coordination before FrontRunner.',
  'TODO: Add evidence from user interviews showing the most frequent workflow breakpoints in the old process.',
  'TODO: Add launch scope boundaries (in-scope venues, excluded edge cases, and rollout phases).',
  'TODO: Add regulatory or council policy constraints that shaped the initial architecture.'
]

const functionalQuestions = [
  'Do councils need to support both self-service hirers and booking-on-behalf flows?',
  'Should lighting schedules update in real time when same-day bookings are created or changed?',
  'Can sub-tenants manage local operations while parent tenant governance remains enforced?'
]

const functionalRequirements = [
  'Users should be able to create and manage field bookings with selected light profiles.',
  'Users should be able to submit bookings that are validated against policy and conflict rules in real time.',
  'Admins should be able to operate venues (book on behalf, cancel in bulk, and export reports).'
]

const nonFunctionalRequirements = [
  'The system should be highly available: target 99.9% monthly uptime for booking and admin APIs.',
  'The system should be low latency: booking validation and conflict checks should complete at P95 < 250ms.',
  'The system should be reliable for control integration: same-day schedule publication target P99 < 60s.',
  'The system should prioritize durability: no loss of committed bookings, with backup targets RPO <= 5 min and RTO <= 30 min.',
  'The system should enforce security and access control across tenant boundaries via RBAC and API authorization.'
]

const nonFunctionalChecklist = [
  'CAP: prioritize availability for booking UX while keeping deterministic rule evaluation at write time.',
  'Scalability: read-heavy calendar access with write spikes around evening and weekend booking windows.',
  'Latency: booking creation and update paths are strict low-latency paths.',
  'Fault tolerance: retries and idempotency for external scheduler publishing.',
  'Compliance and security: tenant isolation, auditable admin actions, and secure credential handling.'
]

const capacityApproach =
  'Capacity math is done only where it changes architecture choices. Instead of blanket DAU/QPS arithmetic, estimate at the exact bottleneck: schedule publication throughput, conflict-check fan-out, and peak write bursts for booking windows.'

const capacityTriggers = [
  'If same-day booking spikes exceed single scheduler worker capacity, scale publish workers horizontally with queue partitioning.',
  'If conflict checks become CPU-bound for large venues, shard availability indexes by venue and date windows.',
  'If report export size grows beyond synchronous request limits, move exports to async jobs with signed download links.'
]

const coreEntities = [
  {
    name: 'Tenant',
    purpose: 'Represents parent council or delegated sub-tenant with governance boundaries.',
    keyFields: 'id | parentTenantId | tenancyScope | brandingProfile'
  },
  {
    name: 'User',
    purpose: 'Authenticated actor with role assignments and tenant-scoped permissions.',
    keyFields: 'id | tenantId | roleIds | status'
  },
  {
    name: 'VenueField',
    purpose: 'Bookable physical field with allowed lighting profiles and operating windows.',
    keyFields: 'id | tenantId | timezone | allowedLightLevels'
  },
  {
    name: 'Booking',
    purpose: 'Core reservation record used for scheduling, notifications, and reporting.',
    keyFields: 'id | fieldId | startAt | endAt | lightProfile | status'
  },
  {
    name: 'PolicyRule',
    purpose: 'Validation rule set for windows, quotas, durations, and deny conditions.',
    keyFields: 'id | tenantId | ruleType | scope | priority'
  },
  {
    name: 'LightingSchedule',
    purpose: 'Generated control payload translated from bookings for EXEDRA publishing.',
    keyFields: 'id | bookingId | publishStatus | publishedAt'
  }
]

const apiEndpoints = [
  {
    method: 'POST',
    path: '/v1/auth/sessions',
    purpose: 'Authenticate user and issue scoped token for current tenant context.'
  },
  {
    method: 'POST',
    path: '/v1/bookings',
    purpose: 'Create booking with policy and conflict evaluation before persistence.'
  },
  {
    method: 'PATCH',
    path: '/v1/bookings/{bookingId}',
    purpose: 'Update booking with the same validation pathway and schedule regeneration.'
  },
  {
    method: 'POST',
    path: '/v1/bookings/cancellations:bulk',
    purpose: 'Cancel bookings in range for weather or maintenance operations.'
  },
  {
    method: 'GET',
    path: '/v1/fields/{fieldId}/availability?from=&to=',
    purpose: 'Read computed availability slots for booking UX.'
  },
  {
    method: 'GET',
    path: '/v1/reports/bookings?from=&to=&fieldId=',
    purpose: 'Read filtered booking reports for export and reconciliation.'
  },
  {
    method: 'POST',
    path: '/v1/lighting/schedules:publish',
    purpose: 'Publish schedule batch to EXEDRA integration service.'
  }
]

const dataFlowSteps = [
  {
    step: '01',
    title: 'Client request enters API gateway',
    copy: 'Authenticated booking request arrives with tenant context resolved from token.'
  },
  {
    step: '02',
    title: 'Policy engine evaluates request',
    copy: 'Rules and existing reservations are checked for conflicts, quotas, and denied conditions.'
  },
  {
    step: '03',
    title: 'Transaction commits booking state',
    copy: 'Booking record and audit event persist atomically on valid request outcome.'
  },
  {
    step: '04',
    title: 'Scheduler creates control windows',
    copy: 'Lighting schedule payloads are derived with daylight and buffering constraints.'
  },
  {
    step: '05',
    title: 'Integration publisher dispatches to EXEDRA',
    copy: 'Publish service sends idempotent schedule updates to external control APIs.'
  },
  {
    step: '06',
    title: 'Notification and reporting updates',
    copy: 'Confirmation emails and report views reflect final booking and publish state.'
  }
]

const highLevelComponents = [
  {
    name: 'Web Client (Vue)',
    responsibility: 'Handles booking UX, availability views, and admin operations.',
    state: 'UI state + auth token + client-side validation hints'
  },
  {
    name: 'API Service',
    responsibility: 'Processes requests, enforces auth, validates payloads, and orchestrates workflows.',
    state: 'Booking commands + policy evaluation results + audit events'
  },
  {
    name: 'Policy Engine',
    responsibility: 'Evaluates booking rules deterministically for allow or deny outcomes.',
    state: 'Compiled policy set + explainable decision traces'
  },
  {
    name: 'PostgreSQL',
    responsibility: 'System of record for bookings, users, policies, and scheduler state.',
    state: 'Durable transactional data model'
  },
  {
    name: 'Scheduler and Queue',
    responsibility: 'Builds and dispatches lighting schedules asynchronously and reliably.',
    state: 'Publish jobs + retries + idempotency keys'
  },
  {
    name: 'Integration and Notifications',
    responsibility: 'Connects EXEDRA for lighting control and SMTP for user communications.',
    state: 'Publish acknowledgements + delivery logs'
  }
]

const deepDiveAreas = [
  {
    title: 'Feed path latency under load',
    copy: 'Calendar availability reads dominate traffic; response caches and precomputed availability windows protect P95 latency.'
  },
  {
    title: 'Write consistency vs availability',
    copy: 'Booking writes stay strongly validated and transactional to avoid double-booking, while read paths can favor availability.'
  },
  {
    title: 'Scheduler failure recovery',
    copy: 'Queued publish jobs use retries, dead-letter handling, and idempotency keys so transient integration failures do not corrupt field state.'
  },
  {
    title: 'Tenant boundary security',
    copy: 'Tenant and sub-tenant scope checks are enforced at API boundaries to prevent cross-tenant data exposure.'
  },
  {
    title: 'Operational governance',
    copy: 'Admin actions produce auditable trails and reportable operational evidence for councils and stakeholders.'
  }
]

const commercialMetrics = [
  {
    label: 'Users onboarded',
    value: '[insert exact user count]',
    detail: 'Total councils, clubs, admins, and hirers active in the platform.'
  },
  {
    label: 'Venues enabled',
    value: '[insert exact venue count]',
    detail: 'Live venues with booking and lighting automation in operation.'
  },
  {
    label: 'Bookings processed',
    value: '[insert exact booking volume]',
    detail: 'Total reservation throughput for the reporting period.'
  },
  {
    label: 'Sales or contract impact',
    value: '[insert exact sales value]',
    detail: 'Attributed revenue or contract value influenced by FrontRunner.'
  }
]

const performanceMetrics = [
  {
    label: 'Availability SLA',
    value: '[insert uptime percentage]',
    detail: 'Service uptime over production reporting period.'
  },
  {
    label: 'Schedule publish success',
    value: '[insert success rate]',
    detail: 'Percent of generated schedules successfully commissioned to EXEDRA.'
  },
  {
    label: 'Conflict prevention rate',
    value: '[insert prevention metric]',
    detail: 'Policy and conflict engine effectiveness before booking commit.'
  },
  {
    label: 'Operational effort reduction',
    value: '[insert time or cost reduction]',
    detail: 'Measured reduction in manual admin intervention.'
  }
]

const keyLearnings = [
  {
    title: 'Designing deterministic policy systems',
    hardship: 'Complex booking rules can become inconsistent when encoded ad hoc across frontend and backend.',
    overcome: 'I centralized policy evaluation and standardized rule precedence to produce explainable outcomes.',
    skills: 'Rules engine design, API contracts, and consistency testing.'
  },
  {
    title: 'Building reliable external integrations',
    hardship: 'Controller integrations can fail or timeout, which risks inconsistent field states.',
    overcome: 'I implemented retry-safe publishing and explicit failure handling to protect runtime reliability.',
    skills: 'Resilience patterns, idempotent workflows, and production observability.'
  },
  {
    title: 'Scaling multi-tenant authorization',
    hardship: 'Tenant delegation introduces edge cases in permission boundaries and inherited controls.',
    overcome: 'I formalized parent and subtenant scopes with role-based checks at the API layer.',
    skills: 'RBAC architecture, security-first design, and tenancy modeling.'
  },
  {
    title: 'Delivering customer-facing UX under constraints',
    hardship: 'Operators need speed and clarity, but workflows still must enforce governance and safety.',
    overcome: 'I balanced strict backend controls with clear UI feedback and low-friction booking flows.',
    skills: 'Product thinking, UX systems design, and stakeholder communication.'
  }
]

const vReveal = {
  mounted(el) {
    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
      el.classList.add('is-visible')
      return
    }
    const observer = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach(entry => {
          if (!entry.isIntersecting) return
          entry.target.classList.add('is-visible')
          obs.unobserve(entry.target)
        })
      },
      { threshold: 0.18, rootMargin: '0px 0px -6% 0px' }
    )
    observer.observe(el)
  }
}
</script>

<style scoped>
.fr-page {
  --fr-border: rgba(169, 201, 255, 0.22);
  --fr-soft: rgba(8, 19, 37, 0.72);
  --fr-soft-2: rgba(8, 16, 30, 0.86);
  --fr-ink: #edf6ff;
  --fr-muted: rgba(208, 228, 252, 0.78);
  --fr-accent: #5ad2ff;
  --fr-accent-2: #8bf2c9;
  position: relative;
  width: 100vw;
  margin-inline: calc(50% - 50vw);
  min-height: 100vh;
  padding: clamp(1.4rem, 2.8vw, 2.4rem) clamp(1.1rem, 3vw, 2.6rem) clamp(3rem, 5vw, 4.4rem);
  overflow: hidden;
  color: var(--fr-ink);
  background:
    radial-gradient(circle at 6% 0%, rgba(43, 146, 194, 0.28), transparent 46%),
    radial-gradient(circle at 94% 5%, rgba(72, 58, 148, 0.3), transparent 42%),
    linear-gradient(155deg, #020611 0%, #040b16 45%, #06060d 100%);
}

:global(body) {
  overflow-x: hidden;
}

.fr-page > * {
  position: relative;
  z-index: 1;
}

.fr-bg {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 0;
}

.fr-orb {
  position: absolute;
  border-radius: 999px;
  filter: blur(36px);
  opacity: 0.34;
  animation: frFloat 16s ease-in-out infinite alternate;
}

.fr-orb-1 {
  top: 12%;
  left: -120px;
  width: 320px;
  height: 320px;
  background: #2eb6d4;
}

.fr-orb-2 {
  right: -90px;
  top: 38%;
  width: 300px;
  height: 300px;
  background: #4f65ff;
  animation-duration: 19s;
}

.fr-grid {
  position: absolute;
  inset: -60px;
  background-image:
    linear-gradient(rgba(126, 173, 255, 0.08) 1px, transparent 1px),
    linear-gradient(90deg, rgba(126, 173, 255, 0.08) 1px, transparent 1px);
  background-size: 54px 54px;
  mask-image: radial-gradient(circle at 50% 20%, rgba(0, 0, 0, 0.7), transparent 72%);
}

.fr-back {
  display: inline-flex;
  margin-bottom: 1.4rem;
  border-color: var(--fr-border);
  background: rgba(3, 9, 20, 0.92);
  color: var(--fr-ink);
}

.fr-hero {
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(0, 0.9fr);
  gap: clamp(1.4rem, 2.6vw, 2.4rem);
  align-items: stretch;
  max-width: 1280px;
  margin: 0 auto 1.6rem;
  padding: clamp(1.6rem, 2.8vw, 2.4rem);
  border: 1px solid var(--fr-border);
  border-radius: 24px;
  background: linear-gradient(155deg, rgba(6, 16, 33, 0.86), rgba(4, 10, 21, 0.9));
  box-shadow: 0 28px 80px rgba(0, 0, 0, 0.55);
}

.fr-kicker {
  margin: 0;
  text-transform: uppercase;
  letter-spacing: 0.18em;
  font-size: 0.74rem;
  color: var(--fr-accent-2);
}

.fr-title {
  margin: 0.48rem 0 0.62rem;
  font-size: clamp(2rem, 1.24rem + 2.6vw, 3.5rem);
  line-height: 1.06;
}

.fr-tagline {
  margin: 0 0 1rem;
  color: #d8ecff;
  font-size: clamp(1.08rem, 0.92rem + 0.7vw, 1.42rem);
}

.fr-lead {
  margin: 0 0 1.15rem;
  color: var(--fr-muted);
  max-width: 70ch;
  font-size: 1.03rem;
}

.fr-pill-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.52rem;
}

.fr-stack {
  margin: 1rem 0 0.34rem;
  color: #d2e8ff;
  font-size: 0.92rem;
}

.fr-doc-note {
  margin: 0;
  color: rgba(188, 214, 244, 0.84);
  font-size: 0.8rem;
}

.fr-hero-media {
  margin: 0;
  border-radius: 18px;
  border: 1px solid var(--fr-border);
  background: rgba(4, 10, 21, 0.9);
  padding: 0.82rem;
  display: flex;
  align-items: center;
}

.fr-hero-image {
  display: block;
  width: 100%;
  height: 100%;
  border-radius: 12px;
  object-fit: cover;
}

.fr-segment-nav {
  max-width: 1280px;
  margin: 0 auto 1.8rem;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.8rem;
  padding: 0.9rem;
  border-color: var(--fr-border);
  background: rgba(7, 18, 35, 0.88);
}

.fr-nav-btn {
  min-height: 82px;
  border-radius: 14px;
  border: 1px solid rgba(142, 193, 255, 0.28);
  background: rgba(8, 22, 43, 0.78);
  color: #d7ebff;
  font-size: clamp(1rem, 0.85rem + 0.6vw, 1.28rem);
  font-weight: 700;
  letter-spacing: 0.02em;
  cursor: pointer;
  transition: border-color 0.2s ease, background-color 0.2s ease, transform 0.2s ease;
}

.fr-nav-btn:hover {
  border-color: rgba(101, 205, 255, 0.82);
  background: rgba(11, 28, 55, 0.92);
  transform: translateY(-1px);
}

.fr-nav-btn.is-active {
  border-color: rgba(90, 210, 255, 0.95);
  background: linear-gradient(145deg, rgba(16, 49, 86, 0.98), rgba(11, 30, 56, 0.98));
  box-shadow:
    0 12px 28px rgba(0, 0, 0, 0.34),
    inset 0 0 0 1px rgba(135, 211, 255, 0.24);
}

.fr-content {
  max-width: 1280px;
  margin: 0 auto;
}

.fr-section {
  border-color: var(--fr-border);
  background: var(--fr-soft-2);
  padding: clamp(1.5rem, 2.6vw, 2.3rem);
}

.fr-segment-panel {
  min-height: 940px;
}

.fr-section-title {
  margin: 0.42rem 0 0.9rem;
  font-size: clamp(1.5rem, 1.15rem + 1.1vw, 2.1rem);
}

.fr-copy {
  margin: 0 0 1.15rem;
  color: var(--fr-muted);
  max-width: 82ch;
  font-size: 1rem;
  line-height: 1.6;
}

.fr-list {
  margin: 0;
  padding-left: 1.15rem;
  color: var(--fr-muted);
}

.fr-list li + li {
  margin-top: 0.48rem;
}

.fr-context-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.9rem;
}

.fr-context-chapter {
  margin-top: 1.3rem;
  padding: 1.15rem;
  border: 1px solid rgba(135, 183, 255, 0.24);
  border-radius: 16px;
  background: linear-gradient(145deg, rgba(8, 22, 44, 0.82), rgba(7, 17, 34, 0.86));
}

.fr-context-step {
  margin: 0;
  color: var(--fr-accent);
  font-size: 0.78rem;
  letter-spacing: 0.08em;
}

.fr-context-title {
  margin: 0.45rem 0 0.88rem;
  font-size: 1.18rem;
}

.fr-context-stakeholder-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.9rem;
}

.fr-context-list {
  margin-top: 0.1rem;
}

.fr-context-list li {
  line-height: 1.58;
}

.fr-context-media-wrap {
  margin-top: 1.3rem;
}

.fr-context-meta {
  margin-top: 0.6rem;
  color: rgba(181, 213, 248, 0.88);
  font-size: 0.8rem;
}

.fr-context-card {
  border: 1px solid rgba(132, 181, 255, 0.24);
  border-radius: 14px;
  padding: 1.05rem;
  background: rgba(8, 21, 39, 0.82);
}

.fr-context-card h4 {
  margin: 0 0 0.55rem;
  font-size: 1.04rem;
}

.fr-context-card p {
  margin: 0;
  color: var(--fr-muted);
  font-size: 0.95rem;
  line-height: 1.55;
}

.fr-context-media-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.9rem;
}

.fr-context-media {
  margin: 0;
  border-radius: 14px;
  overflow: hidden;
  border: 1px solid rgba(139, 186, 255, 0.24);
  background: rgba(7, 16, 31, 0.8);
}

.fr-context-media img {
  width: 100%;
  height: 250px;
  object-fit: cover;
  display: block;
}

.fr-split-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1.15rem;
}

.fr-split-grid-wide {
  margin-bottom: 0.2rem;
}

.fr-design-block {
  margin-top: 2.1rem;
  padding: 1.2rem;
  border: 1px solid rgba(133, 181, 255, 0.24);
  border-radius: 16px;
  background: rgba(7, 19, 36, 0.68);
}

.fr-design-step {
  margin: 0;
  color: var(--fr-accent);
  font-size: 0.84rem;
  letter-spacing: 0.08em;
}

.fr-design-title {
  margin: 0.5rem 0 0.72rem;
  font-size: 1.28rem;
}

.fr-subcard {
  border: 1px solid rgba(144, 186, 255, 0.24);
  border-radius: 14px;
  padding: 1.2rem;
  background: rgba(7, 17, 32, 0.82);
}

.fr-subcard h3 {
  margin: 0 0 0.65rem;
  font-size: 1.08rem;
}

.fr-subcard-wide {
  width: 100%;
}

.fr-entity-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
}

.fr-entity-card {
  border: 1px solid rgba(138, 182, 252, 0.24);
  border-radius: 14px;
  padding: 1rem 1.05rem;
  background: rgba(8, 21, 39, 0.86);
}

.fr-entity-card h3 {
  margin: 0 0 0.42rem;
  font-size: 1rem;
}

.fr-entity-card p {
  margin: 0;
  color: var(--fr-muted);
  line-height: 1.56;
}

.fr-entity-meta {
  margin-top: 0.48rem;
  color: rgba(188, 218, 253, 0.9);
  font-size: 0.8rem;
}

.fr-api-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
}

.fr-api-card {
  border-radius: 14px;
  border: 1px solid rgba(133, 181, 255, 0.24);
  background: rgba(8, 21, 40, 0.82);
  padding: 1rem;
}

.fr-api-meta {
  margin: 0 0 0.22rem;
  color: var(--fr-accent);
  font-size: 0.74rem;
}

.fr-api-path {
  margin: 0 0 0.45rem;
  color: #d9ecff;
  font-size: 0.82rem;
  word-break: break-word;
}

.fr-api-card p {
  margin: 0;
  color: var(--fr-muted);
  font-size: 0.9rem;
  line-height: 1.55;
}

.fr-flow-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
}

.fr-flow-card {
  border-radius: 14px;
  border: 1px solid rgba(133, 181, 255, 0.24);
  background: rgba(8, 21, 40, 0.82);
  padding: 1rem;
}

.fr-flow-step {
  margin: 0 0 0.42rem;
  color: var(--fr-accent);
  font-size: 0.76rem;
  letter-spacing: 0.08em;
}

.fr-flow-card h3 {
  margin: 0 0 0.42rem;
  font-size: 1rem;
}

.fr-flow-card p {
  margin: 0;
  color: var(--fr-muted);
  font-size: 0.9rem;
  line-height: 1.52;
}

.fr-arch-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
}

.fr-arch-card {
  border-radius: 14px;
  border: 1px solid rgba(136, 180, 252, 0.2);
  background: rgba(7, 17, 33, 0.84);
  padding: 1rem;
}

.fr-arch-card h3 {
  margin: 0 0 0.45rem;
  font-size: 1.03rem;
}

.fr-arch-card p {
  margin: 0;
  color: var(--fr-muted);
  font-size: 0.92rem;
  line-height: 1.58;
}

.fr-arch-meta {
  margin-top: 0.5rem;
  color: rgba(188, 218, 253, 0.9);
  font-size: 0.8rem;
}

.fr-deep-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
}

.fr-deep-card {
  border-radius: 14px;
  border: 1px solid rgba(136, 180, 252, 0.2);
  background: rgba(7, 17, 33, 0.84);
  padding: 1.05rem;
}

.fr-deep-card h3 {
  margin: 0 0 0.45rem;
  font-size: 1.02rem;
}

.fr-deep-card p {
  margin: 0;
  color: var(--fr-muted);
  font-size: 0.92rem;
  line-height: 1.58;
}

.fr-outcome-block + .fr-outcome-block {
  margin-top: 1.5rem;
}

.fr-outcome-title {
  margin: 0 0 0.72rem;
  font-size: 1.26rem;
}

.fr-metric-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.9rem;
}

.fr-metric-card {
  border: 1px solid rgba(139, 184, 255, 0.24);
  border-radius: 14px;
  padding: 1.02rem;
  background: rgba(8, 21, 39, 0.82);
}

.fr-metric-label {
  margin: 0 0 0.35rem;
  color: #d8ecff;
  font-size: 0.98rem;
  font-weight: 700;
}

.fr-metric-value {
  margin: 0 0 0.42rem;
  color: var(--fr-accent);
  font-size: 0.95rem;
}

.fr-metric-detail {
  margin: 0;
  color: var(--fr-muted);
  font-size: 0.92rem;
  line-height: 1.55;
}

.fr-learning-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.92rem;
}

.fr-learning-card {
  border: 1px solid rgba(139, 184, 255, 0.24);
  border-radius: 14px;
  padding: 1.05rem;
  background: rgba(8, 21, 39, 0.82);
}

.fr-learning-card h4 {
  margin: 0 0 0.52rem;
  font-size: 1.04rem;
}

.fr-learning-card p {
  margin: 0;
  color: var(--fr-muted);
  line-height: 1.58;
}

.fr-learning-card p + p {
  margin-top: 0.42rem;
}

.fr-reveal {
  opacity: 0;
  transform: translateY(24px);
  transition: opacity 0.55s ease, transform 0.55s ease;
}

.fr-reveal.is-visible {
  opacity: 1;
  transform: translateY(0);
}

@keyframes frFloat {
  0% {
    transform: translate3d(0, 0, 0);
  }
  100% {
    transform: translate3d(0, -28px, 0);
  }
}

@media (max-width: 1040px) {
  .fr-hero {
    grid-template-columns: 1fr;
  }

  .fr-segment-nav,
  .fr-context-grid,
  .fr-context-stakeholder-grid,
  .fr-context-media-grid,
  .fr-entity-grid,
  .fr-api-grid,
  .fr-flow-grid,
  .fr-arch-grid,
  .fr-split-grid,
  .fr-deep-grid,
  .fr-metric-grid {
    grid-template-columns: 1fr;
  }

  .fr-segment-panel {
    min-height: auto;
  }
}

@media (max-width: 680px) {
  .fr-page {
    padding: 1rem 0.84rem 2rem;
  }

  .fr-nav-btn {
    min-height: 70px;
    font-size: 1rem;
  }

  .fr-context-media img {
    height: 190px;
  }
}
</style>
