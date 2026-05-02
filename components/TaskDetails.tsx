'use client';

import { useState, useEffect, useCallback } from 'react';
import { X, Pencil, Check, ExternalLink, Loader2 } from 'lucide-react';
import { Task, TaskType } from '@/types';
import { useJobStore } from '@/store/useJobStore';

const TASK_TYPE_OPTIONS: TaskType[] = ['面试', '笔试', '待投递', '待办事项'];

interface TaskDetailsProps {
  taskId?: string | null;
  task?: Task | null;
  onClose: () => void;
  onUpdateTask?: (updated: Task) => void;
  onDeleteTask?: (taskId: string) => void;
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-sm font-bold text-gray-900 mb-2">
      {children}
    </p>
  );
}

export default function TaskDetails({ taskId, task: directTask, onClose, onUpdateTask, onDeleteTask }: TaskDetailsProps) {
  const getTaskById = useJobStore((s) => s.getTaskById);
  const updateTaskAction = useJobStore((s) => s.updateTask);
  const createTaskAction = useJobStore((s) => s.createTask);
  const [isVisible, setIsVisible] = useState(false);

  // 获取当前任务：优先使用传入的 task，否则通过 taskId 在 Store 中查找
  const currentTask = directTask ?? (taskId ? getTaskById(taskId) : null);

  // 动画进入
  useEffect(() => {
    if (currentTask) {
      requestAnimationFrame(() => setIsVisible(true));
    }
  }, [currentTask]);

  const [isEditing, setIsEditing] = useState(!currentTask?.title);
  const [isDirty, setIsDirty] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  // 初始化草稿
  const getInitialDraft = () => ({
    title: currentTask?.title ?? '',
    company: currentTask?.company ?? '',
    date: currentTask?.date ?? '',
    time: currentTask?.time ?? '',
    tag: currentTask?.tag ?? '待办事项' as TaskType,
    round: currentTask?.round ?? '',
    meetingLink: currentTask?.meetingLink ?? '',
    resumeFilename: currentTask?.resumeFilename ?? '',
    isCompleted: currentTask?.isCompleted ?? false,
    notes: currentTask?.notes ?? '',
  });

  const [draft, setDraft] = useState(getInitialDraft);

  // 当任务切换时重置状态
  useEffect(() => {
    setDraft(getInitialDraft());
    setIsEditing(!currentTask?.title);
    setIsDirty(false);
    setSaveStatus('idle');
  }, [currentTask?.id]);

  const saveChanges = useCallback(async () => {
    if (!isDirty || !currentTask) return;
    setSaveStatus('saving');

    const updated: Task = {
      ...currentTask,
      title: draft.title,
      company: draft.company,
      date: draft.date,
      time: draft.time,
      tag: draft.tag,
      round: draft.round || undefined,
      meetingLink: draft.meetingLink || undefined,
      resumeFilename: draft.resumeFilename || undefined,
      notes: draft.notes || undefined,
    };

    if (onUpdateTask) {
      onUpdateTask(updated);
    } else if (currentTask.id.startsWith('new-')) {
      await createTaskAction({
        title: draft.title,
        company: draft.company,
        taskDate: draft.date,
        taskTime: draft.time,
        tag: draft.tag,
        round: draft.round || undefined,
        meetingLink: draft.meetingLink || undefined,
        resumeFilename: draft.resumeFilename || undefined,
        notes: draft.notes || undefined,
      });
    } else {
      await updateTaskAction(currentTask.id, {
        title: draft.title,
        company: draft.company,
        taskDate: draft.date,
        taskTime: draft.time || null,
        tag: draft.tag,
        round: draft.round || null,
        meetingLink: draft.meetingLink || null,
        resumeFilename: draft.resumeFilename || null,
        notes: draft.notes || null,
      });
    }

    setIsDirty(false);
    setSaveStatus('saved');
    setIsEditing(false);
    setTimeout(() => setSaveStatus('idle'), 2000);
  }, [isDirty, draft, currentTask, onUpdateTask, updateTaskAction, createTaskAction]);

  const handleClose = async () => {
    if (isDirty) await saveChanges();
    setIsVisible(false);
    setTimeout(onClose, 300);
  };

  const handleSave = () => {
    saveChanges();
  };

  const handleCancel = () => {
    setDraft(getInitialDraft());
    setIsEditing(false);
    setIsDirty(false);
    setSaveStatus('idle');
  };

  // 如果没有选中任务，不渲染抽屉
  if (!currentTask) {
    return null;
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/25 backdrop-blur-[3px] z-[100] transition-opacity duration-300 ${
          isVisible ? 'opacity-100' : 'opacity-0 invisible pointer-events-none'
        }`}
        onClick={handleClose}
      />

      {/* Bottom Sheet Panel */}
      <div
        className={`fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[1344px] h-[85vh] bg-[#EBE8E1] z-[101]
          flex flex-col shadow-[0_-4px_40px_rgba(0,0,0,0.15)]
          rounded-t-2xl
          transition-transform duration-300 ease-out
          ${isVisible ? 'translate-y-0' : 'translate-y-full invisible pointer-events-none'}`}
      >
        {/* Header */}
        <div className="px-8 pt-6 pb-4 border-b border-[#D8D4CE] flex-shrink-0">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              {isEditing ? (
                <div className="bg-[#E5E1DA] rounded-lg px-4 py-2">
                  <input
                    type="text"
                    value={draft.title}
                    onChange={(e) => { setDraft((p) => ({ ...p, title: e.target.value })); setIsDirty(true); }}
                    className="w-full text-xl font-black text-gray-900 leading-tight tracking-tight bg-transparent
                      focus:outline-none placeholder:text-gray-400"
                    placeholder="任务标题"
                  />
                </div>
              ) : (
                <h2 className="text-3xl font-black text-gray-900 leading-tight tracking-tight truncate">
                  {draft.title || '未命名任务'}
                </h2>
              )}
            </div>

            {/* Save status indicator */}
            <div className="flex items-center gap-2 flex-shrink-0 min-w-[100px] justify-end">
              {saveStatus === 'saving' && (
                <span className="flex items-center gap-1 text-xs text-gray-400 font-medium">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  保存中
                </span>
              )}
              {saveStatus === 'saved' && (
                <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
                  <Check className="w-3 h-3" />
                  已保存
                </span>
              )}
            </div>

            {/* Top-right action buttons */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {isEditing ? (
                <>
                  <button
                    onClick={handleCancel}
                    className="px-4 py-1.5 rounded-full text-sm font-medium text-gray-600 bg-[#E5E1DA]
                      hover:bg-[#DCD9D1] transition-colors"
                  >
                    取消
                  </button>
                  <button
                    onClick={handleSave}
                    className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-semibold text-white bg-gray-900
                      hover:bg-gray-800 transition-colors"
                  >
                    <Check className="w-3.5 h-3.5" />
                    保存
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium text-gray-600 bg-[#E5E1DA]
                    hover:bg-[#DCD9D1] transition-colors"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  编辑
                </button>
              )}
              <button
                onClick={handleClose}
                className="p-1.5 rounded-full text-gray-400 hover:text-gray-700 hover:bg-[#DCD9D1] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Tag Cloud */}
          <div className="flex items-center gap-2 mt-4">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider mr-1">
              任务类型
            </span>
            {TASK_TYPE_OPTIONS.map((t) => {
              const isSelected = draft.tag === t;
              return (
                <button
                  key={t}
                  onClick={() => { if (isEditing) { setDraft((p) => ({ ...p, tag: t })); setIsDirty(true); } }}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                    isEditing ? 'cursor-pointer' : 'cursor-default'
                  } ${
                    isSelected
                      ? 'bg-[#8E7E6E] text-white shadow-sm'
                      : 'bg-white/50 text-gray-500 hover:bg-white/80'
                  }`}
                >
                  {t}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-8 py-6">
          {/* Two-column grid */}
          <div className="grid grid-cols-2 gap-x-8 gap-y-6 mb-8">

            {/* 相关公司 */}
            <div>
              <FieldLabel>相关公司</FieldLabel>
              {isEditing ? (
                <input
                  type="text"
                  value={draft.company}
                  onChange={(e) => { setDraft((p) => ({ ...p, company: e.target.value })); setIsDirty(true); }}
                  className="w-full text-sm text-gray-800 bg-white border border-gray-200 shadow-sm rounded-md
                    focus:outline-none focus:border-gray-400 focus:ring-0 px-3 py-2 transition-colors"
                  placeholder="输入公司名称"
                />
              ) : (
                <p className="text-sm text-gray-700 font-medium">
                  {draft.company || <span className="text-[#999999] italic">未填写</span>}
                </p>
              )}
            </div>

            {/* 任务日期 */}
            <div>
              <FieldLabel>任务日期</FieldLabel>
              {isEditing ? (
                <input
                  type="date"
                  value={draft.date}
                  onChange={(e) => { setDraft((p) => ({ ...p, date: e.target.value })); setIsDirty(true); }}
                  className="w-full text-sm text-gray-800 bg-white border border-gray-200 shadow-sm rounded-md
                    focus:outline-none focus:border-gray-400 focus:ring-0 px-3 py-2 transition-colors"
                />
              ) : (
                <p className="text-sm text-gray-700 font-medium">
                  {draft.date || <span className="text-[#999999] italic">未填写</span>}
                </p>
              )}
            </div>

            {/* 具体时间 */}
            <div>
              <FieldLabel>具体时间</FieldLabel>
              {isEditing ? (
                <input
                  type="time"
                  value={draft.time}
                  onChange={(e) => { setDraft((p) => ({ ...p, time: e.target.value })); setIsDirty(true); }}
                  className="w-full text-sm text-gray-800 bg-white border border-gray-200 shadow-sm rounded-md
                    focus:outline-none focus:border-gray-400 focus:ring-0 px-3 py-2 transition-colors"
                />
              ) : (
                <p className="text-sm text-gray-700 font-medium">
                  {draft.time || <span className="text-[#999999] italic">未设置</span>}
                </p>
              )}
            </div>

            {/* 会议/笔试链接 */}
            <div>
              <FieldLabel>会议/笔试链接</FieldLabel>
              {isEditing ? (
                <input
                  type="url"
                  value={draft.meetingLink}
                  onChange={(e) => { setDraft((p) => ({ ...p, meetingLink: e.target.value })); setIsDirty(true); }}
                  placeholder="https://..."
                  className="w-full text-sm text-gray-800 bg-white border border-gray-200 shadow-sm rounded-md
                    focus:outline-none focus:border-gray-400 focus:ring-0 px-3 py-2 transition-colors"
                />
              ) : (
                <p className="text-sm flex items-center gap-2">
                  {draft.meetingLink ? (
                    <>
                      <span className="text-[#8B735B] underline underline-offset-2 decoration-1">{draft.meetingLink}</span>
                      <a
                        href={draft.meetingLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#8E7E6E] hover:opacity-70 transition-opacity"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </>
                  ) : (
                    <span className="text-[#999999] italic">未填写</span>
                  )}
                </p>
              )}
            </div>

            {/* 当前轮次 */}
            <div>
              <FieldLabel>当前轮次</FieldLabel>
              {isEditing ? (
                <input
                  type="text"
                  value={draft.round}
                  onChange={(e) => { setDraft((p) => ({ ...p, round: e.target.value })); setIsDirty(true); }}
                  placeholder="例如：技术二面"
                  className="w-full text-sm text-gray-800 bg-white border border-gray-200 shadow-sm rounded-md
                    focus:outline-none focus:border-gray-400 focus:ring-0 px-3 py-2 transition-colors"
                />
              ) : (
                <p className="text-sm text-gray-700 font-medium">
                  {draft.round || <span className="text-[#999999]">—</span>}
                </p>
              )}
            </div>

            {/* 使用的简历 */}
            <div>
              <FieldLabel>使用的简历</FieldLabel>
              {isEditing ? (
                <input
                  type="text"
                  value={draft.resumeFilename}
                  onChange={(e) => { setDraft((p) => ({ ...p, resumeFilename: e.target.value })); setIsDirty(true); }}
                  placeholder="简历文件名"
                  className="w-full text-sm text-gray-800 bg-white border border-gray-200 shadow-sm rounded-md
                    focus:outline-none focus:border-gray-400 focus:ring-0 px-3 py-2 transition-colors"
                />
              ) : (
                <p className="text-sm text-gray-700 font-medium">
                  {draft.resumeFilename || <span className="text-[#999999] italic">未设置</span>}
                </p>
              )}
            </div>

          </div>

          {/* Bottom notes area */}
          <div className="flex flex-col gap-3">
            <FieldLabel>详情 / 笔记</FieldLabel>
            {isEditing ? (
              <textarea
                value={draft.notes}
                onChange={(e) => { setDraft((p) => ({ ...p, notes: e.target.value })); setIsDirty(true); }}
                placeholder="记录待办详情、注意事项、复习要点..."
                rows={16}
                className="w-full resize-none text-sm text-gray-700 bg-white border border-gray-200 shadow-sm rounded-md
                  focus:outline-none focus:border-gray-400 focus:ring-0 px-3 py-2.5 leading-relaxed
                  placeholder:text-[#999999] transition-colors"
              />
            ) : (
              <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">
                {draft.notes || (
                  <span className="text-[#999999] italic">暂无详情</span>
                )}
              </p>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
