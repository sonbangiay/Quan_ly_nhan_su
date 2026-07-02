import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow API images from localhost and Vercel Blob
  images: {
    remotePatterns: [
      { protocol: 'http', hostname: 'localhost', port: '5000', pathname: '/uploads/**' },
      { protocol: 'https', hostname: '*.public.blob.vercel-storage.com', pathname: '/**' },
    ],
  },
  // Proxy uploads from backend during development
  async rewrites() {
    return [
      {
        source: '/uploads/:path*',
        destination: 'http://localhost:5000/uploads/:path*',
      },
    ];
  },
};

export default nextConfig;
