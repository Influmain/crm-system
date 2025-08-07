// components/Toast.tsx
'use client'

import { useEffect } from 'react'
import { X, CheckCircle2, AlertCircle, Info, AlertTriangle } from 'lucide-react'

export interface ToastNotification {
  id: number
  message: string
  type: 'success' | 'error' | 'warning' | 'info'
  timestamp: Date
  duration?: number
}

interface ToastProps {
  notification: ToastNotification
  onClose: (id: number) => void
  theme: any
}

export function Toast({ notification, onClose, theme }: ToastProps) {
  const { id, message, type, duration = 4000 } = notification

  // 자동 제거 타이머
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose(id)
    }, duration)

    return () => clearTimeout(timer)
  }, [id, duration, onClose])

  const getToastStyles = () => {
    switch (type) {
      case 'success':
        return {
          backgroundColor: theme.successBg,
          borderColor: theme.successBorder,
          iconColor: theme.success,
          icon: CheckCircle2
        }
      case 'error':
        return {
          backgroundColor: theme.errorBg,
          borderColor: theme.errorBorder,
          iconColor: theme.error,
          icon: AlertCircle
        }
      case 'warning':
        return {
          backgroundColor: theme.warningBg,
          borderColor: theme.warningBorder,
          iconColor: theme.warning,
          icon: AlertTriangle
        }
      case 'info':
      default:
        return {
          backgroundColor: theme.infoBg,
          borderColor: theme.infoBorder,
          iconColor: theme.info,
          icon: Info
        }
    }
  }

  const styles = getToastStyles()
  const IconComponent = styles.icon

  return (
    <div
      className="toast-slide-in flex items-center gap-3 p-4 rounded-lg shadow-lg border mb-3 min-w-[320px] max-w-[420px]"
      style={{
        backgroundColor: styles.backgroundColor,
        borderColor: styles.borderColor,
        borderWidth: '1px'
      }}
    >
      {/* 아이콘 */}
      <div className="flex-shrink-0">
        <IconComponent size={20} style={{ color: styles.iconColor }} />
      </div>

      {/* 메시지 */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium" style={{ color: theme.textPrimary }}>
          {message}
        </p>
        <p className="text-xs mt-1" style={{ color: theme.textSecondary }}>
          {notification.timestamp.toLocaleTimeString()}
        </p>
      </div>

      {/* 닫기 버튼 */}
      <button
        onClick={() => onClose(id)}
        className="flex-shrink-0 p-1 rounded-md transition-colors hover:bg-black hover:bg-opacity-10"
        style={{ color: theme.textSecondary }}
      >
        <X size={16} />
      </button>
    </div>
  )
}

// Toast 컨테이너
interface ToastContainerProps {
  notifications: ToastNotification[]
  onClose: (id: number) => void
  theme: any
}

export function ToastContainer({ notifications, onClose, theme }: ToastContainerProps) {
  if (notifications.length === 0) return null

  return (
    <>
      {/* Toast 스타일 */}
      <style jsx global>{`
        @keyframes toast-slide-in {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }

        @keyframes toast-slide-out {
          from {
            transform: translateX(0);
            opacity: 1;
          }
          to {
            transform: translateX(100%);
            opacity: 0;
          }
        }

        .toast-slide-in {
          animation: toast-slide-in 0.3s ease-out;
        }

        .toast-slide-out {
          animation: toast-slide-out 0.3s ease-in;
        }
      `}</style>

      {/* Toast 컨테이너 */}
      <div
        className="fixed bottom-4 right-4 z-50 pointer-events-none"
        style={{ zIndex: 9999 }}
      >
        <div className="flex flex-col-reverse items-end pointer-events-auto">
          {notifications.map((notification) => (
            <Toast
              key={notification.id}
              notification={notification}
              onClose={onClose}
              theme={theme}
            />
          ))}
        </div>
      </div>
    </>
  )
}

// 사용 예시
export const useToast = () => {
  const addToast = (
    message: string,
    type: 'success' | 'error' | 'warning' | 'info' = 'info',
    duration?: number
  ) => {
    // 이 함수는 실제 컴포넌트에서 구현됩니다
    console.log('Toast:', { message, type, duration })
  }

  return { addToast }
}