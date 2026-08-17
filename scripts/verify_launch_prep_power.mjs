/**
 * Exercise the launch-prep power-up terminal against the running Vite server.
 */
import { chromium } from 'playwright'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const outDir = path.join(__dirname, '_tile_review')
const base = 'http://127.0.0.1:5173'

async function shot(page, name, selector = '.lp-power-term') {
  const dest = path.join(outDir, name)
  const el = page.locator(selector).first()
  if (await el.count()) {
    await el.screenshot({ path: dest })
  } else {
    await page.screenshot({ path: dest, fullPage: false })
  }
  console.log('wrote', dest)
}

async function setRange(page, selector, value) {
  await page.locator(selector).evaluate((el, v) => {
    const proto = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      'value',
    )
    proto.set.call(el, String(v))
    el.dispatchEvent(new Event('input', { bubbles: true }))
    el.dispatchEvent(new Event('change', { bubbles: true }))
  }, value)
}

async function walkToPower(page) {
  await setRange(page, '.lp-slider__input', 100)
  await page.waitForTimeout(250)

  const track = page.locator('.lp-extend-track')
  for (let attempt = 0; attempt < 4 && !(await page.locator('.lp-extend--done').count()); attempt++) {
    if (!(await track.count())) break
    const box = await track.boundingBox()
    if (!box) break
    const y = box.y + box.height * (1 - 0.69)
    await page.mouse.move(box.x + box.width / 2, box.y + box.height - 2)
    await page.mouse.down()
    await page.mouse.move(box.x + box.width / 2, y, { steps: 12 })
    await page.waitForTimeout(80)
    await page.mouse.up()
    await page.waitForTimeout(350)
  }
  if (!(await page.locator('.lp-extend--done').count())) {
    await page.screenshot({ path: path.join(outDir, 'lp-power-debug-extend.png') })
    throw new Error('extend boom did not complete')
  }

  const lift = page.getByRole('button', { name: /Lift payload/i })
  await lift.click({ timeout: 4000 })
  await page.waitForTimeout(200)

  const swing = page.locator('.lp-swing-btn')
  if (await swing.count()) {
    const box = await swing.boundingBox()
    if (box) {
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
      await page.mouse.down()
      await page.waitForTimeout(1300)
      await page.mouse.up()
      await page.waitForTimeout(250)
    }
  }

  const lower = page.getByRole('button', { name: /Lower/i })
  if (await lower.count()) await lower.click()
  await page.waitForTimeout(300)

  const connectLox = page.getByRole('button', { name: /Connect LOX/i })
  if (await connectLox.count()) {
    await connectLox.click()
    await page.getByRole('button', { name: /Connect RP-1/i }).click()
    for (const label of [/Hold to fill LOX/i, /Hold to fill RP-1/i]) {
      const hold = page.getByRole('button', { name: label })
      const box = await hold.boundingBox()
      if (!box) continue
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
      await page.mouse.down()
      await page.waitForTimeout(2400)
      await page.mouse.up()
      await page.waitForTimeout(150)
    }
  }

  await page.waitForSelector('.lp-power-term', { timeout: 8000 })
}

async function main() {
  await mkdir(outDir, { recursive: true })
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 1400, height: 1100 } })

  await page.goto(`${base}/#/gemba`, { waitUntil: 'networkidle' })
  await page.getByRole('button', { name: /Prepare for launch/i }).click()
  await page.waitForSelector('.launch-prep-pad')
  await page.waitForTimeout(400)
  await walkToPower(page)

  await page.screenshot({
    path: path.join(outDir, 'lp-power-gemba-full.png'),
  })
  await shot(page, 'lp-power-term-idle.png')

  const covers = page.locator('.lp-pwr-cover')
  const toggles = page.locator('.lp-pwr-toggle')
  const coverCount = await covers.count()
  const toggleCount = await toggles.count()
  console.log('covers', coverCount, 'toggles', toggleCount)
  if (coverCount !== 4 || toggleCount !== 4) {
    throw new Error(`expected 4 covers and 4 toggles, got ${coverCount}/${toggleCount}`)
  }

  // Interlock: later covers/switches must stay disabled.
  if (await covers.nth(1).isEnabled()) {
    throw new Error('bus 02 cover should be interlocked')
  }
  if (await toggles.nth(0).isEnabled()) {
    throw new Error('bus 01 switch should stay locked under a closed cover')
  }

  await covers.nth(0).click()
  await page.waitForTimeout(500)
  await shot(page, 'lp-power-cover-open.png')

  if (!(await toggles.nth(0).isEnabled())) {
    throw new Error('bus 01 switch should enable after the cover opens')
  }
  if (await covers.nth(1).isEnabled()) {
    throw new Error('bus 02 cover should stay locked until bus 01 charges')
  }

  await toggles.nth(0).click()
  await page.waitForTimeout(400)
  await shot(page, 'lp-power-charging.png')
  await page.waitForFunction(() => {
    const el = document.querySelector('.lp-pwr-bay--online .lp-pwr-bar__readout')
    return el && el.textContent.trim() === '100%'
  }, { timeout: 4000 })
  await shot(page, 'lp-power-bus1-online.png')

  if (!(await covers.nth(1).isEnabled())) {
    throw new Error('bus 02 cover should unlock after bus 01 is online')
  }

  // Finish the remaining three buses.
  for (let i = 1; i < 4; i++) {
    const bay = page.locator('.lp-pwr-bay').nth(i)
    await bay.locator('.lp-pwr-cover').click()
    await bay.waitFor({ state: 'visible' })
    await page.waitForSelector(`.lp-pwr-bay[data-bus-state="open"]`)
    await bay.locator('.lp-pwr-toggle').click()
    await page.waitForSelector(
      `.lp-pwr-bay[data-bus-state="charging"], .lp-pwr-bay[data-bus-state="online"], .lp-panel--complete`,
    )
    await page.waitForFunction(
      (n) =>
        document.querySelectorAll('.lp-pwr-bay--online').length >= n ||
        Boolean(document.querySelector('.lp-panel--complete')),
      i + 1,
      { timeout: 6000 },
    )
    console.log('online count', i + 1)
  }
  await page.waitForTimeout(300)
  await page.screenshot({
    path: path.join(outDir, 'lp-power-gemba-complete.png'),
  })

  // Mobile layout of a fresh power terminal.
  await page.getByRole('button', { name: /Prepare for launch/i }).click()
  await page.waitForSelector('.lp-slider__input')
  await walkToPower(page)
  await page.setViewportSize({ width: 390, height: 844 })
  await page.waitForTimeout(400)
  await page.screenshot({
    path: path.join(outDir, 'lp-power-gemba-mobile.png'),
    fullPage: true,
  })
  await page.setViewportSize({ width: 1400, height: 1100 })

  // As-is play: start a session and confirm the same scene mounts after Run Process.
  await page.goto(`${base}/#/as-is`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(400)
  const start = page.getByRole('button', { name: /Start Session/i })
  if (await start.count()) await start.click()
  const run = page.getByRole('button', { name: /Run Process/i })
  if (await run.count()) await run.click()
  await page.waitForTimeout(500)
  await page.screenshot({
    path: path.join(outDir, 'lp-power-asis-landing.png'),
  })

  // Auto-power still lives on the Launch prep tech tab (full To-be playthrough
  // to the terminal is a separate loop — manufacture + haul first).
  await page.goto(`${base}/#/redesign`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(400)
  await page.getByRole('button', { name: /Launch prep tech/i }).click()
  const autoCard = page.getByRole('button', { name: /Automatic power-up sequence/i })
  if (!(await autoCard.count())) {
    throw new Error('auto-power tech card missing from the redesign workshop')
  }
  await autoCard.click()
  await page.waitForTimeout(200)
  if ((await autoCard.getAttribute('aria-pressed')) !== 'true') {
    throw new Error('auto-power tech card did not select')
  }
  await page.screenshot({
    path: path.join(outDir, 'lp-power-autopower-card.png'),
  })

  await browser.close()
  console.log('power-terminal verify ok')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
