// 파일 경로: src/app/login/page.tsx
// 📋 5단계: 로그인 페이지 생성

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { designSystem } from '@/lib/design-system';
import { businessIcons } from '@/lib/design-system/icons';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const { signIn } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    console.log('로그인 폼 제출:', { email, password: '***' });

    const { error } = await signIn(email, password);
    
    if (error) {
      console.error('로그인 실패:', error);
      setError('이메일 또는 비밀번호가 올바르지 않습니다.');
      setLoading(false);
    } else {
      console.log('로그인 성공, 대시보드로 이동');
      // 로그인 성공 시 역할에 따라 리다이렉트
      router.push('/dashboard');
    }
  };

  // 테스트 계정으로 자동 입력
  const fillTestAccount = (type: 'admin' | 'counselor') => {
    if (type === 'admin') {
      setEmail('admin@company.com');
      setPassword('admin123');
    } else {
      setEmail('counselor1@company.com');
      setPassword('counselor123');
    }
  };

  return (
    <div className="min-h-screen bg-bg-secondary flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* 헤더 */}
        <div>
          <div className="mx-auto h-12 w-12 bg-accent rounded-lg flex items-center justify-center">
            {businessIcons.contact && <businessIcons.contact className="h-8 w-8 text-white" />}
          </div>
          <h2 className="mt-6 text-center text-3xl font-bold text-text-primary">
            CRM 시스템 로그인
          </h2>
          <p className="mt-2 text-center text-sm text-text-secondary">
            관리자 또는 상담원 계정으로 로그인하세요
          </p>
        </div>
        
        {/* 로그인 폼 */}
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-text-primary">
                이메일 주소
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-border-primary rounded-md shadow-sm bg-bg-primary text-text-primary focus:outline-none focus:ring-accent focus:border-accent"
                placeholder="your@email.com"
              />
            </div>
            
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-text-primary">
                비밀번호
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-border-primary rounded-md shadow-sm bg-bg-primary text-text-primary focus:outline-none focus:ring-accent focus:border-accent"
                placeholder="비밀번호를 입력하세요"
              />
            </div>
          </div>

          {/* 에러 메시지 */}
          {error && (
            <div className="bg-error-light border border-error rounded-md p-3">
              <p className="text-sm text-error">{error}</p>
            </div>
          )}

          {/* 로그인 버튼 */}
          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-accent hover:bg-accent/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '로그인 중...' : '로그인'}
            </button>
          </div>
        </form>

        {/* 테스트 계정 안내 */}
        <div className="mt-6 p-4 bg-bg-primary border border-border-primary rounded-lg">
          <h3 className="text-sm font-medium text-text-primary mb-3">🧪 테스트 계정</h3>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between p-2 bg-bg-secondary rounded border border-border-primary">
              <div className="text-xs">
                <div className="font-medium text-text-primary">관리자</div>
                <div className="text-text-tertiary">admin@company.com / admin123</div>
              </div>
              <button
                type="button"
                onClick={() => fillTestAccount('admin')}
                className="px-2 py-1 text-xs bg-accent text-white rounded hover:bg-accent/90"
              >
                자동입력
              </button>
            </div>
            
            <div className="flex items-center justify-between p-2 bg-bg-secondary rounded border border-border-primary">
              <div className="text-xs">
                <div className="font-medium text-text-primary">상담원</div>
                <div className="text-text-tertiary">counselor1@company.com / counselor123</div>
              </div>
              <button
                type="button"
                onClick={() => fillTestAccount('counselor')}
                className="px-2 py-1 text-xs bg-accent text-white rounded hover:bg-accent/90"
              >
                자동입력
              </button>
            </div>
          </div>
          
          <div className="mt-3 text-xs text-text-tertiary">
            💡 자동입력 버튼을 클릭하면 테스트 계정 정보가 자동으로 입력됩니다
          </div>
        </div>
      </div>
    </div>
  );
}

/*
📝 사용법:
1. src/app/login/ 폴더 생성
2. src/app/login/page.tsx 파일 생성 후 위 코드 복사
3. 브라우저에서 http://localhost:3000/login 접속
4. 테스트 계정 자동입력 버튼 클릭 후 로그인 시도

🧪 테스트 시나리오:
1. 테스트 계정 자동입력 → 로그인 시도 → 성공/실패 확인
2. 잘못된 계정 입력 → 에러 메시지 확인
3. 로그인 성공 시 /dashboard로 리다이렉트 확인

📊 예상 결과:
- 로그인 성공 시: Auth Debug에서 User/Profile 정보 표시
- 로그인 실패 시: 에러 메시지 표시
*/