'use client';

import { useState, useEffect } from 'react';
import AdminLayout from '@/components/layout/AdminLayout';
import { designSystem } from '@/lib/design-system';
import { businessIcons } from '@/lib/design-system/icons';
import { supabase } from '@/lib/supabase';
import SmartTable from '@/components/ui/SmartTable';
import { 
  UserPlus, Users, CheckCircle, XCircle, RefreshCw, 
  Edit2, Trash2, Building2, Mail, Phone, BarChart3 
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
  email: string;
  full_name: string;
  phone: string;
  department: string;
}

export default function CounselorsPage() {
  // 📊 기본 상태
  const [counselors, setCounselors] = useState<Counselor[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  
  // 🎯 선택 관련 상태  
  const [selectedCounselors, setSelectedCounselors] = useState<string[]>([]);
  const [showBulkEditModal, setShowBulkEditModal] = useState(false);
  const [bulkEditForm, setBulkEditForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    department: ''
  });

  // 새 상담원 폼 상태
  const [newCounselor, setNewCounselor] = useState<NewCounselorForm>({
    email: '',
    full_name: '',
    phone: '',
    department: ''
  });

  // 🎨 상담사 테이블 칼럼 정의
  const counselorColumns = [
    {
      key: 'full_name',
      label: '상담원 정보',
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
      label: '배정 현황',
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

  // 📊 데이터 로드
  const loadCounselors = async () => {
    setLoading(true);
    try {
      console.log('상담원 조회 시작...');
      
      const { data: counselorsData, error: counselorsError } = await supabase
        .from('users')
        .select('*')
        .eq('role', 'counselor')
        .order('full_name', { ascending: true });

      if (counselorsError) {
        console.error('상담원 조회 에러:', counselorsError);
        throw new Error(`상담원 조회 실패: ${counselorsError.message}`);
      }

      console.log('조회된 상담원 수:', counselorsData?.length || 0);
      
      if (!counselorsData || counselorsData.length === 0) {
        console.log('등록된 상담원이 없습니다.');
        setCounselors([]);
        return;
      }
      
      // 각 상담원별 배정 통계 계산
      const counselorsWithStats = await Promise.all(
        counselorsData.map(async (counselor) => {
          try {
            const { data: assignments, error: assignmentError } = await supabase
              .from('lead_assignments')
              .select('status')
              .eq('counselor_id', counselor.id);

            if (assignmentError) {
              console.warn(`상담원 ${counselor.full_name} 배정 통계 조회 실패:`, assignmentError);
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
            console.warn(`상담원 ${counselor.full_name} 통계 처리 실패:`, error);
            return {
              ...counselor,
              assigned_count: 0,
              active_count: 0,
              completed_count: 0
            };
          }
        })
      );

      console.log('최종 상담원 데이터:', counselorsWithStats);
      setCounselors(counselorsWithStats);
      
    } catch (error) {
      console.error('상담원 로드 실패:', error);
      const errorMessage = error?.message || '알 수 없는 오류';
      alert(`상담원 목록을 불러오는 중 오류가 발생했습니다: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCounselors();
  }, []);

  // 🎯 상담원 선택/해제
  const toggleCounselorSelection = (counselorId: string) => {
    setSelectedCounselors(prev => 
      prev.includes(counselorId) 
        ? prev.filter(id => id !== counselorId)
        : [...prev, counselorId]
    );
  };

  // 📋 새 상담원 추가
  const handleAddCounselor = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newCounselor.email || !newCounselor.full_name) {
      alert('이메일과 이름은 필수입니다.');
      return;
    }

    setActionLoading(true);
    try {
      const { data, error } = await supabase
        .from('users')
        .insert([{
          id: crypto.randomUUID(),
          email: newCounselor.email,
          full_name: newCounselor.full_name,
          phone: newCounselor.phone || null,
          department: newCounselor.department || null,
          role: 'counselor',
          is_active: true
        }])
        .select()
        .single();

      if (error) throw error;

      alert('상담원이 성공적으로 추가되었습니다.');
      setNewCounselor({ email: '', full_name: '', phone: '', department: '' });
      setShowAddForm(false);
      await loadCounselors();

    } catch (error) {
      console.error('상담원 추가 실패:', error);
      alert('상담원 추가 중 오류가 발생했습니다.');
    } finally {
      setActionLoading(false);
    }
  };

  // 🔄 벌크 활성화/비활성화
  const handleBulkToggleActive = async (isActive: boolean) => {
    const action = isActive ? '활성화' : '비활성화';
    if (!confirm(`선택된 ${selectedCounselors.length}명의 상담원을 ${action}하시겠습니까?`)) return;

    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('users')
        .update({ is_active: isActive })
        .in('id', selectedCounselors);

      if (error) throw error;

      alert(`${selectedCounselors.length}명의 상담원이 ${action}되었습니다.`);
      setSelectedCounselors([]);
      await loadCounselors();

    } catch (error) {
      console.error(`벌크 ${action} 실패:`, error);
      alert(`상담원 ${action} 중 오류가 발생했습니다.`);
    } finally {
      setActionLoading(false);
    }
  };

  // ✏️ 벌크 수정
  const handleBulkEdit = () => {
    if (selectedCounselors.length === 1) {
      const selectedCounselor = counselors.find(c => c.id === selectedCounselors[0]);
      if (selectedCounselor) {
        setBulkEditForm({
          full_name: selectedCounselor.full_name || '',
          email: selectedCounselor.email || '',
          phone: selectedCounselor.phone || '',
          department: selectedCounselor.department || ''
        });
      }
    } else {
      setBulkEditForm({
        full_name: '',
        email: '',
        phone: '',
        department: ''
      });
    }
    setShowBulkEditModal(true);
  };

  // 💾 벌크 수정 실행
  const handleBulkEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const updateData: any = {};
    if (bulkEditForm.full_name.trim()) updateData.full_name = bulkEditForm.full_name.trim();
    if (bulkEditForm.email.trim()) updateData.email = bulkEditForm.email.trim();
    if (bulkEditForm.phone.trim()) updateData.phone = bulkEditForm.phone.trim();
    if (bulkEditForm.department.trim()) updateData.department = bulkEditForm.department.trim();

    if (Object.keys(updateData).length === 0) {
      alert('수정할 정보를 입력해주세요.');
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
      alert(`${selectedCounselors.length}명의 상담원 정보가 업데이트되었습니다.\n수정된 항목: ${updatedFields}`);
      
      setShowBulkEditModal(false);
      setBulkEditForm({ full_name: '', email: '', phone: '', department: '' });
      setSelectedCounselors([]);
      await loadCounselors();

    } catch (error) {
      console.error('벌크 수정 실패:', error);
      alert('상담원 정보 수정 중 오류가 발생했습니다.');
    } finally {
      setActionLoading(false);
    }
  };

  // ❌ 벌크 삭제  
  const handleBulkDelete = async () => {
    const selectedCounselorNames = counselors
      .filter(c => selectedCounselors.includes(c.id))
      .map(c => c.full_name);

    const confirmMessage = selectedCounselors.length === 1 
      ? `"${selectedCounselorNames[0]}" 상담원을 정말 삭제하시겠습니까?`
      : `다음 ${selectedCounselors.length}명의 상담원을 정말 삭제하시겠습니까?\n\n${selectedCounselorNames.join(', ')}\n\n이 작업은 되돌릴 수 없습니다.`;

    if (!confirm(confirmMessage)) return;

    setActionLoading(true);
    try {
      // 배정된 리드가 있는지 확인
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
        
        alert(`다음 상담원들은 현재 배정된 리드를 가지고 있어 삭제할 수 없습니다:\n\n${assignedNames.join(', ')}\n\n먼저 리드를 재배정하거나 완료 처리해주세요.`);
        return;
      }

      const { error } = await supabase
        .from('users')
        .delete()
        .in('id', selectedCounselors);

      if (error) throw error;

      alert(`${selectedCounselors.length}명의 상담원이 삭제되었습니다.`);
      setSelectedCounselors([]);
      await loadCounselors();

    } catch (error) {
      console.error('벌크 삭제 실패:', error);
      alert('상담원 삭제 중 오류가 발생했습니다.');
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
            <p className={designSystem.components.typography.body}>상담원 목록을 불러오는 중...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="mb-8">
        <h1 className={designSystem.components.typography.h2}>상담원 관리</h1>
        <p className={designSystem.components.typography.bodySm}>
          상담원을 추가하고 관리합니다.
        </p>
      </div>

      {/* 상단 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className={designSystem.utils.cn(designSystem.components.card.base, designSystem.components.card.content)}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-text-secondary">전체 상담원</p>
              <p className="text-2xl font-bold text-text-primary">{counselors.length}</p>
            </div>
            <Users className="w-8 h-8 text-accent" />
          </div>
        </div>

        <div className={designSystem.utils.cn(designSystem.components.card.base, designSystem.components.card.content)}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-text-secondary">활성 상담원</p>
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
              <p className="text-sm text-text-secondary">총 배정</p>
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
              <p className="text-sm text-text-secondary">총 완료</p>
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
        <h3 className={designSystem.components.typography.h4}>상담원 목록</h3>
        <div className="flex gap-3">
          <button
            onClick={loadCounselors}
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
            상담원 추가
          </button>
        </div>
      </div>

      {/* 상담원 추가 폼 */}
      {showAddForm && (
        <div className={designSystem.utils.cn(designSystem.components.card.base, "p-6 mb-6 bg-accent-light")}>
          <h4 className="text-lg font-medium mb-4 text-text-primary">새 상담원 추가</h4>
          <form onSubmit={handleAddCounselor} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2 text-text-primary">이메일 *</label>
              <input
                type="email"
                value={newCounselor.email}
                onChange={(e) => setNewCounselor(prev => ({ ...prev, email: e.target.value }))}
                className="w-full px-3 py-2 border border-border-primary rounded-lg bg-bg-primary text-text-primary focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
                placeholder="counselor@company.com"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2 text-text-primary">이름 *</label>
              <input
                type="text"
                value={newCounselor.full_name}
                onChange={(e) => setNewCounselor(prev => ({ ...prev, full_name: e.target.value }))}
                className="w-full px-3 py-2 border border-border-primary rounded-lg bg-bg-primary text-text-primary focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
                placeholder="홍길동"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2 text-text-primary">전화번호</label>
              <input
                type="tel"
                value={newCounselor.phone}
                onChange={(e) => setNewCounselor(prev => ({ ...prev, phone: e.target.value }))}
                className="w-full px-3 py-2 border border-border-primary rounded-lg bg-bg-primary text-text-primary focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
                placeholder="010-1234-5678"
              />
            </div>
            
            <div>
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
                추가
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAddForm(false);
                  setNewCounselor({ email: '', full_name: '', phone: '', department: '' });
                }}
                className={designSystem.components.button.secondary}
              >
                취소
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 🚀 SmartTable로 간소화된 상담원 목록 */}
      <SmartTable
        data={counselors}
        columns={counselorColumns}
        selectedItems={selectedCounselors}
        onToggleSelection={toggleCounselorSelection}
        getItemId={(counselor) => counselor.id}
        searchPlaceholder="이름, 이메일, 부서로 검색..."
        emptyMessage="등록된 상담원이 없습니다."
        height="50vh"
        minHeight="300px"
        maxHeight="600px"
      />

      {/* 벌크 수정 모달 */}
      {showBulkEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-bg-primary border border-border-primary rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-medium mb-4 text-text-primary">
              {selectedCounselors.length === 1 ? '상담원 정보 수정' : `${selectedCounselors.length}명 일괄 수정`}
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
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2 text-text-primary">이메일</label>
                <input
                  type="email"
                  value={bulkEditForm.email}
                  onChange={(e) => setBulkEditForm(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full px-3 py-2 border border-border-primary rounded-lg bg-bg-primary text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
                  placeholder={selectedCounselors.length > 1 ? "변경할 경우에만 입력" : "이메일을 입력하세요"}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2 text-text-primary">전화번호</label>
                <input
                  type="tel"
                  value={bulkEditForm.phone}
                  onChange={(e) => setBulkEditForm(prev => ({ ...prev, phone: e.target.value }))}
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
                    💡 다중 선택 시 빈 칸은 변경되지 않습니다. 변경할 정보만 입력하세요.
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
                    setBulkEditForm({ full_name: '', email: '', phone: '', department: '' });
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