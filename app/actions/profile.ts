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
    return { profile: profile as DbProfile, error: '' };
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
    return { profile: profile as DbProfile, error: '' };
  } catch (err) {
    console.error('[updateProfile] Unexpected error:', err);
    return { error: '更新用户信息失败' };
  }
}

/**
 * 更新用户简历文件信息（追加模式，保留历史简历）
 */
export async function updateUserResume(
  newResume: { url: string; filename: string; id: string }
): Promise<{ profile?: DbProfile; error?: string }> {
  console.log('[updateUserResume] Saving resume:', newResume);

  try {
    const supabase = await createServerSupabaseClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { error: '未登录' };
    }

    const { data: existingProfile, error: fetchError } = await supabase
      .from('profiles')
      .select('resumes')
      .eq('id', user.id)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('[updateUserResume] Fetch error:', fetchError.message);
    }

    const existingResumes: { url: string; filename: string; id: string }[] =
      Array.isArray(existingProfile?.resumes) ? existingProfile.resumes : [];

    const updatedResumes = [...existingResumes, newResume];

    const { data: profile, error: upsertError } = await supabase
      .from('profiles')
      .upsert(
        {
          id: user.id,
          resumes: updatedResumes,
        },
        { onConflict: 'id' }
      )
      .select()
      .single();

    if (upsertError) {
      console.error('[updateUserResume] Upsert error:', upsertError.message);
      return { error: upsertError.message };
    }

    revalidatePath('/');
    console.log('[updateUserResume] Done, total resumes:', updatedResumes.length);
    return { profile: profile as DbProfile, error: '' };
  } catch (err) {
    console.error('[updateUserResume] Unexpected error:', err);
    return { error: '保存简历信息失败' };
  }
}

/**
 * 从简历列表中删除指定简历（含 Storage 文件清理）
 */
export async function deleteUserResume(
  resumeId: string
): Promise<{ profile?: DbProfile; error: string }> {
  try {
    const supabase = await createServerSupabaseClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { error: '未登录' };
    }

    const { data: existingProfile, error: fetchError } = await supabase
      .from('profiles')
      .select('resumes')
      .eq('id', user.id)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      return { error: fetchError.message };
    }

    const existingResumes: { url: string; filename: string; id: string }[] =
      Array.isArray(existingProfile?.resumes) ? existingProfile.resumes : [];

    // 找到要删除的简历，留意 Storage 路径
    const target = existingResumes.find((r) => r.id === resumeId);
    const updatedResumes = existingResumes.filter((r) => r.id !== resumeId);

    // 写入数据库
    const { data: profile, error: upsertError } = await supabase
      .from('profiles')
      .upsert(
        {
          id: user.id,
          resumes: updatedResumes,
        },
        { onConflict: 'id' }
      )
      .select()
      .single();

    if (upsertError) {
      return { error: upsertError.message };
    }

    // 从 Storage 删除文件（从 publicUrl 提取路径）
    if (target?.url) {
      const pathMatch = target.url.match(/\/resumes\/(.+?)(?:\?|$)/);
      if (pathMatch) {
        await supabase.storage.from('resumes').remove([pathMatch[1]]);
      }
    }

    revalidatePath('/');
    return { profile: profile as DbProfile, error: '' };
  } catch (err) {
    console.error('[deleteUserResume] Unexpected error:', err);
    return { error: '删除简历失败' };
  }
}

/**
 * 获取当前用户的简历列表
 */
export async function fetchUserResumes(): Promise<{ resumes?: { url: string; filename: string; id: string }[]; error?: string }> {
  try {
    const supabase = await createServerSupabaseClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { error: '未登录' };
    }

    const { data: profile, error: fetchError } = await supabase
      .from('profiles')
      .select('resumes')
      .eq('id', user.id)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      return { error: fetchError.message };
    }

    const resumes: { url: string; filename: string; id: string }[] =
      Array.isArray(profile?.resumes) ? profile.resumes : [];

    return { resumes };
  } catch (err) {
    console.error('[fetchUserResumes] Unexpected error:', err);
    return { error: '获取简历列表失败' };
  }
}

/**
 * 从 Storage 中删除指定文件
 */
export async function deleteStorageFile(storagePath: string): Promise<{ error?: string }> {
  try {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.storage.from('resumes').remove([storagePath]);
    if (error) {
      console.error('[deleteStorageFile] Error:', error.message);
      return { error: error.message };
    }
    return {};
  } catch (err) {
    console.error('[deleteStorageFile] Unexpected error:', err);
    return { error: '删除文件失败' };
  }
}

export async function signOutAction(): Promise<void> {
  console.log('[signOutAction] Signing out...');
  const supabase = await createServerSupabaseClient();
  await supabase.auth.signOut();
  redirect('/login');
}
