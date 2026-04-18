'use client';

import { InterviewSchedule, ResumeInfo } from '@/types';
import { Download, FileText } from 'lucide-react';

interface BottomShelfProps {
  schedules: InterviewSchedule[];
  resume: ResumeInfo;
}

export default function BottomShelf({ schedules, resume }: BottomShelfProps) {
  return (
    <div className="flex gap-0 border-t border-[#DCD9D1] pt-8">
      {/* 左侧：未来24小时 */}
      <div className="flex-1 pr-8 border-r border-[#DCD9D1]">
        <h3 className="text-sm font-bold text-[#111111] mb-4">未来24小时</h3>

        <div className="space-y-0">
          {schedules.map((schedule, index) => (
            <div
              key={index}
              className={`flex items-center gap-4 py-3 ${index < schedules.length - 1 ? 'border-b border-[#DCD9D1]' : ''}`}
            >
              <div className="min-w-[48px]">
                <span className="text-base font-bold text-gray-400">{schedule.time}</span>
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
      <div className="flex-1 pl-8">
        <h3 className="text-sm font-bold text-[#111111] mb-4">简历版本</h3>

        <div className="bg-white rounded-md shadow-sm p-4">
          <div className="flex items-center justify-between">
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
            <button className="p-2 hover:bg-[#E8E5E0] rounded-md transition-colors">
              <Download className="w-4 h-4 text-[#666666]" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
