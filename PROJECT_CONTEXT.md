# 🎯 CRM 프로젝트 컨텍스트 요약

## 📂 프로젝트 구조
```
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
│   │   │   ├── upload/page.tsx         # ✅ 완성: 데이터 업로드 페이지 (노션 스타일)
│   │   │   ├── leads/page.tsx          # 리드 관리
│   │   │   ├── counselors/page.tsx     # ✅ 완성: 상담사 관리 (노션 스타일)
│   │   │   ├── assignments/page.tsx    # ✅ 완성: 배정 관리 (노션 스타일)
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
│   │   ├── ui/
│   │   │   └── SmartTable.tsx          # 🆕 노션 스타일 테이블 컴포넌트
│   │   └── ui.tsx
│   ├── hooks/
│   │   └── useTheme.ts                 # 테마 훅 (다크/라이트 모드)
│   ├── lib/
│   │   ├── design-system/
│   │   │   ├── index.ts                # 기본 디자인 시스템
│   │   │   ├── table.ts                # ✅ 노션 스타일 테이블 시스템
│   │   │   └── icons.ts                # ✅ 비즈니스 아이콘 매핑 시스템
│   │   ├── supabase.ts
│   │   └── utils.ts
│   └── contexts/
```

## 🎨 디자인 시스템 (중요!)

### 🔧 기본 설정
- **Tailwind CSS v4** 사용
- **designSystem** 객체로 모든 컴포넌트 스타일 관리
- **AdminLayout/CounselorLayout** 기반 레이아웃 시스템
- **✅ 노션 스타일 테이블 시스템** 완성
- **✅ 비즈니스 아이콘 매핑 시스템** 완성

### 📋 기본 컴포넌트 사용법
```typescript
import AdminLayout from '@/components/layout/AdminLayout';
import { designSystem } from '@/lib/design-system';
import { tableSystem } from '@/lib/design-system/table';
import { businessIcons, getColumnIcon } from '@/lib/design-system/icons';

// 페이지 구조
<AdminLayout>
  <div className="mb-8">
    <h1 className={designSystem.components.typography.h2}>페이지 제목</h1>
    <p className={designSystem.components.typography.bodySm}>설명</p>
  </div>
  
  <div className={designSystem.utils.cn(designSystem.components.card.base, designSystem.components.card.content)}>
    콘텐츠
  </div>
</AdminLayout>

// 버튼 사용
<button className={designSystem.components.button.primary}>
<button className={designSystem.components.button.secondary}>
```

---

# 🆕 노션 스타일 테이블 시스템 (완성)

## 🎯 **핵심 특징**
- **실용적**: 정보 밀도 최적화, 빠른 스캔 가능
- **노션 인스파이어드**: 행 클릭 선택, 스마트 체크박스
- **다크모드 완벽 대응**: CSS 변수 기반 색상 시스템
- **아이콘 중심**: 직관적인 칼럼 구분

## 📚 **파일 구조**

### **1️⃣ 테이블 시스템 (`/lib/design-system/table.ts`)**
```typescript
export const tableSystem = {
  // 기본 컨테이너
  container: "relative bg-bg-primary border border-border-primary rounded-lg overflow-hidden",
  
  // 헤더 스타일 (고정)
  header: {
    container: "overflow-x-auto border-b border-border-primary",
    row: "bg-bg-secondary",
    cell: "text-left py-2 px-3 text-xs font-medium text-text-tertiary uppercase tracking-wider",
    iconWrapper: "flex items-center space-x-2",
    icon: "w-3 h-3 text-text-tertiary" // 노션 스타일: 작고 무채색
  },
  
  // 스크롤 가능한 바디
  body: {
    scrollContainer: "overflow-auto", 
    row: {
      base: "border-b border-border-primary hover:bg-bg-hover transition-all duration-200 group cursor-pointer hover:shadow-sm relative"
    },
    cell: "py-2 px-3"
  },
  
  // 노션식 선택 시스템
  selection: {
    indicator: "absolute left-0 top-0 h-full w-1 bg-accent transition-opacity duration-200",
    indicatorVisible: "opacity-100",
    indicatorHidden: "opacity-0",
    checkbox: {
      container: "absolute left-1 top-1/2 transform -translate-y-1/2 transition-all duration-200",
      hidden: "opacity-0 scale-75 group-hover:opacity-100 group-hover:scale-100",
      visible: "opacity-100 scale-100",
      box: "w-4 h-4 rounded border-2 flex items-center justify-center",
      unselected: "border-border-primary bg-bg-primary group-hover:border-accent",
      selected: "bg-accent border-accent",
      checkIcon: "w-2.5 h-2.5 text-white"
    },
    content: {
      base: "transition-all duration-200",
      unselected: "ml-1 group-hover:ml-6", 
      selected: "ml-6"
    }
  }
};
```

### **2️⃣ 비즈니스 아이콘 시스템 (`/lib/design-system/icons.ts`)**
```typescript
export const businessIcons = {
  // 연락처 관련
  phone: Phone,
  email: Mail, 
  contact: User,
  
  // 비즈니스 관련
  company: Building2,
  team: Users,
  department: Users,
  
  // 커뮤니케이션
  message: MessageSquare,
  script: FileText,
  interest: Tag,
  
  // 시간 관련
  date: Calendar,
  time: Clock,
  
  // 관리 관련
  dashboard: LayoutDashboard,
  analytics: BarChart3,
  upload: Upload,
  settings: Settings,
  assignment: UserPlus
};

// 🔥 자동 아이콘 매핑 함수
export const getColumnIcon = (columnName: string) => {
  const lowerName = columnName.toLowerCase();
  
  if (lowerName.includes('전화') || lowerName.includes('phone')) return businessIcons.phone;
  if (lowerName.includes('이름') || lowerName.includes('name')) return businessIcons.contact;
  if (lowerName.includes('회사') || lowerName.includes('company')) return businessIcons.company;
  // ... 더 많은 매핑 규칙
  
  return FileText; // 기본 아이콘
};
```

## 🚀 **완벽한 노션 스타일 테이블 템플릿**

```typescript
'use client';

import { useState } from 'react';
import AdminLayout from '@/components/layout/AdminLayout';
import { designSystem } from '@/lib/design-system';
import { tableSystem } from '@/lib/design-system/table';
import { businessIcons, getColumnIcon } from '@/lib/design-system/icons';
import { Check } from 'lucide-react';

export default function ExampleTablePage() {
  const [data, setData] = useState<DataItem[]>([]);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);

  const toggleSelection = (id: string) => {
    setSelectedItems(prev => 
      prev.includes(id) 
        ? prev.filter(itemId => itemId !== id)
        : [...prev, id]
    );
  };

  return (
    <AdminLayout>
      {/* 페이지 헤더 */}
      <div className="mb-8">
        <h1 className={designSystem.components.typography.h2}>데이터 관리</h1>
        <p className={designSystem.components.typography.bodySm}>노션 스타일 테이블</p>
      </div>

      {/* 노션 스타일 테이블 */}
      <div className={tableSystem.container}>
        {/* 테이블 헤더 (고정) */}
        <div className={tableSystem.header.container}>
          <table className="min-w-full">
            <thead>
              <tr className={tableSystem.header.row}>
                <th className={`${tableSystem.header.cell} w-40`}>
                  <div className={tableSystem.header.iconWrapper}>
                    <businessIcons.phone className={tableSystem.header.icon} />
                    <span>연락처</span>
                  </div>
                </th>
                {/* 더 많은 칼럼들... */}
              </tr>
            </thead>
          </table>
        </div>

        {/* 스크롤 가능한 테이블 바디 */}
        <div 
          className={tableSystem.body.scrollContainer}
          style={{ height: '60vh', minHeight: '400px', maxHeight: '800px' }}
        >
          <table className="min-w-full">
            <tbody>
              {data.map((item) => (
                <tr 
                  key={item.id} 
                  className={tableSystem.body.row.base}
                  onClick={() => toggleSelection(item.id)}
                >
                  {/* 노션식 선택 시스템을 포함한 첫 번째 칼럼 */}
                  <td className={`relative ${tableSystem.body.cell} w-40`}>
                    {/* 선택 표시 (파란 세로선) */}
                    <div className={`${tableSystem.selection.indicator} ${
                      selectedItems.includes(item.id) 
                        ? tableSystem.selection.indicatorVisible 
                        : tableSystem.selection.indicatorHidden
                    }`} />
                    
                    {/* 호버/선택 시 체크박스 */}
                    <div className={`${tableSystem.selection.checkbox.container} ${
                      selectedItems.includes(item.id) 
                        ? tableSystem.selection.checkbox.visible 
                        : tableSystem.selection.checkbox.hidden
                    }`}>
                      <div className={`${tableSystem.selection.checkbox.box} ${
                        selectedItems.includes(item.id)
                          ? tableSystem.selection.checkbox.selected
                          : tableSystem.selection.checkbox.unselected
                      }`}>
                        {selectedItems.includes(item.id) && (
                          <Check className={tableSystem.selection.checkbox.checkIcon} />
                        )}
                      </div>
                    </div>

                    {/* 데이터 (밀림 효과) */}
                    <div className={`${tableSystem.selection.content.base} ${
                      selectedItems.includes(item.id) 
                        ? tableSystem.selection.content.selected 
                        : tableSystem.selection.content.unselected
                    }`}>
                      <div className="flex items-center">
                        <businessIcons.phone className="w-3 h-3 mr-2 text-text-tertiary flex-shrink-0" />
                        <span className="text-sm font-medium text-text-primary truncate">
                          {item.phone}
                        </span>
                      </div>
                    </div>
                  </td>
                  
                  {/* 나머지 칼럼들 */}
                  <td className={`${tableSystem.body.cell} w-32`}>
                    <div className="text-sm text-accent truncate font-medium">
                      {item.contact_name}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
}
```

---

# 🚨 **하드코딩 방지 규칙 (필수!)**

## ❌ **절대 금지 사항 - 즉시 에러 처리**

### **🚫 하드코딩된 색상 클래스 사용 시 즉시 수정 요구**
```typescript
// 🚫 이런 클래스들 발견 시 즉시 지적하고 수정 요구
className="text-black"           // → text-text-primary
className="text-white"           // → text-white (예외적 허용)
className="text-gray-900"        // → text-text-primary
className="text-gray-600"        // → text-text-secondary
className="text-gray-400"        // → text-text-tertiary
className="text-blue-600"        // → text-accent
className="bg-gray-100"          // → bg-bg-secondary
className="bg-white"             // → bg-bg-primary
className="border-gray-300"      // → border-border-primary
```

### **🚫 아이콘 하드코딩 금지**
```typescript
// 🚫 아이콘 직접 import 및 하드코딩 금지
import { Phone } from 'lucide-react';        // → businessIcons 사용
<Phone className="w-4 h-4" />               // → 하드코딩 금지

// ✅ 올바른 방식
import { businessIcons } from '@/lib/design-system/icons';
const PhoneIcon = businessIcons.phone;
<PhoneIcon className={tableSystem.header.icon} />
```

### **🚫 테이블 스타일 하드코딩 금지**
```typescript
// 🚫 테이블 클래스 직접 작성 금지
className="border border-gray-300 rounded-lg"  // → tableSystem 사용

// ✅ 올바른 방식
className={tableSystem.container}
```

## ✅ **반드시 사용해야 할 시스템들**

### **📝 텍스트 색상 (우선순위 순)**
```typescript
"text-text-primary"      // 메인 텍스트 (제목, 중요 데이터)
"text-text-secondary"    // 보조 텍스트 (설명, 라벨)
"text-text-tertiary"     // 힌트 텍스트 (아이콘, 시간, ID)
"text-text-disabled"     // 비활성 텍스트

// 포인트 색상
"text-accent"            // 강조 (링크, 액션 텍스트)
"text-success"           // 성공 상태
"text-warning"           // 경고 상태
"text-error"             // 에러 상태
```

### **🎨 배경 색상**
```typescript
"bg-bg-primary"          // 메인 배경 (카드, 모달)
"bg-bg-secondary"        // 보조 배경 (페이지, 헤더)
"bg-bg-tertiary"         // 3차 배경 (구분선)
"bg-bg-hover"            // 호버 배경

// 포인트 배경
"bg-accent"              // 강조 배경
"bg-accent-light"        // 연한 강조 배경
"bg-success-light"       // 성공 배경
"bg-warning-light"       // 경고 배경
"bg-error-light"         // 에러 배경
```

### **🔲 경계선**
```typescript
"border-border-primary"   // 메인 경계선
"border-border-secondary" // 보조 경계선
```

### **🎯 아이콘 시스템**
```typescript
// ✅ 반드시 사용할 것
import { businessIcons, getColumnIcon } from '@/lib/design-system/icons';

// 정적 아이콘
const PhoneIcon = businessIcons.phone;
const UserIcon = businessIcons.contact;

// 동적 아이콘 (칼럼명 기반)
const ColumnIcon = getColumnIcon(columnName);
```

### **📋 테이블 시스템**
```typescript
// ✅ 반드시 사용할 것
import { tableSystem } from '@/lib/design-system/table';

// 컨테이너
<div className={tableSystem.container}>

// 헤더
<th className={tableSystem.header.cell}>
  <div className={tableSystem.header.iconWrapper}>
    <Icon className={tableSystem.header.icon} />
    <span>칼럼명</span>
  </div>
</th>

// 선택 시스템
<div className={`${tableSystem.selection.indicator} ${
  isSelected ? tableSystem.selection.indicatorVisible : tableSystem.selection.indicatorHidden
}`} />
```

## 🔍 **코드 리뷰 체크리스트**

### **✅ 모든 코드 작성 후 필수 확인**
- [ ] `text-gray-XXX`, `bg-gray-XXX`, `border-gray-XXX` 클래스 없음
- [ ] `text-black`, `text-white` (예외 제외) 클래스 없음
- [ ] `dark:` 조건부 클래스 직접 사용 없음
- [ ] 모든 색상이 `text-text-*`, `bg-bg-*`, `border-border-*` 패턴
- [ ] designSystem 객체 우선 사용
- [ ] **✅ businessIcons 시스템 사용** (아이콘 하드코딩 금지)
- [ ] **✅ tableSystem 사용** (테이블 스타일 하드코딩 금지)
- [ ] **✅ getColumnIcon 함수 활용** (동적 아이콘 매핑)
- [ ] 라이트/다크 모드 모두에서 테스트 완료

### **🚨 발견 시 즉시 수정 프로세스**
1. **하드코딩 발견** → 즉시 지적
2. **올바른 시스템 제시** → 구체적 대안 제공
3. **수정 확인** → 다크모드 테스트까지 완료
4. **패턴 재교육** → 올바른 사용법 재안내

---

## 🗄️ 데이터베이스 구조 (Supabase)

### 📊 핵심 테이블들
1. **users** - 사용자 (관리자/상담원)
2. **upload_batches** - 업로드 배치 정보
3. **lead_pool** - 업로드된 리드 데이터
4. **lead_assignments** - 리드 배정 관리
5. **counseling_activities** - 상담 활동 기록
6. **counselor_lead_stats** - 상담원 통계
7. **notifications** - 알림

### 🔑 중요 칼럼들 (lead_pool)
```sql
-- 기본 정보
phone VARCHAR(20) NOT NULL          -- 중복검사 기준
name VARCHAR(255)                   -- 실제 고객 이름
email VARCHAR(255)                  

-- 업무 핵심 칼럼들 (매핑 대상)
contact_name VARCHAR(255)           -- 접근용 이름 (이상호, 해밀턴 등)
data_source VARCHAR(255)            -- DB 제공업체 (상호회사, 대구회사)
contact_script TEXT                 -- 접근 내용 (코인, 주식 등)
data_date TIMESTAMP WITH TIME ZONE  -- 데이터 생성일
extra_info TEXT                     -- 기타 정보

-- 상태 관리
status VARCHAR(20) DEFAULT 'available' -- available, assigned, completed, returned
```

## 🔄 업무 플로우

### 1️⃣ 관리자 DB 업로드 ✅ 완성
1. 파일 업로드 (CSV/XLSX)
2. 칼럼 매핑 (자동 아이콘 매핑 포함)
3. 중복 검사 (전화번호 기준)
4. DB 저장

### 2️⃣ 관리자 DB 배분 ✅ 완성
- available 상태 리드 목록 (노션 스타일 테이블)
- 상담원 선택 (현재 배정 현황 표시)
- 배분 실행 (lead_assignments 테이블)

### 3️⃣ 상담원 작업
- 배분받은 DB 확인
- "안녕하세요, 이상호입니다" 식으로 접근
- 상담 결과 수기 입력 (counseling_activities)

### 4️⃣ 관리자 확인
- 상담원 제출 결과 검토
- 성과 관리 및 통계

## 🎯 다음 작업 우선순위

1. **상담원 대시보드** (`/counselor/dashboard/page.tsx`)
   - 배정받은 리드 현황
   - 우선순위 표시

2. **상담원 리드 관리** (`/counselor/leads/page.tsx`)
   - 배정받은 리드 목록 (노션 스타일 테이블)
   - 상담 기록 입력 폼

3. **관리자 리드 관리** (`/admin/leads/page.tsx`)
   - 전체 리드 현황 (노션 스타일 테이블)
   - 상태별 필터링

## 🚨 주의사항

### ❌ 하지 말 것
- designSystem 없이 직접 Tailwind 클래스 사용하지 말기
- AdminLayout/CounselorLayout 빼먹지 말기
- **🚫 하드코딩된 색상 클래스 절대 사용 금지**
- **🚫 아이콘 직접 import 및 하드코딩 금지**
- **🚫 노션 스타일 테이블 외의 테이블 패턴 사용 금지**
- **🚫 tableSystem 외의 테이블 스타일 하드코딩 금지**

### ✅ 반드시 할 것
- 모든 페이지에서 designSystem 객체 사용
- 적절한 Layout 컴포넌트 사용
- 실제 DB 스키마 구조에 맞는 데이터 처리
- 전화번호 기준 중복 검사 로직
- **✅ 노션 스타일 테이블 시스템 적용**
- **✅ businessIcons 시스템 활용**
- **✅ getColumnIcon 함수로 동적 아이콘 매핑**
- **✅ 모든 색상 CSS 변수 기반 사용**

## 📁 라이브러리 & 패키지
- **Next.js 14** (App Router)
- **Tailwind CSS v4**
- **Supabase** (PostgreSQL + Auth)
- **TypeScript**
- **XLSX** (Excel 파일 처리)
- **Papaparse** (CSV 파일 처리)
- **Lucide React** (아이콘)

## 🔗 중요 뷰들
- `admin_lead_summary` - 관리자 대시보드용 리드 통계
- `admin_counselor_assignment_view` - 상담원별 배정 현황
- `counselor_leads_view` - 상담원별 리드 목록 (우선순위 포함)

---

# 💡 **개발 시 필수 확인사항**

## 🎯 **새 페이지 제작 시 체크리스트**
1. **✅ AdminLayout/CounselorLayout 사용**
2. **✅ designSystem 객체 사용**
3. **✅ 노션 스타일 테이블 적용** (테이블이 필요한 경우)
4. **✅ businessIcons 시스템 사용** (아이콘이 필요한 경우)
5. **✅ getColumnIcon 함수 활용** (동적 아이콘 매핑)
6. **✅ 하드코딩 색상 0개** (text-gray-*, bg-white 등 금지)
7. **✅ 라이트/다크 모드 테스트** 완료

## 🚨 **코드 리뷰 시 즉시 수정 요구사항**
- 하드코딩된 색상 클래스 발견 시
- 아이콘 직접 import 및 하드코딩 발견 시
- 노션 스타일 테이블 패턴 미적용 시
- designSystem 미사용 시
- 다크모드 대응 미완료 시

## 📋 **점검 대상 페이지들**
1. **✅ /admin/counselors/page.tsx** - 완성 (노션 스타일)
2. **✅ /admin/upload/page.tsx** - 완성 (노션 스타일)
3. **✅ /admin/assignments/page.tsx** - 완성 (노션 스타일)
4. **🔄 /admin/leads/page.tsx** - 점검 필요
5. **🔄 /counselor/** 모든 페이지들 - 점검 필요

이 문서를 따라 개발하면 **일관되고 전문적인 CRM 시스템**을 구축할 수 있습니다! 🚀