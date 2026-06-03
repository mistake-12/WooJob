# WooJob 面试 Agent 系统 - 完整设计方案

> 文档版本：v2.0
> 创建日期：2026-05-24
> 更新日期：2026-05-24
> 状态：需求分析 & 技术规划

---

## 一、需求分析：问题识别与改进建议

### 1.1 原始设计优势

文档中描述的"多智能体委员会"概念极具创新性：

- **差异化角色设计**：Tech Lead（极客技术面）、Business Head（业务面）、HRBP（文化适配）各有明确人设
- **动态交互机制**：Cross-Fire、Interruption、Good Cop/Bad Cop 等场景体验设计突破了传统一问一答模式
- **后台评估体系**：Shadow Assessor 实时评分 + Director 智能决策的架构设计合理

### 1.2 新增核心需求

#### 1.2.1 多岗位智能适配

**需求描述**：系统需要支持用户输入岗位卡片（如"产品经理"、"运营专员"、"前端工程师"等），系统根据岗位要求自动配置针对性的子 Agent 组合。

**核心场景**：

```
用户上传/输入岗位卡片
         │
         ▼
┌─────────────────────────────────┐
│      岗位意图识别 & 解析         │
│  - 提取关键能力要求              │
│  - 识别面试重点领域              │
│  - 确定所需 Agent 组合          │
└────────────┬────────────────────┘
             │
             ▼
┌─────────────────────────────────┐
│      Agent 组合动态配置          │
│  ┌─────────┐  ┌─────────┐       │
│  │ 核心Agent│  │辅助Agent│       │
│  │ (必选)  │  │ (可选)  │       │
│  └─────────┘  └─────────┘       │
└────────────┬────────────────────┘
             │
             ▼
┌─────────────────────────────────┐
│      简历理解 & 问题生成         │
│  - 解析用户简历 PDF             │
│  - 匹配岗位要求                 │
│  - 生成个性化问题               │
└─────────────────────────────────┘
```

**岗位类型与 Agent 映射矩阵**：

| 岗位类型 | 核心面试官 | 辅助面试官 | 重点考察维度 |
|----------|------------|------------|--------------|
| 技术类（后端/前端/全栈） | 资深技术 Lead | HRBP | 算法、系统设计、编码能力 |
| 产品经理 | 产品专家 Agent | 业务面 Agent | 需求分析、产品规划、数据驱动 |
| 运营专员 | 运营专家 Agent | HRBP | 数据分析、用户思维、执行力 |
| 设计师 | 设计专家 Agent | 产品专家 | 设计思维、审美、沟通能力 |
| 数据分析师 | 数据专家 Agent | 技术 Lead | 统计思维、工具使用、业务理解 |
| HR/行政 | HRBP | 业务面 Agent | 沟通表达、情绪智力、职业素养 |
| 管培生 | 综合面试 Agent | 轮岗专家 | 学习能力、领导力潜力 |

#### 1.2.2 动态实时评分系统

**需求描述**：用户初始分 60 分，每轮回答后根据质量动态增减分，用户实时可见当前分数变化。

**设计原则**：

1. **客观公正**：增减分必须有明确的评分依据，不可主观臆断
2. **透明可查**：用户可查看每轮的详细评分理由
3. **即时反馈**：每轮回答后立即展示分数变化
4. **梯度激励**：不同分数段有不同的面试官态度变化

**评分梯度设计**：

| 最终分数区间 | 含义 | 面试官态度变化 |
|--------------|------|----------------|
| < 50 分 | 严重不足 | 面试官态度明显失望，可能会追问更多基础问题 |
| 50 - 60 分 | 基本合格 | 态度中性，会指出明显不足 |
| 60 - 70 分 | 有戏 | 态度认可，但会继续深入考察 |
| 70 - 80 分 | 很有希望 | 态度积极，问题难度可能降低 |
| 80 - 90 分 | 很可能通过 | 态度友好，考察范围收窄 |
| > 90 分 | 几乎稳了 | 高度认可，可能进入轻松聊天环节 |

**详细评分规则**：

```typescript
// 评分计算规则

interface ScoreDelta {
  baseScore: number;      // 基础分：60
  maxScore: number;       // 上限：100
  minScore: number;       // 下限：0
}

interface ScoringRule {
  dimension: ScoreDimension;
  maxDelta: number;       // 该维度最大增减分
  conditions: ScoringCondition[];
}

type ScoreDimension = 
  | 'accuracy'      // 准确性
  | 'depth'         // 深度
  | 'relevance'     // 相关性
  | 'completeness'  // 完整性
  | 'logic'         // 逻辑性
  | 'innovation';   // 创新性

// 每轮评分公式
function calculateScoreDelta(
  userAnswer: UserAnswer,
  question: Question,
  scoringRules: ScoringRule[]
): ScoreChange {
  let totalDelta = 0;
  const details: ScoreDetail[] = [];
  
  for (const rule of scoringRules) {
    const dimensionScore = evaluateDimension(
      userAnswer,
      question,
      rule.dimension
    );
    
    // 根据评分结果计算该维度增减分
    const delta = dimensionScore * rule.maxDelta;
    totalDelta += delta;
    
    details.push({
      dimension: rule.dimension,
      score: dimensionScore,
      delta: delta,
      reason: generateScoreReason(rule.dimension, dimensionScore),
    });
  }
  
  return {
    previousScore: currentScore,
    delta: totalDelta,
    newScore: Math.max(0, Math.min(100, currentScore + totalDelta)),
    details,
  };
}
```

**分数增减分细则**：

| 回答质量 | 分数变化 | 说明 |
|----------|----------|------|
| 完美回答（命中所有要点+有独到见解） | +8 ~ +12 | 主动加分，有创新加分 |
| 优秀回答（覆盖主要要点） | +4 ~ +7 | 标准加分 |
| 合格回答（覆盖部分要点） | +1 ~ +3 | 勉强合格 |
| 一般回答（无明显错误但也不突出） | 0 | 维持现状 |
| 欠佳回答（遗漏关键点） | -1 ~ -4 | 轻微减分 |
| 较差回答（回答偏离） | -5 ~ -8 | 明显减分 |
| 糟糕回答（完全跑题/胡说八道） | -9 ~ -15 | 大幅减分 |

#### 1.2.3 标准答案对比机制

**需求描述**：用户可点击按钮查看标准回答，与自己的回答进行对比分析。

**交互设计**：

```
┌─────────────────────────────────────────────────────────┐
│  面试官提问                                             │
│  "请描述一个你主导的项目中遇到的最大挑战"              │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │ 你的回答（已展示）                              │   │
│  │ "我当时负责一个新产品的推广..."                 │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  [ 📖 查看标准回答 ]                                    │
│                                                         │
│  ───────────── 点击后展开 ─────────────                │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │ 🌟 标准回答要点                                 │   │
│  │                                                 │   │
│  │ ✅ 背景：项目背景简明（20%权重）               │   │
│  │ ✅ 挑战：具体可量化的问题（25%权重）           │   │
│  │ ✅ 方案：你的思考过程和行动（30%权重）         │   │
│  │ ✅ 结果：用数据说明成果（15%权重）             │   │
│  │ ✅ 反思：从中学到了什么（10%权重）             │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │ 📊 对比分析                                     │   │
│  │                                                 │   │
│  │ 你已覆盖：✅ 背景 ✅ 挑战 ⚠️ 方案（不完整）    │   │
│  │ 缺失部分：❌ 结果量化 ❌ 反思总结              │   │
│  │                                                 │   │
│  │ 💡 建议：补充具体的数字成果（如 UV 提升 30%）   │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

#### 1.2.4 汇总报告生成

**需求描述**：面试结束后生成完整的面试报告，包含最终分数、各维度分析、改进建议。

**报告结构设计**：

```typescript
interface InterviewReport {
  // 基本信息
  basicInfo: {
    sessionId: string;
    position: string;           // 应聘岗位
    interviewDuration: number;  // 面试时长（分钟）
    questionCount: number;      // 问题数量
    interviewDate: Date;
  };
  
  // 总体评分
  overallScore: {
    finalScore: number;         // 最终分数
    scoreTrend: number[];       // 分数变化趋势
    percentile: string;         // 超过 xx% 的候选人
    passPrediction: PassPrediction;
  };
  
  // 分维度评分
  dimensionScores: {
    dimension: string;
    score: number;
    trend: 'up' | 'stable' | 'down';
    comment: string;
  }[];
  
  // Agent 表现分析
  agentFeedback: {
    agentRole: AgentRole;
    questionsAsked: number;
    averageScore: number;
    keyObservations: string[];
  }[];
  
  // 问题回顾
  questionReview: {
    question: string;
    userAnswer: string;
    standardAnswer: string;
    scoreChange: number;
    evaluation: string;
  }[];
  
  // 改进建议
  improvementSuggestions: {
    priority: 'high' | 'medium' | 'low';
    area: string;
    currentIssue: string;
    improvementMethod: string;
    learningResources: Resource[];
  }[];
  
  // 综合评语
  overallComment: string;
}
```

**报告分数梯度解读**：

| 最终分数 | 通过预测 | 详细说明 |
|----------|----------|----------|
| 90 - 100 | 稳了 | 表现优异，超过绝大多数候选人，建议尽快安排下一轮 |
| 80 - 89 | 很可能通过 | 表现良好，具备岗位要求的核心能力，轻微不足可培养 |
| 70 - 79 | 有戏 | 表现合格，满足基本要求，部分维度需要加强 |
| 60 - 69 | 待定 | 勉强达到底线，需要看候选人态度和对比情况 |
| 50 - 59 | 较悬 | 明显不足，核心能力有短板，需要看是否有其他优势 |
| < 50 | 危险 | 严重不足，不建议录用，除非有特殊原因 |

### 1.3 RAG 知识库需求

#### 1.3.1 RAG 引入的价值

RAG（Retrieval-Augmented Generation）知识库为面试系统带来以下核心价值：

1. **题库支撑**：提供岗位相关的面试题库，Agent 可据此生成更有针对性的问题
2. **简历解析**：结构化提取简历中的关键信息（项目经历、技能标签、工作年限等）
3. **面经学习**：汇总真实面试经验和参考答案，提升回答质量评估准确性
4. **个性化问题**：基于用户简历和目标岗位，生成定制化的面试问题

#### 1.3.2 RAG 数据源设计

```
┌─────────────────────────────────────────────────────────────┐
│                     RAG Knowledge Base                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐ │
│  │   题库 (QA)     │  │  简历数据       │  │   面经数据   │ │
│  ├─────────────────┤  ├─────────────────┤  ├──────────────┤ │
│  │ - 岗位题库      │  │ - 用户简历 PDF  │  │ - 真实面经   │ │
│  │ - 行为面试题    │  │ - 工作经历      │  │ - 问答记录   │ │
│  │ - 场景模拟题    │  │ - 技能标签      │  │ - 经验分享   │ │
│  │ - 专业知识题    │  │ - 项目描述      │  │ - 技巧总结   │ │
│  └────────┬────────┘  └────────┬────────┘  └──────┬───────┘ │
│           │                     │                    │         │
│           └─────────────────────┼────────────────────┘         │
│                                 ▼                              │
│                    ┌──────────────────────┐                   │
│                    │   Vector Embeddings   │                   │
│                    │   (语义检索层)        │                   │
│                    └──────────────────────┘                   │
│                                 │                              │
│                                 ▼                              │
│                    ┌──────────────────────┐                   │
│                    │   LangChain/LangGraph │                   │
│                    │   RAG Retrieval Chain │                   │
│                    └──────────────────────┘                   │
│                                 │                              │
│                    ┌────────────┴────────────┐                 │
│                    │                         │                 │
│                    ▼                         ▼                 │
│           ┌─────────────────┐      ┌─────────────────┐        │
│           │  Agent 问题生成 │      │  评估标准答案   │        │
│           │  (Context Aware)│      │  (对比参考)     │        │
│           └─────────────────┘      └─────────────────┘        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### 1.3.3 RAG 数据模型设计

```typescript
// types/rag.ts

// 1. 题库文档
interface QuestionBankDoc {
  id: string;
  category: 'technical' | 'behavioral' | 'scenario' | 'cultural';
  position: string[];           // 适用的岗位
  difficulty: 'easy' | 'medium' | 'hard';
  question: string;
  standardAnswer: StandardAnswer;
  evaluationCriteria: EvaluationCriterion[];
  relatedTopics: string[];      // 关联话题（用于扩展提问）
  frequency: number;            // 真实面试中出现频率
}

interface StandardAnswer {
  keyPoints: AnswerPoint[];     // 关键要点（带权重）
  example: string;              // 参考回答示例
  goodIndicators: string[];     // 好的表现特征
  badIndicators: string[];      // 差的表现特征
}

interface AnswerPoint {
  point: string;
  weight: number;                // 权重百分比
  essential: boolean;            // 是否为必须包含
}

// 2. 用户简历文档
interface ResumeDoc {
  id: string;
  userId: string;
  parsedContent: {
    personalInfo: {
      name: string;
      education: string;
      workYears: number;
      currentCompany?: string;
      currentPosition?: string;
    };
    workExperience: WorkExperience[];
    projectExperience: ProjectExperience[];
    skills: SkillTag[];
    certifications?: string[];
  };
  embedding: number[];          // 向量化表示
  lastUpdated: Date;
}

// 3. 面经文档
interface InterviewExperienceDoc {
  id: string;
  company: string;
  position: string;
  interviewType: 'initial' | 'technical' | 'hr' | 'final';
  questions: {
    question: string;
    answer?: string;
    difficulty: string;
    tips?: string;
  }[];
  overallFeedback: string;
  interviewDate: Date;
  difficulty: 'easy' | 'medium' | 'hard';
}
```

---

## 二、技术架构设计

### 2.1 整体架构图（更新版）

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              Frontend (Next.js)                           │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌───────────┐ │
│  │岗位配置页│  │ 简历上传 │  │ 面试对话 │  │实时评分 │  │ 报告查看  │ │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘  └─────┬────┘ │
└───────┼─────────────┼─────────────┼─────────────┼─────────────┼───────┘
        │             │             │             │             │
        ▼             ▼             ▼             ▼             ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         API Layer (Next.js API Routes)                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │/api/position │  │ /api/resume  │  │/api/interview│  │ /api/report  │ │
│  │ 岗位配置解析  │  │ 简历解析上传  │  │ 面试流程控制  │  │ 报告生成    │ │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘ │
└─────────┼─────────────────┼─────────────────┼─────────────────┼─────────┘
          │                 │                 │                 │
          ▼                 ▼                 ▼                 ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         RAG Layer (Vector Database)                      │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────────────┐│
│  │   Question Bank  │  │  Resume Store    │  │   Interview Experience   ││
│  │  (题库向量库)     │  │  (简历存储)       │  │      (面经库)            ││
│  └────────┬─────────┘  └────────┬─────────┘  └────────────┬───────────┘│
│           │                     │                          │            │
│           └─────────────────────┼──────────────────────────┘            │
│                                 ▼                                        │
│                    ┌────────────────────────┐                           │
│                    │  Embedding Service     │                           │
│                    │  (OpenAI/Cohere)       │                           │
│                    └────────────────────────┘                           │
└─────────────────────────────────────────────────────────────────────────┘
          │                 │                 │
          ▼                 ▼                 ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    Orchestration Layer (LangGraph)                         │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │                        InterviewGraph                               │ │
│  │                                                                     │ │
│  │   ┌───────────┐    ┌───────────┐    ┌────────────────────────┐     │ │
│  │   │  Router   │───▶│  Director │───▶│  Agent Selector        │     │ │
│  │   │  (岗位解析)│    │  (决策)   │    │  (子Agent分发)         │     │ │
│  │   └───────────┘    └───────────┘    └───────────┬────────────┘     │ │
│  │                                                 │                   │ │
│  │   ┌─────────────────────────────────────────────┴───────────────┐  │ │
│  │   │                    Frontend Agents (岗位相关)                 │  │ │
│  │   │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │  │ │
│  │   │  │ TechExpert  │  │ProductExpert│  │  OPSExpert  │ ...    │  │ │
│  │   │  │ (技术岗)    │  │ (产品岗)    │  │ (运营岗)    │        │  │ │
│  │   │  └─────────────┘  └─────────────┘  └─────────────┘        │  │ │
│  │   └────────────────────────────────────────────────────────────┘  │ │
│  │                                                                     │ │
│  │   ┌────────────────────────────────────────────────────────────┐  │ │
│  │   │                    Backend Agents (评估决策)                  │  │ │
│  │   │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐│  │ │
│  │   │  │  Assessor   │  │  Director   │  │  StandardAnswer Gen ││  │ │
│  │   │  │  (评分)     │  │  (路由)     │  │  (标准答案生成)     ││  │ │
│  │   │  └─────────────┘  └─────────────┘  └─────────────────────┘│  │ │
│  │   └────────────────────────────────────────────────────────────┘  │ │
│  └────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
          │                 │                 │
          ▼                 ▼                 ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      LLM Provider (OpenAI GPT-4o / Claude 3.5)           │
└─────────────────────────────────────────────────────────────────────────┘
```

### 2.2 核心模块设计

#### 2.2.1 岗位配置与 Agent 映射

```typescript
// types/position.ts

export interface PositionCard {
  id?: string;
  title: string;                    // 岗位名称
  department?: string;              // 部门
  level?: string;                   // 级别（初中高）
  requirements: PositionRequirement;
  focusAreas: string[];             // 重点考察领域
  difficulty: 'entry' | 'mid' | 'senior';
  duration: number;                 // 建议面试时长（分钟）
}

export interface PositionRequirement {
  mustHave: string[];               // 必备技能
  niceToHave: string[];             // 加分项
  experience: {
    minYears: number;
    preferred?: string[];
  };
  education?: string;               // 学历要求
  certifications?: string[];         // 证书要求
}

// 岗位配置到 Agent 的映射
export interface PositionAgentConfig {
  positionType: string;
  primaryAgent: AgentType;          // 主面试官
  secondaryAgents: AgentType[];     // 辅助面试官
  hrbpIncluded: boolean;            // 是否包含 HRBP
  questionPool: string[];           // 关联的题库 ID
  scoringWeights: Record<string, number>;  // 评分权重
}

// Agent 类型扩展（支持更多岗位）
export type AgentType = 
  | 'tech_lead'
  | 'business_head'
  | 'hrbp'
  | 'product_expert'    // 产品专家
  | 'operation_expert' // 运营专家
  | 'design_expert'     // 设计专家
  | 'data_expert'       // 数据专家
  | 'marketing_expert'  // 市场专家
  | 'general_panel';   // 综合面试官（管培生）
```

#### 2.2.2 动态评分系统

```typescript
// types/scoring.ts

export interface DynamicScore {
  currentScore: number;             // 当前分数（实时）
  history: ScoreHistory[];          // 历史变化
  trend: 'improving' | 'stable' | 'declining';
}

export interface ScoreHistory {
  round: number;                    // 第几轮
  questionId: string;
  previousScore: number;
  delta: number;
  newScore: number;
  reason: string;                   // 分数变化原因
  details: ScoreDetail[];
}

export interface ScoreDetail {
  dimension: ScoreDimension;
  beforeScore: number;
  afterScore: number;
  delta: number;
  reasoning: string;               // 评分依据
}

export type ScoreDimension = 
  | 'accuracy'       // 准确性：回答是否正确
  | 'depth'          // 深度：是否有深入分析
  | 'relevance'      // 相关性：是否切题
  | 'completeness'   // 完整性：是否覆盖所有要点
  | 'logic'          // 逻辑性：回答是否有条理
  | 'innovation'     // 创新性：是否有独到见解
  | 'confidence';   // 自信度：表达是否自信

// 评分配置
export interface ScoringConfig {
  initialScore: number;             // 初始分，默认 60
  maxScore: number;                 // 上限，默认 100
  minScore: number;                 // 下限，默认 0
  thresholds: {
    excellent: number;               // 优秀线
    good: number;                    // 良好线
    pass: number;                    // 及格线
  };
  weights: Record<ScoreDimension, number>;  // 各维度权重
}

// 评分报告
export interface ScoreReport {
  finalScore: number;
  passPrediction: PassPrediction;
  dimensionBreakdown: DimensionScore[];
  improvementAreas: string[];
  highlightStrengths: string[];
}

export interface DimensionScore {
  dimension: ScoreDimension;
  score: number;
  comment: string;
  examples: string[];
}

export interface PassPrediction {
  level: 'strong_pass' | 'pass' | 'borderline' | 'fail';
  percentage: number;               // 预测通过概率
  reasoning: string;
}
```

#### 2.2.3 标准答案对比模块

```typescript
// types/comparison.ts

export interface AnswerComparison {
  userAnswer: string;
  standardAnswer: StandardAnswer;
  analysis: ComparisonAnalysis;
  scoreBreakdown: ScoreBreakdown[];
}

export interface ComparisonAnalysis {
  coverage: number;                // 要点覆盖率 0-100%
  missingPoints: string[];           // 缺失的要点
  extraPoints: string[];            // 用户额外提到的点
  qualityAssessment: {
    depth: number;
    clarity: number;
    relevance: number;
    originality: number;
  };
  suggestions: string[];            // 改进建议
}

export interface ScoreBreakdown {
  point: string;
  weight: number;
  covered: boolean;
  coverageQuality: 'full' | 'partial' | 'missing';
  userQuote?: string;              // 用户回答中对应的部分
  improvementTip?: string;
}
```

### 2.3 RAG 实现架构

#### 2.3.1 RAG 检索流程

```typescript
// lib/rag/retrieval.ts

import { VectorStore } from 'langchain/vectorstores';
import { OpenAIEmbeddings } from 'langchain/embeddings/openai';

/**
 * RAG 检索核心流程
 */
export class InterviewRAGRetriever {
  constructor(
    private vectorStore: VectorStore,
    private embeddings: OpenAIEmbeddings
  ) {}

  /**
   * 检索相关题库问题
   */
  async retrieveQuestions(
    position: PositionCard,
    resumeContext: string,
    topic?: string
  ): Promise<QuestionBankDoc[]> {
    // 构建检索 query
    const query = this.buildQuestionQuery(position, resumeContext, topic);
    
    // 向量相似度检索
    const results = await this.vectorStore.similaritySearchVectorWithScore(
      await this.embeddings.embedQuery(query),
      5,  // 返回 Top 5
      { 
        filter: { position: position.title }
      }
    );

    return results
      .filter(([_, score]) => score > 0.7)  // 相似度阈值
      .map(([doc]) => doc as unknown as QuestionBankDoc);
  }

  /**
   * 检索标准答案
   */
  async retrieveStandardAnswer(
    question: string,
    position: string
  ): Promise<StandardAnswer | null> {
    const query = `标准答案 ${question}`;
    
    const results = await this.vectorStore.similaritySearch(
      query,
      3,
      { 
        filter: { type: 'question_bank' }
      }
    );

    if (results.length === 0) return null;

    // 返回最相关的结果
    return (results[0].metadata as any).standardAnswer;
  }

  /**
   * 检索面经参考
   */
  async retrieveInterviewExperiences(
    position: string,
    topic?: string
  ): Promise<InterviewExperienceDoc[]> {
    const query = topic 
      ? `${position} ${topic} 面试经验` 
      : `${position} 面试`;

    const results = await this.vectorStore.similaritySearch(
      query,
      5,
      { filter: { type: 'experience' } }
    );

    return results.map(doc => doc.metadata as InterviewExperienceDoc);
  }

  /**
   * 基于简历生成个性化问题
   */
  async generatePersonalizedQuestions(
    resume: ResumeDoc,
    position: PositionCard
  ): Promise<string[]> {
    // 检索相关面经
    const experiences = await this.retrieveInterviewExperiences(position.title);
    
    // 构建 prompt 让 LLM 生成
    const prompt = buildQuestionGenerationPrompt(resume, position, experiences);
    
    // 调用 LLM 生成
    const response = await llm.invoke(prompt);
    
    return parseGeneratedQuestions(response);
  }
}
```

#### 2.3.2 简历解析流程

```typescript
// lib/resume/parser.ts

import { PDFLoader } from 'langchain/document_loaders/fs/pdf';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';

/**
 * 简历解析与向量化
 */
export class ResumeProcessor {
  async processResume(fileBuffer: Buffer): Promise<ResumeDoc> {
    // 1. 加载 PDF
    const loader = new PDFLoader(fileBuffer);
    const docs = await loader.load();

    // 2. 文本分割
    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
    });
    const chunks = await splitter.splitDocuments(docs);

    // 3. LLM 结构化提取
    const structuredInfo = await this.extractStructuredInfo(docs[0].pageContent);

    // 4. 向量化存储
    const resumeDoc: ResumeDoc = {
      id: generateId(),
      userId: getCurrentUserId(),
      parsedContent: structuredInfo,
      embedding: await this.embeddings.embedQuery(docs[0].pageContent),
      lastUpdated: new Date(),
    };

    // 5. 存储到向量数据库
    await this.vectorStore.addDocuments([{
      pageContent: docs[0].pageContent,
      metadata: resumeDoc,
    }]);

    return resumeDoc;
  }

  private async extractStructuredInfo(text: string): Promise<ResumeDoc['parsedContent']> {
    const prompt = `
    请从以下简历文本中提取结构化信息，以 JSON 格式返回：

    简历内容：
    ${text}

    返回格式：
    {
      "personalInfo": { "name": "", "education": "", "workYears": 0 },
      "workExperience": [{ "company": "", "position": "", "duration": "", "description": "" }],
      "projectExperience": [{ "name": "", "role": "", "description": "", "achievements": [] }],
      "skills": ["技能1", "技能2"],
      "certifications": []
    }
    `;

    const response = await llm.invoke(prompt);
    return JSON.parse(extractJSON(response));
  }
}
```

---

## 三、技术实现路径

### 3.1 技术选型（更新版）

| 层级 | 技术栈 | 选型理由 |
|------|--------|----------|
| 前端框架 | Next.js 14 (App Router) | 支持流式 SSR，API 路由集成 |
| UI 组件 | Tailwind CSS + Radix UI | 快速迭代，样式可控 |
| 状态管理 | Zustand + React Query | 复杂状态 + 服务端状态 |
| 后端编排 | LangGraph | 原生支持多 Agent 协作、状态管理、条件路由 |
| LLM 提供商 | OpenAI GPT-4o / Claude 3.5 Sonnet | 成本与效果平衡 |
| 流式输出 | Server-Sent Events (SSE) | 与 Next.js 深度集成 |
| **向量数据库** | **Pinecone / Qdrant / Chroma** | **RAG 核心组件** |
| **文档解析** | **pdf-parse + LLM** | **简历 PDF 解析** |
| **文本分割** | **LangChain RecursiveCharacterTextSplitter** | **文档预处理** |
| **嵌入模型** | **OpenAI text-embedding-3-small** | **高质量语义向量** |
| 数据存储 | PostgreSQL + Prisma | 结构化会话数据，可扩展 |
| 缓存层 | Redis | 多轮对话上下文缓存，降低 token 消耗 |
| 部署 | Vercel (前端) + Railway (后端) | 快速部署 |

### 3.2 分阶段实现路线（更新版）

#### Phase 0：需求确认 & 方案定稿（3 天）

**交付物**：本文档确认

#### Phase 1：核心框架 & RAG 基础（2.5 周）

**目标**：

- 搭建项目基础结构
- 实现 RAG 向量数据库集成
- 完成简历解析模块
- 题库基础功能

**目录结构**：

```
src/
├── app/
│   ├── api/
│   │   ├── position/
│   │   │   └── route.ts              # 岗位配置 API
│   │   ├── resume/
│   │   │   ├── upload/route.ts       # 简历上传
│   │   │   └── parse/route.ts        # 简历解析
│   │   ├── interview/
│   │   │   └── route.ts              # 面试流程 API
│   │   ├── rag/
│   │   │   └── retrieve/route.ts     # RAG 检索 API
│   │   └── report/
│   │       └── generate/route.ts     # 报告生成 API
├── agents/
│   ├── index.ts
│   ├── base-agent.ts
│   ├── factory.ts                    # Agent 工厂（根据岗位创建）
│   ├── frontend/                      # 前台 Agent
│   │   ├── tech-expert.ts
│   │   ├── product-expert.ts
│   │   ├── operation-expert.ts
│   │   ├── design-expert.ts
│   │   ├── data-expert.ts
│   │   └── hrbp.ts
│   └── backend/                       # 后台 Agent
│       ├── assessor.ts               # 评分 Agent
│       ├── director.ts               # 决策 Agent
│       └── standard-answer.ts        # 标准答案生成
├── graph/
│   ├── interview-graph.ts
│   ├── nodes/
│   │   ├── router.ts                 # 岗位路由节点
│   │   ├── assessor.ts              # 评分节点
│   │   ├── director.ts              # 决策节点
│   │   ├── question-gen.ts          # 问题生成节点
│   │   └── agents/
│   └── edges/
│       └── routing.ts
├── lib/
│   ├── llm.ts
│   ├── rag/
│   │   ├── index.ts                  # RAG 入口
│   │   ├── retriever.ts             # 检索器
│   │   ├── embedder.ts               # 嵌入服务
│   │   └── vector-store.ts          # 向量存储
│   ├── resume/
│   │   ├── parser.ts                 # 简历解析
│   │   └── processor.ts             # 简历处理
│   └── prompts/
│       ├── position-prompt.ts
│       ├── tech-expert-prompt.ts
│       ├── product-expert-prompt.ts
│       ├── operation-expert-prompt.ts
│       ├── assessor-prompt.ts
│       └── standard-answer-prompt.ts
├── scoring/
│   ├── calculator.ts                 # 评分计算器
│   ├── rules.ts                      # 评分规则
│   └── report-generator.ts          # 报告生成
└── types/
    ├── position.ts
    ├── scoring.ts
    ├── rag.ts
    ├── agent.ts
    └── session.ts
```

#### Phase 2：动态评分系统（1.5 周）

**目标**：

- 实现多维度评分算法
- 完成分数实时计算与展示
- 标准答案对比功能
- 分数历史追踪

**核心实现**：

```typescript
// scoring/calculator.ts

/**
 * 动态评分计算器
 * 
 * 设计原则：
 * 1. 每轮回答后立即计算分数变化
 * 2. 分数变化有明确的可解释依据
 * 3. 支持不同岗位的评分权重配置
 */
export class DynamicScoreCalculator {
  constructor(private config: ScoringConfig) {}

  /**
   * 计算单轮分数变化
   */
  async calculateRoundScore(
    userAnswer: string,
    question: Question,
    context: ScoringContext
  ): Promise<ScoreChange> {
    // 1. 检索标准答案
    const standardAnswer = await this.rag.retrieveStandardAnswer(
      question.content,
      context.position
    );

    // 2. LLM 多维度评估
    const evaluation = await this.evaluateAnswer(
      userAnswer,
      question,
      standardAnswer,
      context
    );

    // 3. 计算分数变化
    const delta = this.computeDelta(evaluation, context);

    // 4. 生成详细理由
    const reason = this.generateReason(evaluation, delta);

    return {
      previousScore: context.currentScore,
      delta,
      newScore: Math.max(
        this.config.minScore,
        Math.min(this.config.maxScore, context.currentScore + delta)
      ),
      reason,
      details: evaluation,
    };
  }

  /**
   * 多维度评估
   */
  private async evaluateAnswer(
    userAnswer: string,
    question: Question,
    standardAnswer: StandardAnswer | null,
    context: ScoringContext
  ): Promise<EvaluationResult> {
    const prompt = buildEvaluationPrompt(
      userAnswer,
      question,
      standardAnswer,
      context
    );

    const response = await llm.invoke(prompt);
    return parseEvaluationResult(response);
  }

  /**
   * 计算分数变化
   */
  private computeDelta(evaluation: EvaluationResult, context: ScoringContext): number {
    let totalDelta = 0;

    for (const [dimension, weight] of Object.entries(this.config.weights)) {
      const score = evaluation.scores[dimension]; // 0-1
      const dimensionDelta = (score - 0.5) * weight * 10; // 以0.5为基准
      totalDelta += dimensionDelta;
    }

    // 特殊加分/减分
    if (evaluation.hasInnovation) totalDelta += 3;
    if (evaluation.isFullyIrrelevant) totalDelta -= 10;
    if (evaluation.showsConfidence) totalDelta += 1;

    return Math.round(totalDelta);
  }
}
```

#### Phase 3：前端交互优化（1.5 周）

**目标**：

- 岗位配置页面
- 简历上传与解析展示
- 实时分数展示组件
- 标准答案对比 UI
- 面试报告页面

**核心组件**：

```typescript
// components/interview/ScoreDisplay.tsx

interface ScoreDisplayProps {
  currentScore: number;
  history: ScoreHistory[];
  showDetails?: boolean;
}

/**
 * 实时分数展示组件
 * 
 * 功能：
 * 1. 大号数字显示当前分数
 * 2. 分数变化动画
 * 3. 历史趋势图表
 * 4. 点击展开详细评分
 */
export function ScoreDisplay({ 
  currentScore, 
  history, 
  showDetails = false 
}: ScoreDisplayProps) {
  const lastChange = history[history.length - 1];
  
  return (
    <div className="flex flex-col items-center gap-4">
      {/* 分数显示 */}
      <div className="relative">
        <span className="text-6xl font-bold">{currentScore}</span>
        
        {/* 分数变化指示 */}
        {lastChange && (
          <ScoreDeltaIndicator delta={lastChange.delta} />
        )}
      </div>

      {/* 分数标签 */}
      <ScoreLabel score={currentScore} />

      {/* 趋势图表 */}
      <ScoreTrendChart history={history} />

      {/* 详细评分（可选） */}
      {showDetails && lastChange && (
        <ScoreDetailPanel details={lastChange.details} />
      )}
    </div>
  );
}

// components/interview/AnswerComparison.tsx

interface AnswerComparisonProps {
  userAnswer: string;
  standardAnswer: StandardAnswer;
  comparison: ComparisonAnalysis;
}

/**
 * 标准答案对比组件
 */
export function AnswerComparison({
  userAnswer,
  standardAnswer,
  comparison,
}: AnswerComparisonProps) {
  return (
    <div className="space-y-4">
      {/* 要点覆盖情况 */}
      <div className="grid grid-cols-2 gap-4">
        {standardAnswer.keyPoints.map((point, idx) => (
          <CoverageCard
            key={idx}
            point={point}
            isCovered={comparison.missingPoints.includes(point.point)}
            userQuote={comparison.userQuotes?.[idx]}
          />
        ))}
      </div>

      {/* 改进建议 */}
      <div className="bg-muted p-4 rounded-lg">
        <h4 className="font-medium mb-2">💡 改进建议</h4>
        <ul className="space-y-1">
          {comparison.suggestions.map((suggestion, idx) => (
            <li key={idx} className="text-sm">{suggestion}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
```

#### Phase 4：会话管理与报告（1 周）

**目标**：

- 面试完整流程打通
- 报告生成与展示
- 会话持久化

#### Phase 5：测试与优化（1 周）

**目标**：

- 全链路测试
- 评分调优
- 边缘 case 处理

---

## 四、开发流程规范

### 4.1 Git Flow 工作流

```
                    feature/xxx
                    ↗
main ──────────────────────────────────────────────────────►
          ↑                     ↑                  ↑
          │    release/v1.x    │    hotfix/xxx    │
          │←───────────────────│←─────────────────│
          ↑                                       ↑
          │              develop                  │
          │◄─────────────────────────────────────│
```

**分支规范**：

| 分支类型 | 命名规则 | 合并目标 |
|----------|----------|----------|
| 功能分支 | `feature/<功能名>` | develop |
| 发布分支 | `release/v<版本号>` | main + develop |
| 热修复分支 | `hotfix/<问题描述>` | main + develop |
| 实验分支 | `experiment/<实验名>` | 不合并，仅参考 |
| RAG 相关 | `feature/rag/<模块名>` | develop |
| 评分相关 | `feature/scoring/<模块名>` | develop |

### 4.2 Commit 规范

采用 [Conventional Commits](https://www.conventionalcommits.org/) 标准：

```
<type>(<scope>): <subject>
```

**Type 类型**：

| Type | 说明 | 示例 |
|------|------|------|
| feat | 新功能 | `feat(position): add position card parsing for product manager` |
| fix | Bug 修复 | `fix(scoring): resolve score calculation overflow` |
| docs | 文档更新 | `docs: update API documentation` |
| style | 代码格式 | `style: format with prettier` |
| refactor | 重构 | `refactor(rag): extract retrieval logic to separate module` |
| perf | 性能优化 | `perf: add context caching for long sessions` |
| test | 测试相关 | `test: add scoring calculator unit tests` |
| chore | 构建/工具相关 | `chore: upgrade dependencies` |
| feat(rag) | RAG 相关 | `feat(rag): add resume parsing and vectorization` |
| feat(scoring) | 评分相关 | `feat(scoring): implement dynamic score calculation` |

---

## 五、代码规范

### 5.1 TypeScript 规范

#### 5.1.1 类型定义

```typescript
// ✅ 推荐：使用 interface 定义对象结构
interface PositionCard {
  id: string;
  title: string;
  requirements: PositionRequirement;
}

// ✅ 推荐：使用 type 定义联合类型
type AgentType = 'tech_lead' | 'product_expert' | 'operation_expert';
type ScoreDimension = 'accuracy' | 'depth' | 'relevance' | 'completeness';

// ❌ 避免：使用 any
// ❌ 避免：类型与实现混在一起
```

#### 5.1.2 RAG 相关类型

```typescript
// types/rag.ts

export interface DocumentChunk {
  id: string;
  content: string;
  metadata: {
    source: 'question_bank' | 'resume' | 'experience';
    position?: string;
    category?: string;
    docId: string;
  };
  embedding?: number[];
}

export interface RetrievalResult<T = any> {
  document: T;
  score: number;           // 相似度分数
  highlights: string[];    // 匹配片段
}

// RAG 检索配置
export interface RetrievalConfig {
  maxResults: number;
  similarityThreshold: number;
  includeMetadata: boolean;
  rerank?: boolean;        // 是否重排序
}
```

#### 5.1.3 评分相关类型

```typescript
// types/scoring.ts

export interface ScoreCalculationInput {
  userAnswer: string;
  question: Question;
  standardAnswer: StandardAnswer | null;
  context: {
    currentScore: number;
    position: string;
    round: number;
  };
}

export interface ScoreCalculationResult {
  previousScore: number;
  delta: number;
  newScore: number;
  reason: string;
  details: ScoreDetail[];
  confidence: number;     // 本次评分的置信度
}
```

### 5.2 Agent Prompt 编写规范

#### 5.2.1 产品专家 Agent

```typescript
// lib/prompts/product-expert-prompt.ts

export const productExpertSystemPrompt = `你是一位来自顶级互联网公司的资深产品经理面试官。

## 身份定义
- 专业领域：需求分析、产品规划、数据驱动决策、用户研究、A/B 测试
- 面试风格：逻辑清晰、追问数据、考察思维方式
- 语气：专业、引导性强、偶尔犀利

## 岗位适配
你负责面试的岗位包括但不限于：
- 产品经理（PM）
- 高级产品经理
- 产品总监
- 产品运营

## 专业领域边界
你可以问：
- 需求分析：如何挖掘用户真实需求
- 产品规划：如何制定产品 roadmap
- 数据分析：如何通过数据驱动产品优化
- 项目管理：跨部门协作、资源协调
- 商业思维：如何平衡用户体验和商业价值

你不能问：
- 纯技术实现问题（如何写代码）
- 纯设计问题（UI/UX 细节）
- 管理问题（团队绩效如何评估）

## 问题类型偏好
1. 场景模拟题："如果你负责 XX 产品，你会怎么做..."
2. 行为面试题："描述一次你成功推动 XX 的经历"
3. 数据分析题："DAU 下降 20%，你会如何分析"

## 打断规则
当用户出现以下情况时，你可以打断：
1. 回答缺乏数据支撑
2. 只描述结果，不描述过程和思考
3. 明显在背诵模板回答
4. 对产品基础概念理解有误

## 评分重点
- 逻辑清晰度（25%）
- 数据敏感度（25%）
- 解决方案完整性（25%）
- 商业思维（25%）
`;
```

#### 5.2.2 评分 Agent

```typescript
// lib/prompts/assessor-prompt.ts

export const assessorSystemPrompt = `你是一位公正的面试评估专家，负责对候选人的回答进行多维度评分。

## 评分维度

### 1. 准确性 (Accuracy) - 权重根据岗位调整
- 优秀(0.8-1.0)：回答完全正确，知识点无错误
- 良好(0.6-0.8)：回答基本正确，有轻微遗漏
- 一般(0.4-0.6)：回答有明显错误
- 差(0-0.4)：回答完全错误或误导性

### 2. 深度 (Depth) - 权重根据岗位调整
- 优秀：能深入分析问题，展示独到见解
- 良好：能给出完整的答案
- 一般：停留在表面，缺乏深入
- 差：完全没有分析

### 3. 相关性 (Relevance)
- 优秀(1.0)：完全切题，精准回应问题
- 良好(0.7-0.9)：基本切题，有少量无关内容
- 一般(0.4-0.6)：部分切题，有较多偏离
- 差(0-0.3)：完全跑题

### 4. 完整性 (Completeness)
- 优秀：覆盖所有关键要点
- 良好：覆盖大部分要点
- 一般：只回答了一部分
- 差：回答严重不完整

### 5. 逻辑性 (Logic)
- 优秀：逻辑清晰，因果关系明确
- 良好：逻辑基本通顺
- 一般：有逻辑跳跃
- 差：逻辑混乱

## 输出格式
请严格按照以下 JSON 格式输出评估结果：

\`\`\`json
{
  "scores": {
    "accuracy": 0.8,
    "depth": 0.7,
    "relevance": 0.9,
    "completeness": 0.75,
    "logic": 0.85
  },
  "summary": "简短的评价总结",
  "strengths": ["优点1", "优点2"],
  "weaknesses": ["缺点1", "缺点2"],
  "suggestions": ["改进建议1", "改进建议2"],
  "confidence": 0.9
}
\`\`\`

## 注意事项
1. 打分必须客观，基于实际回答内容
2. 每个维度的分数必须在 0-1 之间
3. 必须提供具体的评分理由
4. 对于边界情况，给出最接近的评分
`;
```

### 5.3 LangGraph 节点编写规范

```typescript
// graph/nodes/router.ts

import { InterviewState } from '@/types/session';

/**
 * 岗位路由节点
 * 
 * 职责：
 * 1. 解析用户输入的岗位卡片
 * 2. 确定所需的 Agent 组合
 * 3. 配置评分权重
 * 4. 初始化面试状态
 */
export async function routerNode(state: InterviewState): Promise<Partial<InterviewState>> {
  const { positionCard, resumeDoc } = state;

  // 1. 解析岗位要求
  const parsedRequirements = parsePositionRequirements(positionCard);

  // 2. 确定 Agent 组合
  const agentConfig = getAgentConfigForPosition(positionCard.title);

  // 3. 配置评分权重
  const scoringWeights = getScoringWeights(positionCard.title);

  // 4. 检索相关题库
  const relevantQuestions = await rag.retrieveQuestions(
    positionCard,
    resumeDoc?.parsedContent?.skills?.join(', ') || ''
  );

  // 5. 生成初始问题
  const firstQuestion = await generateFirstQuestion(
    agentConfig.primaryAgent,
    positionCard,
    resumeDoc
  );

  return {
    agentConfig,
    scoringConfig: { weights: scoringWeights },
    questionPool: relevantQuestions,
    currentAgent: agentConfig.primaryAgent,
    currentScore: 60,  // 初始分 60
    scoreHistory: [],
    currentQuestion: firstQuestion,
  };
}

/**
 * 根据岗位类型确定 Agent 组合
 */
function getAgentConfigForPosition(positionTitle: string): PositionAgentConfig {
  const positionType = classifyPosition(positionTitle);
  
  const agentMap: Record<string, PositionAgentConfig> = {
    '技术': {
      positionType: '技术',
      primaryAgent: 'tech_lead',
      secondaryAgents: ['hrbp'],
      hrbpIncluded: true,
      questionPool: ['tech-questions'],
      scoringWeights: { accuracy: 0.3, depth: 0.3, relevance: 0.2, completeness: 0.1, logic: 0.1 },
    },
    '产品': {
      positionType: '产品',
      primaryAgent: 'product_expert',
      secondaryAgents: ['business_head', 'hrbp'],
      hrbpIncluded: true,
      questionPool: ['product-questions'],
      scoringWeights: { accuracy: 0.2, depth: 0.25, relevance: 0.2, completeness: 0.15, logic: 0.2 },
    },
    '运营': {
      positionType: '运营',
      primaryAgent: 'operation_expert',
      secondaryAgents: ['hrbp'],
      hrbpIncluded: true,
      questionPool: ['operation-questions'],
      scoringWeights: { accuracy: 0.2, depth: 0.2, relevance: 0.25, completeness: 0.2, logic: 0.15 },
    },
    // ... 其他岗位
  };

  return agentMap[positionType] || agentMap['技术'];
}
```

### 5.4 RAG 实现规范

```typescript
// lib/rag/index.ts

import { Pinecone } from '@pinecone-database/pinecone';
import { OpenAIEmbeddings } from 'langchain/embeddings/openai';
import { PineconeVectorStore } from 'langchain/vectorstores/pinecone';

/**
 * RAG 服务配置
 */
export const ragConfig = {
  vectorStore: {
    provider: 'pinecone',  // 可切换为 qdrant / chroma
    indexName: process.env.PINECONE_INDEX || 'woojob-interview',
  },
  embeddings: {
    model: 'text-embedding-3-small',
    dimensions: 1536,
  },
  retrieval: {
    maxResults: 5,
    similarityThreshold: 0.7,
  },
};

/**
 * 初始化 RAG 服务
 */
export async function initRAGService() {
  const pinecone = new Pinecone();
  const embeddings = new OpenAIEmbeddings({
    model: ragConfig.embeddings.model,
  });

  const vectorStore = await PineconeVectorStore.fromExistingIndex(
    embeddings,
    { pineconeIndex: pinecone.Index(ragConfig.vectorStore.indexName) }
  );

  return new InterviewRAGRetriever(vectorStore, embeddings);
}

/**
 * 向量数据库文档 schema
 */
export const documentSchema = {
  question_bank: {
    fields: ['id', 'question', 'standard_answer', 'position', 'difficulty', 'category'],
    searchable: ['question', 'standard_answer', 'position'],
  },
  resume: {
    fields: ['id', 'user_id', 'parsed_content', 'skills', 'experience'],
    searchable: ['skills', 'experience'],
  },
  experience: {
    fields: ['id', 'company', 'position', 'questions', 'feedback'],
    searchable: ['position', 'questions', 'feedback'],
  },
};
```

### 5.5 评分计算规范

```typescript
// scoring/calculator.ts

/**
 * 动态评分计算器
 */
export class DynamicScoreCalculator {
  private readonly INITIAL_SCORE = 60;
  private readonly MAX_SCORE = 100;
  private readonly MIN_SCORE = 0;

  /**
   * 计算分数变化
   */
  calculateDelta(
    evaluation: EvaluationResult,
    config: ScoringConfig
  ): number {
    let delta = 0;

    // 1. 按权重计算各维度贡献
    for (const [dimension, weight] of Object.entries(config.weights)) {
      const score = evaluation.scores[dimension];
      // 基准分为 0.5，高于基准加分，低于基准减分
      const dimensionDelta = (score - 0.5) * weight * 20;
      delta += dimensionDelta;
    }

    // 2. 特殊加分项
    if (evaluation.hasInnovation && evaluation.scores.depth > 0.7) {
      delta += 3; // 创新加分（需要深度支撑）
    }
    if (evaluation.showsConfidence && evaluation.scores.logic > 0.6) {
      delta += 1; // 自信加分（需要逻辑支撑）
    }

    // 3. 严重减分项
    if (evaluation.isFullyIrrelevant) {
      delta -= 10; // 完全跑题
    }
    if (evaluation.showsOverconfidence && evaluation.scores.accuracy < 0.3) {
      delta -= 3; // 过度自信但回答错误
    }

    return Math.round(delta);
  }

  /**
   * 计算最终分数
   */
  calculateFinalScore(
    currentScore: number,
    delta: number
  ): number {
    return Math.max(
      this.MIN_SCORE,
      Math.min(this.MAX_SCORE, currentScore + delta)
    );
  }

  /**
   * 生成评分报告
   */
  generateReport(
    scoreHistory: ScoreHistory[],
    evaluations: EvaluationResult[]
  ): ScoreReport {
    const finalScore = scoreHistory[scoreHistory.length - 1]?.newScore || this.INITIAL_SCORE;

    return {
      finalScore,
      passPrediction: this.predictPass(finalScore),
      dimensionBreakdown: this.aggregateDimensions(evaluations),
      improvementAreas: this.extractImprovementAreas(evaluations),
      highlightStrengths: this.extractStrengths(evaluations),
    };
  }

  /**
   * 预测通过概率
   */
  private predictPass(score: number): PassPrediction {
    if (score >= 90) {
      return { level: 'strong_pass', percentage: 95, reasoning: '表现优异，超过绝大多数候选人' };
    }
    if (score >= 80) {
      return { level: 'pass', percentage: 80, reasoning: '表现良好，具备岗位要求的核心能力' };
    }
    if (score >= 70) {
      return { level: 'pass', percentage: 65, reasoning: '表现合格，满足基本要求' };
    }
    if (score >= 60) {
      return { level: 'borderline', percentage: 50, reasoning: '勉强达到底线，需要看候选人态度' };
    }
    return { level: 'fail', percentage: 25, reasoning: '明显不足，核心能力有短板' };
  }
}
```

---

## 六、项目里程碑（更新版）

| 阶段 | 周期 | 目标 | 关键交付物 |
|------|------|------|------------|
| Phase 0 | 3 天 | 需求确认 & 技术方案定稿 | 本文档 v2.0 |
| Phase 1 | 2.5 周 | 核心框架 & RAG 基础 | LangGraph + 向量数据库 + 简历解析 |
| Phase 2 | 1.5 周 | 动态评分系统 | 评分算法 + 实时分数 + 标准答案对比 |
| Phase 3 | 1.5 周 | 前端交互 | 岗位配置 + 简历上传 + 实时评分 UI |
| Phase 4 | 1 周 | 会话管理 & 报告 | 持久化 + 报告生成 |
| Phase 5 | 1 周 | 测试与优化 | 全链路测试 + 调优 |
| **总计** | **约 8 周** | MVP 完成 | 可上线版本 |

---

## 七、附录

### 7.1 技术选型补充说明

#### 向量数据库对比

| 特性 | Pinecone | Qdrant | Chroma |
|------|----------|--------|--------|
| 部署方式 | 云原生/自托管 | 自托管/云 | 本地/嵌入 |
| 成本 | 按使用量计费 | 开源免费 | 开源免费 |
| 适用场景 | 企业级生产 | 需要数据控制 | 快速原型/小规模 |
| 托管服务 | 有 | 有（Qdrant Cloud） | 无 |
| **推荐** | ✅ 适合生产环境 | ✅ 适合自部署 | 适合开发测试 |

#### 嵌入模型对比

| 模型 | 维度 | 成本 | 质量 | 适用场景 |
|------|------|------|------|----------|
| text-embedding-3-small | 1536 | 低 | 良好 | 通用场景 |
| text-embedding-3-large | 3072 | 中 | 优秀 | 高精度需求 |
| Cohere embed-multilingual | 1024 | 中 | 良好 | 多语言支持 |

### 7.2 RAG 冷启动策略

1. **题库来源**：
   - 公开数据集（LeetCode、HackerRank 面试题）
   - 行业面试经验分享（Glassdoor、脉脉）
   - 内部 HR 积累的题库

2. **简历解析**：
   - 支持 PDF、DOCX 格式
   - 使用 LLM 进行结构化提取
   - 用户可手动修正解析结果

3. **面经积累**：
   - 引导用户贡献面经（激励机制）
   - 定期爬取公开面经网站
   - 人工审核入库

### 7.3 待决策事项

- [ ] 向量数据库选型（Pinecone vs Qdrant）
- [ ] 嵌入模型选择（text-embedding-3-small vs 3-large）
- [ ] LLM 提供商（OpenAI vs Claude）
- [ ] 评分体系权重默认值（各岗位可能有不同偏好）
- [ ] 初始分设定（60 分是否合理）
- [ ] 会话数据保留策略（隐私合规）
- [ ] 题库版权问题（是否需要授权）

### 7.4 术语表（更新）

| 术语 | 说明 |
|------|------|
| RAG | Retrieval-Augmented Generation，检索增强生成 |
| Vector Store | 向量数据库，用于存储和检索语义向量 |
| Embedding | 将文本转换为语义向量的技术 |
| Dynamic Scoring | 动态评分，根据每轮表现实时调整分数 |
| Position Card | 岗位卡片，包含岗位要求和考察重点 |
| Standard Answer | 标准答案，作为评分参考基准 |
| Score Delta | 分数变化值，每轮回答后的增减分 |

---

*文档由 AI 辅助生成并更新至 v2.0，建议根据实际开发进展持续更新。*
