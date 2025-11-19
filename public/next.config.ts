// next.config.ts
import withPWA from "next-pwa";
import type { NextConfig } from "next";

// Configuration principale Next.js
const nextConfig: NextConfig = {
  reactStrictMode: true,
  turbopack: {}, // neutre, évite l'erreur Turbopack
};

// Configuration PWA
const pwaConfig = {
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development",
};

// Export final
export default withPWA({
  ...nextConfig,
  ...pwaConfig,
});
