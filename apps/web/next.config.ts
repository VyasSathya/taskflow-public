import type { NextConfig } from 'next';
import path from 'path';

const nextConfig: NextConfig = {
  // Set the root to prevent Next.js from searching parent directories
  outputFileTracingRoot: path.join(__dirname, './'),

  // Disable ESLint during builds
  eslint: {
    ignoreDuringBuilds: true,
  },

  images: {
    // Allow external images (QR codes, etc.)
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'api.qrserver.com',
      },
    ],
  },
};

export default nextConfig;
