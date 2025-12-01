-- Create users table if it doesn't exist
create table if not exists public.users (id uuid references auth.users not null primary key,
  username text,
  email text,
  avatar_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now());

-- Enable RLS for users
alter table public.users enable row level security;

-- Create pins table if it doesn't exist
create table if not exists public.pins (id uuid default gen_random_uuid() primary key,
  user_id uuid references public.users(id) not null,
  title text not null,
  description text,
  image_url text,
  radius float8 default 0,
  latitude float8 not null,
  longitude float8 not null,
  created_at timestamptz default now());

-- Enable RLS for pins
alter table public.pins enable row level security;

-- Policies for users (DROP FIRST to avoid conflicts)
drop policy if exists "Public profiles are viewable by everyone." on users;
create policy "Public profiles are viewable by everyone."
on users for select using (true);

drop policy if exists "Users can insert their own profile." on users;
create policy "Users can insert their own profile."
on users for insert with check (auth.uid()=id);

drop policy if exists "Users can update own profile." on users;
create policy "Users can update own profile."
on users for update using (auth.uid()=id);

-- Policies for pins (DROP FIRST to avoid conflicts)
drop policy if exists "Pins are viewable by everyone." on pins;
create policy "Pins are viewable by everyone."
on pins for select using (true);

drop policy if exists "Authenticated users can insert pins." on pins;
create policy "Authenticated users can insert pins."
on pins for insert with check (auth.uid()=user_id);

drop policy if exists "Users can delete their own pins." on pins;
create policy "Users can delete their own pins."
on pins for delete using (auth.uid()=user_id);

-- Realtime begin;
  drop publication if exists supabase_realtime;
  create publication supabase_realtime;
commit;
alter publication supabase_realtime add table pins;

-- AUTOMATIC USER SYNC TRIGGER
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email, username)
  values (new.id, new.email, new.raw_user_meta_data->>'username');
  return new;
end;
$$ language plpgsql security definer;

-- Trigger the function every time a user is created
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute procedure public.handle_new_user();

-- BACKFILL EXISTING USERS
-- If you already signed up, this will fix the missing row and populate username
insert into public.users (id, email, username)
select 
  id, 
  email,
  COALESCE(raw_user_meta_data->>'username', split_part(email, '@', 1)) as username
from auth.users
on conflict (id) do update 
set
  username = COALESCE(EXCLUDED.username, public.users.username, split_part(EXCLUDED.email, '@', 1)),
    email = EXCLUDED.email;

-- Add image_url column to pins table if it doesn't exist (for existing tables)
do $$ begin if not exists (select 1 from information_schema.columns where table_schema='public'
  and table_name='pins'
  and column_name='image_url'
) then alter table public.pins add column image_url text;
end if;
end $$;

-- Create places table if it doesn't exist
create table if not exists public.places (id uuid default gen_random_uuid() primary key,
  user_id uuid references public.users(id) not null,
  name text not null,
  image_url text not null,
  color text default '#3B82F6',
  created_at timestamptz default now(),
  updated_at timestamptz default now());

-- Enable RLS for places
alter table public.places enable row level security;

-- Policies for places
drop policy if exists "Users can view their own places." on places;
drop policy if exists "Everyone can view all places." on places;
create policy "Everyone can view all places."
on places for select using (true);

drop policy if exists "Users can insert their own places." on places;
create policy "Users can insert their own places."
on places for insert with check (auth.uid()=user_id);

drop policy if exists "Users can update their own places." on places;
create policy "Users can update their own places."
on places for update using (auth.uid()=user_id);

drop policy if exists "Users can delete their own places." on places;
create policy "Users can delete their own places."
on places for delete using (auth.uid()=user_id);

-- Add place_id column to pins table if it doesn't exist
do $$ begin if not exists (select 1 from information_schema.columns where table_schema='public'
  and table_name='pins'
  and column_name='place_id'
) then alter table public.pins add column place_id uuid references public.places(id) on delete set null;
end if;
end $$;

-- Add radius column to pins table if it doesn't exist
do $$ begin if not exists (select 1 from information_schema.columns where table_schema='public'
  and table_name='pins'
  and column_name='radius'
) then alter table public.pins add column radius float8 default 0;
end if;
end $$;

-- Add color column to places table if it doesn't exist
do $$ begin if not exists (select 1 from information_schema.columns where table_schema='public'
  and table_name='places'
  and column_name='color'
) then alter table public.places add column color text default '#3B82F6';
end if;
end $$;

-- Add camera_image_url column to pins table if it doesn't exist
do $$ begin if not exists (select 1 from information_schema.columns where table_schema='public'
  and table_name='pins'
  and column_name='camera_image_url'
) then alter table public.pins add column camera_image_url text;
end if;
end $$;

-- Create chat_messages table
create table if not exists public.chat_messages (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.users(id) not null,
  message text not null,
  message_type text default 'text',
  place_id uuid references public.places(id) on delete set null,
  pin_id uuid references public.pins(id) on delete set null,
  created_at timestamptz default now()
);

-- Enable RLS for chat_messages
alter table public.chat_messages enable row level security;

-- Policies for chat_messages
drop policy if exists "Everyone can view chat messages." on chat_messages;
create policy "Everyone can view chat messages."
on chat_messages for select using (true);

drop policy if exists "Authenticated users can insert chat messages." on chat_messages;
create policy "Authenticated users can insert chat messages."
on chat_messages for insert with check (auth.uid()=user_id);

-- Create radius_votes table
create table if not exists public.radius_votes (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.users(id) not null,
  message_id uuid references public.chat_messages(id) on delete cascade not null,
  radius_range text not null,
  created_at timestamptz default now(),
  unique(user_id, message_id)
);

-- Enable RLS for radius_votes
alter table public.radius_votes enable row level security;

-- Policies for radius_votes
drop policy if exists "Everyone can view radius votes." on radius_votes;
create policy "Everyone can view radius votes."
on radius_votes for select using (true);

drop policy if exists "Authenticated users can insert radius votes." on radius_votes;
create policy "Authenticated users can insert radius votes."
on radius_votes for insert with check (auth.uid()=user_id);

drop policy if exists "Users can update their own votes." on radius_votes;
create policy "Users can update their own votes."
on radius_votes for update using (auth.uid()=user_id);

drop policy if exists "Users can delete their own votes." on radius_votes;
create policy "Users can delete their own votes."
on radius_votes for delete using (auth.uid()=user_id);

-- Add pin_id column to chat_messages table if it doesn't exist
do $$ begin if not exists (select 1 from information_schema.columns where table_schema='public'
  and table_name='chat_messages'
  and column_name='pin_id'
) then alter table public.chat_messages add column pin_id uuid references public.pins(id) on delete set null;
end if;
end $$;

-- Add chat_messages and radius_votes to realtime
alter publication supabase_realtime add table chat_messages;
alter publication supabase_realtime add table radius_votes;

-- STORAGE BUCKET SETUP INSTRUCTIONS: -- 1. Go to Supabase Dashboard>Storage -- 2. Create a new bucket named "pin-images"
-- 3. Make it PUBLIC (or set up policies for authenticated users) -- 4. Set up storage policies: -- - Allow authenticated users to upload: -- INSERT policy: (bucket_id='pin-images'::text) AND (auth.role()='authenticated'::text) -- - Allow everyone to view: -- SELECT policy: (bucket_id='pin-images'::text) -- - Allow users to delete their own files: -- DELETE policy: (bucket_id='pin-images'::text) AND (auth.uid()::text=(storage.foldername(name))[1])