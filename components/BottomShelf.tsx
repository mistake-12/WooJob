'use client';

import { InterviewSchedule, ResumeInfo } from '@/types';
import { Download, FileText, Clock, Calendar } from 'lucide-react';

interface BottomShelfProps {
  schedules: InterviewSchedule[];
  resume: ResumeInfo;
}

export default function BottomShelf({ schedules, resume }: BottomShelfProps) {
  return (
    <div className="flex gap-4 mt-6">
      {/* 左侧：未来24小时待办 */}
      <div className="flex-1 bg-white rounded-lg p-4 shadow-sm border border-gray-100">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="w-4 h-4 text-[#8B735B]" />
          <h3 className="text-sm font-bold text-[#111111]">未来24小时待办</h3>
        </div>
        
        <div className="space-y-3">
          {schedules.map((schedule, index) => (
            <div 
              key={index} 
              className="flex items-center gap-3 p-3 bg-[#F4F3EE] rounded-md"
            >
              <div className="flex flex-col items-center min-w-[48px]">
                <span className="text-lg font-bold text-[#111111]">{schedule.time}</span>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-[#111111]">{schedule.title}</p>
                <p className="text-xs text-[#666666] mt-0.5">{schedule.company}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 右侧：简历版本 */}
      <div className="w-72 bg-white rounded-lg p-4 shadow-sm border border-gray-100">
        <div className="flex items-center gap-2 mb-4">
          <FileText className="w-4 h-4 text-[#8B735B]" />
          <h3 className="text-sm font-bold text-[#111111]">简历库</h3>
        </div>
        
        <div className="flex items-center justify-between p-3 bg-[#F4F3EE] rounded-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#8B735B] bg-opacity-10 rounded-md flex items-center justify-center">
              <FileText className="w-5 h-5 text-[#8B735B]" />
            </div>
            <div>
              <p className="text-sm font-medium text-[#111111] truncate max-w-[160px]">
                {resume.filename}
              </p>
              <p className="text-xs text-[#666666] mt-0.5">
                上次编辑: {resume.lastEdited}
              </p>
            </div>
          </div>
          <button className="p-2 hover:bg-[#E0DCD1] rounded-md transition-colors">
            <Download className="w-4 h-4 text-[#666666]" />
          </button>
        </div>
      </div>
    </div>
  );
}
