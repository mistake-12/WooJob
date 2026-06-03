'use client';

import { LucideIcon, CheckCircle2 } from 'lucide-react';

export type JourneyStageStatus = 'available' | 'completed' | 'coming_soon';

export interface JourneyStageCardProps {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  status: JourneyStageStatus;
  onSelect?: (id: string) => void;
}

export default function JourneyStageCard({
  id,
  title,
  description,
  icon: Icon,
  status,
  onSelect,
}: JourneyStageCardProps) {
  const isAvailable = status === 'available';
  const isCompleted = status === 'completed';
  const isClickable = isAvailable || isCompleted;

  const handleClick = () => {
    if (isClickable && onSelect) {
      onSelect(id);
    }
  };

  const borderClass = isCompleted
    ? 'bg-green-50/40 border-green-200 hover:border-green-400 hover:shadow-lg hover:scale-[1.02] cursor-pointer'
    : isAvailable
      ? 'bg-white border-[#E0DCD1] hover:border-[#8B735B] hover:shadow-lg hover:scale-[1.02] cursor-pointer'
      : 'bg-white/40 border-[#E0DCD1]/50 cursor-not-allowed opacity-50';

  const iconBgClass = isCompleted
    ? 'bg-green-100 group-hover:bg-green-200/60'
    : isAvailable
      ? 'bg-[#8B735B]/10 group-hover:bg-[#8B735B]/20'
      : 'bg-[#8B735B]/5';

  const iconColorClass = isCompleted
    ? 'text-green-600'
    : isAvailable
      ? 'text-[#8B735B]'
      : 'text-[#8B735B]/40';

  const titleColorClass = isCompleted
    ? 'text-[#111111]'
    : isAvailable
      ? 'text-[#111111]'
      : 'text-[#111111]/50';

  const descColorClass = isCompleted
    ? 'text-[#666666]'
    : isAvailable
      ? 'text-[#666666]'
      : 'text-[#666666]/50';

  return (
    <button
      onClick={handleClick}
      disabled={!isClickable}
      className={`relative group rounded-2xl border p-6 text-left transition-all duration-300 ${borderClass}`}
    >
      {/* Icon */}
      <div
        className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-colors ${iconBgClass}`}
      >
        <Icon className={`w-6 h-6 ${iconColorClass}`} />
      </div>

      {/* Title */}
      <h3 className={`text-lg font-bold mb-2 ${titleColorClass}`}>
        {title}
      </h3>

      {/* Description */}
      <p className={`text-sm leading-relaxed ${descColorClass}`}>
        {description}
      </p>

      {/* Completed Badge */}
      {isCompleted && (
        <div className="absolute top-4 right-4">
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-green-700 bg-green-100 rounded-full border border-green-200">
            <CheckCircle2 className="w-3 h-3" />
            已完成
          </span>
        </div>
      )}

      {/* Coming Soon Badge */}
      {status === 'coming_soon' && (
        <div className="absolute top-4 right-4">
          <span className="inline-block px-2 py-1 text-xs font-medium text-[#8B735B]/60 bg-[#8B735B]/5 rounded-full border border-[#8B735B]/10">
            即将开放
          </span>
        </div>
      )}

      {/* Hover Arrow (available + completed) */}
      {isClickable && (
        <div className="absolute bottom-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity">
          <svg
            className={`w-5 h-5 ${isCompleted ? 'text-green-600' : 'text-[#8B735B]'}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 7l5 5m0 0l-5 5m5-5H6"
            />
          </svg>
        </div>
      )}
    </button>
  );
}
