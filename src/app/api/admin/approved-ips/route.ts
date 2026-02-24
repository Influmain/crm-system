import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function checkAuth(request: NextRequest) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader) return { authorized: false as const, error: '인증이 필요합니다.' };

  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !user) return { authorized: false as const, error: '유효하지 않은 인증 토큰입니다.' };

  const { data: profile } = await supabaseAdmin
    .from('users')
    .select('is_super_admin')
    .eq('id', user.id)
    .single();

  if (!profile?.is_super_admin) {
    return { authorized: false as const, error: '최고관리자만 접근할 수 있습니다.' };
  }

  return { authorized: true as const, userId: user.id };
}

// GET: 전체 IP 목록 조회 (글로벌)
export async function GET(request: NextRequest) {
  const auth = await checkAuth(request);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const includeInactive = searchParams.get('include_inactive') === 'true';

  let query = supabaseAdmin
    .from('approved_ips')
    .select(`
      id, ip_address, description, approved_by, approved_at,
      is_active, last_used_at, created_at,
      approver:users!approved_ips_approved_by_fkey (id, full_name)
    `)
    .order('created_at', { ascending: false });

  if (!includeInactive) query = (query as any).eq('is_active', true);

  const { data, error } = await query;
  if (error) {
    console.error('IP 목록 조회 실패:', error);
    return NextResponse.json({ error: 'IP 목록 조회에 실패했습니다.' }, { status: 500 });
  }

  return NextResponse.json({ approved_ips: data || [] });
}

// POST: 새 IP 추가 (글로벌 - user_id는 추가한 슈퍼어드민 ID 사용)
export async function POST(request: NextRequest) {
  const auth = await checkAuth(request);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  const { ip_address, description } = await request.json();

  if (!ip_address) {
    return NextResponse.json({ error: 'ip_address가 필요합니다.' }, { status: 400 });
  }

  const ipv4 = /^(\d{1,3}\.){3}\d{1,3}$/;
  const ipv6 = /^([0-9a-fA-F]{1,4}:){1,7}[0-9a-fA-F]{0,4}$/;
  if (!ipv4.test(ip_address) && !ipv6.test(ip_address)) {
    return NextResponse.json({ error: '올바른 IP 주소 형식이 아닙니다. (예: 192.168.1.1)' }, { status: 400 });
  }

  // user_id는 기존 스키마 호환을 위해 슈퍼어드민 ID 사용
  const { error } = await supabaseAdmin.from('approved_ips').upsert(
    {
      user_id: auth.userId,
      ip_address,
      description: description || null,
      approved_by: auth.userId,
      approved_at: new Date().toISOString(),
      is_active: true,
    },
    { onConflict: 'user_id,ip_address' }
  );

  if (error) {
    console.error('IP 추가 실패:', error);
    return NextResponse.json({ error: 'IP 추가에 실패했습니다.' }, { status: 500 });
  }

  return NextResponse.json({ success: true, message: `IP ${ip_address}이(가) 추가되었습니다.` });
}

// PATCH: IP 활성/비활성 토글
export async function PATCH(request: NextRequest) {
  const auth = await checkAuth(request);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  const { id, is_active } = await request.json();
  if (!id) {
    return NextResponse.json({ error: 'id가 필요합니다.' }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from('approved_ips')
    .update({ is_active })
    .eq('id', id);

  if (error) {
    console.error('IP 상태 변경 실패:', error);
    return NextResponse.json({ error: 'IP 상태 변경에 실패했습니다.' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

// DELETE: IP 삭제
export async function DELETE(request: NextRequest) {
  const auth = await checkAuth(request);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  const { id } = await request.json();
  if (!id) {
    return NextResponse.json({ error: 'id가 필요합니다.' }, { status: 400 });
  }

  const { error } = await supabaseAdmin.from('approved_ips').delete().eq('id', id);
  if (error) {
    console.error('IP 삭제 실패:', error);
    return NextResponse.json({ error: 'IP 삭제에 실패했습니다.' }, { status: 500 });
  }

  return NextResponse.json({ success: true, message: 'IP가 삭제되었습니다.' });
}
