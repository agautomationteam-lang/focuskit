alter table public.businesses
  add column tone text check (tone in ('friendly', 'luxury', 'professional')) default 'professional';
