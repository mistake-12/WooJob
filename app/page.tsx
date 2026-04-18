'use client';

import { Job, JobStage } from '@/types';
import { mockJobs, mockInterviewSchedules, mockResumeInfo } from '@/lib/mockData';
import KanbanColumn from '@/components/KanbanColumn';
import BottomShelf from '@/components/BottomShelf';
import AISidebar from '@/components/AISidebar';
import { Briefcase, TrendingUp, Activity } from 'lucide-react';

const stages: JobStage[] = ['待投递', '已投递', '笔试中', '面试中', 'Offer', '已结束'];

export default function Home() {
  const jobsByStage = stages.reduce((acc, stage) => {
    acc[stage] = mockJobs.filter((job) => job.stage === stage);
    return acc;
  }, {} as Record<JobStage, Job[]>);

  const totalJobs = mockJobs.length;
  const successRate = '12.4%';

  return (
    <div className="h-screen w-screen bg-[#F4F3EE] flex overflow-hidden">
      {/* 左侧主工作区 - 75% */}
      <div className="flex-1 flex flex-col p-8 overflow-hidden">
        {/* 顶部信息栏 */}
        <div className="flex items-start justify-between mb-8">
          {/* 左侧：标题 */}
          <div>
            <h1 className="text-5xl font-black text-[#111111] tracking-tighter">
              求职管理
            </h1>
          </div>

          {/* 右侧：统计指标 */}
          <div className="flex gap-6">
            <div className="flex items-center gap-3 px-4 py-2 bg-white rounded-lg shadow-sm border border-gray-100">
              <Briefcase className="w-5 h-5 text-[#8B735B]" />
              <div>
                <p className="text-xs text-[#999999]">在投岗位</p>
                <p className="text-xl font-bold text-[#111111]">{totalJobs}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 px-4 py-2 bg-white rounded-lg shadow-sm border border-gray-100">
              <TrendingUp className="w-5 h-5 text-[#8B735B]" />
              <div>
                <p className="text-xs text-[#999999]">成功率</p>
                <p className="text-xl font-bold text-[#111111]">{successRate}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 px-4 py-2 bg-white rounded-lg shadow-sm border border-gray-100">
              <Activity className="w-5 h-5 text-[#8B735B]" />
              <div>
                <p className="text-xs text-[#999999]">状态</p>
                <p className="text-sm font-bold text-[#8B735B]">求职中</p>
              </div>
            </div>
          </div>
        </div>

        {/* 看板区域 */}
        <div className="flex gap-6 overflow-x-auto pb-4 flex-1">
          {stages.map((stage) => (
            <KanbanColumn
              key={stage}
              title={stage}
              jobs={jobsByStage[stage]}
            />
          ))}
        </div>

        {/* 底部区域 */}
        <BottomShelf 
          schedules={mockInterviewSchedules}
          resume={mockResumeInfo}
        />
      </div>

      {/* 右侧 AI 侧边栏 - 25% */}
      <AISidebar />
    </div>
  );
}
