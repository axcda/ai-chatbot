/**
 * T021: 邀请码验证端点
 * POST /api/auth/validate-invite
 */

import { type NextRequest, NextResponse } from 'next/server';
import {
  validateInviteCode,
  createInviteValidationResponse,
} from '@/lib/auth/invite-codes';
import {
  protectApiRoute,
  validateRequestBody,
  createValidationErrorResponse,
  applyCors,
  logApiRequest,
  handleApiError,
  authRateLimiter,
} from '@/lib/auth/middleware';
import { validateInviteRequestSchema } from '@/lib/db/validations';

export async function POST(request: NextRequest) {
  try {
    // 应用保护中间件（不需要认证，但需要速率限制）
    const protection = await protectApiRoute(request, {
      requireAuth: false,
      applyRateLimit: true,
      rateLimiter: authRateLimiter,
    });

    if (!protection.success) {
      return (
        protection.response ||
        NextResponse.json({ error: 'Protection failed' }, { status: 500 })
      );
    }

    // 验证请求体
    const validation = await validateRequestBody(request, (data) => {
      return validateInviteRequestSchema.parse(data);
    });

    if (!validation.success) {
      return createValidationErrorResponse(
        validation.error || 'Validation failed',
      );
    }

    const { inviteCode } = validation.data || { inviteCode: '' };

    // 记录API请求
    logApiRequest(request, undefined, {
      inviteCode: `${inviteCode.substring(0, 3)}***`,
    });

    // 验证邀请码
    const validationResult = validateInviteCode(inviteCode);
    const response = createInviteValidationResponse(inviteCode);

    // 记录验证尝试（用于安全监控）
    console.log('Invite code validation:', {
      code: `${inviteCode.substring(0, 3)}***`,
      valid: validationResult.valid,
      ip: request.ip || request.headers.get('x-forwarded-for'),
      userAgent: request.headers.get('user-agent'),
      timestamp: new Date().toISOString(),
    });

    // 应用 CORS 头
    const { headers } = applyCors(request);

    if (response.valid) {
      return NextResponse.json(response, {
        status: 200,
        headers,
      });
    } else {
      return NextResponse.json(response, {
        status: 400,
        headers,
      });
    }
  } catch (error: any) {
    console.error('Validate invite API error:', error);
    return handleApiError(error);
  }
}

export async function OPTIONS(request: NextRequest) {
  const { headers } = applyCors(request);
  return new NextResponse(null, { status: 200, headers });
}
