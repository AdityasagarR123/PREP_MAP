import type { NextConfig } from "next";

/**
 * The browser never calls the backend directly. Requests go to /backend/* on
 * this site and are proxied to NEXT_PUBLIC_API_URL, so the backend's CORS
 * settings (ALLOWED_ORIGINS) don't matter.
 */
const BACKEND_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000").replace(/\/+$/, "");

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async rewrites() {
    return [{ source: "/backend/:path*", destination: `${BACKEND_URL}/:path*` }];
  },
};

export default nextConfig;
