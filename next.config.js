/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // react-globe.gl pulls in three.js which uses some node-ish things; this keeps the bundle clean.
  transpilePackages: ["react-globe.gl", "three-globe"],
};

module.exports = nextConfig;
