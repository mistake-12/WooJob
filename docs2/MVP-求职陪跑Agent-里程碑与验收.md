# 求职陪跑 Agent MVP - Milestones & Checklist

> 范围：能力诊断 → 差距填补(学习计划) → 简历优化
> 约束：新增 LangGraph 风格编排（不依赖 langchain/langgraph 包），LLM 配置复用现有 `app/actions/ai.ts`（`LLM_BASE_URL`/`LLM_MODEL`/`*_API_KEY`）。

## Milestone A：基础骨架（约 4-6 天）
### 后端
- [ ] 新增 journey 编排目录：`src/agents/journey/*` 或 `lib/journey/*`（按仓库惯例选一种）
- [ ] 新增统一入口：`app/api/journey/chat/route.ts`（SSE）
- [ ] 新增 `createServerSupabaseClientSync()` 在 route handler 中读取用户（或采用已有 cookie 注入方案）

### 前端
- [ ] 新增页面：`app/journey/page.tsx`（或 `app/(app)/journey/page.tsx`，视项目路由组织）
- [ ] 新增 Zustand store：`store/useJourneyStore.ts`（独立于 `useJobStore`）
- [ ] 基础 UI：ProgressTimeline + Chat + Sidebar 框架

### 验收
- [ ] 能创建/加载 journey，会话状态能持久化
- [ ] 聊天能发消息，服务端返回流式 token，前端可逐字显示

## Milestone B：能力诊断（约 4-6 天）
### 后端
- [ ] `CareerCoachAgent`：输入（targetPosition、resumeText/JD、背景），输出 `DiagnosisArtifact`
- [ ] 诊断 schema 校验（JSON parse + 必要字段检查 + 失败重试一次）
- [ ] artifacts 写入 `ai_journey_artifacts`（stage=diagnosis, artifact_type=diagnosis）

### 前端
- [ ] `GapAnalysisCard`：展示整体匹配度、差距列表、雷达图数据
- [ ] 输入引导：目标岗位 + 简历文本/上传（复用现有简历上传或先用粘贴）

### 验收
- [ ] 用户上传简历 + 输入岗位后，10 秒内生成诊断报告（PRD F-001）
- [ ] 差距包含 priority（高/中/低）且可排序

## Milestone C：学习计划（约 4-6 天）
### 后端
- [ ] `LearningAdvisorAgent`：基于高优差距 + dailyHours + learningStyle 生成 `PlanArtifact`
- [ ] 确保至少 1 个项目类计划项（PRD F-002 验收）
- [ ] 支持计划项状态更新（done/doing/todo）并持久化

### 前端
- [ ] `PlanCard`：按类型分组展示（学习/练习/项目/资源），支持勾选完成
- [ ] QuickAction：“进入简历优化（带入新项目经历）”

### 验收
- [ ] 每个学习项有资源链接/推荐描述
- [ ] 计划含项目实战建议，且 UI 能追踪进度

## Milestone D：简历优化（约 4-6 天）
### 后端
- [ ] `ResumeAgent`：输入简历 + 目标岗位 + 新经历，输出 `ResumeArtifact`
- [ ] 输出至少 3 条具体建议（PRD F-003 验收）

### 前端
- [ ] `ResumeSuggestionCard`：建议列表 + 一键复制改写文本
- [ ] 与计划阶段衔接：项目完成后提示“加入简历”，跳转并预填

### 验收
- [ ] 至少 3 条可执行建议
- [ ] 用户可复制/导出改写结果（先复制即可）

## 测试点（贯穿）
- [ ] 未登录访问：API 返回 401/错误提示；前端提示登录
- [ ] SSE 中断/超时：前端能恢复到可重试状态
- [ ] LLM 返回非 JSON：后端能兜底为纯文本消息 + 提示用户补充信息
- [ ] 数据隔离：不同 user_id 之间 journey/messages/artifacts 不串

## 发布前检查
- [ ] `.env.local`：`LLM_MODEL`/`LLM_BASE_URL`/`OPENAI_API_KEY`/`DEEPSEEK_API_KEY`/`KIMI_API_KEY` 至少一项可用
- [ ] Supabase 表已创建（见 `supabase_journey_tables.sql`）
- [ ] RLS 策略（如启用）：user_id 只能访问自己的 rows
