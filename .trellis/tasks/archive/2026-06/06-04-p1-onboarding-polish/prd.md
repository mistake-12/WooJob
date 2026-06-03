# P1: 看板空状态模板卡片 + 日程过期淘汰 + 预加载 + 视图切换缓存

## Goal

修复多项体验问题：空状态展示、过期任务淘汰、登录预加载、视图切换不重复请求。

## 问题诊断

### 问题 1：看板空状态空白
`page.tsx` 中 `jobsByStage` 为空时，`KanbanColumn` 显示空白列，用户首次打开无法理解产品功能。
**修复**：`totalJobs === 0` 时，在看板区域展示一组示例模板卡片（不可交互/只读），展示产品价值。

### 问题 2：过期任务无淘汰机制
`AgendaView.tsx` 的 `getSmartDefaultMonth()` 在每月 1-9 日切换到上月，但**不会过滤已过去的面试/笔试任务**。
例如今天 6 月 4 日，昨天 6 月 3 日的"面试"任务仍然显示在"近期面试"区域。
**根因**：`groupTasksByDate()` 不做日期过滤，所有月份内的任务都显示。
**修复**：在 `AgendaView` 中增加过期过滤 —— 已过去的"面试"/"笔试"标记 tag 的任务自动隐藏，已完成的任务正常保留。

### 问题 3：登录后先白屏再加载，各视图切换重复请求
**根因 A**：`useEffect` 中 `fetchJobs/fetchTrashedJobs/fetchTasks` 三个请求并发，但 `page.tsx` 没有 loading 状态，先渲染空看板再异步填充，导致白屏感。
**修复 A**：在 `useJobStore` 增加 `dataReady` 状态，三个请求全部完成后设为 true。`page.tsx` 在 `dataReady === false` 时展示全局 loading skeleton。

**根因 B**：`useEffect` 的依赖数组是 `[fetchJobs, fetchTrashedJobs, fetchTasks]` —— 这些是 store 的 selector 引用，在 Zustand 中引用不稳定，导致每次 `page.tsx` 重渲染时依赖"变化"而重新执行 effect。切换到 agenda/journey 导致 setState → 重新渲染 → effect 重新执行。
**修复 B**：useEffect 只应该在组件 mount 时执行一次。改用空数组 `[]`（ESLint 规则需要 suppress 注释说明原因）或使用 ref 防止重复。

### 问题 4：一般代码审查
- `useJobStore` 的 `fetchTasks` 传递 `month` 参数逻辑：无参时替换全部 tasks，有参时合并 —— 但在 `page.tsx` 中 `fetchTasks()` 调用无参 → 替换全部。视图切换回 agenda 时 tasks 可能已被覆盖。
- `loadingMonth` 只防同一个月的并发请求，不防重复初始化。

## Requirements

* 看板空状态展示模板卡片（不可交互，纯展示）
* 日程视图自动隐藏已过期的面试/笔试任务
* 登录后增加全局预加载状态，所有数据加载完再渲染
* 视图切换不再触发数据重新加载
* 代码审查修复发现的逻辑问题

## Acceptance Criteria

* [ ] 空看板展示模板卡片，用户能理解产品功能
* [ ] 已过去的面试/笔试任务不显示在 AgendaView
* [ ] 登录后先显示 loading skeleton，数据就绪后渲染
* [ ] 看板→日程→看板切换不触发重新请求
* [ ] TypeScript / Build 通过
