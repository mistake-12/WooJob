'use client';

import { useState, useEffect } from 'react';
import { X, RotateCcw, Trash2 } from 'lucide-react';
import { useJobStore } from '@/store/useJobStore';

interface TrashDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function TrashDrawer({ isOpen, onClose }: TrashDrawerProps) {
  const trashedJobs = useJobStore((s) => s.trashedJobs);
  const restoreJob = useJobStore((s) => s.restoreJob);
  const permanentDeleteJob = useJobStore((s) => s.permanentDeleteJob);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      requestAnimationFrame(() => setIsVisible(true));
    } else {
      setIsVisible(false);
    }
  }, [isOpen]);

  if (!isOpen && !isVisible) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/25 backdrop-blur-[3px] z-[100] transition-opacity duration-300 ${
          isVisible ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={onClose}
      />

      {/* Bottom Sheet */}
      <div
        className={`fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[600px] h-[70vh] bg-[#EBE8E1] z-[101]
          flex flex-col shadow-[0_-4px_40px_rgba(0,0,0,0.15)]
          rounded-t-2xl
          transition-transform duration-300 ease-out
          ${isVisible ? 'translate-y-0' : 'translate-y-full'}`}
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-[#D8D4CE] flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-gray-400" />
              <h2 className="text-lg font-bold text-gray-900">回收站</h2>
              {trashedJobs.length > 0 && (
                <span className="text-sm text-gray-400 font-medium">({trashedJobs.length})</span>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full text-gray-400 hover:text-gray-700 hover:bg-[#DCD9D1] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {trashedJobs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center gap-3">
              <Trash2 className="w-10 h-10 text-gray-300" />
              <p className="text-sm text-[#999999]">回收站为空</p>
              <p className="text-xs text-[#999999]">已删除的岗位会出现在这里</p>
            </div>
          ) : (
            <div className="flex flex-col divide-y divide-[#D8D4CE]">
              {trashedJobs.map((job) => (
                <div
                  key={job.id}
                  className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
                >
                  <div className="flex flex-col min-w-0 mr-4">
                    <span className="text-sm font-medium text-gray-900 truncate">{job.company}</span>
                    <span className="text-xs text-[#999999] truncate">{job.title}</span>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => restoreJob(job.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium
                        bg-[#E5E1DA] text-gray-600 hover:bg-gray-200 transition-colors"
                    >
                      <RotateCcw className="w-3 h-3" />
                      恢复
                    </button>
                    <button
                      onClick={() => permanentDeleteJob(job.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium
                        bg-red-50 text-red-500 hover:bg-red-100 transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                      删除
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
