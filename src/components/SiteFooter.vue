<template>
  <footer class="footer">
    <div>© {{ year }} Dillon Bliss‑Henaghan. All rights reserved.</div>
    <div class="navlinks">
      <RouterLink to="/">Home</RouterLink>
      <RouterLink to="/projects">Projects</RouterLink>
      <RouterLink to="/about">About</RouterLink>
      <RouterLink to="/contact">Contact</RouterLink>
    </div>
  </footer>
</template>

<script setup>
const year = new Date().getFullYear()
</script>
