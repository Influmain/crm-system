// /app/api/admin/approved-ips/route.ts
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

// 승인된 IP 목록 조회
export async function GET(request: NextRequest) {
  try {
    const authResult = await verifySuperAdmin(request);
    if (!authResult.authorized) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');
    const includeInactive = searchParams.get('include_inactive') === 'true';

    let query = supabaseAdmin
      .from('approved_ips')
      .select(`
        id,
        user_id,
        ip_address,
        description,
        approved_by,
        approved_at,
        is_active,
        last_used_at,
        created_at,
        user:users!approved_ips_user_id_fkey (
          id,
          email,
          full_name,
          role,
          department
        ),
        approver:users!approved_ips_approved_by_fkey (
          id,
          full_name
        )
      `)
      .order('created_at', { ascending: false });

    if (userId) {
      query = query.eq('user_id', userId);
    }

    if (!includeInactive) {
      query = query.eq('is_active', true);
    }

    const { data: approvedIps, error } = await query;

    if (error) {
      console.error('승인된 IP 조회 실패:', error);
      return NextResponse.json(
        { error: '승인된 IP 조회에 실패했습니다.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ approved_ips: approvedIps || [] });

  } catch (error) {
    console.error('승인된 IP 목록 API 오류:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// 새 IP 수동 추가
export async function POST(request: NextRequest) {
  try {
    const authResult = await verifySuperAdmin(request);
    if (!authResult.authorized) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    const { user_id, ip_address, description } = await request.json();

    if (!user_id || !ip_address) {
      return NextResponse.json(
        { error: 'user_id와 ip_address가 필요합니다.' },
        { status: 400 }
      );
    }

    // IP 주소 형식 검증 (간단한 검증)
    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$|^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
    if (!ipRegex.test(ip_address)) {
      return NextResponse.json(
        { error: '올바른 IP 주소 형식이 아닙니다.' },
        { status: 400 }
      );
    }

    const { error } = await supabaseAdmin
      .from('approved_ips')
      .upsert({
        user_id,
        ip_address,
        description: description || null,
        approved_by: authResult.userId,
        approved_at: new Date().toISOString(),
        is_active: true
      }, {
        onConflict: 'user_id,ip_address'
      });

    if (error) {
      console.error('IP 추가 실패:', error);
      return NextResponse.json(
        { error: 'IP 추가에 실패했습니다.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'IP가 추가되었습니다.'
    });

  } catch (error) {
    console.error('IP 추가 API 오류:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
