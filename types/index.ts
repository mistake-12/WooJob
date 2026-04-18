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
  tags: {
    referral?: '有' | '无' | '学长';
    remaining?: string;
    round?: string;
    interviewTime?: string;
  };
  progress: number;
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
