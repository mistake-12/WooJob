# 设计系统 (Design System)

> 本文档记录 WooJob 求职管理系统的所有设计 Token，是代码变更时保持视觉一致性的唯一事实来源。

---

## 1. 色彩系统 (Colors)

### 主题色 (Brand / Accent)

| Token         | Hex       | 用途                              |
|---------------|-----------|----------------------------------|
| `--accent`    | `#8B735B` | 主色调：图标、文字高亮、进度条、标签 |
| `--accent-hover` | `#7A654D` | 按钮悬停态（KanbanColumn 加号按钮） |

### 背景色 (Background)

| Token           | Hex       | Tailwind 引用      | 用途                        |
|-----------------|-----------|--------------------|-----------------------------|
| `--bg-outer`    | `#D1CFCA` | `bg-[#D1CFCA]`     | 最外层画布（页面背景）          |
| `--bg-main`      | `#F4F3EE` | `bg-[#F4F3EE]`     | 未使用（CSS 变量定义备用）     |
| `--bg-card`      | `#FFFFFF` | —                  | 卡片背景（JobCard 内部）      |
| `--bg-sidebar`   | `#EBE8E1` | `bg-[#EBE8E1]`     | 侧边栏、AI 面板、Bottom Sheet 背景 |
| `--bg-column`    | `#E8E5E0` | `bg-[#E8E5E0]`     | 看板列背景、Drag-over 态       |
| —               | `#EBE8E3` | `bg-[#EBE8E3]`     | 看板主容器（page.tsx）         |
| —               | `#E5E1DA` | `bg-[#E5E1DA]`     | 输入框背景、标签胶囊背景        |

### 文字色 (Typography)

| Token            | Hex       | 用途                                   |
|-----------------|-----------|---------------------------------------|
| `--text-primary` | `#111111` | 主标题、卡片职位名、侧边栏标题           |
| `--text-secondary`| `#666666` | 正文、标签类型文字                       |
| `--text-muted`   | `#999999` | 次要信息、图标辅助说明                    |

### 边框 / 分割线 (Border / Divider)

| Token            | Hex       | 用途                              |
|-----------------|-----------|----------------------------------|
| `--border-light` | `#E0DCD1` | 卡片进度条轨道、滚动条、分割线          |
| —               | `#DCD9D1` | Bottom Shelf 内部分割线              |
| —               | `#D8D4CE` | AI Sidebar / SideDrawer 内部分割线   |
| —               | `#CFCCC8` | 看板列间竖线、列标题底边、header 底边   |

### 状态色

| 色值              | Hex       | 用途                     |
|-----------------|-----------|-------------------------|
| 成功绿            | `#8B735B` | 当前状态（与主色同色复用）    |
| 草稿灰            | `#999999` | DRAFT 标签                |
| 待办灰            | `#BBBBBB` | 空列占位提示文字             |
| 禁用灰            | `#E0DCD1` | 已完成进度条、OFFER 标签     |

### 图标色

所有语义图标（Briefcase / TrendingUp / Activity / Plus / Calendar / Clock / User / Tag）均使用 `#8B735B`，不可滥用 Tailwind 默认 gray 色系。

---

## 2. 字体系统 (Typography)

### 字体族

```css
font-family: 'Inter', system-ui, sans-serif;
font-family: 'JetBrains Mono', monospace; /* 仅用于极少数代码展示场景 */
```

### 字号层级

| 类名              | 实际像素 | 用途                        |
|-----------------|-------|---------------------------|
| `text-6xl font-black italic` | ~60px | 主标题（页面大标题）            |
| `text-3xl font-black`       | 30px  | SideDrawer 职位标题           |
| `text-2xl font-black`        | 24px  | AgendaView 日期标题           |
| `text-base font-bold`        | 16px  | 列标题 `h2`                  |
| `text-sm font-bold`          | 14px  | 卡片职位名、侧边栏标题          |
| `text-sm font-medium`        | 14px  | 正文（简历名、日程标题）         |
| `text-sm`                    | 14px  | AI 对话消息                   |
| `text-xs font-medium`        | 12px  | 统计数据标签、职位公司名         |
| `text-xs`                    | 12px  | 进度条百分比、标签选择器文字     |
| `text-[10px] font-medium`    | 10px  | DRAFT / OFFER 状态标签        |
| `text-[10px]`                | 10px  | 日期数字、空列提示              |

### 字重使用规范

| 字重   | 使用场景                                   |
|------|------------------------------------------|
| `font-black`  | 主标题（大字 italic，h1 级别）                 |
| `font-bold`   | 列标题 h2、卡片职位名 h3、侧边栏小标题           |
| `font-semibold`| Agenda 待办文字、Tab 选中态                  |
| `font-medium` | 正文、次要标签、日程时间                       |
| `font-medium` | 统计数据数值（`text-2xl font-bold`）           |
| `font-normal` / 无 | 次要信息文字                  |

### 字间距 / 行高

| 类名                          | 值   | 使用场景              |
|-----------------------------|------|-------------------|
| `tracking-tighter`          | -0.02em | 主标题（大字紧凑）    |
| `tracking-widest`           | 0.1em  | Agenda 侧边栏分类标签 |
| `uppercase tracking-[0.3em]` | 大写+宽字距 | header 副标题标签  |
| `leading-none`               | 1.0   | 大标题无下行空间      |
| `leading-tight`             | 1.25  | 主标题副标题          |
| `leading-snug`              | 1.375 | 卡片职位名           |
| `leading-relaxed`           | 1.625 | SideDrawer 文本域    |

---

## 3. 圆角系统 (Border Radius)

| 类名              | 值   | 使用场景                                |
|-----------------|------|---------------------------------------|
| `rounded-2xl`    | 16px | 看板主容器（最外层白色卡片）                |
| `rounded-xl`    | 12px | AgendaView 空状态框                     |
| `rounded-lg`    | 8px  | 输入框、标签胶囊、日期卡片                   |
| `rounded-md`    | 6px  | 卡片本体、简历版本卡片、按钮                |
| `rounded`       | 4px  | 进度条轨道、分割线                        |
| `rounded-full`  | 9999px | FAB 圆形按钮、状态指示点、Tab 下划线      |
| `rounded-sm`    | 2px  | 滚动条                                   |

---

## 4. 阴影系统 (Shadow)

| 类名         | 配置                               | 使用场景            |
|------------|----------------------------------|-------------------|
| `shadow-xl` | Tailwind 默认                     | 看板主容器           |
| `shadow-[0_-4px_40px_rgba(0,0,0,0.15)]` | 自定义 | SideDrawer Bottom Sheet 上浮阴影 |
| `shadow-sm` | Tailwind 默认                     | 卡片默认态、输入框、标签按钮 |
| `shadow-md` | Tailwind 默认                     | 卡片悬停态           |
| `shadow-2xl` | Tailwind 默认                     | 卡片拖拽态           |
| `ring-2 ring-gray-900/10` | Tailwind | 卡片拖拽态描边        |

---

## 5. 间距系统 (Spacing)

### 页面级布局

| 位置              | 值           | 含义              |
|-----------------|-------------|-----------------|
| 最外层背景        | `p-4`       | 画布与浏览器边距 16px |
| 主容器尺寸        | `max-w-[95vw] h-[95vh]` | 占据 95% 视口 |
| 主容器内边距      | `px-8 pt-7 pb-5` | header 区域 |
| 看板列内边距      | `px-3`       | 列内容与左右边缘 |
| 看板列最小宽度    | `min-w-[260px]` | 单列最小宽度 |

### FAB 按钮定位

| Token          | 值    | 说明                  |
|---------------|-------|---------------------|
| `bottom-3`    | 12px  | FAB 距看板底部        |
| `right-3`     | 12px  | FAB 距看板右侧        |

> **等距原则**：FAB 的 bottom 与 right 必须永远保持相等，形成正方形对齐基准。

### 组件内间距

| 场景              | 值                |
|-----------------|-------------------|
| 卡片内边距        | `p-3`             |
| 卡片内元素间距    | `gap-2`           |
| 标签胶囊内边距    | `px-4 py-1.5`     |
| SideDrawer 内边距 | `px-8`           |
| AI Sidebar 内边距 | `px-5`           |

---

## 6. 动效 / 过渡系统 (Transition)

| 类名                                          | 配置                          | 使用场景           |
|---------------------------------------------|------------------------------|------------------|
| `transition-all duration-300`               | 全属性，300ms                | FAB 按钮           |
| `transition-colors`                          | 仅颜色属性                    | 标签、Tab、按钮    |
| `transition-opacity`                         | 仅透明度                      | 列标题加号按钮      |
| `transition-all duration-500 ease-in-out`   | 全属性，500ms                | 进度条动画         |
| `transition-shadow`                           | 仅阴影                        | 卡片悬停           |

### 特殊动效

- 卡片拖拽旋转：`rotate-3 scale-[1.05]`（拖起时顺时针 3°，放大 1.05x）
- 卡片放下回弹：`rotate-0 scale-100`（恢复默认）
- 弹性悬停：`hover:-translate-y-1`

---

## 7. 层级 / Z-Index

| 值    | 使用场景                            |
|-----|---------------------------------|
| `z-50` | FAB 新建岗位按钮                   |
| `z-[100]` | SideDrawer 遮罩层                 |
| `z-[101]` | SideDrawer Bottom Sheet 面板     |

---

## 8. 图标规范

### 图标尺寸

| 类名     | 值    | 使用场景                 |
|--------|------|----------------------|
| `w-5 h-5` | 20px | 统计指标图标、操作按钮图标   |
| `w-4 h-4` | 16px | AI 对话图标、输入框发送按钮 |
| `w-3.5 h-3.5` | 14px | SideDrawer 字段图标 |
| `w-3 h-3`  | 12px | 列标题加号图标           |
| `w-1.5 h-1.5` | 6px | 状态指示点（圆点）         |

### 图标色

所有语义图标统一使用 `#8E7E6E`（浅版 accent）或 `#8B735B`（标准 accent）。**严禁**在语义图标上使用 Tailwind gray 色系。

---

## 9. 组件规范摘要

### JobCard 卡片

```html
<!-- 卡片外层 -->
<div class="bg-white rounded-md border border-gray-100 p-3 flex flex-col gap-2">
  <!-- 拖拽态 -->
  class="rotate-3 scale-[1.05] shadow-2xl ring-2 ring-gray-900/10 cursor-grabbing"
  <!-- 默认态 -->
  class="rotate-0 scale-100 shadow-sm cursor-grab hover:shadow-md hover:-translate-y-1"
</div>
```

### 看板列 KanbanColumn

```html
<div class="flex flex-col min-w-[260px] flex-shrink-0 h-full border-r border-[#CFCCC8]">
  <div class="px-3 pt-4 pb-4 border-b border-[#CFCCC8]">
    <!-- 列标题，加号按钮右对齐 -->
    <h2 class="flex items-center gap-2">
      <button class="ml-auto ..." />  <!-- ml-auto 使按钮贴右 -->
    </h2>
  </div>
</div>
```

### FAB 新建按钮

```html
<button class="absolute bottom-3 right-3 z-50 w-9 h-9
  rounded-full bg-white/70 backdrop-blur-sm
  border border-gray-200 shadow-sm
  hover:bg-white hover:shadow-md hover:scale-105
  transition-all duration-300 flex items-center justify-center">
```

---

## 10. Tailwind 禁用 / 替代规则

| 场景          | 禁用值               | 正确做法              |
|-------------|-------------------|-------------------|
| 语义图标颜色   | `text-gray-400`   | `text-[#8B735B]` |
| 分割线        | `border-gray-200` | `border-[#CFCCC8]` 等 |
| 背景色        | `bg-gray-50`      | `bg-[#E8E5E0]` 等 |
| 状态标签文字   | `text-gray-400`   | `text-[#999999]`  |

---

## 11. CSS 变量对照表

| 变量名           | 值           |
|----------------|-------------|
| `--accent`       | `#8B735B`    |
| `--accent-hover` | `#7A654D`    |
| `--text-primary`  | `#111111`    |
| `--text-secondary`| `#666666`    |
| `--text-muted`    | `#999999`    |
| `--bg-outer`      | `#D1CFCA`    |
| `--bg-main`       | `#F4F3EE`    |
| `--bg-card`       | `#FFFFFF`    |
| `--bg-sidebar`    | `#EBE8E1`    |
| `--bg-column`     | `#E8E5E0`    |
| `--border-light`  | `#E0DCD1`    |

> 建议：所有新增代码优先使用本系统的 CSS 变量（`var(--xxx)`），避免新增 Hardcoded Hex。
