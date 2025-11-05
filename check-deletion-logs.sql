-- ==========================================
-- 리드 삭제 로그 확인 쿼리
-- ==========================================

-- 1. 최근 삭제된 리드 확인 (상세)
SELECT
  al.lead_id as 삭제된리드ID,
  al.old_value::jsonb->>'phone' as 전화번호,
  al.old_value::jsonb->>'contact_name' as 이름,
  al.old_value::jsonb->>'real_name' as 실명,
  al.old_value::jsonb->>'data_source' as 데이터출처,
  al.old_value::jsonb->>'status' as 상태,
  TO_CHAR(al.changed_at, 'YYYY-MM-DD HH24:MI:SS') as 삭제일시,
  u.full_name as 삭제자,
  u.role as 역할
FROM lead_audit_log al
LEFT JOIN users u ON al.changed_by = u.id
WHERE al.change_type = 'DELETE'
  AND al.field_name = 'lead_deleted'
ORDER BY al.changed_at DESC
LIMIT 50;

-- 2. 오늘 삭제된 리드
SELECT
  al.lead_id as 삭제된리드ID,
  al.old_value::jsonb->>'phone' as 전화번호,
  al.old_value::jsonb->>'contact_name' as 이름,
  al.old_value::jsonb->>'data_source' as 데이터출처,
  TO_CHAR(al.changed_at, 'YYYY-MM-DD HH24:MI:SS') as 삭제일시,
  u.full_name as 삭제자
FROM lead_audit_log al
LEFT JOIN users u ON al.changed_by = u.id
WHERE al.change_type = 'DELETE'
  AND al.field_name = 'lead_deleted'
  AND DATE(al.changed_at) = CURRENT_DATE
ORDER BY al.changed_at DESC;

-- 3. 특정 기간 삭제 통계
SELECT
  DATE(al.changed_at) as 날짜,
  COUNT(*) as 삭제수,
  COUNT(DISTINCT al.changed_by) as 삭제자수,
  string_agg(DISTINCT u.full_name, ', ') as 삭제자들
FROM lead_audit_log al
LEFT JOIN users u ON al.changed_by = u.id
WHERE al.change_type = 'DELETE'
  AND al.field_name = 'lead_deleted'
  AND al.changed_at >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY DATE(al.changed_at)
ORDER BY 날짜 DESC;

-- 4. 사용자별 삭제 통계
SELECT
  u.full_name as 삭제자,
  u.role as 역할,
  COUNT(*) as 삭제횟수,
  MIN(al.changed_at) as 최초삭제일시,
  MAX(al.changed_at) as 최근삭제일시
FROM lead_audit_log al
LEFT JOIN users u ON al.changed_by = u.id
WHERE al.change_type = 'DELETE'
  AND al.field_name = 'lead_deleted'
GROUP BY u.id, u.full_name, u.role
ORDER BY 삭제횟수 DESC;

-- 5. 특정 전화번호가 삭제되었는지 확인
-- 사용법: '010-1234-5678'을 실제 전화번호로 교체
SELECT
  al.lead_id as 삭제된리드ID,
  al.old_value as 전체데이터,
  TO_CHAR(al.changed_at, 'YYYY-MM-DD HH24:MI:SS') as 삭제일시,
  u.full_name as 삭제자
FROM lead_audit_log al
LEFT JOIN users u ON al.changed_by = u.id
WHERE al.change_type = 'DELETE'
  AND al.field_name = 'lead_deleted'
  AND al.old_value::jsonb->>'phone' = '010-1234-5678';

-- 6. 10월에 삭제된 리드 (자세히)
SELECT
  al.lead_id as 삭제된리드ID,
  al.old_value::jsonb->>'phone' as 전화번호,
  al.old_value::jsonb->>'contact_name' as 이름,
  al.old_value::jsonb->>'data_source' as 데이터출처,
  TO_CHAR(al.changed_at, 'YYYY-MM-DD HH24:MI:SS') as 삭제일시,
  u.full_name as 삭제자,
  u.role as 역할
FROM lead_audit_log al
LEFT JOIN users u ON al.changed_by = u.id
WHERE al.change_type = 'DELETE'
  AND al.field_name = 'lead_deleted'
  AND al.changed_at >= '2025-10-01 00:00:00'
  AND al.changed_at < '2025-11-01 00:00:00'
ORDER BY al.changed_at DESC;

-- 7. 방금 삭제한 리드 확인 (최근 5분)
SELECT
  al.lead_id as 삭제된리드ID,
  al.old_value::jsonb->>'phone' as 전화번호,
  al.old_value::jsonb->>'contact_name' as 이름,
  TO_CHAR(al.changed_at, 'YYYY-MM-DD HH24:MI:SS') as 삭제일시,
  u.full_name as 삭제자
FROM lead_audit_log al
LEFT JOIN users u ON al.changed_by = u.id
WHERE al.change_type = 'DELETE'
  AND al.field_name = 'lead_deleted'
  AND al.changed_at >= NOW() - INTERVAL '5 minutes'
ORDER BY al.changed_at DESC;
