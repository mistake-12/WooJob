'use client';

import { useState } from 'react';
import { Task } from '@/types';
import { useJobStore } from '@/store/useJobStore';
import TaskDetails from './TaskDetails';
import { Plus } from 'lucide-react';

interface AgendaViewProps {}

interface AgendaSection {
  date: string; // 纯日期字符串，用于匹配任务 date 字段
  tasks: Task[];
}

/** 将 "今天" / "明天" / "4月20日" 解析为真实 Date 对象（当年当月） */
function parseDateLabelToDate(label: string): Date {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (label === '今天') return new Date(today);
  if (label === '明天') {
    const d = new Date(today);
    d.setDate(d.getDate() + 1);
    return d;
  }

  const match = label.match(/^(\d{1,2})月(\d{1,2})日$/);
  if (match) {
    const d = new Date(today);
    d.setMonth(parseInt(match[1]) - 1, parseInt(match[2]));
    return d;
  }

  return today;
}

/**
 * 将任务列表按日期分组，并按时间顺序排序。
 * 所有相对日期（"今天"、"明天"）和绝对日期（"4月20日"）都规范化为
 * 统一的 "YYYY-MM-DD" 格式后再分组，确保同一天的任务不会因写法不同而被拆分。
 * 支持任意日期，不再依赖硬编码白名单。
 */
function groupTasksByDate(tasks: Task[]): AgendaSection[] {
  if (tasks.length === 0) return [];

  const grouped = tasks.reduce<Map<string, Task[]>>((map, task) => {
    const normalized = normalizeDateLabel(task.date);
    const list = map.get(normalized) ?? [];
    list.push(task);
    map.set(normalized, list);
    return map;
  }, new Map());

  const sections: AgendaSection[] = [];
  for (const [date, dateTasks] of grouped) {
    const sorted = dateTasks.sort((a, b) => {
      const timeA = a.time ? `1970-01-01T${a.time}:00` : '1970-01-01T23:59:59';
      const timeB = b.time ? `1970-01-01T${b.time}:00` : '1970-01-01T23:59:59';
      return timeA.localeCompare(timeB);
    });
    sections.push({ date, tasks: sorted });
  }

  sections.sort((a, b) => a.date.localeCompare(b.date));
  return sections;
}

/** 将 "今天" / "明天" / "4月20日" / "2026-04-20" 规范化为 "YYYY-MM-DD" 字符串 */
function normalizeDateLabel(label: string): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (label === '今天') {
    return formatDateToISO(today);
  }
  if (label === '明天') {
    const d = new Date(today);
    d.setDate(d.getDate() + 1);
    return formatDateToISO(d);
  }

  // ISO 格式（如 "2026-04-20"）直接返回
  if (/^\d{4}-\d{2}-\d{2}$/.test(label)) {
    return label;
  }

  const match = label.match(/^(\d{1,2})月(\d{1,2})日$/);
  if (match) {
    const d = new Date(today);
    d.setMonth(parseInt(match[1]) - 1, parseInt(match[2]));
    return formatDateToISO(d);
  }

  return formatDateToISO(today);
}

function formatDateToISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** 将 ISO 字符串转回友好标签（"今天" / "明天" / "4月20日"） */
function isoToDateLabel(iso: string): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(iso);
  const diff = Math.round((target.getTime() - today.getTime()) / 86400000);
  if (diff === 0) return '今天';
  if (diff === 1) return '明天';
  return `${target.getMonth() + 1}月${target.getDate()}日`;
}

function CheckIcon() {
  return (
    <svg width="8" height="8" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M2 5.5L4 7.5L8 3" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

interface TaskCardProps {
  task: Task;
  onOpen: (task: Task) => void;
}

function TaskCard({ task, onOpen }: TaskCardProps) {
  const [localDone, setLocalDone] = useState(task.isCompleted);
  const toggleTaskCompletion = useJobStore((s) => s.toggleTaskCompletion);

  function toggle() {
    setLocalDone((v) => !v);
    toggleTaskCompletion(task.id);
  }

  return (
    <div
      onClick={() => onOpen(task)}
      className={`flex items-center w-full rounded-lg shadow-sm border p-4 transition-all cursor-pointer
        ${localDone ? 'bg-gray-50 border-gray-100' : 'bg-white border-gray-100 hover:shadow-md hover:border-gray-200'}
      `}
    >
      {/* 左侧：时间标识区（固定宽度） */}
      <div className="flex items-center gap-3 shrink-0 min-w-[100px]">
        {/* Checkbox */}
        <div
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            toggle();
          }}
          className={`w-5 h-5 rounded-full border-2 transition-colors cursor-pointer flex items-center justify-center flex-shrink-0
            ${localDone ? 'border-gray-300 bg-gray-200' : 'border-gray-300 hover:border-gray-500'}
          `}
        >
          {localDone && <CheckIcon />}
        </div>
        {/* 时间 */}
        <span className={`text-sm font-medium leading-none whitespace-nowrap ${localDone ? 'text-gray-300' : 'text-gray-400'}`}>
          {task.time}
        </span>
        {/* 分割点 */}
        <div className="w-1 h-1 rounded-full bg-gray-300 flex-shrink-0" />
      </div>

      {/* 中间：核心标题区（弹性撑满） */}
      <div className="flex-1 flex flex-col min-w-0 pr-4">
        <p className={`text-sm truncate leading-snug ${localDone ? 'line-through text-gray-400' : 'font-semibold text-gray-900'}`}>
          {task.title}
        </p>
        {task.round && (
          <p className={`text-xs mt-0.5 leading-none ${localDone ? 'text-gray-300' : 'text-gray-400'}`}>
            {task.round}
          </p>
        )}
      </div>

      {/* 右侧：快捷动作与标签（靠右对齐） */}
      <div className="flex items-center gap-4 shrink-0">
        {task.meetingLink && (
          <button
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer whitespace-nowrap
              ${localDone ? 'bg-gray-100 text-gray-400' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'}
            `}
          >
            <VideoIcon />
            {task.meetingLink}
          </button>
        )}
        {task.resumeFilename && (
          <span className={`flex items-center gap-1 text-[10px] leading-none whitespace-nowrap ${localDone ? 'text-gray-300' : 'text-gray-400'}`}>
            <PaperclipIcon />
            {task.resumeFilename}
          </span>
        )}
        <span
          className={`text-xs font-medium px-3 py-1 rounded-full ${localDone ? 'bg-gray-100 text-gray-400' : (tagColors[task.tag] ?? 'bg-[#EBE8E1] text-[#666666]')}`}
        >
          {task.tag}
        </span>
      </div>
    </div>
  );
}

function VideoIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="1" y="3" width="10" height="10" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M11 6.5L15 4.5V11.5L11 9.5V6.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

function PaperclipIcon() {
  return (
    <svg width="9" height="9" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M13.5 7.5L8 13C6.5 14.5 4 14.5 2.5 13C1 11.5 1 9 2.5 7.5L10.5 1.5C11.5 0.5 13 0.5 14 1.5C15 2.5 15 4 14 5L6 11C5.5 11.5 4.5 11.5 4 11C3.5 10.5 3.5 9.5 4 9L12.5 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

const TODAY = new Date();
TODAY.setHours(0, 0, 0, 0);

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];

/** 格式化 Date 为 "M月D日" 字符串 */
function formatMonthDay(d: Date): string {
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}

/** 根据真实 Date 生成 DATE_LABELS 条目 */
function getDateLabelInfo(date: Date): { sub: string; weekday: string } {
  const today = new Date(TODAY);
  const tomorrow = new Date(TODAY);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const isToday = date.getTime() === today.getTime();
  const isTomorrow = date.getTime() === tomorrow.getTime();
  const isThisYear = date.getFullYear() === today.getFullYear();

  const sub = isThisYear ? formatMonthDay(date) : `${date.getFullYear()}年 ${formatMonthDay(date)}`;
  const weekday = `星期${WEEKDAYS[date.getDay()]}`;

  return { sub, weekday };
}

/** 从 dateLabel（如 "今天"、"4月20日"）获取标签信息 */
function getLabelForDateLabel(dateLabel: string): { sub: string; weekday: string } {
  const date = parseDateLabelToDate(dateLabel);
  return getDateLabelInfo(date);
}

function getMonthGrid(year: number, month: number) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  return cells;
}

/** 将日历数字 day 映射为 ISO 格式的 date 字符串，用于匹配任务和筛选 */
function dayToDateLabel(day: number | null): string | null {
  if (day === null) return null;
  if (day === TODAY.getDate()) return formatDateToISO(TODAY);
  const tomorrow = new Date(TODAY);
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (day === tomorrow.getDate()) return formatDateToISO(tomorrow);
  return formatDateToISO(new Date(TODAY.getFullYear(), TODAY.getMonth(), day));
}

  const tagColors: Record<string, string> = {
  '面试': 'bg-[#8B735B]/10 text-[#8B735B]',
  '笔试': 'bg-[#8B735B]/10 text-[#8B735B]',
  '待投递': 'bg-[#8B735B]/10 text-[#8B735B]',
  '待办事项': 'bg-[#8B735B]/10 text-[#8B735B]',
};

export default function AgendaView({}: AgendaViewProps) {
  const tasks = useJobStore((s) => s.tasks);
  const updateTask = useJobStore((s) => s.updateTask);
  const createTask = useJobStore((s) => s.createTask);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const year = TODAY.getFullYear();
  const month = TODAY.getMonth();
  const day = TODAY.getDate();
  const grid = getMonthGrid(year, month);

  // ── 提取全局所有任务日期（小圆点 & 筛选用），统一转为 ISO 格式 ─
  const allTaskDates = new Set(tasks.map((t) => normalizeDateLabel(t.date)));

  // ── 动态过滤列表（按 ISO 日期匹配）──────────────────────
  const filteredTasks = selectedDate
    ? tasks.filter((t) => normalizeDateLabel(t.date) === selectedDate)
    : tasks;
  const sections = groupTasksByDate(filteredTasks);

  // ── Step 3 & 4: 筛选侧边栏按钮 ──────────────────────────
  const isAllActive = selectedDate === null;

  // ── 动态计算筛选数量 ───────────────────────────────────────
  const interviewCount = tasks.filter((t) => t.tag === '面试' && !t.isCompleted).length;
  const examCount = tasks.filter((t) => t.tag === '笔试' && !t.isCompleted).length;
  const pendingCount = tasks.filter((t) => t.tag === '待投递' && !t.isCompleted).length;

  const LEFT_SIDEBAR_ITEMS = [
    { label: '全部待办', count: tasks.filter((t) => !t.isCompleted).length },
    { label: '近期面试', count: interviewCount },
    { label: '近期笔试', count: examCount },
    { label: '已投递待回', count: pendingCount },
  ];

  return (
    <>
    <div className="flex h-full overflow-hidden">
      {/* ── 左侧边栏 ─────────────────────────────── */}
      <aside className="w-[300px] flex-shrink-0 border-r border-[#DCD9D1] flex flex-col overflow-y-auto py-6 px-5 gap-8">

        {/* 迷你日历 */}
        <div>
          <p className="text-xs font-bold text-[#666666] uppercase tracking-widest mb-4">
            {year}年 {month + 1}月
          </p>
          {/* 星期头 */}
          <div className="grid grid-cols-7 gap-0 mb-1">
            {WEEKDAYS.map((w) => (
              <div key={w} className="text-center text-[10px] text-[#666666] font-medium py-1">
                {w}
              </div>
            ))}
          </div>
          {/* 日期格 */}
          <div className="grid grid-cols-7 gap-0">
            {grid.map((d, i) => {
              const dateLabel = dayToDateLabel(d);
              const hasTask = dateLabel !== null && allTaskDates.has(dateLabel);
              const isSelected = dateLabel !== null && dateLabel === selectedDate;
              const isToday = d === day;

              return (
                <div key={i} className="relative aspect-square flex items-center justify-center">
                  {d !== null ? (
                    <button
                      onClick={() => setSelectedDate(dateLabel)}
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] transition-colors
                        ${isSelected
                          ? 'bg-gray-900 text-white font-semibold'
                          : isToday
                            ? 'bg-[#EBE8E1] text-gray-900 font-semibold'
                            : 'text-gray-700 hover:bg-black/5'
                        }`}
                    >
                      {d}
                      {/* 有任务的灰色小圆点 */}
                      {hasTask && !isSelected && (
                        <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 bg-gray-400 rounded-full" />
                      )}
                    </button>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>

        {/* 分类筛选列表 */}
        <div>
          <p className="text-xs font-bold text-[#666666] uppercase tracking-widest mb-3">
            筛选
          </p>
          <div className="space-y-0">
            {/* 全部待办 — 受 selectedDate 控制 */}
            <button
              onClick={() => setSelectedDate(null)}
              className={`w-full flex items-center justify-between py-2.5 px-3 rounded-md text-sm transition-colors
                ${isAllActive
                  ? 'text-gray-900 font-semibold bg-black/4'
                  : 'text-gray-500 hover:bg-black/4 hover:text-gray-800'
                }`}
            >
              <div className="flex items-center gap-2">
                {isAllActive && (
                  <div className="w-0.5 h-3.5 bg-gray-900 rounded-full" />
                )}
                <span>全部待办</span>
              </div>
                <span className={`text-xs ${isAllActive ? 'text-gray-500' : 'text-[#666666]'}`}>
                {tasks.length}
                </span>
            </button>

            {/* 其他固定分类 */}
            {LEFT_SIDEBAR_ITEMS.slice(1).map((item) => (
              <button
                key={item.label}
                className="w-full flex items-center justify-between py-2.5 px-3 rounded-md text-sm text-gray-500 hover:bg-black/4 hover:text-gray-800 transition-colors"
              >
                <span>{item.label}</span>
                <span className="text-xs text-[#666666]">{item.count}</span>
              </button>
            ))}
          </div>
        </div>
      </aside>

      {/* ── 右侧主列表 ───────────────────────────── */}
      <main className="flex-1 flex flex-col w-full min-w-0 overflow-hidden p-8">
        {/* 固定顶部操作栏 — 永远撑满宽度，防止塌陷 */}
        <div className="flex items-center justify-between w-full shrink-0 mb-5">
          {/* 左侧：日期标题 / 空状态占位文字 */}
          <h2 className="text-2xl font-black text-gray-900 leading-none tracking-tight">
            {filteredTasks.length === 0 && !selectedDate
              ? '今日待办'
              : filteredTasks.length === 0
                ? `${isoToDateLabel(selectedDate ?? '')}没有待办`
                : isoToDateLabel(sections[0]?.date ?? '')}
            <span className="text-base font-medium text-[#666666] ml-3 tracking-normal">
              {filteredTasks.length === 0
                ? selectedDate
                  ? `${getLabelForDateLabel(isoToDateLabel(selectedDate)).sub} ${getLabelForDateLabel(isoToDateLabel(selectedDate)).weekday}`
                  : ''
                : `${getLabelForDateLabel(isoToDateLabel(sections[0].date)).sub} ${getLabelForDateLabel(isoToDateLabel(sections[0].date)).weekday}`}
            </span>
          </h2>

          {/* 右侧：【+ 创建任务】按钮 — 始终固定在右上角 */}
          <button
            onClick={() => setSelectedTask({
              id: `new-${Date.now()}`,
              title: '',
              date: selectedDate ?? formatDateToISO(TODAY),
              time: '',
              company: '',
              tag: '待办事项',
              isCompleted: false,
            })}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium
              bg-white border border-gray-200 text-[#8B735B]
              hover:bg-[#EBE8E1] hover:border-[#D8D4CE] hover:text-[#7A6650]
              transition-all duration-200 cursor-pointer shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            创建任务
          </button>
        </div>

        {/* 任务列表 — 可滚动区域 */}
        <div className="flex-1 overflow-y-auto w-full">
          {filteredTasks.length === 0 ? (
            /* 空状态：居中 CTA 组件 */
            <div className="flex flex-col items-center justify-center flex-1 h-full min-h-[400px]">
              {/* 视觉锚点 */}
              <div className="w-16 h-16 mb-6 rounded-full bg-[#F5F2EE] flex items-center justify-center">
                <svg
                  className="w-10 h-10 text-[#8B735B]"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"
                  />
                </svg>
              </div>

              {/* 文字区 */}
              <h3 className="text-xl font-bold text-gray-900 mb-2">今日待办</h3>
              <p className="text-sm text-gray-500 mb-8 max-w-xs text-center leading-relaxed">
                这里目前空空如也，您可以去喝杯咖啡，或者规划一下接下来的面试安排。
              </p>

              {/* 内联 CTA */}
              <button
                onClick={() => setSelectedTask({
                  id: `new-${Date.now()}`,
                  title: '',
                  date: selectedDate ?? formatDateToISO(TODAY),
                  time: '',
                  company: '',
                  tag: '待办事项',
                  isCompleted: false,
                })}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium
                  text-[#8E7E6E] bg-[#EBE8E1] hover:bg-[#DCD9D1]
                  rounded-md transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                新建待办事项
              </button>
            </div>
          ) : (
            sections.map((section) => {
              const friendlyLabel = isoToDateLabel(section.date);
              return (
                <section key={section.date} className="mb-10 last:mb-0">
                  {/* 任务卡片列表 */}
                  <div className="space-y-3">
                    {section.tasks.map((task) => (
                      <TaskCard key={task.id} task={task} onOpen={setSelectedTask} />
                    ))}
                  </div>
                </section>
              );
            })
          )}
        </div>
      </main>
    </div>

    {/* Task Details Drawer */}
    {selectedTask && (
      <TaskDetails
        task={selectedTask}
        onClose={() => setSelectedTask(null)}
        onUpdateTask={(updated) => {
          const isNew = updated.id.startsWith('new-');
          if (isNew) {
            createTask({
              title: updated.title,
              company: updated.company,
              taskDate: updated.date,
              taskTime: updated.time,
              tag: updated.tag,
              round: updated.round,
              meetingLink: updated.meetingLink,
              resumeFilename: updated.resumeFilename,
              notes: updated.notes,
            });
            setSelectedTask(null);
          } else {
            updateTask(updated.id, {
              title: updated.title,
              company: updated.company,
              taskDate: updated.date,
              taskTime: updated.time || null,
              tag: updated.tag,
              round: updated.round || null,
              meetingLink: updated.meetingLink || null,
              resumeFilename: updated.resumeFilename || null,
              notes: updated.notes || null,
            });
            setSelectedTask(updated);
          }
        }}
      />
    )}
    </>
  );
}
