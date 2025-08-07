import { ReactNode } from 'react'
import AdminSidebar from '@/components/shared/AdminSidebar'
import { designSystem } from '@/lib/design-system'

interface AdminLayoutProps {
  children: ReactNode
  className?: string
}

export default function AdminLayout({ children, className }: AdminLayoutProps) {
  return (
    <div className={designSystem.components.layout.page}>
      <div className="flex min-h-screen">
        <AdminSidebar />
        <main className={designSystem.utils.cn('flex-1 p-8', className)}>
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}