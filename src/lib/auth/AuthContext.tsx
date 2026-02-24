'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { PermissionType } from '@/lib/services/permissions';
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
  is_super_admin?: boolean;
}

// AuthContext 타입
interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  permissions: PermissionType[];
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: any }>;
  signOut: () => Promise<void>;
  isAdmin: boolean;
  isCounselor: boolean;
  isSuperAdmin: boolean;
  hasPermission: (permission: PermissionType) => boolean;
  canAccessPage: (path: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// 페이지별 권한 매핑
const PAGE_PERMISSIONS: Record<string, PermissionType> = {
  '/admin/assignments': 'assignments',
  '/admin/consulting-monitor': 'consulting_monitor',
  '/admin/counselors': 'counselors',
  '/admin/dashboard': 'dashboard',
  '/admin/leads': 'leads',
  '/admin/upload': 'upload'
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [permissions, setPermissions] = useState<PermissionType[]>([]);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);
  
  // 🔧 새로 추가: 토큰 새로고침 방지 플래그
  const [isRefreshing, setIsRefreshing] = useState(false);

  // 권한 로드
  const loadPermissions = async (profile: UserProfile): Promise<PermissionType[]> => {
    try {
      if (profile.is_super_admin) {
        return [
          'assignments', 'consulting_monitor', 'counselors', 
          'dashboard', 'leads', 'settings', 'upload', 'phone_unmask'
        ];
      }

      if (profile.role === 'admin') {
        const { data, error } = await supabase
          .from('user_permissions')
          .select('permission_type')
          .eq('user_id', profile.id)
          .eq('is_active', true);

        if (error) {
          console.error('권한 조회 실패:', error);
          return ['dashboard'];
        }

        return data?.map(p => p.permission_type as PermissionType) || ['dashboard'];
      }

      return [];
    } catch (error) {
      console.error('권한 로드 오류:', error);
      return profile.role === 'admin' ? ['dashboard'] : [];
    }
  };

  // 사용자 데이터 로드 - 🔧 수정된 로직
  const loadUserData = async (userId: string, forceLoad = false) => {
    // 🔧 강제 로드가 아니고 이미 새로고침 중이면 무시
    if (!forceLoad && isRefreshing) {
      console.log('사용자 데이터 로딩 스킵 (새로고침 중)');
      return;
    }

    try {
      console.log('사용자 데이터 로딩:', userId);
      setLoading(true);

      const { data: profileData, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('프로필 로드 실패:', error);
        setLoading(false);
        return;
      }

      const userPermissions = await loadPermissions(profileData);

      setUserProfile(profileData);
      setPermissions(userPermissions);

      console.log('사용자 데이터 로딩 완료:', {
        email: profileData.email,
        role: profileData.role,
        permissions: userPermissions
      });

    } catch (error) {
      console.error('사용자 데이터 로드 오류:', error);
    } finally {
      setLoading(false);
    }
  };

  // 로그인
  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error || !data.session) return { error };

      // IP 접근 제한 확인 (최고관리자는 자동 통과)
      try {
        const ipResponse = await fetch('/api/auth/check-ip', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${data.session.access_token}` },
        });
        const ipResult = await ipResponse.json();
        if (!ipResult.allowed) {
          await supabase.auth.signOut();
          return { error: new Error(ipResult.error || 'IP 주소가 허용되지 않습니다.') };
        }
      } catch (ipCheckError) {
        // IP 확인 실패 시 로그인 허용 (서버 오류로 인한 잠금 방지)
        console.warn('IP 확인 실패, 로그인 허용:', ipCheckError);
      }

      return { error: null };
    } catch (error) {
      return { error };
    }
  };

  // 로그아웃 - 🔧 상태 초기화 개선
  const signOut = async () => {
    try {
      console.log('로그아웃 시작');
      
      // 🔧 상태 즉시 초기화 (UI 즉시 반영)
      setUser(null);
      setUserProfile(null);
      setPermissions([]);
      setLoading(false);
      setInitialized(false);
      setIsRefreshing(false);

      // Supabase 로그아웃
      await supabase.auth.signOut();
      
      // 🔧 브라우저 저장소 완전 정리
      if (typeof window !== 'undefined') {
        localStorage.clear();
        sessionStorage.clear();
        
        // 🔧 Supabase 관련 저장소도 정리
        Object.keys(localStorage).forEach(key => {
          if (key.startsWith('supabase') || key.startsWith('sb-')) {
            localStorage.removeItem(key);
          }
        });
      }
      
      console.log('로그아웃 완료');
    } catch (error) {
      console.error('로그아웃 오류:', error);
    }
  };

  // 🔧 개선: 단순화된 초기화 (한 번만 실행)
  useEffect(() => {
    if (initialized) return;

    const initAuth = async () => {
      console.log('Auth 초기화 시작');
      
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          console.log('기존 세션 발견:', session.user.email);
          setUser(session.user);
          await loadUserData(session.user.id, true); // 🔧 강제 로드
        } else {
          console.log('세션 없음 - 로그인 필요');
          setLoading(false);
        }
      } catch (error) {
        console.error('초기화 오류:', error);
        setLoading(false);
      } finally {
        setInitialized(true);
      }
    };

    initAuth();
  }, [initialized]);

  // 🔧 핵심 개선: 인증 이벤트 리스너 (토큰 새로고침 완전 차단)
  useEffect(() => {
    if (!initialized) return;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth 이벤트:', event, session?.user?.email);

        // 🔧 토큰 새로고침 이벤트 완전 무시
        if (event === 'TOKEN_REFRESHED') {
          console.log('토큰 새로고침 이벤트 무시');
          return;
        }

        // 🔧 로그아웃 처리
        if (event === 'SIGNED_OUT') {
          console.log('로그아웃 이벤트 처리');
          setUser(null);
          setUserProfile(null);
          setPermissions([]);
          setLoading(false);
          setIsRefreshing(false);
          return;
        }

        // 🔧 새 로그인만 처리 (기존 사용자는 무시)
        if (event === 'SIGNED_IN' && session?.user) {
          // 이미 같은 사용자가 로그인된 경우 무시
          if (user && user.id === session.user.id) {
            console.log('동일 사용자 재로그인 무시');
            return;
          }
          
          console.log('새 사용자 로그인:', session.user.email);
          setUser(session.user);
          setIsRefreshing(true); // 🔧 새로고침 플래그 설정
          
          try {
            await loadUserData(session.user.id);
          } finally {
            setIsRefreshing(false); // 🔧 새로고침 플래그 해제
          }
        }
      }
    );

    return () => {
      console.log('Auth 리스너 정리');
      subscription.unsubscribe();
    };
  }, [initialized, user?.id]); // 🔧 user.id 의존성 추가

  // 권한 확인 함수들
  const isAdmin = userProfile?.role === 'admin';
  const isCounselor = userProfile?.role === 'counselor';
  const isSuperAdmin = userProfile?.is_super_admin || false;

  const hasPermission = (permission: PermissionType): boolean => {
    if (!userProfile) return false;
    if (userProfile.is_super_admin) return true;
    return permissions.includes(permission);
  };

  const canAccessPage = (path: string): boolean => {
    if (!user || !userProfile || !userProfile.is_active) return false;
    if (userProfile.is_super_admin) return true;
    if (path === '/admin/settings') return false;
    if (path === '/admin/dashboard') return userProfile.role === 'admin';
    if (path.startsWith('/counselor/')) return userProfile.role === 'counselor';

    const requiredPermission = PAGE_PERMISSIONS[path];
    if (requiredPermission) {
      return hasPermission(requiredPermission);
    }

    return userProfile.role === 'admin';
  };

  return (
    <AuthContext.Provider value={{
      user,
      userProfile,
      permissions,
      loading,
      signIn,
      signOut,
      isAdmin,
      isCounselor,
      isSuperAdmin,
      hasPermission,
      canAccessPage,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth는 AuthProvider 내부에서 사용해야 합니다');
  }
  return context;
};

// AuthDebugInfo 컴포넌트 수정 - Hydration 오류 방지
export function AuthDebugInfo() {
  const { user, userProfile, loading } = useAuth();
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);
  
  // 개발 환경이 아니거나 마운트되지 않았으면 표시 안함
  if (process.env.NODE_ENV !== 'development' || !mounted) {
    return null;
  }
  
  return (
    <div className="fixed top-4 right-4 bg-black/90 text-white px-3 py-2 rounded-lg text-xs shadow-lg z-50">
      <div className="text-xs space-y-1">
        <div>Loading: {loading ? 'true' : 'false'}</div>
        <div>User: {user?.email || 'null'}</div>
        <div>Profile: {userProfile?.full_name || 'null'}</div>
        <div>Role: {userProfile?.role || 'null'}</div>
      </div>
    </div>
  );
}