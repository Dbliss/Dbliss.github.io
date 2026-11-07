<template>
  <!-- Monitor | text | phone, wider than the content column so both screens stay readable. -->
  <div class="ds">
    <figure class="ds-monitor">
      <div class="ds-monitor-body">
        <div ref="monitorScreen" class="ds-screen ds-screen--monitor">
          <div v-if="!loaded.monitor" class="ds-loading">Loading…</div>
          <iframe
            :src="deviceSrc('desktop')"
            :title="`${title} on a desktop monitor`"
            loading="lazy"
            :style="frameStyle(MONITOR, scales.monitor)"
            @load="loaded.monitor = true"
          />
        </div>
        <span class="ds-cam" />
      </div>
      <!-- Aluminium stand: angled column on a flat plinth, viewed slightly from above. -->
      <svg class="ds-stand" viewBox="0 0 300 92" aria-hidden="true">
        <defs>
          <linearGradient id="ds-col" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color="#8e93a3" />
            <stop offset=".12" stop-color="#c9ccd6" />
            <stop offset=".7" stop-color="#dfe2e9" />
            <stop offset="1" stop-color="#b9bdc9" />
          </linearGradient>
          <linearGradient id="ds-col-edge" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stop-color="#000" stop-opacity=".18" />
            <stop offset=".08" stop-color="#000" stop-opacity="0" />
            <stop offset=".92" stop-color="#000" stop-opacity="0" />
            <stop offset="1" stop-color="#000" stop-opacity=".18" />
          </linearGradient>
          <linearGradient id="ds-top" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color="#d4d7df" />
            <stop offset="1" stop-color="#f1f2f6" />
          </linearGradient>
          <linearGradient id="ds-lip" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color="#c3c7d1" />
            <stop offset="1" stop-color="#8f94a4" />
          </linearGradient>
          <radialGradient id="ds-shadow" cx=".5" cy=".5" r=".5">
            <stop offset="0" stop-color="#141834" stop-opacity=".32" />
            <stop offset="1" stop-color="#141834" stop-opacity="0" />
          </radialGradient>
        </defs>
        <ellipse cx="150" cy="86" rx="150" ry="7" fill="url(#ds-shadow)" />
        <!-- plinth: top face (perspective) + front lip -->
        <path d="M58 62 Q60 58 66 58 H234 Q240 58 242 62 L258 80 Q260 83 255 83 H45 Q40 83 42 80 Z" fill="url(#ds-top)" />
        <path d="M42 80 Q40 83 45 83 H255 Q260 83 258 80 L258 84 Q258 88 252 88 H48 Q42 88 42 84 Z" fill="url(#ds-lip)" />
        <!-- column, emerging from behind the screen and meeting the plinth -->
        <path d="M118 0 H182 L186 70 Q186 72 184 72 H116 Q114 72 114 70 Z" fill="url(#ds-col)" />
        <path d="M118 0 H182 L186 70 Q186 72 184 72 H116 Q114 72 114 70 Z" fill="url(#ds-col-edge)" />
        <rect x="114" y="68" width="72" height="4" rx="2" fill="#000" opacity=".08" />
      </svg>
      <figcaption>Desktop · {{ MONITOR.w }}×{{ MONITOR.h }}</figcaption>
    </figure>

    <div class="ds-copy">
      <div class="section-label">Live</div>
      <h3>One build, two screens</h3>
      <p>Both screens are running the deployed app, so you can use them.</p>
      <ul>
        <li><strong>Monitor:</strong> the desktop layout.</li>
        <li><strong>Phone:</strong> the 390 px mobile layout. As on a real phone, there's no scroll wheel. <strong>Press and drag</strong> to scroll, and <strong>tap</strong> to press buttons.</li>
      </ul>
    </div>

    <figure class="ds-phone">
      <div class="ds-phone-body">
        <span class="ds-island" />
        <div ref="phoneScreen" class="ds-screen ds-screen--phone">
          <div v-if="!loaded.phone" class="ds-loading">Loading…</div>
          <iframe
            :src="deviceSrc('phone')"
            :title="`${title} on a phone`"
            loading="lazy"
            :style="frameStyle(PHONE, scales.phone)"
            @load="loaded.phone = true"
          />
        </div>
      </div>
      <figcaption>Mobile · {{ PHONE.w }}×{{ PHONE.h }}</figcaption>
    </figure>
  </div>
</template>

<script setup>
import { onBeforeUnmount, onMounted, reactive, ref } from 'vue'

const props = defineProps({
  src: { type: String, required: true },
  title: { type: String, default: 'Live app' }
})

// Each iframe renders at a real device viewport and is scaled to fit its screen, so the app lays
// itself out exactly as it would on that device.
// Monitor: a standard 16:9 1920×1080 desktop at 100% scaling, where the landing page fits with no
// scrollbar.
const MONITOR = { w: 1920, h: 1080 }
const PHONE = { w: 390, h: 844 }

// ?device=phone → touch emulation (drag to scroll, no wheel, no scrollbars).
// ?device=desktop → scrollbars hidden. Both are opt-in flags in Super-Move's touchEmulation.js.
const deviceSrc = (device) => `${props.src}${props.src.includes('?') ? '&' : '?'}device=${device}`

const monitorScreen = ref(null)
const phoneScreen = ref(null)
const scales = reactive({ monitor: 0.6, phone: 0.85 })
const loaded = reactive({ monitor: false, phone: false })

// CSS `zoom` rather than `transform: scale()`: the app still lays out at the full device viewport,
// but the browser renders it at the zoomed size (like browser zoom-out), so text is rasterised at
// its final on-screen size and stays crisp. A scale() transform draws at full size and shrinks the
// bitmap, which is what made the text soft.
const frameStyle = (vp, s) => ({ width: `${vp.w}px`, height: `${vp.h}px`, zoom: s })

let obs
onMounted(() => {
  obs = new ResizeObserver(() => {
    if (monitorScreen.value) scales.monitor = monitorScreen.value.clientWidth / MONITOR.w
    if (phoneScreen.value) scales.phone = phoneScreen.value.clientWidth / PHONE.w
  })
  obs.observe(monitorScreen.value)
  obs.observe(phoneScreen.value)
})
onBeforeUnmount(() => obs?.disconnect())
</script>

<style scoped>
/* Both devices are sized from one variable, the phone's width, so they always stand the same
   height: monitor (top of bezel → bottom of stand) = phone body.
     phone height   = (phone − 22px bezel) × 844/390 + 22px
     monitor height = 16:9 screen + 24px bezel + stand (0.46 × width × 92/300) − 1px overlap
                    = 0.703567 × width + 9.5px
   → monitor width  = (phone height − 9.5px) / 0.703567                                         */
.ds {
  --bleed: min(1480px, calc(100vw - 32px));
  --phone: clamp(220px, 18.5vw, 290px);
  --device-h: calc((var(--phone) - 22px) * 2.164103 + 22px);
  --monitor: calc((var(--device-h) - 9.5px) / 0.703567);
  width: var(--bleed);
  margin-left: calc((100% - var(--bleed)) / 2);
  display: grid;
  grid-template-columns: var(--monitor) minmax(180px, 250px) var(--phone);
  justify-content: center;
  gap: clamp(24px, 2.6vw, 40px);
  align-items: center;
}

figure { margin: 0; }
figcaption {
  margin-top: 10px; text-align: center;
  font-size: .76rem; font-weight: 650; letter-spacing: .06em; text-transform: uppercase; color: var(--muted);
}

.ds-copy h3 { margin: 6px 0 10px; font-size: 1.4rem; letter-spacing: -.02em; line-height: 1.2; }
.ds-copy p { margin: 0 0 12px; color: var(--muted); line-height: 1.7; }
.ds-copy ul { margin: 0; padding-left: 18px; color: var(--muted); line-height: 1.7; font-size: .95rem; }
.ds-copy li + li { margin-top: 8px; }
.ds-copy strong { color: var(--ink); }

/* shared screen */
.ds-screen {
  position: relative;
  overflow: hidden;
  background: #f7f9fc;
}
.ds-screen iframe {
  position: absolute; top: 0; left: 0;
  border: 0; display: block;
}
.ds-loading {
  position: absolute; inset: 0; display: grid; place-items: center;
  color: var(--muted); font-size: .85rem;
}

/* ---------- monitor (face on) ---------- */
.ds-monitor { width: var(--monitor); display: flex; flex-direction: column; align-items: center; }
/* Thin, even black bezel with a fine aluminium rim, like a current studio display. */
.ds-monitor-body {
  position: relative;
  z-index: 1;
  width: 100%;
  padding: 12px;
  border-radius: 16px;
  background: #0d0e14;
  box-shadow:
    0 0 0 2px #c9ccd5,
    0 0 0 3px #a3a7b4,
    0 34px 60px rgba(27, 31, 69, .2),
    0 8px 18px rgba(27, 31, 69, .12);
}
.ds-cam {
  position: absolute; top: 4px; left: 50%; transform: translateX(-50%);
  width: 5px; height: 5px; border-radius: 50%; background: #262838;
}
.ds-screen--monitor {
  aspect-ratio: 16 / 9;
  border-radius: 3px;
}
.ds-stand {
  display: block;
  width: 46%;
  height: auto;
  margin-top: -1px;
}

/* ---------- phone ---------- */
.ds-phone { width: var(--phone); }
.ds-phone-body {
  position: relative;
  padding: 11px;
  border-radius: 50px;
  background: linear-gradient(145deg, #2a2d42, #12131f);
  box-shadow:
    0 0 0 1.5px #4a4e68 inset,
    0 0 0 6px #1b1d2c inset,
    0 40px 70px rgba(27, 31, 69, .28),
    0 10px 20px rgba(27, 31, 69, .16);
}
.ds-island {
  position: absolute; top: 22px; left: 50%; transform: translateX(-50%);
  width: 92px; height: 27px; border-radius: 99px; background: #000; z-index: 3;
}
.ds-screen--phone {
  aspect-ratio: 390 / 844;
  border-radius: 39px;
}

/* Medium screens: monitor on its own row, text and phone beneath. */
@media (max-width: 1180px) {
  .ds { --phone: 260px; grid-template-columns: minmax(0, 1fr) var(--phone); }
  .ds-monitor { grid-column: 1 / -1; width: min(var(--monitor), 100%); justify-self: center; }
}
@media (max-width: 720px) {
  .ds { --phone: min(300px, 80vw); grid-template-columns: 1fr; justify-items: center; }
  .ds-copy { max-width: 520px; }
}
</style>
