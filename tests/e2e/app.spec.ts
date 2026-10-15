import { expect, test, type Page } from '@playwright/test'
import { readFileSync } from 'node:fs'

const TOOLS = ['shapes', 'infinite-line', 'flow-field', 'contours', 'ridges', 'tiles', 'halftone', 'ascii', 'aura']
const SHOTS = process.env.SHOTS !== '0'

async function open(page: Page, tool: string, theme: 'light' | 'dark' = 'light') {
  await page.addInitScript((t) => localStorage.setItem('canvas-theme', t), theme)
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
  await page.goto(`/?tool=${tool}&seed=1234`)
  await expect(page.locator('.artboard svg')).toBeVisible()
  await expect(page.locator('.artboard')).not.toHaveClass(/is-busy/)
  return errors
}

for (const tool of TOOLS) {
  test(`${tool} renders without errors, light and dark`, async ({ page }) => {
    const errors = await open(page, tool)
    await expect(page.locator(`.tool-btn[data-tool="${tool}"]`)).toHaveAttribute('aria-current', 'page')
    await expect(page.locator('.props-head').first()).toBeVisible()
    if (SHOTS) await page.screenshot({ path: `tests/screenshots/${tool}-1440-light.png` })
    await page.locator('button[aria-label="Switch light or dark"]').click()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
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
  const file = await (await download).path()
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

test("follows Foundry's theme setting when Canvas has none of its own", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('gitwork.theme.v1', 'dark'))
  await page.goto('/?tool=shapes&seed=1')
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
})
