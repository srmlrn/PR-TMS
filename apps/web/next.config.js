/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@tms/ui', '@tms/types'],
  reactStrictMode: true,
};

module.exports = nextConfig;
