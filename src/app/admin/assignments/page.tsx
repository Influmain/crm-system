import AdminLayout from '@/components/layout/AdminLayout'
import { designSystem } from '@/lib/design-system'

export default function AdminAssignments() {
  return (
    <AdminLayout>
      <div className="mb-8">
        <h1 className={designSystem.components.typography.h2}>배정 관리</h1>
        <p className={designSystem.components.typography.bodySm}>리드와 상담사 배정을 관리하고 최적화하세요</p>
      </div>
      
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="w-24 h-24 bg-bg-tertiary rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className={designSystem.utils.cn('w-12 h-12', designSystem.colors.text.tertiary)} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <h3 className={designSystem.utils.cn(designSystem.components.typography.h4, 'mb-4')}>배정 관리 기능 개발 예정</h3>
          <p className={designSystem.components.typography.bodySm}>곧 출시될 예정입니다.</p>
        </div>
      </div>
    </AdminLayout>
  )
}