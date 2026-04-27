'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Bell, BookOpen, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { WalletButton } from '@/components/common/wallet-button'
import { cn } from '@/lib/utils'
import { useCredits, CreditPurchaseModal } from '@/features/credit'

const navItems = [
  { label: '스토리', href: '/stories' },
  { label: '에이전트', href: '/agents' },
  { label: '대시보드', href: '/dashboard' },
]

export function GNB() {
  const pathname = usePathname()
  const { credits } = useCredits()
  const [isPurchaseOpen, setIsPurchaseOpen] = useState(false)

  const totalCredits = credits?.totalCredits ?? 0

  return (
    <>
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
            {credits && (
              <button
                onClick={() => setIsPurchaseOpen(true)}
                className={cn(
                  'flex items-center gap-1 rounded-full px-3 py-1.5 text-sm font-medium transition-colors',
                  totalCredits === 0
                    ? 'bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-950 dark:text-red-400 dark:hover:bg-red-900'
                    : totalCredits <= 5
                      ? 'bg-orange-100 text-orange-700 hover:bg-orange-200 dark:bg-orange-950 dark:text-orange-400 dark:hover:bg-orange-900'
                      : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200 dark:bg-indigo-950 dark:text-indigo-400 dark:hover:bg-indigo-900',
                )}
              >
                <Zap className="h-3.5 w-3.5" />
                {totalCredits}
              </button>
            )}
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
            </Button>
            <WalletButton />
          </div>
        </nav>
      </header>

      <CreditPurchaseModal isOpen={isPurchaseOpen} onClose={() => setIsPurchaseOpen(false)} />
    </>
  )
}
