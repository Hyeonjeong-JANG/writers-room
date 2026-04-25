-- Phase 4: Comments table
-- 챕터 댓글 (일반 댓글 + 아이디어 제안)

-- ============================================
-- 1. comments 테이블
-- ============================================
create table public.comments (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references public.chapters(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  content text not null,
  comment_type text not null default 'general'
    check (comment_type in ('general', 'idea_plot', 'idea_character', 'idea_setting')),
  like_count integer not null default 0,
  is_adopted boolean not null default false,
  adopted_in_discussion uuid references public.discussions(id) on delete set null,
  adopted_in_chapter integer,
  created_at timestamptz not null default now()
);

-- 인덱스
create index comments_chapter_id_idx on public.comments (chapter_id);
create index comments_user_id_idx on public.comments (user_id);
create index comments_is_adopted_idx on public.comments (is_adopted);
create index comments_comment_type_idx on public.comments (comment_type);
create index comments_created_at_idx on public.comments (created_at desc);

-- RLS
alter table public.comments enable row level security;

-- 모든 사용자가 댓글 조회 가능
create policy "Comments are viewable by everyone"
  on public.comments for select
  using (true);

-- 인증된 사용자만 댓글 작성
create policy "Authenticated users can create comments"
  on public.comments for insert
  with check (auth.uid() = user_id);

-- 작성자만 댓글 수정
create policy "Users can update own comments"
  on public.comments for update
  using (auth.uid() = user_id);

-- 작성자만 댓글 삭제
create policy "Users can delete own comments"
  on public.comments for delete
  using (auth.uid() = user_id);

-- ============================================
-- 2. 좋아요 증가 RPC 함수
-- ============================================
create or replace function public.increment_like_count(comment_id uuid)
returns void as $$
begin
  update public.comments
  set like_count = like_count + 1
  where id = comment_id;
end;
$$ language plpgsql security definer;

-- ============================================
-- 3. 댓글 채택 업데이트 함수 (스토리 creator만 호출 가능)
-- ============================================
create or replace function public.adopt_comments(
  p_comment_ids uuid[],
  p_discussion_id uuid
)
returns void as $$
begin
  update public.comments
  set is_adopted = true,
      adopted_in_discussion = p_discussion_id
  where id = any(p_comment_ids);
end;
$$ language plpgsql security definer;
