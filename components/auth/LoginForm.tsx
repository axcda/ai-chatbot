/**
 * T028: 登录表单组件
 * LoginForm.tsx
 */

'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Loader2, Eye, EyeOff, AlertTriangle, Info } from 'lucide-react';
import { firebaseAuth } from '@/lib/auth/firebase';

const loginSchema = z.object({
  email: z
    .string()
    .min(1, '邮箱不能为空')
    .email('请输入有效的邮箱地址')
    .max(64, '邮箱长度不能超过64个字符'),
  password: z
    .string()
    .min(1, '密码不能为空')
    .max(128, '密码长度不能超过128个字符'),
});

type LoginFormData = z.infer<typeof loginSchema>;

interface LoginFormProps {
  onSuccess: (user: any) => void;
  onError?: (error: string) => void;
  onMigrationNeeded?: (email: string) => void;
  disabled?: boolean;
}

interface LoginState {
  loading: boolean;
  error: string | null;
  migrationPrompt: boolean;
}

export default function LoginForm({
  onSuccess,
  onError,
  onMigrationNeeded,
  disabled = false,
}: LoginFormProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [loginState, setLoginState] = useState<LoginState>({
    loading: false,
    error: null,
    migrationPrompt: false,
  });

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    setLoginState({ loading: true, error: null, migrationPrompt: false });

    try {
      // 尝试Firebase登录
      const firebaseUser = await firebaseAuth.signIn(data.email, data.password);

      // 登录成功，获取用户信息
      const idToken = await firebaseUser.getIdToken();

      // 可以在这里调用后端API同步用户信息
      try {
        const response = await fetch('/api/auth/sync-user', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify({
            firebaseUid: firebaseUser.uid,
            userData: {
              displayName: firebaseUser.displayName,
              photoURL: firebaseUser.photoURL,
            },
          }),
        });

        // 即使同步失败也不影响登录
        if (!response.ok) {
          console.warn('User sync failed, but login continues');
        }
      } catch (syncError) {
        console.warn('User sync error:', syncError);
      }

      setLoginState({ loading: false, error: null, migrationPrompt: false });
      onSuccess({
        firebaseUser,
        email: data.email,
      });
    } catch (error: any) {
      console.error('Login error:', error);

      // 检查是否需要账户迁移
      if (error.message?.includes('user-not-found')) {
        setLoginState({ loading: false, error: null, migrationPrompt: true });
        return;
      }

      let errorMessage = '登录失败，请重试';

      // 处理Firebase错误
      if (error.message) {
        if (
          error.message.includes('邮箱或密码错误') ||
          error.message.includes('invalid-credential') ||
          error.message.includes('wrong-password')
        ) {
          errorMessage = '邮箱或密码错误';
        } else if (error.message.includes('too-many-requests')) {
          errorMessage = '登录尝试次数过多，请稍后再试';
        } else if (error.message.includes('user-disabled')) {
          errorMessage = '该账户已被禁用，请联系管理员';
        } else if (error.message.includes('network')) {
          errorMessage = '网络连接失败，请检查网络';
        }
      }

      setLoginState({
        loading: false,
        error: errorMessage,
        migrationPrompt: false,
      });
      onError?.(errorMessage);
    }
  };

  const handleMigration = () => {
    const email = form.getValues('email');
    onMigrationNeeded?.(email);
  };

  return (
    <Card className="mx-auto w-full max-w-md">
      <CardHeader>
        <CardTitle className="text-center">登录</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4"
            data-testid="login-form"
          >
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>邮箱</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="your@email.com"
                      disabled={disabled || loginState.loading}
                      data-testid="email-input"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>密码</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="输入密码"
                        disabled={disabled || loginState.loading}
                        data-testid="password-input"
                        {...field}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute top-0 right-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                        disabled={disabled || loginState.loading}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              className="w-full"
              disabled={disabled || loginState.loading}
              data-testid="login-button"
            >
              {loginState.loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  登录中...
                </>
              ) : (
                '登录'
              )}
            </Button>
          </form>
        </Form>

        {loginState.error && (
          <Alert
            variant="destructive"
            className="mt-4"
            data-testid="login-error"
          >
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{loginState.error}</AlertDescription>
          </Alert>
        )}

        {loginState.migrationPrompt && (
          <Alert className="mt-4" data-testid="migration-prompt">
            <Info className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <p>检测到您可能有旧账户需要迁移到新的认证系统。</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleMigration}
                  className="w-full"
                  data-testid="migrate-account-button"
                >
                  迁移账户
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        <div className="mt-4 space-y-2 text-center">
          <a
            href="/forgot-password"
            className="text-blue-600 text-sm hover:underline"
          >
            忘记密码？
          </a>
          <div className="text-gray-600 text-sm">
            还没有账户？
            <a href="/register" className="ml-1 text-blue-600 hover:underline">
              立即注册
            </a>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
