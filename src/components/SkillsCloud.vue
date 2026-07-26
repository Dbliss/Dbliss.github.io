<template>
  <section class="skills-explorer" aria-labelledby="skills-title">
    <header class="skills-heading">
      <div class="skills-heading-copy">
        <h2 id="skills-title">My skillset</h2>
        <p class="skills-intro">
          A visual map of the technologies, tools<br />
          and concepts I work with.
        </p>
      </div>

      <div class="filter-bar" aria-label="Filter skills by type">
        <button
          v-for="category in categories"
          :key="category.id"
          type="button"
          class="filter-chip"
          :class="{ active: activeFilter === category.id }"
          :style="{ '--filter-color': category.color }"
          :aria-pressed="activeFilter === category.id"
          @mouseenter="showFilter(category.id)"
          @mouseleave="clearFilter"
          @focus="showFilter(category.id)"
          @blur="clearFilter"
        >
          <span class="filter-label"><i aria-hidden="true"></i>{{ category.title }}</span>
        </button>
      </div>
    </header>

    <div
      ref="skillStage"
      class="skill-stage"
      :class="{
        'has-selection': selectedSkill,
        'needs-shift': detailNeedsShift,
        'detail-left': selectedSkillSide === 'left',
        'detail-right': selectedSkillSide === 'right'
      }"
      :style="detailLayoutStyle"
    >
      <div
        ref="sphereCanvas"
        class="sphere-canvas"
        :class="{ dragging: isDragging, filtered: activeFilter !== 'all', focused: selectedSkillId }"
        role="group"
        tabindex="0"
        aria-label="Interactive sphere of professional skills. Drag or use arrow keys to rotate."
        @pointerdown="startDrag"
        @pointermove="dragSphere"
        @pointerup="endDrag"
        @pointercancel="endDrag"
        @keydown="handleKeydown"
      >
        <canvas ref="linkCanvas" class="link-layer" aria-hidden="true"></canvas>

        <button
          v-for="(skill, index) in allSkills"
          :key="skill.id"
          :ref="element => setSkillElement(element, index)"
          type="button"
          class="skill-node"
          :class="{
            selected: selectedSkillId === skill.id,
            linked: connectedSkillIds.has(skill.id),
            muted: isSkillMuted(skill)
          }"
          :style="{ '--node-color': skill.color }"
          :aria-label="`${skill.label}, ${skill.categoryTitle}`"
          :aria-pressed="selectedSkillId === skill.id"
          @pointerdown.stop="startDrag($event, skill.id)"
          @pointerenter="hoveredSkillId = skill.id"
          @pointerleave="hoveredSkillId = null"
          @focus="hoveredSkillId = skill.id"
          @blur="hoveredSkillId = null"
          @click.stop="activateSkillFromClick($event, skill.id)"
        >
          <span class="node-glyph">
            <BrandIcon v-if="homeIcon(skill.label)" :name="homeIcon(skill.label)" />
            <SkillIcon v-else :name="skillIcon(skill.label)" />
          </span>
          <span>{{ skill.label }}</span>
        </button>
      </div>

      <div class="sphere-controls" aria-label="Sphere rotation controls">
        <label class="rotation-speed">
          <span class="speed-icon" aria-hidden="true">🐢︎</span>
          <input
            v-model.number="rotationSpeed"
            type="range"
            min="0"
            max="2"
            step="0.1"
            :style="{ '--speed-progress': `${rotationSpeed * 50}%` }"
            aria-label="Sphere rotation speed"
          />
          <span class="speed-icon" aria-hidden="true">🐇︎</span>
        </label>

        <span class="control-divider" aria-hidden="true"></span>

        <div class="rotation-direction" aria-label="Rotation direction">
          <div class="direction-grid">
            <button
              v-for="direction in rotationDirections"
              :key="direction.id"
              type="button"
              :class="{ active: rotationDirection === direction.id }"
              :style="{ gridRow: direction.row, gridColumn: direction.column }"
              :aria-label="`Rotate ${direction.label}`"
              :aria-pressed="rotationDirection === direction.id"
              @click="rotationDirection = direction.id"
            >
              {{ direction.arrow }}
            </button>
            <span class="direction-centre" aria-hidden="true"></span>
          </div>
        </div>
      </div>

      <article
        v-if="selectedSkill"
        class="skill-detail"
        :style="{ '--detail-color': selectedSkill.color }"
        aria-live="polite"
      >
        <header class="skill-detail-heading">
          <div>
            <p><span aria-hidden="true"></span>{{ selectedSkill.categoryTitle }}</p>
            <h3>{{ selectedSkill.label }}</h3>
          </div>
          <button type="button" class="detail-close" aria-label="Close skill details" @click="clearSelection">×</button>
        </header>

        <p class="skill-description">{{ selectedSkillDescription }}</p>

        <section class="experience-section" aria-labelledby="skill-experience-title">
          <h4 id="skill-experience-title">Applied in</h4>
          <div v-if="selectedExperiences.length" class="experience-scroll">
            <div class="experience-list">
              <RouterLink
                v-for="experience in selectedExperiences"
                :key="experience.key"
                :to="experience.to"
                class="experience-link"
              >
                <span class="experience-marker" aria-hidden="true"></span>
                <span class="experience-content">
                  <strong>{{ experience.title }}</strong>
                  <span>{{ experience.description }}</span>
                  <small>{{ experience.type }}</small>
                </span>
                <b aria-hidden="true">›</b>
              </RouterLink>
            </div>
          </div>
          <p v-else class="evidence-empty">
            No documented project or employment example is linked to this skill yet.
          </p>
        </section>
      </article>
    </div>
  </section>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import SkillIcon from './SkillIcon.vue'
import BrandIcon from './BrandIcon.vue'
import { projects } from '../data/projects'
import { projectSkillMap, skillDescriptions, skillRoles } from '../data/skillEvidence'

const categories = [
  {
    id: 'code',
    number: 1,
    title: 'Code',
    color: '#6554ee',
    icon: 'code',
    skills: ['Python', 'TypeScript', 'JavaScript', 'C++', 'SQL', 'Algorithms']
  },
  {
    id: 'web',
    number: 2,
    title: 'Web',
    color: '#397fd1',
    icon: 'browser',
    skills: [
      'Vue.js', 'HTML', 'CSS', 'Vite', 'Three.js', 'WebGL',
      'FastAPI', 'Node.js', 'REST APIs', 'OpenAPI', 'Multithreading',
      'Rate Limiting', 'Caching', 'API Versioning',
      'OAuth 2.0', 'SAML', 'JWT', 'Audit Logging'
    ]
  },
  {
    id: 'cloud',
    number: 3,
    title: 'Cloud',
    color: '#56853c',
    icon: 'cloud',
    skills: [
      'AWS', 'AWS EC2', 'AWS S3', 'AWS RDS', 'AWS Route 53',
      'AWS VPC', 'AWS IAM', 'AWS Lambda', 'Docker', 'Linux', 'Nginx',
      'Gunicorn', 'Systemd', 'DNS', 'TCP/IP', 'Reverse Proxies', 'TLS/SSL',
      'Git', 'GitHub', 'CI/CD', 'GitHub Actions', 'Logging', 'Monitoring',
      'Health Checks', 'Alerting'
    ]
  },
  {
    id: 'data',
    number: 4,
    title: 'Data',
    color: '#d45d87',
    icon: 'brain',
    skills: [
      'PostgreSQL', 'SQLite', 'Redis', 'Schema Design', 'Alembic',
      'Pandas', 'NumPy', 'scikit-learn', 'Bayesian', 'Monte Carlo',
      'Random Forests', 'Regression', 'Classification', 'Clustering',
      'Web scraping', 'Data Cleaning', 'MQTT', 'Edge Computing',
      'Raspberry Pi', 'Sensor Fusion', 'Metering', 'Control Systems',
      'Fault Detection'
    ]
  },
  {
    id: 'delivery',
    number: 5,
    title: 'Delivery',
    color: '#c7584d',
    icon: 'people',
    skills: [
      'System Design', 'Unit Testing', 'Integration Testing', 'Test Automation',
      'Code Review', 'Specifications', 'Documentation', 'Mentoring',
      'Scrum', 'Kanban', 'Public speaking'
    ]
  }
]

const allSkills = categories
  .flatMap((category, categoryIndex) =>
    category.skills.map((label, skillIndex) => ({
      id: `${category.id}-${skillIndex}`,
      label,
      categoryId: category.id,
      categoryTitle: category.title,
      color: category.color,
      distributionOrder: (skillIndex + 0.5) / category.skills.length + categoryIndex * 0.0001
    }))
  )
  .sort((a, b) => a.distributionOrder - b.distributionOrder)
  .map(({ distributionOrder, ...skill }) => skill)
const skillByLabel = new Map(allSkills.map(skill => [skill.label, skill]))
const skillById = new Map(allSkills.map(skill => [skill.id, skill]))
const skillIndexById = new Map(allSkills.map((skill, index) => [skill.id, index]))

const connectionPairs = [
  ['Python', 'Algorithms'], ['Python', 'FastAPI'], ['Python', 'Pandas'], ['Python', 'Web scraping'],
  ['C++', 'Algorithms'], ['C++', 'Control Systems'],
  ['JavaScript', 'TypeScript'], ['JavaScript', 'Vue.js'], ['JavaScript', 'Node.js'], ['JavaScript', 'Three.js'],
  ['TypeScript', 'Vue.js'], ['TypeScript', 'Node.js'], ['SQL', 'PostgreSQL'], ['SQL', 'SQLite'],

  ['Vue.js', 'HTML'], ['Vue.js', 'CSS'], ['Vue.js', 'Vite'], ['Vite', 'TypeScript'],
  ['Three.js', 'WebGL'], ['Three.js', 'Vue.js'],

  ['FastAPI', 'REST APIs'], ['FastAPI', 'OpenAPI'], ['FastAPI', 'Gunicorn'],
  ['Node.js', 'REST APIs'],
  ['REST APIs', 'OpenAPI'], ['REST APIs', 'API Versioning'], ['REST APIs', 'Rate Limiting'],
  ['Multithreading', 'Redis'], ['Multithreading', 'Python'], ['Rate Limiting', 'Caching'],
  ['Caching', 'Redis'],

  ['PostgreSQL', 'Schema Design'], ['SQLite', 'Schema Design'],
  ['Alembic', 'FastAPI'], ['AWS RDS', 'PostgreSQL'],

  ['AWS', 'AWS EC2'], ['AWS', 'AWS S3'], ['AWS', 'AWS RDS'],
  ['AWS', 'AWS Route 53'], ['AWS', 'AWS VPC'], ['AWS', 'AWS IAM'],
  ['AWS', 'AWS Lambda'],
  ['AWS EC2', 'AWS VPC'], ['AWS EC2', 'Docker'], ['AWS EC2', 'Linux'],
  ['AWS RDS', 'AWS VPC'],
  ['AWS Route 53', 'DNS'],
  ['DNS', 'TCP/IP'], ['DNS', 'TLS/SSL'], ['Linux', 'Nginx'], ['Linux', 'Systemd'],
  ['Nginx', 'Gunicorn'], ['Nginx', 'Reverse Proxies'], ['Nginx', 'TLS/SSL'],
  ['Reverse Proxies', 'TLS/SSL'],

  ['Git', 'GitHub'], ['Git', 'Code Review'], ['GitHub', 'GitHub Actions'],
  ['GitHub', 'Code Review'], ['CI/CD', 'GitHub Actions'], ['CI/CD', 'Test Automation'],
  ['Logging', 'Monitoring'], ['Logging', 'Audit Logging'],
  ['Monitoring', 'Health Checks'], ['Monitoring', 'Alerting'],

  ['OAuth 2.0', 'JWT'], ['OAuth 2.0', 'SAML'],
  ['JWT', 'FastAPI'], ['JWT', 'Node.js'],

  ['Pandas', 'NumPy'], ['Pandas', 'Data Cleaning'], ['Pandas', 'scikit-learn'],
  ['Pandas', 'Web scraping'], ['NumPy', 'scikit-learn'],
  ['scikit-learn', 'Random Forests'], ['scikit-learn', 'Regression'],
  ['scikit-learn', 'Classification'], ['scikit-learn', 'Clustering'],
  ['Random Forests', 'Classification'], ['Random Forests', 'Regression'],
  ['Bayesian', 'Monte Carlo'], ['Web scraping', 'Data Cleaning'],

  ['MQTT', 'Edge Computing'],
  ['Edge Computing', 'Raspberry Pi'], ['Raspberry Pi', 'Sensor Fusion'],
  ['Raspberry Pi', 'Control Systems'], ['Sensor Fusion', 'Control Systems'],
  ['Sensor Fusion', 'Fault Detection'], ['Metering', 'Fault Detection'],

  ['Unit Testing', 'Integration Testing'], ['Unit Testing', 'Test Automation'],
  ['Integration Testing', 'Test Automation'], ['Test Automation', 'CI/CD'],
  ['Code Review', 'Unit Testing'], ['Code Review', 'Mentoring'],

  ['Specifications', 'Documentation'],
  ['Mentoring', 'Public speaking'],
  ['Scrum', 'Kanban']
]

const links = connectionPairs.flatMap(([fromLabel, toLabel]) => {
  const from = skillByLabel.get(fromLabel)
  const to = skillByLabel.get(toLabel)
  if (!from || !to) return []
  return [{
    from: from.id,
    to: to.id,
    fromIndex: skillIndexById.get(from.id),
    toIndex: skillIndexById.get(to.id),
    key: `${from.id}-${to.id}`
  }]
})

const linksBySkillId = new Map()
links.forEach(link => {
  for (const id of [link.from, link.to]) {
    const existing = linksBySkillId.get(id)
    if (existing) existing.push(link)
    else linksBySkillId.set(id, [link])
  }
})

const activeFilter = ref('all')
const selectedSkillId = ref(null)
const selectedSkillSide = ref(null)
const rotationSpeed = ref(1)
const rotationDirection = ref('NE')
const detailNeedsShift = ref(false)
const detailWidth = ref(350)
const detailLeftOffset = ref(0)
const detailRightOffset = ref(0)
const sphereShift = ref(0)
const hoveredSkillId = ref(null)
const skillStage = ref(null)
const sphereCanvas = ref(null)
const linkCanvas = ref(null)
const isDragging = ref(false)
const prefersReducedMotion = ref(false)
const skillElements = []
// Last value written to each node, so unchanged frames skip the DOM entirely.
const nodeTransforms = new Array(allSkills.length).fill('')
const nodeLayers = new Int32Array(allSkills.length).fill(-1)
const nodeDepths = new Int32Array(allSkills.length).fill(-1)
let linkContext = null
let linksAreDrawn = false
let pointerId
let pointerX = 0
let pointerY = 0
let dragDistance = 0
let pressedSkillId = null
let animationFrame
let lastFrame = 0
let lastRenderFrame = 0
let resizeObserver
let visibilityObserver
let canvasWidth = 1000
let canvasHeight = 700
let sphereIsVisible = true
let pageIsVisible = true
let pendingDragX = 0
let pendingDragY = 0
let renderNeeded = true
const RENDER_INTERVAL = 1000 / 30
const DIAGONAL = 1 / Math.sqrt(2)
const rotationDirections = [
  { id: 'NW', label: 'north west', arrow: '↖', x: DIAGONAL, y: DIAGONAL, row: 1, column: 1 },
  { id: 'N', label: 'north', arrow: '↑', x: 1, y: 0, row: 1, column: 2 },
  { id: 'NE', label: 'north east', arrow: '↗', x: DIAGONAL, y: -DIAGONAL, row: 1, column: 3 },
  { id: 'W', label: 'west', arrow: '←', x: 0, y: 1, row: 2, column: 1 },
  { id: 'E', label: 'east', arrow: '→', x: 0, y: -1, row: 2, column: 3 },
  { id: 'SW', label: 'south west', arrow: '↙', x: -DIAGONAL, y: DIAGONAL, row: 3, column: 1 },
  { id: 'S', label: 'south', arrow: '↓', x: -1, y: 0, row: 3, column: 2 },
  { id: 'SE', label: 'south east', arrow: '↘', x: -DIAGONAL, y: -DIAGONAL, row: 3, column: 3 }
]
const rotationDirectionById = new Map(rotationDirections.map(option => [option.id, option]))
const sphereRotation = new Float64Array(9)
const axisMatrix = new Float64Array(9)
const rotationProduct = new Float64Array(9)
sphereRotation.set(axisRotationMatrix(0, 1, 0, 0.35, rotationProduct))
rotateSphere(1, 0, -0.12)

const selectedSkill = computed(() => skillById.get(selectedSkillId.value))
const rotationSpeedMultiplier = computed(() =>
  rotationSpeed.value <= 1
    ? rotationSpeed.value
    : 1 + (rotationSpeed.value - 1) * 4
)
const detailLayoutStyle = computed(() => ({
  '--detail-width': `${detailWidth.value}px`,
  '--detail-left-offset': `${detailLeftOffset.value}px`,
  '--detail-right-offset': `${detailRightOffset.value}px`,
  '--sphere-shift': `${sphereShift.value}px`
}))
const selectedSkillDescription = computed(() =>
  skillDescriptions[selectedSkill.value?.label] ||
  `${selectedSkill.value?.label} is part of my ${selectedSkill.value?.categoryTitle.toLowerCase()} toolkit.`
)
const selectedProjectEvidence = computed(() => {
  const label = selectedSkill.value?.label
  if (!label) return []
  return projects.filter(project => projectSkillMap[project.slug]?.includes(label))
})
const selectedRoleEvidence = computed(() => {
  const label = selectedSkill.value?.label
  if (!label) return []
  return skillRoles.filter(role => role.skills.includes(label))
})
const selectedExperiences = computed(() => [
  ...selectedProjectEvidence.value.map(project => ({
    key: `project-${project.slug}`,
    title: project.title,
    description: project.tagline || project.excerpt,
    type: project.category,
    to: `/projects/${project.slug}`
  })),
  ...selectedRoleEvidence.value.map(role => ({
    key: `role-${role.id}`,
    title: role.title,
    description: role.organisation,
    type: 'Employment',
    to: { name: 'about', hash: `#experience-${role.id}` }
  }))
])
const activeConnectionSkillId = computed(() =>
  selectedSkillId.value || hoveredSkillId.value
)
const connectedSkillIds = computed(() => {
  const result = new Set()
  const activeId = activeConnectionSkillId.value
  if (!activeId) return result
  result.add(activeId)
  linksBySkillId.get(activeId)?.forEach(link => {
    result.add(link.from === activeId ? link.to : link.from)
  })
  return result
})
watch([hoveredSkillId, selectedSkillId], () => {
  renderNeeded = true
})

function showFilter(id) {
  activeFilter.value = id
  selectedSkillId.value = null
  selectedSkillSide.value = null
  detailNeedsShift.value = false
  hoveredSkillId.value = null
}

function clearFilter() {
  activeFilter.value = 'all'
  hoveredSkillId.value = null
}

function clearSelection() {
  selectedSkillId.value = null
  selectedSkillSide.value = null
  detailNeedsShift.value = false
}

function selectSkill(id) {
  if (selectedSkillId.value === id) {
    selectedSkillId.value = null
    selectedSkillSide.value = null
    detailNeedsShift.value = false
    return
  }
  selectedSkillId.value = id
  positionDetailBesideSkill(id)
}

function activateSkillFromClick(event, id) {
  if (event.detail === 0) selectSkill(id)
}

function setSkillElement(element, index) {
  skillElements[index] = element
}

function isSkillMuted(skill) {
  if (activeConnectionSkillId.value) return !connectedSkillIds.value.has(skill.id)
  return activeFilter.value !== 'all' && skill.categoryId !== activeFilter.value
}

const homeIconMap = {
  Python: 'python',
  JavaScript: 'javascript',
  TypeScript: 'typescript',
  SQL: 'sql',
  AWS: 'aws',
  Docker: 'docker',
  Git: 'git',
  GitHub: 'github',
  'CI/CD': 'cicd',
  'GitHub Actions': 'cicd',
  'REST APIs': 'api',
  'AWS EC2': 'aws',
  'AWS S3': 'aws',
  'AWS RDS': 'aws',
  'AWS Route 53': 'aws',
  'AWS VPC': 'aws',
  'AWS IAM': 'aws',
  'AWS Lambda': 'aws',
  'Edge Computing': 'iot'
}

function homeIcon(skill) {
  return homeIconMap[skill] || null
}

function skillIcon(skill) {
  const value = skill.toLowerCase()
  if (value.includes('python')) return 'python'
  if (value.includes('javascript')) return 'javascript'
  if (value.includes('typescript')) return 'typescript'
  if (value.includes('c++')) return 'cplusplus'
  if (value.includes('vue')) return 'vue'
  if (value === 'html') return 'html5'
  if (value === 'css') return 'css'
  if (value === 'vite') return 'vite'
  if (value.includes('three')) return 'threejs'
  if (value.includes('fastapi')) return 'fastapi'
  if (value.includes('node.js')) return 'nodejs'
  if (value.includes('openapi')) return 'openapi'
  if (value.includes('postgresql')) return 'postgresql'
  if (value === 'sqlite') return 'sqlite'
  if (value === 'redis') return 'redis'
  if (value === 'pandas') return 'pandas'
  if (value === 'numpy') return 'numpy'
  if (value.includes('scikit')) return 'scikitlearn'
  if (value === 'mqtt') return 'mqtt'
  if (value.includes('raspberry')) return 'raspberrypi'
  if (value === 'linux') return 'linux'
  if (value.includes('nginx')) return 'nginx'
  if (value.includes('docker')) return 'docker'
  if (value.includes('database') || value.includes('sql') || value.includes('redis') || value.includes('alembic')) return 'database'
  if (value.includes('aws') || value.includes('cloud')) return 'cloud'
  if (value.includes('api') || value.includes('webhook')) return 'api'
  if (value.includes('auth') || value.includes('security') || value.includes('oauth') || value.includes('saml') || value.includes('jwt') || value.includes('identity')) return 'shield'
  if (value.includes('test') || value.includes('quality') || value.includes('verification')) return 'test'
  if (value.includes('data') || value.includes('pandas') || value.includes('numpy') || value.includes('regression') || value.includes('classification') || value.includes('clustering') || value.includes('bayesian') || value.includes('monte carlo')) return 'chart'
  if (value.includes('machine') || value.includes('forest') || value.includes('scikit')) return 'brain'
  if (value.includes('architecture') || value.includes('design') || value.includes('specification')) return 'blueprint'
  if (value.includes('monitor') || value.includes('observ') || value.includes('health') || value.includes('alert')) return 'speed'
  if (value.includes('linux') || value.includes('nginx') || value.includes('gunicorn') || value.includes('systemd')) return 'terminal'
  if (value.includes('iot') || value.includes('mqtt') || value.includes('telemetry') || value.includes('sensor')) return 'signal'
  if (value.includes('raspberry') || value.includes('edge computing')) return 'chip'
  if (value.includes('git') || value.includes('delivery') || value.includes('agile') || value.includes('scrum') || value.includes('kanban')) return 'cycle'
  if (value.includes('management') || value.includes('schedule') || value.includes('planning')) return 'calendar'
  if (value.includes('mentor') || value.includes('stakeholder') || value.includes('client') || value.includes('cross-functional')) return 'people'
  if (value.includes('writing') || value.includes('presentation') || value.includes('speaking') || value.includes('documentation')) return 'speech'
  if (value.includes('html') || value.includes('css') || value.includes('vite') || value.includes('webgl')) return 'browser'
  if (value.includes('three')) return 'cube'
  if (value.includes('rate') || value.includes('caching') || value.includes('multithread')) return 'lightning'
  if (value.includes('server') || value.includes('microservice') || value.includes('proxy')) return 'server'
  return 'code'
}

const skillCount = allSkills.length
// Flat buffers keep the per-frame maths allocation free.
const spherePoints = new Float64Array(skillCount * 3)
const projections = new Float64Array(skillCount * 2)

for (let index = 0; index < skillCount; index += 1) {
  const goldenAngle = Math.PI * (3 - Math.sqrt(5))
  const y = 1 - (2 * (index + 0.5)) / skillCount
  const radius = Math.sqrt(1 - y * y)
  const angle = index * goldenAngle
  spherePoints[index * 3] = Math.cos(angle) * radius
  spherePoints[index * 3 + 1] = y
  spherePoints[index * 3 + 2] = Math.sin(angle) * radius
}

function projectPoint(index) {
  const offset = index * 3
  const pointX = spherePoints[offset]
  const pointY = spherePoints[offset + 1]
  const pointZ = spherePoints[offset + 2]
  const x = sphereRotation[0] * pointX + sphereRotation[1] * pointY + sphereRotation[2] * pointZ
  const y = sphereRotation[3] * pointX + sphereRotation[4] * pointY + sphereRotation[5] * pointZ
  const z = sphereRotation[6] * pointX + sphereRotation[7] * pointY + sphereRotation[8] * pointZ
  const perspective = 1 / (1.18 - z * 0.25)
  return {
    x: x * perspective,
    y: y * perspective,
    z,
    scale: 0.78 + (z + 1) * 0.16
  }
}

function multiplyRotationMatrices(left, right, target) {
  for (let row = 0; row < 3; row += 1) {
    for (let column = 0; column < 3; column += 1) {
      target[row * 3 + column] =
        left[row * 3] * right[column] +
        left[row * 3 + 1] * right[3 + column] +
        left[row * 3 + 2] * right[6 + column]
    }
  }
  return target
}

function axisRotationMatrix(axisX, axisY, axisZ, angle, target) {
  const length = Math.hypot(axisX, axisY, axisZ) || 1
  const x = axisX / length
  const y = axisY / length
  const z = axisZ / length
  const cosine = Math.cos(angle)
  const sine = Math.sin(angle)
  const inverseCosine = 1 - cosine
  target[0] = cosine + x * x * inverseCosine
  target[1] = x * y * inverseCosine - z * sine
  target[2] = x * z * inverseCosine + y * sine
  target[3] = y * x * inverseCosine + z * sine
  target[4] = cosine + y * y * inverseCosine
  target[5] = y * z * inverseCosine - x * sine
  target[6] = z * x * inverseCosine - y * sine
  target[7] = z * y * inverseCosine + x * sine
  target[8] = cosine + z * z * inverseCosine
  return target
}

function rotateSphere(axisX, axisY, angle) {
  if (!angle) return
  axisRotationMatrix(axisX, axisY, 0, angle, axisMatrix)
  multiplyRotationMatrices(axisMatrix, sphereRotation, rotationProduct)
  sphereRotation.set(rotationProduct)
}

function updateDetailLayout() {
  if (!skillStage.value || !selectedSkillSide.value) return

  const bounds = skillStage.value.getBoundingClientRect()
  const viewportWidth = window.innerWidth
  const viewportEdge = 20
  const sphereGap = 18
  const minimumPanelWidth = 250
  const maximumPanelWidth = 360
  const sphereRadius = Math.min(bounds.width * 0.42, bounds.height * 0.43)
  const sphereOuterRadius = sphereRadius * 1.08 + 82
  const sphereCenter = bounds.left + bounds.width / 2
  const panelIsRight = selectedSkillSide.value === 'right'
  const availableSpace = panelIsRight
    ? viewportWidth - viewportEdge - (sphereCenter + sphereOuterRadius + sphereGap)
    : sphereCenter - sphereOuterRadius - sphereGap - viewportEdge

  detailNeedsShift.value = availableSpace < minimumPanelWidth
  const panelWidth = detailNeedsShift.value
    ? Math.min(340, viewportWidth - 32)
    : Math.min(maximumPanelWidth, availableSpace)
  const adjacentOffset = bounds.width / 2 - sphereOuterRadius - sphereGap - panelWidth
  const currentSideBoundary = bounds.width / 2 - sphereOuterRadius

  detailWidth.value = panelWidth
  detailLeftOffset.value = detailNeedsShift.value ? 0 : adjacentOffset
  detailRightOffset.value = detailNeedsShift.value ? 0 : adjacentOffset
  sphereShift.value = detailNeedsShift.value
    ? Math.max(0, panelWidth + sphereGap - currentSideBoundary)
    : 0
}

function positionDetailBesideSkill(id) {
  const index = skillIndexById.get(id)
  if (index === undefined) return

  const projected = projectPoint(index)
  selectedSkillSide.value = projected.x < 0 ? 'left' : 'right'
  updateDetailLayout()
}

function renderSphere() {
  if (!sphereCanvas.value) return
  const radius = Math.min(canvasWidth * 0.42, canvasHeight * 0.43)
  const centerX = canvasWidth / 2
  const centerY = canvasHeight * 0.49
  const m0 = sphereRotation[0], m1 = sphereRotation[1], m2 = sphereRotation[2]
  const m3 = sphereRotation[3], m4 = sphereRotation[4], m5 = sphereRotation[5]
  const m6 = sphereRotation[6], m7 = sphereRotation[7], m8 = sphereRotation[8]

  for (let index = 0; index < skillCount; index += 1) {
    const offset = index * 3
    const pointX = spherePoints[offset]
    const pointY = spherePoints[offset + 1]
    const pointZ = spherePoints[offset + 2]
    const z = m6 * pointX + m7 * pointY + m8 * pointZ
    const perspective = 1 / (1.18 - z * 0.25)
    const screenX = centerX + (m0 * pointX + m1 * pointY + m2 * pointZ) * perspective * radius
    const screenY = centerY + (m3 * pointX + m4 * pointY + m5 * pointZ) * perspective * radius
    projections[index * 2] = screenX
    projections[index * 2 + 1] = screenY

    const element = skillElements[index]
    if (!element) continue

    // Every style write costs a recalc, so only touch what actually changed.
    const scale = Math.round((0.78 + (z + 1) * 0.16) * 1000) / 1000
    const transform =
      `translate3d(${Math.round(screenX * 10) / 10}px,${Math.round(screenY * 10) / 10}px,0)` +
      ` translate(-50%,-50%) scale(${scale})`
    if (transform !== nodeTransforms[index]) {
      element.style.transform = transform
      nodeTransforms[index] = transform
    }

    const layer = Math.round((z + 1) * 30) + 10
    if (layer !== nodeLayers[index]) {
      element.style.zIndex = String(layer)
      nodeLayers[index] = layer
    }

    // Quantised to 0.02 steps: imperceptible, but skips most custom-property writes,
    // each of which would otherwise invalidate the node's whole subtree.
    const depthStep = Math.round(Math.max(0.42, 0.68 + z * 0.3) * 50)
    if (depthStep !== nodeDepths[index]) {
      element.style.setProperty('--depth-opacity', String(depthStep / 50))
      nodeDepths[index] = depthStep
    }
  }

  drawLinks()
}

function drawLinks() {
  if (!linkContext) return

  const activeSkillId = activeConnectionSkillId.value
  const activeLinks = activeSkillId ? linksBySkillId.get(activeSkillId) : null
  if (!activeLinks) {
    if (linksAreDrawn) {
      linkContext.clearRect(0, 0, canvasWidth, canvasHeight)
      linksAreDrawn = false
    }
    return
  }

  linkContext.clearRect(0, 0, canvasWidth, canvasHeight)
  linkContext.beginPath()
  activeLinks.forEach(link => {
    linkContext.moveTo(projections[link.fromIndex * 2], projections[link.fromIndex * 2 + 1])
    linkContext.lineTo(projections[link.toIndex * 2], projections[link.toIndex * 2 + 1])
  })
  linkContext.globalAlpha = 0.85
  linkContext.strokeStyle = skillById.get(activeSkillId)?.color || '#6554ee'
  linkContext.lineWidth = 2.2
  linkContext.setLineDash([8, 7])
  linkContext.stroke()
  linkContext.setLineDash([])
  linkContext.globalAlpha = 1
  linksAreDrawn = true
}

function startDrag(event, skillId = null) {
  if (event.button !== undefined && event.button !== 0) return
  pressedSkillId = skillId
  pointerId = event.pointerId
  pointerX = event.clientX
  pointerY = event.clientY
  pendingDragX = 0
  pendingDragY = 0
  dragDistance = 0
  isDragging.value = true
  sphereCanvas.value?.setPointerCapture(event.pointerId)
}

function dragSphere(event) {
  if (!isDragging.value || event.pointerId !== pointerId) return
  const deltaX = event.clientX - pointerX
  const deltaY = event.clientY - pointerY
  dragDistance += Math.hypot(deltaX, deltaY)
  pendingDragX += deltaX
  pendingDragY += deltaY
  pointerX = event.clientX
  pointerY = event.clientY
}

function endDrag(event) {
  if (event.pointerId !== pointerId) return
  const wasDrag = dragDistance > 6
  const wasCancelled = event.type === 'pointercancel'
  const skillToSelect = !wasDrag && !wasCancelled ? pressedSkillId : null
  const shouldClearSelection = !wasDrag && !wasCancelled && !pressedSkillId
  if (pendingDragX || pendingDragY) {
    rotateSphere(0, -1, pendingDragX * 0.006)
    rotateSphere(-1, 0, pendingDragY * 0.005)
    pendingDragX = 0
    pendingDragY = 0
    renderNeeded = true
  }
  isDragging.value = false
  if (sphereCanvas.value?.hasPointerCapture(event.pointerId)) {
    sphereCanvas.value.releasePointerCapture(event.pointerId)
  }
  pointerId = undefined
  pressedSkillId = null

  if (skillToSelect) selectSkill(skillToSelect)
  else if (shouldClearSelection) clearSelection()
}

function handleKeydown(event) {
  const step = event.shiftKey ? 0.2 : 0.1
  if (event.key === 'ArrowLeft') rotateSphere(0, 1, step)
  else if (event.key === 'ArrowRight') rotateSphere(0, -1, step)
  else if (event.key === 'ArrowUp') rotateSphere(1, 0, step)
  else if (event.key === 'ArrowDown') rotateSphere(-1, 0, step)
  else if (event.key === 'Escape') {
    selectedSkillId.value = null
    selectedSkillSide.value = null
    detailNeedsShift.value = false
    hoveredSkillId.value = null
    activeFilter.value = 'all'
    return
  } else return
  event.preventDefault()
  renderSphere()
  lastRenderFrame = performance.now()
}

function animate(time) {
  animationFrame = 0
  if (!sphereIsVisible || !pageIsVisible) return

  if (!lastFrame) lastFrame = time
  const elapsed = Math.min(time - lastFrame, 40)

  if (isDragging.value && (pendingDragX || pendingDragY)) {
    rotateSphere(0, -1, pendingDragX * 0.006)
    rotateSphere(-1, 0, pendingDragY * 0.005)
    pendingDragX = 0
    pendingDragY = 0
    renderNeeded = true
  }

  if (
    !isDragging.value &&
    !prefersReducedMotion.value &&
    !selectedSkillId.value &&
    !hoveredSkillId.value
  ) {
    const direction = rotationDirectionById.get(rotationDirection.value)
    const rotationStep = elapsed * 0.000084 * rotationSpeedMultiplier.value
    if (direction && rotationStep) {
      rotateSphere(direction.x, -direction.y, rotationStep)
      renderNeeded = true
    }
  }

  if (renderNeeded && time - lastRenderFrame >= RENDER_INTERVAL) {
    renderSphere()
    renderNeeded = false
    lastRenderFrame = time
  }
  lastFrame = time
  animationFrame = requestAnimationFrame(animate)
}

function startAnimation() {
  if (animationFrame) return
  lastFrame = 0
  animationFrame = requestAnimationFrame(animate)
}

function handlePageVisibility() {
  pageIsVisible = !document.hidden
  lastFrame = 0
  if (pageIsVisible) startAnimation()
}

function resizeLinkCanvas() {
  if (!linkCanvas.value) return
  const pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5)
  linkCanvas.value.width = Math.max(1, Math.round(canvasWidth * pixelRatio))
  linkCanvas.value.height = Math.max(1, Math.round(canvasHeight * pixelRatio))
  linkContext = linkCanvas.value.getContext('2d')
  linkContext?.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0)
  // Resizing the backing store wipes it.
  linksAreDrawn = false
}

onMounted(() => {
  prefersReducedMotion.value = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const initialBounds = sphereCanvas.value.getBoundingClientRect()
  canvasWidth = initialBounds.width
  canvasHeight = initialBounds.height
  resizeLinkCanvas()
  resizeObserver = new ResizeObserver(([entry]) => {
    canvasWidth = entry.contentRect.width
    canvasHeight = entry.contentRect.height
    resizeLinkCanvas()
    updateDetailLayout()
    renderNeeded = true
  })
  resizeObserver.observe(sphereCanvas.value)
  visibilityObserver = new IntersectionObserver(([entry]) => {
    sphereIsVisible = entry.isIntersecting
    lastFrame = 0
    renderNeeded = true
    if (sphereIsVisible) startAnimation()
  }, { rootMargin: '120px' })
  visibilityObserver.observe(sphereCanvas.value)
  document.addEventListener('visibilitychange', handlePageVisibility)
  window.addEventListener('resize', updateDetailLayout)
  renderSphere()
  renderNeeded = false
  lastRenderFrame = performance.now()
  startAnimation()
})

onBeforeUnmount(() => {
  cancelAnimationFrame(animationFrame)
  resizeObserver?.disconnect()
  visibilityObserver?.disconnect()
  document.removeEventListener('visibilitychange', handlePageVisibility)
  window.removeEventListener('resize', updateDetailLayout)
})
</script>

<style scoped>
.skills-explorer{
  width:100%;
  padding:80px 0 46px;
  color:#15142a;
}

.skills-heading{
  display:grid;
  grid-template-columns:minmax(250px,.72fr) minmax(520px,1.28fr);
  gap:clamp(48px,7vw,104px);
  align-items:center;
  margin-bottom:0;
}

.skills-heading h2{
  margin:0;
  font-size:clamp(1.8rem,2.6vw,2.35rem);
  line-height:1.08;
  letter-spacing:-.045em;
}

.skills-intro{
  margin:8px 0 0;
  color:#6f6a7f;
  font-size:.92rem;
  line-height:1.5;
}

.filter-bar{
  position:relative;
  display:grid;
  grid-template-columns:repeat(5,minmax(0,1fr));
  gap:0;
  width:100%;
  padding:0;
  overflow:visible;
}

.filter-bar button{
  position:relative;
  display:flex;
  flex-direction:column;
  align-items:center;
  justify-content:center;
  gap:8px;
  width:100%;
  min-height:62px;
  padding:8px 12px;
  border:1px solid transparent;
  border-radius:10px;
  color:#353047;
  background:transparent;
  font:inherit;
  font-size:.86rem;
  font-weight:780;
  cursor:pointer;
  transition:border-color 180ms ease,box-shadow 180ms ease,color 180ms ease,background 180ms ease;
}
.filter-label{
  display:flex;
  align-items:center;
  gap:8px;
  color:inherit;
}
.filter-chip i{width:11px;height:11px;flex:0 0 auto;border-radius:50%;background:var(--filter-color);box-shadow:0 0 0 3px color-mix(in srgb,var(--filter-color) 11%,transparent)}
.filter-bar button:hover,.filter-bar button:focus-visible{outline:none;color:#29253d;background:rgba(255,255,255,.55)}
.filter-chip.active{color:#29253d;background:color-mix(in srgb,var(--filter-color) 7%,white);border-color:color-mix(in srgb,var(--filter-color) 13%,transparent);box-shadow:0 6px 18px color-mix(in srgb,var(--filter-color) 7%,transparent)}

.skill-stage{
  position:relative;
  width:100%;
  height:700px;
  margin-top:-24px;
}
.skill-stage .skill-detail{
  position:absolute;
  top:50%;
  width:var(--detail-width);
  transform:translateY(-50%);
}
.skill-stage.detail-left .skill-detail{left:var(--detail-left-offset)}
.skill-stage.detail-right .skill-detail{right:var(--detail-right-offset)}
.skill-stage .sphere-canvas{transition:transform 420ms cubic-bezier(.2,.8,.2,1)}
.skill-stage.needs-shift{overflow:visible}
.skill-stage.needs-shift.detail-left .sphere-canvas{transform:translateX(var(--sphere-shift))}
.skill-stage.needs-shift.detail-right .sphere-canvas{transform:translateX(calc(-1 * var(--sphere-shift)))}
.skill-stage.needs-shift.detail-left .skill-detail{left:0}
.skill-stage.needs-shift.detail-right .skill-detail{right:0}

.sphere-canvas{
  position:relative;
  z-index:2;
  width:100%;
  height:100%;
  min-width:0;
  overflow:visible;
  isolation:isolate;
  perspective:1100px;
  border:0;
  border-radius:0;
  background:none;
  box-shadow:none;
  cursor:grab;
  touch-action:none;
  user-select:none;
}

.sphere-canvas.dragging{cursor:grabbing}
.sphere-canvas:focus-visible{outline:2px solid rgba(101,84,238,.5);outline-offset:5px}

.sphere-controls{
  position:absolute;
  z-index:90;
  left:50%;
  bottom:-34px;
  display:flex;
  align-items:center;
  gap:16px;
  padding:0;
  color:#706a7c;
  background:transparent;
  transform:translateX(-50%);
}
.rotation-speed{
  display:grid;
  grid-template-areas:
    "slow fast"
    "slider slider";
  grid-template-columns:1fr 1fr;
  align-items:center;
  gap:5px 0;
}
.rotation-speed input{
  grid-area:slider;
  width:142px;
  height:20px;
  margin:0;
  appearance:none;
  background:transparent;
  cursor:pointer;
}
.rotation-speed input::-webkit-slider-runnable-track{
  height:6px;
  border:1px solid rgba(101,84,238,.13);
  border-radius:999px;
  background:linear-gradient(
    to right,
    #7259ff 0,
    #7259ff var(--speed-progress),
    rgba(255,255,255,.86) var(--speed-progress),
    rgba(255,255,255,.86) 100%
  );
  box-shadow:inset 0 1px 2px rgba(44,35,102,.12);
}
.rotation-speed input::-webkit-slider-thumb{
  width:20px;
  height:20px;
  margin-top:-8px;
  appearance:none;
  border:4px solid #fff;
  border-radius:50%;
  background:#7259ff;
  box-shadow:0 2px 6px rgba(44,35,102,.35),0 0 0 1px rgba(101,84,238,.12);
}
.rotation-speed input::-moz-range-track{
  height:6px;
  border:1px solid rgba(101,84,238,.13);
  border-radius:999px;
  background:rgba(255,255,255,.86);
  box-shadow:inset 0 1px 2px rgba(44,35,102,.12);
}
.rotation-speed input::-moz-range-progress{
  height:6px;
  border-radius:999px;
  background:#7259ff;
}
.rotation-speed input::-moz-range-thumb{
  width:13px;
  height:13px;
  border:4px solid #fff;
  border-radius:50%;
  background:#7259ff;
  box-shadow:0 2px 6px rgba(44,35,102,.35),0 0 0 1px rgba(101,84,238,.12);
}
.rotation-speed input:focus-visible{
  outline:2px solid rgba(101,84,238,.4);
  outline-offset:3px;
  border-radius:999px;
}
.speed-icon{
  width:24px;
  color:#5d587c;
  font-family:"Segoe UI Symbol","Noto Sans Symbols 2",sans-serif;
  font-size:1.25rem;
  line-height:1;
  text-align:center;
  filter:grayscale(1) contrast(.8);
}
.speed-icon:first-child{
  grid-area:slow;
  justify-self:start;
  font-size:1.875rem;
}
.speed-icon:last-child{
  grid-area:fast;
  justify-self:end;
}
.control-divider{
  align-self:stretch;
  width:1px;
  min-height:72px;
  background:rgba(101,84,238,.18);
}
.rotation-direction{
  min-width:0;
}
.direction-grid{
  display:grid;
  grid-template-columns:repeat(3,32px);
  grid-template-rows:repeat(3,32px);
  gap:4px;
}
.direction-grid button{
  display:grid;
  width:32px;
  height:32px;
  place-items:center;
  padding:0;
  border:1px solid rgba(101,84,238,.11);
  border-radius:9px;
  color:#625d82;
  background:rgba(255,255,255,.72);
  box-shadow:0 3px 8px rgba(60,48,117,.1);
  font:inherit;
  font-family:Arial,sans-serif;
  font-size:1.18rem;
  font-weight:400;
  line-height:1;
  cursor:pointer;
  transition:color 160ms ease,background 160ms ease,border-color 160ms ease,box-shadow 160ms ease,transform 160ms ease;
}
.direction-grid button:hover,
.direction-grid button:focus-visible{
  outline:none;
  color:#4e3fe0;
  background:#fff;
  border-color:rgba(101,84,238,.26);
  box-shadow:0 5px 12px rgba(60,48,117,.15);
  transform:translateY(-1px);
}
.direction-grid button.active{
  color:#fff;
  border-color:#6554ee;
  background:linear-gradient(145deg,#7154ff,#5536eb);
  box-shadow:0 6px 14px rgba(83,57,222,.3);
}
.direction-centre{
  grid-row:2;
  grid-column:2;
  width:4px;
  height:4px;
  place-self:center;
  border-radius:50%;
  background:#8f87ad;
}

.link-layer{
  position:absolute;
  inset:0;
  z-index:1;
  width:100%;
  height:100%;
  overflow:visible;
  pointer-events:none;
}

.skill-node{
  position:absolute;
  left:0;
  top:0;
  z-index:5;
  display:inline-flex;
  align-items:center;
  gap:8px;
  min-height:34px;
  max-width:150px;
  padding:7px 12px;
  border:1px solid color-mix(in srgb,var(--node-color) 20%,transparent);
  border-radius:999px;
  color:#2b283e;
  background:rgba(255,255,255,.94);
  font:inherit;
  font-size:.65rem;
  font-weight:720;
  line-height:1.15;
  white-space:nowrap;
  cursor:pointer;
  opacity:var(--depth-opacity);
  transform:translate(-50%,-50%) scale(var(--node-scale));
  transform-origin:center;
  contain:layout style;
  box-shadow:0 2px 8px rgba(42,34,92,.055);
  transition:border-color 180ms ease,box-shadow 180ms ease,color 180ms ease,background 180ms ease;
}

.node-glyph{
  display:grid;
  place-items:center;
  width:20px;
  height:20px;
  flex:0 0 auto;
  border-radius:7px;
  color:var(--node-color);
  background:color-mix(in srgb,var(--node-color) 9%,white);
}

.node-glyph :deep(svg){width:12px;height:12px}

.skill-node:hover,.skill-node:focus-visible,.skill-node.selected,.skill-node.linked{
  opacity:1;
  outline:none;
  border-color:color-mix(in srgb,var(--node-color) 55%,transparent);
  box-shadow:0 0 0 5px color-mix(in srgb,var(--node-color) 9%,transparent),0 15px 32px rgba(42,34,92,.15);
}
.skill-node.selected{z-index:80!important}
.skill-node.linked{font-weight:820}
.skill-node.muted{opacity:.055;pointer-events:none}
.sphere-canvas.dragging .skill-node{pointer-events:none;box-shadow:none;transition:none}

.skill-detail{
  position:relative;
  z-index:4;
  display:flex;
  flex-direction:column;
  max-height:calc(100% - 48px);
  margin:0;
  padding:0;
  overflow:hidden;
  border:1px solid color-mix(in srgb,var(--detail-color) 18%,#d5d1df);
  border-radius:24px;
  color:#29253d;
  background:rgba(255,255,255,.9);
  box-shadow:0 28px 72px rgba(42,34,92,.13);
  backdrop-filter:blur(18px);
}
.skill-detail::before{
  content:"";
  position:absolute;
  inset:0 auto 0 0;
  width:6px;
  background:var(--detail-color);
}
.skill-stage.detail-left .skill-detail::before{inset:0 0 0 auto}
.skill-detail-heading{
  display:flex;
  align-items:flex-start;
  justify-content:space-between;
  gap:24px;
  padding:clamp(24px,2.5vw,30px) clamp(22px,2.5vw,30px) 0;
}
.skill-detail-heading p{
  display:flex;
  align-items:center;
  gap:8px;
  margin:0 0 8px;
  color:#716b7d;
  font-size:.61rem;
  font-weight:850;
  letter-spacing:.13em;
  text-transform:uppercase;
}
.skill-detail-heading p span{
  width:9px;
  height:9px;
  border-radius:50%;
  background:var(--detail-color);
}
.skill-detail-heading h3{
  margin:0;
  font-size:clamp(1.65rem,2.3vw,2.2rem);
  line-height:1;
  letter-spacing:-.045em;
}
.detail-close{
  display:grid;
  place-items:center;
  width:34px;
  height:34px;
  padding:0;
  border:1px solid #ddd9e8;
  border-radius:50%;
  color:#716b7d;
  background:#fff;
  font:inherit;
  font-size:1.2rem;
  line-height:1;
  cursor:pointer;
}
.detail-close:hover,.detail-close:focus-visible{outline:none;border-color:var(--detail-color);color:var(--detail-color)}
.skill-description{
  margin:18px 0 0;
  padding:0 clamp(22px,2.5vw,30px);
  color:#656071;
  font-size:.83rem;
  line-height:1.65;
}
.experience-section{
  display:flex;
  flex:1;
  flex-direction:column;
  min-height:0;
  margin-top:26px;
  padding:0 clamp(15px,2vw,23px) clamp(20px,2vw,26px);
}
.experience-section h4{
  margin:0 0 9px;
  padding-left:7px;
  color:#403a50;
  font-size:.63rem;
  font-weight:880;
  letter-spacing:.12em;
  text-transform:uppercase;
}
.experience-scroll{
  flex:1;
  min-height:0;
  max-height:min(360px,45vh);
  overflow-x:hidden;
  overflow-y:auto;
  padding-right:5px;
  scrollbar-gutter:stable;
  scrollbar-color:color-mix(in srgb,var(--detail-color) 35%,#d8d4e1) transparent;
  scrollbar-width:thin;
}
.experience-list{
  position:relative;
  display:grid;
}
.experience-list::before{
  content:"";
  position:absolute;
  left:8px;
  top:18px;
  bottom:18px;
  width:1px;
  background:color-mix(in srgb,var(--detail-color) 26%,#dfdbe7);
}
.experience-link{
  display:grid;
  grid-template-columns:17px minmax(0,1fr) 16px;
  gap:11px;
  align-items:start;
  min-height:76px;
  padding:13px 7px;
  border-bottom:1px solid #e7e3eb;
  color:#332e42;
  text-decoration:none;
  transition:background 180ms ease;
}
.experience-link:last-child{border-bottom:0}
.experience-marker{
  position:relative;
  z-index:1;
  width:9px;
  height:9px;
  margin-top:4px;
  border:2px solid #fff;
  border-radius:50%;
  background:var(--detail-color);
  box-shadow:0 0 0 2px color-mix(in srgb,var(--detail-color) 13%,transparent);
}
.experience-content{display:grid;gap:4px;min-width:0}
.experience-content strong{font-size:.74rem;line-height:1.35}
.experience-content>span{
  display:-webkit-box;
  overflow:hidden;
  color:#777181;
  font-size:.64rem;
  line-height:1.45;
  -webkit-box-orient:vertical;
  -webkit-line-clamp:2;
}
.experience-content small{
  color:#9993a0;
  font-size:.57rem;
  font-weight:720;
  letter-spacing:.03em;
}
.experience-link b{
  align-self:center;
  color:var(--detail-color);
  font-size:1rem;
  line-height:1;
}
.experience-link:hover,.experience-link:focus-visible{
  outline:none;
  background:color-mix(in srgb,var(--detail-color) 5%,transparent);
}
.evidence-empty{
  margin:0;
  padding:14px;
  border:1px dashed #d8d4e1;
  border-radius:13px;
  color:#96909f;
  font-size:.72rem;
  line-height:1.55;
}

@media(max-width:980px){
  .skills-heading{
    grid-template-columns:1fr;
    gap:34px;
  }
  .skills-heading-copy{max-width:520px}
}

@media(max-width:680px){
  .skills-explorer{padding:56px 0 28px}
  .skills-heading{gap:28px;margin-bottom:0}
  .skills-intro{font-size:.8rem}
  .filter-bar{grid-template-columns:repeat(5,minmax(96px,1fr));overflow-x:auto;overflow-y:hidden}
  .filter-bar button{min-height:56px;padding:7px 9px;font-size:.76rem}
  .skill-node{max-width:86px;min-height:28px;padding:5px 7px;gap:4px;font-size:.49rem;line-height:1.08;white-space:normal;text-align:left}
  .node-glyph{width:17px;height:17px;border-radius:5px}
  .node-glyph :deep(svg){width:10px;height:10px}
  .sphere-controls{bottom:-26px;gap:8px;padding:0}
  .rotation-speed{gap:3px 0}
  .rotation-speed input{width:88px}
  .speed-icon{width:18px;font-size:1rem}
  .speed-icon:first-child{font-size:1.5rem}
  .control-divider{min-height:64px}
  .direction-grid{grid-template-columns:repeat(3,28px);grid-template-rows:repeat(3,28px);gap:3px}
  .direction-grid button{width:28px;height:28px;border-radius:8px;font-size:1rem}
  .skill-stage .skill-detail{
    position:absolute;
    top:50%;
    max-height:calc(100% - 40px);
    border-radius:18px;
    transform:translateY(-50%);
  }
  .experience-scroll{max-height:min(330px,43vh)}
}

@media(max-width:430px){
  .skill-stage{height:650px}
}

@media(prefers-reduced-motion:reduce){
  .filter-bar button,.skill-node{transition-duration:.01ms}
}
</style>
