# API Specs: Writer's Room
> Created: 2026-04-25 11:00
> Last Updated: 2026-04-25 11:00
> 방식: Next.js API Routes (REST)
> Base Path: /api

## 1. 인증

- 모든 API는 Supabase Auth 세션 토큰으로 인증
- 헤더: `Authorization: Bearer <supabase_access_token>`
- 공개 API (인증 불요): 스토리 목록, 챕터 읽기 (published), 에이전트 목록

## 2. 공통 응답 형식

### 성공

```json
{
  "data": { ... },
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 100
  }
}
```

### 에러

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "제목은 필수입니다",
    "details": [...]
  }
}
```

### HTTP 상태 코드

| 코드 | 용도 |
|:---|:---|
| 200 | 성공 |
| 201 | 생성 성공 |
| 400 | 잘못된 요청 (Zod 검증 실패) |
| 401 | 인증 필요 |
| 403 | 권한 없음 |
| 404 | 리소스 없음 |
| 429 | Rate Limit 초과 |
| 500 | 서버 에러 |

## 3. Stories API

### GET /api/stories

스토리 목록 조회. 인증 불요.

| 파라미터 | 타입 | 필수 | 설명 |
|:---|:---|:---:|:---|
| genre | string | N | 장르 필터 |
| status | string | N | 상태 필터 (ongoing/completed) |
| sort | string | N | 정렬 (latest/popular). 기본: latest |
| page | number | N | 페이지. 기본: 1 |
| limit | number | N | 페이지 크기. 기본: 20, 최대: 50 |

### POST /api/stories

새 스토리 생성. 인증 필요.

```json
// Request Body
{
  "title": "달빛 아래의 약속",
  "synopsis": "...",
  "genre": ["로맨스", "판타지"],
  "worldSetting": { "era": "현대", "location": "서울" },
  "characters": [
    { "name": "이하늘", "personality": "...", "role": "주인공" }
  ]
}
```

### GET /api/stories/[id]

스토리 상세. 인증 불요.

### PATCH /api/stories/[id]

스토리 수정. 인증 필요 (creator만).

### GET /api/stories/[id]/chapters

챕터 목록. 인증 불요 (published만).

### GET /api/stories/[id]/chapters/[number]

챕터 상세 (본문 포함). 인증 불요 (published만).

### POST /api/stories/[id]/chapters

챕터 발행. 인증 필요 (creator만).

```json
{
  "title": "12화 - 숨겨진 진실",
  "content": "챕터 본문 텍스트...",
  "discussionId": "uuid (토론에서 생성된 경우)"
}
```

## 4. Room API (작가방)

### POST /api/room/discuss

토론 시작. 인증 필요 (스토리 creator만).

```json
// Request
{
  "storyId": "uuid",
  "adoptedCommentIds": ["uuid1", "uuid2"]
}

// Response (토론 완료 후)
{
  "data": {
    "discussionId": "uuid",
    "summary": "토론 요약 텍스트...",
    "totalRounds": 3,
    "keyDecisions": ["..."],
    "suggestedDirection": "..."
  }
}
```

내부 동작:
1. 스토리의 최근 챕터 + 세계관 + 캐릭터 컨텍스트 구성
2. 채택된 댓글 내용 추가
3. story_agents 조회 -> 각 에이전트의 system_prompt 로드
4. FLock API 순차 호출 (PD -> 작가 -> 편집자, 2-3 라운드)
5. 요약 생성 (FLock API)
6. discussions 테이블에 저장
7. 응답 반환

### GET /api/room/discuss/[discussionId]

토론 상세 (전체 로그 포함). 인증 필요 (스토리 creator만).

### POST /api/room/generate

챕터 초안 생성. 인증 필요.

```json
// Request
{
  "discussionId": "uuid"
}

// Response
{
  "data": {
    "title": "12화 - 숨겨진 진실",
    "content": "생성된 챕터 본문...",
    "wordCount": 2500
  }
}
```

## 5. Comments API

### GET /api/comments?chapterId=uuid

챕터 댓글 목록. 인증 불요.

| 파라미터 | 타입 | 필수 | 설명 |
|:---|:---|:---:|:---|
| chapterId | uuid | Y | 챕터 ID |
| type | string | N | 'general', 'idea_plot', 'idea_character', 'idea_setting' |
| sort | string | N | 'latest', 'popular'. 기본: latest |

### POST /api/comments

댓글 작성. 인증 필요.

```json
{
  "chapterId": "uuid",
  "content": "여기서 주인공이 비밀을 알게 되면 좋겠어요!",
  "commentType": "idea_plot"
}
```

### POST /api/comments/analyze

AI 댓글 분석 및 선별. 인증 필요 (스토리 creator만). 서버 내부 호출.

```json
// Request
{
  "storyId": "uuid",
  "chapterId": "uuid"
}

// Response
{
  "data": {
    "analyzedCount": 45,
    "adoptedComments": [
      {
        "commentId": "uuid",
        "content": "...",
        "relevanceScore": 0.85,
        "reason": "캐릭터 발전에 유용한 제안"
      }
    ]
  }
}
```

## 6. Agents API

### GET /api/agents

에이전트 마켓플레이스 목록. 인증 불요.

| 파라미터 | 타입 | 필수 | 설명 |
|:---|:---|:---:|:---|
| role | string | N | 'pd', 'writer', 'editor' |
| genre | string | N | 장르 필터 |
| sort | string | N | 'rating', 'popular', 'latest'. 기본: rating |
| minRating | number | N | 최소 평점 |

### POST /api/agents

에이전트 생성. 인증 필요.

```json
{
  "name": "이작가",
  "role": "writer",
  "genreTags": ["로맨스", "판타지"],
  "systemPrompt": "당신은 로맨스 소설 전문 작가입니다...",
  "fewShotExamples": [...],
  "priceUsdc": 1.50,
  "flockModel": "qwen3-30b-a3b-instruct-2507",
  "description": "..."
}
```

### GET /api/agents/[id]

에이전트 상세. 인증 불요.

### PATCH /api/agents/[id]

에이전트 수정. 인증 필요 (creator만).

### POST /api/agents/[id]/hire

에이전트 고용 (스토리에 배치). 인증 필요.

```json
// Request
{
  "storyId": "uuid"
}

// Response
{
  "data": {
    "paymentRequired": true,
    "amount": 1.50,
    "currency": "USDC",
    "paymentMethod": "x402"
  }
}
```

### POST /api/agents/[id]/review

에이전트 리뷰 작성. 인증 필요.

```json
{
  "rating": 5,
  "reviewText": "로맨스 장면이 훌륭합니다",
  "storyId": "uuid"
}
```

## 7. Payments API

### POST /api/payments/x402/initiate

x402 결제 시작. 인증 필요.

```json
// Request
{
  "agentId": "uuid",
  "storyId": "uuid"
}

// Response
{
  "data": {
    "paymentId": "uuid",
    "amount": "1500000",
    "token": "USDC",
    "recipient": "0x...",
    "chainId": 8453,
    "x402PaymentHeader": "..."
  }
}
```

### POST /api/payments/x402/confirm

결제 확인 (온체인 트랜잭션 제출 후). 인증 필요.

```json
{
  "paymentId": "uuid",
  "txHash": "0x..."
}
```

### GET /api/payments/history

결제 내역 조회. 인증 필요 (본인만).

| 파라미터 | 타입 | 필수 | 설명 |
|:---|:---|:---:|:---|
| type | string | N | 'paid', 'received' |
| page | number | N | 페이지 |

## 8. Onchain API

### POST /api/onchain/contribution

기여 기록 온체인 제출. 시스템 내부 호출.

```json
{
  "userId": "uuid",
  "storyId": "uuid",
  "chapterNumber": 12,
  "contributionType": "comment_adopted",
  "description": "독자 댓글이 12화 스토리 방향에 반영됨"
}
```

### GET /api/onchain/contributions/[userId]

유저의 기여 히스토리. 인증 불요.

### GET /api/onchain/reputation/[agentId]

에이전트 온체인 평판 조회. 인증 불요.

## 9. Nansen Integration API

### GET /api/nansen/wallet/[address]

지갑 분석 (Nansen x402 호출, 캐시 우선). 인증 필요.

```json
// Response
{
  "data": {
    "address": "0x...",
    "labels": ["Smart Money", "DeFi Power User"],
    "isSmartMoney": true,
    "firstSeenAt": "2023-01-15T...",
    "totalTxCount": 1542,
    "riskScore": 0.12,
    "cached": true
  }
}
```

내부 동작: nansen_wallet_cache 확인 -> 만료 시 Nansen API x402 호출 ($0.01 USDC) -> 캐시 갱신

### GET /api/nansen/agent-trust/[agentId]

에이전트 Nansen Trust Score. 인증 불요.

```json
// Response
{
  "data": {
    "agentId": "uuid",
    "rehireRate": 34.5,
    "smartMoneyRatio": 22.0,
    "utilizationRate": 78.3,
    "uniqueHirers": 45,
    "trustTier": "silver",
    "overallScore": 58.7,
    "lastCalculatedAt": "2026-04-25T..."
  }
}
```

### POST /api/nansen/recalculate/[agentId]

에이전트 신뢰 점수 수동 재산출. 시스템/관리자 전용.

## 10. Selanet Integration API

### GET /api/selanet/trends?genre=로맨스

장르별 트렌드 조회 (캐시 우선). 인증 필요.

```json
// Response
{
  "data": {
    "genre": "로맨스",
    "trends": [
      { "keyword": "회귀물", "score": 92, "source": "네이버시리즈" },
      { "keyword": "계약 연애", "score": 85, "source": "카카오페이지" }
    ],
    "popularPatterns": ["비밀 정체 드러남", "시간 역행"],
    "sourcePlatforms": ["네이버시리즈", "카카오페이지", "Wattpad"],
    "fetchedAt": "2026-04-25T...",
    "cached": true
  }
}
```

내부 동작: selanet_trend_cache 확인 -> 만료 시 Selanet API 호출 -> 캐시 갱신

## 11. Dashboard API

### GET /api/dashboard/stats

대시보드 통계. 인증 필요 (본인만).

```json
// Response
{
  "data": {
    "stories": { "total": 3, "ongoing": 2, "completed": 1 },
    "agents": { "total": 2, "totalHires": 45, "avgRating": 4.5 },
    "earnings": { "totalUsdc": 67.50, "thisMonth": 12.00 },
    "contributions": { "total": 15, "commentsAdopted": 8 }
  }
}
```

## 12. Rate Limiting

| 엔드포인트 | 제한 | 기준 |
|:---|:---|:---|
| POST /api/room/discuss | 10회/시간 | 유저별 |
| POST /api/room/generate | 20회/시간 | 유저별 |
| POST /api/comments | 30회/시간 | 유저별 |
| POST /api/comments/analyze | 5회/시간 | 유저별 |
| POST /api/payments/* | 50회/시간 | 유저별 |
| GET (전체) | 100회/분 | IP별 |

## 11. FLock API 호출 패턴

모든 FLock API 호출은 서버사이드에서만 실행. API 키 노출 금지.

```typescript
// lib/flock/client.ts 기본 구조
import OpenAI from 'openai'

const flockClient = new OpenAI({
  baseURL: process.env.FLOCK_API_BASE_URL,  // https://api.flock.io/v1
  apiKey: process.env.FLOCK_API_KEY,
  defaultHeaders: {
    'x-litellm-api-key': process.env.FLOCK_API_KEY,
  },
})
```

## 12. Related Documents
- **Concept_Design**: [Product Specs](../01_Concept_Design/03_PRODUCT_SPECS.md) - 기능 명세 및 사용자 플로우
- **Technical_Specs**: [Development Principles](./00_DEVELOPMENT_PRINCIPLES.md) - 프로젝트 구조 및 패턴
- **Technical_Specs**: [DB Schema](./01_DB_SCHEMA.md) - 데이터 모델 참조
- **Logic_Progress**: [Business Logic](../04_Logic_Progress/01_BUSINESS_LOGIC.md) - 비즈니스 로직 참조
