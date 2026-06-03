'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronDown, Plus, Check } from 'lucide-react';

interface JourneySwitcherProps {
  journeys: Array<{ id: string; title: string }>;
  currentId: string | null;
  onSelect: (id: string) => void;
  onCreate: (title: string) => Promise<void>;
  onRename: (id: string, title: string) => Promise<void>;
}

export default function JourneySwitcher({
  journeys,
  currentId,
  onSelect,
  onCreate,
  onRename,
}: JourneySwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [createValue, setCreateValue] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);
  const createInputRef = useRef<HTMLInputElement>(null);

  const currentJourney = journeys.find((j) => j.id === currentId);
  const displayTitle = currentJourney?.title ?? '求职陪跑';

  // 点击外部关闭 dropdown
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setIsRenaming(false);
        setIsCreating(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // 进入改名模式时聚焦 input
  useEffect(() => {
    if (isRenaming && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [isRenaming]);

  // 进入新建模式时聚焦 input
  useEffect(() => {
    if (isCreating && createInputRef.current) {
      createInputRef.current.focus();
    }
  }, [isCreating]);

  // 开始改名
  const handleStartRename = useCallback(() => {
    if (!currentJourney) return;
    setRenameValue(currentJourney.title);
    setIsRenaming(true);
    setIsOpen(false);
  }, [currentJourney]);

  // 确认改名
  const handleConfirmRename = useCallback(async () => {
    const trimmed = renameValue.trim();
    if (!trimmed || !currentId || trimmed === currentJourney?.title) {
      setIsRenaming(false);
      return;
    }
    setIsSubmitting(true);
    await onRename(currentId, trimmed);
    setIsSubmitting(false);
    setIsRenaming(false);
  }, [renameValue, currentId, currentJourney, onRename]);

  // 改名输入框回车
  const handleRenameKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleConfirmRename();
      } else if (e.key === 'Escape') {
        setIsRenaming(false);
      }
    },
    [handleConfirmRename]
  );

  // 开始新建
  const handleStartCreate = useCallback(() => {
    setCreateValue('');
    setIsCreating(true);
  }, []);

  // 确认新建
  const handleConfirmCreate = useCallback(async () => {
    const trimmed = createValue.trim();
    if (!trimmed) {
      setIsCreating(false);
      return;
    }
    setIsSubmitting(true);
    await onCreate(trimmed);
    setIsSubmitting(false);
    setIsCreating(false);
    setIsOpen(false);
  }, [createValue, onCreate]);

  // 新建输入框回车
  const handleCreateKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleConfirmCreate();
      } else if (e.key === 'Escape') {
        setIsCreating(false);
      }
    },
    [handleConfirmCreate]
  );

  // 选择 journey
  const handleSelect = useCallback(
    (id: string) => {
      onSelect(id);
      setIsOpen(false);
    },
    [onSelect]
  );

  return (
    <div className="relative flex-shrink-0" ref={containerRef}>
      {/* 当前陪跑名称（可点击改名） */}
      {isRenaming ? (
        <input
          ref={renameInputRef}
          type="text"
          value={renameValue}
          onChange={(e) => setRenameValue(e.target.value)}
          onBlur={handleConfirmRename}
          onKeyDown={handleRenameKeyDown}
          disabled={isSubmitting}
          className="px-2 py-1 text-sm font-medium text-[#111111] bg-white border border-[#8B735B] rounded focus:outline-none focus:ring-1 focus:ring-[#8B735B] w-[160px]"
          placeholder="输入名称"
        />
      ) : (
        <div className="flex items-center rounded-lg hover:bg-[#E0DCD1]/60 transition-colors">
          {/* 名称区域：点击触发改名 */}
          <button
            onClick={handleStartRename}
            className="px-3 py-1.5 text-sm font-medium text-[#111111] hover:text-[#8B735B] transition-colors cursor-pointer rounded-l-lg"
            title="点击重命名陪跑记录"
          >
            <span className="max-w-[120px] truncate block">{displayTitle}</span>
          </button>
          {/* 箭头区域：点击展开下拉列表 */}
          <button
            onClick={() => setIsOpen((v) => !v)}
            className="pl-0.5 pr-2 py-1.5 text-sm text-[#8B735B] cursor-pointer rounded-r-lg"
            title="点击切换陪跑记录"
          >
            <ChevronDown
              className={`w-4 h-4 transition-transform duration-200 ${
                isOpen ? 'rotate-180' : ''
              }`}
            />
          </button>
        </div>
      )}

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-1 w-[220px] bg-[#F4F3EE] border border-[#E0DCD1] rounded-lg shadow-lg z-50 overflow-hidden transition-all duration-150">
          {/* 列表 */}
          <div className="max-h-[200px] overflow-y-auto py-1">
            {journeys.length === 0 && (
              <p className="px-3 py-2 text-xs text-[#999999]">暂无陪跑记录</p>
            )}
            {journeys.map((j) => {
              const isCurrent = j.id === currentId;
              return (
                <button
                  key={j.id}
                  onClick={() => handleSelect(j.id)}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors cursor-pointer ${
                    isCurrent
                      ? 'bg-[#8B735B]/10 text-[#8B735B] font-medium'
                      : 'text-[#111111] hover:bg-[#E0DCD1]'
                  }`}
                >
                  <span className="flex-1 truncate">{j.title}</span>
                  {isCurrent && <Check className="w-4 h-4 flex-shrink-0 text-[#8B735B]" />}
                </button>
              );
            })}
          </div>

          {/* 分割线 */}
          <div className="border-t border-[#E0DCD1]" />

          {/* 新建区域 */}
          {isCreating ? (
            <div className="px-3 py-2">
              <input
                ref={createInputRef}
                type="text"
                value={createValue}
                onChange={(e) => setCreateValue(e.target.value)}
                onBlur={handleConfirmCreate}
                onKeyDown={handleCreateKeyDown}
                disabled={isSubmitting}
                placeholder="输入陪跑记录名称"
                className="w-full px-2 py-1.5 text-sm text-[#111111] bg-white border border-[#8B735B] rounded focus:outline-none focus:ring-1 focus:ring-[#8B735B] placeholder-[#999999]"
                autoFocus
              />
            </div>
          ) : (
            <button
              onClick={handleStartCreate}
              disabled={isSubmitting}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[#8B735B] hover:bg-[#E0DCD1] transition-colors cursor-pointer disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              新建陪跑
            </button>
          )}
        </div>
      )}
    </div>
  );
}
