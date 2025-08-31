'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import CounselorLayout from '@/components/layout/CounselorLayout';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { designSystem } from '@/lib/design-system';
import { businessIcons } from '@/lib/design-system/icons';
import { useToastHelpers } from '@/components/ui/Toast';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth/AuthContext';

// 타입 정의 - 상담 진행 페이지와 동일
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
}

// 회원등급 옵션 정의 - 상담 진행 페이지와 동일
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

interface DashboardStats {
  assigned: number;
  not_contacted: number;
  in_progress: number;
  contracted: number;
  payment_likely: number;
  payment_complete: number;
}

function CounselorDashboardContent() {
  const { user, userProfile } = useAuth();
  const router = useRouter();
  const toast = useToastHelpers();
  
  const [leads, setLeads] = useState<AssignedLead[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    assigned: 0,
    not_contacted: 0,
    in_progress: 0,
    contracted: 0,
    payment_likely: 0,
    payment_complete: 0
  });
  const [loading, setLoading] = useState(true);
  const [gradeFilter, setGradeFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // 권한 체크 - 상담 진행 페이지와 동일
  useEffect(() => {
    if (user && userProfile?.role !== 'counselor') {
      toast.error('접근 권한 없음', '영업사원만 접근할 수 있습니다.')
      router.push('/login')
      return
    }
  }, [user, userProfile])

  // 뷰 테이블 적용한 데이터 로드 (1000개 제한 해결)
  const loadDashboardData = async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      console.log('영업사원 대시보드 데이터 로드 시작 (뷰 최적화):', user.id);

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
        // 상태 계산
        let status: AssignedLead['status'] = 'not_contacted';
        if (lead.last_contact_date) {
          if (lead.latest_contract_status === 'contracted') {
            status = 'contracted';
          } else {
            status = 'in_progress';
          }
        }

        // 회원등급 정보 추출
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
          customer_grade: customerGrade
        };
      });

      setLeads(enrichedLeads);

      // 정확한 통계 계산 - 등급별 통계 포함
      const newStats = {
        assigned: enrichedLeads.length,
        not_contacted: enrichedLeads.filter(l => l.status === 'not_contacted').length,
        in_progress: enrichedLeads.filter(l => l.status === 'in_progress').length,
        contracted: enrichedLeads.filter(l => l.status === 'contracted').length,
        payment_likely: enrichedLeads.filter(l => l.customer_grade?.grade === '결제[유력]').length,
        payment_complete: enrichedLeads.filter(l => l.customer_grade?.grade === '결제[완료]').length
      };
      setStats(newStats);

      toast.success('대시보드 새로고침 완료', `${enrichedLeads.length}명의 배정 고객 정보를 업데이트했습니다.`)

    } catch (error: any) {
      console.error('대시보드 데이터 로드 오류:', error);
      setLeads([]);
      setStats({
        assigned: 0,
        not_contacted: 0,
        in_progress: 0,
        contracted: 0,
        payment_likely: 0,
        payment_complete: 0
      });
      
      toast.error('데이터 로드 실패', error.message, {
        action: { label: '다시 시도', onClick: () => loadDashboardData() }
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.id) {
      loadDashboardData()
    }
  }, [user?.id]);

  // 등급별 통계 계산
  const getGradeStats = () => {
    const stats = {};
    gradeOptions.forEach(option => {
      stats[option.value] = leads.filter(lead => lead.customer_grade?.grade === option.value).length;
    });
    stats['미분류'] = leads.filter(lead => !lead.customer_grade?.grade).length;
    return stats;
  };

  // 필터링된 리드 계산 (검색 기능 추가)
  const getFilteredLeads = () => {
    let filtered = leads;
    
    // 등급 필터
    if (gradeFilter !== 'all') {
      if (gradeFilter === '미분류') {
        filtered = filtered.filter(lead => !lead.customer_grade?.grade);
      } else {
        filtered = filtered.filter(lead => lead.customer_grade?.grade === gradeFilter);
      }
    }
    
    // 검색 필터
    if (searchTerm.trim()) {
      filtered = filtered.filter(lead => 
        lead.phone.includes(searchTerm) ||
        (lead.contact_name && lead.contact_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (lead.real_name && lead.real_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (lead.actual_customer_name && lead.actual_customer_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (lead.contact_script && lead.contact_script.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }
    
    return filtered;
  };

  // 등급별 배지 렌더링 - 상담 진행 페이지와 동일
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

  if (loading) {
    return (
      <CounselorLayout>
        <div className="flex items-center justify-center h-64">
          <div className="flex items-center gap-3 text-text-secondary">
            <businessIcons.team className="w-6 h-6 animate-spin" />
            <span>대시보드 로딩 중...</span>
          </div>
        </div>
      </CounselorLayout>
    );
  }

  const gradeStats = getGradeStats();
  const filteredLeads = getFilteredLeads();

  return (
    <CounselorLayout>
      <div className="p-6 max-w-7xl mx-auto">
        {/* 헤더 */}
        <div className="mb-8">
          <h1 className={designSystem.components.typography.h2}>상담원 대시보드</h1>
          <p className="text-text-secondary mt-2">
            배정받은 고객 현황과 상담 진행 상태를 확인하세요
          </p>
        </div>

        {/* 통계 카드 - 6개로 확장 */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          <div className="bg-bg-primary border border-border-primary rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-text-secondary text-sm">전체 배정</p>
                <p className="text-xl font-bold text-text-primary">{stats.assigned}</p>
              </div>
              <businessIcons.contact className="w-6 h-6 text-accent" />
            </div>
          </div>

          <div className="bg-bg-primary border border-border-primary rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-text-secondary text-sm">미접촉</p>
                <p className="text-xl font-bold text-text-primary">{stats.not_contacted}</p>
              </div>
              <businessIcons.phone className="w-6 h-6 text-text-secondary" />
            </div>
          </div>

          <div className="bg-bg-primary border border-border-primary rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-text-secondary text-sm">상담중</p>
                <p className="text-xl font-bold text-warning">{stats.in_progress}</p>
              </div>
              <businessIcons.team className="w-6 h-6 text-warning" />
            </div>
          </div>

          <div className="bg-bg-primary border border-border-primary rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-text-secondary text-sm">결제유력</p>
                <p className="text-xl font-bold text-accent">{stats.payment_likely}</p>
              </div>
              <businessIcons.script className="w-6 h-6 text-accent" />
            </div>
          </div>

          <div className="bg-bg-primary border border-border-primary rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-text-secondary text-sm">결제완료</p>
                <p className="text-xl font-bold text-success">{stats.payment_complete}</p>
              </div>
              <businessIcons.analytics className="w-6 h-6 text-success" />
            </div>
          </div>

          <div className="bg-bg-primary border border-border-primary rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-text-secondary text-sm">계약완료</p>
                <p className="text-xl font-bold text-success">{stats.contracted}</p>
              </div>
              <businessIcons.assignment className="w-6 h-6 text-success" />
            </div>
          </div>
        </div>

        {/* 등급 필터 및 새로고침 */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-text-secondary text-sm">등급:</span>
              <select
                value={gradeFilter}
                onChange={(e) => setGradeFilter(e.target.value)}
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
            onClick={loadDashboardData}
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

        {/* 제목과 검색 영역 */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <businessIcons.team className="w-3 h-3 text-accent" />
            <h3 className="text-xs font-medium text-text-primary">최근 배정 고객</h3>
            <span className="text-xs text-text-secondary px-1.5 py-0.5 bg-bg-secondary rounded">
              {filteredLeads.length}명
            </span>
          </div>
          
          <div className="relative">
            <businessIcons.script className="absolute left-2 top-1/2 transform -translate-y-1/2 w-3 h-3 text-text-secondary" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="고객명, 전화번호로 검색..."
              className="pl-7 pr-3 py-1 w-48 text-xs border border-border-primary rounded bg-bg-primary text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </div>
        </div>

        {/* 최근 배정 고객 목록 */}
        <div className="bg-bg-primary border border-border-primary rounded-lg overflow-hidden">
          {filteredLeads.length > 0 ? (
            <div className="overflow-auto" style={{ maxHeight: '65vh' }}>
              <table className="w-full table-fixed">
                <thead className="bg-bg-secondary sticky top-0 z-10">
                  <tr>
                    <th className="text-center py-2 px-1 font-medium text-text-secondary text-xs w-20">
                      <div className="flex items-center justify-center gap-0.5">
                        <businessIcons.phone className="w-3 h-3" />
                        연락처
                      </div>
                    </th>
                    <th className="text-center py-2 px-1 font-medium text-text-secondary text-xs w-14">
                      <div className="flex items-center justify-center gap-0.5">
                        <businessIcons.contact className="w-3 h-3" />
                        고객명
                      </div>
                    </th>
                    <th className="text-center py-2 px-1 font-medium text-text-secondary text-xs w-12">
                      <div className="flex items-center justify-center gap-0.5">
                        <businessIcons.team className="w-3 h-3" />
                        안내원
                      </div>
                    </th>
                    <th className="text-center py-2 px-1 font-medium text-text-secondary text-xs w-20">
                      <div className="flex items-center justify-center gap-0.5">
                        <businessIcons.script className="w-3 h-3" />
                        관심분야
                      </div>
                    </th>
                    <th className="text-center py-2 px-1 font-medium text-text-secondary text-xs w-16">
                      <div className="flex items-center justify-center gap-0.5">
                        <businessIcons.assignment className="w-3 h-3" />
                        등급
                      </div>
                    </th>
                    <th className="text-center py-2 px-1 font-medium text-text-secondary text-xs w-20">
                      <div className="flex items-center justify-center gap-0.5">
                        <businessIcons.message className="w-3 h-3" />
                        상담메모
                      </div>
                    </th>
                    <th className="text-center py-2 px-1 font-medium text-text-secondary text-xs w-8">
                      <div className="flex items-center justify-center gap-0.5">
                        <businessIcons.phone className="w-3 h-3" />
                        횟수
                      </div>
                    </th>
                    <th className="text-center py-2 px-1 font-medium text-text-secondary text-xs w-12">
                      <div className="flex items-center justify-center gap-0.5">
                        <businessIcons.date className="w-3 h-3" />
                        최근상담
                      </div>
                    </th>
                    <th className="text-center py-2 px-1 font-medium text-text-secondary text-xs w-12">
                      <div className="flex items-center justify-center gap-0.5">
                        <businessIcons.date className="w-3 h-3" />
                        배정일
                      </div>
                    </th>
                    <th className="text-center py-2 px-1 font-medium text-text-secondary text-xs w-16">
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
                  {filteredLeads.map((lead) => (
                    <tr 
                      key={lead.assignment_id} 
                      className="border-b border-border-primary hover:bg-bg-hover transition-colors"
                    >
                      {/* 연락처 */}
                      <td className="py-1 px-1 text-center">
                        <div className="font-mono text-text-primary font-medium text-xs truncate">
                          {lead.phone}
                        </div>
                      </td>

                      {/* 고객명 */}
                      <td className="py-1 px-1 text-center">
                        <div className="text-xs whitespace-nowrap truncate">
                          {lead.actual_customer_name || lead.real_name ? (
                            <span className="text-text-primary">{lead.actual_customer_name || lead.real_name}</span>
                          ) : (
                            <span className="text-text-tertiary">미확인</span>
                          )}
                        </div>
                      </td>

                      {/* 안내원 */}
                      <td className="py-1 px-1 text-center">
                        <div className="text-xs whitespace-nowrap truncate">
                          {lead.contact_name ? (
                            <span className="text-text-primary">{lead.contact_name}</span>
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
                                {lead.contact_script}
                              </div>
                              <div className="absolute left-0 top-full mt-1 p-2 bg-black/90 text-white text-xs rounded shadow-lg z-10 max-w-80 break-words opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
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
                              <div className="absolute left-0 top-full mt-1 p-2 bg-black/90 text-white text-xs rounded shadow-lg z-10 max-w-80 break-words opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                                {lead.counseling_memo}
                              </div>
                            </>
                          ) : (
                            <span className="text-text-tertiary text-xs">미확인</span>
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
                            : '미확인'
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

                      {/* 계약금액 */}
                      <td className="py-1 px-1 text-center">
                        {lead.contract_amount ? (
                          <span className="font-medium text-success text-xs">
                            {(lead.contract_amount / 10000).toFixed(0)}만
                          </span>
                        ) : (
                          <span className="text-text-tertiary text-xs">미확인</span>
                        )}
                      </td>

                      {/* 액션 */}
                      <td className="py-1 px-1 text-center">
                        <button
                          onClick={() => router.push('/counselor/consulting')}
                          className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-accent text-bg-primary rounded text-xs font-medium whitespace-nowrap"
                        >
                          <businessIcons.phone className="w-3 h-3" />
                          상담
                        </button>
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
                {gradeFilter === 'all' && !searchTerm ? '배정받은 고객이 없습니다' : 
                 searchTerm ? `"${searchTerm}"에 대한 검색 결과가 없습니다` :
                 `${gradeFilter === '미분류' ? '미분류' : gradeFilter} 등급 고객이 없습니다`}
              </h3>
              <p className="text-text-secondary">
                {searchTerm ? '다른 검색어를 시도해보세요.' : '관리자가 고객을 배정하면 여기에 표시됩니다.'}
              </p>
            </div>
          )}
        </div>
      </div>
    </CounselorLayout>
  );
}

export default function CounselorDashboardPage() {
  return (
    <ProtectedRoute requiredRole="counselor">
      <CounselorDashboardContent />
    </ProtectedRoute>
  );
}