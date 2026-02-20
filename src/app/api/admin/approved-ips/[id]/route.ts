// /app/api/admin/approved-ips/[id]/route.ts
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

// 승인된 IP 수정
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
    const { description, is_active } = await request.json();

    const updateData: Record<string, any> = {};
    if (description !== undefined) updateData.description = description;
    if (is_active !== undefined) updateData.is_active = is_active;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: '수정할 데이터가 없습니다.' },
        { status: 400 }
      );
    }

    const { error } = await supabaseAdmin
      .from('approved_ips')
      .update(updateData)
      .eq('id', id);

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      message: 'IP 정보가 수정되었습니다.'
    });

  } catch (error) {
    console.error('IP 수정 API 오류:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// 승인된 IP 삭제 (비활성화)
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
    const { searchParams } = new URL(request.url);
    const permanent = searchParams.get('permanent') === 'true';

    if (permanent) {
      // 완전 삭제
      const { error } = await supabaseAdmin
        .from('approved_ips')
        .delete()
        .eq('id', id);

      if (error) {
        throw error;
      }

      return NextResponse.json({
        success: true,
        message: 'IP가 완전히 삭제되었습니다.'
      });
    } else {
      // 소프트 삭제 (비활성화)
      const { error } = await supabaseAdmin
        .from('approved_ips')
        .update({ is_active: false })
        .eq('id', id);

      if (error) {
        throw error;
      }

      return NextResponse.json({
        success: true,
        message: 'IP가 비활성화되었습니다.'
      });
    }

  } catch (error) {
    console.error('IP 삭제 API 오류:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
