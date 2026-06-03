'use client';

import { useState } from 'react';
import { Edit3, Check, X as XIcon, Loader2, ArrowLeft, Sparkles } from 'lucide-react';
import type { JobSnapshot } from '@/types/diagnosis';

interface JobPreviewCardProps {
  snapshot: JobSnapshot;
  onConfirm: (editedSnapshot: JobSnapshot) => void;
  onBack: () => void;
  isGenerating?: boolean;
}

/** category -> 中文标签 */
const CATEGORY_LABELS: Record<string, string> = {
  knowledge: '理论知识',
  experience: '实践经验',
  tool: '工具使用',
  soft_skill: '软技能',
};

/** importance -> 颜色 */
const IMPORTANCE_COLORS: Record<string, string> = {
  high: 'bg-red-50 border-red-200 text-red-700',
  medium: 'bg-amber-50 border-amber-200 text-amber-700',
  low: 'bg-gray-50 border-gray-200 text-gray-500',
};

export default function JobPreviewCard({ snapshot, onConfirm, onBack, isGenerating }: JobPreviewCardProps) {
  const [edited, setEdited] = useState<JobSnapshot>(() => structuredClone(snapshot));

  function updateField(field: keyof JobSnapshot, value: string) {
    setEdited((prev) => ({ ...prev, [field]: value }));
  }

  function updateSkill(index: number, field: string, value: string) {
    setEdited((prev) => {
      const newSkills = [...prev.inferredSkills];
      newSkills[index] = {
        ...newSkills[index],
        [field]: value,
      } as JobSnapshot['inferredSkills'][number];
      return { ...prev, inferredSkills: newSkills };
    });
  }

  function updateListField(field: 'responsibilities' | 'requirements' | 'keywords', index: number, value: string) {
    setEdited((prev) => {
      const newList = [...prev[field]];
      newList[index] = value;
      return { ...prev, [field]: newList };
    });
  }

  function removeListItem(field: 'responsibilities' | 'requirements' | 'keywords', index: number) {
    setEdited((prev) => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index),
    }));
  }

  function addListItem(field: 'responsibilities' | 'requirements' | 'keywords') {
    setEdited((prev) => ({
      ...prev,
      [field]: [...prev[field], ''],
    }));
  }

  // ── 内联编辑控件 ───────────────────────────────────────────────────────

  function InlineInput({
    value,
    onChange,
    placeholder,
    className = '',
  }: {
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
    className?: string;
  }) {
    const [localValue, setLocalValue] = useState(value);
    const [isEditing, setIsEditing] = useState(false);

    if (isEditing) {
      return (
        <div className="flex items-center gap-1">
          <input
            type="text"
            value={localValue}
            onChange={(e) => setLocalValue(e.target.value)}
            placeholder={placeholder}
            className={`flex-1 bg-white border border-[#8B735B]/40 rounded px-2 py-1 text-sm text-[#111111] outline-none focus:ring-1 focus:ring-[#8B735B]/30 ${className}`}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                onChange(localValue);
                setIsEditing(false);
              }
              if (e.key === 'Escape') {
                setLocalValue(value);
                setIsEditing(false);
              }
            }}
            onBlur={() => {
              onChange(localValue);
              setIsEditing(false);
            }}
          />
        </div>
      );
    }

    return (
      <span
        onClick={() => {
          setLocalValue(value);
          setIsEditing(true);
        }}
        className="cursor-pointer hover:bg-[#F5F2EE] rounded px-1 -mx-1 transition-colors inline-flex items-center gap-1 group"
      >
        <span>{value || <span className="text-[#C5C0BA] italic">{placeholder ?? '点击编辑'}</span>}</span>
        <Edit3 className="w-3 h-3 text-[#8B735B]/40 opacity-0 group-hover:opacity-100 transition-opacity" />
      </span>
    );
  }

  return (
    <div className="h-full min-h-0 flex flex-col">
      {/* 预览卡片内容 */}
      <div className="flex-1 min-h-0 overflow-y-auto px-8 py-6">
        <div className="max-w-[680px] mx-auto space-y-6">
          {/* 标题区 */}
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#8B735B]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Sparkles className="w-5 h-5 text-[#8B735B]" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#111111]">AI 识别结果预览</h2>
              <p className="text-sm text-[#666666] mt-1 leading-relaxed">
                以下是 AI 从 JD 中识别出的岗位信息，点击任意文字可直接编辑。确认无误后即可生成诊断报告。
              </p>
            </div>
          </div>

          {/* 岗位名称 + 公司 */}
          <div className="bg-white border border-[#E0DCD1] rounded-xl p-5 shadow-sm">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] uppercase tracking-wider text-[#8B735B] font-medium mb-1 block">岗位名称</label>
                <InlineInput
                  value={edited.targetPosition}
                  onChange={(v) => updateField('targetPosition', v)}
                  placeholder="岗位名称"
                  className="text-base font-bold"
                />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wider text-[#8B735B] font-medium mb-1 block">公司</label>
                <InlineInput
                  value={edited.company ?? ''}
                  onChange={(v) => updateField('company', v || '')}
                  placeholder="公司名称"
                />
              </div>
            </div>

            {/* 岗位概述 */}
            {edited.jobSummary && (
              <div className="mt-4 pt-4 border-t border-[#F0EDE8]">
                <label className="text-[10px] uppercase tracking-wider text-[#8B735B] font-medium mb-1 block">岗位概述</label>
                <InlineInput
                  value={edited.jobSummary}
                  onChange={(v) => updateField('jobSummary', v)}
                  placeholder="岗位概述"
                />
              </div>
            )}
          </div>

          {/* 岗位职责 */}
          <div className="bg-white border border-[#E0DCD1] rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <label className="text-xs font-bold text-[#111111] uppercase tracking-wider">岗位职责</label>
              <button
                type="button"
                onClick={() => addListItem('responsibilities')}
                className="text-xs text-[#8B735B] hover:text-[#7A654D] transition-colors"
              >
                + 添加
              </button>
            </div>
            <ul className="space-y-2">
              {edited.responsibilities.length === 0 ? (
                <li className="text-sm text-[#999999] italic">暂无职责项，点击"+ 添加"增加</li>
              ) : (
                edited.responsibilities.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 group">
                    <span className="text-[#8B735B] mt-0.5 flex-shrink-0">&#8226;</span>
                    <div className="flex-1">
                      <InlineInput
                        value={item}
                        onChange={(v) => updateListField('responsibilities', i, v)}
                        placeholder="岗位职责"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeListItem('responsibilities', i)}
                      className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-red-50 rounded transition-colors flex-shrink-0"
                    >
                      <XIcon className="w-3 h-3 text-[#999999] hover:text-red-500" />
                    </button>
                  </li>
                ))
              )}
            </ul>
          </div>

          {/* 任职要求 */}
          <div className="bg-white border border-[#E0DCD1] rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <label className="text-xs font-bold text-[#111111] uppercase tracking-wider">任职要求</label>
              <button
                type="button"
                onClick={() => addListItem('requirements')}
                className="text-xs text-[#8B735B] hover:text-[#7A654D] transition-colors"
              >
                + 添加
              </button>
            </div>
            <ul className="space-y-2">
              {edited.requirements.length === 0 ? (
                <li className="text-sm text-[#999999] italic">暂无要求项，点击"+ 添加"增加</li>
              ) : (
                edited.requirements.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 group">
                    <span className="text-[#8B735B] mt-0.5 flex-shrink-0">&#8226;</span>
                    <div className="flex-1">
                      <InlineInput
                        value={item}
                        onChange={(v) => updateListField('requirements', i, v)}
                        placeholder="任职要求"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeListItem('requirements', i)}
                      className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-red-50 rounded transition-colors flex-shrink-0"
                    >
                      <XIcon className="w-3 h-3 text-[#999999] hover:text-red-500" />
                    </button>
                  </li>
                ))
              )}
            </ul>
          </div>

          {/* 核心能力关键词 */}
          <div className="bg-white border border-[#E0DCD1] rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <label className="text-xs font-bold text-[#111111] uppercase tracking-wider">核心能力关键词</label>
              <button
                type="button"
                onClick={() => addListItem('keywords')}
                className="text-xs text-[#8B735B] hover:text-[#7A654D] transition-colors"
              >
                + 添加
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {edited.keywords.length === 0 ? (
                <span className="text-sm text-[#999999] italic">暂无关键词</span>
              ) : (
                edited.keywords.map((kw, i) => (
                  <div key={i} className="group relative">
                    <InlineInput
                      value={kw}
                      onChange={(v) => updateListField('keywords', i, v)}
                      placeholder="关键词"
                      className="inline-block px-3 py-1 rounded-full bg-[#8B735B]/5 border border-[#8B735B]/10 text-xs text-[#8B735B]"
                    />
                    <button
                      type="button"
                      onClick={() => removeListItem('keywords', i)}
                      className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-white border border-[#E0DCD1] rounded-full flex items-center justify-center shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <XIcon className="w-2.5 h-2.5 text-[#999999]" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* 推断技能 */}
          <div className="bg-white border border-[#E0DCD1] rounded-xl p-5 shadow-sm">
            <label className="text-xs font-bold text-[#111111] uppercase tracking-wider block mb-3">推断的核心能力</label>
            {edited.inferredSkills.length === 0 ? (
              <p className="text-sm text-[#999999] italic">暂无推断技能</p>
            ) : (
              <div className="space-y-3">
                {edited.inferredSkills.map((skill, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 bg-[#F9F8F6] rounded-lg border border-[#F0EDE8]">
                    <div className="flex-1 min-w-0">
                      <InlineInput
                        value={skill.name}
                        onChange={(v) => updateSkill(i, 'name', v)}
                        placeholder="技能名称"
                        className="font-medium"
                      />
                    </div>
                    <select
                      value={skill.category}
                      onChange={(e) => updateSkill(i, 'category', e.target.value)}
                      className="text-xs bg-white border border-[#E0DCD1] rounded px-2 py-1 text-[#666666] outline-none"
                    >
                      {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                        <option key={key} value={key}>{label}</option>
                      ))}
                    </select>
                    <span
                      className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${IMPORTANCE_COLORS[skill.importance] ?? 'bg-gray-50 border-gray-200 text-gray-500'}`}
                    >
                      {skill.importance === 'high' ? '高' : skill.importance === 'medium' ? '中' : '低'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 底部操作区 */}
      <div className="flex-shrink-0 px-8 py-4 border-t border-[#CFCCC8] bg-[#F5F2EE]">
        <div className="max-w-[680px] mx-auto flex items-center justify-between">
          <button
            type="button"
            onClick={onBack}
            disabled={isGenerating}
            className="flex items-center gap-2 px-4 py-2.5 text-sm text-[#666666] hover:text-[#111111] hover:bg-[#E8E5E0] rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ArrowLeft className="w-4 h-4" />
            返回修改
          </button>
          <button
            type="button"
            onClick={() => onConfirm(edited)}
            disabled={isGenerating || !edited.targetPosition.trim()}
            className="flex items-center gap-2 px-6 py-2.5 bg-[#8B735B] hover:bg-[#7A654D] disabled:bg-[#B5A895] disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                生成中...
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                确认并生成报告
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
