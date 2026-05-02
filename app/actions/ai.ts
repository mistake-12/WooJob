'use server';

/**
 * AI 对话 Server Actions
 *
 * 职责：
 * 1. 会话管理（创建/获取/删除对话）
 * 2. 消息存储（用户消息 + AI 回复持久化）
 * 3. LLM 调用（DeepSeek / OpenAI / MiniMax 兼容）
 *
 * 前端通过 Zustand Store 调用这些 Action，不直接访问 LLM API。
 */

import { createServerSupabaseClient } from '@/lib/supabase-server';
import type {
  AIConversation,
  AIMessage,
  AIMessageAttachment,
  AIParsedData,
} from '@/types/database';
import { buildSystemPrompt, parseStructuredOutput, getModeHint, type AIMode } from './ai-helpers';

// ─────────────────────────────────────────────────────────────────────────────
// LLM 客户端（兼容 OpenAI / DeepSeek / MiniMax）
// ─────────────────────────────────────────────────────────────────────────────

function createLLMClient() {
  // 按优先级读取 API Key（支持多提供商切换）
  const apiKey =
    process.env.KIMI_API_KEY ||
    process.env.OPENAI_API_KEY ||
    process.env.DEEPSEEK_API_KEY ||
    '';

  if (!apiKey) {
    throw new Error('缺少 LLM API Key，请在 .env.local 中配置 KIMI_API_KEY / OPENAI_API_KEY / DEEPSEEK_API_KEY');
  }

  // 使用动态 import 避免 SSR 问题
  const { default: OpenAI } = require('openai');

  const client = new OpenAI({
    apiKey,
    baseURL: process.env.LLM_BASE_URL || undefined,
  });

  return client;
}

function getLLMModel(): string {
  return process.env.LLM_MODEL || 'kimi-k2.6';
}

// ─────────────────────────────────────────────────────────────────────────────
// 工具函数
// ─────────────────────────────────────────────────────────────────────────────

/** 将数据库行转换为前端类型 */
function mapDbConversation(row: Record<string, unknown>): AIConversation {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    title: (row.title as string) || '新对话',
    model: (row.model as string) || 'kimi-k2.6',
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

function mapDbMessage(row: Record<string, unknown>): AIMessage {
  return {
    id: row.id as string,
    conversationId: row.conversation_id as string,
    role: row.role as AIMessage['role'],
    content: row.content as string,
    attachments: typeof row.attachments === 'string' ? JSON.parse(row.attachments) : (row.attachments ?? []),
    extraData:
      row.extra_data && row.extra_data !== 'null'
        ? (typeof row.extra_data === 'string' ? JSON.parse(row.extra_data) : row.extra_data)
        : null,
    createdAt: row.created_at as string,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 会话管理
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 创建新对话会话
 */
export async function createConversation(
  title?: string
): Promise<{ conversation?: AIConversation; error?: string }> {
  try {
    const supabase = await createServerSupabaseClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: '未登录或会话已过期' };

    const { data, error } = await supabase
      .from('ai_conversations')
      .insert({
        user_id: user.id,
        title: title ?? '新对话',
        model: getLLMModel(),
      })
      .select()
      .single();

    if (error) return { error: error.message };

    return { conversation: mapDbConversation(data) };
  } catch (err) {
    console.error('[createConversation] Unexpected error:', err);
    return { error: '创建对话失败，请稍后重试' };
  }
}

/**
 * 获取当前用户所有对话列表
 */
export async function getConversations(): Promise<{
  conversations?: AIConversation[];
  error?: string;
}> {
  try {
    const supabase = await createServerSupabaseClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: '未登录或会话已过期' };

    const { data, error } = await supabase
      .from('ai_conversations')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });

    if (error) return { error: error.message };

    return { conversations: (data ?? []).map(mapDbConversation) };
  } catch (err) {
    console.error('[getConversations] Unexpected error:', err);
    return { error: '获取对话列表失败' };
  }
}

/**
 * 获取单个对话的所有消息
 */
export async function getMessages(
  conversationId: string
): Promise<{ messages?: AIMessage[]; error?: string }> {
  try {
    const supabase = await createServerSupabaseClient();

    const { data, error } = await supabase
      .from('ai_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (error) return { error: error.message };

    return { messages: (data ?? []).map(mapDbMessage) };
  } catch (err) {
    console.error('[getMessages] Unexpected error:', err);
    return { error: '获取消息历史失败' };
  }
}

/**
 * 删除对话及其所有消息（级联删除）
 */
export async function deleteConversation(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createServerSupabaseClient();

    const { error } = await supabase
      .from('ai_conversations')
      .delete()
      .eq('id', id);

    if (error) return { success: false, error: error.message };

    return { success: true };
  } catch (err) {
    console.error('[deleteConversation] Unexpected error:', err);
    return { success: false, error: '删除对话失败' };
  }
}

/**
 * 更新对话标题
 */
export async function renameConversation(
  id: string,
  title: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createServerSupabaseClient();

    const { error } = await supabase
      .from('ai_conversations')
      .update({ title, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) return { success: false, error: error.message };

    return { success: true };
  } catch (err) {
    console.error('[renameConversation] Unexpected error:', err);
    return { success: false, error: '重命名对话失败' };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 核心对话逻辑
// ─────────────────────────────────────────────────────────────────────────────

export interface SendMessageInput {
  /** 对话会话 ID */
  conversationId: string;
  /** 用户输入的文本内容 */
  content: string;
  /** 图片附件（base64 data URL） */
  attachments?: AIMessageAttachment[];
  /**
   * 工作模式：
   * - chat: 普通对话
   * - extract_job: 从文本/图片中提取岗位信息
   * - extract_task: 从文本/图片中提取任务信息
   */
  mode?: AIMode;
}

export interface SendMessageResult {
  /** AI 回复消息（含 id、content） */
  message?: AIMessage;
  /** 若 mode=extract_job/extract_task 且解析成功，返回结构化数据 */
  parsedData?: AIParsedData;
  /** 若 AI 未识别出结构化数据但仍需展示给用户 */
  fallbackContent?: string;
  error?: string;
}

/**
 * 发送消息，获取 AI 回复
 *
 * 完整流程：
 * 1. 保存用户消息到数据库
 * 2. 获取最近 20 条历史消息（上下文）
 * 3. 构建 System Prompt + 历史消息，发给 LLM
 * 4. 保存 AI 回复到数据库
 * 5. 若 mode != 'chat'，尝试从回复中解析结构化 JSON
 */
export async function sendMessage(
  input: SendMessageInput
): Promise<SendMessageResult> {
  const { conversationId, content, attachments = [], mode = 'chat' } = input;

  try {
    const supabase = await createServerSupabaseClient();

    // ── 认证 ──────────────────────────────────────────────────────────────
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: '未登录或会话已过期' };

    // ── 1. 保存用户消息 ──────────────────────────────────────────────────
    const { error: insertUserError } = await supabase.from('ai_messages').insert({
      conversation_id: conversationId,
      role: 'user',
      content,
      attachments: JSON.stringify(attachments),
      extra_data: JSON.stringify(null),
    });

    if (insertUserError) {
      console.error('[sendMessage] Failed to save user message:', insertUserError);
      return { error: '发送消息失败，请重试' };
    }

    // ── 2. 更新对话时间戳 ────────────────────────────────────────────────
    await supabase
      .from('ai_conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', conversationId);

    // ── 3. 获取历史消息（用于上下文）─────────────────────────────────────
    const { data: historyRows } = await supabase
      .from('ai_messages')
      .select('role, content')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .limit(20);

    const history = historyRows ?? [];

    // ── 4. 构建 LLM 请求 ─────────────────────────────────────────────────
    const client = createLLMClient();
    const model = getLLMModel();

    const systemPrompt = buildSystemPrompt(mode, user.id);

    // 构造 OpenAI 兼容的消息格式
    const openaiMessages: import('openai/resources/chat/completions').ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
      ...history.map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
      {
        role: 'user',
        content: [
          ...attachments.map((a) => ({
            type: 'image_url' as const,
            image_url: { url: a.url },
          })),
          { type: 'text' as const, text: content },
        ],
      },
    ];

    // ── 5. 调用 LLM ─────────────────────────────────────────────────────
    let reply = '';

    try {
      const response = await client.chat.completions.create({
        model,
        messages: openaiMessages,
        temperature: parseFloat(process.env.LLM_TEMPERATURE ?? '0.7'),
        max_tokens: parseInt(process.env.LLM_MAX_TOKENS ?? '2000'),
      });

      reply = response.choices[0]?.message?.content ?? '';
    } catch (llmError) {
      console.error('[sendMessage] LLM API error:', llmError);
      // LLM 调用失败时，保存一条错误回复提示用户
      const errorReply = 'AI 服务暂时不可用，请稍后重试。如果问题持续，请检查 API Key 配置。';
      await supabase.from('ai_messages').insert({
        conversation_id: conversationId,
        role: 'assistant',
        content: errorReply,
        attachments: JSON.stringify([]),
        extra_data: JSON.stringify(null),
      });
      return { error: errorReply };
    }

    if (!reply.trim()) {
      return { error: 'AI 未返回有效回复，请重试' };
    }

    // ── 6. 解析结构化数据（extract_job / extract_task 模式）──────────────
    let parsedData: AIParsedData | undefined;
    let fallbackContent: string | undefined;

    if (mode !== 'chat') {
      const parsed = parseStructuredOutput(reply, mode);
      if (parsed) {
        parsedData = parsed;
      } else {
        // AI 没有返回可解析的 JSON，将原始回复作为普通内容展示
        fallbackContent = reply;
      }
    }

    // ── 7. 保存 AI 回复 ─────────────────────────────────────────────────
    const savedMsg = await supabase
      .from('ai_messages')
      .insert({
        conversation_id: conversationId,
        role: 'assistant',
        content: reply,
        attachments: JSON.stringify([]),
        extra_data: JSON.stringify(parsedData ?? null),
      })
      .select()
      .single();

    const resultMessage: AIMessage = savedMsg.data
      ? mapDbMessage(savedMsg.data)
      : {
          id: `temp-${Date.now()}`,
          conversationId,
          role: 'assistant',
          content: reply,
          attachments: [],
          extraData: parsedData ?? null,
          createdAt: new Date().toISOString(),
        };

    return {
      message: resultMessage,
      parsedData,
      fallbackContent,
    };
  } catch (err) {
    console.error('[sendMessage] Unexpected error:', err);
    return { error: '发生未知错误，请稍后重试' };
  }
}

/**
 * 获取欢迎语（新建对话时显示）
 */
export async function getWelcomeMessage(
  mode: AIMode = 'chat'
): Promise<string> {
  return getModeHint(mode);
}
