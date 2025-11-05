-- ==========================================
-- 리드 변경 이력 추적 시스템
-- ==========================================
-- 용도: data_source 등 중요 필드 변경 이력 자동 기록

-- 1. 변경 이력 테이블 생성
CREATE TABLE IF NOT EXISTS lead_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 변경 대상
  lead_id UUID NOT NULL REFERENCES lead_pool(id) ON DELETE CASCADE,

  -- 변경 내용
  field_name TEXT NOT NULL,           -- 변경된 필드명 (data_source, contact_name 등)
  old_value TEXT,                     -- 이전 값
  new_value TEXT,                     -- 새 값

  -- 변경 정보
  changed_by UUID REFERENCES users(id) ON DELETE SET NULL,  -- 변경한 사용자
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),            -- 변경 시간
  change_type TEXT NOT NULL CHECK (change_type IN ('INSERT', 'UPDATE', 'DELETE')),

  -- 메타데이터
  user_ip TEXT,                       -- 사용자 IP (선택)
  user_agent TEXT,                    -- 사용자 브라우저 (선택)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_lead_audit_log_lead_id ON lead_audit_log(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_audit_log_field_name ON lead_audit_log(field_name);
CREATE INDEX IF NOT EXISTS idx_lead_audit_log_changed_at ON lead_audit_log(changed_at DESC);

-- RLS 활성화
ALTER TABLE lead_audit_log ENABLE ROW LEVEL SECURITY;

-- RLS 정책: 인증된 사용자만 조회 가능
CREATE POLICY "lead_audit_log_select_policy"
  ON lead_audit_log FOR SELECT
  TO authenticated
  USING (true);

-- 2. 자동 이력 기록 트리거 함수 생성
CREATE OR REPLACE FUNCTION log_lead_changes()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql;

-- 3. 트리거 생성 (lead_pool 테이블에 적용)
DROP TRIGGER IF EXISTS lead_changes_trigger ON lead_pool;
CREATE TRIGGER lead_changes_trigger
  AFTER UPDATE ON lead_pool
  FOR EACH ROW
  EXECUTE FUNCTION log_lead_changes();

-- 코멘트 추가
COMMENT ON TABLE lead_audit_log IS '리드 주요 필드 변경 이력 추적';
COMMENT ON COLUMN lead_audit_log.field_name IS '변경된 필드명 (data_source, contact_name 등)';
COMMENT ON COLUMN lead_audit_log.old_value IS '변경 전 값';
COMMENT ON COLUMN lead_audit_log.new_value IS '변경 후 값';
COMMENT ON COLUMN lead_audit_log.change_type IS 'INSERT, UPDATE, DELETE';

-- ==========================================
-- 사용 예시
-- ==========================================

/*
-- 특정 리드의 data_source 변경 이력 조회
SELECT
  field_name as 필드,
  old_value as 이전값,
  new_value as 새값,
  changed_at as 변경일시,
  u.full_name as 변경자
FROM lead_audit_log al
LEFT JOIN users u ON al.changed_by = u.id
WHERE al.lead_id = '여기에_리드_ID'
  AND al.field_name = 'data_source'
ORDER BY al.changed_at DESC;

-- 10월 리드의 data_source 변경 이력
SELECT
  lp.phone as 전화번호,
  lp.contact_name as 이름,
  al.old_value as 이전출처,
  al.new_value as 새출처,
  al.changed_at as 변경일시,
  u.full_name as 변경자
FROM lead_pool lp
JOIN lead_audit_log al ON lp.id = al.lead_id
LEFT JOIN users u ON al.changed_by = u.id
WHERE lp.created_at >= '2025-10-01 00:00:00'
  AND lp.created_at < '2025-11-01 00:00:00'
  AND al.field_name = 'data_source'
ORDER BY al.changed_at DESC;
*/
