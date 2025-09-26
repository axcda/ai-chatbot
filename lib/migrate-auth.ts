/**
 * T036: 认证系统迁移工具
 * lib/migrate-auth.ts
 */

import { firebaseAdmin } from './auth/firebase-admin';
import {
  migrateUserToFirebase,
  createUser,
  getUserByEmail,
} from './db/queries/users';

export interface MigrationResult {
  success: boolean;
  userId?: string;
  error?: string;
  action: 'created' | 'migrated' | 'exists' | 'failed';
}

export interface BatchMigrationResult {
  total: number;
  successful: number;
  failed: number;
  results: MigrationResult[];
  errors: string[];
}

/**
 * 迁移单个用户到Firebase认证系统
 */
export async function migrateUserAccount(
  email: string,
  firebaseUid: string,
  displayName?: string,
  avatarUrl?: string,
): Promise<MigrationResult> {
  try {
    // 1. 验证Firebase用户存在
    let firebaseUser: any;
    try {
      firebaseUser = await firebaseAdmin.getUser(firebaseUid);
    } catch (error) {
      return {
        success: false,
        error: 'Firebase用户不存在',
        action: 'failed',
      };
    }

    // 2. 检查邮箱是否匹配
    if (firebaseUser.email !== email) {
      return {
        success: false,
        error: '邮箱与Firebase账户不匹配',
        action: 'failed',
      };
    }

    // 3. 检查数据库中是否已有该用户
    const existingUser = await getUserByEmail(email);

    if (existingUser) {
      // 如果用户已有Firebase UID，说明已经迁移过
      if (existingUser.firebaseUid) {
        return {
          success: true,
          userId: existingUser.id,
          action: 'exists',
        };
      }

      // 如果是遗留用户，进行迁移
      if (existingUser.authProvider === 'legacy') {
        const migratedUser = await migrateUserToFirebase(email, firebaseUid);

        if (migratedUser) {
          return {
            success: true,
            userId: migratedUser.id,
            action: 'migrated',
          };
        } else {
          return {
            success: false,
            error: '迁移失败',
            action: 'failed',
          };
        }
      }
    }

    // 4. 创建新用户
    const newUser = await createUser({
      email,
      firebaseUid,
      displayName: displayName || firebaseUser.displayName || undefined,
      avatarUrl: avatarUrl || firebaseUser.photoURL || undefined,
    });

    return {
      success: true,
      userId: newUser.id,
      action: 'created',
    };
  } catch (error: any) {
    console.error('User migration error:', error);
    return {
      success: false,
      error: error.message || '迁移过程中发生错误',
      action: 'failed',
    };
  }
}

/**
 * 批量迁移遗留用户
 */
export async function batchMigrateUsers(
  migrationData: Array<{
    email: string;
    firebaseUid: string;
    displayName?: string;
    avatarUrl?: string;
  }>,
): Promise<BatchMigrationResult> {
  const results: MigrationResult[] = [];
  const errors: string[] = [];
  let successful = 0;
  let failed = 0;

  for (const userData of migrationData) {
    try {
      const result = await migrateUserAccount(
        userData.email,
        userData.firebaseUid,
        userData.displayName,
        userData.avatarUrl,
      );

      results.push(result);

      if (result.success) {
        successful++;
      } else {
        failed++;
        if (result.error) {
          errors.push(`${userData.email}: ${result.error}`);
        }
      }
    } catch (error: any) {
      failed++;
      const errorMessage = `${userData.email}: ${error.message || '未知错误'}`;
      errors.push(errorMessage);
      results.push({
        success: false,
        error: errorMessage,
        action: 'failed',
      });
    }
  }

  return {
    total: migrationData.length,
    successful,
    failed,
    results,
    errors,
  };
}

/**
 * 验证迁移状态
 */
export async function validateMigration(email: string): Promise<{
  isValid: boolean;
  status: 'not-found' | 'legacy' | 'migrated' | 'firebase-only';
  user?: any;
  issues?: string[];
}> {
  try {
    const user = await getUserByEmail(email);

    if (!user) {
      return {
        isValid: false,
        status: 'not-found',
      };
    }

    const issues: string[] = [];

    // 检查是否是遗留用户
    if (user.authProvider === 'legacy') {
      return {
        isValid: false,
        status: 'legacy',
        user,
        issues: ['用户尚未迁移到Firebase认证系统'],
      };
    }

    // 检查Firebase UID
    if (!user.firebaseUid) {
      issues.push('缺少Firebase UID');
    } else {
      // 验证Firebase用户是否存在
      try {
        const firebaseUser = await firebaseAdmin.getUser(user.firebaseUid);

        if (firebaseUser.email !== user.email) {
          issues.push('Firebase邮箱与数据库邮箱不匹配');
        }
      } catch (error) {
        issues.push('Firebase用户不存在或无法访问');
      }
    }

    return {
      isValid: issues.length === 0,
      status: issues.length === 0 ? 'migrated' : 'firebase-only',
      user,
      issues: issues.length > 0 ? issues : undefined,
    };
  } catch (error: any) {
    return {
      isValid: false,
      status: 'not-found',
      issues: [`验证过程中发生错误: ${error.message}`],
    };
  }
}

/**
 * 获取迁移统计信息
 */
export async function getMigrationStats(): Promise<{
  total: number;
  migrated: number;
  legacy: number;
  firebase: number;
  guest: number;
}> {
  // 这里需要从数据库查询统计信息
  // 暂时返回模拟数据，实际实现需要真实的数据库查询
  return {
    total: 0,
    migrated: 0,
    legacy: 0,
    firebase: 0,
    guest: 0,
  };
}

/**
 * 清理迁移数据
 */
export async function cleanupMigrationData(): Promise<{
  cleaned: number;
  errors: string[];
}> {
  // 这里可以实现清理逻辑，比如删除重复记录、修复数据不一致等
  return {
    cleaned: 0,
    errors: [],
  };
}

/**
 * 生成迁移报告
 */
export async function generateMigrationReport(): Promise<{
  timestamp: Date;
  stats: Awaited<ReturnType<typeof getMigrationStats>>;
  issues: string[];
  recommendations: string[];
}> {
  const stats = await getMigrationStats();
  const issues: string[] = [];
  const recommendations: string[] = [];

  // 分析迁移状态并生成建议
  if (stats.legacy > 0) {
    issues.push(`还有 ${stats.legacy} 个遗留用户未迁移`);
    recommendations.push('建议通知这些用户完成账户迁移');
  }

  if (stats.total === 0) {
    issues.push('没有找到任何用户数据');
    recommendations.push('请检查数据库连接和用户表');
  }

  return {
    timestamp: new Date(),
    stats,
    issues,
    recommendations,
  };
}
