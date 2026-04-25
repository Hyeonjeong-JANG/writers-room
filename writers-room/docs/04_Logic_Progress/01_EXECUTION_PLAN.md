# Execution Plan: Writer's Room
> Created: 2026-04-25 11:15
> Last Updated: 2026-04-25 11:15

## 1. 실행 전략

### 원칙
- Phase 순서대로 실행 (0 -> 1 -> 2 -> ... -> 9)
- 각 Phase 완료 후 다음 Phase로 이동 (이전 Phase 미완료 시 다음 진행 금지)
- 모든 API는 Zod 검증 -> 구현 -> 수동 테스트 순서
- DB 마이그레이션은 Phase 시작 시 가장 먼저 실행
- 커밋은 원자적 단위 (기능 하나 = 커밋 하나)

### 의존성 그래프

```
Phase 0 (초기화)
  └── Phase 1 (인증/레이아웃)
        └── Phase 2 (스토리 CRUD)
              ├── Phase 3 (AI 작가방) ──── Phase 4 (댓글/선별)
              │                                    │
              └── Phase 5 (에이전트 마켓) ──────────┘
                    │                              │
                    Phase 6 (x402 결제) ────────────┘
                          │
                    Phase 7 (온체인 기여/평판)
                          │
                    Phase 8 (대시보드)
                          │
                    Phase 9 (테스트/배포)
```

## 2. Phase별 실행 상세

### Phase 0 -- 프로젝트 초기화 (1일)

```
[세션 1] 프로젝트 생성 및 설정 (~2시간)

- [ ] npx create-next-app@latest writers-room --typescript --tailwind --eslint --app --src-dir
- [ ] shadcn/ui 초기화: npx shadcn@latest init
- [ ] shadcn 컴포넌트 추가: button, card, input, textarea, dialog, tabs, badge, avatar, toast (sonner), dropdown-menu, skeleton
- [ ] tailwind.config.ts에 디자인 토큰 추가
      - 색상: primary(#4F46E5), secondary(#F59E0B), success(#10B981), error(#F43F5E)
      - 에이전트 역할 색상: pd(#3B82F6), writer(#8B5CF6), editor(#14B8A6)
- [ ] Prettier 설정: printWidth 100, singleQuote true, semi false
- [ ] Husky + lint-staged 설정
- [ ] tsconfig.json path alias: "@/*" -> "./src/*"

[세션 2] 외부 서비스 연결 (~1시간)

- [ ] Supabase 프로젝트 생성 (supabase.com 또는 CLI)
- [ ] @supabase/supabase-js, @supabase/ssr 설치
- [ ] lib/supabase/client.ts, server.ts 작성
- [ ] .env.local 설정 (Supabase URL, Anon Key, Service Role Key)
- [ ] Zod 환경변수 검증 (lib/validators/env.ts)
- [ ] FLock API 테스트: openai 패키지 설치, 단순 chat completion 호출 확인
- [ ] Git 초기 커밋
```

### Phase 1 -- 인증 및 레이아웃 (2일)

```
[세션 1] 월렛 + 인증 (~3시간)

- [ ] wagmi, viem, @coinbase/onchainkit 설치
- [ ] lib/wagmi/config.ts: Base 체인 설정, Smart Wallet 커넥터
- [ ] Providers 래퍼: WagmiProvider + QueryClientProvider + OnchainKitProvider
- [ ] app/layout.tsx에 Providers 적용
- [ ] 월렛 연결 버튼 컴포넌트 (components/common/wallet-button.tsx)
- [ ] Supabase Auth 커스텀 연동: 월렛 주소로 유저 생성/조회
- [ ] users 테이블 마이그레이션 (supabase/migrations/)
- [ ] RLS 정책 설정 (본인만 수정, 공개 프로필 조회 가능)
- [ ] 인증 미들웨어 (middleware.ts): 보호 라우트 리다이렉트

[세션 2] 레이아웃 + 랜딩 (~3시간)

- [ ] GNB 컴포넌트 (components/layout/gnb.tsx)
      - 로고, 메뉴 (스토리/에이전트/대시보드), 알림 벨, 지갑 버튼
      - sticky, 높이 64px, 하단 border
- [ ] 모바일 하단 탭 바 (components/layout/mobile-tab-bar.tsx)
      - 5개 아이콘 탭, lg 이상에서 숨김
- [ ] (main) 라우트 그룹 레이아웃 (GNB 포함)
- [ ] 랜딩 페이지 (app/page.tsx)
      - Hero 섹션: 태그라인 + CTA
      - 작동 방식 3단계
      - 샘플 스토리 미리보기 (목업 데이터)
- [ ] 반응형 테스트 (mobile/tablet/desktop)
```

### Phase 2 -- 스토리 CRUD (3일)

```
[세션 1] DB + API (~3시간)

- [ ] stories 테이블 마이그레이션 + RLS
- [ ] chapters 테이블 마이그레이션 + RLS
- [ ] Zod 스키마: CreateStorySchema, UpdateStorySchema, CreateChapterSchema
- [ ] API Route: /api/stories (GET: 목록, POST: 생성)
- [ ] API Route: /api/stories/[id] (GET: 상세, PATCH: 수정)
- [ ] API Route: /api/stories/[id]/chapters (GET: 목록, POST: 발행)
- [ ] API Route: /api/stories/[id]/chapters/[number] (GET: 상세)

[세션 2] 스토리 UI (~4시간)

- [ ] 스토리 카드 컴포넌트 (components/common/story-card.tsx)
- [ ] 스토리 탐색 페이지 (/stories)
      - 카드 그리드 (3열 desktop, 1열 mobile)
      - 장르 필터, 상태 필터, 정렬
      - 페이지네이션 또는 무한 스크롤
- [ ] 스토리 생성 페이지 (/stories/create)
      - 장르 선택 카드
      - 제목, 시놉시스 입력
      - 캐릭터 설정 (동적 추가/삭제)
      - Zod 클라이언트 검증

[세션 3] 상세 + 리더 (~3시간)

- [ ] 스토리 상세 페이지 (/stories/[id])
      - 시놉시스, 캐릭터, 장르 태그
      - 챕터 목록 (번호, 제목, 날짜)
      - 작가방 에이전트 목록
- [ ] 챕터 리더 페이지 (/stories/[id]/chapter/[n])
      - Noto Serif KR 18px 본문
      - 최대 너비 680px 중앙 정렬
      - 이전/다음 네비게이션 (sticky 하단)
```

### Phase 3 -- AI 작가방 핵심 (4일)

```
[세션 1] DB + FLock 클라이언트 (~3시간)

- [ ] agents 테이블 마이그레이션 + 기본 에이전트 3명 시드
- [ ] story_agents 테이블 마이그레이션
- [ ] discussions 테이블 마이그레이션
- [ ] lib/flock/client.ts: OpenAI SDK로 FLock API 래핑
      - baseURL: process.env.FLOCK_API_BASE_URL
      - defaultHeaders: x-litellm-api-key
- [ ] features/room/lib/prompts.ts: PD/작가/편집자 시스템 프롬프트

[세션 2] 오케스트레이터 (~4시간)

- [ ] features/room/lib/orchestrator.ts: 멀티 에이전트 토론 엔진
      - buildContext(): 이전 챕터 + 세계관 + 캐릭터 + 채택 댓글 결합
      - runDiscussion(): PD -> 작가 -> 편집자 순차 호출 x 2-3 라운드
      - generateSummary(): 토론 내용 요약
      - generateChapter(): 요약 기반 챕터 텍스트 생성
- [ ] 각 에이전트 호출 시 이전 에이전트 응답을 컨텍스트에 추가
- [ ] 에러 핸들링: FLock API 실패 시 재시도 1회 -> 폴백 모델
- [ ] 컨텍스트 윈도우 관리: 긴 스토리는 요약본 사용

[세션 3] Room API (~2시간)

- [ ] API: POST /api/room/discuss
      - 스토리 creator 인증 확인
      - 오케스트레이터 호출
      - discussions 테이블에 로그 저장
      - 요약 반환
- [ ] API: GET /api/room/discuss/[id] (전체 로그)
- [ ] API: POST /api/room/generate (챕터 초안)

[세션 4] 작가방 UI (~4시간)

- [ ] 작가방 페이지 (/stories/[id]/room)
- [ ] 좌측 사이드바: 배치된 에이전트 목록 + 채택 댓글
- [ ] 채팅 영역: 토론 로그 (역할별 색상 버블)
- [ ] "토론 시작" 버튼 + 로딩 상태 (프로그레스 바, 에이전트 아바타 애니메이션)
- [ ] 토론 요약 하이라이트 박스
- [ ] "챕터 초안 생성" 버튼
- [ ] 챕터 미리보기 + 인라인 편집
- [ ] "발행" 버튼 -> /api/stories/[id]/chapters POST
- [ ] 모바일: 전체화면 채팅, 사이드바 드로어
```

### Phase 4-9

(Phase 3까지의 패턴과 동일하게 세션별 원자적 태스크로 분할. 로드맵의 체크리스트 참조.)

## 3. 실행 규칙

| 규칙 | 설명 |
|:---|:---|
| **한 번에 한 Phase** | 현재 Phase 완료 전 다음 Phase 시작 금지 |
| **DB 먼저** | 각 Phase 시작 시 마이그레이션 먼저 실행 |
| **API 먼저, UI 나중** | API가 작동해야 UI를 구현 |
| **Zod 먼저** | API 구현 전 요청/응답 스키마 먼저 정의 |
| **원자적 커밋** | 기능 하나 완성 = 커밋 하나 |
| **수동 테스트** | API 완성 후 curl/Postman으로 검증 |
| **백로그 동기화** | 태스크 완료 시 BACKLOG.md의 체크박스 체크 + In Progress/Done 이동 |

## 4. Related Documents
- **Logic_Progress**: [Roadmap](./00_ROADMAP.md) - Phase별 목표 및 체크리스트
- **Logic_Progress**: [Backlog](./00_BACKLOG.md) - 작업 상태 추적
- **Technical_Specs**: [Development Principles](../03_Technical_Specs/00_DEVELOPMENT_PRINCIPLES.md) - 프로젝트 구조
- **Technical_Specs**: [DB Schema](../03_Technical_Specs/01_DB_SCHEMA.md) - 마이그레이션 순서
- **Technical_Specs**: [API Specs](../03_Technical_Specs/02_API_SPECS.md) - API 구현 순서
