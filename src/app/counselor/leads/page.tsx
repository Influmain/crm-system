import CounselorLayout from '@/components/layout/CounselorLayout'
import { designSystem } from '@/lib/design-system'

export default function CounselorLeads() {
  return (
    <CounselorLayout>
      {/* 페이지 헤더 */}
      <div className="mb-8">
        <h1 className={designSystem.components.typography.h2}>내 리드</h1>
        <p className={designSystem.components.typography.bodySm}>담당 리드 목록을 관리하세요</p>
      </div>
      
      {/* 임시 콘텐츠 */}
      <div className={designSystem.utils.cn(designSystem.components.card.base, designSystem.components.card.content)}>
        <h3 className={designSystem.utils.cn(designSystem.components.typography.h4, 'mb-4')}>
          리드 목록 기능 개발 예정
        </h3>
        <p className={designSystem.components.typography.bodySm}>
          이곳에 담당 리드 목록, 상태 관리, 상담 일정 등의 기능이 추가될 예정입니다.
        </p>
      </div>
    </CounselorLayout>
  )
}