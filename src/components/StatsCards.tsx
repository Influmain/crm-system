// components/StatsCards.tsx
'use client'

import { useState, useEffect } from 'react'
import { Database, TrendingUp, Users, Clock } from 'lucide-react'
import { StatsService } from '../../lib/statsService'
import { getTheme } from '../../lib/theme'

interface StatsData {
  totalLeads: number
  todayUploads: number
  unassigned: number
  processing: number
}

interface StatsCardsProps {
  isDarkMode?: boolean
}

export default function StatsCards({ isDarkMode = false }: StatsCardsProps) {
  const [stats, setStats] = useState<StatsData>({
    totalLeads: 0,
    todayUploads: 0,
    unassigned: 0,
    processing: 0
  })
  const [growthRate, setGrowthRate] = useState<number>(0)
  const [isLoading, setIsLoading] = useState(true)

  const theme = getTheme(isDarkMode)

  // 통계 데이터 로드
  const loadStats = async () => {
    setIsLoading(true)
    try {
      const [statsData, growth] = await Promise.all([
        StatsService.getDashboardStats(),
        StatsService.getGrowthRate()
      ])
      
      setStats(statsData)
      setGrowthRate(growth)
    } catch (error) {
      console.error('통계 로드 실패:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // 컴포넌트 마운트 시 데이터 로드
  useEffect(() => {
    loadStats()
  }, [])

  // 실시간 업데이트 구독
  useEffect(() => {
    const subscription = StatsService.subscribeToLeadChanges(() => {
      loadStats() // 데이터 변경 시 재로드
    })

    return () => {
      if (subscription) {
        subscription.unsubscribe()
      }
    }
  }, [])

  const statCards = [
    {
      title: '총 리드 수',
      value: stats.totalLeads,
      icon: Database,
      color: theme.info,
      change: `↗ +${growthRate}% 지난주 대비`,
      changeColor: growthRate >= 0 ? theme.success : theme.error
    },
    {
      title: '오늘 업로드',
      value: stats.todayUploads,
      icon: TrendingUp,
      color: theme.success,
      change: '건',
      changeColor: theme.textMuted
    },
    {
      title: '미배분 리드',
      value: stats.unassigned,
      icon: Users,
      color: theme.warning,
      change: '배분 필요',
      changeColor: stats.unassigned > 0 ? theme.warning : theme.success
    },
    {
      title: '처리중',
      value: stats.processing,
      icon: Clock,
      color: theme.info,
      change: '진행중',
      changeColor: theme.info
    }
  ]

  if (isLoading) {
    return (
      <div className="grid grid-cols-4 gap-4 mb-8">
        {[1, 2, 3, 4].map((i) => (
          <div 
            key={i}
            className="rounded-lg p-4 animate-pulse"
            style={{ 
              backgroundColor: theme.cardBg,
              border: `1px solid ${theme.border}`
            }}
          >
            <div 
              className="h-4 rounded mb-2"
              style={{ backgroundColor: theme.hover }}
            />
            <div 
              className="h-8 rounded mb-1"
              style={{ backgroundColor: theme.hover }}
            />
            <div 
              className="h-3 rounded w-2/3"
              style={{ backgroundColor: theme.hover }}
            />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-4 gap-4 mb-8">
      {statCards.map((card, index) => (
        <div 
          key={index}
          className="rounded-lg p-4 transition-all duration-200 hover:shadow-sm"
          style={{ 
            backgroundColor: theme.cardBg,
            border: `1px solid ${theme.border}`
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs font-medium" style={{ color: theme.textSecondary }}>
              {card.title}
            </div>
            <card.icon size={14} style={{ color: card.color }} />
          </div>
          
          <div className="text-2xl font-bold mb-1" style={{ color: theme.textPrimary }}>
            {card.value.toLocaleString()}
          </div>
          
          <div className="text-xs" style={{ color: card.changeColor }}>
            {card.change}
          </div>
        </div>
      ))}
    </div>
  )
}

// 사용법:
// <StatsCards isDarkMode={isDarkMode} />