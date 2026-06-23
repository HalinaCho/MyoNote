import type { NextConfig } from "next";

// Vercel 배포: 정적 export(output:'export')·basePath 제거.
// 라우트 핸들러(/api/*) 사용을 위해 서버리스 빌드로 전환. 루트 도메인 서빙.
const nextConfig: NextConfig = {
  images: { unoptimized: true },
};

export default nextConfig;
