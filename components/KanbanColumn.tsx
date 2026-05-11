'use client';

import { Droppable } from '@hello-pangea/dnd';
import { Job, JobStage } from '@/types';
import JobCard from './JobCard';
import { Plus } from 'lucide-react';

interface KanbanColumnProps {
  title: JobStage;
  jobs: Job[];
  onOpenJob: (job: Job) => void;
  onAddJob: (stage: JobStage) => void;
  onTrashJob?: (job: Job) => void;
}

const LAST_STAGE: JobStage = '已结束';

export default function KanbanColumn({ title, jobs, onOpenJob, onAddJob, onTrashJob }: KanbanColumnProps) {
  const count = String(jobs.length).padStart(2, '0');
  const isLast = title === LAST_STAGE;

  return (
    <div className={`flex flex-col flex-shrink-0 h-full w-[260px]${isLast ? '' : ' border-r border-[#CFCCC8]'}`}>
      {/* 列标题 — 固定头部，不参与滚动 */}
      <div className="px-3 pt-4 pb-4 border-b border-[#CFCCC8] group shrink-0">
        <h2 className="flex items-center gap-2">
          <span className="text-base font-bold text-gray-900">{title}</span>
          <span className="text-sm font-medium text-gray-400">({count})</span>
          <button
            onClick={() => onAddJob(title)}
            className="w-6 h-6 rounded bg-[#E5E1DA] hover:bg-[#D8D4CE] flex items-center justify-center transition-colors"
            title={`添加至${title}`}
          >
            <Plus className="w-3 h-3 text-[#8B735B]" />
          </button>
        </h2>
      </div>

      {/* 卡片列表 — Droppable 滚动层，flex-1 + min-h-0 让 flex 收缩生效 */}
      <Droppable droppableId={title}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`flex-1 min-h-0 px-3 pt-3 flex flex-col gap-3 overflow-y-auto transition-all duration-200 ${
              snapshot.isDraggingOver ? 'bg-[#E0DDD6] shadow-[inset_0_2px_8px_rgba(0,0,0,0.06)]' : ''
            }`}
          >
            {jobs.length === 0 ? (
              <div className="flex items-center justify-center h-16 text-xs text-[#BBBBBB]">
                暂无岗位
              </div>
            ) : (
              jobs.map((job, index) => (
                <JobCard
                  key={job.id}
                  job={job}
                  index={index}
                  onOpen={onOpenJob}
                  onTrash={onTrashJob}
                />
              ))
            )}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  );
}
