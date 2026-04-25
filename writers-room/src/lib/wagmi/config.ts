import { http, createConfig, cookieStorage, createStorage } from 'wagmi'
import { base, baseSepolia } from 'wagmi/chains'
import { coinbaseWallet } from 'wagmi/connectors'

const projectId = process.env.NEXT_PUBLIC_COINBASE_PROJECT_ID

export const wagmiConfig = createConfig({
  chains: [base, baseSepolia],
  connectors: [
    coinbaseWallet({
      appName: "Writer's Room",
      preference: 'smartWalletOnly',
      ...(projectId && { projectId }),
    }),
  ],
  ssr: true,
  storage: createStorage({ storage: cookieStorage }),
  transports: {
    [base.id]: http(),
    [baseSepolia.id]: http(),
  },
})

declare module 'wagmi' {
  interface Register {
    config: typeof wagmiConfig
  }
}
