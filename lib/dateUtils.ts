/**
 * 日期处理工具函数
 * 用于将各种日期格式统一处理，并与 Task 类型配合使用
 */

/**
 * 获取今天的日期字符串 (YYYY-MM-DD 格式)
 */
export function getToday(): string {
  const now = new Date();
  return formatDateToISO(now);
}

/**
 * 获取明天的日期字符串 (YYYY-MM-DD 格式)
 */
export function getTomorrow(): string {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return formatDateToISO(tomorrow);
}

/**
 * 格式化日期为 ISO 字符串 (YYYY-MM-DD)
 */
export function formatDateToISO(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * 将各种日期格式转换为 ISO 格式 (YYYY-MM-DD)
 * '今天' → '2026-04-23'
 * '明天' → '2026-04-24'
 * '4月23日' → '2026-04-23' (使用当前年份)
 * '2026-04-23' → '2026-04-23'
 * '2026/04/23' → '2026-04-23'
 */
export function normalizeToISODate(dateStr: string): string {
  if (!dateStr) return '';

  const today = new Date();

  if (dateStr === '今天') {
    return formatDateToISO(today);
  }

  if (dateStr === '明天') {
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return formatDateToISO(tomorrow);
  }

  // 处理 '4月23日' 格式
  const monthDayMatch = dateStr.match(/(\d+)月(\d+)日/);
  if (monthDayMatch) {
    const month = parseInt(monthDayMatch[1]);
    const day = parseInt(monthDayMatch[2]);
    const result = new Date(today.getFullYear(), month - 1, day);
    return formatDateToISO(result);
  }

  // 处理 '2026/04/23' 格式
  if (dateStr.includes('/')) {
    const [year, month, day] = dateStr.split('/');
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  // 已经是 ISO 格式，直接返回
  return dateStr;
}

/**
 * 将 ISO 日期字符串转换为友好的中文标签
 * '2026-04-23' → '今天'
 * '2026-04-24' → '明天'
 * '2026-04-25' → '4月25日'
 */
export function isoToDateLabel(isoDate: string): string {
  const today = getToday();
  const tomorrow = getTomorrow();

  if (isoDate === today) return '今天';
  if (isoDate === tomorrow) return '明天';

  // 转换为 '4月23日' 格式
  const match = isoDate.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (match) {
    const month = parseInt(match[2]);
    const day = parseInt(match[3]);
    return `${month}月${day}日`;
  }

  return isoDate;
}

/**
 * 比较两个日期字符串 (支持 ISO 和中文格式)
 * 返回: -1 (a < b), 0 (a = b), 1 (a > b)
 */
export function compareDates(a: string, b: string): number {
  const dateA = normalizeToISODate(a);
  const dateB = normalizeToISODate(b);
  return dateA.localeCompare(dateB);
}

/**
 * 比较两个时间字符串
 * 返回: -1 (a < b), 0 (a = b), 1 (a > b)
 */
export function compareTimes(a: string, b: string): number {
  return a.localeCompare(b);
}

/**
 * 检查任务是否在指定时间段内（默认24小时，从当前时刻开始）
 * @param taskDate 任务的日期字符串
 * @param taskTime 任务的时间字符串
 */
export function isTaskInTimeRange(
  taskDate: string,
  taskTime: string
): boolean {
  const now = new Date();
  const todayISO = getToday();
  const tomorrowISO = getTomorrow();
  const taskDateISO = normalizeToISODate(taskDate);

  // 只显示今天和明天的任务
  if (taskDateISO !== todayISO && taskDateISO !== tomorrowISO) {
    return false;
  }

  // 如果没有时间，检查日期
  if (!taskTime) {
    // 没有时间的任务，今天和明天都显示
    return true;
  }

  // 解析当前时间和任务时间
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const currentTimeInMinutes = currentHour * 60 + currentMinute;

  const [taskHour, taskMinute] = taskTime.split(':').map(Number);
  const taskTimeInMinutes = taskHour * 60 + taskMinute;

  // 如果是今天的任务，检查时间是否在当前时间之后
  if (taskDateISO === todayISO) {
    return taskTimeInMinutes >= currentTimeInMinutes;
  }

  // 明天的任务都显示
  return true;
}

/**
 * 获取从当前时刻起接下来24小时内的任务列表
 * @param tasks 任务列表
 * @param excludeCompleted 是否排除已完成的任务
 */
export function getNext24HoursTasks(
  tasks: { id: string; date: string; time: string; isCompleted?: boolean }[],
  excludeCompleted: boolean = true
) {
  const now = new Date();

  return tasks
    .filter((task) => {
      // 排除已完成的任务
      if (excludeCompleted && task.isCompleted) {
        return false;
      }

      // 检查是否在24小时范围内
      const taskDateISO = normalizeToISODate(task.date);
      const todayISO = getToday();
      const tomorrowISO = getTomorrow();

      // 只显示今天和明天的任务
      if (taskDateISO !== todayISO && taskDateISO !== tomorrowISO) {
        return false;
      }

      // 如果没有时间，检查日期
      if (!task.time) {
        return true;
      }

      // 解析时间
      const [taskHour, taskMinute] = task.time.split(':').map(Number);

      if (taskDateISO === todayISO) {
        // 今天的任务：检查时间是否在当前时间之后
        const currentTimeInMinutes = now.getHours() * 60 + now.getMinutes();
        const taskTimeInMinutes = taskHour * 60 + taskMinute;
        return taskTimeInMinutes >= currentTimeInMinutes;
      }

      // 明天的任务都显示
      return true;
    })
    .sort((a, b) => {
      // 按日期排序（今天在前）
      const dateCompare = compareDates(a.date, b.date);
      if (dateCompare !== 0) return dateCompare;

      // 按时间排序
      return compareTimes(a.time, b.time);
    });
}
