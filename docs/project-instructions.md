# WooJob!!! 项目开发规范文档

**文档版本:** V1.0
**最后更新:** 2026-04-18
**用途:** 指导后端开发与前后端联调，作为 `docs/第一次对话.md` 的技术补充

---

## 一、项目总览与技术栈 (Project Context & Stack)

### 1.1 一句话说明

WooJob!!! 是一个面向高校毕业生与年轻白领的 All-in-One AI 求职全生命周期管理平台，提供看板拖拽（6 阶段流转）和日程视图（任务清单 + 迷你日历）两大核心视图，支持 AI 辅助建档、岗位推荐与模拟面试三大 Agent 工作流。

### 1.2 技术栈

| 层级 | 技术选型 | 说明 |
|------|----------|------|
| 前端框架 | Next.js 14 (App Router) | Server Components + Client Components 混合 |
| UI 框架 | React 18 | 组件化开发 |
| 样式方案 | Tailwind CSS | 原子化 CSS，与设计系统解耦 |
| 语言 | TypeScript (严格模式) | 全链路类型安全 |
| 拖拽库 | `@hello-pangea/dnd` | 看板拖拽交互 |
| 状态管理 | React useState（当前）/ **Zustand（规划升级）** | 当前为 localState，升级为全局 store |
| 图标 | Lucide React | 统一 SVG 图标库 |
| 后端运行时 | Next.js Server Actions | 直接在服务端函数中操作数据库 |
| 数据库 | Supabase PostgreSQL | 内置 Auth + RLS + pgvector |
| AI 模型 | DeepSeek / GPT-4o | Agent 工作流接入 |
| 部署平台 | Vercel | 与 Next.js 深度集成 |

### 1.3 项目目录结构

```
app/
  page.tsx                  # 主页面（看板 + 日程视图入口）
  layout.tsx                # 根布局
  globals.css               # 全局样式
components/
  KanbanColumn.tsx          # 看板列组件（拖拽 Droppable）
  JobCard.tsx               # 求职卡片（拖拽 Draggable）
  SideDrawer.tsx            # 岗位详情底部抽屉（阅读/编辑双态）
  TrashDrawer.tsx           # 回收站抽屉
  AgendaView.tsx            # 日程视图（含迷你日历 + 任务列表）
  TaskDetails.tsx          # 任务详情抽屉
  BottomShelf.tsx           # 底部工作台（面试日程 + 简历信息）
  AISidebar.tsx            # AI 助手侧边栏
lib/
  mockData.ts               # Mock 数据（后端就绪前保底）
  supabase.ts               # Supabase 客户端初始化（待创建）
types/
  index.ts                  # TypeScript 类型定义
docs/
  prd.md                    # 产品需求文档
  API-spec.md               # API 详细规格（待补充）
  DESIGN-SYSTEM.md          # 设计系统文档
  第一次对话.md             # 对话记录与开发规划
```

---

## 二、代码风格与架构规范 (Architecture Rules)

### 2.1 UI 设计规范

- **设计语言：** 极简社论风（Editorial Design）
- **主色调：** 棕色系 `#8B735B`（用于图标、文字高亮、强调元素）
- **背景色：** `#EBE8E3`（主窗口）、`#EBE8E1`（底部抽屉/卡片）、`#D1CFCA`（外层背景）
- **字体：** 系统默认无衬线字体，字重区分层次（font-black / font-bold / font-medium）
- **圆角：** 胶囊形标签使用 `rounded-full`，按钮/输入框使用 `rounded-md` 或 `rounded-lg`

### 2.2 组件规范

- 所有交互组件均标记 `'use client'`
- 状态提升至 `page.tsx` 根组件，通过 props 向下传递
- 底部抽屉使用 **Bottom Sheet** 模式（从底部滑出，`translate-y` 动画）
- 阅读/编辑双态：编辑模式仅在 `isEditing === true` 时渲染 Input/Select/Textarea
- 保存状态指示器：`saving`（转圈）→ `saved`（对勾，2s 后消失）→ `idle`

### 2.3 后端交互规范

- **强制使用 Server Actions**，禁止在客户端组件中直接 `fetch` API 路由
- 所有 Server Actions 放在 `app/actions/` 目录下
- 返回类型必须声明为 TypeScript Interface，支持 React 的 `use server` 指令
- 乐观更新（Optimistic UI）：拖拽松手时先更新本地状态，再异步调用 Server Action

### 2.4 数据规范

- 日期统一存储为 **ISO 字符串**（`YYYY-MM-DD`），前端按需格式化为"今天"/"明天"/"4月20日"
- ID 使用 UUID（Supabase 自动生成），前端临时新建项使用 `new-${Date.now()}` 前缀
- 软删除：删除操作仅设置 `deleted_at` 时间戳，不物理删除数据

---

## 三、Supabase 数据库表结构 (Database Schema)

### 3.1 ER 关系图

```
┌─────────────┐     1:N      ┌─────────────┐
│   users     │─────────────│    jobs     │
│  (Supabase  │              │             │
│   Auth)     │              └──────┬──────┘
└─────────────┘                     │
                                    │ 1:N
                                    ▼
                              ┌─────────────┐
                              │   tasks     │
                              │             │
                              └─────────────┘
```

### 3.2 表结构定义

---

#### Table: `jobs`（求职看板表）

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| `id` | `uuid` | PK, default `gen_random_uuid()` | 主键 |
| `user_id` | `uuid` | FK → `auth.users.id`, NOT NULL | 所属用户 |
| `company` | `text` | NOT NULL | 公司名称 |
| `title` | `text` | NOT NULL | 岗位名称 |
| `stage` | `job_stage` | NOT NULL, default `'待投递'` | 当前阶段 |
| `deadline` | `date` | nullable | 截止日期 |
| `key_time` | `text` | nullable | 关键时间（如"明天 14:00"） |
| `website` | `text` | nullable | 官网或 JD 链接 |
| `description` | `text` | nullable | 岗位描述（长文本） |
| `notes` | `text` | nullable | 复盘笔记 |
| `progress` | `integer` | default `10` | 进度百分比（0-100） |
| `created_at` | `timestamptz` | default `now()` | 创建时间 |
| `updated_at` | `timestamptz` | default `now()` | 更新时间 |
| `deleted_at` | `timestamptz` | nullable | 软删除时间戳（null = 未删除） |

**RLS 策略：** `user_id = auth.uid()`（仅本人可见）

---

#### Table: `job_tags`（岗位标签关联表）

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| `id` | `uuid` | PK, default `gen_random_uuid()` | 主键 |
| `job_id` | `uuid` | FK → `jobs.id`, NOT NULL, ON DELETE CASCADE | 关联岗位 |
| `tag_type` | `tag_type` | NOT NULL | 标签类型 |
| `tag_value` | `text` | NOT NULL | 标签值 |

其中 `tag_type` 为枚举：

```sql
CREATE TYPE tag_type AS ENUM ('referral', 'round', 'interview_time', 'remaining');
```

> 对应前端 `Job['tags']`：`{ referral?: '有'|'无'|'学长', round?: string, interviewTime?: string, remaining?: string }`

**RLS 策略：** 通过 `job_id` 联表继承 `jobs` 的 RLS 策略

---

#### Table: `tasks`（日程待办表）

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| `id` | `uuid` | PK, default `gen_random_uuid()` | 主键 |
| `user_id` | `uuid` | FK → `auth.users.id`, NOT NULL | 所属用户 |
| `job_id` | `uuid` | FK → `jobs.id`, nullable, ON DELETE SET NULL | 关联岗位（可独立于岗位存在） |
| `title` | `text` | NOT NULL | 任务标题 |
| `company` | `text` | nullable | 相关公司 |
| `task_date` | `date` | NOT NULL | 任务日期（ISO 格式） |
| `task_time` | `time` | nullable | 具体时间（HH:MM） |
| `tag` | `task_type` | NOT NULL | 任务类型 |
| `round` | `text` | nullable | 当前轮次（如"技术二面"） |
| `meeting_link` | `text` | nullable | 会议/笔试链接 |
| `resume_filename` | `text` | nullable | 使用的简历文件名 |
| `notes` | `text` | nullable | 详情/笔记 |
| `is_completed` | `boolean` | default `false` | 是否已完成 |
| `created_at` | `timestamptz` | default `now()` | 创建时间 |
| `updated_at` | `timestamptz` | default `now()` | 更新时间 |

其中 `task_type` 为枚举：

```sql
CREATE TYPE task_type AS ENUM ('面试', '笔试', '待投递', '待办事项');
```

**RLS 策略：** `user_id = auth.uid()`（仅本人可见）

---

### 3.3 SQL 初始化脚本

```sql
-- 启用 UUID 扩展
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 创建枚举类型
CREATE TYPE job_stage AS ENUM ('待投递', '已投递', '笔试中', '面试中', 'Offer', '已结束');
CREATE TYPE tag_type AS ENUM ('referral', 'round', 'interview_time', 'remaining');
CREATE TYPE task_type AS ENUM ('面试', '笔试', '待投递', '待办事项');

-- ── Jobs 表 ────────────────────────────────────────────────
CREATE TABLE jobs (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid        REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  company       text        NOT NULL,
  title         text        NOT NULL,
  stage         job_stage   NOT NULL DEFAULT '待投递',
  deadline      date,
  key_time      text,
  website       text,
  description   text,
  notes         text,
  progress      integer     DEFAULT 10 CHECK (progress >= 0 AND progress <= 100),
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now(),
  deleted_at    timestamptz
);

-- 自动更新 updated_at 触发器
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER jobs_updated_at
  BEFORE UPDATE ON jobs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 软删除默认忽略（通过 deleted_at 过滤）
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own jobs"
  ON jobs FOR ALL
  USING (user_id = auth.uid() AND deleted_at IS NULL)
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users view own trashed jobs"
  ON jobs FOR SELECT
  USING (user_id = auth.uid());

-- ── Job Tags 表 ────────────────────────────────────────────
CREATE TABLE job_tags (
  id          uuid      PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id      uuid      REFERENCES jobs(id) ON DELETE CASCADE NOT NULL,
  tag_type    tag_type  NOT NULL,
  tag_value   text      NOT NULL
);

ALTER TABLE job_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own job tags via jobs"
  ON job_tags FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM jobs
      WHERE jobs.id = job_tags.job_id
        AND jobs.user_id = auth.uid()
        AND jobs.deleted_at IS NULL
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM jobs
      WHERE jobs.id = job_tags.job_id
        AND jobs.user_id = auth.uid()
    )
  );

-- ── Tasks 表 ──────────────────────────────────────────────
CREATE TABLE tasks (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid        REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  job_id           uuid        REFERENCES jobs(id) ON DELETE SET NULL,
  title            text        NOT NULL,
  company          text,
  task_date        date        NOT NULL,
  task_time        time,
  tag              task_type   NOT NULL DEFAULT '待办事项',
  round            text,
  meeting_link     text,
  resume_filename  text,
  notes            text,
  is_completed     boolean     DEFAULT false,
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now()
);

CREATE TRIGGER tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own tasks"
  ON tasks FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ── 索引 ──────────────────────────────────────────────────
CREATE INDEX idx_jobs_user_id       ON jobs(user_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_jobs_stage         ON jobs(stage) WHERE deleted_at IS NULL;
CREATE INDEX idx_job_tags_job_id    ON job_tags(job_id);
CREATE INDEX idx_tasks_user_date    ON tasks(user_id, task_date);
CREATE INDEX idx_tasks_job_id       ON tasks(job_id);
```

---

## 四、Server Actions 接口列表 (Server Actions)

> 所有 Server Actions 放在 `app/actions/` 目录，使用 `'use server'` 指令。
> 返回类型遵循 TypeScript Interface，错误时抛出 `Error` 或返回 `{ error: string }`。

### 4.1 看板 / 岗位相关

---

#### `getJobs()`

获取当前用户所有未删除的岗位（用于渲染看板）。

```typescript
// 输入参数：无

// 返回类型
interface JobWithTags {
  id: string;
  company: string;
  title: string;
  stage: JobStage;
  deadline: string | null;      // ISO date string
  keyTime: string | null;     // e.g. "明天 14:00"
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

function getJobs(): Promise<JobWithTags[]>;
```

---

#### `createJob(input: CreateJobInput)`

新建一个岗位卡片。

```typescript
// 输入参数
interface CreateJobInput {
  company: string;
  title: string;
  stage?: JobStage;           // 默认 '待投递'
  deadline?: string;           // ISO date string
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

// 返回类型
function createJob(input: CreateJobInput): Promise<JobWithTags>;
```

---

#### `updateJob(id: string, input: UpdateJobInput)`

更新岗位详情（SideDrawer 保存时调用）。

```typescript
// 输入参数
interface UpdateJobInput {
  company?: string;
  title?: string;
  stage?: JobStage;
  deadline?: string | null;    // null = 清除
  keyTime?: string | null;
  website?: string | null;
  description?: string | null;
  notes?: string | null;      // notes 字段独立更新
  tags?: {
    referral?: '有' | '无' | '学长' | null;
    round?: string | null;
    interviewTime?: string | null;
    remaining?: string | null;
  };
}

function updateJob(id: string, input: UpdateJobInput): Promise<JobWithTags>;
```

---

#### `updateJobStage(id: string, newStage: JobStage)`

拖拽松手时更新岗位阶段。

```typescript
// 输入参数
// newStage: '待投递' | '已投递' | '笔试中' | '面试中' | 'Offer' | '已结束'

function updateJobStage(id: string, newStage: JobStage): Promise<JobWithTags>;
```

---

#### `trashJob(id: string)`

软删除岗位（移入回收站）。

```typescript
function trashJob(id: string): Promise<{ success: boolean }>;
```

---

#### `getTrashedJobs()`

获取回收站中的岗位列表。

```typescript
function getTrashedJobs(): Promise<JobWithTags[]>;
```

---

#### `restoreJob(id: string)`

从回收站恢复岗位（恢复至"已结束"阶段）。

```typescript
function restoreJob(id: string): Promise<JobWithTags>;
```

---

#### `permanentDeleteJob(id: string)`

永久删除岗位（不可恢复）。

```typescript
function permanentDeleteJob(id: string): Promise<{ success: boolean }>;
```

---

### 4.2 日程 / 任务相关

---

#### `getTasks(month?: string)`

按月获取任务列表（`YYYY-MM` 格式，不传则返回当月）。

```typescript
// 输入参数：可选，格式 "YYYY-MM"，默认当前月份

// 返回类型
interface TaskWithJob {
  id: string;
  jobId: string | null;
  title: string;
  company: string | null;
  taskDate: string;            // ISO date string
  taskTime: string | null;    // HH:MM
  tag: TaskType;
  round: string | null;
  meetingLink: string | null;
  resumeFilename: string | null;
  notes: string | null;
  isCompleted: boolean;
  createdAt: string;
  updatedAt: string;
}

function getTasks(month?: string): Promise<TaskWithJob[]>;
```

---

#### `createTask(input: CreateTaskInput)`

新建日程任务。

```typescript
// 输入参数
interface CreateTaskInput {
  title: string;
  company?: string;
  taskDate: string;           // ISO date string (YYYY-MM-DD)
  taskTime?: string;          // HH:MM
  tag: TaskType;
  jobId?: string;             // 可选关联岗位
  round?: string;
  meetingLink?: string;
  resumeFilename?: string;
  notes?: string;
}

function createTask(input: CreateTaskInput): Promise<TaskWithJob>;
```

---

#### `updateTask(id: string, input: UpdateTaskInput)`

更新任务详情（TaskDetails 保存时调用）。

```typescript
// 输入参数
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
  isCompleted?: boolean;      // 勾选完成/取消完成
}

function updateTask(id: string, input: UpdateTaskInput): Promise<TaskWithJob>;
```

---

#### `toggleTaskCompletion(id: string)`

切换任务完成状态（点击左侧圆圈时调用）。

```typescript
function toggleTaskCompletion(id: string): Promise<TaskWithJob>;
```

---

### 4.3 统计相关

---

#### `getStats()`

获取 Header 右侧统计指标。

```typescript
interface Stats {
  totalJobs: number;          // 在投岗位数（排除已结束）
  trashedCount: number;       // 回收站数量
  successRate: string;       // 成功率（Offer 数 / 总投递数）
  status: string;             // 固定 "求职中"
}

function getStats(): Promise<Stats>;
```

---

### 4.4 Server Actions 文件组织

```
app/
  actions/
    jobs.ts      # 所有岗位相关的 Server Actions
    tasks.ts     # 所有任务相关的 Server Actions
    stats.ts     # 统计相关的 Server Actions
```

---

## 五、前端数据层升级路径

### 5.1 当前状态

前端目前使用 `useState` + Mock 数据（`lib/mockData.ts`），所有数据操作均在客户端内存中进行。

### 5.2 升级步骤

**第一步：创建 Supabase 客户端**

```typescript
// lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

**第二步：创建 Server Actions**（对应第四章接口）

**第三步：Zustand Store 替换 useState**

```typescript
// store/useJobStore.ts
import { create } from 'zustand';

interface JobStore {
  jobs: JobWithTags[];
  trashedJobs: JobWithTags[];
  isLoading: boolean;
  // Actions
  fetchJobs: () => Promise<void>;
  createJob: (input: CreateJobInput) => Promise<void>;
  updateJobStage: (id: string, stage: JobStage) => void; // 乐观更新
  // ...
}
```

**第四步：乐观更新 + 回滚**

拖拽时立即更新 Zustand 状态，Server Action 失败时回滚。

---

## 六、待办清单

- [ ] 初始化 Supabase 项目，运行 SQL 脚本建表
- [ ] 配置 Supabase Auth（邮箱登录 + OAuth）
- [ ] 创建 `lib/supabase.ts` 客户端
- [ ] 创建 `app/actions/` 目录及 Server Actions
- [ ] 创建 Zustand Store 替换 useState
- [ ] 前端对接 Server Actions，完成联调
- [ ] 配置 Vercel 环境变量
- [ ] 上线部署
