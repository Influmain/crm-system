'use client';

import { useState, useEffect, useCallback } from 'react';
import AdminLayout from '@/components/layout/AdminLayout';
import { useToastHelpers } from '@/components/ui/Toast';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth/AuthContext';
import { 
  Search, 
  Filter, 
  Edit, 
  Trash2, 
  RefreshCw, 
  ChevronLeft, 
  ChevronRight,
  CheckSquare,
  Square,
  MoreVertical,
  User,
  Phone,
  Calendar,
  Building2,
  MessageSquare,
  UserCheck,
  UserX,
  FileCheck,
  AlertTriangle
} from 'lucide-react';

// 타입 정의
interface Lead {
  id: string;
  phone: string;
  contact_name: string;
  data_source: string;
  contact_script: string;
  data_date: string;
  extra_info: string;
  status: 'available' | 'assigned' | 'contracted';
  created_at: string;
  upload_batch_id: string;
  assignment_info?: {
    counselor_name: string;
    assigned_at: string;
    latest_contact_result?: string;
    contract_amount?: number;
  };
}

interface FilterOptions {
  status: 'all' | 'available' | 'assigned' | 'contracted';
  dataSource: string;
  dateRange: 'all' | 'today' | 'week' | 'month';
}

interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  pageSize: number;
}

export default function AdminLeadsPage() {
  const { user, loading: authLoading } = useAuth();
  const toast = useToastHelpers();
  const [mounted, setMounted] = useState(false);
  
  // 데이터 상태
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<FilterOptions>({
    status: 'all',
    dataSource: '',
    dateRange: 'all'
  });
  
  // 전체 통계 상태
  const [overallStats, setOverallStats] = useState({
    totalLeads: 0,
    totalAssigned: 0,
    totalUnassigned: 0,
    totalContracted: 0
  });
  
  // 페이징 상태
  const [pagination, setPagination] = useState<PaginationInfo>({
    currentPage: 1,
    totalPages: 1,
    totalCount: 0,
    pageSize: 50
  });
  
  // 선택 상태
  const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set());
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  // v7: Hydration 오류 방지
  useEffect(() => {
    setMounted(true);
  }, []);

  // 전체 통계 로드 함수 추가
  const loadOverallStats = useCallback(async () => {
    try {
      // 1. 전체 고객 수
      const { count: totalLeads } = await supabase
        .from('lead_pool')
        .select('*', { count: 'exact', head: true });

      // 2. 전체 배정 현황
      const { data: allAssignments, count: totalAssigned } = await supabase
        .from('lead_assignments')
        .select('lead_id', { count: 'exact' })
        .eq('status', 'active');

      // 3. 전체 계약 현황 (v6 패턴 적용)
      const { data: assignmentsWithActivities } = await supabase
        .from('lead_assignments')
        .select(`
          id,
          counseling_activities (
            contract_status,
            contact_date,
            contract_amount
          )
        `)
        .eq('status', 'active');

      let totalContracted = 0;
      assignmentsWithActivities?.forEach(assignment => {
        const activities = assignment.counseling_activities;
        if (activities && activities.length > 0) {
          // 최신 활동만 확인 (v6 패턴)
          const latestActivity = activities
            .sort((a, b) => new Date(b.contact_date).getTime() - new Date(a.contact_date).getTime())[0];
          
          if (latestActivity?.contract_status === 'contracted') {
            totalContracted++;
          }
        }
      });

      setOverallStats({
        totalLeads: totalLeads || 0,
        totalAssigned: totalAssigned || 0,
        totalUnassigned: (totalLeads || 0) - (totalAssigned || 0),
        totalContracted: totalContracted
      });

    } catch (error) {
      console.error('전체 통계 로드 실패:', error);
    }
  }, []);

  // 데이터 로드 함수
  const loadLeads = useCallback(async (page: number = 1) => {
    if (authLoading || !mounted) return;
    
    try {
      setLoading(true);
      
      // 기본 쿼리 구성
      let query = supabase
        .from('lead_pool')
        .select(`
          id,
          phone,
          contact_name,
          data_source,
          contact_script,
          data_date,
          extra_info,
          status,
          created_at,
          upload_batch_id
        `, { count: 'exact' });

      // 검색 필터 적용
      if (searchTerm.trim()) {
        query = query.or(`phone.ilike.%${searchTerm}%,contact_name.ilike.%${searchTerm}%`);
      }

      // 상태 필터
      if (filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }

      // 데이터 출처 필터
      if (filters.dataSource) {
        query = query.eq('data_source', filters.dataSource);
      }

      // 날짜 범위 필터
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

      // 정렬 및 페이징
      const startIndex = (page - 1) * 50;
      const endIndex = startIndex + 50 - 1;
      
      query = query
        .order('created_at', { ascending: false })
        .range(startIndex, endIndex);

      const { data: leadsData, error: leadsError, count } = await query;

      if (leadsError) throw leadsError;

      // 배정 정보 보강 (수정된 로직)
      const enrichedLeads = await Promise.all(
        (leadsData || []).map(async (lead) => {
          // 배정 정보 조회 (올바른 컬럼명 사용)
          const { data: assignmentData } = await supabase
            .from('lead_assignments')
            .select(`
              id,
              assigned_at,
              counselor_id,
              users!lead_assignments_counselor_id_fkey (full_name)
            `)
            .eq('lead_id', lead.id)
            .eq('status', 'active')
            .maybeSingle();

          let assignmentInfo = undefined;
          if (assignmentData) {
            // 상담 기록 조회 (v6 패턴: 최신 기록만)
            const { data: activities } = await supabase
              .from('counseling_activities')
              .select('contact_result, contract_status, contract_amount, contact_date')
              .eq('assignment_id', assignmentData.id)
              .order('contact_date', { ascending: false })
              .limit(1);

            const latestActivity = activities?.[0];

            assignmentInfo = {
              counselor_name: assignmentData.users?.full_name || '알 수 없음',
              assigned_at: assignmentData.assigned_at,
              latest_contact_result: latestActivity?.contact_result,
              contract_amount: latestActivity?.contract_amount
            };
          }

          return {
            ...lead,
            assignment_info: assignmentInfo
          };
        })
      );

      setLeads(enrichedLeads);
      setPagination(prev => ({
        ...prev,
        currentPage: page,
        totalCount: count || 0,
        totalPages: Math.ceil((count || 0) / 50)
      }));

      console.log(`페이지 ${page}: ${enrichedLeads.length}개 로드, 배정된 고객: ${enrichedLeads.filter(l => l.assignment_info).length}개`);

    } catch (error) {
      console.error('고객 데이터 로드 실패:', error);
      toast.error('데이터 로드 실패', error.message, {
        action: { label: '다시 시도', onClick: () => loadLeads(page) }
      });
    } finally {
      setLoading(false);
    }
  }, [authLoading, mounted, searchTerm, filters]);

  // 검색 실행
  const handleSearch = () => {
    setPagination(prev => ({ ...prev, currentPage: 1 }));
    loadLeads(1);
  };

  // 필터 변경
  const handleFilterChange = (newFilters: Partial<FilterOptions>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
    setPagination(prev => ({ ...prev, currentPage: 1 }));
    setTimeout(() => loadLeads(1), 100);
  };

  // 개별 선택 토글
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

  // 전체 선택 토글
  const toggleSelectAll = () => {
    if (selectedLeads.size === leads.length) {
      setSelectedLeads(new Set());
    } else {
      setSelectedLeads(new Set(leads.map(lead => lead.id)));
    }
  };

  // 개별 삭제 (assignment_id 오류 수정)
  const handleDeleteSingle = async (leadId: string) => {
    const lead = leads.find(l => l.id === leadId);
    if (!lead) return;

    if (!confirm(`정말로 "${lead.contact_name}" 고객을 삭제하시겠습니까?\n\n⚠️ 관련된 모든 배정 및 상담 기록이 함께 삭제됩니다.`)) {
      return;
    }

    try {
      setLoading(true);

      // 1. 해당 고객의 배정 ID들 조회
      const { data: assignments } = await supabase
        .from('lead_assignments')
        .select('id')
        .eq('lead_id', leadId);

      // 2. 상담 기록 삭제 (assignment_id 기준)
      if (assignments && assignments.length > 0) {
        const assignmentIds = assignments.map(a => a.id);
        const { error: activitiesError } = await supabase
          .from('counseling_activities')
          .delete()
          .in('assignment_id', assignmentIds);

        if (activitiesError) throw activitiesError;
      }

      // 3. 배정 기록 삭제
      const { error: assignmentsError } = await supabase
        .from('lead_assignments')
        .delete()
        .eq('lead_id', leadId);

      if (assignmentsError) throw assignmentsError;

      // 4. 고객 데이터 삭제
      const { error: leadError } = await supabase
        .from('lead_pool')
        .delete()
        .eq('id', leadId);

      if (leadError) throw leadError;

      toast.success('삭제 완료', `"${lead.contact_name}" 고객이 삭제되었습니다.`);
      
      // 데이터 새로고침
      loadLeads(pagination.currentPage);
      loadOverallStats();

    } catch (error) {
      console.error('고객 삭제 실패:', error);
      toast.error('삭제 실패', error.message, {
        action: { label: '다시 시도', onClick: () => handleDeleteSingle(leadId) }
      });
    } finally {
      setLoading(false);
    }
  };

  // 일괄 삭제 (assignment_id 기준 수정)
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
      let successCount = 0;
      let errorCount = 0;

      for (const leadId of selectedIds) {
        try {
          // 1. 해당 고객의 배정 ID들 조회
          const { data: assignments } = await supabase
            .from('lead_assignments')
            .select('id')
            .eq('lead_id', leadId);

          // 2. 상담 기록 삭제 (assignment_id 기준)
          if (assignments && assignments.length > 0) {
            const assignmentIds = assignments.map(a => a.id);
            await supabase
              .from('counseling_activities')
              .delete()
              .in('assignment_id', assignmentIds);
          }

          // 3. 배정 기록 삭제
          await supabase
            .from('lead_assignments')
            .delete()
            .eq('lead_id', leadId);

          // 4. 고객 데이터 삭제
          await supabase
            .from('lead_pool')
            .delete()
            .eq('id', leadId);

          successCount++;

        } catch (error) {
          console.error(`고객 ${leadId} 삭제 실패:`, error);
          errorCount++;
        }
      }

      if (successCount > 0) {
        toast.success('일괄 삭제 완료', `${successCount}개 고객이 삭제되었습니다.${errorCount > 0 ? ` (${errorCount}개 실패)` : ''}`);
        setSelectedLeads(new Set());
        loadLeads(pagination.currentPage);
        loadOverallStats();
      } else {
        toast.error('일괄 삭제 실패', '모든 고객 삭제에 실패했습니다.');
      }

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
      loadLeads(pagination.currentPage);

    } catch (error) {
      console.error('고객 정보 수정 실패:', error);
      toast.error('수정 실패', error.message);
    } finally {
      setLoading(false);
    }
  };

  // 페이지 변경
  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= pagination.totalPages) {
      loadLeads(page);
    }
  };

  // 초기 데이터 로드
  useEffect(() => {
    if (!authLoading && user && mounted) {
      loadOverallStats(); // 전체 통계 로드 추가
      loadLeads(1);
    }
  }, [authLoading, user, mounted]);

  if (!mounted) return null; // v7: Hydration 방지

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* 헤더 */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-text-primary">고객 리드 관리</h1>
            <p className="text-text-secondary mt-1">
              업로드된 고객 데이터를 조회, 수정, 삭제할 수 있습니다
            </p>
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="px-4 py-2 bg-bg-secondary text-text-primary rounded-lg hover:bg-bg-hover transition-colors flex items-center gap-2"
            >
              <Filter className="w-4 h-4" />
              필터 {showFilters ? '닫기' : '열기'}
            </button>
            
            <button
              onClick={() => {
                loadOverallStats();
                loadLeads(pagination.currentPage);
              }}
              disabled={loading}
              className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              새로고침
            </button>
          </div>
        </div>

        {/* 통계 요약 (전체 기준 통계로 변경) */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-bg-primary border border-border-primary rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-text-secondary text-sm">전체 고객</p>
                <p className="text-2xl font-bold text-text-primary">{overallStats.totalLeads.toLocaleString()}</p>
                <p className="text-text-tertiary text-xs mt-1">시스템 전체</p>
              </div>
              <div className="p-3 bg-accent/10 rounded-lg">
                <User className="w-6 h-6 text-accent" />
              </div>
            </div>
          </div>
          
          <div className="bg-bg-primary border border-border-primary rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-text-secondary text-sm">배정 완료</p>
                <p className="text-2xl font-bold text-success">
                  {overallStats.totalAssigned.toLocaleString()}
                </p>
                <p className="text-text-tertiary text-xs mt-1">영업사원 배정됨</p>
              </div>
              <div className="p-3 bg-success/10 rounded-lg">
                <UserCheck className="w-6 h-6 text-success" />
              </div>
            </div>
          </div>
          
          <div className="bg-bg-primary border border-border-primary rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-text-secondary text-sm">미배정</p>
                <p className="text-2xl font-bold text-warning">
                  {overallStats.totalUnassigned.toLocaleString()}
                </p>
                <p className="text-text-tertiary text-xs mt-1">배정 대기중</p>
              </div>
              <div className="p-3 bg-warning/10 rounded-lg">
                <UserX className="w-6 h-6 text-warning" />
              </div>
            </div>
          </div>
          
          <div className="bg-bg-primary border border-border-primary rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-text-secondary text-sm">계약 완료</p>
                <p className="text-2xl font-bold text-success">
                  {overallStats.totalContracted.toLocaleString()}
                </p>
                <p className="text-text-tertiary text-xs mt-1">성공 계약</p>
              </div>
              <div className="p-3 bg-success/10 rounded-lg">
                <FileCheck className="w-6 h-6 text-success" />
              </div>
            </div>
          </div>
        </div>

        {/* 검색 및 필터 */}
        <div className="bg-bg-primary border border-border-primary rounded-lg p-6">
          <div className="flex gap-4 mb-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-text-tertiary" />
                <input
                  type="text"
                  placeholder="전화번호 또는 고객명으로 검색..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  className="w-full pl-10 pr-4 py-2 border border-border-primary rounded-lg bg-bg-primary text-text-primary focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
                />
              </div>
            </div>
            
            <button
              onClick={handleSearch}
              disabled={loading}
              className="px-6 py-2 bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors disabled:opacity-50"
            >
              검색
            </button>
          </div>

          {/* 고급 필터 */}
          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-border-primary">
              <div>
                <label className="block text-sm font-medium mb-2 text-text-primary">상태</label>
                <select
                  value={filters.status}
                  onChange={(e) => handleFilterChange({ status: e.target.value as FilterOptions['status'] })}
                  className="w-full px-3 py-2 border border-border-primary rounded-lg bg-bg-primary text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
                >
                  <option value="all">전체</option>
                  <option value="available">미배정</option>
                  <option value="assigned">배정됨</option>
                  <option value="contracted">계약완료</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2 text-text-primary">데이터 출처</label>
                <input
                  type="text"
                  placeholder="예: DB업체명"
                  value={filters.dataSource}
                  onChange={(e) => handleFilterChange({ dataSource: e.target.value })}
                  className="w-full px-3 py-2 border border-border-primary rounded-lg bg-bg-primary text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2 text-text-primary">업로드 날짜</label>
                <select
                  value={filters.dateRange}
                  onChange={(e) => handleFilterChange({ dateRange: e.target.value as FilterOptions['dateRange'] })}
                  className="w-full px-3 py-2 border border-border-primary rounded-lg bg-bg-primary text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
                >
                  <option value="all">전체</option>
                  <option value="today">오늘</option>
                  <option value="week">최근 7일</option>
                  <option value="month">최근 30일</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* 일괄 작업 버튼 */}
        {selectedLeads.size > 0 && (
          <div className="bg-accent/10 border border-accent/20 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-accent" />
                <span className="font-medium text-accent">
                  {selectedLeads.size}개 고객이 선택되었습니다
                </span>
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={() => setSelectedLeads(new Set())}
                  className="px-4 py-2 bg-bg-secondary text-text-primary rounded-lg hover:bg-bg-hover transition-colors"
                >
                  선택 해제
                </button>
                
                <button
                  onClick={handleBulkDelete}
                  disabled={loading}
                  className="px-4 py-2 bg-error text-white rounded-lg hover:bg-error/90 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  선택 삭제
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 데이터 테이블 */}
        <div className="bg-bg-primary border border-border-primary rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-bg-secondary">
                <tr>
                  <th className="w-12 px-4 py-3">
                    <button
                      onClick={toggleSelectAll}
                      className="flex items-center justify-center w-4 h-4"
                    >
                      {selectedLeads.size === leads.length && leads.length > 0 ? (
                        <CheckSquare className="w-4 h-4 text-accent" />
                      ) : (
                        <Square className="w-4 h-4 text-text-tertiary" />
                      )}
                    </button>
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-text-secondary">
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4" />
                      전화번호
                    </div>
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-text-secondary">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4" />
                      고객명
                    </div>
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-text-secondary">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4" />
                      데이터 출처
                    </div>
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-text-secondary">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="w-4 h-4" />
                      관심분야
                    </div>
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-text-secondary">
                    <div className="flex items-center gap-2">
                      <UserCheck className="w-4 h-4" />
                      배정 상태
                    </div>
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-text-secondary">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      업로드일
                    </div>
                  </th>
                  <th className="w-20 px-4 py-3 font-medium text-text-secondary text-center">
                    작업
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center">
                      <div className="flex items-center justify-center gap-3">
                        <RefreshCw className="w-6 h-6 animate-spin text-accent" />
                        <span className="text-text-secondary">데이터 로딩 중...</span>
                      </div>
                    </td>
                  </tr>
                ) : leads.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center">
                      <div className="text-text-secondary">
                        <User className="w-16 h-16 mx-auto mb-4 text-text-tertiary" />
                        <h3 className="text-lg font-medium mb-2">고객 데이터가 없습니다</h3>
                        <p>검색 조건을 변경하거나 새로운 고객 데이터를 업로드해주세요.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  leads.map((lead) => (
                    <tr 
                      key={lead.id} 
                      className="border-b border-border-primary hover:bg-bg-hover transition-colors"
                    >
                      <td className="px-4 py-3">
                        <button
                          onClick={() => toggleSelectLead(lead.id)}
                          className="flex items-center justify-center w-4 h-4"
                        >
                          {selectedLeads.has(lead.id) ? (
                            <CheckSquare className="w-4 h-4 text-accent" />
                          ) : (
                            <Square className="w-4 h-4 text-text-tertiary" />
                          )}
                        </button>
                      </td>
                      
                      <td className="py-3 px-4">
                        <div className="font-mono text-text-primary font-medium">
                          {lead.phone}
                        </div>
                      </td>
                      
                      <td className="py-3 px-4">
                        <div className="font-medium text-text-primary">
                          {lead.contact_name}
                        </div>
                      </td>
                      
                      <td className="py-3 px-4">
                        <div className="text-text-secondary">
                          {lead.data_source || '-'}
                        </div>
                      </td>
                      
                      <td className="py-3 px-4">
                        <div className="text-text-secondary text-sm max-w-xs truncate">
                          {lead.contact_script || '-'}
                        </div>
                      </td>
                      
                      <td className="py-3 px-4">
                        {lead.assignment_info ? (
                          <div>
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 bg-success rounded-full"></div>
                              <span className="text-success font-medium">
                                {lead.assignment_info.counselor_name}
                              </span>
                            </div>
                            <div className="text-xs text-text-tertiary">
                              {new Date(lead.assignment_info.assigned_at).toLocaleDateString('ko-KR')} 배정
                            </div>
                            {lead.assignment_info.contract_amount && (
                              <div className="text-xs text-success">
                                계약: {lead.assignment_info.contract_amount.toLocaleString()}원
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-text-tertiary rounded-full"></div>
                            <span className="text-text-tertiary">미배정</span>
                          </div>
                        )}
                      </td>
                      
                      <td className="py-3 px-4">
                        <div className="text-text-secondary text-sm">
                          {new Date(lead.created_at).toLocaleDateString('ko-KR')}
                        </div>
                      </td>
                      
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setEditingLead(lead)}
                            className="p-1 text-text-tertiary hover:text-accent transition-colors"
                            title="수정"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          
                          <button
                            onClick={() => handleDeleteSingle(lead.id)}
                            className="p-1 text-text-tertiary hover:text-error transition-colors"
                            title="삭제"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* 페이징 */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between">
            <div className="text-text-secondary text-sm">
              총 {pagination.totalCount.toLocaleString()}개 중 {((pagination.currentPage - 1) * pagination.pageSize + 1).toLocaleString()}-{Math.min(pagination.currentPage * pagination.pageSize, pagination.totalCount).toLocaleString()}개 표시
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => handlePageChange(pagination.currentPage - 1)}
                disabled={pagination.currentPage === 1 || loading}
                className="p-2 border border-border-primary rounded-lg hover:bg-bg-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                  let pageNum;
                  if (pagination.totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (pagination.currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (pagination.currentPage >= pagination.totalPages - 2) {
                    pageNum = pagination.totalPages - 4 + i;
                  } else {
                    pageNum = pagination.currentPage - 2 + i;
                  }
                  
                  return (
                    <button
                      key={pageNum}
                      onClick={() => handlePageChange(pageNum)}
                      disabled={loading}
                      className={`px-3 py-1 rounded-lg transition-colors disabled:opacity-50 ${
                        pageNum === pagination.currentPage
                          ? 'bg-accent text-white'
                          : 'hover:bg-bg-hover text-text-primary'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>
              
              <button
                onClick={() => handlePageChange(pagination.currentPage + 1)}
                disabled={pagination.currentPage === pagination.totalPages || loading}
                className="p-2 border border-border-primary rounded-lg hover:bg-bg-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
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
    </AdminLayout>
  );
}