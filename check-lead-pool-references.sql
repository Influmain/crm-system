-- ==========================================
-- lead_pool 테이블을 참조하는 모든 외래 키 찾기
-- ==========================================

-- 방법 1: 외래 키 제약 조건 확인
SELECT
  tc.table_schema AS 참조하는_스키마,
  tc.table_name AS 참조하는_테이블,
  kcu.column_name AS 참조하는_컬럼,
  ccu.table_schema AS 참조되는_스키마,
  ccu.table_name AS 참조되는_테이블,
  ccu.column_name AS 참조되는_컬럼,
  tc.constraint_name AS 제약조건명,
  rc.delete_rule AS 삭제규칙
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
JOIN information_schema.referential_constraints AS rc
  ON tc.constraint_name = rc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND ccu.table_name = 'lead_pool'
ORDER BY tc.table_name;

-- 방법 2: pg_catalog 사용 (더 자세한 정보)
SELECT
  cl.relname AS 참조하는_테이블,
  att.attname AS 참조하는_컬럼,
  cl_ref.relname AS 참조되는_테이블,
  att_ref.attname AS 참조되는_컬럼,
  con.conname AS 제약조건명,
  CASE con.confdeltype
    WHEN 'a' THEN 'NO ACTION'
    WHEN 'r' THEN 'RESTRICT'
    WHEN 'c' THEN 'CASCADE'
    WHEN 'n' THEN 'SET NULL'
    WHEN 'd' THEN 'SET DEFAULT'
  END AS 삭제규칙
FROM pg_constraint con
JOIN pg_class cl ON con.conrelid = cl.oid
JOIN pg_class cl_ref ON con.confrelid = cl_ref.oid
JOIN pg_attribute att ON att.attrelid = cl.oid AND att.attnum = ANY(con.conkey)
JOIN pg_attribute att_ref ON att_ref.attrelid = cl_ref.oid AND att_ref.attnum = ANY(con.confkey)
WHERE con.contype = 'f'
  AND cl_ref.relname = 'lead_pool'
ORDER BY cl.relname;
