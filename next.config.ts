import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // reactCompiler: true  ← Delete
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
