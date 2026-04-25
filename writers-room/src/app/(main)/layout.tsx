import { GNB } from '@/components/layout/gnb'
import { MobileTabBar } from '@/components/layout/mobile-tab-bar'

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <GNB />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 pb-20 lg:px-6 lg:pb-6">
        {children}
      </main>
      <MobileTabBar />
    </>
  )
}
