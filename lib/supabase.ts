import { createBrowserClient } from '@supabase/ssr';

/**
 * 浏览器端 Supabase 客户端（用于 Client Components / API Routes）
 * 自动处理 session cookie
 */
export function createBrowserSupabaseClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

/**
 * 默认导出的浏览器端客户端（兼容旧代码）
 * 请优先使用 createBrowserSupabaseClient()
 * @deprecated
 */
export const supabase = createBrowserSupabaseClient();
