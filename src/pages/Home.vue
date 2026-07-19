<template>
  <section class="home-hero">
    <div class="hero-copy">
      <h1>Dillon Bliss</h1>
      <h2 class="eyebrow">Software Engineer</h2>
      <p class="summary">I design and build robust systems across backend, frontend and cloud infrastructure with a focus on reliability and performance.</p>
      <div class="hero-actions">
        <RouterLink class="hero-button hero-button--primary" to="/projects">View projects <span>&rarr;</span></RouterLink>
        <RouterLink class="hero-button hero-button--secondary" to="/contact">Contact me <span>&#9993;</span></RouterLink>
      </div>
      <div class="skills-marquee" aria-label="Core technologies">
        <div class="skills-track">
          <ul class="skills">
            <li v-for="skill in skills" :key="skill.label"><BrandIcon :name="skill.icon" /> {{ skill.label }}</li>
          </ul>
          <ul class="skills" aria-hidden="true">
            <li v-for="skill in skills" :key="'duplicate-' + skill.label"><BrandIcon :name="skill.icon" /> {{ skill.label }}</li>
          </ul>
        </div>
      </div>
      <nav class="social-links" aria-label="Social links">
        <a href="https://github.com/Dbliss" target="_blank" rel="noreferrer noopener"><BrandIcon name="github" /> GitHub</a>
        <a href="https://www.linkedin.com/in/dillon-bliss-770704184/" target="_blank" rel="noreferrer noopener"><BrandIcon name="linkedin" /> LinkedIn</a>
        <a href="/resume.pdf" download><BrandIcon name="resume" /> Resume</a>
      </nav>
    </div>
    <div class="portrait-column">
      <div class="portrait-panel">
        <div class="portrait-frame" aria-hidden="true"></div>
        <img :src="dillonPhoto" alt="Dillon Bliss" />
        <div class="portrait-crop" aria-hidden="true"></div>
      </div>
    </div>
  </section>
</template>

<script setup>
import BrandIcon from '../components/BrandIcon.vue'
import dillonPhoto from '../assets/site/dillon.png'

const skills = [
  { label: 'Python', icon: 'python' },
  { label: 'JavaScript', icon: 'javascript' },
  { label: 'TypeScript', icon: 'typescript' },
  { label: 'SQL', icon: 'sql' },
  { label: 'AWS', icon: 'aws' },
  { label: 'IoT', icon: 'iot' },
  { label: 'CI/CD', icon: 'cicd' },
  { label: 'Jira', icon: 'jira' },
  { label: 'Docker', icon: 'docker' },
  { label: 'Git', icon: 'git' },
  { label: 'REST APIs', icon: 'api' }
]
</script>

<style scoped>
.home-hero{width:min(1420px,100%);min-height:100svh;margin:0 auto;padding:clamp(48px,8vh,112px) clamp(24px,8vw,120px) clamp(32px,6vh,72px);display:grid;grid-template-columns:minmax(0,1.1fr) minmax(420px,.9fr);align-items:center;gap:clamp(48px,8vw,132px);background:#fff;color:#111632}
.hero-copy{max-width:720px;min-width:0}.eyebrow{margin:10px 0 28px;color:#6f68f5;font-family:inherit;font-size:clamp(1.45rem,2.2vw,2.15rem);font-weight:720;line-height:1.05;letter-spacing:-.035em}
h1{margin:0;font-size:clamp(3.75rem,6.2vw,6.7rem);line-height:.95;letter-spacing:-.065em;font-weight:760}h1 span{color:#6858e8;white-space:nowrap}
.summary{max-width:600px;margin:30px 0 0;color:#626980;font-size:clamp(1rem,1.25vw,1.2rem);line-height:1.7}
.hero-actions{display:flex;flex-wrap:wrap;gap:16px;margin-top:32px}.hero-button{min-height:56px;padding:0 24px;border-radius:10px;display:inline-flex;align-items:center;justify-content:center;gap:22px;font-weight:700}
.hero-button--primary{min-width:200px;color:#fff;background:#111632}.hero-button--primary span{font-size:1.55rem}.hero-button--secondary{color:#29225f;background:#f3f0ff}.hero-button--secondary span{color:#6c5ce7;font-size:1.25rem}
.skills-marquee{width:100%;margin-top:44px;overflow:hidden;mask-image:linear-gradient(to right,transparent,#000 5%,#000 95%,transparent);-webkit-mask-image:linear-gradient(to right,transparent,#000 5%,#000 95%,transparent)}
.skills-track{display:flex;width:max-content;animation:skills-scroll 42s linear infinite;will-change:transform}.skills{display:flex;flex-wrap:nowrap;gap:12px;margin:0;padding:0 12px 0 0;list-style:none}.skills li{min-height:41px;padding:0 15px;border:1px solid #dce0eb;border-radius:10px;display:inline-flex;align-items:center;gap:8px;color:#444b62;font-size:.94rem;white-space:nowrap;flex:0 0 auto}
.skills :deep(.brand-icon){width:20px;height:20px;color:#080b16}.skills li:nth-child(2) :deep(.brand-icon),.skills li:nth-child(3) :deep(.brand-icon){border-radius:2px}
@keyframes skills-scroll{to{transform:translateX(-50%)}}
.social-links{display:flex;flex-wrap:wrap;gap:38px;margin-top:48px}.social-links a{position:relative;display:inline-flex;align-items:center;gap:10px;padding-bottom:7px;color:#293049;font-size:.9rem;font-weight:600}.social-links a::after{content:"";position:absolute;left:0;bottom:0;width:100%;height:2px;border-radius:999px;background:currentColor;transform:scaleX(0);transform-origin:left;transition:transform .2s ease-out}.social-links a:hover::after,.social-links a:focus-visible::after{transform:scaleX(1)}
.social-links :deep(.brand-icon){width:22px;height:22px;color:#080b16}
.portrait-column{display:flex;align-items:center;justify-content:center}.portrait-panel{position:relative;isolation:isolate;width:min(145.6%,910px);aspect-ratio:1.08}.portrait-frame,.portrait-crop{position:absolute;inset:8% 2% 2%;transform:rotate(4deg);transform-origin:center}.portrait-frame{z-index:0;border-radius:15%;background:linear-gradient(135deg,#f4f2ff 0%,#eeecff 100%)}.portrait-panel img{position:absolute;z-index:1;left:50%;bottom:0;width:109.2%;max-height:129.6%;object-fit:contain;object-position:center bottom;transform:translateX(-50%)}.portrait-crop{z-index:2;pointer-events:none}.portrait-crop::after{content:attr(data-mask);position:absolute;top:calc(100% - 1px);left:-25%;width:150%;height:35%;background:#fff}
@media(max-width:900px){.home-hero{grid-template-columns:1fr;min-height:auto;gap:64px;padding-top:72px}.hero-copy{max-width:680px}.portrait-column{grid-row:1}.portrait-panel{width:min(130%,676px)}}
@media(max-width:540px){.home-hero{padding:42px 20px;gap:48px}.portrait-panel{width:111.8%}.eyebrow{margin-bottom:18px}h1{font-size:clamp(3.3rem,16vw,4.8rem)}h1 span{white-space:normal}.summary{margin-top:22px;line-height:1.6}.hero-actions{display:grid}.hero-button{width:100%}.skills-marquee{margin-top:32px}.social-links{margin-top:36px;gap:24px}}
@media(prefers-reduced-motion:reduce){.skills-marquee{overflow-x:auto;mask-image:none;-webkit-mask-image:none;scrollbar-width:none}.skills-marquee::-webkit-scrollbar{display:none}.skills-track{animation:none}.skills-track .skills[aria-hidden="true"]{display:none}}
</style>