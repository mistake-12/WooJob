export type JobStage =
  | '待投递'
  | '已投递'
  | '笔试中'
  | '面试中'
  | 'Offer'
  | '已结束';

export interface Job {
  id: string;
  company: string;
  title: string;
  stage: JobStage;
  deadline: string;
  time?: string;
  tags: {
    referral?: '有' | '无' | '学长';
    remaining?: string;
    round?: string;
    interviewTime?: string;
  };
  progress: number;
  description?: string;
  notes?: string;
  website?: string;
}

export type TaskType = '面试' | '笔试' | '待投递';

export interface Task {
  id: string;
  jobId?: string;
  date: string; // e.g. '今天' | '明天' | '4月20日'
  time: string;
  title: string;
  company: string;
  round?: string;
  tag: TaskType;
  meetingLink?: string;
  resumeFilename?: string;
  isCompleted: boolean;
}

export interface InterviewSchedule {
  time: string;
  title: string;
  company: string;
}

export interface ResumeInfo {
  filename: string;
  lastEdited: string;
}
