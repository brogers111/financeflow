import type { NextConfig } from 'next';
import withPWA from 'next-pwa';

const pwaConfig = withPWA({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
});

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        pathname: '/**'
      }
    ]
  },
  reactStrictMode: true,
  turbopack: {},
  webpack: (config, { isServer }) => {
    // Disable canvas for PDF.js
    config.resolve.alias.canvas = false;
    
    // Ignore pdfjs worker warnings
    config.ignoreWarnings = [
      { module: /node_modules\/pdfjs-dist/ }
    ];
    
    // Externalize pdfjs worker on server side
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push({
        'pdfjs-dist/build/pdf.worker.js': 'commonjs pdfjs-dist/build/pdf.worker.js'
      });
    }
    
    return config;
  },
};

export default pwaConfig(nextConfig);