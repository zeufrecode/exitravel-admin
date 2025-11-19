import withPWA from "next-pwa";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  turbopack: {}, // neutralise Turbopack si nécessaire
};

// options PWA
const pwaConfig = {
  dest: "public",
  disable: process.env.NODE_ENV === "development",
};

export default withPWA({
  ...nextConfig,
  ...pwaConfig,
});
