/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Salida standalone: el pipeline arranca `node .next/standalone/server.js`.
  output: "standalone",
  images: {
    // Las imágenes de producto provienen del backend Medusa y de CDNs externas.
    remotePatterns: [
      { protocol: "https", hostname: "**" },
      { protocol: "http", hostname: "**" },
    ],
  },
};

export default nextConfig;
