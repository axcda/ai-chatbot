/**
 * T017: Firebase 客户端配置
 * Client-side Firebase configuration and utilities
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  type Auth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  type User as FirebaseUser,
  connectAuthEmulator,
} from 'firebase/auth';

// Firebase 配置
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// 初始化 Firebase
let app: any;
if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

// 获取 Auth 实例
const auth: Auth = getAuth(app);

// 开发环境可选地连接 Auth 模拟器
// 只有当 NEXT_PUBLIC_FIREBASE_USE_EMULATOR === 'true' 时才启用
if (
  process.env.NODE_ENV === 'development' &&
  typeof window !== 'undefined' &&
  process.env.NEXT_PUBLIC_FIREBASE_USE_EMULATOR === 'true'
) {
  try {
    const host =
      process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST ||
      'http://localhost:9099';
    // @ts-expect-error current firebase types don't include the third arg in some versions
    connectAuthEmulator(auth, host, { disableWarnings: true });
    // eslint-disable-next-line no-console
    console.info('[Firebase] Using Auth Emulator at', host);
  } catch (error) {
    // 模拟器已经连接或不可用，忽略错误
    // eslint-disable-next-line no-console
    console.warn('[Firebase] Auth emulator not connected:', error);
  }
}

export { auth };

// 认证操作
export const firebaseAuth = {
  /**
   * 创建新用户
   */
  async createUser(email: string, password: string): Promise<FirebaseUser> {
    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password,
      );
      return userCredential.user;
    } catch (error: any) {
      console.error('Error creating user:', error);
      throw new Error(this.getErrorMessage(error.code));
    }
  },

  /**
   * 用户登录
   */
  async signIn(email: string, password: string): Promise<FirebaseUser> {
    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password,
      );
      return userCredential.user;
    } catch (error: any) {
      console.error('Error signing in:', error);
      throw new Error(this.getErrorMessage(error.code));
    }
  },

  /**
   * 用户登出
   */
  async signOut(): Promise<void> {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  },

  /**
   * 监听认证状态变化
   */
  onAuthStateChanged(
    callback: (user: FirebaseUser | null) => void,
  ): () => void {
    return onAuthStateChanged(auth, callback);
  },

  /**
   * 获取当前用户的ID Token
   */
  async getCurrentUserToken(): Promise<string | null> {
    const user = auth.currentUser;
    if (!user) return null;

    try {
      return await user.getIdToken();
    } catch (error) {
      console.error('Error getting user token:', error);
      return null;
    }
  },

  /**
   * 获取当前用户
   */
  getCurrentUser(): FirebaseUser | null {
    return auth.currentUser;
  },

  /**
   * 强制刷新ID Token
   */
  async refreshToken(): Promise<string | null> {
    const user = auth.currentUser;
    if (!user) return null;

    try {
      return await user.getIdToken(true);
    } catch (error) {
      console.error('Error refreshing token:', error);
      return null;
    }
  },

  /**
   * 获取友好的错误消息
   */
  getErrorMessage(errorCode: string): string {
    const errorMessages: Record<string, string> = {
      'auth/email-already-in-use': '该邮箱已被注册',
      'auth/invalid-email': '邮箱格式无效',
      'auth/weak-password': '密码强度不够，至少需要6个字符',
      'auth/user-not-found': '用户不存在',
      'auth/wrong-password': '密码错误',
      'auth/invalid-credential': '邮箱或密码错误',
      'auth/too-many-requests': '登录尝试次数过多，请稍后再试',
      'auth/network-request-failed': '网络连接失败',
      'auth/operation-not-allowed': '该操作未被允许',
      'auth/user-disabled': '该用户账户已被禁用',
    };

    return errorMessages[errorCode] || '认证失败，请重试';
  },
};

// 类型定义
export type { FirebaseUser };

// 认证状态管理 Hook (React) - 仅在客户端使用时可用
export function useFirebaseAuth() {
  // 动态导入React hooks，避免服务端渲染问题
  if (typeof window === 'undefined') {
    throw new Error('useFirebaseAuth can only be used on the client side');
  }

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const React = require('react');
  const [user, setUser] = React.useState<FirebaseUser | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const unsubscribe = firebaseAuth.onAuthStateChanged((user) => {
      setUser(user);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  return { user, loading };
}

// 确保仅在客户端环境中使用
if (typeof window === 'undefined') {
  console.warn('Firebase Auth 客户端配置在服务器端被加载，这可能导致问题');
}
