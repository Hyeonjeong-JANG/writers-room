# Development Principles: Writer's Room
> Created: 2026-04-25 11:00
> Last Updated: 2026-04-25 11:00

## 1. Architecture

### 프로젝트 구조 (Feature 기반)

```
writers-room/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── (auth)/                   # 인증 관련 라우트 그룹
│   │   │   └── login/
│   │   ├── (main)/                   # 인증 후 메인 라우트 그룹
│   │   │   ├── stories/
│   │   │   │   ├── [id]/
│   │   │   │   │   ├── chapter/[n]/
│   │   │   │   │   └── room/        # 작가방
│   │   │   │   └── create/
│   │   │   ├── agents/
│   │   │   │   ├── [id]/
│   │   │   │   └── create/
│   │   │   └── dashboard/
│   │   │       └── earnings/
│   │   ├── api/                      # REST API Routes
│   │   │   ├── stories/
│   │   │   ├── agents/
│   │   │   ├── room/
│   │   │   ├── comments/
│   │   │   └── payments/
│   │   ├── layout.tsx
│   │   └── page.tsx                  # 랜딩 페이지
│   │
│   ├── features/                     # Feature 모듈
│   │   ├── story/
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   ├── lib/
│   │   │   └── types.ts
│   │   ├── room/                     # 작가방 (AI 토론)
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   ├── lib/
│   │   │   │   ├── orchestrator.ts   # 멀티 에이전트 오케스트레이션
│   │   │   │   ├── flock-client.ts   # FLock API 클라이언트
│   │   │   │   └── prompts.ts        # 에이전트 시스템 프롬프트
│   │   │   └── types.ts
│   │   ├── agent/                    # 에이전트 마켓플레이스
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   ├── lib/
│   │   │   └── types.ts
│   │   ├── comment/                  # 댓글 및 아이디어 선별
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   ├── lib/
│   │   │   └── types.ts
│   │   ├── payment/                  # x402 USDC 결제
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   ├── lib/
│   │   │   │   ├── x402.ts          # x402 프로토콜 클라이언트
│   │   │   │   └── usdc.ts          # USDC 컨트랙트 인터랙션
│   │   │   └── types.ts
│   │   └── onchain/                  # 온체인 기여/평판
│   │       ├── components/
│   │       ├── hooks/
│   │       ├── lib/
│   │       │   ├── contracts.ts      # 스마트 컨트랙트 ABI/주소
│   │       │   └── contribution.ts   # 기여 기록 함수
│   │       └── types.ts
│   │
│   ├── components/                   # 공유 UI 컴포넌트
│   │   ├── ui/                       # shadcn/ui 컴포넌트
│   │   ├── layout/
│   │   │   ├── gnb.tsx
│   │   │   ├── mobile-tab-bar.tsx
│   │   │   └── footer.tsx
│   │   └── common/
│   │       ├── agent-avatar.tsx
│   │       ├── story-card.tsx
│   │       └── wallet-button.tsx
│   │
│   ├── lib/                          # 공유 유틸리티
│   │   ├── supabase/
│   │   │   ├── client.ts             # 브라우저 클라이언트
│   │   │   ├── server.ts             # 서버 클라이언트
│   │   │   └── middleware.ts         # Auth 미들웨어
│   │   ├── wagmi/
│   │   │   └── config.ts             # wagmi + Smart Wallet 설정
│   │   ├── flock/
│   │   │   └── client.ts             # FLock API 베이스 클라이언트
│   │   ├── validators/               # Zod 스키마
│   │   └── utils.ts
│   │
│   └── types/                        # 글로벌 타입
│       └── index.ts
│
├── supabase/
│   ├── migrations/                   # DB 마이그레이션
│   └── seed.sql                      # 시드 데이터
│
├── contracts/                        # 스마트 컨트랙트 (Solidity)
│   ├── src/
│   │   ├── WritersRoomContribution.sol
│   │   └── AgentReputation.sol
│   └── foundry.toml
│
├── public/
├── .env.local                        # 환경변수
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

### Import 규칙

- **Path Alias**: `@/` = `src/`
- Feature 간 직접 import 금지. 공유가 필요하면 `components/` 또는 `lib/`로 추출
- `features/X/components/` 내부 컴포넌트는 해당 feature 라우트에서만 사용
- 서버/클라이언트 경계 명확히 분리: `'use client'`는 필요한 컴포넌트에만 적용

## 2. Patterns

### 상태 관리

| 범위 | 전략 | 도구 |
|:---|:---|:---|
| 서버 데이터 | React Server Components + fetch | Next.js RSC |
| 클라이언트 캐시 | SWR 또는 React Query | API 응답 캐싱, 실시간 갱신 |
| UI 상태 | React useState/useReducer | 컴포넌트 로컬 상태 |
| 전역 상태 | Zustand (필요 시에만) | 월렛 연결 상태, 알림 등 최소한의 전역 상태 |

### 에러 처리

- API Routes: try-catch + NextResponse.json({ error }, { status })
- 클라이언트: ErrorBoundary + toast 알림 (sonner)
- FLock API 호출 실패: 재시도 1회 -> 폴백 모델 -> 에러 표시
- 온체인 트랜잭션 실패: 상세 에러 메시지 + 재시도 버튼

### 데이터 흐름 패턴 (작가방 토론)

```
1. 유저가 "토론 시작" 클릭
2. API Route (/api/room/discuss) 호출
3. 서버에서 멀티 에이전트 오케스트레이션 실행:
   a. 이전 챕터 + 채택 댓글 컨텍스트 구성
   b. PD 에이전트 -> FLock API 호출 (방향 제시)
   c. 작가 에이전트 -> FLock API 호출 (PD 의견 참조)
   d. 편집자 에이전트 -> FLock API 호출 (검토 의견)
   e. 2-3 라운드 반복
   f. 요약 생성
4. 결과를 Supabase에 저장 (토론 로그, 요약)
5. 클라이언트에 요약 반환 (전체 로그는 별도 요청)
6. 유저 확인 후 "챕터 생성" -> FLock API로 최종 텍스트 생성
```

## 3. Standards

### TypeScript

- `strict: true` 필수
- `any` 사용 금지 (외부 라이브러리 타입이 없는 경우만 `unknown` 사용)
- 모든 API 요청/응답에 Zod 스키마 정의 후 `z.infer<>` 타입 사용

### Zod 적용 범위

| 적용 대상 | 필수 여부 |
|:---|:---:|
| API Route 요청 body | 필수 |
| API Route 응답 | 권장 |
| 환경변수 (.env) 파싱 | 필수 |
| FLock API 응답 | 필수 |
| 온체인 데이터 파싱 | 필수 |
| 폼 입력 데이터 | 필수 |

### Styling

- Tailwind CSS utility-first. 커스텀 CSS 최소화
- shadcn/ui 컴포넌트 우선 사용
- 디자인 토큰: `tailwind.config.ts`에 정의 (UI_DESIGN.md의 색상/간격 시스템)
- 임의 값(`[#xxx]`) 사용 금지. 반드시 디자인 토큰 사용

### 커밋 컨벤션

```
<type>(<scope>): <description>

Types: feat, fix, refactor, style, docs, test, chore
Scopes: story, room, agent, comment, payment, onchain, ui, config
```

### 환경변수

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# FLock API
FLOCK_API_KEY=              # 서버 전용, 절대 클라이언트 노출 금지
FLOCK_API_BASE_URL=https://api.flock.io/v1
FLOCK_DEFAULT_MODEL=        # platform.flock.io/models에서 선택

# Selanet (웹 데이터 수집)
SELANET_API_KEY=             # 서버 전용
SELANET_API_BASE_URL=        # Selanet API 엔드포인트

# Nansen (온체인 분석, x402 pay-per-call)
NANSEN_API_BASE_URL=https://api.nansen.ai
NANSEN_X402_WALLET_KEY=      # Nansen x402 호출용 지갑 키 (서버 전용)

# Base / Blockchain
NEXT_PUBLIC_BASE_CHAIN_ID=8453
NEXT_PUBLIC_USDC_CONTRACT=   # Base USDC 컨트랙트 주소
NEXT_PUBLIC_CONTRIBUTION_CONTRACT=  # 기여 기록 컨트랙트 주소
NEXT_PUBLIC_REPUTATION_CONTRACT=    # 평판 컨트랙트 주소

# Coinbase
NEXT_PUBLIC_COINBASE_PROJECT_ID=    # Smart Wallet 프로젝트 ID
```

## 4. Tooling

| 도구 | 용도 | 설정 |
|:---|:---|:---|
| **ESLint** | 코드 린팅 | next/core-web-vitals + typescript-eslint |
| **Prettier** | 코드 포매팅 | printWidth: 100, singleQuote: true, semi: false |
| **TypeScript** | 타입 체크 | strict: true |
| **Vitest** | 유닛 테스트 | 비즈니스 로직, 오케스트레이터, Zod 스키마 |
| **Playwright** | E2E 테스트 | 핵심 플로우 (스토리 생성, 토론, 결제) |
| **Husky** | Git hooks | pre-commit: lint-staged |
| **lint-staged** | 스테이징 파일 검사 | ESLint + Prettier 자동 실행 |
| **Foundry** | 스마트 컨트랙트 | 컴파일, 테스트, 배포 |

### .gitignore 필수 항목

```
node_modules/
.next/
.env.local
.env*.local
supabase/.temp/
contracts/out/
contracts/cache/
```

## 5. 핵심 라이브러리

| 카테고리 | 라이브러리 | 버전 기준 | 용도 |
|:---|:---|:---|:---|
| Framework | next | 15.x | App Router, RSC |
| UI | tailwindcss | 4.x | 스타일링 |
| UI Components | shadcn/ui | latest | 컴포넌트 라이브러리 |
| DB | @supabase/supabase-js | 2.x | Supabase 클라이언트 |
| Validation | zod | 3.x | 스키마 검증 |
| AI | openai | 4.x | FLock API 호출 (호환) |
| Blockchain | wagmi | 2.x | 월렛 연결, 컨트랙트 인터랙션 |
| Blockchain | viem | 2.x | 이더리움 유틸리티 |
| Wallet | @coinbase/onchainkit | latest | Smart Wallet, 온체인 컴포넌트 |
| State | zustand | 5.x | 전역 상태 (최소 사용) |
| Data Fetching | swr | 2.x | 클라이언트 데이터 캐싱 |
| Toast | sonner | latest | 알림 토스트 |
| Date | date-fns | 4.x | 날짜 포매팅 |
| Web Data | selanet-sdk (또는 REST) | latest | Selanet DePIN 웹 데이터 수집 |
| Analytics | nansen-api (REST + x402) | latest | 온체인 지갑 분석, Smart Money |

## 6. Related Documents
- **Concept_Design**: [Product Specs](../01_Concept_Design/03_PRODUCT_SPECS.md) - 기술 스택 초안 및 기능 명세
- **Technical_Specs**: [DB Schema](./01_DB_SCHEMA.md) - 데이터 모델 설계
- **Technical_Specs**: [API Specs](./02_API_SPECS.md) - API 엔드포인트 명세
- **Logic_Progress**: [Roadmap](../04_Logic_Progress/00_ROADMAP.md) - 개발 로드맵
