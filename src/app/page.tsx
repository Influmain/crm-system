'use client'

import { useState, useEffect } from 'react'
import { useDropzone } from 'react-dropzone'
import * as XLSX from 'xlsx'
import { supabase } from '../../lib/supabase'
import { 
  Upload, 
  Database, 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertCircle, 
  Settings, 
  TrendingUp, 
  Users, 
  Clock, 
  Search,
  Eye,
  Activity,
  FileText,
  UserPlus,
  Trash2,
  XCircle
} from 'lucide-react'
import Layout from '../components/Layout'
import { ToastContainer, ToastNotification } from '../components/Toast'

// 기존 서비스 클래스들 유지
class StatsService {
  static async getDashboardStats() {
    try {
      const now = new Date()
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const endOfToday = new Date(today.getTime() + 24 * 60 * 60 * 1000)
      
      const { count: totalLeads, error: totalError } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
      
      if (totalError) console.error('총 리드 수 조회 오류:', totalError)

      const { count: todayUploads, error: todayError } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', today.toISOString())
        .lt('created_at', endOfToday.toISOString())
      
      if (todayError) console.error('오늘 업로드 수 조회 오류:', todayError)

      return {
        totalLeads: totalLeads || 0,
        todayUploads: todayUploads || 0,
        unassigned: totalLeads || 0,
        processing: 0
      }
      
    } catch (error) {
      console.error('통계 데이터 조회 오류:', error)
      return { totalLeads: 0, todayUploads: 0, unassigned: 0, processing: 0 }
    }
  }

  static async getGrowthRate() {
    try {
      const now = new Date()
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
      const twoWeeksAgo = new Date(today.getTime() - 14 * 24 * 60 * 60 * 1000)

      const { count: thisWeek } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', lastWeek.toISOString())
        .lt('created_at', today.toISOString())

      const { count: lastWeekCount } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', twoWeeksAgo.toISOString())
        .lt('created_at', lastWeek.toISOString())

      if (lastWeekCount === 0) return thisWeek > 0 ? 100 : 0
      
      const growthRate = ((thisWeek - lastWeekCount) / lastWeekCount) * 100
      return Math.round(growthRate * 10) / 10
      
    } catch (error) {
      console.error('성장률 계산 오류:', error)
      return 0
    }
  }

  static subscribeToLeadChanges(callback) {
    const subscription = supabase
      .channel('leads_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'leads' },
        (payload) => {
          console.log('리드 데이터 변경 감지:', payload)
          callback(payload)
        }
      )
      .subscribe()

    return subscription
  }
}

class DuplicateService {
  static checkInternalDuplicates(data, phoneField) {
    const phoneMap = new Map()
    const duplicates = []
    
    data.forEach((row, index) => {
      const phone = String(row[phoneField] || '').trim()
      if (phone) {
        if (phoneMap.has(phone)) {
          const existingIndex = phoneMap.get(phone)
          duplicates.push({
            phone,
            rows: [existingIndex, index],
            type: 'internal'
          })
        } else {
          phoneMap.set(phone, index)
        }
      }
    })
    
    return duplicates
  }

  static async checkDatabaseDuplicates(data, phoneField) {
    try {
      const phones = data
        .map(row => String(row[phoneField] || '').trim())
        .filter(phone => phone !== '')
      
      if (phones.length === 0) return []

      const batchSize = 100
      const duplicates = []
      
      for (let i = 0; i < phones.length; i += batchSize) {
        const batch = phones.slice(i, i + batchSize)
        
        const { data: existingLeads, error } = await supabase
          .from('leads')
          .select('phone, created_at, expert, db_source')
          .in('phone', batch)
        
        if (error) {
          console.error('DB 중복 검사 오류:', error)
          continue
        }
        
        existingLeads?.forEach(existingLead => {
          duplicates.push({
            phone: existingLead.phone,
            existingData: {
              createdAt: existingLead.created_at,
              expert: existingLead.expert,
              dbSource: existingLead.db_source
            },
            type: 'database'
          })
        })
      }
      
      return duplicates
      
    } catch (error) {
      console.error('DB 중복 검사 실패:', error)
      return []
    }
  }

  static async runFullDuplicateCheck(data, phoneField) {
    const [internalDuplicates, dbDuplicates] = await Promise.all([
      this.checkInternalDuplicates(data, phoneField),
      this.checkDatabaseDuplicates(data, phoneField)
    ])
    
    return {
      internal: internalDuplicates,
      database: dbDuplicates,
      totalRows: data.length,
      validRows: data.filter(row => String(row[phoneField] || '').trim() !== '').length
    }
  }
}

// 컴팩트한 통계 카드 컴포넌트
function StatsCards({ theme }) {
  const [stats, setStats] = useState({
    totalLeads: 0,
    todayUploads: 0,
    unassigned: 0,
    processing: 0
  })
  const [growthRate, setGrowthRate] = useState(0)
  const [isLoading, setIsLoading] = useState(true)

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

  useEffect(() => {
    loadStats()
  }, [])

  const statCards = [
    {
      title: '총 리드',
      value: stats.totalLeads,
      icon: Database,
      color: theme.info,
      change: `+${growthRate}%`,
      changeColor: growthRate >= 0 ? theme.success : theme.error
    },
    {
      title: '오늘',
      value: stats.todayUploads,
      icon: TrendingUp,
      color: theme.success,
      change: '업로드',
      changeColor: theme.textMuted
    },
    {
      title: '미배분',
      value: stats.unassigned,
      icon: Users,
      color: theme.warning,
      change: '대기중',
      changeColor: theme.warning
    },
    {
      title: '처리중',
      value: stats.processing,
      icon: Clock,
      color: theme.info,
      change: '진행',
      changeColor: theme.info
    }
  ]

  if (isLoading) {
    return (
      <div className="grid grid-cols-4 gap-3 mb-4">
        {[1, 2, 3, 4].map((i) => (
          <div 
            key={i}
            className="rounded-lg p-3 animate-pulse"
            style={{ 
              backgroundColor: theme.cardBg,
              border: `1px solid ${theme.border}`
            }}
          >
            <div 
              className="h-3 rounded mb-2"
              style={{ backgroundColor: theme.hover }}
            />
            <div 
              className="h-5 rounded mb-1"
              style={{ backgroundColor: theme.hover }}
            />
            <div 
              className="h-2 rounded w-2/3"
              style={{ backgroundColor: theme.hover }}
            />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-4 gap-3 mb-4">
      {statCards.map((card, index) => (
        <div 
          key={index}
          className="rounded-lg p-3"
          style={{ 
            backgroundColor: theme.cardBg,
            border: `1px solid ${theme.border}`
          }}
        >
          <div className="flex items-center justify-between mb-1">
            <div className="text-xs font-medium" style={{ color: theme.textSecondary }}>
              {card.title}
            </div>
            <card.icon size={12} style={{ color: card.color }} />
          </div>
          
          <div className="text-lg font-bold mb-1" style={{ color: theme.textPrimary }}>
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

// DB 저장된 리드 확인 테이블 컴포넌트
function LeadsTable({ theme }) {
  const [leads, setLeads] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [totalCount, setTotalCount] = useState(0)
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState('created_at')
  const [sortOrder, setSortOrder] = useState('desc')

  // 리드 데이터 로드
  const loadLeads = async () => {
    setIsLoading(true)
    try {
      // 총 개수 가져오기
      const { count } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })

      setTotalCount(count || 0)

      // 실제 데이터 가져오기 (최신 100개)
      let query = supabase
        .from('leads')
        .select('*')
        .order(sortBy, { ascending: sortOrder === 'asc' })
        .limit(100)

      // 검색 조건 추가
      if (searchTerm) {
        query = query.or(`phone.ilike.%${searchTerm}%,expert.ilike.%${searchTerm}%,db_source.ilike.%${searchTerm}%`)
      }

      const { data, error } = await query

      if (error) {
        console.error('리드 데이터 로드 오류:', error)
        setLeads([])
      } else {
        setLeads(data || [])
      }
    } catch (error) {
      console.error('리드 데이터 로드 실패:', error)
      setLeads([])
    } finally {
      setIsLoading(false)
    }
  }

  // 컴포넌트 마운트 시 데이터 로드
  useEffect(() => {
    loadLeads()
  }, [searchTerm, sortBy, sortOrder])

  // 실시간 업데이트 구독
  useEffect(() => {
    const subscription = StatsService.subscribeToLeadChanges(() => {
      loadLeads()
    })

    return () => {
      if (subscription) {
        subscription.unsubscribe()
      }
    }
  }, [])

  // 정렬 변경 핸들러
  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')
    } else {
      setSortBy(field)
      setSortOrder('desc')
    }
  }

  // 날짜 포맷팅
  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // 전화번호 포맷팅
  const formatPhone = (phone) => {
    if (!phone) return '-'
    const cleaned = phone.replace(/\D/g, '')
    if (cleaned.length === 11) {
      return cleaned.replace(/(\d{3})(\d{4})(\d{4})/, '$1-$2-$3')
    }
    return phone
  }

  return (
    <div 
      className="rounded-lg p-4"
      style={{ 
        backgroundColor: theme.cardBg,
        border: `1px solid ${theme.border}`
      }}
    >
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Database size={20} style={{ color: theme.info }} />
          <div>
            <h2 className="text-lg font-semibold" style={{ color: theme.textPrimary }}>
              🗄️ 저장된 리드 현황
            </h2>
            <p className="text-sm" style={{ color: theme.textSecondary }}>
              데이터베이스에 저장된 모든 리드를 확인할 수 있습니다
            </p>
          </div>
        </div>
        
        {/* 우측 상단 정보 */}
        <div className="flex items-center gap-4">
          <div className="text-center">
            <div className="text-xl font-bold" style={{ color: theme.success }}>
              {totalCount.toLocaleString()}
            </div>
            <div className="text-xs" style={{ color: theme.textSecondary }}>
              총 리드 수
            </div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold" style={{ color: theme.info }}>
              {leads.length.toLocaleString()}
            </div>
            <div className="text-xs" style={{ color: theme.textSecondary }}>
              표시 중
            </div>
          </div>
        </div>
      </div>

      {/* 검색 및 필터 */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex-1 relative">
          <input
            type="text"
            placeholder="전화번호, 전문가명, DB업체로 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm rounded-md"
            style={{ 
              color: theme.textPrimary,
              backgroundColor: theme.cardBg,
              border: `1px solid ${theme.border}`
            }}
          />
          <Search 
            size={16} 
            className="absolute left-3 top-1/2 transform -translate-y-1/2"
            style={{ color: theme.textSecondary }}
          />
        </div>
        
        <select
          value={`${sortBy}-${sortOrder}`}
          onChange={(e) => {
            const [field, order] = e.target.value.split('-')
            setSortBy(field)
            setSortOrder(order)
          }}
          className="px-3 py-2 text-sm rounded-md"
          style={{ 
            color: theme.textPrimary,
            backgroundColor: theme.cardBg,
            border: `1px solid ${theme.border}`
          }}
        >
          <option value="created_at-desc">최신순</option>
          <option value="created_at-asc">오래된순</option>
          <option value="expert-asc">전문가명 A-Z</option>
          <option value="db_source-asc">DB업체 A-Z</option>
        </select>

        <button
          onClick={loadLeads}
          className="px-3 py-2 text-sm rounded-md flex items-center gap-2"
          style={{ 
            backgroundColor: theme.info,
            color: '#FFFFFF'
          }}
        >
          🔄 새로고침
        </button>
      </div>

      {/* 테이블 */}
      <div 
        className="border rounded-lg overflow-hidden"
        style={{ borderColor: theme.border }}
      >
        {/* 테이블 헤더 */}
        <div 
          className="grid grid-cols-6 gap-4 px-4 py-3 text-sm font-medium border-b"
          style={{ 
            backgroundColor: theme.hover,
            borderColor: theme.border,
            color: theme.textSecondary
          }}
        >
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => handleSort('db_source')}>
            🏢 DB업체
            {sortBy === 'db_source' && (
              <span>{sortOrder === 'desc' ? '↓' : '↑'}</span>
            )}
          </div>
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => handleSort('expert')}>
            👨‍💼 전문가
            {sortBy === 'expert' && (
              <span>{sortOrder === 'desc' ? '↓' : '↑'}</span>
            )}
          </div>
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => handleSort('phone')}>
            📞 전화번호
            {sortBy === 'phone' && (
              <span>{sortOrder === 'desc' ? '↓' : '↑'}</span>
            )}
          </div>
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => handleSort('interest_type')}>
            💼 관심분야
            {sortBy === 'interest_type' && (
              <span>{sortOrder === 'desc' ? '↓' : '↑'}</span>
            )}
          </div>
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => handleSort('contact_date')}>
            📅 연락일
            {sortBy === 'contact_date' && (
              <span>{sortOrder === 'desc' ? '↓' : '↑'}</span>
            )}
          </div>
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => handleSort('created_at')}>
            ⏰ 등록일시
            {sortBy === 'created_at' && (
              <span>{sortOrder === 'desc' ? '↓' : '↑'}</span>
            )}
          </div>
        </div>

        {/* 테이블 바디 */}
        <div 
          className="max-h-96 overflow-y-auto"
          style={{ backgroundColor: theme.cardBg }}
        >
          {isLoading ? (
            <div className="space-y-1">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="grid grid-cols-6 gap-4 px-4 py-3">
                  {[...Array(6)].map((_, j) => (
                    <div 
                      key={j}
                      className="h-4 rounded animate-pulse"
                      style={{ backgroundColor: theme.hover }}
                    />
                  ))}
                </div>
              ))}
            </div>
          ) : leads.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-4xl mb-2">📭</div>
              <div className="text-lg font-medium mb-2" style={{ color: theme.textPrimary }}>
                {searchTerm ? '검색 결과가 없습니다' : '저장된 리드가 없습니다'}
              </div>
              <div className="text-sm" style={{ color: theme.textSecondary }}>
                {searchTerm ? '다른 검색어를 시도해보세요' : '리드를 업로드하여 데이터를 추가해보세요'}
              </div>
            </div>
          ) : (
            <div className="space-y-0">
              {leads.map((lead) => (
                <div 
                  key={lead.id}
                  className="grid grid-cols-6 gap-4 px-4 py-3 text-sm border-b hover:bg-opacity-50 transition-colors"
                  style={{ 
                    borderColor: theme.border,
                    color: theme.textPrimary
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = theme.hover}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <div className="truncate" title={lead.db_source}>
                    {lead.db_source || '-'}
                  </div>
                  <div className="truncate" title={lead.expert}>
                    {lead.expert || '-'}
                  </div>
                  <div className="font-mono" title={lead.phone}>
                    {formatPhone(lead.phone)}
                  </div>
                  <div className="truncate" title={lead.interest_type}>
                    {lead.interest_type || '-'}
                  </div>
                  <div className="text-xs">
                    {lead.contact_date ? new Date(lead.contact_date).toLocaleDateString('ko-KR') : '-'}
                  </div>
                  <div className="text-xs" style={{ color: theme.textSecondary }}>
                    {formatDate(lead.created_at)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 테이블 푸터 정보 */}
      <div className="flex items-center justify-between mt-3 text-xs" style={{ color: theme.textSecondary }}>
        <div>
          {searchTerm ? (
            <>검색결과: {leads.length}건</>
          ) : (
            <>최근 {leads.length}건 표시 (전체 {totalCount.toLocaleString()}건)</>
          )}
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div 
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: theme.success }}
            />
            <span>활성 리드</span>
          </div>
          <div>마지막 업데이트: {new Date().toLocaleTimeString('ko-KR')}</div>
        </div>
      </div>
    </div>
  )
}

interface Lead {
  db_source: string
  expert: string
  phone: string
  interest_type: string
  contact_date: string
  payment_amount?: number
  memo?: string
}

export default function CRMHome() {
  const [excelData, setExcelData] = useState<any[]>([])
  const [headers, setHeaders] = useState<string[]>([])
  const [fileName, setFileName] = useState<string>('')
  const [mappings, setMappings] = useState({
    db_source: '',
    expert: '',
    phone: '',
    interest_type: '',
    contact_date: ''
  })
  const [isLoading, setIsLoading] = useState(false)
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [duplicateResult, setDuplicateResult] = useState(null)
  const [isDuplicateChecking, setIsDuplicateChecking] = useState(false)
  const [showDuplicateDetails, setShowDuplicateDetails] = useState(false)
  const [notifications, setNotifications] = useState<ToastNotification[]>([])
  const [results, setResults] = useState<{
    total: number
    saved: number
    duplicates: number
    errors: string[]
  }>()

  // 다크모드 상태를 Layout과 동기화
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme')
      if (saved) {
        setIsDarkMode(saved === 'dark')
      } else {
        setIsDarkMode(window.matchMedia('(prefers-color-scheme: dark)').matches)
      }
      
      const handleStorageChange = () => {
        const newTheme = localStorage.getItem('theme')
        if (newTheme) {
          setIsDarkMode(newTheme === 'dark')
        }
      }
      
      window.addEventListener('storage', handleStorageChange)
      
      const interval = setInterval(() => {
        const currentTheme = localStorage.getItem('theme')
        if (currentTheme && (currentTheme === 'dark') !== isDarkMode) {
          setIsDarkMode(currentTheme === 'dark')
        }
      }, 100)

      return () => {
        window.removeEventListener('storage', handleStorageChange)
        clearInterval(interval)
      }
    }
  }, [isDarkMode])

  // 테마 색상 정의
  const theme = {
    light: {
      bg: '#FAFAFA',
      cardBg: '#FFFFFF', 
      border: '#E5E5E5',
      textPrimary: '#2F2F2F',
      textSecondary: '#9B9A97',
      textMuted: '#6B7280',
      hover: '#F5F5F5',
      active: '#F0F0F0',
      success: '#10B981',
      successBg: '#ECFDF5',
      successBorder: '#A7F3D0',
      error: '#EF4444',
      errorBg: '#FEF2F2',
      errorBorder: '#FECACA',
      warning: '#F59E0B',
      warningBg: '#FFFBEB',
      warningBorder: '#FDE68A',
      info: '#3B82F6',
      infoBg: '#EFF6FF',
      infoBorder: '#BFDBFE'
    },
    dark: {
      bg: '#191919',
      cardBg: '#2F2F2F',
      border: '#3A3A3A',
      textPrimary: '#E5E5E5',
      textSecondary: '#9B9B9B',
      textMuted: '#7A7A7A',
      hover: '#373737',
      active: '#404040',
      success: '#10B981',
      successBg: '#064E3B',
      successBorder: '#065F46',
      error: '#EF4444',
      errorBg: '#7F1D1D',
      errorBorder: '#991B1B',
      warning: '#F59E0B',
      warningBg: '#78350F',
      warningBorder: '#92400E',
      info: '#3B82F6',
      infoBg: '#1E3A8A',
      infoBorder: '#1D4ED8'
    }
  }

  const currentTheme = isDarkMode ? theme.dark : theme.light

  // 개선된 알림 시스템
  const addNotification = (message: string, type: 'success' | 'warning' | 'error' | 'info', duration?: number) => {
    const newNotification: ToastNotification = {
      id: Date.now() + Math.random(),
      message,
      type,
      timestamp: new Date(),
      duration: duration || 4000
    }
    
    setNotifications(prev => [newNotification, ...prev])
    
    setTimeout(() => {
      removeNotification(newNotification.id)
    }, newNotification.duration)
  }

  // 알림 제거 함수
  const removeNotification = (id: number) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
  }

  // 필드 한글명 매핑
  const getFieldDisplayName = (fieldName: string) => {
    const fieldNames = {
      db_source: 'DB업체',
      expert: '전문가',
      phone: '전화번호',
      interest_type: '관심유형',
      contact_date: '연락일시'
    }
    return fieldNames[fieldName] || fieldName
  }

  // 매핑 완료 핸들러
  const handleMappingComplete = (fieldName: string, value: string) => {
    setMappings(prev => ({
      ...prev,
      [fieldName]: value
    }))
    
    if (fieldName === 'phone' && value) {
      addNotification('📞 전화번호 필드 매핑이 완료되었습니다!', 'success', 3000)
      setDuplicateResult(null)
    } else if (value) {
      addNotification(`✅ ${getFieldDisplayName(fieldName)} 매핑 완료`, 'info', 2000)
    }
  }

  // 중복 검사 실행
  const runDuplicateCheck = async () => {
    if (!excelData.length || !mappings.phone) {
      addNotification('⚠️ 파일과 전화번호 매핑이 필요합니다!', 'warning')
      return
    }

    setIsDuplicateChecking(true)
    addNotification('🔍 중복 검사를 시작합니다...', 'info', 2000)
    
    try {
      const result = await DuplicateService.runFullDuplicateCheck(excelData, mappings.phone)
      setDuplicateResult(result)
      
      const validCount = result.validRows - result.internal.length - result.database.length
      const duplicateCount = result.internal.length + result.database.length
      
      if (duplicateCount > 0) {
        addNotification(
          `🔍 중복 검사 완료! 저장 가능: ${validCount}건, 중복 제외: ${duplicateCount}건`,
          'warning',
          5000
        )
      } else {
        addNotification(
          `✅ 중복 검사 완료! 모든 ${validCount}건이 저장 가능합니다`,
          'success',
          4000
        )
      }
      
    } catch (error) {
      console.error('중복 검사 실패:', error)
      addNotification('❌ 중복 검사 중 오류가 발생했습니다', 'error')
    } finally {
      setIsDuplicateChecking(false)
    }
  }

  // 파일 업로드 처리
  const onDrop = (acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (!file) return

    setFileName(file.name)
    addNotification('📤 파일을 읽는 중입니다...', 'info', 2000)

    const reader = new FileReader()
    reader.onload = (e) => {
      const data = e.target?.result
      const workbook = XLSX.read(data, { type: 'binary' })
      const sheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[sheetName]
      const jsonData = XLSX.utils.sheet_to_json(worksheet)

      if (jsonData.length > 0) {
        const firstRow = jsonData[0] as Record<string, any>
        const columnHeaders = Object.keys(firstRow)
        
        setExcelData(jsonData)
        setHeaders(columnHeaders)
        setResults(undefined)
        setDuplicateResult(null)
        
        addNotification(
          `📊 ${file.name} 업로드 완료! ${jsonData.length}건의 데이터를 불러왔습니다`,
          'success',
          4000
        )
        
        setTimeout(() => {
          addNotification('📝 다음: 데이터 매핑을 진행해주세요', 'info', 3000)
        }, 1500)
      } else {
        addNotification('⚠️ 파일에서 데이터를 찾을 수 없습니다', 'warning')
      }
    }
    
    reader.onerror = () => {
      addNotification('❌ 파일 읽기 중 오류가 발생했습니다', 'error')
    }
    
    reader.readAsBinaryString(file)
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'text/csv': ['.csv']
    },
    maxFiles: 1
  })

  // 데이터 저장
  const saveLeads = async () => {
    if (!excelData.length || !mappings.phone || !duplicateResult) {
      addNotification('⚠️ 중복 검사를 먼저 진행해주세요!', 'warning')
      return
    }

    setIsLoading(true)
    addNotification('💾 데이터베이스에 저장 중입니다...', 'info', 2000)
    
    const errors: string[] = []
    let saved = 0

    try {
      const duplicatePhones = new Set([
        ...duplicateResult.database.map(d => d.phone),
        ...duplicateResult.internal.map(d => d.phone)
      ])

      const validLeads: Lead[] = excelData
        .map((row: any) => ({
          db_source: mappings.db_source ? String(row[mappings.db_source] || '') : '',
          expert: mappings.expert ? String(row[mappings.expert] || '') : '',
          phone: String(row[mappings.phone] || '').trim(),
          interest_type: mappings.interest_type ? String(row[mappings.interest_type] || '') : '',
          contact_date: mappings.contact_date ? 
            new Date(row[mappings.contact_date]).toISOString().split('T')[0] : 
            new Date().toISOString().split('T')[0],
          payment_amount: null,
          memo: ''
        }))
        .filter(lead => lead.phone && lead.phone !== '' && !duplicatePhones.has(lead.phone))

      if (validLeads.length === 0) {
        errors.push('저장할 유효한 데이터가 없습니다.')
        addNotification('⚠️ 저장할 유효한 데이터가 없습니다', 'warning')
        setResults({
          total: excelData.length,
          saved: 0,
          duplicates: duplicateResult.database.length + duplicateResult.internal.length,
          errors
        })
        setIsLoading(false)
        return
      }

      const { data, error: insertError } = await supabase
        .from('leads')
        .insert(validLeads)
        .select()

      if (insertError) {
        errors.push(`저장 오류: ${insertError.message}`)
        addNotification('❌ 데이터베이스 저장 중 오류가 발생했습니다', 'error')
      } else {
        saved = data?.length || 0
        
        addNotification(
          `🎉 저장 완료! ${saved}건의 리드가 성공적으로 등록되었습니다`,
          'success',
          6000
        )
        
        if (duplicateResult.database.length > 0 || duplicateResult.internal.length > 0) {
          setTimeout(() => {
            addNotification(
              `📊 중복 제외: DB 중복 ${duplicateResult.database.length}건, 파일 내 중복 ${duplicateResult.internal.length}건`,
              'info',
              4000
            )
          }, 1000)
        }
      }

      setResults({
        total: excelData.length,
        saved,
        duplicates: duplicateResult.database.length + duplicateResult.internal.length,
        errors
      })

    } catch (err) {
      errors.push(`전체 처리 오류: ${err}`)
      addNotification('❌ 처리 중 예상치 못한 오류가 발생했습니다', 'error')
      setResults({
        total: excelData.length,
        saved: 0,
        duplicates: duplicateResult.database.length + duplicateResult.internal.length,
        errors
      })
    }

    setIsLoading(false)
  }

  const canCheckDuplicate = excelData.length > 0 && mappings.phone && !isDuplicateChecking
  const canSave = duplicateResult && !isLoading

  const recentActivities = [
    { id: 1, title: 'marketing_leads.xlsx', message: '27건 업로드', time: '30분 전', status: 'success' },
    { id: 2, title: '리드 배분', message: '15건 배분', time: '2시간 전', status: 'success' },
    { id: 3, title: '중복 제거', message: '5건 제거', time: '오늘 오전', status: 'warning' }
  ]

  return (
    <Layout currentPage="upload">
      <div className="min-h-screen p-4" style={{ backgroundColor: currentTheme.bg }}>
        <div className="mb-4">
          <h1 className="text-lg font-semibold mb-1" style={{ color: currentTheme.textPrimary }}>
            📊 리드 업로드
          </h1>
          <p className="text-sm" style={{ color: currentTheme.textSecondary }}>
            엑셀 파일을 업로드하여 새로운 리드를 시스템에 추가하세요
          </p>
        </div>

        <StatsCards theme={currentTheme} />

        <div className="grid grid-cols-3 gap-4 mb-4">
          {/* 파일 업로드 */}
          <div 
            className="rounded-lg p-4"
            style={{ 
              backgroundColor: currentTheme.cardBg,
              border: `1px solid ${currentTheme.border}`
            }}
          >
            <div className="flex items-center gap-2 mb-3">
              <Upload size={16} style={{ color: currentTheme.info }} />
              <span className="text-sm font-medium" style={{ color: currentTheme.textPrimary }}>📤 파일 업로드</span>
            </div>

            <div
              {...getRootProps()}
              className="border border-dashed rounded-lg p-8 text-center cursor-pointer transition-all"
              style={{
                borderColor: excelData.length > 0 ? 
                  (isDarkMode ? currentTheme.border : currentTheme.success) : 
                  isDragActive ? currentTheme.info : currentTheme.border,
                backgroundColor: excelData.length > 0 ? 
                  (isDarkMode ? currentTheme.hover : currentTheme.successBg) :
                  isDragActive ? currentTheme.infoBg : 'transparent'
              }}
            >
              <input {...getInputProps()} />
              
              {excelData.length > 0 ? (
                <div className="text-4xl mb-3">📄</div>
              ) : isDragActive ? (
                <div className="text-4xl mb-3">📥</div>
              ) : (
                <div className="text-4xl mb-3">📊</div>
              )}
              
              {excelData.length > 0 ? (
                <>
                  <p className="text-sm font-medium mb-1" style={{ color: currentTheme.success }}>
                    ✅ 파일 업로드 완료
                  </p>
                  <p className="text-xs font-medium mb-1" style={{ color: currentTheme.textPrimary }}>
                    📄 {fileName}
                  </p>
                  <p className="text-xs" style={{ color: currentTheme.textSecondary }}>
                    🔄 다른 파일로 교체하려면 클릭
                  </p>
                </>
              ) : isDragActive ? (
                <p className="text-sm" style={{ color: currentTheme.info }}>📥 파일을 드롭해주세요</p>
              ) : (
                <>
                  <p className="text-sm font-medium mb-1" style={{ color: currentTheme.textPrimary }}>
                    📤 파일을 드래그하거나 클릭하세요
                  </p>
                  <p className="text-xs" style={{ color: currentTheme.textSecondary }}>
                    📋 Excel (.xlsx, .xls), CSV 지원
                  </p>
                </>
              )}
            </div>

            {excelData.length > 0 && (
              <div 
                className="mt-3 p-3 rounded-md"
                style={{ 
                  backgroundColor: isDarkMode ? currentTheme.hover : currentTheme.successBg,
                  border: `1px solid ${isDarkMode ? currentTheme.border : currentTheme.successBorder}`
                }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span>✅</span>
                  <span className="text-sm font-medium" style={{ color: currentTheme.success }}>
                    📄 {excelData.length}건 로드 완료
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setExcelData([])
                      setHeaders([])
                      setFileName('')
                      setMappings({
                        db_source: '',
                        expert: '',
                        phone: '',
                        interest_type: '',
                        contact_date: ''
                      })
                      setDuplicateResult(null)
                      setResults(undefined)
                      addNotification('🗑️ 파일 데이터가 삭제되었습니다', 'info')
                    }}
                    className="ml-auto text-xs px-2 py-1 rounded"
                    style={{ 
                      backgroundColor: currentTheme.error,
                      color: '#FFFFFF'
                    }}
                  >
                    🗑️ 삭제
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* 데이터 매핑 */}
          <div 
            className="rounded-lg p-4"
            style={{ 
              backgroundColor: currentTheme.cardBg,
              border: `1px solid ${currentTheme.border}`
            }}
          >
            <div className="flex items-center gap-2 mb-3">
              <Settings size={16} style={{ color: currentTheme.info }} />
              <span className="text-sm font-medium" style={{ color: currentTheme.textPrimary }}>⚙️ 데이터 매핑</span>
            </div>

            <div className="space-y-3">
              {Object.entries({
                db_source: { label: '🏢 DB업체', emoji: '🏢' },
                expert: { label: '👨‍💼 전문가', emoji: '👨‍💼' },
                phone: { label: '📞 전화번호', emoji: '📞' },
                interest_type: { label: '💼 관심유형', emoji: '💼' },
                contact_date: { label: '📅 일시', emoji: '📅' }
              }).map(([key, config]) => (
                <div key={key}>
                  <div className="text-xs font-medium mb-1 flex items-center gap-1" style={{ color: currentTheme.textSecondary }}>
                    <span>{config.emoji}</span>
                    <span>{config.label.replace(config.emoji + ' ', '')}</span>
                    {key === 'phone' && <span className="text-red-500">*</span>}
                  </div>
                  <select
                    value={mappings[key]}
                    onChange={(e) => handleMappingComplete(key, e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-md"
                    style={{ 
                      color: currentTheme.textPrimary,
                      backgroundColor: currentTheme.cardBg,
                      border: `1px solid ${currentTheme.border}`
                    }}
                    disabled={headers.length === 0}
                  >
                    <option value="">컬럼을 선택하세요 {config.emoji}</option>
                    {headers.map(header => (
                      <option key={header} value={header}>{header}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>

            {mappings.phone && (
              <div 
                className="mt-4 p-3 rounded-md"
                style={{ 
                  backgroundColor: currentTheme.successBg,
                  border: `1px solid ${currentTheme.successBorder}`
                }}
              >
                <div className="flex items-center gap-2">
                  <span>✅</span>
                  <span className="text-sm" style={{ color: currentTheme.success }}>
                    매핑 완료
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* 처리 및 저장 */}
          <div 
            className="rounded-lg p-4"
            style={{ 
              backgroundColor: currentTheme.cardBg,
              border: `1px solid ${currentTheme.border}`
            }}
          >
            <div className="flex items-center gap-2 mb-3">
              <Database size={16} style={{ color: currentTheme.info }} />
              <span className="text-sm font-medium" style={{ color: currentTheme.textPrimary }}>🛠️ 처리 및 저장</span>
            </div>

            <div className="space-y-3">
              <button
                onClick={runDuplicateCheck}
                disabled={!canCheckDuplicate}
                className="w-full py-2 px-3 rounded-md transition-colors flex items-center justify-center text-sm"
                style={{
                  backgroundColor: isDuplicateChecking ? currentTheme.textMuted : 
                                 duplicateResult ? currentTheme.success :
                                 canCheckDuplicate ? currentTheme.info : currentTheme.textMuted,
                  color: '#FFFFFF',
                  cursor: canCheckDuplicate ? 'pointer' : 'not-allowed'
                }}
              >
                {isDuplicateChecking ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                    🔍 검사중...
                  </>
                ) : duplicateResult ? (
                  <>✅ 검사완료</>
                ) : (
                  <>🔍 중복검사 시작</>
                )}
              </button>

              {duplicateResult && (
                <div 
                  className="p-3 rounded-md"
                  style={{ backgroundColor: currentTheme.hover }}
                >
                  <div className="grid grid-cols-3 gap-2 text-center mb-3">
                    <div>
                      <div className="text-lg font-bold" style={{ color: currentTheme.success }}>
                        {duplicateResult.validRows - duplicateResult.internal.length - duplicateResult.database.length}
                      </div>
                      <div className="text-xs" style={{ color: currentTheme.textSecondary }}>✅ 저장가능</div>
                    </div>
                    <div>
                      <div className="text-lg font-bold" style={{ color: currentTheme.warning }}>
                        {duplicateResult.database.length}
                      </div>
                      <div className="text-xs" style={{ color: currentTheme.textSecondary }}>⚠️ DB중복</div>
                    </div>
                    <div>
                      <div className="text-lg font-bold" style={{ color: currentTheme.error }}>
                        {duplicateResult.internal.length}
                      </div>
                      <div className="text-xs" style={{ color: currentTheme.textSecondary }}>❌ 파일중복</div>
                    </div>
                  </div>
                  
                  {(duplicateResult.internal.length > 0 || duplicateResult.database.length > 0) && (
                    <button
                      onClick={() => setShowDuplicateDetails(true)}
                      className="w-full py-2 px-3 rounded text-sm"
                      style={{
                        backgroundColor: currentTheme.active,
                        color: currentTheme.textPrimary
                      }}
                    >
                      👁️ 상세보기
                    </button>
                  )}
                </div>
              )}

              <button
                onClick={saveLeads}
                disabled={!canSave}
                className="w-full py-2 px-3 rounded-md transition-colors flex items-center justify-center text-sm font-medium"
                style={{
                  backgroundColor: isLoading ? currentTheme.textMuted : 
                                 canSave ? '#000000' : currentTheme.textMuted,
                  color: '#FFFFFF',
                  cursor: canSave ? 'pointer' : 'not-allowed'
                }}
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                    💾 저장중...
                  </>
                ) : (
                  <>💾 DB저장</>
                )}
              </button>
            </div>

            <div 
              className="mt-6 p-3 rounded-md"
              style={{ backgroundColor: currentTheme.hover }}
            >
              <div className="flex items-center gap-2 mb-3">
                <span>📈</span>
                <span className="text-sm font-medium" style={{ color: currentTheme.textPrimary }}>최근 활동</span>
              </div>
              
              <div className="space-y-2 mb-12">
                {recentActivities.map((item) => (
                  <div key={item.id} className="flex items-center gap-2">
                    <span className="text-sm">
                      {item.status === 'success' ? '✅' :
                       item.status === 'warning' ? '⚠️' : '❌'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium" style={{ color: currentTheme.textPrimary }}>
                        {item.title}
                      </div>
                      <div className="text-xs" style={{ color: currentTheme.textSecondary }}>
                        {item.message} • {item.time}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="flex justify-end gap-4 text-xs border-t pt-3" style={{ borderColor: currentTheme.border }}>
                <div className="text-center">
                  <div className="font-bold text-lg" style={{ color: currentTheme.textPrimary }}>
                    {results ? results.total : 0}
                  </div>
                  <div style={{ color: currentTheme.textSecondary }}>업로드</div>
                </div>
                <div className="text-center">
                  <div className="font-bold text-lg" style={{ color: currentTheme.success }}>
                    {results ? results.saved : 0}
                  </div>
                  <div style={{ color: currentTheme.textSecondary }}>저장됨</div>
                </div>
                <div className="text-center">
                  <div className="font-bold text-lg" style={{ color: currentTheme.warning }}>
                    {results ? results.duplicates : 0}
                  </div>
                  <div style={{ color: currentTheme.textSecondary }}>중복제외</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <LeadsTable theme={currentTheme} />

        {showDuplicateDetails && duplicateResult && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div 
              className="rounded-lg p-6 w-[600px] max-h-[80vh] overflow-hidden"
              style={{ backgroundColor: currentTheme.cardBg }}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold" style={{ color: currentTheme.textPrimary }}>
                  중복 데이터 상세
                </h3>
                <button
                  onClick={() => setShowDuplicateDetails(false)}
                  className="text-xl"
                  style={{ color: currentTheme.textSecondary }}
                >
                  ×
                </button>
              </div>

              <div className="space-y-4 overflow-y-auto max-h-96">
                {duplicateResult.database.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold mb-2" style={{ color: currentTheme.warning }}>
                      🗄️ DB 중복 ({duplicateResult.database.length}건)
                    </h4>
                    <div className="space-y-1">
                      {duplicateResult.database.slice(0, 5).map((dup, index) => (
                        <div 
                          key={index}
                          className="p-2 rounded text-sm"
                          style={{ backgroundColor: currentTheme.warningBg }}
                        >
                          <span style={{ color: currentTheme.textPrimary }}>{dup.phone}</span>
                          <span className="ml-2 text-xs" style={{ color: currentTheme.textSecondary }}>
                            (기존: {dup.existingData.expert})
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {duplicateResult.internal.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold mb-2" style={{ color: currentTheme.error }}>
                      📄 파일 내 중복 ({duplicateResult.internal.length}건)
                    </h4>
                    <div className="space-y-1">
                      {duplicateResult.internal.slice(0, 5).map((dup, index) => (
                        <div 
                          key={index}
                          className="p-2 rounded text-sm"
                          style={{ backgroundColor: currentTheme.errorBg }}
                        >
                          <span style={{ color: currentTheme.textPrimary }}>{dup.phone}</span>
                          <span className="ml-2 text-xs" style={{ color: currentTheme.textSecondary }}>
                            (행 {dup.rows.join(', ')})
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end mt-4">
                <button
                  onClick={() => setShowDuplicateDetails(false)}
                  className="px-4 py-2 text-sm rounded-md"
                  style={{ 
                    backgroundColor: currentTheme.info,
                    color: '#FFFFFF'
                  }}
                >
                  확인
                </button>
              </div>
            </div>
          </div>
        )}

        <ToastContainer
          notifications={notifications}
          onClose={removeNotification}
          theme={currentTheme}
        />
      </div>
    </Layout>
  )
}