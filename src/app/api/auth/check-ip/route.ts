import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  const realIP = request.headers.get('x-real-ip');
  if (realIP) return realIP.trim();
  return '127.0.0.1';
}

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader) {
    return NextResponse.json({ allowed: false, error: '인증이 필요합니다.' }, { status: 401 });
  }

  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
  if (authError || !user) {
    return NextResponse.json({ allowed: false, error: '유효하지 않은 토큰입니다.' }, { status: 401 });
  }

  // 최고관리자는 IP 제한 없이 항상 허용
  const { data: profile } = await supabaseAdmin
    .from('users')
    .select('is_super_admin')
    .eq('id', user.id)
    .single();

  if (profile?.is_super_admin) {
    return NextResponse.json({ allowed: true, ip: getClientIP(request), bypass: true });
  }

  const clientIP = getClientIP(request);

  // 글로벌 IP 화이트리스트 조회 (user_id 무관하게 전체 목록)
  const { data: allowedIPs, error: ipError } = await supabaseAdmin
    .from('approved_ips')
    .select('ip_address')
    .eq('is_active', true);

  if (ipError) {
    console.error('IP 목록 조회 오류:', ipError);
    // 조회 실패 시 fail open (서버 오류로 잠기는 상황 방지)
    return NextResponse.json({ allowed: true, ip: clientIP });
  }

  // 목록이 비어있으면 → 모든 IP 허용
  if (!allowedIPs || allowedIPs.length === 0) {
    return NextResponse.json({ allowed: true, ip: clientIP });
  }

  // 현재 IP가 화이트리스트에 있는지 확인 (전체 목록 기준)
  const ipList = allowedIPs.map((r) => r.ip_address);
  if (ipList.includes(clientIP)) {
    // 마지막 사용 시각 업데이트
    await supabaseAdmin
      .from('approved_ips')
      .update({ last_used_at: new Date().toISOString() })
      .eq('ip_address', clientIP)
      .eq('is_active', true);

    return NextResponse.json({ allowed: true, ip: clientIP });
  }

  return NextResponse.json({
    allowed: false,
    ip: clientIP,
    error: `허용되지 않은 IP 주소입니다. (현재 IP: ${clientIP})\n접속을 원하시면 관리자에게 IP 추가를 요청하세요.`,
  });
}
