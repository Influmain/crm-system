-- ==========================================
-- 전체 리드 개수 확인
-- ==========================================

-- 1. lead_pool 전체 개수
SELECT COUNT(*) as 전체리드수
FROM lead_pool;

-- 2. 상태별 개수
SELECT
  status as 상태,
  COUNT(*) as 개수
FROM lead_pool
GROUP BY status
ORDER BY 개수 DESC;

-- 3. 최근 1시간 이내 삭제된 리드 개수
SELECT COUNT(*) as 최근1시간삭제수
FROM lead_audit_log
WHERE change_type = 'DELETE'
  AND field_name = 'lead_deleted'
  AND changed_at >= NOW() - INTERVAL '1 hour';

-- 4. 오늘 삭제된 리드 상세
SELECT
  al.lead_id as 삭제된리드ID,
  al.old_value::jsonb->>'phone' as 전화번호,
  al.old_value::jsonb->>'data_source' as 데이터출처,
  TO_CHAR(al.changed_at, 'HH24:MI:SS') as 삭제시간,
  u.full_name as 삭제자
FROM lead_audit_log al
LEFT JOIN users u ON al.changed_by = u.id
WHERE al.change_type = 'DELETE'
  AND al.field_name = 'lead_deleted'
  AND DATE(al.changed_at) = CURRENT_DATE
ORDER BY al.changed_at DESC;

-- 5. 생성일별 리드 분포 (최근 7일)
SELECT
  DATE(created_at) as 날짜,
  COUNT(*) as 생성수
FROM lead_pool
WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY DATE(created_at)
ORDER BY 날짜 DESC;
