<template>
  <section class="oh">
    <RouterLink to="/projects" class="oh-back">All projects</RouterLink>
    <div class="oh-hero">
      <div>
        <p class="oh-eyebrow">Game AI · Play in your browser</p>
        <h1>Oh Hell<span>10 to 1</span></h1>
        <p class="oh-lead">Read the table. Make your bid. Take exactly the tricks you promised.</p>
        <p>A full game against AI opponents, from ten cards down to one, through a blind round and back up again. Bowers change the trump order; every bid matters.</p>
        <div class="oh-actions">
          <a :href="project.liveUrl" class="oh-play">Play Oh Hell</a>
          <a href="/10-1/bid-game/">Try the bidding quiz</a>
          <a :href="project.repoUrl" target="_blank" rel="noopener noreferrer">Source on GitHub</a>
        </div>
        <p class="oh-note">No account or installation. The engine downloads on your first visit; each tab keeps its own game.</p>
      </div>
      <div class="oh-table" aria-hidden="true"><HoverCanvas :draw="drawOhHell" :active="false" /></div>
    </div>
    <div class="oh-grid">
      <section>
        <h2>Decisions with hidden cards</h2>
        <p>The bots combine learned bidding and play models with simulations of possible unseen hands. At longer thinking times, they weigh deals against the bids and cards already played, then use exact search near the end of a round.</p>
        <p>In-game advice lets you inspect a decision. The bidding quiz offers ten random hands and compares the expected score of each legal bid.</p>
      </section>
      <section>
        <h2>Python and C, in the browser</h2>
        <p>React and TypeScript handle the table. A Web Worker runs the Python engine through Pyodide, while WebAssembly runs the C simulation core. Gameplay stays on your device without a game server.</p>
        <p>GitHub Actions builds the engine and interface, then publishes them with this portfolio through GitHub Pages.</p>
      </section>
      <section>
        <h2>Measure before promoting</h2>
        <p>Candidate bots play matched deals against the baseline. Improvements must pass the main comparison and confirmation on unseen deals before becoming the default. The repository records unsuccessful and inconclusive experiments too.</p>
      </section>
      <section>
        <h2>The rules that matter</h2>
        <p>Follow suit when you can. The trump Jack ranks first, followed by the same-colour Jack, which counts as trump. A made bid scores ten per trick, or ten for a made zero; a miss loses ten per trick off.</p>
        <p>The dealer bids last and cannot make the total bids equal the hand size. Scores accumulate across the entire down, blind and back-up sequence.</p>
      </section>
    </div>
    <div class="oh-stack"><span v-for="item in project.stack" :key="item">{{ item }}</span></div>
  </section>
</template>

<script setup>
import { RouterLink } from 'vue-router'
import HoverCanvas from '../components/previews/HoverCanvas.vue'
import { drawOhHell } from '../components/previews/ohHellScene'
defineProps({ project: { type: Object, required: true } })
</script>

<style scoped>
.oh { color: var(--text, #e8e8ee); padding: 2rem 0 4rem; font-size: 1rem; line-height: 1.7; }
.oh-back { color: inherit; text-underline-offset: .3em; }
.oh-hero { display: grid; grid-template-columns: 1.1fr 1fr; gap: 3rem; align-items: center; margin: 3rem 0; }
.oh-eyebrow { color: #71cba6; font-size: .875rem; letter-spacing: .1em; text-transform: uppercase; }
h1 { font: 600 clamp(3rem, 7vw, 6rem)/1 Georgia, serif; margin: 1rem 0 1.5rem; }
h1 span { display: block; color: #c9ae79; font-size: .55em; margin-top: .35em; }
.oh-lead { font-size: 1.4rem; line-height: 1.5; }
.oh-actions { display: flex; flex-wrap: wrap; align-items: center; gap: 1.2rem; margin: 1.8rem 0 1rem; }
.oh-actions a { color: inherit; text-underline-offset: .3em; }
.oh-actions .oh-play { background: #e9d5a8; color: #143c31; padding: .8rem 1.4rem; border-radius: .4rem; text-decoration: none; font-weight: 700; }
.oh a:focus-visible { outline: 3px solid #71cba6; outline-offset: 5px; }
.oh-note { font-size: .875rem; opacity: .75; }
.oh-table { position: relative; aspect-ratio: 3 / 2; border: 1px solid #416658; border-radius: 1rem; overflow: hidden; }
.oh-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 2rem 3rem; border-top: 1px solid #416658; padding-top: 2rem; }
h2 { font: 500 1.7rem/1.3 Georgia, serif; }
.oh-stack { display: flex; flex-wrap: wrap; gap: .6rem; margin-top: 2rem; }
.oh-stack span { border: 1px solid #416658; padding: .3rem .7rem; border-radius: 2rem; font-size: .875rem; }
@media (max-width: 760px) { .oh-hero, .oh-grid { grid-template-columns: 1fr; gap: 1.5rem; } .oh-hero { margin: 2rem 0; } }
</style>
