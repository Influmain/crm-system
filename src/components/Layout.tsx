'use client'

import { ReactNode, useState, useEffect } from 'react'
import { 
  Home, 
  Upload, 
  Users, 
  UserPlus, 
  BarChart3, 
  Settings,
  ChevronLeft,
  ChevronRight,
  Database,
  Phone,
  CheckCircle2,
  Moon,
  Sun
} from 'lucide-react'

interface LayoutProps {
  children: ReactNode
  currentPage?: string
  userRole?: 'admin' | 'consultant'
}

const menuGroups = [
  {
    title: '대시보드',
    items: [
      {
        id: 'dashboard',
        label: '홈',
        emoji: '🏠',
        href: '/dashboard',
        roles: ['admin', 'consultant']
      }
    ]
  },
  {
    title: '리드 관리',
    items: [
      {
        id: 'upload',
        label: '리드 업로드',
        emoji: '📊',
        href: '/',
        roles: ['admin'] // 관리자만
      },
      {
        id: 'leads',
        label: '리드 관리',
        emoji: '📞',
        href: '/leads',
        roles: ['admin']
      },
      {
        id: 'my-leads',
        label: '내 리드',
        emoji: '📋',
        href: '/my-leads',
        roles: ['consultant'] // 상담원만
      },
      {
        id: 'assign',
        label: '리드 배분',
        emoji: '🎯',
        href: '/assign',
        roles: ['admin']
      }
    ]
  },
  {
    title: '상담 관리',
    items: [
      {
        id: 'consultations',
        label: '상담 기록',
        emoji: '📝',
        href: '/consultations',
        roles: ['admin', 'consultant']
      },
      {
        id: 'follow-up',
        label: '후속 관리',
        emoji: '🔄',
        href: '/follow-up',
        roles: ['admin', 'consultant']
      }
    ]
  },
  {
    title: '사용자 관리',
    items: [
      {
        id: 'consultants',
        label: '상담원 관리',
        emoji: '👥',
        href: '/consultants',
        roles: ['admin'] // 관리자만
      },
      {
        id: 'profile',
        label: '내 프로필',
        emoji: '👤',
        href: '/profile',
        roles: ['consultant'] // 상담원만
      }
    ]
  },
  {
    title: '분석 및 통계',
    items: [
      {
        id: 'analytics',
        label: '전체 통계',
        emoji: '📈',
        href: '/analytics',
        roles: ['admin']
      },
      {
        id: 'my-stats',
        label: '내 성과',
        emoji: '📊',
        href: '/my-stats',
        roles: ['consultant']
      }
    ]
  },
  {
    title: '시스템',
    items: [
      {
        id: 'settings',
        label: '설정',
        emoji: '⚙️',
        href: '/settings',
        roles: ['admin', 'consultant']
      }
    ]
  }
]

export default function Layout({ 
  children, 
  currentPage = 'upload', 
  userRole = 'admin'
}: LayoutProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [currentUserRole, setCurrentUserRole] = useState<'admin' | 'consultant'>(userRole)
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [isDarkMode, setIsDarkMode] = useState(false)

  // 컴포넌트 마운트 시 로컬 스토리지에서 테마 설정 로드
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme')
      if (saved) {
        setIsDarkMode(saved === 'dark')
      } else {
        // 시스템 테마 자동 감지
        setIsDarkMode(window.matchMedia('(prefers-color-scheme: dark)').matches)
      }
    }
  }, [])

  // 테마 색상 정의
  const theme = {
    light: {
      bg: '#FAFAFA',
      sidebarBg: '#FFFFFF',
      border: '#E5E5E5',
      textPrimary: '#2F2F2F',
      textSecondary: '#9B9A97',
      textMuted: '#6B7280',
      hover: '#F5F5F5',
      active: '#F0F0F0',
      groupBg: '#F7F6F3'
    },
    dark: {
      bg: '#191919',
      sidebarBg: '#2F2F2F',
      border: '#3A3A3A',
      textPrimary: '#E5E5E5',
      textSecondary: '#9B9B9B',
      textMuted: '#7A7A7A',
      hover: '#373737',
      active: '#404040',
      groupBg: '#333333'
    }
  }

  const currentTheme = isDarkMode ? theme.dark : theme.light

  const handleThemeToggle = () => {
    const newDarkMode = !isDarkMode
    setIsDarkMode(newDarkMode)
    if (typeof window !== 'undefined') {
      localStorage.setItem('theme', newDarkMode ? 'dark' : 'light')
    }
  }

  const handleMenuClick = (href: string) => {
    if (typeof window !== 'undefined') {
      window.location.href = href
    }
  }

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: currentTheme.bg }}>
      {/* 사이드바 */}
      <div 
        className={`border-r transition-all duration-300 flex flex-col ${
          isCollapsed ? 'w-16' : 'w-64'
        }`}
        style={{ 
          backgroundColor: currentTheme.sidebarBg,
          borderColor: currentTheme.border,
          minHeight: '100vh' 
        }}
      >
        {/* 상단 로고/제목 */}
        <div className="p-4" style={{ borderBottom: `1px solid ${currentTheme.border}` }}>
          <div className="flex items-center justify-between">
            {!isCollapsed && (
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-black rounded-md flex items-center justify-center">
                  <span className="text-white text-sm font-bold">CRM</span>
                </div>
                <div>
                  <h1 className="text-sm font-semibold" style={{ color: currentTheme.textPrimary }}>
                    Lead 관리 시스템
                  </h1>
                </div>
              </div>
            )}
            <div className="flex items-center gap-2">
              {/* 다크모드 토글 */}
              <button
                onClick={handleThemeToggle}
                className="p-1.5 rounded-md transition-colors"
                style={{ backgroundColor: 'transparent' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = currentTheme.hover}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                title={isDarkMode ? '라이트 모드로 전환' : '다크 모드로 전환'}
              >
                {isDarkMode ? (
                  <Sun size={16} style={{ color: currentTheme.textSecondary }} />
                ) : (
                  <Moon size={16} style={{ color: currentTheme.textSecondary }} />
                )}
              </button>
              
              {/* 사이드바 접기 버튼 */}
              <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="p-1.5 rounded-md transition-colors"
                style={{ backgroundColor: 'transparent' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = currentTheme.hover}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                {isCollapsed ? (
                  <ChevronRight size={16} style={{ color: currentTheme.textSecondary }} />
                ) : (
                  <ChevronLeft size={16} style={{ color: currentTheme.textSecondary }} />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* 메뉴 리스트 */}
        <div className="flex-1 p-3">
          <div className="space-y-6">
            {menuGroups.map((group) => {
              // 현재 역할에 맞는 메뉴 아이템만 필터링
              const visibleItems = group.items.filter(item => 
                item.roles.includes(currentUserRole)
              )

              // 보여줄 메뉴가 없으면 그룹 전체 숨김
              if (visibleItems.length === 0) return null

              return (
                <div key={group.title}>
                  {/* 그룹 제목 */}
                  {!isCollapsed && (
                    <div className="px-3 mb-2">
                      <h3 className="text-xs font-medium uppercase tracking-wider" 
                          style={{ color: currentTheme.textSecondary }}>
                        {group.title}
                      </h3>
                    </div>
                  )}
                  
                  {/* 그룹 메뉴들 */}
                  <div className="space-y-1">
                    {visibleItems.map((item) => {
                      const isActive = item.id === currentPage

                      return (
                        <button
                          key={item.id}
                          onClick={() => handleMenuClick(item.href)}
                          className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-left transition-colors`}
                          style={{
                            backgroundColor: isActive ? currentTheme.active : 'transparent'
                          }}
                          onMouseEnter={(e) => {
                            if (!isActive) e.currentTarget.style.backgroundColor = currentTheme.hover
                          }}
                          onMouseLeave={(e) => {
                            if (!isActive) e.currentTarget.style.backgroundColor = 'transparent'
                          }}
                          title={isCollapsed ? item.label : undefined}
                        >
                          <span className="text-sm">{item.emoji}</span>
                          {!isCollapsed && (
                            <span 
                              className={`text-sm ${
                                isActive ? 'font-medium' : 'font-normal'
                              }`}
                              style={{ 
                                color: isActive ? currentTheme.textPrimary : currentTheme.textMuted
                              }}
                            >
                              {item.label}
                            </span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* 하단 사용자 정보 */}
        {!isCollapsed && (
          <div className="p-4 relative" style={{ borderTop: `1px solid ${currentTheme.border}` }}>
            {/* 프로필 클릭 영역 */}
            <button
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className="w-full flex items-center gap-3 p-2 rounded-md transition-colors"
              style={{ backgroundColor: 'transparent' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = currentTheme.hover}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${
                currentUserRole === 'admin' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
              }`}>
                {currentUserRole === 'admin' ? '👑' : '👤'}
              </div>
              <div className="flex-1 text-left">
                <div className="text-sm font-medium" style={{ color: currentTheme.textPrimary }}>
                  {currentUserRole === 'admin' ? '관리자' : '상담원'}
                </div>
                <div className="text-xs" style={{ color: currentTheme.textSecondary }}>
                  {currentUserRole === 'admin' ? 'admin@crm.com' : 'consultant@crm.com'}
                </div>
              </div>
              <ChevronRight 
                size={16} 
                className={`transform transition-transform ${isProfileOpen ? 'rotate-90' : ''}`}
                style={{ color: currentTheme.textSecondary }} 
              />
            </button>

            {/* 드롭다운 메뉴 */}
            {isProfileOpen && (
              <div 
                className="absolute bottom-full left-4 right-4 mb-2 rounded-md shadow-lg py-2 z-50"
                style={{ 
                  backgroundColor: currentTheme.sidebarBg,
                  border: `1px solid ${currentTheme.border}`
                }}
              >
                <div className="px-3 py-1 text-xs font-medium uppercase tracking-wider mb-2" 
                     style={{ 
                       color: currentTheme.textSecondary,
                       borderBottom: `1px solid ${currentTheme.border}`
                     }}>
                  역할 전환 (개발용)
                </div>
                
                <button
                  onClick={() => {
                    setCurrentUserRole('admin')
                    setIsProfileOpen(false)
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2 text-left transition-colors ${
                    currentUserRole === 'admin' ? 'bg-blue-50' : ''
                  }`}
                  style={{ backgroundColor: currentUserRole === 'admin' ? currentTheme.active : 'transparent' }}
                  onMouseEnter={(e) => {
                    if (currentUserRole !== 'admin') e.currentTarget.style.backgroundColor = currentTheme.hover
                  }}
                  onMouseLeave={(e) => {
                    if (currentUserRole !== 'admin') e.currentTarget.style.backgroundColor = 'transparent'
                  }}
                >
                  <div className="w-6 h-6 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-xs">
                    👑
                  </div>
                  <div>
                    <div className="text-sm font-medium" style={{ color: currentTheme.textPrimary }}>
                      관리자로 전환
                    </div>
                    <div className="text-xs" style={{ color: currentTheme.textSecondary }}>
                      모든 메뉴 접근 가능
                    </div>
                  </div>
                  {currentUserRole === 'admin' && (
                    <CheckCircle2 size={16} className="text-blue-600" />
                  )}
                </button>

                <button
                  onClick={() => {
                    setCurrentUserRole('consultant')
                    setIsProfileOpen(false)
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2 text-left transition-colors ${
                    currentUserRole === 'consultant' ? 'bg-green-50' : ''
                  }`}
                  style={{ backgroundColor: currentUserRole === 'consultant' ? currentTheme.active : 'transparent' }}
                  onMouseEnter={(e) => {
                    if (currentUserRole !== 'consultant') e.currentTarget.style.backgroundColor = currentTheme.hover
                  }}
                  onMouseLeave={(e) => {
                    if (currentUserRole !== 'consultant') e.currentTarget.style.backgroundColor = 'transparent'
                  }}
                >
                  <div className="w-6 h-6 bg-green-100 text-green-700 rounded-full flex items-center justify-center text-xs">
                    👤
                  </div>
                  <div>
                    <div className="text-sm font-medium" style={{ color: currentTheme.textPrimary }}>
                      상담원으로 전환
                    </div>
                    <div className="text-xs" style={{ color: currentTheme.textSecondary }}>
                      제한된 메뉴만 표시
                    </div>
                  </div>
                  {currentUserRole === 'consultant' && (
                    <CheckCircle2 size={16} className="text-green-600" />
                  )}
                </button>

                <div className="mt-2 pt-2" style={{ borderTop: `1px solid ${currentTheme.border}` }}>
                  <div className="px-3 py-1 text-xs" style={{ color: currentTheme.textSecondary }}>
                    CRM v1.0 • © 2025 Lead Management
                  </div>
                </div>
              </div>
            )}

            {/* 클릭 외부 영역 감지용 오버레이 */}
            {isProfileOpen && (
              <div 
                className="fixed inset-0 z-40"
                onClick={() => setIsProfileOpen(false)}
              />
            )}
          </div>
        )}
      </div>

      {/* 메인 컨텐츠 */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full overflow-auto">
          {children}
        </div>
      </div>
    </div>
  )
}