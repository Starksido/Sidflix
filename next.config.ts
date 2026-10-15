import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  // Artwork from the catalogue sources in src/lib/sources.
  images: {
    qualities: [75],
    remotePatterns: [
      new URL("https://image.tmdb.org/t/p/**"),
      new URL("https://archive.org/services/img/**"),
      new URL("https://r2.thesportsdb.com/images/**"),
      new URL("https://www.thesportsdb.com/images/**"),
      new URL("https://static-cdn.jtvnw.net/previews-ttv/**"),
      // Posters for your own library, stored in your video repository.
      new URL("https://raw.githubusercontent.com/**"),
    ],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
