-- Phase 6: x402 USDC 결제 내역
-- 에이전트 고용 시 USDC 마이크로 페이먼트 기록

-- ============================================
-- 1. transactions 테이블
-- ============================================
create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  payer_id uuid not null references public.users(id) on delete cascade,
  payee_id uuid not null references public.users(id) on delete cascade,
  agent_id uuid not null references public.agents(id) on delete cascade,
  story_id uuid not null references public.stories(id) on delete cascade,
  amount_usdc numeric(10,2) not null,
  platform_fee numeric(10,2) not null,
  tx_hash text unique,
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'failed')),
  created_at timestamptz not null default now(),
  confirmed_at timestamptz
);

-- ============================================
-- 2. 인덱스
-- ============================================
create index transactions_payer_id_idx on public.transactions (payer_id);
create index transactions_payee_id_idx on public.transactions (payee_id);
create index transactions_agent_id_idx on public.transactions (agent_id);
create index transactions_status_idx on public.transactions (status);
create index transactions_created_at_idx on public.transactions (created_at desc);

-- ============================================
-- 3. RLS 정책
-- ============================================
alter table public.transactions enable row level security;

-- 본인 관련 트랜잭션만 조회 (payer 또는 payee)
create policy "Users can view own transactions"
  on public.transactions for select
  using (auth.uid() = payer_id or auth.uid() = payee_id);

-- 인증된 사용자가 결제 생성 (payer만)
create policy "Authenticated users can create transactions"
  on public.transactions for insert
  with check (auth.uid() = payer_id);

-- payer만 자기 트랜잭션 업데이트 (tx_hash, status 갱신)
create policy "Payer can update own transactions"
  on public.transactions for update
  using (auth.uid() = payer_id);

-- ============================================
-- 4. hire_count 원자적 증가 함수
-- ============================================
create or replace function public.increment_agent_hire_count(target_agent_id uuid)
returns void as $$
begin
  update public.agents
  set hire_count = hire_count + 1
  where id = target_agent_id;
end;
$$ language plpgsql security definer;
