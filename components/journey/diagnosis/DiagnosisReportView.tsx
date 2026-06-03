'use client';

import { useMemo } from 'react';
import {
  Target, Zap, AlertTriangle, Lightbulb, TrendingUp,
  CheckCircle2, ArrowRight, BookOpen
} from 'lucide-react';
import type { DiagnosisReport, SkillGap, RadarDimension } from '@/types/diagnosis';

interface DiagnosisReportViewProps {
  report: DiagnosisReport;
  onBack: () => void;
  onGapFilling?: () => void;
}

/** priority -> 标签颜色 */
const PRIORITY_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  high: { bg: 'bg-red-50 border-red-200', text: 'text-red-700', label: '高优先级' },
  medium: { bg: 'bg-amber-50 border-amber-200', text: 'text-amber-700', label: '中优先级' },
  low: { bg: 'bg-gray-50 border-gray-200', text: 'text-gray-500', label: '低优先级' },
};

/** category -> 中文标签 */
const CATEGORY_LABELS: Record<string, string> = {
  knowledge: '理论知识',
  experience: '实践经验',
  tool: '工具使用',
  soft_skill: '软技能',
};

/** 根据匹配度返回颜色和环形百分比 */
function getMatchColor(score: number): { color: string; ring: string; label: string } {
  if (score >= 80) return { color: '#22C55E', ring: 'text-green-500', label: '高度匹配' };
  if (score >= 60) return { color: '#F59E0B', ring: 'text-amber-500', label: '基本匹配' };
  if (score >= 40) return { color: '#F97316', ring: 'text-orange-500', label: '部分匹配' };
  return { color: '#EF4444', ring: 'text-red-500', label: '差距较大' };
}

// ── 简易雷达图（CSS 实现）────────────────────────────────────────────────

function SimpleRadar({ dimensions }: { dimensions: RadarDimension[] }) {
  return (
    <div className="space-y-3">
      {dimensions.map((dim, i) => {
        const userPct = Math.round((dim.userScore / 5) * 100);
        const requiredPct = Math.round((dim.requiredScore / 5) * 100);
        const gap = dim.requiredScore - dim.userScore;

        return (
          <div key={i} className="flex items-center gap-3">
            <span className="w-[100px] text-xs font-medium text-[#666666] text-right flex-shrink-0">
              {dim.dimension}
            </span>
            <div className="flex-1 flex items-center gap-2">
              {/* 用户分数条 */}
              <div className="flex-1 h-2 bg-[#E8E5E0] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#8B735B] rounded-full transition-all duration-500"
                  style={{ width: `${userPct}%` }}
                />
              </div>
              <div className="flex items-center gap-1 min-w-[80px]">
                <span className="text-xs font-bold text-[#8B735B]">{dim.userScore}</span>
                <span className="text-[10px] text-[#999999]">/</span>
                <span className="text-xs font-bold text-[#111111]">{dim.requiredScore}</span>
                <span className={`text-[10px] ml-0.5 ${gap > 0 ? 'text-red-500' : 'text-green-500'}`}>
                  {gap > 0 ? `-${gap}` : gap === 0 ? '✓' : `+${Math.abs(gap)}`}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── 差距卡片 ──────────────────────────────────────────────────────────────

function GapCard({ gap }: { gap: SkillGap }) {
  const priorityStyle = PRIORITY_STYLES[gap.priority] ?? PRIORITY_STYLES.low;

  return (
    <div className="bg-white border border-[#E0DCD1] rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="text-sm font-bold text-[#111111]">{gap.skill}</h4>
            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full border ${priorityStyle.bg} ${priorityStyle.text}`}>
              {priorityStyle.label}
            </span>
          </div>
          <span className="text-[10px] text-[#999999] uppercase tracking-wider">
            {CATEGORY_LABELS[gap.category] ?? gap.category}
          </span>
        </div>

        {/* 等级对比 */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <div className="flex flex-col items-center">
            <span className="text-[10px] text-[#999999]">当前</span>
            <span className="w-7 h-7 rounded-full bg-[#F5F2EE] flex items-center justify-center text-xs font-bold text-[#8B735B]">
              {gap.currentLevel}
            </span>
          </div>
          <ArrowRight className="w-3 h-3 text-[#999999]" />
          <div className="flex flex-col items-center">
            <span className="text-[10px] text-[#999999]">要求</span>
            <span className="w-7 h-7 rounded-full bg-[#8B735B]/10 flex items-center justify-center text-xs font-bold text-[#8B735B]">
              {gap.requiredLevel}
            </span>
          </div>
          <span className="text-xs font-bold text-red-500 ml-1">
            -{gap.requiredLevel - gap.currentLevel}
          </span>
        </div>
      </div>

      {/* 证据 */}
      <div className="flex items-start gap-2 mb-2">
        <AlertTriangle className="w-3.5 h-3.5 text-[#8B735B]/60 mt-0.5 flex-shrink-0" />
        <p className="text-xs text-[#666666] leading-relaxed">{gap.evidence}</p>
      </div>

      {/* 建议行动 */}
      <div className="flex items-start gap-2 bg-[#F9F8F6] rounded-md p-2.5 border border-[#F0EDE8]">
        <Lightbulb className="w-3.5 h-3.5 text-[#8B735B] mt-0.5 flex-shrink-0" />
        <p className="text-xs text-[#333333] leading-relaxed font-medium">{gap.actionSuggestion}</p>
      </div>
    </div>
  );
}

// ── 主组件 ───────────────────────────────────────────────────────────────

export default function DiagnosisReportView({ report, onBack, onGapFilling }: DiagnosisReportViewProps) {
  const matchInfo = getMatchColor(report.overallMatch);

  // 按优先级排序的差距
  const sortedGaps = useMemo(() => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return [...report.gaps].sort(
      (a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]
    );
  }, [report.gaps]);

  const highCount = report.gaps.filter((g) => g.priority === 'high').length;
  const mediumCount = report.gaps.filter((g) => g.priority === 'medium').length;
  const lowCount = report.gaps.filter((g) => g.priority === 'low').length;

  return (
    <div className="h-full min-h-0 flex flex-col">
      {/* 内容区 */}
      <div className="flex-1 min-h-0 overflow-y-auto px-8 py-6">
        <div className="max-w-[720px] mx-auto space-y-8">

          {/* ── 总体匹配度 ──────────────────────────────────────────────── */}
          <div className="bg-white border border-[#E0DCD1] rounded-xl p-6 shadow-sm">
            <div className="flex items-start gap-6">
              {/* 左侧：匹配度大数字 */}
              <div className="flex-shrink-0 flex flex-col items-center">
                <div className="relative w-[100px] h-[100px] flex items-center justify-center">
                  {/* 简易环形进度 */}
                  <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
                    <circle
                      cx="50" cy="50" r="42"
                      fill="none"
                      stroke="#F0EDE8"
                      strokeWidth="8"
                    />
                    <circle
                      cx="50" cy="50" r="42"
                      fill="none"
                      stroke={matchInfo.color}
                      strokeWidth="8"
                      strokeLinecap="round"
                      strokeDasharray={`${(report.overallMatch / 100) * 264} 264`}
                      className="transition-all duration-700 ease-out"
                    />
                  </svg>
                  <div className="relative flex flex-col items-center">
                    <span className="text-3xl font-black text-[#111111]">{report.overallMatch}</span>
                    <span className="text-[10px] text-[#999999]">/100</span>
                  </div>
                </div>
                <span className={`text-xs font-medium mt-1 ${matchInfo.ring}`}>{matchInfo.label}</span>
              </div>

              {/* 右侧：岗位信息 + 概述 */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Target className="w-4 h-4 text-[#8B735B]" />
                  <h3 className="text-lg font-bold text-[#111111]">{report.targetPosition}</h3>
                </div>
                {report.company && (
                  <p className="text-sm text-[#666666] mb-3">{report.company}</p>
                )}
                <p className="text-sm text-[#333333] leading-relaxed">{report.summary}</p>
              </div>
            </div>
          </div>

          {/* ── 优势 ────────────────────────────────────────────────────── */}
          {report.strengths.length > 0 && (
            <div className="bg-white border border-[#E0DCD1] rounded-xl p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                <h3 className="text-sm font-bold text-[#111111] uppercase tracking-wider">你的优势</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {report.strengths.map((s, i) => (
                  <span
                    key={i}
                    className="inline-block px-3 py-1.5 rounded-full text-xs font-medium bg-green-50 border border-green-200 text-green-700"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* ── 能力雷达 ────────────────────────────────────────────────── */}
          {report.radar.length > 0 && (
            <div className="bg-white border border-[#E0DCD1] rounded-xl p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-4 h-4 text-[#8B735B]" />
                <h3 className="text-sm font-bold text-[#111111] uppercase tracking-wider">能力评估</h3>
                <span className="text-[10px] text-[#999999] ml-2">
                  显示各维度当前水平 vs 岗位要求水平
                </span>
              </div>
              <SimpleRadar dimensions={report.radar} />
            </div>
          )}

          {/* ── 差距清单 ────────────────────────────────────────────────── */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-[#8B735B]" />
                <h3 className="text-sm font-bold text-[#111111] uppercase tracking-wider">能力差距清单</h3>
              </div>
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1 text-[10px] text-red-600">
                  <span className="w-2 h-2 rounded-full bg-red-400" />
                  高 {highCount}
                </span>
                <span className="flex items-center gap-1 text-[10px] text-amber-600">
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                  中 {mediumCount}
                </span>
                <span className="flex items-center gap-1 text-[10px] text-gray-500">
                  <span className="w-2 h-2 rounded-full bg-gray-300" />
                  低 {lowCount}
                </span>
              </div>
            </div>

            <div className="space-y-3">
              {sortedGaps.map((gap, i) => (
                <GapCard key={i} gap={gap} />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 底部操作区 */}
      <div className="flex-shrink-0 px-8 py-4 border-t border-[#CFCCC8] bg-[#F5F2EE]">
        <div className="max-w-[720px] mx-auto flex items-center justify-between">
          <button
            type="button"
            onClick={onBack}
            className="px-4 py-2.5 text-sm text-[#666666] hover:text-[#111111] hover:bg-[#E8E5E0] rounded-lg transition-colors"
          >
            返回 Hub
          </button>

          {onGapFilling && (
            <button
              type="button"
              onClick={onGapFilling}
              className="flex items-center gap-2 px-6 py-2.5 bg-[#8B735B] hover:bg-[#7A654D] text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
            >
              <BookOpen className="w-4 h-4" />
              基于此报告生成学习计划
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
