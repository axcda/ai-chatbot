import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  /*
   * Playwright starts the dev server and requires a 200 status to
   * begin the tests, so this ensures that the tests can start
   */
  if (pathname.startsWith('/ping')) {
    return new Response('pong', { status: 200 });
  }

  // 允许认证API端点与健康检查无需验证
  if (
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/api/health') ||
    pathname === '/health'
  ) {
    return NextResponse.next();
  }

  // 公开路由不需要认证
  const publicRoutes = [
    '/login',
    '/register',
    '/migrate',
    '/forgot-password',
    '/reset-password',
    '/terms',
    '/privacy',
    '/about',
    '/help',
  ];
  if (publicRoutes.includes(pathname)) {
    return NextResponse.next();
  }

  // 静态资源和API路由
  if (pathname.startsWith('/_next') || pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // 获取Authorization header
  const authHeader = request.headers.get('Authorization');
  let token: string | null = null;

  if (authHeader?.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  }

  // 如果是页面请求且没有token，重定向到登录页
  if (!token && !pathname.startsWith('/api')) {
    const redirectUrl = encodeURIComponent(request.url);
    return NextResponse.redirect(
      new URL(`/login?redirect=${redirectUrl}`, request.url),
    );
  }

  // 不能在 Edge Middleware 使用 firebase-admin（Node-only）。
  // 这里只做“是否存在 Token”的轻量检查；具体校验在各 API 路由中完成。
  if (!token && !pathname.startsWith('/api')) {
    const redirectUrl = encodeURIComponent(request.url);
    return NextResponse.redirect(
      new URL(`/login?redirect=${redirectUrl}`, request.url),
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     * - /ping (health check for tests)
     */
    '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|ping).*)',
  ],
};
