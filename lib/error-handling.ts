/**
 * T040: 错误处理改进
 * lib/error-handling.ts
 */

import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

export enum ErrorCode {
  // 认证错误
  AUTHENTICATION_FAILED = 'AUTHENTICATION_FAILED',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  TOKEN_INVALID = 'TOKEN_INVALID',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',

  // 验证错误
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_REQUEST_BODY = 'INVALID_REQUEST_BODY',
  INVALID_PARAMETERS = 'INVALID_PARAMETERS',
  MISSING_REQUIRED_FIELDS = 'MISSING_REQUIRED_FIELDS',

  // 业务逻辑错误
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  USER_EXISTS = 'USER_EXISTS',
  USER_ALREADY_MIGRATED = 'USER_ALREADY_MIGRATED',
  INVITE_CODE_INVALID = 'INVITE_CODE_INVALID',
  INVITE_CODE_ALREADY_USED = 'INVITE_CODE_ALREADY_USED',
  EMAIL_MISMATCH = 'EMAIL_MISMATCH',
  FIREBASE_UID_MISMATCH = 'FIREBASE_UID_MISMATCH',

  // 系统错误
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  FIREBASE_ERROR = 'FIREBASE_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',

  // 速率限制错误
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  TOO_MANY_REQUESTS = 'TOO_MANY_REQUESTS',

  // 其他错误
  NOT_FOUND = 'NOT_FOUND',
  METHOD_NOT_ALLOWED = 'METHOD_NOT_ALLOWED',
  UNSUPPORTED_MEDIA_TYPE = 'UNSUPPORTED_MEDIA_TYPE',
}

export interface ErrorDetails {
  message: string;
  code: ErrorCode;
  statusCode: number;
  details?: any;
  timestamp?: Date;
  requestId?: string;
  userId?: string;
}

/**
 * 应用程序错误基类
 */
export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly details?: any;
  public readonly timestamp: Date;
  public readonly requestId?: string;
  public readonly userId?: string;

  constructor(
    message: string,
    code: ErrorCode,
    statusCode = 500,
    details?: any,
    requestId?: string,
    userId?: string,
  ) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    this.timestamp = new Date();
    this.requestId = requestId;
    this.userId = userId;

    // 确保堆栈跟踪正确显示
    Error.captureStackTrace(this, AppError);
  }

  /**
   * 转换为API响应格式
   */
  toResponse(): NextResponse {
    return NextResponse.json(
      {
        error: this.message,
        code: this.code,
        timestamp: this.timestamp.toISOString(),
        requestId: this.requestId,
        ...(this.details && { details: this.details }),
      },
      { status: this.statusCode },
    );
  }

  /**
   * 转换为日志格式
   */
  toLogFormat(): object {
    return {
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      details: this.details,
      timestamp: this.timestamp.toISOString(),
      requestId: this.requestId,
      userId: this.userId,
      stack: this.stack,
    };
  }
}

/**
 * 认证错误
 */
export class AuthenticationError extends AppError {
  constructor(
    message = '认证失败',
    details?: any,
    requestId?: string,
    userId?: string,
  ) {
    super(
      message,
      ErrorCode.AUTHENTICATION_FAILED,
      401,
      details,
      requestId,
      userId,
    );
  }
}

/**
 * 授权错误
 */
export class AuthorizationError extends AppError {
  constructor(
    message = '权限不足',
    details?: any,
    requestId?: string,
    userId?: string,
  ) {
    super(message, ErrorCode.FORBIDDEN, 403, details, requestId, userId);
  }
}

/**
 * 验证错误
 */
export class ValidationError extends AppError {
  constructor(
    message = '输入数据无效',
    details?: any,
    requestId?: string,
    userId?: string,
  ) {
    super(message, ErrorCode.VALIDATION_ERROR, 400, details, requestId, userId);
  }
}

/**
 * 业务逻辑错误
 */
export class BusinessError extends AppError {
  constructor(
    message: string,
    code: ErrorCode,
    statusCode = 400,
    details?: any,
    requestId?: string,
    userId?: string,
  ) {
    super(message, code, statusCode, details, requestId, userId);
  }
}

/**
 * 系统错误
 */
export class SystemError extends AppError {
  constructor(
    message = '系统内部错误',
    details?: any,
    requestId?: string,
    userId?: string,
  ) {
    super(
      message,
      ErrorCode.INTERNAL_SERVER_ERROR,
      500,
      details,
      requestId,
      userId,
    );
  }
}

/**
 * 错误处理器类
 */
export class ErrorHandler {
  private static instance: ErrorHandler;

  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  /**
   * 处理API错误
   */
  handleApiError(
    error: unknown,
    requestId?: string,
    userId?: string,
  ): NextResponse {
    // 如果已经是AppError，直接返回响应
    if (error instanceof AppError) {
      this.logError(error);
      return error.toResponse();
    }

    // 处理Zod验证错误
    if (error instanceof ZodError) {
      const validationError = new ValidationError(
        '请求数据格式错误',
        {
          issues: error.errors.map((issue) => ({
            path: issue.path.join('.'),
            message: issue.message,
            code: issue.code,
          })),
        },
        requestId,
        userId,
      );
      this.logError(validationError);
      return validationError.toResponse();
    }

    // 处理其他类型的错误
    const systemError = this.createSystemError(error, requestId, userId);
    this.logError(systemError);
    return systemError.toResponse();
  }

  /**
   * 记录错误日志
   */
  private logError(error: AppError): void {
    const logData = error.toLogFormat();

    // 根据错误严重程度选择日志级别
    if (error.statusCode >= 500) {
      console.error('System Error:', logData);
    } else if (error.statusCode >= 400) {
      console.warn('Client Error:', logData);
    } else {
      console.info('Info:', logData);
    }

    // 在生产环境中，这里可以发送到外部日志服务
    if (process.env.NODE_ENV === 'production') {
      this.sendToLogService(logData);
    }
  }

  /**
   * 发送到外部日志服务
   */
  private sendToLogService(logData: object): void {
    // 这里可以集成外部日志服务，如 Sentry、LogRocket 等
    // 例如：Sentry.captureException(error);
  }

  /**
   * 创建系统错误
   */
  private createSystemError(
    error: unknown,
    requestId?: string,
    userId?: string,
  ): SystemError {
    let message = '系统内部错误';
    let details: any = undefined;

    if (error instanceof Error) {
      message = error.message || message;
      details = {
        name: error.name,
        stack: error.stack,
      };

      // 识别特定类型的错误
      if (
        error.message.includes('database') ||
        error.message.includes('connection')
      ) {
        return new AppError(
          '数据库连接错误',
          ErrorCode.DATABASE_ERROR,
          503,
          details,
          requestId,
          userId,
        );
      }

      if (
        error.message.includes('firebase') ||
        error.message.includes('auth')
      ) {
        return new AppError(
          'Firebase服务错误',
          ErrorCode.FIREBASE_ERROR,
          503,
          details,
          requestId,
          userId,
        );
      }

      if (
        error.message.includes('network') ||
        error.message.includes('timeout')
      ) {
        return new AppError(
          '网络连接错误',
          ErrorCode.NETWORK_ERROR,
          503,
          details,
          requestId,
          userId,
        );
      }
    }

    return new SystemError(message, details, requestId, userId);
  }
}

/**
 * 全局错误处理器实例
 */
export const errorHandler = ErrorHandler.getInstance();

/**
 * 错误处理中间件助手
 */
export function withErrorHandling<T extends (...args: any[]) => any>(
  fn: T,
  requestId?: string,
  userId?: string,
): T {
  return (async (...args: any[]) => {
    try {
      return await fn(...args);
    } catch (error) {
      throw errorHandler.handleApiError(error, requestId, userId);
    }
  }) as any;
}

/**
 * 快速创建常见错误的工厂函数
 */
export const createError = {
  authentication: (
    message?: string,
    details?: any,
    requestId?: string,
    userId?: string,
  ) => new AuthenticationError(message, details, requestId, userId),

  authorization: (
    message?: string,
    details?: any,
    requestId?: string,
    userId?: string,
  ) => new AuthorizationError(message, details, requestId, userId),

  validation: (
    message?: string,
    details?: any,
    requestId?: string,
    userId?: string,
  ) => new ValidationError(message, details, requestId, userId),

  business: (
    message: string,
    code: ErrorCode,
    statusCode?: number,
    details?: any,
    requestId?: string,
    userId?: string,
  ) => new BusinessError(message, code, statusCode, details, requestId, userId),

  system: (
    message?: string,
    details?: any,
    requestId?: string,
    userId?: string,
  ) => new SystemError(message, details, requestId, userId),

  userNotFound: (requestId?: string, userId?: string) =>
    new BusinessError(
      '用户不存在',
      ErrorCode.USER_NOT_FOUND,
      404,
      undefined,
      requestId,
      userId,
    ),

  userExists: (requestId?: string, userId?: string) =>
    new BusinessError(
      '用户已存在',
      ErrorCode.USER_EXISTS,
      409,
      undefined,
      requestId,
      userId,
    ),

  invalidInviteCode: (requestId?: string, userId?: string) =>
    new BusinessError(
      '邀请码无效',
      ErrorCode.INVITE_CODE_INVALID,
      400,
      undefined,
      requestId,
      userId,
    ),

  rateLimitExceeded: (requestId?: string, userId?: string) =>
    new AppError(
      '请求频率超过限制',
      ErrorCode.RATE_LIMIT_EXCEEDED,
      429,
      undefined,
      requestId,
      userId,
    ),
};

/**
 * 错误边界组件助手
 */
export function createErrorBoundary() {
  return {
    getDerivedStateFromError: (error: Error) => {
      return { hasError: true, error };
    },

    componentDidCatch: (error: Error, errorInfo: any) => {
      console.error('Error Boundary caught an error:', error, errorInfo);

      // 发送错误报告
      if (process.env.NODE_ENV === 'production') {
        errorHandler.handleApiError(error);
      }
    },
  };
}
