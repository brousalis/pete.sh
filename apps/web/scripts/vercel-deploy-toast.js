#!/usr/bin/env node
/**
 * Vercel deploy toast – Windows toasts for deployment lifecycle (start, ready, failed).
 *
 * Polls Vercel's API and shows a toast when a deploy:
 *   - starts (QUEUED / INITIALIZING / BUILDING)
 *   - finishes successfully (READY)
 *   - fails (ERROR / CANCELED)
 * Tracks the latest deployment and events already notified so each event is only shown once.
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
 *   VERCEL_PROJECT_ID     – Vercel project ID or name (default: all projects)
 *   VERCEL_TEAM_ID        – Team ID if using a team
 *   VERCEL_TOAST_APP_ID   – SnoreToast app name shown on the notification (default: petehome)
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

const BUILDING_STATES = new Set(['QUEUED', 'INITIALIZING', 'BUILDING'])
const TERMINAL_STATES = { READY: 'ready', ERROR: 'error', CANCELED: 'error' }

function loadState() {
  try {
    const raw = fs.readFileSync(STATE_FILE, 'utf8')
    const data = JSON.parse(raw)
    if (data.watchingDeploymentId != null && Array.isArray(data.notified)) return data
    return { watchingDeploymentId: null, notified: [] }
  } catch {
    return { watchingDeploymentId: null, notified: [] }
  }
}

function saveState(state) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), 'utf8')
}

function getEventForState(state) {
  if (state === 'READY') return 'ready'
  if (state === 'ERROR' || state === 'CANCELED') return 'error'
  if (BUILDING_STATES.has(state)) return 'started'
  return null
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

const APP_ICON_PATH = path.join(__dirname, '..', 'app', 'favicon.ico')
const TOAST_APP_ID = process.env.VERCEL_TOAST_APP_ID || 'petehome'

function showToast(title, message, url) {
  try {
    const notifier = require('node-notifier')
    const opts = {
      title,
      message,
      appID: TOAST_APP_ID,
      ...(url && { open: url }),
      sound: true,
    }
    if (fs.existsSync(APP_ICON_PATH)) opts.icon = APP_ICON_PATH
    notifier.notify(opts)
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
  const rawState = latest.readyState || latest.state
  const event = getEventForState(rawState)
  if (!event) return

  const projectName = latest.name || 'Project'
  const target = latest.target || 'production'
  const deploymentUrl = latest.url ? `https://${latest.url}` : null
  const inspectorUrl = latest.inspectorUrl || null
  const openUrl = deploymentUrl || inspectorUrl

  const isNewDeployment = id !== state.watchingDeploymentId
  const alreadyNotified = (state.notified || []).includes(event)

  if (isNewDeployment) {
    // Start watching this deployment; notify for its current state
    const title =
      event === 'ready'
        ? 'Vercel deploy ready'
        : event === 'error'
          ? 'Vercel deploy failed'
          : 'Vercel deploy started'
    const message =
      event === 'ready'
        ? `${projectName} (${target}) is live.`
        : event === 'error'
          ? `${projectName} (${target}): ${latest.errorMessage || rawState}`
          : `${projectName} (${target}) is building.`
    showToast(title, message, event === 'error' ? inspectorUrl : openUrl)
    saveState({ watchingDeploymentId: id, notified: [event] })
    return
  }

  if (alreadyNotified) return

  // Same deployment, new terminal state (ready or error)
  if (event === 'ready') {
    showToast(
      'Vercel deploy ready',
      `${projectName} (${target}) is live.`,
      openUrl
    )
  } else if (event === 'error') {
    showToast(
      'Vercel deploy failed',
      `${projectName} (${target}): ${latest.errorMessage || rawState}`,
      inspectorUrl
    )
  }
  if (event === 'ready' || event === 'error') {
    saveState({ ...state, notified: [...(state.notified || []), event] })
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
