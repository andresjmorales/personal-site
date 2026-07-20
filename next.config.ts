import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Include markdown posts in the serverless/trace bundle on Vercel.
  outputFileTracingIncludes: {
    "/": ["./content/posts/**/*"],
    "/writing/[slug]": ["./content/posts/**/*"],
  },
};

export default nextConfig;
