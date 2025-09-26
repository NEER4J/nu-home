-- Create AdminAddons table (similar to Products table for admin-managed addons)
create table public."AdminAddons" (
  admin_addon_id uuid not null default extensions.uuid_generate_v4 (),
  service_category_id uuid not null,
  title character varying(255) not null,
  slug character varying(255) not null,
  description text not null,
  price numeric(10, 2) not null,
  image_link text null,
  addon_type_id text not null,
  allow_multiple boolean not null default false,
  max_count integer null,
  specifications jsonb not null default '{}'::jsonb,
  is_featured boolean not null default false,
  is_active boolean not null default true,
  created_at timestamp with time zone null default CURRENT_TIMESTAMP,
  updated_at timestamp with time zone null default CURRENT_TIMESTAMP,
  field_values jsonb not null default '{}'::jsonb,
  addon_fields jsonb not null default '{}'::jsonb,
  created_by_admin_id uuid null,
  custom_fields jsonb null default '{}'::jsonb,
  constraint admin_addons_pkey primary key (admin_addon_id),
  constraint admin_addons_slug_key unique (slug),
  constraint admin_addons_service_category_id_fkey foreign KEY (service_category_id) references "ServiceCategories" (service_category_id) on delete CASCADE,
  constraint admin_addons_created_by_admin_id_fkey foreign KEY (created_by_admin_id) references auth.users (id) on delete set null
) TABLESPACE pg_default;

-- Create indexes for AdminAddons
create index IF not exists idx_admin_addons_service_category on public."AdminAddons" using btree (service_category_id) TABLESPACE pg_default;
create index IF not exists idx_admin_addons_is_active on public."AdminAddons" using btree (is_active) TABLESPACE pg_default;
create index IF not exists idx_admin_addons_is_featured on public."AdminAddons" using btree (is_featured) TABLESPACE pg_default;
create index IF not exists idx_admin_addons_created_by_admin_id on public."AdminAddons" using btree (created_by_admin_id) TABLESPACE pg_default;
create index IF not exists idx_admin_addons_addon_type_id on public."AdminAddons" using btree (addon_type_id) TABLESPACE pg_default;

-- Create trigger for AdminAddons timestamp updates
create trigger update_admin_addons_timestamp BEFORE
update on "AdminAddons" for EACH row
execute FUNCTION update_timestamp ();

-- Modify existing Addons table to add base_admin_addon_id reference
ALTER TABLE public."Addons" 
ADD COLUMN base_admin_addon_id uuid null,
ADD CONSTRAINT addons_base_admin_addon_id_fkey 
    FOREIGN KEY (base_admin_addon_id) 
    REFERENCES "AdminAddons" (admin_addon_id) 
    ON DELETE SET NULL;

-- Create index for the new foreign key
create index IF not exists idx_addons_base_admin_addon_id on public."Addons" using btree (base_admin_addon_id) TABLESPACE pg_default;

-- Update table comment for clarity
COMMENT ON TABLE public."AdminAddons" IS 'Admin-managed addons that can be imported by partners';
COMMENT ON TABLE public."Addons" IS 'Partner-specific addons, can be based on AdminAddons or custom created';
COMMENT ON COLUMN public."Addons".base_admin_addon_id IS 'References AdminAddons if this addon was imported from admin catalog';
