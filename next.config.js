/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["react-globe.gl", "three-globe"],
  // Don't crash the build on these runtime errors
  onDemandEntries: {
    maxInactiveAge: 60 * 60 * 1000,
  },
};

module.exports = nextConfig;