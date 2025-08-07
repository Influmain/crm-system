import AdminLayout from '@/components/layout/AdminLayout'
import { designSystem } from '@/lib/design-system'

export default function AdminDashboard() {
  return (
    <AdminLayout>
      {/* 페이지 헤더 */}
      <div className="mb-8">
        <h1 className={designSystem.components.typography.h2}>관리자 대시보드</h1>
        <p className={designSystem.components.typography.bodySm}>전체 시스템 현황을 확인하세요</p>
      </div>
      
      {/* 빈 상태 */}
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center max-w-md">
          <div className="w-24 h-24 bg-bg-tertiary rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className={designSystem.utils.cn('w-12 h-12', designSystem.colors.text.tertiary)} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>

          <h3 className={designSystem.utils.cn(designSystem.components.typography.h4, 'mb-4')}>
            관리자 대시보드 구성 중
          </h3>
          
          <p className={designSystem.utils.cn(designSystem.components.typography.bodySm, 'mb-6')}>
            시스템 기능이 완료되면 전체 리드 현황, 상담사 성과, 
            시스템 분석 등을 한눈에 볼 수 있습니다.
          </p>

          {/* 예정된 기능들 */}
          <div className={designSystem.utils.cn(designSystem.components.card.base, designSystem.components.card.content, 'text-left mb-6')}>
            <h4 className={designSystem.utils.cn(designSystem.components.typography.h6, 'mb-3')}>예정된 관리자 기능</h4>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-success rounded-full"></span>
                전체 리드 현황 및 통계
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-success rounded-full"></span>
                상담사별 성과 분석
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-success rounded-full"></span>
                시스템 사용량 모니터링
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-success rounded-full"></span>
                배정 현황 및 최적화
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-success rounded-full"></span>
                실시간 알림 및 시스템 상태
              </li>
            </ul>
          </div>

          {/* 빠른 액션 */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a href="/admin/upload" className={designSystem.components.button.primary}>
              데이터 업로드
            </a>
            <a href="/admin/leads" className={designSystem.components.button.secondary}>
              리드 관리
            </a>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}