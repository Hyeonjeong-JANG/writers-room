-- Phase 2: Stories & Chapters tables
-- stories: 스토리 메타데이터, chapters: 챕터 본문

-- ============================================
-- 1. stories 테이블
-- ============================================
create table public.stories (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.users(id) on delete cascade,
  title text not null,
  synopsis text not null,
  genre text[] not null default '{}',
  world_setting jsonb,
  characters jsonb,
  status text not null default 'ongoing'
    check (status in ('ongoing', 'hiatus', 'completed')),
  cover_image_url text,
  view_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 인덱스
create index stories_creator_id_idx on public.stories (creator_id);
create index stories_status_idx on public.stories (status);
create index stories_genre_idx on public.stories using gin (genre);
create index stories_created_at_idx on public.stories (created_at desc);

-- updated_at 트리거 (handle_updated_at 함수는 users 마이그레이션에서 이미 생성)
create trigger stories_updated_at
  before update on public.stories
  for each row
  execute function public.handle_updated_at();

-- RLS
alter table public.stories enable row level security;

create policy "Stories are viewable by everyone"
  on public.stories for select
  using (true);

create policy "Authenticated users can create stories"
  on public.stories for insert
  with check (auth.uid() = creator_id);

create policy "Creators can update own stories"
  on public.stories for update
  using (auth.uid() = creator_id)
  with check (auth.uid() = creator_id);

create policy "Creators can delete own stories"
  on public.stories for delete
  using (auth.uid() = creator_id);

-- ============================================
-- 2. chapters 테이블
-- ============================================
create table public.chapters (
  id uuid primary key default gen_random_uuid(),
  story_id uuid not null references public.stories(id) on delete cascade,
  chapter_number integer not null,
  title text not null,
  content text not null,
  discussion_id uuid,
  status text not null default 'draft'
    check (status in ('draft', 'published')),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 인덱스
create unique index chapters_story_number_idx on public.chapters (story_id, chapter_number);
create index chapters_story_id_idx on public.chapters (story_id);

-- updated_at 트리거
create trigger chapters_updated_at
  before update on public.chapters
  for each row
  execute function public.handle_updated_at();

-- RLS
alter table public.chapters enable row level security;

-- published 챕터는 누구나 조회, draft는 creator만
create policy "Published chapters are viewable by everyone"
  on public.chapters for select
  using (
    status = 'published'
    or exists (
      select 1 from public.stories
      where stories.id = chapters.story_id
        and stories.creator_id = auth.uid()
    )
  );

-- 스토리 creator만 챕터 생성
create policy "Story creators can insert chapters"
  on public.chapters for insert
  with check (
    exists (
      select 1 from public.stories
      where stories.id = chapters.story_id
        and stories.creator_id = auth.uid()
    )
  );

-- 스토리 creator만 챕터 수정
create policy "Story creators can update chapters"
  on public.chapters for update
  using (
    exists (
      select 1 from public.stories
      where stories.id = chapters.story_id
        and stories.creator_id = auth.uid()
    )
  );

-- 스토리 creator만 draft 챕터 삭제
create policy "Story creators can delete draft chapters"
  on public.chapters for delete
  using (
    status = 'draft'
    and exists (
      select 1 from public.stories
      where stories.id = chapters.story_id
        and stories.creator_id = auth.uid()
    )
  );

-- ============================================
-- 3. 조회수 증가 RPC 함수
-- ============================================
create or replace function public.increment_view_count(story_id uuid)
returns void as $$
begin
  update public.stories
  set view_count = view_count + 1
  where id = story_id;
end;
$$ language plpgsql security definer;
