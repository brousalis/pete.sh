import { existsSync, readFileSync } from 'fs'
import { createServer } from 'https'
import next from 'next'
import { dirname, join } from 'path'
import { fileURLToPath, parse } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

const dev = process.env.NODE_ENV !== 'production'
const hostname = process.env.HOSTNAME || '0.0.0.0'
const port = parseInt(process.env.PORT || '3000', 10)

// Certificate paths
const certDir = join(__dirname, 'certs')
const keyPath = join(certDir, 'localhost-key.pem')
const certPath = join(certDir, 'localhost.pem')

// Check if certificates exist
if (!existsSync(keyPath) || !existsSync(certPath)) {
  console.error('❌ SSL certificates not found!')
  console.error('')
  console.error('Generate them with mkcert:')
  console.error('')
  console.error('  cd apps/web/certs')
  console.error('  mkcert -key-file localhost-key.pem -cert-file localhost.pem localhost 127.0.0.1 192.168.1.9')
  console.error('')
  console.error('If you don\'t have mkcert installed:')
  console.error('  scoop install mkcert  # or: choco install mkcert')
  console.error('  mkcert -install')
  console.error('')
  process.exit(1)
}

const httpsOptions = {
  key: readFileSync(keyPath),
  cert: readFileSync(certPath),
}

const app = next({ dev, hostname, port })
const handle = app.getRequestHandler()

app.prepare().then(() => {
  createServer(httpsOptions, async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true)
      await handle(req, res, parsedUrl)
    } catch (err) {
      console.error('Error occurred handling', req.url, err)
      res.statusCode = 500
      res.end('internal server error')
    }
  }).listen(port, hostname, () => {
    console.log(``)
    console.log(`🔒 HTTPS server running at:`)
    console.log(`   https://localhost:${port}`)
    console.log(`   https://127.0.0.1:${port}`)
    console.log(`   https://192.168.1.9:${port}`)
    console.log(``)
    console.log(`Mode: ${dev ? 'development' : 'production'}`)
    console.log(``)
  })
})
