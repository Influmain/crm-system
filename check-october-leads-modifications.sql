-- ==========================================
-- 10월 리드 수정 로그 확인
-- ==========================================

-- 1. lead_pool 테이블 컬럼 확인 (updated_at 같은 컬럼 있는지)
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'lead_pool'
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. updated_at 컬럼이 있다면: 수정된 리드 확인
-- (lead_pool에 updated_at이 있다고 가정)
SELECT
  id as 리드ID,
  phone as 전화번호,
  contact_name as 이름,
  data_source as 데이터출처,
  created_at as 생성일,
  updated_at as 수정일,
  EXTRACT(EPOCH FROM (updated_at - created_at))/3600 as 생성후_수정까지_시간,
  status as 상태
FROM lead_pool
WHERE created_at >= '2025-10-01 00:00:00'
  AND created_at < '2025-11-01 00:00:00'
  AND updated_at IS NOT NULL
  AND updated_at > created_at + INTERVAL '1 minute'  -- 생성 후 1분 이후 수정된 것만
ORDER BY updated_at DESC
LIMIT 200;

-- 3. 상담 메모 히스토리 (간접적인 수정 로그)
SELECT
  lp.id as 리드ID,
  lp.phone as 전화번호,
  lp.contact_name as 이름,
  cmh.memo as 메모내용,
  cmh.created_at as 메모작성일,
  u.full_name as 작성자,
  u.role as 작성자역할
FROM lead_pool lp
JOIN lead_assignments la ON lp.id = la.lead_id
JOIN consulting_memo_history cmh ON la.id = cmh.assignment_id
LEFT JOIN users u ON cmh.created_by = u.id
WHERE lp.created_at >= '2025-10-01 00:00:00'
  AND lp.created_at < '2025-11-01 00:00:00'
ORDER BY cmh.created_at DESC
LIMIT 200;

-- 4. 배정 이력 (assignment_history) - 이미 생성한 테이블
SELECT
  lp.phone as 전화번호,
  lp.contact_name as 이름,
  ah.action_type as 액션,
  ah.changed_at as 변경일시,
  prev_u.full_name as 이전담당자,
  new_u.full_name as 신규담당자,
  changed_u.full_name as 변경자
FROM lead_pool lp
JOIN assignment_history ah ON lp.id = ah.lead_id
LEFT JOIN users prev_u ON ah.previous_counselor_id = prev_u.id
LEFT JOIN users new_u ON ah.new_counselor_id = new_u.id
LEFT JOIN users changed_u ON ah.changed_by = changed_u.id
WHERE lp.created_at >= '2025-10-01 00:00:00'
  AND lp.created_at < '2025-11-01 00:00:00'
ORDER BY ah.changed_at DESC
LIMIT 200;

-- 5. 상담 활동 이력 (간접적 수정 로그)
SELECT
  lp.phone as 전화번호,
  lp.contact_name as 이름,
  ca.contact_date as 상담일시,
  ca.contact_method as 연락방법,
  ca.contact_result as 상담결과,
  ca.actual_customer_name as 실제고객명,
  ca.contract_status as 계약상태,
  ca.contract_amount as 계약금액,
  u.full_name as 담당영업사원
FROM lead_pool lp
JOIN lead_assignments la ON lp.id = la.lead_id
JOIN counseling_activities ca ON la.id = ca.assignment_id
LEFT JOIN users u ON la.counselor_id = u.id
WHERE lp.created_at >= '2025-10-01 00:00:00'
  AND lp.created_at < '2025-11-01 00:00:00'
ORDER BY ca.contact_date DESC
LIMIT 200;

-- 6. PostgreSQL 시스템 트랜잭션 로그 확인 (제한적)
-- 최근 lead_pool 테이블 변경사항 (pg_stat_user_tables)
SELECT
  schemaname,
  relname as 테이블명,
  n_tup_ins as 삽입수,
  n_tup_upd as 업데이트수,
  n_tup_del as 삭제수,
  n_live_tup as 현재레코드수,
  last_vacuum,
  last_autovacuum,
  last_analyze
FROM pg_stat_user_tables
WHERE relname = 'lead_pool';

-- 7. 리드 상태 변경 추적 (status 컬럼 변경)
-- available -> assigned -> contracted 순서로 변경됨
SELECT
  status as 현재상태,
  COUNT(*) as 개수,
  COUNT(CASE WHEN created_at + INTERVAL '1 day' < NOW() THEN 1 END) as 생성후1일이상경과
FROM lead_pool
WHERE created_at >= '2025-10-01 00:00:00'
  AND created_at < '2025-11-01 00:00:00'
GROUP BY status
ORDER BY
  CASE status
    WHEN 'available' THEN 1
    WHEN 'assigned' THEN 2
    WHEN 'contracted' THEN 3
  END;

-- 8. Supabase Realtime 변경 로그 (있다면)
-- supabase_realtime.messages 테이블 확인
-- (Supabase 설정에 따라 다를 수 있음)
