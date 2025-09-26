/**
 * T037: 环境变量验证
 * lib/env.ts
 */

import { z } from 'zod';

// 环境变量schema定义
const envSchema = z.object({
  // 基础配置
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),

  // 数据库配置
  POSTGRES_URL: z.string().min(1, 'POSTGRES_URL is required'),

  // Redis配置 (可选)
  REDIS_URL: z.string().optional(),

  // Firebase客户端配置
  NEXT_PUBLIC_FIREBASE_API_KEY: z
    .string()
    .min(1, 'NEXT_PUBLIC_FIREBASE_API_KEY is required'),
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: z
    .string()
    .min(1, 'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN is required'),
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: z
    .string()
    .min(1, 'NEXT_PUBLIC_FIREBASE_PROJECT_ID is required'),
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: z
    .string()
    .min(1, 'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET is required'),
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: z
    .string()
    .min(1, 'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID is required'),
  NEXT_PUBLIC_FIREBASE_APP_ID: z
    .string()
    .min(1, 'NEXT_PUBLIC_FIREBASE_APP_ID is required'),

  // Firebase Admin配置
  FIREBASE_ADMIN_PROJECT_ID: z
    .string()
    .min(1, 'FIREBASE_ADMIN_PROJECT_ID is required'),
  FIREBASE_ADMIN_CLIENT_EMAIL: z
    .string()
    .email('FIREBASE_ADMIN_CLIENT_EMAIL must be a valid email'),
  FIREBASE_ADMIN_PRIVATE_KEY: z
    .string()
    .min(1, 'FIREBASE_ADMIN_PRIVATE_KEY is required'),

  // 邀请码配置
  INVITE_CODES: z.string().min(1, 'INVITE_CODES is required'),

  // AI Gateway配置
  AI_GATEWAY_API_KEY: z.string().min(1, 'AI_GATEWAY_API_KEY is required'),

  // Blob存储配置
  BLOB_READ_WRITE_TOKEN: z.string().min(1, 'BLOB_READ_WRITE_TOKEN is required'),

  // 认证密钥
  AUTH_SECRET: z.string().min(32, 'AUTH_SECRET must be at least 32 characters'),

  // 可选配置
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
  WEBHOOK_SECRET: z.string().optional(),
  ANALYTICS_ID: z.string().optional(),
});

// 从环境变量创建配置对象
function createEnv() {
  const env = {
    NODE_ENV: process.env.NODE_ENV,
    POSTGRES_URL: process.env.POSTGRES_URL,
    REDIS_URL: process.env.REDIS_URL,
    NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN:
      process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    NEXT_PUBLIC_FIREBASE_PROJECT_ID:
      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET:
      process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID:
      process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    NEXT_PUBLIC_FIREBASE_APP_ID: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    FIREBASE_ADMIN_PROJECT_ID: process.env.FIREBASE_ADMIN_PROJECT_ID,
    FIREBASE_ADMIN_CLIENT_EMAIL: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
    FIREBASE_ADMIN_PRIVATE_KEY: process.env.FIREBASE_ADMIN_PRIVATE_KEY,
    INVITE_CODES: process.env.INVITE_CODES,
    AI_GATEWAY_API_KEY: process.env.AI_GATEWAY_API_KEY,
    BLOB_READ_WRITE_TOKEN: process.env.BLOB_READ_WRITE_TOKEN,
    AUTH_SECRET: process.env.AUTH_SECRET,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    WEBHOOK_SECRET: process.env.WEBHOOK_SECRET,
    ANALYTICS_ID: process.env.ANALYTICS_ID,
  };

  try {
    return envSchema.parse(env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.errors.map((err) => {
        return `${err.path.join('.')}: ${err.message}`;
      });

      throw new Error(
        `❌ Invalid environment variables:\n${missingVars.join('\n')}\n\nPlease check your .env.local file and ensure all required variables are set.`,
      );
    }
    throw error;
  }
}

// 验证并导出环境变量
export const env = createEnv();

// 类型定义
export type Env = z.infer<typeof envSchema>;

// 环境检查函数
export function isDevelopment(): boolean {
  return env.NODE_ENV === 'development';
}

export function isProduction(): boolean {
  return env.NODE_ENV === 'production';
}

export function isTest(): boolean {
  return env.NODE_ENV === 'test';
}

// Firebase配置提取器
export function getFirebaseConfig() {
  return {
    apiKey: env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: env.NEXT_PUBLIC_FIREBASE_APP_ID,
  };
}

export function getFirebaseAdminConfig() {
  return {
    projectId: env.FIREBASE_ADMIN_PROJECT_ID,
    clientEmail: env.FIREBASE_ADMIN_CLIENT_EMAIL,
    privateKey: env.FIREBASE_ADMIN_PRIVATE_KEY.replace(/\\n/g, '\n'),
  };
}

// 数据库配置
export function getDatabaseConfig() {
  return {
    url: env.POSTGRES_URL,
    redisUrl: env.REDIS_URL,
  };
}

// 邀请码配置
export function getInviteCodesConfig() {
  return {
    codes: env.INVITE_CODES.split(',')
      .map((code) => code.trim())
      .filter((code) => code.length > 0),
  };
}

// 应用配置
export function getAppConfig() {
  return {
    url: env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    authSecret: env.AUTH_SECRET,
    isDevelopment: isDevelopment(),
    isProduction: isProduction(),
    isTest: isTest(),
  };
}

// 第三方服务配置
export function getServicesConfig() {
  return {
    aiGateway: {
      apiKey: env.AI_GATEWAY_API_KEY,
    },
    blob: {
      token: env.BLOB_READ_WRITE_TOKEN,
    },
    webhook: {
      secret: env.WEBHOOK_SECRET,
    },
    analytics: {
      id: env.ANALYTICS_ID,
    },
  };
}

// 环境变量验证中间件
export function validateEnvironment() {
  try {
    createEnv();
    console.log('✅ Environment variables validated successfully');
    return true;
  } catch (error) {
    console.error(error);
    if (isProduction()) {
      process.exit(1);
    }
    return false;
  }
}

// 运行时环境检查
if (typeof window === 'undefined') {
  // 服务端：验证所有环境变量
  validateEnvironment();
} else {
  // 客户端：只验证公开的环境变量
  const clientEnvSchema = envSchema.pick({
    NODE_ENV: true,
    NEXT_PUBLIC_FIREBASE_API_KEY: true,
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: true,
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: true,
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: true,
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: true,
    NEXT_PUBLIC_FIREBASE_APP_ID: true,
    NEXT_PUBLIC_APP_URL: true,
  });

  try {
    clientEnvSchema.parse({
      NODE_ENV: process.env.NODE_ENV,
      NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN:
        process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      NEXT_PUBLIC_FIREBASE_PROJECT_ID:
        process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET:
        process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID:
        process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      NEXT_PUBLIC_FIREBASE_APP_ID: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    });
  } catch (error) {
    console.warn(
      '⚠️ Some client environment variables are missing, but the app can still function',
    );
  }
}
