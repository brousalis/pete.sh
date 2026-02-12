import { createRequire } from 'module'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

const require = createRequire(import.meta.url)
const __dirname = path.dirname(fileURLToPath(import.meta.url))

const swc = require('next/dist/build/swc')
await swc.loadBindings()
const b = swc.getBindingsSync()

// Clean up
fs.rmSync(path.join(__dirname, '.next'), { recursive: true, force: true })

const tests = [
  '.next/dev/lock',
  '.next/dev-actual/lock',
  '.next/devmode/lock',
  '.next/xdev/lock',
]

for (const p of tests) {
  const full = path.resolve(__dirname, p)
  fs.mkdirSync(path.dirname(full), { recursive: true })
  try {
    const l = b.lockfileTryAcquireSync(full)
    console.log(`${p} : ${l != null ? 'OK' : 'NOT ACQUIRED'}`)
    if (l) b.lockfileUnlockSync(l)
  } catch (e) {
    console.log(`${p} : ERROR - ${e.message}`)
  }
}

// Clean up
fs.rmSync(path.join(__dirname, '.next'), { recursive: true, force: true })
