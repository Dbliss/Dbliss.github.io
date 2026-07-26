<template>
  <header class="nav">
    <RouterLink class="brand" to="/" aria-label="Dillon Bliss — home">
      <span class="brand-name" aria-hidden="true">
        <span>D</span><span class="brand-reveal">illon&nbsp;</span><span class="brand-surname">Bliss</span>
      </span>
    </RouterLink>

    <nav class="navlinks" aria-label="Main navigation">
      <RouterLink to="/">Home</RouterLink>
      <RouterLink to="/projects">Projects</RouterLink>
      <RouterLink to="/about">About</RouterLink>
      <RouterLink to="/contact">Contact</RouterLink>
    </nav>

    <div class="actions" aria-label="Profile links">
      <a
        v-for="s in profileLinks"
        :key="s.label"
        :href="s.href"
        class="profile-link"
        :target="s.download ? undefined : '_blank'"
        :rel="s.download ? undefined : 'noreferrer noopener'"
        :download="s.download || undefined"
        :aria-label="s.download ? `Download ${s.label}` : `Open ${s.label}`"
        :title="s.download ? `Download ${s.label}` : s.label"
      >
        <BrandIcon :name="s.icon" />
        <span class="sr-only">{{ s.label }}</span>
      </a>
    </div>
  </header>
</template>

<script setup>
import { socials } from '../data/socials'
import BrandIcon from './BrandIcon.vue'
import resumeUrl from '../../Resume.docx?url'

const profileLinks = [
  ...socials,
  { label: 'Resume', href: resumeUrl, icon: 'resume', download: true }
]
</script>

<style scoped>
.nav {
  min-height: 76px;
  padding-block: 12px;
  border-bottom-color: rgba(74, 78, 108, 0.11);
  background: rgba(255, 255, 255, 0.84);
  box-shadow: 0 8px 32px rgba(27, 31, 52, 0.04);
  backdrop-filter: blur(20px) saturate(150%);
  -webkit-backdrop-filter: blur(20px) saturate(150%);
}

.brand {
  display: inline-flex;
  align-items: center;
  width: 7rem;
  gap: 0;
  color: var(--ink);
}

.brand-name {
  display: inline-flex;
  align-items: baseline;
  font-family: inherit;
  font-size: 1.18rem;
  font-weight: 760;
  line-height: 0.95;
  letter-spacing: -0.065em;
  white-space: nowrap;
}

.brand-reveal {
  display: inline-block;
  max-width: 0;
  overflow: hidden;
  white-space: nowrap;
  transition: max-width 600ms steps(5, end);
}

.brand-surname {
  color: inherit;
  transition: color 180ms ease;
}

.brand:hover .brand-surname,
.brand:focus-visible .brand-surname {
  color: #6f68f5;
}

.brand:hover .brand-reveal,
.brand:focus-visible .brand-reveal {
  max-width: 3.3em;
}

.brand:focus-visible {
  outline: 2px solid #6554ee;
  outline-offset: 6px;
  border-radius: 3px;
}

.navlinks {
  gap: clamp(18px, 2.3vw, 30px);
}

.navlinks a {
  padding-block: 10px;
  transition: color 160ms ease;
}

.navlinks a:hover {
  color: var(--ink);
}

.actions {
  align-self: center;
  gap: 7px;
}

.profile-link {
  position: relative;
  display: grid;
  width: 38px;
  height: 38px;
  place-items: center;
  border-radius: 10px;
  color: #4b5069;
  transition:
    color 160ms ease,
    background-color 160ms ease,
    transform 160ms ease,
    box-shadow 160ms ease;
}

.profile-link :deep(.brand-icon) {
  width: 19px;
  height: 19px;
}

.profile-link:hover,
.profile-link:focus-visible {
  color: #5747dc;
  background: #f0edff;
  box-shadow: 0 5px 14px rgba(101, 84, 238, 0.12);
  transform: translateY(-1px);
}

.profile-link:focus-visible {
  outline: 2px solid #6554ee;
  outline-offset: 2px;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

@media (max-width: 800px) {
  .nav {
    min-height: 68px;
    gap: 14px;
  }

  .brand {
    display: none;
  }

  .actions {
    display: flex;
    flex: 0 0 auto;
  }

  .navlinks {
    gap: clamp(11px, 2.7vw, 20px);
  }
}

@media (max-width: 620px) {
  .nav {
    padding-inline: 12px;
  }

  .navlinks {
    width: auto;
    flex: 1 1 auto;
    justify-content: space-around;
    gap: 4px;
    font-size: 0.76rem;
  }

  .navlinks a {
    padding-inline: 3px;
  }

  .actions {
    gap: 2px;
  }

  .profile-link {
    width: 32px;
    height: 34px;
  }

  .profile-link :deep(.brand-icon) {
    width: 17px;
    height: 17px;
  }
}

@media (max-width: 430px) {
  .navlinks a:first-child {
    display: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .brand-reveal,
  .brand-surname,
  .profile-link,
  .navlinks a {
    transition: none;
  }
}
</style>


