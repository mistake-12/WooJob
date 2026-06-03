'use client';

import { useState, useCallback } from 'react';
import { BarChart3, BookOpen, FileText, MessageSquare, Send, TrendingUp, ArrowLeft } from 'lucide-react';
import JourneyStageCard, { JourneyStageCardProps } from './JourneyStageCard';
import DiagnosisForm from './diagnosis/DiagnosisForm';
import JobPreviewCard from './diagnosis/JobPreviewCard';
import DiagnosisReportView from './diagnosis/DiagnosisReportView';
import GapFillingView from './gap/GapFillingView';
import type { JobSnapshot, DiagnosisReport } from '@/types/diagnosis';
import type { DiagnosisFlowStage } from '@/types/diagnosis';
import { generateDiagnosisReport, saveArtifact } from '@/app/actions/diagnosis';

const stages: Omit<JourneyStageCardProps, 'onSelect'>[] = [
  {
    id: 'diagnosis',
    title: '能力诊断',
    description: '基于目标岗位和简历，生成能力匹配度报告和差距清单',
    icon: BarChart3,
    status: 'available',
  },
  {
    id: 'gap-filling',
    title: '差距填补',
    description: '将诊断差距拆解为学习、练习、项目产出等行动计划',
    icon: BookOpen,
    status: 'available',
  },
  {
    id: 'resume',
    title: '简历优化',
    description: '根据岗位要求优化简历内容和结构，提升匹配度',
    icon: FileText,
    status: 'coming_soon',
  },
  {
    id: 'interview',
    title: '面试模拟',
    description: '模拟真实面试场景，提供针对性反馈和改进建议',
    icon: MessageSquare,
    status: 'coming_soon',
  },
  {
    id: 'delivery',
    title: '投递策略',
    description: '分析投递时机和渠道，制定个性化投递计划',
    icon: Send,
    status: 'coming_soon',
  },
  {
    id: 'offer',
    title: 'Offer 谈判',
    description: '提供薪资谈判技巧和策略建议，争取最优条件',
    icon: TrendingUp,
    status: 'coming_soon',
  },
];

interface JourneyHubProps {
  currentStage: string | null;
  onStageSelect: (stageId: string) => void;
  onBackToHub: () => void;
}

export default function JourneyHub({ currentStage, onStageSelect, onBackToHub }: JourneyHubProps) {
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
      // 不阻塞流程，继续生成报告
    }

    // 生成诊断报告
    const result = await generateDiagnosisReport({
      jobSnapshot: editedSnapshot,
      selfDescription: undefined, // MVP: 暂不读取简历正文，仅依赖快照
    });

    setIsProcessing(false);

    if (result.error) {
      setError(result.error);
    } else if (result.report) {
      setDiagnosisReport(result.report);
      setDiagnosisFlow('report');

      // 保存 diagnosis_report artifact（后台，不阻塞）
      saveArtifact({
        stage: 'diagnosis',
        artifactType: 'diagnosis_report',
        data: result.report as unknown as Record<string, unknown>,
      }).catch((err) => {
        console.warn('[JourneyHub] Failed to save diagnosis_report:', err);
      });
    } else {
      setError('AI 未返回诊断报告，请重试');
    }
  }, []);

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

  // ── 渲染诊断阶段内容 ──────────────────────────────────────────────────
  function renderDiagnosisContent() {
    if (error) {
      return (
        <div className="h-full min-h-0 flex flex-col">
          {/* Stage Header */}
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

    // 根据诊断流程阶段渲染不同内容
    if (diagnosisFlow === 'report' && diagnosisReport) {
      return (
        <div className="h-full min-h-0 flex flex-col">
          {/* Stage Header */}
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
          {/* Stage Header */}
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
        {/* Stage Header */}
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
          onBack={handleBackToHub}
          onGoToDiagnosis={() => {
            resetDiagnosis();
            onStageSelect('diagnosis');
          }}
        />
      );
    }

    // 其他阶段的占位内容
    const StageIcon = stage.icon;

    return (
      <div className="h-full min-h-0 flex flex-col">
        {/* Stage Header */}
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

        {/* Stage Content */}
        <div className="flex-1 min-h-0 px-8 py-8 overflow-y-auto">
          <div className="h-full flex items-center justify-center">
            <div className="max-w-[560px] text-center">
              <div className="w-16 h-16 rounded-2xl bg-[#8B735B]/10 flex items-center justify-center mx-auto">
                <StageIcon className="w-8 h-8 text-[#8B735B]" />
              </div>
              <h2 className="mt-6 text-2xl font-bold text-[#111111]">
                {stage.title}功能开发中
              </h2>
              <p className="mt-4 text-sm text-[#666666] leading-relaxed">
                {stage.description}
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
                // 点击新阶段时重置诊断状态
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
