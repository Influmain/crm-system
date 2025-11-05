-- ==========================================
-- 트리거 함수 확인
-- ==========================================

-- 1. log_lead_changes 함수 소스 코드 확인
SELECT
  proname as 함수명,
  pg_get_functiondef(oid) as 함수정의
FROM pg_proc
WHERE proname = 'log_lead_changes';

-- 2. 트리거가 어떤 함수를 사용하는지 확인
SELECT
  t.tgname as 트리거명,
  c.relname as 테이블명,
  p.proname as 함수명,
  CASE t.tgtype::integer & 66
    WHEN 2 THEN 'BEFORE'
    WHEN 64 THEN 'INSTEAD OF'
    ELSE 'AFTER'
  END as 실행시점,
  CASE t.tgtype::integer & 28
    WHEN 4 THEN 'INSERT'
    WHEN 8 THEN 'DELETE'
    WHEN 16 THEN 'UPDATE'
    WHEN 12 THEN 'INSERT OR DELETE'
    WHEN 20 THEN 'INSERT OR UPDATE'
    WHEN 24 THEN 'DELETE OR UPDATE'
    WHEN 28 THEN 'INSERT OR DELETE OR UPDATE'
  END as 이벤트
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE c.relname = 'lead_pool'
  AND t.tgname LIKE '%lead%';

-- 3. 함수에 auth.uid() 포함되어 있는지 확인
SELECT
  proname as 함수명,
  CASE
    WHEN prosrc LIKE '%auth.uid()%' THEN 'YES - auth.uid() 포함됨'
    ELSE 'NO - auth.uid() 없음'
  END as auth_uid_사용여부
FROM pg_proc
WHERE proname IN ('log_lead_changes', 'log_lead_insert');
