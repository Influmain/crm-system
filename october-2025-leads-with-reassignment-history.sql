-- ==========================================
-- 2025년 10월 등록 리드 1009개의 전체 로그 조회 (재배정 이력 포함)
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

-- 3. 현재 배정 정보
current_assignment AS (
  SELECT
    ol.lead_id,
    la.id as assignment_id,
    la.counselor_id,
    u.full_name as 현재담당영업사원,
    u.email as 현재영업사원이메일,
    u.department as 현재부서,
    la.assigned_at as 현재배정일시,
    la.status as 배정상태
  FROM october_leads ol
  LEFT JOIN lead_assignments la ON ol.lead_id = la.lead_id
  LEFT JOIN users u ON la.counselor_id = u.id
),

-- 4. 배정 이력 (assign, reassign, unassign 모두 포함)
assignment_history_detail AS (
  SELECT
    ol.lead_id,
    ah.action_type as 배정액션,
    ah.changed_at as 배정변경일시,
    prev_u.full_name as 이전담당자,
    new_u.full_name as 신규담당자,
    changed_u.full_name as 변경자,
    ah.reason as 변경사유,
    ROW_NUMBER() OVER (PARTITION BY ol.lead_id ORDER BY ah.changed_at) as 배정이력순번
  FROM october_leads ol
  LEFT JOIN assignment_history ah ON ol.lead_id = ah.lead_id
  LEFT JOIN users prev_u ON ah.previous_counselor_id = prev_u.id
  LEFT JOIN users new_u ON ah.new_counselor_id = new_u.id
  LEFT JOIN users changed_u ON ah.changed_by = changed_u.id
),

-- 5. 상담 활동 이력
counseling_history AS (
  SELECT
    ca.lead_id,
    ca.assignment_id,
    ca.contact_date as 상담일시,
    ca.contact_method as 연락방법,
    ca.contact_result as 상담결과,
    ca.actual_customer_name as 실제고객명,
    ca.investment_budget as 투자예산,
    ca.contract_status as 계약상태,
    ca.contract_amount as 계약금액,
    ca.created_at as 기록생성일
  FROM current_assignment ca_link
  LEFT JOIN counseling_activities ca ON ca_link.assignment_id = ca.assignment_id
),

-- 6. 상담 메모 히스토리
memo_history AS (
  SELECT
    ca.lead_id,
    ca.assignment_id,
    cmh.memo as 메모내용,
    cmh.created_at as 메모작성일,
    cmh.created_by,
    u.full_name as 메모작성자
  FROM current_assignment ca
  LEFT JOIN consulting_memo_history cmh ON ca.assignment_id = cmh.assignment_id
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

  -- 현재 배정 정보
  ca.현재담당영업사원,
  ca.현재영업사원이메일,
  ca.현재부서,
  ca.현재배정일시,
  ca.배정상태,

  -- 배정 이력
  ahd.배정이력순번,
  ahd.배정액션,
  ahd.배정변경일시,
  ahd.이전담당자,
  ahd.신규담당자,
  ahd.변경자,
  ahd.변경사유,

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
LEFT JOIN current_assignment ca ON ol.lead_id = ca.lead_id
LEFT JOIN assignment_history_detail ahd ON ol.lead_id = ahd.lead_id
LEFT JOIN counseling_history ch ON ca.assignment_id = ch.assignment_id
LEFT JOIN memo_history mh ON ca.assignment_id = mh.assignment_id

ORDER BY
  ol.업로드일 DESC,
  ol.lead_id,
  ahd.배정이력순번,
  ch.상담일시 DESC,
  mh.메모작성일 DESC
LIMIT 10000;

-- ==========================================
-- 재배정 통계 요약
-- ==========================================

SELECT
  '총 리드 수' as 구분,
  COUNT(DISTINCT ol.lead_id) as 수량
FROM october_leads ol

UNION ALL

SELECT
  '배정된 리드' as 구분,
  COUNT(DISTINCT ah.lead_id) as 수량
FROM october_leads ol
JOIN assignment_history ah ON ol.lead_id = ah.lead_id
WHERE ah.action_type = 'assign'

UNION ALL

SELECT
  '재배정된 리드' as 구분,
  COUNT(DISTINCT ah.lead_id) as 수량
FROM october_leads ol
JOIN assignment_history ah ON ol.lead_id = ah.lead_id
WHERE ah.action_type = 'reassign'

UNION ALL

SELECT
  '총 재배정 횟수' as 구분,
  COUNT(ah.id) as 수량
FROM october_leads ol
JOIN assignment_history ah ON ol.lead_id = ah.lead_id
WHERE ah.action_type = 'reassign';
