import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Gmail's per-message attachment limit is 25 MB; allow up to 25 MB payloads
      // so users can attach files via the compose form.
      bodySizeLimit: "25mb",
    },
  },
};

export default nextConfig;
