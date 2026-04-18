import { Job, InterviewSchedule, ResumeInfo } from '@/types';

export const mockJobs: Job[] = [
  {
    id: 'job-001',
    company: '字节跳动',
    title: '高级产品经理',
    stage: '面试中',
    deadline: '2026-04-20',
    tags: {
      referral: '有',
      round: '技术二面',
      interviewTime: '明天 14:00',
    },
    progress: 75,
  },
  {
    id: 'job-002',
    company: '阿里巴巴',
    title: '产品经理',
    stage: '已投递',
    deadline: '2026-04-25',
    tags: {
      referral: '学长',
      remaining: '24小时',
    },
    progress: 25,
  },
  {
    id: 'job-003',
    company: '腾讯',
    title: '产品运营专员',
    stage: '待投递',
    deadline: '2026-04-22',
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
    tags: {
      referral: '学长',
      round: '终面',
      interviewTime: '后天 10:00',
    },
    progress: 75,
  },
  {
    id: 'job-006',
    company: '京东',
    title: '产品经理培训生',
    stage: '已结束',
    deadline: '2026-04-10',
    tags: {
      referral: '无',
    },
    progress: 100,
  },
];

export const mockInterviewSchedules: InterviewSchedule[] = [
  {
    time: '09:00',
    title: '准备滴滴出行产品案例分析',
    company: '滴滴出行',
  },
  {
    time: '14:00',
    title: '滴滴出行技术二面',
    company: '滴滴出行',
  },
];

export const mockResumeInfo: ResumeInfo = {
  filename: '产品经理_主简历_v4.pdf',
  lastEdited: '2天前',
};
