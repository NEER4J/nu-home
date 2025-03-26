-- Drop existing function first
DROP FUNCTION IF EXISTS public.get_pending_category_requests();

-- Create a function to get pending category requests with joined data
CREATE OR REPLACE FUNCTION public.get_pending_category_requests()
RETURNS TABLE (
  access_id uuid,
  user_id uuid,
  service_category_id uuid,
  status character varying(50),
  is_primary boolean,
  requested_at timestamptz,
  approved_at timestamptz,
  rejected_at timestamptz,
  admin_notes character varying(50),
  created_at timestamptz,
  updated_at timestamptz,
  company_name varchar,
  contact_person varchar,
  phone varchar,
  category_name varchar,
  icon_url varchar
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    uca.access_id,
    uca.user_id,
    uca.service_category_id,
    uca.status,
    uca.is_primary,
    uca.requested_at,
    uca.approved_at,
    uca.rejected_at,
    uca.admin_notes::character varying(50),
    uca.created_at,
    uca.updated_at,
    up.company_name,
    up.contact_person,
    up.phone,
    sc.name as category_name,
    sc.icon_url::varchar
  FROM "UserCategoryAccess" uca
  INNER JOIN "UserProfiles" up ON uca.user_id = up.user_id
  INNER JOIN "ServiceCategories" sc ON uca.service_category_id = sc.service_category_id
  WHERE uca.status = 'pending'
  ORDER BY uca.requested_at DESC;
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER; 