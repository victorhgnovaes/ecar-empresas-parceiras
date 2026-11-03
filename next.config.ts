import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  ...(process.env.GITHUB_PAGES === "true" ? {
    output: "export",
    trailingSlash: true,
    basePath: process.env.NEXT_PUBLIC_BASE_PATH ?? "",
    images: { unoptimized: true },
  } : {}),
};
export default nextConfig;
