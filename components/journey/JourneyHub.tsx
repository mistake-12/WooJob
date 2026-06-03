'use client';

import { BarChart3, BookOpen, FileText, MessageSquare, Send, TrendingUp } from 'lucide-react';
import JourneyStageCard, { JourneyStageCardProps } from './JourneyStageCard';

const stages: JourneyStageCardProps[] = [
  {
    id: 'diagnosis',
    title: '能力诊断',
    description: '基于目标岗位和简历，生成能力匹配度报告和差距清单',
    icon: BarChart3,
    status: 'available',
    route: '/journey/diagnosis',
  },
  {
    id: 'gap-filling',
    title: '差距填补',
    description: '将诊断差距拆解为学习、练习、项目产出等行动计划',
    icon: BookOpen,
    status: 'available',
    route: '/journey/gap-filling',
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

export default function JourneyHub() {
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
            <JourneyStageCard key={stage.id} {...stage} />
          ))}
        </div>
      </div>
    </div>
  );
}
