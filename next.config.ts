import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Include markdown posts in the serverless/trace bundle on Vercel.
  outputFileTracingIncludes: {
    "/": ["./content/posts/**/*", "./content/drafts/**/*"],
    "/writing/[slug]": ["./content/posts/**/*", "./content/drafts/**/*"],
  },
};

export default nextConfig;
