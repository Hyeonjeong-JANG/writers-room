-- Phase 5: Agent Reviews table + 평균 평점 자동 갱신
-- 에이전트 리뷰/별점 시스템

-- ============================================
-- 1. agent_reviews 테이블
-- ============================================
create table public.agent_reviews (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references public.agents(id) on delete cascade,
  reviewer_id uuid not null references public.users(id) on delete cascade,
  rating integer not null check (rating >= 1 and rating <= 5),
  review_text text,
  story_id uuid references public.stories(id) on delete set null,
  created_at timestamptz not null default now()
);

-- 인덱스 (같은 에이전트에 중복 리뷰 방지)
create unique index agent_reviews_unique_idx on public.agent_reviews (agent_id, reviewer_id);
create index agent_reviews_agent_id_idx on public.agent_reviews (agent_id);

-- RLS
alter table public.agent_reviews enable row level security;

create policy "Agent reviews are viewable by everyone"
  on public.agent_reviews for select
  using (true);

create policy "Authenticated users can create reviews"
  on public.agent_reviews for insert
  with check (auth.uid() = reviewer_id);

create policy "Reviewers can update own reviews"
  on public.agent_reviews for update
  using (auth.uid() = reviewer_id);

create policy "Reviewers can delete own reviews"
  on public.agent_reviews for delete
  using (auth.uid() = reviewer_id);

-- ============================================
-- 2. 평균 평점 자동 갱신 트리거
-- ============================================
create or replace function public.update_agent_avg_rating()
returns trigger as $$
begin
  update public.agents
  set avg_rating = coalesce(
    (select round(avg(rating)::numeric, 2) from public.agent_reviews where agent_id = coalesce(NEW.agent_id, OLD.agent_id)),
    0
  )
  where id = coalesce(NEW.agent_id, OLD.agent_id);
  return coalesce(NEW, OLD);
end;
$$ language plpgsql security definer;

create trigger agent_reviews_avg_rating_insert
  after insert on public.agent_reviews
  for each row
  execute function public.update_agent_avg_rating();

create trigger agent_reviews_avg_rating_update
  after update on public.agent_reviews
  for each row
  execute function public.update_agent_avg_rating();

create trigger agent_reviews_avg_rating_delete
  after delete on public.agent_reviews
  for each row
  execute function public.update_agent_avg_rating();
