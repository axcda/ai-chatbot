/**
 * T035: 认证布局
 * app/(auth)/layout.tsx
 */

import React from 'react';
import { RouteGuard } from '@/components/auth/AuthGuard';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: {
    template: '%s | AI聊天助手',
    default: '认证 | AI聊天助手',
  },
  description: '安全的认证系统，使用Firebase Auth提供可靠的用户验证。',
};

interface AuthLayoutProps {
  children: React.ReactNode;
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <RouteGuard>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        {/* 背景装饰 */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="-top-40 -right-32 absolute h-80 w-80 animate-blob rounded-full bg-purple-300 opacity-70 mix-blend-multiply blur-xl filter" />
          <div className="-bottom-40 -left-32 animation-delay-2000 absolute h-80 w-80 animate-blob rounded-full bg-yellow-300 opacity-70 mix-blend-multiply blur-xl filter" />
          <div className="-translate-x-1/2 -translate-y-1/2 animation-delay-4000 absolute top-1/2 left-1/2 h-80 w-80 transform animate-blob rounded-full bg-pink-300 opacity-70 mix-blend-multiply blur-xl filter" />
        </div>

        {/* 主要内容 */}
        <div className="relative z-10">
          {/* 顶部导航 */}
          <nav className="p-4">
            <div className="mx-auto flex max-w-7xl items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
                  <span className="font-bold text-sm text-white">AI</span>
                </div>
                <span className="font-semibold text-gray-900">聊天助手</span>
              </div>

              <div className="flex items-center space-x-4">
                <a
                  href="/help"
                  className="font-medium text-gray-600 text-sm hover:text-gray-900"
                >
                  帮助
                </a>
                <a
                  href="/about"
                  className="font-medium text-gray-600 text-sm hover:text-gray-900"
                >
                  关于
                </a>
              </div>
            </div>
          </nav>

          {/* 页面内容 */}
          <main className="flex-1">{children}</main>

          {/* 底部信息 */}
          <footer className="mt-auto p-8">
            <div className="mx-auto max-w-7xl">
              <div className="space-y-2 text-center text-gray-500 text-sm">
                <p>© 2024 AI聊天助手. 保留所有权利.</p>
                <div className="flex justify-center space-x-4">
                  <a
                    href="/terms"
                    className="transition-colors hover:text-gray-700"
                  >
                    服务条款
                  </a>
                  <a
                    href="/privacy"
                    className="transition-colors hover:text-gray-700"
                  >
                    隐私政策
                  </a>
                  <a
                    href="/security"
                    className="transition-colors hover:text-gray-700"
                  >
                    安全
                  </a>
                </div>
              </div>
            </div>
          </footer>
        </div>
      </div>
    </RouteGuard>
  );
}
