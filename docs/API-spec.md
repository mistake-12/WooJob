# WooJob API 接口规范

> **版本：** v1.0
> **更新日期：** 2026-04-19
> **接口基础路径：** `/api/v1`
> **认证方式：** Bearer Token（JWT）

---

## 1. 全局说明

### 1.1 Base URL

```
生产环境：https://api.woojob.app/api/v1
测试环境：https://staging-api.woojob.app/api/v1
本地开发：http://localhost:3000/api/v1
```

### 1.2 通用请求头

| Header | 类型 | 必填 | 说明 |
|--------|------|------|------|
| `Authorization` | string | 是 | `Bearer <JWT_TOKEN>`，由后端签发的用户身份令牌 |
| `Content-Type` | string | 是 | 请求体为 JSON 时固定值：`application/json` |
| `Accept` | string | 否 | 推荐值：`application/json` |
| `X-Request-ID` | string | 否 | 客户端生成的幂等请求 ID，便于日志追踪 |

### 1.3 通用响应结构

所有接口统一使用以下 JSON 包装结构：

#### 成功响应

```json
{
  "code": 0,
  "message": "success",
  "data": { ... }
}
```

#### 错误响应

```json
{
  "code": <错误码>,
  "message": "<错误描述>",
  "data": null
}
```

| HTTP Status | code | 说明 |
|-------------|------|------|
| 200 | 0 | 请求成功 |
| 201 | 0 | 资源创建成功（POST 场景） |
| 400 | 40001 | 请求参数校验失败 |
| 401 | 40101 | 未认证（Token 缺失或已过期） |
| 403 | 40301 | 无权访问该资源 |
| 404 | 40401 | 资源不存在 |
| 409 | 40901 | 资源状态冲突（如重复投递） |
| 422 | 42201 | 请求格式正确但语义错误 |
| 500 | 50001 | 服务器内部错误 |

### 1.4 分页规范

支持分页的列表接口，Query Parameters 如下：

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `page` | integer | 1 | 当前页码 |
| `page_size` | integer | 20 | 每页条目数，最大 100 |

分页响应在 `data` 中包含：

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "items": [],
    "pagination": {
      "page": 1,
      "page_size": 20,
      "total": 100,
      "total_pages": 5
    }
  }
}
```

### 1.5 HTTP 状态码使用规范

| 方法 | 场景 | 状态码 |
|------|------|--------|
| GET | 查询成功 | 200 |
| POST | 创建成功 | 201 |
| PATCH | 部分更新成功 | 200 |
| PUT | 全量替换/更新成功 | 200 |
| DELETE | 删除成功 | 204 |

---

## 2. 核心数据字典（Schema Definitions）

### 2.1 Job（职位记录）

`Job` 是用户对某一公司某一岗位投递状态的核心实体，对应看板中的一张卡片。

```json
{
  "id": "string (UUID)",
  "company": "string",
  "title": "string",
  "stage": "JobStage",
  "deadline": "string (ISO 8601 Date, YYYY-MM-DD)",
  "time": "string | null",
  "tags": {
    "referral": "有" | "无" | "学长" | null,
    "remaining": "string | null",
    "round": "string | null",
    "interviewTime": "string | null"
  },
  "progress": "integer (0-100)",
  "description": "string | null",
  "notes": "string | null",
  "created_at": "string (ISO 8601 DateTime)",
  "updated_at": "string (ISO 8601 DateTime)"
}
```

#### 字段说明

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `id` | UUID | PK, 不可为空 | 全局唯一标识符 |
| `company` | string | 最多 100 字符 | 目标公司名称 |
| `title` | string | 最多 200 字符 | 目标岗位名称 |
| `stage` | enum | 不可为空 | 当前所处的求职阶段，见下方枚举 |
| `deadline` | date | ISO 8601 | 重要时间节点（笔试/面试截止日期） |
| `time` | string | 可为空 | 展示用时间描述，如"明天 14:00" |
| `tags` | object | 可为空 | 扩展元信息标签 |
| `tags.referral` | enum | 可为空 | 内推来源：'有' / '无' / '学长' |
| `tags.remaining` | string | 可为空 | 剩余时间描述，如"24小时" |
| `tags.round` | string | 可为空 | 当前轮次，如"技术二面" |
| `tags.interviewTime` | string | 可为空 | 面试时间描述 |
| `progress` | integer | 0-100 | 进度百分比，由 stage 自动映射 |
| `description` | string | 可为空 | 岗位 JD 原文 |
| `notes` | string | 可为空 | 用户手写的复盘笔记（支持 Markdown） |
| `created_at` | datetime | 不可为空 | 创建时间（UTC） |
| `updated_at` | datetime | 不可为空 | 最后更新时间（UTC） |

#### JobStage 枚举值

| 枚举值 | 中文描述 | 默认进度 |
|--------|----------|----------|
| `待投递` | 尚未投递，记录候选岗位 | 10 |
| `已投递` | 已提交申请，等待反馈 | 30 |
| `笔试中` | 进入笔试阶段 | 50 |
| `面试中` | 进入面试阶段 | 75 |
| `Offer` | 收到 Offer | 100 |
| `已结束` | 流程结束（被拒或主动放弃） | 100 |

### 2.2 Task（任务事项）

`Task` 是关联到 `Job` 的待办事项，对应日程视图中的每一条记录。

```json
{
  "id": "string (UUID)",
  "jobId": "string (UUID) | null",
  "date": "string",
  "time": "string (HH:mm)",
  "title": "string",
  "company": "string",
  "round": "string | null",
  "tag": "TaskType",
  "meetingLink": "string | null",
  "resumeFilename": "string | null",
  "isCompleted": "boolean",
  "created_at": "string (ISO 8601 DateTime)",
  "updated_at": "string (ISO 8601 DateTime)"
}
```

#### 字段说明

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `id` | UUID | PK, 不可为空 | 全局唯一标识符 |
| `jobId` | UUID | FK, 可为空 | 关联的 Job ID，可为空表示独立任务 |
| `date` | string | 不可为空 | 日期描述文本，如"今天"、"明天"、"4月20日" |
| `time` | string | 不可为空 | 时间，格式 `HH:mm` |
| `title` | string | 最多 300 字符 | 任务标题 |
| `company` | string | 最多 100 字符 | 关联公司名称 |
| `round` | string | 可为空 | 轮次描述，如"技术二面" |
| `tag` | enum | 不可为空 | 任务类型：'面试' / '笔试' / '待投递' |
| `meetingLink` | string | 可为空 | 视频会议链接文本 |
| `resumeFilename` | string | 可为空 | 使用的简历文件名 |
| `isCompleted` | boolean | 不可为空 | 是否已完成 |
| `created_at` | datetime | 不可为空 | 创建时间（UTC） |
| `updated_at` | datetime | 不可为空 | 最后更新时间（UTC） |

---

## 3. 接口列表

---

### 3.1 [GET] `/jobs` — 获取求职看板列表

获取当前用户的全部求职记录，支持按阶段过滤。

#### 请求

**Endpoint:** `GET /api/v1/jobs`

**Query Parameters:**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `stage` | string | 否 | 按阶段过滤，值须为 `JobStage` 枚举之一 |
| `page` | integer | 否 | 页码，默认 1 |
| `page_size` | integer | 否 | 每页数量，默认 20 |

**示例：**

```
GET /api/v1/jobs?stage=面试中&page=1&page_size=20
```

#### 响应

**200 OK**

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "items": [
      {
        "id": "job-001",
        "company": "字节跳动",
        "title": "高级产品经理",
        "stage": "面试中",
        "deadline": "2026-04-20",
        "time": "明天 14:00",
        "tags": {
          "referral": "有",
          "remaining": null,
          "round": "技术二面",
          "interviewTime": null
        },
        "progress": 75,
        "description": "负责字节跳动核心产品线...",
        "notes": "面试官关注产品架构和跨团队协作...",
        "created_at": "2026-04-10T08:00:00Z",
        "updated_at": "2026-04-18T14:30:00Z"
      },
      {
        "id": "job-005",
        "company": "滴滴出行",
        "title": "产品经理",
        "stage": "面试中",
        "deadline": "2026-04-21",
        "time": "后天 10:00",
        "tags": {
          "referral": "学长",
          "remaining": null,
          "round": "终面",
          "interviewTime": null
        },
        "progress": 75,
        "description": null,
        "notes": null,
        "created_at": "2026-04-12T10:00:00Z",
        "updated_at": "2026-04-18T09:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "page_size": 20,
      "total": 2,
      "total_pages": 1
    }
  }
}
```

**前端对应场景：** `page.tsx` 中 `KanbanColumn` 组件按 `stage` 分组渲染，拖拽时先在本地更新 UI，再同步调用此接口（或批量同步）。

---

### 3.2 [POST] `/jobs` — 新建求职投递记录

创建一个新的职位投递记录，对应用户在看板中新增一个岗位卡片。

#### 请求

**Endpoint:** `POST /api/v1/jobs`

**Headers:** `Content-Type: application/json`

**Request Body:**

```json
{
  "company": "拼多多",
  "title": "产品经理",
  "stage": "待投递",
  "deadline": "2026-04-25",
  "time": "5天后",
  "tags": {
    "referral": "无",
    "round": null,
    "interviewTime": null
  },
  "description": null,
  "notes": null
}
```

| 字段 | 类型 | 必填 | 约束 | 说明 |
|------|------|------|------|------|
| `company` | string | 是 | 1-100 字符 | 公司名称 |
| `title` | string | 是 | 1-200 字符 | 岗位名称 |
| `stage` | string | 是 | 须为 `JobStage` 枚举值 | 默认传 `待投递` |
| `deadline` | string | 是 | ISO 8601 Date | 截止日期 |
| `time` | string | 否 | 最多 50 字符 | 展示用时间描述 |
| `tags` | object | 否 | | 扩展标签，结构同上 |
| `tags.referral` | string | 否 | '有'/'无'/'学长' | 内推情况 |
| `tags.round` | string | 否 | | 当前轮次 |
| `description` | string | 否 | | 岗位描述 |
| `notes` | string | 否 | | 复盘笔记 |

#### 响应

**201 Created**

```json
{
  "code": 0,
  "message": "创建成功",
  "data": {
    "id": "job-007",
    "company": "拼多多",
    "title": "产品经理",
    "stage": "待投递",
    "deadline": "2026-04-25",
    "time": "5天后",
    "tags": {
      "referral": "无",
      "remaining": null,
      "round": null,
      "interviewTime": null
    },
    "progress": 10,
    "description": null,
    "notes": null,
    "created_at": "2026-04-19T10:00:00Z",
    "updated_at": "2026-04-19T10:00:00Z"
  }
}
```

**前端对应场景：** 看板视图中点击"新增岗位"按钮（建议在 `待投递` 列顶部或 BottomShelf 中添加），表单弹窗收集 `company`、`title`、`deadline` 等字段后提交。

---

### 3.3 [PATCH] `/jobs/{job_id}/stage` — 更新职位阶段（拖拽）

将职位卡片从当前阶段移动到目标阶段，是看板拖拽功能的核心后端接口。

> **重要：** 前端 `DragDropContext.onDragEnd` 事件触发后，应立即在本地更新 `stage`，并异步调用本接口同步至服务端。若服务端返回错误，需回滚本地状态。

#### 请求

**Endpoint:** `PATCH /api/v1/jobs/{job_id}/stage`

**Path Parameters:**

| 参数 | 类型 | 说明 |
|------|------|------|
| `job_id` | string | Job 的 UUID |

**Request Body:**

```json
{
  "stage": "已投递"
}
```

| 字段 | 类型 | 必填 | 约束 | 说明 |
|------|------|------|------|------|
| `stage` | string | 是 | 须为 `JobStage` 枚举值 | 目标阶段 |

#### 响应

**200 OK**

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "id": "job-003",
    "company": "腾讯",
    "title": "产品运营专员",
    "stage": "已投递",
    "deadline": "2026-04-22",
    "time": "4月22日",
    "tags": {
      "referral": "无",
      "remaining": null,
      "round": null,
      "interviewTime": null
    },
    "progress": 30,
    "description": null,
    "notes": null,
    "created_at": "2026-04-15T08:00:00Z",
    "updated_at": "2026-04-19T10:05:00Z"
  }
}
```

**错误响应 — 404:**

```json
{
  "code": 40401,
  "message": "Job not found",
  "data": null
}
```

**前端对应场景：**

```typescript
// page.tsx — onDragEnd
function onDragEnd(result: DropResult) {
  const { source, destination, draggableId } = result;
  if (!destination) return;
  const newStage = destination.droppableId as JobStage;

  // 乐观更新：先修改本地状态
  setJobs(prev => prev.map(job =>
    job.id === draggableId ? { ...job, stage: newStage } : job
  ));

  // 异步同步至后端
  try {
    await fetch(`/api/v1/jobs/${draggableId}/stage`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ stage: newStage }),
    });
  } catch {
    // 错误处理：回滚本地状态
    setJobs(prev => prev.map(job =>
      job.id === draggableId ? { ...job, stage: source.droppableId as JobStage } : job
    ));
  }
}
```

---

### 3.4 [PATCH] `/tasks/{task_id}/status` — 更新任务完成状态

切换待办事项的勾选状态，对应日程视图中点击 Checkbox 的行为。

> **说明：** 此接口设计为幂等操作，即重复调用会交替 `isCompleted` 状态。若前端已持有完整任务对象，建议使用 `PUT` 并传入当前完整状态。

#### 请求

**Endpoint:** `PATCH /api/v1/tasks/{task_id}/status`

**Path Parameters:**

| 参数 | 类型 | 说明 |
|------|------|------|
| `task_id` | string | Task 的 UUID |

**Request Body（Toggle 模式，推荐）：**

```json
{
  "isCompleted": true
}
```

#### 响应

**200 OK**

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "id": "task-001",
    "jobId": "job-005",
    "date": "今天",
    "time": "14:00",
    "title": "滴滴出行 - 资深产品专家 技术二面",
    "company": "滴滴出行",
    "round": "技术二面",
    "tag": "面试",
    "meetingLink": "进入会议",
    "resumeFilename": "产品主简历_v4.pdf",
    "isCompleted": true,
    "created_at": "2026-04-18T08:00:00Z",
    "updated_at": "2026-04-19T10:10:00Z"
  }
}
```

**前端对应场景：** `AgendaView.tsx` 中 `TaskCard` 组件的 `toggle` 函数：

```typescript
function toggle() {
  const newStatus = !task.isCompleted;
  setLocalDone(newStatus);        // 乐观更新
  setTasks(prev => prev.map(t =>
    t.id === task.id ? { ...t, isCompleted: newStatus } : t
  ));

  fetch(`/api/v1/tasks/${task.id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ isCompleted: newStatus }),
  }).catch(() => {
    // 错误回滚
    setLocalDone(!newStatus);
    setTasks(prev => prev.map(t =>
      t.id === task.id ? { ...t, isCompleted: !newStatus } : t
    ));
  });
}
```

---

### 3.5 [PUT] `/jobs/{job_id}/notes` — 更新职位复盘笔记

更新指定职位的复盘笔记内容，对接抽屉详情页的笔记编辑功能。

> **说明：** 使用 `PUT` 而非 `PATCH`，强调这是对 `notes` 字段的全量替换语义。

#### 请求

**Endpoint:** `PUT /api/v1/jobs/{job_id}/notes`

**Path Parameters:**

| 参数 | 类型 | 说明 |
|------|------|------|
| `job_id` | string | Job 的 UUID |

**Request Body:**

```json
{
  "notes": "## 面试复盘\n\n**问题1：** 产品架构设计\n**回答要点：** 从用户分层、核心链路、数据架构三层展开...\n\n**改进方向：**\n- 加强 B 端产品经验的表述\n- 用 STAR 法则更结构化地描述项目"
}
```

| 字段 | 类型 | 必填 | 约束 | 说明 |
|------|------|------|------|------|
| `notes` | string | 是 | 最多 50000 字符 | 支持 Markdown 格式 |

#### 响应

**200 OK**

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "id": "job-001",
    "company": "字节跳动",
    "title": "高级产品经理",
    "stage": "面试中",
    "deadline": "2026-04-20",
    "time": "明天 14:00",
    "tags": {
      "referral": "有",
      "remaining": null,
      "round": "技术二面",
      "interviewTime": null
    },
    "progress": 75,
    "description": null,
    "notes": "## 面试复盘\n\n**问题1：** 产品架构设计\n**回答要点：** 从用户分层、核心链路、数据架构三层展开...\n\n**改进方向：**\n- 加强 B 端产品经验的表述\n- 用 STAR 法则更结构化地描述项目",
    "created_at": "2026-04-10T08:00:00Z",
    "updated_at": "2026-04-19T10:15:00Z"
  }
}
```

**前端对应场景：** `SideDrawer.tsx` 中 `handleNotesBlur` 回调：

```typescript
const handleNotesBlur = () => {
  if (notes !== job.notes) {
    onUpdate({ ...job, notes });
    fetch(`/api/v1/jobs/${job.id}/notes`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ notes }),
    });
  }
};
```

---

## 4. 附录

### 4.1 完整接口清单

| # | 方法 | Endpoint | 功能描述 | 前端对应 |
|---|------|----------|----------|----------|
| 1 | GET | `/api/v1/jobs` | 获取求职看板列表 | KanbanColumn 渲染 |
| 2 | POST | `/api/v1/jobs` | 新建求职投递记录 | 新增岗位按钮 |
| 3 | PATCH | `/api/v1/jobs/{job_id}/stage` | 更新职位阶段 | onDragEnd 拖拽 |
| 4 | PATCH | `/api/v1/tasks/{task_id}/status` | 更新任务完成状态 | Checkbox 勾选 |
| 5 | PUT | `/api/v1/jobs/{job_id}/notes` | 更新职位复盘笔记 | SideDrawer 笔记编辑 |
| 6 | GET | `/api/v1/tasks` | 获取任务列表 | AgendaView 渲染 |
| 7 | POST | `/api/v1/tasks` | 新建任务 | 新增待办 |
| 8 | GET | `/api/v1/jobs/{job_id}` | 获取单个职位详情 | SideDrawer 详情 |
| 9 | DELETE | `/api/v1/jobs/{job_id}` | 删除职位记录 | 卡片删除操作 |
| 10 | DELETE | `/api/v1/tasks/{task_id}` | 删除任务 | 任务划掉 |

### 4.2 前端 API 层设计建议

建议在 `lib/api/` 目录下封装统一的请求方法：

```typescript
// lib/api/client.ts
const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

interface ApiOptions {
  method?: string;
  body?: Record<string, unknown>;
  params?: Record<string, string>;
}

async function api<T>(endpoint: string, options: ApiOptions = {}): Promise<T> {
  const { method = 'GET', body, params } = options;
  const url = new URL(`${BASE_URL}${endpoint}`);

  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  }

  const res = await fetch(url.toString(), {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getAuthToken()}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const json = await res.json();
  if (json.code !== 0) throw new ApiError(json.code, json.message);
  return json.data as T;
}
```

### 4.3 未来扩展接口预览

以下接口可根据后续迭代需求逐步实现：

- `[GET] /api/v1/tasks` — 获取任务列表，支持按日期范围和 tag 过滤
- `[POST] /api/v1/tasks` — 新建独立任务（不关联 Job）
- `[POST] /api/v1/jobs/{job_id}/tasks` — 为指定 Job 创建关联任务
- `[GET] /api/v1/jobs/{job_id}` — 获取单个 Job 的完整详情
- `[DELETE] /api/v1/jobs/{job_id}` — 删除职位记录
- `[GET] /api/v1/resumes` — 获取简历文件列表
- `[POST] /api/v1/resumes/upload` — 上传简历文件
- `[GET] /api/v1/stats` — 获取统计数据（成功率、在投数量等）

### 4.4 文档维护约定

当涉及后端相关的前端改动（如新增接口）时，请按以下规范更新本文档：

1. **新增接口：** 在对应章节新增节，标注 `[新增]` 标签，并在第 4.1 节接口清单中追加一行。
2. **字段变更：** 在对应 Schema Definitions 小节更新字段说明，标注 `[变更]` 及变更日期。
3. **废弃接口：** 将接口标记为 `[废弃]` 并说明原因及建议替代方案。
4. **版本管理：** 每次重大变更时递增版本号（如 v1.1），在文档顶部更新日期。

---

*本文档由前端 Technical PM 维护，需与后端团队对齐后方可作为正式契约使用。*
