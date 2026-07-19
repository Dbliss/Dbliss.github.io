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
      <ul class="skills" aria-label="Core technologies">
        <li><BrandIcon name="python" /> Python</li><li><BrandIcon name="javascript" /> JavaScript</li>
        <li><BrandIcon name="typescript" /> TypeScript</li><li><BrandIcon name="sql" /> SQL</li>
        <li><BrandIcon name="aws" /> AWS</li><li><BrandIcon name="iot" /> IoT</li>
      </ul>
      <nav class="social-links" aria-label="Social links">
        <a href="https://github.com/Dbliss" target="_blank" rel="noreferrer noopener"><BrandIcon name="github" /> GitHub</a>
        <a href="https://www.linkedin.com/in/dillon-bliss-770704184/" target="_blank" rel="noreferrer noopener"><BrandIcon name="linkedin" /> LinkedIn</a>
      </nav>
    </div>
    <div class="portrait-column"><div class="portrait-panel"><img :src="dillonPhoto" alt="Dillon Bliss" /></div></div>
  </section>
</template>

<script setup>
import BrandIcon from '../components/BrandIcon.vue'
import dillonPhoto from '../assets/site/dillon.png'
</script>

<style scoped>
.home-hero{width:min(1420px,100%);min-height:100svh;margin:0 auto;padding:clamp(48px,8vh,112px) clamp(24px,8vw,120px) clamp(32px,6vh,72px);display:grid;grid-template-columns:minmax(0,1.1fr) minmax(420px,.9fr);align-items:center;gap:clamp(48px,8vw,132px);background:#fff;color:#111632}
.hero-copy{max-width:720px}.eyebrow{margin:0 0 28px;color:#6f68f5;font-family:Montserrat,"Avenir Next",Avenir,Arial,sans-serif;font-size:.9rem;font-weight:600;letter-spacing:.14em;text-transform:uppercase}
h1{margin:0;font-size:clamp(3.75rem,6.2vw,6.7rem);line-height:.95;letter-spacing:-.065em;font-weight:760}h1 span{color:#6858e8;white-space:nowrap}
.summary{max-width:600px;margin:30px 0 0;color:#626980;font-size:clamp(1rem,1.25vw,1.2rem);line-height:1.7}
.hero-actions{display:flex;flex-wrap:wrap;gap:16px;margin-top:32px}.hero-button{min-height:56px;padding:0 24px;border-radius:10px;display:inline-flex;align-items:center;justify-content:center;gap:22px;font-weight:700}
.hero-button--primary{min-width:200px;color:#fff;background:#111632}.hero-button--primary span{font-size:1.55rem}.hero-button--secondary{color:#29225f;background:#f3f0ff}.hero-button--secondary span{color:#6c5ce7;font-size:1.25rem}
.skills{display:flex;flex-wrap:nowrap;gap:10px;margin:44px 0 0;padding:0;list-style:none;overflow-x:auto;scrollbar-width:none}.skills::-webkit-scrollbar{display:none}.skills li{min-height:34px;padding:0 12px;border:1px solid #dce0eb;border-radius:8px;display:inline-flex;align-items:center;gap:7px;color:#444b62;font-size:.78rem;white-space:nowrap;flex:0 0 auto}
.skills :deep(.brand-icon){width:17px;height:17px;color:#526079}.skills li:nth-child(2) :deep(.brand-icon),.skills li:nth-child(3) :deep(.brand-icon){border-radius:2px}
.social-links{display:flex;flex-wrap:wrap;gap:38px;margin-top:48px}.social-links a{display:inline-flex;align-items:center;gap:10px;color:#293049;font-size:.9rem;font-weight:600}
.social-links :deep(.brand-icon){width:22px;height:22px}.social-links a:first-child :deep(.brand-icon){color:#181717}
.portrait-column{display:flex;align-items:center;justify-content:center}.portrait-panel{position:relative;isolation:isolate;width:min(100%,620px);aspect-ratio:1.08}.portrait-panel::before{content:";position:absolute;z-index:0;inset:8% 2% 2%;border-radius:15%;background:linear-gradient(135deg,#f4f2ff 0%,#eeecff 100%);transform:rotate(4deg);transform-origin:center}.portrait-panel img{position:absolute;z-index:1;left:50%;bottom:0;width:91%;max-height:108%;object-fit:contain;object-position:center bottom;transform:translateX(-50%)}
@media(max-width:900px){.home-hero{grid-template-columns:1fr;min-height:auto;gap:64px;padding-top:72px}.hero-copy{max-width:680px}.portrait-column{grid-row:1}.portrait-panel{width:min(100%,520px)}}
@media(max-width:540px){.home-hero{padding:42px 20px;gap:48px}.portrait-panel{width:86%}.eyebrow{margin-bottom:18px}h1{font-size:clamp(3.3rem,16vw,4.8rem)}h1 span{white-space:normal}.summary{margin-top:22px;line-height:1.6}.hero-actions{display:grid}.hero-button{width:100%}.skills{margin-top:32px}.social-links{margin-top:36px;gap:24px}}
</style>
