<template>
  <section class="wealth-interest card">
    <div class="wealth-interest__header">
      <div>
        <p class="wealth-interest__kicker">Interests</p>
        <h2>Choose what you want to compare</h2>
      </div>
      <p class="wealth-interest__copy">
        Pick the comparison families first. The workbook only exposes the inputs and results that matter for those paths.
      </p>
    </div>

    <div class="wealth-interest__grid">
      <button
        type="button"
        class="wealth-interest__card"
        :class="{ 'is-active': scenarioSelection.includeStocks }"
        @click="$emit('toggle-stocks')"
      >
        <span class="wealth-interest__eyebrow">Stock portfolio scenarios</span>
        <strong>QQQ, ASX200, Bonds, High Interest Cash, Bitcoin</strong>
        <p>Compare five clean liquid-investing tracks with one shared personal cashflow setup.</p>
      </button>

      <button
        type="button"
        class="wealth-interest__card"
        :class="{ 'is-active': scenarioSelection.includeHousing }"
        @click="$emit('toggle-housing')"
      >
        <span class="wealth-interest__eyebrow">Housing approaches</span>
        <strong>Apartment, House, Rentvest Apartment, Rentvest House</strong>
        <p>Model owner-occupier and rentvest outcomes against your chosen portfolio baseline.</p>
      </button>
    </div>

    <div v-if="scenarioSelection.includeHousing && scenarioSelection.includeStocks" class="wealth-interest__baseline">
      <div class="wealth-interest__baseline-head">
        <div>
          <span class="wealth-interest__baseline-label">Stock baseline for housing comparisons</span>
          <strong>Portfolio mix</strong>
        </div>
        <p class="wealth-interest__note">
          Housing comparisons now use your live portfolio allocation mix instead of a single dropdown stock track.
        </p>
      </div>

      <div class="wealth-interest__allocation-grid">
        <label
          v-for="allocation in allocationFields"
          :key="allocation.key"
          class="wealth-interest__allocation"
        >
          <span class="wealth-interest__allocation-title">
            <i class="wealth-interest__allocation-swatch" :style="{ background: allocation.color }"></i>
            {{ allocation.label }}
          </span>
          <div class="wealth-interest__allocation-controls">
            <input
              :value="getAllocationPct(allocation.key)"
              type="range"
              min="0"
              max="100"
              step="1"
              @input="setAllocation(allocation.key, $event.target.value)"
            />
            <input
              :value="getAllocationPct(allocation.key)"
              type="number"
              min="0"
              max="100"
              step="1"
              @input="setAllocation(allocation.key, $event.target.value)"
            />
          </div>
        </label>
      </div>

      <p class="wealth-interest__note">
        This baseline also feeds the portfolio scenario shown in the results dashboard.
      </p>
    </div>
  </section>
</template>

<script setup>
const props = defineProps({
  scenarioSelection: { type: Object, required: true },
  portfolioConfig: { type: Object, required: true }
})

defineEmits(['toggle-stocks', 'toggle-housing'])

const allocationFields = [
  { key: 'qqqWeight', label: 'US Stock - QQQ', color: '#2563eb' },
  { key: 'asxWeight', label: 'AU Stocks - ASX200', color: '#16a34a' },
  { key: 'bondWeight', label: 'Bonds', color: '#f59e0b' },
  { key: 'cashWeight', label: 'High Interest Cash', color: '#475569' },
  { key: 'bitcoinWeight', label: 'Bitcoin', color: '#f97316' }
]

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max)
}

function getAllocationPct(key) {
  return Math.round((Math.max(0, Number(props.portfolioConfig[key]) || 0) * 100))
}

function setAllocation(targetKey, value) {
  const keys = allocationFields.map(field => field.key)
  const nextWeight = clamp(Number(value) || 0, 0, 100) / 100
  const otherKeys = keys.filter(key => key !== targetKey)
  const otherValues = otherKeys.map(key => Math.max(0, Number(props.portfolioConfig[key]) || 0))
  const otherTotal = otherValues.reduce((sum, weight) => sum + weight, 0)
  const remainingWeight = 1 - nextWeight

  props.portfolioConfig[targetKey] = nextWeight

  if (remainingWeight <= 0) {
    otherKeys.forEach((key) => {
      props.portfolioConfig[key] = 0
    })
    return
  }

  let assignedWeight = nextWeight
  otherKeys.forEach((key, index) => {
    const nextShare = otherTotal > 0
      ? remainingWeight * (otherValues[index] / otherTotal)
      : remainingWeight / otherKeys.length

    if (index === otherKeys.length - 1) {
      props.portfolioConfig[key] = Math.max(0, 1 - assignedWeight)
      return
    }

    props.portfolioConfig[key] = nextShare
    assignedWeight += nextShare
  })
}
</script>

<style scoped>
.wealth-interest {
  display: grid;
  gap: 1.25rem;
  padding: 1.3rem;
}

.wealth-interest__header {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
}

.wealth-interest__header h2 {
  margin: 0.15rem 0 0;
  font-size: clamp(1.6rem, 1.25rem + 1vw, 2.2rem);
  line-height: 1;
}

.wealth-interest__kicker {
  margin: 0;
  text-transform: uppercase;
  letter-spacing: 0.16em;
  font-size: 0.74rem;
  color: #5d7ba3;
}

.wealth-interest__copy,
.wealth-interest__note {
  margin: 0;
  max-width: 31rem;
  color: #577190;
  line-height: 1.5;
}

.wealth-interest__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
}

.wealth-interest__card {
  display: grid;
  gap: 0.55rem;
  padding: 1.15rem;
  border-radius: 24px;
  border: 1px solid rgba(154, 174, 204, 0.2);
  background: linear-gradient(145deg, rgba(248, 251, 255, 0.94), rgba(235, 244, 255, 0.88));
  color: #173050;
  text-align: left;
  font: inherit;
  cursor: pointer;
  transition: transform 120ms ease, border-color 120ms ease, box-shadow 120ms ease;
}

.wealth-interest__card:hover {
  transform: translateY(-2px);
}

.wealth-interest__card.is-active {
  border-color: rgba(45, 118, 212, 0.32);
  box-shadow: 0 20px 38px rgba(71, 109, 154, 0.14);
}

.wealth-interest__card p {
  margin: 0;
  color: #5d7394;
}

.wealth-interest__eyebrow {
  display: inline-flex;
  width: fit-content;
  padding: 0.35rem 0.6rem;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.82);
  color: #53719a;
  font-size: 0.76rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

.wealth-interest__baseline {
  display: grid;
  gap: 0.9rem;
  padding: 1rem 1.05rem;
  border-radius: 20px;
  border: 1px solid rgba(154, 174, 204, 0.18);
  background: rgba(242, 247, 255, 0.88);
}

.wealth-interest__baseline-head {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: start;
}

.wealth-interest__baseline-label {
  display: block;
  margin-bottom: 0.35rem;
  color: #587090;
  font-size: 0.84rem;
}

.wealth-interest__allocation-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.8rem;
}

.wealth-interest__allocation {
  display: grid;
  gap: 0.45rem;
  color: #587090;
  font-size: 0.84rem;
}

.wealth-interest__allocation-title {
  display: inline-flex;
  gap: 0.45rem;
  align-items: center;
}

.wealth-interest__allocation-swatch {
  width: 0.72rem;
  height: 0.72rem;
  border-radius: 999px;
  flex: 0 0 auto;
}

.wealth-interest__allocation-controls {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 84px;
  gap: 0.7rem;
  align-items: center;
}

.wealth-interest__allocation-controls input {
  width: 100%;
  min-height: 3rem;
  padding: 0.75rem 0.85rem;
  border-radius: 16px;
  border: 1px solid rgba(154, 174, 204, 0.22);
  background: rgba(255, 255, 255, 0.96);
  color: #173050;
  font: inherit;
}

.wealth-interest__allocation-controls input[type='range'] {
  min-height: 0;
  padding-inline: 0;
}

@media (max-width: 820px) {
  .wealth-interest__header,
  .wealth-interest__grid,
  .wealth-interest__allocation-grid,
  .wealth-interest__baseline-head,
  .wealth-interest__allocation-controls {
    display: grid;
    grid-template-columns: 1fr;
  }
}
</style>
