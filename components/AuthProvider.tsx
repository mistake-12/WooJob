'use client';

import { useEffect, useRef } from 'react';
import { useJobStore } from '@/store/useJobStore';
import { createBrowserSupabaseClient } from '@/lib/supabase';

/**
 * 全局 Auth 状态监听器
 *
 * 挂在根布局下，在整个应用生命周期内运行。
 *
 * 关键设计：
 * - 仅监听 SIGNED_OUT 清理状态
 * - SIGNED_IN 不清理：Zustand 数据会在 Home 加载时由 fetch* 完全替换，无需提前清空
 * - 使用 mountedRef 防止首次订阅时立即触发回调导致数据被清空
 *
 * 注意：onAuthStateChange 首次订阅时会立即用当前 session 触发回调，
 * 如果不加 mountedRef 保护，SIGNED_IN 会把用户刚加载好的数据全部清空。
 */
export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const resetStore = useJobStore((s) => s.resetStore);
  // 标记组件是否已完成首次渲染，防止首次订阅立即触发导致数据被清空
  const mountedRef = useRef(false);

  useEffect(() => {
    const supabase = createBrowserSupabaseClient();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, _session) => {
      // 跳过首次订阅的立即触发（当前 session 已存在，页面数据正在加载中）
      if (!mountedRef.current) {
        mountedRef.current = true;
        return;
      }

      // 仅在用户主动退出登录时清理本地状态
      if (event === 'SIGNED_OUT') {
        resetStore();
      }
      // SIGNED_IN 不清理：Home 页面加载时会调用 fetch* 替换所有数据，
      // 提前清空只会导致短暂白屏闪烁，毫无意义。
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [resetStore]);

  return <>{children}</>;
}

