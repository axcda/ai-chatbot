import { test, expect } from '@playwright/test';

/**
 * T006: 用户迁移合约测试
 * 验证 POST /api/auth/migrate-user 端点的合约
 */

const API_BASE = process.env.PLAYWRIGHT
  ? 'http://localhost:3000'
  : 'http://localhost:3000';

test.describe('用户迁移 API 合约测试', () => {
  let mockFirebaseToken: string;

  test.beforeAll(async () => {
    console.log('准备用户迁移合约测试...');
    mockFirebaseToken = 'mock-firebase-token-for-testing';
  });

  test.afterAll(async () => {
    console.log('用户迁移合约测试完成');
  });

  test.describe('POST /api/auth/migrate-user', () => {
    test('应该成功迁移现有用户', async () => {
      const response = await fetch(`${API_BASE}/api/auth/migrate-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${mockFirebaseToken}`,
        },
        body: JSON.stringify({
          email: 'existing@example.com',
          firebaseUid: 'firebase-uid-456',
        }),
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toMatchObject({
        success: true,
        userId: expect.stringMatching(/^[0-9a-f-]{36}$/), // UUID格式
        migrated: true,
      });
    });

    test('应该拒绝不存在的用户迁移', async () => {
      const response = await fetch(`${API_BASE}/api/auth/migrate-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${mockFirebaseToken}`,
        },
        body: JSON.stringify({
          email: 'nonexistent@example.com',
          firebaseUid: 'firebase-uid-999',
        }),
      });

      expect(response.status).toBe(404);

      const data = await response.json();
      expect(data).toMatchObject({
        error: expect.stringContaining('用户不存在'),
        code: 'USER_NOT_FOUND',
      });
    });

    test('应该拒绝已迁移的用户', async () => {
      const response = await fetch(`${API_BASE}/api/auth/migrate-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${mockFirebaseToken}`,
        },
        body: JSON.stringify({
          email: 'already-migrated@example.com',
          firebaseUid: 'firebase-uid-existing',
        }),
      });

      expect(response.status).toBe(409);

      const data = await response.json();
      expect(data).toMatchObject({
        error: expect.stringContaining('用户已迁移'),
        code: 'USER_ALREADY_MIGRATED',
      });
    });

    test('应该验证email格式', async () => {
      const response = await fetch(`${API_BASE}/api/auth/migrate-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${mockFirebaseToken}`,
        },
        body: JSON.stringify({
          email: 'invalid-email-format',
          firebaseUid: 'firebase-uid-457',
        }),
      });

      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error).toBeDefined();
    });

    test('应该要求Firebase认证', async () => {
      const response = await fetch(`${API_BASE}/api/auth/migrate-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // 缺少 Authorization header
        },
        body: JSON.stringify({
          email: 'test@example.com',
          firebaseUid: 'firebase-uid-458',
        }),
      });

      expect(response.status).toBe(403);

      const data = await response.json();
      expect(data).toMatchObject({
        error: expect.stringContaining('权限验证失败'),
        code: 'TOKEN_VERIFICATION_FAILED',
      });
    });

    test('应该验证firebaseUid长度', async () => {
      const response = await fetch(`${API_BASE}/api/auth/migrate-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${mockFirebaseToken}`,
        },
        body: JSON.stringify({
          email: 'test@example.com',
          firebaseUid: '', // 空字符串
        }),
      });

      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error).toBeDefined();
    });

    test('应该处理超长firebaseUid', async () => {
      const longUid = 'a'.repeat(129); // 超过128字符限制

      const response = await fetch(`${API_BASE}/api/auth/migrate-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${mockFirebaseToken}`,
        },
        body: JSON.stringify({
          email: 'test@example.com',
          firebaseUid: longUid,
        }),
      });

      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error).toBeDefined();
    });
  });
});
