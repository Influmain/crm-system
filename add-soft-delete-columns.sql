-- users 테이블에 소프트 삭제용 컬럼 추가
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id);

-- 기존 is_active 컬럼 활용 (이미 존재한다면)
-- 소프트 삭제된 유저는 is_active = false, deleted_at != null

-- 인덱스 추가 (성능 향상)
CREATE INDEX IF NOT EXISTS idx_users_deleted_at ON public.users(deleted_at);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON public.users(is_active);