'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { ArrowLeft, BookOpen, BarChart3, Loader2, RefreshCw } from 'lucide-react';
import type { GapFillingPlan } from '@/types/gap-filling';
import { getLatestDiagnosis, getExistingPlan, generateActionPlan, savePlan } from '@/app/actions/gap-filling';
import GapPlanPhaseSection from './GapPlanPhaseSection';
import { useJobStore } from '@/store/useJobStore';
import { normalizeToISODate } from '@/lib/dateUtils';

type ViewStatus = 'loading' | 'no-diagnosis' | 'generating' | 'ready' | 'error';

interface GapFillingViewProps {
  onBack: () => void;
  onGoToDiagnosis?: () => void;
  /** 当前选中的 journeyId，用于数据隔离 */
  journeyId?: string | null;
}

export default function GapFillingView({ onBack, onGoToDiagnosis, journeyId }: GapFillingViewProps) {
  const [status, setStatus] = useState<ViewStatus>('loading');
  const [plan, setPlan] = useState<GapFillingPlan | null>(null);
  const [error, setError] = useState<string | null>(null);
  const initRef = useRef(false);

  const createTask = useJobStore((s) => s.createTask);

  // 初始化：检查已有计划或诊断报告
  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    async function init() {
      const jId = journeyId ?? undefined;
      // 1. 先检查是否已有行动计划
      const existingResult = await getExistingPlan(jId);
      if (existingResult.error) {
        setError(existingResult.error);
        setStatus('error');
        return;
      }

      if (existingResult.plan) {
        setPlan(existingResult.plan);
        setStatus('ready');
        return;
      }

      // 2. 检查是否有诊断报告
      const diagResult = await getLatestDiagnosis(jId);
      if (diagResult.error) {
        setError(diagResult.error);
        setStatus('error');
        return;
      }

      if (!diagResult.report) {
        setStatus('no-diagnosis');
        return;
      }

      // 3. 基于诊断报告生成行动计划
      setStatus('generating');
      const genResult = await generateActionPlan({ diagnosisReport: diagResult.report });

      if (genResult.error || !genResult.plan) {
        setError(genResult.error ?? 'AI 未能生成行动计划');
        setStatus('error');
        return;
      }

      // 4. 保存计划（后台，不阻塞展示）
      setPlan(genResult.plan);
      setStatus('ready');

      savePlan(genResult.plan, jId).catch((err) => {
        console.warn('[GapFillingView] Failed to save plan:', err);
      });
    }

    init();
  }, [journeyId]);

  // 重新生成
  const handleRegenerate = useCallback(async () => {
    setStatus('generating');
    setError(null);

    const jId = journeyId ?? undefined;
    const diagResult = await getLatestDiagnosis(jId);
    if (diagResult.error || !diagResult.report) {
      setError(diagResult.error ?? '无法获取诊断报告，请先完成诊断');
      setStatus('error');
      return;
    }

    const genResult = await generateActionPlan({ diagnosisReport: diagResult.report });

    if (genResult.error || !genResult.plan) {
      setError(genResult.error ?? 'AI 未能生成行动计划');
      setStatus('error');
      return;
    }

    setPlan(genResult.plan);
    setStatus('ready');

    savePlan(genResult.plan, jId).catch((err) => {
      console.warn('[GapFillingView] Failed to save regenerated plan:', err);
    });
  }, [journeyId]);

  // 将行动项加入日程
  const handleAddToSchedule = useCallback(
    async (itemId: string, date: string, time: string) => {
      if (!plan) return;

      // 找到对应的行动项
      let targetItem: { title: string; priority: string; estimatedHours: number; completionCriteria: string; relatedGap: string; notes?: string } | null = null;
      for (const phase of plan.phases) {
        const found = phase.items.find((i) => i.id === itemId);
        if (found) {
          targetItem = found;
          break;
        }
      }

      if (!targetItem) return;

      const notesParts = [
        `来源：差距填补行动计划`,
        `关联差距：${targetItem.relatedGap}`,
        `完成标准：${targetItem.completionCriteria}`,
        `预计耗时：${targetItem.estimatedHours} 小时`,
      ];
      if (targetItem.notes) {
        notesParts.push(`补充说明：${targetItem.notes}`);
      }

      await createTask({
        title: `[行动计划] ${targetItem.title}`,
        company: '',
        taskDate: normalizeToISODate(date),
        taskTime: time || undefined,
        tag: '待办事项',
        notes: notesParts.join('\n'),
      });

      // 更新 plan 中该 item 的 addedToSchedule 状态
      setPlan((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          phases: prev.phases.map((phase) => ({
            ...phase,
            items: phase.items.map((item) =>
              item.id === itemId ? { ...item, addedToSchedule: true } : item
            ),
          })),
        };
      });
    },
    [plan, createTask]
  );

  // ── Render helpers ──────────────────────────────────────────────────────────

  // 加载中
  if (status === 'loading') {
    return (
      <div className="h-full min-h-0 flex flex-col">
        <StageHeader title="差距填补" onBack={onBack} />
        <div className="flex-1 min-h-0 flex items-center justify-center px-8">
          <div className="text-center">
            <Loader2 className="w-8 h-8 text-[#8B735B] animate-spin mx-auto" />
            <p className="mt-4 text-sm text-[#666666]">正在加载...</p>
          </div>
        </div>
      </div>
    );
  }

  // 无诊断报告
  if (status === 'no-diagnosis') {
    return (
      <div className="h-full min-h-0 flex flex-col">
        <StageHeader title="差距填补" onBack={onBack} />
        <div className="flex-1 min-h-0 flex items-center justify-center px-8">
          <div className="max-w-[480px] text-center">
            <div className="w-16 h-16 rounded-2xl bg-[#8B735B]/10 flex items-center justify-center mx-auto">
              <BarChart3 className="w-8 h-8 text-[#8B735B]" />
            </div>
            <h2 className="mt-6 text-xl font-bold text-[#111111]">请先完成能力诊断</h2>
            <p className="mt-3 text-sm text-[#666666] leading-relaxed">
              差距填补基于能力诊断报告生成个性化的学习与提升计划。
              你需要先完成能力诊断，系统才能分析你的能力差距并制定针对性的行动计划。
            </p>
            <div className="flex items-center justify-center gap-3 mt-8">
              <button
                onClick={onBack}
                className="px-5 py-2.5 text-sm text-[#666666] hover:text-[#111111] hover:bg-[#E8E5E0] rounded-lg transition-colors"
              >
                返回 Hub
              </button>
              {onGoToDiagnosis && (
                <button
                  onClick={onGoToDiagnosis}
                  className="flex items-center gap-2 px-5 py-2.5 bg-[#8B735B] hover:bg-[#7A654D] text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
                >
                  <BarChart3 className="w-4 h-4" />
                  去完成能力诊断
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 生成中
  if (status === 'generating') {
    return (
      <div className="h-full min-h-0 flex flex-col">
        <StageHeader title="差距填补" onBack={onBack} />
        <div className="flex-1 min-h-0 flex items-center justify-center px-8">
          <div className="max-w-[480px] text-center">
            <div className="w-16 h-16 rounded-2xl bg-[#8B735B]/10 flex items-center justify-center mx-auto">
              <Loader2 className="w-8 h-8 text-[#8B735B] animate-spin" />
            </div>
            <h2 className="mt-6 text-xl font-bold text-[#111111]">正在生成行动计划</h2>
            <p className="mt-3 text-sm text-[#666666] leading-relaxed">
              AI 教练正在基于你的诊断报告分析能力差距，并为你制定个性化的分阶段提升计划...
            </p>
            <div className="mt-6 flex items-center justify-center gap-1.5">
              <div className="w-2 h-2 bg-[#8B735B] rounded-full animate-bounce" />
              <div className="w-2 h-2 bg-[#8B735B] rounded-full animate-bounce [animation-delay:0.15s]" />
              <div className="w-2 h-2 bg-[#8B735B] rounded-full animate-bounce [animation-delay:0.3s]" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 错误
  if (status === 'error') {
    return (
      <div className="h-full min-h-0 flex flex-col">
        <StageHeader title="差距填补" onBack={onBack} />
        <div className="flex-1 min-h-0 flex items-center justify-center px-8">
          <div className="max-w-[480px] text-center">
            <div className="w-14 h-14 rounded-2xl bg-red-50 border border-red-200 flex items-center justify-center mx-auto">
              <ArrowLeft className="w-7 h-7 text-red-400 rotate-180" />
            </div>
            <h3 className="mt-4 text-lg font-bold text-[#111111]">生成失败</h3>
            <p className="mt-2 text-sm text-[#666666] leading-relaxed">{error}</p>
            <div className="flex items-center justify-center gap-3 mt-6">
              <button
                onClick={onBack}
                className="px-4 py-2 text-sm text-[#666666] hover:text-[#111111] hover:bg-[#E8E5E0] rounded-lg transition-colors"
              >
                返回 Hub
              </button>
              <button
                onClick={handleRegenerate}
                className="flex items-center gap-2 px-5 py-2 bg-[#8B735B] hover:bg-[#7A654D] text-white text-sm font-medium rounded-lg transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                重试
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 就绪：展示行动计划
  if (status === 'ready' && plan) {
    return (
      <div className="h-full min-h-0 flex flex-col">
        {/* Stage Header */}
        <div className="px-8 pt-7 pb-5 border-b border-[#CFCCC8] flex-shrink-0">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <button
                onClick={onBack}
                className="w-9 h-9 rounded-lg bg-white border border-[#E0DCD1] hover:border-[#8B735B] hover:shadow-sm transition-all flex items-center justify-center"
              >
                <ArrowLeft className="w-5 h-5 text-[#8B735B]" />
              </button>
              <div>
                <p className="text-[10px] uppercase tracking-[0.3em] text-[#8B735B] font-medium">
                  求职陪跑 · 差距填补
                </p>
                <h1 className="mt-1 text-3xl font-black text-[#111111] tracking-tight leading-none">
                  差距填补
                </h1>
              </div>
            </div>

            {/* 重新生成按钮 */}
            <button
              onClick={handleRegenerate}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-[#666666] hover:text-[#8B735B] hover:bg-[#E8E5E0] rounded-lg transition-colors"
              title="基于最新诊断报告重新生成计划"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              重新生成
            </button>
          </div>
        </div>

        {/* Plan Content */}
        <div className="flex-1 min-h-0 overflow-y-auto px-8 py-6">
          <div className="max-w-[780px] mx-auto space-y-6">
            {/* Plan Title */}
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-[#8B735B]/10 flex items-center justify-center flex-shrink-0">
                <BookOpen className="w-5 h-5 text-[#8B735B]" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-[#111111]">{plan.title}</h2>
                <p className="text-xs text-[#999999] mt-0.5">
                  共 {plan.phases.length} 个阶段 · {plan.phases.reduce((sum, p) => sum + p.items.length, 0)} 个行动项
                </p>
              </div>
            </div>

            {/* Phases */}
            <div className="space-y-6">
              {plan.phases.map((phase) => (
                <GapPlanPhaseSection
                  key={phase.type}
                  phase={phase}
                  onAddToSchedule={handleAddToSchedule}
                />
              ))}
            </div>

            {/* 底部提示 */}
            <div className="pt-4 border-t border-[#D8D4CE] text-center">
              <p className="text-xs text-[#999999]">
                完成所有行动项后，建议重新进行能力诊断，评估提升效果
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

/** 舞台页头（加载/无诊断/生成中/错误视图复用） */
function StageHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <div className="px-8 pt-7 pb-5 border-b border-[#CFCCC8] flex-shrink-0">
      <div className="flex items-center gap-4">
        <button
          onClick={onBack}
          className="w-9 h-9 rounded-lg bg-white border border-[#E0DCD1] hover:border-[#8B735B] hover:shadow-sm transition-all flex items-center justify-center"
        >
          <ArrowLeft className="w-5 h-5 text-[#8B735B]" />
        </button>
        <div>
          <p className="text-[10px] uppercase tracking-[0.3em] text-[#8B735B] font-medium">
            求职陪跑 · {title}
          </p>
          <h1 className="mt-1 text-3xl font-black text-[#111111] tracking-tight leading-none">
            {title}
          </h1>
        </div>
      </div>
    </div>
  );
}
