import { test, expect, type Page } from '@playwright/test';
import {
  createTestUser,
  createMockFirebaseToken,
  getValidInviteCodes,
  generateInvalidInviteCode,
  cleanupTestDatabase,
  setupTestEnvironment,
} from '../helpers/firebase-test';

/**
 * T010: 认证流程集成测试
 * 端到端测试完整的Firebase认证流程
 */

test.describe('Firebase 认证流程集成测试', () => {
  let page: Page;

  test.beforeAll(async () => {
    await setupTestEnvironment();
  });

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    await cleanupTestDatabase();
  });

  test.afterEach(async () => {
    await page.close();
  });

  test.describe('邀请码验证流程', () => {
    test('应该验证有效邀请码', async () => {
      const validCode = getValidInviteCodes()[0];

      await page.goto('/register');

      // 输入邀请码
      await page.fill('[data-testid="invite-code-input"]', validCode);
      await page.click('[data-testid="validate-invite-button"]');

      // 验证成功状态
      await expect(
        page.locator('[data-testid="invite-code-valid"]'),
      ).toBeVisible();
      await expect(
        page.locator('[data-testid="registration-form"]'),
      ).toBeVisible();
    });

    test('应该拒绝无效邀请码', async () => {
      const invalidCode = generateInvalidInviteCode();

      await page.goto('/register');

      // 输入无效邀请码
      await page.fill('[data-testid="invite-code-input"]', invalidCode);
      await page.click('[data-testid="validate-invite-button"]');

      // 验证错误状态
      await expect(
        page.locator('[data-testid="invite-code-error"]'),
      ).toBeVisible();
      await expect(
        page.locator('[data-testid="registration-form"]'),
      ).not.toBeVisible();
    });

    test('应该显示邀请码格式错误', async () => {
      await page.goto('/register');

      // 输入空邀请码
      await page.fill('[data-testid="invite-code-input"]', '');
      await page.click('[data-testid="validate-invite-button"]');

      // 验证验证错误
      await expect(
        page.locator('[data-testid="invite-code-required-error"]'),
      ).toBeVisible();
    });
  });

  test.describe('用户注册流程', () => {
    test('应该完成完整的注册流程', async () => {
      const testUser = createTestUser(1);
      const validCode = getValidInviteCodes()[0];

      await page.goto('/register');

      // 第1步：验证邀请码
      await page.fill('[data-testid="invite-code-input"]', validCode);
      await page.click('[data-testid="validate-invite-button"]');
      await expect(
        page.locator('[data-testid="registration-form"]'),
      ).toBeVisible();

      // 第2步：填写注册表单
      await page.fill('[data-testid="email-input"]', testUser.email);
      await page.fill('[data-testid="password-input"]', 'TestPassword123!');
      await page.fill(
        '[data-testid="confirm-password-input"]',
        'TestPassword123!',
      );

      // 模拟Firebase注册成功
      await page.evaluate((user) => {
        // 在真实环境中，这会触发Firebase SDK
        window.mockFirebaseAuth = {
          createUserWithEmailAndPassword: () =>
            Promise.resolve({
              user: { uid: user.uid, email: user.email },
            }),
        };
      }, testUser);

      await page.click('[data-testid="register-button"]');

      // 验证注册成功
      await expect(
        page.locator('[data-testid="registration-success"]'),
      ).toBeVisible();
      await expect(page).toHaveURL('/chat'); // 重定向到聊天页面
    });

    test('应该处理Firebase注册错误', async () => {
      const validCode = getValidInviteCodes()[0];

      await page.goto('/register');

      // 验证邀请码
      await page.fill('[data-testid="invite-code-input"]', validCode);
      await page.click('[data-testid="validate-invite-button"]');

      // 填写注册表单
      await page.fill('[data-testid="email-input"]', 'existing@example.com'); // 已存在的邮箱
      await page.fill('[data-testid="password-input"]', 'TestPassword123!');
      await page.fill(
        '[data-testid="confirm-password-input"]',
        'TestPassword123!',
      );

      // 模拟Firebase注册失败
      await page.evaluate(() => {
        window.mockFirebaseAuth = {
          createUserWithEmailAndPassword: () =>
            Promise.reject({
              code: 'auth/email-already-in-use',
              message:
                'The email address is already in use by another account.',
            }),
        };
      });

      await page.click('[data-testid="register-button"]');

      // 验证错误消息
      await expect(
        page.locator('[data-testid="registration-error"]'),
      ).toBeVisible();
      await expect(
        page.locator('[data-testid="registration-error"]'),
      ).toContainText('邮箱已被使用');
    });

    test('应该验证密码强度', async () => {
      const validCode = getValidInviteCodes()[0];

      await page.goto('/register');

      // 验证邀请码
      await page.fill('[data-testid="invite-code-input"]', validCode);
      await page.click('[data-testid="validate-invite-button"]');

      // 输入弱密码
      await page.fill('[data-testid="email-input"]', 'test@example.com');
      await page.fill('[data-testid="password-input"]', '123'); // 弱密码
      await page.fill('[data-testid="confirm-password-input"]', '123');

      await page.click('[data-testid="register-button"]');

      // 验证密码强度错误
      await expect(
        page.locator('[data-testid="password-strength-error"]'),
      ).toBeVisible();
    });
  });

  test.describe('用户登录流程', () => {
    test('应该完成Firebase登录', async () => {
      const testUser = createTestUser(2);

      await page.goto('/login');

      // 填写登录表单
      await page.fill('[data-testid="email-input"]', testUser.email);
      await page.fill('[data-testid="password-input"]', 'TestPassword123!');

      // 模拟Firebase登录成功
      await page.evaluate((user) => {
        window.mockFirebaseAuth = {
          signInWithEmailAndPassword: () =>
            Promise.resolve({
              user: { uid: user.uid, email: user.email },
            }),
        };
      }, testUser);

      await page.click('[data-testid="login-button"]');

      // 验证登录成功
      await expect(page).toHaveURL('/chat');
      await expect(page.locator('[data-testid="user-avatar"]')).toBeVisible();
    });

    test('应该处理Firebase登录错误', async () => {
      await page.goto('/login');

      // 填写错误的登录信息
      await page.fill('[data-testid="email-input"]', 'wrong@example.com');
      await page.fill('[data-testid="password-input"]', 'wrongpassword');

      // 模拟Firebase登录失败
      await page.evaluate(() => {
        window.mockFirebaseAuth = {
          signInWithEmailAndPassword: () =>
            Promise.reject({
              code: 'auth/invalid-credential',
              message: 'Invalid email or password.',
            }),
        };
      });

      await page.click('[data-testid="login-button"]');

      // 验证错误消息
      await expect(page.locator('[data-testid="login-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="login-error"]')).toContainText(
        '邮箱或密码错误',
      );
    });
  });

  test.describe('用户迁移流程', () => {
    test('应该成功迁移现有用户', async () => {
      // 假设存在一个旧用户需要迁移
      const existingUser = {
        email: 'legacy@example.com',
        password: 'OldPassword123!',
      };

      await page.goto('/login');

      // 尝试用旧密码登录
      await page.fill('[data-testid="email-input"]', existingUser.email);
      await page.fill('[data-testid="password-input"]', existingUser.password);

      // 模拟需要迁移的情况
      await page.evaluate(() => {
        window.mockFirebaseAuth = {
          signInWithEmailAndPassword: () =>
            Promise.reject({
              code: 'auth/user-not-found',
              message: 'User needs migration',
            }),
        };
      });

      await page.click('[data-testid="login-button"]');

      // 验证迁移提示
      await expect(
        page.locator('[data-testid="migration-prompt"]'),
      ).toBeVisible();

      await page.click('[data-testid="migrate-account-button"]');

      // 验证迁移成功
      await expect(
        page.locator('[data-testid="migration-success"]'),
      ).toBeVisible();
      await expect(page).toHaveURL('/chat');
    });
  });

  test.describe('认证状态管理', () => {
    test('应该在认证后保持登录状态', async () => {
      const testUser = createTestUser(3);
      const token = createMockFirebaseToken(testUser);

      // 设置认证状态
      await page.evaluate((tokenData) => {
        localStorage.setItem('firebase-token', tokenData);
        window.mockFirebaseAuth = {
          currentUser: {
            uid: tokenData.split('-')[2],
            email: 'test3@example.com',
          },
        };
      }, token);

      await page.goto('/chat');

      // 验证已认证状态
      await expect(page.locator('[data-testid="user-avatar"]')).toBeVisible();
      await expect(page.locator('[data-testid="logout-button"]')).toBeVisible();
    });

    test('应该在未认证时重定向到登录', async () => {
      await page.goto('/chat');

      // 验证重定向到登录页面
      await expect(page).toHaveURL('/login');
      await expect(page.locator('[data-testid="login-form"]')).toBeVisible();
    });

    test('应该完成登出流程', async () => {
      const testUser = createTestUser(4);
      const token = createMockFirebaseToken(testUser);

      // 设置认证状态
      await page.evaluate((tokenData) => {
        localStorage.setItem('firebase-token', tokenData);
        window.mockFirebaseAuth = {
          currentUser: {
            uid: tokenData.split('-')[2],
            email: 'test4@example.com',
          },
        };
      }, token);

      await page.goto('/chat');

      // 点击登出
      await page.click('[data-testid="logout-button"]');

      // 验证登出成功
      await expect(page).toHaveURL('/login');
      await expect(page.locator('[data-testid="login-form"]')).toBeVisible();
    });
  });

  test.describe('错误处理和边界情况', () => {
    test('应该处理网络错误', async () => {
      await page.goto('/register');

      // 模拟网络离线
      await page.setOffline(true);

      const validCode = getValidInviteCodes()[0];
      await page.fill('[data-testid="invite-code-input"]', validCode);
      await page.click('[data-testid="validate-invite-button"]');

      // 验证网络错误消息
      await expect(page.locator('[data-testid="network-error"]')).toBeVisible();

      // 恢复网络
      await page.setOffline(false);
    });

    test('应该处理服务器错误', async () => {
      await page.goto('/register');

      // 模拟服务器500错误
      await page.route('**/api/auth/validate-invite', (route) => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            error: '服务器内部错误',
            code: 'INTERNAL_SERVER_ERROR',
          }),
        });
      });

      const validCode = getValidInviteCodes()[0];
      await page.fill('[data-testid="invite-code-input"]', validCode);
      await page.click('[data-testid="validate-invite-button"]');

      // 验证服务器错误消息
      await expect(page.locator('[data-testid="server-error"]')).toBeVisible();
    });
  });
});
