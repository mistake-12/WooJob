/**
 * WooJob 全局状态管理
 * 统一管理 jobs、trashedJobs、tasks 的数据及操作
 */

import { create } from 'zustand';
import type {
  JobWithTags,
  TaskWithJob,
  CreateJobInput,
  UpdateJobInput,
  CreateTaskInput,
  UpdateTaskInput,
} from '@/types/database';
import type { JobStage, TaskType } from '@/types';
import { normalizeToISODate } from '@/lib/dateUtils';

import * as jobsActions from '@/app/actions/jobs';
import * as tasksActions from '@/app/actions/tasks';
import * as statsActions from '@/app/actions/stats';
import * as aiActions from '@/app/actions/ai';
import type { AIConversation, AIMessage, AIMessageAttachment, AIParsedData } from '@/types/database';
import type { AIMode } from '@/app/actions/ai-helpers';

// ─────────────────────────────────────────────────────────────────────────────
// 组件用类型（继承自 types/index.ts，但 id/jobId 统一为 string）
// ─────────────────────────────────────────────────────────────────────────────

export interface Job {
  id: string;
  company: string;
  title: string;
  stage: JobStage;
  deadline: string;
  time?: string;
  tags: {
    referral?: '有' | '无' | '学长';
    remaining?: string;
    round?: string;
    interviewTime?: string;
  };
  progress: number;
  description?: string;
  notes?: string;
  website?: string;
}

export interface Task {
  id: string;
  jobId?: string;
  date: string; // UI 显示格式：'今天' | '明天' | '4月20日' | '2026-04-20'
  time: string;
  title: string;
  company: string;
  round?: string;
  tag: TaskType;
  meetingLink?: string;
  resumeFilename?: string;
  notes?: string;
  isCompleted: boolean;
}

export interface Stats {
  totalJobs: number;
  trashedCount: number;
  successRate: string;
  status: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Store 接口
// ─────────────────────────────────────────────────────────────────────────────

interface JobStore {
  // ── State ────────────────────────────────────────────────────────────────
  jobs: Job[];
  trashedJobs: Job[];
  tasks: Task[];
  stats: Stats;
  isLoading: boolean;
  error: string | null;

  // ── Jobs Actions ────────────────────────────────────────────────────────
  fetchJobs: () => Promise<void>;
  createJob: (input: CreateJobInput) => Promise<Job | null>;
  updateJob: (id: string, input: UpdateJobInput) => Promise<Job | null>;
  updateJobStage: (id: string, newStage: string) => Promise<void>;

  // ── Trash Actions ────────────────────────────────────────────────────────
  fetchTrashedJobs: () => Promise<void>;
  trashJob: (id: string) => Promise<void>;
  restoreJob: (id: string) => Promise<void>;
  permanentDeleteJob: (id: string) => Promise<void>;

  // ── Tasks Actions ────────────────────────────────────────────────────────
  fetchTasks: (month?: string) => Promise<void>;
  createTask: (input: CreateTaskInput) => Promise<Task | null>;
  updateTask: (id: string, input: UpdateTaskInput) => Promise<Task | null>;
  toggleTaskCompletion: (id: string) => Promise<void>;

  // ── Stats Actions ───────────────────────────────────────────────────────
  fetchStats: () => Promise<void>;

  // ── AI 对话 ────────────────────────────────────────────────────────────────
  /** 对话列表 */
  aiConversations: AIConversation[];
  /** 当前选中的会话 ID */
  aiCurrentConversationId: string | null;
  /** 当前会话消息列表 */
  aiMessages: AIMessage[];
  /** 是否正在等待 AI 回复 */
  aiIsLoading: boolean;
  /** AI 错误信息 */
  aiError: string | null;
  /** 当前 AI 模式 */
  aiMode: AIMode;
  /** 解析出的结构化数据（用于确认弹窗） */
  aiParsedData: AIParsedData | null;
  /** AI 欢迎语 */
  aiWelcomeMessage: string;

  /** 加载对话列表 */
  fetchConversations: () => Promise<void>;
  /** 创建新对话并切换 */
  startNewConversation: (title?: string) => Promise<string | null>;
  /** 切换到指定对话，加载其消息 */
  switchConversation: (id: string) => Promise<void>;
  /** 删除对话 */
  deleteConversation: (id: string) => Promise<void>;
  /** 发送消息（自动追加用户消息 + AI 回复） */
  sendAIMessage: (content: string, attachments?: AIMessageAttachment[]) => Promise<void>;
  /** 设置当前 AI 模式 */
  setAIMode: (mode: AIMode) => void;
  /** 清除解析数据（用户取消确认时） */
  clearAIParsedData: () => void;

  // ── Helpers ─────────────────────────────────────────────────────────────
  getJobById: (id: string) => Job | undefined;
  getTaskById: (id: string) => Task | undefined;
}

// ─────────────────────────────────────────────────────────────────────────────
// 类型转换工具（内部使用）
// ─────────────────────────────────────────────────────────────────────────────

/** 将数据库 JobWithTags 转为 UI 组件 Job */
function dbJobToUiJob(db: JobWithTags): Job {
  const time =
    db.keyTime ?? db.deadline ?? '';
  return {
    id: db.id,
    company: db.company,
    title: db.title,
    stage: db.stage,
    deadline: db.deadline ?? '',
    time,
    tags: db.tags as Job['tags'],
    progress: db.progress,
    description: db.description ?? undefined,
    notes: db.notes ?? undefined,
    website: db.website ?? undefined,
  };
}

/** 将 UI Job 转为 CreateJobInput（用于新建） */
function uiJobToCreateInput(job: Job): CreateJobInput {
  return {
    company: job.company,
    title: job.title,
    stage: job.stage,
    deadline: job.deadline || undefined,
    keyTime: job.time || undefined,
    website: job.website,
    description: job.description,
    tags: {
      referral: job.tags.referral,
      round: job.tags.round,
      interviewTime: job.tags.interviewTime,
      remaining: job.tags.remaining,
    },
  };
}

/** 将 UI Job 转为 UpdateJobInput（用于更新） */
function uiJobToUpdateInput(job: Job): UpdateJobInput {
  return {
    company: job.company,
    title: job.title,
    stage: job.stage,
    deadline: job.deadline || null,
    keyTime: job.time || null,
    website: job.website || null,
    description: job.description || null,
    notes: job.notes || null,
    tags: {
      referral: job.tags.referral ?? null,
      round: job.tags.round ?? null,
      interviewTime: job.tags.interviewTime ?? null,
      remaining: job.tags.remaining ?? null,
    },
  };
}

/** 将数据库 TaskWithJob 转为 UI 组件 Task */
function dbTaskToUiTask(db: TaskWithJob): Task {
  return {
    id: db.id,
    jobId: db.jobId ?? undefined,
    date: normalizeToISODate(db.taskDate),
    time: db.taskTime ?? '',
    title: db.title,
    company: db.company ?? '',
    round: db.round ?? undefined,
    tag: db.tag,
    meetingLink: db.meetingLink ?? undefined,
    resumeFilename: db.resumeFilename ?? undefined,
    notes: db.notes ?? undefined,
    isCompleted: db.isCompleted,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Store 实现
// ─────────────────────────────────────────────────────────────────────────────

export const useJobStore = create<JobStore>((set, get) => ({
  // ── Initial State ────────────────────────────────────────────────────────
  jobs: [],
  trashedJobs: [],
  tasks: [],
  stats: { totalJobs: 0, trashedCount: 0, successRate: '0%', status: '求职中' },
  isLoading: false,
  error: null,

  // ── AI 对话 State ──────────────────────────────────────────────────────
  aiConversations: [],
  aiCurrentConversationId: null,
  aiMessages: [],
  aiIsLoading: false,
  aiError: null,
  aiMode: 'chat',
  aiParsedData: null,
  aiWelcomeMessage: '有什么求职问题可以随时问我！',

  // ── Jobs ────────────────────────────────────────────────────────────────

  fetchJobs: async () => {
    set({ isLoading: true, error: null });
    const result = await jobsActions.getJobs();
    if (result.error) {
      set({ isLoading: false, error: result.error });
      return;
    }
    const jobs = (result.jobs ?? []).map(dbJobToUiJob);
    set({ jobs, isLoading: false });
  },

  createJob: async (input) => {
    set({ isLoading: true, error: null });
    const result = await jobsActions.createJob(input);
    if (result.error || !result.job) {
      set({ isLoading: false, error: result.error ?? 'Failed to create job' });
      return null;
    }
    // 直接使用服务端返回的完整 job 数据（包含真实 id、created_at 等）
    const job = dbJobToUiJob(result.job);
    set((s) => ({ jobs: [job, ...s.jobs], isLoading: false }));
    return job;
  },

  updateJob: async (id, input) => {
    const result = await jobsActions.updateJob(id, input);
    if (result.error || !result.job) {
      set({ error: result.error ?? 'Failed to update job' });
      return null;
    }
    const job = dbJobToUiJob(result.job);
    set((s) => ({
      jobs: s.jobs.map((j) => (j.id === id ? job : j)),
    }));
    return job;
  },

  updateJobStage: async (id, newStage) => {
    const prev = get().jobs;
    // 乐观更新
    set((s) => ({
      jobs: s.jobs.map((j) => (j.id === id ? { ...j, stage: newStage as JobStage } : j)),
    }));
    const result = await jobsActions.updateJobStage(id, newStage);
    if (result.error) {
      // 回滚
      set({ jobs: prev });
    }
  },

  // ── Trash ──────────────────────────────────────────────────────────────

  fetchTrashedJobs: async () => {
    const result = await jobsActions.getTrashedJobs();
    if (result.error) return;
    set({ trashedJobs: (result.jobs ?? []).map(dbJobToUiJob) });
  },

  trashJob: async (id) => {
    const prev = get().jobs;
    const job = prev.find((j) => j.id === id);
    if (!job) return;
    // 乐观更新
    set((s) => ({
      jobs: s.jobs.filter((j) => j.id !== id),
      trashedJobs: [{ ...job, stage: '已结束' as JobStage }, ...s.trashedJobs],
    }));
    const result = await jobsActions.trashJob(id);
    if (result.error) {
      set({ jobs: prev });
    }
  },

  restoreJob: async (id) => {
    const prev = get().trashedJobs;
    const job = prev.find((j) => j.id === id);
    if (!job) return;
    set((s) => ({
      trashedJobs: s.trashedJobs.filter((j) => j.id !== id),
      jobs: [...s.jobs, { ...job, stage: '已结束' as JobStage }],
    }));
    const result = await jobsActions.restoreJob(id);
    if (result.error) {
      set({ trashedJobs: prev });
    }
  },

  permanentDeleteJob: async (id) => {
    const prev = get().trashedJobs;
    set((s) => ({
      trashedJobs: s.trashedJobs.filter((j) => j.id !== id),
    }));
    const result = await jobsActions.permanentDeleteJob(id);
    if (result.error) {
      set({ trashedJobs: prev });
    }
  },

  // ── Tasks ──────────────────────────────────────────────────────────────

  fetchTasks: async (month) => {
    const result = await tasksActions.getTasks(month);
    if (result.error) return;
    set({ tasks: (result.tasks ?? []).map(dbTaskToUiTask) });
  },

  createTask: async (input) => {
    const result = await tasksActions.createTask(input);
    if (result.error || !result.task) return null;
    const task = dbTaskToUiTask(result.task);
    set((s) => ({ tasks: [task, ...s.tasks] }));
    return task;
  },

  updateTask: async (id, input) => {
    const result = await tasksActions.updateTask(id, input);
    if (result.error || !result.task) return null;
    const task = dbTaskToUiTask(result.task);
    set((s) => ({
      tasks: s.tasks.map((t) => (t.id === id ? task : t)),
    }));
    return task;
  },

  toggleTaskCompletion: async (id) => {
    const prev = get().tasks;
    const task = prev.find((t) => t.id === id);
    if (!task) return;
    // 乐观更新
    set((s) => ({
      tasks: s.tasks.map((t) =>
        t.id === id ? { ...t, isCompleted: !t.isCompleted } : t
      ),
    }));
    const result = await tasksActions.toggleTaskCompletion(id);
    if (result.error) {
      set({ tasks: prev });
    }
  },

  // ── Stats ──────────────────────────────────────────────────────────────

  fetchStats: async () => {
    const result = await statsActions.getStats();
    if (result.error) return;
    if (result.stats) {
      set({ stats: result.stats });
    }
  },

  // ── AI 对话 Actions ────────────────────────────────────────────────────

  fetchConversations: async () => {
    const result = await aiActions.getConversations();
    if (result.error) return;
    set({ aiConversations: result.conversations ?? [] });
  },

  startNewConversation: async (title?: string) => {
    const result = await aiActions.createConversation(title);
    if (result.error || !result.conversation) return null;
    set((s) => ({
      aiConversations: [result.conversation!, ...s.aiConversations],
      aiCurrentConversationId: result.conversation!.id,
      aiMessages: [],
      aiError: null,
      aiWelcomeMessage: '有什么求职问题可以随时问我！',
    }));
    return result.conversation!.id;
  },

  switchConversation: async (id: string) => {
    const result = await aiActions.getMessages(id);
    if (result.error) {
      set({ aiError: result.error });
      return;
    }
    set({
      aiCurrentConversationId: id,
      aiMessages: result.messages ?? [],
      aiError: null,
      aiWelcomeMessage: '有什么求职问题可以随时问我！',
    });
  },

  deleteConversation: async (id: string) => {
    const result = await aiActions.deleteConversation(id);
    if (result.error) return;
    const prev = get();
    set((s) => ({
      aiConversations: s.aiConversations.filter((c) => c.id !== id),
      aiCurrentConversationId:
        prev.aiCurrentConversationId === id ? null : prev.aiCurrentConversationId,
      aiMessages: prev.aiCurrentConversationId === id ? [] : prev.aiMessages,
    }));
  },

  sendAIMessage: async (content, attachments = []) => {
    const { aiCurrentConversationId, aiMode } = get();
    if (!aiCurrentConversationId) return;

    // 乐观追加用户消息
    const tempUserMsg: AIMessage = {
      id: `temp-${Date.now()}`,
      conversationId: aiCurrentConversationId,
      role: 'user',
      content,
      attachments,
      extraData: null,
      createdAt: new Date().toISOString(),
    };
    set((s) => ({
      aiMessages: [...s.aiMessages, tempUserMsg],
      aiIsLoading: true,
      aiError: null,
      aiParsedData: null,
    }));

    const result = await aiActions.sendMessage({
      conversationId: aiCurrentConversationId,
      content,
      attachments,
      mode: aiMode,
    });

    if (result.error) {
      set({ aiIsLoading: false, aiError: result.error });
      return;
    }

    // 追加 AI 回复
    if (result.message) {
      set((s) => ({
        aiMessages: [...s.aiMessages, result.message!],
        aiIsLoading: false,
        aiParsedData: result.parsedData ?? null,
      }));
    }
  },

  setAIMode: (mode) => {
    set({ aiMode: mode });
  },

  clearAIParsedData: () => {
    set({ aiParsedData: null });
  },

  // ── Helpers ─────────────────────────────────────────────────────────────

  getJobById: (id) => get().jobs.find((j) => j.id === id),

  getTaskById: (id) => get().tasks.find((t) => t.id === id),
}));
