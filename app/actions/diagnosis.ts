'use server';

/**
 * 能力诊断 Server Actions
 *
 * 职责：
 * 1. 识别岗位信息（文字 JD + 图片截图）
 * 2. 生成能力诊断报告（对比简历/自述与岗位要求）
 * 3. 保存 artifact 到 ai_journey_artifacts
 */

import { createServerSupabaseClient } from '@/lib/supabase-server';
import type { AIMessageAttachment } from '@/types/database';
import type { JobSnapshot, DiagnosisReport } from '@/types/diagnosis';
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
  // 策略 1：匹配 ```json ... ``` 代码块
  const codeBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (codeBlockMatch) {
    try {
      return JSON.parse(codeBlockMatch[1]);
    } catch {
      // 继续尝试其他策略
    }
  }

  // 策略 2：匹配整个 JSON 对象
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
 * 验证并清洗 JobSnapshot
 */
function normalizeJobSnapshot(raw: Record<string, unknown>): JobSnapshot {
  return {
    targetPosition: String(raw.targetPosition ?? raw.target_position ?? ''),
    company: raw.company ? String(raw.company) : undefined,
    jobSummary: raw.jobSummary ?? raw.job_summary ? String(raw.jobSummary ?? raw.job_summary) : undefined,
    responsibilities: Array.isArray(raw.responsibilities)
      ? raw.responsibilities.map(String)
      : [],
    requirements: Array.isArray(raw.requirements)
      ? raw.requirements.map(String)
      : [],
    keywords: Array.isArray(raw.keywords) ? raw.keywords.map(String) : [],
    inferredSkills: (() => {
      const skills = raw.inferredSkills ?? raw.inferred_skills;
      if (Array.isArray(skills)) {
        return skills.map((s: unknown) => {
          const skill = s as Record<string, unknown>;
          return {
            name: String(skill.name ?? ''),
            category: (String(skill.category ?? 'knowledge')) as JobSnapshot['inferredSkills'][number]['category'],
            importance: (String(skill.importance ?? 'medium')) as JobSnapshot['inferredSkills'][number]['importance'],
          };
        });
      }
      return [];
    })(),
  };
}

/**
 * 验证并清洗 DiagnosisReport
 */
function normalizeDiagnosisReport(raw: Record<string, unknown>): DiagnosisReport {
  return {
    targetPosition: String(raw.targetPosition ?? raw.target_position ?? ''),
    company: raw.company ? String(raw.company) : undefined,
    overallMatch: Math.min(100, Math.max(0, Number(raw.overallMatch ?? raw.overall_match ?? 0))),
    strengths: Array.isArray(raw.strengths) ? raw.strengths.map(String) : [],
    radar: Array.isArray(raw.radar)
      ? raw.radar.map((d: unknown) => {
          const dim = d as Record<string, unknown>;
          return {
            dimension: String(dim.dimension ?? ''),
            userScore: Math.min(5, Math.max(1, Number(dim.userScore ?? dim.user_score ?? 1))),
            requiredScore: Math.min(5, Math.max(1, Number(dim.requiredScore ?? dim.required_score ?? 1))),
          };
        })
      : [],
    gaps: Array.isArray(raw.gaps)
      ? raw.gaps.map((g: unknown) => {
          const gap = g as Record<string, unknown>;
          return {
            skill: String(gap.skill ?? ''),
            category: (String(gap.category ?? 'knowledge')) as 'knowledge' | 'experience' | 'tool' | 'soft_skill',
            priority: (String(gap.priority ?? 'medium')) as 'high' | 'medium' | 'low',
            currentLevel: Math.min(5, Math.max(1, Number(gap.currentLevel ?? gap.current_level ?? 1))),
            requiredLevel: Math.min(5, Math.max(1, Number(gap.requiredLevel ?? gap.required_level ?? 1))),
            evidence: String(gap.evidence ?? ''),
            actionSuggestion: String(gap.actionSuggestion ?? gap.action_suggestion ?? ''),
          };
        })
      : [],
    summary: String(raw.summary ?? ''),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. 识别岗位信息
// ─────────────────────────────────────────────────────────────────────────────

export interface IdentifyJobPositionInput {
  textJD?: string;
  imageBase64?: string;
  targetPosition?: string;
  targetCompany?: string;
}

export interface IdentifyJobPositionResult {
  snapshot?: JobSnapshot;
  error?: string;
}

const JOB_IDENTIFY_SYSTEM_PROMPT = `你是 WooJob 的能力诊断 Agent，专门负责从岗位描述（JD）文字或截图中提取结构化的岗位信息。

【任务】
分析用户提供的岗位信息，提取并输出下述 JSON 结构。

【输出格式】
\`\`\`json
{
  "targetPosition": "岗位名称（必填）",
  "company": "公司名称（如果可以识别，否则省略此字段）",
  "jobSummary": "岗位一句话概述",
  "responsibilities": ["职责1", "职责2"],
  "requirements": ["要求1", "要求2"],
  "keywords": ["关键词1", "关键词2"],
  "inferredSkills": [
    {
      "name": "技能名称",
      "category": "knowledge（理论知识）| experience（实践经验）| tool（工具使用）| soft_skill（软技能）",
      "importance": "high | medium | low"
    }
  ]
}
\`\`\`

【规则】
1. 仅提取你能明确识别的内容，不要编造信息
2. targetPosition 是必填字段，必须从 JD 中提取
3. responsibilities 和 requirements 从 JD 原文中概括，每条一句话
4. keywords 提取 JD 中高频出现的技术栈、工具、能力词
5. inferredSkills 基于 JD 推断岗位需要的核心能力，4-8 项为宜
6. category 分类标准：
   - knowledge：理论知识/方法论（如"数据结构"、"产品设计方法论"）
   - experience：需要实践积累的经验（如"C端产品经验"、"带领团队"）
   - tool：具体工具/语言/框架（如"Python"、"Figma"、"SQL"）
   - soft_skill：软技能（如"沟通能力"、"项目推动力"）
7. 严格输出上述 JSON 格式，不要任何额外文字`;

/**
 * 识别岗位信息（支持文字 JD 和图片截图）
 */
export async function identifyJobPosition(
  input: IdentifyJobPositionInput
): Promise<IdentifyJobPositionResult> {
  const { textJD, imageBase64, targetPosition, targetCompany } = input;

  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: '未登录或会话已过期' };

    const client = createLLMClient();
    const model = getLLMModel();

    // 构建用户消息
    const userPromptParts: string[] = [];

    if (targetPosition) {
      userPromptParts.push(`用户填写的目标岗位：${targetPosition}`);
    }
    if (targetCompany) {
      userPromptParts.push(`用户填写的目标公司：${targetCompany}`);
    }

    if (textJD) {
      userPromptParts.push(`以下是岗位描述（JD）文字：\n\n${textJD}`);
    }

    if (imageBase64) {
      userPromptParts.push('请分析下方的岗位截图/JD截图，提取其中的岗位信息。');
    }

    const userContent = userPromptParts.join('\n\n');

    // 构建消息
    type ContentPart = { type: 'text'; text: string } | { type: 'image_url'; image_url: { url: string } };

    let userMessageContent: string | ContentPart[];

    if (imageBase64) {
      const parts: ContentPart[] = [];
      if (userContent) {
        parts.push({ type: 'text', text: userContent });
      }
      parts.push({
        type: 'image_url',
        image_url: { url: imageBase64 },
      });
      userMessageContent = parts;
    } else {
      userMessageContent = userContent;
    }

    const openaiMessages: Array<Record<string, unknown>> = [
      { role: 'system', content: JOB_IDENTIFY_SYSTEM_PROMPT },
      { role: 'user', content: userMessageContent },
    ];

    // 调用 LLM
    let reply = '';
    try {
      const response = await client.chat.completions.create({
        model,
        messages: openaiMessages as any,
        temperature: 0.3,
        max_tokens: 3000,
      });

      reply = response.choices[0]?.message?.content ?? '';
    } catch (llmError) {
      console.error('[identifyJobPosition] LLM error:', llmError);
      return { error: 'AI 服务暂时不可用，请稍后重试' };
    }

    if (!reply.trim()) {
      return { error: 'AI 未返回有效结果，请重试' };
    }

    // 解析 JSON
    const parsed = extractJsonFromReply(reply);
    if (!parsed) {
      return { error: 'AI 返回的结果无法解析，请检查输入内容后重试' };
    }

    const snapshot = normalizeJobSnapshot(parsed);

    if (!snapshot.targetPosition) {
      return { error: '未能识别到岗位名称，请补充更多 JD 信息后重试' };
    }

    return { snapshot };
  } catch (err) {
    console.error('[identifyJobPosition] Unexpected error:', err);
    return { error: '发生未知错误，请稍后重试' };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. 生成能力诊断报告
// ─────────────────────────────────────────────────────────────────────────────

export interface GenerateDiagnosisReportInput {
  jobSnapshot: JobSnapshot;
  resumeText?: string;
  selfDescription?: string;
}

export interface GenerateDiagnosisReportResult {
  report?: DiagnosisReport;
  error?: string;
}

function buildDiagnosisSystemPrompt(snapshot: JobSnapshot, hasResume: boolean, hasSelfDesc: boolean): string {
  const skillsSummary = snapshot.inferredSkills
    .map((s) => `${s.name}（${s.category}, 重要性: ${s.importance}）`)
    .join('；');

  return `你是 WooJob 的能力诊断 Agent，负责生成结构化的能力诊断报告。

【岗位信息】
- 岗位名称：${snapshot.targetPosition}${snapshot.company ? `\n- 公司：${snapshot.company}` : ''}
- 核心职责：${snapshot.responsibilities.join('；') || '未指定'}
- 任职要求：${snapshot.requirements.join('；') || '未指定'}
- 关键词：${snapshot.keywords.join('、') || '未指定'}
- 推断的核心能力：${skillsSummary || '未指定'}

${hasResume || hasSelfDesc ? '【用户信息】' : ''}
${hasResume ? `用户提供了简历内容，请基于简历评估其当前能力水平。` : ''}
${hasSelfDesc ? `用户提供了自我描述，请结合自我描述评估。` : ''}
${!hasResume && !hasSelfDesc ? '用户未提供简历或自我描述，请仅基于岗位要求生成诊断模板（所有用户评分为默认值 1，并在 evidence 中注明"未提供简历，此为模板评分"）。' : ''}

【输出要求】
基于岗位要求${hasResume || hasSelfDesc ? '与用户简历/自述' : ''}，生成以下 JSON 结构的能力诊断报告：

\`\`\`json
{
  "targetPosition": "${snapshot.targetPosition}",
  "company": ${snapshot.company ? `"${snapshot.company}"` : 'null'},
  "overallMatch": 0-100 的总体匹配度评分,
  "strengths": ["优势1", "优势2"],
  "radar": [
    { "dimension": "维度名称", "userScore": 1-5, "requiredScore": 3-5 }
  ],
  "gaps": [
    {
      "skill": "技能/能力名称",
      "category": "knowledge | experience | tool | soft_skill",
      "priority": "high | medium | low",
      "currentLevel": 1-5,
      "requiredLevel": 1-5,
      "evidence": "评估依据说明",
      "actionSuggestion": "具体的提升建议"
    }
  ],
  "summary": "总体评估说明，2-3句话"
}
\`\`\`

【规则】
1. radar 维度保持在 5-7 个，覆盖岗位核心能力维度
2. gaps 列出 4-8 个关键差距项
3. priority 判断：差距 >= 3 分为 high，差距 = 2 分为 medium，差距 = 1 分为 low
4. evidence 要具体，引用 JD 或简历中的依据
5. actionSuggestion 要可执行，给出具体方向
6. 严格输出 JSON，不要任何额外文字
7. 如果用户没有提供简历，userScore 全部设为 1，并在 evidence 中说明`;
}

export async function generateDiagnosisReport(
  input: GenerateDiagnosisReportInput
): Promise<GenerateDiagnosisReportResult> {
  const { jobSnapshot, resumeText, selfDescription } = input;

  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: '未登录或会话已过期' };

    const client = createLLMClient();
    const model = getLLMModel();

    const systemPrompt = buildDiagnosisSystemPrompt(
      jobSnapshot,
      !!resumeText,
      !!selfDescription
    );

    // 构建用户消息（含简历和自述）
    const userParts: string[] = [];
    if (resumeText) {
      userParts.push(`【简历内容】\n\n${resumeText.slice(0, 4000)}`);
    }
    if (selfDescription) {
      userParts.push(`【自我描述】\n\n${selfDescription}`);
    }
    userParts.push('请基于以上信息生成能力诊断报告。');

    const openaiMessages: Array<Record<string, unknown>> = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userParts.join('\n\n') },
    ];

    let reply = '';
    try {
      const response = await client.chat.completions.create({
        model,
        messages: openaiMessages as any,
        temperature: 0.3,
        max_tokens: 4000,
      });

      reply = response.choices[0]?.message?.content ?? '';
    } catch (llmError) {
      console.error('[generateDiagnosisReport] LLM error:', llmError);
      return { error: 'AI 服务暂时不可用，请稍后重试' };
    }

    if (!reply.trim()) {
      return { error: 'AI 未返回有效结果，请重试' };
    }

    const parsed = extractJsonFromReply(reply);
    if (!parsed) {
      return { error: 'AI 返回的诊断报告无法解析，请重试' };
    }

    const report = normalizeDiagnosisReport(parsed);

    if (!report.targetPosition) {
      return { error: '诊断报告缺少岗位名称，请重试' };
    }

    return { report };
  } catch (err) {
    console.error('[generateDiagnosisReport] Unexpected error:', err);
    return { error: '生成诊断报告时发生错误，请稍后重试' };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. 保存 artifact
// ─────────────────────────────────────────────────────────────────────────────

export interface SaveArtifactInput {
  stage: string;
  artifactType: string;
  data: Record<string, unknown>;
  /** 可选：指定 journeyId，不传则自动获取或创建最新一条 */
  journeyId?: string;
}

export interface SaveArtifactResult {
  artifactId?: string;
  error?: string;
}

/**
 * 保存 artifact 到 ai_journey_artifacts 表
 * 自动获取或创建当前用户的 journey
 */
export async function saveArtifact(
  input: SaveArtifactInput
): Promise<SaveArtifactResult> {
  const { stage, artifactType, data, journeyId: inputJourneyId } = input;

  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: '未登录或会话已过期' };

    // 获取或创建 journey：优先使用传入的 journeyId
    let journeyId: string;
    if (inputJourneyId) {
      // 验证归属
      const { data: owned } = await supabase
        .from('ai_journeys')
        .select('id')
        .eq('id', inputJourneyId)
        .eq('user_id', user.id)
        .single();
      if (!owned) return { error: '陪跑记录不存在或无权访问' };
      journeyId = inputJourneyId;
    } else {
      const journeyResult = await getOrCreateJourney();
      if (journeyResult.error || !journeyResult.journey) {
        return { error: journeyResult.error ?? '无法获取旅程' };
      }
      journeyId = journeyResult.journey.id as string;
    }

    // 检查是否已存在同 stage + artifactType 的记录
    const { data: existing } = await supabase
      .from('ai_journey_artifacts')
      .select('id')
      .eq('journey_id', journeyId)
      .eq('stage', stage)
      .eq('artifact_type', artifactType)
      .limit(1)
      .single();

    if (existing) {
      // 更新已存在的记录
      const { error: updateError } = await supabase
        .from('ai_journey_artifacts')
        .update({
          data,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id);

      if (updateError) {
        return { error: updateError.message };
      }

      return { artifactId: existing.id as string };
    }

    // 插入新记录
    const { data: created, error: insertError } = await supabase
      .from('ai_journey_artifacts')
      .insert({
        journey_id: journeyId,
        user_id: user.id,
        stage,
        artifact_type: artifactType,
        data,
      })
      .select('id')
      .single();

    if (insertError) {
      return { error: insertError.message };
    }

    return { artifactId: created.id as string };
  } catch (err) {
    console.error('[saveArtifact] Unexpected error:', err);
    return { error: '保存数据失败' };
  }
}
