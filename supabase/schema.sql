-- Fellowship Database Schema
-- Run this in your Supabase SQL Editor

-- ============================================
-- CLEANUP (drop existing objects)
-- ============================================

-- Drop triggers first (ignore errors if tables don't exist)
drop trigger if exists on_auth_user_created on auth.users;
do $$ begin
  drop trigger if exists on_profiles_updated on profiles;
exception when undefined_table then null;
end $$;
do $$ begin
  drop trigger if exists on_registrations_updated on registrations;
exception when undefined_table then null;
end $$;

-- Drop functions
drop function if exists public.handle_new_user();
drop function if exists public.handle_updated_at();

-- Drop tables (order matters due to foreign keys)
drop table if exists user_events cascade;
drop table if exists group_members cascade;
drop table if exists groups cascade;
drop table if exists registrations cascade;
drop table if exists events cascade;
drop table if exists profiles cascade;

-- Drop enums
drop type if exists registration_status;
drop type if exists group_role;

-- ============================================
-- ENUMS
-- ============================================

create type registration_status as enum (
  'interested',
  'registered', 
  'confirmed',
  'attended',
  'cancelled'
);

create type group_role as enum (
  'owner',
  'admin',
  'member'
);

-- ============================================
-- TABLES
-- ============================================

-- Profiles (extends auth.users)
create table profiles (
  id uuid references auth.users on delete cascade primary key,
  email text unique,
  full_name text,
  avatar_url text,
  company text,
  bio text,
  onboarding_completed boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Events
create table events (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  description text,
  location text,
  url text,
  start_date timestamptz not null,
  end_date timestamptz,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz default now()
);

-- Registrations (user <-> event)
create table registrations (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  event_id uuid references events(id) on delete cascade not null,
  status registration_status default 'interested',
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, event_id)
);

-- Groups
create table groups (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  description text,
  is_private boolean default false,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz default now()
);

-- Group Members
create table group_members (
  id uuid default gen_random_uuid() primary key,
  group_id uuid references groups(id) on delete cascade not null,
  user_id uuid references profiles(id) on delete cascade not null,
  role group_role default 'member',
  joined_at timestamptz default now(),
  unique(group_id, user_id)
);

-- ============================================
-- INDEXES
-- ============================================

create index idx_registrations_user on registrations(user_id);
create index idx_registrations_event on registrations(event_id);
create index idx_events_start_date on events(start_date);
create index idx_group_members_group on group_members(group_id);
create index idx_group_members_user on group_members(user_id);

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Auto-update updated_at
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger on_profiles_updated
  before update on profiles
  for each row execute procedure public.handle_updated_at();

create trigger on_registrations_updated
  before update on registrations
  for each row execute procedure public.handle_updated_at();

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

alter table profiles enable row level security;
alter table events enable row level security;
alter table registrations enable row level security;
alter table groups enable row level security;
alter table group_members enable row level security;

-- Profiles: users can read all, insert/update own
create policy "Profiles are viewable by everyone"
  on profiles for select
  using (true);

create policy "Users can create own profile"
  on profiles for insert
  with check (auth.uid() = id);

create policy "Users can update own profile"
  on profiles for update
  using (auth.uid() = id);

-- Events: anyone can read, authenticated can create
create policy "Events are viewable by everyone"
  on events for select
  using (true);

create policy "Authenticated users can create events"
  on events for insert
  with check (auth.role() = 'authenticated');

create policy "Event creators can update their events"
  on events for update
  using (auth.uid() = created_by);

create policy "Event creators can delete their events"
  on events for delete
  using (auth.uid() = created_by);

-- Registrations: users can manage their own
create policy "Users can view own registrations"
  on registrations for select
  using (auth.uid() = user_id);

create policy "Users can view registrations in their groups"
  on registrations for select
  using (
    exists (
      select 1 from group_members gm1
      join group_members gm2 on gm1.group_id = gm2.group_id
      where gm1.user_id = auth.uid()
      and gm2.user_id = registrations.user_id
    )
  );

create policy "Users can create own registrations"
  on registrations for insert
  with check (auth.uid() = user_id);

create policy "Users can update own registrations"
  on registrations for update
  using (auth.uid() = user_id);

create policy "Users can delete own registrations"
  on registrations for delete
  using (auth.uid() = user_id);

-- Groups: public groups visible to all, private to members
create policy "Public groups are viewable by everyone"
  on groups for select
  using (is_private = false);

create policy "Private groups viewable by members"
  on groups for select
  using (
    exists (
      select 1 from group_members
      where group_id = groups.id
      and user_id = auth.uid()
    )
  );

create policy "Authenticated users can create groups"
  on groups for insert
  with check (auth.role() = 'authenticated');

create policy "Group owners can update their groups"
  on groups for update
  using (auth.uid() = created_by);

create policy "Group owners can delete their groups"
  on groups for delete
  using (auth.uid() = created_by);

-- Group Members
create policy "Group members are viewable by group members"
  on group_members for select
  using (
    exists (
      select 1 from group_members gm
      where gm.group_id = group_members.group_id
      and gm.user_id = auth.uid()
    )
    or exists (
      select 1 from groups
      where id = group_members.group_id
      and is_private = false
    )
  );

create policy "Users can join public groups"
  on group_members for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from groups
      where id = group_id
      and is_private = false
    )
  );

create policy "Group admins can add members"
  on group_members for insert
  with check (
    exists (
      select 1 from group_members
      where group_id = group_members.group_id
      and user_id = auth.uid()
      and role in ('owner', 'admin')
    )
  );

create policy "Users can leave groups"
  on group_members for delete
  using (auth.uid() = user_id);

create policy "Group owners can remove members"
  on group_members for delete
  using (
    exists (
      select 1 from group_members gm
      where gm.group_id = group_members.group_id
      and gm.user_id = auth.uid()
      and gm.role = 'owner'
    )
  );

-- ============================================
-- STORAGE (Avatars)
-- ============================================

-- Create avatars bucket (run this separately if it fails)
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Storage policies for avatars
create policy "Avatar images are publicly accessible"
  on storage.objects for select
  using (bucket_id = 'avatars');

create policy "Users can upload their own avatar"
  on storage.objects for insert
  with check (
    bucket_id = 'avatars'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can update their own avatar"
  on storage.objects for update
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can delete their own avatar"
  on storage.objects for delete
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
