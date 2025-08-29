'use client';

import { useState, useEffect } from 'react';
import AdminLayout from '@/components/layout/AdminLayout';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { designSystem } from '@/lib/design-system';
import { businessIcons } from '@/lib/design-system/icons';
import { supabase } from '@/lib/supabase';
import SmartTable from '@/components/ui/SmartTable';
import { useToastHelpers } from '@/components/ui/Toast';
import { useAuth } from '@/lib/auth/AuthContext';
import { permissionService, PermissionType } from '@/lib/services/permissions';
import { 
  UserPlus, Users, CheckCircle, XCircle, RefreshCw, 
  Edit2, Trash2, Building2, Mail, Phone, BarChart3, AlertTriangle 
} from 'lucide-react';

interface Counselor {
  id: string;
  email: string;
  full_name: string;
  phone?: string;
  department?: string;
  is_active: boolean;
  created_at: string;
  assigned_count?: number;
  active_count?: number;
  completed_count?: number;
}

interface NewCounselorForm {
  korean_name: string;
  english_id: string;
  phone: string;
  department: string;
  password: string;
  auto_generated?: boolean;
}

// 권한 확인 컴포넌트 분리
function PermissionChecker({ children }: { children: React.ReactNode }) {
  const { user, userProfile, isAdmin, isSuperAdmin } = useAuth();
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);

  useEffect(() => {
    const checkPermission = async () => {
      if (!user || !userProfile) {
        setHasPermission(false);
        return;
      }
      
      if (isSuperAdmin) {
        setHasPermission(true);
        return;
      }
      
      if (isAdmin) {
        try {
          const hasAccess = await permissionService.hasPermission(user.id, 'counselors');
          setHasPermission(hasAccess);
        } catch (error) {
          console.error('권한 확인 실패:', error);
          setHasPermission(false);
        }
      } else {
        setHasPermission(false);
      }
    };
    
    checkPermission();
  }, [user, userProfile, isAdmin, isSuperAdmin]);

  if (hasPermission === null) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-accent" />
            <p className={designSystem.components.typography.body}>권한을 확인하는 중...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (hasPermission === false) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-96">
          <div className="max-w-md w-full text-center">
            <div className="w-24 h-24 bg-bg-tertiary rounded-full flex items-center justify-center mx-auto mb-6">
              <Users className="w-12 h-12 text-text-tertiary" />
            </div>
            <h3 className="text-xl font-semibold text-text-primary mb-4">접근 권한이 없습니다</h3>
            <p className="text-text-secondary mb-6">
              영업사원 관리는 '영업사원 관리' 권한이 있는 관리자만 접근할 수 있습니다.
            </p>
            <div className="p-4 bg-bg-secondary rounded-lg space-y-2">
              <p className="text-sm text-text-tertiary">
                현재 계정: {userProfile?.full_name || '알 수 없음'} ({userProfile?.role || '알 수 없음'})
              </p>
              {isAdmin && !isSuperAdmin && (
                <p className="text-xs text-text-secondary">
                  최고관리자에게 '영업사원 관리' 권한을 요청하세요.
                </p>
              )}
            </div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return <>{children}</>;
}

function CounselorsPageContent() {
  const { user, userProfile } = useAuth();
  const toast = useToastHelpers();
  
  // 모든 상태를 항상 동일한 순서로 선언
  const [counselors, setCounselors] = useState<Counselor[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedCounselors, setSelectedCounselors] = useState<string[]>([]);
  const [showBulkEditModal, setShowBulkEditModal] = useState(false);
  const [bulkEditForm, setBulkEditForm] = useState({
    full_name: '',
    phone: '',
    department: ''
  });
  const [newCounselor, setNewCounselor] = useState<NewCounselorForm>({
    korean_name: '',
    english_id: '',
    phone: '',
    department: '',
    password: '',
    auto_generated: false
  });

  // 전화번호 자동 포맷팅 함수
  const formatPhoneNumber = (value: string): string => {
    // 숫자만 추출
    const numbers = value.replace(/\D/g, '');
    
    // 11자리 숫자면 자동 포맷팅 (010-1234-5678)
    if (numbers.length === 11 && numbers.startsWith('010')) {
      return numbers.replace(/(\d{3})(\d{4})(\d{4})/, '$1-$2-$3');
    }
    
    // 10자리 숫자면 자동 포맷팅 (02-1234-5678)  
    if (numbers.length === 10) {
      return numbers.replace(/(\d{2})(\d{4})(\d{4})/, '$1-$2-$3');
    }
    
    // 9자리 숫자면 자동 포맷팅 (031-123-4567)
    if (numbers.length === 9) {
      return numbers.replace(/(\d{3})(\d{3})(\d{3})/, '$1-$2-$3');
    }
    
    // 그 외에는 원본 반환
    return value;
  };

  // 한글 이름 입력 시 입력 필드만 활성화
  useEffect(() => {
    if (newCounselor.korean_name && !newCounselor.english_id) {
      // 기본 안내만 제공, 자동 생성 없음
      setNewCounselor(prev => ({ 
        ...prev, 
        auto_generated: false
      }));
    }
  }, [newCounselor.korean_name]);

  // 영업사원 테이블 컬럼 정의
  const counselorColumns = [
    {
      key: 'full_name',
      label: '영업사원 정보',
      icon: businessIcons.contact,
      width: 'w-48',
      render: (value: string, record: Counselor) => (
        <div>
          <div className="font-medium text-text-primary">{record.full_name}</div>
          <div className="text-sm text-text-secondary truncate">{record.email}</div>
        </div>
      )
    },
    {
      key: 'phone',
      label: '연락처',
      icon: businessIcons.phone,
      width: 'w-40',
      render: (value: string, record: Counselor) => (
        <div className="space-y-1">
          {record.phone ? (
            <div className="flex items-center space-x-1">
              <Phone className="w-3 h-3 text-text-tertiary flex-shrink-0" />
              <span className="text-sm text-text-primary truncate">{record.phone}</span>
            </div>
          ) : (
            <span className="text-sm text-text-tertiary">-</span>
          )}
          <div className="flex items-center space-x-1">
            <Mail className="w-3 h-3 text-text-tertiary flex-shrink-0" />
            <span className="text-xs text-text-secondary truncate">{record.email}</span>
          </div>
        </div>
      )
    },
    {
      key: 'department',
      label: '부서',
      icon: businessIcons.company,
      width: 'w-32',
      render: (value: string) => (
        <div className="text-sm text-text-primary truncate">
          {value || '미지정'}
        </div>
      )
    },
    {
      key: 'stats',
      label: '고객 배정 현황',
      icon: BarChart3,
      width: 'w-40',
      sortable: false,
      render: (value: any, record: Counselor) => (
        <div className="space-y-1">
          <div className="text-sm">
            <span className="text-warning">활성: {record.active_count || 0}</span>
          </div>
          <div className="text-sm">
            <span className="text-accent">완료: {record.completed_count || 0}</span>
          </div>
          <div className="text-xs text-text-secondary">
            총 {record.assigned_count || 0}건
          </div>
        </div>
      )
    },
    {
      key: 'is_active',
      label: '상태',
      icon: CheckCircle,
      width: 'w-24',
      render: (value: boolean) => (
        <span className={designSystem.utils.cn(
          "px-2 py-1 text-xs rounded-full",
          value 
            ? "bg-success-light text-success"
            : "bg-error-light text-error"
        )}>
          {value ? '활성' : '비활성'}
        </span>
      )
    }
  ];

  // 데이터 로드
  const loadCounselors = async () => {
    setLoading(true);
    try {
      console.log('영업사원 조회 시작...');
      
      const { data: counselorsData, error: counselorsError } = await supabase
        .from('users')
        .select('*')
        .eq('role', 'counselor')
        .order('full_name', { ascending: true });

      if (counselorsError) {
        console.error('영업사원 조회 에러:', counselorsError);
        throw new Error(`영업사원 조회 실패: ${counselorsError.message}`);
      }

      console.log('조회된 영업사원 수:', counselorsData?.length || 0);
      
      if (!counselorsData || counselorsData.length === 0) {
        console.log('등록된 영업사원이 없습니다.');
        setCounselors([]);
        return;
      }
      
      // 각 영업사원별 배정 통계 계산
      const counselorsWithStats = await Promise.all(
        counselorsData.map(async (counselor) => {
          try {
            const { data: assignments, error: assignmentError } = await supabase
              .from('lead_assignments')
              .select('status')
              .eq('counselor_id', counselor.id);

            if (assignmentError) {
              console.warn(`영업사원 ${counselor.full_name} 배정 통계 조회 실패:`, assignmentError);
              return {
                ...counselor,
                assigned_count: 0,
                active_count: 0,
                completed_count: 0
              };
            }

            const assignmentCounts = assignments || [];
            return {
              ...counselor,
              assigned_count: assignmentCounts.length,
              active_count: assignmentCounts.filter(a => a.status === 'active').length,
              completed_count: assignmentCounts.filter(a => a.status === 'completed').length
            };
          } catch (error) {
            console.warn(`영업사원 ${counselor.full_name} 통계 처리 실패:`, error);
            return {
              ...counselor,
              assigned_count: 0,
              active_count: 0,
              completed_count: 0
            };
          }
        })
      );

      console.log('최종 영업사원 데이터:', counselorsWithStats);
      setCounselors(counselorsWithStats);
      
    } catch (error: any) {
      console.error('영업사원 로드 실패:', error);
      const errorMessage = error?.message || '알 수 없는 오류';
      
      toast.error(
        '데이터 로드 실패', 
        `영업사원 목록을 불러오는 중 오류가 발생했습니다: ${errorMessage}`,
        {
          action: {
            label: '다시 시도',
            onClick: () => loadCounselors()
          }
        }
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCounselors();
  }, []);

  // 영업사원 선택/해제
  const toggleCounselorSelection = (counselorId: string) => {
    setSelectedCounselors(prev => 
      prev.includes(counselorId) 
        ? prev.filter(id => id !== counselorId)
        : [...prev, counselorId]
    );
  };

  // 새 영업사원 추가 (Supabase Auth 연동)
  const handleAddCounselor = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newCounselor.korean_name || !newCounselor.english_id || !newCounselor.password) {
      toast.warning('입력 오류', '이름, 로그인 ID, 비밀번호는 필수입니다.');
      return;
    }

    if (newCounselor.password.length < 6) {
      toast.warning('비밀번호 오류', '비밀번호는 최소 6자리 이상이어야 합니다.');
      return;
    }

    if (!user || !userProfile?.role || userProfile.role !== 'admin') {
      toast.error('권한 오류', '관리자만 영업사원 계정을 생성할 수 있습니다.');
      return;
    }

    setActionLoading(true);
    try {
      // 현재 사용자의 JWT 토큰 가져오기
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('세션이 만료되었습니다. 다시 로그인해주세요.');

      // API 호출로 영업사원 계정 생성 (완성된 API 사용)
      const response = await fetch('/api/admin/create-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          email: newCounselor.english_id,
          password: newCounselor.password,
          full_name: newCounselor.korean_name,
          phone: newCounselor.phone,
          department: newCounselor.department,
          role: 'counselor',
          created_by: user.id
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || '영업사원 계정 생성에 실패했습니다.');
      }

      toast.success(
        '영업사원 계정 생성 완료', 
        `${newCounselor.korean_name}님의 계정이 생성되었습니다.\n\n로그인 정보:\n아이디: ${newCounselor.english_id}\n비밀번호: ${newCounselor.password}\n\n계정 정보를 영업사원에게 전달해주세요.`,
        {
          action: {
            label: '목록 새로고침',
            onClick: () => setShowAddForm(false)
          },
          duration: 15000
        }
      );
      
      // 폼 초기화
      setNewCounselor({ korean_name: '', english_id: '', phone: '', department: '', password: '', auto_generated: false });
      setShowAddForm(false);
      await loadCounselors();

    } catch (error: any) {
      console.error('영업사원 계정 생성 실패:', error);
      
      let errorMessage = error.message || '영업사원 계정 생성 중 오류가 발생했습니다.';
      
      // 일반적인 오류 메시지 개선
      if (errorMessage.includes('already registered') || errorMessage.includes('already exists')) {
        errorMessage = '이미 등록된 이메일입니다. 다른 아이디를 사용해주세요.';
      } else if (errorMessage.includes('invalid email')) {
        errorMessage = '유효하지 않은 이메일 형식입니다.';
      } else if (errorMessage.includes('weak password')) {
        errorMessage = '비밀번호가 너무 약합니다. 더 복잡한 비밀번호를 사용해주세요.';
      }
      
      toast.error(
        '계정 생성 실패', 
        errorMessage,
        {
          action: {
            label: '다시 시도',
            onClick: () => handleAddCounselor(e)
          }
        }
      );
    } finally {
      setActionLoading(false);
    }
  };

  // 벌크 활성화/비활성화
  const handleBulkToggleActive = async (isActive: boolean) => {
    const action = isActive ? '활성화' : '비활성화';
    const selectedNames = counselors
      .filter(c => selectedCounselors.includes(c.id))
      .map(c => c.full_name);

    const confirmAction = () => {
      performBulkToggle(isActive, selectedNames);
    };

    toast.info(
      `${action} 확인`,
      `선택된 ${selectedCounselors.length}명의 영업사원을 ${action}하시겠습니까?\n\n${selectedNames.join(', ')}`,
      {
        action: {
          label: `${action} 실행`,
          onClick: confirmAction
        },
        duration: 0
      }
    );
  };

  const performBulkToggle = async (isActive: boolean, selectedNames: string[]) => {
    const action = isActive ? '활성화' : '비활성화';
    
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('users')
        .update({ is_active: isActive })
        .in('id', selectedCounselors);

      if (error) throw error;

      toast.success(
        `${action} 완료`,
        `${selectedCounselors.length}명의 영업사원이 ${action}되었습니다.\n\n${selectedNames.join(', ')}`,
        {
          action: {
            label: '목록 새로고침',
            onClick: () => loadCounselors()
          }
        }
      );
      
      setSelectedCounselors([]);
      await loadCounselors();

    } catch (error: any) {
      console.error(`벌크 ${action} 실패:`, error);
      
      toast.error(
        `${action} 실패`,
        error.message || `영업사원 ${action} 중 오류가 발생했습니다.`,
        {
          action: {
            label: '다시 시도',
            onClick: () => performBulkToggle(isActive, selectedNames)
          }
        }
      );
    } finally {
      setActionLoading(false);
    }
  };

  // 벌크 수정
  const handleBulkEdit = () => {
    if (selectedCounselors.length === 1) {
      const selectedCounselor = counselors.find(c => c.id === selectedCounselors[0]);
      if (selectedCounselor) {
        setBulkEditForm({
          full_name: selectedCounselor.full_name || '',
          phone: selectedCounselor.phone || '',
          department: selectedCounselor.department || ''
        });
      }
    } else {
      setBulkEditForm({
        full_name: '',
        phone: '',
        department: ''
      });
    }
    setShowBulkEditModal(true);
  };

  // 벌크 수정 실행
  const handleBulkEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const updateData: any = {};
    if (bulkEditForm.full_name.trim()) updateData.full_name = bulkEditForm.full_name.trim();
    if (bulkEditForm.phone.trim()) updateData.phone = bulkEditForm.phone.trim();
    if (bulkEditForm.department.trim()) updateData.department = bulkEditForm.department.trim();

    if (Object.keys(updateData).length === 0) {
      toast.warning('입력 오류', '수정할 정보를 입력해주세요.');
      return;
    }

    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('users')
        .update(updateData)
        .in('id', selectedCounselors);

      if (error) throw error;

      const updatedFields = Object.keys(updateData).join(', ');
      const selectedNames = counselors
        .filter(c => selectedCounselors.includes(c.id))
        .map(c => c.full_name);

      toast.success(
        '정보 수정 완료',
        `${selectedCounselors.length}명의 영업사원 정보가 업데이트되었습니다.\n\n수정된 항목: ${updatedFields}\n대상: ${selectedNames.join(', ')}`,
        {
          action: {
            label: '목록 보기',
            onClick: () => setShowBulkEditModal(false)
          }
        }
      );
      
      setShowBulkEditModal(false);
      setBulkEditForm({ full_name: '', phone: '', department: '' });
      setSelectedCounselors([]);
      await loadCounselors();

    } catch (error: any) {
      console.error('벌크 수정 실패:', error);
      
      toast.error(
        '정보 수정 실패',
        error.message || '영업사원 정보 수정 중 오류가 발생했습니다.',
        {
          action: {
            label: '다시 시도',
            onClick: () => handleBulkEditSubmit(e)
          }
        }
      );
    } finally {
      setActionLoading(false);
    }
  };

  // 벌크 삭제  
  const handleBulkDelete = async () => {
    const selectedCounselorNames = counselors
      .filter(c => selectedCounselors.includes(c.id))
      .map(c => c.full_name);

    const confirmMessage = selectedCounselors.length === 1 
      ? `"${selectedCounselorNames[0]}" 영업사원을 정말 삭제하시겠습니까?\n\n⚠️ Supabase Auth 계정도 함께 삭제되며 되돌릴 수 없습니다.`
      : `다음 ${selectedCounselors.length}명의 영업사원을 정말 삭제하시겠습니까?\n\n${selectedCounselorNames.join(', ')}\n\n⚠️ Supabase Auth 계정도 함께 삭제되며 되돌릴 수 없습니다.`;

    const confirmDelete = () => {
      performBulkDelete(selectedCounselorNames);
    };

    toast.error(
      '삭제 확인',
      confirmMessage,
      {
        action: {
          label: '삭제 실행',
          onClick: confirmDelete
        },
        duration: 0
      }
    );
  };

  const performBulkDelete = async (selectedNames: string[]) => {
    setActionLoading(true);
    try {
      // 배정된 고객이 있는지 확인
      const { data: assignments } = await supabase
        .from('lead_assignments')
        .select('counselor_id, lead_id')
        .in('counselor_id', selectedCounselors)
        .in('status', ['active', 'working']);

      if (assignments && assignments.length > 0) {
        const assignedCounselors = new Set(assignments.map(a => a.counselor_id));
        const assignedNames = counselors
          .filter(c => assignedCounselors.has(c.id))
          .map(c => c.full_name);
        
        toast.warning(
          '삭제 불가',
          `다음 영업사원들은 현재 배정된 고객을 가지고 있어 삭제할 수 없습니다:\n\n${assignedNames.join(', ')}\n\n먼저 고객을 재배정하거나 완료 처리해주세요.`,
          {
            action: {
              label: '배정 관리로 이동',
              onClick: () => window.location.href = '/admin/assignments'
            }
          }
        );
        return;
      }

      // users 테이블에서 삭제 (Supabase Auth는 서버측에서 처리 필요)
      const { error } = await supabase
        .from('users')
        .delete()
        .in('id', selectedCounselors);

      if (error) throw error;

      toast.success(
        '삭제 완료',
        `${selectedCounselors.length}명의 영업사원이 삭제되었습니다.\n\n삭제된 영업사원: ${selectedNames.join(', ')}\n\n참고: Supabase Auth 계정 삭제는 관리자가 별도 처리해야 할 수 있습니다.`,
        {
          action: {
            label: '목록 새로고침',
            onClick: () => loadCounselors()
          }
        }
      );
      
      setSelectedCounselors([]);
      await loadCounselors();

    } catch (error: any) {
      console.error('벌크 삭제 실패:', error);
      
      toast.error(
        '삭제 실패',
        error.message || '영업사원 삭제 중 오류가 발생했습니다.',
        {
          action: {
            label: '다시 시도',
            onClick: () => performBulkDelete(selectedNames)
          }
        }
      );
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-accent" />
            <p className={designSystem.components.typography.body}>영업사원 목록을 불러오는 중...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="mb-8">
        <h1 className={designSystem.components.typography.h2}>영업사원 관리</h1>
        <p className={designSystem.components.typography.bodySm}>
          영업사원 계정을 생성하고 관리합니다. (Supabase Auth 연동)
        </p>
      </div>

      {/* 상단 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className={designSystem.utils.cn(designSystem.components.card.base, designSystem.components.card.content)}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-text-secondary">전체 영업사원</p>
              <p className="text-2xl font-bold text-text-primary">{counselors.length}</p>
            </div>
            <Users className="w-8 h-8 text-accent" />
          </div>
        </div>

        <div className={designSystem.utils.cn(designSystem.components.card.base, designSystem.components.card.content)}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-text-secondary">활성 영업사원</p>
              <p className="text-2xl font-bold text-success">
                {counselors.filter(c => c.is_active).length}
              </p>
            </div>
            <CheckCircle className="w-8 h-8 text-success" />
          </div>
        </div>

        <div className={designSystem.utils.cn(designSystem.components.card.base, designSystem.components.card.content)}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-text-secondary">총 배정 고객</p>
              <p className="text-2xl font-bold text-warning">
                {counselors.reduce((sum, c) => sum + (c.assigned_count || 0), 0)}
              </p>
            </div>
            <UserPlus className="w-8 h-8 text-warning" />
          </div>
        </div>

        <div className={designSystem.utils.cn(designSystem.components.card.base, designSystem.components.card.content)}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-text-secondary">총 완료 건수</p>
              <p className="text-2xl font-bold text-accent">
                {counselors.reduce((sum, c) => sum + (c.completed_count || 0), 0)}
              </p>
            </div>
            <CheckCircle className="w-8 h-8 text-accent" />
          </div>
        </div>
      </div>

      {/* 벌크 액션 바 */}
      {selectedCounselors.length > 0 && (
        <div className="sticky top-0 bg-bg-primary border border-border-primary p-4 z-10 shadow-sm mb-6 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <span className="text-sm font-medium text-text-primary">
                {selectedCounselors.length}명 선택됨
              </span>
            </div>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={handleBulkEdit}
                disabled={actionLoading}
                className={designSystem.components.button.secondary}
              >
                <Edit2 className="w-4 h-4 mr-2" />
                정보 수정
              </button>

              <button
                onClick={() => handleBulkToggleActive(true)}
                disabled={actionLoading}
                className={designSystem.utils.cn(
                  designSystem.components.button.secondary,
                  "text-success border-success hover:bg-success-light"
                )}
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                활성화
              </button>

              <button
                onClick={() => handleBulkToggleActive(false)}
                disabled={actionLoading}
                className={designSystem.utils.cn(
                  designSystem.components.button.secondary,
                  "text-warning border-warning hover:bg-warning-light"
                )}
              >
                <XCircle className="w-4 h-4 mr-2" />
                비활성화
              </button>

              <button
                onClick={handleBulkDelete}
                disabled={actionLoading}
                className={designSystem.utils.cn(
                  designSystem.components.button.secondary,
                  "text-error border-error hover:bg-error-light"
                )}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                삭제
              </button>

              <button
                onClick={() => setSelectedCounselors([])}
                className={designSystem.components.button.secondary}
              >
                선택 해제
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 상단 액션 바 */}
      <div className="flex justify-between items-center mb-6">
        <h3 className={designSystem.components.typography.h4}>영업사원 목록</h3>
        <div className="flex gap-3">
          <button
            onClick={() => {
              loadCounselors();
              toast.info('새로고침', '영업사원 목록이 업데이트되었습니다.');
            }}
            disabled={loading}
            className={designSystem.components.button.secondary}
          >
            <RefreshCw className={designSystem.utils.cn("w-4 h-4 mr-2", loading && "animate-spin")} />
            새로고침
          </button>
          <button
            onClick={() => setShowAddForm(true)}
            className={designSystem.components.button.primary}
          >
            <UserPlus className="w-4 h-4 mr-2" />
            영업사원 추가
          </button>
        </div>
      </div>

      {/* 영업사원 추가 폼 (Supabase Auth 연동) */}
      {showAddForm && (
        <div className={designSystem.utils.cn(designSystem.components.card.base, "p-6 mb-6 bg-accent-light")}>
          <h4 className="text-lg font-medium mb-4 text-text-primary">새 영업사원 계정 생성</h4>
          
          <div className="mb-4 p-3 bg-bg-secondary border border-border-primary rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-warning" />
              <span className="font-medium text-text-primary">Supabase Auth 연동 안내</span>
            </div>
            <p className="text-sm text-text-secondary">
              관리자가 직접 로그인 ID를 설정하고 비밀번호를 지정하여 계정을 생성합니다. 
              @crm 도메인 사용을 권장하며, 생성된 계정 정보를 영업사원에게 전달해주세요.
            </p>
          </div>
          
          <form onSubmit={handleAddCounselor} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2 text-text-primary">한글 이름 *</label>
              <input
                type="text"
                value={newCounselor.korean_name}
                onChange={(e) => setNewCounselor(prev => ({ ...prev, korean_name: e.target.value }))}
                className="w-full px-3 py-2 border border-border-primary rounded-lg bg-bg-primary text-text-primary focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
                placeholder="홍길동"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2 text-text-primary">
                로그인 ID *
              </label>
              <input
                type="email"
                value={newCounselor.english_id}
                onChange={(e) => setNewCounselor(prev => ({ 
                  ...prev, 
                  english_id: e.target.value
                }))}
                className="w-full px-3 py-2 border border-border-primary rounded-lg bg-bg-primary text-text-primary focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
                placeholder="kim01@crm, sales01@crm 등"
                required
              />
              <p className="text-xs text-text-tertiary mt-1">
                @crm 도메인 사용을 권장합니다. (예: kim01@crm, sales01@crm)
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2 text-text-primary">비밀번호 *</label>
              <input
                type="password"
                value={newCounselor.password}
                onChange={(e) => setNewCounselor(prev => ({ ...prev, password: e.target.value }))}
                className="w-full px-3 py-2 border border-border-primary rounded-lg bg-bg-primary text-text-primary focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
                placeholder="최소 6자리"
                required
                minLength={6}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2 text-text-primary">전화번호</label>
              <input
                type="tel"
                value={newCounselor.phone}
                onChange={(e) => {
                  const formatted = formatPhoneNumber(e.target.value);
                  setNewCounselor(prev => ({ ...prev, phone: formatted }));
                }}
                className="w-full px-3 py-2 border border-border-primary rounded-lg bg-bg-primary text-text-primary focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
                placeholder="01012345678 또는 010-1234-5678"
              />
              <p className="text-xs text-text-tertiary mt-1">
                숫자만 입력해도 자동으로 하이픈이 추가됩니다.
              </p>
            </div>
            
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-2 text-text-primary">부서</label>
              <input
                type="text"
                value={newCounselor.department}
                onChange={(e) => setNewCounselor(prev => ({ ...prev, department: e.target.value }))}
                className="w-full px-3 py-2 border border-border-primary rounded-lg bg-bg-primary text-text-primary focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
                placeholder="영업팀"
              />
            </div>
            
            <div className="md:col-span-2 flex gap-3 pt-4">
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
                  setShowAddForm(false);
                  setNewCounselor({ korean_name: '', english_id: '', phone: '', department: '', password: '', auto_generated: false });
                }}
                className={designSystem.components.button.secondary}
              >
                취소
              </button>
            </div>
          </form>
        </div>
      )}

      {/* SmartTable로 영업사원 목록 */}
      <SmartTable
        data={counselors}
        columns={counselorColumns}
        selectedItems={selectedCounselors}
        onToggleSelection={toggleCounselorSelection}
        getItemId={(counselor) => counselor.id}
        searchPlaceholder="이름, 이메일, 부서로 검색..."
        emptyMessage="등록된 영업사원이 없습니다."
        height="50vh"
        minHeight="300px"
        maxHeight="600px"
      />

      {/* 벌크 수정 모달 */}
      {showBulkEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-bg-primary border border-border-primary rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-medium mb-4 text-text-primary">
              {selectedCounselors.length === 1 ? '영업사원 정보 수정' : `${selectedCounselors.length}명 일괄 수정`}
            </h3>
            
            <form onSubmit={handleBulkEditSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-text-primary">이름</label>
                <input
                  type="text"
                  value={bulkEditForm.full_name}
                  onChange={(e) => setBulkEditForm(prev => ({ ...prev, full_name: e.target.value }))}
                  className="w-full px-3 py-2 border border-border-primary rounded-lg bg-bg-primary text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
                  placeholder={selectedCounselors.length > 1 ? "변경할 경우에만 입력" : "이름을 입력하세요"}
                />
                <p className="text-xs text-text-tertiary mt-1">
                  이메일 수정은 보안상 지원되지 않습니다.
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2 text-text-primary">전화번호</label>
                <input
                  type="tel"
                  value={bulkEditForm.phone}
                  onChange={(e) => {
                    const formatted = formatPhoneNumber(e.target.value);
                    setBulkEditForm(prev => ({ ...prev, phone: formatted }));
                  }}
                  className="w-full px-3 py-2 border border-border-primary rounded-lg bg-bg-primary text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
                  placeholder={selectedCounselors.length > 1 ? "변경할 경우에만 입력" : "전화번호를 입력하세요"}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2 text-text-primary">부서</label>
                <input
                  type="text"
                  value={bulkEditForm.department}
                  onChange={(e) => setBulkEditForm(prev => ({ ...prev, department: e.target.value }))}
                  className="w-full px-3 py-2 border border-border-primary rounded-lg bg-bg-primary text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
                  placeholder={selectedCounselors.length > 1 ? "변경할 경우에만 입력" : "부서를 입력하세요"}
                />
              </div>

              {selectedCounselors.length > 1 && (
                <div className="p-3 bg-accent-light rounded-lg">
                  <p className="text-sm text-text-secondary">
                    다중 선택 시 빈 칸은 변경되지 않습니다. 변경할 정보만 입력하세요.
                  </p>
                </div>
              )}
              
              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={actionLoading}
                  className={designSystem.components.button.primary}
                >
                  {actionLoading ? (
                    <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <CheckCircle className="w-4 h-4 mr-2" />
                  )}
                  수정 완료
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowBulkEditModal(false);
                    setBulkEditForm({ full_name: '', phone: '', department: '' });
                  }}
                  className={designSystem.components.button.secondary}
                >
                  취소
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

// 메인 컴포넌트 - 권한 검사 후 내용 렌더링
export default function CounselorsPage() {
  return (
    <ProtectedRoute requiredPermission="counselors">
      <CounselorsPageContent />
    </ProtectedRoute>
  );
}