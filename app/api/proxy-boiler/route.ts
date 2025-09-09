import { NextResponse } from 'next/server';

export async function GET() {
  const url = 'https://origin-gph.com/wp-json/wp/v2/boiler?_fields=slug,status,type,link,title,acf,taxonomy_info,featured_image_src_large,featured_media&per_page=10';
  const res = await fetch(url, {
    headers: {
      'Accept': 'application/json',
    },
    // Optionally, you can add more headers here if needed
  });
  const data = await res.json();
  return NextResponse.json(data);
}
