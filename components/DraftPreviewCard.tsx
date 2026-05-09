'use client';

import { useState, useCallback } from 'react';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { useJobStore } from '@/store/useJobStore';
import type { AIParsedData, CreateJobInput, CreateTaskInput } from '@/types/database';
import type { JobStage, TaskType } from '@/types';

interface DraftPreviewCardProps {
  parsedData: AIParsedData;
  /** 确认成功后调用，可选 */
  onConfirm?: () => void;
}

type ConfirmState = 'idle' | 'confirming' | 'confirmed' | 'error';

export default function DraftPreviewCard({ parsedData, onConfirm }: DraftPreviewCardProps) {
  const createJob = useJobStore((s) => s.createJob);
  const createTask = useJobStore((s) => s.createTask);
  const [confirmState, setConfirmState] = useState<ConfirmState>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [timeError, setTimeError] = useState(false);

  // 岗位表单状态
  const [jobDraft, setJobDraft] = useState<CreateJobInput>(() => {
    if (parsedData.type === 'job' && parsedData.job) {
      return {
        company: parsedData.job.company ?? '',
        title: parsedData.job.title ?? '',
        stage: parsedData.job.stage ?? '待投递',
        deadline: parsedData.job.deadline ?? undefined,
        keyTime: parsedData.job.keyTime ?? undefined,
        website: parsedData.job.website ?? undefined,
        description: parsedData.job.description ?? undefined,
        tags: {
          referral: parsedData.job.tags?.referral,
          round: parsedData.job.tags?.round,
          interviewTime: parsedData.job.tags?.interviewTime,
        },
      };
    }
    return {
      company: '',
      title: '',
      stage: '待投递',
    };
  });

  // 任务表单状态
  const [taskDraft, setTaskDraft] = useState<CreateTaskInput>(() => {
    if (parsedData.type === 'task' && parsedData.task) {
      return {
        title: parsedData.task.title ?? '',
        company: parsedData.task.company ?? undefined,
        taskDate: parsedData.task.taskDate ?? new Date().toISOString().split('T')[0],
        taskTime: parsedData.task.taskTime ?? undefined,
        tag: parsedData.task.tag ?? '待办事项',
        round: parsedData.task.round ?? undefined,
        meetingLink: parsedData.task.meetingLink ?? undefined,
        notes: parsedData.task.notes ?? undefined,
      };
    }
    return {
      title: '',
      taskDate: new Date().toISOString().split('T')[0],
      tag: '待办事项',
    };
  });

  const handleConfirm = useCallback(async () => {
    setErrorMsg(null);

    // 任务类型需要校验时间
    if (parsedData.type === 'task' && !taskDraft.taskTime) {
      setTimeError(true);
      setErrorMsg('请填写时间后再创建任务');
      return;
    }

    setConfirmState('confirming');

    try {
      if (parsedData.type === 'job') {
        const result = await createJob(jobDraft);
        if (result) {
          setConfirmState('confirmed');
        } else {
          setConfirmState('error');
          setErrorMsg('创建岗位失败，请稍后重试');
        }
      } else if (parsedData.type === 'task') {
        const result = await createTask(taskDraft);
        if (result) {
          setConfirmState('confirmed');
        } else {
          setConfirmState('error');
          setErrorMsg('创建任务失败，请稍后重试');
        }
      }
      onConfirm?.();
    } catch {
      setConfirmState('error');
      setErrorMsg('发生错误，请稍后重试');
    }
  }, [parsedData, jobDraft, taskDraft, createJob, createTask, onConfirm]);

  if (parsedData.type === 'job') {
    return (
      <JobDraftCard
        draft={jobDraft}
        onChange={setJobDraft}
        confirmState={confirmState}
        errorMsg={errorMsg}
        onConfirm={handleConfirm}
      />
    );
  }

  if (parsedData.type === 'task') {
    return (
      <TaskDraftCard
        draft={taskDraft}
        onChange={(newDraft) => {
          setTaskDraft(newDraft);
          // 用户输入时间后清除错误
          if (newDraft.taskTime) {
            setTimeError(false);
          }
        }}
        confirmState={confirmState}
        errorMsg={errorMsg}
        timeError={timeError}
        onConfirm={handleConfirm}
      />
    );
  }

  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// 岗位草稿卡片
// ─────────────────────────────────────────────────────────────────────────────

interface JobDraftCardProps {
  draft: CreateJobInput;
  onChange: (draft: CreateJobInput) => void;
  confirmState: ConfirmState;
  errorMsg: string | null;
  onConfirm: () => void;
}

function JobDraftCard({ draft, onChange, confirmState, errorMsg, onConfirm }: JobDraftCardProps) {
  const stages: JobStage[] = ['待投递', '已投递', '笔试中', '面试中', 'Offer', '已结束'];
  const referralOptions: Array<'有' | '无' | '学长'> = ['有', '无', '学长'];

  return (
    <div className="bg-white rounded-lg border border-[#E0DCD1] shadow-sm overflow-hidden">
      {/* 卡片头部 */}
      <div className="px-4 py-3 bg-gradient-to-r from-[#8E7E6E] to-[#9D8E7F]">
        <h4 className="text-sm font-bold text-white">岗位信息预览</h4>
        <p className="text-xs text-white/70 mt-0.5">请核对信息，可直接修改后确认</p>
      </div>

      {/* 卡片内容 */}
      <div className="p-4 space-y-3">
        {/* 公司 + 岗位名（必填） */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-[#8B735B] mb-1">公司名称</label>
            <input
              type="text"
              value={draft.company}
              onChange={(e) => onChange({ ...draft, company: e.target.value })}
              placeholder="输入公司名称"
              className="w-full px-3 py-1.5 text-sm bg-[#F9F8F6] border border-[#E0DCD1] rounded focus:outline-none focus:border-[#8E7E6E] transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#8B735B] mb-1">岗位名称</label>
            <input
              type="text"
              value={draft.title}
              onChange={(e) => onChange({ ...draft, title: e.target.value })}
              placeholder="输入岗位名称"
              className="w-full px-3 py-1.5 text-sm bg-[#F9F8F6] border border-[#E0DCD1] rounded focus:outline-none focus:border-[#8E7E6E] transition-colors"
            />
          </div>
        </div>

        {/* 阶段选择 */}
        <div>
          <label className="block text-xs font-medium text-[#8B735B] mb-1">当前阶段</label>
          <div className="flex flex-wrap gap-1">
            {stages.map((s) => (
              <button
                key={s}
                onClick={() => onChange({ ...draft, stage: s })}
                className={`px-2 py-1 text-xs rounded transition-colors ${
                  draft.stage === s
                    ? 'bg-[#8E7E6E] text-white'
                    : 'bg-[#F0EDE8] text-[#666666] hover:bg-[#E8E5E0]'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* 内推 + 截止日期 */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-[#8B735B] mb-1">内推情况</label>
            <select
              value={draft.tags?.referral ?? ''}
              onChange={(e) =>
                onChange({
                  ...draft,
                  tags: { ...draft.tags, referral: e.target.value as '有' | '无' | '学长' | undefined },
                })
              }
              className="w-full px-3 py-1.5 text-sm bg-[#F9F8F6] border border-[#E0DCD1] rounded focus:outline-none focus:border-[#8E7E6E] transition-colors"
            >
              <option value="">未知</option>
              {referralOptions.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-[#8B735B] mb-1">截止日期</label>
            <input
              type="date"
              value={draft.deadline ?? ''}
              onChange={(e) => onChange({ ...draft, deadline: e.target.value || undefined })}
              className="w-full px-3 py-1.5 text-sm bg-[#F9F8F6] border border-[#E0DCD1] rounded focus:outline-none focus:border-[#8E7E6E] transition-colors"
            />
          </div>
        </div>

        {/* 官网链接 */}
        <div>
          <label className="block text-xs font-medium text-[#8B735B] mb-1">官网链接</label>
          <input
            type="url"
            value={draft.website ?? ''}
            onChange={(e) => onChange({ ...draft, website: e.target.value || undefined })}
            placeholder="https://..."
            className="w-full px-3 py-1.5 text-sm bg-[#F9F8F6] border border-[#E0DCD1] rounded focus:outline-none focus:border-[#8E7E6E] transition-colors"
          />
        </div>

        {/* 错误提示 */}
        {errorMsg && (
          <p className="text-xs text-red-500">{errorMsg}</p>
        )}
      </div>

      {/* 确认按钮 */}
      <div className="px-4 pb-4">
        <button
          onClick={onConfirm}
          disabled={confirmState === 'confirming' || confirmState === 'confirmed' || !draft.company || !draft.title}
          className={`w-full py-2 rounded-md text-sm font-medium transition-all flex items-center justify-center gap-2 ${
            confirmState === 'confirmed'
              ? 'bg-green-500 text-white'
              : confirmState === 'confirming'
                ? 'bg-[#8E7E6E]/70 text-white cursor-wait'
                : 'bg-[#8E7E6E] hover:bg-[#7A6E5F] text-white disabled:opacity-50 disabled:cursor-not-allowed'
          }`}
        >
          {confirmState === 'confirming' && <Loader2 className="w-4 h-4 animate-spin" />}
          {confirmState === 'confirmed' && <CheckCircle2 className="w-4 h-4" />}
          {confirmState === 'confirmed' ? '已入库' : confirmState === 'confirming' ? '创建中...' : '确认并一键建档'}
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 任务草稿卡片
// ─────────────────────────────────────────────────────────────────────────────

interface TaskDraftCardProps {
  draft: CreateTaskInput;
  onChange: (draft: CreateTaskInput) => void;
  confirmState: ConfirmState;
  errorMsg: string | null;
  timeError: boolean;
  onConfirm: () => void;
}

function TaskDraftCard({ draft, onChange, confirmState, errorMsg, timeError, onConfirm }: TaskDraftCardProps) {
  const tagOptions: TaskType[] = ['面试', '笔试', '待投递', '待办事项'];

  return (
    <div className="bg-white rounded-lg border border-[#E0DCD1] shadow-sm overflow-hidden">
      {/* 卡片头部 */}
      <div className="px-4 py-3 bg-gradient-to-r from-[#8B735B] to-[#9D8B6F]">
        <h4 className="text-sm font-bold text-white">日程信息预览</h4>
        <p className="text-xs text-white/70 mt-0.5">请核对信息，可直接修改后确认</p>
      </div>

      {/* 卡片内容 */}
      <div className="p-4 space-y-3">
        {/* 任务标题（必填） */}
        <div>
          <label className="block text-xs font-medium text-[#8B735B] mb-1">任务标题 <span className="text-red-400">*</span></label>
          <input
            type="text"
            value={draft.title}
            onChange={(e) => onChange({ ...draft, title: e.target.value })}
            placeholder="如：腾讯 - 产品经理 - 笔试"
            className="w-full px-3 py-1.5 text-sm bg-[#F9F8F6] border border-[#E0DCD1] rounded focus:outline-none focus:border-[#8E7E6E] transition-colors"
          />
        </div>

        {/* 类型 + 公司 */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-[#8B735B] mb-1">类型</label>
            <div className="flex flex-wrap gap-1">
              {tagOptions.map((t) => (
                <button
                  key={t}
                  onClick={() => onChange({ ...draft, tag: t })}
                  className={`px-2 py-1 text-xs rounded transition-colors ${
                    draft.tag === t
                      ? 'bg-[#8B735B] text-white'
                      : 'bg-[#F0EDE8] text-[#666666] hover:bg-[#E8E5E0]'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-[#8B735B] mb-1">关联公司</label>
            <input
              type="text"
              value={draft.company ?? ''}
              onChange={(e) => onChange({ ...draft, company: e.target.value || undefined })}
              placeholder="关联公司（可选）"
              className="w-full px-3 py-1.5 text-sm bg-[#F9F8F6] border border-[#E0DCD1] rounded focus:outline-none focus:border-[#8E7E6E] transition-colors"
            />
          </div>
        </div>

        {/* 日期 + 时间 */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-[#8B735B] mb-1">日期</label>
            <input
              type="date"
              value={draft.taskDate}
              onChange={(e) => onChange({ ...draft, taskDate: e.target.value })}
              className="w-full px-3 py-1.5 text-sm bg-[#F9F8F6] border border-[#E0DCD1] rounded focus:outline-none focus:border-[#8E7E6E] transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#8B735B] mb-1">时间 <span className="text-red-400">*</span></label>
            <div>
              <input
                type="time"
                value={draft.taskTime ?? ''}
                onChange={(e) => onChange({ ...draft, taskTime: e.target.value || undefined })}
                className={`w-full px-3 py-1.5 text-sm bg-[#F9F8F6] border rounded focus:outline-none transition-colors ${
                  timeError
                    ? 'border-red-400 focus:border-red-500'
                    : 'border-[#E0DCD1] focus:border-[#8E7E6E]'
                }`}
              />
              {timeError && (
                <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1">
                  <span className="inline-block w-1 h-1 bg-red-400 rounded-full" />
                  请填写时间
                </p>
              )}
            </div>
          </div>
        </div>

        {/* 轮次 */}
        <div>
          <label className="block text-xs font-medium text-[#8B735B] mb-1">面试/笔试轮次</label>
          <input
            type="text"
            value={draft.round ?? ''}
            onChange={(e) => onChange({ ...draft, round: e.target.value || undefined })}
            placeholder="如：技术一面（可选）"
            className="w-full px-3 py-1.5 text-sm bg-[#F9F8F6] border border-[#E0DCD1] rounded focus:outline-none focus:border-[#8E7E6E] transition-colors"
          />
        </div>

        {/* 会议链接 */}
        <div>
          <label className="block text-xs font-medium text-[#8B735B] mb-1">会议链接</label>
          <input
            type="url"
            value={draft.meetingLink ?? ''}
            onChange={(e) => onChange({ ...draft, meetingLink: e.target.value || undefined })}
            placeholder="https://meeting..." className="w-full px-3 py-1.5 text-sm bg-[#F9F8F6] border border-[#E0DCD1] rounded focus:outline-none focus:border-[#8E7E6E] transition-colors"
          />
        </div>

        {/* 错误提示 */}
        {errorMsg && (
          <p className="text-xs text-red-500">{errorMsg}</p>
        )}
      </div>

      {/* 确认按钮 */}
      <div className="px-4 pb-4">
        <button
          onClick={onConfirm}
          disabled={confirmState === 'confirming' || confirmState === 'confirmed' || !draft.title}
          className={`w-full py-2 rounded-md text-sm font-medium transition-all flex items-center justify-center gap-2 ${
            confirmState === 'confirmed'
              ? 'bg-green-500 text-white'
              : confirmState === 'confirming'
                ? 'bg-[#8B735B]/70 text-white cursor-wait'
                : 'bg-[#8B735B] hover:bg-[#7A654D] text-white disabled:opacity-50 disabled:cursor-not-allowed'
          }`}
        >
          {confirmState === 'confirming' && <Loader2 className="w-4 h-4 animate-spin" />}
          {confirmState === 'confirmed' && <CheckCircle2 className="w-4 h-4" />}
          {confirmState === 'confirmed' ? '已入库' : confirmState === 'confirming' ? '创建中...' : '确认并一键建档'}
        </button>
      </div>
    </div>
  );
}
