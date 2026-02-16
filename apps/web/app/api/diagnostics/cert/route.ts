/**
 * GET /api/diagnostics/cert - Serve the mkcert root CA for iOS installation
 *
 * Open this URL in Safari on iOS to install the development root CA,
 * which allows the device to trust the local HTTPS dev server.
 *
 * After downloading: Settings > General > VPN & Device Management > install profile,
 * then Settings > General > About > Certificate Trust Settings > enable full trust.
 */

import { NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import { join } from 'path'

export async function GET() {
  try {
    const certPath = join(process.cwd(), 'certs', 'rootCA.pem')
    const certData = await readFile(certPath)

    return new NextResponse(certData, {
      headers: {
        'Content-Type': 'application/x-x509-ca-cert',
        'Content-Disposition': 'attachment; filename="petehome-rootCA.crt"',
        'Cache-Control': 'no-store',
      },
    })
  } catch {
    return NextResponse.json(
      { error: 'Root CA certificate not found. Is the certs/ directory present?' },
      { status: 404 }
    )
  }
}
