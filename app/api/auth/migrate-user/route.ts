/**
 * T023: 用户迁移端点
 * POST /api/auth/migrate-user
 */

import { type NextRequest, NextResponse } from 'next/server';
import { firebaseAdmin } from '@/lib/auth/firebase-admin';
import {
  protectApiRoute,
  validateRequestBody,
  createValidationErrorResponse,
  applyCors,
  logApiRequest,
  handleApiError,
  authRateLimiter,
} from '@/lib/auth/middleware';
import { migrateUserRequestSchema } from '@/lib/db/validations';
import {
  getLegacyUser,
  migrateUserToFirebase,
  getUserByFirebaseUid,
} from '@/lib/db/queries/users';

export async function POST(request: NextRequest) {
  try {
    // 应用保护中间件（需要Firebase认证）
    const protection = await protectApiRoute(request, {
      requireAuth: true,
      applyRateLimit: true,
      rateLimiter: authRateLimiter,
    });

    if (!protection.success) {
      return (
        protection.response ||
        NextResponse.json({ error: 'Protection failed' }, { status: 500 })
      );
    }

    const authenticatedUser = protection.user || { uid: '', email: '' };

    // 验证请求体
    const validation = await validateRequestBody(request, (data) => {
      return migrateUserRequestSchema.parse(data);
    });

    if (!validation.success) {
      return createValidationErrorResponse(
        validation.error || 'Validation failed',
      );
    }

    const { email, firebaseUid } = validation.data || {
      email: '',
      firebaseUid: '',
    };

    // 记录API请求
    logApiRequest(request, authenticatedUser, {
      action: 'migrate-user',
      email,
    });

    // 验证Firebase UID匹配
    if (authenticatedUser.uid !== firebaseUid) {
      return NextResponse.json(
        {
          error: 'Firebase UID 不匹配',
          code: 'FIREBASE_UID_MISMATCH',
        },
        { status: 403 },
      );
    }

    // 验证Firebase用户信息
    let firebaseUser: any;
    try {
      firebaseUser = await firebaseAdmin.getUser(firebaseUid);

      // 验证邮箱匹配
      if (firebaseUser.email !== email) {
        return NextResponse.json(
          {
            error: '邮箱与Firebase账户不匹配',
            code: 'EMAIL_MISMATCH',
          },
          { status: 400 },
        );
      }
    } catch (error) {
      console.error('Firebase user verification failed:', error);
      return NextResponse.json(
        {
          error: '无法验证Firebase用户',
          code: 'FIREBASE_VERIFICATION_FAILED',
        },
        { status: 403 },
      );
    }

    // 检查是否已有Firebase用户记录
    const existingFirebaseUser = await getUserByFirebaseUid(firebaseUid);
    if (existingFirebaseUser) {
      return NextResponse.json(
        {
          error: 'Firebase用户已存在',
          code: 'USER_ALREADY_MIGRATED',
        },
        { status: 409 },
      );
    }

    // 查找需要迁移的遗留用户
    const legacyUser = await getLegacyUser(email);
    if (!legacyUser) {
      return NextResponse.json(
        {
          error: '未找到需要迁移的用户',
          code: 'USER_NOT_FOUND',
        },
        { status: 404 },
      );
    }

    // 执行用户迁移
    try {
      const migratedUser = await migrateUserToFirebase(email, firebaseUid);

      if (!migratedUser) {
        return NextResponse.json(
          {
            error: '用户迁移失败',
            code: 'MIGRATION_FAILED',
          },
          { status: 500 },
        );
      }

      // 应用 CORS 头
      const { headers } = applyCors(request);

      // 返回成功响应
      return NextResponse.json(
        {
          success: true,
          userId: migratedUser.id,
          migrated: true,
        },
        {
          status: 200,
          headers,
        },
      );
    } catch (error: any) {
      console.error('User migration failed:', error);

      // 检查是否是数据库约束错误
      if (error.message?.includes('duplicate') || error.code === '23505') {
        return NextResponse.json(
          {
            error: '用户已迁移',
            code: 'USER_ALREADY_MIGRATED',
          },
          { status: 409 },
        );
      }

      return NextResponse.json(
        {
          error: '迁移失败',
          code: 'MIGRATION_FAILED',
          details: error.message,
        },
        { status: 500 },
      );
    }
  } catch (error: any) {
    console.error('Migrate user API error:', error);
    return handleApiError(error);
  }
}

export async function OPTIONS(request: NextRequest) {
  const { headers } = applyCors(request);
  return new NextResponse(null, { status: 200, headers });
}
