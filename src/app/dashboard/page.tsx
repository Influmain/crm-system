// 파일 경로: src/app/dashboard/page.tsx
// 📋 6단계: 역할별 대시보드 자동 라우팅

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';

export default function DashboardPage() {
  const { userProfile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && userProfile) {
      console.log('역할별 리다이렉트:', userProfile.role);
      
      // 역할에 따라 적절한 대시보드로 리다이렉트
      if (userProfile.role === 'admin') {
        console.log('관리자 → /admin/dashboard로 리다이렉트');
        router.push('/admin/dashboard');
      } else if (userProfile.role === 'counselor') {
        console.log('상담원 → /counselor/dashboard로 리다이렉트');
        router.push('/counselor/dashboard');
      } else {
        console.log('알 수 없는 역할 → /unauthorized로 리다이렉트');
        router.push('/unauthorized');
      }
    }
  }, [userProfile, loading, router]);

  // 로딩 중이거나 리다이렉트 처리 중
  return (
    <div className="min-h-screen bg-bg-secondary flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mx-auto"></div>
        <p className="mt-4 text-text-secondary">
          {loading ? '사용자 정보 확인 중...' : '대시보드로 이동 중...'}
        </p>
        
        {/* 디버그 정보 */}
        {userProfile && (
          <div className="mt-4 text-xs text-text-tertiary">
            {userProfile.full_name} ({userProfile.role}) → 
            {userProfile.role === 'admin' ? ' 관리자 대시보드' : ' 상담원 대시보드'}
          </div>
        )}
      </div>
    </div>
  );
}

/*
📝 설명:
1. 로그인 성공 후 /dashboard로 리다이렉트됨
2. 사용자 역할을 확인하여 적절한 대시보드로 자동 이동
3. admin → /admin/dashboard
4. counselor → /counselor/dashboard
5. 알 수 없는 역할 → /unauthorized

🧪 테스트:
1. src/app/dashboard/ 폴더 생성
2. src/app/dashboard/page.tsx 파일 생성
3. 로그인 후 자동 리다이렉트 확인
*/