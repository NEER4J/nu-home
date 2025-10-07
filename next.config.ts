import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['pdf-parse'],
  typescript: {
    ignoreBuildErrors: true
  },
  reactStrictMode: true,
  compiler: {
    removeConsole: {
      exclude: ['error'],
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'http',
        hostname: '**',
        port: '',
        pathname: '/**',
      },
    ],
    // Fallback domains for compatibility
    domains: ['boiler-sure.co.uk', 'stewart-temp-solutions.com', 'growenergy.com.au', 'nu-home.co.uk', 'www.mcinnesgroup.co.uk', 'boiler-image.b-cdn.net', "origin-gph.com", "danlec.uk"],
  },
};

export default nextConfig;