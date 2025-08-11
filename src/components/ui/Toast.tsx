// 📁 /components/ui/Toast.tsx
'use client';

import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { designSystem } from '@/lib/design-system';
import { businessIcons } from '@/lib/design-system/icons';
import { X } from 'lucide-react';

// 토스트 타입 정의
export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

// 토스트 컨텍스트
interface ToastContextType {
  toasts: Toast[];
  showToast: (toast: Omit<Toast, 'id'>) => void;
  hideToast: (id: string) => void;
  clearAllToasts: () => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

// 토스트 프로바이더
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = (toast: Omit<Toast, 'id'>) => {
    const id = Date.now().toString();
    const newToast: Toast = {
      id,
      duration: 5000, // 기본 5초
      ...toast,
    };

    setToasts(prev => [...prev, newToast]);

    // 자동 제거
    if (newToast.duration && newToast.duration > 0) {
      setTimeout(() => {
        hideToast(id);
      }, newToast.duration);
    }
  };

  const hideToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  const clearAllToasts = () => {
    setToasts([]);
  };

  return (
    <ToastContext.Provider value={{ toasts, showToast, hideToast, clearAllToasts }}>
      {children}
      <ToastContainer toasts={toasts} onClose={hideToast} />
    </ToastContext.Provider>
  );
}

// 토스트 컨테이너
function ToastContainer({ toasts, onClose }: { toasts: Toast[]; onClose: (id: string) => void }) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {toasts.map(toast => (
        <ToastItem key={toast.id} toast={toast} onClose={onClose} />
      ))}
    </div>
  );
}

// 개별 토스트 아이템
function ToastItem({ toast, onClose }: { toast: Toast; onClose: (id: string) => void }) {
  const [isVisible, setIsVisible] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  useEffect(() => {
    // 등장 애니메이션
    const timer = setTimeout(() => setIsVisible(true), 50);
    return () => clearTimeout(timer);
  }, []);

  const handleClose = () => {
    setIsLeaving(true);
    setTimeout(() => {
      onClose(toast.id);
    }, 300);
  };

  const getToastStyles = () => {
    const baseStyles = `
      transform transition-all duration-300 ease-in-out
      ${isVisible && !isLeaving ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
      max-w-md w-full bg-bg-primary border rounded-lg shadow-lg p-4
    `;

    switch (toast.type) {
      case 'success':
        return `${baseStyles} border-green-200 dark:border-green-800`;
      case 'error':
        return `${baseStyles} border-red-200 dark:border-red-800`;
      case 'warning':
        return `${baseStyles} border-yellow-200 dark:border-yellow-800`;
      case 'info':
        return `${baseStyles} border-blue-200 dark:border-blue-800`;
      default:
        return `${baseStyles} border-border-primary`;
    }
  };

  const getIcon = () => {
    switch (toast.type) {
      case 'success':
        return <businessIcons.success className="w-5 h-5 text-green-500" />;
      case 'error':
        return <businessIcons.error className="w-5 h-5 text-red-500" />;
      case 'warning':
        return <businessIcons.warning className="w-5 h-5 text-yellow-500" />;
      case 'info':
        return <businessIcons.info className="w-5 h-5 text-blue-500" />;
      default:
        return <businessIcons.info className="w-5 h-5 text-text-tertiary" />;
    }
  };

  return (
    <div className={getToastStyles()}>
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0 mt-0.5">
          {getIcon()}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-text-primary">
                {toast.title}
              </p>
              {toast.message && (
                <p className="mt-1 text-sm text-text-secondary">
                  {toast.message}
                </p>
              )}
            </div>
            
            <button
              onClick={handleClose}
              className="ml-3 flex-shrink-0 text-text-tertiary hover:text-text-primary transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          
          {toast.action && (
            <div className="mt-3">
              <button
                onClick={() => {
                  toast.action?.onClick();
                  handleClose();
                }}
                className="text-sm text-accent hover:text-accent-dark font-medium transition-colors"
              >
                {toast.action.label}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// 편의 함수들
export const createToastHelpers = (showToast: ToastContextType['showToast']) => ({
  success: (title: string, message?: string, options?: Partial<Toast>) =>
    showToast({ type: 'success', title, message, ...options }),
  
  error: (title: string, message?: string, options?: Partial<Toast>) =>
    showToast({ type: 'error', title, message, ...options }),
  
  warning: (title: string, message?: string, options?: Partial<Toast>) =>
    showToast({ type: 'warning', title, message, ...options }),
  
  info: (title: string, message?: string, options?: Partial<Toast>) =>
    showToast({ type: 'info', title, message, ...options }),
});

// 글로벌 토스트 훅
export const useToastHelpers = () => {
  const { showToast } = useToast();
  return createToastHelpers(showToast);
};

// 사용 예시를 위한 데모 컴포넌트
export function ToastDemo() {
  const toast = useToastHelpers();

  return (
    <div className="space-y-4 p-6">
      <h3 className={designSystem.components.typography.h4}>토스트 알림 테스트</h3>
      
      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => toast.success('배정 완료', '3개의 리드가 성공적으로 배정되었습니다.')}
          className={designSystem.components.button.primary}
        >
          성공 알림
        </button>
        
        <button
          onClick={() => toast.error('배정 실패', '네트워크 오류가 발생했습니다.')}
          className={designSystem.components.button.secondary}
        >
          오류 알림
        </button>
        
        <button
          onClick={() => toast.warning('주의', '일부 리드가 이미 배정되어 있습니다.')}
          className={designSystem.components.button.secondary}
        >
          경고 알림
        </button>
        
        <button
          onClick={() => toast.info('정보', '새로운 업데이트가 있습니다.', {
            action: {
              label: '자세히 보기',
              onClick: () => console.log('자세히 보기 클릭')
            }
          })}
          className={designSystem.components.button.secondary}
        >
          정보 알림
        </button>
      </div>
    </div>
  );
}