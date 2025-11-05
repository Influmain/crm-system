-- ==========================================
-- 트리거 함수에 auth.uid() 추가 (사용자 기록)
-- ==========================================

-- 1. log_lead_changes 함수 업데이트
CREATE OR REPLACE FUNCTION log_lead_changes()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- DELETE 작업 처리
  IF (TG_OP = 'DELETE') THEN
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

  -- UPDATE 작업 처리
  IF (TG_OP = 'UPDATE' AND OLD.data_source IS DISTINCT FROM NEW.data_source) THEN
    INSERT INTO lead_audit_log (lead_id, field_name, old_value, new_value, change_type, changed_by)
    VALUES (NEW.id, 'data_source', OLD.data_source, NEW.data_source, 'UPDATE', auth.uid());
  END IF;

  IF (TG_OP = 'UPDATE' AND OLD.contact_name IS DISTINCT FROM NEW.contact_name) THEN
    INSERT INTO lead_audit_log (lead_id, field_name, old_value, new_value, change_type, changed_by)
    VALUES (NEW.id, 'contact_name', OLD.contact_name, NEW.contact_name, 'UPDATE', auth.uid());
  END IF;

  IF (TG_OP = 'UPDATE' AND OLD.real_name IS DISTINCT FROM NEW.real_name) THEN
    INSERT INTO lead_audit_log (lead_id, field_name, old_value, new_value, change_type, changed_by)
    VALUES (NEW.id, 'real_name', OLD.real_name, NEW.real_name, 'UPDATE', auth.uid());
  END IF;

  IF (TG_OP = 'UPDATE' AND OLD.phone IS DISTINCT FROM NEW.phone) THEN
    INSERT INTO lead_audit_log (lead_id, field_name, old_value, new_value, change_type, changed_by)
    VALUES (NEW.id, 'phone', OLD.phone, NEW.phone, 'UPDATE', auth.uid());
  END IF;

  IF (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status) THEN
    INSERT INTO lead_audit_log (lead_id, field_name, old_value, new_value, change_type, changed_by)
    VALUES (NEW.id, 'status', OLD.status, NEW.status, 'UPDATE', auth.uid());
  END IF;

  IF (TG_OP = 'UPDATE' AND OLD.contact_script IS DISTINCT FROM NEW.contact_script) THEN
    INSERT INTO lead_audit_log (lead_id, field_name, old_value, new_value, change_type, changed_by)
    VALUES (NEW.id, 'contact_script', OLD.contact_script, NEW.contact_script, 'UPDATE', auth.uid());
  END IF;

  RETURN NEW;
END;
$$;

-- 2. log_lead_insert 함수 업데이트
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

-- 3. 확인: auth.uid() 포함되었는지 체크
SELECT
  proname as 함수명,
  CASE
    WHEN prosrc LIKE '%auth.uid()%' THEN '✅ auth.uid() 포함됨'
    ELSE '❌ auth.uid() 없음'
  END as 상태
FROM pg_proc
WHERE proname IN ('log_lead_changes', 'log_lead_insert');
