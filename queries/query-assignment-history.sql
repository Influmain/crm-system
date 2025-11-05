-- ==========================================
-- 배정 이력 조회 쿼리
-- ==========================================

-- 1. 특정 리드의 전체 배정 이력
SELECT
  ah.id,
  ah.action_type,
  ah.changed_at as 변경일시,
  prev_u.full_name as 이전담당자,
  prev_u.department as 이전부서,
  new_u.full_name as 신규담당자,
  new_u.department as 신규부서,
  changed_u.full_name as 변경자,
  ah.reason as 변경사유
FROM assignment_history ah
LEFT JOIN users prev_u ON ah.previous_counselor_id = prev_u.id
LEFT JOIN users new_u ON ah.new_counselor_id = new_u.id
LEFT JOIN users changed_u ON ah.changed_by = changed_u.id
WHERE ah.lead_id = 'YOUR_LEAD_ID_HERE'
ORDER BY ah.changed_at DESC;

-- 2. 재배정이 발생한 모든 리드 (10월 기준)
SELECT
  lp.id as lead_id,
  lp.phone,
  lp.contact_name,
  lp.created_at as 리드등록일,
  COUNT(ah.id) as 배정변경횟수,
  string_agg(
    CASE ah.action_type
      WHEN 'assign' THEN '배정: ' || COALESCE(new_u.full_name, '(삭제된사용자)')
      WHEN 'reassign' THEN '재배정: ' || COALESCE(prev_u.full_name, '?') || ' → ' || COALESCE(new_u.full_name, '?')
      WHEN 'unassign' THEN '미배정: ' || COALESCE(prev_u.full_name, '?')
    END || ' (' || to_char(ah.changed_at, 'MM/DD HH24:MI') || ')',
    ' | '
    ORDER BY ah.changed_at
  ) as 배정이력
FROM lead_pool lp
JOIN assignment_history ah ON lp.id = ah.lead_id
LEFT JOIN users prev_u ON ah.previous_counselor_id = prev_u.id
LEFT JOIN users new_u ON ah.new_counselor_id = new_u.id
WHERE lp.created_at >= '2025-10-01 00:00:00'
  AND lp.created_at < '2025-11-01 00:00:00'
GROUP BY lp.id, lp.phone, lp.contact_name, lp.created_at
HAVING COUNT(ah.id) > 1  -- 재배정이 1번 이상 발생한 경우만
ORDER BY COUNT(ah.id) DESC, lp.created_at DESC;

-- 3. 재배정 통계 (10월 리드)
SELECT
  '총 리드 수' as 구분,
  COUNT(DISTINCT lp.id) as 수량
FROM lead_pool lp
WHERE lp.created_at >= '2025-10-01 00:00:00'
  AND lp.created_at < '2025-11-01 00:00:00'

UNION ALL

SELECT
  '배정된 리드' as 구분,
  COUNT(DISTINCT ah.lead_id) as 수량
FROM assignment_history ah
JOIN lead_pool lp ON ah.lead_id = lp.id
WHERE lp.created_at >= '2025-10-01 00:00:00'
  AND lp.created_at < '2025-11-01 00:00:00'
  AND ah.action_type = 'assign'

UNION ALL

SELECT
  '재배정된 리드' as 구분,
  COUNT(DISTINCT ah.lead_id) as 수량
FROM assignment_history ah
JOIN lead_pool lp ON ah.lead_id = lp.id
WHERE lp.created_at >= '2025-10-01 00:00:00'
  AND lp.created_at < '2025-11-01 00:00:00'
  AND ah.action_type = 'reassign'

UNION ALL

SELECT
  '총 재배정 횟수' as 구분,
  COUNT(ah.id) as 수량
FROM assignment_history ah
JOIN lead_pool lp ON ah.lead_id = lp.id
WHERE lp.created_at >= '2025-10-01 00:00:00'
  AND lp.created_at < '2025-11-01 00:00:00'
  AND ah.action_type = 'reassign';

-- 4. 영업사원별 재배정 받은/잃은 리드 수
SELECT
  u.full_name as 영업사원,
  u.department as 부서,
  COUNT(CASE WHEN ah.action_type = 'assign' THEN 1 END) as 최초배정받은수,
  COUNT(CASE WHEN ah.action_type = 'reassign' AND ah.new_counselor_id = u.id THEN 1 END) as 재배정받은수,
  COUNT(CASE WHEN ah.action_type = 'reassign' AND ah.previous_counselor_id = u.id THEN 1 END) as 재배정잃은수,
  COUNT(CASE WHEN ah.action_type = 'unassign' AND ah.previous_counselor_id = u.id THEN 1 END) as 미배정된수,
  (COUNT(CASE WHEN ah.action_type = 'assign' THEN 1 END) +
   COUNT(CASE WHEN ah.action_type = 'reassign' AND ah.new_counselor_id = u.id THEN 1 END) -
   COUNT(CASE WHEN ah.action_type = 'reassign' AND ah.previous_counselor_id = u.id THEN 1 END) -
   COUNT(CASE WHEN ah.action_type = 'unassign' AND ah.previous_counselor_id = u.id THEN 1 END)) as 순증감
FROM users u
JOIN assignment_history ah ON (ah.new_counselor_id = u.id OR ah.previous_counselor_id = u.id)
JOIN lead_pool lp ON ah.lead_id = lp.id
WHERE lp.created_at >= '2025-10-01 00:00:00'
  AND lp.created_at < '2025-11-01 00:00:00'
GROUP BY u.id, u.full_name, u.department
ORDER BY 순증감 DESC;

-- 5. 가장 많이 재배정된 리드 TOP 20
SELECT
  lp.phone as 전화번호,
  lp.contact_name as 이름,
  lp.data_source as 데이터출처,
  COUNT(CASE WHEN ah.action_type = 'reassign' THEN 1 END) as 재배정횟수,
  string_agg(
    DISTINCT new_u.full_name,
    ' → '
    ORDER BY new_u.full_name
  ) as 거쳐간담당자들
FROM lead_pool lp
JOIN assignment_history ah ON lp.id = ah.lead_id
LEFT JOIN users new_u ON ah.new_counselor_id = new_u.id
WHERE lp.created_at >= '2025-10-01 00:00:00'
  AND lp.created_at < '2025-11-01 00:00:00'
GROUP BY lp.id, lp.phone, lp.contact_name, lp.data_source
HAVING COUNT(CASE WHEN ah.action_type = 'reassign' THEN 1 END) > 0
ORDER BY 재배정횟수 DESC
LIMIT 20;

-- 6. 일별 재배정 추이 (10월)
SELECT
  DATE(ah.changed_at) as 날짜,
  COUNT(CASE WHEN ah.action_type = 'assign' THEN 1 END) as 최초배정,
  COUNT(CASE WHEN ah.action_type = 'reassign' THEN 1 END) as 재배정,
  COUNT(CASE WHEN ah.action_type = 'unassign' THEN 1 END) as 미배정
FROM assignment_history ah
JOIN lead_pool lp ON ah.lead_id = lp.id
WHERE lp.created_at >= '2025-10-01 00:00:00'
  AND lp.created_at < '2025-11-01 00:00:00'
GROUP BY DATE(ah.changed_at)
ORDER BY 날짜;
