/**
 * Notification delivery.
 *
 * Web Push for desktop and the PWA, APNs for the phone. Delivery is always
 * best-effort: a failed notification must never fail the job that triggered
 * it, because that job is usually the one producing the coaching itself.
 */

import { coachDb } from './coach-data.service'

export interface CoachNotification {
  title: string
  body: string
  tag?: string
  url?: string
  /** Bypasses quiet hours. Used for red flags only. */
  urgent?: boolean
}

export interface DeliveryResult {
  webPushSent: number
  apnsSent: number
  failed: number
}

/**
 * Send to every registered device.
 *
 * Runs in the web app and the worker. The worker holds the VAPID and APNs
 * keys; when they are absent the notification is recorded and skipped rather
 * than throwing.
 */
export async function sendCoachNotification(
  notification: CoachNotification
): Promise<DeliveryResult> {
  const result: DeliveryResult = { webPushSent: 0, apnsSent: 0, failed: 0 }

  const db = coachDb()
  const { data: subscriptions } = await db
    .from('coach_push_subscription')
    .select('*')
    .eq('is_active', true)

  if (!subscriptions?.length) return result

  for (const subscription of subscriptions as {
    id: string
    kind: 'web' | 'apns'
    endpoint: string | null
    device_token: string | null
    keys: { p256dh?: string; auth?: string } | null
  }[]) {
    try {
      if (subscription.kind === 'web' && subscription.endpoint) {
        const sent = await sendWebPush(subscription, notification)
        if (sent) result.webPushSent++
        else result.failed++
      } else if (subscription.kind === 'apns' && subscription.device_token) {
        const sent = await sendApns(subscription.device_token, notification)
        if (sent) result.apnsSent++
        else result.failed++
      }

      await db
        .from('coach_push_subscription')
        .update({ last_used_at: new Date().toISOString() })
        .eq('id', subscription.id)
    } catch (error) {
      result.failed++
      console.error('[coach] Notification delivery failed:', error)
    }
  }

  return result
}

async function sendWebPush(
  subscription: {
    id: string
    endpoint: string | null
    keys: { p256dh?: string; auth?: string } | null
  },
  notification: CoachNotification
): Promise<boolean> {
  const publicKey = process.env.VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  const subject = process.env.VAPID_SUBJECT ?? 'mailto:pete@pete.sh'

  if (!publicKey || !privateKey || !subscription.endpoint || !subscription.keys) {
    return false
  }

  try {
    const webpush = (await import('web-push')).default
    webpush.setVapidDetails(subject, publicKey, privateKey)

    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.keys.p256dh ?? '',
          auth: subscription.keys.auth ?? '',
        },
      },
      JSON.stringify({
        title: notification.title,
        body: notification.body,
        tag: notification.tag ?? 'coach',
        url: notification.url ?? '/coach',
      })
    )

    return true
  } catch (error) {
    // 410 Gone means the subscription is dead; deactivate it so it stops
    // being retried on every notification.
    const statusCode = (error as { statusCode?: number }).statusCode
    if (statusCode === 404 || statusCode === 410) {
      await coachDb()
        .from('coach_push_subscription')
        .update({ is_active: false })
        .eq('id', subscription.id)
    }
    return false
  }
}

/**
 * APNs delivery.
 *
 * Uses token-based auth (a .p8 key) rather than certificates, so the
 * credential does not expire annually.
 */
async function sendApns(deviceToken: string, notification: CoachNotification): Promise<boolean> {
  const keyId = process.env.APNS_KEY_ID
  const teamId = process.env.APNS_TEAM_ID
  const bundleId = process.env.APNS_BUNDLE_ID ?? 'com.petehome.ios'
  const privateKey = process.env.APNS_PRIVATE_KEY

  if (!keyId || !teamId || !privateKey) return false

  try {
    const jwt = await buildApnsJwt({ keyId, teamId, privateKey })
    const host =
      process.env.APNS_ENVIRONMENT === 'production'
        ? 'https://api.push.apple.com'
        : 'https://api.sandbox.push.apple.com'

    const response = await fetch(`${host}/3/device/${deviceToken}`, {
      method: 'POST',
      headers: {
        authorization: `bearer ${jwt}`,
        'apns-topic': bundleId,
        'apns-push-type': 'alert',
        'apns-priority': notification.urgent ? '10' : '5',
      },
      body: JSON.stringify({
        aps: {
          alert: { title: notification.title, body: notification.body },
          sound: notification.urgent ? 'default' : undefined,
          'thread-id': notification.tag ?? 'coach',
        },
        url: notification.url ?? '/coach',
      }),
    })

    return response.ok
  } catch (error) {
    console.error('[coach] APNs delivery failed:', error)
    return false
  }
}

/** ES256-signed JWT for APNs, valid for one hour. */
async function buildApnsJwt(input: {
  keyId: string
  teamId: string
  privateKey: string
}): Promise<string> {
  const crypto = await import('node:crypto')

  const header = { alg: 'ES256', kid: input.keyId }
  const payload = { iss: input.teamId, iat: Math.floor(Date.now() / 1000) }

  const encode = (value: unknown) =>
    Buffer.from(JSON.stringify(value)).toString('base64url')

  const signingInput = `${encode(header)}.${encode(payload)}`

  const signer = crypto.createSign('SHA256')
  signer.update(signingInput)

  // APNs expects a raw r||s signature, not the DER encoding Node emits by
  // default; dsaEncoding handles the conversion.
  const signature = signer.sign(
    {
      key: input.privateKey.replace(/\\n/g, '\n'),
      dsaEncoding: 'ieee-p1363',
    },
    'base64url'
  )

  return `${signingInput}.${signature}`
}
