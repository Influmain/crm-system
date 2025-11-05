-- ==========================================
-- 리드 삭제 로그 추가
-- ==========================================

-- 기존 트리거 함수 수정 (UPDATE + DELETE 모두 감지)
CREATE OR REPLACE FUNCTION log_lead_changes()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- DELETE 작업 처리
  IF (TG_OP = 'DELETE') THEN
    -- 삭제 시 모든 주요 정보를 old_value에 JSON으로 저장
    INSERT INTO lead_audit_log (
      lead_id,
      field_name,
      old_value,
      new_value,
      change_type,
      changed_by
    ) VALUES (
      OLD.id,
      'lead_deleted',
      jsonb_build_object(
        'phone', OLD.phone,
        'contact_name', OLD.contact_name,
        'real_name', OLD.real_name,
        'data_source', OLD.data_source,
        'contact_script', OLD.contact_script,
        'status', OLD.status
      )::text,
      NULL,
      'DELETE',
      auth.uid()
    );
    RETURN OLD;
  END IF;

  -- UPDATE 작업 처리 (기존 로직)

  -- data_source 변경 감지
  IF (TG_OP = 'UPDATE' AND OLD.data_source IS DISTINCT FROM NEW.data_source) THEN
    INSERT INTO lead_audit_log (lead_id, field_name, old_value, new_value, change_type, changed_by)
    VALUES (NEW.id, 'data_source', OLD.data_source, NEW.data_source, 'UPDATE', auth.uid());
  END IF;

  -- contact_name 변경 감지
  IF (TG_OP = 'UPDATE' AND OLD.contact_name IS DISTINCT FROM NEW.contact_name) THEN
    INSERT INTO lead_audit_log (lead_id, field_name, old_value, new_value, change_type, changed_by)
    VALUES (NEW.id, 'contact_name', OLD.contact_name, NEW.contact_name, 'UPDATE', auth.uid());
  END IF;

  -- real_name 변경 감지
  IF (TG_OP = 'UPDATE' AND OLD.real_name IS DISTINCT FROM NEW.real_name) THEN
    INSERT INTO lead_audit_log (lead_id, field_name, old_value, new_value, change_type, changed_by)
    VALUES (NEW.id, 'real_name', OLD.real_name, NEW.real_name, 'UPDATE', auth.uid());
  END IF;

  -- phone 변경 감지
  IF (TG_OP = 'UPDATE' AND OLD.phone IS DISTINCT FROM NEW.phone) THEN
    INSERT INTO lead_audit_log (lead_id, field_name, old_value, new_value, change_type, changed_by)
    VALUES (NEW.id, 'phone', OLD.phone, NEW.phone, 'UPDATE', auth.uid());
  END IF;

  -- status 변경 감지
  IF (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status) THEN
    INSERT INTO lead_audit_log (lead_id, field_name, old_value, new_value, change_type, changed_by)
    VALUES (NEW.id, 'status', OLD.status, NEW.status, 'UPDATE', auth.uid());
  END IF;

  -- contact_script 변경 감지
  IF (TG_OP = 'UPDATE' AND OLD.contact_script IS DISTINCT FROM NEW.contact_script) THEN
    INSERT INTO lead_audit_log (lead_id, field_name, old_value, new_value, change_type, changed_by)
    VALUES (NEW.id, 'contact_script', OLD.contact_script, NEW.contact_script, 'UPDATE', auth.uid());
  END IF;

  RETURN NEW;
END;
$$;

-- INSERT 트리거 함수 (먼저 정의)
CREATE OR REPLACE FUNCTION log_lead_insert()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO lead_audit_log (
    lead_id,
    field_name,
    old_value,
    new_value,
    change_type,
    changed_by
  ) VALUES (
    NEW.id,
    'lead_created',
    NULL,
    jsonb_build_object(
      'phone', NEW.phone,
      'contact_name', NEW.contact_name,
      'data_source', NEW.data_source,
      'upload_batch_id', NEW.upload_batch_id
    )::text,
    'INSERT',
    auth.uid()
  );
  RETURN NEW;
END;
$$;

-- 트리거 재생성 (UPDATE + DELETE 모두 감지)
DROP TRIGGER IF EXISTS lead_changes_trigger ON lead_pool;
CREATE TRIGGER lead_changes_trigger
  AFTER UPDATE OR DELETE ON lead_pool
  FOR EACH ROW
  EXECUTE FUNCTION log_lead_changes();

-- INSERT도 추적 (선택사항 - 주석 해제하면 활성화)
-- DROP TRIGGER IF EXISTS lead_insert_trigger ON lead_pool;
-- CREATE TRIGGER lead_insert_trigger
--   AFTER INSERT ON lead_pool
--   FOR EACH ROW
--   EXECUTE FUNCTION log_lead_insert();

-- ==========================================
-- 삭제 로그 조회 쿼리
-- ==========================================

-- 10월에 삭제된 리드 확인
SELECT
  al.lead_id as 삭제된리드ID,
  al.old_value as 삭제된데이터,
  TO_CHAR(al.changed_at, 'YYYY-MM-DD HH24:MI:SS') as 삭제일시,
  u.full_name as 삭제자,
  u.role as 역할
FROM lead_audit_log al
LEFT JOIN users u ON al.changed_by = u.id
WHERE al.change_type = 'DELETE'
  AND al.changed_at >= '2025-10-01 00:00:00'
  AND al.changed_at < '2025-11-01 00:00:00'
ORDER BY al.changed_at DESC;

-- 특정 리드가 삭제되었는지 확인
-- SELECT * FROM lead_audit_log
-- WHERE lead_id = '여기에_리드_ID'
-- AND change_type = 'DELETE';

-- ==========================================
-- 테스트 확인용 쿼리
-- ==========================================

-- 1. 최근 모든 로그 확인 (생성/수정/삭제)
SELECT
  al.id,
  al.lead_id,
  al.change_type as 변경유형,
  al.field_name as 필드명,
  al.old_value as 이전값,
  al.new_value as 새값,
  TO_CHAR(al.changed_at, 'YYYY-MM-DD HH24:MI:SS') as 변경일시,
  u.full_name as 변경자
FROM lead_audit_log al
LEFT JOIN users u ON al.changed_by = u.id
ORDER BY al.changed_at DESC
LIMIT 50;

-- 2. 최근 삭제 로그만 확인
SELECT
  al.lead_id as 삭제된리드ID,
  al.old_value as 삭제된데이터,
  TO_CHAR(al.changed_at, 'YYYY-MM-DD HH24:MI:SS') as 삭제일시,
  u.full_name as 삭제자
FROM lead_audit_log al
LEFT JOIN users u ON al.changed_by = u.id
WHERE al.change_type = 'DELETE'
ORDER BY al.changed_at DESC
LIMIT 20;

-- 3. 최근 수정 로그만 확인
SELECT
  al.lead_id,
  al.field_name as 수정된필드,
  al.old_value as 이전값,
  al.new_value as 새값,
  TO_CHAR(al.changed_at, 'YYYY-MM-DD HH24:MI:SS') as 수정일시,
  u.full_name as 수정자
FROM lead_audit_log al
LEFT JOIN users u ON al.changed_by = u.id
WHERE al.change_type = 'UPDATE'
ORDER BY al.changed_at DESC
LIMIT 20;

-- 4. 변경 유형별 통계
SELECT
  change_type as 변경유형,
  COUNT(*) as 건수,
  COUNT(DISTINCT lead_id) as 영향받은리드수
FROM lead_audit_log
GROUP BY change_type
ORDER BY 건수 DESC;
