-- Add MJML/HTML support for email templates
ALTER TABLE email_templates
  ADD COLUMN IF NOT EXISTS body_html text,
  ADD COLUMN IF NOT EXISTS body_mjml text;

