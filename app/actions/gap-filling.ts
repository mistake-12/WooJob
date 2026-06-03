'use server';

/**
 * 差距填补 Server Actions
 *
 * 职责：
 * 1. 读取最新诊断报告
 * 2. 基于诊断报告调用 LLM 生成阶段式行动计划
 * 3. 单项加入日程（复用 tasks 表）
 * 4. 保存行动计划到 ai_journey_artifacts
 */

import { createServerSupabaseClient } from '@/lib/supabase-server';
import type { DiagnosisReport } from '@/types/diagnosis';
import type { GapFillingPlan, GapFillingPhase, PlanItem } from '@/types/gap-filling';
import { getOrCreateJourney } from './journey-ai';

// ─────────────────────────────────────────────────────────────────────────────
// LLM 客户端
// ─────────────────────────────────────────────────────────────────────────────

function createLLMClient() {
  const apiKey =
    process.env.KIMI_API_KEY ||
    process.env.OPENAI_API_KEY ||
    process.env.DEEPSEEK_API_KEY ||
    '';

  if (!apiKey) {
    throw new Error('缺少 LLM API Key');
  }

  const { default: OpenAI } = require('openai');

  return new OpenAI({
    apiKey,
    baseURL: process.env.LLM_BASE_URL || undefined,
  });
}

function getLLMModel(): string {
  return process.env.LLM_MODEL || 'kimi-k2.6';
}

// ─────────────────────────────────────────────────────────────────────────────
// 工具函数
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 从 LLM 回复中提取 JSON
 */
function extractJsonFromReply(content: string): Record<string, unknown> | null {
  const codeBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (codeBlockMatch) {
    try {
      return JSON.parse(codeBlockMatch[1]);
    } catch {
      // 继续尝试
    }
  }

  const jsonMatch = content.match(/(\{[\s\S]*\})/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[1]);
    } catch {
      // 解析失败
    }
  }

  return null;
}

/**
 * 验证并清洗 GapFillingPlan
 */
function normalizePlan(raw: Record<string, unknown>, diagnosisId?: string): GapFillingPlan {
  const phases: GapFillingPhase[] = Array.isArray(raw.phases)
    ? raw.phases.map((p: unknown) => {
        const phase = p as Record<string, unknown>;
        const phaseType = (String(phase.type ?? 'learn')) as GapFillingPhase['type'];
        return {
          type: phaseType,
          label: String(phase.label ?? phaseType),
          items: Array.isArray(phase.items)
            ? phase.items.map((item: unknown, idx: number) => {
                const i = item as Record<string, unknown>;
                return {
                  id: String(i.id ?? `plan-item-${idx}-${Date.now()}`),
                  title: String(i.title ?? ''),
                  priority: (String(i.priority ?? 'medium')) as PlanItem['priority'],
                  estimatedHours: Number(i.estimatedHours ?? i.estimated_hours ?? 0),
                  completionCriteria: String(i.completionCriteria ?? i.completion_criteria ?? ''),
                  relatedGap: String(i.relatedGap ?? i.related_gap ?? ''),
                  notes: i.notes ? String(i.notes) : undefined,
                  addedToSchedule: false,
                };
              })
            : [],
        };
      })
    : [];

  return {
    title: String(raw.title ?? '能力提升行动计划'),
    basedOnDiagnosisId: diagnosisId,
    phases,
    createdAt: new Date().toISOString(),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. 获取最新诊断报告
// ─────────────────────────────────────────────────────────────────────────────

export interface GetLatestDiagnosisResult {
  report?: DiagnosisReport | null;
  error?: string;
}

/**
 * 从 ai_journey_artifacts 读取用户最新的诊断报告
 */
export async function getLatestDiagnosis(): Promise<GetLatestDiagnosisResult> {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: '未登录或会话已过期' };

    const journeyResult = await getOrCreateJourney();
    if (journeyResult.error || !journeyResult.journey) {
      return { error: journeyResult.error ?? '无法获取旅程' };
    }

    const journeyId = journeyResult.journey.id as string;

    const { data, error } = await supabase
      .from('ai_journey_artifacts')
      .select('*')
      .eq('journey_id', journeyId)
      .eq('stage', 'diagnosis')
      .eq('artifact_type', 'diagnosis_report')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      // 没有记录是正常情况（用户还没做过诊断）
      if (error.code === 'PGRST116') {
        return { report: null };
      }
      return { error: error.message };
    }

    const report = data.data as unknown as DiagnosisReport;
    return { report };
  } catch (err) {
    console.error('[getLatestDiagnosis] Unexpected error:', err);
    return { error: '获取诊断报告失败' };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. 获取已有行动计划
// ─────────────────────────────────────────────────────────────────────────────

export interface GetExistingPlanResult {
  plan?: GapFillingPlan | null;
  error?: string;
}

/**
 * 获取当前用户已有的差距填补行动计划
 */
export async function getExistingPlan(): Promise<GetExistingPlanResult> {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: '未登录或会话已过期' };

    const journeyResult = await getOrCreateJourney();
    if (journeyResult.error || !journeyResult.journey) {
      return { error: journeyResult.error ?? '无法获取旅程' };
    }

    const journeyId = journeyResult.journey.id as string;

    const { data, error } = await supabase
      .from('ai_journey_artifacts')
      .select('*')
      .eq('journey_id', journeyId)
      .eq('stage', 'gap_filling')
      .eq('artifact_type', 'gap_filling_plan')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return { plan: null };
      }
      return { error: error.message };
    }

    const plan = data.data as unknown as GapFillingPlan;
    // 确保所有项 addedToSchedule 初始为 false
    plan.phases.forEach((phase) => {
      phase.items.forEach((item) => {
        if (item.addedToSchedule === undefined) {
          item.addedToSchedule = false;
        }
      });
    });
    return { plan };
  } catch (err) {
    console.error('[getExistingPlan] Unexpected error:', err);
    return { error: '获取行动计划失败' };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. 生成行动计划（LLM）
// ─────────────────────────────────────────────────────────────────────────────

export interface GenerateActionPlanInput {
  diagnosisReport: DiagnosisReport;
}

export interface GenerateActionPlanResult {
  plan?: GapFillingPlan;
  error?: string;
}

function buildActionPlanSystemPrompt(report: DiagnosisReport): string {
  const gapsSummary = report.gaps
    .map((g) => `${g.skill}（优先级: ${g.priority}, 当前: ${g.currentLevel}/5, 要求: ${g.requiredLevel}/5, 建议: ${g.actionSuggestion}）`)
    .join('\n');

  return `你是 WooJob 的能力提升规划 Agent，负责基于能力诊断报告，为用户生成阶段式的学习与提升行动计划。

【诊断报告摘要】
- 目标岗位：${report.targetPosition}${report.company ? `\n- 公司：${report.company}` : ''}
- 总体匹配度：${report.overallMatch}/100
- 用户优势：${report.strengths.join('、') || '未识别'}
- 诊断总结：${report.summary}

【能力差距清单】
${gapsSummary}

【任务】
基于上述诊断报告，生成一个结构化的分阶段行动计划。计划分为四个阶段：

1. 📚 学习阶段 — 掌握差距项涉及的理论知识、方法论和工具基础
2. 🏋 练习阶段 — 通过实战练习、刷题、模拟等方式巩固所学技能
3. 🚀 项目产出阶段 — 通过实际项目验证所学，产出可展示的成果（如个人项目、开源贡献）
4. 📄 简历沉淀阶段 — 将新能力整合到简历中，形成新的竞争力描述

【输出格式】
严格输出以下 JSON 结构：

\`\`\`json
{
  "title": "针对{目标岗位}的能力提升计划",
  "phases": [
    {
      "type": "learn",
      "label": "📚 学习",
      "items": [
        {
          "id": "唯一标识（用英文短横线连接的小写字符串）",
          "title": "行动项标题",
          "priority": "high | medium | low",
          "estimatedHours": 预计耗时（小时，数字）,
          "completionCriteria": "具体的完成标准，可验证",
          "relatedGap": "关联的能力差距名称（从差距清单中选取）",
          "notes": "补充说明或建议资源"
        }
      ]
    },
    {
      "type": "practice",
      "label": "🏋 练习",
      "items": [...]
    },
    {
      "type": "project",
      "label": "🚀 项目产出",
      "items": [...]
    },
    {
      "type": "resume",
      "label": "📄 简历沉淀",
      "items": [...]
    }
  ]
}
\`\`\`

【规则】
1. 每个阶段至少包含 1-2 个具体的行动项
2. 优先级的参考判断：high = 岗位核心要求且差距 >= 3 分，medium = 差距 2 分，low = 差距 1 分
3. estimatedHours 要合理：学习类 5-20h，练习类 3-15h，项目类 10-40h，简历类 2-5h
4. completionCriteria 必须具体、可验证（例如"完成《数据结构与算法》第1-5章，并通过章节测试"而不是"学完课程"）
5. relatedGap 必须从上述差距清单中的 skill 字段精确匹配
6. 每个行动项的 id 使用唯一的小写英文短横线连接标识符
7. 严格输出上述 JSON 格式，不要任何额外文字，不要用 Markdown 代码块包裹`;
}

export async function generateActionPlan(
  input: GenerateActionPlanInput
): Promise<GenerateActionPlanResult> {
  const { diagnosisReport } = input;

  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: '未登录或会话已过期' };

    const client = createLLMClient();
    const model = getLLMModel();

    const systemPrompt = buildActionPlanSystemPrompt(diagnosisReport);
    const userMessage = '请基于上述诊断报告，生成我的分阶段能力提升行动计划。';

    const openaiMessages: Array<Record<string, unknown>> = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ];

    let reply = '';
    try {
      const response = await client.chat.completions.create({
        model,
        messages: openaiMessages as any,
        temperature: 0.4,
        max_tokens: 4000,
      });

      reply = response.choices[0]?.message?.content ?? '';
    } catch (llmError) {
      console.error('[generateActionPlan] LLM error:', llmError);
      return { error: 'AI 服务暂时不可用，请稍后重试' };
    }

    if (!reply.trim()) {
      return { error: 'AI 未返回有效结果，请重试' };
    }

    const parsed = extractJsonFromReply(reply);
    if (!parsed) {
      return { error: 'AI 返回的行动计划无法解析，请重试' };
    }

    const plan = normalizePlan(parsed);

    if (!plan.phases || plan.phases.length === 0) {
      return { error: 'AI 生成的行动计划不包含有效阶段，请重试' };
    }

    const totalItems = plan.phases.reduce((sum, p) => sum + p.items.length, 0);
    if (totalItems === 0) {
      return { error: 'AI 生成的行动计划中没有行动项，请重试' };
    }

    return { plan };
  } catch (err) {
    console.error('[generateActionPlan] Unexpected error:', err);
    return { error: '生成行动计划时发生错误，请稍后重试' };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. 保存行动计划到 artifact
// ─────────────────────────────────────────────────────────────────────────────

export interface SavePlanResult {
  artifactId?: string;
  error?: string;
}

/**
 * 保存差距填补行动计划到 ai_journey_artifacts
 */
export async function savePlan(
  plan: GapFillingPlan
): Promise<SavePlanResult> {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: '未登录或会话已过期' };

    const journeyResult = await getOrCreateJourney();
    if (journeyResult.error || !journeyResult.journey) {
      return { error: journeyResult.error ?? '无法获取旅程' };
    }

    const journeyId = journeyResult.journey.id as string;

    // 检查是否已存在 plan artifact
    const { data: existing } = await supabase
      .from('ai_journey_artifacts')
      .select('id')
      .eq('journey_id', journeyId)
      .eq('stage', 'gap_filling')
      .eq('artifact_type', 'gap_filling_plan')
      .limit(1)
      .single();

    if (existing) {
      const { error: updateError } = await supabase
        .from('ai_journey_artifacts')
        .update({
          data: plan as unknown as Record<string, unknown>,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id);

      if (updateError) {
        return { error: updateError.message };
      }

      return { artifactId: existing.id as string };
    }

    const { data: created, error: insertError } = await supabase
      .from('ai_journey_artifacts')
      .insert({
        journey_id: journeyId,
        user_id: user.id,
        stage: 'gap_filling',
        artifact_type: 'gap_filling_plan',
        data: plan as unknown as Record<string, unknown>,
      })
      .select('id')
      .single();

    if (insertError) {
      return { error: insertError.message };
    }

    return { artifactId: created.id as string };
  } catch (err) {
    console.error('[savePlan] Unexpected error:', err);
    return { error: '保存行动计划失败' };
  }
}
