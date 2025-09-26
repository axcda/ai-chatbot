import { test, expect } from '@playwright/test';

/**
 * T007: 用户同步合约测试
 * 验证 PUT /api/auth/sync-user 端点的合约
 */

const API_BASE = process.env.PLAYWRIGHT
  ? 'http://localhost:3000'
  : 'http://localhost:3000';

test.describe('用户同步 API 合约测试', () => {
  let mockFirebaseToken: string;

  test.beforeAll(async () => {
    console.log('准备用户同步合约测试...');
    mockFirebaseToken = 'mock-firebase-token-for-testing';
  });

  test.afterAll(async () => {
    console.log('用户同步合约测试完成');
  });

  test.describe('PUT /api/auth/sync-user', () => {
    test('应该成功同步用户数据', async () => {
      const response = await fetch(`${API_BASE}/api/auth/sync-user`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${mockFirebaseToken}`,
        },
        body: JSON.stringify({
          firebaseUid: 'firebase-uid-789',
          userData: {
            displayName: 'John Updated',
            photoURL: 'https://example.com/new-avatar.jpg',
          },
        }),
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toMatchObject({
        success: true,
      });
    });

    test('应该处理部分用户数据更新', async () => {
      const response = await fetch(`${API_BASE}/api/auth/sync-user`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${mockFirebaseToken}`,
        },
        body: JSON.stringify({
          firebaseUid: 'firebase-uid-789',
          userData: {
            displayName: 'Only Name Updated',
            // photoURL 不更新
          },
        }),
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toMatchObject({
        success: true,
      });
    });

    test('应该拒绝不存在的用户同步', async () => {
      const response = await fetch(`${API_BASE}/api/auth/sync-user`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${mockFirebaseToken}`,
        },
        body: JSON.stringify({
          firebaseUid: 'nonexistent-firebase-uid',
          userData: {
            displayName: 'Should Fail',
          },
        }),
      });

      expect(response.status).toBe(404);

      const data = await response.json();
      expect(data).toMatchObject({
        error: expect.stringContaining('用户不存在'),
        code: 'USER_NOT_FOUND',
      });
    });

    test('应该验证firebaseUid格式', async () => {
      const response = await fetch(`${API_BASE}/api/auth/sync-user`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${mockFirebaseToken}`,
        },
        body: JSON.stringify({
          firebaseUid: '', // 空字符串
          userData: {
            displayName: 'Test',
          },
        }),
      });

      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error).toBeDefined();
    });

    test('应该要求Firebase认证', async () => {
      const response = await fetch(`${API_BASE}/api/auth/sync-user`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          // 缺少 Authorization header
        },
        body: JSON.stringify({
          firebaseUid: 'firebase-uid-789',
          userData: {
            displayName: 'Should Fail',
          },
        }),
      });

      expect(response.status).toBe(403);

      const data = await response.json();
      expect(data).toMatchObject({
        error: expect.stringContaining('权限验证失败'),
        code: 'TOKEN_VERIFICATION_FAILED',
      });
    });

    test('应该验证displayName长度', async () => {
      const longName = 'a'.repeat(101); // 超过100字符限制

      const response = await fetch(`${API_BASE}/api/auth/sync-user`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${mockFirebaseToken}`,
        },
        body: JSON.stringify({
          firebaseUid: 'firebase-uid-789',
          userData: {
            displayName: longName,
          },
        }),
      });

      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error).toBeDefined();
    });

    test('应该验证photoURL格式', async () => {
      const response = await fetch(`${API_BASE}/api/auth/sync-user`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${mockFirebaseToken}`,
        },
        body: JSON.stringify({
          firebaseUid: 'firebase-uid-789',
          userData: {
            photoURL: 'invalid-url-format',
          },
        }),
      });

      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error).toBeDefined();
    });

    test('应该处理空的userData对象', async () => {
      const response = await fetch(`${API_BASE}/api/auth/sync-user`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${mockFirebaseToken}`,
        },
        body: JSON.stringify({
          firebaseUid: 'firebase-uid-789',
          userData: {}, // 空对象
        }),
      });

      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error).toBeDefined();
    });
  });
});
