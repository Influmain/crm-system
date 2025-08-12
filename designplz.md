# 🚨 디자인 시스템 규칙 강화 (v4 업데이트)

## ⚠️ **하드코딩 색상 완전 금지 - 강화된 규칙**

### **🔥 절대 금지 패턴들**
```typescript
// ❌ 절대 절대 금지 - 시스템 파괴
"text-red-600", "text-blue-500", "text-green-400"
"bg-red-50", "bg-yellow-100", "bg-blue-200"  
"border-gray-300", "border-red-500"
"text-white", "text-black" // 하드코딩
"hover:text-red-600", "focus:bg-blue-100"

// ❌ 조건부/동적에서도 금지
priority === 'high' ? 'text-red-600' : 'text-gray-500'
status === 'error' ? 'bg-red-50' : 'bg-white'
```

### **✅ 올바른 CSS 변수 사용법**
```typescript
// ✅ 시스템 색상만 사용
"text-text-primary"      // 메인 텍스트
"text-text-secondary"    // 보조 텍스트  
"text-text-tertiary"     // 힌트 텍스트
"text-accent"            // 강조/중요
"bg-bg-primary"          // 메인 배경
"bg-bg-secondary"        // 보조 배경
"bg-bg-hover"            // 호버 상태
"border-border-primary"  // 테두리
"bg-accent/10"           // 투명도 적용
```

### **🎨 의미별 색상 매핑 가이드**
```typescript
// 우선순위/중요도
긴급/중요/활성 → text-accent, bg-accent/10
일반/보통 → text-text-primary, bg-bg-secondary  
낮음/비활성 → text-text-secondary, bg-bg-hover

// 상태 표시
성공 → text-accent (녹색 의미)
경고 → text-text-primary (노란색 의미)
오류 → text-accent (빨간색 의미)
정보 → text-text-secondary (파란색 의미)
```

## 🔍 **코드 작성 시 검증 체크리스트**

### **✅ 개발 전 필수 확인**
1. [ ] 색상은 CSS 변수만 사용할 것 (`text-*`, `bg-*`, `border-*`)
2. [ ] 아이콘은 businessIcons만 사용할 것
3. [ ] alert() 대신 toast만 사용할 것
4. [ ] 하드코딩 색상 패턴 없는지 확인

### **🔍 코드 완성 후 검증**
```bash
# 하드코딩 색상 검색 명령어
grep -E "(text|bg|border)-(red|blue|green|yellow|gray|white|black)-[0-9]" 파일명
grep -E "text-(white|black)(?!\s|$)" 파일명
```

### **🚨 실수 방지 가이드**

#### **자주 실수하는 패턴들**
```typescript
// ❌ 습관적 실수 패턴
"text-red-600"     // 긴급하다고 빨간색 쓰기
"text-green-500"   // 성공이라고 녹색 쓰기  
"bg-yellow-50"     // 경고라고 노란색 쓰기
"text-gray-400"    // 비활성이라고 회색 쓰기

// ✅ 올바른 대체 패턴
"text-accent"           // 긴급 → 시스템 강조색
"text-accent"           // 성공 → 시스템 강조색  
"text-text-primary"     // 경고 → 메인 텍스트색
"text-text-secondary"   // 비활성 → 보조 텍스트색
```

#### **색상 선택 사고 과정**
```typescript
// 1단계: 의미 파악
"이것은 무엇을 나타내는가?"
- 중요한 정보 → text-accent
- 일반 텍스트 → text-text-primary  
- 부가 정보 → text-text-secondary

// 2단계: 시스템 색상 선택
"어떤 CSS 변수를 써야 하는가?"
- 강조/액션 → accent 계열
- 텍스트 → text-* 계열
- 배경 → bg-* 계열
- 테두리 → border-* 계열

// 3단계: 검증
"하드코딩 색상은 없는가?"
- red, blue, green, yellow 등 단어 검색
- 숫자가 붙은 색상(예: -600, -50) 검색
```

## 💡 **실무 적용 가이드**

### **개발 중 실시간 체크**
1. **색상 입력 시**: "이게 CSS 변수인가?" 항상 자문
2. **조건부 색상**: 모든 분기에서 CSS 변수 사용 확인
3. **복사/붙여넣기**: 외부 코드 가져올 때 색상 재검토

### **완성 후 전체 검증**
1. **파일 전체 검색**: `text-*-[숫자]` 패턴 검색
2. **의미 재검토**: 색상이 의미에 맞는지 확인
3. **다크모드 테스트**: 테마 전환해서 모든 색상 확인

## 🎯 **앞으로의 개발 원칙**

### **색상 사용 우선순위**
1. **1순위**: CSS 변수 (`text-accent`, `bg-bg-primary`)
2. **2순위**: 투명도 적용 (`bg-accent/10`, `text-text-primary/70`)
3. **금지**: 하드코딩 색상 (`text-red-600`, `bg-blue-50`)

### **새 기능 개발 시**
- 색상 선택보다 **기능 구현 우선**
- 일단 `text-text-primary`, `bg-bg-primary` 등 기본 색상 사용
- 나중에 의미에 맞게 `text-accent` 등으로 세밀 조정

### **코드 리뷰 체크포인트**
- [ ] 하드코딩 색상 0개 확인
- [ ] CSS 변수 일관성 확인  
- [ ] 다크모드 호환성 확인
- [ ] 의미론적 색상 사용 확인

---

**🔥 핵심: 색상은 의미를 나타내는 도구, 하드코딩은 시스템을 파괴하는 독!**  
**✅ 항상 CSS 변수만 사용하여 일관된 디자인 시스템 유지!**