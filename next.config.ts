import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1", "192.168.100.102"],
  experimental: {
    /**
     * Client-side router cache. With single-user data and tag-based
     * server-side invalidation already in place, holding rendered segments
     * for 60s makes back/forward and quick revisits feel instant without
     * showing stale data after a mutation (the action's revalidateTag /
     * revalidatePath both bust this cache too).
     */
    staleTimes: {
      dynamic: 60,
      static: 300,
    },
  },
  images: {
    /**
     * Whitelisted remote hosts for next/image.
     *  - Unsplash: home cover picker (server-proxied search results).
     *  - Google: profile pictures from Supabase Auth's Google provider.
     */
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
    ],
  },
};

export default nextConfig;
