/**
 * Icon conversion script for petehome Electron app
 *
 * Converts the source PNG icon to:
 * - icon.ico (Windows) - multi-resolution ICO file
 * - icon.icns (Mac) - requires additional tooling, see notes below
 *
 * Usage: node scripts/convert-icons.js
 *
 * Prerequisites:
 *   npm install sharp png-to-ico --save-dev
 */

const fs = require('fs')
const path = require('path')

async function convertIcons() {
  const buildDir = path.join(__dirname, '..', 'build')
  const sourcePng = path.join(buildDir, 'icon.png')

  if (!fs.existsSync(sourcePng)) {
    console.error('Source icon not found:', sourcePng)
    console.log('Please ensure build/icon.png exists (512x512 PNG)')
    process.exit(1)
  }

  console.log('Converting icons from:', sourcePng)

  // Convert to ICO (Windows)
  try {
    const pngToIco = require('png-to-ico')
    const icoBuffer = await pngToIco(sourcePng)
    fs.writeFileSync(path.join(buildDir, 'icon.ico'), icoBuffer)
    console.log('Created: build/icon.ico')
  } catch (err) {
    console.error('Failed to create ICO:', err.message)
    console.log('Install png-to-ico: npm install png-to-ico --save-dev')
  }

  // Create different sizes for various uses
  try {
    const sharp = require('sharp')
    const sizes = [16, 32, 48, 64, 128, 256]

    for (const size of sizes) {
      await sharp(sourcePng)
        .resize(size, size)
        .png()
        .toFile(path.join(buildDir, `icon-${size}.png`))
      console.log(`Created: build/icon-${size}.png`)
    }
  } catch (err) {
    console.error('Failed to create sized PNGs:', err.message)
    console.log('Install sharp: npm install sharp --save-dev')
  }

  console.log('\n--- ICNS (Mac) Notes ---')
  console.log('To create icon.icns for Mac, you have several options:')
  console.log('1. On macOS: Use iconutil or Image2icon app')
  console.log('2. Online: Use cloudconvert.com or icoconvert.com')
  console.log('3. electron-builder can auto-generate from PNG on macOS builds')
  console.log('')
}

convertIcons().catch(console.error)
