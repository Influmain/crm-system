'use client'

import Link from 'next/link'
import { useTheme } from '@/hooks/useTheme'
import { designSystem } from '@/lib/design-system'
import { useAuth } from '@/lib/auth/AuthContext'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function HomePage() {
  const { isDark, toggle: toggleTheme } = useTheme()
  const { user, profile, loading } = useAuth()
  const [mounted, setMounted] = useState(false)
  const [directProfile, setDirectProfile] = useState<any>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  // 직접 프로필 조회 (AuthContext가 실패할 경우 대안)
  useEffect(() => {
    if (user?.id && !profile?.role) {
      console.log('직접 프로필 조회 시도:', user.id);
      const fetchProfile = async () => {
        try {
          const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', user.id)
            .single();
          
          if (error) {
            console.error('직접 프로필 조회 실패:', error);
          } else {
            console.log('직접 프로필 조회 성공:', data);
            setDirectProfile(data);
          }
        } catch (err) {
          console.error('프로필 조회 중 오류:', err);
        }
      };
      
      fetchProfile();
    }
  }, [user?.id, profile?.role]);

  // 실제 사용할 프로필 (우선순위: AuthContext profile -> 직접 조회 -> fallback)
  const activeProfile = profile || directProfile;

  // 디버깅용 로그
  useEffect(() => {
    console.log('=== HomePage 디버깅 ===');
    console.log('HomePage - user:', user);
    console.log('HomePage - profile:', profile);
    console.log('HomePage - directProfile:', directProfile);
    console.log('HomePage - activeProfile:', activeProfile);
    console.log('HomePage - profile?.role:', profile?.role);
    console.log('HomePage - activeProfile?.role:', activeProfile?.role);
    console.log('========================');
  }, [user, profile, directProfile, activeProfile]);

  // 로딩 중이거나 아직 마운트되지 않은 경우
  if (!mounted || loading) {
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center">
        <div className="text-text-secondary">로딩 중... (user: {user?.email}, profile: {(profile || directProfile)?.role})</div>
      </div>
    )
  }

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
              {/* 디버그 정보 */}
              <div className="text-xs text-text-tertiary mt-1">
                Debug: user={user?.email}, profile_role={activeProfile?.role}, direct_role={directProfile?.role}
              </div>
            </div>
          </Link>
          
          <div className="flex items-center gap-4">
            {/* 로그인 상태 표시 */}
            {user ? (
              <div className="flex items-center gap-3">
                <span className="text-sm text-text-secondary">
                  {user.email} ({activeProfile?.role || 'role 정보 없음'})
                </span>
                <Link
                  href={activeProfile?.role === 'admin' ? '/admin/dashboard' : '/counselor/dashboard'}
                  className={designSystem.utils.cn(designSystem.components.button.primary, 'text-sm py-2 px-4')}
                >
                  대시보드로 이동
                </Link>
              </div>
            ) : (
              <Link
                href="/login"
                className={designSystem.utils.cn(designSystem.components.button.primary, 'text-sm py-2 px-4')}
              >
                로그인
              </Link>
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
              
              {/* 로그인 상태에 따른 CTA 버튼 */}
              {user ? (
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-20">
                  <Link 
                    href={activeProfile?.role === 'admin' ? '/admin/dashboard' : '/counselor/dashboard'}
                    className={designSystem.utils.cn(designSystem.components.button.primary, designSystem.components.button.lg, 'min-w-48')}
                  >
                    내 대시보드로 이동 ({activeProfile?.role || 'role 확인 불가'})
                    <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                  {activeProfile?.role === 'admin' && (
                    <Link 
                      href="/admin/upload" 
                      className={designSystem.utils.cn(designSystem.components.button.secondary, designSystem.components.button.lg, 'min-w-48')}
                    >
                      데이터 업로드
                      <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                    </Link>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center gap-6 mb-20">
                  {/* 로그인 필요 안내 */}
                  <div className={designSystem.utils.cn(designSystem.components.card.base, designSystem.components.card.content, 'max-w-md mx-auto')}>
                    <div className="flex items-center gap-3 mb-4">
                      <div className={designSystem.utils.cn('w-10 h-10 rounded-lg flex items-center justify-center', designSystem.colors.status.warning.light)}>
                        <svg className={designSystem.utils.cn('w-5 h-5', designSystem.colors.status.warning.text)} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-1a2 2 0 00-2-2H6a2 2 0 00-2 2v1a2 2 0 002 2zM12 7a4 4 0 014 4v4a4 4 0 11-8 0v-4a4 4 0 014-4z" />
                        </svg>
                      </div>
                      <div>
                        <h3 className={designSystem.components.typography.h6}>
                          로그인 필요
                        </h3>
                        <p className={designSystem.components.typography.bodySm}>
                          시스템 사용을 위해 먼저 로그인해 주세요
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  {/* 로그인 버튼 */}
                  <Link 
                    href="/login" 
                    className={designSystem.utils.cn(designSystem.components.button.primary, designSystem.components.button.lg, 'min-w-48')}
                  >
                    🔐 로그인하기
                    <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                  
                  {/* 테스트 계정 안내 */}
                  <div className="text-center">
                    <p className={designSystem.components.typography.bodySm}>
                      💡 테스트 계정: <code className="px-2 py-1 bg-bg-secondary rounded text-text-primary">admin@company.com</code> 또는 <code className="px-2 py-1 bg-bg-secondary rounded text-text-primary">counselor1@company.com</code>
                    </p>
                  </div>
                </div>
              )}

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
                    <Link href="/admin/upload" className={designSystem.utils.cn(designSystem.components.card.interactive, designSystem.components.card.content, 'group text-center')}>
                      <div className={designSystem.utils.cn('w-12 h-12 mx-auto mb-4 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300', designSystem.colors.accent.light)}>
                        <svg className={designSystem.utils.cn('w-6 h-6', designSystem.colors.accent.text)} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                      </div>
                      <h4 className={designSystem.components.typography.h6}>데이터 업로드</h4>
                    </Link>
                    <Link href="/admin/assignments" className={designSystem.utils.cn(designSystem.components.card.interactive, designSystem.components.card.content, 'group text-center')}>
                      <div className={designSystem.utils.cn('w-12 h-12 mx-auto mb-4 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300', designSystem.colors.status.success.light)}>
                        <svg className={designSystem.utils.cn('w-6 h-6', designSystem.colors.status.success.text)} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                      </div>
                      <h4 className={designSystem.components.typography.h6}>리드 배정</h4>
                    </Link>
                    <Link href="/admin/counselors" className={designSystem.utils.cn(designSystem.components.card.interactive, designSystem.components.card.content, 'group text-center')}>
                      <div className={designSystem.utils.cn('w-12 h-12 mx-auto mb-4 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300', designSystem.colors.status.warning.light)}>
                        <svg className={designSystem.utils.cn('w-6 h-6', designSystem.colors.status.warning.text)} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                        </svg>
                      </div>
                      <h4 className={designSystem.components.typography.h6}>상담사 관리</h4>
                    </Link>
                  </>
                ) : (
                  <>
                    <Link href="/counselor/dashboard" className={designSystem.utils.cn(designSystem.components.card.interactive, designSystem.components.card.content, 'group text-center')}>
                      <div className={designSystem.utils.cn('w-12 h-12 mx-auto mb-4 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300', designSystem.colors.accent.light)}>
                        <svg className={designSystem.utils.cn('w-6 h-6', designSystem.colors.accent.text)} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                      </div>
                      <h4 className={designSystem.components.typography.h6}>내 대시보드</h4>
                    </Link>
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
                    <div className={designSystem.utils.cn('w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6', designSystem.colors.status.success.light)}>
                      <svg className={designSystem.utils.cn('w-10 h-10', designSystem.colors.status.success.text)} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <h4 className={designSystem.utils.cn(designSystem.components.typography.h5, 'mb-3')}>
                      핵심 기능
                    </h4>
                    <p className={designSystem.utils.cn(designSystem.components.typography.bodySm, 'mb-4')}>
                      업로드, 리드 관리 기능 완성
                    </p>
                    <span className={designSystem.components.badge.success}>완료</span>
                  </div>
                  
                  <div className="text-center">
                    <div className={designSystem.utils.cn('w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6', designSystem.colors.status.warning.light)}>
                      <svg className={designSystem.utils.cn('w-10 h-10', designSystem.colors.status.warning.text)} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                    <h4 className={designSystem.utils.cn(designSystem.components.typography.h5, 'mb-3')}>
                      고급 기능
                    </h4>
                    <p className={designSystem.utils.cn(designSystem.components.typography.bodySm, 'mb-4')}>
                      분석, 알림 등 추가 기능 개발 중
                    </p>
                    <span className={designSystem.components.badge.warning}>진행 중</span>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* 로그인 안내 섹션 - 로그인하지 않은 경우만 */}
          {!user && (
            <section className="py-20 max-w-6xl mx-auto">
              <div className="text-center mb-12">
                <h3 className={designSystem.utils.cn(designSystem.components.typography.h3, 'mb-4')}>
                  시작하려면 로그인하세요
                </h3>
                <p className={designSystem.components.typography.bodySm}>
                  테스트 계정을 사용하여 시스템을 체험해 보세요
                </p>
              </div>
              
              <div className={designSystem.utils.cn(designSystem.components.grid.base, 'grid-cols-1 md:grid-cols-2 max-w-4xl mx-auto gap-8')}>
                <div className={designSystem.utils.cn(designSystem.components.card.base, designSystem.components.card.contentLg)}>
                  <div className="flex items-center gap-6">
                    <div className={designSystem.utils.cn('w-16 h-16 rounded-2xl flex items-center justify-center', designSystem.colors.accent.light)}>
                      <svg className={designSystem.utils.cn('w-8 h-8', designSystem.colors.accent.text)} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
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
                    <div className={designSystem.utils.cn('w-16 h-16 rounded-2xl flex items-center justify-center', designSystem.colors.status.success.light)}>
                      <svg className={designSystem.utils.cn('w-8 h-8', designSystem.colors.status.success.text)} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
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
                <Link 
                  href="/login" 
                  className={designSystem.utils.cn(designSystem.components.button.primary, designSystem.components.button.lg)}
                >
                  🔐 로그인 페이지로 이동
                  <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
            </section>
          )}
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