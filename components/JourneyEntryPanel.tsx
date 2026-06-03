'use client';

import { Sparkles, ChevronRight, FileText } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { ResumeInfo } from '@/types';
import { fetchUserResumes } from '@/app/actions/profile';

type JourneyEntryPanelProps = {
  onStart?: (selected: ResumeInfo | null) => void;
};

export default function JourneyEntryPanel({ onStart }: JourneyEntryPanelProps) {
  const [resumes, setResumes] = useState<ResumeInfo[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setIsLoading(true);
      setError(null);
      const result = await fetchUserResumes();
      if (result.error) {
        setError(result.error);
        setResumes([]);
      } else {
        setResumes(result.resumes ?? []);
        setSelectedId((prev) => prev || (result.resumes?.[0]?.id ?? ''));
      }
      setIsLoading(false);
    })();
  }, []);

  const selectedResume = useMemo(() => {
    return resumes.find((r) => r.id === selectedId) ?? null;
  }, [resumes, selectedId]);

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-2">
        <div className="w-9 h-9 rounded-md bg-[#8B735B]/10 flex items-center justify-center">
          <Sparkles className="w-5 h-5 text-[#8B735B]" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold text-[#111111] leading-snug">求职陪跑</p>
          <p className="text-xs text-[#666666] mt-0.5 leading-snug">从诊断到计划，再到简历优化</p>
        </div>
      </div>

      <div className="mt-4 flex-1 min-h-0">
        <div className="bg-white rounded-md border border-[#E0DCD1] shadow-sm p-3">
          <p className="text-xs font-medium text-[#8B735B] uppercase tracking-[0.2em]">选择简历版本</p>

          <div className="mt-2">
            {isLoading ? (
              <div className="text-sm text-[#999999] py-6 text-center">正在加载简历列表…</div>
            ) : error ? (
              <div className="text-sm text-red-600 py-6 text-center">{error}</div>
            ) : resumes.length === 0 ? (
              <div className="py-5">
                <div className="flex items-center gap-2 text-sm text-[#666666]">
                  <FileText className="w-4 h-4 text-[#8B735B]" />
                  <span>你还没有上传简历。</span>
                </div>
                <p className="text-xs text-[#999999] mt-1">请先在底部“简历版本”区域上传一份 PDF。</p>
              </div>
            ) : (
              <select
                value={selectedId}
                onChange={(e) => setSelectedId(e.target.value)}
                className="w-full bg-[#E5E1DA] border border-[#E0DCD1] rounded-lg px-3 py-2 text-sm text-[#111111] outline-none focus:ring-2 focus:ring-[#8B735B]/20"
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
            onClick={() => onStart?.(selectedResume)}
            disabled={isLoading || (!!resumes.length && !selectedResume) || resumes.length === 0}
            className="mt-3 w-full flex items-center justify-center gap-2 rounded-lg px-4 py-2 bg-[#8B735B] text-white text-sm font-medium shadow-sm hover:bg-[#7A654D] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span>进入陪跑</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="pt-3 border-t border-[#D8D4CE]">
        <p className="text-xs text-[#999999] leading-relaxed">
          提示：不会影响你现有的 AI 对话与建档功能；陪跑会按“旅程”单独保存。
        </p>
      </div>
    </div>
  );
}
