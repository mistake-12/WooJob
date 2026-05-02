/**
 * 数据库实体类型定义
 * 存放与 Supabase 数据库交互时的类型（snake_case + 数据库枚举）
 * 与前端 UI 类型（types/index.ts）分开，避免混淆
 */

import type { JobStage, TaskType } from './index';

// ─────────────────────────────────────────────────────────────────────────────
// 数据库行类型（snake_case，与 Supabase 返回格式一致）
// ─────────────────────────────────────────────────────────────────────────────

/** profiles 表行 */
export interface DbProfile {
  id: string;
  email: string;
  nickname: string | null;
  target_role: string | null;
  resume_url: string | null;
  created_at?: string;
  updated_at?: string;
}

/** jobs 表行 */
export interface DbJob {
  id: string;
  user_id: string;
  company: string;
  title: string;
  stage: JobStage;
  deadline: string | null;
  key_time: string | null;
  website: string | null;
  description: string | null;
  notes: string | null;
  progress: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

/** job_tags 表行 */
export interface DbJobTag {
  id: string;
  job_id: string;
  tag_type: 'referral' | 'round' | 'interview_time' | 'remaining';
  tag_value: string;
}

/** tasks 表行 */
export interface DbTask {
  id: string;
  user_id: string;
  job_id: string | null;
  title: string;
  company: string | null;
  task_date: string;
  task_time: string | null;
  tag: TaskType;
  round: string | null;
  meeting_link: string | null;
  resume_filename: string | null;
  notes: string | null;
  is_completed: boolean;
  created_at: string;
  updated_at: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// API 返回类型（camelCase，前端使用）
// ─────────────────────────────────────────────────────────────────────────────

/** 岗位标签 */
export interface JobTags {
  referral?: '有' | '无' | '学长';
  round?: string;
  interviewTime?: string;
  remaining?: string;
}

/** 岗位（含标签），前端渲染用 */
export interface JobWithTags {
  id: string;
  company: string;
  title: string;
  stage: JobStage;
  deadline: string | null;
  keyTime: string | null;
  website: string | null;
  description: string | null;
  notes: string | null;
  progress: number;
  createdAt: string;
  updatedAt: string;
  tags: JobTags;
}

/** 任务，前端渲染用 */
export interface TaskWithJob {
  id: string;
  jobId: string | null;
  title: string;
  company: string | null;
  taskDate: string;
  taskTime: string | null;
  tag: TaskType;
  round: string | null;
  meetingLink: string | null;
  resumeFilename: string | null;
  notes: string | null;
  isCompleted: boolean;
  createdAt: string;
  updatedAt: string;
}

/** 统计数据 */
export interface Stats {
  totalJobs: number;
  trashedCount: number;
  successRate: string;
  status: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// 输入类型（前端调用 Server Action 时传入）
// ─────────────────────────────────────────────────────────────────────────────

/** 新建岗位输入 */
export interface CreateJobInput {
  company: string;
  title: string;
  stage?: JobStage;
  deadline?: string;
  keyTime?: string;
  website?: string;
  description?: string;
  tags?: JobTags;
}

/** 更新岗位输入 */
export interface UpdateJobInput {
  company?: string;
  title?: string;
  stage?: JobStage;
  deadline?: string | null;
  keyTime?: string | null;
  website?: string | null;
  description?: string | null;
  notes?: string | null;
  tags?: {
    referral?: '有' | '无' | '学长' | null;
    round?: string | null;
    interviewTime?: string | null;
    remaining?: string | null;
  };
}

/** 新建任务输入 */
export interface CreateTaskInput {
  title: string;
  company?: string;
  taskDate: string;
  taskTime?: string;
  tag: TaskType;
  jobId?: string;
  round?: string;
  meetingLink?: string;
  resumeFilename?: string;
  notes?: string;
}

/** 更新任务输入 */
export interface UpdateTaskInput {
  title?: string;
  company?: string | null;
  taskDate?: string;
  taskTime?: string | null;
  tag?: TaskType;
  round?: string | null;
  meetingLink?: string | null;
  resumeFilename?: string | null;
  notes?: string | null;
  isCompleted?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Server Action 统一返回类型
// ─────────────────────────────────────────────────────────────────────────────

export type JobActionResult =
  | { job: JobWithTags }
  | { jobs: JobWithTags[] }
  | { success: boolean }
  | { error: string };

export type TaskActionResult =
  | { task: TaskWithJob }
  | { tasks: TaskWithJob[] }
  | { error: string };

export type StatsActionResult =
  | { stats: Stats }
  | { error: string };

export type ProfileActionResult =
  | { profile: DbProfile }
  | { error: string };

/** 更新 profile 输入 */
export interface UpdateProfileInput {
  nickname?: string | null;
  target_role?: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// AI / LLM 相关类型
// ─────────────────────────────────────────────────────────────────────────────

/** AI 会话 */
export interface AIConversation {
  id: string;
  userId: string;
  title: string;
  model: string;
  createdAt: string;
  updatedAt: string;
}

/** AI 消息角色 */
export type AIMessageRole = 'user' | 'assistant' | 'system';

/** AI 消息附件（图片等） */
export interface AIMessageAttachment {
  type: 'image_url';
  url: string; // base64 data URL 或外部 URL
}

/** AI 单条消息 */
export interface AIMessage {
  id: string;
  conversationId: string;
  role: AIMessageRole;
  content: string;
  attachments: AIMessageAttachment[];
  extraData: AIParsedData | null;
  createdAt: string;
}

/** AI 解析出的结构化数据 */
export interface AIParsedData {
  type: 'job' | 'task' | null;
  job?: Partial<CreateJobInput>;
  task?: Partial<CreateTaskInput>;
}

