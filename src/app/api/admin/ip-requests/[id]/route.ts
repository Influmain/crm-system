// /app/api/admin/ip-requests/[id]/route.ts
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

// IP 승인/거부 처리
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await verifySuperAdmin(request);
    if (!authResult.authorized) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    const { id } = await params;
    const { action, rejection_reason, description } = await request.json();

    if (!action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: 'action은 approve 또는 reject여야 합니다.' },
        { status: 400 }
      );
    }

    // 요청 정보 조회
    const { data: requestData, error: fetchError } = await supabaseAdmin
      .from('ip_approval_requests')
      .select('id, user_id, ip_address, status')
      .eq('id', id)
      .single();

    if (fetchError || !requestData) {
      return NextResponse.json(
        { error: 'IP 승인 요청을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    if (requestData.status !== 'pending') {
      return NextResponse.json(
        { error: '이미 처리된 요청입니다.' },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();

    if (action === 'approve') {
      // 1. 요청 상태 업데이트
      const { error: updateError } = await supabaseAdmin
        .from('ip_approval_requests')
        .update({
          status: 'approved',
          reviewed_by: authResult.userId,
          reviewed_at: now
        })
        .eq('id', id);

      if (updateError) {
        throw updateError;
      }

      // 2. approved_ips에 추가
      const { error: insertError } = await supabaseAdmin
        .from('approved_ips')
        .upsert({
          user_id: requestData.user_id,
          ip_address: requestData.ip_address,
          description: description || null,
          approved_by: authResult.userId,
          approved_at: now,
          is_active: true
        }, {
          onConflict: 'user_id,ip_address'
        });

      if (insertError) {
        console.error('approved_ips 추가 실패:', insertError);
        // 롤백: 요청 상태 되돌리기
        await supabaseAdmin
          .from('ip_approval_requests')
          .update({ status: 'pending', reviewed_by: null, reviewed_at: null })
          .eq('id', id);
        throw insertError;
      }

      console.log('✅ IP 승인 완료:', { user_id: requestData.user_id, ip: requestData.ip_address });
      return NextResponse.json({
        success: true,
        message: 'IP가 승인되었습니다.'
      });

    } else {
      // 거부 처리
      const { error: updateError } = await supabaseAdmin
        .from('ip_approval_requests')
        .update({
          status: 'rejected',
          reviewed_by: authResult.userId,
          reviewed_at: now,
          rejection_reason: rejection_reason || null
        })
        .eq('id', id);

      if (updateError) {
        throw updateError;
      }

      console.log('❌ IP 거부 완료:', { user_id: requestData.user_id, ip: requestData.ip_address });
      return NextResponse.json({
        success: true,
        message: 'IP 요청이 거부되었습니다.'
      });
    }

  } catch (error) {
    console.error('IP 승인/거부 API 오류:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// IP 요청 삭제 (선택)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await verifySuperAdmin(request);
    if (!authResult.authorized) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    const { id } = await params;

    const { error } = await supabaseAdmin
      .from('ip_approval_requests')
      .delete()
      .eq('id', id);

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      message: 'IP 요청이 삭제되었습니다.'
    });

  } catch (error) {
    console.error('IP 요청 삭제 API 오류:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
