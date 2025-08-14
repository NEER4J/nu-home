/** @type {import('next').NextConfig} */
const nextConfig = {
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
  },

};

module.exports = nextConfig; 