# Writers' Room

AI 멀티에이전트가 독자 댓글을 반영하여 웹소설을 자동 연재하는 플랫폼.

## 핵심 컨셉

1. **스토리 생성** — 작가가 제목/시놉시스/장르/세계관/캐릭터를 설정
2. **AI 에이전트 고용** — 마켓플레이스에서 PD/작가/편집자 에이전트를 고용 (USDC 결제)
3. **멀티에이전트 토론** — PD → 작가 → 편집자 순서로 라운드 토론 후 챕터 생성
4. **독자 참여** — 발행된 챕터에 댓글로 아이디어 제안
5. **자동 연재** — 48시간 후 AI가 댓글을 분석/선별 → 토론 → 다음 챕터 자동 생성/발행
6. **온체인 기여 기록** — 채택된 댓글, 챕터 발행 등 기여를 Base 체인에 기록

## 기술 스택

| 영역       | 기술                              |
| ---------- | --------------------------------- |
| 프레임워크 | Next.js 16 (App Router)           |
| 언어       | TypeScript                        |
| UI         | Tailwind CSS 4 + shadcn/ui        |
| DB / 인증  | Supabase (PostgreSQL + Auth)      |
| AI         | OpenAI (GPT-4o-mini)              |
| 블록체인   | Base (viem + wagmi)               |
| 결제       | x402 프로토콜 (USDC Smart Wallet) |
| 트렌드     | AI 트렌드 분석 (GPT-4o-mini)      |
| 신뢰도     | 온체인 직접 분석 (viem)           |
| 배포       | Vercel                            |

## 프로젝트 구조

```
src/
├── app/
│   ├── (main)/              # 메인 레이아웃 (GNB + TabBar)
│   │   ├── agents/          # 에이전트 마켓플레이스
│   │   ├── dashboard/       # 대시보드
│   │   ├── profile/         # 프로필/기여 내역
│   │   └── stories/         # 스토리 목록/상세/챕터/작가방
│   └── api/
│       ├── agents/          # 에이전트 CRUD + 고용
│       ├── comments/        # 댓글 CRUD + AI 분석
│       ├── cron/            # 자동 회차 생성 (매시간)
│       ├── nansen/          # 지갑 분석 + 신뢰도
│       ├── onchain/         # 기여 기록
│       ├── payments/        # x402 결제 (initiate/confirm)
│       ├── room/            # 토론 + 챕터 생성
│       ├── selanet/         # 트렌드 키워드
│       └── stories/         # 스토리/챕터 CRUD
├── features/
│   ├── agent/               # 에이전트 훅/컴포넌트/스키마
│   ├── comment/             # 댓글 훅/컴포넌트/스키마
│   ├── onchain/             # 온체인 기여/신뢰도/Nansen
│   ├── payment/             # x402 결제 모달/훅
│   ├── room/                # 멀티에이전트 토론 orchestrator
│   └── story/               # 스토리/챕터 훅/스키마
├── lib/
│   ├── ai/                  # OpenAI 클라이언트
│   ├── trends/              # AI 트렌드 클라이언트
│   ├── supabase/            # Supabase 클라이언트 (client/server/service)
│   └── wagmi/               # 지갑 연결 설정
└── components/              # 공통 UI 컴포넌트
```

## 주요 플로우

### 자동 연재 파이프라인

```
챕터 발행 → 48시간 댓글 수집 → AI 댓글 분석/선별
→ PD/작가/편집자 멀티에이전트 토론 → 챕터 생성 → 자동 발행
→ (반복)
```

- Vercel Cron이 매시간 실행 (`/api/cron/auto-chapter`)
- `published_at + 48h`가 지난 최신 챕터를 찾아 자동 처리
- 중복 방지: 이미 토론이 시작된 챕터는 스킵

### 에이전트 고용 + x402 결제

```
마켓플레이스 탐색 → 에이전트 선택 → 스토리 배치
→ (유료) USDC Smart Wallet 결제 → 온체인 확인 → 배치 완료
```

### 온체인 기여 기록

```
기여 발생 (댓글 채택/챕터 발행) → DB 기록
→ 유저 지갑 조회 → Base 체인 컨트랙트 호출 (fire-and-forget)
→ tx_hash 저장
```

## 시작하기

### 필수 환경변수

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# OpenAI
OPENAI_API_KEY=
OPENAI_DEFAULT_MODEL=gpt-4o-mini

# Base Chain
NEXT_PUBLIC_BASE_CHAIN_ID=8453

# Cron
CRON_SECRET=
```

### 선택 환경변수

```env
# 온체인 기여 기록 (컨트랙트 배포 후)
NEXT_PUBLIC_CONTRIBUTION_CONTRACT=0x...
NEXT_PUBLIC_REPUTATION_CONTRACT=0x...
ONCHAIN_SIGNER_PRIVATE_KEY=0x...

# Coinbase Smart Wallet
NEXT_PUBLIC_COINBASE_PROJECT_ID=
```

### 로컬 실행

```bash
# 의존성 설치
npm ci

# Supabase 마이그레이션
npx supabase db push

# 개발 서버
npm run dev
```

### 배포

Vercel에 연결하면 자동 배포. Cron job은 `vercel.json`에 등록되어 매시간 실행됩니다.

## DB 스키마

| 테이블                | 설명                                          |
| --------------------- | --------------------------------------------- |
| `users`               | 유저 (Supabase Auth 연동, 지갑 주소 포함)     |
| `stories`             | 스토리 (제목, 시놉시스, 장르, 세계관, 캐릭터) |
| `chapters`            | 챕터 (내용, 상태, 발행일)                     |
| `agents`              | AI 에이전트 (역할, 모델, 가격, 신뢰도)        |
| `story_agents`        | 스토리-에이전트 배치                          |
| `discussions`         | 멀티에이전트 토론 로그                        |
| `comments`            | 독자 댓글 (채택 여부, 반영 챕터)              |
| `agent_reviews`       | 에이전트 리뷰/평점                            |
| `transactions`        | x402 결제 내역                                |
| `contributions`       | 기여 기록 (온체인 tx_hash 포함)               |
| `agent_trust_scores`  | 에이전트 신뢰도 점수                          |
| `nansen_wallet_cache` | 온체인 지갑 분석 캐시                         |

## 라이선스

Private
