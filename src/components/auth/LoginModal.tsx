'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useToastHelpers } from '@/components/ui/Toast'
import { businessIcons } from '@/lib/design-system/icons'
import { designSystem } from '@/lib/design-system'
import { RefreshCw, X, Shield, Users, LogIn } from 'lucide-react'

interface LoginModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: (user: any, profile: any) => void
}

export default function LoginModal({ isOpen, onClose, onSuccess }: LoginModalProps) {
  const router = useRouter()
  const toast = useToastHelpers()
  
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!email || !password) {
      toast.warning('입력 오류', '이메일과 비밀번호를 모두 입력해주세요.')
      return
    }

    setLoading(true)
    
    try {
      // Supabase 인증
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password
      })

      if (authError) {
        throw new Error(authError.message)
      }

      if (!authData.user) {
        throw new Error('로그인 데이터를 받을 수 없습니다.')
      }

      // 사용자 프로필 조회
      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('id', authData.user.id)
        .single()

      if (profileError) {
        console.warn('프로필 조회 실패:', profileError)
        // 프로필이 없어도 로그인은 성공으로 처리
      }

      const userProfile = profile || { role: 'counselor', full_name: email }

      // 성공 처리
      if (onSuccess) {
        onSuccess(authData.user, userProfile)
      }

      // 토스트 알림
      toast.success(
        '로그인 성공! 🎉', 
        `환영합니다, ${userProfile.full_name || email}님!`,
        {
          action: { 
            label: '대시보드로 이동', 
            onClick: () => {
              const dashboardPath = userProfile.role === 'admin' ? '/admin/dashboard' : '/counselor/dashboard'
              router.push(dashboardPath)
            }
          }
        }
      )

      // 모달 닫기
      onClose()

      // 대시보드로 이동
      setTimeout(() => {
        const dashboardPath = userProfile.role === 'admin' ? '/admin/dashboard' : '/counselor/dashboard'
        router.push(dashboardPath)
      }, 1000)

    } catch (error) {
      console.error('로그인 실패:', error)
      
      let errorMessage = '로그인 중 오류가 발생했습니다.'
      if (error.message.includes('Invalid login credentials')) {
        errorMessage = '이메일 또는 비밀번호가 올바르지 않습니다.'
      } else if (error.message.includes('Email not confirmed')) {
        errorMessage = '이메일 인증이 필요합니다.'
      } else if (error.message) {
        errorMessage = error.message
      }
      
      toast.error(
        '로그인 실패',
        errorMessage,
        {
          action: { 
            label: '다시 시도', 
            onClick: () => {
              setPassword('')
              document.querySelector('input[type="password"]')?.focus()
            }
          }
        }
      )
    } finally {
      setLoading(false)
    }
  }

  const quickLogin = async (testEmail: string, testPassword: string, accountType: string) => {
    setEmail(testEmail)
    setPassword(testPassword)
    setLoading(true)

    toast.info(
      `${accountType} 계정 로그인`,
      '테스트 계정으로 자동 로그인 중입니다...'
    )

    // 자동 로그인 실행
    setTimeout(async () => {
      try {
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
          email: testEmail,
          password: testPassword
        })

        if (authError) throw authError

        const { data: profile } = await supabase
          .from('users')
          .select('*')
          .eq('id', authData.user.id)
          .single()

        const userProfile = profile || { role: testEmail.includes('admin') ? 'admin' : 'counselor', full_name: testEmail }

        if (onSuccess) {
          onSuccess(authData.user, userProfile)
        }

        toast.success(
          `${accountType} 로그인 성공! 🎉`,
          `${userProfile.full_name || testEmail}님으로 로그인되었습니다.`,
          {
            action: { 
              label: '대시보드로 이동', 
              onClick: () => {
                const dashboardPath = userProfile.role === 'admin' ? '/admin/dashboard' : '/counselor/dashboard'
                router.push(dashboardPath)
              }
            }
          }
        )

        onClose()

        setTimeout(() => {
          const dashboardPath = userProfile.role === 'admin' ? '/admin/dashboard' : '/counselor/dashboard'
          router.push(dashboardPath)
        }, 1000)

      } catch (error) {
        toast.error('자동 로그인 실패', error.message || '테스트 계정 로그인에 실패했습니다.')
      } finally {
        setLoading(false)
      }
    }, 500)
  }

  const handleClose = () => {
    if (!loading) {
      setEmail('')
      setPassword('')
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-bg-primary border border-border-primary rounded-xl w-full max-w-md mx-auto shadow-2xl">
        {/* 모달 헤더 */}
        <div className="flex items-center justify-between p-6 border-b border-border-primary">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-accent rounded-xl flex items-center justify-center">
              <LogIn className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-text-primary">CRM 로그인</h2>
              <p className="text-sm text-text-secondary">계정에 로그인하여 시작하세요</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={loading}
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-bg-hover text-text-secondary transition-colors disabled:opacity-50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 로그인 폼 */}
        <div className="p-6">
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2 text-text-primary">이메일 주소</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-border-primary rounded-lg bg-bg-primary text-text-primary focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-colors"
                placeholder="이메일을 입력하세요"
                disabled={loading}
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2 text-text-primary">비밀번호</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-border-primary rounded-lg bg-bg-primary text-text-primary focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-colors"
                placeholder="비밀번호를 입력하세요"
                disabled={loading}
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className={designSystem.utils.cn(
                "w-full py-3 rounded-lg font-medium transition-all flex items-center justify-center gap-2",
                loading 
                  ? "bg-bg-hover text-text-secondary cursor-not-allowed" 
                  : "bg-accent text-white hover:bg-accent/90 active:scale-[0.98]"
              )}
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  로그인 중...
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  로그인
                </>
              )}
            </button>
          </form>

          {/* 테스트 계정 빠른 로그인 */}
          <div className="mt-6 pt-6 border-t border-border-primary">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-4 h-4 bg-accent/20 rounded-full flex items-center justify-center">
                <div className="w-2 h-2 bg-accent rounded-full"></div>
              </div>
              <p className="text-sm font-medium text-text-primary">테스트 계정 빠른 로그인</p>
            </div>
            
            <div className="space-y-3">
              <button
                onClick={() => quickLogin('admin@company.com', 'admin123', '관리자')}
                disabled={loading}
                className="w-full p-4 text-left border border-border-primary rounded-lg hover:bg-bg-hover transition-all group disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center group-hover:bg-accent/20 transition-colors">
                    <Shield className="w-5 h-5 text-accent" />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-text-primary">관리자 계정</div>
                    <div className="text-xs text-text-secondary">admin@company.com</div>
                    <div className="text-xs text-text-tertiary">전체 시스템 관리, 데이터 업로드, 상담원 관리</div>
                  </div>
                  <div className="text-accent opacity-0 group-hover:opacity-100 transition-opacity">
                    →
                  </div>
                </div>
              </button>
              
              <button
                onClick={() => quickLogin('counselor1@company.com', 'counselor123', '상담원')}
                disabled={loading}
                className="w-full p-4 text-left border border-border-primary rounded-lg hover:bg-bg-hover transition-all group disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-success/10 rounded-lg flex items-center justify-center group-hover:bg-success/20 transition-colors">
                    <Users className="w-5 h-5 text-success" />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-text-primary">상담원 계정</div>
                    <div className="text-xs text-text-secondary">counselor1@company.com</div>
                    <div className="text-xs text-text-tertiary">담당 리드 관리, 상담 일정, 진행 상황 업데이트</div>
                  </div>
                  <div className="text-success opacity-0 group-hover:opacity-100 transition-opacity">
                    →
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* 추가 안내 */}
          <div className="mt-6 p-3 bg-accent/5 rounded-lg">
            <p className="text-xs text-text-secondary text-center">
              💡 <strong>개발 환경</strong>에서는 테스트 계정을 사용하여<br/>
              시스템의 모든 기능을 체험해보실 수 있습니다.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}