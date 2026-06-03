'use client';

import { Droppable } from '@hello-pangea/dnd';
import { Job, JobStage } from '@/types';
import JobCard from './JobCard';
import { Plus, Calendar } from 'lucide-react';

interface KanbanColumnProps {
  title: JobStage;
  jobs: Job[];
  /** 当 jobs 为空时展示的模板卡片（不可交互，纯展示） */
  templateJobs?: Job[];
  onOpenJob: (job: Job) => void;
  onAddJob: (stage: JobStage) => void;
  onTrashJob?: (job: Job) => void;
}

const LAST_STAGE: JobStage = '已结束';

export default function KanbanColumn({ title, jobs, templateJobs, onOpenJob, onAddJob, onTrashJob }: KanbanColumnProps) {
  const count = String(jobs.length).padStart(2, '0');
  const isLast = title === LAST_STAGE;
  const hasTemplates = templateJobs && templateJobs.length > 0;

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
            {jobs.length === 0 && hasTemplates ? (
              /* 模板卡片：不可拖拽、不可交互，半透明展示 */
              templateJobs!.map((job) => (
                <div
                  key={job.id}
                  title="示例卡片 — 创建你的第一张岗位卡片开始管理"
                  className="bg-white/50 rounded-md border border-gray-200/50 p-3 flex flex-col gap-2 opacity-50 pointer-events-none select-none"
                >
                  {/* 职位名称 */}
                  <div className="flex justify-between items-start">
                    <h3 className="text-sm font-bold text-[#111111] leading-tight">
                      {job.title}
                    </h3>
                  </div>

                  {/* 公司名称 */}
                  <p className="text-xs font-medium text-[#8B735B]">
                    {job.company}
                  </p>

                  {/* 元信息行 */}
                  <div className="flex items-center justify-between text-xs text-[#999999]">
                    <div className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#8B735B]"></span>
                      {job.stage}
                      {job.stage === '面试中' && job.tags.round && (
                        <span className="text-[#8B735B] font-medium"> · {job.tags.round}</span>
                      )}
                    </div>
                    {job.deadline && (
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5" />
                        {job.deadline}
                      </div>
                    )}
                  </div>

                  {/* 底部进度条 */}
                  <div className="mt-auto pt-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-medium text-[#999999] uppercase">DRAFT</span>
                      <div className="flex-1 h-1 bg-[#E0DCD1] rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-[#8B735B]/40" style={{ width: '30%' }} />
                      </div>
                      <span className="text-[10px] font-medium text-[#999999] uppercase">OFFER</span>
                    </div>
                  </div>
                </div>
              ))
            ) : jobs.length === 0 ? (
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
