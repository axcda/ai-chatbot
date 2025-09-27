# Supabase 认证配置指南

本项目已从 NextAuth.js 迁移到 Supabase 认证。以下是配置和使用指南。

## 环境变量配置

在您的 `.env.local` 文件中添加以下 Supabase 配置：

```env
# Supabase 配置 (从 Supabase Dashboard > 项目设置 > API)
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## Supabase 项目设置

1. 访问 [Supabase Dashboard](https://supabase.com/dashboard)
2. 创建新项目或选择现有项目
3. 在项目设置 > API 中获取：
   - Project URL (`NEXT_PUBLIC_SUPABASE_URL`)
   - Anon public key (`NEXT_PUBLIC_SUPABASE_ANON_KEY`)

## 认证功能

### 用户注册
- 用户可以使用邮箱和密码注册新账户
- 注册后需要验证邮箱（如果在 Supabase 中启用了邮箱验证）

### 用户登录
- 使用邮箱和密码登录
- 支持 Supabase 的所有认证功能

### 用户状态管理
- 使用 `useAuth()` hook 获取当前用户状态
- 支持加载状态、用户信息、登录/登出功能

## 代码使用示例

### 在组件中使用认证

```tsx
import { useAuth } from '@/contexts/auth-context';

function MyComponent() {
  const { user, loading, signIn, signOut } = useAuth();

  if (loading) {
    return <div>加载中...</div>;
  }

  if (!user) {
    return <div>请登录</div>;
  }

  return (
    <div>
      <p>欢迎, {user.email}</p>
      <button onClick={() => signOut()}>登出</button>
    </div>
  );
}
```

### 在服务端使用认证

```tsx
import { createClient } from '@/lib/supabase/server';

export async function MyServerComponent() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <div>
      {user ? `Hello ${user.email}` : 'Not authenticated'}
    </div>
  );
}
```

## 主要变更

### 从 NextAuth 迁移的变更：
1. 移除了 `SessionProvider` 和 `useSession`
2. 使用 `AuthProvider` 和 `useAuth` 代替
3. 中间件现在使用 Supabase 认证检查
4. 移除了游客模式（guest mode）的复杂逻辑
5. 用户类型简化为已认证/未认证

### 优势：
- 更简单的认证流程
- 内置的邮箱验证
- 更好的性能
- 原生的 Supabase 集成
- 更安全的认证机制

## 注意事项

1. 确保在 Supabase Dashboard 中正确配置了认证设置
2. 如果需要社交登录，可以在 Supabase 中配置 OAuth providers
3. 邮箱验证设置可以在 Supabase 认证设置中调整
4. 确保正确设置了重定向 URL



