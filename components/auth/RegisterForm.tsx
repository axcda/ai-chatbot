/**
 * T027: 注册表单组件
 * RegisterForm.tsx
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
import { Loader2, Eye, EyeOff, CheckCircle, XCircle } from 'lucide-react';
import { firebaseAuth } from '@/lib/auth/firebase';

const registerSchema = z
  .object({
    email: z
      .string()
      .min(1, '邮箱不能为空')
      .email('请输入有效的邮箱地址')
      .max(64, '邮箱长度不能超过64个字符'),
    password: z
      .string()
      .min(6, '密码至少需要6个字符')
      .max(128, '密码长度不能超过128个字符')
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        '密码必须包含至少一个小写字母、一个大写字母和一个数字',
      ),
    confirmPassword: z.string().min(1, '请确认密码'),
    displayName: z.string().max(100, '显示名称不能超过100个字符').optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: '两次输入的密码不一致',
    path: ['confirmPassword'],
  });

type RegisterFormData = z.infer<typeof registerSchema>;

interface RegisterFormProps {
  inviteCode: string;
  onSuccess: (user: any) => void;
  onError?: (error: string) => void;
  disabled?: boolean;
}

interface RegistrationState {
  loading: boolean;
  error: string | null;
  success: boolean;
}

export default function RegisterForm({
  inviteCode,
  onSuccess,
  onError,
  disabled = false,
}: RegisterFormProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [registrationState, setRegistrationState] = useState<RegistrationState>(
    {
      loading: false,
      error: null,
      success: false,
    },
  );

  const form = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
      displayName: '',
    },
  });

  const onSubmit = async (data: RegisterFormData) => {
    setRegistrationState({ loading: true, error: null, success: false });

    try {
      // 第1步：通过Firebase创建用户
      const firebaseUser = await firebaseAuth.createUser(
        data.email,
        data.password,
      );

      // 第2步：获取Firebase ID Token
      const idToken = await firebaseUser.getIdToken();

      // 第3步：调用后端API注册用户
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          email: data.email,
          inviteCode,
          firebaseUid: firebaseUser.uid,
          displayName: data.displayName || undefined,
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setRegistrationState({ loading: false, error: null, success: true });
        onSuccess({
          ...result.user,
          firebaseUser,
        });
      } else {
        const errorMessage = result.error || '注册失败';
        setRegistrationState({
          loading: false,
          error: errorMessage,
          success: false,
        });
        onError?.(errorMessage);
      }
    } catch (error: any) {
      console.error('Registration error:', error);
      let errorMessage = '注册失败，请重试';

      // 处理Firebase错误
      if (error.message) {
        if (error.message.includes('email-already-in-use')) {
          errorMessage = '邮箱已被使用';
        } else if (error.message.includes('weak-password')) {
          errorMessage = '密码强度不够';
        } else if (error.message.includes('invalid-email')) {
          errorMessage = '邮箱格式无效';
        } else if (error.message.includes('network')) {
          errorMessage = '网络连接失败，请检查网络';
        }
      }

      setRegistrationState({
        loading: false,
        error: errorMessage,
        success: false,
      });
      onError?.(errorMessage);
    }
  };

  const checkPasswordStrength = (password: string) => {
    const checks = {
      length: password.length >= 6,
      lowercase: /[a-z]/.test(password),
      uppercase: /[A-Z]/.test(password),
      number: /\d/.test(password),
    };

    const strength = Object.values(checks).filter(Boolean).length;
    return { checks, strength };
  };

  const passwordValue = form.watch('password');
  const { checks, strength } = checkPasswordStrength(passwordValue || '');

  return (
    <Card className="mx-auto w-full max-w-md">
      <CardHeader>
        <CardTitle className="text-center">创建账户</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4"
            data-testid="registration-form"
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
                      disabled={disabled || registrationState.loading}
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
              name="displayName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>显示名称 (可选)</FormLabel>
                  <FormControl>
                    <Input
                      type="text"
                      placeholder="您的姓名"
                      disabled={disabled || registrationState.loading}
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
                        disabled={disabled || registrationState.loading}
                        data-testid="password-input"
                        {...field}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute top-0 right-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                        disabled={disabled || registrationState.loading}
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

                  {/* 密码强度指示器 */}
                  {passwordValue && (
                    <div className="mt-2 space-y-2">
                      <div className="flex space-x-1">
                        {[1, 2, 3, 4].map((level) => (
                          <div
                            key={level}
                            className={`h-1 flex-1 rounded ${
                              level <= strength
                                ? strength <= 2
                                  ? 'bg-red-500'
                                  : strength === 3
                                    ? 'bg-yellow-500'
                                    : 'bg-green-500'
                                : 'bg-gray-200'
                            }`}
                          />
                        ))}
                      </div>
                      <div className="space-y-1 text-xs">
                        <div
                          className={`flex items-center ${checks.length ? 'text-green-600' : 'text-gray-400'}`}
                        >
                          {checks.length ? (
                            <CheckCircle className="mr-1 h-3 w-3" />
                          ) : (
                            <XCircle className="mr-1 h-3 w-3" />
                          )}
                          至少6个字符
                        </div>
                        <div
                          className={`flex items-center ${checks.lowercase ? 'text-green-600' : 'text-gray-400'}`}
                        >
                          {checks.lowercase ? (
                            <CheckCircle className="mr-1 h-3 w-3" />
                          ) : (
                            <XCircle className="mr-1 h-3 w-3" />
                          )}
                          包含小写字母
                        </div>
                        <div
                          className={`flex items-center ${checks.uppercase ? 'text-green-600' : 'text-gray-400'}`}
                        >
                          {checks.uppercase ? (
                            <CheckCircle className="mr-1 h-3 w-3" />
                          ) : (
                            <XCircle className="mr-1 h-3 w-3" />
                          )}
                          包含大写字母
                        </div>
                        <div
                          className={`flex items-center ${checks.number ? 'text-green-600' : 'text-gray-400'}`}
                        >
                          {checks.number ? (
                            <CheckCircle className="mr-1 h-3 w-3" />
                          ) : (
                            <XCircle className="mr-1 h-3 w-3" />
                          )}
                          包含数字
                        </div>
                      </div>
                    </div>
                  )}
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>确认密码</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type={showConfirmPassword ? 'text' : 'password'}
                        placeholder="再次输入密码"
                        disabled={disabled || registrationState.loading}
                        data-testid="confirm-password-input"
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
                        disabled={disabled || registrationState.loading}
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

            <Button
              type="submit"
              className="w-full"
              disabled={disabled || registrationState.loading || strength < 4}
              data-testid="register-button"
            >
              {registrationState.loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  注册中...
                </>
              ) : (
                '创建账户'
              )}
            </Button>
          </form>
        </Form>

        {registrationState.error && (
          <Alert
            variant="destructive"
            className="mt-4"
            data-testid="registration-error"
          >
            <XCircle className="h-4 w-4" />
            <AlertDescription>
              {registrationState.error.includes('密码') && (
                <span data-testid="password-strength-error">
                  {registrationState.error}
                </span>
              )}
              {!registrationState.error.includes('密码') &&
                registrationState.error}
            </AlertDescription>
          </Alert>
        )}

        {registrationState.success && (
          <Alert
            variant="default"
            className="mt-4 border-green-500 bg-green-50 text-green-800"
            data-testid="registration-success"
          >
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription>注册成功！正在跳转...</AlertDescription>
          </Alert>
        )}

        <div className="mt-4 text-center text-gray-600 text-sm">
          <p>
            注册即表示您同意我们的
            <a href="/terms" className="text-blue-600 hover:underline">
              服务条款
            </a>
            和
            <a href="/privacy" className="text-blue-600 hover:underline">
              隐私政策
            </a>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
