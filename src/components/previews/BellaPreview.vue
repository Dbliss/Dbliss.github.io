<template>
  <div :class="['bl', active && 'is-on']">
    <img class="bl-img" :src="image" alt="" loading="lazy" decoding="async" />

    <div class="bl-panel" :style="{ opacity: panelOpacity }">
      <div v-if="greeting" class="bl-hello">Hi, I’m Bella.</div>

      <div v-else class="bl-log">
        <template v-for="m in log" :key="m.id">
          <div v-if="m.role === 'user'" class="bl-user">{{ m.text }}</div>
          <div v-else class="bl-row">
            <span class="bl-avatar">CW</span>
            <div class="bl-stack">
              <div class="bl-bot">
                <span v-if="m.thinking" class="bl-dots"><i /><i /><i /></span>
                <template v-else>{{ m.text }}</template>
              </div>
              <div v-if="m.product" class="bl-card">
                <img :src="m.product.image" alt="" loading="lazy" decoding="async" />
                <span class="bl-card-name">{{ m.product.name }}</span>
                <span class="bl-card-view">View</span>
              </div>
            </div>
          </div>
        </template>
      </div>

      <div class="bl-input">
        <span :class="draft ? 'bl-draft' : 'bl-ph'">{{ draft || 'Tell us what you are looking for...' }}</span>
        <span class="bl-send">→</span>
      </div>

      <div class="bl-chips">
        <span
          v-for="chip in chips"
          :key="chip"
          :class="['bl-chip', chip === pickedChip && 'is-picked']"
        >{{ chip }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
// Curated Wellness tile: the product photo at rest, Bella's chat UI playing a conversation on hover.
import { computed, ref } from 'vue'
import creatineImg from '../../assets/curated-wellness/how-to-creatine.jpg'
import electrolytesImg from '../../assets/curated-wellness/how-to-electrolytes.jpg'
import { useHoverClock } from './useHoverClock'

const props = defineProps({
  image: { type: String, required: true },
  active: { type: Boolean, default: false }
})

// Bella's approved answers, from the replay on the case study. `tap` means the shopper picks
// a quick reply instead of typing; `chips` are the quick replies offered after that answer.
const TURNS = [
  {
    user: 'I want to recover better after training',
    reply: 'Good goal. To point you at the right thing, what kind of training fills most of your week?',
    chips: ['Strength work, 4x a week', 'Running and longer sessions']
  },
  {
    user: 'Strength work, 4x a week',
    tap: true,
    reply: 'For strength sessions four times a week, creatine is the clearest fit. It supports repeated high-effort sets and is just one 5 g serve a day.',
    product: { name: 'Creatine Monohydrate', image: creatineImg }
  },
  {
    user: 'how do i take it? before or after the gym?',
    reply: 'One 5 g serve once a day, mixed into water or any drink. Timing is flexible, so morning, after training or with a meal all work.'
  },
  {
    user: 'ok cool. i also run for 90 mins on sundays',
    reply: 'For longer sessions, the Electrolyte Hydration Blend is the best fit. It supports hydration and helps replace minerals lost through sweat.',
    product: { name: 'Electrolyte Hydration Blend', image: electrolytesImg }
  }
]

const TYPE_CHARS_PER_SECOND = 19
const REPLY_WORDS_PER_SECOND = 10

// Lay the conversation out on a clock: typing, sending, Bella thinking, her reply, then time to read it.
const SCRIPT = (() => {
  let cursor = 0.8
  const turns = TURNS.map((turn) => {
    const typeFrom = cursor
    const send = turn.tap ? cursor + 1.1 : cursor + turn.user.length / TYPE_CHARS_PER_SECOND + 0.3
    const think = send + 0.25
    const replyFrom = think + 0.85
    const wordCount = turn.reply.split(' ').length
    const replyEnd = replyFrom + wordCount / REPLY_WORDS_PER_SECOND
    cursor = replyEnd + 1.1 + wordCount * 0.03
    return { ...turn, typeFrom, send, think, replyFrom, replyEnd }
  })
  return { turns, fade: cursor + 0.4, loop: cursor + 1 }
})()

const words = (text, amount) => {
  const all = text.split(' ')
  return all.slice(0, Math.ceil(all.length * Math.min(1, amount))).join(' ')
}
const progress = (t, a, b) => Math.min(1, Math.max(0, (t - a) / (b - a)))

const now = ref(0)
useHoverClock(() => props.active, (time) => {
  // Text only changes in steps, so there is no need to re-render on every frame.
  const next = Math.floor((time % SCRIPT.loop) * 30) / 30
  if (next !== now.value) now.value = next
})

const greeting = computed(() => now.value < SCRIPT.turns[0].send)

const draft = computed(() => {
  const t = now.value
  const turn = SCRIPT.turns.find((item) => !item.tap && t >= item.typeFrom && t < item.send)
  if (!turn) return ''
  return turn.user.slice(0, Math.round(turn.user.length * progress(t, turn.typeFrom, turn.send - 0.3)))
})

const log = computed(() => {
  const t = now.value
  const items = []
  SCRIPT.turns.forEach((turn, i) => {
    if (t >= turn.send) items.push({ id: `u${i}`, role: 'user', text: turn.user })
    if (t >= turn.think && t < turn.replyFrom) items.push({ id: `b${i}`, role: 'bot', thinking: true })
    if (t >= turn.replyFrom) {
      items.push({
        id: `b${i}`,
        role: 'bot',
        text: words(turn.reply, progress(t, turn.replyFrom, turn.replyEnd)),
        product: t >= turn.replyEnd + 0.1 ? turn.product : null
      })
    }
  })
  return items
})

// Quick replies stay up until the shopper's next message goes out.
const offeredBy = computed(() => {
  const t = now.value
  return SCRIPT.turns.findIndex((turn, i) => {
    const next = SCRIPT.turns[i + 1]
    return turn.chips && next && t >= turn.replyEnd + 0.15 && t < next.send
  })
})
const chips = computed(() => (offeredBy.value >= 0 ? SCRIPT.turns[offeredBy.value].chips : []))
const pickedChip = computed(() => {
  if (offeredBy.value < 0) return ''
  const next = SCRIPT.turns[offeredBy.value + 1]
  return next.tap && now.value >= next.typeFrom + 0.75 ? next.user : ''
})
const panelOpacity = computed(() => (now.value >= SCRIPT.fade ? 1 - progress(now.value, SCRIPT.fade, SCRIPT.loop) : 1))
</script>

<style scoped>
.bl { position: absolute; inset: 0; overflow: hidden; container-type: size; background: #2a2622; }
.bl-img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; object-position: 62% 50%; display: block; transition: filter .5s ease; }
.bl.is-on .bl-img { filter: brightness(.72); }

.bl-panel {
  position: absolute;
  left: 50%;
  top: 5cqh;
  width: 60cqw;
  height: 62cqh;
  margin-left: -30cqw;
  padding: 1.5em 1.5em 1em;
  display: flex;
  flex-direction: column;
  font: 400 1.65cqw/1.42 "Segoe UI", system-ui, -apple-system, sans-serif;
  color: #2b2a28;
  background: #fdfcfa;
  border-radius: 1.3em;
  box-shadow: 0 2.4em 5em rgba(40, 30, 18, .35);
  visibility: hidden;
  translate: 0 .9em;
  transition: translate .45s cubic-bezier(.2, .8, .2, 1), opacity .3s ease, visibility 0s linear .35s;
}
.bl:not(.is-on) .bl-panel { opacity: 0 !important; }
.bl.is-on .bl-panel { visibility: visible; translate: 0 0; transition-delay: 0s; }

.bl-hello {
  flex: 1;
  display: grid;
  place-items: center;
  font: 300 3.1em/1 Optima, Candara, "Segoe UI Light", "Segoe UI", serif;
  color: #26233a;
}

.bl-log { flex: 1; min-height: 0; overflow: hidden; display: flex; flex-direction: column; justify-content: flex-end; gap: .75em; padding-bottom: .9em; }
.bl-user {
  flex: none;
  align-self: flex-end;
  max-width: 70%;
  padding: .55em .9em;
  color: #4a4640;
  background: #f1e8dd;
  border: 1px solid #e8dccd;
  border-radius: .75em;
}
.bl-row { flex: none; display: flex; align-items: flex-start; gap: .8em; }
.bl-avatar {
  flex: none;
  width: 2.2em;
  height: 2.2em;
  display: grid;
  place-items: center;
  font: 500 .68em/1 Optima, Candara, serif;
  letter-spacing: .03em;
  color: #5b5247;
  background: #fff;
  border: 1px solid #e6dfd5;
  border-radius: 50%;
}
.bl-stack { flex: 0 1 82%; min-width: 0; display: flex; flex-direction: column; align-items: flex-start; gap: .45em; }
.bl-bot {
  padding: .7em .95em;
  background: #fff;
  border: 1px solid #ece8e2;
  border-radius: .95em;
  box-shadow: 0 .4em 1.1em rgba(60, 45, 25, .07);
}
.bl-card {
  display: flex;
  align-items: center;
  gap: .7em;
  padding: .35em .85em .35em .35em;
  background: #fff;
  border: 1px solid #ece8e2;
  border-radius: .7em;
}
.bl-card img { width: 2.5em; height: 2.5em; object-fit: cover; border-radius: .45em; display: block; }
.bl-card-name { font-weight: 600; font-size: .92em; }
.bl-card-view { margin-left: .6em; font-size: .86em; color: #8b6f47; font-weight: 600; }

.bl-dots { display: inline-flex; gap: .3em; padding: .35em 0; }
.bl-dots i { width: .42em; height: .42em; border-radius: 50%; background: #a4978a; animation: bl-dot 1s ease-in-out infinite; }
.bl-dots i:nth-child(2) { animation-delay: .15s; }
.bl-dots i:nth-child(3) { animation-delay: .3s; }
.bl:not(.is-on) .bl-dots i { animation-play-state: paused; }
@keyframes bl-dot { 50% { transform: translateY(-.28em); opacity: .55; } }

.bl-input {
  flex: none;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: .8em;
  padding: .4em .4em .4em 1em;
  background: #fff;
  border: 1.5px solid #8b6f47;
  border-radius: .75em;
}
.bl-ph { color: #8a857d; }
.bl-draft { color: #2b2a28; }
.bl-send {
  flex: none;
  width: 2.3em;
  height: 2.3em;
  display: grid;
  place-items: center;
  color: #fff;
  background: #4f4a42;
  border-radius: .55em;
}

.bl-chips { flex: none; min-height: 2.1em; display: flex; justify-content: center; align-items: center; gap: .5em; padding-top: .5em; }
.bl-chip {
  padding: .22em .85em;
  font-size: .86em;
  font-weight: 600;
  color: #7a6f60;
  background: #f4efe8;
  border-radius: 1.2em;
  white-space: nowrap;
  transition: color .2s ease, background .2s ease;
}
.bl-chip.is-picked { color: #fff; background: #4f4a42; }

@media (prefers-reduced-motion: reduce) {
  .bl-dots i { animation: none; }
  .bl-panel { transition: none; }
}
</style>
