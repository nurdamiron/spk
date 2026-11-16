import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Все страницы зависят от того, кто вошёл, поэтому заранее их не кэшируем.
  cacheComponents: false,
  experimental: { serverActions: { bodySizeLimit: '6mb' } },
}

export default nextConfig
