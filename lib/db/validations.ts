/**
 * T016: 数据验证 schema
 * Zod schemas for data validation
 */

import { z } from 'zod';

// 用户数据验证
export const userSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email().max(64),
  password: z.string().optional(),
  firebaseUid: z.string().max(128).optional(),
  authProvider: z.enum(['firebase', 'legacy', 'guest']).default('firebase'),
  displayName: z.string().max(100).optional(),
  avatarUrl: z.string().url().optional().or(z.literal('')).or(z.null()),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const createUserSchema = userSchema
  .pick({
    email: true,
    firebaseUid: true,
    displayName: true,
    avatarUrl: true,
  })
  .extend({
    firebaseUid: z.string().min(1).max(128),
  });

export const updateUserSchema = userSchema.partial().extend({
  id: z.string().uuid(),
  updatedAt: z.date().default(() => new Date()),
});

// 邀请码验证
export const inviteCodeSchema = z.object({
  code: z
    .string()
    .min(2, '邀请码至少2个字符')
    .max(50, '邀请码最多50个字符')
    .regex(/^[a-zA-Z0-9-_]+$/, '邀请码只能包含字母、数字、横线和下划线'),
});

export const inviteCodeUsageSchema = z.object({
  id: z.string().uuid(),
  code: z.string().max(50),
  usedBy: z.string().max(128),
  userEmail: z.string().email(),
  usedAt: z.date(),
  ipAddress: z.string().ip().optional(),
  userAgent: z.string().optional(),
});

// API请求验证schemas
export const validateInviteRequestSchema = z.object({
  inviteCode: z.string().min(1).max(50),
});

export const registerRequestSchema = z.object({
  email: z.string().email().max(64),
  inviteCode: z.string().min(1).max(50),
  firebaseUid: z.string().min(1).max(128),
  displayName: z.string().max(100).optional(),
  avatarUrl: z.string().url().optional(),
});

export const migrateUserRequestSchema = z.object({
  email: z.string().email().max(64),
  firebaseUid: z.string().min(1).max(128),
});

export const syncUserRequestSchema = z.object({
  firebaseUid: z.string().min(1).max(128),
  userData: z
    .object({
      displayName: z.string().max(100).optional(),
      photoURL: z.string().url().optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: '至少需要提供一个要更新的字段',
    }),
});

// 类型导出
export type User = z.infer<typeof userSchema>;
export type CreateUser = z.infer<typeof createUserSchema>;
export type UpdateUser = z.infer<typeof updateUserSchema>;
export type InviteCode = z.infer<typeof inviteCodeSchema>;
export type InviteCodeUsage = z.infer<typeof inviteCodeUsageSchema>;
export type ValidateInviteRequest = z.infer<typeof validateInviteRequestSchema>;
export type RegisterRequest = z.infer<typeof registerRequestSchema>;
export type MigrateUserRequest = z.infer<typeof migrateUserRequestSchema>;
export type SyncUserRequest = z.infer<typeof syncUserRequestSchema>;
