import type { NextConfig } from 'next'
 
const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  experimental: {
    useOffline: true,
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'ik.imagekit.io' },
    ],
  },
}
 
export default nextConfig