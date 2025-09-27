import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { NextConfig } from 'next';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  experimental: {
    ppr: true,
  },
  webpack: (config) => {
    config.resolve ??= {};
    config.resolve.alias ??= {};
    config.resolve.alias['lucide-react$'] = path.resolve(
      __dirname,
      'lib/shims/lucide-react/index.tsx',
    );
    config.resolve.alias['lucide-react/dist/esm/lucide-react'] = path.resolve(
      __dirname,
      'node_modules/lucide-react/dist/esm/lucide-react.js',
    );

    return config;
  },
  images: {
    remotePatterns: [
      {
        hostname: 'avatar.vercel.sh',
      },
    ],
  },
};

export default nextConfig;
