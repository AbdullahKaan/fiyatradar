/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: { typedRoutes: true },
  transpilePackages: ['@price-compare/shared'],
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.hepsiburada.com' },
      { protocol: 'https', hostname: '**.hepsiburada.net' },
      { protocol: 'https', hostname: '**.trendyol.com' },
      { protocol: 'https', hostname: '**.amazon.com.tr' },
      { protocol: 'https', hostname: 'picsum.photos' },
      { protocol: 'https', hostname: '**.supabase.co' },
      // Product images come from many manufacturer/retailer CDNs (Apple, Amazon, Logitech, GoPro, Unsplash...)
      { protocol: 'https', hostname: '**' },
    ],
  },
  async headers() {
    return [{ source: '/(.*)', headers: [{ key: 'X-DNS-Prefetch-Control', value: 'on' }] }];
  },
};
module.exports = nextConfig;
