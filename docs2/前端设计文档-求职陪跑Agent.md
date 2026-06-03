# WooJob 求职陪跑 Agent — 前端设计文档

> **版本：v2.0**
> **日期：2026-05-26**
> **状态：重设计（修复交互冲突与容器冗余问题）**
> **技术栈：Next.js 14+ (App Router) + Tailwind CSS + Zustand + LangGraph**

---

## 一、问题诊断（v1.0 失败复盘）

### 1.1 双重入口（职能冲突）

**问题**：v1.0 实现中，主画布（左侧）和右侧 AI Sidebar 同时出现一模一样的静态表单（"选择简历版本 → 进入陪跑"）。

**根因**：把"入口表单"同时渲染在了两个容器里，用户产生认知失调："我到底该在哪边操作？"

**后果**：

- 用户困惑，不知道该点哪边
- 右侧 Director Agent 的对话空间被静态表单挤占，无法展开破冰对话
- "生成式"体验从第一步就断裂——用户看到的是一个后台管理表单，不是一个有生命力的旅程

### 1.2 容器冗余（Box-in-Box）

**问题**：在 `#EBE8E3`（大容器背景）内，又挖了一块白色大卡片，白卡内又套了边框。

**违反的设计原则**：WooJob「极简社论风」——克制使用边框和卡片，用留白（Whitespace）和排版（Typography）来划分层级。

### 1.3 缺乏"生成式"惊喜感

**问题**：入口给了一个干瘪的静态表单。陪跑是一个动态旅程，应该让用户在第一步就感受到"有东西在等待我"。

**正确预期**：从点击"求职陪跑" Tab 的瞬间开始，Director Agent 就已经"在场"——用户看到的第一个界面就应该是一个正在打字中的 Agent 破冰消息，而不是一张表单。

---

## 二、核心理念（v2.0 重构）

### 2.1 一个入口，一个对话流

**旧**：主画布 + AI Sidebar 同时渲染入口表单（双重入口）

**新**：

- **Header Tab「求职陪跑」** 是唯一入口
- 点击后，右侧 AISidebar 直接变为 Director Agent 的对话流
- 主画布显示当前阶段的**动态产出**（雷达图 / 简历对比 / 模拟面试画布），而不是静态表单
- **不存在独立的"陪跑入口页面"**——入口就是 Header Tab

### 2.2 隐形状态机（Invisible State Machine）

用户不需要知道当前是"诊断阶段"还是"简历优化阶段"。Director Agent 通过自然对话来推动阶段流转，用户感知到的是"和一个人聊天"，而不是"在填一个表单"。

### 2.3 主画布 = 阶段产出，而不是表单

每个阶段在主画布上有且只有一个"动态产出"：

| 阶段 | 主画布产出 |
|------|-----------|
| 能力诊断 | 能力雷达图 + 差距清单卡片 |
| 差距填补 | 学习路径甘特图 |
| 简历优化 | 简历对比视图（原文 ↔ 优化建议） |
| 面试准备 | 模拟面试沉浸画布 |
| 投递策略 | 公司矩阵地图 |
| Offer 谈判 | Offer 对比卡片组 |

### 2.4 右侧 Director Agent = 全局掌控感

右侧是唯一的对话入口。Agent 头像、名称、路由提示（`> Routing to Resume Agent...`）都在这里。用户始终在一个对话流里。

---

## 三、页面结构设计

### 3.1 整体布局（v2.0）

```
┌────────────────────────────────────────────────────────────────────────┐
│  Header (不变)                                                         │
│  WooJob!!!  |  [看板] [日程] [求职陪跑]  |  统计  用户                  │
├────────────────────────────────────────────┬─────────────────────────────┤
│                                            │                             │
│           主画布（Stage Output）            │   Director Agent 侧边栏     │
│                                            │                             │
│   阶段动态产出                             │   ┌─────────────────────┐ │
│   - 雷达图 / 甘特图 / 简历对比 / 面试画布  │   │ 🧠 Director          │ │
│                                            │   │                      │ │
│   【无静态表单】                            │   │ 对话流               │ │
│   【无双重入口】                            │   │                      │ │
│                                            │   │ 打字指示器           │ │
│                                            │   │ Agent 切换动画       │ │
│                                            │   │                      │ │
│                                            │   │ [输入框]             │ │
│                                            │   └─────────────────────┘ │
│                                            │                             │
├────────────────────────────────────────────┴─────────────────────────────┤
│  （底部区域：仅看板视图显示简历/任务，求职陪跑视图无此区域）                 │
└────────────────────────────────────────────────────────────────────────┘
```

**关键改变**：

- 求职陪跑视图下，`BottomShelf`（简历/任务区）隐藏
- 右侧 AISidebar 接管所有交互入口
- 主画布是"产出展示区"，不是"表单填写区"

### 3.2 三种 Header Tab 的主画布对比

| Tab | 主画布内容 | 右侧内容 |
|-----|-----------|---------|
| 看板 | 6列看板 | AI 助手（建岗/建任务） |
| 日程 | Agenda 日历 | AI 助手（建任务） |
| **求职陪跑** | **阶段产出（雷达图/简历对比等）** | **Director Agent 对话流** |

---

## 四、交互设计：完整用户剧本（v2.0）

### 4.1 起点：Header Tab 点击

```
用户行为：点击 Header Tab「求职陪跑」
          ↓
系统响应：
  1. currentView 切换为 'journey'
  2. 右侧 AISidebar 切换为 activeFeature='journey'
  3. 主画布渲染该 journey 的当前阶段产出
     （无 journey → 渲染空状态引导）
  4. 右侧立即出现 Director Agent 的破冰消息（打字中）
```

### 4.2 【无 Journey 状态】→ 破冰引导

当用户首次进入「求职陪跑」，且当前没有任何活跃 journey 时：

```
右侧 Director Agent（打字中）：
"你好，我是你的求职陪跑教练 🤝
我注意到你上传过一份简历（v2_前端开发.pdf）。
你的目标岗位是什么？直接告诉我，我来为你制定专属求职路线。"

主画布：显示空状态引导（无表单，只有引导文字 + 简历信息预览）
        ┌──────────────────────────────────────────────┐
        │                                              │
        │   检测到你的简历                              │
        │   v2_前端开发.pdf                            │
        │                                              │
        │   告诉我你的目标岗位，                        │
        │   我来为你规划一条求职路线。                   │
        │                                              │
        └──────────────────────────────────────────────┘
        风格：纯文字 + 留白，无边框卡片，遵循极简社论风
```

### 4.3 【创建 Journey → 能力诊断】

```
用户："我想去字节跳动做前端架构师"

右侧 Director Agent（打字中）：
"很好！目标已锁定：【字节跳动 · 前端架构师】
正在调用能力诊断专家为你分析当前能力与目标岗位的差距..."

（打字指示器 + 路由提示动画）
"> Routing to Career Coach Agent..."

↓

主画布（伴随 fade-in 动画）：
能力雷达图渐显 + 差距清单卡片滑入
（白板消失，动态产出渲染）

右侧 Director Agent（打字中）：
"诊断报告已生成。
我在「微前端架构」和「性能监控」上发现明显短板，
这两项在字节面试中是高频考点。

总体匹配度：62%
差距最大的三项：
  1. 微前端架构（差 34%）
  2. 性能监控体系（差 28%）
  3. 系统设计思维（差 19%）

要不要我为你制定一份【7天突击填补计划】？
还是直接进入【简历优化】？"
```

### 4.4 【能力诊断 → 差距填补】

```
用户："先帮我制定学习计划吧"

右侧 Director Agent：
"> Routing to Learning Advisor Agent..."
"没问题，我已联系学习规划专家。"

↓

主画布：
雷达图缩小 + 移动至顶部 ProgressTimeline（变成已完成节点 ✅）
甘特图滑入：7天学习路径

右侧 Director Agent（打字中）：
"计划已生成。
Day 1-2：微前端架构核心（qiankun 实战）
Day 3-4：性能监控体系（Lighthouse + Sentry）
Day 5-6：系统设计思维（DDD 入门）
Day 7：综合实战项目

这个节奏适合你吗？或者你有时间限制？"
```

### 4.5 【差距填补 → 简历优化】

```
用户："可以，帮我改简历吧"

右侧 Director Agent：
"> Routing to Resume Agent..."
"收到，正在为你召唤简历优化专家。"

↓

主画布（平滑过渡）：
甘特图缩小移入 ProgressTimeline ✅
简历对比视图滑入：
  ┌──────────────────┬──────────────────┐
  │     原文          │    AI 优化建议    │
  │                  │                  │
  │  负责前端开发    │  主导搭建微前端    │
  │                  │  架构体系（qiankun）│
  │  提升页面性能    │  构建性能监控体系  │
  │                  │  Lighthouse + Sentry│
  └──────────────────┴──────────────────┘

右侧 Director Agent（打字中）：
"已生成优化建议。
「负责前端开发」→ 「主导搭建微前端架构体系」
「提升页面性能」→ 「构建前端性能监控体系」

针对「微前端架构」的描述，我建议用 STAR 法则：
  Situation：在字节某业务线面临多团队协作挑战
  Task：需统一技术栈并实现子应用独立部署
  Action：引入 qiankun，实现主应用+子应用沙箱隔离
  Result：首屏加载从 3.2s 降至 1.1s

是否接受这些修改？"
```

### 4.6 【简历优化 → 模拟面试】

```
用户："改好了，我想试试模拟面试"

右侧 Director Agent：
"> Routing to Interview Committee..."
"收到。我正在为你组建面试委员会。
本次面试时长 15 分钟，包含技术面 + 行为面。

我退居幕后，接下来由【Tech Lead】和【Business Head】接管。
祝你好运。"

↓

主画布：界面切换为【沉浸式模拟面试画布】

  ┌────────────────────────────────────────────────┐
  │  🔴 REC          字节跳动 · 前端架构师 · 面试中    │
  ├────────────────────────────────────────────────┤
  │                                                │
  │  Tech Lead：                                 │
  │  "请介绍一下你在微前端架构方面的实践经验。"       │
  │                                                │
  │           [波形动画指示器]                      │
  │                                                │
  ├────────────────────────────────────────────────┤
  │  [语音输入]    [你的回答...]    发送            │
  └────────────────────────────────────────────────┘

（右侧侧边栏：实时多维度评分卡，Assessor Agent 在后台评分）
```

---

## 五、组件清单（v2.0）

> 所有组件遵循 `docs/DESIGN-SYSTEM.md` 规范。
> 主色调：`--accent #8B735B`，图标统一使用 `#8B735B`，不使用 Tailwind 默认 gray 色系。

### 5.1 新增组件

| 组件 | 路径 | 职责 |
|------|------|------|
| `JourneyShell` | `components/journey/JourneyShell.tsx` | 求职陪跑视图的根容器（条件隐藏 BottomShelf，切换主画布内容） |
| `JourneyChat` | `components/journey/JourneyChat.tsx` | Director Agent 对话流（替换 AISidebar journey 模式下的内容） |
| `DirectorAvatar` | `components/journey/DirectorAvatar.tsx` | Director Agent 头像（定稿，统一为深棕色 🧠 图标） |
| `JourneyProgressTimeline` | `components/journey/JourneyProgressTimeline.tsx` | 求职陪跑专用的顶部进度条（独立于看板 Header 进度） |
| `RadarChart` | `components/journey/RadarChart.tsx` | 能力雷达图（SVG 实现，遵循 accent 色系） |
| `GapAnalysisCard` | `components/journey/GapAnalysisCard.tsx` | 差距清单卡片（无边框，用色块区分优先级） |
| `LearningPlanGantt` | `components/journey/LearningPlanGantt.tsx` | 学习路径甘特图 |
| `ResumeCompareView` | `components/journey/ResumeCompareView.tsx` | 简历对比视图（原文 ↔ 优化建议，左右分栏） |
| `InterviewStageView` | `components/journey/InterviewStageView.tsx` | 沉浸式模拟面试画布（全屏 + 波形动画） |
| `RoutingHint` | `components/journey/RoutingHint.tsx` | Agent 路由提示动画（`> Routing to ...` 打字动效） |
| `DirectorTypingIndicator` | `components/journey/DirectorTypingIndicator.tsx` | Director 打字中指示器（深棕色三点脉冲） |

### 5.2 复用组件

| 组件 | 复用位置 | 说明 |
|------|---------|------|
| `TaskDetails` | 面试阶段追问 | 追问交互复用现有 TaskDetails 展开/收起逻辑 |
| `SideDrawer` | 简历对比 | 右侧弹出简历全文预览 |
| 现有 `MessageBubble` 样式 | JourneyChat | 复用消息气泡样式，仅替换配色（agent 消息用 `--accent`） |

### 5.3 需修改的现有组件

| 组件 | 修改内容 |
|------|---------|
| `AISidebar` | `activeFeature` 参数已存在（`ai | journey`），journey 模式下渲染 `JourneyChat` 替代原聊天 UI |
| `app/page.tsx` | `currentView` 类型已扩展 `'kanban' | 'agenda' | 'journey'`，journey 模式下隐藏 `BottomShelf` |

---

## 六、路由与视图映射（v2.0）

> 求职陪跑**不是一个独立页面**，而是 `app/page.tsx` 内的第三个视图。
> 通过 `currentView === 'journey'` 条件渲染，不需要新的 route。

```
app/page.tsx  (currentView 状态)
├── 'kanban'  → 看板主画布 + AISidebar(ai) + BottomShelf
├── 'agenda'  → AgendaView + AISidebar(ai)          （无 BottomShelf）
└── 'journey' → JourneyShell(JourneyProgressTimeline + StageOutput)
                    + AISidebar(journey → JourneyChat)
                    （无 BottomShelf）
```

---

## 七、Director Agent 侧边栏状态机

```
JourneyState:
  'idle'           // 无活跃 journey，显示破冰消息
  'creating'       // 用户在对话框输入目标岗位，创建中
  'diagnosis'      // 能力诊断中（主画布：雷达图生成动画）
  'gap_filling'    // 差距填补中（主画布：甘特图）
  'resume'         // 简历优化中（主画布：简历对比视图）
  'interview'      // 面试中（主画布：沉浸式面试画布）
  'strategy'       // 投递策略
  'offer'          // Offer 谈判

用户每次发送消息 → /api/journey/chat (SSE) → LangGraph 路由
                                      ↓
                              Director Agent 决定：
                              - 返回什么文字
                              - 推送什么 artifact 到主画布
                              - 是否触发阶段切换
```

---

## 八、API 设计（v2.0）

### 8.1 Journey 对话 API（SSE）

```
POST /api/journey/chat
Body: { journeyId?, message, stage, history[] }

Response: SSE Stream
data: { type: 'token', content: string }          // 打字输出
data: { type: 'routing', agent: AgentType }        // 路由提示
data: { type: 'artifact', artifact: Artifact }     // 主画布产出
data: { type: 'stage_change', newStage: Stage }    // 阶段切换
data: { type: 'done' }                             // 结束
```

### 8.2 创建 / 获取 Journey

```
GET  /api/journey          → 获取当前用户活跃 journey
POST /api/journey/create   → 创建新 journey（已存在）
GET  /api/journey/:id      → 获取指定 journey（含 artifacts）
```

### 8.3 Artifacts CRUD

```
POST   /api/journey/artifacts       → 写入 artifact
GET    /api/journey/:id/artifacts   → 读取当前 journey 所有 artifact
```

---

## 九、样式规范（继承 WooJob Design System）

> 求职陪跑组件**严格复用** `docs/DESIGN-SYSTEM.md` 中的所有 Token，不新增自定义颜色。

| Token | 值 | 使用场景 |
|-------|-----|---------|
| `--accent` | `#8B735B` | Agent 头像、图标、进度条、按钮、主色调 |
| `--bg-sidebar` | `#EBE8E1` | JourneyChat 主容器背景 |
| `--bg-column` | `#E8E5E0` | 消息区域背景 |
| `--text-primary` | `#111111` | 主标题、阶段名称 |
| `--text-secondary` | `#666666` | 正文、对话文字 |
| `--text-muted` | `#999999` | 打字指示器、路由提示 |
| `--border-light` | `#E0DCD1` | 卡片边框（仅在需要区分层级时使用） |

### 特殊场景配色

| 场景 | 用色 | 方式 |
|------|------|------|
| 雷达图填充 | `accent/20`（#8B735B 20% 透明） | Tailwind `bg-[#8B735B]/20` |
| 路由提示动画 | `--accent` + 打字机效果 | CSS animation |
| 面试画布（全屏） | `#111111` 背景 + 白色文字 | 全屏沉浸模式 |
| 雷达图差距区域 | `#8B735B` 实色 vs `accent/10` 差距区 | SVG fill |

---

## 十、MVP 里程碑（v2.0 实施路径）

### Milestone 1：消除双重入口 ✅（本轮）

- [x] 移除主画布中的 JourneyEntryPanel 表单
- [x] `AISidebar` 支持 `activeFeature='journey'` 模式
- [x] Header Tab「求职陪跑」切换时主画布不渲染多余卡片

### Milestone 2：Director Agent 破冰（下一步）

- [ ] 新增 `JourneyChat` 组件（替换现有 journey 模式下的静态面板）
- [ ] 无 journey 时，Director Agent 显示破冰消息
- [ ] 用户输入目标岗位 → 创建 journey → 调用 `/api/journey/create`
- [ ] 创建成功后，Director 说引导语 + 触发诊断

### Milestone 3：能力诊断主画布

- [ ] 新增 `RadarChart`（SVG 雷达图）
- [ ] 新增 `GapAnalysisCard`
- [ ] 诊断完成 → SSE 推送 artifact → 主画布 fade-in 雷达图
- [ ] Director Agent 给出差距清单 + 建议

### Milestone 4：简历优化主画布

- [ ] 新增 `ResumeCompareView`
- [ ] 简历优化 artifact → 主画布左右对比视图
- [ ] 逐条接受/拒绝优化建议

### Milestone 5：模拟面试沉浸画布

- [ ] 新增 `InterviewStageView`
- [ ] 波形动画 + 实时字幕
- [ ] 多 Agent 轮换（Tech Lead / Business Head）
- [ ] 面试报告生成

---

*本文档对齐 WooJob Design System (docs/DESIGN-SYSTEM.md)，继承其极简社论风设计语言。所有颜色、圆角、阴影、间距严格复用已有 Token，不新增自定义样式。*
