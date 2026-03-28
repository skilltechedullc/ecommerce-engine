import type { MetadataRoute } from 'next'
import { storeConfig } from '@/lib/config'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin/', '/admin/login', '/api/'],
      },
    ],
    sitemap: `${storeConfig.siteUrl}/sitemap.xml`,
    host: storeConfig.siteUrl,
  }
}
