'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';

// 사용자 프로필 타입
interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  phone?: string;
  department?: string;
  role: 'admin' | 'counselor';
  is_active: boolean;
}

// AuthContext 타입
interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: any }>;
  signOut: () => Promise<void>;
  isAdmin: boolean;
  isCounselor: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// 캐시 정리 함수
const clearCache = () => {
  try {
    localStorage.clear();
    sessionStorage.clear();
    console.log('캐시 정리 완료');
  } catch (error) {
    console.log('캐시 정리 실패:', error);
  }
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // 프로필 로드 (단순화)
  const loadUserProfile = async (userId: string) => {
    try {
      console.log('프로필 로드:', userId);
      
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('프로필 로드 실패:', error);
        return null;
      }

      console.log('프로필 로드 성공:', data.email);
      return data;
      
    } catch (error) {
      console.error('프로필 로드 오류:', error);
      return null;
    }
  };

  // 로그인
  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setLoading(false);
        return { error };
      }

      console.log('로그인 성공:', data.user?.email);
      return { error: null };
      
    } catch (error) {
      console.error('로그인 오류:', error);
      setLoading(false);
      return { error };
    }
  };

  // 로그아웃 (캐시 정리 포함)
  const signOut = async () => {
    try {
      setLoading(true);
      
      // Supabase 로그아웃
      await supabase.auth.signOut();
      
      // 캐시 정리
      clearCache();
      
      // 상태 초기화
      setUser(null);
      setUserProfile(null);
      
      console.log('로그아웃 완료');
      
      // 로그인 페이지로 이동
      window.location.href = '/login';
      
    } catch (error) {
      console.error('로그아웃 오류:', error);
      // 오류가 있어도 캐시는 정리하고 로그인 페이지로
      clearCache();
      setUser(null);
      setUserProfile(null);
      window.location.href = '/login';
    }
  };

  // 🔧 핵심 수정: 초기 세션 로드 추가
  useEffect(() => {
    let mounted = true;
    
    const initializeAuth = async () => {
      try {
        console.log('🚀 인증 초기화 시작');
        
        // 기존 세션 확인
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (!mounted) return;
        
        if (error) {
          console.error('세션 로드 오류:', error);
          setLoading(false);
          return;
        }

        if (session?.user) {
          console.log('✅ 기존 세션 발견:', session.user.email);
          setUser(session.user);
          
          // 프로필 로드
          const profile = await loadUserProfile(session.user.id);
          if (mounted) {
            setUserProfile(profile);
          }
        } else {
          console.log('❌ 세션 없음 - 로그인 필요');
        }
        
        if (mounted) {
          setLoading(false);
          console.log('🏁 인증 초기화 완료');
        }
        
      } catch (error) {
        console.error('인증 초기화 오류:', error);
        if (mounted) {
          setLoading(false);
        }
      }
    };

    initializeAuth();
    
    return () => {
      mounted = false;
    };
  }, []); // 빈 의존성 배열 - 최초 1회만 실행

  // 인증 상태 리스너 (기존 유지)
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('인증 상태 변경:', event, session?.user?.email);
        
        if (event === 'SIGNED_OUT') {
          setUser(null);
          setUserProfile(null);
          setLoading(false);
          return;
        }
        
        if (event === 'SIGNED_IN' && session?.user) {
          setUser(session.user);
          
          // 프로필 로드
          const profile = await loadUserProfile(session.user.id);
          setUserProfile(profile);
          
          // 리다이렉트 (로그인 완료 후만)
          const currentPath = window.location.pathname;
          if (currentPath === '/login' || currentPath === '/') {
            if (profile?.role === 'admin') {
              window.location.href = '/admin/dashboard';
            } else if (profile?.role === 'counselor') {
              window.location.href = '/counselor/dashboard';
            }
          }
          
          setLoading(false);
        } else if (event === 'TOKEN_REFRESHED' && session?.user) {
          // 토큰 갱신 시에는 리다이렉트 하지 않음
          setUser(session.user);
          
          if (!userProfile) {
            const profile = await loadUserProfile(session.user.id);
            setUserProfile(profile);
          }
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [userProfile]); // userProfile 의존성 추가

  // 🔧 안전장치: 5초 후 강제 로딩 해제
  useEffect(() => {
    const forceStopLoading = setTimeout(() => {
      if (loading) {
        console.log('⚠️ 5초 초과 - 강제 로딩 해제');
        setLoading(false);
      }
    }, 5000);

    return () => clearTimeout(forceStopLoading);
  }, [loading]);

  // 권한 확인
  const isAdmin = userProfile?.role === 'admin';
  const isCounselor = userProfile?.role === 'counselor';

  const value = {
    user,
    userProfile,
    loading,
    signIn,
    signOut,
    isAdmin,
    isCounselor,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth는 AuthProvider 내부에서 사용해야 합니다');
  }
  return context;
};

// AuthDebugInfo 컴포넌트 (Hydration 오류 방지)
export function AuthDebugInfo() {
  const { user, userProfile, loading } = useAuth();
  const [mounted, setMounted] = useState(false);
  
  // 클라이언트에서만 렌더링
  useEffect(() => {
    setMounted(true);
  }, []);
  
  if (!mounted) {
    return null;
  }
  
  // 개발 환경에서만 표시
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }
  
  return (
    <div className="fixed top-4 right-4 bg-black/90 text-white px-3 py-2 rounded-lg text-xs shadow-lg z-50">
      <div className="text-xs space-y-1">
        <div>Loading: {loading ? 'Yes' : 'No'}</div>
        <div>Email: {user?.email || 'None'}</div>
        <div>Role: {userProfile?.role || 'None'}</div>
        <div>Time: {new Date().toLocaleTimeString()}</div>
      </div>
    </div>
  );
}