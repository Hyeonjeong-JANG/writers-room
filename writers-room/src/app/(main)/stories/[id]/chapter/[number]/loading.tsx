import { Skeleton } from '@/components/ui/skeleton'

export default function ChapterLoading() {
  return (
    <div className="mx-auto max-w-2xl space-y-8 py-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-md" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-7 w-48" />
        </div>
      </div>

      {/* Content */}
      <div className="space-y-4">
        {[95, 100, 88, 100, 92, 78, 100, 85].map((w, i) => (
          <Skeleton key={i} className="h-4" style={{ width: `${w}%` }} />
        ))}
        <Skeleton className="h-4 w-0" />
        {[100, 90, 82, 100, 96, 70].map((w, i) => (
          <Skeleton key={`p2-${i}`} className="h-4" style={{ width: `${w}%` }} />
        ))}
      </div>
    </div>
  )
}
