'use server';

/**
 * 求职陪跑 Journey AI Server Actions
 *
 * 职责：
 * 1. Journey 管理（获取或创建用户的单一长期 journey）
 * 2. Guide Agent 消息管理（存储 + LLM 调用）
 * 3. Journey 上下文注入（profile、阶段、诊断/计划状态）
 *
 * 与普通 AI 助手（ai.ts）完全分开，存储到 ai_journey_messages 表。
 */

import { createServerSupabaseClient } from '@/lib/supabase-server';
import type { AIMessageAttachment } from '@/types/database';
import { buildGuideSystemPrompt, type GuideAgentContext } from './guide-prompt';

// ─────────────────────────────────────────────────────────────────────────────
// Journey 消息类型
// ─────────────────────────────────────────────────────────────────────────────

export interface JourneyMessage {
  id: string;
  journeyId: string;
  role: 'user' | 'assistant';
  content: string;
  attachments: AIMessageAttachment[];
  createdAt: string;
}

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
// 数据库行映射
// ─────────────────────────────────────────────────────────────────────────────

function mapDbJourneyMessage(row: Record<string, unknown>): JourneyMessage {
  return {
    id: row.id as string,
    journeyId: row.journey_id as string,
    role: row.role as JourneyMessage['role'],
    content: row.content as string,
    attachments: typeof row.attachments === 'string' ? JSON.parse(row.attachments) : ((row.attachments ?? []) as AIMessageAttachment[]),
    createdAt: row.created_at as string,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Journey 管理
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 获取或创建当前用户的单一长期 Journey
 * MVP：每个用户只有一条 journey
 */
export async function getOrCreateJourney(): Promise<{ journey?: Record<string, unknown>; error?: string }> {
  try {
    const supabase = await createServerSupabaseClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: '未登录或会话已过期' };

    // 先查现有 journey
    const { data: existing } = await supabase
      .from('ai_journeys')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (existing) {
      return { journey: existing };
    }

    // 不存在则创建
    const { data: created, error: createError } = await supabase
      .from('ai_journeys')
      .insert({
        user_id: user.id,
        title: '求职陪跑',
        current_stage: 'hub',
        stages: [],
      })
      .select('*')
      .single();

    if (createError) {
      return { error: createError.message };
    }

    return { journey: created };
  } catch (err) {
    console.error('[getOrCreateJourney] Unexpected error:', err);
    return { error: '获取或创建旅程失败' };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Guide Agent 消息管理
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 获取 Journey 的 Guide Agent 消息历史
 */
export async function getJourneyGuideMessages(
  journeyId: string
): Promise<{ messages?: JourneyMessage[]; error?: string }> {
  try {
    const supabase = await createServerSupabaseClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: '未登录或会话已过期' };

    // 验证 journey 归属
    const { data: journey, error: journeyError } = await supabase
      .from('ai_journeys')
      .select('id')
      .eq('id', journeyId)
      .eq('user_id', user.id)
      .single();

    if (journeyError || !journey) {
      return { error: '旅程不存在或无权访问' };
    }

    const { data, error } = await supabase
      .from('ai_journey_messages')
      .select('*')
      .eq('journey_id', journeyId)
      .eq('agent_type', 'guide')
      .order('created_at', { ascending: true });

    if (error) return { error: error.message };

    return { messages: (data ?? []).map(mapDbJourneyMessage) };
  } catch (err) {
    console.error('[getJourneyGuideMessages] Unexpected error:', err);
    return { error: '获取消息历史失败' };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 上下文注入：收集 Guide Agent 所需的 journey 上下文
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 收集 Guide Agent 所需的上下文信息
 */
async function collectGuideContext(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  userId: string,
  journeyId: string
): Promise<GuideAgentContext> {
  const ctx: GuideAgentContext = {
    currentStage: 'hub',
    hasDiagnosis: false,
    hasPlan: false,
  };

  try {
    // 1. 获取 journey 当前阶段
    const { data: journey } = await supabase
      .from('ai_journeys')
      .select('current_stage')
      .eq('id', journeyId)
      .single();

    if (journey?.current_stage) {
      ctx.currentStage = journey.current_stage as string;
    }

    // 2. 检查是否有能力诊断报告（diagnosis artifact）
    const { data: diagnosisArtifact } = await supabase
      .from('ai_journey_artifacts')
      .select('id')
      .eq('journey_id', journeyId)
      .eq('stage', 'diagnosis')
      .limit(1)
      .single();

    ctx.hasDiagnosis = !!diagnosisArtifact;

    // 3. 检查是否有行动计划（gap_filling artifact）
    const { data: planArtifact } = await supabase
      .from('ai_journey_artifacts')
      .select('id')
      .eq('journey_id', journeyId)
      .eq('stage', 'gap_filling')
      .limit(1)
      .single();

    ctx.hasPlan = !!planArtifact;

    // 4. 获取用户目标岗位
    const { data: profile } = await supabase
      .from('profiles')
      .select('target_role')
      .eq('id', userId)
      .single();

    if (profile?.target_role) {
      ctx.targetPosition = profile.target_role as string;
    }
  } catch {
    // 上下文收集失败不影响主流程，使用默认值
    console.warn('[collectGuideContext] Partial context collection failed, using defaults');
  }

  return ctx;
}

// ─────────────────────────────────────────────────────────────────────────────
// 发送消息给 Guide Agent
// ─────────────────────────────────────────────────────────────────────────────

export interface SendJourneyGuideMessageInput {
  journeyId: string;
  stage?: string;           // 用户当前浏览的阶段（可选）
  content: string;
  attachments?: AIMessageAttachment[];
}

export interface SendJourneyGuideMessageResult {
  message?: JourneyMessage;  // AI 回复消息
  error?: string;
}

/**
 * 发送消息给 Guide Agent（LLM 调用 + 持久化）
 */
export async function sendJourneyGuideMessage(
  input: SendJourneyGuideMessageInput
): Promise<SendJourneyGuideMessageResult> {
  const { journeyId, content, attachments = [] } = input;

  try {
    const supabase = await createServerSupabaseClient();

    // ── 认证 ──────────────────────────────────────────────────────────────
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: '未登录或会话已过期' };

    // ── 验证 journey 归属 ────────────────────────────────────────────────
    const { data: journey, error: journeyError } = await supabase
      .from('ai_journeys')
      .select('id')
      .eq('id', journeyId)
      .eq('user_id', user.id)
      .single();

    if (journeyError || !journey) {
      return { error: '旅程不存在或无权访问' };
    }

    // ── 1. 保存用户消息 ─────────────────────────────────────────────────
    const { error: insertUserError } = await supabase
      .from('ai_journey_messages')
      .insert({
        journey_id: journeyId,
        user_id: user.id,
        role: 'user',
        agent_type: 'guide',
        content,
        attachments: JSON.stringify(attachments),
        extra_data: null,
      });

    if (insertUserError) {
      console.error('[sendJourneyGuideMessage] Failed to save user message:', insertUserError);
      return { error: '发送消息失败，请重试' };
    }

    // ── 2. 获取历史消息（最近 20 条）──────────────────────────────────
    const { data: historyRows } = await supabase
      .from('ai_journey_messages')
      .select('role, content')
      .eq('journey_id', journeyId)
      .eq('agent_type', 'guide')
      .order('created_at', { ascending: true })
      .limit(30);

    const history = (historyRows ?? [])
      .filter((m) => m.content && m.content.trim().length > 0)
      .map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content as string,
      }));

    // ── 3. 收集上下文 + 构建 prompt ───────────────────────────────────
    const guideContext = await collectGuideContext(supabase, user.id, journeyId);

    // 如果前端传了 stage，优先使用前端的（反映用户当前浏览位置）
    if (input.stage) {
      guideContext.currentStage = input.stage;
    }

    const systemPrompt = buildGuideSystemPrompt(guideContext);

    // ── 4. 构建 LLM 请求 ───────────────────────────────────────────────
    const client = createLLMClient();
    const model = getLLMModel();

    let userMessageContent: string | Array<{ type: 'text'; text: string } | { type: 'image_url'; image_url: { url: string } }>;

    if (attachments.length > 0) {
      userMessageContent = [
        ...attachments.map((a) => ({
          type: 'image_url' as const,
          image_url: { url: a.url },
        })),
        ...(content.trim() ? [{ type: 'text' as const, text: content }] : []),
      ];
    } else {
      userMessageContent = content;
    }

    const openaiMessages: Array<Record<string, unknown>> = [
      { role: 'system', content: systemPrompt },
      ...history.map((m) => ({ role: m.role, content: m.content })),
      { role: 'user', content: userMessageContent },
    ];

    // ── 5. 调用 LLM ────────────────────────────────────────────────────
    let reply = '';

    try {
      const response = await client.chat.completions.create({
        model,
        messages: openaiMessages as any,
        temperature: parseFloat(process.env.LLM_TEMPERATURE ?? '0.7'),
        max_tokens: parseInt(process.env.LLM_MAX_TOKENS ?? '2000'),
      });

      reply = response.choices[0]?.message?.content ?? '';
    } catch (llmError) {
      console.error('[sendJourneyGuideMessage] LLM API error:', llmError);
      const errorReply = 'AI 教练暂时无法回复，请稍后重试。';
      await supabase.from('ai_journey_messages').insert({
        journey_id: journeyId,
        user_id: user.id,
        role: 'assistant',
        agent_type: 'guide',
        content: errorReply,
        attachments: JSON.stringify([]),
        extra_data: null,
      });
      return { error: errorReply };
    }

    if (!reply.trim()) {
      return { error: 'AI 教练未返回有效回复，请重试' };
    }

    // ── 6. 保存 AI 回复 ────────────────────────────────────────────────
    const { data: savedMsg, error: saveError } = await supabase
      .from('ai_journey_messages')
      .insert({
        journey_id: journeyId,
        user_id: user.id,
        role: 'assistant',
        agent_type: 'guide',
        content: reply,
        attachments: JSON.stringify([]),
        extra_data: null,
      })
      .select()
      .single();

    if (saveError) {
      console.error('[sendJourneyGuideMessage] Failed to save AI reply:', saveError);
      // 仍然返回消息（已生成，只是没存进 DB）
    }

    const resultMessage: JourneyMessage = savedMsg
      ? mapDbJourneyMessage(savedMsg)
      : {
          id: `temp-${Date.now()}`,
          journeyId,
          role: 'assistant',
          content: reply,
          attachments: [],
          createdAt: new Date().toISOString(),
        };

    return { message: resultMessage };
  } catch (err) {
    console.error('[sendJourneyGuideMessage] Unexpected error:', err);
    return { error: '发生未知错误，请稍后重试' };
  }
}
