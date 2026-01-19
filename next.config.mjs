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
      // Spotify album art and images
      {
        protocol: 'https',
        hostname: 'i.scdn.co',
        pathname: '/image/**',
      },
      // Spotify user profile images
      {
        protocol: 'https',
        hostname: 'mosaic.scdn.co',
        pathname: '/**',
      },
      // Spotify playlist images (can be hosted on various CDNs)
      {
        protocol: 'https',
        hostname: 'image-cdn-*.spotifycdn.com',
      },
      {
        protocol: 'https',
        hostname: 'wrapped-images.spotifycdn.com',
        pathname: '/**',
      },
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
