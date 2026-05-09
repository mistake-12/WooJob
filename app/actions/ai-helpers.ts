/**
 * AI 辅助函数
 * 负责构建 System Prompt 和解析 LLM 返回的 JSON 结构化数据
 * 纯同步工具函数模块，不包含任何 Server Actions
 */

import type { CreateJobInput, CreateTaskInput, JobTags } from '@/types/database';

/** AI 工作模式 */
export type AIMode = 'chat' | 'extract_job' | 'extract_task';

/**
 * 根据模式构建 System Prompt
 */
export function buildSystemPrompt(mode: AIMode, userId: string): string {
  // 基础信息
  const baseInfo = `你是 WooJob 的 AI 求职助手，帮助用户管理求职流程。当前用户 ID: ${userId}，今日日期: 2026-05-03。`;

  if (mode === 'extract_job') {
    return `${baseInfo}

【任务：提取岗位信息】
你是一个严谨的岗位数据提取器。用户的意图是【创建新岗位】。

请从用户的文字或图片中提取以下字段：

\`\`\`json
{
  "type": "job",
  "job": {
    "company": "公司名称（必填，无法确定填 null）",
    "title": "岗位名称（必填，无法确定填 null）",
    "stage": "待投递",
    "deadline": "YYYY-MM-DD 格式，无法确定填 null",
    "website": "官网链接，无法确定填 null",
    "description": "岗位描述摘要（可选，无法确定填 null）",
    "tags": {
      "referral": "有 | 无 | 学长 | null",
      "round": "当前面试轮次，无法确定填 null",
      "interviewTime": "面试时间描述，无法确定填 null"
    }
  }
}
\`\`\`

【输出规则】
1. 严格输出上述 JSON 格式，不要任何额外文字
2. 仅提取你能明确识别的字段，不要编造
3. 无法识别的字段全部填 null
4. company 和 title 是必填字段，若缺失这两个字段则返回追问文字，不要输出 JSON
5. 如果信息基本完整，输出 JSON 后加一句简短的确认语`;
  }

  if (mode === 'extract_task') {
    return `${baseInfo}

【任务：提取日程信息】
你是一个严谨的日程提取器。用户的意图是【创建待办/面试日程】。

请从用户的文字或图片中提取以下字段：

\`\`\`json
{
  "type": "task",
  "task": {
    "title": "任务标题（必填，格式： 公司 - 岗位 - 事项）",
    "company": "关联公司名称，无法确定填 null",
    "taskDate": "YYYY-MM-DD 格式，今天是 2026-05-03，无法确定填今天",
    "taskTime": "HH:mm 格式（如 14:00），无法确定填 null",
    "tag": "面试 | 笔试 | 待投递 | 待办事项（默认判断）",
    "round": "面试/笔试轮次，无法确定填 null",
    "meetingLink": "会议链接，无法确定填 null",
    "notes": "备注信息（可选）"
  }
}
\`\`\`

【输出规则】
1. 严格输出上述 JSON 格式，不要任何额外文字
2. 仅提取你能明确识别的字段，不要编造
3. 无法识别的字段全部填 null
4. title 是必填字段，若缺失则返回追问文字，不要输出 JSON
5. tag 默认判断：提到"面试"选"面试"，提到"笔试"选"笔试"，否则选"待办事项"
6. 如果信息基本完整，输出 JSON 后加一句简短的确认语`;
  }

  // chat 模式：通用对话
  return `${baseInfo}

【你的核心能力】
1. 回答求职相关问题（面试技巧、公司分析、简历优化、Offer 选择等）
2. 在【建岗位】模式下，从文本或截图中提取岗位信息并输出 JSON
3. 在【建任务】模式下，从文本或截图中提取待办任务并输出 JSON

【对话风格】
- 保持简洁、专业，用中文回复
- 适时引导用户使用【建岗位】或【建任务】模式来创建信息`;
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
              referral: job.referral as JobTags['referral'],
              round: job.round as JobTags['round'],
              interviewTime: job.interviewTime as JobTags['interviewTime'],
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
