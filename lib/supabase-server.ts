import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * Server Components / Server Actions 专用 Supabase 客户端
 * 自动从 Next.js cookies 读取并写入 session
 */
export async function createServerSupabaseClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // 在 Server Actions 中 set 可能因 Response header 已发送而抛错，
            // Supabase 会自动在后续请求中重试，可以安全忽略
          }
        },
      },
    }
  );
}

/**
 * 同步方式获取 Server Supabase 客户端（适用于 Route Handlers）
 */
export function createServerSupabaseClientSync() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return [];
        },
        setAll() {},
      },
    }
  );
}
