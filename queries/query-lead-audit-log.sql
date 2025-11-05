-- ==========================================
-- 리드 변경 이력 조회 쿼리
-- ==========================================

-- 1. 10월 리드의 data_source 변경 이력
SELECT
  lp.phone as 전화번호,
  lp.contact_name as 이름,
  al.old_value as 이전데이터출처,
  al.new_value as 새데이터출처,
  TO_CHAR(al.changed_at, 'YYYY-MM-DD HH24:MI:SS') as 변경일시,
  u.full_name as 변경자,
  u.role as 변경자역할
FROM lead_pool lp
JOIN lead_audit_log al ON lp.id = al.lead_id
LEFT JOIN users u ON al.changed_by = u.id
WHERE lp.created_at >= '2025-10-01 00:00:00'
  AND lp.created_at < '2025-11-01 00:00:00'
  AND al.field_name = 'data_source'
ORDER BY al.changed_at DESC
LIMIT 200;

-- 2. 10월 리드의 모든 변경 이력
SELECT
  lp.phone as 전화번호,
  lp.contact_name as 이름,
  al.field_name as 변경필드,
  al.old_value as 이전값,
  al.new_value as 새값,
  TO_CHAR(al.changed_at, 'YYYY-MM-DD HH24:MI:SS') as 변경일시,
  u.full_name as 변경자
FROM lead_pool lp
JOIN lead_audit_log al ON lp.id = al.lead_id
LEFT JOIN users u ON al.changed_by = u.id
WHERE lp.created_at >= '2025-10-01 00:00:00'
  AND lp.created_at < '2025-11-01 00:00:00'
ORDER BY al.changed_at DESC
LIMIT 200;

-- 3. 필드별 변경 통계
SELECT
  al.field_name as 변경필드,
  COUNT(*) as 변경횟수,
  COUNT(DISTINCT al.lead_id) as 영향받은리드수
FROM lead_audit_log al
JOIN lead_pool lp ON al.lead_id = lp.id
WHERE lp.created_at >= '2025-10-01 00:00:00'
  AND lp.created_at < '2025-11-01 00:00:00'
GROUP BY al.field_name
ORDER BY 변경횟수 DESC;

-- 4. 가장 많이 수정된 리드 TOP 20
SELECT
  lp.phone as 전화번호,
  lp.contact_name as 이름,
  lp.data_source as 현재데이터출처,
  COUNT(al.id) as 총변경횟수,
  COUNT(CASE WHEN al.field_name = 'data_source' THEN 1 END) as 출처변경횟수,
  string_agg(DISTINCT al.field_name, ', ' ORDER BY al.field_name) as 변경된필드들
FROM lead_pool lp
JOIN lead_audit_log al ON lp.id = al.lead_id
WHERE lp.created_at >= '2025-10-01 00:00:00'
  AND lp.created_at < '2025-11-01 00:00:00'
GROUP BY lp.id, lp.phone, lp.contact_name, lp.data_source
ORDER BY 총변경횟수 DESC
LIMIT 20;

-- 5. 사용자별 변경 통계
SELECT
  u.full_name as 변경자,
  u.role as 역할,
  COUNT(*) as 변경횟수,
  COUNT(DISTINCT al.lead_id) as 수정한리드수,
  string_agg(DISTINCT al.field_name, ', ') as 변경한필드들
FROM lead_audit_log al
JOIN lead_pool lp ON al.lead_id = lp.id
LEFT JOIN users u ON al.changed_by = u.id
WHERE lp.created_at >= '2025-10-01 00:00:00'
  AND lp.created_at < '2025-11-01 00:00:00'
GROUP BY u.id, u.full_name, u.role
ORDER BY 변경횟수 DESC;

-- 6. 특정 리드의 전체 변경 이력 (타임라인)
-- 사용법: 아래 쿼리에서 lead_id를 실제 값으로 교체
SELECT
  al.field_name as 변경필드,
  al.old_value as 이전값,
  al.new_value as 새값,
  TO_CHAR(al.changed_at, 'YYYY-MM-DD HH24:MI:SS') as 변경일시,
  u.full_name as 변경자,
  u.role as 변경자역할
FROM lead_audit_log al
LEFT JOIN users u ON al.changed_by = u.id
WHERE al.lead_id = '여기에_리드_ID_입력'
ORDER BY al.changed_at DESC;

-- 7. 일별 변경 추이
SELECT
  DATE(al.changed_at) as 날짜,
  COUNT(*) as 총변경,
  COUNT(CASE WHEN al.field_name = 'data_source' THEN 1 END) as 출처변경,
  COUNT(CASE WHEN al.field_name = 'contact_name' THEN 1 END) as 이름변경,
  COUNT(CASE WHEN al.field_name = 'phone' THEN 1 END) as 전화번호변경,
  COUNT(CASE WHEN al.field_name = 'status' THEN 1 END) as 상태변경
FROM lead_audit_log al
JOIN lead_pool lp ON al.lead_id = lp.id
WHERE lp.created_at >= '2025-10-01 00:00:00'
  AND lp.created_at < '2025-11-01 00:00:00'
GROUP BY DATE(al.changed_at)
ORDER BY 날짜 DESC;
