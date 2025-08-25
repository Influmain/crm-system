// /hooks/usePermissions.ts
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { permissionService, PermissionType, systemSettingsService } from '@/lib/services/permissions';

// 권한 훅
export const usePermissions = () => {
  const { user, userProfile } = useAuth();
  const [permissions, setPermissions] = useState<PermissionType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadPermissions = async () => {
      if (!user || !userProfile) {
        setLoading(false);
        return;
      }

      try {
        const userPermissions = await permissionService.getUserPermissions(user.id);
        setPermissions(userPermissions);
      } catch (error) {
        console.error('권한 로드 실패:', error);
      } finally {
        setLoading(false);
      }
    };

    loadPermissions();
  }, [user, userProfile]);

  // 특정 권한 확인
  const hasPermission = (permission: PermissionType): boolean => {
    // 최고관리자는 모든 권한 보유
    if (userProfile?.is_super_admin) return true;
    return permissions.includes(permission);
  };

  // 페이지 접근 권한 확인
  const canAccessPage = (path: string): boolean => {
    // 최고관리자는 모든 페이지 접근 가능
    if (userProfile?.is_super_admin) return true;

    // 설정 페이지는 최고관리자만
    if (path === '/admin/settings') return false;

    // 대시보드는 모든 관리자 접근 가능
    if (path === '/admin/dashboard') return true;

    // 페이지별 권한 확인
    const permission = getPagePermission(path);
    return permission ? hasPermission(permission) : false;
  };

  // 페이지별 권한 매핑
  const getPagePermission = (path: string): PermissionType | null => {
    const pagePermissions: Record<string, PermissionType> = {
      '/admin/assignments': 'assignments',
      '/admin/consulting-monitor': 'consulting_monitor',
      '/admin/counselors': 'counselors',
      '/admin/leads': 'leads',
      '/admin/upload': 'upload'
    };

    return pagePermissions[path] || null;
  };

  return {
    permissions,
    loading,
    hasPermission,
    canAccessPage,
    isSuperAdmin: userProfile?.is_super_admin || false
  };
};

// 시스템 설정 훅
export const useSystemSettings = () => {
  const [settings, setSettings] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  // 설정 로드
  const loadSettings = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const allSettings = await systemSettingsService.getAllSettings();
      setSettings(allSettings);
    } catch (error) {
      console.error('설정 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, [user]);

  // 설정 업데이트
  const updateSetting = async (key: string, value: any): Promise<void> => {
    if (!user) return;

    try {
      await systemSettingsService.updateSetting(key, value, user.id);
      setSettings(prev => ({ ...prev, [key]: value }));
    } catch (error) {
      console.error('설정 업데이트 실패:', error);
      throw error;
    }
  };

  // 전화번호 마스킹 여부 확인
  const isPhoneMaskingEnabled = (): boolean => {
    return settings.phone_masking_enabled === true;
  };

  return {
    settings,
    loading,
    loadSettings,
    updateSetting,
    isPhoneMaskingEnabled
  };
};

// 전화번호 마스킹 유틸리티 훅
export const usePhoneMasking = () => {
  const { hasPermission } = usePermissions();
  const { isPhoneMaskingEnabled } = useSystemSettings();

  // 전화번호 마스킹 처리
  const maskPhone = (phone: string): string => {
    if (!phone) return '';
    
    // 마스킹이 비활성화되어 있거나 권한이 있으면 원본 반환
    if (!isPhoneMaskingEnabled() || hasPermission('phone_unmask')) {
      return phone;
    }

    // 010-1234-5678 -> 010-****-5678 형태로 마스킹
    const cleaned = phone.replace(/[^0-9]/g, '');
    if (cleaned.length >= 8) {
      return cleaned.replace(/(\d{3})(\d{4})(\d{4})/, '$1-****-$3');
    }
    
    // 길이가 짧으면 중간 부분 마스킹
    if (cleaned.length >= 7) {
      return cleaned.replace(/(\d{3})(\d+)(\d{2})/, '$1-***-$3');
    }
    
    return phone.replace(/\d/g, '*');
  };

  return {
    maskPhone,
    canSeeFullPhone: hasPermission('phone_unmask')
  };
};