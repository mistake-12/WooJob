'use client';

import { useState, useEffect } from 'react';
import { Task } from '@/types';
import { useJobStore } from '@/store/useJobStore';
import TaskDetails from './TaskDetails';
import { Plus } from 'lucide-react';

/** 计算智能默认历史月：每月 1-9 日显示上月，10 日及以后显示当月（始终有内容可看） */
function getSmartDefaultMonth(): string {
  const now = new Date();
  const day = now.getDate();
  if (day <= 9) {
    // 切到上月
    const d = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

/** 获取上一个月（用于切换器） */
function getPrevMonth(month: string): string {
  const [year, monthNum] = month.split('-').map(Number);
  const d = new Date(year, monthNum - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/** 获取下一个月（用于切换器，不能超过当月） */
function getNextMonth(month: string): string {
  const [year, monthNum] = month.split('-').map(Number);
  const d = new Date(year, monthNum, 1);
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  if (month >= currentMonth) return month; // 不超过当月
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/** 检查月份是否超过当前月份（用于禁用"下一个月"按钮） */
function isFutureMonth(month: string): boolean {
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  return month > currentMonth;
}

/** 获取"YYYY年 M月"格式 */
function formatMonthLabel(month: string): string {
  const [year, m] = month.split('-').map(Number);
  return `${year}年${m}月`;
}

/** 将月份字符串转为日历标题用的小数格式 "2026年 5月" */
function formatMonthShort(month: string): string {
  const [year, m] = month.split('-').map(Number);
  return `${year}年 ${m}月`;
}

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
 * 将任务列表按日期分组，每日内按时间正序排列。
 * 所有日期都规范化为 "YYYY-MM-DD" 格式后再分组。
 * 注意：此函数不负责今天/过去的时间线排序，排序逻辑在渲染层处理。
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
      const timeA = a.time ? `1970-01-01T${a.time.slice(0, 5)}:00` : '1970-01-01T23:59:59';
      const timeB = b.time ? `1970-01-01T${b.time.slice(0, 5)}:00` : '1970-01-01T23:59:59';
      return timeA.localeCompare(timeB);
    });
    sections.push({ date, tasks: sorted });
  }

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
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const target = new Date(iso + 'T00:00:00');
  const diff = Math.round((target.getTime() - today.getTime()) / 86400000);
  if (diff === 0) return '今天';
  if (diff === 1) return '明天';
  return `${target.getMonth() + 1}月${target.getDate()}日`;
}

const WEEKDAYS_SHORT = ['日', '一', '二', '三', '四', '五', '六'];

/** 格式化 ISO 日期为 "5月3日 星期日"，若为今天/明天则加 "今天 · " / "明天 · " 前缀 */
function formatHeaderDate(isoDate: string): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const target = new Date(isoDate + 'T00:00:00');
  const diff = Math.round((target.getTime() - today.getTime()) / 86400000);

  const monthDay = `${target.getMonth() + 1}月${target.getDate()}日`;
  const weekday = `星期${WEEKDAYS_SHORT[target.getDay()]}`;

  if (diff === 0) return `今天 · ${monthDay} ${weekday}`;
  if (diff === 1) return `明天 · ${monthDay} ${weekday}`;
  return `${monthDay} ${weekday}`;
}

/** 格式化日期为分组标题，如 "今天 5月2日 星期六" */
function formatDateHeader(isoDate: string): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const target = new Date(isoDate + 'T00:00:00');
  const diff = Math.round((target.getTime() - today.getTime()) / 86400000);

  const monthDay = `${target.getMonth() + 1}月${target.getDate()}日`;
  const weekday = `星期${WEEKDAYS_SHORT[target.getDay()]}`;

  if (diff === 0) return `今天 ${monthDay} ${weekday}`;
  if (diff === 1) return `明天 ${monthDay} ${weekday}`;
  return `${monthDay} ${weekday}`;
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
        {/* 时间（只显示 HH:mm，去掉秒） */}
        <span className={`text-sm font-medium leading-none whitespace-nowrap ${localDone ? 'text-gray-300' : 'text-gray-400'}`}>
          {task.time ? task.time.slice(0, 5) : ''}
        </span>
        {/* 分割点 */}
        <div className="w-1 h-1 rounded-full bg-gray-300 flex-shrink-0" />
      </div>

        {/* 中间：核心标题区（弹性撑满） */}
      <div className="flex-1 flex flex-col min-w-0 pr-4">
        <p className={`text-sm truncate leading-snug ${localDone ? 'line-through text-gray-400' : 'font-semibold text-gray-900'}`}>
          {task.title}
        </p>
        {task.company && (
          <p className={`text-xs mt-0.5 leading-none ${localDone ? 'text-gray-300' : 'text-gray-400'}`}>
            {task.company}
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
function dayToDateLabel(day: number | null, calYear: number, calMonth: number): string | null {
  if (day === null) return null;
  const calToday = new Date(calYear, calMonth, day);
  return formatDateToISO(calToday);
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
  const fetchTasks = useJobStore((s) => s.fetchTasks);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  /** 当前筛选条件：日期筛选 | 标签筛选 | 无筛选（全不选） */
  const [selectedFilter, setSelectedFilter] = useState<{
    type: 'date';
    value: string;
  } | {
    type: 'tag';
    value: string;
  } | null>(null);

  /** 历史月份（默认智能月：每月1-9日=上月，10日后=当月） */
  const [historyMonth, setHistoryMonth] = useState(() => getSmartDefaultMonth());
  /** 历史区是否展开 */
  const [historyExpanded, setHistoryExpanded] = useState(false);
  /** 记录哪些月份已加载（当月由 page.tsx 加载，这里只管历史月） */
  const [loadedMonths, setLoadedMonths] = useState<Set<string>>(() => {
    const current = new Date().toISOString().slice(0, 7);
    return new Set([current]);
  });

  /** 切月时加载历史月份（loadedMonths 去重）；当月任务由 page.tsx 初始化时已加载） */
  useEffect(() => {
    if (!loadedMonths.has(historyMonth)) {
      fetchTasks(historyMonth);
      setLoadedMonths((prev) => new Set([...prev, historyMonth]));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [historyMonth]);

  const year = TODAY.getFullYear();
  const month = TODAY.getMonth();
  const day = TODAY.getDate();

  // ── 日历导航月份（可切换，与 TODAY 解耦）───────────────────────
  const [calendarYear, setCalendarYear] = useState(year);
  const [calendarMonth, setCalendarMonth] = useState(month);
  const grid = getMonthGrid(calendarYear, calendarMonth);

  // ── 日历月份切换 ─────────────────────────────────────────────
  function navigateCalendarMonth(delta: -1 | 1) {
    let newMonth = calendarMonth + delta;
    let newYear = calendarYear;
    if (newMonth < 0) {
      newMonth = 11;
      newYear -= 1;
    } else if (newMonth > 11) {
      newMonth = 0;
      newYear += 1;
    }
    setCalendarMonth(newMonth);
    setCalendarYear(newYear);
  }

  const isCalendarCurrentMonth =
    calendarYear === year && calendarMonth === month;

  // ── 提取全局所有任务日期（小圆点 & 筛选用），统一转为 ISO 格式 ─
  const allTaskDates = new Set(tasks.map((t) => normalizeDateLabel(t.date)));

  // ── 动态过滤列表（支持日期筛选或标签筛选）──────────────────────
  const filteredTasks = selectedFilter
    ? selectedFilter.type === 'date'
      ? tasks.filter((t) => normalizeDateLabel(t.date) === selectedFilter.value)
      : tasks.filter((t) => t.tag === selectedFilter.value)
    : tasks;
  const sections = groupTasksByDate(filteredTasks);

  // ── 分割今天+未来 vs 历史 ────────────────────────────────────
  const todayISO = formatDateToISO(TODAY);
  const upcomingSections = sections
    .filter((s) => s.date >= todayISO)
    .sort((a, b) => a.date.localeCompare(b.date));
  const pastSections = sections
    .filter((s) => s.date < todayISO)
    .sort((a, b) => b.date.localeCompare(a.date)); // 过去：最近的在最前

  // ── 历史区只显示当前 historyMonth 的数据 ─────────────────────
  const historyMonthSections = pastSections.filter((s) => s.date.slice(0, 7) === historyMonth);
  const pastTaskCount = pastSections.reduce((sum, s) => sum + s.tasks.length, 0);

  // ── 动态计算筛选数量 ───────────────────────────────────────
  const interviewCount = tasks.filter((t) => t.tag === '面试' && !t.isCompleted).length;
  const examCount = tasks.filter((t) => t.tag === '笔试' && !t.isCompleted).length;
  const pendingCount = tasks.filter((t) => t.tag === '待投递' && !t.isCompleted).length;

  const LEFT_SIDEBAR_ITEMS = [
    { label: '全部待办', count: tasks.filter((t) => !t.isCompleted).length },
    { label: '近期面试', count: interviewCount, filter: { type: 'tag' as const, value: '面试' } },
    { label: '近期笔试', count: examCount, filter: { type: 'tag' as const, value: '笔试' } },
    { label: '待投递', count: pendingCount, filter: { type: 'tag' as const, value: '待投递' } },
  ];

  return (
    <>
    <div className="flex h-full overflow-hidden">
      {/* ── 左侧边栏 ─────────────────────────────── */}
      <aside className="w-[300px] flex-shrink-0 border-r border-[#DCD9D1] flex flex-col overflow-y-auto py-6 px-5 gap-8">

        {/* 迷你日历 */}
        <div>
          {/* 带月份切换的标题行 */}
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-bold text-[#666666] uppercase tracking-widest">
              {calendarYear}年 {calendarMonth + 1}月
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => navigateCalendarMonth(-1)}
                className="w-6 h-6 rounded flex items-center justify-center text-[#999] hover:text-gray-700 hover:bg-black/5 transition-colors cursor-pointer"
              >
                <svg className="w-3 h-3" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M10 4l-4 4 4 4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              <button
                onClick={() => navigateCalendarMonth(1)}
                className="w-6 h-6 rounded flex items-center justify-center text-[#999] hover:text-gray-700 hover:bg-black/5 transition-colors cursor-pointer disabled:opacity-30"
                disabled={isCalendarCurrentMonth}
              >
                <svg className="w-3 h-3" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M6 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
          </div>
          {/* 星期头 */}
          <div className="grid grid-cols-7 gap-0 mb-1">
            {WEEKDAYS.map((w) => (
              <div key={w} className="text-center text-[10px] text-[#666666] font-medium py-1">
                {w}
              </div>
            ))}
          </div>
          {/* 日期格（使用导航月份） */}
          <div className="grid grid-cols-7 gap-0">
            {grid.map((d, i) => {
              const dateLabel = dayToDateLabel(d, calendarYear, calendarMonth);
              const hasTask = dateLabel !== null && allTaskDates.has(dateLabel);
              const isSelected = dateLabel !== null && selectedFilter?.type === 'date' && selectedFilter.value === dateLabel;
              const isToday =
                calendarYear === year && calendarMonth === month && d === day;

              return (
                <div key={i} className="relative aspect-square flex items-center justify-center">
                  {d !== null ? (
                    <button
                      onClick={() => {
                        if (selectedFilter?.type === 'date' && selectedFilter.value === dateLabel) {
                          setSelectedFilter(null);
                        } else {
                          setSelectedFilter({ type: 'date', value: dateLabel! });
                        }
                      }}
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] transition-colors
                        ${(selectedFilter?.type === 'date' && selectedFilter.value === dateLabel)
                          ? 'bg-gray-900 text-white font-semibold'
                          : isToday
                            ? 'bg-[#EBE8E1] text-gray-900 font-semibold'
                            : 'text-gray-700 hover:bg-black/5'
                        }`}
                    >
                      {d}
                      {/* 有任务的灰色小圆点 */}
                      {hasTask && !(selectedFilter?.type === 'date' && selectedFilter.value === dateLabel) && (
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
            {/* 全部待办 — 清除所有筛选 */}
            <button
              onClick={() => setSelectedFilter(null)}
              className={`w-full flex items-center justify-between py-2.5 px-3 rounded-md text-sm transition-colors
                ${selectedFilter === null
                  ? 'text-gray-900 font-semibold bg-black/4'
                  : 'text-gray-500 hover:bg-black/4 hover:text-gray-800'
                }`}
            >
              <div className="flex items-center gap-2">
                {selectedFilter === null && (
                  <div className="w-0.5 h-3.5 bg-gray-900 rounded-full" />
                )}
                <span>全部待办</span>
              </div>
                <span className={`text-xs ${selectedFilter === null ? 'text-gray-500' : 'text-[#666666]'}`}>
                {tasks.length}
                </span>
            </button>

            {/* 其他分类 — 按 tag 筛选 */}
            {LEFT_SIDEBAR_ITEMS.slice(1).map((item) => {
              const isActive = selectedFilter?.type === 'tag' && selectedFilter.value === item.filter?.value;
              return (
                <button
                  key={item.label}
                  onClick={() => {
                    if (isActive) {
                      setSelectedFilter(null);
                    } else {
                      setSelectedFilter(item.filter!);
                    }
                  }}
                  className={`w-full flex items-center justify-between py-2.5 px-3 rounded-md text-sm transition-colors
                    ${isActive
                      ? 'text-gray-900 font-semibold bg-black/4'
                      : 'text-gray-500 hover:bg-black/4 hover:text-gray-800'
                    }`}
                >
                  <div className="flex items-center gap-2">
                    {isActive && (
                      <div className="w-0.5 h-3.5 bg-gray-900 rounded-full" />
                    )}
                    <span>{item.label}</span>
                  </div>
                  <span className={`text-xs ${isActive ? 'text-gray-500' : 'text-[#666666]'}`}>{item.count}</span>
                </button>
              );
            })}
          </div>
        </div>

          {/* 历史月份切换器（展开后始终可见上下月按钮） */}
          <button
            onClick={() => setHistoryExpanded((v) => !v)}
            className="w-full flex items-center justify-between py-2.5 px-3 rounded-md text-sm transition-colors
              text-gray-500 hover:bg-black/4 hover:text-gray-800"
          >
            <div className="flex items-center gap-2">
              <svg
                className={`w-3.5 h-3.5 text-[#999999] transition-transform ${historyExpanded ? 'rotate-90' : ''}`}
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <path d="M6 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span>{formatMonthLabel(historyMonth)}</span>
            </div>
            {pastTaskCount > 0 && (
              <span className="text-xs text-[#999999]">{pastTaskCount}条</span>
            )}
          </button>

          {/* 月份切换（展开后显示上下月按钮） */}
          {historyExpanded && (
            <div className="mt-2 ml-4 flex items-center gap-2">
              <button
                onClick={() => setHistoryMonth(getPrevMonth(historyMonth))}
                className="flex items-center gap-1 py-1.5 px-3 rounded-md text-xs text-gray-500 hover:bg-black/4 hover:text-gray-800 transition-colors cursor-pointer"
              >
                <svg className="w-3 h-3" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M10 4l-4 4 4 4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                上月
              </button>
              <span className="text-[10px] text-[#CCCCCC] min-w-[60px] text-center">
                {formatMonthLabel(historyMonth)}
              </span>
              <button
                onClick={() => setHistoryMonth(getNextMonth(historyMonth))}
                disabled={isFutureMonth(historyMonth)}
                className="flex items-center gap-1 py-1.5 px-3 rounded-md text-xs text-gray-500 hover:bg-black/4 hover:text-gray-800 transition-colors disabled:opacity-30 cursor-pointer"
              >
                下月
                <svg className="w-3 h-3" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M6 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
          )}
      </aside>

      {/* ── 右侧主列表 ───────────────────────────── */}
      <main className="flex-1 flex flex-col w-full min-w-0 overflow-hidden p-8">
        {/* 固定顶部操作栏 — 永远撑满宽度，防止塌陷 */}
        <div className="flex items-center justify-between w-full shrink-0 mb-5">
          {/* 左侧：动态大字标题 */}
          <h2 className="text-3xl font-black text-gray-900 leading-none tracking-tight">
            {selectedFilter?.type === 'tag'
              ? selectedFilter.value
              : selectedFilter?.type === 'date'
                ? formatHeaderDate(selectedFilter.value)
                : '全部待办'}
          </h2>

          {/* 右侧：【+ 创建任务】按钮 — 始终固定在右上角 */}
          <button
            onClick={() => setSelectedTask({
              id: `new-${Date.now()}`,
              title: '',
              date: selectedFilter?.type === 'date' ? selectedFilter.value : formatDateToISO(TODAY),
              time: '',
              company: '',
              tag: selectedFilter?.type === 'tag' ? selectedFilter.value as Task['tag'] : '待办事项',
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
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                {selectedFilter?.type === 'tag'
                  ? `暂无${selectedFilter.value}`
                  : selectedFilter?.type === 'date'
                    ? `${formatHeaderDate(selectedFilter.value)}暂无待办`
                    : '暂无待办'}
              </h3>
              <p className="text-sm text-gray-500 mb-8 max-w-xs text-center leading-relaxed">
                这里目前空空如也，您可以去喝杯咖啡，或者规划一下接下来的面试安排。
              </p>

              {/* 内联 CTA */}
              <button
                onClick={() => setSelectedTask({
                  id: `new-${Date.now()}`,
                  title: '',
                  date: selectedFilter?.type === 'date' ? selectedFilter.value : formatDateToISO(TODAY),
                  time: '',
                  company: '',
                  tag: selectedFilter?.type === 'tag' ? selectedFilter.value as Task['tag'] : '待办事项',
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
          ) : selectedFilter?.type === 'tag' || selectedFilter?.type === 'date' ? (
            // ── 有筛选时：显示全部匹配任务（不过滤历史）──────────────
            <>
              {sections.map((section) => (
                <section key={section.date} className="mb-10 last:mb-0">
                  {selectedFilter?.type !== 'date' && (
                    <h3 className="text-xl font-bold text-gray-900 mt-8 mb-4 leading-none">
                      {formatDateHeader(section.date)}
                    </h3>
                  )}
                  <div className="space-y-3">
                    {section.tasks.map((task) => (
                      <TaskCard key={task.id} task={task} onOpen={setSelectedTask} />
                    ))}
                  </div>
                </section>
              ))}
            </>
          ) : (
            // ── 无筛选时：今天+未来优先，历史折叠 ─────────────────
            <>
              {/* 今天及未来的任务（始终展示） */}
              {upcomingSections.map((section) => (
                <section key={section.date} className="mb-10 last:mb-0">
                  <h3 className="text-xl font-bold text-gray-900 mt-8 mb-4 leading-none">
                    {formatDateHeader(section.date)}
                  </h3>
                  <div className="space-y-3">
                    {section.tasks.map((task) => (
                      <TaskCard key={task.id} task={task} onOpen={setSelectedTask} />
                    ))}
                  </div>
                </section>
              ))}

              {/* 历史任务折叠区 */}
              {pastTaskCount > 0 && (
                <div className="mt-8">
                  {/* 展开/收起按钮 */}
                  <button
                    onClick={() => setHistoryExpanded((v) => !v)}
                    className="w-full flex items-center justify-between py-3 px-4 rounded-lg
                      bg-[#F5F2EE] hover:bg-[#EBE8E1] border border-[#E0DCD1]
                      text-sm text-[#8B735B] font-medium transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <svg
                        className={`w-3.5 h-3.5 transition-transform ${historyExpanded ? 'rotate-90' : ''}`}
                        viewBox="0 0 16 16"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                      >
                        <path d="M6 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      <span>历史任务</span>
                    </div>
                    <span className="text-xs text-[#B8A898]">
                      {formatMonthLabel(historyMonth)} · {historyMonthSections.reduce((sum, s) => sum + s.tasks.length, 0)} 条
                    </span>
                  </button>

                  {/* 历史任务列表（展开后显示，仅当前 historyMonth） */}
                  {historyExpanded && (
                    <div className="mt-3 opacity-60 space-y-3">
                      {historyMonthSections.length === 0 ? (
                        <p className="text-sm text-[#CCCCCC] text-center py-4">
                          {formatMonthLabel(historyMonth)} 暂无任务
                        </p>
                      ) : (
                        historyMonthSections.map((section) => (
                          <section key={section.date} className="mb-8 last:mb-0">
                            <h3 className="text-lg font-bold text-gray-400 mb-3 leading-none">
                              {formatDateHeader(section.date)}
                            </h3>
                            <div className="space-y-3">
                              {section.tasks.map((task) => (
                                <TaskCard key={task.id} task={task} onOpen={setSelectedTask} />
                              ))}
                            </div>
                          </section>
                        ))
                      )}
                    </div>
                  )}
                </div>
              )}
            </>
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
