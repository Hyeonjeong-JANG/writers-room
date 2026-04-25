# DB Schema: Writer's Room
> Created: 2026-04-25 11:00
> Last Updated: 2026-04-25 11:00
> DB: Supabase (PostgreSQL)

## 1. ER 관계 요약

```
users ─────┬──< stories ──< chapters
            │        │           │
            │        │           └──< comments
            │        │
            │        └──< story_agents (중간 테이블)
            │                │
            ├──< agents ─────┘
            │      │
            │      └──< agent_reviews
            │
            ├──< contributions (온체인 기여 기록)
            │
            └──< transactions (x402 결제 내역)
```

## 2. 테이블 명세

### 2.1 users

유저 정보. Supabase Auth와 연동.

| 컬럼 | 타입 | 제약 | 설명 |
|:---|:---|:---|:---|
| id | uuid | PK, DEFAULT gen_random_uuid() | Supabase Auth UID |
| wallet_address | text | UNIQUE, NOT NULL | Smart Wallet 주소 (Base) |
| display_name | text | NOT NULL | 표시 이름 |
| avatar_url | text | NULLABLE | 프로필 이미지 URL |
| bio | text | NULLABLE | 자기소개 |
| created_at | timestamptz | DEFAULT now() | 가입일 |
| updated_at | timestamptz | DEFAULT now() | 수정일 |

인덱스: `wallet_address` (UNIQUE)

### 2.2 stories

스토리 메타데이터.

| 컬럼 | 타입 | 제약 | 설명 |
|:---|:---|:---|:---|
| id | uuid | PK, DEFAULT gen_random_uuid() | |
| creator_id | uuid | FK -> users.id, NOT NULL | 스토리 생성자 |
| title | text | NOT NULL | 스토리 제목 |
| synopsis | text | NOT NULL | 시놉시스 |
| genre | text[] | NOT NULL | 장르 태그 배열 |
| world_setting | jsonb | NULLABLE | 세계관 설정 (자유 형식) |
| characters | jsonb | NULLABLE | 캐릭터 설정 배열 |
| status | text | NOT NULL, DEFAULT 'ongoing' | 'ongoing', 'hiatus', 'completed' |
| cover_image_url | text | NULLABLE | 커버 이미지 |
| view_count | integer | DEFAULT 0 | 조회수 |
| created_at | timestamptz | DEFAULT now() | |
| updated_at | timestamptz | DEFAULT now() | |

인덱스: `creator_id`, `status`, `genre` (GIN), `created_at DESC`

### 2.3 chapters

챕터 본문.

| 컬럼 | 타입 | 제약 | 설명 |
|:---|:---|:---|:---|
| id | uuid | PK, DEFAULT gen_random_uuid() | |
| story_id | uuid | FK -> stories.id, NOT NULL | |
| chapter_number | integer | NOT NULL | 회차 번호 |
| title | text | NOT NULL | 챕터 제목 |
| content | text | NOT NULL | 본문 텍스트 |
| discussion_id | uuid | FK -> discussions.id, NULLABLE | 이 챕터를 생성한 토론 |
| status | text | NOT NULL, DEFAULT 'draft' | 'draft', 'published' |
| published_at | timestamptz | NULLABLE | 발행 시각 |
| created_at | timestamptz | DEFAULT now() | |
| updated_at | timestamptz | DEFAULT now() | |

인덱스: `(story_id, chapter_number)` UNIQUE, `story_id`

### 2.4 agents

AI 에이전트 정보.

| 컬럼 | 타입 | 제약 | 설명 |
|:---|:---|:---|:---|
| id | uuid | PK, DEFAULT gen_random_uuid() | |
| creator_id | uuid | FK -> users.id, NOT NULL | 에이전트 빌더 |
| name | text | NOT NULL | 에이전트 이름 |
| role | text | NOT NULL | 'pd', 'writer', 'editor' |
| genre_tags | text[] | NOT NULL | 전문 장르 |
| system_prompt | text | NOT NULL | 시스템 프롬프트 |
| few_shot_examples | jsonb | NULLABLE | 샘플 작품 (few-shot) |
| avatar_url | text | NULLABLE | 에이전트 아바타 |
| description | text | NULLABLE | 소개 |
| price_usdc | numeric(10,2) | NOT NULL, DEFAULT 0 | 고용 가격 (USDC) |
| is_default | boolean | DEFAULT false | 기본 제공 에이전트 여부 |
| is_active | boolean | DEFAULT true | 마켓플레이스 노출 여부 |
| hire_count | integer | DEFAULT 0 | 총 고용 횟수 |
| avg_rating | numeric(3,2) | DEFAULT 0 | 평균 평점 |
| flock_model | text | NOT NULL | FLock API 모델 ID |
| created_at | timestamptz | DEFAULT now() | |
| updated_at | timestamptz | DEFAULT now() | |

인덱스: `creator_id`, `role`, `genre_tags` (GIN), `avg_rating DESC`, `is_active`

### 2.5 story_agents

스토리에 배치된 에이전트 (중간 테이블).

| 컬럼 | 타입 | 제약 | 설명 |
|:---|:---|:---|:---|
| id | uuid | PK, DEFAULT gen_random_uuid() | |
| story_id | uuid | FK -> stories.id, NOT NULL | |
| agent_id | uuid | FK -> agents.id, NOT NULL | |
| assigned_at | timestamptz | DEFAULT now() | 배치 시각 |

인덱스: `(story_id, agent_id)` UNIQUE

### 2.6 discussions

작가방 토론 세션.

| 컬럼 | 타입 | 제약 | 설명 |
|:---|:---|:---|:---|
| id | uuid | PK, DEFAULT gen_random_uuid() | |
| story_id | uuid | FK -> stories.id, NOT NULL | |
| initiated_by | uuid | FK -> users.id, NOT NULL | 토론 시작한 유저 |
| status | text | NOT NULL, DEFAULT 'in_progress' | 'in_progress', 'completed', 'failed' |
| context_summary | text | NULLABLE | 입력 컨텍스트 요약 |
| adopted_comments | uuid[] | NULLABLE | 투입된 채택 댓글 ID 배열 |
| discussion_log | jsonb | NOT NULL, DEFAULT '[]' | 전체 토론 로그 |
| summary | text | NULLABLE | 토론 요약 |
| total_rounds | integer | DEFAULT 0 | 토론 라운드 수 |
| created_at | timestamptz | DEFAULT now() | |
| completed_at | timestamptz | NULLABLE | 완료 시각 |

인덱스: `story_id`, `status`

discussion_log jsonb 구조:
```json
[
  {
    "round": 1,
    "agent_id": "uuid",
    "agent_name": "김PD",
    "agent_role": "pd",
    "message": "이번 회차는...",
    "timestamp": "2026-04-25T10:23:00Z"
  }
]
```

### 2.7 comments

챕터 댓글.

| 컬럼 | 타입 | 제약 | 설명 |
|:---|:---|:---|:---|
| id | uuid | PK, DEFAULT gen_random_uuid() | |
| chapter_id | uuid | FK -> chapters.id, NOT NULL | |
| user_id | uuid | FK -> users.id, NOT NULL | |
| content | text | NOT NULL | 댓글 내용 |
| comment_type | text | NOT NULL, DEFAULT 'general' | 'general', 'idea_plot', 'idea_character', 'idea_setting' |
| like_count | integer | DEFAULT 0 | 좋아요 수 |
| is_adopted | boolean | DEFAULT false | AI 선별 여부 |
| adopted_in_discussion | uuid | FK -> discussions.id, NULLABLE | 투입된 토론 |
| adopted_in_chapter | integer | NULLABLE | 반영된 챕터 번호 |
| created_at | timestamptz | DEFAULT now() | |

인덱스: `chapter_id`, `user_id`, `is_adopted`, `comment_type`

### 2.8 agent_reviews

에이전트 리뷰/별점.

| 컬럼 | 타입 | 제약 | 설명 |
|:---|:---|:---|:---|
| id | uuid | PK, DEFAULT gen_random_uuid() | |
| agent_id | uuid | FK -> agents.id, NOT NULL | |
| reviewer_id | uuid | FK -> users.id, NOT NULL | |
| rating | integer | NOT NULL, CHECK (1-5) | 별점 |
| review_text | text | NULLABLE | 리뷰 텍스트 |
| story_id | uuid | FK -> stories.id, NULLABLE | 어떤 스토리에서 사용 후 리뷰 |
| created_at | timestamptz | DEFAULT now() | |

인덱스: `agent_id`, `(agent_id, reviewer_id)` UNIQUE

### 2.9 transactions

x402 USDC 결제 내역.

| 컬럼 | 타입 | 제약 | 설명 |
|:---|:---|:---|:---|
| id | uuid | PK, DEFAULT gen_random_uuid() | |
| payer_id | uuid | FK -> users.id, NOT NULL | 결제자 |
| payee_id | uuid | FK -> users.id, NOT NULL | 수령자 (에이전트 빌더) |
| agent_id | uuid | FK -> agents.id, NOT NULL | 고용된 에이전트 |
| amount_usdc | numeric(10,2) | NOT NULL | 결제 금액 |
| platform_fee | numeric(10,2) | NOT NULL | 플랫폼 수수료 |
| tx_hash | text | UNIQUE, NOT NULL | Base 트랜잭션 해시 |
| status | text | NOT NULL, DEFAULT 'pending' | 'pending', 'confirmed', 'failed' |
| created_at | timestamptz | DEFAULT now() | |
| confirmed_at | timestamptz | NULLABLE | 온체인 확인 시각 |

인덱스: `payer_id`, `payee_id`, `agent_id`, `tx_hash` (UNIQUE), `status`

### 2.10 contributions

온체인 기여 기록 (오프체인 미러).

| 컬럼 | 타입 | 제약 | 설명 |
|:---|:---|:---|:---|
| id | uuid | PK, DEFAULT gen_random_uuid() | |
| user_id | uuid | FK -> users.id, NOT NULL | 기여자 |
| story_id | uuid | FK -> stories.id, NOT NULL | 기여한 스토리 |
| chapter_number | integer | NULLABLE | 기여한 챕터 |
| contribution_type | text | NOT NULL | 'comment_adopted', 'agent_created', 'chapter_generated' |
| description | text | NULLABLE | 기여 설명 |
| tx_hash | text | UNIQUE, NULLABLE | Base 트랜잭션 해시 (온체인 기록) |
| onchain_recorded | boolean | DEFAULT false | 온체인 기록 완료 여부 |
| created_at | timestamptz | DEFAULT now() | |

인덱스: `user_id`, `story_id`, `contribution_type`

### 2.11 nansen_wallet_cache

Nansen API 응답 캐시 (x402 호출 비용 절감용).

| 컬럼 | 타입 | 제약 | 설명 |
|:---|:---|:---|:---|
| id | uuid | PK, DEFAULT gen_random_uuid() | |
| wallet_address | text | UNIQUE, NOT NULL | 조회한 지갑 주소 |
| labels | text[] | NULLABLE | Nansen 라벨 배열 (예: 'Smart Money', 'Whale') |
| is_smart_money | boolean | DEFAULT false | Smart Money 여부 |
| first_seen_at | timestamptz | NULLABLE | 지갑 최초 활동일 |
| total_tx_count | integer | NULLABLE | 총 트랜잭션 수 |
| risk_score | numeric(3,2) | NULLABLE | 리스크 점수 (0-1, 높을수록 위험) |
| raw_response | jsonb | NULLABLE | Nansen API 원본 응답 |
| fetched_at | timestamptz | DEFAULT now() | 캐시 시각 |
| expires_at | timestamptz | NOT NULL | 캐시 만료 (기본 24시간) |

인덱스: `wallet_address` (UNIQUE), `expires_at`

### 2.12 agent_trust_scores

Nansen 기반 에이전트 신뢰 점수 (정기 배치 갱신).

| 컬럼 | 타입 | 제약 | 설명 |
|:---|:---|:---|:---|
| id | uuid | PK, DEFAULT gen_random_uuid() | |
| agent_id | uuid | FK -> agents.id, UNIQUE, NOT NULL | |
| rehire_rate | numeric(5,2) | DEFAULT 0 | 재고용률 (%) — 동일 지갑 반복 고용 비율 |
| smart_money_ratio | numeric(5,2) | DEFAULT 0 | Smart Money 고용자 비율 (%) |
| utilization_rate | numeric(5,2) | DEFAULT 0 | 활용률 (%) — 고용 후 챕터 발행 비율 |
| unique_hirers | integer | DEFAULT 0 | 고유 고용 지갑 수 |
| trust_tier | text | DEFAULT 'none' | 'none', 'bronze', 'silver', 'gold' |
| overall_score | numeric(5,2) | DEFAULT 0 | 종합 신뢰 점수 (0-100) |
| last_calculated_at | timestamptz | DEFAULT now() | 마지막 산출 시각 |

인덱스: `agent_id` (UNIQUE), `trust_tier`, `overall_score DESC`

신뢰 점수 산출 공식:
```
overall_score = (rehire_rate * 0.3) + (smart_money_ratio * 0.25) + (utilization_rate * 0.25) + (min(unique_hirers, 100) * 0.2)

trust_tier:
  - gold: overall_score >= 75
  - silver: overall_score >= 50
  - bronze: overall_score >= 25
  - none: < 25
```

### 2.13 selanet_trend_cache

Selanet 트렌드 데이터 캐시.

| 컬럼 | 타입 | 제약 | 설명 |
|:---|:---|:---|:---|
| id | uuid | PK, DEFAULT gen_random_uuid() | |
| genre | text | NOT NULL | 장르 |
| trend_data | jsonb | NOT NULL | 트렌드 키워드, 인기 패턴 등 |
| source_platforms | text[] | NULLABLE | 데이터 출처 (네이버시리즈, Wattpad 등) |
| fetched_at | timestamptz | DEFAULT now() | |
| expires_at | timestamptz | NOT NULL | 캐시 만료 (기본 6시간) |

인덱스: `genre`, `expires_at`

## 3. Row Level Security (RLS) 정책

| 테이블 | SELECT | INSERT | UPDATE | DELETE |
|:---|:---|:---|:---|:---|
| users | 본인 또는 공개 필드 | Auth 가입 시 | 본인만 | 불가 |
| stories | 모든 사용자 | 인증된 사용자 | creator만 | creator만 |
| chapters | published만 공개, draft는 creator만 | creator만 | creator만 | creator만 (draft만) |
| agents | is_active만 공개 | 인증된 사용자 | creator만 | creator만 |
| comments | 모든 사용자 | 인증된 사용자 | 작성자만 | 작성자만 |
| discussions | 스토리 creator만 | 시스템 (service_role) | 시스템 | 불가 |
| transactions | 본인 관련만 | 시스템 | 시스템 | 불가 |
| contributions | 모든 사용자 (공개) | 시스템 | 시스템 | 불가 |

## 4. Related Documents
- **Concept_Design**: [Product Specs](../01_Concept_Design/03_PRODUCT_SPECS.md) - 기능 명세 및 데이터 요구사항
- **Technical_Specs**: [Development Principles](./00_DEVELOPMENT_PRINCIPLES.md) - Supabase 설정 및 ORM
- **Technical_Specs**: [API Specs](./02_API_SPECS.md) - API가 사용하는 테이블 참조
- **Logic_Progress**: [Business Logic](../04_Logic_Progress/01_BUSINESS_LOGIC.md) - 비즈니스 로직 참조
