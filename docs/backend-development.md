# WooJob!!! 后端开发文档

**文档版本:** V1.0
**创建日期:** 2026-04-24
**状态:** 开发中

---

## 一、概述

本文档详细说明 WooJob!!! 后端 Server Actions 的开发计划、代码规范、接口定义及注意事项。前端通过调用这些 Server Actions 实现对 Supabase 数据库的读写操作，最终替换掉现有的 Mock 数据方案。

---

## 二、技术栈与基础约束

| 层面 | 技术选型 |
|------|---------|
| 后端运行时 | Next.js Server Actions (`'use server'`) |
| 数据库 | Supabase PostgreSQL |
| ORM/客户端 | `@supabase/supabase-js` |
| 数据校验 | Zod（规划引入，当前阶段手动校验） |

### 2.1 铁律（违反则 bug）

1. **禁止 `any`**：所有函数参数、返回值必须使用明确 TypeScript 类型。
2. **每个 Server Action 必有 `try-catch`**：错误统一返回 `{ error: string }`。
3. **数据操作前必校验存在性**：`if (!data) return { error: '...' }`。
4. **数据变更后必须 `revalidatePath('/')`**：否则前端页面不会刷新。
5. **禁止 `console.log` 暴露数据库结构**（仅用于开发调试，完成后删除或改为条件日志）。

---

## 三、目录结构

```
app/
└── actions/
    ├── jobs.ts      # 岗位相关：getJobs / createJob / updateJob / updateJobStage / trashJob / getTrashedJobs / restoreJob / permanentDeleteJob
    ├── tasks.ts     # 任务相关：getTasks / createTask / updateTask / toggleTaskCompletion
    └── stats.ts     # 统计相关：getStats
```

> 注意：`app/actions/` 目录不存在，需要新建。

---

## 四、类型定义（数据库实体）

### 4.1 数据库行类型（与 Supabase 交互时使用 snake_case）

```typescript
// jobs 表行
interface DbJob {
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

// job_tags 表行
interface DbJobTag {
  id: string;
  job_id: string;
  tag_type: 'referral' | 'round' | 'interview_time' | 'remaining';
  tag_value: string;
}

// tasks 表行
interface DbTask {
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
```

### 4.2 API 返回类型（前端使用 camelCase）

```typescript
// 岗位（含标签）
interface JobWithTags {
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
  tags: {
    referral?: '有' | '无' | '学长';
    round?: string;
    interviewTime?: string;
    remaining?: string;
  };
}

// 任务
interface TaskWithJob {
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

// 统计
interface Stats {
  totalJobs: number;
  trashedCount: number;
  successRate: string;
  status: string;
}
```

### 4.3 输入类型（前端传入）

```typescript
interface CreateJobInput {
  company: string;
  title: string;
  stage?: JobStage;
  deadline?: string;
  keyTime?: string;
  website?: string;
  description?: string;
  tags?: {
    referral?: '有' | '无' | '学长';
    round?: string;
    interviewTime?: string;
    remaining?: string;
  };
}

interface UpdateJobInput {
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

interface CreateTaskInput {
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

interface UpdateTaskInput {
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
```

---

## 五、Server Actions 详细规格

### 5.1 Jobs Actions（`app/actions/jobs.ts`）

| Action | 说明 | 入口组件 |
|--------|------|---------|
| `getJobs()` | 获取所有未删除岗位 | `page.tsx` 初始化 |
| `createJob(input)` | 新建岗位卡片 | 看板/新建按钮 |
| `updateJob(id, input)` | 更新岗位详情 | `SideDrawer` 保存 |
| `updateJobStage(id, newStage)` | 拖拽更新阶段 | `KanbanColumn` 拖拽松手 |
| `trashJob(id)` | 软删除岗位 | 卡片删除按钮 |
| `getTrashedJobs()` | 获取回收站岗位 | `TrashDrawer` |
| `restoreJob(id)` | 恢复岗位 | 回收站恢复按钮 |
| `permanentDeleteJob(id)` | 永久删除 | 回收站彻底删除 |

#### `getJobs()` 伪代码

```typescript
'use server'
import { supabase } from '@/lib/supabase';
import { revalidatePath } from 'next/cache';

export async function getJobs(): Promise<{ jobs?: JobWithTags[]; error?: string }> {
  try {
    const { data: jobs, error } = await supabase
      .from('jobs')
      .select('*')
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) return { error: error.message };

    const jobsWithTags = await Promise.all(
      (jobs || []).map(async (job) => {
        const { data: tags } = await supabase
          .from('job_tags')
          .select('*')
          .eq('job_id', job.id);

        return transformDbJobToJobWithTags(job, tags || []);
      })
    );

    return { jobs: jobsWithTags };
  } catch (err) {
    console.error('[getJobs] Unexpected error:', err);
    return { error: 'Failed to fetch jobs' };
  }
}
```

#### `createJob(input)` 伪代码

```typescript
export async function createJob(
  input: CreateJobInput
): Promise<{ job?: JobWithTags; error?: string }> {
  try {
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

    if (jobError || !job) return { error: jobError?.message ?? 'Failed to create job' };

    // 2. 插入 job_tags 表
    if (input.tags) {
      const tagsToInsert = Object.entries(input.tags)
        .filter(([, v]) => v != null)
        .map(([k, v]) => ({
          job_id: job.id,
          tag_type: mapFrontendTagToDb(k),
          tag_value: String(v),
        }));

      if (tagsToInsert.length > 0) {
        await supabase.from('job_tags').insert(tagsToInsert);
      }
    }

    // 3. 刷新页面
    revalidatePath('/');

    return { job: transformDbJobToJobWithTags(job, tagsToInsert) };
  } catch (err) {
    console.error('[createJob] Unexpected error:', err);
    return { error: 'Failed to create job' };
  }
}
```

#### `updateJobStage(id, newStage)` 伪代码

```typescript
export async function updateJobStage(
  id: string,
  newStage: JobStage
): Promise<{ job?: JobWithTags; error?: string }> {
  try {
    const { data: job, error } = await supabase
      .from('jobs')
      .update({ stage: newStage })
      .eq('id', id)
      .select()
      .single();

    if (error || !job) return { error: error?.message ?? 'Job not found' };

    const { data: tags } = await supabase
      .from('job_tags')
      .select('*')
      .eq('job_id', id);

    revalidatePath('/');

    return { job: transformDbJobToJobWithTags(job, tags || []) };
  } catch (err) {
    console.error('[updateJobStage] Unexpected error:', err);
    return { error: 'Failed to update job stage' };
  }
}
```

#### `trashJob(id)` 伪代码

```typescript
export async function trashJob(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('jobs')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);

    if (error) return { success: false, error: error.message };

    revalidatePath('/');
    return { success: true };
  } catch (err) {
    console.error('[trashJob] Unexpected error:', err);
    return { success: false, error: 'Failed to trash job' };
  }
}
```

#### `restoreJob(id)` 伪代码

```typescript
export async function restoreJob(
  id: string
): Promise<{ job?: JobWithTags; error?: string }> {
  try {
    const { data: job, error } = await supabase
      .from('jobs')
      .update({ deleted_at: null, stage: '已结束' })
      .eq('id', id)
      .select()
      .single();

    if (error || !job) return { error: error?.message ?? 'Job not found' };

    const { data: tags } = await supabase
      .from('job_tags')
      .select('*')
      .eq('job_id', id);

    revalidatePath('/');
    return { job: transformDbJobToJobWithTags(job, tags || []) };
  } catch (err) {
    console.error('[restoreJob] Unexpected error:', err);
    return { error: 'Failed to restore job' };
  }
}
```

#### `permanentDeleteJob(id)` 伪代码

```typescript
export async function permanentDeleteJob(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // 触发 ON DELETE CASCADE，job_tags 会自动清理
    const { error } = await supabase
      .from('jobs')
      .delete()
      .eq('id', id);

    if (error) return { success: false, error: error.message };

    revalidatePath('/');
    return { success: true };
  } catch (err) {
    console.error('[permanentDeleteJob] Unexpected error:', err);
    return { error: 'Failed to permanently delete job' };
  }
}
```

---

### 5.2 Tasks Actions（`app/actions/tasks.ts`）

| Action | 说明 | 入口组件 |
|--------|------|---------|
| `getTasks(month?)` | 按月获取任务列表 | `AgendaView` 初始化 |
| `createTask(input)` | 新建日程任务 | `AgendaView` 新建按钮 |
| `updateTask(id, input)` | 更新任务详情 | `TaskDetails` 保存 |
| `toggleTaskCompletion(id)` | 切换完成状态 | `AgendaView` 左侧圆圈 |

#### `getTasks(month?)` 伪代码

```typescript
export async function getTasks(
  month?: string
): Promise<{ tasks?: TaskWithJob[]; error?: string }> {
  try {
    // 如果没有传 month，默认当前月份
    const targetMonth = month ?? new Date().toISOString().slice(0, 7);

    const { data: tasks, error } = await supabase
      .from('tasks')
      .select('*')
      .like('task_date', `${targetMonth}%`)
      .order('task_date', { ascending: true })
      .order('task_time', { ascending: true });

    if (error) return { error: error.message };

    return { tasks: (tasks || []).map(transformDbTaskToTaskWithJob) };
  } catch (err) {
    console.error('[getTasks] Unexpected error:', err);
    return { error: 'Failed to fetch tasks' };
  }
}
```

#### `createTask(input)` 伪代码

```typescript
export async function createTask(
  input: CreateTaskInput
): Promise<{ task?: TaskWithJob; error?: string }> {
  try {
    const { data: task, error } = await supabase
      .from('tasks')
      .insert({
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

    if (error || !task) return { error: error?.message ?? 'Failed to create task' };

    revalidatePath('/');
    return { task: transformDbTaskToTaskWithJob(task) };
  } catch (err) {
    console.error('[createTask] Unexpected error:', err);
    return { error: 'Failed to create task' };
  }
}
```

#### `toggleTaskCompletion(id)` 伪代码

```typescript
export async function toggleTaskCompletion(
  id: string
): Promise<{ task?: TaskWithJob; error?: string }> {
  try {
    // 先查当前状态
    const { data: current, error: fetchError } = await supabase
      .from('tasks')
      .select('is_completed')
      .eq('id', id)
      .single();

    if (fetchError || !current) return { error: fetchError?.message ?? 'Task not found' };

    const { data: task, error } = await supabase
      .from('tasks')
      .update({ is_completed: !current.is_completed })
      .eq('id', id)
      .select()
      .single();

    if (error || !task) return { error: error?.message ?? 'Failed to toggle task' };

    revalidatePath('/');
    return { task: transformDbTaskToTaskWithJob(task) };
  } catch (err) {
    console.error('[toggleTaskCompletion] Unexpected error:', err);
    return { error: 'Failed to toggle task completion' };
  }
}
```

---

### 5.3 Stats Actions（`app/actions/stats.ts`）

#### `getStats()` 伪代码

```typescript
export async function getStats(): Promise<{ stats?: Stats; error?: string }> {
  try {
    const [activeResult, trashedResult, offerResult] = await Promise.all([
      supabase.from('jobs').select('id', { count: 'exact' }).is('deleted_at', null).neq('stage', '已结束'),
      supabase.from('jobs').select('id', { count: 'exact' }).not('deleted_at', 'is', null),
      supabase.from('jobs').select('id', { count: 'exact' }).is('deleted_at', null).eq('stage', 'Offer'),
    ]);

    const totalJobs = activeResult.count ?? 0;
    const trashedCount = trashedResult.count ?? 0;
    const offerCount = offerResult.count ?? 0;

    const totalSubmitted = totalJobs + offerCount; // 估算投递总数
    const successRate = totalSubmitted > 0
      ? `${Math.round((offerCount / totalSubmitted) * 100)}%`
      : '0%';

    return {
      stats: {
        totalJobs,
        trashedCount,
        successRate,
        status: '求职中',
      },
    };
  } catch (err) {
    console.error('[getStats] Unexpected error:', err);
    return { error: 'Failed to fetch stats' };
  }
}
```

---

## 六、辅助函数（Helpers）

所有 Actions 文件共享的转换函数，放在 `app/actions/_helpers.ts`：

```typescript
// 将数据库行（snake_case）转换为 API 返回类型（camelCase）+ 合并 tags
function transformDbJobToJobWithTags(
  job: DbJob,
  tags: DbJobTag[]
): JobWithTags { ... }

// 将数据库行转换为任务类型
function transformDbTaskToTaskWithJob(task: DbTask): TaskWithJob { ... }

// 前端 tag key 转数据库 tag_type 枚举
function mapFrontendTagToDb(key: string): string { ... }
```

---

## 七、开发计划

按以下顺序依次开发：

| 阶段 | 任务 | 文件 | 优先级 |
|------|------|------|--------|
| 1 | 创建类型定义文件 | `types/database.ts` | P0 |
| 2 | 创建辅助函数 | `app/actions/_helpers.ts` | P0 |
| 3 | 实现 Jobs 全部 Action | `app/actions/jobs.ts` | P0 |
| 4 | 实现 Tasks 全部 Action | `app/actions/tasks.ts` | P0 |
| 5 | 实现 Stats Action | `app/actions/stats.ts` | P1 |
| 6 | 前端联调接入 | 各组件改造 | P1 |

---

## 八、调试与日志规范

1. **开发阶段**：`console.log` 允许出现在关键节点（insert 前后、查询返回结果）。
2. **日志格式**：`[ActionName] description: value`，便于在终端中 grep 过滤。
3. **生产环境**：所有调试日志需移除或通过 `process.env.NODE_ENV === 'development'` 条件保护。
4. **生产环境禁止暴露**：数据库错误详情、字段名、表名禁止出现在返回给前端的 error 消息中。

---

## 九、注意事项

1. **用户认证**：当前阶段暂不实现 Auth，所有操作以 `anon key` 匿名访问。Supabase 的 RLS 策略会暂时失效（因为没有 `auth.uid()`）。后续接入 Auth 后，需在每个 Action 中通过 `supabase.auth.getUser()` 获取用户 ID。
2. **软删除恢复逻辑**：`restoreJob` 恢复时强制将 `stage` 设为 `'已结束'`，而非恢复原始阶段——这是设计决策，防止用户误操作将已结束岗位恢复回活跃状态。
3. **tags 的 upsert**：`updateJob` 中 tags 更新采用"删除旧标签 + 插入新标签"的策略，因为 Supabase 不支持直接的 upsert 语义。
4. **乐观更新**：前端拖拽时先更新本地状态，再异步调用 Server Action，失败时回滚。这部分属于前端改造，不在后端范围内，但后端 Action 的幂等性需保证。
5. **空值处理**：前端传入 `null` 表示"清除字段"，传入 `undefined` 表示"不修改"。后端需区分这两种情况。
