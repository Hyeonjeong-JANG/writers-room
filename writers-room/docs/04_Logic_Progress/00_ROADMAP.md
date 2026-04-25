# Roadmap: Writer's Room
> Created: 2026-04-25 11:15
> Last Updated: 2026-04-25 11:15

## Phase 개요

| Phase | 이름 | 목표 | 예상 기간 |
|:---:|:---|:---|:---|
| 0 | 프로젝트 초기화 | 개발 환경, 기본 구조 세팅 | 1일 |
| 1 | 인증 및 레이아웃 | Smart Wallet 연결, GNB, 라우팅 | 2일 |
| 2 | 스토리 CRUD | 스토리 생성/조회/수정, 챕터 발행 | 3일 |
| 3 | AI 작가방 핵심 | 멀티 에이전트 토론, FLock API 연동, 챕터 생성 | 4일 |
| 4 | 댓글 및 아이디어 선별 | 댓글 시스템, AI 선별, 채택 표시 | 2일 |
| 5 | 에이전트 마켓플레이스 | 에이전트 CRUD, 마켓 탐색, 고용 | 3일 |
| 6 | x402 결제 | USDC 결제 연동, 트랜잭션 기록 | 3일 |
| 7 | 온체인 기여/평판 | 기여 기록, 평판 시스템, 스마트 컨트랙트 | 3일 |
| 8 | 대시보드 | 내 스토리/에이전트/수익 관리 | 2일 |
| 9 | 통합 테스트 및 폴리싱 | E2E 테스트, UI 폴리싱, 반응형 | 3일 |

총 예상: 약 26일 (4주)

---

## Phase 0 -- 프로젝트 초기화

**목표**: 개발 환경과 기본 프로젝트 구조 완성

- [ ] Next.js 15 프로젝트 생성 (App Router, TypeScript, Tailwind CSS)
- [ ] shadcn/ui 설치 및 기본 컴포넌트 추가
- [ ] Supabase 프로젝트 생성 및 연결
- [ ] 환경변수 설정 (.env.local)
- [ ] ESLint + Prettier + lint-staged + Husky 설정
- [ ] path alias (`@/`) 설정
- [ ] Feature 기반 폴더 구조 생성
- [ ] Zod 환경변수 검증 설정
- [ ] FLock API 연결 테스트 (단순 chat completion)
- [ ] Git 초기 커밋

**기술 명세 참조**: [Development Principles](../03_Technical_Specs/00_DEVELOPMENT_PRINCIPLES.md)

---

## Phase 1 -- 인증 및 레이아웃

**목표**: Smart Wallet 로그인, 전체 레이아웃, 라우팅 완성

- [ ] wagmi + viem + OnchainKit 설치 및 설정
- [ ] Coinbase Smart Wallet 연결 기능 구현
- [ ] Supabase Auth와 월렛 주소 연동 (커스텀 인증)
- [ ] users 테이블 마이그레이션 및 RLS 정책
- [ ] GNB 컴포넌트 (로고, 메뉴, 알림, 지갑 버튼)
- [ ] 모바일 하단 탭 바
- [ ] 인증 미들웨어 (보호 라우트)
- [ ] 랜딩 페이지 (Hero, CTA, 작동 방식 설명)
- [ ] 반응형 레이아웃 (desktop/tablet/mobile)

**UI 참조**: [UI Design](../02_UI_Screens/01_UI_DESIGN.md) - GNB, 레이아웃 섹션

---

## Phase 2 -- 스토리 CRUD

**목표**: 스토리 생성, 목록 조회, 상세 보기, 챕터 읽기/발행

- [ ] stories 테이블 마이그레이션 및 RLS
- [ ] chapters 테이블 마이그레이션 및 RLS
- [ ] Zod 스키마: 스토리 생성/수정 요청
- [ ] API: GET /api/stories (목록, 필터, 페이지네이션)
- [ ] API: POST /api/stories (생성)
- [ ] API: GET /api/stories/[id] (상세)
- [ ] API: PATCH /api/stories/[id] (수정)
- [ ] API: GET /api/stories/[id]/chapters (챕터 목록)
- [ ] API: GET /api/stories/[id]/chapters/[n] (챕터 상세)
- [ ] API: POST /api/stories/[id]/chapters (챕터 발행)
- [ ] 스토리 탐색 페이지 (카드 그리드, 필터)
- [ ] 스토리 생성 페이지 (폼: 제목, 장르, 시놉시스, 캐릭터)
- [ ] 스토리 상세 페이지 (시놉시스, 챕터 목록, 에이전트)
- [ ] 챕터 리더 페이지 (Noto Serif KR, 이전/다음 네비게이션)

**DB 참조**: [DB Schema](../03_Technical_Specs/01_DB_SCHEMA.md) - stories, chapters
**API 참조**: [API Specs](../03_Technical_Specs/02_API_SPECS.md) - Stories API

---

## Phase 3 -- AI 작가방 핵심

**목표**: 에이전트 토론, FLock API 호출, Selanet 트렌드 주입, 챕터 초안 생성 파이프라인 완성

- [ ] agents 테이블 마이그레이션 (기본 에이전트 시드 포함)
- [ ] story_agents 테이블 마이그레이션
- [ ] discussions 테이블 마이그레이션
- [ ] selanet_trend_cache 테이블 마이그레이션
- [ ] FLock API 클라이언트 구현 (OpenAI SDK, base_url 변경)
- [ ] Selanet API 클라이언트 구현 (장르별 트렌드 수집)
- [ ] 에이전트 시스템 프롬프트 템플릿 (PD, 작가, 편집자)
- [ ] 멀티 에이전트 오케스트레이터 구현
  - [ ] 컨텍스트 구성 (이전 챕터 + 세계관 + 캐릭터 + Selanet 트렌드)
  - [ ] 순차 호출: PD -> 작가 -> 편집자 (라운드 반복)
  - [ ] 토론 요약 생성
- [ ] API: GET /api/selanet/trends (장르별 트렌드)
- [ ] API: POST /api/room/discuss (토론 시작, 트렌드 자동 주입)
- [ ] API: GET /api/room/discuss/[id] (토론 상세/로그)
- [ ] API: POST /api/room/generate (챕터 초안 생성)
- [ ] 작가방 UI (채팅 스타일)
  - [ ] 좌측 사이드바: 에이전트 목록 + 트렌드 패널
  - [ ] 채팅 영역: 토론 로그 (역할별 색상 구분)
  - [ ] 토론 진행 중 로딩 상태 (프로그레스 바)
  - [ ] 토론 요약 표시
  - [ ] 챕터 초안 미리보기 + 편집
- [ ] 기본 에이전트 3명 자동 배치 (스토리 생성 시)
- [ ] 컨텍스트 윈도우 관리 (긴 스토리 요약 + 최근 챕터)

**API 참조**: [API Specs](../03_Technical_Specs/02_API_SPECS.md) - Room API, FLock 호출 패턴

---

## Phase 4 -- 댓글 및 아이디어 선별

**목표**: 댓글 시스템, AI 아이디어 선별, 채택 표시

- [ ] comments 테이블 마이그레이션 및 RLS
- [ ] Zod 스키마: 댓글 작성 요청
- [ ] API: GET /api/comments (챕터별 댓글 목록)
- [ ] API: POST /api/comments (댓글 작성)
- [ ] API: POST /api/comments/analyze (AI 댓글 분석)
- [ ] 댓글 섹션 UI (일반 댓글 / 아이디어 제안 탭)
- [ ] 아이디어 태그 선택 (#전개제안, #캐릭터제안, #설정제안)
- [ ] 좋아요 기능
- [ ] AI 선별 로직 (FLock API로 댓글 분석)
- [ ] "AI 선별됨" 배지 표시
- [ ] "이 아이디어가 챕터 N에 반영되었습니다" 표시
- [ ] 작가방 토론 시작 시 채택 댓글 자동 주입

**DB 참조**: [DB Schema](../03_Technical_Specs/01_DB_SCHEMA.md) - comments

---

## Phase 5 -- 에이전트 마켓플레이스

**목표**: 에이전트 생성/탐색/고용 전체 플로우

- [ ] Zod 스키마: 에이전트 생성/수정 요청
- [ ] API: GET /api/agents (마켓 목록, 필터)
- [ ] API: POST /api/agents (생성)
- [ ] API: GET /api/agents/[id] (상세)
- [ ] API: PATCH /api/agents/[id] (수정)
- [ ] API: POST /api/agents/[id]/hire (고용)
- [ ] agent_reviews 테이블 마이그레이션
- [ ] API: POST /api/agents/[id]/review (리뷰 작성)
- [ ] 마켓플레이스 페이지 (필터, 카드 그리드)
- [ ] 에이전트 상세 페이지 (프로필, 평점, 리뷰, 이력)
- [ ] 에이전트 생성 페이지 (역할, 장르, 프롬프트, 가격)
- [ ] 에이전트 프로필 카드 컴포넌트
- [ ] FLock 모델 목록 API 연동 (사용 가능 모델 선택)
- [ ] 평균 평점 자동 갱신 (리뷰 작성 시 트리거)

---

## Phase 6 -- x402 결제

**목표**: 에이전트 고용 시 x402 USDC 마이크로 페이먼트

- [ ] transactions 테이블 마이그레이션
- [ ] x402 프로토콜 클라이언트 구현
- [ ] USDC 컨트랙트 인터랙션 (Base)
- [ ] API: POST /api/payments/x402/initiate (결제 시작)
- [ ] API: POST /api/payments/x402/confirm (결제 확인)
- [ ] API: GET /api/payments/history (내역 조회)
- [ ] 결제 확인 모달 UI (금액, 수수료, 지갑 잔액)
- [ ] Smart Wallet 서명 플로우
- [ ] 플랫폼 수수료 (10%) 자동 차감
- [ ] 온체인 트랜잭션 확인 (tx_hash 검증)
- [ ] 결제 성공/실패 토스트 알림
- [ ] 수익 대시보드에 결제 내역 연동

**의존성**: Phase 1 (Smart Wallet), Phase 5 (에이전트 고용)

---

## Phase 7 -- 온체인 기여/평판 + Nansen Trust Score

**목표**: 기여도 온체인 기록, 에이전트 평판 시스템, Nansen 기반 신뢰 점수

- [ ] contributions 테이블 마이그레이션
- [ ] nansen_wallet_cache 테이블 마이그레이션
- [ ] agent_trust_scores 테이블 마이그레이션
- [ ] WritersRoomContribution.sol 스마트 컨트랙트 작성
- [ ] AgentReputation.sol 스마트 컨트랙트 작성
- [ ] Foundry 테스트 작성
- [ ] Base Sepolia 테스트넷 배포
- [ ] Nansen API 클라이언트 구현 (x402 pay-per-call, 캐시 레이어)
- [ ] API: GET /api/nansen/wallet/[address] (지갑 분석)
- [ ] API: GET /api/nansen/agent-trust/[agentId] (Trust Score)
- [ ] API: POST /api/nansen/recalculate/[agentId] (점수 재산출)
- [ ] Trust Score 산출 로직 (재고용률, Smart Money 비율, 활용률, 도달 범위)
- [ ] Trust Badge UI (Bronze/Silver/Gold) — 에이전트 카드 + 상세 페이지
- [ ] 유저 프로필 Smart Money 뱃지 표시
- [ ] API: POST /api/onchain/contribution (기여 기록)
- [ ] API: GET /api/onchain/contributions/[userId] (히스토리)
- [ ] API: GET /api/onchain/reputation/[agentId] (평판 조회)
- [ ] 댓글 채택 시 자동 기여 기록 트리거
- [ ] 프로필 페이지: 기여 히스토리 + 지갑 뱃지 표시
- [ ] Base Explorer 링크 연동

**의존성**: Phase 4 (댓글 채택), Phase 6 (x402 결제 기록)

---

## Phase 8 -- 대시보드

**목표**: 창작자/빌더를 위한 관리 페이지

- [ ] API: GET /api/dashboard/stats (통합 통계)
- [ ] 대시보드 메인 (통계 카드: 스토리, 에이전트, 수익, 기여)
- [ ] 내 스토리 관리 (상태 변경, 작가방 바로가기)
- [ ] 내 에이전트 관리 (수정, 비활성화, 수익 확인)
- [ ] 수익 현황 페이지 (차트, 거래 내역, Explorer 링크)
- [ ] 기여 히스토리 페이지
- [ ] 프로필 페이지 (/profile/[address])

---

## Phase 9 -- 통합 테스트 및 폴리싱

**목표**: 전체 플로우 검증, UI 완성도, 배포 준비

- [ ] E2E 테스트: 스토리 생성 -> 토론 -> 챕터 발행 플로우
- [ ] E2E 테스트: 댓글 -> 채택 -> 기여 기록 플로우
- [ ] E2E 테스트: 에이전트 고용 -> 결제 -> 배치 플로우
- [ ] 모바일 반응형 전체 검수
- [ ] 로딩 상태 / 스켈레톤 UI 추가
- [ ] 에러 바운더리 + 에러 페이지
- [ ] SEO 메타태그 (Open Graph, Twitter Card)
- [ ] Vercel 배포 설정
- [ ] Base Mainnet 컨트랙트 배포
- [ ] 최종 환경변수 설정 (프로덕션)

---

## Related Documents
- **Concept_Design**: [Product Specs](../01_Concept_Design/03_PRODUCT_SPECS.md) - MVP 기능 명세
- **Technical_Specs**: [Development Principles](../03_Technical_Specs/00_DEVELOPMENT_PRINCIPLES.md) - 기술 스택
- **Technical_Specs**: [DB Schema](../03_Technical_Specs/01_DB_SCHEMA.md) - 마이그레이션 순서
- **Technical_Specs**: [API Specs](../03_Technical_Specs/02_API_SPECS.md) - API 구현 순서
- **Logic_Progress**: [Backlog](./00_BACKLOG.md) - 작업 상태 추적
- **Logic_Progress**: [Execution Plan](./01_EXECUTION_PLAN.md) - 상세 실행 계획
