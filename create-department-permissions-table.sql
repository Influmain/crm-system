-- 부서 권한 시스템 DB 테이블 생성
CREATE TABLE IF NOT EXISTS department_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  department VARCHAR(50) NOT NULL,
  granted_by UUID REFERENCES auth.users(id),
  granted_at TIMESTAMP DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- 같은 사용자의 같은 부서는 한 번만 허용
  UNIQUE(user_id, department)
);

-- 인덱스 생성 (성능 향상)
CREATE INDEX IF NOT EXISTS idx_department_permissions_user_id ON department_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_department_permissions_department ON department_permissions(department);
CREATE INDEX IF NOT EXISTS idx_department_permissions_active ON department_permissions(is_active);

-- 샘플 데이터 (테스트용)
-- INSERT INTO department_permissions (user_id, department, granted_by) VALUES 
-- ('ccdc7b46-d78e-4745-8ea9-50718525f2b5', '1팀', '71154948-6677-4969-8ac2-f1eb4f9d0f80'),
-- ('ccdc7b46-d78e-4745-8ea9-50718525f2b5', '2팀', '71154948-6677-4969-8ac2-f1eb4f9d0f80');