
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  // Keep these Node.js-only packages out of the browser bundle permanently
  serverExternalPackages: [
    'nodemailer',
    'web-push',
    'googleapis',
    'google-auth-library',
    'oracledb',
    'nosql',
  ],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.cvweb.qzz.io',
        port: '',
        pathname: '/**',
      },
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
      },
      {
        protocol: 'http',
        hostname: '141.148.222.255',
        port: '7777',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'cdn.cvweb.tech',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'github.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        port: '',
        pathname: '/**',
      }
    ],
  },
};

export default nextConfig;
