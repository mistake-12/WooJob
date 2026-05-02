'use server';

import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { createServerSupabaseClient } from '@/lib/supabase-server';

// ─── 内部辅助 ────────────────────────────────────────────────────────────────

async function getUserIdInner(): Promise<string | null> {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

// ─── 公开 API ────────────────────────────────────────────────────────────────

/** 获取当前登录用户的 UUID，未登录返回 null */
export async function getUserId(): Promise<string | null> {
  return getUserIdInner();
}

/** 判断用户是否已登录 */
export async function isAuthenticated(): Promise<boolean> {
  const userId = await getUserIdInner();
  return userId !== null;
}

/**
 * 邮箱注册
 * - 若 SUPABASE_EMAIL_CONFIRM=true，Supabase 会发送确认邮件，登录态需邮箱验证后生效
 * - 若未开启确认，直接完成注册并建立登录态
 */
export async function signUpWithEmail(
  _prevState: { error: string } | null,
  formData: FormData
): Promise<{ error: string } | null> {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  if (!email || !password) {
    return { error: '请填写邮箱和密码' };
  }
  if (password.length < 6) {
    return { error: '密码长度至少为 6 位' };
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.signUp({ email, password });

  if (error) {
    console.error('[signUpWithEmail] Failed:', error.message);
    return { error: error.message };
  }

  redirect('/');
}

/**
 * 邮箱登录
 */
export async function signInWithEmail(
  _prevState: { error: string } | null,
  formData: FormData
): Promise<{ error: string } | null> {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  if (!email || !password) {
    return { error: '请填写邮箱和密码' };
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    console.error('[signInWithEmail] Failed:', error.message);
    return { error: error.message };
  }

  redirect('/');
}

/**
 * 登出
 */
export async function signOut(): Promise<void> {
  const supabase = await createServerSupabaseClient();
  await supabase.auth.signOut();
  redirect('/login');
}

/**
 * GitHub OAuth 登录（跳转到 Supabase OAuth 页面）
 * 登录成功后会回调到 /auth/callback，由该路由处理 session cookie
 */
export async function signInWithGithub(): Promise<void> {
  const headersList = await headers();
  const origin = headersList.get('origin') ?? '';
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'github',
    options: {
      redirectTo: `${origin}/auth/callback`,
    },
  });

  if (error) {
    console.error('[signInWithGithub] Failed:', error.message);
    throw new Error(error.message);
  }
}
