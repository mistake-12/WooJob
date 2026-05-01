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
    <div className={`flex flex-col min-w-[260px] flex-shrink-0 h-full${isLast ? '' : ' border-r border-[#CFCCC8]'}`}>
      {/* 列标题 */}
      <div className="px-3 pt-4 pb-4 border-b border-[#CFCCC8] group">
        <h2 className="flex items-center gap-2">
          <span className="text-base font-bold text-gray-900">{title}</span>
          <span className="text-sm font-medium text-gray-400">({count})</span>
          <button
            onClick={() => onAddJob(title)}
            className="ml-auto opacity-40 hover:opacity-100 transition-opacity w-5 h-5 rounded bg-[#8E7E6E] hover:bg-[#7A6B5A] flex items-center justify-center shadow-sm"
            title={`添加至${title}`}
          >
            <Plus className="w-3 h-3 text-white" />
          </button>
        </h2>
      </div>

      {/* 卡片列表 */}
      <Droppable droppableId={title}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`flex flex-col gap-3 px-3 pt-3 flex-1 transition-all duration-200 ${
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
