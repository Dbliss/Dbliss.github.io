// Temp verification script for the Frontier overhaul (run from repo root).
import { chromium } from 'playwright'

const OUT = 'C:/Users/dillo/AppData/Local/Temp/claude/C--Users-dillo-OneDrive-Desktop-github-Dbliss-github-io/5cb2daf1-3855-4de6-b59d-b30f63f93254/scratchpad'
const url = 'http://localhost:4381/#/frontier'

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
const errors = []
page.on('console', (m) => {
  if (m.type() === 'error' || m.type() === 'warning') errors.push(`[${m.type()}] ${m.text()}`)
})
page.on('pageerror', (e) => errors.push('[pageerror] ' + e.message))

await page.goto(url)
await page.waitForTimeout(2500)
await page.screenshot({ path: `${OUT}/01-intro.png` })

// start the game
await page.click('button.cta')
await page.waitForTimeout(6000) // let assets load, icons render
await page.screenshot({ path: `${OUT}/02-world.png` })

// state dump
const state = await page.evaluate(() => {
  const g = window.__frontierGame
  return {
    buildings: g.buildings.length,
    villagers: g.villagers.length,
    nodes: (() => { let n = 0; for (let i = 0; i < g.nodeAmount.length; i++) if (g.nodeAmount[i] > 0) n++; return n })(),
    tiers: (() => {
      const t = {}
      for (let i = 0; i < g.nodeAmount.length; i++) {
        if (g.nodeAmount[i] > 0) { const k = g.nodeKind[i] + ':' + g.nodeTier[i]; t[k] = (t[k] || 0) + 1 }
      }
      return t
    })(),
    icons: Object.keys(g.ui.icons).length,
    grid: [g.buildingAt.length]
  }
})
console.log('STATE', JSON.stringify(state, null, 1))

// jump
await page.evaluate(() => window.__frontierGame.jump())
await page.waitForTimeout(300)
const jumpY = await page.evaluate(() => window.__frontierGame.commander.jumpY)
console.log('JUMP_Y_MIDAIR', jumpY)

// build menu via key 4
await page.keyboard.press('4')
await page.waitForTimeout(800)
await page.screenshot({ path: `${OUT}/03-buildmenu.png` })
const menuOpen = await page.evaluate(() => window.__frontierGame.buildMenu)
console.log('BUILD_MENU_OPEN', menuOpen)
// pick the house card
await page.click('.menu-card:first-child')
await page.waitForTimeout(300)
const placing = await page.evaluate(() => window.__frontierGame.placing)
console.log('PLACING', placing)
await page.keyboard.press('Escape')

// roster
await page.keyboard.press('n')
await page.waitForTimeout(600)
await page.screenshot({ path: `${OUT}/04-roster.png` })
// assign first villager to wood via engine (UI click too fragile headless)
const jobResult = await page.evaluate(() => {
  const g = window.__frontierGame
  const v = g.villagers[0]
  g.setJob(v.uid, 'wood')
  return v.job
})
console.log('VILLAGER_JOB', jobResult)
await page.waitForTimeout(4000)
const vState = await page.evaluate(() => {
  const g = window.__frontierGame
  const v = g.villagers[0]
  return { job: v.job, state: v.state, nodeI: v.nodeI, carry: v.carry, x: v.x.toFixed(1), y: v.y.toFixed(1) }
})
console.log('VILLAGER_STATE', JSON.stringify(vState))
await page.keyboard.press('n')

// interact with the core (E near beacon)
await page.evaluate(() => {
  const g = window.__frontierGame
  g.openInteract(g.core)
})
await page.waitForTimeout(500)
await page.screenshot({ path: `${OUT}/05-interact-core.png` })

// forge flow: place a forge via engine + open its panel
const forgeState = await page.evaluate(() => {
  const g = window.__frontierGame
  g.res.wood = 500; g.res.stone = 500
  // find a clear spot near core
  let placed = false
  for (let r = 4; r < 12 && !placed; r++) {
    for (let a = 0; a < 16 && !placed; a++) {
      const x = Math.floor(64 + Math.cos(a) * r), y = Math.floor(64 + Math.sin(a) * r)
      if (g.canPlace('forge', x, y)) { g.tryPlace('forge', x, y); placed = true }
    }
  }
  const forge = g.buildings.find(b => b.type === 'forge')
  if (forge) g.openInteract(forge)
  return { placed, panel: g.ui.panel && g.ui.panel.type }
})
console.log('FORGE', JSON.stringify(forgeState))
await page.waitForTimeout(500)
await page.screenshot({ path: `${OUT}/06-forge.png` })

// research axe tier 2
const research = await page.evaluate(() => {
  const g = window.__frontierGame
  g.researchTool('axe')
  return g.toolTiers.axe
})
console.log('AXE_TIER', research)

// upgrade the core
const coreUp = await page.evaluate(() => {
  const g = window.__frontierGame
  g.res.wood = 2000; g.res.stone = 2000; g.res.food = 500
  g.upgradeBuilding(g.core)
  return g.coreLevel
})
console.log('CORE_LEVEL', coreUp)

// night: force it and check targeting modes
const night = await page.evaluate(() => {
  const g = window.__frontierGame
  g.closePanels()
  g.callNight()
  return g.phase
})
await page.waitForTimeout(9000)
const enemyInfo = await page.evaluate(() => {
  const g = window.__frontierGame
  return {
    phase: g.phase,
    enemies: g.enemies.length,
    targets: g.enemies.slice(0, 5).map(e => ({
      t: e.type, targeting: e.def.targeting,
      hasTarget: !!e.target,
      pos: [e.x.toFixed(0), e.y.toFixed(0)]
    }))
  }
})
console.log('NIGHT', night, JSON.stringify(enemyInfo))
await page.screenshot({ path: `${OUT}/07-night.png` })

console.log('CONSOLE_ISSUES', errors.length ? errors.slice(0, 15).join('\n') : 'none')
await browser.close()
