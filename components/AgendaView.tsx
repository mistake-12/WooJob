'use client';

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

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];

function getMonthGrid(year: number, month: number) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  return cells;
}

const LEFT_SIDEBAR_ITEMS = [
  { label: '全部待办', count: 5 },
  { label: '近期面试', count: 2 },
  { label: '近期笔试', count: 1 },
  { label: '已投递待回', count: 2 },
];

interface AgendaTask {
  id: string;
  time: string;
  company: string;
  title: string;
  round?: string;
  tag: '面试' | '笔试' | '待投递';
  meetingLink?: string;
  resumeFilename?: string;
}

interface AgendaSection {
  label: string;
  sub: string;
  weekday: string;
  tasks: AgendaTask[];
}

const AGENDA_DATA: AgendaSection[] = [
  {
    label: '今天',
    sub: '4月18日',
    weekday: '星期六',
    tasks: [
      {
        id: 't1',
        time: '14:00',
        company: '滴滴出行',
        title: '滴滴出行 - 资深产品专家 技术二面',
        round: '技术二面',
        tag: '面试',
        meetingLink: '进入会议',
        resumeFilename: '产品主简历_v4.pdf',
      },
      {
        id: 't2',
        time: '09:00',
        company: '美团',
        title: '美团 - UI设计师 在线笔试',
        round: '笔试中',
        tag: '笔试',
        meetingLink: '开始笔试',
        resumeFilename: '设计师简历_v2.pdf',
      },
    ],
  },
  {
    label: '明天',
    sub: '4月19日',
    weekday: '星期日',
    tasks: [
      {
        id: 't3',
        time: '10:00',
        company: '腾讯',
        title: '腾讯 - 产品运营专员 一面',
        round: '初面',
        tag: '面试',
        meetingLink: '进入会议',
        resumeFilename: '产品主简历_v4.pdf',
      },
      {
        id: 't4',
        time: '20:00',
        company: '阿里巴巴',
        title: '阿里巴巴 - 产品经理 笔试',
        tag: '笔试',
        meetingLink: '开始笔试',
        resumeFilename: '产品主简历_v4.pdf',
      },
    ],
  },
  {
    label: '4月20日',
    sub: '4月20日',
    weekday: '星期一',
    tasks: [
      {
        id: 't5',
        time: '09:00',
        company: '字节跳动',
        title: '字节跳动 - 高级产品经理 HR沟通',
        tag: '面试',
        meetingLink: '进入会议',
        resumeFilename: '产品主简历_v4.pdf',
      },
    ],
  },
  {
    label: '4月21日',
    sub: '4月21日',
    weekday: '星期二',
    tasks: [
      {
        id: 't6',
        time: '10:00',
        company: '滴滴出行',
        title: '滴滴出行 - 产品经理 终面',
        round: '终面',
        tag: '面试',
        meetingLink: '进入会议',
        resumeFilename: '产品主简历_v4.pdf',
      },
    ],
  },
];

export default function AgendaView() {
  const year = TODAY.getFullYear();
  const month = TODAY.getMonth();
  const day = TODAY.getDate();
  const grid = getMonthGrid(year, month);

  const tagColors: Record<AgendaTask['tag'], string> = {
    '面试': 'bg-[#EBE8E1] text-[#666666]',
    '笔试': 'bg-[#EBE8E1] text-[#666666]',
    '待投递': 'bg-[#EBE8E1] text-[#666666]',
  };

  return (
    <div className="flex h-full overflow-hidden">
      {/* ── 左侧边栏 ─────────────────────────────── */}
      <aside className="w-[300px] flex-shrink-0 border-r border-[#DCD9D1] flex flex-col overflow-y-auto py-6 px-5 gap-8">

        {/* 迷你日历 */}
        <div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">
            {year}年 {month + 1}月
          </p>
          {/* 星期头 */}
          <div className="grid grid-cols-7 gap-0 mb-1">
            {WEEKDAYS.map((w) => (
              <div key={w} className="text-center text-[10px] text-gray-300 font-medium py-1">
                {w}
              </div>
            ))}
          </div>
          {/* 日期格 */}
          <div className="grid grid-cols-7 gap-0">
            {grid.map((d, i) => {
              const isToday = d === day;
              return (
                <div key={i} className="aspect-square flex items-center justify-center">
                  {d !== null ? (
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] transition-colors
                        ${isToday
                          ? 'bg-gray-900 text-white font-semibold'
                          : 'text-gray-700 hover:bg-black/5'
                        }`}
                    >
                      {d}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>

        {/* 分类列表 */}
        <div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">
            筛选
          </p>
          <div className="space-y-0">
            {LEFT_SIDEBAR_ITEMS.map((item, idx) => (
              <button
                key={item.label}
                className={`w-full flex items-center justify-between py-2.5 px-3 rounded-md text-sm transition-colors
                  ${idx === 0
                    ? 'text-gray-900 font-semibold bg-black/4'
                    : 'text-gray-500 hover:bg-black/4 hover:text-gray-800'
                  }`}
              >
                <div className="flex items-center gap-2">
                  {idx === 0 && (
                    <div className="w-0.5 h-3.5 bg-gray-900 rounded-full" />
                  )}
                  <span>{item.label}</span>
                </div>
                <span className={`text-xs ${idx === 0 ? 'text-gray-500' : 'text-gray-400'}`}>
                  {item.count}
                </span>
              </button>
            ))}
          </div>
        </div>
      </aside>

      {/* ── 右侧主列表 ───────────────────────────── */}
      <main className="flex-1 min-w-0 overflow-y-auto p-8">
        <div className="w-full">
          {AGENDA_DATA.map((section) => (
            <section key={section.label} className="mb-10 last:mb-0">
              {/* 日期分组头 */}
              <div className="mb-5">
                <h2 className="text-2xl font-black text-gray-900 leading-none tracking-tight">
                  {section.label}
                  <span className="text-base font-medium text-gray-400 ml-3 tracking-normal">
                    {section.sub} {section.weekday}
                  </span>
                </h2>
              </div>

              {/* 任务卡片列表 */}
              <div className="space-y-3">
                {section.tasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center w-full bg-white rounded-lg shadow-sm border border-gray-100 p-4 hover:shadow-md hover:border-gray-200 transition-all cursor-pointer"
                  >
                    {/* ── 左侧：时间标识区（固定宽度） */}
                    <div className="flex items-center gap-3 shrink-0 min-w-[100px]">
                      {/* Checkbox */}
                      <div className="w-5 h-5 rounded-full border-2 border-gray-300 hover:border-gray-500 transition-colors cursor-pointer flex items-center justify-center flex-shrink-0">
                        <div className="w-1.5 h-1.5 rounded-full bg-transparent" />
                      </div>
                      {/* 时间 */}
                      <span className="text-sm font-medium text-gray-400 leading-none whitespace-nowrap">
                        {task.time}
                      </span>
                      {/* 分割点 */}
                      <div className="w-1 h-1 rounded-full bg-gray-300 flex-shrink-0" />
                    </div>

                    {/* ── 中间：核心标题区（弹性撑满） */}
                    <div className="flex-1 flex flex-col min-w-0 pr-4">
                      <p className="text-sm font-semibold text-gray-900 truncate leading-snug">
                        {task.title}
                      </p>
                      {task.round && (
                        <p className="text-xs text-gray-400 mt-0.5 leading-none">
                          {task.round}
                        </p>
                      )}
                    </div>

                    {/* ── 右侧：快捷动作与标签（靠右对齐） */}
                    <div className="flex items-center gap-4 shrink-0">
                      {task.meetingLink && (
                        <button className="flex items-center gap-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 px-3 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer whitespace-nowrap">
                          <VideoIcon />
                          {task.meetingLink}
                        </button>
                      )}
                      {task.resumeFilename && (
                        <span className="flex items-center gap-1 text-[10px] text-gray-400 leading-none whitespace-nowrap">
                          <PaperclipIcon />
                          {task.resumeFilename}
                        </span>
                      )}
                      <span
                        className={`text-xs font-medium px-2.5 py-1 rounded-md ${tagColors[task.tag]}`}
                      >
                        {task.tag}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      </main>
    </div>
  );
}
