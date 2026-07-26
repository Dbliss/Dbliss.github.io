<template>
  <section class="wealth-interest">
    <header class="wealth-interest__header">
      <div class="wealth-interest__intro">
        <p class="wealth-interest__kicker">Interests</p>
        <h2>Choose the comparison path first</h2>
        <p class="wealth-interest__copy">
          Pick the broad pathway you want to explore. Detailed portfolio
          and property setup happens later in Inputs.
        </p>
      </div>

      <svg class="wealth-interest__header-art" viewBox="0 0 320 96" aria-hidden="true">
        <path
          d="M4 74 C58 94 92 30 146 34 C200 38 214 20 314 14"
          fill="none"
          stroke="#cbd5e1"
          stroke-width="2.5"
          stroke-linecap="round"
          stroke-dasharray="2 9"
        />
        <g fill="none" stroke="#cbd5e1" stroke-width="2.5">
          <path
            v-for="pin in headerPins"
            :key="pin.id"
            d="M0 0 c-6 -8 -9 -12 -9 -16.5 a9 9 0 1 1 18 0 c0 4.5 -3 8.5 -9 16.5 z"
            :transform="`translate(${pin.x} ${pin.y}) scale(${pin.scale})`"
          />
        </g>
      </svg>
    </header>

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
        <span v-if="selectedMode === mode.key" class="wealth-interest__mode-check" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round">
            <path d="M5 12.5 L10 17.5 L19 7" />
          </svg>
        </span>

        <span class="wealth-interest__mode-badge">{{ mode.badge }}</span>

        <div class="wealth-interest__mode-main">
          <strong>{{ mode.title }}</strong>
          <p>
            <span
              v-for="(segment, index) in mode.description"
              :key="index"
              :class="{ 'is-accent': segment.accent }"
            >{{ segment.text }}</span>
          </p>
        </div>

        <WealthInterestIllustration :mode="mode.key" />

        <div class="wealth-interest__mode-includes">
          <span v-for="item in getVisibleIncludes(mode)" :key="item">{{ item }}</span>
          <span v-if="mode.includes.length > maxVisibleIncludes" class="is-more">+ more</span>
        </div>
      </button>
    </div>
  </section>
</template>

<script setup>
import { computed } from 'vue'
import WealthInterestIllustration from './WealthInterestIllustration.vue'

const props = defineProps({
  scenarioSelection: { type: Object, required: true },
  selectedMode: { type: String, default: null }
})

defineEmits(['select-mode'])

const maxVisibleIncludes = 6

const headerPins = [
  { id: 'pin-1', x: 46, y: 72, scale: 0.5 },
  { id: 'pin-2', x: 148, y: 36, scale: 0.62 },
  { id: 'pin-3', x: 214, y: 28, scale: 0.72 },
  { id: 'pin-4', x: 296, y: 22, scale: 1 }
]

const comparisonModes = [
  {
    key: 'portfolioDeepDive',
    badge: 'Liquid strategies',
    title: 'Deep dive in portfolio options',
    description: [
      { text: 'Compare ' },
      { text: 'portfolio mixes', accent: true },
      { text: ' against pure liquid strategies.' }
    ],
    includes: ['Portfolio Mix', 'QQQ', 'ASX200', 'VGS', 'VGE', 'DBP', 'Bonds', 'Cash', 'Bitcoin'],
    color: '#2563eb'
  },
  {
    key: 'propertyVsStocks',
    badge: 'Market comparison',
    title: 'Property vs stocks',
    description: [{ text: 'Compare the investment potential of property and stocks.' }],
    includes: ['Portfolio Mix', 'Stocks', 'Property', 'Rentvest', 'House live-in'],
    color: '#0f766e'
  },
  {
    key: 'propertyInvestmentVsLiving',
    badge: 'Use case',
    title: 'Property as investment vs living',
    description: [{ text: 'See the difference between investment property and living in a home.' }],
    includes: ['Investment Property', 'Owner Occupier', 'House', 'Apartment'],
    color: '#ea580c'
  },
  {
    key: 'regionScout',
    badge: 'Area finder',
    title: 'Best suburbs to target',
    description: [{ text: 'Search the market on budget, growth, yield, and volatility.' }],
    includes: ['Budget Search', 'Suburb Ranking', 'Growth Score', 'Rental Yield'],
    color: '#7c3aed'
  }
]

const selectedMode = computed(() =>
  props.selectedMode && comparisonModes.some((mode) => mode.key === props.selectedMode)
    ? props.selectedMode
    : null
)

function getVisibleIncludes(mode) {
  return mode.includes.slice(0, maxVisibleIncludes)
}

function getModeStyle(mode) {
  return {
    '--mode-color': mode.color
  }
}
</script>

<style scoped>
.wealth-interest {
  --wealth-interest-ink: #12233c;
  display: grid;
  gap: 1.75rem;
}

.wealth-interest__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 2rem;
}

.wealth-interest__intro {
  display: grid;
  gap: 0.35rem;
  max-width: 44rem;
}

.wealth-interest__header h2 {
  margin: 0.1rem 0 0.35rem;
  font-size: clamp(2rem, 1.5rem + 1.85vw, 3.15rem);
  line-height: 1.02;
  letter-spacing: -0.035em;
  color: var(--wealth-interest-ink);
}

.wealth-interest__kicker {
  margin: 0;
  text-transform: uppercase;
  letter-spacing: 0.16em;
  font-size: 0.74rem;
  font-weight: 600;
  color: #2f6bd8;
}

.wealth-interest__copy {
  margin: 0;
  max-width: 30rem;
  color: #64748b;
  line-height: 1.6;
  font-size: 1.02rem;
}

.wealth-interest__header-art {
  flex: 0 1 26rem;
  max-width: 26rem;
  height: auto;
  align-self: flex-start;
}

.wealth-interest__mode-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 1.5rem;
  align-items: stretch;
}

.wealth-interest__mode {
  --mode-color: #2563eb;
  position: relative;
  display: grid;
  grid-template-rows: auto auto 1fr auto;
  gap: 1.1rem;
  min-height: 31rem;
  padding: 1.4rem;
  border-radius: 24px;
  border: 1px solid rgba(165, 184, 213, 0.28);
  background: #ffffff;
  color: var(--wealth-interest-ink);
  text-align: left;
  font: inherit;
  cursor: pointer;
  transition: transform 150ms ease, border-color 150ms ease, box-shadow 150ms ease;
}

.wealth-interest__mode:hover {
  transform: translateY(-4px);
  box-shadow: 0 22px 44px rgba(71, 109, 154, 0.14);
  border-color: color-mix(in srgb, var(--mode-color) 24%, rgba(165, 184, 213, 0.32));
}

.wealth-interest__mode.is-active {
  border-color: color-mix(in srgb, var(--mode-color) 55%, white);
  box-shadow:
    0 22px 44px rgba(71, 109, 154, 0.16),
    0 0 0 1px color-mix(in srgb, var(--mode-color) 32%, transparent);
}

.wealth-interest__mode-check {
  position: absolute;
  top: 1.15rem;
  right: 1.15rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.7rem;
  height: 1.7rem;
  border-radius: 999px;
  background: var(--mode-color);
  color: #ffffff;
}

.wealth-interest__mode-check svg {
  width: 0.95rem;
  height: 0.95rem;
}

.wealth-interest__mode-badge {
  justify-self: start;
  padding: 0.4rem 0.7rem;
  border-radius: 999px;
  background: color-mix(in srgb, var(--mode-color) 12%, white);
  color: color-mix(in srgb, var(--mode-color) 78%, #0f172a);
  font-size: 0.68rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

.wealth-interest__mode-main {
  display: grid;
  gap: 0.6rem;
}

.wealth-interest__mode-main strong {
  font-size: 1.35rem;
  line-height: 1.15;
  letter-spacing: -0.025em;
}

.wealth-interest__mode-main p {
  margin: 0;
  color: #64748b;
  line-height: 1.5;
  font-size: 0.92rem;
}

.wealth-interest__mode-main p .is-accent {
  color: var(--mode-color);
  font-weight: 500;
}

.wealth-interest__mode-includes {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-content: end;
}

.wealth-interest__mode-includes span {
  padding: 0.36rem 0.72rem;
  border-radius: 999px;
  background: #f1f5f9;
  color: #475569;
  font-size: 0.74rem;
  line-height: 1.3;
}

.wealth-interest__mode-includes .is-more {
  background: transparent;
  border: 1px solid rgba(148, 163, 184, 0.35);
  color: #64748b;
}

@media (max-width: 1280px) {
  .wealth-interest__mode-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 1024px) {
  .wealth-interest__header-art {
    display: none;
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
</style>
