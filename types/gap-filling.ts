/**
 * 差距填补相关类型定义
 */

/** 行动计划项 */
export interface PlanItem {
  id: string;
  title: string;
  priority: 'high' | 'medium' | 'low';
  estimatedHours: number;
  completionCriteria: string;
  relatedGap: string;
  notes?: string;
  addedToSchedule?: boolean;
}

/** 行动计划阶段 */
export interface GapFillingPhase {
  type: 'learn' | 'practice' | 'project' | 'resume';
  label: string;
  items: PlanItem[];
}

/** 差距填补行动计划 */
export interface GapFillingPlan {
  title: string;
  basedOnDiagnosisId?: string;
  phases: GapFillingPhase[];
  createdAt: string;
}

/** 阶段类型到展示配置的映射 */
export const PHASE_CONFIG: Record<GapFillingPhase['type'], { icon: string; label: string; description: string }> = {
  learn: {
    icon: '📚',
    label: '学习',
    description: '掌握差距项涉及的理论知识、方法论和工具基础',
  },
  practice: {
    icon: '🏋',
    label: '练习',
    description: '通过实战练习、刷题、模拟等方式巩固技能',
  },
  project: {
    icon: '🚀',
    label: '项目产出',
    description: '通过实际项目验证所学，产出可展示的成果',
  },
  resume: {
    icon: '📄',
    label: '简历沉淀',
    description: '将新能力整合到简历中，形成新的竞争力',
  },
};
