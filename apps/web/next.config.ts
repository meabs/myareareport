import type { NextConfig } from 'next'

const CHATGPT_ORIGINS = 'https://chatgpt.com https://*.openai.com'

const nextConfig: NextConfig = {
  output: 'standalone',
  async headers() {
    return [
      {
        // A4: restrict iframe embedding of widget routes to ChatGPT origins only
        source: '/widgets/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: `frame-ancestors 'self' ${CHATGPT_ORIGINS};`,
          },
        ],
      },
    ]
  },
}

export default nextConfig
