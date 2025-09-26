/**
 * T026: 邀请码输入组件
 * InviteCodeInput.tsx
 */

'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from '@/components/ui/input-otp';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';

interface InviteCodeInputProps {
  onValidCode: (code: string) => void;
  onError?: (error: string) => void;
  disabled?: boolean;
  showOTP?: boolean; // 是否使用OTP输入组件
}

interface ValidationState {
  loading: boolean;
  error: string | null;
  success: boolean;
}

export default function InviteCodeInput({
  onValidCode,
  onError,
  disabled = false,
  showOTP = false,
}: InviteCodeInputProps) {
  const [code, setCode] = useState('');
  const [validation, setValidation] = useState<ValidationState>({
    loading: false,
    error: null,
    success: false,
  });

  const validateInviteCode = async (inviteCode: string) => {
    if (!inviteCode.trim()) {
      const error = '请输入邀请码';
      setValidation({ loading: false, error, success: false });
      onError?.(error);
      return;
    }

    setValidation({ loading: true, error: null, success: false });

    try {
      const response = await fetch('/api/auth/validate-invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inviteCode: inviteCode.trim(),
        }),
      });

      const data = await response.json();

      if (response.ok && data.valid) {
        setValidation({ loading: false, error: null, success: true });
        onValidCode(inviteCode.trim());
      } else {
        const error = data.error || '邀请码验证失败';
        setValidation({ loading: false, error, success: false });
        onError?.(error);
      }
    } catch (error) {
      const errorMessage = '网络错误，请重试';
      setValidation({ loading: false, error: errorMessage, success: false });
      onError?.(errorMessage);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    validateInviteCode(code);
  };

  const handleOTPComplete = (value: string) => {
    setCode(value);
    if (value.length >= 4) {
      // OTP通常是4-6位，这里设置为4位最小长度
      validateInviteCode(value);
    }
  };

  const renderInput = () => {
    if (showOTP) {
      return (
        <div className="flex justify-center">
          <InputOTP
            maxLength={6}
            value={code}
            onChange={setCode}
            onComplete={handleOTPComplete}
            disabled={disabled || validation.loading}
            data-testid="invite-code-otp"
          >
            <InputOTPGroup>
              <InputOTPSlot index={0} />
              <InputOTPSlot index={1} />
              <InputOTPSlot index={2} />
              <InputOTPSlot index={3} />
              <InputOTPSlot index={4} />
              <InputOTPSlot index={5} />
            </InputOTPGroup>
          </InputOTP>
        </div>
      );
    }

    return (
      <div className="relative">
        <Input
          type="text"
          placeholder="请输入邀请码"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          disabled={disabled || validation.loading}
          data-testid="invite-code-input"
          className={`pr-10 ${
            validation.success
              ? 'border-green-500 focus:border-green-500'
              : validation.error
                ? 'border-red-500 focus:border-red-500'
                : ''
          }`}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleSubmit(e);
            }
          }}
        />
        {validation.loading && (
          <Loader2 className="-translate-y-1/2 absolute top-1/2 right-3 h-4 w-4 animate-spin text-gray-400" />
        )}
        {validation.success && (
          <CheckCircle className="-translate-y-1/2 absolute top-1/2 right-3 h-4 w-4 text-green-500" />
        )}
        {validation.error && !validation.loading && (
          <XCircle className="-translate-y-1/2 absolute top-1/2 right-3 h-4 w-4 text-red-500" />
        )}
      </div>
    );
  };

  return (
    <Card className="mx-auto w-full max-w-md">
      <CardHeader>
        <CardTitle className="text-center">输入邀请码</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          {renderInput()}

          {!showOTP && (
            <Button
              type="submit"
              className="w-full"
              disabled={disabled || validation.loading || !code.trim()}
              data-testid="validate-invite-button"
            >
              {validation.loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  验证中...
                </>
              ) : (
                '验证邀请码'
              )}
            </Button>
          )}
        </form>

        {validation.error && (
          <Alert variant="destructive" data-testid="invite-code-error">
            <XCircle className="h-4 w-4" />
            <AlertDescription>
              {validation.error === '请输入邀请码' ? (
                <span data-testid="invite-code-required-error">
                  {validation.error}
                </span>
              ) : (
                validation.error
              )}
            </AlertDescription>
          </Alert>
        )}

        {validation.success && (
          <Alert
            variant="default"
            className="border-green-500 bg-green-50 text-green-800"
            data-testid="invite-code-valid"
          >
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription>邀请码验证成功！</AlertDescription>
          </Alert>
        )}

        <div className="text-center text-gray-600 text-sm">
          <p>请输入有效的邀请码以继续注册</p>
          <p className="mt-1 text-xs">
            邀请码为2-50个字符，仅支持字母、数字、横线和下划线
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
