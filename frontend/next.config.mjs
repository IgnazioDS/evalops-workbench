// Rewrite the local /api/stats path to the showcase deploy's public
// telemetry endpoint. Override with NEXT_PUBLIC_API_BASE for local dev.
const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ||
  "https://evalops-workbench.vercel.app";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  experimental: {
    optimizePackageImports: ["lucide-react", "recharts"],
  },
  async rewrites() {
    return [
      { source: "/api/stats", destination: `${API_BASE}/api/stats` },
    ];
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
