'use client';

import { createBrowserClient } from '@supabase/ssr';
import { useJobStore } from '@/store/useJobStore';

/**
 * 客户端登出（由退出按钮直接调用，非 Server Action）
 *
 * 流程：
 * 1. 立即清除 Zustand 所有状态 + localStorage（防止新登录用户看到旧数据）
 * 2. 调用 Supabase 客户端登出（清除 cookie session）
 * 3. 硬跳转到 /login，强制刷新所有模块
 *
 * 关键：必须在客户端执行，确保内存中的 Zustand 状态被同步清理。
 */
export async function signOutClient(): Promise<void> {
  // Step 1: 立即清除所有 Zustand 内存状态
  useJobStore.getState().resetStore();

  // Step 2: 清除 Supabase 客户端 session cookie
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  await supabase.auth.signOut();

  // Step 3: 强制刷新跳转到登录页，彻底销毁当前页面所有 JS 对象
  window.location.href = '/login';
}
