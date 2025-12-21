<template>
  <div class="page">
    <!-- Normal nav everywhere except "immersive" pages -->
    <SiteNav v-if="!hideNavBase" />

    <!-- Immersive nav reveal system -->
    <template v-else>
      <!-- Hotzone: moving mouse near top reveals nav -->
      <div
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

    <main class="container">
      <RouterView />
    </main>

    <SiteFooter v-if="!hideFooter" />
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { RouterView, useRoute } from 'vue-router'
import SiteNav from './components/SiteNav.vue'
import SiteFooter from './components/SiteFooter.vue'
import { projects } from './data/projects'

const route = useRoute()

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

function onScroll() {
  const y = window.scrollY || 0
  isAtTop.value = y <= 2
  if (y > 8) hasScrolledDown.value = true
}

// Show nav if user mouses near top OR hovers nav OR scrolls fully back to top (after scrolling down)
const navShown = computed(() => {
  if (!hideNavBase.value) return true
  const showByScrollTop = isAtTop.value && hasScrolledDown.value
  return overHotzone.value || overNav.value || showByScrollTop
})

onMounted(() => {
  onScroll()
  window.addEventListener('scroll', onScroll, { passive: true })
})

onBeforeUnmount(() => {
  window.removeEventListener('scroll', onScroll)
})
</script>

<style>
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
