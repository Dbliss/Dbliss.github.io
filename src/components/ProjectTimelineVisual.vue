<template>
  <div class="project-visual" :class="'visual--' + project.slug">
    <img v-if="screenshots[project.slug]" :src="screenshots[project.slug]" :alt="project.title + ' project preview'" decoding="async" />
    <template v-else-if="project.slug === 'asset-data-integration'">
      <div class="pipeline-caption">CONNECTED SYSTEMS</div>
      <div class="pipeline"><span>CMS<br /><small>Source data</small></span><i>→</i><span class="pipeline-core">ETL<br /><small>Transform</small></span><i>→</i><span>ASSETS<br /><small>Synchronise</small></span></div>
      <div class="pipeline-stream"><span></span><span></span><span></span><span></span><span></span></div>
    </template>
    <template v-else-if="project.slug === 'wealth-pathways-au'">
      <div class="wealth-caption"><span>WEALTH PATHWAYS</span><span>Scenario explorer</span></div>
      <svg viewBox="0 0 400 150" aria-hidden="true"><path class="chart-grid" d="M20 25H380 M20 65H380 M20 105H380 M20 145H380" /><path class="chart-band" d="M20 135C100 130 160 102 225 75S330 23 380 8V48C310 70 270 100 220 111S100 142 20 145Z" /><path class="chart-line" d="M20 140C100 137 160 120 225 94S330 45 380 28" /><path class="chart-line chart-line--second" d="M20 140C90 135 140 130 210 117S330 86 380 68" /></svg>
    </template>
    <template v-else>
      <span class="drone-caption">AUTONOMOUS FLIGHT / PID CONTROL</span>
      <svg class="drone-art" viewBox="0 0 400 200" aria-hidden="true"><g class="drone-rings"><ellipse cx="96" cy="58" rx="64" ry="24" /><ellipse cx="304" cy="58" rx="64" ry="24" /><ellipse cx="96" cy="148" rx="64" ry="24" /><ellipse cx="304" cy="148" rx="64" ry="24" /></g><path class="drone-arms" d="M96 58L200 100L304 148M304 58L200 100L96 148" /><path class="drone-body" d="M165 82L200 65L236 82V116L200 136L165 116Z" /><path class="drone-top" d="M165 82L200 100L236 82M200 100V136" /><circle cx="200" cy="90" r="5" class="drone-light" /><path class="drone-props" d="M58 58H134 M266 58H342 M58 148H134 M266 148H342" /></svg>
    </template>
    <span class="visual-caption">{{ captions[project.slug] }}</span>
  </div>
</template>

<script setup>
import sportsluxPreview from '../assets/sportslux/dashboard.png'
import predictorPreview from '../assets/lol-match-predictor/calibration_curve.png'
import chessPreview from '../assets/chess-engine/lichess.png'
import bookingPreview from '../assets/sports-booking/recurring.png'

defineProps({ project: { type: Object, required: true } })
const screenshots = {
  sportslux: sportsluxPreview,
  'lol-match-predictor': predictorPreview,
  chessEngine: chessPreview,
  'sports-booking': bookingPreview
}
const captions = {
  sportslux: 'ENGINEERING / OPTIMISATION',
  'lol-match-predictor': 'MACHINE LEARNING / ESPORTS',
  'asset-data-integration': 'DATA / AUTOMATION',
  chessEngine: 'C++ / SEARCH ALGORITHMS',
  'wealth-pathways-au': 'MODELLING / MONTE CARLO',
  'sports-booking': 'FULL STACK / SCHEDULING',
  drone: 'ROBOTICS / EMBEDDED SYSTEMS'
}
</script>

<style scoped>
.project-visual { position: relative; height: 176px; overflow: hidden; background: #24233d; border-radius: 17px 17px 3px 3px; isolation: isolate; }
.project-visual img { display: block; width: 100%; height: 100%; object-fit: cover; object-position: center top; }
.project-visual::after { content: ''; position: absolute; inset: 0; background: linear-gradient(transparent 55%, rgba(24, 22, 49, .75)); pointer-events: none; }
.visual-caption { position: absolute; z-index: 1; left: 16px; bottom: 13px; color: #fff; font: 600 8px ui-monospace, monospace; letter-spacing: .15em; }
.visual--lol-match-predictor img { object-fit: contain; background: #fff; padding: 8px 12px 22px; }
.visual--asset-data-integration { background: radial-gradient(ellipse at 50% 60%, #51447b, #211e39); }
.pipeline-caption, .drone-caption { position: absolute; top: 19px; left: 20px; color: #bfb6ef; font: 600 8px ui-monospace, monospace; letter-spacing: .16em; }
.pipeline { position: absolute; inset: 55px 22px auto; display: flex; align-items: center; justify-content: space-between; gap: 9px; }
.pipeline span { display: grid; place-content: center; text-align: center; width: 83px; height: 63px; border: 1px solid #766995; border-radius: 12px; background: #39304f; color: #eeebff; font: 700 11px ui-monospace, monospace; }
.pipeline span.pipeline-core { background: #6858e8; border-color: #ab9dff; box-shadow: 0 0 30px #8070ec55; }
.pipeline small { margin-top: 7px; font: 8px system-ui, sans-serif; color: #d1cbe2; }
.pipeline i { color: #bbb0f0; font-style: normal; }
.pipeline-stream { position: absolute; inset: auto 60px 37px; display: flex; justify-content: space-between; }
.pipeline-stream span { width: 4px; height: 4px; border-radius: 50%; background: #a797ed; }
.visual--wealth-pathways-au { background: #20293e; }
.wealth-caption { display: flex; justify-content: space-between; padding: 20px; color: #c2b8ff; font: 700 9px ui-monospace, monospace; }
.wealth-caption span:last-child { color: #8292ae; font-size: 8px; }
.visual--wealth-pathways-au svg { width: 100%; height: 125px; }
.chart-grid { fill: none; stroke: #43516c; stroke-width: .6; }
.chart-band { fill: #8072d12b; }
.chart-line { fill: none; stroke: #a596ff; stroke-width: 3; }
.chart-line--second { stroke: #6dc4b5; stroke-width: 2; }
.visual--drone { background: radial-gradient(ellipse at center, #474566, #25243b); }
.drone-art { display: block; height: 160px; width: 100%; padding: 15px 20px 0; }
.drone-rings { fill: #7f76ac22; stroke: #aba0dc; stroke-width: 1; }
.drone-arms { fill: none; stroke: #aaa7c0; stroke-width: 13; stroke-linecap: round; }
.drone-body { fill: #635d89; stroke: #bab2da; stroke-width: 2; }
.drone-top { fill: none; stroke: #bcb1df; stroke-width: 1; }
.drone-light { fill: #bdb0ff; }
.drone-props { fill: none; stroke: #e0dbf1; stroke-width: 4; stroke-linecap: round; }
@media (max-width: 600px) { .project-visual { height: 142px; } .pipeline { inset-inline: 14px; gap: 6px; } .pipeline span { width: 68px; } }
</style>
