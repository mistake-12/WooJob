'use client';

import { Job } from '@/types';
import { GripVertical } from 'lucide-react';

interface JobCardProps {
  job: Job;
}

export default function JobCard({ job }: JobCardProps) {
  return (
    <div className="bg-white rounded-md shadow-sm border border-gray-100 p-3 flex flex-col gap-2 transition-all duration-200 hover:shadow-md hover:-translate-y-1 cursor-grab group">
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
      <div className="flex flex-wrap gap-x-4 gap-y-0 text-xs text-[#999999]">
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
      </div>

      {/* 底部进度条 */}
      <div className="mt-auto pt-1">
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
