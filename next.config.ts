import type { NextConfig } from 'next';
import path from 'node:path';
import webpack from 'webpack';

const nextConfig: NextConfig = {
  experimental: {
    ppr: true,
  },
  images: {
    remotePatterns: [
      {
        hostname: 'avatar.vercel.sh',
      },
    ],
  },
  webpack: (config, { isServer }) => {
    // Alias Node built-in scheme imports to browser-safe shims on the client
    if (!isServer) {
      config.resolve = config.resolve || {};
      // Prefer browser-friendly entry points when available
      config.resolve.conditionNames = [
        'import',
        'module',
        'browser',
        'default',
        ...(config.resolve.conditionNames || []),
      ];
      config.resolve.mainFields = [
        'browser',
        'module',
        'main',
        ...(config.resolve.mainFields || []),
      ];
      config.resolve.alias = {
        ...(config.resolve.alias || {}),
        'node:process': path.join(__dirname, 'lib/shims/process.ts'),
        process: path.join(__dirname, 'lib/shims/process.ts'),
      };

      // Ensure any direct `node:`-scheme import is swapped for the shim
      config.plugins = config.plugins || [];
      config.plugins.push(
        new webpack.NormalModuleReplacementPlugin(
          /^node:process$/,
          path.join(__dirname, 'lib/shims/process.ts'),
        ),
      );
    }
    return config;
  },
};

export default nextConfig;
