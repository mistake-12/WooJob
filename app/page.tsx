'use client';

import { useEffect, useState, useRef } from 'react';
import { DragDropContext, DropResult } from '@hello-pangea/dnd';
import confetti from 'canvas-confetti';
import { JobStage } from '@/types';
import { useJobStore } from '@/store/useJobStore';
import KanbanColumn from '@/components/KanbanColumn';
import BottomShelf from '@/components/BottomShelf';
import AISidebar from '@/components/AISidebar';
import AgendaView from '@/components/AgendaView';
import SideDrawer from '@/components/SideDrawer';
import TaskDetails from '@/components/TaskDetails';
import { Briefcase, Plus, Trash2, Github } from 'lucide-react';
import TrashDrawer from '@/components/TrashDrawer';
import { getProfile, updateProfile } from '@/app/actions/profile';
import { signOutAction } from '@/app/actions/profile';

const stages: JobStage[] = ['待投递', '已投递', '笔试中', '面试中', 'Offer', '已结束'];

export default function Home() {
  const jobs = useJobStore((s) => s.jobs);
  const trashedJobs = useJobStore((s) => s.trashedJobs);
  const updateJobStage = useJobStore((s) => s.updateJobStage);
  const createJob = useJobStore((s) => s.createJob);
  const updateJob = useJobStore((s) => s.updateJob);
  const trashJob = useJobStore((s) => s.trashJob);
  const restoreJob = useJobStore((s) => s.restoreJob);
  const fetchJobs = useJobStore((s) => s.fetchJobs);
  const fetchTrashedJobs = useJobStore((s) => s.fetchTrashedJobs);
  const fetchTasks = useJobStore((s) => s.fetchTasks);
  const getJobById = useJobStore((s) => s.getJobById);
  const [currentView, setCurrentView] = useState<'kanban' | 'agenda'>('kanban');
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [isShaking, setIsShaking] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [isTrashOpen, setIsTrashOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  // 个人中心下拉与弹窗状态
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [profileNickname, setProfileNickname] = useState('');
  const [profileTargetRole, setProfileTargetRole] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileSaveMsg, setProfileSaveMsg] = useState('');
  const profileMenuRef = useRef<HTMLDivElement>(null);

  // Header 显示用的昵称（用于右上角头像和用户名）
  const [displayNickname, setDisplayNickname] = useState('');

  // 弹窗打开时加载 profile 数据
  useEffect(() => {
    if (!isProfileModalOpen) return;
    setProfileSaveMsg('');
    getProfile().then((result) => {
      if (result.profile) {
        setProfileNickname(result.profile.nickname ?? '');
        setProfileTargetRole(result.profile.target_role ?? '');
      }
    });
  }, [isProfileModalOpen]);

  // 初始化时加载 profile 数据（用于 Header 显示）
  useEffect(() => {
    getProfile().then((result) => {
      if (result.profile?.nickname) {
        setDisplayNickname(result.profile.nickname);
      }
    });
  }, []);

  async function handleSaveProfile() {
    setIsSavingProfile(true);
    setProfileSaveMsg('');
    const result = await updateProfile({
      nickname: profileNickname || null,
      target_role: profileTargetRole || null,
    });
    setIsSavingProfile(false);
    if (result.error) {
      setProfileSaveMsg(`保存失败：${result.error}`);
    } else {
      setProfileSaveMsg('保存成功');
      // 保存成功后同步 Header 显示的昵称
      setDisplayNickname(profileNickname || '');
      setTimeout(() => {
        setIsProfileModalOpen(false);
        setProfileSaveMsg('');
      }, 1200);
    }
  }

  // 点击头像区域外部关闭下拉菜单
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    }
    if (isProfileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isProfileMenuOpen]);

  // 初始化：加载数据
  useEffect(() => {
    fetchJobs();
    fetchTrashedJobs();
    fetchTasks();
  }, [fetchJobs, fetchTrashedJobs, fetchTasks]);

  const jobsByStage = stages.reduce((acc, stage) => {
    acc[stage] = jobs.filter((job) => job.stage === stage);
    return acc;
  }, {} as Record<JobStage, typeof jobs>);

  const totalJobs = jobs.length;

  function onDragEnd(result: DropResult) {
    const { source, destination, draggableId } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    if (destination.droppableId === 'Offer' && source.droppableId !== 'Offer') {
      setIsShaking(true);
      setShowCelebration(true);
      setTimeout(() => {
        setIsShaking(false);
        setShowCelebration(false);
      }, 1800);

      confetti({
        particleCount: 225,
        spread: 150,
        origin: { y: 0.6 },
        colors: ['#8E7E6E', '#C5A059', '#EBE8E1', '#FFFFFF'],
      });
    }

    const newStage = destination.droppableId as JobStage;
    updateJobStage(draggableId, newStage);
  }

  function handleOpenJob(job: { id: string }) {
    setSelectedJobId(job.id);
  }

  function handleCloseDrawer() {
    setSelectedJobId(null);
  }

  function handleAddJob(stage?: JobStage) {
    const emptyId = `new-${Date.now()}`;
    setSelectedJobId(emptyId);
  }

  function handleUpdateJob(id: string, updated: Partial<ReturnType<typeof useJobStore.getState>['jobs'][number]> & { tags?: Record<string, unknown> }) {
    if (id.startsWith('new-')) {
      createJob({
        company: (updated.company as string) || '',
        title: (updated.title as string) || '',
        stage: (updated.stage as JobStage) || '待投递',
        deadline: (updated.deadline as string) || undefined,
        keyTime: (updated as { time?: string }).time,
        website: updated.website as string | undefined,
        description: updated.description as string | undefined,
        tags: {
          referral: (updated.tags?.referral as '有' | '无' | '学长') ?? undefined,
          round: (updated.tags?.round as string) ?? undefined,
          interviewTime: (updated.tags?.interviewTime as string) ?? undefined,
        },
      });
      setSelectedJobId(null);
    } else {
      updateJob(id, {
        company: updated.company as string | undefined,
        title: updated.title as string | undefined,
        stage: updated.stage as JobStage | undefined,
        deadline: (updated.deadline as string) || null,
        keyTime: (updated as { time?: string }).time || null,
        website: updated.website as string | null,
        description: updated.description as string | null,
        notes: updated.notes as string | null,
        tags: {
          referral: (updated.tags?.referral as '有' | '无' | '学长') ?? null,
          round: (updated.tags?.round as string) ?? null,
          interviewTime: (updated.tags?.interviewTime as string) ?? null,
        },
      });
    }
  }

  return (
    <div className="h-screen w-screen overflow-hidden flex items-center justify-center bg-[#D1CFCA]">
      {/* 应用主窗口 */}
      <div className={`w-full max-w-[95vw] h-[95vh] bg-[#EBE8E3] rounded-2xl shadow-xl border border-gray-200 flex flex-col overflow-hidden ${isShaking ? 'animate-offer-shake' : ''}`}>
        {/* 顶部 Header */}
        <div className="relative px-8 pt-7 pb-5 border-b border-[#CFCCC8] flex-shrink-0">
          <div className="flex items-end justify-between">
            {/* 左侧：Logo */}
            <div className="flex items-end">
              <h1 className="text-6xl font-black text-gray-900 tracking-tighter italic leading-none">
                WooJob!!!
              </h1>
              <p className="text-[14px] italic text-[#8B735B] uppercase tracking-[0.3em] leading-none ml-2 mb-1">
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
              <button
                onClick={() => {
                  fetchTrashedJobs();
                  setIsTrashOpen(true);
                }}
                className="cursor-pointer border border-transparent hover:border-gray-200 hover:bg-gray-50 hover:shadow-sm transition-all duration-200 rounded-lg p-2 -m-2"
              >
                <div className="flex items-center gap-3">
                  <Trash2 className="w-5 h-5 text-[#8B735B]" />
                  <div className="flex flex-col items-start">
                    <p className="text-xs font-medium text-[#8B735B] leading-none">回收站</p>
                    <p className="text-2xl font-bold text-gray-900 leading-none tracking-tight">{trashedJobs.length}</p>
                  </div>
                </div>
              </button>

              <div className="flex items-center gap-3">
                <Briefcase className="w-5 h-5 text-[#8B735B]" />
                <div className="flex flex-col items-start">
                  <p className="text-xs font-medium text-[#8B735B] leading-none">在投岗位</p>
                  <p className="text-2xl font-bold text-gray-900 leading-none tracking-tight">{totalJobs}</p>
                </div>
              </div>

              <a
                href="https://github.com/mistake-12/WooJob"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 cursor-pointer border border-transparent hover:border-gray-200 hover:bg-gray-50 hover:shadow-sm transition-all duration-200 rounded-lg p-2 -m-2"
              >
                <Github className="w-5 h-5 text-[#8B735B]" />
                <div className="flex flex-col items-start">
                  <p className="text-xs font-medium text-[#8B735B] leading-none">GitHub</p>
                  <p className="text-2xl font-bold text-gray-900 leading-none tracking-tight">项目地址</p>
                </div>
              </a>

              {/* 用户头像入口 */}
              <div className="relative -m-2" ref={profileMenuRef}>
                <button
                  onClick={() => setIsProfileMenuOpen((v) => !v)}
                  className="flex items-center gap-3 cursor-pointer border border-transparent hover:border-gray-200 hover:bg-gray-50 hover:shadow-sm transition-all duration-200 rounded-lg p-2"
                  title="个人中心"
                >
                  <div className="w-5 h-5 rounded-full bg-[#8E7E6E] text-white flex items-center justify-center text-xs font-bold shadow-sm">
                    {displayNickname ? displayNickname.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <div className="flex flex-col items-start">
                    <p className="text-xs font-medium text-[#8B735B] leading-none">用户</p>
                    <p className="text-2xl font-bold text-gray-900 leading-none tracking-tight">{displayNickname || '用户'}</p>
                  </div>
                </button>

                {/* 下拉菜单 */}
                {isProfileMenuOpen && (
                  <div className="absolute right-0 top-12 z-50 w-36 bg-[#F4F3EE] border border-[#E0DCD1] shadow-md py-1 flex flex-col">
                    <button
                      onClick={() => {
                        setIsProfileMenuOpen(false);
                        setIsProfileModalOpen(true);
                      }}
                      className="px-4 py-2 text-sm text-[#111111] hover:bg-[#E0DCD1] cursor-pointer flex items-center gap-2 text-left transition-colors"
                    >
                      <svg className="w-4 h-4 text-[#8B735B]" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                      </svg>
                      个人设置
                    </button>
                    <button
                      onClick={() => {
                        setIsProfileMenuOpen(false);
                        signOutAction();
                      }}
                      className="px-4 py-2 text-sm text-[#111111] hover:bg-[#E0DCD1] cursor-pointer flex items-center gap-2 text-left transition-colors"
                    >
                      <svg className="w-4 h-4 text-[#8B735B]" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M3 4.25A2.25 2.25 0 015.25 2h5.5A2.25 2.25 0 0113 4.25v2a.75.75 0 01-1.5 0v-2a.75.75 0 00-.75-.75h-5.5a.75.75 0 00-.75.75v11.5c0 .414.336.75.75.75h5.5a.75.75 0 00.75-.75v-2a.75.75 0 011.5 0v2A2.25 2.25 0 0110.75 18h-5.5A2.25 2.25 0 013 15.75V4.25z" clipRule="evenodd" />
                        <path fillRule="evenodd" d="M19 10a.75.75 0 00-.75-.75H8.704l1.048-1.08a.75.75 0 10-1.004-1.114l-2.5 2.25a.75.75 0 000 1.114l2.5 2.25a.75.75 0 001.004-1.114L8.704 10.75H18.25A.75.75 0 0019 10z" clipRule="evenodd" />
                      </svg>
                      退出登录
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 左侧内容区 + 右侧 AI 侧边栏 */}
        <div className="flex flex-1 min-h-0 overflow-hidden">
          <div className="flex-1 flex flex-col px-8 pb-8 overflow-hidden">
            {/* 中间内容容器：占满剩余高度 */}
            <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
              {currentView === 'kanban' ? (
                <div className="relative flex-1 min-h-0 flex flex-col overflow-hidden">
                  <DragDropContext onDragEnd={onDragEnd}>
                    <div className="flex gap-0 flex-1 min-h-0 overflow-x-auto overflow-y-hidden items-stretch">
                      {stages.map((stage) => (
                        <KanbanColumn
                          key={stage}
                          title={stage}
                          jobs={jobsByStage[stage]}
                          onOpenJob={handleOpenJob}
                          onAddJob={handleAddJob}
                          onTrashJob={(job) => trashJob(job.id)}
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
                <AgendaView />
              )}
            </div>

            {/* 底部区域：仅看板视图显示 */}
            {currentView === 'kanban' && (
              <BottomShelf onTaskClick={(id) => setSelectedTaskId(id)} />
            )}
          </div>

          {/* 右侧 AI 侧边栏 */}
          <AISidebar />
        </div>
      </div>

      {/* Offer 达成庆典文字 */}
      {showCelebration && (
        <div
          className="fixed inset-0 flex items-center justify-center pointer-events-none z-50"
          style={{ animation: 'celebration-fade 1.8s ease-out both' }}
        >
          <span
            className="text-[42px] font-black text-[#8E7E6E] tracking-[0.35em] leading-none select-none"
            style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
          >
            Congratulations!
          </span>
        </div>
      )}

      {/* Side Drawer */}
      {selectedJobId && (
        <SideDrawer
          jobId={selectedJobId}
          onClose={handleCloseDrawer}
          onUpdate={handleUpdateJob}
        />
      )}

      {/* Trash Drawer */}
      <TrashDrawer
        isOpen={isTrashOpen}
        onClose={() => setIsTrashOpen(false)}
      />

      {/* Task Details Drawer */}
      {selectedTaskId && (
        <TaskDetails
          taskId={selectedTaskId}
          onClose={() => setSelectedTaskId(null)}
        />
      )}

      {/* 个人设置弹窗 */}
      {isProfileModalOpen && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[100] flex items-center justify-center"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsProfileModalOpen(false);
          }}
        >
          <div className="bg-white w-[420px] rounded-xl shadow-xl p-8 relative">
            {/* 关闭按钮 */}
            <button
              onClick={() => setIsProfileModalOpen(false)}
              className="absolute top-6 right-6 text-[#999] hover:text-[#111] transition-colors cursor-pointer"
            >
              <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
              </svg>
            </button>

            {/* 标题 */}
            <h2 className="text-xl font-bold text-[#111] mb-8">个人设置</h2>

            {/* 表单 */}
            <div className="flex flex-col gap-6">
              {/* 昵称 */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-[#8B735B] uppercase tracking-widest">用户昵称</label>
                <input
                  type="text"
                  value={profileNickname}
                  onChange={(e) => setProfileNickname(e.target.value)}
                  placeholder="给自己起个名字吧"
                  className="w-full bg-[#F9F8F6] border-b border-[#D1CFCA] focus:border-[#8B735B] px-3 py-2 text-sm text-[#111] placeholder-[#C5C0BA] outline-none transition-colors rounded-t-sm"
                />
              </div>

              {/* 目标岗位 */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-[#8B735B] uppercase tracking-widest">目标岗位</label>
                <input
                  type="text"
                  value={profileTargetRole}
                  onChange={(e) => setProfileTargetRole(e.target.value)}
                  placeholder="如：高级产品经理 / 前端工程师"
                  className="w-full bg-[#F9F8F6] border-b border-[#D1CFCA] focus:border-[#8B735B] px-3 py-2 text-sm text-[#111] placeholder-[#C5C0BA] outline-none transition-colors rounded-t-sm"
                />
              </div>

              {/* 提示文字 */}
              {profileSaveMsg && (
                <p className={`text-xs text-center ${profileSaveMsg.includes('失败') ? 'text-red-500' : 'text-[#8B735B]'}`}>
                  {profileSaveMsg}
                </p>
              )}

              {/* 保存按钮 */}
              <button
                onClick={handleSaveProfile}
                disabled={isSavingProfile}
                className="mt-2 w-full py-2.5 bg-[#8B735B] hover:bg-[#7A654D] disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
              >
                {isSavingProfile ? '保存中...' : '保存设置'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
