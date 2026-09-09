import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  distDir: process.env.NEXT_DIST_DIR || ".next",
  images: { qualities: [75, 100] },
  /* config options here */
  reactCompiler: true,
};

export default nextConfig;
