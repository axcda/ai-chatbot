/**
 * T019: 邀请码验证逻辑
 * Invite code validation and management
 */

/**
 * 获取有效的邀请码列表
 */
export function getValidInviteCodes(): string[] {
  const codes = process.env.INVITE_CODES;
  if (!codes) {
    console.warn('INVITE_CODES environment variable is not set');
    return [];
  }

  return codes
    .split(',')
    .map((code) => code.trim())
    .filter((code) => code.length > 0);
}

/**
 * 验证邀请码是否有效
 */
export function validateInviteCode(code: string): {
  valid: boolean;
  error?: string;
} {
  // 基本格式验证
  if (!code || typeof code !== 'string') {
    return {
      valid: false,
      error: '邀请码不能为空',
    };
  }

  // 长度验证
  if (code.length < 2 || code.length > 50) {
    return {
      valid: false,
      error: '邀请码长度必须在2-50个字符之间',
    };
  }

  // 字符验证
  if (!/^[a-zA-Z0-9-_]+$/.test(code)) {
    return {
      valid: false,
      error: '邀请码只能包含字母、数字、横线和下划线',
    };
  }

  // 检查是否在有效列表中
  const validCodes = getValidInviteCodes();
  if (validCodes.length === 0) {
    console.error('No valid invite codes configured');
    return {
      valid: false,
      error: '邀请码系统暂时不可用',
    };
  }

  if (!validCodes.includes(code)) {
    return {
      valid: false,
      error: '邀请码无效',
    };
  }

  return {
    valid: true,
  };
}

/**
 * 生成邀请码验证响应
 */
export function createInviteValidationResponse(code: string): {
  valid: boolean;
  inviteCode?: string;
  error?: string;
  code?: string;
} {
  const validation = validateInviteCode(code);

  if (validation.valid) {
    return {
      valid: true,
      inviteCode: code,
    };
  }

  return {
    valid: false,
    error: validation.error,
    code: 'INVALID_INVITE_CODE',
  };
}

/**
 * 检查邀请码是否已被特定用户使用
 * 注意：这个函数需要数据库查询，应该在 API 层调用
 */
export async function checkInviteCodeUsage(
  code: string,
  userIdentifier: string,
  checkType: 'email' | 'firebaseUid' = 'firebaseUid',
): Promise<{
  used: boolean;
  error?: string;
}> {
  try {
    // 这里应该调用数据库查询函数
    // 由于依赖注入的考虑，我们将在 API 层实现具体的数据库查询
    console.log(
      `Checking invite code usage: ${code} for ${checkType}: ${userIdentifier}`,
    );

    // 暂时返回未使用，实际实现应该查询数据库
    return {
      used: false,
    };
  } catch (error) {
    console.error('Error checking invite code usage:', error);
    return {
      used: false,
      error: '无法检查邀请码使用状态',
    };
  }
}

/**
 * 邀请码使用限制检查
 */
export function checkInviteCodeLimits(code: string): {
  allowed: boolean;
  error?: string;
} {
  // 基本限制检查
  // 这里可以扩展为更复杂的限制逻辑，比如：
  // - 每个邀请码的使用次数限制
  // - 时间限制
  // - IP限制等

  // 目前只做基本验证
  const validation = validateInviteCode(code);
  if (!validation.valid) {
    return {
      allowed: false,
      error: validation.error,
    };
  }

  return {
    allowed: true,
  };
}

/**
 * 获取邀请码统计信息
 */
export function getInviteCodeStats(): {
  totalCodes: number;
  activeCodes: string[];
} {
  const validCodes = getValidInviteCodes();

  return {
    totalCodes: validCodes.length,
    activeCodes: validCodes,
  };
}

/**
 * 邀请码配置验证
 */
export function validateInviteCodeConfig(): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // 检查环境变量
  if (!process.env.INVITE_CODES) {
    errors.push('INVITE_CODES environment variable is not set');
    return { valid: false, errors, warnings };
  }

  const codes = getValidInviteCodes();

  // 检查是否有有效的邀请码
  if (codes.length === 0) {
    errors.push('No valid invite codes found in INVITE_CODES');
    return { valid: false, errors, warnings };
  }

  // 检查邀请码格式
  codes.forEach((code) => {
    if (code.length < 2 || code.length > 50) {
      warnings.push(`Invite code '${code}' has invalid length`);
    }

    if (!/^[a-zA-Z0-9-_]+$/.test(code)) {
      warnings.push(`Invite code '${code}' contains invalid characters`);
    }
  });

  // 检查重复
  const uniqueCodes = new Set(codes);
  if (uniqueCodes.size !== codes.length) {
    warnings.push('Duplicate invite codes found');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * 邀请码安全辅助函数
 */
export const inviteCodeSecurity = {
  /**
   * 记录邀请码验证尝试（用于安全监控）
   */
  logValidationAttempt(
    code: string,
    success: boolean,
    metadata?: {
      ip?: string;
      userAgent?: string;
      timestamp?: Date;
    },
  ): void {
    const logData = {
      code: `${code.substring(0, 3)}***`, // 部分遮蔽邀请码
      success,
      timestamp: metadata?.timestamp || new Date(),
      ip: metadata?.ip,
      userAgent: metadata?.userAgent,
    };

    console.log('Invite code validation attempt:', logData);
  },

  /**
   * 检测可疑的邀请码尝试
   */
  detectSuspiciousActivity(
    attempts: Array<{
      code: string;
      success: boolean;
      timestamp: Date;
      ip?: string;
    }>,
  ): {
    suspicious: boolean;
    reasons: string[];
  } {
    const reasons: string[] = [];

    // 检查短时间内的大量失败尝试
    const recentAttempts = attempts.filter(
      (attempt) => Date.now() - attempt.timestamp.getTime() < 60000, // 1分钟内
    );

    const failedAttempts = recentAttempts.filter((attempt) => !attempt.success);

    if (failedAttempts.length >= 5) {
      reasons.push('高频率失败尝试');
    }

    // 检查来自同一IP的尝试
    if (recentAttempts.length > 0) {
      const ips = recentAttempts.map((attempt) => attempt.ip).filter(Boolean);
      const uniqueIps = new Set(ips);

      if (ips.length >= 10 && uniqueIps.size === 1) {
        reasons.push('单一IP大量尝试');
      }
    }

    return {
      suspicious: reasons.length > 0,
      reasons,
    };
  },
};

// 导出类型
export interface InviteCodeValidation {
  valid: boolean;
  error?: string;
}

export interface InviteCodeUsageCheck {
  used: boolean;
  error?: string;
}

export interface InviteCodeLimits {
  allowed: boolean;
  error?: string;
}
