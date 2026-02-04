#!/usr/bin/env node
/**
 * Vercel deploy toast – Windows toast when a Vercel deployment finishes.
 *
 * Polls Vercel's API; when the latest deployment becomes READY, shows a
 * Windows toast. Tracks the last notified deployment so each finish is
 * only notified once.
 *
 * Usage:
 *   node scripts/vercel-deploy-toast.js           # Check once and exit
 *   node scripts/vercel-deploy-toast.js --watch   # Poll every 2 min until stopped
 *   node scripts/vercel-deploy-toast.js --watch --interval 60000  # Poll every 60s
 *
 * Env (required):
 *   VERCEL_TOKEN   – Vercel API token (create at vercel.com/account/tokens)
 *
 * Env (optional):
 *   VERCEL_PROJECT_ID – Vercel project ID or name (default: all projects)
 *   VERCEL_TEAM_ID    – Team ID if using a team
 *
 * To run on a schedule (e.g. every 2 min) without --watch:
 *   Task Scheduler → Create Task → Trigger: Every 2 minutes
 *   Action: Start program → node, Args: "D:\...\apps\web\scripts\vercel-deploy-toast.js"
 *   Start in: D:\...\apps\web (so .env is found if you use dotenv)
 */

const https = require('https')
const path = require('path')
const fs = require('fs')

// Load .env from apps/web when run via yarn vercel-toast
try {
  const envPath = path.resolve(__dirname, '..', '.env')
  if (fs.existsSync(envPath)) require('dotenv').config({ path: envPath })
} catch (_) {}

const args = process.argv.slice(2)
const getArg = (name, defaultValue) => {
  const i = args.indexOf(`--${name}`)
  if (i === -1) return defaultValue
  if (typeof defaultValue === 'boolean') return true
  return args[i + 1] ?? defaultValue
}

const WATCH = getArg('watch', false)
const INTERVAL_MS = parseInt(getArg('interval', '10000'), 10) // 10s default
const STATE_FILE = path.join(__dirname, '.vercel-deploy-toast-state.json')

function loadState() {
  try {
    const raw = fs.readFileSync(STATE_FILE, 'utf8')
    return JSON.parse(raw)
  } catch {
    return { lastNotifiedDeploymentId: null }
  }
}

function saveState(state) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), 'utf8')
}

function fetchDeployments() {
  const token = process.env.VERCEL_TOKEN
  if (!token) {
    console.error('VERCEL_TOKEN is required. Create one at https://vercel.com/account/tokens')
    process.exit(1)
  }

  const projectId = process.env.VERCEL_PROJECT_ID || ''
  const teamId = process.env.VERCEL_TEAM_ID || ''
  const params = new URLSearchParams({ limit: '5' })
  if (projectId) params.set('projectId', projectId)
  if (teamId) params.set('teamId', teamId)
  const qs = params.toString()
  const url = `https://api.vercel.com/v6/deployments${qs ? `?${qs}` : ''}`

  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      headers: { Authorization: `Bearer ${token}` },
    }, (res) => {
      let body = ''
      res.on('data', (ch) => { body += ch })
      res.on('end', () => {
        if (res.statusCode !== 200) {
          reject(new Error(`Vercel API ${res.statusCode}: ${body}`))
          return
        }
        try {
          resolve(JSON.parse(body))
        } catch (e) {
          reject(e)
        }
      })
    })
    req.on('error', reject)
  })
}

function showToast(title, message, url) {
  try {
    const notifier = require('node-notifier')
    notifier.notify({
      title,
      message,
      ...(url && { open: url }),
      sound: true,
    })
  } catch (e) {
    console.error('node-notifier not available. Install with: yarn add -D node-notifier', e.message)
  }
}

async function checkAndNotify() {
  const state = loadState()
  let deployments
  try {
    const data = await fetchDeployments()
    deployments = data.deployments || []
  } catch (e) {
    console.error('Vercel API error:', e.message)
    return
  }

  const latest = deployments[0]
  if (!latest) return

  const id = latest.uid || latest.id
  const readyState = latest.readyState || latest.state
  const isReady = readyState === 'READY'

  if (isReady && id !== state.lastNotifiedDeploymentId) {
    const projectName = latest.name || 'Project'
    const target = latest.target || 'production'
    const deploymentUrl = latest.url ? `https://${latest.url}` : null
    const inspectorUrl = latest.inspectorUrl || null

    showToast(
      'Vercel deploy ready',
      `${projectName} (${target}) is live.${deploymentUrl ? ` ${deploymentUrl}` : ''}`,
      deploymentUrl || inspectorUrl
    )
    saveState({ lastNotifiedDeploymentId: id })
  }
}

async function main() {
  if (WATCH) {
    console.log(`Watching for deployments (every ${INTERVAL_MS / 1000}s). Ctrl+C to stop.`)
    await checkAndNotify()
    setInterval(checkAndNotify, INTERVAL_MS)
  } else {
    await checkAndNotify()
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
