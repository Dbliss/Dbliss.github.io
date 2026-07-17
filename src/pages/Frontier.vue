<template>
  <div class="frontier-root">
    <canvas ref="canvasEl" class="game-canvas" />

    <!-- intro -->
    <div v-if="!started" class="overlay intro">
      <div class="intro-card">
        <div class="intro-kicker">A settlement-defence roguelike</div>
        <h1>FRONTIER</h1>
        <p class="intro-tag">
          Build a civilisation that evolves faster than the mist can destroy it.
        </p>
        <p class="intro-body">
          You are the commander, on the ground with sword, axe and pickaxe. Command your
          villagers from the roster — send them to chop, mine, farm, or enlist at the
          barracks. Forge better tools to reach the ancient trees and rich veins deep in
          the mist. Upgrade the Beacon to grow your city, upgrade every building, and hold
          the line for twelve nights.
        </p>
        <div class="intro-controls">
          <span><b>WASD</b> walk</span>
          <span><b>Space</b> jump</span>
          <span><b>Mouse</b> look (click to grab)</span>
          <span><b>1–4</b> sword / axe / pickaxe / build</span>
          <span><b>E</b> interact with buildings</span>
          <span><b>N</b> villager roster</span>
          <span><b>B</b> banner for soldiers</span>
          <span><b>V</b> bird's-eye view</span>
          <span><b>Esc</b> free mouse / close</span>
        </div>
        <button class="cta" @click="begin">Found the settlement</button>
        <RouterLink class="back-link" to="/projects">← Back to projects</RouterLink>
      </div>
    </div>

    <template v-if="started">
      <!-- top bar: resources -->
      <div class="hud top-left">
        <div class="res" title="Food — feeds your people">
          <GameIcon k="res_food" fb="F" />{{ ui.food }}
        </div>
        <div class="res" title="Wood — basic construction">
          <GameIcon k="res_wood" fb="W" />{{ ui.wood }}
        </div>
        <div class="res" title="Stone — advanced buildings">
          <GameIcon k="res_stone" fb="S" />{{ ui.stone }}
        </div>
        <div class="res" v-if="ui.era >= 1" title="Knowledge — rerolls and tool research">
          <GameIcon k="res_knowledge" fb="K" />{{ ui.knowledge }}
        </div>
        <div class="res" v-if="ui.era >= 2" title="Energy — powers tesla towers">
          <GameIcon k="res_energy" fb="E" />{{ ui.energy }}
        </div>
        <div class="res" title="Population / capacity">
          <GameIcon k="pop" fb="P" />{{ ui.pop }}/{{ ui.popCap }}
        </div>
        <div class="res" v-if="ui.units || ui.soldierCap" title="Soldiers / barracks capacity">
          <GameIcon k="soldier" fb="⚔" />{{ ui.units }}/{{ ui.soldierCap }}
        </div>
      </div>

      <!-- first-person crosshair -->
      <div v-if="ui.camMode === 'fp' && !over && !anyOverlay" class="crosshair" aria-hidden="true" />

      <div class="hud top-center">
        <div class="era-line">Era {{ eraNumeral }} — {{ eraName }} · Beacon Lv {{ ui.coreLevel }}</div>
        <div class="wave-line">
          <template v-if="ui.phase === 'day'">
            Day {{ ui.wave }} · night in <b>{{ ui.phaseT }}s</b>
          </template>
          <template v-else-if="ui.phase === 'night'">
            Wave {{ ui.wave }}/{{ ui.waveTotal }} · <b>{{ ui.enemiesLeft }}</b> remaining
          </template>
          <template v-else-if="ui.phase === 'choice'">Choose a reward</template>
          <template v-else>—</template>
        </div>
        <div class="cmd-hp" :class="{ down: ui.commanderDown }" title="Your health">
          <div class="cmd-hp-fill" :style="{ width: ui.commanderHp + '%' }" />
        </div>
        <button v-if="ui.phase === 'day'" class="mini-cta" @click="game.callNight()">
          Call the night (+4 knowledge)
        </button>
        <button
          v-if="ui.phase === 'night'"
          class="mini-cta rally"
          :disabled="ui.rallyCd > 0"
          @click="game.rally()"
        >
          {{ ui.rallyActive ? 'RALLYING' : ui.rallyCd > 0 ? `Rally ${ui.rallyCd}s` : 'Rally (15 food)' }}
        </button>
      </div>

      <div class="hud top-right">
        <button class="icon-btn" :title="ui.camMode === 'fp' ? 'Bird\'s-eye view (V)' : 'First-person view (V)'" @click="game.view.toggleMode()">
          <svg viewBox="0 0 24 24"><path v-if="ui.camMode === 'fp'" d="M12 3 2 9l10 6 10-6-10-6zm0 15-7-4.2V17l7 4 7-4v-3.2L12 18z" fill="currentColor"/><circle v-else cx="12" cy="12" r="3" fill="currentColor"/><path v-if="ui.camMode !== 'fp'" d="M12 5a9 9 0 0 1 8.6 6.3l.4 1-.4 1A9 9 0 0 1 3.4 13l-.4-1 .4-1A9 9 0 0 1 12 5zm0 2a7 7 0 0 0-6.6 5A7 7 0 0 0 12 17a7 7 0 0 0 6.6-5A7 7 0 0 0 12 7z" fill="currentColor"/></svg>
        </button>
        <button class="icon-btn" :title="ui.hasBanner ? 'Lift banner — soldiers guard the Beacon (B)' : 'Plant banner where you aim (B)'"
                :class="{ lit: ui.hasBanner }" @click="bannerFromUi">
          <svg viewBox="0 0 24 24"><path d="M6 2v20h2v-8h11l-3-5 3-5H8V2H6z" fill="currentColor"/></svg>
        </button>
        <button class="icon-btn" :class="{ lit: ui.rosterOpen }" title="Villager roster (N)" @click="toggleRoster">
          <svg viewBox="0 0 24 24"><circle cx="9" cy="7" r="3" fill="currentColor"/><path d="M3 19a6 6 0 0 1 12 0v1H3v-1z" fill="currentColor"/><circle cx="17" cy="8" r="2.4" fill="currentColor" opacity="0.7"/><path d="M13.5 19.5a5 5 0 0 1 8-3.9V20h-8v-.5z" fill="currentColor" opacity="0.7"/></svg>
        </button>
        <button class="icon-btn" :title="muted ? 'Unmute' : 'Mute'" @click="toggleMute">
          <svg viewBox="0 0 24 24"><path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor"/><path v-if="!muted" d="M16 8a5 5 0 0 1 0 8" stroke="currentColor" stroke-width="2" fill="none"/><path v-else d="m16 9 5 6m0-6-5 6" stroke="currentColor" stroke-width="2"/></svg>
        </button>
        <button class="icon-btn" :title="ui.paused ? 'Resume' : 'Pause'" @click="togglePause">
          <svg viewBox="0 0 24 24"><path v-if="!ui.paused" d="M7 5h4v14H7zM13 5h4v14h-4z" fill="currentColor"/><path v-else d="M8 5v14l11-7L8 5z" fill="currentColor"/></svg>
        </button>
        <button class="icon-btn" title="Restart run" @click="restart">
          <svg viewBox="0 0 24 24"><path d="M12 5a7 7 0 1 1-6.3 4H3l4-5 4 5H8.1A5 5 0 1 0 12 7V5z" fill="currentColor"/></svg>
        </button>
        <RouterLink class="icon-btn" title="Exit" to="/projects">
          <svg viewBox="0 0 24 24"><path d="m6 6 12 12M18 6 6 18" stroke="currentColor" stroke-width="2.4"/></svg>
        </RouterLink>
      </div>

      <!-- hand tools (first person only) -->
      <div v-if="ui.camMode === 'fp'" class="hud tool-bar">
        <button
          v-for="(t, i) in tools"
          :key="t.id"
          class="tool-btn"
          :class="{ active: ui.tool === t.id }"
          :title="`${t.name} — ${t.desc}`"
          @click="game.setTool(t.id)"
        >
          <span class="b-key">{{ i + 1 }}</span>
          <GameIcon :k="toolIconKey(t.id)" :fb="t.name[0]" size="26" />
          <span class="t-name">{{ t.name }}</span>
          <span v-if="t.id !== 'build'" class="t-tier">T{{ ui.toolTiers[t.id === 'pick' ? 'pick' : t.id] || 1 }}</span>
          <span v-else class="t-tier">T{{ ui.toolTiers.hammer }}</span>
        </button>
      </div>

      <!-- placing hint -->
      <div v-if="ui.placing && !ui.buildMenu" class="hud placing-hint">
        Placing <b>{{ BUILDINGS[ui.placing].name }}</b> — click to place · scroll to cycle · right-click to cancel
      </div>

      <!-- ============ BUILD MENU (mouse is free) ============ -->
      <div v-if="ui.buildMenu" class="overlay build-menu" @click.self="game.closePanels()">
        <div class="menu-box">
          <div class="menu-head">
            <b>Build</b>
            <span class="menu-sub">Beacon level {{ ui.coreLevel }} — limits rise as it grows</span>
            <button class="menu-close" @click="game.closePanels()">✕</button>
          </div>
          <div class="menu-grid">
            <button
              v-for="b in menuBuildings"
              :key="b.id"
              class="menu-card"
              :class="{ locked: b.locked, poor: !b.locked && !b.affordable }"
              :title="b.desc"
              @click="!b.locked && pickBuilding(b.id)"
            >
              <GameIcon :k="`b_${b.id}_${ui.era}`" :fb="b.name[0]" size="44" />
              <span class="mc-name">{{ b.name }}</span>
              <span class="mc-cost">
                <template v-for="(v, k) in b.cost" :key="k"><GameIcon :k="`res_${k}`" :fb="k[0]" size="13" />{{ v }} </template>
              </span>
              <span class="mc-count" :class="{ full: b.atLimit }">{{ b.count }}/{{ b.limit }}</span>
              <span v-if="b.locked" class="mc-lock">{{ b.lockReason }}</span>
            </button>
          </div>
        </div>
      </div>

      <!-- ============ VILLAGER ROSTER / COMMAND LOG ============ -->
      <div v-if="ui.rosterOpen" class="hud roster">
        <div class="roster-head">
          <b>Roster</b>
          <span class="menu-sub">{{ ui.villagers.length }} villagers · {{ ui.soldiers.length }}/{{ ui.soldierCap }} soldiers</span>
          <button class="menu-close" @click="ui.rosterOpen = false">✕</button>
        </div>
        <div class="roster-all">
          <span>All:</span>
          <button v-for="j in jobs" :key="j.id" class="job-btn" :title="`Everyone: ${j.name}`"
                  @click="game.setAllJobs(j.id)">
            <GameIcon :k="jobIconKey(j.id)" :fb="j.name[0]" size="16" />
          </button>
        </div>
        <div class="roster-list">
          <div v-for="v in ui.villagers" :key="v.uid" class="roster-row">
            <span class="r-name">{{ v.name }}</span>
            <span class="r-status">{{ v.status }}<template v-if="v.carry"> ({{ v.carry }})</template></span>
            <span class="r-jobs">
              <button
                v-for="j in jobs"
                :key="j.id"
                class="job-btn"
                :class="{ active: v.job === j.id }"
                :title="`${j.name} — ${j.desc}`"
                @click="game.setJob(v.uid, j.id)"
              >
                <GameIcon :k="jobIconKey(j.id)" :fb="j.name[0]" size="16" />
              </button>
            </span>
          </div>
          <div v-if="!ui.villagers.length" class="roster-empty">
            No villagers yet — build houses and keep food stocked.
          </div>
          <div v-for="s in ui.soldiers" :key="s.uid" class="roster-row soldier-row">
            <span class="r-name"><GameIcon k="soldier" fb="⚔" size="15" /> {{ s.name }}</span>
            <span class="r-status">{{ s.fighting ? 'fighting!' : s.mode === 'follow' ? 'following you' : 'guarding' }} · {{ s.hp }}hp</span>
            <span class="r-jobs">
              <button class="job-btn" :class="{ active: s.mode === 'guard' }" title="Guard the Beacon / banner"
                      @click="game.setSoldierMode(s.uid, 'guard')">
                <GameIcon k="banner" fb="G" size="16" />
              </button>
              <button class="job-btn" :class="{ active: s.mode === 'follow' }" title="Follow the commander"
                      @click="game.setSoldierMode(s.uid, 'follow')">
                <GameIcon k="pop" fb="F" size="16" />
              </button>
            </span>
          </div>
        </div>
      </div>

      <!-- ============ BUILDING INTERACT PANEL (E) ============ -->
      <div v-if="ui.panel" class="hud select-panel">
        <div class="sel-head">
          <GameIcon :k="`b_${ui.panel.type}_${ui.era}`" :fb="ui.panel.name[0]" size="30" />
          <b>{{ ui.panel.name }}</b>
          <span class="sel-lvl">Lv {{ ui.panel.level }}<template v-if="ui.panel.maxLevel > 1">/{{ ui.panel.maxLevel }}</template></span>
          <span v-if="!ui.panel.active" class="sel-idle">idle</span>
          <button class="menu-close" @click="game.closePanels()">✕</button>
        </div>
        <div class="sel-hp">
          <div class="sel-hp-fill" :style="{ width: (100 * ui.panel.hp / ui.panel.hpMax) + '%' }" />
        </div>
        <div class="sel-sub">{{ ui.panel.hp }}/{{ ui.panel.hpMax }} hp — {{ ui.panel.desc }}</div>
        <div v-if="ui.panel.type === 'farm'" class="sel-sub">
          Farmers working: {{ ui.panel.staffed }} — assign from the roster (N)
        </div>
        <div v-if="ui.panel.soldiers !== undefined" class="sel-sub">
          Soldiers from here: {{ ui.panel.soldiers }}/{{ ui.panel.trainCap }} — enlist villagers from the roster (N)
        </div>

        <!-- upgrade -->
        <div class="sel-actions">
          <button v-if="ui.panel.upgradeCost" :disabled="!ui.panel.canUpgrade" class="upgrade-btn"
                  @click="game.upgradeBuilding(game.selected)">
            ▲ Upgrade to Lv {{ ui.panel.level + 1 }} —
            <template v-for="(v, k) in ui.panel.upgradeCost" :key="k">
              <GameIcon :k="`res_${k}`" :fb="k[0]" size="13" />{{ v }}&nbsp;
            </template>
          </button>
          <span v-else-if="ui.panel.maxLevel > 1" class="sel-max">Max level</span>
        </div>

        <!-- forge: tool research -->
        <div v-if="ui.panel.type === 'forge' && ui.panel.tools" class="forge-tools">
          <div class="forge-title">Tool research (everyone re-equips)</div>
          <div v-for="tid in ['sword', 'axe', 'pick', 'hammer']" :key="tid" class="forge-row">
            <GameIcon :k="toolIconKey(tid === 'pick' ? 'pick' : tid)" :fb="tid[0]" size="20" />
            <span class="f-name">{{ toolName(tid) }} <b>T{{ ui.panel.tools[tid].cur }}</b></span>
            <template v-if="ui.panel.tools[tid].next">
              <button
                class="f-btn"
                :disabled="ui.panel.tools[tid].locked || !ui.panel.tools[tid].affordable"
                :title="ui.panel.tools[tid].locked ? `Needs Forge level ${ui.panel.tools[tid].needsForge}` : `Research ${ui.panel.tools[tid].name} (T${ui.panel.tools[tid].next})`"
                @click="game.researchTool(tid)"
              >
                <template v-if="ui.panel.tools[tid].locked">Forge Lv {{ ui.panel.tools[tid].needsForge }}</template>
                <template v-else>
                  {{ ui.panel.tools[tid].name }}
                  <template v-for="(v, k) in ui.panel.tools[tid].cost" :key="k">
                    <GameIcon :k="`res_${k}`" :fb="k[0]" size="12" />{{ v }}
                  </template>
                </template>
              </button>
            </template>
            <span v-else class="f-max">MAX</span>
          </div>
        </div>

        <div class="sel-actions">
          <button v-if="ui.panel.hp < ui.panel.hpMax" @click="game.repairSelected()">
            Repair ({{ ui.panel.repairCost }} <GameIcon k="res_wood" fb="w" size="12" />)
          </button>
          <button v-if="!ui.panel.isCore" class="danger" @click="game.demolishSelected()">
            Demolish (50% back)
          </button>
        </div>
      </div>

      <!-- upgrade choice -->
      <div v-if="offers.length && ui.phase === 'choice'" class="overlay choice">
        <div class="choice-box">
          <div class="choice-title">Wave {{ ui.wave }} survived</div>
          <div class="choice-sub">The settlement adapts. Choose one:</div>
          <div class="cards">
            <button v-for="u in offers" :key="u.id" class="card" @click="pick(u.id)">
              <div class="card-icon"><GameIcon :k="`b_${u.icon}_${ui.era}`" :fb="u.name[0]" size="42" /></div>
              <div class="card-name">{{ u.name }}</div>
              <div class="card-tag">{{ u.tag }}</div>
              <div class="card-desc">{{ u.desc }}</div>
            </button>
          </div>
          <button class="reroll" :disabled="ui.knowledge < 25" @click="game.rerollOffers()">
            Reroll (25 <GameIcon k="res_knowledge" fb="k" size="13" />)
          </button>
        </div>
      </div>

      <!-- era transition flash -->
      <div v-if="flash" class="era-flash" />

      <!-- era banner -->
      <transition name="banner">
        <div v-if="eraBanner" class="era-banner">
          <div class="era-banner-num">ERA {{ eraBanner.numeral }}</div>
          <div class="era-banner-name">{{ eraBanner.name }}</div>
          <div class="era-banner-blurb">{{ eraBanner.blurb }}</div>
        </div>
      </transition>

      <!-- toasts -->
      <div class="toasts">
        <div v-for="t in toasts" :key="t.id" class="toast">{{ t.msg }}</div>
      </div>

      <!-- end screen -->
      <div v-if="over" class="overlay endscreen">
        <div class="intro-card">
          <h1>{{ over.win ? 'CIVILISATION' : 'THE BEACON FALLS' }}</h1>
          <p class="intro-tag">
            {{ over.win
              ? 'Twelve nights survived. The metropolis hums on without fear.'
              : 'The frontier reclaims what was built. Try a different doctrine.' }}
          </p>
          <div class="end-stats">
            <div><b>{{ over.stats.waves }}</b><span>waves</span></div>
            <div><b>{{ over.stats.kills }}</b><span>kills</span></div>
            <div><b>{{ over.stats.built }}</b><span>built</span></div>
            <div><b>{{ over.stats.upgrades }}</b><span>mutations</span></div>
            <div><b>{{ over.stats.minutes }}m</b><span>run time</span></div>
          </div>
          <button class="cta" @click="restart">Run it back</button>
          <RouterLink class="back-link" to="/projects">← Back to projects</RouterLink>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, reactive, computed, h, onMounted, onBeforeUnmount } from 'vue'
import { RouterLink } from 'vue-router'
import { FrontierGame } from '../frontier/game.js'
import {
  BUILDINGS, BUILD_ORDER, PLAYER_TOOLS, JOBS, TOOLS, TOOL_TIER_NAMES, buildingLimit
} from '../frontier/defs.js'

const tools = PLAYER_TOOLS
const jobs = JOBS

const canvasEl = ref(null)
const started = ref(false)
const muted = ref(false)
const offers = ref([])
const eraBanner = ref(null)
const flash = ref(false)
const toasts = ref([])
const over = ref(null)
let toastId = 0
let game = null

const ui = reactive({
  wood: 0, stone: 0, food: 0, energy: 0, knowledge: 0,
  pop: 0, popCap: 0,
  era: 0, wave: 1, waveTotal: 12,
  phase: 'day', phaseT: 0, enemiesLeft: 0,
  rallyCd: 0, rallyActive: false,
  placing: null, paused: false, panel: null,
  units: 0, soldierCap: 0, hasBanner: false, camMode: 'fp', tool: 'sword',
  buildMenu: false, coreLevel: 1, commanderHp: 100, commanderDown: false,
  toolTiers: { sword: 1, axe: 1, pick: 1, hammer: 1 },
  buildCounts: {},
  villagers: [], soldiers: [],
  rosterOpen: false,
  icons: {}
})

/** Renders a model thumbnail from the icon cache (letter fallback while loading). */
const GameIcon = (props) => {
  const url = ui.icons[props.k]
  const size = (props.size || 18) + 'px'
  return url
    ? h('img', { src: url, class: 'gicon', style: { width: size, height: size }, draggable: false })
    : h('span', { class: 'gicon gicon-fb', style: { width: size, height: size, fontSize: `calc(${size} * 0.55)` } }, props.fb || '?')
}
GameIcon.props = ['k', 'fb', 'size']

const ERA_META = [
  { numeral: 'I', name: 'Frontier Camp' },
  { numeral: 'II', name: 'Fortified Town' },
  { numeral: 'III', name: 'Neon Metropolis' }
]
const eraNumeral = computed(() => ERA_META[ui.era]?.numeral || 'I')
const eraName = computed(() => ERA_META[ui.era]?.name || '')
const anyOverlay = computed(() =>
  ui.buildMenu || ui.phase === 'choice' || ui.paused
)

const menuBuildings = computed(() =>
  BUILD_ORDER.map(id => {
    const def = BUILDINGS[id]
    const count = ui.buildCounts[id] || 0
    const limit = buildingLimit(id, ui.coreLevel)
    const eraLocked = def.era > ui.era
    const atLimit = count >= limit
    const cost = game ? game.costOf(id) : def.cost
    return {
      id, name: def.name, desc: def.desc, cost,
      count, limit: limit === Infinity ? '∞' : limit,
      atLimit,
      locked: eraLocked || atLimit,
      lockReason: eraLocked ? `Era ${ERA_META[def.era].numeral}` : atLimit ? 'Beacon too low' : '',
      affordable: game ? game.canAfford(cost) : false
    }
  })
)

function toolIconKey(id) {
  const t = ui.toolTiers
  if (id === 'sword') return 'tool_sword'
  if (id === 'axe') return t.axe >= 5 ? 'tool_axe_up' : 'tool_axe'
  if (id === 'pick') return t.pick >= 5 ? 'tool_pick_up' : 'tool_pick'
  return t.hammer >= 5 ? 'tool_hammer_up' : 'tool_hammer'
}
function jobIconKey(id) {
  return {
    idle: 'pop', wood: 'tool_axe', mine: 'tool_pick', farm: 'tool_hoe', train: 'tool_sword'
  }[id] || 'pop'
}
function toolName(id) {
  return TOOLS[id]?.name || id
}

function pickBuilding(id) {
  game.chooseBuilding(id)
}

function bannerFromUi() {
  const t = game.hover || { x: Math.floor(game.commander.x), y: Math.floor(game.commander.y) }
  game.toggleBanner(t.x, t.y)
}

function toggleRoster() {
  ui.rosterOpen = !ui.rosterOpen
}

function toast(msg) {
  const id = ++toastId
  toasts.value.push({ id, msg })
  setTimeout(() => {
    toasts.value = toasts.value.filter(t => t.id !== id)
  }, 2600)
}

function begin() {
  started.value = true
  game.paused = false
  game.audio.ensure()
  game.syncUi(true)
  toast('Click the world to grab the mouse — Esc frees it')
  toast('Press N to command your villagers')
}

function pick(id) {
  game.chooseUpgrade(id)
  offers.value = []
}

function togglePause() {
  game.paused = !game.paused
  game.syncUi(true)
}
function toggleMute() {
  muted.value = !muted.value
  game.audio.setMuted(muted.value)
}
function restart() {
  over.value = null
  offers.value = []
  eraBanner.value = null
  ui.rosterOpen = false
  game.reset()
}

function onHotkey(e) {
  if (!started.value || over.value) return
  if (e.key === 'Escape') {
    ui.rosterOpen = false
    return
  }
  if (e.target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return
  const k = e.key.toLowerCase()
  if (k === 'n') {
    toggleRoster()
    return
  }
  const n = parseInt(e.key)
  if (n >= 1 && n <= tools.length) {
    game.setTool(tools[n - 1].id)
  }
}

onMounted(() => {
  game = new FrontierGame(canvasEl.value, ui, {
    toast,
    offerUpgrades: (list) => { offers.value = list },
    eraAdvance: (era) => {
      flash.value = true
      setTimeout(() => { flash.value = false }, 1400)
      eraBanner.value = era
      setTimeout(() => { eraBanner.value = null }, 3800)
    },
    gameOver: (win, stats) => { over.value = { win, stats } }
  })
  game.paused = true // wait behind the intro screen
  window.__frontierGame = game // debug/testing hook (same pattern as __cityDebug)
  window.addEventListener('keydown', onHotkey)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onHotkey)
  if (game) game.destroy()
})
</script>

<style scoped>
.frontier-root {
  position: fixed;
  inset: 0;
  background: #10151c;
  overflow: hidden;
  font-family: 'Segoe UI', system-ui, sans-serif;
  color: #e8ecf1;
  user-select: none;
}
.game-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  touch-action: none;
  cursor: crosshair;
}

/* model thumbnails */
:deep(.gicon) {
  display: inline-block;
  vertical-align: middle;
  border-radius: 4px;
  object-fit: contain;
}
:deep(.gicon-fb) {
  display: inline-grid;
  place-items: center;
  background: rgba(255, 255, 255, 0.12);
  font-weight: 700;
  text-transform: uppercase;
}

/* ---------- HUD chrome ---------- */
.hud {
  position: absolute;
  z-index: 5;
  pointer-events: auto;
}
.top-left {
  top: 12px;
  left: 12px;
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  max-width: 40vw;
}
.res {
  background: rgba(12, 17, 26, 0.82);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 10px;
  padding: 5px 10px;
  font-size: 14px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 6px;
  backdrop-filter: blur(6px);
}

.top-center {
  top: 12px;
  left: 50%;
  transform: translateX(-50%);
  text-align: center;
  background: rgba(12, 17, 26, 0.82);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 12px;
  padding: 8px 18px 10px;
  backdrop-filter: blur(6px);
  min-width: 260px;
}
.era-line {
  font-size: 11px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  opacity: 0.65;
}
.wave-line { font-size: 15px; margin-top: 2px; }
.cmd-hp {
  height: 5px;
  border-radius: 3px;
  margin-top: 6px;
  background: rgba(255, 255, 255, 0.12);
  overflow: hidden;
}
.cmd-hp-fill { height: 100%; background: #ff8f6b; border-radius: 3px; transition: width 0.2s; }
.cmd-hp.down .cmd-hp-fill { background: #666; }
.mini-cta {
  margin-top: 7px;
  background: linear-gradient(135deg, #e8a24c, #d97c2b);
  color: #1a1206;
  border: none;
  border-radius: 8px;
  font-weight: 700;
  font-size: 13px;
  padding: 6px 14px;
  cursor: pointer;
}
.mini-cta.rally { background: linear-gradient(135deg, #ff8f6b, #e0524f); color: #fff; }
.mini-cta:disabled { opacity: 0.45; cursor: default; }

.top-right {
  top: 12px;
  right: 12px;
  display: flex;
  gap: 6px;
}
.icon-btn {
  width: 38px;
  height: 38px;
  display: grid;
  place-items: center;
  background: rgba(12, 17, 26, 0.82);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 10px;
  cursor: pointer;
  color: inherit;
  text-decoration: none;
}
.icon-btn svg { width: 19px; height: 19px; }
.icon-btn:hover { border-color: rgba(255, 255, 255, 0.35); }
.icon-btn.lit { border-color: #ff7a6b; background: rgba(255, 122, 107, 0.18); }

/* first-person crosshair */
.crosshair {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 18px;
  height: 18px;
  transform: translate(-50%, -50%);
  z-index: 4;
  pointer-events: none;
}
.crosshair::before,
.crosshair::after {
  content: '';
  position: absolute;
  background: rgba(255, 255, 255, 0.85);
  box-shadow: 0 0 4px rgba(0, 0, 0, 0.9);
}
.crosshair::before {
  left: 50%;
  top: 2px;
  bottom: 2px;
  width: 2px;
  transform: translateX(-50%);
}
.crosshair::after {
  top: 50%;
  left: 2px;
  right: 2px;
  height: 2px;
  transform: translateY(-50%);
}

/* ---------- tool bar ---------- */
.tool-bar {
  bottom: 12px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 6px;
  padding: 7px;
  background: rgba(12, 17, 26, 0.85);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 14px;
  backdrop-filter: blur(8px);
}
.tool-btn {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  min-width: 68px;
  padding: 8px 6px 6px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  color: inherit;
  cursor: pointer;
  font-size: 11px;
}
.tool-btn:hover { border-color: rgba(255, 255, 255, 0.4); }
.tool-btn.active {
  border-color: #e8a24c;
  background: rgba(232, 162, 76, 0.16);
}
.t-name { font-weight: 600; }
.t-tier {
  position: absolute;
  top: 3px;
  right: 5px;
  font-size: 9px;
  opacity: 0.6;
  font-weight: 700;
}
.b-key {
  position: absolute;
  top: 3px;
  left: 5px;
  font-size: 9px;
  opacity: 0.5;
}

/* ---------- placing hint ---------- */
.placing-hint {
  bottom: 92px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(12, 17, 26, 0.85);
  border: 1px solid rgba(126, 217, 87, 0.4);
  border-radius: 10px;
  padding: 7px 14px;
  font-size: 12px;
  backdrop-filter: blur(6px);
}

/* ---------- build menu ---------- */
.build-menu {
  z-index: 24;
  background: rgba(6, 9, 15, 0.6);
}
.menu-box {
  width: min(760px, 94vw);
  max-height: 82vh;
  overflow-y: auto;
  background: rgba(14, 19, 28, 0.97);
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 16px;
  padding: 16px;
}
.menu-head {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 17px;
  margin-bottom: 12px;
}
.menu-sub { font-size: 11px; opacity: 0.55; }
.menu-close {
  margin-left: auto;
  background: none;
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: inherit;
  border-radius: 7px;
  width: 26px;
  height: 26px;
  cursor: pointer;
  font-size: 12px;
}
.menu-close:hover { border-color: #fff; }
.menu-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(128px, 1fr));
  gap: 8px;
}
.menu-card {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  padding: 12px 6px 8px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  color: inherit;
  cursor: pointer;
  font-size: 11px;
}
.menu-card:hover:not(.locked) { border-color: #7ed957; }
.menu-card.poor { opacity: 0.75; }
.menu-card.locked { opacity: 0.45; cursor: default; }
.mc-name { font-weight: 600; }
.mc-cost { opacity: 0.8; font-size: 10px; display: flex; align-items: center; gap: 2px; flex-wrap: wrap; justify-content: center; }
.mc-count {
  position: absolute;
  top: 4px;
  right: 6px;
  font-size: 9px;
  opacity: 0.55;
}
.mc-count.full { color: #ffd35e; opacity: 1; }
.mc-lock {
  font-size: 9px;
  color: #ffd35e;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

/* ---------- roster ---------- */
.roster {
  left: 12px;
  top: 64px;
  width: 320px;
  max-height: min(64vh, 560px);
  display: flex;
  flex-direction: column;
  background: rgba(12, 17, 26, 0.92);
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 12px;
  backdrop-filter: blur(8px);
  z-index: 8;
}
.roster-head {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px 6px;
  font-size: 14px;
}
.roster-all {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 2px 12px 8px;
  font-size: 11px;
  opacity: 0.9;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}
.roster-list { overflow-y: auto; padding: 4px 8px 8px; }
.roster-row {
  display: grid;
  grid-template-columns: 64px 1fr auto;
  align-items: center;
  gap: 6px;
  padding: 4px 4px;
  border-radius: 8px;
  font-size: 11px;
}
.roster-row:hover { background: rgba(255, 255, 255, 0.05); }
.soldier-row { border-top: 1px dashed rgba(255, 255, 255, 0.08); }
.r-name { font-weight: 700; }
.r-status { opacity: 0.6; font-size: 10px; }
.r-jobs { display: flex; gap: 2px; }
.job-btn {
  width: 24px;
  height: 24px;
  display: grid;
  place-items: center;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  cursor: pointer;
  color: inherit;
}
.job-btn:hover { border-color: rgba(255, 255, 255, 0.45); }
.job-btn.active { border-color: #e8a24c; background: rgba(232, 162, 76, 0.2); }
.roster-empty { padding: 10px; font-size: 11px; opacity: 0.55; }

/* ---------- interact panel ---------- */
.select-panel {
  right: 12px;
  bottom: 12px;
  width: 280px;
  background: rgba(12, 17, 26, 0.92);
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 12px;
  padding: 12px;
  backdrop-filter: blur(8px);
  z-index: 8;
}
.sel-head { display: flex; align-items: center; gap: 8px; font-size: 15px; }
.sel-lvl { font-size: 10px; opacity: 0.65; font-weight: 700; }
.sel-idle {
  font-size: 10px;
  background: rgba(255, 211, 94, 0.2);
  color: #ffd35e;
  border-radius: 6px;
  padding: 2px 6px;
}
.sel-head .menu-close { margin-left: auto; width: 22px; height: 22px; }
.sel-hp {
  height: 6px;
  border-radius: 3px;
  background: rgba(255, 255, 255, 0.12);
  margin: 8px 0 5px;
  overflow: hidden;
}
.sel-hp-fill { height: 100%; background: #7ed957; border-radius: 3px; }
.sel-sub { font-size: 11px; opacity: 0.7; line-height: 1.45; }
.sel-actions { display: flex; gap: 6px; margin-top: 10px; }
.sel-actions button {
  flex: 1;
  border: 1px solid rgba(255, 255, 255, 0.18);
  background: rgba(255, 255, 255, 0.07);
  color: inherit;
  border-radius: 8px;
  font-size: 11px;
  padding: 6px 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 3px;
  flex-wrap: wrap;
}
.sel-actions button.danger { border-color: rgba(255, 94, 94, 0.5); }
.sel-actions .upgrade-btn { border-color: rgba(126, 217, 87, 0.55); font-weight: 600; }
.sel-actions .upgrade-btn:disabled { opacity: 0.45; cursor: default; }
.sel-max { font-size: 11px; opacity: 0.55; padding: 4px; }

/* forge */
.forge-tools { margin-top: 10px; border-top: 1px solid rgba(255, 255, 255, 0.1); padding-top: 8px; }
.forge-title { font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em; opacity: 0.6; margin-bottom: 6px; }
.forge-row {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 3px 0;
  font-size: 11px;
}
.f-name { min-width: 74px; }
.f-btn {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 3px;
  border: 1px solid rgba(126, 217, 87, 0.5);
  background: rgba(126, 217, 87, 0.1);
  color: inherit;
  border-radius: 7px;
  font-size: 10px;
  padding: 3px 8px;
  cursor: pointer;
}
.f-btn:disabled { opacity: 0.45; cursor: default; border-color: rgba(255, 255, 255, 0.2); background: none; }
.f-max { margin-left: auto; font-size: 10px; opacity: 0.5; }

/* ---------- overlays ---------- */
.overlay {
  position: absolute;
  inset: 0;
  z-index: 20;
  display: grid;
  place-items: center;
  background: rgba(6, 9, 15, 0.78);
  backdrop-filter: blur(4px);
}
.intro-card {
  max-width: 540px;
  text-align: center;
  padding: 40px 34px;
  background: rgba(14, 19, 28, 0.95);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 20px;
}
.intro-kicker {
  font-size: 11px;
  letter-spacing: 0.28em;
  text-transform: uppercase;
  color: #e8a24c;
}
.intro-card h1 {
  font-size: 52px;
  margin: 8px 0 4px;
  letter-spacing: 0.12em;
  background: linear-gradient(135deg, #e8a24c, #5ee6ff);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}
.intro-tag { font-size: 15px; font-style: italic; opacity: 0.85; margin: 4px 0 14px; }
.intro-body { font-size: 13px; line-height: 1.65; opacity: 0.7; }
.intro-controls {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 6px 16px;
  margin: 18px 0 6px;
  font-size: 12px;
  opacity: 0.7;
}
.cta {
  margin-top: 18px;
  padding: 13px 34px;
  border: none;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 700;
  background: linear-gradient(135deg, #e8a24c, #d97c2b);
  color: #1a1206;
  cursor: pointer;
}
.cta:hover { filter: brightness(1.1); }
.back-link {
  display: block;
  margin-top: 14px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.5);
  text-decoration: none;
}
.back-link:hover { color: #fff; }

/* upgrade cards */
.choice-box {
  text-align: center;
  max-width: 720px;
  padding: 20px;
}
.choice-title {
  font-size: 26px;
  font-weight: 800;
  letter-spacing: 0.06em;
}
.choice-sub { opacity: 0.7; margin: 4px 0 18px; }
.cards { display: flex; gap: 14px; justify-content: center; flex-wrap: wrap; }
.card {
  width: 200px;
  padding: 20px 16px;
  background: rgba(20, 27, 39, 0.96);
  border: 1px solid rgba(255, 255, 255, 0.16);
  border-radius: 14px;
  color: inherit;
  cursor: pointer;
  text-align: center;
  transition: transform 0.12s, border-color 0.12s;
}
.card:hover {
  transform: translateY(-4px);
  border-color: #e8a24c;
}
.card-icon { display: flex; justify-content: center; }
.card-name { font-weight: 700; font-size: 15px; margin-top: 8px; }
.card-tag {
  display: inline-block;
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: #5ee6ff;
  margin: 5px 0 8px;
}
.card-desc { font-size: 12px; opacity: 0.75; line-height: 1.5; }
.reroll {
  margin-top: 18px;
  background: none;
  border: 1px solid rgba(255, 255, 255, 0.25);
  color: inherit;
  border-radius: 10px;
  padding: 8px 18px;
  font-size: 13px;
  cursor: pointer;
}
.reroll:disabled { opacity: 0.4; cursor: default; }

/* era transition flash */
.era-flash {
  position: absolute;
  inset: 0;
  z-index: 18;
  background: #fff;
  pointer-events: none;
  animation: era-flash 1.4s ease-out forwards;
}
@keyframes era-flash {
  0% { opacity: 0; }
  18% { opacity: 0.95; }
  100% { opacity: 0; }
}

/* era banner */
.era-banner {
  position: absolute;
  top: 22%;
  left: 50%;
  transform: translateX(-50%);
  text-align: center;
  z-index: 15;
  pointer-events: none;
  text-shadow: 0 2px 18px rgba(0, 0, 0, 0.8);
}
.era-banner-num {
  font-size: 15px;
  letter-spacing: 0.5em;
  color: #5ee6ff;
}
.era-banner-name {
  font-size: 44px;
  font-weight: 800;
  letter-spacing: 0.08em;
}
.era-banner-blurb { opacity: 0.85; font-style: italic; }
.banner-enter-active { transition: all 0.6s ease; }
.banner-leave-active { transition: all 0.8s ease; }
.banner-enter-from { opacity: 0; transform: translateX(-50%) translateY(18px) scale(0.94); }
.banner-leave-to { opacity: 0; transform: translateX(-50%) translateY(-14px); }

/* toasts */
.toasts {
  position: absolute;
  left: 14px;
  bottom: 14px;
  z-index: 12;
  display: flex;
  flex-direction: column;
  gap: 6px;
  pointer-events: none;
}
.toast {
  background: rgba(12, 17, 26, 0.9);
  border: 1px solid rgba(255, 255, 255, 0.16);
  border-radius: 9px;
  padding: 7px 13px;
  font-size: 13px;
  animation: toast-in 0.25s ease;
}
@keyframes toast-in {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: none; }
}

/* end stats */
.end-stats {
  display: flex;
  justify-content: center;
  gap: 22px;
  margin-top: 18px;
  flex-wrap: wrap;
}
.end-stats > div { display: flex; flex-direction: column; }
.end-stats b { font-size: 24px; }
.end-stats span { font-size: 11px; opacity: 0.6; text-transform: uppercase; letter-spacing: 0.1em; }

@media (max-width: 720px) {
  .top-left { max-width: 60vw; }
  .roster { width: 260px; }
  .select-panel { width: 230px; }
}
</style>
