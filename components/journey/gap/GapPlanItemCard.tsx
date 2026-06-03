'use client';

import { useState, useCallback } from 'react';
import { Calendar, Clock, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react';
import type { PlanItem } from '@/types/gap-filling';
import { getToday } from '@/lib/dateUtils';

const PRIORITY_STYLES: Record<string, { bg: string; text: string; border: string; label: string }> = {
  high: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', label: '高优先级' },
  medium: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', label: '中优先级' },
  low: { bg: 'bg-gray-50', text: 'text-gray-500', border: 'border-gray-200', label: '低优先级' },
};

interface GapPlanItemCardProps {
  item: PlanItem;
  onAddToSchedule: (itemId: string, date: string, time: string) => Promise<void>;
}

export default function GapPlanItemCard({ item, onAddToSchedule }: GapPlanItemCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedDate, setSelectedDate] = useState(getToday());
  const [selectedTime, setSelectedTime] = useState('09:00');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showNotes, setShowNotes] = useState(false);

  const priorityStyle = PRIORITY_STYLES[item.priority] ?? PRIORITY_STYLES.low;

  const handleToggleExpand = useCallback(() => {
    if (item.addedToSchedule) return; // 已加入日程不再展开
    setIsExpanded((v) => !v);
  }, [item.addedToSchedule]);

  const handleConfirmAdd = useCallback(async () => {
    if (!selectedDate.trim()) return;
    setIsSubmitting(true);
    try {
      await onAddToSchedule(item.id, selectedDate, selectedTime);
      setIsExpanded(false);
    } catch {
      // 失败不处理 UI，由父组件管理
    } finally {
      setIsSubmitting(false);
    }
  }, [item.id, selectedDate, selectedTime, onAddToSchedule]);

  return (
    <div className="border border-[#E8E5E0] rounded-lg bg-[#FCFBF9] overflow-hidden transition-all">
      {/* Main row */}
      <div className="p-3.5">
        <div className="flex items-start justify-between gap-3">
          {/* Left: info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1.5">
              <h4 className="text-sm font-bold text-[#111111]">{item.title}</h4>
              <span
                className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full border ${priorityStyle.bg} ${priorityStyle.text} ${priorityStyle.border} flex-shrink-0`}
              >
                {priorityStyle.label}
              </span>
            </div>

            <div className="flex items-center gap-4 text-xs text-[#666666] flex-wrap">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                预计 {item.estimatedHours}h
              </span>
              <span className="text-[#8B735B]">
                关联差距：{item.relatedGap}
              </span>
            </div>

            <div className="mt-2 text-xs text-[#666666] leading-relaxed">
              <span className="font-medium text-[#8B735B]">完成标准：</span>
              {item.completionCriteria}
            </div>

            {/* Notes 折叠 */}
            {item.notes && (
              <div className="mt-2">
                <button
                  onClick={() => setShowNotes(!showNotes)}
                  className="flex items-center gap-1 text-[10px] text-[#999999] hover:text-[#666666] transition-colors"
                >
                  {showNotes ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  {showNotes ? '收起补充说明' : '查看补充说明'}
                </button>
                {showNotes && (
                  <p className="mt-1.5 text-xs text-[#666666] leading-relaxed bg-[#F5F2EE] rounded-md p-2 border border-[#F0EDE8]">
                    {item.notes}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Right: action button */}
          <div className="flex-shrink-0">
            {item.addedToSchedule ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-green-600 bg-green-50 border border-green-200 rounded-lg">
                <CheckCircle2 className="w-3.5 h-3.5" />
                已加入日程
              </span>
            ) : (
              <button
                onClick={handleToggleExpand}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                  isExpanded
                    ? 'bg-[#E0DCD1] text-[#666666]'
                    : 'bg-[#8B735B] text-white hover:bg-[#7A654D] shadow-sm'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                {isExpanded ? '取消' : '加入日程'}
              </button>
            )}
          </div>
        </div>

        {/* Inline date/time picker (expanded) */}
        {isExpanded && (
          <div className="mt-3 pt-3 border-t border-[#E8E5E0]">
            <div className="flex items-end gap-3 flex-wrap">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-medium text-[#8B735B] uppercase tracking-wider">日期</label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="px-3 py-1.5 text-xs border border-[#E0DCD1] rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-[#8B735B]/20 text-[#111111]"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-medium text-[#8B735B] uppercase tracking-wider">时间（可选）</label>
                <input
                  type="time"
                  value={selectedTime}
                  onChange={(e) => setSelectedTime(e.target.value)}
                  className="px-3 py-1.5 text-xs border border-[#E0DCD1] rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-[#8B735B]/20 text-[#111111]"
                />
              </div>
              <button
                onClick={handleConfirmAdd}
                disabled={isSubmitting || !selectedDate.trim()}
                className="px-4 py-1.5 text-xs font-medium bg-[#8B735B] hover:bg-[#7A654D] disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
              >
                {isSubmitting ? '创建中...' : '确认添加'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
