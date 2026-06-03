# brainstorm: 求职陪跑 Agent 功能设计

## Goal

为 WooJob 设计并逐步落地一套“求职陪跑 Agent”功能，让现有求职管理系统从看板/日程/建档工具升级为覆盖能力诊断、差距填补、简历优化、面试模拟、投递策略与 Offer 谈判的 AI 陪跑产品。

## What I already know

* 用户希望我阅读现有代码、README 与 `docs2/PRD-求职陪跑Agent2.md`，先进行提问与开发计划设计。
* 现有产品是 WooJob 求职管理系统，已有看板、日程、AI 侧边栏、岗位/任务建档、简历上传与 Supabase 数据能力。
* `docs2/PRD-求职陪跑Agent2.md` 规划的是 Hub & Spoke 架构：用户从中心 Hub 自由进入能力诊断、差距填补、简历优化、面试模拟、投递策略、Offer 谈判等阶段。
* 新 PRD 明确倾向“无 Director + Guide Agent 侧边栏”：Hub 页面负责路由，Guide Agent 做陪伴、解释、推荐下一步；各子 Agent 平级，通过共享数据池读取/写入阶段产出。
* 现有 `components/journey/JourneyShell.tsx` 仍显示“Director 负责路由与推进”“一个对话流，多个 Agent，一条时间线”，与新 PRD 的无 Director / Hub & Spoke 方向存在冲突。
* 现有 `components/AISidebar.tsx` 已支持通用 AI 对话、岗位建档、任务建档、图片上传与会话管理，可作为 Guide Agent 或建档 Agent 的基础。
* 现有 `JourneyEntryPanel.tsx` 已支持选择简历版本并进入陪跑，但目前入口更偏“选择简历后开始单条陪跑流”，尚未完整实现 Hub 阶段卡片。
* 已存在 `app/api/journey/create/route.ts` 与 `supabase_journey_tables.sql`，说明求职陪跑相关 journey 表已有初始草稿。
* 现有依赖：Next.js 16 App Router、React 18、Tailwind、Zustand、Supabase、OpenAI SDK 兼容客户端。

## Assumptions (temporary)

* 本轮目标优先是形成可实施的 Agent 功能方案与 MVP 边界，而不是一次性实现 PRD 中全部 6 个 Agent。
* MVP 应优先复用现有 AI 对话、简历列表、Supabase、侧边栏与 journey 初始代码，避免重写整个产品。
* 由于现有代码里已有旧版 Director 文案/结构，需要先决定是保留旧思路还是切换到新 PRD 的 Hub + Guide Agent。

## Open Questions

* 求职陪跑 Hub 页面上，未纳入 MVP 的阶段卡片（如简历优化、面试模拟、投递策略、Offer 谈判）是显示为“即将开放”，还是允许进入占位页查看说明？

## Requirements (evolving)

* 设计求职陪跑 Agent 功能，覆盖用户从求职准备到面试反馈的核心流程。
* 方案需要结合现有代码，不做脱离项目现状的空泛设计。
* 需要给出可分阶段开发计划。
* 架构确认采用 **Hub + Guide Agent，无 Director**：Hub 页面负责路由；Guide Agent 只做陪伴、解释、推荐下一步；子 Agent 平级，不再做主 Agent 编排多 Agent 的线性流程。
* “求职陪跑” tab 一进入就展示阶段卡片，而不是先进入单线 Director 对话流。
* MVP 聚焦 **能力诊断** 与 **差距填补** 两个功能；其他阶段可展示为未开放/Coming soon/二期能力，但不在本轮实现核心逻辑。
* 需要重构/替换当前与旧线性思路冲突的文案和结构，尤其是 `JourneyShell` 中的 Director、时间线、单一路径叙事。
* 能力诊断 MVP 采用 **表单 + 一键生成报告** 的交互：用户填写/选择目标岗位、目标公司可选、JD/岗位描述、简历版本/自我描述后点击生成。
* 能力诊断需要支持 **图片识别**：用户可以上传岗位截图/JD 截图/招聘页截图，AI 自动识别岗位相关内容，再基于识别结果生成能力诊断报告。
* 图片/JD 识别后采用 **可编辑预览确认**：AI 先识别岗位名称、公司、岗位要求、核心能力、职责关键词等，展示预览卡片；用户确认或修改后，再生成能力诊断报告。
* 能力诊断报告 MVP 采用 **结构化诊断报告**：包含总体匹配度、能力雷达图数据、差距清单、每个差距的优先级、证据、建议行动，以便直接驱动差距填补。
* 深度顾问式报告（求职策略、岗位竞争分析、简历改写方向、面试风险点）列为后续迭代方向，不进入 MVP 核心交付。
* 交互要求：用户点击每个流程/阶段卡片后，应进入该流程对应的 **新界面**，而不是在 Hub 卡片上直接展开完整流程。
* 阶段新界面采用 **独立路由页面**：求职陪跑 Hub 展示所有流程卡片；点击能力诊断进入类似 `/journey/diagnosis`；点击差距填补进入类似 `/journey/gap-filling`，便于刷新、收藏与后续独立扩展每个 Agent。
* MVP 需要上线 **真实 Guide Agent 对话**，并优先复用/升级现有 `AISidebar`：在求职陪跑 Hub 与各阶段页面右侧常驻，负责解释阶段、回答问题、推荐下一步，而不是充当 Director。
* Guide Agent 的实现重点是 **长期记忆管理 + Journey 上下文注入 + 提示词重构**，而不是重做一套新的聊天 UI。
* Guide Agent 对话记录与普通 AI 助手 **分开存储**：普通 AI 继续使用 `ai_conversations / ai_messages`；求职陪跑 Guide Agent 使用 `ai_journey_messages`，避免历史污染并保持旅程语义清晰。
* MVP 阶段每个用户先采用 **单一长期 journey**：用户在同一条陪跑旅程里积累岗位识别结果、诊断报告、行动计划与 Guide Agent 对话，简化数据模型与恢复逻辑。
* “按目标岗位/目标方向创建多个 journey” 作为后续迭代方向，不进入 MVP。
* 能力诊断报告与差距填补行动计划需要 **持久化到 Supabase**，不能只停留在前端状态/localStorage，以支持刷新恢复、后续阶段读取、Guide Agent 推荐与长期陪跑记忆。
* 持久化范围在 MVP 先采用 **核心产出优先**：先保存岗位/JD 识别结果、能力诊断报告、差距填补行动计划三类核心产出；阶段状态仅做轻量字段（如 `current_stage`、`completed_stages`），不在 MVP 一步到位实现完整 JourneyContext 持久化。
* 差距填补 MVP 采用 **按阶段的行动计划**：把诊断差距拆为 `学习 → 练习 → 项目产出 → 简历沉淀` 等行动项，每项包含优先级、预计耗时、完成标准，并作为后续任务/日程联动的基础。
* 差距填补需要评估并尽量复用现有 **日程管理模块** 与 **求职管理模块**：学习/练习/项目行动项可考虑复用 tasks 表/AgendaView 作为待办与时间提醒；与具体岗位相关的计划可关联 jobs/看板卡片。
* 差距填补 MVP 支持 **单项加入日程/任务**：每个行动项提供“加入日程”入口，用户选择日期/时间后创建到现有任务系统；暂不做整份计划自动批量排程。
* 日程/任务管理需要围绕行动计划做适配设计：MVP 优先复用现有 `tasks`、`AgendaView`、`TaskDetails`、`useJobStore.createTask`，避免重做整套任务系统；后续再演进甘特图/时间轴排程视图。
* 行动计划与日程管理演进路线确认：MVP 先复用现有日程模块做“单项加入日程”；P1 增加行动计划专属执行视图；P2 再做甘特图/时间轴排程、拖拽调整、延期重排与更深的求职卡片联动。

## Acceptance Criteria (evolving)

* [ ] 明确 MVP 包含哪些 Agent / 阶段、哪些延期到 P1/P2。
* [ ] 明确是否采用 Hub + Guide Agent 架构，并记录原因。
* [ ] 明确前端页面结构、侧边栏职责、API/数据模型落地点。
* [ ] 形成可拆分的小步实施计划。
* [ ] 后续实现时 lint/typecheck/build 或等价质量检查通过。

## Definition of Done (team quality bar)

* Tests added/updated where appropriate.
* Lint / typecheck / build green where project supports them.
* Docs/notes updated if behavior changes.
* Rollout/rollback considered if risky.

## Out of Scope (explicit)

* 一次性上线完整 RAG 知识库、岗位爬虫、语音面试、社区或企业端。
* 在未确认 MVP 边界前直接实现所有 PRD 功能。

## Technical Notes

* Inspected: `docs2/PRD-求职陪跑Agent2.md` — 新版求职陪跑 Agent PRD，主张 Hub & Spoke、无 Director、Guide Agent 常驻侧边栏、三层记忆。
* Inspected: `README.md` — 当前项目简要 PRD，包含三大 AI 工作流：岗位发现、模拟面试、NLU 极速建档。
* Inspected: `package.json` — 当前栈为 Next.js、React、Tailwind、Zustand、Supabase、OpenAI SDK。
* Inspected: `app/page.tsx` — 已有 `currentView: 'kanban' | 'agenda' | 'journey'`，顶部可切换“求职陪跑”。
* Inspected: `components/AISidebar.tsx` — 现有侧边栏有 `chat` / `extract_job` / `extract_task` 三种模式，可承接 Guide Agent 或极速建档能力。
* Inspected: `components/JourneyEntryPanel.tsx` — 已有简历选择入口。
* Inspected: `components/journey/JourneyShell.tsx` — 当前实现与新版 PRD 架构冲突，仍是 Director 单线叙事。
* Inspected: `app/actions/ai.ts` and `app/actions/ai-helpers.ts` — 现有 AI Server Actions 支持通用聊天与结构化抽取。
* Inspected: `store/useJobStore.ts` — 当前 Zustand store 已集中管理 jobs/tasks/AI conversation，但尚未纳入 journey shared context。
* Inspected: `supabase_journey_tables.sql` and `app/api/journey/create/route.ts` — journey 表/API 已有草稿，但 SQL 与 route 字段可能不完全一致（route 使用 `resume_file_id/resume_url/resume_filename`，SQL 初始表未列出这些字段）。
