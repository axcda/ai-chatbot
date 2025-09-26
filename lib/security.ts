'use server';

/**
 * T042: 安全强化
 * lib/security.ts
 */

import type { NextRequest } from 'next/server';
import crypto from 'node:crypto';
import { env } from './env';
import { logger } from './monitoring';

export interface SecurityConfig {
  maxRequestSize: number;
  rateLimitWindow: number;
  rateLimitMax: number;
  allowedOrigins: string[];
  sessionTimeout: number;
  passwordMinLength: number;
  enableCSRF: boolean;
  enableXSS: boolean;
}

export interface SecurityEvent {
  type:
    | 'rate_limit'
    | 'invalid_token'
    | 'suspicious_activity'
    | 'unauthorized_access';
  severity: 'low' | 'medium' | 'high' | 'critical';
  details: Record<string, any>;
  timestamp: Date;
  ip?: string;
  userAgent?: string;
  userId?: string;
}

/**
 * 默认安全配置
 */
const DEFAULT_SECURITY_CONFIG: SecurityConfig = {
  maxRequestSize: 10 * 1024 * 1024, // 10MB
  rateLimitWindow: 60 * 1000, // 1分钟
  rateLimitMax: 60, // 每分钟60次请求
  allowedOrigins: ['http://localhost:3000', 'https://chat.vercel.ai'],
  sessionTimeout: 24 * 60 * 60 * 1000, // 24小时
  passwordMinLength: 8,
  enableCSRF: true,
  enableXSS: true,
};

/**
 * 安全管理器
 */
export class SecurityManager {
  private config: SecurityConfig;
  private suspiciousIPs = new Set<string>();
  private rateLimitStore = new Map<
    string,
    { count: number; resetTime: number }
  >();
  private securityEvents: SecurityEvent[] = [];

  constructor(config: Partial<SecurityConfig> = {}) {
    this.config = { ...DEFAULT_SECURITY_CONFIG, ...config };
  }

  /**
   * 验证请求安全性
   */
  validateRequest(request: NextRequest): {
    valid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];
    const ip = this.getClientIP(request);

    // 检查请求大小
    const contentLength = request.headers.get('content-length');
    if (
      contentLength &&
      Number.parseInt(contentLength) > this.config.maxRequestSize
    ) {
      errors.push('Request size exceeds maximum allowed');
    }

    // 检查IP是否在黑名单中
    if (this.suspiciousIPs.has(ip)) {
      errors.push('Request from suspicious IP address');
      this.recordSecurityEvent({
        type: 'suspicious_activity',
        severity: 'high',
        details: { reason: 'blacklisted_ip', ip },
        timestamp: new Date(),
        ip,
        userAgent: request.headers.get('user-agent') || undefined,
      });
    }

    // 检查CORS
    const corsValidation = this.validateCORS(request);
    if (!corsValidation.valid) {
      warnings.push(...corsValidation.errors);
    }

    // 检查User-Agent
    const userAgent = request.headers.get('user-agent');
    if (!userAgent || this.isSuspiciousUserAgent(userAgent)) {
      warnings.push('Suspicious or missing User-Agent');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * 应用速率限制
   */
  applyRateLimit(identifier: string): {
    allowed: boolean;
    remaining: number;
    resetTime: number;
  } {
    const now = Date.now();
    const key = `rate_limit:${identifier}`;
    const record = this.rateLimitStore.get(key);

    if (!record || now > record.resetTime) {
      // 重置或创建新记录
      const resetTime = now + this.config.rateLimitWindow;
      this.rateLimitStore.set(key, { count: 1, resetTime });
      return {
        allowed: true,
        remaining: this.config.rateLimitMax - 1,
        resetTime,
      };
    }

    if (record.count >= this.config.rateLimitMax) {
      // 超过速率限制
      this.recordSecurityEvent({
        type: 'rate_limit',
        severity: 'medium',
        details: {
          identifier,
          count: record.count,
          limit: this.config.rateLimitMax,
        },
        timestamp: new Date(),
      });

      return {
        allowed: false,
        remaining: 0,
        resetTime: record.resetTime,
      };
    }

    // 增加计数
    record.count++;
    this.rateLimitStore.set(key, record);

    return {
      allowed: true,
      remaining: this.config.rateLimitMax - record.count,
      resetTime: record.resetTime,
    };
  }

  /**
   * 验证CORS
   */
  validateCORS(request: NextRequest): {
    valid: boolean;
    errors: string[];
  } {
    const origin = request.headers.get('origin');
    const errors: string[] = [];

    if (origin && !this.config.allowedOrigins.includes(origin)) {
      errors.push(`Origin ${origin} not allowed`);
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * 生成CSRF Token
   */
  generateCSRFToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * 验证CSRF Token
   */
  validateCSRFToken(token: string, sessionToken: string): boolean {
    if (!this.config.enableCSRF) {
      return true;
    }

    // 这里可以实现更复杂的CSRF验证逻辑
    return token.length === 64 && /^[a-f0-9]+$/.test(token);
  }

  /**
   * 净化输入内容（防XSS）
   */
  sanitizeInput(input: string): string {
    if (!this.config.enableXSS) {
      return input;
    }

    // 基础XSS防护
    return input
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }

  /**
   * 验证密码强度
   */
  validatePassword(password: string): {
    valid: boolean;
    score: number;
    suggestions: string[];
  } {
    const suggestions: string[] = [];
    let score = 0;

    // 长度检查
    if (password.length < this.config.passwordMinLength) {
      suggestions.push(`密码至少需要${this.config.passwordMinLength}个字符`);
    } else {
      score += 1;
    }

    // 复杂性检查
    if (!/[a-z]/.test(password)) {
      suggestions.push('密码应包含小写字母');
    } else {
      score += 1;
    }

    if (!/[A-Z]/.test(password)) {
      suggestions.push('密码应包含大写字母');
    } else {
      score += 1;
    }

    if (!/\d/.test(password)) {
      suggestions.push('密码应包含数字');
    } else {
      score += 1;
    }

    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      suggestions.push('密码应包含特殊字符');
    } else {
      score += 1;
    }

    // 常见密码检查
    const commonPasswords = ['password', '123456', 'qwerty', 'admin'];
    if (commonPasswords.includes(password.toLowerCase())) {
      suggestions.push('请避免使用常见密码');
      score = Math.max(0, score - 2);
    }

    return {
      valid: score >= 3 && suggestions.length === 0,
      score,
      suggestions,
    };
  }

  /**
   * 检测可疑活动
   */
  detectSuspiciousActivity(
    ip: string,
    userAgent: string,
    actions: string[],
  ): {
    suspicious: boolean;
    reasons: string[];
    riskScore: number;
  } {
    const reasons: string[] = [];
    let riskScore = 0;

    // 检查IP信誉
    if (this.suspiciousIPs.has(ip)) {
      reasons.push('Known suspicious IP');
      riskScore += 50;
    }

    // 检查User-Agent
    if (this.isSuspiciousUserAgent(userAgent)) {
      reasons.push('Suspicious User-Agent');
      riskScore += 30;
    }

    // 检查操作模式
    const recentActions = actions.slice(-10); // 最近10个操作
    if (this.hasUnusualPattern(recentActions)) {
      reasons.push('Unusual activity pattern');
      riskScore += 40;
    }

    // 检查速率
    if (actions.length > 100) {
      // 100个操作在短时间内
      reasons.push('High activity rate');
      riskScore += 20;
    }

    const suspicious = riskScore >= 70;

    if (suspicious) {
      this.recordSecurityEvent({
        type: 'suspicious_activity',
        severity: riskScore >= 90 ? 'critical' : 'high',
        details: { ip, userAgent, actions: recentActions, riskScore },
        timestamp: new Date(),
        ip,
        userAgent,
      });

      // 如果风险分数很高，将IP加入黑名单
      if (riskScore >= 90) {
        this.suspiciousIPs.add(ip);
      }
    }

    return {
      suspicious,
      reasons,
      riskScore,
    };
  }

  /**
   * 获取客户端IP
   */
  private getClientIP(request: NextRequest): string {
    const forwarded = request.headers.get('x-forwarded-for');
    const realIP = request.headers.get('x-real-ip');

    if (forwarded) {
      return forwarded.split(',')[0].trim();
    }

    if (realIP) {
      return realIP;
    }

    return request.ip || '0.0.0.0';
  }

  /**
   * 检查可疑User-Agent
   */
  private isSuspiciousUserAgent(userAgent: string): boolean {
    const suspiciousPatterns = [
      /bot/i,
      /crawler/i,
      /spider/i,
      /scraper/i,
      /curl/i,
      /wget/i,
      /python/i,
      /^$/,
    ];

    return suspiciousPatterns.some((pattern) => pattern.test(userAgent));
  }

  /**
   * 检查异常模式
   */
  private hasUnusualPattern(actions: string[]): boolean {
    // 检查是否有重复的操作
    const actionCounts = actions.reduce(
      (acc, action) => {
        acc[action] = (acc[action] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    // 如果同一个操作重复超过5次，认为可疑
    return Object.values(actionCounts).some((count) => count > 5);
  }

  /**
   * 记录安全事件
   */
  private recordSecurityEvent(event: SecurityEvent): void {
    this.securityEvents.push(event);

    // 记录日志
    logger.warn('Security event detected', {
      type: event.type,
      severity: event.severity,
      details: event.details,
      ip: event.ip,
      userAgent: event.userAgent,
    });

    // 保持最近1000个事件
    if (this.securityEvents.length > 1000) {
      this.securityEvents = this.securityEvents.slice(-1000);
    }

    // 对于严重事件，立即发送警报
    if (event.severity === 'critical') {
      this.sendSecurityAlert(event);
    }
  }

  /**
   * 发送安全警报
   */
  private async sendSecurityAlert(event: SecurityEvent): Promise<void> {
    // 这里可以集成外部警报系统
    logger.error('SECURITY ALERT', event);
  }

  /**
   * 获取安全事件
   */
  getSecurityEvents(limit = 100): SecurityEvent[] {
    return this.securityEvents.slice(-limit);
  }

  /**
   * 清理过期数据
   */
  cleanup(): void {
    const now = Date.now();

    // 清理过期的速率限制记录
    for (const [key, record] of this.rateLimitStore) {
      if (now > record.resetTime) {
        this.rateLimitStore.delete(key);
      }
    }

    // 清理旧的安全事件（保留最近24小时）
    const dayAgo = now - 24 * 60 * 60 * 1000;
    this.securityEvents = this.securityEvents.filter(
      (event) => event.timestamp.getTime() > dayAgo,
    );
  }
}

/**
 * 全局安全管理器
 */
export const securityManager = new SecurityManager();

/**
 * 安全头部助手
 */
export function getSecurityHeaders(): Record<string, string> {
  return {
    // 防止点击劫持
    'X-Frame-Options': 'DENY',

    // XSS保护
    'X-XSS-Protection': '1; mode=block',

    // 内容类型嗅探保护
    'X-Content-Type-Options': 'nosniff',

    // HSTS
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',

    // 引用页策略
    'Referrer-Policy': 'strict-origin-when-cross-origin',

    // 权限策略
    'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',

    // 内容安全策略
    'Content-Security-Policy': [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self'",
      "connect-src 'self' https:",
      "frame-ancestors 'none'",
    ].join('; '),
  };
}

/**
 * 密码哈希工具
 */
const SALT_ROUNDS = 12;

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto
    .pbkdf2Sync(password, salt, 10000, 64, 'sha512')
    .toString('hex');
  return `${salt}:${hash}`;
}

export async function verifyPassword(
  password: string,
  hashedPassword: string,
): Promise<boolean> {
  const [salt, hash] = hashedPassword.split(':');
  const verifyHash = crypto
    .pbkdf2Sync(password, salt, 10000, 64, 'sha512')
    .toString('hex');
  return hash === verifyHash;
}

/**
 * 加密工具
 */
const ALGORITHM = 'aes-256-gcm';
const KEY = crypto.createHash('sha256').update(env.AUTH_SECRET).digest();

export function encrypt(text: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipher(ALGORITHM, KEY);
  cipher.setAAD(Buffer.from('auth'));

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

export function decrypt(encryptedText: string): string {
  const [ivHex, authTagHex, encrypted] = encryptedText.split(':');

  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');

  const decipher = crypto.createDecipher(ALGORITHM, KEY);
  decipher.setAAD(Buffer.from('auth'));
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

// 定期清理安全数据
if (typeof setInterval !== 'undefined') {
  setInterval(
    () => {
      securityManager.cleanup();
    },
    60 * 60 * 1000,
  ); // 每小时清理一次
}
