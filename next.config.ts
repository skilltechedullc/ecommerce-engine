import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === 'production'
const supabaseUrl = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://unconfigured.invalid')
const supabaseConnect = supabaseUrl.origin + ' ' + (supabaseUrl.protocol === 'https:' ? 'wss:' : 'ws:') + '//' + supabaseUrl.host

const cspDirectives = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  `script-src 'self' 'unsafe-inline'${isProd ? '' : " 'unsafe-eval'"} https://checkout.razorpay.com https://www.googletagmanager.com https://www.google-analytics.com`,
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data: https://fonts.gstatic.com",
  `connect-src 'self' ${supabaseConnect} https://api.razorpay.com https://checkout.razorpay.com https://lumberjack.razorpay.com https://api.resend.com https://www.google-analytics.com https://www.googletagmanager.com${isProd ? '' : ' ws://localhost:* wss://localhost:* http://localhost:*'}`,
  "frame-src 'self' https://checkout.razorpay.com https://api.razorpay.com",
  ...(isProd ? ['upgrade-insecure-requests'] : []),
].join('; ')

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(self)' },
  { key: 'Content-Security-Policy', value: cspDirectives },
]

const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd(),
  },
  poweredByHeader: false,
  images: {
    remotePatterns: [
      {
        protocol: supabaseUrl.protocol.replace(':', '') as 'http' | 'https',
        port: supabaseUrl.port,
        hostname: supabaseUrl.hostname,
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  async headers() {
    const headers = [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
      {
        source: '/api/:path*',
        headers: [
          { key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate' },
        ],
      },
    ]


    return headers
  },
};

export default nextConfig;
