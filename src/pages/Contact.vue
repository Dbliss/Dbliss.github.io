<template>
  <section class="contact" aria-label="Contact">
    <div class="links">
      <a class="email" :href="`mailto:${email}?subject=Project%20inquiry`">
        Email me
        <span class="arrow" aria-hidden="true">→</span>
      </a>
      <a
        v-for="s in socials"
        :key="s.label"
        class="social"
        :href="s.href"
        target="_blank"
        rel="noreferrer noopener"
        :aria-label="s.label"
        :title="s.label"
      >
        <BrandIcon :name="s.icon" />
      </a>
    </div>
  </section>
</template>

<script setup>
import BrandIcon from '../components/BrandIcon.vue'
import { socials } from '../data/socials'

const email = 'dillon.bliss@outlook.com'
</script>

<style scoped>
.contact {
  display: flex;
  min-height: calc(100vh - 76px);
  min-height: calc(100dvh - 76px);
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 24px 24px 76px;
}

.links {
  display: inline-flex;
  align-items: center;
  gap: 10px;
}

.email,
.social {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 54px;
  border-radius: 999px;
  transition:
    color 160ms ease,
    background-color 160ms ease,
    box-shadow 160ms ease,
    transform 220ms cubic-bezier(0.34, 1.56, 0.64, 1);
}

.email {
  gap: 10px;
  padding: 0 28px;
  color: #fff;
  background: var(--ink);
  font-weight: 700;
}

.arrow {
  transition: transform 220ms cubic-bezier(0.34, 1.56, 0.64, 1);
}

.email:hover,
.email:focus-visible {
  background: var(--accent);
  box-shadow: 0 12px 28px rgba(104, 88, 232, 0.32);
  transform: translateY(-3px);
}

.email:hover .arrow,
.email:focus-visible .arrow {
  transform: translateX(4px);
}

.social {
  width: 54px;
  color: var(--ink);
  background: #fff;
  box-shadow: 0 0 0 1px var(--line), 0 8px 20px rgba(27, 31, 69, 0.05);
}

.social :deep(.brand-icon) {
  width: 21px;
  height: 21px;
}

.social:hover,
.social:focus-visible {
  color: var(--accent);
  box-shadow: 0 0 0 1px #d9d3ff, 0 12px 26px rgba(104, 88, 232, 0.2);
  transform: translateY(-3px) rotate(-6deg);
}

.email:focus-visible,
.social:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 3px;
}

@media (max-width: 800px) {
  .contact {
    min-height: calc(100vh - 68px);
    min-height: calc(100dvh - 68px);
  }
}

@media (prefers-reduced-motion: reduce) {
  .email,
  .social,
  .arrow {
    transition: none;
  }
}
</style>
