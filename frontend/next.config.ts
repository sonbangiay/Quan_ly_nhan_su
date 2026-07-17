import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Allow API images from localhost
  images: {
    remotePatterns: [
      { protocol: 'http', hostname: 'localhost', port: '5000', pathname: '/uploads/**' },
    ],
  },
  // Proxy /api calls to backend during development
  async rewrites() {
    return [
      {
        source: '/uploads/:path*',
        destination: 'http://localhost:5000/uploads/:path*',
      },
    ];
  },
  // Explicitly set the Turbopack root to the project folder to prevent scanning user home directory
  turbopack: {
    root: path.resolve(process.cwd()),
  },
};

export default nextConfig;
