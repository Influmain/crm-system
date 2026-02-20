-- IP 승인 기능 테이블 생성
-- 실행: Supabase SQL Editor에서 실행

-- 1. 승인된 IP 테이블
CREATE TABLE IF NOT EXISTS approved_ips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  ip_address INET NOT NULL,
  description TEXT,
  approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- 같은 사용자에게 같은 IP가 중복 등록되지 않도록
  UNIQUE(user_id, ip_address)
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_approved_ips_user_id ON approved_ips(user_id);
CREATE INDEX IF NOT EXISTS idx_approved_ips_ip_address ON approved_ips(ip_address);
CREATE INDEX IF NOT EXISTS idx_approved_ips_is_active ON approved_ips(is_active);

-- 2. IP 승인 요청 테이블
CREATE TABLE IF NOT EXISTS ip_approval_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  ip_address INET NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',

  -- 처리 정보
  reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  rejection_reason TEXT,

  -- 타임스탬프
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_ip_approval_requests_user_id ON ip_approval_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_ip_approval_requests_status ON ip_approval_requests(status);
CREATE INDEX IF NOT EXISTS idx_ip_approval_requests_created_at ON ip_approval_requests(created_at DESC);

-- 3. RLS 정책 설정

-- approved_ips RLS
ALTER TABLE approved_ips ENABLE ROW LEVEL SECURITY;

-- 기존 정책 삭제 (있으면)
DROP POLICY IF EXISTS "approved_ips_super_admin_all" ON approved_ips;
DROP POLICY IF EXISTS "approved_ips_user_select_own" ON approved_ips;

-- 최고관리자: 모든 레코드 읽기/쓰기
CREATE POLICY "approved_ips_super_admin_all"
  ON approved_ips FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.is_super_admin = true
    )
  );

-- 일반 사용자: 자신의 승인된 IP만 조회 가능
CREATE POLICY "approved_ips_user_select_own"
  ON approved_ips FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- ip_approval_requests RLS
ALTER TABLE ip_approval_requests ENABLE ROW LEVEL SECURITY;

-- 기존 정책 삭제 (있으면)
DROP POLICY IF EXISTS "ip_approval_requests_super_admin_all" ON ip_approval_requests;
DROP POLICY IF EXISTS "ip_approval_requests_user_select_own" ON ip_approval_requests;
DROP POLICY IF EXISTS "ip_approval_requests_user_insert_own" ON ip_approval_requests;

-- 최고관리자: 모든 레코드 읽기/쓰기
CREATE POLICY "ip_approval_requests_super_admin_all"
  ON ip_approval_requests FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.is_super_admin = true
    )
  );

-- 일반 사용자: 자신의 요청만 조회 가능
CREATE POLICY "ip_approval_requests_user_select_own"
  ON ip_approval_requests FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- 일반 사용자: 자신의 요청만 생성 가능
CREATE POLICY "ip_approval_requests_user_insert_own"
  ON ip_approval_requests FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- 4. updated_at 자동 업데이트 트리거

-- 트리거 함수 생성 (없으면)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- approved_ips 트리거
DROP TRIGGER IF EXISTS update_approved_ips_updated_at ON approved_ips;
CREATE TRIGGER update_approved_ips_updated_at
    BEFORE UPDATE ON approved_ips
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ip_approval_requests 트리거
DROP TRIGGER IF EXISTS update_ip_approval_requests_updated_at ON ip_approval_requests;
CREATE TRIGGER update_ip_approval_requests_updated_at
    BEFORE UPDATE ON ip_approval_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
