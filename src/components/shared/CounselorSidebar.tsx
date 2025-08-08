'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { useTheme } from '@/hooks/useTheme'
import { designSystem } from '@/lib/design-system'
import { businessIcons } from '@/lib/design-system/icons'
import { 
  User, 
  LogOut, 
  ChevronRight,
  Bell,
  Sun,
  Moon,
  BarChart3
} from 'lucide-react'

interface CounselorSidebarProps {
  className?: string
}

export default function CounselorSidebar({ className }: CounselorSidebarProps) {
  const { isDark, toggle: toggleTheme } = useTheme()
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const pathname = usePathname()

  // ✅ businessIcons 시스템 활용한 상담사 네비게이션 메뉴
  const navigationItems = [
    {
      href: '/counselor/dashboard',
      label: '대시보드',
      icon: businessIcons.dashboard
    },
    {
      href: '/counselor/leads',
      label: '내 리드',
      badge: '12',
      badgeType: 'warning',
      icon: businessIcons.contact
    },
    {
      href: '/counselor/schedule',
      label: '일정 관리',
      badge: '3',
      badgeType: 'error',
      icon: businessIcons.date
    },
    {
      href: '/counselor/records',
      label: '상담 기록',
      icon: businessIcons.script
    },
    {
      href: '/counselor/analytics',
      label: '성과 분석',
      icon: businessIcons.analytics
    }
  ]

  // 현재 경로가 활성 상태인지 확인
  const isActiveRoute = (href: string) => {
    return pathname === href || pathname?.startsWith(href + '/')
  }

  // 배지 컴포넌트 렌더링
  const renderBadge = (badge?: string, badgeType?: string) => {
    if (!badge) return null
    
    const badgeClass = badgeType === 'error' 
      ? designSystem.components.badge.error
      : badgeType === 'warning' 
      ? designSystem.components.badge.warning
      : designSystem.components.badge.info
    
    return <span className={badgeClass}>{badge}</span>
  }

  return (
    <aside className={designSystem.utils.cn('w-72 bg-bg-secondary border-r border-border-primary flex-shrink-0 h-screen fixed left-0 top-0 flex flex-col', className)}>
      {/* 로고 섹션 */}
      <div className="p-6 border-b border-border-primary flex-shrink-0">
        <Link href="/" className="flex items-center gap-3">
          <div className="w-10 h-10 bg-accent rounded-lg flex items-center justify-center shadow-sm">
            <BarChart3 className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className={designSystem.components.typography.h5}>
              상담사 대시보드
            </h1>
            <p className={designSystem.components.typography.caption}>
              내 업무 관리
            </p>
          </div>
        </Link>
      </div>

      {/* 네비게이션 섹션 (스크롤 가능) */}
      <nav className="flex-1 p-6 overflow-y-auto">
        <div className="space-y-2">
          {navigationItems.map((item) => {
            const isActive = isActiveRoute(item.href)
            const IconComponent = item.icon
            
            return (
              <Link 
                key={item.href}
                href={item.href} 
                className={designSystem.utils.cn(
                  'flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors',
                  isActive 
                    ? designSystem.colors.accent.default
                    : designSystem.utils.cn(designSystem.colors.text.secondary, 'hover:bg-bg-hover hover:text-text-primary')
                )}
              >
                <IconComponent className="w-5 h-5" />
                <span className="flex-1">{item.label}</span>
                {renderBadge(item.badge, item.badgeType)}
              </Link>
            )
          })}
        </div>
      </nav>

      {/* 하단 프로필 & 설정 섹션 (고정) */}
      <div className="p-6 border-t border-border-primary space-y-3 flex-shrink-0">
        {/* 알림 */}
        <button className={designSystem.utils.cn('flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors w-full', designSystem.colors.text.secondary, 'hover:bg-bg-hover hover:text-text-primary')}>
          <div className="relative">
            <Bell className="w-5 h-5" />
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-error rounded-full"></span>
          </div>
          <span className="flex-1 text-left">알림</span>
          <span className="text-xs bg-error text-white px-2 py-0.5 rounded-full min-w-[20px] text-center">2</span>
        </button>

        {/* 프로필 메뉴 */}
        <div className="relative">
          {/* 프로필 버튼 */}
          <button 
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className={designSystem.utils.cn('flex items-center gap-3 px-3 py-3 rounded-lg transition-colors w-full', designSystem.colors.text.secondary, 'hover:bg-bg-hover', isProfileOpen && 'bg-bg-hover')}
          >
            <div className="w-10 h-10 bg-bg-tertiary rounded-full flex items-center justify-center">
              <User className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0 text-left">
              <div className={designSystem.utils.cn('text-sm font-medium truncate', designSystem.colors.text.primary)}>김상담</div>
              <div className={designSystem.utils.cn('text-xs', designSystem.colors.text.tertiary)}>상담사</div>
            </div>
            <ChevronRight 
              className={designSystem.utils.cn('w-4 h-4 flex-shrink-0 transition-transform', isProfileOpen && 'rotate-90')} 
            />
          </button>

          {/* 드롭다운 메뉴 */}
          {isProfileOpen && (
            <div className={designSystem.utils.cn('mt-2 py-2 space-y-1', designSystem.components.animation.slideUp)}>
              {/* 프로필 보기 */}
              <Link 
                href="/counselor/profile" 
                className={designSystem.utils.cn('flex items-center gap-3 px-6 py-2 text-sm transition-colors', designSystem.colors.text.secondary, 'hover:bg-bg-hover hover:text-text-primary')}
                onClick={() => setIsProfileOpen(false)}
              >
                <User className="w-4 h-4" />
                내 프로필
              </Link>

              {/* 테마 토글 */}
              <button
                onClick={() => {
                  toggleTheme()
                  setIsProfileOpen(false)
                }}
                className={designSystem.utils.cn('flex items-center gap-3 px-6 py-2 text-sm transition-colors w-full text-left', designSystem.colors.text.secondary, 'hover:bg-bg-hover hover:text-text-primary')}
              >
                {isDark ? (
                  <Sun className="w-4 h-4" />
                ) : (
                  <Moon className="w-4 h-4" />
                )}
                {isDark ? '라이트 모드' : '다크 모드'}
              </button>

              {/* 설정 */}
              <button 
                className={designSystem.utils.cn('flex items-center gap-3 px-6 py-2 text-sm transition-colors w-full text-left', designSystem.colors.text.secondary, 'hover:bg-bg-hover hover:text-text-primary')}
                onClick={() => setIsProfileOpen(false)}
              >
                <businessIcons.settings className="w-4 h-4" />
                설정
              </button>

              {/* 구분선 */}
              <div className="mx-6 border-t border-border-primary my-2"></div>

              {/* 로그아웃 */}
              <button 
                className={designSystem.utils.cn('flex items-center gap-3 px-6 py-2 text-sm transition-colors w-full text-left', designSystem.colors.status.error.text, 'hover:bg-bg-hover')}
                onClick={() => setIsProfileOpen(false)}
              >
                <LogOut className="w-4 h-4" />
                로그아웃
              </button>
            </div>
          )}
        </div>
      </div>
    </aside>
  )
}