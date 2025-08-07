📁 프로젝트 디렉토리 구조
crm-system/
├── src/
│   ├── app/
│   │   ├── globals.css                 # Tailwind v4 + CSS 변수 설정
│   │   ├── layout.tsx                  # Next.js 루트 레이아웃
│   │   ├── page.tsx                    # 홈페이지 (심플 버전)
│   │   ├── login/page.tsx              # 로그인 페이지
│   │   ├── register/page.tsx           # 회원가입 페이지
│   │   ├── admin/
│   │   │   ├── page.tsx                # 리다이렉트 → /admin/dashboard
│   │   │   ├── dashboard/page.tsx      # 관리자 대시보드
│   │   │   ├── upload/page.tsx         # 데이터 업로드
│   │   │   ├── leads/page.tsx          # 리드 관리
│   │   │   ├── counselors/page.tsx     # 상담사 관리
│   │   │   ├── assignments/page.tsx    # 배정 관리
│   │   │   ├── analytics/page.tsx      # 전체 분석
│   │   │   ├── reports/page.tsx        # 보고서
│   │   │   └── settings/page.tsx       # 시스템 설정
│   │   └── counselor/
│   │       ├── page.tsx                # 리다이렉트 → /counselor/dashboard
│   │       ├── dashboard/page.tsx      # 상담사 대시보드
│   │       ├── leads/page.tsx          # 내 리드
│   │       ├── schedule/page.tsx       # 일정 관리
│   │       ├── records/page.tsx        # 상담 기록
│   │       └── analytics/page.tsx      # 성과 분석
│   ├── components/
│   │   ├── layout/
│   │   │   ├── CounselorLayout.tsx     # 상담사 레이아웃
│   │   │   └── AdminLayout.tsx         # 관리자 레이아웃
│   │   ├── shared/
│   │   │   ├── CounselorSidebar.tsx    # 상담사 사이드바
│   │   │   └── AdminSidebar.tsx        # 관리자 사이드바
│   │   └── ui.tsx
│   ├── hooks/
│   │   └── useTheme.ts                 # 테마 훅 (다크/라이트 모드)
│   ├── lib/
│   │   ├── design-system/
│   │   │   └── index.ts                # 디자인 시스템 (컴포넌트 클래스)
│   │   ├── supabase.ts
│   │   └── utils.ts
│   └── contexts/
├── tailwind.config.js
├── package.json
└── PROJECT_CONTEXT.md
⚙️ 주요 전역 설정
1. 디자인 시스템

globals.css: Tailwind v4 + CSS 변수 (라이트/다크 모드)
design-system.ts: 컴포넌트 클래스 매핑 + 유틸리티 함수
useTheme.ts: 테마 전환 훅

2. 레이아웃 시스템

AdminLayout: 관리자 전용 레이아웃 (AdminSidebar 포함)
CounselorLayout: 상담사 전용 레이아웃 (CounselorSidebar 포함)
홈페이지: 헤더/사이드바 없는 심플 구조

3. 라우팅 구조

홈페이지: / - 심플한 랜딩 페이지
관리자: /admin/* - 8개 페이지 (리다이렉트 포함)
상담사: /counselor/* - 6개 페이지 (리다이렉트 포함)
인증: /login, /register

4. 기술 스택

Next.js 14 (App Router)
Tailwind CSS v4
TypeScript
React Hooks (useState, useEffect, usePathname)

🎯 다음 채팅에서 이어가실 내용
"지난번에 Lead Management System CRM 프로젝트 구조 다 설정했는데, 이어서 작업하고 싶어. 현재 AdminLayout/CounselorLayout 기반으로 사이드바 네비게이션까지 완성된 상태야. Tailwind v4 + 디자인 시스템 + 테마 훅도 다 설정되어 있고. 다음에 뭐 작업할까?"
이렇게 말씀해주시면 바로 이어서 도와드릴 수 있어요! 🚀