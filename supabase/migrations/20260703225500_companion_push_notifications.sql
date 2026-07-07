-- Companion mobile push notifications, chat notifications, and due reminders.
-- Uses Expo Push directly from Postgres via pg_net so companion_* writes can stay client-direct.

CREATE TABLE IF NOT EXISTS companion_push_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  expo_push_token TEXT NOT NULL,
  device_id TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('ios', 'android')),
  enabled BOOLEAN NOT NULL DEFAULT true,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT companion_push_devices_user_device_unique UNIQUE (user_id, device_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS companion_push_devices_token_uidx
  ON companion_push_devices(expo_push_token);

CREATE INDEX IF NOT EXISTS companion_push_devices_user_enabled_idx
  ON companion_push_devices(user_id)
  WHERE enabled = true;

ALTER TABLE companion_push_devices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS companion_push_devices_select_own ON companion_push_devices;
CREATE POLICY companion_push_devices_select_own
  ON companion_push_devices
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS companion_push_devices_insert_own ON companion_push_devices;
CREATE POLICY companion_push_devices_insert_own
  ON companion_push_devices
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS companion_push_devices_update_own ON companion_push_devices;
CREATE POLICY companion_push_devices_update_own
  ON companion_push_devices
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS companion_push_devices_delete_own ON companion_push_devices;
CREATE POLICY companion_push_devices_delete_own
  ON companion_push_devices
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

COMMENT ON TABLE companion_push_devices IS
  'Expo push tokens for Regal Student Companion mobile notifications.';

CREATE TABLE IF NOT EXISTS companion_push_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id UUID NOT NULL REFERENCES companion_notifications(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  expo_push_token TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT companion_push_deliveries_notification_token_unique UNIQUE (notification_id, expo_push_token)
);

CREATE INDEX IF NOT EXISTS companion_push_deliveries_user_idx
  ON companion_push_deliveries(user_id, created_at DESC);

ALTER TABLE companion_push_deliveries ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS companion_reminder_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_key TEXT NOT NULL UNIQUE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL CHECK (source_type IN ('task', 'event')),
  source_id UUID NOT NULL,
  reminder_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS companion_reminder_deliveries_user_idx
  ON companion_reminder_deliveries(user_id, created_at DESC);

ALTER TABLE companion_reminder_deliveries ENABLE ROW LEVEL SECURITY;

-- Shared project already has pg_net and pg_cron enabled.

CREATE OR REPLACE FUNCTION companion_notification_channel(p_type TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF p_type IN ('study_circle_call_started', 'study_circle_call_joined') THEN
    RETURN 'companion-calls';
  ELSIF p_type IN ('task_reminder', 'event_reminder') THEN
    RETURN 'companion-reminders';
  ELSIF p_type IN ('study_circle_message', 'study_circle_thread_reply') THEN
    RETURN 'companion-messages';
  END IF;

  RETURN 'companion-general';
END;
$$;

CREATE OR REPLACE FUNCTION companion_send_push_notification(p_notification_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  notif companion_notifications%ROWTYPE;
  device RECORD;
  payload JSONB;
  sent_count INTEGER := 0;
BEGIN
  SELECT * INTO notif
  FROM companion_notifications
  WHERE id = p_notification_id;

  IF notif.id IS NULL THEN
    RETURN 0;
  END IF;

  FOR device IN
    INSERT INTO companion_push_deliveries (notification_id, user_id, expo_push_token)
    SELECT
      notif.id,
      notif.user_id,
      d.expo_push_token
    FROM companion_push_devices d
    WHERE d.user_id = notif.user_id
      AND d.enabled = true
      AND d.expo_push_token LIKE 'ExponentPushToken[%'
    ON CONFLICT (notification_id, expo_push_token) DO NOTHING
    RETURNING expo_push_token
  LOOP
    payload := jsonb_build_object(
      'to', device.expo_push_token,
      'sound', 'default',
      'title', notif.title,
      'body', notif.body,
      'priority', 'high',
      'channelId', companion_notification_channel(notif.type),
      'data',
        jsonb_strip_nulls(
          jsonb_build_object(
            'kind', notif.type,
            'notificationId', notif.id,
            'href', notif.href
          ) || COALESCE(notif.metadata, '{}'::jsonb)
        )
    );

    BEGIN
      PERFORM net.http_post(
        url := 'https://exp.host/--/api/v2/push/send',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Accept', 'application/json'
        ),
        body := payload
      );
      sent_count := sent_count + 1;
    EXCEPTION WHEN OTHERS THEN
      -- Do not block app writes when Expo delivery fails.
      NULL;
    END;
  END LOOP;

  RETURN sent_count;
END;
$$;

REVOKE ALL ON FUNCTION companion_send_push_notification(UUID) FROM PUBLIC;

CREATE OR REPLACE FUNCTION companion_push_notification_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM companion_send_push_notification(NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS companion_on_notification_push ON companion_notifications;
CREATE TRIGGER companion_on_notification_push
  AFTER INSERT ON companion_notifications
  FOR EACH ROW
  EXECUTE FUNCTION companion_push_notification_trigger();

CREATE OR REPLACE FUNCTION companion_enqueue_circle_message_notifications()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sender_name TEXT;
  circle_name TEXT;
  preview TEXT;
BEGIN
  IF COALESCE(NEW.is_ai, false) THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(display_name, email, 'Student')
    INTO sender_name
  FROM companion_profiles
  WHERE id = NEW.user_id
  LIMIT 1;

  SELECT name
    INTO circle_name
  FROM companion_study_circles
  WHERE id = NEW.circle_id
  LIMIT 1;

  preview := LEFT(TRIM(NEW.content), 160);

  INSERT INTO companion_notifications (user_id, type, title, body, href, metadata)
  SELECT
    m.user_id,
    'study_circle_message',
    COALESCE(sender_name, 'New message') || ' · ' || COALESCE(circle_name, 'Study Circle'),
    CASE
      WHEN preview = '' THEN 'New message in your study circle.'
      ELSE preview
    END,
    '/study-circles?circle=' || NEW.circle_id::text,
    jsonb_build_object(
      'circle_id', NEW.circle_id,
      'message_id', NEW.id,
      'sender_id', NEW.user_id,
      'circle_name', circle_name
    )
  FROM companion_circle_members m
  WHERE m.circle_id = NEW.circle_id
    AND m.user_id <> NEW.user_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS companion_on_circle_message_notify ON companion_circle_messages;
CREATE TRIGGER companion_on_circle_message_notify
  AFTER INSERT ON companion_circle_messages
  FOR EACH ROW
  EXECUTE FUNCTION companion_enqueue_circle_message_notifications();

CREATE OR REPLACE FUNCTION companion_enqueue_circle_comment_notifications()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_user_id UUID;
  actor_name TEXT;
  circle_name TEXT;
  preview TEXT;
BEGIN
  SELECT user_id
    INTO target_user_id
  FROM companion_circle_messages
  WHERE id = NEW.parent_message_id
  LIMIT 1;

  IF target_user_id IS NULL OR target_user_id = NEW.user_id THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(display_name, email, 'Student')
    INTO actor_name
  FROM companion_profiles
  WHERE id = NEW.user_id
  LIMIT 1;

  SELECT name
    INTO circle_name
  FROM companion_study_circles
  WHERE id = NEW.circle_id
  LIMIT 1;

  preview := LEFT(TRIM(NEW.content), 160);

  INSERT INTO companion_notifications (user_id, type, title, body, href, metadata)
  VALUES (
    target_user_id,
    'study_circle_thread_reply',
    COALESCE(actor_name, 'New reply') || ' replied in ' || COALESCE(circle_name, 'Study Circle'),
    CASE
      WHEN preview = '' THEN 'Open the thread to view the reply.'
      ELSE preview
    END,
    '/study-circles?circle=' || NEW.circle_id::text,
    jsonb_build_object(
      'circle_id', NEW.circle_id,
      'comment_id', NEW.id,
      'parent_message_id', NEW.parent_message_id,
      'sender_id', NEW.user_id,
      'circle_name', circle_name
    )
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS companion_on_circle_comment_notify ON companion_circle_message_comments;
CREATE TRIGGER companion_on_circle_comment_notify
  AFTER INSERT ON companion_circle_message_comments
  FOR EACH ROW
  EXECUTE FUNCTION companion_enqueue_circle_comment_notifications();

CREATE OR REPLACE FUNCTION companion_send_due_reminders()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  task_row RECORD;
  event_row RECORD;
  reminder_key TEXT;
  reminder_at TIMESTAMPTZ;
BEGIN
  FOR task_row IN
    SELECT id, user_id, title, due_date
    FROM companion_tasks
    WHERE due_date IS NOT NULL
      AND status IN ('todo', 'in_progress')
      AND due_date <= now()
      AND due_date > now() - interval '5 minutes'
  LOOP
    reminder_key := 'task:' || task_row.id::text || ':' ||
      to_char(date_trunc('minute', task_row.due_date), 'YYYYMMDDHH24MI');

    INSERT INTO companion_reminder_deliveries (
      notification_key,
      user_id,
      source_type,
      source_id,
      reminder_at
    )
    VALUES (
      reminder_key,
      task_row.user_id,
      'task',
      task_row.id,
      task_row.due_date
    )
    ON CONFLICT (notification_key) DO NOTHING;

    IF FOUND THEN
      INSERT INTO companion_notifications (user_id, type, title, body, href, metadata)
      VALUES (
        task_row.user_id,
        'task_reminder',
        'Task due now',
        task_row.title,
        '/tasks',
        jsonb_build_object('task_id', task_row.id)
      );
    END IF;
  END LOOP;

  FOR event_row IN
    SELECT id, user_id, title, start_at, all_day
    FROM companion_calendar_events
    WHERE start_at IS NOT NULL
      AND start_at > now() - interval '12 hours'
  LOOP
    reminder_at := CASE
      WHEN COALESCE(event_row.all_day, false)
        THEN date_trunc('day', event_row.start_at) + interval '9 hours'
      ELSE event_row.start_at - interval '15 minutes'
    END;

    IF reminder_at <= now() AND reminder_at > now() - interval '5 minutes' THEN
      reminder_key := 'event:' || event_row.id::text || ':' ||
        to_char(date_trunc('minute', reminder_at), 'YYYYMMDDHH24MI');

      INSERT INTO companion_reminder_deliveries (
        notification_key,
        user_id,
        source_type,
        source_id,
        reminder_at
      )
      VALUES (
        reminder_key,
        event_row.user_id,
        'event',
        event_row.id,
        reminder_at
      )
      ON CONFLICT (notification_key) DO NOTHING;

      IF FOUND THEN
        INSERT INTO companion_notifications (user_id, type, title, body, href, metadata)
        VALUES (
          event_row.user_id,
          'event_reminder',
          'Event starting soon',
          event_row.title,
          '/calendar',
          jsonb_build_object('event_id', event_row.id)
        );
      END IF;
    END IF;
  END LOOP;
END;
$$;

DO $$
DECLARE
  existing_job_id BIGINT;
BEGIN
  SELECT jobid
    INTO existing_job_id
  FROM cron.job
  WHERE jobname = 'companion_due_reminders_every_5m'
  LIMIT 1;

  IF existing_job_id IS NOT NULL THEN
    PERFORM cron.unschedule(existing_job_id);
  END IF;

  PERFORM cron.schedule(
    'companion_due_reminders_every_5m',
    '*/5 * * * *',
    'SELECT public.companion_send_due_reminders();'
  );
EXCEPTION WHEN OTHERS THEN
  -- Do not fail the migration if cron scheduling is unavailable.
  NULL;
END $$;
