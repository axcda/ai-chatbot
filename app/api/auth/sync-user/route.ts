/**
 * T024: 用户数据同步端点
 * PUT /api/auth/sync-user
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
import { syncUserRequestSchema } from '@/lib/db/validations';
import {
  getUserByFirebaseUid,
  updateUserByFirebaseUid,
} from '@/lib/db/queries/users';

export async function PUT(request: NextRequest) {
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
      return syncUserRequestSchema.parse(data);
    });

    if (!validation.success) {
      return createValidationErrorResponse(
        validation.error || 'Validation failed',
      );
    }

    const { firebaseUid, userData } = validation.data || {
      firebaseUid: '',
      userData: {},
    };

    // 记录API请求
    logApiRequest(request, authenticatedUser, {
      action: 'sync-user',
      updateFields: Object.keys(userData),
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

    // 验证Firebase用户存在
    try {
      await firebaseAdmin.getUser(firebaseUid);
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

    // 检查数据库中的用户是否存在
    const existingUser = await getUserByFirebaseUid(firebaseUid);
    if (!existingUser) {
      return NextResponse.json(
        {
          error: '用户不存在',
          code: 'USER_NOT_FOUND',
        },
        { status: 404 },
      );
    }

    // 准备更新数据
    const updateData: { [key: string]: any } = {};

    if (userData.displayName !== undefined) {
      updateData.displayName = userData.displayName;
    }

    if (userData.photoURL !== undefined) {
      updateData.avatarUrl = userData.photoURL;
    }

    // 执行用户数据同步
    try {
      const updatedUser = await updateUserByFirebaseUid(
        firebaseUid,
        updateData,
      );

      if (!updatedUser) {
        return NextResponse.json(
          {
            error: '用户同步失败',
            code: 'SYNC_FAILED',
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
        },
        {
          status: 200,
          headers,
        },
      );
    } catch (error: any) {
      console.error('User sync failed:', error);

      return NextResponse.json(
        {
          error: '同步失败',
          code: 'SYNC_FAILED',
          details: error.message,
        },
        { status: 500 },
      );
    }
  } catch (error: any) {
    console.error('Sync user API error:', error);
    return handleApiError(error);
  }
}

export async function OPTIONS(request: NextRequest) {
  const { headers } = applyCors(request);
  return new NextResponse(null, { status: 200, headers });
}
