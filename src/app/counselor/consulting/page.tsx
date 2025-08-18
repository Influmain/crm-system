'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { designSystem } from '@/lib/design-system';
import { businessIcons } from '@/lib/design-system/icons';
import { useToastHelpers } from '@/components/ui/Toast';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth/AuthContext';
import CounselorLayout from '@/components/layout/CounselorLayout';

// 타입 정의 (대시보드와 동일하게 수정)
interface AssignedLead {
  assignment_id: string
  lead_id: string
  phone: string
  contact_name: string
  data_source: string
  contact_script: string
  assigned_at: string
  last_contact_date?: string
  call_attempts: number
  latest_contact_result?: string
  latest_contract_status?: string
  contract_amount?: number
  status: 'not_contacted' | 'in_progress' | 'contracted'
}

interface ConsultingRecord {
  assignment_id: string
  contact_method: 'phone' | 'kakao' | 'sms' | 'email' | 'meeting'
  contact_result: 'connected' | 'no_answer' | 'busy' | 'wrong_number' | 'interested' | 'not_interested' | 'appointment_set'
  call_result: 'connected' | 'no_answer' | 'call_rejected' | 'wrong_number' | 'busy'
  customer_reaction: 'interested' | 'not_interested' | 'maybe_later' | 'refused'
  counseling_memo: string
  actual_customer_name: string
  customer_interest: string
  investment_budget: string
  next_contact_hope: string
  contract_status: 'pending' | 'contracted' | 'failed'
  contract_amount?: number
  commission_amount?: number
}

export default function CounselorConsulting() {
  const { user } = useAuth()
  const toast = useToastHelpers()
  const router = useRouter()
  
  // 상태 관리
  const [leads, setLeads] = useState<AssignedLead[]>([])
  const [filteredLeads, setFilteredLeads] = useState<AssignedLead[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedLead, setSelectedLead] = useState<AssignedLead | null>(null)
  const [showConsultingModal, setShowConsultingModal] = useState(false)
  const [saving, setSaving] = useState(false)
  
  // 필터 상태
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')
  
  // 상담 기록 폼
  const [consultingForm, setConsultingForm] = useState<ConsultingRecord>({
    assignment_id: '',
    contact_method: 'phone',
    contact_result: 'connected',
    call_result: 'connected',
    customer_reaction: 'interested',
    counseling_memo: '',
    actual_customer_name: '',
    customer_interest: '',
    investment_budget: '',
    next_contact_hope: '',
    contract_status: 'pending',
    contract_amount: undefined,
    commission_amount: undefined
  })

  // 데이터 로드
  useEffect(() => {
    if (user?.id) {
      loadAssignedLeads()
    }
  }, [user?.id])

  // 필터 적용
  useEffect(() => {
    applyFilter()
  }, [leads, statusFilter, searchTerm])

  const loadAssignedLeads = async () => {
    if (!user?.id) return

    setLoading(true)
    try {
      // 배정된 리드 목록과 최신 상담 기록 조회 (대시보드와 동일한 로직)
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
        .eq('counselor_id', user.id)
        .eq('status', 'active')
        .order('assigned_at', { ascending: false })

      if (leadsError) throw leadsError

      // 각 리드별 최신 상담 기록 조회
      const enrichedLeads = await Promise.all(
        leadsData?.map(async (assignment) => {
          const { data: latestConsulting } = await supabase
            .from('counseling_activities')
            .select('contact_date, contact_result, contract_status, contract_amount')
            .eq('assignment_id', assignment.id)
            .order('contact_date', { ascending: false })
            .limit(1)
            .single()

          // 상담 횟수 조회
          const { count: callAttempts } = await supabase
            .from('counseling_activities')
            .select('*', { count: 'exact' })
            .eq('assignment_id', assignment.id)

          // 상태 계산 (대시보드와 동일한 단순화된 로직)
          let status: AssignedLead['status'] = 'not_contacted'
          if (latestConsulting) {
            if (latestConsulting.contract_status === 'contracted') {
              status = 'contracted'
            } else {
              status = 'in_progress'
            }
          }

          return {
            assignment_id: assignment.id,
            lead_id: assignment.lead_id,
            phone: assignment.lead_pool?.phone || '',
            contact_name: assignment.lead_pool?.contact_name || '고객명 없음',
            data_source: assignment.lead_pool?.data_source || '미지정',
            contact_script: assignment.lead_pool?.contact_script || '',
            assigned_at: assignment.assigned_at,
            last_contact_date: latestConsulting?.contact_date || null,
            call_attempts: callAttempts || 0,
            latest_contact_result: latestConsulting?.contact_result || null,
            latest_contract_status: latestConsulting?.contract_status || null,
            contract_amount: latestConsulting?.contract_amount || null,
            status
          }
        }) || []
      )

      setLeads(enrichedLeads)
      toast.success('고객 목록 로드 완료', `${enrichedLeads.length}명의 배정 고객을 불러왔습니다.`)

    } catch (error: any) {
      console.error('데이터 로드 오류:', error)
      toast.error('데이터 로드 실패', error.message, {
        action: { label: '다시 시도', onClick: () => loadAssignedLeads() }
      })
    } finally {
      setLoading(false)
    }
  }

  const applyFilter = () => {
    let filtered = leads
    
    if (statusFilter !== 'all') {
      filtered = leads.filter(lead => lead.status === statusFilter)
    }

    if (searchTerm) {
      filtered = filtered.filter(lead => 
        lead.contact_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.phone.includes(searchTerm) ||
        lead.contact_script.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }
    
    setFilteredLeads(filtered)
  }

  // 상담 기록 입력/수정
  const startConsultingRecord = (lead: AssignedLead) => {
    setSelectedLead(lead)
    setConsultingForm(prev => ({
      ...prev,
      assignment_id: lead.assignment_id,
      actual_customer_name: ''
    }))
    setShowConsultingModal(true)

    const actionType = lead.status === 'not_contacted' ? '입력' : '수정'
    toast.info(`상담 기록 ${actionType}`, `${lead.contact_name}님 건 (관심: ${lead.contact_script})의 상담 기록을 ${actionType}합니다.`, {
      action: { label: '전화 걸기', onClick: () => window.open(`tel:${lead.phone}`) }
    })
  }

  // 상담 기록 저장
  const saveConsultingRecord = async () => {
    if (!selectedLead) return

    setSaving(true)
    try {
      const recordData = {
        assignment_id: selectedLead.assignment_id,
        contact_date: new Date().toISOString(),
        contact_method: consultingForm.contact_method,
        contact_result: consultingForm.contact_result,
        call_result: consultingForm.call_result || null,
        customer_reaction: consultingForm.customer_reaction || null,
        counseling_memo: consultingForm.counseling_memo || null,
        actual_customer_name: consultingForm.actual_customer_name || null,
        customer_interest: consultingForm.customer_interest || null,
        investment_budget: consultingForm.investment_budget || null,
        next_contact_hope: consultingForm.next_contact_hope ? 
          new Date(consultingForm.next_contact_hope).toISOString() : null,
        contract_status: consultingForm.contract_status,
        contract_amount: consultingForm.contract_amount || null,
        commission_amount: consultingForm.commission_amount || null
      }

      const { error } = await supabase
        .from('counseling_activities')
        .insert([recordData])

      if (error) throw error

      toast.success('상담 기록 저장 완료!', 
        `${selectedLead.contact_name}님 건의 상담 기록이 저장되었습니다.`, {
        action: { 
          label: '다음 고객', 
          onClick: () => {
            setShowConsultingModal(false)
            setSelectedLead(null)
            resetForm()
          }
        }
      })

      // 모달 닫기 및 데이터 새로고침
      setShowConsultingModal(false)
      setSelectedLead(null)
      resetForm()
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

  // 폼 초기화
  const resetForm = () => {
    setConsultingForm({
      assignment_id: '',
      contact_method: 'phone',
      contact_result: 'connected',
      call_result: 'connected',
      customer_reaction: 'interested',
      counseling_memo: '',
      actual_customer_name: '',
      customer_interest: '',
      investment_budget: '',
      next_contact_hope: '',
      contract_status: 'pending',
      contract_amount: undefined,
      commission_amount: undefined
    })
  }

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

  return (
    <CounselorLayout>
      <div className="p-6 max-w-7xl mx-auto">
        {/* 헤더 */}
        <div className="mb-8">
          <h1 className={designSystem.components.typography.h2}>상담 진행</h1>
          <p className="text-text-secondary mt-2">
            배정받은 고객과의 상담을 진행하고 기록하세요
          </p>
        </div>

        {/* 통계 카드 (4개 한줄) */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="bg-bg-primary border border-border-primary rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-text-secondary text-sm">전체 배정</p>
                <p className="text-2xl font-bold text-text-primary">{leads.length}</p>
              </div>
              <businessIcons.contact className="w-8 h-8 text-accent" />
            </div>
          </div>

          <div className="bg-bg-primary border border-border-primary rounded-lg p-6">
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

          <div className="bg-bg-primary border border-border-primary rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-text-secondary text-sm">상담중</p>
                <p className="text-2xl font-bold text-accent">
                  {leads.filter(l => l.status === 'in_progress').length}
                </p>
              </div>
              <businessIcons.team className="w-8 h-8 text-accent" />
            </div>
          </div>

          <div className="bg-bg-primary border border-border-primary rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-text-secondary text-sm">계약완료</p>
                <p className="text-2xl font-bold text-accent">
                  {leads.filter(l => l.status === 'contracted').length}
                </p>
              </div>
              <businessIcons.script className="w-8 h-8 text-accent" />
            </div>
          </div>
        </div>

        {/* 필터 및 새로고침 */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <span className="text-text-secondary text-sm">상태 필터:</span>
            <div className="flex gap-2">
              {[
                { key: 'all', label: '전체' },
                { key: 'not_contacted', label: '미접촉' },
                { key: 'in_progress', label: '상담중' },
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
          
          <button
            onClick={loadAssignedLeads}
            disabled={loading}
            className={designSystem.utils.cn(
              designSystem.components.button.secondary,
              "px-4 py-2"
            )}
          >
            <businessIcons.team className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            새로고침
          </button>
        </div>

        {/* 고객 목록 테이블 */}
        <div className="bg-bg-primary border border-border-primary rounded-lg overflow-hidden">
          <div className="p-4 border-b border-border-primary">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <businessIcons.team className="w-5 h-5 text-accent" />
                <h3 className="font-medium text-text-primary">배정받은 고객</h3>
                <span className="text-sm text-text-secondary">
                  총 {filteredLeads.length}명
                </span>
              </div>
              
              {/* 검색창 */}
              <div className="relative">
                <businessIcons.script className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-text-secondary" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="고객명, 전화번호, 상담내용으로 검색..."
                  className="pl-10 pr-4 py-2 w-80 border border-border-primary rounded-lg bg-bg-primary text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>
            </div>
          </div>

          {filteredLeads.length > 0 ? (
            <div className="overflow-x-auto" style={{ maxHeight: '65vh' }}>
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
                        최근상담
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
                    <th className="text-center py-3 px-4 font-medium text-text-secondary text-sm">
                      <div className="flex items-center justify-center gap-2">
                        <businessIcons.contact className="w-4 h-4" />
                        액션
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLeads.map((lead) => {
                    const styles = {
                      not_contacted: 'bg-bg-secondary text-text-primary',
                      in_progress: 'bg-accent/10 text-accent',
                      contracted: 'bg-success/20 text-success font-medium'
                    }
                    
                    const labels = {
                      not_contacted: '미접촉',
                      in_progress: '상담중',
                      contracted: '계약'
                    }
                    
                    return (
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
                              {lead.contact_name}
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

                        {/* 최근 상담 */}
                        <td className="py-4 px-4">
                          <span className="text-text-secondary text-sm">
                            {lead.last_contact_date 
                              ? new Date(lead.last_contact_date).toLocaleDateString('ko-KR')
                              : '미접촉'
                            }
                          </span>
                        </td>

                        {/* 상태 */}
                        <td className="py-4 px-4 text-center">
                          <span className={`px-2 py-1 rounded-full text-xs ${styles[lead.status]}`}>
                            {labels[lead.status]}
                          </span>
                        </td>

                        {/* 계약금액 */}
                        <td className="py-4 px-4 text-right">
                          {lead.contract_amount ? (
                            <span className="font-medium text-success">
                              {lead.contract_amount.toLocaleString()}원
                            </span>
                          ) : (
                            <span className="text-text-tertiary">-</span>
                          )}
                        </td>

                        {/* 액션 */}
                        <td className="py-4 px-4 text-center">
                          <button
                            onClick={() => startConsultingRecord(lead)}
                            className="inline-flex items-center gap-2 px-3 py-2 bg-accent text-bg-primary rounded-lg hover:bg-accent/90 transition-colors text-sm font-medium"
                          >
                            <businessIcons.phone className="w-4 h-4" />
                            {lead.status === 'not_contacted' ? '기록 입력' : '기록 수정'}
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <businessIcons.contact className="w-16 h-16 text-text-tertiary mx-auto mb-4" />
              <h3 className="text-lg font-medium text-text-primary mb-2">
                {statusFilter === 'all' ? '배정받은 고객이 없습니다' : `${statusFilter} 상태의 고객이 없습니다`}
              </h3>
              <p className="text-text-secondary">
                관리자가 고객을 배정하면 여기에 표시됩니다.
              </p>
            </div>
          )}
        </div>

        {/* 상담 기록 모달 */}
        {showConsultingModal && selectedLead && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-bg-primary border border-border-primary rounded-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
              {/* 모달 헤더 */}
              <div className="flex items-center justify-between p-6 border-b border-border-primary">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-accent rounded-xl flex items-center justify-center">
                    <businessIcons.phone className="w-5 h-5 text-bg-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-text-primary">
                      상담 기록 입력
                    </h3>
                    <p className="text-sm text-text-secondary">
                      {selectedLead.contact_name}님 건 ({selectedLead.phone})
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
                  <businessIcons.script className="w-4 h-4" />
                </button>
              </div>

              {/* 상담 기록 폼 */}
              <div className="p-6 space-y-6">
                {/* 상담 일시 */}
                <div>
                  <label className="block text-sm font-medium mb-2 text-text-primary">
                    상담 일시
                  </label>
                  <input
                    type="datetime-local"
                    value={consultingForm.next_contact_hope ? new Date(consultingForm.next_contact_hope).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16)}
                    onChange={(e) => setConsultingForm(prev => ({ ...prev, next_contact_hope: e.target.value }))}
                    className="w-full px-3 py-2 border border-border-primary rounded-lg bg-bg-primary text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
                  />
                </div>

                {/* 실제 고객명 */}
                <div>
                  <label className="block text-sm font-medium mb-2 text-text-primary">
                    실제 고객명 * (통화 시 확인된 이름)
                  </label>
                  <input
                    type="text"
                    value={consultingForm.actual_customer_name}
                    onChange={(e) => setConsultingForm(prev => ({ ...prev, actual_customer_name: e.target.value }))}
                    className="w-full px-3 py-2 border border-border-primary rounded-lg bg-bg-primary text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
                    placeholder="통화 시 확인된 실제 고객명을 입력하세요"
                    required
                  />
                  <p className="text-xs text-text-tertiary mt-1">
                    📋 고객: <strong>{selectedLead.contact_name}</strong> | 관심분야: <strong>{selectedLead.contact_script}</strong>
                  </p>
                </div>

                {/* 연락 방법 & 결과 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2 text-text-primary">
                      연락 방법 *
                    </label>
                    <select
                      value={consultingForm.contact_method}
                      onChange={(e) => setConsultingForm(prev => ({ ...prev, contact_method: e.target.value as any }))}
                      className="w-full px-3 py-2 border border-border-primary rounded-lg bg-bg-primary text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
                    >
                      <option value="phone">📞 전화</option>
                      <option value="kakao">💛 카카오톡</option>
                      <option value="sms">💬 문자</option>
                      <option value="email">📧 이메일</option>
                      <option value="meeting">🤝 대면</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2 text-text-primary">
                      연락 결과 *
                    </label>
                    <select
                      value={consultingForm.contact_result}
                      onChange={(e) => setConsultingForm(prev => ({ ...prev, contact_result: e.target.value as any }))}
                      className="w-full px-3 py-2 border border-border-primary rounded-lg bg-bg-primary text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
                    >
                      <option value="connected">연결됨</option>
                      <option value="no_answer">응답 없음</option>
                      <option value="busy">통화 중</option>
                      <option value="wrong_number">잘못된 번호</option>
                      <option value="interested">관심 있음</option>
                      <option value="not_interested">관심 없음</option>
                      <option value="appointment_set">약속 설정</option>
                    </select>
                  </div>
                </div>

                {/* 고객 반응 & 계약 상태 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2 text-text-primary">
                      고객 반응
                    </label>
                    <select
                      value={consultingForm.customer_reaction}
                      onChange={(e) => setConsultingForm(prev => ({ ...prev, customer_reaction: e.target.value as any }))}
                      className="w-full px-3 py-2 border border-border-primary rounded-lg bg-bg-primary text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
                    >
                      <option value="interested">관심 있음</option>
                      <option value="not_interested">관심 없음</option>
                      <option value="maybe_later">나중에</option>
                      <option value="refused">거절</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2 text-text-primary">
                      계약 상태
                    </label>
                    <select
                      value={consultingForm.contract_status}
                      onChange={(e) => setConsultingForm(prev => ({ ...prev, contract_status: e.target.value as any }))}
                      className="w-full px-3 py-2 border border-border-primary rounded-lg bg-bg-primary text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
                    >
                      <option value="pending">대기중</option>
                      <option value="contracted">계약완료</option>
                      <option value="failed">실패</option>
                    </select>
                  </div>
                </div>

                {/* 고객 관심사항 & 투자예산 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2 text-text-primary">
                      고객 관심사항
                    </label>
                    <input
                      type="text"
                      value={consultingForm.customer_interest}
                      onChange={(e) => setConsultingForm(prev => ({ ...prev, customer_interest: e.target.value }))}
                      className="w-full px-3 py-2 border border-border-primary rounded-lg bg-bg-primary text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
                      placeholder="예: 주식투자, 부동산, 코인 등"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2 text-text-primary">
                      투자 가능 예산
                    </label>
                    <input
                      type="text"
                      value={consultingForm.investment_budget}
                      onChange={(e) => setConsultingForm(prev => ({ ...prev, investment_budget: e.target.value }))}
                      className="w-full px-3 py-2 border border-border-primary rounded-lg bg-bg-primary text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
                      placeholder="예: 1000만원, 5000만원 등"
                    />
                  </div>
                </div>

                {/* 계약금액 & 수수료 */}
                {consultingForm.contract_status === 'contracted' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-accent/5 border border-accent/20 rounded-lg">
                    <div>
                      <label className="block text-sm font-medium mb-2 text-text-primary">
                        계약 금액 (원) *
                      </label>
                      <input
                        type="number"
                        value={consultingForm.contract_amount || ''}
                        onChange={(e) => setConsultingForm(prev => ({ ...prev, contract_amount: e.target.value ? Number(e.target.value) : undefined }))}
                        className="w-full px-3 py-2 border border-border-primary rounded-lg bg-bg-primary text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
                        placeholder="1000000"
                        min="0"
                        step="10000"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2 text-text-primary">
                        예상 수수료 (원)
                      </label>
                      <input
                        type="number"
                        value={consultingForm.commission_amount || ''}
                        onChange={(e) => setConsultingForm(prev => ({ ...prev, commission_amount: e.target.value ? Number(e.target.value) : undefined }))}
                        className="w-full px-3 py-2 border border-border-primary rounded-lg bg-bg-primary text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
                        placeholder="50000"
                        min="0"
                        step="1000"
                      />
                    </div>
                  </div>
                )}

                {/* 상담 메모 */}
                <div>
                  <label className="block text-sm font-medium mb-2 text-text-primary">
                    상담 메모 *
                  </label>
                  <textarea
                    value={consultingForm.counseling_memo}
                    onChange={(e) => setConsultingForm(prev => ({ ...prev, counseling_memo: e.target.value }))}
                    className="w-full px-3 py-2 border border-border-primary rounded-lg bg-bg-primary text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
                    rows={4}
                    placeholder="상담 내용, 고객 반응, 다음 액션 등을 자세히 기록하세요..."
                    required
                  />
                </div>

                {/* 다음 연락 희망일 */}
                <div>
                  <label className="block text-sm font-medium mb-2 text-text-primary">
                    다음 연락 희망일
                  </label>
                  <input
                    type="datetime-local"
                    value={consultingForm.next_contact_hope || ''}
                    onChange={(e) => setConsultingForm(prev => ({ ...prev, next_contact_hope: e.target.value }))}
                    className="w-full px-3 py-2 border border-border-primary rounded-lg bg-bg-primary text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
                  />
                  <p className="text-xs text-text-tertiary mt-1">
                    고객이 다음 연락을 원하는 날짜와 시간을 설정하세요
                  </p>
                </div>

                {/* 저장 버튼 */}
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={saveConsultingRecord}
                    disabled={saving || !consultingForm.counseling_memo || !consultingForm.actual_customer_name}
                    className={designSystem.utils.cn(
                      designSystem.components.button.primary,
                      "flex-1",
                      (!consultingForm.counseling_memo || !consultingForm.actual_customer_name || saving) && "opacity-50 cursor-not-allowed"
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
                        상담 기록 저장
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