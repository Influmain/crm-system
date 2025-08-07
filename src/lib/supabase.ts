// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://okgrsbpznpmynillzoid.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9rZ3JzYnB6bnBteW5pbGx6b2lkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzUzNjk5NDUsImV4cCI6MjA1MDk0NTk0NX0.oF0RnP1X6gXOSBejbDcCWyYZJ3PQRDEVnwqd9CzD1QQ'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// 리드 데이터 타입 정의
export interface Lead {
  id?: number
  db_source?: string        // DB 출처/업체명
  expert?: string          // 담당 전문가/상담원
  phone: string           // 전화번호 (필수)
  interest_type?: string  // 관심 분야/상품 유형
  contact_date?: string   // 연락 예정일
  payment_amount?: number // 결제 금액
  memo?: string          // 메모/비고
  created_at?: string
  updated_at?: string
}

// 리드 CRUD 함수들
export const leadService = {
  // 모든 리드 조회
  async getAll() {
    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (error) throw error
    return data
  },

  // 리드 생성
  async create(lead: Omit<Lead, 'id' | 'created_at' | 'updated_at'>) {
    const { data, error } = await supabase
      .from('leads')
      .insert([lead])
      .select()
    
    if (error) throw error
    return data[0]
  },

  // 배치 생성 (업로드용)
  async createBatch(leads: Omit<Lead, 'id' | 'created_at' | 'updated_at'>[]) {
    const { data, error } = await supabase
      .from('leads')
      .insert(leads)
      .select()
    
    if (error) throw error
    return data
  },

  // 리드 업데이트
  async update(id: number, lead: Partial<Lead>) {
    const { data, error } = await supabase
      .from('leads')
      .update({ ...lead, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
    
    if (error) throw error
    return data[0]
  },

  // 리드 삭제
  async delete(id: number) {
    const { error } = await supabase
      .from('leads')
      .delete()
      .eq('id', id)
    
    if (error) throw error
  },

  // 전화번호로 중복 검사
  async checkDuplicate(phone: string) {
    const { data, error } = await supabase
      .from('leads')
      .select('id, phone')
      .eq('phone', phone)
      .maybeSingle()
    
    if (error) throw error
    return !!data
  }
}