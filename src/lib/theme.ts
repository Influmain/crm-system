// 🎨 전역 테마 시스템 - 모든 컴포넌트에서 재사용 가능

export interface ThemeColors {
  // 기본 배경 및 컨테이너
  bg: string
  cardBg: string
  sidebarBg: string
  
  // 경계선 및 구분선
  border: string
  
  // 텍스트 색상 (계층별)
  textPrimary: string    // 메인 제목, 중요 텍스트
  textSecondary: string  // 부제목, 설명
  textMuted: string      // 보조 정보, 메타 데이터
  
  // 상호작용 상태
  hover: string
  active: string
  focus: string
  
  // 상태별 색상
  success: string
  successBg: string
  successBorder: string
  
  error: string
  errorBg: string
  errorBorder: string
  
  warning: string
  warningBg: string
  warningBorder: string
  
  info: string
  infoBg: string
  infoBorder: string
  
  // 브랜드 색상
  primary: string
  primaryBg: string
  primaryBorder: string
}

export const lightTheme: ThemeColors = {
  // 기본
  bg: '#FAFAFA',
  cardBg: '#FFFFFF',
  sidebarBg: '#FFFFFF',
  
  // 경계선
  border: '#E5E5E5',
  
  // 텍스트
  textPrimary: '#2F2F2F',
  textSecondary: '#9B9A97',
  textMuted: '#6B7280',
  
  // 상호작용
  hover: '#F5F5F5',
  active: '#F0F0F0',
  focus: '#E3F2FD',
  
  // 상태 - 성공 (초록)
  success: '#10B981',
  successBg: '#ECFDF5',
  successBorder: '#A7F3D0',
  
  // 상태 - 오류 (빨강)
  error: '#EF4444',
  errorBg: '#FEF2F2',
  errorBorder: '#FECACA',
  
  // 상태 - 경고 (노랑)
  warning: '#F59E0B',
  warningBg: '#FFFBEB',
  warningBorder: '#FDE68A',
  
  // 상태 - 정보 (파랑)
  info: '#3B82F6',
  infoBg: '#EFF6FF',
  infoBorder: '#BFDBFE',
  
  // 브랜드
  primary: '#000000',
  primaryBg: '#F8F9FA',
  primaryBorder: '#E9ECEF'
}

export const darkTheme: ThemeColors = {
  // 기본
  bg: '#191919',
  cardBg: '#2F2F2F',
  sidebarBg: '#2F2F2F',
  
  // 경계선
  border: '#3A3A3A',
  
  // 텍스트
  textPrimary: '#E5E5E5',
  textSecondary: '#9B9B9B',
  textMuted: '#7A7A7A',
  
  // 상호작용
  hover: '#373737',
  active: '#404040',
  focus: '#1E3A8A',
  
  // 상태 - 성공 (초록)
  success: '#10B981',
  successBg: '#064E3B',
  successBorder: '#065F46',
  
  // 상태 - 오류 (빨강)
  error: '#EF4444',
  errorBg: '#7F1D1D',
  errorBorder: '#991B1B',
  
  // 상태 - 경고 (노랑)
  warning: '#F59E0B',
  warningBg: '#78350F',
  warningBorder: '#92400E',
  
  // 상태 - 정보 (파랑)
  info: '#3B82F6',
  infoBg: '#1E3A8A',
  infoBorder: '#1D4ED8',
  
  // 브랜드
  primary: '#FFFFFF',
  primaryBg: '#374151',
  primaryBorder: '#4B5563'
}

// 테마 가져오기 함수
export const getTheme = (isDark: boolean): ThemeColors => {
  return isDark ? darkTheme : lightTheme
}

// 테마 적용 헬퍼 함수들
export const getButtonStyles = (theme: ThemeColors, variant: 'primary' | 'secondary' | 'success' | 'error' = 'primary') => {
  const variants = {
    primary: {
      backgroundColor: theme.primary,
      color: variant === 'primary' ? '#FFFFFF' : theme.textPrimary,
      borderColor: theme.primary
    },
    secondary: {
      backgroundColor: theme.cardBg,
      color: theme.textPrimary,
      borderColor: theme.border
    },
    success: {
      backgroundColor: theme.success,
      color: '#FFFFFF',
      borderColor: theme.success
    },
    error: {
      backgroundColor: theme.error,
      color: '#FFFFFF',
      borderColor: theme.error
    }
  }
  
  return variants[variant]
}

export const getCardStyles = (theme: ThemeColors) => ({
  backgroundColor: theme.cardBg,
  border: `1px solid ${theme.border}`,
  borderRadius: '8px'
})

export const getInputStyles = (theme: ThemeColors) => ({
  backgroundColor: theme.cardBg,
  border: `1px solid ${theme.border}`,
  color: theme.textPrimary,
  borderRadius: '6px'
})

// 로컬 스토리지 테마 저장/불러오기
export const saveThemePreference = (isDark: boolean) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('theme', isDark ? 'dark' : 'light')
  }
}

export const loadThemePreference = (): boolean => {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('theme')
    if (saved) return saved === 'dark'
    
    // 시스템 테마 자동 감지
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  }
  return false
}

// CSS 변수 스타일로 테마 적용 (선택사항)
export const generateCSSVariables = (theme: ThemeColors) => {
  return {
    '--bg': theme.bg,
    '--card-bg': theme.cardBg,
    '--border': theme.border,
    '--text-primary': theme.textPrimary,
    '--text-secondary': theme.textSecondary,
    '--text-muted': theme.textMuted,
    '--hover': theme.hover,
    '--active': theme.active,
    '--success': theme.success,
    '--error': theme.error,
    '--warning': theme.warning,
    '--primary': theme.primary
  } as React.CSSProperties
}