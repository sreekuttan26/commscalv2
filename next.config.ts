import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // Pre-existing ESLint warnings in this codebase cause build failures;
    // enforcement is handled in dev via the editor.
    ignoreDuringBuilds: true,
  },
  experimental: {
    // Raise the body-size limit for Server Actions and route handlers to 30 MB —
    // headroom above the 25 MB video upload limit — so uploads don't hit a 413
    // before reaching the route handler.
    serverActions: {
      bodySizeLimit: '30mb',
    },
  },
};

export default nextConfig;
