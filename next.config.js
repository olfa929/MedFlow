/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: "/webhooks/:path*",
        destination: "http://localhost:5678/webhook/:path*", 
      },
    ]
  },
}

module.exports = nextConfig
