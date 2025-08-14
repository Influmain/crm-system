'use client'

import Link from 'next/link'
import { useTheme } from '@/hooks/useTheme'
import { designSystem } from '@/lib/design-system'
import { useAuth } from '@/lib/auth/AuthContext'
import { useToastHelpers } from '@/components/ui/Toast'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import LoginModal from '@/components/auth/LoginModal'
import { LogIn, Sun, Moon, BarChart3, Upload, Users, Shield, Bell } from 'lucide-react'

export default function HomePage() {
  const { isDark, toggle: toggleTheme } = useTheme()
  const { user, profile, loading } = useAuth()
  const toast = useToastHelpers()
  const router = useRouter()
  
  const [mounted, setMounted] = useState(false)
  const [showLoginModal, setShowLoginModal] = useState(false)

  useEffect(() => {
    setMounted(true)
    
    // 캐시 버전 관리 (무한 로딩 방지)
    const handleCacheManagement = () => {
      const CACHE_VERSION = 'crm-v1.1.0'
      const storedVersion = localStorage.getItem('crm_cache_version')
      
      if (storedVersion !== CACHE_VERSION) {
        console.log('캐시 버전 업데이트:', storedVersion, '→', CACHE_VERSION)
        try {
          localStorage.clear()
          sessionStorage.clear()
          localStorage.setItem('crm_cache_version', CACHE_VERSION)
        } catch (error) {
          console.warn('캐시 정리 중 오류:', error)
        }
      }
    }

    handleCacheManagement()
  }, [])

  // 로딩 중이거나 아직 마운트되지 않은 경우
  if (!mounted || loading) {
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-text-secondary">CRM 시스템 로딩 중...</p>
        </div>
      </div>
    )
  }

  const handleLoginSuccess = (user: any, profile: any) => {
    console.log('로그인 성공:', user.email, profile.role)
    // LoginModal에서 이미 리다이렉트 처리됨
  }

  const activeProfile = profile

  return (
    <div className={designSystem.components.layout.page}>
      <main className="min-h-screen">
        {/* 상단 헤더 */}
        <header className="flex items-center justify-between p-8">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-12 h-12 bg-accent rounded-xl flex items-center justify-center shadow-lg">
              <BarChart3 className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className={designSystem.components.typography.h4}>
                CRM System
              </h1>
              <p className={designSystem.components.typography.caption}>
                리드 관리 솔루션
              </p>
            </div>
          </Link>
          
          <div className="flex items-center gap-4">
            {/* 로그인 상태 표시 */}
            {user ? (
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-sm font-medium text-text-primary">
                    {activeProfile?.full_name || user.email}
                  </div>
                  <div className="text-xs text-text-secondary">
                    {activeProfile?.role === 'admin' ? '관리자' : '상담원'}
                  </div>
                </div>
                <button
                  onClick={() => {
                    const dashboardPath = activeProfile?.role === 'admin' ? '/admin/dashboard' : '/counselor/dashboard'
                    router.push(dashboardPath)
                  }}
                  className={designSystem.utils.cn(designSystem.components.button.primary, 'text-sm py-2 px-4')}
                >
                  대시보드로 이동
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowLoginModal(true)}
                className={designSystem.utils.cn(designSystem.components.button.primary, 'text-sm py-2 px-4 flex items-center gap-2')}
              >
                <LogIn className="w-4 h-4" />
                로그인
              </button>
            )}
            
            {/* 테마 토글 */}
            <button
              onClick={toggleTheme}
              className={designSystem.utils.cn(
                'w-12 h-12 rounded-xl flex items-center justify-center transition-colors',
                'bg-bg-tertiary hover:bg-bg-hover text-text-secondary'
              )}
              title={isDark ? '라이트 모드로 전환' : '다크 모드로 전환'}
            >
              {isDark ? (
                <Sun className="w-6 h-6" />
              ) : (
                <Moon className="w-6 h-6" />
              )}
            </button>
          </div>
        </header>

        <div className="px-8">
          {/* 히어로 섹션 */}
          <section className="text-center py-20 max-w-6xl mx-auto">
            <div className="max-w-4xl mx-auto">
              <h2 className={designSystem.utils.cn(designSystem.components.typography.h1, 'mb-8 leading-tight')}>
                리드 관리부터 상담까지
                <br />
                <span className="text-accent">하나의 플랫폼으로</span>
              </h2>
              
              <p className={designSystem.utils.cn(designSystem.components.typography.bodyLg, 'mb-12 max-w-2xl mx-auto leading-relaxed')}>
                Excel 파일 업로드, 상담사 배정, 진행 상황 추적까지 
                리드 관리 업무를 효율적으로 처리할 수 있습니다.
              </p>
              
              {/* 로그인 상태에 따른 CTA 버튼 */}
              {user ? (
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-20">
                  <button 
                    onClick={() => {
                      const dashboardPath = activeProfile?.role === 'admin' ? '/admin/dashboard' : '/counselor/dashboard'
                      router.push(dashboardPath)
                    }}
                    className={designSystem.utils.cn(designSystem.components.button.primary, designSystem.components.button.lg, 'min-w-48')}
                  >
                    내 대시보드로 이동
                    <BarChart3 className="w-5 h-5 ml-2" />
                  </button>
                  {activeProfile?.role === 'admin' && (
                    <button 
                      onClick={() => router.push('/admin/upload')}
                      className={designSystem.utils.cn(designSystem.components.button.secondary, designSystem.components.button.lg, 'min-w-48')}
                    >
                      데이터 업로드
                      <Upload className="w-5 h-5 ml-2" />
                    </button>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center gap-6 mb-20">
                  <button
                    onClick={() => setShowLoginModal(true)}
                    className={designSystem.utils.cn(
                      designSystem.components.button.primary, 
                      designSystem.components.button.lg,
                      'text-lg px-8 py-4 shadow-lg hover:shadow-xl transition-all hover:scale-[1.02] active:scale-[0.98]'
                    )}
                  >
                    🚀 시작하기
                    <LogIn className="w-5 h-5 ml-2" />
                  </button>
                  
                  <div className="text-center">
                    <p className={designSystem.components.typography.bodySm}>
                      💡 테스트 계정으로 바로 체험 가능
                    </p>
                  </div>
                </div>
              )}

              {/* 상태 표시 */}
              <div className="flex items-center justify-center gap-8 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-success animate-pulse"></div>
                  <span className="text-text-secondary">서비스 운영 중</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-accent"></div>
                  <span className="text-text-secondary">실시간 동기화</span>
                </div>
              </div>
            </div>
          </section>

          {/* 주요 기능 - 로그인하지 않은 경우에만 표시 */}
          {!user && (
            <section className="py-20 max-w-6xl mx-auto">
              <div className="text-center mb-16">
                <h3 className={designSystem.utils.cn(designSystem.components.typography.h2, 'mb-4')}>
                  주요 기능
                </h3>
                <p className={designSystem.components.typography.bodySm}>
                  리드 관리에 필요한 모든 기능을 제공합니다
                </p>
              </div>
              
              <div className={designSystem.utils.cn(designSystem.components.grid.base, 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8')}>
                {[
                  {
                    icon: Upload,
                    title: '데이터 업로드',
                    description: 'Excel, CSV 파일로 리드 데이터를 한번에 업로드',
                    color: 'text-accent'
                  },
                  {
                    icon: Users,
                    title: '상담사 배정',
                    description: '리드별 최적의 상담사를 자동 또는 수동 배정',
                    color: 'text-success'
                  },
                  {
                    icon: BarChart3,
                    title: '실시간 모니터링',
                    description: '상담 진행 상황과 성과를 실시간으로 확인',
                    color: 'text-warning'
                  },
                  {
                    icon: Bell,
                    title: '알림 시스템',
                    description: '중요한 일정과 업무를 놓치지 않도록 알림',
                    color: 'text-info'
                  }
                ].map((feature, index) => (
                  <div key={index} className={designSystem.utils.cn(designSystem.components.card.base, designSystem.components.card.content, 'text-center group hover:shadow-lg transition-all hover:-translate-y-1')}>
                    <div className={designSystem.utils.cn('w-16 h-16 mx-auto mb-6 rounded-2xl flex items-center justify-center bg-bg-secondary group-hover:scale-110 transition-transform duration-300')}>
                      <feature.icon className={`w-8 h-8 ${feature.color}`} />
                    </div>
                    <h4 className={designSystem.utils.cn(designSystem.components.typography.h5, 'mb-4')}>
                      {feature.title}
                    </h4>
                    <p className={designSystem.components.typography.bodySm}>
                      {feature.description}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* 로그인된 사용자를 위한 바로가기 섹션 */}
          {user && (
            <section className="py-20 max-w-6xl mx-auto">
              <div className="text-center mb-12">
                <h3 className={designSystem.utils.cn(designSystem.components.typography.h3, 'mb-4')}>
                  빠른 접근
                </h3>
                <p className={designSystem.components.typography.bodySm}>
                  자주 사용하는 기능들에 빠르게 접근하세요
                </p>
              </div>
              
              <div className={designSystem.utils.cn(designSystem.components.grid.base, 'grid-cols-1 md:grid-cols-3 max-w-4xl mx-auto gap-6')}>
                {activeProfile?.role === 'admin' ? (
                  <>
                    <button onClick={() => router.push('/admin/upload')} className={designSystem.utils.cn(designSystem.components.card.interactive, designSystem.components.card.content, 'group text-center')}>
                      <div className={designSystem.utils.cn('w-12 h-12 mx-auto mb-4 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 bg-accent/10')}>
                        <Upload className="w-6 h-6 text-accent" />
                      </div>
                      <h4 className={designSystem.components.typography.h6}>데이터 업로드</h4>
                    </button>
                    <button onClick={() => router.push('/admin/assignments')} className={designSystem.utils.cn(designSystem.components.card.interactive, designSystem.components.card.content, 'group text-center')}>
                      <div className={designSystem.utils.cn('w-12 h-12 mx-auto mb-4 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 bg-success/10')}>
                        <Users className="w-6 h-6 text-success" />
                      </div>
                      <h4 className={designSystem.components.typography.h6}>리드 배정</h4>
                    </button>
                    <button onClick={() => router.push('/admin/counselors')} className={designSystem.utils.cn(designSystem.components.card.interactive, designSystem.components.card.content, 'group text-center')}>
                      <div className={designSystem.utils.cn('w-12 h-12 mx-auto mb-4 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 bg-warning/10')}>
                        <Shield className="w-6 h-6 text-warning" />
                      </div>
                      <h4 className={designSystem.components.typography.h6}>상담사 관리</h4>
                    </button>
                  </>
                ) : (
                  <>
                    <button onClick={() => router.push('/counselor/dashboard')} className={designSystem.utils.cn(designSystem.components.card.interactive, designSystem.components.card.content, 'group text-center')}>
                      <div className={designSystem.utils.cn('w-12 h-12 mx-auto mb-4 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 bg-accent/10')}>
                        <BarChart3 className="w-6 h-6 text-accent" />
                      </div>
                      <h4 className={designSystem.components.typography.h6}>내 대시보드</h4>
                    </button>
                    <button onClick={() => router.push('/counselor/leads')} className={designSystem.utils.cn(designSystem.components.card.interactive, designSystem.components.card.content, 'group text-center')}>
                      <div className={designSystem.utils.cn('w-12 h-12 mx-auto mb-4 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300 bg-success/10')}>
                        <Users className="w-6 h-6 text-success" />
                      </div>
                      <h4 className={designSystem.components.typography.h6}>담당 고객</h4>
                    </button>
                  </>
                )}
              </div>
            </section>
          )}

          {/* 현재 상황 - 로그인하지 않은 경우에만 표시 */}
          {!user && (
            <section className="py-20 max-w-6xl mx-auto">
              <div className={designSystem.utils.cn(designSystem.components.card.secondary, designSystem.components.card.contentLg)}>
                <div className="text-center mb-12">
                  <h3 className={designSystem.utils.cn(designSystem.components.typography.h3, 'mb-4')}>
                    💡 시스템 현황
                  </h3>
                  <p className={designSystem.components.typography.bodySm}>
                    개발 완료된 기능들과 사용 가능한 서비스
                  </p>
                </div>
                
                <div className={designSystem.utils.cn(designSystem.components.grid.base, 'grid-cols-1 md:grid-cols-3 gap-8')}>
                  <div className="text-center">
                    <div className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6 bg-success/10">
                      <Shield className="w-10 h-10 text-success" />
                    </div>
                    <h4 className={designSystem.utils.cn(designSystem.components.typography.h5, 'mb-3')}>
                      기본 시스템
                    </h4>
                    <p className={designSystem.utils.cn(designSystem.components.typography.bodySm, 'mb-4')}>
                      인증, 페이지, 디자인 완성
                    </p>
                    <span className="px-3 py-1 text-xs rounded-full bg-success/20 text-success">완료</span>
                  </div>
                  
                  <div className="text-center">
                    <div className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6 bg-success/10">
                      <BarChart3 className="w-10 h-10 text-success" />
                    </div>
                    <h4 className={designSystem.utils.cn(designSystem.components.typography.h5, 'mb-3')}>
                      핵심 기능
                    </h4>
                    <p className={designSystem.utils.cn(designSystem.components.typography.bodySm, 'mb-4')}>
                      업로드, 배정, 관리 기능 완성
                    </p>
                    <span className="px-3 py-1 text-xs rounded-full bg-success/20 text-success">완료</span>
                  </div>
                  
                  <div className="text-center">
                    <div className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6 bg-warning/10">
                      <Bell className="w-10 h-10 text-warning" />
                    </div>
                    <h4 className={designSystem.utils.cn(designSystem.components.typography.h5, 'mb-3')}>
                      고급 기능
                    </h4>
                    <p className={designSystem.utils.cn(designSystem.components.typography.bodySm, 'mb-4')}>
                      상담 기록, 분석 등 개발 중
                    </p>
                    <span className="px-3 py-1 text-xs rounded-full bg-warning/20 text-warning">진행 중</span>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* 테스트 계정 안내 - 로그인하지 않은 경우만 */}
          {!user && (
            <section className="py-20 max-w-6xl mx-auto">
              <div className="text-center mb-12">
                <h3 className={designSystem.utils.cn(designSystem.components.typography.h3, 'mb-4')}>
                  🔐 테스트 계정으로 체험
                </h3>
                <p className={designSystem.components.typography.bodySm}>
                  준비된 테스트 계정으로 시스템을 바로 체험해보세요
                </p>
              </div>
              
              <div className={designSystem.utils.cn(designSystem.components.grid.base, 'grid-cols-1 md:grid-cols-2 max-w-4xl mx-auto gap-8')}>
                <div className={designSystem.utils.cn(designSystem.components.card.base, designSystem.components.card.contentLg)}>
                  <div className="flex items-center gap-6">
                    <div className="w-16 h-16 rounded-2xl flex items-center justify-center bg-accent/10">
                      <Shield className="w-8 h-8 text-accent" />
                    </div>
                    <div className="flex-1">
                      <h4 className={designSystem.utils.cn(designSystem.components.typography.h5, 'mb-2')}>
                        관리자 계정
                      </h4>
                      <p className={designSystem.components.typography.bodySm}>
                        <code className="px-2 py-1 bg-bg-secondary rounded text-text-primary">admin@company.com</code>
                      </p>
                      <p className={designSystem.components.typography.bodySm}>
                        전체 시스템 관리, 데이터 업로드, 상담사 관리
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className={designSystem.utils.cn(designSystem.components.card.base, designSystem.components.card.contentLg)}>
                  <div className="flex items-center gap-6">
                    <div className="w-16 h-16 rounded-2xl flex items-center justify-center bg-success/10">
                      <Users className="w-8 h-8 text-success" />
                    </div>
                    <div className="flex-1">
                      <h4 className={designSystem.utils.cn(designSystem.components.typography.h5, 'mb-2')}>
                        상담사 계정
                      </h4>
                      <p className={designSystem.components.typography.bodySm}>
                        <code className="px-2 py-1 bg-bg-secondary rounded text-text-primary">counselor1@company.com</code>
                      </p>
                      <p className={designSystem.components.typography.bodySm}>
                        담당 리드 관리, 상담 일정, 진행 상황 업데이트
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="text-center mt-8">
                <button 
                  onClick={() => setShowLoginModal(true)}
                  className={designSystem.utils.cn(designSystem.components.button.primary, designSystem.components.button.lg)}
                >
                  🔐 지금 바로 체험하기
                  <LogIn className="w-5 h-5 ml-2" />
                </button>
              </div>
            </section>
          )}
        </div>

        {/* 푸터 */}
        <footer className="border-t border-border-primary mt-20">
          <div className="max-w-6xl mx-auto px-8 py-12 text-center">
            <p className={designSystem.components.typography.bodySm}>
              © 2025 CRM Lead Management System
            </p>
          </div>
        </footer>
      </main>

      {/* 로그인 모달 */}
      <LoginModal 
        isOpen={showLoginModal} 
        onClose={() => setShowLoginModal(false)}
        onSuccess={handleLoginSuccess}
      />
    </div>
  )
}