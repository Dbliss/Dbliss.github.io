<template>
  <div class="page">
    <!-- Normal nav everywhere except "immersive" pages -->
    <SiteNav v-if="!hideNavBase" />

    <!-- Immersive nav reveal system -->
    <template v-else-if="route.meta?.navReveal !== false">
      <!-- Hotzone: moving mouse near top reveals nav -->
      <div
        v-if="!mobileBettingNav"
        class="nav-hotzone"
        @pointerenter="overHotzone = true"
        @pointerleave="overHotzone = false"
        aria-hidden="true"
      />

      <!-- Overlay nav that slides in/out -->
      <div
        class="nav-overlay"
        :class="{ shown: navShown }"
        @pointerenter="overNav = true"
        @pointerleave="overNav = false"
      >
        <SiteNav />
      </div>
    </template>

    <main :class="route.meta?.fullBleed ? 'fullbleed' : 'container'">
      <RouterView />
    </main>

    <SiteFooter v-if="!hideFooter" />
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { RouterView, useRoute } from 'vue-router'
import SiteNav from './components/SiteNav.vue'
import SiteFooter from './components/SiteFooter.vue'
import { projects } from './data/projects'

const route = useRoute()
const mobileViewport = ref(false)
const mobileBettingNav = computed(() => mobileViewport.value && route.name === 'project' && route.params.slug === 'lol-match-predictor')
let mobileQuery

function updateMobileViewport() {
  mobileViewport.value = mobileQuery.matches
}

// Footer rule (unchanged)
const hideFooter = computed(() => {
  if (route.meta?.hideFooter) return true
  if (route.name !== 'project') return false
  const slug = route.params.slug
  const p = projects.find(x => x.slug === slug)
  return Boolean(p?.hideFooter)
})

// Nav hide base rule (same idea as footer)
const hideNavBase = computed(() => {
  if (mobileBettingNav.value) return true
  if (route.meta?.hideNav) return true
  if (route.name !== 'project') return false
  const slug = route.params.slug
  const p = projects.find(x => x.slug === slug)
  return Boolean(p?.hideNav)
})

// Reveal conditions
const overHotzone = ref(false)
const overNav = ref(false)
const isAtTop = ref(true)
const hasScrolledDown = ref(false)
const scrollingUp = ref(false)
let lastScrollY = 0

function onScroll() {
  const y = window.scrollY || 0
  isAtTop.value = y <= 2
  if (y > 8) hasScrolledDown.value = true
  // Direction with a small dead zone so trackpad jitter doesn't flicker the nav.
  const dy = y - lastScrollY
  if (dy < -4) scrollingUp.value = true
  else if (dy > 4) scrollingUp.value = false
  lastScrollY = y
}

// Show nav if user mouses near top OR hovers nav OR scrolls up OR scrolls fully back to top
// (after scrolling down). Scrolling down hides it again.
const navShown = computed(() => {
  if (!hideNavBase.value) return true
  if (mobileBettingNav.value) return scrollingUp.value
  const showByScrollTop = isAtTop.value && hasScrolledDown.value
  return overHotzone.value || overNav.value || scrollingUp.value || showByScrollTop
})

watch(() => route.fullPath, () => {
  overHotzone.value = false
  overNav.value = false
  scrollingUp.value = false
  hasScrolledDown.value = false
  lastScrollY = window.scrollY || 0
  isAtTop.value = lastScrollY <= 2
})

onMounted(() => {
  mobileQuery = window.matchMedia('(max-width: 760px)')
  updateMobileViewport()
  mobileQuery.addEventListener('change', updateMobileViewport)
  onScroll()
  window.addEventListener('scroll', onScroll, { passive: true })
})

onBeforeUnmount(() => {
  mobileQuery?.removeEventListener('change', updateMobileViewport)
  window.removeEventListener('scroll', onScroll)
})
</script>

<style>
/* Full-bleed pages (e.g. the interactive city home) manage their own layout */
main.fullbleed {
  width: 100%;
  padding: 0;
  margin: 0;
}

/* Only active on immersive pages */
.nav-hotzone {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 56px;           /* "near the top" zone */
  z-index: 9998;
  pointer-events: auto;
}

.nav-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 9999;

  transform: translateY(-110%);
  opacity: 0;
  pointer-events: none;

  transition: transform 220ms ease, opacity 220ms ease;
}

.nav-overlay.shown {
  transform: translateY(0);
  opacity: 1;
  pointer-events: auto;
}
</style>
