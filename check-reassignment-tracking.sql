-- ==========================================
-- 재배정 이력 추적 가능 여부 확인
-- ==========================================

-- 1. lead_assignments 테이블에 같은 lead_id로 여러 레코드가 있는지 확인
SELECT
  lead_id,
  COUNT(*) as assignment_count
FROM lead_assignments
GROUP BY lead_id
HAVING COUNT(*) > 1
ORDER BY COUNT(*) DESC
LIMIT 10;

-- 결과가 있다면: 재배정 시 새 레코드를 만드는 방식 (이력 추적 가능)
-- 결과가 없다면: UPDATE 방식 (이력 추적 불가)

-- 2. PostgreSQL 감사 로그 확인 (pgaudit 또는 기본 로그)
-- Supabase에서는 제한적이지만 시도해볼 수 있습니다
SELECT
  schemaname,
  tablename,
  attname as column_name
FROM pg_stats
WHERE tablename = 'lead_assignments'
ORDER BY attname;

-- 3. 트리거 확인
SELECT
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'lead_assignments';

-- ==========================================
-- 대안: assigned_at 변경으로 재배정 추정
-- ==========================================
-- assigned_at이 업데이트되면 재배정으로 간주할 수 있지만
-- 정확한 이전 담당자 정보는 알 수 없습니다

-- 10월 리드 중 assigned_at이 created_at보다 최근인 경우
-- (재배정 가능성이 있는 리드)
SELECT
  l.id,
  l.phone,
  l.contact_name,
  l.created_at as 리드생성일,
  la.assigned_at as 배정일,
  la.counselor_id,
  u.full_name as 현재담당자,
  EXTRACT(DAY FROM (la.assigned_at - l.created_at)) as 일수차이
FROM admin_leads_view l
JOIN lead_assignments la ON l.id = la.lead_id
LEFT JOIN users u ON la.counselor_id = u.id
WHERE l.created_at >= '2025-10-01 00:00:00'
  AND l.created_at < '2025-11-01 00:00:00'
  AND la.assigned_at > l.created_at + INTERVAL '1 day'  -- 생성 후 1일 이상 지나서 배정
ORDER BY 일수차이 DESC
LIMIT 50;
