/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable TypeScript type checking during builds
  typescript: {
    // Set to true only if you want to ignore type errors during build
    // For production, keep this false to catch type errors
    ignoreBuildErrors: false,
  },
  // Image optimization
  images: {
    remotePatterns: [
      // Add remote image patterns as needed for Petehome
    ],
  },
  // React strict mode for better development experience
  reactStrictMode: true,
  // SWC minification is default in Next.js 16 (no need to specify)
  // Experimental features
  experimental: {
    // Add any experimental features you want to enable
  },
};

export default nextConfig;
