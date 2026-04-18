'use client';

import { useState } from 'react';
import { DragDropContext, DropResult } from '@hello-pangea/dnd';
import { Job, JobStage, Task } from '@/types';
import { mockJobs, mockTasks, mockInterviewSchedules, mockResumeInfo } from '@/lib/mockData';
import KanbanColumn from '@/components/KanbanColumn';
import BottomShelf from '@/components/BottomShelf';
import AISidebar from '@/components/AISidebar';
import AgendaView from '@/components/AgendaView';
import SideDrawer from '@/components/SideDrawer';
import { Briefcase, TrendingUp, Activity, Plus } from 'lucide-react';

const stages: JobStage[] = ['待投递', '已投递', '笔试中', '面试中', 'Offer', '已结束'];

export default function Home() {
  const [currentView, setCurrentView] = useState<'kanban' | 'agenda'>('kanban');
  const [jobs, setJobs] = useState<Job[]>(mockJobs);
  const [tasks, setTasks] = useState<Task[]>(mockTasks);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);

  const jobsByStage = stages.reduce((acc, stage) => {
    acc[stage] = jobs.filter((job) => job.stage === stage);
    return acc;
  }, {} as Record<JobStage, Job[]>);

  const totalJobs = jobs.length;
  const successRate = '12.4%';

  function onDragEnd(result: DropResult) {
    const { source, destination, draggableId } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;
    const newStage = destination.droppableId as JobStage;
    setJobs((prev) =>
      prev.map((job) => (job.id === draggableId ? { ...job, stage: newStage } : job))
    );
  }

  const handleOpenJob = (job: Job) => setSelectedJob(job);
  const handleCloseDrawer = () => setSelectedJob(null);

  const handleUpdateJob = (updated: Job) => {
    const exists = jobs.some((j) => j.id === updated.id);
    if (exists) {
      setJobs((prev) => prev.map((j) => (j.id === updated.id ? updated : j)));
    } else {
      setJobs((prev) => [updated, ...prev]);
    }
  };

  function createEmptyJob(stage: JobStage = '待投递'): Job {
    return {
      id: `new-${Date.now()}`,
      company: '',
      title: '',
      stage,
      deadline: '',
      tags: {},
      progress: 10,
    };
  }

  const handleAddJob = (stage?: JobStage) => {
    setSelectedJob(createEmptyJob(stage));
  };

  return (
    <div className="min-h-screen bg-[#D1CFCA] flex items-center justify-center p-4">
      {/* 应用主窗口 */}
      <div className="w-full max-w-[95vw] h-[95vh] bg-[#EBE8E3] rounded-2xl shadow-xl border border-gray-200 overflow-hidden flex flex-col">
        {/* 顶部 Header */}
        <div className="relative px-8 pt-7 pb-5 border-b border-[#CFCCC8] flex-shrink-0">
          <div className="flex items-end justify-between">
            {/* 左侧：Logo */}
            <div className="flex items-end">
              <h1 className="text-6xl font-black text-gray-900 tracking-tighter italic leading-none">
                WooJob!!!
              </h1>
              <p className="text-[14px] text-[#8B735B] uppercase tracking-[0.3em] leading-none ml-2 mb-1">
                求职管理系统
              </p>
            </div>

            {/* 中间：视图切换器，底部与文字对齐 */}
            <div className="absolute left-1/2 -translate-x-1/2 flex items-end">
              <div className="bg-black/5 rounded-full p-1 flex gap-1">
                <button
                  onClick={() => setCurrentView('kanban')}
                  className={`px-4 py-1.5 rounded-full text-sm transition-colors ${
                    currentView === 'kanban'
                      ? 'bg-white text-gray-900 shadow-sm font-medium'
                      : 'bg-transparent text-gray-500 hover:text-gray-800'
                  }`}
                >
                  看板
                </button>
                <button
                  onClick={() => setCurrentView('agenda')}
                  className={`px-4 py-1.5 rounded-full text-sm transition-colors ${
                    currentView === 'agenda'
                      ? 'bg-white text-gray-900 shadow-sm font-medium'
                      : 'bg-transparent text-gray-500 hover:text-gray-800'
                  }`}
                >
                  日程
                </button>
              </div>
            </div>

            {/* 右侧：统计指标 */}
            <div className="flex items-end gap-8">
              <div className="flex items-center gap-3">
                <Briefcase className="w-5 h-5 text-[#8B735B]" />
                <div className="flex flex-col items-start">
                  <p className="text-xs font-medium text-[#8B735B] leading-none">在投岗位</p>
                  <p className="text-2xl font-bold text-gray-900 leading-none tracking-tight">{totalJobs}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <TrendingUp className="w-5 h-5 text-[#8B735B]" />
                <div className="flex flex-col items-start">
                  <p className="text-xs font-medium text-[#8B735B] leading-none">成功率</p>
                  <p className="text-2xl font-bold text-gray-900 leading-none tracking-tight">{successRate}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Activity className="w-5 h-5 text-[#8B735B]" />
                <div className="flex flex-col items-start">
                  <p className="text-xs font-medium text-[#8B735B] leading-none">状态</p>
                  <p className="text-2xl font-bold text-gray-900 leading-none tracking-tight">求职中</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 左侧内容区 + 右侧 AI 侧边栏 */}
        <div className="flex flex-1 min-h-0 overflow-hidden">
          <div className="flex-1 flex flex-col px-8 pb-8 overflow-hidden">
            {/* 中间内容容器：占满剩余高度 */}
            <div className="flex-1 flex flex-col overflow-hidden">
              {currentView === 'kanban' ? (
                <div className="relative flex-1 flex flex-col overflow-hidden">
                  <DragDropContext onDragEnd={onDragEnd}>
                    <div className="flex gap-0 overflow-x-auto pb-4 flex-1 items-stretch">
                      {stages.map((stage) => (
                        <KanbanColumn
                          key={stage}
                          title={stage}
                          jobs={jobsByStage[stage]}
                          setJobs={setJobs}
                          onOpenJob={handleOpenJob}
                          onAddJob={handleAddJob}
                        />
                      ))}
                    </div>
                  </DragDropContext>
                  {/* FAB: 新建岗位，贴在已结束列右下角 */}
                  <button
                    onClick={() => handleAddJob()}
                    className="absolute bottom-3 right-3 z-50 w-9 h-9 rounded-full bg-white/70 backdrop-blur-sm border border-gray-200 shadow-sm hover:bg-white hover:shadow-md hover:scale-105 transition-all duration-300 flex items-center justify-center"
                    title="新建岗位"
                  >
                    <Plus className="w-5 h-5 text-[#8E7E6E]" />
                  </button>
                </div>
              ) : (
                <AgendaView tasks={tasks} setTasks={setTasks} />
              )}
            </div>

            {/* 底部区域：仅看板视图显示 */}
            {currentView === 'kanban' && (
              <BottomShelf
                schedules={mockInterviewSchedules}
                resume={mockResumeInfo}
              />
            )}
          </div>

          {/* 右侧 AI 侧边栏 */}
          <AISidebar />
        </div>
      </div>

      {/* Side Drawer */}
      {selectedJob && (
        <SideDrawer
          job={selectedJob}
          onClose={handleCloseDrawer}
          onUpdate={handleUpdateJob}
        />
      )}

    </div>
  );
}