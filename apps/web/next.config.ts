import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  transpilePackages: ['@motionknowledge/ui', '@motionknowledge/config'],
  experimental: {
    serverActions: {
      bodySizeLimit: '25mb',
    },
  },
};

export default nextConfig;
