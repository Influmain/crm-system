'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useTheme } from '@/hooks/useTheme'
import { designSystem } from '@/lib/design-system'

export default function RegisterPage() {
  const { isDark, toggle: toggleTheme } = useTheme()
  const router = useRouter()
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    userType: 'counselor'
  })
  const [isLoading, setIsLoading] = useState(false)

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (formData.password !== formData.confirmPassword) {
      alert('비밀번호가 일치하지 않습니다.')
      return
    }

    setIsLoading(true)

    // 임시 회원가입 로직 (실제로는 API 호출)
    setTimeout(() => {
      alert('회원가입이 완료되었습니다!')
      router.push('/login')
      setIsLoading(false)
    }, 1000)
  }

  return (
    <div className={designSystem.components.layout.page}>
      <div className="min-h-screen flex">
        {/* 왼쪽 브랜딩 영역 */}
        <div className="hidden lg:flex lg:w-1/2 bg-accent relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-accent to-accent-hover"></div>
          <div className="relative z-10 flex flex-col justify-center px-12 text-white">
            <div className="mb-8">
              <div className="w-16 h-16 bg-white bg-opacity-20 rounded-2xl flex items-center justify-center mb-6">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
              </div>
              <h1 className="text-4xl font-bold mb-4">계정 생성</h1>
              <p className="text-xl opacity-90">
                Lead Management에 가입하고<br />
                효율적인 업무를 시작하세요
              </p>
            </div>
            <div className="space-y-4 text-lg opacity-80">
              <div className="flex items-center gap-3">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                빠른 설정으로 바로 시작
              </div>
              <div className="flex items-center gap-3">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                안전한 데이터 보호
              </div>
              <div className="flex items-center gap-3">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                24/7 지원 서비스
              </div>
            </div>
          </div>
        </div>

        {/* 오른쪽 회원가입 폼 영역 */}
        <div className="flex-1 flex flex-col justify-center px-8 lg:px-12">
          {/* 상단 테마 토글 */}
          <div className="absolute top-8 right-8">
            <button
              onClick={toggleTheme}
              className={designSystem.utils.cn(
                'w-12 h-12 rounded-xl flex items-center justify-center transition-colors',
                'bg-bg-tertiary hover:bg-bg-hover text-text-secondary'
              )}
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

          <div className="w-full max-w-md mx-auto">
            {/* 로고 (작은 화면용) */}
            <div className="lg:hidden mb-8 text-center">
              <div className="w-16 h-16 bg-accent rounded-2xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
              </div>
              <h1 className={designSystem.components.typography.h3}>Lead Management</h1>
            </div>

            {/* 회원가입 헤더 */}
            <div className="mb-8">
              <h2 className={designSystem.components.typography.h2}>회원가입</h2>
              <p className={designSystem.components.typography.bodySm}>
                새 계정을 만들어 시작하세요
              </p>
            </div>

            {/* 회원가입 폼 */}
            <form onSubmit={handleRegister} className="space-y-6">
              {/* 사용자 유형 선택 */}
              <div>
                <label className={designSystem.utils.cn(designSystem.components.typography.bodySm, 'block mb-3 font-medium')}>
                  가입 유형
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, userType: 'counselor' })}
                    className={designSystem.utils.cn(
                      'p-3 rounded-lg border-2 transition-colors text-sm font-medium',
                      formData.userType === 'counselor'
                        ? 'border-accent bg-accent-light text-accent'
                        : 'border-border-primary bg-bg-primary text-text-secondary hover:border-border-secondary'
                    )}
                  >
                    상담사
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, userType: 'admin' })}
                    className={designSystem.utils.cn(
                      'p-3 rounded-lg border-2 transition-colors text-sm font-medium',
                      formData.userType === 'admin'
                        ? 'border-accent bg-accent-light text-accent'
                        : 'border-border-primary bg-bg-primary text-text-secondary hover:border-border-secondary'
                    )}
                  >
                    관리자
                  </button>
                </div>
              </div>

              {/* 이름 */}
              <div>
                <label htmlFor="name" className={designSystem.utils.cn(designSystem.components.typography.bodySm, 'block mb-2 font-medium')}>
                  이름
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className={designSystem.components.input.base}
                  placeholder="이름을 입력하세요"
                  required
                />
              </div>

              {/* 이메일 */}
              <div>
                <label htmlFor="email" className={designSystem.utils.cn(designSystem.components.typography.bodySm, 'block mb-2 font-medium')}>
                  이메일
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className={designSystem.components.input.base}
                  placeholder="이메일을 입력하세요"
                  required
                />
              </div>

              {/* 비밀번호 */}
              <div>
                <label htmlFor="password" className={designSystem.utils.cn(designSystem.components.typography.bodySm, 'block mb-2 font-medium')}>
                  비밀번호
                </label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className={designSystem.components.input.base}
                  placeholder="비밀번호를 입력하세요"
                  required
                />
              </div>

              {/* 비밀번호 확인 */}
              <div>
                <label htmlFor="confirmPassword" className={designSystem.utils.cn(designSystem.components.typography.bodySm, 'block mb-2 font-medium')}>
                  비밀번호 확인
                </label>
                <input
                  type="password"
                  id="confirmPassword"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  className={designSystem.components.input.base}
                  placeholder="비밀번호를 다시 입력하세요"
                  required
                />
              </div>

              {/* 회원가입 버튼 */}
              <button
                type="submit"
                disabled={isLoading}
                className={designSystem.utils.cn(
                  designSystem.components.button.primary,
                  designSystem.components.button.full,
                  designSystem.components.button.lg,
                  isLoading && 'opacity-50 cursor-not-allowed'
                )}
              >
                {isLoading ? '가입 중...' : '회원가입'}
              </button>
            </form>

            {/* 하단 링크 */}
            <div className="mt-8 text-center space-y-2">
              <p className={designSystem.components.typography.bodySm}>
                이미 계정이 있으신가요?{' '}
                <Link 
                  href="/login" 
                  className={designSystem.utils.cn(designSystem.colors.accent.text, 'font-medium hover:underline')}
                >
                  로그인
                </Link>
              </p>
              <Link 
                href="/" 
                className={designSystem.utils.cn(designSystem.components.typography.bodySm, designSystem.colors.text.secondary, 'hover:text-text-primary transition-colors')}
              >
                ← 홈페이지로 돌아가기
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}