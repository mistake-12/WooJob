'use client';

import { BarChart3, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function DiagnosisPage() {
  const router = useRouter();

  return (
    <div className="h-screen w-screen overflow-hidden flex items-center justify-center bg-[#D1CFCA]">
      <div className="w-full max-w-[95vw] h-[95vh] bg-[#EBE8E3] rounded-2xl shadow-xl border border-gray-200 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-8 pt-7 pb-5 border-b border-[#CFCCC8] flex-shrink-0">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/journey')}
              className="w-9 h-9 rounded-lg bg-white border border-[#E0DCD1] hover:border-[#8B735B] hover:shadow-sm transition-all flex items-center justify-center"
            >
              <ArrowLeft className="w-5 h-5 text-[#8B735B]" />
            </button>
            <div>
              <p className="text-[10px] uppercase tracking-[0.3em] text-[#8B735B] font-medium">
                求职陪跑 · 能力诊断
              </p>
              <h1 className="mt-1 text-3xl font-black text-[#111111] tracking-tight leading-none">
                能力诊断
              </h1>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-h-0 px-8 py-8 overflow-y-auto">
          <div className="h-full flex items-center justify-center">
            <div className="max-w-[560px] text-center">
              <div className="w-16 h-16 rounded-2xl bg-[#8B735B]/10 flex items-center justify-center mx-auto">
                <BarChart3 className="w-8 h-8 text-[#8B735B]" />
              </div>
              <h2 className="mt-6 text-2xl font-bold text-[#111111]">
                能力诊断功能开发中
              </h2>
              <p className="mt-4 text-sm text-[#666666] leading-relaxed">
                这里将提供目标岗位与简历的能力匹配度分析，包括能力雷达图、差距清单和优先级建议。
              </p>
              <button
                onClick={() => router.push('/journey')}
                className="mt-8 px-6 py-2.5 bg-[#8B735B] hover:bg-[#7A654D] text-white text-sm font-medium rounded-lg transition-colors"
              >
                返回 Hub
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
