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
  } catch (error) {
    console.log('캐시 정리 실패:', error);
  }
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [authProcessing, setAuthProcessing] = useState(false);

  // 🔧 단순화된 프로필 로드 (재시도 로직 제거)
  const loadUserProfile = async (userId: string): Promise<UserProfile | null> => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error || !data) {
        console.error('프로필 로드 실패:', error);
        return null;
      }

      console.log('✅ 프로필 로드 성공:', data.email, 'role:', data.role);
      return data;
      
    } catch (error) {
      console.error('프로필 로드 오류:', error);
      return null;
    }
  };

  // 로그인
  const signIn = async (email: string, password: string) => {
    try {
      setAuthProcessing(true);
      console.log('로그인 시작:', email);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setAuthProcessing(false); // 🔧 오류 시 즉시 해제
        return { error };
      }

      console.log('로그인 성공:', data.user?.email);
      // 🔧 authProcessing은 onAuthStateChange에서 해제
      return { error: null };
      
    } catch (error) {
      console.error('로그인 오류:', error);
      setAuthProcessing(false); // 🔧 예외 시 즉시 해제
      return { error };
    }
  };

  // 로그아웃 (타임아웃과 강제 처리 추가)
  const signOut = async () => {
    try {
      console.log('로그아웃 시작');
      setAuthProcessing(true);
      
      // 타임아웃을 설정해서 3초 이내에 완료되지 않으면 강제 진행
      const signOutPromise = supabase.auth.signOut();
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('로그아웃 타임아웃')), 3000)
      );
      
      try {
        await Promise.race([signOutPromise, timeoutPromise]);
        console.log('Supabase 로그아웃 완료');
      } catch (error) {
        console.warn('Supabase 로그아웃 시간 초과 또는 오류:', error);
        // 오류가 있어도 계속 진행
      }
      
      clearCache();
      console.log('캐시 정리 완료');
      
      setUser(null);
      setUserProfile(null);
      console.log('상태 초기화 완료');
      
      console.log('로그아웃 완료');
      
    } catch (error) {
      console.error('로그아웃 오류:', error);
      // 오류가 있어도 강제로 상태 초기화
      clearCache();
      setUser(null);
      setUserProfile(null);
      console.log('오류 발생으로 강제 상태 초기화 완료');
    } finally {
      setAuthProcessing(false);
      console.log('로그아웃 처리 종료');
    }
  };

  // 🔧 단일 useEffect로 통합 - 초기 세션 로드
  useEffect(() => {
    let mounted = true;
    
    const initializeAuth = async () => {
      try {
        console.log('🚀 인증 초기화 시작');
        
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
          
          // 프로필 로드 (단순화)
          const profile = await loadUserProfile(session.user.id);
          if (mounted) {
            if (profile) {
              setUserProfile(profile);
              console.log('✅ 프로필 설정 완료:', profile.role);
            } else {
              console.error('❌ 프로필 로드 실패 - 로그아웃 처리');
              await supabase.auth.signOut();
              setUser(null);
              setUserProfile(null);
            }
          }
        } else {
          console.log('❌ 세션 없음');
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
  }, []);

  // 🔧 개선된 인증 상태 리스너 (authProcessing 로직 수정)
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('인증 상태 변경:', event, session?.user?.email);
        
        // 🔧 authProcessing이 있어도 로그인 성공은 처리
        if (authProcessing && event !== 'SIGNED_IN') {
          console.log('인증 처리 중 - 상태 변경 무시 (로그인 제외)');
          return;
        }
        
        if (event === 'SIGNED_OUT') {
          console.log('🚪 로그아웃 이벤트 감지 - 상태 초기화');
          setUser(null);
          setUserProfile(null);
          setAuthProcessing(false);
          console.log('✅ 로그아웃 상태 초기화 완료');
          return;
        }
        
        if (event === 'SIGNED_IN' && session?.user) {
          console.log('🔄 로그인 상태 업데이트 시작');
          setUser(session.user);
          
          // 프로필 로드
          const profile = await loadUserProfile(session.user.id);
          if (profile) {
            setUserProfile(profile);
            console.log('✅ 로그인 완료:', profile.role);
          } else {
            console.warn('❌ 로그인 후 프로필 로드 실패');
            await supabase.auth.signOut();
          }
          
          setAuthProcessing(false); // 🔧 로그인 완료 후 authProcessing 해제
        }
        
        if (event === 'TOKEN_REFRESHED' && session?.user) {
          setUser(session.user);
          
          // 프로필이 없으면 다시 로드
          if (!userProfile) {
            const profile = await loadUserProfile(session.user.id);
            if (profile) {
              setUserProfile(profile);
            }
          }
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [userProfile]);

  // 🔧 단순화된 타임아웃 (5초로 단축)
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (loading) {
        console.log('⚠️ 5초 초과 - 강제 로딩 해제');
        setLoading(false);
      }
    }, 5000);

    return () => clearTimeout(timeout);
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

// 🔧 Hydration 오류 방지 디버그 컴포넌트
export function AuthDebugInfo() {
  const { user, userProfile, loading } = useAuth();
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);
  
  if (!mounted) {
    return null;
  }
  
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