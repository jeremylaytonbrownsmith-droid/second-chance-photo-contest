import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Bunny.net pull zones serve from "<zone-name>.b-cdn.net" by default
    // (or a custom domain, which an admin would add here explicitly).
    // Without this, next/image refuses to load anything that isn't
    // same-origin — the local demo photos work without it since they're
    // served from this app itself, but real uploads through the Bunny
    // storage provider need the CDN host allow-listed.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.b-cdn.net",
      },
    ],
  },
};

export default nextConfig;
