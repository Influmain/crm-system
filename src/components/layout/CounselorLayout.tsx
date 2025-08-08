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
      <CounselorSidebar />
      <main className={designSystem.utils.cn('ml-72 p-8', className)}>
        <div className="max-w-6xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  )
}