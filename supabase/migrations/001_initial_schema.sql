-- ReplyKit initial schema
-- Run this in your Supabase SQL editor

create extension if not exists "uuid-ossp";

-- ============================================================
-- TABLES
-- ============================================================

create table public.users (
  id uuid references auth.users(id) on delete cascade primary key,
  email text not null,
  subscription_status text not null default 'trial'
    check (subscription_status in ('trial', 'active', 'inactive')),
  trial_ends_at timestamptz not null default (now() + interval '7 days'),
  stripe_customer_id text,
  stripe_subscription_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.businesses (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.users(id) on delete cascade not null,
  name text not null,
  google_place_id text,
  google_access_token text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.reviews (
  id uuid primary key default uuid_generate_v4(),
  business_id uuid references public.businesses(id) on delete cascade not null,
  google_review_id text,
  reviewer_name text not null,
  reviewer_photo_url text,
  rating integer not null check (rating between 1 and 5),
  text text,
  review_date timestamptz not null,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'posted')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, google_review_id)
);

create table public.responses (
  id uuid primary key default uuid_generate_v4(),
  review_id uuid references public.reviews(id) on delete cascade not null unique,
  draft_professional text not null,
  draft_friendly text not null,
  selected_draft text check (selected_draft in ('professional', 'friendly', 'custom')),
  final_text text,
  status text not null default 'draft'
    check (status in ('draft', 'approved', 'posted')),
  posted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- INDEXES
-- ============================================================

create index reviews_business_id_idx on public.reviews (business_id);
create index reviews_status_idx on public.reviews (status);
create index responses_review_id_idx on public.responses (review_id);
create index businesses_user_id_idx on public.businesses (user_id);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table public.users enable row level security;
alter table public.businesses enable row level security;
alter table public.reviews enable row level security;
alter table public.responses enable row level security;

create policy "users_own" on public.users
  for all using (auth.uid() = id);

create policy "businesses_own" on public.businesses
  for all using (auth.uid() = user_id);

create policy "reviews_own" on public.reviews
  for all using (
    exists (
      select 1 from public.businesses b
      where b.id = reviews.business_id and b.user_id = auth.uid()
    )
  );

create policy "responses_own" on public.responses
  for all using (
    exists (
      select 1 from public.reviews r
      join public.businesses b on b.id = r.business_id
      where r.id = responses.review_id and b.user_id = auth.uid()
    )
  );

-- ============================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================

-- Auto-create user row on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email)
  values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Auto-update updated_at
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger users_updated_at before update on public.users
  for each row execute function public.set_updated_at();
create trigger businesses_updated_at before update on public.businesses
  for each row execute function public.set_updated_at();
create trigger reviews_updated_at before update on public.reviews
  for each row execute function public.set_updated_at();
create trigger responses_updated_at before update on public.responses
  for each row execute function public.set_updated_at();
