'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import CounselorLayout from '@/components/layout/CounselorLayout';
import { designSystem } from '@/lib/design-system';
import { businessIcons } from '@/lib/design-system/icons';
import { useToastHelpers } from '@/components/ui/Toast';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth/AuthContext';

// ✅ Lead 타입 정의
interface Lead {
  assignment_id: string;
  counselor_id: string;
  lead_id: string;
  phone: string;
  contact_name: string | null;
  data_source: string | null;
  contact_script: string | null;
  assigned_at: string;
  assignment_status: string;
  last_contact_date: string | null;
  call_attempts: number;
  contract_status: string | null;
  next_contact_hope: string | null;
}

export default function CounselorLeadsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const toast = useToastHelpers();
  
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // ✅ 아이콘 정의
  const PhoneIcon = businessIcons.phone;
  const UserIcon = businessIcons.contact;
  const ClockIcon = businessIcons.time;
  const CheckIcon = businessIcons.success;
  const RefreshIcon = businessIcons.time;
  const FilterIcon = businessIcons.filter;
  const CompanyIcon = businessIcons.company;
  const MessageIcon = businessIcons.message;

  // ✅ 리드 목록 로드
  const loadLeads = async () => {
    if (!user?.id) {
      toast.error('인증 오류', '사용자 정보를 찾을 수 없습니다.');
      return;
    }

    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('lead_assignments')
        .select(`
          id,
          lead_id,
          counselor_id,
          assigned_at,
          status,
          lead_pool (
            id,
            phone,
            name,
            contact_name,
            data_source,
            contact_script
          )
        `)
        .eq('counselor_id', user.id)
        .eq('status', 'active')
        .order('assigned_at', { ascending: false });

      if (error) {
        console.error('Supabase 오류:', error);
        throw new Error(`데이터 로드 실패: ${error.message}`);
      }

      const processedLeads = (data || []).map((item, index) => {
        const leadData = item.lead_pool;
        return {
          assignment_id: item.id,
          counselor_id: item.counselor_id,
          lead_id: item.lead_id,
          phone: leadData?.phone || '',
          contact_name: leadData?.contact_name || leadData?.name || `고객 ${index + 1}`,
          data_source: leadData?.data_source || '미지정',
          contact_script: leadData?.contact_script || '',
          assigned_at: item.assigned_at,
          assignment_status: item.status,
          last_contact_date: null,
          call_attempts: 0,
          contract_status: null,
          next_contact_hope: null
        };
      });

      setLeads(processedLeads);
      
      toast.success(
        '리드 목록 새로고침 완료',
        `${processedLeads.length}개의 배정된 리드를 불러왔습니다.`
      );
    } catch (error: any) {
      console.error('리드 로드 오류:', error);
      toast.error(
        '리드 목록 로드 실패',
        error.message || '알 수 없는 오류가 발생했습니다.',
        {
          action: { label: '다시 시도', onClick: () => loadLeads() }
        }
      );
    } finally {
      setLoading(false);
    }
  };

  // ✅ 영업개시 버튼 클릭
  const handleCallClick = (lead: Lead) => {
    toast.info(
      '영업 활동 시작',
      `${lead.contact_name}님에 대한 영업을 시작하고 결과를 기록합니다.`,
      {
        action: { 
          label: '영업 기록하기', 
          onClick: () => router.push(`/counselor/records?lead_id=${lead.lead_id}&assignment_id=${lead.assignment_id}`)
        }
      }
    );
  };

  // ✅ 시간 포맷팅
  const formatDateTime = (dateString: string | null) => {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
      
      if (diffHours < 24) {
        return `${diffHours}시간 전`;
      } else {
        return date.toLocaleDateString('ko-KR', { 
          month: 'short', 
          day: 'numeric'
        });
      }
    } catch (error) {
      return '-';
    }
  };

  // ✅ 상태 표시
  const getStatusDisplay = (lead: Lead) => {
    if (lead.contract_status === 'completed') {
      return { label: '완료', color: 'bg-accent text-white' };
    } else if (lead.next_contact_hope) {
      return { label: '콜백예정', color: 'bg-accent/10 text-accent' };
    } else if (lead.last_contact_date) {
      return { label: '연락함', color: 'bg-accent/20 text-accent' };
    } else {
      return { label: '신규배정', color: 'bg-bg-secondary text-text-primary' };
    }
  };

  // ✅ 필터링된 리드 목록
  const filteredLeads = leads.filter(lead => {
    if (!lead || !lead.assignment_id) return false;
    
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = 
      (lead.contact_name || '').toLowerCase().includes(searchLower) ||
      (lead.phone || '').includes(searchTerm) ||
      (lead.data_source || '').toLowerCase().includes(searchLower);
    
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'no_contact' && !lead.last_contact_date) ||
      (statusFilter === 'contacted' && lead.last_contact_date) ||
      (statusFilter === 'callback' && lead.next_contact_hope);
    
    return matchesSearch && matchesStatus;
  });

  // ✅ useEffect
  useEffect(() => {
    if (user?.id) {
      loadLeads();
    }
  }, [user?.id]);

  if (loading) {
    return (
      <CounselorLayout>
        <div className="p-6">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <RefreshIcon className="w-8 h-8 text-accent animate-spin mx-auto mb-2" />
              <p className="text-text-secondary">리드 목록을 불러오는 중...</p>
            </div>
          </div>
        </div>
      </CounselorLayout>
    );
  }

  return (
    <CounselorLayout>
      <div className="p-6 space-y-6">
        {/* 헤더 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-text-primary">내 리드</h1>
            <p className="text-text-secondary mt-1">
              배정받은 리드 목록을 확인하고 통화를 진행하세요
            </p>
          </div>
          <button
            onClick={loadLeads}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-bg-secondary hover:bg-bg-hover text-text-primary rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshIcon className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            새로고침
          </button>
        </div>

        {/* 통계 카드 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-bg-primary border border-border-primary rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-text-secondary text-sm">배정 고객</p>
                <p className="text-2xl font-bold text-text-primary">{leads.length}</p>
              </div>
              <UserIcon className="w-8 h-8 text-accent" />
            </div>
          </div>
          
          <div className="bg-bg-primary border border-border-primary rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-text-secondary text-sm">미접촉</p>
                <p className="text-2xl font-bold text-text-primary">
                  {leads.filter(l => l && !l.last_contact_date).length}
                </p>
              </div>
              <ClockIcon className="w-8 h-8 text-text-secondary" />
            </div>
          </div>
          
          <div className="bg-bg-primary border border-border-primary rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-text-secondary text-sm">접촉 완료</p>
                <p className="text-2xl font-bold text-accent">
                  {leads.filter(l => l && l.last_contact_date).length}
                </p>
              </div>
              <CheckIcon className="w-8 h-8 text-accent" />
            </div>
          </div>
        </div>

        {/* 필터 및 검색 */}
        <div className="bg-bg-primary border border-border-primary rounded-lg p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <FilterIcon className="w-4 h-4 text-text-secondary" />
              <span className="text-text-secondary text-sm">필터:</span>
            </div>
            
            {/* 검색 */}
            <div className="flex-1 min-w-[200px]">
              <input
                type="text"
                placeholder="고객명, 전화번호, DB출처 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border border-border-primary rounded-lg text-text-primary bg-bg-primary focus:outline-none focus:ring-2 focus:ring-accent/20"
              />
            </div>

            {/* 상태 필터 */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-border-primary rounded-lg text-text-primary bg-bg-primary focus:outline-none focus:ring-2 focus:ring-accent/20"
            >
              <option value="all">전체 상태</option>
              <option value="no_contact">미접촉</option>
              <option value="contacted">접촉완료</option>
              <option value="callback">콜백대기</option>
            </select>
          </div>
        </div>

        {/* ✅ 단일 테이블 구조 - 고정 컬럼 너비 */}
        <div className="bg-bg-primary border border-border-primary rounded-lg overflow-hidden">
          <div className="overflow-auto" style={{ height: '70vh' }}>
            <table className="min-w-full table-fixed">
              {/* 헤더 */}
              <thead className="bg-bg-secondary sticky top-0 z-10">
                <tr>
                  <th className="w-[250px] text-left py-3 px-4 text-xs font-medium text-text-tertiary uppercase tracking-wider border-b border-border-primary">
                    <div className="flex items-center space-x-2">
                      <UserIcon className="w-3 h-3" />
                      <span>고객명</span>
                    </div>
                  </th>
                  <th className="w-[200px] text-left py-3 px-4 text-xs font-medium text-text-tertiary uppercase tracking-wider border-b border-border-primary">
                    <div className="flex items-center space-x-2">
                      <CompanyIcon className="w-3 h-3" />
                      <span>DB 출처</span>
                    </div>
                  </th>
                  <th className="w-[150px] text-left py-3 px-4 text-xs font-medium text-text-tertiary uppercase tracking-wider border-b border-border-primary">
                    <div className="flex items-center space-x-2">
                      <MessageIcon className="w-3 h-3" />
                      <span>상품/스크립트</span>
                    </div>
                  </th>
                  <th className="w-[120px] text-left py-3 px-4 text-xs font-medium text-text-tertiary uppercase tracking-wider border-b border-border-primary">
                    상태
                  </th>
                  <th className="w-[150px] text-left py-3 px-4 text-xs font-medium text-text-tertiary uppercase tracking-wider border-b border-border-primary">
                    <div className="flex items-center space-x-2">
                      <ClockIcon className="w-3 h-3" />
                      <span>최근 접촉</span>
                    </div>
                  </th>
                  <th className="w-[120px] text-left py-3 px-4 text-xs font-medium text-text-tertiary uppercase tracking-wider border-b border-border-primary">
                    액션
                  </th>
                </tr>
              </thead>

              {/* 바디 */}
              <tbody>
                {filteredLeads.length > 0 ? (
                  filteredLeads.map((lead) => {
                    const status = getStatusDisplay(lead);
                    
                    return (
                      <tr 
                        key={lead.assignment_id}
                        className="border-b border-border-primary hover:bg-bg-hover transition-colors group cursor-pointer"
                      >
                        {/* 고객명 - 고정 너비 */}
                        <td className="w-[250px] py-3 px-4">
                          <div className="truncate">
                            <div className="font-medium text-text-primary truncate">
                              {lead.contact_name}
                            </div>
                            <div className="text-sm text-text-secondary truncate">
                              {lead.phone}
                            </div>
                          </div>
                        </td>
                        
                        {/* 데이터 출처 - 고정 너비 */}
                        <td className="w-[200px] py-3 px-4">
                          <div className="truncate">
                            <div className="text-text-primary truncate">{lead.data_source}</div>
                            <div className="text-sm text-text-secondary truncate">
                              {formatDateTime(lead.assigned_at)}
                            </div>
                          </div>
                        </td>
                        
                        {/* 상품/스크립트 - 고정 너비 */}
                        <td className="w-[150px] py-3 px-4">
                          <div className="text-text-primary truncate">
                            {lead.contact_script || '스크립트 없음'}
                          </div>
                        </td>
                        
                        {/* 상태 - 고정 너비 */}
                        <td className="w-[120px] py-3 px-4">
                          <span className={`px-2 py-1 text-xs rounded-full ${status.color} inline-block`}>
                            {status.label}
                          </span>
                        </td>
                        
                        {/* 최근 연락 - 고정 너비 */}
                        <td className="w-[150px] py-3 px-4">
                          <div className="truncate">
                            <div className="text-text-primary truncate">
                              {formatDateTime(lead.last_contact_date)}
                            </div>
                            {lead.call_attempts > 0 && (
                              <div className="text-sm text-text-secondary truncate">
                                {lead.call_attempts}회 시도
                              </div>
                            )}
                          </div>
                        </td>
                        
                        {/* 액션 - 고정 너비 */}
                        <td className="w-[120px] py-3 px-4">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCallClick(lead);
                            }}
                            className="flex items-center space-x-1 px-2 py-1 bg-accent text-white rounded-lg hover:bg-accent/80 transition-colors text-sm"
                            title="영업 활동 시작 및 결과 기록"
                          >
                            <businessIcons.message className="w-3 h-3" />
                            <span>영업개시</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6} className="py-16">
                      <div className="flex items-center justify-center">
                        <div className="text-center">
                          <UserIcon className="w-8 h-8 text-text-tertiary mx-auto mb-2" />
                          <p className="text-text-secondary">
                            {searchTerm || statusFilter !== 'all' 
                              ? '검색 조건에 맞는 리드가 없습니다.' 
                              : '배정된 리드가 없습니다.'
                            }
                          </p>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}

                {/* 목록 끝 표시 */}
                {filteredLeads.length > 0 && (
                  <tr>
                    <td colSpan={6} className="py-3 text-center border-t border-border-primary">
                      <div className="text-xs text-text-tertiary">
                        • 목록 끝 • ({filteredLeads.length}개 표시됨)
                        {searchTerm && ` • "${searchTerm}" 검색 결과`}
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* 하단 요약 정보 */}
        <div className="flex items-center justify-between text-sm text-text-secondary">
          <span>
            총 {filteredLeads.length}개 리드 (전체 {leads.length}개 중)
          </span>
        </div>
      </div>
    </CounselorLayout>
  );
}