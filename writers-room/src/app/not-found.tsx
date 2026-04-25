import Link from 'next/link'
import { FileQuestion, Home, BookOpen } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <div className="bg-primary/10 mb-6 flex h-20 w-20 items-center justify-center rounded-full">
        <FileQuestion className="text-primary h-10 w-10" />
      </div>
      <h1 className="text-4xl font-bold">404</h1>
      <p className="text-muted-foreground mt-2 text-lg">페이지를 찾을 수 없습니다</p>
      <p className="text-muted-foreground mt-1 max-w-md text-sm">
        요청하신 페이지가 존재하지 않거나 이동되었을 수 있습니다.
      </p>
      <div className="mt-8 flex gap-3">
        <Link href="/">
          <Button className="gap-2">
            <Home className="h-4 w-4" />
            홈으로
          </Button>
        </Link>
        <Link href="/stories">
          <Button variant="outline" className="gap-2">
            <BookOpen className="h-4 w-4" />
            스토리 탐색
          </Button>
        </Link>
      </div>
    </div>
  )
}
