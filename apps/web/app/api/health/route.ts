import { NextResponse } from 'next/server'

/** Lightweight liveness probe for local / LAN clients. */
export async function GET() {
  return NextResponse.json({ ok: true, service: 'petehome' })
}
