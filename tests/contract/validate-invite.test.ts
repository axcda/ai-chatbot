import { test, expect } from '@playwright/test';

/**
 * T004: 邀请码验证合约测试
 * 验证 POST /api/auth/validate-invite 端点的合约
 */

const API_BASE = process.env.PLAYWRIGHT
  ? 'http://localhost:3000'
  : 'http://localhost:3000';

test.describe('邀请码验证 API 合约测试', () => {
  test.beforeAll(async () => {
    // 测试前置条件：确保服务器运行
    console.log('准备邀请码验证合约测试...');
  });

  test.afterAll(async () => {
    console.log('邀请码验证合约测试完成');
  });

  test.describe('POST /api/auth/validate-invite', () => {
    test('应该接受有效的邀请码', async () => {
      const response = await fetch(`${API_BASE}/api/auth/validate-invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inviteCode: 'alpha',
        }),
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toMatchObject({
        valid: true,
        inviteCode: 'alpha',
      });
    });

    test('应该拒绝无效的邀请码', async () => {
      const response = await fetch(`${API_BASE}/api/auth/validate-invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inviteCode: 'invalid-code',
        }),
      });

      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data).toMatchObject({
        error: expect.stringContaining('邀请码无效'),
        code: 'INVALID_INVITE_CODE',
      });
    });

    test('应该验证请求体格式', async () => {
      const response = await fetch(`${API_BASE}/api/auth/validate-invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error).toBeDefined();
    });

    test('应该处理空邀请码', async () => {
      const response = await fetch(`${API_BASE}/api/auth/validate-invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inviteCode: '',
        }),
      });

      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error).toBeDefined();
    });

    test('应该处理超长邀请码', async () => {
      const longCode = 'a'.repeat(51); // 超过50字符限制

      const response = await fetch(`${API_BASE}/api/auth/validate-invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inviteCode: longCode,
        }),
      });

      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error).toBeDefined();
    });
  });
});
