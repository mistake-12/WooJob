# 未来24小时计划安排功能开发文档

## 一、需求概述

### 1.1 目标
将"未来24小时计划安排"模块与待办事项系统深度集成，确保数据互通、交互一致。

### 1.2 当前状态
- **待办事项**: 使用 `Task[]` 类型，存储在 `tasks` 状态中
- **24小时计划**: 使用独立的 `InterviewSchedule[]` 类型，与任务系统无关联

### 1.3 预期效果
- 未来24小时内的任务自动从待办事项中筛选显示
- 点击任务可打开任务详情抽屉
- 新增/编辑/删除任务实时同步

---

## 二、现有代码分析

### 2.1 数据结构

**Task 类型** (`types/index.ts`):
```typescript
export interface Task {
  id: string;
  jobId?: string;
  date: string;        // '今天' | '明天' | '4月20日' | '2026-04-23'
  time: string;        // '09:00' | '14:30'
  title: string;
  company: string;
  round?: string;
  tag: TaskType;       // '面试' | '笔试' | '待投递' | '待办事项'
  meetingLink?: string;
  resumeFilename?: string;
  notes?: string;
  isCompleted: boolean;
}
```

**InterviewSchedule 类型** (`types/index.ts`):
```typescript
export interface InterviewSchedule {
  time: string;
  title: string;
  company: string;
}
```

### 2.2 组件位置

| 组件 | 文件路径 | 功能 |
|------|---------|------|
| BottomShelf | `components/BottomShelf.tsx` | 底部区域，包含24小时计划 |
| TaskDetails | `components/TaskDetails.tsx` | 任务详情抽屉 |
| 主页面 | `app/page.tsx` | 状态管理入口 |

### 2.3 当前 BottomShelf 实现

```typescript
// components/BottomShelf.tsx (行12-34)
<div className="flex-1 pr-8 border-r border-[#DCD9D1]">
  <h3 className="text-sm font-bold text-[#111111] mb-4">未来24小时</h3>
  <div className="space-y-0">
    {schedules.map((schedule, index) => (
      <div key={index} className="flex items-center gap-4 py-3 ...">
        <span className="text-base font-bold text-gray-400">{schedule.time}</span>
        <div>
          <p className="text-sm font-medium text-[#111111]">{schedule.title}</p>
          <p className="text-xs text-[#666666] mt-0.5">{schedule.company}</p>
        </div>
      </div>
    ))}
  </div>
</div>
```

---

## 三、功能设计

### 3.1 数据层改造

**方案**: 移除独立的 `InterviewSchedule[]`，统一使用 `Task[]` 作为唯一数据源。

```typescript
// 新数据结构
interface Task {
  id: string;
  jobId?: string;
  date: string;           // ISO 格式: '2026-04-23'
  time: string;           // '09:00'
  title: string;
  company: string;
  round?: string;
  tag: TaskType;
  meetingLink?: string;
  resumeFilename?: string;
  notes?: string;
  isCompleted: boolean;
}
```

### 3.2 筛选逻辑

```typescript
/**
 * 获取未来24小时内的任务
 * 规则:
 * - 今天的任务全部显示
 * - 明天的任务全部显示
 * - 按 time 排序
 * - 排除已完成的任务
 */
function getNext24HoursTasks(tasks: Task[]): Task[] {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const todayStr = formatDate(now);      // '2026-04-23'
  const tomorrowStr = formatDate(tomorrow); // '2026-04-24'

  return tasks
    .filter(task => {
      // 转换任务日期为比较用的格式
      const taskDate = normalizeToISODate(task.date);

      // 只显示今天和明天的任务
      if (taskDate !== todayStr && taskDate !== tomorrowStr) {
        return false;
      }

      // 如果是今天，检查时间是否已过
      if (taskDate === todayStr) {
        const currentTime = now.getHours() * 60 + now.getMinutes();
        const [taskHour, taskMin] = task.time.split(':').map(Number);
        const taskTime = taskHour * 60 + taskMin;
        return taskTime >= currentTime; // 只显示未开始或进行中的任务
      }

      return true;
    })
    .sort((a, b) => {
      // 按日期和时间排序
      const dateCompare = a.date.localeCompare(b.date);
      if (dateCompare !== 0) return dateCompare;
      return a.time.localeCompare(b.time);
    });
}
```

### 3.3 交互设计

**点击行为**:
1. 点击任务卡片 → 打开 `TaskDetails` 抽屉
2. 传递 `taskId` 作为 props

**视觉反馈**:
- 鼠标悬停显示手型指针
- 悬停时背景色变浅
- 显示任务标签（面试/笔试/待办事项）

### 3.4 组件改造

#### BottomShelf.tsx 改造

```typescript
interface BottomShelfProps {
  tasks: Task[];
  onTaskClick: (taskId: string) => void;
  onTaskComplete?: (taskId: string) => void;
}

export default function BottomShelf({ tasks, onTaskClick, onTaskComplete }: BottomShelfProps) {
  const next24HoursTasks = useMemo(
    () => getNext24HoursTasks(tasks),
    [tasks]
  );

  if (next24HoursTasks.length === 0) {
    return (
      <div className="flex-1 pr-8 border-r border-[#DCD9D1]">
        <h3 className="text-sm font-bold text-[#111111] mb-4">未来24小时</h3>
        <div className="py-8 text-center text-gray-400 text-sm">
          暂无计划安排
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 pr-8 border-r border-[#DCD9D1]">
      <h3 className="text-sm font-bold text-[#111111] mb-4">未来24小时</h3>
      <div className="space-y-0">
        {next24HoursTasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            onClick={() => onTaskClick(task.id)}
            onComplete={() => onTaskComplete?.(task.id)}
          />
        ))}
      </div>
    </div>
  );
}
```

#### TaskCard 组件

```typescript
interface TaskCardProps {
  task: Task;
  onClick: () => void;
  onComplete?: () => void;
}

function TaskCard({ task, onClick, onComplete }: TaskCardProps) {
  const tagColors = {
    '面试': { bg: 'bg-red-100', text: 'text-red-600' },
    '笔试': { bg: 'bg-blue-100', text: 'text-blue-600' },
    '待投递': { bg: 'bg-yellow-100', text: 'text-yellow-600' },
    '待办事项': { bg: 'bg-gray-100', text: 'text-gray-600' },
  };

  const colors = tagColors[task.tag];

  return (
    <div
      onClick={onClick}
      className="flex items-center gap-4 py-3 border-b border-[#DCD9D1] cursor-pointer hover:bg-gray-50 transition-colors"
    >
      {/* 时间 */}
      <div className="min-w-[48px]">
        <span className="text-base font-bold text-gray-400">{task.time}</span>
      </div>

      {/* 内容 */}
      <div className="flex-1">
        <p className="text-sm font-medium text-[#111111]">{task.title}</p>
        <p className="text-xs text-[#666666] mt-0.5">{task.company}</p>
      </div>

      {/* 标签 */}
      <span className={`px-2 py-0.5 rounded text-xs ${colors.bg} ${colors.text}`}>
        {task.tag}
      </span>

      {/* 完成按钮 */}
      {!task.isCompleted && onComplete && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onComplete();
          }}
          className="w-5 h-5 rounded-full border-2 border-gray-300 hover:border-green-500 hover:bg-green-50 transition-colors"
        />
      )}

      {/* 已完成状态 */}
      {task.isCompleted && (
        <span className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
          <Check className="w-3 h-3 text-white" />
        </span>
      )}
    </div>
  );
}
```

### 3.5 日期处理工具

```typescript
// lib/dateUtils.ts

/**
 * 将各种日期格式转换为 ISO 格式
 * '今天' → '2026-04-23'
 * '明天' → '2026-04-24'
 * '4月23日' → '2026-04-23'
 * '2026-04-23' → '2026-04-23'
 */
export function normalizeToISODate(dateStr: string): string {
  const today = new Date();

  if (dateStr === '今天') {
    return formatDate(today);
  }

  if (dateStr === '明天') {
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return formatDate(tomorrow);
  }

  // 处理 '4月23日' 格式
  const monthDayMatch = dateStr.match(/(\d+)月(\d+)日/);
  if (monthDayMatch) {
    const month = parseInt(monthDayMatch[1]);
    const day = parseInt(monthDayMatch[2]);
    const result = new Date(today.getFullYear(), month - 1, day);
    return formatDate(result);
  }

  // 已经是 ISO 格式
  return dateStr;
}

/**
 * 格式化日期为 ISO 字符串
 */
export function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * 检查任务是否在指定时间段内
 */
export function isTaskInTimeRange(task: Task, hoursAhead: number = 24): boolean {
  const now = new Date();
  const deadline = new Date(now.getTime() + hoursAhead * 60 * 60 * 1000);

  const taskDateStr = normalizeToISODate(task.date);
  const [taskHour, taskMin] = task.time.split(':').map(Number);

  const taskDateTime = new Date(taskDateStr);
  taskDateTime.setHours(taskHour, taskMin, 0, 0);

  return taskDateTime >= now && taskDateTime <= deadline;
}
```

---

## 四、任务详情抽屉集成

### 4.1 TaskDetails 改造

确保 `TaskDetails` 抽屉可以从任何地方打开：

```typescript
interface TaskDetailsProps {
  taskId: string | null;
  tasks: Task[];
  onClose: () => void;
  onSave: (task: Task) => void;
  onDelete: (taskId: string) => void;
  onComplete: (taskId: string) => void;
}
```

### 4.2 主页面集成

```typescript
// app/page.tsx

export default function Home() {
  const [tasks, setTasks] = useState<Task[]>(mockTasks);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  // 打开任务详情
  const handleTaskClick = (taskId: string) => {
    setSelectedTaskId(taskId);
  };

  // 保存任务
  const handleTaskSave = (updatedTask: Task) => {
    setTasks(prev =>
      prev.map(t => t.id === updatedTask.id ? updatedTask : t)
    );
    setSelectedTaskId(null);
  };

  // 完成任务
  const handleTaskComplete = (taskId: string) => {
    setTasks(prev =>
      prev.map(t =>
        t.id === taskId ? { ...t, isCompleted: true } : t
      )
    );
  };

  return (
    <>
      {/* 其他内容 */}

      <BottomShelf
        tasks={tasks}
        onTaskClick={handleTaskClick}
        onTaskComplete={handleTaskComplete}
      />

      <TaskDetails
        taskId={selectedTaskId}
        tasks={tasks}
        onClose={() => setSelectedTaskId(null)}
        onSave={handleTaskSave}
        onDelete={(id) => setTasks(prev => prev.filter(t => t.id !== id))}
        onComplete={handleTaskComplete}
      />
    </>
  );
}
```

---

## 五、文件变更清单

### 5.1 新增文件

| 文件路径 | 描述 |
|---------|------|
| `lib/dateUtils.ts` | 日期处理工具函数 |

### 5.2 修改文件

| 文件路径 | 修改内容 |
|---------|---------|
| `types/index.ts` | 可选：添加 `InterviewSchedule` 别名 |
| `components/BottomShelf.tsx` | 接收 tasks props，改为从 tasks 筛选显示 |
| `components/TaskDetails.tsx` | 支持外部 taskId 控制 |
| `app/page.tsx` | 集成 BottomShelf 和 TaskDetails |
| `lib/mockData.ts` | 可选：移除 mockInterviewSchedules |

---

## 六、测试用例

### 6.1 功能测试

| 用例 | 预期结果 |
|------|---------|
| 今天的未完成任务（时间未到） | 显示在24小时列表中 |
| 今天的已完成任务 | 不显示在24小时列表中 |
| 今天的已过期任务（时间已过） | 不显示在24小时列表中 |
| 明天的任意任务 | 显示在24小时列表中 |
| 后天的任务 | 不显示在24小时列表中 |
| 点击任务 | 打开任务详情抽屉 |
| 完成任务 | 从列表中移除或标记完成 |

### 6.2 边界测试

- 空任务列表
- 所有任务都已完成
- 任务时间恰好在 23:59
- 跨越午夜的任务（23:00 today → 01:00 tomorrow）

---

## 七、实现步骤

1. **创建日期工具函数** (`lib/dateUtils.ts`)
2. **改造 BottomShelf 组件** - 添加 TaskCard 子组件
3. **改造 TaskDetails 组件** - 支持外部控制
4. **集成到主页面** - 连接状态和回调
5. **清理冗余代码** - 移除 mockInterviewSchedules
6. **测试验证** - 验证所有功能正常

---

## 八、注意事项

1. **性能优化**: 使用 `useMemo` 缓存筛选结果，避免重复计算
2. **日期处理**: 确保跨年、跨月、闰年等边界情况正确
3. **时间时区**: 统一使用本地时间，避免时区混乱
4. **响应式设计**: 确保移动端显示正常
