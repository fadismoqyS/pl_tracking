import type { NextConfig } from "next";

const isStaticExport = process.env.NEXT_OUTPUT === 'export';

const nextConfig: NextConfig = {
  images: {
    unoptimized: true, // notwendig für Capacitor & PWA Icons
  },
  ...(isStaticExport
    ? {
        output: 'export', // statischer Export nur für Capacitor-Builds
        trailingSlash: true, // bessere Kompatibilität mit Capacitor
      }
    : {}),
};

export default nextConfig;
