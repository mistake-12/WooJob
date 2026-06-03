'use client';

import { useState, useEffect, useCallback } from 'react';
import { BarChart3, BookOpen, FileText, MessageSquare, Send, TrendingUp, ArrowLeft } from 'lucide-react';
import JourneyStageCard, { type JourneyStageCardProps, type JourneyStageStatus } from './JourneyStageCard';
import DiagnosisForm from './diagnosis/DiagnosisForm';
import JobPreviewCard from './diagnosis/JobPreviewCard';
import DiagnosisReportView from './diagnosis/DiagnosisReportView';
import GapFillingView from './gap/GapFillingView';
import type { JobSnapshot, DiagnosisReport } from '@/types/diagnosis';
import type { DiagnosisFlowStage } from '@/types/diagnosis';
import { generateDiagnosisReport, saveArtifact } from '@/app/actions/diagnosis';
import { getJourneyHubStatus, updateJourneyStage, getOrCreateJourney } from '@/app/actions/journey-ai';

/** 阶段静态配置（不含动态 status，运行时注入） */
type StageConfig = Omit<JourneyStageCardProps, 'status' | 'onSelect'>;

const stageConfigs: StageConfig[] = [
  {
    id: 'diagnosis',
    title: '能力诊断',
    description: '基于目标岗位和简历，生成能力匹配度报告和差距清单',
    icon: BarChart3,
  },
  {
    id: 'gap-filling',
    title: '差距填补',
    description: '将诊断差距拆解为学习、练习、项目产出等行动计划',
    icon: BookOpen,
  },
  {
    id: 'resume',
    title: '简历优化',
    description: '根据岗位要求优化简历内容和结构，提升匹配度',
    icon: FileText,
  },
  {
    id: 'interview',
    title: '面试模拟',
    description: '模拟真实面试场景，提供针对性反馈和改进建议',
    icon: MessageSquare,
  },
  {
    id: 'delivery',
    title: '投递策略',
    description: '分析投递时机和渠道，制定个性化投递计划',
    icon: Send,
  },
  {
    id: 'offer',
    title: 'Offer 谈判',
    description: '提供薪资谈判技巧和策略建议，争取最优条件',
    icon: TrendingUp,
  },
];

function resolveStageStatus(
  stageId: string,
  hubStatus: { diagnosisCompleted: boolean; gapFillingCompleted: boolean } | null
): JourneyStageStatus {
  if (stageId === 'diagnosis') {
    if (hubStatus?.diagnosisCompleted) return 'completed';
    return 'available';
  }
  if (stageId === 'gap-filling') {
    if (hubStatus?.gapFillingCompleted) return 'completed';
    return 'available';
  }
  // 其他阶段一律 coming_soon（P1/P2）
  return 'coming_soon';
}

interface JourneyHubProps {
  currentStage: string | null;
  onStageSelect: (stageId: string) => void;
  onBackToHub: () => void;
}

export default function JourneyHub({ currentStage, onStageSelect, onBackToHub }: JourneyHubProps) {
  // ── Hub 状态（卡片 status）────────────────────────────────────────────
  const [hubStatus, setHubStatus] = useState<{
    diagnosisCompleted: boolean;
    gapFillingCompleted: boolean;
  } | null>(null);
  const [journeyId, setJourneyId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function initHub() {
      // 获取 journey（可能创建）
      const jResult = await getOrCreateJourney();
      if (cancelled) return;
      if (jResult.journey) {
        setJourneyId(jResult.journey.id as string);
      }
      // 获取阶段状态
      const status = await getJourneyHubStatus();
      if (cancelled) return;
      setHubStatus({
        diagnosisCompleted: status.diagnosisCompleted,
        gapFillingCompleted: status.gapFillingCompleted,
      });
    }
    initHub();
    return () => { cancelled = true; };
  }, []);

  // 构建动态卡片状态
  const stages: (Omit<JourneyStageCardProps, 'onSelect'>)[] = stageConfigs.map((cfg) => ({
    ...cfg,
    status: resolveStageStatus(cfg.id, hubStatus),
  }));

  // ── 诊断流程状态 ───────────────────────────────────────────────────────
  const [diagnosisFlow, setDiagnosisFlow] = useState<DiagnosisFlowStage>('form');
  const [jobSnapshot, setJobSnapshot] = useState<JobSnapshot | null>(null);
  const [diagnosisReport, setDiagnosisReport] = useState<DiagnosisReport | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 重置诊断状态（离开诊断阶段时调用）
  const resetDiagnosis = useCallback(() => {
    setDiagnosisFlow('form');
    setJobSnapshot(null);
    setDiagnosisReport(null);
    setIsProcessing(false);
    setError(null);
  }, []);

  // 返回 Hub（包含清理）
  const handleBackToHub = useCallback(() => {
    resetDiagnosis();
    onBackToHub();
    // 返回 Hub 时刷新卡片状态
    getJourneyHubStatus().then((status) => {
      setHubStatus({
        diagnosisCompleted: status.diagnosisCompleted,
        gapFillingCompleted: status.gapFillingCompleted,
      });
    });
  }, [onBackToHub, resetDiagnosis]);

  // ── 诊断流程回调 ───────────────────────────────────────────────────────

  // 1. AI 识别完成，进入预览
  const handleIdentified = useCallback((snapshot: JobSnapshot) => {
    setJobSnapshot(snapshot);
    setDiagnosisFlow('preview');
    setError(null);
  }, []);

  // 2. 用户在预览中确认，生成报告
  const handleConfirmSnapshot = useCallback(async (editedSnapshot: JobSnapshot) => {
    setIsProcessing(true);
    setError(null);

    // 保存 job_snapshot artifact
    const saveResult = await saveArtifact({
      stage: 'diagnosis',
      artifactType: 'job_snapshot',
      data: editedSnapshot as unknown as Record<string, unknown>,
    });

    if (saveResult.error) {
      console.warn('[JourneyHub] Failed to save job_snapshot:', saveResult.error);
    }

    // 生成诊断报告
    const result = await generateDiagnosisReport({
      jobSnapshot: editedSnapshot,
      selfDescription: undefined,
    });

    setIsProcessing(false);

    if (result.error) {
      setError(result.error);
    } else if (result.report) {
      setDiagnosisReport(result.report);
      setDiagnosisFlow('report');

      // 保存 diagnosis_report artifact
      saveArtifact({
        stage: 'diagnosis',
        artifactType: 'diagnosis_report',
        data: result.report as unknown as Record<string, unknown>,
      }).catch((err) => {
        console.warn('[JourneyHub] Failed to save diagnosis_report:', err);
      });

      // 标记诊断阶段已完成
      if (journeyId) {
        updateJourneyStage(journeyId, 'diagnosis').catch((err) => {
          console.warn('[JourneyHub] Failed to update journey stage:', err);
        });
        // 乐观更新本地状态
        setHubStatus((prev) => prev ? { ...prev, diagnosisCompleted: true } : prev);
      }
    } else {
      setError('AI 未返回诊断报告，请重试');
    }
  }, [journeyId]);

  // 3. 预览返回修改
  const handleBackToForm = useCallback(() => {
    setDiagnosisFlow('form');
    setJobSnapshot(null);
    setError(null);
  }, []);

  // 4. 报告页返回 Hub
  const handleReportBack = useCallback(() => {
    resetDiagnosis();
    onBackToHub();
  }, [onBackToHub, resetDiagnosis]);

  // 5. 错误回调
  const handleError = useCallback((errMsg: string) => {
    setError(errMsg);
  }, []);

  // 6. 跳转到差距填补
  const handleGapFilling = useCallback(() => {
    resetDiagnosis();
    onStageSelect('gap-filling');
  }, [onStageSelect, resetDiagnosis]);

  // 差距填补完成后刷新状态
  const handleGapFillingBack = useCallback(() => {
    // 刷新 Hub 卡片状态
    getJourneyHubStatus().then((status) => {
      setHubStatus({
        diagnosisCompleted: status.diagnosisCompleted,
        gapFillingCompleted: status.gapFillingCompleted,
      });
      // 如果计划已保存，标记 gap_filling 完成
      if (status.gapFillingCompleted && journeyId) {
        updateJourneyStage(journeyId, 'gap_filling').catch((err) => {
          console.warn('[JourneyHub] Failed to update journey stage:', err);
        });
        setHubStatus((prev) => prev ? { ...prev, gapFillingCompleted: true } : prev);
      }
    });
    onBackToHub();
  }, [onBackToHub, journeyId]);

  // ── 渲染诊断阶段内容 ──────────────────────────────────────────────────
  function renderDiagnosisContent() {
    if (error) {
      return (
        <div className="h-full min-h-0 flex flex-col">
          <div className="px-8 pt-7 pb-5 border-b border-[#CFCCC8] flex-shrink-0">
            <div className="flex items-center gap-4">
              <button
                onClick={handleBackToHub}
                className="w-9 h-9 rounded-lg bg-white border border-[#E0DCD1] hover:border-[#8B735B] hover:shadow-sm transition-all flex items-center justify-center"
              >
                <ArrowLeft className="w-5 h-5 text-[#8B735B]" />
              </button>
              <div>
                <p className="text-[10px] uppercase tracking-[0.3em] text-[#8B735B] font-medium">
                  求职陪跑 · 能力诊断
                </p>
                <h1 className="mt-1 text-3xl font-black text-[#111111] tracking-tight leading-none">
                  能力诊断
                </h1>
              </div>
            </div>
          </div>

          {/* 错误状态 */}
          <div className="flex-1 min-h-0 flex items-center justify-center px-8">
            <div className="max-w-[480px] text-center">
              <div className="w-14 h-14 rounded-2xl bg-red-50 border border-red-200 flex items-center justify-center mx-auto">
                <ArrowLeft className="w-7 h-7 text-red-400 rotate-180" />
              </div>
              <h3 className="mt-4 text-lg font-bold text-[#111111]">识别失败</h3>
              <p className="mt-2 text-sm text-[#666666] leading-relaxed">{error}</p>
              <div className="flex items-center justify-center gap-3 mt-6">
                <button
                  onClick={() => {
                    setError(null);
                    setDiagnosisFlow('form');
                  }}
                  className="px-4 py-2 text-sm text-[#666666] hover:text-[#111111] hover:bg-[#E8E5E0] rounded-lg transition-colors"
                >
                  返回修改
                </button>
                <button
                  onClick={handleBackToHub}
                  className="px-5 py-2 bg-[#8B735B] hover:bg-[#7A654D] text-white text-sm font-medium rounded-lg transition-colors"
                >
                  返回 Hub
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (diagnosisFlow === 'report' && diagnosisReport) {
      return (
        <div className="h-full min-h-0 flex flex-col">
          <div className="px-8 pt-7 pb-5 border-b border-[#CFCCC8] flex-shrink-0">
            <div className="flex items-center gap-4">
              <button
                onClick={handleReportBack}
                className="w-9 h-9 rounded-lg bg-white border border-[#E0DCD1] hover:border-[#8B735B] hover:shadow-sm transition-all flex items-center justify-center"
              >
                <ArrowLeft className="w-5 h-5 text-[#8B735B]" />
              </button>
              <div>
                <p className="text-[10px] uppercase tracking-[0.3em] text-[#8B735B] font-medium">
                  求职陪跑 · 能力诊断
                </p>
                <h1 className="mt-1 text-3xl font-black text-[#111111] tracking-tight leading-none">
                  诊断报告
                </h1>
              </div>
            </div>
          </div>

          <DiagnosisReportView
            report={diagnosisReport}
            onBack={handleReportBack}
            onGapFilling={handleGapFilling}
          />
        </div>
      );
    }

    if (diagnosisFlow === 'preview' && jobSnapshot) {
      return (
        <div className="h-full min-h-0 flex flex-col">
          <div className="px-8 pt-7 pb-5 border-b border-[#CFCCC8] flex-shrink-0">
            <div className="flex items-center gap-4">
              <button
                onClick={handleBackToHub}
                className="w-9 h-9 rounded-lg bg-white border border-[#E0DCD1] hover:border-[#8B735B] hover:shadow-sm transition-all flex items-center justify-center"
              >
                <ArrowLeft className="w-5 h-5 text-[#8B735B]" />
              </button>
              <div>
                <p className="text-[10px] uppercase tracking-[0.3em] text-[#8B735B] font-medium">
                  求职陪跑 · 能力诊断
                </p>
                <h1 className="mt-1 text-3xl font-black text-[#111111] tracking-tight leading-none">
                  确认岗位信息
                </h1>
              </div>
            </div>
          </div>

          <JobPreviewCard
            snapshot={jobSnapshot}
            onConfirm={handleConfirmSnapshot}
            onBack={handleBackToForm}
            isGenerating={isProcessing}
          />
        </div>
      );
    }

    // 默认：表单
    return (
      <div className="h-full min-h-0 flex flex-col">
        <div className="px-8 pt-7 pb-5 border-b border-[#CFCCC8] flex-shrink-0">
          <div className="flex items-center gap-4">
            <button
              onClick={handleBackToHub}
              className="w-9 h-9 rounded-lg bg-white border border-[#E0DCD1] hover:border-[#8B735B] hover:shadow-sm transition-all flex items-center justify-center"
            >
              <ArrowLeft className="w-5 h-5 text-[#8B735B]" />
            </button>
            <div>
              <p className="text-[10px] uppercase tracking-[0.3em] text-[#8B735B] font-medium">
                求职陪跑 · 能力诊断
              </p>
              <h1 className="mt-1 text-3xl font-black text-[#111111] tracking-tight leading-none">
                能力诊断
              </h1>
            </div>
          </div>
        </div>

        <DiagnosisForm
          onIdentified={handleIdentified}
          onError={handleError}
        />
      </div>
    );
  }

  // ── If a stage is selected, render stage content ────────────────────────
  if (currentStage) {
    const stage = stages.find((s) => s.id === currentStage);
    if (!stage) return null;

    // 能力诊断有专属流程
    if (currentStage === 'diagnosis') {
      return renderDiagnosisContent();
    }

    // 差距填补有专属流程
    if (currentStage === 'gap-filling') {
      return (
        <GapFillingView
          onBack={handleGapFillingBack}
          onGoToDiagnosis={() => {
            resetDiagnosis();
            onStageSelect('diagnosis');
          }}
        />
      );
    }

    // 其他阶段的占位内容（coming_soon）
    const StageIcon = stage.icon;

    return (
      <div className="h-full min-h-0 flex flex-col">
        <div className="px-8 pt-7 pb-5 border-b border-[#CFCCC8] flex-shrink-0">
          <div className="flex items-center gap-4">
            <button
              onClick={handleBackToHub}
              className="w-9 h-9 rounded-lg bg-white border border-[#E0DCD1] hover:border-[#8B735B] hover:shadow-sm transition-all flex items-center justify-center"
            >
              <ArrowLeft className="w-5 h-5 text-[#8B735B]" />
            </button>
            <div>
              <p className="text-[10px] uppercase tracking-[0.3em] text-[#8B735B] font-medium">
                求职陪跑 · {stage.title}
              </p>
              <h1 className="mt-1 text-3xl font-black text-[#111111] tracking-tight leading-none">
                {stage.title}
              </h1>
            </div>
          </div>
        </div>

        <div className="flex-1 min-h-0 px-8 py-8 overflow-y-auto">
          <div className="h-full flex items-center justify-center">
            <div className="max-w-[560px] text-center">
              <div className="w-16 h-16 rounded-2xl bg-[#8B735B]/10 flex items-center justify-center mx-auto">
                <StageIcon className="w-8 h-8 text-[#8B735B]" />
              </div>
              <h2 className="mt-6 text-2xl font-bold text-[#111111]">
                {stage.title} 即将上线
              </h2>
              <p className="mt-4 text-sm text-[#666666] leading-relaxed">
                该功能正在开发中，将在后续版本中开放。先完成能力诊断和差距填补，为后续阶段做好准备。
              </p>
              <button
                onClick={handleBackToHub}
                className="mt-8 px-6 py-2.5 bg-[#8B735B] hover:bg-[#7A654D] text-white text-sm font-medium rounded-lg transition-colors"
              >
                返回 Hub
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Otherwise, render Hub with stage cards
  return (
    <div className="h-full min-h-0 flex flex-col">
      {/* Header */}
      <div className="px-8 pt-7 pb-5 border-b border-[#CFCCC8] flex-shrink-0">
        <div className="flex items-end justify-between gap-6">
          <div>
            <p className="text-[10px] uppercase tracking-[0.3em] text-[#8B735B] font-medium">
              求职陪跑
            </p>
            <h1 className="mt-2 text-3xl font-black text-[#111111] tracking-tight leading-none">
              选择你需要的陪跑阶段
            </h1>
            <p className="mt-2 text-sm text-[#666666] leading-relaxed max-w-[760px]">
              从能力诊断到 Offer 谈判，每个阶段独立进入，灵活安排你的求职节奏
            </p>
          </div>
        </div>
      </div>

      {/* Stage Cards Grid */}
      <div className="flex-1 min-h-0 px-8 py-8 overflow-y-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {stages.map((stage) => (
            <JourneyStageCard
              key={stage.id}
              {...stage}
              onSelect={(id) => {
                if (id === 'diagnosis') {
                  setDiagnosisFlow('form');
                  setJobSnapshot(null);
                  setDiagnosisReport(null);
                  setError(null);
                }
                onStageSelect(id);
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
