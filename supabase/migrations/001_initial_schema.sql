-- ======================================================================
-- eximIA Maps — Initial Schema
-- ======================================================================

-- Mind Maps table
create table if not exists mind_maps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'Mapa sem titulo',
  slug text not null,
  description text,
  data jsonb not null default '{"nodes":[],"edges":[]}'::jsonb,
  node_count integer not null default 0,
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  settings jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexes
create index if not exists idx_mind_maps_user_id on mind_maps(user_id);
create index if not exists idx_mind_maps_slug on mind_maps(slug);
create index if not exists idx_mind_maps_status on mind_maps(status);
create index if not exists idx_mind_maps_updated_at on mind_maps(updated_at desc);

-- RLS
alter table mind_maps enable row level security;

-- Users can only see their own maps
create policy "Users can view own maps"
  on mind_maps for select
  using (auth.uid() = user_id);

create policy "Users can create maps"
  on mind_maps for insert
  with check (auth.uid() = user_id);

create policy "Users can update own maps"
  on mind_maps for update
  using (auth.uid() = user_id);

create policy "Users can delete own maps"
  on mind_maps for delete
  using (auth.uid() = user_id);

-- Templates table (shared/public templates)
create table if not exists map_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  category text not null default 'general',
  data jsonb not null default '{"nodes":[],"edges":[]}'::jsonb,
  node_count integer not null default 0,
  is_public boolean not null default true,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create index if not exists idx_map_templates_category on map_templates(category);
create index if not exists idx_map_templates_public on map_templates(is_public) where is_public = true;

alter table map_templates enable row level security;

create policy "Anyone can view public templates"
  on map_templates for select
  using (is_public = true);

create policy "Users can create templates"
  on map_templates for insert
  with check (auth.uid() = created_by);

-- Analytics table
create table if not exists map_analytics (
  id uuid primary key default gen_random_uuid(),
  map_id uuid not null references mind_maps(id) on delete cascade,
  event_type text not null, -- 'view', 'export', 'generate', 'share'
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_map_analytics_map_id on map_analytics(map_id);
create index if not exists idx_map_analytics_event on map_analytics(event_type);

alter table map_analytics enable row level security;

create policy "Users can view own map analytics"
  on map_analytics for select
  using (
    exists (
      select 1 from mind_maps
      where mind_maps.id = map_analytics.map_id
      and mind_maps.user_id = auth.uid()
    )
  );

create policy "Users can insert own map analytics"
  on map_analytics for insert
  with check (
    exists (
      select 1 from mind_maps
      where mind_maps.id = map_analytics.map_id
      and mind_maps.user_id = auth.uid()
    )
  );

-- Updated_at trigger
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger set_updated_at
  before update on mind_maps
  for each row
  execute function update_updated_at_column();
