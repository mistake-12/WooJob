'use client';

import type { GapFillingPhase } from '@/types/gap-filling';
import { PHASE_CONFIG } from '@/types/gap-filling';
import GapPlanItemCard from './GapPlanItemCard';

interface GapPlanPhaseSectionProps {
  phase: GapFillingPhase;
  onAddToSchedule: (itemId: string, date: string, time: string) => Promise<void>;
}

export default function GapPlanPhaseSection({ phase, onAddToSchedule }: GapPlanPhaseSectionProps) {
  const config = PHASE_CONFIG[phase.type];

  return (
    <section className="bg-white border border-[#E0DCD1] rounded-xl shadow-sm overflow-hidden">
      {/* Phase Header */}
      <div className="px-5 py-4 border-b border-[#F0EDE8] bg-[#F9F8F6]">
        <div className="flex items-center gap-2.5">
          <span className="text-xl">{config.icon}</span>
          <div>
            <h3 className="text-sm font-bold text-[#111111]">{config.label}</h3>
            <p className="text-xs text-[#999999] mt-0.5">{config.description}</p>
          </div>
          <span className="ml-auto text-xs text-[#999999] flex-shrink-0">
            {phase.items.length} 项
          </span>
        </div>
      </div>

      {/* Items */}
      <div className="p-4 space-y-3">
        {phase.items.map((item) => (
          <GapPlanItemCard
            key={item.id}
            item={item}
            onAddToSchedule={onAddToSchedule}
          />
        ))}
      </div>
    </section>
  );
}
