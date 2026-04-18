/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'export',
  images: {
    unoptimized: true,
  },
  basePath: process.env.NODE_ENV === 'production' ? '/profile_code' : '',
  assetPrefix: process.env.NODE_ENV === 'production' ? '/profile_code/' : undefined,
};

module.exports = nextConfig;
