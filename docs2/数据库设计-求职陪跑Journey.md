# 数据库设计说明：求职陪跑 Journey（MVP）

> 目的：支撑「一个对话流，多个 Agent，一条时间线」的陪跑体验，提供跨刷新/跨设备的持久化能力，并支持“选择历史简历版本”复用已有 Storage（`resumes` bucket）与 `profiles.resumes` 元数据。

本文覆盖：表结构、字段语义、与简历历史版本的关系、RLS 访问控制、以及可操作的验证步骤。

---

## 0. 现有简历存储现状（已存在）

你们当前的简历上传与“历史版本”元数据主要在 `profiles` 表中：

- `profiles.resume_url`（text）：当前简历 URL（通常为 storage public url 或签名 url）
- `profiles.resume_filename`（text）：当前简历文件名
- `profiles.resumes`（jsonb）：历史简历版本列表（数组）

并且已存在 Supabase Storage bucket：

- `resumes`

`profiles.resumes` 的元素结构（示例，来自实际查询结果）：

```json
[
  {
    "id": "985aef4f-ddb5-4763-88e8-669eb4470670",
    "url": "https://<project>.supabase.co/storage/v1/object/public/resumes/<uuid>.pdf",
    "filename": "xxx.pdf"
  }
]
```

### 0.1 是否可以复用 PDF？

可以。实现上不需要重复上传：
- 用户在“选择历史简历版本”时，从 `profiles.resumes` 选择某条记录。
- Journey 创建/更新时，把该版本的 `id/url/filename` 写入 `ai_journeys`（见下文）。
- 后续诊断/简历优化阶段都使用 `ai_journeys.resume_url` 读取同一份文件。

---

## 1. 新增的 Journey 持久化表（MVP）

MVP 新增 3 张表：

- `ai_journeys`：一次陪跑会话（旅程）
- `ai_journey_messages`：旅程消息流（聊天记录）
- `ai_journey_artifacts`：阶段产出物（结构化 JSON）

### 1.1 `ai_journeys`

用途：记录一个用户的一次陪跑“旅程”，包含当前阶段、时间线/阶段状态、以及本旅程绑定的简历版本。

推荐字段（你们已创建基础字段；简历字段如未加可后续 `alter table` 添加）：

- `id uuid`：主键
- `user_id uuid`：归属用户（建议关联 `auth.users.id`）
- `title text`：旅程标题
- `current_stage text`：当前阶段（如 onboarding / diagnosis / gap_filling / resume）
- `stages jsonb`：阶段状态与时间线（建议保存数组，供前端 ProgressTimeline 直接渲染）
- `resume_file_id uuid null`：绑定的历史简历版本 id（来自 `profiles.resumes[i].id`）
- `resume_url text null`：绑定简历的 url（来自 `profiles.resumes[i].url`）
- `resume_filename text null`：文件名（来自 `profiles.resumes[i].filename`）
- `created_at/updated_at timestamptz`

为什么 Journey 需要保存 `resume_*`：
- 用户可能会在 `profiles` 里更新“当前简历”，但旧 journey 仍应使用当时选定的版本，保证可回溯/可复现。

### 1.2 `ai_journey_messages`

用途：保存“一个对话流”的每条消息，便于跨端同步与回放。

核心字段：
- `journey_id`：所属旅程
- `user_id`：归属用户（用于 RLS 隔离）
- `role`：user/assistant/system
- `stage`：消息产生时所处阶段（便于过滤/回放）
- `agent_type`：产出消息的 agent（可选）
- `content`：消息内容
- `attachments jsonb`：附件（如简历引用、链接等）
- `extra_data jsonb`：可扩展元信息
- `created_at`

索引建议：
- `(journey_id)`
- `(user_id)`
- `(journey_id, created_at)`（用于按时间加载消息）

### 1.3 `ai_journey_artifacts`

用途：保存阶段产出物（结构化 JSON），例如：
- 诊断结果 `DiagnosisArtifact`
- 学习计划 `PlanArtifact`
- 简历建议 `ResumeArtifact`

核心字段：
- `journey_id`、`user_id`
- `stage`：产出属于哪个阶段（例如 diagnosis / plan_review / resume）
- `artifact_type`：diagnosis/plan/resume（或更细分）
- `data jsonb`：结构化内容
- `created_at/updated_at`

索引建议：
- `(journey_id)`
- `(user_id)`
- `(journey_id, stage)`

---

## 2. RLS（数据隔离）策略说明

原则：用户只能访问自己的 journey/messages/artifacts。

通用策略：
- `USING (auth.uid() = user_id)`
- `WITH CHECK (auth.uid() = user_id)`

### 2.1 常见“验证时报 user_id 为 null”原因

在 Supabase **SQL Editor** 里执行 `auth.uid()` 常常会得到 `NULL`，因为 SQL Editor 并不一定在“某个登录用户上下文”中执行。

因此：
- SQL Editor 更适合做 **结构检查**（表/列/索引/策略是否存在）
- 真正验证 RLS，需要用 **前端/后端在登录态下** 执行（见第 3 节）

---

## 3. 如何验证（可复制执行）

验证分 3 层：

1) 结构验证：表/列/索引/RLS 是否开启
2) 行为验证：插入/查询是否符合预期
3) RLS 验证：不同用户之间是否隔离

### 3.1 结构验证（SQL Editor 可直接跑）

```sql
-- 1) 表是否存在
select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in ('ai_journeys','ai_journey_messages','ai_journey_artifacts')
order by table_name;

-- 2) journeys 字段列表
select column_name, data_type
from information_schema.columns
where table_schema = 'public'
  and table_name = 'ai_journeys'
order by ordinal_position;

-- 3) RLS 是否开启
select
  c.relname as table_name,
  c.relrowsecurity as rls_enabled
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in ('ai_journeys','ai_journey_messages','ai_journey_artifacts')
order by c.relname;

-- 4) policy 是否存在
select
  schemaname,
  tablename,
  policyname,
  roles,
  cmd,
  qual,
  with_check
from pg_policies
where schemaname='public'
  and tablename in ('ai_journeys','ai_journey_messages','ai_journey_artifacts')
order by tablename, policyname;
```

### 3.2 行为验证（SQL Editor 版本：不用 auth.uid）

> 由于 SQL Editor 中 `auth.uid()` 可能为 NULL，因此用固定 user uuid 验证“表可写”。

步骤：
1) 在 Supabase 控制台：`Authentication → Users` 找到你的用户，复制 `id`（uuid）。
2) 用该 uuid 替换下面的 `<YOUR_USER_UUID>`。

```sql
-- A) 创建一个 journey（示例绑定某个历史简历版本）
insert into public.ai_journeys (
  user_id, title, current_stage, resume_file_id, resume_url, resume_filename, stages
)
values (
  'c32353e1-e0dd-4415-a440-d1a5e40c5b8a',
  '求职陪跑-验证用',
  'diagnosis',
  '985aef4f-ddb5-4763-88e8-669eb4470670',
  'https://<project>.supabase.co/storage/v1/object/public/resumes/<uuid>.pdf',
  '装配方式收集.pdf',
  '[]'::jsonb
)
returning *;

-- B) 写一条 message
insert into public.ai_journey_messages (journey_id, user_id, role, stage, content)
values (
  '<RETURNED_JOURNEY_ID>',
  '<YOUR_USER_UUID>',
  'user',
  'diagnosis',
  '我想验证消息写入'
)
returning *;

-- C) 写一条 artifact（假数据）
insert into public.ai_journey_artifacts (journey_id, user_id, stage, artifact_type, data)
values (
  '<RETURNED_JOURNEY_ID>',
  '<YOUR_USER_UUID>',
  'diagnosis_result',
  'diagnosis',
  jsonb_build_object(
    'overallMatch', 0.62,
    'gaps', jsonb_build_array(),
    'radar', jsonb_build_array()
  )
)
returning *;
```

### 3.3 RLS 验证（必须在真实登录态下）

目标：确认 A 用户无法读写 B 用户的数据。

推荐做法（最贴近实际）：
- 用前端（浏览器）已登录用户的 Supabase client（anon key + session）执行 insert/select。
- 换另一个账号登录，尝试读取第一个账号的 journey，应该返回 0 行。

最小验证步骤：
1) 账号 A 登录 → 创建 journey（user_id 自动来自 session）
2) 账号 A 查询自己的 journey list → 能看到
3) 账号 B 登录 → 用 A 的 journey_id 查询 → 应该读不到

如果你们后端有 API route，也可以在 route 内使用 server supabase client（读取 cookies/session）进行相同验证。

---

## 4. 支持“选择历史简历版本”的数据流（推荐）

### 4.1 数据来源
- `profiles.resumes`（jsonb array）作为历史版本列表
- `resumes` storage bucket 保存实际 PDF

### 4.2 用户选择版本后的写入
当用户选择某个历史版本（元素包含 `id/url/filename`），把它写入 `ai_journeys`：

- `resume_file_id = selected.id`
- `resume_url = selected.url`
- `resume_filename = selected.filename`

这样后续诊断/简历优化：
- 直接读取 `ai_journeys.resume_url` 获取文件/解析文本
- 不依赖 `profiles.resume_url`（避免用户更新“当前简历”导致上下文漂移）

### 4.3 建议补充：给历史版本加时间（可选，非 MVP 必须）
目前元素没有 `created_at`，前端只能按数组顺序展示。
后续如需排序更可靠，建议新上传时把：
- `created_at`（timestamptz）
写入 `profiles.resumes` 的元素结构。

---

## 5. 常用查询（便于排查/交接）

### 5.1 拉取一个 journey（含最新 artifacts + 最近 N 条消息）

```sql
-- journeys
select *
from public.ai_journeys
where id = '<JOURNEY_ID>'
order by created_at desc;

-- latest artifacts per type (示例：取每种 artifact 最近一条)
select distinct on (artifact_type)
  *
from public.ai_journey_artifacts
where journey_id = '<JOURNEY_ID>'
order by artifact_type, updated_at desc;

-- messages
select *
from public.ai_journey_messages
where journey_id = '<JOURNEY_ID>'
order by created_at asc
limit 200;
```

---

## 6. 备注：与既有 `ai_messages` 的关系

如果你们已有全局 AI 聊天表 `ai_messages`，仍建议为 journey 单独建 `ai_journey_messages`：
- 字段语义更清晰（journey_id/stage/agent_type）
- 方便按 journey 隔离与索引优化
- 更利于后续做时间线回退与 artifacts 对齐
