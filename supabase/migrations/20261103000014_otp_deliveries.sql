-- How each number's last login code was sent. The first code goes by WhatsApp; a resend within
-- 15 minutes goes by SMS (the number may not be on WhatsApp). Server-only: RLS on, no policies,
-- so only the service role (the Send SMS hook) can read or write it.

create table public.otp_deliveries (
  phone text primary key check (phone ~ '^\+[1-9][0-9]{7,14}$'),
  channel text not null check (channel in ('whatsapp', 'sms')),
  sent_at timestamptz not null default now()
);

alter table public.otp_deliveries enable row level security;
