<template>
  <div class="wealth-interest-art" aria-hidden="true">
    <svg v-if="mode === 'portfolioDeepDive'" viewBox="0 0 280 160" preserveAspectRatio="xMidYMid meet">
      <g transform="rotate(-90 70 80)" fill="none" stroke-width="24">
        <circle cx="70" cy="80" r="44" stroke="#3b82f6" stroke-dasharray="99.5 176.9" stroke-dashoffset="0" />
        <circle cx="70" cy="80" r="44" stroke="#34a3a3" stroke-dasharray="60.8 215.6" stroke-dashoffset="-99.5" />
        <circle cx="70" cy="80" r="44" stroke="#93c5fd" stroke-dasharray="38.7 237.7" stroke-dashoffset="-160.3" />
        <circle cx="70" cy="80" r="44" stroke="#a5b4fc" stroke-dasharray="77.4 199.0" stroke-dashoffset="-199.0" />
      </g>
      <g class="wealth-interest-art__legend">
        <circle cx="154" cy="42" r="5" fill="#3b82f6" />
        <text x="170" y="46">Equities</text>
        <circle cx="154" cy="68" r="5" fill="#34a3a3" />
        <text x="170" y="72">Bonds</text>
        <circle cx="154" cy="94" r="5" fill="#93c5fd" />
        <text x="170" y="98">Cash</text>
        <circle cx="154" cy="120" r="5" fill="#a5b4fc" />
        <text x="170" y="124">Alternatives</text>
      </g>
    </svg>

    <svg v-else-if="mode === 'propertyVsStocks'" viewBox="0 0 280 160" preserveAspectRatio="xMidYMid meet">
      <rect x="6" y="14" width="126" height="132" rx="14" fill="#e8f7ee" />
      <rect x="148" y="14" width="126" height="132" rx="14" fill="#eaeefc" />

      <g fill="#1f7a5a">
        <rect x="26" y="94" width="16" height="28" rx="3" />
        <rect x="50" y="78" width="16" height="44" rx="3" />
        <rect x="74" y="62" width="16" height="60" rx="3" />
      </g>
      <path
        d="M26 92 L50 70 L70 78 L96 48"
        fill="none"
        stroke="#1f7a5a"
        stroke-width="4"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <path
        d="M84 48 L98 45 L97 60"
        fill="none"
        stroke="#1f7a5a"
        stroke-width="4"
        stroke-linecap="round"
        stroke-linejoin="round"
      />

      <polygon points="211,42 255,78 167,78" fill="#4155a6" />
      <rect x="177" y="78" width="68" height="44" fill="#ffffff" stroke="#4155a6" stroke-width="3" />
      <circle cx="197" cy="94" r="6" fill="#4155a6" />
      <rect x="215" y="96" width="16" height="16" fill="#4155a6" />
      <rect x="167" y="122" width="88" height="5" rx="2.5" fill="#4155a6" />

      <circle cx="140" cy="80" r="18" fill="#ffffff" stroke="rgba(148, 163, 184, 0.4)" stroke-width="1.5" />
      <text class="wealth-interest-art__vs" x="140" y="85">VS</text>
    </svg>

    <svg v-else-if="mode === 'propertyInvestmentVsLiving'" viewBox="0 0 280 170" preserveAspectRatio="xMidYMid meet">
      <circle cx="140" cy="34" r="26" fill="#dbeafe" />
      <polygon points="140,19 157,34 150,34 150,48 130,48 130,34 123,34" fill="#3f6ba8" />

      <g fill="none" stroke="#b3c2d6" stroke-width="2">
        <path d="M140 62 V76 q0 8 -8 8 H80 q-8 0 -8 8 V102" />
        <path d="M140 62 V76 q0 8 8 8 H200 q8 0 8 8 V102" />
      </g>

      <circle cx="72" cy="128" r="26" fill="#fde8d7" />
      <rect x="62" y="115" width="20" height="27" rx="2" fill="#ea7a3c" />
      <g fill="#ffffff">
        <rect x="65.5" y="119" width="4" height="4" />
        <rect x="74.5" y="119" width="4" height="4" />
        <rect x="65.5" y="127" width="4" height="4" />
        <rect x="74.5" y="127" width="4" height="4" />
        <rect x="65.5" y="135" width="4" height="4" />
        <rect x="74.5" y="135" width="4" height="4" />
      </g>

      <circle cx="208" cy="128" r="26" fill="#dbeafe" />
      <polygon points="203,114 217,126 211,126 211,142 195,142 195,126 189,126" fill="#3f6ba8" />
      <circle cx="222" cy="130" r="7" fill="#6f9bcc" />
      <rect x="220.5" y="135" width="3" height="7" fill="#6f9bcc" />

      <g class="wealth-interest-art__caption">
        <text x="72" y="166" fill="#ea580c">Invest</text>
        <text x="208" y="166" fill="#3f6ba8">Live In</text>
      </g>
    </svg>

    <svg v-else viewBox="0 0 280 170" preserveAspectRatio="xMidYMid meet">
      <defs>
        <pattern id="wealthInterestMapDots" width="10" height="10" patternUnits="userSpaceOnUse">
          <circle cx="3" cy="3" r="1.7" fill="#c9d3e4" />
        </pattern>
        <g id="wealthInterestMapPin">
          <path d="M0 0 c-7 -9 -10 -13 -10 -18 a10 10 0 1 1 20 0 c0 5 -3 9 -10 18 z" fill="#7c3aed" />
          <circle cx="0" cy="-18" r="3.6" fill="#ffffff" />
        </g>
      </defs>

      <polygon points="20,86 62,28 124,46 140,106 96,152 44,134" fill="url(#wealthInterestMapDots)" />

      <use href="#wealthInterestMapPin" transform="translate(54 56) scale(0.78)" />
      <use href="#wealthInterestMapPin" transform="translate(34 92) scale(0.78)" />
      <use href="#wealthInterestMapPin" transform="translate(74 112) scale(0.78)" />
      <use href="#wealthInterestMapPin" transform="translate(112 78) scale(0.78)" />

      <rect
        x="150"
        y="36"
        width="120"
        height="98"
        rx="12"
        fill="#ffffff"
        stroke="rgba(148, 163, 184, 0.34)"
        stroke-width="1.5"
      />
      <text class="wealth-interest-art__panel-title" x="164" y="60">Top suburbs</text>
      <g class="wealth-interest-art__rank">
        <text x="164" y="82">1</text>
        <rect x="178" y="75" width="76" height="7" rx="3.5" fill="#a78bfa" />
        <text x="164" y="99">2</text>
        <rect x="178" y="92" width="62" height="7" rx="3.5" fill="#a78bfa" />
        <text x="164" y="116">3</text>
        <rect x="178" y="109" width="50" height="7" rx="3.5" fill="#a78bfa" />
        <text x="164" y="133">4</text>
        <rect x="178" y="126" width="38" height="7" rx="3.5" fill="#a78bfa" />
      </g>
    </svg>
  </div>
</template>

<script setup>
defineProps({
  mode: { type: String, required: true }
})
</script>

<style scoped>
.wealth-interest-art {
  display: grid;
  place-items: center;
  min-height: 0;
}

.wealth-interest-art svg {
  width: 100%;
  height: 100%;
  max-height: 11rem;
  font-family: inherit;
}

.wealth-interest-art__legend text {
  fill: #56708f;
  font-size: 12px;
}

.wealth-interest-art__vs {
  fill: #64748b;
  font-size: 13px;
  font-weight: 700;
  text-anchor: middle;
}

.wealth-interest-art__caption text {
  font-size: 12px;
  font-weight: 600;
  text-anchor: middle;
}

.wealth-interest-art__panel-title {
  fill: #475569;
  font-size: 11px;
  font-weight: 600;
}

.wealth-interest-art__rank text {
  fill: #94a3b8;
  font-size: 10px;
}
</style>
