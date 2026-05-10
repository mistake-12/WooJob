'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import { Task, TaskType, ResumeInfo } from '@/types';
import { useJobStore } from '@/store/useJobStore';
import { getNext24HoursTasks, isoToDateLabel } from '@/lib/dateUtils';
import { createBrowserSupabaseClient } from '@/lib/supabase';
import { fetchUserResumes, updateUserResume, deleteUserResume } from '@/app/actions/profile';
import { FileText, Check, Plus, Loader2, AlertCircle, Download } from 'lucide-react';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

interface BottomShelfProps {
  onTaskClick: (taskId: string) => void;
}

interface TaskCardProps {
  task: Task;
  onClick: () => void;
}

const TAG_STYLES: Record<TaskType, { bg: string; text: string }> = {
  '面试': { bg: 'bg-[#8B735B]/10', text: 'text-[#8B735B]' },
  '笔试': { bg: 'bg-[#8B735B]/10', text: 'text-[#8B735B]' },
  '待投递': { bg: 'bg-[#8B735B]/10', text: 'text-[#8B735B]' },
  '待办事项': { bg: 'bg-[#8B735B]/10', text: 'text-[#8B735B]' },
};

function ResumeCard({
  resumes,
  isUploading,
  onUploadClick,
  onDelete,
  onDownload,
}: {
  resumes: ResumeInfo[];
  isUploading: boolean;
  onUploadClick: () => void;
  onDelete: (id: string) => void;
  onDownload: (resume: ResumeInfo) => void;
}) {

  if (isUploading) {
    return (
      <div className="bg-white rounded-md border border-[#E0DCD1] shadow-sm p-4 animate-pulse">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#8B735B]/10 rounded-md" />
          <div className="flex-1">
            <div className="h-4 bg-[#8B735B]/10 rounded w-3/4 mb-2" />
            <div className="h-3 bg-[#8B735B]/5 rounded w-1/2" />
          </div>
          <Loader2 className="w-5 h-5 text-[#8B735B] animate-spin" />
        </div>
        <p className="text-xs text-[#8B735B] mt-3 text-center">正在加密上传中...</p>
      </div>
    );
  }

  const resumeList = Array.isArray(resumes) ? resumes : [];

  return (
    <div className="w-full flex flex-col flex-1 min-h-0">
      {/* 简历列表 - 内部滚动 */}
      {resumeList.length > 0 ? (
        <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin w-full">
          <div className="space-y-2 w-full">
            {resumeList.map((resume) => (
            <div
              key={resume.id}
              className="bg-white rounded-md shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 w-full"
            >
              <div className="p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 bg-[#8B735B]/10 rounded-md flex items-center justify-center flex-shrink-0">
                      <FileText className="w-5 h-5 text-[#8B735B]" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[#111111] truncate max-w-[240px]" title={resume.filename}>
                        {resume.filename}
                      </p>
                      <p className="text-xs text-[#999999] mt-0.5">简历版本</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => onDownload(resume)}
                      className="p-2 bg-[#8B735B]/10 hover:bg-[#8B735B]/20 rounded-md transition-colors"
                      title="下载"
                    >
                      <Download className="w-4 h-4 text-[#8B735B]" />
                    </button>
                    <a
                      href={resume.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 bg-[#8B735B]/10 hover:bg-[#8B735B]/20 rounded-md transition-colors"
                      title="预览"
                    >
                      <svg className="w-4 h-4 text-[#8B735B]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    </a>
                    <button
                      onClick={() => resume.id && onDelete(resume.id)}
                      className="p-2 bg-[#8B735B]/10 hover:bg-red-50 rounded-md transition-colors group"
                      title="删除"
                    >
                      <svg className="w-4 h-4 text-[#8B735B] group-hover:text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
            ))}
          </div>
        </div>
      ) : (
        /* 无简历时显示添加按钮 */
        <button
          onClick={onUploadClick}
          className="w-full py-3 px-4 bg-[#8B735B]/10 hover:bg-[#8B735B]/20 rounded-lg transition-colors cursor-pointer group flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4 text-[#8B735B]" />
          <span className="text-sm font-medium text-[#8B735B]">添加简历</span>
        </button>
      )}
    </div>
  );
}

function Toast({
  message,
  type,
  onClose,
}: {
  message: string;
  type: 'success' | 'error';
  onClose: () => void;
}) {
  return (
    <div
      className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg text-sm font-medium animate-in slide-in-from-bottom-2 ${
        type === 'success'
          ? 'bg-[#8B735B] text-white'
          : 'bg-red-500 text-white'
      }`}
    >
      {type === 'error' ? (
        <AlertCircle className="w-4 h-4 flex-shrink-0" />
      ) : (
        <Check className="w-4 h-4 flex-shrink-0" />
      )}
      <span>{message}</span>
      <button onClick={onClose} className="ml-1 opacity-70 hover:opacity-100">
        &times;
      </button>
    </div>
  );
}

function TaskCard({ task, onClick }: TaskCardProps) {
  const toggleTaskCompletion = useJobStore((s) => s.toggleTaskCompletion);
  const tagStyle = TAG_STYLES[task.tag] || TAG_STYLES['待办事项'];
  const dateLabel = isoToDateLabel(task.date);

  return (
    <div
      onClick={onClick}
      className="flex items-center gap-3 py-3 cursor-pointer hover:bg-white/60 rounded-md px-2 -mx-2 transition-colors group"
    >
      {/* 时间 */}
      <div className="min-w-[48px] text-right">
        <div className="flex flex-col items-end">
          <span className="text-base font-bold text-[#8B735B]">
            {task.time ? task.time.slice(0, 5) : ''}
          </span>
          {dateLabel !== '今天' && (
            <span className="text-[10px] text-[#8B735B]/70">{dateLabel}</span>
          )}
        </div>
      </div>

      {/* 分隔线 */}
      <div className="w-px h-8 bg-[#DCD9D1] flex-shrink-0" />

      {/* 内容 */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-gray-900 truncate">{task.title}</p>
        <p className="text-xs text-gray-400 mt-0.5 truncate">{task.round || task.company}</p>
      </div>

      {/* 标签 */}
      <span className={`px-3 py-1 rounded-full text-xs font-medium flex-shrink-0 ${tagStyle.bg} ${tagStyle.text}`}>
        {task.tag}
      </span>

      {/* 完成按钮 */}
      {!task.isCompleted ? (
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleTaskCompletion(task.id);
          }}
          className="w-5 h-5 rounded-full border-2 border-[#8B735B]/30 hover:border-[#8B735B] hover:bg-[#8B735B]/10 flex items-center justify-center transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0"
          title="标记完成"
        >
          <span className="sr-only">标记完成</span>
        </button>
      ) : (
        <span className="w-5 h-5 rounded-full bg-[#8B735B] flex items-center justify-center flex-shrink-0">
          <Check className="w-3 h-3 text-white" />
        </span>
      )}
    </div>
  );
}

export default function BottomShelf({ onTaskClick }: BottomShelfProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const tasks = useJobStore((s) => s.tasks);
  const next24HoursTasks = getNext24HoursTasks(tasks);

  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [resumes, setResumes] = useState<ResumeInfo[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);
  // 保存 resumes 快照，避免 async 函数中闭包捕获旧值
  const resumesRef = useRef<ResumeInfo[]>([]);
  useEffect(() => { resumesRef.current = resumes; }, [resumes]);

  // 初始化：从数据库加载简历列表（优先），同时检查 localStorage 做兜底兼容
  useEffect(() => {
    (async () => {
      const { resumes: dbResumes } = await fetchUserResumes();
      if (dbResumes && dbResumes.length > 0) {
        setResumes(dbResumes);
        localStorage.setItem('resume_info', JSON.stringify(dbResumes));
      } else {
        const stored = localStorage.getItem('resume_info');
        if (stored) {
          const parsed = JSON.parse(stored);
          const list = Array.isArray(parsed) ? parsed : parsed ? [parsed] : [];
          setResumes(list);
        }
      }
      setIsInitialized(true);
    })();
  }, []);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  async function handleUpload(file: File) {
    if (!isInitialized) return;
    if (file.type !== 'application/pdf') {
      showToast('仅支持 PDF 格式文件', 'error');
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      showToast('文件大小不能超过 10MB', 'error');
      return;
    }

    setIsUploading(true);
    setToast(null);

    try {
      const supabase = createBrowserSupabaseClient();
      // 唯一路径，避免文件名冲突
      const storagePath = `${crypto.randomUUID()}.pdf`;

      const { error: uploadError } = await supabase.storage
        .from('resumes')
        .upload(storagePath, file, { cacheControl: '3600', upsert: false });

      if (uploadError) {
        console.error('[upload] Storage error:', uploadError.message);
        showToast('上传失败，请重试', 'error');
        return;
      }

      const { data: urlData } = supabase.storage
        .from('resumes')
        .getPublicUrl(storagePath);

      const newResume: ResumeInfo = {
        id: crypto.randomUUID(),
        url: urlData.publicUrl,
        filename: file.name,
      };

      // 写入数据库（追加模式），后端自行拉取最新数组
      const { error: dbError } = await updateUserResume(newResume);

      if (dbError) {
        console.error('[upload] DB error:', dbError);
        await supabase.storage.from('resumes').remove([storagePath]);
        showToast('上传失败，请重试', 'error');
        return;
      }

      // 数据库写入成功后，以服务端最新数据为准更新 UI
      const { resumes: latestResumes } = await fetchUserResumes();
      const resolved = latestResumes ?? [];
      setResumes(resolved);
      localStorage.setItem('resume_info', JSON.stringify(resolved));
      showToast('简历上传成功', 'success');
    } catch (err) {
      console.error('[upload] Unexpected error:', err);
      showToast('上传异常，请重试', 'error');
    } finally {
      setIsUploading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!isInitialized) return;
    const currentResumes = resumesRef.current;
    const target = currentResumes.find((r) => r.id === id);
    if (!target) return;

    // 乐观更新 UI
    const updated = currentResumes.filter((r) => r.id !== id);
    setResumes(updated);
    localStorage.setItem('resume_info', JSON.stringify(updated));
    showToast('简历已删除', 'success');

    // 同步删除数据库记录（会清理 Storage 文件）
    const { error } = await deleteUserResume(id);
    if (error) {
      console.error('[delete] Error:', error);
      // 回滚到删除前的真实状态
      setResumes(currentResumes);
      localStorage.setItem('resume_info', JSON.stringify(currentResumes));
      showToast('删除失败，请重试', 'error');
    }
  }

  function handleDownload(resume: ResumeInfo) {
    fetch(resume.url)
      .then((response) => {
        if (!response.ok) throw new Error('fetch failed');
        return response.blob();
      })
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = resume.filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      })
      .catch(() => {
        window.open(resume.url, '_blank');
      });
  }

  const resumeAreaRef = useRef<HTMLDivElement>(null);

  const handleResumeDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  }, []);

  const handleResumeDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleResumeDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (resumeAreaRef.current && !resumeAreaRef.current.contains(e.relatedTarget as Node)) {
      setIsDragging(false);
    }
  }, []);

  const handleResumeDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleUpload(file);
  }, []);

  return (
    <>
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* 外层：border 由父级控制 */}
      <div className="border-t border-[#DCD9D1]">
        {/* 上层：左右并排固定高度 */}
        <div className="flex flex-row w-full h-[200px] gap-8 px-8 py-4">
          {/* 左侧：未来24小时 */}
          <div className="flex-1 flex flex-col min-w-0 min-h-0">
            <div className="flex items-center justify-between mb-2 flex-shrink-0">
              <h3 className="text-sm font-bold text-[#111111]">未来24小时</h3>
              {next24HoursTasks.length > 0 && (
                <span className="text-xs text-gray-400">
                  {next24HoursTasks.length} 个任务
                </span>
              )}
            </div>

            {next24HoursTasks.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center">
                <div className="w-10 h-10 rounded-full bg-[#8B735B]/10 flex items-center justify-center mb-2">
                  <svg className="w-5 h-5 text-[#8B735B]/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <p className="text-xs text-[#8B735B]/60">暂无计划安排</p>
              </div>
            ) : (
              <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin pr-2 space-y-2">
                {next24HoursTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onClick={() => onTaskClick(task.id)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* 右侧：简历版本 */}
          <div
            ref={resumeAreaRef}
            className="flex-1 flex flex-col min-w-0 min-h-0 w-full relative"
            onDragEnter={handleResumeDragEnter}
            onDragOver={handleResumeDragOver}
            onDragLeave={handleResumeDragLeave}
            onDrop={handleResumeDrop}
          >
            {/* AI 助手风格的拖拽遮罩 */}
            {isDragging && (
              <div className="absolute inset-0 z-50 bg-[#8B735B]/20 backdrop-blur-sm flex flex-col items-center justify-center gap-2 border-2 border-dashed border-[#8B735B] rounded-lg">
                <div className="w-10 h-10 rounded-full bg-[#8B735B]/30 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-[#8B735B]" />
                </div>
                <p className="text-sm font-medium text-[#8B735B]">释放以上传简历</p>
              </div>
            )}

            <div className="flex items-center justify-between mb-2 flex-shrink-0">
              <h3 className="text-sm font-bold text-[#111111]">简历版本</h3>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-7 h-7 rounded-md bg-[#E5E1DA] hover:bg-[#D8D4CE] flex items-center justify-center transition-colors"
                title="添加简历"
              >
                <Plus className="w-3.5 h-3.5 text-[#8B735B]" />
              </button>
            </div>

            <ResumeCard
              resumes={resumes}
              isUploading={isUploading}
              onUploadClick={() => fileInputRef.current?.click()}
              onDelete={handleDelete}
              onDownload={handleDownload}
            />
          </div>
        </div>

        {/* 隐藏的文件输入 */}
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleUpload(file);
            e.target.value = '';
          }}
        />
      </div>
    </>
  );
}
