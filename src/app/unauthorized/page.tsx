// 파일 경로: /app/unauthorized/page.tsx
// 📋 4단계: 권한 없음 페이지

import { UnauthorizedPage } from '@/components/auth/ProtectedRoute';

export default function Unauthorized() {
  return <UnauthorizedPage />;
}

/* 
📝 설명:
- 권한이 없는 사용자가 접근했을 때 표시되는 페이지
- ProtectedRoute에서 자동으로 리다이렉트됨
- 이전 페이지로 돌아가기 또는 로그아웃 옵션 제공

🧪 테스트:
- 직접 /unauthorized 접속해서 페이지가 정상 표시되는지 확인
*/