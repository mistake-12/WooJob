/**
 * AI 辅助函数
 * 负责构建 System Prompt 和解析 LLM 返回的 JSON 结构化数据
 * 纯同步工具函数模块，不包含任何 Server Actions
 */

import type { CreateJobInput, CreateTaskInput } from '@/types/database';

/** AI 工作模式 */
export type AIMode = 'chat' | 'extract_job' | 'extract_task';

/**
 * 根据模式构建 System Prompt
 */
export function buildSystemPrompt(mode: AIMode, userId: string): string {
  const base = `你是 WooJob!!! 的 AI 求职助手，帮助用户管理求职流程。当前用户 ID: ${userId}

【你的核心能力】
1. 回答求职相关问题（面试技巧、公司分析、简历优化、Offer 选择等）
2. 从文本或截图中提取岗位信息，结构化返回 JSON
3. 从文本或截图中提取待办任务信息，结构化返回 JSON
4. 保持对话简洁、专业，用中文回复`;

  if (mode === 'extract_job') {
    return `${base}

【当前任务：提取岗位信息】
当用户提供岗位描述（文字或截图）时，提取以下字段并以 JSON 格式返回：

\`\`\`json
{
  "type": "job",
  "job": {
    "company": "公司名称（必填，如无法确定填 null）",
    "title": "岗位名称（必填，如无法确定填 null）",
    "stage": "待投递",
    "deadline": "YYYY-MM-DD 格式（如 2026-05-20），无法确定填 null",
    "website": "官网链接，无法确定填 null",
    "description": "岗位描述摘要（可选）",
    "tags": {
      "referral": "有" | "无" | "学长" | null,
      "round": "当前面试轮次（如：第一轮、笔试） | null",
      "interviewTime": "面试时间描述（如：5月10日14:00） | null"
    }
  }
}
\`\`\`

【重要规则】
- 仅提取你能明确从输入中识别的字段，不要编造任何信息
- 无法识别的字段全部填 null
- company 和 title 是必填字段，若无法提取这两个字段则返回普通对话回复而非 JSON`;
  }

  if (mode === 'extract_task') {
    return `${base}

【当前任务：提取任务信息】
当用户提供任务描述（文字或截图）时，提取以下字段并以 JSON 格式返回：

\`\`\`json
{
  "type": "task",
  "task": {
    "title": "任务标题（必填，如：腾讯 - 产品经理 - 笔试）",
    "company": "关联公司名称（可选，无法确定填 null）",
    "taskDate": "YYYY-MM-DD 格式，今天是 2026-05-03（无法确定填今天）",
    "taskTime": "HH:mm 格式（如 14:00），无法确定填 null",
    "tag": "面试" | "笔试" | "待投递" | "待办事项",
    "round": "面试/笔试轮次（如：技术一面），无法确定填 null",
    "meetingLink": "会议链接，无法确定填 null",
    "notes": "备注信息（可选）"
  }
}
\`\`\`

【重要规则】
- 仅提取你能明确从输入中识别的字段，不要编造任何信息
- 无法识别的字段全部填 null
- title 是必填字段，若无法提取则返回普通对话回复而非 JSON
- tag 默认判断：提到"面试"选"面试"，提到"笔试"选"笔试"，否则选"待办事项"`;
  }

  return base;
}

/**
 * 从 LLM 回复中解析 JSON 结构化数据
 * 尝试匹配 ```json ... ``` 代码块或纯 JSON 对象
 */
export function parseStructuredOutput(
  content: string,
  mode: 'extract_job' | 'extract_task'
): { type: 'job'; job: Partial<CreateJobInput> } | { type: 'task'; task: Partial<CreateTaskInput> } | null {
  try {
    // 策略 1：匹配 ```json ... ``` 代码块
    let raw = content;
    const codeBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (codeBlockMatch) {
      raw = codeBlockMatch[1];
    }

    // 策略 2：在剩余文本中找 JSON 对象
    const jsonMatch = raw.match(/(\{[\s\S]*\})/);
    if (jsonMatch) {
      raw = jsonMatch[1];
    }

    const parsed = JSON.parse(raw) as Record<string, unknown>;

    if (mode === 'extract_job') {
      if (parsed.type === 'job' && parsed.job && typeof parsed.job === 'object') {
        const job = parsed.job as Record<string, unknown>;
        // company 和 title 必填，缺一则不视为有效提取
        if (!job.company || !job.title) return null;
        return {
          type: 'job',
          job: {
            company: String(job.company),
            title: String(job.title),
            stage: (job.stage as CreateJobInput['stage']) ?? '待投递',
            deadline: job.deadline as CreateJobInput['deadline'],
            website: job.website as CreateJobInput['website'],
            description: job.description as CreateJobInput['description'],
            tags: {
              referral: job.referral as CreateJobInput['tags']['referral'],
              round: job.round as CreateJobInput['tags']['round'],
              interviewTime: job.interviewTime as CreateJobInput['tags']['interviewTime'],
            },
          },
        };
      }
    }

    if (mode === 'extract_task') {
      if (parsed.type === 'task' && parsed.task && typeof parsed.task === 'object') {
        const task = parsed.task as Record<string, unknown>;
        if (!task.title) return null;
        return {
          type: 'task',
          task: {
            title: String(task.title),
            company: task.company as CreateTaskInput['company'],
            taskDate: String(task.taskDate),
            taskTime: task.taskTime as CreateTaskInput['taskTime'],
            tag: (task.tag as CreateTaskInput['tag']) ?? '待办事项',
            round: task.round as CreateTaskInput['round'],
            meetingLink: task.meetingLink as CreateTaskInput['meetingLink'],
            notes: task.notes as CreateTaskInput['notes'],
          },
        };
      }
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * 根据 mode 生成用户友好的 AI 回复引导语
 */
export function getModeHint(mode: AIMode): string {
  switch (mode) {
    case 'extract_job':
      return '请粘贴岗位描述或上传 JD 截图，我会帮你提取信息并创建岗位卡片。';
    case 'extract_task':
      return '请描述任务或上传面试/笔试通知截图，我会帮你提取信息并创建待办。';
    default:
      return '有什么求职问题可以随时问我！';
  }
}
