'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import type { DbProfile, UpdateProfileInput } from '@/types/database';

/**
 * 获取当前用户的 profile
 */
export async function getProfile(): Promise<{ profile?: DbProfile; error?: string }> {
  console.log('[getProfile] Fetching user profile...');

  try {
    const supabase = await createServerSupabaseClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      console.log('[getProfile] Not authenticated');
      return { error: '未登录' };
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('[getProfile] Query error:', profileError.message);
      return { error: profileError.message };
    }

    console.log('[getProfile] Got profile:', profile?.nickname ?? '(none)');
    return { profile: profile as DbProfile };
  } catch (err) {
    console.error('[getProfile] Unexpected error:', err);
    return { error: '获取用户信息失败' };
  }
}

/**
 * 更新当前用户的 profile（upsert）
 */
export async function updateProfile(
  input: UpdateProfileInput
): Promise<{ profile?: DbProfile; error?: string }> {
  console.log('[updateProfile] Updating profile:', input);

  try {
    const supabase = await createServerSupabaseClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      console.log('[updateProfile] Not authenticated');
      return { error: '未登录' };
    }

    const updatePayload: Partial<DbProfile> = {};
    if (input.nickname !== undefined) updatePayload.nickname = input.nickname;
    if (input.target_role !== undefined) updatePayload.target_role = input.target_role;

    const { data: profile, error: upsertError } = await supabase
      .from('profiles')
      .upsert(
        {
          id: user.id,
          email: user.email ?? '',
          ...updatePayload,
        },
        { onConflict: 'id' }
      )
      .select()
      .single();

    if (upsertError) {
      console.error('[updateProfile] Upsert error:', upsertError.message);
      return { error: upsertError.message };
    }

    revalidatePath('/');
    console.log('[updateProfile] Done, profile updated:', profile?.nickname);
    return { profile: profile as DbProfile };
  } catch (err) {
    console.error('[updateProfile] Unexpected error:', err);
    return { error: '更新用户信息失败' };
  }
}

/**
 * 退出登录
 */
export async function signOutAction(): Promise<void> {
  console.log('[signOutAction] Signing out...');
  const supabase = await createServerSupabaseClient();
  await supabase.auth.signOut();
  redirect('/login');
}
