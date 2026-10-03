import type { NextConfig } from 'next'
 
const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  experimental: {
    useOffline: true,
  }
}
 
export default nextConfig