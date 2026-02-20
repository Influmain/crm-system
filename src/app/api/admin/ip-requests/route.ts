// /app/api/admin/ip-requests/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// 최고관리자 권한 확인
async function verifySuperAdmin(request: NextRequest): Promise<{ authorized: boolean; userId?: string; error?: string }> {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader) {
    return { authorized: false, error: '인증이 필요합니다.' };
  }

  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

  if (authError || !user) {
    return { authorized: false, error: '유효하지 않은 인증 토큰입니다.' };
  }

  const { data: profile } = await supabaseAdmin
    .from('users')
    .select('is_super_admin')
    .eq('id', user.id)
    .single();

  if (!profile?.is_super_admin) {
    return { authorized: false, error: '최고관리자만 접근할 수 있습니다.' };
  }

  return { authorized: true, userId: user.id };
}

// IP 승인 요청 목록 조회
export async function GET(request: NextRequest) {
  try {
    const authResult = await verifySuperAdmin(request);
    if (!authResult.authorized) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'pending';

    // IP 승인 요청 목록 조회 (사용자 정보 포함)
    let query = supabaseAdmin
      .from('ip_approval_requests')
      .select(`
        id,
        user_id,
        ip_address,
        status,
        reviewed_by,
        reviewed_at,
        rejection_reason,
        created_at,
        updated_at,
        user:users!ip_approval_requests_user_id_fkey (
          id,
          email,
          full_name,
          role,
          department
        ),
        reviewer:users!ip_approval_requests_reviewed_by_fkey (
          id,
          full_name
        )
      `)
      .order('created_at', { ascending: false });

    if (status !== 'all') {
      query = query.eq('status', status);
    }

    const { data: requests, error } = await query;

    if (error) {
      console.error('IP 승인 요청 조회 실패:', error);
      return NextResponse.json(
        { error: 'IP 승인 요청 조회에 실패했습니다.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ requests: requests || [] });

  } catch (error) {
    console.error('IP 승인 요청 목록 API 오류:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
