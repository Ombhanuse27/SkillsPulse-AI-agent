import type { NextConfig } from "next";

// Remove ": NextConfig" after "const nextConfig"
const nextConfig = {
  output: "standalone",
  
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;