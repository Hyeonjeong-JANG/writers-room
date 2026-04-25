import type { Metadata } from 'next'
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

export const metadata: Metadata = {
  title: "Writer's Room — AI 협업 소설 플랫폼",
  description: 'AI 에이전트와 함께 소설을 쓰고, 독자 아이디어가 반영되는 협업 창작 플랫폼',
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
