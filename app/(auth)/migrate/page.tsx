/**
 * T033: 账户迁移页面
 * app/(auth)/migrate/page.tsx
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import AuthGuard from '@/components/auth/AuthGuard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  ArrowLeft,
  CheckCircle,
  AlertTriangle,
  Info,
  Loader2,
  Eye,
  EyeOff,
} from 'lucide-react';
import { firebaseAuth } from '@/lib/auth/firebase';

const migrationSchema = z
  .object({
    email: z.string().min(1, '邮箱不能为空').email('请输入有效的邮箱地址'),
    newPassword: z
      .string()
      .min(6, '新密码至少需要6个字符')
      .max(128, '密码长度不能超过128个字符')
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        '密码必须包含至少一个小写字母、一个大写字母和一个数字',
      ),
    confirmPassword: z.string().min(1, '请确认新密码'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: '两次输入的密码不一致',
    path: ['confirmPassword'],
  });

type MigrationFormData = z.infer<typeof migrationSchema>;

interface MigrationState {
  step: 'form' | 'processing' | 'success' | 'error';
  error: string | null;
  loading: boolean;
}

export default function MigratePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [state, setState] = useState<MigrationState>({
    step: 'form',
    error: null,
    loading: false,
  });

  const form = useForm<MigrationFormData>({
    resolver: zodResolver(migrationSchema),
    defaultValues: {
      email: searchParams.get('email') || '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  // 检查是否有预填邮箱
  useEffect(() => {
    const email = searchParams.get('email');
    if (email) {
      form.setValue('email', email);
    }
  }, [searchParams, form]);

  const onSubmit = async (data: MigrationFormData) => {
    setState((prev) => ({
      ...prev,
      step: 'processing',
      loading: true,
      error: null,
    }));

    try {
      // 第1步：通过Firebase创建用户
      const firebaseUser = await firebaseAuth.createUser(
        data.email,
        data.newPassword,
      );

      // 第2步：获取Firebase ID Token
      const idToken = await firebaseUser.getIdToken();

      // 第3步：调用后端API迁移用户
      const response = await fetch('/api/auth/migrate-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          email: data.email,
          firebaseUid: firebaseUser.uid,
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setState((prev) => ({ ...prev, step: 'success', loading: false }));

        // 延迟跳转到聊天页面
        setTimeout(() => {
          router.push('/chat');
        }, 3000);
      } else {
        const errorMessage = result.error || '迁移失败';
        setState((prev) => ({
          ...prev,
          step: 'error',
          error: errorMessage,
          loading: false,
        }));
      }
    } catch (error: any) {
      console.error('Migration error:', error);
      let errorMessage = '迁移失败，请重试';

      // 处理Firebase错误
      if (error.message) {
        if (error.message.includes('email-already-in-use')) {
          errorMessage = '该邮箱已在新系统中注册，请直接登录';
        } else if (error.message.includes('weak-password')) {
          errorMessage = '密码强度不够，请设置更强的密码';
        } else if (error.message.includes('invalid-email')) {
          errorMessage = '邮箱格式无效';
        } else if (error.message.includes('network')) {
          errorMessage = '网络连接失败，请检查网络';
        }
      }

      setState((prev) => ({
        ...prev,
        step: 'error',
        error: errorMessage,
        loading: false,
      }));
    }
  };

  const handleGoBack = () => {
    router.back();
  };

  const handleRetry = () => {
    setState((prev) => ({ ...prev, step: 'form', error: null }));
  };

  return (
    <AuthGuard requireAuth={false}>
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
        <div className="w-full max-w-md space-y-8">
          {/* 页面标题 */}
          <div className="text-center">
            <h1 className="font-bold text-3xl text-gray-900">账户迁移</h1>
            <p className="mt-2 text-gray-600">
              {state.step === 'form' && '将您的账户升级到新的认证系统'}
              {state.step === 'processing' && '正在迁移您的账户...'}
              {state.step === 'success' && '迁移成功！'}
              {state.step === 'error' && '迁移遇到问题'}
            </p>
          </div>

          {/* 迁移步骤说明 */}
          {state.step === 'form' && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-2">
                  <p className="font-medium">迁移过程：</p>
                  <ol className="ml-4 list-inside list-decimal space-y-1 text-sm">
                    <li>确认您的邮箱地址</li>
                    <li>设置新的登录密码</li>
                    <li>系统将保留您的所有数据</li>
                  </ol>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* 表单步骤 */}
          {state.step === 'form' && (
            <Card>
              <CardHeader>
                <CardTitle>设置新的登录信息</CardTitle>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form
                    onSubmit={form.handleSubmit(onSubmit)}
                    className="space-y-4"
                  >
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>邮箱地址</FormLabel>
                          <FormControl>
                            <Input
                              type="email"
                              placeholder="your@email.com"
                              disabled={!!searchParams.get('email')}
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                          {searchParams.get('email') && (
                            <p className="text-gray-500 text-sm">
                              邮箱地址从登录页面自动填入
                            </p>
                          )}
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="newPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>新密码</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input
                                type={showPassword ? 'text' : 'password'}
                                placeholder="设置新的登录密码"
                                {...field}
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="absolute top-0 right-0 h-full px-3 py-2 hover:bg-transparent"
                                onClick={() => setShowPassword(!showPassword)}
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

                    <FormField
                      control={form.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>确认新密码</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input
                                type={showConfirmPassword ? 'text' : 'password'}
                                placeholder="再次输入新密码"
                                {...field}
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="absolute top-0 right-0 h-full px-3 py-2 hover:bg-transparent"
                                onClick={() =>
                                  setShowConfirmPassword(!showConfirmPassword)
                                }
                              >
                                {showConfirmPassword ? (
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

                    <div className="flex space-x-3">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleGoBack}
                        className="flex-1"
                      >
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        返回
                      </Button>
                      <Button
                        type="submit"
                        disabled={state.loading}
                        className="flex-1"
                        data-testid="migrate-account-button"
                      >
                        开始迁移
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          )}

          {/* 处理中状态 */}
          {state.step === 'processing' && (
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-4 text-center">
                  <Loader2 className="mx-auto h-12 w-12 animate-spin text-blue-500" />
                  <div>
                    <h3 className="font-medium text-lg">正在迁移您的账户</h3>
                    <p className="mt-2 text-gray-600">
                      请稍候，我们正在安全地转移您的数据...
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 成功状态 */}
          {state.step === 'success' && (
            <Card>
              <CardContent className="pt-6">
                <div
                  className="space-y-4 text-center"
                  data-testid="migration-success"
                >
                  <CheckCircle className="mx-auto h-16 w-16 text-green-500" />
                  <div>
                    <h3 className="font-medium text-green-600 text-lg">
                      迁移成功！
                    </h3>
                    <p className="mt-2 text-gray-600">
                      您的账户已成功升级到新的认证系统。正在为您跳转到主页面...
                    </p>
                  </div>
                  <div className="mx-auto h-8 w-8 animate-spin rounded-full border-blue-500 border-b-2" />
                </div>
              </CardContent>
            </Card>
          )}

          {/* 错误状态 */}
          {state.step === 'error' && (
            <div className="space-y-4">
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{state.error}</AlertDescription>
              </Alert>

              <Card>
                <CardContent className="pt-6">
                  <div className="space-y-4 text-center">
                    <div className="flex space-x-3">
                      <Button
                        variant="outline"
                        onClick={handleGoBack}
                        className="flex-1"
                      >
                        返回登录
                      </Button>
                      <Button onClick={handleRetry} className="flex-1">
                        重试迁移
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* 帮助链接 */}
          <div className="text-center text-gray-500 text-sm">
            <p>
              迁移遇到问题？
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
