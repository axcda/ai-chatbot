/**
 * T009: Firebase 测试助手函数
 * 提供Firebase认证和测试的辅助工具
 */

export interface MockFirebaseUser {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
}

export interface FirebaseTestConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
}

/**
 * 创建模拟的Firebase ID Token用于测试
 */
export function createMockFirebaseToken(user: MockFirebaseUser): string {
  // 在真实实现中，这会是一个JWT token
  // 现在返回一个包含用户信息的模拟token
  const payload = {
    uid: user.uid,
    email: user.email,
    iss: 'https://securetoken.google.com/test-project',
    aud: 'test-project',
    exp: Math.floor(Date.now() / 1000) + 3600, // 1小时后过期
    iat: Math.floor(Date.now() / 1000),
    sub: user.uid,
    firebase: {
      identities: {
        email: [user.email],
      },
      sign_in_provider: 'password',
    },
  };

  return `mock-token-${Buffer.from(JSON.stringify(payload)).toString('base64')}`;
}

/**
 * 验证模拟的Firebase Token（用于测试）
 */
export function verifyMockFirebaseToken(
  token: string,
): MockFirebaseUser | null {
  try {
    if (!token.startsWith('mock-token-')) {
      return null;
    }

    const payloadBase64 = token.replace('mock-token-', '');
    const payload = JSON.parse(Buffer.from(payloadBase64, 'base64').toString());

    // 检查过期时间
    if (payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    return {
      uid: payload.uid,
      email: payload.email,
      displayName: payload.name,
      photoURL: payload.picture,
    };
  } catch (error) {
    return null;
  }
}

/**
 * 创建测试用户数据
 */
export function createTestUser(index = 1): MockFirebaseUser {
  return {
    uid: `firebase-test-uid-${index}`,
    email: `test${index}@example.com`,
    displayName: `Test User ${index}`,
    photoURL: `https://example.com/avatar${index}.jpg`,
  };
}

/**
 * 创建现有用户数据（用于迁移测试）
 */
export function createExistingUser(index = 1) {
  return {
    id: `existing-user-id-${index}`,
    email: `existing${index}@example.com`,
    name: `Existing User ${index}`,
    createdAt: new Date(Date.now() - 86400000 * 30), // 30天前创建
    authProvider: 'nextauth', // 旧的认证提供者
  };
}

/**
 * 清理测试数据库
 */
export async function cleanupTestDatabase(): Promise<void> {
  // 在真实实现中，这会清理测试数据库中的测试数据
  console.log('清理测试数据库中的测试数据...');

  // 模拟清理操作
  await new Promise((resolve) => setTimeout(resolve, 100));
}

/**
 * 设置测试环境
 */
export async function setupTestEnvironment(): Promise<void> {
  console.log('设置Firebase测试环境...');

  // 检查环境变量
  const requiredEnvVars = [
    'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
    'FIREBASE_ADMIN_PROJECT_ID',
  ];

  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      console.warn(`警告: 缺少环境变量 ${envVar}`);
    }
  }

  // 模拟初始化
  await new Promise((resolve) => setTimeout(resolve, 100));
}

/**
 * 创建有效的邀请码列表
 */
export function getValidInviteCodes(): string[] {
  return (process.env.INVITE_CODES || 'alpha,beta,gamma,test,demo').split(',');
}

/**
 * 检查邀请码是否有效
 */
export function isValidInviteCode(code: string): boolean {
  const validCodes = getValidInviteCodes();
  return validCodes.includes(code);
}

/**
 * 生成随机的无效邀请码
 */
export function generateInvalidInviteCode(): string {
  const validCodes = getValidInviteCodes();
  let invalidCode: string;

  do {
    invalidCode = Math.random().toString(36).substring(2, 10);
  } while (validCodes.includes(invalidCode));

  return invalidCode;
}

/**
 * 模拟API请求延迟
 */
export async function simulateNetworkDelay(ms = 100): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 验证UUID格式
 */
export function isValidUUID(uuid: string): boolean {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * 验证ISO日期格式
 */
export function isValidISODate(dateString: string): boolean {
  try {
    const date = new Date(dateString);
    return date.toISOString() === dateString;
  } catch {
    return false;
  }
}

/**
 * 创建测试配置对象
 */
export function createTestConfig(): FirebaseTestConfig {
  return {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'test-api-key',
    authDomain:
      process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ||
      'test-project.firebaseapp.com',
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'test-project',
  };
}
