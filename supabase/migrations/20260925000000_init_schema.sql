CREATE TABLE user_config (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id),
  config_json JSONB,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE weekly_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  week_start TEXT NOT NULL,
  data_json JSONB,
  UNIQUE(user_id, week_start)
);

-- Row Level Security (RLS)
ALTER TABLE user_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own config" ON user_config FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

ALTER TABLE weekly_schedules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own schedules" ON weekly_schedules FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
