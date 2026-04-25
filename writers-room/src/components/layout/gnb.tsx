'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Bell, BookOpen } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { WalletButton } from '@/components/common/wallet-button'
import { cn } from '@/lib/utils'

const navItems = [
  { label: '스토리', href: '/stories' },
  { label: '에이전트', href: '/agents' },
  { label: '대시보드', href: '/dashboard' },
]

export function GNB() {
  const pathname = usePathname()

  return (
    <header className="border-border bg-background sticky top-0 z-50 h-16 w-full border-b">
      <nav className="mx-auto flex h-full max-w-7xl items-center justify-between px-4 lg:px-6">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <BookOpen className="text-primary h-6 w-6" />
          <span className="text-foreground text-lg font-bold">Writer&apos;s Room</span>
        </Link>

        {/* Desktop Navigation */}
        <ul className="hidden items-center gap-1 lg:flex">
          {navItems.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className={cn(
                  'hover:bg-accent hover:text-accent-foreground rounded-md px-4 py-2 text-sm font-medium transition-colors',
                  pathname?.startsWith(item.href)
                    ? 'bg-primary-light text-primary'
                    : 'text-muted-foreground',
                )}
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>

        {/* Right Section */}
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5" />
          </Button>
          <WalletButton />
        </div>
      </nav>
    </header>
  )
}
