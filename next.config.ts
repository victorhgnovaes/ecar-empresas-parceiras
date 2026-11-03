import type { NextConfig } from "next";

// Vercel serves this project at the domain root. Keep Pages-only settings
// isolated even when old Pages environment variables exist in the dashboard.
const githubPages = process.env.GITHUB_PAGES === "true" && process.env.VERCEL !== "1";
const basePath = githubPages ? process.env.NEXT_PUBLIC_BASE_PATH ?? "" : "";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
  ...(githubPages ? {
    output: "export",
    trailingSlash: true,
    basePath,
    images: { unoptimized: true },
  } : {}),
};
export default nextConfig;
