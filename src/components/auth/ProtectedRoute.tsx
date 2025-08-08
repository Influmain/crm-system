// 파일 경로: /components/auth/ProtectedRoute.tsx
// 📋 3단계: 페이지 접근 권한 제어 컴포넌트

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'admin' | 'counselor';    // 필요한 권한 (선택사항)
  redirectTo?: string;                     // 리다이렉트할 경로
}

export default function ProtectedRoute({ 
  children, 
  requiredRole,
  redirectTo = '/login' 
}: ProtectedRouteProps) {
  const { user, userProfile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // 로딩이 끝난 후에만 권한 검사
    if (!loading) {
      console.log('권한 검사:', { 
        user: user?.email, 
        profile: userProfile?.full_name, 
        role: userProfile?.role,
        requiredRole 
      });

      // 1. 로그인하지 않은 경우
      if (!user) {
        console.log('❌ 로그인 필요 → /login으로 리다이렉트');
        router.push(redirectTo);
        return;
      }

      // 2. 프로필이 없는 경우
      if (!userProfile) {
        console.log('❌ 프로필 없음 → /login으로 리다이렉트');
        router.push('/login');
        return;
      }

      // 3. 비활성 사용자
      if (!userProfile.is_active) {
        console.log('❌ 비활성 사용자 → /unauthorized로 리다이렉트');
        router.push('/unauthorized');
        return;
      }

      // 4. 권한 확인
      if (requiredRole && userProfile.role !== requiredRole) {
        console.log(`❌ 권한 부족 (필요: ${requiredRole}, 현재: ${userProfile.role}) → /unauthorized로 리다이렉트`);
        router.push('/unauthorized');
        return;
      }

      console.log('✅ 권한 검사 통과');
    }
  }, [user, userProfile, loading, router, requiredRole, redirectTo]);

  // 로딩 중 화면
  if (loading) {
    return (
      <div className="min-h-screen bg-bg-secondary flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mx-auto"></div>
          <p className="mt-4 text-text-secondary">인증 확인 중...</p>
        </div>
      </div>
    );
  }

  // 인증되지 않은 경우 (리다이렉트 처리 중)
  if (!user || !userProfile || !userProfile.is_active) {
    return (
      <div className="min-h-screen bg-bg-secondary flex items-center justify-center">
        <div className="text-center">
          <p className="text-text-secondary">페이지 이동 중...</p>
        </div>
      </div>
    );
  }

  // 권한이 맞지 않는 경우 (리다이렉트 처리 중)
  if (requiredRole && userProfile.role !== requiredRole) {
    return (
      <div className="min-h-screen bg-bg-secondary flex items-center justify-center">
        <div className="text-center">
          <p className="text-text-secondary">권한을 확인하는 중...</p>
        </div>
      </div>
    );
  }

  // 모든 검사를 통과한 경우 실제 컨텐츠 표시
  return <>{children}</>;
}

// 권한 없음 페이지 컴포넌트
export function UnauthorizedPage() {
  const { userProfile, signOut } = useAuth();
  
  return (
    <div className="min-h-screen bg-bg-secondary flex items-center justify-center">
      <div className="max-w-md w-full bg-bg-primary border border-border-primary rounded-lg p-8 text-center">
        <div className="text-6xl mb-4">🚫</div>
        <h1 className="text-2xl font-bold text-text-primary mb-2">접근 권한이 없습니다</h1>
        <p className="text-text-secondary mb-6">
          현재 계정({userProfile?.role})으로는 이 페이지에 접근할 수 없습니다.
        </p>
        
        <div className="space-y-3">
          <button
            onClick={() => window.history.back()}
            className="w-full px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent/90"
          >
            이전 페이지로 돌아가기
          </button>
          
          <button
            onClick={signOut}
            className="w-full px-4 py-2 bg-bg-secondary border border-border-primary text-text-primary rounded-lg hover:bg-bg-hover"
          >
            다른 계정으로 로그인
          </button>
        </div>
      </div>
    </div>
  );
}

/* 
📝 사용법:

1. 전체 보호 (로그인 필요):
<ProtectedRoute>
  <MyComponent />
</ProtectedRoute>

2. 관리자만:
<ProtectedRoute requiredRole="admin">
  <AdminComponent />
</ProtectedRoute>

3. 상담원만:
<ProtectedRoute requiredRole="counselor">
  <CounselorComponent />
</ProtectedRoute>

🧪 테스트 시나리오:
1. 로그인 안 한 상태 → /login으로 리다이렉트
2. 상담원이 관리자 페이지 접근 → /unauthorized로 리다이렉트
3. 올바른 권한 → 정상 페이지 표시
*/