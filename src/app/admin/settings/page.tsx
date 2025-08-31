// /pages/admin/settings/page.tsx
'use client';

import { useState, useEffect } from 'react';
import AdminLayout from '@/components/layout/AdminLayout';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { designSystem } from '@/lib/design-system';
import { businessIcons } from '@/lib/design-system/icons';
import { useToastHelpers } from '@/components/ui/Toast';
import { useAuth } from '@/lib/auth/AuthContext';
import { useSystemSettings } from '@/hooks/usePermissions';
import { 
  permissionService, 
  PermissionType, 
  PERMISSION_LABELS, 
  PERMISSION_DESCRIPTIONS,
  UserWithPermissions 
} from '@/lib/services/permissions';
import { supabase } from '@/lib/supabase';
import { 
  Shield, Users, Settings, Eye, EyeOff, Save, 
  RefreshCw, UserPlus, Edit2, Trash2, CheckCircle, XCircle,
  AlertTriangle
} from 'lucide-react';

function AdminSettingsContent() {
  const { user, userProfile } = useAuth();
  const toast = useToastHelpers();
  const { settings, updateSetting, loadSettings } = useSystemSettings();
  
  // 최고관리자 권한 검사
  if (!userProfile?.is_super_admin) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-96">
          <div className="max-w-md w-full text-center">
            <div className="w-24 h-24 bg-bg-tertiary rounded-full flex items-center justify-center mx-auto mb-6">
              <Shield className="w-12 h-12 text-text-tertiary" />
            </div>
            <h3 className="text-xl font-semibold text-text-primary mb-4">접근 권한이 없습니다</h3>
            <p className="text-text-secondary mb-6">
              시스템 설정은 최고관리자만 접근할 수 있습니다.
            </p>
            <div className="p-4 bg-bg-secondary rounded-lg">
              <p className="text-sm text-text-tertiary">
                현재 계정: {userProfile?.full_name || '알 수 없음'} ({userProfile?.role || '알 수 없음'})
              </p>
            </div>
          </div>
        </div>
      </AdminLayout>
    );
  }
  
  // 상태 관리
  const [users, setUsers] = useState<UserWithPermissions[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  
  // 권한 수정 모달 상태
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserWithPermissions | null>(null);
  const [selectedPermissions, setSelectedPermissions] = useState<PermissionType[]>([]);

  // 관리자 계정 생성 상태
  const [showCreateAdminForm, setShowCreateAdminForm] = useState(false);
  const [newAdminForm, setNewAdminForm] = useState({
    email: '',
    full_name: '',
    phone: '',
    department: '',
    password: ''
  });

  // 삭제 확인 모달 상태
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState<UserWithPermissions | null>(null);

  // 데이터 로드
  useEffect(() => {
    loadUsersWithPermissions();
  }, []);

  // 사용자 및 권한 데이터 로드
  const loadUsersWithPermissions = async () => {
    setLoading(true);
    try {
      const adminsWithPermissions = await permissionService.getAllAdminsWithPermissions();
      
      // 개발용 계정 필터링 (클라이언트에서 숨김)
      const filteredAdmins = adminsWithPermissions.filter(admin => 
        admin.email !== 'admin@company.com'
      );
      
      setUsers(filteredAdmins);
      
      toast.success('권한 정보 로드 완료', `${filteredAdmins.length}명의 관리자 권한을 불러왔습니다.`);
    } catch (error: any) {
      console.error('권한 데이터 로드 실패:', error);
      toast.error('데이터 로드 실패', error.message, {
        action: { label: '다시 시도', onClick: () => loadUsersWithPermissions() }
      });
    } finally {
      setLoading(false);
    }
  };

  // 관리자 계정 생성
  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || !userProfile?.is_super_admin) {
      toast.error('권한 오류', '최고관리자만 관리자 계정을 생성할 수 있습니다.');
      return;
    }

    if (!newAdminForm.email || !newAdminForm.full_name || !newAdminForm.password) {
      toast.warning('입력 오류', '필수 항목을 모두 입력해주세요.');
      return;
    }

    if (newAdminForm.password.length < 6) {
      toast.warning('비밀번호 오류', '비밀번호는 최소 6자리 이상이어야 합니다.');
      return;
    }

    setActionLoading(true);
    try {
      // 현재 사용자의 JWT 토큰 가져오기
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('세션이 만료되었습니다. 다시 로그인해주세요.');

      // API 호출로 관리자 계정 생성
      const response = await fetch('/api/admin/create-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          email: newAdminForm.email,
          password: newAdminForm.password,
          full_name: newAdminForm.full_name,
          phone: newAdminForm.phone,
          department: newAdminForm.department,
          role: 'admin',
          created_by: user.id
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || '계정 생성에 실패했습니다.');
      }

      toast.success(
        '관리자 계정 생성 완료',
        `${newAdminForm.full_name}님의 관리자 계정이 생성되었습니다.\n\n로그인 정보:\n이메일: ${newAdminForm.email}\n임시 비밀번호: ${newAdminForm.password}\n\n보안을 위해 첫 로그인 후 비밀번호 변경을 권장합니다.`,
        {
          action: {
            label: '권한 설정하기',
            onClick: () => {
              setShowCreateAdminForm(false);
              loadUsersWithPermissions();
            }
          },
          duration: 10000
        }
      );
      
      // 폼 초기화
      setNewAdminForm({ email: '', full_name: '', phone: '', department: '', password: '' });
      setShowCreateAdminForm(false);
      
      // 사용자 목록 새로고침
      await loadUsersWithPermissions();

    } catch (error: any) {
      console.error('관리자 계정 생성 실패:', error);
      
      let errorMessage = error.message || '관리자 계정 생성 중 오류가 발생했습니다.';
      
      // 일반적인 오류 메시지 개선
      if (errorMessage.includes('already registered') || errorMessage.includes('already exists')) {
        errorMessage = '이미 등록된 이메일입니다. 다른 이메일을 사용해주세요.';
      } else if (errorMessage.includes('invalid email')) {
        errorMessage = '유효하지 않은 이메일 형식입니다.';
      } else if (errorMessage.includes('weak password')) {
        errorMessage = '비밀번호가 너무 약합니다. 더 복잡한 비밀번호를 사용해주세요.';
      }
      
      toast.error('계정 생성 실패', errorMessage, {
        action: {
          label: '다시 시도',
          onClick: () => handleCreateAdmin(e)
        }
      });
    } finally {
      setActionLoading(false);
    }
  };

  // 관리자 삭제 확인 모달 열기
  const openDeleteModal = (userToDelete: UserWithPermissions) => {
    setUserToDelete(userToDelete);
    setShowDeleteModal(true);
  };

  // 관리자 계정 삭제
  const handleDeleteAdmin = async () => {
    if (!userToDelete || !user || !userProfile?.is_super_admin) {
      toast.error('권한 오류', '최고관리자만 관리자 계정을 삭제할 수 있습니다.');
      return;
    }

    // 자기 자신은 삭제 불가
    if (userToDelete.id === user.id) {
      toast.error('삭제 불가', '자기 자신의 계정은 삭제할 수 없습니다.');
      return;
    }

    // 운영용 최고관리자는 삭제 불가 (개발용은 삭제 가능)
    if (userToDelete.is_super_admin && userToDelete.email !== 'admin@company.com') {
      toast.error('삭제 불가', '운영용 최고관리자 계정은 삭제할 수 없습니다.');
      return;
    }

    setActionLoading(true);
    try {
      // 1. 관련 데이터 확인 (삭제 전 경고)
      const { data: assignments } = await supabase
        .from('lead_assignments')
        .select('id')
        .eq('counselor_id', userToDelete.id)
        .eq('status', 'active');

      if (assignments && assignments.length > 0) {
        toast.warning(
          '활성 배정 존재',
          `${userToDelete.full_name}님에게 ${assignments.length}개의 활성 리드가 배정되어 있습니다. 정말 삭제하시겠습니까?`
        );
      }

      // 2. 권한 먼저 삭제
      const { error: permError } = await supabase
        .from('user_permissions')
        .delete()
        .eq('user_id', userToDelete.id);

      if (permError) throw permError;

      // 3. public.users에서 삭제
      const { error: userError } = await supabase
        .from('users')
        .delete()
        .eq('id', userToDelete.id);

      if (userError) throw userError;

      // 4. auth.users에서도 삭제 (관리자 API 필요)
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        try {
          const response = await fetch('/api/admin/delete-user', {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session.access_token}`
            },
            body: JSON.stringify({
              user_id: userToDelete.id,
              deleted_by: user.id
            })
          });

          if (!response.ok) {
            console.warn('auth.users 삭제 실패 (일부만 삭제됨)');
          }
        } catch (authError) {
          console.warn('auth.users 삭제 API 호출 실패:', authError);
        }
      }

      toast.success(
        '관리자 삭제 완료',
        `${userToDelete.full_name}님의 계정이 삭제되었습니다.`
      );

      setShowDeleteModal(false);
      setUserToDelete(null);
      await loadUsersWithPermissions();

    } catch (error: any) {
      console.error('관리자 삭제 실패:', error);
      toast.error('삭제 실패', error.message, {
        action: { label: '다시 시도', onClick: () => handleDeleteAdmin() }
      });
    } finally {
      setActionLoading(false);
    }
  };

  // 권한 수정 모달 열기
  const openPermissionModal = (selectedUser: UserWithPermissions) => {
    setSelectedUser(selectedUser);
    setSelectedPermissions(selectedUser.permissions);
    setShowPermissionModal(true);
  };

  // 권한 토글
  const togglePermission = (permission: PermissionType) => {
    setSelectedPermissions(prev => 
      prev.includes(permission)
        ? prev.filter(p => p !== permission)
        : [...prev, permission]
    );
  };

  // 권한 수정 저장
  const savePermissions = async () => {
    if (!selectedUser || !user) return;

    setActionLoading(true);
    try {
      await permissionService.bulkUpdatePermissions(
        selectedUser.id,
        selectedPermissions,
        user.id
      );

      toast.success(
        '권한 수정 완료',
        `${selectedUser.full_name}님의 권한이 업데이트되었습니다.`,
        {
          action: { label: '목록 새로고침', onClick: () => loadUsersWithPermissions() }
        }
      );

      setShowPermissionModal(false);
      setSelectedUser(null);
      await loadUsersWithPermissions();

    } catch (error: any) {
      console.error('권한 수정 실패:', error);
      toast.error('권한 수정 실패', error.message, {
        action: { label: '다시 시도', onClick: () => savePermissions() }
      });
    } finally {
      setActionLoading(false);
    }
  };

  // 권한 배지 렌더링
  const renderPermissionBadge = (permission: PermissionType) => (
    <span
      key={permission}
      className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-accent/10 text-accent border border-accent/20"
    >
      {PERMISSION_LABELS[permission]}
    </span>
  );

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-accent" />
            <p className={designSystem.components.typography.body}>권한 설정을 불러오는 중...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="mb-8">
        <h1 className={designSystem.components.typography.h2}>시스템 설정</h1>
        <p className={designSystem.components.typography.bodySm}>
          관리자 권한 및 시스템 설정을 관리합니다.
        </p>
      </div>

      {/* 시스템 정보 섹션 */}
      <div className={designSystem.utils.cn(designSystem.components.card.base, "p-6 mb-8")}>
        <div className="flex items-center gap-3 mb-6">
          <Settings className="w-5 h-5 text-accent" />
          <h3 className={designSystem.components.typography.h4}>시스템 정보</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-bg-secondary rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <EyeOff className="w-4 h-4 text-text-secondary" />
              <h4 className="font-medium text-text-primary">전화번호 보안</h4>
            </div>
            <p className="text-sm text-text-secondary">
              모든 전화번호는 기본적으로 마스킹 처리됩니다. (010-****-5678)
            </p>
            <p className="text-xs text-text-tertiary mt-2">
              '전화번호 마스킹 해제' 권한이 있는 관리자만 원본 번호를 볼 수 있습니다.
            </p>
          </div>
          
          <div className="p-4 bg-bg-secondary rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <Shield className="w-4 h-4 text-text-secondary" />
              <h4 className="font-medium text-text-primary">권한 기반 접근</h4>
            </div>
            <p className="text-sm text-text-secondary">
              각 관리 기능은 개별 권한으로 제어됩니다.
            </p>
            <p className="text-xs text-text-tertiary mt-2">
              최고관리자는 모든 권한을 자동으로 보유합니다.
            </p>
          </div>
        </div>
      </div>

      {/* 관리자 계정 생성 섹션 */}
      <div className={designSystem.utils.cn(designSystem.components.card.base, "p-6 mb-8")}>
        <div className="flex items-center gap-3 mb-6">
          <UserPlus className="w-5 h-5 text-accent" />
          <h3 className={designSystem.components.typography.h4}>관리자 계정 생성</h3>
          <span className="text-sm text-text-secondary">(최고관리자만)</span>
        </div>
        
        {!showCreateAdminForm ? (
          <button
            onClick={() => setShowCreateAdminForm(true)}
            className={designSystem.components.button.primary}
          >
            <UserPlus className="w-4 h-4 mr-2" />
            새 관리자 계정 생성
          </button>
        ) : (
          <form onSubmit={handleCreateAdmin} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-text-primary">이메일 *</label>
                <input
                  type="email"
                  value={newAdminForm.email}
                  onChange={(e) => setNewAdminForm(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full px-3 py-2 border border-border-primary rounded-lg bg-bg-primary text-text-primary focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
                  placeholder="manager@crm.com"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2 text-text-primary">이름 *</label>
                <input
                  type="text"
                  value={newAdminForm.full_name}
                  onChange={(e) => setNewAdminForm(prev => ({ ...prev, full_name: e.target.value }))}
                  className="w-full px-3 py-2 border border-border-primary rounded-lg bg-bg-primary text-text-primary focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
                  placeholder="김매니저"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2 text-text-primary">전화번호</label>
                <input
                  type="tel"
                  value={newAdminForm.phone}
                  onChange={(e) => setNewAdminForm(prev => ({ ...prev, phone: e.target.value }))}
                  className="w-full px-3 py-2 border border-border-primary rounded-lg bg-bg-primary text-text-primary focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
                  placeholder="010-1234-5678"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2 text-text-primary">부서</label>
                <input
                  type="text"
                  value={newAdminForm.department}
                  onChange={(e) => setNewAdminForm(prev => ({ ...prev, department: e.target.value }))}
                  className="w-full px-3 py-2 border border-border-primary rounded-lg bg-bg-primary text-text-primary focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
                  placeholder="관리팀"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2 text-text-primary">임시 비밀번호 *</label>
                <input
                  type="password"
                  value={newAdminForm.password}
                  onChange={(e) => setNewAdminForm(prev => ({ ...prev, password: e.target.value }))}
                  className="w-full px-3 py-2 border border-border-primary rounded-lg bg-bg-primary text-text-primary focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
                  placeholder="최소 6자리"
                  required
                  minLength={6}
                />
              </div>
            </div>
            
            <div className="p-3 bg-accent-light rounded-lg">
              <p className="text-sm text-text-secondary">
                새로 생성된 관리자 계정은 기본적으로 권한이 없습니다. 
                계정 생성 후 아래 권한 관리에서 필요한 권한을 부여해주세요.
              </p>
            </div>
            
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={actionLoading}
                className={designSystem.components.button.primary}
              >
                {actionLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <UserPlus className="w-4 h-4 mr-2" />
                )}
                계정 생성
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowCreateAdminForm(false);
                  setNewAdminForm({ email: '', full_name: '', phone: '', department: '', password: '' });
                }}
                className={designSystem.components.button.secondary}
              >
                취소
              </button>
            </div>
          </form>
        )}
      </div>

      {/* 관리자 권한 관리 섹션 */}
      <div className={designSystem.utils.cn(designSystem.components.card.base, "p-6")}>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Shield className="w-5 h-5 text-accent" />
            <h3 className={designSystem.components.typography.h4}>관리자 권한 관리</h3>
          </div>
          
          <button
            onClick={() => {
              loadUsersWithPermissions();
              toast.info('새로고침', '권한 정보가 업데이트되었습니다.');
            }}
            disabled={loading}
            className={designSystem.components.button.secondary}
          >
            <RefreshCw className={designSystem.utils.cn("w-4 h-4 mr-2", loading && "animate-spin")} />
            새로고침
          </button>
        </div>

        {/* 관리자 목록 */}
        <div className="space-y-4">
          {users.map((admin) => (
            <div
              key={admin.id}
              className="flex items-center justify-between p-4 bg-bg-secondary rounded-lg border border-border-primary"
            >
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-text-secondary" />
                    <span className="font-medium text-text-primary">{admin.full_name}</span>
                    {admin.is_super_admin && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-accent text-bg-primary font-medium">
                        최고관리자
                      </span>
                    )}
                  </div>
                </div>
                
                <p className="text-sm text-text-secondary mb-3">{admin.email}</p>
                
                <div className="flex flex-wrap gap-2">
                  {admin.is_super_admin ? (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-accent/20 text-accent">
                      모든 권한 보유
                    </span>
                  ) : admin.permissions.length > 0 ? (
                    admin.permissions.map(renderPermissionBadge)
                  ) : (
                    <span className="text-sm text-text-tertiary">권한 없음</span>
                  )}
                </div>
              </div>
              
              <div className="flex gap-2 ml-4">
                {!admin.is_super_admin && admin.id !== user?.id && (
                  <>
                    <button
                      onClick={() => openPermissionModal(admin)}
                      className={designSystem.components.button.secondary}
                    >
                      <Edit2 className="w-4 h-4 mr-2" />
                      권한 수정
                    </button>
                    
                    <button
                      onClick={() => openDeleteModal(admin)}
                      className="px-3 py-2 bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100 transition-colors flex items-center gap-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      삭제
                    </button>
                  </>
                )}
                
                {admin.id === user?.id && (
                  <span className="text-sm text-text-tertiary px-4 py-2">
                    본인 계정
                  </span>
                )}
                
                {admin.is_super_admin && admin.id !== user?.id && (
                  <span className="text-sm text-text-tertiary px-4 py-2">
                    최고관리자 (삭제 불가)
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        {users.length === 0 && (
          <div className="text-center py-12">
            <Users className="w-16 h-16 text-text-tertiary mx-auto mb-4" />
            <h3 className="text-lg font-medium text-text-primary mb-2">
              관리자가 없습니다
            </h3>
            <p className="text-text-secondary">
              시스템에 등록된 관리자를 찾을 수 없습니다.
            </p>
          </div>
        )}
      </div>

      {/* 삭제 확인 모달 */}
      {showDeleteModal && userToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-bg-primary border border-border-primary rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-medium text-text-primary">관리자 삭제</h3>
                <p className="text-sm text-text-secondary">이 작업은 되돌릴 수 없습니다.</p>
              </div>
            </div>
            
            <div className="mb-6">
              <p className="text-text-primary mb-2">
                <strong>{userToDelete.full_name}</strong>님의 계정을 삭제하시겠습니까?
              </p>
              <p className="text-sm text-text-secondary">
                이메일: {userToDelete.email}
              </p>
              
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5" />
                  <div>
                    <p className="text-sm text-yellow-800 font-medium">삭제 시 영향</p>
                    <ul className="text-xs text-yellow-700 mt-1 space-y-1">
                      <li>• 해당 관리자가 생성한 데이터는 유지됩니다</li>
                      <li>• 배정된 리드는 미배정 상태로 변경됩니다</li>
                      <li>• 로그인이 불가능해집니다</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={handleDeleteAdmin}
                disabled={actionLoading}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {actionLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                삭제
              </button>
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setUserToDelete(null);
                }}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 권한 수정 모달 */}
      {showPermissionModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-bg-primary border border-border-primary rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-medium text-text-primary">
                {selectedUser.full_name}님의 권한 설정
              </h3>
              <button
                onClick={() => setShowPermissionModal(false)}
                className="text-text-secondary hover:text-text-primary"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              {(Object.keys(PERMISSION_LABELS) as PermissionType[]).map((permission) => (
                <div
                  key={permission}
                  className="flex items-start justify-between p-4 bg-bg-secondary rounded-lg border border-border-primary"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <h4 className="font-medium text-text-primary">
                        {PERMISSION_LABELS[permission]}
                      </h4>
                    </div>
                    <p className="text-sm text-text-secondary">
                      {PERMISSION_DESCRIPTIONS[permission]}
                    </p>
                  </div>
                  
                  <button
                    onClick={() => togglePermission(permission)}
                    className={designSystem.utils.cn(
                      'ml-4 p-2 rounded-lg transition-colors',
                      selectedPermissions.includes(permission)
                        ? 'bg-accent text-bg-primary'
                        : 'bg-bg-tertiary text-text-secondary hover:bg-bg-hover'
                    )}
                  >
                    {selectedPermissions.includes(permission) ? (
                      <CheckCircle className="w-4 h-4" />
                    ) : (
                      <XCircle className="w-4 h-4" />
                    )}
                  </button>
                </div>
              ))}
            </div>
            
            <div className="flex gap-3 pt-6 mt-6 border-t border-border-primary">
              <button
                onClick={savePermissions}
                disabled={actionLoading}
                className={designSystem.components.button.primary}
              >
                {actionLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                저장
              </button>
              <button
                onClick={() => setShowPermissionModal(false)}
                className={designSystem.components.button.secondary}
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

// 최고관리자만 접근 가능 - 임시로 일반 관리자 권한으로 설정
export default function AdminSettingsPage() {
  return (
    <ProtectedRoute requiredPermission="settings">
      <AdminSettingsContent />
    </ProtectedRoute>
  );
}