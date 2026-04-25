'use client'

import { type ReactNode, useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WagmiProvider, type State } from 'wagmi'
import { OnchainKitProvider } from '@coinbase/onchainkit'
import { base } from 'wagmi/chains'
import { wagmiConfig } from '@/lib/wagmi/config'

export function Providers({
  children,
  initialState,
}: {
  children: ReactNode
  initialState?: State
}) {
  const [queryClient] = useState(() => new QueryClient())

  return (
    <WagmiProvider config={wagmiConfig} initialState={initialState}>
      <QueryClientProvider client={queryClient}>
        <OnchainKitProvider chain={base}>{children}</OnchainKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}
