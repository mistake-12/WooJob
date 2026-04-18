'use client';

import { Sparkles, Send, User, Bot } from 'lucide-react';
import { useState } from 'react';

export default function AISidebar() {
  const [inputValue, setInputValue] = useState('');

  const mockMessages = [
    {
      role: 'user',
      content: '滴滴出行资深产品专家面试一般会问哪些专业问题？',
    },
    {
      role: 'assistant',
      content: '根据你的背景和近期面经数据:\n\n1. 出行业务的产品架构设计\n2. 大规模用户场景下的产品策略\n3. 商业目标与产品规划的协同',
    },
  ];

  return (
    <div className="w-[300px] h-full bg-[#EBE8E1] border-l border-[#E0DCD1] flex flex-col">
      {/* 头部 */}
      <div className="p-4 border-b border-[#E0DCD1]">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[#8B735B]" />
          <h2 className="text-sm font-bold text-[#111111]">AI 助手</h2>
        </div>
        <p className="text-xs text-[#666666] mt-1">
          当前上下文: 滴滴出行面试准备
        </p>
      </div>

      {/* 对话区域 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {mockMessages.map((message, index) => (
          <div key={index} className="space-y-2">
            {message.role === 'user' ? (
              <div className="flex items-start gap-2">
                <User className="w-4 h-4 text-[#666666] mt-1 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-xs font-bold text-[#111111] mb-1">你</p>
                  <p className="text-sm text-[#111111]">{message.content}</p>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-2 pl-2 border-l-2 border-[#8B735B]">
                <Bot className="w-4 h-4 text-[#8B735B] mt-1 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-xs font-bold text-[#8B735B] mb-1">AI 助手</p>
                  <p className="text-sm text-[#111111] whitespace-pre-line">
                    {message.content}
                  </p>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* 输入框 */}
      <div className="p-4 border-t border-[#E0DCD1]">
        <div className="relative">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="向AI助手提问..."
            className="w-full px-4 py-2 pr-10 text-sm bg-white border border-[#E0DCD1] rounded-md focus:outline-none focus:ring-2 focus:ring-[#111111] focus:border-transparent"
          />
          <button className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-[#E0DCD1] rounded transition-colors">
            <Send className="w-4 h-4 text-[#666666]" />
          </button>
        </div>
      </div>
    </div>
  );
}
