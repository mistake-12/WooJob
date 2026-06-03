'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  X, Pencil, Check, ChevronDown,
  Calendar, Clock, User, Tag, Link, Loader2
} from 'lucide-react';
import { Job, JobStage } from '@/types';
import { useJobStore } from '@/store/useJobStore';

type Tab = 'details' | 'assets' | 'notes';

interface SideDrawerProps {
  jobId: string;
  onClose: () => void;
  onUpdate: (id: string, updated: Partial<Job>) => void;
}

const STAGES: JobStage[] = ['待投递', '已投递', '笔试中', '面试中', 'Offer', '已结束'];

const REFERRAL_OPTIONS = ['有', '无', '学长'] as const;

const INTERVIEW_ROUNDS = ['初面', '技术二面', '业务终面', 'HR面'] as const;

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-sm font-bold text-gray-900 mb-2">
      {children}
    </p>
  );
}

export default function SideDrawer({ jobId, onClose, onUpdate }: SideDrawerProps) {
  const getJobById = useJobStore((s) => s.getJobById);
  const job = getJobById(jobId);
  const isNewJob = jobId.startsWith('new-');

  const [activeTab, setActiveTab] = useState<Tab>('details');
  const [isEditing, setIsEditing] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  /* 编辑状态的本地副本 — 新建岗位时使用空值 */
  const [draft, setDraft] = useState({
    company: '',
    title: '',
    deadline: '',
    time: '',
    stage: '待投递' as JobStage,
    referral: '' as '' | typeof REFERRAL_OPTIONS[number],
    round: '',
    interviewTime: '',
    website: '',
    description: '',
    notes: '',
  });

  useEffect(() => {
    requestAnimationFrame(() => setIsVisible(true));
  }, []);

  /* 同步外部 job 变化（切换卡片时重置）；新建空岗位时强制进入编辑模式 */
  useEffect(() => {
    if (job && !isNewJob) {
      setDraft({
        company: job.company,
        title: job.title,
        deadline: job.deadline,
        time: job.time ?? '',
        stage: job.stage,
        referral: job.tags.referral ?? ('' as '' | typeof REFERRAL_OPTIONS[number]),
        round: job.tags.round ?? '',
        interviewTime: job.tags.interviewTime ?? '',
        website: job.website ?? '',
        description: job.description ?? '',
        notes: job.notes ?? '',
      });
      setIsEditing(false);
    } else {
      setIsEditing(true);
    }
    setIsDirty(false);
    setSaveStatus('idle');
  }, [jobId, job, isNewJob]);

  const saveChanges = useCallback(async () => {
    if (!isDirty) return;
    setSaveStatus('saving');
    onUpdate(jobId, {
      company: draft.company,
      title: draft.title,
      deadline: draft.deadline,
      time: draft.time || undefined,
      stage: draft.stage,
      tags: {
        referral: draft.referral || undefined,
        round: draft.round || undefined,
        interviewTime: draft.interviewTime || undefined,
      },
      website: draft.website || undefined,
      description: draft.description || undefined,
      notes: draft.notes || undefined,
    });
    setIsDirty(false);
    setSaveStatus('saved');
    setIsEditing(false);
    setTimeout(() => setSaveStatus('idle'), 2000);
  }, [isDirty, draft, jobId, onUpdate]);

  const handleClose = async () => {
    if (isDirty) await saveChanges();
    setIsVisible(false);
    setTimeout(onClose, 300);
  };

  const handleSave = () => {
    saveChanges();
  };

  const handleCancel = () => {
    if (job && !isNewJob) {
      setDraft({
        company: job.company,
        title: job.title,
        deadline: job.deadline,
        time: job.time ?? '',
        stage: job.stage,
        referral: job.tags.referral ?? ('' as '' | typeof REFERRAL_OPTIONS[number]),
        round: job.tags.round ?? '',
        interviewTime: job.tags.interviewTime ?? '',
        website: job.website ?? '',
        description: job.description ?? '',
        notes: job.notes ?? '',
      });
    } else {
      setDraft({
        company: '',
        title: '',
        deadline: '',
        time: '',
        stage: '待投递',
        referral: '',
        round: '',
        interviewTime: '',
        website: '',
        description: '',
        notes: '',
      });
    }
    setIsEditing(false);
    setIsDirty(false);
    setSaveStatus('idle');
  };

  const handleNotesChange = (v: string) => {
    setDraft((p) => ({ ...p, notes: v }));
    setIsDirty(true);
  };

  const handleNotesBlur = () => {
    if (job && !isNewJob && draft.notes !== job.notes) {
      onUpdate(jobId, { notes: draft.notes || undefined });
    }
  };

  /* 当阶段离开"面试中"时自动清空轮次 */
  useEffect(() => {
    if (draft.stage !== '面试中' && draft.round) {
      setDraft((p) => ({ ...p, round: '' }));
    }
  }, [draft.stage]);

  const tabs: { id: Tab; label: string }[] = [
    { id: 'details', label: '详情' },
    { id: 'assets', label: '投递物料' },
    { id: 'notes', label: '复盘笔记' },
  ];

  /* ── Details Tab ──────────────────────────────────────── */
  const detailsContent = (
    <div className="flex flex-col gap-6">
      {/* 双列网格：五个短字段各占一格 */}
      <div className="grid grid-cols-2 gap-x-8 gap-y-6">

        {/* 当前阶段 */}
        <div>
          <FieldLabel>当前阶段</FieldLabel>
          {isEditing ? (
            <div className="relative">
              <select
                value={draft.stage}
                onChange={(e) => { setDraft((p) => ({ ...p, stage: e.target.value as JobStage, round: e.target.value === '面试中' ? p.round : '' })); setIsDirty(true); }}
                className="w-full appearance-none text-sm text-gray-800 bg-white border border-gray-200 shadow-sm rounded-md
                  focus:outline-none focus:border-gray-400 focus:ring-0 px-3 py-2 pr-8 transition-colors cursor-pointer"
              >
                {STAGES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
            </div>
          ) : (
            <p className="text-sm text-gray-700 font-medium flex items-center gap-2">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#8B735B] flex-shrink-0" />
              {draft.stage}
              {draft.stage === '面试中' && draft.round && (
                <span className="text-[#999999]">→</span>
              )}
              {draft.stage === '面试中' && draft.round && (
                <span className="text-[#8B735B]">{draft.round}</span>
              )}
            </p>
          )}
        </div>

        {/* 截止时间 */}
        <div>
          <FieldLabel>截止时间</FieldLabel>
          {isEditing ? (
            <input
              type="date"
              value={draft.deadline}
              onChange={(e) => { setDraft((p) => ({ ...p, deadline: e.target.value })); setIsDirty(true); }}
              className="w-full text-sm text-gray-800 bg-white border border-gray-200 shadow-sm rounded-md
                focus:outline-none focus:border-gray-400 focus:ring-0 px-3 py-2 transition-colors"
            />
          ) : (
            <p className="text-sm text-gray-700 flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5 text-[#8B735B] flex-shrink-0" />
              {draft.deadline}
            </p>
          )}
        </div>

        {/* 关键时间 */}
        <div>
          <FieldLabel>关键时间</FieldLabel>
          {isEditing ? (
            <input
              type="text"
              value={draft.time}
              onChange={(e) => { setDraft((p) => ({ ...p, time: e.target.value })); setIsDirty(true); }}
              placeholder="例如：明天 14:00"
              className="w-full text-sm text-gray-800 bg-white border border-gray-200 shadow-sm rounded-md
                focus:outline-none focus:border-gray-400 focus:ring-0 px-3 py-2 transition-colors"
            />
          ) : (
            <p className="text-sm text-gray-700 flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-[#8B735B] flex-shrink-0" />
              {draft.time || <span className="text-[#999999] italic">未设置</span>}
            </p>
          )}
        </div>

        {/* 内推情况 */}
        <div>
          <FieldLabel>内推情况</FieldLabel>
          {isEditing ? (
            <div className="flex gap-2">
              {REFERRAL_OPTIONS.map((r) => (
                <button
                  key={r}
                  onClick={() => { setDraft((p) => ({ ...p, referral: p.referral === r ? ('' as '') : r })); setIsDirty(true); }}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors border shadow-sm
                    ${draft.referral === r
                      ? 'bg-gray-900 text-white border-gray-900'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
                    }`}
                >
                  {r}
                </button>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-700 flex items-center gap-2">
              <User className="w-3.5 h-3.5 text-[#8B735B] flex-shrink-0" />
              {draft.referral || <span className="text-[#999999] italic">未填写</span>}
            </p>
          )}
        </div>

        {/* 官网地址 */}
        <div>
          <FieldLabel>官网地址</FieldLabel>
          {isEditing ? (
            <input
              type="url"
              value={draft.website}
              onChange={(e) => { setDraft((p) => ({ ...p, website: e.target.value })); setIsDirty(true); }}
              placeholder="输入官网或JD链接..."
              className="w-full text-sm text-gray-800 bg-white border border-gray-200 shadow-sm rounded-md
                focus:outline-none focus:border-gray-400 focus:ring-0 px-3 py-2 transition-colors"
            />
          ) : (
            <p className="text-sm text-gray-700 flex items-center gap-2">
              <Link className="w-4 h-4 text-[#8E7E6E] flex-shrink-0" />
              {draft.website ? (
                <a
                  href={draft.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#8B735B] underline underline-offset-2 decoration-1 hover:opacity-70 transition-opacity"
                >
                  {draft.website}
                </a>
              ) : (
                <span className="text-[#999999] italic">未填写</span>
              )}
            </p>
          )}
        </div>

        {/* 当前轮次 — 仅"面试中"阶段可见，始终占据内推情况右侧那一格 */}
        <div>
          {isEditing ? (
            draft.stage === '面试中' ? (
              <div>
                <FieldLabel>当前轮次</FieldLabel>
                <div className="relative">
                  <select
                    value={draft.round}
                    onChange={(e) => { setDraft((p) => ({ ...p, round: e.target.value })); setIsDirty(true); }}
                    className="w-full appearance-none text-sm text-gray-800 bg-white border border-gray-200 shadow-sm rounded-md
                      focus:outline-none focus:border-gray-400 focus:ring-0 px-3 py-2 pr-8 transition-colors cursor-pointer"
                  >
                    <option value="">— 选择轮次 —</option>
                    {INTERVIEW_ROUNDS.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                </div>
              </div>
            ) : null
          ) : (
            draft.stage === '面试中' && (
              <div>
                <FieldLabel>当前轮次</FieldLabel>
                <p className="text-sm text-gray-700 flex items-center gap-2">
                  <Tag className="w-3.5 h-3.5 text-[#8B735B] flex-shrink-0" />
                  {draft.round || <span className="text-[#999999] italic">未填写</span>}
                </p>
              </div>
            )
          )}
        </div>

        {/* 岗位描述 — 跨越两列 */}
        <div className="col-span-2">
          <FieldLabel>岗位描述</FieldLabel>
          {isEditing ? (
            <textarea
              value={draft.description}
              onChange={(e) => { setDraft((p) => ({ ...p, description: e.target.value })); setIsDirty(true); }}
              placeholder="粘贴或填写岗位职责、任职要求..."
              rows={8}
              className="w-full resize-none text-sm text-gray-800 bg-white border border-gray-200 shadow-sm rounded-md
                focus:outline-none focus:border-gray-400 focus:ring-0 px-3 py-2.5 leading-relaxed
                placeholder:text-[#999999] transition-colors"
            />
          ) : (
            <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">
              {draft.description || (
                <span className="text-[#999999] italic">暂无岗位描述</span>
              )}
            </p>
          )}
        </div>

      </div>
    </div>
  );

  /* ── Assets Tab ──────────────────────────────────────────── */
  const assetsContent = (
    <div className="flex flex-col gap-5">
      <div>
        <FieldLabel>简历版本</FieldLabel>
        <p className="text-sm text-gray-700">产品经理_主简历_v4.pdf</p>
      </div>
      <div>
        <FieldLabel>附件材料</FieldLabel>
        <p className="text-sm text-[#999999] italic">暂无附件</p>
      </div>
      <div>
        <FieldLabel>关联日程</FieldLabel>
        <p className="text-sm text-[#999999] italic">暂无关联日程</p>
      </div>
    </div>
  );

  /* ── Notes Tab ──────────────────────────────────────────── */
  const notesContent = (
    <div className="flex flex-col gap-3">
      <FieldLabel>复盘笔记</FieldLabel>
      <textarea
        value={draft.notes}
        onChange={(e) => handleNotesChange(e.target.value)}
        onBlur={handleNotesBlur}
        placeholder="记录面试复盘、问题总结、改进计划..."
        rows={16}
        className="w-full resize-none text-sm text-gray-700 bg-transparent border-b border-[#D8D4CE]
          focus:outline-none focus:border-[#8B735B] py-2 leading-relaxed placeholder:text-[#999999] transition-colors"
      />
    </div>
  );

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/25 backdrop-blur-[3px] z-[100] transition-opacity duration-300 ${
          isVisible ? 'opacity-100' : 'opacity-0 invisible pointer-events-none'
        }`}
        onClick={handleClose}
      />

      {/* Bottom Sheet Panel — max-w-[1344px], bg-[#EBE8E1] */}
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
                <>
                  <div className="bg-[#E5E1DA] rounded-lg px-4 py-2 mb-1">
                    <input
                      type="text"
                      value={draft.company}
                      onChange={(e) => { setDraft((p) => ({ ...p, company: e.target.value })); setIsDirty(true); }}
                      className="w-full text-3xl font-black text-gray-900 leading-tight tracking-tight bg-transparent
                        focus:outline-none"
                      placeholder="公司名称"
                    />
                  </div>
                  <div className="bg-[#E5E1DA] rounded-lg px-4 py-2">
                    <input
                      type="text"
                      value={draft.title}
                      onChange={(e) => { setDraft((p) => ({ ...p, title: e.target.value })); setIsDirty(true); }}
                      className="w-full text-base font-medium text-[#8B735B] bg-transparent
                        focus:outline-none"
                      placeholder="岗位名称"
                    />
                  </div>
                </>
              ) : (
                <>
                  <h2 className="text-3xl font-black text-gray-900 leading-tight tracking-tight truncate">
                    {draft.company}
                  </h2>
                  <p className="text-base font-medium text-[#8B735B] mt-1 truncate">
                    {draft.title}
                  </p>
                </>
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

            {/* 右上角操作按钮组 */}
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

          {/* Tab Navigation */}
          <div className="flex gap-6 mt-5 border-b border-[#D8D4CE]">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`pb-2.5 text-sm font-medium transition-all relative ${
                  activeTab === tab.id
                    ? 'text-gray-900'
                    : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                {tab.label}
                {activeTab === tab.id && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-900 rounded-full" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto px-8 py-6">
          {activeTab === 'details' && detailsContent}
          {activeTab === 'assets' && assetsContent}
          {activeTab === 'notes' && notesContent}
        </div>
      </div>
    </>
  );
}
