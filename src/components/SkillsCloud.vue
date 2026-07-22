<template>
  <section class="skills-graph-section" aria-labelledby="skills-graph-title">
    <div class="graph-stage">
      <header class="graph-heading">
        <p class="eyebrow">Skills ecosystem</p>
        <h2 id="skills-graph-title">Built through<br />connection.</h2>
        <p class="graph-intro">Tools matter most in combination. Explore the relationships between the technologies, systems and people practices I use to deliver real work.</p>
      </header>

      <div class="graph-legend">
        <div class="group-key" aria-label="Skill groups">
          <span v-for="group in groups" :key="group.id"><i :style="{ background: group.color }"></i>{{ group.label }}</span>
        </div>
        <div class="edge-key" aria-label="Relationship types">
          <span><i class="line core"></i>Core</span>
          <span><i class="line frequent"></i>Used together</span>
          <span><i class="line support"></i>Supports</span>
          <button class="rotation-control" type="button" :aria-pressed="rotationPaused" @click="rotationPaused = !rotationPaused">
            <span aria-hidden="true">{{ rotationPaused ? '>' : '||' }}</span>
            {{ rotationPaused ? 'Resume rotation' : 'Pause rotation' }}
          </button>
        </div>
      </div>

      <div
        ref="graphCanvas"
        class="graph-canvas"
        :class="{ focused: hasFocus, frozen: Boolean(pinnedId) || rotationPaused, dragging: isDragging }"
        :style="{ '--focus-color': activeDetail.color }"
        role="group"
        tabindex="0"
        aria-label="Interactive relationship map of professional skills. Drag in any direction or use the arrow keys to rotate."
        @keydown="handleGraphKeydown"
        @pointerdown="startDrag"
        @pointermove="dragGraph"
        @pointerup="endDrag"
        @pointercancel="endDrag"
        @click="handleCanvasClick"
      >
        <svg class="edge-layer" viewBox="0 0 1000 700" preserveAspectRatio="none" aria-hidden="true">
          <g v-for="edge in edges" :key="`${edge.from}-${edge.to}`" class="edge" :class="[`edge-${edge.type}`, { active: isEdgeActive(edge), muted: isEdgeMuted(edge) }]">
            <line :x1="nodePosition(edge.from).x" :y1="nodePosition(edge.from).y" :x2="nodePosition(edge.to).x" :y2="nodePosition(edge.to).y" :style="{ opacity: edgeDepth(edge) }" />
            <text v-if="edge.label" :x="edgeLabelPosition(edge).x" :y="edgeLabelPosition(edge).y" text-anchor="middle">{{ edge.label }}</text>
          </g>
        </svg>

        <button
          v-for="skill in skills"
          :key="skill.id"
          type="button"
          class="skill-node"
          :class="[`node-${skill.level}`, { active: isNodeActive(skill), selected: pinnedId === skill.id, muted: isNodeMuted(skill) }]"
          :style="nodeStyle(skill)"
          :aria-label="`${skill.label}: ${skill.summary}`"
          :aria-pressed="pinnedId === skill.id"
          @focus="hoveredId = skill.id"
          @blur="hoveredId = null"
          @pointerenter="hoveredId = skill.id"
          @pointerleave="hoveredId = null"
          @click.stop="handleSkillClick(skill.id)"
        >
          <span class="node-glyph"><SkillIcon :name="skill.icon" /></span><span>{{ skill.label }}</span>
        </button>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import SkillIcon from './SkillIcon.vue'

const groups = [
  { id: 'languages', label: 'Languages', color: '#6554ee' },
  { id: 'frontend', label: 'Frontend', color: '#397fd1' },
  { id: 'backend', label: 'Backend', color: '#15958c' },
  { id: 'systems', label: 'Systems', color: '#56853c' },
  { id: 'data', label: 'Data & AI', color: '#d45d87' },
  { id: 'design', label: 'System design', color: '#9b62d0' },
  { id: 'project', label: 'Project delivery', color: '#d28b24' },
  { id: 'people', label: 'Leadership & personal', color: '#c7584d' }
]

const skills = [
  { id: 'python', label: 'Python', group: 'languages', x: 90, y: 65, level: 'core', icon: 'python', summary: 'My primary language for backend services, automation and data work.' },
  { id: 'javascript', label: 'JavaScript', group: 'languages', x: 215, y: 65, level: 'core', icon: 'javascript', summary: 'Interactive products, browser experiences and full-stack application logic.' },
  { id: 'typescript', label: 'TypeScript', group: 'languages', x: 345, y: 65, level: 'strong', icon: 'typescript', summary: 'Type-safe JavaScript for clearer contracts and maintainable applications.' },
  { id: 'cpp', label: 'C++', group: 'languages', x: 460, y: 65, level: 'core', icon: 'code', summary: 'Performance-focused software for chess engines, robotics and embedded control.' },
  { id: 'sql', label: 'SQL', group: 'languages', x: 565, y: 65, level: 'strong', icon: 'database', summary: 'Reliable data modelling, querying and application persistence.' },
  { id: 'vue', label: 'Vue', group: 'frontend', x: 690, y: 65, level: 'core', icon: 'vue', summary: 'Responsive, component-driven interfaces for products and visual tools.' },
  { id: 'html-css', label: 'HTML & CSS', group: 'frontend', x: 820, y: 65, level: 'strong', icon: 'browser', summary: 'Accessible structure, responsive layouts and polished visual systems.' },
  { id: 'threejs', label: 'Three.js', group: 'frontend', x: 930, y: 65, level: 'strong', icon: 'cube', summary: 'Interactive 3D scenes, games and immersive browser experiences.' },
  { id: 'vite', label: 'Vite', group: 'frontend', x: 760, y: 145, level: 'strong', icon: 'lightning', summary: 'Fast frontend tooling and lean static-site production builds.' },
  { id: 'fastapi', label: 'FastAPI', group: 'backend', x: 85, y: 220, level: 'strong', icon: 'lightning', summary: 'Typed, maintainable Python services and production-ready APIs.' },
  { id: 'nodejs', label: 'Node.js', group: 'backend', x: 215, y: 220, level: 'strong', icon: 'server', summary: 'Backend services, integrations and automation in the JavaScript ecosystem.' },
  { id: 'rest', label: 'REST APIs', group: 'backend', x: 345, y: 220, level: 'strong', icon: 'api', summary: 'Clear contracts that connect products, services and devices.' },
  { id: 'postgresql', label: 'PostgreSQL', group: 'backend', x: 485, y: 220, level: 'strong', icon: 'database', summary: 'Relational persistence, schemas and production application data.' },
  { id: 'pipelines', label: 'Data pipelines', group: 'backend', x: 235, y: 305, level: 'strong', icon: 'layers', summary: 'Repeatable movement from raw inputs to useful, trustworthy outputs.' },
  { id: 'auth', label: 'Auth & RBAC', group: 'backend', x: 430, y: 305, level: 'strong', icon: 'shield', summary: 'Secure authentication and role-based access for multi-tenant products.' },
  { id: 'aws', label: 'AWS', group: 'systems', x: 615, y: 225, level: 'core', icon: 'cloud', summary: 'Hands-on cloud infrastructure across compute, storage, databases, DNS and VPC networking.' },
  { id: 'docker', label: 'Docker', group: 'systems', x: 745, y: 225, level: 'strong', icon: 'docker', summary: 'Portable, predictable application environments from development to deployment.' },
  { id: 'linux', label: 'Linux', group: 'systems', x: 870, y: 225, level: 'strong', icon: 'terminal', summary: 'The operational foundation beneath services, automation and edge systems.' },
  { id: 'ec2', label: 'Amazon EC2', group: 'systems', x: 535, y: 270, level: 'strong', icon: 'server', summary: 'Provisioning, configuring and operating EC2 instances for production workloads.' },
  { id: 'route53', label: 'DNS & Route 53', group: 'systems', x: 655, y: 270, level: 'strong', icon: 'signal', summary: 'Domain and DNS configuration, hosted zones and reliable traffic routing with Route 53.' },
  { id: 's3', label: 'Amazon S3', group: 'systems', x: 775, y: 270, level: 'strong', icon: 'database', summary: 'Creating and configuring secure, durable object-storage buckets for applications and assets.' },
  { id: 'rds', label: 'Amazon RDS', group: 'systems', x: 895, y: 270, level: 'strong', icon: 'database', summary: 'Setting up and operating managed relational databases with practical security and connectivity.' },
  { id: 'vpc-networking', label: 'VPC Networking', group: 'systems', x: 790, y: 350, level: 'strong', icon: 'layers', summary: 'Designing subnets, route tables and internet gateways to connect cloud workloads safely.' },
  { id: 'iot', label: 'IoT', group: 'systems', x: 600, y: 315, level: 'strong', icon: 'signal', summary: 'Connected hardware and software designed as one dependable system.' },
  { id: 'mqtt', label: 'MQTT', group: 'systems', x: 725, y: 315, level: 'familiar', icon: 'signal', summary: 'Lightweight messaging for devices and distributed telemetry.' },
  { id: 'raspberry-pi', label: 'Raspberry Pi', group: 'systems', x: 875, y: 315, level: 'strong', icon: 'chip', summary: 'Embedded computing for robotics, prototyping and control systems.' },
  { id: 'pandas', label: 'Pandas', group: 'data', x: 80, y: 420, level: 'strong', icon: 'chart', summary: 'Practical analysis, transformation and investigation of complex datasets.' },
  { id: 'scikit-learn', label: 'scikit-learn', group: 'data', x: 215, y: 420, level: 'strong', icon: 'brain', summary: 'Production-minded machine-learning experiments and predictive models.' },
  { id: 'statistics', label: 'Statistics', group: 'data', x: 355, y: 420, level: 'strong', icon: 'chart', summary: 'Reasoning about evidence, uncertainty and meaningful model performance.' },
  { id: 'random-forests', label: 'Random Forests', group: 'data', x: 95, y: 505, level: 'strong', icon: 'brain', summary: 'Robust ensemble modelling for prediction and feature insight.' },
  { id: 'bayesian', label: 'Bayesian modelling', group: 'data', x: 265, y: 505, level: 'strong', icon: 'brain', summary: 'Updating predictions with evidence and quantifying uncertainty.' },
  { id: 'monte-carlo', label: 'Monte Carlo', group: 'data', x: 430, y: 505, level: 'strong', icon: 'chart', summary: 'Scenario simulation for uncertain financial and engineering outcomes.' },
  { id: 'system-design', label: 'System Design', group: 'design', x: 565, y: 420, level: 'core', icon: 'blueprint', summary: 'Connecting technical choices, constraints and users into a coherent whole.' },
  { id: 'architecture', label: 'Architecture', group: 'design', x: 720, y: 420, level: 'strong', icon: 'layers', summary: 'Clear boundaries and trade-offs that keep systems evolvable.' },
  { id: 'testing', label: 'Testing', group: 'design', x: 855, y: 420, level: 'strong', icon: 'test', summary: 'Pragmatic confidence across services, integrations and interfaces.' },
  { id: 'performance', label: 'Optimisation', group: 'design', x: 690, y: 505, level: 'strong', icon: 'speed', summary: 'Profiling bottlenecks and improving performance with evidence.' },
  { id: 'project-management', label: 'Project Management', group: 'project', x: 105, y: 610, level: 'core', icon: 'calendar', summary: 'Turning ambiguity into an executable path with managed risk.' },
  { id: 'agile', label: 'Agile delivery', group: 'project', x: 270, y: 610, level: 'strong', icon: 'cycle', summary: 'Short feedback loops and visible progress without process theatre.' },
  { id: 'github', label: 'CI/CD', group: 'project', x: 405, y: 610, level: 'strong', icon: 'cycle', summary: 'Automated delivery pipelines spanning builds, security gates, deployment verification and operations.' },
  { id: 'github-actions', label: 'GitHub Actions', group: 'project', x: 330, y: 555, level: 'strong', icon: 'cycle', summary: 'Building automated workflows for testing, scanning, delivery and repeatable operations.' },
  { id: 'self-hosted-runners', label: 'Self-hosted Runners', group: 'project', x: 455, y: 555, level: 'strong', icon: 'server', summary: 'Configuring and maintaining self-hosted GitHub Actions runners for controlled workloads.' },
  { id: 'security-scanning', label: 'Security Scanning', group: 'project', x: 245, y: 670, level: 'strong', icon: 'shield', summary: 'Embedding vulnerability and dependency scans into delivery pipelines as actionable security gates.' },
  { id: 'agentic-security', label: 'Agentic Security Workflows', group: 'project', x: 410, y: 680, level: 'strong', icon: 'brain', summary: 'Using AI agents to inspect code and dependencies, surface vulnerabilities and support remediation.' },
  { id: 'health-monitoring', label: 'Health Checks & Monitoring', group: 'project', x: 570, y: 680, level: 'strong', icon: 'speed', summary: 'Verifying service availability and deployment health through automated checks and monitoring.' },
  { id: 'stakeholders', label: 'Stakeholders', group: 'project', x: 535, y: 610, level: 'strong', icon: 'people', summary: 'Creating shared understanding across technical and non-technical groups.' },
  { id: 'leadership', label: 'Leadership', group: 'people', x: 660, y: 610, level: 'core', icon: 'people', summary: 'Giving teams direction, context and the confidence to deliver.' },
  { id: 'communication', label: 'Communication', group: 'people', x: 805, y: 610, level: 'core', icon: 'speech', summary: 'Making complex work clear, useful and actionable.' },
  { id: 'problem-solving', label: 'Problem Solving', group: 'people', x: 930, y: 610, level: 'core', icon: 'puzzle', summary: 'Breaking ambiguous problems into practical, testable decisions.' },
  { id: 'collaboration', label: 'Collaboration', group: 'people', x: 725, y: 680, level: 'strong', icon: 'people', summary: 'Working openly across engineering, product and operational teams.' },
  { id: 'mentoring', label: 'Mentoring', group: 'people', x: 885, y: 680, level: 'strong', icon: 'mentor', summary: 'Helping others build confidence through clear technical guidance.' }
]

const edges = [
  { from: 'python', to: 'fastapi', type: 'core', label: 'Backend' },
  { from: 'python', to: 'pandas', type: 'core', label: 'Data work' },
  { from: 'python', to: 'cpp', type: 'support', label: 'Performance' },
  { from: 'javascript', to: 'typescript', type: 'core', label: 'Type safety' },
  { from: 'javascript', to: 'vue', type: 'core', label: 'Interfaces' },
  { from: 'javascript', to: 'nodejs', type: 'core', label: 'Full stack' },
  { from: 'typescript', to: 'vue', type: 'frequent', label: 'Components' },
  { from: 'cpp', to: 'raspberry-pi', type: 'core', label: 'Embedded' },
  { from: 'sql', to: 'postgresql', type: 'core', label: 'Database' },
  { from: 'vue', to: 'html-css', type: 'core', label: 'UI' },
  { from: 'vue', to: 'vite', type: 'frequent', label: 'Tooling' },
  { from: 'vue', to: 'threejs', type: 'frequent', label: '3D web' },
  { from: 'vue', to: 'rest', type: 'frequent', label: 'Products' },
  { from: 'fastapi', to: 'rest', type: 'core', label: 'API design' },
  { from: 'nodejs', to: 'rest', type: 'core', label: 'Services' },
  { from: 'nodejs', to: 'postgresql', type: 'frequent', label: 'Persistence' },
  { from: 'nodejs', to: 'docker', type: 'frequent', label: 'Deployment' },
  { from: 'rest', to: 'auth', type: 'frequent', label: 'Security' },
  { from: 'postgresql', to: 'pipelines', type: 'frequent', label: 'Data flow' },
  { from: 'aws', to: 'docker', type: 'core', label: 'Deployment' },
  { from: 'aws', to: 'ec2', type: 'core', label: 'Compute' },
  { from: 'aws', to: 'route53', type: 'core', label: 'DNS' },
  { from: 'aws', to: 's3', type: 'core', label: 'Storage' },
  { from: 'aws', to: 'rds', type: 'core', label: 'Managed data' },
  { from: 'aws', to: 'vpc-networking', type: 'core', label: 'Networking' },
  { from: 'ec2', to: 'linux', type: 'frequent', label: 'Operations' },
  { from: 'ec2', to: 'vpc-networking', type: 'frequent', label: 'Subnets' },
  { from: 'rds', to: 'postgresql', type: 'frequent', label: 'Database' },
  { from: 'linux', to: 'docker', type: 'support', label: 'Runtime' },
  { from: 'aws', to: 'iot', type: 'frequent', label: 'Cloud edge' },
  { from: 'iot', to: 'mqtt', type: 'core', label: 'Messaging' },
  { from: 'iot', to: 'raspberry-pi', type: 'core', label: 'Edge device' },
  { from: 'pandas', to: 'statistics', type: 'frequent', label: 'Analysis' },
  { from: 'pandas', to: 'scikit-learn', type: 'core', label: 'Features' },
  { from: 'scikit-learn', to: 'random-forests', type: 'core', label: 'Modelling' },
  { from: 'statistics', to: 'random-forests', type: 'core', label: 'Modelling' },
  { from: 'statistics', to: 'bayesian', type: 'core', label: 'Inference' },
  { from: 'statistics', to: 'monte-carlo', type: 'frequent', label: 'Simulation' },
  { from: 'pandas', to: 'pipelines', type: 'support', label: 'Transform' },
  { from: 'system-design', to: 'architecture', type: 'core', label: 'Structure' },
  { from: 'system-design', to: 'testing', type: 'frequent', label: 'Reliability' },
  { from: 'architecture', to: 'performance', type: 'frequent', label: 'Trade-offs' },
  { from: 'system-design', to: 'rest', type: 'support', label: 'Contracts' },
  { from: 'system-design', to: 'aws', type: 'frequent', label: 'Infrastructure' },
  { from: 'testing', to: 'github', type: 'frequent', label: 'Automation' },
  { from: 'github', to: 'github-actions', type: 'core', label: 'Workflows' },
  { from: 'github-actions', to: 'self-hosted-runners', type: 'core', label: 'Execution' },
  { from: 'github-actions', to: 'security-scanning', type: 'frequent', label: 'Security gates' },
  { from: 'security-scanning', to: 'agentic-security', type: 'frequent', label: 'AI review' },
  { from: 'github-actions', to: 'health-monitoring', type: 'frequent', label: 'Verification' },
  { from: 'self-hosted-runners', to: 'docker', type: 'support', label: 'Runtime' },
  { from: 'health-monitoring', to: 'aws', type: 'support', label: 'Cloud services' },
  { from: 'project-management', to: 'system-design', type: 'core', label: 'Delivery' },
  { from: 'project-management', to: 'agile', type: 'frequent', label: 'Cadence' },
  { from: 'project-management', to: 'stakeholders', type: 'core', label: 'Alignment' },
  { from: 'agile', to: 'github', type: 'support', label: 'Iteration' },
  { from: 'stakeholders', to: 'leadership', type: 'frequent', label: 'Direction' },
  { from: 'stakeholders', to: 'communication', type: 'frequent', label: 'Clarity' },
  { from: 'leadership', to: 'collaboration', type: 'core', label: 'Teamwork' },
  { from: 'leadership', to: 'mentoring', type: 'frequent', label: 'Growth' },
  { from: 'communication', to: 'collaboration', type: 'core', label: 'Trust' },
  { from: 'problem-solving', to: 'system-design', type: 'frequent', label: 'Decisions' },
  { from: 'problem-solving', to: 'performance', type: 'support', label: 'Diagnosis' }
]

const hoveredId = ref(null)
const pinnedId = ref(null)
const graphCanvas = ref(null)
const canvasSize = ref({ width: 1000, height: 700 })
const rotationAngle = ref(-0.22)
const rotationTilt = ref(-0.12)
const rotationPaused = ref(false)
const prefersReducedMotion = ref(false)
const isDragging = ref(false)
const pivot = ref({ x: 0, y: 0, z: 0 })
const pivotTarget = ref({ x: 0, y: 0, z: 0 })
const sceneScale = ref(0.76)
const sceneScaleTarget = ref(0.76)
const groupIndex = new Map(groups.map((group, index) => [group.id, index]))

const points3d = new Map(skills.map((skill, index) => {
  const group = groupIndex.get(skill.group)
  const depth = Math.sin(index * 2.399 + group * 0.73) * 245 + Math.cos(skill.y * 0.014 + group) * 65
  return [skill.id, { x: (skill.x - 500) * 0.92, y: (skill.y - 350) * 0.84, z: depth }]
}))

const projectedNodes = computed(() => {
  const projection = new Map()
  const cosY = Math.cos(rotationAngle.value)
  const sinY = Math.sin(rotationAngle.value)
  const cosX = Math.cos(rotationTilt.value)
  const sinX = Math.sin(rotationTilt.value)
  const cameraDistance = 1120

  points3d.forEach((point, id) => {
    const localX = (point.x - pivot.value.x) * sceneScale.value
    const localY = (point.y - pivot.value.y) * sceneScale.value
    const localZ = (point.z - pivot.value.z) * sceneScale.value
    const rotatedX = localX * cosY + localZ * sinY
    const rotatedZ = -localX * sinY + localZ * cosY
    const rotatedY = localY * cosX - rotatedZ * sinX
    const depth = localY * sinX + rotatedZ * cosX
    const scale = cameraDistance / (cameraDistance - depth)
    projection.set(id, {
      x: 500 + rotatedX * scale,
      y: 350 + rotatedY * scale,
      z: depth,
      scale: Math.max(0.72, Math.min(1.28, scale))
    })
  })

  return projection
})

const focusedId = computed(() => pinnedId.value || hoveredId.value)
const hasFocus = computed(() => Boolean(focusedId.value))
const activeSkill = computed(() => skills.find(skill => skill.id === focusedId.value))
const connectedIds = computed(() => {
  if (!focusedId.value) return new Set()
  const ids = new Set([focusedId.value])
  edges.forEach(edge => {
    if (edge.from === focusedId.value) ids.add(edge.to)
    if (edge.to === focusedId.value) ids.add(edge.from)
  })
  return ids
})
const activeDetail = computed(() => {
  if (activeSkill.value) {
    const group = groups.find(item => item.id === activeSkill.value.group)
    return { color: group.color, kicker: group.label, title: activeSkill.value.label, description: activeSkill.value.summary }
  }
  return { color: '#6554ee', mark: '+', kicker: 'Explore the ecosystem', title: 'Hover a node to trace its strongest connections.', description: 'Click to keep the network open while you explore. Double-click empty space to reset.' }
})
const activeRelationships = computed(() => {
  if (!activeSkill.value) return []
  return edges.filter(edge => edge.from === activeSkill.value.id || edge.to === activeSkill.value.id).map(edge => {
    const id = edge.from === activeSkill.value.id ? edge.to : edge.from
    return { id, label: skills.find(skill => skill.id === id)?.label, relationship: edge.label }
  })
})

function nodePosition(id) { return projectedNodes.value.get(id) }
function edgeLabelPosition(edge) { const from = nodePosition(edge.from); const to = nodePosition(edge.to); return { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 - 8 } }
function edgeDepth(edge) { const depth = (nodePosition(edge.from).z + nodePosition(edge.to).z) / 2; return Math.max(0.28, Math.min(0.92, 0.6 + depth / 900)) }
function isNodeActive(skill) { return focusedId.value && connectedIds.value.has(skill.id) }
function isNodeMuted(skill) { return focusedId.value && !connectedIds.value.has(skill.id) }
function isEdgeActive(edge) { return focusedId.value && (edge.from === focusedId.value || edge.to === focusedId.value) }
function isEdgeMuted(edge) { return hasFocus.value && !isEdgeActive(edge) }
function scaleToFitAround(id) {
  const center = points3d.get(id)
  let furthest = 1
  points3d.forEach(point => {
    const distance = Math.hypot(point.x - center.x, point.y - center.y, point.z - center.z)
    furthest = Math.max(furthest, distance)
  })
  return Math.min(0.64, 360 / furthest)
}
function nodeStyle(skill) {
  const group = groups.find(item => item.id === skill.group)
  const point = nodePosition(skill.id)
  const x = point.x / 1000 * canvasSize.value.width
  const y = point.y / 700 * canvasSize.value.height
  return {
    zIndex: pinnedId.value === skill.id ? 100 : Math.round(point.z / 24) + 30,
    transform: `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`,
    '--node-color': group.color,
    '--depth-opacity': Math.max(0.52, Math.min(1, 0.78 + point.z / 1050))
  }
}
function nearestAngle(target, current) {
  return current + Math.atan2(Math.sin(target - current), Math.cos(target - current))
}
function viewingAnglesFor(point) {
  const horizontalDistance = Math.hypot(point.x, point.z)
  return {
    yaw: nearestAngle(Math.atan2(-point.x, point.z), rotationAngle.value),
    tilt: nearestAngle(Math.atan2(point.y, horizontalDistance), rotationTilt.value)
  }
}
function handleSkillClick(id) {
  if (performance.now() < suppressClickUntil) return
  const nextId = pinnedId.value === id ? null : id
  pinnedId.value = nextId
  if (!nextId) {
    centeringTarget = null
    settlingPivot = false
    pivotTarget.value = { x: 0, y: 0, z: 0 }
    sceneScaleTarget.value = 0.76
    return
  }

  const point = points3d.get(nextId)
  const angles = viewingAnglesFor(point)
  sceneScaleTarget.value = scaleToFitAround(nextId)
  pivotTarget.value = { x: 0, y: 0, z: 0 }

  if (prefersReducedMotion.value) {
    rotationAngle.value = angles.yaw
    rotationTilt.value = angles.tilt
    pivot.value = { ...point }
    pivotTarget.value = { ...point }
    centeringTarget = null
    settlingPivot = false
  } else {
    settlingPivot = false
    centeringTarget = { id: nextId, point, ...angles }
  }
}
function resetGraph() {
  pinnedId.value = null
  hoveredId.value = null
  centeringTarget = null
  settlingPivot = false
  pivotTarget.value = { x: 0, y: 0, z: 0 }
  sceneScaleTarget.value = 0.76
}
function handleCanvasClick(event) {
  if (performance.now() < suppressClickUntil) return
  if (!event.target.closest('.skill-node')) resetGraph()
}

let dragPointerId
let dragCaptureTarget
let dragStartX = 0
let dragStartY = 0
let dragX = 0
let dragY = 0
let didDrag = false
let suppressClickUntil = 0

function startDrag(event) {
  if (event.button !== undefined && event.button !== 0) return
  dragPointerId = event.pointerId
  dragCaptureTarget = event.target.closest?.('.skill-node') || event.currentTarget
  dragStartX = event.clientX
  dragStartY = event.clientY
  dragX = event.clientX
  dragY = event.clientY
  didDrag = false
  isDragging.value = true
  dragCaptureTarget.setPointerCapture(event.pointerId)
}

function dragGraph(event) {
  if (!isDragging.value || event.pointerId !== dragPointerId) return
  const deltaX = event.clientX - dragX
  const deltaY = event.clientY - dragY
  if (Math.hypot(event.clientX - dragStartX, event.clientY - dragStartY) > 6) didDrag = true
  rotationAngle.value += deltaX * 0.006
  rotationTilt.value -= deltaY * 0.006
  dragX = event.clientX
  dragY = event.clientY
}

function endDrag(event) {
  if (event.pointerId !== dragPointerId) return
  if (didDrag) suppressClickUntil = performance.now() + 120
  isDragging.value = false
  dragPointerId = undefined
  dragCaptureTarget = undefined
  window.setTimeout(() => { didDrag = false }, 0)
}

function handleGraphKeydown(event) {
  const step = event.shiftKey ? 0.18 : 0.08
  if (event.key === 'ArrowLeft') rotationAngle.value -= step
  else if (event.key === 'ArrowRight') rotationAngle.value += step
  else if (event.key === 'ArrowUp') rotationTilt.value += step
  else if (event.key === 'ArrowDown') rotationTilt.value -= step
  else return
  event.preventDefault()
}

let animationFrame
let previousTime
let resizeObserver
let centeringTarget = null
let settlingPivot = false
function animate(time) {
  if (previousTime === undefined) previousTime = time
  const elapsed = Math.min(time - previousTime, 50)
  const pivotEase = 1 - Math.exp(-elapsed * 0.0065)
  const target = pivotTarget.value
  const current = pivot.value
  pivot.value = {
    x: current.x + (target.x - current.x) * pivotEase,
    y: current.y + (target.y - current.y) * pivotEase,
    z: current.z + (target.z - current.z) * pivotEase
  }
  sceneScale.value += (sceneScaleTarget.value - sceneScale.value) * pivotEase

  if (centeringTarget && !isDragging.value) {
    const rotationEase = 1 - Math.exp(-elapsed * 0.0045)
    rotationAngle.value += (centeringTarget.yaw - rotationAngle.value) * rotationEase
    rotationTilt.value += (centeringTarget.tilt - rotationTilt.value) * rotationEase
    const angleDistance = Math.abs(centeringTarget.yaw - rotationAngle.value) + Math.abs(centeringTarget.tilt - rotationTilt.value)
    const pivotDistance = Math.hypot(pivot.value.x, pivot.value.y, pivot.value.z)
    if (angleDistance < 0.004 && pivotDistance < 1) {
      rotationAngle.value = centeringTarget.yaw
      rotationTilt.value = centeringTarget.tilt
      pivotTarget.value = { ...centeringTarget.point }
      centeringTarget = null
      settlingPivot = true
    }
  } else if (settlingPivot) {
    const remaining = Math.hypot(
      pivotTarget.value.x - pivot.value.x,
      pivotTarget.value.y - pivot.value.y,
      pivotTarget.value.z - pivot.value.z
    )
    if (remaining < 1) {
      pivot.value = { ...pivotTarget.value }
      settlingPivot = false
    }
  } else if (!rotationPaused.value && !isDragging.value && (!hoveredId.value || pinnedId.value)) {
    rotationAngle.value += elapsed * 0.00005
  }
  previousTime = time
  animationFrame = requestAnimationFrame(animate)
}

onMounted(() => {
  prefersReducedMotion.value = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  rotationPaused.value = prefersReducedMotion.value
  resizeObserver = new ResizeObserver(([entry]) => {
    canvasSize.value = { width: entry.contentRect.width, height: entry.contentRect.height }
  })
  resizeObserver.observe(graphCanvas.value)
  animationFrame = requestAnimationFrame(animate)
})

onBeforeUnmount(() => {
  cancelAnimationFrame(animationFrame)
  resizeObserver?.disconnect()
})
</script>

<style scoped>
.skills-graph-section{
  width:100%;
  padding:72px 0 36px;
  border:0;
  background:none;
  box-shadow:none;
}

.graph-stage{
  display:grid;
  grid-template-columns:minmax(0,1fr);
  grid-template-rows:auto auto 700px;
  row-gap:22px;
  width:100%;
  min-height:0;
  overflow:visible;
  border:0;
  border-radius:0;
  background:none;
  box-shadow:none;
}

.graph-heading{
  position:relative;
  z-index:9;
  grid-column:1;
  grid-row:1;
  width:auto;
  max-width:620px;
  padding:0;
}

.eyebrow{
  margin:0 0 18px;
  color:#6554ee;
  font-size:.7rem;
  font-weight:850;
  letter-spacing:.2em;
  text-transform:uppercase;
}

.graph-heading h2{
  margin:0;
  color:#15142a;
  font-size:clamp(3.25rem,4.1vw,4rem);
  line-height:.93;
  letter-spacing:-.065em;
}

.graph-intro{
  max-width:560px;
  margin:26px 0 0;
  color:#77728a;
  font-size:.9rem;
  line-height:1.72;
}

.graph-legend{
  position:relative;
  z-index:9;
  grid-column:1;
  grid-row:2;
  align-self:start;
  justify-self:stretch;
  display:grid;
  justify-items:end;
  gap:19px;
  width:100%;
  padding-top:10px;
}

.group-key{
  display:grid;
  grid-template-columns:repeat(4,max-content);
  justify-content:end;
  column-gap:18px;
  row-gap:10px;
  width:100%;
}

.edge-key{
  display:grid;
  grid-template-columns:repeat(4,max-content);
  justify-content:end;
  column-gap:28px;
  width:100%;
}

.group-key>span,.edge-key>span{
  display:inline-flex;
  align-items:center;
  gap:7px;
  color:#6f6a7f;
  font-size:.59rem;
  font-weight:700;
  white-space:nowrap;
}

.rotation-control{
  display:inline-flex;
  align-items:center;
  gap:7px;
  padding:0;
  border:0;
  color:#6f6a7f;
  background:transparent;
  font:inherit;
  font-size:.59rem;
  font-weight:750;
  cursor:pointer;
}

.rotation-control span{
  display:grid;
  place-items:center;
  width:20px;
  height:20px;
  border:1px solid rgba(101,84,238,.2);
  border-radius:50%;
  color:#6554ee;
  font-size:.48rem;
}

.rotation-control:hover,.rotation-control:focus-visible{color:#3f368d}

.group-key i{
  display:block;
  width:7px;
  height:7px;
  flex:0 0 auto;
  border-radius:50%;
}

.line{
  display:block;
  width:25px;
  border-top:1px solid #8e899c;
}

.line.core{border-top-width:3px}
.line.support{border-top-style:dashed}

.graph-canvas{
  position:relative;
  z-index:2;
  grid-column:1/-1;
  grid-row:3;
  width:100%;
  height:700px;
  min-width:0;
  overflow:visible;
  isolation:isolate;
  perspective:1100px;
  touch-action:none;
  cursor:grab;
  border:0;
  border-radius:0;
  background:
    radial-gradient(circle at 50% 48%,rgba(101,84,238,.075),transparent 31%),
    radial-gradient(ellipse at 50% 54%,rgba(255,255,255,.7),transparent 63%);
  box-shadow:none;
}

.graph-canvas::before{
  content:"";
  position:absolute;
  inset:10% 6%;
  z-index:0;
  border:1px solid rgba(101,84,238,.08);
  border-radius:50%;
  transform:rotateX(68deg);
  box-shadow:0 0 80px rgba(101,84,238,.04) inset;
  pointer-events:none;
}

.graph-canvas.dragging{cursor:grabbing}

.graph-canvas:focus-visible{
  outline:2px solid rgba(101,84,238,.5);
  outline-offset:6px;
}

.graph-canvas::after{display:none}

.edge-layer{
  position:absolute;
  inset:0;
  z-index:1;
  width:100%;
  height:100%;
  overflow:visible;
  pointer-events:none;
}

.edge line{
  stroke:#aaa7b5;
  stroke-width:1.25;
  vector-effect:non-scaling-stroke;
  transition:opacity 220ms ease,stroke 220ms ease,stroke-width 220ms ease;
}

.edge-support line{stroke-dasharray:7 7}
.edge-core line{stroke-width:2.8}

.edge text{
  opacity:0;
  fill:#514c62;
  paint-order:stroke;
  stroke:color-mix(in srgb,#efedf9 92%,white);
  stroke-width:4px;
  stroke-linejoin:round;
  font-size:9px;
  font-weight:850;
  letter-spacing:.035em;
  transition:opacity 180ms ease;
}

.edge.active line{
  stroke:var(--focus-color);
  stroke-dasharray:8 7;
  stroke-width:2.4;
  animation:trace-edge 700ms linear infinite;
}

.edge.active.edge-core line{stroke-width:4}
.edge.active text{opacity:1}
.edge.muted{opacity:.055}

.skill-node{
  position:absolute;
  left:0;
  top:0;
  z-index:3;
  display:inline-flex;
  align-items:center;
  gap:8px;
  min-height:35px;
  padding:7px 12px;
  border:1px solid color-mix(in srgb,var(--node-color) 20%,transparent);
  border-radius:999px;
  color:#2b283e;
  background:color-mix(in srgb,#fff 82%,transparent);
  backdrop-filter:blur(9px);
  font:inherit;
  font-size:.65rem;
  font-weight:720;
  white-space:nowrap;
  cursor:pointer;
  box-shadow:0 8px 22px rgba(42,34,92,.09);
  opacity:var(--depth-opacity);
  transform-origin:center;
  will-change:transform,opacity;
  transition:filter 240ms ease,border-color 180ms ease,box-shadow 180ms ease,color 180ms ease,background 180ms ease;
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
  font-size:.5rem;
  font-weight:900;
  letter-spacing:-.02em;
}

.node-core{
  min-height:43px;
  padding:9px 15px;
  font-size:.74rem;
  font-weight:850;
}

.node-core .node-glyph{width:23px;height:23px}
.node-strong{min-height:38px;padding:8px 13px;font-size:.68rem}
.node-familiar{font-size:.6rem}

.skill-node:hover,.skill-node.active,.skill-node.selected{
  opacity:1;
  border-color:color-mix(in srgb,var(--node-color) 55%,transparent);
  box-shadow:0 0 0 5px color-mix(in srgb,var(--node-color) 9%,transparent),0 15px 32px rgba(42,34,92,.15);
}

.skill-node.active{font-weight:850}
.skill-node.selected{color:#fff;background:var(--node-color)}
.skill-node.selected .node-glyph{color:var(--node-color);background:#fff}
.skill-node.muted{opacity:.09;filter:grayscale(.8)}

@keyframes trace-edge{to{stroke-dashoffset:-15}}

@media(max-width:980px){
  .skills-graph-section{padding-top:56px}
  .graph-stage{
    grid-template-columns:minmax(0,1fr);
    grid-template-rows:auto auto 700px;
    row-gap:22px;
  }
  .graph-heading h2{font-size:clamp(2.9rem,6vw,3.7rem)}
  .group-key{grid-template-columns:repeat(2,max-content);column-gap:22px}
  .graph-canvas{height:700px}
}

@media(max-width:680px){
  .skills-graph-section{padding:40px 0 24px}
  .graph-stage{
    grid-template-columns:1fr;
    grid-template-rows:auto auto 700px;
    row-gap:26px;
  }
  .graph-heading{grid-column:1;grid-row:1;max-width:none}
  .graph-heading h2{font-size:clamp(3.1rem,14vw,4.25rem)}
  .graph-intro{max-width:430px;margin-top:20px}
  .graph-legend{grid-column:1;grid-row:2;justify-items:start;padding-top:4px}
  .group-key{justify-content:start}
  .edge-key{display:flex;justify-content:flex-start}
  .edge-key>span{display:none}
  .graph-canvas{grid-column:1;grid-row:3;height:700px}
  .skill-node{max-width:86px;min-height:28px;padding:5px 7px;gap:4px;font-size:.49rem;line-height:1.08;white-space:normal;text-align:left}
  .node-core{min-height:34px;padding:7px 9px;font-size:.56rem}
  .node-strong{min-height:31px;padding:6px 8px;font-size:.52rem}
  .node-glyph,.node-core .node-glyph{width:17px;height:17px;border-radius:5px;font-size:.4rem}
  .edge text{font-size:7px}
}

@media(prefers-reduced-motion:reduce){
  .edge.active line{animation:none}
  .skill-node,.edge line{transition-duration:.01ms}
}
</style>
