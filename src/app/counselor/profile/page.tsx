import CounselorLayout from '@/components/layout/CounselorLayout'
import { designSystem } from '@/lib/design-system'

export default function CounselorProfile() {
  return (
    <CounselorLayout>
      <div className="mb-8">
        <h1 className={designSystem.components.typography.h2}>페이지 제목</h1>
        <p className={designSystem.components.typography.bodySm}>페이지 설명</p>
      </div>
      
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="w-24 h-24 bg-bg-tertiary rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className={designSystem.utils.cn('w-12 h-12', designSystem.colors.text.tertiary)} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <h3 className={designSystem.utils.cn(designSystem.components.typography.h4, 'mb-4')}>기능 개발 예정</h3>
          <p className={designSystem.components.typography.bodySm}>곧 출시될 예정입니다.</p>
        </div>
      </div>
    </CounselorLayout>
  )
}