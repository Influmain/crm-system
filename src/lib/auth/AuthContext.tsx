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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // 프로필 로드 (단순화)
  const loadUserProfile = async (userId: string): Promise<UserProfile | null> => {
    try {
      console.log('프로필 로드 시작:', userId);
      
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('프로필 로드 실패:', error);
        return null;
      }

      console.log('프로필 로드 성공:', data.email, 'role:', data.role);
      return data;
      
    } catch (error) {
      console.error('프로필 로드 오류:', error);
      return null;
    }
  };

  // 로그인
  const signIn = async (email: string, password: string) => {
    try {
      console.log('로그인 시작:', email);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('로그인 실패:', error);
        return { error };
      }

      console.log('로그인 성공:', data.user?.email);
      return { error: null };
      
    } catch (error) {
      console.error('로그인 오류:', error);
      return { error };
    }
  };

  // 로그아웃
  const signOut = async () => {
    try {
      console.log('로그아웃 시작');
      
      await supabase.auth.signOut();
      
      // 상태 초기화
      setUser(null);
      setUserProfile(null);
      
      // 캐시 정리
      try {
        localStorage.clear();
        sessionStorage.clear();
      } catch (error) {
        console.log('캐시 정리 실패:', error);
      }
      
      console.log('로그아웃 완료');
      
    } catch (error) {
      console.error('로그아웃 오류:', error);
      // 오류가 있어도 강제로 상태 초기화
      setUser(null);
      setUserProfile(null);
    }
  };

  // 초기 세션 로드
  useEffect(() => {
    let mounted = true;
    
    const initializeAuth = async () => {
      try {
        console.log('인증 초기화 시작');
        
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (!mounted) return;
        
        if (error) {
          console.error('세션 로드 오류:', error);
          setLoading(false);
          return;
        }

        if (session?.user) {
          console.log('기존 세션 발견:', session.user.email);
          setUser(session.user);
          
          const profile = await loadUserProfile(session.user.id);
          if (mounted && profile) {
            setUserProfile(profile);
          }
        }
        
        if (mounted) {
          setLoading(false);
          console.log('인증 초기화 완료');
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

  // 인증 상태 변경 감지 (단순화)
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('인증 상태 변경:', event, session?.user?.email);
        
        if (event === 'SIGNED_OUT') {
          console.log('로그아웃 이벤트');
          setUser(null);
          setUserProfile(null);
          return;
        }
        
        if (event === 'SIGNED_IN' && session?.user) {
          console.log('로그인 이벤트');
          setUser(session.user);
          
          const profile = await loadUserProfile(session.user.id);
          if (profile) {
            setUserProfile(profile);
          }
        }
        
        if (event === 'TOKEN_REFRESHED' && session?.user) {
          console.log('토큰 갱신');
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

// 디버그 컴포넌트 (개발 환경에서만)
export function AuthDebugInfo() {
  const { user, userProfile, loading } = useAuth();
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);
  
  if (!mounted || process.env.NODE_ENV !== 'development') {
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