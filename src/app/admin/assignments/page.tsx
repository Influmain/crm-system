// 📁 /app/admin/assignments/page.tsx
// 🔄 변경점: ToastProvider 제거, 컴포넌트 구조 간소화

'use client';

import { useState, useEffect } from 'react';
import AdminLayout from '@/components/layout/AdminLayout';
import { designSystem } from '@/lib/design-system';
import { businessIcons } from '@/lib/design-system/icons';
import { supabase, leadAssignmentService, leadPoolService } from '@/lib/supabase';
import { useAuth } from '@/lib/auth/AuthContext';
import { useToastHelpers } from '@/components/ui/Toast'; // ✅ 바로 사용 가능 (전역 제공)
import SmartTable from '@/components/ui/SmartTable';
import { RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';

// ❌ 제거: ToastProvider import 및 래핑
// ❌ 제거: 내부 컴포넌트 분리 구조

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

// ✅ 간소화: 바로 메인 컴포넌트에서 토스트 사용
export default function AssignmentsPage() {
  const { user } = useAuth();
  const toast = useToastHelpers(); // ✅ 전역에서 제공되므로 바로 사용 가능
  
  // 📊 기본 데이터 상태
  const [availableLeads, setAvailableLeads] = useState<Lead[]>([]);
  const [counselors, setCounselors] = useState<Counselor[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'assign' | 'manage'>('assign');
  
  // 📈 통계 상태 추가
  const [totalLeadsInDB, setTotalLeadsInDB] = useState(0);

  // 🎯 선택 관련 상태
  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);
  const [selectedCounselor, setSelectedCounselor] = useState<string>('');
  
  // 🔄 재배정 관련 상태
  const [selectedCounselorForView, setSelectedCounselorForView] = useState<string>('');
  const [counselorAssignments, setCounselorAssignments] = useState<Assignment[]>([]);
  const [selectedAssignments, setSelectedAssignments] = useState<string[]>([]);
  const [newCounselorForReassign, setNewCounselorForReassign] = useState<string>('');
  const [loadingCounselorData, setLoadingCounselorData] = useState(false);

  // 📄 페이지네이션 상태
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const itemsPerPage = 50;

  // 📄 재배정 페이지네이션 상태 추가
  const [reassignPage, setReassignPage] = useState(1);
  const [reassignTotalCount, setReassignTotalCount] = useState(0);
  const [reassignTotalPages, setReassignTotalPages] = useState(0);
  const reassignItemsPerPage = 30;

  // 🔍 리드 목록용 칼럼 정의
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

  // 🎯 재배정용 칼럼 정의
  const reassignmentColumns = [
    {
      key: 'lead_info',
      label: '고객 정보',
      icon: businessIcons.phone,
      width: 'w-48',
      render: (value: any, record: Assignment) => (
        <div>
          <div className="font-medium text-text-primary">
            {record.lead?.name || record.lead?.contact_name || '이름 없음'}
          </div>
          <div className="text-sm text-text-secondary flex items-center">
            <businessIcons.phone className="w-3 h-3 mr-1" />
            {record.lead?.phone || '전화번호 없음'}
          </div>
        </div>
      )
    },
    {
      key: 'data_source',
      label: '출처',
      icon: businessIcons.company,
      width: 'w-32',
      render: (value: any, record: Assignment) => (
        <div className="flex items-center space-x-1">
          <businessIcons.company className="w-3 h-3 text-text-tertiary flex-shrink-0" />
          <span className="text-sm text-text-primary truncate">{record.lead?.data_source || '출처 없음'}</span>
        </div>
      )
    },
    {
      key: 'contact_script',
      label: '관심사항',
      icon: businessIcons.script,
      width: 'w-32',
      render: (value: any, record: Assignment) => (
        <div className="text-sm text-text-secondary truncate">
          {record.lead?.contact_script || '미분류'}
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

  // 📊 전체 DB 리드 수 로드 함수
  const loadTotalLeadsCount = async () => {
    try {
      const { count } = await supabase
        .from('lead_pool')
        .select('*', { count: 'exact', head: true });
      
      setTotalLeadsInDB(count || 0);
    } catch (error) {
      console.error('전체 리드 수 조회 실패:', error);
    }
  };

  // 📊 상담원 데이터 로드
  const loadCounselors = async () => {
    try {
      const { data: counselorsData, error: counselorsError } = await supabase
        .from('users')
        .select('*')
        .eq('role', 'counselor')
        .eq('is_active', true)
        .order('full_name', { ascending: true });

      if (counselorsError) throw counselorsError;

      // 각 상담원의 배정 통계 조회
      const counselorsWithStats = await Promise.all(
        (counselorsData || []).map(async (counselor) => {
          const { count: activeCount } = await supabase
            .from('lead_assignments')
            .select('*', { count: 'exact', head: true })
            .eq('counselor_id', counselor.id)
            .eq('status', 'active');

          return {
            ...counselor,
            assigned_count: activeCount || 0,
            active_count: activeCount || 0,
            completed_count: 0
          };
        })
      );

      setCounselors(counselorsWithStats);
    } catch (error) {
      console.error('상담원 로드 실패:', error);
      toast.error('상담원 로드 실패', '상담원 목록을 불러오는 중 오류가 발생했습니다.');
    }
  };

  // 📊 사용 가능한 리드 로드
  const loadAvailableLeads = async (page: number = 1, searchQuery: string = '') => {
    try {
      console.log(`=== 리드 로드: 페이지 ${page} ===`);
      
      const startRange = (page - 1) * itemsPerPage;
      const endRange = startRange + itemsPerPage - 1;

      let query = supabase
        .from('lead_pool')
        .select(`
          id, phone, name, contact_name, data_source, contact_script, 
          created_at, upload_batch_id, status, data_date
        `, { count: 'exact' })
        .eq('status', 'available')
        .order('created_at', { ascending: false })
        .range(startRange, endRange);

      if (searchQuery.trim()) {
        query = query.or(`phone.ilike.%${searchQuery}%,contact_name.ilike.%${searchQuery}%,data_source.ilike.%${searchQuery}%`);
      }

      const { data: leadsData, error: leadsError, count } = await query;

      if (leadsError) throw leadsError;

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
      setTotalCount(count || 0);
      setTotalPages(Math.ceil((count || 0) / itemsPerPage));
      setCurrentPage(page);

      console.log(`페이지 ${page}: ${leadsWithBatch.length}개 로드, 전체: ${count}개`);

    } catch (error) {
      console.error('리드 로드 실패:', error);
      toast.error('리드 로드 실패', `리드를 불러오는 중 오류가 발생했습니다: ${error.message}`);
    }
  };

  // 📋 배정 실행
  const handleAssign = async () => {
    if (!selectedCounselor || selectedLeads.length === 0) {
      toast.warning('선택 확인', '상담원과 리드를 선택해주세요.');
      return;
    }

    if (!user?.id) {
      toast.error('인증 오류', '로그인이 필요합니다.');
      return;
    }

    setActionLoading(true);
    try {
      const counselorName = counselors.find(c => c.id === selectedCounselor)?.full_name;
      
      for (const leadId of selectedLeads) {
        await leadAssignmentService.assign(leadId, selectedCounselor, user.id);
      }

      // ✅ 성공 토스트
      toast.success(
        '배정 완료', 
        `${selectedLeads.length}개의 리드가 ${counselorName}에게 성공적으로 배정되었습니다.`,
        {
          action: {
            label: '배정 현황 보기',
            onClick: () => setActiveTab('manage')
          }
        }
      );
      
      setSelectedLeads([]);
      setSelectedCounselor('');
      
      await loadAvailableLeads(currentPage);
      await loadCounselors();
      await loadTotalLeadsCount();

    } catch (error) {
      console.error('배정 실패:', error);
      toast.error(
        '배정 실패', 
        error.message || '알 수 없는 오류가 발생했습니다.',
        {
          action: {
            label: '다시 시도',
            onClick: () => handleAssign()
          }
        }
      );
    } finally {
      setActionLoading(false);
    }
  };

  // 🔄 특정 상담원의 배정 목록 로드 (페이지네이션 추가)
  const loadCounselorAssignments = async (counselorId: string, page: number = 1) => {
    if (!counselorId) {
      setCounselorAssignments([]);
      setReassignTotalCount(0);
      setReassignTotalPages(0);
      return;
    }

    setLoadingCounselorData(true);
    try {
      console.log(`=== 상담원 ${counselorId}의 배정 목록 로드 (페이지 ${page}) ===`);
      
      const startRange = (page - 1) * reassignItemsPerPage;
      const endRange = startRange + reassignItemsPerPage - 1;
      
      // 1단계: 해당 상담원의 배정 목록 조회 (페이지네이션 적용)
      const { data: assignmentsData, error: assignmentsError, count } = await supabase
        .from('lead_assignments')
        .select('*', { count: 'exact' })
        .eq('counselor_id', counselorId)
        .eq('status', 'active')
        .order('assigned_at', { ascending: false })
        .range(startRange, endRange);

      if (assignmentsError) throw assignmentsError;

      console.log(`상담원 배정 목록: ${assignmentsData?.length || 0}개 (페이지 ${page})`);

      // 2단계: 각 배정의 리드 정보 조회
      const enrichedAssignments = await Promise.all(
        (assignmentsData || []).map(async (assignment) => {
          const { data: leadData } = await supabase
            .from('lead_pool')
            .select('id, phone, name, contact_name, data_source, contact_script')
            .eq('id', assignment.lead_id)
            .single();

          const { data: counselorData } = await supabase
            .from('users')
            .select('id, full_name, email')
            .eq('id', assignment.counselor_id)
            .single();

          return {
            ...assignment,
            lead: leadData || { id: assignment.lead_id, phone: '알 수 없음', name: '알 수 없음', contact_name: '알 수 없음', data_source: '알 수 없음' },
            counselor: counselorData || { id: assignment.counselor_id, full_name: '알 수 없음', email: '알 수 없음' }
          };
        })
      );

      setCounselorAssignments(enrichedAssignments);
      setReassignTotalCount(count || 0);
      setReassignTotalPages(Math.ceil((count || 0) / reassignItemsPerPage));
      setReassignPage(page);
      setSelectedAssignments([]); // 선택 초기화

    } catch (error) {
      console.error('상담원 배정 목록 로드 실패:', error);
      toast.error('배정 목록 로드 실패', '상담원의 배정 목록을 불러오는 중 오류가 발생했습니다.');
      setCounselorAssignments([]);
    } finally {
      setLoadingCounselorData(false);
    }
  };

  // 🔄 재배정 실행
  const handleReassign = async () => {
    if (!newCounselorForReassign || selectedAssignments.length === 0) {
      toast.warning('선택 확인', '새로운 상담원과 재배정할 리드를 선택해주세요.');
      return;
    }

    if (!user?.id) {
      toast.error('인증 오류', '로그인이 필요합니다.');
      return;
    }

    setActionLoading(true);
    try {
      console.log(`=== 재배정 실행: ${selectedAssignments.length}개 ===`);

      for (const assignmentId of selectedAssignments) {
        // 기존 배정 삭제
        await supabase
          .from('lead_assignments')
          .delete()
          .eq('id', assignmentId);

        // 해당 배정의 리드 정보 조회
        const assignment = counselorAssignments.find(a => a.id === assignmentId);
        if (assignment) {
          // 새로운 배정 생성
          await leadAssignmentService.assign(assignment.lead_id, newCounselorForReassign, user.id);
        }
      }

      // ✅ 성공 토스트
      const oldCounselor = counselors.find(c => c.id === selectedCounselorForView)?.full_name;
      const newCounselor = counselors.find(c => c.id === newCounselorForReassign)?.full_name;
      
      toast.success(
        '재배정 완료',
        `${selectedAssignments.length}개 리드가 ${oldCounselor}에서 ${newCounselor}으로 재배정되었습니다.`,
        {
          action: {
            label: '새로고침',
            onClick: () => window.location.reload()
          }
        }
      );
      
      // 데이터 새로고침
      await loadCounselorAssignments(selectedCounselorForView, reassignPage);
      await loadCounselors();
      setSelectedAssignments([]);
      setNewCounselorForReassign('');

    } catch (error) {
      console.error('재배정 실패:', error);
      toast.error(
        '재배정 실패',
        error.message || '알 수 없는 오류가 발생했습니다.',
        {
          action: {
            label: '다시 시도',
            onClick: () => handleReassign()
          }
        }
      );
    } finally {
      setActionLoading(false);
    }
  };

  // 🎯 배정 선택/해제
  const toggleAssignmentSelection = (assignmentId: string) => {
    setSelectedAssignments(prev => 
      prev.includes(assignmentId) 
        ? prev.filter(id => id !== assignmentId)
        : [...prev, assignmentId]
    );
  };

  // ✅ 전체 선택/해제 함수 추가
  const toggleAllAssignments = () => {
    if (selectedAssignments.length === counselorAssignments.length) {
      setSelectedAssignments([]);
    } else {
      setSelectedAssignments(counselorAssignments.map(assignment => assignment.id));
    }
  };

  const toggleLeadSelection = (leadId: string) => {
    setSelectedLeads(prev => 
      prev.includes(leadId) 
        ? prev.filter(id => id !== leadId)
        : [...prev, leadId]
    );
  };

  const toggleAllLeads = () => {
    if (selectedLeads.length === availableLeads.length) {
      setSelectedLeads([]);
    } else {
      setSelectedLeads(availableLeads.map(lead => lead.id));
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadCounselors(),
        loadAvailableLeads(currentPage),
        loadTotalLeadsCount()
      ]);
    } catch (error) {
      console.error('데이터 로드 실패:', error);
      toast.error('데이터 로드 실패', '페이지 데이터를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // 탭 변경 시 해당 데이터 다시 로드
  useEffect(() => {
    if (activeTab === 'assign') {
      loadAvailableLeads(currentPage);
    }
    // 배정관리 탭은 상담원 선택 시에만 로드
  }, [activeTab]);

  const PaginationComponent = ({ currentPage, totalPages, totalCount, onPageChange, itemsPerPage }: any) => {
    const startItem = (currentPage - 1) * itemsPerPage + 1;
    const endItem = Math.min(currentPage * itemsPerPage, totalCount);

    return (
      <div className="flex items-center justify-between px-4 py-3 bg-bg-primary border-t border-border-primary">
        <div className="flex items-center text-sm text-text-secondary">
          <span>
            총 {totalCount.toLocaleString()}개 중 {startItem.toLocaleString()}-{endItem.toLocaleString()}개 표시
          </span>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage <= 1}
            className={designSystem.utils.cn(
              "p-2 rounded-lg border",
              currentPage <= 1
                ? "bg-bg-secondary text-text-tertiary cursor-not-allowed"
                : "bg-bg-primary text-text-primary hover:bg-bg-hover border-border-primary"
            )}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          
          <span className="px-3 py-2 text-sm text-text-primary">
            {currentPage} / {totalPages}
          </span>
          
          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage >= totalPages}
            className={designSystem.utils.cn(
              "p-2 rounded-lg border",
              currentPage >= totalPages
                ? "bg-bg-secondary text-text-tertiary cursor-not-allowed"
                : "bg-bg-primary text-text-primary hover:bg-bg-hover border-border-primary"
            )}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
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
              재배정 관리
            </button>
          </nav>
        </div>
      </div>

      {activeTab === 'assign' ? (
        <>
          {/* 상단 통계 요약 */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-6">
            <div className={designSystem.utils.cn(designSystem.components.card.base, designSystem.components.card.content)}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-text-secondary">전체 리드</p>
                  <p className="text-2xl font-bold text-text-primary">{totalLeadsInDB.toLocaleString()}</p>
                </div>
                <businessIcons.analytics className="w-8 h-8 text-text-tertiary" />
              </div>
            </div>

            <div className={designSystem.utils.cn(designSystem.components.card.base, designSystem.components.card.content)}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-text-secondary">대기 리드</p>
                  <p className="text-2xl font-bold text-text-primary">{totalCount.toLocaleString()}</p>
                </div>
                <businessIcons.contact className="w-8 h-8 text-text-tertiary" />
              </div>
            </div>

            <div className={designSystem.utils.cn(designSystem.components.card.base, designSystem.components.card.content)}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-text-secondary">활성 상담원</p>
                  <p className="text-2xl font-bold text-text-primary">{counselors.length}</p>
                </div>
                <businessIcons.team className="w-8 h-8 text-text-tertiary" />
              </div>
            </div>

            <div className={designSystem.utils.cn(designSystem.components.card.base, designSystem.components.card.content)}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-text-secondary">선택된 리드</p>
                  <p className="text-2xl font-bold text-accent">{selectedLeads.length}</p>
                </div>
                <businessIcons.success className="w-8 h-8 text-accent" />
              </div>
            </div>

            <div className={designSystem.utils.cn(designSystem.components.card.base, designSystem.components.card.content)}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-text-secondary">배정된 리드</p>
                  <p className="text-2xl font-bold text-text-primary">{counselors.reduce((sum, c) => sum + c.active_count, 0)}</p>
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
                      <businessIcons.success className="w-4 h-4 mr-2" />
                    )}
                    {selectedLeads.length}개 배정
                  </button>
                  
                  <button
                    onClick={() => setSelectedLeads([])}
                    className={designSystem.components.button.secondary}
                  >
                    선택 해제
                  </button>

                  <button
                    onClick={toggleAllLeads}
                    className={designSystem.components.button.secondary}
                  >
                    {selectedLeads.length === availableLeads.length ? '전체 해제' : '전체 선택'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 리드 목록 테이블 */}
          <div className="bg-bg-primary border border-border-primary rounded-lg overflow-hidden">
            <SmartTable
              data={availableLeads}
              columns={leadColumns}
              selectedItems={selectedLeads}
              onToggleSelection={toggleLeadSelection}
              getItemId={(lead) => lead.id}
              searchPlaceholder="전화번호, 이름, 출처로 검색..."
              emptyMessage="배정 가능한 리드가 없습니다."
              height="calc(100vh - 500px)"
            />
            
            <PaginationComponent
              currentPage={currentPage}
              totalPages={totalPages}
              totalCount={totalCount}
              onPageChange={(page) => loadAvailableLeads(page)}
              itemsPerPage={itemsPerPage}
            />
          </div>
        </>
      ) : (
        <>
          {/* 재배정 관리 헤더 */}
          <div className="mb-6">
            <h3 className={designSystem.components.typography.h4}>재배정 관리</h3>
            <p className={designSystem.components.typography.bodySm}>
              상담원을 선택하여 해당 상담원의 리드를 다른 상담원에게 재배정할 수 있습니다.
            </p>
          </div>

          {/* 상담원 선택 */}
          <div className={designSystem.utils.cn(designSystem.components.card.base, designSystem.components.card.content, 'mb-6')}>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-text-primary mb-2">
                  상담원 선택
                </label>
                <select
                  value={selectedCounselorForView}
                  onChange={(e) => {
                    setSelectedCounselorForView(e.target.value);
                    setReassignPage(1); // 페이지 초기화
                    loadCounselorAssignments(e.target.value, 1);
                  }}
                  className="w-full px-3 py-2 border border-border-primary rounded-lg bg-bg-primary text-text-primary"
                  disabled={loadingCounselorData}
                >
                  <option value="">상담원을 선택하세요</option>
                  {counselors.map(counselor => (
                    <option key={counselor.id} value={counselor.id}>
                      {counselor.full_name} ({counselor.active_count}개 배정)
                    </option>
                  ))}
                </select>
              </div>
              
              {selectedCounselorForView && (
                <div className="flex items-center gap-4 pt-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-accent">{reassignTotalCount}</div>
                    <div className="text-xs text-text-secondary">총 배정</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-text-primary">{selectedAssignments.length}</div>
                    <div className="text-xs text-text-secondary">선택됨</div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 재배정 액션 바 */}
          {selectedAssignments.length > 0 && (
            <div className="sticky top-0 bg-bg-primary border border-border-primary p-4 z-10 shadow-sm mb-6 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-text-primary">
                  {selectedAssignments.length}개 리드 선택됨
                </span>
                
                <div className="flex items-center space-x-3">
                  <select
                    value={newCounselorForReassign}
                    onChange={(e) => setNewCounselorForReassign(e.target.value)}
                    className="px-3 py-2 border border-border-primary rounded-lg bg-bg-primary text-text-primary"
                  >
                    <option value="">새 상담원 선택</option>
                    {counselors
                      .filter(c => c.id !== selectedCounselorForView)
                      .map(counselor => (
                        <option key={counselor.id} value={counselor.id}>
                          {counselor.full_name} (현재: {counselor.active_count}개)
                        </option>
                      ))}
                  </select>
                  
                  <button
                    onClick={handleReassign}
                    disabled={!newCounselorForReassign || actionLoading}
                    className={designSystem.components.button.primary}
                  >
                    {actionLoading ? (
                      <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <RefreshCw className="w-4 h-4 mr-2" />
                    )}
                    {selectedAssignments.length}개 재배정
                  </button>
                  
                  <button
                    onClick={() => setSelectedAssignments([])}
                    className={designSystem.components.button.secondary}
                  >
                    선택 해제
                  </button>

                  <button
                    onClick={toggleAllAssignments}
                    className={designSystem.components.button.secondary}
                  >
                    {selectedAssignments.length === counselorAssignments.length ? '전체 해제' : '전체 선택'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 상담원별 리드 목록 */}
          {selectedCounselorForView ? (
            <div className="bg-bg-primary border border-border-primary rounded-lg overflow-hidden">
              {loadingCounselorData ? (
                <div className="p-8 text-center">
                  <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-accent" />
                  <p className="text-text-secondary">상담원의 배정 목록을 불러오는 중...</p>
                </div>
              ) : counselorAssignments.length > 0 ? (
                <>
                  <SmartTable
                    data={counselorAssignments}
                    columns={reassignmentColumns}
                    selectedItems={selectedAssignments}
                    onToggleSelection={toggleAssignmentSelection}
                    getItemId={(assignment) => assignment.id}
                    searchPlaceholder="고객 이름, 전화번호로 검색..."
                    emptyMessage="해당 상담원에게 배정된 리드가 없습니다."
                    height="calc(100vh - 500px)"
                  />
                  
                  {/* 재배정 페이지네이션 */}
                  <PaginationComponent
                    currentPage={reassignPage}
                    totalPages={reassignTotalPages}
                    totalCount={reassignTotalCount}
                    onPageChange={(page) => loadCounselorAssignments(selectedCounselorForView, page)}
                    itemsPerPage={reassignItemsPerPage}
                  />
                </>
              ) : (
                <div className="p-8 text-center">
                  <div className="text-6xl mb-4">📋</div>
                  <p className="text-text-secondary mb-2">해당 상담원에게 배정된 리드가 없습니다.</p>
                  <p className="text-sm text-text-tertiary">다른 상담원을 선택해보세요.</p>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-bg-primary border border-border-primary rounded-lg p-12 text-center">
              <div className="text-6xl mb-4">👆</div>
              <h4 className={designSystem.components.typography.h5}>상담원을 선택하세요</h4>
              <p className="text-text-secondary mt-2">
                위에서 상담원을 선택하면 해당 상담원의 배정된 리드 목록을 확인할 수 있습니다.
              </p>
            </div>
          )}
        </>
      )}
    </AdminLayout>
  );
}