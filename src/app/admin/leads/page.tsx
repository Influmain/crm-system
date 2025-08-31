'use client';

import { useState, useEffect, useCallback } from 'react';
import AdminLayout from '@/components/layout/AdminLayout';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { useToastHelpers } from '@/components/ui/Toast';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth/AuthContext';
import { designSystem } from '@/lib/design-system';
import { businessIcons } from '@/lib/design-system/icons';
import { 
  Search, 
  RefreshCw, 
  ChevronLeft, 
  ChevronRight,
  CheckSquare,
  Square,
  User,
  Phone,
  Calendar,
  MessageSquare,
  UserCheck,
  UserX,
  FileCheck,
  AlertTriangle,
  Edit,
  Trash2
} from 'lucide-react';

// 뷰 기반 타입 정의
interface Lead {
  id: string;
  phone: string;
  contact_name: string;
  real_name?: string;
  data_source: string;
  contact_script: string;
  data_date: string;
  extra_info: string;
  lead_status: 'available' | 'assigned' | 'contracted';
  created_at: string;
  upload_batch_id: string;
  additional_data?: any;
  
  // 뷰에서 직접 제공되는 배정/상담 정보
  assignment_id?: string;
  counselor_id?: string;
  counselor_name?: string;
  assigned_at?: string;
  latest_contact_result?: string;
  contract_status?: string;
  contract_amount?: number;
  last_contact_date?: string;
  counseling_memo?: string;
  actual_customer_name?: string;
  call_attempts?: number;
}

interface FilterOptions {
  status: string; // 'all' | grade values
  dataSource: string;
  dateRange: 'all' | 'today' | 'week' | 'month';
}

function AdminLeadsPageContent() {
  const { user, userProfile, loading: authLoading, hasPermission, isSuperAdmin } = useAuth();
  const toast = useToastHelpers();
  const [mounted, setMounted] = useState(false);

  // 회원등급 옵션 정의
  const gradeOptions = [
    { value: '신규', label: '신규', color: '#3b82f6' },
    { value: '재상담 신청', label: '재상담 신청', color: '#8b5cf6' },
    { value: '무방 입장[안내]', label: '무방 입장[안내]', color: '#06b6d4' },
    { value: '무방 입장[완료]', label: '무방 입장[완료]', color: '#10b981' },
    { value: '관리', label: '관리', color: '#f59e0b' },
    { value: '결제[유력]', label: '결제[유력]', color: '#ef4444' },
    { value: '결제[완료]', label: '결제[완료]', color: '#22c55e' },
    { value: 'AS 신청', label: 'AS 신청', color: '#ec4899' },
    { value: '부재', label: '부재', color: '#6b7280' },
    { value: '[지속] 부재', label: '[지속] 부재', color: '#4b5563' },
    { value: '이탈[조짐]', label: '이탈[조짐]', color: '#f97316' },
    { value: '이탈', label: '이탈', color: '#dc2626' },
    { value: '불가', label: '불가', color: '#991b1b' },
    { value: '이관 DB', label: '이관 DB', color: '#7c3aed' }
  ];

  // 데이터 상태
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [filters, setFilters] = useState<FilterOptions>({
    status: 'all',
    dataSource: '',
    dateRange: 'all'
  });

  // 통계 상태
  const [overallStats, setOverallStats] = useState({
    totalLeads: 0,
    totalAssigned: 0,
    totalUnassigned: 0,
    totalContracted: 0,
    totalRevenue: 0
  });

  // 등급별 통계 상태
  const [gradeStats, setGradeStats] = useState<Record<string, number>>({});

  // 페이지네이션 상태
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(300);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  
  // 정렬 상태
  const [sortColumn, setSortColumn] = useState<string>('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // 선택 상태
  const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set());
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  // Hydration 오류 방지
  useEffect(() => {
    setMounted(true);
  }, []);

  // 검색어 디바운싱
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // 엔터키로 검색
  const handleSearchKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      setDebouncedSearchTerm(searchTerm);
      setCurrentPage(1);
    }
  };

  // 통계 로드 - Supabase 1000개 제한 해결
  const loadOverallStats = useCallback(async () => {
    try {
      setStatsLoading(true);
      
      // 배치 처리로 전체 데이터 가져오기
      let allLeads: any[] = [];
      let from = 0;
      const batchSize = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data: batch } = await supabase
          .from('admin_leads_view')
          .select('id, assignment_id, contract_status, contract_amount')
          .range(from, from + batchSize - 1);
        
        if (batch && batch.length > 0) {
          allLeads = allLeads.concat(batch);
          from += batchSize;
          
          if (batch.length < batchSize) {
            hasMore = false;
          }
        } else {
          hasMore = false;
        }
      }

      const totalLeads = allLeads.length;
      const totalAssigned = allLeads.filter(lead => lead.assignment_id).length;
      const totalUnassigned = totalLeads - totalAssigned;
      
      // 계약 통계 - contract_status가 'contracted'인 것만
      const contractedLeads = allLeads.filter(lead => 
        lead.contract_status === 'contracted'
      );
      
      const totalRevenue = contractedLeads.reduce((sum, lead) => 
        sum + (lead.contract_amount || 0), 0
      );

      setOverallStats({
        totalLeads,
        totalAssigned,
        totalUnassigned,
        totalContracted: contractedLeads.length,
        totalRevenue
      });

      console.log(`통계 계산 완료 (총 ${totalLeads}개): 배정 ${totalAssigned}, 계약 ${contractedLeads.length}, 매출 ${totalRevenue}`);

    } catch (error) {
      console.error('전체 통계 로드 실패:', error);
      toast.error('통계 로드 실패', error.message);
    } finally {
      setStatsLoading(false);
    }
  }, [toast]);

  // 등급별 통계 로드 - Supabase 1000개 제한 해결
  const loadGradeStats = useCallback(async () => {
    try {
      // 전체 데이터를 가져오기 위해 배치로 처리
      let allLeads: any[] = [];
      let from = 0;
      const batchSize = 1000;
      let hasMore = true;

      while (hasMore) {
        let query = supabase
          .from('admin_leads_view')
          .select('additional_data')
          .range(from, from + batchSize - 1);

        // 현재 적용된 필터와 동일하게 적용
        if (debouncedSearchTerm.trim()) {
          query = query.or(`phone.ilike.%${debouncedSearchTerm}%,contact_name.ilike.%${debouncedSearchTerm}%,real_name.ilike.%${debouncedSearchTerm}%,actual_customer_name.ilike.%${debouncedSearchTerm}%`);
        }

        if (filters.dataSource) {
          query = query.eq('data_source', filters.dataSource);
        }

        if (filters.dateRange !== 'all') {
          const now = new Date();
          let startDate = new Date();

          switch (filters.dateRange) {
            case 'today':
              startDate.setHours(0, 0, 0, 0);
              break;
            case 'week':
              startDate.setDate(now.getDate() - 7);
              break;
            case 'month':
              startDate.setMonth(now.getMonth() - 1);
              break;
          }

          query = query.gte('created_at', startDate.toISOString());
        }

        const { data: batch } = await query;
        
        if (batch && batch.length > 0) {
          allLeads = allLeads.concat(batch);
          from += batchSize;
          
          // 배치 크기보다 적게 가져왔으면 마지막 배치
          if (batch.length < batchSize) {
            hasMore = false;
          }
        } else {
          hasMore = false;
        }
      }
        
      const stats: Record<string, number> = {};
      gradeOptions.forEach(option => {
        stats[option.value] = 0;
      });
      
      // 미분류 개수 계산
      let unclassifiedCount = 0;
      
      allLeads.forEach(lead => {
        if (lead.additional_data && lead.additional_data !== null) {
          const additionalData = typeof lead.additional_data === 'string' 
            ? JSON.parse(lead.additional_data) 
            : lead.additional_data;
          
          if (additionalData?.grade && stats.hasOwnProperty(additionalData.grade)) {
            stats[additionalData.grade]++;
          } else {
            unclassifiedCount++;
          }
        } else {
          unclassifiedCount++;
        }
      });
      
      // 미분류도 통계에 추가
      stats['미분류'] = unclassifiedCount;
      
      setGradeStats(stats);
      console.log(`등급별 통계 (총 ${allLeads.length}개):`, stats);
    } catch (error) {
      console.error('등급별 통계 로드 실패:', error);
    }
  }, [debouncedSearchTerm, filters]);

  // 메인 데이터 로드 - 단일 뷰 쿼리로 대폭 간소화
  const loadLeads = useCallback(async (page: number = 1) => {
    if (authLoading || !mounted) return;

    try {
      setLoading(true);
      
      const startRange = (page - 1) * pageSize;
      const endRange = startRange + pageSize - 1;

      // 단일 뷰 쿼리 - 모든 조인이 이미 완료됨
      let query = supabase
        .from('admin_leads_view')
        .select('*', { count: 'exact' });

      // 검색어 적용
      if (debouncedSearchTerm.trim()) {
        query = query.or(`phone.ilike.%${debouncedSearchTerm}%,contact_name.ilike.%${debouncedSearchTerm}%,real_name.ilike.%${debouncedSearchTerm}%,actual_customer_name.ilike.%${debouncedSearchTerm}%`);
      }

      // 데이터 출처 필터
      if (filters.dataSource) {
        query = query.eq('data_source', filters.dataSource);
      }

      // 날짜 필터
      if (filters.dateRange !== 'all') {
        const now = new Date();
        let startDate = new Date();

        switch (filters.dateRange) {
          case 'today':
            startDate.setHours(0, 0, 0, 0);
            break;
          case 'week':
            startDate.setDate(now.getDate() - 7);
            break;
          case 'month':
            startDate.setMonth(now.getMonth() - 1);
            break;
        }

        query = query.gte('created_at', startDate.toISOString());
      }

      // 등급 필터 적용 (서버사이드로 이동 가능)
      if (filters.status !== 'all') {
        if (filters.status === '미분류') {
          // 미분류: additional_data가 null이거나 grade가 없는 경우
          query = query.or('additional_data.is.null,additional_data.not.cs.{"grade"}');
        } else {
          // 특정 등급: additional_data에 해당 grade가 있는 경우
          query = query.contains('additional_data', { grade: filters.status });
        }
      }

      // 정렬 적용
      query = query.order(sortColumn, { ascending: sortDirection === 'asc' });
      
      // 페이지네이션 적용
      query = query.range(startRange, endRange);

      const { data: viewData, error: viewError, count } = await query;

      if (viewError) throw viewError;

      // 뷰 데이터를 기존 인터페이스에 맞게 변환
      const enrichedLeads = viewData?.map(lead => ({
        ...lead,
        status: lead.lead_status, // 뷰의 lead_status를 기존 status로 매핑
        assignment_info: lead.assignment_id ? {
          counselor_name: lead.counselor_name || '알 수 없음',
          assigned_at: lead.assigned_at,
          latest_contact_result: lead.latest_contact_result,
          contract_amount: lead.contract_amount,
          actual_customer_name: lead.actual_customer_name
        } : undefined,
        customer_grade: (() => {
          if (lead.additional_data) {
            const additionalData = typeof lead.additional_data === 'string' 
              ? JSON.parse(lead.additional_data) 
              : lead.additional_data;
            
            if (additionalData && additionalData.grade) {
              return {
                grade: additionalData.grade,
                grade_color: additionalData.grade_color || gradeOptions.find(g => g.value === additionalData.grade)?.color || '#6b7280',
                grade_memo: additionalData.grade_memo,
                updated_at: additionalData.updated_at,
                updated_by: additionalData.updated_by
              };
            }
          }
          return undefined;
        })()
      })) || [];

      setLeads(enrichedLeads);
      setTotalCount(count || 0);
      setTotalPages(Math.ceil((count || 0) / pageSize));
      setCurrentPage(page);

      console.log(`뷰 기반 최적화 완료: 페이지 ${page}, ${enrichedLeads.length}개 로드 (전체: ${count}개)`);
      console.log(`단일 뷰 쿼리로 모든 조인 작업 완료 - 성능 대폭 향상`);

    } catch (error) {
      console.error('고객 데이터 로드 실패:', error);
      toast.error('데이터 로드 실패', error.message, {
        action: { label: '다시 시도', onClick: () => loadLeads(page) }
      });
    } finally {
      setLoading(false);
    }
  }, [authLoading, mounted, debouncedSearchTerm, filters, sortColumn, sortDirection, pageSize, toast]);

  // 정렬 변경 핸들러
  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('desc');
    }
    setCurrentPage(1);
  };

  // 정렬 아이콘 렌더링
  const renderSortIcon = (column: string) => {
    if (sortColumn !== column) {
      return <span className="text-text-tertiary text-xs ml-0.5">↕</span>;
    }
    return sortDirection === 'asc' ? 
      <span className="text-accent text-xs ml-0.5">↑</span> : 
      <span className="text-accent text-xs ml-0.5">↓</span>;
  };

  // 필터 변경
  const handleFilterChange = (newFilters: Partial<FilterOptions>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
    setCurrentPage(1);
  };

  // 선택 관련 함수들
  const toggleSelectLead = (leadId: string) => {
    setSelectedLeads(prev => {
      const newSet = new Set(prev);
      if (newSet.has(leadId)) {
        newSet.delete(leadId);
      } else {
        newSet.add(leadId);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (selectedLeads.size === leads.length) {
      setSelectedLeads(new Set());
    } else {
      setSelectedLeads(new Set(leads.map(lead => lead.id)));
    }
  };

  // 개별 삭제
  const handleDeleteSingle = async (leadId: string) => {
    const lead = leads.find(l => l.id === leadId);
    if (!lead) return;

    if (!confirm(`정말로 "${lead.contact_name}" 고객을 삭제하시겠습니까?\n\n⚠️ 관련된 모든 배정 및 상담 기록이 함께 삭제됩니다.`)) {
      return;
    }

    try {
      setLoading(true);

      const { data: assignments } = await supabase
        .from('lead_assignments')
        .select('id')
        .eq('lead_id', leadId);

      if (assignments && assignments.length > 0) {
        const assignmentIds = assignments.map(a => a.id);
        const { error: activitiesError } = await supabase
          .from('counseling_activities')
          .delete()
          .in('assignment_id', assignmentIds);

        if (activitiesError) throw activitiesError;
      }

      const { error: assignmentsError } = await supabase
        .from('lead_assignments')
        .delete()
        .eq('lead_id', leadId);

      if (assignmentsError) throw assignmentsError;

      const { error: leadError } = await supabase
        .from('lead_pool')
        .delete()
        .eq('id', leadId);

      if (leadError) throw leadError;

      toast.success('삭제 완료', `"${lead.contact_name}" 고객이 삭제되었습니다.`);

      loadLeads(currentPage);
      loadOverallStats();
      loadGradeStats();

    } catch (error) {
      console.error('고객 삭제 실패:', error);
      toast.error('삭제 실패', error.message, {
        action: { label: '다시 시도', onClick: () => handleDeleteSingle(leadId) }
      });
    } finally {
      setLoading(false);
    }
  };

  // 일괄 삭제 - 배치 삭제로 최적화
  const handleBulkDelete = async () => {
    if (selectedLeads.size === 0) {
      toast.warning('선택된 고객 없음', '삭제할 고객을 먼저 선택해주세요.');
      return;
    }

    if (!confirm(`선택된 ${selectedLeads.size}개 고객을 삭제하시겠습니까?\n\n⚠️ 관련된 모든 배정 및 상담 기록이 함께 삭제됩니다.`)) {
      return;
    }

    try {
      setLoading(true);
      const selectedIds = Array.from(selectedLeads);
      
      // 배치 삭제로 최적화
      const { data: assignments } = await supabase
        .from('lead_assignments')
        .select('id')
        .in('lead_id', selectedIds);

      if (assignments && assignments.length > 0) {
        const assignmentIds = assignments.map(a => a.id);
        await supabase
          .from('counseling_activities')
          .delete()
          .in('assignment_id', assignmentIds);
      }

      await supabase
        .from('lead_assignments')
        .delete()
        .in('lead_id', selectedIds);

      const { error: leadError } = await supabase
        .from('lead_pool')
        .delete()
        .in('id', selectedIds);

      if (leadError) throw leadError;

      toast.success('일괄 삭제 완료', `${selectedIds.length}개 고객이 삭제되었습니다.`);
      setSelectedLeads(new Set());
      loadLeads(currentPage);
      loadOverallStats();
      loadGradeStats();

    } catch (error) {
      console.error('일괄 삭제 실패:', error);
      toast.error('일괄 삭제 실패', error.message);
    } finally {
      setLoading(false);
    }
  };

  // 고객 정보 수정
  const handleEditLead = async (updatedLead: Partial<Lead>) => {
    if (!editingLead) return;

    try {
      setLoading(true);

      const { error } = await supabase
        .from('lead_pool')
        .update({
          phone: updatedLead.phone,
          contact_name: updatedLead.contact_name,
          data_source: updatedLead.data_source,
          contact_script: updatedLead.contact_script,
          extra_info: updatedLead.extra_info
        })
        .eq('id', editingLead.id);

      if (error) throw error;

      toast.success('수정 완료', `"${updatedLead.contact_name}" 고객 정보가 수정되었습니다.`);
      setEditingLead(null);
      loadLeads(currentPage);

    } catch (error) {
      console.error('고객 정보 수정 실패:', error);
      toast.error('수정 실패', error.message);
    } finally {
      setLoading(false);
    }
  };

  // 등급별 배지 렌더링 함수
  const renderGradeBadge = (grade?: any) => {
    if (!grade) {
      return (
        <span className="px-1.5 py-0.5 rounded text-xs bg-bg-secondary text-text-tertiary whitespace-nowrap">
          미분류
        </span>
      );
    }

    const gradeOption = gradeOptions.find(g => g.value === grade.grade);
    return (
      <span 
        className="px-1.5 py-0.5 rounded text-xs text-white font-medium whitespace-nowrap"
        style={{ backgroundColor: gradeOption?.color || grade.grade_color || '#6b7280' }}
      >
        {grade.grade}
      </span>
    );
  };

  // 전화번호 마스킹 함수
  const maskPhoneNumber = (phone: string): string => {
    if (!phone) return '-';
    
    if (hasPermission('phone_unmask')) {
      return phone;
    }
    
    if (phone.length >= 8) {
      const start = phone.slice(0, 3);
      const end = phone.slice(-4);
      return start + '****' + end;
    }
    
    return phone.slice(0, 2) + '*'.repeat(phone.length - 2);
  };

  // 초기 데이터 로드
  useEffect(() => {
    if (!authLoading && user && mounted) {
      loadOverallStats();
      loadGradeStats();
      loadLeads(1);
    }
  }, [authLoading, user, mounted]);

  // 필터나 정렬, 검색어 변경시 데이터 다시 로드
  useEffect(() => {
    if (!authLoading && user && mounted) {
      loadGradeStats(); // 등급별 통계도 함께 업데이트
      loadLeads(1); // 필터 변경시 첫 페이지로
    }
  }, [filters, sortColumn, sortDirection, debouncedSearchTerm]);

  if (!mounted) return null;

  return (
    <AdminLayout>
      <div className="p-6 max-w-7xl mx-auto">
        {/* 헤더 */}
        <div className="mb-8">
          <h1 className={designSystem.components.typography.h2}>고객 리드 관리 (뷰 최적화)</h1>
        </div>

        {/* 통계 카드 */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-bg-primary border border-border-primary rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-text-secondary text-sm">전체 고객</p>
                <p className="text-2xl font-bold text-text-primary">{overallStats.totalLeads.toLocaleString()}</p>
              </div>
              <User className="w-8 h-8 text-accent" />
            </div>
          </div>

          <div className="bg-bg-primary border border-border-primary rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-text-secondary text-sm">배정 완료</p>
                <p className="text-2xl font-bold text-success">{overallStats.totalAssigned.toLocaleString()}</p>
              </div>
              <UserCheck className="w-8 h-8 text-success" />
            </div>
          </div>

          <div className="bg-bg-primary border border-border-primary rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-text-secondary text-sm">미배정</p>
                <p className="text-2xl font-bold text-warning">{overallStats.totalUnassigned.toLocaleString()}</p>
              </div>
              <UserX className="w-8 h-8 text-warning" />
            </div>
          </div>

          <div className="bg-bg-primary border border-border-primary rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-text-secondary text-sm">계약완료</p>
                <p className="text-2xl font-bold text-success">{overallStats.totalContracted.toLocaleString()}</p>
              </div>
              <FileCheck className="w-8 h-8 text-success" />
            </div>
          </div>

          <div className="bg-bg-primary border border-border-primary rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-text-secondary text-sm">총 매출</p>
                <p className="text-xl font-bold text-accent">
                  {overallStats.totalRevenue > 0 
                    ? `${(overallStats.totalRevenue / 10000).toFixed(0)}만원`
                    : '0원'
                  }
                </p>
              </div>
              <businessIcons.analytics className="w-8 h-8 text-accent" />
            </div>
          </div>
        </div>

        {/* 필터 및 새로고침 */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-text-secondary text-sm">계약상태:</span>
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange({ status: e.target.value })}
                className="px-2 py-1.5 text-sm border border-border-primary rounded-lg bg-bg-primary text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
              >
                <option value="all">전체</option>
                {gradeOptions.map(grade => {
                  const count = gradeStats[grade.value] || 0;
                  return (
                    <option key={grade.value} value={grade.value}>
                      {grade.label} ({count})
                    </option>
                  );
                })}
                <option value="미분류">
                  미분류 ({gradeStats['미분류'] || 0})
                </option>
              </select>
            </div>
          </div>
          
          <button
            onClick={() => {
              loadOverallStats();
              loadGradeStats();
              loadLeads(currentPage);
            }}
            disabled={loading || statsLoading}
            className={designSystem.utils.cn(
              designSystem.components.button.secondary,
              "px-4 py-2"
            )}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${(loading || statsLoading) ? 'animate-spin' : ''}`} />
            새로고침
          </button>
        </div>

        {/* 제목과 검색 영역 */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <businessIcons.team className="w-3 h-3 text-accent" />
            <h3 className="text-xs font-medium text-text-primary">고객 리드 목록</h3>
            <span className="text-xs text-text-secondary px-1.5 py-0.5 bg-bg-secondary rounded">
              전체 {totalCount.toLocaleString()}명 (페이지당 {pageSize}명)
            </span>
            {loading && (
              <span className="text-xs text-accent animate-pulse">로딩 중...</span>
            )}
          </div>
          
          <div className="relative">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-3 h-3 text-text-secondary" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={handleSearchKeyPress}
              placeholder="고객명, 전화번호로 검색..."
              className="pl-7 pr-3 py-1 w-48 text-xs border border-border-primary rounded bg-bg-primary text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </div>
        </div>

        {/* 일괄 작업 버튼 */}
        {selectedLeads.size > 0 && (
          <div className="bg-accent/10 border border-accent/20 rounded-lg p-3 mb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-accent" />
                <span className="text-xs font-medium text-accent">
                  {selectedLeads.size}개 고객이 선택되었습니다
                </span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setSelectedLeads(new Set())}
                  className="px-2 py-1 text-xs bg-bg-secondary text-text-primary rounded hover:bg-bg-hover transition-colors"
                >
                  선택 해제
                </button>
                <button
                  onClick={handleBulkDelete}
                  disabled={loading}
                  className="px-2 py-1 text-xs bg-error text-white rounded hover:bg-error/90 transition-colors disabled:opacity-50 flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3" />
                  선택 삭제
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 고객 리드 테이블 */}
        <div className="bg-bg-primary border border-border-primary rounded-lg overflow-hidden">
          {leads.length > 0 ? (
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
                          {selectedLeads.size === leads.length && leads.length > 0 ? (
                            <CheckSquare className="w-3 h-3 text-accent" />
                          ) : (
                            <Square className="w-3 h-3 text-text-tertiary" />
                          )}
                        </button>
                      </th>
                      <th className="text-center py-2 px-1 font-medium text-text-secondary text-xs w-16 cursor-pointer hover:bg-bg-hover transition-colors"
                          onClick={() => handleSort('created_at')}>
                        <div className="flex items-center justify-center gap-0.5">
                          <Calendar className="w-3 h-3" />
                          배정일{renderSortIcon('created_at')}
                        </div>
                      </th>
                      <th className="text-center py-2 px-1 font-medium text-text-secondary text-xs w-24">
                        <div className="flex items-center justify-center gap-0.5">
                          <UserCheck className="w-3 h-3" />
                          영업사원
                        </div>
                      </th>
                      <th className="text-center py-2 px-1 font-medium text-text-secondary text-xs w-20">
                        <div className="flex items-center justify-center gap-0.5">
                          <businessIcons.assignment className="w-3 h-3" />
                          등급
                        </div>
                      </th>
                      <th className="text-center py-2 px-1 font-medium text-text-secondary text-xs w-16 cursor-pointer hover:bg-bg-hover transition-colors"
                          onClick={() => handleSort('real_name')}>
                        <div className="flex items-center justify-center gap-0.5">
                          <User className="w-3 h-3" />
                          고객명{renderSortIcon('real_name')}
                        </div>
                      </th>
                      <th className="text-center py-2 px-1 font-medium text-text-secondary text-xs w-20 cursor-pointer hover:bg-bg-hover transition-colors"
                          onClick={() => handleSort('phone')}>
                        <div className="flex items-center justify-center gap-0.5">
                          <Phone className="w-3 h-3" />
                          전화번호{renderSortIcon('phone')}
                        </div>
                      </th>
                      <th className="text-center py-2 px-1 font-medium text-text-secondary text-xs w-24">
                        <div className="flex items-center justify-center gap-0.5">
                          <MessageSquare className="w-3 h-3" />
                          관심분야
                        </div>
                      </th>
                      <th className="text-center py-2 px-1 font-medium text-text-secondary text-xs w-28">
                        <div className="flex items-center justify-center gap-0.5">
                          <businessIcons.message className="w-3 h-3" />
                          상담메모
                        </div>
                      </th>
                      <th className="text-center py-2 px-1 font-medium text-text-secondary text-xs w-10">
                        <div className="flex items-center justify-center gap-0.5">
                          <businessIcons.phone className="w-3 h-3" />
                          <span className="leading-tight">횟수</span>
                        </div>
                      </th>
                      <th className="text-center py-2 px-1 font-medium text-text-secondary text-xs w-16">
                        <div className="flex items-center justify-center gap-0.5">
                          <businessIcons.date className="w-3 h-3" />
                          최근상담
                        </div>
                      </th>
                      <th className="text-center py-2 px-1 font-medium text-text-secondary text-xs w-20">
                        <div className="flex items-center justify-center gap-0.5">
                          <businessIcons.script className="w-3 h-3" />
                          계약금액
                        </div>
                      </th>
                      <th className="text-center py-2 px-1 font-medium text-text-secondary text-xs w-12">
                        <div className="flex items-center justify-center gap-0.5">
                          <businessIcons.contact className="w-3 h-3" />
                          액션
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {leads.map((lead) => (
                      <tr key={lead.id} className="border-b border-border-primary hover:bg-bg-hover transition-colors">
                        {/* 선택 체크박스 */}
                        <td className="py-1 px-1 text-center">
                          <button
                            onClick={() => toggleSelectLead(lead.id)}
                            className="flex items-center justify-center w-3 h-3 mx-auto"
                          >
                            {selectedLeads.has(lead.id) ? (
                              <CheckSquare className="w-3 h-3 text-accent" />
                            ) : (
                              <Square className="w-3 h-3 text-text-tertiary" />
                            )}
                          </button>
                        </td>

                        {/* 배정일 */}
                        <td className="py-1 px-1 text-center">
                          <span className="text-text-secondary text-xs whitespace-nowrap">
                            {lead.assignment_info ? 
                              new Date(lead.assignment_info.assigned_at).toLocaleDateString('ko-KR', {
                                month: '2-digit',
                                day: '2-digit'
                              }) : 
                              new Date(lead.created_at).toLocaleDateString('ko-KR', {
                                month: '2-digit',
                                day: '2-digit'
                              })
                            }
                          </span>
                        </td>

                        {/* 영업사원 */}
                        <td className="py-1 px-1 text-center">
                          <div className="w-24 mx-auto">
                            {lead.assignment_info ? (
                              <div className="text-xs flex items-center justify-center gap-1">
                                <div className="w-1.5 h-1.5 bg-success rounded-full flex-shrink-0"></div>
                                <span className="text-success font-medium truncate">
                                  {lead.assignment_info.counselor_name}
                                </span>
                              </div>
                            ) : (
                              <div className="flex items-center justify-center gap-1">
                                <div className="w-1.5 h-1.5 bg-text-tertiary rounded-full"></div>
                                <span className="text-text-tertiary text-xs">미배정</span>
                              </div>
                            )}
                          </div>
                        </td>

                        {/* 회원등급 */}
                        <td className="py-1 px-1 text-center">
                          {renderGradeBadge(lead.customer_grade)}
                        </td>

                        {/* 고객명 */}
                        <td className="py-1 px-1 text-center">
                          <div className="text-xs whitespace-nowrap truncate">
                            {lead.actual_customer_name ? (
                              <span className="text-text-primary font-medium">{lead.actual_customer_name}</span>
                            ) : lead.real_name ? (
                              <span className="text-text-primary">{lead.real_name}</span>
                            ) : lead.contact_name ? (
                              <span className="text-text-secondary">{lead.contact_name}</span>
                            ) : (
                              <span className="text-text-tertiary">미확인</span>
                            )}
                          </div>
                        </td>

                        {/* 전화번호 */}
                        <td className="py-1 px-1 text-center">
                          <div className="font-mono text-text-primary font-medium text-xs truncate">
                            {maskPhoneNumber(lead.phone)}
                          </div>
                        </td>

                        {/* 관심분야 */}
                        <td className="py-1 px-1 text-center relative">
                          <div className="w-24 group mx-auto">
                            {lead.contact_script ? (
                              <>
                                <div className="text-text-primary text-xs truncate cursor-help px-1">
                                  {lead.contact_script}
                                </div>
                                <div className="absolute left-0 top-full mt-1 p-2 bg-black/90 text-white text-xs rounded shadow-lg z-20 max-w-80 break-words opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                                  {lead.contact_script}
                                </div>
                              </>
                            ) : (
                              <span className="text-text-tertiary text-xs">미확인</span>
                            )}
                          </div>
                        </td>

                        {/* 상담메모 */}
                        <td className="py-1 px-1 text-center relative">
                          <div className="w-28 group mx-auto">
                            {lead.counseling_memo ? (
                              <>
                                <div className="text-text-primary text-xs truncate cursor-help px-1">
                                  {lead.counseling_memo}
                                </div>
                                <div className="absolute left-0 top-full mt-1 p-2 bg-black/90 text-white text-xs rounded shadow-lg z-20 max-w-80 break-words opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                                  {lead.counseling_memo}
                                </div>
                              </>
                            ) : (
                              <span className="text-text-tertiary text-xs">-</span>
                            )}
                          </div>
                        </td>

                        {/* 상담 횟수 */}
                        <td className="py-1 px-1 text-center">
                          <span className="font-medium text-text-primary text-xs">
                            {lead.call_attempts || 0}
                          </span>
                        </td>

                        {/* 최근 상담 */}
                        <td className="py-1 px-1 text-center">
                          <span className="text-text-secondary text-xs whitespace-nowrap">
                            {lead.last_contact_date 
                              ? new Date(lead.last_contact_date).toLocaleDateString('ko-KR', {
                                  month: '2-digit',
                                  day: '2-digit'
                                })
                              : '-'
                            }
                          </span>
                        </td>

                        {/* 계약금액 */}
                        <td className="py-1 px-1 text-center">
                          {lead.contract_amount ? (
                            <span className="font-medium text-success text-xs">
                              {(lead.contract_amount / 10000).toFixed(0)}만
                            </span>
                          ) : (
                            <span className="text-text-tertiary text-xs">-</span>
                          )}
                        </td>

                        {/* 액션 */}
                        <td className="py-1 px-1 text-center">
                          <div className="flex items-center justify-center gap-0.5">
                            <button
                              onClick={() => setEditingLead(lead)}
                              className="p-0.5 text-text-tertiary hover:text-accent transition-colors"
                              title="수정"
                            >
                              <Edit className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => handleDeleteSingle(lead.id)}
                              className="p-0.5 text-text-tertiary hover:text-error transition-colors"
                              title="삭제"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
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
                      총 {totalCount.toLocaleString()}개 중 {((currentPage - 1) * pageSize + 1).toLocaleString()}-{Math.min(currentPage * pageSize, totalCount).toLocaleString()}개 표시
                    </div>
                    
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => loadLeads(1)}
                        disabled={currentPage === 1 || loading}
                        className="px-2 py-1 text-xs border border-border-primary rounded bg-bg-primary text-text-primary disabled:opacity-50 disabled:cursor-not-allowed hover:bg-bg-hover transition-colors"
                      >
                        첫페이지
                      </button>
                      
                      <button
                        onClick={() => loadLeads(currentPage - 1)}
                        disabled={currentPage === 1 || loading}
                        className="px-2 py-1 text-xs border border-border-primary rounded bg-bg-primary text-text-primary disabled:opacity-50 disabled:cursor-not-allowed hover:bg-bg-hover transition-colors"
                      >
                        <ChevronLeft className="w-3 h-3" />
                      </button>
                      
                      <span className="px-2 py-1 text-xs text-white bg-accent rounded">
                        {currentPage} / {totalPages}
                      </span>
                      
                      <button
                        onClick={() => loadLeads(currentPage + 1)}
                        disabled={currentPage === totalPages || loading}
                        className="px-2 py-1 text-xs border border-border-primary rounded bg-bg-primary text-text-primary disabled:opacity-50 disabled:cursor-not-allowed hover:bg-bg-hover transition-colors"
                      >
                        <ChevronRight className="w-3 h-3" />
                      </button>
                      
                      <button
                        onClick={() => loadLeads(totalPages)}
                        disabled={currentPage === totalPages || loading}
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
              <User className="w-16 h-16 text-text-tertiary mx-auto mb-4" />
              <h3 className="text-lg font-medium text-text-primary mb-2">
                {loading ? '데이터 로드 중...' : '검색 결과가 없습니다'}
              </h3>
              <p className="text-text-secondary">
                {loading ? '잠시만 기다려주세요.' : '검색 조건을 변경하거나 새로운 고객 데이터를 업로드해주세요.'}
              </p>
            </div>
          )}
        </div>

        {/* 수정 모달 */}
        {editingLead && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-bg-primary border border-border-primary rounded-xl w-full max-w-2xl mx-auto">
              <div className="p-6 border-b border-border-primary">
                <h3 className="text-lg font-semibold text-text-primary">고객 정보 수정</h3>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  handleEditLead({
                    phone: formData.get('phone') as string,
                    contact_name: formData.get('contact_name') as string,
                    data_source: formData.get('data_source') as string,
                    contact_script: formData.get('contact_script') as string,
                    extra_info: formData.get('extra_info') as string,
                  });
                }}
                className="p-6 space-y-4"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2 text-text-primary">전화번호 *</label>
                    <input
                      name="phone"
                      type="tel"
                      defaultValue={editingLead.phone}
                      required
                      className="w-full px-3 py-2 border border-border-primary rounded-lg bg-bg-primary text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2 text-text-primary">고객명 *</label>
                    <input
                      name="contact_name"
                      type="text"
                      defaultValue={editingLead.contact_name}
                      required
                      className="w-full px-3 py-2 border border-border-primary rounded-lg bg-bg-primary text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-text-primary">데이터 출처</label>
                  <input
                    name="data_source"
                    type="text"
                    defaultValue={editingLead.data_source || ''}
                    className="w-full px-3 py-2 border border-border-primary rounded-lg bg-bg-primary text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-text-primary">관심분야</label>
                  <textarea
                    name="contact_script"
                    defaultValue={editingLead.contact_script || ''}
                    rows={3}
                    className="w-full px-3 py-2 border border-border-primary rounded-lg bg-bg-primary text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-text-primary">기타 정보</label>
                  <textarea
                    name="extra_info"
                    defaultValue={editingLead.extra_info || ''}
                    rows={2}
                    className="w-full px-3 py-2 border border-border-primary rounded-lg bg-bg-primary text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setEditingLead(null)}
                    className="px-4 py-2 bg-bg-secondary text-text-primary rounded-lg hover:bg-bg-hover transition-colors"
                  >
                    취소
                  </button>

                  <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors disabled:opacity-50"
                  >
                    저장
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

export default function AdminLeadsPage() {
  return (
    <ProtectedRoute requiredPermission="leads">
      <AdminLeadsPageContent />
    </ProtectedRoute>
  );
}