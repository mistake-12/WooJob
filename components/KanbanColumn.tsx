'use client';

import { Job, JobStage } from '@/types';
import JobCard from './JobCard';

interface KanbanColumnProps {
  title: JobStage;
  jobs: Job[];
}

const LAST_STAGE: JobStage = '已结束';

export default function KanbanColumn({ title, jobs }: KanbanColumnProps) {
  const count = String(jobs.length).padStart(2, '0');
  const isLast = title === LAST_STAGE;

  return (
    <div className={`flex flex-col min-w-[260px] flex-shrink-0 h-full${isLast ? '' : ' border-r border-[#CFCCC8]'}`}>
      {/* 列标题 */}
      <div className="px-3 pt-4 pb-4 border-b border-[#CFCCC8]">
        <h2 className="flex items-baseline gap-2">
          <span className="text-base font-bold text-gray-900">{title}</span>
          <span className="text-sm font-medium text-gray-400">({count})</span>
        </h2>
      </div>

      {/* 卡片列表 */}
      <div className="flex flex-col gap-3 px-3 pt-3 flex-1">
        {jobs.length === 0 ? (
          <div className="flex items-center justify-center h-16 text-xs text-[#BBBBBB]">
            暂无岗位
          </div>
        ) : (
          jobs.map((job) => (
            <JobCard key={job.id} job={job} />
          ))
        )}
      </div>
    </div>
  );
}
