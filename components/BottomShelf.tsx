'use client';

import { useRef } from 'react';
import { Task, TaskType, ResumeInfo } from '@/types';
import { Download, FileText, Check, Plus } from 'lucide-react';
import { getNext24HoursTasks, isoToDateLabel } from '@/lib/dateUtils';

interface BottomShelfProps {
  tasks: Task[];
  resume: ResumeInfo;
  onTaskClick: (taskId: string) => void;
  onTaskComplete?: (taskId: string) => void;
}

interface TaskCardProps {
  task: Task;
  onClick: () => void;
  onComplete?: () => void;
}

const TAG_STYLES: Record<TaskType, { bg: string; text: string }> = {
  '面试': { bg: 'bg-[#8B735B]/10', text: 'text-[#8B735B]' },
  '笔试': { bg: 'bg-[#8B735B]/10', text: 'text-[#8B735B]' },
  '待投递': { bg: 'bg-[#8B735B]/10', text: 'text-[#8B735B]' },
  '待办事项': { bg: 'bg-[#8B735B]/10', text: 'text-[#8B735B]' },
};

// TODO: 后端开发时期需要实现文件上传功能
// 目前使用原生 input[type="file"] 触发系统文件选择窗口
function UploadButton() {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleUpload = () => {
    inputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      console.log('Selected file:', file.name);
      // TODO: 后端开发时期实现文件上传逻辑
      // 预期行为：上传文件到服务器，更新简历数据
    }
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.doc,.docx"
        className="hidden"
        onChange={handleFileChange}
      />
      <button
        onClick={handleUpload}
        className="w-5 h-5 rounded bg-[#8B735B]/10 hover:bg-[#8B735B] flex items-center justify-center shadow-sm transition-colors"
        title="上传简历"
      >
        <Plus className="w-3 h-3 text-[#8B735B] hover:text-white transition-colors" />
      </button>
    </>
  );
}

function TaskCard({ task, onClick, onComplete }: TaskCardProps) {
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
          <span className="text-base font-bold text-[#8B735B]">{task.time}</span>
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
      {!task.isCompleted && onComplete ? (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onComplete();
          }}
          className="w-5 h-5 rounded-full border-2 border-[#8B735B]/30 hover:border-[#8B735B] hover:bg-[#8B735B]/10 flex items-center justify-center transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0"
          title="标记完成"
        >
          <span className="sr-only">标记完成</span>
        </button>
      ) : task.isCompleted ? (
        <span className="w-5 h-5 rounded-full bg-[#8B735B] flex items-center justify-center flex-shrink-0">
          <Check className="w-3 h-3 text-white" />
        </span>
      ) : (
        <div className="w-5 h-5 flex-shrink-0" />
      )}
    </div>
  );
}

export default function BottomShelf({ tasks, resume, onTaskClick, onTaskComplete }: BottomShelfProps) {
  const next24HoursTasks = getNext24HoursTasks(tasks);

  return (
    <div className="flex gap-0 border-t border-[#DCD9D1] pt-8">
      {/* 左侧：未来24小时 */}
      <div className="flex-1 pr-8 border-r border-[#DCD9D1]">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-[#111111]">未来24小时</h3>
          {next24HoursTasks.length > 0 && (
            <span className="text-xs text-gray-400">
              {next24HoursTasks.length} 个任务
            </span>
          )}
        </div>

        {next24HoursTasks.length === 0 ? (
          <div className="py-8 text-center">
            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-[#8B735B]/10 flex items-center justify-center">
              <svg className="w-6 h-6 text-[#8B735B]/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="text-sm text-[#8B735B]/60">暂无计划安排</p>
            <p className="text-xs text-[#8B735B]/40 mt-1">去日程视图添加新任务吧</p>
          </div>
        ) : (
          <div
            className="space-y-0 overflow-y-auto scrollbar-hide"
            style={{ maxHeight: '120px' }}
          >
            {next24HoursTasks.map((task, index) => (
              <div key={task.id}>
                <TaskCard
                  task={task}
                  onClick={() => onTaskClick(task.id)}
                  onComplete={onTaskComplete}
                />
                {index < next24HoursTasks.length - 1 && (
                  <div className="h-px bg-[#DCD9D1] mx-2" />
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 右侧：简历版本 */}
      <div className="flex-1 pl-8 relative">
        {/* 标题区域 */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-[#111111]">简历版本</h3>
          
          {/* 上传按钮 - 和标题底部对齐，和卡片右侧对齐 */}
          <UploadButton />
        </div>

        <div className="bg-white rounded-md shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#8B735B] bg-opacity-10 rounded-md flex items-center justify-center">
                <FileText className="w-5 h-5 text-[#8B735B]" />
              </div>
              <div>
                <p className="text-sm font-medium text-[#111111] truncate max-w-[160px]">
                  {resume.filename}
                </p>
                <p className="text-xs text-[#666666] mt-0.5">
                  上次编辑: {resume.lastEdited}
                </p>
              </div>
            </div>
            <button className="p-2 bg-[#8B735B]/10 hover:bg-[#8B735B]/20 rounded-md transition-colors">
              <Download className="w-4 h-4 text-[#8B735B]" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
