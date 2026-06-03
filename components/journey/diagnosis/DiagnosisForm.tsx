'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Upload, X, Image, Loader2, BarChart3 } from 'lucide-react';
import type { ResumeInfo } from '@/types';
import type { JobSnapshot } from '@/types/diagnosis';
import { fetchUserResumes } from '@/app/actions/profile';
import { identifyJobPosition } from '@/app/actions/diagnosis';

interface DiagnosisFormProps {
  onIdentified: (snapshot: JobSnapshot) => void;
  onError: (error: string) => void;
}

export default function DiagnosisForm({ onIdentified, onError }: DiagnosisFormProps) {
  const [targetPosition, setTargetPosition] = useState('');
  const [targetCompany, setTargetCompany] = useState('');
  const [textJD, setTextJD] = useState('');
  const [selfDescription, setSelfDescription] = useState('');
  const [resumes, setResumes] = useState<ResumeInfo[]>([]);
  const [selectedResumeId, setSelectedResumeId] = useState('');
  const [resumesLoading, setResumesLoading] = useState(true);
  const [resumesError, setResumesError] = useState<string | null>(null);

  // 图片上传状态
  const [pendingImages, setPendingImages] = useState<string[]>([]);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  // 提交状态
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 加载简历列表
  useEffect(() => {
    (async () => {
      setResumesLoading(true);
      setResumesError(null);
      const result = await fetchUserResumes();
      if (result.error) {
        setResumesError(result.error);
        setResumes([]);
      } else {
        const list = result.resumes ?? [];
        setResumes(list);
        setSelectedResumeId(list[0]?.id ?? '');
      }
      setResumesLoading(false);
    })();
  }, []);

  // ── 图片上传处理 ────────────────────────────────────────────────────────

  const addImage = useCallback((base64: string) => {
    setPendingImages((prev) => [...prev, base64]);
  }, []);

  const removeImage = useCallback((index: number) => {
    setPendingImages((prev) => prev.filter((_, i) => i !== index));
  }, []);

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

  const addImagesFromFiles = useCallback((files: File[]) => {
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        setPendingImages((prev) => [...prev, base64]);
      };
      reader.readAsDataURL(file);
    });
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      addImage(base64);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }, [addImage]);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      const hasImage = Array.from(e.dataTransfer.items).some(
        (item) => item.kind === 'file' && item.type.startsWith('image/')
      );
      if (hasImage) setIsDraggingOver(true);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (dropZoneRef.current && !dropZoneRef.current.contains(e.relatedTarget as Node)) {
      setIsDraggingOver(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
    const files = extractImageFiles(e.dataTransfer.items);
    if (files.length > 0) addImagesFromFiles(files);
  }, [extractImageFiles, addImagesFromFiles]);

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    const imageFiles = extractImageFiles(items);
    if (imageFiles.length > 0) {
      e.preventDefault();
      addImagesFromFiles(imageFiles);
    }
  }, [extractImageFiles, addImagesFromFiles]);

  // ── 提交表单 ────────────────────────────────────────────────────────────

  const canSubmit = targetPosition.trim() && (textJD.trim() || pendingImages.length > 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit || isSubmitting) return;

    setIsSubmitting(true);

    const result = await identifyJobPosition({
      textJD: textJD.trim() || undefined,
      imageBase64: pendingImages[0],
      targetPosition: targetPosition.trim(),
      targetCompany: targetCompany.trim() || undefined,
    });

    setIsSubmitting(false);

    if (result.error) {
      onError(result.error);
    } else if (result.snapshot) {
      onIdentified(result.snapshot);
    } else {
      onError('AI 未返回有效结果，请重试');
    }
  }

  return (
    <form onSubmit={handleSubmit} className="h-full min-h-0 flex flex-col">
      {/* 说明区域 */}
      <div className="flex items-start gap-3 px-8 pt-7 pb-6">
        <div className="w-9 h-9 rounded-lg bg-[#8B735B]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
          <BarChart3 className="w-5 h-5 text-[#8B735B]" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-[#111111]">能力诊断</h2>
          <p className="text-sm text-[#666666] mt-1 leading-relaxed max-w-[560px]">
            填写目标岗位信息和 JD（可上传截图），AI 将识别岗位要求并生成你的能力诊断报告。
          </p>
        </div>
      </div>

      {/* 表单内容 */}
      <div className="flex-1 min-h-0 overflow-y-auto px-8 pb-8">
        <div className="max-w-[640px] space-y-6">

          {/* 目标岗位 + 目标公司 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-[#8B735B] uppercase tracking-wider">
                目标岗位 <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={targetPosition}
                onChange={(e) => setTargetPosition(e.target.value)}
                placeholder="如：高级产品经理 / 前端架构师"
                className="w-full bg-white border border-[#E0DCD1] rounded-md px-3 py-2.5 text-sm text-[#111111] placeholder-[#C5C0BA] outline-none focus:ring-2 focus:ring-[#8B735B]/20 focus:border-[#8B735B] transition-colors"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-[#8B735B] uppercase tracking-wider">
                目标公司 <span className="text-[#999999] font-normal normal-case tracking-normal">（可选）</span>
              </label>
              <input
                type="text"
                value={targetCompany}
                onChange={(e) => setTargetCompany(e.target.value)}
                placeholder="如：字节跳动 / Google"
                className="w-full bg-white border border-[#E0DCD1] rounded-md px-3 py-2.5 text-sm text-[#111111] placeholder-[#C5C0BA] outline-none focus:ring-2 focus:ring-[#8B735B]/20 focus:border-[#8B735B] transition-colors"
              />
            </div>
          </div>

          {/* JD 文本框 */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-[#8B735B] uppercase tracking-wider">
              JD / 岗位描述
              <span className="text-[#999999] font-normal normal-case tracking-normal ml-1">
                （至少填写 JD 文字或上传截图）
              </span>
            </label>
            <textarea
              value={textJD}
              onChange={(e) => setTextJD(e.target.value)}
              placeholder="粘贴岗位描述（JD）文字，AI 将提取关键信息..."
              rows={6}
              className="w-full bg-white border border-[#E0DCD1] rounded-md px-3 py-2.5 text-sm text-[#111111] placeholder-[#C5C0BA] outline-none focus:ring-2 focus:ring-[#8B735B]/20 focus:border-[#8B735B] transition-colors resize-none"
            />
          </div>

          {/* JD 截图上传区 */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-[#8B735B] uppercase tracking-wider">
              JD 截图上传
              <span className="text-[#999999] font-normal normal-case tracking-normal ml-1">
                （拖拽、粘贴或点击上传）
              </span>
            </label>

            <div
              ref={dropZoneRef}
              onDragEnter={handleDragEnter}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onPaste={handlePaste}
              className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                isDraggingOver
                  ? 'border-[#8B735B] bg-[#8B735B]/5'
                  : 'border-[#D8D4CE] hover:border-[#8B735B]/50 hover:bg-[#F5F2EE]'
              }`}
            >
              {pendingImages.length === 0 ? (
                <div className="flex flex-col items-center gap-2">
                  <div className="w-10 h-10 rounded-full bg-[#8B735B]/5 flex items-center justify-center">
                    <Upload className="w-5 h-5 text-[#8B735B]" />
                  </div>
                  <p className="text-sm text-[#666666]">
                    拖拽图片到此处，或{' '}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-[#8B735B] underline hover:text-[#7A654D]"
                    >
                      点击选择文件
                    </button>
                  </p>
                  <p className="text-xs text-[#999999]">也支持 Ctrl+V 直接粘贴截图</p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-3 justify-center">
                    {pendingImages.map((img, i) => (
                      <div key={i} className="relative group">
                        <img
                          src={img}
                          alt={`JD 截图 ${i + 1}`}
                          className="w-[180px] h-[120px] object-cover rounded-md border border-[#E0DCD1] shadow-sm"
                        />
                        <button
                          type="button"
                          onClick={() => removeImage(i)}
                          className="absolute -top-2 -right-2 w-5 h-5 bg-white border border-[#E0DCD1] rounded-full flex items-center justify-center shadow-sm hover:bg-red-50 transition-colors"
                        >
                          <X className="w-3 h-3 text-[#999999]" />
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-[180px] h-[120px] border-2 border-dashed border-[#D8D4CE] rounded-md flex flex-col items-center justify-center gap-1 hover:border-[#8B735B]/50 hover:bg-[#F5F2EE] transition-colors"
                    >
                      <Image className="w-5 h-5 text-[#8B735B]/60" />
                      <span className="text-xs text-[#999999]">再添加一张</span>
                    </button>
                  </div>
                </div>
              )}

              {/* 拖拽遮罩 */}
              {isDraggingOver && (
                <div className="absolute inset-0 z-10 bg-[#8B735B]/10 backdrop-blur-sm rounded-lg flex flex-col items-center justify-center gap-2">
                  <Image className="w-8 h-8 text-[#8B735B]" />
                  <p className="text-sm font-medium text-[#8B735B]">释放以上传图片</p>
                </div>
              )}
            </div>
          </div>

          {/* 简历版本 + 自我描述 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-[#8B735B] uppercase tracking-wider">
                简历版本 <span className="text-[#999999] font-normal normal-case tracking-normal">（可选）</span>
              </label>
              {resumesLoading ? (
                <div className="text-xs text-[#999999] py-2.5">正在加载简历列表…</div>
              ) : resumesError ? (
                <div className="text-xs text-red-500 py-2.5">{resumesError}</div>
              ) : resumes.length === 0 ? (
                <div className="text-xs text-[#999999] py-2.5">暂无简历，可先上传简历 PDF</div>
              ) : (
                <select
                  value={selectedResumeId}
                  onChange={(e) => setSelectedResumeId(e.target.value)}
                  className="w-full bg-white border border-[#E0DCD1] rounded-md px-3 py-2.5 text-sm text-[#111111] outline-none focus:ring-2 focus:ring-[#8B735B]/20 focus:border-[#8B735B] transition-colors appearance-none"
                >
                  {resumes.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.filename}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-[#8B735B] uppercase tracking-wider">
                自我描述 <span className="text-[#999999] font-normal normal-case tracking-normal">（可选）</span>
              </label>
              <textarea
                value={selfDescription}
                onChange={(e) => setSelfDescription(e.target.value)}
                placeholder="补充你的核心技能、项目经验等（如：5年C端产品经验，擅长数据驱动增长）"
                rows={2}
                className="w-full bg-white border border-[#E0DCD1] rounded-md px-3 py-2.5 text-sm text-[#111111] placeholder-[#C5C0BA] outline-none focus:ring-2 focus:ring-[#8B735B]/20 focus:border-[#8B735B] transition-colors resize-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 底部操作区 */}
      <div className="flex-shrink-0 px-8 py-4 border-t border-[#CFCCC8] bg-[#F5F2EE]">
        <div className="max-w-[640px] flex items-center justify-between">
          <p className="text-xs text-[#999999]">
            {!targetPosition.trim()
              ? '请填写目标岗位'
              : !textJD.trim() && pendingImages.length === 0
              ? '请填写 JD 或上传截图'
              : '点击"开始识别"让 AI 提取岗位信息'}
          </p>
          <button
            type="submit"
            disabled={!canSubmit || isSubmitting}
            className="flex items-center gap-2 px-6 py-2.5 bg-[#8B735B] hover:bg-[#7A654D] disabled:bg-[#B5A895] disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                识别中...
              </>
            ) : (
              '开始识别'
            )}
          </button>
        </div>
      </div>
    </form>
  );
}
