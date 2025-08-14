'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth/AuthContext'
import { useToastHelpers } from '@/components/ui/Toast'
import LoginModal from '@/components/auth/LoginModal'
import { designSystem } from '@/lib/design-system'
import { ArrowLeft, BarChart3 } from 'lucide-react'

export default function LoginPage() {
  const { user, profile, loading } = useAuth()
  const router = useRouter()
  const toast = useToastHelpers()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // 이미 로그인된 경우 대시보드로 리다이렉트
  useEffect(() => {
    if (user && profile && mounted) {
      const dashboardPath = profile.role === 'admin' ? '/admin/dashboard' : '/counselor/dashboard'
      
      toast.info(
        '이미 로그인됨',
        `${profile.full_name || user.email}님으로 로그인되어 있습니다.`,
        {
          action: { 
            label: '대시보드로 이동', 
            onClick: () => router.push(dashboardPath)
          }
        }
      )
      
      setTimeout(() => {
        router.push(dashboardPath)
      }, 2000)
    }
  }, [user, profile, mounted, router, toast])

  const handleLoginSuccess = (user: any, profile: any) => {
    console.log('로그인 페이지에서 로그인 성공:', user.email, profile.role)
    // LoginModal에서 이미 리다이렉트와 토스트 처리됨
  }

  const handleClose = () => {
    router.push('/')
  }

  // 로딩 중
  if (!mounted || loading) {
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-text-secondary">로그인 상태 확인 중...</p>
        </div>
      </div>
    )
  }

  // 이미 로그인된 경우 안내 화면
  if (user && profile) {
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="w-16 h-16 bg-success/10 rounded-xl flex items-center justify-center mx-auto mb-6">
            <BarChart3 className="w-8 h-8 text-success" />
          </div>
          
          <h1 className={designSystem.components.typography.h3 + " mb-4"}>
            로그인 완료
          </h1>
          
          <p className="text-text-secondary mb-6">
            {profile.full_name || user.email}님으로 로그인되어 있습니다.
            <br />
            잠시 후 대시보드로 이동합니다.
          </p>
          
          <div className="flex flex-col gap-3">
            <button
              onClick={() => {
                const dashboardPath = profile.role === 'admin' ? '/admin/dashboard' : '/counselor/dashboard'
                router.push(dashboardPath)
              }}
              className={designSystem.components.button.primary}
            >
              대시보드로 이동
            </button>
            
            <button
              onClick={() => router.push('/')}
              className={designSystem.components.button.secondary}
            >
              홈페이지로 이동
            </button>
          </div>
        </div>
      </div>
    )
  }

  // 로그인이 필요한 경우 - 모달을 페이지 중앙에 고정 표시
  return (
    <div className="min-h-screen bg-bg-primary">
      {/* 상단 네비게이션 */}
      <header className="flex items-center justify-between p-6">
        <button
          onClick={() => router.push('/')}
          className="flex items-center gap-2 text-text-secondary hover:text-text-primary transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm">홈페이지로 돌아가기</span>
        </button>
        
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center">
            <BarChart3 className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="text-sm font-medium text-text-primary">CRM System</div>
            <div className="text-xs text-text-secondary">로그인 페이지</div>
          </div>
        </div>
      </header>

      {/* 중앙 로그인 영역 */}
      <div className="flex items-center justify-center min-h-[calc(100vh-120px)] px-4">
        <div className="w-full max-w-md">
          {/* 페이지 제목 */}
          <div className="text-center mb-8">
            <h1 className={designSystem.components.typography.h2 + " mb-2"}>
              CRM 시스템 로그인
            </h1>
            <p className="text-text-secondary">
              계정에 로그인하여 리드 관리를 시작하세요
            </p>
          </div>

          {/* LoginModal을 항상 열린 상태로 표시 */}
          <div className="relative">
            <LoginModal 
              isOpen={true} 
              onClose={handleClose}
              onSuccess={handleLoginSuccess}
            />
          </div>

          {/* 추가 안내 */}
          <div className="mt-8 text-center">
            <div className="p-4 bg-bg-secondary rounded-lg">
              <p className="text-sm text-text-secondary mb-2">
                💡 <strong>URL 직접 접근</strong>
              </p>
              <p className="text-xs text-text-tertiary">
                이 페이지는 북마크하거나 직접 URL로 접근할 때 사용됩니다.
                <br />
                홈페이지에서는 모달 방식으로 더 편리하게 로그인할 수 있습니다.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 푸터 */}
      <footer className="text-center p-6 border-t border-border-primary">
        <p className="text-xs text-text-tertiary">
          © 2025 CRM Lead Management System
        </p>
      </footer>
    </div>
  )
}