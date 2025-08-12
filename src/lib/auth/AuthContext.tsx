'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';

// 사용자 프로필 타입 정의
interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  phone?: string;
  department?: string;
  role: 'admin' | 'counselor';
  is_active: boolean;
}

// AuthContext 타입 정의
interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: any }>;
  signOut: () => Promise<void>;
  isAdmin: boolean;
  isCounselor: boolean;
}

// Context 생성
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Provider 컴포넌트
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasRedirected, setHasRedirected] = useState(false); // 🚨 리다이렉트 중복 방지
  const router = useRouter();

  // ✅ 개선된 사용자 프로필 로드 함수 (무한 리다이렉트 방지)
  const loadUserProfile = async (userId: string, isFromSignIn: boolean = false) => {
    try {
      console.log('프로필 로드 시도:', userId, '로그인에서 호출:', isFromSignIn);
      
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('프로필 로드 오류:', error);
        console.log('오류 상세:', error.code, error.message);
        setUserProfile(null);
        setLoading(false);
        return;
      }

      console.log('프로필 로드 성공:', data);
      console.log('사용자 역할:', data.role);
      setUserProfile(data);

      // ✅ 리다이렉트 로직 개선 (무한 루프 방지)
      const currentPath = window.location.pathname;
      console.log('현재 경로:', currentPath, '리다이렉트 완료:', hasRedirected);
      
      // 🚨 리다이렉트 조건 개선
      const shouldRedirect = 
        !hasRedirected && // 아직 리다이렉트 안 함
        (
          isFromSignIn || // 로그인에서 호출됨
          currentPath === '/login' || // 로그인 페이지
          currentPath === '/' || // 홈페이지
          currentPath === '/dashboard' // 잘못된 대시보드 경로
        );

      if (shouldRedirect) {
        const targetPath = data.role === 'admin' ? '/admin/dashboard' : '/counselor/dashboard';
        console.log('리다이렉트 실행:', data.role, '→', targetPath);
        
        // 🚨 리다이렉트 플래그 설정 (중복 방지)
        setHasRedirected(true);
        setLoading(false);
        
        setTimeout(() => {
          if (window.location.pathname === currentPath) {
            console.log('실제 리다이렉트 실행:', targetPath);
            window.location.href = targetPath;
          }
        }, 100);
      } else {
        console.log('리다이렉트 조건 불충족 - 현재 페이지 유지');
        setLoading(false);
      }
      
    } catch (error) {
      console.error('프로필 로드 예외:', error);
      setUserProfile(null);
      setLoading(false);
    }
  };

  // ✅ 개선된 로그인 함수
  const signIn = async (email: string, password: string) => {
    try {
      console.log('로그인 시도:', email);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('로그인 오류:', error);
        return { error };
      }

      console.log('로그인 성공:', data.user?.email);
      
      // 🚨 로그인 성공 시에만 리다이렉트 플래그 초기화
      setHasRedirected(false);
      
      if (data.user) {
        await loadUserProfile(data.user.id, true); // isFromSignIn = true
      }
      
      return { error: null };
    } catch (error) {
      console.error('로그인 예외:', error);
      return { error };
    }
  };

  // ✅ 개선된 로그아웃 함수
  const signOut = async () => {
    console.log('🚀 슈퍼 로그아웃 프로세스 시작');
    
    // 1. 즉시 상태 초기화
    setLoading(true);
    setUser(null);
    setUserProfile(null);
    setHasRedirected(false); // 🚨 리다이렉트 플래그 초기화
    
    try {
      // Supabase 세션 종료
      await supabase.auth.signOut({ scope: 'local' });
      await supabase.auth.signOut({ scope: 'global' });
      
      // 브라우저 저장소 완전 정리
      localStorage.clear();
      sessionStorage.clear();
      
      // IndexedDB 정리
      try {
        const databases = await indexedDB.databases();
        databases.forEach(db => {
          if (db.name && (db.name.includes('supabase') || db.name.includes('auth'))) {
            indexedDB.deleteDatabase(db.name);
          }
        });
      } catch (idbError) {
        console.warn('IndexedDB 정리 실패:', idbError);
      }
      
      // 쿠키 정리
      document.cookie.split(";").forEach(cookie => {
        const eqPos = cookie.indexOf("=");
        const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
      });
      
    } catch (error) {
      console.warn('로그아웃 중 오류:', error);
    }
    
    setLoading(false);
    
    setTimeout(() => {
      window.location.replace('/login');
    }, 200);
    
    console.log('🎉 슈퍼 로그아웃 완료');
  };

  // ✅ 개선된 인증 상태 변화 감지
  useEffect(() => {
    let mounted = true;
    
    // 초기 세션 확인
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      
      console.log('초기 세션 확인:', session?.user?.email || '세션 없음');
      
      setUser(session?.user ?? null);
      
      if (session?.user) {
        // 🚨 초기 로드 시에는 isFromSignIn = false
        loadUserProfile(session.user.id, false);
      } else {
        // 🚨 세션 없는데 대시보드 페이지에 있으면 즉시 로그인 페이지로
        const currentPath = window.location.pathname;
        if (currentPath.includes('/admin/') || currentPath.includes('/counselor/')) {
          console.log('⚠️ 로그아웃 상태인데 보호된 페이지 접근 → 로그인 페이지로 이동');
          window.location.href = '/login';
          return;
        }
        setLoading(false);
      }
    });

    // 인증 상태 변화 리스너
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;
        
        console.log('인증 상태 변화:', event, session?.user?.email || '세션 없음');
        
        // 로그아웃 이벤트 처리
        if (event === 'SIGNED_OUT') {
          console.log('🚪 로그아웃 이벤트 감지');
          setUser(null);
          setUserProfile(null);
          setHasRedirected(false);
          setLoading(false);
          
          setTimeout(() => {
            if (window.location.pathname !== '/login') {
              window.location.replace('/login');
            }
          }, 100);
          return;
        }
        
        // 로그인 이벤트 처리
        if (event === 'SIGNED_IN') {
          console.log('✅ SIGNED_IN 이벤트 감지');
          setHasRedirected(false); // 새 로그인 시 플래그 초기화
        }
        
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // 🚨 이벤트 기반 호출 시에는 이벤트 타입에 따라 구분
          const isFromSignInEvent = event === 'SIGNED_IN';
          await loadUserProfile(session.user.id, isFromSignInEvent);
        } else {
          setUserProfile(null);
          setLoading(false);
        }
      }
    );

    return () => {
      mounted = false;
      console.log('인증 리스너 정리');
      subscription.unsubscribe();
    };
  }, []);

  // Context 값 정의
  const value = {
    user,
    userProfile,
    loading,
    signIn,
    signOut,
    isAdmin: userProfile?.role === 'admin',
    isCounselor: userProfile?.role === 'counselor',
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// useAuth 훅
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth는 AuthProvider 내부에서만 사용할 수 있습니다');
  }
  return context;
};

// ✅ AuthDebugInfo 컴포넌트 (개발 환경용)
export function AuthDebugInfo() {
  const { user, userProfile, loading } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [currentPath, setCurrentPath] = useState('');
  
  useEffect(() => {
    setMounted(true);
    setCurrentPath(window.location.pathname);
  }, []);
  
  if (process.env.NODE_ENV !== 'development' || !mounted) return null;
  
  return (
    <div className="fixed top-4 right-4 bg-black/90 text-white px-3 py-2 rounded-lg text-xs shadow-lg z-50 border border-gray-600">
      <div className="flex items-center gap-2">
        <span className="text-green-400">🔍</span>
        {loading ? (
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
            <span className="text-yellow-400">Loading...</span>
          </div>
        ) : userProfile ? (
          <div className="flex flex-col">
            <div className="text-green-400 font-medium">
              ✅ {userProfile.full_name}
            </div>
            <div className="text-xs text-gray-300">
              {userProfile.role} • {userProfile.department || 'N/A'}
            </div>
            <div className="text-xs text-cyan-400">
              Path: {currentPath}
            </div>
          </div>
        ) : user ? (
          <div className="text-yellow-400">
            ⚠️ {user.email} (프로필 없음)
          </div>
        ) : (
          <span className="text-red-400">❌ Not logged in</span>
        )}
      </div>
      
      <details className="mt-2">
        <summary className="text-gray-400 cursor-pointer hover:text-white text-xs">
          상세정보
        </summary>
        <div className="mt-2 pt-2 border-t border-gray-600 space-y-1">
          <div>
            <span className="text-gray-400">User ID:</span> 
            <span className="text-cyan-400 text-xs ml-1">
              {user?.id ? `${user.id.slice(0, 8)}...` : 'null'}
            </span>
          </div>
          <div>
            <span className="text-gray-400">Email:</span> 
            <span className="text-blue-400 text-xs ml-1">
              {user?.email || 'null'}
            </span>
          </div>
          <div>
            <span className="text-gray-400">Role:</span> 
            <span className="text-orange-400 text-xs ml-1">
              {userProfile?.role || 'null'}
            </span>
          </div>
          <div>
            <span className="text-gray-400">Current Path:</span> 
            <span className="text-purple-400 text-xs ml-1">
              {currentPath || 'Loading...'}
            </span>
          </div>
          
          {/* 개발 환경용 캐시 정리 버튼 */}
          <div className="pt-2 border-t border-gray-600 space-y-1">
            <button 
              onClick={() => {
                console.log('🧹 캐시 정리 실행');
                localStorage.clear();
                sessionStorage.clear();
                // 🚨 로그인 페이지로 이동 후 새로고침 (무한 로딩 방지)
                window.location.href = '/login';
              }}
              className="px-2 py-1 bg-yellow-500 text-white rounded text-xs hover:bg-yellow-600 w-full"
            >
              🧹 캐시 정리
            </button>
            <button 
              onClick={() => {
                console.log('🆘 완전 초기화 실행');
                localStorage.clear();
                sessionStorage.clear();
                indexedDB.databases().then(dbs => {
                  dbs.forEach(db => {
                    if (db.name) indexedDB.deleteDatabase(db.name);
                  });
                });
                window.location.replace('/login');
              }}
              className="px-2 py-1 bg-red-500 text-white rounded text-xs hover:bg-red-600 w-full"
            >
              🆘 완전 초기화
            </button>
          </div>
        </div>
      </details>
    </div>
  );
}