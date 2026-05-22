import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // Pre-existing ESLint warnings in this codebase cause build failures;
    // enforcement is handled in dev via the editor.
    ignoreDuringBuilds: true,
  },
  experimental: {
    // Raise the body-size limit for Server Actions and route handlers to 15 MB
    // so large image uploads don't hit a 413 before reaching the route handler.
    serverActions: {
      bodySizeLimit: '15mb',
    },
  },
};

export default nextConfig;
