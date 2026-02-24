-- approved_ips 테이블: 글로벌 IP 화이트리스트
-- 이 목록에 IP가 있으면 → 목록에 있는 IP만 로그인 가능
-- 이 목록이 비어있으면 → 모든 IP 허용 (제한 없음)
-- 최고관리자는 항상 IP 제한 없이 로그인 가능
CREATE TABLE IF NOT EXISTS approved_ips (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ip_address VARCHAR(45) NOT NULL UNIQUE,
  description TEXT,
  added_by UUID REFERENCES users(id),
  is_active BOOLEAN DEFAULT TRUE,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_approved_ips_ip_address ON approved_ips(ip_address);
CREATE INDEX IF NOT EXISTS idx_approved_ips_active ON approved_ips(is_active);

-- RLS 정책 (service role로 접근)
ALTER TABLE approved_ips ENABLE ROW LEVEL SECURITY;

CREATE POLICY "approved_ips_admin_all" ON approved_ips
  FOR ALL
  USING (true)
  WITH CHECK (true);
