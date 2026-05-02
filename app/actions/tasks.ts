'use server';

import { revalidatePath } from 'next/cache';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import type { DbTask, TaskWithJob, CreateTaskInput, UpdateTaskInput } from '@/types/database';
import { transformDbTaskToTaskWithJob } from './_helpers';

async function getSupabase() {
  return createServerSupabaseClient();
}

/**
 * 按月获取任务列表（YYYY-MM 格式，不传则返回当月）
 */
export async function getTasks(
  month?: string
): Promise<{ tasks?: TaskWithJob[]; error?: string }> {
  const targetMonth = month ?? new Date().toISOString().slice(0, 7);
  console.log('[getTasks] Fetching tasks for month:', targetMonth);

  try {
    const supabase = await getSupabase();

    // 用 gte/lt 做日期范围过滤，避免 LIKE 字符串匹配在跨月边界出错
    const startDate = `${targetMonth}-01`;
    const nextMonth = targetMonth.slice(0, 5) + String(parseInt(targetMonth.slice(5, 7)) + 1).padStart(2, '0') + '-01';

    const { data: tasks, error } = await supabase
      .from('tasks')
      .select('*')
      .gte('task_date', startDate)
      .lt('task_date', nextMonth)
      .order('task_date', { ascending: true })
      .order('task_time', { ascending: true });

    console.log('[getTasks] Query result, count:', tasks?.length ?? 0, 'error:', error);

    if (error) return { error: error.message };

    const mapped = (tasks ?? []).map(transformDbTaskToTaskWithJob);
    console.log('[getTasks] Returning tasks count:', mapped.length);
    return { tasks: mapped };
  } catch (err) {
    console.error('[getTasks] Unexpected error:', err);
    return { error: 'Failed to fetch tasks' };
  }
}

/**
 * 新建日程任务
 */
export async function createTask(
  input: CreateTaskInput
): Promise<{ task?: TaskWithJob; error?: string }> {
  console.log('[createTask] Creating task:', input.title, 'on', input.taskDate);

  try {
    const supabase = await getSupabase();

    // 获取当前用户 ID（RLS 依赖 user_id）
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error('[createTask] Not authenticated');
      return { error: '未登录或会话已过期' };
    }

    const { data: task, error } = await supabase
      .from('tasks')
      .insert({
        user_id: user.id,
        title: input.title,
        company: input.company ?? null,
        task_date: input.taskDate,
        task_time: input.taskTime ?? null,
        tag: input.tag,
        job_id: input.jobId ?? null,
        round: input.round ?? null,
        meeting_link: input.meetingLink ?? null,
        resume_filename: input.resumeFilename ?? null,
        notes: input.notes ?? null,
      })
      .select()
      .single();

    console.log('[createTask] Insert result, taskId:', task?.id, 'error:', error);

    if (error || !task) {
      return { error: error?.message ?? 'Failed to create task' };
    }

    revalidatePath('/');
    console.log('[createTask] Done, revalidated path');

    return { task: transformDbTaskToTaskWithJob(task as DbTask) };
  } catch (err) {
    console.error('[createTask] Unexpected error:', err);
    return { error: 'Failed to create task' };
  }
}

/**
 * 更新任务详情
 */
export async function updateTask(
  id: string,
  input: UpdateTaskInput
): Promise<{ task?: TaskWithJob; error?: string }> {
  console.log('[updateTask] Updating task:', id);

  try {
    const supabase = await getSupabase();

    // 1. 检查是否存在
    const { data: existing, error: fetchError } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !existing) {
      console.log('[updateTask] Task not found:', id);
      return { error: fetchError?.message ?? 'Task not found' };
    }

    // 2. 构建更新字段
    const updateFields: Partial<DbTask> = {};
    if (input.title !== undefined) updateFields.title = input.title;
    if (input.company !== undefined) updateFields.company = input.company;
    if (input.taskDate !== undefined) updateFields.task_date = input.taskDate;
    if (input.taskTime !== undefined) updateFields.task_time = input.taskTime;
    if (input.tag !== undefined) updateFields.tag = input.tag;
    if (input.round !== undefined) updateFields.round = input.round;
    if (input.meetingLink !== undefined) updateFields.meeting_link = input.meetingLink;
    if (input.resumeFilename !== undefined) updateFields.resume_filename = input.resumeFilename;
    if (input.notes !== undefined) updateFields.notes = input.notes;
    if (input.isCompleted !== undefined) updateFields.is_completed = input.isCompleted;

    if (Object.keys(updateFields).length === 0) {
      console.log('[updateTask] No fields to update, returning existing');
      return { task: transformDbTaskToTaskWithJob(existing as DbTask) };
    }

    const { data: updated, error: updateError } = await supabase
      .from('tasks')
      .update(updateFields)
      .eq('id', id)
      .select()
      .single();

    console.log('[updateTask] Update result, error:', updateError);

    if (updateError) return { error: updateError.message };

    revalidatePath('/');
    console.log('[updateTask] Done');

    return { task: transformDbTaskToTaskWithJob(updated as DbTask) };
  } catch (err) {
    console.error('[updateTask] Unexpected error:', err);
    return { error: 'Failed to update task' };
  }
}

/**
 * 切换任务完成状态（点击左侧圆圈时调用）
 */
export async function toggleTaskCompletion(
  id: string
): Promise<{ task?: TaskWithJob; error?: string }> {
  console.log('[toggleTaskCompletion] Toggling task:', id);

  try {
    const supabase = await getSupabase();

    // 1. 查当前状态
    const { data: current, error: fetchError } = await supabase
      .from('tasks')
      .select('is_completed')
      .eq('id', id)
      .single();

    if (fetchError || !current) {
      console.log('[toggleTaskCompletion] Task not found:', id);
      return { error: fetchError?.message ?? 'Task not found' };
    }

    // 2. 取反更新
    const { data: task, error } = await supabase
      .from('tasks')
      .update({ is_completed: !current.is_completed })
      .eq('id', id)
      .select()
      .single();

    if (error || !task) {
      console.log('[toggleTaskCompletion] Update failed:', error);
      return { error: error?.message ?? 'Failed to toggle task' };
    }

    revalidatePath('/');
    console.log('[toggleTaskCompletion] Done, new status:', task.is_completed);

    return { task: transformDbTaskToTaskWithJob(task as DbTask) };
  } catch (err) {
    console.error('[toggleTaskCompletion] Unexpected error:', err);
    return { error: 'Failed to toggle task completion' };
  }
}
