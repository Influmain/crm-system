'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import CounselorLayout from '@/components/layout/CounselorLayout';
import { designSystem } from '@/lib/design-system';
import { businessIcons } from '@/lib/design-system/icons';
import { useToastHelpers } from '@/components/ui/Toast';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth/AuthContext';
import { RefreshCw, TrendingUp } from 'lucide-react';

// 타입 정의
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

interface DashboardStats {
  assigned: number;      // 전체 배정
  not_contacted: number; // 미접촉
  in_progress: number;   // 상담중
  contracted: number;    // 계약
}

export default function CounselorDashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const toast = useToastHelpers();
  
  const [leads, setLeads] = useState<AssignedLead[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    assigned: 0,
    not_contacted: 0,
    in_progress: 0,
    contracted: 0
  });
  const [loading, setLoading] = useState(true);

  // 데이터 로드 (상담진행과 동일한 로직)
  const loadDashboardData = async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      // 배정된 리드 목록과 최신 상담 기록 조회
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
        .order('assigned_at', { ascending: false });

      if (leadsError) throw leadsError;

      // 각 리드별 최신 상담 기록 조회
      const enrichedLeads = await Promise.all(
        leadsData?.map(async (assignment) => {
          const { data: latestConsulting } = await supabase
            .from('counseling_activities')
            .select('contact_date, contact_result, contract_status, contract_amount')
            .eq('assignment_id', assignment.id)
            .order('contact_date', { ascending: false })
            .limit(1)
            .single();

          // 상담 횟수 조회
          const { count: callAttempts } = await supabase
            .from('counseling_activities')
            .select('*', { count: 'exact' })
            .eq('assignment_id', assignment.id);

          // 상태 계산 (단순화된 로직)
          let status: AssignedLead['status'] = 'not_contacted';
          if (latestConsulting) {
            if (latestConsulting.contract_status === 'contracted') {
              status = 'contracted';
            } else {
              status = 'in_progress';
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
          };
        }) || []
      );

      setLeads(enrichedLeads);

      // 정확한 통계 계산
      const newStats = {
        assigned: enrichedLeads.length,
        not_contacted: enrichedLeads.filter(l => l.status === 'not_contacted').length,
        in_progress: enrichedLeads.filter(l => l.status === 'in_progress').length,
        contracted: enrichedLeads.filter(l => l.status === 'contracted').length,
      };
      setStats(newStats);

      toast.success(
        '대시보드 새로고침 완료',
        `${enrichedLeads.length}개의 배정 고객 정보를 업데이트했습니다.`
      );

    } catch (error: any) {
      console.error('대시보드 데이터 로드 오류:', error);
      setLeads([]);
      setStats({
        assigned: 0,
        not_contacted: 0,
        in_progress: 0,
        contracted: 0
      });
      
      toast.error(
        '대시보드 로드 실패',
        '데이터를 불러오는 중 오류가 발생했습니다.',
        {
          action: { label: '다시 시도', onClick: () => loadDashboardData() }
        }
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [user?.id]);

  if (loading) {
    return (
      <CounselorLayout>
        <div className="flex items-center justify-center h-64">
          <div className="flex items-center gap-3 text-text-secondary">
            <RefreshCw className="w-6 h-6 animate-spin" />
            <span>대시보드 로딩 중...</span>
          </div>
        </div>
      </CounselorLayout>
    );
  }

  return (
    <CounselorLayout>
      <div className="space-y-6">
        {/* 헤더 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className={designSystem.components.typography.h2}>
              상담원 대시보드
            </h1>
            <p className="text-text-secondary mt-1">
              안녕하세요, {user?.full_name || '상담원'}님! 오늘도 좋은 성과 만들어가세요!
            </p>
          </div>
          <button
            onClick={loadDashboardData}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            새로고침
          </button>
        </div>

        {/* 통계 카드 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-bg-primary border border-border-primary rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-text-tertiary text-sm font-medium">전체 배정</p>
                <p className="text-2xl font-bold mt-1 text-accent">
                  {stats.assigned.toLocaleString()}
                </p>
                <p className="text-text-tertiary text-xs mt-1">현재 담당 중인 고객</p>
              </div>
              <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-accent/10">
                <businessIcons.contact className="w-6 h-6 text-accent" />
              </div>
            </div>
          </div>

          <div className="bg-bg-primary border border-border-primary rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-text-tertiary text-sm font-medium">미접촉</p>
                <p className="text-2xl font-bold mt-1 text-text-secondary">
                  {stats.not_contacted.toLocaleString()}
                </p>
                <p className="text-text-tertiary text-xs mt-1">아직 연락하지 않은 고객</p>
              </div>
              <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-text-secondary/10">
                <businessIcons.phone className="w-6 h-6 text-text-secondary" />
              </div>
            </div>
          </div>

          <div className="bg-bg-primary border border-border-primary rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-text-tertiary text-sm font-medium">상담중</p>
                <p className="text-2xl font-bold mt-1 text-warning">
                  {stats.in_progress.toLocaleString()}
                </p>
                <p className="text-text-tertiary text-xs mt-1">활발히 상담 중인 고객</p>
              </div>
              <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-warning-light">
                <businessIcons.team className="w-6 h-6 text-warning" />
              </div>
            </div>
          </div>

          <div className="bg-bg-primary border border-border-primary rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-text-tertiary text-sm font-medium">계약완료</p>
                <p className="text-2xl font-bold mt-1 text-success">
                  {stats.contracted.toLocaleString()}
                </p>
                <p className="text-text-tertiary text-xs mt-1">성공적으로 계약한 고객</p>
              </div>
              <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-success-light">
                <businessIcons.script className="w-6 h-6 text-success" />
              </div>
            </div>
          </div>
        </div>



        {/* 최근 배정 고객 목록 */}
        <div className="bg-bg-primary border border-border-primary rounded-lg overflow-hidden">
          <div className="p-4 border-b border-border-primary">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <businessIcons.team className="w-5 h-5 text-accent" />
                <h3 className="font-medium text-text-primary">최근 배정 고객</h3>
                <span className="text-sm text-text-secondary">
                  총 {leads.length}명
                </span>
              </div>
            </div>
          </div>

          {leads.length > 0 ? (
            <div className="overflow-x-auto" style={{ maxHeight: '40vh' }}>
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
                        <businessIcons.team className="w-4 h-4" />
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
                        <businessIcons.analytics className="w-4 h-4" />
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
                  {leads.slice(0, 10).map((lead) => {
                    const styles = {
                      not_contacted: 'bg-bg-secondary text-text-primary',
                      in_progress: 'bg-accent/10 text-accent',
                      contracted: 'bg-success/20 text-success font-medium'
                    };
                    
                    const labels = {
                      not_contacted: '미접촉',
                      in_progress: '상담중',
                      contracted: '계약'
                    };
                    
                    return (
                      <tr 
                        key={lead.assignment_id} 
                        className="border-b border-border-primary hover:bg-bg-hover transition-colors"
                      >
                        {/* 연락처 */}
                        <td className="py-3 px-4">
                          <div className="font-mono text-text-primary font-medium">
                            {lead.phone}
                          </div>
                        </td>

                        {/* 고객명 */}
                        <td className="py-3 px-4">
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
                        <td className="py-3 px-4">
                          <div className="text-text-primary">
                            {lead.contact_script}
                          </div>
                        </td>

                        {/* 상담 횟수 */}
                        <td className="py-3 px-4 text-center">
                          <span className="font-medium text-text-primary">
                            {lead.call_attempts}회
                          </span>
                        </td>

                        {/* 최근 상담 */}
                        <td className="py-3 px-4">
                          <span className="text-text-secondary text-sm">
                            {lead.last_contact_date 
                              ? new Date(lead.last_contact_date).toLocaleDateString('ko-KR')
                              : '미접촉'
                            }
                          </span>
                        </td>

                        {/* 상태 */}
                        <td className="py-3 px-4 text-center">
                          <span className={`px-2 py-1 rounded-full text-xs ${styles[lead.status]}`}>
                            {labels[lead.status]}
                          </span>
                        </td>

                        {/* 계약금액 */}
                        <td className="py-3 px-4 text-right">
                          {lead.contract_amount ? (
                            <span className="font-medium text-success">
                              {lead.contract_amount.toLocaleString()}원
                            </span>
                          ) : (
                            <span className="text-text-tertiary">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <businessIcons.contact className="w-16 h-16 text-text-tertiary mx-auto mb-4" />
              <h3 className="text-lg font-medium text-text-primary mb-2">
                아직 배정받은 고객이 없습니다
              </h3>
              <p className="text-text-secondary mb-4">
                관리자가 고객을 배정하면 여기에 표시됩니다.
              </p>
            </div>
          )}

          {/* 더보기 링크 */}
          {leads.length > 10 && (
            <div className="p-4 border-t border-border-primary bg-bg-secondary">
              <div className="text-center">
                <button
                  onClick={() => router.push('/counselor/consulting')}
                  className="text-accent hover:text-accent/80 font-medium text-sm"
                >
                  전체 고객 목록 보기 ({leads.length - 10}명 더)
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </CounselorLayout>
  );
}