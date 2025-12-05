<template>
  <article>
    <RouterLink
      to="/projects"
      class="btn"
      style="margin-bottom:14px;display:inline-block"
    >
      ← Back to projects
    </RouterLink>

    <!-- Hero -->
    <section class="card" style="margin-bottom:16px">
      <div class="section-label">Machine Learning · Sports Analytics</div>
      <h1 style="margin:4px 0 8px">{{ project.title }}</h1>
      <p class="section-sub">{{ project.tagline }}</p>

      <div class="tags" style="margin:10px 0 12px">
        <span class="tag" v-for="t in project.tags" :key="t">{{ t }}</span>
      </div>

      <div class="mono" style="font-size:.9rem;color:var(--muted);margin-bottom:10px">
        <strong>Stack:</strong> {{ project.stack.join(' · ') }}
      </div>

      <p style="color:var(--muted);max-width:60ch">
        I built an end-to-end system to price League of Legends matches more like a
        bookmaker than a “toy Kaggle model”: data pipeline → Bayesian player
        ratings → tree-based models → calibration and backtesting vs the market.
      </p>

      <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:16px">
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
          class="btn"
          :href="project.liveUrl"
          target="_blank"
          rel="noreferrer noopener"
        >
          Live demo ↗
        </a>
      </div>
    </section>

    <!-- Main content -->
    <section class="grid cols-2" style="align-items:flex-start;gap:16px">
      <!-- Left column: pipeline & modeling -->
      <div class="card">
        <div class="section-label">Pipeline</div>

        <h2 class="section-title" style="margin:6px 0 10px;font-size:1.1rem">
          From raw match logs to calibrated win probabilities
        </h2>

        <ol style="padding-left:20px;color:var(--muted);line-height:1.5">
          <li>Ingest and clean pro-match logs (teams, players, patches, series).</li>
          <li>Build rolling team & player features (recent form, side, opponent strength).</li>
          <li>
            Maintain Bayesian-style player ratings that evolve over time instead of static Elo.
          </li>
          <li>Train Random Forest models to estimate per-role contribution to wins.</li>
          <li>
            Fit a gradient boosting model to output match-level win probabilities.
          </li>
          <li>Calibrate and backtest against bookmaker odds to check if the edge is real.</li>
        </ol>

        <div style="margin-top:16px">
          <div class="section-label">Key decisions</div>
          <ul style="padding-left:18px;margin-top:8px;color:var(--muted)">
            <li>Favoured leakage-checked, interpretable features over clever but brittle ones.</li>
            <li>Optimised for Brier score / calibration, not just raw accuracy.</li>
            <li>Cached heavy feature steps to cut retrain time by ~60%.</li>
          </ul>
        </div>
      </div>

      <!-- Right column: outcomes & learnings -->
      <aside class="card">
        <div class="section-label">Results</div>
        <ul style="padding-left:18px;margin:10px 0;color:var(--muted)">
          <li>Accuracy in the mid-60s on held-out data (depends on patch window).</li>
          <li>Calibration plots showed probabilities tracking reality reasonably well.</li>
          <li>
            Backtests suggested small edges pre-2020; recent years look close to
            efficient after fees.
          </li>
        </ul>

        <div class="section-label" style="margin-top:14px">What this demonstrates</div>
        <ul style="padding-left:18px;margin:10px 0;color:var(--muted)">
          <li>End-to-end ML system design, not just a notebook.</li>
          <li>Awareness of leakage, overfitting, and realistic evaluation.</li>
          <li>
            Ability to talk about models in terms that make sense to traders / PMs, not
            just engineers.
          </li>
        </ul>
      </aside>
    </section>

    <!-- Diagnostics visuals -->
    <section class="card" style="margin-top:18px">
      <div class="section-label">Diagnostics</div>
      <p style="color:var(--muted);margin:8px 0 14px">
        Two visuals I lean on when sanity-checking probabilistic models:
      </p>

      <div class="grid cols-2" style="gap:14px">
        <figure>
          <div class="chart-placeholder">
            <!-- replacable with actual <img> later -->
            <div class="mono" style="font-size:.8rem;color:var(--muted)">
              Calibration plot
            </div>
          </div>
          <figcaption style="color:var(--muted);margin-top:6px">
            Predicted win bins vs actual outcomes to confirm that “60%” really means ~60%.
          </figcaption>
        </figure>

        <figure>
          <div class="chart-placeholder">
            <div class="mono" style="font-size:.8rem;color:var(--muted)">
              Probability distribution
            </div>
          </div>
          <figcaption style="color:var(--muted);margin-top:6px">
            Distribution of predicted win probabilities to see when the model leans into
            strong favourites vs coin flips.
          </figcaption>
        </figure>
      </div>
    </section>
  </article>
</template>

<script setup>
import { RouterLink } from 'vue-router'

defineProps({
  project: {
    type: Object,
    required: true
  }
})
</script>

<style scoped>
.chart-placeholder {
  border: 1px dashed var(--border-subtle, #333);
  border-radius: 8px;
  padding: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
