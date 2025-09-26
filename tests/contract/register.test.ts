import { test, expect } from '@playwright/test';

/**
 * T005: 用户注册合约测试
 * 验证 POST /api/auth/register 端点的合约
 */

const API_BASE = process.env.PLAYWRIGHT
  ? 'http://localhost:3000'
  : 'http://localhost:3000';

test.describe('用户注册 API 合约测试', () => {
  let mockFirebaseToken: string;

  test.beforeAll(async () => {
    console.log('准备用户注册合约测试...');
    // 模拟 Firebase token (实际实现时需要真实的 Firebase token)
    mockFirebaseToken = 'mock-firebase-token-for-testing';
  });

  test.afterAll(async () => {
    console.log('用户注册合约测试完成');
  });

  test.describe('POST /api/auth/register', () => {
    test('应该成功注册新用户', async () => {
      const response = await fetch(`${API_BASE}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${mockFirebaseToken}`,
        },
        body: JSON.stringify({
          email: 'newuser@example.com',
          inviteCode: 'alpha',
          firebaseUid: 'firebase-uid-123',
        }),
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toMatchObject({
        success: true,
        userId: expect.stringMatching(/^[0-9a-f-]{36}$/), // UUID格式
        user: {
          email: 'newuser@example.com',
          firebaseUid: 'firebase-uid-123',
          authProvider: 'firebase',
        },
      });
    });

    test('应该拒绝无效的邀请码', async () => {
      const response = await fetch(`${API_BASE}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${mockFirebaseToken}`,
        },
        body: JSON.stringify({
          email: 'test@example.com',
          inviteCode: 'invalid-code',
          firebaseUid: 'firebase-uid-124',
        }),
      });

      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data).toMatchObject({
        error: expect.stringContaining('邀请码无效'),
        code: 'INVALID_INVITE_CODE',
      });
    });

    test('应该拒绝重复的用户', async () => {
      const response = await fetch(`${API_BASE}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${mockFirebaseToken}`,
        },
        body: JSON.stringify({
          email: 'existing@example.com',
          inviteCode: 'alpha',
          firebaseUid: 'existing-firebase-uid',
        }),
      });

      expect(response.status).toBe(409);

      const data = await response.json();
      expect(data).toMatchObject({
        error: expect.stringContaining('用户已存在'),
        code: 'USER_EXISTS',
      });
    });

    test('应该验证email格式', async () => {
      const response = await fetch(`${API_BASE}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${mockFirebaseToken}`,
        },
        body: JSON.stringify({
          email: 'invalid-email',
          inviteCode: 'alpha',
          firebaseUid: 'firebase-uid-125',
        }),
      });

      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error).toBeDefined();
    });

    test('应该要求Firebase认证', async () => {
      const response = await fetch(`${API_BASE}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // 缺少 Authorization header
        },
        body: JSON.stringify({
          email: 'test@example.com',
          inviteCode: 'alpha',
          firebaseUid: 'firebase-uid-126',
        }),
      });

      expect(response.status).toBe(403);

      const data = await response.json();
      expect(data).toMatchObject({
        error: expect.stringContaining('权限验证失败'),
        code: 'TOKEN_VERIFICATION_FAILED',
      });
    });

    test('应该验证必填字段', async () => {
      const response = await fetch(`${API_BASE}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${mockFirebaseToken}`,
        },
        body: JSON.stringify({
          // 缺少必填字段
        }),
      });

      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error).toBeDefined();
    });
  });
});
