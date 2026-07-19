<template>
  <section class="home-hero">
    <div class="hero-copy">
      <div class="name-lockup">
        <span class="name-hint" aria-hidden="true">
          Click to learn more about me
          <svg viewBox="0 0 54 34" role="presentation">
            <path d="M49 3C43 9 42 19 31 23C22 27 13 26 4 24" />
            <path d="M11 18L4 24L12 29" />
          </svg>
        </span>
        <h1>
          <RouterLink class="name-link" to="/about" data-text="Dillon Bliss">Dillon Bliss</RouterLink>
        </h1>
      </div>
      <h2 class="eyebrow">Software Engineer</h2>
      <p class="summary">I design and build robust systems across backend, frontend and cloud infrastructure with a focus on reliability and performance.</p>
      <div class="hero-actions">
        <RouterLink class="hero-button hero-button--primary" to="/projects">View projects <span>&rarr;</span></RouterLink>
        <RouterLink class="hero-button hero-button--secondary" to="/contact">Contact me <span>&#9993;</span></RouterLink>
      </div>
      <div
        ref="skillsMarquee"
        class="skills-marquee"
        :class="{ 'is-dragging': isDragging }"
        aria-label="Core technologies"
        @pointerenter="pauseSkills"
        @pointerleave="resumeSkills"
        @pointerdown="startSkillsDrag"
        @pointermove="moveSkillsDrag"
        @pointerup="endSkillsDrag"
        @pointercancel="endSkillsDrag"
      >
        <div ref="skillsTrack" class="skills-track">
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
import { onBeforeUnmount, onMounted, ref } from 'vue'
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

const skillsMarquee = ref(null)
const skillsTrack = ref(null)
const isDragging = ref(false)

const CRUISE_DURATION = 35
const SPEED_RESPONSE = 5
let animationFrame = 0
let lastFrameTime = 0
let offset = 0
let velocity = 0
let hovered = false
let reducedMotion = false
let activePointerId = null
let lastPointerX = 0
let lastPointerTime = 0
let dragVelocity = 0
let motionQuery

function loopWidth() {
  return (skillsTrack.value?.scrollWidth || 0) / 2
}

function wrapOffset() {
  const width = loopWidth()
  if (!width) return
  offset = ((offset % width) - width) % width
}

function renderSkills() {
  if (skillsTrack.value) skillsTrack.value.style.transform = `translate3d(${offset}px, 0, 0)`
}

function targetVelocity() {
  if (reducedMotion || hovered || isDragging.value) return 0
  return -loopWidth() / CRUISE_DURATION
}

function animateSkills(time) {
  if (!lastFrameTime) {
    lastFrameTime = time
    velocity = targetVelocity()
  }

  const elapsed = Math.min((time - lastFrameTime) / 1000, 0.05)
  lastFrameTime = time

  if (!isDragging.value) {
    const easing = 1 - Math.exp(-SPEED_RESPONSE * elapsed)
    velocity += (targetVelocity() - velocity) * easing
    offset += velocity * elapsed
    wrapOffset()
    renderSkills()
  }

  animationFrame = requestAnimationFrame(animateSkills)
}

function pauseSkills(event) {
  if (event.pointerType === 'mouse') hovered = true
}

function resumeSkills(event) {
  if (event.pointerType === 'mouse') hovered = false
}

function startSkillsDrag(event) {
  if (!event.isPrimary || (event.pointerType === 'mouse' && event.button !== 0)) return
  activePointerId = event.pointerId
  isDragging.value = true
  lastPointerX = event.clientX
  lastPointerTime = performance.now()
  dragVelocity = 0
  skillsMarquee.value?.setPointerCapture(event.pointerId)
}

function moveSkillsDrag(event) {
  if (!isDragging.value || event.pointerId !== activePointerId) return
  const now = performance.now()
  const elapsed = Math.max((now - lastPointerTime) / 1000, 0.001)
  const delta = event.clientX - lastPointerX

  offset += delta
  dragVelocity = delta / elapsed
  lastPointerX = event.clientX
  lastPointerTime = now
  wrapOffset()
  renderSkills()
}

function endSkillsDrag(event) {
  if (event.pointerId !== activePointerId) return
  if (skillsMarquee.value?.hasPointerCapture(event.pointerId)) {
    skillsMarquee.value.releasePointerCapture(event.pointerId)
  }
  velocity = reducedMotion ? 0 : Math.max(-600, Math.min(600, dragVelocity))
  activePointerId = null
  isDragging.value = false
}

function updateMotionPreference(event) {
  reducedMotion = event.matches
  if (reducedMotion) velocity = 0
}

onMounted(() => {
  motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
  reducedMotion = motionQuery.matches
  motionQuery.addEventListener('change', updateMotionPreference)
  animationFrame = requestAnimationFrame(animateSkills)
})

onBeforeUnmount(() => {
  cancelAnimationFrame(animationFrame)
  motionQuery?.removeEventListener('change', updateMotionPreference)
})
</script>

<style scoped>
.home-hero{width:min(1420px,100%);min-height:100svh;margin:0 auto;padding:clamp(48px,8vh,112px) clamp(24px,8vw,120px) clamp(32px,6vh,72px);display:grid;grid-template-columns:minmax(0,1.1fr) minmax(420px,.9fr);align-items:center;gap:clamp(48px,8vw,132px);background:#fff;color:#111632}
.hero-copy{max-width:720px;min-width:0}.eyebrow{margin:10px 0 28px;color:#6f68f5;font-family:inherit;font-size:clamp(1.45rem,2.2vw,2.15rem);font-weight:720;line-height:1.05;letter-spacing:-.035em}
.name-lockup{position:relative;width:max-content;max-width:100%}.name-hint{position:absolute;right:-6rem;bottom:calc(100% + 13px);display:block;color:#6f68f5;font-size:clamp(.68rem,.8vw,.79rem);font-weight:650;letter-spacing:.01em;line-height:1;white-space:nowrap;transform:rotate(15deg);transform-origin:right bottom}.name-hint svg{position:absolute;top:calc(100% + 8px);left:2rem;width:46px;height:29px;overflow:visible;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;transform:rotate(-30deg)}
h1{margin:0;font-size:clamp(3.375rem,5.58vw,6.03rem);line-height:.95;letter-spacing:-.065em;font-weight:760}.name-link{position:relative;display:inline-block;color:#111632;white-space:nowrap}.name-link::after{content:attr(data-text);position:absolute;top:0;left:0;width:0;overflow:hidden;color:#6f68f5;white-space:nowrap;transition:width .7s cubic-bezier(.42,0,.58,1);pointer-events:none}.name-link:hover::after,.name-link:focus-visible::after{width:calc(100% + .08em)}.name-link:focus-visible{outline:2px solid #6f68f5;outline-offset:7px;border-radius:3px}
.summary{max-width:600px;margin:30px 0 0;color:#626980;font-size:clamp(1rem,1.25vw,1.2rem);line-height:1.7}
.hero-actions{display:flex;flex-wrap:wrap;gap:16px;margin-top:32px}.hero-button{position:relative;min-height:56px;padding:0 24px;border-radius:10px;display:inline-flex;align-items:center;justify-content:center;gap:22px;font-weight:700}.hero-button::after{content:'';position:absolute;inset:0;border-radius:inherit;padding:2px;pointer-events:none;background:conic-gradient(from 180deg,var(--button-trace-color) 0deg var(--button-trace),transparent var(--button-trace) calc(360deg - var(--button-trace)),var(--button-trace-color) calc(360deg - var(--button-trace)) 360deg);-webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);-webkit-mask-composite:xor;mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);mask-composite:exclude;--button-trace:0deg;transition:--button-trace .45s ease-in-out}.hero-button:hover::after,.hero-button:focus-visible::after{--button-trace:180deg}
.hero-button--primary{--button-trace-color:#6f68f5;min-width:200px;color:#fff;background:#111632}.hero-button--primary span{font-size:1.55rem}.hero-button--secondary{--button-trace-color:#111632;color:#29225f;background:#f3f0ff}.hero-button--secondary span{color:#6c5ce7;font-size:1.25rem}
.skills-marquee{width:100%;margin-top:44px;padding-block:2px;overflow:hidden;cursor:grab;touch-action:pan-y;user-select:none;mask-image:linear-gradient(to right,transparent,#000 5%,#000 95%,transparent);-webkit-mask-image:linear-gradient(to right,transparent,#000 5%,#000 95%,transparent)}.skills-marquee.is-dragging{cursor:grabbing}
.skills-track{display:flex;width:max-content;will-change:transform}.skills{display:flex;flex-wrap:nowrap;gap:12px;margin:0;padding:0 12px 0 0;list-style:none}.skills li{min-height:41px;padding:0 15px;border:1px solid #dce0eb;border-radius:10px;display:inline-flex;align-items:center;gap:8px;color:#444b62;font-size:.94rem;white-space:nowrap;flex:0 0 auto}
.skills :deep(.brand-icon){width:20px;height:20px;color:#080b16}.skills li:nth-child(2) :deep(.brand-icon),.skills li:nth-child(3) :deep(.brand-icon){border-radius:2px}
@property --button-trace{syntax:'<angle>';inherits:false;initial-value:0deg}
.social-links{display:flex;flex-wrap:wrap;gap:38px;margin-top:48px}.social-links a{position:relative;display:inline-flex;align-items:center;gap:10px;padding-bottom:7px;color:#293049;font-size:.9rem;font-weight:600}.social-links a::after{content:"";position:absolute;left:0;bottom:0;width:100%;height:2px;border-radius:999px;background:currentColor;transform:scaleX(0);transform-origin:left;transition:transform .2s ease-out}.social-links a:hover::after,.social-links a:focus-visible::after{transform:scaleX(1)}
.social-links :deep(.brand-icon){width:22px;height:22px;color:#080b16}
.portrait-column{display:flex;align-items:center;justify-content:center}.portrait-panel{position:relative;isolation:isolate;width:min(145.6%,910px);aspect-ratio:1.08}.portrait-frame,.portrait-crop{position:absolute;inset:8% 2% 2%;transform:rotate(4deg);transform-origin:center}.portrait-frame{z-index:0;border-radius:15%;background:linear-gradient(135deg,#f4f2ff 0%,#eeecff 100%)}.portrait-panel img{position:absolute;z-index:1;left:50%;bottom:0;width:109.2%;max-height:129.6%;object-fit:contain;object-position:center bottom;transform:translateX(-50%)}.portrait-crop{z-index:2;pointer-events:none}.portrait-crop::after{content:attr(data-mask);position:absolute;top:calc(100% - 1px);left:-25%;width:150%;height:35%;background:#fff}
@media(max-width:900px){.home-hero{grid-template-columns:1fr;min-height:auto;gap:64px;padding-top:72px}.hero-copy{max-width:680px}.portrait-column{grid-row:1}.portrait-panel{width:min(130%,676px)}}
@media(max-width:540px){.home-hero{padding:42px 20px;gap:48px}.portrait-panel{width:111.8%}.eyebrow{margin-bottom:18px}h1{font-size:clamp(2.97rem,14.4vw,4.32rem)}.name-link{white-space:normal}.name-hint{right:0;bottom:calc(100% + 10px);font-size:.66rem}.name-hint svg{width:36px}.summary{margin-top:22px;line-height:1.6}.hero-actions{display:grid}.hero-button{width:100%}.skills-marquee{margin-top:32px}.social-links{margin-top:36px;gap:24px}}
@media(prefers-reduced-motion:reduce){.name-link::after{transition:none}.skills-marquee{mask-image:none;-webkit-mask-image:none}}
@media(prefers-reduced-motion:reduce){.hero-button::after{transition:none}}
</style>
