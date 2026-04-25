'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, BookOpen, Bot, LayoutDashboard, User } from 'lucide-react'
import { cn } from '@/lib/utils'

const tabs = [
  { label: '홈', href: '/', icon: Home },
  { label: '스토리', href: '/stories', icon: BookOpen },
  { label: '에이전트', href: '/agents', icon: Bot },
  { label: '대시보드', href: '/dashboard', icon: LayoutDashboard },
  { label: '프로필', href: '/profile', icon: User },
]

export function MobileTabBar() {
  const pathname = usePathname()

  return (
    <nav className="border-border bg-background fixed right-0 bottom-0 left-0 z-50 border-t pb-[env(safe-area-inset-bottom)] lg:hidden">
      <ul className="flex h-16 items-center justify-around">
        {tabs.map((tab) => {
          const isActive = tab.href === '/' ? pathname === '/' : pathname?.startsWith(tab.href)
          const Icon = tab.icon

          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                className={cn(
                  'flex flex-col items-center gap-1 px-3 py-2 text-xs transition-colors',
                  isActive ? 'text-primary' : 'text-muted-foreground',
                )}
              >
                <Icon className="h-5 w-5" />
                <span>{tab.label}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
