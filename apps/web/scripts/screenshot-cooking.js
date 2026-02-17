/**
 * Takes a full-page screenshot of the cooking page.
 * Run: node scripts/screenshot-cooking.js
 * Requires dev server: yarn dev (or yarn dev:https for boufos.local)
 *
 * Set SCREENSHOT_URL to override: SCREENSHOT_URL=http://localhost:3000/cooking node scripts/screenshot-cooking.js
 */
const puppeteer = require('puppeteer-core')
const path = require('path')
const fs = require('fs')

function findChrome() {
  const candidates =
    process.platform === 'win32'
      ? [
          path.join(process.env.PROGRAMFILES || '', 'Google', 'Chrome', 'Application', 'chrome.exe'),
          path.join(process.env['PROGRAMFILES(X86)'] || '', 'Google', 'Chrome', 'Application', 'chrome.exe'),
          path.join(process.env.LOCALAPPDATA || '', 'Google', 'Chrome', 'Application', 'chrome.exe'),
        ]
      : process.platform === 'darwin'
        ? ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome']
        : ['/usr/bin/google-chrome', '/usr/bin/chromium-browser', '/usr/bin/chromium']

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate
  }
  console.error('Could not find Chrome. Set CHROME_PATH env var.')
  process.exit(1)
}

const CHROME_PATH = process.env.CHROME_PATH || findChrome()
const URL = process.env.SCREENSHOT_URL || 'https://boufos.local:3000/cooking'
const OUTPUT = path.join(__dirname, '../public/cooking-screenshot.png')

async function main() {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: CHROME_PATH,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--ignore-certificate-errors'],
  })

  try {
    const page = await browser.newPage()

    // Set viewport for desktop (sidebar visible at lg: 1024px+)
    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 })

    await page.goto(URL, {
      waitUntil: 'networkidle2',
      timeout: 20000,
    })

    // Ensure sidebar is open: click PanelLeftOpen if sidebar is collapsed
    const sidebarToggle = await page.$('button[title="Show meal plan & shopping"]')
    if (sidebarToggle) {
      await sidebarToggle.click()
      await new Promise((r) => setTimeout(r, 300))
    }

    // Wait for content to settle
    await new Promise((r) => setTimeout(r, 500))

    await page.screenshot({
      path: OUTPUT,
      fullPage: true,
    })

    console.log(`Screenshot saved to: ${OUTPUT}`)
  } finally {
    await browser.close()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
