'use client';

import { useState, useEffect } from 'react';
import CounselorLayout from '@/components/layout/CounselorLayout';
import { designSystem } from '@/lib/design-system';
import { businessIcons } from '@/lib/design-system/icons';
import SmartTable from '@/components/ui/SmartTable';
import { useToastHelpers } from '@/components/ui/Toast'; // ✅ 토스트 시스템 추가
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth/AuthContext';
import { RefreshCw, AlertCircle, CheckCircle, Clock, TrendingUp, Phone, MessageSquare, Calendar, Target } from 'lucide-react';

// 타입 정의
interface CounselorLead {
  assignment_id: string;
  counselor_id: string;
  lead_id: string;
  phone: string;
  contact_name: string;
  data_source: string;
  contact_script: string;
  assigned_at: string;
  last_contact_date?: string;
  next_contact_hope?: string;
  priority: 'high' | 'medium' | 'low';
  call_attempts: number;
  contract_status?: string;
  assignment_status: string;
}

interface DashboardStats {
  assigned: number;      // 배정받은 리드
  in_progress: number;   // 상담 진행 중
  completed: number;     // 계약 완료
  returned: number;      // 반환된 리드
}

interface QuickAction {
  id: string;
  type: 'call' | 'note' | 'schedule' | 'complete';
  label: string;
  icon: any;
  color: string;
}

export default function CounselorDashboard() {
  const { user } = useAuth();
  const toast = useToastHelpers(); // ✅ 토스트 헬퍼 추가
  
  const [leads, setLeads] = useState<CounselorLead[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    assigned: 0,
    in_progress: 0,
    completed: 0,
    returned: 0
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false); // ✅ 새로고침 상태 추가
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [quickActionLoading, setQuickActionLoading] = useState<string | null>(null); // ✅ 퀵 액션 로딩 상태

  // ✅ 퀵 액션 정의
  const quickActions: QuickAction[] = [
    {
      id: 'call',
      type: 'call',
      label: '통화 시도',
      icon: Phone,
      color: 'text-blue-500 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/30'
    },
    {
      id: 'note',
      type: 'note', 
      label: '메모 추가',
      icon: MessageSquare,
      color: 'text-green-500 bg-green-50 hover:bg-green-100 dark:bg-green-900/20 dark:hover:bg-green-900/30'
    },
    {
      id: 'schedule',
      type: 'schedule',
      label: '일정 등록',
      icon: Calendar,
      color: 'text-purple-500 bg-purple-50 hover:bg-purple-100 dark:bg-purple-900/20 dark:hover:bg-purple-900/30'
    },
    {
      id: 'complete',
      type: 'complete',
      label: '상담 완료',
      icon: Target,
      color: 'text-orange-500 bg-orange-50 hover:bg-orange-100 dark:bg-orange-900/20 dark:hover:bg-orange-900/30'
    }
  ];

  // 데이터 로드
  const loadDashboardData = async (showToast = false) => {
    if (!user?.id) return;

    // ✅ 새로고침 시에만 별도 로딩 상태
    if (showToast) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      // counselor_leads_view에서 현재 상담원의 리드 데이터 가져오기
      const { data: leadsData, error: leadsError } = await supabase
        .from('counselor_leads_view')
        .select('*')
        .eq('counselor_id', user.id)
        .order('priority', { ascending: false })
        .order('assigned_at', { ascending: false });

      if (leadsError) {
        console.warn('counselor_leads_view 조회 오류:', leadsError);
        
        // ✅ fallback 로직 개선
        try {
          const { data: fallbackData, error: fallbackError } = await supabase
            .from('lead_assignments')
            .select(`
              id, lead_id, counselor_id, assigned_at, status,
              lead:lead_pool(id, phone, contact_name, data_source, contact_script)
            `)
            .eq('counselor_id', user.id)
            .eq('status', 'active');

          if (!fallbackError && fallbackData) {
            const convertedLeads = fallbackData.map(assignment => ({
              assignment_id: assignment.id,
              counselor_id: assignment.counselor_id,
              lead_id: assignment.lead_id,
              phone: assignment.lead.phone,
              contact_name: assignment.lead.contact_name,
              data_source: assignment.lead.data_source,
              contact_script: assignment.lead.contact_script,
              assigned_at: assignment.assigned_at,
              priority: 'medium' as const,
              call_attempts: 0,
              assignment_status: assignment.status
            }));
            
            setLeads(convertedLeads);
            setStats({
              assigned: convertedLeads.length,
              in_progress: 0,
              completed: 0,
              returned: 0
            });

            // ✅ fallback 사용 시 토스트 알림
            if (showToast) {
              toast.warning(
                '기본 모드로 로드됨',
                'counselor_leads_view를 사용할 수 없어 기본 데이터를 표시합니다.',
                {
                  action: {
                    label: '관리자 문의',
                    onClick: () => toast.info('문의', '시스템 관리자에게 뷰 설정을 요청해주세요.')
                  }
                }
              );
            }
            return;
          }
        } catch (fallbackErr) {
          console.warn('대체 데이터 로드도 실패:', fallbackErr);
          throw new Error('데이터를 불러올 수 없습니다. 시스템 관리자에게 문의해주세요.');
        }
      }

      const leadsArray = leadsData || [];
      setLeads(leadsArray);

      // 실제 리드 상태별 통계 계산
      setStats({
        assigned: leadsArray.filter(lead => lead.assignment_status === 'assigned' || lead.assignment_status === 'active').length,
        in_progress: leadsArray.filter(lead => lead.assignment_status === 'in_progress').length,
        completed: leadsArray.filter(lead => lead.contract_status === 'completed').length,
        returned: leadsArray.filter(lead => lead.assignment_status === 'returned').length
      });

      // ✅ 성공적인 새로고침 토스트
      if (showToast) {
        toast.success(
          '새로고침 완료',
          `${leadsArray.length}개의 리드 정보가 업데이트되었습니다.`,
          {
            duration: 3000,
            action: leadsArray.length > 0 ? {
              label: '우선순위 보기',
              onClick: () => {
                const highPriorityCount = leadsArray.filter(l => l.priority === 'high').length;
                if (highPriorityCount > 0) {
                  toast.info('우선순위 알림', `긴급 처리가 필요한 리드가 ${highPriorityCount}개 있습니다.`);
                } else {
                  toast.info('우선순위 현황', '현재 긴급 처리가 필요한 리드가 없습니다.');
                }
              }
            } : undefined
          }
        );
      }

    } catch (error) {
      console.error('대시보드 데이터 로드 오류:', error);
      
      // ✅ 에러 상황 개선된 토스트
      const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.';
      
      if (showToast) {
        toast.error(
          '새로고침 실패',
          `데이터를 불러오는 중 오류가 발생했습니다.\n\n${errorMessage}`,
          {
            action: {
              label: '다시 시도',
              onClick: () => loadDashboardData(true)
            },
            duration: 0 // 수동으로 닫을 때까지 유지
          }
        );
      } else {
        // 초기 로드 실패 시에는 조용히 처리하고 빈 상태로 설정
        setLeads([]);
        setStats({
          assigned: 0,
          in_progress: 0,
          completed: 0,
          returned: 0
        });
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [user?.id]);

  // ✅ 퀵 액션 핸들러들
  const handleQuickAction = async (action: QuickAction, leadIds?: string[]) => {
    const targetLeads = leadIds || selectedItems;
    
    if (targetLeads.length === 0) {
      toast.warning('선택 필요', '액션을 수행할 리드를 선택해주세요.');
      return;
    }

    setQuickActionLoading(action.id);

    try {
      switch (action.type) {
        case 'call':
          // 통화 시도 로직 (실제로는 상담 기록 시스템과 연동)
          await simulateApiCall(1000);
          toast.success(
            '통화 준비 완료',
            `${targetLeads.length}개 리드에 대한 통화를 시작할 수 있습니다.`,
            {
              action: {
                label: '통화 기록',
                onClick: () => toast.info('통화 기록', '실제 구현 시 통화 기록 모달이 열립니다.')
              }
            }
          );
          break;

        case 'note':
          // 메모 추가 로직
          await simulateApiCall(800);
          toast.success(
            '메모 준비',
            `${targetLeads.length}개 리드에 메모를 추가할 수 있습니다.`,
            {
              action: {
                label: '메모 작성',
                onClick: () => toast.info('메모 작성', '실제 구현 시 메모 작성 모달이 열립니다.')
              }
            }
          );
          break;

        case 'schedule':
          // 일정 등록 로직
          await simulateApiCall(1200);
          toast.success(
            '일정 등록 준비',
            `${targetLeads.length}개 리드에 대한 후속 일정을 등록할 수 있습니다.`,
            {
              action: {
                label: '일정 설정',
                onClick: () => toast.info('일정 설정', '실제 구현 시 일정 설정 모달이 열립니다.')
              }
            }
          );
          break;

        case 'complete':
          // 상담 완료 처리
          await simulateApiCall(1500);
          toast.success(
            '상담 완료 처리',
            `${targetLeads.length}개 리드의 상담이 완료 처리되었습니다.`,
            {
              action: {
                label: '결과 확인',
                onClick: () => loadDashboardData(true)
              }
            }
          );
          // 실제로는 상태 업데이트 후 새로고침
          setTimeout(() => loadDashboardData(false), 1000);
          break;

        default:
          toast.info('개발 중', '해당 기능은 곧 추가될 예정입니다.');
      }

      // 액션 완료 후 선택 해제
      setSelectedItems([]);

    } catch (error) {
      toast.error(
        '액션 실패',
        `${action.label} 처리 중 오류가 발생했습니다.`,
        {
          action: {
            label: '다시 시도',
            onClick: () => handleQuickAction(action, targetLeads)
          }
        }
      );
    } finally {
      setQuickActionLoading(null);
    }
  };

  // API 호출 시뮬레이션
  const simulateApiCall = (delay: number): Promise<void> => {
    return new Promise(resolve => setTimeout(resolve, delay));
  };

  // 우선순위별 색상 및 아이콘
  const getPriorityDisplay = (priority: string) => {
    switch (priority) {
      case 'high':
        return {
          color: 'text-error',
          bgColor: 'bg-error-light',
          icon: AlertCircle,
          label: '긴급'
        };
      case 'medium':
        return {
          color: 'text-warning',
          bgColor: 'bg-warning-light',
          icon: Clock,
          label: '보통'
        };
      case 'low':
        return {
          color: 'text-success',
          bgColor: 'bg-success-light',
          icon: CheckCircle,
          label: '낮음'
        };
      default:
        return {
          color: 'text-text-tertiary',
          bgColor: 'bg-bg-hover',
          icon: Clock,
          label: '미정'
        };
    }
  };

  // SmartTable 컬럼 정의
  const columns = [
    {
      key: 'contact_name',
      label: '고객명',
      icon: businessIcons.contact,
      render: (value: string, record: CounselorLead) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-accent rounded-full flex items-center justify-center">
            <span className="text-white font-medium text-sm">
              {value?.charAt(0) || '?'}
            </span>
          </div>
          <div>
            <div className="font-medium text-text-primary">{value || '이름 없음'}</div>
            <div className="text-xs text-text-tertiary">{record.data_source}</div>
          </div>
        </div>
      )
    },
    {
      key: 'phone',
      label: '연락처',
      icon: businessIcons.phone,
      render: (value: string, record: CounselorLead) => (
        <div className="space-y-1">
          <span className="font-mono text-text-primary">{value}</span>
          {/* ✅ 빠른 통화 버튼 추가 */}
          <div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleQuickAction(quickActions[0], [record.assignment_id]);
              }}
              className="text-xs text-blue-500 hover:text-blue-700 flex items-center gap-1"
            >
              <Phone className="w-3 h-3" />
              통화
            </button>
          </div>
        </div>
      )
    },
    {
      key: 'priority',
      label: '우선순위',
      icon: businessIcons.analytics,
      render: (value: string) => {
        const { color, bgColor, icon: Icon, label } = getPriorityDisplay(value);
        return (
          <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full ${bgColor}`}>
            <Icon className={`w-4 h-4 ${color}`} />
            <span className={`text-sm font-medium ${color}`}>{label}</span>
          </div>
        );
      }
    },
    {
      key: 'contact_script',
      label: '상담 내용',
      icon: businessIcons.script,
      render: (value: string) => (
        <span className="text-text-secondary">{value || '내용 없음'}</span>
      )
    },
    {
      key: 'call_attempts',
      label: '통화시도',
      icon: businessIcons.phone,
      render: (value: number) => (
        <div className="text-center">
          <span className={`font-medium ${value > 3 ? 'text-warning' : 'text-text-primary'}`}>
            {value || 0}회
          </span>
        </div>
      )
    },
    {
      key: 'last_contact_date',
      label: '최근 연락',
      icon: businessIcons.date,
      render: (value: string) => (
        <span className="text-text-tertiary text-sm">
          {value ? new Date(value).toLocaleDateString('ko-KR') : '연락 안함'}
        </span>
      )
    }
  ];

  // 선택 항목 토글
  const toggleSelection = (id: string) => {
    setSelectedItems(prev => 
      prev.includes(id) 
        ? prev.filter(item => item !== id)
        : [...prev, id]
    );
  };

  // 통계 카드 데이터 - 실제 워크플로우 기반
  const statCards = [
    {
      title: '배정받은 리드',
      value: stats.assigned,
      icon: businessIcons.contact,
      color: 'text-accent',
      bgColor: 'bg-accent/10',
      description: '현재 담당 중인 리드',
      action: stats.assigned > 0 ? () => {
        toast.info('배정 현황', `총 ${stats.assigned}개의 리드가 배정되어 있습니다.`);
      } : undefined
    },
    {
      title: '상담 진행 중',
      value: stats.in_progress,
      icon: businessIcons.phone,
      color: 'text-warning',
      bgColor: 'bg-warning-light',
      description: '활발히 상담 중인 리드',
      action: stats.in_progress > 0 ? () => {
        toast.info('진행 현황', `${stats.in_progress}개 리드와 상담을 진행하고 있습니다.`);
      } : undefined
    },
    {
      title: '계약 완료',
      value: stats.completed,
      icon: CheckCircle,
      color: 'text-success',
      bgColor: 'bg-success-light',
      description: '성공적으로 계약한 리드',
      action: stats.completed > 0 ? () => {
        toast.success('성과 현황', `🎉 총 ${stats.completed}건의 계약을 완료하셨습니다!`);
      } : undefined
    },
    {
      title: '반환된 리드',
      value: stats.returned,
      icon: RefreshCw,
      color: 'text-text-tertiary',
      bgColor: 'bg-bg-hover',
      description: '재배정을 위해 반환된 리드',
      action: stats.returned > 0 ? () => {
        toast.warning('반환 현황', `${stats.returned}개 리드가 반환되었습니다.`);
      } : undefined
    }
  ];

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
              안녕하세요, {user?.full_name || '상담원'}님! 오늘도 화이팅하세요! 💪
            </p>
          </div>
          <button
            onClick={() => loadDashboardData(true)}
            disabled={refreshing}
            className={`flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors ${
              refreshing ? 'opacity-75 cursor-not-allowed' : ''
            }`}
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? '새로고침 중...' : '새로고침'}
          </button>
        </div>

        {/* 통계 카드 - 클릭 가능하게 개선 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {statCards.map((card, index) => {
            const IconComponent = card.icon;
            return (
              <div 
                key={index} 
                className={`bg-bg-primary border border-border-primary rounded-lg p-6 ${
                  card.action ? 'cursor-pointer hover:border-accent transition-colors' : ''
                }`}
                onClick={card.action}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-text-tertiary text-sm font-medium">{card.title}</p>
                    <p className={`text-2xl font-bold mt-1 ${card.color}`}>
                      {card.value.toLocaleString()}
                    </p>
                    <p className="text-text-tertiary text-xs mt-1">{card.description}</p>
                  </div>
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${card.bgColor}`}>
                    <IconComponent className={`w-6 h-6 ${card.color}`} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* ✅ 퀵 액션 버튼들 */}
        {selectedItems.length > 0 && (
          <div className="bg-accent-light border border-accent/20 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-accent">
                  {selectedItems.length}개 리드 선택됨
                </span>
              </div>
              
              <div className="flex items-center gap-2">
                {quickActions.map((action) => {
                  const Icon = action.icon;
                  const isLoading = quickActionLoading === action.id;
                  
                  return (
                    <button
                      key={action.id}
                      onClick={() => handleQuickAction(action)}
                      disabled={isLoading}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${action.color} ${
                        isLoading ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                    >
                      {isLoading ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <Icon className="w-4 h-4" />
                      )}
                      {action.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* 우선순위별 리드 목록 */}
        <div className="bg-bg-primary border border-border-primary rounded-lg">
          <div className="p-6 border-b border-border-primary">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <TrendingUp className="w-5 h-5 text-accent" />
                <h2 className={designSystem.components.typography.h4}>
                  내 리드 목록
                </h2>
                <span className="text-text-tertiary text-sm">
                  ({leads.length}개)
                </span>
              </div>
              
              {/* ✅ 우선순위 필터 추가 */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-text-secondary">우선순위:</span>
                {['high', 'medium', 'low'].map((priority) => {
                  const { color, label } = getPriorityDisplay(priority);
                  const count = leads.filter(l => l.priority === priority).length;
                  
                  return (
                    <div key={priority} className={`px-2 py-1 rounded text-xs ${color} bg-opacity-20`}>
                      {label}: {count}개
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="p-6">
            {leads.length > 0 ? (
              <SmartTable
                data={leads}
                columns={columns}
                selectedItems={selectedItems}
                onToggleSelection={toggleSelection}
                getItemId={(item) => item.assignment_id}
                searchPlaceholder="고객명, 전화번호, 상담내용으로 검색..."
                height="60vh"
              />
            ) : (
              <div className="text-center py-12">
                <businessIcons.contact className="w-16 h-16 text-text-tertiary mx-auto mb-4" />
                <h3 className="text-lg font-medium text-text-primary mb-2">
                  아직 배정받은 리드가 없습니다
                </h3>
                <p className="text-text-secondary mb-4">
                  관리자가 리드를 배정하면 여기에 표시됩니다.
                </p>
                <div className="text-sm text-text-tertiary bg-bg-secondary p-4 rounded-lg inline-block">
                  💡 <strong>안내:</strong> 관리자가 리드를 배정하면<br/>
                  우선순위별로 체계적인 상담 관리가 가능합니다.<br/>
                  배정 알림을 받으시면 새로고침 버튼을 클릭해주세요.
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 성과 진행률 요약 - 개선된 인터랙션 */}
        {(stats.assigned > 0 || stats.in_progress > 0 || stats.completed > 0) && (
          <div className="bg-bg-primary border border-border-primary rounded-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <TrendingUp className="w-5 h-5 text-accent" />
              <h3 className="font-medium text-text-primary">내 성과 진행률</h3>
              <button
                onClick={() => {
                  toast.info(
                    '성과 분석',
                    `배정 대비 상담 전환율: ${stats.assigned > 0 ? Math.round((stats.in_progress / stats.assigned) * 100) : 0}%\n상담 대비 계약 전환율: ${stats.in_progress > 0 ? Math.round((stats.completed / stats.in_progress) * 100) : 0}%`,
                    {
                      action: {
                        label: '상세 분석',
                        onClick: () => toast.info('상세 분석', '곧 상세한 성과 분석 기능이 추가될 예정입니다.')
                      }
                    }
                  );
                }}
                className="text-xs text-accent hover:text-accent-dark"
              >
                📊 분석 보기
              </button>
            </div>
            <div className="space-y-3">
              {stats.assigned > 0 && (
                <div className="flex items-center justify-between py-2">
                  <span className="text-text-secondary">배정 → 상담 전환율</span>
                  <span className="font-medium text-text-primary">
                    {stats.assigned > 0 ? Math.round((stats.in_progress / stats.assigned) * 100) : 0}%
                  </span>
                </div>
              )}
              {stats.in_progress > 0 && (
                <div className="flex items-center justify-between py-2">
                  <span className="text-text-secondary">상담 → 계약 전환율</span>
                  <span className="font-medium text-success">
                    {stats.in_progress > 0 ? Math.round((stats.completed / stats.in_progress) * 100) : 0}%
                  </span>
                </div>
              )}
              {stats.returned > 0 && (
                <div className="flex items-center justify-between py-2">
                  <span className="text-text-secondary">반환된 리드</span>
                  <span className="text-text-tertiary">{stats.returned}개</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </CounselorLayout>
  );
}