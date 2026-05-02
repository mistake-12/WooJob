# 底部白色区域 Bug 分析与修复

> 文档日期：2026-05-03
> 影响版本：v1.x

---

## 1. Bug 现象

- 与 AI 助手对话交互后，页面底部（BottomShelf 区域）出现一块意外的白色/透明区域
- 界面上方内容被遮挡，视觉上像被向下推了一截
- 页面无法向上滚动查看被遮挡的内容
- 拖拽看板卡片后，页面逐渐"归位"恢复正常
- 再次与 AI 对话，Bug 复现

---

## 2. 根因分析

### 核心问题：Flexbox 的 `min-height: auto` 默认行为

CSS Flexbox 规范规定：**flex 子项的默认最小高度为 `auto`，即"不小于内容自然高度"**。这在垂直方向上表现为：当 flex 子项的内容增长时，它会推动父容器一起变大，而不是触发自身溢出滚动。

### 问题代码位置

`components/AISidebar.tsx` 第 101 行：

```tsx
<div className="w-[300px] h-full bg-[#E6E3DF] border-l border-[#CFCCC8] flex flex-col">
```

缺失了 `min-h-0` 约束。

### 问题发生的完整链条

```
页面最外层容器 (h-screen overflow-hidden)
└── 主卡片 (h-[95vh] overflow-hidden)
    └── 中部 flex-1 min-h-0 overflow-hidden
        ├── 左侧 flex-1 flex flex-col overflow-hidden  ← Left content
        └── 右侧 AISidebar (h-full flex flex-col)     ← MISSING min-h-0 ⚠️
            ├── Header (flex-shrink-0)
            ├── 消息列表 (flex-1 overflow-y-auto)     ← flex-1 默认 min-height: auto
            └── 输入框 (flex-shrink-0)
```

**事件序列：**

1. 用户发送消息 → `sendAIMessage` 异步调用 → 收到 AI 回复
2. `aiMessages` 状态更新 → React 重新渲染消息列表
3. 消息列表高度增加 → `flex-1` 的消息 div 试图撑到"与内容同高"
4. 由于父容器 `flex flex-col` 没有 `min-h-0` 约束 → **父容器随内容扩大**
5. 右侧侧边栏扩大 → 通过 `flex-1` 推动左侧内容区向下偏移
6. 页面最外层有 `overflow-hidden` → 左侧内容区被**裁剪在视口外**
7. 底部留下空白区域（BottomShelf 区域露出的父容器背景）

### 为什么拖拽卡片能"修复"

`@hello-pangea/dnd`（drag-and-drop 库）在拖拽过程中和结束时会强制触发浏览器的 **layout recalculation**（布局重算）。这个重算会让浏览器的 flexbox 收缩算法重新生效，迫使侧边栏回到被约束的高度。表现上就是"页面逐渐归位"。

---

## 3. 修复方案

### 修复 A — 根因修复（必须）

在侧边栏外层 div 添加 `min-h-0`：

```tsx
// 修复前
<div className="w-[300px] h-full bg-[#E6E3DF] border-l border-[#CFCCC8] flex flex-col">

// 修复后
<div className="w-[300px] h-full min-h-0 bg-[#E6E3DF] border-l border-[#CFCCC8] flex flex-col">
```

**原理：** `min-h-0` 覆盖了 flex 子项默认的 `min-height: auto`，强制父容器不允许被内容撑开。消息列表的 `overflow-y-auto` 会在内容超出时正确触发滚动，而不是让父容器变大。

### 修复 B — `scrollIntoView` 防护（推荐）

```tsx
// 修复前
useEffect(() => {
  messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
}, [aiMessages]);

// 修复后
useEffect(() => {
  if (messagesEndRef.current) {
    messagesEndRef.current.scrollIntoView({ block: 'end', behavior: 'smooth' });
  }
}, [aiMessages]);
```

添加 `{ block: 'end' }` 明确滚动方向，`if` 守卫防止 `null` 引用错误。

---

## 4. 为什么之前没有这个问题

在引入 AI 侧边栏功能之前，页面右侧不存在独立的 `flex flex-col` 子容器，因此不存在"父 flex 容器 + flex-1 子项 + 内容增长"的组合。引入侧边栏后，右侧栏与左侧主内容区共同作为 `flex-1` 子项存在于同一个父 flex 容器中，放大了这个潜在的布局缺陷。

---

## 5. CSS Flexbox `min-height: auto` 规则速查

| 父容器属性 | 子项默认 `min-height` | 表现 |
|---|---|---|
| `flex flex-col` | `auto`（内容高度） | 内容增长时父容器跟着变大 |
| `flex flex-col min-h-0` | `0` | 父容器被压缩到可用高度，子项 `overflow` 生效 |

**什么时候必须加 `min-h-0`：**

- 当父 flex 容器有固定高度约束（如 `h-screen`、`h-[95vh]`）
- 且子 flex 项使用 `flex-1`（占据剩余空间）
- 且子项内部有滚动或溢出内容

**本项目受影响的其他潜在位置（已检查，暂无需修复）：**

- `AgendaView` 左侧边栏 `aside flex flex-col overflow-y-auto`：已有显式 `overflow-y-auto`，高度由父 `h-full` 约束，不受影响
- `KanbanColumn` 列根容器：高度由父列列表的 `overflow-y-hidden items-stretch` 约束，不受影响

---

## 6. 修改记录

| 日期 | 文件 | 修改内容 |
|---|---|---|
| 2026-05-03 | `components/AISidebar.tsx` | 外层 div 添加 `min-h-0` |
| 2026-05-03 | `components/AISidebar.tsx` | `scrollIntoView` 添加 `{ block: 'end' }` 和 null 守卫 |
