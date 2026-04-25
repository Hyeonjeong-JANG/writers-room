import type { MetadataRoute } from 'next'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://writersroom.xyz'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/dashboard/', '/profile/', '/stories/create', '/agents/create'],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}
