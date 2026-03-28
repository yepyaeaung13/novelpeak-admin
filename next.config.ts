import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactStrictMode: false, // ✅ reduce extra render checks

  output: "standalone", // ✅ best for Docker (VERY IMPORTANT)
  
  typescript: {
    ignoreBuildErrors: true, // ⚠️ optional (skip type check)
  },

  experimental: {
    workerThreads: false, // ✅ reduce CPU spikes
    cpus: 1, // ✅ limit parallelism (VERY IMPORTANT for small VPS)
  },
};

export default nextConfig;
