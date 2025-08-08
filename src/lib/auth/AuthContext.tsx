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
  const router = useRouter();

  // 사용자 프로필 로드 함수
  const loadUserProfile = async (userId: string) => {
    try {
      console.log('프로필 로드 시도:', userId);
      
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('프로필 로드 오류:', error);
        setUserProfile(null);
        return;
      }

      console.log('프로필 로드 성공:', data);
      setUserProfile(data);
    } catch (error) {
      console.error('프로필 로드 예외:', error);
      setUserProfile(null);
    }
  };

  // 로그인 함수
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
      return { error: null };
    } catch (error) {
      console.error('로그인 예외:', error);
      return { error };
    }
  };

  // ✅ 슈퍼 강력한 로그아웃 함수
  const signOut = async () => {
    console.log('🚀 슈퍼 로그아웃 프로세스 시작');
    
    // 1. 즉시 로딩 상태 변경 및 상태 초기화
    setLoading(true);
    setUser(null);
    setUserProfile(null);
    
    try {
      // 2. 모든 Supabase 세션 강제 종료 (여러 방법 시도)
      console.log('🔐 Supabase 다중 로그아웃 시도');
      
      // 방법 1: 로컬 세션만 종료
      try {
        await supabase.auth.signOut({ scope: 'local' });
        console.log('✅ 로컬 세션 종료 성공');
      } catch (e) {
        console.warn('⚠️ 로컬 세션 종료 실패:', e);
      }
      
      // 방법 2: 전체 세션 종료
      try {
        await supabase.auth.signOut({ scope: 'global' });
        console.log('✅ 전체 세션 종료 성공');
      } catch (e) {
        console.warn('⚠️ 전체 세션 종료 실패:', e);
      }
      
      // 방법 3: 세션 강제 무효화
      try {
        await supabase.auth.refreshSession({ refresh_token: null });
        console.log('✅ 세션 강제 무효화 성공');
      } catch (e) {
        console.warn('⚠️ 세션 무효화 실패:', e);
      }
      
    } catch (error) {
      console.warn('⚠️ Supabase 로그아웃 전체 실패:', error);
    }
    
    // 3. 브라우저 저장소 완전 정리 (더 강력한 버전)
    try {
      console.log('🗑️ 브라우저 저장소 완전 정리');
      
      // LocalStorage 모든 키 확인 후 정리
      const allKeys = Object.keys(localStorage);
      allKeys.forEach(key => {
        if (key.includes('supabase') || 
            key.includes('auth') || 
            key.includes('session') ||
            key.includes('token') ||
            key.includes('user')) {
          console.log(`🗑️ 삭제할 키: ${key}`);
          localStorage.removeItem(key);
        }
      });
      
      // SessionStorage 완전 정리
      sessionStorage.clear();
      
      // IndexedDB 정리 시도
      try {
        const databases = await indexedDB.databases();
        databases.forEach(db => {
          if (db.name && (db.name.includes('supabase') || db.name.includes('auth'))) {
            indexedDB.deleteDatabase(db.name);
            console.log(`🗑️ IndexedDB 삭제: ${db.name}`);
          }
        });
      } catch (idbError) {
        console.warn('⚠️ IndexedDB 정리 실패:', idbError);
      }
      
      // 모든 쿠키 강제 삭제
      document.cookie.split(";").forEach(cookie => {
        const eqPos = cookie.indexOf("=");
        const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
        
        // 다양한 도메인/경로로 쿠키 삭제
        const deleteCookie = (domain = '', path = '/') => {
          document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=${path};domain=${domain}`;
        };
        
        deleteCookie(); // 기본
        deleteCookie('', '/'); // 루트 경로
        deleteCookie(window.location.hostname, '/'); // 현재 도메인
        deleteCookie('localhost', '/'); // localhost
        
        console.log(`🗑️ 쿠키 삭제 시도: ${name}`);
      });
      
      console.log('✅ 저장소 완전 정리 완료');
      
    } catch (storageError) {
      console.error('❌ 저장소 정리 중 오류:', storageError);
    }
    
    // 4. React 상태 완전 초기화
    console.log('🔄 React 상태 완전 초기화');
    setUser(null);
    setUserProfile(null);
    setLoading(false);
    
    // 5. 페이지 완전 새로고침으로 리다이렉트 (가장 확실한 방법)
    console.log('🔄 페이지 완전 새로고침으로 로그인 페이지 이동');
    
    setTimeout(() => {
      // window.location.replace는 뒤로 가기 방지
      window.location.replace('/login');
    }, 300);
    
    console.log('🎉 슈퍼 로그아웃 프로세스 완료');
  };

  // 인증 상태 변화 감지
  useEffect(() => {
    // 초기 세션 확인
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('초기 세션 확인:', session?.user?.email || '세션 없음');
      
      setUser(session?.user ?? null);
      
      if (session?.user) {
        loadUserProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // 인증 상태 변화 리스너
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('인증 상태 변화:', event, session?.user?.email || '세션 없음');
        
        // ✅ 로그아웃 이벤트 처리 강화
        if (event === 'SIGNED_OUT') {
          console.log('🚪 로그아웃 이벤트 감지 - 상태 완전 초기화');
          setUser(null);
          setUserProfile(null);
          setLoading(false);
          
          // 추가 정리 작업
          setTimeout(() => {
            if (window.location.pathname !== '/login') {
              window.location.replace('/login');
            }
          }, 100);
          return;
        }
        
        setUser(session?.user ?? null);
        
        if (session?.user) {
          await loadUserProfile(session.user.id);
        } else {
          setUserProfile(null);
        }
        
        setLoading(false);
      }
    );

    return () => {
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
  const { user, userProfile, loading, signOut } = useAuth();
  
  if (process.env.NODE_ENV !== 'development') return null;
  
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
              {userProfile.role} • {userProfile.department}
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
          {userProfile && (
            <div>
              <span className="text-gray-400">Active:</span> 
              <span className={`text-xs ml-1 ${userProfile.is_active ? 'text-green-400' : 'text-red-400'}`}>
                {userProfile.is_active ? 'Yes' : 'No'}
              </span>
            </div>
          )}
          
          {/* 개발 환경용 완전 초기화 버튼 */}
          <div className="pt-2 border-t border-gray-600">
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