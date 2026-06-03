-- 求职陪跑 Agent MVP (journey)
-- 注意：表名与字段均为 snake_case，jsonb 产出物放到 artifacts 表

-- 1) journey 会话
create table if not exists ai_journeys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  title text not null default '求职陪跑',
  current_stage text not null default 'onboarding',
  stages jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_ai_journeys_user_id on ai_journeys(user_id);

-- 2) journey 消息（可复用 ai_messages，但单独建表更清晰）
create table if not exists ai_journey_messages (
  id uuid primary key default gen_random_uuid(),
  journey_id uuid not null references ai_journeys(id) on delete cascade,
  user_id uuid not null,
  role text not null check (role in ('user','assistant','system')),
  agent_type text,
  stage text,
  content text not null,
  attachments jsonb not null default '[]'::jsonb,
  extra_data jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_ai_journey_messages_journey_id on ai_journey_messages(journey_id);
create index if not exists idx_ai_journey_messages_user_id on ai_journey_messages(user_id);

-- 3) 产出物（诊断/计划/简历）
create table if not exists ai_journey_artifacts (
  id uuid primary key default gen_random_uuid(),
  journey_id uuid not null references ai_journeys(id) on delete cascade,
  user_id uuid not null,
  stage text not null,
  artifact_type text not null,
  data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_ai_journey_artifacts_journey_id on ai_journey_artifacts(journey_id);
create index if not exists idx_ai_journey_artifacts_user_id on ai_journey_artifacts(user_id);
create index if not exists idx_ai_journey_artifacts_stage on ai_journey_artifacts(stage);

