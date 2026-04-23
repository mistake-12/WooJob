import { Job, ResumeInfo, Task } from '@/types';

function getDynamicDate(daysFromNow: number): string {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return `${month}月${day}日`;
}

export const mockJobs: Job[] = [
  {
    id: 'job-001',
    company: '字节跳动',
    title: '高级产品经理',
    stage: '面试中',
    deadline: '2026-04-20',
    time: '明天 14:00',
    tags: {
      referral: '有',
      round: '技术二面',
    },
    progress: 75,
  },
  {
    id: 'job-002',
    company: '阿里巴巴',
    title: '产品经理',
    stage: '已投递',
    deadline: '2026-04-25',
    time: '24小时',
    tags: {
      referral: '学长',
    },
    progress: 25,
  },
  {
    id: 'job-003',
    company: '腾讯',
    title: '产品运营专员',
    stage: '待投递',
    deadline: '2026-04-22',
    time: '4月22日',
    tags: {
      referral: '无',
    },
    progress: 5,
  },
  {
    id: 'job-004',
    company: '美团',
    title: 'UI设计师',
    stage: '笔试中',
    deadline: '2026-04-19',
    time: '明天 09:00',
    tags: {
      round: '笔试中',
    },
    progress: 50,
  },
  {
    id: 'job-005',
    company: '滴滴出行',
    title: '产品经理',
    stage: '面试中',
    deadline: '2026-04-21',
    time: '后天 10:00',
    tags: {
      referral: '学长',
      round: '终面',
    },
    progress: 75,
  },
  {
    id: 'job-006',
    company: '京东',
    title: '产品经理培训生',
    stage: '已结束',
    deadline: '2026-04-10',
    time: '已结束',
    tags: {
      referral: '无',
    },
    progress: 100,
  },
];

export const mockTasks: Task[] = [
  {
    id: 'task-001',
    jobId: 'job-005',
    date: '今天',
    time: '14:00',
    title: '滴滴出行 - 资深产品专家 技术二面',
    company: '滴滴出行',
    round: '技术二面',
    tag: '面试',
    meetingLink: '进入会议',
    resumeFilename: '产品主简历_v4.pdf',
    isCompleted: false,
  },
  {
    id: 'task-002',
    jobId: 'job-004',
    date: '今天',
    time: '09:00',
    title: '美团 - UI设计师 在线笔试',
    company: '美团',
    round: '笔试中',
    tag: '笔试',
    meetingLink: '开始笔试',
    resumeFilename: '设计师简历_v2.pdf',
    isCompleted: false,
  },
  {
    id: 'task-003',
    jobId: 'job-001',
    date: '明天',
    time: '10:00',
    title: '腾讯 - 产品运营专员 一面',
    company: '腾讯',
    round: '初面',
    tag: '面试',
    meetingLink: '进入会议',
    resumeFilename: '产品主简历_v4.pdf',
    isCompleted: false,
  },
  {
    id: 'task-004',
    jobId: 'job-002',
    date: '明天',
    time: '20:00',
    title: '阿里巴巴 - 产品经理 笔试',
    company: '阿里巴巴',
    tag: '笔试',
    meetingLink: '开始笔试',
    resumeFilename: '产品主简历_v4.pdf',
    isCompleted: false,
  },
  {
    id: 'task-005',
    jobId: 'job-001',
    date: getDynamicDate(3),
    time: '09:00',
    title: '字节跳动 - 高级产品经理 HR沟通',
    company: '字节跳动',
    tag: '面试',
    meetingLink: '进入会议',
    resumeFilename: '产品主简历_v4.pdf',
    isCompleted: false,
  },
  {
    id: 'task-006',
    jobId: 'job-005',
    date: getDynamicDate(4),
    time: '10:00',
    title: '滴滴出行 - 产品经理 终面',
    company: '滴滴出行',
    round: '终面',
    tag: '面试',
    meetingLink: '进入会议',
    resumeFilename: '产品主简历_v4.pdf',
    isCompleted: false,
  },
];

export const mockResumeInfo: ResumeInfo = {
  filename: '产品经理_主简历_v4.pdf',
  lastEdited: '2天前',
};
