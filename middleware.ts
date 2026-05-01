import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 仅保护首页路由
  const isProtectedRoute = pathname === '/';
  const isAuthRoute = pathname === '/login';

  // 没有配置 Supabase 时，放行所有路由（本地开发 / 未配置环境变量）
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.next();
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          request.cookies.set(name, value);
        });
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          supabaseResponse.cookies.set(name, value, options);
        });
      },
    },
  });

  // 刷新 session，提取当前用户
  const { data: { user } } = await supabase.auth.getUser();

  // 已登录：访问 /login 时重定向到首页
  if (user && isAuthRoute) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // 未登录：访问受保护路由时重定向到登录页
  if (!user && isProtectedRoute) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * 匹配所有路径，但排除：
     * - _next/static（静态文件）
     * - _next/image（图片优化文件）
     * - favicon.ico（网站图标）
     * - /auth/*（OAuth 回调，由路由处理）
     */
    '/((?!_next/static|_next/image|favicon.ico|auth/).*)',
  ],
};
