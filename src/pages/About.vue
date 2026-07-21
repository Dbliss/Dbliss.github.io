<template>
  <div class="about-page">
    <section class="about-hero" aria-labelledby="about-title">
      <div class="hero-copy">
        <p class="eyebrow">About me</p>
        <h1 id="about-title">Engineer by day,<br />problem solver <span>always.</span></h1>
        <p class="hero-summary">
          Mechatronic Engineer working as a Full-Stack Developer based in Sydney. I design and
          build robust systems across backend, frontend and cloud infrastructure, with a focus on
          reliability and performance.
        </p>

        <ul class="quick-facts" aria-label="About Dillon">
          <li><span aria-hidden="true">⌖</span>Sydney, Australia</li>
          <li><span aria-hidden="true">↗</span>2+ years professional experience</li>
        </ul>

        <div class="social-links" aria-label="Profile links">
          <a href="https://github.com/Dbliss" target="_blank" rel="noreferrer">
            <BrandIcon name="github" /> GitHub
          </a>
          <a href="https://www.linkedin.com/in/dillon-bliss-770704184/" target="_blank" rel="noreferrer">
            <BrandIcon name="linkedin" /> LinkedIn
          </a>
          <a href="/resume.pdf" download><BrandIcon name="resume" /> Resume</a>
        </div>
      </div>

      <div class="desk-visual">
        <img
          :src="deskIllustrationUrl"
          alt="Laptop displaying code beside a plant, notebook and coffee mug"
          decoding="async"
          fetchpriority="high"
        />
      </div>
    </section>


    <section class="gantt-section" aria-labelledby="gantt-title">
      <div class="gantt-heading">
        <div><p class="eyebrow">The path so far</p><h2 id="gantt-title">Experience at a glance</h2></div>
        <div class="gantt-heading-meta">
          <p>
            Full details in my <a href="/resume.pdf" download>resume</a> and
            <a href="https://www.linkedin.com/in/dillon-bliss-770704184/" target="_blank" rel="noreferrer">LinkedIn</a>.
          </p>
        </div>
      </div>

      <div class="gantt-scroll" :aria-label="`Career and education timeline from ${timelineStartYear} to today`">
        <div class="gantt-chart" :style="{ '--gantt-year-columns': ganttYearColumns }">
          <div class="gantt-axis">
            <span class="axis-label">Role</span>
            <div class="axis-years" aria-hidden="true">
              <span v-for="year in ganttYears" :key="year">{{ year }}</span>
            </div>
          </div>

          <article
            v-for="item in ganttItems"
            :key="item.id"
            class="gantt-row"
            :class="{ 'gantt-row--current': item.current }"
          >
            <div class="gantt-role">
              <div class="gantt-title-line">
                <h3>{{ item.title }}</h3>
              </div>
              <p class="gantt-organisation">{{ item.organisation }}</p>
            </div>
            <div class="gantt-track">
              <span v-for="year in ganttYears" :key="year" class="year-line" aria-hidden="true"></span>
              <div
                class="gantt-bar"
                :class="[
                  'gantt-bar--' + item.tone,
                  {
                    'gantt-bar--continued-left': startsBeforeTimeline(item),
                    'gantt-bar--current': item.current
                  }
                ]"
                :style="ganttBarStyle(item)"
                aria-hidden="true"
              ></div>
            </div>
          </article>
        </div>
      </div>
    </section>

    <section class="about-section" aria-labelledby="achievements-title">
      <div class="section-heading achievement-heading">
        <h2 id="achievements-title">Selected achievements</h2>
        <p>Key recognitions and milestones.</p>
      </div>

      <div class="achievement-grid">
        <article class="achievement-card">
          <span class="achievement-number">01</span>
          <div><h3>Rising Star Employee Award</h3><p>Recognised by Schréder in 2025.</p></div>
        </article>
        <article class="achievement-card">
          <span class="achievement-number">02</span>
          <div><h3>Young Achiever Award Finalist</h3><p>Lighting Council of Australia, 2025.</p></div>
        </article>
        <article class="achievement-card">
          <span class="achievement-number">03</span>
          <div><h3>High distinction average</h3><p>Final year of Bachelor of Engineering at UNSW.</p></div>
        </article>
      </div>
    </section>
    <SkillsCloud />
  </div>
</template>

<script setup>
import BrandIcon from '../components/BrandIcon.vue'
import SkillsCloud from '../components/SkillsCloud.vue'
import deskIllustrationUrl from '../assets/site/about-desk.png'

const timelineDataStartYear = 2019
const today = new Date()
const currentYear = today.getFullYear()
const timelineStartYear = currentYear - 4
const daysInCurrentMonth = new Date(currentYear, today.getMonth() + 1, 0).getDate()
const currentYearElapsedMonths = today.getMonth() + (today.getDate() / daysInCurrentMonth)
const ganttYears = Array.from(
  { length: 5 },
  (_, index) => timelineStartYear + index
)
const ganttVisibleStartMonth = (timelineStartYear - timelineDataStartYear) * 12
const ganttVisibleEndMonth = ((currentYear - timelineDataStartYear) * 12) + currentYearElapsedMonths
const ganttTotalMonths = ganttVisibleEndMonth - ganttVisibleStartMonth
const ganttYearColumns = ganttYears
  .map(year => `${year === currentYear ? currentYearElapsedMonths : 12}fr`)
  .join(' ')

const ganttItems = [
  {
    id: 'lead-engineer',
    title: 'Lead System & Software Development Engineer',
    organisation: 'Schréder',
    period: 'May 2026 – Present',
    startMonth: 88,
    current: true,
    tone: 'lead',
    details: 'Leading a software team building scalable integration platforms and automation tools for smart city applications.'
  },
  {
    id: 'project-systems-engineer',
    title: 'Project & Control System Services Engineer',
    organisation: 'Schréder',
    period: 'May 2024 – May 2026',
    startMonth: 64,
    endMonth: 88,
    tone: 'engineering',
    details: 'Built scalable integration platforms and automation tools for smart city applications.'
  },
  {
    id: 'co-founder',
    title: 'Co-Founder',
    organisation: 'Concepts & Calculations',
    period: 'Jun 2022 – Nov 2025',
    startMonth: 41,
    endMonth: 83,
    tone: 'founder',
    details: 'Co-founded a Northern Beaches tutoring company and helped manage its customer relations, tutors, and day-to-day operations. Automated payroll, invoicing, and weekly reports through custom scripts.'
  },
  {
    id: 'technical-consultant',
    title: 'Technical Consultant',
    organisation: 'Australian Business Council of Sweden',
    period: 'May 2023 – May 2024',
    startMonth: 52,
    endMonth: 65,
    tone: 'consulting',
    details: 'Supported project work on a needs basis, including an automated email sign-up system built with Google Apps Script.'
  },
  {
    id: 'tutor',
    title: 'High School Math and Software Tutor',
    organisation: 'Self-employed',
    period: 'Mar 2019 – May 2024',
    startMonth: 2,
    endMonth: 65,
    tone: 'tutoring',
    details: 'Tutored high-school students in mathematics and software development with tailored one-to-one lessons.'
  },
  {
    id: 'engineering-degree',
    title: 'Bachelor of Engineering (Mechatronic)',
    organisation: 'UNSW',
    period: 'Mar 2019 – Apr 2024',
    startMonth: 2,
    endMonth: 64,
    tone: 'education',
    details: 'Completed a Mechatronic Engineering degree focused on control systems, embedded systems and robotics, averaging a high-distinction in my final years.'
  }
]

const startsBeforeTimeline = ({ startMonth }) => startMonth < ganttVisibleStartMonth

const ganttBarStyle = ({
  startMonth,
  endMonth,
  current
}) => {
  const visibleStart = Math.max(startMonth, ganttVisibleStartMonth)
  const visibleEnd = Math.min(
    current ? ganttVisibleEndMonth : endMonth,
    ganttVisibleEndMonth
  )

  return {
    left: ((visibleStart - ganttVisibleStartMonth) / ganttTotalMonths) * 100 + '%',
    width: (Math.max(0, visibleEnd - visibleStart) / ganttTotalMonths) * 100 + '%'
  }
}

</script>

<style scoped>
:global(.page:has(.about-page)) {
  background: #e5e1f8;
}

:global(.page:has(.about-page) .nav) {
  border-bottom-color: rgba(101, 84, 238, 0.12);
  background: rgba(229, 225, 248, 0.94);
}

:global(.page:has(.about-page) .footer) {
  border-top-color: rgba(101, 84, 238, 0.12);
  background: #e5e1f8;
}

.about-page {
  --about-purple: #6554ee;
  --about-line: #dedcf2;
  display: grid;
  gap: 88px;
}

.about-hero {
  display: grid;
  grid-template-columns: minmax(0, 1.02fr) minmax(360px, 0.98fr);
  align-items: center;
  gap: clamp(38px, 7vw, 92px);
  min-height: 540px;
}

.eyebrow {
  margin: 0 0 18px;
  color: var(--about-purple);
  font-size: 0.76rem;
  font-weight: 800;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

h1, h2, h3, p { margin-top: 0; }

h1 {
  margin-bottom: 24px;
  font-size: clamp(3rem, 5.4vw, 5.15rem);
  line-height: 0.99;
  letter-spacing: -0.065em;
}

h1 span { color: var(--about-purple); }

.hero-summary {
  max-width: 625px;
  margin-bottom: 26px;
  color: var(--muted);
  font-size: clamp(1rem, 1.3vw, 1.12rem);
  line-height: 1.8;
}

.quick-facts {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.quick-facts li {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 7px 12px;
  border: 1px solid #e5e1ff;
  border-radius: 999px;
  color: #514b72;
  background: #f7f5ff;
  font-size: 0.82rem;
  font-weight: 650;
}

.quick-facts span { color: var(--about-purple); font-size: 1rem; }

.social-links {
  display: flex;
  flex-wrap: wrap;
  gap: 24px;
  margin-top: 30px;
}

.social-links a {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: #343951;
  font-size: 0.88rem;
  font-weight: 700;
}

.social-links a:hover { color: var(--about-purple); }
.social-links :deep(.brand-icon) { width: 18px; height: 18px; }

.desk-visual {
  position: relative;
  width: min(52vw, 690px);
  margin-right: min(-8vw, -70px);
}

.desk-visual img {
  display: block;
  width: 100%;
  height: auto;
  object-fit: contain;
  -webkit-mask-image: radial-gradient(ellipse 94% 92% at center, #000 0%, #000 68%, rgba(0, 0, 0, 0.86) 78%, transparent 100%);
  mask-image: radial-gradient(ellipse 94% 92% at center, #000 0%, #000 68%, rgba(0, 0, 0, 0.86) 78%, transparent 100%);
}

.about-section, .gantt-section { display: grid; gap: 28px; }

.section-heading h2, .gantt-heading h2 {
  margin-bottom: 0;
  font-size: clamp(2rem, 3.6vw, 3.25rem);
  line-height: 1.05;
  letter-spacing: -0.05em;
}

.achievement-heading {
  display: grid;
  gap: 8px;
}

.section-heading.achievement-heading h2 {
  font-size: clamp(1.8rem, 2.6vw, 2.35rem);
  line-height: 1.08;
  letter-spacing: -0.045em;
}

.achievement-heading p {
  margin: 0;
  color: var(--muted);
  font-size: .92rem;
  line-height: 1.5;
}

.achievement-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  margin-top: 4px;
}

.achievement-card {
  position: relative;
  display: flex;
  align-items: flex-start;
  gap: clamp(18px, 2vw, 32px);
  min-width: 0;
  padding: 8px clamp(26px, 3.8vw, 58px);
  background: transparent;
}

.achievement-card:first-child { padding-left: 0; }
.achievement-card:last-child { padding-right: 0; }

.achievement-card + .achievement-card::before {
  content: '';
  position: absolute;
  inset: 0 auto 0 0;
  width: 1px;
  background: #c5bfe8;
}

.achievement-number {
  flex: 0 0 auto;
  padding-top: 2px;
  color: var(--about-purple);
  font: 800 .72rem ui-monospace, SFMono-Regular, Menlo, monospace;
}

.achievement-card h3 {
  margin-bottom: 8px;
  font-size: .94rem;
  line-height: 1.35;
  letter-spacing: -0.015em;
}

.achievement-card p {
  margin-bottom: 0;
  color: var(--muted);
  font-size: .82rem;
  line-height: 1.55;
}

.gantt-heading { display: flex; align-items: flex-end; justify-content: space-between; gap: 24px; }
.gantt-heading-meta { display: grid; justify-items: end; gap: 5px; text-align: right; }
.gantt-heading-meta p { margin: 0; color: var(--muted); font-size: .88rem; }
.gantt-heading a { color: var(--about-purple); font-weight: 700; }

.gantt-scroll {
  overflow: hidden;
  border: 1px solid var(--about-line);
  border-radius: 20px;
  background: rgba(255, 255, 255, .82);
  box-shadow: 0 18px 48px rgba(31, 28, 80, .055);
  scrollbar-color: #b9b1f3 transparent;
}

.gantt-chart { width: 100%; }
.gantt-axis, .gantt-row { display: grid; grid-template-columns: 270px minmax(0, 1fr); }
.gantt-axis { min-height: 54px; color: #77718e; background: #f7f5ff; font-size: .7rem; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; }
.axis-label {
  position: sticky;
  left: 0;
  z-index: 4;
  display: flex;
  align-items: center;
  padding: 0 18px;
  border-right: 1px solid var(--about-line);
  background: #f7f5ff;
  box-shadow: 10px 0 18px rgba(42, 34, 96, .035);
}
.axis-years, .gantt-track { display: grid; grid-template-columns: var(--gantt-year-columns); }
.axis-years span { display: flex; align-items: center; padding-left: 10px; border-left: 1px solid #e5e2f4; }
.gantt-row {
  min-height: 72px;
  border-top: 1px solid var(--about-line);
}
.gantt-row--current { box-shadow: inset 4px 0 0 var(--about-purple); }
.gantt-row--current .gantt-role { background: #f2efff; }
.gantt-row--current .gantt-track { background: linear-gradient(90deg, rgba(101, 84, 238, .08), rgba(101, 84, 238, .025)); }
.gantt-role {
  position: sticky;
  left: 0;
  z-index: 3;
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-height: 72px;
  padding: 10px 18px;
  border-right: 1px solid var(--about-line);
  background: #fff;
  box-shadow: 10px 0 18px rgba(42, 34, 96, .035);
}
.gantt-title-line { display: flex; align-items: center; gap: 7px; }
.gantt-role h3 { margin-bottom: 2px; color: #383350; font-size: .79rem; line-height: 1.28; }

.gantt-organisation { margin: 0 0 2px; color: var(--about-purple); font-size: .71rem; font-weight: 750; }
.gantt-track { position: relative; min-height: 72px; background: rgba(249, 248, 255, .56); }
.year-line { border-left: 1px solid #e9e6f5; }
.gantt-bar {
  position: absolute;
  top: 50%;
  min-width: 10px;
  height: 22px;
  border: 1px solid rgba(255, 255, 255, .6);
  border-radius: 7px;
  transform: translateY(-50%);
  box-shadow: 0 8px 18px rgba(57, 45, 145, .18);
}
.gantt-bar--continued-left {
  border-radius: 0 7px 7px 0;
}
.gantt-bar--continued-left::before {
  content: '←';
  position: absolute;
  left: 6px;
  top: 50%;
  color: rgba(255, 255, 255, .96);
  font-size: 1rem;
  font-weight: 900;
  line-height: 1;
  transform: translateY(-54%);
}
.gantt-bar--current { border-radius: 7px 0 0 7px; }
.gantt-bar--lead { background: linear-gradient(90deg, #5844e7, #7b68f2); }
.gantt-bar--engineering { background: linear-gradient(90deg, #7567e9, #9a8ff5); }
.gantt-bar--founder { background: linear-gradient(90deg, #e66e9b, #ef9bb9); }
.gantt-bar--consulting { background: linear-gradient(90deg, #36a59b, #70c7bd); }
.gantt-bar--tutoring { background: linear-gradient(90deg, #4389d8, #83b6ec); }
.gantt-bar--education { background: linear-gradient(90deg, #e1a63c, #f0c66f); }
@media (max-width: 900px) {
  .about-page { gap: 70px; }
  .about-hero { grid-template-columns: 1fr; min-height: auto; }
  .desk-visual { grid-row: 1; width: min(96vw, 680px); margin: 0 auto; }
  .achievement-grid { grid-template-columns: 1fr; }
  .achievement-card,
  .achievement-card:first-child,
  .achievement-card:last-child { padding: 24px 0; }
  .achievement-card:first-child { padding-top: 8px; }
  .achievement-card + .achievement-card::before { inset: 0 0 auto; width: auto; height: 1px; }
  .gantt-axis, .gantt-row { grid-template-columns: 230px minmax(0, 1fr); }
}

@media (max-width: 620px) {
  .about-page { gap: 58px; }
  .about-hero { gap: 36px; }
  h1 { font-size: clamp(2.7rem, 13vw, 4rem); }
  .gantt-heading { align-items: flex-start; flex-direction: column; }
  .gantt-heading-meta { justify-items: start; text-align: left; }
  .gantt-axis, .gantt-row { grid-template-columns: minmax(150px, 42%) minmax(0, 1fr); }
  .axis-years span { padding-left: 4px; font-size: .58rem; }
}

@media (prefers-reduced-motion: no-preference) {
  .social-links a { transition: color 180ms ease; }
}
</style>
