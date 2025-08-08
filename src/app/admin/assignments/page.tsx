'use client';

import { useState, useEffect } from 'react';
import AdminLayout from '@/components/layout/AdminLayout';
import { designSystem } from '@/lib/design-system';
import { businessIcons } from '@/lib/design-system/icons';
import { supabase, leadAssignmentService, leadPoolService } from '@/lib/supabase';
import { useAuth } from '@/lib/auth/AuthContext'; // ✅ 추가된 import
import NotionStyleTable from '@/components/ui/SmartTable';
import { Users, UserCheck, Check, X, RefreshCw, Mail } from 'lucide-react';

interface Lead {
  id: string;
  phone: string;
  name: string;
  contact_name: string;
  data_source: string;
  contact_script: string;
  data_date: string;
  created_at: string;
  batch_name: string;
  upload_batch_id: string;
}

interface Counselor {
  id: string;
  full_name: string;
  email: string;
  assigned_count: number;
  active_count: number;
  completed_count: number;
}

interface Assignment {
  id: string;
  lead_id: string;
  counselor_id: string;
  assigned_at: string;
  status: string;
  lead: Lead;
  counselor: Counselor;
}

export default function AssignmentsPage() {
  // ✅ useAuth 훅 추가
  const { user } = useAuth();
  
  // 📊 기본 데이터 상태
  const [availableLeads, setAvailableLeads] = useState<Lead[]>([]);
  const [counselors, setCounselors] = useState<Counselor[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'assign' | 'manage'>('assign');

  // 🎯 선택 관련 상태
  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);
  const [selectedCounselor, setSelectedCounselor] = useState<string>('');

  // 🔍 리드 목록용 칼럼 정의 (노션 스타일 검색 포함)
  const leadColumns = [
    {
      key: 'phone',
      label: '연락처',
      icon: businessIcons.phone,
      width: 'w-40',
      render: (value: string, record: Lead, searchQuery?: string) => (
        <div className="flex items-center">
          <businessIcons.phone className="w-3 h-3 mr-2 text-text-tertiary flex-shrink-0" />
          <span className="text-sm font-medium text-text-primary truncate">
            {highlightText(value, searchQuery || '')}
          </span>
        </div>
      )
    },
    {
      key: 'contact_name',
      label: '접근정보',
      icon: businessIcons.contact,
      width: 'w-32',
      render: (value: string, record: Lead, searchQuery?: string) => (
        <div className="text-sm text-accent truncate font-medium">
          {highlightText(value || '미설정', searchQuery || '')}
        </div>
      )
    },
    {
      key: 'contact_script',
      label: '관심사항',
      icon: businessIcons.script,
      width: 'w-32',
      render: (value: string, record: Lead, searchQuery?: string) => (
        <div className="text-sm text-text-secondary truncate">
          {highlightText(value || '미분류', searchQuery || '')}
        </div>
      )
    },
    {
      key: 'data_source',
      label: '출처',
      icon: businessIcons.company,
      width: 'w-40',
      render: (value: string, record: Lead, searchQuery?: string) => (
        <div>
          <div className="text-sm text-text-primary truncate font-medium">
            {highlightText(value, searchQuery || '')}
          </div>
          <div className="text-xs text-text-tertiary truncate">
            {highlightText(record.batch_name, searchQuery || '')}
          </div>
        </div>
      )
    },
    {
      key: 'created_at',
      label: '등록일',
      icon: businessIcons.date,
      width: 'w-28',
      render: (value: string) => (
        <div className="text-sm text-text-tertiary">
          {new Date(value).toLocaleDateString('ko-KR', { 
            month: 'numeric', 
            day: 'numeric' 
          })}
        </div>
      )
    }
  ];

  // 🎯 배정 관리용 칼럼 정의
  const assignmentColumns = [
    {
      key: 'counselor',
      label: '상담원',
      icon: businessIcons.contact,
      width: 'w-48',
      sortable: false,
      render: (value: any, record: Assignment) => (
        <div className="flex items-center space-x-2">
          <UserCheck className="w-4 h-4 text-success flex-shrink-0" />
          <div>
            <div className="font-medium text-text-primary">{record.counselor.full_name}</div>
            <div className="text-xs text-text-secondary flex items-center">
              <Mail className="w-3 h-3 mr-1" />
              {record.counselor.email}
            </div>
          </div>
        </div>
      )
    },
    {
      key: 'lead',
      label: '고객 정보',
      icon: businessIcons.phone,
      width: 'w-40',
      sortable: false,
      render: (value: any, record: Assignment) => (
        <div>
          <div className="font-medium text-text-primary">{record.lead.name || record.lead.contact_name}</div>
          <div className="text-sm text-text-secondary flex items-center">
            <businessIcons.phone className="w-3 h-3 mr-1" />
            {record.lead.phone}
          </div>
        </div>
      )
    },
    {
      key: 'data_source',
      label: '데이터 소스',
      icon: businessIcons.company,
      width: 'w-32',
      render: (value: any, record: Assignment) => (
        <div className="flex items-center space-x-1">
          <businessIcons.company className="w-3 h-3 text-text-tertiary flex-shrink-0" />
          <span className="text-sm text-text-primary truncate">{record.lead.data_source}</span>
        </div>
      )
    },
    {
      key: 'assigned_at',
      label: '배정일',
      icon: businessIcons.date,
      width: 'w-28',
      render: (value: string) => (
        <div className="flex items-center space-x-1">
          <businessIcons.date className="w-3 h-3 text-text-tertiary flex-shrink-0" />
          <span className="text-sm text-text-primary">
            {new Date(value).toLocaleDateString('ko-KR', { 
              month: 'numeric', 
              day: 'numeric' 
            })}
          </span>
        </div>
      )
    },
    {
      key: 'status',
      label: '상태',
      icon: Check,
      width: 'w-24',
      sortable: false,
      render: (value: string) => (
        <span className={designSystem.utils.cn(
          "px-2 py-1 text-xs rounded-full",
          value === 'active' 
            ? "bg-success-light text-success"
            : "bg-warning-light text-warning"
        )}>
          {value === 'active' ? '활성' : '대기'}
        </span>
      )
    },
    {
      key: 'actions',
      label: '액션',
      icon: X,
      width: 'w-20',
      sortable: false,
      render: (value: any, record: Assignment) => (
        <div className="text-center">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleUnassign(record.id, record.lead_id);
            }}
            disabled={actionLoading}
            className="text-error hover:text-error/80 p-1"
            title="배정 취소"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )
    }
  ];

  // 🎨 텍스트 하이라이트 함수
  const highlightText = (text: string, query: string): React.ReactNode => {
    if (!query.trim()) return text;
    
    const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp('(' + escapedQuery + ')', 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, index) => 
      regex.test(part) ? (
        <span key={index} className="bg-accent-light text-accent font-medium rounded px-0.5">
          {part}
        </span>
      ) : part
    );
  };

  // 📊 데이터 로드
  const loadData = async () => {
    setLoading(true);
    try {
      console.log('=== 배정 페이지 데이터 로드 시작 ===');
      
      // 1. 상담원 조회
      const { data: counselorsData, error: counselorsError } = await supabase
        .from('users')
        .select('*')
        .eq('role', 'counselor')
        .eq('is_active', true)
        .order('full_name', { ascending: true });

      if (counselorsError) throw counselorsError;

      const counselorsWithStats = (counselorsData || []).map(counselor => ({
        ...counselor,
        assigned_count: 0,
        active_count: 0,
        completed_count: 0
      }));

      setCounselors(counselorsWithStats);

      // 2. 사용 가능한 리드 조회 (처음 1000개만)
      const { data: leadsData, error: leadsError } = await supabase
        .from('lead_pool')
        .select(`
          id, phone, name, contact_name, data_source, contact_script, 
          created_at, upload_batch_id, status, data_date
        `)
        .eq('status', 'available')
        .limit(1000)
        .order('created_at', { ascending: false });

      if (leadsError) throw leadsError;

      // 배치 정보 추가
      const leadsWithBatch = await Promise.all(
        (leadsData || []).map(async (lead) => {
          let batchName = 'Unknown Batch';
          
          if (lead.upload_batch_id) {
            try {
              const { data: batch } = await supabase
                .from('upload_batches')
                .select('file_name')
                .eq('id', lead.upload_batch_id)
                .single();
              
              if (batch) {
                batchName = batch.file_name;
              }
            } catch (error) {
              console.warn('배치 정보 조회 실패:', error);
            }
          }
          
          return {
            ...lead,
            batch_name: batchName
          };
        })
      );

      setAvailableLeads(leadsWithBatch);

      // 3. 현재 배정 목록 조회
      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from('lead_assignments')
        .select(`
          id, lead_id, counselor_id, assigned_at, status,
          lead:lead_pool(id, phone, name, contact_name, data_source),
          counselor:users(id, full_name, email)
        `)
        .in('status', ['active', 'working'])
        .order('assigned_at', { ascending: false });

      if (!assignmentsError) {
        setAssignments(assignmentsData || []);
      }

      console.log('=== 데이터 로드 완료 ===');

    } catch (error) {
      console.error('데이터 로드 실패:', error);
      alert(`데이터를 불러오는 중 오류가 발생했습니다: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // 🎯 리드 선택/해제
  const toggleLeadSelection = (leadId: string) => {
    setSelectedLeads(prev => 
      prev.includes(leadId) 
        ? prev.filter(id => id !== leadId)
        : [...prev, leadId]
    );
  };

  // 📋 배정 실행 - ✅ 수정된 버전
  const handleAssign = async () => {
    if (!selectedCounselor || selectedLeads.length === 0) {
      alert('상담원과 리드를 선택해주세요.');
      return;
    }

    // ✅ 추가: 현재 로그인한 사용자 확인
    if (!user?.id) {
      alert('로그인이 필요합니다.');
      return;
    }

    setActionLoading(true);
    try {
      for (const leadId of selectedLeads) {
        // ✅ 수정: 실제 사용자 ID 사용 (기존: 'admin-user')
        await leadAssignmentService.assign(leadId, selectedCounselor, user.id);
      }

      alert(`${selectedLeads.length}개의 리드가 성공적으로 배정되었습니다.`);
      
      setSelectedLeads([]);
      setSelectedCounselor('');
      await loadData(); // 전체 새로고침

    } catch (error) {
      console.error('배정 실패:', error);
      alert(`배정 실패: ${error.message || '알 수 없는 오류'}`);
    } finally {
      setActionLoading(false);
    }
  };

  // ❌ 배정 취소
  const handleUnassign = async (assignmentId: string, leadId: string) => {
    if (!confirm('이 배정을 취소하시겠습니까?')) return;

    setActionLoading(true);
    try {
      const { error: deleteError } = await supabase
        .from('lead_assignments')
        .delete()
        .eq('id', assignmentId);

      if (deleteError) throw deleteError;

      await leadPoolService.updateStatus(leadId, 'available');

      alert('배정이 취소되었습니다.');
      await loadData();

    } catch (error) {
      console.error('배정 취소 실패:', error);
      alert('배정 취소 중 오류가 발생했습니다.');
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
            <p className={designSystem.components.typography.body}>데이터를 불러오는 중...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="mb-8">
        <h1 className={designSystem.components.typography.h2}>리드 배정 관리</h1>
        <p className={designSystem.components.typography.bodySm}>
          상담원에게 리드를 배정하고 관리합니다.
        </p>
      </div>

      {/* 탭 네비게이션 */}
      <div className="mb-6">
        <div className="border-b border-border-primary">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('assign')}
              className={designSystem.utils.cn(
                "py-2 px-1 border-b-2 font-medium text-sm",
                activeTab === 'assign'
                  ? "border-accent text-accent"
                  : "border-transparent text-text-secondary hover:text-text-primary hover:border-border-secondary"
              )}
            >
              신규 배정
            </button>
            <button
              onClick={() => setActiveTab('manage')}
              className={designSystem.utils.cn(
                "py-2 px-1 border-b-2 font-medium text-sm",
                activeTab === 'manage'
                  ? "border-accent text-accent"
                  : "border-transparent text-text-secondary hover:text-text-primary hover:border-border-secondary"
              )}
            >
              배정 관리
            </button>
          </nav>
        </div>
      </div>

      {activeTab === 'assign' ? (
        <>
          {/* 상단 통계 요약 */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            <div className={designSystem.utils.cn(designSystem.components.card.base, designSystem.components.card.content)}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-text-secondary">대기 리드</p>
                  <p className="text-2xl font-bold text-text-primary">{availableLeads.length.toLocaleString()}</p>
                </div>
                <Users className="w-8 h-8 text-accent" />
              </div>
            </div>

            <div className={designSystem.utils.cn(designSystem.components.card.base, designSystem.components.card.content)}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-text-secondary">활성 상담원</p>
                  <p className="text-2xl font-bold text-success">{counselors.length}</p>
                </div>
                <UserCheck className="w-8 h-8 text-success" />
              </div>
            </div>

            <div className={designSystem.utils.cn(designSystem.components.card.base, designSystem.components.card.content)}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-text-secondary">선택된 리드</p>
                  <p className="text-2xl font-bold text-warning">{selectedLeads.length}</p>
                </div>
                <Check className="w-8 h-8 text-warning" />
              </div>
            </div>

            <div className={designSystem.utils.cn(designSystem.components.card.base, designSystem.components.card.content)}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-text-secondary">전체 배정</p>
                  <p className="text-2xl font-bold text-text-primary">{assignments.length}</p>
                </div>
                <businessIcons.assignment className="w-8 h-8 text-text-tertiary" />
              </div>
            </div>
          </div>

          {/* 벌크 액션 바 */}
          {selectedLeads.length > 0 && (
            <div className="sticky top-0 bg-bg-primary border border-border-primary p-4 z-10 shadow-sm mb-6 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-text-primary">
                  {selectedLeads.length}개 리드 선택됨
                </span>
                
                <div className="flex items-center space-x-3">
                  <select
                    value={selectedCounselor}
                    onChange={(e) => setSelectedCounselor(e.target.value)}
                    className="px-3 py-2 border border-border-primary rounded-lg bg-bg-primary text-text-primary"
                  >
                    <option value="">상담원 선택</option>
                    {counselors.map(counselor => (
                      <option key={counselor.id} value={counselor.id}>
                        {counselor.full_name} (활성: {counselor.active_count})
                      </option>
                    ))}
                  </select>
                  
                  <button
                    onClick={handleAssign}
                    disabled={!selectedCounselor || actionLoading}
                    className={designSystem.components.button.primary}
                  >
                    {actionLoading ? (
                      <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <Check className="w-4 h-4 mr-2" />
                    )}
                    {selectedLeads.length}개 배정
                  </button>
                  
                  <button
                    onClick={() => setSelectedLeads([])}
                    className={designSystem.components.button.secondary}
                  >
                    선택 해제
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 🚀 노션 스타일 테이블 (검색 포함) */}
          <NotionStyleTable
            data={availableLeads}
            columns={leadColumns}
            selectedItems={selectedLeads}
            onToggleSelection={toggleLeadSelection}
            getItemId={(lead) => lead.id}
            searchPlaceholder="전화번호, 이름, 출처로 검색..."
            emptyMessage="배정 가능한 리드가 없습니다."
          />
        </>
      ) : (
        <>
          {/* 배정 관리 헤더 */}
          <div className="flex justify-between items-center mb-6">
            <h3 className={designSystem.components.typography.h4}>현재 배정 현황</h3>
            <button
              onClick={loadData}
              disabled={loading}
              className={designSystem.components.button.secondary}
            >
              <RefreshCw className={designSystem.utils.cn("w-4 h-4 mr-2", loading && "animate-spin")} />
              새로고침
            </button>
          </div>

          {/* 🚀 배정 관리 테이블 (검색 없음) */}
          <NotionStyleTable
            data={assignments}
            columns={assignmentColumns}
            getItemId={(assignment) => assignment.id}
            searchPlaceholder="상담원, 고객 이름으로 검색..."
            emptyMessage="현재 배정된 리드가 없습니다."
          />
        </>
      )}
    </AdminLayout>
  );
}