'use client';

import { Draggable } from '@hello-pangea/dnd';
import { Job } from '@/types';
import { GripVertical, Calendar } from 'lucide-react';

interface JobCardProps {
  job: Job;
  index: number;
  setJobs: React.Dispatch<React.SetStateAction<Job[]>>;
  onOpen: (job: Job) => void;
}

export default function JobCard({ job, index, setJobs, onOpen }: JobCardProps) {
  const isEnded = job.stage === '已结束';

  /* 计算进度百分比：基础阶段 + 面试中轮次细分 */
  function calculateProgress(stage: string, round?: string): number {
    switch (stage) {
      case '待投递':
        return 10;
      case '已投递':
        return 30;
      case '笔试中':
        return 50;
      case '面试中': {
        switch (round) {
          case '初面':
            return 62;
          case '技术二面':
            return 74;
          case '业务终面':
            return 86;
          case 'HR面':
            return 94;
          default:
            return 62; // 面试中但未选轮次时默认为初面进度
        }
      }
      case 'Offer':
      case '已结束':
        return 100;
      default:
        return 0; // 兜底
    }
  }

  const calculatedProgress = calculateProgress(job.stage, job.tags.round);

  let downX = 0;
  let downY = 0;

  function onPointerDownHandler(e: React.PointerEvent<HTMLDivElement>) {
    if (e.button !== 0) return;
    downX = e.clientX;
    downY = e.clientY;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }

  function onPointerUpHandler(e: React.PointerEvent<HTMLDivElement>) {
    if (e.button !== 0) return;
    const movedX = Math.abs(e.clientX - downX);
    const movedY = Math.abs(e.clientY - downY);
    if (movedX < 5 && movedY < 5) {
      onOpen(job);
    }
  }

  return (
    <Draggable draggableId={job.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={`${isEnded ? 'opacity-50' : ''}`}
        >
          {/* 内层：承载所有视觉样式和倾斜动画 */}
          <div
            onPointerDown={onPointerDownHandler}
            onPointerUp={onPointerUpHandler}
            className={`
              bg-white rounded-md border border-gray-100 p-3 flex flex-col gap-2
              transition-all duration-300 ease-out
              group
              ${snapshot.isDragging
                ? 'rotate-3 scale-[1.05] shadow-2xl ring-2 ring-gray-900/10 cursor-grabbing'
                : 'rotate-0 scale-100 shadow-sm cursor-grab hover:shadow-md hover:-translate-y-1'
              }
            `}
          >
            {/* 职位名称 */}
            <div className="flex justify-between items-start">
              <h3 className="text-sm font-bold text-[#111111] leading-tight flex-1">
                {job.title}
              </h3>
              <div className="opacity-20 group-hover:opacity-40 transition-opacity ml-2 flex-shrink-0">
                <GripVertical className="w-3 h-3 text-[#999999]" />
              </div>
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
              {job.time && (
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  {job.time}
                </div>
              )}
            </div>

            {/* 底部进度条 */}
            <div className="mt-auto pt-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-medium text-[#999999] uppercase">DRAFT</span>
                <div className="flex-1 h-1 bg-[#E0DCD1] rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ease-in-out ${isEnded ? 'bg-gray-300' : 'bg-[#8B735B]'}`}
                    style={{ width: `${calculatedProgress}%` }}
                  />
                </div>
                <span className="text-[10px] font-medium text-[#999999] uppercase">OFFER</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </Draggable>
  );
}
