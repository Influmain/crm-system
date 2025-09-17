'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { designSystem } from '@/lib/design-system';
import { businessIcons } from '@/lib/design-system/icons';
import { useToastHelpers } from '@/components/ui/Toast';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth/AuthContext';
import CounselorLayout from '@/components/layout/CounselorLayout';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { 
  Search, RefreshCw, Tag, X, ChevronLeft, ChevronRight 
} from 'lucide-react';

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

// 타입 정의
interface CustomerGrade {
  grade: string;
  grade_memo?: string;
  grade_color: string;
  updated_at: string;
  updated_by: string;
  history: Array<{
    grade: string;
    date: string;
    memo?: string;
  }>;
  estimated_contract_amount?: number;
  confirmed_contract_amount?: number;
}

interface AssignedLead {
  assignment_id: string
  lead_id: string
  phone: string
  contact_name: string
  real_name?: string
  data_source: string
  contact_script: string
  assigned_at: string
  last_contact_date?: string
  call_attempts: number
  latest_contact_result?: string
  latest_contract_status?: string
  contract_amount?: number
  actual_customer_name?: string
  counseling_memo?: string
  status: 'not_contacted' | 'in_progress' | 'contracted'
  customer_grade?: CustomerGrade
  data_date?: string // 데이터 업로드일
  created_at?: string // 리드 생성일
}

interface ConsultingRecord {
  assignment_id: string
  counseling_memo: string
  actual_customer_name: string
  investment_budget: string
  contract_amount?: number
  estimated_amount?: number
  customer_grade?: string
}

function CounselorConsultingContent() {
  const { user, userProfile } = useAuth()
  const toast = useToastHelpers()
  const router = useRouter()
  
  // 상태 관리
  const [leads, setLeads] = useState<AssignedLead[]>([])
  const [filteredLeads, setFilteredLeads] = useState<AssignedLead[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedLead, setSelectedLead] = useState<AssignedLead | null>(null)
  const [showConsultingModal, setShowConsultingModal] = useState(false)
  const [saving, setSaving] = useState(false)
  
  // 필터 상태 - 다중 선택으로 변경
  const [gradeFilters, setGradeFilters] = useState<string[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('')
  const [dateFilters, setDateFilters] = useState({
    startDate: '',
    endDate: ''
  })
  
  // 페이지네이션 상태
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize] = useState(50) // 더 콤팩트하게
  
  // 정렬 상태
  const [sortColumn, setSortColumn] = useState<string>('assigned_at')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  
  // 상담 기록 폼
  const [consultingForm, setConsultingForm] = useState<ConsultingRecord>({
    assignment_id: '',
    counseling_memo: '',
    actual_customer_name: '',
    investment_budget: '',
    contract_amount: undefined,
    estimated_amount: undefined,
    customer_grade: '신규'
  })

  // 검색어 디바운싱
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // 권한 체크
  useEffect(() => {
    if (user && userProfile?.role !== 'counselor') {
      toast.error('접근 권한 없음', '영업사원만 접근할 수 있습니다.')
      router.push('/login')
      return
    }
  }, [user, userProfile])

  // 뷰 테이블 적용한 데이터 로드 (1000개 제한 해결)
  const loadAssignedLeads = useCallback(async () => {
    if (!user?.id) return

    setLoading(true)
    try {
      console.log('상담 진행 데이터 로드 시작 (뷰 최적화):', user.id);

      // 배치 처리로 전체 데이터 가져오기 (1000개 제한 해결)
      let allLeads: any[] = [];
      let from = 0;
      const batchSize = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data: batch } = await supabase
          .from('counselor_leads_view')
          .select('*')
          .eq('counselor_id', user.id)
          .range(from, from + batchSize - 1)
          .order('assigned_at', { ascending: false });

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

      console.log('뷰에서 조회된 배정 고객 수:', allLeads.length);

      // 뷰 데이터를 기존 인터페이스에 맞게 변환
      const enrichedLeads = allLeads.map(lead => {
        // 상태 계산 (기존 로직 유지)
        let status: AssignedLead['status'] = 'not_contacted';
        if (lead.last_contact_date) {
          if (lead.latest_contract_status === 'contracted') {
            status = 'contracted';
          } else {
            status = 'in_progress';
          }
        }

        // 회원등급 정보 추출 (기존 로직 유지)
        let customerGrade: CustomerGrade | undefined;
        if (lead.additional_data) {
          const additionalData = typeof lead.additional_data === 'string' 
            ? JSON.parse(lead.additional_data) 
            : lead.additional_data;
          
          if (additionalData && additionalData.grade) {
            customerGrade = additionalData;
          }
        }

        return {
          assignment_id: lead.assignment_id,
          lead_id: lead.lead_id,
          phone: lead.phone || '',
          contact_name: lead.contact_name || '',
          real_name: lead.real_name || '',
          data_source: lead.data_source || '미지정',
          contact_script: lead.contact_script || '',
          assigned_at: lead.assigned_at,
          last_contact_date: lead.last_contact_date || null,
          call_attempts: lead.call_attempts || 0,
          latest_contact_result: lead.latest_contact_result || null,
          latest_contract_status: lead.latest_contract_status || null,
          contract_amount: lead.contract_amount || null,
          actual_customer_name: lead.actual_customer_name || null,
          counseling_memo: lead.counseling_memo || null,
          status,
          customer_grade: customerGrade,
          data_date: lead.data_date || null,
          created_at: lead.created_at || null
        };
      });

      setLeads(enrichedLeads);
      toast.success('고객 목록 로드 완료', `${enrichedLeads.length}명의 배정 고객을 불러왔습니다.`)

    } catch (error: any) {
      console.error('상담 진행 데이터 로드 오류:', error);
      setLeads([]);
      setFilteredLeads([]);
      
      toast.error('데이터 로드 실패', error.message, {
        action: { label: '다시 시도', onClick: () => loadAssignedLeads() }
      });
    } finally {
      setLoading(false);
    }
  }, [user?.id, toast]);

  // 클라이언트 사이드 필터링 - useCallback 제거
  const applyFilter = () => {
    let filtered = [...leads];

    // 등급 필터 (다중 선택)
    if (gradeFilters.length > 0) {
      filtered = filtered.filter(lead => {
        if (gradeFilters.includes('미분류')) {
          return !lead.customer_grade?.grade || gradeFilters.includes(lead.customer_grade?.grade || '');
        } else {
          return lead.customer_grade?.grade && gradeFilters.includes(lead.customer_grade.grade);
        }
      });
    }

    // 검색 필터
    if (debouncedSearchTerm.trim()) {
      const searchLower = debouncedSearchTerm.toLowerCase();
      filtered = filtered.filter(lead => 
        lead.phone.includes(debouncedSearchTerm) ||
        (lead.contact_name && lead.contact_name.toLowerCase().includes(searchLower)) ||
        (lead.real_name && lead.real_name.toLowerCase().includes(searchLower)) ||
        (lead.actual_customer_name && lead.actual_customer_name.toLowerCase().includes(searchLower)) ||
        (lead.contact_script && lead.contact_script.toLowerCase().includes(searchLower)) ||
        (lead.customer_grade?.grade && lead.customer_grade.grade.toLowerCase().includes(searchLower))
      );
    }

    // 날짜 필터 (배정일 기준)
    if (dateFilters.startDate) {
      const startDate = new Date(dateFilters.startDate);
      filtered = filtered.filter(lead => {
        const assignedDate = new Date(lead.assigned_at);
        return assignedDate >= startDate;
      });
    }
    if (dateFilters.endDate) {
      const endDate = new Date(dateFilters.endDate);
      endDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter(lead => {
        const assignedDate = new Date(lead.assigned_at);
        return assignedDate <= endDate;
      });
    }

    // 정렬 적용
    filtered.sort((a, b) => {
      let aValue: any = '';
      let bValue: any = '';
      
      switch (sortColumn) {
        case 'phone':
          aValue = a.phone;
          bValue = b.phone;
          break;
        case 'contact_name':
          aValue = a.contact_name || '';
          bValue = b.contact_name || '';
          break;
        case 'actual_customer_name':
          aValue = a.actual_customer_name || a.real_name || '';
          bValue = b.actual_customer_name || b.real_name || '';
          break;
        case 'customer_grade':
          aValue = a.customer_grade?.grade || '미분류';
          bValue = b.customer_grade?.grade || '미분류';
          break;
        case 'call_attempts':
          aValue = a.call_attempts;
          bValue = b.call_attempts;
          break;
        case 'last_contact_date':
          aValue = a.last_contact_date ? new Date(a.last_contact_date).getTime() : 0;
          bValue = b.last_contact_date ? new Date(b.last_contact_date).getTime() : 0;
          break;
        case 'assigned_at':
          aValue = new Date(a.assigned_at).getTime();
          bValue = new Date(b.assigned_at).getTime();
          break;
        case 'contract_amount':
          aValue = a.contract_amount || 0;
          bValue = b.contract_amount || 0;
          break;
        default:
          return 0;
      }
      
      if (sortDirection === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    setFilteredLeads(filtered);
    setCurrentPage(1);
  };

  // 다중 등급 필터 토글
  const toggleGradeFilter = (grade: string) => {
    setGradeFilters(prev => 
      prev.includes(grade)
        ? prev.filter(g => g !== grade)
        : [...prev, grade]
    );
  };

  // 페이지네이션을 위한 현재 페이지 데이터
  const getCurrentPageLeads = () => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return filteredLeads.slice(startIndex, endIndex);
  };

  const totalPages = Math.ceil(filteredLeads.length / pageSize);
  const currentPageLeads = getCurrentPageLeads();

  // 정렬 변경 핸들러
  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('desc');
    }
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

  // 텍스트 하이라이트 함수
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

  // 기존 상담 기록 로드 (원본 테이블에서 조회 - 변경 없음)
  const loadExistingConsultingRecordWithLead = async (assignmentId: string, lead: AssignedLead) => {
    try {
      console.log('기존 상담 기록 로드 시작:', assignmentId)
      
      const { data: allRecords } = await supabase
        .from('counseling_activities')
        .select('*')
        .eq('assignment_id', assignmentId)
        .order('contact_date', { ascending: false })

      const latestRecord = allRecords?.[0] || null

      let autoFilledName = '';
      if (latestRecord?.actual_customer_name) {
        autoFilledName = latestRecord.actual_customer_name;
      } else if (lead.real_name) {
        autoFilledName = lead.real_name;
      }

      if (latestRecord) {
        console.log('기존 상담 기록 로드:', latestRecord)
        
        let contractAmount = undefined
        let estimatedAmount = undefined
        
        if (lead.customer_grade?.grade === '결제[완료]') {
          contractAmount = latestRecord.contract_amount || lead.customer_grade.confirmed_contract_amount
        } else if (lead.customer_grade?.grade === '결제[유력]') {
          estimatedAmount = lead.customer_grade.estimated_contract_amount
        }
        
        setConsultingForm({
          assignment_id: assignmentId,
          actual_customer_name: autoFilledName,
          customer_grade: lead.customer_grade?.grade || '신규',
          counseling_memo: latestRecord.counseling_memo || '',
          investment_budget: latestRecord.investment_budget || '',
          contract_amount: contractAmount,
          estimated_amount: estimatedAmount
        })
      } else {
        setConsultingForm({
          assignment_id: assignmentId,
          actual_customer_name: autoFilledName,
          customer_grade: lead.customer_grade?.grade || '신규',
          counseling_memo: '',
          investment_budget: '',
          contract_amount: undefined,
          estimated_amount: undefined
        })
      }
    } catch (error) {
      console.error('기존 상담 기록 로드 실패:', error)
      const autoFilledName = lead.real_name || '';
      setConsultingForm({
        assignment_id: assignmentId,
        actual_customer_name: autoFilledName,
        customer_grade: lead.customer_grade?.grade || '신규',
        counseling_memo: '',
        investment_budget: '',
        contract_amount: undefined,
        estimated_amount: undefined
      })
    }
  }

  const startConsultingRecord = async (lead: AssignedLead) => {
    setSelectedLead(lead)
    
    if (lead.status !== 'not_contacted') {
      await loadExistingConsultingRecordWithLead(lead.assignment_id, lead)
    } else {
      const autoFilledName = lead.real_name || '';
      setConsultingForm({
        assignment_id: lead.assignment_id,
        actual_customer_name: autoFilledName,
        customer_grade: lead.customer_grade?.grade || '신규',
        counseling_memo: '',
        investment_budget: '',
        contract_amount: undefined,
        estimated_amount: undefined
      })
    }
    
    setShowConsultingModal(true)

    const actionType = lead.status === 'not_contacted' ? '입력' : '수정'
    toast.info(`상담 기록 ${actionType}`, `${lead.contact_name || '고객'}님 건의 상담 기록을 ${actionType}합니다.`, {
      action: { label: '전화 걸기', onClick: () => window.open(`tel:${lead.phone}`) }
    })
  }

  // 상담 기록 저장 (원본 테이블 저장 - 변경 없음)
  const saveConsultingRecord = async () => {
    if (!selectedLead || !user?.id || !userProfile?.full_name) return

    setSaving(true)
    try {
      console.log('=== 상담 기록 저장 시작 ===')
      console.log('선택된 리드:', selectedLead.assignment_id, selectedLead.lead_id)
      console.log('입력 폼 데이터:', consultingForm)

      const { data: assignmentCheck } = await supabase
        .from('lead_assignments')
        .select('counselor_id')
        .eq('id', selectedLead.assignment_id)
        .single();

      if (assignmentCheck?.counselor_id !== user.id) {
        throw new Error('본인에게 배정되지 않은 고객입니다.');
      }

      let contractStatus = 'pending'
      if (consultingForm.customer_grade === '결제[완료]') {
        contractStatus = 'contracted'
      } else if (consultingForm.customer_grade === '이탈' || consultingForm.customer_grade === '불가') {
        contractStatus = 'failed'
      }

      console.log('계약 상태 설정:', contractStatus)

      const { data: allExistingRecords } = await supabase
        .from('counseling_activities')
        .select('id, contact_date')
        .eq('assignment_id', selectedLead.assignment_id)
        .order('contact_date', { ascending: false })

      const existingRecord = allExistingRecords?.[0] || null

      const recordData = {
        assignment_id: selectedLead.assignment_id,
        contact_date: new Date().toISOString(),
        contact_method: 'phone',
        contact_result: 'connected',
        counseling_memo: consultingForm.counseling_memo,
        actual_customer_name: consultingForm.actual_customer_name,
        investment_budget: consultingForm.investment_budget || null,
        contract_status: contractStatus,
        contract_amount: consultingForm.customer_grade === '결제[완료]' ? consultingForm.contract_amount || null : null
      }

      console.log('상담 기록 데이터:', recordData)

      if (existingRecord && selectedLead.status !== 'not_contacted') {
        console.log('기존 기록 업데이트:', existingRecord.id)
        const { error: updateError } = await supabase
          .from('counseling_activities')
          .update(recordData)
          .eq('id', existingRecord.id)

        if (updateError) {
          console.error('기록 업데이트 실패:', updateError)
          throw updateError
        }
        console.log('기존 상담 기록 업데이트 성공')
      } else {
        console.log('새로운 기록 추가')
        const { error: insertError } = await supabase
          .from('counseling_activities')
          .insert([recordData])

        if (insertError) {
          console.error('기록 추가 실패:', insertError)
          throw insertError
        }
        console.log('새로운 상담 기록 추가 성공')
      }

      // 등급 정보 저장 (원본 테이블 저장 - 변경 없음)
      if (consultingForm.customer_grade) {
        console.log('등급 정보 업데이트 시작:', consultingForm.customer_grade)

        const currentGrade = selectedLead.customer_grade || {
          grade: '신규',
          grade_memo: '',
          grade_color: '#3b82f6',
          updated_at: new Date().toISOString(),
          updated_by: userProfile.full_name,
          history: []
        }

        const gradeOption = gradeOptions.find(opt => opt.value === consultingForm.customer_grade)
        const now = new Date().toISOString()

        const updatedHistory = [...currentGrade.history]
        if (currentGrade.grade !== consultingForm.customer_grade) {
          updatedHistory.push({
            grade: currentGrade.grade,
            date: currentGrade.updated_at,
            memo: currentGrade.grade_memo
          })
        }

        const gradeData = {
          grade: consultingForm.customer_grade,
          grade_memo: consultingForm.counseling_memo,
          grade_color: gradeOption?.color || '#6b7280',
          updated_at: now,
          updated_by: userProfile.full_name,
          history: updatedHistory
        }

        if (consultingForm.customer_grade === '결제[유력]' && consultingForm.estimated_amount) {
          gradeData.estimated_contract_amount = consultingForm.estimated_amount
        }

        if (consultingForm.customer_grade === '결제[완료]' && consultingForm.contract_amount) {
          gradeData.confirmed_contract_amount = consultingForm.contract_amount
        }

        console.log('업데이트할 등급 데이터:', gradeData)

        const { error: gradeError } = await supabase
          .from('lead_pool')
          .update({
            additional_data: gradeData,
            updated_at: now
          })
          .eq('id', selectedLead.lead_id)

        if (gradeError) {
          console.error('등급 정보 저장 실패:', gradeError)
          throw gradeError
        }

        console.log('등급 정보 저장 성공')
      }

      toast.success('상담 기록 저장 완료!', 
        `${selectedLead.contact_name || '고객'}님 건의 상담 기록이 저장되었습니다.`)

      setShowConsultingModal(false)
      setSelectedLead(null)
      resetForm()
      
      console.log('데이터 새로고침 시작')
      await loadAssignedLeads()

    } catch (error: any) {
      console.error('상담 기록 저장 실패:', error)
      toast.error('저장 실패', error.message, {
        action: { label: '다시 시도', onClick: () => saveConsultingRecord() }
      })
    } finally {
      setSaving(false)
    }
  }

  const resetForm = () => {
    setConsultingForm({
      assignment_id: '',
      counseling_memo: '',
      actual_customer_name: '',
      investment_budget: '',
      contract_amount: undefined,
      estimated_amount: undefined,
      customer_grade: '신규'
    })
  }

  const renderGradeBadge = (grade?: CustomerGrade) => {
    if (!grade) {
      return (
        <span className="px-1.5 py-0.5 rounded text-xs bg-bg-secondary text-text-tertiary whitespace-nowrap">
          미분류
        </span>
      )
    }

    return (
      <span 
        className="px-1.5 py-0.5 rounded text-xs text-white font-medium whitespace-nowrap"
        style={{ backgroundColor: grade.grade_color }}
      >
        {grade.grade}
      </span>
    )
  }

  // 등급별 통계 계산
  const getGradeStats = () => {
    const stats: Record<string, number> = {};
    gradeOptions.forEach(option => {
      stats[option.value] = leads.filter(lead => lead.customer_grade?.grade === option.value).length;
    });
    stats['미분류'] = leads.filter(lead => !lead.customer_grade?.grade).length;
    return stats;
  };

  // 데이터 로드
  useEffect(() => {
    if (user?.id) {
      loadAssignedLeads()
    }
  }, [user?.id])

  // 필터 적용 - useCallback 제거하고 직접 useEffect 사용
  useEffect(() => {
    if (leads.length > 0) {
      applyFilter();
    }
  }, [leads, gradeFilters, debouncedSearchTerm, sortColumn, sortDirection])

  if (loading) {
    return (
      <CounselorLayout>
        <div className="flex items-center justify-center h-64">
          <div className="flex items-center gap-3 text-text-secondary">
            <businessIcons.team className="w-6 h-6 animate-spin" />
            <span>배정 고객 목록 로딩 중...</span>
          </div>
        </div>
      </CounselorLayout>
    )
  }

  const gradeStats = getGradeStats();

  return (
    <CounselorLayout>
      <div className="p-6 max-w-7xl mx-auto">
        {/* 헤더 */}
        <div className="mb-6">
          <h1 className={designSystem.components.typography.h2}>상담 진행</h1>
          <p className="text-text-secondary mt-2">
            배정받은 고객과의 상담을 진행하고 등급을 관리하세요
          </p>
        </div>

        {/* 통계 카드 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-bg-primary border border-border-primary rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-text-secondary text-sm">전체 배정</p>
                <p className="text-2xl font-bold text-text-primary">{leads.length}</p>
              </div>
              <businessIcons.contact className="w-8 h-8 text-accent" />
            </div>
          </div>

          <div className="bg-bg-primary border border-border-primary rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-text-secondary text-sm">미접촉</p>
                <p className="text-2xl font-bold text-text-primary">
                  {leads.filter(l => l.status === 'not_contacted').length}
                </p>
              </div>
              <businessIcons.phone className="w-8 h-8 text-text-secondary" />
            </div>
          </div>

          <div className="bg-bg-primary border border-border-primary rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-text-secondary text-sm">결제유력</p>
                <p className="text-2xl font-bold text-accent">
                  {gradeStats['결제[유력]'] || 0}
                </p>
              </div>
              <businessIcons.team className="w-8 h-8 text-accent" />
            </div>
          </div>

          <div className="bg-bg-primary border border-border-primary rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-text-secondary text-sm">계약완료</p>
                <p className="text-2xl font-bold text-success">
                  {leads.filter(l => l.status === 'contracted').length}
                </p>
              </div>
              <businessIcons.script className="w-8 h-8 text-success" />
            </div>
          </div>
        </div>

        {/* 날짜 필터 */}
        <div className="mb-6">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-text-secondary text-sm">배정일:</span>
              <input
                type="date"
                value={dateFilters.startDate}
                onChange={(e) => setDateFilters(prev => ({...prev, startDate: e.target.value}))}
                className="px-2 py-1.5 text-sm border border-border-primary rounded-lg bg-bg-primary text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
              />
              <span className="text-text-secondary">~</span>
              <input
                type="date"
                value={dateFilters.endDate}
                onChange={(e) => setDateFilters(prev => ({...prev, endDate: e.target.value}))}
                className="px-2 py-1.5 text-sm border border-border-primary rounded-lg bg-bg-primary text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
              />
              {(dateFilters.startDate || dateFilters.endDate) && (
                <button
                  onClick={() => setDateFilters({startDate: '', endDate: ''})}
                  className="text-xs text-accent hover:text-accent/80 underline"
                >
                  초기화
                </button>
              )}
            </div>
            
            {/* 빠른 날짜 선택 버튼 */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => {
                  const today = new Date().toISOString().slice(0, 10);
                  setDateFilters({startDate: today, endDate: today});
                }}
                className="px-2 py-1 text-xs bg-bg-secondary text-text-primary rounded hover:bg-bg-hover transition-colors"
              >
                당일
              </button>
              <button
                onClick={() => {
                  const now = new Date();
                  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
                  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
                  setDateFilters({startDate: startOfMonth, endDate: endOfMonth});
                }}
                className="px-2 py-1 text-xs bg-bg-secondary text-text-primary rounded hover:bg-bg-hover transition-colors"
              >
                당월
              </button>
              <button
                onClick={() => {
                  const now = new Date();
                  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().slice(0, 10);
                  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().slice(0, 10);
                  setDateFilters({startDate: startOfLastMonth, endDate: endOfLastMonth});
                }}
                className="px-2 py-1 text-xs bg-bg-secondary text-text-primary rounded hover:bg-bg-hover transition-colors"
              >
                전월
              </button>
            </div>
          </div>
        </div>

        {/* 등급 필터 버튼 그룹 - 리드 페이지와 동일한 스타일 */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Tag className="w-4 h-4 text-text-secondary" />
            <span className="text-sm font-medium text-text-primary">등급 필터</span>
            <span className="text-xs text-text-secondary">
              ({gradeFilters.length > 0 ? `${gradeFilters.length}개 선택됨` : '전체'})
            </span>
            {gradeFilters.length > 0 && (
              <button
                onClick={() => setGradeFilters([])}
                className="text-xs text-accent hover:text-accent/80 underline"
              >
                전체 선택 해제
              </button>
            )}
          </div>
          
          <div className="flex flex-wrap gap-2">
            {/* 미분류 버튼 */}
            <button
              onClick={() => toggleGradeFilter('미분류')}
              className={`px-3 py-1.5 text-xs rounded-lg border transition-all ${
                gradeFilters.includes('미분류')
                  ? 'bg-bg-secondary border-accent text-accent font-medium'
                  : 'bg-bg-primary border-border-primary text-text-secondary hover:border-accent/50'
              }`}
            >
              미분류 ({gradeStats['미분류'] || 0})
            </button>

            {/* 등급 버튼들 */}
            {gradeOptions.map(grade => (
              <button
                key={grade.value}
                onClick={() => toggleGradeFilter(grade.value)}
                className={`px-3 py-1.5 text-xs rounded-lg border transition-all ${
                  gradeFilters.includes(grade.value)
                    ? 'text-white font-medium border-transparent'
                    : 'bg-bg-primary border-border-primary text-text-secondary hover:border-accent/50'
                }`}
                style={gradeFilters.includes(grade.value) ? {
                  backgroundColor: grade.color,
                  borderColor: grade.color
                } : {}}
              >
                {grade.label} ({gradeStats[grade.value] || 0})
              </button>
            ))}
          </div>
        </div>

        {/* 제목과 검색 영역 */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <businessIcons.team className="w-4 h-4 text-accent" />
            <h3 className="text-sm font-medium text-text-primary">배정받은 고객</h3>
            <span className="text-xs text-text-secondary px-1.5 py-0.5 bg-bg-secondary rounded">
              필터링: {filteredLeads.length}명 / 전체: {leads.length}명
            </span>
            {loading && (
              <span className="text-xs text-accent animate-pulse">로딩 중...</span>
            )}
          </div>
          
          <div className="flex items-center gap-3">
            {/* 검색 */}
            <div className="relative">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-3 h-3 text-text-secondary" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="고객명, 전화번호로 검색..."
                className="pl-7 pr-3 py-1 w-48 text-xs border border-border-primary rounded bg-bg-primary text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-1 focus:ring-accent"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-text-tertiary hover:text-text-primary"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* 새로고침 버튼 */}
            <button
              onClick={loadAssignedLeads}
              disabled={loading}
              className="px-3 py-2 text-xs rounded font-medium transition-colors bg-bg-secondary text-text-primary hover:bg-bg-hover disabled:opacity-50"
            >
              <RefreshCw className={loading ? "w-3 h-3 mr-1 inline animate-spin" : "w-3 h-3 mr-1 inline"} />
              새로고침
            </button>
          </div>
        </div>

        {/* 활성 필터 표시 */}
        {(gradeFilters.length > 0 || searchTerm) && (
          <div className="flex items-center gap-2 flex-wrap mb-4">
            <span className="text-xs font-medium text-text-secondary">활성 필터:</span>
            
            {gradeFilters.map(grade => {
              const gradeOption = gradeOptions.find(g => g.value === grade);
              return (
                <div key={grade} className="flex items-center gap-1 px-2 py-1 rounded-md text-xs text-white font-medium"
                     style={{ backgroundColor: gradeOption?.color || (grade === '미분류' ? '#6b7280' : '#3b82f6') }}>
                  <Tag className="w-3 h-3" />
                  <span>{gradeOption?.label || grade}</span>
                  <button
                    onClick={() => toggleGradeFilter(grade)}
                    className="ml-1 hover:opacity-70"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              );
            })}
            
            {searchTerm && (
              <div className="flex items-center gap-1 px-2 py-1 bg-success-light text-success rounded-md text-xs">
                <Search className="w-3 h-3" />
                <span>검색: {searchTerm}</span>
                <button
                  onClick={() => setSearchTerm('')}
                  className="ml-1 hover:text-success/70"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}

            {/* 전체 필터 초기화 */}
            <button
              onClick={() => {
                setSearchTerm('');
                setGradeFilters([]);
              }}
              className="text-xs text-text-tertiary hover:text-text-primary underline"
            >
              전체 초기화
            </button>
          </div>
        )}

        {/* 고객 목록 테이블 */}
        <div className="bg-bg-primary border border-border-primary rounded-lg overflow-hidden">
          {currentPageLeads.length > 0 ? (
            <>
              <div className="overflow-auto" style={{ maxHeight: '65vh' }}>
                <table className="w-full table-fixed">
                  <thead className="bg-bg-secondary sticky top-0 z-10">
                    <tr>
                      <th className="text-center py-2 px-1 font-medium text-text-secondary text-xs w-20 cursor-pointer hover:bg-bg-hover transition-colors"
                          onClick={() => handleSort('phone')}>
                        <div className="flex items-center justify-center gap-0.5">
                          <businessIcons.phone className="w-3 h-3" />
                          연락처{renderSortIcon('phone')}
                        </div>
                      </th>
                      <th className="text-center py-2 px-1 font-medium text-text-secondary text-xs w-14 cursor-pointer hover:bg-bg-hover transition-colors"
                          onClick={() => handleSort('actual_customer_name')}>
                        <div className="flex items-center justify-center gap-0.5">
                          <businessIcons.contact className="w-3 h-3" />
                          고객명{renderSortIcon('actual_customer_name')}
                        </div>
                      </th>
                      <th className="text-center py-2 px-1 font-medium text-text-secondary text-xs w-12 cursor-pointer hover:bg-bg-hover transition-colors"
                          onClick={() => handleSort('contact_name')}>
                        <div className="flex items-center justify-center gap-0.5">
                          <businessIcons.team className="w-3 h-3" />
                          안내원{renderSortIcon('contact_name')}
                        </div>
                      </th>
                      <th className="text-center py-2 px-1 font-medium text-text-secondary text-xs w-20">
                        <div className="flex items-center justify-center gap-0.5">
                          <businessIcons.script className="w-3 h-3" />
                          관심분야
                        </div>
                      </th>
                      <th className="text-center py-2 px-1 font-medium text-text-secondary text-xs w-16 cursor-pointer hover:bg-bg-hover transition-colors"
                          onClick={() => handleSort('customer_grade')}>
                        <div className="flex items-center justify-center gap-0.5">
                          <businessIcons.assignment className="w-3 h-3" />
                          등급{renderSortIcon('customer_grade')}
                        </div>
                      </th>
                      <th className="text-center py-2 px-1 font-medium text-text-secondary text-xs w-20">
                        <div className="flex items-center justify-center gap-0.5">
                          <businessIcons.message className="w-3 h-3" />
                          상담메모
                        </div>
                      </th>
                      <th className="text-center py-2 px-1 font-medium text-text-secondary text-xs w-8 cursor-pointer hover:bg-bg-hover transition-colors"
                          onClick={() => handleSort('call_attempts')}>
                        <div className="flex items-center justify-center gap-0.5">
                          <businessIcons.phone className="w-3 h-3" />
                          횟수{renderSortIcon('call_attempts')}
                        </div>
                      </th>
                      <th className="text-center py-2 px-1 font-medium text-text-secondary text-xs w-12 cursor-pointer hover:bg-bg-hover transition-colors"
                          onClick={() => handleSort('last_contact_date')}>
                        <div className="flex items-center justify-center gap-0.5">
                          <businessIcons.date className="w-3 h-3" />
                          최근상담{renderSortIcon('last_contact_date')}
                        </div>
                      </th>
                      <th className="text-center py-2 px-1 font-medium text-text-secondary text-xs w-12 cursor-pointer hover:bg-bg-hover transition-colors"
                          onClick={() => handleSort('assigned_at')}>
                        <div className="flex items-center justify-center gap-0.5">
                          <businessIcons.date className="w-3 h-3" />
                          배정일{renderSortIcon('assigned_at')}
                        </div>
                      </th>
                      <th className="text-center py-2 px-1 font-medium text-text-secondary text-xs w-12">
                        <div className="flex items-center justify-center gap-0.5">
                          <businessIcons.date className="w-3 h-3" />
                          업로드일
                        </div>
                      </th>
                      <th className="text-center py-2 px-1 font-medium text-text-secondary text-xs w-16 cursor-pointer hover:bg-bg-hover transition-colors"
                          onClick={() => handleSort('contract_amount')}>
                        <div className="flex items-center justify-center gap-0.5">
                          <businessIcons.script className="w-3 h-3" />
                          계약금액{renderSortIcon('contract_amount')}
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
                    {currentPageLeads.map((lead) => (
                      <tr key={lead.assignment_id} className="border-b border-border-primary hover:bg-bg-hover transition-colors">
                        {/* 연락처 */}
                        <td className="py-1 px-1 text-center">
                          <div className="font-mono text-text-primary font-medium text-xs truncate">
                            {highlightText(lead.phone, debouncedSearchTerm)}
                          </div>
                        </td>

                        {/* 고객명 */}
                        <td className="py-1 px-1 text-center">
                          <div className="text-xs whitespace-nowrap truncate">
                            {lead.actual_customer_name || lead.real_name ? (
                              <span className="text-text-primary">
                                {highlightText(lead.actual_customer_name || lead.real_name || '', debouncedSearchTerm)}
                              </span>
                            ) : (
                              <span className="text-text-tertiary">미확인</span>
                            )}
                          </div>
                        </td>

                        {/* 안내원 */}
                        <td className="py-1 px-1 text-center">
                          <div className="text-xs whitespace-nowrap truncate">
                            {lead.contact_name ? (
                              <span className="text-text-primary">
                                {highlightText(lead.contact_name, debouncedSearchTerm)}
                              </span>
                            ) : (
                              <span className="text-text-tertiary">미확인</span>
                            )}
                          </div>
                        </td>

                        {/* 관심분야 */}
                        <td className="py-1 px-1 text-center relative">
                          <div className="w-20 group mx-auto">
                            {lead.contact_script ? (
                              <>
                                <div className="text-text-primary text-xs truncate cursor-help">
                                  {highlightText(lead.contact_script, debouncedSearchTerm)}
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

                        {/* 회원등급 */}
                        <td className="py-1 px-1 text-center">
                          {renderGradeBadge(lead.customer_grade)}
                        </td>

                        {/* 상담메모 */}
                        <td className="py-1 px-1 text-center relative">
                          <div className="w-20 group mx-auto">
                            {lead.counseling_memo ? (
                              <>
                                <div className="text-text-primary text-xs truncate cursor-help">
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
                            {lead.call_attempts}
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

                        {/* 배정일자 */}
                        <td className="py-1 px-1 text-center">
                          <span className="text-text-secondary text-xs whitespace-nowrap">
                            {new Date(lead.assigned_at).toLocaleDateString('ko-KR', {
                              month: '2-digit',
                              day: '2-digit'
                            })}
                          </span>
                        </td>

                        {/* 데이터 업로드일 */}
                        <td className="py-1 px-1 text-center">
                          <span className="text-text-secondary text-xs whitespace-nowrap">
                            {lead.data_date ? new Date(lead.data_date).toLocaleDateString('ko-KR', {
                              month: '2-digit',
                              day: '2-digit'
                            }) : lead.created_at ? new Date(lead.created_at).toLocaleDateString('ko-KR', {
                              month: '2-digit',
                              day: '2-digit'
                            }) : '-'}
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
                          <button
                            onClick={() => startConsultingRecord(lead)}
                            className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-accent text-bg-primary rounded text-xs font-medium whitespace-nowrap hover:bg-accent/90 transition-colors"
                          >
                            <businessIcons.phone className="w-3 h-3" />
                            {lead.status === 'not_contacted' ? '입력' : '수정'}
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
                      총 {filteredLeads.length.toLocaleString()}개 중 {((currentPage - 1) * pageSize + 1).toLocaleString()}-{Math.min(currentPage * pageSize, filteredLeads.length).toLocaleString()}개 표시
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
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                        className="px-2 py-1 text-xs border border-border-primary rounded bg-bg-primary text-text-primary disabled:opacity-50 disabled:cursor-not-allowed hover:bg-bg-hover transition-colors"
                      >
                        <ChevronLeft className="w-3 h-3" />
                      </button>
                      
                      <span className="px-2 py-1 text-xs text-white bg-accent rounded">
                        {currentPage} / {totalPages}
                      </span>
                      
                      <button
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
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
              <businessIcons.contact className="w-16 h-16 text-text-tertiary mx-auto mb-4" />
              <h3 className="text-lg font-medium text-text-primary mb-2">
                {gradeFilters.length > 0 || searchTerm || dateFilters.startDate || dateFilters.endDate ? '조건에 맞는 고객이 없습니다' : '배정받은 고객이 없습니다'}
              </h3>
              <p className="text-text-secondary mb-4">
                {gradeFilters.length > 0 || searchTerm || dateFilters.startDate || dateFilters.endDate ? '필터 조건을 변경해보세요.' : '관리자가 고객을 배정하면 여기에 표시됩니다.'}
              </p>
              
              {(gradeFilters.length > 0 || searchTerm || dateFilters.startDate || dateFilters.endDate) && (
                <div className="flex items-center justify-center gap-2">
                  <button
                    onClick={() => setGradeFilters([])}
                    className="px-3 py-1.5 text-xs bg-bg-secondary text-text-primary rounded hover:bg-bg-hover transition-colors"
                  >
                    등급 필터 해제
                  </button>
                  <button
                    onClick={() => setSearchTerm('')}
                    className="px-3 py-1.5 text-xs bg-bg-secondary text-text-primary rounded hover:bg-bg-hover transition-colors"
                  >
                    검색어 지우기
                  </button>
                  <button
                    onClick={() => setDateFilters({startDate: '', endDate: ''})}
                    className="px-3 py-1.5 text-xs bg-bg-secondary text-text-primary rounded hover:bg-bg-hover transition-colors"
                  >
                    날짜 필터 해제
                  </button>
                  <button
                    onClick={() => {
                      setSearchTerm('');
                      setGradeFilters([]);
                      setDateFilters({startDate: '', endDate: ''});
                    }}
                    className="px-3 py-1.5 text-xs bg-accent text-white rounded hover:bg-accent/90 transition-colors"
                  >
                    전체 초기화
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 상담 기록 모달 (기존 로직 완전 유지) */}
        {showConsultingModal && selectedLead && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-bg-primary border border-border-primary rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-6 border-b border-border-primary">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-accent rounded-xl flex items-center justify-center">
                    <businessIcons.phone className="w-5 h-5 text-bg-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-text-primary">상담 기록 입력</h3>
                    <p className="text-sm text-text-secondary">
                      {selectedLead.contact_name || '고객'}님 ({selectedLead.phone})
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowConsultingModal(false)
                    setSelectedLead(null)
                    resetForm()
                  }}
                  disabled={saving}
                  className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-bg-hover text-text-secondary disabled:opacity-50"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                <div className="p-4 bg-bg-secondary rounded-lg border-l-4 border-accent">
                  <h4 className="font-medium text-text-primary text-sm mb-3">DB 기본 정보</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-text-secondary">고객명:</span>
                      <span className="ml-2 font-medium text-text-primary">
                        {selectedLead.real_name || <span className="text-text-tertiary">미등록</span>}
                      </span>
                    </div>
                    <div>
                      <span className="text-text-secondary">안내원:</span>
                      <span className="ml-2 font-medium text-text-primary">{selectedLead.contact_name || '미확인'}</span>
                    </div>
                    <div>
                      <span className="text-text-secondary">연락처:</span>
                      <span className="ml-2 font-mono font-medium text-text-primary">{selectedLead.phone}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-text-secondary">관심분야:</span>
                      <span className="ml-2 text-text-primary">{selectedLead.contact_script || '미확인'}</span>
                    </div>
                  </div>
                </div>

                {selectedLead.customer_grade && (
                  <div className="p-3 bg-bg-secondary rounded-lg">
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-text-secondary">현재 등급:</span>
                      {renderGradeBadge(selectedLead.customer_grade)}
                      {selectedLead.customer_grade.grade_memo && (
                        <span className="text-sm text-text-tertiary">
                          {selectedLead.customer_grade.grade_memo}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2 text-text-primary">실제 고객명</label>
                    <input
                      type="text"
                      value={consultingForm.actual_customer_name}
                      onChange={(e) => setConsultingForm(prev => ({ ...prev, actual_customer_name: e.target.value }))}
                      className="w-full px-3 py-2 border border-border-primary rounded-lg bg-bg-primary text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
                      placeholder="실제 고객명 (확인시 입력)"
                    />
                    <p className="text-xs text-text-tertiary mt-1">
                      DB고객명: <strong>{selectedLead.contact_name || '미확인'}</strong> | 관심분야: <strong>{selectedLead.contact_script || '미확인'}</strong>
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2 text-text-primary">회원등급 *</label>
                      <select
                        value={consultingForm.customer_grade}
                        onChange={(e) => setConsultingForm(prev => ({ ...prev, customer_grade: e.target.value }))}
                        className="w-full px-3 py-2 border border-border-primary rounded-lg bg-bg-primary text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
                        required
                      >
                        {gradeOptions.map(grade => (
                          <option key={grade.value} value={grade.value}>
                            {grade.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2 text-text-primary">투자예산</label>
                      <select
                        value={consultingForm.investment_budget}
                        onChange={(e) => setConsultingForm(prev => ({ ...prev, investment_budget: e.target.value }))}
                        className="w-full px-3 py-2 border border-border-primary rounded-lg bg-bg-primary text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
                      >
                        <option value="">선택 안함</option>
                        <option value="1000만원 미만">1000만원 미만</option>
                        <option value="1000~3000만원">1000~3000만원</option>
                        <option value="3000~5000만원">3000~5000만원</option>
                        <option value="5000만원~1억">5000만원~1억</option>
                        <option value="1억 이상">1억 이상</option>
                      </select>
                    </div>
                  </div>

                  {consultingForm.customer_grade === '결제[유력]' && (
                    <div>
                      <label className="block text-sm font-medium mb-2 text-text-primary">예상 계약금액 (원)</label>
                      <input
                        type="text"
                        value={consultingForm.estimated_amount ? consultingForm.estimated_amount.toLocaleString() : ''}
                        onChange={(e) => {
                          const value = e.target.value.replace(/[^0-9]/g, '')
                          setConsultingForm(prev => ({ 
                            ...prev, 
                            estimated_amount: value ? Number(value) : undefined
                          }))
                        }}
                        className="w-full px-3 py-2 border border-border-primary rounded-lg bg-bg-primary text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
                        placeholder="1,000,000"
                      />
                      <p className="text-xs text-text-tertiary mt-1">예상금액은 매출 집계에 포함되지 않습니다</p>
                    </div>
                  )}

                  {consultingForm.customer_grade === '결제[완료]' && (
                    <div>
                      <label className="block text-sm font-medium mb-2 text-text-primary">확정 계약금액 (원) *</label>
                      <input
                        type="text"
                        value={consultingForm.contract_amount ? consultingForm.contract_amount.toLocaleString() : ''}
                        onChange={(e) => {
                          const value = e.target.value.replace(/[^0-9]/g, '')
                          setConsultingForm(prev => ({ 
                            ...prev, 
                            contract_amount: value ? Number(value) : undefined
                          }))
                        }}
                        className="w-full px-3 py-2 border border-border-primary rounded-lg bg-bg-primary text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
                        placeholder="1,000,000"
                        required
                      />
                      <p className="text-xs text-text-success mt-1">확정금액은 매출 집계에 포함됩니다</p>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium mb-2 text-text-primary">상담 메모 (등급 설정 사유 포함) *</label>
                    <textarea
                      value={consultingForm.counseling_memo}
                      onChange={(e) => setConsultingForm(prev => ({ ...prev, counseling_memo: e.target.value }))}
                      className="w-full px-3 py-2 border border-border-primary rounded-lg bg-bg-primary text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
                      rows={4}
                      placeholder="상담 내용과 등급 설정 사유를 함께 기록하세요..."
                      required
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={saveConsultingRecord}
                    disabled={saving || !consultingForm.counseling_memo || !consultingForm.customer_grade}
                    className={designSystem.utils.cn(
                      designSystem.components.button.primary,
                      "flex-1",
                      (!consultingForm.counseling_memo || !consultingForm.customer_grade || saving) && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    {saving ? (
                      <>
                        <businessIcons.team className="w-4 h-4 mr-2 animate-spin" />
                        저장 중...
                      </>
                    ) : (
                      <>
                        <businessIcons.script className="w-4 h-4 mr-2" />
                        저장
                      </>
                    )}
                  </button>
                  
                  <button
                    onClick={() => {
                      setShowConsultingModal(false)
                      setSelectedLead(null)
                      resetForm()
                    }}
                    disabled={saving}
                    className={designSystem.components.button.secondary}
                  >
                    취소
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </CounselorLayout>
  )
}

export default function CounselorConsulting() {
  return (
    <ProtectedRoute requiredRole="counselor">
      <CounselorConsultingContent />
    </ProtectedRoute>
  );
}