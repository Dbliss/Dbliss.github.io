<template>
  <article class="sm">
    <header class="sm-hero">
      <h1 class="sm-title">{{ project.title }}</h1>
      <p class="sm-lede">{{ project.excerpt }}</p>

      <div class="sm-meta">
        <div class="tags">
          <CategoryTag :category="project.category" />
          <span class="tag" v-for="t in project.tags" :key="t">{{ t }}</span>
        </div>
        <span class="sm-meta-sep" aria-hidden="true" />
        <span class="sm-stack">{{ project.stack.join(' · ') }}</span>
      </div>

      <div class="sm-actions">
        <a v-if="project.liveUrl" class="btn primary" :href="project.liveUrl" target="_blank" rel="noreferrer noopener">
          Open live app ↗
        </a>
        <a v-if="project.repoUrl" class="btn" :href="project.repoUrl" target="_blank" rel="noreferrer noopener">
          View code
        </a>
      </div>
    </header>

    <!-- Live app on both form factors -->
    <section class="sm-section">
      <DeviceShowcase :src="project.liveUrl" :title="project.title" />
    </section>

    <!-- Hosting + integration -->
    <section class="sm-section">
      <div class="section-label">How it's built</div>
      <h2 class="sm-h2">A static app inside the client's website</h2>
      <p class="sm-p">
        The quote builder is a static Vue app hosted for free on GitHub Pages. There's no server: everything runs in the
        customer's browser, including the packing algorithm. The removalist's existing Wix site embeds it, and Wix handles
        the one piece that needs a backend: getting the quote to the business.
      </p>
      <ol class="sm-flow">
        <li v-for="(s, i) in flow" :key="s.title">
          <span class="sm-flow-num">{{ i + 1 }}</span>
          <strong>{{ s.title }}</strong>
          <span>{{ s.body }}</span>
        </li>
      </ol>
    </section>

    <!-- Divider: the furniture catalogue with its packer hitboxes, drifting across the page -->
    <SuperMoveAssetStrip />

    <!-- Packing algorithm: full-width decision explorer -->
    <section class="sm-section sm-after-strip">
      <div class="section-label">Packing algorithm</div>
      <h2 class="sm-h2">How it decides</h2>
      <p class="sm-p sm-intro">
        The goal is the one a removalist has: as few trucks as possible, the smallest that will do, and a load where nothing
        is crushed or can topple. Step through how it gets there.
      </p>
      <SuperMoveAlgorithmExplorer />
    </section>

    <!-- What it shows: outcomes beside the real packed load, then skills -->
    <section class="sm-section">
      <div class="sm-shows">
        <div class="sm-shows-copy">
          <div class="section-label">What it shows</div>
          <h2 class="sm-h2">Outcomes and skills</h2>
          <p class="sm-p sm-intro">
            Built end to end, from the packing algorithm to the client integration, and live in production.
          </p>
          <ul class="sm-outcomes">
            <li v-for="(o, i) in outcomes" :key="i">
              <span class="sm-tick" aria-hidden="true">✓</span>
              <span><template v-for="(part, j) in o" :key="j"><b v-if="part.hi">{{ part.text }}</b><template v-else>{{ part.text }}</template></template></span>
            </li>
          </ul>
        </div>
        <figure class="sm-shows-scene">
          <SuperMovePackingReplay />
          <figcaption>
            The app's own "{{ demo.source.presetName }}" preset: {{ demoItems }} items, packed by the production code at the live
            {{ demo.source.budgetMs / 1000 }}-second budget into {{ demoFleet }}. It's drawn by the app's own truck-fit scene.
          </figcaption>
        </figure>
      </div>

      <div class="sm-skills">
        <h3>Skills developed</h3>
        <ul class="sm-skill-list">
          <li v-for="(s, i) in skills" :key="i">
            <template v-for="(part, j) in s" :key="j"><span v-if="part.hi" class="sm-skill">{{ part.text }}</span><template v-else>{{ part.text }}</template></template>
          </li>
        </ul>
      </div>
    </section>
  </article>
</template>

<script setup>
import CategoryTag from '../components/CategoryTag.vue'
import DeviceShowcase from '../components/DeviceShowcase.vue'
import SuperMovePackingReplay from '../components/SuperMovePackingReplay.vue'
import SuperMoveAssetStrip from '../components/SuperMoveAssetStrip.vue'
import SuperMoveAlgorithmExplorer from '../components/SuperMoveAlgorithmExplorer.vue'
import demo from '../assets/super-move/packing-demo.json'

defineProps({
  project: { type: Object, required: true }
})

const demoItems = demo.itemCount

// e.g. "two large trucks" / "one small and one large truck"
const NUM = ['zero', 'one', 'two', 'three', 'four', 'five']
const demoFleet = (() => {
  const counts = {}
  demo.trucks.forEach((t) => { counts[t.name.toLowerCase()] = (counts[t.name.toLowerCase()] || 0) + 1 })
  const parts = Object.entries(counts).map(([name, n]) => `${NUM[n] || n} ${name}`)
  return `${parts.join(' and ')} truck${demo.trucks.length > 1 ? 's' : ''}`
})()

// Sentences with [[marked]] words → [{ text, hi }] parts, so the marked words can be highlighted.
const marked = (s) => s.split(/(\[\[.+?\]\])/).filter(Boolean)
  .map((t) => (t.startsWith('[[') ? { text: t.slice(2, -2), hi: true } : { text: t, hi: false }))

// Results first, then what the client and their customers get out of it (all real figures).
const outcomes = [
  `[[Live on a paying client's website]], so customers get a priced estimate at any hour instead of waiting for a call back.`,
  `Packs a full four-bedroom house, [[${demo.itemCount} items, in about 3 seconds]], entirely in the customer's browser.`,
  `Customers [[see their own furniture packed into the truck]], so the recommended size is easy to trust.`,
  `Every request reaches the business [[already itemised, with the truck and crew worked out]], ready to confirm.`,
  `[[Costs nothing to run]]: no servers, and it plugs into the Wix site the client already has.`
].map(marked)

const skills = [
  `Designed a [[3D bin-packing]] algorithm, using [[constraint modelling]] for stack levels, support and orientation.`,
  `Improved its loads with a [[genetic algorithm]] and [[heuristic search]], within a strict [[performance budget]].`,
  `Built the interactive truck view in [[three.js]] on a [[Vue 3]] front end, with the search running in a [[Web Worker]].`,
  `Integrated with the client's website using [[Wix Velo]], and automated releases with [[GitHub Actions]].`,
  `Created an [[internal editor]] for the [[data modelling]] behind every item's hitbox and packing rules.`,
  `Worked from [[client requirements]] to production, shipping changes to a [[live product]] safely behind opt-in flags.`
].map(marked)

const flow = [
  { title: 'Built and hosted for free', body: 'Every push to GitHub rebuilds the app and publishes it to GitHub Pages. There are no servers to run or pay for.' },
  { title: 'Embedded in the Wix site', body: 'The removalist\'s Wix page shows the app in a frame. When a customer submits, the app hands the quote to the page around it.' },
  { title: 'Wix does the backend', body: 'Wix saves the quote to its database and emails it to the business. No keys or email code ever reach the browser.' }
]
</script>

<style scoped>
/* Open hero: no card, just type on the page. */
.sm-hero { max-width: 900px; padding-top: 8px; }
.sm-title {
  margin: 0;
  font-size: clamp(2.4rem, 5vw, 4.2rem);
  line-height: 1.02;
  letter-spacing: -.05em;
}
.sm-lede {
  margin: 18px 0 0;
  max-width: 720px;
  color: var(--muted);
  font-size: clamp(1.02rem, 1.4vw, 1.18rem);
  line-height: 1.7;
}
.sm-meta {
  display: flex; flex-wrap: wrap; align-items: center; gap: 10px 14px;
  margin-top: 22px;
}
.sm-meta-sep { width: 1px; height: 18px; background: var(--line); }
.sm-stack { color: var(--muted); font-size: .86rem; font-weight: 600; }
.sm-actions { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 26px; }

@media (max-width: 560px) {
  .sm-meta-sep { display: none; }
}

.sm-section { margin-top: 44px; }
.sm-section.sm-after-strip { margin-top: 32px; }

/* What it shows: outcomes on the left, the real packed load on the right. */
.sm-shows {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.1fr);
  gap: 36px;
  align-items: center;
}
.sm-shows-scene { margin: 0; }
.sm-shows-scene figcaption { margin: 4px auto 0; max-width: 520px; text-align: center; font-size: .82rem; line-height: 1.6; color: var(--muted); }
@media (min-width: 1400px) {
  .sm-shows-scene { margin-right: -80px; }
}
@media (max-width: 960px) {
  .sm-shows { grid-template-columns: 1fr; gap: 12px; }
}
.sm-h2 { margin: 6px 0 8px; font-size: clamp(1.4rem, 2.4vw, 2rem); letter-spacing: -.03em; line-height: 1.15; }
.sm-intro { margin-bottom: 18px; }
.sm-section h3 { margin: 6px 0 10px; }
.sm-p { margin: 0; color: var(--muted); line-height: 1.75; max-width: 820px; }
.sm-list { margin: 10px 0 0; padding-left: 18px; color: var(--muted); line-height: 1.65; font-size: .95rem; }
.sm-list li + li { margin-top: 6px; }
.sm-list strong { color: var(--ink); }

/* hosting + integration flow */
.sm-flow {
  list-style: none; margin: 20px 0 0; padding: 0;
  display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px;
}
.sm-flow li {
  display: flex; flex-direction: column; gap: 4px;
  padding: 14px 16px 16px;
  border: 1px solid var(--line); border-radius: 12px; background: #fbfbff;
}
.sm-flow-num {
  width: 24px; height: 24px; border-radius: 50%;
  display: grid; place-items: center;
  font-size: .75rem; font-weight: 800; color: #fff; background: var(--accent);
  margin-bottom: 4px;
}
.sm-flow strong { font-size: .98rem; }
.sm-flow span:last-child { color: var(--muted); font-size: .9rem; line-height: 1.6; }


/* outcomes */
.sm-outcomes { list-style: none; margin: 0; padding: 0; display: grid; gap: 12px; }
.sm-outcomes li { display: grid; grid-template-columns: 24px minmax(0, 1fr); gap: 10px; align-items: start; line-height: 1.6; color: #3d4359; }
.sm-outcomes b { color: var(--ink); }
.sm-tick {
  width: 22px; height: 22px; margin-top: 2px; border-radius: 50%;
  display: grid; place-items: center; font-size: .72rem; font-weight: 800;
  color: #1f8a52; background: #e9f7ef;
}

/* skills */
.sm-skills { margin-top: 32px; padding-top: 24px; border-top: 1px solid var(--line); }
.sm-skills h3 { margin: 0 0 14px; }
.sm-skill-list {
  list-style: none; margin: 0; padding: 0;
  display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px 32px;
}
.sm-skill-list li { line-height: 1.65; color: #3d4359; padding-left: 14px; position: relative; }
.sm-skill-list li::before {
  content: ''; position: absolute; left: 0; top: .7em; width: 5px; height: 5px; border-radius: 50%; background: var(--accent);
}
.sm-skill { color: var(--accent); font-weight: 700; }

@media (max-width: 760px) {
  .sm-flow { grid-template-columns: 1fr; }
  .sm-skill-list { grid-template-columns: 1fr; }
}
</style>
