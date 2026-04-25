'use client'

import { useEffect } from 'react'
import { AlertTriangle, RotateCcw, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default function MainError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[MainError]', error)
  }, [error])

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center px-4 text-center">
      <div className="bg-destructive/10 mb-6 flex h-14 w-14 items-center justify-center rounded-full">
        <AlertTriangle className="text-destructive h-7 w-7" />
      </div>
      <h2 className="text-xl font-bold">오류가 발생했습니다</h2>
      <p className="text-muted-foreground mt-2 max-w-md text-sm">
        페이지를 불러오는 중 문제가 생겼습니다. 다시 시도해주세요.
      </p>
      {error.digest && (
        <p className="text-muted-foreground mt-2 font-mono text-xs">오류 코드: {error.digest}</p>
      )}
      <div className="mt-6 flex gap-3">
        <Button onClick={reset} variant="outline" className="gap-2">
          <RotateCcw className="h-4 w-4" />
          다시 시도
        </Button>
        <Link href="/stories">
          <Button variant="ghost" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            스토리 목록
          </Button>
        </Link>
      </div>
    </div>
  )
}
