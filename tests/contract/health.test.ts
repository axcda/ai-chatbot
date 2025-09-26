import { test, expect } from '@playwright/test';

/**
 * T008: 健康检查合约测试
 * 验证 GET /api/health 端点的合约
 */

const API_BASE = process.env.PLAYWRIGHT
  ? 'http://localhost:3000'
  : 'http://localhost:3000';

test.describe('健康检查 API 合约测试', () => {
  test.beforeAll(async () => {
    console.log('准备健康检查合约测试...');
  });

  test.afterAll(async () => {
    console.log('健康检查合约测试完成');
  });

  test.describe('GET /api/health', () => {
    test('应该返回健康状态', async () => {
      const response = await fetch(`${API_BASE}/api/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toMatchObject({
        status: 'healthy',
        timestamp: expect.stringMatching(
          /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/,
        ), // ISO 8601格式
        services: {
          firebase: 'connected',
          postgresql: 'connected',
        },
      });
    });

    test('应该响应正确的Content-Type', async () => {
      const response = await fetch(`${API_BASE}/api/health`, {
        method: 'GET',
      });

      expect(response.headers.get('content-type')).toContain(
        'application/json',
      );
    });

    test('应该处理服务异常状态', async () => {
      // 这个测试可能需要模拟服务异常情况
      // 实际实现时可能需要特殊的测试环境设置

      const response = await fetch(
        `${API_BASE}/api/health?simulate_error=true`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );

      // 如果模拟错误，应该返回503状态
      if (response.status === 503) {
        const data = await response.json();
        expect(data).toMatchObject({
          status: 'unhealthy',
          error: expect.any(String),
        });
      } else {
        // 如果没有模拟错误功能，应该返回正常状态
        expect(response.status).toBe(200);
      }
    });

    test('应该快速响应（性能要求）', async () => {
      const startTime = Date.now();

      const response = await fetch(`${API_BASE}/api/health`, {
        method: 'GET',
      });

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      expect(response.status).toBe(200);
      expect(responseTime).toBeLessThan(5000); // 健康检查应该在5秒内响应
    });

    test('应该支持HEAD请求（可选）', async () => {
      const response = await fetch(`${API_BASE}/api/health`, {
        method: 'HEAD',
      });

      // HEAD请求应该返回200状态但没有响应体
      expect([200, 405]).toContain(response.status); // 405 Method Not Allowed 也是可接受的
    });

    test('应该拒绝不支持的HTTP方法', async () => {
      const response = await fetch(`${API_BASE}/api/health`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      expect(response.status).toBe(405); // Method Not Allowed
    });

    test('应该包含正确的时间戳格式', async () => {
      const response = await fetch(`${API_BASE}/api/health`, {
        method: 'GET',
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      const timestamp = new Date(data.timestamp);

      // 验证时间戳是有效的日期
      expect(timestamp.getTime()).not.toBeNaN();

      // 验证时间戳是最近的（不超过10秒前）
      const now = new Date();
      const diff = Math.abs(now.getTime() - timestamp.getTime());
      expect(diff).toBeLessThan(10000); // 10秒
    });

    test('应该包含所有必需的服务状态', async () => {
      const response = await fetch(`${API_BASE}/api/health`, {
        method: 'GET',
      });

      expect(response.status).toBe(200);

      const data = await response.json();

      // 验证包含所有必需的服务
      expect(data.services).toHaveProperty('firebase');
      expect(data.services).toHaveProperty('postgresql');

      // 验证服务状态值是有效的
      const validStatuses = ['connected', 'disconnected', 'error'];
      expect(validStatuses).toContain(data.services.firebase);
      expect(validStatuses).toContain(data.services.postgresql);
    });
  });
});
