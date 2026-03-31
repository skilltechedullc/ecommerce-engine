-- Rename whatsapp_sessions to chat_sessions and add channel support
-- This allows the same sessions table to handle multiple channels (whatsapp, instagram, etc.)

BEGIN;

-- Step 1: Rename table
ALTER TABLE IF EXISTS whatsapp_sessions RENAME TO chat_sessions;

-- Step 2: Add channel column with default for existing rows
ALTER TABLE chat_sessions
ADD COLUMN IF NOT EXISTS channel text NOT NULL DEFAULT 'whatsapp';

-- Step 3: Add check constraint for valid channels
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage
    WHERE table_name = 'chat_sessions' AND constraint_name = 'chat_sessions_channel_check'
  ) THEN
    ALTER TABLE chat_sessions
    ADD CONSTRAINT chat_sessions_channel_check
    CHECK (channel IN ('whatsapp', 'instagram'));
  END IF;
END $$;

-- Step 4: Drop old unique constraint on phone alone
ALTER TABLE chat_sessions
DROP CONSTRAINT IF EXISTS whatsapp_sessions_phone_key;

-- Step 5: Add new unique constraint: channel + phone combination
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage
    WHERE table_name = 'chat_sessions' AND constraint_name = 'chat_sessions_channel_phone_unique'
  ) THEN
    ALTER TABLE chat_sessions
    ADD CONSTRAINT chat_sessions_channel_phone_unique
    UNIQUE (channel, phone);
  END IF;
END $$;

-- Step 6: Add indexes for performance
CREATE INDEX IF NOT EXISTS chat_sessions_channel_idx ON chat_sessions(channel);
CREATE INDEX IF NOT EXISTS chat_sessions_phone_idx ON chat_sessions(phone);
CREATE INDEX IF NOT EXISTS chat_sessions_channel_phone_idx ON chat_sessions(channel, phone);

-- Step 7: Update RLS policy name if it exists
DO $$
DECLARE
  policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE tablename = 'chat_sessions' AND policyname = 'whatsapp_sessions_self_select_rls';
  
  IF policy_count > 0 THEN
    ALTER POLICY whatsapp_sessions_self_select_rls ON chat_sessions RENAME TO chat_sessions_self_select_rls;
  END IF;
END $$;

-- Step 8: Verification query
SELECT 
  EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'chat_sessions') as table_exists,
  EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'chat_sessions' AND column_name = 'channel') as channel_column_exists;

COMMIT;
