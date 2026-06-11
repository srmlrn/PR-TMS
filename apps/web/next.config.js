/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  transpilePackages: ['@tms/ui', '@tms/types'],
  reactStrictMode: true,
};

module.exports = nextConfig;
