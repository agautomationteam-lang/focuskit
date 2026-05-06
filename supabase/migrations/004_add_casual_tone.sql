-- Allow 'casual' as a valid business tone (was missing from original constraint)
alter table public.businesses
  drop constraint if exists businesses_tone_check;

alter table public.businesses
  add constraint businesses_tone_check
  check (tone in ('professional', 'friendly', 'luxury', 'casual'));
