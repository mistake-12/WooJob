'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Sparkles, ChevronRight, Terminal } from 'lucide-react';
import type { ResumeInfo } from '@/types';
import { fetchUserResumes } from '@/app/actions/profile';

type GuideMessage = {
  id: string;
  role: 'guide' | 'user' | 'system';
  content: string;
};

function RoutingHint({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-2 pl-2 border-l-2 border-[#8B735B]">
      <Terminal className="w-4 h-4 text-[#8B735B] mt-0.5 flex-shrink-0" />
      <div className="flex-1">
        <p className="text-xs font-bold text-[#8B735B]">系统</p>
        <p className="text-xs text-[#666666] font-medium">{text}</p>
      </div>
    </div>
  );
}

export default function JourneyChat() {
  const [resumes, setResumes] = useState<ResumeInfo[]>([]);
  const [selectedResumeId, setSelectedResumeId] = useState<string>('');
  const [targetRole, setTargetRole] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [messages, setMessages] = useState<GuideMessage[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      setIsLoading(true);
      setError(null);
      const result = await fetchUserResumes();
      if (result.error) {
        setError(result.error);
        setResumes([]);
      } else {
        const list = result.resumes ?? [];
        setResumes(list);
        setSelectedResumeId(list[0]?.id ?? '');

        const defaultName = list[0]?.filename ? `默认简历是 ${list[0]?.filename}` : '我还没检测到你的默认简历';
        setMessages([
          {
            id: 'm1',
            role: 'guide',
            content: `👋 欢迎使用求职陪跑！${defaultName}。建议从能力诊断开始，点击上方"返回 Hub"按钮选择阶段。`,
          },
        ]);
      }
      setIsLoading(false);
    })();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end', behavior: 'smooth' });
  }, [messages, isCreating]);

  const selectedResume = useMemo(() => {
    return resumes.find((r) => r.id === selectedResumeId) ?? null;
  }, [resumes, selectedResumeId]);

  async function handleStart() {
    if (!targetRole.trim()) {
      setMessages((prev) => [
        ...prev,
        { id: `u-${Date.now()}`, role: 'system', content: '请先填写目标岗位（例如：大厂前端架构师 / AI 产品经理）。' },
      ]);
      return;
    }

    setIsCreating(true);
    setMessages((prev) => [
      ...prev,
      { id: `u-${Date.now()}`, role: 'user', content: `目标岗位：${targetRole.trim()}` },
    ]);

    try {
      setMessages((prev) => [
        ...prev,
        { id: `r-${Date.now()}`, role: 'system', content: '> 正在创建旅程...' },
      ]);

      const res = await fetch('/api/journey/create', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          resume: selectedResume ? { id: selectedResume.id, url: selectedResume.url, filename: selectedResume.filename } : null,
        }),
      });
      const json = await res.json();
      if (!json.ok) {
        setMessages((prev) => [
          ...prev,
          { id: `e-${Date.now()}`, role: 'system', content: `创建旅程失败：${json.error ?? 'unknown error'}` },
        ]);
        return;
      }

      setMessages((prev) => [
        ...prev,
        { id: `d-${Date.now()}`, role: 'guide', content: `✅ 旅程已创建！目标岗位【${targetRole.trim()}】已记录。现在请点击"返回 Hub"，选择"能力诊断"开始分析。` },
      ]);
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <div className="h-full min-h-0 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-[#CFCCC8]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <Sparkles className="w-4 h-4 text-[#8B735B] flex-shrink-0" />
            <span className="text-sm font-bold text-[#111111]">AI 教练</span>
            <span className="text-[10px] text-[#999999] uppercase tracking-[0.25em] ml-1">求职陪跑</span>
          </div>
        </div>
      </div>

      {/* Conversation */}
      <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4 bg-[#E8E5E0]">
        {messages.map((m) => {
          if (m.role === 'system' && m.content.startsWith('> Routing')) {
            return <RoutingHint key={m.id} text={m.content} />;
          }

          if (m.role === 'user') {
            return (
              <div key={m.id} className="flex justify-end">
                <div className="max-w-[240px] bg-white border border-[#E0DCD1] rounded-md px-3 py-2 shadow-sm">
                  <p className="text-xs font-bold text-[#111111] mb-1">你</p>
                  <p className="text-sm text-[#111111] whitespace-pre-wrap break-words">{m.content}</p>
                </div>
              </div>
            );
          }

          return (
            <div key={m.id} className="flex items-start gap-2">
              <Sparkles className="w-4 h-4 text-[#8B735B] mt-1 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-xs font-bold text-[#8B735B] mb-1">AI 教练</p>
                <p className="text-sm text-[#111111] whitespace-pre-wrap break-words leading-relaxed">{m.content}</p>
              </div>
            </div>
          );
        })}

        {isCreating && (
          <div className="flex items-start gap-2 pl-2 border-l-2 border-[#8B735B]">
            <Sparkles className="w-4 h-4 text-[#8B735B] mt-1 flex-shrink-0 animate-pulse" />
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

        {error && (
          <div className="p-2 bg-red-50 border border-red-200 rounded text-xs text-red-600">{error}</div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input / Control */}
      <div className="p-4 border-t border-[#CFCCC8] bg-[#E6E3DF]">
        <div className="space-y-2">
          <div>
            <p className="text-xs font-medium text-[#8B735B] uppercase tracking-[0.2em]">目标岗位</p>
            <input
              value={targetRole}
              onChange={(e) => setTargetRole(e.target.value)}
              placeholder="例如：大厂前端架构师"
              className="mt-1 w-full bg-white border border-[#E0DCD1] rounded-md px-3 py-2 text-sm text-[#111111] outline-none focus:ring-2 focus:ring-[#8B735B]/20"
            />
          </div>

          <div>
            <p className="text-xs font-medium text-[#8B735B] uppercase tracking-[0.2em]">简历版本</p>
            {isLoading ? (
              <div className="mt-1 text-xs text-[#999999]">正在加载简历列表…</div>
            ) : resumes.length === 0 ? (
              <div className="mt-1 text-xs text-[#999999]">暂无简历，请先在底部简历区上传 PDF。</div>
            ) : (
              <select
                value={selectedResumeId}
                onChange={(e) => setSelectedResumeId(e.target.value)}
                className="mt-1 w-full bg-[#E5E1DA] border border-[#E0DCD1] rounded-md px-3 py-2 text-sm text-[#111111] outline-none focus:ring-2 focus:ring-[#8B735B]/20"
              >
                {resumes.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.filename}
                  </option>
                ))}
              </select>
            )}
          </div>

          <button
            onClick={handleStart}
            disabled={isLoading || resumes.length === 0 || isCreating}
            className="w-full flex items-center justify-center gap-2 rounded-lg px-4 py-2 bg-[#8B735B] text-white text-sm font-medium shadow-sm hover:bg-[#7A654D] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span>确认，开始诊断</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
