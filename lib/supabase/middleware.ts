import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import type { CookieUser } from '@/lib/auth/types';

export async function updateSession(request: NextRequest) {
  const supabaseResponse = NextResponse.next({
    request,
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn(
      'Supabase environment variables are missing; skipping auth middleware.',
    );
    return supabaseResponse;
  }

  try {
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            supabaseResponse.cookies.set(name, value, options);
          });
        },
      },
    });

    const {
      data: { user },
    } = await supabase.auth.getUser();

    // 设置用户 cookie
    if (user) {
      const cookieUser: CookieUser = {
        id: user.id,
        email: user.email || '',
        type: 'authenticated',
      };
      supabaseResponse.cookies.set('chat:user', JSON.stringify(cookieUser), {
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 30, // 30 days
      });
    } else {
      // 设置访客用户 cookie
      const guestUser: CookieUser = {
        id: 'guest-user',
        email: 'guest@example.com',
        type: 'guest',
      };
      supabaseResponse.cookies.set('chat:user', JSON.stringify(guestUser), {
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 30, // 30 days
      });
    }

    if (
      user &&
      (request.nextUrl.pathname === '/login' ||
        request.nextUrl.pathname === '/register')
    ) {
      const url = request.nextUrl.clone();
      url.pathname = '/';
      return NextResponse.redirect(url);
    }

    const pathname = request.nextUrl.pathname;

    // 允许未登录访问首页和聊天页面（包括 /chat 与 /chat/:id）
    const isPublicRoute =
      pathname === '/' ||
      pathname.startsWith('/chat') ||
      pathname.startsWith('/api') ||
      pathname.startsWith('/_next') ||
      pathname.startsWith('/favicon.ico');

    if (
      !user &&
      !pathname.startsWith('/login') &&
      !pathname.startsWith('/register') &&
      !isPublicRoute
    ) {
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      return NextResponse.redirect(url);
    }

    return supabaseResponse;
  } catch (error) {
    console.warn(
      'Supabase auth request failed; continuing without session.',
      error,
    );
    return supabaseResponse;
  }
}
