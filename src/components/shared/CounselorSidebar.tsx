'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { useTheme } from '@/hooks/useTheme'
import { designSystem } from '@/lib/design-system'

interface CounselorSidebarProps {
  className?: string
}

export default function CounselorSidebar({ className }: CounselorSidebarProps) {
  const { isDark, toggle: toggleTheme } = useTheme()
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const pathname = usePathname()

  // 네비게이션 메뉴 데이터
  const navigationItems = [
    {
      href: '/counselor/dashboard',
      label: '대시보드',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
        </svg>
      )
    },
    {
      href: '/counselor/leads',
      label: '내 리드',
      badge: '12',
      badgeType: 'warning',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      )
    },
    {
      href: '/counselor/schedule',
      label: '일정 관리',
      badge: '3',
      badgeType: 'error',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      )
    },
    {
      href: '/counselor/records',
      label: '상담 기록',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      )
    },
    {
      href: '/counselor/analytics',
      label: '성과 분석',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      )
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
    <aside className={designSystem.utils.cn('w-72 bg-bg-secondary border-r border-border-primary flex-shrink-0 flex flex-col', className)}>
      {/* 로고 섹션 */}
      <div className="p-6 border-b border-border-primary">
        <Link href="/" className="flex items-center gap-3">
          <div className="w-10 h-10 bg-accent rounded-lg flex items-center justify-center shadow-sm">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
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

      {/* 네비게이션 섹션 */}
      <nav className="flex-1 p-6">
        <div className="space-y-2">
          {navigationItems.map((item) => {
            const isActive = isActiveRoute(item.href)
            
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
                {item.icon}
                <span className="flex-1">{item.label}</span>
                {renderBadge(item.badge, item.badgeType)}
              </Link>
            )
          })}
        </div>
      </nav>

      {/* 하단 프로필 & 설정 섹션 */}
      <div className="p-6 border-t border-border-primary space-y-3">
        {/* 알림 */}
        <button className={designSystem.utils.cn('flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors w-full', designSystem.colors.text.secondary, 'hover:bg-bg-hover hover:text-text-primary')}>
          <div className="relative">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 3h-2a4 4 0 00-4 4v5l-2 2v1h16v-1l-2-2V7a4 4 0 00-4-4z" />
            </svg>
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
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0 text-left">
              <div className={designSystem.utils.cn('text-sm font-medium truncate', designSystem.colors.text.primary)}>김상담</div>
              <div className={designSystem.utils.cn('text-xs', designSystem.colors.text.tertiary)}>상담사</div>
            </div>
            <svg 
              className={designSystem.utils.cn('w-4 h-4 flex-shrink-0 transition-transform', isProfileOpen && 'rotate-90')} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
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
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
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
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                  </svg>
                )}
                {isDark ? '라이트 모드' : '다크 모드'}
              </button>

              {/* 설정 */}
              <button 
                className={designSystem.utils.cn('flex items-center gap-3 px-6 py-2 text-sm transition-colors w-full text-left', designSystem.colors.text.secondary, 'hover:bg-bg-hover hover:text-text-primary')}
                onClick={() => setIsProfileOpen(false)}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                설정
              </button>

              {/* 구분선 */}
              <div className="mx-6 border-t border-border-primary my-2"></div>

              {/* 로그아웃 */}
              <button 
                className={designSystem.utils.cn('flex items-center gap-3 px-6 py-2 text-sm transition-colors w-full text-left', designSystem.colors.status.error.text, 'hover:bg-bg-hover')}
                onClick={() => setIsProfileOpen(false)}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                로그아웃
              </button>
            </div>
          )}
        </div>
      </div>
    </aside>
  )
}