/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['localhost', 'picsum.photos', 'images.unsplash.com'],
    remotePatterns: [
      { protocol: 'http', hostname: 'localhost' },
      { protocol: 'https', hostname: 'picsum.photos' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
    ],
  },
  experimental: {
    // optimize package imports
    optimizePackageImports: ['lucide-react', 'recharts', 'framer-motion'],
  },
};

export default nextConfig;
