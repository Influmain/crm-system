import Link from 'next/link'
import CounselorLayout from '@/components/layout/CounselorLayout'
import { designSystem } from '@/lib/design-system'

export default function CounselorDashboard() {
  return (
    <CounselorLayout>
      {/* 페이지 헤더 */}
      <div className="mb-8">
        <h1 className={designSystem.components.typography.h2}>상담사 대시보드</h1>
        <p className={designSystem.components.typography.bodySm}>내 담당 리드와 오늘 일정을 확인하세요</p>
      </div>

      {/* 빈 상태 */}
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center max-w-md">
          <div className="w-24 h-24 bg-bg-tertiary rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className={designSystem.utils.cn('w-12 h-12', designSystem.colors.text.tertiary)} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>

          <h3 className={designSystem.utils.cn(designSystem.components.typography.h4, 'mb-4')}>
            상담사 대시보드 구성 중
          </h3>
          
          <p className={designSystem.utils.cn(designSystem.components.typography.bodySm, 'mb-6')}>
            리드 관리 기능이 완료되면 담당 리드 현황, 오늘의 일정, 
            개인 성과 등을 한눈에 볼 수 있습니다.
          </p>

          {/* 예정된 기능들 */}
          <div className={designSystem.utils.cn(designSystem.components.card.base, designSystem.components.card.content, 'text-left mb-6')}>
            <h4 className={designSystem.utils.cn(designSystem.components.typography.h6, 'mb-3')}>예정된 대시보드 기능</h4>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-success rounded-full"></span>
                내 담당 리드 현황
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-success rounded-full"></span>
                오늘의 상담 일정
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-success rounded-full"></span>
                개인 성과 및 목표 달성률
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-success rounded-full"></span>
                우선순위 작업 및 알림
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-success rounded-full"></span>
                최근 상담 기록 요약
              </li>
            </ul>
          </div>

          {/* 빠른 액션 */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/counselor/leads" className={designSystem.components.button.primary}>
              내 리드 보기
            </Link>
            <Link href="/counselor/schedule" className={designSystem.components.button.secondary}>
              일정 확인하기
            </Link>
          </div>
        </div>
      </div>
    </CounselorLayout>
  )
}