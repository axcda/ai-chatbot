/**
 * T022: 用户注册端点
 * POST /api/auth/register
 */

import { type NextRequest, NextResponse } from 'next/server';
import { validateInviteCode } from '@/lib/auth/invite-codes';
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
import { registerRequestSchema } from '@/lib/db/validations';
import { createUser, userExists } from '@/lib/db/queries/users';
import {
  recordInviteCodeUsage,
  isInviteCodeUsedBy,
} from '@/lib/db/queries/invite-codes';

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
      return registerRequestSchema.parse(data);
    });

    if (!validation.success) {
      return createValidationErrorResponse(
        validation.error || 'Validation failed',
      );
    }

    const { email, inviteCode, firebaseUid, displayName, avatarUrl } =
      validation.data || {
        email: '',
        inviteCode: '',
        firebaseUid: '',
        displayName: '',
        avatarUrl: '',
      };

    // 记录API请求
    logApiRequest(request, authenticatedUser, {
      action: 'register',
      email,
      inviteCode: `${inviteCode.substring(0, 3)}***`,
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

    // 验证邀请码
    const inviteValidation = validateInviteCode(inviteCode);
    if (!inviteValidation.valid) {
      return NextResponse.json(
        {
          error: inviteValidation.error,
          code: 'INVALID_INVITE_CODE',
        },
        { status: 400 },
      );
    }

    // 检查用户是否已存在
    const existingUser = await userExists(email, firebaseUid);
    if (existingUser) {
      return NextResponse.json(
        {
          error: '用户已存在',
          code: 'USER_EXISTS',
        },
        { status: 409 },
      );
    }

    // 检查邀请码是否已被使用
    const inviteUsed = await isInviteCodeUsedBy(inviteCode, firebaseUid);
    if (inviteUsed) {
      return NextResponse.json(
        {
          error: '该邀请码已被您使用过',
          code: 'INVITE_CODE_ALREADY_USED',
        },
        { status: 400 },
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

    // 创建数据库用户记录
    try {
      const newUser = await createUser({
        email,
        firebaseUid,
        displayName: displayName || firebaseUser.displayName,
        avatarUrl: avatarUrl || firebaseUser.photoURL,
      });

      // 记录邀请码使用
      await recordInviteCodeUsage(
        inviteCode,
        firebaseUid,
        email,
        request.ip || request.headers.get('x-forwarded-for') || undefined,
        request.headers.get('user-agent') || undefined,
      );

      // 应用 CORS 头
      const { headers } = applyCors(request);

      // 返回成功响应
      return NextResponse.json(
        {
          success: true,
          userId: newUser.id,
          user: {
            id: newUser.id,
            email: newUser.email,
            firebaseUid: newUser.firebaseUid,
            authProvider: newUser.authProvider,
            displayName: newUser.displayName,
            avatarUrl: newUser.avatarUrl,
            createdAt: newUser.createdAt,
          },
        },
        {
          status: 200,
          headers,
        },
      );
    } catch (error: any) {
      console.error('User creation failed:', error);

      // 检查是否是数据库约束错误
      if (error.message?.includes('duplicate') || error.code === '23505') {
        return NextResponse.json(
          {
            error: '用户已存在',
            code: 'USER_EXISTS',
          },
          { status: 409 },
        );
      }

      return NextResponse.json(
        {
          error: '注册失败',
          code: 'REGISTRATION_FAILED',
          details: error.message,
        },
        { status: 500 },
      );
    }
  } catch (error: any) {
    console.error('Register API error:', error);
    return handleApiError(error);
  }
}

export async function OPTIONS(request: NextRequest) {
  const { headers } = applyCors(request);
  return new NextResponse(null, { status: 200, headers });
}
