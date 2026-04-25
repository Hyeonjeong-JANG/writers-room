'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Plus, X } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { toast } from 'sonner'
import { CreateStorySchema, type CreateStoryInput } from '@/features/story/lib/schemas'

const GENRES = [
  '로맨스',
  '판타지',
  '액션',
  'SF',
  '스릴러',
  '미스터리',
  '드라마',
  '공포',
  '코미디',
  '무협',
]

interface CharacterInput {
  name: string
  role: string
  personality: string
}

export default function CreateStoryPage() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [title, setTitle] = useState('')
  const [synopsis, setSynopsis] = useState('')
  const [selectedGenres, setSelectedGenres] = useState<string[]>([])
  const [characters, setCharacters] = useState<CharacterInput[]>([])
  const [errors, setErrors] = useState<Record<string, string>>({})

  function toggleGenre(genre: string) {
    setSelectedGenres((prev) =>
      prev.includes(genre)
        ? prev.filter((g) => g !== genre)
        : prev.length < 5
          ? [...prev, genre]
          : prev,
    )
  }

  function addCharacter() {
    setCharacters((prev) => [...prev, { name: '', role: '', personality: '' }])
  }

  function updateCharacter(index: number, field: keyof CharacterInput, value: string) {
    setCharacters((prev) => prev.map((c, i) => (i === index ? { ...c, [field]: value } : c)))
  }

  function removeCharacter(index: number) {
    setCharacters((prev) => prev.filter((_, i) => i !== index))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErrors({})

    const input: CreateStoryInput = {
      title,
      synopsis,
      genre: selectedGenres,
      characters: characters.filter((c) => c.name.trim() !== ''),
    }

    const parsed = CreateStorySchema.safeParse(input)
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {}
      for (const issue of parsed.error.issues) {
        const key = issue.path.join('.')
        fieldErrors[key] = issue.message
      }
      setErrors(fieldErrors)
      return
    }

    setIsSubmitting(true)
    try {
      const res = await fetch('/api/stories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })

      const json = await res.json()

      if (!res.ok) {
        toast.error(json.error?.message ?? '스토리 생성에 실패했습니다')
        return
      }

      toast.success('스토리가 생성되었습니다!')
      router.push(`/stories/${json.data.id}/room?autostart=true`)
    } catch {
      toast.error('네트워크 오류가 발생했습니다')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/stories">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">새 스토리 만들기</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Title */}
        <div className="space-y-2">
          <label className="text-sm font-medium">제목 *</label>
          <Input
            placeholder="스토리 제목을 입력하세요"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={100}
          />
          {errors.title && <p className="text-sm text-red-500">{errors.title}</p>}
        </div>

        {/* Genre */}
        <div className="space-y-2">
          <label className="text-sm font-medium">장르 * (최대 5개)</label>
          <div className="flex flex-wrap gap-2">
            {GENRES.map((genre) => (
              <Badge
                key={genre}
                variant={selectedGenres.includes(genre) ? 'default' : 'outline'}
                className="cursor-pointer"
                onClick={() => toggleGenre(genre)}
              >
                {genre}
              </Badge>
            ))}
          </div>
          {errors.genre && <p className="text-sm text-red-500">{errors.genre}</p>}
        </div>

        {/* Synopsis */}
        <div className="space-y-2">
          <label className="text-sm font-medium">시놉시스 *</label>
          <Textarea
            placeholder="스토리의 시놉시스를 작성하세요 (최소 10자)"
            value={synopsis}
            onChange={(e) => setSynopsis(e.target.value)}
            rows={5}
            maxLength={2000}
          />
          <div className="flex justify-between">
            {errors.synopsis && <p className="text-sm text-red-500">{errors.synopsis}</p>}
            <p className="text-muted-foreground ml-auto text-xs">{synopsis.length}/2000</p>
          </div>
        </div>

        {/* Characters */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">캐릭터 설정</label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1"
              onClick={addCharacter}
            >
              <Plus className="h-3.5 w-3.5" />
              캐릭터 추가
            </Button>
          </div>

          {characters.map((char, i) => (
            <Card key={i}>
              <CardContent className="space-y-3 p-4">
                <div className="flex items-start justify-between">
                  <span className="text-muted-foreground text-xs font-medium">캐릭터 {i + 1}</span>
                  <button
                    type="button"
                    onClick={() => removeCharacter(i)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Input
                    placeholder="이름"
                    value={char.name}
                    onChange={(e) => updateCharacter(i, 'name', e.target.value)}
                  />
                  <Input
                    placeholder="역할 (예: 주인공, 히로인)"
                    value={char.role}
                    onChange={(e) => updateCharacter(i, 'role', e.target.value)}
                  />
                </div>
                <Textarea
                  placeholder="성격 및 특징"
                  value={char.personality}
                  onChange={(e) => updateCharacter(i, 'personality', e.target.value)}
                  rows={2}
                />
              </CardContent>
            </Card>
          ))}

          {characters.length === 0 && (
            <p className="text-muted-foreground text-sm">
              캐릭터를 추가하면 AI가 더 정확한 스토리를 만들 수 있습니다.
            </p>
          )}
        </div>

        {/* Submit */}
        <div className="flex gap-3 pt-2">
          <Link href="/stories" className="flex-1">
            <Button type="button" variant="outline" className="w-full">
              취소
            </Button>
          </Link>
          <Button type="submit" className="flex-1" disabled={isSubmitting}>
            {isSubmitting ? '생성 중...' : '스토리 생성'}
          </Button>
        </div>
      </form>
    </div>
  )
}
