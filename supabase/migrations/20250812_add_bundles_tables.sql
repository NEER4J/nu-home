-- Bundles feature: bundles and bundle-addons linking table

create table if not exists public."Bundles" (
  bundle_id uuid primary key default gen_random_uuid(),
  partner_id uuid not null,
  title text not null,
  description text null,
  discount_type text not null check (discount_type in ('fixed','percent')),
  discount_value numeric(10,2) not null check (discount_value >= 0),
  service_category_id uuid null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint bundles_partner_id_fkey foreign key (partner_id) references auth.users (id) on delete cascade,
  constraint bundles_service_category_fkey foreign key (service_category_id) references "ServiceCategories" (service_category_id) on delete set null
);

create index if not exists idx_bundles_partner_id on public."Bundles" using btree (partner_id);
create index if not exists idx_bundles_service_category_id on public."Bundles" using btree (service_category_id);

create trigger update_bundles_timestamp before update on public."Bundles"
for each row execute function update_timestamp();

-- Linking table between bundles and addons with quantities
create table if not exists public."BundlesAddons" (
  bundle_addon_id uuid primary key default gen_random_uuid(),
  bundle_id uuid not null,
  addon_id uuid not null,
  quantity integer not null default 1 check (quantity > 0),
  created_at timestamptz not null default now(),
  constraint bundlesaddons_bundle_id_fkey foreign key (bundle_id) references public."Bundles" (bundle_id) on delete cascade,
  constraint bundlesaddons_addon_id_fkey foreign key (addon_id) references public."Addons" (addon_id) on delete cascade,
  constraint bundlesaddons_unique unique (bundle_id, addon_id)
);

create index if not exists idx_bundlesaddons_bundle_id on public."BundlesAddons" using btree (bundle_id);
create index if not exists idx_bundlesaddons_addon_id on public."BundlesAddons" using btree (addon_id);


