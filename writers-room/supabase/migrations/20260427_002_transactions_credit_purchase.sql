-- transactions 테이블 확장: 크레딧 구매 지원
-- agent_id, story_id를 nullable로 변경 (크레딧 구매는 에이전트/스토리 불필요)
-- metadata jsonb 컬럼 추가 (type, pack, credits 등)

alter table public.transactions
  alter column agent_id drop not null,
  alter column story_id drop not null;

alter table public.transactions
  add column metadata jsonb;
