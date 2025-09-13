ALTER TABLE client_invites ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE client_invites ADD COLUMN IF NOT EXISTS delivery TEXT CHECK (delivery in ('email','sms','both'));

