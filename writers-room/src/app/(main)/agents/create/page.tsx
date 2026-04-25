'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/hooks/use-auth'
import { useCreateAgent } from '@/features/agent/hooks/use-agents'
import { ROLE_LABELS, GENRE_OPTIONS, type AgentRole } from '@/features/agent/lib/schemas'

const FLOCK_MODELS = [
  { id: 'Qwen/Qwen3-30B-A3B-fast', name: 'Qwen3-30B-A3B (Fast)' },
  { id: 'Qwen/Qwen3-235B-A22B', name: 'Qwen3-235B-A22B' },
  { id: 'meta-llama/Llama-4-Scout-17B-16E-Instruct', name: 'Llama 4 Scout 17B' },
  { id: 'deepseek-ai/DeepSeek-V3-0324', name: 'DeepSeek V3' },
]

export default function CreateAgentPage() {
  const router = useRouter()
  const { isAuthenticated } = useAuth()
  const { createAgent, isSubmitting, error } = useCreateAgent()

  const [name, setName] = useState('')
  const [role, setRole] = useState<AgentRole>('writer')
  const [selectedGenres, setSelectedGenres] = useState<string[]>([])
  const [systemPrompt, setSystemPrompt] = useState('')
  const [description, setDescription] = useState('')
  const [priceUsdc, setPriceUsdc] = useState('0')
  const [flockModel, setFlockModel] = useState(FLOCK_MODELS[0].id)

  const toggleGenre = (genre: string) => {
    setSelectedGenres((prev) =>
      prev.includes(genre)
        ? prev.filter((g) => g !== genre)
        : prev.length < 5
          ? [...prev, genre]
          : prev,
    )
  }

  const handleSubmit = async () => {
    const result = await createAgent({
      name,
      role,
      genreTags: selectedGenres,
      systemPrompt,
      description: description || undefined,
      priceUsdc: parseFloat(priceUsdc),
      flockModel,
    })
    if (result) {
      router.push(`/agents/${result.id}`)
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-muted-foreground text-lg">로그인이 필요합니다</p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link
        href="/agents"
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        마켓플레이스
      </Link>

      <h1 className="text-2xl font-bold">에이전트 만들기</h1>

      <Card>
        <CardHeader>
          <CardTitle>기본 정보</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium">이름 *</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="에이전트 이름"
              maxLength={50}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium">역할 *</label>
            <div className="flex gap-2">
              {(Object.entries(ROLE_LABELS) as [AgentRole, string][]).map(([key, label]) => (
                <Badge
                  key={key}
                  variant={role === key ? 'default' : 'outline'}
                  className="cursor-pointer px-4 py-1.5"
                  onClick={() => setRole(key)}
                >
                  {label}
                </Badge>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium">
              전문 장르 * ({selectedGenres.length}/5)
            </label>
            <div className="flex flex-wrap gap-1.5">
              {GENRE_OPTIONS.map((g) => (
                <Badge
                  key={g}
                  variant={selectedGenres.includes(g) ? 'default' : 'outline'}
                  className="cursor-pointer"
                  onClick={() => toggleGenre(g)}
                >
                  {g}
                </Badge>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium">소개</label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="에이전트 소개 (500자 이내)"
              maxLength={500}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>AI 설정</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium">시스템 프롬프트 *</label>
            <Textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              placeholder="에이전트의 성격, 역할, 규칙을 정의하세요..."
              className="min-h-[150px]"
              maxLength={5000}
            />
            <p className="text-muted-foreground mt-1 text-xs">{systemPrompt.length}/5000</p>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium">FLock 모델 *</label>
            <select
              value={flockModel}
              onChange={(e) => setFlockModel(e.target.value)}
              className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm"
            >
              {FLOCK_MODELS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium">고용 가격 (USDC)</label>
            <Input
              type="number"
              value={priceUsdc}
              onChange={(e) => setPriceUsdc(e.target.value)}
              min={0}
              max={100}
              step={0.01}
            />
            <p className="text-muted-foreground mt-1 text-xs">
              0으로 설정하면 무료 에이전트가 됩니다
            </p>
          </div>
        </CardContent>
      </Card>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="flex justify-end gap-2">
        <Link href="/agents">
          <Button variant="outline">취소</Button>
        </Link>
        <Button
          onClick={handleSubmit}
          disabled={isSubmitting || !name || selectedGenres.length === 0 || !systemPrompt}
        >
          {isSubmitting ? '생성 중...' : '에이전트 생성'}
        </Button>
      </div>
    </div>
  )
}
