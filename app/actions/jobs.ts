'use server';

import { revalidatePath } from 'next/cache';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import type {
  DbJob,
  DbJobTag,
  JobWithTags,
  CreateJobInput,
  UpdateJobInput,
} from '@/types/database';
import {
  transformDbJobToJobWithTags,
  mapFrontendTagToDb,
} from './_helpers';

/**
 * 获取当前用户所有未删除的岗位
 */
export async function getJobs(): Promise<{ jobs?: JobWithTags[]; error?: string }> {
  console.log('[getJobs] Fetching jobs...');

  try {
    const supabase = await createServerSupabaseClient();

    const { data: jobs, error } = await supabase
      .from('jobs')
      .select('*')
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    console.log('[getJobs] Query result, count:', jobs?.length ?? 0, 'error:', error);

    if (error) return { error: error.message };
    if (!jobs || jobs.length === 0) return { jobs: [] };

    // 批量获取所有岗位的 tags
    const jobIds = jobs.map((j) => j.id);
    const { data: allTags, error: tagsError } = await supabase
      .from('job_tags')
      .select('*')
      .in('job_id', jobIds);

    console.log('[getJobs] Fetched tags, count:', allTags?.length ?? 0);

    if (tagsError) return { error: tagsError.message };

    // 按 job_id 分组 tags
    const tagsByJobId = new Map<string, DbJobTag[]>();
    for (const tag of allTags ?? []) {
      const list = tagsByJobId.get(tag.job_id) ?? [];
      list.push(tag);
      tagsByJobId.set(tag.job_id, list);
    }

    const jobsWithTags = jobs.map((job) =>
      transformDbJobToJobWithTags(job, tagsByJobId.get(job.id) ?? [])
    );

    console.log('[getJobs] Returning jobs count:', jobsWithTags.length);
    return { jobs: jobsWithTags };
  } catch (err) {
    console.error('[getJobs] Unexpected error:', err);
    return { error: 'Failed to fetch jobs' };
  }
}

/**
 * 新建一个岗位卡片
 */
export async function createJob(
  input: CreateJobInput
): Promise<{ job?: JobWithTags; error?: string }> {
  console.log('[createJob] Creating job:', input.company, '-', input.title);

  try {
    const supabase = await createServerSupabaseClient();

    // 1. 插入 jobs 表
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .insert({
        company: input.company,
        title: input.title,
        stage: input.stage ?? '待投递',
        deadline: input.deadline ?? null,
        key_time: input.keyTime ?? null,
        website: input.website ?? null,
        description: input.description ?? null,
        progress: 10,
      })
      .select()
      .single();

    console.log('[createJob] Insert result, jobId:', job?.id, 'error:', jobError);

    if (jobError || !job) {
      return { error: jobError?.message ?? 'Failed to create job' };
    }

    // 2. 插入 job_tags 表
    if (input.tags) {
      const tagsToInsert = Object.entries(input.tags)
        .filter(([, v]) => v != null && v !== undefined)
        .map(([k, v]) => ({
          job_id: (job as DbJob).id,
          tag_type: mapFrontendTagToDb(k),
          tag_value: String(v),
        }));

      if (tagsToInsert.length > 0) {
        const { error: tagsError } = await supabase
          .from('job_tags')
          .insert(tagsToInsert);
        console.log('[createJob] Inserted tags, count:', tagsToInsert.length, 'error:', tagsError);
      }
    }

    // 3. 刷新页面
    revalidatePath('/');
    console.log('[createJob] Done, revalidated path');

    // 4. 重新查询完整数据返回
    const { data: savedTags } = await supabase
      .from('job_tags')
      .select('*')
      .eq('job_id', job.id);

    return { job: transformDbJobToJobWithTags(job as DbJob, savedTags ?? []) };
  } catch (err) {
    console.error('[createJob] Unexpected error:', err);
    return { error: 'Failed to create job' };
  }
}

/**
 * 更新岗位详情
 */
export async function updateJob(
  id: string,
  input: UpdateJobInput
): Promise<{ job?: JobWithTags; error?: string }> {
  console.log('[updateJob] Updating job:', id);

  try {
    const supabase = await createServerSupabaseClient();

    // 1. 检查是否存在
    const { data: existing, error: fetchError } = await supabase
      .from('jobs')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !existing) {
      console.log('[updateJob] Job not found:', id);
      return { error: fetchError?.message ?? 'Job not found' };
    }

    // 2. 构建更新字段（只更新传入的非 undefined 字段）
    const updateFields: Partial<DbJob> = {};
    if (input.company !== undefined) updateFields.company = input.company;
    if (input.title !== undefined) updateFields.title = input.title;
    if (input.stage !== undefined) updateFields.stage = input.stage;
    if (input.deadline !== undefined) updateFields.deadline = input.deadline;
    if (input.keyTime !== undefined) updateFields.key_time = input.keyTime;
    if (input.website !== undefined) updateFields.website = input.website;
    if (input.description !== undefined) updateFields.description = input.description;
    if (input.notes !== undefined) updateFields.notes = input.notes;

    if (Object.keys(updateFields).length > 0) {
      const { data: updated, error: updateError } = await supabase
        .from('jobs')
        .update(updateFields)
        .eq('id', id)
        .select()
        .single();

      console.log('[updateJob] Update result, error:', updateError);

      if (updateError) return { error: updateError.message };
      existing._for_test = updated as DbJob;
    }

    // 3. 更新 tags（删除旧标签 + 插入新标签）
    if (input.tags) {
      // 删除旧标签
      await supabase.from('job_tags').delete().eq('job_id', id);

      // 插入新标签
      const tagsToInsert = Object.entries(input.tags)
        .filter(([, v]) => v != null)
        .map(([k, v]) => ({
          job_id: id,
          tag_type: mapFrontendTagToDb(k),
          tag_value: String(v),
        }));

      if (tagsToInsert.length > 0) {
        await supabase.from('job_tags').insert(tagsToInsert);
      }
      console.log('[updateJob] Tags updated, count:', tagsToInsert.length);
    }

    // 4. 刷新页面
    revalidatePath('/');

    // 5. 重新查询完整数据
    const { data: savedTags } = await supabase
      .from('job_tags')
      .select('*')
      .eq('job_id', id);

    const { data: finalJob } = await supabase
      .from('jobs')
      .select('*')
      .eq('id', id)
      .single();

    console.log('[updateJob] Done, returning job:', finalJob?.id);
    return { job: transformDbJobToJobWithTags(finalJob as DbJob, savedTags ?? []) };
  } catch (err) {
    console.error('[updateJob] Unexpected error:', err);
    return { error: 'Failed to update job' };
  }
}

/**
 * 拖拽松手时更新岗位阶段
 */
export async function updateJobStage(
  id: string,
  newStage: string
): Promise<{ job?: JobWithTags; error?: string }> {
  console.log('[updateJobStage] Updating job stage:', id, '->', newStage);

  try {
    const supabase = await createServerSupabaseClient();

    const { data: job, error } = await supabase
      .from('jobs')
      .update({ stage: newStage })
      .eq('id', id)
      .select()
      .single();

    if (error || !job) {
      console.log('[updateJobStage] Failed or not found:', error);
      return { error: error?.message ?? 'Job not found' };
    }

    const { data: tags } = await supabase
      .from('job_tags')
      .select('*')
      .eq('job_id', id);

    revalidatePath('/');

    console.log('[updateJobStage] Done');
    return { job: transformDbJobToJobWithTags(job as DbJob, tags ?? []) };
  } catch (err) {
    console.error('[updateJobStage] Unexpected error:', err);
    return { error: 'Failed to update job stage' };
  }
}

/**
 * 软删除岗位（移入回收站）
 */
export async function trashJob(
  id: string
): Promise<{ success: boolean; error?: string }> {
  console.log('[trashJob] Trashing job:', id);

  try {
    const supabase = await createServerSupabaseClient();

    const { error } = await supabase
      .from('jobs')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      console.log('[trashJob] Failed:', error.message);
      return { success: false, error: error.message };
    }

    revalidatePath('/');
    console.log('[trashJob] Done');
    return { success: true };
  } catch (err) {
    console.error('[trashJob] Unexpected error:', err);
    return { success: false, error: 'Failed to trash job' };
  }
}

/**
 * 获取回收站中的岗位列表
 */
export async function getTrashedJobs(): Promise<{ jobs?: JobWithTags[]; error?: string }> {
  console.log('[getTrashedJobs] Fetching trashed jobs...');

  try {
    const supabase = await createServerSupabaseClient();

    const { data: jobs, error } = await supabase
      .from('jobs')
      .select('*')
      .not('deleted_at', 'is', null)
      .order('deleted_at', { ascending: false });

    console.log('[getTrashedJobs] Query result, count:', jobs?.length ?? 0, 'error:', error);

    if (error) return { error: error.message };
    if (!jobs || jobs.length === 0) return { jobs: [] };

    const jobIds = jobs.map((j) => j.id);
    const { data: allTags } = await supabase
      .from('job_tags')
      .select('*')
      .in('job_id', jobIds);

    const tagsByJobId = new Map<string, DbJobTag[]>();
    for (const tag of allTags ?? []) {
      const list = tagsByJobId.get(tag.job_id) ?? [];
      list.push(tag);
      tagsByJobId.set(tag.job_id, list);
    }

    const jobsWithTags = jobs.map((job) =>
      transformDbJobToJobWithTags(job as DbJob, tagsByJobId.get(job.id) ?? [])
    );

    console.log('[getTrashedJobs] Returning jobs count:', jobsWithTags.length);
    return { jobs: jobsWithTags };
  } catch (err) {
    console.error('[getTrashedJobs] Unexpected error:', err);
    return { error: 'Failed to fetch trashed jobs' };
  }
}

/**
 * 从回收站恢复岗位（恢复至"已结束"阶段）
 */
export async function restoreJob(
  id: string
): Promise<{ job?: JobWithTags; error?: string }> {
  console.log('[restoreJob] Restoring job:', id);

  try {
    const supabase = await createServerSupabaseClient();

    const { data: job, error } = await supabase
      .from('jobs')
      .update({ deleted_at: null, stage: '已结束' })
      .eq('id', id)
      .select()
      .single();

    if (error || !job) {
      console.log('[restoreJob] Failed or not found:', error);
      return { error: error?.message ?? 'Job not found' };
    }

    const { data: tags } = await supabase
      .from('job_tags')
      .select('*')
      .eq('job_id', id);

    revalidatePath('/');
    console.log('[restoreJob] Done');

    return { job: transformDbJobToJobWithTags(job as DbJob, tags ?? []) };
  } catch (err) {
    console.error('[restoreJob] Unexpected error:', err);
    return { error: 'Failed to restore job' };
  }
}

/**
 * 永久删除岗位（不可恢复）
 */
export async function permanentDeleteJob(
  id: string
): Promise<{ success: boolean; error?: string }> {
  console.log('[permanentDeleteJob] Permanently deleting job:', id);

  try {
    const supabase = await createServerSupabaseClient();

    // job_tags 会通过 ON DELETE CASCADE 自动清理
    const { error } = await supabase
      .from('jobs')
      .delete()
      .eq('id', id);

    if (error) {
      console.log('[permanentDeleteJob] Failed:', error.message);
      return { success: false, error: error.message };
    }

    revalidatePath('/');
    console.log('[permanentDeleteJob] Done');
    return { success: true };
  } catch (err) {
    console.error('[permanentDeleteJob] Unexpected error:', err);
    return { success: false, error: 'Failed to permanently delete job' };
  }
}
