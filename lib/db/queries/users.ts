/**
 * T014: 用户查询函数
 * Database queries for user operations
 */

import { db } from '../index';
import { user, type User } from '../schema';
import { eq, and, or } from 'drizzle-orm';
import type { CreateUser, UpdateUser } from '../validations';

/**
 * 根据邮箱获取用户
 */
export async function getUserByEmail(email: string): Promise<User | null> {
  try {
    const result = await db
      .select()
      .from(user)
      .where(eq(user.email, email))
      .limit(1);
    return result[0] || null;
  } catch (error) {
    console.error('Error getting user by email:', error);
    throw error;
  }
}

/**
 * 根据Firebase UID获取用户
 */
export async function getUserByFirebaseUid(
  firebaseUid: string,
): Promise<User | null> {
  try {
    const result = await db
      .select()
      .from(user)
      .where(eq(user.firebaseUid, firebaseUid))
      .limit(1);
    return result[0] || null;
  } catch (error) {
    console.error('Error getting user by Firebase UID:', error);
    throw error;
  }
}

/**
 * 根据ID获取用户
 */
export async function getUserById(id: string): Promise<User | null> {
  try {
    const result = await db.select().from(user).where(eq(user.id, id)).limit(1);
    return result[0] || null;
  } catch (error) {
    console.error('Error getting user by ID:', error);
    throw error;
  }
}

/**
 * 检查用户是否存在（通过邮箱或Firebase UID）
 */
export async function userExists(
  email: string,
  firebaseUid?: string,
): Promise<boolean> {
  try {
    const conditions = [eq(user.email, email)];
    if (firebaseUid) {
      conditions.push(eq(user.firebaseUid, firebaseUid));
    }

    const result = await db
      .select({ id: user.id })
      .from(user)
      .where(or(...conditions))
      .limit(1);
    return result.length > 0;
  } catch (error) {
    console.error('Error checking if user exists:', error);
    throw error;
  }
}

/**
 * 创建新用户
 */
export async function createUser(
  userData: CreateUser & { email: string },
): Promise<User> {
  try {
    const result = await db
      .insert(user)
      .values({
        email: userData.email,
        firebaseUid: userData.firebaseUid,
        displayName: userData.displayName,
        avatarUrl: userData.avatarUrl,
        authProvider: 'firebase',
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    return result[0];
  } catch (error) {
    console.error('Error creating user:', error);
    throw error;
  }
}

/**
 * 更新用户信息
 */
export async function updateUser(
  id: string,
  userData: Partial<UpdateUser>,
): Promise<User | null> {
  try {
    const result = await db
      .update(user)
      .set({
        ...userData,
        updatedAt: new Date(),
      })
      .where(eq(user.id, id))
      .returning();

    return result[0] || null;
  } catch (error) {
    console.error('Error updating user:', error);
    throw error;
  }
}

/**
 * 根据Firebase UID更新用户信息
 */
export async function updateUserByFirebaseUid(
  firebaseUid: string,
  userData: Partial<UpdateUser>,
): Promise<User | null> {
  try {
    const result = await db
      .update(user)
      .set({
        ...userData,
        updatedAt: new Date(),
      })
      .where(eq(user.firebaseUid, firebaseUid))
      .returning();

    return result[0] || null;
  } catch (error) {
    console.error('Error updating user by Firebase UID:', error);
    throw error;
  }
}

/**
 * 迁移用户：为现有用户添加Firebase UID
 */
export async function migrateUserToFirebase(
  email: string,
  firebaseUid: string,
): Promise<User | null> {
  try {
    const result = await db
      .update(user)
      .set({
        firebaseUid,
        authProvider: 'firebase',
        updatedAt: new Date(),
      })
      .where(and(eq(user.email, email), eq(user.authProvider, 'legacy')))
      .returning();

    return result[0] || null;
  } catch (error) {
    console.error('Error migrating user to Firebase:', error);
    throw error;
  }
}

/**
 * 获取需要迁移的遗留用户
 */
export async function getLegacyUser(email: string): Promise<User | null> {
  try {
    const result = await db
      .select()
      .from(user)
      .where(and(eq(user.email, email), eq(user.authProvider, 'legacy')))
      .limit(1);

    return result[0] || null;
  } catch (error) {
    console.error('Error getting legacy user:', error);
    throw error;
  }
}

/**
 * 删除用户
 */
export async function deleteUser(id: string): Promise<boolean> {
  try {
    const result = await db.delete(user).where(eq(user.id, id)).returning();
    return result.length > 0;
  } catch (error) {
    console.error('Error deleting user:', error);
    throw error;
  }
}
