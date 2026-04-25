'use client'

import { useAccount, useConnect, useDisconnect } from 'wagmi'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Wallet, LogOut, Copy, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'

function formatAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

export function WalletButton() {
  const { address, isConnected } = useAccount()
  const { connect, connectors, isPending } = useConnect()
  const { disconnect } = useDisconnect()

  if (isConnected && address) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger className="border-input bg-background ring-offset-background hover:bg-accent hover:text-accent-foreground focus-visible:ring-ring inline-flex h-9 items-center justify-center gap-2 rounded-md border px-3 text-sm font-medium focus-visible:ring-2 focus-visible:outline-none">
          <Wallet className="h-4 w-4" />
          {formatAddress(address)}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onClick={() => {
              navigator.clipboard.writeText(address)
              toast.success('주소가 복사되었습니다')
            }}
          >
            <Copy className="mr-2 h-4 w-4" />
            주소 복사
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => {
              window.open(`https://basescan.org/address/${address}`, '_blank')
            }}
          >
            <ExternalLink className="mr-2 h-4 w-4" />
            BaseScan에서 보기
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => disconnect()}>
            <LogOut className="mr-2 h-4 w-4" />
            연결 해제
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  return (
    <Button
      size="sm"
      onClick={() => connect({ connector: connectors[0] })}
      disabled={isPending}
      className="gap-2"
    >
      <Wallet className="h-4 w-4" />
      {isPending ? '연결 중...' : '지갑 연결'}
    </Button>
  )
}
