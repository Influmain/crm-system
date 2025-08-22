# CRM 시스템 빠른 참조 가이드 (v8)

## 현재 완성된 주요 기능
- **관리자 대시보드**: 실시간 KPI + 영업사원 성과 랭킹
- **관리자 리드관리**: 대용량 데이터 CRUD + 서버사이드 페이징 (50개씩)
- **고객 데이터 업로드**: Excel/CSV + 중복 검사 + 영업사원 배정
- **상담원 대시보드**: 담당 고객 관리 + 상담 기록
- **인증 시스템**: 재시도 로직 + 스마트 리다이렉트

## 현재 데이터 상황
- 총 고객: 91명
- 총 계약: 1건 (1000만원)
- 테스트 계정: admin@company.com, counselor1@company.com (비밀번호: admin123, counselor123)

## 핵심 개발 패턴 (필수)

### AuthContext 사용법
```typescript
const { user, userProfile, loading } = useAuth();
// 재시도 로직 내장됨, 홈/로그인 페이지에서만 자동 리다이렉트
```

### 데이터 로드 (v6 패턴)
```typescript
// assignment별 최신 기록만 사용 (중복 제거)
const latestActivity = activities
  .sort((a, b) => new Date(b.contact_date) - new Date(a.contact_date))[0];
```

### 대용량 데이터 처리 (v8)
```typescript
// 서버사이드 페이징 필수
const { data, count } = await supabase
  .from('table')
  .select('*', { count: 'exact' })
  .range(startIndex, endIndex);
```

### Hydration 방지 (v7)
```typescript
const [mounted, setMounted] = useState(false);
useEffect(() => setMounted(true), []);
if (!mounted) return null;
```

## 절대 금지 사항
- 브라우저 alert/confirm 사용
- 하드코딩 색상 (text-red-500 등)
- 전체 데이터 한번에 로드
- process.env 직접 조건부 렌더링
- "상담원", "리드" 용어 (→ "영업사원", "고객" 사용)

## 필수 체크리스트 (새 기능 개발 시)
1. 파일 경로 확인
2. 대용량 데이터 처리 필요성 (페이징)
3. v6 중복 제거 패턴 적용
4. 토스트 시스템 연동
5. v8 AuthContext 호환성
6. Hydration 방지 필요성

## 알려진 제한사항
- counseling_activities RLS 정책 문제 (임시로 비활성화)
- 10,000개 이상 데이터 시 추가 최적화 필요

## 빠른 import 템플릿
```typescript
'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { useToastHelpers } from '@/components/ui/Toast';
import { supabase } from '@/lib/supabase';

// Hydration 방지
const [mounted, setMounted] = useState(false);
useEffect(() => setMounted(true), []);
if (!mounted) return null;
```

## 주요 URL
- 관리자 대시보드: /admin/dashboard
- 관리자 리드관리: /admin/leads (v8 신규)
- 고객 업로드: /admin/upload
- 상담원 대시보드: /counselor/dashboard