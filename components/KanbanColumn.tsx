'use client';

import { Droppable, Draggable } from '@hello-pangea/dnd';
import { Job, JobStage } from '@/types';
import JobCard from './JobCard';
import { Plus } from 'lucide-react';

interface KanbanColumnProps {
  title: JobStage;
  jobs: Job[];
  /** 当 jobs 为空时展示的模板卡片（使用真 JobCard，可交互） */
  templateJobs?: Job[];
  /** template 在 store 中不存在，用 templateIndexOffset 避免 index 冲突 */
  templateIndexOffset?: number;
  onOpenJob: (job: Job) => void;
  onAddJob: (stage: JobStage) => void;
  onTrashJob?: (job: Job) => void;
}

const LAST_STAGE: JobStage = '已结束';

export default function KanbanColumn({ title, jobs, templateJobs, templateIndexOffset, onOpenJob, onAddJob, onTrashJob }: KanbanColumnProps) {
  const count = String(jobs.length).padStart(2, '0');
  const isLast = title === LAST_STAGE;
  const hasTemplates = templateJobs && templateJobs.length > 0;
  const offset = templateIndexOffset ?? 0;

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
            {/* 当本列没有任何卡片时展示模板卡片（作为真实可交互 JobCard） */}
            {jobs.length === 0 && hasTemplates
              ? templateJobs!.map((job, i) => (
                  <Draggable key={job.id} draggableId={job.id} index={i + offset}>
                    {(provided, snapshot) => (
                      <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps}>
                        <div
                          className={`transition-all duration-300 ease-out ${
                            snapshot.isDragging
                              ? 'rotate-3 scale-[1.05] shadow-2xl ring-2 ring-gray-900/10'
                              : 'rotate-0 scale-100'
                          }`}
                        >
                          <div className="relative">
                            <span className="absolute -top-2 left-2 z-10 text-[9px] px-1.5 py-0.5 rounded bg-[#8B735B]/10 text-[#8B735B] font-medium">
                              示例
                            </span>
                            <JobCard
                              job={job}
                              index={i}
                              onOpen={onOpenJob}
                              onTrash={onTrashJob}
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </Draggable>
                ))
              : jobs.length === 0 ? (
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
