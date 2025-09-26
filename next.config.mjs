/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone', // Required for Docker deployment
  eslint: {
    ignoreDuringBuilds: false,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  images: {
    unoptimized: true,
  },
  experimental: {
    serverComponentsExternalPackages: ['@supabase/supabase-js']
  }
}

export default nextConfig
