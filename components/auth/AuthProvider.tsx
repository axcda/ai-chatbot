/**
 * T029: 认证提供者组件
 * AuthProvider.tsx
 */

'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import type { User as FirebaseUser } from 'firebase/auth';
import { firebaseAuth } from '@/lib/auth/firebase';

interface User {
  id: string;
  email: string;
  firebaseUid: string;
  authProvider: string;
  displayName?: string;
  avatarUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface AuthContextType {
  // Firebase用户
  firebaseUser: FirebaseUser | null;
  // 数据库中的用户信息
  user: User | null;
  // 认证状态
  loading: boolean;
  authenticated: boolean;
  // 认证方法
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  // 用户数据同步
  refreshUser: () => Promise<void>;
  // 错误状态
  error: string | null;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 从数据库获取用户信息
  const fetchUserData = async (
    firebaseUser: FirebaseUser,
  ): Promise<User | null> => {
    try {
      const idToken = await firebaseUser.getIdToken();

      // 这里可以调用后端API获取用户信息
      // 暂时使用Firebase用户信息模拟
      const userData: User = {
        id: firebaseUser.uid,
        email: firebaseUser.email ?? '',
        firebaseUid: firebaseUser.uid,
        authProvider: 'firebase',
        displayName: firebaseUser.displayName || undefined,
        avatarUrl: firebaseUser.photoURL || undefined,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      return userData;
    } catch (error) {
      console.error('Failed to fetch user data:', error);
      return null;
    }
  };

  // 刷新用户数据
  const refreshUser = async () => {
    if (firebaseUser) {
      const userData = await fetchUserData(firebaseUser);
      setUser(userData);
    }
  };

  // 登录
  const signIn = async (email: string, password: string) => {
    try {
      setError(null);
      setLoading(true);

      const userCredential = await firebaseAuth.signIn(email, password);
      const userData = await fetchUserData(userCredential);

      setFirebaseUser(userCredential);
      setUser(userData);
    } catch (error: any) {
      console.error('Sign in error:', error);
      setError(error.message || '登录失败');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // 登出
  const signOut = async () => {
    try {
      setError(null);
      await firebaseAuth.signOut();
      setFirebaseUser(null);
      setUser(null);
    } catch (error: any) {
      console.error('Sign out error:', error);
      setError(error.message || '登出失败');
      throw error;
    }
  };

  // 清除错误
  const clearError = () => {
    setError(null);
  };

  // 监听Firebase认证状态变化
  useEffect(() => {
    const unsubscribe = firebaseAuth.onAuthStateChanged(
      async (firebaseUser) => {
        setLoading(true);
        setError(null);

        try {
          if (firebaseUser) {
            // 用户已登录，获取用户数据
            const userData = await fetchUserData(firebaseUser);
            setFirebaseUser(firebaseUser);
            setUser(userData);
          } else {
            // 用户未登录
            setFirebaseUser(null);
            setUser(null);
          }
        } catch (error: any) {
          console.error('Auth state change error:', error);
          setError(error.message || '认证状态更新失败');
          setFirebaseUser(null);
          setUser(null);
        } finally {
          setLoading(false);
        }
      },
    );

    return unsubscribe;
  }, []);

  // Token刷新处理
  useEffect(() => {
    if (!firebaseUser) return;

    // 定期刷新token以保持认证状态
    const refreshInterval = setInterval(
      async () => {
        try {
          await firebaseUser.getIdToken(true); // 强制刷新token
        } catch (error) {
          console.warn('Token refresh failed:', error);
        }
      },
      30 * 60 * 1000,
    ); // 每30分钟刷新一次

    return () => clearInterval(refreshInterval);
  }, [firebaseUser]);

  const value: AuthContextType = {
    firebaseUser,
    user,
    loading,
    authenticated: !!firebaseUser && !!user,
    signIn,
    signOut,
    refreshUser,
    error,
    clearError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Hook for using auth context
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Hook for getting current user
export function useUser() {
  const { user, firebaseUser, loading, authenticated } = useAuth();
  return { user, firebaseUser, loading, authenticated };
}

// Hook for auth actions
export function useAuthActions() {
  const { signIn, signOut, refreshUser, clearError } = useAuth();
  return { signIn, signOut, refreshUser, clearError };
}

// Higher-order component for auth requirement
export function withAuth<P extends object>(
  Component: React.ComponentType<P>,
): React.ComponentType<P> {
  return function AuthenticatedComponent(props: P) {
    const { authenticated, loading } = useAuth();

    if (loading) {
      return (
        <div className="flex min-h-screen items-center justify-center">
          <div className="h-32 w-32 animate-spin rounded-full border-gray-900 border-b-2" />
        </div>
      );
    }

    if (!authenticated) {
      return (
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-center">
            <h1 className="mb-4 font-bold text-2xl">需要登录</h1>
            <p className="mb-4 text-gray-600">请先登录以访问此页面</p>
            <a
              href="/login"
              className="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
            >
              前往登录
            </a>
          </div>
        </div>
      );
    }

    return <Component {...props} />;
  };
}
