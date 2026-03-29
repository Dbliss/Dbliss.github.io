<template>
  <section class="wealth-sheet card">
    <div class="wealth-sheet__header">
      <div>
        <p class="wealth-sheet__kicker">Introduction</p>
        <h2>Let's start with your current situation</h2>
      </div>
      <p class="wealth-sheet__copy">
        Later calculations will reuse these numbers across the calculations.
        You can always come back and change them later.
      </p>
    </div>

    <div class="wealth-sheet__grid">
      <label>
        <span>Starting savings</span>
        <input v-model.number="form.profile.startingSavings" type="number" min="0" step="1000" />
      </label>
      <label>
        <span>Gross income</span>
        <input v-model.number="form.profile.annualIncome" type="number" min="0" step="1000" />
      </label>
      <label>
        <span>Expected Income growth %</span>
        <input v-model.number="incomeGrowthPct" type="number" min="0" max="12" step="0.1" />
      </label>
      <label>
        <span>Time horizon of interest</span>
        <input v-model.number="form.profile.horizonYears" type="number" min="10" max="30" step="1" />
      </label>
      <label>
        <span>Weekly non-housing living costs (food, bills, entertainment, etc.)</span>
        <input v-model.number="form.profile.weeklyNonHousingLivingCosts" type="number" min="0" step="25" />
      </label>
      <label>
        <span>Current housing status</span>
        <select v-model="currentHousingStatus">
          <option value="renting">Renting</option>
          <option value="livingAtHome">Living at home</option>
        </select>
      </label>
      <label>
        <span>Weekly out-of-home rent cost</span>
        <input v-model.number="form.housingCosts.weeklyRent" type="number" min="0" step="10" />
      </label>
      <label>
        <span>Expected Rent growth %</span>
        <input v-model.number="rentGrowthPct" type="number" min="0" max="10" step="0.1" />
      </label>
      <label v-if="form.housingCosts.liveAtHome">
        <span>Years living at home</span>
        <input v-model.number="form.housingCosts.liveAtHomeYears" type="number" min="1" :max="Math.max(1, form.profile.horizonYears - 1)" step="1" />
      </label>
      <label v-if="form.housingCosts.liveAtHome">
        <span>Weekly rent + bills at home</span>
        <input v-model.number="form.housingCosts.weeklyBoardAtHome" type="number" min="0" step="10" />
      </label>
      <label v-if="form.housingCosts.liveAtHome">
        <span>Expected at home cost growth %</span>
        <input v-model.number="boardGrowthPct" type="number" min="0" max="10" step="0.1" />
      </label>
    </div>
  </section>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  form: { type: Object, required: true }
})

const incomeGrowthPct = computed({
  get: () => Number(((Number(props.form.profile.incomeGrowthRate) || 0) * 100).toFixed(1)),
  set: (value) => {
    props.form.profile.incomeGrowthRate = Math.max(0, Number(value) || 0) / 100
  }
})

const rentGrowthPct = computed({
  get: () => Number(((Number(props.form.housingCosts.rentGrowthRate) || 0) * 100).toFixed(1)),
  set: (value) => {
    props.form.housingCosts.rentGrowthRate = Math.max(0, Number(value) || 0) / 100
  }
})

const boardGrowthPct = computed({
  get: () => Number(((Number(props.form.housingCosts.boardGrowthRate) || 0) * 100).toFixed(1)),
  set: (value) => {
    props.form.housingCosts.boardGrowthRate = Math.max(0, Number(value) || 0) / 100
  }
})

const currentHousingStatus = computed({
  get: () => props.form.housingCosts.liveAtHome ? 'livingAtHome' : 'renting',
  set: (value) => {
    props.form.housingCosts.liveAtHome = value === 'livingAtHome'
    if (!props.form.housingCosts.liveAtHome) {
      props.form.housingCosts.liveAtHomeYears = 0
    } else if (props.form.housingCosts.liveAtHomeYears < 1) {
      props.form.housingCosts.liveAtHomeYears = 1
    }
  }
})
</script>

<style scoped>
.wealth-sheet {
  display: grid;
  gap: 1.3rem;
  padding: 1.3rem;
}

.wealth-sheet__header {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: start;
}

.wealth-sheet__header h2 {
  margin: 0.15rem 0 0;
  font-size: clamp(1.65rem, 1.3rem + 1vw, 2.3rem);
  line-height: 1;
}

.wealth-sheet__kicker {
  margin: 0;
  text-transform: uppercase;
  letter-spacing: 0.16em;
  font-size: 0.74rem;
  color: #5d7ba3;
}

.wealth-sheet__copy {
  max-width: 30rem;
  margin: 0;
  color: #557090;
  line-height: 1.5;
}

.wealth-sheet__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.9rem;
}

.wealth-sheet__grid label {
  display: grid;
  gap: 0.35rem;
  color: #5b7192;
  font-size: 0.84rem;
}

.wealth-sheet__grid input,
.wealth-sheet__grid select {
  width: 100%;
  min-height: 3.35rem;
  padding: 0.8rem 0.95rem;
  border-radius: 16px;
  border: 1px solid rgba(154, 174, 204, 0.22);
  background: rgba(248, 251, 255, 0.98);
  color: #173050;
  font: inherit;
}

.wealth-sheet__callout {
  padding: 1rem 1.05rem;
  border-radius: 20px;
  background: linear-gradient(135deg, rgba(224, 242, 254, 0.8), rgba(240, 249, 255, 0.95));
  border: 1px solid rgba(125, 211, 252, 0.25);
}

.wealth-sheet__callout strong {
  display: block;
  margin-bottom: 0.3rem;
}

.wealth-sheet__callout p {
  margin: 0;
  color: #4f6887;
}

@media (max-width: 820px) {
  .wealth-sheet__header {
    flex-direction: column;
  }

  .wealth-sheet__grid {
    grid-template-columns: 1fr;
  }
}
</style>
