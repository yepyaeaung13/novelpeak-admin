import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactStrictMode: false, // ✅ reduce extra render checks

  output: "standalone", // ✅ best for Docker (VERY IMPORTANT)

  // Allows the build output directory to be relocated. Defaults to ".next", so
  // normal builds and Docker are unaffected; it exists so a sandboxed
  // environment that cannot write into an existing .next can still build.
  distDir: process.env.NEXT_DIST_DIR || ".next",

  typescript: {
    ignoreBuildErrors: true, // ⚠️ optional (skip type check)
  },

  experimental: {
    workerThreads: false, // ✅ reduce CPU spikes
    cpus: 1, // ✅ limit parallelism (VERY IMPORTANT for small VPS)
  },
};

export default nextConfig;
