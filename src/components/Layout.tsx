// src/components/Layout.tsx
'use client';

import React, { useState, useEffect } from 'react';

interface LayoutProps {
  children: React.ReactNode;
  currentPage?: string;
}

export default function Layout({ children, currentPage }: LayoutProps) {
  // 모바일 메뉴 상태
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // 화면 크기 감지
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
      // 데스크톱으로 변경되면 모바일 메뉴 닫기
      if (window.innerWidth >= 768) {
        setIsMobileMenuOpen(false);
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // 테마 상태
  const [theme, setTheme] = useState('light');
  const [userRole, setUserRole] = useState('admin');

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'light';
    setTheme(savedTheme);
    document.documentElement.setAttribute('data-theme', savedTheme);
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  // 메뉴 아이템들
  const menuItems = [
    // 대시보드
    { 
      category: '대시보드', 
      items: [
        { id: 'dashboard', icon: '📊', name: '홈', href: '/' }
      ]
    },
    // 리드 관리
    { 
      category: '리드 관리', 
      items: [
        { id: 'upload', icon: '📁', name: '리드 업로드', href: '/' },
        { id: 'leads', icon: '📞', name: '리드 관리', href: '/leads' },
        { id: 'distribute', icon: '🎯', name: '리드 배분', href: '/distribute' }
      ]
    },
    // 상담 관리  
    { 
      category: '상담 관리', 
      items: [
        { id: 'consultation', icon: '📋', name: '상담 기록', href: '/consultation' },
        { id: 'schedule', icon: '📅', name: '일정 관리', href: '/schedule' }
      ]
    },
    // 사용자 관리 (관리자만)
    ...(userRole === 'admin' ? [{
      category: '사용자 관리', 
      items: [
        { id: 'users', icon: '👥', name: '상담원 관리', href: '/users' }
      ]
    }] : []),
    // 분석 및 통계
    { 
      category: '분석 및 통계', 
      items: [
        { id: 'analytics', icon: '📈', name: '전환 통계', href: '/analytics' }
      ]
    },
    // 시스템
    { 
      category: '시스템', 
      items: [
        { id: 'settings', icon: '⚙️', name: '설정', href: '/settings' }
      ]
    }
  ];

  const Sidebar = ({ className = "" }) => (
    <div className={`bg-gray-900 text-white flex flex-col ${className}`}>
      {/* 로고 및 햄버거 버튼 */}
      <div className="p-4 border-b border-gray-700 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold">
            C
          </div>
          <div className={`${isMobile ? 'block' : 'lg:block'}`}>
            <h1 className="text-lg font-bold">CRM Lead 관리 시스템</h1>
          </div>
        </div>
        {/* 모바일에서만 닫기 버튼 표시 */}
        {isMobile && (
          <button
            onClick={() => setIsMobileMenuOpen(false)}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors lg:hidden"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* 메뉴 */}
      <nav className="flex-1 overflow-y-auto py-4">
        <div className="px-4 space-y-6">
          {menuItems.map((category) => (
            <div key={category.category}>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                {category.category}
              </h3>
              <div className="space-y-1">
                {category.items.map((item) => (
                  <a
                    key={item.id}
                    href={item.href}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                      currentPage === item.id 
                        ? 'bg-blue-600 text-white' 
                        : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                    }`}
                    onClick={() => {
                      // 모바일에서 메뉴 클릭 시 사이드바 닫기
                      if (isMobile) {
                        setIsMobileMenuOpen(false);
                      }
                    }}
                  >
                    <span className="text-lg">{item.icon}</span>
                    <span className="font-medium">{item.name}</span>
                  </a>
                ))}
              </div>
            </div>
          ))}
        </div>
      </nav>

      {/* 하단 사용자 정보 및 설정 */}
      <div className="border-t border-gray-700 p-4">
        {/* 테마 토글 */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-gray-400">테마</span>
          <button
            onClick={toggleTheme}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
          >
            {theme === 'light' ? '🌙' : '☀️'}
          </button>
        </div>

        {/* 역할 전환 */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-400">역할</span>
          <select
            value={userRole}
            onChange={(e) => setUserRole(e.target.value)}
            className="bg-gray-800 text-white text-sm rounded px-2 py-1 border border-gray-700"
          >
            <option value="admin">관리자</option>
            <option value="agent">상담원</option>
          </select>
        </div>

        {/* 이슈 표시 */}
        <div className="mt-3 px-3 py-2 bg-red-600 rounded-lg flex items-center gap-2 text-sm">
          <span className="w-2 h-2 bg-white rounded-full"></span>
          <span>1 Issue</span>
          <button className="ml-auto text-white hover:text-gray-300">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* 모바일 오버레이 */}
      {isMobile && isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      <div className="flex h-screen">
        {/* 데스크톱 사이드바 */}
        {!isMobile && (
          <Sidebar className="w-64 shrink-0" />
        )}

        {/* 모바일 사이드바 (오버레이) */}
        {isMobile && (
          <Sidebar 
            className={`fixed top-0 left-0 h-full w-80 z-50 transform transition-transform duration-300 ease-in-out ${
              isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
            } lg:hidden`} 
          />
        )}

        {/* 메인 콘텐츠 */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* 모바일 상단 헤더 */}
          {isMobile && (
            <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3 lg:hidden">
              <div className="flex items-center justify-between">
                {/* 햄버거 버튼 */}
                <button
                  onClick={() => setIsMobileMenuOpen(true)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <svg className="w-6 h-6 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>

                {/* 모바일 로고 */}
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-purple-600 rounded flex items-center justify-center text-white text-sm font-bold">
                    C
                  </div>
                  <h1 className="text-lg font-bold text-gray-900 dark:text-white">CRM</h1>
                </div>

                {/* 테마 버튼 */}
                <button
                  onClick={toggleTheme}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <span className="text-lg">{theme === 'light' ? '🌙' : '☀️'}</span>
                </button>
              </div>
            </header>
          )}

          {/* 메인 콘텐츠 영역 */}
          <main className="flex-1 overflow-y-auto">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}