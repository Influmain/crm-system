-- ==========================================
-- lead_audit_log 외래 키 제약 제거
-- ==========================================
-- 문제: 리드 삭제 시 DELETE 트리거가 lead_audit_log에 기록하려 하지만
--       lead_id 외래 키 제약 때문에 에러 발생
-- 해결: lead_id 외래 키 제약을 제거하여 삭제된 리드의 로그도 보관 가능하게 함

-- 1. 기존 외래 키 제약 제거
ALTER TABLE lead_audit_log
DROP CONSTRAINT IF EXISTS lead_audit_log_lead_id_fkey;

-- 2. 확인 쿼리
SELECT
  tc.constraint_name AS 제약조건명,
  tc.table_name AS 테이블,
  kcu.column_name AS 컬럼,
  ccu.table_name AS 참조테이블,
  ccu.column_name AS 참조컬럼
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.table_name = 'lead_audit_log'
  AND tc.constraint_type = 'FOREIGN KEY';

-- 설명:
-- lead_audit_log는 이력 테이블이므로 삭제된 리드의 기록도 보관해야 합니다.
-- 따라서 lead_pool과의 외래 키 관계를 제거하고 lead_id를 단순 UUID로 유지합니다.
