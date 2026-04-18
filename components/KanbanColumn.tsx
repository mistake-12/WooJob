'use client';

import { Job, JobStage } from '@/types';
import JobCard from './JobCard';

interface KanbanColumnProps {
  title: JobStage;
  jobs: Job[];
}

const stageOrder: JobStage[] = ['待投递', '已投递', '笔试中', '面试中', 'Offer', '已结束'];

export default function KanbanColumn({ title, jobs }: KanbanColumnProps) {
  const sortedJobs = [...jobs].sort((a, b) => 
    stageOrder.indexOf(a.stage) - stageOrder.indexOf(b.stage)
  );
  
  const count = String(jobs.length).padStart(2, '0');

  return (
    <div className="flex flex-col w-64 flex-shrink-0">
      {/* 列标题 */}
      <div className="px-2 pb-3">
        <h2 className="text-xs font-bold text-[#111111] uppercase tracking-wide">
          {title} ({count})
        </h2>
      </div>

      {/* 卡片列表 */}
      <div className="flex flex-col gap-3 min-h-[200px]">
        {jobs.length === 0 ? (
          <div className="flex items-center justify-center h-24 text-xs text-[#999999] border border-dashed border-[#E0DCD1] rounded-md">
            暂无岗位
          </div>
        ) : (
          jobs.map((job, index) => (
            <JobCard key={job.id} job={job} index={index} />
          ))
        )}
      </div>
    </div>
  );
}
