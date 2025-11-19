import withPWA from "next-pwa";
import type { NextConfig } from "next";

const nextConfig: NextConfig = withPWA({
  reactStrictMode: true,
  swcMinify: true,
  pwa: {
    dest: "public",
    disable: process.env.NODE_ENV === "development",
  },
  turbopack: {}, // permet à Turbopack de ne plus se plaindre
});

export default nextConfig;
