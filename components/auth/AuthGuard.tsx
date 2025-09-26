/**
 * T030: 认证守卫组件
 * AuthGuard.tsx
 */

'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from './AuthProvider';
import { Loader2 } from 'lucide-react';

interface AuthGuardProps {
  children: React.ReactNode;
  requireAuth?: boolean; // 是否需要认证，默认true
  redirectTo?: string; // 重定向路径
  fallback?: React.ReactNode; // 加载时的占位组件
}

// 公开路由配置（不需要认证的路由）
const PUBLIC_ROUTES = [
  '/',
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/terms',
  '/privacy',
  '/about',
];

// 认证路由配置（需要认证的路由）
const AUTH_ROUTES = [
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
];

export default function AuthGuard({
  children,
  requireAuth = true,
  redirectTo,
  fallback,
}: AuthGuardProps) {
  const { authenticated, loading, firebaseUser } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    // 如果正在加载，不进行任何操作
    if (loading) {
      setShouldRender(false);
      return;
    }

    const isPublicRoute = PUBLIC_ROUTES.includes(pathname);
    const isAuthRoute = AUTH_ROUTES.includes(pathname);

    if (requireAuth) {
      // 需要认证的页面
      if (!authenticated) {
        // 未认证，重定向到登录页
        const redirect =
          redirectTo || `/login?redirect=${encodeURIComponent(pathname)}`;
        router.replace(redirect);
        setShouldRender(false);
        return;
      }

      // 已认证且在认证页面，重定向到主页面
      if (authenticated && isAuthRoute) {
        const redirect = redirectTo || '/chat';
        router.replace(redirect);
        setShouldRender(false);
        return;
      }

      // 已认证且在需要认证的页面，正常渲染
      setShouldRender(true);
    } else {
      // 不需要认证的页面
      if (authenticated && isAuthRoute) {
        // 已认证用户访问认证页面，重定向到主页面
        const redirect = redirectTo || '/chat';
        router.replace(redirect);
        setShouldRender(false);
        return;
      }

      // 公开页面或未认证用户访问认证页面，正常渲染
      setShouldRender(true);
    }
  }, [authenticated, loading, pathname, requireAuth, redirectTo, router]);

  // 加载状态
  if (loading || !shouldRender) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto mb-4 h-8 w-8 animate-spin" />
          <p className="text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

// 路由级别的认证守卫
interface RouteGuardProps {
  children: React.ReactNode;
}

export function RouteGuard({ children }: RouteGuardProps) {
  const pathname = usePathname();
  const isPublicRoute = PUBLIC_ROUTES.includes(pathname);
  const isAuthRoute = AUTH_ROUTES.includes(pathname);

  // 对于认证路由，不需要认证
  if (isAuthRoute) {
    return <AuthGuard requireAuth={false}>{children}</AuthGuard>;
  }

  // 对于公开路由，不需要认证
  if (isPublicRoute) {
    return <AuthGuard requireAuth={false}>{children}</AuthGuard>;
  }

  // 其他路由需要认证
  return <AuthGuard requireAuth={true}>{children}</AuthGuard>;
}

// 特定页面的认证守卫Hook
export function useRouteProtection() {
  const { authenticated, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const requireAuth = (redirectTo?: string) => {
    if (loading) return false;

    if (!authenticated) {
      const redirect =
        redirectTo || `/login?redirect=${encodeURIComponent(pathname)}`;
      router.replace(redirect);
      return false;
    }

    return true;
  };

  const requireGuest = (redirectTo?: string) => {
    if (loading) return false;

    if (authenticated) {
      const redirect = redirectTo || '/chat';
      router.replace(redirect);
      return false;
    }

    return true;
  };

  return {
    requireAuth,
    requireGuest,
    authenticated,
    loading,
  };
}

// 条件渲染组件
interface ConditionalRenderProps {
  children: React.ReactNode;
  condition: 'authenticated' | 'unauthenticated' | 'loading';
  fallback?: React.ReactNode;
}

export function ConditionalRender({
  children,
  condition,
  fallback,
}: ConditionalRenderProps) {
  const { authenticated, loading } = useAuth();

  const shouldRender = () => {
    switch (condition) {
      case 'authenticated':
        return authenticated && !loading;
      case 'unauthenticated':
        return !authenticated && !loading;
      case 'loading':
        return loading;
      default:
        return false;
    }
  };

  if (!shouldRender()) {
    return fallback ? <>{fallback}</> : null;
  }

  return <>{children}</>;
}

// 权限检查组件
interface PermissionGuardProps {
  children: React.ReactNode;
  permission?: string;
  fallback?: React.ReactNode;
}

export function PermissionGuard({
  children,
  permission,
  fallback,
}: PermissionGuardProps) {
  const { user, authenticated } = useAuth();

  // 如果未认证，不渲染
  if (!authenticated || !user) {
    return fallback ? <>{fallback}</> : null;
  }

  // 如果没有指定权限，直接渲染
  if (!permission) {
    return <>{children}</>;
  }

  // 这里可以根据用户角色/权限进行判断
  // 暂时简单实现，后续可以扩展
  const hasPermission = () => {
    // 示例：管理员权限检查
    if (permission === 'admin') {
      return user.email?.endsWith('@admin.com') || false;
    }

    // 其他权限检查逻辑
    return true;
  };

  if (!hasPermission()) {
    return fallback ? (
      <>{fallback}</>
    ) : (
      <div className="p-8 text-center">
        <p className="text-gray-600">您没有访问此内容的权限</p>
      </div>
    );
  }

  return <>{children}</>;
}
