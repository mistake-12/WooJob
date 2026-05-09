# AI 建岗/建任务功能开发计划

## 概述
重构 AISidebar 的 AI 模式切换逻辑，利用 Tab 按钮精确路由 System Prompt，支持图片上传，并实现 DraftPreviewCard 预览卡片。

## 功能点

### 1. 模式切换与欢迎语
- 三个 Tab：`chat` | `extract_job` | `extract_task`
- 切换 Tab 时在聊天区插入本地欢迎提示（不存入后端）
- 调用 `sendMessage` 时传递当前 `aiMode`

### 2. 图片上传
- 输入框左侧添加图片上传按钮
- 支持预览已上传图片（带删除按钮）
- 图片转为 Base64 发送给后端

### 3. Draft 预览卡片
- 拦截 AI 回复中的 ` ```json ... ``` ` 代码块
- 渲染精美的 `<DraftPreviewCard>` 组件
- 支持在卡片内微调字段
- 点击确认按钮调用 Store 方法入库

### 4. System Prompt 重构
- `chat`: 通用对话
- `extract_job`: 严谨的岗位数据提取器
- `extract_task`: 严谨的日程提取器

## 文件修改清单

| 文件 | 修改内容 |
|------|---------|
| `components/AISidebar.tsx` | 模式切换、图片上传、Draft 卡片渲染 |
| `app/actions/ai-helpers.ts` | 优化 System Prompt 模板 |
| `store/useJobStore.ts` | 新增本地欢迎语状态和处理方法 |

## 实现步骤

1. [x] Step 1: 增强 AISidebar 模式切换逻辑
2. [ ] Step 2: 添加图片上传功能
3. [ ] Step 3: 实现 DraftPreviewCard 组件
4. [ ] Step 4: 实现消息拦截与卡片渲染
5. [ ] Step 5: 优化 System Prompt
