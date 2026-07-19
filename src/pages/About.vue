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

      <div class="portrait-wrap" aria-hidden="true">
        <div class="portrait-orbit portrait-orbit--one"></div>
        <div class="portrait-orbit portrait-orbit--two"></div>
        <div class="portrait-panel">
          <span class="portrait-code portrait-code--one">&lt;/&gt;</span>
          <span class="portrait-code portrait-code--two">{ }</span>
          <img :src="headshotUrl" alt="" />
        </div>
      </div>
    </section>

    <section class="about-section" aria-labelledby="achievements-title">
      <div class="section-heading">
        <p class="eyebrow">Highlights</p>
        <h2 id="achievements-title">Selected achievements</h2>
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

    <section class="current-role" aria-labelledby="current-role-title">
      <div class="role-mark" aria-hidden="true">⌘</div>
      <div class="role-heading">
        <p class="eyebrow">What I do</p>
        <h2 id="current-role-title">Current role</h2>
      </div>
      <p>
        Full-stack developer on smart city and sports lighting platforms — from optimisation
        engines and data pipelines to customer-facing booking and configuration tools.
      </p>
    </section>

    <section class="current-role upcoming-row" aria-labelledby="upcoming-title">
      <div class="role-mark" aria-hidden="true">↗</div>
      <div class="role-heading">
        <p class="eyebrow">Next up</p>
        <h2 id="upcoming-title">Upcoming projects</h2>
      </div>
      <p>
        This portfolio keeps growing as new case studies and experiments are added to the projects
        collection.
      </p>
    </section>

    <section class="timeline-section" aria-labelledby="timeline-title">
      <div class="timeline-heading">
        <div><p class="eyebrow">The path so far</p><h2 id="timeline-title">A timeline</h2></div>
        <p>
          Full details in my <a href="/resume.pdf" download>resume</a> and
          <a href="https://www.linkedin.com/in/dillon-bliss-770704184/" target="_blank" rel="noreferrer">LinkedIn</a>.
        </p>
      </div>

      <ol class="timeline">
        <li v-for="item in timeline" :key="item.period" class="timeline-item">
          <div class="timeline-date">{{ item.period }}</div>
          <article class="timeline-card">
            <div class="timeline-card-header">
              <h3>{{ item.title }}</h3>
              <span v-if="item.badge" class="timeline-badge">{{ item.badge }}</span>
            </div>
            <ul><li v-for="detail in item.details" :key="detail">{{ detail }}</li></ul>
          </article>
        </li>
      </ol>
    </section>
  </div>
</template>

<script setup>
import BrandIcon from '../components/BrandIcon.vue'
import headshotUrl from '../assets/site/dillon.png'

const timeline = [
  {
    period: '2025',
    title: 'Schréder (SCS) — Software Engineer',
    badge: 'Rising Star Employee Award',
    details: [
      'Building smart city lighting platforms and migration tooling.',
      'Working across backend, frontend and AWS infrastructure.'
    ]
  },
  {
    period: '2022–2025',
    title: 'UNSW — Bachelor of Engineering (Mechatronic)',
    badge: 'High Distinction',
    details: [
      'High distinction average in final year.',
      'Focused on control systems, embedded systems and robotics.'
    ]
  },
  {
    period: '2021–2022',
    title: 'Multiple freelance projects',
    details: [
      'Built custom web apps, automation scripts and dashboards for small businesses.',
      'Gained experience across the full stack and cloud deployment.'
    ]
  },
  {
    period: '2019',
    title: 'Higher School Certificate',
    details: ['Completed HSC with strong results in Maths, Physics and Engineering Studies.']
  }
]
</script>

<style scoped>
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

.portrait-wrap {
  position: relative;
  min-height: 490px;
  display: grid;
  place-items: center;
}

.portrait-panel {
  position: relative;
  width: min(100%, 480px);
  aspect-ratio: 1;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  overflow: hidden;
  border: 1px solid rgba(101, 84, 238, 0.12);
  border-radius: 42% 58% 46% 54% / 55% 42% 58% 45%;
  background: radial-gradient(circle at 55% 32%, rgba(255,255,255,.96), transparent 24%), linear-gradient(145deg, #f4f2ff, #e9e6ff 62%, #ddd8ff);
  box-shadow: 0 35px 75px rgba(60, 47, 145, 0.14);
}

.portrait-panel::after {
  position: absolute;
  inset: auto 10% 7%;
  height: 18%;
  border-radius: 50%;
  background: rgba(77, 60, 181, 0.14);
  filter: blur(24px);
  content: '';
}

.portrait-panel img {
  position: relative;
  z-index: 2;
  width: 92%;
  max-height: 96%;
  object-fit: contain;
  object-position: center bottom;
}

.portrait-orbit { position: absolute; border: 1px solid rgba(101,84,238,.16); border-radius: 50%; }
.portrait-orbit--one { width: 112%; aspect-ratio: 1; transform: rotate(18deg) scaleY(.72); }
.portrait-orbit--two { width: 91%; aspect-ratio: 1; transform: rotate(-28deg) scaleY(.82); }

.portrait-code {
  position: absolute;
  z-index: 3;
  display: grid;
  place-items: center;
  width: 58px;
  height: 58px;
  border: 1px solid rgba(101,84,238,.16);
  border-radius: 16px;
  color: var(--about-purple);
  background: rgba(255,255,255,.88);
  box-shadow: 0 14px 35px rgba(53,44,117,.13);
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 1rem;
  font-weight: 800;
}

.portrait-code--one { top: 16%; left: 8%; }
.portrait-code--two { right: 7%; bottom: 19%; }

.about-section, .timeline-section { display: grid; gap: 28px; }

.section-heading h2, .timeline-heading h2, .current-role h2 {
  margin-bottom: 0;
  font-size: clamp(2rem, 3.6vw, 3.25rem);
  line-height: 1.05;
  letter-spacing: -0.05em;
}

.achievement-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 18px; }

.achievement-card {
  display: flex;
  gap: 18px;
  min-height: 164px;
  padding: 24px;
  border: 1px solid var(--about-line);
  border-radius: 18px;
  background: rgba(255,255,255,.82);
  box-shadow: 0 16px 40px rgba(31,28,80,.045);
}

.achievement-number { color: #9a92df; font: 800 .76rem ui-monospace, SFMono-Regular, Menlo, monospace; }
.achievement-card h3 { margin-bottom: 9px; font-size: 1.02rem; line-height: 1.35; }
.achievement-card p { margin-bottom: 0; color: var(--muted); font-size: .9rem; line-height: 1.65; }

.current-role {
  display: grid;
  grid-template-columns: auto minmax(180px, .38fr) minmax(0, 1fr);
  align-items: center;
  gap: 26px;
  padding: clamp(26px, 4vw, 44px);
  border: 1px solid #d9d5fb;
  border-radius: 22px;
  background: radial-gradient(circle at 92% 15%, rgba(114,92,240,.14), transparent 31%), linear-gradient(135deg, #faf9ff, #f3f0ff);
}

.role-mark {
  display: grid;
  place-items: center;
  width: 58px;
  height: 58px;
  border-radius: 17px;
  color: var(--about-purple);
  background: #e8e4ff;
  font-size: 1.55rem;
  font-weight: 800;
}

.role-heading .eyebrow { margin-bottom: 9px; }

.upcoming-row {
  margin-top: -68px;
  background: radial-gradient(circle at 8% 85%, rgba(114,92,240,.12), transparent 30%), linear-gradient(135deg, #fff, #f8f7ff);
}
.current-role > p { margin: 0; padding-left: 28px; border-left: 1px solid #d8d3f7; color: #565d78; font-size: 1rem; line-height: 1.75; }

.timeline-heading { display: flex; align-items: flex-end; justify-content: space-between; gap: 24px; }
.timeline-heading > p { margin-bottom: 4px; color: var(--muted); font-size: .88rem; }
.timeline-heading a { color: var(--about-purple); font-weight: 700; }

.timeline { position: relative; display: grid; gap: 14px; margin: 0; padding: 0; list-style: none; }
.timeline::before { position: absolute; top: 34px; bottom: 34px; left: 51px; width: 1px; background: #c9c3ff; content: ''; }
.timeline-item { position: relative; display: grid; grid-template-columns: 104px minmax(0, 1fr); align-items: center; gap: 20px; }

.timeline-date {
  position: relative;
  z-index: 1;
  display: grid;
  place-items: center;
  width: 104px;
  min-height: 58px;
  padding: 8px;
  border: 1px solid #968aff;
  border-radius: 999px;
  color: var(--about-purple);
  background: #fff;
  font-size: .75rem;
  font-weight: 800;
  line-height: 1.15;
  text-align: center;
}

.timeline-card { position: relative; padding: 20px 24px; border: 1px solid var(--about-line); border-radius: 15px; background: #fff; }
.timeline-card::before { position: absolute; top: 50%; right: 100%; width: 21px; height: 1px; background: var(--about-line); content: ''; }
.timeline-card-header { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 9px; }
.timeline-card h3 { margin-bottom: 0; color: #5346c7; font-size: .9rem; }

.timeline-badge {
  flex: 0 0 auto;
  padding: 5px 9px;
  border-radius: 999px;
  color: #765212;
  background: #fff3d9;
  font-size: .68rem;
  font-weight: 800;
}

.timeline-card ul { display: grid; gap: 3px; margin: 0; padding-left: 18px; color: #5f667f; font-size: .84rem; line-height: 1.55; }

@media (max-width: 900px) {
  .about-page { gap: 70px; }
  .about-hero { grid-template-columns: 1fr; min-height: auto; }
  .portrait-wrap { grid-row: 1; min-height: 390px; }
  .portrait-panel { width: min(82vw, 430px); }
  .achievement-grid { grid-template-columns: 1fr; }
  .achievement-card { min-height: 0; }
  .current-role { grid-template-columns: auto 1fr; }
  .current-role > p { grid-column: 1 / -1; padding: 22px 0 0; border-top: 1px solid #d8d3f7; border-left: 0; }
  .upcoming-row { margin-top: -50px; }
}

@media (max-width: 620px) {
  .about-page { gap: 58px; }
  .upcoming-row { margin-top: -38px; }
  .about-hero { gap: 36px; }
  .portrait-wrap { min-height: 320px; }
  h1 { font-size: clamp(2.7rem, 13vw, 4rem); }
  .timeline-heading { align-items: flex-start; flex-direction: column; }
  .timeline::before { left: 29px; }
  .timeline-item { grid-template-columns: 60px minmax(0, 1fr); gap: 12px; }
  .timeline-date { width: 60px; min-height: 52px; font-size: .62rem; }
  .timeline-card { padding: 18px; }
  .timeline-card::before { width: 13px; }
  .timeline-card-header { align-items: flex-start; flex-direction: column; gap: 8px; }
  .timeline-badge { white-space: normal; }
}

@media (prefers-reduced-motion: no-preference) {
  .achievement-card, .timeline-card, .social-links a { transition: transform 180ms ease, border-color 180ms ease, color 180ms ease; }
  .achievement-card:hover, .timeline-card:hover { transform: translateY(-3px); border-color: #c9c3f2; }
}
</style>
