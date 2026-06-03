/**
 * 能力诊断相关类型定义
 */

/** 岗位识别结果 */
export interface JobSnapshot {
  targetPosition: string;
  company?: string;
  jobSummary?: string;
  responsibilities: string[];
  requirements: string[];
  keywords: string[];
  inferredSkills: {
    name: string;
    category: 'knowledge' | 'experience' | 'tool' | 'soft_skill';
    importance: 'high' | 'medium' | 'low';
  }[];
}

/** 能力雷达维度 */
export interface RadarDimension {
  dimension: string;
  userScore: number;    // 1-5
  requiredScore: number; // 1-5
}

/** 能力差距项 */
export interface SkillGap {
  skill: string;
  category: 'knowledge' | 'experience' | 'tool' | 'soft_skill';
  priority: 'high' | 'medium' | 'low';
  currentLevel: number;    // 1-5
  requiredLevel: number;   // 1-5
  evidence: string;
  actionSuggestion: string;
}

/** 能力诊断报告 */
export interface DiagnosisReport {
  targetPosition: string;
  company?: string;
  overallMatch: number;  // 0-100
  strengths: string[];
  radar: RadarDimension[];
  gaps: SkillGap[];
  summary: string;
}

/** 诊断流程阶段 */
export type DiagnosisFlowStage = 'form' | 'preview' | 'report';
