'use client';

import { Job } from '@/types';
import { GripVertical } from 'lucide-react';

interface JobCardProps {
  job: Job;
  index: number;
}

export default function JobCard({ job, index }: JobCardProps) {
  const serialNumber = String(index + 1).padStart(2, '0');

  return (
    <div className="bg-white rounded-md shadow-sm border border-gray-100 p-4 flex flex-col gap-3 transition-all duration-200 hover:shadow-md hover:-translate-y-1 cursor-grab group">
      {/* 顶部：序号 + 拖拽手柄 */}
      <div className="flex justify-between items-start">
        <span className="text-xs font-medium text-[#999999]">({serialNumber})</span>
        <div className="opacity-20 group-hover:opacity-40 transition-opacity">
          <GripVertical className="w-4 h-4 text-[#999999]" />
        </div>
      </div>

      {/* 职位名称 */}
      <h3 className="text-base font-bold text-[#111111] leading-tight">
        {job.title}
      </h3>

      {/* 公司名称 */}
      <p className="text-sm font-medium text-[#8B735B]">
        {job.company}
      </p>

      {/* 元信息行 */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#666666]">
        {job.tags.referral && (
          <span>内推: {job.tags.referral}</span>
        )}
        {job.tags.remaining && (
          <span>剩余: {job.tags.remaining}</span>
        )}
        {job.tags.round && (
          <span>轮次: {job.tags.round}</span>
        )}
        {job.tags.interviewTime && (
          <span>时间: {job.tags.interviewTime}</span>
        )}
        {job.tags.referral === undefined && !job.tags.remaining && !job.tags.round && !job.tags.interviewTime && (
          <span>暂无其他信息</span>
        )}
      </div>

      {/* 底部进度条 */}
      <div className="mt-auto pt-2">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-medium text-[#999999] uppercase">DRAFT</span>
          <div className="flex-1 h-1 bg-[#E0DCD1] rounded-full overflow-hidden">
            <div 
              className="h-full bg-[#8B735B] rounded-full transition-all duration-300"
              style={{ width: `${job.progress}%` }}
            />
          </div>
          <span className="text-[10px] font-medium text-[#999999] uppercase">OFFER</span>
        </div>
      </div>
    </div>
  );
}
