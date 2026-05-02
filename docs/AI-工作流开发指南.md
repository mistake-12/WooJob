# WooJob!!! AI 工作流开发指南

> **文档版本：** v1.0
> **编写日期：** 2026-05-03
> **目标：** 为 WooJob!!! 搭建完整的 AI 功能体系
> **参考文档：** `docs/4.29日报与未来计划.md` 第 3.2 节 AI 工作流规划

---

## 一、技术架构总览

### 1.1 当前项目状态

| 模块 | 状态 | 说明 |
|------|------|------|
| Supabase Auth | ✅ 已完成 | 用户认证已接入 |
| Server Actions | ✅ 已完成 | `app/actions/` 完整，类型齐全 |
| Zustand Store | ✅ 已完成 | `store/useJobStore.ts` 管理所有数据 |
| AI 助手 | ❌ 纯 Mock | `AISidebar.tsx` 为占位符 |

### 1.2 AI 技术选型

| 项目 | 选型 | 理由 |
|------|------|------|
| LLM 提供商 | **DeepSeek** / OpenAI | DeepSeek 性价比高，支持 function calling |
| 前端 → LLM | 直接调用或 Server Action | Server Action 更安全（密钥不泄露） |
| 凭证存储 | `.env.local` + `process.env` | 不在前端暴露 API Key |
| 对话存储 | **Supabase 表** | 新建 `ai_conversations` + `ai_messages` 表 |
| 图片解析 | LLM Vision（GPT-4o / DeepSeek-V） | 直接识别截图/ JD 图片 |

### 1.3 AI 数据流架构

```
用户输入（文字 / 图片）
        │
        ▼
┌─────────────────────────┐
│   AISidebar (UI层)       │  ← 状态管理：messages[], isLoading, mode
└───────────┬─────────────┘
            │ 调用 Server Action
            ▼
┌─────────────────────────┐
│   app/actions/ai.ts     │  ← AI 核心逻辑：
│                         │  - 普通对话
│                         │  - 图片解析 → Job/Task
│                         │  - 上下文注入
└───────────┬─────────────┘
            │
     ┌──────┴──────┐
     ▼             ▼
┌─────────┐  ┌──────────────┐
│ DeepSeek│  │ Supabase     │  ← 存储对话历史
│ API     │  │ ai_messages  │
└─────────┘  └──────────────┘
```

---

## 二、数据库设计（新增表）

> 在 Supabase SQL Editor 中执行以下 SQL。

### 2.1 AI 对话表

```sql
-- AI 对话会话表（一个用户可以有多个 AI 对话）
CREATE TABLE ai_conversations (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid        REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title         text        DEFAULT '新对话',
  model         text        DEFAULT 'deepseek-chat',
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);

ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own conversations"
  ON ai_conversations FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
```

### 2.2 AI 消息表

```sql
-- AI 消息记录表
CREATE TABLE ai_messages (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid        REFERENCES ai_conversations(id) ON DELETE CASCADE NOT NULL,
  role            text        NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content         text        NOT NULL,
  attachments     jsonb       DEFAULT '[]',  -- [{type: 'image_url', url: '...'}]
  extra_data      jsonb       DEFAULT '{}',  -- AI 解析出的结构化数据（如 Job/Task）
  created_at      timestamptz DEFAULT now()
);

ALTER TABLE ai_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own messages"
  ON ai_messages FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM ai_conversations
      WHERE ai_conversations.id = ai_messages.conversation_id
        AND ai_conversations.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM ai_conversations
      WHERE ai_conversations.id = ai_messages.conversation_id
        AND ai_conversations.user_id = auth.uid()
    )
  );

-- 索引
CREATE INDEX idx_messages_conversation_id ON ai_messages(conversation_id);
```

### 2.3 向量存储（可选，Phase 2 后期）

```sql
-- 开启 pgvector 扩展
CREATE EXTENSION IF NOT EXISTS vector;

-- 职位 JD 向量表（用于 RAG 检索）
CREATE TABLE job_embeddings (
  id         uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id     uuid    REFERENCES jobs(id) ON DELETE CASCADE NOT NULL,
  content    text    NOT NULL,  -- JD 原文拼接
  embedding  vector(1536),      -- DeepSeek embedding 维度
  created_at timestamptz DEFAULT now()
);

ALTER TABLE job_embeddings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own embeddings"
  ON job_embeddings FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM jobs
      WHERE jobs.id = job_embeddings.job_id
        AND jobs.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM jobs
      WHERE jobs.id = job_embeddings.job_id
        AND jobs.user_id = auth.uid()
    )
  );
```

---

## 三、AI Server Actions 详细设计

### 3.1 文件结构

```
app/
└── actions/
    ├── ai.ts              ← 新增：AI 对话核心逻辑
    ├── ai-helpers.ts      ← 新增：AI 辅助函数（prompt 构建、解析）
    └── _helpers.ts        ✅ 已有
```

### 3.2 AI 类型定义（`types/database.ts` 新增）

```typescript
// AI 对话相关类型（新增）

/** AI 会话 */
export interface AIConversation {
  id: string;
  userId: string;
  title: string;
  model: string;
  createdAt: string;
  updatedAt: string;
}

/** AI 消息 */
export interface AIMessage {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  attachments: AIMessageAttachment[];
  extraData: AIParsedData | null;
  createdAt: string;
}

/** 消息附件（图片等） */
export interface AIMessageAttachment {
  type: 'image_url';
  url: string;  // base64 data URL 或外部 URL
}

/** AI 解析出的结构化数据 */
export interface AIParsedData {
  type: 'job' | 'task' | null;
  job?: Partial<CreateJobInput>;
  task?: Partial<CreateTaskInput>;
}
```

### 3.3 AI 对话 Server Action（`app/actions/ai.ts`）

```typescript
'use server';

import { createServerSupabaseClient } from '@/lib/supabase-server';
import type { AIMessage, AIConversation, AIParsedData, CreateJobInput, CreateTaskInput } from '@/types/database';
import OpenAI from 'openai';
import { buildSystemPrompt, parseStructuredOutput } from './ai-helpers';

// ─────────────────────────────────────────────────────────────────────────────
// LLM 客户端初始化
// ─────────────────────────────────────────────────────────────────────────────

function getLLMClient() {
  const apiKey = process.env.DEEPSEEK_API_KEY || process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('Missing LLM API Key');

  return new OpenAI({
    apiKey,
    baseURL: process.env.LLM_BASE_URL,  // 可选，支持代理
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 会话管理
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 创建新对话会话
 */
export async function createConversation(title?: string): Promise<{ conversation?: AIConversation; error?: string }> {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: '未登录' };

    const { data, error } = await supabase
      .from('ai_conversations')
      .insert({ user_id: user.id, title: title ?? '新对话' })
      .select()
      .single();

    if (error) return { error: error.message };
    return { conversation: { id: data.id, userId: data.user_id, title: data.title, model: data.model, createdAt: data.created_at, updatedAt: data.updated_at } };
  } catch (err) {
    return { error: 'Failed to create conversation' };
  }
}

/**
 * 获取用户所有对话列表
 */
export async function getConversations(): Promise<{ conversations?: AIConversation[]; error?: string }> {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: '未登录' };

    const { data, error } = await supabase
      .from('ai_conversations')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });

    if (error) return { error: error.message };
    return { conversations: (data ?? []).map(c => ({ id: c.id, userId: c.user_id, title: c.title, model: c.model, createdAt: c.created_at, updatedAt: c.updated_at })) };
  } catch {
    return { error: 'Failed to fetch conversations' };
  }
}

/**
 * 获取单个对话的所有消息
 */
export async function getMessages(conversationId: string): Promise<{ messages?: AIMessage[]; error?: string }> {
  try {
    const supabase = await createServerSupabaseClient();

    const { data, error } = await supabase
      .from('ai_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (error) return { error: error.message };

    return {
      messages: (data ?? []).map(m => ({
        id: m.id,
        conversationId: m.conversation_id,
        role: m.role as AIMessage['role'],
        content: m.content,
        attachments: m.attachments ?? [],
        extraData: m.extra_data ?? null,
        createdAt: m.created_at,
      }))
    };
  } catch {
    return { error: 'Failed to fetch messages' };
  }
}

/**
 * 删除对话
 */
export async function deleteConversation(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.from('ai_conversations').delete().eq('id', id);
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch {
    return { success: false, error: 'Failed to delete conversation' };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 核心 AI 对话（支持文本 + 图片 + 结构化解析）
// ─────────────────────────────────────────────────────────────────────────────

export interface SendMessageInput {
  conversationId: string;
  content: string;
  attachments?: { type: 'image_url'; url: string }[];
  /** 期望的输出模式 */
  mode?: 'chat' | 'extract_job' | 'extract_task';
}

export interface SendMessageResult {
  message?: AIMessage;
  parsedData?: AIParsedData;
  error?: string;
}

/**
 * 发送消息并获取 AI 回复
 *
 * @param input.content        用户输入文本
 * @param input.attachments     图片附件（base64 data URL）
 * @param input.mode            'chat' | 'extract_job' | 'extract_task'
 *                             - chat: 普通对话
 *                             - extract_job: 从文本/图片中提取岗位信息
 *                             - extract_task: 从文本/图片中提取任务信息
 */
export async function sendMessage(
  input: SendMessageInput
): Promise<SendMessageResult> {
  const { conversationId, content, attachments = [], mode = 'chat' } = input;

  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: '未登录' };

    // 1. 获取历史消息（用于构建上下文）
    const { data: history } = await supabase
      .from('ai_messages')
      .select('role, content')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .limit(20);

    // 2. 保存用户消息
    await supabase.from('ai_messages').insert({
      conversation_id: conversationId,
      role: 'user',
      content,
      attachments: JSON.stringify(attachments),
    });

    // 3. 更新对话时间戳
    await supabase
      .from('ai_conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', conversationId);

    // 4. 构建 LLM 请求
    const client = getLLMClient();

    const systemPrompt = buildSystemPrompt(mode, user.id);

    const openaiMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
      ...(history ?? []).map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
      {
        role: 'user',
        content: [
          { type: 'text' as const, text: content },
          ...attachments.map(a => ({
            type: 'image_url' as const,
            image_url: { url: a.url },
          })),
        ],
      },
    ];

    // 5. 调用 LLM
    const response = await client.chat.completions.create({
      model: process.env.LLM_MODEL ?? 'deepseek-chat',
      messages: openaiMessages,
      temperature: 0.7,
      max_tokens: 2000,
    });

    const reply = response.choices[0]?.message?.content ?? '';
    if (!reply) return { error: 'AI 未返回有效回复' };

    // 6. 解析结构化数据（extract_job / extract_task 模式）
    let parsedData: AIParsedData | undefined;
    if (mode !== 'chat') {
      const parsed = parseStructuredOutput(reply, mode);
      if (parsed) {
        parsedData = parsed;
        // 保存结构化数据到 extra_data 字段
        await supabase.from('ai_messages').insert({
          conversation_id: conversationId,
          role: 'assistant',
          content: reply,
          attachments: JSON.stringify([]),
          extra_data: JSON.stringify(parsed),
        });
        // 不再单独保存普通回复
        return {
          message: {
            id: '', conversationId, role: 'assistant',
            content: reply, attachments: [], extraData: parsed,
            createdAt: new Date().toISOString(),
          },
          parsedData,
        };
      }
    }

    // 7. 保存 AI 回复
    const { data: savedMsg } = await supabase.from('ai_messages').insert({
      conversation_id: conversationId,
      role: 'assistant',
      content: reply,
      attachments: JSON.stringify([]),
      extra_data: JSON.stringify(null),
    }).select().single();

    return {
      message: savedMsg ? {
        id: savedMsg.id,
        conversationId: savedMsg.conversation_id,
        role: 'assistant' as const,
        content: savedMsg.content,
        attachments: [],
        extraData: null,
        createdAt: savedMsg.created_at,
      } : undefined,
    };
  } catch (err) {
    console.error('[sendMessage] Error:', err);
    return { error: 'AI 服务暂时不可用，请稍后重试' };
  }
}
```

### 3.4 Prompt 辅助函数（`app/actions/ai-helpers.ts`）

```typescript
/**
 * 根据模式构建 System Prompt
 */
export function buildSystemPrompt(mode: 'chat' | 'extract_job' | 'extract_task', userId: string): string {
  const basePrompt = `你是 WooJob!!! 的 AI 求职助手，帮助用户管理求职流程。
当前用户 ID: ${userId}

【核心能力】
1. 回答求职相关问题（面试技巧、公司分析、简历优化等）
2. 从文本或截图中提取岗位信息，结构化返回
3. 从文本或截图中提取待办任务信息，结构化返回
4. 保持对话简洁、专业，用中文回复`;

  if (mode === 'extract_job') {
    return `${basePrompt}

【当前任务：提取岗位信息】
当用户提供岗位描述（文字或截图）时，提取以下字段并以 JSON 格式返回：

{
  "type": "job",
  "job": {
    "company": "公司名称",
    "title": "岗位名称",
    "stage": "待投递",
    "deadline": "YYYY-MM-DD 或 null",
    "website": "官网链接或 null",
    "description": "岗位描述摘要",
    "tags": {
      "referral": "有" | "无" | "学长" | null,
      "round": "第几轮面试（如有）",
      "interviewTime": "面试时间（如有）"
    }
  }
}

如果无法提取某字段，返回 null。不要编造信息。`;
  }

  if (mode === 'extract_task') {
    return `${basePrompt}

【当前任务：提取任务信息】
当用户提供任务描述（文字或截图）时，提取以下字段并以 JSON 格式返回：

{
  "type": "task",
  "task": {
    "title": "任务标题",
    "company": "关联公司（可选）",
    "taskDate": "YYYY-MM-DD",
    "taskTime": "HH:mm 或 null",
    "tag": "面试" | "笔试" | "待投递" | "待办事项",
    "round": "面试轮次（如有）",
    "meetingLink": "会议链接（如有）",
    "notes": "备注（如有）"
  }
}

如果无法确定日期，默认使用今天（2026-05-03）。不要编造信息。`;
  }

  return basePrompt;
}

/**
 * 从 AI 回复中解析 JSON 结构化数据
 */
export function parseStructuredOutput(
  content: string,
  mode: 'extract_job' | 'extract_task'
): { type: 'job'; job: Partial<import('@/types/database').CreateJobInput> }
  | { type: 'task'; task: Partial<import('@/types/database').CreateTaskInput> }
  | null {
  try {
    // 尝试从回复中提取 JSON 块
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/) ?? content.match(/(\{[\s\S]*\})/);
    if (!jsonMatch) return null;

    const raw = jsonMatch[1] ?? jsonMatch[0];
    const parsed = JSON.parse(raw);

    if (mode === 'extract_job' && parsed.type === 'job' && parsed.job) {
      return { type: 'job', job: parsed.job };
    }
    if (mode === 'extract_task' && parsed.type === 'task' && parsed.task) {
      return { type: 'task', task: parsed.task };
    }
    return null;
  } catch {
    return null;
  }
}
```

---

## 四、前端改造

### 4.1 Zustand Store 新增 AI 状态（`store/useJobStore.ts`）

在现有 Store 中新增 AI 相关状态和方法：

```typescript
// 在 interface JobStore 中新增：

// ── AI 对话 ────────────────────────────────────────────────────────────────
aiConversations: AIConversation[];
currentConversationId: string | null;
aiMessages: AIMessage[];
aiIsLoading: boolean;
aiError: string | null;

fetchConversations: () => Promise<void>;
createConversation: (title?: string) => Promise<string | null>;
switchConversation: (id: string) => Promise<void>;
sendAIMessage: (content: string, attachments?: AIMessageAttachment[]) => Promise<AIParsedData | null>;
deleteConversation: (id: string) => Promise<void>;
```

### 4.2 AISidebar 改造（`components/AISidebar.tsx`）

**核心改造点：**

1. **连接 Store**：从 Zustand 读取/写入 AI 状态
2. **图片上传**：支持拖拽或点击上传图片
3. **模式切换**：普通对话 / 提取岗位 / 提取任务
4. **预览确认**：AI 解析出数据后，显示预览卡片让用户确认
5. **打字机效果**：AI 回复逐字显示

**交互流程图：**

```
用户输入文本/上传图片
        │
        ▼
   模式选择栏（对话 / 建岗位 / 建任务）
        │
        ▼
   发送 → loading 动画
        │
        ├── 普通对话模式 → 流式输出回复
        │
        ├── 提取岗位模式 → AI 回复含 JSON
        │                  │
        │                  ▼
        │           岗位预览卡片（公司/岗位/截止日期）
        │                  │
        │                  ▼
        │           [确认创建] → 调用 createJob()
        │           [修改] → 编辑后创建
        │
        └── 提取任务模式 → AI 回复含 JSON
                         │
                         ▼
                  任务预览卡片（标题/日期/类型）
                         │
                         ▼
                  [确认创建] → 调用 createTask()
                  [修改] → 编辑后创建
```

### 4.3 预览确认组件（新建 `components/AIConfirmationModal.tsx`）

```typescript
interface AIConfirmationModalProps {
  mode: 'job' | 'task';
  data: AIParsedData['job'] | AIParsedData['task'];
  onConfirm: (data: AIParsedData['job'] | AIParsedData['task']) => void;
  onCancel: () => void;
}
```

显示：
- **岗位预览**：公司名、岗位名、截止日期、内推情况
- **任务预览**：任务标题、日期时间、类型标签
- **[修改]** 按钮 → 弹出编辑表单
- **[确认创建]** 按钮 → 调用 `store.createJob()` / `store.createTask()`

---

## 五、分阶段实施计划

### Phase 0：基础设施准备（1 天）

| 任务 | 产出物 | 优先级 |
|------|--------|--------|
| 在 Supabase 执行建表 SQL | `ai_conversations` + `ai_messages` 表就绪 | P0 |
| 在 `.env.local` 添加 API Key | `DEEPSEEK_API_KEY=sk-xxx` | P0 |
| 安装 OpenAI SDK | `npm install openai` | P0 |
| 创建 `types/database.ts` 新增类型 | AI 类型定义完成 | P0 |
| 创建 `app/actions/ai.ts` 骨架 | 会话 CRUD 完成 | P0 |

### Phase 1：普通对话（2 天）

| 任务 | 产出物 |
|------|--------|
| 实现 `sendMessage()` Server Action | 支持文本对话 |
| 改造 `AISidebar` UI | 真实消息列表 |
| 对接 Zustand Store | AI 消息状态管理 |
| 添加加载状态 / 错误处理 | UX 完善 |

**验收标准：** 用户可以在 AI 侧边栏进行多轮对话，历史记录保存。

### Phase 2：图片解析 + 岗位卡片创建（2-3 天）

| 任务 | 产出物 |
|------|--------|
| `sendMessage()` 支持图片附件 | 图片上传到 AI |
| `parseStructuredOutput()` 岗位解析 | 返回结构化 Job 数据 |
| 岗位预览确认组件 | `AIConfirmationModal.tsx` |
| 预览 → `createJob()` 集成 | 一键创建岗位 |

**验收标准：** 上传 JD 截图或粘贴文字，AI 自动解析出公司/岗位，弹窗预览确认后入库。

### Phase 3：图片解析 + 任务创建（1-2 天）

| 任务 | 产出物 |
|------|--------|
| `parseStructuredOutput()` 任务解析 | 返回结构化 Task 数据 |
| 任务预览确认组件 | 复用/扩展 ConfirmationModal |
| 预览 → `createTask()` 集成 | 一键创建任务 |

**验收标准：** 上传面试通知截图，AI 解析出时间/地点/轮次，弹窗预览确认后入库。

### Phase 4：体验优化（持续迭代）

| 任务 | 优先级 | 说明 |
|------|--------|------|
| AI 回复流式输出（Streaming） | P1 | 打字机效果，提升体验 |
| 对话列表侧边栏 | P1 | 新建/切换/删除对话 |
| AI 上下文注入当前岗位数据 | P1 | 让 AI 知道用户正在投哪些公司 |
| 多模态模型切换 | P2 | DeepSeek-V / GPT-4o 可选 |
| 向量检索（RAG） | P2 | 用户 JD 向量化，智能推荐 |

---

## 六、环境变量清单

在 `.env.local` 中添加：

```bash
# AI Provider
DEEPSEEK_API_KEY=sk-your-key-here
# 可选：OpenAI 作为备选
OPENAI_API_KEY=sk-your-key-here

# LLM 配置
LLM_MODEL=deepseek-chat           # deepseek-chat / gpt-4o
LLM_BASE_URL=https://api.deepseek.com  # 可选，支持代理
LLM_MAX_TOKENS=2000
LLM_TEMPERATURE=0.7
```

---

## 七、技术规范与注意事项

### 7.1 铁律

1. **API Key 不出后端**：所有 LLM 调用必须通过 Server Actions，前端不直接访问 API
2. **RLS 隔离**：AI 对话数据通过 `user_id = auth.uid()` 严格隔离
3. **不编造数据**：AI 解析失败时，提示用户手动输入，不要填默认值
4. **图片压缩**：前端上传图片前压缩到 1MB 以下，避免 token 浪费
5. **错误处理**：AI 服务不可用时显示友好提示，不暴露技术细节

### 7.2 性能优化

- **对话历史截断**：传给 LLM 的历史消息最多 20 条（`getMessages` 中 limit）
- **图片格式**：优先使用 JPEG / WebP，避免 PNG（体积大）
- **防抖**：用户打字时 `sendMessage` 要防抖，避免重复请求
- **流式输出**：Phase 4 引入 Streaming，减少等待感知时间

### 7.3 安全注意

- `ai_messages.attachments` 中的 URL 需要校验，防止 SSRF
- 对话历史中不要存储敏感个人信息
- `ai_conversations.title` 允许 AI 生成，但需 XSS 过滤

---

## 八、参考代码片段

### 8.1 前端图片压缩

```typescript
// utils/imageCompress.ts
export async function compressImage(file: File, maxSizeKB = 800): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;
        const MAX_DIM = 1024;
        if (width > MAX_DIM || height > MAX_DIM) {
          const ratio = Math.min(MAX_DIM / width, MAX_DIM / height);
          width *= ratio; height *= ratio;
        }
        canvas.width = width; canvas.height = height;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}
```

### 8.2 AISidebar 模式切换 UI

```tsx
// components/AISidebar.tsx 中的模式选择栏
const MODES = [
  { key: 'chat', label: '💬 对话' },
  { key: 'extract_job', label: '📋 提取岗位' },
  { key: 'extract_task', label: '📝 提取任务' },
] as const;
```

### 8.3 预览确认弹窗集成示例

```tsx
// 在 AISidebar 组件内
const [confirmData, setConfirmData] = useState<AIParsedData | null>(null);

async function handleSend() {
  if (mode !== 'chat') {
    const result = await sendAIMessage(input, attachments, mode);
    if (result?.parsedData) {
      setConfirmData(result.parsedData); // 弹出确认框
    }
  } else {
    await sendAIMessage(input, attachments, 'chat');
  }
}

return (
  <>
    {/* AI 对话内容 */}
    {/* 确认弹窗 */}
    {confirmData && (
      <AIConfirmationModal
        mode={confirmData.type!}
        data={confirmData.type === 'job' ? confirmData.job : confirmData.task}
        onConfirm={async (data) => {
          if (confirmData.type === 'job') {
            await createJob(data as CreateJobInput);
          } else {
            await createTask(data as CreateTaskInput);
          }
          setConfirmData(null);
        }}
        onCancel={() => setConfirmData(null)}
      />
    )}
  </>
);
```

---

## 九、后续扩展方向

### 9.1 智能岗位发现（RAG）

```
用户输入: "我想投 AI 产品经理，大厂最好"
        │
        ▼
1. 将用户描述 embedding 化
2. 在 job_embeddings 表中做向量相似度检索
3. 返回匹配的岗位卡片列表（从用户已投递/收藏的岗位中匹配）
```

### 9.2 模拟面试

```
触发: 岗位详情抽屉 → 【AI 模拟面试】按钮
        │
        ▼
1. 拉取该岗位的 description（context）
2. 多轮对话：AI 扮演面试官，用户回答
3. 结束后生成复盘报告，存入 job.notes
```

### 9.3 简历知识图谱

```
用户上传简历 → DeepSeek 解析 → 结构化存入 profiles.resume_parsed
                                     │
                                     ▼
                            用作所有 AI 对话的默认上下文
```

---

*本文档由 AI 技术方案设计，可根据实际开发进度调整优先级和实现细节。*
