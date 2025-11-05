-- ==========================================
-- 120개 null 배치 리드 패턴 분석
-- ==========================================

-- 1. 패턴 비교 - 정상 리드(배치ID 있음)와 비교
SELECT
  '배치ID NULL 리드' as 구분,
  COUNT(*) as 개수,
  COUNT(DISTINCT data_source) as 고유데이터소스수,
  COUNT(DISTINCT DATE(created_at)) as 등록일수,
  TO_CHAR(MIN(created_at), 'YYYY-MM-DD HH24:MI:SS') as 최초등록,
  TO_CHAR(MAX(created_at), 'YYYY-MM-DD HH24:MI:SS') as 최근등록,
  ROUND(AVG(EXTRACT(EPOCH FROM (created_at - data_date))/3600), 2) as 평균시차_시간
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
  TO_CHAR(MIN(created_at), 'YYYY-MM-DD HH24:MI:SS') as 최초등록,
  TO_CHAR(MAX(created_at), 'YYYY-MM-DD HH24:MI:SS') as 최근등록,
  ROUND(AVG(EXTRACT(EPOCH FROM (created_at - data_date))/3600), 2) as 평균시차_시간
FROM admin_leads_view
WHERE created_at >= '2025-10-01 00:00:00'
  AND created_at < '2025-11-01 00:00:00'
  AND upload_batch_id IS NOT NULL;

-- 2. 동시 생성 패턴 - 같은 시간(1분 단위)에 여러 개 생성되었는지
SELECT
  TO_CHAR(DATE_TRUNC('minute', created_at), 'YYYY-MM-DD HH24:MI') as 생성시각,
  COUNT(*) as 동시생성개수,
  string_agg(DISTINCT data_source, ', ') as 데이터소스들,
  string_agg(SUBSTRING(phone, 1, 8) || '***', ', ') as 전화번호들_일부
FROM admin_leads_view
WHERE created_at >= '2025-10-01 00:00:00'
  AND created_at < '2025-11-01 00:00:00'
  AND upload_batch_id IS NULL
GROUP BY DATE_TRUNC('minute', created_at)
ORDER BY COUNT(*) DESC, DATE_TRUNC('minute', created_at);

-- 3. 중복 체크 - 같은 전화번호가 다른 배치에도 있는지
SELECT
  l_null.phone as 전화번호,
  l_null.contact_name as NULL배치_이름,
  TO_CHAR(l_null.created_at, 'YYYY-MM-DD HH24:MI:SS') as NULL배치_등록일,
  l_with.upload_batch_id as 다른배치ID,
  TO_CHAR(l_with.created_at, 'YYYY-MM-DD HH24:MI:SS') as 다른배치_등록일,
  ub.file_name as 다른배치_파일명,
  u.full_name as 업로드자
FROM admin_leads_view l_null
JOIN admin_leads_view l_with ON l_null.phone = l_with.phone
LEFT JOIN upload_batches ub ON l_with.upload_batch_id = ub.id
LEFT JOIN users u ON ub.uploaded_by = u.id
WHERE l_null.created_at >= '2025-10-01 00:00:00'
  AND l_null.created_at < '2025-11-01 00:00:00'
  AND l_null.upload_batch_id IS NULL
  AND l_with.upload_batch_id IS NOT NULL
ORDER BY l_null.phone, l_with.created_at;

-- 3-1. 중복 체크 요약
SELECT
  '중복 있음 (다른 배치에 존재)' as 구분,
  COUNT(DISTINCT l_null.phone) as 전화번호수
FROM admin_leads_view l_null
JOIN admin_leads_view l_with ON l_null.phone = l_with.phone
WHERE l_null.created_at >= '2025-10-01 00:00:00'
  AND l_null.created_at < '2025-11-01 00:00:00'
  AND l_null.upload_batch_id IS NULL
  AND l_with.upload_batch_id IS NOT NULL

UNION ALL

SELECT
  '중복 없음 (배치ID NULL만 존재)' as 구분,
  COUNT(DISTINCT l_null.phone) as 전화번호수
FROM admin_leads_view l_null
WHERE l_null.created_at >= '2025-10-01 00:00:00'
  AND l_null.created_at < '2025-11-01 00:00:00'
  AND l_null.upload_batch_id IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM admin_leads_view l_with
    WHERE l_with.phone = l_null.phone
    AND l_with.upload_batch_id IS NOT NULL
  );

-- 4. 날짜 관계 분석 - data_date와 created_at 비교
SELECT
  CASE
    WHEN data_date IS NULL THEN '1. data_date NULL (날짜정보없음)'
    WHEN DATE(data_date) = DATE(created_at) THEN '2. 같은 날 생성 (당일처리)'
    WHEN data_date < created_at THEN '3. 과거 데이터 (나중에 등록)'
    ELSE '4. 미래 데이터 (이상)'
  END as 날짜관계,
  COUNT(*) as 개수,
  ROUND(COUNT(*) * 100.0 / 120, 2) as 비율,
  MIN(TO_CHAR(created_at, 'YYYY-MM-DD')) as 최초등록일,
  MAX(TO_CHAR(created_at, 'YYYY-MM-DD')) as 최근등록일
FROM admin_leads_view
WHERE created_at >= '2025-10-01 00:00:00'
  AND created_at < '2025-11-01 00:00:00'
  AND upload_batch_id IS NULL
GROUP BY CASE
    WHEN data_date IS NULL THEN '1. data_date NULL (날짜정보없음)'
    WHEN DATE(data_date) = DATE(created_at) THEN '2. 같은 날 생성 (당일처리)'
    WHEN data_date < created_at THEN '3. 과거 데이터 (나중에 등록)'
    ELSE '4. 미래 데이터 (이상)'
  END
ORDER BY 날짜관계;

-- 5. 시간대별 생성 분포 (업무시간/야간 구분)
SELECT
  CASE
    WHEN EXTRACT(HOUR FROM created_at) BETWEEN 0 AND 5 THEN '1. 새벽 (00-05시)'
    WHEN EXTRACT(HOUR FROM created_at) BETWEEN 6 AND 8 THEN '2. 이른아침 (06-08시)'
    WHEN EXTRACT(HOUR FROM created_at) BETWEEN 9 AND 11 THEN '3. 오전 (09-11시)'
    WHEN EXTRACT(HOUR FROM created_at) BETWEEN 12 AND 13 THEN '4. 점심 (12-13시)'
    WHEN EXTRACT(HOUR FROM created_at) BETWEEN 14 AND 17 THEN '5. 오후 (14-17시)'
    WHEN EXTRACT(HOUR FROM created_at) BETWEEN 18 AND 21 THEN '6. 저녁 (18-21시)'
    ELSE '7. 밤 (22-23시)'
  END as 시간대,
  COUNT(*) as 개수,
  ROUND(COUNT(*) * 100.0 / 120, 2) as 비율
FROM admin_leads_view
WHERE created_at >= '2025-10-01 00:00:00'
  AND created_at < '2025-11-01 00:00:00'
  AND upload_batch_id IS NULL
GROUP BY CASE
    WHEN EXTRACT(HOUR FROM created_at) BETWEEN 0 AND 5 THEN '1. 새벽 (00-05시)'
    WHEN EXTRACT(HOUR FROM created_at) BETWEEN 6 AND 8 THEN '2. 이른아침 (06-08시)'
    WHEN EXTRACT(HOUR FROM created_at) BETWEEN 9 AND 11 THEN '3. 오전 (09-11시)'
    WHEN EXTRACT(HOUR FROM created_at) BETWEEN 12 AND 13 THEN '4. 점심 (12-13시)'
    WHEN EXTRACT(HOUR FROM created_at) BETWEEN 14 AND 17 THEN '5. 오후 (14-17시)'
    WHEN EXTRACT(HOUR FROM created_at) BETWEEN 18 AND 21 THEN '6. 저녁 (18-21시)'
    ELSE '7. 밤 (22-23시)'
  END
ORDER BY 시간대;

-- 6. 데이터 소스별 상세 분석
SELECT
  data_source as 데이터출처,
  COUNT(*) as 개수,
  COUNT(DISTINCT phone) as 고유전화번호,
  COUNT(DISTINCT contact_name) as 고유이름,
  TO_CHAR(MIN(created_at), 'YYYY-MM-DD HH24:MI') as 최초등록,
  TO_CHAR(MAX(created_at), 'YYYY-MM-DD HH24:MI') as 최근등록,
  CASE
    WHEN MIN(created_at) = MAX(created_at) THEN '단일시점'
    WHEN MAX(created_at) - MIN(created_at) < INTERVAL '1 hour' THEN '1시간내'
    WHEN MAX(created_at) - MIN(created_at) < INTERVAL '1 day' THEN '당일'
    ELSE '여러날'
  END as 등록패턴
FROM admin_leads_view
WHERE created_at >= '2025-10-01 00:00:00'
  AND created_at < '2025-11-01 00:00:00'
  AND upload_batch_id IS NULL
GROUP BY data_source
ORDER BY 개수 DESC;
