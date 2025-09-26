/**
 * T018: Firebase Admin SDK 配置
 * Server-side Firebase configuration and utilities
 */
import 'server-only';
import { initializeApp, getApps, cert, type App } from 'firebase-admin/app';
import { getAuth, type Auth } from 'firebase-admin/auth';

// Firebase Admin 配置
const firebaseAdminConfig = {
  projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
  privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
};

// 初始化 Firebase Admin（惰性且容错）
let adminApp: App | null = null;
let adminAuth: Auth | null = null;

function tryInitAdmin(): void {
  if (adminAuth) return;

  try {
    const apps = getApps();
    const hasFullConfig = Boolean(
      firebaseAdminConfig.projectId &&
      firebaseAdminConfig.clientEmail &&
      firebaseAdminConfig.privateKey,
    );

    if (apps.length === 0) {
      if (hasFullConfig) {
        adminApp = initializeApp(
          {
            credential: cert(firebaseAdminConfig),
            projectId: firebaseAdminConfig.projectId,
          },
          'admin',
        );
      } else {
        // 不抛错，保留为未初始化状态，调用方将获得明确错误信息
        adminApp = null;
      }
    } else {
      adminApp = apps.find((app) => app.name === 'admin') || apps[0];
    }

    if (adminApp) {
      adminAuth = getAuth(adminApp);
    }
  } catch (error) {
    console.error('Failed to initialize Firebase Admin:', error);
    adminApp = null;
    adminAuth = null;
  }
}

function ensureAdminAuth(): Auth {
  tryInitAdmin();
  if (!adminAuth) {
    const missing = [
      !firebaseAdminConfig.projectId && 'FIREBASE_ADMIN_PROJECT_ID',
      !firebaseAdminConfig.clientEmail && 'FIREBASE_ADMIN_CLIENT_EMAIL',
      !firebaseAdminConfig.privateKey && 'FIREBASE_ADMIN_PRIVATE_KEY',
    ]
      .filter(Boolean)
      .join(', ');

    const hint =
      missing.length > 0
        ? `Missing Firebase Admin envs: ${missing}`
        : 'Firebase Admin SDK not initialized';

    throw new Error(hint);
  }
  return adminAuth;
}

// Firebase Admin 认证操作
export const firebaseAdmin = {
  /**
   * 验证 ID Token
   */
  async verifyIdToken(idToken: string): Promise<{
    uid: string;
    email?: string;
    emailVerified?: boolean;
    [key: string]: any;
  }> {
    try {
      const decodedToken = await ensureAdminAuth().verifyIdToken(idToken);
      return decodedToken;
    } catch (error: any) {
      console.error('Error verifying ID token:', error);
      throw new Error(this.getVerificationErrorMessage(error.code));
    }
  },

  /**
   * 获取用户信息
   */
  async getUser(uid: string): Promise<{
    uid: string;
    email?: string;
    emailVerified?: boolean;
    displayName?: string;
    photoURL?: string;
    disabled?: boolean;
    metadata: {
      creationTime?: string;
      lastSignInTime?: string;
    };
  }> {
    try {
      const userRecord = await ensureAdminAuth().getUser(uid);
      return {
        uid: userRecord.uid,
        email: userRecord.email,
        emailVerified: userRecord.emailVerified,
        displayName: userRecord.displayName,
        photoURL: userRecord.photoURL,
        disabled: userRecord.disabled,
        metadata: {
          creationTime: userRecord.metadata.creationTime,
          lastSignInTime: userRecord.metadata.lastSignInTime,
        },
      };
    } catch (error: any) {
      console.error('Error getting user:', error);
      throw new Error('无法获取用户信息');
    }
  },

  /**
   * 根据邮箱获取用户
   */
  async getUserByEmail(email: string): Promise<{
    uid: string;
    email: string;
    emailVerified?: boolean;
    displayName?: string;
    photoURL?: string;
  }> {
    try {
      const userRecord = await ensureAdminAuth().getUserByEmail(email);
      return {
        uid: userRecord.uid,
        email: userRecord.email,
        emailVerified: userRecord.emailVerified,
        displayName: userRecord.displayName,
        photoURL: userRecord.photoURL,
      };
    } catch (error: any) {
      console.error('Error getting user by email:', error);
      throw new Error('无法找到该邮箱对应的用户');
    }
  },

  /**
   * 更新用户信息
   */
  async updateUser(
    uid: string,
    properties: {
      email?: string;
      displayName?: string;
      photoURL?: string;
      disabled?: boolean;
    },
  ): Promise<void> {
    try {
      await ensureAdminAuth().updateUser(uid, properties);
    } catch (error: any) {
      console.error('Error updating user:', error);
      throw new Error('无法更新用户信息');
    }
  },

  /**
   * 删除用户
   */
  async deleteUser(uid: string): Promise<void> {
    try {
      await ensureAdminAuth().deleteUser(uid);
    } catch (error: any) {
      console.error('Error deleting user:', error);
      throw new Error('无法删除用户');
    }
  },

  /**
   * 创建自定义 Token
   */
  async createCustomToken(
    uid: string,
    additionalClaims?: object,
  ): Promise<string> {
    try {
      return await ensureAdminAuth().createCustomToken(uid, additionalClaims);
    } catch (error: any) {
      console.error('Error creating custom token:', error);
      throw new Error('无法创建自定义令牌');
    }
  },

  /**
   * 设置自定义用户声明
   */
  async setCustomUserClaims(
    uid: string,
    customUserClaims: object,
  ): Promise<void> {
    try {
      await ensureAdminAuth().setCustomUserClaims(uid, customUserClaims);
    } catch (error: any) {
      console.error('Error setting custom user claims:', error);
      throw new Error('无法设置用户权限');
    }
  },

  /**
   * 批量获取用户
   */
  async getUsers(uids: string[]): Promise<
    Array<{
      uid: string;
      email?: string;
      displayName?: string;
      photoURL?: string;
    }>
  > {
    try {
      const getUsersResult = await ensureAdminAuth().getUsers(
        uids.map((uid) => ({ uid })),
      );

      return getUsersResult.users.map((user) => ({
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
      }));
    } catch (error: any) {
      console.error('Error getting users:', error);
      throw new Error('无法批量获取用户信息');
    }
  },

  /**
   * 检查用户是否存在
   */
  async userExists(uid: string): Promise<boolean> {
    try {
      await ensureAdminAuth().getUser(uid);
      return true;
    } catch (error: any) {
      if (error.code === 'auth/user-not-found') {
        return false;
      }
      throw error;
    }
  },

  /**
   * 获取验证错误的友好消息
   */
  getVerificationErrorMessage(errorCode: string): string {
    const errorMessages: Record<string, string> = {
      'auth/argument-error': 'Token 格式无效',
      'auth/id-token-expired': 'Token 已过期',
      'auth/id-token-revoked': 'Token 已被撤销',
      'auth/invalid-id-token': 'Token 无效',
      'auth/project-not-found': 'Firebase 项目未找到',
      'auth/insufficient-permission': '权限不足',
      'auth/internal-error': '内部服务器错误',
    };

    return errorMessages[errorCode] || '权限验证失败';
  },
};

// 中间件辅助函数：从请求头中提取和验证 token
export async function verifyAuthHeader(authHeader: string | null): Promise<{
  uid: string;
  email?: string;
  emailVerified?: boolean;
} | null> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7); // 移除 "Bearer " 前缀

  try {
    const decodedToken = await firebaseAdmin.verifyIdToken(token);
    return {
      uid: decodedToken.uid,
      email: decodedToken.email,
      emailVerified: decodedToken.email_verified,
    };
  } catch (error) {
    console.error('Auth header verification failed:', error);
    return null;
  }
}

// 验证配置
export function validateFirebaseAdminConfig(): void {
  const requiredEnvVars = [
    'FIREBASE_ADMIN_PROJECT_ID',
    'FIREBASE_ADMIN_PRIVATE_KEY',
    'FIREBASE_ADMIN_CLIENT_EMAIL',
  ];

  const missingVars = requiredEnvVars.filter(
    (varName) => !process.env[varName],
  );

  if (missingVars.length > 0) {
    throw new Error(
      `Missing Firebase Admin configuration: ${missingVars.join(', ')}`,
    );
  }
}

// 仅在服务器端运行配置验证
if (typeof window === 'undefined') {
  try {
    validateFirebaseAdminConfig();
  } catch (error) {
    console.warn('Firebase Admin configuration warning:', error);
  }
}
