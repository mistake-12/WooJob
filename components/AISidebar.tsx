'use client';

import { Sparkles, Send, User, Bot, Plus, ChevronDown, Trash2, MessageSquare } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useJobStore } from '@/store/useJobStore';
import type { AIMessage } from '@/types/database';
import type { AIMode } from '@/app/actions/ai-helpers';

const MODES: { key: AIMode; label: string }[] = [
  { key: 'chat', label: '对话' },
  { key: 'extract_job', label: '建岗位' },
  { key: 'extract_task', label: '建任务' },
];

export default function AISidebar() {
  const {
    aiConversations,
    aiCurrentConversationId,
    aiMessages,
    aiIsLoading,
    aiError,
    aiMode,
    fetchConversations,
    startNewConversation,
    switchConversation,
    deleteConversation,
    sendAIMessage,
    setAIMode,
  } = useJobStore();

  const [inputValue, setInputValue] = useState('');
  const [showConversationList, setShowConversationList] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const currentConversation = aiConversations.find((c) => c.id === aiCurrentConversationId);

  // 初始化：加载会话列表，如果有当前会话则加载消息
  useEffect(() => {
    fetchConversations();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // AI 回复后自动滚动到底部
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ block: 'end', behavior: 'smooth' });
    }
  }, [aiMessages]);

  // 点击外部关闭会话列表
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (listRef.current && !listRef.current.contains(e.target as Node)) {
        setShowConversationList(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  async function handleNewConversation() {
    await startNewConversation();
    setShowConversationList(false);
  }

  async function handleSwitchConversation(id: string) {
    await switchConversation(id);
    setShowConversationList(false);
  }

  async function handleDeleteConversation(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    await deleteConversation(id);
  }

  async function handleSend() {
    const trimmed = inputValue.trim();
    if (!trimmed || aiIsLoading) return;

    // 如果没有活跃会话，先创建一个
    let convId = aiCurrentConversationId;
    if (!convId) {
      convId = await startNewConversation();
      if (!convId) return;
    }

    setInputValue('');
    await sendAIMessage(trimmed);
    inputRef.current?.focus();
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="w-[300px] h-full min-h-0 bg-[#E6E3DF] border-l border-[#CFCCC8] flex flex-col">
      {/* ── 头部：会话切换 ─────────────────────────────────────────────── */}
      <div className="p-4 border-b border-[#CFCCC8]" ref={listRef}>
        {/* AI 标题 + 会话切换按钮 */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Sparkles className="w-4 h-4 text-[#8B735B] flex-shrink-0" />
            <span className="text-sm font-bold text-[#111111]">AI 助手</span>
          </div>

          {/* 会话切换下拉 */}
          <div className="relative flex-shrink-0">
            <button
              onClick={() => setShowConversationList((v) => !v)}
              className="flex items-center gap-1 px-2 py-1 text-xs text-[#666666] hover:bg-[#CFCCC8] rounded transition-colors max-w-[120px]"
              title={currentConversation?.title ?? '切换对话'}
            >
              <MessageSquare className="w-3 h-3 flex-shrink-0" />
              <span className="truncate">
                {currentConversation?.title ?? '新对话'}
              </span>
              <ChevronDown className="w-3 h-3 flex-shrink-0" />
            </button>

            {/* 下拉菜单 */}
            {showConversationList && (
              <div className="absolute right-0 top-full mt-1 w-[220px] bg-white border border-[#CFCCC8] rounded-md shadow-lg z-50 overflow-hidden">
                {/* 新建对话 */}
                <button
                  onClick={handleNewConversation}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-[#8B735B] hover:bg-[#F5F2EE] transition-colors"
                >
                  <Plus className="w-3 h-3" />
                  新建对话
                </button>

                {/* 分隔线 */}
                {aiConversations.length > 0 && (
                  <div className="border-t border-[#E8E5E0]" />
                )}

                {/* 对话列表 */}
                <div className="max-h-[200px] overflow-y-auto">
                  {aiConversations.length === 0 && (
                    <p className="px-3 py-2 text-xs text-[#999999]">暂无对话记录</p>
                  )}
                  {aiConversations.map((conv) => (
                    <div
                      key={conv.id}
                      onClick={() => handleSwitchConversation(conv.id)}
                      className={`group flex items-center gap-1 px-3 py-2 cursor-pointer hover:bg-[#F5F2EE] transition-colors ${
                        conv.id === aiCurrentConversationId ? 'bg-[#F0EDE8]' : ''
                      }`}
                    >
                      <MessageSquare className="w-3 h-3 text-[#999999] flex-shrink-0" />
                      <span className="flex-1 text-xs text-[#333333] truncate">
                        {conv.title}
                      </span>
                      <button
                        onClick={(e) => handleDeleteConversation(e, conv.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-[#E6E3DF] rounded transition-all"
                        title="删除对话"
                      >
                        <Trash2 className="w-3 h-3 text-[#999999]" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 模式选择器 */}
        <div className="flex gap-1 mt-2">
          {MODES.map((m) => (
            <button
              key={m.key}
              onClick={() => setAIMode(m.key)}
              className={`flex-1 py-1 px-2 text-xs rounded transition-colors ${
                aiMode === m.key
                  ? 'bg-[#8B735B] text-white font-medium'
                  : 'bg-[#E8E5E0] text-[#666666] hover:bg-[#DDD9D4]'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── 消息区域 ───────────────────────────────────────────────────── */}
      <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4 bg-[#E8E5E0]">
        {/* 无消息时显示欢迎气泡（会话自动创建，组件初始化即可输入） */}
        {aiMessages.length === 0 && !aiIsLoading ? (
          <MessageBubble
            message={{
              id: 'welcome',
              conversationId: '',
              role: 'assistant',
              content: '你好！我是你的求职 AI 副驾。直接在这里输入即可开始对话，也可以粘贴 JD、简历片段让我帮你建档。',
              attachments: [],
              extraData: null,
              createdAt: new Date().toISOString(),
            }}
          />
        ) : (
          <>
            {aiMessages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} />
            ))}

            {/* 加载中占位 */}
            {aiIsLoading && (
              <div className="flex items-start gap-2 pl-2 border-l-2 border-[#8B735B]">
                <Bot className="w-4 h-4 text-[#8B735B] mt-1 flex-shrink-0 animate-pulse" />
                <div className="flex-1">
                  <p className="text-xs font-bold text-[#8B735B] mb-1">AI 助手</p>
                  <div className="flex gap-1">
                    <div className="w-1.5 h-1.5 bg-[#8B735B] rounded-full animate-bounce" />
                    <div className="w-1.5 h-1.5 bg-[#8B735B] rounded-full animate-bounce [animation-delay:0.15s]" />
                    <div className="w-1.5 h-1.5 bg-[#8B735B] rounded-full animate-bounce [animation-delay:0.3s]" />
                  </div>
                </div>
              </div>
            )}

            {/* 错误提示 */}
            {aiError && (
              <div className="p-2 bg-red-50 border border-red-200 rounded text-xs text-red-600">
                {aiError}
              </div>
            )}

            <div ref={messagesEndRef} />
          </>
        )}

        {/* 有消息但未发过时，显示欢迎气泡滚动锚点 */}
        {aiMessages.length > 0 && <div ref={messagesEndRef} />}
      </div>

      {/* ── 输入框 ─────────────────────────────────────────────────────── */}
      <div className="p-4 border-t border-[#CFCCC8]">
        <div className="relative">
          <textarea
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="向 AI 助手提问，或粘贴信息建档..."
            disabled={aiIsLoading}
            rows={1}
            className="w-full px-4 py-2 pr-10 text-sm bg-white border border-[#E8E5E0] rounded-md focus:outline-none focus:ring-2 focus:ring-[#8B735B] focus:border-transparent resize-none disabled:bg-[#F5F2EE] disabled:cursor-not-allowed"
            style={{ minHeight: '40px', maxHeight: '120px' }}
          />
          <button
            onClick={handleSend}
            disabled={aiIsLoading || !inputValue.trim()}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-[#E8E5E0] rounded transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Send className="w-4 h-4 text-[#666666]" />
          </button>
        </div>
      </div>
    </div>
  );
}

/** 单条消息气泡 */
function MessageBubble({ message }: { message: AIMessage }) {
  if (message.role === 'user') {
    return (
      <div className="flex items-start gap-2">
        <User className="w-4 h-4 text-[#666666] mt-1 flex-shrink-0" />
        <div className="flex-1">
          <p className="text-xs font-bold text-[#111111] mb-1">你</p>
          <p className="text-sm text-[#111111] whitespace-pre-wrap break-words">
            {message.content}
          </p>
          {/* 图片附件预览 */}
          {message.attachments.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {message.attachments.map((att, i) => (
                att.type === 'image_url' ? (
                  <img
                    key={i}
                    src={att.url}
                    alt="附件图片"
                    className="w-20 h-20 object-cover rounded border border-[#CFCCC8]"
                  />
                ) : null
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-2 pl-2 border-l-2 border-[#8B735B]">
      <Bot className="w-4 h-4 text-[#8B735B] mt-1 flex-shrink-0" />
      <div className="flex-1">
        <p className="text-xs font-bold text-[#8B735B] mb-1">AI 助手</p>
        <p className="text-sm text-[#111111] whitespace-pre-wrap break-words">
          {message.content}
        </p>
      </div>
    </div>
  );
}
