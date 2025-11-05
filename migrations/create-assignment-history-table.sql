-- ==========================================
-- 배정 이력 추적 테이블 생성
-- ==========================================
-- 용도: 최초 배정, 재배정, 미배정 등 모든 배정 변경 이력 추적

CREATE TABLE IF NOT EXISTS assignment_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 관련 ID들
  lead_id UUID NOT NULL REFERENCES lead_pool(id) ON DELETE CASCADE,
  assignment_id UUID REFERENCES lead_assignments(id) ON DELETE SET NULL,

  -- 액션 타입
  action_type TEXT NOT NULL CHECK (action_type IN ('assign', 'reassign', 'unassign')),
  -- assign: 최초 배정
  -- reassign: 재배정 (다른 영업사원으로 변경)
  -- unassign: 미배정 처리

  -- 담당자 정보
  previous_counselor_id UUID REFERENCES users(id) ON DELETE SET NULL,  -- 이전 담당자 (재배정 시)
  new_counselor_id UUID REFERENCES users(id) ON DELETE SET NULL,       -- 새 담당자

  -- 변경 정보
  changed_by UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,    -- 변경한 관리자/사용자
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),                       -- 변경 시간
  reason TEXT,                                                          -- 변경 사유 (선택)

  -- 메타데이터
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 인덱스 생성 (성능 향상)
CREATE INDEX IF NOT EXISTS idx_assignment_history_lead_id ON assignment_history(lead_id);
CREATE INDEX IF NOT EXISTS idx_assignment_history_assignment_id ON assignment_history(assignment_id);
CREATE INDEX IF NOT EXISTS idx_assignment_history_action_type ON assignment_history(action_type);
CREATE INDEX IF NOT EXISTS idx_assignment_history_changed_at ON assignment_history(changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_assignment_history_counselors ON assignment_history(previous_counselor_id, new_counselor_id);

-- RLS (Row Level Security) 활성화
ALTER TABLE assignment_history ENABLE ROW LEVEL SECURITY;

-- RLS 정책: 인증된 사용자만 조회 가능
CREATE POLICY "assignment_history_select_policy"
  ON assignment_history FOR SELECT
  TO authenticated
  USING (true);

-- RLS 정책: 인증된 사용자만 삽입 가능
CREATE POLICY "assignment_history_insert_policy"
  ON assignment_history FOR INSERT
  TO authenticated
  WITH CHECK (changed_by = auth.uid());

-- 코멘트 추가
COMMENT ON TABLE assignment_history IS '리드 배정/재배정/미배정 이력 추적 테이블';
COMMENT ON COLUMN assignment_history.action_type IS 'assign: 최초배정, reassign: 재배정, unassign: 미배정';
COMMENT ON COLUMN assignment_history.previous_counselor_id IS '재배정 시 이전 담당자 (assign일 때는 NULL)';
COMMENT ON COLUMN assignment_history.new_counselor_id IS '새로 배정된 담당자 (unassign일 때는 NULL)';
