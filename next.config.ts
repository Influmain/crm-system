import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  eslint: {
    // 배포 시 ESLint 경고 무시
    ignoreDuringBuilds: true,
  },
  typescript: {
    // 배포 시 TypeScript 오류 무시 (개발 시에는 확인)
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
