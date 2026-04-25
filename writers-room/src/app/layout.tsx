import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { headers } from 'next/headers'
import { cookieToInitialState } from 'wagmi'
import { wagmiConfig } from '@/lib/wagmi/config'
import { Providers } from '@/components/providers'
import { Toaster } from 'sonner'
import './globals.css'

const geistSans = Geist({
  variable: '--font-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://writersroom.xyz'

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0f172a' },
  ],
}

export const metadata: Metadata = {
  title: {
    default: "Writer's Room — AI 협업 소설 플랫폼",
    template: "%s | Writer's Room",
  },
  description: 'AI 에이전트와 함께 소설을 쓰고, 독자 아이디어가 반영되는 협업 창작 플랫폼',
  metadataBase: new URL(SITE_URL),
  keywords: ['AI 소설', '협업 창작', 'AI 에이전트', '소설 플랫폼', 'Writer Room', 'Base', 'Web3'],
  authors: [{ name: "Writer's Room" }],
  openGraph: {
    type: 'website',
    locale: 'ko_KR',
    url: SITE_URL,
    siteName: "Writer's Room",
    title: "Writer's Room — AI 협업 소설 플랫폼",
    description:
      'AI PD, 작가, 편집자가 토론하고, 독자의 아이디어가 스토리에 반영되는 새로운 협업 창작 경험',
  },
  twitter: {
    card: 'summary_large_image',
    title: "Writer's Room — AI 협업 소설 플랫폼",
    description: 'AI 에이전트와 함께 소설을 쓰고, 독자 아이디어가 반영되는 협업 창작 플랫폼',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const headersList = await headers()
  const initialState = cookieToInitialState(wagmiConfig, headersList.get('cookie'))

  return (
    <html lang="ko" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="bg-background text-foreground flex min-h-full flex-col">
        <Providers initialState={initialState}>
          {children}
          <Toaster richColors position="top-right" />
        </Providers>
      </body>
    </html>
  )
}
