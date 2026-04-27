-- 월간 크레딧 시스템: users 테이블 컬럼 추가 + RPC 함수

-- 1. users 테이블에 크레딧 컬럼 추가
alter table public.users
  add column free_credits_remaining integer not null default 50,
  add column paid_credits integer not null default 0,
  add column free_credits_reset_at timestamptz not null default now();

-- 2. 크레딧 조회 + lazy 월간 리셋
create or replace function public.get_user_credits(p_user_id uuid)
returns json
language plpgsql
security definer
as $$
declare
  v_free integer;
  v_paid integer;
  v_reset_at timestamptz;
begin
  select free_credits_remaining, paid_credits, free_credits_reset_at
    into v_free, v_paid, v_reset_at
    from public.users
    where id = p_user_id
    for update;

  if not found then
    raise exception 'User not found: %', p_user_id;
  end if;

  -- 30일 경과 시 무료 크레딧 리셋
  if now() - v_reset_at >= interval '30 days' then
    update public.users
      set free_credits_remaining = 50,
          free_credits_reset_at = now()
      where id = p_user_id
      returning free_credits_remaining, free_credits_reset_at
        into v_free, v_reset_at;
  end if;

  return json_build_object(
    'free_credits', v_free,
    'paid_credits', v_paid,
    'total_credits', v_free + v_paid,
    'reset_at', v_reset_at
  );
end;
$$;

-- 3. 크레딧 차감 (무료 먼저 → 유료)
create or replace function public.deduct_credits(p_user_id uuid, p_amount integer)
returns json
language plpgsql
security definer
as $$
declare
  v_free integer;
  v_paid integer;
  v_total integer;
  v_free_deduct integer;
  v_paid_deduct integer;
begin
  -- FOR UPDATE 락으로 동시성 제어
  select free_credits_remaining, paid_credits
    into v_free, v_paid
    from public.users
    where id = p_user_id
    for update;

  if not found then
    raise exception 'User not found: %', p_user_id;
  end if;

  v_total := v_free + v_paid;

  if v_total < p_amount then
    raise exception 'Insufficient credits: required=%, available=%', p_amount, v_total
      using errcode = 'P0001';
  end if;

  -- 무료 먼저 차감
  v_free_deduct := least(v_free, p_amount);
  v_paid_deduct := p_amount - v_free_deduct;

  update public.users
    set free_credits_remaining = free_credits_remaining - v_free_deduct,
        paid_credits = paid_credits - v_paid_deduct
    where id = p_user_id;

  return json_build_object(
    'deducted', p_amount,
    'free_remaining', v_free - v_free_deduct,
    'paid_remaining', v_paid - v_paid_deduct
  );
end;
$$;

-- 4. 유료 크레딧 추가
create or replace function public.add_paid_credits(p_user_id uuid, p_amount integer)
returns json
language plpgsql
security definer
as $$
declare
  v_new_paid integer;
begin
  update public.users
    set paid_credits = paid_credits + p_amount
    where id = p_user_id
    returning paid_credits into v_new_paid;

  if not found then
    raise exception 'User not found: %', p_user_id;
  end if;

  return json_build_object('paid_credits', v_new_paid);
end;
$$;
