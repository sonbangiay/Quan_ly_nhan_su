import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Add modularizeImports to prevent Webpack OOM with large icon libraries
  modularizeImports: {
    'lucide-react': {
      transform: 'lucide-react/dist/esm/icons/{{kebabCase member}}',
    }
  },
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
};

export default nextConfig;
