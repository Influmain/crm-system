import AdminLayout from '@/components/layout/AdminLayout'
import { designSystem } from '@/lib/design-system'

export default function AdminUpload() {
  return (
    <AdminLayout>
      {/* 페이지 헤더 */}
      <div className="mb-8">
        <h1 className={designSystem.components.typography.h2}>데이터 업로드</h1>
        <p className={designSystem.components.typography.bodySm}>Excel, CSV 파일을 업로드하여 리드 데이터를 관리하세요</p>
      </div>
      
      {/* 업로드 영역 */}
      <div className={designSystem.utils.cn(designSystem.components.card.base, designSystem.components.card.content)}>
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-accent-light rounded-2xl flex items-center justify-center mx-auto mb-6">
            <svg className={designSystem.utils.cn('w-8 h-8', designSystem.colors.accent.text)} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          </div>
          
          <h3 className={designSystem.utils.cn(designSystem.components.typography.h4, 'mb-4')}>
            파일 업로드 기능 개발 예정
          </h3>
          
          <p className={designSystem.utils.cn(designSystem.components.typography.bodySm, 'mb-6')}>
            Excel/CSV 파일 드래그 앤 드롭, 데이터 검증, 배정 옵션 등의 기능이 추가될 예정입니다.
          </p>
          
          <button className={designSystem.components.button.primary} disabled>
            파일 선택 (개발 중)
          </button>
        </div>
      </div>
    </AdminLayout>
  )
}