-- ==========================================
-- 10월 리드 중 upload_batch_id가 null인 120개 분석
-- ==========================================

-- 1. 120개 리드의 전체 정보 (CSV 다운로드용)
SELECT
  l.id as 리드ID,
  l.phone as 전화번호,
  l.contact_name as 접근용이름,
  l.real_name as 실제이름,
  l.data_source as 데이터출처,
  l.contact_script as 관심분야,
  l.data_date as 데이터생성일,
  l.extra_info as 추가정보,
  l.lead_status as 현재상태,
  l.created_at as 리드등록일,
  l.upload_batch_id as 배치ID,

  -- 배정 정보
  la.id as 배정ID,
  u.full_name as 담당영업사원,
  u.department as 부서,
  la.assigned_at as 배정일시,

  -- 상담 정보
  ca.contact_date as 최근상담일,
  ca.contact_result as 상담결과,
  ca.contract_status as 계약상태,
  ca.contract_amount as 계약금액

FROM admin_leads_view l
LEFT JOIN lead_assignments la ON l.id = la.lead_id
LEFT JOIN users u ON la.counselor_id = u.id
LEFT JOIN counseling_activities ca ON la.id = ca.assignment_id
WHERE l.created_at >= '2025-10-01 00:00:00'
  AND l.created_at < '2025-11-01 00:00:00'
  AND l.upload_batch_id IS NULL
ORDER BY l.created_at DESC
LIMIT 2000;

-- 2. 등록 일시 분석 (어느 시간대에 생성되었는지)
SELECT
  DATE(created_at) as 등록날짜,
  DATE_TRUNC('hour', created_at) as 등록시간대,
  COUNT(*) as 개수
FROM admin_leads_view
WHERE created_at >= '2025-10-01 00:00:00'
  AND created_at < '2025-11-01 00:00:00'
  AND upload_batch_id IS NULL
GROUP BY DATE(created_at), DATE_TRUNC('hour', created_at)
ORDER BY 등록시간대;

-- 3. 데이터 소스 분석
SELECT
  data_source as 데이터출처,
  COUNT(*) as 개수,
  COUNT(DISTINCT phone) as 고유전화번호수,
  MIN(created_at) as 최초등록일,
  MAX(created_at) as 최근등록일
FROM admin_leads_view
WHERE created_at >= '2025-10-01 00:00:00'
  AND created_at < '2025-11-01 00:00:00'
  AND upload_batch_id IS NULL
GROUP BY data_source
ORDER BY 개수 DESC;

-- 4. 현재 상태 분석
SELECT
  lead_status as 현재상태,
  COUNT(*) as 개수,
  ROUND(COUNT(*) * 100.0 / 120, 2) as 비율
FROM admin_leads_view
WHERE created_at >= '2025-10-01 00:00:00'
  AND created_at < '2025-11-01 00:00:00'
  AND upload_batch_id IS NULL
GROUP BY lead_status
ORDER BY 개수 DESC;

-- 5. 배정 여부 분석
SELECT
  CASE
    WHEN la.id IS NOT NULL THEN '배정됨'
    ELSE '미배정'
  END as 배정상태,
  COUNT(*) as 개수
FROM admin_leads_view l
LEFT JOIN lead_assignments la ON l.id = la.lead_id
WHERE l.created_at >= '2025-10-01 00:00:00'
  AND l.created_at < '2025-11-01 00:00:00'
  AND l.upload_batch_id IS NULL
GROUP BY CASE WHEN la.id IS NOT NULL THEN '배정됨' ELSE '미배정' END;

-- 6. 데이터 패턴 분석 (다른 리드와 비교)
SELECT
  '배치ID NULL 리드' as 구분,
  COUNT(*) as 개수,
  COUNT(DISTINCT data_source) as 고유데이터소스수,
  COUNT(DISTINCT DATE(created_at)) as 등록일수,
  MIN(created_at) as 최초등록,
  MAX(created_at) as 최근등록
FROM admin_leads_view
WHERE created_at >= '2025-10-01 00:00:00'
  AND created_at < '2025-11-01 00:00:00'
  AND upload_batch_id IS NULL

UNION ALL

SELECT
  '배치ID 있는 리드' as 구분,
  COUNT(*) as 개수,
  COUNT(DISTINCT data_source) as 고유데이터소스수,
  COUNT(DISTINCT DATE(created_at)) as 등록일수,
  MIN(created_at) as 최초등록,
  MAX(created_at) as 최근등록
FROM admin_leads_view
WHERE created_at >= '2025-10-01 00:00:00'
  AND created_at < '2025-11-01 00:00:00'
  AND upload_batch_id IS NOT NULL;

-- 7. 특이 패턴 찾기: 같은 시간대에 여러 개 생성되었는지
SELECT
  DATE_TRUNC('minute', created_at) as 생성시각,
  COUNT(*) as 동시생성개수,
  string_agg(DISTINCT data_source, ', ') as 데이터소스들,
  string_agg(phone, ', ') as 전화번호들
FROM admin_leads_view
WHERE created_at >= '2025-10-01 00:00:00'
  AND created_at < '2025-11-01 00:00:00'
  AND upload_batch_id IS NULL
GROUP BY DATE_TRUNC('minute', created_at)
HAVING COUNT(*) > 1
ORDER BY COUNT(*) DESC, 생성시각;

-- 8. 전화번호 중복 체크 (다른 배치에도 존재하는지)
SELECT
  l_null.phone as 전화번호,
  l_null.contact_name as NULL배치_이름,
  l_null.created_at as NULL배치_등록일,
  l_with.upload_batch_id as 다른배치ID,
  l_with.created_at as 다른배치_등록일,
  ub.file_name as 다른배치_파일명
FROM admin_leads_view l_null
JOIN admin_leads_view l_with ON l_null.phone = l_with.phone
LEFT JOIN upload_batches ub ON l_with.upload_batch_id = ub.id
WHERE l_null.created_at >= '2025-10-01 00:00:00'
  AND l_null.created_at < '2025-11-01 00:00:00'
  AND l_null.upload_batch_id IS NULL
  AND l_with.upload_batch_id IS NOT NULL
ORDER BY l_null.phone, l_with.created_at;

-- 9. API나 시스템을 통해 직접 생성되었는지 확인 (추정)
-- created_at과 data_date 비교
SELECT
  CASE
    WHEN data_date IS NULL THEN 'data_date NULL'
    WHEN DATE(data_date) = DATE(created_at) THEN '같은 날 생성'
    WHEN data_date < created_at THEN '과거 데이터'
    ELSE '미래 데이터'
  END as 날짜관계,
  COUNT(*) as 개수
FROM admin_leads_view
WHERE created_at >= '2025-10-01 00:00:00'
  AND created_at < '2025-11-01 00:00:00'
  AND upload_batch_id IS NULL
GROUP BY CASE
    WHEN data_date IS NULL THEN 'data_date NULL'
    WHEN DATE(data_date) = DATE(created_at) THEN '같은 날 생성'
    WHEN data_date < created_at THEN '과거 데이터'
    ELSE '미래 데이터'
  END
ORDER BY 개수 DESC;

-- 10. 120개 샘플 데이터 (처음 20개)
SELECT
  id,
  phone,
  contact_name,
  data_source,
  data_date,
  created_at,
  lead_status
FROM admin_leads_view
WHERE created_at >= '2025-10-01 00:00:00'
  AND created_at < '2025-11-01 00:00:00'
  AND upload_batch_id IS NULL
ORDER BY created_at DESC
LIMIT 20;
