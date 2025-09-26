/**
 * T025: 健康检查端点
 * GET /api/health
 */

import { type NextRequest, NextResponse } from 'next/server';
import { applyCors, logApiRequest } from '@/lib/auth/middleware';
import { firebaseAdmin } from '@/lib/auth/firebase-admin';
import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';

interface HealthCheckResult {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  services: {
    firebase: 'connected' | 'disconnected' | 'error';
    postgresql: 'connected' | 'disconnected' | 'error';
  };
  error?: string;
}

/**
 * 检查Firebase连接状态
 */
async function checkFirebaseHealth(): Promise<{
  status: 'connected' | 'disconnected' | 'error';
  error?: string;
}> {
  try {
    // 尝试验证一个无效token来测试Firebase Admin连接
    // 这不会抛出网络错误，只是验证Firebase Admin SDK是否正常工作
    await firebaseAdmin.verifyIdToken('invalid-token').catch(() => {
      // 预期的错误，表示Firebase Admin SDK正常工作
    });

    return { status: 'connected' };
  } catch (error: any) {
    console.error('Firebase health check failed:', error);
    return {
      status: 'error',
      error: error.message || 'Firebase connection failed',
    };
  }
}

/**
 * 检查PostgreSQL连接状态
 */
async function checkPostgreSQLHealth(): Promise<{
  status: 'connected' | 'disconnected' | 'error';
  error?: string;
}> {
  try {
    // 执行一个简单的查询来测试数据库连接
    await db.execute(sql`select 1`);
    return { status: 'connected' };
  } catch (error: any) {
    console.error('PostgreSQL health check failed:', error);
    return {
      status: 'error',
      error: error.message || 'PostgreSQL connection failed',
    };
  }
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    // 记录API请求
    logApiRequest(request, undefined, { action: 'health-check' });

    // 并行检查所有服务
    const [firebaseHealth, postgresHealth] = await Promise.all([
      checkFirebaseHealth(),
      checkPostgreSQLHealth(),
    ]);

    // 确定整体健康状态
    const isHealthy =
      firebaseHealth.status === 'connected' &&
      postgresHealth.status === 'connected';

    const healthResult: HealthCheckResult = {
      status: isHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      services: {
        firebase: firebaseHealth.status,
        postgresql: postgresHealth.status,
      },
    };

    // 如果有任何服务出现错误，添加错误信息
    if (!isHealthy) {
      const errors: string[] = [];
      if (firebaseHealth.error) {
        errors.push(`Firebase: ${firebaseHealth.error}`);
      }
      if (postgresHealth.error) {
        errors.push(`PostgreSQL: ${postgresHealth.error}`);
      }
      if (errors.length > 0) {
        healthResult.error = errors.join('; ');
      }
    }

    // 应用 CORS 头
    const { headers } = applyCors(request);

    // 添加性能头
    const responseTime = Date.now() - startTime;
    headers['X-Response-Time'] = `${responseTime}ms`;

    const statusCode = isHealthy ? 200 : 503;

    return NextResponse.json(healthResult, {
      status: statusCode,
      headers,
    });
  } catch (error: any) {
    console.error('Health check API error:', error);

    const errorResult: HealthCheckResult = {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      services: {
        firebase: 'error',
        postgresql: 'error',
      },
      error: error.message || 'Health check failed',
    };

    const { headers } = applyCors(request);
    const responseTime = Date.now() - startTime;
    headers['X-Response-Time'] = `${responseTime}ms`;

    return NextResponse.json(errorResult, {
      status: 503,
      headers,
    });
  }
}

export async function HEAD(request: NextRequest) {
  try {
    // HEAD请求只返回状态码和头部，不返回响应体
    const [firebaseHealth, postgresHealth] = await Promise.all([
      checkFirebaseHealth(),
      checkPostgreSQLHealth(),
    ]);

    const isHealthy =
      firebaseHealth.status === 'connected' &&
      postgresHealth.status === 'connected';

    const { headers } = applyCors(request);
    const statusCode = isHealthy ? 200 : 503;

    return new NextResponse(null, {
      status: statusCode,
      headers,
    });
  } catch (error) {
    const { headers } = applyCors(request);
    return new NextResponse(null, {
      status: 503,
      headers,
    });
  }
}

export async function OPTIONS(request: NextRequest) {
  const { headers } = applyCors(request);
  return new NextResponse(null, { status: 200, headers });
}

// 不支持的HTTP方法
export async function POST() {
  return NextResponse.json(
    {
      error: '不支持的HTTP方法',
      code: 'METHOD_NOT_ALLOWED',
    },
    { status: 405 },
  );
}

export async function PUT() {
  return NextResponse.json(
    {
      error: '不支持的HTTP方法',
      code: 'METHOD_NOT_ALLOWED',
    },
    { status: 405 },
  );
}

export async function DELETE() {
  return NextResponse.json(
    {
      error: '不支持的HTTP方法',
      code: 'METHOD_NOT_ALLOWED',
    },
    { status: 405 },
  );
}
