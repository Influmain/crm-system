2-- ==========================================
-- data_source에 "*"가 포함된 모든 리드의 전체 로그 조회
-- ==========================================
-- 목적: 업로드일, 배정, 재배정, 상담이력, 계약 등 모든 정보 추적
-- 실행: Supabase SQL Editor 또는 psql에서 실행
-- ==========================================

-- 1. 기본 리드 정보 (업로드일, 데이터 생성일 포함)
WITH datasource_leads AS (
  SELECT
    id as lead_id,
    phone,
    contact_name,
    real_name,
    data_source,
    contact_script,
    data_date as 데이터생성일,
    created_at as 업로드일,
    status,
    upload_batch_id
  FROM lead_pool
  WHERE data_source LIKE '%*%'
),

-- 2. 업로드 배치 정보
upload_info AS (
  SELECT
    dl.lead_id,
    ub.file_name as 업로드파일명,
    ub.uploaded_by,
    u.full_name as 업로드자,
    ub.created_at as 배치생성일
  FROM datasource_leads dl
  LEFT JOIN upload_batches ub ON dl.upload_batch_id = ub.id
  LEFT JOIN users u ON ub.uploaded_by = u.id
),

-- 3. 배정 및 재배정 이력
assignment_history AS (
  SELECT
    dl.lead_id,
    la.id as assignment_id,
    la.counselor_id,
    u.full_name as 담당영업사원,
    u.department as 부서,
    la.assigned_at as 배정일시,
    la.status as 배정상태,
    la.updated_at as 상태변경일시,
    ROW_NUMBER() OVER (PARTITION BY dl.lead_id ORDER BY la.assigned_at) as 배정순번
  FROM datasource_leads dl
  LEFT JOIN lead_assignments la ON dl.lead_id = la.lead_id
  LEFT JOIN users u ON la.counselor_id = u.id
),

-- 4. 상담 활동 이력
counseling_history AS (
  SELECT
    ah.lead_id,
    ah.assignment_id,
    ca.contact_date as 상담일시,
    ca.contact_result as 상담결과,
    ca.memo as 상담메모,
    ca.created_at as 기록생성일,
    ca.created_by,
    u.full_name as 상담자
  FROM assignment_history ah
  LEFT JOIN counseling_activities ca ON ah.assignment_id = ca.assignment_id
  LEFT JOIN users u ON ca.created_by = u.id
),

-- 5. 상담 메모 히스토리 (무한 스택)
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
),

-- 6. 결제 및 계약 정보 (counselor_leads_view 기반)
contract_info AS (
  SELECT
    dl.lead_id,
    clv.contract_status as 계약상태,
    clv.contract_amount as 계약금액,
    clv.payment_status as 결제상태,
    clv.payment_date as 결제일,
    clv.contract_date as 계약일
  FROM datasource_leads dl
  LEFT JOIN lead_assignments la ON dl.lead_id = la.lead_id
  LEFT JOIN counselor_leads_view clv ON la.id = clv.assignment_id
)

-- ==========================================
-- 최종 결과: 모든 정보 통합
-- ==========================================
SELECT
  -- 기본 리드 정보
  dl.lead_id as "리드ID",
  dl.phone as "전화번호",
  dl.contact_name as "접근용이름",
  dl.real_name as "실제이름",
  dl.data_source as "DB출처",
  dl.contact_script as "관심분야",
  dl.데이터생성일,
  dl.업로드일,
  dl.status as "현재상태",

  -- 업로드 정보
  ui.업로드파일명,
  ui.업로드자,
  ui.배치생성일,

  -- 배정 정보
  ah.배정순번 as "배정차수",
  ah.담당영업사원,
  ah.부서,
  ah.배정일시,
  ah.배정상태,
  ah.상태변경일시,

  -- 상담 정보
  ch.상담일시,
  ch.상담결과,
  ch.상담메모,
  ch.상담자,

  -- 메모 히스토리
  mh.메모작성일,
  mh.메모내용,
  mh.메모작성자,

  -- 계약 및 결제
  ci.계약상태,
  ci.계약금액,
  ci.결제상태,
  ci.결제일,
  ci.계약일

FROM datasource_leads dl
LEFT JOIN upload_info ui ON dl.lead_id = ui.lead_id
LEFT JOIN assignment_history ah ON dl.lead_id = ah.lead_id
LEFT JOIN counseling_history ch ON ah.assignment_id = ch.assignment_id
LEFT JOIN memo_history mh ON ah.assignment_id = mh.assignment_id
LEFT JOIN contract_info ci ON dl.lead_id = ci.lead_id

ORDER BY
  dl.업로드일 DESC,
  dl.lead_id,
  ah.배정순번,
  ch.상담일시 DESC,
  mh.메모작성일 DESC;

-- ==========================================
-- 통계 요약 쿼리
-- ==========================================

-- 총 수량 및 현황 요약
SELECT
  '총 리드 수' as 구분,
  COUNT(DISTINCT id) as 수량
FROM lead_pool
WHERE data_source LIKE '%*%'

UNION ALL

SELECT
  '배정된 리드' as 구분,
  COUNT(DISTINCT la.lead_id) as 수량
FROM lead_pool lp
JOIN lead_assignments la ON lp.id = la.lead_id
WHERE lp.data_source LIKE '%*%'

UNION ALL

SELECT
  '상담 진행 리드' as 구분,
  COUNT(DISTINCT la.lead_id) as 수량
FROM lead_pool lp
JOIN lead_assignments la ON lp.id = la.lead_id
JOIN counseling_activities ca ON la.id = ca.assignment_id
WHERE lp.data_source LIKE '%*%'

UNION ALL

SELECT
  '총 상담 횟수' as 구분,
  COUNT(ca.id) as 수량
FROM lead_pool lp
JOIN lead_assignments la ON lp.id = la.lead_id
JOIN counseling_activities ca ON la.id = ca.assignment_id
WHERE lp.data_source LIKE '%*%'

UNION ALL

SELECT
  '재배정 횟수' as 구분,
  COUNT(*) - COUNT(DISTINCT lead_id) as 수량
FROM (
  SELECT la.lead_id
  FROM lead_pool lp
  JOIN lead_assignments la ON lp.id = la.lead_id
  WHERE lp.data_source LIKE '%*%'
) as reassignments;

-- ==========================================
-- 영업사원별 배정 현황
-- ==========================================
SELECT
  u.full_name as "영업사원",
  u.department as "부서",
  COUNT(DISTINCT la.lead_id) as "배정받은수",
  COUNT(DISTINCT ca.id) as "상담횟수",
  COUNT(DISTINCT CASE WHEN ca.contact_result = 'success' THEN ca.id END) as "성공상담",
  COUNT(DISTINCT CASE WHEN clv.contract_status = 'completed' THEN la.lead_id END) as "계약건수"
FROM lead_pool lp
JOIN lead_assignments la ON lp.id = la.lead_id
LEFT JOIN counseling_activities ca ON la.id = ca.assignment_id
LEFT JOIN users u ON la.counselor_id = u.id
LEFT JOIN counselor_leads_view clv ON la.id = clv.assignment_id
WHERE lp.data_source LIKE '%*%'
GROUP BY u.id, u.full_name, u.department
ORDER BY COUNT(DISTINCT la.lead_id) DESC;

-- ==========================================
-- 시간대별 업로드 통계
-- ==========================================
SELECT
  DATE(created_at) as "업로드날짜",
  COUNT(*) as "업로드수량",
  COUNT(DISTINCT upload_batch_id) as "배치수"
FROM lead_pool
WHERE data_source LIKE '%*%'
GROUP BY DATE(created_at)
ORDER BY DATE(created_at) DESC;
