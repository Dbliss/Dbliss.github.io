<template>
  <section class="wealth-bars card">
    <div class="wealth-bars__header">
      <div>
        <p class="wealth-bars__kicker">Breakdown</p>
        <h3>{{ title }}</h3>
        <p class="wealth-bars__subtitle">{{ subtitle }}</p>
      </div>
    </div>

    <div class="wealth-bars__legend">
      <span><i class="wealth-bars__swatch wealth-bars__swatch--liquid"></i> Liquid assets</span>
      <span><i class="wealth-bars__swatch wealth-bars__swatch--equity"></i> Home equity</span>
      <span><i class="wealth-bars__swatch wealth-bars__swatch--debt"></i> Debt remaining</span>
    </div>

    <div class="wealth-bars__rows">
      <div v-for="row in scaledRows" :key="row.key" class="wealth-bars__row">
        <div class="wealth-bars__row-head">
          <strong>{{ row.label }}</strong>
          <span>{{ formatShortCurrency(row.total) }}</span>
        </div>

        <div class="wealth-bars__track">
          <div class="wealth-bars__segment wealth-bars__segment--liquid" :style="{ width: `${row.liquidPct}%` }"></div>
          <div class="wealth-bars__segment wealth-bars__segment--equity" :style="{ width: `${row.equityPct}%` }"></div>
        </div>

        <div class="wealth-bars__debt-track">
          <div class="wealth-bars__segment wealth-bars__segment--debt" :style="{ width: `${row.debtPct}%` }"></div>
        </div>

        <div class="wealth-bars__row-meta">
          <span>Liquid {{ formatShortCurrency(row.liquid) }}</span>
          <span>Equity {{ formatShortCurrency(row.equity) }}</span>
          <span>Debt {{ formatShortCurrency(row.debt) }}</span>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed } from 'vue'
import { formatShortCurrency } from '../../wealth/finance.js'

const props = defineProps({
  title: { type: String, required: true },
  subtitle: { type: String, default: '' },
  rows: {
    type: Array,
    default: () => []
  }
})

const scaleMax = computed(() => {
  const totals = props.rows.flatMap(row => [
    Math.max(0, row.liquid) + Math.max(0, row.equity),
    Math.max(0, row.debt)
  ])
  return Math.max(1, ...totals)
})

const scaledRows = computed(() =>
  props.rows.map(row => ({
    ...row,
    liquidPct: (Math.max(0, row.liquid) / scaleMax.value) * 100,
    equityPct: (Math.max(0, row.equity) / scaleMax.value) * 100,
    debtPct: (Math.max(0, row.debt) / scaleMax.value) * 100
  }))
)
</script>

<style scoped>
.wealth-bars {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  background: linear-gradient(180deg, rgba(248, 251, 255, 0.96), rgba(239, 246, 255, 0.94));
  border-color: rgba(154, 174, 204, 0.22);
}

.wealth-bars__header h3 {
  margin: 0.2rem 0 0.35rem;
  font-size: 1.1rem;
}

.wealth-bars__kicker {
  margin: 0;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  font-size: 0.74rem;
  color: #5a7497;
}

.wealth-bars__subtitle {
  margin: 0;
  color: #5d7394;
  font-size: 0.9rem;
}

.wealth-bars__legend {
  display: flex;
  flex-wrap: wrap;
  gap: 0.9rem;
  color: #5d7394;
  font-size: 0.82rem;
}

.wealth-bars__swatch {
  display: inline-block;
  width: 11px;
  height: 11px;
  border-radius: 999px;
  margin-right: 0.3rem;
}

.wealth-bars__swatch--liquid {
  background: linear-gradient(90deg, #60a5fa, #38bdf8);
}

.wealth-bars__swatch--equity {
  background: linear-gradient(90deg, #34d399, #4ade80);
}

.wealth-bars__swatch--debt {
  background: linear-gradient(90deg, #fb7185, #f43f5e);
}

.wealth-bars__rows {
  display: grid;
  gap: 1rem;
}

.wealth-bars__row {
  display: grid;
  gap: 0.5rem;
  padding: 0.85rem;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.72);
  border: 1px solid rgba(154, 174, 204, 0.16);
}

.wealth-bars__row-head,
.wealth-bars__row-meta {
  display: flex;
  justify-content: space-between;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.wealth-bars__row-head {
  color: #173050;
}

.wealth-bars__row-meta {
  color: #6d83a4;
  font-size: 0.8rem;
}

.wealth-bars__track,
.wealth-bars__debt-track {
  display: flex;
  height: 16px;
  border-radius: 999px;
  overflow: hidden;
  background: rgba(225, 235, 248, 0.76);
}

.wealth-bars__debt-track {
  height: 11px;
  background: rgba(252, 165, 165, 0.18);
}

.wealth-bars__segment--liquid {
  background: linear-gradient(90deg, #60a5fa, #38bdf8);
}

.wealth-bars__segment--equity {
  background: linear-gradient(90deg, #34d399, #4ade80);
}

.wealth-bars__segment--debt {
  background: repeating-linear-gradient(
    135deg,
    rgba(251, 113, 133, 0.9),
    rgba(251, 113, 133, 0.9) 8px,
    rgba(244, 63, 94, 0.88) 8px,
    rgba(244, 63, 94, 0.88) 16px
  );
}

@media (max-width: 720px) {
  .wealth-bars__row-head,
  .wealth-bars__row-meta {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
