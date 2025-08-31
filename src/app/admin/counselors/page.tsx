'use client';

import { useState, useEffect } from 'react';
import AdminLayout from '@/components/layout/AdminLayout';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { designSystem } from '@/lib/design-system';
import { businessIcons } from '@/lib/design-system/icons';
import { supabase } from '@/lib/supabase';
import { useToastHelpers } from '@/components/ui/Toast';
import { useAuth } from '@/lib/auth/AuthContext';
import { permissionService, PermissionType } from '@/lib/services/permissions';
import { 
  UserPlus, Users, CheckCircle, XCircle, RefreshCw, 
  Edit2, Trash2, Building2, Mail, Phone, AlertTriangle,
  Search, ChevronLeft, ChevronRight, CheckSquare, Square,
  User, Calendar
} from 'lucide-react';

interface Counselor {
  id: string;
  email: string;
  full_name: string;
  phone?: string;
  department?: string;
  is_active: boolean;
  created_at: string;
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
  
  // 상태 선언
  const [counselors, setCounselors] = useState<Counselor[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedCounselors, setSelectedCounselors] = useState<string[]>([]);
  const [showBulkEditModal, setShowBulkEditModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const itemsPerPage = 200;
  
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

  // 검색어 디바운싱
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // 임시 비밀번호 생성 함수
  const generateTempPassword = (): string => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
    let password = '';
    for (let i = 0; i < 8; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  };

  // 비밀번호 리셋 함수
  const handlePasswordReset = async (counselorId: string, counselorName: string, counselorEmail: string) => {
    const confirmReset = () => {
      performPasswordReset(counselorId, counselorName, counselorEmail);
    };

    const message = counselorName + '님의 비밀번호를 리셋하시겠습니까?\n\n새로운 임시 비밀번호가 생성되어 표시됩니다.\n기존 비밀번호는 더 이상 사용할 수 없습니다.';

    toast.info(
      '비밀번호 리셋 확인',
      message,
      {
        action: {
          label: '리셋 실행',
          onClick: confirmReset
        },
        duration: 0
      }
    );
  };

  const performPasswordReset = async (counselorId: string, counselorName: string, counselorEmail: string) => {
    setActionLoading(true);
    try {
      // 새 임시 비밀번호 생성
      const tempPassword = generateTempPassword();
      
      // Supabase Auth에서 비밀번호 업데이트
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('세션이 만료되었습니다. 다시 로그인해주세요.');

      const response = await fetch('/api/admin/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + session.access_token
        },
        body: JSON.stringify({
          userId: counselorId,
          newPassword: tempPassword
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || '비밀번호 리셋에 실패했습니다.');
      }

      // 새 비밀번호를 토스트로 표시 (복사 가능)
      const successMessage = counselorName + '님의 새 로그인 정보:\n\n아이디: ' + counselorEmail + '\n비밀번호: ' + tempPassword + '\n\n⚠️ 이 비밀번호를 영업사원에게 안전하게 전달해주세요.\n영업사원은 로그인 후 비밀번호를 변경하는 것을 권장합니다.';

      toast.success(
        '비밀번호 리셋 완료',
        successMessage,
        {
          action: {
            label: '비밀번호 복사',
            onClick: () => {
              navigator.clipboard.writeText(tempPassword);
              toast.info('복사 완료', '새 비밀번호가 클립보드에 복사되었습니다.');
            }
          },
          duration: 30000 // 30초 동안 표시
        }
      );

    } catch (error: any) {
      console.error('비밀번호 리셋 실패:', error);
      
      let errorMessage = error.message || '비밀번호 리셋 중 오류가 발생했습니다.';
      
      if (errorMessage.includes('User not found')) {
        errorMessage = '해당 사용자를 찾을 수 없습니다.';
      } else if (errorMessage.includes('session')) {
        errorMessage = '세션이 만료되었습니다. 다시 로그인해주세요.';
      }
      
      toast.error(
        '비밀번호 리셋 실패',
        errorMessage,
        {
          action: {
            label: '다시 시도',
            onClick: () => performPasswordReset(counselorId, counselorName, counselorEmail)
          }
        }
      );
    } finally {
      setActionLoading(false);
    }
  };

  // 전화번호 자동 포맷팅 함수
  const formatPhoneNumber = (value: string): string => {
    const numbers = value.replace(/\D/g, '');
    
    if (numbers.length === 11 && numbers.startsWith('010')) {
      return numbers.replace(/(\d{3})(\d{4})(\d{4})/, '$1-$2-$3');
    }
    
    if (numbers.length === 10) {
      return numbers.replace(/(\d{2})(\d{4})(\d{4})/, '$1-$2-$3');
    }
    
    if (numbers.length === 9) {
      return numbers.replace(/(\d{3})(\d{3})(\d{3})/, '$1-$2-$3');
    }
    
    return value;
  };

  // 텍스트 하이라이트 함수 (단순화)
  const highlightText = (text: string, query: string): React.ReactNode => {
    if (!query.trim()) return text;
    
    const lowerText = text.toLowerCase();
    const lowerQuery = query.toLowerCase();
    const index = lowerText.indexOf(lowerQuery);
    
    if (index === -1) return text;
    
    return (
      <>
        {text.substring(0, index)}
        <span className="bg-accent-light text-accent font-medium rounded px-0.5">
          {text.substring(index, index + query.length)}
        </span>
        {text.substring(index + query.length)}
      </>
    );
  };

  // 데이터 로드 (페이징 적용)
  const loadCounselors = async (page: number = 1, searchQuery: string = '') => {
    setLoading(true);
    try {
      console.log('영업사원 조회 시작...');
      
      const startRange = (page - 1) * itemsPerPage;
      const endRange = startRange + itemsPerPage - 1;

      let query = supabase
        .from('users')
        .select('*', { count: 'exact' })
        .eq('role', 'counselor')
        .order('full_name', { ascending: true });

      // 검색어 적용
      if (searchQuery.trim()) {
        query = query.or('full_name.ilike.%' + searchQuery + '%,email.ilike.%' + searchQuery + '%,department.ilike.%' + searchQuery + '%,phone.ilike.%' + searchQuery + '%');
      }

      // 페이지네이션 적용
      query = query.range(startRange, endRange);

      const { data: counselorsData, error: counselorsError, count } = await query;

      if (counselorsError) {
        console.error('영업사원 조회 에러:', counselorsError);
        throw new Error('영업사원 조회 실패: ' + counselorsError.message);
      }

      console.log('조회된 영업사원 수:', counselorsData?.length || 0, ' (전체: ' + count + ')');
      
      setCounselors(counselorsData || []);
      setTotalCount(count || 0);
      setTotalPages(Math.ceil((count || 0) / itemsPerPage));
      setCurrentPage(page);
      
    } catch (error: any) {
      console.error('영업사원 로드 실패:', error);
      const errorMessage = error?.message || '알 수 없는 오류';
      
      toast.error(
        '데이터 로드 실패', 
        '영업사원 목록을 불러오는 중 오류가 발생했습니다: ' + errorMessage,
        {
          action: {
            label: '다시 시도',
            onClick: () => loadCounselors(page, searchQuery)
          }
        }
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCounselors(currentPage, debouncedSearchTerm);
  }, [currentPage, debouncedSearchTerm]);

  // 영업사원 선택/해제
  const toggleCounselorSelection = (counselorId: string) => {
    setSelectedCounselors(prev => 
      prev.includes(counselorId) 
        ? prev.filter(id => id !== counselorId)
        : [...prev, counselorId]
    );
  };

  // 전체 선택/해제
  const toggleSelectAll = () => {
    if (selectedCounselors.length === counselors.length) {
      setSelectedCounselors([]);
    } else {
      setSelectedCounselors(counselors.map(counselor => counselor.id));
    }
  };

  // 새 영업사원 추가
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
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('세션이 만료되었습니다. 다시 로그인해주세요.');

      const response = await fetch('/api/admin/create-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + session.access_token
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

      const successMessage = newCounselor.korean_name + '님의 계정이 생성되었습니다.\n\n로그인 정보:\n아이디: ' + newCounselor.english_id + '\n비밀번호: ' + newCounselor.password + '\n\n계정 정보를 영업사원에게 전달해주세요.';

      toast.success(
        '영업사원 계정 생성 완료', 
        successMessage,
        {
          action: {
            label: '목록 새로고침',
            onClick: () => setShowAddForm(false)
          },
          duration: 15000
        }
      );
      
      setNewCounselor({ korean_name: '', english_id: '', phone: '', department: '', password: '', auto_generated: false });
      setShowAddForm(false);
      await loadCounselors(currentPage, debouncedSearchTerm);

    } catch (error: any) {
      console.error('영업사원 계정 생성 실패:', error);
      
      let errorMessage = error.message || '영업사원 계정 생성 중 오류가 발생했습니다.';
      
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

    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('users')
        .update({ is_active: isActive })
        .in('id', selectedCounselors);

      if (error) throw error;

      const successMessage = selectedCounselors.length + '명의 영업사원이 ' + action + '되었습니다.\n\n' + selectedNames.join(', ');

      toast.success(
        action + ' 완료',
        successMessage,
        {
          action: {
            label: '목록 새로고침',
            onClick: () => loadCounselors(currentPage, debouncedSearchTerm)
          }
        }
      );
      
      setSelectedCounselors([]);
      await loadCounselors(currentPage, debouncedSearchTerm);

    } catch (error: any) {
      console.error('벌크 ' + action + ' 실패:', error);
      
      toast.error(
        action + ' 실패',
        error.message || '영업사원 ' + action + ' 중 오류가 발생했습니다.',
        {
          action: {
            label: '다시 시도',
            onClick: () => handleBulkToggleActive(isActive)
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

      const successMessage = selectedCounselors.length + '명의 영업사원 정보가 업데이트되었습니다.\n\n수정된 항목: ' + updatedFields + '\n대상: ' + selectedNames.join(', ');

      toast.success(
        '정보 수정 완료',
        successMessage,
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
      await loadCounselors(currentPage, debouncedSearchTerm);

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
        
        const warningMessage = '다음 영업사원들은 현재 배정된 고객을 가지고 있어 삭제할 수 없습니다:\n\n' + assignedNames.join(', ') + '\n\n먼저 고객을 재배정하거나 완료 처리해주세요.';
        
        toast.warning(
          '삭제 불가',
          warningMessage,
          {
            action: {
              label: '배정 관리로 이동',
              onClick: () => window.location.href = '/admin/assignments'
            }
          }
        );
        return;
      }

      const { error } = await supabase
        .from('users')
        .delete()
        .in('id', selectedCounselors);

      if (error) throw error;

      const successMessage = selectedCounselors.length + '명의 영업사원이 삭제되었습니다.\n\n삭제된 영업사원: ' + selectedCounselorNames.join(', ') + '\n\n참고: Supabase Auth 계정 삭제는 관리자가 별도 처리해야 할 수 있습니다.';

      toast.success(
        '삭제 완료',
        successMessage,
        {
          action: {
            label: '목록 새로고침',
            onClick: () => loadCounselors(currentPage, debouncedSearchTerm)
          }
        }
      );
      
      setSelectedCounselors([]);
      await loadCounselors(currentPage, debouncedSearchTerm);

    } catch (error: any) {
      console.error('벌크 삭제 실패:', error);
      
      toast.error(
        '삭제 실패',
        error.message || '영업사원 삭제 중 오류가 발생했습니다.',
        {
          action: {
            label: '다시 시도',
            onClick: () => handleBulkDelete()
          }
        }
      );
    } finally {
      setActionLoading(false);
    }
  };

  if (loading && currentPage === 1) {
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
      <div className="p-6 max-w-7xl mx-auto">
        {/* 헤더 */}
        <div className="mb-8">
          <h1 className={designSystem.components.typography.h2}>영업사원 관리</h1>
          <p className={designSystem.components.typography.bodySm}>
            영업사원 계정을 생성하고 관리합니다. (Supabase Auth 연동)
          </p>
        </div>

        {/* 벌크 액션 바 */}
        {selectedCounselors.length > 0 && (
          <div className="sticky top-0 bg-bg-primary border border-border-primary p-3 z-10 shadow-sm mb-6 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-text-primary">
                {selectedCounselors.length}명 선택됨
              </span>
              
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleBulkEdit}
                  disabled={actionLoading}
                  className="px-2 py-1.5 text-xs bg-bg-secondary text-text-primary rounded hover:bg-bg-hover transition-colors"
                >
                  <Edit2 className="w-3 h-3 mr-1 inline" />
                  정보 수정
                </button>

                <button
                  onClick={() => handleBulkToggleActive(true)}
                  disabled={actionLoading}
                  className="px-2 py-1.5 text-xs bg-success text-white rounded hover:bg-success/90 transition-colors"
                >
                  <CheckCircle className="w-3 h-3 mr-1 inline" />
                  활성화
                </button>

                <button
                  onClick={() => handleBulkToggleActive(false)}
                  disabled={actionLoading}
                  className="px-2 py-1.5 text-xs bg-warning text-white rounded hover:bg-warning/90 transition-colors"
                >
                  <XCircle className="w-3 h-3 mr-1 inline" />
                  비활성화
                </button>

                <button
                  onClick={handleBulkDelete}
                  disabled={actionLoading}
                  className="px-2 py-1.5 text-xs bg-error text-white rounded hover:bg-error/90 transition-colors"
                >
                  <Trash2 className="w-3 h-3 mr-1 inline" />
                  삭제
                </button>

                <button
                  onClick={() => setSelectedCounselors([])}
                  className="px-2 py-1.5 text-xs bg-bg-secondary text-text-primary rounded hover:bg-bg-hover transition-colors"
                >
                  선택 해제
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 상단 액션 바 */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-accent" />
            <h3 className="text-sm font-medium text-text-primary">영업사원 목록</h3>
            <span className="text-xs text-text-secondary px-1.5 py-0.5 bg-bg-secondary rounded">
              전체 {totalCount.toLocaleString()}명
            </span>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => {
                loadCounselors(currentPage, debouncedSearchTerm);
                toast.info('새로고침', '영업사원 목록이 업데이트되었습니다.');
              }}
              disabled={loading}
              className="px-3 py-2 text-xs rounded font-medium transition-colors bg-bg-secondary text-text-primary hover:bg-bg-hover disabled:opacity-50"
            >
              <RefreshCw className={loading ? "w-3 h-3 mr-1 inline animate-spin" : "w-3 h-3 mr-1 inline"} />
              새로고침
            </button>
            <button
              onClick={() => setShowAddForm(true)}
              className="px-3 py-2 text-xs bg-accent text-white rounded hover:bg-accent/90 transition-colors font-medium"
            >
              <UserPlus className="w-3 h-3 mr-1 inline" />
              영업사원 추가
            </button>
          </div>
        </div>

        {/* 영업사원 추가 폼 */}
        {showAddForm && (
          <div className="bg-accent-light border border-border-primary rounded-lg p-6 mb-6">
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
                  className="px-4 py-2 text-sm rounded font-medium transition-colors bg-accent text-white hover:bg-accent/90 disabled:bg-bg-secondary disabled:text-text-tertiary disabled:cursor-not-allowed"
                >
                  {actionLoading ? (
                    <RefreshCw className="w-4 h-4 animate-spin mr-2 inline" />
                  ) : (
                    <UserPlus className="w-4 h-4 mr-2 inline" />
                  )}
                  계정 생성
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddForm(false);
                    setNewCounselor({ korean_name: '', english_id: '', phone: '', department: '', password: '', auto_generated: false });
                  }}
                  className="px-4 py-2 text-sm bg-bg-secondary text-text-primary rounded hover:bg-bg-hover transition-colors font-medium"
                >
                  취소
                </button>
              </div>
            </form>
          </div>
        )}

        {/* 검색 영역 */}
        <div className="flex items-center justify-between mb-3">
          <div></div>
          <div className="relative">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-3 h-3 text-text-secondary" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="이름, 이메일, 부서로 검색..."
              className="pl-7 pr-3 py-1 w-48 text-xs border border-border-primary rounded bg-bg-primary text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </div>
        </div>

        {/* 영업사원 목록 테이블 */}
        <div className="bg-bg-primary border border-border-primary rounded-lg overflow-hidden">
          {counselors.length > 0 ? (
            <>
              <div className="overflow-auto" style={{ maxHeight: '65vh' }}>
                <table className="w-full table-fixed">
                  <thead className="bg-bg-secondary sticky top-0 z-10">
                    <tr>
                      <th className="text-center py-2 px-1 font-medium text-text-secondary text-xs w-8">
                        <button
                          onClick={toggleSelectAll}
                          className="flex items-center justify-center w-3 h-3 mx-auto"
                        >
                          {selectedCounselors.length === counselors.length && counselors.length > 0 ? (
                            <CheckSquare className="w-3 h-3 text-accent" />
                          ) : (
                            <Square className="w-3 h-3 text-text-tertiary" />
                          )}
                        </button>
                      </th>
                      <th className="text-center py-2 px-1 font-medium text-text-secondary text-xs w-24">
                        <div className="flex items-center justify-center gap-0.5">
                          <User className="w-3 h-3" />
                          이름
                        </div>
                      </th>
                      <th className="text-center py-2 px-1 font-medium text-text-secondary text-xs w-32">
                        <div className="flex items-center justify-center gap-0.5">
                          <Mail className="w-3 h-3" />
                          이메일
                        </div>
                      </th>
                      <th className="text-center py-2 px-1 font-medium text-text-secondary text-xs w-24">
                        <div className="flex items-center justify-center gap-0.5">
                          <Phone className="w-3 h-3" />
                          전화번호
                        </div>
                      </th>
                      <th className="text-center py-2 px-1 font-medium text-text-secondary text-xs w-20">
                        <div className="flex items-center justify-center gap-0.5">
                          <Building2 className="w-3 h-3" />
                          부서
                        </div>
                      </th>
                      <th className="text-center py-2 px-1 font-medium text-text-secondary text-xs w-16">
                        <div className="flex items-center justify-center gap-0.5">
                          <CheckCircle className="w-3 h-3" />
                          상태
                        </div>
                      </th>
                      <th className="text-center py-2 px-1 font-medium text-text-secondary text-xs w-20">
                        <div className="flex items-center justify-center gap-0.5">
                          <Calendar className="w-3 h-3" />
                          생성일
                        </div>
                      </th>
                      <th className="text-center py-2 px-1 font-medium text-text-secondary text-xs w-16">
                        <div className="flex items-center justify-center gap-0.5">
                          <RefreshCw className="w-3 h-3" />
                          액션
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {counselors.map((counselor) => (
                      <tr key={counselor.id} className="border-b border-border-primary hover:bg-bg-hover transition-colors">
                        {/* 선택 체크박스 */}
                        <td className="py-1 px-1 text-center">
                          <button
                            onClick={() => toggleCounselorSelection(counselor.id)}
                            className="flex items-center justify-center w-3 h-3 mx-auto"
                          >
                            {selectedCounselors.includes(counselor.id) ? (
                              <CheckSquare className="w-3 h-3 text-accent" />
                            ) : (
                              <Square className="w-3 h-3 text-text-tertiary" />
                            )}
                          </button>
                        </td>

                        {/* 이름 */}
                        <td className="py-1 px-1 text-center">
                          <div className="text-xs font-medium text-text-primary truncate">
                            {highlightText(counselor.full_name, debouncedSearchTerm)}
                          </div>
                        </td>

                        {/* 이메일 */}
                        <td className="py-1 px-1 text-center">
                          <div className="text-xs text-text-secondary truncate">
                            {highlightText(counselor.email, debouncedSearchTerm)}
                          </div>
                        </td>

                        {/* 전화번호 */}
                        <td className="py-1 px-1 text-center">
                          <div className="text-xs font-mono text-text-primary truncate">
                            {counselor.phone ? (
                              highlightText(counselor.phone, debouncedSearchTerm)
                            ) : (
                              <span className="text-text-tertiary">-</span>
                            )}
                          </div>
                        </td>

                        {/* 부서 */}
                        <td className="py-1 px-1 text-center">
                          <div className="text-xs text-text-primary truncate">
                            {counselor.department ? (
                              highlightText(counselor.department, debouncedSearchTerm)
                            ) : (
                              <span className="text-text-tertiary">미지정</span>
                            )}
                          </div>
                        </td>

                        {/* 상태 */}
                        <td className="py-1 px-1 text-center">
                          <span className={
                            counselor.is_active 
                              ? "px-1.5 py-0.5 text-xs rounded bg-success-light text-success"
                              : "px-1.5 py-0.5 text-xs rounded bg-error-light text-error"
                          }>
                            {counselor.is_active ? '활성' : '비활성'}
                          </span>
                        </td>

                        {/* 생성일 */}
                        <td className="py-1 px-1 text-center">
                          <span className="text-text-secondary text-xs whitespace-nowrap">
                            {new Date(counselor.created_at).toLocaleDateString('ko-KR', {
                              year: '2-digit',
                              month: '2-digit',
                              day: '2-digit'
                            })}
                          </span>
                        </td>

                        {/* 액션 */}
                        <td className="py-1 px-1 text-center">
                          <button
                            onClick={() => handlePasswordReset(counselor.id, counselor.full_name, counselor.email)}
                            disabled={actionLoading}
                            className="p-0.5 text-text-tertiary hover:text-accent transition-colors disabled:opacity-50"
                            title="비밀번호 리셋"
                          >
                            <RefreshCw className="w-3 h-3" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* 페이지네이션 */}
              {totalPages > 1 && (
                <div className="p-3 border-t border-border-primary bg-bg-secondary">
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-text-secondary">
                      총 {totalCount.toLocaleString()}개 중 {((currentPage - 1) * itemsPerPage + 1).toLocaleString()}-{Math.min(currentPage * itemsPerPage, totalCount).toLocaleString()}개 표시
                    </div>
                    
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setCurrentPage(1)}
                        disabled={currentPage === 1}
                        className="px-2 py-1 text-xs border border-border-primary rounded bg-bg-primary text-text-primary disabled:opacity-50 disabled:cursor-not-allowed hover:bg-bg-hover transition-colors"
                      >
                        첫페이지
                      </button>
                      
                      <button
                        onClick={() => setCurrentPage(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="px-2 py-1 text-xs border border-border-primary rounded bg-bg-primary text-text-primary disabled:opacity-50 disabled:cursor-not-allowed hover:bg-bg-hover transition-colors"
                      >
                        <ChevronLeft className="w-3 h-3" />
                      </button>
                      
                      <span className="px-2 py-1 text-xs text-white bg-accent rounded">
                        {currentPage} / {totalPages}
                      </span>
                      
                      <button
                        onClick={() => setCurrentPage(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className="px-2 py-1 text-xs border border-border-primary rounded bg-bg-primary text-text-primary disabled:opacity-50 disabled:cursor-not-allowed hover:bg-bg-hover transition-colors"
                      >
                        <ChevronRight className="w-3 h-3" />
                      </button>
                      
                      <button
                        onClick={() => setCurrentPage(totalPages)}
                        disabled={currentPage === totalPages}
                        className="px-2 py-1 text-xs border border-border-primary rounded bg-bg-primary text-text-primary disabled:opacity-50 disabled:cursor-not-allowed hover:bg-bg-hover transition-colors"
                      >
                        마지막
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12">
              <Users className="w-16 h-16 text-text-tertiary mx-auto mb-4" />
              <h3 className="text-lg font-medium text-text-primary mb-2">등록된 영업사원이 없습니다</h3>
              <p className="text-text-secondary">새 영업사원을 추가해보세요.</p>
            </div>
          )}
        </div>

        {/* 벌크 수정 모달 */}
        {showBulkEditModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-bg-primary border border-border-primary rounded-lg p-6 w-full max-w-md mx-4">
              <h3 className="text-lg font-medium mb-4 text-text-primary">
                {selectedCounselors.length === 1 ? '영업사원 정보 수정' : selectedCounselors.length + '명 일괄 수정'}
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
                    className="px-4 py-2 text-sm rounded font-medium transition-colors bg-accent text-white hover:bg-accent/90 disabled:bg-bg-secondary disabled:text-text-tertiary disabled:cursor-not-allowed"
                  >
                    {actionLoading ? (
                      <RefreshCw className="w-4 h-4 animate-spin mr-2 inline" />
                    ) : (
                      <CheckCircle className="w-4 h-4 mr-2 inline" />
                    )}
                    수정 완료
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowBulkEditModal(false);
                      setBulkEditForm({ full_name: '', phone: '', department: '' });
                    }}
                    className="px-4 py-2 text-sm bg-bg-secondary text-text-primary rounded hover:bg-bg-hover transition-colors font-medium"
                  >
                    취소
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

// 메인 컴포넌트
export default function CounselorsPage() {
  return (
    <ProtectedRoute requiredPermission="counselors">
      <CounselorsPageContent />
    </ProtectedRoute>
  );
}