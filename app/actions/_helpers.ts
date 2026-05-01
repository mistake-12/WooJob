/**
 * Server Actions 辅助函数
 * 提供数据库行类型与 API 返回类型之间的转换逻辑
 */

import type {
  DbJob,
  DbJobTag,
  DbTask,
  JobWithTags,
  TaskWithJob,
  JobTags,
} from '@/types/database';

/**
 * 将前端 tag key 转换为数据库 tag_type 枚举值
 */
export function mapFrontendTagToDb(
  key: string
): 'referral' | 'round' | 'interview_time' | 'remaining' {
  const map: Record<string, 'referral' | 'round' | 'interview_time' | 'remaining'> =
    {
      referral: 'referral',
      round: 'round',
      interviewTime: 'interview_time',
      remaining: 'remaining',
    };
  return map[key] ?? 'remaining';
}

/**
 * 将数据库 tag_type 枚举值转换回前端 tag key
 */
export function mapDbTagToFrontend(
  tagType: DbJobTag['tag_type'],
  tagValue: string
): Partial<JobTags> {
  switch (tagType) {
    case 'referral':
      return { referral: tagValue as '有' | '无' | '学长' };
    case 'round':
      return { round: tagValue };
    case 'interview_time':
      return { interviewTime: tagValue };
    case 'remaining':
      return { remaining: tagValue };
    default:
      return {};
  }
}

/**
 * 将数据库 jobs 行（snake_case）转换为 JobWithTags（camelCase）并合并 tags
 */
export function transformDbJobToJobWithTags(
  job: DbJob,
  tags: DbJobTag[]
): JobWithTags {
  const tagsResult: JobTags = {};

  for (const tag of tags) {
    const mapped = mapDbTagToFrontend(tag.tag_type, tag.tag_value);
    Object.assign(tagsResult, mapped);
  }

  return {
    id: job.id,
    company: job.company,
    title: job.title,
    stage: job.stage,
    deadline: job.deadline,
    keyTime: job.key_time,
    website: job.website,
    description: job.description,
    notes: job.notes,
    progress: job.progress,
    createdAt: job.created_at,
    updatedAt: job.updated_at,
    tags: tagsResult,
  };
}

/**
 * 将数据库 tasks 行（snake_case）转换为 TaskWithJob（camelCase）
 */
export function transformDbTaskToTaskWithJob(task: DbTask): TaskWithJob {
  return {
    id: task.id,
    jobId: task.job_id,
    title: task.title,
    company: task.company,
    taskDate: task.task_date,
    taskTime: task.task_time,
    tag: task.tag,
    round: task.round,
    meetingLink: task.meeting_link,
    resumeFilename: task.resume_filename,
    notes: task.notes,
    isCompleted: task.is_completed,
    createdAt: task.created_at,
    updatedAt: task.updated_at,
  };
}
