-- Seed default email templates (idempotent)
-- Keys: invite, password_reset

-- Email Templates table was created in 024_message_templates.sql

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM email_templates WHERE key='invite' AND client_id IS NULL
  ) THEN
    INSERT INTO email_templates(id, key, client_id, subject, body)
    VALUES (
      gen_random_uuid(), 'invite', NULL,
      'You''re invited to join {{clientName}}{{orgNameSuffix}}',
      'You''ve been invited to join {{clientName}}{{orgNameSuffix}}.\nUse the link below to accept the invite and set your password:\n\n{{url}}\n\nIf you did not expect this invite, you can ignore this email.'
    );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM email_templates WHERE key='password_reset' AND client_id IS NULL
  ) THEN
    INSERT INTO email_templates(id, key, client_id, subject, body)
    VALUES (
      gen_random_uuid(), 'password_reset', NULL,
      'Reset your password{{orgNameSuffix}}',
      'We received a request to reset your password{{orgNameSuffix}}.\nUse the link below to set a new password. This link expires in 60 minutes.\n\n{{url}}\n\nIf you did not request a password reset, you can safely ignore this email.'
    );
  END IF;
END $$;

