<template>
  <div class="page">
    <SiteNav />

    <main class="container">
      <RouterView />
    </main>

    <SiteFooter />
  </div>
</template>

<script setup>
import { RouterView } from 'vue-router'
import SiteNav from './components/SiteNav.vue'
import SiteFooter from './components/SiteFooter.vue'
</script>
