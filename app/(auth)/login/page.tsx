/**
 * T032: 登录页面
 * app/(auth)/login/page.tsx
 */

'use client';

import React, { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import LoginForm from '@/components/auth/LoginForm';
import AuthGuard from '@/components/auth/AuthGuard';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { ArrowRight, AlertTriangle, Info } from 'lucide-react';

interface LoginState {
  error: string | null;
  migrationEmail: string | null;
  showMigrationInfo: boolean;
}

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [state, setState] = useState<LoginState>({
    error: null,
    migrationEmail: null,
    showMigrationInfo: false,
  });

  // 处理登录成功
  const handleLoginSuccess = (user: any) => {
    const redirect = searchParams.get('redirect') || '/chat';
    router.push(redirect);
  };

  // 处理登录错误
  const handleLoginError = (error: string) => {
    setState((prev) => ({
      ...prev,
      error,
      showMigrationInfo: false,
    }));
  };

  // 处理账户迁移需求
  const handleMigrationNeeded = (email: string) => {
    setState((prev) => ({
      ...prev,
      migrationEmail: email,
      showMigrationInfo: true,
      error: null,
    }));
  };

  // 前往迁移页面
  const handleGoToMigration = () => {
    const migrationUrl = `/migrate?email=${encodeURIComponent(state.migrationEmail || '')}`;
    router.push(migrationUrl);
  };

  // 清除迁移提示
  const handleDismissMigration = () => {
    setState((prev) => ({
      ...prev,
      showMigrationInfo: false,
      migrationEmail: null,
    }));
  };

  return (
    <AuthGuard requireAuth={false}>
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
        <div className="w-full max-w-md space-y-8">
          {/* 页面标题 */}
          <div className="text-center">
            <h1 className="font-bold text-3xl text-gray-900">欢迎回来</h1>
            <p className="mt-2 text-gray-600">请登录您的账户</p>
          </div>

          {/* 重定向提示 */}
          {searchParams.get('redirect') && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>请先登录以访问您要查看的页面</AlertDescription>
            </Alert>
          )}

          {/* 全局错误提示 */}
          {state.error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          )}

          {/* 账户迁移提示 */}
          {state.showMigrationInfo && (
            <Alert className="border-blue-200 bg-blue-50">
              <Info className="h-4 w-4 text-blue-600" />
              <AlertDescription>
                <div className="space-y-3">
                  <p className="text-blue-800">
                    检测到您的账户 <strong>{state.migrationEmail}</strong>{' '}
                    需要迁移到新的认证系统。
                  </p>
                  <p className="text-blue-700 text-sm">
                    迁移过程很简单，您的所有数据都会保留。完成迁移后，您就可以使用新的登录方式。
                  </p>
                  <div className="flex space-x-2">
                    <Button
                      onClick={handleGoToMigration}
                      size="sm"
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      立即迁移
                      <ArrowRight className="ml-1 h-3 w-3" />
                    </Button>
                    <Button
                      onClick={handleDismissMigration}
                      variant="outline"
                      size="sm"
                    >
                      稍后迁移
                    </Button>
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* 登录表单 */}
          <LoginForm
            onSuccess={handleLoginSuccess}
            onError={handleLoginError}
            onMigrationNeeded={handleMigrationNeeded}
          />

          {/* 分隔线 */}
          {/* <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-gray-300 border-t" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-gray-50 px-2 text-gray-500">或</span>
            </div>
          </div> */}

          {/* 注册链接 */}
          {/* <Card className="border-gray-200">
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="mb-3 text-gray-600">还没有账户？</p>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => router.push('/register')}
                >
                  创建新账户
                </Button>
              </div>
            </CardContent>
          </Card> */}

          {/* 其他链接
          <div className="space-y-2 text-center">
            <div>
              <a
                href="/forgot-password"
                className="text-blue-600 text-sm hover:underline"
              >
                忘记密码？
              </a>
            </div>
          </div> */}

          {/* 系统状态链接 */}
          <div className="text-center">
            <a
              href="/api/health"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 text-xs hover:text-gray-600"
            >
              系统状态
            </a>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
