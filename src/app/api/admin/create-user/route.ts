// /app/api/admin/create-user/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// 서버사이드에서만 사용하는 Supabase 클라이언트 (service role key 필요)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // 환경변수에 추가 필요
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

export async function POST(request: NextRequest) {
  try {
    const { email, password, full_name, phone, department, role, created_by } = await request.json();

    // 1. 요청자 권한 확인
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    
    // 요청자의 JWT 토큰 검증
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: '유효하지 않은 인증 토큰입니다.' }, { status: 401 });
    }

    // 요청자가 최고관리자인지 확인
    const { data: requesterProfile, error: profileError } = await supabaseAdmin
      .from('users')
      .select('is_super_admin')
      .eq('id', user.id)
      .single();

    if (profileError || !requesterProfile?.is_super_admin) {
      return NextResponse.json({ error: '최고관리자만 계정을 생성할 수 있습니다.' }, { status: 403 });
    }

    // 2. Supabase Auth에 사용자 생성
    const { data: authUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name,
        role
      }
    });

    if (createError) {
      console.error('Auth 사용자 생성 실패:', createError);
      return NextResponse.json(
        { error: `계정 생성 실패: ${createError.message}` }, 
        { status: 400 }
      );
    }

    // 3. users 테이블에 사용자 정보 추가
    const { error: dbError } = await supabaseAdmin
      .from('users')
      .upsert({
        id: authUser.user.id,
        email,
        full_name,
        phone: phone || null,
        department: department || null,
        role,
        is_active: true,
        is_super_admin: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

    if (dbError) {
      console.error('사용자 정보 저장 실패:', dbError);
      
      // Auth에서 생성된 사용자 삭제 (롤백)
      try {
        await supabaseAdmin.auth.admin.deleteUser(authUser.user.id);
      } catch (rollbackError) {
        console.error('롤백 실패:', rollbackError);
      }
      
      return NextResponse.json(
        { error: `사용자 정보 저장 실패: ${dbError.message}` }, 
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      user: {
        id: authUser.user.id,
        email,
        full_name,
        role
      },
      message: `${full_name}님의 ${role === 'admin' ? '관리자' : '영업사원'} 계정이 생성되었습니다.`
    });

  } catch (error) {
    console.error('계정 생성 API 오류:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' }, 
      { status: 500 }
    );
  }
}