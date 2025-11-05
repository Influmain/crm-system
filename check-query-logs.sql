-- 현재 실행중인 쿼리 확인
SELECT
  pid,
  usename,
  application_name,
  state,
  query,
  query_start
FROM pg_stat_activity
WHERE state != 'idle'
ORDER BY query_start DESC;

-- 쿼리 통계 확인 (pg_stat_statements 확장 필요)
-- Supabase에서 지원하는 경우:
SELECT
  query,
  calls,
  total_exec_time,
  mean_exec_time,
  rows
FROM pg_stat_statements
WHERE query LIKE '%admin_leads_view%'
ORDER BY calls DESC
LIMIT 20;
