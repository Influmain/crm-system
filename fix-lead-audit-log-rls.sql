-- ==========================================
-- lead_audit_log RLS 정책 수정
-- ==========================================

-- 기존 INSERT 정책 삭제 (있다면)
DROP POLICY IF EXISTS "lead_audit_log_insert_policy" ON lead_audit_log;

-- 새로운 INSERT 정책: 모든 인증된 사용자가 삽입 가능
CREATE POLICY "lead_audit_log_insert_policy"
  ON lead_audit_log FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- 또는 트리거가 RLS를 우회하도록 함수 수정
DROP FUNCTION IF EXISTS log_lead_changes() CASCADE;

CREATE OR REPLACE FUNCTION log_lead_changes()
RETURNS TRIGGER
SECURITY DEFINER  -- 이 옵션으로 RLS 우회
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- data_source 변경 감지
  IF (TG_OP = 'UPDATE' AND OLD.data_source IS DISTINCT FROM NEW.data_source) THEN
    INSERT INTO lead_audit_log (lead_id, field_name, old_value, new_value, change_type)
    VALUES (NEW.id, 'data_source', OLD.data_source, NEW.data_source, 'UPDATE');
  END IF;

  -- contact_name 변경 감지
  IF (TG_OP = 'UPDATE' AND OLD.contact_name IS DISTINCT FROM NEW.contact_name) THEN
    INSERT INTO lead_audit_log (lead_id, field_name, old_value, new_value, change_type)
    VALUES (NEW.id, 'contact_name', OLD.contact_name, NEW.contact_name, 'UPDATE');
  END IF;

  -- real_name 변경 감지
  IF (TG_OP = 'UPDATE' AND OLD.real_name IS DISTINCT FROM NEW.real_name) THEN
    INSERT INTO lead_audit_log (lead_id, field_name, old_value, new_value, change_type)
    VALUES (NEW.id, 'real_name', OLD.real_name, NEW.real_name, 'UPDATE');
  END IF;

  -- phone 변경 감지
  IF (TG_OP = 'UPDATE' AND OLD.phone IS DISTINCT FROM NEW.phone) THEN
    INSERT INTO lead_audit_log (lead_id, field_name, old_value, new_value, change_type)
    VALUES (NEW.id, 'phone', OLD.phone, NEW.phone, 'UPDATE');
  END IF;

  -- status 변경 감지
  IF (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status) THEN
    INSERT INTO lead_audit_log (lead_id, field_name, old_value, new_value, change_type)
    VALUES (NEW.id, 'status', OLD.status, NEW.status, 'UPDATE');
  END IF;

  -- contact_script 변경 감지
  IF (TG_OP = 'UPDATE' AND OLD.contact_script IS DISTINCT FROM NEW.contact_script) THEN
    INSERT INTO lead_audit_log (lead_id, field_name, old_value, new_value, change_type)
    VALUES (NEW.id, 'contact_script', OLD.contact_script, NEW.contact_script, 'UPDATE');
  END IF;

  RETURN NEW;
END;
$$;

-- 트리거 재생성
DROP TRIGGER IF EXISTS lead_changes_trigger ON lead_pool;
CREATE TRIGGER lead_changes_trigger
  AFTER UPDATE ON lead_pool
  FOR EACH ROW
  EXECUTE FUNCTION log_lead_changes();

-- 확인
SELECT
  proname as function_name,
  prosecdef as is_security_definer
FROM pg_proc
WHERE proname = 'log_lead_changes';
