import { ReactNode } from 'react'
import CounselorSidebar from '@/components/shared/CounselorSidebar'
import { designSystem } from '@/lib/design-system'

interface CounselorLayoutProps {
  children: ReactNode
  className?: string
}

export default function CounselorLayout({ children, className }: CounselorLayoutProps) {
  return (
    <div className={designSystem.components.layout.page}>
      <div className="flex min-h-screen">
        <CounselorSidebar />
        <main className={designSystem.utils.cn('flex-1 p-8', className)}>
          <div className="max-w-6xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}