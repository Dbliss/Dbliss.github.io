<template>
  <section class="wealth-interest card">
    <div class="wealth-interest__header">
      <div>
        <p class="wealth-interest__kicker">Interests</p>
        <h2>Choose the comparison path first</h2>
      </div>
      <p class="wealth-interest__copy">
        Pick the broad comparison you want here. The detailed portfolio and property setup happens later in Inputs.
      </p>
    </div>

    <div class="wealth-interest__mode-grid">
      <button
        v-for="mode in comparisonModes"
        :key="mode.key"
        type="button"
        class="wealth-interest__mode"
        :class="{ 'is-active': selectedMode === mode.key }"
        :aria-pressed="selectedMode === mode.key"
        :data-testid="`interest-mode-${mode.key}`"
        :style="getModeStyle(mode)"
        @click="$emit('select-mode', mode.key)"
      >
        <div class="wealth-interest__mode-top">
          <span class="wealth-interest__mode-kicker-badge">{{ mode.kicker }}</span>
          <span class="wealth-interest__mode-count">{{ mode.stat }}</span>
        </div>

        <div class="wealth-interest__mode-main">
          <strong>{{ mode.title }}</strong>
          <p>{{ mode.description }}</p>
        </div>

        <div class="wealth-interest__mode-preview">
          <span class="wealth-interest__mode-preview-label">What you see</span>
          <ul class="wealth-interest__mode-preview-list">
            <li v-for="item in mode.preview" :key="item">{{ item }}</li>
          </ul>
        </div>

        <div class="wealth-interest__mode-includes">
          <span v-for="item in mode.includes" :key="item">{{ item }}</span>
        </div>

        <div class="wealth-interest__mode-footer">
          <span class="wealth-interest__mode-next">{{ mode.nextStep }}</span>
        </div>
      </button>
    </div>
  </section>
</template>

<script setup>
import { computed } from 'vue'
import {
  wealthDefaultStockBaselineKey,
  wealthHousingStrategyKeys,
  wealthStockStrategyKeys
} from '../../data/wealthDefaults.js'

const props = defineProps({
  scenarioSelection: { type: Object, required: true }
})

defineEmits(['select-mode'])

const comparisonModeScenarioKeys = {
  portfolioDeepDive: [...wealthStockStrategyKeys],
  propertyVsStocks: [wealthDefaultStockBaselineKey, ...wealthHousingStrategyKeys],
  propertyInvestmentVsLiving: [...wealthHousingStrategyKeys]
}

const comparisonModes = [
  {
    key: 'portfolioDeepDive',
    kicker: 'Liquid only',
    title: 'Deep dive in portfolio options',
    description: 'Compare Portfolio Mix against the pure liquid tracks so you can pressure-test concentrated and diversified investing paths.',
    stat: '6 liquid strategies',
    preview: [
      'Portfolio Mix beside each pure liquid strategy',
      'A full stock-only workbook flow in Inputs',
      'Results focused on liquid pathways only'
    ],
    includes: ['Portfolio Mix', 'QQQ', 'ASX200', 'Bonds', 'Cash', 'Bitcoin'],
    nextStep: 'Next you set the portfolio mix in Inputs.',
    color: '#2563eb',
    accent: 'rgba(37, 99, 235, 0.16)'
  },
  {
    key: 'propertyVsStocks',
    kicker: 'Portfolio vs property',
    title: 'Property vs stocks',
    description: 'Compare the combined Portfolio Mix path against buying a house or apartment to live in, plus the investment-property versions of both.',
    stat: 'Portfolio + 4 property paths',
    preview: [
      'Portfolio Mix against owner-occupier and rentvest paths',
      'Stock and housing sheets both appear in Inputs',
      'Best for deciding between investing and buying'
    ],
    includes: ['Portfolio Mix', 'House live-in', 'Apartment live-in', 'Rentvest house', 'Rentvest apartment'],
    nextStep: 'Next you set the portfolio mix and property assumptions.',
    color: '#0f766e',
    accent: 'rgba(15, 118, 110, 0.16)'
  },
  {
    key: 'propertyInvestmentVsLiving',
    kicker: 'Housing only',
    title: 'Property as an investment vs living',
    description: 'Focus purely on the housing decision by comparing house and apartment owner-occupier paths against their investment-property alternatives.',
    stat: '4 property paths',
    preview: [
      'House and apartment live-in paths side by side',
      'House and apartment investment-property paths',
      'Inputs focused purely on property setup'
    ],
    includes: ['House live-in', 'Apartment live-in', 'Rentvest house', 'Rentvest apartment'],
    nextStep: 'Next you configure one apartment and one house setup.',
    color: '#ea580c',
    accent: 'rgba(234, 88, 12, 0.16)'
  }
]

const selectedMode = computed(() => {
  const selectedKeys = props.scenarioSelection.selectedScenarioKeys || []
  return comparisonModes.find(mode => matchesScenarioKeys(selectedKeys, comparisonModeScenarioKeys[mode.key]))?.key || null
})

function matchesScenarioKeys(selectedKeys, targetKeys) {
  if (selectedKeys.length !== targetKeys.length) return false
  return targetKeys.every(key => selectedKeys.includes(key))
}

function getModeStyle(mode) {
  return {
    '--mode-color': mode.color,
    '--mode-accent': mode.accent
  }
}
</script>

<style scoped>
.wealth-interest {
  --wealth-interest-border: rgba(154, 174, 204, 0.18);
  --wealth-interest-ink: #173050;
  display: grid;
  gap: 1.35rem;
  padding: 1.45rem;
  background:
    radial-gradient(circle at top left, rgba(56, 189, 248, 0.12), transparent 28%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(239, 246, 255, 0.92));
}

.wealth-interest__header {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
}

.wealth-interest__header h2 {
  margin: 0.15rem 0 0;
  font-size: clamp(1.8rem, 1.4rem + 1.15vw, 2.45rem);
  line-height: 0.98;
  letter-spacing: -0.04em;
  color: var(--wealth-interest-ink);
}

.wealth-interest__kicker {
  margin: 0;
  text-transform: uppercase;
  letter-spacing: 0.16em;
  font-size: 0.74rem;
  color: #5d7ba3;
}

.wealth-interest__copy {
  margin: 0;
  max-width: 31rem;
  color: #577190;
  line-height: 1.5;
}

.wealth-interest__mode-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1.15rem;
  align-items: stretch;
}

.wealth-interest__mode {
  --mode-color: #2563eb;
  --mode-accent: rgba(37, 99, 235, 0.16);
  position: relative;
  display: grid;
  gap: 1rem;
  min-height: 24rem;
  padding: 1.2rem;
  border-radius: 32px;
  border: 1px solid rgba(165, 184, 213, 0.22);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.97), rgba(246, 250, 255, 0.9)),
    var(--mode-accent);
  color: var(--wealth-interest-ink);
  text-align: left;
  font: inherit;
  cursor: pointer;
  overflow: hidden;
  isolation: isolate;
  transition: transform 150ms ease, border-color 150ms ease, box-shadow 150ms ease, background 150ms ease;
}

.wealth-interest__mode::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(145deg, rgba(255, 255, 255, 0.26), transparent 48%);
  pointer-events: none;
}

.wealth-interest__mode:hover {
  transform: translateY(-4px);
  box-shadow: 0 22px 44px rgba(71, 109, 154, 0.14);
  border-color: color-mix(in srgb, var(--mode-color) 18%, rgba(165, 184, 213, 0.32));
}

.wealth-interest__mode.is-active {
  border-color: color-mix(in srgb, var(--mode-color) 44%, white 24%);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(243, 249, 255, 0.94)),
    var(--mode-accent);
  box-shadow:
    0 26px 48px rgba(71, 109, 154, 0.18),
    0 0 0 1px color-mix(in srgb, var(--mode-color) 16%, transparent);
}

.wealth-interest__mode-top,
.wealth-interest__mode-footer {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.65rem;
  flex-wrap: wrap;
}

.wealth-interest__mode-kicker-badge,
.wealth-interest__mode-count,
.wealth-interest__mode-includes span {
  display: inline-flex;
  align-items: center;
  min-height: 1.9rem;
  padding: 0.35rem 0.62rem;
  border-radius: 999px;
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.12em;
}

.wealth-interest__mode-kicker-badge {
  background: rgba(255, 255, 255, 0.82);
  color: #567192;
}

.wealth-interest__mode-count {
  background: color-mix(in srgb, var(--mode-color) 12%, white);
  color: color-mix(in srgb, var(--mode-color) 74%, #173050);
}

.wealth-interest__mode-main {
  position: relative;
  z-index: 1;
  display: grid;
  gap: 0.55rem;
}

.wealth-interest__mode-main strong {
  font-size: clamp(1.18rem, 1.08rem + 0.2vw, 1.35rem);
  line-height: 1.04;
  letter-spacing: -0.035em;
}

.wealth-interest__mode-main p {
  margin: 0;
  color: #5d7394;
  line-height: 1.52;
  font-size: 0.94rem;
}

.wealth-interest__mode-preview {
  position: relative;
  z-index: 1;
  display: grid;
  gap: 0.55rem;
  padding: 0.9rem 0.95rem;
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.56);
  border: 1px solid rgba(255, 255, 255, 0.48);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.45);
}

.wealth-interest__mode-preview-label {
  color: color-mix(in srgb, var(--mode-color) 68%, #355474);
  font-size: 0.76rem;
  text-transform: uppercase;
  letter-spacing: 0.14em;
}

.wealth-interest__mode-preview-list {
  margin: 0;
  padding-left: 1rem;
  display: grid;
  gap: 0.45rem;
  color: #4f6a87;
  font-size: 0.9rem;
  line-height: 1.45;
}

.wealth-interest__mode-includes {
  position: relative;
  z-index: 1;
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-content: start;
}

.wealth-interest__mode-includes span {
  background: rgba(255, 255, 255, 0.66);
  color: #486783;
}

.wealth-interest__mode-next {
  color: #45627f;
  font-size: 0.84rem;
  line-height: 1.4;
}

@media (max-width: 1100px) {
  .wealth-interest__mode-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 900px) {
  .wealth-interest__mode-grid {
    grid-template-columns: 1fr;
  }

  .wealth-interest__mode {
    min-height: 0;
  }
}

@media (max-width: 820px) {
  .wealth-interest__header {
    display: grid;
    grid-template-columns: 1fr;
  }

  .wealth-interest {
    padding: 1.05rem;
  }
}
</style>
