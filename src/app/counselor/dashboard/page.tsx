'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import CounselorLayout from '@/components/layout/CounselorLayout';
import { designSystem } from '@/lib/design-system';
import { businessIcons } from '@/lib/design-system/icons';
import { useToastHelpers } from '@/components/ui/Toast';
import SmartTable from '@/components/ui/SmartTable';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth/AuthContext';
import { RefreshCw, AlertCircle, CheckCircle, Clock, TrendingUp } from 'lucide-react';

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
  assigned: number;      // 배정받은 고객
  in_progress: number;   // 영업 진행 중
  completed: number;     // 계약 완료
  returned: number;      // 반환된 고객
}

export default function CounselorDashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const toast = useToastHelpers();
  
  const [leads, setLeads] = useState<CounselorLead[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    assigned: 0,
    in_progress: 0,
    completed: 0,
    returned: 0
  });
  const [loading, setLoading] = useState(true);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);

  // 데이터 로드
  const loadDashboardData = async () => {
    if (!user?.id) return;

    setLoading(true);
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
        
        // counselor_leads_view가 없을 경우 대체 로직
        try {
          const { data: fallbackData, error: fallbackError } = await supabase
            .from('lead_assignments')
            .select(`
              id, lead_id, counselor_id, assigned_at, status,
              lead_pool (
                id, phone, name, contact_name, data_source, contact_script
              )
            `)
            .eq('counselor_id', user.id)
            .eq('status', 'active');

          if (!fallbackError && fallbackData) {
            // 대체 데이터 형식으로 변환
            const convertedLeads = fallbackData.map(assignment => ({
              assignment_id: assignment.id,
              counselor_id: assignment.counselor_id,
              lead_id: assignment.lead_id,
              phone: assignment.lead_pool?.phone || '',
              contact_name: assignment.lead_pool?.contact_name || assignment.lead_pool?.name || '고객명 없음',
              data_source: assignment.lead_pool?.data_source || '미지정',
              contact_script: assignment.lead_pool?.contact_script || '',
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
            
            toast.success(
              '대시보드 로드 완료',
              `${convertedLeads.length}개의 배정 고객을 불러왔습니다.`,
              {
                action: { 
                  label: '고객 목록 보기', 
                  onClick: () => router.push('/counselor/leads')
                }
              }
            );
            return;
          }
        } catch (fallbackErr) {
          console.warn('대체 데이터 로드도 실패:', fallbackErr);
        }
        
        // 모든 시도 실패 시 빈 배열 처리
        setLeads([]);
        setStats({
          assigned: 0,
          in_progress: 0,
          completed: 0,
          returned: 0
        });
        
        toast.info(
          '배정된 고객이 없습니다',
          '관리자가 고객을 배정하면 여기에 표시됩니다.',
          {
            action: { 
              label: '새로고침', 
              onClick: () => loadDashboardData()
            }
          }
        );
        return;
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

      toast.success(
        '대시보드 새로고침 완료',
        `${leadsArray.length}개의 배정 고객 정보를 업데이트했습니다.`
      );

    } catch (error) {
      console.error('대시보드 데이터 로드 오류:', error);
      setLeads([]);
      setStats({
        assigned: 0,
        in_progress: 0,
        completed: 0,
        returned: 0
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
          color: 'text-accent',
          bgColor: 'bg-accent/10',
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

  // SmartTable 컬럼 정의 (업계 용어 적용)
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
            <div className="font-medium text-text-primary">{value || '고객명 없음'}</div>
            <div className="text-xs text-text-tertiary">{record.data_source}</div>
          </div>
        </div>
      )
    },
    {
      key: 'phone',
      label: '연락처',
      icon: businessIcons.phone,
      render: (value: string) => (
        <span className="font-mono text-text-primary">{value}</span>
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
      label: '영업 상품',
      icon: businessIcons.script,
      render: (value: string) => (
        <span className="text-text-secondary">{value || '상품 정보 없음'}</span>
      )
    },
    {
      key: 'call_attempts',
      label: '접촉시도',
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
      label: '최근 접촉',
      icon: businessIcons.date,
      render: (value: string) => (
        <span className="text-text-tertiary text-sm">
          {value ? new Date(value).toLocaleDateString('ko-KR') : '미접촉'}
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

  // 통계 카드 데이터 - 업계 용어 적용
  const statCards = [
    {
      title: '배정 고객',
      value: stats.assigned,
      icon: businessIcons.contact,
      color: 'text-accent',
      bgColor: 'bg-accent/10',
      description: '현재 담당 중인 고객',
      onClick: () => router.push('/counselor/leads')
    },
    {
      title: '영업 진행 중',
      value: stats.in_progress,
      icon: businessIcons.phone,
      color: 'text-warning',
      bgColor: 'bg-warning-light',
      description: '활발히 영업 중인 고객',
      onClick: () => router.push('/counselor/leads?filter=contacted')
    },
    {
      title: '계약 완료',
      value: stats.completed,
      icon: CheckCircle,
      color: 'text-success',
      bgColor: 'bg-success-light',
      description: '성공적으로 계약한 고객',
      onClick: () => router.push('/counselor/leads?filter=completed')
    },
    {
      title: '반환 고객',
      value: stats.returned,
      icon: RefreshCw,
      color: 'text-text-tertiary',
      bgColor: 'bg-bg-hover',
      description: '재배정을 위해 반환된 고객'
    }
  ];

  // 퀵 액션 버튼들
  const quickActions = [
    {
      title: '영업 시작',
      description: '새 고객에게 영업 개시',
      icon: businessIcons.phone,
      color: 'bg-accent',
      onClick: () => {
        if (leads.length > 0) {
          router.push('/counselor/leads');
        } else {
          toast.info('배정된 고객이 없습니다', '관리자가 고객을 배정할 때까지 기다려주세요.');
        }
      }
    },
    {
      title: '진행 현황',
      description: '내 영업 진행 상황 확인',
      icon: businessIcons.analytics,
      color: 'bg-accent/80',
      onClick: () => router.push('/counselor/leads')
    },
    {
      title: '고객 목록',
      description: '전체 배정 고객 보기',
      icon: businessIcons.contact,
      color: 'bg-accent/60',
      onClick: () => router.push('/counselor/leads')
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
              영업 대시보드
            </h1>
            <p className="text-text-secondary mt-1">
              안녕하세요, {user?.full_name || '상담원'}님! 오늘도 좋은 성과 만들어가세요! 💪
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {statCards.map((card, index) => {
            const IconComponent = card.icon;
            return (
              <div 
                key={index} 
                className={`bg-bg-primary border border-border-primary rounded-lg p-6 transition-all hover:shadow-md ${
                  card.onClick ? 'cursor-pointer hover:bg-bg-hover' : ''
                }`}
                onClick={card.onClick}
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

        {/* 퀵 액션 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {quickActions.map((action, index) => (
            <button
              key={index}
              onClick={action.onClick}
              className={`${action.color} text-white p-4 rounded-lg hover:opacity-90 transition-all text-left group`}
            >
              <div className="flex items-center gap-3">
                <action.icon className="w-6 h-6" />
                <div>
                  <div className="font-medium">{action.title}</div>
                  <div className="text-sm opacity-90">{action.description}</div>
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* 우선순위별 고객 목록 */}
        <div className="bg-bg-primary border border-border-primary rounded-lg">
          <div className="p-6 border-b border-border-primary">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <TrendingUp className="w-5 h-5 text-accent" />
                <h2 className={designSystem.components.typography.h4}>
                  배정 고객 목록
                </h2>
                <span className="text-text-tertiary text-sm">
                  ({leads.length}개)
                </span>
              </div>
              {selectedItems.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-text-secondary">
                    {selectedItems.length}개 선택됨
                  </span>
                  <button 
                    className="px-3 py-1 bg-accent text-white rounded text-sm hover:bg-accent/90"
                    onClick={() => {
                      toast.info('일괄 처리', `${selectedItems.length}개 고객에 대한 일괄 작업을 시작합니다.`);
                    }}
                  >
                    일괄 영업
                  </button>
                </div>
              )}
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
                searchPlaceholder="고객명, 전화번호, 영업상품으로 검색..."
                height="60vh"
              />
            ) : (
              <div className="text-center py-12">
                <businessIcons.contact className="w-16 h-16 text-text-tertiary mx-auto mb-4" />
                <h3 className="text-lg font-medium text-text-primary mb-2">
                  아직 배정받은 고객이 없습니다
                </h3>
                <p className="text-text-secondary mb-4">
                  관리자가 고객을 배정하면 여기에 표시됩니다.
                </p>
                <div className="text-sm text-text-tertiary bg-bg-secondary p-4 rounded-lg inline-block">
                  💡 <strong>안내:</strong> 관리자가 고객을 배정하면<br/>
                  우선순위별로 체계적인 영업 관리가 가능합니다.<br/>
                  배정 알림을 받으시면 대시보드를 새로고침해주세요.
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 성과 진행률 요약 */}
        {(stats.assigned > 0 || stats.in_progress > 0 || stats.completed > 0) && (
          <div className="bg-bg-primary border border-border-primary rounded-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <TrendingUp className="w-5 h-5 text-accent" />
              <h3 className="font-medium text-text-primary">내 영업 성과</h3>
            </div>
            <div className="space-y-3">
              {stats.assigned > 0 && (
                <div className="flex items-center justify-between py-2">
                  <span className="text-text-secondary">배정 → 영업 전환율</span>
                  <span className="font-medium text-text-primary">
                    {stats.assigned > 0 ? Math.round((stats.in_progress / stats.assigned) * 100) : 0}%
                  </span>
                </div>
              )}
              {stats.in_progress > 0 && (
                <div className="flex items-center justify-between py-2">
                  <span className="text-text-secondary">영업 → 계약 전환율</span>
                  <span className="font-medium text-success">
                    {stats.in_progress > 0 ? Math.round((stats.completed / stats.in_progress) * 100) : 0}%
                  </span>
                </div>
              )}
              {stats.completed > 0 && (
                <div className="flex items-center justify-between py-2">
                  <span className="text-text-secondary">총 계약 건수</span>
                  <span className="font-medium text-success">{stats.completed}건</span>
                </div>
              )}
              {stats.returned > 0 && (
                <div className="flex items-center justify-between py-2">
                  <span className="text-text-secondary">반환된 고객</span>
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