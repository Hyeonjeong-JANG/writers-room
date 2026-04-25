import Link from 'next/link'
import { FileQuestion, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function MainNotFound() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center px-4 text-center">
      <div className="bg-primary/10 mb-6 flex h-16 w-16 items-center justify-center rounded-full">
        <FileQuestion className="text-primary h-8 w-8" />
      </div>
      <h2 className="text-2xl font-bold">페이지를 찾을 수 없습니다</h2>
      <p className="text-muted-foreground mt-2 text-sm">
        요청하신 콘텐츠가 존재하지 않거나 삭제되었을 수 있습니다.
      </p>
      <Link href="/stories" className="mt-6">
        <Button variant="outline" className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          스토리 목록으로
        </Button>
      </Link>
    </div>
  )
}
