import path from 'path'

/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {
    root: path.resolve(import.meta.dirname, '../..'),
  },
  // coach-core ships TypeScript source so web and worker share analytics/guardrails.
  transpilePackages: ['@petehome/coach-core'],
  logging: {
    fetches: {
      fullUrl: false,
    },
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  images: {
    remotePatterns: [],
  },
  reactStrictMode: true,
  experimental: {},
  allowedDevOrigins: [
    'boufos.local',
    '192.168.1.4',
    '192.168.1.*',
    'localhost',
    '127.0.0.1',
  ],
}

export default nextConfig
