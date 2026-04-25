-- Phase 7: 온체인 기여/평판 + Nansen Trust Score
-- 기여도 온체인 기록, Nansen 기반 에이전트 Trust Score

-- ============================================
-- 1. contributions 테이블
-- ============================================
create table public.contributions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  story_id uuid references public.stories(id) on delete cascade,
  contribution_type text not null check (contribution_type in ('comment_adopted', 'chapter_generated', 'agent_created')),
  context jsonb default '{}',
  tx_hash text unique,
  onchain_confirmed boolean not null default false,
  created_at timestamptz not null default now()
);

-- ============================================
-- 2. nansen_wallet_cache 테이블
-- ============================================
create table public.nansen_wallet_cache (
  id uuid primary key default gen_random_uuid(),
  wallet_address text not null unique,
  labels text[] default '{}',
  is_smart_money boolean not null default false,
  portfolio_quality_score numeric(5,2) default 0,
  raw_response jsonb default '{}',
  fetched_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '24 hours'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================
-- 3. agent_trust_scores 테이블
-- ============================================
create table public.agent_trust_scores (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null unique references public.agents(id) on delete cascade,
  overall_score numeric(5,2) not null default 0,
  trust_tier text not null default 'none' check (trust_tier in ('none', 'bronze', 'silver', 'gold')),
  rehire_rate numeric(5,2) not null default 0,
  smart_money_ratio numeric(5,2) not null default 0,
  utilization_rate numeric(5,2) not null default 0,
  unique_hirers integer not null default 0,
  calculated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================
-- 4. 인덱스
-- ============================================
create index contributions_user_id_idx on public.contributions (user_id);
create index contributions_story_id_idx on public.contributions (story_id);
create index contributions_type_idx on public.contributions (contribution_type);
create index contributions_created_at_idx on public.contributions (created_at desc);

create index nansen_wallet_cache_address_idx on public.nansen_wallet_cache (wallet_address);
create index nansen_wallet_cache_expires_idx on public.nansen_wallet_cache (expires_at);

create index agent_trust_scores_agent_id_idx on public.agent_trust_scores (agent_id);
create index agent_trust_scores_tier_idx on public.agent_trust_scores (trust_tier);
create index agent_trust_scores_score_idx on public.agent_trust_scores (overall_score desc);

-- ============================================
-- 5. RLS 정책
-- ============================================

-- contributions: 공개 조회, 인증 유저 insert
alter table public.contributions enable row level security;

create policy "Anyone can view contributions"
  on public.contributions for select
  using (true);

create policy "Authenticated users can create contributions"
  on public.contributions for insert
  with check (auth.uid() = user_id);

create policy "Users can update own contributions"
  on public.contributions for update
  using (auth.uid() = user_id);

-- nansen_wallet_cache: 인증 유저만 조회
alter table public.nansen_wallet_cache enable row level security;

create policy "Authenticated users can view wallet cache"
  on public.nansen_wallet_cache for select
  using (auth.uid() is not null);

create policy "Authenticated users can insert wallet cache"
  on public.nansen_wallet_cache for insert
  with check (auth.uid() is not null);

create policy "Authenticated users can update wallet cache"
  on public.nansen_wallet_cache for update
  using (auth.uid() is not null);

-- agent_trust_scores: 공개 조회
alter table public.agent_trust_scores enable row level security;

create policy "Anyone can view trust scores"
  on public.agent_trust_scores for select
  using (true);

create policy "Authenticated users can insert trust scores"
  on public.agent_trust_scores for insert
  with check (auth.uid() is not null);

create policy "Authenticated users can update trust scores"
  on public.agent_trust_scores for update
  using (auth.uid() is not null);

-- ============================================
-- 6. updated_at 트리거
-- ============================================
create trigger set_nansen_wallet_cache_updated_at
  before update on public.nansen_wallet_cache
  for each row execute function public.handle_updated_at();

create trigger set_agent_trust_scores_updated_at
  before update on public.agent_trust_scores
  for each row execute function public.handle_updated_at();
