// 파일 경로: src/app/layout.tsx
// 🔄 ThemeProvider 제거 - 원래 상태로 복원

import { AuthProvider, AuthDebugInfo } from '@/lib/auth/AuthContext';
import './globals.css';

export const metadata = {
  title: 'CRM 시스템',
  description: '리드 관리 및 상담원 배정 시스템',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>
        <AuthProvider>
          {children}
          <AuthDebugInfo />
        </AuthProvider>
      </body>
    </html>
  );
}