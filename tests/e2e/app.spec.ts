import { expect, test, type Page } from '@playwright/test'
import { readFileSync } from 'node:fs'

const TOOLS = ['shapes', 'infinite-line', 'flow-field', 'contours', 'ridges', 'tiles', 'halftone', 'ascii', 'aura', 'phyllotaxis', 'isometric', 'starburst', 'orbits', 'waves', 'voronoi', 'dot-grid', 'op-art', 'hex-grid', 'circle-text', 'wave-text', 'type-stack', 'monogram', 'mosaic', 'dither', 'scanlines', 'stipple', 'mesh-gradient', 'linear-gradient', 'colour-bands', 'palette-cards']
const SHOTS = process.env.SHOTS !== '0'

async function open(page: Page, tool: string, theme: 'light' | 'dark' = 'light') {
  await page.addInitScript((t) => localStorage.setItem('gitwork.theme.v1', t), theme)
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
  await page.goto(`/?tool=${tool}&seed=1234`)
  await expect(page.locator('.artboard svg')).toBeVisible()
  await expect(page.locator('.artboard')).not.toHaveClass(/is-busy/)
  return errors
}

for (const tool of TOOLS) {
  test(`${tool} renders without errors, light and dark`, async ({ page, context }) => {
    const errors = await open(page, tool)
    await expect(page.locator(`.tool-btn[data-tool="${tool}"]`)).toHaveAttribute('aria-current', 'page')
    await expect(page.locator('.props-head').first()).toBeVisible()
    if (SHOTS) await page.screenshot({ path: `tests/screenshots/${tool}-1440-light.png` })
    // Foundry's toggle, flipped in another tab, as a person would.
    const foundry = await context.newPage()
    await foundry.goto('/?tool=shapes&seed=1')
    await foundry.evaluate(() => localStorage.setItem('gitwork.theme.v1', 'dark'))
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
    await foundry.close()
    if (SHOTS) await page.screenshot({ path: `tests/screenshots/${tool}-1440-dark.png` })
    expect(errors).toEqual([])
  })
}

test('phone layout has no sideways scroll', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await open(page, 'shapes')
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
  expect(overflow).toBeLessThanOrEqual(0)
  if (SHOTS) await page.screenshot({ path: 'tests/screenshots/shapes-375-light.png', fullPage: true })
})

test('sliders update the artwork and undo restores it', async ({ page }) => {
  await open(page, 'shapes')
  const before = await page.locator('.artboard').innerHTML()
  const box = page.locator('.field[data-key="copies"] input[type="number"]')
  await box.fill('3')
  await box.press('Enter')
  await expect.poll(() => page.locator('.artboard').innerHTML()).not.toBe(before)
  await page.locator('button[aria-label="Undo"]').click()
  await expect.poll(() => page.locator('.artboard').innerHTML()).toBe(before)
})

test('conditional fields follow their controls', async ({ page }) => {
  await open(page, 'shapes')
  await expect(page.locator('.field[data-key="cols"]')).toBeHidden()
  await page.locator('.field[data-key="layout"] button', { hasText: 'Grid' }).click()
  await expect(page.locator('.field[data-key="cols"]')).toBeVisible()
  await expect(page.locator('.field[data-key="copies"]')).toBeHidden()
})

test('randomise changes the seed and the artwork', async ({ page }) => {
  await open(page, 'flow-field')
  const before = await page.locator('.artboard').innerHTML()
  await page.keyboard.press('r')
  await expect.poll(() => page.locator('.artboard').innerHTML()).not.toBe(before)
})

test('ASCII text export is offered and words render as glyphs', async ({ page }) => {
  await open(page, 'ascii')
  await expect(page.locator('.artboard text').first()).toBeVisible()
  await page.getByRole('button', { name: /Export/ }).click()
  await expect(page.getByRole('menuitem', { name: /Text/ })).toBeEnabled()
  await page.keyboard.press('Escape')
})

test('PNG export produces an image', async ({ page }) => {
  await open(page, 'contours')
  await page.evaluate(() => delete (window as any).showSaveFilePicker)
  await page.getByRole('button', { name: /Export/ }).click()
  const download = page.waitForEvent('download')
  await page.getByRole('menuitem', { name: /PNG.*1×/ }).click()
  const d = await download
  expect(d.suggestedFilename()).toMatch(/^gitwork-artwork-contours/)
  const file = await d.path()
  const bytes = readFileSync(file!)
  expect(bytes.subarray(1, 4).toString()).toBe('PNG')
})

test('save writes a self-contained file that reopens to the same artwork', async ({ page, context }) => {
  await open(page, 'tiles')
  await page.locator('.title-input').fill('Round trip')
  await page.locator('.title-input').press('Enter')
  const artwork = await page.locator('.artboard').innerHTML()
  // Force the download path (no File System Access in headless runs).
  await page.evaluate(() => delete (window as any).showSaveFilePicker)
  const download = page.waitForEvent('download')
  await page.keyboard.press('Control+s')
  const d = await download
  expect(d.suggestedFilename()).toBe('Round_trip.canvas.html')
  const html = readFileSync((await d.path())!, 'utf8')
  expect(html).toContain('id="canvas-doc"')
  expect(html).not.toMatch(/<(script|link)[^>]+(src|href)="https?:/)

  const page2 = await context.newPage()
  await page2.route('http://saved.test/', (r) => r.fulfill({ body: html, contentType: 'text/html' }))
  await page2.goto('http://saved.test/')
  await expect(page2.locator('.title-input')).toHaveValue('Round trip')
  await expect(page2.locator('.tool-btn[data-tool="tiles"]')).toHaveAttribute('aria-current', 'page')
  await expect.poll(() => page2.locator('.artboard').innerHTML()).toBe(artwork)
})

test('shows a way back to Foundry only when hosted at /canvas', async ({ page, context }) => {
  await open(page, 'shapes')
  await expect(page.getByRole('link', { name: '← Foundry' })).toHaveCount(0)

  const html = readFileSync('dist/index.html', 'utf8')
  const hosted = await context.newPage()
  await hosted.route('http://foundry.test/canvas', (r) => r.fulfill({ body: html, contentType: 'text/html' }))
  await hosted.goto('http://foundry.test/canvas')
  await expect(hosted.getByRole('link', { name: '← Foundry' })).toHaveAttribute('href', '/app')
})

test("follows Foundry's theme and has no toggle of its own", async ({ page, context }) => {
  // A choice left over from the old Canvas toggle must not override Foundry.
  await page.addInitScript(() => {
    localStorage.setItem('canvas-theme', 'light')
    localStorage.setItem('gitwork.theme.v1', 'dark')
  })
  await page.goto('/?tool=shapes&seed=1')
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await expect(page.locator('button[aria-label="Switch light or dark"]')).toHaveCount(0)
  // Flipping Foundry's setting in another tab reaches this window live.
  const other = await context.newPage()
  await other.goto('/?tool=shapes&seed=1')
  await other.evaluate(() => localStorage.setItem('gitwork.theme.v1', 'light'))
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
})

test('the artboard is one setting shared by every tool, and it saves', async ({ page, context }) => {
  await open(page, 'shapes')
  // One artboard block, above the tool's settings, marked as shared.
  await expect(page.locator('.props-global .props-head')).toHaveCount(1)
  await expect(page.locator('.props-global .props-head')).toContainText('Every tool')
  await expect(page.locator('.props-tool .props-head', { hasText: 'Artboard' })).toHaveCount(0)

  await page.locator('#artboard-size').selectOption('story')
  const seed = page.locator('.props-global input[aria-label="Seed"]')
  await seed.fill('4242')
  await seed.press('Enter')
  await page.locator('.props-global').getByRole('button', { name: '#FF4F00', exact: true }).click()

  for (const tool of TOOLS) {
    await page.locator(`.tool-btn[data-tool="${tool}"]`).click()
    await expect(page.locator('.artboard svg'), tool).toHaveAttribute('viewBox', '0 0 1080 1920')
    await expect(page.locator('#artboard-size'), tool).toHaveValue('story')
    await expect(seed, tool).toHaveValue('4242')
    await expect(page.locator('.stage-bar'), tool).toContainText('seed 4242')
    await expect(page.locator('.artboard svg > rect').first(), tool).toHaveAttribute('fill', '#FF4F00')
  }

  // Resetting a tool's settings leaves the shared artboard alone.
  await page.locator('.props-tool button', { hasText: /^Reset/ }).click()
  await expect(page.locator('#artboard-size')).toHaveValue('story')

  await page.evaluate(() => delete (window as any).showSaveFilePicker)
  const download = page.waitForEvent('download')
  await page.keyboard.press('Control+s')
  const d = await download
  expect(d.suggestedFilename()).toBe('Gitwork_artwork.canvas.html')
  const html = readFileSync((await d.path())!, 'utf8')
  const reopened = await context.newPage()
  await reopened.route('http://saved.test/', (r) => r.fulfill({ body: html, contentType: 'text/html' }))
  await reopened.goto('http://saved.test/')
  for (const tool of ['shapes', 'mesh-gradient', 'dither']) {
    await reopened.locator(`.tool-btn[data-tool="${tool}"]`).click()
    await expect(reopened.locator('.artboard svg'), tool).toHaveAttribute('viewBox', '0 0 1080 1920')
    await expect(reopened.locator('.props-global input[aria-label="Seed"]'), tool).toHaveValue('4242')
  }
})

test('no control in any tool can scroll the frame up the page', async ({ page }) => {
  await open(page, 'shapes')
  const frameOffset = () => page.evaluate(() => ({
    doc: document.scrollingElement!.scrollTop + window.scrollY,
    app: Math.round(document.querySelector('.app')!.getBoundingClientRect().top),
  }))
  for (const tool of TOOLS) {
    await page.locator(`.tool-btn[data-tool="${tool}"]`).click()
    const toggles = page.locator('.props .toggle:visible')
    const n = await toggles.count()
    for (let i = 0; i < n; i++) {
      await toggles.nth(i).click()
      expect(await frameOffset(), `${tool} toggle ${i}`).toEqual({ doc: 0, app: 0 })
      await toggles.nth(i).click()
    }
    // Keyboard focus and scrollIntoView must not move it either.
    await page.evaluate(() => document.querySelector('.props .props-reset button')?.scrollIntoView())
    expect(await frameOffset(), `${tool} scrollIntoView`).toEqual({ doc: 0, app: 0 })
  }
})
