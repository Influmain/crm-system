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
  emergencyReset: () => void;
}

// Context 생성
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// 무한로딩 방지 헬퍼 함수들
const INIT_TIMEOUT = 8000; // 8초 타임아웃
const MAX_RETRIES = 2; // 최대 재시도 횟수

// 완전한 캐시 정리 함수
const clearAllCache = async () => {
  console.log('🧹 완전한 캐시 정리 시작');
  
  try {
    // 로컬/세션 스토리지
    localStorage.clear();
    sessionStorage.clear();
    
    // IndexedDB (비동기, 타임아웃 적용)
    if ('indexedDB' in window) {
      try {
        const dbs = await Promise.race([
          indexedDB.databases(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('IndexedDB timeout')), 3000))
        ]) as IDBDatabaseInfo[];
        
        await Promise.all(
          dbs.map(db => {
            if (db.name) {
              return new Promise<void>((resolve) => {
                const deleteReq = indexedDB.deleteDatabase(db.name!);
                deleteReq.onsuccess = () => resolve();
                deleteReq.onerror = () => resolve();
                setTimeout(() => resolve(), 2000); // 2초 타임아웃
              });
            }
            return Promise.resolve();
          })
        );
      } catch (error) {
        console.log('IndexedDB 정리 실패:', error);
      }
    }
    
    // 쿠키 정리
    if (typeof document !== 'undefined') {
      document.cookie.split(';').forEach(cookie => {
        const eqPos = cookie.indexOf('=');
        const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
        if (name.includes('supabase') || name.includes('auth') || name.includes('sb-')) {
          document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=${window.location.hostname}`;
          document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
        }
      });
    }
    
    console.log('✅ 캐시 정리 완료');
  } catch (error) {
    console.error('캐시 정리 중 오류:', error);
  }
};

// 타임아웃이 있는 세션 확인
const getSessionWithTimeout = async (timeoutMs: number = INIT_TIMEOUT) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const { data, error } = await supabase.auth.getSession();
    clearTimeout(timeoutId);
    return { data, error };
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
};

// Provider 컴포넌트
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasRedirected, setHasRedirected] = useState(false);
  const [initAttempts, setInitAttempts] = useState(0);
  const [emergencyMode, setEmergencyMode] = useState(false);
  const router = useRouter();

  // 긴급 리셋 함수 (사용자가 수동으로 호출 가능)
  const emergencyReset = async () => {
    console.log('🆘 긴급 리셋 실행');
    setEmergencyMode(true);
    setLoading(true);
    
    await clearAllCache();
    
    // Supabase 연결 리셋
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.log('강제 로그아웃 실패:', error);
    }
    
    setUser(null);
    setUserProfile(null);
    setHasRedirected(false);
    setInitAttempts(0);
    setLoading(false);
    setEmergencyMode(false);
    
    // 로그인 페이지로 이동
    setTimeout(() => {
      window.location.href = '/login';
    }, 500);
  };

  // 안전한 프로필 로드
  const loadUserProfile = async (userId: string, isFromSignIn: boolean = false) => {
    try {
      console.log('프로필 로드 시도:', userId);
      
      // 타임아웃 적용
      const profilePromise = supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();
      
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('프로필 로드 타임아웃')), 5000)
      );
      
      const { data, error } = await Promise.race([profilePromise, timeoutPromise]) as any;

      if (error) {
        console.error('프로필 로드 오류:', error);
        throw error;
      }

      console.log('프로필 로드 성공:', data.email);
      setUserProfile(data);

      // 리다이렉트 로직
      const currentPath = window.location.pathname;
      const shouldRedirect = 
        !hasRedirected && 
        (isFromSignIn || currentPath === '/login' || currentPath === '/' || currentPath === '/dashboard');

      if (shouldRedirect) {
        const targetPath = data.role === 'admin' ? '/admin/dashboard' : '/counselor/dashboard';
        console.log('리다이렉트:', targetPath);
        
        setHasRedirected(true);
        setLoading(false);
        
        setTimeout(() => {
          window.location.href = targetPath;
        }, 100);
      } else {
        setLoading(false);
      }
      
    } catch (error: any) {
      console.error('프로필 로드 실패:', error);
      
      // 프로필 로드 실패 시 로그아웃 처리
      setUser(null);
      setUserProfile(null);
      setLoading(false);
      
      setTimeout(() => {
        window.location.href = '/login';
      }, 1000);
    }
  };

  // 안전한 세션 초기화
  const initializeAuth = async () => {
    if (initAttempts >= MAX_RETRIES) {
      console.log('⚠️ 최대 재시도 횟수 도달, 긴급 리셋 실행');
      await emergencyReset();
      return;
    }

    try {
      setInitAttempts(prev => prev + 1);
      console.log(`인증 초기화 시도 ${initAttempts + 1}/${MAX_RETRIES + 1}`);
      
      const { data: { session }, error } = await getSessionWithTimeout();
      
      if (error) {
        throw error;
      }

      console.log('세션 확인 완료:', session?.user?.email || '세션 없음');
      setUser(session?.user ?? null);
      
      if (session?.user) {
        await loadUserProfile(session.user.id, false);
      } else {
        // 보호된 페이지에서 세션 없으면 로그인 페이지로
        const currentPath = window.location.pathname;
        if (currentPath.includes('/admin/') || currentPath.includes('/counselor/')) {
          console.log('보호된 페이지에서 세션 없음 → 로그인 페이지로');
          window.location.href = '/login';
          return;
        }
        setLoading(false);
      }
      
      // 성공하면 재시도 카운터 리셋
      setInitAttempts(0);
      
    } catch (error: any) {
      console.error('세션 초기화 실패:', error);
      
      if (initAttempts >= MAX_RETRIES) {
        console.log('최대 재시도 도달, 긴급 모드 활성화');
        setEmergencyMode(true);
        setLoading(false);
      } else {
        // 재시도
        console.log(`${(initAttempts + 1) * 2}초 후 재시도`);
        setTimeout(() => {
          initializeAuth();
        }, (initAttempts + 1) * 2000);
      }
    }
  };

  // 로그인 함수
  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      console.log('로그인 시도:', email);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setLoading(false);
        return { error };
      }

      console.log('로그인 성공:', data.user?.email);
      setHasRedirected(false);
      setInitAttempts(0); // 성공 시 재시도 카운터 리셋
      
      if (data.user) {
        await loadUserProfile(data.user.id, true);
      }
      
      return { error: null };
    } catch (error) {
      console.error('로그인 예외:', error);
      setLoading(false);
      return { error };
    }
  };

  // 로그아웃 함수
  const signOut = async () => {
    console.log('로그아웃 시작');
    
    setLoading(true);
    setUser(null);
    setUserProfile(null);
    setHasRedirected(false);
    setInitAttempts(0);
    
    try {
      await supabase.auth.signOut();
      await clearAllCache();
    } catch (error) {
      console.warn('로그아웃 중 오류:', error);
    }
    
    setLoading(false);
    
    setTimeout(() => {
      window.location.replace('/login');
    }, 200);
  };

  // 초기화
  useEffect(() => {
    let mounted = true;
    
    if (mounted) {
      initializeAuth();
    }
    
    return () => {
      mounted = false;
    };
  }, []); // 의존성 배열 비움

  // 인증 상태 변화 리스너
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('인증 상태 변화:', event);
        
        if (event === 'SIGNED_OUT') {
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
        
        if (event === 'SIGNED_IN') {
          setHasRedirected(false);
          setInitAttempts(0);
        }
        
        setUser(session?.user ?? null);
        
        if (session?.user) {
          const isFromSignInEvent = event === 'SIGNED_IN';
          await loadUserProfile(session.user.id, isFromSignInEvent);
        } else {
          setUserProfile(null);
          setLoading(false);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // 긴급 모드일 때 특별한 UI 표시
  if (emergencyMode) {
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="text-6xl">⚠️</div>
          <h2 className="text-xl font-semibold text-text-primary">인증 시스템 오류</h2>
          <p className="text-text-secondary max-w-md">
            로그인 과정에서 문제가 발생했습니다. 
            아래 버튼을 클릭하여 시스템을 초기화하고 다시 시도해주세요.
          </p>
          <div className="space-y-2">
            <button
              onClick={emergencyReset}
              className="px-6 py-3 bg-accent text-white rounded-lg hover:bg-accent/90"
            >
              시스템 초기화 후 재시도
            </button>
            <div className="text-xs text-text-tertiary">
              브라우저 캐시가 정리되고 로그인 페이지로 이동합니다
            </div>
          </div>
        </div>
      </div>
    );
  }

  const value = {
    user,
    userProfile,
    loading,
    signIn,
    signOut,
    isAdmin: userProfile?.role === 'admin',
    isCounselor: userProfile?.role === 'counselor',
    emergencyReset,
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

// 개발 환경용 디버그 + 프로덕션용 긴급 버튼
export function AuthDebugInfo() {
  const { user, userProfile, loading, emergencyReset } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [showEmergencyButton, setShowEmergencyButton] = useState(false);
  const [currentPath, setCurrentPath] = useState('');
  
  useEffect(() => {
    setMounted(true);
    setCurrentPath(window.location.pathname);
    
    // 경로 변경 감지
    const updatePath = () => {
      setCurrentPath(window.location.pathname);
    };
    
    // popstate 이벤트 리스너 (뒤로가기/앞으로가기)
    window.addEventListener('popstate', updatePath);
    
    // 주기적으로 경로 확인 (SPA에서 경로 변경 감지)
    const pathInterval = setInterval(updatePath, 1000);
    
    return () => {
      window.removeEventListener('popstate', updatePath);
      clearInterval(pathInterval);
    };
  }, []);
  
  // 사용자 상태 변경 시 경로 업데이트
  useEffect(() => {
    if (!user && !loading) {
      // 로그아웃 상태일 때 현재 경로 다시 확인
      setCurrentPath(window.location.pathname);
    }
  }, [user, loading]);
  
  useEffect(() => {
    // 10초 후 긴급 버튼 표시 (무한로딩 감지)
    if (loading) {
      const timer = setTimeout(() => {
        setShowEmergencyButton(true);
      }, 10000);
      
      return () => clearTimeout(timer);
    } else {
      setShowEmergencyButton(false);
    }
  }, [loading]);
  
  if (!mounted) return null;
  
  // 프로덕션에서는 긴급 버튼만 표시
  if (process.env.NODE_ENV === 'production') {
    if (!showEmergencyButton || !loading) return null;
    
    return (
      <div className="fixed top-4 right-4 bg-red-500 text-white px-4 py-3 rounded-lg shadow-lg z-50">
        <div className="text-center space-y-2">
          <div className="text-sm font-medium">로딩이 너무 오래 걸리나요?</div>
          <button
            onClick={emergencyReset}
            className="px-3 py-1 bg-white text-red-500 rounded text-sm hover:bg-gray-100"
          >
            문제 해결하기
          </button>
        </div>
      </div>
    );
  }
  
  // 개발 환경에서는 전체 디버그 정보 표시
  return (
    <div className="fixed top-4 right-4 bg-black/90 text-white px-3 py-2 rounded-lg text-xs shadow-lg z-50 border border-gray-600">
      <div className="flex items-center gap-2">
        {loading ? (
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
            <span className="text-yellow-400">Loading...</span>
          </div>
        ) : userProfile ? (
          <div className="text-green-400 font-medium">
            ✅ {userProfile.full_name} ({userProfile.role})
          </div>
        ) : user ? (
          <div className="text-yellow-400">
            ⚠️ {user.email} (프로필 없음)
          </div>
        ) : (
          <span className="text-red-400">❌ Not logged in</span>
        )}
      </div>
      
      <div className="mt-2 space-y-1">
        <div className="text-xs space-y-1">
          <div>
            <span className="text-gray-400">User ID:</span> 
            <span className="text-cyan-400 ml-1">
              {user?.id ? `${user.id.slice(0, 8)}...` : 'null'}
            </span>
          </div>
          <div>
            <span className="text-gray-400">Email:</span> 
            <span className="text-blue-400 ml-1">
              {user?.email || 'null'}
            </span>
          </div>
          <div>
            <span className="text-gray-400">Role:</span> 
            <span className="text-orange-400 ml-1">
              {userProfile?.role || 'null'}
            </span>
          </div>
          <div>
            <span className="text-gray-400">Path:</span> 
            <span className="text-purple-400 ml-1">
              {currentPath || 'Loading...'}
            </span>
          </div>
        </div>
        
        <button 
          onClick={() => {
            clearAllCache();
            window.location.href = '/login';
          }}
          className="px-2 py-1 bg-yellow-500 text-white rounded text-xs hover:bg-yellow-600 w-full"
        >
          캐시 정리
        </button>
        <button 
          onClick={emergencyReset}
          className="px-2 py-1 bg-red-500 text-white rounded text-xs hover:bg-red-600 w-full"
        >
          긴급 리셋
        </button>
      </div>
    </div>
  );
}