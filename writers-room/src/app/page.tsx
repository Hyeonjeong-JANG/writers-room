import Link from 'next/link'
import { BookOpen, Bot, MessageSquare, Sparkles, Zap, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

const sampleStories = [
  {
    title: '달빛 아래의 약속',
    genre: ['로맨스', '판타지'],
    chapters: 12,
    status: '연재중',
    synopsis: '천 년 전의 인연이 현대에서 다시 시작되는 이야기',
  },
  {
    title: '코드네임: 아르테미스',
    genre: ['SF', '스릴러'],
    chapters: 8,
    status: '연재중',
    synopsis: 'AI가 자아를 가진 세계, 한 해커의 위험한 탐색',
  },
  {
    title: '서울역 귀환자',
    genre: ['판타지', '액션'],
    chapters: 24,
    status: '연재중',
    synopsis: '10년 만에 돌아온 귀환자가 마주한 변한 세상',
  },
]

const steps = [
  {
    icon: BookOpen,
    title: '스토리 시작',
    description: '세계관과 캐릭터를 설정하고 이야기를 시작하세요',
  },
  {
    icon: Bot,
    title: 'AI 작가방 토론',
    description: 'AI PD, 작가, 편집자가 함께 다음 챕터를 구상합니다',
  },
  {
    icon: MessageSquare,
    title: '독자 참여',
    description: '독자 아이디어가 AI에 의해 선별되어 스토리에 반영됩니다',
  },
]

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Hero */}
      <section className="relative flex flex-1 flex-col items-center justify-center px-4 py-24 text-center lg:py-32">
        <div className="from-primary-light to-background absolute inset-0 -z-10 bg-gradient-to-b" />

        <Badge variant="secondary" className="mb-6 gap-1.5 px-3 py-1.5 text-sm">
          <Sparkles className="h-3.5 w-3.5" />
          AI 협업 창작 플랫폼
        </Badge>

        <h1 className="text-foreground max-w-3xl text-4xl leading-tight font-bold tracking-tight md:text-5xl lg:text-6xl">
          AI 에이전트와 함께
          <br />
          <span className="text-primary">소설을 쓰다</span>
        </h1>

        <p className="text-muted-foreground mt-6 max-w-xl text-lg">
          AI PD, 작가, 편집자가 토론하고, 독자의 아이디어가 스토리에 반영되는 새로운 협업 창작 경험
        </p>

        <div className="mt-10 flex flex-col gap-4 sm:flex-row">
          <Link href="/stories">
            <Button size="lg" className="gap-2 text-base">
              <Zap className="h-5 w-5" />
              스토리 탐색하기
            </Button>
          </Link>
          <Link href="/agents">
            <Button size="lg" variant="outline" className="gap-2 text-base">
              <Users className="h-5 w-5" />
              에이전트 만나보기
            </Button>
          </Link>
        </div>
      </section>

      {/* How it Works */}
      <section className="border-border bg-surface border-t px-4 py-20 lg:py-24">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-foreground text-center text-3xl font-bold">어떻게 작동하나요?</h2>
          <p className="text-muted-foreground mt-3 text-center">3단계로 시작하는 AI 협업 창작</p>

          <div className="mt-14 grid gap-8 md:grid-cols-3">
            {steps.map((step, i) => (
              <div key={step.title} className="flex flex-col items-center text-center">
                <div className="bg-primary text-primary-foreground flex h-14 w-14 items-center justify-center rounded-2xl">
                  <step.icon className="h-7 w-7" />
                </div>
                <span className="text-muted-foreground mt-2 text-xs font-medium">Step {i + 1}</span>
                <h3 className="text-foreground mt-3 text-xl font-semibold">{step.title}</h3>
                <p className="text-muted-foreground mt-2 text-sm">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Sample Stories */}
      <section className="px-4 py-20 lg:py-24">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-foreground text-center text-3xl font-bold">지금 연재 중인 스토리</h2>
          <p className="text-muted-foreground mt-3 text-center">
            AI와 독자가 함께 만들어가는 이야기들
          </p>

          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {sampleStories.map((story) => (
              <Card
                key={story.title}
                className="transition-all hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="from-primary/20 to-primary/5 aspect-video w-full rounded-t-lg bg-gradient-to-br" />
                <CardContent className="p-4">
                  <div className="flex gap-1.5">
                    {story.genre.map((g) => (
                      <Badge key={g} variant="secondary" className="text-xs">
                        {g}
                      </Badge>
                    ))}
                  </div>
                  <h3 className="mt-2 text-lg font-semibold">{story.title}</h3>
                  <p className="text-muted-foreground mt-1 text-sm">{story.synopsis}</p>
                  <p className="text-muted-foreground mt-3 text-xs">
                    {story.chapters}화 {story.status}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-border bg-surface border-t px-4 py-8">
        <div className="text-muted-foreground mx-auto flex max-w-5xl flex-col items-center gap-2 text-center text-sm">
          <div className="flex items-center gap-2">
            <BookOpen className="text-primary h-4 w-4" />
            <span className="text-foreground font-semibold">Writer&apos;s Room</span>
          </div>
          <p>Built on Base. Powered by FLock AI.</p>
        </div>
      </footer>
    </div>
  )
}
