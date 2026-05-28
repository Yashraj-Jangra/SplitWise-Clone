
import type {NextConfig} from 'next';
// @ts-expect-error next-pwa lacks type definitions
import withPWA from 'next-pwa';

const pwaEnabled = process.env.NODE_ENV === 'production';

const pwaPlugin = withPWA({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: !pwaEnabled,
});

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.imgcdn.dev',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'http',
        hostname: 'cdn.cvweb.tech',
        port: '',
        pathname: '/**',
      }
    ],
  },
};

export default pwaPlugin(nextConfig);
