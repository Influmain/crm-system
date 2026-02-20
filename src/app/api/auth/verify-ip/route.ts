// /app/api/auth/verify-ip/route.ts
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

// 클라이언트 IP 추출
function getClientIP(request: NextRequest): string {
  // Vercel, Cloudflare 등 프록시 환경 고려
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    // 첫 번째 IP가 실제 클라이언트 IP
    return forwardedFor.split(',')[0].trim();
  }

  const realIP = request.headers.get('x-real-ip');
  if (realIP) {
    return realIP.trim();
  }

  // 개발 환경에서는 localhost
  return '127.0.0.1';
}

export async function POST(request: NextRequest) {
  try {
    const { user_id } = await request.json();

    if (!user_id) {
      return NextResponse.json(
        { error: 'user_id가 필요합니다.' },
        { status: 400 }
      );
    }

    // 클라이언트 IP 추출
    const clientIP = getClientIP(request);
    console.log('🔍 IP 검증 요청:', { user_id, clientIP });

    // 1. 사용자 정보 조회 (is_super_admin 확인)
    const { data: userProfile, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, email, full_name, role, is_super_admin, is_active')
      .eq('id', user_id)
      .single();

    if (userError || !userProfile) {
      return NextResponse.json(
        { error: '사용자를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 비활성 사용자 차단
    if (!userProfile.is_active) {
      return NextResponse.json({
        allowed: false,
        has_pending_request: false,
        message: '비활성화된 계정입니다. 관리자에게 문의하세요.'
      });
    }

    // 2. 최고관리자는 IP 검증 제외
    if (userProfile.is_super_admin) {
      console.log('✅ 최고관리자 - IP 검증 통과:', userProfile.email);
      return NextResponse.json({
        allowed: true,
        has_pending_request: false,
        message: '최고관리자는 IP 검증이 면제됩니다.'
      });
    }

    // 3. 승인된 IP 목록에서 확인
    const { data: approvedIP, error: approvedError } = await supabaseAdmin
      .from('approved_ips')
      .select('id, ip_address, last_used_at')
      .eq('user_id', user_id)
      .eq('is_active', true)
      .eq('ip_address', clientIP)
      .single();

    if (approvedIP && !approvedError) {
      // 승인된 IP - last_used_at 업데이트
      await supabaseAdmin
        .from('approved_ips')
        .update({ last_used_at: new Date().toISOString() })
        .eq('id', approvedIP.id);

      console.log('✅ 승인된 IP에서 로그인:', { email: userProfile.email, ip: clientIP });
      return NextResponse.json({
        allowed: true,
        has_pending_request: false,
        message: '승인된 IP입니다.'
      });
    }

    // 4. 승인되지 않은 IP - 대기 중인 요청 확인
    const { data: pendingRequest } = await supabaseAdmin
      .from('ip_approval_requests')
      .select('id, created_at')
      .eq('user_id', user_id)
      .eq('ip_address', clientIP)
      .eq('status', 'pending')
      .single();

    if (pendingRequest) {
      console.log('⏳ 이미 대기 중인 IP 승인 요청 존재:', { email: userProfile.email, ip: clientIP });
      return NextResponse.json({
        allowed: false,
        has_pending_request: true,
        message: '현재 IP에 대한 승인 요청이 대기 중입니다. 관리자 승인을 기다려주세요.'
      });
    }

    // 5. 새 승인 요청 생성
    const { error: insertError } = await supabaseAdmin
      .from('ip_approval_requests')
      .insert({
        user_id,
        ip_address: clientIP,
        status: 'pending'
      });

    if (insertError) {
      console.error('❌ IP 승인 요청 생성 실패:', insertError);
      return NextResponse.json({
        allowed: false,
        has_pending_request: false,
        message: 'IP 승인 요청 생성 중 오류가 발생했습니다.'
      });
    }

    console.log('📝 새 IP 승인 요청 생성:', { email: userProfile.email, ip: clientIP });
    return NextResponse.json({
      allowed: false,
      has_pending_request: true,
      message: '새로운 위치에서 로그인을 시도했습니다. 관리자의 IP 승인이 필요합니다.'
    });

  } catch (error) {
    console.error('IP 검증 API 오류:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
