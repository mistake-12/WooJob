'use client';

import { Sparkles, Send, User, Bot, Plus, ChevronDown, Trash2, MessageSquare, Image, X } from 'lucide-react';
import { useEffect, useRef, useState, useCallback } from 'react';
import { useJobStore } from '@/store/useJobStore';
import type { AIMessage, AIMessageAttachment, AIParsedData } from '@/types/database';
import type { AIMode } from '@/app/actions/ai-helpers';
import { getOrCreateJourney, getJourneyGuideMessages, sendJourneyGuideMessage } from '@/app/actions/journey-ai';
import type { JourneyMessage } from '@/app/actions/journey-ai';
import DraftPreviewCard from './DraftPreviewCard';

const MODES: { key: AIMode; label: string }[] = [
  { key: 'chat', label: '对话' },
  { key: 'extract_job', label: '建岗位' },
  { key: 'extract_task', label: '建任务' },
];

/** 模式对应的欢迎语（本地显示，不存入后端） */
const MODE_WELCOME: Record<AIMode, string> = {
  chat: '你好！我是你的求职 AI 副驾。有什么求职问题都可以问我~',
  extract_job: '已切换至岗位建档模式。请直接发送 JD 文字或截图，我会为您提取关键信息并创建岗位卡片。',
  extract_task: '已切换至日程建档模式。请发送面试/笔试通知截图，我来帮您提取信息并加入日历。',
};

/** Guide Agent 欢迎语 */
const GUIDE_WELCOME = '你好！我是你的 AI 求职教练，会全程陪伴你的求职旅程。有什么问题随时问我~';

export default function AISidebar({
  activeFeature = 'ai',
  journeyStage,
}: {
  activeFeature?: 'ai' | 'journey';
  /** 用户当前在 journey 中浏览的阶段（hub / diagnosis / gap_filling 等） */
  journeyStage?: string | null;
}) {
  const {
    aiConversations,
    aiCurrentConversationId,
    aiMessages,
    aiIsLoading,
    aiError,
    aiMode,
    aiWelcomeMessage,
    fetchConversations,
    startNewConversation,
    switchConversation,
    deleteConversation,
    sendAIMessage,
    setAIMode,
  } = useJobStore();

  const [inputValue, setInputValue] = useState('');
  const [showConversationList, setShowConversationList] = useState(false);
  const [localWelcome, setLocalWelcome] = useState<string | null>(null);
  const [pendingAttachments, setPendingAttachments] = useState<AIMessageAttachment[]>([]);
  const [showImagePicker, setShowImagePicker] = useState(false);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imagePickerRef = useRef<HTMLDivElement>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);

  // ── Journey / Guide Agent 状态 ──────────────────────────────────────
  const [journeyId, setJourneyId] = useState<string | null>(null);
  const [journeyMessages, setJourneyMessages] = useState<JourneyMessage[]>([]);
  const [journeyLoading, setJourneyLoading] = useState(false);
  const [journeyError, setJourneyError] = useState<string | null>(null);
  const [journeyInitDone, setJourneyInitDone] = useState(false);

  const currentConversation = aiConversations.find((c) => c.id === aiCurrentConversationId);

  // ── 初始化 AI 模式：加载会话列表 ──────────────────────────────────
  useEffect(() => {
    if (activeFeature !== 'journey') {
      fetchConversations();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFeature]);

  // ── 初始化 Journey 模式：获取或创建 journey，加载消息 ──────────────
  useEffect(() => {
    if (activeFeature !== 'journey') return;
    if (journeyInitDone) return;

    let cancelled = false;

    async function initJourney() {
      setJourneyError(null);

      const journeyResult = await getOrCreateJourney();
      if (cancelled) return;

      if (journeyResult.error || !journeyResult.journey) {
        setJourneyError(journeyResult.error ?? '无法初始化旅程');
        setJourneyInitDone(true);
        return;
      }

      const jId = journeyResult.journey.id as string;
      setJourneyId(jId);

      const msgResult = await getJourneyGuideMessages(jId);
      if (cancelled) return;

      if (msgResult.error) {
        setJourneyError(msgResult.error);
      } else {
        setJourneyMessages(msgResult.messages ?? []);
      }

      setJourneyInitDone(true);
    }

    initJourney();

    return () => {
      cancelled = true;
    };
  }, [activeFeature, journeyInitDone]);

  // 切换离开 journey 模式后重置初始化状态
  useEffect(() => {
    if (activeFeature !== 'journey') {
      setJourneyInitDone(false);
      setJourneyId(null);
      setJourneyMessages([]);
      setJourneyError(null);
    }
  }, [activeFeature]);

  // AI 回复后自动滚动到底部
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ block: 'end', behavior: 'smooth' });
    }
  }, [aiMessages, localWelcome, journeyMessages]);

  // 点击外部关闭会话列表和图片选择器
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (listRef.current && !listRef.current.contains(e.target as Node)) {
        setShowConversationList(false);
      }
      if (imagePickerRef.current && !imagePickerRef.current.contains(e.target as Node)) {
        setShowImagePicker(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 切换模式时显示本地欢迎语
  const handleModeChange = useCallback((mode: AIMode) => {
    setAIMode(mode);
    setLocalWelcome(MODE_WELCOME[mode]);
  }, [setAIMode]);

  async function handleNewConversation() {
    await startNewConversation();
    setShowConversationList(false);
    setLocalWelcome(null);
  }

  async function handleSwitchConversation(id: string) {
    await switchConversation(id);
    setShowConversationList(false);
    setLocalWelcome(null);
  }

  async function handleDeleteConversation(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    await deleteConversation(id);
  }

  // 处理图片上传
  const handleImageSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setPendingAttachments((prev) => [
        ...prev,
        { type: 'image_url', url: base64 },
      ]);
    };
    reader.readAsDataURL(file);

    e.target.value = '';
    setShowImagePicker(false);
  }, []);

  // 删除待发送的图片
  const removePendingImage = useCallback((index: number) => {
    setPendingAttachments((prev) => prev.filter((_, i) => i !== index));
  }, []);

  // 提取图片文件（支持 File 或 DataTransferItem）
  const extractImageFiles = useCallback((items: DataTransferItemList | DataTransferItem[]): File[] => {
    const files: File[] = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.kind === 'file' && item.type.startsWith('image/')) {
        files.push(item.getAsFile()!);
      }
    }
    return files;
  }, []);

  // 添加图片到待发送列表
  const addImagesToPending = useCallback((files: File[]) => {
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        setPendingAttachments((prev) => [
          ...prev,
          { type: 'image_url', url: base64 },
        ]);
      };
      reader.readAsDataURL(file);
    });
  }, []);

  // 处理拖拽进入
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      const hasImage = Array.from(e.dataTransfer.items).some(
        (item) => item.kind === 'file' && item.type.startsWith('image/')
      );
      if (hasImage) {
        setIsDraggingOver(true);
      }
    }
  }, []);

  // 处理拖拽悬停
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  // 处理拖拽离开
  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (sidebarRef.current && !sidebarRef.current.contains(e.relatedTarget as Node)) {
      setIsDraggingOver(false);
    }
  }, []);

  // 处理文件放下
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);

    const files = extractImageFiles(e.dataTransfer.items);
    if (files.length > 0) {
      addImagesToPending(files);
    }
  }, [extractImageFiles, addImagesToPending]);

  // 处理粘贴事件
  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    const imageFiles = extractImageFiles(items);
    if (imageFiles.length > 0) {
      e.preventDefault();
      addImagesToPending(imageFiles);
    }
  }, [extractImageFiles, addImagesToPending]);

  // ── AI 模式发送消息 ────────────────────────────────────────────────
  async function handleSendAI() {
    const trimmed = inputValue.trim();
    const hasText = trimmed.length > 0;
    const hasOnlyImages = !hasText && pendingAttachments.length > 0;

    if (!hasText || hasOnlyImages) return;
    if (aiIsLoading) return;

    let convId = aiCurrentConversationId;
    if (!convId) {
      convId = await startNewConversation();
      if (!convId) return;
    }

    setInputValue('');
    setLocalWelcome(null);
    await sendAIMessage(trimmed, pendingAttachments);
    setPendingAttachments([]);
    inputRef.current?.focus();
  }

  // ── Journey / Guide Agent 发送消息 ─────────────────────────────────
  async function handleSendJourney() {
    const trimmed = inputValue.trim();
    const hasText = trimmed.length > 0;
    const hasOnlyImages = !hasText && pendingAttachments.length > 0;

    if (!hasText || hasOnlyImages) return;
    if (journeyLoading || !journeyId) return;

    setInputValue('');
    setJourneyLoading(true);
    setJourneyError(null);

    // 乐观追加用户消息
    const tempUserMsg: JourneyMessage = {
      id: `temp-${Date.now()}`,
      journeyId,
      role: 'user',
      content: trimmed,
      attachments: pendingAttachments,
      createdAt: new Date().toISOString(),
    };
    setJourneyMessages((prev) => [...prev, tempUserMsg]);
    const sentAttachments = [...pendingAttachments];
    setPendingAttachments([]);

    const result = await sendJourneyGuideMessage({
      journeyId,
      stage: journeyStage ?? undefined,
      content: trimmed,
      attachments: sentAttachments,
    });

    if (result.error) {
      setJourneyError(result.error);
      setJourneyLoading(false);
    } else if (result.message) {
      setJourneyMessages((prev) => [...prev, result.message!]);
      setJourneyLoading(false);
    } else {
      setJourneyLoading(false);
    }

    inputRef.current?.focus();
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (activeFeature === 'journey') {
        handleSendJourney();
      } else {
        handleSendAI();
      }
    }
  }

  return (
    <div
      ref={sidebarRef}
      className="relative w-[300px] h-full min-h-0 bg-[#E6E3DF] border-l border-[#CFCCC8] flex flex-col"
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* 拖拽上传遮罩 */}
      {isDraggingOver && (
        <div className="absolute inset-0 z-50 bg-[#8E7E6E]/20 backdrop-blur-sm flex flex-col items-center justify-center gap-3 border-2 border-dashed border-[#8E7E6E] rounded-lg m-2">
          <div className="w-16 h-16 rounded-full bg-[#8E7E6E]/30 flex items-center justify-center">
            <Image className="w-8 h-8 text-[#8E7E6E]" />
          </div>
          <p className="text-sm font-medium text-[#8E7E6E]">释放以上传图片</p>
        </div>
      )}

      {/* ── 头部：标题 + 会话切换 / 模式选择器 ─────────────────────────── */}
      <div className="p-4 border-b border-[#CFCCC8]" ref={listRef}>
        {activeFeature === 'journey' ? (
          /* ── Journey / Guide Agent 头部 ──────────────────────────── */
          <div className="flex items-center gap-2 min-w-0">
            <Sparkles className="w-4 h-4 text-[#8B735B] flex-shrink-0" />
            <span className="text-sm font-bold text-[#111111]">AI 教练</span>
            <span className="text-[10px] text-[#999999] uppercase tracking-[0.25em] ml-1">求职陪跑</span>
          </div>
        ) : (
          /* ── 普通 AI 头部（保持原有行为）────────────────────────── */
          <>
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
                    <button
                      onClick={handleNewConversation}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs text-[#8B735B] hover:bg-[#F5F2EE] transition-colors"
                    >
                      <Plus className="w-3 h-3" />
                      新建对话
                    </button>

                    {aiConversations.length > 0 && (
                      <div className="border-t border-[#E8E5E0]" />
                    )}

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

            {/* 模式选择器（AI 模式专有） */}
            <div className="flex gap-1 mt-2">
              {MODES.map((m) => (
                <button
                  key={m.key}
                  onClick={() => handleModeChange(m.key)}
                  className={`flex-1 py-1 px-2 text-xs rounded transition-colors ${
                    aiMode === m.key
                      ? 'bg-[#8E7E6E] text-white font-medium shadow-sm'
                      : 'bg-[#E8E5E0] text-[#666666] hover:bg-[#DDD9D4]'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* ── 内容区域：AI 对话 / Journey Guide Agent 对话 ──────────────── */}
      {activeFeature === 'journey' ? (
        /* ── Journey Guide Agent 消息区 ────────────────────────────── */
        <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4 bg-[#E8E5E0]">
          {journeyMessages.length === 0 && !journeyLoading && !journeyError ? (
            <GuideMessageBubble
              message={{
                id: 'guide-welcome',
                role: 'assistant',
                content: GUIDE_WELCOME,
                attachments: [],
              }}
            />
          ) : (
            <>
              {journeyMessages.map((jm) => (
                <GuideMessageBubble key={jm.id} message={jm} />
              ))}

              {/* 加载中占位 */}
              {journeyLoading && (
                <div className="flex items-start gap-2 pl-2 border-l-2 border-[#8B735B]">
                  <Bot className="w-4 h-4 text-[#8B735B] mt-1 flex-shrink-0 animate-pulse" />
                  <div className="flex-1">
                    <p className="text-xs font-bold text-[#8B735B] mb-1">AI 教练</p>
                    <div className="flex gap-1">
                      <div className="w-1.5 h-1.5 bg-[#8B735B] rounded-full animate-bounce" />
                      <div className="w-1.5 h-1.5 bg-[#8B735B] rounded-full animate-bounce [animation-delay:0.15s]" />
                      <div className="w-1.5 h-1.5 bg-[#8B735B] rounded-full animate-bounce [animation-delay:0.3s]" />
                    </div>
                  </div>
                </div>
              )}

              {/* 错误提示 */}
              {journeyError && (
                <div className="p-2 bg-red-50 border border-red-200 rounded text-xs text-red-600">
                  {journeyError}
                </div>
              )}

              <div ref={messagesEndRef} />
            </>
          )}

          {journeyMessages.length > 0 && <div ref={messagesEndRef} />}
        </div>
      ) : (
        /* ── 普通 AI 消息区（保持原有行为）────────────────────────── */
        <>
          <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4 bg-[#E8E5E0]">
            {aiMessages.length === 0 && !aiIsLoading && !localWelcome ? (
              <MessageBubble
                message={{
                  id: 'welcome',
                  conversationId: '',
                  role: 'assistant',
                  content: aiWelcomeMessage || MODE_WELCOME.chat,
                  attachments: [],
                  extraData: null,
                  createdAt: new Date().toISOString(),
                }}
              />
            ) : (
              <>
                {localWelcome && (
                  <MessageBubble
                    message={{
                      id: 'local-welcome',
                      conversationId: '',
                      role: 'assistant',
                      content: localWelcome,
                      attachments: [],
                      extraData: null,
                      createdAt: new Date().toISOString(),
                    }}
                  />
                )}

                {aiMessages.map((msg) => (
                  <MessageBubble key={msg.id} message={msg} />
                ))}

                {aiIsLoading && (
                  <div className="flex items-start gap-2 pl-2 border-l-2 border-[#8E7E6E]">
                    <Bot className="w-4 h-4 text-[#8E7E6E] mt-1 flex-shrink-0 animate-pulse" />
                    <div className="flex-1">
                      <p className="text-xs font-bold text-[#8E7E6E] mb-1">AI 助手</p>
                      <div className="flex gap-1">
                        <div className="w-1.5 h-1.5 bg-[#8E7E6E] rounded-full animate-bounce" />
                        <div className="w-1.5 h-1.5 bg-[#8E7E6E] rounded-full animate-bounce [animation-delay:0.15s]" />
                        <div className="w-1.5 h-1.5 bg-[#8E7E6E] rounded-full animate-bounce [animation-delay:0.3s]" />
                      </div>
                    </div>
                  </div>
                )}

                {aiError && (
                  <div className="p-2 bg-red-50 border border-red-200 rounded text-xs text-red-600">
                    {aiError}
                  </div>
                )}

                <div ref={messagesEndRef} />
              </>
            )}

            {aiMessages.length > 0 && <div ref={messagesEndRef} />}
          </div>
        </>
      )}

      {/* ── 输入框（两种模式共用结构，发送逻辑不同）─────────────────── */}
      <div
        className="p-4 border-t border-[#CFCCC8]"
        onPaste={handlePaste}
      >
        {/* 待发送图片预览 */}
        {pendingAttachments.length > 0 && (
          <div className="mb-2 flex gap-2 flex-wrap">
            {pendingAttachments.map((att, i) => (
              <div key={i} className="relative group">
                <img
                  src={att.url}
                  alt="待发送图片"
                  className="w-16 h-16 object-cover rounded border border-[#CFCCC8]"
                />
                <button
                  onClick={() => removePendingImage(i)}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-white border border-[#CFCCC8] rounded-full flex items-center justify-center shadow-sm hover:bg-red-50 transition-colors"
                >
                  <X className="w-3 h-3 text-[#666666]" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="relative flex items-end gap-2">
          {/* 图片上传按钮 */}
          <div className="relative" ref={imagePickerRef}>
            <button
              onClick={() => setShowImagePicker((v) => !v)}
              className="p-2 hover:bg-[#E8E5E0] rounded transition-colors"
              title="上传图片"
            >
              <Image className="w-5 h-5 text-[#8B735B]" />
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              className="hidden"
            />

            {showImagePicker && (
              <div className="absolute bottom-full left-0 mb-2 w-40 bg-white border border-[#CFCCC8] rounded-md shadow-lg z-50 overflow-hidden">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-[#333333] hover:bg-[#F5F2EE] transition-colors"
                >
                  <Image className="w-4 h-4 text-[#8B735B]" />
                  选择本地图片
                </button>
              </div>
            )}
          </div>

          <textarea
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            placeholder={
              activeFeature === 'journey'
                ? '向 AI 教练提问，例如：这个阶段是做什么的？'
                : aiMode === 'extract_job'
                  ? '粘贴岗位描述，上传 JD 截图，或 Ctrl+V 粘贴图片...'
                  : aiMode === 'extract_task'
                    ? '描述任务，上传通知截图，或 Ctrl+V 粘贴图片...'
                    : '向 AI 助手提问，拖拽或粘贴图片上传...'
            }
            disabled={activeFeature === 'journey' ? journeyLoading : aiIsLoading}
            rows={1}
            className="flex-1 px-4 py-2 text-sm bg-white border border-[#E8E5E0] rounded-md focus:outline-none focus:ring-2 focus:ring-[#8E7E6E] focus:border-transparent resize-none disabled:bg-[#F5F2EE] disabled:cursor-not-allowed"
            style={{ minHeight: '40px', maxHeight: '120px' }}
          />
          <button
            onClick={activeFeature === 'journey' ? handleSendJourney : handleSendAI}
            disabled={
              activeFeature === 'journey'
                ? journeyLoading || !inputValue.trim()
                : aiIsLoading || !inputValue.trim()
            }
            title={
              pendingAttachments.length > 0 && !inputValue.trim()
                ? '请输入文字说明后再发送'
                : '发送消息'
            }
            className="p-2 hover:bg-[#E8E5E0] rounded transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Send className="w-5 h-5 text-[#8E7E6E]" />
          </button>
        </div>

        {/* 仅图片时的提示 */}
        {pendingAttachments.length > 0 && !inputValue.trim() && (
          <p className="mt-1.5 text-xs text-[#999999]">
            请输入文字说明后再发送
          </p>
        )}
      </div>
    </div>
  );
}

/** 普通 AI 消息气泡（保持原有逻辑不变） */
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

  const { textContent, parsedData } = parseAIMessage(message);

  return (
    <div className="flex flex-col gap-3">
      {textContent && (
        <div className="flex items-start gap-2 pl-2 border-l-2 border-[#8E7E6E]">
          <Bot className="w-4 h-4 text-[#8E7E6E] mt-1 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-xs font-bold text-[#8E7E6E] mb-1">AI 助手</p>
            <p className="text-sm text-[#111111] whitespace-pre-wrap break-words">
              {textContent}
            </p>
          </div>
        </div>
      )}

      {parsedData && (
        <DraftPreviewCard parsedData={parsedData} />
      )}
    </div>
  );
}

/** Guide Agent 消息气泡（简洁版，不解析结构化数据） */
function GuideMessageBubble({ message }: { message: { id: string; role: 'user' | 'assistant'; content: string; attachments: AIMessageAttachment[] } }) {
  if (message.role === 'user') {
    return (
      <div className="flex items-start gap-2">
        <User className="w-4 h-4 text-[#666666] mt-1 flex-shrink-0" />
        <div className="flex-1">
          <p className="text-xs font-bold text-[#111111] mb-1">你</p>
          <p className="text-sm text-[#111111] whitespace-pre-wrap break-words">
            {message.content}
          </p>
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
        <p className="text-xs font-bold text-[#8B735B] mb-1">AI 教练</p>
        <p className="text-sm text-[#111111] whitespace-pre-wrap break-words">
          {message.content}
        </p>
      </div>
    </div>
  );
}

/**
 * 解析 AI 消息内容，提取纯文本和结构化 JSON
 */
function parseAIMessage(message: AIMessage): { textContent: string | null; parsedData: AIParsedData | null } {
  if (message.extraData) {
    return {
      textContent: null,
      parsedData: message.extraData,
    };
  }

  const content = message.content;
  if (!content) return { textContent: null, parsedData: null };

  const codeBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);

  if (codeBlockMatch) {
    const jsonStr = codeBlockMatch[1];
    try {
      const parsed = JSON.parse(jsonStr);

      const textParts = content.split(/```(?:json)?[\s\S]*?```/);
      const textContent = textParts
        .map((t) => t.trim())
        .filter((t) => t.length > 0)
        .join('\n')
        .trim();

      if (parsed.type === 'job' && parsed.job) {
        return {
          textContent: textContent || null,
          parsedData: { type: 'job', job: parsed.job },
        };
      }

      if (parsed.type === 'task' && parsed.task) {
        return {
          textContent: textContent || null,
          parsedData: { type: 'task', task: parsed.task },
        };
      }
    } catch {
      // JSON 解析失败，返回纯文本
    }
  }

  return { textContent: content, parsedData: null };
}
