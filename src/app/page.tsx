'use client'

import Link from 'next/link'
import { useTheme } from '@/hooks/useTheme'
import { designSystem } from '@/lib/design-system'

export default function HomePage() {
  const { isDark, toggle: toggleTheme } = useTheme()

  return (
    <div className={designSystem.components.layout.page}>
      {/* 메인 콘텐츠 */}
      <main className="min-h-screen">
        {/* 상단 로고 & 테마 토글 */}
        <div className="flex items-center justify-between p-8">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-12 h-12 bg-accent rounded-xl flex items-center justify-center shadow-lg">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div>
              <h1 className={designSystem.components.typography.h4}>
                Lead Management
              </h1>
              <p className={designSystem.components.typography.caption}>
                리드 관리 솔루션
              </p>
            </div>
          </Link>
          
          {/* 테마 토글만 유지 */}
          <button
            onClick={toggleTheme}
            className={designSystem.utils.cn(
              'w-12 h-12 rounded-xl flex items-center justify-center transition-colors',
              'bg-bg-tertiary hover:bg-bg-hover text-text-secondary'
            )}
            title={isDark ? '라이트 모드로 전환' : '다크 모드로 전환'}
          >
            {isDark ? (
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
              </svg>
            )}
          </button>
        </div>

        <div className="px-8">
          {/* 히어로 섹션 */}
          <section className="text-center py-20 max-w-6xl mx-auto">
            <div className="max-w-4xl mx-auto">
              <h2 className={designSystem.utils.cn(designSystem.components.typography.h1, 'mb-8 leading-tight')}>
                리드 관리부터 상담까지
                <br />
                <span className={designSystem.colors.accent.text}>하나의 플랫폼으로</span>
              </h2>
              
              <p className={designSystem.utils.cn(designSystem.components.typography.bodyLg, 'mb-12 max-w-2xl mx-auto leading-relaxed')}>
                Excel 파일 업로드, 상담사 배정, 진행 상황 추적까지 
                리드 관리 업무를 효율적으로 처리할 수 있습니다.
              </p>
              
              {/* CTA 버튼들 */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-20">
                <Link href="/admin/dashboard" className={designSystem.utils.cn(designSystem.components.button.primary, designSystem.components.button.lg, 'min-w-48')}>
                  관리자로 시작하기
                  <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
                <Link href="/counselor/dashboard" className={designSystem.utils.cn(designSystem.components.button.secondary, designSystem.components.button.lg, 'min-w-48')}>
                  상담사로 시작하기
                  <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>

              {/* 상태 표시 */}
              <div className="flex items-center justify-center gap-8 text-sm">
                <div className="flex items-center gap-2">
                  <div className={designSystem.utils.cn('w-2 h-2 rounded-full', designSystem.colors.status.success.bg, designSystem.components.animation.pulse)}></div>
                  <span className={designSystem.colors.text.secondary}>서비스 운영 중</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-accent"></div>
                  <span className={designSystem.colors.text.secondary}>실시간 동기화</span>
                </div>
              </div>
            </div>
          </section>

          {/* 주요 기능 */}
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
                  icon: (
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                  ),
                  title: '데이터 업로드',
                  description: 'Excel, CSV 파일로 리드 데이터를 한번에 업로드'
                },
                {
                  icon: (
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  ),
                  title: '상담사 배정',
                  description: '리드별 최적의 상담사를 자동 또는 수동 배정'
                },
                {
                  icon: (
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  ),
                  title: '실시간 모니터링',
                  description: '상담 진행 상황과 성과를 실시간으로 확인'
                },
                {
                  icon: (
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 3h-2a4 4 0 00-4 4v5l-2 2v1h16v-1l-2-2V7a4 4 0 00-4-4z" />
                    </svg>
                  ),
                  title: '알림 시스템',
                  description: '중요한 일정과 업무를 놓치지 않도록 알림'
                }
              ].map((feature, index) => (
                <div key={index} className={designSystem.utils.cn(designSystem.components.card.base, designSystem.components.card.content, 'text-center group hover:shadow-lg transition-shadow')}>
                  <div className={designSystem.utils.cn('w-16 h-16 mx-auto mb-6 rounded-2xl flex items-center justify-center', designSystem.colors.accent.light, 'group-hover:scale-110 transition-transform duration-300')}>
                    <div className={designSystem.colors.accent.text}>
                      {feature.icon}
                    </div>
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

          {/* 현재 상황 */}
          <section className="py-20 max-w-6xl mx-auto">
            <div className={designSystem.utils.cn(designSystem.components.card.secondary, designSystem.components.card.contentLg)}>
              <div className="text-center mb-12">
                <h3 className={designSystem.utils.cn(designSystem.components.typography.h3, 'mb-4')}>
                  📊 현재 상황
                </h3>
                <p className={designSystem.components.typography.bodySm}>
                  개발 진행 상황과 사용 가능한 기능들
                </p>
              </div>
              
              <div className={designSystem.utils.cn(designSystem.components.grid.base, 'grid-cols-1 md:grid-cols-3 gap-8')}>
                <div className="text-center">
                  <div className={designSystem.utils.cn('w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6', designSystem.colors.status.success.light)}>
                    <svg className={designSystem.utils.cn('w-10 h-10', designSystem.colors.status.success.text)} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h4 className={designSystem.utils.cn(designSystem.components.typography.h5, 'mb-3')}>
                    기본 시스템
                  </h4>
                  <p className={designSystem.utils.cn(designSystem.components.typography.bodySm, 'mb-4')}>
                    페이지 구조와 디자인 완성
                  </p>
                  <span className={designSystem.components.badge.success}>완료</span>
                </div>
                
                <div className="text-center">
                  <div className={designSystem.utils.cn('w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6', designSystem.colors.status.warning.light)}>
                    <svg className={designSystem.utils.cn('w-10 h-10', designSystem.colors.status.warning.text)} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h4 className={designSystem.utils.cn(designSystem.components.typography.h5, 'mb-3')}>
                    핵심 기능
                  </h4>
                  <p className={designSystem.utils.cn(designSystem.components.typography.bodySm, 'mb-4')}>
                    업로드, 리드 관리 기능 개발 중
                  </p>
                  <span className={designSystem.components.badge.warning}>진행 중</span>
                </div>
                
                <div className="text-center">
                  <div className={designSystem.utils.cn('w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6', designSystem.colors.accent.light)}>
                    <svg className={designSystem.utils.cn('w-10 h-10', designSystem.colors.accent.text)} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <h4 className={designSystem.utils.cn(designSystem.components.typography.h5, 'mb-3')}>
                    고급 기능
                  </h4>
                  <p className={designSystem.utils.cn(designSystem.components.typography.bodySm, 'mb-4')}>
                    분석, 알림 등 추가 기능 예정
                  </p>
                  <span className={designSystem.components.badge.info}>예정</span>
                </div>
              </div>
            </div>
          </section>

          {/* 시작하기 */}
          <section className="py-20 max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h3 className={designSystem.utils.cn(designSystem.components.typography.h3, 'mb-4')}>
                지금 바로 시작하세요
              </h3>
              <p className={designSystem.components.typography.bodySm}>
                역할에 맞는 시스템으로 바로 이동할 수 있습니다
              </p>
            </div>
            
            <div className={designSystem.utils.cn(designSystem.components.grid.base, 'grid-cols-1 md:grid-cols-2 max-w-4xl mx-auto gap-8')}>
              <Link 
                href="/admin/dashboard" 
                className={designSystem.utils.cn(designSystem.components.card.interactive, designSystem.components.card.contentLg, 'group')}
              >
                <div className="flex items-center gap-6">
                  <div className={designSystem.utils.cn('w-16 h-16 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300', designSystem.colors.accent.light)}>
                    <svg className={designSystem.utils.cn('w-8 h-8', designSystem.colors.accent.text)} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h4 className={designSystem.utils.cn(designSystem.components.typography.h5, 'mb-2')}>
                      관리자
                    </h4>
                    <p className={designSystem.components.typography.bodySm}>
                      전체 시스템 관리, 데이터 업로드, 상담사 관리
                    </p>
                  </div>
                  <svg className={designSystem.utils.cn('w-6 h-6', designSystem.colors.text.tertiary, 'group-hover:translate-x-2 transition-transform duration-300')} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </Link>
              
              <Link 
                href="/counselor/dashboard" 
                className={designSystem.utils.cn(designSystem.components.card.interactive, designSystem.components.card.contentLg, 'group')}
              >
                <div className="flex items-center gap-6">
                  <div className={designSystem.utils.cn('w-16 h-16 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300', designSystem.colors.status.success.light)}>
                    <svg className={designSystem.utils.cn('w-8 h-8', designSystem.colors.status.success.text)} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h4 className={designSystem.utils.cn(designSystem.components.typography.h5, 'mb-2')}>
                      상담사
                    </h4>
                    <p className={designSystem.components.typography.bodySm}>
                      담당 리드 관리, 상담 일정, 진행 상황 업데이트
                    </p>
                  </div>
                  <svg className={designSystem.utils.cn('w-6 h-6', designSystem.colors.text.tertiary, 'group-hover:translate-x-2 transition-transform duration-300')} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </Link>
            </div>
          </section>
        </div>

        {/* 푸터 */}
        <footer className={designSystem.utils.cn('border-t mt-20', designSystem.colors.border.primary, designSystem.components.layout.main)}>
          <div className="max-w-6xl mx-auto px-8 py-12 text-center">
            <p className={designSystem.components.typography.bodySm}>
              © 2025 CRM Lead Management System
            </p>
          </div>
        </footer>
      </main>
    </div>
  )
}