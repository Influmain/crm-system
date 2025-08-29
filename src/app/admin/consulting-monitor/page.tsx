'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { designSystem } from '@/lib/design-system';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { businessIcons } from '@/lib/design-system/icons';
import { useToastHelpers } from '@/components/ui/Toast';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth/AuthContext';
import AdminLayout from '@/components/layout/AdminLayout';

// 타입 정의
interface Counselor {
  id: string
  name: string
  email: string
  assigned_count: number
  in_progress_count: number
  completed_count: number
  contracted_count: number
  total_contract_amount: number
}

interface CounselorLead {
  assignment_id: string
  lead_id: string
  phone: string
  actual_customer_name?: string
  data_source: string
  contact_script: string
  assigned_at: string
  last_contact_date?: string
  call_attempts: number
  latest_contact_result?: string
  latest_contract_status?: string
  contract_amount?: number
  status: 'not_contacted' | 'in_progress' | 'completed' | 'contracted'
  counseling_memo?: string
  customer_reaction?: string
}

function CounselingMonitorContent() {
  const { user, userProfile, hasPermission, isAdmin, isSuperAdmin } = useAuth()
  const toast = useToastHelpers()
  const router = useRouter()
  
  // 상태 관리
  const [counselors, setCounselors] = useState<Counselor[]>([])
  const [selectedCounselor, setSelectedCounselor] = useState<string>('')
  const [counselorLeads, setCounselorLeads] = useState<CounselorLead[]>([])
  const [loading, setLoading] = useState(true)
  const [leadsLoading, setLeadsLoading] = useState(false)
  
  // 필터 상태
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')

  // 페이징 상태
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const itemsPerPage = 50

  // 마운트 상태 (Hydration 방지)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // 권한 체크 함수 추가
  const checkAdminPermission = () => {
    if (!userProfile) {
      toast.error('인증 오류', '사용자 정보를 확인할 수 없습니다.')
      router.push('/login')
      return false
    }

    if (!isAdmin && !isSuperAdmin) {
      toast.error('접근 권한 없음', '관리자만 접근할 수 있는 페이지입니다.')
      router.push('/admin/dashboard')
      return false
    }

    if (!hasPermission('consulting_monitor')) {
      toast.error('기능 권한 없음', '상담 모니터링 기능에 대한 권한이 없습니다.')
      router.push('/admin/dashboard')  
      return false
    }

    return true
  }

  // 전화번호 마스킹 함수
  const maskPhoneNumber = (phone: string): string => {
    if (!phone) return '-'
    
    // phone_unmask 권한이 있으면 마스킹하지 않음
    if (hasPermission('phone_unmask')) {
      return phone
    }
    
    // 전화번호 마스킹 처리 (가운데 4자리만)
    if (phone.length >= 8) {
      const start = phone.slice(0, 3)
      const end = phone.slice(-4)
      return start + '****' + end
    }
    
    // 8자리 미만은 앞 2자리만 보여주고 나머지는 *
    return phone.slice(0, 2) + '*'.repeat(phone.length - 2)
  }

  // 고객명 마스킹 함수
  const maskCustomerName = (name: string | null): string => {
    if (!name || name === '고객명 미확인') return '고객명 미확인'
    
    // phone_unmask 권한이 있으면 마스킹하지 않음
    if (hasPermission('phone_unmask')) {
      return name
    }
    
    // 이름 마스킹: 첫 글자만 표시하고 나머지는 *
    if (name.length <= 1) return name
    if (name.length === 2) return name.charAt(0) + '*'
    return name.charAt(0) + '*'.repeat(name.length - 2) + name.charAt(name.length - 1)
  }

  // 데이터 로드
  useEffect(() => {
    if (mounted && userProfile) {
      if (checkAdminPermission()) {
        loadCounselors()
      }
    }
  }, [mounted, userProfile])

  // 영업사원 선택 시 리드 로드
  useEffect(() => {
    if (selectedCounselor && mounted) {
      setCurrentPage(1) // 페이지 초기화
      loadCounselorLeads(selectedCounselor, 1)
    }
  }, [selectedCounselor])

  // 영업사원 목록 로드 (성능 최적화)
  const loadCounselors = async () => {
    setLoading(true)
    try {
      // 영업사원 목록 조회
      const { data: counselorsData, error: counselorsError } = await supabase
        .from('users')
        .select('id, full_name, email, role, phone, department, is_active')
        .eq('role', 'counselor')
        .eq('is_active', true)
        .order('full_name', { ascending: true })

      if (counselorsError) throw counselorsError

      // 각 영업사원별 통계를 순차적으로 계산 (성능 최적화)
      const enrichedCounselors: Counselor[] = []
      
      for (const counselor of counselorsData || []) {
        try {
          // 배정된 리드 수
          const { count: assignedCount } = await supabase
            .from('lead_assignments')
            .select('*', { count: 'exact', head: true })
            .eq('counselor_id', counselor.id)
            .eq('status', 'active')

          // 상담 현황별 통계 - 최적화된 집계 쿼리
          const { data: statusStats } = await supabase
            .rpc('get_counselor_status_stats', { 
              counselor_id_param: counselor.id 
            })

          // RPC 함수가 없다면 기본 계산 방식 사용
          let inProgressCount = 0
          let completedCount = 0  
          let contractedCount = 0
          let totalContractAmount = 0

          if (!statusStats) {
            // 기본 계산 방식 (RPC 함수 없을 때)
            const { data: leadsData } = await supabase
              .from('lead_assignments')
              .select(`
                id,
                counseling_activities!inner (
                  contact_result,
                  contract_status,
                  contract_amount,
                  contact_date
                )
              `)
              .eq('counselor_id', counselor.id)
              .eq('status', 'active')

            // v6 중복 제거 패턴: assignment별 최신 기록만 사용
            leadsData?.forEach(assignment => {
              const activities = assignment.counseling_activities
              if (activities && activities.length > 0) {
                // 최신 활동만 추출 (contact_date 기준 정렬)
                const latestActivity = activities
                  .sort((a, b) => new Date(b.contact_date).getTime() - new Date(a.contact_date).getTime())[0]
                
                if (latestActivity.contract_status === 'contracted') {
                  contractedCount++
                  totalContractAmount += latestActivity.contract_amount || 0
                } else if (latestActivity.contract_status === 'failed') {
                  completedCount++
                } else {
                  inProgressCount++
                }
              }
            })
          } else {
            // RPC 결과 사용
            inProgressCount = statusStats.in_progress_count || 0
            completedCount = statusStats.completed_count || 0
            contractedCount = statusStats.contracted_count || 0
            totalContractAmount = statusStats.total_contract_amount || 0
          }

          enrichedCounselors.push({
            id: counselor.id,
            name: counselor.full_name,
            email: counselor.email,
            assigned_count: assignedCount || 0,
            in_progress_count: inProgressCount,
            completed_count: completedCount,
            contracted_count: contractedCount,
            total_contract_amount: totalContractAmount
          })

        } catch (error) {
          console.error(`영업사원 ${counselor.full_name} 통계 계산 오류:`, error)
          // 오류 시 기본값으로 추가
          enrichedCounselors.push({
            id: counselor.id,
            name: counselor.full_name,
            email: counselor.email,
            assigned_count: 0,
            in_progress_count: 0,
            completed_count: 0,
            contracted_count: 0,
            total_contract_amount: 0
          })
        }
      }

      setCounselors(enrichedCounselors)
      
      // 첫 번째 영업사원 자동 선택
      if (enrichedCounselors.length > 0 && !selectedCounselor) {
        setSelectedCounselor(enrichedCounselors[0].id)
      }

      toast.success('영업사원 목록 로드 완료', `${enrichedCounselors.length}명의 영업사원을 불러왔습니다.`)

    } catch (error: any) {
      console.error('영업사원 데이터 로드 오류:', error)
      toast.error('데이터 로드 실패', error.message, {
        action: { label: '다시 시도', onClick: () => loadCounselors() }
      })
    } finally {
      setLoading(false)
    }
  }

  // 선택한 영업사원의 리드 목록 로드 (페이징 적용)
  const loadCounselorLeads = async (counselorId: string, page: number = 1) => {
    setLeadsLoading(true)
    try {
      const startRange = (page - 1) * itemsPerPage
      const endRange = startRange + itemsPerPage - 1

      // 배정 목록 조회 (페이징)
      const { data: leadsData, error: leadsError, count } = await supabase
        .from('lead_assignments')
        .select(`
          id,
          lead_id,
          assigned_at,
          status,
          lead_pool!inner (
            id,
            phone,
            contact_name,
            data_source,
            contact_script
          )
        `, { count: 'exact' })
        .eq('counselor_id', counselorId)
        .eq('status', 'active')
        .order('assigned_at', { ascending: false })
        .range(startRange, endRange)

      if (leadsError) throw leadsError

      // 각 배정별 최신 상담 기록 조회
      const enrichedLeads = await Promise.all(
        leadsData?.map(async (assignment) => {
          const { data: latestConsulting } = await supabase
            .from('counseling_activities')
            .select('contact_date, contact_result, contract_status, contract_amount, counseling_memo, customer_reaction, actual_customer_name')
            .eq('assignment_id', assignment.id)
            .order('contact_date', { ascending: false })
            .limit(1)
            .maybeSingle()

          // 상담 횟수 조회
          const { count: callAttempts } = await supabase
            .from('counseling_activities')
            .select('*', { count: 'exact', head: true })
            .eq('assignment_id', assignment.id)

          // 상태 계산
          let status: CounselorLead['status'] = 'not_contacted'
          if (latestConsulting) {
            if (latestConsulting.contract_status === 'contracted') {
              status = 'contracted'
            } else if (latestConsulting.contract_status === 'failed') {
              status = 'completed'
            } else {
              status = 'in_progress'
            }
          }

          return {
            assignment_id: assignment.id,
            lead_id: assignment.lead_id,
            phone: assignment.lead_pool?.phone || '',
            actual_customer_name: latestConsulting?.actual_customer_name || null,
            data_source: assignment.lead_pool?.data_source || '미지정',
            contact_script: assignment.lead_pool?.contact_script || '',
            assigned_at: assignment.assigned_at,
            last_contact_date: latestConsulting?.contact_date || null,
            call_attempts: callAttempts || 0,
            latest_contact_result: latestConsulting?.contact_result || null,
            latest_contract_status: latestConsulting?.contract_status || null,
            contract_amount: latestConsulting?.contract_amount || null,
            status,
            counseling_memo: latestConsulting?.counseling_memo || null,
            customer_reaction: latestConsulting?.customer_reaction || null
          }
        }) || []
      )

      setCounselorLeads(enrichedLeads)
      setTotalCount(count || 0)
      setTotalPages(Math.ceil((count || 0) / itemsPerPage))
      setCurrentPage(page)

    } catch (error: any) {
      console.error('영업사원 리드 데이터 로드 오류:', error)
      toast.error('리드 데이터 로드 실패', error.message)
    } finally {
      setLeadsLoading(false)
    }
  }

  // 필터링된 리드 목록 (클라이언트 필터링)
  const filteredLeads = counselorLeads.filter(lead => {
    // 상태 필터
    if (statusFilter !== 'all' && lead.status !== statusFilter) {
      return false
    }
    
    // 검색 필터 (마스킹된 데이터로 검색)
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase()
      const maskedPhone = maskPhoneNumber(lead.phone)
      const maskedName = maskCustomerName(lead.actual_customer_name)
      
      return (
        maskedPhone.includes(searchTerm) ||
        maskedName.toLowerCase().includes(searchLower) ||
        lead.contact_script.toLowerCase().includes(searchLower) ||
        lead.data_source.toLowerCase().includes(searchLower) ||
        (lead.counseling_memo && lead.counseling_memo.toLowerCase().includes(searchLower))
      )
    }
    
    return true
  })

  // 선택된 영업사원 정보
  const selectedCounselorInfo = counselors.find(c => c.id === selectedCounselor)

  // 상태별 스타일
  const getStatusBadge = (status: CounselorLead['status']) => {
    const styles = {
      not_contacted: 'bg-bg-secondary text-text-primary',
      in_progress: 'bg-accent/10 text-accent',
      completed: 'bg-text-secondary/10 text-text-secondary',
      contracted: 'bg-accent/20 text-accent font-medium'
    }
    
    const labels = {
      not_contacted: '미접촉',
      in_progress: '상담중',
      completed: '완료',
      contracted: '계약'
    }
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs ${styles[status]}`}>
        {labels[status]}
      </span>
    )
  }

  // 최근 활동 시간 계산
  const getTimeAgo = (dateString: string | null) => {
    if (!dateString) return '미접촉'
    
    const now = new Date()
    const date = new Date(dateString)
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    
    if (diffMins < 60) {
      return `${diffMins}분 전`
    } else if (diffHours < 24) {
      return `${diffHours}시간 전`
    } else {
      return `${diffDays}일 전`
    }
  }

  // 페이지 변경 핸들러
  const handlePageChange = (page: number) => {
    if (selectedCounselor) {
      loadCounselorLeads(selectedCounselor, page)
    }
  }

  // Hydration 방지
  if (!mounted) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="flex items-center gap-3 text-text-secondary">
            <businessIcons.team className="w-6 h-6" />
            <span>로딩 중...</span>
          </div>
        </div>
      </AdminLayout>
    )
  }

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="flex items-center gap-3 text-text-secondary">
            <businessIcons.team className="w-6 h-6 animate-spin" />
            <span>영업사원 데이터 로딩 중...</span>
          </div>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <div className="p-6 max-w-7xl mx-auto">
        {/* 헤더 */}
        <div className="mb-8">
          <h1 className={designSystem.components.typography.h2}>상담 현황 실시간 모니터링</h1>
          <p className="text-text-secondary mt-2">
            영업사원별 실시간 진행상황을 모니터링하세요
          </p>
        </div>

        {/* 영업사원 선택 및 새로고침 */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <span className="text-text-secondary text-sm">영업사원 선택:</span>
            <select
              value={selectedCounselor}
              onChange={(e) => setSelectedCounselor(e.target.value)}
              className="px-4 py-2 border border-border-primary rounded-lg bg-bg-primary text-text-primary focus:outline-none focus:ring-2 focus:ring-accent min-w-48"
            >
              <option value="">영업사원을 선택하세요</option>
              {counselors.map(counselor => (
                <option key={counselor.id} value={counselor.id}>
                  {counselor.name} ({counselor.assigned_count}건 배정)
                </option>
              ))}
            </select>
          </div>
          
          <button
            onClick={() => {
              if (checkAdminPermission()) {
                loadCounselors()
                if (selectedCounselor) {
                  loadCounselorLeads(selectedCounselor, currentPage)
                }
              }
            }}
            disabled={loading || leadsLoading}
            className={designSystem.utils.cn(
              designSystem.components.button.secondary,
              "px-4 py-2"
            )}
          >
            <businessIcons.team className={`w-4 h-4 mr-2 ${(loading || leadsLoading) ? 'animate-spin' : ''}`} />
            새로고침
          </button>
        </div>

        {/* 선택된 영업사원 현황 */}
        {selectedCounselorInfo && (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-6">
            <div className="bg-bg-primary border border-border-primary rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-text-secondary text-sm">배정</p>
                  <p className="text-2xl font-bold text-text-primary">{selectedCounselorInfo.assigned_count}</p>
                </div>
                <businessIcons.contact className="w-8 h-8 text-text-secondary" />
              </div>
            </div>

            <div className="bg-bg-primary border border-border-primary rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-text-secondary text-sm">미접촉</p>
                  <p className="text-2xl font-bold text-text-primary">
                    {selectedCounselorInfo.assigned_count - selectedCounselorInfo.in_progress_count - selectedCounselorInfo.completed_count - selectedCounselorInfo.contracted_count}
                  </p>
                </div>
                <businessIcons.phone className="w-8 h-8 text-text-secondary" />
              </div>
            </div>

            <div className="bg-bg-primary border border-border-primary rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-text-secondary text-sm">상담중</p>
                  <p className="text-2xl font-bold text-accent">{selectedCounselorInfo.in_progress_count}</p>
                </div>
                <businessIcons.message className="w-8 h-8 text-accent" />
              </div>
            </div>

            <div className="bg-bg-primary border border-border-primary rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-text-secondary text-sm">계약</p>
                  <p className="text-2xl font-bold text-accent">{selectedCounselorInfo.contracted_count}</p>
                </div>
                <businessIcons.script className="w-8 h-8 text-accent" />
              </div>
            </div>

            <div className="bg-bg-primary border border-border-primary rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-text-secondary text-sm">총 매출</p>
                  <p className="text-lg font-bold text-accent">
                    {selectedCounselorInfo.total_contract_amount.toLocaleString()}원
                  </p>
                </div>
                <businessIcons.date className="w-8 h-8 text-accent" />
              </div>
            </div>
          </div>
        )}

        {/* 필터 및 검색 */}
        {selectedCounselor && (
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <span className="text-text-secondary text-sm">상태 필터:</span>
              <div className="flex gap-2">
                {[
                  { key: 'all', label: '전체' },
                  { key: 'not_contacted', label: '미접촉' },
                  { key: 'in_progress', label: '상담중' },
                  { key: 'completed', label: '완료' },
                  { key: 'contracted', label: '계약' }
                ].map(filter => (
                  <button
                    key={filter.key}
                    onClick={() => setStatusFilter(filter.key)}
                    className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                      statusFilter === filter.key
                        ? 'bg-accent text-bg-primary'
                        : 'bg-bg-secondary text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
            </div>
            
            {/* 검색창 */}
            <div className="relative">
              <businessIcons.script className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-text-secondary" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="고객명, 전화번호, 메모로 검색..."
                className="pl-10 pr-4 py-2 w-80 border border-border-primary rounded-lg bg-bg-primary text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
          </div>
        )}

        {/* 영업사원 리드 목록 */}
        {selectedCounselor && (
          <div className="bg-bg-primary border border-border-primary rounded-lg overflow-hidden">
            <div className="p-4 border-b border-border-primary">
              <div className="flex items-center gap-3">
                <businessIcons.team className="w-5 h-5 text-accent" />
                <h3 className="font-medium text-text-primary">
                  {selectedCounselorInfo?.name}님의 배정 고객
                </h3>
                <span className="text-sm text-text-secondary">
                  총 {totalCount}명 ({filteredLeads.length}명 표시)
                </span>
                {!hasPermission('phone_unmask') && (
                  <span className="text-xs text-text-tertiary bg-bg-secondary px-2 py-1 rounded">
                    개인정보 마스킹됨
                  </span>
                )}
              </div>
            </div>

            {leadsLoading ? (
              <div className="p-12 text-center">
                <businessIcons.team className="w-8 h-8 text-text-tertiary mx-auto mb-2 animate-spin" />
                <p className="text-text-secondary">상담 데이터 로딩 중...</p>
              </div>
            ) : filteredLeads.length > 0 ? (
              <>
                <div className="overflow-x-auto" style={{ maxHeight: '60vh' }}>
                  <table className="w-full">
                    <thead className="bg-bg-secondary sticky top-0">
                      <tr>
                        <th className="text-left py-3 px-4 font-medium text-text-secondary text-sm">
                          <div className="flex items-center gap-2">
                            <businessIcons.phone className="w-4 h-4" />
                            연락처
                          </div>
                        </th>
                        <th className="text-left py-3 px-4 font-medium text-text-secondary text-sm">
                          <div className="flex items-center gap-2">
                            <businessIcons.contact className="w-4 h-4" />
                            고객명
                          </div>
                        </th>
                        <th className="text-left py-3 px-4 font-medium text-text-secondary text-sm">
                          <div className="flex items-center gap-2">
                            <businessIcons.script className="w-4 h-4" />
                            관심분야
                          </div>
                        </th>
                        <th className="text-center py-3 px-4 font-medium text-text-secondary text-sm">
                          <div className="flex items-center justify-center gap-2">
                            <businessIcons.message className="w-4 h-4" />
                            상담횟수
                          </div>
                        </th>
                        <th className="text-left py-3 px-4 font-medium text-text-secondary text-sm">
                          <div className="flex items-center gap-2">
                            <businessIcons.date className="w-4 h-4" />
                            최근활동
                          </div>
                        </th>
                        <th className="text-center py-3 px-4 font-medium text-text-secondary text-sm">
                          <div className="flex items-center justify-center gap-2">
                            <businessIcons.team className="w-4 h-4" />
                            상태
                          </div>
                        </th>
                        <th className="text-right py-3 px-4 font-medium text-text-secondary text-sm">
                          <div className="flex items-center justify-end gap-2">
                            <businessIcons.script className="w-4 h-4" />
                            계약금액
                          </div>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredLeads.map((lead) => (
                        <tr key={lead.assignment_id} className="border-b border-border-primary hover:bg-bg-hover transition-colors">
                          {/* 연락처 (마스킹 적용) */}
                          <td className="py-4 px-4">
                            <div className="font-mono text-text-primary font-medium">
                              {maskPhoneNumber(lead.phone)}
                            </div>
                          </td>

                          {/* 고객명 (마스킹 적용) */}
                          <td className="py-4 px-4">
                            <div>
                              <div className="font-medium text-text-primary">
                                {maskCustomerName(lead.actual_customer_name)}
                              </div>
                              <div className="text-xs text-text-secondary">
                                {lead.data_source}
                              </div>
                            </div>
                          </td>

                          {/* 관심분야 */}
                          <td className="py-4 px-4">
                            <div className="text-text-primary">
                              {lead.contact_script}
                            </div>
                          </td>

                          {/* 상담 횟수 */}
                          <td className="py-4 px-4 text-center">
                            <span className="font-medium text-text-primary">
                              {lead.call_attempts}회
                            </span>
                          </td>

                          {/* 최근 활동 */}
                          <td className="py-4 px-4">
                            <div>
                              <span className="text-text-secondary text-sm">
                                {getTimeAgo(lead.last_contact_date)}
                              </span>
                              {lead.customer_reaction && (
                                <div className="text-xs text-text-tertiary mt-1">
                                  반응: {lead.customer_reaction}
                                </div>
                              )}
                            </div>
                          </td>

                          {/* 상태 */}
                          <td className="py-4 px-4 text-center">
                            {getStatusBadge(lead.status)}
                          </td>

                          {/* 계약금액 */}
                          <td className="py-4 px-4 text-right">
                            {lead.contract_amount ? (
                              <span className="font-medium text-accent">
                                {lead.contract_amount.toLocaleString()}원
                              </span>
                            ) : (
                              <span className="text-text-tertiary">-</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* 페이징 컴포넌트 */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between px-4 py-3 bg-bg-primary border-t border-border-primary">
                    <div className="flex items-center text-sm text-text-secondary">
                      <span>
                        총 {totalCount.toLocaleString()}개 중 {((currentPage - 1) * itemsPerPage + 1).toLocaleString()}-{Math.min(currentPage * itemsPerPage, totalCount).toLocaleString()}개 표시
                      </span>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage <= 1}
                        className={designSystem.utils.cn(
                          "p-2 rounded-lg border",
                          currentPage <= 1
                            ? "bg-bg-secondary text-text-tertiary cursor-not-allowed"
                            : "bg-bg-primary text-text-primary hover:bg-bg-hover border-border-primary"
                        )}
                      >
                        <businessIcons.date className="w-4 h-4 transform rotate-180" />
                      </button>
                      
                      <span className="px-3 py-2 text-sm text-text-primary">
                        {currentPage} / {totalPages}
                      </span>
                      
                      <button
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage >= totalPages}
                        className={designSystem.utils.cn(
                          "p-2 rounded-lg border",
                          currentPage >= totalPages
                            ? "bg-bg-secondary text-text-tertiary cursor-not-allowed"
                            : "bg-bg-primary text-text-primary hover:bg-bg-hover border-border-primary"
                        )}
                      >
                        <businessIcons.date className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-12">
                <businessIcons.contact className="w-16 h-16 text-text-tertiary mx-auto mb-4" />
                <h3 className="text-lg font-medium text-text-primary mb-2">
                  {statusFilter === 'all' ? '배정된 고객이 없습니다' : `${statusFilter} 상태의 고객이 없습니다`}
                </h3>
                <p className="text-text-secondary">
                  영업사원에게 고객을 배정하면 여기에 표시됩니다.
                </p>
              </div>
            )}
          </div>
        )}

        {/* 영업사원 미선택 시 */}
        {!selectedCounselor && (
          <div className="text-center py-12">
            <businessIcons.team className="w-16 h-16 text-text-tertiary mx-auto mb-4" />
            <h3 className="text-lg font-medium text-text-primary mb-2">
              영업사원을 선택해주세요
            </h3>
            <p className="text-text-secondary">
              위에서 영업사원을 선택하면 해당 영업사원의 실시간 진행상황을 확인할 수 있습니다.
            </p>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}

// 올바른 함수명으로 수정
export default function CounselingMonitorPage() {
  return (
    <ProtectedRoute requiredPermission="consulting_monitor">
      <CounselingMonitorContent />
    </ProtectedRoute>
  );
}