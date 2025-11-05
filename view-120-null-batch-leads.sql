-- ==========================================
-- 10월 upload_batch_id가 null인 120개 리드 전체 보기
-- ==========================================

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

  -- 배정 정보
  u.full_name as 담당영업사원,
  u.department as 부서,
  la.assigned_at as 배정일시,

  -- 상담 정보
  ca.contact_date as 최근상담일,
  ca.contract_status as 계약상태,
  ca.contract_amount as 계약금액

FROM admin_leads_view l
LEFT JOIN lead_assignments la ON l.id = la.lead_id
LEFT JOIN users u ON la.counselor_id = u.id
LEFT JOIN counseling_activities ca ON la.id = ca.assignment_id
WHERE l.created_at >= '2025-10-01 00:00:00'
  AND l.created_at < '2025-11-01 00:00:00'
  AND l.upload_batch_id IS NULL
ORDER BY l.created_at DESC;
