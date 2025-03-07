import { createClient } from '@/utils/supabase/server';

export default async function ServiceCategories() {
  const supabase = await createClient();
  const { data: ServiceCategories } = await supabase.from("ServiceCategories").select();

  return <pre>{JSON.stringify(ServiceCategories, null, 2)}</pre>
}