import type { NextConfig } from "next";

// Extraer host y port de la URL del API
const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";
const apiOrigin = apiUrl.replace(/\/api\/?$/, "");
const apiUrlObj = new URL(apiOrigin);

const nextConfig: NextConfig = {
  transpilePackages: ["@superstars/shared"],

  images: {
    remotePatterns: [
      {
        protocol: apiUrlObj.protocol.replace(":", "") as "http" | "https",
        hostname: apiUrlObj.hostname,
        port: apiUrlObj.port,
        pathname: "/uploads/**",
      },
    ],
  },

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "style-src 'self' 'unsafe-inline'",
              `img-src 'self' data: blob: ${apiOrigin}`,
              "font-src 'self'",
              `connect-src 'self' ${apiOrigin} https://api.iconify.design`,
              "frame-ancestors 'none'",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
