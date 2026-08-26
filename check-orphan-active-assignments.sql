-- ============================================================
-- 목적: 드롭다운 개수(lead_assignments active) vs 목록(admin_leads_view)
--       카운트 불일치(+1) 원인 진단
-- ============================================================

-- [1] 상담원별: 테이블 active 개수 vs 뷰 표시 개수 비교
--     diff != 0 인 상담원이 문제의 대상
SELECT
  la.counselor_id,
  u.full_name,
  COUNT(*) FILTER (WHERE la.status = 'active')                     AS table_active_count,
  (SELECT COUNT(*) FROM admin_leads_view v
     WHERE v.counselor_id = la.counselor_id
       AND v.assignment_id IS NOT NULL)                            AS view_count
FROM lead_assignments la
LEFT JOIN users u ON u.id = la.counselor_id
GROUP BY la.counselor_id, u.full_name
HAVING COUNT(*) FILTER (WHERE la.status = 'active') <>
       (SELECT COUNT(*) FROM admin_leads_view v
          WHERE v.counselor_id = la.counselor_id
            AND v.assignment_id IS NOT NULL);

-- [2] 케이스1 검증 — 고아 배정: active인데 lead_pool에 리드가 없음
SELECT la.id AS assignment_id, la.lead_id, la.counselor_id, la.status, la.assigned_at
FROM lead_assignments la
LEFT JOIN lead_pool lp ON lp.id = la.lead_id
WHERE la.status = 'active'
  AND lp.id IS NULL
ORDER BY la.assigned_at DESC;

-- [3] 케이스2 검증 — 중복 배정: 같은 리드에 active 배정 2건 이상
SELECT lead_id, COUNT(*) AS active_dups, array_agg(id) AS assignment_ids
FROM lead_assignments
WHERE status = 'active'
GROUP BY lead_id
HAVING COUNT(*) > 1;
