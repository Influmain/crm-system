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

function ConsultingMonitorContent() {
  const { user } = useAuth()
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

  // 데이터 로드
  useEffect(() => {
    loadCounselors()
  }, [])

  // 상담원 선택 시 리드 로드
  useEffect(() => {
    if (selectedCounselor) {
      loadCounselorLeads(selectedCounselor)
    }
  }, [selectedCounselor])

  // 상담원 목록 로드
  const loadCounselors = async () => {
    setLoading(true)
    try {
      // users 테이블에서 상담원 목록 조회
      const { data: counselorsData, error: counselorsError } = await supabase
        .from('users')
        .select('id, full_name, email, role, phone, department, is_active')
        .eq('role', 'counselor')
        .order('full_name', { ascending: true })

      if (counselorsError) throw counselorsError

      // 각 상담원별 통계 계산
      const enrichedCounselors = await Promise.all(
        counselorsData?.map(async (counselor) => {
          // 배정된 리드 수
          const { count: assignedCount } = await supabase
            .from('lead_assignments')
            .select('*', { count: 'exact' })
            .eq('counselor_id', counselor.id)
            .eq('status', 'active')

          // 상담 현황별 통계 - 직접 계산
          const { data: leadsData } = await supabase
            .from('lead_assignments')
            .select(`
              id,
              counseling_activities (
                contact_result,
                contract_status,
                contract_amount
              )
            `)
            .eq('counselor_id', counselor.id)
            .eq('status', 'active')

          let inProgressCount = 0
          let completedCount = 0
          let contractedCount = 0
          let totalContractAmount = 0

          leadsData?.forEach(assignment => {
            const activities = assignment.counseling_activities
            if (activities && activities.length > 0) {
              const latestActivity = activities[activities.length - 1]
              
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

          return {
            id: counselor.id,
            name: counselor.full_name,
            email: counselor.email,
            assigned_count: assignedCount || 0,
            in_progress_count: inProgressCount,
            completed_count: completedCount,
            contracted_count: contractedCount,
            total_contract_amount: totalContractAmount
          }
        }) || []
      )

      setCounselors(enrichedCounselors)
      
      // 첫 번째 상담원 자동 선택
      if (enrichedCounselors.length > 0 && !selectedCounselor) {
        setSelectedCounselor(enrichedCounselors[0].id)
      }

      toast.success('상담원 목록 로드 완료', `${enrichedCounselors.length}명의 상담원을 불러왔습니다.`)

    } catch (error: any) {
      console.error('상담원 데이터 로드 오류:', error)
      toast.error('데이터 로드 실패', error.message, {
        action: { label: '다시 시도', onClick: () => loadCounselors() }
      })
    } finally {
      setLoading(false)
    }
  }

  // 선택한 상담원의 리드 목록 로드
  const loadCounselorLeads = async (counselorId: string) => {
    setLeadsLoading(true)
    try {
      // 직접 조회 방식 사용 (뷰에 contract_amount가 제대로 포함되지 않음)
      const { data: leadsData, error: leadsError } = await supabase
        .from('lead_assignments')
        .select(`
          id,
          lead_id,
          assigned_at,
          status,
          lead_pool (
            id,
            phone,
            contact_name,
            data_source,
            contact_script
          )
        `)
        .eq('counselor_id', counselorId)
        .eq('status', 'active')
        .order('assigned_at', { ascending: false })

      if (leadsError) throw leadsError

      // 각 리드별 최신 상담 기록 조회
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
            .select('*', { count: 'exact' })
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

    } catch (error: any) {
      console.error('상담원 리드 데이터 로드 오류:', error)
      toast.error('리드 데이터 로드 실패', error.message)
    } finally {
      setLeadsLoading(false)
    }
  }

  // 필터링된 리드 목록
  const filteredLeads = counselorLeads.filter(lead => {
    // 상태 필터
    if (statusFilter !== 'all' && lead.status !== statusFilter) {
      return false
    }
    
    // 검색 필터
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase()
      return (
        (lead.actual_customer_name && lead.actual_customer_name.toLowerCase().includes(searchLower)) ||
        lead.phone.includes(searchTerm) ||
        lead.contact_script.toLowerCase().includes(searchLower) ||
        lead.data_source.toLowerCase().includes(searchLower) ||
        (lead.counseling_memo && lead.counseling_memo.toLowerCase().includes(searchLower))
      )
    }
    
    return true
  })

  // 선택된 상담원 정보
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

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="flex items-center gap-3 text-text-secondary">
            <businessIcons.team className="w-6 h-6 animate-spin" />
            <span>상담원 데이터 로딩 중...</span>
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
            상담원별 실시간 진행상황을 모니터링하세요
          </p>
        </div>

        {/* 상담원 선택 및 새로고침 */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <span className="text-text-secondary text-sm">상담원 선택:</span>
            <select
              value={selectedCounselor}
              onChange={(e) => setSelectedCounselor(e.target.value)}
              className="px-4 py-2 border border-border-primary rounded-lg bg-bg-primary text-text-primary focus:outline-none focus:ring-2 focus:ring-accent min-w-48"
            >
              <option value="">상담원을 선택하세요</option>
              {counselors.map(counselor => (
                <option key={counselor.id} value={counselor.id}>
                  {counselor.name} ({counselor.assigned_count}건 배정)
                </option>
              ))}
            </select>
          </div>
          
          <button
            onClick={() => {
              loadCounselors()
              if (selectedCounselor) {
                loadCounselorLeads(selectedCounselor)
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

        {/* 선택된 상담원 현황 */}
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

        {/* 상담원 리드 목록 */}
        {selectedCounselor && (
          <div className="bg-bg-primary border border-border-primary rounded-lg overflow-hidden">
            <div className="p-4 border-b border-border-primary">
              <div className="flex items-center gap-3">
                <businessIcons.team className="w-5 h-5 text-accent" />
                <h3 className="font-medium text-text-primary">
                  {selectedCounselorInfo?.name}님의 배정 고객
                </h3>
                <span className="text-sm text-text-secondary">
                  총 {filteredLeads.length}명
                </span>
              </div>
            </div>

            {leadsLoading ? (
              <div className="p-12 text-center">
                <businessIcons.team className="w-8 h-8 text-text-tertiary mx-auto mb-2 animate-spin" />
                <p className="text-text-secondary">상담 데이터 로딩 중...</p>
              </div>
            ) : filteredLeads.length > 0 ? (
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
                        {/* 연락처 */}
                        <td className="py-4 px-4">
                          <div className="font-mono text-text-primary font-medium">
                            {lead.phone}
                          </div>
                        </td>

                        {/* 고객명 */}
                        <td className="py-4 px-4">
                          <div>
                            <div className="font-medium text-text-primary">
                              {lead.actual_customer_name || '고객명 미확인'}
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
            ) : (
              <div className="text-center py-12">
                <businessIcons.contact className="w-16 h-16 text-text-tertiary mx-auto mb-4" />
                <h3 className="text-lg font-medium text-text-primary mb-2">
                  {statusFilter === 'all' ? '배정된 고객이 없습니다' : `${statusFilter} 상태의 고객이 없습니다`}
                </h3>
                <p className="text-text-secondary">
                  상담원에게 고객을 배정하면 여기에 표시됩니다.
                </p>
              </div>
            )}
          </div>
        )}

        {/* 상담원 미선택 시 */}
        {!selectedCounselor && (
          <div className="text-center py-12">
            <businessIcons.team className="w-16 h-16 text-text-tertiary mx-auto mb-4" />
            <h3 className="text-lg font-medium text-text-primary mb-2">
              상담원을 선택해주세요
            </h3>
            <p className="text-text-secondary">
              위에서 상담원을 선택하면 해당 상담원의 실시간 진행상황을 확인할 수 있습니다.
            </p>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}

export default function ConsultingMonitor() {
  return (
    <ProtectedRoute requiredRole="admin">
      <ConsultingMonitorContent />
    </ProtectedRoute>
  );
}