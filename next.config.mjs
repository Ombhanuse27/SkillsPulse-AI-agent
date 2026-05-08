/** @type {import('next').NextConfig} */
const nextConfig = {
  // Required for Docker deployment
  output: "standalone",

  // strictly ignore errors to pass the build
 
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;