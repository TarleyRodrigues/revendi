import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  eslint: {
    // Ignora os erros do ESLint durante o build na Vercel
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Ignora os erros de TypeScript durante o build na Vercel
    ignoreBuildErrors: true,
  },
};

export default nextConfig;