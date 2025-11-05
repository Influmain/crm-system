-- 총 개수: 1009개

-- ===================================================================
-- 업로드 정보가 없는 리드 분석 (왜 null인지 확인)
-- ===================================================================

-- 1. upload_batch_id가 null인 리드
SELECT COUNT(*) as leads_without_batch_id
FROM admin_leads_view
WHERE created_at >= '2025-10-01 00:00:00'
  AND created_at < '2025-11-01 00:00:00'
  AND upload_batch_id IS NULL;

-- 2. upload_batch_id는 있지만 batch 정보가 없는 리드 (배치가 삭제됨)
SELECT COUNT(*) as leads_with_deleted_batch
FROM admin_leads_view l
LEFT JOIN upload_batches ub ON l.upload_batch_id = ub.id
WHERE l.created_at >= '2025-10-01 00:00:00'
  AND l.created_at < '2025-11-01 00:00:00'
  AND l.upload_batch_id IS NOT NULL
  AND ub.id IS NULL;

-- 3. batch는 있지만 uploaded_by가 null인 경우
SELECT COUNT(*) as batches_without_uploader
FROM admin_leads_view l
JOIN upload_batches ub ON l.upload_batch_id = ub.id
WHERE l.created_at >= '2025-10-01 00:00:00'
  AND l.created_at < '2025-11-01 00:00:00'
  AND ub.uploaded_by IS NULL;

-- 4. uploaded_by는 있지만 users 테이블에 유저가 없는 경우 (유저 삭제됨)
SELECT COUNT(*) as leads_with_deleted_user
FROM admin_leads_view l
JOIN upload_batches ub ON l.upload_batch_id = ub.id
LEFT JOIN users u ON ub.uploaded_by = u.id
WHERE l.created_at >= '2025-10-01 00:00:00'
  AND l.created_at < '2025-11-01 00:00:00'
  AND ub.uploaded_by IS NOT NULL
  AND u.id IS NULL;

-- ===================================================================
-- 결과: 120개가 upload_batch_id가 null
-- 이 120개의 리드가 언제 생성되었는지 확인
-- ===================================================================

SELECT
  DATE(created_at) as creation_date,
  COUNT(*) as count,
  string_agg(DISTINCT data_source, ', ') as data_sources
FROM admin_leads_view
WHERE created_at >= '2025-10-01 00:00:00'
  AND created_at < '2025-11-01 00:00:00'
  AND upload_batch_id IS NULL
GROUP BY DATE(created_at)
ORDER BY creation_date;

-- 이 120개의 상세 정보 확인
SELECT
  id,
  phone,
  contact_name,
  data_source,
  created_at,
  lead_status
FROM admin_leads_view
WHERE created_at >= '2025-10-01 00:00:00'
  AND created_at < '2025-11-01 00:00:00'
  AND upload_batch_id IS NULL
ORDER BY created_at DESC
LIMIT 50;

-- ===================================================================
-- CSV 내보내기용 쿼리 (업로드한 유저 정보 포함)
-- ===================================================================

SELECT
  l.id,
  l.phone,
  l.contact_name,
  l.real_name,
  l.data_source,
  l.contact_script,
  l.data_date,
  l.extra_info,
  l.lead_status,
  l.created_at,
  l.upload_batch_id,
  ub.file_name as upload_file_name,
  u.email as uploaded_by_email,
  u.full_name as uploaded_by_name,
  l.counselor_name,
  l.assigned_at,
  l.latest_contact_result,
  l.contract_status,
  l.contract_amount
FROM admin_leads_view l
LEFT JOIN upload_batches ub ON l.upload_batch_id = ub.id
LEFT JOIN users u ON ub.uploaded_by = u.id
WHERE l.created_at >= '2025-10-01 00:00:00'
  AND l.created_at < '2025-11-01 00:00:00'
ORDER BY l.created_at DESC
LIMIT 2000;

-- 통계: 10월 리드 수
SELECT
  COUNT(*) as total_leads,
  COUNT(CASE WHEN lead_status = 'available' THEN 1 END) as available_leads,
  COUNT(CASE WHEN lead_status = 'assigned' THEN 1 END) as assigned_leads,
  COUNT(CASE WHEN lead_status = 'contracted' THEN 1 END) as contracted_leads
FROM admin_leads_view
WHERE created_at >= '2025-10-01 00:00:00'
  AND created_at < '2025-11-01 00:00:00';

-- 날짜별 등록 수
SELECT
  DATE(created_at) as registration_date,
  COUNT(*) as daily_count
FROM admin_leads_view
WHERE created_at >= '2025-10-01 00:00:00'
  AND created_at < '2025-11-01 00:00:00'
GROUP BY DATE(created_at)
ORDER BY registration_date;

-- 데이터 소스별 분포
SELECT
  data_source,
  COUNT(*) as count
FROM admin_leads_view
WHERE created_at >= '2025-10-01 00:00:00'
  AND created_at < '2025-11-01 00:00:00'
GROUP BY data_source
ORDER BY count DESC;
