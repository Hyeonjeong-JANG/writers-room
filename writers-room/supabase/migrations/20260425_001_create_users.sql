-- Phase 1: Users table
-- Supabase Auth UID를 PK로 사용, wallet_address로 사용자 식별

create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  wallet_address text unique not null,
  display_name text not null default '',
  avatar_url text,
  bio text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 인덱스
create unique index users_wallet_address_idx on public.users (wallet_address);

-- updated_at 자동 갱신 트리거
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger users_updated_at
  before update on public.users
  for each row
  execute function public.handle_updated_at();

-- RLS 활성화
alter table public.users enable row level security;

-- 누구나 프로필 조회 가능
create policy "Public profiles are viewable by everyone"
  on public.users for select
  using (true);

-- 본인만 자신의 프로필 생성
create policy "Users can insert own profile"
  on public.users for insert
  with check (auth.uid() = id);

-- 본인만 자신의 프로필 수정
create policy "Users can update own profile"
  on public.users for update
  using (auth.uid() = id)
  with check (auth.uid() = id);
