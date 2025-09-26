/**
 * T015: 邀请码使用记录查询函数
 * Database queries for invite code usage operations
 */

import { db } from '../index';
import { inviteCodeUsage, type InviteCodeUsage } from '../schema';
import { eq, and, desc } from 'drizzle-orm';

/**
 * 记录邀请码使用
 */
export async function recordInviteCodeUsage(
  code: string,
  usedBy: string,
  userEmail: string,
  ipAddress?: string,
  userAgent?: string,
): Promise<InviteCodeUsage> {
  try {
    const result = await db
      .insert(inviteCodeUsage)
      .values({
        code,
        usedBy,
        userEmail,
        usedAt: new Date(),
        ipAddress,
        userAgent,
      })
      .returning();

    return result[0];
  } catch (error) {
    console.error('Error recording invite code usage:', error);
    throw error;
  }
}

/**
 * 检查邀请码是否已被使用（通过Firebase UID）
 */
export async function isInviteCodeUsedBy(
  code: string,
  firebaseUid: string,
): Promise<boolean> {
  try {
    const result = await db
      .select({ id: inviteCodeUsage.id })
      .from(inviteCodeUsage)
      .where(
        and(
          eq(inviteCodeUsage.code, code),
          eq(inviteCodeUsage.usedBy, firebaseUid),
        ),
      )
      .limit(1);

    return result.length > 0;
  } catch (error) {
    console.error('Error checking if invite code is used:', error);
    throw error;
  }
}

/**
 * 检查邀请码是否已被使用（通过邮箱）
 */
export async function isInviteCodeUsedByEmail(
  code: string,
  email: string,
): Promise<boolean> {
  try {
    const result = await db
      .select({ id: inviteCodeUsage.id })
      .from(inviteCodeUsage)
      .where(
        and(
          eq(inviteCodeUsage.code, code),
          eq(inviteCodeUsage.userEmail, email),
        ),
      )
      .limit(1);

    return result.length > 0;
  } catch (error) {
    console.error('Error checking if invite code is used by email:', error);
    throw error;
  }
}

/**
 * 获取用户使用的邀请码记录
 */
export async function getInviteCodeUsageByUser(
  firebaseUid: string,
): Promise<InviteCodeUsage[]> {
  try {
    const result = await db
      .select()
      .from(inviteCodeUsage)
      .where(eq(inviteCodeUsage.usedBy, firebaseUid))
      .orderBy(desc(inviteCodeUsage.usedAt));

    return result;
  } catch (error) {
    console.error('Error getting invite code usage by user:', error);
    throw error;
  }
}

/**
 * 获取特定邀请码的使用记录
 */
export async function getInviteCodeUsageByCode(
  code: string,
): Promise<InviteCodeUsage[]> {
  try {
    const result = await db
      .select()
      .from(inviteCodeUsage)
      .where(eq(inviteCodeUsage.code, code))
      .orderBy(desc(inviteCodeUsage.usedAt));

    return result;
  } catch (error) {
    console.error('Error getting invite code usage by code:', error);
    throw error;
  }
}

/**
 * 获取邀请码使用统计
 */
export async function getInviteCodeStats(code: string): Promise<{
  totalUsages: number;
  lastUsedAt?: Date;
  uniqueUsers: number;
}> {
  try {
    const usageRecords = await getInviteCodeUsageByCode(code);

    const totalUsages = usageRecords.length;
    const lastUsedAt =
      usageRecords.length > 0 ? usageRecords[0].usedAt : undefined;
    const uniqueUsers = new Set(usageRecords.map((record) => record.usedBy))
      .size;

    return {
      totalUsages,
      lastUsedAt,
      uniqueUsers,
    };
  } catch (error) {
    console.error('Error getting invite code stats:', error);
    throw error;
  }
}

/**
 * 删除邀请码使用记录（管理功能）
 */
export async function deleteInviteCodeUsage(id: string): Promise<boolean> {
  try {
    const result = await db
      .delete(inviteCodeUsage)
      .where(eq(inviteCodeUsage.id, id))
      .returning();

    return result.length > 0;
  } catch (error) {
    console.error('Error deleting invite code usage:', error);
    throw error;
  }
}

/**
 * 获取用户是否使用过任何邀请码
 */
export async function hasUserUsedAnyInviteCode(
  firebaseUid: string,
): Promise<boolean> {
  try {
    const result = await db
      .select({ id: inviteCodeUsage.id })
      .from(inviteCodeUsage)
      .where(eq(inviteCodeUsage.usedBy, firebaseUid))
      .limit(1);

    return result.length > 0;
  } catch (error) {
    console.error('Error checking if user used any invite code:', error);
    throw error;
  }
}
