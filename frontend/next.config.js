/** @type {import('next').NextConfig} */
const nextConfig = {
  // Проксируем API запросы к бэкенду через Next.js (без CORS)
  async rewrites() {
    const backendUrl = process.env.BACKEND_URL || "http://localhost:3000";
    return [
      {
        source: "/api/:path*",
        destination: `${backendUrl}/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;