/**
 * One-time Polar AccessLink OAuth for Loop sleep comparison.
 *
 * Prerequisites:
 *   1. Create a client at https://admin.polaraccesslink.com
 *   2. Set redirect URI to http://127.0.0.1:18765/callback (or POLAR_REDIRECT_URI)
 *   3. Set POLAR_CLIENT_ID + POLAR_CLIENT_SECRET in apps/web/.env
 *   4. Keep Polar Flow → Apple Health sleep sync OFF while comparing
 *
 * Usage:
 *   cd apps/web && yarn polar:oauth
 *
 * AccessLink retains sleep for 28 days — sync regularly via cron polar-sleep.
 */

import http from 'node:http'
import { createInterface } from 'node:readline'

import { config as loadEnv } from 'dotenv'

loadEnv({ path: '.env.local' })
loadEnv({ path: '.env' })

import {
  exchangePolarCode,
  getPolarAuthUrl,
  getPolarRedirectUri,
  isPolarConfigured,
  registerPolarUser,
  savePolarOAuth,
  syncPolarSleep,
} from '../lib/services/polar.service'

function openBrowser(url: string): void {
  const { exec } = require('node:child_process') as typeof import('node:child_process')
  const cmd =
    process.platform === 'win32'
      ? `start "" "${url}"`
      : process.platform === 'darwin'
        ? `open "${url}"`
        : `xdg-open "${url}"`
  exec(cmd)
}

function promptLine(question: string): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close()
      resolve(answer.trim())
    })
  })
}

function parseListen(redirectUri: string): { host: string; port: number; path: string } {
  const url = new URL(redirectUri)
  return {
    host: url.hostname,
    port: url.port ? Number(url.port) : url.protocol === 'https:' ? 443 : 80,
    path: url.pathname || '/callback',
  }
}

function extractCode(raw: string, expectedState: string): string {
  const trimmed = raw.trim()
  if (!trimmed.includes('://') && !trimmed.includes('?')) {
    return trimmed
  }
  const url = new URL(trimmed)
  const error = url.searchParams.get('error')
  if (error) throw new Error(`Polar auth error: ${error}`)
  const state = url.searchParams.get('state')
  if (state && state !== expectedState) {
    throw new Error('OAuth state mismatch — re-run yarn polar:oauth')
  }
  const code = url.searchParams.get('code')
  if (!code) throw new Error('No code in callback URL')
  return code
}

async function runLocalOAuth(state: string, authUrl: string): Promise<string> {
  const redirectUri = getPolarRedirectUri()
  const listen = parseListen(redirectUri)

  console.log(`\nPolar OAuth redirect URI: ${redirectUri}`)
  console.log('This exact URI must be listed in your AccessLink client settings:')
  console.log('  https://admin.polaraccesslink.com\n')

  try {
    return await new Promise<string>((resolve, reject) => {
      const server = http.createServer((req, res) => {
        try {
          const reqUrl = new URL(req.url || '/', `http://${listen.host}:${listen.port}`)
          if (reqUrl.pathname !== listen.path) {
            res.writeHead(404)
            res.end('Not found')
            return
          }

          const error = reqUrl.searchParams.get('error')
          if (error) {
            res.writeHead(400, { 'Content-Type': 'text/html' })
            res.end(`<h1>Auth failed</h1><p>${error}</p>`)
            server.close()
            reject(new Error(`Polar auth error: ${error}`))
            return
          }

          const returnedState = reqUrl.searchParams.get('state')
          const authCode = reqUrl.searchParams.get('code')
          if (returnedState !== state || !authCode) {
            res.writeHead(400, { 'Content-Type': 'text/html' })
            res.end('<h1>Invalid callback</h1>')
            server.close()
            reject(new Error('Invalid OAuth callback (state/code mismatch)'))
            return
          }

          res.writeHead(200, { 'Content-Type': 'text/html' })
          res.end(
            '<h1>Polar connected</h1><p>You can close this tab and return to the terminal.</p>'
          )
          server.close()
          resolve(authCode)
        } catch (err) {
          server.close()
          reject(err)
        }
      })

      server.on('error', reject)
      server.listen(listen.port, listen.host, () => {
        openBrowser(authUrl)
        console.log(
          `Listening on ${listen.host}:${listen.port}${listen.path} for Polar callback…`
        )
      })
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.log(`Local callback failed (${message}) — paste the redirect URL instead.\n`)
    openBrowser(authUrl)
    console.log(`Auth URL:\n${authUrl}\n`)
    const pasted = await promptLine('Paste redirect URL (or code): ')
    return extractCode(pasted, state)
  }
}

async function main(): Promise<void> {
  if (!isPolarConfigured()) {
    throw new Error(
      'Set POLAR_CLIENT_ID and POLAR_CLIENT_SECRET in apps/web/.env (from admin.polaraccesslink.com)'
    )
  }

  console.log(
    '\nLeave Polar Flow → Apple Health sleep sync OFF while comparing devices.\n'
  )

  const state = `polar-${Date.now()}`
  const authUrl = getPolarAuthUrl(state)
  const code = await runLocalOAuth(state, authUrl)

  const tokens = await exchangePolarCode(code)
  await savePolarOAuth(tokens)
  console.log(`Tokens saved (polar user ${tokens.x_user_id}, expires in ${tokens.expires_in}s)`)

  const registered = await registerPolarUser(tokens.access_token, 'petehome')
  console.log(
    registered.alreadyRegistered
      ? 'AccessLink user already registered'
      : `AccessLink user registered: ${registered.polarUserId}`
  )

  const sync = await syncPolarSleep()
  console.log(
    sync.skipped
      ? `Sleep sync skipped: ${sync.reason}`
      : `Sleep sync: upserted ${sync.upserted} night(s)${sync.reason ? ` (${sync.reason})` : ''}`
  )
}

main().catch((error) => {
  console.error('[polar-oauth] Fatal:', error instanceof Error ? error.message : error)
  process.exit(1)
})
