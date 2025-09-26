/**
 * T020: 认证中间件
 * Authentication middleware for API routes
 */

import { type NextRequest, NextResponse } from 'next/server';
import { firebaseAdmin, verifyAuthHeader } from './firebase-admin';

// 认证用户信息接口
export interface AuthenticatedUser {
  uid: string;
  email?: string;
  emailVerified?: boolean;
}

// 中间件响应类型
export interface MiddlewareResult {
  success: boolean;
  user?: AuthenticatedUser;
  error?: string;
  code?: string;
}

/**
 * 验证请求的认证状态
 */
export async function verifyAuthentication(
  request: NextRequest,
): Promise<MiddlewareResult> {
  try {
    const authHeader = request.headers.get('Authorization');

    if (!authHeader) {
      return {
        success: false,
        error: '缺少认证令牌',
        code: 'MISSING_AUTH_TOKEN',
      };
    }

    const user = await verifyAuthHeader(authHeader);

    if (!user) {
      return {
        success: false,
        error: '认证令牌无效或已过期',
        code: 'INVALID_AUTH_TOKEN',
      };
    }

    return {
      success: true,
      user,
    };
  } catch (error: any) {
    console.error('Authentication verification error:', error);

    return {
      success: false,
      error: '权限验证失败',
      code: 'TOKEN_VERIFICATION_FAILED',
    };
  }
}

/**
 * 创建认证错误响应
 */
export function createAuthErrorResponse(
  error: string,
  code: string,
  status = 403,
): NextResponse {
  return NextResponse.json(
    {
      error,
      code,
      details: '请确保您已登录并提供有效的认证令牌',
    },
    { status },
  );
}

/**
 * 验证请求体格式
 */
export async function validateRequestBody<T>(
  request: NextRequest,
  validator: (data: any) => T,
): Promise<{
  success: boolean;
  data?: T;
  error?: string;
}> {
  try {
    const body = await request.json();
    const validatedData = validator(body);

    return {
      success: true,
      data: validatedData,
    };
  } catch (error: any) {
    console.error('Request body validation error:', error);

    return {
      success: false,
      error: error.message || '请求体格式无效',
    };
  }
}

/**
 * 创建验证错误响应
 */
export function createValidationErrorResponse(
  error: string,
  status = 400,
): NextResponse {
  return NextResponse.json(
    {
      error,
      code: 'VALIDATION_ERROR',
      details: '请检查请求参数格式',
    },
    { status },
  );
}

/**
 * 速率限制中间件
 */
class RateLimiter {
  private requests: Map<string, number[]> = new Map();
  private readonly maxRequests: number;
  private readonly windowMs: number;

  constructor(maxRequests = 10, windowMs = 60000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  isAllowed(identifier: string): boolean {
    const now = Date.now();
    const requests = this.requests.get(identifier) || [];

    // 清理过期的请求记录
    const validRequests = requests.filter((time) => now - time < this.windowMs);

    if (validRequests.length >= this.maxRequests) {
      return false;
    }

    // 记录新请求
    validRequests.push(now);
    this.requests.set(identifier, validRequests);

    return true;
  }

  reset(identifier: string): void {
    this.requests.delete(identifier);
  }
}

// 全局速率限制器实例
const globalRateLimiter = new RateLimiter(60, 60000); // 每分钟60次请求
const authRateLimiter = new RateLimiter(10, 60000); // 认证端点每分钟10次

/**
 * 应用速率限制
 */
export function applyRateLimit(
  request: NextRequest,
  limiter: RateLimiter = globalRateLimiter,
): {
  allowed: boolean;
  error?: string;
} {
  // 使用IP地址作为限制标识符
  const ip =
    request.ip ||
    request.headers.get('x-forwarded-for') ||
    request.headers.get('x-real-ip') ||
    'unknown';

  const allowed = limiter.isAllowed(ip);

  if (!allowed) {
    return {
      allowed: false,
      error: '请求过于频繁，请稍后再试',
    };
  }

  return { allowed: true };
}

/**
 * 创建速率限制错误响应
 */
export function createRateLimitResponse(): NextResponse {
  return NextResponse.json(
    {
      error: '请求过于频繁，请稍后再试',
      code: 'RATE_LIMIT_EXCEEDED',
      details: '您的请求频率超过了限制，请等待后重试',
    },
    {
      status: 429,
      headers: {
        'Retry-After': '60',
      },
    },
  );
}

/**
 * CORS 中间件
 */
export function applyCors(request: NextRequest): {
  headers: Record<string, string>;
} {
  const origin = request.headers.get('origin');
  const allowedOrigins = [
    'http://localhost:3000',
    'https://ai-chatbot.vercel.app',
    // 添加其他允许的域名
  ];

  const corsHeaders: Record<string, string> = {
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
  };

  if (origin && allowedOrigins.includes(origin)) {
    corsHeaders['Access-Control-Allow-Origin'] = origin;
  }

  return { headers: corsHeaders };
}

/**
 * 处理 OPTIONS 请求 (预检请求)
 */
export function handleOptionsRequest(request: NextRequest): NextResponse {
  const { headers } = applyCors(request);
  return new NextResponse(null, { status: 200, headers });
}

/**
 * 记录API请求
 */
export function logApiRequest(
  request: NextRequest,
  user?: AuthenticatedUser,
  additionalData?: Record<string, any>,
): void {
  const logData = {
    method: request.method,
    url: request.url,
    userAgent: request.headers.get('user-agent'),
    ip: request.ip || request.headers.get('x-forwarded-for'),
    userId: user?.uid,
    userEmail: user?.email,
    timestamp: new Date().toISOString(),
    ...additionalData,
  };

  console.log('API Request:', logData);
}

/**
 * 错误处理中间件
 */
export function handleApiError(error: any): NextResponse {
  console.error('API Error:', error);

  // Firebase 认证错误
  if (error.code?.startsWith('auth/')) {
    return createAuthErrorResponse(
      firebaseAdmin.getVerificationErrorMessage(error.code),
      'FIREBASE_AUTH_ERROR',
    );
  }

  // 数据库错误
  if (error.message?.includes('database') || error.message?.includes('SQL')) {
    return NextResponse.json(
      {
        error: '数据库操作失败',
        code: 'DATABASE_ERROR',
      },
      { status: 500 },
    );
  }

  // 网络错误
  if (
    error.message?.includes('network') ||
    error.message?.includes('timeout')
  ) {
    return NextResponse.json(
      {
        error: '网络连接失败',
        code: 'NETWORK_ERROR',
      },
      { status: 503 },
    );
  }

  // 默认内部服务器错误
  return NextResponse.json(
    {
      error: '服务器内部错误',
      code: 'INTERNAL_SERVER_ERROR',
    },
    { status: 500 },
  );
}

/**
 * 组合中间件 - 完整的API端点保护
 */
export async function protectApiRoute(
  request: NextRequest,
  options: {
    requireAuth?: boolean;
    applyRateLimit?: boolean;
    rateLimiter?: RateLimiter;
  } = {},
): Promise<{
  success: boolean;
  user?: AuthenticatedUser;
  response?: NextResponse;
}> {
  try {
    // 处理 CORS 预检请求
    if (request.method === 'OPTIONS') {
      return {
        success: false,
        response: handleOptionsRequest(request),
      };
    }

    // 应用速率限制
    if (options.applyRateLimit !== false) {
      const rateLimitResult = applyRateLimit(
        request,
        options.rateLimiter || globalRateLimiter,
      );

      if (!rateLimitResult.allowed) {
        return {
          success: false,
          response: createRateLimitResponse(),
        };
      }
    }

    // 验证认证（如果需要）
    if (options.requireAuth !== false) {
      const authResult = await verifyAuthentication(request);

      if (!authResult.success) {
        return {
          success: false,
          response: createAuthErrorResponse(
            authResult.error ?? '权限验证失败',
            authResult.code ?? 'AUTH_ERROR',
          ),
        };
      }

      return {
        success: true,
        user: authResult.user,
      };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      response: handleApiError(error),
    };
  }
}

// 导出速率限制器实例供其他模块使用
export { authRateLimiter };
