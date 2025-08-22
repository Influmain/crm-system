'use client';

import { useState, useEffect } from 'react';
import AdminLayout from '@/components/layout/AdminLayout';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { useToastHelpers } from '@/components/ui/Toast';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth/AuthContext';

interface DashboardStats {
  totalCustomers: number;
  totalCounselors: number;
  totalContracts: number;
  totalRevenue: number;
  conversionRate: number;
  activeAssignments: number;
  notContactedCount: number;
  inProgressCount: number;
  monthlyGrowth: number;
}

interface CounselorPerformance {
  counselor_id: string;
  counselor_name: string;
  total_assigned: number;
  contracted: number;
  total_revenue: number;
  conversion_rate: number;
  last_activity: string;
}

interface RecentContract {
  id: string;
  customer_name: string;
  counselor_name: string;
  contract_amount: number;
  contact_date: string;
  data_source: string;
}

function AdminDashboardContent() {
  const { user } = useAuth();
  const toast = useToastHelpers();
  
  const [stats, setStats] = useState<DashboardStats>({
    totalCustomers: 0,
    totalCounselors: 0,
    totalContracts: 0,
    totalRevenue: 0,
    conversionRate: 0,
    activeAssignments: 0,
    notContactedCount: 0,
    inProgressCount: 0,
    monthlyGrowth: 0
  });
  
  const [counselorPerformance, setCounselorPerformance] = useState<CounselorPerformance[]>([]);
  const [recentContracts, setRecentContracts] = useState<RecentContract[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  // 실시간 데이터 로드
  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      
      const [statsResult, counselorResult, contractsResult] = await Promise.all([
        loadOverallStats(),
        loadCounselorPerformance(),
        loadRecentContracts()
      ]);

      setStats(statsResult);
      setCounselorPerformance(counselorResult);
      setRecentContracts(contractsResult);
      setLastUpdated(new Date());
      
      toast.success('대시보드 업데이트', '최신 데이터로 업데이트되었습니다.');
      
    } catch (error) {
      console.error('대시보드 데이터 로드 실패:', error);
      toast.error('데이터 로드 실패', '대시보드 데이터를 불러오는데 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  // 전체 통계 로드 (중복 제거)
  const loadOverallStats = async (): Promise<DashboardStats> => {
    // 총 고객 수
    const { count: totalCustomers } = await supabase
      .from('lead_pool')
      .select('*', { count: 'exact', head: true });

    // 총 영업사원 수
    const { count: totalCounselors } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'counselor')
      .eq('is_active', true);

    // 중복 제거된 계약 수 및 매출 계산
    const { data: assignmentsWithContracts } = await supabase
      .from('lead_assignments')
      .select(`
        id,
        counseling_activities (
          contract_status,
          contract_amount,
          contact_date
        )
      `)
      .eq('status', 'active');

    let totalContracts = 0;
    let totalRevenue = 0;
    
    // 각 assignment별로 최신 계약 상태만 확인 (중복 제거)
    assignmentsWithContracts?.forEach(assignment => {
      const activities = assignment.counseling_activities;
      if (activities && activities.length > 0) {
        // 최신 활동만 확인 (날짜 기준 정렬 후 마지막)
        const latestActivity = activities
          .sort((a, b) => new Date(a.contact_date).getTime() - new Date(b.contact_date).getTime())
          .pop();
        
        if (latestActivity?.contract_status === 'contracted') {
          totalContracts++;
          totalRevenue += latestActivity.contract_amount || 0;
        }
      }
    });

    // 전환율 계산
    const conversionRate = totalCustomers ? (totalContracts / totalCustomers) * 100 : 0;

    // 활성 배정 수
    const { count: activeAssignments } = await supabase
      .from('lead_assignments')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active');

    // 미접촉 고객 수
    const { data: notContactedData } = await supabase
      .from('lead_assignments')
      .select(`
        id,
        counseling_activities(id)
      `)
      .eq('status', 'active');

    const notContactedCount = notContactedData?.filter(assignment => 
      !assignment.counseling_activities || assignment.counseling_activities.length === 0
    ).length || 0;

    // 상담중 고객 수 (중복 제거)
    let inProgressCount = 0;
    assignmentsWithContracts?.forEach(assignment => {
      const activities = assignment.counseling_activities;
      if (activities && activities.length > 0) {
        const latestActivity = activities
          .sort((a, b) => new Date(a.contact_date).getTime() - new Date(b.contact_date).getTime())
          .pop();
        
        if (latestActivity?.contract_status === 'in_progress') {
          inProgressCount++;
        }
      }
    });

    return {
      totalCustomers: totalCustomers || 0,
      totalCounselors: totalCounselors || 0,
      totalContracts,
      totalRevenue,
      conversionRate,
      activeAssignments: activeAssignments || 0,
      notContactedCount,
      inProgressCount,
      monthlyGrowth: 12.5
    };
  };

  // 영업사원 성과 로드 (모니터링 페이지와 동일한 방식)
  const loadCounselorPerformance = async (): Promise<CounselorPerformance[]> => {
    const { data: counselorsData } = await supabase
      .from('users')
      .select('id, full_name, email, role, phone, department, is_active')
      .eq('role', 'counselor')
      .eq('is_active', true)
      .order('full_name', { ascending: true });

    // 각 상담원별 통계 계산 (모니터링 페이지와 동일)
    const enrichedCounselors = await Promise.all(
      counselorsData?.map(async (counselor) => {
        // 배정된 리드 수
        const { count: assignedCount } = await supabase
          .from('lead_assignments')
          .select('*', { count: 'exact' })
          .eq('counselor_id', counselor.id)
          .eq('status', 'active');

        // 상담 현황별 통계 - 직접 계산
        const { data: leadsData } = await supabase
          .from('lead_assignments')
          .select(`
            id,
            counseling_activities (
              contact_result,
              contract_status,
              contract_amount,
              contact_date
            )
          `)
          .eq('counselor_id', counselor.id)
          .eq('status', 'active');

        let inProgressCount = 0;
        let completedCount = 0;
        let contractedCount = 0;
        let totalContractAmount = 0;
        let lastActivityDate = '';

        leadsData?.forEach(assignment => {
          const activities = assignment.counseling_activities;
          if (activities && activities.length > 0) {
            const latestActivity = activities[activities.length - 1];
            
            // 최근 활동 날짜 추적
            if (latestActivity.contact_date && latestActivity.contact_date > lastActivityDate) {
              lastActivityDate = latestActivity.contact_date;
            }
            
            if (latestActivity.contract_status === 'contracted') {
              contractedCount++;
              totalContractAmount += latestActivity.contract_amount || 0;
            } else if (latestActivity.contract_status === 'failed') {
              completedCount++;
            } else {
              inProgressCount++;
            }
          }
        });

        return {
          counselor_id: counselor.id,
          counselor_name: counselor.full_name,
          total_assigned: assignedCount || 0,
          contracted: contractedCount,
          total_revenue: totalContractAmount,
          conversion_rate: assignedCount ? (contractedCount / assignedCount) * 100 : 0,
          last_activity: lastActivityDate
        };
      }) || []
    );

    return enrichedCounselors;
  };

  // 최근 계약 로드 (중복 제거)
  const loadRecentContracts = async (): Promise<RecentContract[]> => {
    // 고유한 assignment별로 최신 계약만 조회
    const { data: assignmentsWithContracts } = await supabase
      .from('lead_assignments')
      .select(`
        id,
        counselor_id,
        lead_id,
        counseling_activities (
          id,
          contract_amount,
          contact_date,
          actual_customer_name,
          contract_status
        )
      `)
      .eq('status', 'active');

    if (!assignmentsWithContracts) return [];

    const uniqueContracts: RecentContract[] = [];

    assignmentsWithContracts.forEach(assignment => {
      const activities = assignment.counseling_activities;
      if (activities && activities.length > 0) {
        // 최신 계약 상태 활동만 찾기
        const contractedActivities = activities
          .filter(a => a.contract_status === 'contracted' && a.contract_amount)
          .sort((a, b) => new Date(b.contact_date).getTime() - new Date(a.contact_date).getTime());

        if (contractedActivities.length > 0) {
          // 가장 최근 계약만 사용
          const latestContract = contractedActivities[0];
          
          uniqueContracts.push({
            id: latestContract.id,
            assignment_id: assignment.id,
            counselor_id: assignment.counselor_id,
            lead_id: assignment.lead_id,
            customer_name: latestContract.actual_customer_name || '고객명 미확인',
            counselor_name: '로딩중...',
            contract_amount: latestContract.contract_amount,
            contact_date: latestContract.contact_date,
            data_source: '로딩중...'
          });
        }
      }
    });

    // 고객 및 영업사원 정보 보강
    const enrichedContracts = await Promise.all(
      uniqueContracts.map(async (contract) => {
        // 고객 정보 조회
        const { data: leadData } = await supabase
          .from('lead_pool')
          .select('contact_name, data_source')
          .eq('id', contract.lead_id)
          .single();

        // 영업사원 정보 조회
        const { data: counselorData } = await supabase
          .from('users')
          .select('full_name')
          .eq('id', contract.counselor_id)
          .single();

        return {
          id: contract.id,
          customer_name: contract.customer_name !== '고객명 미확인' ? contract.customer_name : (leadData?.contact_name || '고객명 미확인'),
          counselor_name: counselorData?.full_name || '영업사원 미확인',
          contract_amount: contract.contract_amount,
          contact_date: contract.contact_date,
          data_source: leadData?.data_source || '출처 미확인'
        };
      })
    );

    // 날짜순 정렬 후 최대 10개만 반환
    return enrichedContracts
      .sort((a, b) => new Date(b.contact_date).getTime() - new Date(a.contact_date).getTime())
      .slice(0, 10);
  };

  // 실시간 업데이트 (30초마다)
  useEffect(() => {
    loadDashboardData();
    
    const interval = setInterval(() => {
      loadDashboardData();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  if (isLoading && stats.totalCustomers === 0) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-accent"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* 헤더 */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-text-primary">관리자 대시보드</h1>
            <p className="text-text-secondary mt-1">
              전체 비즈니스 현황을 한눈에 확인하세요
            </p>
            <p className="text-text-tertiary text-sm mt-1">
              마지막 업데이트: {lastUpdated.toLocaleTimeString('ko-KR')}
            </p>
          </div>
          
          {/* 빠른 액션 버튼들 */}
          <div className="flex gap-3">
            <button
              onClick={loadDashboardData}
              className="px-4 py-2 bg-bg-secondary text-text-primary rounded-lg hover:bg-bg-hover transition-colors"
            >
              🔄 새로고침
            </button>
          </div>
        </div>

        {/* 핵심 통계 카드들 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-bg-primary border border-border-primary rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-text-secondary text-sm">총 고객</p>
                <p className="text-2xl font-bold text-text-primary">{stats.totalCustomers.toLocaleString()}</p>
                <p className="text-text-tertiary text-xs mt-1">전체 고객 데이터</p>
              </div>
              <div className="p-3 bg-accent/10 rounded-lg">
                <span className="text-2xl">👥</span>
              </div>
            </div>
          </div>

          <div className="bg-bg-primary border border-border-primary rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-text-secondary text-sm">활성 영업사원</p>
                <p className="text-2xl font-bold text-text-primary">{stats.totalCounselors}</p>
                <p className="text-text-tertiary text-xs mt-1">현재 활동중</p>
              </div>
              <div className="p-3 bg-accent/10 rounded-lg">
                <span className="text-2xl">👤</span>
              </div>
            </div>
          </div>

          <div className="bg-bg-primary border border-border-primary rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-text-secondary text-sm">총 계약</p>
                <p className="text-2xl font-bold text-text-primary">{stats.totalContracts}</p>
                <p className="text-text-tertiary text-xs mt-1">
                  전환율 {stats.conversionRate.toFixed(1)}%
                </p>
              </div>
              <div className="p-3 bg-accent/10 rounded-lg">
                <span className="text-2xl">✅</span>
              </div>
            </div>
          </div>

          <div className="bg-bg-primary border border-border-primary rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-text-secondary text-sm">총 매출</p>
                <p className="text-2xl font-bold text-text-primary">
                  {(stats.totalRevenue / 10000).toFixed(0)}만원
                </p>
                <p className="text-text-tertiary text-xs mt-1">
                  월간 성장 +{stats.monthlyGrowth}%
                </p>
              </div>
              <div className="p-3 bg-accent/10 rounded-lg">
                <span className="text-2xl">📈</span>
              </div>
            </div>
          </div>
        </div>

        {/* 상태별 고객 현황 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-bg-primary border border-border-primary rounded-lg p-6">
            <h3 className="text-lg font-semibold text-text-primary mb-4">고객 현황</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-text-secondary">배정된 고객</span>
                <span className="font-semibold text-text-primary">{stats.activeAssignments}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-text-secondary">미접촉 고객</span>
                <span className="font-semibold text-accent">{stats.notContactedCount}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-text-secondary">상담중 고객</span>
                <span className="font-semibold text-text-primary">{stats.inProgressCount}</span>
              </div>
            </div>
          </div>

          {/* 영업사원 성과 TOP 3 */}
          <div className="bg-bg-primary border border-border-primary rounded-lg p-6">
            <h3 className="text-lg font-semibold text-text-primary mb-4">영업사원 성과 TOP 3</h3>
            <div className="space-y-3">
              {counselorPerformance
                .sort((a, b) => b.total_revenue - a.total_revenue)
                .slice(0, 3)
                .map((counselor, index) => (
                  <div key={counselor.counselor_id} className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                        index === 0 ? 'bg-yellow-500' :
                        index === 1 ? 'bg-gray-400' :
                        'bg-orange-500'
                      }`}>
                        {index + 1}
                      </span>
                      <span className="text-text-primary">{counselor.counselor_name}</span>
                    </div>
                    <span className="text-accent font-semibold">
                      {(counselor.total_revenue / 10000).toFixed(0)}만원
                    </span>
                  </div>
                ))}
            </div>
          </div>

          {/* 빠른 링크 */}
          <div className="bg-bg-primary border border-border-primary rounded-lg p-6">
            <h3 className="text-lg font-semibold text-text-primary mb-4">빠른 관리</h3>
            <div className="space-y-3">
              <button 
                onClick={() => window.location.href = '/admin/counselor-management'}
                className="w-full text-left p-3 bg-bg-secondary hover:bg-bg-hover rounded-lg transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">👥</span>
                  <span className="text-text-primary">영업사원 관리</span>
                </div>
              </button>
              <button 
                onClick={() => window.location.href = '/admin/upload'}
                className="w-full text-left p-3 bg-bg-secondary hover:bg-bg-hover rounded-lg transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">📤</span>
                  <span className="text-text-primary">고객 데이터 업로드</span>
                </div>
              </button>
              <button 
                onClick={() => window.location.href = '/admin/consulting-monitor'}
                className="w-full text-left p-3 bg-bg-secondary hover:bg-bg-hover rounded-lg transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">📊</span>
                  <span className="text-text-primary">실시간 모니터링</span>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* 영업사원별 성과 시각화 */}
        <div className="bg-bg-primary border border-border-primary rounded-lg p-6">
          <h3 className="text-lg font-semibold text-text-primary mb-4">영업사원별 매출 현황</h3>
          <div className="space-y-4">
            {counselorPerformance
              .sort((a, b) => b.total_revenue - a.total_revenue)
              .slice(0, 5)
              .map((counselor, index) => {
                const maxRevenue = Math.max(...counselorPerformance.map(c => c.total_revenue));
                const percentage = maxRevenue > 0 ? (counselor.total_revenue / maxRevenue) * 100 : 0;
                
                return (
                  <div key={counselor.counselor_id} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white ${
                          index === 0 ? 'bg-yellow-500' :
                          index === 1 ? 'bg-gray-400' :
                          index === 2 ? 'bg-orange-500' :
                          'bg-accent'
                        }`}>
                          {index + 1}
                        </span>
                        <div>
                          <div className="text-text-primary font-medium">{counselor.counselor_name}</div>
                          <div className="text-xs text-text-tertiary">
                            계약 {counselor.contracted}건 · 전환율 {counselor.conversion_rate.toFixed(1)}%
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-accent font-bold text-lg">
                          {(counselor.total_revenue / 10000).toFixed(0)}만원
                        </div>
                      </div>
                    </div>
                    <div className="w-full bg-bg-secondary rounded-full h-3">
                      <div 
                        className="bg-accent h-3 rounded-full transition-all duration-1000"
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
          </div>
          
          {counselorPerformance.length === 0 && (
            <div className="text-center py-8 text-text-secondary">
              영업사원 성과 데이터가 없습니다.
            </div>
          )}
        </div>

        {/* 최근 계약 현황 */}
        <div className="bg-bg-primary border border-border-primary rounded-lg p-6">
          <h3 className="text-lg font-semibold text-text-primary mb-4">최근 계약 현황</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border-primary">
                  <th className="text-left py-3 px-4 text-text-secondary font-medium">고객명</th>
                  <th className="text-left py-3 px-4 text-text-secondary font-medium">영업사원</th>
                  <th className="text-left py-3 px-4 text-text-secondary font-medium">계약금액</th>
                  <th className="text-left py-3 px-4 text-text-secondary font-medium">데이터 출처</th>
                  <th className="text-left py-3 px-4 text-text-secondary font-medium">계약일</th>
                </tr>
              </thead>
              <tbody>
                {recentContracts.map((contract) => (
                  <tr key={contract.id} className="border-b border-border-primary hover:bg-bg-hover">
                    <td className="py-3 px-4 text-text-primary font-medium">
                      {contract.customer_name}
                    </td>
                    <td className="py-3 px-4 text-text-primary">
                      {contract.counselor_name}
                    </td>
                    <td className="py-3 px-4 text-accent font-semibold">
                      {(contract.contract_amount / 10000).toFixed(0)}만원
                    </td>
                    <td className="py-3 px-4 text-text-secondary">
                      {contract.data_source}
                    </td>
                    <td className="py-3 px-4 text-text-secondary">
                      {new Date(contract.contact_date).toLocaleDateString('ko-KR')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {recentContracts.length === 0 && (
              <div className="text-center py-8 text-text-secondary">
                아직 계약 데이터가 없습니다.
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

export default function AdminDashboard() {
  return (
    <ProtectedRoute requiredRole="admin">
      <AdminDashboardContent />
    </ProtectedRoute>
  );
}