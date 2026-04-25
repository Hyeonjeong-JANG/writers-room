'use client'

import { useEffect } from 'react'
import { AlertTriangle, RotateCcw, Home } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[GlobalError]', error)
  }, [error])

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <div className="bg-destructive/10 mb-6 flex h-16 w-16 items-center justify-center rounded-full">
        <AlertTriangle className="text-destructive h-8 w-8" />
      </div>
      <h1 className="text-2xl font-bold">문제가 발생했습니다</h1>
      <p className="text-muted-foreground mt-2 max-w-md text-sm">
        예상치 못한 오류가 발생했습니다. 다시 시도하거나 홈으로 돌아가주세요.
      </p>
      {error.digest && (
        <p className="text-muted-foreground mt-2 font-mono text-xs">오류 코드: {error.digest}</p>
      )}
      <div className="mt-6 flex gap-3">
        <Button onClick={reset} variant="outline" className="gap-2">
          <RotateCcw className="h-4 w-4" />
          다시 시도
        </Button>
        <Link href="/">
          <Button className="gap-2">
            <Home className="h-4 w-4" />
            홈으로
          </Button>
        </Link>
      </div>
    </div>
  )
}
