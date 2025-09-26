/**
 * T031: 注册页面
 * app/(auth)/register/page.tsx
 */

'use client';

import React, { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import InviteCodeInput from '@/components/auth/InviteCodeInput';
import RegisterForm from '@/components/auth/RegisterForm';
import AuthGuard from '@/components/auth/AuthGuard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface RegistrationState {
  step: 'invite' | 'register' | 'success';
  inviteCode: string | null;
  error: string | null;
}

export default function RegisterPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [state, setState] = useState<RegistrationState>({
    step: 'invite',
    inviteCode: null,
    error: null,
  });

  // 处理邀请码验证成功
  const handleInviteCodeValid = (code: string) => {
    setState((prev) => ({
      ...prev,
      step: 'register',
      inviteCode: code,
      error: null,
    }));
  };

  // 处理邀请码验证错误
  const handleInviteCodeError = (error: string) => {
    setState((prev) => ({
      ...prev,
      error,
    }));
  };

  // 处理注册成功
  const handleRegistrationSuccess = (user: any) => {
    setState((prev) => ({
      ...prev,
      step: 'success',
      error: null,
    }));

    // 延迟跳转到聊天页面
    setTimeout(() => {
      const redirect = searchParams.get('redirect') || '/chat';
      router.push(redirect);
    }, 2000);
  };

  // 处理注册错误
  const handleRegistrationError = (error: string) => {
    setState((prev) => ({
      ...prev,
      error,
    }));
  };

  // 返回上一步
  const handleGoBack = () => {
    setState((prev) => ({
      ...prev,
      step: 'invite',
      inviteCode: null,
      error: null,
    }));
  };

  return (
    <AuthGuard requireAuth={false}>
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
        <div className="w-full max-w-md space-y-8">
          {/* 页面标题 */}
          <div className="text-center">
            <h1 className="font-bold text-3xl text-gray-900">
              {state.step === 'invite' && '验证邀请码'}
              {state.step === 'register' && '创建账户'}
              {state.step === 'success' && '注册成功'}
            </h1>
            <p className="mt-2 text-gray-600">
              {state.step === 'invite' && '请输入您的邀请码以开始注册'}
              {state.step === 'register' && '填写以下信息来创建您的账户'}
              {state.step === 'success' && '欢迎加入！正在为您跳转...'}
            </p>
          </div>

          {/* 步骤指示器 */}
          <div className="flex justify-center">
            <div className="flex items-center space-x-4">
              {/* 步骤1：邀请码 */}
              <div className="flex items-center">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full font-medium text-sm ${
                    state.step === 'invite'
                      ? 'bg-blue-500 text-white'
                      : state.inviteCode
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-300 text-gray-600'
                  }`}
                >
                  {state.inviteCode ? '✓' : '1'}
                </div>
                <span className="ml-2 text-gray-600 text-sm">验证邀请码</span>
              </div>

              {/* 连接线 */}
              <div className="h-0.5 w-12 bg-gray-300" />

              {/* 步骤2：注册 */}
              <div className="flex items-center">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full font-medium text-sm ${
                    state.step === 'register'
                      ? 'bg-blue-500 text-white'
                      : state.step === 'success'
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-300 text-gray-600'
                  }`}
                >
                  {state.step === 'success' ? '✓' : '2'}
                </div>
                <span className="ml-2 text-gray-600 text-sm">创建账户</span>
              </div>
            </div>
          </div>

          {/* 全局错误提示 */}
          {state.error && (
            <Alert variant="destructive">
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          )}

          {/* 步骤内容 */}
          {state.step === 'invite' && (
            <InviteCodeInput
              onValidCode={handleInviteCodeValid}
              onError={handleInviteCodeError}
            />
          )}

          {state.step === 'register' && (
            <div className="space-y-4">
              {/* 返回按钮 */}
              <Button variant="ghost" onClick={handleGoBack} className="mb-4">
                <ArrowLeft className="mr-2 h-4 w-4" />
                返回修改邀请码
              </Button>

              {state.inviteCode && (
                <RegisterForm
                  inviteCode={state.inviteCode}
                  onSuccess={handleRegistrationSuccess}
                  onError={handleRegistrationError}
                />
              )}
            </div>
          )}

          {state.step === 'success' && (
            <Card className="mx-auto w-full max-w-md">
              <CardHeader>
                <CardTitle className="text-center text-green-600">
                  <CheckCircle className="mx-auto mb-4 h-16 w-16" />
                  注册成功！
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-center">
                <p className="text-gray-600">
                  您的账户已成功创建。正在为您跳转到主页面...
                </p>
                <div className="mx-auto h-8 w-8 animate-spin rounded-full border-blue-500 border-b-2" />
              </CardContent>
            </Card>
          )}

          {/* 登录链接 */}
          {state.step !== 'success' && (
            <div className="text-center">
              <p className="text-gray-600">
                已有账户？
                <a
                  href="/login"
                  className="ml-1 font-medium text-blue-600 hover:underline"
                >
                  立即登录
                </a>
              </p>
            </div>
          )}

          {/* 帮助链接 */}
          <div className="text-center text-gray-500 text-sm">
            <p>
              需要帮助？
              <a href="/help" className="ml-1 text-blue-600 hover:underline">
                联系客服
              </a>
            </p>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
