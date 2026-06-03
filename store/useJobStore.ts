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
import type { JobOrderUpdate } from '@/app/actions/jobs';
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
  position: number;
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
  /** 首次数据加载完成前的全局 loading 标记（用于控制 page.tsx 的 skeleton） */
  isInitialLoading: boolean;
  error: string | null;
  /** 正在按月加载的月份，避免重复请求导致闪烁 */
  loadingMonth: string | null;
  /** AgendaView 已加载的历史月份集合（跨视图切换保留） */
  loadedMonths: Set<string>;
  /** 将某历史月份标记为已加载 */
  markMonthLoaded: (month: string) => void;

  // ── Auth State ─────────────────────────────────────────────────────────
  /** 调用 signOut 后需要清理所有本地状态，防止数据串台 */
  resetStore: () => void;

  // ── Jobs Actions ────────────────────────────────────────────────────────
  fetchJobs: () => Promise<void>;
  _seedTemplates: () => void;
  createJob: (input: CreateJobInput) => Promise<Job | null>;
  updateJob: (id: string, input: UpdateJobInput) => Promise<Job | null>;
  updateJobStage: (id: string, newStage: string) => Promise<void>;
  reorderJobs: (
    jobId: string,
    sourceStage: JobStage,
    destinationStage: JobStage,
    sourceIndex: number,
    destinationIndex: number
  ) => Promise<void>;

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
  /** 更新对话标题（生成后回调） */
  updateConversationTitle: (id: string, title: string) => void;
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
    position: db.position ?? 0,
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
  isInitialLoading: true,
  error: null,
  loadingMonth: null,
  loadedMonths: new Set([new Date().toISOString().slice(0, 7)]),

  // ── Auth State ──────────────────────────────────────────────────────
  resetStore: () => {
    set({
      jobs: [],
      trashedJobs: [],
      tasks: [],
      stats: { totalJobs: 0, trashedCount: 0, successRate: '0%', status: '求职中' },
      isLoading: false,
      isInitialLoading: true,
      error: null,
      loadingMonth: null,
      loadedMonths: new Set([new Date().toISOString().slice(0, 7)]),
      // AI 状态全部重置，防止新用户看到旧用户的对话记录
      aiConversations: [],
      aiCurrentConversationId: null,
      aiMessages: [],
      aiIsLoading: false,
      aiError: null,
      aiMode: 'chat',
      aiParsedData: null,
      aiWelcomeMessage: '有什么求职问题可以随时问我！',
    });
    // 清除简历的 localStorage 缓存，防止新登录用户看到旧简历列表
    localStorage.removeItem('resume_info');
  },

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

  /** 新用户模板数据，直接注入 store（和真实卡片走完全一致的代码路径） */
  _seedTemplates: () => {
    const templates: Job[] = [
      { id: 'template-1', company: '字节跳动', title: '高级产品经理', stage: '待投递', deadline: '2026-06-15', time: '', tags: { referral: '有' }, progress: 10, position: 0 },
      { id: 'template-2', company: '腾讯', title: 'AI 产品经理', stage: '已投递', deadline: '2026-06-10', time: '', tags: {}, progress: 30, position: 0 },
      { id: 'template-3', company: '美团', title: '策略产品经理', stage: '面试中', deadline: '2026-06-08', time: '', tags: { round: '技术二面' }, progress: 74, position: 0 },
      { id: 'template-4', company: '阿里巴巴', title: '数据产品经理', stage: 'Offer', deadline: '2026-06-01', time: '', tags: {}, progress: 100, position: 0 },
    ];
    // 重新编号 position 以避免各列内部排序冲突
    const jobsByStage = new Map<JobStage, Job[]>();
    templates.forEach((t) => {
      const list = jobsByStage.get(t.stage) ?? [];
      list.push(t);
      jobsByStage.set(t.stage, list);
    });
    const seeded: Job[] = [];
    jobsByStage.forEach((list) => {
      list.forEach((t, i) => { t.position = i; seeded.push(t); });
    });
    set({ jobs: seeded });
  },

  fetchJobs: async () => {
    set({ isLoading: true, error: null });
    const result = await jobsActions.getJobs();
    if (result.error) {
      set({ isLoading: false, error: result.error });
      return;
    }
    const jobs = (result.jobs ?? []).map(dbJobToUiJob);
    if (jobs.length === 0) {
      get()._seedTemplates();
    } else {
      set({ jobs });
    }
    set({ isLoading: false });
  },

  createJob: async (input) => {
    set({ isLoading: true, error: null });
    const result = await jobsActions.createJob(input);
    if (result.error || !result.job) {
      set({ isLoading: false, error: result.error ?? 'Failed to create job' });
      return null;
    }
    const job = dbJobToUiJob(result.job);
    set((s) => ({
      jobs: [job, ...s.jobs.filter((j) => !j.id.startsWith('template-'))],
      isLoading: false,
    }));
    return job;
  },

  updateJob: async (id, input) => {
    const prev = get().jobs;
    const existing = prev.find((j) => j.id === id);
    if (!existing) return null;

    // Step 1: 立刻更新 UI（乐观更新）
    const optimisticJob: Job = {
      ...existing,
      ...input,
      id,
      deadline: input.deadline != null ? input.deadline : existing.deadline,
      time: input.keyTime != null ? input.keyTime : existing.time,
      website: input.website != null ? input.website : existing.website,
      description: input.description != null ? input.description : existing.description,
      notes: input.notes != null ? input.notes : existing.notes,
      tags: {
        referral: input.tags?.referral ?? existing.tags.referral,
        round: input.tags?.round ?? existing.tags.round,
        interviewTime: input.tags?.interviewTime ?? existing.tags.interviewTime,
        remaining: input.tags?.remaining ?? existing.tags.remaining,
      },
    };
    set((s) => ({
      jobs: s.jobs.map((j) => (j.id === id ? optimisticJob : j)),
    }));

    // 模板卡片 → 创建新记录到 DB（模板 id 在 DB 中不存在，不能 UPDATE）
    if (id.startsWith('template-')) {
      const createResult = await jobsActions.createJob({
        company: optimisticJob.company,
        title: optimisticJob.title,
        stage: optimisticJob.stage,
        deadline: optimisticJob.deadline || undefined,
        keyTime: optimisticJob.time || undefined,
        website: optimisticJob.website,
        description: optimisticJob.description,
        tags: {
          referral: optimisticJob.tags.referral,
          round: optimisticJob.tags.round,
          interviewTime: optimisticJob.tags.interviewTime,
          remaining: optimisticJob.tags.remaining,
        },
      });
      if (createResult.error || !createResult.job) {
        set({ jobs: prev, error: createResult.error ?? '保存失败' });
        return null;
      }
      const job = dbJobToUiJob(createResult.job);
      set((s) => ({
        jobs: s.jobs.map((j) => (j.id === id ? job : j)),
      }));
      return job;
    }

    // Step 2: 后台同步到 DB
    const result = await jobsActions.updateJob(id, input);

    if (result.error || !result.job) {
      // Step 3: 失败则回滚 + 提示
      set({ jobs: prev, error: result.error ?? '保存失败' });
      return null;
    }

    // 用服务端返回的完整数据替换乐观数据
    const job = dbJobToUiJob(result.job);
    set((s) => ({
      jobs: s.jobs.map((j) => (j.id === id ? job : j)),
    }));
    return job;
  },

  updateJobStage: async (id, newStage) => {
    const prevJobs = get().jobs;
    const prevTrashedJobs = get().trashedJobs;
    set((s) => ({
      jobs: s.jobs.map((j) => (j.id === id ? { ...j, stage: newStage as JobStage } : j)),
    }));
    const result = await jobsActions.updateJobStage(id, newStage);
    if (result.error) {
      set({ jobs: prevJobs, trashedJobs: prevTrashedJobs });
    }
  },

  reorderJobs: async (
    jobId: string,
    sourceStage: JobStage,
    destinationStage: JobStage,
    sourceIndex: number,
    destinationIndex: number
  ) => {
    const isSameColumn = sourceStage === destinationStage;

    // ── Step 1: 原子化计算重排后的状态 ───────────────────────────
    const currentJobs = get().jobs;

    // 取出源列和目标列（两者可能相同）
    const sourceColumn = currentJobs
      .filter((j) => j.stage === sourceStage)
      .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));

    let destColumn = isSameColumn
      ? sourceColumn
      : currentJobs
          .filter((j) => j.stage === destinationStage)
          .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));

    // splice 操作（会修改数组）
    const [movedJob] = sourceColumn.splice(sourceIndex, 1);
    if (!movedJob) return;

    if (isSameColumn) {
      // 同列：在 sourceColumn 内插入
      sourceColumn.splice(destinationIndex, 0, movedJob);
    } else {
      // 跨列：将 movedJob 的 stage 改掉，再插入 destColumn
      movedJob.stage = destinationStage as JobStage;
      destColumn.splice(destinationIndex, 0, movedJob);
    }

    // 绝对重编号（position 从 0 连续递增，绝无重复）
    const sourceColumnUpdated = sourceColumn.map((job, idx) => ({
      ...job,
      position: idx,
    }));
    const destColumnUpdated = isSameColumn
      ? sourceColumnUpdated
      : destColumn.map((job, idx) => ({
          ...job,
          position: idx,
        }));

    // ── Step 2: 乐观更新 UI ─────────────────────────────────────
    // 用 id → 更新后 job 的 Map 合并回全局 jobs 列表
    const updatedMap = new Map<string, Job>();
    sourceColumnUpdated.forEach((j) => updatedMap.set(j.id, j));
    if (!isSameColumn) {
      destColumnUpdated.forEach((j) => updatedMap.set(j.id, j));
    }
    set((s) => ({
      jobs: s.jobs
        .map((j) => updatedMap.get(j.id) ?? j)
        .sort((a, b) => (a.position ?? 0) - (b.position ?? 0)),
    }));

    // ── Step 3: 批量持久化到 DB ─────────────────────────────────
    // 所有受影响的列全部重写 position，不留遗漏
    const updates: JobOrderUpdate[] = [
      ...sourceColumnUpdated.map((j) => ({
        id: j.id,
        position: j.position,
        stage: sourceStage,
      })),
      ...(isSameColumn
        ? []
        : destColumnUpdated.map((j) => ({
            id: j.id,
            position: j.position,
            stage: destinationStage,
          }))),
    ];

    // 模板卡片 id 以 template- 开头，只存在于 store 不存在于 DB，跳过持久化
    const realUpdates = updates.filter((u) => !u.id.startsWith('template-'));
    if (realUpdates.length > 0) {
      const result = await jobsActions.updateJobsOrder(realUpdates);
      if (result.error) {
        console.error('[reorderJobs] Persist failed, UI may be stale:', result.error);
      }
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
    const targetMonth = month ?? new Date().toISOString().slice(0, 7);
    const { loadingMonth } = get();
    if (loadingMonth === targetMonth) return; // 已经在加载，跳过
    set({ loadingMonth: targetMonth });
    const result = await tasksActions.getTasks(month);
    set({ loadingMonth: null });
    if (result.error) return;
    const newTasks = (result.tasks ?? []).map(dbTaskToUiTask);
    // 始终走 merge 路径：保留本地新建但尚未同步的任务，用服务端返回的任务替换已有
    set((s) => {
      const newIds = new Set(newTasks.map((t) => t.id));
      const existingIds = new Set(s.tasks.map((t) => t.id));
      if (month) {
        // 有 month 参数：保留其他月份的任务 + 合并本月新任务
        const merged = [
          ...s.tasks.filter(
            (t) => normalizeToISODate(t.date).slice(0, 7) !== targetMonth
          ),
          ...newTasks.filter((t) => !existingIds.has(t.id)),
        ];
        return { tasks: merged };
      } else {
        // 无 month 参数：保留本地新建任务（排除临时 id，createTask 回调会替换）
        const keptLocal = s.tasks.filter((t) => !newIds.has(t.id) && !t.id.startsWith('temp-'));
        return { tasks: [...keptLocal, ...newTasks] };
      }
    });
  },

  createTask: async (input) => {
    const prev = get().tasks;
    // 乐观任务：临时 id，待后端返回后替换
    const tempId = `temp-${Date.now()}`;
    const optimisticTask: Task = {
      id: tempId,
      title: input.title ?? '',
      company: input.company ?? '',
      date: input.taskDate ?? '',   // ISO 格式，与 Store 保持一致
      time: input.taskTime ?? '',
      tag: input.tag ?? '待办事项',
      isCompleted: false,
      jobId: input.jobId ?? undefined,
      round: input.round ?? undefined,
      meetingLink: input.meetingLink ?? undefined,
      resumeFilename: input.resumeFilename ?? undefined,
      notes: input.notes ?? undefined,
    };

    // Step 1: 立刻追加到列表
    set((s) => ({ tasks: [optimisticTask, ...s.tasks] }));

    // Step 2: 后台同步
    const result = await tasksActions.createTask(input);

    if (result.error || !result.task) {
      // 失败回滚
      set({ tasks: prev });
      return null;
    }

    // 用真实数据替换临时任务
    const task = dbTaskToUiTask(result.task);
    set((s) => ({
      tasks: s.tasks.map((t) => (t.id === tempId ? task : t)),
    }));
    return task;
  },

  updateTask: async (id, input) => {
    const prev = get().tasks;
    const existing = prev.find((t) => t.id === id);
    if (!existing) return null;

    // Step 1: 立刻应用更改到 UI
    const optimisticTask: Task = {
      ...existing,
      title: input.title ?? existing.title,
      company: input.company ?? existing.company,
      date: input.taskDate ?? existing.date,  // ISO 格式
      time: input.taskTime ?? existing.time,
      tag: input.tag ?? existing.tag,
      isCompleted: input.isCompleted ?? existing.isCompleted,
      round: input.round ?? existing.round,
      meetingLink: input.meetingLink ?? existing.meetingLink,
      resumeFilename: input.resumeFilename ?? existing.resumeFilename,
      notes: input.notes ?? existing.notes,
    };
    set((s) => ({
      tasks: s.tasks.map((t) => (t.id === id ? optimisticTask : t)),
    }));

    // Step 2: 后台同步
    const result = await tasksActions.updateTask(id, input);

    if (result.error || !result.task) {
      // 失败回滚
      set({ tasks: prev });
      return null;
    }

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
      set({ aiError: result.error, aiMessages: [] });
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

  updateConversationTitle: (id: string, title: string) => {
    set((s) => ({
      aiConversations: s.aiConversations.map((c) =>
        c.id === id ? { ...c, title } : c
      ),
    }));
  },

  sendAIMessage: async (content, attachments = []) => {
    const { aiCurrentConversationId, aiMode, aiMessages } = get();
    if (!aiCurrentConversationId) return;

    // 判断是否为当前会话的首条消息
    const isFirstMessage = aiMessages.length === 0;

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

    // 如果是首条消息，异步生成标题（不阻塞主请求）
    if (isFirstMessage) {
      const conversationId = aiCurrentConversationId;
      const userMessage = content;
      const updateTitle = get().updateConversationTitle;

      // 异步后台生成标题，不等待结果
      aiActions.generateConversationTitle(conversationId, userMessage).then((result) => {
        if (result.title) {
          updateTitle(conversationId, result.title);
        }
      }).catch((err) => {
        console.warn('[sendAIMessage] Title generation failed:', err);
      });
    }

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

  // ── Calendar ─────────────────────────────────────────────────────────────
  markMonthLoaded: (month: string) => set((s) => {
    const next = new Set(s.loadedMonths);
    next.add(month);
    return { loadedMonths: next };
  }),
}));
