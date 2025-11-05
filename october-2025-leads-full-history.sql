-- ==========================================
-- 2025년 10월 등록 리드 1009개의 전체 로그 조회
-- ==========================================
-- 업로드일, 배정, 재배정, 상담이력, 계약 등 모든 정보 추적
-- ==========================================

-- 1. 10월 리드 기본 정보
WITH october_leads AS (
  SELECT
    id as lead_id,
    phone,
    contact_name,
    real_name,
    data_source,
    contact_script,
    data_date as 데이터생성일,
    created_at as 업로드일,
    lead_status,
    upload_batch_id
  FROM admin_leads_view
  WHERE created_at >= '2025-10-01 00:00:00'
    AND created_at < '2025-11-01 00:00:00'
),

-- 2. 업로드 배치 정보
upload_info AS (
  SELECT
    ol.lead_id,
    ub.file_name as 업로드파일명,
    ub.uploaded_by,
    u.full_name as 업로드자,
    u.email as 업로드자이메일,
    ub.created_at as 배치생성일
  FROM october_leads ol
  LEFT JOIN upload_batches ub ON ol.upload_batch_id = ub.id
  LEFT JOIN users u ON ub.uploaded_by = u.id
),

-- 3. 배정 및 재배정 이력
assignment_history AS (
  SELECT
    ol.lead_id,
    la.id as assignment_id,
    la.counselor_id,
    u.full_name as 담당영업사원,
    u.email as 영업사원이메일,
    u.department as 부서,
    la.assigned_at as 배정일시,
    la.status as 배정상태,
    ROW_NUMBER() OVER (PARTITION BY ol.lead_id ORDER BY la.assigned_at) as 배정순번
  FROM october_leads ol
  LEFT JOIN lead_assignments la ON ol.lead_id = la.lead_id
  LEFT JOIN users u ON la.counselor_id = u.id
),

-- 4. 상담 활동 이력
counseling_history AS (
  SELECT
    ah.lead_id,
    ah.assignment_id,
    ca.contact_date as 상담일시,
    ca.contact_method as 연락방법,
    ca.contact_result as 상담결과,
    ca.actual_customer_name as 실제고객명,
    ca.investment_budget as 투자예산,
    ca.contract_status as 계약상태,
    ca.contract_amount as 계약금액,
    ca.created_at as 기록생성일
  FROM assignment_history ah
  LEFT JOIN counseling_activities ca ON ah.assignment_id = ca.assignment_id
),

-- 5. 상담 메모 히스토리
memo_history AS (
  SELECT
    ah.lead_id,
    ah.assignment_id,
    cmh.memo as 메모내용,
    cmh.created_at as 메모작성일,
    cmh.created_by,
    u.full_name as 메모작성자
  FROM assignment_history ah
  LEFT JOIN consulting_memo_history cmh ON ah.assignment_id = cmh.assignment_id
  LEFT JOIN users u ON cmh.created_by = u.id
)

-- ==========================================
-- 최종 결과: 모든 정보 통합
-- ==========================================
SELECT
  -- 기본 리드 정보
  ol.lead_id as "리드ID",
  ol.phone as "전화번호",
  ol.contact_name as "접근용이름",
  ol.real_name as "실제이름",
  ol.data_source as "DB출처",
  ol.contact_script as "관심분야",
  ol.데이터생성일,
  ol.업로드일,
  ol.lead_status as "현재상태",

  -- 업로드 정보
  ui.업로드파일명,
  ui.업로드자,
  ui.업로드자이메일,
  ui.배치생성일,

  -- 배정 정보
  ah.배정순번 as "배정차수",
  ah.담당영업사원,
  ah.영업사원이메일,
  ah.부서,
  ah.배정일시,
  ah.배정상태,

  -- 상담 정보
  ch.상담일시,
  ch.연락방법,
  ch.상담결과,
  ch.실제고객명,
  ch.투자예산,
  ch.계약상태 as 상담계약상태,
  ch.계약금액 as 상담계약금액,

  -- 메모 히스토리
  mh.메모작성일,
  mh.메모내용,
  mh.메모작성자

FROM october_leads ol
LEFT JOIN upload_info ui ON ol.lead_id = ui.lead_id
LEFT JOIN assignment_history ah ON ol.lead_id = ah.lead_id
LEFT JOIN counseling_history ch ON ah.assignment_id = ch.assignment_id
LEFT JOIN memo_history mh ON ah.assignment_id = mh.assignment_id

ORDER BY
  ol.업로드일 DESC,
  ol.lead_id,
  ah.배정순번,
  ch.상담일시 DESC,
  mh.메모작성일 DESC
LIMIT 10000;  -- 충분히 큰 제한

-- ==========================================
-- 통계 요약 쿼리
-- ==========================================

-- 총 수량 및 현황 요약
SELECT
  '총 리드 수' as 구분,
  COUNT(DISTINCT id) as 수량
FROM admin_leads_view
WHERE created_at >= '2025-10-01 00:00:00'
  AND created_at < '2025-11-01 00:00:00'

UNION ALL

SELECT
  '배정된 리드' as 구분,
  COUNT(DISTINCT la.lead_id) as 수량
FROM admin_leads_view lp
JOIN lead_assignments la ON lp.id = la.lead_id
WHERE lp.created_at >= '2025-10-01 00:00:00'
  AND lp.created_at < '2025-11-01 00:00:00'

UNION ALL

SELECT
  '상담 진행 리드' as 구분,
  COUNT(DISTINCT la.lead_id) as 수량
FROM admin_leads_view lp
JOIN lead_assignments la ON lp.id = la.lead_id
JOIN counseling_activities ca ON la.id = ca.assignment_id
WHERE lp.created_at >= '2025-10-01 00:00:00'
  AND lp.created_at < '2025-11-01 00:00:00'

UNION ALL

SELECT
  '총 상담 횟수' as 구분,
  COUNT(ca.id) as 수량
FROM admin_leads_view lp
JOIN lead_assignments la ON lp.id = la.lead_id
JOIN counseling_activities ca ON la.id = ca.assignment_id
WHERE lp.created_at >= '2025-10-01 00:00:00'
  AND lp.created_at < '2025-11-01 00:00:00'

UNION ALL

SELECT
  '재배정 횟수' as 구분,
  COUNT(*) - COUNT(DISTINCT lead_id) as 수량
FROM (
  SELECT la.lead_id
  FROM admin_leads_view lp
  JOIN lead_assignments la ON lp.id = la.lead_id
  WHERE lp.created_at >= '2025-10-01 00:00:00'
    AND lp.created_at < '2025-11-01 00:00:00'
) as reassignments;

-- ==========================================
-- 영업사원별 배정 현황
-- ==========================================
SELECT
  u.full_name as "영업사원",
  u.department as "부서",
  COUNT(DISTINCT la.lead_id) as "배정받은수",
  COUNT(DISTINCT ca.id) as "상담횟수",
  COUNT(DISTINCT CASE WHEN ca.contact_result = 'connected' THEN ca.id END) as "연결성공",
  COUNT(DISTINCT CASE WHEN ca.contract_status = 'contracted' THEN la.lead_id END) as "계약건수",
  SUM(ca.contract_amount) as "총계약금액"
FROM admin_leads_view lp
JOIN lead_assignments la ON lp.id = la.lead_id
LEFT JOIN counseling_activities ca ON la.id = ca.assignment_id
LEFT JOIN users u ON la.counselor_id = u.id
WHERE lp.created_at >= '2025-10-01 00:00:00'
  AND lp.created_at < '2025-11-01 00:00:00'
GROUP BY u.id, u.full_name, u.department
ORDER BY COUNT(DISTINCT la.lead_id) DESC;

-- ==========================================
-- 재배정 현황 상세 (재배정된 리드만)
-- ==========================================
SELECT
  ol.lead_id as "리드ID",
  ol.phone as "전화번호",
  ol.contact_name as "이름",
  COUNT(la.id) as "배정횟수",
  string_agg(u.full_name || ' (' || to_char(la.assigned_at, 'MM/DD HH24:MI') || ')', ' → ' ORDER BY la.assigned_at) as "배정이력"
FROM admin_leads_view ol
JOIN lead_assignments la ON ol.id = la.lead_id
LEFT JOIN users u ON la.counselor_id = u.id
WHERE ol.created_at >= '2025-10-01 00:00:00'
  AND ol.created_at < '2025-11-01 00:00:00'
GROUP BY ol.id, ol.phone, ol.contact_name
HAVING COUNT(la.id) > 1
ORDER BY COUNT(la.id) DESC;
