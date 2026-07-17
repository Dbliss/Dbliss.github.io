import { chromium } from 'playwright'
const browser = await chromium.launch()
const page = await browser.newPage()
page.on('console', m => { if (m.type() === 'error') console.log('[console]', m.text().slice(0, 300)) })
page.on('pageerror', e => console.log('[pageerror]', e.message.slice(0, 400)))
await page.goto('http://localhost:4381/#/frontier', { waitUntil: 'commit' })
await page.waitForTimeout(3000)
const r = await page.evaluate(async () => {
  const g = window.__frontierGame
  const before = Object.keys(g.ui.icons).length
  let err = null
  try {
    await g.view.refreshIcons()
  } catch (e) { err = e.message + '\n' + (e.stack || '').slice(0, 400) }
  return { before, after: Object.keys(g.ui.icons).length, err, keys: Object.keys(g.ui.icons) }
})
console.log(JSON.stringify(r, null, 1))
await browser.close()
