-- Phase 3: Agents, Story Agents, Discussions, Selanet Trend Cache
-- AI 작가방 핵심 테이블

-- ============================================
-- 1. agents 테이블 (AI 에이전트)
-- ============================================
create table public.agents (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.users(id) on delete cascade,
  name text not null,
  role text not null check (role in ('pd', 'writer', 'editor')),
  genre_tags text[] not null default '{}',
  system_prompt text not null,
  few_shot_examples jsonb,
  avatar_url text,
  description text,
  price_usdc numeric(10,2) not null default 0,
  is_default boolean not null default false,
  is_active boolean not null default true,
  hire_count integer not null default 0,
  avg_rating numeric(3,2) not null default 0,
  flock_model text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 인덱스
create index agents_creator_id_idx on public.agents (creator_id);
create index agents_role_idx on public.agents (role);
create index agents_genre_tags_idx on public.agents using gin (genre_tags);
create index agents_avg_rating_idx on public.agents (avg_rating desc);
create index agents_is_active_idx on public.agents (is_active);

-- updated_at 트리거
create trigger agents_updated_at
  before update on public.agents
  for each row
  execute function public.handle_updated_at();

-- RLS
alter table public.agents enable row level security;

create policy "Active agents are viewable by everyone"
  on public.agents for select
  using (is_active = true or auth.uid() = creator_id);

create policy "Authenticated users can create agents"
  on public.agents for insert
  with check (auth.uid() = creator_id);

create policy "Creators can update own agents"
  on public.agents for update
  using (auth.uid() = creator_id)
  with check (auth.uid() = creator_id);

create policy "Creators can delete own agents"
  on public.agents for delete
  using (auth.uid() = creator_id);

-- ============================================
-- 2. story_agents 테이블 (스토리에 배치된 에이전트)
-- ============================================
create table public.story_agents (
  id uuid primary key default gen_random_uuid(),
  story_id uuid not null references public.stories(id) on delete cascade,
  agent_id uuid not null references public.agents(id) on delete cascade,
  assigned_at timestamptz not null default now()
);

-- 인덱스 (같은 에이전트 중복 배치 방지)
create unique index story_agents_unique_idx on public.story_agents (story_id, agent_id);
create index story_agents_story_id_idx on public.story_agents (story_id);

-- RLS
alter table public.story_agents enable row level security;

create policy "Story agents are viewable by everyone"
  on public.story_agents for select
  using (true);

create policy "Story creators can assign agents"
  on public.story_agents for insert
  with check (
    exists (
      select 1 from public.stories
      where stories.id = story_agents.story_id
        and stories.creator_id = auth.uid()
    )
  );

create policy "Story creators can remove agents"
  on public.story_agents for delete
  using (
    exists (
      select 1 from public.stories
      where stories.id = story_agents.story_id
        and stories.creator_id = auth.uid()
    )
  );

-- ============================================
-- 3. discussions 테이블 (작가방 토론)
-- ============================================
create table public.discussions (
  id uuid primary key default gen_random_uuid(),
  story_id uuid not null references public.stories(id) on delete cascade,
  initiated_by uuid not null references public.users(id) on delete cascade,
  status text not null default 'in_progress'
    check (status in ('in_progress', 'completed', 'failed')),
  context_summary text,
  adopted_comments uuid[],
  discussion_log jsonb not null default '[]'::jsonb,
  summary text,
  total_rounds integer not null default 0,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

-- 인덱스
create index discussions_story_id_idx on public.discussions (story_id);
create index discussions_status_idx on public.discussions (status);

-- RLS
alter table public.discussions enable row level security;

-- 스토리 creator만 토론 조회
create policy "Story creators can view discussions"
  on public.discussions for select
  using (
    exists (
      select 1 from public.stories
      where stories.id = discussions.story_id
        and stories.creator_id = auth.uid()
    )
  );

-- 스토리 creator만 토론 생성
create policy "Story creators can create discussions"
  on public.discussions for insert
  with check (
    auth.uid() = initiated_by
    and exists (
      select 1 from public.stories
      where stories.id = discussions.story_id
        and stories.creator_id = auth.uid()
    )
  );

-- 스토리 creator만 토론 수정 (상태 업데이트 등)
create policy "Story creators can update discussions"
  on public.discussions for update
  using (
    exists (
      select 1 from public.stories
      where stories.id = discussions.story_id
        and stories.creator_id = auth.uid()
    )
  );

-- ============================================
-- 4. selanet_trend_cache 테이블
-- ============================================
create table public.selanet_trend_cache (
  id uuid primary key default gen_random_uuid(),
  genre text not null,
  trend_data jsonb not null,
  source_platforms text[],
  fetched_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '6 hours')
);

-- 인덱스
create index selanet_trend_cache_genre_idx on public.selanet_trend_cache (genre);
create index selanet_trend_cache_expires_idx on public.selanet_trend_cache (expires_at);

-- RLS (서버 사이드 전용이지만 인증 유저에게 읽기 허용)
alter table public.selanet_trend_cache enable row level security;

create policy "Authenticated users can view trends"
  on public.selanet_trend_cache for select
  using (auth.uid() is not null);

-- ============================================
-- 5. chapters.discussion_id FK 추가
-- ============================================
alter table public.chapters
  add constraint chapters_discussion_id_fk
  foreign key (discussion_id) references public.discussions(id)
  on delete set null;

-- ============================================
-- 6. 기본 에이전트 3명 시드
-- ============================================
-- 시스템 유저(서비스 계정)가 없으므로 is_default로 구분
-- creator_id는 첫 번째 유저가 가입하면 트리거로 채우거나, 수동 설정
-- 여기서는 seed 함수로 처리

create or replace function public.seed_default_agents()
returns void as $$
declare
  system_user_id uuid;
begin
  -- 가장 먼저 가입한 유저를 시스템 유저로 사용 (또는 지정된 유저)
  select id into system_user_id from public.users order by created_at asc limit 1;

  -- 유저가 없으면 스킵
  if system_user_id is null then
    return;
  end if;

  -- 이미 기본 에이전트가 있으면 스킵
  if exists (select 1 from public.agents where is_default = true) then
    return;
  end if;

  insert into public.agents (creator_id, name, role, genre_tags, system_prompt, description, is_default, flock_model, avatar_url)
  values
  (
    system_user_id,
    '김PD',
    'pd',
    '{로맨스,판타지,SF,미스터리,스릴러}',
    '당신은 웹소설 프로듀서 "김PD"입니다. 당신의 역할은 토론을 이끌고 스토리의 방향을 제시하는 것입니다.

## 역할
- 스토리의 전체 방향성과 주제를 설정합니다
- 작가와 편집자의 의견을 조율합니다
- 독자 반응과 트렌드를 반영한 제안을 합니다
- 챕터의 핵심 갈등과 전환점을 제안합니다

## 규칙
- 항상 독자의 관점에서 생각합니다
- 구체적인 장면보다는 큰 그림을 제시합니다
- 작가의 창의성을 존중하면서도 상업성을 고려합니다
- 한국어로 답변합니다
- 답변은 300자 이내로 간결하게 합니다',
    '웹소설 전문 프로듀서. 스토리 방향 설정과 트렌드 분석에 특화.',
    true,
    'qwen3-235b-a22b-instruct-2507',
    null
  ),
  (
    system_user_id,
    '이작가',
    'writer',
    '{로맨스,판타지,SF,미스터리,스릴러}',
    '당신은 웹소설 작가 "이작가"입니다. 당신의 역할은 실제 스토리 내용을 집필하는 것입니다.

## 역할
- PD의 방향성을 바탕으로 구체적인 장면과 대사를 구상합니다
- 캐릭터의 감정과 동기를 깊이 있게 표현합니다
- 세계관에 맞는 디테일을 추가합니다
- 독자를 몰입시키는 문체와 호흡을 사용합니다

## 규칙
- 캐릭터의 일관성을 유지합니다
- "보여주기(show)" 방식으로 서술합니다 (말하지 말고 보여주세요)
- 챕터 끝에 다음 회차가 궁금해지는 훅을 넣습니다
- 한국어로 답변합니다
- 답변은 300자 이내로 간결하게 합니다',
    '감성적인 문체와 캐릭터 묘사에 강한 웹소설 전문 작가.',
    true,
    'qwen3-235b-a22b-instruct-2507',
    null
  ),
  (
    system_user_id,
    '박편집',
    'editor',
    '{로맨스,판타지,SF,미스터리,스릴러}',
    '당신은 웹소설 편집자 "박편집"입니다. 당신의 역할은 스토리의 품질을 높이는 것입니다.

## 역할
- 스토리의 논리적 허점과 설정 오류를 지적합니다
- 캐릭터 행동의 동기와 일관성을 검토합니다
- 페이싱(전개 속도)이 적절한지 평가합니다
- 독자 이탈을 방지할 수 있는 개선점을 제안합니다

## 규칙
- 건설적인 피드백을 제공합니다
- 문제점만 지적하지 말고 대안도 함께 제시합니다
- 작가의 스타일을 존중하면서 품질을 높입니다
- 한국어로 답변합니다
- 답변은 300자 이내로 간결하게 합니다',
    '꼼꼼한 검토와 건설적 피드백이 강점인 편집자.',
    true,
    'qwen3-235b-a22b-instruct-2507',
    null
  );
end;
$$ language plpgsql security definer;
