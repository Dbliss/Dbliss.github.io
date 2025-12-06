<template>
  <article>
    <!-- Back link -->
    <RouterLink
      to="/projects"
      class="btn"
      style="margin-bottom:14px;display:inline-block"
    >
      ← Back to projects
    </RouterLink>

    <!-- Hero: intro + calibration curve -->
    <section class="card hero">
      <div class="section-label">Machine Learning · Sports Analytics</div>
      <h1 class="hero-title">{{ project.title }}</h1>
      <div class="tags hero-tags">
        <span class="tag" v-for="t in project.tags" :key="t">{{ t }}</span>
      </div>

      <div class="hero-meta mono">
        <strong>Stack:</strong> {{ project.stack.join(' · ') }}
      </div>
      
      <div class="hero-grid">
        <!-- Left: text -->
        <div class="hero-copy">
          <p class="hero-summary">
            After listening to hours and hours of data science podcasts, I wanted to commit to a project where I could practice with real-world data and apply machine learning techniques.
            Looking at domains I already know, Esports, particularly League of Legends, seemed like an interesting gateway.
            With the objective of beating to bookmakers, I ambitiously built this tool. 
            Like most projects, people have already tackled similar challenges, so I first began by reading countless academic papers relating to sports betting, esports feature engineering, and advanced elo models.
          </p>

          <p class="hero-summary">
            The focus wasn’t solely on accuracy, but instead on producing a model that
            behaves in a predictable manner: stable across time, leak-free, and comparable to
            bookmaker numbers. In the world of statistics, calibration makes a profitable project. If the model says a team has a win probability of
            60%, they should win about 60% of the time. This was my primary goal for the model.
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

        <!-- Right: calibration curve image -->
        <div class="hero-image">
          <div class="image-wrapper">
            <img
              class="image"
              :src="calibrationCurve"
              alt="Calibration curve comparing predicted win probabilities to actual win rates."
              loading="lazy"
            />
          </div>
        </div>
      </div>
    </section>

    <!-- Second row: probability distribution (left) + pipeline (right) -->
    <section class="row grid cols-2">
      <!-- Left: probability distribution image -->
      <div class="card">
        <div class="image-wrapper large">
          <img
            class="image"
            :src="probDistribution"
            alt="Histogram of predicted win probabilities across matches."
            loading="lazy"
          />
        </div>
        <div class="image-wrapper large">
            <img
              class="image"
              :src="featureImportance"
              alt="Feature importance chart for the model."
              loading="lazy"
            />
          </div>
      </div>

        <!-- Right: pipeline box -->
        <section class="card pipeline">
        <div class="section-label">Data Pipeline</div>
        <h2 class="section-title small">
            From raw match logs to calibrated probabilities
        </h2>

        <p class="section-intro">
            To get from raw match data into reliable win probabilities, I had to build a full data pipeline with several key steps:
        </p>

        <ol class="pipeline-list">
            <li>Names are standardised, ultra–low–sample teams are removed, and incomplete matches are filtered out. </li>
            <li>Column are created to track patch tags, roster changes, and region strength so the
            model can react to meta shifts rather than blindly inferring.</li>
            <li>
            Build rolling features for each team and position, including: recent form, opponent strength, side selection, and
            player-level trends.
            </li>
            <li>Utilise a random forest to capture non-linear performance scores of individual players. This created another rich feature for the model to consume. </li>
            <li>
            Build a high-performing elo model using performance scores and match outcomes to track player strength and variance over time.
            </li>
            <li>
            Run a Bayesian state-space rating model with an Unscented Kalman Filter (UKF) and stochastic variance to
            update team and player strength over time, instead of using a static Elo.
            </li>
            <li>
            Feed Elo-style and UKF features into tree ensembles (Random Forests and gradient-boosted machines) to
            predict match win probability.
            </li>
            <li>
            Evaluate on time-based splits to avoid look-ahead leakage, then post-hoc calibrate the probabilities and
            backtest them against historical bookmaker odds.
            </li>
            <li>
            Ensemble multiple models with bookkeeper predictions to maximise model strength and minimise variance.
            </li>
        </ol>
        </section>

    </section>

    <!-- Third row: model outcomes + feature/edge visuals -->
    <section class="card outcomes">
    <div class="section-label">Model outcomes</div>
    <h2 class="section-title small">
        What the model learned and how it behaves against the market
    </h2>

    <p class="section-intro">
            To judge how well my system works, I compare it directly to the models
            sitting behind bookmaker odds. I built a python-based data collection pipeline that extracted match outcomes and odds from public betting websites, using BeautifulSoup and requests.
            Then I used validated to measure my models accuracy against those same historical games, recording the accuracy and log loss results.
        </p>

        <p class="metric-line">
            <strong>My model:</strong>
            log loss = 0.579, accuracy = 71.33%
        </p>
        <p class="metric-line">
            <strong>Bookmaker:</strong>
            log loss = 0.624, accuracy = 65.16%
        </p>

        <p class="profit-banner">
            PROFITABLE?!?!
        </p>

    <div class="outcomes-grid">
        <div class="outcomes-text">
        <p>
            Well… not quite. Even when a model is slightly ahead of bookmaker
            accuracy on held-out data, there are two big caveats. First, bookmaker
            odds always include a built-in margin, so a small edge in raw
            accuracy does not automatically translate into a profitable strategy. Second, bookmakers have dedicated
            teams, budgets, and live information streams continually improving
            their models. An edge on historical data does not guarantee an edge in future matches. When you look at more recent seasons, that change
            shows up clearly in the numbers.
        </p>
        <h3 class="section-subtitle" style="margin:0 0 6px;">How bookmaker models evolved</h3>

        <p class="metric-line" style="margin:0px 0;">
            <strong>Bookmaker (2019–2025):</strong>
            log loss = 0.624, accuracy = 65.16%
        </p>
        <p class="metric-line" style="margin:0px 0 0;">
            <strong>Bookmaker (2025 only):</strong>
            log loss = 0.558, accuracy = 73.33%
        </p>

        
        <p>
            As the scene matures, the bookmakers’ proprietary models catch up and then pull
            ahead. By 2025 the gap between my metrics and theirs makes the model redundant. 
            It is also very likely that the few percentage points differentiating my model from theirs are
            the hardest to close without richer data, and a more advanced modelling stack. 
        </p>
        
        <p class="outcomes-intro">
            In the earlier years, especially pre-2020, my model with its level of accuracy and
            calibration would likely have been broadly competitive with the market. Possessing
            well-behaved probabilities, modest accuracy, and an edge
            mainly because the ecosystem was still inefficient. 
        </p>
        </div>

        <div class="outcomes-images">
        <div class="image-wrapper large">
            <img
            class="image"
            :src="edgeOverTime"
            alt="Cumulative profit curve from betting strategy based on the model vs bookmaker odds."
            loading="lazy"
            />
        </div>
        <div class="image-wrapper large">
            <img
            class="image"
            :src="roc"
            alt="Receiver Operating Characteristic (ROC) curve showing the performance of the model."
            loading="lazy"
            />
        </div>
        </div>
    </div>
    </section>


            <!-- Final section: key learnings (notebook-style wrap-up) -->
    <section class="card learnings">
      <div class="section-label">Key learnings</div>
      <h2 class="section-title small">
        Key skills I strengthened on this project
      </h2>

      <p class="learnings-text">
        I treated this project as a long-running skills test rather than a one-off model:
        the goal was to get better at building production-like ML systems that stand
        up against industry standards. While the project isn't profitable in terms of finance, it has forced me to push my data engineering,
        modelling, evaluation, and coding skills in a realistic setting. This itself was the main win as I got the oppportunity to learn and grow my skillset. 
      </p>

      <ul class="learnings-list">
        <li>
          <strong>Data Science & Software Engineering:</strong>
          Building Elo-style ratings, UKF-based state-space models, bayesian statistics, random forests, 
          and gradient boosting models taught me how to effectively use tools commonly found in the industry. By actively studying, using and analysing the outputs
          of these tools, I gained a much more in-depth understanding of their strengths, weaknesses, and appropriate use-cases for each tool.
        </li>

        <li>
          <strong>End-to-end ML & data engineering:</strong>
          I designed and implemented the full pipeline myself, from scraping odds and match
            data to standardising performances, building rolling aggregates, and wiring everything
            into easily reproducible evaluation scripts. This improved my ability to turn
            multiple messy external data sources into a structured feature set that a model can reliably
            consume.
        </li>

        <li>
          <strong>Statistical modelling & calibration:</strong>
          I moved beyond “is the model good?” to thinking in terms of log loss,
            Brier score, reliability curves, and expected calibration error. This sharpened
            my intuition for diagnosing overconfidence and underconfidence, and for understanding
            when probability estimates truly reflected reality. An essential capability for any
            high-stakes, statistics decision making.
        </li>
      </ul>
    </section>


  </article>
</template>

<script setup>
import { RouterLink } from 'vue-router'
import calibrationCurve from '../assets/calibration_curve.png'
import probDistribution from '../assets/prob_distribution.png'
import featureImportance from '../assets/feature_importance.png'
import roc from '../assets/roc.png'
import edgeOverTime from '../assets/edge_over_time.png'

defineProps({
  project: {
    type: Object,
    required: true
  }
})
</script>

<style scoped>
.hero {
  margin-bottom: 16px;
}

.hero-grid {
  display: grid;
  grid-template-columns: minmax(0, 9fr) minmax(0, 7fr);
  gap: 20px;
  align-items: stretch;
}

.hero-copy {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.hero-title {
  margin: 4px 0 8px;
}

.hero-tagline {
  margin-top: 4px;
}

.hero-tags {
  margin: 10px 0 12px;
}

.hero-meta {
  font-size: 0.9rem;
  color: var(--muted);
}

.hero-summary {
  color: var(--muted);
}

.hero-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin-top: 8px;
}

.hero-actions .secondary {
  opacity: 0.9;
}

.hero-image {
  display: flex;
  align-items: center;
}

.row {
  margin-top: 18px;
}

.section-title.small {
  font-size: 1.05rem;
  margin: 6px 0 10px;
}

.section-intro {
  color: var(--muted);
  margin-bottom: 10px;
}

.pipeline-list {
  padding-left: 20px;
  color: var(--muted);
  line-height: 1.5;
  margin: 8px 0;
}

.outcomes {
  margin-top: 18px;
}

.outcomes-intro {
  color: var(--muted);
  margin: 8px 0 14px;
  max-width: 70ch;
}

.outcomes-grid {
  display: grid;
  grid-template-columns: minmax(0, 11fr) minmax(0, 7fr);
  gap: 20px;
  margin-top: 10px;
}

.outcomes-text {
  color: var(--muted);
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.outcomes-images {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.outcome-bullets {
  margin-top: 8px;
  padding-left: 20px;
  color: var(--muted);
  line-height: 1.5;
}

.learnings {
  margin-top: 18px;
}

.learnings-text {
  color: var(--muted);
  margin: 8px 0 10px;
}

.learnings-list {
    padding-left: 20px;
    color: var(--muted);
    line-height: 1.5;
}

/* increase spacing between list items */
.learnings-list li {
    margin-bottom: 12px;
}

/* Shared image styling */
.image-wrapper {
  border-radius: 10px;
  overflow: hidden;
  border: 1px solid var(--border-subtle, #333);
  background: radial-gradient(circle at top left, rgba(255, 255, 255, 0.05), transparent);
}

.image-wrapper.large {
  width: 100%;
}

.image {
  display: block;
  width: 100%;
  height: auto;
}

/* Responsive adjustments */
@media (max-width: 900px) {
  .hero-grid {
    grid-template-columns: 1fr;
  }

  .outcomes-grid {
    grid-template-columns: 1fr;
  }
}
</style>
